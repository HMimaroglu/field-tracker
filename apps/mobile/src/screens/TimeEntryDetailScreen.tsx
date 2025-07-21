import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  Divider,
  Chip,
  IconButton,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { PhotoCapture } from '../components/PhotoCapture';
import { PhotoGallery } from '../components/PhotoGallery';
import { BreakDetail } from '../components/BreakDetail';
import { LocationDisplay } from '../components/LocationDisplay';
import { photoService, PhotoData } from '../services/photo';
import { databaseService, TimeEntry } from '../services/database';
import { locationService } from '../services/location';
import { formatDuration } from '@field-tracker/shared-utils';

type Props = NativeStackScreenProps<RootStackParamList, 'TimeEntryDetail'>;

export const TimeEntryDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { timeEntryId } = route.params;
  const [timeEntry, setTimeEntry] = useState<TimeEntry | null>(null);
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTimeEntryData();
  }, [timeEntryId]);

  const loadTimeEntryData = async () => {
    try {
      setLoading(true);
      
      // Load time entry details
      const db = await databaseService.getDatabase();
      const timeEntryRow = await db.getFirstAsync(
        `SELECT te.*, 
                w.name as worker_name, w.employee_id,
                j.name as job_name, j.job_code
         FROM time_entries te
         LEFT JOIN workers w ON te.worker_id = w.id
         LEFT JOIN jobs j ON te.job_id = j.id
         WHERE te.id = ?`,
        [timeEntryId]
      );

      if (timeEntryRow) {
        const entry: TimeEntry = {
          id: timeEntryRow.id,
          offlineGuid: timeEntryRow.offline_guid,
          workerId: timeEntryRow.worker_id,
          jobId: timeEntryRow.job_id,
          startTime: timeEntryRow.start_time,
          endTime: timeEntryRow.end_time,
          startLatitude: timeEntryRow.start_latitude,
          startLongitude: timeEntryRow.start_longitude,
          endLatitude: timeEntryRow.end_latitude,
          endLongitude: timeEntryRow.end_longitude,
          notes: timeEntryRow.notes,
          regularHours: timeEntryRow.regular_hours,
          overtimeHours: timeEntryRow.overtime_hours,
          isSynced: Boolean(timeEntryRow.is_synced),
          hasConflict: Boolean(timeEntryRow.has_conflict),
          createdAt: timeEntryRow.created_at,
          updatedAt: timeEntryRow.updated_at,
        };
        
        // Add additional data for display
        (entry as any).workerName = timeEntryRow.worker_name;
        (entry as any).employeeId = timeEntryRow.employee_id;
        (entry as any).jobName = timeEntryRow.job_name;
        (entry as any).jobCode = timeEntryRow.job_code;
        
        setTimeEntry(entry);
      }

      // Load photos
      const timeEntryPhotos = await photoService.getPhotosForTimeEntry(timeEntryId);
      setPhotos(timeEntryPhotos);
      
    } catch (error) {
      console.error('Failed to load time entry data:', error);
      Alert.alert('Error', 'Failed to load time entry details');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoTaken = (photo: PhotoData) => {
    setPhotos(prev => [photo, ...prev]);
  };

  const refreshPhotos = () => {
    loadTimeEntryData();
  };

  const formatDateTime = (dateTime: string) => {
    const date = new Date(dateTime);
    return date.toLocaleString();
  };

  const calculateDuration = () => {
    if (!timeEntry) return '0:00';
    
    const start = new Date(timeEntry.startTime);
    const end = timeEntry.endTime ? new Date(timeEntry.endTime) : new Date();
    
    const durationMs = end.getTime() - start.getTime();
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  };

  const getStatusChipColor = () => {
    if (!timeEntry) return 'outline';
    
    if (timeEntry.hasConflict) return 'error';
    if (!timeEntry.isSynced) return 'primary';
    return 'outline';
  };

  const getStatusText = () => {
    if (!timeEntry) return 'Unknown';
    
    if (timeEntry.hasConflict) return 'Conflict';
    if (!timeEntry.isSynced) return 'Pending Sync';
    return 'Synced';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <IconButton
            icon="arrow-left"
            onPress={() => navigation.goBack()}
          />
          <Text variant="headlineSmall">Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!timeEntry) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <IconButton
            icon="arrow-left"
            onPress={() => navigation.goBack()}
          />
          <Text variant="headlineSmall">Time Entry Not Found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <IconButton
          icon="arrow-left"
          onPress={() => navigation.goBack()}
        />
        <Text variant="headlineSmall">Time Entry Details</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Time Entry Details */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Text variant="titleLarge">{(timeEntry as any).jobName}</Text>
              <Chip 
                mode={getStatusChipColor()}
                style={styles.statusChip}
              >
                {getStatusText()}
              </Chip>
            </View>
            
            <Text variant="bodyLarge" style={styles.jobCode}>
              {(timeEntry as any).jobCode}
            </Text>
            
            <Text variant="bodyMedium" style={styles.workerInfo}>
              Worker: {(timeEntry as any).workerName} ({(timeEntry as any).employeeId})
            </Text>
            
            <Divider style={styles.divider} />
            
            <View style={styles.timeInfo}>
              <View style={styles.timeRow}>
                <Text variant="bodyMedium" style={styles.label}>Start Time:</Text>
                <Text variant="bodyMedium">{formatDateTime(timeEntry.startTime)}</Text>
              </View>
              
              {timeEntry.endTime && (
                <View style={styles.timeRow}>
                  <Text variant="bodyMedium" style={styles.label}>End Time:</Text>
                  <Text variant="bodyMedium">{formatDateTime(timeEntry.endTime)}</Text>
                </View>
              )}
              
              <View style={styles.timeRow}>
                <Text variant="bodyMedium" style={styles.label}>Duration:</Text>
                <Text variant="titleMedium" style={styles.duration}>
                  {calculateDuration()}
                </Text>
              </View>
              
              {timeEntry.regularHours && (
                <View style={styles.timeRow}>
                  <Text variant="bodyMedium" style={styles.label}>Regular Hours:</Text>
                  <Text variant="bodyMedium">{timeEntry.regularHours.toFixed(2)}h</Text>
                </View>
              )}
              
              {timeEntry.overtimeHours && (
                <View style={styles.timeRow}>
                  <Text variant="bodyMedium" style={styles.label}>Overtime Hours:</Text>
                  <Text variant="bodyMedium">{timeEntry.overtimeHours.toFixed(2)}h</Text>
                </View>
              )}
            </View>
            
            {timeEntry.notes && (
              <>
                <Divider style={styles.divider} />
                <Text variant="bodyMedium" style={styles.label}>Notes:</Text>
                <Text variant="bodyMedium" style={styles.notes}>
                  {timeEntry.notes}
                </Text>
              </>
            )}
            
            {(timeEntry.startLatitude || timeEntry.endLatitude) && (
              <>
                <Divider style={styles.divider} />
                <Text variant="bodyMedium" style={styles.label}>Locations:</Text>
                
                {timeEntry.startLatitude && timeEntry.startLongitude && (
                  <View style={styles.locationSection}>
                    <Text variant="bodySmall" style={styles.locationLabel}>Start Location:</Text>
                    <LocationDisplay
                      location={{
                        latitude: timeEntry.startLatitude,
                        longitude: timeEntry.startLongitude,
                        timestamp: new Date(timeEntry.startTime),
                      }}
                      showAddress={true}
                      showRefreshButton={false}
                      style={styles.locationDisplay}
                    />
                  </View>
                )}
                
                {timeEntry.endLatitude && timeEntry.endLongitude && (
                  <View style={styles.locationSection}>
                    <Text variant="bodySmall" style={styles.locationLabel}>End Location:</Text>
                    <LocationDisplay
                      location={{
                        latitude: timeEntry.endLatitude,
                        longitude: timeEntry.endLongitude,
                        timestamp: timeEntry.endTime ? new Date(timeEntry.endTime) : new Date(),
                      }}
                      showAddress={true}
                      showRefreshButton={false}
                      style={styles.locationDisplay}
                    />
                  </View>
                )}
                
                {timeEntry.startLatitude && timeEntry.startLongitude && 
                 timeEntry.endLatitude && timeEntry.endLongitude && (
                  <View style={styles.distanceInfo}>
                    <Text variant="bodySmall" style={styles.distanceLabel}>
                      Distance traveled: 
                    </Text>
                    <Text variant="bodySmall" style={styles.distanceValue}>
                      {locationService.calculateDistance(
                        timeEntry.startLatitude,
                        timeEntry.startLongitude,
                        timeEntry.endLatitude,
                        timeEntry.endLongitude
                      ).toFixed(0)}m
                    </Text>
                  </View>
                )}
              </>
            )}
          </Card.Content>
        </Card>

        {/* Break Details */}
        <BreakDetail timeEntryOfflineGuid={timeEntry.offlineGuid} />

        {/* Photo Section */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.photoHeader}>
              <Text variant="titleMedium">Photos ({photos.length})</Text>
            </View>
            
            {!timeEntry.endTime && (
              <PhotoCapture
                timeEntryId={timeEntryId}
                location={
                  timeEntry.startLatitude && timeEntry.startLongitude 
                    ? { latitude: timeEntry.startLatitude, longitude: timeEntry.startLongitude }
                    : undefined
                }
                onPhotoTaken={handlePhotoTaken}
                style={styles.photoCapture}
              />
            )}
            
            <PhotoGallery
              timeEntryId={timeEntryId}
              photos={photos}
              onRefresh={refreshPhotos}
              style={styles.photoGallery}
              editable={!timeEntry.endTime}
            />
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: '#fff',
    elevation: 2,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  statusChip: {
    alignSelf: 'flex-start',
  },
  jobCode: {
    color: '#666',
    marginBottom: 4,
  },
  workerInfo: {
    color: '#888',
    marginBottom: 16,
  },
  divider: {
    marginVertical: 16,
  },
  timeInfo: {
    gap: 8,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontWeight: '500',
    color: '#666',
  },
  duration: {
    fontWeight: 'bold',
    color: '#2196F3',
  },
  notes: {
    marginTop: 4,
    fontStyle: 'italic',
  },
  location: {
    marginTop: 2,
    color: '#888',
    fontFamily: 'monospace',
  },
  locationSection: {
    marginTop: 8,
  },
  locationLabel: {
    fontWeight: '500',
    marginBottom: 4,
    color: '#666',
  },
  locationDisplay: {
    marginBottom: 8,
  },
  distanceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f0f8ff',
    borderRadius: 4,
  },
  distanceLabel: {
    color: '#666',
  },
  distanceValue: {
    fontWeight: '500',
    color: '#2196F3',
  },
  photoHeader: {
    marginBottom: 16,
  },
  photoCapture: {
    marginBottom: 16,
  },
  photoGallery: {
    minHeight: 200,
  },
});