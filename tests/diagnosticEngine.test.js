/**
 * Diagnostic Engine Test Suite
 * Tests normalization, deduplication, severity sorting, and metric generation.
 */

const assert = require('assert');
const { DiagnosticEngine } = require('../diagnostics/diagnosticEngine.js');

function runTests() {
  console.log('--- Running DiagnosticEngine Tests ---');

  // Test 1: Empty raw data handles safely
  {
    const result = DiagnosticEngine.process({}, 'https://example.com', 'Example Page');
    assert.strictEqual(result.url, 'https://example.com');
    assert.strictEqual(result.pageTitle, 'Example Page');
    assert.strictEqual(Array.isArray(result.findings), true);
    assert.strictEqual(result.findings.length, 0);
    assert.strictEqual(result.summary.total, 0);
    console.log('✓ Handles empty raw data safely');
  }

  // Test 2: Normalizes findings from multiple scanner categories
  {
    const rawData = {
      page: {
        timestamp: 1700000000000,
        title: 'Test Page',
        lang: 'en',
        description: 'Test description',
        viewport: 'width=device-width, initial-scale=1.0',
        findings: [
          { ruleId: 'html-missing-lang', category: 'accessibility', severity: 'medium', title: 'Missing lang', affectedElement: '<html>' }
        ]
      },
      images: {
        findings: [
          { ruleId: 'img-alt-missing', category: 'accessibility', severity: 'high', title: 'Image missing alt', affectedElement: '<img src="hero.jpg">' }
        ]
      },
      security: {
        findings: [
          { ruleId: 'form-insecure-action', category: 'security', severity: 'critical', title: 'Form sends over HTTP', affectedElement: '<form action="http://api">' }
        ]
      }
    };

    const result = DiagnosticEngine.process(rawData, 'https://test.com', 'Test Page');
    assert.strictEqual(result.findings.length, 3);
    assert.strictEqual(result.summary.total, 3);
    assert.strictEqual(result.summary.critical, 1);
    assert.strictEqual(result.summary.high, 1);
    assert.strictEqual(result.summary.medium, 1);

    // Verify sorted by severity: critical first, then high, then medium
    assert.strictEqual(result.findings[0].severity, 'critical');
    assert.strictEqual(result.findings[1].severity, 'high');
    assert.strictEqual(result.findings[2].severity, 'medium');
    console.log('✓ Normalizes, sorts by severity, and counts findings correctly');
  }

  // Test 3: Deduplication removes identical ruleId + affectedElement
  {
    const rawData = {
      images: {
        findings: [
          { ruleId: 'img-alt-missing', category: 'accessibility', severity: 'high', title: 'Missing alt', affectedElement: '<img id="a">' },
          { ruleId: 'img-alt-missing', category: 'accessibility', severity: 'high', title: 'Missing alt duplicate', affectedElement: '<img id="a">' },
          { ruleId: 'img-alt-missing', category: 'accessibility', severity: 'high', title: 'Missing alt unique', affectedElement: '<img id="b">' },
        ]
      }
    };

    const result = DiagnosticEngine.process(rawData, 'https://test.com', 'Test Page');
    assert.strictEqual(result.findings.length, 2);
    console.log('✓ Correctly deduplicates duplicate findings');
  }

  // Test 4: Assigns unique IDs
  {
    const rawData = {
      links: {
        findings: [
          { ruleId: 'link-empty-href', category: 'links', severity: 'low', title: 'Empty href' },
          { ruleId: 'link-target-blank', category: 'links', severity: 'medium', title: 'Target blank missing rel' }
        ]
      }
    };

    const result = DiagnosticEngine.process(rawData, 'https://test.com', 'Test Page');
    assert.strictEqual(typeof result.findings[0].id, 'string');
    assert.notStrictEqual(result.findings[0].id, result.findings[1].id);
    console.log('✓ Assigns unique IDs to findings');
  }

  console.log('All DiagnosticEngine tests passed!\n');
}

module.exports = { runTests };
if (require.main === module) {
  runTests();
}
