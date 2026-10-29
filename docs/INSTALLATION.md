# Installation & Execution Guide

The **Cross-Browser Web Development Companion** is built using the standard WebExtensions Manifest V3 specification and is compatible across all major Chromium browsers (Chrome, Edge, Brave, Opera) as well as Firefox.

---

## 📋 Prerequisites
- A modern desktop web browser:
  - Google Chrome (v88+)
  - Microsoft Edge (v88+)
  - Mozilla Firefox (v109+)
  - Brave / Opera / Vivaldi
- Node.js (v18.0.0 or higher) for running local automated tests.

---

## 🚀 Loading into Google Chrome, Brave, or Opera

1. Open your browser and navigate to the Extensions management page:
   - Chrome: `chrome://extensions`
   - Brave: `brave://extensions`
   - Opera: `opera://extensions`
2. In the top-right corner, toggle **Developer mode** to the **ON** position.
3. Click the **Load unpacked** button in the top left.
4. In the file dialog, navigate to this project folder and select:
   ```
   cross-browser-web-companion
   ```
5. The extension **Web Development Companion** will appear in your installed extensions list.
6. Click the extension puzzle icon in your browser toolbar and click the **Pin** icon next to *Web Development Companion* for instant access.

---

## 🌐 Loading into Microsoft Edge

1. Open Edge and go to `edge://extensions`.
2. In the left navigation menu, turn on the toggle switch for **Developer mode**.
3. Click the **Load unpacked** button.
4. Select the `cross-browser-web-companion` directory.
5. The extension is now active and ready to analyse webpages.

---

## 🦊 Loading into Mozilla Firefox (Temporary Add-on)

1. Open Firefox and go to `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on...**.
3. Navigate into the `cross-browser-web-companion` directory and select `manifest.json`.
4. The extension will be loaded and active for your session.

---

## 🎯 How to Use the Extension

### 1. Quick Scan via Toolbar Popup
1. Open any public or local development webpage (e.g. `http://localhost:3000`, `http://127.0.0.1:8080`, or any `https://` website).
2. Click the **Web Companion** icon in the toolbar.
3. The popup will display the target tab's title and URL.
4. Click **Scan Current Page**.
5. Within 1–2 seconds, the scan will complete, showing:
   - Severity distribution (Critical, High, Medium, Low)
   - Category statuses (Accessibility, Security, Performance, Structure, Forms, Links)
6. Click **View in Dashboard** to open the full analysis suite.

### 2. Deep Analysis in the Companion Dashboard
The dashboard provides 4 distinct analysis workspaces:
1. **Overview & Metrics**:
   - Page Health Score (0–100) dynamically calculated based on severity and defect density.
   - Core performance metrics (DOM Content Loaded, page load time, element counts).
   - Category breakdown cards that take you directly to filtered issues.
2. **Diagnostics & Fixes**:
   - Filter issues by category or severity, or use live text search.
   - Inspect affected DOM elements, rule definitions, and specific evidence.
   - Review actionable remediation guides with formatted code snippets.
   - Use the **Copy Fix** button to copy proposed code directly to your clipboard.
3. **Security Checklist**:
   - Inspect the 20-point Web Security Baseline.
   - Understand client-side verification boundaries versus server-only protections.
4. **Scan History & Diff**:
   - View all prior scans stored locally in `chrome.storage.local`.
   - Re-inspect any past scan at any time.
   - Select **two scans** and click **Compare Selected** to see a side-by-side diff of Newly Added, Resolved, and Unchanged issues.
   - Export reports to **JSON**, **Markdown**, or **CSV**.
