(() => {
  'use strict';
  if (window.__NEXIS_FACTURATION_UI_PREMIUM__) return;
  window.__NEXIS_FACTURATION_UI_PREMIUM__ = true;

  function closeMenus(except) {
    document.querySelectorAll('#invoices .invoice-more-menu').forEach(menu => {
      if (menu !== except) menu.hidden = true;
    });
  }

  function compactRow(row) {
    const actions = row.querySelector('.invoice-actions');
    if (!actions || actions.dataset.compacted === '1') return;

    const buttons = [...actions.querySelectorAll(':scope > button')];
    if (!buttons.length) return;

    const viewBtn = buttons.find(btn => /voir/i.test(btn.textContent || ''));
    const secondary = buttons.filter(btn => btn !== viewBtn);

    if (viewBtn) {
      viewBtn.classList.add('view-primary');
      viewBtn.textContent = 'Voir';
    }

    if (secondary.length) {
      const more = document.createElement('span');
      more.className = 'invoice-more';
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'invoice-action invoice-more-toggle';
      toggle.setAttribute('aria-label', 'Plus d’actions');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.textContent = '⋯';

      const menu = document.createElement('div');
      menu.className = 'invoice-more-menu';
      menu.hidden = true;

      secondary.forEach(btn => {
        if (/annuler|supprimer/i.test(btn.textContent || '')) btn.classList.add('danger');
        btn.classList.remove('invoice-action');
        menu.appendChild(btn);
      });

      toggle.addEventListener('click', event => {
        event.stopPropagation();
        const willOpen = menu.hidden;
        closeMenus(menu);
        menu.hidden = !willOpen;
        toggle.setAttribute('aria-expanded', String(willOpen));
      });

      more.append(toggle, menu);
      actions.appendChild(more);
    }

    actions.dataset.compacted = '1';
  }

  function compactAll() {
    document.querySelectorAll('#invoices #invoice-body tr').forEach(compactRow);
  }

  document.addEventListener('click', event => {
    if (!event.target.closest('#invoices .invoice-more')) closeMenus();
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeMenus();
  });

  const observer = new MutationObserver(() => requestAnimationFrame(compactAll));
  const attach = () => {
    const body = document.getElementById('invoice-body');
    if (!body) return false;
    observer.disconnect();
    observer.observe(body, { childList: true, subtree: true });
    compactAll();
    return true;
  };

  window.addEventListener('hashchange', () => {
    if (location.hash === '#invoices') setTimeout(attach, 150);
  });

  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    if (attach() || attempts > 30) clearInterval(timer);
  }, 250);
})();
