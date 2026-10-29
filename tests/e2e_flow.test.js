const assert = require('assert');

// Mock chrome.storage.local
const mockStorage = {};
globalThis.chrome = {
  storage: {
    local: {
      get: async (key) => {
        if (typeof key === 'string') return { [key]: mockStorage[key] };
        if (Array.isArray(key)) {
          const res = {};
          key.forEach(k => { res[k] = mockStorage[k]; });
          return res;
        }
        return { ...mockStorage };
      },
      set: async (obj) => { Object.assign(mockStorage, obj); },
      clear: async () => { for (const k in mockStorage) delete mockStorage[k]; }
    }
  }
};

const { StorageManager, AuthManager } = require('../storage/storage.js');
const { DiagnosticEngine } = require('../diagnostics/diagnosticEngine.js');
const { FixSuggestions } = require('../diagnostics/fixSuggestions.js');

async function testFullScanFlow() {
  console.log('--- Testing Full End-to-End Scan & Remediation Flow ---');

  // 1. Log in as user
  const user = await AuthManager.login('dev@companion.local', 'password123');
  assert.strictEqual(user.name, 'Developer');
  assert.strictEqual(StorageManager.getActiveUserId(), user.id);

  // 2. Mock raw scan data collected from page
  const rawData = {
    page: {
      timestamp: Date.now(),
      url: 'https://example-test-site.org',
      title: 'Example Test Site',
      lang: '',
      description: '',
      viewport: ''
    },
    images: {
      images: [
        { src: '/banner.jpg', altMissing: true, isDecorativeByRole: false, index: 0 }
      ]
    },
    links: {
      links: [
        { type: 'missing_href', text: 'Broken Anchor' }
      ]
    },
    forms: {
      findings: [
        { ruleId: 'form-insecure-action', category: 'security', severity: 'critical', title: 'Form sends over HTTP', affectedElement: '<form action="http://api">' }
      ]
    },
    security: {
      findings: [
        { ruleId: 'csp-missing', category: 'security', severity: 'high', title: 'Content Security Policy missing', affectedElement: '<head>' }
      ]
    }
  };

  // 3. Process via Diagnostic Engine
  const processed = DiagnosticEngine.process(rawData, rawData.page.url, rawData.page.title);
  assert.ok(processed.findings && processed.findings.length >= 3, 'Should produce at least 3 findings');

  // 4. Enrich with FixSuggestions
  const enriched = FixSuggestions.enrichAll(processed.findings);
  assert.strictEqual(enriched.length, processed.findings.length);

  enriched.forEach(f => {
    assert.ok(f.fixSuggestion, `Finding ${f.ruleId} should have remediation suggestion`);
    assert.ok(f.fixSuggestion.title && f.fixSuggestion.explanation, `Finding ${f.ruleId} should have actionable explanation`);
  });
  console.log(`✓ Generated ${enriched.length} findings with concrete solutions!`);

  // 5. Update summary
  const summary = processed.summary;
  assert.ok(summary.total > 0);
  console.log(`✓ Summary total issues: ${summary.total} (Critical: ${summary.critical}, High: ${summary.high}, Medium: ${summary.medium})`);

  // 6. Save scan to StorageManager
  processed.findings = enriched;
  const savedId = await StorageManager.saveScan(processed);
  assert.strictEqual(savedId, processed.id);

  // 7. Verify retrieval
  const retrieved = await StorageManager.getScan(savedId);
  assert.strictEqual(retrieved.url, rawData.page.url);
  assert.strictEqual(retrieved.findings.length, enriched.length);
  console.log('✓ Scan successfully saved to user vault and retrieved!');

  // 8. Test Search
  const searchResults = await StorageManager.searchHistory('example-test');
  assert.strictEqual(searchResults.length, 1);
  console.log('✓ History search retrieved matched scan!');

  // 9. Test Exports
  const jsonExp = await StorageManager.exportScan(savedId, 'json');
  assert.ok(jsonExp.content.includes(rawData.page.url));
  const mdExp = await StorageManager.exportScan(savedId, 'markdown');
  assert.ok(mdExp.content.includes('Scan Report'));
  const csvExp = await StorageManager.exportScan(savedId, 'csv');
  assert.ok(csvExp.content.includes('Severity'));
  console.log('✓ All 3 export formats (JSON, Markdown, CSV) generated properly!');

  console.log('All E2E flow assertions passed!');
}

if (require.main === module) {
  testFullScanFlow().catch(err => {
    console.error('E2E test failed:', err);
    process.exit(1);
  });
}

module.exports = { testFullScanFlow, runTests: testFullScanFlow };
