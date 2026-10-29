/**
 * Link Scanner — analyses anchor elements and classifies links.
 * Link health checks are performed cautiously with timeouts,
 * with clear distinction between confirmed results and inconclusive checks.
 *
 * IMPORTANT: This scanner does NOT perform aggressive crawling.
 * It uses HEAD requests with short timeouts and conservative concurrency.
 * Results that cannot be verified are clearly labelled.
 */

const LinkScanner = {
  name: 'links',

  // Link check statuses
  STATUS: {
    AVAILABLE: 'Available',
    NOT_FOUND: 'Not Found',
    REQUEST_FAILED: 'Request Failed',
    COULD_NOT_VERIFY: 'Could Not Verify',
    UNSUPPORTED: 'Unsupported',
    REDIRECT: 'Redirect',
    TIMEOUT: 'Timeout',
  },

  /**
   * Collect link data from the page DOM.
   * Does NOT perform network checks here (those happen in background).
   */
  scan(baseUrl) {
    try {
      const anchors = Array.from(document.querySelectorAll('a'));
      const results = [];
      const hrefMap = new Map(); // href -> count (for duplicate detection)

      for (let i = 0; i < anchors.length; i++) {
        const a = anchors[i];
        const href = a.getAttribute('href');
        const text = (a.textContent || '').trim().substring(0, 100);
        const ariaLabel = a.getAttribute('aria-label') || null;
        const title = a.getAttribute('title') || null;

        // Classify the href
        let type = 'missing';
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

        // Track duplicates
        const key = resolvedUrl || href || '';
        hrefMap.set(key, (hrefMap.get(key) || 0) + 1);

        // Accessible name assessment
        const hasAccessibleName = !!(
          text || ariaLabel || title ||
          a.getAttribute('aria-labelledby')
        );

        results.push({
          index: i + 1,
          href: href !== null ? href.substring(0, 300) : null,
          resolvedUrl: resolvedUrl ? resolvedUrl.substring(0, 300) : null,
          text: text || null,
          ariaLabel,
          title,
          type,
          hasAccessibleName,
          rel: a.getAttribute('rel') || null,
          target: a.getAttribute('target') || null,
          checkStatus: null, // Filled in after network checks
        });
      }

      // Mark duplicates
      results.forEach(r => {
        const key = r.resolvedUrl || r.href || '';
        if (key && hrefMap.get(key) > 1) {
          r.isDuplicate = true;
          r.duplicateCount = hrefMap.get(key);
        } else {
          r.isDuplicate = false;
        }
      });

      const summary = {
        total: results.length,
        internal: results.filter(r => r.type === 'internal').length,
        external: results.filter(r => r.type === 'external').length,
        missingHref: results.filter(r => r.type === 'missing_href').length,
        fragmentOnly: results.filter(r => r.type === 'fragment_only').length,
        mailtoLinks: results.filter(r => r.type === 'mailto').length,
        javascriptScheme: results.filter(r => r.type === 'javascript_scheme').length,
        noAccessibleName: results.filter(r => !r.hasAccessibleName).length,
        duplicateDestinations: [...hrefMap.entries()].filter(([, c]) => c > 1).length,
      };

      return { links: results, summary };
    } catch (err) {
      return { links: [], summary: {}, error: err.message };
    }
  },

  /**
   * Check link availability via HEAD request with timeout.
   * Returns one of the STATUS values.
   * CORS restrictions, auth requirements, and server restrictions
   * all result in 'Could Not Verify', not 'Broken'.
   *
   * @param {string} url
   * @param {number} timeout - ms
   * @returns {Promise<{status: string, statusCode: number|null, note: string|null}>}
   */
  async checkLink(url, timeout = 8000) {
    if (!url) return { status: this.STATUS.UNSUPPORTED, statusCode: null, note: 'No URL' };

    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      return { status: this.STATUS.UNSUPPORTED, statusCode: null, note: 'Invalid URL' };
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return { status: this.STATUS.UNSUPPORTED, statusCode: null, note: `Unsupported scheme: ${parsedUrl.protocol}` };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        mode: 'no-cors', // Avoids CORS errors but limits status code visibility
        redirect: 'follow',
        cache: 'no-store',
      });

      clearTimeout(timer);

      // With no-cors, response.status is always 0 (opaque response)
      // We can only confirm the request didn't throw
      if (response.type === 'opaque' || response.status === 0) {
        return {
          status: this.STATUS.COULD_NOT_VERIFY,
          statusCode: null,
          note: 'CORS restriction — response status not accessible',
        };
      }

      if (response.status >= 200 && response.status < 300) {
        return { status: this.STATUS.AVAILABLE, statusCode: response.status, note: null };
      }
      if (response.status >= 300 && response.status < 400) {
        return { status: this.STATUS.REDIRECT, statusCode: response.status, note: 'Redirect detected' };
      }
      if (response.status === 404) {
        return { status: this.STATUS.NOT_FOUND, statusCode: 404, note: null };
      }
      if (response.status === 401 || response.status === 403) {
        return {
          status: this.STATUS.COULD_NOT_VERIFY,
          statusCode: response.status,
          note: 'Authentication or authorisation required',
        };
      }

      return {
        status: this.STATUS.REQUEST_FAILED,
        statusCode: response.status,
        note: `HTTP ${response.status}`,
      };

    } catch (err) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        return { status: this.STATUS.TIMEOUT, statusCode: null, note: 'Request timed out' };
      }
      // Network error, CORS failure, etc.
      return {
        status: this.STATUS.COULD_NOT_VERIFY,
        statusCode: null,
        note: `Network error: ${err.message.substring(0, 100)}`,
      };
    }
  },
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LinkScanner };
} else if (typeof globalThis !== 'undefined') {
  globalThis.LinkScanner = LinkScanner;
}
