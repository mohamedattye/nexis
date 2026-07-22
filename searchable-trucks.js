(() => {
  const inputIds = ['truck', 'cost-truck', 'truck-filter'];
  const inputs = inputIds
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  if (!inputs.length) return;

  const datalist = document.createElement('datalist');
  datalist.id = 'nexis-truck-options';
  document.body.appendChild(datalist);

  inputs.forEach((input) => {
    input.setAttribute('list', datalist.id);
    input.setAttribute('autocomplete', 'off');
  });

  const normalizePlate = (value) =>
    String(value || '')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, ' ');

  const knownPlates = new Set();

  function renderOptions() {
    const plates = [...knownPlates]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, 'fr', { numeric: true }));

    datalist.replaceChildren(
      ...plates.map((plate) => {
        const option = document.createElement('option');
        option.value = plate;
        return option;
      })
    );
  }

  function addPlates(values) {
    let changed = false;

    values.forEach((value) => {
      const plate = normalizePlate(value);
      if (plate && !knownPlates.has(plate)) {
        knownPlates.add(plate);
        changed = true;
      }
    });

    if (changed) renderOptions();
  }

  function readPlatesFromCurrentTrips() {
    try {
      if (Array.isArray(trips)) {
        addPlates(trips.map((trip) => trip?.truck));
      }
    } catch (_) {
      // Les courses peuvent ne pas être chargées au démarrage.
    }
  }

  async function loadPlatesFromSupabase() {
    try {
      const { data, error } = await supabaseClient
        .from('trucks')
        .select('plate_number,is_active')
        .order('plate_number', { ascending: true });

      if (error) throw error;

      addPlates(
        (data || [])
          .filter((truck) => truck.is_active !== false)
          .map((truck) => truck.plate_number)
      );
    } catch (error) {
      console.warn('Liste des camions indisponible, utilisation de l’historique :', error);
    }
  }

  ['truck', 'cost-truck'].forEach((id) => {
    const input = document.getElementById(id);
    if (!input) return;

    input.addEventListener('blur', () => {
      input.value = normalizePlate(input.value);
    });
  });

  loadPlatesFromSupabase();
  readPlatesFromCurrentTrips();

  // Les courses Supabase sont chargées après l’ouverture de la page.
  // Quelques vérifications légères permettent d’ajouter leurs camions sans boucle permanente.
  [500, 1500, 3000].forEach((delay) => {
    window.setTimeout(readPlatesFromCurrentTrips, delay);
  });
})();

(() => {
  if (document.querySelector('script[data-nexis-fast-trip-save]')) return;

  const script = document.createElement('script');
  script.src = 'fast-trip-save.js';
  script.defer = true;
  script.dataset.nexisFastTripSave = 'true';
  document.body.appendChild(script);
})();

(() => {
  if (document.querySelector('script[data-nexis-quick-navigation]')) return;

  const script = document.createElement('script');
  script.src = 'quick-navigation.js';
  script.defer = true;
  script.dataset.nexisQuickNavigation = 'true';
  document.body.appendChild(script);
})();

(() => {
  if (document.querySelector('script[data-nexis-move-eco-results]')) return;

  const script = document.createElement('script');
  script.src = 'move-eco-results.js';
  script.defer = true;
  script.dataset.nexisMoveEcoResults = 'true';
  document.body.appendChild(script);
})();
