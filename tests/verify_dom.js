const fs = require('fs');
const path = require('path');

function checkElements(htmlRelPath, jsRelPath) {
  const baseDir = path.resolve(__dirname, '..');
  const htmlPath = path.resolve(baseDir, htmlRelPath);
  const jsPath = path.resolve(baseDir, jsRelPath);

  const html = fs.readFileSync(htmlPath, 'utf8');
  const js = fs.readFileSync(jsPath, 'utf8');

  const matches = js.matchAll(/getElementById\(['"]([^'"]+)['"]\)/g);
  const ids = new Set();
  for (const m of matches) {
    ids.add(m[1]);
  }

  const missing = [];
  for (const id of ids) {
    const pattern = new RegExp(`id=["']${id}["']`);
    if (!pattern.test(html)) {
      missing.push(id);
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing ${missing.length} element IDs in ${htmlRelPath}: ${missing.join(', ')}`);
  }
  return ids.size;
}

function runDomTests() {
  console.log('--- Running DOM & ID Integrity Tests ---');
  const dIds = checkElements('dashboard/dashboard.html', 'dashboard/dashboard.js');
  console.log(`✓ All ${dIds} IDs in dashboard.html matched`);
  const lIds = checkElements('dashboard/login.html', 'dashboard/login.js');
  console.log(`✓ All ${lIds} IDs in login.html matched`);
  const rIds = checkElements('dashboard/register.html', 'dashboard/register.js');
  console.log(`✓ All ${rIds} IDs in register.html matched`);
  const pIds = checkElements('popup/popup.html', 'popup/popup.js');
  console.log(`✓ All ${pIds} IDs in popup.html matched`);
  console.log('All DOM & ID Integrity tests passed!');
}

if (require.main === module) {
  runDomTests();
}

module.exports = { runDomTests, runTests: runDomTests };
