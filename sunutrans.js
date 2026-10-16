const SUPABASE_URL = 'https://ifspadsghwizzjofcscf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_XN7xuh4te5IypVwI0UySvg_A9qCUlTK';
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const state = { user:null, organization:null, membership:null, trucks:[], trips:[], expenses:[], vehicleCosts:[], generalExpenses:[] };
const money = value => `${new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0}).format(Number(value)||0)} FCFA`;
const el = id => document.getElementById(id);
const number = id => Number(el(id).value)||0;
const esc = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const totalExpense = x => ['fuel','ration','rapido','manoeuvre','misc'].reduce((s,k)=>s+Number(x[k]||0),0);
const totalVehicleCost = x => ['maintenance','mechanical','insurance','driver_salary','social_charges','other_charges'].reduce((s,k)=>s+Number(x[k]||0),0);
const today = new Date().toISOString().slice(0,10);
const currentMonth = today.slice(0,7);

function setMessage(target,text,type=''){
  const node=el(target); node.textContent=text; node.className=`message ${type}`.trim();
  node.classList.toggle('hidden',!text);
}
function setBusy(button,busy,label){button.disabled=busy;button.dataset.label??=button.textContent;button.textContent=busy?label:button.dataset.label}
function showAuth(){el('auth-view').classList.remove('hidden');el('app-view').classList.add('hidden')}
function showApp(){el('auth-view').classList.add('hidden');el('app-view').classList.remove('hidden')}

async function handleLogin(event){
  event.preventDefault(); const button=el('login-btn'); setBusy(button,true,'Connexion…'); setMessage('auth-message','');
  const email=el('auth-email').value.trim().toLowerCase();
  const {error}=await db.auth.signInWithPassword({email,password:el('auth-password').value});
  if(error)setMessage('auth-message',error.message==='Invalid login credentials'?'Mot de passe incorrect ou compte non créé.':'Connexion impossible : '+error.message,'error');
  setBusy(button,false);
}
async function handleSignup(){
  const password=el('auth-password').value; const email=el('auth-email').value.trim().toLowerCase();
  if(!email){setMessage('auth-message','Saisissez l’adresse e-mail autorisée.','error');return}
  if(password.length<8){setMessage('auth-message','Choisissez un mot de passe d’au moins 8 caractères.','error');return}
  const button=el('signup-btn'); setBusy(button,true,'Création…');
  const {data,error}=await db.auth.signUp({email,password});
  if(error)setMessage('auth-message','Création impossible : '+error.message,'error');
  else if(data.session)setMessage('auth-message','Compte créé. Ouverture de votre espace…','success');
  else setMessage('auth-message','Compte créé. Jeremy doit confirmer le message reçu par e-mail, puis revenir ici pour se connecter.','success');
  setBusy(button,false);
}

async function openSession(session){
  if(!session){state.user=null;showAuth();return}
  state.user=session.user;
  const {data:membership,error}=await db.from('ryvo_memberships').select('organization_id,role').eq('user_id',state.user.id).maybeSingle();
  if(error||!membership){await db.auth.signOut();showAuth();setMessage('auth-message','Ce compte n’est pas autorisé pour SUNUTRANS.','error');return}
  state.membership=membership;
  const {data:organization}=await db.from('ryvo_organizations').select('id,name,slug').eq('id',membership.organization_id).single();
  if(!organization||organization.slug!=='sunutrans'){await db.auth.signOut();showAuth();setMessage('auth-message','Espace entreprise introuvable.','error');return}
  state.organization=organization; el('user-role').textContent=membership.role==='admin'?'Administrateur':membership.role;
  showApp(); await loadAll();
}

async function loadAll(){
  const org=state.organization.id;
  const [trucks,trips,expenses,costs,general]=await Promise.all([
    db.from('ryvo_trucks').select('*').eq('organization_id',org).order('plate_number'),
    db.from('ryvo_trips').select('*,ryvo_trucks(plate_number)').eq('organization_id',org).order('trip_date',{ascending:false}),
    db.from('ryvo_trip_expenses').select('*').eq('organization_id',org).order('created_at',{ascending:false}),
    db.from('ryvo_vehicle_costs').select('*').eq('organization_id',org).order('cost_month',{ascending:false}),
    db.from('ryvo_general_expenses').select('*').eq('organization_id',org).order('expense_date',{ascending:false})
  ]);
  const firstError=[trucks,trips,expenses,costs,general].find(x=>x.error)?.error;
  if(firstError){setMessage('app-message','Chargement impossible : '+firstError.message,'error');return}
  state.trucks=trucks.data||[];state.trips=trips.data||[];state.expenses=expenses.data||[];state.vehicleCosts=costs.data||[];state.generalExpenses=general.data||[];
  render();
}

