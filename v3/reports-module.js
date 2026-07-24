(() => {
  'use strict';

  const view = document.getElementById('reports');
  if (!view || !window.supabase?.createClient) return;

  const client = window.supabase.createClient();
  const formatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
  let trips = [];
  let expenses = [];
  let trucks = [];
  let loading = false;

  const style = document.createElement('style');
  style.textContent = `
    .reports-page{display:grid;gap:14px}
    .reports-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:18px}
    .reports-heading h2{margin:0;font-size:23px;letter-spacing:-.025em}
    .reports-heading p{margin:6px 0 0;color:#7a8493;font-size:11px}
    .reports-actions{display:flex;gap:8px;flex-wrap:wrap}
    .reports-filter{display:flex;gap:8px;align-items:center}
    .reports-filter input,.reports-filter select{height:39px;border:1px solid #cfd7e2;border-radius:7px;background:#fff;padding:0 11px;font:inherit;font-size:11px;color:#243449;outline:none}
    .reports-filter input:focus,.reports-filter select:focus{border-color:#e9983e;box-shadow:0 0 0 3px rgba(255,139,20,.11)}
    .reports-kpis{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}
    .reports-kpi{background:#fff;border:1px solid #e1e7ef;border-radius:9px;padding:14px 15px;min-width:0}
    .reports-kpi span,.reports-kpi strong,.reports-kpi small{display:block}
    .reports-kpi span{font-size:9px;color:#7a8493;text-transform:uppercase;letter-spacing:.05em;font-weight:800}
    .reports-kpi strong{margin-top:7px;font-size:17px;color:#203047;white-space:nowrap}
    .reports-kpi small{margin-top:5px;font-size:9px;color:#8a94a2;min-height:12px}
    .reports-kpi.profit strong{color:#07845d}
    .reports-kpi.loss strong{color:#bd3d44}
    .reports-grid{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(300px,.75fr);gap:12px;align-items:start}
    .reports-panel{background:#fff;border:1px solid #e0e6ee;border-radius:10px;padding:16px;min-width:0}
    .reports-panel-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:12px}
    .reports-panel-head h3{margin:0;font-size:14px}
    .reports-panel-head p{margin:5px 0 0;font-size:10px;color:#7a8493}
    .reports-table-wrap{overflow:auto;border:1px solid #e7ebf0;border-radius:8px}
    .reports-table{min-width:780px}
    .reports-table th{padding:10px;font-size:9px}
    .reports-table td{padding:11px 10px;font-size:10px}
    .reports-plate{display:inline-block;padding:5px 7px;border-radius:6px;background:#eef4fb;color:#26496f;font-weight:800;white-space:nowrap}
    .reports-money{font-weight:700;white-space:nowrap}
    .reports-margin{font-weight:850;color:#07845d;white-space:nowrap}
    .reports-margin.negative{color:#bd3d44}
    .reports-empty,.reports-loading{padding:34px;text-align:center;color:#7a8493;font-size:11px}
    .expense-breakdown{display:grid;gap:13px}
    .breakdown-row{display:grid;gap:6px}
    .breakdown-label{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:10px}
    .breakdown-label span{color:#4d5b6d;font-weight:700}
    .breakdown-label strong{color:#243449;font-size:10px;white-space:nowrap}
    .breakdown-track{height:8px;background:#edf1f5;border-radius:999px;overflow:hidden}
    .breakdown-fill{height:100%;background:linear-gradient(90deg,#ff9c22,#ff8500);border-radius:999px;min-width:0}
    .reports-insight{margin-top:14px;padding:12px;border:1px solid #e3e8ef;border-radius:8px;background:#f8fafc;font-size:10px;line-height:1.55;color:#556174}
    .reports-insight strong{color:#243449}
    .reports-error{padding:11px 12px;border:1px solid #ffd3d6;border-radius:7px;background:#fff1f2;color:#b2373f;font-size:10px}
    .reports-error[hidden]{display:none}
    @media(max-width:1150px){.reports-kpis{grid-template-columns:repeat(3,minmax(0,1fr))}.reports-grid{grid-template-columns:1fr}}
    @media(max-width:740px){.reports-heading{align-items:flex-start;flex-direction:column}.reports-filter{display:grid;grid-template-columns:1fr;width:100%}.reports-filter input,.reports-filter select,.reports-actions button{width:100%}.reports-actions{width:100%}.reports-kpis{grid-template-columns:1fr}}
    @media print{.sidebar,.topbar,.reports-heading .reports-actions,.reports-filter{display:none!important}.workspace{margin:0!important}.view{padding:0!important}.reports-page{display:block}.reports-kpis{margin-bottom:14px}.reports-grid{grid-template-columns:1fr}.reports-panel{break-inside:avoid;margin-bottom:12px}}
  `;
  document.head.appendChild(style);

  view.innerHTML = `
    <div class="reports-page">
      <div class="reports-heading">
        <div><h2>Rapport d’activité</h2><p>Une synthèse claire de la performance mensuelle de la flotte.</p></div>
        <div class="reports-actions"><button class="secondary" type="button" id="reports-export">Exporter CSV</button><button class="primary" type="button" id="reports-print">Imprimer</button></div>
      </div>
      <div class="reports-filter">
        <input id="reports-month" type="month" />
        <select id="reports-truck"><option value="">Toute la flotte</option></select>
      </div>
      <p class="reports-error" id="reports-error" hidden></p>
      <div class="reports-kpis">
        <article class="reports-kpi"><span>Missions</span><strong id="reports-kpi-missions">—</strong><small id="reports-kpi-missions-note"></small></article>
        <article class="reports-kpi"><span>Chiffre d’affaires</span><strong id="reports-kpi-revenue">—</strong><small id="reports-kpi-revenue-note"></small></article>
        <article class="reports-kpi"><span>Dépenses</span><strong id="reports-kpi-expenses">—</strong><small id="reports-kpi-expenses-note"></small></article>
        <article class="reports-kpi profit" id="reports-margin-card"><span>Marge</span><strong id="reports-kpi-margin">—</strong><small id="reports-kpi-margin-note"></small></article>
        <article class="reports-kpi"><span>Taux de marge</span><strong id="reports-kpi-rate">—</strong><small>Après dépenses de mission</small></article>
      </div>
      <div class="reports-grid">
        <section class="reports-panel">
          <div class="reports-panel-head"><div><h3>Performance par camion</h3><p>Rentabilité sur la période sélectionnée.</p></div></div>
          <div class="reports-table-wrap"><table class="reports-table"><thead><tr><th>Camion</th><th>Missions</th><th>Chiffre d’affaires</th><th>Dépenses</th><th>Marge</th><th>Marge moyenne</th><th>Taux</th></tr></thead><tbody id="reports-truck-body"><tr><td colspan="7" class="reports-loading">Chargement du rapport…</td></tr></tbody></table></div>
        </section>
        <section class="reports-panel">
          <div class="reports-panel-head"><div><h3>Répartition des dépenses</h3><p>Poids de chaque catégorie de frais.</p></div></div>
          <div class="expense-breakdown" id="reports-breakdown"></div>
          <div class="reports-insight" id="reports-insight">Chargement de l’analyse…</div>
        </section>
      </div>
    </div>`;

  const el = {
    month: document.getElementById('reports-month'),
    truck: document.getElementById('reports-truck'),
    error: document.getElementById('reports-error'),
    missions: document.getElementById('reports-kpi-missions'),
    missionsNote: document.getElementById('reports-kpi-missions-note'),
    revenue: document.getElementById('reports-kpi-revenue'),
    revenueNote: document.getElementById('reports-kpi-revenue-note'),
    expenses: document.getElementById('reports-kpi-expenses'),
    expensesNote: document.getElementById('reports-kpi-expenses-note'),
    margin: document.getElementById('reports-kpi-margin'),
    marginNote: document.getElementById('reports-kpi-margin-note'),
    marginCard: document.getElementById('reports-margin-card'),
    rate: document.getElementById('reports-kpi-rate'),
    body: document.getElementById('reports-truck-body'),
    breakdown: document.getElementById('reports-breakdown'),
    insight: document.getElementById('reports-insight'),
    export: document.getElementById('reports-export'),
    print: document.getElementById('reports-print')
  };

  function money(value) { return `${formatter.format(Number(value) || 0)} FCFA`; }
  function currentMonth() { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`; }
  function previousMonth(value) { const [year, month] = String(value).split('-').map(Number); const date = new Date(year, month - 2, 1); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; }
  function escapeHtml(value) { return String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;'); }
  function expenseTotal(item) { return ['fuel','ration','rapido','manoeuvre','misc'].reduce((sum,key)=>sum+(Number(item?.[key])||0),0); }
  function rate(margin, revenue) { return revenue > 0 ? Math.round((margin / revenue) * 100) : 0; }

  function expenseMap() {
    const map = new Map();
    expenses.forEach((item) => map.set(String(item.trip_id), (map.get(String(item.trip_id)) || 0) + expenseTotal(item)));
    return map;
  }

  function selectedTrips(month = el.month.value) {
    const truck = el.truck.value;
    return trips.filter((trip) => (!month || String(trip.date).startsWith(month)) && (!truck || trip.truck === truck));
  }

  function selectedExpenses(month = el.month.value) {
    const tripIds = new Set(selectedTrips(month).map((trip) => String(trip.id)));
    return expenses.filter((item) => tripIds.has(String(item.trip_id)));
  }

  function summaryFor(month) {
    const map = expenseMap();
    const list = selectedTrips(month);
    const revenue = list.reduce((sum, trip) => sum + (Number(trip.revenue) || 0), 0);
    const costs = list.reduce((sum, trip) => sum + (map.get(String(trip.id)) || 0), 0);
    return { missions: list.length, revenue, expenses: costs, margin: revenue - costs };
  }

  function deltaText(current, previous) {
    if (!previous) return 'Aucune comparaison disponible';
    const change = Math.round(((current - previous) / Math.abs(previous)) * 100);
    if (!Number.isFinite(change)) return 'Aucune comparaison disponible';
    return `${change >= 0 ? '+' : ''}${change}% vs mois précédent`;
  }

  function groupedByTruck() {
    const map = expenseMap();
    const grouped = new Map();
    selectedTrips().forEach((trip) => {
      const key = trip.truck || '—';
      const item = grouped.get(key) || { truck:key, missions:0, revenue:0, expenses:0 };
      item.missions += 1;
      item.revenue += Number(trip.revenue) || 0;
      item.expenses += map.get(String(trip.id)) || 0;
      grouped.set(key, item);
    });
    return [...grouped.values()].map((item) => ({ ...item, margin:item.revenue-item.expenses })).sort((a,b)=>b.margin-a.margin);
  }

  function renderBreakdown() {
    const list = selectedExpenses();
    const categories = [
      ['Carburant','fuel'],['Rations','ration'],['Rapido / péage','rapido'],['Manœuvre','manoeuvre'],['Autres frais','misc']
    ].map(([label,key]) => ({ label, value:list.reduce((sum,item)=>sum+(Number(item[key])||0),0) }));
    const total = categories.reduce((sum,item)=>sum+item.value,0);
    const max = Math.max(...categories.map((item)=>item.value),1);
    el.breakdown.innerHTML = categories.map((item) => {
      const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
      return `<div class="breakdown-row"><div class="breakdown-label"><span>${escapeHtml(item.label)}</span><strong>${money(item.value)} · ${pct}%</strong></div><div class="breakdown-track"><div class="breakdown-fill" style="width:${Math.round((item.value/max)*100)}%"></div></div></div>`;
    }).join('');
    const first = [...categories].sort((a,b)=>b.value-a.value)[0];
    el.insight.innerHTML = total > 0 ? `<strong>Principal poste de dépense :</strong> ${escapeHtml(first.label)} avec ${money(first.value)}, soit ${Math.round((first.value/total)*100)}% du total.` : '<strong>Aucune dépense enregistrée</strong> sur la période sélectionnée.';
  }

  function render() {
    const current = summaryFor(el.month.value);
    const previous = summaryFor(previousMonth(el.month.value));
    const rows = groupedByTruck();

    el.missions.textContent = formatter.format(current.missions);
    el.missionsNote.textContent = deltaText(current.missions, previous.missions);
    el.revenue.textContent = money(current.revenue);
    el.revenueNote.textContent = deltaText(current.revenue, previous.revenue);
    el.expenses.textContent = money(current.expenses);
    el.expensesNote.textContent = current.revenue > 0 ? `${Math.round((current.expenses/current.revenue)*100)}% du chiffre d’affaires` : 'Aucune activité facturée';
    el.margin.textContent = money(current.margin);
    el.marginNote.textContent = deltaText(current.margin, previous.margin);
    el.marginCard.classList.toggle('loss', current.margin < 0);
    el.marginCard.classList.toggle('profit', current.margin >= 0);
    el.rate.textContent = `${rate(current.margin,current.revenue)}%`;

    if (!rows.length) {
      el.body.innerHTML = '<tr><td colspan="7" class="reports-empty">Aucune mission sur la période sélectionnée.</td></tr>';
    } else {
      el.body.innerHTML = rows.map((item) => `<tr><td><span class="reports-plate">${escapeHtml(item.truck)}</span></td><td>${item.missions}</td><td class="reports-money">${money(item.revenue)}</td><td class="reports-money">${money(item.expenses)}</td><td class="reports-margin ${item.margin<0?'negative':''}">${money(item.margin)}</td><td class="reports-money">${money(item.missions?item.margin/item.missions:0)}</td><td>${rate(item.margin,item.revenue)}%</td></tr>`).join('');
    }
    renderBreakdown();
  }

  function populateTrucks() {
    const current = el.truck.value;
    const plates = [...new Set([...trucks.map((item)=>item.plate_number), ...trips.map((item)=>item.truck)].filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'fr',{numeric:true}));
    el.truck.innerHTML = '<option value="">Toute la flotte</option>' + plates.map((plate)=>`<option value="${escapeHtml(plate)}">${escapeHtml(plate)}</option>`).join('');
    el.truck.value = plates.includes(current) ? current : '';
  }

  function exportCsv() {
    const map = expenseMap();
    const rows = selectedTrips().sort((a,b)=>String(b.date).localeCompare(String(a.date)));
    const lines = [['Date','Camion','Chargement','Déchargement','Chiffre d’affaires','Dépenses','Marge']];
    rows.forEach((trip) => { const costs = map.get(String(trip.id)) || 0; const revenue = Number(trip.revenue)||0; lines.push([trip.date,trip.truck,trip.loadingZone,trip.unloadingZone,revenue,costs,revenue-costs]); });
    const csv = '\uFEFF' + lines.map((line)=>line.map((value)=>`"${String(value??'').replaceAll('"','""')}"`).join(';')).join('\n');
    const blob = new Blob([csv],{type:'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rapport-nexis-${el.month.value || 'periode'}${el.truck.value ? '-' + el.truck.value : ''}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function loadData() {
    if (loading) return;
    loading = true;
    el.error.hidden = true;
    try {
      const [tripResult, expenseResult, truckResult] = await Promise.all([
        client.from('trips').select('*').order('date',{ascending:false}),
        client.from('trip_expenses').select('*').order('date',{ascending:false}),
        client.from('trucks').select('plate_number,is_active').order('plate_number',{ascending:true})
      ]);
      if (tripResult.error) throw tripResult.error;
      if (expenseResult.error) throw expenseResult.error;
      if (truckResult.error) throw truckResult.error;
      trips = tripResult.data || [];
      expenses = expenseResult.data || [];
      trucks = truckResult.data || [];
      populateTrucks();
      render();
    } catch (error) {
      console.error('Erreur module rapports :', error);
      el.error.hidden = false;
      el.error.textContent = 'Impossible de charger le rapport.';
      el.body.innerHTML = '<tr><td colspan="7" class="reports-empty">Chargement impossible.</td></tr>';
    } finally { loading = false; }
  }

  el.month.value = currentMonth();
  el.month.addEventListener('change', render);
  el.truck.addEventListener('change', render);
  el.export.addEventListener('click', exportCsv);
  el.print.addEventListener('click', () => window.print());
  window.addEventListener('hashchange', () => { if (location.hash === '#reports') loadData(); });
  window.addEventListener('focus', () => { if (location.hash === '#reports') loadData(); });
  loadData();
})();