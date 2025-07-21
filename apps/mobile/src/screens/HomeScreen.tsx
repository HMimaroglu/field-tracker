import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  FAB,
  Chip,
  Surface,
  useTheme,
  Menu,
  IconButton,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useAuthStore } from '@/store/auth';
import { useTimeTrackingStore } from '@/store/timeTracking';
import { formatDuration } from '@field-tracker/shared-utils';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const theme = useTheme();
  const { user, logout } = useAuthStore();
  const {
    activeTimeEntry,
    activeBreak,
    isTracking,
    isOnBreak,
    recentEntries,
    jobs,
    isLoading,
    error,
    refreshData,
    clearError,
  } = useTimeTrackingStore();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [menuVisible, setMenuVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Update current time every second when tracking
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isTracking) {
      interval = setInterval(() => {
        setCurrentTime(new Date());
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTracking]);

  // Load data on mount
  useEffect(() => {
    if (user) {
      refreshData(user.workerId);
    }
  }, [user]);

  // Handle errors
  useEffect(() => {
    if (error) {
      Alert.alert('Error', error, [
        { text: 'OK', onPress: clearError },
      ]);
    }
  }, [error, clearError]);

  const handleRefresh = async () => {
    if (user) {
      setRefreshing(true);
      await refreshData(user.workerId);
      setRefreshing(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout },
      ]
    );
  };

  const getCurrentDuration = () => {
    if (!activeTimeEntry) return '00:00:00';
    
    const start = activeTimeEntry.startTime;
    const duration = Math.floor((currentTime.getTime() - start.getTime()) / 1000);
    
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const seconds = duration % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getBreakDuration = () => {
    if (!activeBreak) return '00:00';
    
    const start = activeBreak.startTime;
    const duration = Math.floor((currentTime.getTime() - start.getTime()) / 1000);
    
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!user) {
    return null; // Should not happen due to navigation guard
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text variant="headlineSmall">Welcome back,</Text>
          <Text variant="titleLarge" style={styles.userName}>
            {user.name}
          </Text>
        </View>
        
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <IconButton
              icon="menu"
              onPress={() => setMenuVisible(true)}
            />
          }
        >
          <Menu.Item
            onPress={handleLogout}
            title="Logout"
            leadingIcon="logout"
          />
        </Menu>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Active Time Entry Card */}
        {isTracking && activeTimeEntry ? (
          <Card style={[styles.card, styles.activeCard]}>
            <Card.Content>
              <View style={styles.activeHeader}>
                <Chip mode="flat" style={styles.statusChip}>
                  {isOnBreak ? 'On Break' : 'Working'}
                </Chip>
                <Text variant="headlineMedium" style={styles.timer}>
                  {getCurrentDuration()}
                </Text>
              </View>
              
              <Text variant="titleMedium" style={styles.jobName}>
                {activeTimeEntry.job.name}
              </Text>
              
              <Text variant="bodyMedium" style={styles.jobCode}>
                {activeTimeEntry.job.jobCode}
              </Text>
              
              <Text variant="bodySmall" style={styles.startTime}>
                Started at {activeTimeEntry.startTime.toLocaleTimeString()}
              </Text>
              
              {isOnBreak && activeBreak && (
                <Surface style={styles.breakSurface}>
                  <Text variant="bodyMedium">
                    Break: {getBreakDuration()}
                  </Text>
                </Surface>
              )}
            </Card.Content>
          </Card>
        ) : (
          /* Start Job Prompt */
          <Card style={styles.card}>
            <Card.Content style={styles.promptContent}>
              <Text variant="titleMedium" style={styles.promptTitle}>
                Ready to start working?
              </Text>
              <Text variant="bodyMedium" style={styles.promptText}>
                Select a job to begin time tracking
              </Text>
            </Card.Content>
          </Card>
        )}

        {/* Recent Entries */}
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Recent Entries
        </Text>
        
        {recentEntries.length > 0 ? (
          recentEntries.slice(0, 5).map((entry) => {
            const job = jobs.find(j => j.id === entry.jobId);
            const duration = entry.endTime
              ? formatDuration(
                  Math.floor(
                    (new Date(entry.endTime).getTime() - new Date(entry.startTime).getTime()) / (1000 * 60)
                  )
                )
              : 'In Progress';

            return (
              <TouchableOpacity 
                key={entry.id}
                onPress={() => navigation.navigate('TimeEntryDetail', { timeEntryId: entry.id! })}
              >
                <Card style={styles.entryCard}>
                  <Card.Content>
                    <View style={styles.entryHeader}>
                      <Text variant="titleSmall">
                        {job?.name || 'Unknown Job'}
                      </Text>
                      <Text variant="bodySmall" style={styles.duration}>
                        {duration}
                      </Text>
                    </View>
                    
                    <Text variant="bodySmall" style={styles.entryDate}>
                      {new Date(entry.startTime).toLocaleDateString()} • {new Date(entry.startTime).toLocaleTimeString()}
                    </Text>
                    
                    {entry.notes && (
                      <Text variant="bodySmall" style={styles.notes}>
                        {entry.notes}
                      </Text>
                    )}
                    
                    <View style={styles.entryFooter}>
                      <Chip
                        mode="outlined"
                        compact
                        style={[
                          styles.syncChip,
                          { backgroundColor: entry.isSynced ? theme.colors.primaryContainer : theme.colors.errorContainer }
                        ]}
                      >
                        {entry.isSynced ? 'Synced' : 'Pending'}
                      </Chip>
                      
                      <Text variant="bodySmall" style={styles.tapHint}>
                        Tap for details
                      </Text>
                    </View>
                  </Card.Content>
                </Card>
              </TouchableOpacity>
            );
          })
        ) : (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="bodyMedium" style={styles.emptyText}>
                No recent time entries
              </Text>
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <FAB
        icon={isTracking ? 'stop' : 'play'}
        label={isTracking ? 'End Job' : 'Start Job'}
        style={styles.fab}
        onPress={() => {
          // Navigation to JobSelection or EndJob screen would go here
          Alert.alert('Feature Coming Soon', 'Job selection and time tracking interface will be implemented next.');
        }}
      />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  userName: {
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  activeCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  activeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusChip: {
    backgroundColor: '#E8F5E8',
  },
  timer: {
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  jobName: {
    marginBottom: 4,
  },
  jobCode: {
    color: '#666',
    marginBottom: 8,
  },
  startTime: {
    color: '#666',
  },
  breakSurface: {
    padding: 12,
    marginTop: 12,
    borderRadius: 8,
    backgroundColor: '#FFF3E0',
  },
  promptContent: {
    alignItems: 'center',
    padding: 24,
  },
  promptTitle: {
    marginBottom: 8,
    textAlign: 'center',
  },
  promptText: {
    textAlign: 'center',
    opacity: 0.7,
  },
  sectionTitle: {
    marginBottom: 12,
    marginTop: 8,
  },
  entryCard: {
    marginBottom: 8,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  duration: {
    fontWeight: 'bold',
  },
  entryDate: {
    color: '#666',
    marginBottom: 8,
  },
  notes: {
    fontStyle: 'italic',
    marginBottom: 8,
  },
  entryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tapHint: {
    color: '#666',
    fontSize: 12,
  },
  syncChip: {
    height: 24,
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.7,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});