function filteredData(){
  const month=el('month-filter').value||currentMonth;
  const trips=state.trips.filter(x=>x.trip_date?.startsWith(month));
  const tripIds=new Set(trips.map(x=>x.id));
  return {month,trips,expenses:state.expenses.filter(x=>tripIds.has(x.trip_id)),vehicleCosts:state.vehicleCosts.filter(x=>x.cost_month?.startsWith(month)),generalExpenses:state.generalExpenses.filter(x=>x.expense_date?.startsWith(month))};
}
function render(){renderSelects();renderDashboard();renderTrips();renderExpenses();renderFleet()}
function renderSelects(){
  const options=state.trucks.length?state.trucks.map(x=>`<option value="${x.id}">${esc(x.plate_number)}</option>`).join(''):'<option value="">Ajoutez d’abord un camion</option>';
  el('trip-truck').innerHTML=options;el('cost-truck').innerHTML=options;
  el('expense-trip').innerHTML=state.trips.length?state.trips.slice(0,100).map(x=>`<option value="${x.id}">${esc(x.trip_date)} · ${esc(x.ryvo_trucks?.plate_number||'Camion')} · ${esc(x.client)}</option>`).join(''):'<option value="">Ajoutez d’abord une course</option>';
}
function renderDashboard(){
  const d=filteredData();const revenue=d.trips.reduce((s,x)=>s+Number(x.revenue||0),0);const tripCosts=d.expenses.reduce((s,x)=>s+totalExpense(x),0);const fixed=d.vehicleCosts.reduce((s,x)=>s+totalVehicleCost(x),0)+d.generalExpenses.reduce((s,x)=>s+Number(x.amount||0),0);const net=revenue-tripCosts-fixed;
  el('kpi-revenue').textContent=money(revenue);el('kpi-trip-expenses').textContent=money(tripCosts);el('kpi-fixed-costs').textContent=money(fixed);el('kpi-net').textContent=money(net);el('trip-count').textContent=`${d.trips.length} course${d.trips.length>1?'s':''}`;
  el('recent-trips-body').innerHTML=d.trips.slice(0,7).map(trip=>`<tr><td>${esc(trip.trip_date)}</td><td>${esc(trip.ryvo_trucks?.plate_number||'-')}</td><td>${esc(trip.client)}</td><td>${esc(trip.loading_zone)} → ${esc(trip.unloading_zone)}</td><td>${money(trip.revenue)}</td></tr>`).join('')||'<tr><td class="empty" colspan="5">Aucune course ce mois.</td></tr>';
  const margin=revenue-tripCosts; const ratio=revenue?Math.round(net/revenue*100):0;
  el('profit-summary').innerHTML=`<div class="profit-line"><span>Marge après courses</span><strong class="${margin>=0?'good':'bad'}">${money(margin)}</strong></div><div class="profit-line"><span>Taux de résultat</span><strong class="${ratio>=0?'good':'bad'}">${ratio}%</strong></div><div class="profit-line"><span>Courses enregistrées</span><strong>${d.trips.length}</strong></div>`;
}
function renderTrips(){
  const {trips}=filteredData();el('trips-body').innerHTML=trips.map(x=>`<tr><td>${esc(x.trip_date)}</td><td>${esc(x.ryvo_trucks?.plate_number||'-')}</td><td>${esc(x.client)}</td><td>${esc(x.loading_zone)} → ${esc(x.unloading_zone)}</td><td>${money(x.revenue)}</td><td><button class="delete-btn" data-delete="trip" data-id="${x.id}">Supprimer</button></td></tr>`).join('')||'<tr><td class="empty" colspan="6">Aucune course ce mois.</td></tr>';
}
function renderExpenses(){
  const {expenses}=filteredData();el('expenses-body').innerHTML=expenses.map(x=>{const trip=state.trips.find(t=>t.id===x.trip_id);return `<tr><td>${esc(trip?.client||'Course')}</td><td>${Number(x.km||0)}</td><td>${money(totalExpense(x))}</td><td><button class="delete-btn" data-delete="expense" data-id="${x.id}">Supprimer</button></td></tr>`}).join('')||'<tr><td class="empty" colspan="4">Aucune dépense ce mois.</td></tr>';
}
function renderFleet(){
  el('fleet-grid').innerHTML=state.trucks.map(x=>`<div class="truck-card"><div><strong>${esc(x.plate_number)}</strong><span>${esc([x.brand,x.model].filter(Boolean).join(' ')||'Informations à compléter')}</span></div><span class="status">${esc(x.status)}</span></div>`).join('')||'<p class="empty">Aucun camion ajouté.</p>';
}

