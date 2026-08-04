(() => {
  'use strict';

  const titles = {
    dashboard: 'Tableau de bord',
    'new-trip': 'Créer une mission',
    trips: 'Centre des missions',
    fleet: 'Flotte',
    expenses: 'Dépenses',
    'vehicle-charges': 'Charges véhicules',
    reports: 'Rapports',
    users: 'Utilisateurs'
  };

  let currentIsAdmin = window.NEXIS_AUTH?.isAdmin === true;
  const topCreateButton = document.querySelector('.topbar-actions > .primary[data-view="new-trip"]');

  function ensureStylesheetOnce(id, href) {
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }

  function ensureVehicleChargesView() {
    const nav = document.querySelector('.sidebar nav');
    if (nav && !nav.querySelector('[data-view="vehicle-charges"]')) {
      const button = document.createElement('button');
      button.className = 'nav-item';
      button.dataset.view = 'vehicle-charges';
      button.textContent = 'Charges véhicules';
      const reportsButton = nav.querySelector('[data-view="reports"]');
      nav.insertBefore(button, reportsButton || null);
    }

    const workspace = document.querySelector('.workspace');
    if (workspace && !document.getElementById('vehicle-charges')) {
      const section = document.createElement('section');
      section.className = 'view';
      section.id = 'vehicle-charges';
      section.innerHTML = '<section class="panel placeholder"><h2>Charges véhicules</h2><p>Chargement du module…</p></section>';
      const reportsView = document.getElementById('reports');
      workspace.insertBefore(section, reportsView || null);
    }
  }

  function ensureUsersView() {
    const nav = document.querySelector('.sidebar nav');
    if (nav && !nav.querySelector('[data-view="users"]')) {
      const button = document.createElement('button');
      button.className = 'nav-item';
      button.dataset.view = 'users';
      button.dataset.adminNavigation = 'true';
      button.textContent = 'Utilisateurs';
      button.hidden = !currentIsAdmin;
      nav.appendChild(button);
    }

    const workspace = document.querySelector('.workspace');
    if (workspace && !document.getElementById('users')) {
      const section = document.createElement('section');
      section.className = 'view';
      section.id = 'users';
      section.innerHTML = '<section class="panel placeholder"><h2>Utilisateurs</h2><p>Chargement du module…</p></section>';
      workspace.appendChild(section);
    }
  }

  function syncAdminNavigation() {
    const usersButton = document.querySelector('[data-view="users"]');
    if (usersButton) usersButton.hidden = !currentIsAdmin;

    if (!currentIsAdmin && document.getElementById('users')?.classList.contains('active')) {
      setView('dashboard');
    }
  }

  function loadScriptOnce(flag, source, errorMessage) {
    if (window[flag]) return;
    window[flag] = true;
    const script = document.createElement('script');
    script.src = source;
    script.defer = true;
    script.onerror = () => {
      window[flag] = false;
      console.error(errorMessage);
    };
    document.body.appendChild(script);
  }

  function loadVehicleChargesModule() {
    loadScriptOnce('__NEXIS_VEHICLE_CHARGES_LOADING__', 'vehicle-charges-module.js?v=20260724-charges-2', 'Impossible de charger le module Charges véhicules.');
    loadScriptOnce('__NEXIS_VEHICLE_CHARGES_PREMIUM_LOADING__', 'vehicle-charges-premium.js?v=20260729-vehicle-charges-premium-1', 'Impossible de charger la finition premium des Charges véhicules.');
  }

  function loadReportsModule() {
    loadScriptOnce('__NEXIS_REPORTS_LOADING__', 'reports-module.js?v=20260724-reports-net-1', 'Impossible de charger le module Rapports.');
    loadScriptOnce('__NEXIS_REPORTS_NET_EXTENSION_LOADING__', 'reports-net-extension.js?v=20260724-reports-net-1', 'Impossible de charger le résultat net dans Rapports.');
    loadScriptOnce('__NEXIS_REPORTS_PREMIUM_LOADING__', 'reports-premium.js?v=20260729-reports-premium-1', 'Impossible de charger la finition premium du module Rapports.');
  }

  function loadDashboardNetModule() {
    loadScriptOnce('__NEXIS_DASHBOARD_NET_LOADING__', 'dashboard-net-result.js?v=20260724-net-1', 'Impossible de charger le résultat net du Dashboard.');
  }

  function loadDashboardTransportInsights() {
    loadScriptOnce('__NEXIS_DASHBOARD_TRANSPORT_INSIGHTS_LOADING__', 'dashboard-transport-insights.js?v=20260804-transport-insights-1', 'Impossible de charger les graphiques transport du Dashboard.');
  }

  function loadAuthPreviewModule() {
    loadScriptOnce('__NEXIS_AUTH_PREVIEW_LOADING__', 'auth-preview.js?v=20260728-auth-lock-2', 'Impossible de charger la connexion administrateur.');
  }

  function loadRoleUiModule() {
    loadScriptOnce('__NEXIS_ROLE_UI_LOADING__', 'role-ui.js?v=20260728-role-ui-2', 'Impossible de charger les permissions visuelles.');
  }

  function loadUsersModule() {
    if (!currentIsAdmin) return;
    loadScriptOnce('__NEXIS_USERS_MODULE_LOADING__', 'users-module.js?v=20260728-users-2', 'Impossible de charger le module Utilisateurs.');
    loadScriptOnce('__NEXIS_USERS_PREMIUM_LOADING__', 'users-premium.js?v=20260730-users-premium-1', 'Impossible de charger la finition premium du module Utilisateurs.');
  }

  function loadSidebarNavigation() {
    ensureStylesheetOnce('nexis-sidebar-navigation-style', 'sidebar-navigation.css?v=20260728-sidebar-1');
    loadScriptOnce('__NEXIS_SIDEBAR_NAVIGATION_LOADING__', 'sidebar-navigation.js?v=20260728-sidebar-1', 'Impossible de charger la nouvelle navigation latérale.');
  }

  function loadMissionCenterPremium() {
    loadScriptOnce('__NEXIS_MISSION_CENTER_PREMIUM_LOADING__', 'mission-center-premium.js?v=20260729-premium-1', 'Impossible de charger la finition du Centre des missions.');
  }

  function loadFleetPremium() {
    loadScriptOnce('__NEXIS_FLEET_PREMIUM_LOADING__', 'fleet-premium.js?v=20260729-fleet-premium-1', 'Impossible de charger la finition premium du module Flotte.');
  }

  function loadExpensesPremium() {
    loadScriptOnce('__NEXIS_EXPENSES_PREMIUM_LOADING__', 'expenses-premium.js?v=20260729-expenses-premium-1', 'Impossible de charger la finition premium du module Dépenses.');
  }

  function setView(viewId, updateHash = true) {
    if (viewId === 'users' && !currentIsAdmin) viewId = 'dashboard';

    const target = document.getElementById(viewId);
    if (!target || !target.classList.contains('view')) return;

    document.querySelectorAll('.view').forEach((view) => view.classList.toggle('active', view.id === viewId));
    document.querySelectorAll('.nav-item[data-view]').forEach((button) => button.classList.toggle('active', button.dataset.view === viewId));

    const pageTitle = document.getElementById('page-title');
    if (pageTitle) pageTitle.textContent = titles[viewId] || 'Nexis';
    if (topCreateButton) topCreateButton.hidden = viewId === 'new-trip';

    if (viewId === 'vehicle-charges') loadVehicleChargesModule();
    if (viewId === 'reports') loadReportsModule();
    if (viewId === 'dashboard') {
      loadDashboardNetModule();
      loadDashboardTransportInsights();
    }
    if (viewId === 'users') loadUsersModule();
    if (viewId === 'trips') loadMissionCenterPremium();
    if (viewId === 'fleet') loadFleetPremium();
    if (viewId === 'expenses') loadExpensesPremium();

    if (updateHash && location.hash !== `#${viewId}`) history.replaceState(null, '', `#${viewId}`);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function compactExpenseTable() {
    const list = document.getElementById('expense-list');
    const table = list?.querySelector('.expense-table');
    if (!list || !table || list.querySelector('.expense-list')) return;

    const entries = [...table.querySelectorAll('tbody tr')].map((row) => {
      const cells = [...row.querySelectorAll('td')];
      if (cells.length < 7) return '';
      const actions = cells[6].querySelector('.expense-actions')?.outerHTML || '';
      return `<article class="expense-entry"><div class="expense-entry-head"><div><span>Total de la dépense</span><strong>${cells[5].textContent.trim()}</strong></div>${actions}</div><div class="expense-metrics"><div class="expense-metric"><span>Carburant</span><strong>${cells[0].textContent.trim()}</strong></div><div class="expense-metric"><span>Ration</span><strong>${cells[1].textContent.trim()}</strong></div><div class="expense-metric"><span>Rapido</span><strong>${cells[2].textContent.trim()}</strong></div><div class="expense-metric"><span>Manœuvre</span><strong>${cells[3].textContent.trim()}</strong></div><div class="expense-metric"><span>Autres</span><strong>${cells[4].textContent.trim()}</strong></div></div></article>`;
    }).join('');

    if (entries) list.innerHTML = `<div class="expense-list">${entries}</div>`;
  }

  ensureVehicleChargesView();
  ensureUsersView();
  loadSidebarNavigation();
  loadAuthPreviewModule();
  loadRoleUiModule();
  syncAdminNavigation();

  document.addEventListener('nexis:auth-changed', (event) => {
    currentIsAdmin = event.detail?.isAdmin === true;
    syncAdminNavigation();
  });

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-view]');
    if (!button) return;
    const viewId = button.dataset.view;
    if (viewId === 'users' && !currentIsAdmin) return;
    if (!document.getElementById(viewId)?.classList.contains('view')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    setView(viewId);
  }, true);

  window.addEventListener('hashchange', () => {
    const viewId = location.hash.replace('#', '');
    setView(document.getElementById(viewId)?.classList.contains('view') ? viewId : 'dashboard', false);
  });

  const detailBody = document.getElementById('mission-detail-body');
  if (detailBody) new MutationObserver(compactExpenseTable).observe(detailBody, { childList: true, subtree: true });

  const initialView = location.hash.replace('#', '');
  setView(document.getElementById(initialView)?.classList.contains('view') ? initialView : 'dashboard', false);
  compactExpenseTable();
})();