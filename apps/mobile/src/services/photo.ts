import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { v4 as uuidv4 } from 'uuid';
import { databaseService } from './database';
import { syncService } from './sync';

export interface PhotoData {
  id?: number;
  offlineGuid: string;
  timeEntryId?: number;
  fileName: string;
  filePath: string;
  mimeType: string;
  fileSize: number;
  compressedSize?: number;
  capturedAt: Date;
  latitude?: number;
  longitude?: number;
  isSynced: boolean;
  syncedAt?: Date;
}

export interface CameraResult {
  success: boolean;
  photo?: PhotoData;
  error?: string;
}

class PhotoService {
  private readonly PHOTOS_DIR = `${FileSystem.documentDirectory}photos/`;
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private readonly COMPRESS_QUALITY = 0.7;
  private readonly MAX_DIMENSION = 1920;

  constructor() {
    this.initializePhotosDirectory();
  }

  private async initializePhotosDirectory() {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.PHOTOS_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.PHOTOS_DIR, { intermediates: true });
      }
    } catch (error) {
      console.error('Failed to initialize photos directory:', error);
    }
  }

  async requestPermissions(): Promise<boolean> {
    try {
      // Request camera permissions
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      
      if (cameraPermission.status !== 'granted') {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to request permissions:', error);
      return false;
    }
  }

  async capturePhoto(timeEntryId?: number, location?: { latitude: number; longitude: number }): Promise<CameraResult> {
    try {
      // Check permissions
      const hasPermissions = await this.requestPermissions();
      if (!hasPermissions) {
        return {
          success: false,
          error: 'Camera permissions not granted'
        };
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.9,
        exif: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return {
          success: false,
          error: 'Photo capture cancelled'
        };
      }

      const asset = result.assets[0];
      
      // Process and save the photo
      const photo = await this.processAndSavePhoto(asset, timeEntryId, location);
      
      return {
        success: true,
        photo
      };
    } catch (error) {
      console.error('Photo capture failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async selectFromGallery(timeEntryId?: number): Promise<CameraResult> {
    try {
      // Request media library permissions
      const libraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (libraryPermission.status !== 'granted') {
        return {
          success: false,
          error: 'Gallery permissions not granted'
        };
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.9,
        exif: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return {
          success: false,
          error: 'Gallery selection cancelled'
        };
      }

      const asset = result.assets[0];
      
      // Process and save the photo
      const photo = await this.processAndSavePhoto(asset, timeEntryId);
      
      return {
        success: true,
        photo
      };
    } catch (error) {
      console.error('Gallery selection failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private async processAndSavePhoto(
    asset: ImagePicker.ImagePickerAsset, 
    timeEntryId?: number,
    location?: { latitude: number; longitude: number }
  ): Promise<PhotoData> {
    const offlineGuid = uuidv4();
    const timestamp = new Date();
    const fileName = `photo_${timestamp.getTime()}_${offlineGuid.slice(0, 8)}.jpg`;
    const filePath = `${this.PHOTOS_DIR}${fileName}`;

    // Get original file info
    const originalInfo = await FileSystem.getInfoAsync(asset.uri);
    const originalSize = originalInfo.size || 0;

    let processedUri = asset.uri;
    let compressedSize = originalSize;

    // Compress if file is too large or dimensions are too big
    if (originalSize > this.MAX_FILE_SIZE || (asset.width && asset.width > this.MAX_DIMENSION)) {
      const compressionResult = await this.compressImage(asset.uri, asset.width, asset.height);
      processedUri = compressionResult.uri;
      
      const compressedInfo = await FileSystem.getInfoAsync(processedUri);
      compressedSize = compressedInfo.size || originalSize;
    }

    // Move/copy the processed image to our photos directory
    await FileSystem.copyAsync({
      from: processedUri,
      to: filePath,
    });

    // Clean up temporary compressed file if different from original
    if (processedUri !== asset.uri) {
      try {
        await FileSystem.deleteAsync(processedUri, { idempotent: true });
      } catch (error) {
        console.warn('Failed to cleanup temporary compressed image:', error);
      }
    }

    // Extract location from EXIF if available and not provided
    let latitude = location?.latitude;
    let longitude = location?.longitude;

    if (!latitude && !longitude && asset.exif) {
      const gpsData = asset.exif.GPS;
      if (gpsData && gpsData.Latitude && gpsData.Longitude) {
        latitude = this.convertExifGpsToDecimal(gpsData.Latitude, gpsData.LatitudeRef);
        longitude = this.convertExifGpsToDecimal(gpsData.Longitude, gpsData.LongitudeRef);
      }
    }

    // Create photo record
    const photoData: PhotoData = {
      offlineGuid,
      timeEntryId,
      fileName,
      filePath,
      mimeType: 'image/jpeg',
      fileSize: originalSize,
      compressedSize: compressedSize !== originalSize ? compressedSize : undefined,
      capturedAt: timestamp,
      latitude,
      longitude,
      isSynced: false,
    };

    // Save to database
    const db = await databaseService.getDatabase();
    const result = await db.runAsync(
      `INSERT INTO photos (
        offline_guid, time_entry_id, file_name, file_path, mime_type, 
        file_size, compressed_size, captured_at, latitude, longitude, 
        is_synced, created_at
      ) VALUES (?, ?,?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        photoData.offlineGuid,
        photoData.timeEntryId || null,
        photoData.fileName,
        photoData.filePath,
        photoData.mimeType,
        photoData.fileSize,
        photoData.compressedSize || null,
        photoData.capturedAt.toISOString(),
        photoData.latitude || null,
        photoData.longitude || null,
        0, // isSynced = false
        timestamp.toISOString()
      ]
    );

    photoData.id = result.lastInsertRowId;
    
    // Add to sync queue
    try {
      await syncService.addToQueue('photo', photoData.offlineGuid, photoData);
    } catch (syncError) {
      console.warn('Failed to add photo to sync queue:', syncError);
      // Don't fail the photo save operation if sync queue fails
    }
    
    return photoData;
  }

  private async compressImage(uri: string, width?: number, height?: number) {
    // Calculate new dimensions while maintaining aspect ratio
    let newWidth = width || this.MAX_DIMENSION;
    let newHeight = height || this.MAX_DIMENSION;

    if (width && height && width > this.MAX_DIMENSION) {
      const aspectRatio = height / width;
      newWidth = this.MAX_DIMENSION;
      newHeight = Math.round(this.MAX_DIMENSION * aspectRatio);
    } else if (width && height && height > this.MAX_DIMENSION) {
      const aspectRatio = width / height;
      newHeight = this.MAX_DIMENSION;
      newWidth = Math.round(this.MAX_DIMENSION * aspectRatio);
    }

    return await ImageManipulator.manipulateAsync(
      uri,
      [
        {
          resize: {
            width: newWidth,
            height: newHeight,
          },
        },
      ],
      {
        compress: this.COMPRESS_QUALITY,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );
  }

  private convertExifGpsToDecimal(coordinate: number, reference: string): number {
    let decimal = coordinate;
    
    // Convert to negative if South or West
    if (reference === 'S' || reference === 'W') {
      decimal = -decimal;
    }
    
    return decimal;
  }

  async getPhotosForTimeEntry(timeEntryId: number): Promise<PhotoData[]> {
    try {
      const db = await databaseService.getDatabase();
      const rows = await db.getAllAsync(
        `SELECT * FROM photos WHERE time_entry_id = ? ORDER BY captured_at DESC`,
        [timeEntryId]
      );

      return rows.map(this.mapRowToPhotoData);
    } catch (error) {
      console.error('Failed to get photos for time entry:', error);
      return [];
    }
  }

  async getUnsyncedPhotos(): Promise<PhotoData[]> {
    try {
      const db = await databaseService.getDatabase();
      const rows = await db.getAllAsync(
        `SELECT * FROM photos WHERE is_synced = 0 ORDER BY captured_at ASC`
      );

      return rows.map(this.mapRowToPhotoData);
    } catch (error) {
      console.error('Failed to get unsynced photos:', error);
      return [];
    }
  }

  async markPhotoAsSynced(id: number, syncedAt: Date): Promise<void> {
    try {
      const db = await databaseService.getDatabase();
      await db.runAsync(
        `UPDATE photos SET is_synced = 1, synced_at = ? WHERE id = ?`,
        [syncedAt.toISOString(), id]
      );
    } catch (error) {
      console.error('Failed to mark photo as synced:', error);
      throw error;
    }
  }

  async deletePhoto(id: number): Promise<void> {
    try {
      const db = await databaseService.getDatabase();
      
      // Get photo info before deleting
      const photo = await db.getFirstAsync(
        `SELECT file_path FROM photos WHERE id = ?`,
        [id]
      ) as { file_path: string } | null;

      if (photo) {
        // Delete physical file
        try {
          await FileSystem.deleteAsync(photo.file_path, { idempotent: true });
        } catch (error) {
          console.warn('Failed to delete physical photo file:', error);
        }
      }

      // Delete database record
      await db.runAsync(`DELETE FROM photos WHERE id = ?`, [id]);
    } catch (error) {
      console.error('Failed to delete photo:', error);
      throw error;
    }
  }

  async getPhotoBlob(filePath: string): Promise<string> {
    try {
      const base64 = await FileSystem.readAsStringAsync(filePath, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return base64;
    } catch (error) {
      console.error('Failed to read photo file:', error);
      throw error;
    }
  }

  private mapRowToPhotoData(row: any): PhotoData {
    return {
      id: row.id,
      offlineGuid: row.offline_guid,
      timeEntryId: row.time_entry_id,
      fileName: row.file_name,
      filePath: row.file_path,
      mimeType: row.mime_type,
      fileSize: row.file_size,
      compressedSize: row.compressed_size,
      capturedAt: new Date(row.captured_at),
      latitude: row.latitude,
      longitude: row.longitude,
      isSynced: Boolean(row.is_synced),
      syncedAt: row.synced_at ? new Date(row.synced_at) : undefined,
    };
  }
}

export const photoService = new PhotoService();