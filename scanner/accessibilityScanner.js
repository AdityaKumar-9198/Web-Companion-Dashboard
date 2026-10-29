/**
 * Accessibility Scanner — rule-based accessibility checks.
 *
 * IMPORTANT LIMITATIONS:
 * - These are automated heuristic checks. They cannot replace
 *   manual accessibility testing or full WCAG audit.
 * - Findings that require human judgement are marked for manual review.
 * - No claim of complete WCAG compliance is made.
 */

const AccessibilityScanner = {
  name: 'accessibility',

  scan() {
    try {
      const findings = [];

      // 1. Images missing ALT attributes
      const images = Array.from(document.querySelectorAll('img'));
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        const alt = img.getAttribute('alt');
        if (alt === null) {
          const role = img.getAttribute('role');
          const isDecorativeByRole = role === 'presentation' || role === 'none';
          findings.push({
            ruleId: 'img-alt-missing',
            category: 'accessibility',
            severity: isDecorativeByRole ? 'low' : 'high',
            title: 'Image missing alt attribute',
            description: isDecorativeByRole
              ? 'Image has role="presentation" but is missing the alt attribute. Add alt="" to confirm decorative intent.'
              : 'Image is missing an alt attribute. Screen readers cannot describe this image.',
            element: img.outerHTML.substring(0, 200),
            affectedElement: img.src || img.getAttribute('src') || `Image ${i + 1}`,
            manualReview: false,
          });
        }
      }

      // 2. Form controls without labels
      const formControls = Array.from(document.querySelectorAll('input, select, textarea'));
      for (const control of formControls) {
        const type = (control.getAttribute('type') || 'text').toLowerCase();
        if (['hidden', 'submit', 'reset', 'button', 'image'].includes(type)) continue;

        const hasLabel = AccessibilityScanner._hasLabel(control);
        if (!hasLabel) {
          findings.push({
            ruleId: 'form-label-missing',
            category: 'accessibility',
            severity: 'high',
            title: 'Form control missing associated label',
            description: `A ${type} input has no associated label. Users of assistive technologies may not understand the field's purpose.`,
            element: control.outerHTML.substring(0, 200),
            affectedElement: control.id || control.getAttribute('name') || `${type} input`,
            manualReview: false,
          });
        }
      }

      // 3. Buttons without accessible names
      const buttons = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"]'));
      for (const btn of buttons) {
        const text = (btn.textContent || btn.getAttribute('value') || '').trim();
        const ariaLabel = btn.getAttribute('aria-label');
        const ariaLabelledBy = btn.getAttribute('aria-labelledby');
        const title = btn.getAttribute('title');
        if (!text && !ariaLabel && !ariaLabelledBy && !title) {
          findings.push({
            ruleId: 'button-no-accessible-name',
            category: 'accessibility',
            severity: 'high',
            title: 'Button may lack an accessible name',
            description: 'This button has no visible text, aria-label, aria-labelledby, or title. Screen readers cannot announce its purpose.',
            element: btn.outerHTML.substring(0, 200),
            affectedElement: btn.id || btn.className || 'button',
            manualReview: true,
          });
        }
      }

      // 4. Links with insufficient accessible names
      const links = Array.from(document.querySelectorAll('a'));
      for (const link of links) {
        const text = (link.textContent || '').trim();
        const ariaLabel = link.getAttribute('aria-label');
        const ariaLabelledBy = link.getAttribute('aria-labelledby');
        const title = link.getAttribute('title');
        const hasChildren = link.querySelectorAll('img[alt]').length > 0;

        if (!text && !ariaLabel && !ariaLabelledBy && !title && !hasChildren) {
          findings.push({
            ruleId: 'link-no-accessible-name',
            category: 'accessibility',
            severity: 'medium',
            title: 'Link may lack a meaningful accessible name',
            description: 'This link has no visible text or accessible name attributes. Screen reader users may not know the link destination.',
            element: link.outerHTML.substring(0, 200),
            affectedElement: link.href || link.getAttribute('href') || 'link',
            manualReview: true,
          });
        }

        // Generic link text check
        const genericTexts = ['click here', 'here', 'read more', 'more', 'link', 'this'];
        if (text && genericTexts.includes(text.toLowerCase()) && !ariaLabel) {
          findings.push({
            ruleId: 'link-generic-text',
            category: 'accessibility',
            severity: 'low',
            title: 'Link uses generic text',
            description: `Link text "${text}" is not descriptive. Screen readers present links out of context; descriptive text helps navigation.`,
            element: link.outerHTML.substring(0, 200),
            affectedElement: link.href || 'link',
            manualReview: true,
          });
        }
      }

      // 5. Missing document language
      const lang = document.documentElement.getAttribute('lang');
      if (!lang || lang.trim() === '') {
        findings.push({
          ruleId: 'html-lang-missing',
          category: 'accessibility',
          severity: 'medium',
          title: 'Document language not specified',
          description: 'The <html> element is missing a lang attribute. Screen readers use this to select the correct language for text-to-speech.',
          element: '<html> element',
          affectedElement: 'document',
          manualReview: false,
        });
      }

      // 6. Missing page title
      if (!document.title || document.title.trim() === '') {
        findings.push({
          ruleId: 'page-title-missing',
          category: 'accessibility',
          severity: 'high',
          title: 'Page title is missing or empty',
          description: 'A descriptive page title is required for browser history, bookmarks, and screen reader page announcements.',
          element: '<title> element',
          affectedElement: 'document',
          manualReview: false,
        });
      }

      // 7. ARIA role checks — role="button" on non-interactive elements
      const ariaButtons = Array.from(document.querySelectorAll('[role="button"]'));
      for (const el of ariaButtons) {
        const tag = el.tagName.toLowerCase();
        if (!['button', 'input', 'select', 'textarea', 'a'].includes(tag)) {
          const tabindex = el.getAttribute('tabindex');
          if (tabindex === null) {
            findings.push({
              ruleId: 'aria-role-button-not-focusable',
              category: 'accessibility',
              severity: 'medium',
              title: 'Element with role="button" is not keyboard focusable',
              description: `A <${tag}> has role="button" but no tabindex, making it inaccessible to keyboard-only users.`,
              element: el.outerHTML.substring(0, 200),
              affectedElement: tag,
              manualReview: false,
            });
          }
        }
      }

      // 8. Colour contrast — cannot be reliably checked with DOM API alone
      // Mark as requiring manual review
      findings.push({
        ruleId: 'color-contrast-manual',
        category: 'accessibility',
        severity: 'info',
        title: 'Colour contrast requires manual review',
        description: 'Automated colour contrast checks are not reliably possible via DOM inspection alone. Please use a dedicated colour contrast checker (e.g., WebAIM Contrast Checker) to verify WCAG 1.4.3 compliance.',
        element: null,
        affectedElement: 'page',
        manualReview: true,
      });

      // 9. Skip navigation link
      const firstLink = document.querySelector('a');
      const hasSkipLink = firstLink && (
        firstLink.href.includes('#') &&
        (firstLink.textContent || '').toLowerCase().includes('skip')
      );
      if (!hasSkipLink) {
        findings.push({
          ruleId: 'skip-nav-missing',
          category: 'accessibility',
          severity: 'low',
          title: 'Skip navigation link not detected',
          description: 'A "Skip to main content" link at the top of the page allows keyboard users to bypass repeated navigation. None was detected as the first link.',
          element: null,
          affectedElement: 'page navigation',
          manualReview: true,
        });
      }

      const summary = {
        total: findings.length,
        critical: findings.filter(f => f.severity === 'critical').length,
        high: findings.filter(f => f.severity === 'high').length,
        medium: findings.filter(f => f.severity === 'medium').length,
        low: findings.filter(f => f.severity === 'low').length,
        info: findings.filter(f => f.severity === 'info').length,
        requiresManualReview: findings.filter(f => f.manualReview).length,
      };

      return { findings, summary };
    } catch (err) {
      return { findings: [], summary: {}, error: err.message };
    }
  },

  _hasLabel(control) {
    if (control.getAttribute('aria-label')) return true;
    if (control.getAttribute('aria-labelledby')) return true;
    if (control.getAttribute('title')) return true;
    if (control.closest('label')) return true;
    if (control.id) {
      try {
        const label = document.querySelector(`label[for="${CSS.escape(control.id)}"]`);
        if (label) return true;
      } catch { /* ignore */ }
    }
    return false;
  },
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AccessibilityScanner };
} else if (typeof globalThis !== 'undefined') {
  globalThis.AccessibilityScanner = AccessibilityScanner;
}
