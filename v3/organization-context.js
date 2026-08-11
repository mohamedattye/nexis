(() => {
  'use strict';
  if (window.__NEXIS_ORGANIZATION_CONTEXT__) return;
  window.__NEXIS_ORGANIZATION_CONTEXT__ = true;

  const state = { user:null, profile:null, organization:null, loading:true, error:null };
  let resolveReady;
  let readyResolved = false;
  const ready = new Promise(resolve => { resolveReady = resolve; });

  function loadScript(src, marker) {
    if (marker && window[marker]) return Promise.resolve();
    const existing = [...document.scripts].find(script => script.src.includes(src.split('?')[0]));
    if (existing) {
      if (existing.dataset.loaded === '1') return Promise.resolve();
      return new Promise((resolve,reject) => {
        existing.addEventListener('load', resolve, {once:true});
        existing.addEventListener('error', reject, {once:true});
      });
    }
    return new Promise((resolve,reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = false;
      script.addEventListener('load', () => { script.dataset.loaded='1'; resolve(); }, {once:true});
      script.addEventListener('error', reject, {once:true});
      document.head.appendChild(script);
    });
  }

  function snapshot() {
    return { user:state.user, profile:state.profile, organization:state.organization, loading:state.loading, error:state.error };
  }

  function emit(name='nexis:organization-ready') {
    window.dispatchEvent(new CustomEvent(name,{detail:snapshot()}));
  }

  function organizationInitials(name) {
    const words = String(name || 'Entreprise').trim().split(/\s+/).filter(Boolean);
    return (words.slice(0,2).map(word => word[0]).join('') || 'EN').toUpperCase();
  }

  function ensureTopbarWorkspace(organization) {
    const actions = document.querySelector('.topbar-actions');
    if (!actions) return;

    let badge = document.getElementById('organization-context-badge');
    if (!badge) {
      badge = document.createElement('button');
      badge.type = 'button';
      badge.id = 'organization-context-badge';
      badge.className = 'organization-context-badge';
      badge.title = 'Paramètres de l’entreprise';
      badge.addEventListener('click', () => window.dispatchEvent(new CustomEvent('nexis:open-organization-settings')));
      actions.prepend(badge);
    }

    const logo = organization.logo_url
      ? `<img src="${String(organization.logo_url).replaceAll('"','&quot;')}" alt="">`
      : `<span class="organization-context-initials">${organizationInitials(organization.name || organization.legal_name)}</span>`;

    badge.innerHTML = `${logo}<span class="organization-context-name">${organization.name || organization.legal_name || 'Entreprise'}</span><span class="organization-context-chevron" aria-hidden="true">⌄</span>`;
  }

  function renderContext() {
    const organization = state.organization;
    if (!organization) return;

    ensureTopbarWorkspace(organization);

    const oldSidebarWorkspace = document.querySelector('.sidebar-status');
    if (oldSidebarWorkspace) oldSidebarWorkspace.hidden = true;

    document.documentElement.dataset.organizationId = organization.id || '';
    document.documentElement.dataset.organizationCurrency = organization.currency || 'XOF';
    document.documentElement.dataset.organizationVat = String(Number(organization.default_vat_rate ?? 18));
  }

  const style = document.createElement('style');
  style.textContent = `
    .organization-context-badge{
      display:inline-flex;align-items:center;gap:8px;height:36px;max-width:210px;padding:0 10px;
      border:1px solid #dce3ea;border-radius:10px;background:#fff;color:#34495f;
      font:750 9px var(--font-ui,"Inter",sans-serif);cursor:pointer;white-space:nowrap;
      box-shadow:0 1px 2px rgba(16,36,59,.025);
    }
    .organization-context-badge:hover{background:#f8fafc;border-color:#cbd5df}
    .organization-context-badge img,.organization-context-initials{
      width:22px;height:22px;border-radius:7px;object-fit:contain;display:grid;place-items:center;
      background:#eef3f7;color:#15304c;font-size:8px;font-weight:800;flex:0 0 22px;
    }
    .organization-context-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .organization-context-chevron{color:#8a97a6;font-size:11px;flex:0 0 auto}
    @media(max-width:740px){.organization-context-badge{max-width:145px}.organization-context-name{max-width:90px}}
  `;
  document.head.appendChild(style);

  async function ensureAuthentication() {
    await loadScript('saas-auth-gateway.js?v=20260807-saas-1','__NEXIS_SAAS_AUTH_GATEWAY__');
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

      const profileResult = await db.from('profiles').select('id,email,full_name,role,is_active,organization_id').eq('id',state.user.id).single();
      if (profileResult.error) throw profileResult.error;
      state.profile = profileResult.data;
      if (!state.profile?.is_active) throw new Error('Compte utilisateur désactivé.');
      if (!state.profile?.organization_id) throw new Error('Aucune entreprise associée à cet utilisateur.');

      const organizationResult = await db.from('organizations').select('id,name,slug,legal_name,ninea,rccm,address,city,country,phone,email,logo_url,currency,default_vat_rate,is_active,invoice_prefix,price_note_prefix,document_number_padding').eq('id',state.profile.organization_id).single();
      if (organizationResult.error) throw organizationResult.error;
      state.organization = organizationResult.data;
      if (!state.organization?.is_active) throw new Error('Entreprise désactivée.');

      renderContext();
      loadScript('saas-onboarding.js?v=20260807-saas-1','__NEXIS_SAAS_ONBOARDING__').catch(error => console.error('Onboarding Nexis :',error));
    } catch(error) {
      state.error = error;
      console.error('Contexte entreprise Nexis :',error);
    } finally {
      state.loading = false;
      if (!readyResolved) { readyResolved = true; resolveReady(snapshot()); }
      emit();
    }
    return snapshot();
  }

  async function refresh() {
    const result = await load();
    emit('nexis:organization-updated');
    return result;
  }

  window.NexisOrganization = { ready, get:snapshot, refresh, organization:()=>state.organization, profile:()=>state.profile, user:()=>state.user };
  load();
})();