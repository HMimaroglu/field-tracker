import React, { useState } from 'react';
import { View, Alert, StyleSheet, TouchableOpacity } from 'react-native';
import { Button, IconButton, Card, Title, Paragraph, Dialog, Portal, Text } from 'react-native-paper';
import { photoService, PhotoData, CameraResult } from '../services/photo';
import { MaterialIcons } from '@expo/vector-icons';

interface PhotoCaptureProps {
  timeEntryId?: number;
  location?: { latitude: number; longitude: number };
  onPhotoTaken?: (photo: PhotoData) => void;
  style?: any;
}

export const PhotoCapture: React.FC<PhotoCaptureProps> = ({
  timeEntryId,
  location,
  onPhotoTaken,
  style
}) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [showMethodDialog, setShowMethodDialog] = useState(false);

  const handlePhotoResult = (result: CameraResult) => {
    if (result.success && result.photo) {
      onPhotoTaken?.(result.photo);
      Alert.alert(
        'Photo Captured',
        'Photo has been saved and will be synced when connection is available.',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        'Photo Capture Failed',
        result.error || 'Unknown error occurred',
        [{ text: 'OK' }]
      );
    }
    setIsCapturing(false);
  };

  const captureFromCamera = async () => {
    setShowMethodDialog(false);
    setIsCapturing(true);

    try {
      const result = await photoService.capturePhoto(timeEntryId, location);
      handlePhotoResult(result);
    } catch (error) {
      console.error('Camera capture error:', error);
      handlePhotoResult({
        success: false,
        error: 'Camera capture failed'
      });
    }
  };

  const selectFromGallery = async () => {
    setShowMethodDialog(false);
    setIsCapturing(true);

    try {
      const result = await photoService.selectFromGallery(timeEntryId);
      handlePhotoResult(result);
    } catch (error) {
      console.error('Gallery selection error:', error);
      handlePhotoResult({
        success: false,
        error: 'Gallery selection failed'
      });
    }
  };

  const handleAddPhoto = () => {
    setShowMethodDialog(true);
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={styles.captureButton}
        onPress={handleAddPhoto}
        disabled={isCapturing}
      >
        <MaterialIcons 
          name="add-a-photo" 
          size={24} 
          color="#fff" 
        />
        <Text style={styles.captureButtonText}>
          {isCapturing ? 'Processing...' : 'Add Photo'}
        </Text>
      </TouchableOpacity>

      <Portal>
        <Dialog
          visible={showMethodDialog}
          onDismiss={() => setShowMethodDialog(false)}
        >
          <Dialog.Title>Add Photo</Dialog.Title>
          <Dialog.Content>
            <Text>Choose how you want to add a photo:</Text>
            
            <View style={styles.methodButtons}>
              <Button
                mode="contained"
                icon="camera"
                onPress={captureFromCamera}
                style={styles.methodButton}
                disabled={isCapturing}
              >
                Take Photo
              </Button>
              
              <Button
                mode="outlined"
                icon="image"
                onPress={selectFromGallery}
                style={styles.methodButton}
                disabled={isCapturing}
              >
                Choose from Gallery
              </Button>
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowMethodDialog(false)}>
              Cancel
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  captureButton: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  captureButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  methodButtons: {
    marginTop: 16,
    gap: 12,
  },
  methodButton: {
    marginVertical: 4,
  },
});