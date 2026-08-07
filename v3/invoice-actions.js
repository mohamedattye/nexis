(() => {
  'use strict';

  if (window.__NEXIS_INVOICE_ACTIONS__) return;
  window.__NEXIS_INVOICE_ACTIONS__ = true;
  if (!window.supabase?.createClient) return;

  const db = window.supabase.createClient();
  const fmt = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
  const money = (value) => `${fmt.format(Number(value) || 0)} FCFA`;
  const esc = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
  const dateFR = (value) => {
    if (!value) return '—';
    const [year, month, day] = String(value).split('-');
    return year && month && day ? `${day}/${month}/${year}` : String(value);
  };
  const statusLabel = (status) => ({
    draft: 'Brouillon',
    issued: 'Émise',
    paid: 'Payée',
    overdue: 'En retard',
    cancelled: 'Annulée'
  })[status] || status || '—';

  let invoiceCache = [];
  let clientCache = [];
  let tripCache = [];
  let linkCache = [];
  let currentInvoice = null;

  const style = document.createElement('style');
  style.textContent = `
    .invoice-row-actions{display:flex;justify-content:flex-end;gap:5px;white-space:nowrap}
    .invoice-row-action{min-height:30px;padding:6px 9px;border:1px solid #dce3eb;border-radius:8px;background:#fff;color:#3d5065;font:700 8px var(--font-ui,"Inter",sans-serif);cursor:pointer}
    .invoice-row-action:hover{background:#f6f8fa;border-color:#cfd8e2}
    .invoice-row-action.print{color:#a85a00;border-color:#f0c58d;background:#fff9f1}
    .invoice-detail-shell{position:fixed;inset:0;z-index:120;display:grid;grid-template-columns:1fr min(720px,96vw)}
    .invoice-detail-shell[hidden]{display:none}
    .invoice-detail-overlay{border:0;background:rgba(15,29,45,.48);backdrop-filter:blur(3px)}
    .invoice-detail-drawer{display:flex;flex-direction:column;min-width:0;background:#f5f7fa;box-shadow:-22px 0 55px rgba(14,31,52,.2)}
    .invoice-detail-head{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:18px 20px;border-bottom:1px solid #e1e6ec;background:#fff}
    .invoice-detail-head small{display:block;color:#8b96a5;font-size:8px;font-weight:800;letter-spacing:.07em;text-transform:uppercase}
    .invoice-detail-head h3{margin:4px 0 0;color:#1a2b40;font-family:var(--font-display,"Manrope",sans-serif);font-size:18px;letter-spacing:-.04em}
    .invoice-detail-head-actions{display:flex;align-items:center;gap:7px}
    .invoice-detail-close{width:34px;height:34px;border:1px solid #dce3eb;border-radius:10px;background:#fff;color:#31445a;font-size:20px;cursor:pointer}
    .invoice-detail-body{padding:18px 20px 28px;overflow:auto}
    .invoice-document{max-width:680px;margin:0 auto;padding:28px;border:1px solid #e0e5eb;border-radius:16px;background:#fff;box-shadow:0 12px 32px rgba(31,48,73,.07)}
    .invoice-document-top{display:flex;justify-content:space-between;gap:24px;padding-bottom:22px;border-bottom:2px solid #162b43}
    .invoice-brand h2{margin:0;color:#10243b;font-family:var(--font-display,"Manrope",sans-serif);font-size:24px;letter-spacing:-.04em}
    .invoice-brand p{margin:5px 0 0;color:#7f8a98;font-size:9px}
    .invoice-title-block{text-align:right}
    .invoice-title-block h1{margin:0;color:#ff8500;font-family:var(--font-display,"Manrope",sans-serif);font-size:24px;letter-spacing:-.04em}
    .invoice-title-block strong{display:block;margin-top:5px;color:#26394f;font-size:11px}
    .invoice-parties{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin:22px 0}
    .invoice-party{padding:14px;border:1px solid #e5e9ee;border-radius:11px;background:#fafbfd}
    .invoice-party span{display:block;margin-bottom:6px;color:#8a95a3;font-size:7.5px;font-weight:800;text-transform:uppercase;letter-spacing:.06em}
    .invoice-party strong{display:block;color:#24384f;font-size:11px}
    .invoice-party p{margin:4px 0 0;color:#687587;font-size:8.5px;line-height:1.45}
    .invoice-meta-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:18px}
    .invoice-meta{padding:10px;border:1px solid #e5e9ee;border-radius:10px}
    .invoice-meta span{display:block;color:#8a95a3;font-size:7px;font-weight:800;text-transform:uppercase}
    .invoice-meta strong{display:block;margin-top:5px;color:#25394f;font-size:9px}
    .invoice-lines{width:100%;border-collapse:collapse}
    .invoice-lines th{padding:10px!important;background:#10243b!important;color:#fff!important;font-size:7.5px!important;text-align:left}
    .invoice-lines td{padding:11px 10px!important;border-bottom:1px solid #edf0f3;font-size:8.5px!important;color:#3b4d61}
    .invoice-lines th:last-child,.invoice-lines td:last-child{text-align:right}
    .invoice-total-box{width:min(330px,100%);margin:18px 0 0 auto;border:1px solid #dfe5eb;border-radius:11px;overflow:hidden}
    .invoice-total-row{display:flex;justify-content:space-between;gap:12px;padding:10px 12px;border-bottom:1px solid #edf0f3;color:#647286;font-size:9px}
    .invoice-total-row:last-child{border-bottom:0;background:#10243b;color:#fff;font-size:11px;font-weight:800}
    .invoice-notes{margin-top:18px;padding:12px;border-left:3px solid #ff8a00;background:#fff8ef;color:#5f6e80;font-size:8.5px;line-height:1.5}
    .invoice-edit-card{max-width:680px;margin:0 auto;padding:20px;border:1px solid #dfe5eb;border-radius:16px;background:#fff;box-shadow:0 12px 32px rgba(31,48,73,.07)}
    .invoice-edit-card h3{margin:0 0 15px;color:#1a2b40;font-size:15px}
    .invoice-edit-form{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .invoice-edit-form label{display:grid;gap:6px;color:#42546a;font-size:9px;font-weight:700}
    .invoice-edit-form label.full{grid-column:1/-1}
    .invoice-edit-form input,.invoice-edit-form select,.invoice-edit-form textarea{width:100%;margin:0!important}
    .invoice-edit-form input,.invoice-edit-form select{height:41px}
    .invoice-edit-form textarea{min-height:85px;padding:10px}
    .invoice-edit-actions{grid-column:1/-1;display:flex;justify-content:flex-end;gap:8px;margin-top:4px}
    .invoice-edit-error{grid-column:1/-1;margin:0;padding:9px;border-radius:9px;background:#fff0f0;color:#ac3e46;font-size:8.5px}
    @media(max-width:740px){
      .invoice-detail-shell{grid-template-columns:1fr}.invoice-detail-overlay{display:none}
      .invoice-document{padding:18px}.invoice-document-top,.invoice-parties{grid-template-columns:1fr;display:grid}.invoice-title-block{text-align:left}
      .invoice-meta-grid,.invoice-edit-form{grid-template-columns:1fr}.invoice-edit-form label.full{grid-column:auto}
    }
    @media print{
      body *{visibility:hidden!important}
      #invoice-print-area,#invoice-print-area *{visibility:visible!important}
      #invoice-print-area{position:absolute!important;inset:0!important;width:100%!important;max-width:none!important;margin:0!important;padding:15mm!important;border:0!important;border-radius:0!important;box-shadow:none!important}
      .invoice-detail-shell,.invoice-detail-drawer,.invoice-detail-body{position:static!important;display:block!important;background:#fff!important;overflow:visible!important;padding:0!important}
      .invoice-detail-head,.invoice-detail-overlay{display:none!important}
    }
  `;
  document.head.appendChild(style);

  const shell = document.createElement('section');
  shell.className = 'invoice-detail-shell';
  shell.id = 'invoice-detail-shell';
  shell.hidden = true;
  shell.innerHTML = `
    <button class="invoice-detail-overlay" type="button" data-close-invoice-detail></button>
    <aside class="invoice-detail-drawer">
      <header class="invoice-detail-head">
        <div><small>Fiche facture</small><h3 id="invoice-detail-title">Facture</h3></div>
        <div class="invoice-detail-head-actions">
          <button class="secondary" id="invoice-detail-edit" type="button">Modifier</button>
          <button class="primary" id="invoice-detail-print" type="button">Imprimer</button>
          <button class="invoice-detail-close" type="button" data-close-invoice-detail>×</button>
        </div>
      </header>
      <div class="invoice-detail-body" id="invoice-detail-body"></div>
    </aside>`;
  document.body.appendChild(shell);

  const detailBody = document.getElementById('invoice-detail-body');
  const detailTitle = document.getElementById('invoice-detail-title');

  async function refreshCache() {
    const [invoiceResult, clientResult, tripResult, linkResult] = await Promise.all([
      db.from('invoices').select('*').order('issue_date', { ascending: false }),
      db.from('clients').select('*'),
      db.from('trips').select('*'),
      db.from('invoice_trips').select('*')
    ]);
    if (invoiceResult.error || clientResult.error || tripResult.error || linkResult.error) {
      throw invoiceResult.error || clientResult.error || tripResult.error || linkResult.error;
    }
    invoiceCache = invoiceResult.data || [];
    clientCache = clientResult.data || [];
    tripCache = tripResult.data || [];
    linkCache = linkResult.data || [];
  }

  function clientFor(invoice) {
    return clientCache.find((client) => String(client.id) === String(invoice?.client_id));
  }

  function tripsFor(invoice) {
    const ids = new Set(linkCache.filter((link) => String(link.invoice_id) === String(invoice?.id)).map((link) => String(link.trip_id)));
    return tripCache.filter((trip) => ids.has(String(trip.id)));
  }

  function renderDocument(invoice) {
    const customer = clientFor(invoice) || {};
    const invoiceTrips = tripsFor(invoice);
    const rows = invoiceTrips.length ? invoiceTrips.map((trip) => `
      <tr>
        <td>${dateFR(trip.date)}</td>
        <td>${esc(trip.truck || '—')}</td>
        <td>${esc(trip.loadingZone || '—')} → ${esc(trip.unloadingZone || '—')}</td>
        <td>${money(trip.revenue)}</td>
      </tr>`).join('') : '<tr><td colspan="4">Aucune mission rattachée.</td></tr>';

    return `
      <article class="invoice-document" id="invoice-print-area">
        <div class="invoice-document-top">
          <div class="invoice-brand"><h2>NEXIS LOGISTICS</h2><p>Transport & logistique</p></div>
          <div class="invoice-title-block"><h1>FACTURE</h1><strong>${esc(invoice.invoice_number || 'Brouillon')}</strong></div>
        </div>
        <div class="invoice-parties">
          <div class="invoice-party"><span>Émetteur</span><strong>Nexis Logistics</strong><p>Dakar, Sénégal</p></div>
          <div class="invoice-party"><span>Facturé à</span><strong>${esc(customer.company_name || 'Client')}</strong><p>${esc(customer.address || '')}${customer.city ? `<br>${esc(customer.city)}` : ''}${customer.ninea ? `<br>NINEA : ${esc(customer.ninea)}` : ''}${customer.phone ? `<br>Tél. : ${esc(customer.phone)}` : ''}</p></div>
        </div>
        <div class="invoice-meta-grid">
          <div class="invoice-meta"><span>Date d’émission</span><strong>${dateFR(invoice.issue_date)}</strong></div>
          <div class="invoice-meta"><span>Échéance</span><strong>${dateFR(invoice.due_date)}</strong></div>
          <div class="invoice-meta"><span>Statut</span><strong>${esc(statusLabel(invoice.status))}</strong></div>
        </div>
        <table class="invoice-lines"><thead><tr><th>Date</th><th>Camion</th><th>Prestation</th><th>Montant HT</th></tr></thead><tbody>${rows}</tbody></table>
        <div class="invoice-total-box">
          <div class="invoice-total-row"><span>Total HT</span><strong>${money(invoice.subtotal_ht)}</strong></div>
          <div class="invoice-total-row"><span>TVA (${Number(invoice.vat_rate) || 0} %)</span><strong>${money(invoice.vat_amount)}</strong></div>
          <div class="invoice-total-row"><span>Total TTC</span><strong>${money(invoice.total_ttc)}</strong></div>
        </div>
        ${invoice.notes ? `<div class="invoice-notes"><strong>Notes :</strong><br>${esc(invoice.notes)}</div>` : ''}
      </article>`;
  }

  function renderEdit(invoice) {
    const clientOptions = clientCache.map((client) => `<option value="${esc(client.id)}" ${String(client.id) === String(invoice.client_id) ? 'selected' : ''}>${esc(client.company_name)}</option>`).join('');
    detailBody.innerHTML = `
      <section class="invoice-edit-card">
        <h3>Modifier la facture ${esc(invoice.invoice_number || '')}</h3>
        <form class="invoice-edit-form" id="invoice-detail-edit-form">
          <label class="full">Client<select id="edit-invoice-client" required>${clientOptions}</select></label>
          <label>Date d’émission<input id="edit-invoice-date" type="date" value="${esc(invoice.issue_date || '')}" required></label>
          <label>Échéance<input id="edit-invoice-due" type="date" value="${esc(invoice.due_date || '')}" required></label>
          <label>Statut<select id="edit-invoice-status"><option value="draft" ${invoice.status === 'draft' ? 'selected' : ''}>Brouillon</option><option value="issued" ${invoice.status === 'issued' ? 'selected' : ''}>Émise</option><option value="paid" ${invoice.status === 'paid' ? 'selected' : ''}>Payée</option><option value="overdue" ${invoice.status === 'overdue' ? 'selected' : ''}>En retard</option><option value="cancelled" ${invoice.status === 'cancelled' ? 'selected' : ''}>Annulée</option></select></label>
          <label>Taux de TVA (%)<input id="edit-invoice-vat-rate" type="number" min="0" step="0.01" value="${Number(invoice.vat_rate) || 0}"></label>
          <label class="full">Notes<textarea id="edit-invoice-notes">${esc(invoice.notes || '')}</textarea></label>
          <p class="invoice-edit-error" id="invoice-edit-error" hidden></p>
          <div class="invoice-edit-actions"><button class="secondary" id="invoice-edit-cancel" type="button">Annuler</button><button class="primary" type="submit">Enregistrer</button></div>
        </form>
      </section>`;

    document.getElementById('invoice-edit-cancel')?.addEventListener('click', () => {
      detailBody.innerHTML = renderDocument(currentInvoice);
    });

    document.getElementById('invoice-detail-edit-form')?.addEventListener('submit', saveEdit);
  }

  async function saveEdit(event) {
    event.preventDefault();
    const errorBox = document.getElementById('invoice-edit-error');
    const vatRate = Number(document.getElementById('edit-invoice-vat-rate').value) || 0;
    const subtotal = Number(currentInvoice.subtotal_ht) || 0;
    const vatAmount = Math.round(subtotal * vatRate / 100);
    const payload = {
      client_id: document.getElementById('edit-invoice-client').value,
      issue_date: document.getElementById('edit-invoice-date').value,
      due_date: document.getElementById('edit-invoice-due').value,
      status: document.getElementById('edit-invoice-status').value,
      vat_rate: vatRate,
      vat_amount: vatAmount,
      total_ttc: subtotal + vatAmount,
      notes: document.getElementById('edit-invoice-notes').value.trim() || null
    };

    const { data, error } = await db.from('invoices').update(payload).eq('id', currentInvoice.id).select().single();
    if (error) {
      errorBox.hidden = false;
      errorBox.textContent = error.message || 'Modification impossible.';
      return;
    }

    currentInvoice = data;
    await refreshCache();
    detailBody.innerHTML = renderDocument(currentInvoice);
    detailTitle.textContent = currentInvoice.invoice_number || 'Facture';
    window.dispatchEvent(new Event('nexis:invoice-updated'));
    document.getElementById('invoice-refresh')?.click();
  }

  async function openInvoice(invoiceId) {
    try {
      if (!invoiceCache.length) await refreshCache();
      currentInvoice = invoiceCache.find((invoice) => String(invoice.id) === String(invoiceId));
      if (!currentInvoice) {
        await refreshCache();
        currentInvoice = invoiceCache.find((invoice) => String(invoice.id) === String(invoiceId));
      }
      if (!currentInvoice) throw new Error('Facture introuvable');
      detailTitle.textContent = currentInvoice.invoice_number || 'Facture';
      detailBody.innerHTML = renderDocument(currentInvoice);
      shell.hidden = false;
      document.body.style.overflow = 'hidden';
    } catch (error) {
      console.error('Ouverture facture :', error);
    }
  }

  function closeInvoice() {
    shell.hidden = true;
    document.body.style.overflow = '';
    currentInvoice = null;
  }

  async function enhanceRows() {
    const body = document.getElementById('invoice-body');
    if (!body || !document.querySelector('#invoices .invoice-page')) return;
    try {
      await refreshCache();
      [...body.querySelectorAll('tr')].forEach((row) => {
        const number = row.querySelector('.invoice-number')?.textContent?.trim();
        if (!number || row.querySelector('.invoice-row-actions')) return;
        const invoice = invoiceCache.find((item) => String(item.invoice_number) === number);
        if (!invoice) return;
        const cells = row.querySelectorAll('td');
        const target = cells[cells.length - 1];
        if (!target) return;
        const existing = target.querySelector('.invoice-actions');
        const wrapper = document.createElement('div');
        wrapper.className = 'invoice-row-actions';
        wrapper.innerHTML = `<button class="invoice-row-action" type="button" data-view-invoice="${esc(invoice.id)}">Voir</button><button class="invoice-row-action" type="button" data-edit-invoice="${esc(invoice.id)}">Modifier</button><button class="invoice-row-action print" type="button" data-print-invoice="${esc(invoice.id)}">Imprimer</button>`;
        if (existing) target.insertBefore(wrapper, existing);
        else target.appendChild(wrapper);
      });
    } catch (error) {
      console.error('Actions facture :', error);
    }
  }

  document.addEventListener('click', async (event) => {
    const viewButton = event.target.closest('[data-view-invoice]');
    if (viewButton) {
      event.preventDefault();
      await openInvoice(viewButton.dataset.viewInvoice);
      return;
    }

    const editButton = event.target.closest('[data-edit-invoice]');
    if (editButton) {
      event.preventDefault();
      await openInvoice(editButton.dataset.editInvoice);
      renderEdit(currentInvoice);
      return;
    }

    const printButton = event.target.closest('[data-print-invoice]');
    if (printButton) {
      event.preventDefault();
      await openInvoice(printButton.dataset.printInvoice);
      window.setTimeout(() => window.print(), 180);
      return;
    }

    if (event.target.closest('[data-close-invoice-detail]')) closeInvoice();
  }, true);

  document.getElementById('invoice-detail-edit')?.addEventListener('click', () => {
    if (currentInvoice) renderEdit(currentInvoice);
  });
  document.getElementById('invoice-detail-print')?.addEventListener('click', () => {
    if (currentInvoice) window.print();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !shell.hidden) closeInvoice();
  });

  const observer = new MutationObserver(() => window.setTimeout(enhanceRows, 0));
  const watch = () => {
    const body = document.getElementById('invoice-body');
    if (body) observer.observe(body, { childList: true, subtree: true });
    enhanceRows();
  };
  window.addEventListener('hashchange', () => {
    if (location.hash === '#invoices') window.setTimeout(watch, 250);
  });
  window.setTimeout(watch, 500);
})();