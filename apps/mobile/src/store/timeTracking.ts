import { create } from 'zustand';
import { databaseService, TimeEntry, BreakEntry, Job, BreakType } from '@/services/database';
import { syncService } from '@/services/sync';
import { generateOfflineId, getDurationHours, calculateHours } from '@field-tracker/shared-utils';
import * as Location from 'expo-location';

interface ActiveTimeEntry {
  offlineGuid: string;
  workerId: number;
  jobId: number;
  job: Job;
  startTime: Date;
  startLatitude?: number;
  startLongitude?: number;
  notes?: string;
}

interface ActiveBreak {
  offlineGuid: string;
  timeEntryOfflineGuid: string;
  breakTypeId: number;
  startTime: Date;
  notes?: string;
}

interface TimeTrackingState {
  // Current tracking state
  activeTimeEntry: ActiveTimeEntry | null;
  activeBreak: ActiveBreak | null;
  isTracking: boolean;
  isOnBreak: boolean;

  // Data
  recentEntries: TimeEntry[];
  jobs: Job[];
  breakTypes: BreakType[];
  breaks: BreakEntry[];

  // Loading states
  isLoading: boolean;
  error: string | null;

  // Actions
  startJob: (jobId: number, notes?: string) => Promise<void>;
  endJob: (notes?: string) => Promise<void>;
  startBreak: (breakTypeId: number, notes?: string) => Promise<void>;
  endBreak: () => Promise<void>;
  loadRecentEntries: (workerId: number) => Promise<void>;
  loadJobs: () => Promise<void>;
  loadBreakTypes: () => Promise<void>;
  loadBreaks: (timeEntryOfflineGuid?: string) => Promise<void>;
  refreshData: (workerId: number) => Promise<void>;
  clearError: () => void;
}

