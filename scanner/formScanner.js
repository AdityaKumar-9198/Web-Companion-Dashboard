/**
 * Form Scanner — inspects form structure for accessibility and security patterns.
 * IMPORTANT: This scanner does NOT read, store, or transmit:
 * - User-entered values
 * - Password field contents
 * - Authentication tokens
 * - Cookies
 * - Any sensitive runtime data
 *
 * Only structural/attribute information is collected.
 */

const FormScanner = {
  name: 'forms',

  scan() {
    try {
      const forms = Array.from(document.querySelectorAll('form'));
      const results = [];

      for (let fi = 0; fi < forms.length; fi++) {
        const form = forms[fi];

        const action = form.getAttribute('action') || null;
        const method = (form.getAttribute('method') || 'get').toLowerCase();
        const enctype = form.getAttribute('enctype') || null;
        const hasFileUpload = !!form.querySelector('input[type="file"]');
        const hasPasswordField = !!form.querySelector('input[type="password"]');

        // Submission target security check
        let actionSecure = null;
        if (action) {
          try {
            const actionUrl = new URL(action, location.href);
            actionSecure = actionUrl.protocol === 'https:';
          } catch {
            actionSecure = null;
          }
        }

        // Analyse inputs
        const inputs = Array.from(form.querySelectorAll('input, select, textarea, button'));
        const inputData = [];

        for (const inp of inputs) {
          const type = (inp.getAttribute('type') || inp.tagName.toLowerCase()).toLowerCase();

          // Skip password — do not inspect value
          if (type === 'password') {
            inputData.push({
              tag: inp.tagName.toLowerCase(),
              type: 'password',
              id: inp.id || null,
              name: inp.getAttribute('name') || null,
              required: inp.hasAttribute('required'),
              hasLabel: FormScanner._hasLabel(inp),
              labelText: '[PASSWORD FIELD - NOT INSPECTED]',
              autocomplete: inp.getAttribute('autocomplete') || null,
            });
            continue;
          }

          // Skip hidden inputs entirely for security
          if (type === 'hidden') {
            inputData.push({
              tag: 'input',
              type: 'hidden',
              id: inp.id || null,
              name: inp.getAttribute('name') || null,
              required: false,
              hasLabel: false,
              labelText: null,
            });
            continue;
          }

          const labelText = FormScanner._getLabelText(inp);
          inputData.push({
            tag: inp.tagName.toLowerCase(),
            type,
            id: inp.id || null,
            name: inp.getAttribute('name') || null,
            required: inp.hasAttribute('required'),
            hasLabel: FormScanner._hasLabel(inp),
            labelText: labelText ? labelText.substring(0, 80) : null,
            autocomplete: inp.getAttribute('autocomplete') || null,
            placeholder: inp.getAttribute('placeholder') ? inp.getAttribute('placeholder').substring(0, 80) : null,
          });
        }

        // Submit buttons
        const submitButtons = Array.from(form.querySelectorAll(
          'button[type="submit"], button:not([type]), input[type="submit"], input[type="image"]'
        ));

        // CSRF heuristic: look for common CSRF token field names (structural check only)
        const csrfHints = FormScanner._detectCsrfHints(form);

        results.push({
          index: fi + 1,
          id: form.id || null,
          name: form.getAttribute('name') || null,
          action,
          method,
          enctype,
          actionSecure,
          hasFileUpload,
          hasPasswordField,
          inputCount: inputs.length,
          inputs: inputData,
          submitButtonCount: submitButtons.length,
          submitButtons: submitButtons.map(b => ({
            tag: b.tagName.toLowerCase(),
            type: b.getAttribute('type') || null,
            text: (b.textContent || b.getAttribute('value') || '').trim().substring(0, 50),
            hasAccessibleName: !!((b.textContent || '').trim() || b.getAttribute('aria-label') || b.getAttribute('value')),
          })),
          csrfHints,
          noSubmitButton: submitButtons.length === 0,
        });
      }

      const summary = {
        total: results.length,
        totalInputs: results.reduce((s, f) => s + f.inputCount, 0),
        formsWithPasswordFields: results.filter(f => f.hasPasswordField).length,
        formsWithFileUpload: results.filter(f => f.hasFileUpload).length,
        formsWithInsecureAction: results.filter(f => f.actionSecure === false).length,
        formsWithNoSubmitButton: results.filter(f => f.noSubmitButton).length,
        inputsMissingLabels: results.reduce((s, f) =>
          s + f.inputs.filter(i => !i.hasLabel && i.type !== 'hidden' && i.type !== 'submit').length, 0
        ),
      };

      return { forms: results, summary };
    } catch (err) {
      return { forms: [], summary: {}, error: err.message };
    }
  },

  _hasLabel(input) {
    if (!input.id) {
      // Check for wrapping label or aria attributes
      return (
        !!input.closest('label') ||
        !!input.getAttribute('aria-label') ||
        !!input.getAttribute('aria-labelledby') ||
        !!input.getAttribute('title')
      );
    }
    // Check for explicit label[for] association
    const label = document.querySelector(`label[for="${CSS.escape(input.id)}"]`);
    return (
      !!label ||
      !!input.closest('label') ||
      !!input.getAttribute('aria-label') ||
      !!input.getAttribute('aria-labelledby') ||
      !!input.getAttribute('title')
    );
  },

  _getLabelText(input) {
    if (input.getAttribute('aria-label')) return input.getAttribute('aria-label');
    if (input.id) {
      try {
        const label = document.querySelector(`label[for="${CSS.escape(input.id)}"]`);
        if (label) return label.textContent.trim();
      } catch { /* CSS.escape may not be available in all environments */ }
    }
    const wrappingLabel = input.closest('label');
    if (wrappingLabel) return wrappingLabel.textContent.trim();
    if (input.getAttribute('title')) return input.getAttribute('title');
    return null;
  },

  _detectCsrfHints(form) {
    // Look for hidden inputs with names suggesting CSRF tokens
    // We only look at the name attribute, not the value
    const csrfNames = ['csrf', '_token', 'csrftoken', '_csrf', 'xsrf', 'authenticity_token'];
    const hiddenInputs = Array.from(form.querySelectorAll('input[type="hidden"]'));
    const found = hiddenInputs.filter(inp => {
      const name = (inp.getAttribute('name') || '').toLowerCase();
      return csrfNames.some(n => name.includes(n));
    });
    return {
      hasCsrfHint: found.length > 0,
      csrfFieldNames: found.map(f => f.getAttribute('name')).filter(Boolean),
    };
  },
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FormScanner };
} else if (typeof globalThis !== 'undefined') {
  globalThis.FormScanner = FormScanner;
}
