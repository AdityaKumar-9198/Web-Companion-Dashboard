/**
 * Storage module — manages scan history and settings in chrome.storage.local.
 * All data is stored locally; no data is transmitted externally.
 */

const STORAGE_KEYS = {
  SCAN_HISTORY: 'scan_history',
  SETTINGS: 'settings',
  LAST_SCAN: 'last_scan',
};

const AUTH_KEYS = {
  USERS: 'auth_users',
  CURRENT_USER: 'auth_current_user',
};

const DEFAULT_USERS = [
  {
    id: 'usr_dev',
    name: 'Developer',
    email: 'dev@companion.local',
    role: 'Your workspace',
    password: 'password123',
    createdAt: 1730190000000,
  },
  {
    id: 'usr_aditya',
    name: 'Aditya',
    email: 'aditya@companion.local',
    role: 'Lead Architect',
    password: 'password123',
    createdAt: 1730190000000,
  }
];

const MAX_HISTORY_ITEMS = 100; // Prevent unbounded growth
const SCANNER_VERSION = '1.0.0';

const StorageManager = {
  _activeUserId: null,

  /**
   * Set active user ID to scope scan history and settings per account.
   */
  setActiveUserId(userId) {
    StorageManager._activeUserId = userId || null;
  },

  getActiveUserId() {
    return StorageManager._activeUserId;
  },

  _scopedKey(key) {
    if (!StorageManager._activeUserId || StorageManager._activeUserId === 'default') {
      return key;
    }
    return `${StorageManager._activeUserId}__${key}`;
  },

  /**
   * Internal storage provider — delegates to chrome.storage.local,
   * with fallback to window.localStorage or memory storage in standalone preview mode.
   */
  _storage() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      return chrome.storage.local;
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      return {
        get: async (keys) => {
          const res = {};
          const keyList = Array.isArray(keys) ? keys : (typeof keys === 'string' ? [keys] : Object.values(STORAGE_KEYS));
          for (const k of keyList) {
            try {
              const val = window.localStorage.getItem('cb_' + k);
              if (val !== null) res[k] = JSON.parse(val);
            } catch {
              // ignore parse errors
            }
          }
          return res;
        },
        set: async (obj) => {
          for (const [k, v] of Object.entries(obj)) {
            try {
              window.localStorage.setItem('cb_' + k, JSON.stringify(v));
            } catch {
              // storage quota or permission error
            }
          }
        },
        remove: async (keys) => {
          const keyList = Array.isArray(keys) ? keys : [keys];
          for (const k of keyList) window.localStorage.removeItem('cb_' + k);
        },
        clear: async () => {
          for (const k of Object.values(STORAGE_KEYS)) window.localStorage.removeItem('cb_' + k);
        }
      };
    }
    if (!StorageManager._mem) StorageManager._mem = {};
    return {
      get: async (keys) => {
        const res = {};
        const keyList = Array.isArray(keys) ? keys : (typeof keys === 'string' ? [keys] : Object.keys(StorageManager._mem));
        for (const k of keyList) {
          if (StorageManager._mem[k] !== undefined) res[k] = StorageManager._mem[k];
        }
        return res;
      },
      set: async (obj) => { Object.assign(StorageManager._mem, obj); },
      remove: async (keys) => {
        const keyList = Array.isArray(keys) ? keys : [keys];
        for (const k of keyList) delete StorageManager._mem[k];
      },
      clear: async () => { StorageManager._mem = {}; }
    };
  },

  /**
   * Save a completed scan to history.
   * @param {object} scanResult - The full scan result object
   * @returns {Promise<string>} The scan ID
   */
  async saveScan(scanResult) {
    if (!scanResult || !scanResult.id) {
      throw new Error('Invalid scan result: missing id');
    }

    // Strip any sensitive data before storage
    const safe = StorageManager._sanitiseScan(scanResult);

    try {
      const store = StorageManager._storage();
      const historyKey = StorageManager._scopedKey(STORAGE_KEYS.SCAN_HISTORY);
      const lastKey = StorageManager._scopedKey(STORAGE_KEYS.LAST_SCAN);
      const stored = await store.get(historyKey);
      let history = stored[historyKey] || [];

      // Ensure it's an array
      if (!Array.isArray(history)) history = [];

      // Check if scan with this ID already exists — update if so
      const existingIdx = history.findIndex(s => s.id === safe.id);
      if (existingIdx !== -1) {
        history[existingIdx] = safe;
      } else {
        history.unshift(safe); // most recent first
      }

      // Trim history to limit
      if (history.length > MAX_HISTORY_ITEMS) {
        history = history.slice(0, MAX_HISTORY_ITEMS);
      }

      await store.set({
        [historyKey]: history,
        [lastKey]: safe,
      });

      return safe.id;
    } catch (err) {
      throw new Error(`Failed to save scan: ${err.message}`);
    }
  },

  /**
   * Retrieve all scans from history.
   * @returns {Promise<Array>}
   */
  async getHistory() {
    try {
      const store = StorageManager._storage();
      const historyKey = StorageManager._scopedKey(STORAGE_KEYS.SCAN_HISTORY);
      const stored = await store.get(historyKey);
      const history = stored[historyKey];
      if (!Array.isArray(history)) return [];
      return history.filter(s => s && typeof s === 'object' && s.id);
    } catch (err) {
      throw new Error(`Failed to retrieve history: ${err.message}`);
    }
  },

  /**
   * Retrieve a single scan by ID.
   * @param {string} scanId
   * @returns {Promise<object|null>}
   */
  async getScan(scanId) {
    if (!scanId) return null;
    try {
      const history = await StorageManager.getHistory();
      return history.find(s => s.id === scanId) || null;
    } catch (err) {
      throw new Error(`Failed to retrieve scan: ${err.message}`);
    }
  },

  /**
   * Delete a single scan from history.
   * @param {string} scanId
   * @returns {Promise<boolean>} True if deleted
   */
  async deleteScan(scanId) {
    if (!scanId) return false;
    try {
      const store = StorageManager._storage();
      const historyKey = StorageManager._scopedKey(STORAGE_KEYS.SCAN_HISTORY);
      const lastKey = StorageManager._scopedKey(STORAGE_KEYS.LAST_SCAN);
      const stored = await store.get(historyKey);
      let history = stored[historyKey] || [];
      if (!Array.isArray(history)) return false;

      const before = history.length;
      history = history.filter(s => s.id !== scanId);

      if (history.length === before) return false; // not found

      await store.set({ [historyKey]: history });

      // Update last_scan if it was this one
      const lastStored = await store.get(lastKey);
      if (lastStored[lastKey]?.id === scanId) {
        const newLast = history.length > 0 ? history[0] : null;
        await store.set({ [lastKey]: newLast });
      }

      return true;
    } catch (err) {
      throw new Error(`Failed to delete scan: ${err.message}`);
    }
  },

  /**
   * Clear all scan history.
   */
  async clearHistory() {
    try {
      const store = StorageManager._storage();
      const historyKey = StorageManager._scopedKey(STORAGE_KEYS.SCAN_HISTORY);
      const lastKey = StorageManager._scopedKey(STORAGE_KEYS.LAST_SCAN);
      await store.set({
        [historyKey]: [],
        [lastKey]: null,
      });
    } catch (err) {
      throw new Error(`Failed to clear history: ${err.message}`);
    }
  },

  /**
   * Get the most recent scan.
   */
  async getLastScan() {
    try {
      const store = StorageManager._storage();
      const lastKey = StorageManager._scopedKey(STORAGE_KEYS.LAST_SCAN);
      const stored = await store.get(lastKey);
      return stored[lastKey] || null;
    } catch (err) {
      return null;
    }
  },

  /**
   * Search history by URL or title (case-insensitive).
   */
  async searchHistory(query) {
    if (!query) return StorageManager.getHistory();
    const q = query.toLowerCase();
    const history = await StorageManager.getHistory();
    return history.filter(s => {
      return (
        (s.url && s.url.toLowerCase().includes(q)) ||
        (s.pageTitle && s.pageTitle.toLowerCase().includes(q))
      );
    });
  },

  /**
   * Compare two scans by their IDs.
   * Returns added, resolved and unchanged findings.
   */
  async compareScans(scanIdA, scanIdB) {
    const [scanA, scanB] = await Promise.all([
      StorageManager.getScan(scanIdA),
      StorageManager.getScan(scanIdB),
    ]);

    if (!scanA) throw new Error(`Scan ${scanIdA} not found`);
    if (!scanB) throw new Error(`Scan ${scanIdB} not found`);

    const findingsA = (scanA.findings || []).map(f => `${f.ruleId}::${f.affectedElement || ''}`);
    const findingsB = (scanB.findings || []).map(f => `${f.ruleId}::${f.affectedElement || ''}`);

    const setA = new Set(findingsA);
    const setB = new Set(findingsB);

    const added = (scanB.findings || []).filter(f => !setA.has(`${f.ruleId}::${f.affectedElement || ''}`));
    const resolved = (scanA.findings || []).filter(f => !setB.has(`${f.ruleId}::${f.affectedElement || ''}`));
    const unchanged = (scanA.findings || []).filter(f => setB.has(`${f.ruleId}::${f.affectedElement || ''}`));

    return {
      scanA: { id: scanA.id, url: scanA.url, timestamp: scanA.timestamp, pageTitle: scanA.pageTitle },
      scanB: { id: scanB.id, url: scanB.url, timestamp: scanB.timestamp, pageTitle: scanB.pageTitle },
      added,
      resolved,
      unchanged,
      metricsComparison: StorageManager._compareMetrics(scanA.summary, scanB.summary),
    };
  },

  /**
   * Get settings.
   */
  async getSettings() {
    try {
      const store = StorageManager._storage();
      const settingsKey = StorageManager._scopedKey(STORAGE_KEYS.SETTINGS);
      const stored = await store.get(settingsKey);
      return stored[settingsKey] || StorageManager._defaultSettings();
    } catch {
      return StorageManager._defaultSettings();
    }
  },

  /**
   * Save settings.
   */
  async saveSettings(settings) {
    try {
      const store = StorageManager._storage();
      const settingsKey = StorageManager._scopedKey(STORAGE_KEYS.SETTINGS);
      const current = await StorageManager.getSettings();
      const merged = { ...current, ...settings };
      await store.set({ [settingsKey]: merged });
    } catch (err) {
      throw new Error(`Failed to save settings: ${err.message}`);
    }
  },

  /**
   * Get storage usage info.
   */
  async getStorageInfo() {
    try {
      const store = StorageManager._storage();
      if (store.getBytesInUse) {
        return new Promise((resolve) => {
          store.getBytesInUse(null, (bytes) => {
            resolve({ bytesUsed: bytes, quota: (typeof chrome !== 'undefined' && chrome.storage?.local?.QUOTA_BYTES) || 10485760 });
          });
        });
      }
      if (typeof window !== 'undefined' && window.localStorage) {
        let total = 0;
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key && key.startsWith('cb_')) {
            total += (window.localStorage.getItem(key) || '').length * 2;
          }
        }
        return { bytesUsed: total, quota: 5242880 };
      }
      return { bytesUsed: 0, quota: 10485760 };
    } catch {
      return { bytesUsed: null, quota: null };
    }
  },

  /**
   * Export scan by ID in specified format (json, markdown, csv).
   */
  async exportScan(scanId, format = 'json') {
    const scan = await StorageManager.getScan(scanId);
    if (!scan) throw new Error(`Scan not found: ${scanId}`);

    if (format === 'json') {
      return {
        filename: `scan_${scan.id || Date.now()}.json`,
        mimeType: 'application/json',
        content: JSON.stringify(scan, null, 2),
      };
    }

    if (format === 'markdown') {
      let md = `# Web Development Companion — Scan Report\n\n`;
      md += `- **URL**: ${scan.url || 'Unknown'}\n`;
      md += `- **Page Title**: ${scan.pageTitle || 'Untitled'}\n`;
      md += `- **Date**: ${new Date(scan.timestamp || Date.now()).toLocaleString()}\n`;
      md += `- **Total Issues**: ${scan.findings?.length || 0}\n\n`;

      md += `## Summary by Severity\n\n`;
      md += `- Critical: ${scan.summary?.critical || 0}\n`;
      md += `- High: ${scan.summary?.high || 0}\n`;
      md += `- Medium: ${scan.summary?.medium || 0}\n`;
      md += `- Low: ${scan.summary?.low || 0}\n`;
      md += `- Info: ${scan.summary?.info || 0}\n\n`;

      md += `## Findings\n\n`;
      (scan.findings || []).forEach((f, idx) => {
        md += `### ${idx + 1}. [${f.severity?.toUpperCase()}] ${f.title}\n`;
        md += `- **Category**: ${f.category}\n`;
        md += `- **Rule**: ${f.ruleId}\n`;
        md += `- **Status**: ${f.verificationStatus || 'N/A'}\n`;
        if (f.affectedElement) md += `- **Element**: \`${f.affectedElement}\`\n`;
        if (f.evidence) md += `- **Evidence**: ${f.evidence}\n`;
        if (f.description) md += `- **Description**: ${f.description}\n`;
        if (f.recommendation) md += `- **Recommendation**: ${f.recommendation}\n`;
        if (f.fixSuggestion?.codeExample) {
          md += `\n\`\`\`html\n${f.fixSuggestion.codeExample}\n\`\`\`\n`;
        }
        md += `\n---\n\n`;
      });

      return {
        filename: `scan_${scan.id || Date.now()}.md`,
        mimeType: 'text/markdown',
        content: md,
      };
    }

    if (format === 'csv') {
      const headers = ['Category', 'Rule ID', 'Severity', 'Title', 'Element', 'Status', 'Recommendation'];
      const rows = (scan.findings || []).map(f => [
        `"${(f.category || '').replace(/"/g, '""')}"`,
        `"${(f.ruleId || '').replace(/"/g, '""')}"`,
        `"${(f.severity || '').replace(/"/g, '""')}"`,
        `"${(f.title || '').replace(/"/g, '""')}"`,
        `"${(f.affectedElement || '').replace(/"/g, '""')}"`,
        `"${(f.verificationStatus || '').replace(/"/g, '""')}"`,
        `"${(f.recommendation || '').replace(/"/g, '""')}"`,
      ]);
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      return {
        filename: `scan_${scan.id || Date.now()}.csv`,
        mimeType: 'text/csv',
        content: csv,
      };
    }

    throw new Error(`Unsupported export format: ${format}`);
  },

  // ---- Private helpers ----

  _sanitiseScan(scan) {
    // Deep clone and remove any sensitive fields
    const safe = JSON.parse(JSON.stringify(scan));
    // Remove any form values if accidentally included
    if (safe.forms) {
      safe.forms = safe.forms.map(f => {
        if (f.inputs) {
          f.inputs = f.inputs.map(inp => {
            const s = { ...inp };
            delete s.value;
            delete s.placeholder; // Could contain hints
            return s;
          });
        }
        return f;
      });
    }
    return safe;
  },

  _compareMetrics(summaryA, summaryB) {
    if (!summaryA || !summaryB) return null;
    const metrics = {};
    const keys = new Set([...Object.keys(summaryA), ...Object.keys(summaryB)]);
    for (const key of keys) {
      const a = summaryA[key];
      const b = summaryB[key];
      if (typeof a === 'number' && typeof b === 'number') {
        metrics[key] = { before: a, after: b, change: b - a };
      }
    }
    return metrics;
  },

  _defaultSettings() {
    return {
      maxHistoryItems: 100,
      linkCheckEnabled: true,
      linkCheckTimeout: 8000,
      theme: 'dark',
      categoryRules: {
        accessibility: true,
        security: true,
        performance: true,
        structure: true,
        forms: true,
        links: true,
        images: true,
        scripts: true,
      },
      scoringWeights: {
        criticalPenalty: 25,
        highPenalty: 10,
        mediumPenalty: 4,
      },
    };
  },
};

