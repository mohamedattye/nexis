(() => {
  'use strict';

  const titles = {
    dashboard: 'Tableau de bord',
    'new-trip': 'Créer une mission',
    trips: 'Centre des missions',
    fleet: 'Flotte',
    expenses: 'Dépenses',
    reports: 'Rapports'
  };

  const topCreateButton = document.querySelector('.topbar-actions > .primary[data-view="new-trip"]');

  function setView(viewId, updateHash = true) {
    const target = document.getElementById(viewId);
    if (!target || !target.classList.contains('view')) return;

    document.querySelectorAll('.view').forEach((view) => {
      view.classList.toggle('active', view.id === viewId);
    });

    document.querySelectorAll('.nav-item[data-view]').forEach((button) => {
      button.classList.toggle('active', button.dataset.view === viewId);
    });

    const pageTitle = document.getElementById('page-title');
    if (pageTitle) pageTitle.textContent = titles[viewId] || 'Nexis';

    if (topCreateButton) topCreateButton.hidden = viewId === 'new-trip';

    if (updateHash && location.hash !== `#${viewId}`) {
      history.replaceState(null, '', `#${viewId}`);
    }

    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function compactExpenseTable() {
    const list = document.getElementById('expense-list');
    const table = list?.querySelector('.expense-table');
    if (!list || !table || list.querySelector('.expense-list')) return;

    const entries = [...table.querySelectorAll('tbody tr')].map((row) => {
      const cells = [...row.querySelectorAll('td')];
      if (cells.length < 7) return '';
      const actions = cells[6].querySelector('.expense-actions')?.outerHTML || '';
      return `
        <article class="expense-entry">
          <div class="expense-entry-head">
            <div><span>Total de la dépense</span><strong>${cells[5].textContent.trim()}</strong></div>
            ${actions}
          </div>
          <div class="expense-metrics">
            <div class="expense-metric"><span>Carburant</span><strong>${cells[0].textContent.trim()}</strong></div>
            <div class="expense-metric"><span>Ration</span><strong>${cells[1].textContent.trim()}</strong></div>
            <div class="expense-metric"><span>Rapido</span><strong>${cells[2].textContent.trim()}</strong></div>
            <div class="expense-metric"><span>Manœuvre</span><strong>${cells[3].textContent.trim()}</strong></div>
            <div class="expense-metric"><span>Autres</span><strong>${cells[4].textContent.trim()}</strong></div>
          </div>
        </article>`;
    }).join('');

    if (entries) list.innerHTML = `<div class="expense-list">${entries}</div>`;
  }

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-view]');
    if (!button) return;

    const viewId = button.dataset.view;
    if (!document.getElementById(viewId)?.classList.contains('view')) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    setView(viewId);
  }, true);

  window.addEventListener('hashchange', () => {
    const viewId = location.hash.replace('#', '');
    setView(document.getElementById(viewId)?.classList.contains('view') ? viewId : 'dashboard', false);
  });

  const detailBody = document.getElementById('mission-detail-body');
  if (detailBody) {
    new MutationObserver(compactExpenseTable).observe(detailBody, {
      childList: true,
      subtree: true
    });
  }

  const initialView = location.hash.replace('#', '');
  setView(document.getElementById(initialView)?.classList.contains('view') ? initialView : 'dashboard', false);
  compactExpenseTable();
})();