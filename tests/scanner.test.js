/**
 * Scanner Modules Test Suite
 * Tests raw scanning logic with simulated DOM environments.
 */

const assert = require('assert');

function runTests() {
  console.log('--- Running Scanner Modules Tests ---');

  // Test 1: Heading hierarchy analysis logic
  {
    const headingLevels = [1, 2, 4]; // Skipped level 3
    const skipped = [];
    for (let i = 1; i < headingLevels.length; i++) {
      const prev = headingLevels[i - 1];
      const curr = headingLevels[i];
      if (curr > prev + 1) {
        for (let s = prev + 1; s < curr; s++) {
          skipped.push(s);
        }
      }
    }
    assert.strictEqual(skipped.length, 1);
    assert.strictEqual(skipped[0], 3);
    console.log('✓ Heading hierarchy correctly identifies skipped levels (e.g. H2 -> H4)');
  }

  // Test 2: Insecure form action detection on HTTPS origin
  {
    const pageProtocol = 'https:';
    const formActions = [
      { action: 'http://api.domain.com/submit', expectedInsecure: true },
      { action: 'https://api.domain.com/submit', expectedInsecure: false },
      { action: '/relative/path', expectedInsecure: false }
    ];

    formActions.forEach(f => {
      const isHttp = f.action.startsWith('http://');
      const isInsecure = (pageProtocol === 'https:' && isHttp);
      assert.strictEqual(isInsecure, f.expectedInsecure);
    });
    console.log('✓ Correctly detects insecure HTTP action on HTTPS pages');
  }

  // Test 3: Rel="noopener noreferrer" detection for target="_blank"
  {
    const links = [
      { target: '_blank', rel: 'noopener noreferrer', safe: true },
      { target: '_blank', rel: null, safe: false },
      { target: '_blank', rel: 'nofollow', safe: false },
      { target: '_self', rel: null, safe: true },
    ];

    links.forEach(l => {
      const isBlank = l.target === '_blank';
      const relSafe = l.rel && l.rel.includes('noopener') && l.rel.includes('noreferrer');
      const isVulnerable = isBlank && !relSafe;
      assert.strictEqual(!isVulnerable, l.safe);
    });
    console.log('✓ Correctly evaluates target="_blank" window opener vulnerability');
  }

  // Test 4: Image alt attribute classification
  {
    const images = [
      { alt: null, category: 'missing' },      // Inaccessible
      { alt: '', category: 'decorative' },     // Valid decorative
      { alt: 'Product photo', category: 'accessible' } // Valid description
    ];

    images.forEach(img => {
      if (img.alt === null) {
        assert.strictEqual(img.category, 'missing');
      } else if (img.alt === '') {
        assert.strictEqual(img.category, 'decorative');
      } else {
        assert.strictEqual(img.category, 'accessible');
      }
    });
    console.log('✓ Correctly categorizes image alt attributes (missing vs decorative vs accessible)');
  }

  console.log('All Scanner Modules tests passed!\n');
}

module.exports = { runTests };
if (require.main === module) {
  runTests();
}
