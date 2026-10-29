/**
 * Performance Scanner — collects browser-provided performance metrics.
 * Uses Navigation Timing API, Resource Timing, and available Core Web Vitals.
 *
 * IMPORTANT: This module provides lightweight diagnostics only.
 * It is not a replacement for Lighthouse or WebPageTest.
 * Only metrics that can be measured correctly in the extension context
 * are included. Unavailable metrics are clearly distinguished from zero values.
 */

const PerformanceScanner = {
  name: 'performance',

  scan() {
    try {
      const result = {
        navigationTiming: PerformanceScanner._getNavigationTiming(),
        resourceTiming: PerformanceScanner._getResourceTiming(),
        paintTiming: PerformanceScanner._getPaintTiming(),
        memoryInfo: PerformanceScanner._getMemoryInfo(),
        disclaimer: 'Lightweight diagnostics only. Not a replacement for full performance auditing tools.',
      };

      return result;
    } catch (err) {
      return { error: err.message };
    }
  },

  _getNavigationTiming() {
    try {
      const nav = performance.getEntriesByType('navigation')[0];
      if (!nav) {
        return { available: false, reason: 'Navigation timing entry not available in this context' };
      }

      return {
        available: true,
        // DNS lookup
        dnsLookupMs: nav.domainLookupEnd - nav.domainLookupStart,
        // TCP connect
        tcpConnectMs: nav.connectEnd - nav.connectStart,
        // TLS handshake (if HTTPS)
        tlsMs: nav.secureConnectionStart > 0 ? nav.connectEnd - nav.secureConnectionStart : null,
        // Time to First Byte
        ttfbMs: nav.responseStart - nav.requestStart,
        // Response download
        responseDownloadMs: nav.responseEnd - nav.responseStart,
        // DOM processing
        domInteractiveMs: nav.domInteractive,
        domContentLoadedMs: nav.domContentLoadedEventEnd,
        // Full page load
        loadEventMs: nav.loadEventEnd,
        // Transfer sizes
        transferSizeBytes: nav.transferSize,
        encodedBodySizeBytes: nav.encodedBodySize,
        decodedBodySizeBytes: nav.decodedBodySize,
        // Type
        type: nav.type, // navigate, reload, back_forward, prerender
        redirectCount: nav.redirectCount,
      };
    } catch (err) {
      return { available: false, reason: err.message };
    }
  },

  _getResourceTiming() {
    try {
      const resources = performance.getEntriesByType('resource');
      if (!resources || resources.length === 0) {
        return { available: false, reason: 'No resource timing entries', items: [] };
      }

      const typed = {};
      const items = [];

      for (const r of resources) {
        const type = r.initiatorType || 'other';
        typed[type] = (typed[type] || 0) + 1;

        items.push({
          name: r.name.substring(0, 200),
          type,
          duration: Math.round(r.duration),
          transferSize: r.transferSize,
          encodedBodySize: r.encodedBodySize,
          initiatorType: r.initiatorType,
        });
      }

      // Top 20 slowest resources
      const slowest = [...items]
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 20);

      return {
        available: true,
        total: resources.length,
        byType: typed,
        totalTransferBytes: items.reduce((s, r) => s + (r.transferSize || 0), 0),
        slowest,
      };
    } catch (err) {
      return { available: false, reason: err.message, items: [] };
    }
  },

  _getPaintTiming() {
    try {
      const paints = performance.getEntriesByType('paint');
      const result = { available: false, firstPaintMs: null, firstContentfulPaintMs: null };

      for (const p of paints) {
        if (p.name === 'first-paint') {
          result.firstPaintMs = Math.round(p.startTime);
          result.available = true;
        }
        if (p.name === 'first-contentful-paint') {
          result.firstContentfulPaintMs = Math.round(p.startTime);
          result.available = true;
        }
      }

      if (!result.available) {
        result.reason = 'Paint timing not available in this context';
      }

      // LCP via PerformanceObserver — only available if browser supports it
      // We collect it if already observed (set by content script observer)
      if (typeof __WDC_LCP !== 'undefined' && __WDC_LCP !== null) {
        result.largestContentfulPaintMs = Math.round(__WDC_LCP);
        result.lcpSource = 'PerformanceObserver';
      } else {
        result.largestContentfulPaintMs = null;
        result.lcpNote = 'LCP not collected — requires PerformanceObserver to be active before page load in extension context';
      }

      return result;
    } catch (err) {
      return { available: false, reason: err.message };
    }
  },

  _getMemoryInfo() {
    try {
      if (performance.memory) {
        return {
          available: true,
          usedJsHeapSizeMB: (performance.memory.usedJSHeapSize / 1048576).toFixed(2),
          totalJsHeapSizeMB: (performance.memory.totalJSHeapSize / 1048576).toFixed(2),
          jsHeapSizeLimitMB: (performance.memory.jsHeapSizeLimit / 1048576).toFixed(2),
          note: 'Chrome only. Not available in Firefox.',
        };
      }
      return { available: false, reason: 'performance.memory not available (Firefox or other browser)' };
    } catch {
      return { available: false, reason: 'Error accessing memory info' };
    }
  },
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PerformanceScanner };
} else if (typeof globalThis !== 'undefined') {
  globalThis.PerformanceScanner = PerformanceScanner;
}
