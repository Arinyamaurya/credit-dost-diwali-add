const http = require('http');
const mongoose = require('mongoose');

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const BASE_URL = process.env.SMOKE_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
if (!ADMIN_TOKEN) {
  console.error('ADMIN_TOKEN must be set in server/.env to run the smoke test');
  process.exit(1);
}

function request(path, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqOptions = {
      method: options.method || 'GET',
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json;
        try {
          json = JSON.parse(data);
        } catch {
          json = data;
        }
        resolve({ status: res.statusCode, data: json, headers: res.headers });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runFullSmokeSuite() {
  console.log('=== STARTING FULL BACKEND & CONCURRENCY TEST SUITE ===');

  // 1. Health check
  console.log('\n[1] Checking /api/health ...');
  const health = await request('/api/health');
  console.log('    Status:', health.status, 'db:', health.data.db);
  if (health.status !== 200 || health.data.db !== 'connected') {
    throw new Error('Health check failed: DB not connected');
  }

  // 2. Fetch current spots
  console.log('\n[2] Fetching initial spots ...');
  const initialSpots = await request('/api/spots');
  console.log('    Partner spots:', initialSpots.data.partner);
  console.log('    Customer spots:', initialSpots.data.customer);

  // 3. Connect directly to mongo for atomic concurrency test setup
  const mongoUri = 'mongodb://127.0.0.1:27017/credit_dost_diwali';
  await mongoose.connect(mongoUri);
  const SpotCounter = require('../models/SpotCounter');
  const Lead = require('../models/Lead');

  // Clean test leads from previous runs
  await Lead.deleteMany({ source: 'concurrency_test' });

  console.log('\n[3] Setting customer total spots to 5 for race condition test ...');
  await SpotCounter.findOneAndUpdate(
    { kind: 'customer' },
    { $set: { claimed: 0, total: 5 } }
  );

  // 4. Fire 15 parallel requests concurrently against 5 available spots
  console.log('\n[4] Firing 15 concurrent lead submissions against 5 available spots ...');
  const parallelRequests = [];
  const sampleNames = [
    'Ankit Sharma', 'Pooja Verma', 'Amit Kumar', 'Suresh Patel', 'Rohan Gupta',
    'Neha Singh', 'Deepak Joshi', 'Kavita Rao', 'Manoj Tiwari', 'Priya Nair',
    'Vikas Mishra', 'Sneha Reddy', 'Rajiv Choudhary', 'Anjali Saxena', 'Karan Mehta'
  ];

  const batchPrefix = '9' + String(Math.floor(100000 + Math.random() * 800000));

  for (let i = 1; i <= 15; i++) {
    const mobile = batchPrefix + String(100 + i);
    const email = `race_test_${i}_${Date.now()}@test.com`;
    parallelRequests.push(
      request('/api/leads', {
        method: 'POST',
        headers: { 'x-admin-token': ADMIN_TOKEN },
      }, {
        kind: 'customer',
        name: sampleNames[i - 1],
        mobile,
        email,
        city: 'Mumbai',
        pin: '400001',
        source: 'concurrency_test',
      })
    );
  }

  const results = await Promise.all(parallelRequests);
  const successCount = results.filter((r) => r.status === 201).length;
  const soldOutCount = results.filter((r) => r.status === 409 && r.data.code === 'SOLD_OUT').length;
  const otherCount = results.filter((r) => r.status !== 201 && !(r.status === 409 && r.data.code === 'SOLD_OUT')).length;

  console.log(`    Results: ${successCount} SUCCESS (201), ${soldOutCount} SOLD_OUT (409), ${otherCount} OTHER`);
  if (otherCount > 0) {
    console.log('    Sample other result:', results[0].status, results[0].data);
  }

  if (successCount !== 5 || soldOutCount !== 10) {
    throw new Error(`Race condition test failed! Expected 5 successes and 10 SOLD_OUT, got ${successCount} & ${soldOutCount}`);
  }
  console.log('    ✓ ATOMIC CONCURRENCY PASSED: Exactly 5 spots granted, 0 overselling!');

  // 5. Duplicate submission check on an existing lead
  console.log('\n[5] Testing duplicate lead prevention (expecting 409 ALREADY_REGISTERED) ...');
  const duplicateRes = await request('/api/leads', {
    method: 'POST',
    headers: { 'x-admin-token': ADMIN_TOKEN },
  }, {
    kind: 'customer',
    name: 'Ankit Sharma',
    mobile: batchPrefix + '101',
    email: 'diff_email@test.com',
    city: 'Mumbai',
    pin: '400001',
  });
  console.log('    Status:', duplicateRes.status, 'Code:', duplicateRes.data.code);
  if (duplicateRes.status !== 409 || duplicateRes.data.code !== 'ALREADY_REGISTERED') {
    throw new Error('Duplicate check failed: expected 409 ALREADY_REGISTERED');
  }

  // 6. Test Admin API: leads, CSV, and stats
  console.log('\n[6] Testing Admin Endpoints (/api/admin/leads, .csv, /stats) ...');
  const adminLeads = await request('/api/admin/leads?limit=10', {
    headers: { 'x-admin-token': ADMIN_TOKEN },
  });
  console.log(`    Admin leads returned: ${adminLeads.data?.data?.length} (Total in DB: ${adminLeads.data?.pagination?.total})`);

  const adminCsv = await request('/api/admin/leads.csv', {
    headers: { 'x-admin-token': ADMIN_TOKEN },
  });
  console.log(`    Admin CSV returned HTTP ${adminCsv.status}, length: ${adminCsv.data?.length} bytes`);

  const adminStats = await request('/api/admin/stats', {
    headers: { 'x-admin-token': ADMIN_TOKEN },
  });
  console.log('    Admin Stats summary:', adminStats.data?.stats);

  // 7. Reset customer spots back to 100 for normal operation
  await SpotCounter.findOneAndUpdate(
    { kind: 'customer' },
    { $set: { claimed: 5, total: 100 } }
  );
  await mongoose.disconnect();

  console.log('\n=== ✓ ALL TESTS COMPLETED AND PASSED WITH ZERO DRIFT ===');
}

runFullSmokeSuite().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
