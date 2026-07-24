(() => {
  'use strict';

  const topCreateButton = document.querySelector('.topbar-actions > .primary[data-view="new-trip"]');

  function syncTopAction() {
    if (!topCreateButton) return;
    const activeView = document.querySelector('.view.active')?.id || location.hash.replace('#', '');
    topCreateButton.hidden = activeView === 'new-trip';
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

  document.addEventListener('click', () => window.setTimeout(syncTopAction, 0), true);
  window.addEventListener('hashchange', syncTopAction);

  const observer = new MutationObserver(() => {
    syncTopAction();
    compactExpenseTable();
  });
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'hidden'] });

  syncTopAction();
  compactExpenseTable();
})();