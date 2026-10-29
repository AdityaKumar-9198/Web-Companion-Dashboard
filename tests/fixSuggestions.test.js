/**
 * Fix Suggestions Test Suite
 * Tests remediation advice, code snippet templates, and finding enrichment.
 */

const assert = require('assert');
const { FixSuggestions } = require('../diagnostics/fixSuggestions.js');

function runTests() {
  console.log('--- Running FixSuggestions Tests ---');

  // Test 1: Known accessibility rule provides snippet and guidance
  {
    const finding = { ruleId: 'img-alt-missing', category: 'accessibility', title: 'Image missing alt' };
    const suggestion = FixSuggestions.getSuggestion('img-alt-missing', finding);
    assert.strictEqual(typeof suggestion.title, 'string');
    assert.strictEqual(typeof suggestion.explanation, 'string');
    assert.strictEqual(typeof suggestion.codeExample, 'string');
    assert.ok(suggestion.codeExample.includes('alt='));
    console.log('✓ Provides accurate remediation for img-alt-missing');
  }

  // Test 2: Known security rule provides snippet and guidance
  {
    const finding = { ruleId: 'form-insecure-action', category: 'security', title: 'Form submits to HTTP' };
    const suggestion = FixSuggestions.getSuggestion('form-insecure-action', finding);
    assert.strictEqual(typeof suggestion.title, 'string');
    assert.strictEqual(typeof suggestion.explanation, 'string');
    console.log('✓ Provides guidance for security rules');
  }

  // Test 3: Unknown rule falls back to safe default guidance
  {
    const finding = { ruleId: 'custom-unknown-rule', category: 'custom' };
    const suggestion = FixSuggestions.getSuggestion('custom-unknown-rule', finding);
    assert.strictEqual(suggestion.title, 'Review this finding manually');
    assert.ok(suggestion.explanation.includes('custom-unknown-rule'));
    console.log('✓ Falls back gracefully for unknown rules');
  }

  // Test 4: enrichAll attaches fixSuggestion to each finding
  {
    const findings = [
      { ruleId: 'img-alt-missing', category: 'accessibility' },
      { ruleId: 'html-missing-lang', category: 'accessibility' },
    ];
    const enriched = FixSuggestions.enrichAll(findings);
    assert.strictEqual(enriched.length, 2);
    assert.ok(enriched[0].fixSuggestion);
    assert.ok(enriched[1].fixSuggestion);
    console.log('✓ enrichAll enriches findings array correctly');
  }

  console.log('All FixSuggestions tests passed!\n');
}

module.exports = { runTests };
if (require.main === module) {
  runTests();
}
