(() => {
  'use strict';

  const root = document.getElementById('fleet');
  if (!root || !window.supabase?.createClient) return;

  const client = window.NexisAuth?.client || window.supabase.createClient();
  const moneyFmt = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
  const money = value => `${moneyFmt.format(Number(value) || 0)} FCFA`;

  root.innerHTML = `
    <div class="fleet-page">
      <div class="fleet-head">
        <div><h2>Flotte</h2><p>Suivez l’activité et la rentabilité réelle de chaque camion.</p></div>
      </div>
      <div class="fleet-kpis">
        <article class="fleet-kpi"><span>Camions actifs</span><strong id="fleet-active-count">—</strong><small>Disponibles pour les missions</small></article>
        <article class="fleet-kpi"><span>Missions du mois</span><strong id="fleet-trip-count">—</strong><small>Activité totale</small></article>
        <article class="fleet-kpi"><span>Chiffre d'affaires</span><strong id="fleet-revenue">—</strong><small>Période en cours</small></article>
        <article class="fleet-kpi"><span>Résultat flotte</span><strong id="fleet-margin">—</strong><small>Après missions et charges véhicules</small></article>
      </div>
      <section class="fleet-panel">
        <div class="fleet-toolbar">
          <input id="fleet-search" type="search" placeholder="Rechercher une immatriculation" />
          <select id="fleet-status-filter"><option value="">Tous les statuts</option><option value="active">Actifs</option><option value="inactive">Inactifs</option></select>
          <button type="button" class="primary" id="fleet-add-toggle">Ajouter un camion</button>
        </div>
        <div class="fleet-add-wrap" id="fleet-add-wrap" hidden>
          <form class="fleet-add-form" id="fleet-add-form">
            <label>Immatriculation<input id="fleet-new-plate" type="text" placeholder="Ex. DK-1234-AB" autocomplete="off" required /></label>
            <button type="button" class="secondary" id="fleet-add-cancel">Annuler</button>
            <button type="submit" class="primary">Enregistrer</button>
          </form>
          <p class="fleet-error" id="fleet-error" hidden></p>
        </div>
        <div class="fleet-table-wrap">
          <table class="fleet-table">
            <thead><tr><th>Camion</th><th>Statut</th><th>Missions</th><th>CA</th><th>Dépenses missions</th><th>Charges véhicule</th><th>Résultat réel</th><th>Dernière mission</th><th></th></tr></thead>
            <tbody id="fleet-body"><tr><td colspan="9" class="fleet-loading">Ouvrez Flotte pour charger les données.</td></tr></tbody>
          </table>
        </div>
      </section>
    </div>
    <section class="fleet-detail-shell" id="fleet-detail-shell" hidden>
      <button class="fleet-detail-overlay" type="button" data-close-fleet-detail></button>
      <aside class="fleet-detail-drawer">
        <header class="fleet-detail-head"><div><small>Fiche camion</small><h3 id="fleet-detail-title">Camion</h3></div><button type="button" data-close-fleet-detail>×</button></header>
        <div class="fleet-detail-body" id="fleet-detail-body"></div>
      </aside>
    </section>`;

  const style = document.createElement('style');
  style.textContent = `
    .fleet-table{min-width:1120px!important}
    .fleet-result{font-weight:800;white-space:nowrap}.fleet-result.positive{color:#09815d}.fleet-result.negative{color:#bb4048}
    .fleet-view{width:32px;height:32px;border:1px solid #dfe5eb;border-radius:9px;background:#fff;color:#5d6e82;cursor:pointer}.fleet-view:hover{background:#fff6eb;color:#b35e00;border-color:#efc68f}
    .fleet-detail-shell{position:fixed;inset:0;z-index:30000;display:grid;grid-template-columns:1fr min(620px,96vw)}.fleet-detail-shell[hidden]{display:none}
    .fleet-detail-overlay{border:0;background:rgba(15,29,45,.48);backdrop-filter:blur(3px)}
    .fleet-detail-drawer{height:100dvh;display:flex;flex-direction:column;background:#f6f8fa;box-shadow:-20px 0 55px rgba(14,31,52,.2)}
    .fleet-detail-head{display:flex;justify-content:space-between;align-items:flex-start;padding:19px 20px;background:#fff;border-bottom:1px solid #e1e7ed}.fleet-detail-head small{display:block;color:#8b97a5;font-size:8px;text-transform:uppercase;font-weight:800}.fleet-detail-head h3{margin:4px 0 0;font-size:19px;color:#1d3248}.fleet-detail-head button{width:34px;height:34px;border:1px solid #dce3ea;border-radius:10px;background:#fff;font-size:20px;cursor:pointer}
    .fleet-detail-body{padding:18px;overflow:auto}.fleet-detail-kpis{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.fleet-detail-kpi{padding:14px;border:1px solid #e0e6ec;border-radius:12px;background:#fff}.fleet-detail-kpi span{display:block;color:#8190a0;font-size:8px;font-weight:800;text-transform:uppercase}.fleet-detail-kpi strong{display:block;margin-top:6px;color:#263b51;font-size:16px}.fleet-detail-kpi.result strong{color:#09815d}.fleet-detail-kpi.result.negative strong{color:#bb4048}
    .fleet-detail-card{margin-top:12px;padding:15px;border:1px solid #e0e6ec;border-radius:13px;background:#fff}.fleet-detail-card h4{margin:0 0 11px;color:#263a50;font-size:12px}.fleet-charge-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.fleet-charge-row{display:flex;justify-content:space-between;gap:10px;padding:9px 10px;border-radius:9px;background:#f8fafc;color:#667587;font-size:9.5px}.fleet-charge-row strong{color:#34485e}.fleet-history{width:100%;border-collapse:collapse}.fleet-history th{padding:8px;text-align:left;color:#8592a2;font-size:8px;text-transform:uppercase}.fleet-history td{padding:9px 8px;border-top:1px solid #edf1f4;color:#405268;font-size:9.5px}.fleet-history .positive{color:#09815d;font-weight:750}.fleet-history .negative{color:#bb4048;font-weight:750}
    @media(max-width:740px){.fleet-detail-shell{grid-template-columns:1fr}.fleet-detail-overlay{display:none}.fleet-detail-kpis,.fleet-charge-grid{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);

  const els = {
    activeCount: document.getElementById('fleet-active-count'), tripCount: document.getElementById('fleet-trip-count'), revenue: document.getElementById('fleet-revenue'), margin: document.getElementById('fleet-margin'), search: document.getElementById('fleet-search'), status: document.getElementById('fleet-status-filter'), toggle: document.getElementById('fleet-add-toggle'), addWrap: document.getElementById('fleet-add-wrap'), addForm: document.getElementById('fleet-add-form'), cancel: document.getElementById('fleet-add-cancel'), plate: document.getElementById('fleet-new-plate'), error: document.getElementById('fleet-error'), body: document.getElementById('fleet-body')
  };

  let trucks = [], trips = [], expenses = [], charges = [];
  let loaded = false, loading = false;

  const currentMonth = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; };
  const formatDate = value => { if(!value) return '—'; const [y,m,d]=String(value).split('-'); return y&&m&&d?`${d}/${m}/${y}`:value; };
  const expenseTotal = item => ['fuel','ration','rapido','manoeuvre','misc'].reduce((s,k)=>s+(Number(item?.[k])||0),0);
  const chargeTotal = item => ['maintenance','repairs','insurance','technical_visit','driver_cost','financing','other'].reduce((s,k)=>s+(Number(item?.[k])||0),0);

  function monthlyChargesForTruck(plate) {
    const month=currentMonth();
    return charges.filter(c=>c.truck===plate && String(c.month||'').startsWith(month));
  }

  function rowForTruck(truck) {
    const month=currentMonth();
    const relatedTrips=trips.filter(t=>t.truck===truck.plate_number && String(t.date||'').startsWith(month));
    const ids=new Set(relatedTrips.map(t=>String(t.id)));
    const missionExpenses=expenses.filter(e=>ids.has(String(e.trip_id))).reduce((s,e)=>s+expenseTotal(e),0);
    const vehicleCharges=monthlyChargesForTruck(truck.plate_number).reduce((s,c)=>s+chargeTotal(c),0);
    const revenue=relatedTrips.reduce((s,t)=>s+(Number(t.revenue)||0),0);
    const latest=[...relatedTrips].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')))[0];
    return {plate:truck.plate_number,active:truck.is_active!==false,missions:relatedTrips.length,revenue,missionExpenses,vehicleCharges,result:revenue-missionExpenses-vehicleCharges,lastTrip:latest?.date||null};
  }

  function dataByTruck(){return trucks.map(rowForTruck);}

  function render() {
    const rows=dataByTruck();
    const q=String(els.search.value||'').trim().toLowerCase(); const status=els.status.value;
    const filtered=rows.filter(r=>(!q||r.plate.toLowerCase().includes(q))&&(!status||(status==='active'?r.active:!r.active)));
    els.activeCount.textContent=String(rows.filter(r=>r.active).length);
    els.tripCount.textContent=String(rows.reduce((s,r)=>s+r.missions,0));
    els.revenue.textContent=money(rows.reduce((s,r)=>s+r.revenue,0));
    const result=rows.reduce((s,r)=>s+r.result,0); els.margin.textContent=money(result); els.margin.classList.toggle('negative',result<0);
    if(!filtered.length){els.body.innerHTML='<tr><td colspan="9" class="fleet-empty">Aucun camion ne correspond aux filtres.</td></tr>';return;}
    els.body.innerHTML=filtered.map(r=>`<tr data-fleet-row="${r.plate}"><td><span class="fleet-plate">${r.plate}</span></td><td><span class="fleet-status ${r.active?'active':'inactive'}">${r.active?'Actif':'Inactif'}</span></td><td>${r.missions}</td><td>${money(r.revenue)}</td><td>${money(r.missionExpenses)}</td><td>${money(r.vehicleCharges)}</td><td class="fleet-result ${r.result<0?'negative':'positive'}">${money(r.result)}</td><td>${formatDate(r.lastTrip)}</td><td><button class="fleet-view" type="button" data-view-truck="${r.plate}" title="Voir le camion">›</button></td></tr>`).join('');
  }

  async function load(force=false) {
    if(loading||(loaded&&!force)) return; loading=true; els.body.innerHTML='<tr><td colspan="9" class="fleet-loading">Chargement de la flotte…</td></tr>';
    try{
      const [a,b,c,d]=await Promise.all([
        client.from('trucks').select('plate_number,is_active').order('plate_number'),
        client.from('trips').select('id,truck,date,loadingZone,unloadingZone,revenue').order('date',{ascending:false}),
        client.from('trip_expenses').select('trip_id,fuel,ration,rapido,manoeuvre,misc'),
        client.from('vehicle_charges').select('truck,month,maintenance,repairs,insurance,technical_visit,driver_cost,financing,other,notes').order('month',{ascending:false})
      ]);
      if(a.error||b.error||c.error||d.error) throw (a.error||b.error||c.error||d.error);
      trucks=a.data||[];trips=b.data||[];expenses=c.data||[];charges=d.data||[];loaded=true;render();
    }catch(error){console.error('Flotte Nexis :',error);els.body.innerHTML='<tr><td colspan="9" class="fleet-empty">Impossible de charger la flotte.</td></tr>';}finally{loading=false;}
  }

  function openTruck(plate) {
    const truck=trucks.find(t=>t.plate_number===plate); if(!truck)return;
    const row=rowForTruck(truck);
    const month=currentMonth();
    const monthCharges=monthlyChargesForTruck(plate);
    const chargeBreakdown={maintenance:0,repairs:0,insurance:0,technical_visit:0,driver_cost:0,financing:0,other:0};
    monthCharges.forEach(c=>Object.keys(chargeBreakdown).forEach(k=>chargeBreakdown[k]+=Number(c[k])||0));
    const related=trips.filter(t=>t.truck===plate).slice(0,10);
    const expenseMap=new Map(); expenses.forEach(e=>expenseMap.set(String(e.trip_id),(expenseMap.get(String(e.trip_id))||0)+expenseTotal(e)));
    document.getElementById('fleet-detail-title').textContent=plate;
    document.getElementById('fleet-detail-body').innerHTML=`
      <div class="fleet-detail-kpis">
        <article class="fleet-detail-kpi"><span>CA du mois</span><strong>${money(row.revenue)}</strong></article>
        <article class="fleet-detail-kpi"><span>Dépenses missions</span><strong>${money(row.missionExpenses)}</strong></article>
        <article class="fleet-detail-kpi"><span>Charges véhicule</span><strong>${money(row.vehicleCharges)}</strong></article>
        <article class="fleet-detail-kpi result ${row.result<0?'negative':''}"><span>Résultat réel</span><strong>${money(row.result)}</strong></article>
      </div>
      <section class="fleet-detail-card"><h4>Charges du mois</h4><div class="fleet-charge-grid">
        <div class="fleet-charge-row"><span>Entretien</span><strong>${money(chargeBreakdown.maintenance)}</strong></div><div class="fleet-charge-row"><span>Réparations</span><strong>${money(chargeBreakdown.repairs)}</strong></div><div class="fleet-charge-row"><span>Assurance</span><strong>${money(chargeBreakdown.insurance)}</strong></div><div class="fleet-charge-row"><span>Visite technique</span><strong>${money(chargeBreakdown.technical_visit)}</strong></div><div class="fleet-charge-row"><span>Chauffeur</span><strong>${money(chargeBreakdown.driver_cost)}</strong></div><div class="fleet-charge-row"><span>Financement</span><strong>${money(chargeBreakdown.financing)}</strong></div><div class="fleet-charge-row"><span>Autres</span><strong>${money(chargeBreakdown.other)}</strong></div>
      </div></section>
      <section class="fleet-detail-card"><h4>Dernières missions</h4><div style="overflow:auto"><table class="fleet-history"><thead><tr><th>Date</th><th>Trajet</th><th>CA</th><th>Dépenses</th><th>Marge mission</th></tr></thead><tbody>${related.length?related.map(t=>{const exp=expenseMap.get(String(t.id))||0;const m=(Number(t.revenue)||0)-exp;return `<tr><td>${formatDate(t.date)}</td><td>${t.loadingZone||'—'} → ${t.unloadingZone||'—'}</td><td>${money(t.revenue)}</td><td>${money(exp)}</td><td class="${m<0?'negative':'positive'}">${money(m)}</td></tr>`;}).join(''):'<tr><td colspan="5">Aucune mission.</td></tr>'}</tbody></table></div></section>`;
    document.getElementById('fleet-detail-shell').hidden=false; document.body.style.overflow='hidden';
  }

  function closeTruck(){document.getElementById('fleet-detail-shell').hidden=true;document.body.style.overflow='';}
  function showError(message=''){els.error.textContent=message;els.error.hidden=!message;}

  els.toggle.addEventListener('click',()=>{els.addWrap.hidden=!els.addWrap.hidden;showError('');if(!els.addWrap.hidden)els.plate.focus();});
  els.cancel.addEventListener('click',()=>{els.addWrap.hidden=true;els.addForm.reset();showError('');});
  els.addForm.addEventListener('submit',async event=>{event.preventDefault();const plate=els.plate.value.trim().toUpperCase();if(!plate)return showError('Saisissez une immatriculation.');if(trucks.some(t=>t.plate_number===plate))return showError('Ce camion existe déjà.');const submit=event.currentTarget.querySelector('[type="submit"]');submit.disabled=true;const {error}=await client.from('trucks').insert([{plate_number:plate,is_active:true}]);submit.disabled=false;if(error)return showError("Impossible d'ajouter le camion.");els.addForm.reset();els.addWrap.hidden=true;loaded=false;await load(true);});
  els.body.addEventListener('click',event=>{const btn=event.target.closest('[data-view-truck]');if(btn)openTruck(btn.dataset.viewTruck);});
  document.querySelectorAll('[data-close-fleet-detail]').forEach(btn=>btn.addEventListener('click',closeTruck));
  [els.search,els.status].forEach(input=>{input.addEventListener('input',render);input.addEventListener('change',render);});
  window.addEventListener('hashchange',()=>{if(location.hash==='#fleet')load();});
  window.addEventListener('nexis:data-changed',()=>{loaded=false;if(location.hash==='#fleet')load(true);});
  if(location.hash==='#fleet')load();
})();