(() => {
  'use strict';
  if (window.__NEXIS_DOCUMENT_BRANDING__) return;
  window.__NEXIS_DOCUMENT_BRANDING__ = true;

  const esc = value => String(value ?? '')
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;').replaceAll("'",'&#039;');

  function organization() {
    return window.NexisOrganization?.organization?.() || null;
  }

  function addressLines(org) {
    return [org?.address, [org?.city, org?.country].filter(Boolean).join(', ')].filter(Boolean);
  }

  function identityHtml(org) {
    if (!org) return '';
    const logo = org.logo_url ? `<img src="${esc(org.logo_url)}" alt="Logo" style="width:46px;height:46px;object-fit:contain;border-radius:8px;margin-bottom:8px">` : '';
    const meta = [
      org.ninea ? `NINEA : ${esc(org.ninea)}` : '',
      org.rccm ? `RCCM : ${esc(org.rccm)}` : '',
      org.phone ? `Tél. : ${esc(org.phone)}` : '',
      org.email ? esc(org.email) : ''
    ].filter(Boolean).join('<br>');
    return `${logo}<h2>${esc(org.legal_name || org.name || 'Entreprise')}</h2><p>${addressLines(org).map(esc).join('<br>')}${meta ? `<br>${meta}` : ''}</p>`;
  }

  function patchInvoiceDocument(root) {
    const org = organization();
    if (!org || !root) return;

    const brand = root.querySelector('.invoice-brand');
    if (brand) brand.innerHTML = identityHtml(org);

    const issuer = root.querySelector('.invoice-parties .invoice-party:first-child');
    if (issuer) {
      issuer.innerHTML = `<span>Émetteur</span><strong>${esc(org.legal_name || org.name || 'Entreprise')}</strong><p>${addressLines(org).map(esc).join('<br>')}${org.ninea ? `<br>NINEA : ${esc(org.ninea)}` : ''}${org.rccm ? `<br>RCCM : ${esc(org.rccm)}` : ''}${org.phone ? `<br>Tél. : ${esc(org.phone)}` : ''}${org.email ? `<br>${esc(org.email)}` : ''}</p>`;
    }
  }

  function patchPriceNote(root) {
    const org = organization();
    if (!org || !root) return;
    const top = root.querySelector('.note-detail-top > div:first-child');
    if (top) top.innerHTML = identityHtml(org);
  }

  function patchAll() {
    document.querySelectorAll('#invoice-print-area').forEach(patchInvoiceDocument);
    document.querySelectorAll('#billing-note-print').forEach(patchPriceNote);
  }

  const observer = new MutationObserver(() => requestAnimationFrame(patchAll));
  observer.observe(document.body, { childList: true, subtree: true });

  window.addEventListener('nexis:organization-ready', patchAll);
  window.addEventListener('nexis:organization-updated', patchAll);
  window.setTimeout(patchAll, 500);
})();
