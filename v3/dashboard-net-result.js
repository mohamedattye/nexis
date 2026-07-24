(() => {
  'use strict';

  const dashboard = document.getElementById('dashboard');
  const grid = dashboard?.querySelector('.kpi-grid');
  if (!dashboard || !grid || !window.supabase?.createClient) return;

  const client = window.supabase.createClient();
  const formatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

  function money(value) {
    return `${formatter.format(Number(value) || 0)} FCFA`;
  }

  function currentMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  function chargeTotal(item) {
    return ['maintenance', 'repairs', 'insurance', 'technical_visit', 'driver_cost', 'financing', 'other']
      .reduce((sum, key) => sum + (Number(item?.[key]) || 0), 0);
  }

  let card = document.getElementById('kpi-net-result-card');
  if (!card) {
    card = document.createElement('article');
    card.className = 'kpi-card';
    card.id = 'kpi-net-result-card';
    card.innerHTML = '<div class="kpi-top"><span>Résultat net</span></div><strong id="kpi-net-result">—</strong><small id="kpi-net-result-note">Chargement des charges véhicules</small>';
    grid.appendChild(card);
  }

  const value = document.getElementById('kpi-net-result');
  const note = document.getElementById('kpi-net-result-note');
  const profit = document.getElementById('kpi-profit');

  async function refresh() {
    const month = currentMonth();
    try {
      const { data, error } = await client
        .from('vehicle_charges')
        .select('*')
        .gte('month', `${month}-01`)
        .lt('month', nextMonthDate(month));

      if (error) throw error;

      const charges = (data || []).reduce((sum, item) => sum + chargeTotal(item), 0);
      const operatingMargin = parseMoney(profit?.textContent);
      const net = operatingMargin - charges;

      value.textContent = money(net);
      note.textContent = charges > 0
        ? `${money(charges)} de charges véhicules`
        : 'Aucune charge véhicule enregistrée';
      value.style.color = net < 0 ? '#bd3d44' : '#07845d';
    } catch (error) {
      console.error('Erreur résultat net Dashboard :', error);
      value.textContent = '—';
      note.textContent = 'Charges véhicules indisponibles';
    }
  }

  function nextMonthDate(monthValue) {
    const [year, month] = monthValue.split('-').map(Number);
    const date = new Date(year, month, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
  }

  function parseMoney(text) {
    const normalized = String(text || '').replace(/[^0-9-]/g, '');
    return Number(normalized) || 0;
  }

  const observer = new MutationObserver(() => {
    if (profit?.textContent && profit.textContent !== '—') refresh();
  });
  if (profit) observer.observe(profit, { childList: true, characterData: true, subtree: true });

  window.addEventListener('focus', () => {
    if (location.hash === '#dashboard' || !location.hash) refresh();
  });
  window.addEventListener('hashchange', () => {
    if (location.hash === '#dashboard') refresh();
  });

  refresh();
})();