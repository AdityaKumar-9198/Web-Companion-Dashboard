# Architecture & Technical Design

## 🏗️ System Overview

The **Web Development Companion** is structured around an event-driven, decoupled architecture designed to maintain security, zero external network footprint, and strict boundary isolation between web pages and developer tooling.

```
┌────────────────────────────────────────────────────────┐
│                      Web Browser                       │
│                                                        │
│  ┌────────────────────────┐  ┌──────────────────────┐  │
│  │   Target Webpage DOM   │  │   Extension Popup    │  │
│  │  (Isolated World Mode) │  │    (Quick Scan UI)   │  │
│  └───────────┬────────────┘  └──────────┬───────────┘  │
│              │                          │              │
│              ▼                          ▼              │
│  ┌────────────────────────┐  ┌──────────────────────┐  │
│  │     Content Script     │  │ Companion Dashboard  │  │
│  │    (content.js)        │  │   (dashboard.html)   │  │
│  └───────────┬────────────┘  └──────────┬───────────┘  │
│              │                          │              │
│              └───────────┐  ┌───────────┘              │
│                          ▼  ▼                          │
│               ┌────────────────────────┐               │
│               │   Background Service   │               │
│               │         Worker         │               │
│               │  (service-worker.js)   │               │
│               └───────────┬────────────┘               │
│                           │                            │
│              ┌────────────┼────────────┐               │
│              ▼            ▼            ▼               │
│       ┌────────────┐┌────────────┐┌────────────┐       │
│       │ Diagnostics││ Fix Engine ││  Storage   │       │
│       │   Engine   ││(Suggestions││  Manager   │       │
│       └────────────┘└────────────┘└────────────┘       │
└────────────────────────────────────────────────────────┘
```

---

## 🔒 Security & Privacy Principles

1. **Zero External Data Transmission**:
   - All analysis logic executes 100% locally on the user's machine.
   - Findings, scan metrics, and history are stored exclusively in `chrome.storage.local`.
   - No external analytics, CDNs, or telemetry endpoints are contacted.

2. **Isolated World DOM Inspection**:
   - `content.js` runs in Chrome/Firefox's isolated world context.
   - The webpage's own JavaScript cannot intercept, read, or tamper with the extension's execution or storage.

3. **Safe Value Sanitisation**:
   - Neither the scanner nor the storage manager ever reads, records, or stores user-entered inputs (e.g. text typed into passwords, search bars, or personal data fields).
   - Only structural metadata (`name`, `type`, `autocomplete`, `id`, `aria-*`) is gathered for accessibility and security auditing.

---

## 🧩 Core Subsystems

### 1. Collector & Scanner Modules (`scanner/`)
- Each scanner focuses on an isolated concern:
  - `accessibilityScanner.js`: Computes luminance ratios for text contrast, inspects alt tags, checks form label associations, verifies semantic landmarks and ARIA attributes.
  - `securityScanner.js`: Audits HTTP forms on HTTPS origins, scans for token keys in `localStorage`, checks `rel="noopener noreferrer"`, assesses inline event handlers, and maps out the 20-point checklist.
  - `performanceScanner.js`: Uses `window.performance.timing` / `getEntriesByType('navigation')` to break down network and rendering phases.
  - `structureScanner.js`: Audits heading hierarchy (`h1` through `h6`) without gaps, measures semantic element density.
  - `formScanner.js`: Audits input accessibility, autocomplete hints, form actions.
  - `linkScanner.js`: Evaluates internal vs external link targets, missing anchor text, insecure links.
  - `imageScanner.js`: Verifies `alt` text and dimensional attributes.

### 2. Diagnostic & Remediation Engine (`diagnostics/`)
- `diagnosticEngine.js`:
  - Ingests raw data payloads from collectors.
  - Deduplicates identical findings across modules.
  - Assigns unique finding identifiers.
  - Normalises severity ratings: `critical`, `high`, `medium`, `low`, `info`.
  - Computes categorical and aggregate defect summaries.
- `fixSuggestions.js`:
  - Contains curated, actionable code snippets and explanations for developers.
  - Enriches findings with concrete remediation guidelines before storage and display.

### 3. Persistent Local Storage, Auth & Diff Engine (`storage/`)
- `StorageManager` in `storage.js`:
  - Limits historical records to prevent storage quota exhaustion (`MAX_HISTORY_ITEMS = 100`).
  - Implements per-user storage key scoping (`StorageManager._scopedKey`) providing complete data isolation across registered accounts.
  - Supports search querying across URL and title.
  - Provides a differential analysis algorithm (`compareScans`):
    - Identifies `added` findings (introduced in subsequent scan).
    - Identifies `resolved` findings (fixed between scans).
    - Identifies `unchanged` findings.
  - Serialises reports to JSON, Markdown, or CSV.
- `AuthManager` in `storage.js`:
  - Provides client-side local authentication with persistent account registration and login.
  - Scopes active scan vaults and user preferences per account (`usr_<id>__scan_history`).
  - Supports account switching, guest mode, and secure logout while retaining isolated history for each user.

### 4. Cross-Browser Compatibility Layer (`browser/compatibility.js`)
- Abstracts difference between `chrome.*` (Callback-based MV3) and `browser.*` (Promise-based Firefox MV2/MV3) APIs.
- Normalises `tabs`, `runtime`, `scripting`, and `storage` invocations.
