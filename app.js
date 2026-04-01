const SUPABASE_URL = "https://ifspadsghwizzjofcscf.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_XN7xuh4te5IypVwI0UySvg_A9qCUlTK";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


const TRIPS_STORAGE_KEY = 'nexis-logistic-trips';
const COSTS_STORAGE_KEY = 'nexis-logistic-costs';

const tripForm = document.getElementById('trip-form');
const tripExpenseForm = document.getElementById('trip-expense-form');
const costForm = document.getElementById('cost-form');
const monthFilter = document.getElementById('month-filter');
const truckFilter = document.getElementById('truck-filter');
const reviewMonthFilter = document.getElementById('review-month-filter');
const exportCsvButton = document.getElementById('export-csv');
const tableBody = document.getElementById('trip-table-body');
const costTableBody = document.getElementById('cost-table-body');
const reviewTableBody = document.getElementById('review-table-body');
const statsContainer = document.getElementById('stats');
const statCardTemplate = document.getElementById('stat-card-template');
const financeChartCanvas = document.getElementById('finance-chart');
const truckChartCanvas = document.getElementById('truck-chart');

const formatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

let trips = loadTrips();
let costs = loadCosts();

initializeFilters();
loadTripsFromSupabase();
tripForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const trip = {
    id: crypto.randomUUID(),
    truck: document.getElementById('truck').value.trim(),
    date: document.getElementById('date').value,
    loadingZone: document.getElementById('loading-zone').value.trim(),
    unloadingZone: document.getElementById('unloading-zone').value.trim(),
    revenue: Number(document.getElementById('revenue').value)
  };

  if (!trip.truck || !trip.date || !trip.loadingZone || !trip.unloadingZone || Number.isNaN(trip.revenue)) {
    return;
  }

  saveTripToSupabase(trip);
  tripForm.reset();
});


tripExpenseForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const expense = {
    id: crypto.randomUUID(),
    truck: document.getElementById('expense-truck').value.trim(),
    date: document.getElementById('expense-date').value,
    loadingZone: document.getElementById('expense-loading-zone').value.trim(),
    unloadingZone: document.getElementById('expense-unloading-zone').value.trim(),
    km: Number(document.getElementById('km').value),
    consumption: Number(document.getElementById('consumption-per-100').value),
    fuel: Number(document.getElementById('fuel-cost').value),
    ration: Number(document.getElementById('ration-cost').value),
    rapido: Number(document.getElementById('rapido-cost').value),
    manoeuvre: Number(document.getElementById('manoeuvre-cost').value),
    misc: Number(document.getElementById('misc-cost').value)
  };

  saveExpenseToSupabase(expense);

  tripExpenseForm.reset();
});


costForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const entry = {
    id: crypto.randomUUID(),
    truck: document.getElementById('cost-truck').value.trim(),
    month: document.getElementById('cost-month').value,
    maintenance: Number(document.getElementById('maintenance').value),
    mechanical: Number(document.getElementById('mechanical').value),
    insurance: Number(document.getElementById('insurance').value),
    driverSalary: Number(document.getElementById('driver-salary').value),
    socialCharges: Number(document.getElementById('social-charges').value),
    otherCharges: Number(document.getElementById('other-charges').value)
  };

  if (!entry.truck || !entry.month || hasInvalidCost(entry)) {
    return;
  }

  costs.push(entry);
  persistCosts();
  costForm.reset();
  document.getElementById('cost-month').value = reviewMonthFilter.value;
  render();
});

monthFilter.addEventListener('input', render);
truckFilter.addEventListener('input', render);
reviewMonthFilter.addEventListener('input', render);
exportCsvButton.addEventListener('click', exportFilteredTripsAsCsv);

tableBody.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-trip-id]');
  if (!button) {
    return;
  }

  trips = trips.filter((trip) => trip.id !== button.dataset.tripId);
  persistTrips();
  render();
});

