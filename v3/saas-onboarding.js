(() => {
  'use strict';
  if (window.__NEXIS_SAAS_ONBOARDING__) return;
  window.__NEXIS_SAAS_ONBOARDING__ = true;

  const style = document.createElement('style');
  style.textContent = `
    .nexis-onboarding{position:fixed;right:22px;bottom:22px;z-index:9000;width:min(360px,calc(100vw - 28px));padding:16px;border:1px solid #dfe5ec;border-radius:16px;background:#fff;box-shadow:0 18px 50px rgba(25,45,68,.16)}
    .nexis-onboarding[hidden]{display:none}.nexis-onboarding-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.nexis-onboarding-head h3{margin:0;color:#172a40;font-size:14px}.nexis-onboarding-head p{margin:4px 0 0;color:#7b8796;font-size:8.7px;line-height:1.45}.nexis-onboarding-close{width:28px;height:28px;border:1px solid #dce3ea;border-radius:8px;background:#fff;color:#56677a;cursor:pointer}
    .nexis-onboarding-progress{height:5px;margin:13px 0 14px;border-radius:99px;background:#eef2f5;overflow:hidden}.nexis-onboarding-progress span{display:block;height:100%;border-radius:inherit;background:#ff8a00;transition:width .2s ease}.nexis-onboarding-list{display:grid;gap:7px}.nexis-onboarding-step{display:grid;grid-template-columns:25px 1fr auto;align-items:center;gap:9px;padding:9px;border:1px solid #e5e9ee;border-radius:10px;background:#fafbfd}.nexis-onboarding-step.done{background:#f2faf6;border-color:#d6eee2}.nexis-onboarding-index{display:grid;place-items:center;width:24px;height:24px;border-radius:50%;background:#edf1f5;color:#647387;font-size:8px;font-weight:800}.nexis-onboarding-step.done .nexis-onboarding-index{background:#dff4e9;color:#087b59}.nexis-onboarding-step strong{display:block;color:#30445a;font-size:8.8px}.nexis-onboarding-step small{display:block;margin-top:2px;color:#8995a2;font-size:7.7px}.nexis-onboarding-action{padding:6px 7px;border:0;background:transparent;color:#bd6500;font-size:8px;font-weight:800;cursor:pointer}.nexis-onboarding-complete{padding:12px;border-radius:11px;background:#eef9f4;color:#087b59;font-size:9px;font-weight:750;text-align:center}
    @media(max-width:740px){.nexis-onboarding{right:14px;bottom:14px}}
  `;
  document.head.appendChild(style);

  const panel = document.createElement('aside');
  panel.className = 'nexis-onboarding';
  panel.hidden = true;
  panel.innerHTML = `
    <div class="nexis-onboarding-head"><div><h3>Bien démarrer avec Nexis</h3><p>Configurez votre espace en quelques étapes.</p></div><button type="button" class="nexis-onboarding-close" aria-label="Fermer">×</button></div>
    <div class="nexis-onboarding-progress"><span id="nexis-onboarding-progress"></span></div>
    <div class="nexis-onboarding-list" id="nexis-onboarding-list"></div>`;
  document.body.appendChild(panel);

  let dismissed = false;
  let db = null;

  function org() { return window.NexisOrganization?.organization?.() || null; }

  async function loadState() {
    if (!window.NexisAuth?.ready || !window.NexisOrganization?.ready) return;
    await window.NexisAuth.ready;
    await window.NexisOrganization.ready;
    db = window.NexisAuth.client || window.supabase?.createClient?.();
    if (!db) return;

    const organization = org();
    if (!organization?.id) return;

    const [truckResult, tripResult] = await Promise.all([
      db.from('trucks').select('id', { count: 'exact', head: true }),
      db.from('trips').select('id', { count: 'exact', head: true })
    ]);

    const companyComplete = Boolean((organization.legal_name || organization.name) && organization.address && organization.phone);
    const hasTruck = !truckResult.error && Number(truckResult.count || 0) > 0;
    const hasTrip = !tripResult.error && Number(tripResult.count || 0) > 0;

    render([
      { key:'company', done:companyComplete, title:'Compléter l’entreprise', help:'Adresse, téléphone et informations légales.', action:'Compléter', event:'nexis:open-organization-settings' },
      { key:'truck', done:hasTruck, title:'Ajouter votre premier camion', help:'Construisez votre flotte.', action:'Ajouter', view:'fleet' },
      { key:'trip', done:hasTrip, title:'Créer votre première mission', help:'Commencez le suivi opérationnel.', action:'Créer', view:'new-trip' }
    ]);
  }

  function render(steps) {
    if (dismissed) return;
    const complete = steps.filter(step => step.done).length;
    document.getElementById('nexis-onboarding-progress').style.width = `${Math.round((complete / steps.length) * 100)}%`;
    const list = document.getElementById('nexis-onboarding-list');

    if (complete === steps.length) {
      list.innerHTML = '<div class="nexis-onboarding-complete">Votre espace Nexis est prêt. Bonne exploitation.</div>';
      panel.hidden = false;
      window.setTimeout(() => { panel.hidden = true; }, 5000);
      return;
    }

    list.innerHTML = steps.map((step,index) => `
      <div class="nexis-onboarding-step ${step.done ? 'done' : ''}" data-onboarding-step="${step.key}">
        <span class="nexis-onboarding-index">${step.done ? '✓' : index + 1}</span>
        <div><strong>${step.title}</strong><small>${step.help}</small></div>
        ${step.done ? '' : `<button type="button" class="nexis-onboarding-action" data-onboarding-action="${step.key}">${step.action}</button>`}
      </div>`).join('');
    panel.hidden = false;

    steps.forEach(step => {
      if (step.done) return;
      const button = panel.querySelector(`[data-onboarding-action="${step.key}"]`);
      button?.addEventListener('click', () => {
        if (step.event) window.dispatchEvent(new CustomEvent(step.event));
        if (step.view) document.querySelector(`[data-view="${step.view}"]`)?.click();
      });
    });
  }

  panel.querySelector('.nexis-onboarding-close').addEventListener('click', () => {
    dismissed = true;
    panel.hidden = true;
  });

  window.addEventListener('nexis:organization-ready', loadState);
  window.addEventListener('nexis:organization-updated', loadState);
  window.addEventListener('nexis:invoice-updated', loadState);
  window.addEventListener('nexis:authenticated', () => window.setTimeout(loadState, 300));
  window.addEventListener('hashchange', () => window.setTimeout(loadState, 150));

  window.setTimeout(loadState, 900);
})();
