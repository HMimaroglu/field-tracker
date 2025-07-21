const { test } = require('tap');
const fastify = require('../src/server');

let app;

test('setup', async (t) => {
  app = await fastify();
  await app.ready();
});

test('Health check endpoint', async (t) => {
  const response = await app.inject({
    method: 'GET',
    url: '/health'
  });

  t.equal(response.statusCode, 200);
  const payload = JSON.parse(response.payload);
  t.equal(payload.status, 'healthy');
  t.ok(payload.timestamp);
  t.ok(payload.version);
});

test('License validation middleware', async (t) => {
  // Test without license key
  const responseNoKey = await app.inject({
    method: 'GET',
    url: '/api/workers'
  });

  t.equal(responseNoKey.statusCode, 401);
  
  // Test with invalid license key
  const responseInvalidKey = await app.inject({
    method: 'GET',
    url: '/api/workers',
    headers: {
      'x-license-key': 'invalid-key'
    }
  });

  t.equal(responseInvalidKey.statusCode, 401);
});

test('PIN authentication', async (t) => {
  // Test with valid license but no PIN
  const responseNoPIN = await app.inject({
    method: 'GET',
    url: '/api/workers',
    headers: {
      'x-license-key': 'FT-TEST-LICENSE-2024-ABCD1234EFGH5678',
      'x-worker-pin': ''
    }
  });

  t.equal(responseNoPIN.statusCode, 401);

  // Test with valid license and PIN
  const responseValid = await app.inject({
    method: 'GET',
    url: '/api/workers',
    headers: {
      'x-license-key': 'FT-TEST-LICENSE-2024-ABCD1234EFGH5678',
      'x-worker-pin': '1234'
    }
  });

  t.equal(responseValid.statusCode, 200);
});

test('Workers API', async (t) => {
  const headers = {
    'x-license-key': 'FT-TEST-LICENSE-2024-ABCD1234EFGH5678',
    'x-worker-pin': '1234'
  };

  // GET workers
  const getResponse = await app.inject({
    method: 'GET',
    url: '/api/workers',
    headers
  });

  t.equal(getResponse.statusCode, 200);
  const workers = JSON.parse(getResponse.payload);
  t.ok(Array.isArray(workers));

  // POST new worker
  const postResponse = await app.inject({
    method: 'POST',
    url: '/api/workers',
    headers: {
      ...headers,
      'content-type': 'application/json'
    },
    payload: JSON.stringify({
      employeeId: 'TEST001',
      name: 'Test Worker',
      pin: '9876'
    })
  });

  t.equal(postResponse.statusCode, 201);
  const newWorker = JSON.parse(postResponse.payload);
  t.equal(newWorker.employeeId, 'TEST001');
  t.equal(newWorker.name, 'Test Worker');

  // GET specific worker
  const getWorkerResponse = await app.inject({
    method: 'GET',
    url: `/api/workers/${newWorker.id}`,
    headers
  });

  t.equal(getWorkerResponse.statusCode, 200);
  const worker = JSON.parse(getWorkerResponse.payload);
  t.equal(worker.id, newWorker.id);

  // PUT update worker
  const putResponse = await app.inject({
    method: 'PUT',
    url: `/api/workers/${newWorker.id}`,
    headers: {
      ...headers,
      'content-type': 'application/json'
    },
    payload: JSON.stringify({
      name: 'Updated Test Worker',
      isActive: true
    })
  });

  t.equal(putResponse.statusCode, 200);
  const updatedWorker = JSON.parse(putResponse.payload);
  t.equal(updatedWorker.name, 'Updated Test Worker');

  // DELETE worker
  const deleteResponse = await app.inject({
    method: 'DELETE',
    url: `/api/workers/${newWorker.id}`,
    headers
  });

  t.equal(deleteResponse.statusCode, 204);
});

test('Jobs API', async (t) => {
  const headers = {
    'x-license-key': 'FT-TEST-LICENSE-2024-ABCD1234EFGH5678',
    'x-worker-pin': '1234'
  };

  // GET jobs
  const getResponse = await app.inject({
    method: 'GET',
    url: '/api/jobs',
    headers
  });

  t.equal(getResponse.statusCode, 200);
  const jobs = JSON.parse(getResponse.payload);
  t.ok(Array.isArray(jobs));

  // POST new job
  const postResponse = await app.inject({
    method: 'POST',
    url: '/api/jobs',
    headers: {
      ...headers,
      'content-type': 'application/json'
    },
    payload: JSON.stringify({
      jobCode: 'TEST-001',
      name: 'Test Job',
      description: 'A test job for API testing'
    })
  });

  t.equal(postResponse.statusCode, 201);
  const newJob = JSON.parse(postResponse.payload);
  t.equal(newJob.jobCode, 'TEST-001');
  t.equal(newJob.name, 'Test Job');
});

