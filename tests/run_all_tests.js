/**
 * Test Runner — runs all project unit test suites without external dependencies.
 */

async function runAll() {
  console.log('==================================================');
  console.log(' Web Development Companion — Automated Test Suite ');
  console.log('==================================================\n');

  const startTime = Date.now();
  let passedSuites = 0;
  let totalSuites = 0;

  const suites = [
    { name: 'Diagnostic Engine', file: './diagnosticEngine.test.js' },
    { name: 'Fix Suggestions', file: './fixSuggestions.test.js' },
    { name: 'Storage Manager', file: './storage.test.js' },
    { name: 'Auth & User Isolation', file: './auth.test.js', runner: 'runAuthTests' },
    { name: 'Browser Compatibility', file: './compatibility.test.js' },
    { name: 'Scanner Modules', file: './scanner.test.js' },
    { name: 'DOM & ID Integrity', file: './verify_dom.js', runner: 'runDomTests' },
    { name: 'End-to-End Scan & Remediation', file: './e2e_flow.test.js', runner: 'testFullScanFlow' },
  ];

  for (const suite of suites) {
    totalSuites++;
    try {
      const testModule = require(suite.file);
      if (suite.runner && typeof testModule[suite.runner] === 'function') {
        await testModule[suite.runner]();
      } else {
        await testModule.runTests();
      }
      passedSuites++;
    } catch (err) {
      console.error(`❌ Suite Failed: ${suite.name}`);
      console.error(err.stack || err.message);
      process.exitCode = 1;
    }
  }

  const duration = Date.now() - startTime;
  console.log('==================================================');
  console.log(` Results: ${passedSuites}/${totalSuites} suites passed (${duration}ms)`);
  console.log('==================================================');

  if (passedSuites === totalSuites) {
    console.log('🎉 ALL TESTS PASSED SUCCESSFULLY!\n');
  } else {
    console.error('⚠️ SOME TESTS FAILED.\n');
    process.exit(1);
  }
}

runAll();
