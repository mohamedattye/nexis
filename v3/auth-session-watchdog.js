(() => {
  'use strict';

  if (window.__NEXIS_AUTH_SESSION_WATCHDOG__) return;
  window.__NEXIS_AUTH_SESSION_WATCHDOG__ = true;

  const WAIT_MS = 8000;
  const STARTED_AT = Date.now();

  function releaseToLogin() {
    const overlay = document.querySelector('.auth-overlay');
    const loading = document.getElementById('auth-loading-view');
    const login = document.getElementById('auth-login-view');
    const account = document.getElementById('auth-account-view');
    const close = document.querySelector('.auth-close');
    const error = document.getElementById('auth-error');
    const email = document.getElementById('auth-email');

    if (!overlay || !loading || !login || !account || !error) return false;

    const authAlreadyResolved = loading.hidden === true || overlay.hidden === true || window.NEXIS_AUTH?.isAuthorized === true;
    if (authAlreadyResolved) return true;

    document.documentElement.classList.remove('auth-checking');
    document.body.classList.add('auth-locked');
    document.body.style.overflow = 'hidden';

    loading.hidden = true;
    account.hidden = true;
    login.hidden = false;
    overlay.hidden = false;
    if (close) close.hidden = true;

    error.textContent = 'La vérification de la session a pris trop de temps. Reconnectez-vous pour continuer.';
    error.hidden = false;
    window.setTimeout(() => email?.focus(), 0);
    return true;
  }

  function check() {
    const loading = document.getElementById('auth-loading-view');
    if (loading?.hidden === true || window.NEXIS_AUTH?.isAuthorized === true) return;

    if (Date.now() - STARTED_AT >= WAIT_MS) {
      releaseToLogin();
      return;
    }

    window.setTimeout(check, 250);
  }

  check();
})();