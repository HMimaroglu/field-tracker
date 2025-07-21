import * as Location from 'expo-location';
import { databaseService } from './database';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  altitudeAccuracy?: number;
  heading?: number;
  speed?: number;
  timestamp: Date;
  address?: string;
}

export interface LocationPermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
  status: Location.LocationPermissionResponse['status'];
}

class LocationService {
  private watchId: Location.LocationSubscription | null = null;
  private currentLocation: LocationData | null = null;
  private locationHistory: LocationData[] = [];
  private readonly MAX_HISTORY_SIZE = 100;
  private readonly HIGH_ACCURACY_OPTIONS: Location.LocationOptions = {
    accuracy: Location.Accuracy.BestForNavigation,
    timeInterval: 1000,
    distanceInterval: 1,
  };
  private readonly BALANCED_ACCURACY_OPTIONS: Location.LocationOptions = {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 5000,
    distanceInterval: 10,
  };

  async requestPermissions(): Promise<LocationPermissionStatus> {
    try {
      const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
      return {
        granted: status === 'granted',
        canAskAgain,
        status,
      };
    } catch (error) {
      console.error('Failed to request location permissions:', error);
      return {
        granted: false,
        canAskAgain: false,
        status: 'denied',
      };
    }
  }

  async checkPermissions(): Promise<LocationPermissionStatus> {
    try {
      const { status, canAskAgain } = await Location.getForegroundPermissionsAsync();
      return {
        granted: status === 'granted',
        canAskAgain,
        status,
      };
    } catch (error) {
      console.error('Failed to check location permissions:', error);
      return {
        granted: false,
        canAskAgain: false,
        status: 'denied',
      };
    }
  }

