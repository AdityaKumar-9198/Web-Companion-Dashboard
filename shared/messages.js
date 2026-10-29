/**
 * Shared message types for communication between extension components.
 * All messaging between popup, content script, background, and dashboard
 * goes through these typed messages.
 */

const Messages = {
  // Actions sent to background/content
  SCAN_PAGE: 'SCAN_PAGE',
  GET_SCAN_STATUS: 'GET_SCAN_STATUS',
  GET_SCAN_RESULTS: 'GET_SCAN_RESULTS',
  OPEN_DASHBOARD: 'OPEN_DASHBOARD',
  GET_HISTORY: 'GET_HISTORY',
  DELETE_SCAN: 'DELETE_SCAN',
  CLEAR_HISTORY: 'CLEAR_HISTORY',
  EXPORT_SCAN: 'EXPORT_SCAN',
  COMPARE_SCANS: 'COMPARE_SCANS',

  // Responses / status
  SCAN_STARTED: 'SCAN_STARTED',
  SCAN_COMPLETE: 'SCAN_COMPLETE',
  SCAN_ERROR: 'SCAN_ERROR',
  SCAN_PROGRESS: 'SCAN_PROGRESS',

  // Content script -> background
  PAGE_DATA: 'PAGE_DATA',
  CONTENT_READY: 'CONTENT_READY',

  // Dashboard -> background
  DASHBOARD_READY: 'DASHBOARD_READY',
  REQUEST_LATEST: 'REQUEST_LATEST',
};

// Severity levels for findings
const Severity = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
  INFO: 'info',
};

// Verification statuses for security checks
const VerificationStatus = {
  FINDING_DETECTED: 'finding_detected',
  NO_FINDING: 'no_finding_detected',
  MANUAL_REVIEW: 'requires_manual_review',
  SOURCE_CODE_ACCESS: 'requires_source_code_access',
  BACKEND_ACCESS: 'requires_backend_access',
  DATABASE_ACCESS: 'requires_database_access',
  NOT_SUPPORTED: 'not_supported',
};

// Scan statuses
const ScanStatus = {
  IDLE: 'idle',
  RUNNING: 'running',
  COMPLETE: 'complete',
  ERROR: 'error',
  UNSUPPORTED: 'unsupported',
};

// Link check statuses
const LinkStatus = {
  AVAILABLE: 'Available',
  NOT_FOUND: 'Not Found',
  REQUEST_FAILED: 'Request Failed',
  COULD_NOT_VERIFY: 'Could Not Verify',
  UNSUPPORTED: 'Unsupported',
  REDIRECT: 'Redirect',
};

// Export for both module and non-module contexts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Messages, Severity, VerificationStatus, ScanStatus, LinkStatus };
} else if (typeof globalThis !== 'undefined') {
  globalThis.Messages = Messages;
  globalThis.Severity = Severity;
  globalThis.VerificationStatus = VerificationStatus;
  globalThis.ScanStatus = ScanStatus;
  globalThis.LinkStatus = LinkStatus;
}
