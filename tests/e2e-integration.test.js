const { test } = require('tap');
const fastify = require('../server/src/server');
const fetch = require('node-fetch');

let app;
let serverUrl;

test('setup', async (t) => {
  app = await fastify();
  await app.ready();
  await app.listen({ port: 0 });
  serverUrl = `http://localhost:${app.server.address().port}`;
  console.log(`Test server running at ${serverUrl}`);
});

test('Full offline-to-sync workflow', async (t) => {
  const headers = {
    'x-license-key': 'FT-TEST-LICENSE-2024-ABCD1234EFGH5678',
    'x-worker-pin': '1234',
    'content-type': 'application/json'
  };

  // Step 1: Create a worker
  const workerResponse = await fetch(`${serverUrl}/api/workers`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      employeeId: 'E2E001',
      name: 'E2E Test Worker',
      pin: '9999'
    })
  });

  t.equal(workerResponse.status, 201, 'Worker created successfully');
  const worker = await workerResponse.json();
  
  // Step 2: Create a job
  const jobResponse = await fetch(`${serverUrl}/api/jobs`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      jobCode: 'E2E-001',
      name: 'E2E Test Job',
      description: 'End-to-end test job'
    })
  });

  t.equal(jobResponse.status, 201, 'Job created successfully');
  const job = await jobResponse.json();

  // Step 3: Simulate mobile app creating offline time entries
  const offlineTimeEntries = [
    {
      offlineGuid: `te_offline_${Date.now()}_1`,
      workerId: worker.id,
      jobId: job.id,
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(), // 8 hours later
      regularHours: 8,
      overtimeHours: 0,
      notes: 'Offline entry 1 - completed work',
      startLatitude: 40.7128,
      startLongitude: -74.0060,
      endLatitude: 40.7589,
      endLongitude: -73.9851
    },
    {
      offlineGuid: `te_offline_${Date.now()}_2`,
      workerId: worker.id,
      jobId: job.id,
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Next day
      endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 7.5 * 60 * 60 * 1000).toISOString(), // 7.5 hours
      regularHours: 7.5,
      overtimeHours: 0,
      notes: 'Offline entry 2 - half day',
      startLatitude: 40.7831,
      startLongitude: -73.9712
    }
  ];

  // Step 4: Sync offline time entries to server
  const syncResponse = await fetch(`${serverUrl}/api/sync/time-entries`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      entries: offlineTimeEntries
    })
  });

  t.equal(syncResponse.status, 200, 'Time entries synced successfully');
  const syncResult = await syncResponse.json();
  t.ok(syncResult.success, 'Sync operation successful');
  t.equal(syncResult.processed, 2, 'Both entries processed');
  t.equal(syncResult.successful.length, 2, 'Both entries successful');

  // Step 5: Verify entries exist on server
  const entriesResponse = await fetch(`${serverUrl}/api/time-entries?workerId=${worker.id}`, {
    method: 'GET',
    headers
  });

  t.equal(entriesResponse.status, 200, 'Time entries retrieved successfully');
  const entries = await entriesResponse.json();
  t.equal(entries.length, 2, 'Both entries saved on server');

  // Verify entry details
  const entry1 = entries.find(e => e.offlineGuid === offlineTimeEntries[0].offlineGuid);
  t.ok(entry1, 'First entry found');
  t.equal(entry1.regularHours, 8, 'First entry hours correct');
  t.ok(entry1.startLatitude, 'Location data preserved');

  const entry2 = entries.find(e => e.offlineGuid === offlineTimeEntries[1].offlineGuid);
  t.ok(entry2, 'Second entry found');
  t.equal(entry2.regularHours, 7.5, 'Second entry hours correct');

  // Step 6: Simulate photo sync with base64 data
  const photoSyncResponse = await fetch(`${serverUrl}/api/photos/sync`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      photos: [
        {
          offlineGuid: `photo_${Date.now()}_1`,
          timeEntryId: entry1.id,
          fileName: 'job_photo_1.jpg',
          mimeType: 'image/jpeg',
          fileSize: 2456789,
          capturedAt: entry1.startTime,
          latitude: entry1.startLatitude,
          longitude: entry1.startLongitude,
          base64Data: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD//gA7Q1JFQVR...' // Truncated
        }
      ]
    })
  });

  t.equal(photoSyncResponse.status, 200, 'Photos synced successfully');
  const photoResult = await photoSyncResponse.json();
  t.ok(photoResult.success, 'Photo sync successful');
  t.equal(photoResult.successful, 1, 'One photo processed');

  // Step 7: Test reports generation
  const reportsResponse = await fetch(`${serverUrl}/api/reports/timesheet?startDate=2024-01-01&endDate=2024-12-31`, {
    method: 'GET',
    headers
  });

  t.equal(reportsResponse.status, 200, 'Reports generated successfully');
  const reportData = await reportsResponse.json();
  t.ok(Array.isArray(reportData), 'Report data is array');
  t.ok(reportData.length >= 2, 'Report includes our test entries');

  // Step 8: Test CSV export
  const csvResponse = await fetch(`${serverUrl}/api/reports/timesheet/csv?startDate=2024-01-01&endDate=2024-12-31&workerId=${worker.id}`, {
    method: 'GET',
    headers
  });

  t.equal(csvResponse.status, 200, 'CSV export successful');
  t.equal(csvResponse.headers.get('content-type'), 'text/csv; charset=utf-8', 'Correct CSV content type');
  
  const csvContent = await csvResponse.text();
  t.ok(csvContent.includes('Worker Name'), 'CSV contains headers');
  t.ok(csvContent.includes('E2E Test Worker'), 'CSV contains our worker');
  t.ok(csvContent.includes('E2E-001'), 'CSV contains our job');

  // Cleanup
  await fetch(`${serverUrl}/api/workers/${worker.id}`, {
    method: 'DELETE',
    headers
  });
  
  await fetch(`${serverUrl}/api/jobs/${job.id}`, {
    method: 'DELETE',
    headers
  });
});