  async getCurrentLocation(highAccuracy = false): Promise<LocationData | null> {
    try {
      const permissions = await this.checkPermissions();
      if (!permissions.granted) {
        const requestResult = await this.requestPermissions();
        if (!requestResult.granted) {
          console.warn('Location permissions not granted');
          return null;
        }
      }

      const options = highAccuracy ? this.HIGH_ACCURACY_OPTIONS : this.BALANCED_ACCURACY_OPTIONS;
      const location = await Location.getCurrentPositionAsync(options);

      const locationData: LocationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || undefined,
        altitude: location.coords.altitude || undefined,
        altitudeAccuracy: location.coords.altitudeAccuracy || undefined,
        heading: location.coords.heading || undefined,
        speed: location.coords.speed || undefined,
        timestamp: new Date(location.timestamp),
      };

      this.currentLocation = locationData;
      this.addToHistory(locationData);

      return locationData;
    } catch (error) {
      console.error('Failed to get current location:', error);
      return null;
    }
  }

  async reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
    try {
      const results = await Location.reverseGeocodeAsync({ latitude, longitude });
      
      if (results.length > 0) {
        const result = results[0];
        const addressParts = [];
        
        if (result.streetNumber) addressParts.push(result.streetNumber);
        if (result.street) addressParts.push(result.street);
        if (result.city) addressParts.push(result.city);
        if (result.region) addressParts.push(result.region);
        if (result.postalCode) addressParts.push(result.postalCode);
        
        return addressParts.join(', ') || null;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to reverse geocode location:', error);
      return null;
    }
  }

  async getLocationWithAddress(highAccuracy = false): Promise<LocationData | null> {
    const location = await this.getCurrentLocation(highAccuracy);
    if (!location) return null;

    try {
      const address = await this.reverseGeocode(location.latitude, location.longitude);
      return {
        ...location,
        address: address || undefined,
      };
    } catch (error) {
      console.warn('Failed to get address for location:', error);
      return location;
    }
  }

  startWatching(
    callback: (location: LocationData) => void,
    highAccuracy = false
  ): Promise<boolean> {
    return new Promise(async (resolve) => {
      try {
        const permissions = await this.checkPermissions();
        if (!permissions.granted) {
          const requestResult = await this.requestPermissions();
          if (!requestResult.granted) {
            resolve(false);
            return;
          }
        }

        const options = highAccuracy ? this.HIGH_ACCURACY_OPTIONS : this.BALANCED_ACCURACY_OPTIONS;
        
        this.watchId = await Location.watchPositionAsync(options, (location) => {
          const locationData: LocationData = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy || undefined,
            altitude: location.coords.altitude || undefined,
            altitudeAccuracy: location.coords.altitudeAccuracy || undefined,
            heading: location.coords.heading || undefined,
            speed: location.coords.speed || undefined,
            timestamp: new Date(location.timestamp),
          };

          this.currentLocation = locationData;
          this.addToHistory(locationData);
          callback(locationData);
        });

        resolve(true);
      } catch (error) {
        console.error('Failed to start watching location:', error);
        resolve(false);
      }
    });
  }

  stopWatching(): void {
    if (this.watchId) {
      this.watchId.remove();
      this.watchId = null;
    }
  }

  private addToHistory(location: LocationData): void {
    this.locationHistory.unshift(location);
    if (this.locationHistory.length > this.MAX_HISTORY_SIZE) {
      this.locationHistory = this.locationHistory.slice(0, this.MAX_HISTORY_SIZE);
    }
  }

  getCurrentLocationData(): LocationData | null {
    return this.currentLocation;
  }

  getLocationHistory(): LocationData[] {
    return [...this.locationHistory];
  }

  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in meters
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  formatCoordinates(latitude: number, longitude: number): string {
    return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
  }

  formatAccuracy(accuracy?: number): string {
    if (!accuracy) return 'Unknown';
    if (accuracy < 5) return 'Excellent';
    if (accuracy < 10) return 'Good';
    if (accuracy < 20) return 'Fair';
    return 'Poor';
  }

  getLocationQuality(location: LocationData): 'excellent' | 'good' | 'fair' | 'poor' {
    if (!location.accuracy) return 'poor';
    if (location.accuracy < 5) return 'excellent';
    if (location.accuracy < 10) return 'good';
    if (location.accuracy < 20) return 'fair';
    return 'poor';
  }

  // Save location tracking data to database for debugging/history
  async saveLocationToHistory(
    location: LocationData, 
    eventType: 'job_start' | 'job_end' | 'break_start' | 'break_end' | 'photo_capture',
    entityId?: string
  ): Promise<void> {
    try {
      const db = await databaseService.getDatabase();
      await db.runAsync(`
        INSERT OR IGNORE INTO app_settings (key, value, updated_at)
        VALUES (?, ?, ?)
      `, [
        `location_${Date.now()}_${eventType}`,
        JSON.stringify({
          ...location,
          eventType,
          entityId,
          timestamp: location.timestamp.toISOString(),
        }),
        new Date().toISOString()
      ]);
    } catch (error) {
      console.error('Failed to save location to history:', error);
    }
  }

  // Get location history from database
  async getLocationHistoryFromDb(): Promise<Array<LocationData & { eventType: string; entityId?: string }>> {
    try {
      const db = await databaseService.getDatabase();
      const rows = await db.getAllAsync(`
        SELECT key, value FROM app_settings 
        WHERE key LIKE 'location_%'
        ORDER BY updated_at DESC
        LIMIT 100
      `) as Array<{ key: string; value: string }>;

      return rows.map(row => {
        try {
          const data = JSON.parse(row.value);
          return {
            ...data,
            timestamp: new Date(data.timestamp),
          };
        } catch (error) {
          console.error('Failed to parse location history item:', error);
          return null;
        }
      }).filter(Boolean) as Array<LocationData & { eventType: string; entityId?: string }>;
    } catch (error) {
      console.error('Failed to get location history from database:', error);
      return [];
    }
  }

  // Clear location history from database
  async clearLocationHistory(): Promise<void> {
    try {
      const db = await databaseService.getDatabase();
      await db.runAsync(`DELETE FROM app_settings WHERE key LIKE 'location_%'`);
    } catch (error) {
      console.error('Failed to clear location history:', error);
      throw error;
    }
  }
}

export const locationService = new LocationService();