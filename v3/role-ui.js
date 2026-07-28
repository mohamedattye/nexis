(() => {
  'use strict';

  let authState = window.NEXIS_AUTH || null;
  let scheduled = false;

  const adminOnlySelectors = [
    '#fleet-add-toggle',
    '#fleet-add-wrap',
    '[data-toggle-truck]',
    '#charges-add',
    '#charges-form-wrap',
    '[data-edit-charge]',
    '[data-delete-charge]',
    '#delete-mission-button',
    '[data-delete-expense]'
  ];

  const adminActionSelector = adminOnlySelectors.join(',');

  const style = document.createElement('style');
  style.textContent = `
    [data-nexis-admin-only="true"][hidden] { display: none !important; }
    .role-access-note {
      display: inline-flex;
      align-items: center;
      min-height: 28px;
      padding: 0 9px;
      border: 1px solid #dce4ed;
      border-radius: 999px;
      background: #f7f9fc;
      color: #657286;
      font-size: 9px;
      font-weight: 800;
      white-space: nowrap;
    }
  `;
  document.head.appendChild(style);

  function isAdmin() {
    return authState?.isAdmin === true;
  }

  function markAndToggleAdminActions() {
    document.querySelectorAll(adminActionSelector).forEach((element) => {
      element.dataset.nexisAdminOnly = 'true';
      element.hidden = !isAdmin();
    });

    const fleetToolbar = document.querySelector('.fleet-toolbar');
    if (fleetToolbar) {
      let note = fleetToolbar.querySelector('.role-access-note');
      if (!isAdmin()) {
        if (!note) {
          note = document.createElement('span');
          note.className = 'role-access-note';
          note.textContent = 'Consultation opérateur';
          fleetToolbar.appendChild(note);
        }
      } else {
        note?.remove();
      }
    }

    const chargesHeading = document.querySelector('.charges-heading');
    if (chargesHeading) {
      let note = chargesHeading.querySelector('.role-access-note');
      if (!isAdmin()) {
        if (!note) {
          note = document.createElement('span');
          note.className = 'role-access-note';
          note.textContent = 'Modification réservée à l’administrateur';
          chargesHeading.appendChild(note);
        }
      } else {
        note?.remove();
      }
    }
  }

  function scheduleApply() {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
      scheduled = false;
      markAndToggleAdminActions();
    });
  }

  document.addEventListener('nexis:auth-changed', (event) => {
    authState = event.detail || window.NEXIS_AUTH || null;
    scheduleApply();
  });

  document.addEventListener('click', (event) => {
    const restricted = event.target.closest(adminActionSelector);
    if (!restricted || isAdmin()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);

  new MutationObserver(scheduleApply).observe(document.body, {
    childList: true,
    subtree: true
  });

  scheduleApply();
})();