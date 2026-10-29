/**
 * Diagnostic Engine — normalises findings from all analysis modules
 * into a consistent, deduplicated structure.
 *
 * Each finding has:
 * - id: unique identifier
 * - category: module name
 * - ruleId: rule identifier
 * - title: human-readable title
 * - description: detailed description
 * - severity: critical | high | medium | low | info
 * - evidence: specific evidence string
 * - affectedElement: element reference where safe
 * - recommendation: actionable fix guidance
 * - codeExample: optional code snippet
 * - verificationStatus: confidence/status
 * - manualReview: boolean
 * - timestamp: when finding was generated
 */

const DiagnosticEngine = {
  SCANNER_VERSION: '1.0.0',

  /**
   * Process raw scan data from all modules into normalised findings.
   * @param {object} rawData - Combined output of all scanners
   * @param {string} pageUrl - The scanned page URL
   * @param {string} pageTitle - The scanned page title
   * @returns {object} Normalised scan result
   */
  process(rawData, pageUrl, pageTitle) {
    const findings = [];
    const timestamp = rawData.page?.timestamp || Date.now();

    // Process each module's findings
    DiagnosticEngine._processPageFindings(rawData.page, findings);
    DiagnosticEngine._processImageFindings(rawData.images, findings);
    DiagnosticEngine._processLinkFindings(rawData.links, findings);
    DiagnosticEngine._processStructureFindings(rawData.structure, findings);
    DiagnosticEngine._processFormFindings(rawData.forms, findings);
    DiagnosticEngine._processScriptFindings(rawData.scripts, findings);
    DiagnosticEngine._processAccessibilityFindings(rawData.accessibility, findings);
    DiagnosticEngine._processPerformanceFindings(rawData.performance, findings);
    DiagnosticEngine._processSecurityFindings(rawData.security, findings);

    // Deduplicate by ruleId + affectedElement
    const deduplicated = DiagnosticEngine._deduplicate(findings);

    // Sort by severity
    const sorted = deduplicated.sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
      return (order[a.severity] ?? 5) - (order[b.severity] ?? 5);
    });

    // Assign unique IDs
    sorted.forEach((f, i) => {
      f.id = `finding_${timestamp}_${i}`;
    });

    const summary = {
      total: sorted.length,
      critical: sorted.filter(f => f.severity === 'critical').length,
      high: sorted.filter(f => f.severity === 'high').length,
      medium: sorted.filter(f => f.severity === 'medium').length,
      low: sorted.filter(f => f.severity === 'low').length,
      info: sorted.filter(f => f.severity === 'info').length,
      byCategory: DiagnosticEngine._countByCategory(sorted),
      images: rawData.images?.summary || {},
      links: rawData.links?.summary || {},
      forms: rawData.forms?.summary || {},
      scripts: rawData.scripts?.summary || {},
      accessibility: rawData.accessibility?.summary || {},
      security: rawData.security?.summary || {},
    };

    return {
      id: `scan_${timestamp}_${Math.random().toString(36).substr(2, 8)}`,
      url: pageUrl,
      pageTitle: pageTitle || rawData.page?.title || 'Unknown',
      timestamp,
      scannerVersion: DiagnosticEngine.SCANNER_VERSION,
      summary,
      findings: sorted,
      rawData: {
        page: rawData.page,
        imagesSummary: rawData.images?.summary,
        linksSummary: rawData.links?.summary,
        formsSummary: rawData.forms?.summary,
        scriptsSummary: rawData.scripts?.summary,
        accessibilitySummary: rawData.accessibility?.summary,
        performanceSummary: rawData.performance?.navigationTiming,
        securitySummary: rawData.security?.summary,
        securityChecklist: rawData.security?.checklist,
        // Include full detail arrays for dashboard display
        images: rawData.images?.images,
        links: rawData.links?.links,
        forms: rawData.forms?.forms,
        scripts: rawData.scripts?.scripts,
        accessibilityFindings: rawData.accessibility?.findings,
        securityFindings: rawData.security?.findings,
        performance: rawData.performance,
        structure: rawData.structure,
      },
    };
  },

  _processPageFindings(page, findings) {
    if (!page) return;

    if (Array.isArray(page.findings)) {
      findings.push(...page.findings);
    }

    if (!page.title || page.title.trim() === '') {
      findings.push({
        category: 'structure',
        ruleId: 'page-title-missing',
        title: 'Page title is missing or empty',
        description: 'The page has no <title> element or an empty title.',
        severity: 'high',
        evidence: 'document.title is empty',
        affectedElement: '<title>',
        manualReview: false,
        verificationStatus: 'finding_detected',
      });
    }

    if (!page.lang || page.lang.trim() === '') {
      findings.push({
        category: 'accessibility',
        ruleId: 'html-lang-missing',
        title: 'Document language not specified',
        description: 'The <html> element is missing a lang attribute.',
        severity: 'medium',
        evidence: 'document.documentElement.lang is empty',
        affectedElement: '<html>',
        manualReview: false,
        verificationStatus: 'finding_detected',
      });
    }

    if (!page.description) {
      findings.push({
        category: 'structure',
        ruleId: 'meta-description-missing',
        title: 'Meta description is missing',
        description: 'No <meta name="description"> tag was found.',
        severity: 'low',
        evidence: 'No meta[name="description"] element',
        affectedElement: '<head>',
        manualReview: false,
        verificationStatus: 'finding_detected',
      });
    }

    if (!page.viewport) {
      findings.push({
        category: 'structure',
        ruleId: 'viewport-missing',
        title: 'Viewport meta tag is missing',
        description: 'No <meta name="viewport"> tag was found. Mobile rendering may be incorrect.',
        severity: 'medium',
        evidence: 'No meta[name="viewport"] element',
        affectedElement: '<head>',
        manualReview: false,
        verificationStatus: 'finding_detected',
      });
    }

    if (page.protocol === 'http:') {
      findings.push({
        category: 'security',
        ruleId: 'page-over-http',
        title: 'Page served over HTTP',
        description: 'The page URL uses HTTP. Data is transmitted without encryption.',
        severity: 'high',
        evidence: `URL: ${page.url}`,
        affectedElement: 'page URL',
        manualReview: false,
        verificationStatus: 'finding_detected',
      });
    }
  },

  _processImageFindings(imagesData, findings) {
    if (!imagesData) return;

    if (Array.isArray(imagesData.findings)) {
      findings.push(...imagesData.findings);
    }

    if (!imagesData.images) return;

    for (const img of imagesData.images) {
      if (img.altMissing && !img.isDecorativeByRole) {
        findings.push({
          category: 'accessibility',
          ruleId: 'img-alt-missing',
          title: 'Image missing alt attribute',
          description: 'This image does not have an alt attribute, making it inaccessible to screen reader users.',
          severity: 'high',
          evidence: `Image src: ${img.src || 'unknown'}`,
          affectedElement: img.src || `Image ${img.index}`,
          manualReview: false,
          verificationStatus: 'finding_detected',
        });
      }
    }

    // Failed images
    const likelyFailed = imagesData.images.filter(i => i.loadState === 'likely_failed');
    for (const img of likelyFailed) {
      findings.push({
        category: 'images',
        ruleId: 'image-load-failed',
        title: 'Image may have failed to load',
        description: 'This image completed loading but has zero dimensions, suggesting it failed to load.',
        severity: 'medium',
        evidence: `src: ${img.src || 'unknown'}`,
        affectedElement: img.src || `Image ${img.index}`,
        manualReview: true,
        verificationStatus: 'requires_manual_review',
      });
    }
  },

  _processLinkFindings(linksData, findings) {
    if (!linksData) return;

    if (Array.isArray(linksData.findings)) {
      findings.push(...linksData.findings);
    }

    if (!linksData.links) return;

    for (const link of linksData.links) {
      if (link.type === 'missing_href') {
        findings.push({
          category: 'links',
          ruleId: 'link-missing-href',
          title: 'Anchor element missing href attribute',
          description: 'An <a> element has no href attribute. It functions as a placeholder rather than a navigation link.',
          severity: 'low',
          evidence: `Text: "${link.text || ''}"`,
          affectedElement: link.text || 'anchor element',
          manualReview: false,
          verificationStatus: 'finding_detected',
        });
      }

      if (!link.hasAccessibleName && link.type !== 'missing_href' && link.type !== 'fragment_only') {
        findings.push({
          category: 'accessibility',
          ruleId: 'link-no-accessible-name',
          title: 'Link has no accessible name',
          description: 'This link has no visible text, aria-label, or title, making it inaccessible to screen reader users.',
          severity: 'medium',
          evidence: `href: ${link.href || 'none'}`,
          affectedElement: link.href || 'link',
          manualReview: true,
          verificationStatus: 'requires_manual_review',
        });
      }
    }
  },

  _processStructureFindings(structure, findings) {
    if (!structure) return;

    if (Array.isArray(structure.findings)) {
      findings.push(...structure.findings);
    }

    const h = structure.headings;
    if (h) {
      if (h.noH1) {
        findings.push({
          category: 'structure',
          ruleId: 'h1-missing',
          title: 'No H1 heading found',
          description: 'The page has no H1 heading. An H1 identifies the page\'s primary topic and is important for accessibility and SEO.',
          severity: 'medium',
          evidence: 'No <h1> elements found',
          affectedElement: 'document headings',
          manualReview: false,
          verificationStatus: 'finding_detected',
        });
      }

      if (h.multipleH1) {
        findings.push({
          category: 'structure',
          ruleId: 'multiple-h1',
          title: 'Multiple H1 headings found',
          description: `${h.h1Count} H1 headings were found. While HTML5 allows multiple H1s in section contexts, a single H1 is generally recommended for clear page hierarchy.`,
          severity: 'info',
          evidence: `${h.h1Count} H1 elements`,
          affectedElement: 'document headings',
          manualReview: true,
          verificationStatus: 'requires_manual_review',
        });
      }

      if (h.skippedLevels && h.skippedLevels.length > 0) {
        findings.push({
          category: 'structure',
          ruleId: 'heading-level-skipped',
          title: 'Heading levels are skipped',
          description: `Heading levels ${h.skippedLevels.join(', ')} are missing. Skipping heading levels can confuse screen reader navigation.`,
          severity: 'low',
          evidence: `Skipped levels: H${h.skippedLevels.join(', H')}`,
          affectedElement: 'document headings',
          manualReview: false,
          verificationStatus: 'finding_detected',
        });
      }
    }

    if (!structure.hasMain) {
      findings.push({
        category: 'structure',
        ruleId: 'main-landmark-missing',
        title: 'No <main> landmark element found',
        description: 'A <main> element identifies the primary content area and improves screen reader navigation.',
        severity: 'low',
        evidence: 'No <main> element found',
        affectedElement: 'page landmarks',
        manualReview: false,
        verificationStatus: 'finding_detected',
      });
    }

    // iFrames without title
    if (structure.iframes) {
      for (const iframe of structure.iframes) {
        if (!iframe.hasTitleAttr) {
          findings.push({
            category: 'accessibility',
            ruleId: 'iframe-no-title',
            title: 'iFrame missing title attribute',
            description: 'iFrames require a descriptive title attribute for screen readers to understand the embedded content.',
            severity: 'medium',
            evidence: `src: ${iframe.src || 'unknown'}`,
            affectedElement: iframe.src || 'iframe',
            manualReview: false,
            verificationStatus: 'finding_detected',
          });
        }
      }
    }
  },

  _processFormFindings(formsData, findings) {
    if (!formsData) return;

    if (Array.isArray(formsData.findings)) {
      findings.push(...formsData.findings);
    }

    if (!formsData.forms) return;

    for (const form of formsData.forms) {
      if (form.actionSecure === false) {
        findings.push({
          category: 'security',
          ruleId: 'form-insecure-action',
          title: 'Form submits over HTTP',
          description: `Form ${form.id || form.index} submits to an HTTP URL. Data is transmitted without encryption.`,
          severity: 'high',
          evidence: `action: ${form.action}`,
          affectedElement: form.id || `Form ${form.index}`,
          manualReview: false,
          verificationStatus: 'finding_detected',
        });
      }

      const unlabelledInputs = form.inputs.filter(
        i => !i.hasLabel && !['hidden', 'submit', 'reset', 'button', 'image'].includes(i.type)
      );

      for (const inp of unlabelledInputs) {
        findings.push({
          category: 'accessibility',
          ruleId: 'form-label-missing',
          title: `Form input missing label (${inp.type})`,
          description: `A ${inp.type} input field has no associated label, making it inaccessible to screen reader users.`,
          severity: 'high',
          evidence: `Input name: ${inp.name || 'unnamed'}, id: ${inp.id || 'none'}`,
          affectedElement: inp.id || inp.name || `${inp.type} input`,
          manualReview: false,
          verificationStatus: 'finding_detected',
        });
      }
    }
  },

  _processScriptFindings(scriptsData, findings) {
    if (!scriptsData) return;

    if (Array.isArray(scriptsData.findings)) {
      findings.push(...scriptsData.findings);
    }

    if (!scriptsData.summary) return;

    if (scriptsData.summary.crossOriginWithoutSRI > 0) {
      findings.push({
        category: 'security',
        ruleId: 'external-script-no-sri',
        title: 'External scripts loaded without Subresource Integrity',
        description: `${scriptsData.summary.crossOriginWithoutSRI} cross-origin script(s) are loaded without SRI hash verification.`,
        severity: 'medium',
        evidence: `${scriptsData.summary.crossOriginWithoutSRI} scripts without integrity attribute`,
        affectedElement: 'script elements',
        manualReview: false,
        verificationStatus: 'finding_detected',
      });
    }
  },

  _processAccessibilityFindings(accessibilityData, findings) {
    if (!accessibilityData?.findings) return;

    for (const f of accessibilityData.findings) {
      // Only add if not already captured by other scanners
      const existing = findings.find(e => e.ruleId === f.ruleId);
      if (!existing) {
        findings.push({
          category: f.category || 'accessibility',
          ruleId: f.ruleId,
          title: f.title,
          description: f.description,
          severity: f.severity,
          evidence: f.element || null,
          affectedElement: f.affectedElement || null,
          manualReview: f.manualReview || false,
          verificationStatus: f.manualReview ? 'requires_manual_review' : 'finding_detected',
        });
      }
    }
  },

  _processPerformanceFindings(perfData, findings) {
    if (!perfData) return;

    const nav = perfData.navigationTiming;
    if (nav && nav.available) {
      if (nav.ttfbMs > 600) {
        findings.push({
          category: 'performance',
          ruleId: 'high-ttfb',
          title: 'High Time to First Byte (TTFB)',
          description: `TTFB is ${Math.round(nav.ttfbMs)}ms. Values above 600ms may indicate slow server response. Optimise server processing, caching, or CDN configuration.`,
          severity: nav.ttfbMs > 1000 ? 'medium' : 'low',
          evidence: `TTFB: ${Math.round(nav.ttfbMs)}ms`,
          affectedElement: 'server response',
          manualReview: false,
          verificationStatus: 'finding_detected',
        });
      }

      if (nav.loadEventMs > 5000) {
        findings.push({
          category: 'performance',
          ruleId: 'slow-page-load',
          title: 'Slow page load time',
          description: `Page load time is ${(nav.loadEventMs / 1000).toFixed(2)}s. Long load times negatively impact user experience.`,
          severity: 'medium',
          evidence: `Load time: ${(nav.loadEventMs / 1000).toFixed(2)}s`,
          affectedElement: 'page load',
          manualReview: false,
          verificationStatus: 'finding_detected',
        });
      }
    }

    const paint = perfData.paintTiming;
    if (paint && paint.available && paint.firstContentfulPaintMs > 2500) {
      findings.push({
        category: 'performance',
        ruleId: 'slow-fcp',
        title: 'Slow First Contentful Paint (FCP)',
        description: `FCP is ${paint.firstContentfulPaintMs}ms. Values above 2500ms are considered slow by Core Web Vitals standards.`,
        severity: 'medium',
        evidence: `FCP: ${paint.firstContentfulPaintMs}ms`,
        affectedElement: 'rendering',
        manualReview: false,
        verificationStatus: 'finding_detected',
      });
    }
  },

  _processSecurityFindings(securityData, findings) {
    if (!securityData?.findings) return;

    for (const f of securityData.findings) {
      const existing = findings.find(e => e.ruleId === f.ruleId);
      if (!existing) {
        findings.push({
          category: f.category || 'security',
          ruleId: f.ruleId,
          title: f.title,
          description: f.description,
          severity: f.severity,
          evidence: f.evidence || null,
          affectedElement: f.affectedElement || null,
          manualReview: f.verificationStatus === 'requires_manual_review',
          verificationStatus: f.verificationStatus || 'finding_detected',
          note: f.note || null,
        });
      }
    }
  },

  _deduplicate(findings) {
    const seen = new Set();
    return findings.filter(f => {
      const key = `${f.ruleId}::${f.affectedElement || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  },

  _countByCategory(findings) {
    const counts = {};
    for (const f of findings) {
      counts[f.category] = (counts[f.category] || 0) + 1;
    }
    return counts;
  },
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DiagnosticEngine };
} else if (typeof globalThis !== 'undefined') {
  globalThis.DiagnosticEngine = DiagnosticEngine;
}
