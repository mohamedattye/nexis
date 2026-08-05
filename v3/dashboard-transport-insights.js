(() => {
  'use strict';

  if (window.__NEXIS_DASHBOARD_TRANSPORT_INSIGHTS__) return;
  window.__NEXIS_DASHBOARD_TRANSPORT_INSIGHTS__ = true;
  if (!window.supabase?.createClient) return;

  const dashboard = document.getElementById('dashboard');
  if (!dashboard) return;

  const client = window.supabase.createClient();
  const formatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
  const money = (value) => `${formatter.format(Number(value) || 0)} FCFA`;
  const chargeFields = ['maintenance', 'repairs', 'insurance', 'technical_visit', 'driver_cost', 'financing', 'other'];
  const expenseFields = ['fuel', 'ration', 'rapido', 'manoeuvre', 'misc'];

  let loading = false;
  let hasRendered = false;

  const style = document.createElement('style');
  style.textContent = `
    .transport-insights-lite{margin-top:12px;margin-bottom:12px}
    .transport-insight-lite-card{
      min-width:0;
      overflow:hidden;
      border:1px solid rgba(223,229,237,.96);
      border-radius:16px;
      background:rgba(255,255,255,.96);
      box-shadow:0 10px 28px rgba(31,48,73,.055);
      padding:14px 17px 13px;
    }
    .transport-insight-lite-head{
      display:flex;
      align-items:flex-start;
      justify-content:space-between;
      gap:12px;
      margin-bottom:12px;
    }
    .transport-insight-lite-head small{
      display:block;
      margin-bottom:2px;
      color:#9aa4b1;
      font-size:6.8px;
      font-weight:700;
      letter-spacing:.08em;
      text-transform:uppercase;
    }
    .transport-insight-lite-head h3{
      margin:0;
      color:#1a2b40;
      font-family:var(--font-display,"Manrope","Inter",sans-serif);
      font-size:13px;
      font-weight:750;
      letter-spacing:-.035em;
    }
    .transport-insight-lite-head p{
      margin:3px 0 0;
      color:#929ca8;
      font-size:8px;
      font-weight:450;
    }
    .transport-period-lite{
      display:inline-flex;
      align-items:center;
      gap:5px;
      flex:0 0 auto;
      padding:5px 8px;
      border:1px solid #e8ecf0;
      border-radius:999px;
      background:#fbfcfd;
      color:#788493;
      font-size:7.2px;
      font-weight:650;
      white-space:nowrap;
    }
    .transport-period-lite:before{
      content:"";
      width:4px;
      height:4px;
      border-radius:50%;
      background:#ff9414;
    }
    .fleet-profit-list{display:grid;gap:8px}
    .fleet-profit-row{
      display:grid;
      grid-template-columns:105px minmax(190px,1fr) 72px 115px;
      align-items:center;
      gap:12px;
      min-height:36px;
    }
    .fleet-profit-truck{
      display:flex;
      align-items:center;
      gap:7px;
      min-width:0;
      color:#294966;
      font-size:9px;
      font-weight:750;
    }
    .fleet-profit-truck i{
      width:26px;
      height:26px;
      display:grid;
      place-items:center;
      flex:0 0 26px;
      border-radius:8px;
      background:#eef4f8;
      color:#3b668b;
      font-style:normal;
      font-size:11px;
    }
    .fleet-profit-truck.inactive{opacity:.55}
    .fleet-profit-bar-wrap{min-width:0}
    .fleet-profit-meta{
      display:flex;
      justify-content:space-between;
      gap:10px;
      margin-bottom:4px;
      color:#8994a2;
      font-size:7.2px;
      white-space:nowrap;
    }
    .fleet-profit-track{
      position:relative;
      height:7px;
      overflow:hidden;
      border-radius:999px;
      background:#eef2f5;
    }
    .fleet-profit-fill{
      height:100%;
      min-width:2px;
      border-radius:999px;
      background:linear-gradient(90deg,#31b58b,#0d936b);
    }
    .fleet-profit-fill.loss{background:linear-gradient(90deg,#e98383,#c74b53)}
    .fleet-profit-fill.zero{background:#cfd7df;min-width:0}
    .fleet-profit-missions{
      color:#718093;
      font-size:8px;
      font-weight:600;
      text-align:right;
      white-space:nowrap;
    }
    .fleet-profit-net{
      color:#07845d;
      font-family:var(--font-display,"Manrope","Inter",sans-serif);
      font-size:9px;
      font-weight:750;
      text-align:right;
      white-space:nowrap;
    }
    .fleet-profit-net.loss{color:#bd3d44}
    .fleet-profit-net.zero{color:#7f8a98}
    .fleet-profit-summary{
      display:flex;
      align-items:center;
      gap:16px;
      margin-top:11px;
      padding-top:10px;
      border-top:1px solid #edf1f4;
      color:#7e8998;
      font-size:7.6px;
    }
    .fleet-profit-summary strong{color:#273b52;font-size:8.2px}
    .transport-lite-empty{
      min-height:90px;
      display:grid;
      place-content:center;
      text-align:center;
      color:#8793a2;
      font-size:9px;
    }
    .transport-lite-empty strong{display:block;margin-bottom:4px;color:#31445a;font-size:11px}
    @media(max-width:900px){
      .fleet-profit-row{grid-template-columns:100px minmax(150px,1fr) 65px 105px}
    }
    @media(max-width:740px){
      .transport-insight-lite-card{padding:12px}
      .fleet-profit-row{grid-template-columns:1fr;gap:5px;padding:7px 0;border-bottom:1px solid #edf1f4}
      .fleet-profit-missions,.fleet-profit-net{text-align:left}
      .fleet-profit-summary{flex-wrap:wrap}
    }
  `;
  document.head.appendChild(style);

  function expenseTotal(item) {
    return expenseFields.reduce((sum, key) => sum + (Number(item?.[key]) || 0), 0);
  }

  function chargeTotal(item) {
    return chargeFields.reduce((sum, key) => sum + (Number(item?.[key]) || 0), 0);
  }

  function currentMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  function monthLabel(month) {
    if (!month || !/^\d{4}-\d{2}$/.test(month)) return 'Période';
    const [year, monthNumber] = month.split('-').map(Number);
    return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(new Date(year, monthNumber - 1, 1));
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function ensureContainer() {
    let container = document.getElementById('transport-insights');
    if (container) {
      container.className = 'transport-insights-lite';
      return container;
    }
    container = document.createElement('section');
    container.id = 'transport-insights';
    container.className = 'transport-insights-lite';
    const alert = dashboard.querySelector('.dashboard-alert');
    const dashboardMain = dashboard.querySelector('.dashboard-main');
    if (alert) alert.insertAdjacentElement('afterend', container);
    else if (dashboardMain) dashboardMain.insertAdjacentElement('beforebegin', container);
    else dashboard.appendChild(container);
    return container;
  }

  function selectedActivityMonth(trips) {
    const current = currentMonth();
    if (trips.some((trip) => String(trip.date || '').startsWith(current))) {
      return { month: current, fallback: false };
    }
    const months = trips
      .map((trip) => String(trip.date || '').slice(0, 7))
      .filter((value) => /^\d{4}-\d{2}$/.test(value))
      .sort((a, b) => b.localeCompare(a));
    return { month: months[0] || current, fallback: Boolean(months[0] && months[0] !== current) };
  }

  function buildRows(trucks, trips, expenses, charges, month) {
    const monthTrips = trips.filter((trip) => String(trip.date || '').startsWith(month));
    const tripIds = new Set(monthTrips.map((trip) => String(trip.id)));
    const expenseMap = new Map();
    expenses.forEach((item) => {
      if (!tripIds.has(String(item.trip_id))) return;
      expenseMap.set(String(item.trip_id), (expenseMap.get(String(item.trip_id)) || 0) + expenseTotal(item));
    });
    const chargeMap = new Map();
    charges.forEach((item) => {
      if (!String(item.month || '').startsWith(month)) return;
      const plate = String(item.truck || '');
      chargeMap.set(plate, (chargeMap.get(plate) || 0) + chargeTotal(item));
    });

    return trucks.map((truck) => {
      const plate = String(truck.plate_number || '');
      const related = monthTrips.filter((trip) => String(trip.truck || '') === plate);
      const revenue = related.reduce((sum, trip) => sum + (Number(trip.revenue) || 0), 0);
      const missionCosts = related.reduce((sum, trip) => sum + (expenseMap.get(String(trip.id)) || 0), 0);
      const vehicleCosts = chargeMap.get(plate) || 0;
      const costs = missionCosts + vehicleCosts;
      return {
        plate,
        active: truck.is_active !== false,
        missions: related.length,
        revenue,
        costs,
        net: revenue - costs
      };
    }).sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1;
      if (b.missions !== a.missions) return b.missions - a.missions;
      return b.net - a.net;
    });
  }

  function renderRows(rows) {
    if (!rows.length) {
      return '<div class="transport-lite-empty"><div><strong>Aucun camion enregistré</strong>Ajoutez des véhicules dans Flotte pour suivre leur rentabilité ici.</div></div>';
    }

    const visible = rows.slice(0, 6);
    const maxAbsNet = Math.max(1, ...visible.map((row) => Math.abs(row.net)));
    return `<div class="fleet-profit-list">${visible.map((row) => {
      const width = row.net === 0 ? 0 : Math.max(4, Math.abs(row.net) / maxAbsNet * 100);
      const state = row.net < 0 ? 'loss' : row.net === 0 ? 'zero' : '';
      const truckState = row.active ? '' : ' inactive';
      return `<div class="fleet-profit-row">
        <div class="fleet-profit-truck${truckState}"><i>▣</i><span>${escapeHtml(row.plate || '—')}</span></div>
        <div class="fleet-profit-bar-wrap">
          <div class="fleet-profit-meta"><span>CA ${money(row.revenue)}</span><span>Coûts ${money(row.costs)}</span></div>
          <div class="fleet-profit-track"><div class="fleet-profit-fill ${state}" style="width:${width}%"></div></div>
        </div>
        <div class="fleet-profit-missions">${row.missions} mission${row.missions > 1 ? 's' : ''}</div>
        <div class="fleet-profit-net ${state}">${money(row.net)}</div>
      </div>`;
    }).join('')}</div>`;
  }

  async function renderInsights(force = false) {
    if (loading) return;
    if (hasRendered && !force) return;
    loading = true;
    const container = ensureContainer();

    try {
      const [trucksResult, tripsResult, expensesResult, chargesResult] = await Promise.all([
        client.from('trucks').select('*').order('plate_number'),
        client.from('trips').select('*').order('date', { ascending: false }),
        client.from('trip_expenses').select('*'),
        client.from('vehicle_charges').select('*')
      ]);

      if (trucksResult.error) throw trucksResult.error;
      if (tripsResult.error) throw tripsResult.error;
      if (expensesResult.error) throw expensesResult.error;
      if (chargesResult.error) throw chargesResult.error;

      const trucks = trucksResult.data || [];
      const trips = tripsResult.data || [];
      const expenses = expensesResult.data || [];
      const charges = chargesResult.data || [];
      const period = selectedActivityMonth(trips);
      const rows = buildRows(trucks, trips, expenses, charges, period.month);
      const totals = rows.reduce((acc, row) => {
        acc.revenue += row.revenue;
        acc.costs += row.costs;
        acc.net += row.net;
        acc.missions += row.missions;
        return acc;
      }, { revenue: 0, costs: 0, net: 0, missions: 0 });

      container.innerHTML = `<article class="transport-insight-lite-card">
        <div class="transport-insight-lite-head">
          <div><small>Pilotage flotte</small><h3>Rentabilité par camion</h3><p>Résultat après dépenses de mission et charges véhicule.</p></div>
          <span class="transport-period-lite">${escapeHtml(monthLabel(period.month))}${period.fallback ? ' · dernier mois actif' : ''}</span>
        </div>
        ${renderRows(rows)}
        <div class="fleet-profit-summary">
          <span>${totals.missions} mission${totals.missions > 1 ? 's' : ''}</span>
          <span>CA <strong>${money(totals.revenue)}</strong></span>
          <span>Coûts <strong>${money(totals.costs)}</strong></span>
          <span>Résultat net <strong>${money(totals.net)}</strong></span>
        </div>
      </article>`;
      hasRendered = true;
    } catch (error) {
      console.error('Erreur rentabilité flotte dashboard :', error);
      if (!hasRendered) {
        container.innerHTML = '<article class="transport-insight-lite-card"><div class="transport-lite-empty"><div><strong>Rentabilité indisponible</strong>Les indicateurs principaux restent accessibles.</div></div></article>';
      }
    } finally {
      loading = false;
    }
  }

  function onNavigation() {
    if (location.hash === '#dashboard' || !location.hash) renderInsights(false);
  }

  window.addEventListener('hashchange', onNavigation);
  document.addEventListener('nexis:auth-changed', () => window.setTimeout(() => renderInsights(true), 100));
  onNavigation();
})();