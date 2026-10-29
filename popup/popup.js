/**
 * Popup Script — controls quick-scan actions and high-level summaries.
 */

'use strict';

document.addEventListener('DOMContentLoaded', async () => {
  const pageTitleEl = document.getElementById('pageTitle');
  const pageUrlEl = document.getElementById('pageUrl');
  const pageStatusDot = document.getElementById('pageStatusDot');
  const scanBtn = document.getElementById('scanBtn');
  const scanBtnText = document.getElementById('scanBtnText');
  const btnSpinner = document.getElementById('btnSpinner');
  const scanIcon = document.getElementById('scanIcon');
  const progressBarContainer = document.getElementById('progressBarContainer');
  const progressBarFill = document.getElementById('progressBarFill');
  const noticeBox = document.getElementById('noticeBox');
  const resultsSection = document.getElementById('resultsSection');
  const openDashboardBtn = document.getElementById('openDashboardBtn');
  const viewDashboardFullBtn = document.getElementById('viewDashboardFullBtn');
  const exportQuickBtn = document.getElementById('exportQuickBtn');

  const countCritical = document.getElementById('countCritical');
  const countHigh = document.getElementById('countHigh');
  const countMedium = document.getElementById('countMedium');
  const countLow = document.getElementById('countLow');
  const categoriesList = document.getElementById('categoriesList');
  const scanTimestamp = document.getElementById('scanTimestamp');

  let currentTab = null;
  let latestScanId = null;

  // Initialize view
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTab = tabs[0];

    if (!currentTab || !currentTab.url) {
      showNotice('No active tab detected.', 'warning');
      scanBtn.disabled = true;
      return;
    }

    pageTitleEl.textContent = currentTab.title || 'Untitled Tab';
    pageUrlEl.textContent = currentTab.url;

    const isHttp = currentTab.url.startsWith('http://') || currentTab.url.startsWith('https://');
    if (!isHttp) {
      pageStatusDot.className = 'status-dot warning';
      scanBtn.disabled = true;
      showNotice('Web Companion only scans standard web pages (HTTP/HTTPS). Browser system pages cannot be analysed.', 'warning');
      return;
    }

    pageStatusDot.className = 'status-dot active';

    // Fetch latest scan data from background
    chrome.runtime.sendMessage({ action: 'REQUEST_LATEST' }, (response) => {
      if (chrome.runtime.lastError) return;
      if (response && response.success && response.scan) {
        // If scan matches current URL, show it
        if (response.scan.url === currentTab.url || !latestScanId) {
          latestScanId = response.scan.id;
          renderScanSummary(response.scan);
        }
      }
    });

  } catch (err) {
    showNotice(err.message, 'error');
  }

  // Scan button click handler
  scanBtn.addEventListener('click', async () => {
    if (!currentTab) return;

    setScanLoading(true);
    clearNotice();

    try {
      chrome.runtime.sendMessage(
        { action: 'SCAN_PAGE', tabId: currentTab.id, url: currentTab.url, title: currentTab.title },
        (response) => {
          setScanLoading(false);

          if (chrome.runtime.lastError) {
            showNotice(chrome.runtime.lastError.message, 'error');
            return;
          }

          if (!response || !response.success) {
            showNotice(response?.error || 'Scan failed to complete.', 'error');
            return;
          }

          latestScanId = response.scanId || response.scan?.id;
          renderScanSummary(response.scan);
          showNotice('Scan completed successfully!', 'info');
          setTimeout(clearNotice, 4000);
        }
      );
    } catch (err) {
      setScanLoading(false);
      showNotice(err.message, 'error');
    }
  });

  // Open Dashboard triggers
  const openDashboard = () => {
    chrome.runtime.sendMessage({ action: 'OPEN_DASHBOARD', scanId: latestScanId });
    window.close();
  };

  openDashboardBtn.addEventListener('click', openDashboard);
  viewDashboardFullBtn.addEventListener('click', openDashboard);

  // Quick Export JSON
  exportQuickBtn.addEventListener('click', () => {
    if (!latestScanId) {
      showNotice('Please run a scan before exporting.', 'warning');
      return;
    }

    chrome.runtime.sendMessage({ action: 'EXPORT_SCAN', scanId: latestScanId, format: 'json' }, (res) => {
      if (chrome.runtime.lastError || !res?.success) {
        showNotice(res?.error || 'Failed to export scan', 'error');
        return;
      }

      const blob = new Blob([res.data.content], { type: res.data.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.data.filename;
      a.click();
      URL.revokeObjectURL(url);
    });
  });

  function setScanLoading(loading) {
    scanBtn.disabled = loading;
    if (loading) {
      btnSpinner.hidden = false;
      scanIcon.hidden = true;
      scanBtnText.textContent = 'Scanning Page...';
      progressBarContainer.hidden = false;
      progressBarFill.style.width = '30%';
      let step = 30;
      const interval = setInterval(() => {
        if (!scanBtn.disabled) {
          clearInterval(interval);
          progressBarFill.style.width = '100%';
          setTimeout(() => { progressBarContainer.hidden = true; }, 300);
          return;
        }
        step = Math.min(step + 15, 90);
        progressBarFill.style.width = `${step}%`;
      }, 400);
    } else {
      btnSpinner.hidden = true;
      scanIcon.hidden = false;
      scanBtnText.textContent = 'Scan Current Page';
      progressBarFill.style.width = '100%';
      setTimeout(() => { progressBarContainer.hidden = true; }, 300);
    }
  }

  function renderScanSummary(scan) {
    if (!scan) return;
    resultsSection.hidden = false;

    // Severity counts
    const s = scan.summary || {};
    countCritical.textContent = s.critical || 0;
    countHigh.textContent = s.high || 0;
    countMedium.textContent = s.medium || 0;
    countLow.textContent = s.low || 0;

    if (scan.timestamp) {
      scanTimestamp.textContent = new Date(scan.timestamp).toLocaleTimeString();
    }

    // Category breakdown — SVG icons in theme color (no emojis)
    const categoryIcons = {
      accessibility: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="4" r="2"/><path d="M18 9h-7l-2 5l-2-1"/><path d="M6 14l3-1l2 6l3-1"/></svg>`,
      security: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
      performance: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
      structure: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`,
      forms: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
      links: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
      images: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
      scripts: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`
    };

    const catCounts = s.byCategory || {};
    categoriesList.innerHTML = '';

    const categories = ['accessibility', 'security', 'performance', 'structure', 'forms', 'links', 'images'];
    categories.forEach(cat => {
      const count = catCounts[cat] || 0;
      const row = document.createElement('div');
      row.className = 'category-row';
      row.innerHTML = `
        <div class="cat-info">
          <span class="cat-icon">${categoryIcons[cat] || ''}</span>
          <span class="cat-name">${cat}</span>
        </div>
        <span class="cat-badge ${count > 0 ? 'has-issues' : 'clean'}">
          ${count > 0 ? `${count} issues` : 'Clean'}
        </span>
      `;
      categoriesList.appendChild(row);
    });
  }

  function showNotice(text, type = 'info') {
    noticeBox.hidden = false;
    noticeBox.className = `notice-box ${type}`;
    noticeBox.textContent = text;
  }

  function clearNotice() {
    noticeBox.hidden = true;
    noticeBox.textContent = '';
  }
});