async function insertRow(table,payload,form,success){
  const {error}=await db.from(table).insert(payload);if(error){setMessage('app-message','Enregistrement impossible : '+error.message,'error');return false}form?.reset();setMessage('app-message',success,'success');await loadAll();return true;
}
el('truck-form').addEventListener('submit',async e=>{e.preventDefault();await insertRow('ryvo_trucks',{organization_id:state.organization.id,plate_number:el('truck-plate').value.trim().toUpperCase(),brand:el('truck-brand').value.trim(),model:el('truck-model').value.trim(),status:el('truck-status').value},e.currentTarget,'Camion ajouté au parc.')});
el('trip-form').addEventListener('submit',async e=>{e.preventDefault();await insertRow('ryvo_trips',{organization_id:state.organization.id,truck_id:el('trip-truck').value,trip_date:el('trip-date').value,client:el('trip-client').value.trim(),loading_zone:el('trip-loading').value.trim(),unloading_zone:el('trip-unloading').value.trim(),revenue:number('trip-revenue'),created_by:state.user.id},e.currentTarget,'Course enregistrée.')});
el('expense-form').addEventListener('submit',async e=>{e.preventDefault();const trip=state.trips.find(x=>x.id===el('expense-trip').value);if(!trip)return;await insertRow('ryvo_trip_expenses',{organization_id:state.organization.id,trip_id:trip.id,km:number('expense-km'),consumption:number('expense-consumption'),fuel:number('expense-fuel'),ration:number('expense-ration'),rapido:number('expense-rapido'),manoeuvre:number('expense-manoeuvre'),misc:number('expense-misc'),created_by:state.user.id},e.currentTarget,'Dépense enregistrée.')});
el('vehicle-cost-form').addEventListener('submit',async e=>{e.preventDefault();await insertRow('ryvo_vehicle_costs',{organization_id:state.organization.id,truck_id:el('cost-truck').value,cost_month:el('cost-month').value+'-01',maintenance:number('cost-maintenance'),mechanical:number('cost-mechanical'),insurance:number('cost-insurance'),driver_salary:number('cost-salary'),social_charges:number('cost-social'),other_charges:number('cost-other'),created_by:state.user.id},e.currentTarget,'Charges du véhicule enregistrées.')});
el('general-form').addEventListener('submit',async e=>{e.preventDefault();await insertRow('ryvo_general_expenses',{organization_id:state.organization.id,expense_date:el('general-date').value,category:el('general-category').value.trim(),description:el('general-description').value.trim(),amount:number('general-amount'),payment_method:el('general-payment').value,created_by:state.user.id},e.currentTarget,'Charge générale enregistrée.')});

document.addEventListener('click',async e=>{
  const btn=e.target.closest('[data-delete]');if(!btn)return;if(!confirm('Supprimer définitivement cette ligne ?'))return;
  const tables={trip:'ryvo_trips',expense:'ryvo_trip_expenses'};const {error}=await db.from(tables[btn.dataset.delete]).delete().eq('id',btn.dataset.id).eq('organization_id',state.organization.id);if(error)setMessage('app-message','Suppression impossible : '+error.message,'error');else await loadAll();
});
document.querySelectorAll('.nav-btn').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.nav-btn,.page').forEach(x=>x.classList.remove('active'));btn.classList.add('active');el(btn.dataset.target).classList.add('active');el('page-title').textContent=btn.textContent}));
el('month-filter').addEventListener('change',render);el('logout-btn').addEventListener('click',()=>db.auth.signOut());el('auth-form').addEventListener('submit',handleLogin);el('signup-btn').addEventListener('click',handleSignup);
el('export-csv').addEventListener('click',()=>{const {trips}=filteredData();if(!trips.length)return;const rows=[['Date','Camion','Client','Chargement','Déchargement','CA'],...trips.map(x=>[x.trip_date,x.ryvo_trucks?.plate_number||'',x.client,x.loading_zone,x.unloading_zone,x.revenue])];const csv='\uFEFF'+rows.map(r=>r.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(';')).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download=`sunutrans-courses-${el('month-filter').value}.csv`;a.click();URL.revokeObjectURL(a.href)});

el('month-filter').value=currentMonth;el('trip-date').value=today;el('general-date').value=today;el('cost-month').value=currentMonth;
db.auth.onAuthStateChange((_event,session)=>setTimeout(()=>openSession(session),0));
db.auth.getSession().then(({data})=>openSession(data.session));
