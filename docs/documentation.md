# Web Development Companion — Complete Technical Documentation

A comprehensive, production-grade guide detailing the architecture, design system, component hierarchy, authentication portal, storage isolation, and step-by-step implementation for building the **Web Development Companion Dashboard**.

---

## Table of Contents

1. [Project Overview & Core Philosophy](#1-project-overview--core-philosophy)
2. [Technology Stack](#2-technology-stack)
3. [Project Directory & File Structure](#3-project-directory--file-structure)
4. [Design System & CSS Architecture](#4-design-system--css-architecture)
   - [4.1 Color Tokens](#41-color-tokens)
   - [4.2 Typography & Sizing Scale](#42-typography--sizing-scale)
   - [4.3 Geometry, Shadows & Transitions](#43-geometry-shadows--transitions)
5. [Dashboard Layout & Structural Components](#5-dashboard-layout--structural-components)
   - [5.1 Navigation Sidebar](#51-navigation-sidebar)
   - [5.2 Sticky Header Top Bar](#52-sticky-header-top-bar)
   - [5.3 Overview Hero Quote](#53-overview-hero-quote)
   - [5.4 Audit Pipeline Stepper](#54-audit-pipeline-stepper)
   - [5.5 KPI Health Score Ring & Severity Stat Boxes](#55-kpi-health-score-ring--severity-stat-boxes)
   - [5.6 Technical Category Grid](#56-technical-category-grid)
   - [5.7 Quick Performance & Architecture Panels](#57-quick-performance--architecture-panels)
   - [5.8 Diagnostics & Remediation Explorer](#58-diagnostics--remediation-explorer)
   - [5.9 20-Point Security Baseline Checklist](#59-20-point-security-baseline-checklist)
   - [5.10 Scan History Table & Diff Engine](#510-scan-history-table--diff-engine)
   - [5.11 Settings, Weights & Privacy Management](#511-settings-weights--privacy-management)
6. [Official Authentication System](#6-official-authentication-system)
   - [6.1 The Blurred Dashboard Backdrop](#61-the-blurred-dashboard-backdrop)
   - [6.2 Frosted Glass Overlay & Elevated Card](#62-frosted-glass-overlay--elevated-card)
   - [6.3 Sign In Page (`login.html`)](#63-sign-in-page-loginhtml)
   - [6.4 Create Account Page (`register.html`)](#64-create-account-page-registerhtml)
   - [6.5 Compulsory Field Validation Engine](#65-compulsory-field-validation-engine)
7. [Storage Manager & Per-User Vault Isolation](#7-storage-manager--per-user-vault-isolation)
   - [7.1 Scoped Keys & Storage Structure](#71-scoped-keys--storage-structure)
   - [7.2 Authentication Controller (`AuthManager`)](#72-authentication-controller-authmanager)
   - [7.3 Data Export Formats (JSON, Markdown, CSV)](#73-data-export-formats-json-markdown-csv)
8. [Diagnostic Engine & Scanner Modules](#8-diagnostic-engine--scanner-modules)
   - [8.1 Normalization & Deduplication](#81-normalization--deduplication)
   - [8.2 Health Score Calculation Algorithm](#82-health-score-calculation-algorithm)
   - [8.3 Automated Fix Suggestions Engine](#83-automated-fix-suggestions-engine)
9. [Step-by-Step Implementation Guide](#9-step-by-step-implementation-guide)
10. [Automated Quality Assurance & Test Suites](#10-automated-quality-assurance--test-suites)

---

## 1. Project Overview & Core Philosophy

The **Web Development Companion** is a developer-grade auditing dashboard and browser extension built to inspect live websites and HTML applications for:
- **Accessibility (WCAG 2.1 AA)**
- **Client & Form Security**
- **Core Web Vitals & Performance Timing**
- **HTML5 Outline & Semantic Structure**
- **Broken Links & Insecure References**

### Core Architectural Principles
1. **100% Client-Side Privacy**: Zero external API calls, tracking scripts, or telemetry. All scans and calculations run locally.
2. **Per-User Vault Isolation**: Each user profile operates inside an isolated local storage vault. Logging out and re-logging in seamlessly restores that user's specific audit history.
3. **Evidence-Grounded Remediation**: Every identified defect is paired with verifiable evidence (DOM selector, code snippet) and an actionable fix suggestion.
4. **Mandatory Field Security**: All authentication portals strictly mandate every field to guarantee profile completeness.

---

## 2. Technology Stack

- **HTML5**: Semantic tags (`<main>`, `<aside>`, `<nav>`, `<header>`, `<section>`, `<article>`).
- **CSS3**: CSS Custom Properties (Variables), Flexbox, CSS Grid, Backdrop Filters (`blur`), Hardware-accelerated transitions.
- **Vanilla JavaScript (ES2022)**: Zero external runtime dependencies; high-performance asynchronous `async/await` and event dispatching.
- **Browser APIs**: `chrome.storage.local`, `performance.getEntriesByType('navigation')`, DOM Mutation & Query APIs.
- **Testing**: Node.js automated test runner using Node's native `assert` module.

---

## 3. Project Directory & File Structure

```text
cross-browser-web-companion/
├── assets/
│   ├── logo.png                       # Brand vector/raster emblem
│   └── icons/                         # Extension icons (16, 32, 48, 128px)
├── background/
│   └── service-worker.js              # Background message dispatcher & context menu handler
├── browser/
│   └── compatibility.js               # Chrome/Firefox API abstraction layer
├── content/
│   └── content.js                     # In-page DOM inspector running in isolated world
├── dashboard/
│   ├── dashboard.html                 # Main single-page dashboard application
│   ├── dashboard.css                  # Master dashboard stylesheet
│   ├── dashboard.js                   # Primary dashboard UI controller
│   ├── auth.css                       # Official authentication styling & blurred backdrops
│   ├── login.html                     # Official standalone Sign In page
│   ├── login.js                       # Sign In controller with compulsory validations
│   ├── register.html                  # Official standalone Create Account page
│   └── register.js                    # Registration controller with password verification
├── diagnostics/
│   ├── diagnosticEngine.js            # Normalizes raw scanner data into unified findings
│   └── fixSuggestions.js              # Actionable remediation code snippets & guidance
├── popup/
│   ├── popup.html                     # Browser action popup
│   ├── popup.css                      # Compact popup styling
│   └── popup.js                       # Popup scan trigger & active tab inspector
├── scanner/
│   ├── accessibilityScanner.js        # Contrast, alt text, ARIA, and labels
│   ├── formScanner.js                 # Insecure actions, autocomplete, label bindings
│   ├── imageScanner.js                # Missing dimensions, alt states, load errors
│   ├── linkScanner.js                 # Target=_blank vulnerabilities, dead links
│   ├── performanceScanner.js          # Navigation timing breakdown & DOM metrics
│   ├── scriptScanner.js               # External scripts, async/defer verification
│   ├── securityScanner.js             # Token leaks, inline handlers, CSP assessment
│   └── structureScanner.js            # Heading outline & semantic landmark density
├── storage/
│   └── storage.js                     # StorageManager & AuthManager with isolated vaults
├── tests/
│   ├── run_all_tests.js               # Master test runner (executes all 8 test suites)
│   ├── auth.test.js                   # Per-user vault isolation & compulsory auth tests
│   ├── compatibility.test.js          # Cross-browser API wrapper tests
│   ├── diagnosticEngine.test.js       # Scoring and normalization tests
│   ├── e2e_flow.test.js               # End-to-end full audit & export pipeline tests
│   ├── fixSuggestions.test.js         # Remediation suggestion verification
│   ├── scanner.test.js                # DOM collector tests
│   ├── storage.test.js                # CRUD & diff comparison tests
│   ├── verify_dom.js                  # HTML/JS ID synchronization tests
│   └── verify_selectors.js            # CSS query selector integrity tests
├── manifest.json                      # WebExtensions Manifest V3 specification
├── documentation.md                   # This master documentation file
└── package.json                       # Project configuration & npm test script
```

---

## 4. Design System & CSS Architecture

### 4.1 Color Tokens

```css
:root {
  /* Brand Palette: Light Sky Blue & Dark Cyan */
  --accent-sky: #C6FCFF;              /* Light Sky Blue branding */
  --accent-sky-subtle: #ebf9fa;       /* Card hover / active tab background */
  --primary: #0a8faa;                 /* Core dark cyan brand */
  --primary-hover: #087a92;           /* Interactive dark hover */
  --accent: #14b8d4;                  /* Vivid cyan accent stripe & rings */

  /* Surface & Base Colors */
  --bg-page: #f8fafc;                 /* Page background (Slate 50) */
  --bg-card: #ffffff;                 /* Pure white surface */
  --text-main: #0e2632;               /* Headings & primary text (Deep Slate) */
  --text-muted: #64748b;              /* Descriptions & subtitles (Slate 500) */
  --border-subtle: #e2e8f0;           /* Clean 1px border */
  --border-focus: #0a8faa;            /* Input focus outline */

  /* Severity Spectrum */
  --crit-color: #dc2626;              /* Critical defects (Red) */
  --crit-bg: #fef2f2;
  --high-color: #ea580c;              /* High priority (Orange) */
  --high-bg: #fff7ed;
  --med-color: #d97706;               /* Medium priority (Amber) */
  --med-bg: #fffbeb;
  --low-color: #0284c7;               /* Low priority / Best practices (Blue) */
  --low-bg: #f0f9ff;
  --clean-color: #16a34a;             /* Clean / Passed status (Green) */
  --clean-bg: #f0fdf4;
}
```

### 4.2 Typography & Sizing Scale

- **Base System Font**: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`
- **Hero Title**: `28px`, `font-weight: 800`, `letter-spacing: -0.4px`
- **Section Titles (`h3`)**: `15px`, `font-weight: 700`, `letter-spacing: -0.2px`
- **Card Subheadings (`h4`)**: `13px`, `font-weight: 600`
- **Body Text**: `12.5px` – `13px`, `line-height: 1.5`
- **Captions & Meta**: `11px` – `11.5px`, `color: var(--text-muted)`

### 4.3 Geometry, Shadows & Transitions

- **Border Radii**:
  - Small pills & buttons: `6px` (`--radius-sm`)
  - Standard cards & inputs: `10px` (`--radius-md`)
  - Elevated modal cards: `14px` (`--radius-lg`)
- **Shadows**:
  - Card base: `0 1px 3px rgba(0, 0, 0, 0.05)`
  - Card hover: `0 4px 12px rgba(10, 80, 100, 0.06)`
  - Modal elevate: `0 20px 48px -10px rgba(10, 80, 100, 0.28), 0 10px 24px -5px rgba(0, 0, 0, 0.12)`
- **Transition Curve**: `all 0.18s cubic-bezier(0.16, 1, 0.3, 1)`

---

## 5. Dashboard Layout & Structural Components

### 5.1 Navigation Sidebar (`<aside class="sidebar">`)
- **Dimensions**: Fixed `220px` width, `100vh` sticky height, `border-right: 1px solid var(--border-subtle)`.
- **Branding**: Contains the top logo (`.brand-full-logo`) with `14px` top margin.
- **Nav Buttons**: Accessible buttons with SVG icons, text labels, and dynamic issue badges (`#navFindingsCount`).
- **Audit Target Hub**: Contains URL input (`#customUrlInput`), scan trigger button (`#scanUrlBtn`), local HTML file uploader (`#htmlFileInput`), and active scan status pill.
- **User Row (`.sidebar-user-row`)**: Horizontal flex row displaying the active user avatar (`#sidebarUserAvatar`), username, workspace title, and the account management button.

### 5.2 Sticky Header Top Bar (`<header class="top-bar">`)
- Stays anchored at top (`height: 52px; z-index: 50;`).
- Left side: Page Title (`#pageMetaTitle`) and URL display (`#pageMetaUrl`).
- Right side: Quick URL Scan bar (`#topUrlInput` + `#topScanBtn`), Sidebar toggle button, Load Demo button (`#loadDemoBtn`), and Export dropdown menu (`#exportDropdownBtn`).

### 5.3 Overview Hero Quote (`.overview-hero-section`)
Clean, centered introduction placed ~`22px` below the header bar without unnecessary pills or duplicate buttons:
```html
<div class="overview-hero-section">
  <h1 class="overview-hero-quote">Better web experiences start here.</h1>
  <p class="overview-hero-sub">Automated diagnostics, accessibility standards, and code remediation — backed by real audits.</p>
</div>
```

### 5.4 Audit Pipeline Stepper (`.pipeline-card`)
Tracks the workflow from evidence ingestion to fix application:
- **Step 01**: Page Scan (Collect raw data)
- **Step 02**: Diagnostic Analysis (Gap mapping)
- **Step 03**: Remediation (Fix priority gaps) with a direct action button:
  `<button class="next-move-btn">Next Move →</button>` (clicking this immediately switches to Diagnostics & Fixes).

### 5.5 KPI Health Score Ring & Severity Stat Boxes (`.kpi-banner`)
A 2-column responsive grid:
- **Left Column**: Circular Health Score Card (`.score-card`).
  - Contains a `104px × 104px` circular SVG/border ring (`border: 5px solid var(--accent);`) displaying `0–100` score.
  - **Full 4-sided border**: `border: 1px solid var(--border-subtle); border-top: 3px solid var(--accent); border-radius: 10px;`.
- **Right Column**: Severity Grid (`.severity-stat-grid`).
  - 4 Stat Boxes: **Critical** (Red top border), **High Priority** (Orange top border), **Medium** (Amber top border), and **Low/Info** (Blue top border).
  - Clicking any stat box automatically switches to the Findings tab and applies that severity filter.

### 5.6 Technical Category Grid (`#categoryCardsGrid`)
8 distinct diagnostic domains rendered dynamically in a 4-column grid:
1. **Accessibility (a11y)**: Contrast ratios, image alt text, aria attributes.
2. **Security & Integrity**: Insecure HTTP forms, token leaks, window openers.
3. **Performance**: Navigation Timing, DOM element count, payload sizes.
4. **Structure & Headings**: H1–H6 hierarchy validation, semantic landmarks.
5. **Forms & Inputs**: Label associations, password autocomplete attributes.
6. **Links & Navigation**: Dead anchors, missing hrefs, mixed content links.
7. **Images & Media**: Missing alt attributes, dimensions, failed assets.
8. **Scripts & CDNs**: Script counts, async/defer coverage, third-party libraries.

Each card features clean, left-aligned titles (no emojis) and a right-aligned status pill (`Ready`, `Passed`, or `X Issues`).

### 5.7 Quick Performance & Architecture Panels
- **Performance Quick Stats**: Badges for DOM Load, Page Load, Total Elements, Total Scripts, and Images.
- **Page Architecture**: Headings total, H1 count, Form controls, and Semantic tag metrics.

### 5.8 Diagnostics & Remediation Explorer (`#tab-findings`)
- Filter bar with live text search (`#findingsSearch`), category dropdown (`#filterCategory`), and severity dropdown (`#filterSeverity`).
- Finding Card layout:
  - Header: Severity badge, category tag, finding title, and verification badge.
  - Affected element and code snippet evidence.
  - **Remediation Box**: Actionable fix explanation and suggested replacement code with a **Copy Code** button.

### 5.9 20-Point Security Baseline Checklist (`#tab-security`)
Pre-configured baseline evaluating 20 browser and server security constraints:
- Evaluates client-side detectable rules (e.g. Insecure HTTP Form Actions, `target="_blank"` opener leakage, Sensitive tokens in `localStorage`, Inline JavaScript event handlers).
- Clearly tags non-client-side rules with `Requires Backend Access` or `Requires Manual Review`.

### 5.10 Scan History Table & Diff Engine (`#tab-history`)
- Persistent history table displaying URL, Page Title, Timestamp, Health Score, and Issue Counts.
- **Comparison Engine**: Select 2 checkboxes to trigger the `Compare Selected` button.
- Generates a visual diff view categorizing:
  - **Added Issues** (new defects introduced)
  - **Resolved Issues** (defects fixed since previous scan)
  - **Unchanged Issues** (persisting findings)

### 5.11 Settings, Weights & Privacy Management (`#tab-settings`)
- Configurable penalty weights for Critical, High, and Medium issues.
- Toggles for active diagnostic categories.
- Local Storage statistics (`Stored Scans`, `Storage Used`, `Storage Engine`).
- History clear and complete JSON backup export buttons.

---

## 6. Official Authentication System

The application features dedicated official authentication pages matching the design shown in user screenshots.

### 6.1 The Blurred Dashboard Backdrop
Both `login.html` and `register.html` render a realistic mockup of the companion dashboard underneath a frosted glass overlay:

```html
<div class="dashboard-backdrop-mockup" aria-hidden="true">
  <div class="mock-sidebar">
    <img src="../assets/logo.png" alt="Logo" class="mock-logo">
    <div class="mock-nav-item active">Overview</div>
    <div class="mock-nav-item">Diagnostics & Fixes</div>
    <div class="mock-nav-item">Security Checklist</div>
    <div class="mock-nav-item">Scan History & Diff</div>
    <div class="mock-nav-item">Settings & Rules</div>
  </div>
  <div class="mock-main">
    <div class="mock-topbar">...</div>
    <div class="mock-content-body">
      <div class="mock-hero-quote">Better web experiences start here.</div>
      <div class="mock-pipeline-card"></div>
      <div class="mock-kpi-banner">...</div>
    </div>
  </div>
</div>
```

```css
.dashboard-backdrop-mockup {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  z-index: 1;
  pointer-events: none;
  filter: blur(8px) brightness(0.96);
  -webkit-filter: blur(8px) brightness(0.96);
  transform: scale(1.03); /* Eliminates blur border artifacts */
  display: flex;
}
```

### 6.2 Frosted Glass Overlay & Elevated Card
```css
.auth-page-overlay {
  position: fixed;
  inset: 0;
  z-index: 10;
  background: rgba(15, 38, 50, 0.42); /* Deep cyan-tinted backdrop */
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.auth-card {
  background: #ffffff;
  border: 1px solid #c2ece8;
  border-radius: 14px;
  padding: 30px 28px;
  box-shadow: 0 20px 48px -10px rgba(10, 80, 100, 0.28), 0 10px 24px -5px rgba(0, 0, 0, 0.12);
  width: 100%;
  max-width: 420px;
  position: relative;
  animation: authPopIn 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}
```

### 6.3 Sign In Page (`login.html`)
- Dedicated official sign-in portal.
- Fields: **Email or Username** (`#loginIdentifier`) and **Password** (`#loginPassword`) with password show/hide toggle (`#togglePwBtn`).
- Includes quick-test sign-in chips for `Developer` and `Aditya`.

### 6.4 Create Account Page (`register.html`)
- Dedicated account registration portal.
- Fields:
  1. **Full Name** (`#registerName`)
  2. **Email Address** (`#registerEmail`)
  3. **Workspace Title or Role** (`#registerRole`)
  4. **Password** (`#registerPassword`)
  5. **Confirm Password** (`#registerConfirmPassword`)
- Includes a direct return link to Dashboard and an toggle to switch to Sign In.

### 6.5 Compulsory Field Validation Engine
Every field is mandatory across both forms:
1. **HTML Level**: Every `<input>` tag contains the `required` attribute.
2. **Visual Indicators**: Every field label displays a compulsory star:
   `<span class="required-star" style="color: var(--danger); font-weight: 700;">*</span>`
   and the form displays: `<div class="form-compulsory-note">* All sections are compulsory</div>`.
3. **Client-Side JS Controller Validation**:
   Checks each field in sequential order. If any field is blank or invalid, it triggers an alert message and immediately focuses the cursor on the faulty input:
   ```javascript
   if (!name) {
     showAlert('Full Name is compulsory. Please enter your name.');
     registerName?.focus();
     return;
   }
   if (!email || !email.includes('@')) {
     showAlert('Email Address is compulsory. Please enter a valid email.');
     registerEmail?.focus();
     return;
   }
   if (!role) {
     showAlert('Workspace Title or Role is compulsory.');
     registerRole?.focus();
     return;
   }
   if (!password || password.length < 4) {
     showAlert('Password is compulsory and must be at least 4 characters long.');
     registerPassword?.focus();
     return;
   }
   if (!confirmPassword || password !== confirmPassword) {
     showAlert('Passwords do not match. Please re-enter.');
     registerConfirmPassword?.focus();
     return;
   }
   ```
4. **Backend / Storage Layer Guard**:
   `AuthManager.register` throws explicit errors if any parameter is omitted or empty.

---

## 7. Storage Manager & Per-User Vault Isolation

### 7.1 Scoped Keys & Storage Structure
All scan histories are isolated per user account to prevent data cross-contamination:

```javascript
const StorageManager = {
  _activeUserId: 'usr_default',

  setActiveUserId(userId) {
    this._activeUserId = userId || 'usr_default';
  },

  getActiveUserId() {
    return this._activeUserId;
  },

  // Scopes storage keys by active user: e.g. "usr_101__scan_history"
  _scopedKey(baseKey) {
    return `${this._activeUserId}__${baseKey}`;
  },

  async getHistory() {
    const key = this._scopedKey('scan_history');
    const store = StorageManager._storage();
    const stored = await store.get(key);
    return Array.isArray(stored[key]) ? stored[key] : [];
  },

  async saveScan(scan) {
    const key = this._scopedKey('scan_history');
    const history = await StorageManager.getHistory();
    history.unshift(scan);
    const store = StorageManager._storage();
    await store.set({ [key]: history.slice(0, 100) });
    return scan.id;
  }
};
```

### 7.2 Authentication Controller (`AuthManager`)
Handles user accounts, login, registration, and active session state:

```javascript
const AuthManager = {
  async register({ name, email, role, password }) {
    if (!name || !name.trim()) throw new Error('Full Name is required and compulsory');
    if (!email || !email.trim()) throw new Error('Email Address is required and compulsory');
    if (!role || !role.trim()) throw new Error('Workspace Title or Role is required and compulsory');
    if (!password || password.length < 4) throw new Error('Password must be at least 4 characters');

    const cleanEmail = email.trim().toLowerCase();
    const users = await AuthManager.getUsers();

    if (users.some(u => u.email.toLowerCase() === cleanEmail)) {
      throw new Error('An account with this email already exists');
    }

    const newUser = {
      id: 'usr_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: name.trim(),
      email: cleanEmail,
      role: role.trim(),
      password: password,
      createdAt: Date.now(),
    };

    users.push(newUser);
    const store = StorageManager._storage();
    await store.set({
      [AUTH_KEYS.USERS]: users,
      [AUTH_KEYS.CURRENT_USER]: newUser,
    });

    StorageManager.setActiveUserId(newUser.id);
    return newUser;
  },

  async login(identifier, password) {
    if (!identifier || !identifier.trim()) throw new Error('Email or Username is required and compulsory');
    if (!password) throw new Error('Password is required and compulsory');

    const cleanId = identifier.trim().toLowerCase();
    const users = await AuthManager.getUsers();

    const user = users.find(u =>
      (u.email.toLowerCase() === cleanId || u.name.toLowerCase() === cleanId) &&
      u.password === password
    );

    if (!user) throw new Error('Invalid email or password');

    const store = StorageManager._storage();
    await store.set({ [AUTH_KEYS.CURRENT_USER]: user });
    StorageManager.setActiveUserId(user.id);
    return user;
  },

  async logout() {
    const store = StorageManager._storage();
    await store.set({ [AUTH_KEYS.CURRENT_USER]: null });
    StorageManager.setActiveUserId('usr_guest');
  }
};
```

### 7.3 Data Export Formats (JSON, Markdown, CSV)
`StorageManager.exportScan(scanId, format)` generates downloadable reports:
- **JSON**: Complete machine-readable scan payload with raw scanner outputs.
- **Markdown (.md)**: Executive audit report with formatted tables and code blocks.
- **CSV**: Tabular issue list with Category, Rule ID, Severity, Title, Element, and Recommendation.

---

## 8. Diagnostic Engine & Scanner Modules

### 8.1 Normalization & Deduplication
The `DiagnosticEngine` consolidates findings from all modules into a consistent schema:
- `id`: Unique finding string (`finding_<timestamp>_<index>`).
- `category`: Domain identifier (`accessibility`, `security`, etc.).
- `ruleId`: Deterministic rule string (e.g. `img-alt-missing`, `form-insecure-action`).
- `severity`: `critical` | `high` | `medium` | `low` | `info`.
- `evidence`: Grounded DOM selector or attribute text.
- `recommendation`: Guidance statement.
- `fixSuggestion`: Actionable replacement code.

Deduplication uses a composite key: `${finding.ruleId}::${finding.affectedElement}`.

### 8.2 Health Score Calculation Algorithm
Overall page health score starts at `100` and applies deductions based on defect density:

$$\text{Score} = \max\left(0, 100 - (\text{Critical} \times 25 + \text{High} \times 10 + \text{Medium} \times 4 + \text{Low} \times 1)\right)$$

### 8.3 Automated Fix Suggestions Engine
`FixSuggestions.enrichAll(findings)` matches each `ruleId` to a curated remediation provider:
- Provides explanation of *why* the defect occurs.
- Provides compliant HTML/CSS/JS code examples.
- Links to authoritative references (W3C WCAG, MDN Web Docs, OWASP).

---

## 9. Step-by-Step Implementation Guide

To implement this dashboard from scratch:

1. **Step 1: Set Up HTML Skeletons**:
   - Create `dashboard.html`, `login.html`, and `register.html`.
   - Ensure all input IDs and buttons match those expected by the controller scripts.
2. **Step 2: Implement CSS Tokens & Layout**:
   - Load `dashboard.css` and `auth.css`.
   - Set up the sidebar flex container, sticky top bar, and the 240px + 1fr grid for the KPI banner.
3. **Step 3: Build the Storage & Auth Manager**:
   - Implement `StorageManager` with `_scopedKey(key)` for per-user isolation.
   - Implement `AuthManager` with default user seeds (`Developer`, `Aditya`).
4. **Step 4: Build the Diagnostic & Fix Engines**:
   - Implement `DiagnosticEngine.process` to ingest scanner results.
   - Implement `FixSuggestions.enrichAll` to attach remediation code.
5. **Step 5: Wire Up DOM Event Listeners**:
   - Tab switching (`nav-item` clicks).
   - Form submission handlers with compulsory field checks.
   - Filter inputs for keyword search and category/severity filtering.
   - Export dropdown actions.
6. **Step 6: Integrate Extension Manifest & Content Script**:
   - Add Manifest V3 configuration with `web_accessible_resources: ["dashboard/*"]`.
   - Dispatch messages between `content.js` and `service-worker.js`.

---

## 10. Automated Quality Assurance & Test Suites

The project features a master test runner executing 8 automated test suites with **zero external dependencies**:

```bash
npm test
# or: node tests/run_all_tests.js
```

### Test Suite Breakdown:

| Test Suite | File | What It Verifies |
|---|---|---|
| **Diagnostic Engine** | `diagnosticEngine.test.js` | Normalization, severity sorting, and duplicate pruning |
| **Fix Suggestions** | `fixSuggestions.test.js` | Remediation code enrichment and fallback safety |
| **Storage Manager** | `storage.test.js` | Scan persistence, history search, diff engine, exports |
| **Auth & Isolation** | `auth.test.js` | User login, compulsory registration, vault isolation |
| **Browser Compatibility** | `compatibility.test.js` | Cross-browser API bridge conformance |
| **Scanner Modules** | `scanner.test.js` | DOM checks (alt attributes, HTTP form actions, openers) |
| **DOM & ID Integrity** | `verify_dom.js` | Verifies all 115+ IDs in HTML match JavaScript hooks |
| **End-to-End Pipeline** | `e2e_flow.test.js` | Full scan simulation, fix generation, and vault export |

All 8 test suites pass with 100% success rate.
