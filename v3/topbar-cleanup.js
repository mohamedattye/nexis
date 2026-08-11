(() => {
  'use strict';
  if (window.__NEXIS_TOPBAR_CLEANUP__) return;
  window.__NEXIS_TOPBAR_CLEANUP__ = true;

  function loadCss(id, href) {
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }
  loadCss('nexis-design-system-css', 'nexis-design-system.css?v=20260811-uxui-3');
  loadCss('nexis-dashboard-polish-css', 'dashboard-polish.css?v=20260811-dashboard-1');

  const subtitles = {
    dashboard: 'Vue d’ensemble de votre activité transport',
    'new-trip': 'Créez une mission rapidement et sans friction',
    trips: 'Suivez vos opérations et leur rentabilité',
    fleet: 'Pilotez votre flotte et ses performances',
    clients: 'Gérez vos clients et leur activité',
    invoices: 'Facturation, notes de prix et suivi des paiements',
    expenses: 'Suivez les dépenses de votre exploitation',
    reports: 'Analysez vos performances et vos résultats'
  };

  const style = document.createElement('style');
  style.textContent = `
    .topbar-actions{align-items:center}
    .topbar-actions>.sync-state{display:none!important}
    .nexis-account-wrap{position:relative;display:inline-flex}
    .nexis-account-button{display:grid;place-items:center;cursor:pointer}
    .nexis-account-avatar{display:grid;place-items:center}
    .nexis-account-menu{position:absolute;right:0;z-index:22000;background:#fff}
    .nexis-account-menu[hidden]{display:none}
    .nexis-account-head strong,.nexis-account-head small{display:block}
    .nexis-account-head small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .nexis-account-item{width:100%;border:0;background:transparent;text-align:left;cursor:pointer}
    .nexis-account-item.danger{color:#a33f47}
    .nexis-account-separator{height:1px;background:#edf0f3}
    @media(max-width:760px){.organization-context-badge{display:none!important}.nexis-account-menu{position:fixed;right:12px;top:68px;width:min(280px,calc(100vw - 24px))}}
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
    if (!eyebrow) return;
    eyebrow.textContent = subtitles[currentView()] || 'Pilotez votre activité transport simplement';
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
      event.stopPropagation();
      menu.hidden = !menu.hidden;
      button.setAttribute('aria-expanded', String(!menu.hidden));
      refreshMenu();
    });

    wrap.addEventListener('click', event => {
      const item = event.target.closest('[data-account-action]');
      if (!item) return;
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

  function clean() {
    const actions = document.querySelector('.topbar-actions');
    if (!actions) return;
    const wrap = ensureMenu();
    if (!wrap) return;

    [...actions.children].forEach(child => {
      const keep = child.id === 'organization-context-badge'
        || child.id === 'nexis-account-wrap'
        || (child.matches('button.primary') && child.dataset.view === 'new-trip');
      if (!keep) child.style.display = 'none';
    });

    const company = document.getElementById('organization-context-badge');
    const create = [...actions.querySelectorAll('button.primary')].find(button => button.dataset.view === 'new-trip');
    if (company) actions.appendChild(company);
    if (create) actions.appendChild(create);
    actions.appendChild(wrap);
    refreshMenu();
    updateSubtitle();
  }

  let scheduled = false;
  const scheduleClean = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; clean(); });
  };

  const observer = new MutationObserver(scheduleClean);
  const start = () => {
    clean();
    observer.observe(document.body, { childList:true, subtree:true, attributes:true, attributeFilter:['class'] });
  };

  window.addEventListener('hashchange', scheduleClean);
  window.addEventListener('nexis:organization-ready', scheduleClean);
  window.addEventListener('nexis:organization-updated', scheduleClean);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true }); else start();
})();
