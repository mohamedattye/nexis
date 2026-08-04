(() => {
  'use strict';

  if (window.__NEXIS_DASHBOARD_TRANSPORT_INSIGHTS__) return;
  window.__NEXIS_DASHBOARD_TRANSPORT_INSIGHTS__ = true;
  if (!window.supabase?.createClient) return;

  const dashboard = document.getElementById('dashboard');
  if (!dashboard) return;

  const client = window.supabase.createClient();
  const formatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
  const shortFormatter = new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 });
  const money = (value) => `${formatter.format(Number(value) || 0)} FCFA`;

  let loading = false;
  let hasRendered = false;

  const style = document.createElement('style');
  style.textContent = `
    .transport-insights-lite{
      margin-top:13px;
    }
    .transport-insight-lite-card{
      min-width:0;
      overflow:hidden;
      border:1px solid rgba(223,229,237,.96);
      border-radius:17px;
      background:rgba(255,255,255,.96);
      box-shadow:0 12px 34px rgba(31,48,73,.07);
      padding:17px 18px 14px;
    }
    .transport-insight-lite-head{
      display:flex;
      align-items:flex-start;
      justify-content:space-between;
      gap:12px;
      margin-bottom:8px;
    }
    .transport-insight-lite-head small{
      display:block;
      margin-bottom:3px;
      color:#8a96a6;
      font-size:8px;
      font-weight:850;
      letter-spacing:.08em;
      text-transform:uppercase;
    }
    .transport-insight-lite-head h3{
      margin:0;
      color:#1b2d43;
      font-size:14px;
      letter-spacing:-.025em;
    }
    .transport-insight-lite-head p{
      margin:4px 0 0;
      color:#818c9b;
      font-size:9px;
    }
    .transport-period-lite{
      display:inline-flex;
      align-items:center;
      gap:6px;
      flex:0 0 auto;
      padding:6px 9px;
      border:1px solid #e1e7ed;
      border-radius:999px;
      background:#f8fafc;
      color:#6d7a8c;
      font-size:8px;
      font-weight:800;
      white-space:nowrap;
    }
    .transport-period-lite:before{
      content:"";
      width:6px;
      height:6px;
      border-radius:50%;
      background:#ff9414;
      box-shadow:0 0 0 4px rgba(255,148,20,.09);
    }
    .transport-chart-lite-wrap{position:relative;min-height:178px}
    .transport-line-lite{display:block;width:100%;height:178px;overflow:visible}
    .transport-grid-lite{stroke:#edf1f5;stroke-width:1}
    .transport-axis-lite{fill:#8c97a5;font-size:9px;font-weight:650}
    .transport-line-lite-revenue{fill:none;stroke:#ff8a00;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}
    .transport-line-lite-margin{fill:none;stroke:#10936c;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}
    .transport-area-lite{fill:url(#nexisRevenueGradientLite)}
    .transport-point-lite-revenue{fill:#fff;stroke:#ff8a00;stroke-width:2.4}
    .transport-point-lite-margin{fill:#fff;stroke:#10936c;stroke-width:2.4}
    .transport-legend-lite{
      display:flex;
      align-items:center;
      gap:15px;
      margin-top:1px;
      color:#6f7d90;
      font-size:8.5px;
      font-weight:700;
    }
    .transport-legend-lite span{display:inline-flex;align-items:center;gap:6px}
    .transport-legend-lite i{display:block;width:13px;height:3px;border-radius:999px;background:#ff8a00}
    .transport-legend-lite span:last-child i{background:#10936c}
    .transport-lite-empty{
      min-height:160px;
      display:grid;
      place-content:center;
      text-align:center;
      color:#8793a2;
      font-size:10px;
    }
    .transport-lite-empty strong{display:block;margin-bottom:4px;color:#31445a;font-size:12px}

    @media(max-width:740px){
      .transport-insight-lite-card{padding:14px}
      .transport-line-lite{height:165px}
      .transport-chart-lite-wrap{min-height:165px}
    }
  `;
  document.head.appendChild(style);

  function lastMonths(count = 6) {
    const now = new Date();
    return Array.from({ length: count }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (count - 1 - index), 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(date).replace('.', '');
      return { key, label: label.charAt(0).toUpperCase() + label.slice(1) };
    });
  }

  function expenseTotal(item) {
    return ['fuel', 'ration', 'rapido', 'manoeuvre', 'misc'].reduce((sum, key) => sum + (Number(item?.[key]) || 0), 0);
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
    const dashboardMain = dashboard.querySelector('.dashboard-main');
    if (dashboardMain) dashboardMain.insertAdjacentElement('afterend', container);
    else dashboard.appendChild(container);
    return container;
  }

  function buildChart(months, series) {
    const width = 900;
    const height = 170;
    const left = 44;
    const right = 18;
    const top = 12;
    const bottom = 28;
    const plotW = width - left - right;
    const plotH = height - top - bottom;
    const maxValue = Math.max(1, ...series.flatMap((item) => [item.revenue, Math.max(0, item.margin)]));
    const magnitude = Math.pow(10, Math.max(0, String(Math.floor(maxValue)).length - 2));
    const roundedMax = Math.max(1000, Math.ceil(maxValue / magnitude) * magnitude);
    const x = (index) => left + (months.length <= 1 ? plotW / 2 : (index / (months.length - 1)) * plotW);
    const y = (value) => top + plotH - (Math.max(0, value) / roundedMax) * plotH;
    const points = (key) => series.map((item, index) => `${x(index)},${y(item[key])}`).join(' ');
    const area = `${left},${top + plotH} ${points('revenue')} ${left + plotW},${top + plotH}`;
    const grid = [0, .5, 1].map((ratio) => {
      const gy = top + plotH - ratio * plotH;
      return `<line class="transport-grid-lite" x1="${left}" y1="${gy}" x2="${left + plotW}" y2="${gy}"/><text class="transport-axis-lite" x="${left - 8}" y="${gy + 3}" text-anchor="end">${shortFormatter.format(roundedMax * ratio)}</text>`;
    }).join('');
    const labels = months.map((month, index) => `<text class="transport-axis-lite" x="${x(index)}" y="${height - 7}" text-anchor="middle">${month.label}</text>`).join('');
    const revenuePoints = series.map((item, index) => `<circle class="transport-point-lite-revenue" cx="${x(index)}" cy="${y(item.revenue)}" r="3.6"><title>${months[index].label} · CA ${money(item.revenue)}</title></circle>`).join('');
    const marginPoints = series.map((item, index) => `<circle class="transport-point-lite-margin" cx="${x(index)}" cy="${y(item.margin)}" r="3.6"><title>${months[index].label} · Marge ${money(item.margin)}</title></circle>`).join('');
    return `<svg class="transport-line-lite" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img" aria-label="Évolution du chiffre d'affaires et de la marge">
      <defs><linearGradient id="nexisRevenueGradientLite" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ff8a00" stop-opacity=".13"/><stop offset="100%" stop-color="#ff8a00" stop-opacity="0"/></linearGradient></defs>
      ${grid}<polygon class="transport-area-lite" points="${area}"/><polyline class="transport-line-lite-revenue" points="${points('revenue')}"/><polyline class="transport-line-lite-margin" points="${points('margin')}"/>${revenuePoints}${marginPoints}${labels}
    </svg>`;
  }

  async function renderInsights(force = false) {
    if (loading) return;
    if (hasRendered && !force) return;
    loading = true;
    const container = ensureContainer();

    try {
      const months = lastMonths(6);
      const firstMonth = months[0].key;
      const [tripResult, expenseResult] = await Promise.all([
        client.from('trips').select('*').gte('date', `${firstMonth}-01`).order('date', { ascending: true }),
        client.from('trip_expenses').select('*').gte('date', `${firstMonth}-01`).order('date', { ascending: true })
      ]);
      if (tripResult.error) throw tripResult.error;
      if (expenseResult.error) throw expenseResult.error;

      const trips = tripResult.data || [];
      const expenses = expenseResult.data || [];
      const expenseByTrip = new Map();
      expenses.forEach((item) => expenseByTrip.set(String(item.trip_id), (expenseByTrip.get(String(item.trip_id)) || 0) + expenseTotal(item)));

      const monthly = months.map((month) => {
        const monthTrips = trips.filter((trip) => String(trip.date || '').slice(0, 7) === month.key);
        const revenue = monthTrips.reduce((sum, trip) => sum + (Number(trip.revenue) || 0), 0);
        const variable = monthTrips.reduce((sum, trip) => sum + (expenseByTrip.get(String(trip.id)) || 0), 0);
        return { revenue, margin: revenue - variable };
      });

      container.innerHTML = `<article class="transport-insight-lite-card">
        <div class="transport-insight-lite-head"><div><small>Tendance</small><h3>Évolution de l’activité</h3><p>Chiffre d’affaires et marge sur les 6 derniers mois.</p></div><span class="transport-period-lite">6 mois</span></div>
        <div class="transport-chart-lite-wrap">${buildChart(months, monthly)}</div>
        <div class="transport-legend-lite"><span><i></i>Chiffre d’affaires</span><span><i></i>Marge</span></div>
      </article>`;
      hasRendered = true;
    } catch (error) {
      console.error('Erreur graphique dashboard :', error);
      if (!hasRendered) container.innerHTML = '<article class="transport-insight-lite-card"><div class="transport-lite-empty"><div><strong>Graphique indisponible</strong>Les indicateurs principaux restent accessibles.</div></div></article>';
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