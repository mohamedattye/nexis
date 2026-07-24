(() => {
  'use strict';

  const root = document.getElementById('fleet');
  if (!root || !window.supabase?.createClient) return;

  const client = window.supabase.createClient();
  const money = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

  root.innerHTML = `
    <div class="fleet-page">
      <div class="fleet-head">
        <div><h2>Flotte</h2><p>Suivez l'activité et la rentabilité de chaque camion.</p></div>
      </div>
      <div class="fleet-kpis">
        <article class="fleet-kpi"><span>Camions actifs</span><strong id="fleet-active-count">—</strong><small>Disponibles pour les missions</small></article>
        <article class="fleet-kpi"><span>Missions du mois</span><strong id="fleet-trip-count">—</strong><small>Activité totale de la flotte</small></article>
        <article class="fleet-kpi"><span>Chiffre d'affaires</span><strong id="fleet-revenue">—</strong><small>Période en cours</small></article>
        <article class="fleet-kpi"><span>Marge flotte</span><strong id="fleet-margin">—</strong><small>Après dépenses de mission</small></article>
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
            <thead><tr><th>Camion</th><th>Statut</th><th>Missions</th><th>Chiffre d'affaires</th><th>Dépenses</th><th>Marge</th><th>Dernière mission</th><th></th></tr></thead>
            <tbody id="fleet-body"><tr><td colspan="8" class="fleet-loading">Chargement de la flotte…</td></tr></tbody>
          </table>
        </div>
      </section>
    </div>`;

  const els = {
    activeCount: document.getElementById('fleet-active-count'),
    tripCount: document.getElementById('fleet-trip-count'),
    revenue: document.getElementById('fleet-revenue'),
    margin: document.getElementById('fleet-margin'),
    search: document.getElementById('fleet-search'),
    status: document.getElementById('fleet-status-filter'),
    toggle: document.getElementById('fleet-add-toggle'),
    addWrap: document.getElementById('fleet-add-wrap'),
    addForm: document.getElementById('fleet-add-form'),
    cancel: document.getElementById('fleet-add-cancel'),
    plate: document.getElementById('fleet-new-plate'),
    error: document.getElementById('fleet-error'),
    body: document.getElementById('fleet-body')
  };

  let trucks = [];
  let trips = [];
  let expenses = [];

  function currentMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  function formatMoney(value) {
    return `${money.format(Number(value) || 0)} FCFA`;
  }

  function formatDate(value) {
    if (!value) return '—';
    const [y, m, d] = String(value).split('-');
    return y && m && d ? `${d}/${m}/${y}` : value;
  }

  function expenseTotal(expense) {
    return ['fuel', 'ration', 'rapido', 'manoeuvre', 'misc']
      .reduce((sum, key) => sum + (Number(expense?.[key]) || 0), 0);
  }

  function dataByTruck() {
    const month = currentMonth();
    return trucks.map((truck) => {
      const relatedTrips = trips.filter((trip) => trip.truck === truck.plate_number && String(trip.date || '').startsWith(month));
      const relatedIds = new Set(relatedTrips.map((trip) => String(trip.id)));
      const relatedExpenses = expenses.filter((expense) => relatedIds.has(String(expense.trip_id)));
      const revenue = relatedTrips.reduce((sum, trip) => sum + (Number(trip.revenue) || 0), 0);
      const expense = relatedExpenses.reduce((sum, item) => sum + expenseTotal(item), 0);
      const lastTrip = [...relatedTrips].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))[0];
      return {
        plate: truck.plate_number,
        active: truck.is_active !== false,
        missions: relatedTrips.length,
        revenue,
        expense,
        margin: revenue - expense,
        lastTrip: lastTrip?.date || null
      };
    });
  }

  function render() {
    const rows = dataByTruck();
    const query = String(els.search.value || '').trim().toLowerCase();
    const status = els.status.value;
    const filtered = rows.filter((row) => {
      const queryMatch = !query || row.plate.toLowerCase().includes(query);
      const statusMatch = !status || (status === 'active' ? row.active : !row.active);
      return queryMatch && statusMatch;
    });

    els.activeCount.textContent = String(rows.filter((row) => row.active).length);
    els.tripCount.textContent = String(rows.reduce((sum, row) => sum + row.missions, 0));
    els.revenue.textContent = formatMoney(rows.reduce((sum, row) => sum + row.revenue, 0));
    const totalMargin = rows.reduce((sum, row) => sum + row.margin, 0);
    els.margin.textContent = formatMoney(totalMargin);
    els.margin.classList.toggle('negative', totalMargin < 0);

    if (!filtered.length) {
      els.body.innerHTML = '<tr><td colspan="8" class="fleet-empty">Aucun camion ne correspond aux filtres.</td></tr>';
      return;
    }

    els.body.innerHTML = filtered.map((row) => `
      <tr>
        <td><span class="fleet-plate">${row.plate}</span></td>
        <td><span class="fleet-status ${row.active ? 'active' : 'inactive'}">${row.active ? 'Actif' : 'Inactif'}</span></td>
        <td>${row.missions}</td>
        <td>${formatMoney(row.revenue)}</td>
        <td>${formatMoney(row.expense)}</td>
        <td class="fleet-money ${row.margin < 0 ? 'negative' : 'positive'}">${formatMoney(row.margin)}</td>
        <td>${formatDate(row.lastTrip)}</td>
        <td><div class="fleet-actions"><button type="button" class="fleet-action ${row.active ? 'warn' : ''}" data-toggle-truck="${row.plate}" data-active="${row.active}">${row.active ? 'Désactiver' : 'Activer'}</button></div></td>
      </tr>`).join('');
  }

  async function load() {
    els.body.innerHTML = '<tr><td colspan="8" class="fleet-loading">Chargement de la flotte…</td></tr>';
    const [trucksResult, tripsResult, expensesResult] = await Promise.all([
      client.from('trucks').select('*').order('plate_number'),
      client.from('trips').select('*'),
      client.from('trip_expenses').select('*')
    ]);

    if (trucksResult.error || tripsResult.error || expensesResult.error) {
      console.error(trucksResult.error || tripsResult.error || expensesResult.error);
      els.body.innerHTML = '<tr><td colspan="8" class="fleet-empty">Impossible de charger la flotte.</td></tr>';
      return;
    }

    trucks = trucksResult.data || [];
    trips = tripsResult.data || [];
    expenses = expensesResult.data || [];
    render();
  }

  function showError(message = '') {
    els.error.textContent = message;
    els.error.hidden = !message;
  }

  els.toggle.addEventListener('click', () => {
    els.addWrap.hidden = !els.addWrap.hidden;
    showError('');
    if (!els.addWrap.hidden) els.plate.focus();
  });

  els.cancel.addEventListener('click', () => {
    els.addWrap.hidden = true;
    els.addForm.reset();
    showError('');
  });

  els.addForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const plate = els.plate.value.trim().toUpperCase();
    if (!plate) return showError('Saisissez une immatriculation.');

    const duplicate = trucks.some((truck) => truck.plate_number === plate);
    if (duplicate) return showError('Ce camion existe déjà.');

    const submit = els.addForm.querySelector('button[type="submit"]');
    submit.disabled = true;
    submit.textContent = 'Enregistrement…';
    const { error } = await client.from('trucks').insert([{ plate_number: plate, is_active: true }]);
    submit.disabled = false;
    submit.textContent = 'Enregistrer';

    if (error) return showError("Impossible d'ajouter le camion.");
    els.addForm.reset();
    els.addWrap.hidden = true;
    await load();
  });

  els.body.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-toggle-truck]');
    if (!button) return;
    button.disabled = true;
    const plate = button.dataset.toggleTruck;
    const nextState = button.dataset.active !== 'true';
    const { error } = await client.from('trucks').update({ is_active: nextState }).eq('plate_number', plate);
    if (error) {
      button.disabled = false;
      return;
    }
    await load();
  });

  [els.search, els.status].forEach((input) => {
    input.addEventListener('input', render);
    input.addEventListener('change', render);
  });

  const fleetNav = document.querySelector('[data-view="fleet"]');
  fleetNav?.addEventListener('click', () => window.setTimeout(load, 0));
  load();
})();