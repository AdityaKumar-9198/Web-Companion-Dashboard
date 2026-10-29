/**
 * Background Service Worker (Manifest V3)
 * Coordinates scanning, manages local storage, and handles dashboard/popup requests.
 */

import '../shared/messages.js';
import '../shared/utils.js';
import '../storage/storage.js';
import '../diagnostics/diagnosticEngine.js';
import '../diagnostics/fixSuggestions.js';
import '../browser/compatibility.js';

const Messages = globalThis.Messages;
const StorageManager = globalThis.StorageManager;
const DiagnosticEngine = globalThis.DiagnosticEngine;
const FixSuggestions = globalThis.FixSuggestions;
const BrowserCompat = globalThis.BrowserCompat;

// In-memory status tracking
let activeScanState = {
  isScanning: false,
  tabId: null,
  url: null,
  status: 'idle',
  error: null,
  progress: 0,
};

// Initialise defaults on install
chrome.runtime.onInstalled.addListener(async (details) => {
  try {
    const settings = await StorageManager.getSettings();
    if (!settings) {
      await StorageManager.saveSettings({
        maxHistoryItems: 100,
        linkCheckEnabled: true,
        linkCheckTimeout: 8000,
        theme: 'dark',
      });
    }

    // Context menus
    if (chrome.contextMenus) {
      chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
          id: 'menu-scan-page',
          title: 'Analyse Page with Web Companion',
          contexts: ['page', 'action']
        });
        chrome.contextMenus.create({
          id: 'menu-open-dashboard',
          title: 'Open Companion Dashboard',
          contexts: ['page', 'action']
        });
      });
    }
  } catch (err) {
    console.error('[WebCompanion SW] Error initialising settings/menus:', err);
  }
});

// Context menu click listener
if (chrome.contextMenus && chrome.contextMenus.onClicked) {
  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === 'menu-scan-page') {
      try {
        await handleScanRequest({ tabId: tab.id, url: tab.url, title: tab.title });
        await handleOpenDashboard();
      } catch (err) {
        console.error('[WebCompanion] Context menu scan failed:', err);
      }
    } else if (info.menuItemId === 'menu-open-dashboard') {
      await handleOpenDashboard();
    }
  });
}

// Commands keyboard shortcuts listener
if (chrome.commands && chrome.commands.onCommand) {
  chrome.commands.onCommand.addListener(async (command) => {
    if (command === 'open-dashboard') {
      await handleOpenDashboard();
    }
  });
}

/**
 * Message router
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message !== 'object') return false;

  const { action, type, ...payload } = message;
  const messageType = action || type;

  // Dispatch by type
  switch (messageType) {
    case Messages.SCAN_PAGE:
    case 'SCAN_PAGE':
      handleScanRequest(payload, sender)
        .then(result => sendResponse(result))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true; // Keep channel open for async response

    case 'SCAN_CUSTOM_URL':
    case 'SCAN_URL':
      handleScanCustomUrl(payload.url)
        .then(result => sendResponse(result))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;

    case Messages.GET_SCAN_STATUS:
    case 'GET_SCAN_STATUS':
      sendResponse({ success: true, state: activeScanState });
      return false;

    case Messages.GET_SCAN_RESULTS:
    case 'GET_SCAN_RESULTS':
      handleGetScanResults(payload.scanId)
        .then(result => sendResponse(result))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;

    case Messages.REQUEST_LATEST:
    case 'REQUEST_LATEST':
      StorageManager.getLastScan()
        .then(scan => sendResponse({ success: true, scan }))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;

    case Messages.GET_HISTORY:
    case 'GET_HISTORY':
      StorageManager.getHistory()
        .then(history => sendResponse({ success: true, history }))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;

    case Messages.DELETE_SCAN:
    case 'DELETE_SCAN':
      StorageManager.deleteScan(payload.scanId)
        .then(deleted => sendResponse({ success: true, deleted }))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;

    case Messages.CLEAR_HISTORY:
    case 'CLEAR_HISTORY':
      StorageManager.clearHistory()
        .then(() => sendResponse({ success: true }))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;

    case Messages.COMPARE_SCANS:
    case 'COMPARE_SCANS':
      StorageManager.compareScans(payload.scanIdA, payload.scanIdB)
        .then(diff => sendResponse({ success: true, diff }))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;

    case Messages.EXPORT_SCAN:
    case 'EXPORT_SCAN':
      handleExportScan(payload.scanId, payload.format)
        .then(data => sendResponse({ success: true, data }))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;

    case Messages.OPEN_DASHBOARD:
    case 'OPEN_DASHBOARD':
      handleOpenDashboard(payload.scanId)
        .then(() => sendResponse({ success: true }))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;

    case 'HIGHLIGHT_ELEMENT':
      handleHighlightElement(payload)
        .then(() => sendResponse({ success: true }))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;

    default:
      return false;
  }
});

async function handleHighlightElement({ tabId, selector, elementText }) {
  let targetTabId = tabId;
  if (!targetTabId) {
    const tabs = await chrome.tabs.query({});
    const pageTab = tabs.find(t => t.url && !t.url.startsWith('chrome-extension://') && (t.url.startsWith('http://') || t.url.startsWith('https://')));
    if (pageTab) targetTabId = pageTab.id;
  }
  if (!targetTabId) return;
  await chrome.tabs.sendMessage(targetTabId, { type: 'HIGHLIGHT_ELEMENT', selector, elementText });
}

/**
 * Scan a user-provided custom URL
 */
