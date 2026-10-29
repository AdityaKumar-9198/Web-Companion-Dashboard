/**
 * Content Script — runs in the context of the target webpage.
 * Collects page data using the scanner modules and sends it back
 * to the background service worker via messaging.
 *
 * IMPORTANT:
 * - This script runs in an isolated world from the page's JavaScript
 * - It communicates only with the extension background via chrome.runtime.sendMessage
 * - It does NOT transmit data to external servers
 * - It does NOT read sensitive user-entered values
 */

'use strict';

// ---- Inline scanner modules (injected via scripting API) ----
// These are loaded separately by the background service worker
// via executeScript with files[]. This file is the coordinator.

let isScanning = false;

/**
 * Listen for scan requests from the background service worker.
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message !== 'object') return;

  if (message.type === 'PING') {
    sendResponse({ status: 'ready', url: location.href });
    return true;
  }

  if (message.type === 'HIGHLIGHT_ELEMENT') {
    highlightElementOnPage(message.selector, message.elementText);
    sendResponse({ success: true });
    return false;
  }

  if (message.type === 'SCAN_PAGE') {
    if (isScanning) {
      sendResponse({ error: 'Scan already in progress' });
      return true;
    }

    // Validate we're on a supported page
    if (!location.href.startsWith('http://') && !location.href.startsWith('https://')) {
      sendResponse({ error: 'UNSUPPORTED_PAGE', url: location.href });
      return true;
    }

    isScanning = true;

    // Run scan asynchronously
    runFullScan()
      .then(data => {
        isScanning = false;
        sendResponse({ success: true, data });
      })
      .catch(err => {
        isScanning = false;
        sendResponse({ error: err.message || 'Scan failed' });
      });

    return true; // Keep message channel open for async response
  }
});

function highlightElementOnPage(selector, textHint) {
  let target = null;
  if (selector) {
    try {
      target = document.querySelector(selector);
    } catch { /* invalid selector */ }
  }
  if (!target && textHint) {
    const all = document.querySelectorAll('button, a, input, select, textarea, h1, h2, h3, h4, h5, h6, img, p');
    for (let el of all) {
      if (el.textContent && el.textContent.trim().toLowerCase().includes(textHint.trim().toLowerCase())) {
        target = el;
        break;
      }
    }
  }
  if (!target) return;

  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const origOutline = target.style.outline;
  const origBoxShadow = target.style.boxShadow;
  const origTransition = target.style.transition;

  target.style.transition = 'all 0.3s ease';
  target.style.outline = '3px solid #6366f1';
  target.style.boxShadow = '0 0 24px rgba(99, 102, 241, 0.9)';

  setTimeout(() => {
    target.style.outline = origOutline;
    target.style.boxShadow = origBoxShadow;
    target.style.transition = origTransition;
  }, 3500);
}

/**
 * Execute all scanner modules and collect their results.
 */
async function runFullScan() {
  const scanData = {};

  // Page metadata
  try {
    scanData.page = scanPage();
  } catch (e) {
    scanData.page = { error: e.message };
  }

  // Images
  try {
    scanData.images = scanImages();
  } catch (e) {
    scanData.images = { error: e.message };
  }

  // Links
  try {
    scanData.links = scanLinks(location.href);
  } catch (e) {
    scanData.links = { error: e.message };
  }

  // Structure
  try {
    scanData.structure = scanStructure();
  } catch (e) {
    scanData.structure = { error: e.message };
  }

  // Forms
  try {
    scanData.forms = scanForms();
  } catch (e) {
    scanData.forms = { error: e.message };
  }

  // Scripts
  try {
    scanData.scripts = scanScripts();
  } catch (e) {
    scanData.scripts = { error: e.message };
  }

  // Accessibility
  try {
    scanData.accessibility = scanAccessibility();
  } catch (e) {
    scanData.accessibility = { error: e.message };
  }

  // Performance
  try {
    scanData.performance = scanPerformance();
  } catch (e) {
    scanData.performance = { error: e.message };
  }

  // Security
  try {
    scanData.security = scanSecurity();
  } catch (e) {
    scanData.security = { error: e.message };
  }

  return scanData;
}

