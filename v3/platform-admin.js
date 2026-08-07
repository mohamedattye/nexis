(() => {
  'use strict';
  if (window.__NEXIS_PLATFORM_ADMIN__) return;
  window.__NEXIS_PLATFORM_ADMIN__ = true;
  if (!window.supabase?.createClient) return;

  const db = window.supabase.createClient();
  const fmt = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
  const money = value => `${fmt.format(Number(value) || 0)} FCFA`;
  const esc = value => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const dateFR = value => {
    if (!value) return '—';
    const [y,m,d] = String(value).split('-');
    return y && m && d ? `${d}/${m}/${y}` : String(value);
  };

  let organizations = [];
  let kpis = null;
  let isAdmin = false;

  const style = document.createElement('style');
  style.textContent = `
    .platform-admin-button{height:32px;padding:0 10px;border:1px solid #233c59;border-radius:10px;background:#10243b;color:#fff;font:800 8px var(--font-ui,"Inter",sans-serif);cursor:pointer}
    .platform-admin-shell{position:fixed;inset:0;z-index:180;background:#f4f6f9;display:flex;flex-direction:column}.platform-admin-shell[hidden]{display:none}
    .platform-admin-head{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:18px 24px;background:#10243b;color:#fff}.platform-admin-head small{display:block;color:#96a9bc;font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:.08em}.platform-admin-head h2{margin:4px 0 0;font-size:20px}.platform-admin-head-actions{display:flex;gap:8px}.platform-admin-head button{height:34px;padding:0 11px;border:1px solid rgba(255,255,255,.17);border-radius:9px;background:rgba(255,255,255,.08);color:#fff;font:750 8px var(--font-ui,"Inter",sans-serif);cursor:pointer}
    .platform-admin-body{padding:20px 24px 30px;overflow:auto}.platform-admin-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px}.platform-admin-kpi{padding:14px;border:1px solid #dfe5ec;border-radius:13px;background:#fff}.platform-admin-kpi span{display:block;color:#8190a0;font-size:8px;font-weight:800;text-transform:uppercase}.platform-admin-kpi strong{display:block;margin-top:7px;color:#1d324a;font-size:20px}.platform-admin-kpi small{display:block;margin-top:4px;color:#8d98a5;font-size:8px}
    .platform-admin-panel{border:1px solid #dfe5ec;border-radius:14px;background:#fff;overflow:hidden}.platform-admin-toolbar{display:flex;gap:10px;align-items:center;padding:13px;border-bottom:1px solid #e8edf2}.platform-admin-toolbar input{flex:1;height:38px;border:1px solid #d8e0e8;border-radius:9px;padding:0 11px;font-size:10px}.platform-admin-table-wrap{overflow:auto}.platform-admin-table{width:100%;border-collapse:collapse;min-width:1000px}.platform-admin-table th{padding:10px 12px;background:#f7f9fb;color:#7c8997;font-size:7.5px;text-transform:uppercase;text-align:left}.platform-admin-table td{padding:12px;border-top:1px solid #edf1f4;color:#405268;font-size:9px}.platform-admin-company strong{display:block;color:#20364d;font-size:10px}.platform-admin-company small{display:block;margin-top:3px;color:#8995a2;font-size:8px}.platform-admin-status{display:inline-flex;padding:4px 7px;border-radius:999px;font-size:7.5px;font-weight:800}.platform-admin-status.active{background:#eaf8f2;color:#0a7757}.platform-admin-status.pending{background:#fff5df;color:#9c6300}.platform-admin-status.suspended{background:#fff0f0;color:#a5464d}.platform-admin-status.expired,.platform-admin-status.cancelled{background:#eef1f4;color:#687684}.platform-admin-actions{display:flex;justify-content:flex-end;gap:5px}.platform-admin-actions button{height:29px;padding:0 8px;border:1px solid #d8e0e8;border-radius:8px;background:#fff;color:#42556a;font:750 7.5px var(--font-ui,"Inter",sans-serif);cursor:pointer}.platform-admin-actions button.primary-action{border-color:#f3b86e;background:#fff8ef;color:#b45c00}
    .platform-admin-modal-shell{position:fixed;inset:0;z-index:190;display:grid;place-items:center;padding:20px;background:rgba(15,29,45,.52);backdrop-filter:blur(3px)}.platform-admin-modal-shell[hidden]{display:none}.platform-admin-modal{width:min(520px,96vw);padding:20px;border-radius:16px;background:#fff;box-shadow:0 22px 70px rgba(11,31,54,.25)}.platform-admin-modal h3{margin:0;color:#1e334a;font-size:16px}.platform-admin-modal>p{margin:6px 0 16px;color:#82909f;font-size:9px}.platform-admin-form{display:grid;grid-template-columns:1fr 1fr;gap:11px}.platform-admin-form label{display:grid;gap:5px;color:#46596e;font-size:8.5px;font-weight:750}.platform-admin-form label.full{grid-column:1/-1}.platform-admin-form input,.platform-admin-form select,.platform-admin-form textarea{width:100%;border:1px solid #d8e0e8;border-radius:9px;padding:0 10px;font:inherit;font-size:10px}.platform-admin-form input,.platform-admin-form select{height:39px}.platform-admin-form textarea{min-height:70px;padding-top:9px}.platform-admin-price{grid-column:1/-1;padding:11px;border-radius:10px;background:#f6f8fa;color:#536579;font-size:9px}.platform-admin-price strong{float:right;color:#173149;font-size:12px}.platform-admin-modal-actions{grid-column:1/-1;display:flex;justify-content:flex-end;gap:7px;margin-top:4px}.platform-admin-modal-actions button{height:34px;padding:0 12px;border-radius:9px;font:800 8px var(--font-ui,"Inter",sans-serif);cursor:pointer}.platform-admin-modal-actions .cancel{border:1px solid #d8e0e8;background:#fff;color:#516274}.platform-admin-modal-actions .save{border:0;background:#ff8a00;color:#14233a}.platform-admin-error{grid-column:1/-1;margin:0;padding:9px;border-radius:9px;background:#fff0f0;color:#a9444d;font-size:8.5px}
    @media(max-width:900px){.platform-admin-kpis{grid-template-columns:1fr 1fr}.platform-admin-body{padding:14px}.platform-admin-head{padding:14px 16px}}@media(max-width:600px){.platform-admin-kpis{grid-template-columns:1fr}.platform-admin-form{grid-template-columns:1fr}.platform-admin-form label.full,.platform-admin-price,.platform-admin-modal-actions,.platform-admin-error{grid-column:auto}}
  `;
  document.head.appendChild(style);

  const shell = document.createElement('section');
  shell.className = 'platform-admin-shell';
  shell.id = 'platform-admin-shell';
  shell.hidden = true;
  shell.innerHTML = `
    <header class="platform-admin-head"><div><small>Administration plateforme</small><h2>Nexis Admin</h2></div><div class="platform-admin-head-actions"><button id="platform-admin-refresh" type="button">Actualiser</button><button id="platform-admin-close" type="button">Fermer</button></div></header>
    <div class="platform-admin-body">
      <div class="platform-admin-kpis" id="platform-admin-kpis"></div>
      <section class="platform-admin-panel">
        <div class="platform-admin-toolbar"><input id="platform-admin-search" type="search" placeholder="Rechercher une société, ville, e-mail…"><span id="platform-admin-count"></span></div>
        <div class="platform-admin-table-wrap"><table class="platform-admin-table"><thead><tr><th>Société</th><th>Flotte</th><th>Utilisateurs</th><th>Abonnement</th><th>Période</th><th>Tarif annuel</th><th>Payé</th><th></th></tr></thead><tbody id="platform-admin-body"></tbody></table></div>
      </section>
    </div>`;
  document.body.appendChild(shell);

  const modal = document.createElement('section');
  modal.className = 'platform-admin-modal-shell';
  modal.id = 'platform-admin-modal-shell';
  modal.hidden = true;
  modal.innerHTML = `<div class="platform-admin-modal"><h3 id="platform-admin-modal-title">Activer l’abonnement</h3><p id="platform-admin-modal-subtitle"></p><form class="platform-admin-form" id="platform-admin-form"><input id="platform-admin-org-id" type="hidden"><label>Date de début<input id="platform-admin-start" type="date" required></label><label>Montant payé<input id="platform-admin-paid" type="number" min="0" step="1000" required></label><label>Mode de paiement<select id="platform-admin-method"><option value="Virement">Virement</option><option value="Chèque">Chèque</option><option value="Espèces">Espèces</option><option value="Wave">Wave</option><option value="Orange Money">Orange Money</option><option value="Autre">Autre</option></select></label><label>Référence<input id="platform-admin-reference" type="text"></label><label class="full">Notes<textarea id="platform-admin-notes"></textarea></label><div class="platform-admin-price">Tarif annuel calculé <strong id="platform-admin-price"></strong></div><p class="platform-admin-error" id="platform-admin-error" hidden></p><div class="platform-admin-modal-actions"><button type="button" class="cancel" id="platform-admin-modal-cancel">Annuler</button><button type="submit" class="save">Activer pour 1 an</button></div></form></div>`;
  document.body.appendChild(modal);

  const body = document.getElementById('platform-admin-body');
  const search = document.getElementById('platform-admin-search');
  const errorBox = document.getElementById('platform-admin-error');

  function statusLabel(status) {
    return ({active:'Actif',pending:'En attente',suspended:'Suspendu',expired:'Expiré',cancelled:'Annulé'})[status] || 'Aucun';
  }

  function renderKpis() {
    const el = document.getElementById('platform-admin-kpis');
    if (!kpis) return el.innerHTML = '';
    el.innerHTML = `
      <article class="platform-admin-kpi"><span>Sociétés clientes</span><strong>${fmt.format(kpis.organizations_total || 0)}</strong><small>${fmt.format(kpis.subscriptions_active || 0)} abonnement(s) actif(s)</small></article>
      <article class="platform-admin-kpi"><span>Encaissements année</span><strong>${money(kpis.cash_collected_current_year)}</strong><small>${money(kpis.cash_collected_total)} encaissés au total</small></article>
      <article class="platform-admin-kpi"><span>Valeur contrats actifs</span><strong>${money(kpis.annual_contract_value_active)}</strong><small>Montant annuel des abonnements actifs</small></article>
      <article class="platform-admin-kpi"><span>Échéances à 30 jours</span><strong>${fmt.format(kpis.subscriptions_expiring_30d || 0)}</strong><small>${fmt.format(kpis.total_active_trucks || 0)} camions actifs sur la plateforme</small></article>`;
  }

  function filteredOrganizations() {
    const q = String(search?.value || '').trim().toLowerCase();
    if (!q) return organizations;
    return organizations.filter(org => `${org.organization_name || ''} ${org.legal_name || ''} ${org.email || ''} ${org.city || ''}`.toLowerCase().includes(q));
  }

  function renderRows() {
    const rows = filteredOrganizations();
    document.getElementById('platform-admin-count').textContent = `${rows.length} société${rows.length > 1 ? 's' : ''}`;
    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="8">Aucune société.</td></tr>';
      return;
    }
    body.innerHTML = rows.map(org => {
      const status = org.subscription_status || 'pending';
      return `<tr>
        <td><div class="platform-admin-company"><strong>${esc(org.organization_name || 'Entreprise')}</strong><small>${esc([org.city,org.email].filter(Boolean).join(' · ') || '—')}</small></div></td>
        <td>${org.active_trucks ?? 0} actif(s)</td>
        <td>${org.users_count ?? 0}</td>
        <td><span class="platform-admin-status ${esc(status)}">${statusLabel(status)}</span></td>
        <td>${dateFR(org.starts_on)} → ${dateFR(org.ends_on)}</td>
        <td>${money(org.current_annual_price)}</td>
        <td>${money(org.amount_paid)}</td>
        <td><div class="platform-admin-actions">
          <button class="primary-action" data-admin-activate="${esc(org.organization_id)}">${status === 'active' ? 'Renouveler' : 'Activer'}</button>
          ${org.subscription_id && status === 'active' ? `<button data-admin-status="suspended" data-subscription-id="${esc(org.subscription_id)}">Suspendre</button>` : ''}
          ${org.subscription_id && status === 'suspended' ? `<button data-admin-status="active" data-subscription-id="${esc(org.subscription_id)}">Réactiver</button>` : ''}
        </div></td>
      </tr>`;
    }).join('');
  }

  async function refresh() {
    const [adminResult,kpiResult,orgResult] = await Promise.all([
      db.rpc('is_platform_admin'),
      db.rpc('platform_admin_kpis'),
      db.rpc('platform_admin_organizations')
    ]);
    if (adminResult.error) throw adminResult.error;
    isAdmin = adminResult.data === true;
    if (!isAdmin) return;
    if (kpiResult.error) throw kpiResult.error;
    if (orgResult.error) throw orgResult.error;
    kpis = kpiResult.data || {};
    organizations = orgResult.data || [];
    renderKpis();
    renderRows();
  }

  function ensureButton() {
    if (!isAdmin) return;
    const actions = document.querySelector('.topbar-actions');
    if (!actions || document.getElementById('platform-admin-open')) return;
    const button = document.createElement('button');
    button.id = 'platform-admin-open';
    button.type = 'button';
    button.className = 'platform-admin-button';
    button.textContent = 'Nexis Admin';
    button.addEventListener('click', async () => {
      await refresh();
      shell.hidden = false;
      document.body.style.overflow = 'hidden';
    });
    actions.prepend(button);
  }

  async function detect() {
    try {
      await window.NexisAuth?.ready;
      const result = await db.rpc('is_platform_admin');
      if (result.error) return;
      isAdmin = result.data === true;
      ensureButton();
    } catch (error) { console.warn('Administration Nexis indisponible :', error); }
  }

  function openActivation(orgId) {
    const org = organizations.find(item => String(item.organization_id) === String(orgId));
    if (!org) return;
    document.getElementById('platform-admin-org-id').value = org.organization_id;
    document.getElementById('platform-admin-start').value = new Date().toISOString().slice(0,10);
    document.getElementById('platform-admin-paid').value = Number(org.current_annual_price || 0);
    document.getElementById('platform-admin-reference').value = '';
    document.getElementById('platform-admin-notes').value = '';
    document.getElementById('platform-admin-price').textContent = money(org.current_annual_price);
    document.getElementById('platform-admin-modal-title').textContent = `${org.subscription_status === 'active' ? 'Renouveler' : 'Activer'} · ${org.organization_name}`;
    document.getElementById('platform-admin-modal-subtitle').textContent = `${org.active_trucks || 0} camion(s) actif(s) · tarif annuel ${money(org.current_annual_price)}`;
    errorBox.hidden = true;
    modal.hidden = false;
  }

  document.getElementById('platform-admin-form').addEventListener('submit', async event => {
    event.preventDefault();
    const submit = event.target.querySelector('[type="submit"]');
    submit.disabled = true;
    errorBox.hidden = true;
    try {
      const { error } = await db.rpc('platform_admin_activate_subscription', {
        target_organization_id: document.getElementById('platform-admin-org-id').value,
        target_start_date: document.getElementById('platform-admin-start').value,
        target_amount_paid: Number(document.getElementById('platform-admin-paid').value || 0),
        target_payment_method: document.getElementById('platform-admin-method').value,
        target_payment_reference: document.getElementById('platform-admin-reference').value.trim() || null,
        target_notes: document.getElementById('platform-admin-notes').value.trim() || null
      });
      if (error) throw error;
      modal.hidden = true;
      await refresh();
    } catch (error) {
      errorBox.textContent = error.message || 'Activation impossible.';
      errorBox.hidden = false;
    } finally { submit.disabled = false; }
  });

  body.addEventListener('click', async event => {
    const activate = event.target.closest('[data-admin-activate]');
    if (activate) return openActivation(activate.dataset.adminActivate);
    const statusButton = event.target.closest('[data-admin-status]');
    if (!statusButton) return;
    statusButton.disabled = true;
    const { error } = await db.rpc('platform_admin_set_subscription_status', {
      target_subscription_id: statusButton.dataset.subscriptionId,
      target_status: statusButton.dataset.adminStatus
    });
    if (error) console.error(error);
    await refresh();
  });

  search.addEventListener('input', renderRows);
  document.getElementById('platform-admin-refresh').addEventListener('click', refresh);
  document.getElementById('platform-admin-close').addEventListener('click', () => { shell.hidden = true; document.body.style.overflow = ''; });
  document.getElementById('platform-admin-modal-cancel').addEventListener('click', () => { modal.hidden = true; });

  window.addEventListener('nexis:authenticated', detect);
  detect();
})();
