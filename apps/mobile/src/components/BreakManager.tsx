import React, { useEffect, useState } from 'react';
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
  Chip,
  Dialog,
  Portal,
  TextInput,
  RadioButton,
  List,
  IconButton,
  useTheme,
} from 'react-native-paper';
import { useTimeTrackingStore } from '@/store/timeTracking';
import { BreakType, BreakEntry } from '@/services/database';

interface BreakManagerProps {
  style?: any;
  showHistory?: boolean;
}

export const BreakManager: React.FC<BreakManagerProps> = ({ style, showHistory = true }) => {
  const theme = useTheme();
  const {
    activeTimeEntry,
    activeBreak,
    isOnBreak,
    breakTypes,
    breaks,
    startBreak,
    endBreak,
    loadBreakTypes,
    loadBreaks,
  } = useTimeTrackingStore();

  const [showBreakDialog, setShowBreakDialog] = useState(false);
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [selectedBreakType, setSelectedBreakType] = useState<BreakType | null>(null);
  const [breakNotes, setBreakNotes] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every second when on break
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isOnBreak) {
      interval = setInterval(() => {
        setCurrentTime(new Date());
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOnBreak]);

  // Load data on mount
  useEffect(() => {
    loadBreakTypes();
    if (showHistory && activeTimeEntry) {
      loadBreaks(activeTimeEntry.offlineGuid);
    }
  }, [activeTimeEntry]);

  const handleStartBreak = (breakType: BreakType) => {
    setSelectedBreakType(breakType);
    setBreakNotes('');
    setShowBreakDialog(false);
    setShowNotesDialog(true);
  };

  const handleConfirmStartBreak = async () => {
    if (!selectedBreakType) return;

    try {
      await startBreak(selectedBreakType.id, breakNotes.trim() || undefined);
      setShowNotesDialog(false);
      setSelectedBreakType(null);
      setBreakNotes('');
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to start break',
        [{ text: 'OK' }]
      );
    }
  };

  const handleEndBreak = () => {
    Alert.alert(
      'End Break',
      'Are you sure you want to end your break?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Break',
          onPress: async () => {
            try {
              await endBreak();
              if (showHistory && activeTimeEntry) {
                loadBreaks(activeTimeEntry.offlineGuid);
              }
            } catch (error) {
              Alert.alert(
                'Error',
                error instanceof Error ? error.message : 'Failed to end break'
              );
            }
          },
        },
      ]
    );
  };

  const getBreakDuration = () => {
    if (!activeBreak) return '00:00';
    
    const start = activeBreak.startTime;
    const duration = Math.floor((currentTime.getTime() - start.getTime()) / 1000);
    
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatBreakDuration = (durationMinutes: number) => {
    if (durationMinutes < 60) {
      return `${durationMinutes}m`;
    }
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  };

  const getBreakTypeName = (breakTypeId: number): string => {
    const breakType = breakTypes.find(bt => bt.id === breakTypeId);
    return breakType?.name || 'Unknown';
  };

  // Don't show if no active time entry
  if (!activeTimeEntry) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      {/* Active Break Card */}
      {isOnBreak && activeBreak ? (
        <Card style={[styles.card, styles.activeBreakCard]}>
          <Card.Content>
            <View style={styles.breakHeader}>
              <Chip mode="flat" style={styles.breakChip}>
                On Break
              </Chip>
              <Text variant="headlineMedium" style={styles.breakTimer}>
                {getBreakDuration()}
              </Text>
            </View>
            
            <Text variant="titleMedium" style={styles.breakType}>
              {getBreakTypeName(activeBreak.breakTypeId)}
            </Text>
            
            <Text variant="bodySmall" style={styles.breakStart}>
              Started at {activeBreak.startTime.toLocaleTimeString()}
            </Text>
            
            {activeBreak.notes && (
              <Text variant="bodySmall" style={styles.breakNotes}>
                Note: {activeBreak.notes}
              </Text>
            )}
            
            <Button 
              mode="contained" 
              onPress={handleEndBreak}
              style={styles.endBreakButton}
              buttonColor={theme.colors.error}
            >
              End Break
            </Button>
          </Card.Content>
        </Card>
      ) : (
        /* Start Break Card */
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>
              Break Management
            </Text>
            <Text variant="bodyMedium" style={styles.cardDescription}>
              Take a break from your current job
            </Text>
            <Button 
              mode="outlined" 
              onPress={() => setShowBreakDialog(true)}
              style={styles.startBreakButton}
              icon="coffee"
            >
              Start Break
            </Button>
          </Card.Content>
        </Card>
      )}

      {/* Break History */}
      {showHistory && breaks.length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Today's Breaks
            </Text>
            
            <ScrollView style={styles.breakHistory} nestedScrollView>
              {breaks.slice(0, 5).map((breakEntry, index) => (
                <View key={breakEntry.id || index} style={styles.breakItem}>
                  <View style={styles.breakItemHeader}>
                    <Text variant="bodyMedium" style={styles.breakItemType}>
                      {getBreakTypeName(breakEntry.breakTypeId)}
                    </Text>
                    <View style={styles.breakItemMeta}>
                      <Text variant="bodySmall" style={styles.breakDuration}>
                        {breakEntry.durationMinutes ? formatBreakDuration(breakEntry.durationMinutes) : 'In Progress'}
                      </Text>
                      <Chip
                        mode="outlined"
                        compact
                        style={[
                          styles.syncChip,
                          { backgroundColor: breakEntry.isSynced ? theme.colors.primaryContainer : theme.colors.errorContainer }
                        ]}
                      >
                        {breakEntry.isSynced ? 'Synced' : 'Pending'}
                      </Chip>
                    </View>
                  </View>
                  
                  <Text variant="bodySmall" style={styles.breakTime}>
                    {new Date(breakEntry.startTime).toLocaleTimeString()}
                    {breakEntry.endTime && ` - ${new Date(breakEntry.endTime).toLocaleTimeString()}`}
                  </Text>
                  
                  {breakEntry.notes && (
                    <Text variant="bodySmall" style={styles.breakItemNotes}>
                      {breakEntry.notes}
                    </Text>
                  )}
                </View>
              ))}
            </ScrollView>
          </Card.Content>
        </Card>
      )}

      {/* Break Type Selection Dialog */}
      <Portal>
        <Dialog visible={showBreakDialog} onDismiss={() => setShowBreakDialog(false)}>
          <Dialog.Title>Select Break Type</Dialog.Title>
          <Dialog.Content>
            <ScrollView style={styles.breakTypeList}>
              {breakTypes.map((breakType) => (
                <List.Item
                  key={breakType.id}
                  title={breakType.name}
                  description={`Default: ${breakType.defaultMinutes} minutes • ${breakType.isPaid ? 'Paid' : 'Unpaid'}`}
                  left={(props) => (
                    <List.Icon 
                      {...props} 
                      icon={breakType.isPaid ? 'currency-usd' : 'clock-outline'} 
                    />
                  )}
                  onPress={() => handleStartBreak(breakType)}
                  style={styles.breakTypeItem}
                />
              ))}
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowBreakDialog(false)}>Cancel</Button>
          </Dialog.Actions>
        </Dialog>

        {/* Break Notes Dialog */}
        <Dialog visible={showNotesDialog} onDismiss={() => setShowNotesDialog(false)}>
          <Dialog.Title>Break Notes (Optional)</Dialog.Title>
          <Dialog.Content>
            {selectedBreakType && (
              <Text variant="bodyMedium" style={styles.selectedBreakType}>
                Starting: {selectedBreakType.name}
              </Text>
            )}
            
            <TextInput
              label="Notes (optional)"
              value={breakNotes}
              onChangeText={setBreakNotes}
              mode="outlined"
              multiline
              numberOfLines={3}
              placeholder="Add any notes about this break..."
              style={styles.notesInput}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowNotesDialog(false)}>Cancel</Button>
            <Button mode="contained" onPress={handleConfirmStartBreak}>
              Start Break
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
    marginBottom: 16,
  },
  activeBreakCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800',
  },
  breakHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  breakChip: {
    backgroundColor: '#fff3e0',
  },
  breakTimer: {
    fontWeight: 'bold',
    color: '#ff9800',
  },
  breakType: {
    marginBottom: 4,
  },
  breakStart: {
    color: '#666',
    marginBottom: 8,
  },
  breakNotes: {
    fontStyle: 'italic',
    color: '#666',
    marginBottom: 16,
  },
  endBreakButton: {
    marginTop: 8,
  },
  cardTitle: {
    marginBottom: 4,
  },
  cardDescription: {
    color: '#666',
    marginBottom: 16,
  },
  startBreakButton: {
    marginTop: 8,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  breakHistory: {
    maxHeight: 300,
  },
  breakItem: {
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#2196f3',
  },
  breakItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  breakItemType: {
    fontWeight: '500',
  },
  breakItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  breakDuration: {
    fontWeight: 'bold',
  },
  syncChip: {
    height: 24,
  },
  breakTime: {
    color: '#666',
    marginBottom: 4,
  },
  breakItemNotes: {
    fontStyle: 'italic',
    color: '#666',
  },
  breakTypeList: {
    maxHeight: 300,
  },
  breakTypeItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  selectedBreakType: {
    marginBottom: 16,
    fontWeight: '500',
  },
  notesInput: {
    marginTop: 8,
  },
});