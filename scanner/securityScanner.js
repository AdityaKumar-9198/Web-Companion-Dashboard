/**
 * Security Scanner — frontend-accessible security diagnostics.
 *
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * A browser extension inspecting a page's DOM CANNOT:
 * - Verify server-side SQL injection protection
 * - Test CSRF validation logic
 * - Check server-side authorisation
 * - Verify password hashing algorithms
 * - Access database row-level security
 * - Verify JWT secret management
 * - Test backend rate limiting
 * - Check webhook signature verification
 * - Perform active penetration testing
 *
 * This scanner performs FRONTEND-OBSERVABLE checks only.
 * Each check uses explicit verification statuses:
 * - finding_detected
 * - no_finding_detected
 * - requires_manual_review
 * - requires_source_code_access
 * - requires_backend_access
 * - not_supported
 *
 * Potential secrets are REDACTED before being stored or displayed.
 */

const SecurityScanner = {
  name: 'security',

  STATUS: {
    FINDING_DETECTED: 'finding_detected',
    NO_FINDING: 'no_finding_detected',
    MANUAL_REVIEW: 'requires_manual_review',
    SOURCE_CODE: 'requires_source_code_access',
    BACKEND: 'requires_backend_access',
    DATABASE: 'requires_database_access',
    NOT_SUPPORTED: 'not_supported',
  },

  scan() {
    try {
      const findings = [];
      const checks = [];

      // === A. FRONTEND CHECKS ===

      // 1. HTTPS check
      checks.push(SecurityScanner._checkHttps(findings));

      // 2. Mixed content indicators
      checks.push(SecurityScanner._checkMixedContent(findings));

      // 3. Form submission over HTTP
      checks.push(SecurityScanner._checkFormSecurity(findings));

      // 4. Potential exposed secrets in page source
      checks.push(SecurityScanner._checkExposedSecrets(findings));

      // 5. Potentially risky external resource patterns
      checks.push(SecurityScanner._checkExternalResources(findings));

      // 6. iFrame security
      checks.push(SecurityScanner._checkIframeSecurity(findings));

      // 7. Source maps exposed
      checks.push(SecurityScanner._checkSourceMaps(findings));

      // 8. Authentication token storage patterns (localStorage/sessionStorage inspection)
      checks.push(SecurityScanner._checkTokenStorage(findings));

      // 9. CORS meta patterns (what we can see)
      checks.push(SecurityScanner._checkCorsPatterns(findings));

      // === B. CHECKLIST ITEMS (with honest status) ===
      const checklist = SecurityScanner._buildChecklist();

      const summary = {
        total: findings.length,
        findingDetected: findings.filter(f => f.verificationStatus === SecurityScanner.STATUS.FINDING_DETECTED).length,
        manualReview: findings.filter(f => f.verificationStatus === SecurityScanner.STATUS.MANUAL_REVIEW).length,
        notSupported: checklist.filter(c => c.status === SecurityScanner.STATUS.NOT_SUPPORTED).length,
        requiresBackend: checklist.filter(c => c.status === SecurityScanner.STATUS.BACKEND).length,
      };

      return { findings, checklist, summary };
    } catch (err) {
      return { findings: [], checklist: [], summary: {}, error: err.message };
    }
  },

  _checkHttps(findings) {
    const isHttps = location.protocol === 'https:';
    findings.push({
      ruleId: 'https-check',
      category: 'security',
      severity: isHttps ? 'info' : 'high',
      title: isHttps ? 'Page is served over HTTPS' : 'Page is served over HTTP (insecure)',
      description: isHttps
        ? 'The page uses HTTPS, which encrypts data in transit.'
        : 'This page is served over HTTP. Data transmitted between the browser and server is not encrypted and may be intercepted.',
      verificationStatus: SecurityScanner.STATUS.FINDING_DETECTED,
      evidence: `Protocol: ${location.protocol}`,
    });
    return { check: 'https', status: isHttps ? SecurityScanner.STATUS.NO_FINDING : SecurityScanner.STATUS.FINDING_DETECTED };
  },

  _checkMixedContent(findings) {
    const httpImages = Array.from(document.querySelectorAll('img[src^="http:"]')).length;
    const httpScripts = Array.from(document.querySelectorAll('script[src^="http:"]')).length;
    const httpLinks = Array.from(document.querySelectorAll('link[href^="http:"]')).length;
    const httpIframes = Array.from(document.querySelectorAll('iframe[src^="http:"]')).length;

    const total = httpImages + httpScripts + httpLinks + httpIframes;

    if (location.protocol === 'https:' && total > 0) {
      findings.push({
        ruleId: 'mixed-content',
        category: 'security',
        severity: httpScripts > 0 ? 'high' : 'medium',
        title: 'Mixed content detected',
        description: `HTTPS page loads ${total} resource(s) over HTTP. Active mixed content (scripts) is a high risk; passive mixed content (images) is a medium risk.`,
        verificationStatus: SecurityScanner.STATUS.FINDING_DETECTED,
        evidence: `HTTP images: ${httpImages}, HTTP scripts: ${httpScripts}, HTTP links: ${httpLinks}, HTTP iframes: ${httpIframes}`,
      });
    }

    return { check: 'mixed-content', total };
  },

  _checkFormSecurity(findings) {
    const forms = Array.from(document.querySelectorAll('form'));
    let insecureCount = 0;

    for (const form of forms) {
      const action = form.getAttribute('action');
      if (action) {
        try {
          const url = new URL(action, location.href);
          if (url.protocol === 'http:' && location.protocol === 'https:') {
            insecureCount++;
            findings.push({
              ruleId: 'form-insecure-action',
              category: 'security',
              severity: 'high',
              title: 'Form submits to HTTP endpoint from HTTPS page',
              description: `A form submits to "${url.href.substring(0, 100)}" over HTTP. Form data will be transmitted without encryption.`,
              verificationStatus: SecurityScanner.STATUS.FINDING_DETECTED,
              evidence: `Form action: ${url.href.substring(0, 100)}`,
            });
          }
        } catch { /* invalid URL */ }
      }
    }

    return { check: 'form-security', insecureCount };
  },

  _checkExposedSecrets(findings) {
    // Only check inline scripts — cautious heuristics only
    // We do NOT read or store the actual secret values
    const scripts = Array.from(document.querySelectorAll('script:not([src])'));
    const secretPatterns = [
      { name: 'JWT Token', pattern: /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g },
      { name: 'API Key pattern', pattern: /(['"])(sk-[a-zA-Z0-9]{20,}|pk_live_[a-zA-Z0-9]{20,}|AIza[0-9A-Za-z-_]{35})\1/g },
      { name: 'AWS Access Key pattern', pattern: /AKIA[0-9A-Z]{16}/g },
      { name: 'Generic high-entropy assignment', pattern: /(?:api_?key|secret|password|token|auth)\s*[:=]\s*['"][A-Za-z0-9+/]{32,}['"]/gi },
    ];

    let detected = 0;
    for (const script of scripts) {
      const content = script.textContent || '';
      if (content.length > 500000) continue; // Skip very large inline scripts

      for (const { name, pattern } of secretPatterns) {
        const matches = content.match(pattern);
        if (matches && matches.length > 0) {
          detected++;
          findings.push({
            ruleId: 'potential-secret-exposed',
            category: 'security',
            severity: 'high',
            title: `Potential ${name} found in inline script`,
            description: `An inline script contains a pattern matching "${name}". If this is a real credential, it is exposed to all users who view this page's source. Secrets must never be embedded in client-side code.`,
            verificationStatus: SecurityScanner.STATUS.MANUAL_REVIEW,
            evidence: `Pattern: ${name} (${matches.length} match(es) — values redacted)`,
            note: 'This is a heuristic check. Verify manually. Not all matches are real credentials.',
          });
          break; // One finding per script per pattern
        }
      }
    }

    return { check: 'exposed-secrets', detected };
  },

  _checkExternalResources(findings) {
    // Check for resources loaded from potentially risky origins
    const externalScripts = Array.from(document.querySelectorAll('script[src]')).filter(s => {
      try {
        const url = new URL(s.getAttribute('src'), location.href);
        return url.hostname !== location.hostname;
      } catch { return false; }
    });

    const withoutIntegrity = externalScripts.filter(s => !s.getAttribute('integrity'));

    if (withoutIntegrity.length > 0) {
      findings.push({
        ruleId: 'external-script-no-sri',
        category: 'security',
        severity: 'medium',
        title: `${withoutIntegrity.length} external script(s) loaded without Subresource Integrity (SRI)`,
        description: 'Scripts loaded from external servers without SRI checksums cannot be verified. If the external server is compromised, malicious code could be injected.',
        verificationStatus: SecurityScanner.STATUS.FINDING_DETECTED,
        evidence: withoutIntegrity.slice(0, 5).map(s => s.getAttribute('src').substring(0, 100)).join('\n'),
      });
    }

    return { check: 'external-resources', withoutIntegrity: withoutIntegrity.length };
  },

  _checkIframeSecurity(findings) {
    const iframes = Array.from(document.querySelectorAll('iframe'));
    for (const iframe of iframes) {
      const src = iframe.getAttribute('src') || '';
      const sandbox = iframe.getAttribute('sandbox');

      if (!sandbox && src && !src.startsWith('#')) {
        findings.push({
          ruleId: 'iframe-no-sandbox',
          category: 'security',
          severity: 'low',
          title: 'iFrame loaded without sandbox attribute',
          description: `An iFrame loading "${src.substring(0, 100)}" does not use the sandbox attribute. Sandboxing reduces the risk of malicious content affecting the parent page.`,
          verificationStatus: SecurityScanner.STATUS.FINDING_DETECTED,
          evidence: `src="${src.substring(0, 100)}"`,
        });
      }
    }

    return { check: 'iframe-security', total: iframes.length };
  },

  _checkSourceMaps(findings) {
    // Check for sourceMappingURL comments in inline scripts
    const scripts = Array.from(document.querySelectorAll('script:not([src])'));
    let found = 0;
    for (const script of scripts) {
      if ((script.textContent || '').includes('sourceMappingURL=')) {
        found++;
      }
    }

    if (found > 0) {
      findings.push({
        ruleId: 'source-map-exposed',
        category: 'security',
        severity: 'low',
        title: 'Source map references found in inline scripts',
        description: `${found} inline script(s) contain sourceMappingURL references. Source maps expose original source code structure to end users.`,
        verificationStatus: SecurityScanner.STATUS.FINDING_DETECTED,
        evidence: `${found} script(s) with sourceMappingURL`,
      });
    }

    return { check: 'source-maps', found };
  },

  _checkTokenStorage(findings) {
    // Check for common patterns of token storage in localStorage keys
    // We only inspect key names, not values
    let tokenKeysFound = [];
    try {
      const sensitiveKeyPatterns = ['token', 'jwt', 'auth', 'session', 'apikey', 'secret'];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i) || '';
        if (sensitiveKeyPatterns.some(p => key.toLowerCase().includes(p))) {
          tokenKeysFound.push(key.substring(0, 50));
        }
      }
    } catch { /* localStorage may not be accessible */ }

    if (tokenKeysFound.length > 0) {
      findings.push({
        ruleId: 'token-in-localstorage',
        category: 'security',
        severity: 'medium',
        title: 'Potential authentication tokens stored in localStorage',
        description: `localStorage key(s) with names suggesting tokens/credentials were found: ${tokenKeysFound.join(', ')}. localStorage is accessible to any JavaScript on the page, including injected scripts. Consider using HttpOnly cookies for session tokens.`,
        verificationStatus: SecurityScanner.STATUS.MANUAL_REVIEW,
        evidence: `Keys: ${tokenKeysFound.join(', ')} (values not read)`,
        note: 'Only key names were inspected. Values were not read.',
      });
    }

    return { check: 'token-storage', tokenKeysFound: tokenKeysFound.length };
  },

  _checkCorsPatterns(findings) {
    // We can only see what meta tags or headers indicate — headers not accessible from DOM
    // Check for CORS-related meta tags (non-standard but sometimes used)
    const corsMetaTags = document.querySelectorAll('meta[http-equiv]');
    let found = false;
    for (const meta of corsMetaTags) {
      if ((meta.getAttribute('http-equiv') || '').toLowerCase().includes('access-control')) {
        found = true;
      }
    }

    findings.push({
      ruleId: 'cors-configuration',
      category: 'security',
      severity: 'info',
      title: 'CORS configuration requires backend inspection',
      description: 'CORS headers (Access-Control-Allow-Origin) are set by the server and are not accessible via DOM inspection. A browser extension cannot verify server-side CORS configuration.',
      verificationStatus: SecurityScanner.STATUS.BACKEND,
      evidence: found ? 'CORS-related meta tag detected' : 'No observable CORS signals in page DOM',
    });

    return { check: 'cors', observable: found };
  },

  _buildChecklist() {
    return [
      {
        id: 'sql-injection',
        title: 'SQL Injection',
        status: SecurityScanner.STATUS.BACKEND,
        note: 'SQL injection occurs at the database layer. Cannot be detected or tested from page DOM inspection. Requires source code review and penetration testing.',
      },
      {
        id: 'xss',
        title: 'Cross-Site Scripting (XSS)',
        status: SecurityScanner.STATUS.MANUAL_REVIEW,
        note: 'Some XSS patterns (e.g., inline script injection, unsafe innerHTML) can be partially observed. Full XSS assessment requires source code review and active testing. Automated inline-script heuristics are included in this scan.',
      },
      {
        id: 'csrf',
        title: 'CSRF Protection',
        status: SecurityScanner.STATUS.MANUAL_REVIEW,
        note: 'CSRF token presence in forms can be detected heuristically (form scanner). Server-side validation of those tokens cannot be verified from the browser.',
      },
      {
        id: 'file-upload',
        title: 'File Upload Validation',
        status: SecurityScanner.STATUS.BACKEND,
        note: 'File type validation on upload forms can be partially observed (accept attribute). Server-side validation requires source code review.',
      },
      {
        id: 'bola',
        title: 'Broken Object-Level Authorization',
        status: SecurityScanner.STATUS.NOT_SUPPORTED,
        note: 'BOLA/IDOR requires authenticated API testing with authorised, controlled test scenarios. Not detectable from page DOM.',
      },
      {
        id: 'rate-limiting',
        title: 'Rate Limiting',
        status: SecurityScanner.STATUS.BACKEND,
        note: 'Rate limiting is a server-side control. Cannot be verified or tested without authorised backend access.',
      },
      {
        id: 'jwt-secret',
        title: 'JWT Secret Management',
        status: SecurityScanner.STATUS.BACKEND,
        note: 'JWT secrets must be managed server-side. JWT tokens in client storage can be detected (see token-storage check). Server secret security requires backend review.',
      },
      {
        id: 'api-secret-exposure',
        title: 'API Secret Exposure',
        status: SecurityScanner.STATUS.MANUAL_REVIEW,
        note: 'Heuristic checks for secret-like patterns in inline scripts are included. Definitive identification requires source code review.',
      },
      {
        id: 'password-hashing',
        title: 'Secure Password Hashing',
        status: SecurityScanner.STATUS.NOT_SUPPORTED,
        note: 'Password hashing algorithms are server-side and cannot be inspected from the browser.',
      },
      {
        id: 'mfa',
        title: 'Multifactor Authentication',
        status: SecurityScanner.STATUS.MANUAL_REVIEW,
        note: 'MFA presence can sometimes be inferred from login form structure but cannot be verified without authenticated testing.',
      },
      {
        id: 'cors',
        title: 'CORS Configuration',
        status: SecurityScanner.STATUS.BACKEND,
        note: 'CORS headers are set by the server. Not accessible from DOM inspection.',
      },
      {
        id: 'token-storage',
        title: 'Authentication Token Storage',
        status: SecurityScanner.STATUS.MANUAL_REVIEW,
        note: 'localStorage key names are inspected for token-like names. Values are not read. HttpOnly cookie usage cannot be verified from JavaScript.',
      },
      {
        id: 'server-auth',
        title: 'Server-Side Authorisation',
        status: SecurityScanner.STATUS.NOT_SUPPORTED,
        note: 'Server-side authorisation logic cannot be verified from the browser.',
      },
      {
        id: 'row-level-security',
        title: 'Database Row-Level Security',
        status: SecurityScanner.STATUS.NOT_SUPPORTED,
        note: 'Database configuration cannot be inspected from the browser.',
      },
      {
        id: 'webhook-signatures',
        title: 'Webhook Signature Verification',
        status: SecurityScanner.STATUS.NOT_SUPPORTED,
        note: 'Webhook handling is server-side. Cannot be verified from the browser.',
      },
      {
        id: 'ssrf',
        title: 'Server-Side Request Forgery (SSRF)',
        status: SecurityScanner.STATUS.NOT_SUPPORTED,
        note: 'SSRF is a server-side vulnerability. Active testing would constitute unauthorised penetration testing. Not performed.',
      },
      {
        id: 'source-maps',
        title: 'Exposed Source Maps',
        status: SecurityScanner.STATUS.MANUAL_REVIEW,
        note: 'sourceMappingURL references in inline scripts are detected. External source map file accessibility requires network checks.',
      },
      {
        id: 'default-credentials',
        title: 'Default Credentials',
        status: SecurityScanner.STATUS.NOT_SUPPORTED,
        note: 'Testing for default credentials requires authorised controlled testing and is not performed.',
      },
      {
        id: 'sensitive-logs',
        title: 'Sensitive Data in Logs',
        status: SecurityScanner.STATUS.NOT_SUPPORTED,
        note: 'Server-side log configuration cannot be inspected from the browser.',
      },
      {
        id: 'vulnerable-dependencies',
        title: 'Vulnerable Dependencies',
        status: SecurityScanner.STATUS.MANUAL_REVIEW,
        note: 'External script URLs are listed in the script scanner. Cross-referencing with vulnerability databases requires a dedicated tool (e.g., npm audit, Snyk).',
      },
    ];
  },
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SecurityScanner };
} else if (typeof globalThis !== 'undefined') {
  globalThis.SecurityScanner = SecurityScanner;
}