test('Conflict resolution workflow', async (t) => {
  const headers = {
    'x-license-key': 'FT-TEST-LICENSE-2024-ABCD1234EFGH5678',
    'x-worker-pin': '1234',
    'content-type': 'application/json'
  };

  // Create worker and job
  const workerResponse = await fetch(`${serverUrl}/api/workers`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      employeeId: 'CONF001',
      name: 'Conflict Test Worker',
      pin: '8888'
    })
  });
  const worker = await workerResponse.json();

  const jobResponse = await fetch(`${serverUrl}/api/jobs`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      jobCode: 'CONF-001',
      name: 'Conflict Test Job',
      description: 'Job for testing conflicts'
    })
  });
  const job = await jobResponse.json();

  // Create initial time entry on server
  const initialEntry = {
    offlineGuid: `te_conflict_${Date.now()}`,
    workerId: worker.id,
    jobId: job.id,
    startTime: '2024-02-05T09:00:00Z',
    endTime: '2024-02-05T17:00:00Z',
    regularHours: 8,
    overtimeHours: 0,
    notes: 'Original server entry'
  };

  await fetch(`${serverUrl}/api/time-entries`, {
    method: 'POST',
    headers,
    body: JSON.stringify(initialEntry)
  });

  // Simulate mobile device trying to sync conflicting data
  const conflictingEntry = {
    ...initialEntry,
    endTime: '2024-02-05T17:30:00Z', // 30 minutes later
    regularHours: 8.5,
    notes: 'Modified offline entry'
  };

  const conflictSyncResponse = await fetch(`${serverUrl}/api/sync/time-entries`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      entries: [conflictingEntry]
    })
  });

  t.equal(conflictSyncResponse.status, 200, 'Conflict sync handled');
  const conflictResult = await conflictSyncResponse.json();
  
  // Check that conflict was detected and handled appropriately
  t.ok(conflictResult.conflicts || conflictResult.warnings, 'Conflict should be detected');
  
  // Cleanup
  await fetch(`${serverUrl}/api/workers/${worker.id}`, {
    method: 'DELETE',
    headers
  });
  
  await fetch(`${serverUrl}/api/jobs/${job.id}`, {
    method: 'DELETE',
    headers
  });
});

