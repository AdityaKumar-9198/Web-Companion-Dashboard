/**
 * Page Scanner — extracts general page metadata and overview information.
 * Runs in the context of the target page via the content script.
 */

const PageScanner = {
  name: 'page',

  /**
   * Scan page-level metadata.
   * @returns {object} Page overview data
   */
  scan() {
    try {
      const title = document.title || null;
      const url = location.href;
      const hostname = location.hostname;
      const protocol = location.protocol;
      const lang = document.documentElement.lang || null;

      // Meta description
      const metaDesc = document.querySelector('meta[name="description"]');
      const description = metaDesc ? metaDesc.getAttribute('content') : null;

      // Viewport meta
      const viewportMeta = document.querySelector('meta[name="viewport"]');
      const viewport = viewportMeta ? viewportMeta.getAttribute('content') : null;

      // Canonical URL
      const canonical = document.querySelector('link[rel="canonical"]');
      const canonicalUrl = canonical ? canonical.getAttribute('href') : null;

      // Open Graph basics
      const ogTitle = document.querySelector('meta[property="og:title"]');
      const ogDesc = document.querySelector('meta[property="og:description"]');

      // Twitter card
      const twitterCard = document.querySelector('meta[name="twitter:card"]');

      // Charset
      const charsetMeta = document.querySelector('meta[charset]');
      const httpEquivCharset = document.querySelector('meta[http-equiv="Content-Type"]');
      const charset = charsetMeta
        ? charsetMeta.getAttribute('charset')
        : (httpEquivCharset ? httpEquivCharset.getAttribute('content') : null);

      // Robots meta
      const robotsMeta = document.querySelector('meta[name="robots"]');

      // Count all elements (approximate complexity)
      const totalElements = document.querySelectorAll('*').length;

      // Doctype detection
      const hasDoctype = document.doctype !== null;
      const doctypePublicId = document.doctype ? document.doctype.publicId : null;
      const isHtml5Doctype = hasDoctype && doctypePublicId === '';

      return {
        title,
        url,
        hostname,
        protocol,
        lang,
        description,
        viewport,
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
    } catch (err) {
      return { error: err.message, timestamp: Date.now() };
    }
  },
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PageScanner };
} else if (typeof globalThis !== 'undefined') {
  globalThis.PageScanner = PageScanner;
}
