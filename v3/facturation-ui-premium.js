(() => {
  'use strict';
  if (window.__NEXIS_FACTURATION_UI_PREMIUM_V3__) return;
  window.__NEXIS_FACTURATION_UI_PREMIUM_V3__ = true;

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

    #invoices .invoice-vat-choice{display:grid;gap:7px;padding:11px 12px;border:1px solid #dfe5ec;border-radius:12px;background:#fff}
    #invoices .invoice-vat-choice-label{color:#405168;font-size:9px;font-weight:750}
    #invoices .invoice-vat-choice-help{margin-top:-2px;color:#8995a4;font-size:8px;line-height:1.35}
    #invoices .invoice-vat-options{display:grid;grid-template-columns:1fr 1fr;gap:7px}
    #invoices .invoice-vat-option{min-height:38px;border:1px solid #dce3ea;border-radius:9px;background:#f8fafb;color:#536579;font:750 9px var(--font-ui,"Inter",sans-serif);cursor:pointer;transition:.15s ease}
    #invoices .invoice-vat-option:hover{border-color:#cbd5df;background:#fff}
    #invoices .invoice-vat-option.active{border-color:#ffad50;background:#fff7ed;color:#9a5700;box-shadow:0 0 0 3px rgba(255,139,20,.09)}
    #invoices .invoice-vat-option[data-vat-rate="0"].active{border-color:#b9c5d2;background:#f3f6f8;color:#33485e;box-shadow:0 0 0 3px rgba(84,105,126,.07)}

    @media(max-width:740px){
      #invoices .invoice-unified-actions{min-width:76px}.nexis-invoice-action-popover{min-width:155px}
      #invoices .invoice-vat-options{grid-template-columns:1fr}
    }
  `;
  document.head.appendChild(style);

  const popover = document.createElement('div');
  popover.className = 'nexis-invoice-action-popover';
  popover.hidden = true;
  document.body.appendChild(popover);

  let activeTrigger = null;
  let vatRate = 18;
  let shellObserver = null;

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

  function parseMoney(text) {
    const digits = String(text || '').replace(/[^0-9-]/g, '');
    return Number(digits) || 0;
  }

  function selectedHtFromDom() {
    return [...document.querySelectorAll('#invoice-trip-list .invoice-trip-option')]
      .filter(label => label.querySelector('[data-invoice-trip]')?.checked)
      .reduce((sum, label) => sum + parseMoney(label.querySelector('b')?.textContent), 0);
  }

  function updateVatSummary() {
    const htEl = document.getElementById('invoice-ht');
    const vatEl = document.getElementById('invoice-vat');
    const ttcEl = document.getElementById('invoice-ttc');
    if (!htEl || !vatEl || !ttcEl) return;

    const ht = selectedHtFromDom();
    const vat = Math.round(ht * vatRate / 100);
    const format = value => `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value)} FCFA`;
    htEl.textContent = format(ht);
    vatEl.textContent = format(vat);
    ttcEl.textContent = format(ht + vat);

    const vatCard = vatEl.closest('div');
    const vatLabel = vatCard?.querySelector('span');
    if (vatLabel) vatLabel.textContent = vatRate === 0 ? 'TVA 0% (non appliquée)' : 'TVA 18%';
  }

  function setVatRate(rate) {
    vatRate = Number(rate) === 0 ? 0 : 18;
    document.querySelectorAll('#invoices .invoice-vat-option').forEach(button => {
      button.classList.toggle('active', Number(button.dataset.vatRate) === vatRate);
    });
    const hidden = document.getElementById('invoice-vat-rate-choice');
    if (hidden) hidden.value = String(vatRate);
    updateVatSummary();
  }

  function injectVatChoice() {
    const form = document.getElementById('invoice-form');
    const summary = form?.querySelector('.invoice-summary');
    if (!form || !summary) return false;

    if (!document.getElementById('invoice-vat-choice')) {
      const block = document.createElement('div');
      block.className = 'invoice-vat-choice';
      block.id = 'invoice-vat-choice';
      block.innerHTML = `
        <div class="invoice-vat-choice-label">TVA sur ce document</div>
        <div class="invoice-vat-choice-help">Choisissez le régime à appliquer à cette facture ou note de prix.</div>
        <div class="invoice-vat-options">
          <button class="invoice-vat-option active" type="button" data-vat-rate="18">Avec TVA — 18 %</button>
          <button class="invoice-vat-option" type="button" data-vat-rate="0">Sans TVA — 0 %</button>
        </div>
        <input id="invoice-vat-rate-choice" type="hidden" value="18" />`;
      summary.before(block);
      block.querySelectorAll('[data-vat-rate]').forEach(button => {
        button.addEventListener('click', () => setVatRate(Number(button.dataset.vatRate)));
      });
    }
    updateVatSummary();
    return true;
  }

  async function syncVatForOpenedForm() {
    if (!injectVatChoice()) return;
    setVatRate(18);
    const title = document.getElementById('invoice-form-title')?.textContent?.trim() || '';
    const match = title.match(/Modifier\s+(NP-\d{4}-\d+)/i);
    if (!match || !window.supabase?.createClient) return;

    try {
      const db = window.supabase.createClient();
      const result = await db.from('invoices').select('notes,vat_rate');
      if (result.error) return;
      const marker = `[[NEXIS_PRICE_NOTE:${match[1]}]]`;
      const note = (result.data || []).find(item => String(item.notes || '').includes(marker));
      if (note) setVatRate(Number(note.vat_rate) === 0 ? 0 : 18);
    } catch (error) {
      console.error('Lecture TVA note de prix :', error);
    }
  }

  async function nextPriceNoteNumber(db) {
    const year = new Date().getFullYear();
    const result = await db.from('invoices').select('notes');
    if (result.error) throw result.error;
    const nums = (result.data || []).map(item => {
      const match = String(item.notes || '').match(new RegExp(`\\[\\[NEXIS_PRICE_NOTE:NP-${year}-(\\d+)\\]\\]`));
      return match ? Number(match[1]) : 0;
    });
    return `NP-${year}-${String(Math.max(0, ...nums) + 1).padStart(5, '0')}`;
  }

  async function saveWithoutVat(form) {
    const errorBox = document.getElementById('invoice-error');
    const saveButton = document.getElementById('invoice-save');
    const clientId = document.getElementById('invoice-client')?.value || '';
    const issueDate = document.getElementById('invoice-date')?.value || '';
    const dueDate = document.getElementById('invoice-due-date')?.value || '';
    const notesText = document.getElementById('invoice-notes')?.value?.trim() || '';
    const tripIds = [...document.querySelectorAll('#invoice-trip-list [data-invoice-trip]:checked')].map(input => String(input.dataset.invoiceTrip));

    if (!clientId) {
      if (errorBox) { errorBox.textContent = 'Sélectionnez un client.'; errorBox.hidden = false; }
      return;
    }
    if (!tripIds.length) {
      if (errorBox) { errorBox.textContent = 'Sélectionnez au moins une mission.'; errorBox.hidden = false; }
      return;
    }

    if (errorBox) errorBox.hidden = true;
    if (saveButton) saveButton.disabled = true;

    try {
      const db = window.supabase.createClient();
      const tripResult = await db.from('trips').select('id,revenue').in('id', tripIds);
      if (tripResult.error) throw tripResult.error;
      const ht = (tripResult.data || []).reduce((sum, trip) => sum + (Number(trip.revenue) || 0), 0);
      const title = document.getElementById('invoice-form-title')?.textContent?.trim() || '';
      const isNote = /note de prix/i.test(title) || /^Modifier\s+NP-/i.test(title);
      const editMatch = title.match(/Modifier\s+(NP-\d{4}-\d+)/i);
      let documentId = null;

      if (isNote) {
        let number = editMatch?.[1] || '';
        if (editMatch) {
          const allResult = await db.from('invoices').select('id,notes');
          if (allResult.error) throw allResult.error;
          const marker = `[[NEXIS_PRICE_NOTE:${number}]]`;
          const existing = (allResult.data || []).find(item => String(item.notes || '').includes(marker));
          if (!existing) throw new Error('Note de prix introuvable.');
          documentId = existing.id;
        } else {
          number = await nextPriceNoteNumber(db);
        }

        const taggedNotes = `[[NEXIS_PRICE_NOTE:${number}]]${notesText ? `\n${notesText}` : ''}`;
        const payload = {
          client_id: clientId,
          issue_date: issueDate,
          due_date: dueDate,
          status: 'draft',
          subtotal_ht: ht,
          vat_rate: 0,
          vat_amount: 0,
          total_ttc: ht,
          notes: taggedNotes
        };

        if (documentId) {
          const updateResult = await db.from('invoices').update(payload).eq('id', documentId).select().single();
          if (updateResult.error) throw updateResult.error;
          const deleteLinks = await db.from('invoice_trips').delete().eq('invoice_id', documentId);
          if (deleteLinks.error) throw deleteLinks.error;
        } else {
          const insertResult = await db.from('invoices').insert(payload).select().single();
          if (insertResult.error) throw insertResult.error;
          documentId = insertResult.data.id;
        }
      } else {
        const payload = {
          client_id: clientId,
          issue_date: issueDate,
          due_date: dueDate,
          status: 'draft',
          subtotal_ht: ht,
          vat_rate: 0,
          vat_amount: 0,
          total_ttc: ht,
          notes: notesText || null
        };
        const insertResult = await db.from('invoices').insert(payload).select().single();
        if (insertResult.error) throw insertResult.error;
        documentId = insertResult.data.id;
      }

      const links = await db.from('invoice_trips').insert(tripIds.map(trip_id => ({ invoice_id: documentId, trip_id })));
      if (links.error) throw links.error;

      document.querySelector('#invoice-shell [data-close-invoice]')?.click();
      window.setTimeout(() => document.getElementById('invoice-refresh')?.click(), 120);
    } catch (error) {
      console.error('Enregistrement sans TVA :', error);
      if (errorBox) {
        errorBox.textContent = error.message || 'Enregistrement impossible.';
        errorBox.hidden = false;
      }
    } finally {
      if (saveButton) saveButton.disabled = false;
    }
  }

  const rowObserver = new MutationObserver(() => requestAnimationFrame(enhanceAll));

  function attach() {
    const body = document.getElementById('invoice-body');
    const shell = document.getElementById('invoice-shell');
    if (!body) return false;

    rowObserver.disconnect();
    rowObserver.observe(body, { childList:true, subtree:true });
    enhanceAll();
    injectVatChoice();

    if (shell && !shellObserver) {
      shellObserver = new MutationObserver(mutations => {
        if (mutations.some(mutation => mutation.type === 'attributes' && mutation.attributeName === 'hidden') && !shell.hidden) {
          window.setTimeout(syncVatForOpenedForm, 0);
        }
      });
      shellObserver.observe(shell, { attributes:true, attributeFilter:['hidden'] });
    }
    return true;
  }

  document.addEventListener('click', event => {
    if (!event.target.closest('.nexis-invoice-action-popover') && !event.target.closest('#invoices .invoice-actions-trigger')) closePopover();
  });

  document.addEventListener('change', event => {
    if (event.target.closest('#invoice-trip-list [data-invoice-trip]')) window.setTimeout(updateVatSummary, 0);
  }, true);

  document.addEventListener('submit', event => {
    const form = event.target.closest?.('#invoice-form');
    if (!form || vatRate !== 0) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    saveWithoutVat(form);
  }, true);

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
