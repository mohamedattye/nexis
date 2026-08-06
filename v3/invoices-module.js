(() => {
  'use strict';

  if (window.__NEXIS_INVOICES_MODULE__) return;
  window.__NEXIS_INVOICES_MODULE__ = true;
  if (!window.supabase?.createClient) return;

  const view = document.getElementById('invoices');
  if (!view) return;

  const client = window.supabase.createClient();
  const moneyFormatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
  const VAT_RATE = 18;

  let invoices = [];
  let clients = [];
  let trips = [];
  let invoiceTrips = [];
  let selectedClientId = '';
  let selectedTripIds = new Set();
  let statusFilter = 'all';

  const money = (value) => `${moneyFormatter.format(Number(value) || 0)} FCFA`;
  const esc = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const formatDate = (value) => {
    if