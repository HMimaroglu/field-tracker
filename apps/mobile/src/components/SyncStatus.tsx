import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Text, Chip, IconButton, Dialog, Portal, Button } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { syncService, SyncStatus as SyncStatusType, SyncQueueItem } from '../services/sync';

interface SyncStatusProps {
  style?: any;
  showDetails?: boolean;
}

export const SyncStatus: React.FC<SyncStatusProps> = ({ style, showDetails = true }) => {
  const [syncStatus, setSyncStatus] = useState<SyncStatusType>({
    isOnline: false,
    isSyncing: false,
    pendingItems: 0,
  });
  const [showDialog, setShowDialog] = useState(false);
  const [failedItems, setFailedItems] = useState<SyncQueueItem[]>([]);

  useEffect(() => {
    // Initial load
    loadSyncStatus();
    
    // Subscribe to sync status updates
    const unsubscribe = syncService.addListener((status) => {
      setSyncStatus(status);
    });

    return unsubscribe;
  }, []);

  const loadSyncStatus = async () => {
    try {
      const status = await syncService.getSyncStatus();
      setSyncStatus(status);
    } catch (error) {
      console.error('Failed to load sync status:', error);
    }
  };

  const loadFailedItems = async () => {
    try {
      const items = await syncService.getFailedItems();
      setFailedItems(items);
    } catch (error) {
      console.error('Failed to load failed items:', error);
    }
  };

  const handleSyncPress = async () => {
    if (!syncStatus.isOnline) {
      Alert.alert(
        'No Network Connection',
        'Please check your internet connection and try again.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (syncStatus.isSyncing) {
      Alert.alert(
        'Sync in Progress',
        'Please wait for the current sync to complete.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      const result = await syncService.syncPendingItems();
      
      if (result.success) {
        Alert.alert(
          'Sync Complete',
          `Successfully synced ${result.succeeded} items.${result.failed > 0 ? ` ${result.failed} items failed.` : ''}`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Sync Failed',
          `Failed to sync ${result.failed} items. Please try again.`,
          [
            { text: 'Cancel' },
            { text: 'View Details', onPress: () => handleShowDetails() }
          ]
        );
      }
    } catch (error) {
      Alert.alert(
        'Sync Error',
        'An error occurred while syncing. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleShowDetails = async () => {
    await loadFailedItems();
    setShowDialog(true);
  };

  const handleRetryFailed = async () => {
    setShowDialog(false);
    
    if (!syncStatus.isOnline) {
      Alert.alert('No Network Connection', 'Please check your internet connection.');
      return;
    }

    try {
      const result = await syncService.syncPendingItems();
      Alert.alert(
        'Retry Complete',
        `${result.succeeded} items synced successfully.${result.failed > 0 ? ` ${result.failed} items still failed.` : ''}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Retry Failed', 'Please try again later.');
    }
  };

  const handleClearQueue = async () => {
    Alert.alert(
      'Clear Sync Queue',
      'This will remove all pending sync items. This action cannot be undone. Are you sure?',
      [
        { text: 'Cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await syncService.clearSyncQueue();
              setShowDialog(false);
              Alert.alert('Queue Cleared', 'All pending sync items have been removed.');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear sync queue.');
            }
          }
        }
      ]
    );
  };

  const getStatusColor = () => {
    if (!syncStatus.isOnline) return '#f44336'; // Red
    if (syncStatus.isSyncing) return '#ff9800'; // Orange
    if (syncStatus.pendingItems > 0) return '#2196f3'; // Blue
    return '#4caf50'; // Green
  };

  const getStatusText = () => {
    if (!syncStatus.isOnline) return 'Offline';
    if (syncStatus.isSyncing) return 'Syncing...';
    if (syncStatus.pendingItems > 0) return `${syncStatus.pendingItems} pending`;
    return 'Up to date';
  };

  const getStatusIcon = () => {
    if (!syncStatus.isOnline) return 'wifi-off';
    if (syncStatus.isSyncing) return 'sync';
    if (syncStatus.pendingItems > 0) return 'cloud-upload';
    return 'cloud-done';
  };

  if (!showDetails) {
    // Simple chip display
    return (
      <Chip
        mode="outlined"
        style={[styles.chip, { borderColor: getStatusColor() }, style]}
        textStyle={{ color: getStatusColor(), fontSize: 12 }}
        icon={getStatusIcon()}
      >
        {getStatusText()}
      </Chip>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={[styles.statusContainer, { borderLeftColor: getStatusColor() }]}
        onPress={handleSyncPress}
        disabled={syncStatus.isSyncing}
      >
        <View style={styles.statusContent}>
          <View style={styles.statusHeader}>
            <MaterialIcons
              name={getStatusIcon()}
              size={20}
              color={getStatusColor()}
              style={syncStatus.isSyncing ? styles.spinning : undefined}
            />
            <Text variant="bodyMedium" style={[styles.statusText, { color: getStatusColor() }]}>
              {getStatusText()}
            </Text>
          </View>
          
          {syncStatus.lastSyncAt && (
            <Text variant="bodySmall" style={styles.lastSync}>
              Last sync: {syncStatus.lastSyncAt.toLocaleTimeString()}
            </Text>
          )}
          
          {syncStatus.lastError && (
            <Text variant="bodySmall" style={styles.error}>
              Error: {syncStatus.lastError}
            </Text>
          )}
        </View>

        {(syncStatus.pendingItems > 0 || failedItems.length > 0) && (
          <IconButton
            icon="information"
            size={16}
            onPress={(e) => {
              e.stopPropagation();
              handleShowDetails();
            }}
          />
        )}
      </TouchableOpacity>

      <Portal>
        <Dialog visible={showDialog} onDismiss={() => setShowDialog(false)}>
          <Dialog.Title>Sync Details</Dialog.Title>
          <Dialog.Content>
            <View style={styles.dialogStats}>
              <Text variant="bodyMedium">
                Network: {syncStatus.isOnline ? 'Connected' : 'Offline'}
              </Text>
              <Text variant="bodyMedium">
                Pending Items: {syncStatus.pendingItems}
              </Text>
              <Text variant="bodyMedium">
                Failed Items: {failedItems.length}
              </Text>
            </View>

            {failedItems.length > 0 && (
              <View style={styles.failedItems}>
                <Text variant="titleSmall" style={styles.failedTitle}>
                  Failed Items:
                </Text>
                {failedItems.slice(0, 5).map((item, index) => (
                  <View key={item.id || index} style={styles.failedItem}>
                    <Text variant="bodySmall" style={styles.failedType}>
                      {item.type}
                    </Text>
                    <Text variant="bodySmall" style={styles.failedError}>
                      Retry #{item.retryCount}: {item.lastError || 'Unknown error'}
                    </Text>
                  </View>
                ))}
                {failedItems.length > 5 && (
                  <Text variant="bodySmall" style={styles.moreItems}>
                    +{failedItems.length - 5} more items
                  </Text>
                )}
              </View>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            {failedItems.length > 0 && (
              <>
                <Button onPress={handleRetryFailed}>
                  Retry Failed
                </Button>
                <Button onPress={handleClearQueue} textColor="#f44336">
                  Clear Queue
                </Button>
              </>
            )}
            <Button onPress={() => setShowDialog(false)}>
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
  chip: {
    alignSelf: 'flex-start',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderLeftWidth: 4,
    elevation: 1,
    padding: 12,
  },
  statusContent: {
    flex: 1,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusText: {
    marginLeft: 8,
    fontWeight: '500',
  },
  lastSync: {
    color: '#666',
    fontSize: 12,
  },
  error: {
    color: '#f44336',
    fontSize: 12,
    marginTop: 2,
  },
  spinning: {
    // Note: React Native doesn't support CSS animations directly
    // You'd need to use Animated API or a library like react-native-reanimated
    // for a proper spinning animation
  },
  dialogStats: {
    marginBottom: 16,
    gap: 4,
  },
  failedItems: {
    marginTop: 12,
  },
  failedTitle: {
    marginBottom: 8,
    fontWeight: '600',
  },
  failedItem: {
    backgroundColor: '#fff3e0',
    padding: 8,
    borderRadius: 4,
    marginBottom: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#ff9800',
  },
  failedType: {
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  failedError: {
    color: '#666',
    marginTop: 2,
  },
  moreItems: {
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
});