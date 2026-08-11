(() => {
  'use strict';
  if (window.__NEXIS_TOPBAR_CLEANUP__) return;
  window.__NEXIS_TOPBAR_CLEANUP__ = true;

  const subtitles = {
    dashboard: 'Vue synthétique',
    'new-trip': 'Saisie opérationnelle',
    trips: 'Suivi opérationnel',
    fleet: 'Gestion de flotte',
    clients: 'Gestion clients',
    invoices: 'Facturation, notes de prix et suivi des paiements',
    expenses: 'Suivi financier',
    'vehicle-charges': 'Charges de flotte',
    reports: 'Analyse',
    users: 'Administration'
  };

  const style = document.createElement('style');
  style.textContent = `
    .topbar-actions{gap:8px!important;align-items:center}
    .topbar-actions>.sync-state,.topbar-actions>.environment-badge{display:none!important}
    .organization-context-badge{height:34px!important;max-width:180px!important;padding:0 10px!important;border-radius:10px!important}
    .nexis-account-wrap{position:relative;display:inline-flex}
    .nexis-account-button{width:36px;height:36px;border:1px solid #dce3ea;border-radius:11px;background:#fff;display:grid;place-items:center;color:#294057;font:800 9px var(--font-ui,'Inter',sans-serif);cursor:pointer}
    .nexis-account-button:hover{background:#f7f9fb}
    .nexis-account-avatar{width:24px;height:24px;border-radius:8px;display:grid;place-items:center;background:#eef3f7;color:#20374f}
    .nexis-account-menu{position:absolute;right:0;top:43px;width:225px;padding:7px;border:1px solid #dfe5eb;border-radius:13px;background:#fff;box-shadow:0 18px 48px rgba(23,42,64,.16);z-index:22000}
    .nexis-account-menu[hidden]{display:none}
    .nexis-account-head{padding:9px 10px 10px;border-bottom:1px solid #edf0f3;margin-bottom:5px}
    .nexis-account-head strong{display:block;color:#1f354c;font-size:10px}
    .nexis-account-head small{display:block;margin-top:3px;color:#8894a2;font-size:8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .nexis-account-item{width:100%;height:35px;padding:0 10px;border:0;border-radius:8px;background:transparent;color:#405368;text-align:left;font:700 8.5px var(--font-ui,'Inter',sans-serif);cursor:pointer}
    .nexis-account-item:hover{background:#f4f7f9}
    .nexis-account-item.danger{color:#a33f47}
    .nexis-account-separator{height:1px;background:#edf0f3;margin:5px 4px}
    @media(max-width:760px){.organization-context-badge{display:none!important}.nexis-account-menu{position:fixed;right:12px;top:60px;width:min(260px,calc(100vw - 24px))}}
  `;
  document.head.appendChild(style);

  const initials = name => {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    return (parts.slice(0,2).map(part => part[0]).join('') || 'U').toUpperCase();
  };

  function accountState() {
    const profile = window.NexisOrganization?.profile?.() || null;
    const org = window.NexisOrganization?.organization?.() || null;
    return { profile, org };
  }

  function currentView() {
    const active = document.querySelector('.view.active');
    return active?.id || String(location.hash || '#dashboard').replace('#','') || 'dashboard';
  }

  function updateSubtitle() {
    const eyebrow = document.getElementById('eyebrow');
    if (eyebrow) eyebrow.textContent = subtitles[currentView()] || 'Vue synthétique';
  }

  function refreshMenu() {
    const { profile, org } = accountState();
    const name = profile?.full_name || 'Mon compte';
    const email = profile?.email || '';
    const avatar = document.getElementById('nexis-account-avatar');
    if (avatar) avatar.textContent = initials(name);
    const nameEl = document.getElementById('nexis-account-name');
    if (nameEl) nameEl.textContent = name;
    const emailEl = document.getElementById('nexis-account-email');
    if (emailEl) emailEl.textContent = [org?.name, email].filter(Boolean).join(' · ');
    const team = document.querySelector('[data-account-action="team"]');
    if (team) team.hidden = profile?.role !== 'admin';
    const platform = document.querySelector('[data-account-action="platform"]');
    if (platform) platform.hidden = !document.getElementById('platform-admin-open');
  }

  function ensureMenu() {
    const actions = document.querySelector('.topbar-actions');
    if (!actions) return null;
    let wrap = document.getElementById('nexis-account-wrap');
    if (wrap) return wrap;

    wrap = document.createElement('div');
    wrap.id = 'nexis-account-wrap';
    wrap.className = 'nexis-account-wrap';
    wrap.innerHTML = `
      <button type="button" class="nexis-account-button" id="nexis-account-button" aria-label="Mon compte" aria-expanded="false"><span class="nexis-account-avatar" id="nexis-account-avatar">U</span></button>
      <div class="nexis-account-menu" id="nexis-account-menu" hidden>
        <div class="nexis-account-head"><strong id="nexis-account-name">Mon compte</strong><small id="nexis-account-email"></small></div>
        <button class="nexis-account-item" type="button" data-account-action="company">Paramètres de l’entreprise</button>
        <button class="nexis-account-item" type="button" data-account-action="subscription">Mon abonnement</button>
        <button class="nexis-account-item" type="button" data-account-action="team">Équipe & collaborateurs</button>
        <button class="nexis-account-item" type="button" data-account-action="platform" hidden>Administration Nexis</button>
        <div class="nexis-account-separator"></div>
        <button class="nexis-account-item danger" type="button" data-account-action="logout">Déconnexion</button>
      </div>`;
    actions.appendChild(wrap);

    const button = wrap.querySelector('#nexis-account-button');
    const menu = wrap.querySelector('#nexis-account-menu');

    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      menu.hidden = !menu.hidden;
      button.setAttribute('aria-expanded', String(!menu.hidden));
      refreshMenu();
    });

    wrap.addEventListener('click', event => {
      const item = event.target.closest('[data-account-action]');
      if (!item) return;
      event.preventDefault();
      event.stopPropagation();
      const action = item.dataset.accountAction;
      menu.hidden = true;
      button.setAttribute('aria-expanded', 'false');
      if (action === 'company') window.dispatchEvent(new CustomEvent('nexis:open-organization-settings'));
      if (action === 'subscription') window.NexisSubscription?.open?.();
      if (action === 'team') document.getElementById('team-manage-button')?.click();
      if (action === 'platform') document.getElementById('platform-admin-open')?.click();
      if (action === 'logout') document.getElementById('nexis-logout')?.click();
    });

    document.addEventListener('click', event => {
      if (!wrap.contains(event.target)) {
        menu.hidden = true;
        button.setAttribute('aria-expanded', 'false');
      }
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        menu.hidden = true;
        button.setAttribute('aria-expanded', 'false');
      }
    });

    return wrap;
  }

  function normalizeTopbar() {
    const actions = document.querySelector('.topbar-actions');
    if (!actions) return;
    const wrap = ensureMenu();
    if (!wrap) return;

    const company = document.getElementById('organization-context-badge');
    const create = [...actions.querySelectorAll('button.primary')].find(button => button.dataset.view === 'new-trip');

    [...actions.children].forEach(child => {
      const keep = child === company || child === create || child === wrap;
      if (!keep) child.style.display = 'none';
    });

    // Ne déplace les éléments que si leur ordre est réellement incorrect.
    const desired = [company, create, wrap].filter(Boolean);
    const current = [...actions.children].filter(child => desired.includes(child));
    const needsReorder = desired.length !== current.length || desired.some((child, index) => current[index] !== child);
    if (needsReorder) desired.forEach(child => actions.appendChild(child));

    refreshMenu();
    updateSubtitle();
  }

  function navigateToNewTrip() {
    const sidebarButton = document.querySelector('.nav-item[data-view="new-trip"]');
    if (sidebarButton) {
      sidebarButton.click();
      return;
    }
    location.hash = '#new-trip';
  }

  function bindTopbarActions() {
    const actions = document.querySelector('.topbar-actions');
    if (!actions || actions.dataset.nexisStableBound === '1') return;
    actions.dataset.nexisStableBound = '1';

    actions.addEventListener('click', event => {
      const create = event.target.closest('button.primary[data-view="new-trip"]');
      if (create) {
        event.preventDefault();
        navigateToNewTrip();
      }
    });
  }

  let observer = null;
  function start() {
    normalizeTopbar();
    bindTopbarActions();

    const actions = document.querySelector('.topbar-actions');
    if (actions && !observer) {
      observer = new MutationObserver(() => {
        // Surveillance ciblée uniquement sur les ajouts/retraits de vrais boutons.
        window.requestAnimationFrame(() => {
          normalizeTopbar();
          bindTopbarActions();
        });
      });
      observer.observe(actions, { childList:true });
    }
  }

  window.addEventListener('hashchange', () => {
    updateSubtitle();
    window.requestAnimationFrame(normalizeTopbar);
  });
  window.addEventListener('nexis:organization-ready', () => window.requestAnimationFrame(normalizeTopbar));
  window.addEventListener('nexis:organization-updated', () => window.requestAnimationFrame(normalizeTopbar));

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();
