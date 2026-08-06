(() => {
  'use strict';
  if (window.__NEXIS_INVOICES_INTEGRATION__) return;
  window.__NEXIS_INVOICES_INTEGRATION__ = true;

  function ensureView() {
    const workspace = document.querySelector('.workspace');
    if (!workspace || document.getElementById('invoices')) return;
    const section = document.createElement('section');
    section.className = 'view';
    section.id = 'invoices';
    section.innerHTML = '<section class="panel placeholder"><h2>Facturation</h2><p>Chargement du module Facturation…</p></section>';
    const expenses = document.getElementById('expenses');
    workspace.insertBefore(section, expenses || null);
  }

  function makeButton() {
    const button = document.createElement('button');
    button.className = 'nav-item';
    button.dataset.view = 'invoices';
    button.innerHTML = '<span class="nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6 3h12v18H6z"/><path d="M9 7h6M9 11h6M9 15h3"/><path d="M15 15h1"/></svg></span><span class="nav-label">Facturation</span>';
    return button;
  }

  function ensureNav() {
    const nav = document.querySelector('.sidebar nav');
    if (!nav) return;
    let button = nav.querySelector('[data-view="invoices"]');
    if (!button) button = makeButton();

    const clients = nav.querySelector('[data-view="clients"]');
    if (clients?.parentElement?.classList.contains('nav-group-items')) {
      if (button.parentElement !== clients.parentElement || button.previousElementSibling !== clients) clients.after(button);
      return;
    }

    if (!button.isConnected) {
      const expenses = nav.querySelector('[data-view="expenses"]');
      nav.insertBefore(button, expenses || null);
    }
  }

  function showLoadError(message) {
    const view = document.getElementById('invoices');
    if (!view || view.querySelector('.invoice-page')) return;
    view.innerHTML = `<section class="panel placeholder"><h2>Facturation</h2><p>${message}</p><button class="secondary" id="retry-invoices-module" type="button" style="margin-top:12px">Réessayer</button></section>`;
    document.getElementById('retry-invoices-module')?.addEventListener('click', () => {
      window.__NEXIS_INVOICES_LOADING__ = false;
      window.__NEXIS_INVOICES_MODULE__ = false;
      loadModule();
    });
  }

  function loadModule() {
    const view = document.getElementById('invoices');
    if (view?.querySelector('.invoice-page')) return;
    if (window.__NEXIS_INVOICES_LOADING__) return;

    window.__NEXIS_INVOICES_LOADING__ = true;
    window.__NEXIS_INVOICES_MODULE__ = false;

    const previous = document.getElementById('nexis-invoices-module-script');
    if (previous) previous.remove();

    const script = document.createElement('script');
    script.id = 'nexis-invoices-module-script';
    script.src = `invoices-module.js?v=20260806-invoices-fix-2&t=${Date.now()}`;
    script.async = true;
    script.onload = () => {
      window.__NEXIS_INVOICES_LOADING__ = false;
      window.setTimeout(() => {
        if (!document.querySelector('#invoices .invoice-page')) {
          showLoadError('Le module Facturation n’a pas pu démarrer. Cliquez sur Réessayer.');
        }
      }, 300);
    };
    script.onerror = () => {
      window.__NEXIS_INVOICES_LOADING__ = false;
      showLoadError('Impossible de télécharger le module Facturation. Cliquez sur Réessayer.');
      console.error('Impossible de charger le module Facturation.');
    };
    document.body.appendChild(script);
  }

  function syncTitle() {
    if (location.hash !== '#invoices') return;
    const title = document.getElementById('page-title');
    if (title) title.textContent = 'Facturation';
    loadModule();
  }

  ensureView();
  ensureNav();

  const nav = document.querySelector('.sidebar nav');
  if (nav) new MutationObserver(ensureNav).observe(nav, { childList: true, subtree: true });

  document.addEventListener('click', (event) => {
    if (!event.target.closest('[data-view="invoices"]')) return;
    window.setTimeout(syncTitle, 0);
  }, true);

  window.addEventListener('hashchange', () => window.setTimeout(syncTitle, 0));
  syncTitle();
})();