// ---- Page Scanner ----
function scanPage() {
  const title = document.title || null;
  const url = location.href;
  const hostname = location.hostname;
  const protocol = location.protocol;
  const lang = document.documentElement.lang || null;

  const metaDesc = document.querySelector('meta[name="description"]');
  const description = metaDesc ? metaDesc.getAttribute('content') : null;

  const viewportMeta = document.querySelector('meta[name="viewport"]');
  const viewport = viewportMeta ? viewportMeta.getAttribute('content') : null;

  const canonical = document.querySelector('link[rel="canonical"]');
  const canonicalUrl = canonical ? canonical.getAttribute('href') : null;

  const ogTitle = document.querySelector('meta[property="og:title"]');
  const ogDesc = document.querySelector('meta[property="og:description"]');
  const twitterCard = document.querySelector('meta[name="twitter:card"]');

  const charsetMeta = document.querySelector('meta[charset]');
  const charset = charsetMeta ? charsetMeta.getAttribute('charset') : null;

  const robotsMeta = document.querySelector('meta[name="robots"]');
  const totalElements = document.querySelectorAll('*').length;

  const hasDoctype = document.doctype !== null;
  const isHtml5Doctype = hasDoctype && document.doctype.publicId === '';

  return {
    title, url, hostname, protocol, lang, description, viewport,
    canonicalUrl,
    ogTitle: ogTitle ? ogTitle.getAttribute('content') : null,
    ogDescription: ogDesc ? ogDesc.getAttribute('content') : null,
    twitterCard: twitterCard ? twitterCard.getAttribute('content') : null,
    charset,
    robots: robotsMeta ? robotsMeta.getAttribute('content') : null,
    totalElements,
    hasDoctype,
    isHtml5Doctype,
    isHttps: protocol === 'https:',
    timestamp: Date.now(),
  };
}

// ---- Image Scanner ----
function scanImages() {
  const images = Array.from(document.querySelectorAll('img'));
  const results = [];

  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    const src = img.getAttribute('src') || img.currentSrc || null;
    const alt = img.getAttribute('alt');
    const altMissing = alt === null;
    const altEmpty = alt === '';
    const altHasText = alt !== null && alt !== '';

    let loadState = 'unknown';
    if (img.complete) {
      if (img.naturalWidth === 0 && src) loadState = 'likely_failed';
      else if (img.naturalWidth > 0) loadState = 'loaded';
      else if (!src) loadState = 'no_src';
    } else {
      loadState = 'loading';
    }

    let displaySrc = src;
    if (src && src.startsWith('data:')) {
      displaySrc = `[data URI ~${Math.round(src.length / 1024)}KB]`;
    } else if (src && src.length > 200) {
      displaySrc = src.substring(0, 197) + '…';
    }

    const role = img.getAttribute('role') || null;

    results.push({
      index: i + 1,
      src: displaySrc,
      altMissing,
      altEmpty,
      altHasText,
      altValue: altHasText ? alt.substring(0, 150) : null,
      loading: img.getAttribute('loading') || null,
      loadState,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      isDecorativeByRole: role === 'presentation' || role === 'none',
      role,
    });
  }

  return {
    images: results,
    summary: {
      total: results.length,
      missingAlt: results.filter(r => r.altMissing).length,
      emptyAlt: results.filter(r => r.altEmpty).length,
      hasAlt: results.filter(r => r.altHasText).length,
      likelyFailed: results.filter(r => r.loadState === 'likely_failed').length,
      lazyLoaded: results.filter(r => r.loading === 'lazy').length,
    },
  };
}

