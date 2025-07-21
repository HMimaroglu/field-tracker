import React, { useState, useEffect } from 'react';
import { 
  View, 
  FlatList, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  Modal,
  Dimensions 
} from 'react-native';
import { Card, Text, IconButton, Chip, Button } from 'react-native-paper';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { photoService, PhotoData } from '../services/photo';

interface PhotoGalleryProps {
  timeEntryId?: number;
  photos?: PhotoData[];
  onRefresh?: () => void;
  style?: any;
  editable?: boolean;
}

interface PhotoItemProps {
  photo: PhotoData;
  onPress: () => void;
  onDelete?: () => void;
  editable?: boolean;
}

const PhotoItem: React.FC<PhotoItemProps> = ({ photo, onPress, onDelete, editable = true }) => {
  const formatFileSize = (bytes: number) => {
    const kb = bytes / 1024;
    if (kb < 1024) {
      return `${kb.toFixed(1)} KB`;
    }
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleString();
  };

  return (
    <Card style={styles.photoCard}>
      <TouchableOpacity onPress={onPress}>
        <View style={styles.photoContainer}>
          <Image
            source={{ uri: photo.filePath }}
            style={styles.thumbnail}
            contentFit="cover"
            transition={200}
          />
          
          {!photo.isSynced && (
            <View style={styles.syncStatusContainer}>
              <Chip 
                mode="outlined" 
                style={styles.syncStatus}
                textStyle={styles.syncStatusText}
              >
                Pending Sync
              </Chip>
            </View>
          )}
          
          {editable && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={onDelete}
            >
              <MaterialIcons name="delete" size={20} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
      
      <Card.Content style={styles.photoInfo}>
        <Text variant="bodySmall" style={styles.photoDate}>
          {formatDate(photo.capturedAt)}
        </Text>
        
        <View style={styles.photoMeta}>
          <Text variant="bodySmall">
            {formatFileSize(photo.fileSize)}
          </Text>
          
          {photo.compressedSize && photo.compressedSize !== photo.fileSize && (
            <Text variant="bodySmall" style={styles.compressedSize}>
              → {formatFileSize(photo.compressedSize)}
            </Text>
          )}
          
          {photo.latitude && photo.longitude && (
            <MaterialIcons 
              name="location-on" 
              size={16} 
              color="#666" 
              style={styles.locationIcon}
            />
          )}
        </View>
      </Card.Content>
    </Card>
  );
};

export const PhotoGallery: React.FC<PhotoGalleryProps> = ({ 
  timeEntryId, 
  photos: propPhotos,
  onRefresh,
  style,
  editable = true 
}) => {
  const [photos, setPhotos] = useState<PhotoData[]>(propPhotos || []);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoData | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (propPhotos) {
      setPhotos(propPhotos);
    } else if (timeEntryId) {
      loadPhotos();
    }
  }, [timeEntryId, propPhotos]);

  const loadPhotos = async () => {
    if (!timeEntryId) return;
    
    try {
      setLoading(true);
      const timeEntryPhotos = await photoService.getPhotosForTimeEntry(timeEntryId);
      setPhotos(timeEntryPhotos);
    } catch (error) {
      console.error('Failed to load photos:', error);
      Alert.alert('Error', 'Failed to load photos');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoPress = (photo: PhotoData) => {
    setSelectedPhoto(photo);
    setModalVisible(true);
  };

  const handleDeletePhoto = (photo: PhotoData) => {
    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete this photo? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => confirmDeletePhoto(photo)
        }
      ]
    );
  };

  const confirmDeletePhoto = async (photo: PhotoData) => {
    try {
      if (photo.id) {
        await photoService.deletePhoto(photo.id);
        setPhotos(prev => prev.filter(p => p.id !== photo.id));
        onRefresh?.();
      }
    } catch (error) {
      console.error('Failed to delete photo:', error);
      Alert.alert('Error', 'Failed to delete photo');
    }
  };

  const renderPhotoItem = ({ item }: { item: PhotoData }) => (
    <PhotoItem
      photo={item}
      onPress={() => handlePhotoPress(item)}
      onDelete={() => handleDeletePhoto(item)}
      editable={editable}
    />
  );

  const renderPhotoModal = () => {
    if (!selectedPhoto) return null;

    const screenDimensions = Dimensions.get('window');

    return (
      <Modal
        visible={modalVisible}
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <MaterialIcons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            
            <Image
              source={{ uri: selectedPhoto.filePath }}
              style={[
                styles.fullImage,
                {
                  maxWidth: screenDimensions.width - 40,
                  maxHeight: screenDimensions.height - 100,
                }
              ]}
              contentFit="contain"
            />
            
            <View style={styles.modalInfo}>
              <Text variant="bodyMedium" style={styles.modalText}>
                {selectedPhoto.capturedAt.toLocaleString()}
              </Text>
              
              {selectedPhoto.latitude && selectedPhoto.longitude && (
                <Text variant="bodySmall" style={styles.modalText}>
                  📍 {selectedPhoto.latitude.toFixed(6)}, {selectedPhoto.longitude.toFixed(6)}
                </Text>
              )}
              
              <Text variant="bodySmall" style={styles.modalText}>
                {(selectedPhoto.fileSize / 1024 / 1024).toFixed(2)} MB
              </Text>
              
              <View style={styles.syncStatusModal}>
                <Chip 
                  mode={selectedPhoto.isSynced ? "elevated" : "outlined"}
                  style={[
                    styles.syncChip,
                    selectedPhoto.isSynced ? styles.syncedChip : styles.pendingChip
                  ]}
                >
                  {selectedPhoto.isSynced ? 'Synced' : 'Pending Sync'}
                </Chip>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  if (photos.length === 0) {
    return (
      <View style={[styles.emptyContainer, style]}>
        <MaterialIcons name="photo-library" size={48} color="#ccc" />
        <Text variant="bodyMedium" style={styles.emptyText}>
          No photos yet
        </Text>
        {editable && (
          <Text variant="bodySmall" style={styles.emptySubtext}>
            Tap "Add Photo" to capture or select images
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <FlatList
        data={photos}
        renderItem={renderPhotoItem}
        keyExtractor={(item) => item.offlineGuid}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.grid}
        refreshing={loading}
        onRefresh={onRefresh || loadPhotos}
      />
      
      {renderPhotoModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  grid: {
    padding: 8,
  },
  row: {
    justifyContent: 'space-around',
    marginVertical: 4,
  },
  photoCard: {
    flex: 1,
    margin: 4,
    maxWidth: '48%',
    elevation: 2,
  },
  photoContainer: {
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: 120,
    backgroundColor: '#f0f0f0',
  },
  syncStatusContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
  },
  syncStatus: {
    backgroundColor: 'rgba(255, 152, 0, 0.9)',
  },
  syncStatusText: {
    fontSize: 10,
    color: '#fff',
  },
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(244, 67, 54, 0.8)',
    borderRadius: 16,
    padding: 4,
  },
  photoInfo: {
    paddingVertical: 8,
  },
  photoDate: {
    color: '#666',
    fontSize: 12,
  },
  photoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  compressedSize: {
    color: '#4CAF50',
    marginLeft: 4,
  },
  locationIcon: {
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyText: {
    marginTop: 16,
    color: '#666',
  },
  emptySubtext: {
    marginTop: 8,
    color: '#999',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
  },
  fullImage: {
    flex: 1,
  },
  modalInfo: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  modalText: {
    color: '#fff',
    textAlign: 'center',
    marginVertical: 2,
  },
  syncStatusModal: {
    marginTop: 8,
  },
  syncChip: {
    borderRadius: 16,
  },
  syncedChip: {
    backgroundColor: '#4CAF50',
  },
  pendingChip: {
    backgroundColor: '#FF9800',
  },
});