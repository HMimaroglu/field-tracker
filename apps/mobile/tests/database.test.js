const { test } = require('tap');
const Database = require('../src/services/database');

let db;

test('setup', async (t) => {
  db = new Database();
  await db.init();
});

test('Database initialization', async (t) => {
  // Test tables exist
  const tables = await db.runAsync(
    `SELECT name FROM sqlite_master WHERE type='table'`
  );
  
  const tableNames = tables.map(row => row.name);
  t.ok(tableNames.includes('workers'), 'workers table exists');
  t.ok(tableNames.includes('jobs'), 'jobs table exists');
  t.ok(tableNames.includes('time_entries'), 'time_entries table exists');
  t.ok(tableNames.includes('photos'), 'photos table exists');
  t.ok(tableNames.includes('break_entries'), 'break_entries table exists');
  t.ok(tableNames.includes('sync_queue'), 'sync_queue table exists');
});

test('Workers CRUD operations', async (t) => {
  // Create worker
  const workerId = await db.createWorker({
    employeeId: 'TEST001',
    name: 'Test Worker',
    pin: '1234',
    serverId: null
  });

  t.ok(workerId, 'worker created');

  // Get worker
  const worker = await db.getWorker(workerId);
  t.equal(worker.employeeId, 'TEST001');
  t.equal(worker.name, 'Test Worker');
  t.equal(worker.pin, '1234');

  // Update worker
  await db.updateWorker(workerId, { name: 'Updated Worker' });
  const updatedWorker = await db.getWorker(workerId);
  t.equal(updatedWorker.name, 'Updated Worker');

  // Get all workers
  const workers = await db.getAllWorkers();
  t.ok(workers.length > 0);

  // Delete worker
  await db.deleteWorker(workerId);
  const deletedWorker = await db.getWorker(workerId);
  t.equal(deletedWorker, null);
});

test('Jobs CRUD operations', async (t) => {
  // Create job
  const jobId = await db.createJob({
    jobCode: 'TEST-001',
    name: 'Test Job',
    description: 'Test job description',
    serverId: null
  });

  t.ok(jobId, 'job created');

  // Get job
  const job = await db.getJob(jobId);
  t.equal(job.jobCode, 'TEST-001');
  t.equal(job.name, 'Test Job');
  t.equal(job.description, 'Test job description');

  // Update job
  await db.updateJob(jobId, { name: 'Updated Job' });
  const updatedJob = await db.getJob(jobId);
  t.equal(updatedJob.name, 'Updated Job');

  // Get all jobs
  const jobs = await db.getAllJobs();
  t.ok(jobs.length > 0);

  // Delete job
  await db.deleteJob(jobId);
  const deletedJob = await db.getJob(jobId);
  t.equal(deletedJob, null);
});

test('Time Entries CRUD operations', async (t) => {
  // First create worker and job
  const workerId = await db.createWorker({
    employeeId: 'EMP001',
    name: 'Test Worker',
    pin: '1234'
  });

  const jobId = await db.createJob({
    jobCode: 'JOB-001',
    name: 'Test Job',
    description: 'Test job'
  });

  // Create time entry
  const timeEntryId = await db.createTimeEntry({
    offlineGuid: 'te_test_123',
    workerId,
    jobId,
    startTime: new Date().toISOString(),
    startLatitude: 40.7128,
    startLongitude: -74.0060
  });

  t.ok(timeEntryId, 'time entry created');

  // Get time entry
  const timeEntry = await db.getTimeEntry(timeEntryId);
  t.equal(timeEntry.offlineGuid, 'te_test_123');
  t.equal(timeEntry.workerId, workerId);
  t.equal(timeEntry.jobId, jobId);

  // Update time entry (end it)
  const endTime = new Date();
  await db.updateTimeEntry(timeEntryId, {
    endTime: endTime.toISOString(),
    endLatitude: 40.7589,
    endLongitude: -73.9851,
    regularHours: 8
  });

  const updatedTimeEntry = await db.getTimeEntry(timeEntryId);
  t.ok(updatedTimeEntry.endTime);
  t.equal(updatedTimeEntry.regularHours, 8);

  // Get active time entries (should be none now)
  const activeEntries = await db.getActiveTimeEntries();
  t.equal(activeEntries.length, 0);

  // Get time entries for worker
  const workerEntries = await db.getTimeEntriesForWorker(workerId);
  t.equal(workerEntries.length, 1);

  // Delete time entry
  await db.deleteTimeEntry(timeEntryId);
  const deletedEntry = await db.getTimeEntry(timeEntryId);
  t.equal(deletedEntry, null);

  // Cleanup
  await db.deleteWorker(workerId);
  await db.deleteJob(jobId);
});