test('Time Entries API', async (t) => {
  const headers = {
    'x-license-key': 'FT-TEST-LICENSE-2024-ABCD1234EFGH5678',
    'x-worker-pin': '1234'
  };

  // Create a test worker and job first
  const workerResponse = await app.inject({
    method: 'POST',
    url: '/api/workers',
    headers: {
      ...headers,
      'content-type': 'application/json'
    },
    payload: JSON.stringify({
      employeeId: 'TIME001',
      name: 'Time Test Worker',
      pin: '5555'
    })
  });

  const worker = JSON.parse(workerResponse.payload);

  const jobResponse = await app.inject({
    method: 'POST',
    url: '/api/jobs',
    headers: {
      ...headers,
      'content-type': 'application/json'
    },
    payload: JSON.stringify({
      jobCode: 'TIME-001',
      name: 'Time Test Job',
      description: 'A test job for time entries'
    })
  });

  const job = JSON.parse(jobResponse.payload);

  // POST new time entry
  const timeEntryData = {
    offlineGuid: 'te_test_' + Date.now(),
    workerId: worker.id,
    jobId: job.id,
    startTime: new Date().toISOString(),
    endTime: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(), // 8 hours later
    regularHours: 8,
    overtimeHours: 0,
    notes: 'Test time entry'
  };

  const postResponse = await app.inject({
    method: 'POST',
    url: '/api/time-entries',
    headers: {
      ...headers,
      'content-type': 'application/json'
    },
    payload: JSON.stringify(timeEntryData)
  });

  t.equal(postResponse.statusCode, 201);
  const newTimeEntry = JSON.parse(postResponse.payload);
  t.equal(newTimeEntry.offlineGuid, timeEntryData.offlineGuid);
  t.equal(newTimeEntry.workerId, worker.id);
  t.equal(newTimeEntry.jobId, job.id);

  // GET time entries
  const getResponse = await app.inject({
    method: 'GET',
    url: `/api/time-entries?workerId=${worker.id}`,
    headers
  });

  t.equal(getResponse.statusCode, 200);
  const timeEntries = JSON.parse(getResponse.payload);
  t.ok(Array.isArray(timeEntries));
  t.ok(timeEntries.length > 0);
});

test('Sync endpoints', async (t) => {
  const headers = {
    'x-license-key': 'FT-TEST-LICENSE-2024-ABCD1234EFGH5678',
    'x-worker-pin': '1234'
  };

  // Test sync time entries
  const syncTimeEntriesResponse = await app.inject({
    method: 'POST',
    url: '/api/sync/time-entries',
    headers: {
      ...headers,
      'content-type': 'application/json'
    },
    payload: JSON.stringify({
      entries: [
        {
          offlineGuid: 'sync_test_' + Date.now(),
          workerId: 1,
          jobId: 1,
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
          regularHours: 4,
          overtimeHours: 0
        }
      ]
    })
  });

  t.equal(syncTimeEntriesResponse.statusCode, 200);
  const syncResult = JSON.parse(syncTimeEntriesResponse.payload);
  t.ok(syncResult.success);
  t.equal(syncResult.processed, 1);
});

test('Photo upload', async (t) => {
  const headers = {
    'x-license-key': 'FT-TEST-LICENSE-2024-ABCD1234EFGH5678',
    'x-worker-pin': '1234'
  };

  // Test photo sync endpoint
  const photoSyncResponse = await app.inject({
    method: 'POST',
    url: '/api/photos/sync',
    headers: {
      ...headers,
      'content-type': 'application/json'
    },
    payload: JSON.stringify({
      photos: [
        {
          offlineGuid: 'photo_test_' + Date.now(),
          fileName: 'test_photo.jpg',
          mimeType: 'image/jpeg',
          fileSize: 1024000,
          capturedAt: new Date().toISOString(),
          base64Data: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD//gA7Q1JFQVR...' // Truncated base64
        }
      ]
    })
  });

  t.equal(photoSyncResponse.statusCode, 200);
  const syncResult = JSON.parse(photoSyncResponse.payload);
  t.ok(syncResult.success);
  t.equal(syncResult.successful, 1);
});

test('Reports API', async (t) => {
  const headers = {
    'x-license-key': 'FT-TEST-LICENSE-2024-ABCD1234EFGH5678',
    'x-worker-pin': '1234'
  };

  // Test timesheet report
  const timesheetResponse = await app.inject({
    method: 'GET',
    url: '/api/reports/timesheet?startDate=2024-01-01&endDate=2024-12-31',
    headers
  });

  t.equal(timesheetResponse.statusCode, 200);
  const timesheetData = JSON.parse(timesheetResponse.payload);
  t.ok(Array.isArray(timesheetData));

  // Test CSV export
  const csvResponse = await app.inject({
    method: 'GET',
    url: '/api/reports/timesheet/csv?startDate=2024-01-01&endDate=2024-12-31',
    headers
  });

  t.equal(csvResponse.statusCode, 200);
  t.equal(csvResponse.headers['content-type'], 'text/csv; charset=utf-8');
  t.ok(csvResponse.payload.includes('Worker Name'));
});

test('Error handling', async (t) => {
  const headers = {
    'x-license-key': 'FT-TEST-LICENSE-2024-ABCD1234EFGH5678',
    'x-worker-pin': '1234'
  };

  // Test 404
  const notFoundResponse = await app.inject({
    method: 'GET',
    url: '/api/nonexistent',
    headers
  });

  t.equal(notFoundResponse.statusCode, 404);

  // Test validation error
  const validationErrorResponse = await app.inject({
    method: 'POST',
    url: '/api/workers',
    headers: {
      ...headers,
      'content-type': 'application/json'
    },
    payload: JSON.stringify({
      // Missing required fields
      name: 'Test Worker'
    })
  });

  t.equal(validationErrorResponse.statusCode, 400);
});

test('teardown', async (t) => {
  await app.close();
});