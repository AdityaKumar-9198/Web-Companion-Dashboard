/**
 * Script Scanner — analyses script elements on the page.
 * Does NOT execute any scripts from the page.
 * Only inspects element attributes and structural metadata.
 */

const ScriptScanner = {
  name: 'scripts',

  scan() {
    try {
      const scripts = Array.from(document.querySelectorAll('script'));
      const results = [];

      for (let i = 0; i < scripts.length; i++) {
        const script = scripts[i];
        const src = script.getAttribute('src') || null;
        const type = script.getAttribute('type') || null;
        const isAsync = script.hasAttribute('async');
        const isDefer = script.hasAttribute('defer');
        const isModule = type === 'module';
        const isExternal = !!src;
        const isInline = !src;
        const crossOrigin = script.getAttribute('crossorigin') || null;
        const integrity = script.getAttribute('integrity') || null;
        const nonce = script.getAttribute('nonce') ? '[PRESENT]' : null;

        // For external scripts, check if origin matches current page
        let scriptOrigin = null;
        if (src) {
          try {
            const url = new URL(src, location.href);
            scriptOrigin = url.hostname === location.hostname ? 'same-origin' : 'cross-origin';
          } catch {
            scriptOrigin = 'invalid';
          }
        }

        // Inline script size estimate (not the content itself)
        const inlineContentLength = isInline ? (script.textContent || '').length : null;

        results.push({
          index: i + 1,
          src: src ? src.substring(0, 200) : null,
          type,
          isAsync,
          isDefer,
          isModule,
          isExternal,
          isInline,
          scriptOrigin,
          crossOrigin,
          hasIntegrity: !!integrity,
          integrity: integrity ? integrity.substring(0, 100) : null, // SRI hash
          nonce,
          inlineContentLength,
        });
      }

      // Classify external scripts by origin
      const externalScripts = results.filter(r => r.isExternal);
      const crossOriginScripts = externalScripts.filter(r => r.scriptOrigin === 'cross-origin');
      const scriptsWithoutSRI = crossOriginScripts.filter(r => !r.hasIntegrity);

      const summary = {
        total: results.length,
        external: externalScripts.length,
        inline: results.filter(r => r.isInline).length,
        async: results.filter(r => r.isAsync).length,
        defer: results.filter(r => r.isDefer).length,
        module: results.filter(r => r.isModule).length,
        crossOrigin: crossOriginScripts.length,
        withSRI: results.filter(r => r.hasIntegrity).length,
        crossOriginWithoutSRI: scriptsWithoutSRI.length,
      };

      return { scripts: results, summary };
    } catch (err) {
      return { scripts: [], summary: {}, error: err.message };
    }
  },
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ScriptScanner };
} else if (typeof globalThis !== 'undefined') {
  globalThis.ScriptScanner = ScriptScanner;
}