export const useTimeTrackingStore = create<TimeTrackingState>((set, get) => ({
  // Initial state
  activeTimeEntry: null,
  activeBreak: null,
  isTracking: false,
  isOnBreak: false,
  recentEntries: [],
  jobs: [],
  breakTypes: [],
  breaks: [],
  isLoading: false,
  error: null,

  // Actions
  startJob: async (jobId: number, notes?: string) => {
    set({ isLoading: true, error: null });

    try {
      const { jobs, activeTimeEntry } = get();

      // Prevent starting a new job if one is already active
      if (activeTimeEntry) {
        throw new Error('Please end the current job before starting a new one');
      }

      const job = jobs.find(j => j.id === jobId);
      if (!job) {
        throw new Error('Job not found');
      }

      // Get current location if permissions allow
      let location: Location.LocationObject | null = null;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
        }
      } catch (locationError) {
        console.warn('Could not get location:', locationError);
      }

      const now = new Date();
      const offlineGuid = generateOfflineId();

      // Create active time entry in memory
      const newActiveEntry: ActiveTimeEntry = {
        offlineGuid,
        workerId: 1, // This should come from auth store
        jobId,
        job,
        startTime: now,
        startLatitude: location?.coords.latitude,
        startLongitude: location?.coords.longitude,
        notes,
      };

      set({
        activeTimeEntry: newActiveEntry,
        isTracking: true,
        isLoading: false,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start job';
      set({
        isLoading: false,
        error: errorMessage,
      });
      throw error;
    }
  },

  endJob: async (notes?: string) => {
    set({ isLoading: true, error: null });

    try {
      const { activeTimeEntry, activeBreak } = get();

      if (!activeTimeEntry) {
        throw new Error('No active job to end');
      }

      // End any active break first
      if (activeBreak) {
        await get().endBreak();
      }

      // Get end location if permissions allow
      let endLocation: Location.LocationObject | null = null;
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          endLocation = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
        }
      } catch (locationError) {
        console.warn('Could not get end location:', locationError);
      }

      const now = new Date();
      const endTime = now.toISOString();

      // Calculate hours
      const totalHours = getDurationHours(activeTimeEntry.startTime, now);
      const { regularHours, overtimeHours } = calculateHours(
        activeTimeEntry.startTime,
        now,
        8 // TODO: Get from settings
      );

      // Create time entry in database
      const timeEntry: Omit<TimeEntry, 'id' | 'createdAt' | 'updatedAt'> = {
        offlineGuid: activeTimeEntry.offlineGuid,
        workerId: activeTimeEntry.workerId,
        jobId: activeTimeEntry.jobId,
        startTime: activeTimeEntry.startTime.toISOString(),
        endTime,
        startLatitude: activeTimeEntry.startLatitude,
        startLongitude: activeTimeEntry.startLongitude,
        endLatitude: endLocation?.coords.latitude,
        endLongitude: endLocation?.coords.longitude,
        notes: notes || activeTimeEntry.notes,
        regularHours,
        overtimeHours,
        isSynced: false,
        hasConflict: false,
      };

      const createdEntry = await databaseService.createTimeEntry(timeEntry);

      // Add to sync queue
      try {
        await syncService.addToQueue('time_entry', timeEntry.offlineGuid, {
          ...timeEntry,
          id: createdEntry.id,
        });
      } catch (syncError) {
        console.warn('Failed to add time entry to sync queue:', syncError);
        // Don't fail the job end operation if sync queue fails
      }

      // Update state
      set({
        activeTimeEntry: null,
        isTracking: false,
        isLoading: false,
      });

      // Refresh recent entries
      await get().loadRecentEntries(activeTimeEntry.workerId);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to end job';
      set({
        isLoading: false,
        error: errorMessage,
      });
      throw error;
    }
  },

  startBreak: async (breakTypeId: number, notes?: string) => {
    set({ error: null });

    try {
      const { activeTimeEntry } = get();

      if (!activeTimeEntry) {
        throw new Error('No active job to take a break from');
      }

      const now = new Date();
      const offlineGuid = generateOfflineId();

      const newActiveBreak: ActiveBreak = {
        offlineGuid,
        timeEntryOfflineGuid: activeTimeEntry.offlineGuid,
        breakTypeId,
        startTime: now,
        notes,
      };

      set({
        activeBreak: newActiveBreak,
        isOnBreak: true,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start break';
      set({ error: errorMessage });
      throw error;
    }
  },

  endBreak: async () => {
    set({ error: null });

    try {
      const { activeBreak } = get();

      if (!activeBreak) {
        throw new Error('No active break to end');
      }

      const now = new Date();
      const durationMinutes = Math.round(
        (now.getTime() - activeBreak.startTime.getTime()) / (1000 * 60)
      );

      // Create break entry in database
      const breakEntry: Omit<BreakEntry, 'id' | 'createdAt' | 'updatedAt'> = {
        offlineGuid: activeBreak.offlineGuid,
        timeEntryOfflineGuid: activeBreak.timeEntryOfflineGuid,
        breakTypeId: activeBreak.breakTypeId,
        startTime: activeBreak.startTime.toISOString(),
        endTime: now.toISOString(),
        durationMinutes,
        notes: activeBreak.notes,
        isSynced: false,
      };

      // Create break entry in database
      const createdBreak = await databaseService.createBreakEntry(breakEntry);

      // Add to sync queue
      try {
        await syncService.addToQueue('break_entry', breakEntry.offlineGuid, {
          ...breakEntry,
          id: createdBreak.id,
        });
      } catch (syncError) {
        console.warn('Failed to add break entry to sync queue:', syncError);
        // Don't fail the break end operation if sync queue fails
      }

      set({
        activeBreak: null,
        isOnBreak: false,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to end break';
      set({ error: errorMessage });
      throw error;
    }
  },

  loadRecentEntries: async (workerId: number) => {
    set({ isLoading: true, error: null });

    try {
      const entries = await databaseService.getTimeEntries(workerId, 20);
      set({
        recentEntries: entries,
        isLoading: false,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load recent entries';
      set({
        isLoading: false,
        error: errorMessage,
      });
    }
  },

  loadJobs: async () => {
    set({ isLoading: true, error: null });

    try {
      const jobs = await databaseService.getJobs();
      set({
        jobs,
        isLoading: false,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load jobs';
      set({
        isLoading: false,
        error: errorMessage,
      });
    }
  },

  loadBreakTypes: async () => {
    set({ isLoading: true, error: null });

    try {
      const breakTypes = await databaseService.getBreakTypes();
      set({
        breakTypes,
        isLoading: false,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load break types';
      set({
        isLoading: false,
        error: errorMessage,
      });
    }
  },

  loadBreaks: async (timeEntryOfflineGuid?: string) => {
    set({ isLoading: true, error: null });

    try {
      const breaks = await databaseService.getBreakEntries(timeEntryOfflineGuid);
      set({
        breaks,
        isLoading: false,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load breaks';
      set({
        isLoading: false,
        error: errorMessage,
      });
    }
  },

  refreshData: async (workerId: number) => {
    const { loadRecentEntries, loadJobs, loadBreakTypes } = get();
    await Promise.all([
      loadRecentEntries(workerId),
      loadJobs(),
      loadBreakTypes(),
    ]);
  },

  clearError: () => {
    set({ error: null });
  },
}));