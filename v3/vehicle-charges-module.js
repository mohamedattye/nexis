(() => {
  'use strict';

  const view = document.getElementById('vehicle-charges');
  if (!view || !window.supabase?.createClient) return;

  const client = window.supabase.createClient();
  const formatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
  let trucks = [];
  let trips = [];
  let missionExpenses = [];
  let vehicleCharges = [];
  let editingId = null;
  let loading = false;

  const chargeFields = [
    ['maintenance', 'Entretien'],
    ['repairs', 'Réparations'],
    ['insurance', 'Assurance'],
    ['technical_visit', 'Visite technique'],
    ['driver_cost', 'Chauffeur'],
    ['financing', 'Financement'],
    ['other', 'Autres charges']
  ];

  const style = document.createElement('style');
  style.textContent = `
    .charges-page{display:grid;gap:14px}
    .charges-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:18px}
    .charges-heading h2{margin:0;font-size:23px;letter-spacing:-.025em}
    .charges-heading p{margin:6px 0 0;color:#7a8493;font-size:11px}
    .charges-filter{display:flex;align-items:center;gap:8px}
    .charges-filter input{height:39px;border:1px solid #cfd7e2;border-radius:7px;background:#fff;padding:0 11px;font:inherit;font-size:11px;color:#243449;outline:none}
    .charges-filter input:focus{border-color:#e9983e;box-shadow:0 0 0 3px rgba(255,139,20,.11)}
    .charges-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
    .charges-kpi{background:#fff;border:1px solid #e1e7ef;border-radius:9px;padding:15px 16px;min-width:0}
    .charges-kpi span,.charges-kpi strong,.charges-kpi small{display:block}
    .charges-kpi span{font-size:9px;color:#7a8493;text-transform:uppercase;letter-spacing:.05em;font-weight:800}
    .charges-kpi strong{margin-top:7px;font-size:19px;color:#203047;white-space:nowrap}
    .charges-kpi small{margin-top:5px;font-size:9px;color:#8a94a2}
    .charges-kpi.profit strong{color:#07845d}.charges-kpi.loss strong{color:#bd3d44}
    .charges-panel{background:#fff;border:1px solid #e0e6ee;border-radius:10px;padding:16px}
    .charges-toolbar{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:12px}
    .charges-toolbar h3{margin:0;font-size:14px}.charges-toolbar p{margin:5px 0 0;font-size:10px;color:#7a8493}
    .charges-form-wrap{margin-bottom:13px;padding:15px;border:1px solid #e1e7ef;border-radius:9px;background:#f9fbfd}
    .charges-form-wrap[hidden]{display:none}
    .charges-form-head{display:flex;align-items:flex-start;justify-content:space-between;gap:15px;margin-bottom:13px}
    .charges-form-head h3{margin:0;font-size:14px}.charges-form-head p{margin:5px 0 0;font-size:10px;color:#7a8493}
    .charges-form{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:11px}
    .charges-form label{font-size:10px;font-weight:750;color:#435069}
    .charges-form input,.charges-form select,.charges-form textarea{width:100%;margin-top:5px;border:1px solid #cfd7e2;border-radius:7px;background:#fff;padding:0 10px;font:inherit;font-size:11px;color:#243449;outline:none}
    .charges-form input,.charges-form select{height:40px}.charges-form textarea{min-height:74px;padding-top:10px;resize:vertical}
    .charges-form input:focus,.charges-form select:focus,.charges-form textarea:focus{border-color:#e9983e;box-shadow:0 0 0 3px rgba(255,139,20,.11)}
    .charges-form .full{grid-column:1/-1}.charges-form-actions{grid-column:1/-1;display:flex;justify-content:flex-end;gap:8px;align-items:center}
    .charges-preview{margin-right:auto;font-size:10px;color:#667287}.charges-preview strong{color:#203047;font-size:13px;margin-left:5px}
    .charges-error{grid-column:1/-1;padding:10px 11px;border:1px solid #ffd3d6;border-radius:7px;background:#fff1f2;color:#b2373f;font-size:10px}.charges-error[hidden]{display:none}
    .charges-table-wrap{overflow:auto;border:1px solid #e7ebf0;border-radius:8px}
    .charges-table{min-width:1120px}.charges-table th{padding:10px;font-size:9px}.charges-table td{padding:11px 10px;font-size:10px;vertical-align:middle}
    .charges-plate{display:inline-block;padding:5px 7px;border-radius:6px;background:#eef4fb;color:#26496f;font-weight:800;white-space:nowrap}
    .charges-money{font-weight:700;white-space:nowrap}.charges-total{font-weight:850;color:#d26d00;white-space:nowrap}
    .charges-net{font-weight:850;color:#07845d;white-space:nowrap}.charges-net.negative{color:#bd3d44}
    .charges-actions{display:flex;justify-content:flex-end;gap:6px}.charges-action{border:1px solid #dce3eb;background:#fff;border-radius:6px;padding:6px 8px;font:inherit;font-size:9px;font-weight:750;color:#405069;cursor:pointer;white-space:nowrap}.charges-action:hover{background:#f5f7fa}.charges-action.danger{color:#b23840;border-color:#f0c9cd}
    .charges-empty,.charges-loading{padding:34px;text-align:center;color:#7a8493;font-size:11px}
    @media(max-width:1050px){.charges-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.charges-form{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media(max-width:740px){.charges-heading,.charges-toolbar,.charges-form-head{align-items:flex-start;flex-direction:column}.charges-filter{width:100%;display:grid;grid-template-columns:1fr}.charges-filter input,.charges-filter button{width:100%}.charges-kpis,.charges-form{grid-template-columns:1fr}.charges-form .full,.charges-form-actions{grid-column:auto}.charges-form-actions{align-items:stretch;flex-direction:column}.charges-preview{margin:0}.charges-form-actions button{width:100%}}
  `;
  document.head.appendChild(style);

  view.innerHTML = `
    <div class="charges-page">
      <div class="charges-heading">
        <div><h2>Charges véhicules</h2><p>Mesurez le résultat net réel de chaque camion après ses charges mensuelles.</p></div>
        <div class="charges-filter"><input id="charges-month" type="month" /><button class="primary" id="charges-add" type="button">Saisir les charges</button></div>
      </div>
      <div class="charges-kpis">
        <article class="charges-kpi"><span>Marge des missions</span><strong id="charges-kpi-operating">—</strong><small>Après dépenses variables</small></article>
        <article class="charges-kpi"><span>Charges véhicules</span><strong id="charges-kpi-fixed">—</strong><small>Période sélectionnée</small></article>
        <article class="charges-kpi profit" id="charges-net-card"><span>Résultat net</span><strong id="charges-kpi-net">—</strong><small>Marge moins charges véhicules</small></article>
        <article class="charges-kpi"><span>Camions renseignés</span><strong id="charges-kpi-covered">—</strong><small id="charges-kpi-covered-note">Sur la flotte enregistrée</small></article>
      </div>
      <section class="charges-panel">
        <div class="charges-form-wrap" id="charges-form-wrap" hidden>
          <div class="charges-form-head"><div><h3 id="charges-form-title">Saisir les charges mensuelles</h3><p>Une seule fiche par camion et par mois.</p></div></div>
          <form class="charges-form" id="charges-form">
            <label>Camion<select id="charges-truck" required><option value="">Sélectionner un camion</option></select></label>
            <label>Mois<input id="charges-form-month" type="month" required /></label>
            ${chargeFields.map(([key, label]) => `<label>${label} (FCFA)<input id="charge-${key}" type="number" min="0" step="100" value="0" /></label>`).join('')}
            <label class="full">Notes<textarea id="charge-notes" placeholder="Ex. vidange, remplacement de pièces, échéance assurance…"></textarea></label>
            <p class="charges-error" id="charges-error" hidden></p>
            <div class="charges-form-actions"><span class="charges-preview">Total des charges : <strong id="charges-form-total">0 FCFA</strong></span><button class="secondary" id="charges-cancel" type="button">Annuler</button><button class="primary" type="submit">Enregistrer</button></div>
          </form>
        </div>
        <div class="charges-toolbar"><div><h3>Rentabilité nette par camion</h3><p>Marge des missions, charges mensuelles et résultat final.</p></div></div>
        <div class="charges-table-wrap"><table class="charges-table"><thead><tr><th>Camion</th><th>Missions</th><th>Chiffre d’affaires</th><th>Dépenses missions</th><th>Marge missions</th><th>Charges véhicule</th><th>Résultat net</th><th></th></tr></thead><tbody id="charges-body"><tr><td colspan="8" class="charges-loading">Chargement des charges…</td></tr></tbody></table></div>
      </section>
    </div>`;

  const el = {
    month: document.getElementById('charges-month'), add: document.getElementById('charges-add'),
    formWrap: document.getElementById('charges-form-wrap'), form: document.getElementById('charges-form'), formTitle: document.getElementById('charges-form-title'),
    truck: document.getElementById('charges-truck'), formMonth: document.getElementById('charges-form-month'), notes: document.getElementById('charge-notes'),
    formTotal: document.getElementById('charges-form-total'), error: document.getElementById('charges-error'), cancel: document.getElementById('charges-cancel'), body: document.getElementById('charges-body'),
    operating: document.getElementById('charges-kpi-operating'), fixed: document.getElementById('charges-kpi-fixed'), net: document.getElementById('charges-kpi-net'), netCard: document.getElementById('charges-net-card'), covered: document.getElementById('charges-kpi-covered'), coveredNote: document.getElementById('charges-kpi-covered-note')
  };
  const inputs = Object.fromEntries(chargeFields.map(([key]) => [key, document.getElementById(`charge-${key}`)]));

  function money(value) { return `${formatter.format(Number(value) || 0)} FCFA`; }
  function currentMonth() { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`; }
  function numberValue(input) { const value = Number(input?.value || 0); return Number.isFinite(value) && value >= 0 ? value : 0; }
  function chargeTotal(item) { return chargeFields.reduce((sum, [key]) => sum + (Number(item?.[key]) || 0), 0); }
  function missionExpenseTotal(item) { return ['fuel','ration','rapido','manoeuvre','misc'].reduce((sum, key) => sum + (Number(item?.[key]) || 0), 0); }
  function escapeHtml(value) { return String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;'); }

  function selectedMonthDate() { return `${el.month.value || currentMonth()}-01`; }
  function monthMatches(date, month = el.month.value) { return !month || String(date || '').startsWith(month); }

  function populateTrucks() {
    const current = el.truck.value;
    const plates = [...new Set(trucks.map((item) => item.plate_number).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'fr',{numeric:true}));
    el.truck.innerHTML = '<option value="">Sélectionner un camion</option>' + plates.map((plate)=>`<option value="${escapeHtml(plate)}">${escapeHtml(plate)}</option>`).join('');
    el.truck.value = plates.includes(current) ? current : '';
  }

  function missionExpenseMap() {
    const map = new Map();
    missionExpenses.forEach((item) => map.set(String(item.trip_id), (map.get(String(item.trip_id)) || 0) + missionExpenseTotal(item)));
    return map;
  }

  function rowsForMonth() {
    const expenseMap = missionExpenseMap();
    const chargeMap = new Map(vehicleCharges.filter((item)=>monthMatches(item.month)).map((item)=>[item.truck,item]));
    return trucks.map((truck) => {
      const plate = truck.plate_number;
      const truckTrips = trips.filter((trip)=>trip.truck === plate && monthMatches(trip.date));
      const revenue = truckTrips.reduce((sum, trip)=>sum+(Number(trip.revenue)||0),0);
      const variable = truckTrips.reduce((sum, trip)=>sum+(expenseMap.get(String(trip.id))||0),0);
      const operating = revenue - variable;
      const charge = chargeMap.get(plate) || null;
      const fixed = chargeTotal(charge);
      return { plate, active:truck.is_active, missions:truckTrips.length, revenue, variable, operating, charge, fixed, net:operating-fixed };
    }).sort((a,b)=>b.net-a.net);
  }

  function render() {
    const rows = rowsForMonth();
    const totals = rows.reduce((sum,row)=>({ operating:sum.operating+row.operating, fixed:sum.fixed+row.fixed, net:sum.net+row.net, covered:sum.covered+(row.charge?1:0) }),{operating:0,fixed:0,net:0,covered:0});
    el.operating.textContent = money(totals.operating); el.fixed.textContent = money(totals.fixed); el.net.textContent = money(totals.net);
    el.netCard.classList.toggle('loss', totals.net < 0); el.netCard.classList.toggle('profit', totals.net >= 0);
    el.covered.textContent = `${totals.covered} / ${rows.length}`; el.coveredNote.textContent = `${rows.length - totals.covered} camion${rows.length - totals.covered > 1 ? 's' : ''} à renseigner`;
    if (!rows.length) { el.body.innerHTML = '<tr><td colspan="8" class="charges-empty">Aucun camion enregistré.</td></tr>'; return; }
    el.body.innerHTML = rows.map((row)=>`<tr><td><span class="charges-plate">${escapeHtml(row.plate)}</span></td><td>${row.missions}</td><td class="charges-money">${money(row.revenue)}</td><td class="charges-money">${money(row.variable)}</td><td class="charges-money">${money(row.operating)}</td><td class="charges-total">${money(row.fixed)}</td><td class="charges-net ${row.net<0?'negative':''}">${money(row.net)}</td><td><div class="charges-actions"><button class="charges-action" type="button" data-edit-charge="${escapeHtml(row.plate)}">${row.charge?'Modifier':'Saisir'}</button>${row.charge?`<button class="charges-action danger" type="button" data-delete-charge="${escapeHtml(row.charge.id)}">Supprimer</button>`:''}</div></td></tr>`).join('');
  }

  function updateFormTotal() { el.formTotal.textContent = money(chargeFields.reduce((sum,[key])=>sum+numberValue(inputs[key]),0)); }
  function resetForm() { editingId = null; el.form.reset(); el.formMonth.value = el.month.value || currentMonth(); chargeFields.forEach(([key])=>{ inputs[key].value = 0; }); el.notes.value = ''; el.error.hidden = true; el.formTitle.textContent = 'Saisir les charges mensuelles'; updateFormTotal(); }
  function openForm(charge = null, plate = '') {
    resetForm();
    if (charge) { editingId = charge.id; el.formTitle.textContent = `Modifier les charges de ${charge.truck}`; el.truck.value = charge.truck; el.formMonth.value = String(charge.month).slice(0,7); chargeFields.forEach(([key])=>{ inputs[key].value = Number(charge[key]) || 0; }); el.notes.value = charge.notes || ''; }
    else if (plate) { el.truck.value = plate; }
    el.formWrap.hidden = false; updateFormTotal(); el.formWrap.scrollIntoView({behavior:'smooth',block:'start'});
  }
  function closeForm() { el.formWrap.hidden = true; resetForm(); }

  async function saveCharge(event) {
    event.preventDefault(); el.error.hidden = true;
    const month = el.formMonth.value; const values = { truck:el.truck.value, month:month ? `${month}-01` : '', notes:el.notes.value.trim() || null };
    chargeFields.forEach(([key])=>{ values[key] = numberValue(inputs[key]); });
    if (!values.truck || !values.month) { el.error.hidden = false; el.error.textContent = 'Sélectionnez un camion et un mois.'; return; }
    try {
      let result;
      if (editingId) result = await client.from('vehicle_charges').update(values).eq('id', editingId).select().single();
      else result = await client.from('vehicle_charges').upsert([values], { onConflict:'truck,month' }).select().single();
      if (result.error) throw result.error;
      vehicleCharges = vehicleCharges.filter((item)=>item.id !== result.data.id && !(item.truck === result.data.truck && item.month === result.data.month)); vehicleCharges.push(result.data);
      el.month.value = month; closeForm(); render();
    } catch (error) { console.error('Erreur charges véhicule :', error); el.error.hidden = false; el.error.textContent = "Impossible d'enregistrer ces charges."; }
  }

  async function deleteCharge(id) {
    if (!window.confirm('Supprimer définitivement cette fiche de charges ?')) return;
    try { const { error } = await client.from('vehicle_charges').delete().eq('id', id); if (error) throw error; vehicleCharges = vehicleCharges.filter((item)=>String(item.id)!==String(id)); render(); }
    catch (error) { console.error('Erreur suppression charges :', error); window.alert('Impossible de supprimer cette fiche.'); }
  }

  async function loadData() {
    if (loading) return; loading = true;
    try {
      const [truckResult, tripResult, expenseResult, chargeResult] = await Promise.all([
        client.from('trucks').select('plate_number,is_active').order('plate_number',{ascending:true}),
        client.from('trips').select('*').order('date',{ascending:false}),
        client.from('trip_expenses').select('*').order('date',{ascending:false}),
        client.from('vehicle_charges').select('*').order('month',{ascending:false})
      ]);
      if (truckResult.error) throw truckResult.error; if (tripResult.error) throw tripResult.error; if (expenseResult.error) throw expenseResult.error; if (chargeResult.error) throw chargeResult.error;
      trucks = truckResult.data || []; trips = tripResult.data || []; missionExpenses = expenseResult.data || []; vehicleCharges = chargeResult.data || [];
      populateTrucks(); render();
    } catch (error) { console.error('Erreur module charges véhicules :', error); el.body.innerHTML = '<tr><td colspan="8" class="charges-empty">Impossible de charger les charges véhicules.</td></tr>'; }
    finally { loading = false; }
  }

  el.month.value = currentMonth(); el.formMonth.value = currentMonth();
  el.month.addEventListener('change', () => { closeForm(); render(); });
  el.add.addEventListener('click', () => openForm()); el.cancel.addEventListener('click', closeForm); el.form.addEventListener('submit', saveCharge);
  Object.values(inputs).forEach((input)=>input.addEventListener('input', updateFormTotal));
  el.body.addEventListener('click', (event) => { const edit = event.target.closest('[data-edit-charge]'); const remove = event.target.closest('[data-delete-charge]'); if (edit) { const charge = vehicleCharges.find((item)=>item.truck===edit.dataset.editCharge && monthMatches(item.month)); openForm(charge || null, edit.dataset.editCharge); } if (remove) deleteCharge(remove.dataset.deleteCharge); });
  window.addEventListener('hashchange', () => { if (location.hash === '#vehicle-charges') loadData(); });
  window.addEventListener('focus', () => { if (location.hash === '#vehicle-charges') loadData(); });
  loadData();
})();