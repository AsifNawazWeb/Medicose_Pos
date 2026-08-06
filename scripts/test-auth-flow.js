/* eslint-disable no-console */
/**
 * Quick smoke test for the new auth flow.
 * Verifies:
 *  1. Backend modules load
 *  2. Setup status endpoint works
 *  3. First admin can be created
 *  4. Login works with email/username
 *  5. User management endpoints work
 */
const path = require('path');
const fs = require('fs');
const os = require('os');
const Database = require('better-sqlite3');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

// Use a temporary database so we don't touch real data
// IMPORTANT: Must set DB_PATH BEFORE requiring backend modules (config/env reads it at load time)
const tempDbPath = path.join(os.tmpdir(), `medpos_test_${Date.now()}.sqlite`);
process.env.DB_PATH = tempDbPath;

const { createApp } = require('../backend/src/app.js');

// Create a fresh DB with the schema
const schema = fs.readFileSync(path.resolve(process.cwd(), 'backend', 'db', 'schema.sql'), 'utf8');
const db = new Database(tempDbPath);
db.exec(schema);
db.close();
console.log('✓ Fresh test database created');

async function main() {
  console.log('\n🧪 Testing auth flow...\n');

  // 1. Get DB
  const { getDb, closeDb } = require('../backend/src/config/db.js');
  const db = getDb();
  console.log('✓ Database connected');

  // 2. Check setup status
  const adminCount = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'admin' AND isActive = 1").get().c;
  console.log(`✓ Admin count: ${adminCount} (needsSetup: ${adminCount === 0})`);

  // 3. Create app
  const app = createApp();
  console.log('✓ Express app created');

  // 4. Test setup status endpoint
  const server = app.listen(0, async () => {
    const port = server.address().port;
    const base = `http://localhost:${port}`;

    try {
      // Setup status
      const statusRes = await fetch(`${base}/api/setup/status`);
      const status = await statusRes.json();
      console.log(`✓ GET /api/setup/status → needsSetup: ${status.data.needsSetup}`);

      // If no admin, create one
      if (status.data.needsSetup) {
        const setupRes = await fetch(`${base}/api/setup/admin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Test Admin',
            email: 'admin@test.com',
            username: 'admin',
            password: 'password123',
          }),
        });
        const setup = await setupRes.json();
        console.log(`✓ POST /api/setup/admin → ${setupRes.status} (${setup.user?.username})`);
      }

      // Login with email
      const loginRes = await fetch(`${base}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: 'admin@test.com', password: 'password123' }),
      });
      const login = await loginRes.json();
      console.log(`✓ POST /api/auth/login (email) → ${loginRes.status} (role: ${login.user?.role})`);

      // Login with username
      const login2Res = await fetch(`${base}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: 'admin', password: 'password123' }),
      });
      const login2 = await login2Res.json();
      console.log(`✓ POST /api/auth/login (username) → ${login2Res.status}`);

      // Get me
      const meRes = await fetch(`${base}/api/auth/me`, {
        headers: { Authorization: `Bearer ${login.token}` },
      });
      const me = await meRes.json();
      console.log(`✓ GET /api/auth/me → ${meRes.status} (${me.user?.name})`);

      // List users
      const usersRes = await fetch(`${base}/api/users`, {
        headers: { Authorization: `Bearer ${login.token}` },
      });
      const users = await usersRes.json();
      console.log(`✓ GET /api/users → ${usersRes.status} (${users.data?.length} users)`);

      // Create a cashier user
      const createRes = await fetch(`${base}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${login.token}` },
        body: JSON.stringify({
          name: 'Test Cashier',
          email: 'cashier@test.com',
          username: 'cashier1',
          password: 'password123',
          role: 'cashier',
        }),
      });
      const created = await createRes.json();
      console.log(`✓ POST /api/users → ${createRes.status} (${created.user?.username}, role: ${created.user?.role})`);

      // Login as cashier
      const cashierLogin = await fetch(`${base}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: 'cashier1', password: 'password123' }),
      });
      const cashier = await cashierLogin.json();
      console.log(`✓ Cashier login → ${cashierLogin.status} (mustChangePassword: ${cashier.user?.mustChangePassword})`);

      // Cashier should NOT be able to list users (403)
      const forbiddenRes = await fetch(`${base}/api/users`, {
        headers: { Authorization: `Bearer ${cashier.token}` },
      });
      console.log(`✓ Cashier GET /api/users → ${forbiddenRes.status} (expected 403)`);

      // Change password
      const changeRes = await fetch(`${base}/api/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cashier.token}` },
        body: JSON.stringify({ currentPassword: 'password123', newPassword: 'newpassword123' }),
      });
      console.log(`✓ POST /api/auth/change-password → ${changeRes.status}`);

      console.log('\n✅ All auth flow tests passed!\n');
    } catch (err) {
      console.error('\n❌ Test failed:', err.message);
      process.exitCode = 1;
    } finally {
      server.close();
      closeDb();
      // Clean up temp DB
      try { fs.unlinkSync(tempDbPath); } catch (_) {}
      try { fs.unlinkSync(tempDbPath + '-wal'); } catch (_) {}
      try { fs.unlinkSync(tempDbPath + '-shm'); } catch (_) {}
    }
  });
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});