(() => {
  'use strict';
  if (window.__NEXIS_FACTURATION_UI_PREMIUM_V2__) return;
  window.__NEXIS_FACTURATION_UI_PREMIUM_V2__ = true;

  const style = document.createElement('style');
  style.textContent = `
    #invoices .invoice-table-wrap{overflow-x:auto;overflow-y:visible}
    #invoices .invoice-table tbody tr{transition:background .15s ease}
    #invoices .invoice-table tbody tr:hover{background:#fbfcfd}
    #invoices .invoice-table th{padding-top:11px!important;padding-bottom:11px!important;color:#748194!important;font-size:8px!important;letter-spacing:.035em;text-transform:uppercase}
    #invoices .invoice-table td{padding-top:13px!important;padding-bottom:13px!important}
    #invoices .invoice-table th:nth-last-child(-n+2),#invoices .invoice-table td:nth-last-child(-n+2){text-align:right}
    #invoices .invoice-row-actions,#invoices .invoice-actions{display:none!important}
    #invoices .invoice-unified-actions{display:flex;justify-content:flex-end;align-items:center;min-width:92px}
    #invoices .invoice-actions-trigger{height:32px;padding:0 11px;border:1px solid #d8e0e8;border-radius:9px;background:#fff;color:#405268;font:750 8.5px var(--font-ui,"Inter",sans-serif);cursor:pointer;box-shadow:0 1px 2px rgba(20,39,61,.03);transition:.15s ease}
    #invoices .invoice-actions-trigger:hover{border-color:#c4cfda;background:#f8fafc;color:#20384f}
    #invoices .invoice-actions-trigger[aria-expanded="true"]{border-color:#ffb35d;background:#fff8ef;color:#9b5a00;box-shadow:0 0 0 3px rgba(255,139,20,.09)}
    .nexis-invoice-action-popover{position:fixed;z-index:10000;min-width:168px;padding:6px;border:1px solid #dfe5ec;border-radius:12px;background:#fff;box-shadow:0 16px 38px rgba(20,39,61,.18)}
    .nexis-invoice-action-popover[hidden]{display:none}
    .nexis-invoice-action-popover button{display:flex;width:100%;align-items:center;min-height:34px;padding:8px 10px;border:0;border-radius:8px;background:transparent;color:#34495f;text-align:left;font:700 9px var(--font-ui,"Inter",sans-serif);cursor:pointer}
    .nexis-invoice-action-popover button:hover{background:#f5f8fa;color:#152b42}
    .nexis-invoice-action-popover button.print{color:#9b5a00}.nexis-invoice-action-popover button.print:hover{background:#fff7ed}
    .nexis-invoice-action-popover button.danger{margin-top:3px;border-top:1px solid #edf0f3;border-radius:0 0 8px 8px;color:#a33f47}.nexis-invoice-action-popover button.danger:hover{background:#fff3f4}
    #invoices .invoice-status{padding:4px 7px!important;font-size:7.5px!important}
    #invoices .billing-tabs{margin-bottom:10px!important}
    #invoices .billing-tab{min-height:31px!important;padding:6px 11px!important}
    #invoices .billing-head-actions button{min-height:34px!important;padding:0 13px!important;font-size:8.5px!important}
    @media(max-width:740px){#invoices .invoice-unified-actions{min-width:76px}.nexis-invoice-action-popover{min-width:155px}}
  `;
  document.head.appendChild(style);

  const popover = document.createElement('div');
  popover.className = 'nexis-invoice-action-popover';
  popover.hidden = true;
  document.body.appendChild(popover);

  let activeTrigger = null;

  function sourceButtons(row) {
    return [
      ...row.querySelectorAll('.invoice-row-actions > button'),
      ...row.querySelectorAll('.invoice-actions > button')
    ].filter((button, index, all) => all.indexOf(button) === index);
  }

  function closePopover() {
    popover.hidden = true;
    popover.innerHTML = '';
    if (activeTrigger) activeTrigger.setAttribute('aria-expanded', 'false');
    activeTrigger = null;
  }

  function placePopover(trigger) {
    const rect = trigger.getBoundingClientRect();
    const width = 168;
    const estimatedHeight = Math.max(48, popover.scrollHeight || 150);
    let left = rect.right - width;
    left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
    let top = rect.bottom + 6;
    if (top + estimatedHeight > window.innerHeight - 8) top = Math.max(8, rect.top - estimatedHeight - 6);
    popover.style.left = `${left}px`;
    popover.style.top = `${top}px`;
  }

  function openPopover(row, trigger) {
    const sources = sourceButtons(row);
    if (!sources.length) return;

    popover.innerHTML = '';
    sources.forEach(source => {
      const label = (source.textContent || '').trim() || 'Action';
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      if (/imprimer/i.test(label)) button.classList.add('print');
      if (/annuler|supprimer/i.test(label)) button.classList.add('danger');
      button.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        closePopover();
        source.click();
      });
      popover.appendChild(button);
    });

    if (activeTrigger && activeTrigger !== trigger) activeTrigger.setAttribute('aria-expanded', 'false');
    activeTrigger = trigger;
    trigger.setAttribute('aria-expanded', 'true');
    popover.hidden = false;
    requestAnimationFrame(() => placePopover(trigger));
  }

  function enhanceRow(row) {
    const cells = row.querySelectorAll('td');
    if (!cells.length) return;
    const lastCell = cells[cells.length - 1];
    if (!lastCell) return;

    let root = lastCell.querySelector(':scope > .invoice-unified-actions');
    if (!root) {
      root = document.createElement('div');
      root.className = 'invoice-unified-actions';
      const trigger = document.createElement('button');
      trigger.type = 'button';
      trigger.className = 'invoice-actions-trigger';
      trigger.textContent = 'Actions ▾';
      trigger.setAttribute('aria-expanded', 'false');
      trigger.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        if (!popover.hidden && activeTrigger === trigger) {
          closePopover();
          return;
        }
        openPopover(row, trigger);
      });
      root.appendChild(trigger);
      lastCell.appendChild(root);
    }
  }

  function enhanceAll() {
    document.querySelectorAll('#invoices #invoice-body tr').forEach(row => {
      if (row.querySelector('td.invoice-empty')) return;
      enhanceRow(row);
    });
  }

  const observer = new MutationObserver(() => requestAnimationFrame(enhanceAll));

  function attach() {
    const body = document.getElementById('invoice-body');
    if (!body) return false;
    observer.disconnect();
    observer.observe(body, { childList:true, subtree:true });
    enhanceAll();
    return true;
  }

  document.addEventListener('click', event => {
    if (!event.target.closest('.nexis-invoice-action-popover') && !event.target.closest('#invoices .invoice-actions-trigger')) closePopover();
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closePopover(); });
  window.addEventListener('resize', closePopover);
  window.addEventListener('scroll', closePopover, true);
  window.addEventListener('hashchange', () => {
    closePopover();
    if (location.hash === '#invoices') setTimeout(attach, 150);
  });

  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    if (attach() || attempts > 30) clearInterval(timer);
  }, 250);
})();