const AuthManager = {
  async getUsers() {
    try {
      const store = StorageManager._storage();
      const stored = await store.get(AUTH_KEYS.USERS);
      let users = stored[AUTH_KEYS.USERS];
      if (!Array.isArray(users) || users.length === 0) {
        users = [...DEFAULT_USERS];
        await store.set({ [AUTH_KEYS.USERS]: users });
      }
      return users;
    } catch {
      return [...DEFAULT_USERS];
    }
  },

  async getCurrentUser() {
    try {
      const store = StorageManager._storage();
      const stored = await store.get(AUTH_KEYS.CURRENT_USER);
      let cur = stored[AUTH_KEYS.CURRENT_USER];
      if (cur === undefined) {
        cur = DEFAULT_USERS[0];
        await store.set({ [AUTH_KEYS.CURRENT_USER]: cur });
      }
      return cur;
    } catch {
      return DEFAULT_USERS[0];
    }
  },

  async register({ name, email, role, password }) {
    if (!name || !name.trim()) throw new Error('Full Name is required and compulsory');
    if (!email || !email.trim()) throw new Error('Email Address is required and compulsory');
    if (!role || !role.trim()) throw new Error('Workspace Title or Role is required and compulsory');
    if (!password || password.length < 4) throw new Error('Password is required and must be at least 4 characters');

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
    if (!identifier || !password) throw new Error('Please enter both email and password');
    const cleanId = identifier.trim().toLowerCase();
    const users = await AuthManager.getUsers();

    const user = users.find(u =>
      (u.email.toLowerCase() === cleanId || u.name.toLowerCase() === cleanId) &&
      u.password === password
    );

    if (!user) {
      throw new Error('Invalid email or password');
    }

    const store = StorageManager._storage();
    await store.set({ [AUTH_KEYS.CURRENT_USER]: user });
    StorageManager.setActiveUserId(user.id);
    return user;
  },

  async logout() {
    const store = StorageManager._storage();
    await store.set({ [AUTH_KEYS.CURRENT_USER]: null });
    StorageManager.setActiveUserId(null);
    return true;
  }
};

// Export for background service worker and tests
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { StorageManager, STORAGE_KEYS, AUTH_KEYS, AuthManager, SCANNER_VERSION };
} else if (typeof globalThis !== 'undefined') {
  globalThis.StorageManager = StorageManager;
  globalThis.STORAGE_KEYS = STORAGE_KEYS;
  globalThis.AUTH_KEYS = AUTH_KEYS;
  globalThis.AuthManager = AuthManager;
  globalThis.SCANNER_VERSION = SCANNER_VERSION;
}
