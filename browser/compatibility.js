/**
 * Browser compatibility adapter.
 * Normalises differences between Chrome/Edge (Manifest V3) and Firefox
 * (which supports both Manifest V2 and V3 but with some API differences).
 */

const BrowserCompat = (() => {
  // Detect the browser API namespace
  const api = (typeof browser !== 'undefined' && browser.runtime)
    ? browser   // Firefox
    : chrome;   // Chrome, Edge

  const isFirefox = typeof browser !== 'undefined' && browser.runtime !== undefined;
  const isChrome = !isFirefox && typeof chrome !== 'undefined';

  /**
   * Send a message to the extension background, returning a Promise.
   * Firefox already returns a Promise; Chrome requires a callback wrapper.
   */
  function sendMessage(message) {
    return new Promise((resolve, reject) => {
      try {
        if (isFirefox) {
          browser.runtime.sendMessage(message).then(resolve).catch(reject);
        } else {
          chrome.runtime.sendMessage(message, (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(response);
            }
          });
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Send a message to a specific tab's content script.
   */
  function sendTabMessage(tabId, message) {
    return new Promise((resolve, reject) => {
      try {
        if (isFirefox) {
          browser.tabs.sendMessage(tabId, message).then(resolve).catch(reject);
        } else {
          chrome.tabs.sendMessage(tabId, message, (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(response);
            }
          });
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Get the current active tab in the current window.
   */
  function getCurrentTab() {
    return new Promise((resolve, reject) => {
      try {
        api.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (api.runtime.lastError) {
            reject(new Error(api.runtime.lastError.message));
            return;
          }
          if (!tabs || tabs.length === 0) {
            reject(new Error('No active tab found'));
            return;
          }
          resolve(tabs[0]);
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Get a tab by ID.
   */
  function getTab(tabId) {
    return new Promise((resolve, reject) => {
      try {
        api.tabs.get(tabId, (tab) => {
          if (api.runtime.lastError) {
            reject(new Error(api.runtime.lastError.message));
          } else {
            resolve(tab);
          }
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Open a new tab or focus an existing one with the given URL.
   */
  function openTab(url) {
    return new Promise((resolve, reject) => {
      try {
        api.tabs.create({ url }, (tab) => {
          if (api.runtime.lastError) {
            reject(new Error(api.runtime.lastError.message));
          } else {
            resolve(tab);
          }
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Storage API wrapper — uses chrome.storage.local.
   * Firefox supports the same API.
   */
  const storage = {
    get(keys) {
      return new Promise((resolve, reject) => {
        api.storage.local.get(keys, (result) => {
          if (api.runtime.lastError) {
            reject(new Error(api.runtime.lastError.message));
          } else {
            resolve(result);
          }
        });
      });
    },

    set(items) {
      return new Promise((resolve, reject) => {
        api.storage.local.set(items, () => {
          if (api.runtime.lastError) {
            reject(new Error(api.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      });
    },

    remove(keys) {
      return new Promise((resolve, reject) => {
        api.storage.local.remove(keys, () => {
          if (api.runtime.lastError) {
            reject(new Error(api.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      });
    },

    clear() {
      return new Promise((resolve, reject) => {
        api.storage.local.clear(() => {
          if (api.runtime.lastError) {
            reject(new Error(api.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      });
    },

    getBytesInUse() {
      return new Promise((resolve) => {
        if (api.storage.local.getBytesInUse) {
          api.storage.local.getBytesInUse(null, (bytes) => resolve(bytes));
        } else {
          resolve(null); // Firefox may not support this
        }
      });
    },
  };

  /**
   * Add a runtime message listener.
   */
  function onMessage(callback) {
    api.runtime.onMessage.addListener(callback);
  }

  /**
   * Get extension URL for a resource path.
   */
  function getURL(path) {
    return api.runtime.getURL(path);
  }

  /**
   * Execute a script in a specific tab.
   * Uses scripting API (MV3) with fallback for Firefox.
   */
  function executeScript(tabId, details) {
    return new Promise((resolve, reject) => {
      try {
        if (api.scripting && api.scripting.executeScript) {
          api.scripting.executeScript({
            target: { tabId },
            ...details,
          }).then(resolve).catch(reject);
        } else if (api.tabs.executeScript) {
          // Firefox MV2 fallback
          api.tabs.executeScript(tabId, details, (result) => {
            if (api.runtime.lastError) {
              reject(new Error(api.runtime.lastError.message));
            } else {
              resolve(result);
            }
          });
        } else {
          reject(new Error('No scripting API available'));
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  return {
    api,
    isFirefox,
    isChrome,
    sendMessage,
    sendTabMessage,
    getCurrentTab,
    getTab,
    openTab,
    storage,
    onMessage,
    getURL,
    executeScript,
  };
})();

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BrowserCompat };
} else if (typeof globalThis !== 'undefined') {
  globalThis.BrowserCompat = BrowserCompat;
}
