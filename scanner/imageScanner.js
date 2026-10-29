/**
 * Image Scanner — analyses all images on the page.
 * Does not store image data beyond what's needed for reporting.
 */

const ImageScanner = {
  name: 'images',

  scan() {
    try {
      const images = Array.from(document.querySelectorAll('img'));
      const results = [];

      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        const src = img.getAttribute('src') || img.currentSrc || null;
        const alt = img.getAttribute('alt'); // null = missing, '' = empty (decorative intent)
        const hasSrc = !!src;
        const altMissing = alt === null;
        const altEmpty = alt === '';
        const altHasText = alt !== null && alt !== '';

        // Loading attribute
        const loading = img.getAttribute('loading') || null;

        // Dimensions (may be 0 if not loaded)
        const naturalWidth = img.naturalWidth;
        const naturalHeight = img.naturalHeight;

        // Failed image detection — naturalWidth/Height are 0 for failed images
        // but also for images not yet loaded. We note the state rather than assert.
        let loadState = 'unknown';
        if (img.complete) {
          if (naturalWidth === 0 && hasSrc) {
            loadState = 'likely_failed';
          } else if (naturalWidth > 0) {
            loadState = 'loaded';
          } else if (!hasSrc) {
            loadState = 'no_src';
          }
        } else {
          loadState = 'loading';
        }

        // Sanitise src — avoid storing data URIs in full (could be large)
        let displaySrc = src;
        if (src && src.startsWith('data:')) {
          displaySrc = `[data URI, ~${Math.round(src.length / 1024)} KB]`;
        } else if (src) {
          // Keep full src for reporting but truncate if very long
          displaySrc = src.length > 200 ? src.substring(0, 197) + '…' : src;
        }

        // Role attribute — role="presentation" is also decorative
        const role = img.getAttribute('role') || null;
        const isDecorativeByRole = role === 'presentation' || role === 'none';

        results.push({
          index: i + 1,
          src: displaySrc,
          altMissing,
          altEmpty,
          altHasText,
          altValue: altHasText ? (alt.length > 150 ? alt.substring(0, 147) + '…' : alt) : null,
          loading,
          loadState,
          naturalWidth,
          naturalHeight,
          isDecorativeByRole,
          role,
        });
      }

      const summary = {
        total: results.length,
        missingAlt: results.filter(r => r.altMissing).length,
        emptyAlt: results.filter(r => r.altEmpty).length,
        hasAlt: results.filter(r => r.altHasText).length,
        likelyFailed: results.filter(r => r.loadState === 'likely_failed').length,
        noSrc: results.filter(r => r.loadState === 'no_src').length,
        lazyLoaded: results.filter(r => r.loading === 'lazy').length,
      };

      return { images: results, summary };
    } catch (err) {
      return { images: [], summary: {}, error: err.message };
    }
  },
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ImageScanner };
} else if (typeof globalThis !== 'undefined') {
  globalThis.ImageScanner = ImageScanner;
}
