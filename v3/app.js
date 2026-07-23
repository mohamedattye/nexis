(() => {
  'use strict';

  const SUPABASE_URL = 'https://ifspadsghwizzjofcscf.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_XN7xuh4te5IypVwI0UySvg_A9qCUlTK';

  const titles = {
    dashboard: ['Vue synthétique', 'Tableau de bord'],
    'new-trip': ['Saisie opérationnelle', 'Créer une mission'],
    trips: ['Suivi opérationnel', 'Centre des missions'],
    fleet: ['Gestion de flotte', 'Flotte'],
    expenses: ['Suivi financier', 'Dépenses'],
    reports: ['Analyse', 'Rapports']
  };

  const formatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
  const monthFormatter = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });

  let client = null;
  let trips = [];
  let tripExpenses = [];
  let trucks = [];
  let isSaving = false;

  const byId = (id) => document.getElementById(id);

  const elements = {
    syncState: byId('sync-state'),
    periodLabel: byId('period-label'),
    revenue: byId('kpi-revenue'),
    revenueNote: byId('kpi-revenue-note'),
    expenses: byId('kpi-expenses'),
    expensesNote: byId('kpi-expenses-note'),
    profit: byId('kpi-profit'),
    profitNote: byId('kpi-profit-note'),
    count: byId('kpi-count'),
    countNote: byId('kpi-count-note'),
    recentBody: byId('recent-missions-body'),
    alerts: byId('alerts-container'),
    alertCount: byId('alert-count'),
    missionsBody: byId('missions-body'),
    resultCount: byId('missions-result-count'),
    search: byId('mission-search'),
    month: byId('mission-month'),
    truckFilter: byId('mission-truck-filter'),
    form: byId('mission-form'),
    truck: byId('mission-truck'),
    date: byId('mission-date'),
    loadingZone: byId('mission-loading-zone'),
    unloadingZone: byId('mission-unloading-zone'),
    missionRevenue: byId('mission-revenue'),
    routePreview: byId('mission-route-preview'),
    revenuePreview: byId('mission-revenue-preview'),
    formError: byId('mission-form-error'),
    submit: byId('mission-submit'),
    toast: byId('toast')
  };

  function showView(viewId) {
    const target = byId(viewId);
    if (!target) return;

    document.querySelectorAll('.view').forEach((view) => {
      view.classList.toggle('active', view.id === viewId);
    });

    document.querySelectorAll('.nav-item').forEach((button) => {
      button.classList.toggle('active', button.dataset.view === viewId);
    });

    const [eyebrow, title] = titles[viewId] || titles.dashboard;
    byId('eyebrow').textContent = eyebrow;
    byId('page-title').textContent = title;
    history.replaceState(null, '', `#${viewId}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function setSyncState(label, state = 'loading') {
    if (!elements.syncState) return;
    elements.syncState.textContent = label;
    elements.syncState.dataset.state = state;
  }

  function money(value) {
    return `${formatter.format(Number(value) || 0)} FCFA`;
  }

  function formatDate(value) {
    if (!value) return '—';
    const [year, month, day] = String(value).split('-');
    if (!year || !month || !day) return value;
    return `${day}/${month}/${year}`;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function currentMonthValue() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${now.getFullYear()}-${month}`;
  }

  function expenseTotal(expense) {
    return ['fuel', 'ration', 'rapido', 'manoeuvre', 'misc']
      .reduce((sum, key) => sum + (Number(expense?.[key]) || 0), 0);
  }

  function expenseTotalsByTrip() {
    const totals = new Map();
    tripExpenses.forEach((expense) => {
      const key = String(expense.trip_id || '').trim();
      if (!key) return;
      totals.set(key, (totals.get(key) || 0) + expenseTotal(expense));
    });
    return totals;
  }

  function enrichTrips(sourceTrips = trips) {
    const totals = expenseTotalsByTrip();
    return sourceTrips.map((trip) => {
      const expense = totals.get(String(trip.id || '').trim()) || 0;
      const revenue = Number(trip.revenue) || 0;
      return { ...trip, expense, margin: revenue - expense };
    });
  }

  function routeLabel(trip) {
    return `${trip.loadingZone || '—'} → ${trip.unloadingZone || '—'}`;
  }

  function showToast(message, type = 'success') {
    if (!elements.toast) return;
    elements.toast.textContent = message;
    elements.toast.dataset.type = type;
    elements.toast.classList.add('visible');
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => elements.toast.classList.remove('visible'), 3200);
  }

  function renderDashboard() {
    const month = currentMonthValue();
    const monthlyTrips = enrichTrips(trips.filter((trip) => String(trip.date || '').startsWith(month)));
    const revenue = monthlyTrips.reduce((sum, trip) => sum + (Number(trip.revenue) || 0), 0);
    const expenses = monthlyTrips.reduce((sum, trip) => sum + trip.expense, 0);
    const profit = revenue - expenses;
    const marginRate = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;

    elements.periodLabel.textContent = monthFormatter.format(new Date(`${month}-01T12:00:00`));
    elements.revenue.textContent = money(revenue);
    elements.revenueNote.textContent = `${monthlyTrips.length} mission${monthlyTrips.length > 1 ? 's' : ''} sur la période`;
    elements.expenses.textContent = money(expenses);
    elements.expensesNote.textContent = revenue > 0 ? `${Math.round((expenses / revenue) * 100)}% du chiffre d'affaires` : 'Aucune dépense enregistrée';
    elements.profit.textContent = money(profit);
    elements.profit.classList.toggle('negative', profit < 0);
    elements.profitNote.textContent = `Marge opérationnelle : ${marginRate}%`;
    elements.count.textContent = String(monthlyTrips.length);
    elements.countNote.textContent = `${trips.length} mission${trips.length > 1 ? 's' : ''} au total`;

    const recent = enrichTrips([...trips]
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
      .slice(0, 5));

    if (!recent.length) {
      elements.recentBody.innerHTML = '<tr><td colspan="5" class="table-message">Aucune mission enregistrée.</td></tr>';
    } else {
      elements.recentBody.innerHTML = recent.map((trip) => `
        <tr>
          <td>${formatDate(trip.date)}</td>
          <td><span class="truck-badge">${escapeHtml(trip.truck || '—')}</span></td>
          <td>${escapeHtml(routeLabel(trip))}</td>
          <td><span class="status done">Enregistrée</span></td>
          <td class="${trip.margin < 0 ? 'negative' : 'positive'}">${money(trip.margin)}</td>
        </tr>
      `).join('');
    }

    const negativeTrips = monthlyTrips.filter((trip) => trip.margin < 0);
    elements.alertCount.textContent = String(negativeTrips.length);

    if (!negativeTrips.length) {
      elements.alerts.className = 'empty-state';
      elements.alerts.innerHTML = '<strong>Aucune alerte critique</strong><span>Aucune mission à marge négative sur la période en cours.</span>';
    } else {
      elements.alerts.className = 'alert-list';
      elements.alerts.innerHTML = negativeTrips.slice(0, 4).map((trip) => `
        <article>
          <span class="alert-dot warning"></span>
          <div><strong>Marge négative · ${escapeHtml(trip.truck || 'Camion')}</strong><small>${escapeHtml(routeLabel(trip))} · ${money(trip.margin)}</small></div>
        </article>
      `).join('');
    }
  }

  function getFilteredTrips() {
    const query = String(elements.search?.value || '').trim().toLowerCase();
    const month = elements.month?.value || '';
    const truck = elements.truckFilter?.value || '';

    return enrichTrips(trips)
      .filter((trip) => {
        const haystack = `${trip.truck || ''} ${trip.loadingZone || ''} ${trip.unloadingZone || ''}`.toLowerCase();
        const queryMatch = !query || haystack.includes(query);
        const monthMatch = !month || String(trip.date || '').startsWith(month);
        const truckMatch = !truck || String(trip.truck || '') === truck;
        return queryMatch && monthMatch && truckMatch;
      })
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  }

  function renderMissions() {
    const filtered = getFilteredTrips();
    elements.resultCount.textContent = `${filtered.length} mission${filtered.length > 1 ? 's' : ''} affichée${filtered.length > 1 ? 's' : ''}`;

    if (!filtered.length) {
      elements.missionsBody.innerHTML = '<tr><td colspan="7" class="table-message">Aucune mission ne correspond aux filtres.</td></tr>';
      return;
    }

    elements.missionsBody.innerHTML = filtered.map((trip) => `
      <tr>
        <td>${formatDate(trip.date)}</td>
        <td><span class="truck-badge">${escapeHtml(trip.truck || '—')}</span></td>
        <td>${escapeHtml(routeLabel(trip))}</td>
        <td>${money(trip.revenue)}</td>
        <td>${money(trip.expense)}</td>
        <td class="${trip.margin < 0 ? 'negative' : 'positive'}">${money(trip.margin)}</td>
        <td><button type="button" class="text-action" data-open-mission="${escapeHtml(trip.id)}">Ouvrir</button></td>
      </tr>
    `).join('');
  }

  function populateTruckOptions() {
    const plates = [...new Set([
      ...trucks.map((truck) => truck.plate_number),
      ...trips.map((trip) => trip.truck)
    ].filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), 'fr', { numeric: true }));

    elements.truck.innerHTML = '<option value="">Sélectionner un camion</option>' + plates
      .map((plate) => `<option value="${escapeHtml(plate)}">${escapeHtml(plate)}</option>`)
      .join('');

    const selectedFilter = elements.truckFilter.value;
    elements.truckFilter.innerHTML = '<option value="">Tous les camions</option>' + plates
      .map((plate) => `<option value="${escapeHtml(plate)}">${escapeHtml(plate)}</option>`)
      .join('');
    elements.truckFilter.value = plates.includes(selectedFilter) ? selectedFilter : '';
  }

  function updateMissionPreview() {
    const loading = elements.loadingZone.value.trim();
    const unloading = elements.unloadingZone.value.trim();
    elements.routePreview.textContent = loading || unloading ? `${loading || 'Départ'} → ${unloading || 'Destination'}` : 'Trajet à définir';
    elements.revenuePreview.textContent = money(elements.missionRevenue.value);
  }

  function displayFormError(message = '') {
    elements.formError.textContent = message;
    elements.formError.hidden = !message;
  }

  async function saveMission(event) {
    event.preventDefault();
    if (isSaving) return;

    const values = {
      truck: elements.truck.value.trim().toUpperCase(),
      date: elements.date.value,
      loadingZone: elements.loadingZone.value.trim(),
      unloadingZone: elements.unloadingZone.value.trim(),
      revenue: Number(elements.missionRevenue.value)
    };

    if (!values.truck || !values.date || !values.loadingZone || !values.unloadingZone || !Number.isFinite(values.revenue) || values.revenue < 0) {
      displayFormError('Veuillez compléter le camion, la date, le trajet et un montant valide.');
      return;
    }

    const duplicateExists = trips.some((trip) =>
      String(trip.truck || '').trim().toUpperCase() === values.truck &&
      String(trip.date || '') === values.date &&
      String(trip.loadingZone || '').trim().toUpperCase() === values.loadingZone.toUpperCase() &&
      String(trip.unloadingZone || '').trim().toUpperCase() === values.unloadingZone.toUpperCase() &&
      Number(trip.revenue || 0) === values.revenue
    );

    if (duplicateExists) {
      displayFormError('Cette mission existe déjà avec le même camion, la même date, le même trajet et le même montant.');
      return;
    }

    const submissionToken = crypto.randomUUID();
    const mission = { id: submissionToken, submission_token: submissionToken, ...values };

    isSaving = true;
    displayFormError('');
    elements.submit.disabled = true;
    elements.submit.textContent = 'Enregistrement…';

    try {
      const { data, error } = await client.from('trips').insert([mission]).select().single();
      if (error) throw error;

      trips.unshift(data || mission);
      populateTruckOptions();
      renderDashboard();
      renderMissions();
      elements.form.reset();
      setFormDefaults();
      updateMissionPreview();
      showToast('Mission enregistrée avec succès.');
      showView('trips');
    } catch (error) {
      console.error('Erreur enregistrement mission :', error);
      if (error?.code === '23505') {
        displayFormError('Cette mission a déjà été enregistrée.');
      } else {
        displayFormError("Impossible d'enregistrer la mission. Vérifiez la connexion puis réessayez.");
      }
      showToast("Échec de l'enregistrement.", 'error');
    } finally {
      isSaving = false;
      elements.submit.disabled = false;
      elements.submit.textContent = 'Enregistrer la mission';
    }
  }

  async function loadTrips() {
    const { data, error } = await client.from('trips').select('*').order('date', { ascending: false });
    if (error) throw error;
    trips = data || [];
  }

  async function loadExpenses() {
    const { data, error } = await client.from('trip_expenses').select('*');
    if (error) throw error;
    tripExpenses = data || [];
  }

  async function loadTrucks() {
    const { data, error } = await client.from('trucks').select('plate_number,is_active').order('plate_number', { ascending: true });
    if (error) {
      console.warn('Table camions indisponible, utilisation de l’historique des missions :', error);
      trucks = [];
      return;
    }
    trucks = (data || []).filter((truck) => truck.is_active !== false);
  }

  async function loadData() {
    setSyncState('Synchronisation…', 'loading');

    const results = await Promise.allSettled([loadTrips(), loadExpenses(), loadTrucks()]);
    const criticalErrors = results.slice(0, 2).filter((result) => result.status === 'rejected');

    if (criticalErrors.length) {
      criticalErrors.forEach((result) => console.error('Erreur de synchronisation :', result.reason));
      setSyncState('Connexion impossible', 'error');
      elements.recentBody.innerHTML = '<tr><td colspan="5" class="table-message error-message">Impossible de charger les données.</td></tr>';
      elements.missionsBody.innerHTML = '<tr><td colspan="7" class="table-message error-message">Impossible de charger les données.</td></tr>';
      showToast('Connexion aux données impossible.', 'error');
      return;
    }

    populateTruckOptions();
    renderDashboard();
    renderMissions();
    setSyncState('Données à jour', 'success');
  }

  function setFormDefaults() {
    if (!elements.date.value) {
      elements.date.value = new Date().toISOString().slice(0, 10);
    }
    if (!elements.month.value) {
      elements.month.value = currentMonthValue();
    }
  }

  function bindEvents() {
    document.querySelectorAll('[data-view]').forEach((button) => {
      button.addEventListener('click', () => showView(button.dataset.view));
    });

    [elements.search, elements.month, elements.truckFilter].forEach((input) => {
      input?.addEventListener('input', renderMissions);
      input?.addEventListener('change', renderMissions);
    });

    [elements.loadingZone, elements.unloadingZone, elements.missionRevenue].forEach((input) => {
      input?.addEventListener('input', updateMissionPreview);
    });

    elements.form?.addEventListener('submit', saveMission);
    elements.form?.addEventListener('reset', () => {
      window.setTimeout(() => {
        setFormDefaults();
        displayFormError('');
        updateMissionPreview();
      }, 0);
    });

    elements.missionsBody?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-open-mission]');
      if (button) showToast('La fiche détaillée de mission arrive dans la prochaine étape.', 'info');
    });
  }

  async function init() {
    bindEvents();
    setFormDefaults();
    updateMissionPreview();

    const requestedView = location.hash.replace('#', '');
    showView(byId(requestedView) ? requestedView : 'dashboard');

    if (!window.supabase?.createClient) {
      setSyncState('Module indisponible', 'error');
      showToast('Le module de connexion n’a pas pu être chargé.', 'error');
      return;
    }

    client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    await loadData();
  }

  init().catch((error) => {
    console.error('Erreur initialisation Nexis V3 :', error);
    setSyncState('Erreur de démarrage', 'error');
    showToast('Nexis V3 n’a pas pu démarrer correctement.', 'error');
  });
})();