// ---- Link Scanner ----
function scanLinks(baseUrl) {
  const anchors = Array.from(document.querySelectorAll('a'));
  const results = [];
  const hrefMap = new Map();

  for (let i = 0; i < anchors.length; i++) {
    const a = anchors[i];
    const href = a.getAttribute('href');
    const text = (a.textContent || '').trim().substring(0, 100);
    const ariaLabel = a.getAttribute('aria-label') || null;
    const title = a.getAttribute('title') || null;

    let type = 'missing_href';
    let resolvedUrl = null;

    if (href === null || href === undefined) {
      type = 'missing_href';
    } else if (href === '' || href === '#') {
      type = 'fragment_only';
    } else if (href.startsWith('#')) {
      type = 'fragment';
    } else if (href.startsWith('mailto:')) {
      type = 'mailto';
    } else if (href.startsWith('tel:')) {
      type = 'tel';
    } else if (href.startsWith('javascript:')) {
      type = 'javascript_scheme';
    } else {
      try {
        const url = new URL(href, baseUrl);
        resolvedUrl = url.href;
        const base = new URL(baseUrl);
        type = url.hostname === base.hostname ? 'internal' : 'external';
      } catch {
        type = 'invalid';
      }
    }

    const key = resolvedUrl || href || '';
    hrefMap.set(key, (hrefMap.get(key) || 0) + 1);

    results.push({
      index: i + 1,
      href: href !== null ? href.substring(0, 300) : null,
      resolvedUrl: resolvedUrl ? resolvedUrl.substring(0, 300) : null,
      text: text || null,
      ariaLabel,
      title,
      type,
      hasAccessibleName: !!(text || ariaLabel || title || a.getAttribute('aria-labelledby')),
      rel: a.getAttribute('rel') || null,
      target: a.getAttribute('target') || null,
      checkStatus: null,
    });
  }

  results.forEach(r => {
    const key = r.resolvedUrl || r.href || '';
    if (key && hrefMap.get(key) > 1) {
      r.isDuplicate = true;
      r.duplicateCount = hrefMap.get(key);
    } else {
      r.isDuplicate = false;
    }
  });

  return {
    links: results,
    summary: {
      total: results.length,
      internal: results.filter(r => r.type === 'internal').length,
      external: results.filter(r => r.type === 'external').length,
      missingHref: results.filter(r => r.type === 'missing_href').length,
      noAccessibleName: results.filter(r => !r.hasAccessibleName).length,
      duplicateDestinations: [...hrefMap.entries()].filter(([, c]) => c > 1).length,
    },
  };
}

// ---- Structure Scanner ----
function scanStructure() {
  const h1s = document.querySelectorAll('h1');
  const h2s = document.querySelectorAll('h2');
  const h3s = document.querySelectorAll('h3');
  const h4s = document.querySelectorAll('h4');
  const h5s = document.querySelectorAll('h5');
  const h6s = document.querySelectorAll('h6');

  const headings = [
    ...Array.from(h1s).map(h => ({ level: 1, text: h.textContent.trim().substring(0, 100) })),
    ...Array.from(h2s).map(h => ({ level: 2, text: h.textContent.trim().substring(0, 100) })),
    ...Array.from(h3s).map(h => ({ level: 3, text: h.textContent.trim().substring(0, 100) })),
    ...Array.from(h4s).map(h => ({ level: 4, text: h.textContent.trim().substring(0, 100) })),
    ...Array.from(h5s).map(h => ({ level: 5, text: h.textContent.trim().substring(0, 100) })),
    ...Array.from(h6s).map(h => ({ level: 6, text: h.textContent.trim().substring(0, 100) })),
  ];

  const levelsPresent = [...new Set(headings.map(h => h.level))].sort((a, b) => a - b);
  const skippedLevels = [];
  for (let i = 1; i < levelsPresent.length; i++) {
    const gap = levelsPresent[i] - levelsPresent[i - 1];
    if (gap > 1) {
      for (let s = levelsPresent[i - 1] + 1; s < levelsPresent[i]; s++) {
        skippedLevels.push(s);
      }
    }
  }

  const iframes = Array.from(document.querySelectorAll('iframe')).map(f => ({
    src: f.getAttribute('src') ? f.getAttribute('src').substring(0, 150) : null,
    title: f.getAttribute('title') || null,
    sandbox: f.getAttribute('sandbox') || null,
    hasTitleAttr: !!f.getAttribute('title'),
  }));

  return {
    headings: {
      h1Count: h1s.length,
      h2Count: h2s.length,
      h3Count: h3s.length,
      h4Count: h4s.length,
      h5Count: h5s.length,
      h6Count: h6s.length,
      total: headings.length,
      items: headings,
      skippedLevels,
      multipleH1: h1s.length > 1,
      noH1: h1s.length === 0,
    },
    landmarks: {
      header: document.querySelectorAll('header').length,
      main: document.querySelectorAll('main').length,
      nav: document.querySelectorAll('nav').length,
      footer: document.querySelectorAll('footer').length,
      aside: document.querySelectorAll('aside').length,
      section: document.querySelectorAll('section').length,
      article: document.querySelectorAll('article').length,
    },
    tables: document.querySelectorAll('table').length,
    tablesWithCaption: document.querySelectorAll('table caption').length,
    buttons: document.querySelectorAll('button').length,
    iframes,
    hasMain: document.querySelectorAll('main').length > 0,
    hasNav: document.querySelectorAll('nav').length > 0,
    hasHeader: document.querySelectorAll('header').length > 0,
    hasFooter: document.querySelectorAll('footer').length > 0,
  };
}