costTableBody.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-cost-id]');
  if (!button) {
    return;
  }

  costs = costs.filter((item) => item.id !== button.dataset.costId);
  persistCosts();
  render();
});

render();

function initializeFilters() {
  const currentMonth = new Date().toISOString().slice(0, 7);
  monthFilter.value = currentMonth;
  reviewMonthFilter.value = currentMonth;
  document.getElementById('cost-month').value = currentMonth;
}

function loadTrips() {
  const raw = localStorage.getItem(TRIPS_STORAGE_KEY);
  if (!raw) {
    return sampleTrips();
  }

  try {
    return JSON.parse(raw);
  } catch {
    return sampleTrips();
  }
}

function loadCosts() {
  const raw = localStorage.getItem(COSTS_STORAGE_KEY);
  if (!raw) {
    return sampleCosts();
  }

  try {
    return JSON.parse(raw);
  } catch {
    return sampleCosts();
  }
}

function persistTrips() {
  localStorage.setItem(TRIPS_STORAGE_KEY, JSON.stringify(trips));
}

function persistCosts() {
  localStorage.setItem(COSTS_STORAGE_KEY, JSON.stringify(costs));
}

function hasInvalidCost(entry) {
  return [
    entry.maintenance,
    entry.mechanical,
    entry.insurance,
    entry.driverSalary,
    entry.socialCharges,
    entry.otherCharges
  ].some((value) => Number.isNaN(value) || value < 0);
}

function costTotal(entry) {
  return entry.maintenance + entry.mechanical + entry.insurance + entry.driverSalary + entry.socialCharges + entry.otherCharges;
}

function getFilteredTrips() {
  const month = monthFilter.value;
  const truckQuery = truckFilter.value.trim().toLowerCase();

  return trips.filter((trip) => {
    const monthMatch = !month || trip.date.startsWith(month);
    const truckMatch = !truckQuery || trip.truck.toLowerCase().includes(truckQuery);
    return monthMatch && truckMatch;
  });
}

function getFilteredCosts() {
  const month = monthFilter.value;
  const truckQuery = truckFilter.value.trim().toLowerCase();

  return costs.filter((item) => {
    const monthMatch = !month || item.month === month;
    const truckMatch = !truckQuery || item.truck.toLowerCase().includes(truckQuery);
    return monthMatch && truckMatch;
  });
}

function getReviewTrips() {
  const month = reviewMonthFilter.value;
  return trips.filter((trip) => !month || trip.date.startsWith(month));
}

function getReviewCosts() {
  const month = reviewMonthFilter.value;
  return costs.filter((item) => !month || item.month === month);
}

function summarizeByTruck(reviewTrips, reviewCosts) {
  const byTruck = new Map();

  reviewTrips.forEach((trip) => {
    ensureTruck(byTruck, trip.truck);
    const item = byTruck.get(trip.truck);
    item.tripCount += 1;
    item.zones.add(trip.zone);
    item.revenue += trip.revenue;
    item.tripExpense += trip.expense;
  });

  reviewCosts.forEach((entry) => {
    ensureTruck(byTruck, entry.truck);
    const item = byTruck.get(entry.truck);
    item.fixedCosts += costTotal(entry);
  });

  return [...byTruck.values()]
    .map((item) => ({
      ...item,
      operationalMargin: item.revenue - item.tripExpense,
      realNet: item.revenue - item.tripExpense - item.fixedCosts
    }))
    .sort((a, b) => a.truck.localeCompare(b.truck));
}

function ensureTruck(map, truck) {
  if (!map.has(truck)) {
    map.set(truck, {
      truck,
      tripCount: 0,
      zones: new Set(),
      revenue: 0,
      tripExpense: 0,
      fixedCosts: 0
    });
  }
}

