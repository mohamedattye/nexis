(() => {
  'use strict';
  if (window.__NEXIS_INVOICE_DOCUMENT_V2__) return;
  window.__NEXIS_INVOICE_DOCUMENT_V2__ = true;

  const db = window.NexisAuth?.client || window.supabase?.createClient?.();
  const customerCache = new Map();
  const pending = new Set();

  const esc = value => String(value ?? '')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');

  const clean = value => String(value ?? '').trim();

  const style = document.createElement('style');
  style.textContent = `
    #invoice-print-area.invoice-document-v2{max-width:720px}
    #invoice-print-area .invoice-brand{display:flex;align-items:flex-start;gap:13px;min-width:0}
    #invoice-print-area .invoice-company-logo{width:58px;height:58px;object-fit:contain;border-radius:10px;flex:0 0 auto}
    #invoice-print-area .invoice-company-copy{min-width:0}
    #invoice-print-area .invoice-company-copy h2{margin:0;color:#10243b;font-family:var(--font-display,"Manrope",sans-serif);font-size:22px;line-height:1.15;letter-spacing:-.035em}
    #invoice-print-area .invoice-company-copy .invoice-commercial-name{margin-top:4px;color:#536579;font-size:9.5px;font-weight:650}
    #invoice-print-area .invoice-company-copy p{margin:5px 0 0;color:#788697;font-size:9px;line-height:1.5}
    #invoice-print-area .invoice-party strong{font-size:11.5px}
    #invoice-print-area .invoice-party p{font-size:9px;line-height:1.55}
    #invoice-print-area .invoice-party p:empty{display:none}
    #invoice-print-area .invoice-meta strong{font-size:9.5px}
    #invoice-print-area .invoice-document-footer{display:flex;justify-content:space-between;gap:20px;margin-top:24px;padding-top:12px;border-top:1px solid #e8edf2;color:#8a96a4;font-size:8px;line-height:1.45}

    @page{size:A4 portrait;margin:12mm}
    @media print{
      html,body{width:210mm!important;min-height:297mm!important;background:#fff!important}
      #invoice-print-area.invoice-document-v2{
        position:static!important;
        width:auto!important;
        max-width:none!important;
        min-height:0!important;
        margin:0!important;
        padding:0!important;
        border:0!important;
        border-radius:0!important;
        box-shadow:none!important;
        background:#fff!important;
        color:#172b42!important;
        font-family:Arial,Helvetica,sans-serif!important;
        -webkit-print-color-adjust:exact!important;
        print-color-adjust:exact!important;
      }
      #invoice-print-area .invoice-document-top{gap:10mm!important;padding-bottom:7mm!important;border-bottom:1.2pt solid #162b43!important}
      #invoice-print-area .invoice-company-logo{width:18mm!important;height:18mm!important;border-radius:0!important}
      #invoice-print-area .invoice-company-copy h2{font-size:19pt!important;line-height:1.1!important}
      #invoice-print-area .invoice-company-copy .invoice-commercial-name{font-size:9.5pt!important;margin-top:1.5mm!important}
      #invoice-print-area .invoice-company-copy p{font-size:9pt!important;line-height:1.45!important;margin-top:1.5mm!important}
      #invoice-print-area .invoice-title-block h1{font-size:22pt!important;line-height:1!important}
      #invoice-print-area .invoice-title-block strong{font-size:11pt!important;margin-top:2mm!important}
      #invoice-print-area .invoice-parties{gap:5mm!important;margin:7mm 0!important}
      #invoice-print-area .invoice-party{padding:4mm!important;border:0.8pt solid #dce3ea!important;border-radius:2.5mm!important;background:#fafbfd!important;break-inside:avoid!important}
      #invoice-print-area .invoice-party span{font-size:8pt!important;margin-bottom:2mm!important;letter-spacing:.05em!important}
      #invoice-print-area .invoice-party strong{font-size:11pt!important;line-height:1.25!important}
      #invoice-print-area .invoice-party p{font-size:9pt!important;line-height:1.5!important;margin-top:1.5mm!important}
      #invoice-print-area .invoice-meta-grid{gap:3mm!important;margin-bottom:6mm!important}
      #invoice-print-area .invoice-meta{padding:3.2mm!important;border:0.8pt solid #e0e6ec!important;border-radius:2.5mm!important;break-inside:avoid!important}
      #invoice-print-area .invoice-meta span{font-size:7.8pt!important}
      #invoice-print-area .invoice-meta strong{font-size:9.5pt!important;margin-top:1.5mm!important}
      #invoice-print-area .invoice-lines{page-break-inside:auto!important}
      #invoice-print-area .invoice-lines tr{page-break-inside:avoid!important;page-break-after:auto!important}
      #invoice-print-area .invoice-lines th{padding:3.2mm 3mm!important;font-size:8.5pt!important;line-height:1.2!important;background:#10243b!important;color:#fff!important}
      #invoice-print-area .invoice-lines td{padding:3.2mm 3mm!important;font-size:9pt!important;line-height:1.35!important;color:#30465c!important}
      #invoice-print-area .invoice-total-box{width:78mm!important;margin-top:6mm!important;border:0.8pt solid #dce3ea!important;border-radius:2.5mm!important;break-inside:avoid!important}
      #invoice-print-area .invoice-total-row{padding:3.2mm 3.5mm!important;font-size:9.5pt!important}
      #invoice-print-area .invoice-total-row:last-child{font-size:11pt!important;background:#10243b!important;color:#fff!important}
      #invoice-print-area .invoice-notes{margin-top:6mm!important;padding:3.5mm!important;font-size:9pt!important;line-height:1.5!important;break-inside:avoid!important}
      #invoice-print-area .invoice-document-footer{margin-top:8mm!important;padding-top:3mm!important;font-size:7.8pt!important}
    }
  `;
  document.head.appendChild(style);

  function organization() {
    return window.NexisOrganization?.organization?.() || null;
  }

  function joinLines(lines) {
    return lines.map(clean).filter(Boolean).map(esc).join('<br>');
  }

  function companyBrandHtml(org) {
    if (!org) return '';
    const displayName = clean(org.name) || clean(org.legal_name) || 'Entreprise';
    const legalName = clean(org.legal_name);
    const differentLegalName = legalName && legalName.toLowerCase() !== displayName.toLowerCase();
    const location = [clean(org.city), clean(org.country)].filter(Boolean).join(', ');
    const contact = [
      clean(org.address),
      location,
      clean(org.phone) ? `Tél. : ${clean(org.phone)}` : '',
      clean(org.email)
    ].filter(Boolean);
    const logo = clean(org.logo_url)
      ? `<img class="invoice-company-logo" src="${esc(org.logo_url)}" alt="Logo ${esc(displayName)}">`
      : '';
    return `${logo}<div class="invoice-company-copy"><h2>${esc(displayName)}</h2>${differentLegalName ? `<div class="invoice-commercial-name">${esc(legalName)}</div>` : ''}<p>${joinLines(contact)}</p></div>`;
  }

  function issuerHtml(org) {
    if (!org) return '';
    const displayName = clean(org.name) || clean(org.legal_name) || 'Entreprise';
    const legalName = clean(org.legal_name);
    const location = [clean(org.city), clean(org.country)].filter(Boolean).join(', ');
    const lines = [
      legalName && legalName.toLowerCase() !== displayName.toLowerCase() ? legalName : '',
      clean(org.address),
      location,
      clean(org.ninea) ? `NINEA : ${clean(org.ninea)}` : '',
      clean(org.rccm) ? `RCCM : ${clean(org.rccm)}` : '',
      clean(org.phone) ? `Tél. : ${clean(org.phone)}` : '',
      clean(org.email)
    ];
    return `<span>Émetteur</span><strong>${esc(displayName)}</strong><p>${joinLines(lines)}</p>`;
  }

  function customerHtml(customer) {
    const name = clean(customer?.company_name) || 'Client';
    const lines = [
      clean(customer?.contact_name) ? `Contact : ${clean(customer.contact_name)}` : '',
      clean(customer?.address),
      clean(customer?.city),
      clean(customer?.ninea) ? `NINEA : ${clean(customer.ninea)}` : '',
      clean(customer?.rccm) ? `RCCM : ${clean(customer.rccm)}` : '',
      clean(customer?.phone) ? `Tél. : ${clean(customer.phone)}` : '',
      clean(customer?.email)
    ];
    return `<span>Facturé à</span><strong>${esc(name)}</strong><p>${joinLines(lines)}</p>`;
  }

  function addFooter(root, org) {
    if (root.querySelector('.invoice-document-footer')) return;
    const footer = document.createElement('div');
    footer.className = 'invoice-document-footer';
    const legal = [
      clean(org?.ninea) ? `NINEA ${clean(org.ninea)}` : '',
      clean(org?.rccm) ? `RCCM ${clean(org.rccm)}` : ''
    ].filter(Boolean).join(' · ');
    footer.innerHTML = `<span>${esc(legal)}</span><span>Facture générée avec Nexis</span>`;
    root.appendChild(footer);
  }

  function invoiceNumber(root) {
    return clean(root.querySelector('.invoice-title-block strong')?.textContent);
  }

  async function loadCustomer(number) {
    if (!db || !number || number === 'Brouillon') return null;
    if (customerCache.has(number)) return customerCache.get(number);
    if (pending.has(number)) return null;
    pending.add(number);
    try {
      let invoiceResult = await db.from('invoices')
        .select('client_id,invoice_number,document_number')
        .eq('invoice_number', number)
        .limit(1);
      let invoice = invoiceResult.data?.[0] || null;
      if (!invoice && !invoiceResult.error) {
        const fallback = await db.from('invoices')
          .select('client_id,invoice_number,document_number')
          .eq('document_number', number)
          .limit(1);
        invoice = fallback.data?.[0] || null;
      }
      if (!invoice?.client_id) return null;
      const customerResult = await db.from('clients')
        .select('id,company_name,contact_name,address,city,ninea,rccm,phone,email')
        .eq('id', invoice.client_id)
        .single();
      if (customerResult.error) throw customerResult.error;
      customerCache.set(number, customerResult.data || null);
      return customerResult.data || null;
    } catch (error) {
      console.warn('Facture Nexis — informations client :', error);
      return null;
    } finally {
      pending.delete(number);
    }
  }

  async function patchInvoice(root) {
    if (!root || root.dataset.invoiceDocumentV2Busy === '1') return;
    root.dataset.invoiceDocumentV2Busy = '1';
    root.classList.add('invoice-document-v2');
    try {
      const org = organization();
      if (org) {
        const brand = root.querySelector('.invoice-brand');
        if (brand) brand.innerHTML = companyBrandHtml(org);
        const issuer = root.querySelector('.invoice-parties .invoice-party:first-child');
        if (issuer) issuer.innerHTML = issuerHtml(org);
        addFooter(root, org);
      }

      const number = invoiceNumber(root);
      const customer = await loadCustomer(number);
      if (customer) {
        const customerBox = root.querySelector('.invoice-parties .invoice-party:nth-child(2)');
        if (customerBox) customerBox.innerHTML = customerHtml(customer);
      }
      root.dataset.invoiceDocumentV2 = '1';
    } finally {
      delete root.dataset.invoiceDocumentV2Busy;
    }
  }

  function patchAll() {
    document.querySelectorAll('#invoice-print-area').forEach(root => {
      patchInvoice(root);
    });
  }

  const observer = new MutationObserver(() => requestAnimationFrame(patchAll));
  observer.observe(document.body, { childList:true, subtree:true });
  window.addEventListener('nexis:organization-ready', patchAll);
  window.addEventListener('nexis:organization-updated', () => {
    customerCache.clear();
    patchAll();
  });
  window.addEventListener('beforeprint', patchAll);
  window.setTimeout(patchAll, 250);
})();