// ---- Form Scanner ----
function scanForms() {
  const forms = Array.from(document.querySelectorAll('form'));
  const results = [];

  function hasLabel(input) {
    if (input.getAttribute('aria-label')) return true;
    if (input.getAttribute('aria-labelledby')) return true;
    if (input.getAttribute('title')) return true;
    if (input.closest('label')) return true;
    if (input.id) {
      try {
        return !!document.querySelector(`label[for="${CSS.escape(input.id)}"]`);
      } catch { return false; }
    }
    return false;
  }

  for (let fi = 0; fi < forms.length; fi++) {
    const form = forms[fi];
    const action = form.getAttribute('action') || null;
    const method = (form.getAttribute('method') || 'get').toLowerCase();

    let actionSecure = null;
    if (action) {
      try {
        const url = new URL(action, location.href);
        actionSecure = url.protocol === 'https:';
      } catch { /* invalid URL */ }
    }

    const inputs = Array.from(form.querySelectorAll('input, select, textarea, button'));
    const inputData = inputs.map(inp => {
      const type = (inp.getAttribute('type') || inp.tagName.toLowerCase()).toLowerCase();
      if (type === 'password') {
        return { tag: inp.tagName.toLowerCase(), type: 'password', id: inp.id || null, name: inp.getAttribute('name') || null, required: inp.hasAttribute('required'), hasLabel: hasLabel(inp), labelText: '[PASSWORD]' };
      }
      if (type === 'hidden') {
        return { tag: 'input', type: 'hidden', id: inp.id || null, name: inp.getAttribute('name') || null };
      }
      return {
        tag: inp.tagName.toLowerCase(),
        type,
        id: inp.id || null,
        name: inp.getAttribute('name') || null,
        required: inp.hasAttribute('required'),
        hasLabel: hasLabel(inp),
        autocomplete: inp.getAttribute('autocomplete') || null,
      };
    });

    const submitButtons = Array.from(form.querySelectorAll('button[type="submit"], button:not([type]), input[type="submit"]'));
    const csrfNames = ['csrf', '_token', 'csrftoken', '_csrf', 'xsrf'];
    const csrfHints = Array.from(form.querySelectorAll('input[type="hidden"]'))
      .filter(inp => csrfNames.some(n => (inp.getAttribute('name') || '').toLowerCase().includes(n)))
      .map(f => f.getAttribute('name'));

    results.push({
      index: fi + 1,
      id: form.id || null,
      action,
      method,
      actionSecure,
      hasPasswordField: !!form.querySelector('input[type="password"]'),
      hasFileUpload: !!form.querySelector('input[type="file"]'),
      inputCount: inputs.length,
      inputs: inputData,
      submitButtonCount: submitButtons.length,
      noSubmitButton: submitButtons.length === 0,
      csrfHints: { hasCsrfHint: csrfHints.length > 0, csrfFieldNames: csrfHints },
    });
  }

  return {
    forms: results,
    summary: {
      total: results.length,
      totalInputs: results.reduce((s, f) => s + f.inputCount, 0),
      formsWithPasswordFields: results.filter(f => f.hasPasswordField).length,
      formsWithFileUpload: results.filter(f => f.hasFileUpload).length,
      formsWithInsecureAction: results.filter(f => f.actionSecure === false).length,
      inputsMissingLabels: results.reduce((s, f) =>
        s + f.inputs.filter(i => !i.hasLabel && i.type !== 'hidden' && i.type !== 'submit').length, 0),
    },
  };
}

