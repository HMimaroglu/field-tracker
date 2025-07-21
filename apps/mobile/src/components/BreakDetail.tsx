import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {
  Text,
  Card,
  Chip,
  List,
  Divider,
  useTheme,
} from 'react-native-paper';
import { useTimeTrackingStore } from '@/store/timeTracking';
import { BreakEntry } from '@/services/database';

interface BreakDetailProps {
  timeEntryOfflineGuid: string;
  style?: any;
}

export const BreakDetail: React.FC<BreakDetailProps> = ({ timeEntryOfflineGuid, style }) => {
  const theme = useTheme();
  const {
    breaks,
    breakTypes,
    loadBreaks,
    loadBreakTypes,
  } = useTimeTrackingStore();

  useEffect(() => {
    loadBreakTypes();
    loadBreaks(timeEntryOfflineGuid);
  }, [timeEntryOfflineGuid]);

  const getBreakTypeName = (breakTypeId: number): string => {
    const breakType = breakTypes.find(bt => bt.id === breakTypeId);
    return breakType?.name || 'Unknown';
  };

  const getBreakTypeInfo = (breakTypeId: number) => {
    const breakType = breakTypes.find(bt => bt.id === breakTypeId);
    return breakType ? {
      name: breakType.name,
      isPaid: breakType.isPaid,
      defaultMinutes: breakType.defaultMinutes,
    } : null;
  };

  const formatBreakDuration = (durationMinutes?: number) => {
    if (!durationMinutes) return 'In Progress';
    
    if (durationMinutes < 60) {
      return `${durationMinutes} minutes`;
    }
    
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours} hour${hours > 1 ? 's' : ''}`;
  };

  const formatBreakTime = (startTime: string, endTime?: string) => {
    const start = new Date(startTime);
    const startStr = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    if (!endTime) {
      return `Started at ${startStr}`;
    }
    
    const end = new Date(endTime);
    const endStr = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${startStr} - ${endStr}`;
  };

  const getTotalBreakTime = (): number => {
    return breaks.reduce((total, breakEntry) => {
      return total + (breakEntry.durationMinutes || 0);
    }, 0);
  };

  const getPaidBreakTime = (): number => {
    return breaks.reduce((total, breakEntry) => {
      const breakTypeInfo = getBreakTypeInfo(breakEntry.breakTypeId);
      if (breakTypeInfo?.isPaid) {
        return total + (breakEntry.durationMinutes || 0);
      }
      return total;
    }, 0);
  };

  const getUnpaidBreakTime = (): number => {
    return breaks.reduce((total, breakEntry) => {
      const breakTypeInfo = getBreakTypeInfo(breakEntry.breakTypeId);
      if (!breakTypeInfo?.isPaid) {
        return total + (breakEntry.durationMinutes || 0);
      }
      return total;
    }, 0);
  };

  if (breaks.length === 0) {
    return (
      <Card style={[styles.card, style]}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Break Summary
          </Text>
          <Text variant="bodyMedium" style={styles.emptyText}>
            No breaks taken for this time entry
          </Text>
        </Card.Content>
      </Card>
    );
  }

  const totalMinutes = getTotalBreakTime();
  const paidMinutes = getPaidBreakTime();
  const unpaidMinutes = getUnpaidBreakTime();

  return (
    <View style={[styles.container, style]}>
      {/* Break Summary */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Break Summary
          </Text>
          
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text variant="bodySmall" style={styles.summaryLabel}>Total Breaks</Text>
              <Text variant="titleMedium" style={styles.summaryValue}>{breaks.length}</Text>
            </View>
            
            <View style={styles.summaryItem}>
              <Text variant="bodySmall" style={styles.summaryLabel}>Total Time</Text>
              <Text variant="titleMedium" style={styles.summaryValue}>
                {formatBreakDuration(totalMinutes)}
              </Text>
            </View>
          </View>

          {(paidMinutes > 0 || unpaidMinutes > 0) && (
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text variant="bodySmall" style={[styles.summaryLabel, { color: theme.colors.primary }]}>
                  Paid Time
                </Text>
                <Text variant="titleSmall" style={[styles.summaryValue, { color: theme.colors.primary }]}>
                  {formatBreakDuration(paidMinutes)}
                </Text>
              </View>
              
              <View style={styles.summaryItem}>
                <Text variant="bodySmall" style={[styles.summaryLabel, { color: theme.colors.error }]}>
                  Unpaid Time
                </Text>
                <Text variant="titleSmall" style={[styles.summaryValue, { color: theme.colors.error }]}>
                  {formatBreakDuration(unpaidMinutes)}
                </Text>
              </View>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Break Details */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Break Details
          </Text>
          
          <ScrollView style={styles.breakList}>
            {breaks.map((breakEntry, index) => {
              const breakTypeInfo = getBreakTypeInfo(breakEntry.breakTypeId);
              
              return (
                <View key={breakEntry.id || index}>
                  <List.Item
                    title={getBreakTypeName(breakEntry.breakTypeId)}
                    description={formatBreakTime(breakEntry.startTime, breakEntry.endTime)}
                    left={(props) => (
                      <List.Icon 
                        {...props} 
                        icon={breakTypeInfo?.isPaid ? 'currency-usd' : 'clock-outline'}
                        color={breakTypeInfo?.isPaid ? theme.colors.primary : theme.colors.outline}
                      />
                    )}
                    right={() => (
                      <View style={styles.breakItemRight}>
                        <Text variant="bodyMedium" style={styles.breakDuration}>
                          {formatBreakDuration(breakEntry.durationMinutes)}
                        </Text>
                        <Chip
                          mode="outlined"
                          compact
                          style={[
                            styles.syncChip,
                            { 
                              backgroundColor: breakEntry.isSynced 
                                ? theme.colors.primaryContainer 
                                : theme.colors.errorContainer 
                            }
                          ]}
                        >
                          {breakEntry.isSynced ? 'Synced' : 'Pending'}
                        </Chip>
                      </View>
                    )}
                    style={styles.breakItem}
                  />
                  
                  {breakEntry.notes && (
                    <View style={styles.notesContainer}>
                      <Text variant="bodySmall" style={styles.notesLabel}>Notes:</Text>
                      <Text variant="bodySmall" style={styles.notesText}>
                        {breakEntry.notes}
                      </Text>
                    </View>
                  )}
                  
                  {index < breaks.length - 1 && <Divider style={styles.divider} />}
                </View>
              );
            })}
          </ScrollView>
        </Card.Content>
      </Card>
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
  sectionTitle: {
    marginBottom: 16,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryLabel: {
    color: '#666',
    marginBottom: 4,
  },
  summaryValue: {
    fontWeight: 'bold',
  },
  breakList: {
    maxHeight: 400,
  },
  breakItem: {
    paddingVertical: 8,
  },
  breakItemRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 4,
  },
  breakDuration: {
    fontWeight: '500',
  },
  syncChip: {
    height: 24,
  },
  notesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 4,
  },
  notesLabel: {
    fontWeight: '500',
    marginBottom: 4,
  },
  notesText: {
    color: '#666',
    fontStyle: 'italic',
  },
  divider: {
    marginVertical: 8,
  },
});