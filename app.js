const STORAGE_KEY = 'nexis-logistic-trips';

const tripForm = document.getElementById('trip-form');
const monthFilter = document.getElementById('month-filter');
const truckFilter = document.getElementById('truck-filter');
const reviewMonthFilter = document.getElementById('review-month-filter');
const exportCsvButton = document.getElementById('export-csv');
const tableBody = document.getElementById('trip-table-body');
const reviewTableBody = document.getElementById('review-table-body');
const statsContainer = document.getElementById('stats');
const statCardTemplate = document.getElementById('stat-card-template');
const financeChartCanvas = document.getElementById('finance-chart');
const truckChartCanvas = document.getElementById('truck-chart');

const formatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

let trips = loadTrips();

initializeFilters();

tripForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const trip = {
    id: crypto.randomUUID(),
    truck: document.getElementById('truck').value.trim(),
    date: document.getElementById('date').value,
    zone: document.getElementById('zone').value.trim(),
    revenue: Number(document.getElementById('revenue').value),
    expense: Number(document.getElementById('expense').value)
  };

  if (!trip.truck || !trip.zone || !trip.date || Number.isNaN(trip.revenue) || Number.isNaN(trip.expense)) {
    return;
  }

  trips.push(trip);
  persistTrips();
  tripForm.reset();
  render();
});

monthFilter.addEventListener('input', render);
truckFilter.addEventListener('input', render);
reviewMonthFilter.addEventListener('input', render);
exportCsvButton.addEventListener('click', exportFilteredTripsAsCsv);

tableBody.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-id]');
  if (!button) {
    return;
  }

  trips = trips.filter((trip) => trip.id !== button.dataset.id);
  persistTrips();
  render();
});

render();

function initializeFilters() {
  const currentMonth = new Date().toISOString().slice(0, 7);
  monthFilter.value = currentMonth;
  reviewMonthFilter.value = currentMonth;
}

function loadTrips() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return sampleTrips();
  }

  try {
    return JSON.parse(raw);
  } catch {
    return sampleTrips();
  }
}

function persistTrips() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
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

function getReviewTrips() {
  const month = reviewMonthFilter.value;
  return trips.filter((trip) => !month || trip.date.startsWith(month));
}

function summarizeByTruck(reviewTrips) {
  const byTruck = new Map();

  reviewTrips.forEach((trip) => {
    if (!byTruck.has(trip.truck)) {
      byTruck.set(trip.truck, {
        truck: trip.truck,
        tripCount: 0,
        zones: new Set(),
        revenue: 0,
        expense: 0
      });
    }

    const item = byTruck.get(trip.truck);
    item.tripCount += 1;
    item.zones.add(trip.zone);
    item.revenue += trip.revenue;
    item.expense += trip.expense;
  });

  return [...byTruck.values()].sort((a, b) => a.truck.localeCompare(b.truck));
}

function render() {
  const filteredTrips = getFilteredTrips();
  const reviewTrips = getReviewTrips();
  const truckSummary = summarizeByTruck(reviewTrips);

  renderStats(filteredTrips);
  renderTable(filteredTrips);
  renderReviewTable(truckSummary);
  renderFinanceChart(filteredTrips);
  renderTruckChart(truckSummary);
}

function renderStats(filteredTrips) {
  const summary = filteredTrips.reduce(
    (acc, trip) => {
      acc.revenue += trip.revenue;
      acc.expense += trip.expense;
      acc.margin += trip.revenue - trip.expense;
      acc.tripCount += 1;
      acc.trucks.add(trip.truck);
      return acc;
    },
    { revenue: 0, expense: 0, margin: 0, tripCount: 0, trucks: new Set() }
  );

  const cards = [
    { label: 'Courses', value: summary.tripCount.toString() },
    { label: 'Camions actifs', value: summary.trucks.size.toString() },
    { label: 'Chiffre d\'affaires', value: `${money(summary.revenue)} FCFA` },
    { label: 'Dépenses', value: `${money(summary.expense)} FCFA` },
    { label: 'Résultat net', value: `${money(summary.margin)} FCFA`, className: summary.margin < 0 ? 'bad' : 'good' }
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

function renderTable(filteredTrips) {
  if (filteredTrips.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="7" class="empty">Aucune course pour ce filtre.</td></tr>';
    return;
  }

  const rows = filteredTrips
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
          <td><button type="button" class="delete-btn" data-id="${trip.id}">Supprimer</button></td>
        </tr>
      `;
    })
    .join('');

  tableBody.innerHTML = rows;
}

function renderReviewTable(truckSummary) {
  if (truckSummary.length === 0) {
    reviewTableBody.innerHTML = '<tr><td colspan="6" class="empty">Aucune donnée pour ce mois.</td></tr>';
    return;
  }

  reviewTableBody.innerHTML = truckSummary
    .map((item) => {
      const net = item.revenue - item.expense;
      return `
        <tr>
          <td>${item.truck}</td>
          <td>${item.tripCount}</td>
          <td>${[...item.zones].join(', ')}</td>
          <td>${money(item.revenue)} FCFA</td>
          <td>${money(item.expense)} FCFA</td>
          <td class="${net < 0 ? 'bad' : 'good'}">${money(net)} FCFA</td>
        </tr>
      `;
    })
    .join('');
}

function renderFinanceChart(filteredTrips) {
  const totalRevenue = filteredTrips.reduce((acc, trip) => acc + trip.revenue, 0);
  const totalExpense = filteredTrips.reduce((acc, trip) => acc + trip.expense, 0);
  drawBarChart(financeChartCanvas, [
    { label: 'Revenus', value: totalRevenue, color: '#1e88ff' },
    { label: 'Dépenses', value: totalExpense, color: '#ff8a00' }
  ]);
}

function renderTruckChart(truckSummary) {
  const data = truckSummary.map((item) => ({
    label: item.truck,
    value: item.revenue - item.expense,
    color: item.revenue - item.expense >= 0 ? '#11a95d' : '#d64040'
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
  if (filteredTrips.length === 0) {
    return;
  }

  const headers = ['date', 'camion', 'zone', 'revenu_fcfa', 'depenses_fcfa', 'resultat_net_fcfa'];
  const lines = filteredTrips.map((trip) => [
    trip.date,
    safeCsv(trip.truck),
    safeCsv(trip.zone),
    trip.revenue,
    trip.expense,
    trip.revenue - trip.expense
  ].join(','));

  const csvContent = [headers.join(','), ...lines].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  const month = monthFilter.value || 'toutes-periodes';
  link.href = url;
  link.download = `courses-${month}.csv`;
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
    {
      id: crypto.randomUUID(),
      truck: 'Camion A',
      date: `${month}-04`,
      zone: 'Zone Nord',
      revenue: 240000,
      expense: 78000
    },
    {
      id: crypto.randomUUID(),
      truck: 'Camion B',
      date: `${month}-08`,
      zone: 'Zone Centre',
      revenue: 315000,
      expense: 112000
    },
    {
      id: crypto.randomUUID(),
      truck: 'Camion C',
      date: `${month}-11`,
      zone: 'Zone Est',
      revenue: 180000,
      expense: 95000
    }
  ];
}
