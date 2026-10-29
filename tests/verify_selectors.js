const fs = require('fs');

const html = fs.readFileSync('cross-browser-web-companion/dashboard/dashboard.html', 'utf8');
const js = fs.readFileSync('cross-browser-web-companion/dashboard/dashboard.js', 'utf8');

// Find all querySelector and querySelectorAll
const qsMatches = js.matchAll(/querySelector(All)?\(['"]([^'"]+)['"]\)/g);
const selectors = new Set();
for (const m of qsMatches) {
  selectors.add(m[2]);
}

console.log(`Checking ${selectors.size} query selectors...`);
const missing = [];
for (const sel of selectors) {
  if (sel.startsWith('.')) {
    const className = sel.slice(1).split(/[\s:>+~\[\.]/)[0];
    if (!html.includes(`class="`) || !new RegExp(`class=["'][^"']*\\b${className}\\b`).test(html)) {
      missing.push(sel);
    }
  } else if (sel.startsWith('#')) {
    const id = sel.slice(1);
    if (!new RegExp(`id=["']${id}["']`).test(html)) {
      missing.push(sel);
    }
  } else if (sel.includes('[data-')) {
    const attr = sel.match(/\[([a-zA-Z0-9\-_]+)=/)?.[1];
    if (attr && !html.includes(attr)) {
      missing.push(sel);
    }
  }
}

if (missing.length > 0) {
  console.log('Potentially missing selectors (may be dynamically created):', missing);
} else {
  console.log('✓ All static query selectors matched!');
}

