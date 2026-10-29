/**
 * Storage Module Test Suite
 * Tests persistent local operations: save, retrieve, compare, export, and search.
 */

const assert = require('assert');

// Mock chrome.storage.local in Node environment
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

const { StorageManager } = require('../storage/storage.js');

async function runTests() {
  console.log('--- Running StorageManager Tests ---');

  // Test 1: Save scan and retrieve from history
  {
    const scan = {
      id: 'scan_1',
      url: 'https://example.com',
      pageTitle: 'Example Domain',
      timestamp: Date.now(),
      summary: { critical: 1, high: 2, medium: 0, low: 0 },
      findings: [
        { ruleId: 'img-alt-missing', affectedElement: '<img id="1">', severity: 'high', title: 'Missing Alt' },
        { ruleId: 'form-insecure-action', affectedElement: '<form>', severity: 'critical', title: 'HTTP Form' }
      ]
    };

    const savedId = await StorageManager.saveScan(scan);
    assert.strictEqual(savedId, 'scan_1');

    const history = await StorageManager.getHistory();
    assert.strictEqual(history.length, 1);
    assert.strictEqual(history[0].id, 'scan_1');

    const fetched = await StorageManager.getScan('scan_1');
    assert.strictEqual(fetched.url, 'https://example.com');
    console.log('✓ Successfully saved and retrieved scan from local storage');
  }

  // Test 2: Search history
  {
    const searchMatch = await StorageManager.searchHistory('example');
    assert.strictEqual(searchMatch.length, 1);

    const searchNoMatch = await StorageManager.searchHistory('nonexistent');
    assert.strictEqual(searchNoMatch.length, 0);
    console.log('✓ Correctly searches scan history by query');
  }

  // Test 3: Export scan in JSON, Markdown, and CSV
  {
    const jsonExport = await StorageManager.exportScan('scan_1', 'json');
    assert.strictEqual(jsonExport.mimeType, 'application/json');
    assert.ok(jsonExport.content.includes('https://example.com'));

    const mdExport = await StorageManager.exportScan('scan_1', 'markdown');
    assert.strictEqual(mdExport.mimeType, 'text/markdown');
    assert.ok(mdExport.content.includes('Scan Report'));

    const csvExport = await StorageManager.exportScan('scan_1', 'csv');
    assert.strictEqual(csvExport.mimeType, 'text/csv');
    assert.ok(csvExport.content.includes('Severity'));
    console.log('✓ Correctly exports scans to JSON, Markdown, and CSV');
  }

  // Test 4: Compare two scans
  {
    const scan2 = {
      id: 'scan_2',
      url: 'https://example.com',
      pageTitle: 'Example Domain V2',
      timestamp: Date.now() + 1000,
      summary: { critical: 0, high: 2, medium: 1, low: 0 },
      findings: [
        { ruleId: 'img-alt-missing', affectedElement: '<img id="1">', severity: 'high', title: 'Missing Alt' }, // unchanged
        { ruleId: 'color-contrast-low', affectedElement: '<p>', severity: 'medium', title: 'Low contrast' } // added
        // form-insecure-action is resolved
      ]
    };

    await StorageManager.saveScan(scan2);
    const diff = await StorageManager.compareScans('scan_1', 'scan_2');

    assert.strictEqual(diff.added.length, 1);
    assert.strictEqual(diff.added[0].ruleId, 'color-contrast-low');

    assert.strictEqual(diff.resolved.length, 1);
    assert.strictEqual(diff.resolved[0].ruleId, 'form-insecure-action');

    assert.strictEqual(diff.unchanged.length, 1);
    assert.strictEqual(diff.unchanged[0].ruleId, 'img-alt-missing');
    console.log('✓ Correctly compares scans and produces accurate diff');
  }

  // Test 5: Delete scan and clear history
  {
    const deleted = await StorageManager.deleteScan('scan_1');
    assert.strictEqual(deleted, true);

    const historyAfterDel = await StorageManager.getHistory();
    assert.strictEqual(historyAfterDel.length, 1);
    assert.strictEqual(historyAfterDel[0].id, 'scan_2');

    await StorageManager.clearHistory();
    const historyAfterClear = await StorageManager.getHistory();
    assert.strictEqual(historyAfterClear.length, 0);
    console.log('✓ Correctly deletes individual scans and clears history');
  }

  // Test 6: Settings retrieval, update and defaults
  {
    const settings = await StorageManager.getSettings();
    assert.strictEqual(settings.theme, 'dark');
    assert.strictEqual(typeof settings.scoringWeights, 'object');
    assert.strictEqual(settings.scoringWeights.criticalPenalty, 25);

    await StorageManager.saveSettings({ theme: 'light', maxHistoryItems: 50 });
    const updated = await StorageManager.getSettings();
    assert.strictEqual(updated.theme, 'light');
    assert.strictEqual(updated.maxHistoryItems, 50);
    assert.strictEqual(updated.scoringWeights.criticalPenalty, 25); // preserved
    console.log('✓ Correctly retrieves, merges, and saves user settings');
  }

  console.log('All StorageManager tests passed!\n');
}

module.exports = { runTests };
if (require.main === module) {
  runTests();
}
