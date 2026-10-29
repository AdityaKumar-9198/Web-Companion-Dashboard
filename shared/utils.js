/**
 * Shared utility functions used across extension components.
 */

const Utils = {
  /**
   * Generate a unique ID for findings and scans.
   */
  generateId(prefix = 'id') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * Format a timestamp for display.
   * @param {number|string} ts - Timestamp in ms or ISO string
   */
  formatTimestamp(ts) {
    if (!ts) return 'Unknown';
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return String(ts);
    }
  },

  /**
   * Safely escape HTML to prevent XSS in rendered output.
   */
  escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  /**
   * Truncate a string to a maximum length.
   */
  truncate(str, maxLen = 80) {
    if (!str) return '';
    str = String(str);
    if (str.length <= maxLen) return str;
    return str.substring(0, maxLen) + '…';
  },

  /**
   * Classify a URL as internal or external relative to a base URL.
   */
  classifyUrl(href, baseUrl) {
    if (!href) return 'missing';
    try {
      const url = new URL(href, baseUrl);
      const base = new URL(baseUrl);
      if (url.hostname === base.hostname) return 'internal';
      return 'external';
    } catch {
      return 'invalid';
    }
  },

  /**
   * Determine if a URL scheme is supported for link checking.
   */
  isCheckableUrl(href) {
    if (!href) return false;
    try {
      const url = new URL(href);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  },

  /**
   * Redact potential secrets from a string for safe display.
   * Only shows a prefix of the value.
   */
  redactSecret(value, keepChars = 4) {
    if (!value || value.length <= keepChars) return '[REDACTED]';
    return value.substring(0, keepChars) + '…[REDACTED]';
  },

  /**
   * Check if a string looks like a potential secret/token.
   * Uses conservative heuristics.
   */
  looksLikeSecret(str) {
    if (!str || str.length < 16) return false;
    // High entropy strings, common key patterns
    const patterns = [
      /^[A-Za-z0-9+/]{32,}={0,2}$/, // base64-ish
      /^[0-9a-f]{32,64}$/i,          // hex hash/key
      /^sk[-_][a-z0-9]{20,}/i,       // OpenAI-style
      /^pk[-_][a-z0-9]{20,}/i,
      /^[A-Z0-9]{20,}$/,             // AWS-style
      /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*/,  // JWT
    ];
    return patterns.some(p => p.test(str.trim()));
  },

  /**
   * Normalise a URL for display (strip fragment, truncate).
   */
  normaliseUrl(url, maxLen = 60) {
    if (!url) return '';
    try {
      const u = new URL(url);
      const display = u.origin + u.pathname + (u.search || '');
      return this.truncate(display, maxLen);
    } catch {
      return this.truncate(url, maxLen);
    }
  },

  /**
   * Deep-clone a plain object safely.
   */
  deepClone(obj) {
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch {
      return obj;
    }
  },

  /**
   * Get severity sort order (lower = more severe).
   */
  severityOrder(sev) {
    const order = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
    return order[sev] ?? 5;
  },

  /**
   * Sort findings by severity descending.
   */
  sortBySeverity(findings) {
    return [...findings].sort((a, b) =>
      this.severityOrder(a.severity) - this.severityOrder(b.severity)
    );
  },

  /**
   * Check if the current page URL is supported for scanning.
   */
  isSupportedUrl(url) {
    if (!url) return false;
    return url.startsWith('http://') || url.startsWith('https://');
  },

  /**
   * Format bytes to human-readable.
   */
  formatBytes(bytes) {
    if (bytes === undefined || bytes === null) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  },

  /**
   * Format milliseconds for display.
   */
  formatMs(ms) {
    if (ms === undefined || ms === null || isNaN(ms)) return 'N/A';
    if (ms < 1000) return `${Math.round(ms)} ms`;
    return `${(ms / 1000).toFixed(2)} s`;
  },

  /**
   * Validate a message object has required fields.
   */
  validateMessage(msg, requiredFields = []) {
    if (!msg || typeof msg !== 'object') return false;
    return requiredFields.every(f => msg[f] !== undefined);
  },
};

// Export for both module and non-module contexts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Utils };
} else if (typeof globalThis !== 'undefined') {
  globalThis.Utils = Utils;
}
