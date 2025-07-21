# Mobile App User Guide

## Overview

The Field Tracker mobile app is designed for field workers to track time, capture photos, and manage breaks even when offline. All data is stored locally and automatically synced when network connectivity is available.

## Getting Started

### Installation

#### Development (Expo Go)
1. Install Expo Go on your device:
   - [iOS App Store](https://apps.apple.com/app/expo-go/id982107779)
   - [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
2. Open Expo Go and scan the QR code provided by your administrator
3. The app will load and prompt for worker selection

#### Production (Standalone App)
1. Download and install the Field Tracker app from your organization's distribution method
2. Open the app and follow the setup process

### First Time Setup

#### 1. Worker Selection
- Select your name from the worker list
- If you don't see your name, contact your administrator

#### 2. PIN Entry  
- Enter your 4-digit PIN provided by your administrator
- The app will remember your selection for future use

#### 3. Server Configuration (if needed)
- Most users won't need to configure server settings
- If prompted, enter the server URL provided by your administrator

## Main Features

### Time Tracking

#### Starting a Job
1. **Select Job**: Tap a job from the available jobs list
2. **Location Permission**: Allow location access when prompted (optional but recommended)
3. **Start Timer**: Tap "Start Job" to begin time tracking
4. **GPS Capture**: The app automatically captures your GPS location when starting

#### Active Job Display
When a job is active, you'll see:
- **Timer**: Real-time elapsed time display
- **Job Information**: Job code, name, and description
- **Location**: Current GPS coordinates (if available)
- **Actions**: Options to take breaks, add photos, or end the job

#### Ending a Job
1. **End Job Button**: Tap "End Job" when work is complete
2. **End Location**: GPS location is automatically captured
3. **Notes**: Add any notes about the work completed
4. **Confirmation**: Confirm the job completion

### Photo Capture

#### Taking Photos
1. **During Active Job**: Tap the camera icon while a job is active
2. **Camera Access**: Allow camera permission when prompted
3. **Capture**: Take photos of work progress, before/after shots, etc.
4. **Review**: Review and confirm the photo before saving

#### Photo Features
- **Automatic Compression**: Photos are automatically compressed for faster sync
- **GPS Tagging**: Location data is embedded in photos (if location enabled)
- **Offline Storage**: Photos are stored locally and synced later
- **Multiple Photos**: Capture multiple photos per job

#### Photo Management
- **Gallery**: View all photos taken for a job
- **Sync Status**: See which photos have been synced to the server
- **Retry**: Manually retry failed photo uploads

### Break Management

#### Starting a Break
1. **Break Button**: Tap "Take Break" during an active job
2. **Break Type**: Select the type of break:
   - **Lunch Break** (usually unpaid)
   - **Coffee Break** (usually paid)
   - **Personal Break** (configurable)
   - **Other** (with custom notes)
3. **Notes**: Add optional notes about the break
4. **Start**: Confirm to start the break timer

#### During a Break
- **Timer Display**: See elapsed break time
- **Job Status**: Original job timer is paused
- **End Break**: Tap "End Break" when ready to resume work

#### Break History
- **View Breaks**: See all breaks taken during a job
- **Duration**: Total break time and individual break durations
- **Paid vs Unpaid**: Visual indication of paid and unpaid break time

### Offline Functionality

#### How Offline Works
The app is designed to work completely offline:
- **Local Database**: All data is stored in a local SQLite database
- **Sync Queue**: Changes are queued for synchronization when online
- **Full Functionality**: All features work without internet connection

#### Sync Process
1. **Automatic Sync**: App automatically syncs when network is available
2. **Background Sync**: Sync happens in the background while using the app
3. **Manual Sync**: Pull down to refresh to trigger manual sync
4. **Sync Status**: Visual indicators show sync progress and status

#### Sync Indicators
- **Green**: Item successfully synced
- **Orange**: Item queued for sync
- **Red**: Sync failed, will retry automatically
- **Gray**: Item modified locally, not yet queued

### Settings and Preferences

#### Accessing Settings
1. Tap the menu icon (three lines) in the top-left corner
2. Select "Settings" from the menu

#### Available Settings

##### Worker Information
- **Change Worker**: Switch to a different worker account
- **Update PIN**: Change your 4-digit PIN
- **Worker Details**: View your worker information

##### Location Settings
- **GPS Accuracy**: Choose between high accuracy and battery saving
- **Location Permission**: Manage location access permissions
- **Background Location**: Enable/disable background location (if supported)

##### Photo Settings
- **Photo Quality**: Adjust photo compression quality
- **Camera Settings**: Configure default camera settings
- **Storage Management**: View and manage photo storage usage

##### Sync Settings
- **Auto Sync**: Enable/disable automatic synchronization
- **Sync Frequency**: How often to attempt sync when online
- **WiFi Only**: Sync only when connected to WiFi
- **Sync Notifications**: Get notified when sync completes/fails

##### App Settings
- **Theme**: Light/dark theme preference
- **Notifications**: Enable/disable various app notifications
- **Language**: Select app language (if multiple languages supported)
- **Debug Mode**: Enable detailed logging (for troubleshooting)

## Usage Scenarios

### Typical Day Workflow

#### 1. Start of Day
```
Open App → Select Worker → Enter PIN → View Available Jobs
```

#### 2. First Job
```
Select Job → Start Job → Location Captured → Work Begins
```

#### 3. During Work
```
Take Photos → Add Notes → Take Breaks as Needed
```

#### 4. End of Job
```
End Job → Add Final Notes → Confirm Completion
```

#### 5. Next Job
```
Select Next Job → Repeat Process
```

#### 6. End of Day
```
Review Time Entries → Check Sync Status → Close App
```

### Offline Scenarios

#### No Internet at Job Site
1. **Normal Operation**: Continue working normally
2. **Data Storage**: All data stored locally
3. **Visual Feedback**: Orange sync indicators show pending sync
4. **No Limitations**: All features available offline

#### Coming Back Online
1. **Automatic Detection**: App detects network connectivity
2. **Background Sync**: Sync begins automatically in background
3. **Progress Indicators**: Visual feedback shows sync progress
4. **Completion**: Green indicators show successful sync

#### Extended Offline Period
- **Local Storage**: App can store days/weeks of data locally
- **Storage Monitoring**: Settings show local storage usage
- **No Data Loss**: All data preserved until sync is possible

### Multiple Device Scenarios

#### Switching Devices
1. **Same Account**: Log in with same worker credentials on new device
2. **Sync Download**: New device downloads existing data
3. **Conflict Resolution**: Server handles any data conflicts automatically

#### Team Coordination
- **Individual Tracking**: Each worker tracks their own time independently
- **Server Sync**: All data syncs to central server for admin visibility
- **No Interference**: Workers can't see each other's time entries

## Troubleshooting

### Common Issues

#### "Cannot connect to server"
**Possible Causes:**
- No internet connection
- Server maintenance
- Incorrect server URL

**Solutions:**
1. Check internet connection
2. Try connecting to WiFi
3. Contact administrator if problem persists
4. Continue working offline - data will sync later

#### "Invalid PIN"
**Possible Causes:**
- Incorrect PIN entered
- PIN changed by administrator
- Worker account deactivated

**Solutions:**
1. Try entering PIN again carefully
2. Contact administrator for PIN reset
3. Check if worker account is still active

#### "Job not found"
**Possible Causes:**
- Job was deactivated by administrator
- Data sync needed
- Local data corruption

**Solutions:**
1. Pull down to refresh job list
2. Check internet connection for sync
3. Contact administrator if job should be available

#### Photos not uploading
**Possible Causes:**
- Poor internet connection
- Photo file too large
- Server storage full

**Solutions:**
1. Connect to better WiFi network
2. Photos will retry automatically
3. Check sync status in settings
4. Contact administrator if issue persists

#### GPS location not working
**Possible Causes:**
- Location permission denied
- GPS disabled on device
- Poor GPS signal indoors

**Solutions:**
1. Check app location permissions in device settings
2. Enable GPS/location services on device
3. Step outside for better GPS signal
4. Location is optional - app still functions without it

### Performance Issues

#### App running slowly
**Solutions:**
1. Close and restart the app
2. Restart your device
3. Check available storage space
4. Update app to latest version

#### High battery usage
**Solutions:**
1. Disable background location if not needed
2. Reduce photo quality in settings
3. Use WiFi-only sync to reduce cellular usage
4. Close app when not actively working

#### Storage space warnings
**Solutions:**
1. Sync data to clear local storage
2. Delete old photos from device (after sync)
3. Reduce photo quality settings
4. Contact administrator for storage management

### Data Issues

#### Missing time entries
**Possible Causes:**
- Entry not yet synced
- Sync failed
- Entry deleted accidentally

**Solutions:**
1. Check sync status - look for orange indicators
2. Pull down to refresh to trigger sync
3. Check with administrator if entry should exist
4. Contact support if data appears lost

#### Duplicate entries
**Possible Causes:**
- Network interruption during sync
- Multiple attempts to sync same data

**Solutions:**
1. Usually resolves automatically
2. Server deduplicates based on offline GUIDs
3. Contact administrator if duplicates persist

#### Time calculations incorrect
**Possible Causes:**
- Break time not properly calculated
- Time zone issues
- Device clock incorrect

**Solutions:**
1. Check device date/time settings
2. Verify break entries are correct
3. Contact administrator for time entry review

## Best Practices

### Accurate Time Tracking
1. **Start Promptly**: Start job timer when work actually begins
2. **End Properly**: Don't forget to end jobs when work is complete
3. **Break Management**: Record all breaks accurately for payroll
4. **Notes**: Add meaningful notes to help with job documentation

### Photo Documentation
1. **Before and After**: Take photos before starting and after completing work
2. **Clear Images**: Ensure photos are clear and well-lit
3. **Multiple Angles**: Capture different perspectives of the work area
4. **Safety**: Follow all safety protocols when taking photos

### Battery Management
1. **Charge Overnight**: Start each day with full battery
2. **Power Bank**: Carry backup power for long days
3. **Background Apps**: Close unused apps to save battery
4. **Airplane Mode**: Use airplane mode in areas with poor signal to save battery

### Data Management
1. **Regular Sync**: Connect to WiFi regularly to sync data
2. **Monitor Storage**: Check storage usage in settings periodically
3. **Backup Important**: Ensure critical data is synced before device changes
4. **Update App**: Keep app updated to latest version

## Support

### Getting Help
1. **In-App Help**: Tap menu → Help for quick answers
2. **Administrator**: Contact your company administrator first
3. **Technical Support**: Use contact information provided by administrator

### Reporting Issues
When reporting issues, include:
1. **Device Information**: Phone model and operating system version
2. **App Version**: Found in Settings → About
3. **Issue Description**: Detailed description of the problem
4. **Steps to Reproduce**: What actions led to the issue
5. **Screenshots**: Visual evidence of the problem (if applicable)

### Training Resources
- **Video Tutorials**: Available in app or from administrator
- **User Manual**: This guide and additional documentation
- **Team Training**: Group training sessions available from administrator