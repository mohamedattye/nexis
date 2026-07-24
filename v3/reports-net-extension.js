(() => {
  'use strict';

  if (!window.supabase?.createClient) return;
  const client = window.supabase.createClient();
  const formatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

  function money(value) {
    return `${formatter.format(Number(value) || 0)} FCFA`;
  }

  function chargeTotal(item) {
    return ['maintenance', 'repairs', 'insurance', 'technical_visit', 'driver_cost', 'financing', 'other']
      .reduce((sum, key) => sum + (Number(item?.[key]) || 0), 0);
  }

  function parseMoney(text) {
    return Number(String(text || '').replace(/[^0-9-]/g, '')) || 0;
  }

  async function enhanceReports() {
    const view = document.getElementById('reports');
    const monthInput = document.getElementById('reports-month');
    const truckFilter = document.getElementById('reports-truck');
    const table = view?.querySelector('.reports-table');
    const tbody = document.getElementById('reports-truck-body');
    const kpis = view?.querySelector('.reports-kpis');
    if (!view || !monthInput || !table || !tbody || !kpis) return false;

    if (!document.getElementById('reports-kpi-vehicle-charges')) {
      const card = document.createElement('article');
      card.className = 'reports-kpi';
      card.innerHTML = '<span>Charges véhicules</span><strong id="reports-kpi-vehicle-charges">—</strong><small id="reports-kpi-vehicle-charges-note">Période sélectionnée</small>';
      kpis.appendChild(card);

      const netCard = document.createElement('article');
      netCard.className = 'reports-kpi profit';
      netCard.id = 'reports-net-card';
      netCard.innerHTML = '<span>Résultat net</span><strong id="reports-kpi-net">—</strong><small>Marge moins charges véhicules</small>';
      kpis.appendChild(netCard);
    }

    const headerRow = table.querySelector('thead tr');
    if (headerRow && !headerRow.querySelector('[data-net-col]')) {
      const chargesHead = document.createElement('th');
      chargesHead.dataset.netCol = 'charges';
      chargesHead.textContent = 'Charges véhicules';
      const netHead = document.createElement('th');
      netHead.dataset.netCol = 'net';
      netHead.textContent = 'Résultat net';
      headerRow.append(chargesHead, netHead);
    }

    const month = monthInput.value;
    if (!month) return true;
    const [year, monthNumber] = month.split('-').map(Number);
    const next = new Date(year, monthNumber, 1);
    const nextDate = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`;

    const { data, error } = await client
      .from('vehicle_charges')
      .select('*')
      .gte('month', `${month}-01`)
      .lt('month', nextDate);

    if (error) {
      console.error('Erreur charges dans Rapports :', error);
      return true;
    }

    const selectedTruck = truckFilter?.value || '';
    const chargeMap = new Map();
    (data || []).forEach((item) => {
      if (!selectedTruck || item.truck === selectedTruck) {
        chargeMap.set(item.truck, (chargeMap.get(item.truck) || 0) + chargeTotal(item));
      }
    });

    let totalCharges = 0;
    let totalNet = 0;

    [...tbody.querySelectorAll('tr')].forEach((row) => {
      const plate = row.querySelector('.reports-plate')?.textContent?.trim();
      const cells = row.querySelectorAll('td');
      if (!plate || cells.length < 5) return;

      row.querySelectorAll('[data-net-cell]').forEach((cell) => cell.remove());
      const margin = parseMoney(cells[4]?.textContent);
      const charges = chargeMap.get(plate) || 0;
      const net = margin - charges;
      totalCharges += charges;
      totalNet += net;

      const chargesCell = document.createElement('td');
      chargesCell.dataset.netCell = 'charges';
      chargesCell.className = 'reports-money';
      chargesCell.textContent = money(charges);

      const netCell = document.createElement('td');
      netCell.dataset.netCell = 'net';
      netCell.className = `reports-margin ${net < 0 ? 'negative' : ''}`;
      netCell.textContent = money(net);
      row.append(chargesCell, netCell);
    });

    const chargesKpi = document.getElementById('reports-kpi-vehicle-charges');
    const netKpi = document.getElementById('reports-kpi-net');
    const netCard = document.getElementById('reports-net-card');
    if (chargesKpi) chargesKpi.textContent = money(totalCharges);
    if (netKpi) netKpi.textContent = money(totalNet);
    if (netCard) {
      netCard.classList.toggle('loss', totalNet < 0);
      netCard.classList.toggle('profit', totalNet >= 0);
    }
    return true;
  }

  function runWhenReady(attempt = 0) {
    enhanceReports().then((ready) => {
      if (!ready && attempt < 40) window.setTimeout(() => runWhenReady(attempt + 1), 150);
    });
  }

  document.addEventListener('change', (event) => {
    if (event.target?.id === 'reports-month' || event.target?.id === 'reports-truck') {
      window.setTimeout(enhanceReports, 50);
    }
  });

  const observer = new MutationObserver(() => {
    if (location.hash === '#reports') enhanceReports();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  window.addEventListener('hashchange', () => {
    if (location.hash === '#reports') runWhenReady();
  });
  window.addEventListener('focus', () => {
    if (location.hash === '#reports') enhanceReports();
  });

  runWhenReady();
})();