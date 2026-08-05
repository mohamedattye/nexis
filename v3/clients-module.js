(() => {
  'use strict';

  if (window.__NEXIS_CLIENTS_MODULE__) return;
  window.__NEXIS_CLIENTS_MODULE__ = true;
  if (!window.supabase?.createClient) return;

  const view = document.getElementById('clients');
  if (!view) return;

  const client = window.supabase.createClient();
  let clients = [];
  let currentFilter = 'all';
  let editingId = null;

  const esc = (value) => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');

  const style = document.createElement('style');
  style.textContent = `
    #clients{max-width:none}
    .clients-page{display:grid;gap:14px}
    .clients-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:14px}
    .clients-heading h2{margin:0;font-size:23px;letter-spacing:-.045em}
    .clients-heading p{margin:5px 0 0;color:#7d8999;font-size:10px}
    .clients-kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
    .clients-kpi{padding:16px 17px;border:1px solid #dfe5ed;border-radius:17px;background:#fff;box-shadow:0 12px 34px rgba(31,48,73,.07)}
    .clients-kpi span{display:block;color:#7c899a;font-size:8px;font-weight:800;letter-spacing:.05em;text-transform:uppercase}
    .clients-kpi strong{display:block;margin-top:6px;color:#1b2d43;font-family:var(--font-display);font-size:20px;letter-spacing:-.04em}
    .clients-panel{padding:18px;border:1px solid #dfe5ed;border-radius:17px;background:#fff;box-shadow:0 12px 34px rgba(31,48,73,.07)}
    .clients-toolbar{display:grid;grid-template-columns:minmax(260px,1fr) auto auto;gap:9px;padding:9px;border:1px solid #e4e9ef;border-radius:14px;background:#f7f9fb}
    .clients-toolbar input,.clients-toolbar select{height:40px;margin:0!important}
    .clients-table-wrap{margin-top:12px;overflow:auto;border:1px solid #e5eaf0;border-radius:13px}
    .clients-table{width:100%;min-width:900px;border-collapse:collapse}
    .clients-table th{text-align:left}
    .clients-table td{vertical-align:middle}
    .client-name{display:flex;flex-direction:column;gap:3px}
    .client-name strong{color:#24384f;font-size:10.5px}
    .client-name small{color:#8a95a3;font-size:8.5px}
    .client-status{display:inline-flex;padding:5px 8px;border-radius:999px;background:#eef2f5;color:#687587;font-size:8px;font-weight:800}
    .client-status.active{background:#eaf8f2;color:#087b58}
    .client-actions{display:flex;justify-content:flex-end;gap:6px}
    .client-action{min-height:31px;padding:6px 9px;border:1px solid #dde4ec;border-radius:9px;background:#fff;color:#43556a;font:inherit;font-size:8px;font-weight:750;cursor:pointer}
    .client-action.warn{border-color:#f4d4aa;color:#aa5b00;background:#fffaf3}
    .client-empty{height:170px;text-align:center;color:#8591a0;font-size:10px}
    .clients-form-shell{position:fixed;inset:0;z-index:80;display:grid;grid-template-columns:1fr min(520px,94vw)}
    .clients-form-shell[hidden]{display:none}
    .clients-form-overlay{border:0;background:rgba(18,34,51,.45);backdrop-filter:blur(2px)}
    .clients-drawer{display:flex;flex-direction:column;background:#f7f9fb;box-shadow:-22px 0 55px rgba(14,31,52,.18)}
    .clients-drawer-head{display:flex;align-items:center;justify-content:space-between;padding:18px 20px;border-bottom:1px solid #e2e8ef;background:#fff}
    .clients-drawer-head small{display:block;color:#929dab;font-size:8px;font-weight:800;letter-spacing:.07em;text-transform:uppercase}
    .clients-drawer-head h3{margin:4px 0 0;font-size:18px;letter-spacing:-.04em}
    .clients-close{width:34px;height:34px;border:1px solid #dde4ec;border-radius:10px;background:#fff;color:#43556a;font-size:19px;cursor:pointer}
    .clients-form{display:grid;grid-template-columns:1fr 1fr;gap:13px;padding:19px;overflow:auto}
    .clients-form label{display:grid;gap:6px;color:#405168;font-size:9px;font-weight:700}
    .clients-form label.full{grid-column:1/-1}
    .clients-form input,.clients-form select,.clients-form textarea{width:100%;margin:0!important}
    .clients-form input,.clients-form select{height:41px}
    .clients-form textarea{min-height:86px;padding:10px;resize:vertical}
    .clients-form-error{grid-column:1/-1;margin:0;padding:10px 11px;border-radius:10px;background:#fff1f1;color:#a53d45;font-size:9px}
    .clients-form-actions{grid-column:1/-1;display:flex;justify-content:flex-end;gap:8px;padding-top:4px}
    @media(max-width:900px){.clients-kpis{grid-template-columns:1fr}.clients-toolbar{grid-template-columns:1fr}.clients-heading{align-items:flex-start;flex-direction:column}}
    @media(max-width:740px){.clients-form{grid-template-columns:1fr}.clients-form label.full{grid-column:auto}.clients-form-shell{grid-template-columns:1fr}.clients-form-overlay{display:none}.clients-form-actions{flex-direction:column-reverse}.clients-form-actions button{width:100%}}
  `;
  document.head.appendChild(style);

  view.innerHTML = `
    <div class="clients-page">
      <div class="clients-heading"><div><h2>Clients</h2><p>Centralisez les informations commerciales avant la facturation.</p></div><button class="primary" id="client-add" type="button">Ajouter un client</button></div>
      <div class="clients-kpis"><article class="clients-kpi"><span>Clients actifs</span><strong id="clients-active">—</strong></article><article class="clients-kpi"><span>Total clients</span><strong id="clients-total">—</strong></article><article class="clients-kpi"><span>Délai moyen</span><strong id="clients-delay">—</strong></article></div>
      <section class="clients-panel"><div class="clients-toolbar"><input id="clients-search" type="search" placeholder="Rechercher une société, NINEA ou contact"/><select id="clients-filter"><option value="all">Tous les clients</option><option value="active">Actifs</option><option value="inactive">Inactifs</option></select><button class="secondary" id="clients-refresh" type="button">Actualiser</button></div><div class="clients-table-wrap"><table class="clients-table"><thead><tr><th>Client</th><th>NINEA</th><th>Contact</th><th>Ville</th><th>Paiement</th><th>Statut</th><th></th></tr></thead><tbody id="clients-body"><tr><td colspan="7" class="client-empty">Chargement des clients…</td></tr></tbody></table></div></section>
    </div>
    <section class="clients-form-shell" id="clients-form-shell" hidden><button class="clients-form-overlay" type="button" data-close-client aria-label="Fermer"></button><aside class="clients-drawer"><header class="clients-drawer-head"><div><small>Fiche client</small><h3 id="client-form-title">Nouveau client</h3></div><button class="clients-close" type="button" data-close-client>×</button></header><form class="clients-form" id="client-form"><label class="full">Raison sociale<input id="client-company" required autocomplete="organization"/></label><label>NINEA<input id="client-ninea"/></label><label>RCCM<input id="client-rccm"/></label><label>Nom du contact<input id="client-contact" autocomplete="name"/></label><label>Téléphone<input id="client-phone" autocomplete="tel"/></label><label>Email<input id="client-email" type="email" autocomplete="email"/></label><label>Ville<input id="client-city"/></label><label>Conditions de paiement<select id="client-payment"><option value="0">Comptant</option><option value="15">15 jours</option><option value="30" selected>30 jours</option><option value="45">45 jours</option><option value="60">60 jours</option><option value="90">90 jours</option></select></label><label class="full">Adresse<input id="client-address" autocomplete="street-address"/></label><label class="full">Notes<textarea id="client-notes" placeholder="Informations utiles, modalités particulières…"></textarea></label><p class="clients-form-error" id="client-error" hidden></p><div class="clients-form-actions"><button class="secondary" type="button" data-close-client>Annuler</button><button class="primary" id="client-save" type="submit">Enregistrer</button></div></form></aside></section>`;

  const body = document.getElementById('clients-body');
  const shell = document.getElementById('clients-form-shell');
  const form = document.getElementById('client-form');
  const search = document.getElementById('clients-search');
  const filter = document.getElementById('clients-filter');
  const errorBox = document.getElementById('client-error');

  function showError(message) {
    errorBox.textContent = message;
    errorBox.hidden = !message;
  }

  function filteredClients() {
    const query = search.value.trim().toLowerCase();
    return clients.filter((item) => {
      const activeMatch = currentFilter === 'all' || (currentFilter === 'active' ? item.is_active : !item.is_active);
      if (!activeMatch) return false;
      if (!query) return true;
      return [item.company_name,item.ninea,item.contact_name,item.phone,item.email,item.city].some((value) => String(value || '').toLowerCase().includes(query));
    });
  }

  function render() {
    const rows = filteredClients();
    body.innerHTML = rows.length ? rows.map((item) => `<tr><td><div class="client-name"><strong>${esc(item.company_name)}</strong><small>${esc(item.email || item.phone || 'Aucun contact numérique')}</small></div></td><td>${esc(item.ninea || '—')}</td><td>${esc(item.contact_name || item.phone || '—')}</td><td>${esc(item.city || '—')}</td><td>${Number(item.payment_terms_days) === 0 ? 'Comptant' : `${Number(item.payment_terms_days) || 30} jours`}</td><td><span class="client-status ${item.is_active ? 'active' : ''}">${item.is_active ? 'Actif' : 'Inactif'}</span></td><td><div class="client-actions"><button class="client-action" type="button" data-edit-client="${item.id}">Modifier</button><button class="client-action warn" type="button" data-toggle-client="${item.id}">${item.is_active ? 'Désactiver' : 'Activer'}</button></div></td></tr>`).join('') : '<tr><td colspan="7" class="client-empty">Aucun client correspondant.</td></tr>';
    const active = clients.filter((item) => item.is_active).length;
    const avg = clients.length ? Math.round(clients.reduce((sum,item) => sum + (Number(item.payment_terms_days)||0),0) / clients.length) : 0;
    document.getElementById('clients-active').textContent = active;
    document.getElementById('clients-total').textContent = clients.length;
    document.getElementById('clients-delay').textContent = `${avg} j`;
  }

  async function loadClients() {
    body.innerHTML = '<tr><td colspan="7" class="client-empty">Chargement des clients…</td></tr>';
    const { data, error } = await client.from('clients').select('*').order('company_name', { ascending:true });
    if (error) {
      console.error('Clients:', error);
      const missing = /relation .*clients.* does not exist|Could not find the table.*clients/i.test(error.message || '');
      body.innerHTML = `<tr><td colspan="7" class="client-empty">${missing ? 'Le module est prêt. La table Clients doit encore être créée dans Supabase Test.' : 'Impossible de charger les clients.'}</td></tr>`;
      document.getElementById('clients-active').textContent = '—';
      document.getElementById('clients-total').textContent = '—';
      document.getElementById('clients-delay').textContent = '—';
      return;
    }
    clients = data || [];
    render();
  }

  function openForm(item = null) {
    editingId = item?.id || null;
    document.getElementById('client-form-title').textContent = editingId ? 'Modifier le client' : 'Nouveau client';
    document.getElementById('client-company').value = item?.company_name || '';
    document.getElementById('client-ninea').value = item?.ninea || '';
    document.getElementById('client-rccm').value = item?.rccm || '';
    document.getElementById('client-contact').value = item?.contact_name || '';
    document.getElementById('client-phone').value = item?.phone || '';
    document.getElementById('client-email').value = item?.email || '';
    document.getElementById('client-city').value = item?.city || '';
    document.getElementById('client-payment').value = String(item?.payment_terms_days ?? 30);
    document.getElementById('client-address').value = item?.address || '';
    document.getElementById('client-notes').value = item?.notes || '';
    showError('');
    shell.hidden = false;
    document.body.style.overflow = 'hidden';
    setTimeout(() => document.getElementById('client-company').focus(),0);
  }

  function closeForm() {
    shell.hidden = true;
    document.body.style.overflow = '';
    editingId = null;
    form.reset();
    document.getElementById('client-payment').value = '30';
    showError('');
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const company = document.getElementById('client-company').value.trim();
    if (!company) return showError('La raison sociale est obligatoire.');
    const payload = {
      company_name: company,
      ninea: document.getElementById('client-ninea').value.trim() || null,
      rccm: document.getElementById('client-rccm').value.trim() || null,
      contact_name: document.getElementById('client-contact').value.trim() || null,
      phone: document.getElementById('client-phone').value.trim() || null,
      email: document.getElementById('client-email').value.trim() || null,
      city: document.getElementById('client-city').value.trim() || null,
      payment_terms_days: Number(document.getElementById('client-payment').value) || 0,
      address: document.getElementById('client-address').value.trim() || null,
      notes: document.getElementById('client-notes').value.trim() || null
    };
    document.getElementById('client-save').disabled = true;
    const query = editingId ? client.from('clients').update(payload).eq('id', editingId) : client.from('clients').insert(payload);
    const { error } = await query;
    document.getElementById('client-save').disabled = false;
    if (error) return showError(error.message || 'Enregistrement impossible.');
    closeForm();
    await loadClients();
  });

  view.addEventListener('click', async (event) => {
    const edit = event.target.closest('[data-edit-client]');
    if (edit) return openForm(clients.find((item) => String(item.id) === edit.dataset.editClient));
    const toggle = event.target.closest('[data-toggle-client]');
    if (toggle) {
      const item = clients.find((entry) => String(entry.id) === toggle.dataset.toggleClient);
      if (!item) return;
      toggle.disabled = true;
      const { error } = await client.from('clients').update({ is_active: !item.is_active }).eq('id', item.id);
      toggle.disabled = false;
      if (error) return alert(error.message || 'Modification impossible.');
      await loadClients();
    }
  });

  document.getElementById('client-add').addEventListener('click', () => openForm());
  document.getElementById('clients-refresh').addEventListener('click', loadClients);
  search.addEventListener('input', render);
  filter.addEventListener('change', () => { currentFilter = filter.value; render(); });
  shell.addEventListener('click', (event) => { if (event.target.closest('[data-close-client]')) closeForm(); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !shell.hidden) closeForm(); });

  loadClients();
})();