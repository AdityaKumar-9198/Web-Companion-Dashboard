/**
 * Official Create Account / Register Controller
 * Companion Dashboard - Web Development Companion
 */

document.addEventListener('DOMContentLoaded', () => {
  const registerForm = document.getElementById('registerForm');
  const registerName = document.getElementById('registerName');
  const registerEmail = document.getElementById('registerEmail');
  const registerRole = document.getElementById('registerRole');
  const registerPassword = document.getElementById('registerPassword');
  const registerConfirmPassword = document.getElementById('registerConfirmPassword');
  const registerSubmitBtn = document.getElementById('registerSubmitBtn');
  const authAlert = document.getElementById('authAlert');
  const togglePwBtn = document.getElementById('togglePwBtn');

  // Password visibility toggle
  if (togglePwBtn && registerPassword) {
    togglePwBtn.addEventListener('click', () => {
      const isPassword = registerPassword.type === 'password';
      registerPassword.type = isPassword ? 'text' : 'password';
      if (registerConfirmPassword) {
        registerConfirmPassword.type = isPassword ? 'text' : 'password';
      }
      togglePwBtn.textContent = isPassword ? 'Hide' : 'Show';
    });
  }

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
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAlert();

      const name = registerName ? registerName.value.trim() : '';
      const email = registerEmail ? registerEmail.value.trim() : '';
      const role = registerRole ? registerRole.value.trim() : '';
      const password = registerPassword ? registerPassword.value : '';
      const confirmPassword = registerConfirmPassword ? registerConfirmPassword.value : '';

      if (!name) {
        showAlert('Full Name is compulsory. Please enter your name.');
        registerName?.focus();
        return;
      }

      if (!email || !email.includes('@')) {
        showAlert('Email Address is compulsory. Please enter a valid email.');
        registerEmail?.focus();
        return;
      }

      if (!role) {
        showAlert('Workspace Title or Role is compulsory. Please enter your workspace or role.');
        registerRole?.focus();
        return;
      }

      if (!password || password.length < 4) {
        showAlert('Password is compulsory and must be at least 4 characters long.');
        registerPassword?.focus();
        return;
      }

      if (!confirmPassword) {
        showAlert('Password confirmation is compulsory. Please re-enter your password.');
        registerConfirmPassword?.focus();
        return;
      }

      if (password !== confirmPassword) {
        showAlert('Passwords do not match. Please re-enter.');
        registerConfirmPassword?.focus();
        return;
      }

      try {
        if (registerSubmitBtn) {
          registerSubmitBtn.disabled = true;
          registerSubmitBtn.querySelector('span').textContent = 'Creating account...';
        }

        const newUser = await AuthManager.register({
          name,
          email,
          role,
          password
        });

        showAlert(`Account created successfully for ${newUser.name}! Redirecting to workspace...`, 'success');

        setTimeout(() => {
          window.location.replace('dashboard.html');
        }, 500);

      } catch (err) {
        showAlert(err.message || 'Registration failed. Please try again.');
        if (registerSubmitBtn) {
          registerSubmitBtn.disabled = false;
          registerSubmitBtn.querySelector('span').textContent = 'Create Account & Sign In';
        }
      }
    });
  }
});

