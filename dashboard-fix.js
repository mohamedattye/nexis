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

(() => {
  const table = document.getElementById('trip-table-body');
  if (!table) return;

  const style = document.createElement('style');
  style.textContent = `
    #trip-table-body td.trip-actions {
      display: table-cell;
      white-space: nowrap;
      vertical-align: middle;
    }

    #trip-table-body td.trip-actions .trip-action-wrap {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    #trip-table-body .edit-btn,
    #trip-table-body .delete-btn {
      width: 34px;
      height: 34px;
      min-width: 34px;
      padding: 0;
      border-radius: 9px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      box-shadow: none;
      font-size: 0;
      line-height: 1;
      cursor: pointer;
    }

    #trip-table-body .edit-btn {
      border: 1px solid #d6e3f6;
      background: #f7faff;
      color: #2563b9;
    }

    #trip-table-body .delete-btn {
      border: 1px solid #efd7d7;
      background: #fff9f9;
      color: #c93b3b;
    }

    #trip-table-body .edit-btn:hover {
      background: #edf4ff;
      border-color: #b9cff0;
    }

    #trip-table-body .delete-btn:hover {
      background: #fff0f0;
      border-color: #e8bcbc;
    }

    #trip-table-body .edit-btn svg,
    #trip-table-body .delete-btn svg {
      width: 16px;
      height: 16px;
      pointer-events: none;
    }
  `;
  document.head.appendChild(style);

  const editIcon = `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 20h4.2L19 9.2a2.1 2.1 0 0 0 0-3L17.8 5a2.1 2.1 0 0 0-3 0L4 15.8V20Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="m13.7 6.1 4.2 4.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    </svg>`;

  const deleteIcon = `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 7h14M9 7V4h6v3m-8 0 1 13h8l1-13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M10 11v5M14 11v5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    </svg>`;

  const compactActions = () => {
    table.querySelectorAll('button.delete-btn[data-trip-id]').forEach((deleteButton) => {
      if (deleteButton.dataset.compactReady === 'true') return;

      const cell = deleteButton.closest('td');
      if (!cell) return;

      deleteButton.dataset.compactReady = 'true';
      cell.classList.add('trip-actions');

      let wrapper = cell.querySelector('.trip-action-wrap');
      if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.className = 'trip-action-wrap';
        while (cell.firstChild) wrapper.appendChild(cell.firstChild);
        cell.appendChild(wrapper);
      }

      const editButton = wrapper.querySelector('button[data-edit-trip-id]');
      if (editButton && editButton.dataset.compactReady !== 'true') {
        editButton.dataset.compactReady = 'true';
        editButton.innerHTML = editIcon;
        editButton.title = 'Modifier la course';
        editButton.setAttribute('aria-label', 'Modifier la course');
      }

      deleteButton.innerHTML = deleteIcon;
      deleteButton.title = 'Supprimer la course';
      deleteButton.setAttribute('aria-label', 'Supprimer la course');
    });
  };

  const actionObserver = new MutationObserver(() => {
    window.requestAnimationFrame(compactActions);
  });

  actionObserver.observe(table, { childList: true, subtree: true });
  compactActions();
})();

(() => {
  if (document.querySelector('script[data-nexis-searchable-trucks]')) return;

  const script = document.createElement('script');
  script.src = 'searchable-trucks.js';
  script.defer = true;
  script.dataset.nexisSearchableTrucks = 'true';
  document.body.appendChild(script);
})();

(() => {
  if (document.querySelector('script[data-nexis-banner-v2]')) return;

  const script = document.createElement('script');
  script.src = 'banner-v2.js';
  script.defer = true;
  script.dataset.nexisBannerV2 = 'true';
  document.body.appendChild(script);
})();

(() => {
  if (document.querySelector('script[data-nexis-modern-dashboard-v3]')) return;

  const script = document.createElement('script');
  script.src = 'modern-dashboard-v3.js';
  script.defer = true;
  script.dataset.nexisModernDashboardV3 = 'true';
  document.body.appendChild(script);
})();

(() => {
  if (!document.querySelector('link[data-nexis-v2-style]')) {
    const style = document.createElement('link');
    style.rel = 'stylesheet';
    style.href = 'nexis-v2.css';
    style.dataset.nexisV2Style = 'true';
    document.head.appendChild(style);
  }

  if (!document.querySelector('script[data-nexis-v2-shell-loader]')) {
    const script = document.createElement('script');
    script.src = 'nexis-v2-shell.js';
    script.defer = true;
    script.dataset.nexisV2ShellLoader = 'true';
    document.body.appendChild(script);
  }
})();