// ---- Script Scanner ----
function scanScripts() {
  const scripts = Array.from(document.querySelectorAll('script'));
  const results = scripts.map((script, i) => {
    const src = script.getAttribute('src') || null;
    const type = script.getAttribute('type') || null;
    let scriptOrigin = null;
    if (src) {
      try {
        const url = new URL(src, location.href);
        scriptOrigin = url.hostname === location.hostname ? 'same-origin' : 'cross-origin';
      } catch { scriptOrigin = 'invalid'; }
    }
    return {
      index: i + 1,
      src: src ? src.substring(0, 200) : null,
      type,
      isAsync: script.hasAttribute('async'),
      isDefer: script.hasAttribute('defer'),
      isModule: type === 'module',
      isExternal: !!src,
      isInline: !src,
      scriptOrigin,
      hasIntegrity: !!script.getAttribute('integrity'),
      integrity: script.getAttribute('integrity') ? script.getAttribute('integrity').substring(0, 100) : null,
      inlineContentLength: !src ? (script.textContent || '').length : null,
    };
  });

  const external = results.filter(r => r.isExternal);
  const crossOrigin = external.filter(r => r.scriptOrigin === 'cross-origin');

  return {
    scripts: results,
    summary: {
      total: results.length,
      external: external.length,
      inline: results.filter(r => r.isInline).length,
      async: results.filter(r => r.isAsync).length,
      defer: results.filter(r => r.isDefer).length,
      crossOrigin: crossOrigin.length,
      withSRI: results.filter(r => r.hasIntegrity).length,
      crossOriginWithoutSRI: crossOrigin.filter(r => !r.hasIntegrity).length,
    },
  };
}

