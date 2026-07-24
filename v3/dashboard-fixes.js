(() => {
  'use strict';

  const alertRow = document.querySelector('.dashboard-alert');
  const alertCount = document.getElementById('alert-count');

  function syncAlertVisibility() {
    if (!alertRow || !alertCount) return;
    const count = Number.parseInt(alertCount.textContent || '0', 10) || 0;
    alertRow.hidden = count === 0;
  }

  if (alertCount) {
    new MutationObserver(syncAlertVisibility).observe(alertCount, {
      childList: true,
      characterData: true,
      subtree: true
    });
  }

  syncAlertVisibility();
})();