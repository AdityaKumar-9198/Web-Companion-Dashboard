/**
 * Official Sign In Controller
 * Companion Dashboard - Web Development Companion
 */

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const loginIdentifier = document.getElementById('loginIdentifier');
  const loginPassword = document.getElementById('loginPassword');
  const loginSubmitBtn = document.getElementById('loginSubmitBtn');
  const authAlert = document.getElementById('authAlert');
  const togglePwBtn = document.getElementById('togglePwBtn');

  // Password visibility toggle
  if (togglePwBtn && loginPassword) {
    togglePwBtn.addEventListener('click', () => {
      const isPassword = loginPassword.type === 'password';
      loginPassword.type = isPassword ? 'text' : 'password';
      togglePwBtn.textContent = isPassword ? 'Hide' : 'Show';
    });
  }

  // Quick chips autofill
  document.querySelectorAll('.quick-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const user = btn.getAttribute('data-quick');
      if (user === 'Developer') {
        loginIdentifier.value = 'dev@companion.local';
        loginPassword.value = 'password123';
      } else if (user === 'Aditya') {
        loginIdentifier.value = 'aditya@companion.local';
        loginPassword.value = 'password123';
      }
      loginForm.dispatchEvent(new Event('submit', { cancelable: true }));
    });
  });

  function showAlert(message, type = 'error') {
    if (!authAlert) return;
    authAlert.className = `auth-alert ${type}`;
    authAlert.textContent = message;
    authAlert.hidden = false;
  }

  function hideAlert() {
    if (!authAlert) return;
    authAlert.hidden = true;
    authAlert.textContent = '';
  }

  // Form Submission
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAlert();

      const identifier = loginIdentifier ? loginIdentifier.value.trim() : '';
      const password = loginPassword ? loginPassword.value : '';

      if (!identifier) {
        showAlert('Email or Username is compulsory. Please enter your email or username.');
        loginIdentifier?.focus();
        return;
      }

      if (!password) {
        showAlert('Password is compulsory. Please enter your password.');
        loginPassword?.focus();
        return;
      }

      try {
        if (loginSubmitBtn) {
          loginSubmitBtn.disabled = true;
          loginSubmitBtn.querySelector('span').textContent = 'Signing in...';
        }

        const user = await AuthManager.login(identifier, password);
        showAlert(`Signed in as ${user.name}! Redirecting to workspace...`, 'success');

        setTimeout(() => {
          window.location.replace('dashboard.html');
        }, 500);

      } catch (err) {
        showAlert(err.message || 'Invalid email or password.');
        if (loginSubmitBtn) {
          loginSubmitBtn.disabled = false;
          loginSubmitBtn.querySelector('span').textContent = 'Sign In to Dashboard';
        }
      }
    });
  }
});