function render() {
  const filteredTrips = getFilteredTrips();
  const filteredCosts = getFilteredCosts();
  const reviewTrips = getReviewTrips();
  const reviewCosts = getReviewCosts();
  const truckSummary = summarizeByTruck(reviewTrips, reviewCosts);

  renderStats(filteredTrips, filteredCosts);
  renderTripTable(filteredTrips);
  renderCostTable(reviewCosts);
  renderReviewTable(truckSummary);
  renderFinanceChart(filteredTrips, filteredCosts);
  renderTruckChart(truckSummary);
}

function renderStats(filteredTrips, filteredCosts) {
  const revenue = filteredTrips.reduce((acc, trip) => acc + trip.revenue, 0);
  const tripExpense = filteredTrips.reduce((acc, trip) => acc + trip.expense, 0);
  const fixedCosts = filteredCosts.reduce((acc, entry) => acc + costTotal(entry), 0);
  const operationalMargin = revenue - tripExpense;
  const realNet = operationalMargin - fixedCosts;

  const cards = [
    { label: 'Courses', value: filteredTrips.length.toString() },
    { label: 'Chiffre d\'affaires', value: `${money(revenue)} FCFA` },
    { label: 'Dépenses course', value: `${money(tripExpense)} FCFA` },
    { label: 'Charges fixes/mécaniques', value: `${money(fixedCosts)} FCFA` },
    { label: 'Marge opérationnelle', value: `${money(operationalMargin)} FCFA`, className: operationalMargin < 0 ? 'bad' : 'good' },
    { label: 'Résultat net réel', value: `${money(realNet)} FCFA`, className: realNet < 0 ? 'bad' : 'good' }
  ];

  statsContainer.innerHTML = '';
  cards.forEach((card) => {
    const node = statCardTemplate.content.cloneNode(true);
    node.querySelector('h3').textContent = card.label;
    const valueElement = node.querySelector('p');
    valueElement.textContent = card.value;
    if (card.className) {
      valueElement.classList.add(card.className);
    }
    statsContainer.appendChild(node);
  });
}

function renderTripTable(filteredTrips) {
  if (filteredTrips.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="7" class="empty">Aucune course pour ce filtre.</td></tr>';
    return;
  }

  tableBody.innerHTML = filteredTrips
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((trip) => {
      const margin = trip.revenue - trip.expense;
      return `
        <tr>
          <td>${formatDate(trip.date)}</td>
          <td>${trip.truck}</td>
          <td>${trip.zone}</td>
          <td>${money(trip.revenue)} FCFA</td>
          <td>${money(trip.expense)} FCFA</td>
          <td class="${margin < 0 ? 'bad' : 'good'}">${money(margin)} FCFA</td>
          <td><button type="button" class="delete-btn" data-trip-id="${trip.id}">Supprimer</button></td>
        </tr>
      `;
    })
    .join('');
}

function renderCostTable(reviewCosts) {
  if (reviewCosts.length === 0) {
    costTableBody.innerHTML = '<tr><td colspan="10" class="empty">Aucune charge sur ce mois.</td></tr>';
    return;
  }

  costTableBody.innerHTML = reviewCosts
    .sort((a, b) => b.month.localeCompare(a.month))
    .map((item) => `
      <tr>
        <td>${item.month}</td>
        <td>${item.truck}</td>
        <td>${money(item.maintenance)} FCFA</td>
        <td>${money(item.mechanical)} FCFA</td>
        <td>${money(item.insurance)} FCFA</td>
        <td>${money(item.driverSalary)} FCFA</td>
        <td>${money(item.socialCharges)} FCFA</td>
        <td>${money(item.otherCharges)} FCFA</td>
        <td>${money(costTotal(item))} FCFA</td>
        <td><button type="button" class="delete-btn" data-cost-id="${item.id}">Supprimer</button></td>
      </tr>
    `)
    .join('');
}

