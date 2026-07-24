(() => {
  'use strict';

  const shell = document.getElementById('mission-detail-shell');
  if (!shell) return;

  let dataChanged = false;

  shell.addEventListener('submit', (event) => {
    if (event.target.matches('#expense-detail-form, #mission-edit-form')) {
      dataChanged = true;
    }
  }, true);

  function reloadIfNeeded() {
    if (!dataChanged) return;
    window.setTimeout(() => window.location.reload(), 120);
  }

  document.querySelectorAll('[data-close-mission-detail]').forEach((button) => {
    button.addEventListener('click', reloadIfNeeded, true);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !shell.hidden) reloadIfNeeded();
  });
})();