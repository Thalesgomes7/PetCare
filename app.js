const state={tutors:[],pets:[],appointments:[]};
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];

const DB_KEY='petcare_database_v1';
const emptyDB=()=>({tutors:[],pets:[],appointments:[]});
function readDB(){
  try {
    const value=JSON.parse(localStorage.getItem(DB_KEY)||'null');
    return value && Array.isArray(value.tutors) && Array.isArray(value.pets) && Array.isArray(value.appointments) ? value : emptyDB();
  } catch { return emptyDB(); }
}
function writeDB(db){ localStorage.setItem(DB_KEY,JSON.stringify(db)); }
const makeId=()=>globalThis.crypto?.randomUUID?.()||('id-'+Date.now()+'-'+Math.random().toString(16).slice(2));
async function api(path,options={}){
  const method=(options.method||'GET').toUpperCase();
  const body=options.body?JSON.parse(options.body):{};
  const db=readDB();
  const parts=path.split('/').filter(Boolean);
  const collection=parts[0];
  const now=()=>new Date().toISOString();
  const fail=(message)=>{throw new Error(message)};
  if(!['tutors','pets','appointments'].includes(collection)) fail('Recurso não encontrado.');
  if(method==='GET'){
    if(parts.length!==1) fail('Recurso não encontrado.');
    if(collection==='tutors') return db.tutors;
    if(collection==='pets') return db.pets.map(p=>({...p,tutorName:db.tutors.find(t=>t.id===p.tutorId)?.name||'Tutor não encontrado'}));
    return db.appointments.map(a=>({...a,petName:db.pets.find(p=>p.id===a.petId)?.name||'Pet removido',tutorName:db.tutors.find(t=>t.id===a.tutorId)?.name||'Tutor removido'})).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
  }
  if(collection==='tutors' && method==='POST'){
    const name=String(body.name||'').trim(),email=String(body.email||'').trim().toLowerCase(),phone=String(body.phone||'').trim();
    if(name.length<2) fail('Informe o nome do tutor.');
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('Informe um e-mail válido.');
    if(phone.replace(/\D/g,'').length<8) fail('Informe um telefone válido.');
    if(db.tutors.some(t=>t.email===email)) fail('Este e-mail já está cadastrado.');
    const tutor={id:makeId(),name,email,phone,createdAt:now()};
    db.tutors.unshift(tutor);writeDB(db);return tutor;
  }
  if(collection==='pets' && method==='POST'){
    const name=String(body.name||'').trim(),species=String(body.species||''),tutorId=String(body.tutorId||'');
    if(name.length<2) fail('Informe o nome do pet.');
    if(!['Cachorro','Gato','Ave','Roedor','Outro'].includes(species)) fail('Selecione uma espécie válida.');
    const tutor=db.tutors.find(t=>t.id===tutorId);if(!tutor) fail('Selecione um tutor válido.');
    const birthDate=String(body.birthDate||'');
    if(birthDate && Number.isNaN(Date.parse(birthDate+'T12:00:00'))) fail('Data de nascimento inválida.');
    const pet={id:makeId(),name,species,breed:String(body.breed||'').trim(),tutorId,birthDate:birthDate||null,notes:String(body.notes||'').trim(),createdAt:now()};
    db.pets.unshift(pet);writeDB(db);return {...pet,tutorName:tutor.name};
  }
  if(collection==='appointments' && method==='POST'){
    const pet=db.pets.find(p=>p.id===String(body.petId||''));if(!pet) fail('Selecione um pet válido.');
    const service=String(body.service||''),date=String(body.date||''),time=String(body.time||'');
    if(!['Banho','Tosa','Banho e tosa','Consulta veterinária','Vacinação','Outro'].includes(service)) fail('Selecione um serviço válido.');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date+'T12:00:00'))) fail('Informe uma data válida.');
    if(date<today()) fail('A data não pode estar no passado.');
    if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) fail('Informe um horário válido.');
    if(db.appointments.some(a=>a.date===date&&a.time===time&&a.status!=='Cancelado')) fail('Este horário já possui agendamento.');
    const appointment={id:makeId(),petId:pet.id,tutorId:pet.tutorId,service,date,time,status:'Agendado',notes:String(body.notes||'').trim(),createdAt:now()};
    db.appointments.push(appointment);writeDB(db);return appointment;
  }
  if(collection==='appointments' && parts.length===3 && parts[2]==='status' && method==='PATCH'){
    const appointment=db.appointments.find(a=>a.id===parts[1]);if(!appointment) fail('Agendamento não encontrado.');
    if(!['Agendado','Confirmado','Concluído','Cancelado'].includes(body.status)) fail('Status inválido.');
    appointment.status=body.status;appointment.updatedAt=now();writeDB(db);return appointment;
  }
  if(collection==='appointments' && parts.length===2 && method==='DELETE'){
    const before=db.appointments.length;db.appointments=db.appointments.filter(a=>a.id!==parts[1]);
    if(db.appointments.length===before) fail('Agendamento não encontrado.');
    writeDB(db);return null;
  }
  if(collection==='pets' && parts.length===2 && method==='DELETE'){
    const pet=db.pets.find(p=>p.id===parts[1]);if(!pet) fail('Pet não encontrado.');
    db.pets=db.pets.filter(p=>p.id!==parts[1]);
    db.appointments=db.appointments.filter(a=>a.petId!==parts[1]);
    writeDB(db);return null;
  }
  if(collection==='tutors' && parts.length===2 && method==='DELETE'){
    const tutor=db.tutors.find(t=>t.id===parts[1]);if(!tutor) fail('Tutor não encontrado.');
    if(db.pets.some(p=>p.tutorId===parts[1])) fail('Não é possível excluir este tutor enquanto houver pets vinculados. Exclua os pets primeiro.');
    db.tutors=db.tutors.filter(t=>t.id!==parts[1]);
    writeDB(db);return null;
  }
  fail('Operação não disponível.');
}

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const dateLabel=d=>d?new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short'}).format(new Date(d+'T12:00:00')):'—';
const statusClass=s=>'status-'+s.toLowerCase().replaceAll(' ','-');
function toast(s){const e=$('#toast');e.textContent=s;e.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>e.classList.remove('show'),3200)}
function empty(title,description){return `<div class="empty"><strong>${esc(title)}</strong><p>${esc(description)}</p></div>`}
function openDialog(id){const d=document.getElementById(id);$('.feedback',d).textContent='';d.showModal()}
function navigate(view){if(!['inicio','agendamentos','pets','tutores'].includes(view))view='inicio';$$('.view').forEach(s=>{s.hidden=s.id!=='view-'+view;s.classList.toggle('is-visible',!s.hidden)});$$('.nav-link').forEach(a=>a.classList.toggle('is-active',a.dataset.view===view));$('#breadcrumb').textContent=({inicio:'Visão geral',agendamentos:'Agendamentos',pets:'Pets',tutores:'Tutores'})[view];if(location.hash!=='#'+view)history.replaceState(null,'','#'+view)}
async function load(){try{[state.tutors,state.pets,state.appointments]=await Promise.all([api('/tutors'),api('/pets'),api('/appointments')]);render()}catch(e){toast('Não foi possível carregar: '+e.message);$('#upcoming').innerHTML=empty('Não foi possível carregar os dados','Verifique se o armazenamento do navegador está disponível e atualize a página.')}}
function render(){renderStats();renderUpcoming();renderAppointments();renderPets();renderTutors();populateSelects()}
function renderStats(){$('#stat-today').textContent=state.appointments.filter(a=>a.date===today()&&a.status!=='Cancelado').length;$('#stat-pets').textContent=state.pets.length;$('#stat-tutors').textContent=state.tutors.length;$('#stat-pending').textContent=state.appointments.filter(a=>['Agendado','Confirmado'].includes(a.status)).length}
function renderUpcoming(){const rows=state.appointments.filter(a=>a.date>=today()&&a.status!=='Cancelado').slice(0,5);$('#upcoming').innerHTML=rows.length?rows.map(a=>`<article class="upcoming-item"><div class="time-chip">${esc(a.time)}<br>${esc(dateLabel(a.date))}</div><div class="upcoming-main"><span class="pet-avatar">🐾</span><div><strong>${esc(a.petName)}</strong><small>${esc(a.service)} · ${esc(a.tutorName)}</small></div></div><span class="status-pill ${statusClass(a.status)}">${esc(a.status)}</span></article>`).join(''):empty('Agenda tranquila por aqui','Cadastre um tutor, um pet e crie seu primeiro agendamento.')}
function renderAppointments(){const q=$('#appointment-search').value.toLowerCase().trim(),s=$('#appointment-status').value;const rows=state.appointments.filter(a=>(s==='Todos'||a.status===s)&&(a.petName+' '+a.tutorName+' '+a.service+' '+a.status).toLowerCase().includes(q));$('#appointments-table').innerHTML=rows.length?`<table><thead><tr><th>Pet / Tutor</th><th>Serviço</th><th>Data e hora</th><th>Status</th><th>Ações</th></tr></thead><tbody>${rows.map(a=>`<tr><td><div class="table-person">🐾 <span><b>${esc(a.petName)}</b><br>${esc(a.tutorName)}</span></div></td><td>${esc(a.service)}</td><td>${esc(dateLabel(a.date))} · ${esc(a.time)}</td><td><span class="status-pill ${statusClass(a.status)}">${esc(a.status)}</span></td><td>${!['Concluído','Cancelado'].includes(a.status)?`<button class="small-button" data-action="complete" data-id="${esc(a.id)}">Concluir</button><button class="small-button" data-action="cancel" data-id="${esc(a.id)}">Cancelar</button>`:''}<button class="small-button" data-action="delete" data-id="${esc(a.id)}">Excluir</button></td></tr>`).join('')}</tbody></table>`:empty('Nenhum agendamento encontrado','Mude os filtros ou cadastre um atendimento.')}
function renderPets(){const q=$('#pet-search').value.toLowerCase().trim(),rows=state.pets.filter(p=>(p.name+' '+p.species+' '+p.breed+' '+p.tutorName).toLowerCase().includes(q));$('#pets-grid').innerHTML=rows.length?rows.map(p=>`<article class="pet-card"><div class="card-head"><span class="pet-illustration">${p.species==='Gato'?'🐈':p.species==='Ave'?'🦜':p.species==='Roedor'?'🐹':'🐕'}</span><div><h3>${esc(p.name)}</h3><p class="meta">${esc(p.species)} ${p.breed?'· '+esc(p.breed):''}</p></div></div><div class="card-divider"></div><div class="card-detail"><b>Tutor:</b> ${esc(p.tutorName)}<br><b>Nascimento:</b> ${esc(dateLabel(p.birthDate))}${p.notes?'<br><b>Observações:</b> '+esc(p.notes):''}</div><div class="card-actions"><button class="small-button danger" data-action="delete-pet" data-id="${esc(p.id)}">Excluir pet</button></div></article>`).join(''):empty('Nenhum pet cadastrado','Cadastre um tutor e depois adicione um pet.')}
function renderTutors(){const q=$('#tutor-search').value.toLowerCase().trim(),rows=state.tutors.filter(t=>(t.name+' '+t.email+' '+t.phone).toLowerCase().includes(q));$('#tutors-grid').innerHTML=rows.length?rows.map(t=>{const n=state.pets.filter(p=>p.tutorId===t.id).length;return `<article class="tutor-card"><div class="card-head"><span class="tutor-icon">${esc(t.name.split(/\\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase())}</span><div><h3>${esc(t.name)}</h3><p class="meta">${n} ${n===1?'pet cadastrado':'pets cadastrados'}</p></div></div><div class="card-divider"></div><div class="card-detail"><b>E-mail:</b> ${esc(t.email)}<br><b>Telefone:</b> ${esc(t.phone)}</div><div class="card-actions"><button class="small-button danger" data-action="delete-tutor" data-id="${esc(t.id)}">Excluir tutor</button></div></article>`}).join(''):empty('Nenhum tutor cadastrado','Adicione o responsável para começar.')}
function populateSelects(){const ts=$('#pet-tutor-select'),ps=$('#appointment-pet-select'),tv=ts.value,pv=ps.value;ts.innerHTML='<option value="">Selecione um tutor</option>'+state.tutors.map(t=>`<option value="${esc(t.id)}">${esc(t.name)}</option>`).join('');ps.innerHTML='<option value="">Selecione um pet</option>'+state.pets.map(p=>`<option value="${esc(p.id)}">${esc(p.name)} — ${esc(p.tutorName)}</option>`).join('');if(state.tutors.some(t=>t.id===tv))ts.value=tv;if(state.pets.some(p=>p.id===pv))ps.value=pv;ts.disabled=!state.tutors.length;ps.disabled=!state.pets.length}
function openAppointment(){populateSelects();if(!state.pets.length){toast('Cadastre um tutor e um pet antes de agendar.');openDialog('tutor-dialog');return}$('#appointment-date').min=today();openDialog('appointment-dialog')}
async function submitForm(form,endpoint,message){const feedback=$('.feedback',form),button=$('button[type="submit"]',form),label=button.textContent;feedback.textContent='';button.disabled=true;button.textContent='Salvando…';try{await api(endpoint,{method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(form).entries()))});form.reset();$$('dialog').forEach(d=>d.close());await load();toast(message);if(form.id==='appointment-form')navigate('agendamentos')}catch(e){feedback.textContent=e.message}finally{button.disabled=false;button.textContent=label}}
$('#tutor-form').addEventListener('submit',e=>{e.preventDefault();submitForm(e.currentTarget,'/tutors','Tutor cadastrado com sucesso.')});
$('#pet-form').addEventListener('submit',e=>{e.preventDefault();submitForm(e.currentTarget,'/pets','Pet cadastrado com sucesso.')});
$('#appointment-form').addEventListener('submit',e=>{e.preventDefault();submitForm(e.currentTarget,'/appointments','Agendamento criado com sucesso.')});
document.addEventListener('click',async e=>{const link=e.target.closest('[data-view]');if(link){e.preventDefault();navigate(link.dataset.view);return}if(e.target.closest('[data-open-appointment]'))return openAppointment();if(e.target.closest('[data-open-tutor]'))return openDialog('tutor-dialog');if(e.target.closest('[data-open-pet]')){if(!state.tutors.length){toast('Cadastre um tutor antes de cadastrar um pet.');openDialog('tutor-dialog')}else openDialog('pet-dialog');return}if(e.target.closest('[data-close-dialog]'))return e.target.closest('dialog').close();const b=e.target.closest('[data-action]');if(!b)return;const id=b.dataset.id;const action=b.dataset.action;const a=state.appointments.find(x=>x.id===id);const pet=state.pets.find(x=>x.id===id);const tutor=state.tutors.find(x=>x.id===id);try{if(action==='delete'){if(!a||!confirm('Excluir o agendamento de '+a.petName+'?'))return;await api('/appointments/'+id,{method:'DELETE'});toast('Agendamento excluído.')}else if(action==='delete-pet'){if(!pet||!confirm('Excluir o pet '+pet.name+'? Os agendamentos vinculados a ele também serão excluídos.'))return;await api('/pets/'+id,{method:'DELETE'});toast('Pet excluído.')}else if(action==='delete-tutor'){if(!tutor||!confirm('Excluir o tutor '+tutor.name+'?'))return;await api('/tutors/'+id,{method:'DELETE'});toast('Tutor excluído.')}else if(a){const status=action==='complete'?'Concluído':'Cancelado';await api('/appointments/'+a.id+'/status',{method:'PATCH',body:JSON.stringify({status})});toast('Agendamento '+status.toLowerCase()+'.')}else return;await load()}catch(err){toast(err.message)}});
$('#appointment-search').addEventListener('input',renderAppointments);$('#appointment-status').addEventListener('change',renderAppointments);$('#pet-search').addEventListener('input',renderPets);$('#tutor-search').addEventListener('input',renderTutors);
$$('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d)d.close()}));
window.addEventListener('hashchange',()=>navigate(location.hash.slice(1)));navigate(location.hash.slice(1)||'inicio');load();