test('Photo operations', async (t) => {
  // Create photo
  const photoId = await db.createPhoto({
    offlineGuid: 'photo_test_123',
    fileName: 'test_photo.jpg',
    filePath: '/path/to/photo.jpg',
    mimeType: 'image/jpeg',
    fileSize: 1024000,
    capturedAt: new Date().toISOString(),
    latitude: 40.7128,
    longitude: -74.0060,
    timeEntryId: null
  });

  t.ok(photoId, 'photo created');

  // Get photo
  const photo = await db.getPhoto(photoId);
  t.equal(photo.offlineGuid, 'photo_test_123');
  t.equal(photo.fileName, 'test_photo.jpg');

  // Update photo
  await db.updatePhoto(photoId, { notes: 'Test photo notes' });
  const updatedPhoto = await db.getPhoto(photoId);
  t.equal(updatedPhoto.notes, 'Test photo notes');

  // Get all photos
  const photos = await db.getAllPhotos();
  t.ok(photos.length > 0);

  // Delete photo
  await db.deletePhoto(photoId);
  const deletedPhoto = await db.getPhoto(photoId);
  t.equal(deletedPhoto, null);
});

test('Break Entries operations', async (t) => {
  // First create worker and job
  const workerId = await db.createWorker({
    employeeId: 'EMP002',
    name: 'Break Test Worker',
    pin: '5678'
  });

  const jobId = await db.createJob({
    jobCode: 'JOB-002',
    name: 'Break Test Job',
    description: 'Test job for breaks'
  });

  const timeEntryId = await db.createTimeEntry({
    offlineGuid: 'te_break_test_123',
    workerId,
    jobId,
    startTime: new Date().toISOString()
  });

  // Create break entry
  const breakId = await db.createBreakEntry({
    offlineGuid: 'break_test_123',
    timeEntryId,
    breakTypeId: 1, // Default lunch break
    startTime: new Date().toISOString(),
    notes: 'Lunch break'
  });

  t.ok(breakId, 'break entry created');

  // Get break entry
  const breakEntry = await db.getBreakEntry(breakId);
  t.equal(breakEntry.offlineGuid, 'break_test_123');
  t.equal(breakEntry.timeEntryId, timeEntryId);
  t.equal(breakEntry.notes, 'Lunch break');

  // Update break entry (end it)
  const endTime = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes later
  await db.updateBreakEntry(breakId, {
    endTime: endTime.toISOString(),
    durationMinutes: 30
  });

  const updatedBreak = await db.getBreakEntry(breakId);
  t.ok(updatedBreak.endTime);
  t.equal(updatedBreak.durationMinutes, 30);

  // Get breaks for time entry
  const timeEntryBreaks = await db.getBreakEntriesForTimeEntry(timeEntryId);
  t.equal(timeEntryBreaks.length, 1);

  // Get active breaks (should be none)
  const activeBreaks = await db.getActiveBreakEntries();
  t.equal(activeBreaks.length, 0);

  // Cleanup
  await db.deleteBreakEntry(breakId);
  await db.deleteTimeEntry(timeEntryId);
  await db.deleteWorker(workerId);
  await db.deleteJob(jobId);
});

test('Sync Queue operations', async (t) => {
  // Add item to sync queue
  await db.addToSyncQueue('time_entry', 'te_sync_test_123', {
    workerId: 1,
    jobId: 1,
    startTime: new Date().toISOString()
  });

  // Get pending sync items
  const pendingItems = await db.getPendingSyncItems();
  t.ok(pendingItems.length > 0);
  
  const testItem = pendingItems.find(item => item.entity_guid === 'te_sync_test_123');
  t.ok(testItem, 'sync item found');
  t.equal(testItem.type, 'time_entry');

  // Update sync item
  await db.updateSyncQueueItem(testItem.id, {
    retry_count: 1,
    last_error: 'Network timeout'
  });

  const updatedItem = await db.getSyncQueueItem(testItem.id);
  t.equal(updatedItem.retry_count, 1);
  t.equal(updatedItem.last_error, 'Network timeout');

  // Remove sync item
  await db.removeSyncQueueItem(testItem.id);
  const removedItem = await db.getSyncQueueItem(testItem.id);
  t.equal(removedItem, null);
});

test('Offline GUID generation', async (t) => {
  const guid1 = db.generateOfflineGuid('te');
  const guid2 = db.generateOfflineGuid('te');
  
  t.ok(guid1.startsWith('te_'));
  t.ok(guid2.startsWith('te_'));
  t.not(guid1, guid2, 'GUIDs should be unique');
  
  const photoGuid = db.generateOfflineGuid('photo');
  t.ok(photoGuid.startsWith('photo_'));
});

test('Data cleanup and constraints', async (t) => {
  // Test foreign key constraints
  const workerId = await db.createWorker({
    employeeId: 'CONSTRAINT_TEST',
    name: 'Constraint Test',
    pin: '9999'
  });

  const jobId = await db.createJob({
    jobCode: 'CONSTRAINT-001',
    name: 'Constraint Job',
    description: 'Test constraints'
  });

  const timeEntryId = await db.createTimeEntry({
    offlineGuid: 'te_constraint_test',
    workerId,
    jobId,
    startTime: new Date().toISOString()
  });

  // Try to delete worker with active time entry (should handle gracefully)
  try {
    await db.deleteWorker(workerId);
    t.fail('Should not allow deleting worker with active time entries');
  } catch (error) {
    t.pass('Correctly prevented deletion of worker with active time entries');
  }

  // Clean up properly
  await db.deleteTimeEntry(timeEntryId);
  await db.deleteWorker(workerId);
  await db.deleteJob(jobId);
});

test('teardown', async (t) => {
  if (db && db.close) {
    await db.close();
  }
});