# Companion Dashboard Documentation

## Overview
The Companion Dashboard is a Chrome extension UI that provides a comprehensive audit of a web page, including health scores, KPIs, findings, a security checklist, scan history, and configurable settings. It features a modern glass‑morphic dark theme with smooth animations and responsive layout.

## Project Structure
```
cross-browser-web-companion/
├─ dashboard/
│  ├─ dashboard.html          # Main UI markup
│  ├─ dashboard.css           # Core styles (themes, layout)
│  ├─ dashboard_extra.css     # Additional UI tweaks (sidebar toggle, etc.)
│  ├─ dashboard.js            # UI controller & interactions
│  └─ documentation.md        # **This file**
├─ popup/
├─ content/
├─ storage/
└─ shared/
```

## Key Features
- **Health Score** with animated ring and colour‑coded feedback.
- **KPI banner** showing counts for critical, high, medium, and low issues.
- **Category cards** for quick navigation to findings by domain.
- **Findings explorer** with search, category and severity filters, remediation suggestions, and copy‑fix button.
- **Security checklist** with status badges.
- **Scan history** table with view, delete, compare‑diff, and export options.
- **Settings panel** to adjust theme, max history, link‑check options, scoring weights, and enable/disable diagnostic categories.
- **Sidebar toggle** button to collapse/expand the navigation pane.
- Fully **responsive** design, works on various screen sizes.

## UI Structure (dashboard.html)
- **Sidebar (`<aside class="sidebar">`)** – navigation tabs (`Overview`, `Diagnostics`, `Security`, `History`, `Settings`).
- **Main content (`<main class="main-content">`)** – contains the tab panes:
  - `#tab-overview` – health score, KPI grid, quick stats.
  - `#tab-findings` – filter toolbar and dynamically populated findings list.
  - `#tab-security` – security checklist.
  - `#tab-history` – history table and diff view.
  - `#tab-settings` – configuration UI.
- **Top bar** – contains *Load Demo Data*, **Sidebar Toggle**, and **Theme Toggle** buttons.

## Styles (dashboard.css & dashboard_extra.css)
- CSS variables (`--bg-body`, `--text-main`, `--primary`, etc.) control colour palettes for dark and light themes.
- Glass‑morphic cards use `rgba(..., 0.7)` backgrounds with `backdrop-filter: blur()`.
- Micro‑interactions via `transition: var(--transition)` for hover effects, button presses, and sidebar collapse.
- `dashboard_extra.css` adds the toggle button styling and collapsed sidebar rules.

## JavaScript (dashboard.js)
- **DOM ready** – caches frequently used elements, sets up event listeners.
- **Theme handling** – `applyTheme()` toggles `theme-light` / `theme-dark` classes and persists the choice via `StorageManager`.
- **Demo data** – `loadDemoBtn` loads a pre‑generated sample scan.
- **Re‑scan** – communicates with the background script to scan the active tab.
- **Render functions** – `renderOverview`, `applyFindingsFilters`, `renderFindingsList`, `renderSecurityChecklist`, `loadHistoryTable`, `renderDiff`.
- **Settings** – load and save via `StorageManager`; includes rule toggles for each diagnostic category.
- **Sidebar toggle** – new button (`#sidebarToggleBtn`) toggles `.collapsed` on the sidebar and `.sidebar-collapsed` on the main container.

## Storage (storage.js)
Provides a thin wrapper around `chrome.storage.local` for:
- Saving/loading scans, settings, and history.
- Exporting scans as JSON/CSV/Markdown.
- Retrieving storage usage information.

## Usage Workflow
1. Click the extension icon to open the dashboard.
2. Press **Load Demo Data** to see a populated UI instantly.
3. Press **Re‑Scan Active Tab** (requires unpacked extension) to audit the current page.
4. Explore findings, apply fixes, and adjust settings as needed.
5. Use the **Export** dropdown to download reports, or select two scans from History and click **Compare Selected** to view a diff.
6. Toggle the **Sidebar** button to maximize the content area.

## Development
- Open Chrome → Extensions → **Load unpacked** and select the `cross-browser-web-companion` folder.
- All UI files are static; no build step is required. Modify `dashboard.html`, `dashboard.css`, or `dashboard.js` and reload the extension to see changes.
- To add new diagnostic categories, update the HTML block under **Active Diagnostic Categories** and adjust the corresponding logic in `dashboard.js` (rule mapping).

## Future Improvements
- Automatic dark‑mode detection based on system preferences.
- Persist collapsed sidebar state across sessions.
- Unit tests for `dashboard.js` with Jest.
- Backend integration for remote scan storage.
- Additional themes (high‑contrast, custom colour palettes).

---
*Generated on 2026‑10‑28 by Antigravity AI.*
