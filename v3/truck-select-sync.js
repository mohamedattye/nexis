(() => {
  'use strict';

  const select = document.getElementById('mission-truck');
  if (!select || !window.supabase?.createClient) return;

  const client = window.supabase.createClient();
  let syncing = false;

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  async function syncActiveTrucks() {
    if (syncing) return;
    syncing = true;

    const previousValue = select.value;

    try {
      const { data, error } = await client
        .from('trucks')
        .select('plate_number,is_active')
        .eq('is_active', true)
        .order('plate_number', { ascending: true });

      if (error) throw error;

      const plates = [...new Set((data || [])
        .map((truck) => String(truck.plate_number || '').trim().toUpperCase())
        .filter(Boolean))];

      select.innerHTML = '<option value="">Sélectionner un camion</option>' + plates
        .map((plate) => `<option value="${escapeHtml(plate)}">${escapeHtml(plate)}</option>`)
        .join('');

      select.value = plates.includes(previousValue) ? previousValue : '';
      select.dispatchEvent(new CustomEvent('nexis:trucks-synced', {
        bubbles: true,
        detail: { plates }
      }));
    } catch (error) {
      console.error('Impossible de synchroniser les camions actifs :', error);
    } finally {
      syncing = false;
    }
  }

  function isNewTripViewRequested(target) {
    return target?.closest?.('[data-view="new-trip"]') || location.hash === '#new-trip';
  }

  document.addEventListener('click', (event) => {
    if (!isNewTripViewRequested(event.target)) return;
    window.setTimeout(syncActiveTrucks, 0);
  }, true);

  window.addEventListener('hashchange', () => {
    if (location.hash === '#new-trip') syncActiveTrucks();
  });

  window.addEventListener('focus', () => {
    if (location.hash === '#new-trip') syncActiveTrucks();
  });

  document.addEventListener('nexis:fleet-updated', syncActiveTrucks);

  if (location.hash === '#new-trip') syncActiveTrucks();
})();