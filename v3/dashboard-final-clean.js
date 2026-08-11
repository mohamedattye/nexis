(() => {
  'use strict';
  if (window.__NEXIS_DASHBOARD_FINAL_CLEAN__) return;
  window.__NEXIS_DASHBOARD_FINAL_CLEAN__ = true;

  const icons = {
    revenue: '<svg viewBox="0 0 24 24" fill="none"><path d="M4 20V10m5 10V4m6 16v-7m5 7V7" stroke-width="1.8" stroke-linecap="round"/></svg>',
    expenses: '<svg viewBox="0 0 24 24" fill="none"><path d="M4 7.5h16v10H4zM7 7.5V5.8A1.8 1.8 0 0 1 8.8 4h6.4A1.8 1.8 0 0 1 17 5.8v1.7M8 12h8" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    margin: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 3v18M3 12h18M5.5 17.5 9 14l3 2.5 6.5-7" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    net: '<svg viewBox="0 0 24 24" fill="none"><path d="M4 17 9 12l3.5 3.5L20 8" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };

  function decorateCard(card, type, icon) {
    if (!card || card.querySelector('.nexis-kpi-icon')) return;
    card.classList.add(`nexis-kpi-card--${type}`);
    const badge = document.createElement('span');
    badge.className = 'nexis-kpi-icon';
    badge.setAttribute('aria-hidden', 'true');
    badge.innerHTML = icon;
    card.appendChild(badge);
  }

  function run() {
    const dashboard = document.getElementById('dashboard');
    const grid = dashboard?.querySelector('.kpi-grid');
    if (!dashboard || !grid) return;

    const cards = [...grid.querySelectorAll('.kpi-card')];
    const revenueCard = document.getElementById('kpi-revenue')?.closest('.kpi-card') || cards[0];
    const expensesCard = document.getElementById('kpi-expenses')?.closest('.kpi-card') || cards[1];
    const marginCard = document.getElementById('kpi-profit')?.closest('.kpi-card') || cards[2];
    const netCard = document.getElementById('kpi-net-result-card') || cards[3];

    decorateCard(revenueCard, 'revenue', icons.revenue);
    decorateCard(expensesCard, 'expenses', icons.expenses);
    decorateCard(marginCard, 'margin', icons.margin);
    decorateCard(netCard, 'net', icons.net);
  }

  const observer = new MutationObserver(() => run());
  const start = () => {
    run();
    observer.observe(document.body, { childList: true, subtree: true });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();