async function handleScanCustomUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    throw new Error('Please enter a valid URL.');
  }

  let targetUrl = rawUrl.trim();
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    if (targetUrl.startsWith('localhost') || targetUrl.startsWith('127.0.0.1')) {
      targetUrl = 'http://' + targetUrl;
    } else {
      targetUrl = 'https://' + targetUrl;
    }
  }

  // Validate URL format
  try {
    new URL(targetUrl);
  } catch {
    throw new Error(`Invalid URL format: "${targetUrl}"`);
  }

  // Check if a tab with this URL is already open
  const tabs = await chrome.tabs.query({});
  let targetTab = tabs.find(t => t.url && (t.url === targetUrl || t.url.startsWith(targetUrl)));

  if (!targetTab) {
    // Create new tab in background to audit
    targetTab = await chrome.tabs.create({ url: targetUrl, active: false });

    // Wait for the tab to complete loading
    await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        chrome.tabs.onUpdated.removeListener(onTabUpdated);
        resolve(); // Continue even if timeout
      }, 12000);

      function onTabUpdated(id, info) {
        if (id === targetTab.id && info.status === 'complete') {
          clearTimeout(timeout);
          chrome.tabs.onUpdated.removeListener(onTabUpdated);
          resolve();
        }
      }
      chrome.tabs.onUpdated.addListener(onTabUpdated);
    });

    // Brief stabilization pause for scripts/DOM
    await new Promise(r => setTimeout(r, 400));
  }

  return await handleScanRequest({ tabId: targetTab.id, url: targetUrl, title: targetTab.title });
}

/**
 * Perform a full page scan
 */
