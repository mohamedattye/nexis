(() => {
  'use strict';
  if (window.__NEXIS_INVOICES_MODULE__) return;
  window.__NEXIS_INVOICES_MODULE__ = true;
  if (!window.supabase?.createClient) return;

  const view = document.getElementById('invoices');
  if (!view) return;

  const db = window.supabase.createClient();
  const fmt = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
  const VAT = 18;
  let invoices = [], clients = [], trips = [], invoiceTrips = [];
  let selectedClient = '', selectedTrips = new Set();

  const money = v => `${fmt.format(Number(v) || 0)} FCFA`;
  const esc = v => String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const dateFR = v => {
    if (!v) return '—';
    const [y,m,d] = String(v).split('-');
    return y && m && d ? `${d}/${m}/${y}` : v;
  };
  const clientById = id => clients.find(c => String(c.id) === String(id));
  const today = () => new Date().toISOString().slice(0,10);
  const addDays = (iso, days) => {
    const d = new Date(`${iso}T12:00:00`);
    d.setDate(d.getDate() + Number(days || 0));
    return d.toISOString().slice(0,10);
  };
  const statusLabel = s => ({draft:'Brouillon',issued:'Émise',paid:'Payée',overdue:'En retard',cancelled:'Annulée'})[s] || s;

  const style = document.createElement('style');
  style.textContent = `
    #invoices{max-width:none}.invoice-page{display:grid;gap:14px}.invoice-head{display:flex;justify-content:space-between;align-items:flex-end;gap:14px}.invoice-head h2{margin:0;font-size:23px;letter-spacing:-.045em}.invoice-head p{margin:5px 0 0;color:#7d8999;font-size:10px}
    .invoice-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.invoice-kpi{padding:16px 17px;border:1px solid #dfe5ed;border-radius:17px;background:#fff;box-shadow:0 12px 34px rgba(31,48,73,.07)}.invoice-kpi span{display:block;color:#7c899a;font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:.05em}.invoice-kpi strong{display:block;margin-top:6px;color:#1b2d43;font-family:var(--font-display);font-size:19px;letter-spacing:-.04em}.invoice-kpi.green strong{color:#07845d}.invoice-kpi.orange strong{color:#c96c00}
    .invoice-panel{padding:18px;border:1px solid #dfe5ed;border-radius:17px;background:#fff;box-shadow:0 12px 34px rgba(31,48,73,.07)}.invoice-toolbar{display:grid;grid-template-columns:minmax(260px,1fr) 180px auto;gap:9px;padding:9px;border:1px solid #e4e9ef;border-radius:14px;background:#f7f9fb}.invoice-toolbar input,.invoice-toolbar select{height:40px;margin:0!important}.invoice-table-wrap{margin-top:12px;overflow:auto;border:1px solid #e5eaf0;border-radius:13px}.invoice-table{width:100%;min-width:950px;border-collapse:collapse}.invoice-table th{text-align:left}.invoice-table td{vertical-align:middle}.invoice-number{font-weight:800;color:#274c73}.invoice-status{display:inline-flex;padding:5px 8px;border-radius:999px;background:#eef2f5;color:#687587;font-size:8px;font-weight:800}.invoice-status.issued{background:#fff4e4;color:#a95a00}.invoice-status.paid{background:#eaf8f2;color:#087b58}.invoice-status.overdue{background:#fff0f0;color:#ae3b43}.invoice-actions{display:flex;justify-content:flex-end;gap:6px;flex-wrap:wrap}.invoice-action{min-height:31px;padding:6px 9px;border:1px solid #dde4ec;border-radius:9px;background:#fff;color:#43556a;font:inherit;font-size:8px;font-weight:750;cursor:pointer}.invoice-empty{height:150px;text-align:center;color:#8591a0;font-size:10px}
    .invoice-shell{position:fixed;inset:0;z-index:90;display:grid;grid-template-columns:1fr min(620px,95vw)}.invoice-shell[hidden]{display:none}.invoice-overlay{border:0;background:rgba(18,34,51,.45);backdrop-filter:blur(2px)}.invoice-drawer{display:flex;flex-direction:column;background:#f7f9fb;box-shadow:-22px 0 55px rgba(14,31,52,.18)}.invoice-drawer-head{display:flex;align-items:center;justify-content:space-between;padding:18px 20px;border-bottom:1px solid #e2e8ef;background:#fff}.invoice-drawer-head small{display:block;color:#929dab;font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:.07em}.invoice-drawer-head h3{margin:4px 0 0;font-size:18px;letter-spacing:-.04em}.invoice-close{width:34px;height:34px;border:1px solid #dde4ec;border-radius:10px;background:#fff;font-size:19px;cursor:pointer}.invoice-form{display:grid;gap:13px;padding:19px;overflow:auto}.invoice-form label{display:grid;gap:6px;color:#405168;font-size:9px;font-weight:700}.invoice-form select,.invoice-form input,.invoice-form textarea{width:100%;margin:0!important}.invoice-form select,.invoice-form input{height:41px}.invoice-form textarea{min-height:70px;padding:10px}.invoice-trip-list{display:grid;gap:7px}.invoice-trip-option{display:grid;grid-template-columns:26px 1fr auto;align-items:center;gap:9px;padding:10px;border:1px solid #e2e8ef;border-radius:11px;background:#fff;cursor:pointer}.invoice-trip-option input{width:16px;height:16px}.invoice-trip-option strong{display:block;color:#26394f;font-size:9px}.invoice-trip-option small{display:block;margin-top:3px;color:#8a95a3;font-size:8px}.invoice-trip-option b{font-size:9px;color:#26394f}.invoice-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.invoice-summary div{padding:10px;border:1px solid #e4e9ef;border-radius:11px;background:#fff}.invoice-summary span{display:block;color:#8a95a3;font-size:7.5px;text-transform:uppercase;font-weight:800}.invoice-summary strong{display:block;margin-top:5px;font-size:11px;color:#24384f}.invoice-form-error{margin:0;padding:10px;border-radius:10px;background:#fff1f1;color:#a53d45;font-size:9px}.invoice-form-actions{display:flex;justify-content:flex-end;gap:8px}
    @media(max-width:1000px){.invoice-kpis{grid-template-columns:repeat(2,1fr)}}@media(max-width:740px){.invoice-kpis{grid-template-columns:1fr}.invoice-toolbar{grid-template-columns:1fr}.invoice-shell{grid-template-columns:1fr}.invoice-overlay{display:none}.invoice-summary{grid-template-columns:1fr}.invoice-head{align-items:flex-start;flex-direction:column}}
  `;
  document.head.appendChild(style);

  view.innerHTML = `
    <div class="invoice-page">
      <div class="invoice-head"><div><h2>Facturation</h2><p>Transformez les missions réalisées en factures clients.</p></div><button class="primary" id="invoice-add" type="button">Créer une facture</button></div>
      <div class="invoice-kpis"><article class="invoice-kpi"><span>Factures</span><strong id="inv-count">—</strong></article><article class="invoice-kpi"><span>À encaisser</span><strong id="inv-due">—</strong></article><article class="invoice-kpi green"><span>Encaissé</span><strong id="inv-paid">—</strong></article><article class="invoice-kpi orange"><span>En retard</span><strong id="inv-overdue">—</strong></article></div>
      <section class="invoice-panel"><div class="invoice-toolbar"><input id="invoice-search" type="search" placeholder="Rechercher une facture ou un client"/><select id="invoice-filter"><option value="all">Tous les statuts</option><option value="draft">Brouillons</option><option value="issued">Émises</option><option value="paid">Payées</option><option value="overdue">En retard</option><option value="cancelled">Annulées</option></select><button class="secondary" id="invoice-refresh" type="button">Actualiser</button></div><div class="invoice-table-wrap"><table class="invoice-table"><thead><tr><th>Facture</th><th>Client</th><th>Émission</th><th>Échéance</th><th>Statut</th><th>HT</th><th>TTC</th><th></th></tr></thead><tbody id="invoice-body"><tr><td colspan="8" class="invoice-empty">Chargement…</td></tr></tbody></table></div></section>
    </div>
    <section class="invoice-shell" id="invoice-shell" hidden><button class="invoice-overlay" type="button" data-close-invoice></button><aside class="invoice-drawer"><header class="invoice-drawer-head"><div><small>Nouvelle facture</small><h3>Créer une facture</h3></div><button class="invoice-close" type="button" data-close-invoice>×</button></header><form class="invoice-form" id="invoice-form"><label>Client<select id="invoice-client" required><option value="">Sélectionner un client</option></select></label><label>Date d'émission<input id="invoice-date" type="date" required/></label><label>Échéance<input id="invoice-due-date" type="date" required/></label><div><div style="font-size:9px;font-weight:700;color:#405168;margin-bottom:7px">Missions à facturer</div><div class="invoice-trip-list" id="invoice-trip-list"></div></div><div class="invoice-summary"><div><span>Total HT</span><strong id="invoice-ht">0 FCFA</strong></div><div><span>TVA 18%</span><strong id="invoice-vat">0 FCFA</strong></div><div><span>Total TTC</span><strong id="invoice-ttc">0 FCFA</strong></div></div><label>Notes<textarea id="invoice-notes" placeholder="Référence client, bon de commande, observations…"></textarea></label><p class="invoice-form-error" id="invoice-error" hidden></p><div class="invoice-form-actions"><button class="secondary" type="button" data-close-invoice>Annuler</button><button class="primary" id="invoice-save" type="submit">Créer le brouillon</button></div></form></aside></section>`;

  const body = document.getElementById('invoice-body');
  const shell = document.getElementById('invoice-shell');
  const search = document.getElementById('invoice-search');
  const filter = document.getElementById('invoice-filter');
  const form = document.getElementById('invoice-form');
  const clientSelect = document.getElementById('invoice-client');
  const dateInput = document.getElementById('invoice-date');
  const dueInput = document.getElementById('invoice-due-date');
  const tripList = document.getElementById('invoice-trip-list');
  const errorBox = document.getElementById('invoice-error');

  function totals() {
    const selected = trips.filter(t => selectedTrips.has(String(t.id)));
    const ht = selected.reduce((s,t) => s + (Number(t.revenue)||0), 0);
    const vat = Math.round(ht * VAT / 100);
    return { ht, vat, ttc: ht + vat };
  }

  function updateSummary() {
    const t = totals();
    document.getElementById('invoice-ht').textContent = money(t.ht);
    document.getElementById('invoice-vat').textContent = money(t.vat);
    document.getElementById('invoice-ttc').textContent = money(t.ttc);
  }

  function availableTrips() {
    const used = new Set(invoiceTrips.map(x => String(x.trip_id)));
    return trips.filter(t => String(t.client_id || '') === String(selectedClient) && !used.has(String(t.id)));
  }

  function renderTrips() {
    const rows = availableTrips();
    tripList.innerHTML = rows.length ? rows.map(t => `<label class="invoice-trip-option"><input type="checkbox" data-invoice-trip="${esc(t.id)}" ${selectedTrips.has(String(t.id))?'checked':''}/><div><strong>${dateFR(t.date)} · ${esc(t.truck || '—')} · ${esc(t.loadingZone || '—')} → ${esc(t.unloadingZone || '—')}</strong><small>Mission non facturée</small></div><b>${money(t.revenue)}</b></label>`).join('') : '<div class="invoice-empty" style="height:90px;display:grid;place-content:center">Aucune mission non facturée pour ce client.</div>';
    updateSummary();
  }

  function renderInvoices() {
    const q = search.value.trim().toLowerCase();
    const rows = invoices.filter(inv => {
      const clientName = clientById(inv.client_id)?.company_name || '';
      const matchStatus = filter.value === 'all' || inv.status === filter.value;
      const matchSearch = !q || String(inv.invoice_number||'').toLowerCase().includes(q) || clientName.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
    body.innerHTML = rows.length ? rows.map(inv => {
      const c = clientById(inv.client_id);
      const overdue = inv.status === 'issued' && inv.due_date && inv.due_date < today();
      const effective = overdue ? 'overdue' : inv.status;
      return `<tr><td><span class="invoice-number">${esc(inv.invoice_number || 'Brouillon')}</span></td><td>${esc(c?.company_name || '—')}</td><td>${dateFR(inv.issue_date)}</td><td>${dateFR(inv.due_date)}</td><td><span class="invoice-status ${effective}">${statusLabel(effective)}</span></td><td>${money(inv.subtotal_ht)}</td><td><strong>${money(inv.total_ttc)}</strong></td><td><div class="invoice-actions">${inv.status==='draft'?`<button class="invoice-action" data-set-status="issued" data-invoice-id="${inv.id}">Émettre</button>`:''}${effective==='issued'||effective==='overdue'?`<button class="invoice-action" data-set-status="paid" data-invoice-id="${inv.id}">Marquer payée</button>`:''}</div></td></tr>`;
    }).join('') : '<tr><td colspan="8" class="invoice-empty">Aucune facture correspondante.</td></tr>';

    const due = invoices.filter(i => ['issued','overdue'].includes(i.status) || (i.status==='issued' && i.due_date < today())).reduce((s,i)=>s+(Number(i.total_ttc)||0),0);
    const paid = invoices.filter(i=>i.status==='paid').reduce((s,i)=>s+(Number(i.total_ttc)||0),0);
    const overdueTotal = invoices.filter(i=>i.status==='overdue' || (i.status==='issued' && i.due_date && i.due_date<today())).reduce((s,i)=>s+(Number(i.total_ttc)||0),0);
    document.getElementById('inv-count').textContent = invoices.length;
    document.getElementById('inv-due').textContent = money(due);
    document.getElementById('inv-paid').textContent = money(paid);
    document.getElementById('inv-overdue').textContent = money(overdueTotal);
  }

  async function loadAll() {
    body.innerHTML = '<tr><td colspan="8" class="invoice-empty">Chargement…</td></tr>';
    const [a,b,c,d] = await Promise.all([
      db.from('invoices').select('*').order('issue_date',{ascending:false}),
      db.from('clients').select('*').order('company_name',{ascending:true}),
      db.from('trips').select('*').order('date',{ascending:false}),
      db.from('invoice_trips').select('*')
    ]);
    if (a.error || b.error || c.error || d.error) {
      console.error('Facturation:', a.error||b.error||c.error||d.error);
      body.innerHTML = '<tr><td colspan="8" class="invoice-empty">Impossible de charger la facturation.</td></tr>';
      return;
    }
    invoices=a.data||[]; clients=b.data||[]; trips=c.data||[]; invoiceTrips=d.data||[];
    clientSelect.innerHTML = '<option value="">Sélectionner un client</option>' + clients.filter(c=>c.is_active).map(c=>`<option value="${esc(c.id)}">${esc(c.company_name)}</option>`).join('');
    renderInvoices();
  }

  function openForm() {
    selectedClient=''; selectedTrips.clear(); form.reset();
    dateInput.value=today(); dueInput.value=today(); clientSelect.value='';
    tripList.innerHTML='<div class="invoice-empty" style="height:90px;display:grid;place-content:center">Sélectionnez d’abord un client.</div>';
    updateSummary(); errorBox.hidden=true; shell.hidden=false; document.body.style.overflow='hidden';
  }
  function closeForm(){shell.hidden=true;document.body.style.overflow='';}

  clientSelect.addEventListener('change',()=>{
    selectedClient=clientSelect.value; selectedTrips.clear();
    const c=clientById(selectedClient); dueInput.value=addDays(dateInput.value||today(),c?.payment_terms_days||0); renderTrips();
  });
  dateInput.addEventListener('change',()=>{const c=clientById(clientSelect.value); dueInput.value=addDays(dateInput.value||today(),c?.payment_terms_days||0);});
  tripList.addEventListener('change',e=>{const cb=e.target.closest('[data-invoice-trip]');if(!cb)return;cb.checked?selectedTrips.add(String(cb.dataset.invoiceTrip)):selectedTrips.delete(String(cb.dataset.invoiceTrip));updateSummary();});

  form.addEventListener('submit', async e=>{
    e.preventDefault(); errorBox.hidden=true;
    if(!clientSelect.value){errorBox.textContent='Sélectionnez un client.';errorBox.hidden=false;return;}
    if(!selectedTrips.size){errorBox.textContent='Sélectionnez au moins une mission.';errorBox.hidden=false;return;}
    const t=totals(); const save=document.getElementById('invoice-save'); save.disabled=true;
    const payload={client_id:clientSelect.value,issue_date:dateInput.value,due_date:dueInput.value,status:'draft',subtotal_ht:t.ht,vat_rate:VAT,vat_amount:t.vat,total_ttc:t.ttc,notes:document.getElementById('invoice-notes').value.trim()||null};
    const {data:inv,error}=await db.from('invoices').insert(payload).select().single();
    if(error){save.disabled=false;errorBox.textContent=error.message||'Création impossible.';errorBox.hidden=false;return;}
    const links=[...selectedTrips].map(trip_id=>({invoice_id:inv.id,trip_id}));
    const linkResult=await db.from('invoice_trips').insert(links);
    if(linkResult.error){await db.from('invoices').delete().eq('id',inv.id);save.disabled=false;errorBox.textContent='Impossible de rattacher les missions à la facture.';errorBox.hidden=false;return;}
    save.disabled=false; closeForm(); await loadAll();
  });

  view.addEventListener('click',async e=>{
    const statusBtn=e.target.closest('[data-set-status]');
    if(statusBtn){statusBtn.disabled=true;const status=statusBtn.dataset.setStatus;const {error}=await db.from('invoices').update({status}).eq('id',statusBtn.dataset.invoiceId);statusBtn.disabled=false;if(!error)await loadAll();return;}
  });
  document.getElementById('invoice-add').addEventListener('click',openForm);
  document.querySelectorAll('[data-close-invoice]').forEach(b=>b.addEventListener('click',closeForm));
  document.getElementById('invoice-refresh').addEventListener('click',loadAll);
  search.addEventListener('input',renderInvoices); filter.addEventListener('change',renderInvoices);
  loadAll();
})();