// ---- Accessibility Scanner ----
function scanAccessibility() {
  const findings = [];

  function hasLabel(control) {
    if (control.getAttribute('aria-label')) return true;
    if (control.getAttribute('aria-labelledby')) return true;
    if (control.getAttribute('title')) return true;
    if (control.closest('label')) return true;
    if (control.id) {
      try { return !!document.querySelector(`label[for="${CSS.escape(control.id)}"]`); }
      catch { return false; }
    }
    return false;
  }

  // Images missing alt
  Array.from(document.querySelectorAll('img')).forEach((img, i) => {
    if (img.getAttribute('alt') === null) {
      const role = img.getAttribute('role');
      findings.push({
        ruleId: 'img-alt-missing',
        category: 'accessibility',
        severity: (role === 'presentation' || role === 'none') ? 'low' : 'high',
        title: 'Image missing alt attribute',
        description: 'Image does not have an alt attribute.',
        element: img.outerHTML.substring(0, 200),
        affectedElement: img.getAttribute('src') || `Image ${i + 1}`,
        manualReview: false,
      });
    }
  });

  // Form controls without labels
  Array.from(document.querySelectorAll('input, select, textarea')).forEach(ctrl => {
    const type = (ctrl.getAttribute('type') || 'text').toLowerCase();
    if (['hidden', 'submit', 'reset', 'button', 'image'].includes(type)) return;
    if (!hasLabel(ctrl)) {
      findings.push({
        ruleId: 'form-label-missing',
        category: 'accessibility',
        severity: 'high',
        title: `Form ${type} input missing label`,
        description: `${type} input has no associated label.`,
        element: ctrl.outerHTML.substring(0, 200),
        affectedElement: ctrl.id || ctrl.getAttribute('name') || type,
        manualReview: false,
      });
    }
  });

  // Buttons without accessible names
  Array.from(document.querySelectorAll('button')).forEach(btn => {
    const text = (btn.textContent || '').trim();
    if (!text && !btn.getAttribute('aria-label') && !btn.getAttribute('aria-labelledby') && !btn.getAttribute('title')) {
      findings.push({
        ruleId: 'button-no-accessible-name',
        category: 'accessibility',
        severity: 'high',
        title: 'Button missing accessible name',
        description: 'Button has no text, aria-label, or title.',
        element: btn.outerHTML.substring(0, 200),
        affectedElement: btn.id || 'button',
        manualReview: true,
      });
    }
  });

  // Missing lang
  if (!document.documentElement.getAttribute('lang')) {
    findings.push({
      ruleId: 'html-lang-missing',
      category: 'accessibility',
      severity: 'medium',
      title: 'Missing document language',
      description: '<html> element has no lang attribute.',
      element: '<html>',
      affectedElement: 'document',
      manualReview: false,
    });
  }

  // Missing title
  if (!document.title || !document.title.trim()) {
    findings.push({
      ruleId: 'page-title-missing',
      category: 'accessibility',
      severity: 'high',
      title: 'Page title missing or empty',
      description: 'No descriptive <title> element.',
      element: '<title>',
      affectedElement: 'document',
      manualReview: false,
    });
  }

  const total = findings.length;
  return {
    findings,
    summary: {
      total,
      high: findings.filter(f => f.severity === 'high').length,
      medium: findings.filter(f => f.severity === 'medium').length,
      low: findings.filter(f => f.severity === 'low').length,
    },
  };
}

// ---- Performance Scanner ----
function scanPerformance() {
  const result = {};

  try {
    const nav = performance.getEntriesByType('navigation')[0];
    if (nav) {
      result.navigationTiming = {
        available: true,
        dnsLookupMs: nav.domainLookupEnd - nav.domainLookupStart,
        tcpConnectMs: nav.connectEnd - nav.connectStart,
        ttfbMs: nav.responseStart - nav.requestStart,
        domContentLoadedMs: nav.domContentLoadedEventEnd,
        loadEventMs: nav.loadEventEnd,
        transferSizeBytes: nav.transferSize,
        type: nav.type,
        redirectCount: nav.redirectCount,
      };
    } else {
      result.navigationTiming = { available: false, reason: 'No navigation entry' };
    }
  } catch (e) {
    result.navigationTiming = { available: false, reason: e.message };
  }

  try {
    const paints = performance.getEntriesByType('paint');
    result.paintTiming = { available: false };
    for (const p of paints) {
      if (p.name === 'first-contentful-paint') {
        result.paintTiming = { available: true, firstContentfulPaintMs: Math.round(p.startTime) };
      }
    }
  } catch (e) {
    result.paintTiming = { available: false, reason: e.message };
  }

  try {
    const resources = performance.getEntriesByType('resource');
    const byType = {};
    for (const r of resources) {
      byType[r.initiatorType] = (byType[r.initiatorType] || 0) + 1;
    }
    result.resourceTiming = {
      available: resources.length > 0,
      total: resources.length,
      byType,
      totalTransferBytes: resources.reduce((s, r) => s + (r.transferSize || 0), 0),
    };
  } catch (e) {
    result.resourceTiming = { available: false, reason: e.message };
  }

  try {
    if (performance.memory) {
      result.memoryInfo = {
        available: true,
        usedJsHeapSizeMB: (performance.memory.usedJSHeapSize / 1048576).toFixed(2),
        totalJsHeapSizeMB: (performance.memory.totalJSHeapSize / 1048576).toFixed(2),
      };
    } else {
      result.memoryInfo = { available: false };
    }
  } catch {
    result.memoryInfo = { available: false };
  }

  return result;
}