function renderReviewTable(truckSummary) {
  if (truckSummary.length === 0) {
    reviewTableBody.innerHTML = '<tr><td colspan="8" class="empty">Aucune donnée pour ce mois.</td></tr>';
    return;
  }

  reviewTableBody.innerHTML = truckSummary
    .map((item) => `
      <tr>
        <td>${item.truck}</td>
        <td>${item.tripCount}</td>
        <td>${[...item.zones].join(', ') || '-'}</td>
        <td>${money(item.revenue)} FCFA</td>
        <td>${money(item.tripExpense)} FCFA</td>
        <td class="${item.operationalMargin < 0 ? 'bad' : 'good'}">${money(item.operationalMargin)} FCFA</td>
        <td>${money(item.fixedCosts)} FCFA</td>
        <td class="${item.realNet < 0 ? 'bad' : 'good'}">${money(item.realNet)} FCFA</td>
      </tr>
    `)
    .join('');
}

function renderFinanceChart(filteredTrips, filteredCosts) {
  const totalRevenue = filteredTrips.reduce((acc, trip) => acc + trip.revenue, 0);
  const tripExpense = filteredTrips.reduce((acc, trip) => acc + trip.expense, 0);
  const fixedCosts = filteredCosts.reduce((acc, item) => acc + costTotal(item), 0);

  drawBarChart(financeChartCanvas, [
    { label: 'Revenus', value: totalRevenue, color: '#1e88ff' },
    { label: 'Dépenses course', value: tripExpense, color: '#ff8a00' },
    { label: 'Autres charges', value: fixedCosts, color: '#9a59d1' }
  ]);
}

function renderTruckChart(truckSummary) {
  const data = truckSummary.map((item) => ({
    label: item.truck,
    value: item.realNet,
    color: item.realNet >= 0 ? '#11a95d' : '#d64040'
  }));
  drawBarChart(truckChartCanvas, data);
}

function drawBarChart(canvas, items) {
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);

  if (items.length === 0) {
    drawEmptyChart(ctx, width, height, 'Aucune donnée');
    return;
  }

  const maxValue = Math.max(...items.map((item) => Math.abs(item.value)), 1);
  const topPadding = 24;
  const bottomPadding = 45;
  const chartHeight = height - topPadding - bottomPadding;
  const barWidth = Math.max(32, width / (items.length * 2.2));
  const gap = (width - items.length * barWidth) / (items.length + 1);

  ctx.font = '12px Inter, sans-serif';
  ctx.fillStyle = '#6b7a90';
  ctx.fillText('0', 8, topPadding + chartHeight + 4);

  items.forEach((item, index) => {
    const normalized = Math.abs(item.value) / maxValue;
    const barHeight = normalized * chartHeight;
    const x = gap + index * (barWidth + gap);
    const y = topPadding + (chartHeight - barHeight);

    ctx.fillStyle = item.color;
    ctx.fillRect(x, y, barWidth, barHeight);

    ctx.fillStyle = '#1d2a3c';
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText(shortLabel(item.label), x, height - 25);
    ctx.fillText(`${money(item.value)}`, x, y - 6);
  });
}

function drawEmptyChart(ctx, width, height, text) {
  ctx.fillStyle = '#eef3fb';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#7a8799';
  ctx.font = '14px Inter, sans-serif';
  ctx.fillText(text, width / 2 - 45, height / 2);
}

function shortLabel(label) {
  return label.length > 12 ? `${label.slice(0, 10)}...` : label;
}

