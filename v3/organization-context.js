(() => {
  'use strict';
  if (window.__NEXIS_ORGANIZATION_CONTEXT__) return;
  window.__NEXIS_ORGANIZATION_CONTEXT__ = true;

  const state = {
    user: null,
    profile: null,
    organization: null,
    loading: true,
    error: null
  };

  let resolveReady;
  let readyResolved = false;
  const ready = new Promise(resolve => { resolveReady = resolve; });

  function loadScript(src, marker) {
    if (marker && window[marker]) return Promise.resolve();
    const existing = [...document.scripts].find(script => script.src.includes(src.split('?')[0]));
    if (existing) {
      if (existing.dataset.loaded === '1') return Promise.resolve();
      return new Promise((resolve, reject) => {
        existing.addEventListener('load', resolve, { once:true });
        existing.addEventListener('error', reject, { once:true });
      });
    }
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = false;
      script.addEventListener('load', () => { script.dataset.loaded = '1'; resolve(); }, { once:true });
      script.addEventListener('error', reject, { once:true });
      document.head.appendChild(script);
    });
  }

  function snapshot() {
    return {
      user: state.user,
      profile: state.profile,
      organization: state.organization,
      loading: state.loading,
      error: state.error
    };
  }

  function emit(name = 'nexis:organization-ready') {
    window.dispatchEvent(new CustomEvent(name, { detail: snapshot() }));
  }

  function roleLabel(role) {
    return ({ admin:'Administrateur', operator:'Exploitant', accountant:'Comptable' })[role] || 'Utilisateur';
  }

  function organizationInitials(name) {
    const words = String(name || 'Entreprise').trim().split(/\s+/).filter(Boolean);
    return (words.slice(0, 2).map(word => word[0]).join('') || 'EN').toUpperCase();
  }

  function ensureSidebarWorkspace(organization) {
    const sidebar = document.querySelector('.sidebar');
    const brand = sidebar?.querySelector('.brand');
    let card = sidebar?.querySelector('.sidebar-status');
    if (!sidebar || !brand || !card) return;

    if (brand.nextElementSibling !== card) brand.insertAdjacentElement('afterend', card);

    card.classList.add('sidebar-workspace');
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `Paramètres de ${organization.name || 'l’entreprise'}`);
    card.title = 'Paramètres de l’entreprise';

    const logoMarkup = organization.logo_url
      ? `<img class="sidebar-workspace-logo" src="${String(organization.logo_url).replaceAll('"','&quot;')}" alt="">`
      : `<span class="sidebar-workspace-initials">${organizationInitials(organization.name || organization.legal_name)}</span>`;

    card.innerHTML = `${logoMarkup}<div class="sidebar-workspace-copy"><strong>${organization.name || organization.legal_name || 'Entreprise'}</strong><small>${roleLabel(state.profile?.role)}</small></div><span class="sidebar-workspace-chevron" aria-hidden="true">›</span>`;

    if (card.dataset.workspaceBound !== '1') {
      card.dataset.workspaceBound = '1';
      const openSettings = () => window.dispatchEvent(new CustomEvent('nexis:open-organization-settings'));
      card.addEventListener('click', openSettings);
      card.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openSettings();
        }
      });
    }
  }

  function renderContext() {
    const organization = state.organization;
    if (!organization) return;

    ensureSidebarWorkspace(organization);

    // Ancien badge de topbar : supprimé volontairement pour éviter le doublon.
    document.getElementById('organization-context-badge')?.remove();

    document.documentElement.dataset.organizationId = organization.id || '';
    document.documentElement.dataset.organizationCurrency = organization.currency || 'XOF';
    document.documentElement.dataset.organizationVat = String(Number(organization.default_vat_rate ?? 18));
  }

  const style = document.createElement('style');
  style.textContent = `
    .sidebar-workspace{
      width:100%;
      min-height:58px;
      display:grid!important;
      grid-template-columns:34px minmax(0,1fr) 16px;
      align-items:center;
      gap:10px!important;
      margin:12px 0 0!important;
      padding:9px 10px!important;
      border:1px solid rgba(255,255,255,.11)!important;
      border-radius:12px!important;
      background:rgba(255,255,255,.055)!important;
      color:#fff;
      cursor:pointer;
      box-shadow:none!important;
      transition:background .16s ease,border-color .16s ease,transform .16s ease;
    }
    .sidebar-workspace:hover,.sidebar-workspace:focus-visible{
      background:rgba(255,255,255,.09)!important;
      border-color:rgba(255,255,255,.17)!important;
      outline:none;
    }
    .sidebar-workspace-logo,.sidebar-workspace-initials{
      width:34px;height:34px;border-radius:9px;display:grid;place-items:center;object-fit:contain;
      background:#fff;color:#15304c;font:800 10px var(--font-ui,"Inter",sans-serif);overflow:hidden;
    }
    .sidebar-workspace-copy{min-width:0}
    .sidebar-workspace-copy strong{
      display:block!important;margin:0!important;color:#fff!important;font-size:11px!important;line-height:1.25!important;font-weight:760!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
    }
    .sidebar-workspace-copy small{
      display:block!important;margin-top:3px!important;color:#9fb0c2!important;font-size:8.5px!important;line-height:1.2!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
    }
    .sidebar-workspace-chevron{color:#8097ad;font-size:18px;line-height:1;text-align:right}
    .sidebar nav{margin-top:12px!important}
    @media(max-width:740px){.sidebar-workspace{display:none!important}}
  `;
  document.head.appendChild(style);

  async function ensureAuthentication() {
    await loadScript('saas-auth-gateway.js?v=20260807-saas-1', '__NEXIS_SAAS_AUTH_GATEWAY__');
    if (!window.NexisAuth?.ready) throw new Error('Portail d’authentification Nexis indisponible.');
    return window.NexisAuth.ready;
  }

  async function load() {
    state.loading = true;
    state.error = null;

    try {
      if (!window.supabase?.createClient) throw new Error('Supabase indisponible.');
      const authenticatedUser = await ensureAuthentication();
      if (!authenticatedUser) throw new Error('Utilisateur non connecté.');

      const db = window.NexisAuth?.client || window.supabase.createClient();
      state.user = authenticatedUser;

      const profileResult = await db
        .from('profiles')
        .select('id,email,full_name,role,is_active,organization_id')
        .eq('id', state.user.id)
        .single();
      if (profileResult.error) throw profileResult.error;
      state.profile = profileResult.data;

      if (!state.profile?.is_active) throw new Error('Compte utilisateur désactivé.');
      if (!state.profile?.organization_id) throw new Error('Aucune entreprise associée à cet utilisateur.');

      const organizationResult = await db
        .from('organizations')
        .select('id,name,slug,legal_name,ninea,rccm,address,city,country,phone,email,logo_url,currency,default_vat_rate,is_active,invoice_prefix,price_note_prefix,document_number_padding')
        .eq('id', state.profile.organization_id)
        .single();
      if (organizationResult.error) throw organizationResult.error;
      state.organization = organizationResult.data;

      if (!state.organization?.is_active) throw new Error('Entreprise désactivée.');

      renderContext();
      loadScript('saas-onboarding.js?v=20260807-saas-1', '__NEXIS_SAAS_ONBOARDING__').catch(error => console.error('Onboarding Nexis :', error));
    } catch (error) {
      state.error = error;
      console.error('Contexte entreprise Nexis :', error);
    } finally {
      state.loading = false;
      if (!readyResolved) {
        readyResolved = true;
        resolveReady(snapshot());
      }
      emit();
    }

    return snapshot();
  }

  async function refresh() {
    const result = await load();
    emit('nexis:organization-updated');
    return result;
  }

  window.NexisOrganization = {
    ready,
    get: snapshot,
    refresh,
    organization: () => state.organization,
    profile: () => state.profile,
    user: () => state.user
  };

  load();
})();