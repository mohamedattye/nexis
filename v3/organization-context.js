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

  function renderContext() {
    const organization = state.organization;
    if (!organization) return;

    let badge = document.getElementById('organization-context-badge');
    const actions = document.querySelector('.topbar-actions');
    if (!badge && actions) {
      badge = document.createElement('button');
      badge.type = 'button';
      badge.id = 'organization-context-badge';
      badge.className = 'organization-context-badge';
      badge.title = 'Paramètres de l’entreprise';
      actions.insertBefore(badge, actions.firstChild);
      badge.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('nexis:open-organization-settings'));
      });
    }

    if (badge) {
      badge.innerHTML = `${organization.logo_url ? `<img src="${String(organization.logo_url).replaceAll('"','&quot;')}" alt="">` : '<span class="organization-context-avatar">●</span>'}<span>${organization.name || organization.legal_name || 'Entreprise'}</span>`;
    }

    const sidebarStatus = document.querySelector('.sidebar-status div');
    if (sidebarStatus) {
      const strong = sidebarStatus.querySelector('strong');
      const small = sidebarStatus.querySelector('small');
      if (strong) strong.textContent = organization.name || 'Entreprise';
      if (small) small.textContent = state.profile?.role === 'admin' ? 'Administrateur' : 'Utilisateur';
    }

    document.documentElement.dataset.organizationId = organization.id || '';
    document.documentElement.dataset.organizationCurrency = organization.currency || 'XOF';
    document.documentElement.dataset.organizationVat = String(Number(organization.default_vat_rate ?? 18));
  }

  const style = document.createElement('style');
  style.textContent = `
    .organization-context-badge{display:inline-flex;align-items:center;gap:7px;height:32px;max-width:210px;padding:0 9px;border:1px solid #dce3ea;border-radius:10px;background:#fff;color:#34495f;font:750 8.5px var(--font-ui,"Inter",sans-serif);cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .organization-context-badge:hover{background:#f8fafc;border-color:#cbd5df}.organization-context-badge img{width:20px;height:20px;border-radius:6px;object-fit:contain;background:#fff}.organization-context-avatar{color:#ff8a00;font-size:9px}
    @media(max-width:920px){.organization-context-badge{max-width:130px}.organization-context-badge span:last-child{overflow:hidden;text-overflow:ellipsis}}
    @media(max-width:740px){.organization-context-badge{display:none}}
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