function exportFilteredTripsAsCsv() {
  const filteredTrips = getFilteredTrips();
  const filteredCosts = getFilteredCosts();

  if (filteredTrips.length === 0 && filteredCosts.length === 0) {
    return;
  }

  const month = monthFilter.value || 'toutes-periodes';
  const rows = [
    'type,date_ou_mois,camion,zone,revenu_fcfa,depenses_course_fcfa,entretien_fcfa,mecanique_fcfa,assurance_fcfa,salaire_fcfa,charges_sociales_fcfa,autres_fcfa,total_ligne_fcfa'
  ];

  filteredTrips.forEach((trip) => {
    rows.push([
      'course',
      trip.date,
      safeCsv(trip.truck),
      safeCsv(trip.zone),
      trip.revenue,
      trip.expense,
      '', '', '', '', '', '',
      trip.revenue - trip.expense
    ].join(','));
  });

  filteredCosts.forEach((item) => {
    rows.push([
      'charge',
      item.month,
      safeCsv(item.truck),
      '',
      '',
      '',
      item.maintenance,
      item.mechanical,
      item.insurance,
      item.driverSalary,
      item.socialCharges,
      item.otherCharges,
      costTotal(item)
    ].join(','));
  });

  const csvContent = rows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `performance-reelle-${month}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function safeCsv(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function money(value) {
  return formatter.format(value);
}

function formatDate(value) {
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

function sampleTrips() {
  const month = new Date().toISOString().slice(0, 7);
  return [
    { id: crypto.randomUUID(), truck: 'Camion A', date: `${month}-04`, zone: 'Zone Nord', revenue: 240000, expense: 78000 },
    { id: crypto.randomUUID(), truck: 'Camion B', date: `${month}-08`, zone: 'Zone Centre', revenue: 315000, expense: 112000 },
    { id: crypto.randomUUID(), truck: 'Camion C', date: `${month}-11`, zone: 'Zone Est', revenue: 180000, expense: 95000 }
  ];
}

function sampleCosts() {
  const month = new Date().toISOString().slice(0, 7);
  return [
    {
      id: crypto.randomUUID(),
      truck: 'Camion A',
      month,
      maintenance: 50000,
      mechanical: 25000,
      insurance: 30000,
      driverSalary: 95000,
      socialCharges: 20000,
      otherCharges: 12000
    },
    {
      id: crypto.randomUUID(),
      truck: 'Camion B',
      month,
      maintenance: 30000,
      mechanical: 40000,
      insurance: 30000,
      driverSalary: 100000,
      socialCharges: 22000,
      otherCharges: 15000
    }
  ];
}
async function saveTripToSupabase(trip) {


  const { error } = await supabaseClient
    .from('trips')
    .insert([trip]);

  if (error) {
  console.error("Erreur Supabase :", error);
  alert("ERREUR SUPABASE : " + error.message);
  return;
}

  trips.push(trip);
  render();
}
async function loadTripsFromSupabase() {

  const { data, error } = await supabaseClient
    .from('trips')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Erreur chargement Supabase :", error);
    return;
  }

  trips = data || [];
  render();
}

async function saveExpenseToSupabase(expense) {
  const { error } = await supabaseClient
    .from('trip_expenses')
    .insert([expense]);

  if (error) {
    console.error("Erreur Supabase dépense :", error);
    alert("ERREUR SUPABASE DEPENSE : " + error.message);
    return;
  }

  console.log("DEPENSE SAUVEE DANS SUPABASE :", expense);
}

window.addEventListener('DOMContentLoaded', () => {

  const tripExpenseForm = document.getElementById('trip-expense-form');

  console.log("FORM =", tripExpenseForm);

  tripExpenseForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const expense = {
      id: crypto.randomUUID(),
      truck: document.getElementById('expense-truck').value,
      date: document.getElementById('expense-date').value,
      km: Number(document.getElementById('km').value),
      consumption: Number(document.getElementById('consumption-per-100').value),
      fuel: Number(document.getElementById('fuel-cost').value),
      ration: Number(document.getElementById('ration-cost').value),
      rapido: Number(document.getElementById('rapido-cost').value),
      manoeuvre: Number(document.getElementById('manoeuvre-cost').value),
      misc: Number(document.getElementById('misc-cost').value)
    };

    console.log("EXPENSE =", expense);

    await saveExpenseToSupabase(expense);

    alert("Dépense enregistrée ✅");

    tripExpenseForm.reset();
  });

});

alert("JS chargé");