(() => {
  'use strict';

  const form = document.getElementById('mission-form');
  const legacySubmit = document.getElementById('mission-submit');
  const errorBox = document.getElementById('mission-form-error');
  const formActions = form?.querySelector('.form-actions');
  if (!form || !legacySubmit || !formActions || !window.supabase?.createClient) return;

  const client = window.NexisAuth?.client || window.supabase.createClient();
  const formatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
  let saving = false;
  let quickContext = null;
  let truckContextApplied = false;
  let clientContextApplied = false;
  let newClientMode = false;
  let hasExistingClients = false;

  const titleText = document.querySelector('.simple-form-title p');
  if (titleText) titleText.textContent = 'Les informations indispensables pour enregistrer une mission.';
  const pageText = document.querySelector('.simple-mission-head p');
  if (pageText) pageText.textContent = 'Créez une mission rapidement. Les détails restent disponibles uniquement si nécessaire.';

  const style = document.createElement('style');
  style.textContent = `
    .quick-client-field{grid-column:1/-1!important;display:grid;gap:7px}
    .quick-client-head{display:flex;align-items:center;justify-content:space-between;gap:12px}
    .quick-client-label{font-size:10px;font-weight:700;color:#405168}
    .quick-client-toggle,.quick-client-more{border:0;background:transparent;color:#bd6500;font:750 9.5px var(--font-ui,"Inter",sans-serif);cursor:pointer;padding:2px 0}
    .quick-client-toggle:hover,.quick-client-more:hover{text-decoration:underline}
    .quick-client-field select{width:100%}
    .quick-client-field.is-new #mission-client{display:none!important}
    .quick-client-field.no-existing .quick-client-toggle{display:none}
    .quick-new-client{display:grid;gap:8px;padding:11px;border:1px solid #e2e8ef;border-radius:10px;background:#fafbfd}
    .quick-new-client[hidden]{display:none}
    .quick-new-client-main{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:end}
    .quick-new-client label{display:grid;gap:5px;font-size:9.5px!important;font-weight:700!important;color:#405168!important}
    .quick-new-client input{height:40px!important;margin:0!important}
    .quick-client-more{height:40px;padding:0 4px;white-space:nowrap}
    .quick-new-client-extra{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;padding-top:9px;border-top:1px solid #e6ebf0}
    .quick-new-client-extra[hidden]{display:none}
    .quick-client-helper{color:#8a96a5;font-size:8.5px;line-height:1.4}

    .quick-expenses{grid-column:1/-1;border:1px solid #e3e9ef;border-radius:10px;background:#fbfcfd;overflow:hidden}
    .quick-expenses summary{list-style:none;display:grid;grid-template-columns:1fr auto auto;align-items:center;gap:10px;padding:12px 13px;cursor:pointer;user-select:none}
    .quick-expenses summary::-webkit-details-marker{display:none}
    .quick-expenses summary:hover{background:#f7f9fb}
    .quick-expenses-title strong{display:block;color:#34475c;font-size:10.5px;line-height:1.3}
    .quick-expenses-title small{display:block;margin-top:2px;color:#8c98a6;font-size:8.5px;line-height:1.3}
    .quick-expenses-total{color:#6f7e8f;font-size:10px;font-weight:750}
    .quick-expenses-chevron{color:#bd6500;font-size:16px;line-height:1;transition:transform .16s ease}
    .quick-expenses[open] .quick-expenses-chevron{transform:rotate(45deg)}
    .quick-expenses-body{padding:0 13px 13px;border-top:1px solid #e8edf2}
    .quick-expense-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:9px;padding-top:12px}
    .quick-expense-grid label,.quick-advanced-grid label{font-size:9.5px!important}
    .quick-expense-grid input,.quick-advanced-grid input{height:39px!important;margin-top:5px!important}
    .quick-advanced{margin-top:9px;border:1px solid #e7ecf1;border-radius:8px;background:#fff}
    .quick-advanced summary{display:flex!important;justify-content:space-between!important;padding:9px 10px!important;border:0!important;font-size:9px!important;font-weight:750!important;color:#637286!important}
    .quick-advanced summary:after{content:'+';color:#bd6500;font-size:13px}.quick-advanced[open] summary:after{content:'−'}
    .quick-advanced-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;padding:0 10px 10px}

    .quick-summary{grid-column:1/-1;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin-top:1px}
    .quick-summary div{min-height:54px;padding:9px 11px;background:#fff;border:1px solid #e3e9ef;border-radius:9px}
    .quick-summary span,.quick-summary strong{display:block}.quick-summary span{font-size:8.5px;color:#8592a1;text-transform:uppercase;letter-spacing:.05em;font-weight:800}.quick-summary strong{margin-top:5px;font-size:13px;color:#26394f}.quick-summary .margin strong{color:#07845d}
    .simple-form .form-actions{align-items:center;flex-wrap:wrap}
    .save-next{border:1px solid #dfe5ec;background:#fff;color:#43566b;border-radius:8px;padding:10px 14px;font:inherit;font-size:10.5px;font-weight:750;cursor:pointer}.save-next:hover{background:#f8fafc}
    .mission-field-invalid{border-color:#d85a61!important;box-shadow:0 0 0 3px rgba(216,90,97,.08)!important}

    @media(max-width:1000px){.quick-expense-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.quick-new-client-extra{grid-template-columns:1fr 1fr}}
    @media(max-width:740px){.quick-expense-grid,.quick-advanced-grid,.quick-summary,.quick-new-client-extra{grid-template-columns:1fr}.quick-new-client-main{grid-template-columns:1fr}.quick-client-more{text-align:left}.simple-form .form-actions{align-items:stretch}}
  `;
  document.head.appendChild(style);

  const clientField = document.createElement('div');
  clientField.className = 'quick-client-field';
  clientField.innerHTML = `
    <div class="quick-client-head">
      <span class="quick-client-label">Client</span>
      <button type="button" class="quick-client-toggle" id="mission-client-toggle">+ Nouveau client</button>
    </div>
    <select id="mission-client"><option value="">Chargement des clients…</option></select>
    <div class="quick-new-client" id="quick-new-client" hidden>
      <div class="quick-new-client-main">
        <label>Nom du client<input id="quick-client-company" type="text" autocomplete="organization" placeholder="Ex. Société ABC" /></label>
        <button type="button" class="quick-client-more" id="quick-client-more">+ Ajouter des coordonnées</button>
      </div>
      <div class="quick-new-client-extra" id="quick-new-client-extra" hidden>
        <label>Contact<input id="quick-client-contact" type="text" autocomplete="name" placeholder="Nom du contact" /></label>
        <label>Téléphone<input id="quick-client-phone" type="text" autocomplete="tel" placeholder="+221…" /></label>
        <label>Email<input id="quick-client-email" type="email" autocomplete="email" placeholder="contact@client.com" /></label>
      </div>
      <span class="quick-client-helper">Le client sera enregistré automatiquement dans votre fichier Clients.</span>
    </div>`;
  const routeRow = form.querySelector('.route-row');
  form.insertBefore(clientField, routeRow || errorBox || formActions);

  const expenseSection = document.createElement('details');
  expenseSection.className = 'quick-expenses';
  expenseSection.innerHTML = `
    <summary>
      <span class="quick-expenses-title"><strong>Dépenses de la mission</strong><small>Facultatif · ouvrez uniquement si nécessaire</small></span>
      <span class="quick-expenses-total" id="quick-expenses-total-label">0 FCFA</span>
      <span class="quick-expenses-chevron">+</span>
    </summary>
    <div class="quick-expenses-body">
      <div class="quick-expense-grid">
        <label>Carburant<input id="create-expense-fuel" type="number" min="0" step="100" value="0" /></label>
        <label>Ration<input id="create-expense-ration" type="number" min="0" step="100" value="0" /></label>
        <label>Rapido / péage<input id="create-expense-rapido" type="number" min="0" step="100" value="0" /></label>
        <label>Manœuvre<input id="create-expense-manoeuvre" type="number" min="0" step="100" value="0" /></label>
        <label>Autres frais<input id="create-expense-misc" type="number" min="0" step="100" value="0" /></label>
      </div>
      <details class="quick-advanced">
        <summary>Kilométrage et consommation</summary>
        <div class="quick-advanced-grid">
          <label>Kilométrage<input id="create-expense-km" type="number" min="0" step="1" value="0" /></label>
          <label>Consommation / 100 km<input id="create-expense-consumption" type="number" min="0" step="0.1" value="0" /></label>
        </div>
      </details>
    </div>`;

  const summary = document.createElement('div');
  summary.className = 'quick-summary';
  summary.innerHTML = `
    <div><span>Facturé</span><strong id="quick-revenue-preview">0 FCFA</strong></div>
    <div><span>Dépenses</span><strong id="quick-expense-total">0 FCFA</strong></div>
    <div class="margin"><span>Marge estimée</span><strong id="quick-margin-preview">0 FCFA</strong></div>`;

  form.insertBefore(expenseSection, errorBox || formActions);
  form.insertBefore(summary, errorBox || formActions);

  formActions.innerHTML = `
    <button type="reset" class="secondary">Effacer</button>
    <button type="submit" class="save-next" data-save-mode="next">Enregistrer + suivante</button>
    <button type="submit" class="primary" id="mission-submit" data-save-mode="finish">Enregistrer la mission</button>`;

  const submitButtons = [...formActions.querySelectorAll('button[type="submit"]')];
  const revenueInput = document.getElementById('mission-revenue');
  const truckInput = document.getElementById('mission-truck');
  const clientInput = document.getElementById('mission-client');
  const clientToggle = document.getElementById('mission-client-toggle');
  const clientMore = document.getElementById('quick-client-more');
  const newClientPanel = document.getElementById('quick-new-client');
  const newClientExtra = document.getElementById('quick-new-client-extra');
  const newClientCompany = document.getElementById('quick-client-company');
  const newClientContact = document.getElementById('quick-client-contact');
  const newClientPhone = document.getElementById('quick-client-phone');
  const newClientEmail = document.getElementById('quick-client-email');
  const dateInput = document.getElementById('mission-date');
  const loadingInput = document.getElementById('mission-loading-zone');
  const unloadingInput = document.getElementById('mission-unloading-zone');
  const expenseKeys = ['km','consumption','fuel','ration','rapido','manoeuvre','misc'];
  const expenseInputs = Object.fromEntries(expenseKeys.map(key => [key, document.getElementById(`create-expense-${key}`)]));
  const revenuePreview = document.getElementById('quick-revenue-preview');
  const expensePreview = document.getElementById('quick-expense-total');
  const marginPreview = document.getElementById('quick-margin-preview');
  const expenseLabel = document.getElementById('quick-expenses-total-label');

  function numberValue(input){ const value=Number(input?.value||0); return Number.isFinite(value)&&value>=0?value:0; }
  function money(value){ return `${formatter.format(Number(value)||0)} FCFA`; }
  function escapeHtml(value){ return String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;'); }
  function getExpenseValues(){ return Object.fromEntries(expenseKeys.map(key=>[key,numberValue(expenseInputs[key])])); }
  function expenseTotal(values=getExpenseValues()){ return ['fuel','ration','rapido','manoeuvre','misc'].reduce((sum,key)=>sum+Number(values[key]||0),0); }

  function updateSummary(){
    const revenue=numberValue(revenueInput); const expenses=expenseTotal(); const margin=revenue-expenses;
    revenuePreview.textContent=money(revenue); expensePreview.textContent=money(expenses); expenseLabel.textContent=money(expenses); marginPreview.textContent=money(margin);
    marginPreview.style.color=margin<0?'#bd3d44':'#07845d';
  }

  function showError(message=''){ if(!errorBox)return; errorBox.textContent=message; errorBox.hidden=!message; }
  function clearInvalidState(){ form.querySelectorAll('.mission-field-invalid').forEach(el=>{el.classList.remove('mission-field-invalid');el.removeAttribute('aria-invalid');}); }
  function markInvalid(el){ if(!el)return; el.classList.add('mission-field-invalid');el.setAttribute('aria-invalid','true'); }

  function validateMission(mission,revenueRaw){
    clearInvalidState(); const missing=[]; const add=(label,el)=>{missing.push({label,el});markInvalid(el);};
    if(!mission.truck)add('camion',truckInput); if(!mission.date)add('date',dateInput); if(!mission.loadingZone)add('chargement',loadingInput); if(!mission.unloadingZone)add('déchargement',unloadingInput); if(revenueRaw==='')add('montant facturé',revenueInput);
    if(newClientMode){ if(!newClientCompany.value.trim())add('nom du nouveau client',newClientCompany); } else if(!mission.client_id)add('client',clientInput);
    if(!missing.length)return true;
    const labels=missing.map(x=>x.label); showError(labels.length===1?`Il manque : ${labels[0]}.`:`Il manque : ${labels.slice(0,-1).join(', ')} et ${labels.at(-1)}.`); missing[0].el?.focus?.(); return false;
  }

  function setSavingState(active,label=''){
    submitButtons.forEach(button=>{ button.disabled=active; if(active){if(!button.dataset.originalLabel)button.dataset.originalLabel=button.textContent;button.textContent=label||'Enregistrement…';}else if(button.dataset.originalLabel){button.textContent=button.dataset.originalLabel;delete button.dataset.originalLabel;} });
  }

  function setNewClientMode(active,{focus=true}={}){
    newClientMode=Boolean(active); newClientPanel.hidden=!newClientMode; clientField.classList.toggle('is-new',newClientMode); clientField.classList.toggle('no-existing',!hasExistingClients); clientInput.disabled=newClientMode||!hasExistingClients;
    if(newClientMode)clientInput.value=''; clientToggle.textContent=newClientMode?'← Client existant':'+ Nouveau client';
    if(!newClientMode){newClientExtra.hidden=true;clientMore.textContent='+ Ajouter des coordonnées';}
    clearInvalidState();showError(''); if(newClientMode&&focus)setTimeout(()=>newClientCompany.focus(),0);
  }

  function maybeClearQuickContext(){ if(quickContext&&truckContextApplied&&clientContextApplied){sessionStorage.removeItem('nexisQuickEntryContext');quickContext=null;} }
  function applyTruckContext(){ if(!quickContext?.truck||!truckInput){truckContextApplied=true;maybeClearQuickContext();return true;} const exists=[...truckInput.options].some(o=>o.value===quickContext.truck); if(!exists)return false; truckInput.value=quickContext.truck;truckContextApplied=true;maybeClearQuickContext();return true; }
  function applyClientContext(){ if(!quickContext?.client_id||!clientInput){clientContextApplied=true;maybeClearQuickContext();return true;} const exists=[...clientInput.options].some(o=>o.value===quickContext.client_id); if(!exists)return false; setNewClientMode(false,{focus:false});clientInput.value=quickContext.client_id;clientContextApplied=true;maybeClearQuickContext();return true; }

  function restoreQuickEntryContext(){
    const saved=sessionStorage.getItem('nexisQuickEntryContext'); if(!saved){truckContextApplied=true;clientContextApplied=true;return;}
    try{quickContext=JSON.parse(saved);}catch{sessionStorage.removeItem('nexisQuickEntryContext');quickContext=null;truckContextApplied=true;clientContextApplied=true;return;}
    if(quickContext?.date&&dateInput)dateInput.value=quickContext.date;
    if(!applyTruckContext()){const observer=new MutationObserver(()=>{if(applyTruckContext())observer.disconnect();});observer.observe(truckInput,{childList:true});setTimeout(()=>{observer.disconnect();if(!truckContextApplied){truckContextApplied=true;maybeClearQuickContext();}},5000);}
  }

  async function loadClients(){
    clientInput.disabled=true;
    const {data,error}=await client.from('clients').select('id,company_name,is_active').eq('is_active',true).order('company_name',{ascending:true});
    if(error){console.error('Clients mission:',error);clientInput.innerHTML='<option value="">Clients indisponibles</option>';hasExistingClients=false;setNewClientMode(true,{focus:false});return;}
    const rows=data||[];hasExistingClients=rows.length>0;clientInput.innerHTML=rows.length?'<option value="">Sélectionner un client</option>'+rows.map(item=>`<option value="${escapeHtml(item.id)}">${escapeHtml(item.company_name)}</option>`).join(''):'<option value="">Aucun client enregistré</option>';
    if(rows.length)setNewClientMode(false,{focus:false});else setNewClientMode(true,{focus:false}); applyClientContext();
  }

  async function resolveClientId(){
    if(!newClientMode)return clientInput.value||null;
    const companyName=newClientCompany.value.trim();
    const {data:existing,error:existingError}=await client.from('clients').select('id,company_name,is_active').ilike('company_name',companyName).limit(1); if(existingError)throw existingError;
    if(existing?.length){const found=existing[0];if(!found.is_active){const {error}=await client.from('clients').update({is_active:true}).eq('id',found.id);if(error)throw error;}return found.id;}
    const {data:created,error:createError}=await client.from('clients').insert({company_name:companyName,contact_name:newClientContact.value.trim()||null,phone:newClientPhone.value.trim()||null,email:newClientEmail.value.trim()||null,payment_terms_days:30,is_active:true}).select('id').single(); if(createError)throw createError; return created.id;
  }

  async function handleSubmit(event){
    event.preventDefault();event.stopImmediatePropagation();if(saving)return;
    const saveMode=event.submitter?.dataset.saveMode||'finish'; const revenueRaw=String(revenueInput?.value||'').trim(); const missionId=crypto.randomUUID();
    const mission={id:missionId,submission_token:missionId,client_id:newClientMode?null:(clientInput?.value||null),truck:truckInput?.value.trim().toUpperCase(),date:dateInput?.value,loadingZone:loadingInput?.value.trim(),unloadingZone:unloadingInput?.value.trim(),revenue:numberValue(revenueInput)};
    if(!validateMission(mission,revenueRaw))return;
    saving=true;showError('');setSavingState(true);let insertedTrip=false;
    try{
      const {data:duplicate,error:duplicateError}=await client.from('trips').select('id').eq('truck',mission.truck).eq('date',mission.date).eq('loadingZone',mission.loadingZone).eq('unloadingZone',mission.unloadingZone).eq('revenue',mission.revenue).limit(1); if(duplicateError)throw duplicateError; if(duplicate?.length){showError('Cette mission existe déjà avec les mêmes informations.');return;}
      mission.client_id=await resolveClientId();
      const {error:missionError}=await client.from('trips').insert([mission]);if(missionError)throw missionError;insertedTrip=true;
      const values=getExpenseValues();const shouldCreateExpense=expenseTotal(values)>0||values.km>0||values.consumption>0;
      if(shouldCreateExpense){const {error}=await client.from('trip_expenses').insert([{id:crypto.randomUUID(),trip_id:mission.id,truck:mission.truck,date:mission.date,loadingZone:mission.loadingZone,unloadingZone:mission.unloadingZone,...values}]);if(error)throw error;}
      if(saveMode==='next')sessionStorage.setItem('nexisQuickEntryContext',JSON.stringify({client_id:mission.client_id,truck:mission.truck,date:mission.date}));
      setSavingState(true,'Mission enregistrée');const targetView=saveMode==='next'?'new-trip':'trips';setTimeout(()=>{location.replace(`${location.pathname}${location.search}#${targetView}`);location.reload();},350);
    }catch(error){console.error('Création mission:',error);if(insertedTrip)await client.from('trips').delete().eq('id',mission.id);showError(String(error?.message||'').includes('row-level security')?"Vous n'avez pas les droits nécessaires pour enregistrer cette opération.":"Impossible d'enregistrer la mission. Vérifiez les informations puis réessayez.");}
    finally{saving=false;if(!document.hidden)setSavingState(false);}
  }

  clientToggle.addEventListener('click',()=>{if(!hasExistingClients&&newClientMode)return;setNewClientMode(!newClientMode);});
  clientMore.addEventListener('click',()=>{newClientExtra.hidden=!newClientExtra.hidden;clientMore.textContent=newClientExtra.hidden?'+ Ajouter des coordonnées':'− Masquer les coordonnées';});
  [truckInput,clientInput,dateInput,loadingInput,unloadingInput,revenueInput,newClientCompany].forEach(input=>{input?.addEventListener('input',()=>{input.classList.remove('mission-field-invalid');input.removeAttribute('aria-invalid');if(!errorBox.hidden)showError('');});input?.addEventListener('change',()=>{input.classList.remove('mission-field-invalid');input.removeAttribute('aria-invalid');if(!errorBox.hidden)showError('');});});
  [...Object.values(expenseInputs),revenueInput].forEach(input=>input?.addEventListener('input',updateSummary));
  form.addEventListener('submit',handleSubmit,true);
  form.addEventListener('reset',()=>setTimeout(()=>{showError('');clearInvalidState();expenseSection.open=false;newClientExtra.hidden=true;if(hasExistingClients)setNewClientMode(false,{focus:false});else setNewClientMode(true,{focus:false});updateSummary();},0));

  restoreQuickEntryContext();loadClients();updateSummary();
})();