async function handleScanRequest(payload = {}, sender) {
  let tabId = payload.tabId;
  let tabUrl = payload.url;
  let tabTitle = payload.title;

  // Resolve target tab if missing or if pointing to the extension dashboard
  if (!tabId || (tabUrl && tabUrl.startsWith('chrome-extension://'))) {
    // 1. Search in current window for an http/https tab
    const tabsInWindow = await chrome.tabs.query({ currentWindow: true });
    const pageTab = tabsInWindow.find(t => t.url && (t.url.startsWith('http://') || t.url.startsWith('https://')) && !t.url.startsWith('chrome-extension://'));
    if (pageTab) {
      tabId = pageTab.id;
      tabUrl = pageTab.url;
      tabTitle = pageTab.title;
    } else {
      // 2. Search across all windows
      const allTabs = await chrome.tabs.query({});
      const anyWebTab = allTabs.find(t => t.url && (t.url.startsWith('http://') || t.url.startsWith('https://')) && !t.url.startsWith('chrome-extension://'));
      if (anyWebTab) {
        tabId = anyWebTab.id;
        tabUrl = anyWebTab.url;
        tabTitle = anyWebTab.title;
      }
    }
  }

  if (!tabId) {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab && activeTab.id) {
      tabId = activeTab.id;
      tabUrl = activeTab.url;
      tabTitle = activeTab.title;
    }
  }

  if (!tabId || !tabUrl) {
    throw new Error('No active web page found to scan. Please enter a URL or open a website.');
  }

  // Validate URL protocol
  if (!tabUrl.startsWith('http://') && !tabUrl.startsWith('https://')) {
    throw new Error(`Cannot scan browser internal page (${tabUrl}). Web Companion only scans http:// and https:// URLs. Enter a website URL above to audit it.`);
  }

  activeScanState = {
    isScanning: true,
    tabId,
    url: tabUrl,
    status: 'running',
    error: null,
    progress: 10,
  };

  try {
    updateBadge('...', '#3b82f6');

    // Ensure content script is responsive, inject if needed
    let isReady = false;
    try {
      const pingResp = await chrome.tabs.sendMessage(tabId, { type: 'PING' });
      if (pingResp && pingResp.status === 'ready') {
        isReady = true;
      }
    } catch {
      isReady = false;
    }

    if (!isReady) {
      // Inject content script dynamically
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content/content.js'],
      });
      // Brief pause to allow initialization
      await new Promise(r => setTimeout(r, 150));
    }

    activeScanState.progress = 40;

    // Send scan request to content script
    const scanResponse = await chrome.tabs.sendMessage(tabId, { type: Messages.SCAN_PAGE });
    if (!scanResponse) {
      throw new Error('No response received from page content script.');
    }
    if (scanResponse.error) {
      throw new Error(`Content script error: ${scanResponse.error}`);
    }

    const rawData = scanResponse.data;
    activeScanState.progress = 75;

    // Process raw data through diagnostic engine
    const processedScan = DiagnosticEngine.process(rawData, tabUrl, tabTitle || 'Untitled Page');

    // Enrich findings with remediation suggestions
    if (Array.isArray(processedScan.findings)) {
      processedScan.findings = FixSuggestions.enrichAll(processedScan.findings);
    }

    // Save to local storage
    const savedId = await StorageManager.saveScan(processedScan);
    processedScan.id = savedId;

    activeScanState = {
      isScanning: false,
      tabId,
      url: tabUrl,
      status: 'complete',
      error: null,
      progress: 100,
    };

    // Update badge with critical/high issue count
    const issueCount = (processedScan.summary?.critical || 0) + (processedScan.summary?.high || 0);
    if (issueCount > 0) {
      updateBadge(String(issueCount), '#ef4444');
    } else {
      updateBadge('OK', '#10b981');
    }

    return {
      success: true,
      scan: processedScan,
      scanId: savedId,
    };
  } catch (err) {
    activeScanState = {
      isScanning: false,
      tabId,
      url: tabUrl,
      status: 'error',
      error: err.message,
      progress: 0,
    };
    updateBadge('ERR', '#ef4444');
    throw err;
  }
}

/**
 * Fetch scan results by ID or latest
 */
async function handleGetScanResults(scanId) {
  if (scanId) {
    const scan = await StorageManager.getScan(scanId);
    if (!scan) throw new Error(`Scan not found: ${scanId}`);
    return { success: true, scan };
  }
  const latest = await StorageManager.getLastScan();
  return { success: true, scan: latest };
}

/**
 * Open the companion dashboard in a tab
 */
async function handleOpenDashboard(scanId) {
  const dashboardUrl = chrome.runtime.getURL(
    scanId ? `dashboard/dashboard.html?scanId=${encodeURIComponent(scanId)}` : 'dashboard/dashboard.html'
  );

  // Check if a dashboard tab is already open
  const tabs = await chrome.tabs.query({});
  const existingTab = tabs.find(t => t.url && t.url.startsWith(chrome.runtime.getURL('dashboard/dashboard.html')));

  if (existingTab && existingTab.id) {
    await chrome.tabs.update(existingTab.id, { url: dashboardUrl, active: true });
    if (existingTab.windowId) {
      await chrome.windows.update(existingTab.windowId, { focused: true });
    }
  } else {
    await chrome.tabs.create({ url: dashboardUrl });
  }
}

/**
 * Export scan results
 */
async function handleExportScan(scanId, format = 'json') {
  return await StorageManager.exportScan(scanId, format);
}

/**
 * Update the extension icon badge
 */
function updateBadge(text, color) {
  try {
    if (chrome.action) {
      chrome.action.setBadgeText({ text: text || '' });
      if (color) {
        chrome.action.setBadgeBackgroundColor({ color });
      }
    }
  } catch (err) {
    console.debug('[WebCompanion] Badge update ignored:', err);
  }
}