test('Bulk operations and stress testing', async (t) => {
  const headers = {
    'x-license-key': 'FT-TEST-LICENSE-2024-ABCD1234EFGH5678',
    'x-worker-pin': '1234',
    'content-type': 'application/json'
  };

  // Create multiple workers and jobs
  const workers = [];
  const jobs = [];

  for (let i = 1; i <= 5; i++) {
    const workerResponse = await fetch(`${serverUrl}/api/workers`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        employeeId: `BULK${i.toString().padStart(3, '0')}`,
        name: `Bulk Test Worker ${i}`,
        pin: `${1000 + i}`
      })
    });
    workers.push(await workerResponse.json());

    const jobResponse = await fetch(`${serverUrl}/api/jobs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jobCode: `BULK-${i.toString().padStart(3, '0')}`,
        name: `Bulk Test Job ${i}`,
        description: `Bulk test job number ${i}`
      })
    });
    jobs.push(await jobResponse.json());
  }

  t.equal(workers.length, 5, 'Created 5 workers');
  t.equal(jobs.length, 5, 'Created 5 jobs');

  // Create large batch of time entries
  const bulkTimeEntries = [];
  const now = new Date();

  for (let workerIndex = 0; workerIndex < workers.length; workerIndex++) {
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) { // 7 days of entries
      const startTime = new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000);
      startTime.setHours(8, 0, 0, 0);
      
      const endTime = new Date(startTime);
      endTime.setHours(16, 30, 0, 0);

      bulkTimeEntries.push({
        offlineGuid: `te_bulk_${workerIndex}_${dayOffset}_${Date.now()}`,
        workerId: workers[workerIndex].id,
        jobId: jobs[workerIndex % jobs.length].id, // Distribute jobs
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        regularHours: 8.5,
        overtimeHours: 0,
        notes: `Bulk entry day ${dayOffset + 1} for worker ${workerIndex + 1}`,
        startLatitude: 40.7128 + (Math.random() * 0.1),
        startLongitude: -74.0060 + (Math.random() * 0.1)
      });
    }
  }

  t.equal(bulkTimeEntries.length, 35, 'Created 35 time entries (5 workers × 7 days)');

  // Test bulk sync performance
  const startTime = Date.now();
  const bulkSyncResponse = await fetch(`${serverUrl}/api/sync/time-entries`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      entries: bulkTimeEntries
    })
  });
  const syncDuration = Date.now() - startTime;

  t.equal(bulkSyncResponse.status, 200, 'Bulk sync successful');
  const bulkResult = await bulkSyncResponse.json();
  t.ok(bulkResult.success, 'Bulk sync operation successful');
  t.equal(bulkResult.processed, 35, 'All entries processed');
  t.ok(syncDuration < 10000, 'Bulk sync completed in under 10 seconds');

  // Test reports with bulk data
  const bulkReportResponse = await fetch(`${serverUrl}/api/reports/timesheet?startDate=2024-01-01&endDate=2024-12-31`, {
    method: 'GET',
    headers
  });

  t.equal(bulkReportResponse.status, 200, 'Bulk report generation successful');
  const reportData = await bulkReportResponse.json();
  t.ok(reportData.length >= 35, 'Report includes all bulk entries');

  // Cleanup
  for (const worker of workers) {
    await fetch(`${serverUrl}/api/workers/${worker.id}`, {
      method: 'DELETE',
      headers
    });
  }
  
  for (const job of jobs) {
    await fetch(`${serverUrl}/api/jobs/${job.id}`, {
      method: 'DELETE',
      headers
    });
  }
});

test('Authentication and security validation', async (t) => {
  // Test without license key
  const noLicenseResponse = await fetch(`${serverUrl}/api/workers`, {
    method: 'GET'
  });
  t.equal(noLicenseResponse.status, 401, 'Rejected request without license');

  // Test with invalid license key
  const invalidLicenseResponse = await fetch(`${serverUrl}/api/workers`, {
    method: 'GET',
    headers: {
      'x-license-key': 'INVALID-LICENSE'
    }
  });
  t.equal(invalidLicenseResponse.status, 401, 'Rejected request with invalid license');

  // Test with valid license but no PIN
  const noPinResponse = await fetch(`${serverUrl}/api/workers`, {
    method: 'GET',
    headers: {
      'x-license-key': 'FT-TEST-LICENSE-2024-ABCD1234EFGH5678'
    }
  });
  t.equal(noPinResponse.status, 401, 'Rejected request without PIN');

  // Test with valid credentials
  const validResponse = await fetch(`${serverUrl}/api/workers`, {
    method: 'GET',
    headers: {
      'x-license-key': 'FT-TEST-LICENSE-2024-ABCD1234EFGH5678',
      'x-worker-pin': '1234'
    }
  });
  t.equal(validResponse.status, 200, 'Accepted request with valid credentials');
});

test('teardown', async (t) => {
  if (app) {
    await app.close();
  }
});