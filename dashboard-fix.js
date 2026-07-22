(() => {
  const statsContainer = document.getElementById('stats');

  if (!statsContainer) {
    return;
  }

  const normalizeLabel = (value) =>
    String(value || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  const readStats = () => {
    const values = new Map();

    statsContainer.querySelectorAll('.stat-card').forEach((card) => {
      const label = normalizeLabel(card.querySelector('h3')?.textContent);
      const value = card.querySelector('p')?.textContent?.trim();

      if (label && value) {
        values.set(label, value);
      }
    });

    return values;
  };

  const setText = (id, value) => {
    const element = document.getElementById(id);

    if (element && value) {
      element.textContent = value;
    }
  };

  const parseAmount = (value) => {
    const digits = String(value || '').replace(/[^0-9-]/g, '');
    const amount = Number(digits);
    return Number.isFinite(amount) ? amount : 0;
  };

  const syncDashboard = () => {
    const stats = readStats();
    const revenue = stats.get("chiffre d'affaires") || '0 FCFA';
    const variableExpenses = stats.get('depenses course') || '0 FCFA';
    const fixedExpenses = stats.get('charges fixes/mecaniques') || '0 FCFA';
    const netProfit = stats.get('resultat net reel') || '0 FCFA';

    setText('kpi-revenue', revenue);
    setText('kpi-expenses', variableExpenses);
    setText('kpi-fixed', fixedExpenses);
    setText('kpi-profit', netProfit);

    const totalExpensesAmount =
      parseAmount(variableExpenses) + parseAmount(fixedExpenses);
    const revenueAmount = parseAmount(revenue);
    const ratio = revenueAmount > 0
      ? Math.round((parseAmount(netProfit) / revenueAmount) * 100)
      : 0;

    setText('summary-revenue', revenue);
    setText(
      'summary-expenses',
      `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(totalExpensesAmount)} FCFA`
    );
    setText('summary-profit', netProfit);
    setText('summary-ratio', `${ratio}%`);
  };

  const observer = new MutationObserver(syncDashboard);
  observer.observe(statsContainer, { childList: true, subtree: true });

  syncDashboard();
})();
