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
  const PRICE_NOTE_TAG = '[[NEXIS_PRICE_NOTE:';
  let invoices = [], clients = [], trips = [], invoiceTrips = [];
  let selectedClient = '', selectedTrips = new Set();
  let formMode = 'invoice';
  let editingNoteId = null;
  let currentNote = null;

  const money = v => `${fmt.format(Number(v) || 0)} FCFA`;
  const esc = v => String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const today = () => new Date().toISOString().slice(0,10);
  const dateFR = v => {
    if (!v) return '—';
    const [y,m,d] = String(v).split('-');
    return y && m && d ? `${d}/${m}/${y}` : String(v);
  };
  const addDays = (iso, days) => {
    const d = new Date(`${iso || today()}T12:00:00`);
    d.setDate(d.getDate() + Number(days || 0));
    return d.toISOString().slice(0,10);
  };
  const clientById = id => clients.find(c => String(c.id) === String(id));
  const statusLabel = s => ({draft:'Brouillon',issued:'Émise',paid:'Payée',overdue:'En retard',cancelled:'Annulée'})[s] || s || '—';

  function priceNoteNumber(inv) {
    const match = String(inv?.notes || '').match(/\[\[NEXIS_PRICE_NOTE:([^\]]+)\]\]/);
    return match?.[1] || '';
  }
  function isPriceNote(inv) { return Boolean(priceNoteNumber(inv)); }
  function cleanNotes(inv) {
    return String(inv?.notes || '').replace(/\[\[NEXIS_PRICE_NOTE:[^\]]+\]\]\s*/,'').trim();
  }
  function taggedNotes(number, text) {
    return `${PRICE_NOTE_TAG}${number}]]${text ? `\n${text}` : ''}`;
  }
  function invoiceRows() { return invoices.filter(inv => !isPriceNote(inv)); }
  function noteRows() { return invoices.filter(isPriceNote); }
  function effectiveStatus(inv) {
    return inv.status === 'issued' && inv.due_date && inv.due_date < today() ? 'overdue' : inv.status;
  }
  function tripsForInvoice(invoiceId) {
    const ids = new Set(invoiceTrips.filter(x => String(x.invoice_id) === String(invoiceId)).map(x => String(x.trip_id)));
    return trips.filter(t => ids.has(String(t.id)));
  }
  function totalsForTripIds(ids) {
    const set = new Set([...ids].map(String));
    const ht = trips.filter(t => set.has(String(t.id))).reduce((s,t)=>s+(Number(t.revenue)||0),0);
    const vat = Math.round(ht * VAT / 100);
    return {ht, vat, ttc: ht + vat};
  }
  function nextPriceNoteNumber() {
    const year = new Date().getFullYear();
    const nums = noteRows().map(priceNoteNumber)
      .map(n => {
        const m = n.match(new RegExp(`^NP-${year}-(\\d+)$`));
        return m ? Number(m[1]) : 0;
      });
    const next = Math.max(0, ...nums) + 1;
    return `NP-${year}-${String(next).padStart(5,'0')}`;
  }

  const style = document.createElement('style');
  style.textContent = `
    #invoices{max-width:none}.invoice-page{display:grid;gap:14px}
    .invoice-head{display:flex;justify-content:space-between;align-items:flex-end;gap:14px}
    .invoice-head h2{margin:0;font-size:23px;letter-spacing:-.045em}.invoice-head p{margin:5px 0 0;color:#7d8999;font-size:10px}
    .billing-head-actions{display:flex;gap:8px;flex-wrap:wrap}.billing-head-actions .secondary{background:#fff}
    .invoice-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
    .invoice-kpi{padding:16px 17px;border:1px solid #dfe5ed;border-radius:17px;background:#fff;box-shadow:0 12px 34px rgba(31,48,73,.07)}
    .invoice-kpi span{display:block;color:#7c899a;font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:.05em}
    .invoice-kpi strong{display:block;margin-top:6px;color:#1b2d43;font-family:var(--font-display);font-size:19px;letter-spacing:-.04em}
    .invoice-kpi.green strong{color:#07845d}.invoice-kpi.orange strong{color:#c96c00}
    .invoice-panel{padding:18px;border:1px solid #dfe5ed;border-radius:17px;background:#fff;box-shadow:0 12px 34px rgba(31,48,73,.07)}
    .billing-tabs{display:flex;gap:7px;margin-bottom:12px}.billing-tab{padding:8px 12px;border:1px solid #dde4ec;border-radius:10px;background:#fff;color:#56677b;font:750 9px var(--font-ui);cursor:pointer}
    .billing-tab.active{background:#10243b;color:#fff;border-color:#10243b}
    .invoice-toolbar{display:grid;grid-template-columns:minmax(260px,1fr) 180px auto;gap:9px;padding:9px;border:1px solid #e4e9ef;border-radius:14px;background:#f7f9fb}
    .invoice-toolbar input,.invoice-toolbar select{height:40px;margin:0!important}
    .invoice-table-wrap{margin-top:12px;overflow:auto;border:1px solid #e5eaf0;border-radius:13px}.invoice-table{width:100%;min-width:1040px;border-collapse:collapse}
    .invoice-table th{text-align:left}.invoice-table td{vertical-align:middle}.invoice-number,.price-note-number{font-weight:800;color:#274c73}
    .price-note-number{color:#9b5a00}.invoice-status{display:inline-flex;padding:5px 8px;border-radius:999px;background:#eef2f5;color:#687587;font-size:8px;font-weight:800}
    .invoice-status.issued{background:#fff4e4;color:#a95a00}.invoice-status.paid{background:#eaf8f2;color:#087b58}.invoice-status.overdue{background:#fff0f0;color:#ae3b43}.invoice-status.cancelled{background:#f0f1f3;color:#788391}
    .invoice-actions{display:flex;justify-content:flex-end;gap:5px;flex-wrap:wrap}.invoice-action{min-height:30px;padding:6px 8px;border:1px solid #dde4ec;border-radius:8px;background:#fff;color:#43556a;font:inherit;font-size:8px;font-weight:750;cursor:pointer}
    .invoice-action.danger{color:#a43b43;border-color:#f0c8cc;background:#fff8f8}.invoice-action.orange{color:#a85a00;border-color:#efc68f;background:#fff9f1}
    .invoice-empty{height:140px;text-align:center;color:#8591a0;font-size:10px}
    .invoice-shell{position:fixed;inset:0;z-index:100;display:grid;grid-template-columns:1fr min(640px,96vw)}.invoice-shell[hidden]{display:none}
    .invoice-overlay{border:0;background:rgba(18,34,51,.45);backdrop-filter:blur(2px)}.invoice-drawer{display:flex;flex-direction:column;background:#f7f9fb;box-shadow:-22px 0 55px rgba(14,31,52,.18)}
    .invoice-drawer-head{display:flex;align-items:center;justify-content:space-between;padding:18px 20px;border-bottom:1px solid #e2e8ef;background:#fff}
    .invoice-drawer-head small{display:block;color:#929dab;font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:.07em}.invoice-drawer-head h3{margin:4px 0 0;font-size:18px;letter-spacing:-.04em}
    .invoice-close{width:34px;height:34px;border:1px solid #dde4ec;border-radius:10px;background:#fff;font-size:19px;cursor:pointer}
    .invoice-form{display:grid;gap:13px;padding:19px;overflow:auto}.invoice-form label{display:grid;gap:6px;color:#405168;font-size:9px;font-weight:700}
    .invoice-form select,.invoice-form input,.invoice-form textarea{width:100%;margin:0!important}.invoice-form select,.invoice-form input{height:41px}.invoice-form textarea{min-height:70px;padding:10px}
    .invoice-trip-list{display:grid;gap:7px}.invoice-trip-option{display:grid;grid-template-columns:26px 1fr auto;align-items:center;gap:9px;padding:10px;border:1px solid #e2e8ef;border-radius:11px;background:#fff;cursor:pointer}
    .invoice-trip-option input{width:16px;height:16px}.invoice-trip-option strong{display:block;color:#26394f;font-size:9px}.invoice-trip-option small{display:block;margin-top:3px;color:#8a95a3;font-size:8px}.invoice-trip-option b{font-size:9px;color:#26394f}
    .invoice-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.invoice-summary div{padding:10px;border:1px solid #e4e9ef;border-radius:11px;background:#fff}
    .invoice-summary span{display:block;color:#8a95a3;font-size:7.5px;text-transform:uppercase;font-weight:800}.invoice-summary strong{display:block;margin-top:5px;font-size:11px;color:#24384f}
    .invoice-form-error{margin:0;padding:10px;border-radius:10px;background:#fff1f1;color:#a53d45;font-size:9px}.invoice-form-actions{display:flex;justify-content:flex-end;gap:8px}
    .note-detail{max-width:690px;margin:0 auto;padding:28px;border:1px solid #dfe5eb;border-radius:16px;background:#fff;box-shadow:0 12px 30px rgba(31,48,73,.07)}
    .note-detail-top{display:flex;justify-content:space-between;gap:20px;padding-bottom:20px;border-bottom:2px solid #10243b}.note-detail-top h2{margin:0;font-size:22px;color:#10243b}.note-detail-top h1{margin:0;color:#ff8500;font-size:23px;text-align:right}
    .note-detail-top strong{display:block;margin-top:5px;text-align:right;color:#41546a;font-size:10px}.note-client{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:18px 0}
    .note-box{padding:12px;border:1px solid #e5e9ee;border-radius:10px;background:#fafbfd}.note-box span{display:block;color:#8995a3;font-size:7px;font-weight:800;text-transform:uppercase}.note-box strong{display:block;margin-top:5px;color:#25394f;font-size:10px}
    .note-lines{width:100%;border-collapse:collapse}.note-lines th{padding:9px;background:#10243b;color:#fff;font-size:7.5px;text-align:left}.note-lines td{padding:10px 9px;border-bottom:1px solid #edf0f3;font-size:8.5px}.note-lines th:last-child,.note-lines td:last-child{text-align:right}
    .note-total{width:min(330px,100%);margin:16px 0 0 auto;border:1px solid #dfe5eb;border-radius:10px;overflow:hidden}.note-total div{display:flex;justify-content:space-between;padding:9px 11px;border-bottom:1px solid #edf0f3;font-size:9px}.note-total div:last-child{border:0;background:#10243b;color:#fff;font-weight:800}
    .note-user-notes{margin-top:15px;padding:11px;border-left:3px solid #ff8a00;background:#fff8ef;color:#5f6e80;font-size:8.5px}
    @media(max-width:1000px){.invoice-kpis{grid-template-columns:repeat(2,1fr)}}@media(max-width:740px){.invoice-kpis{grid-template-columns:1fr}.invoice-toolbar{grid-template-columns:1fr}.invoice-shell{grid-template-columns:1fr}.invoice-overlay{display:none}.invoice-summary,.note-client{grid-template-columns:1fr}.invoice-head{align-items:flex-start;flex-direction:column}}
    @media print{body *{visibility:hidden!important}#billing-note-print,#billing-note-print *{visibility:visible!important}#billing-note-print{position:absolute!important;inset:0!important;width:100%!important;max-width:none!important;margin:0!important;padding:15mm!important;border:0!important;box-shadow:none!important}.invoice-drawer-head,.invoice-overlay{display:none!important}.invoice-shell,.invoice-drawer,.invoice-form{position:static!important;display:block!important;background:#fff!important;overflow:visible!important;padding:0!important}}
  `;
  document.head.appendChild(style);

  view.innerHTML = `
    <div class="invoice-page">
      <div class="invoice-head">
        <div><h2>Facturation</h2><p>Factures clients et notes de prix, centralisées au même endroit.</p></div>
        <div class="billing-head-actions"><button class="secondary" id="price-note-add" type="button">Créer une note de prix</button><button class="primary" id="invoice-add" type="button">Créer une facture</button></div>
      </div>
      <div class="invoice-kpis"><article class="invoice-kpi"><span>Factures</span><strong id="inv-count">—</strong></article><article class="invoice-kpi"><span>À encaisser</span><strong id="inv-due">—</strong></article><article class="invoice-kpi green"><span>Encaissé</span><strong id="inv-paid">—</strong></article><article class="invoice-kpi orange"><span>En retard</span><strong id="inv-overdue">—</strong></article></div>
      <section class="invoice-panel">
        <div class="billing-tabs"><button class="billing-tab active" data-billing-tab="invoices" type="button">Factures</button><button class="billing-tab" data-billing-tab="notes" type="button">Notes de prix <span id="note-count"></span></button></div>
        <div class="invoice-toolbar"><input id="invoice-search" type="search" placeholder="Rechercher un document ou un client"/><select id="invoice-filter"><option value="all">Tous les statuts</option><option value="draft">Brouillons</option><option value="issued">Émises</option><option value="paid">Payées</option><option value="overdue">En retard</option><option value="cancelled">Annulées</option></select><button class="secondary" id="invoice-refresh" type="button">Actualiser</button></div>
        <div class="invoice-table-wrap"><table class="invoice-table"><thead id="billing-head"></thead><tbody id="invoice-body"><tr><td colspan="9" class="invoice-empty">Chargement…</td></tr></tbody></table></div>
      </section>
    </div>
    <section class="invoice-shell" id="invoice-shell" hidden>
      <button class="invoice-overlay" type="button" data-close-invoice></button>
      <aside class="invoice-drawer">
        <header class="invoice-drawer-head"><div><small id="invoice-form-kicker">Nouveau document</small><h3 id="invoice-form-title">Créer une facture</h3></div><button class="invoice-close" type="button" data-close-invoice>×</button></header>
        <form class="invoice-form" id="invoice-form">
          <label>Client<select id="invoice-client" required><option value="">Sélectionner un client</option></select></label>
          <label id="invoice-date-label">Date d'émission<input id="invoice-date" type="date" required/></label>
          <label id="invoice-due-label">Échéance<input id="invoice-due-date" type="date" required/></label>
          <div><div id="invoice-trips-label" style="font-size:9px;font-weight:700;color:#405168;margin-bottom:7px">Missions à facturer</div><div class="invoice-trip-list" id="invoice-trip-list"></div></div>
          <div class="invoice-summary"><div><span>Total HT</span><strong id="invoice-ht">0 FCFA</strong></div><div><span>TVA 18%</span><strong id="invoice-vat">0 FCFA</strong></div><div><span>Total TTC</span><strong id="invoice-ttc">0 FCFA</strong></div></div>
          <label>Notes<textarea id="invoice-notes" placeholder="Référence client, bon de commande, observations…"></textarea></label>
          <p class="invoice-form-error" id="invoice-error" hidden></p>
          <div class="invoice-form-actions"><button class="secondary" type="button" data-close-invoice>Annuler</button><button class="primary" id="invoice-save" type="submit">Créer le brouillon</button></div>
        </form>
      </aside>
    </section>`;

  const body = document.getElementById('invoice-body');
  const head = document.getElementById('billing-head');
  const shell = document.getElementById('invoice-shell');
  const form = document.getElementById('invoice-form');
  const search = document.getElementById('invoice-search');
  const filter = document.getElementById('invoice-filter');
  const clientSelect = document.getElementById('invoice-client');
  const dateInput = document.getElementById('invoice-date');
  const dueInput = document.getElementById('invoice-due-date');
  const tripList = document.getElementById('invoice-trip-list');
  const errorBox = document.getElementById('invoice-error');
  let activeTab = 'invoices';

  function updateSummary() {
    const t = totalsForTripIds(selectedTrips);
    document.getElementById('invoice-ht').textContent = money(t.ht);
    document.getElementById('invoice-vat').textContent = money(t.vat);
    document.getElementById('invoice-ttc').textContent = money(t.ttc);
  }

  function usedTripIdsExcludingNotes() {
    const normalInvoiceIds = new Set(invoiceRows().filter(i => i.status !== 'cancelled').map(i => String(i.id)));
    return new Set(invoiceTrips.filter(x => normalInvoiceIds.has(String(x.invoice_id))).map(x => String(x.trip_id)));
  }

  function availableTrips() {
    const used = usedTripIdsExcludingNotes();
    const currentLinked = editingNoteId ? new Set(tripsForInvoice(editingNoteId).map(t => String(t.id))) : new Set();
    return trips.filter(t =>
      String(t.client_id || '') === String(selectedClient) &&
      (!used.has(String(t.id)) || currentLinked.has(String(t.id)))
    );
  }

  function renderTrips() {
    if (!selectedClient) {
      tripList.innerHTML = '<div class="invoice-empty" style="height:90px;display:grid;place-content:center">Sélectionnez d’abord un client.</div>';
      updateSummary(); return;
    }
    const rows = availableTrips();
    tripList.innerHTML = rows.length ? rows.map(t => `<label class="invoice-trip-option"><input type="checkbox" data-invoice-trip="${esc(t.id)}" ${selectedTrips.has(String(t.id))?'checked':''}/><div><strong>${dateFR(t.date)} · ${esc(t.truck || '—')} · ${esc(t.loadingZone || '—')} → ${esc(t.unloadingZone || '—')}</strong><small>${formMode==='note'?'Prestation proposée':'Mission non facturée'}</small></div><b>${money(t.revenue)}</b></label>`).join('') : '<div class="invoice-empty" style="height:90px;display:grid;place-content:center">Aucune mission disponible pour ce client.</div>';
    updateSummary();
  }

  function updateKpis() {
    const rows = invoiceRows();
    const due = rows.filter(i => ['issued','overdue'].includes(effectiveStatus(i))).reduce((s,i)=>s+(Number(i.total_ttc)||0),0);
    const paid = rows.filter(i=>i.status==='paid').reduce((s,i)=>s+(Number(i.total_ttc)||0),0);
    const overdue = rows.filter(i=>effectiveStatus(i)==='overdue').reduce((s,i)=>s+(Number(i.total_ttc)||0),0);
    document.getElementById('inv-count').textContent = rows.length;
    document.getElementById('inv-due').textContent = money(due);
    document.getElementById('inv-paid').textContent = money(paid);
    document.getElementById('inv-overdue').textContent = money(overdue);
    document.getElementById('note-count').textContent = noteRows().length ? `(${noteRows().length})` : '';
  }

  function renderInvoices() {
    activeTab = 'invoices';
    filter.hidden = false;
    head.innerHTML = '<tr><th>Facture</th><th>Client</th><th>Émission</th><th>Échéance</th><th>Statut</th><th>HT</th><th>TTC</th><th></th></tr>';
    const q = search.value.trim().toLowerCase();
    const rows = invoiceRows().filter(inv => {
      const name = clientById(inv.client_id)?.company_name || '';
      const status = effectiveStatus(inv);
      return (filter.value==='all'||status===filter.value) && (!q || String(inv.invoice_number||'').toLowerCase().includes(q) || name.toLowerCase().includes(q));
    });
    body.innerHTML = rows.length ? rows.map(inv => {
      const c=clientById(inv.client_id), status=effectiveStatus(inv);
      const management = inv.status==='draft'
        ? `<button class="invoice-action" data-set-status="issued" data-invoice-id="${inv.id}">Émettre</button><button class="invoice-action danger" data-delete-invoice="${inv.id}">Supprimer</button>`
        : (status==='issued'||status==='overdue')
          ? `<button class="invoice-action" data-set-status="paid" data-invoice-id="${inv.id}">Marquer payée</button><button class="invoice-action danger" data-cancel-invoice="${inv.id}">Annuler</button>`
          : inv.status==='paid'
            ? `<button class="invoice-action danger" data-cancel-invoice="${inv.id}">Annuler</button>`
            : '';
      return `<tr data-invoice-id="${esc(inv.id)}"><td><span class="invoice-number">${esc(inv.invoice_number||'Brouillon')}</span></td><td>${esc(c?.company_name||'—')}</td><td>${dateFR(inv.issue_date)}</td><td>${dateFR(inv.due_date)}</td><td><span class="invoice-status ${status}">${statusLabel(status)}</span></td><td>${money(inv.subtotal_ht)}</td><td><strong>${money(inv.total_ttc)}</strong></td><td><div class="invoice-actions">${management}</div></td></tr>`;
    }).join('') : '<tr><td colspan="8" class="invoice-empty">Aucune facture correspondante.</td></tr>';
  }

  function renderNotes() {
    activeTab = 'notes';
    filter.hidden = true;
    head.innerHTML = '<tr><th>Note de prix</th><th>Client</th><th>Date</th><th>Validité</th><th>HT</th><th>TTC</th><th></th></tr>';
    const q = search.value.trim().toLowerCase();
    const rows = noteRows().filter(inv => {
      const name=clientById(inv.client_id)?.company_name||'', num=priceNoteNumber(inv);
      return !q || num.toLowerCase().includes(q) || name.toLowerCase().includes(q);
    });
    body.innerHTML = rows.length ? rows.map(inv => {
      const c=clientById(inv.client_id);
      return `<tr data-note-id="${esc(inv.id)}"><td><span class="price-note-number">${esc(priceNoteNumber(inv))}</span></td><td>${esc(c?.company_name||'—')}</td><td>${dateFR(inv.issue_date)}</td><td>${dateFR(inv.due_date)}</td><td>${money(inv.subtotal_ht)}</td><td><strong>${money(inv.total_ttc)}</strong></td><td><div class="invoice-actions"><button class="invoice-action" data-view-note="${inv.id}">Voir</button><button class="invoice-action" data-edit-note="${inv.id}">Modifier</button><button class="invoice-action orange" data-print-note="${inv.id}">Imprimer</button><button class="invoice-action" data-convert-note="${inv.id}">Convertir en facture</button><button class="invoice-action danger" data-delete-note="${inv.id}">Supprimer</button></div></td></tr>`;
    }).join('') : '<tr><td colspan="7" class="invoice-empty">Aucune note de prix correspondante.</td></tr>';
  }

  function renderActive() { updateKpis(); activeTab==='notes' ? renderNotes() : renderInvoices(); }

  async function loadAll() {
    body.innerHTML = '<tr><td colspan="9" class="invoice-empty">Chargement…</td></tr>';
    const [a,b,c,d] = await Promise.all([
      db.from('invoices').select('*').order('issue_date',{ascending:false}),
      db.from('clients').select('*').order('company_name',{ascending:true}),
      db.from('trips').select('*').order('date',{ascending:false}),
      db.from('invoice_trips').select('*')
    ]);
    if (a.error||b.error||c.error||d.error) {
      console.error('Facturation:',a.error||b.error||c.error||d.error);
      body.innerHTML='<tr><td colspan="9" class="invoice-empty">Impossible de charger la facturation.</td></tr>'; return;
    }
    invoices=a.data||[]; clients=b.data||[]; trips=c.data||[]; invoiceTrips=d.data||[];
    clientSelect.innerHTML='<option value="">Sélectionner un client</option>'+clients.filter(c=>c.is_active!==false).map(c=>`<option value="${esc(c.id)}">${esc(c.company_name)}</option>`).join('');
    renderActive();
  }

  function configureForm(mode, note=null) {
    formMode=mode; editingNoteId=note?.id||null; selectedTrips.clear(); form.reset(); errorBox.hidden=true;
    document.getElementById('invoice-form-kicker').textContent = mode==='note' ? (note?'Modification':'Proposition commerciale') : 'Nouvelle facture';
    document.getElementById('invoice-form-title').textContent = mode==='note' ? (note?`Modifier ${priceNoteNumber(note)}`:'Créer une note de prix') : 'Créer une facture';
    document.getElementById('invoice-date-label').firstChild.textContent = mode==='note' ? 'Date de la note' : "Date d'émission";
    document.getElementById('invoice-due-label').firstChild.textContent = mode==='note' ? 'Validité jusqu’au' : 'Échéance';
    document.getElementById('invoice-trips-label').textContent = mode==='note' ? 'Prestations proposées' : 'Missions à facturer';
    document.getElementById('invoice-save').textContent = note ? 'Enregistrer les modifications' : (mode==='note'?'Créer la note de prix':'Créer le brouillon');
    dateInput.value=note?.issue_date||today();
    dueInput.value=note?.due_date||addDays(dateInput.value, mode==='note'?30:0);
    clientSelect.value=note?.client_id||''; selectedClient=clientSelect.value;
    document.getElementById('invoice-notes').value=note?cleanNotes(note):'';
    if(note) tripsForInvoice(note.id).forEach(t=>selectedTrips.add(String(t.id)));
    renderTrips(); shell.hidden=false; document.body.style.overflow='hidden';
  }
  function closeForm(){shell.hidden=true;document.body.style.overflow='';editingNoteId=null;currentNote=null;}

  async function replaceLinks(invoiceId) {
    const del=await db.from('invoice_trips').delete().eq('invoice_id',invoiceId);
    if(del.error) throw del.error;
    if(selectedTrips.size){
      const ins=await db.from('invoice_trips').insert([...selectedTrips].map(trip_id=>({invoice_id:invoiceId,trip_id})));
      if(ins.error) throw ins.error;
    }
  }

  function noteDocument(note) {
    const customer=clientById(note.client_id)||{}, rows=tripsForInvoice(note.id);
    return `<article class="note-detail" id="billing-note-print"><div class="note-detail-top"><div><h2>NEXIS LOGISTICS</h2><small>Transport & logistique</small></div><div><h1>NOTE DE PRIX</h1><strong>${esc(priceNoteNumber(note))}</strong></div></div><div class="note-client"><div class="note-box"><span>Client</span><strong>${esc(customer.company_name||'—')}</strong></div><div class="note-box"><span>Validité</span><strong>Du ${dateFR(note.issue_date)} au ${dateFR(note.due_date)}</strong></div></div><table class="note-lines"><thead><tr><th>Date</th><th>Camion</th><th>Prestation</th><th>Montant HT</th></tr></thead><tbody>${rows.length?rows.map(t=>`<tr><td>${dateFR(t.date)}</td><td>${esc(t.truck||'—')}</td><td>${esc(t.loadingZone||'—')} → ${esc(t.unloadingZone||'—')}</td><td>${money(t.revenue)}</td></tr>`).join(''):'<tr><td colspan="4">Aucune prestation.</td></tr>'}</tbody></table><div class="note-total"><div><span>Total HT</span><strong>${money(note.subtotal_ht)}</strong></div><div><span>TVA (${Number(note.vat_rate)||0} %)</span><strong>${money(note.vat_amount)}</strong></div><div><span>Total TTC</span><strong>${money(note.total_ttc)}</strong></div></div>${cleanNotes(note)?`<div class="note-user-notes"><strong>Observations :</strong><br>${esc(cleanNotes(note))}</div>`:''}</article>`;
  }

  async function showNote(id, print=false) {
    await loadAll();
    currentNote=invoices.find(i=>String(i.id)===String(id));
    if(!currentNote||!isPriceNote(currentNote)) return;
    configureForm('note',currentNote);
    form.style.display='none';
    const holder=document.createElement('div'); holder.id='note-preview-holder'; holder.style.padding='19px'; holder.style.overflow='auto'; holder.innerHTML=noteDocument(currentNote);
    document.querySelector('.invoice-drawer').appendChild(holder);
    if(print) setTimeout(()=>window.print(),150);
  }
  function clearNotePreview(){
    document.getElementById('note-preview-holder')?.remove();
    form.style.display='';
  }

  clientSelect.addEventListener('change',()=>{
    selectedClient=clientSelect.value; selectedTrips.clear();
    const c=clientById(selectedClient);
    if(formMode==='invoice') dueInput.value=addDays(dateInput.value||today(),c?.payment_terms_days||0);
    renderTrips();
  });
  dateInput.addEventListener('change',()=>{
    if(formMode==='invoice'){const c=clientById(clientSelect.value);dueInput.value=addDays(dateInput.value||today(),c?.payment_terms_days||0);}
  });
  tripList.addEventListener('change',e=>{
    const cb=e.target.closest('[data-invoice-trip]'); if(!cb)return;
    cb.checked?selectedTrips.add(String(cb.dataset.invoiceTrip)):selectedTrips.delete(String(cb.dataset.invoiceTrip)); updateSummary();
  });

  form.addEventListener('submit',async e=>{
    e.preventDefault(); errorBox.hidden=true;
    if(!clientSelect.value){errorBox.textContent='Sélectionnez un client.';errorBox.hidden=false;return;}
    if(!selectedTrips.size){errorBox.textContent='Sélectionnez au moins une mission.';errorBox.hidden=false;return;}
    const t=totalsForTripIds(selectedTrips), save=document.getElementById('invoice-save'); save.disabled=true;
    try{
      if(formMode==='note'){
        const number=editingNoteId?priceNoteNumber(invoices.find(i=>String(i.id)===String(editingNoteId))):nextPriceNoteNumber();
        const payload={client_id:clientSelect.value,issue_date:dateInput.value,due_date:dueInput.value,status:'draft',subtotal_ht:t.ht,vat_rate:VAT,vat_amount:t.vat,total_ttc:t.ttc,notes:taggedNotes(number,document.getElementById('invoice-notes').value.trim())};
        if(editingNoteId){
          const r=await db.from('invoices').update(payload).eq('id',editingNoteId).select().single(); if(r.error)throw r.error; await replaceLinks(editingNoteId);
        }else{
          const r=await db.from('invoices').insert(payload).select().single(); if(r.error)throw r.error;
          try{await replaceLinks(r.data.id);}catch(err){await db.from('invoices').delete().eq('id',r.data.id);throw err;}
        }
      }else{
        const payload={client_id:clientSelect.value,issue_date:dateInput.value,due_date:dueInput.value,status:'draft',subtotal_ht:t.ht,vat_rate:VAT,vat_amount:t.vat,total_ttc:t.ttc,notes:document.getElementById('invoice-notes').value.trim()||null};
        const r=await db.from('invoices').insert(payload).select().single(); if(r.error)throw r.error;
        const links=await db.from('invoice_trips').insert([...selectedTrips].map(trip_id=>({invoice_id:r.data.id,trip_id})));
        if(links.error){await db.from('invoices').delete().eq('id',r.data.id);throw links.error;}
      }
      closeForm(); await loadAll();
    }catch(err){console.error(err);errorBox.textContent=err.message||'Enregistrement impossible.';errorBox.hidden=false;}
    finally{save.disabled=false;}
  });

  view.addEventListener('click',async e=>{
    const tab=e.target.closest('[data-billing-tab]');
    if(tab){document.querySelectorAll('.billing-tab').forEach(b=>b.classList.toggle('active',b===tab));activeTab=tab.dataset.billingTab;renderActive();return;}
    const statusBtn=e.target.closest('[data-set-status]');
    if(statusBtn){statusBtn.disabled=true;const r=await db.from('invoices').update({status:statusBtn.dataset.setStatus}).eq('id',statusBtn.dataset.invoiceId);statusBtn.disabled=false;if(!r.error)await loadAll();return;}
    const del=e.target.closest('[data-delete-invoice]');
    if(del&&confirm('Supprimer définitivement ce brouillon de facture ?')){await db.from('invoice_trips').delete().eq('invoice_id',del.dataset.deleteInvoice);const r=await db.from('invoices').delete().eq('id',del.dataset.deleteInvoice);if(!r.error)await loadAll();return;}
    const cancel=e.target.closest('[data-cancel-invoice]');
    if(cancel&&confirm('Annuler cette facture ? Elle restera dans l’historique.')){const r=await db.from('invoices').update({status:'cancelled'}).eq('id',cancel.dataset.cancelInvoice);if(!r.error)await loadAll();return;}
    const viewNote=e.target.closest('[data-view-note]'); if(viewNote){clearNotePreview();await showNote(viewNote.dataset.viewNote);return;}
    const printNote=e.target.closest('[data-print-note]'); if(printNote){clearNotePreview();await showNote(printNote.dataset.printNote,true);return;}
    const editNote=e.target.closest('[data-edit-note]'); if(editNote){clearNotePreview();const note=invoices.find(i=>String(i.id)===String(editNote.dataset.editNote));configureForm('note',note);return;}
    const deleteNote=e.target.closest('[data-delete-note]');
    if(deleteNote&&confirm('Supprimer définitivement cette note de prix ?')){await db.from('invoice_trips').delete().eq('invoice_id',deleteNote.dataset.deleteNote);const r=await db.from('invoices').delete().eq('id',deleteNote.dataset.deleteNote);if(!r.error)await loadAll();return;}
    const convert=e.target.closest('[data-convert-note]');
    if(convert&&confirm('Convertir cette note de prix en brouillon de facture ?')){const note=invoices.find(i=>String(i.id)===String(convert.dataset.convertNote));const r=await db.from('invoices').update({status:'draft',notes:cleanNotes(note)||null}).eq('id',note.id);if(!r.error){activeTab='invoices';document.querySelectorAll('.billing-tab').forEach(b=>b.classList.toggle('active',b.dataset.billingTab==='invoices'));await loadAll();}return;}
  });

  document.getElementById('invoice-add').addEventListener('click',()=>{clearNotePreview();configureForm('invoice');});
  document.getElementById('price-note-add').addEventListener('click',()=>{clearNotePreview();configureForm('note');});
  document.querySelectorAll('[data-close-invoice]').forEach(b=>b.addEventListener('click',()=>{clearNotePreview();closeForm();}));
  document.getElementById('invoice-refresh').addEventListener('click',loadAll);
  search.addEventListener('input',renderActive); filter.addEventListener('change',renderInvoices);
  window.addEventListener('nexis:invoice-updated',loadAll);
  loadAll();
})();