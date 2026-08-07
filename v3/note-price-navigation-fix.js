(() => {
  'use strict';
  if (window.__NEXIS_NOTE_PRICE_NAV_FIX__) return;
  window.__NEXIS_NOTE_PRICE_NAV_FIX__ = true;

  let pendingNoteSave = false;
  let lastShellHidden = true;

  function isNoteForm() {
    const title = document.getElementById('invoice-form-title')?.textContent?.trim() || '';
    return /note de prix/i.test(title) || /^Modifier\s+NP-/i.test(title);
  }

  function activateNotesTab() {
    const notesTab = document.querySelector('#invoices [data-billing-tab="notes"]');
    if (!notesTab) return false;
    notesTab.click();
    window.setTimeout(() => {
      const search = document.getElementById('invoice-search');
      if (search) {
        search.value = '';
        search.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, 40);
    return true;
  }

  function attachShellWatcher() {
    const shell = document.getElementById('invoice-shell');
    if (!shell || shell.dataset.noteNavWatched === '1') return false;
    shell.dataset.noteNavWatched = '1';
    lastShellHidden = shell.hidden;

    const observer = new MutationObserver(() => {
      const nowHidden = shell.hidden;
      if (pendingNoteSave && !lastShellHidden && nowHidden) {
        pendingNoteSave = false;
        window.setTimeout(() => {
          activateNotesTab();
          document.getElementById('invoice-refresh')?.click();
        }, 180);
      }
      lastShellHidden = nowHidden;
    });
    observer.observe(shell, { attributes: true, attributeFilter: ['hidden'] });
    return true;
  }

  document.addEventListener('submit', event => {
    if (!event.target.closest?.('#invoice-form')) return;
    if (isNoteForm()) pendingNoteSave = true;
  }, true);

  document.addEventListener('click', event => {
    if (event.target.closest('#price-note-add')) {
      pendingNoteSave = false;
      window.setTimeout(attachShellWatcher, 0);
      return;
    }
    if (event.target.closest('[data-edit-note]')) {
      pendingNoteSave = false;
      window.setTimeout(attachShellWatcher, 0);
    }
  }, true);

  window.addEventListener('hashchange', () => {
    if (location.hash === '#invoices') window.setTimeout(attachShellWatcher, 120);
  });

  let tries = 0;
  const timer = window.setInterval(() => {
    tries += 1;
    if (attachShellWatcher() || tries > 40) window.clearInterval(timer);
  }, 250);
})();