// ---- Security Scanner ----
function scanSecurity() {
  const findings = [];

  // HTTPS check
  const isHttps = location.protocol === 'https:';
  if (!isHttps) {
    findings.push({
      ruleId: 'page-over-http',
      category: 'security',
      severity: 'high',
      title: 'Page served over HTTP',
      description: 'Data is transmitted without encryption.',
      verificationStatus: 'finding_detected',
      evidence: `Protocol: ${location.protocol}`,
    });
  }

  // Mixed content
  if (isHttps) {
    const httpScripts = document.querySelectorAll('script[src^="http:"]').length;
    const httpImages = document.querySelectorAll('img[src^="http:"]').length;
    const total = httpScripts + httpImages;
    if (total > 0) {
      findings.push({
        ruleId: 'mixed-content',
        category: 'security',
        severity: httpScripts > 0 ? 'high' : 'medium',
        title: 'Mixed content detected',
        description: `${total} resource(s) loaded over HTTP on an HTTPS page.`,
        verificationStatus: 'finding_detected',
        evidence: `HTTP scripts: ${httpScripts}, HTTP images: ${httpImages}`,
      });
    }
  }

  // External scripts without SRI
  const crossOriginScripts = Array.from(document.querySelectorAll('script[src]')).filter(s => {
    try {
      return new URL(s.getAttribute('src'), location.href).hostname !== location.hostname;
    } catch { return false; }
  });
  const noSRI = crossOriginScripts.filter(s => !s.getAttribute('integrity'));
  if (noSRI.length > 0) {
    findings.push({
      ruleId: 'external-script-no-sri',
      category: 'security',
      severity: 'medium',
      title: `${noSRI.length} external script(s) without SRI`,
      description: 'Cross-origin scripts without integrity attributes cannot be verified.',
      verificationStatus: 'finding_detected',
      evidence: noSRI.slice(0, 3).map(s => s.getAttribute('src').substring(0, 100)).join(', '),
    });
  }

  // Source maps
  const inlineScripts = Array.from(document.querySelectorAll('script:not([src])'));
  const withSourceMap = inlineScripts.filter(s => (s.textContent || '').includes('sourceMappingURL=')).length;
  if (withSourceMap > 0) {
    findings.push({
      ruleId: 'source-map-exposed',
      category: 'security',
      severity: 'low',
      title: 'Source map references found',
      description: `${withSourceMap} inline script(s) reference source maps.`,
      verificationStatus: 'finding_detected',
      evidence: `${withSourceMap} script(s) with sourceMappingURL`,
    });
  }

  // Potential secrets in inline scripts (heuristic)
  const secretPatterns = [
    { name: 'JWT', pattern: /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/ },
    { name: 'API Key', pattern: /['"]sk-[a-zA-Z0-9]{20,}['"]/ },
    { name: 'Generic secret assignment', pattern: /(?:api_?key|secret|password|auth_?token)\s*[:=]\s*['"][A-Za-z0-9+/]{20,}['"]/i },
  ];

  for (const script of inlineScripts.slice(0, 20)) { // Only check first 20 inline scripts
    const content = (script.textContent || '').substring(0, 100000);
    for (const { name, pattern } of secretPatterns) {
      if (pattern.test(content)) {
        findings.push({
          ruleId: 'potential-secret-exposed',
          category: 'security',
          severity: 'high',
          title: `Potential ${name} in inline script (requires manual review)`,
          description: 'A pattern matching a potential secret was found. Verify manually. Values are not stored.',
          verificationStatus: 'requires_manual_review',
          evidence: `Pattern: ${name} (value redacted)`,
        });
        break;
      }
    }
  }

  // localStorage token keys
  try {
    const sensitiveKeys = ['token', 'jwt', 'auth', 'session', 'apikey', 'secret'];
    const foundKeys = [];
    for (let i = 0; i < Math.min(localStorage.length, 50); i++) {
      const k = localStorage.key(i) || '';
      if (sensitiveKeys.some(s => k.toLowerCase().includes(s))) foundKeys.push(k.substring(0, 50));
    }
    if (foundKeys.length > 0) {
      findings.push({
        ruleId: 'token-in-localstorage',
        category: 'security',
        severity: 'medium',
        title: 'Potential tokens in localStorage',
        description: 'localStorage key names suggest token storage. Values not read.',
        verificationStatus: 'requires_manual_review',
        evidence: `Keys: ${foundKeys.join(', ')}`,
      });
    }
  } catch { /* localStorage not accessible */ }

  // Form action security
  Array.from(document.querySelectorAll('form')).forEach((form, fi) => {
    const action = form.getAttribute('action');
    if (action) {
      try {
        const url = new URL(action, location.href);
        if (url.protocol === 'http:' && location.protocol === 'https:') {
          findings.push({
            ruleId: 'form-insecure-action',
            category: 'security',
            severity: 'high',
            title: `Form ${fi + 1} submits to HTTP endpoint`,
            description: 'Form data will be transmitted without encryption.',
            verificationStatus: 'finding_detected',
            evidence: `action: ${url.href.substring(0, 100)}`,
          });
        }
      } catch { /* invalid URL */ }
    }
  });

  const checklist = buildSecurityChecklist();

  return {
    findings,
    checklist,
    summary: {
      total: findings.length,
      findingDetected: findings.filter(f => f.verificationStatus === 'finding_detected').length,
      manualReview: findings.filter(f => f.verificationStatus === 'requires_manual_review').length,
    },
  };
}

function buildSecurityChecklist() {
  return [
    { id: 'sql-injection', title: 'SQL Injection', status: 'requires_backend_access', note: 'Backend check required' },
    { id: 'xss', title: 'Cross-Site Scripting', status: 'requires_manual_review', note: 'Heuristic inline script checks performed' },
    { id: 'csrf', title: 'CSRF Protection', status: 'requires_manual_review', note: 'CSRF token presence checked in forms' },
    { id: 'file-upload', title: 'File Upload Validation', status: 'requires_backend_access', note: 'Server-side validation not verifiable' },
    { id: 'bola', title: 'Broken Object-Level Authorization', status: 'not_supported', note: 'Requires authenticated API testing' },
    { id: 'rate-limiting', title: 'Rate Limiting', status: 'requires_backend_access', note: 'Server-side control' },
    { id: 'jwt-secret', title: 'JWT Secret Management', status: 'requires_backend_access', note: 'Backend secret management' },
    { id: 'api-secret-exposure', title: 'API Secret Exposure', status: 'requires_manual_review', note: 'Heuristic checks performed' },
    { id: 'password-hashing', title: 'Secure Password Hashing', status: 'not_supported', note: 'Server-side only' },
    { id: 'mfa', title: 'Multifactor Authentication', status: 'requires_manual_review', note: 'Cannot verify without authenticated access' },
    { id: 'cors', title: 'CORS Configuration', status: 'requires_backend_access', note: 'HTTP headers not accessible from DOM' },
    { id: 'token-storage', title: 'Authentication Token Storage', status: 'requires_manual_review', note: 'localStorage key names checked' },
    { id: 'server-auth', title: 'Server-Side Authorisation', status: 'not_supported', note: 'Backend only' },
    { id: 'row-level-security', title: 'Database Row-Level Security', status: 'not_supported', note: 'Database only' },
    { id: 'webhook-signatures', title: 'Webhook Signature Verification', status: 'not_supported', note: 'Server-side only' },
    { id: 'ssrf', title: 'Server-Side Request Forgery', status: 'not_supported', note: 'Active testing not performed' },
    { id: 'source-maps', title: 'Exposed Source Maps', status: 'requires_manual_review', note: 'sourceMappingURL references checked' },
    { id: 'default-credentials', title: 'Default Credentials', status: 'not_supported', note: 'Requires authorised testing' },
    { id: 'sensitive-logs', title: 'Sensitive Data in Logs', status: 'not_supported', note: 'Server-side only' },
    { id: 'vulnerable-dependencies', title: 'Vulnerable Dependencies', status: 'requires_manual_review', note: 'Script URLs listed; use npm audit or Snyk for full analysis' },
  ];
}
