(() => {
  'use strict';

  const view = document.getElementById('expenses');
  if (!view || !window.supabase?.createClient) return;

  const client = window.supabase.createClient();
  const formatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
  let trips = [];
  let expenses = [];
  let trucks = [];
  let loading = false;

  const style = document.createElement('style');
  style.textContent = `
    .expenses-page{display:grid;gap:14px}
    .expenses-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:18px}
    .expenses-heading h2{margin:0;font-size:23px;letter-spacing:-.025em}
    .expenses-heading p{margin:6px 0 0;color:#7a8493;font-size:11px}
    .expenses-summary{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}
    .expenses-kpi{background:#fff;border:1px solid #e1e7ef;border-radius:9px;padding:14px 15px;min-width:0}
    .expenses-kpi span,.expenses-kpi strong,.expenses-kpi small{display:block}
    .expenses-kpi span{font-size:9px;color:#7a8493;text-transform:uppercase;letter-spacing:.05em;font-weight:800}
    .expenses-kpi strong{margin-top:7px;font-size:17px;color:#203047;white-space:nowrap}
    .expenses-kpi small{margin-top:5px;font-size:9px;color:#8a94a2}
    .expenses-panel{background:#fff;border:1px solid #e0e6ee;border-radius:10px;padding:16px}
    .expenses-toolbar{display:grid;grid-template-columns:minmax(240px,1fr) 180px 210px auto;gap:9px;align-items:center}
    .expenses-toolbar input,.expenses-toolbar select{height:40px;border:1px solid #cfd7e2;border-radius:7px;background:#fff;padding:0 11px;font:inherit;font-size:11px;color:#243449;outline:none}
    .expenses-toolbar input:focus,.expenses-toolbar select:focus{border-color:#e9983e;box-shadow:0 0 0 3px rgba(255,139,20,.11)}
    .expenses-count{margin-top:11px;font-size:10px;color:#7a8493}
    .expenses-table-wrap{overflow:auto;margin-top:11px;border:1px solid #e7ebf0;border-radius:8px}
    .expenses-table{min-width:1080px}
    .expenses-table th{padding:10px;font-size:9px}
    .expenses-table td{padding:11px 10px;font-size:10px;vertical-align:middle}
    .expenses-trip{font-weight:750;color:#26364a;white-space:nowrap}
    .expenses-plate{display:inline-block;padding:5px 7px;border-radius:6px;background:#eef4fb;color:#26496f;font-weight:800;white-space:nowrap}
    .expenses-money{font-weight:700;white-space:nowrap}
    .expenses-total{font-weight:850;color:#d26d00;white-space:nowrap}
    .expenses-open{border:0;background:transparent;color:#d26d00;font:inherit;font-size:10px;font-weight:800;cursor:pointer;padding:6px 4px}
    .expenses-open:hover{text-decoration:underline}
    .expenses-empty,.expenses-loading{padding:34px;text-align:center;color:#7a8493;font-size:11px}
    .expenses-error{padding:11px 12px;margin-top:11px;border:1px solid #ffd3d6;border-radius:7px;background:#fff1f2;color:#b2373f;font-size:10px}
    .expenses-error[hidden]{display:none}
    @media(max-width:1120px){.expenses-summary{grid-template-columns:repeat(3,minmax(0,1fr))}.expenses-toolbar{grid-template-columns:1fr 180px 190px}.expenses-toolbar .primary{grid-column:1/-1;justify-self:start}}
    @media(max-width:740px){.expenses-heading{align-items:flex-start;flex-direction:column}.expenses-summary{grid-template-columns:1fr}.expenses-toolbar{grid-template-columns:1fr}.expenses-toolbar .primary{grid-column:auto;width:100%}}
  `;
  document.head.appendChild(style);

  view.innerHTML = `
    <div class="expenses-page">
      <div class="expenses-heading">
        <div><h2>Suivi des dépenses</h2><p>Analysez les frais enregistrés sur chaque mission.</p></div>
      </div>
      <div class="expenses-summary">
        <article class="expenses-kpi"><span>Total dépenses</span><strong id="expenses-kpi-total">—</strong><small id="expenses-kpi-total-note">Période sélectionnée</small></article>
        <article class="expenses-kpi"><span>Carburant</span><strong id="expenses-kpi-fuel">—</strong><small id="expenses-kpi-fuel-note">0% des dépenses</small></article>
        <article class="expenses-kpi"><span>Rations</span><strong id="expenses-kpi-ration">—</strong><small id="expenses-kpi-ration-note">0% des dépenses</small></article>
        <article class="expenses-kpi"><span>Rapido / péage</span><strong id="expenses-kpi-rapido">—</strong><small id="expenses-kpi-rapido-note">0% des dépenses</small></article>
        <article class="expenses-kpi"><span>Manœuvre & autres</span><strong id="expenses-kpi-other">—</strong><small id="expenses-kpi-other-note">0% des dépenses</small></article>
      </div>
      <section class="expenses-panel">
        <div class="expenses-toolbar">
          <input id="expenses-search" type="search" placeholder="Rechercher un camion ou un trajet" />
          <input id="expenses-month" type="month" />
          <select id="expenses-truck"><option value="">Tous les camions</option></select>
          <button class="primary" type="button" data-view="new-trip">Nouvelle mission</button>
        </div>
        <div class="expenses-count" id="expenses-count">Chargement…</div>
        <p class="expenses-error" id="expenses-error" hidden></p>
        <div class="expenses-table-wrap">
          <table class="expenses-table">
            <thead><tr><th>Date</th><th>Camion</th><th>Trajet</th><th>Carburant</th><th>Ration</th><th>Rapido</th><th>Manœuvre</th><th>Autres</th><th>Total</th><th></th></tr></thead>
            <tbody id="expenses-body"><tr><td colspan="10" class="expenses-loading">Chargement des dépenses…</td></tr></tbody>
          </table>
        </div>
      </section>
    </div>`;

  const elements = {
    search: document.getElementById('expenses-search'),
    month: document.getElementById('expenses-month'),
    truck: document.getElementById('expenses-truck'),
    count: document.getElementById('expenses-count'),
    body: document.getElementById('expenses-body'),
    error: document.getElementById('expenses-error'),
    total: document.getElementById('expenses-kpi-total'),
    totalNote: document.getElementById('expenses-kpi-total-note'),
    fuel: document.getElementById('expenses-kpi-fuel'),
    fuelNote: document.getElementById('expenses-kpi-fuel-note'),
    ration: document.getElementById('expenses-kpi-ration'),
    rationNote: document.getElementById('expenses-kpi-ration-note'),
    rapido: document.getElementById('expenses-kpi-rapido'),
    rapidoNote: document.getElementById('expenses-kpi-rapido-note'),
    other: document.getElementById('expenses-kpi-other'),
    otherNote: document.getElementById('expenses-kpi-other-note')
  };

  function money(value) {
    return `${formatter.format(Number(value) || 0)} FCFA`;
  }

  function currentMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  function formatDate(value) {
    if (!value) return '—';
    const [year, month, day] = String(value).split('-');
    return year && month && day ? `${day}/${month}/${year}` : value;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function totalOf(item) {
    return ['fuel', 'ration', 'rapido', 'manoeuvre', 'misc']
      .reduce((sum, key) => sum + (Number(item?.[key]) || 0), 0);
  }

  function aggregateExpenses() {
    const tripMap = new Map(trips.map((trip) => [String(trip.id), trip]));
    const grouped = new Map();

    expenses.forEach((expense) => {
      const key = String(expense.trip_id || expense.id || '');
      if (!key) return;
      const trip = tripMap.get(String(expense.trip_id)) || null;
      const current = grouped.get(key) || {
        trip_id: expense.trip_id || null,
        truck: trip?.truck || expense.truck || '—',
        date: trip?.date || expense.date || '',
        loadingZone: trip?.loadingZone || expense.loadingZone || '—',
        unloadingZone: trip?.unloadingZone || expense.unloadingZone || '—',
        revenue: Number(trip?.revenue) || 0,
        fuel: 0,
        ration: 0,
        rapido: 0,
        manoeuvre: 0,
        misc: 0
      };

      ['fuel', 'ration', 'rapido', 'manoeuvre', 'misc'].forEach((field) => {
        current[field] += Number(expense[field]) || 0;
      });
      grouped.set(key, current);
    });

    return [...grouped.values()].map((item) => ({ ...item, total: totalOf(item) }));
  }

  function filteredRows() {
    const query = String(elements.search.value || '').trim().toLowerCase();
    const month = elements.month.value;
    const truck = elements.truck.value;

    return aggregateExpenses()
      .filter((item) => {
        const text = `${item.truck} ${item.loadingZone} ${item.unloadingZone}`.toLowerCase();
        return (!query || text.includes(query)) &&
          (!month || String(item.date).startsWith(month)) &&
          (!truck || item.truck === truck);
      })
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }

  function percent(value, total) {
    return total > 0 ? Math.round((value / total) * 100) : 0;
  }

  function render() {
    const rows = filteredRows();
    const totals = rows.reduce((sum, item) => ({
      total: sum.total + item.total,
      revenue: sum.revenue + item.revenue,
      fuel: sum.fuel + item.fuel,
      ration: sum.ration + item.ration,
      rapido: sum.rapido + item.rapido,
      other: sum.other + item.manoeuvre + item.misc
    }), { total: 0, revenue: 0, fuel: 0, ration: 0, rapido: 0, other: 0 });

    elements.total.textContent = money(totals.total);
    elements.totalNote.textContent = totals.revenue > 0 ? `${percent(totals.total, totals.revenue)}% du chiffre d’affaires` : `${rows.length} mission${rows.length > 1 ? 's' : ''} avec dépenses`;
    elements.fuel.textContent = money(totals.fuel);
    elements.fuelNote.textContent = `${percent(totals.fuel, totals.total)}% des dépenses`;
    elements.ration.textContent = money(totals.ration);
    elements.rationNote.textContent = `${percent(totals.ration, totals.total)}% des dépenses`;
    elements.rapido.textContent = money(totals.rapido);
    elements.rapidoNote.textContent = `${percent(totals.rapido, totals.total)}% des dépenses`;
    elements.other.textContent = money(totals.other);
    elements.otherNote.textContent = `${percent(totals.other, totals.total)}% des dépenses`;
    elements.count.textContent = `${rows.length} mission${rows.length > 1 ? 's' : ''} affichée${rows.length > 1 ? 's' : ''}`;

    if (!rows.length) {
      elements.body.innerHTML = '<tr><td colspan="10" class="expenses-empty">Aucune dépense ne correspond aux filtres.</td></tr>';
      return;
    }

    elements.body.innerHTML = rows.map((item) => `
      <tr>
        <td>${formatDate(item.date)}</td>
        <td><span class="expenses-plate">${escapeHtml(item.truck)}</span></td>
        <td><span class="expenses-trip">${escapeHtml(item.loadingZone)} → ${escapeHtml(item.unloadingZone)}</span></td>
        <td class="expenses-money">${money(item.fuel)}</td>
        <td class="expenses-money">${money(item.ration)}</td>
        <td class="expenses-money">${money(item.rapido)}</td>
        <td class="expenses-money">${money(item.manoeuvre)}</td>
        <td class="expenses-money">${money(item.misc)}</td>
        <td class="expenses-total">${money(item.total)}</td>
        <td>${item.trip_id ? `<button class="expenses-open" type="button" data-open-mission="${escapeHtml(item.trip_id)}">Ouvrir</button>` : '—'}</td>
      </tr>`).join('');
  }

  function populateTrucks() {
    const current = elements.truck.value;
    const plates = [...new Set([
      ...trucks.map((truck) => truck.plate_number),
      ...trips.map((trip) => trip.truck),
      ...expenses.map((expense) => expense.truck)
    ].filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), 'fr', { numeric: true }));

    elements.truck.innerHTML = '<option value="">Tous les camions</option>' + plates
      .map((plate) => `<option value="${escapeHtml(plate)}">${escapeHtml(plate)}</option>`)
      .join('');
    elements.truck.value = plates.includes(current) ? current : '';
  }

  async function loadData() {
    if (loading) return;
    loading = true;
    elements.error.hidden = true;

    try {
      const [tripResult, expenseResult, truckResult] = await Promise.all([
        client.from('trips').select('*').order('date', { ascending: false }),
        client.from('trip_expenses').select('*').order('date', { ascending: false }),
        client.from('trucks').select('plate_number,is_active').order('plate_number', { ascending: true })
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
      console.error('Erreur module dépenses :', error);
      elements.error.hidden = false;
      elements.error.textContent = 'Impossible de charger les dépenses.';
      elements.body.innerHTML = '<tr><td colspan="10" class="expenses-empty">Chargement impossible.</td></tr>';
    } finally {
      loading = false;
    }
  }

  elements.month.value = currentMonth();
  [elements.search, elements.month, elements.truck].forEach((input) => {
    input.addEventListener('input', render);
    input.addEventListener('change', render);
  });

  window.addEventListener('hashchange', () => {
    if (location.hash === '#expenses') loadData();
  });
  window.addEventListener('focus', () => {
    if (location.hash === '#expenses') loadData();
  });

  loadData();
})();