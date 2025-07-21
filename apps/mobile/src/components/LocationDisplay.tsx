import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  Text,
  Chip,
  Card,
  Button,
  IconButton,
  Dialog,
  Portal,
  useTheme,
  ActivityIndicator,
} from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { locationService, LocationData, LocationPermissionStatus } from '../services/location';

interface LocationDisplayProps {
  location?: LocationData | null;
  showAddress?: boolean;
  showAccuracy?: boolean;
  showRefreshButton?: boolean;
  style?: any;
  onLocationUpdate?: (location: LocationData | null) => void;
}

export const LocationDisplay: React.FC<LocationDisplayProps> = ({
  location: propLocation,
  showAddress = false,
  showAccuracy = true,
  showRefreshButton = true,
  style,
  onLocationUpdate,
}) => {
  const theme = useTheme();
  const [location, setLocation] = useState<LocationData | null>(propLocation || null);
  const [loading, setLoading] = useState(false);
  const [permissions, setPermissions] = useState<LocationPermissionStatus | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  useEffect(() => {
    checkPermissions();
  }, []);

  useEffect(() => {
    if (propLocation !== undefined) {
      setLocation(propLocation);
    }
  }, [propLocation]);

  const checkPermissions = async () => {
    const permissionStatus = await locationService.checkPermissions();
    setPermissions(permissionStatus);
  };

  const requestLocation = async (highAccuracy = false) => {
    setLoading(true);
    try {
      const newLocation = showAddress 
        ? await locationService.getLocationWithAddress(highAccuracy)
        : await locationService.getCurrentLocation(highAccuracy);
      
      setLocation(newLocation);
      onLocationUpdate?.(newLocation);
      
      if (!newLocation) {
        Alert.alert(
          'Location Error',
          'Could not get your current location. Please check your location settings.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert(
        'Location Error',
        'Failed to get location. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPermissions = async () => {
    const permissionStatus = await locationService.requestPermissions();
    setPermissions(permissionStatus);
    
    if (permissionStatus.granted) {
      requestLocation();
    } else {
      Alert.alert(
        'Location Permission Required',
        'This app needs location permission to track work locations. Please enable location access in your device settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Settings', onPress: () => {
            // In a real app, you would open device settings here
            Alert.alert('Settings', 'Please enable location permission in your device settings.');
          }}
        ]
      );
    }
  };

  const getLocationQualityColor = (quality: 'excellent' | 'good' | 'fair' | 'poor') => {
    switch (quality) {
      case 'excellent': return theme.colors.primary;
      case 'good': return '#4CAF50';
      case 'fair': return '#FF9800';
      case 'poor': return theme.colors.error;
      default: return theme.colors.outline;
    }
  };

  const getLocationQualityIcon = (quality: 'excellent' | 'good' | 'fair' | 'poor') => {
    switch (quality) {
      case 'excellent': return 'gps-fixed';
      case 'good': return 'my-location';
      case 'fair': return 'location-searching';
      case 'poor': return 'location-disabled';
      default: return 'location-off';
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return timestamp.toLocaleDateString();
  };

  // No permissions check yet
  if (!permissions) {
    return (
      <Card style={[styles.card, style]}>
        <Card.Content>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" />
            <Text variant="bodySmall" style={styles.loadingText}>
              Checking location permissions...
            </Text>
          </View>
        </Card.Content>
      </Card>
    );
  }

  // No permissions granted
  if (!permissions.granted) {
    return (
      <Card style={[styles.card, style]}>
        <Card.Content>
          <View style={styles.noPermissionContainer}>
            <MaterialIcons 
              name="location-off" 
              size={24} 
              color={theme.colors.error} 
              style={styles.noPermissionIcon}
            />
            <Text variant="bodyMedium" style={styles.noPermissionText}>
              Location access required
            </Text>
            <Button 
              mode="outlined" 
              onPress={handleRequestPermissions}
              style={styles.permissionButton}
              compact
            >
              Enable Location
            </Button>
          </View>
        </Card.Content>
      </Card>
    );
  }

  // No location data
  if (!location) {
    return (
      <Card style={[styles.card, style]}>
        <Card.Content>
          <View style={styles.noLocationContainer}>
            <MaterialIcons 
              name="location-searching" 
              size={24} 
              color={theme.colors.outline} 
              style={styles.noLocationIcon}
            />
            <Text variant="bodyMedium" style={styles.noLocationText}>
              No location data
            </Text>
            <Button 
              mode="outlined" 
              onPress={() => requestLocation()}
              disabled={loading}
              style={styles.getLocationButton}
              compact
            >
              {loading ? 'Getting Location...' : 'Get Location'}
            </Button>
          </View>
        </Card.Content>
      </Card>
    );
  }

  const quality = locationService.getLocationQuality(location);
  const qualityColor = getLocationQualityColor(quality);
  const qualityIcon = getLocationQualityIcon(quality);

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity 
        style={[styles.locationContainer, { borderLeftColor: qualityColor }]}
        onPress={() => setShowDetailsDialog(true)}
      >
        <View style={styles.locationHeader}>
          <MaterialIcons
            name={qualityIcon}
            size={20}
            color={qualityColor}
          />
          <Text variant="bodyMedium" style={[styles.coordinatesText, { color: qualityColor }]}>
            {locationService.formatCoordinates(location.latitude, location.longitude)}
          </Text>
          {showRefreshButton && (
            <IconButton
              icon="refresh"
              size={16}
              onPress={() => requestLocation(true)}
              disabled={loading}
            />
          )}
        </View>

        {showAccuracy && location.accuracy && (
          <Text variant="bodySmall" style={styles.accuracyText}>
            Accuracy: {location.accuracy.toFixed(1)}m • {locationService.formatAccuracy(location.accuracy)}
          </Text>
        )}

        {showAddress && location.address && (
          <Text variant="bodySmall" style={styles.addressText}>
            {location.address}
          </Text>
        )}

        <Text variant="bodySmall" style={styles.timestampText}>
          {formatTimestamp(location.timestamp)}
        </Text>
      </TouchableOpacity>

      <Portal>
        <Dialog visible={showDetailsDialog} onDismiss={() => setShowDetailsDialog(false)}>
          <Dialog.Title>Location Details</Dialog.Title>
          <Dialog.Content>
            <View style={styles.dialogContent}>
              <View style={styles.detailRow}>
                <Text variant="bodyMedium" style={styles.detailLabel}>Coordinates:</Text>
                <Text variant="bodyMedium" style={styles.detailValue}>
                  {locationService.formatCoordinates(location.latitude, location.longitude)}
                </Text>
              </View>

              {location.accuracy && (
                <View style={styles.detailRow}>
                  <Text variant="bodyMedium" style={styles.detailLabel}>Accuracy:</Text>
                  <Text variant="bodyMedium" style={styles.detailValue}>
                    {location.accuracy.toFixed(1)} meters
                  </Text>
                </View>
              )}

              {location.altitude && (
                <View style={styles.detailRow}>
                  <Text variant="bodyMedium" style={styles.detailLabel}>Altitude:</Text>
                  <Text variant="bodyMedium" style={styles.detailValue}>
                    {location.altitude.toFixed(1)} meters
                  </Text>
                </View>
              )}

              {location.speed && (
                <View style={styles.detailRow}>
                  <Text variant="bodyMedium" style={styles.detailLabel}>Speed:</Text>
                  <Text variant="bodyMedium" style={styles.detailValue}>
                    {(location.speed * 3.6).toFixed(1)} km/h
                  </Text>
                </View>
              )}

              {location.address && (
                <View style={styles.detailRow}>
                  <Text variant="bodyMedium" style={styles.detailLabel}>Address:</Text>
                  <Text variant="bodyMedium" style={styles.detailValue}>
                    {location.address}
                  </Text>
                </View>
              )}

              <View style={styles.detailRow}>
                <Text variant="bodyMedium" style={styles.detailLabel}>Quality:</Text>
                <Chip
                  mode="outlined"
                  style={[styles.qualityChip, { borderColor: qualityColor }]}
                  textStyle={{ color: qualityColor }}
                  compact
                >
                  {quality.charAt(0).toUpperCase() + quality.slice(1)}
                </Chip>
              </View>

              <View style={styles.detailRow}>
                <Text variant="bodyMedium" style={styles.detailLabel}>Captured:</Text>
                <Text variant="bodyMedium" style={styles.detailValue}>
                  {location.timestamp.toLocaleString()}
                </Text>
              </View>
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => requestLocation(true)}>
              Refresh
            </Button>
            <Button onPress={() => setShowDetailsDialog(false)}>
              Close
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  card: {
    marginVertical: 4,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  loadingText: {
    marginLeft: 8,
    color: '#666',
  },
  noPermissionContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  noPermissionIcon: {
    marginBottom: 8,
  },
  noPermissionText: {
    marginBottom: 12,
    textAlign: 'center',
    color: '#666',
  },
  permissionButton: {
    minWidth: 120,
  },
  noLocationContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  noLocationIcon: {
    marginBottom: 8,
  },
  noLocationText: {
    marginBottom: 12,
    textAlign: 'center',
    color: '#666',
  },
  getLocationButton: {
    minWidth: 120,
  },
  locationContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderLeftWidth: 4,
    padding: 12,
    elevation: 1,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  coordinatesText: {
    marginLeft: 8,
    flex: 1,
    fontFamily: 'monospace',
    fontWeight: '500',
  },
  accuracyText: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  addressText: {
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  timestampText: {
    color: '#999',
    fontSize: 11,
    marginTop: 4,
  },
  dialogContent: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontWeight: '500',
    color: '#666',
    flex: 1,
  },
  detailValue: {
    flex: 2,
    textAlign: 'right',
  },
  qualityChip: {
    height: 24,
  },
});