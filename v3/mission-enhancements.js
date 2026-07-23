(() => {
  'use strict';

  const SUPABASE_URL = 'https://ifspadsghwizzjofcscf.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_XN7xuh4te5IypVwI0UySvg_A9qCUlTK';
  const formatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

  const byId = (id) => document.getElementById(id);
  const truck = byId('mission-truck');
  const date = byId('mission-date');
  const loading = byId('mission-loading-zone');
  const unloading = byId('mission-unloading-zone');
  const revenue = byId('mission-revenue');
  const truckPreview = byId('mission-truck-preview');
  const datePreview = byId('mission-date-preview');
  const routePreview = byId('mission-route-preview');
  const revenuePreview = byId('mission-revenue-preview');
  const progressLabel = byId('mission-progress-label');
  const progressBar = byId('mission-progress-bar');
  const frequentRoutes = byId('frequent-routes');
  const zoneOptions = byId('mission-zone-options');
  const lastMissionHelper = byId('last-mission-helper');

  if (!truck || !date || !loading || !unloading || !revenue) return;

  const money = (value) => `${formatter.format(Number(value) || 0)} FCFA`;
  const formatDate = (value) => {
    if (!value) return 'À définir';
    const [year, month, day] = String(value).split('-');
    return year && month && day ? `${day}/${month}/${year}` : value;
  };
  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  function updatePreview() {
    truckPreview.textContent = truck.value || 'À sélectionner';
    datePreview.textContent = formatDate(date.value);
    routePreview.textContent = loading.value.trim() || unloading.value.trim()
      ? `${loading.value.trim() || 'Départ'} → ${unloading.value.trim() || 'Destination'}`
      : 'Trajet à définir';
    revenuePreview.textContent = money(revenue.value);

    const completed = [truck.value, date.value, loading.value.trim() && unloading.value.trim(), Number(revenue.value) > 0]
      .filter(Boolean).length;
    progressLabel.textContent = `${completed}/4`;
    progressBar.style.width = `${Math.max(8, completed * 25)}%`;
  }

  function applyMission(trip, keepDate = false) {
    truck.value = trip.truck || '';
    loading.value = trip.loadingZone || '';
    unloading.value = trip.unloadingZone || '';
    revenue.value = Number(trip.revenue) || '';
    if (!keepDate) date.value = new Date().toISOString().slice(0, 10);
    updatePreview();
    loading.focus();
  }

  function renderFrequentRoutes(trips) {
    if (!frequentRoutes) return;
    const groups = new Map();

    trips.forEach((trip) => {
      const loadingZone = String(trip.loadingZone || '').trim();
      const unloadingZone = String(trip.unloadingZone || '').trim();
      if (!loadingZone || !unloadingZone) return;
      const key = `${loadingZone.toUpperCase()}|||${unloadingZone.toUpperCase()}`;
      const current = groups.get(key) || { loadingZone, unloadingZone, count: 0, revenue: 0, lastDate: '' };
      current.count += 1;
      if (String(trip.date || '') >= current.lastDate) {
        current.lastDate = String(trip.date || '');
        current.revenue = Number(trip.revenue) || 0;
      }
      groups.set(key, current);
    });

    const suggestions = [...groups.values()]
      .sort((a, b) => b.count - a.count || b.lastDate.localeCompare(a.lastDate))
      .slice(0, 4);

    if (!suggestions.length) {
      frequentRoutes.innerHTML = '<span class="helper-loading">Les trajets fréquents apparaîtront après quelques missions.</span>';
      return;
    }

    frequentRoutes.innerHTML = suggestions.map((item, index) => `
      <button type="button" class="route-chip" data-route-index="${index}">
        <strong>${escapeHtml(item.loadingZone)} → ${escapeHtml(item.unloadingZone)}</strong>
        <small>${item.count} mission${item.count > 1 ? 's' : ''} · dernier tarif ${money(item.revenue)}</small>
      </button>
    `).join('');

    frequentRoutes.querySelectorAll('[data-route-index]').forEach((button) => {
      button.addEventListener('click', () => {
        const item = suggestions[Number(button.dataset.routeIndex)];
        if (!item) return;
        loading.value = item.loadingZone;
        unloading.value = item.unloadingZone;
        revenue.value = item.revenue || '';
        updatePreview();
      });
    });
  }

  function renderZones(trips) {
    if (!zoneOptions) return;
    const zones = [...new Set(trips.flatMap((trip) => [trip.loadingZone, trip.unloadingZone]).filter(Boolean))]
      .sort((a, b) => String(a).localeCompare(String(b), 'fr'));
    zoneOptions.innerHTML = zones.map((zone) => `<option value="${escapeHtml(zone)}"></option>`).join('');
  }

  function renderLastMission(trips) {
    if (!lastMissionHelper) return;
    const lastTrip = [...trips].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))[0];
    if (!lastTrip) {
      lastMissionHelper.textContent = 'Aucune mission précédente disponible.';
      return;
    }

    lastMissionHelper.className = 'reuse-card';
    lastMissionHelper.innerHTML = `
      <strong>${escapeHtml(lastTrip.truck || 'Camion')} · ${escapeHtml(lastTrip.loadingZone || '—')} → ${escapeHtml(lastTrip.unloadingZone || '—')}</strong>
      <span>${formatDate(lastTrip.date)} · ${money(lastTrip.revenue)}</span>
      <button type="button" class="secondary" id="reuse-last-mission">Réutiliser cette mission</button>
    `;
    byId('reuse-last-mission')?.addEventListener('click', () => applyMission(lastTrip));
  }

  async function loadEnhancements() {
    if (!window.supabase?.createClient) return;
    try {
      const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { data, error } = await client.from('trips').select('truck,date,loadingZone,unloadingZone,revenue').order('date', { ascending: false });
      if (error) throw error;
      const trips = data || [];
      renderFrequentRoutes(trips);
      renderZones(trips);
      renderLastMission(trips);
    } catch (error) {
      console.warn('Suggestions de mission indisponibles :', error);
      if (frequentRoutes) frequentRoutes.innerHTML = '<span class="helper-loading">Suggestions temporairement indisponibles.</span>';
      if (lastMissionHelper) lastMissionHelper.textContent = 'Dernière mission temporairement indisponible.';
    }
  }

  [truck, date, loading, unloading, revenue].forEach((input) => {
    input.addEventListener('input', updatePreview);
    input.addEventListener('change', updatePreview);
  });

  document.getElementById('mission-form')?.addEventListener('reset', () => {
    window.setTimeout(updatePreview, 0);
  });

  updatePreview();
  loadEnhancements();
})();