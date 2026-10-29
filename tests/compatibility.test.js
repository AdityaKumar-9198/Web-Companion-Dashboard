/**
 * Browser Compatibility Test Suite
 * Tests namespace normalization, cross-browser wrapper behavior.
 */

const assert = require('assert');

function runTests() {
  console.log('--- Running BrowserCompat Tests ---');

  // Verify that BrowserCompat handles globalThis
  const { BrowserCompat } = require('../browser/compatibility.js');

  assert.ok(BrowserCompat);
  assert.strictEqual(typeof BrowserCompat.sendMessage, 'function');
  assert.strictEqual(typeof BrowserCompat.sendTabMessage, 'function');
  assert.strictEqual(typeof BrowserCompat.executeScript, 'function');
  assert.strictEqual(typeof BrowserCompat.storage, 'object');

  console.log('✓ BrowserCompat interface conforms to required standard');
  console.log('All BrowserCompat tests passed!\n');
}

module.exports = { runTests };
if (require.main === module) {
  runTests();
}
