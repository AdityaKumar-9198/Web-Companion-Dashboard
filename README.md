# Cross-Browser Web Development Companion Dashboard

A complete, locally operated browser extension and web development analysis dashboard designed for modern web developers. It inspects pages in real-time, surfaces architectural, accessibility, performance, and security findings, presents actionable code remediation examples, and maintains persistent local scan history with diff comparisons.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Manifest](https://img.shields.io/badge/manifest-v3-green.svg)
![Tests](https://img.shields.io/badge/tests-passing-brightgreen.svg)

---

## 🚀 Key Capabilities

### 1. Multi-Vector Deep Scanning
- **Accessibility (a11y)**: WCAG 2.1 AA heuristics — missing `alt` attributes, unlabelled `<input>` / `<textarea>` elements, colour contrast calculations, heading hierarchies (`h1`–`h6`), missing `lang` attributes, and non-descriptive link labels.
- **Security & Integrity**: Insecure HTTP endpoints on HTTPS pages, token leakage in `localStorage`, `target="_blank"` without `rel="noopener noreferrer"`, mixed content detection, and an interactive **20-point Web Security Baseline Checklist** with honest client-side capability boundaries.
- **Performance**: Navigation Timing API breakdown (DNS, TCP, DOMContentLoaded, full page load), asset count, script footprint, and oversize image detection.
- **Structure & HTML5 Semantics**: Heading outline hierarchy, semantic markup ratio (`<header>`, `<main>`, `<article>`, `<nav>`, `<footer>`), broken internal anchor tags, and meta tags (`viewport`, `charset`, `description`).
- **Form Auditing**: Missing submit buttons, password fields lacking `autocomplete="current-password"`, insecure form actions, and missing field labels.

### 2. Actionable Fix Guidance Engine
- Does not just report bugs; delivers **concrete code examples** and architectural explanations for every detected rule.
- Built-in **1-click code copy** for rapid developer workflow.

### 3. Persistent Local Storage & Diff Comparison
- Built entirely on `chrome.storage.local` — **100% private and offline**. No telemetry or external server transmission.
- Maintains chronological scan history.
- **Automated Diff Engine**: Select any two scans to immediately see newly introduced issues, resolved bugs, and persistent unchanged findings.

### 4. Developer Dashboard
- **Dual Visual Themes**: Premium glassmorphic dark UI & crisp high-contrast light mode with 1-click header toggle.
- Overall **Page Health Score (0–100)** computed via weighted defect density.
- Category breakdowns and responsive KPI metrics.
- **Settings & Rules Configuration**: Toggle individual diagnostic categories on/off, customize scoring penalty weights, configure max scan retention, and monitor storage quota.
- **Standalone Demo Mode**: Built-in realistic sample scan preview from `demo/sample_page.html` with graceful localStorage fallback when viewed without extension runtime.
- Export complete reports in **JSON**, **Markdown (.md)**, or **CSV**.

---

## 📂 Project Architecture

```
cross-browser-web-companion/
├── manifest.json              # Manifest V3 extension configuration
├── package.json               # Test script and project metadata
├── background/
│   └── service-worker.js      # Background service worker coordinating scans & storage
├── content/
│   └── content.js             # In-page collector script running in isolated world
├── popup/
│   ├── popup.html             # Extension action popup
│   ├── popup.css              # Popup styling & micro-animations
│   └── popup.js               # Quick scan trigger & status preview
├── dashboard/
│   ├── dashboard.html         # Full companion dashboard view
│   ├── dashboard.css          # Responsive glassmorphic UI styling
│   └── dashboard.js           # Metrics, filtering, remediation, & history diffing
├── scanner/                   # Modular scanning libraries
│   ├── accessibilityScanner.js
│   ├── formScanner.js
│   ├── imageScanner.js
│   ├── linkScanner.js
│   ├── pageScanner.js
│   ├── performanceScanner.js
│   ├── scriptScanner.js
│   ├── securityScanner.js
│   └── structureScanner.js
├── diagnostics/
│   ├── diagnosticEngine.js    # Normalization, deduplication, & severity sorting
│   └── fixSuggestions.js      # Remediation advice & code snippet templates
├── storage/
│   └── storage.js             # Local storage manager, diff engine, & exporters
├── browser/
│   └── compatibility.js       # Cross-browser runtime adapter (Chrome/Edge/Firefox)
├── shared/
│   ├── messages.js            # Typed messaging contract
│   └── utils.js               # Formatting, HTML escaping, and ID helpers
├── assets/
│   └── icons/                 # Extension icons (16, 32, 48, 128 px)
└── tests/
    ├── diagnosticEngine.test.js
    ├── fixSuggestions.test.js
    ├── storage.test.js
    ├── compatibility.test.js
    ├── scanner.test.js
    └── run_all_tests.js       # Zero-dependency test runner
```

---

## 🧪 Running Automated Tests

The test suite runs with pure Node.js (v18+) without requiring external package installations:

```bash
# Run all unit tests
npm test

# Or execute test runner directly
node tests/run_all_tests.js
```

---

## 🛠️ Installation & Execution

See detailed browser-by-browser instructions in [docs/INSTALLATION.md](file:///c:/Users/adity/OneDrive/Desktop/Companion%20Dashboard/cross-browser-web-companion/docs/INSTALLATION.md).

### Quick Start (Chrome / Edge / Brave):
1. Open `chrome://extensions` (or `edge://extensions`).
2. Toggle on **Developer mode** in the top-right corner.
3. Click **Load unpacked**.
4. Select the `cross-browser-web-companion` directory.
5. Pin the **Web Development Companion** icon to your toolbar.
6. Navigate to any HTTP/HTTPS webpage and click the icon to scan!
