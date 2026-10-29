/**
 * Auth & Per-User Isolation Test Suite
 * Tests register, login, signout, and per-user persistent scan isolation.
 */

const assert = require('assert');

// Mock chrome.storage.local
const mockStorage = {};
globalThis.chrome = {
  storage: {
    local: {
      get: async (key) => {
        if (typeof key === 'string') {
          return { [key]: mockStorage[key] };
        }
        if (Array.isArray(key)) {
          const res = {};
          key.forEach(k => { res[k] = mockStorage[k]; });
          return res;
        }
        return { ...mockStorage };
      },
      set: async (obj) => {
        Object.assign(mockStorage, obj);
      },
      clear: async () => {
        for (const k in mockStorage) delete mockStorage[k];
      }
    }
  }
};

const { StorageManager, AuthManager } = require('../storage/storage.js');

async function runAuthTests() {
  console.log('--- Running AuthManager & Isolation Tests ---');

  // Test 1: Seed default users
  const users = await AuthManager.getUsers();
  assert.ok(users.length >= 1);
  const devUser = users.find(u => u.name === 'Developer');
  assert.ok(devUser);
  console.log('✓ Seeds default users correctly');

  // Test 2: Login as Developer
  const loggedIn = await AuthManager.login('dev@companion.local', 'password123');
  assert.strictEqual(loggedIn.email, 'dev@companion.local');
  assert.strictEqual(StorageManager.getActiveUserId(), devUser.id);
  console.log('✓ Correctly logs in existing user');

  // Test 3: Save scan under Developer account
  const scanDev = {
    id: 'scan_dev_1',
    url: 'https://dev-site.com',
    pageTitle: 'Dev Site',
    timestamp: Date.now(),
    findings: []
  };
  await StorageManager.saveScan(scanDev);
  let devHistory = await StorageManager.getHistory();
  assert.strictEqual(devHistory.length, 1);
  assert.strictEqual(devHistory[0].id, 'scan_dev_1');
  console.log('✓ Successfully saves scan to Developer vault');

  // Test 4: Enforce compulsory registration fields
  await assert.rejects(
    async () => AuthManager.register({ name: '', email: 'e@test.com', role: 'Role', password: 'pass' }),
    /Full Name is required/
  );
  await assert.rejects(
    async () => AuthManager.register({ name: 'User', email: '', role: 'Role', password: 'pass' }),
    /Email Address is required/
  );
  await assert.rejects(
    async () => AuthManager.register({ name: 'User', email: 'e@test.com', role: '', password: 'pass' }),
    /Workspace Title or Role is required/
  );
  await assert.rejects(
    async () => AuthManager.register({ name: 'User', email: 'e@test.com', role: 'Role', password: '' }),
    /Password is required/
  );
  console.log('✓ Compulsory validation enforced on all registration fields');

  // Register a new user
  const newUser = await AuthManager.register({
    name: 'Test Engineer',
    email: 'engineer@test.com',
    role: 'QA Specialist',
    password: 'secretpassword'
  });
  assert.ok(newUser.id);
  assert.strictEqual(StorageManager.getActiveUserId(), newUser.id);
  console.log('✓ Successfully registers new user and activates account');

  // Test 5: Verify new user has isolated, empty history
  let engineerHistory = await StorageManager.getHistory();
  assert.strictEqual(engineerHistory.length, 0, 'New user history should be isolated and empty');

  // Save scan under new user
  const scanEng = {
    id: 'scan_eng_1',
    url: 'https://engineer-site.org',
    pageTitle: 'Engineer Site',
    timestamp: Date.now(),
    findings: []
  };
  await StorageManager.saveScan(scanEng);
  engineerHistory = await StorageManager.getHistory();
  assert.strictEqual(engineerHistory.length, 1);
  assert.strictEqual(engineerHistory[0].id, 'scan_eng_1');
  console.log('✓ User isolation verified: new user vault stores separate data');

  // Test 6: Sign out
  await AuthManager.logout();
  const cur = await AuthManager.getCurrentUser();
  assert.strictEqual(cur, null);
  assert.strictEqual(StorageManager.getActiveUserId(), null);
  console.log('✓ Successfully logs out');

  // Test 7: Re-login as Developer and verify original data is restored!
  await AuthManager.login('dev@companion.local', 'password123');
  assert.strictEqual(StorageManager.getActiveUserId(), devUser.id);
  devHistory = await StorageManager.getHistory();
  assert.strictEqual(devHistory.length, 1);
  assert.strictEqual(devHistory[0].id, 'scan_dev_1');
  console.log('✓ Re-login verified: Developer data restored from vault');

  // Test 8: Re-login as Test Engineer and verify their data is restored!
  await AuthManager.login('engineer@test.com', 'secretpassword');
  assert.strictEqual(StorageManager.getActiveUserId(), newUser.id);
  engineerHistory = await StorageManager.getHistory();
  assert.strictEqual(engineerHistory.length, 1);
  assert.strictEqual(engineerHistory[0].id, 'scan_eng_1');
  console.log('✓ Re-login verified: Test Engineer data restored from vault');

  console.log('All AuthManager & User Isolation tests passed!\n');
}

if (require.main === module) {
  runAuthTests().catch(err => {
    console.error('Auth test failed:', err);
    process.exit(1);
  });
}

module.exports = { runAuthTests };

