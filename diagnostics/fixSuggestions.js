/**
 * Fix Suggestions Engine — provides actionable remediation guidance
 * for known finding types.
 *
 * Suggestions are code examples and explanations only.
 * This engine does NOT modify the target website's source code.
 * Code examples are clearly labelled as suggested, not verified fixes.
 */

const FixSuggestions = {
  /**
   * Get fix suggestion for a given ruleId.
   * Returns {title, explanation, codeExample, references}
   */
  getSuggestion(ruleId, finding) {
    const provider = FixSuggestions.rules[ruleId];
    if (!provider) return FixSuggestions._defaultSuggestion(ruleId);
    return typeof provider === 'function' ? provider(finding) : provider;
  },

  /**
   * Enrich a finding with its fix suggestion.
   */
  enrichFinding(finding) {
    const suggestion = FixSuggestions.getSuggestion(finding.ruleId, finding);
    return { ...finding, fixSuggestion: suggestion };
  },

  /**
   * Enrich all findings in a scan result.
   */
  enrichAll(findings) {
    return findings.map(f => FixSuggestions.enrichFinding(f));
  },

  _defaultSuggestion(ruleId) {
    return {
      title: 'Review this finding manually',
      explanation: `No specific automated suggestion is available for rule "${ruleId}". Please review the finding description and apply appropriate remediation.`,
      codeExample: null,
      references: [],
    };
  },

  // ---- Rule-specific suggestions ----

  rules: {
    'img-alt-missing': {
      title: 'Add an alt attribute to the image',
      explanation: `Every <img> element requires an alt attribute. For meaningful images, provide a description of the image content. For decorative images that add no informational value, use alt="" (empty string) to instruct screen readers to skip the image.

Do NOT:
- Omit the alt attribute entirely (this is different from alt="")
- Use the filename as alt text
- Use generic phrases like "image" or "photo"`,
      codeExample: `<!-- Meaningful image: describe the content -->
<img src="chart.png" alt="Sales grew by 40% in Q3 2024">

<!-- Decorative image: empty alt tells screen readers to skip it -->
<img src="decorative-line.png" alt="" role="presentation">`,
      references: [
        'https://www.w3.org/WAI/tutorials/images/',
        'https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img#accessibility',
      ],
    },

    'form-label-missing': {
      title: 'Associate a label with every form control',
      explanation: `Form inputs, selects, and textareas must be programmatically associated with a descriptive label. Screen readers announce the label when the user focuses the control.

Preferred approaches (in order):
1. Explicit label with for/id association
2. Wrapping label element
3. aria-label attribute
4. aria-labelledby referencing another element

Do NOT use placeholder text as the sole label — placeholders disappear when the user types.`,
      codeExample: `<!-- Preferred: explicit label association -->
<label for="email">Email address</label>
<input type="email" id="email" name="email" required>

<!-- Alternative: wrapping label -->
<label>
  Email address
  <input type="email" name="email" required>
</label>

<!-- Alternative: aria-label for icon-only inputs -->
<input type="search" aria-label="Search products" name="q">`,
      references: [
        'https://www.w3.org/WAI/tutorials/forms/labels/',
        'https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-label',
      ],
    },

    'html-lang-missing': {
      title: 'Add a lang attribute to the <html> element',
      explanation: 'The lang attribute on the <html> element tells browsers and screen readers which language the page content is in. This affects text-to-speech pronunciation and language-specific rendering.',
      codeExample: `<!-- English -->
<!DOCTYPE html>
<html lang="en">

<!-- French -->
<html lang="fr">

<!-- British English -->
<html lang="en-GB">`,
      references: [
        'https://www.w3.org/International/questions/qa-html-language-declarations',
        'https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/lang',
      ],
    },

    'page-title-missing': {
      title: 'Add a descriptive <title> element',
      explanation: 'The page title is used in browser tabs, bookmarks, search results, and screen reader page announcements. It should be unique, descriptive, and concise (typically 50-60 characters).',
      codeExample: `<head>
  <!-- Good: descriptive, includes site name -->
  <title>Product Listings | Acme Store</title>

  <!-- Good: specific page -->
  <title>Contact Us | Acme Corporation</title>

  <!-- Avoid: generic -->
  <!-- <title>Home</title> -->
</head>`,
      references: [
        'https://developer.mozilla.org/en-US/docs/Web/HTML/Element/title',
        'https://www.w3.org/WAI/WCAG21/Understanding/page-titled.html',
      ],
    },

    'meta-description-missing': {
      title: 'Add a meta description',
      explanation: 'The meta description summarises the page content for search engines and social sharing. It should be 120-160 characters, unique per page, and accurately describe the content.',
      codeExample: `<head>
  <meta name="description" content="Browse our selection of handcrafted furniture. Free UK delivery on orders over £50. Shop chairs, tables and more.">
</head>`,
      references: [
        'https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta/name#description',
      ],
    },

    'viewport-missing': {
      title: 'Add a viewport meta tag',
      explanation: 'The viewport meta tag controls how the browser scales the page on mobile devices. Without it, mobile browsers render the page at desktop width and then scale it down, causing poor mobile experience.',
      codeExample: `<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>`,
      references: [
        'https://developer.mozilla.org/en-US/docs/Web/HTML/Viewport_meta_tag',
      ],
    },

    'button-no-accessible-name': {
      title: 'Provide an accessible name for the button',
      explanation: 'Buttons must have a name that screen readers can announce. Use visible text content, aria-label, or aria-labelledby. Icon-only buttons are a common source of this issue.',
      codeExample: `<!-- Text content (preferred) -->
<button type="submit">Search</button>

<!-- Icon button with aria-label -->
<button type="button" aria-label="Close dialog">
  <svg aria-hidden="true">...</svg>
</button>

<!-- Using aria-labelledby -->
<h2 id="dialog-title">Confirm Deletion</h2>
<button aria-labelledby="dialog-title">Confirm</button>`,
      references: [
        'https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html',
      ],
    },

    'link-no-accessible-name': {
      title: 'Add a meaningful accessible name to the link',
      explanation: 'Links must have descriptive text that explains where they go, even when read out of context by a screen reader. Use visible text, aria-label, or aria-labelledby.',
      codeExample: `<!-- Good: descriptive text -->
<a href="/products">Browse our product range</a>

<!-- Icon link: use aria-label -->
<a href="/twitter" aria-label="Follow us on Twitter">
  <svg aria-hidden="true">...</svg>
</a>

<!-- Avoid: non-descriptive -->
<!-- <a href="/products">Click here</a> -->`,
      references: [
        'https://www.w3.org/WAI/WCAG21/Understanding/link-purpose-in-context.html',
      ],
    },

    'link-generic-text': {
      title: 'Replace generic link text with descriptive text',
      explanation: 'Generic link text like "click here", "read more", or "here" does not convey the link destination. Screen reader users navigate by links, so descriptive text is essential.',
      codeExample: `<!-- Avoid -->
<a href="/report-2024.pdf">Read more</a>

<!-- Better -->
<a href="/report-2024.pdf">Read the 2024 Annual Report (PDF)</a>

<!-- When context is needed -->
<p>Our annual report is now available. <a href="/report-2024.pdf" aria-label="Read the 2024 Annual Report">Read more</a></p>`,
      references: [
        'https://www.w3.org/WAI/WCAG21/Understanding/link-purpose-in-context.html',
      ],
    },

    'h1-missing': {
      title: 'Add an H1 heading that describes the page content',
      explanation: 'Every page should have exactly one H1 that identifies the main topic. It\'s used by screen readers for page navigation and by search engines for content relevance.',
      codeExample: `<body>
  <header>
    <nav>...</nav>
  </header>
  <main>
    <h1>Product Catalogue</h1>
    <h2>Featured Products</h2>
    ...
  </main>
</body>`,
      references: [
        'https://developer.mozilla.org/en-US/docs/Web/HTML/Element/Heading_Elements',
      ],
    },

    'heading-level-skipped': {
      title: 'Use sequential heading levels without skipping',
      explanation: 'Heading levels should follow a logical hierarchy (H1 → H2 → H3). Skipping levels (e.g., H1 to H3) breaks the document outline and confuses screen reader users who navigate by headings.',
      codeExample: `<!-- Incorrect: skips H2 -->
<h1>Main Title</h1>
<h3>Subsection</h3>

<!-- Correct: sequential -->
<h1>Main Title</h1>
  <h2>Section</h2>
    <h3>Subsection</h3>`,
      references: [
        'https://www.w3.org/WAI/tutorials/page-structure/headings/',
      ],
    },

    'main-landmark-missing': {
      title: 'Add a <main> landmark element',
      explanation: 'The <main> element identifies the primary content area and allows screen reader users to skip directly to the main content. There should be only one <main> per page.',
      codeExample: `<body>
  <header>...</header>
  <nav>...</nav>
  <main id="main-content">
    <h1>Page Title</h1>
    <!-- Main page content -->
  </main>
  <footer>...</footer>
</body>`,
      references: [
        'https://developer.mozilla.org/en-US/docs/Web/HTML/Element/main',
      ],
    },

    'iframe-no-title': {
      title: 'Add a title attribute to the iFrame',
      explanation: 'iFrames require a descriptive title attribute so screen reader users understand what the embedded content is.',
      codeExample: `<!-- Good -->
<iframe src="map.html" title="Interactive map showing store locations"></iframe>

<!-- Good -->
<iframe src="https://www.youtube.com/embed/..." title="Product demo video" allowfullscreen></iframe>`,
      references: [
        'https://www.w3.org/WAI/WCAG21/Techniques/html/H64',
      ],
    },

    'form-insecure-action': {
      title: 'Use HTTPS for form submission endpoints',
      explanation: 'Forms that submit sensitive data over HTTP expose that data to interception. Ensure all form action URLs use HTTPS.',
      codeExample: `<!-- Insecure -->
<form action="http://example.com/login" method="post">

<!-- Secure -->
<form action="https://example.com/login" method="post">

<!-- Relative URL (recommended — inherits current protocol) -->
<form action="/login" method="post">`,
      references: [
        'https://developer.mozilla.org/en-US/docs/Web/Security/Transport_Layer_Security',
      ],
    },

    'external-script-no-sri': {
      title: 'Add Subresource Integrity (SRI) to external scripts',
      explanation: 'SRI allows browsers to verify that files fetched from external servers have not been modified. If the external server is compromised, SRI prevents the tampered file from loading.',
      codeExample: `<!-- Without SRI (vulnerable) -->
<script src="https://cdn.example.com/library.js"></script>

<!-- With SRI (secure) -->
<script
  src="https://cdn.example.com/library.js"
  integrity="sha384-[hash]"
  crossorigin="anonymous">
</script>

<!-- Generate the hash with: -->
<!-- openssl dgst -sha384 -binary library.js | openssl base64 -A -->`,
      references: [
        'https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity',
        'https://www.srihash.org/',
      ],
    },

    'potential-secret-exposed': {
      title: 'Remove secrets from client-side code immediately',
      explanation: `Secrets, API keys, and tokens embedded in client-side JavaScript are visible to every user who views the page source. They MUST be removed immediately.

Why this is critical:
- Anyone can view page source or the browser developer tools
- Web crawlers, bots, and security scanners harvest exposed keys
- Exposed keys can be used to access services, incur charges, or steal data

What to do instead:
1. Remove the secret from client-side code
2. Rotate (regenerate) the secret immediately — it should be considered compromised
3. Move the secret to a server-side environment variable
4. If the client needs to call the API, create a server-side proxy endpoint`,
      codeExample: `// NEVER do this in client-side code:
const API_KEY = 'sk-abc123...'; // Exposed to all users

// Instead: server-side proxy (Node.js example)
// Client calls your own server:
fetch('/api/search?q=...')

// Your server calls the external API privately:
// app.get('/api/search', (req, res) => {
//   const result = await externalApi(process.env.API_KEY, req.query.q);
//   res.json(result);
// });`,
      references: [
        'https://owasp.org/www-community/vulnerabilities/Insufficient_credential_management',
      ],
    },

    'token-in-localstorage': {
      title: 'Avoid storing sensitive tokens in localStorage',
      explanation: `localStorage is accessible to any JavaScript running on the page, including third-party scripts. If an XSS vulnerability exists, all localStorage data can be exfiltrated.

Recommended approach:
- Store session tokens in HttpOnly, Secure, SameSite cookies
- HttpOnly cookies cannot be read by JavaScript at all
- For single-page apps that need localStorage, assess the XSS risk carefully

Note: This finding is based on localStorage key names only. Values were not read.`,
      codeExample: `// Avoid: token in localStorage
localStorage.setItem('auth_token', token); // Vulnerable to XSS

// Better: HttpOnly cookie (set by server, not client-side JS)
// Server response header:
// Set-Cookie: session=abc123; HttpOnly; Secure; SameSite=Strict; Path=/`,
      references: [
        'https://owasp.org/www-community/HttpOnly',
        'https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html',
      ],
    },

    'mixed-content': {
      title: 'Load all resources over HTTPS',
      explanation: 'Loading resources (images, scripts, stylesheets) over HTTP on an HTTPS page undermines the security guarantees of HTTPS. Modern browsers block active mixed content and warn about passive mixed content.',
      codeExample: `<!-- Change HTTP resource URLs to HTTPS -->

<!-- Before (mixed content) -->
<script src="http://cdn.example.com/lib.js"></script>
<img src="http://cdn.example.com/logo.png">

<!-- After (secure) -->
<script src="https://cdn.example.com/lib.js"></script>
<img src="https://cdn.example.com/logo.png">

<!-- Use protocol-relative URLs if needed -->
<script src="//cdn.example.com/lib.js"></script>`,
      references: [
        'https://developer.mozilla.org/en-US/docs/Web/Security/Mixed_content',
      ],
    },

    'iframe-no-sandbox': {
      title: 'Add sandbox attribute to iFrames',
      explanation: 'The sandbox attribute restricts what an embedded iFrame can do, reducing the risk of malicious content affecting the parent page.',
      codeExample: `<!-- Apply sandbox with minimum required permissions -->
<iframe
  src="https://example.com/widget"
  sandbox="allow-scripts allow-same-origin"
  title="Widget description">
</iframe>

<!-- Common sandbox values:
  allow-scripts         - Allow JS execution
  allow-same-origin     - Allow same-origin access
  allow-forms           - Allow form submission
  allow-popups          - Allow popups
  allow-top-navigation  - Allow navigation of top frame
-->`,
      references: [
        'https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#sandbox',
        'https://developer.chrome.com/docs/extensions/mv3/sandboxingEval/',
      ],
    },

    'page-over-http': {
      title: 'Serve the page over HTTPS',
      explanation: 'HTTP transmits all data in plaintext. Users\' data, including form submissions and cookies, can be intercepted. Obtain an SSL/TLS certificate and redirect all HTTP traffic to HTTPS.',
      codeExample: `# Apache: redirect HTTP to HTTPS
<VirtualHost *:80>
  ServerName example.com
  Redirect permanent / https://example.com/
</VirtualHost>

# Nginx: redirect HTTP to HTTPS
server {
  listen 80;
  server_name example.com;
  return 301 https://$host$request_uri;
}`,
      references: [
        'https://letsencrypt.org/',
        'https://developer.mozilla.org/en-US/docs/Web/Security/Transport_Layer_Security',
      ],
    },

    'high-ttfb': {
      title: 'Investigate and reduce Time to First Byte',
      explanation: 'TTFB measures how long the server takes to start sending a response. High TTFB can indicate slow server processing, database queries, or lack of caching.',
      codeExample: `// Improvements to investigate:
// 1. Add server-side caching (Redis, Memcached)
// 2. Optimise database queries
// 3. Use a CDN
// 4. Enable compression (gzip/brotli)
// 5. Review server infrastructure

// Nginx caching example:
// location / {
//   proxy_cache_valid 200 1d;
//   add_header X-Cache-Status $upstream_cache_status;
// }`,
      references: [
        'https://web.dev/ttfb/',
      ],
    },

    'link-missing-href': {
      title: 'Add an href attribute or use a button element',
      explanation: 'An <a> element without an href is not a link — it is an interactive element that looks like a link. If it triggers an action, use a <button> element instead. If it should navigate, add the href.',
      codeExample: `<!-- If it triggers a JavaScript action: use button -->
<button type="button" class="link-style" onclick="openModal()">
  Open settings
</button>

<!-- If it should navigate: add href -->
<a href="/settings">Settings</a>

<!-- Placeholder links during development: use # but add aria -->
<a href="#" aria-disabled="true">Coming soon</a>`,
      references: [
        'https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a',
      ],
    },

    'image-load-failed': {
      title: 'Verify the image source is correct and accessible',
      explanation: 'An image with a non-zero naturalWidth loads successfully. Zero naturalWidth after load completion may indicate a broken image URL, permission error, or CORS restriction.',
      codeExample: `<!-- Check the src URL is correct -->
<img src="/images/product-photo.jpg" alt="Product photo">

<!-- Add error handling in JavaScript if needed -->
<img
  src="/images/product-photo.jpg"
  alt="Product photo"
  onerror="this.src='/images/placeholder.jpg'; this.alt='Image unavailable'">`,
      references: [
        'https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/naturalWidth',
      ],
    },

    'source-map-exposed': {
      title: 'Remove or restrict access to source maps in production',
      explanation: 'Source maps allow developers to debug minified code but expose the original source code structure to end users in production. Consider removing them or restricting access.',
      codeExample: `// Webpack: remove source maps for production
module.exports = {
  mode: 'production',
  devtool: false, // No source maps
  // Or: devtool: 'hidden-source-map', // Generate but don't reference in JS
};

// Vite: disable source maps for production
export default defineConfig({
  build: {
    sourcemap: false,
  },
});`,
      references: [
        'https://developer.chrome.com/docs/devtools/javascript/source-maps/',
      ],
    },

    'aria-role-button-not-focusable': {
      title: 'Make role="button" elements keyboard focusable',
      explanation: 'Elements with role="button" must be keyboard-accessible. Add tabindex="0" to make them focusable, and handle keyboard events (Enter and Space) just like click events.',
      codeExample: `<!-- Add tabindex and keyboard handler -->
<div
  role="button"
  tabindex="0"
  onclick="handleClick()"
  onkeydown="if(event.key==='Enter'||event.key===' ')handleClick()"
  class="custom-button">
  Click me
</div>

<!-- Better: use native <button> element instead -->
<button type="button" class="custom-button" onclick="handleClick()">
  Click me
</button>`,
      references: [
        'https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/button_role',
      ],
    },

    'skip-nav-missing': {
      title: 'Add a skip navigation link at the top of the page',
      explanation: 'A "Skip to main content" link as the first focusable element allows keyboard users to bypass repeated navigation links. It can be visually hidden and shown only on focus.',
      codeExample: `<!-- HTML: first element in <body> -->
<a href="#main-content" class="skip-link">Skip to main content</a>
<nav>...</nav>
<main id="main-content">...</main>

/* CSS: visible only on focus */
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: #000;
  color: #fff;
  padding: 8px;
  z-index: 9999;
}
.skip-link:focus {
  top: 0;
}`,
      references: [
        'https://webaim.org/techniques/skipnav/',
      ],
    },
  },
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FixSuggestions };
} else if (typeof globalThis !== 'undefined') {
  globalThis.FixSuggestions = FixSuggestions;
}
