(() => {
  'use strict';

  const shell = document.getElementById('mission-detail-shell');
  const detailBody = document.getElementById('mission-detail-body');
  if (!shell || !detailBody) return;

  let dataChanged = false;

  const style = document.createElement('style');
  style.textContent = `
    #mission-detail-body.mission-edit-focus{
      display:block!important;
      padding-top:16px!important;
    }
    #mission-detail-body.mission-edit-focus > .detail-hero,
    #mission-detail-body.mission-edit-focus > .detail-kpis,
    #mission-detail-body.mission-edit-focus > .detail-card:not(#mission-edit-card){
      display:none!important;
    }
    #mission-detail-body.mission-edit-focus #mission-edit-card{
      display:block!important;
      margin:0!important;
      border-radius:16px!important;
      box-shadow:0 12px 30px rgba(31,48,73,.08)!important;
      animation:mission-edit-enter .16s ease-out;
    }
    #mission-detail-body.mission-edit-focus #mission-edit-card .detail-card-head{
      padding-bottom:13px;
      border-bottom:1px solid #e7ecf2;
    }
    #mission-detail-body.mission-edit-focus #mission-edit-card .detail-card-head:before{
      content:"Modification en cours";
      display:inline-flex;
      margin-bottom:8px;
      padding:5px 8px;
      border-radius:999px;
      background:#fff1df;
      color:#ad5b00;
      font-size:8px;
      font-weight:850;
      letter-spacing:.04em;
      text-transform:uppercase;
    }
    #mission-detail-body.mission-edit-focus .drawer-form{
      margin-top:14px;
    }
    #mission-detail-body.mission-edit-focus .drawer-form-actions{
      position:sticky;
      bottom:0;
      margin:16px -1px -1px;
      padding:12px 1px 1px;
      background:linear-gradient(180deg,rgba(255,255,255,0),#fff 30%);
    }
    @keyframes mission-edit-enter{
      from{opacity:.45;transform:translateY(5px)}
      to{opacity:1;transform:translateY(0)}
    }
  `;
  document.head.appendChild(style);

  function editFormIsVisible() {
    const card = document.getElementById('mission-edit-card');
    return Boolean(card && card.hidden === false && card.querySelector('#mission-edit-form'));
  }

  function syncEditFocus() {
    const editing = editFormIsVisible();
    detailBody.classList.toggle('mission-edit-focus', editing);
    if (editing) {
      window.requestAnimationFrame(() => {
        detailBody.scrollTo?.({ top: 0, behavior: 'auto' });
        document.getElementById('detail-truck')?.focus({ preventScroll: true });
      });
    }
  }

  shell.addEventListener('click', (event) => {
    if (event.target.closest('#edit-mission-button, #cancel-mission-edit')) {
      window.setTimeout(syncEditFocus, 0);
    }
  });

  shell.addEventListener('submit', (event) => {
    if (event.target.matches('#expense-detail-form, #mission-edit-form')) {
      dataChanged = true;
      window.setTimeout(syncEditFocus, 0);
    }
  }, true);

  new MutationObserver(syncEditFocus).observe(detailBody, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['hidden']
  });

  function reloadIfNeeded() {
    if (!dataChanged) return;
    const activeView = location.hash || '#trips';
    sessionStorage.setItem('nexis-last-view', activeView);
    window.setTimeout(() => {
      if (location.hash !== activeView) history.replaceState(null, '', activeView);
      window.location.reload();
    }, 120);
  }

  document.querySelectorAll('[data-close-mission-detail]').forEach((button) => {
    button.addEventListener('click', reloadIfNeeded, true);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !shell.hidden) reloadIfNeeded();
  });
})();