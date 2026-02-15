// ═══════════════════════════════════════════════════════════
// CRONOS — script.js  (API-ready edition)
// All data operations are abstracted via api.*() stubs so
// every call can be wired to a FastAPI backend with zero
// structural changes.
// ═══════════════════════════════════════════════════════════

// ─── API STUB LAYER ─────────────────────────────────────────
// Replace every method body with a real fetch() call when the
// FastAPI server is available.  Shape kept intentionally thin.
const api = {
  // Auth / profile
  getProfile:       async () => state.profile,
  updateProfile:    async (d) => { state.profile = { ...state.profile, ...d }; return state.profile; },

  // Projects
  getProjetos:      async () => state.projetos,
  createProjeto:    async (d) => { const p={id:genId('proj'),...d,esforcoReal:0,membros:[]}; state.projetos.push(p); return p; },
  updateProjeto:    async (id,d) => { const i=state.projetos.findIndex(p=>p.id===id); if(i>=0) state.projetos[i]={...state.projetos[i],...d}; return state.projetos[i]; },
  deleteProjeto:    async (id) => { state.projetos=state.projetos.filter(p=>p.id!==id); state.tarefas=state.tarefas.filter(t=>t.projetoId!==id); state.membros.forEach(m=>{if(m.projetos)m.projetos=m.projetos.filter(pid=>pid!==id);}); },

  // Tasks
  getTarefas:       async () => state.tarefas,
  createTarefa:     async (d) => { const t={id:genId('tarefa'),...d}; state.tarefas.push(t); return t; },
  updateTarefa:     async (id,d) => { const i=state.tarefas.findIndex(t=>t.id===id); if(i>=0) state.tarefas[i]={...state.tarefas[i],...d}; return state.tarefas[i]; },
  deleteTarefa:     async (id) => { state.tarefas=state.tarefas.filter(t=>t.id!==id); },

  // Members
  getMembros:       async () => state.membros,
  createMembro:     async (d) => { const m={id:genId('membro'),...d,projetos:[],status:'pending',hash:generateHash()}; state.membros.push(m); return m; },
  updateMembro:     async (id,d) => { const i=state.membros.findIndex(m=>m.id===id); if(i>=0) state.membros[i]={...state.membros[i],...d}; return state.membros[i]; },
  deleteMembro:     async (id) => { state.membros=state.membros.filter(m=>m.id!==id); state.tarefas.forEach(t=>{if(t.responsavelId===id)t.responsavelId=null;}); },

  // Invites
  sendInvite:       async (membroId) => { /* POST /api/invite */ console.log('[API] sendInvite →', membroId); return { sent: true }; },
  acceptInvite:     async (hash) => { const m=state.membros.find(m=>m.hash===hash); if(m){ m.status='active'; } return m; },
  rejectInvite:     async (hash, motivo, detalhes) => { const m=state.membros.find(m=>m.hash===hash); if(m){ m.status='rejected'; m.rejeicaoMotivo=motivo; m.rejeicaoDetalhes=detalhes; } return m; },

  // Notifications
  getNotificacoes:  async () => state.notificacoes,
  markRead:         async (id) => { const n=state.notificacoes.find(n=>n.id===id); if(n) n.lida=true; return n; },
  markAllRead:      async () => { state.notificacoes.forEach(n=>n.lida=true); },

  // History
  getHistorico:     async () => state.historico,
};

// ─── STATE ──────────────────────────────────────────────────
let state = {
  profile: {
    nome: '',
    sobrenome: '',
    email: '',
    cargo: '',
    empresa: '',
    avatar: '',
    color: 'linear-gradient(135deg,#8b00e8,#5710d1)',
    hash: generateHash(),
  },
  projetos: [],
  membros: [],
  tarefas: [],
  historico: [],
  notificacoes: [],
  ids: { proj: 1, membro: 1, tarefa: 1, notif: 1 }
};

const historicoBase = {
  web:    { prazoDesvio: 0.14, esfDesvio: 0.18, confianca: 88 },
  mobile: { prazoDesvio: 0.20, esfDesvio: 0.25, confianca: 82 },
  dados:  { prazoDesvio: 0.10, esfDesvio: 0.12, confianca: 91 },
  infra:  { prazoDesvio: 0.16, esfDesvio: 0.22, confianca: 79 },
  design: { prazoDesvio: 0.08, esfDesvio: 0.09, confianca: 93 },
};

// ─── UTILS ──────────────────────────────────────────────────
function save() { try { localStorage.setItem('cronos_v2', JSON.stringify(state)); } catch(e){} }
function load() {
  try {
    const s = localStorage.getItem('cronos_v2');
    if (s) {
      const parsed = JSON.parse(s);
      state = { ...state, ...parsed };
      // back-compat: ensure profile.hash exists
      if (!state.profile) state.profile = { nome:'George',sobrenome:'L.',email:'george@cronos.app',cargo:'Admin',empresa:'Cronos',avatar:'GL',color:'linear-gradient(135deg,#8b00e8,#5710d1)',hash:generateHash() };
      if (!state.profile.hash) state.profile.hash = generateHash();
      if (!state.notificacoes) state.notificacoes = [];
    }
  } catch(e) {}
}
function genId(t) { const id = state.ids[t]; state.ids[t]++; return id; }
function generateHash() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}
function addLog(titulo, sub, tipo) {
  state.historico.unshift({ titulo, sub, tipo, ts: Date.now() });
  if (state.historico.length > 60) state.historico.pop();
}
function addNotif(titulo, sub, tipo = 'info', ref = null) {
  state.notificacoes.unshift({
    id: state.ids.notif++,
    titulo, sub, tipo, ref,
    lida: false,
    ts: Date.now()
  });
  if (state.notificacoes.length > 80) state.notificacoes.pop();
  updateNotifBadge();
}
function timeAgo(ts) {
  const d = Date.now() - ts;
  if (d < 60000) return 'agora';
  if (d < 3600000) return Math.floor(d / 60000) + 'min';
  if (d < 86400000) return Math.floor(d / 3600000) + 'h';
  return Math.floor(d / 86400000) + 'd';
}

// ─── NAVIGATION ─────────────────────────────────────────────
const viewTitles = { dashboard: 'Dashboard', projetos: 'Projetos', tarefas: 'Tarefas', membros: 'Membros' };
let currentView = 'dashboard';
let currentProjId = null;
let currentTarefaId = null;

function goTo(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('view-' + view).classList.add('active');
  document.querySelector('[data-view="' + view + '"]')?.classList.add('active');
  document.getElementById('topbarTitle').textContent = viewTitles[view] || view;
  currentView = view;
  document.getElementById('btnNovoProj').style.display = (view === 'membros' || view === 'tarefas') ? 'none' : '';
  renderView(view);
}
document.querySelectorAll('[data-view]').forEach(el => el.addEventListener('click', () => goTo(el.dataset.view)));

function renderView(v) {
  if (v === 'dashboard') renderDashboard();
  if (v === 'projetos')  renderProjetosView();
  if (v === 'tarefas')   renderTarefasView();
  if (v === 'membros')   renderMembrosView();
}

// ─── MODAL ──────────────────────────────────────────────────
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
document.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', () => closeModal(el.dataset.close)));
document.querySelectorAll('.modal-overlay').forEach(ov => ov.addEventListener('click', e => { if (e.target === ov) ov.classList.remove('open'); }));

// ─── TOAST ──────────────────────────────────────────────────
function toast(msg, type = 'success') {
  const icons = { success: '✓', warning: '⚠', error: '✕', info: 'ℹ' };
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.innerHTML = `<span class="toast-icon">${icons[type]||'ℹ'}</span><span class="toast-msg">${msg}</span>`;
  document.getElementById('toastContainer').appendChild(t);
  setTimeout(() => { t.style.animation = 'fadeOut .3s forwards'; setTimeout(() => t.remove(), 300); }, 2800);
}

// ─── CONFIRM ────────────────────────────────────────────────
let confirmCb = null;
function confirmDlg(title, msg, cb) {
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmMsg').innerHTML = msg;
  confirmCb = cb;
  openModal('modalConfirm');
}
document.getElementById('btnConfirmOk').onclick = () => { closeModal('modalConfirm'); if (confirmCb) confirmCb(); };

// ─── HELPERS ────────────────────────────────────────────────
const statusMap = { ok: ['s-ok', 'No Prazo'], warn: ['s-warn', 'Atenção'], risk: ['s-risk', 'Em Risco'], idle: ['s-idle', 'Iniciando'] };
const barCls   = s => s === 'risk' ? 'risk' : s === 'warn' ? 'warn' : '';
const diasCls  = d => d <= 7 ? 'dl-risk' : d <= 20 ? 'dl-warn' : 'dl-ok';
const prioCls  = p => ({ critica: 'tp-critica', alta: 'tp-alta', media: 'tp-media', baixa: 'tp-baixa' }[p] || 'tp-media');
const prioLbl  = p => ({ critica: 'Crítica', alta: 'Alta', media: 'Média', baixa: 'Baixa' }[p] || p);
const statusLbl = s => ({ todo: 'A Fazer', doing: 'Em Andamento', done: 'Concluído' }[s] || s);
const initials  = (n, s) => ((n || '?')[0] + (s || '?')[0]).toUpperCase();

const hiIcons = {
  ok:     `<div class="hist-icon hi-green"><svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round"><path d="M9 11l3 3L22 4"/></svg></div>`,
  proj:   `<div class="hist-icon hi-blue"><svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-4 0v2"/><line x1="12" y1="12" x2="12" y2="16"/></svg></div>`,
  del:    `<div class="hist-icon hi-red"><svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg></div>`,
  membro: `<div class="hist-icon hi-blue"><svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/></svg></div>`,
  warn:   `<div class="hist-icon hi-yellow"><svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/></svg></div>`,
  tarefa: `<div class="hist-icon hi-green"><svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg></div>`,
  invite: `<div class="hist-icon hi-blue"><svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></div>`,
};

// ─── NOTIFICATION PANEL ─────────────────────────────────────
function updateNotifBadge() {
  const unread = state.notificacoes.filter(n => !n.lida).length;
  const dot = document.querySelector('.notif-dot');
  const badge = document.getElementById('notifBadge');
  if (dot) dot.style.display = unread > 0 ? '' : 'none';
  if (badge) badge.textContent = unread > 99 ? '99+' : unread;
  if (badge) badge.style.display = unread > 0 ? '' : 'none';
}

function openNotifPanel() {
  const panel = document.getElementById('notifPanel');
  if (!panel) return;
  panel.classList.toggle('open');
  renderNotifPanel();
}

function renderNotifPanel() {
  const list = document.getElementById('notifPanelList');
  if (!list) return;

  const notifs = state.notificacoes;

  if (!notifs.length) {
    list.innerHTML = `<div class="notif-empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
      <p>Nenhuma notificação</p>
      <small>As notificações aparecerão aqui quando conectado à API</small>
    </div>`;
    return;
  }

  const notifIcons = {
    info:    { icon: 'ℹ', cls: 'ni-blue' },
    success: { icon: '✓', cls: 'ni-green' },
    warning: { icon: '⚠', cls: 'ni-yellow' },
    error:   { icon: '!', cls: 'ni-red' },
    invite:  { icon: '✉', cls: 'ni-purple' },
    reject:  { icon: '✕', cls: 'ni-red' },
    accept:  { icon: '✓', cls: 'ni-green' },
  };

  list.innerHTML = notifs.map(n => {
    const ic = notifIcons[n.tipo] || notifIcons.info;
    return `<div class="notif-item ${n.lida ? 'lida' : ''}" data-notif="${n.id}">
      <div class="notif-item-icon ${ic.cls}">${ic.icon}</div>
      <div class="notif-item-body">
        <div class="notif-item-title">${n.titulo}</div>
        <div class="notif-item-sub">${n.sub || ''}</div>
        <div class="notif-item-time">${timeAgo(n.ts)}</div>
      </div>
      ${!n.lida ? '<div class="notif-unread-dot"></div>' : ''}
    </div>`;
  }).join('');

  list.querySelectorAll('.notif-item').forEach(el => {
    el.onclick = async () => {
      const id = +el.dataset.notif;
      await api.markRead(id);
      updateNotifBadge();
      renderNotifPanel();
      save();
    };
  });
}

document.querySelector('.notif-btn')?.addEventListener('click', (e) => {
  e.stopPropagation();
  openNotifPanel();
});

document.addEventListener('click', (e) => {
  const panel = document.getElementById('notifPanel');
  if (panel && panel.classList.contains('open') && !panel.contains(e.target) && !e.target.closest('.notif-btn')) {
    panel.classList.remove('open');
  }
});

// ─── PROFILE ────────────────────────────────────────────────
// ─── PROFILE CHIP (sidebar) ──────────────────────────────────
function renderProfileChip() {
  const p  = state.profile;
  const av = document.getElementById('loggedAvatar');
  const nm = document.getElementById('loggedName');
  const rl = document.getElementById('loggedRole');
  if (av) {
    if (p.photo) {
      // show photo in sidebar chip
      av.innerHTML = `<img src="${p.photo}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block"/>`;
      av.style.background = 'transparent';
    } else {
      av.innerHTML = initials(p.nome, p.sobrenome);
      av.style.background = p.color;
    }
  }
  if (nm) nm.textContent = `${p.nome} ${p.sobrenome}.`;
  if (rl) rl.textContent = `${p.cargo} · ${p.empresa}`;
}

// ─── PROFILE MODAL ──────────────────────────────────────────
// Temp holds a new photo selected but not yet saved
let _pendingPhoto = null;

function syncProfilePreview() {
  // live-update the big avatar inside the modal
  const p    = state.profile;
  const prev = document.getElementById('profileAvatarPreview');
  const nm   = document.getElementById('profilePreviewName');
  const rl   = document.getElementById('profilePreviewRole');
  const rmBtn = document.getElementById('btnRemovePhoto');

  const nome  = document.getElementById('profileNome')?.value.trim()  || p.nome  || '';
  const sob   = document.getElementById('profileSob')?.value.trim()   || p.sobrenome || '';
  const cargo = document.getElementById('profileCargo')?.value.trim() || p.cargo || '';
  const emp   = document.getElementById('profileEmpresa')?.value.trim()|| p.empresa || '';
  const color = document.getElementById('profileColor')?.value         || p.color;
  const photo = _pendingPhoto !== null ? _pendingPhoto : (p.photo || null);

  if (prev) {
    if (photo) {
      prev.innerHTML = `<img src="${photo}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block"/>`;
      prev.style.background = 'transparent';
    } else {
      prev.innerHTML = initials(nome, sob);
      prev.style.background = color;
    }
  }
  if (rmBtn) rmBtn.style.display = photo ? '' : 'none';
  if (nm) nm.textContent = `${nome} ${sob}.`;
  if (rl) rl.textContent = `${cargo} · ${emp}`;
}

function openProfileModal() {
  const p = state.profile;
  _pendingPhoto = null;   // reset pending photo on open
  document.getElementById('profileNome').value      = p.nome || '';
  document.getElementById('profileSob').value       = p.sobrenome || '';
  document.getElementById('profileEmail').value     = p.email || '';
  document.getElementById('profileCargo').value     = p.cargo || '';
  document.getElementById('profileEmpresa').value   = p.empresa || '';
  document.getElementById('profileColor').value     = p.color || '';
  document.getElementById('profileHashDisplay').textContent = p.hash || '—';
  // clear file input so same file can be re-selected
  const fi = document.getElementById('profilePhotoInput');
  if (fi) fi.value = '';
  syncProfilePreview();
  openModal('modalProfile');
}

document.getElementById('userChipBtn')?.addEventListener('click', openProfileModal);

// Live preview while typing name / changing color
['profileNome','profileSob','profileCargo','profileEmpresa'].forEach(id => {
  document.getElementById(id)?.addEventListener('input', syncProfilePreview);
});
document.getElementById('profileColor')?.addEventListener('change', syncProfilePreview);

// Photo file input → FileReader → base64 preview
document.getElementById('profilePhotoInput')?.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) {
    toast('Foto muito grande. Máximo 2 MB.', 'error');
    e.target.value = '';
    return;
  }
  const allowed = ['image/jpeg','image/png','image/webp','image/gif'];
  if (!allowed.includes(file.type)) {
    toast('Formato inválido. Use JPG, PNG ou WEBP.', 'error');
    e.target.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = (ev) => {
    _pendingPhoto = ev.target.result;   // base64 data URL
    syncProfilePreview();
    toast('Foto carregada! Salve o perfil para confirmar.', 'info');
  };
  reader.readAsDataURL(file);
});

// Remove photo button
document.getElementById('btnRemovePhoto')?.addEventListener('click', () => {
  _pendingPhoto = '';   // empty string = explicitly removed
  const fi = document.getElementById('profilePhotoInput');
  if (fi) fi.value = '';
  syncProfilePreview();
  toast('Foto removida. Salve para confirmar.', 'warning');
});

// Save profile
document.getElementById('btnSalvarProfile')?.addEventListener('click', async () => {
  const d = {
    nome:      document.getElementById('profileNome').value.trim(),
    sobrenome: document.getElementById('profileSob').value.trim(),
    email:     document.getElementById('profileEmail').value.trim(),
    cargo:     document.getElementById('profileCargo').value.trim(),
    empresa:   document.getElementById('profileEmpresa').value.trim(),
    color:     document.getElementById('profileColor').value,
  };
  if (!d.nome) { toast('Informe o nome', 'error'); return; }
  // apply pending photo change
  if (_pendingPhoto !== null) d.photo = _pendingPhoto;
  await api.updateProfile(d);
  _pendingPhoto = null;
  renderProfileChip();
  toast('Perfil atualizado!');
  closeModal('modalProfile');
  save();
});

document.getElementById('btnRegenHash')?.addEventListener('click', () => {
  state.profile.hash = generateHash();
  document.getElementById('profileHashDisplay').textContent = state.profile.hash;
  toast('Novo hash gerado!', 'info');
  save();
});

// ─── DASHBOARD ──────────────────────────────────────────────
function renderDashboard() {
  renderKPIs();
  renderProjBody();
  renderForecast();
  renderHist();
  renderVelocity();
  drawChart();
}

function renderKPIs() {
  const ativos = state.projetos.length;
  const concl  = state.tarefas.filter(t => t.status === 'done').length;
  const riscos = state.projetos.filter(p => p.status === 'risk').length;
  document.getElementById('kpiGrid').innerHTML = `
    <div class="kpi-card" style="--accent:#4fffb0">
      <div class="kpi-label"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-4 0v2"/></svg>Projetos Ativos</div>
      <div class="kpi-val">${ativos}</div><div class="kpi-sub">${ativos === 0 ? 'Nenhum ainda' : ativos + ' cadastrado(s)'}</div><div class="kpi-glow"></div>
    </div>
    <div class="kpi-card" style="--accent:#ffd84f">
      <div class="kpi-label"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>Tarefas Concluídas</div>
      <div class="kpi-val">${concl}</div><div class="kpi-sub">de ${state.tarefas.length} total</div><div class="kpi-glow"></div>
    </div>
    <div class="kpi-card" style="--accent:#ff5e7e">
      <div class="kpi-label"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/></svg>Projetos em Risco</div>
      <div class="kpi-val">${riscos}</div><div class="kpi-sub">${riscos === 0 ? '<span class="badge-up">Tudo OK</span>' : '<span class="badge-down">Atenção necessária</span>'}</div><div class="kpi-glow"></div>
    </div>
    <div class="kpi-card" style="--accent:#5ec4ff">
      <div class="kpi-label"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>Membros da Equipe</div>
      <div class="kpi-val">${state.membros.filter(m => m.status === 'active').length}</div><div class="kpi-sub">${state.membros.length} cadastrado(s)</div><div class="kpi-glow"></div>
    </div>`;
}

function renderProjBody() {
  const tb = document.getElementById('projBody');
  if (!state.projetos.length) {
    tb.innerHTML = '<tr><td colspan="4"><div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:36px;height:36px;margin-bottom:.6rem"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-4 0v2"/></svg><div>Nenhum projeto ainda. Clique em "Novo Projeto".</div></div></td></tr>';
    return;
  }
  tb.innerHTML = state.projetos.slice(0, 5).map(p => `
    <tr data-proj="${p.id}">
      <td><div class="proj-name">${p.nome}<small>${p.desc || '—'}</small></div></td>
      <td><span class="status-dot ${statusMap[p.status][0]}">${statusMap[p.status][1]}</span></td>
      <td><div class="mini-bar"><div class="bar-track"><div class="bar-fill ${barCls(p.status)}" style="width:${p.prog || 0}%"></div></div><span style="font-size:.78rem;color:var(--texto-dim)">${p.prog || 0}%</span></div></td>
      <td><span class="days-left ${diasCls(p.dias || 0)}">${p.dias || 0}d</span></td>
    </tr>`).join('');
  tb.querySelectorAll('tr[data-proj]').forEach(tr => tr.onclick = () => openProjDetalhe(+tr.dataset.proj));
}

function renderForecast() {
  const fl = document.getElementById('forecastList');
  const projs = state.projetos.filter(p => p.cat && p.prazoEst && p.esforcoEst);
  if (!projs.length) {
    fl.innerHTML = '<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:36px;height:36px;margin-bottom:.6rem"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg><div>Adicione projetos com categoria e estimativas para ver previsões.</div></div>';
    return;
  }
  fl.innerHTML = projs.slice(0, 3).map(p => {
    const h  = historicoBase[p.cat] || historicoBase.web;
    const pR = Math.round(p.prazoEst * (1 + h.prazoDesvio));
    const eR = Math.round(p.esforcoEst * (1 + h.esfDesvio));
    const d  = Math.round((h.prazoDesvio + h.esfDesvio) / 2 * 100);
    const tipo = d >= 18 ? 'risk' : d >= 10 ? 'warn' : 'ok';
    const fbMap = { ok: 'fb-ok', risk: 'fb-risk', warn: 'fb-warn' };
    const fbLbl = { ok: 'Normal', risk: 'Alto Risco', warn: 'Atenção' };
    return `<div class="forecast-item">
      <div class="forecast-top"><span class="forecast-proj">${p.nome}</span><span class="forecast-badge ${fbMap[tipo]}">${fbLbl[tipo]}</span></div>
      <div class="forecast-rows">
        <div class="forecast-metric"><div class="fm-label">Prazo est.</div><div class="fm-val">${p.prazoEst}d</div><div class="fm-delta ${tipo === 'ok' ? 'fd-pos' : 'fd-neg'}">→ ${pR}d</div></div>
        <div class="forecast-metric"><div class="fm-label">Esforço est.</div><div class="fm-val">${p.esforcoEst}h</div><div class="fm-delta ${tipo === 'ok' ? 'fd-pos' : 'fd-neg'}">→ ${eR}h</div></div>
        <div class="forecast-metric"><div class="fm-label">Desvio</div><div class="fm-val" style="color:${tipo === 'ok' ? 'var(--verde)' : tipo === 'risk' ? 'var(--vermelho)' : 'var(--amarelo)'}">+${d}%</div></div>
      </div></div>`;
  }).join('');
}

function renderHist() {
  const hl = document.getElementById('histList');
  if (!state.historico.length) { hl.innerHTML = '<div class="empty-state" style="padding:1rem">Nenhuma atividade ainda.</div>'; return; }
  hl.innerHTML = state.historico.slice(0, 8).map(h => `
    <div class="hist-item">${hiIcons[h.tipo] || hiIcons.ok}
      <div class="hist-text"><div class="hist-title">${h.titulo}</div><div class="hist-sub">${h.sub}</div></div>
      <div class="hist-time">${timeAgo(h.ts)}</div>
    </div>`).join('');
}

function renderVelocity() {
  const vl = document.getElementById('velocityList');
  const projs = state.projetos.filter(p => p.esforcoEst);
  if (!projs.length) { vl.innerHTML = '<div style="color:var(--texto-dim);font-size:.82rem;text-align:center;padding:1rem">Adicione projetos com estimativa.</div>'; return; }
  const mx = Math.max(...projs.map(p => Math.max(p.esforcoEst || 0, (p.esforcoReal || p.esforcoEst * 1.1))), 10);
  vl.innerHTML = projs.slice(0, 4).map(p => {
    const real = p.esforcoReal || Math.round(p.esforcoEst * 1.1);
    const r = real / (p.esforcoEst || 1);
    const cls = r > 1.15 ? 'risk' : r > 1.05 ? 'warn' : 'ok';
    return `<div class="vel-item">
      <div class="vel-header"><span class="vel-name">${p.nome}</span><div class="vel-nums"><span class="vel-est">${p.esforcoEst}h est.</span><span class="vel-real ${cls}">${real}h real</span></div></div>
      <div class="vel-bars"><div class="vel-bar-est" style="width:${p.esforcoEst / mx * 100}%"></div><div class="vel-bar-real ${cls}" style="width:${real / mx * 100}%"></div></div>
    </div>`;
  }).join('');
}

function drawChart() {
  const c = document.getElementById('effortChart'); if (!c) return;
  const ctx = c.getContext('2d');
  const W = c.parentElement.offsetWidth || 400, H = 160;
  c.width = W; c.height = H;
  const meses = ['Set', 'Out', 'Nov', 'Dez', 'Jan', 'Fev'];
  const est  = [110, 120, 105, 130, 115, 120];
  const real = [118, 134, 112, 155, 128, 143];
  const te = state.projetos.reduce((s, p) => s + (p.esforcoEst || 0), 0);
  const tr = state.projetos.reduce((s, p) => s + (p.esforcoReal || (p.esforcoEst ? p.esforcoEst * 1.1 : 0)), 0);
  if (te > 0) { est[5] = Math.round(te); real[5] = Math.round(tr); }
  const pad = { l: 30, r: 12, t: 14, b: 28 };
  const gW = W - pad.l - pad.r, gH = H - pad.t - pad.b;
  const mx = Math.max(...est, ...real) * 1.15;
  const xp = i => pad.l + (i / (meses.length - 1)) * gW;
  const yp = v => pad.t + gH - (v / mx) * gH;
  ctx.strokeStyle = 'rgba(140,80,255,.12)'; ctx.lineWidth = 1;
  [0, .25, .5, .75, 1].forEach(t => { const y = pad.t + gH * (1 - t); ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + gW, y); ctx.stroke(); });
  const gR = ctx.createLinearGradient(0, pad.t, 0, pad.t + gH);
  gR.addColorStop(0, 'rgba(255,94,126,.25)'); gR.addColorStop(1, 'rgba(255,94,126,.02)');
  ctx.beginPath(); ctx.moveTo(xp(0), yp(real[0]));
  real.forEach((v, i) => { if (i > 0) ctx.lineTo(xp(i), yp(v)); });
  ctx.lineTo(xp(real.length - 1), pad.t + gH); ctx.lineTo(xp(0), pad.t + gH); ctx.closePath(); ctx.fillStyle = gR; ctx.fill();
  const gE = ctx.createLinearGradient(0, pad.t, 0, pad.t + gH);
  gE.addColorStop(0, 'rgba(87,16,209,.3)'); gE.addColorStop(1, 'rgba(87,16,209,.02)');
  ctx.beginPath(); ctx.moveTo(xp(0), yp(est[0]));
  est.forEach((v, i) => { if (i > 0) ctx.lineTo(xp(i), yp(v)); });
  ctx.lineTo(xp(est.length - 1), pad.t + gH); ctx.lineTo(xp(0), pad.t + gH); ctx.closePath(); ctx.fillStyle = gE; ctx.fill();
  ctx.beginPath(); ctx.strokeStyle = '#b87fff'; ctx.lineWidth = 2; ctx.setLineDash([5, 3]);
  est.forEach((v, i) => i === 0 ? ctx.moveTo(xp(i), yp(v)) : ctx.lineTo(xp(i), yp(v))); ctx.stroke(); ctx.setLineDash([]);
  ctx.beginPath(); ctx.strokeStyle = '#ff5e7e'; ctx.lineWidth = 2;
  real.forEach((v, i) => i === 0 ? ctx.moveTo(xp(i), yp(v)) : ctx.lineTo(xp(i), yp(v))); ctx.stroke();
  real.forEach((v, i) => { ctx.beginPath(); ctx.arc(xp(i), yp(v), 3.5, 0, Math.PI * 2); ctx.fillStyle = '#ff5e7e'; ctx.fill(); });
  ctx.fillStyle = 'rgba(149,128,184,.8)'; ctx.font = '11px "Exo 2",sans-serif'; ctx.textAlign = 'center';
  meses.forEach((m, i) => ctx.fillText(m, xp(i), H - 6));
  ctx.fillStyle = '#b87fff'; ctx.fillRect(pad.l, 6, 20, 3); ctx.fillStyle = 'rgba(149,128,184,.8)'; ctx.textAlign = 'left'; ctx.fillText('Estimado', pad.l + 24, 11);
  ctx.fillStyle = '#ff5e7e'; ctx.fillRect(pad.l + 95, 6, 20, 3); ctx.fillStyle = 'rgba(149,128,184,.8)'; ctx.fillText('Real', pad.l + 119, 11);
}

// ─── PROJETOS VIEW ──────────────────────────────────────────
function renderProjetosView() {
  document.getElementById('badgeProjetos').textContent = state.projetos.length;
  const filtro = document.getElementById('filtroStatusProj').value;
  const grid = document.getElementById('projFullGrid');
  const list = filtro ? state.projetos.filter(p => p.status === filtro) : state.projetos;
  if (!list.length) {
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;padding:3rem"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" style="width:50px;height:50px;margin-bottom:1rem;opacity:.3"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-4 0v2"/></svg><div style="font-size:1rem;font-weight:600;color:var(--texto);margin-bottom:.4rem">Nenhum projeto encontrado</div><div>Clique em "Novo Projeto" para criar um.</div></div>';
    return;
  }
  grid.innerHTML = list.map(p => {
    const mbs = state.membros.filter(m => m.projetos?.includes(p.id));
    const tfs = state.tarefas.filter(t => t.projetoId === p.id);
    const dn  = tfs.filter(t => t.status === 'done').length;
    return `<div class="proj-card">
      <div class="proj-card-header">
        <div><div class="proj-card-name">${p.nome}</div><div class="proj-card-desc">${p.desc || 'Sem descrição'}</div></div>
        <span class="status-dot ${statusMap[p.status][0]}">${statusMap[p.status][1]}</span>
      </div>
      <div class="proj-card-body">
        <div class="proj-card-meta">
          <div class="proj-meta-item"><div class="proj-meta-label">Prazo</div><div class="proj-meta-val">${p.prazoEst || '—'} d</div></div>
          <div class="proj-meta-item"><div class="proj-meta-label">Esforço</div><div class="proj-meta-val">${p.esforcoEst || '—'} h</div></div>
          <div class="proj-meta-item"><div class="proj-meta-label">Tarefas</div><div class="proj-meta-val">${dn}/${tfs.length}</div></div>
          <div class="proj-meta-item"><div class="proj-meta-label">Dias rest.</div><div class="proj-meta-val ${diasCls(p.dias || 0)}">${p.dias || 0}d</div></div>
        </div>
        <div class="mini-bar" style="margin-bottom:.6rem"><div class="bar-track"><div class="bar-fill ${barCls(p.status)}" style="width:${p.prog || 0}%"></div></div><span style="font-size:.78rem;color:var(--texto-dim)">${p.prog || 0}%</span></div>
        ${mbs.length ? `<div class="proj-card-members">${mbs.map(m => `<span class="member-chip">${m.nome} ${m.sob}</span>`).join('')}</div>` : '<div style="font-size:.72rem;color:var(--texto-dim)">Sem membros</div>'}
      </div>
      <div class="proj-card-actions">
        <button class="btn btn-primary btn-sm" onclick="openProjDetalhe(${p.id})">Detalhes</button>
        <button class="btn btn-ghost btn-sm" onclick="openEditProj(${p.id})">Editar</button>
        <button class="btn btn-danger btn-sm" onclick="deleteProj(${p.id})">Excluir</button>
      </div>
    </div>`;
  }).join('');
}
document.getElementById('filtroStatusProj').onchange = () => renderProjetosView();

// ─── TAREFAS VIEW ───────────────────────────────────────────
function renderTarefasView() {
  const sel = document.getElementById('filtroProjetoTarefa');
  const cur = sel.value;
  sel.innerHTML = '<option value="">Todos os projetos</option>' + state.projetos.map(p => `<option value="${p.id}">${p.nome}</option>`).join('');
  sel.value = cur;
  const fp = sel.value;
  const fr = document.getElementById('filtroPrioTarefa').value;
  let tfs = [...state.tarefas];
  if (fp) tfs = tfs.filter(t => String(t.projetoId) === fp);
  if (fr) tfs = tfs.filter(t => t.prio === fr);
  const todo  = tfs.filter(t => t.status === 'todo');
  const doing = tfs.filter(t => t.status === 'doing');
  const done  = tfs.filter(t => t.status === 'done');
  document.getElementById('countTodo').textContent  = todo.length;
  document.getElementById('countDoing').textContent = doing.length;
  document.getElementById('countDone').textContent  = done.length;
  const mkTask = t => {
    const pr = state.projetos.find(p => p.id === t.projetoId);
    const rs = state.membros.find(m => m.id === t.responsavelId);
    return `<div class="task-item" data-tarefa="${t.id}">
      <div class="task-item-title">${t.titulo}</div>
      <div class="task-item-meta"><span>${pr?.nome || '—'}</span><span class="task-prio ${prioCls(t.prio)}">${prioLbl(t.prio)}</span></div>
      <div style="font-size:.7rem;color:var(--texto-dim);margin-top:.3rem">${rs ? rs.nome + ' ' + rs.sob : 'Sem responsável'} · ${t.horas || '?'}h</div>
    </div>`;
  };
  const empty = '<div style="font-size:.78rem;color:var(--texto-dim);text-align:center;padding:1rem">Sem tarefas</div>';
  document.getElementById('colTodo').innerHTML  = todo.length  ? todo.map(mkTask).join('')  : empty;
  document.getElementById('colDoing').innerHTML = doing.length ? doing.map(mkTask).join('') : empty;
  document.getElementById('colDone').innerHTML  = done.length  ? done.map(mkTask).join('')  : empty;
  document.querySelectorAll('.task-item').forEach(el => el.onclick = () => openTarefaDetalhe(+el.dataset.tarefa));
}
document.getElementById('filtroProjetoTarefa').onchange = () => renderTarefasView();
document.getElementById('filtroPrioTarefa').onchange    = () => renderTarefasView();

// ─── MEMBROS VIEW ───────────────────────────────────────────
function memberStatusBadge(m) {
  if (m.status === 'active')   return `<span class="member-status-badge ms-active">✓ Ativo</span>`;
  if (m.status === 'rejected') return `<span class="member-status-badge ms-rejected">✕ Rejeitou</span>`;
  return `<span class="member-status-badge ms-pending">⏳ Convite pendente</span>`;
}

function renderMembrosView() {
  const grid = document.getElementById('membersGrid');
  if (!state.membros.length) {
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;padding:3rem"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" style="width:50px;height:50px;margin-bottom:1rem;opacity:.3"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg><div style="font-size:1rem;font-weight:600;color:var(--texto);margin-bottom:.4rem">Nenhum membro ainda</div><div>Clique em "Adicionar Membro".</div></div>';
    return;
  }
  grid.innerHTML = state.membros.map(m => {
    const pjs = state.projetos.filter(p => m.projetos?.includes(p.id));
    const tfs = state.tarefas.filter(t => t.responsavelId === m.id);
    const rejMsg = m.status === 'rejected' ? `<div class="member-reject-reason"><strong>Motivo:</strong> ${m.rejeicaoMotivo || '—'}${m.rejeicaoDetalhes ? `<br><em>${m.rejeicaoDetalhes}</em>` : ''}</div>` : '';
    return `<div class="member-card ${m.status === 'rejected' ? 'card-rejected' : ''}">
      <div class="member-avatar-big" style="background:${m.color}">${initials(m.nome, m.sob)}</div>
      ${memberStatusBadge(m)}
      <div class="member-fullname">${m.nome} ${m.sob}</div>
      <div class="member-email">${m.email || 'sem e-mail'}</div>
      ${m.matricula ? `<div style="font-size:.7rem;color:var(--texto-dim);margin-bottom:.3rem">Matrícula: <strong style="color:var(--texto)">${m.matricula}</strong></div>` : ''}
      <div class="member-hash-display" title="Hash único do membro">
        <span class="hash-icon">⬡</span>
        <span class="hash-val">${(m.hash||'').slice(0,8)}…</span>
      </div>
      <div class="member-role-badge">${m.role}</div>
      <div class="member-projects">Projetos: <span>${pjs.length}</span> · Tarefas: <span>${tfs.length}</span></div>
      ${rejMsg}
      <div class="member-card-actions">
        ${m.status === 'pending' ? `<button class="btn btn-ghost btn-sm" onclick="resendInvite(${m.id})">✉ Reenviar</button>` : ''}
        <button class="btn btn-ghost btn-sm" onclick="openEditMembro(${m.id})">Editar</button>
        <button class="btn btn-danger btn-sm" onclick="deleteMembro(${m.id})">Excluir</button>
      </div>
    </div>`;
  }).join('');
}

async function resendInvite(id) {
  const m = state.membros.find(x => x.id === id);
  if (!m) return;
  await api.sendInvite(id);
  toast(`Convite reenviado para ${m.nome}!`, 'info');
}

// ─── CRUD PROJETOS ──────────────────────────────────────────
function openModalProj(proj = null) {
  document.getElementById('editProjId').value = proj ? proj.id : '';
  document.getElementById('modalProjTitle').textContent = proj ? '✦ Editar Projeto' : '✦ Novo Projeto';
  document.getElementById('btnSalvarProj').textContent  = proj ? 'Salvar Alterações' : 'Criar Projeto';
  document.getElementById('projNome').value    = proj?.nome || '';
  document.getElementById('projDesc').value    = proj?.desc || '';
  document.getElementById('projCat').value     = proj?.cat || '';
  document.getElementById('projStatus').value  = proj?.status || 'idle';
  document.getElementById('projPrazo').value   = proj?.prazoEst || '';
  document.getElementById('projEsforco').value = proj?.esforcoEst || '';
  document.getElementById('projProg').value    = proj?.prog || '';
  document.getElementById('projDias').value    = proj?.dias || '';
  document.getElementById('previsaoBox').classList.remove('show');
  openModal('modalProj');
}
function openEditProj(id) { openModalProj(state.projetos.find(p => p.id === id)); }
document.getElementById('btnNovoProj').onclick     = () => openModalProj();
document.getElementById('btnNovoProjView').onclick = () => openModalProj();

['projCat', 'projPrazo', 'projEsforco'].forEach(id => {
  const el = document.getElementById(id);
  if (el) { el.addEventListener('input', calcPrevisao); el.addEventListener('change', calcPrevisao); }
});
function calcPrevisao() {
  const prazo = parseFloat(document.getElementById('projPrazo').value);
  const esf   = parseFloat(document.getElementById('projEsforco').value);
  const cat   = document.getElementById('projCat').value;
  const box   = document.getElementById('previsaoBox');
  if (!prazo || !esf || !cat) { box.classList.remove('show'); return; }
  const h = historicoBase[cat]; if (!h) { box.classList.remove('show'); return; }
  const pR   = Math.round(prazo * (1 + h.prazoDesvio));
  const eR   = Math.round(esf * (1 + h.esfDesvio));
  const rPct = Math.round((h.prazoDesvio + h.esfDesvio) / 2 * 100);
  const rLbl = rPct >= 18 ? '🔴 Alto' : rPct >= 12 ? '🟡 Médio' : '🟢 Baixo';
  document.getElementById('prevPrazo').textContent = `${pR} dias (era ${prazo}d)`;
  document.getElementById('prevEsf').textContent   = `${eR}h estimado`;
  document.getElementById('prevRisco').textContent = `${rLbl} (${rPct}%)`;
  document.getElementById('prevConf').textContent  = `${h.confianca}% (base histórica)`;
  box.classList.add('show');
}

document.getElementById('btnSalvarProj').onclick = async () => {
  const nome = document.getElementById('projNome').value.trim();
  if (!nome) { document.getElementById('projNome').focus(); toast('Informe o nome do projeto', 'error'); return; }
  const eid = document.getElementById('editProjId').value;
  const d = {
    nome, desc: document.getElementById('projDesc').value.trim(),
    cat:    document.getElementById('projCat').value,
    status: document.getElementById('projStatus').value,
    prazoEst:   parseFloat(document.getElementById('projPrazo').value)   || 0,
    esforcoEst: parseFloat(document.getElementById('projEsforco').value) || 0,
    prog: parseInt(document.getElementById('projProg').value) || 0,
    dias: parseInt(document.getElementById('projDias').value) || 0,
  };
  if (eid) {
    await api.updateProjeto(+eid, d);
    addLog(`Projeto editado — ${nome}`, 'Alterações salvas', 'ok');
    toast(`"${nome}" atualizado!`);
  } else {
    await api.createProjeto(d);
    addLog(`Novo projeto criado — ${nome}`, `Categoria: ${d.cat || '—'}`, 'proj');
    toast(`Projeto "${nome}" criado!`);
  }
  document.getElementById('badgeProjetos').textContent = state.projetos.length;
  save(); closeModal('modalProj'); renderView(currentView);
};

function deleteProj(id) {
  const p = state.projetos.find(x => x.id === id);
  confirmDlg('Excluir Projeto', `Excluir o projeto <strong>${p?.nome}</strong>? As tarefas associadas também serão removidas.`, async () => {
    await api.deleteProjeto(id);
    addLog(`Projeto excluído — ${p?.nome}`, '', 'del');
    toast(`"${p?.nome}" excluído.`, 'warning');
    document.getElementById('badgeProjetos').textContent = state.projetos.length;
    save(); renderView(currentView);
  });
}

// ─── DETALHE PROJETO ────────────────────────────────────────
function openProjDetalhe(id) {
  const p = state.projetos.find(x => x.id === id); if (!p) return;
  currentProjId = id;
  document.getElementById('detProjNome').textContent = p.nome;
  const h = p.cat ? historicoBase[p.cat] : null;
  document.getElementById('detProjInfo').innerHTML = `
    <b>Descrição:</b> ${p.desc || '—'}<br>
    <b>Status:</b> ${statusMap[p.status][1]}<br>
    <b>Categoria:</b> ${p.cat || '—'}<br>
    <b>Prazo estimado:</b> ${p.prazoEst || '—'} dias — <b>Dias restantes:</b> ${p.dias || 0}d<br>
    <b>Esforço estimado:</b> ${p.esforcoEst || '—'} h — <b>Progresso:</b> ${p.prog || 0}%
    ${h ? `<br><b>Desvio histórico esperado:</b> +${Math.round(h.prazoDesvio * 100)}% no prazo` : ''}`;
  const mbs = state.membros.filter(m => m.projetos?.includes(id));
  document.getElementById('detProjMembros').innerHTML = mbs.length
    ? mbs.map(m => `<div class="dm-item"><div class="dm-avatar" style="background:${m.color}">${initials(m.nome, m.sob)}</div><span class="dm-name">${m.nome} ${m.sob}</span><span class="dm-role">${m.role}</span><button class="btn btn-danger btn-sm" onclick="removeMembroProj(${m.id},${id})">✕</button></div>`).join('')
    : '<div style="color:var(--texto-dim);font-size:.82rem">Nenhum membro neste projeto.</div>';
  const addSel = document.getElementById('addMembroProj');
  const sem = state.membros.filter(m => !m.projetos?.includes(id) && m.status === 'active');
  addSel.innerHTML = '<option value="">+ Adicionar membro...</option>' + sem.map(m => `<option value="${m.id}">${m.nome} ${m.sob} — ${m.role}</option>`).join('');
  const tfs = state.tarefas.filter(t => t.projetoId === id);
  document.getElementById('detProjTarefas').innerHTML = tfs.length
    ? `<div style="display:flex;flex-direction:column;gap:.4rem">${tfs.map(t => {
        const rs = state.membros.find(m => m.id === t.responsavelId);
        return `<div style="display:flex;justify-content:space-between;align-items:center;padding:.45rem .6rem;background:rgba(87,16,209,.1);border-radius:8px"><span style="color:var(--texto)">${t.titulo}</span><div style="display:flex;gap:.5rem;align-items:center">${rs ? `<span style="font-size:.7rem;color:var(--texto-dim)">${rs.nome}</span>` : ''}<span class="task-prio ${prioCls(t.prio)}">${prioLbl(t.prio)}</span></div></div>`;
      }).join('')}</div>`
    : '<div style="color:var(--texto-dim);font-size:.82rem">Nenhuma tarefa.</div>';
  openModal('modalDetalheProj');
}

document.getElementById('btnAddMembroProj').onclick = () => {
  const sel = document.getElementById('addMembroProj');
  const mid = +sel.value; if (!mid || !currentProjId) return;
  const m = state.membros.find(x => x.id === mid); if (!m) return;
  if (!m.projetos) m.projetos = [];
  m.projetos.push(currentProjId);
  addLog(`${m.nome} ${m.sob} adicionado ao projeto`, state.projetos.find(p => p.id === currentProjId)?.nome || '', 'membro');
  toast(`${m.nome} adicionado ao projeto!`);
  save(); openProjDetalhe(currentProjId); renderView(currentView);
};
function removeMembroProj(mid, pid) {
  const m = state.membros.find(x => x.id === mid); if (!m) return;
  m.projetos = (m.projetos || []).filter(p => p !== pid);
  toast(`${m.nome} removido do projeto.`, 'warning');
  save(); openProjDetalhe(pid); renderView(currentView);
}
document.getElementById('btnDelProj').onclick    = () => { closeModal('modalDetalheProj'); deleteProj(currentProjId); };
document.getElementById('btnEditarProj').onclick = () => { closeModal('modalDetalheProj'); openEditProj(currentProjId); };

// ─── CRUD TAREFAS ───────────────────────────────────────────
function openModalTarefa(tarefa = null) {
  document.getElementById('editTarefaId').value      = tarefa ? tarefa.id : '';
  document.getElementById('modalTarefaTitle').textContent = tarefa ? '✦ Editar Tarefa' : '✦ Nova Tarefa';
  document.getElementById('btnSalvarTarefa').textContent  = tarefa ? 'Salvar' : 'Criar Tarefa';
  document.getElementById('tarefaTitulo').value   = tarefa?.titulo || '';
  document.getElementById('tarefaPrio').value     = tarefa?.prio || 'media';
  document.getElementById('tarefaStatus').value   = tarefa?.status || 'todo';
  document.getElementById('tarefaHoras').value    = tarefa?.horas || '';
  const ps = document.getElementById('tarefaProjeto');
  ps.innerHTML = '<option value="">Selecionar...</option>' + state.projetos.map(p => `<option value="${p.id}">${p.nome}</option>`).join('');
  ps.value = tarefa?.projetoId || '';
  const rs = document.getElementById('tarefaResponsavel');
  rs.innerHTML = '<option value="">Nenhum</option>' + state.membros.filter(m => m.status === 'active').map(m => `<option value="${m.id}">${m.nome} ${m.sob}</option>`).join('');
  rs.value = tarefa?.responsavelId || '';
  openModal('modalTarefa');
}
document.getElementById('btnNovaTarefa').onclick = () => openModalTarefa();

document.getElementById('btnSalvarTarefa').onclick = async () => {
  const titulo = document.getElementById('tarefaTitulo').value.trim();
  if (!titulo) { document.getElementById('tarefaTitulo').focus(); toast('Informe o título', 'error'); return; }
  const eid = document.getElementById('editTarefaId').value;
  const d = {
    titulo,
    projetoId:     +document.getElementById('tarefaProjeto').value    || null,
    responsavelId: +document.getElementById('tarefaResponsavel').value || null,
    prio:   document.getElementById('tarefaPrio').value,
    status: document.getElementById('tarefaStatus').value,
    horas:  parseFloat(document.getElementById('tarefaHoras').value) || 0,
  };
  if (eid) {
    await api.updateTarefa(+eid, d);
    toast(`Tarefa "${titulo}" atualizada!`);
  } else {
    await api.createTarefa(d);
    addLog(`Nova tarefa — ${titulo}`, state.projetos.find(p => p.id === d.projetoId)?.nome || '', 'tarefa');
    toast(`Tarefa "${titulo}" criada!`);
  }
  save(); closeModal('modalTarefa'); renderView(currentView);
};

// ─── DETALHE TAREFA ─────────────────────────────────────────
function openTarefaDetalhe(id) {
  const t = state.tarefas.find(x => x.id === id); if (!t) return;
  currentTarefaId = id;
  document.getElementById('detTarefaTitulo').textContent = t.titulo;
  const pr = state.projetos.find(p => p.id === t.projetoId);
  const rs = state.membros.find(m => m.id === t.responsavelId);
  document.getElementById('detTarefaInfo').innerHTML = `
    <b>Projeto:</b> ${pr?.nome || '—'}<br>
    <b>Prioridade:</b> ${prioLbl(t.prio)}<br>
    <b>Status:</b> ${statusLbl(t.status)}<br>
    <b>Responsável:</b> ${rs ? rs.nome + ' ' + rs.sob : '—'}<br>
    <b>Estimativa:</b> ${t.horas || '—'}h`;
  document.getElementById('moverTarefaStatus').value = t.status;
  openModal('modalDetalheTarefa');
}
document.getElementById('btnMoverTarefa').onclick = async () => {
  const t = state.tarefas.find(x => x.id === currentTarefaId); if (!t) return;
  const ns = document.getElementById('moverTarefaStatus').value;
  await api.updateTarefa(currentTarefaId, { status: ns });
  if (ns === 'done') addLog(`Tarefa concluída — ${t.titulo}`, state.projetos.find(p => p.id === t.projetoId)?.nome || '', 'tarefa');
  toast(`Tarefa movida para "${statusLbl(ns)}"`);
  save(); closeModal('modalDetalheTarefa'); renderView(currentView);
};
document.getElementById('btnDelTarefa').onclick = () => {
  const t = state.tarefas.find(x => x.id === currentTarefaId);
  confirmDlg('Excluir Tarefa', `Excluir <strong>${t?.titulo}</strong>?`, async () => {
    await api.deleteTarefa(currentTarefaId);
    addLog(`Tarefa excluída — ${t?.titulo}`, '', 'del');
    toast('Tarefa excluída.', 'warning');
    save(); closeModal('modalDetalheTarefa'); renderView(currentView);
  });
};

// ─── CRUD MEMBROS ───────────────────────────────────────────
function openModalMembro(membro = null) {
  document.getElementById('editMembroId').value = membro ? membro.id : '';
  document.getElementById('modalMembroTitle').textContent = membro ? '✦ Editar Membro' : '✦ Adicionar Membro';
  document.getElementById('btnSalvarMembro').textContent  = membro ? 'Salvar' : 'Adicionar & Convidar';
  document.getElementById('membroNome').value     = membro?.nome || '';
  document.getElementById('membroSob').value      = membro?.sob || '';
  document.getElementById('membroEmail').value    = membro?.email || '';
  document.getElementById('membroMatricula').value = membro?.matricula || '';
  document.getElementById('membroRole').value     = membro?.role || 'Dev Frontend';
  document.getElementById('membroColor').value    = membro?.color || 'linear-gradient(135deg,#8b00e8,#5710d1)';

  // show hash if editing
  const hashGroup = document.getElementById('membroHashGroup');
  if (membro) {
    hashGroup.style.display = '';
    document.getElementById('membroHashDisplay').textContent = membro.hash || '—';
  } else {
    hashGroup.style.display = 'none';
  }
  openModal('modalMembro');
}
function openEditMembro(id) { openModalMembro(state.membros.find(m => m.id === id)); }
document.getElementById('btnNovoMembro').onclick = () => openModalMembro();

document.getElementById('btnSalvarMembro').onclick = async () => {
  const nome = document.getElementById('membroNome').value.trim();
  const sob  = document.getElementById('membroSob').value.trim();
  if (!nome) { document.getElementById('membroNome').focus(); toast('Informe o nome', 'error'); return; }
  const eid = document.getElementById('editMembroId').value;
  const d = {
    nome, sob,
    email:      document.getElementById('membroEmail').value.trim(),
    matricula:  document.getElementById('membroMatricula').value.trim(),
    role:       document.getElementById('membroRole').value,
    color:      document.getElementById('membroColor').value,
  };
  if (eid) {
    await api.updateMembro(+eid, d);
    toast(`${nome} ${sob} atualizado!`);
  } else {
    const m = await api.createMembro(d);
    addLog(`Novo membro convidado — ${nome} ${sob}`, d.role, 'invite');
    addNotif(`Convite enviado — ${nome} ${sob}`, `Hash: ${m.hash.slice(0, 8)}…`, 'invite');
    // Simulate invite popup after slight delay
    setTimeout(() => simulateInvitePopup(m.id), 800);
    toast(`Convite enviado para ${nome}!`, 'info');
  }
  save(); closeModal('modalMembro'); renderView(currentView);
};

function deleteMembro(id) {
  const m = state.membros.find(x => x.id === id);
  confirmDlg('Excluir Membro', `Remover <strong>${m?.nome} ${m?.sob}</strong> da equipe?`, async () => {
    await api.deleteMembro(id);
    addLog(`Membro removido — ${m?.nome} ${m?.sob}`, '', 'del');
    toast(`${m?.nome} removido.`, 'warning');
    save(); renderView(currentView);
  });
}

// ─── INVITE POPUP (simulated — wire to real push/email in API) ─
function simulateInvitePopup(membroId) {
  const m = state.membros.find(x => x.id === membroId);
  if (!m) return;

  // Open invite modal with member data
  document.getElementById('inviteMembroNome').textContent  = `${m.nome} ${m.sob}`;
  document.getElementById('inviteMembroRole').textContent  = m.role;
  document.getElementById('inviteMembroHash').textContent  = m.hash;
  document.getElementById('inviteMembroEmail').textContent = m.email || '—';

  // store which member we're simulating invite for
  document.getElementById('modalInvite').dataset.membroId = membroId;

  openModal('modalInvite');
}

// Accept invite
document.getElementById('btnAceitarConvite')?.addEventListener('click', async () => {
  const mid = +document.getElementById('modalInvite').dataset.membroId;
  const m = state.membros.find(x => x.id === mid); if (!m) return;

  await api.acceptInvite(m.hash);
  addLog(`${m.nome} ${m.sob} aceitou o convite`, m.role, 'ok');
  addNotif(`✓ ${m.nome} ${m.sob} aceitou o convite!`, `Cargo: ${m.role}`, 'accept');
  toast(`${m.nome} aceitou o convite!`, 'success');
  closeModal('modalInvite');
  save(); renderView(currentView);
  if (currentView === 'dashboard') renderKPIs();
});

// Open reject reason form
document.getElementById('btnRecusarConvite')?.addEventListener('click', () => {
  document.getElementById('inviteAcceptSection').style.display = 'none';
  document.getElementById('inviteRejectSection').style.display = '';
});

// Cancel reject — go back
document.getElementById('btnCancelarRecusa')?.addEventListener('click', () => {
  document.getElementById('inviteAcceptSection').style.display = '';
  document.getElementById('inviteRejectSection').style.display = 'none';
});

// Submit rejection
document.getElementById('btnConfirmarRecusa')?.addEventListener('click', async () => {
  const mid     = +document.getElementById('modalInvite').dataset.membroId;
  const motivo  = document.getElementById('recusaMotivo').value;
  const detalhes = document.getElementById('recusaDetalhes').value.trim();

  if (!motivo) { toast('Selecione o motivo', 'error'); return; }

  const m = state.membros.find(x => x.id === mid); if (!m) return;
  await api.rejectInvite(m.hash, motivo, detalhes);

  addLog(`${m.nome} ${m.sob} recusou o convite`, `Motivo: ${motivo}`, 'warn');
  // Notify the manager
  addNotif(
    `⚠ ${m.nome} ${m.sob} recusou o convite`,
    `Motivo: ${motivo}${detalhes ? ' — ' + detalhes : ''}`,
    'reject'
  );
  toast(`${m.nome} recusou. Gerente notificado.`, 'warning');
  closeModal('modalInvite');
  // reset reject section
  document.getElementById('inviteAcceptSection').style.display = '';
  document.getElementById('inviteRejectSection').style.display = 'none';
  document.getElementById('recusaMotivo').value = '';
  document.getElementById('recusaDetalhes').value = '';
  save(); renderView(currentView);
});

// ─── MARK ALL READ ──────────────────────────────────────────
document.getElementById('btnMarkAllRead')?.addEventListener('click', async () => {
  await api.markAllRead();
  updateNotifBadge();
  renderNotifPanel();
  save();
  toast('Todas as notificações marcadas como lidas', 'info');
});

// ─── DATE ───────────────────────────────────────────────────
function updateDate() {
  const now = new Date();
  const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  document.getElementById('topbarDate').textContent = meses[now.getMonth()] + ' ' + now.getFullYear();
}

// ─── BACKGROUND WAVES ───────────────────────────────────────
(function waves() {
  const cv = document.getElementById('bg-canvas');
  const cx = cv.getContext('2d');
  function res() { cv.width = window.innerWidth; cv.height = window.innerHeight; }
  res(); window.addEventListener('resize', res);
  const ws = [
    { a: 40, f: .010, sp: .016, ph: 0,   color: 'rgba(87,16,209,.6)',    y: .28 },
    { a: 28, f: .016, sp: .022, ph: 1.4,  color: 'rgba(160,80,255,.4)',  y: .45 },
    { a: 50, f: .008, sp: .011, ph: 2.6,  color: 'rgba(50,0,130,.55)',   y: .60 },
    { a: 22, f: .020, sp: .030, ph: .8,   color: 'rgba(192,120,255,.25)',y: .74 },
    { a: 38, f: .006, sp: .008, ph: 3.6,  color: 'rgba(75,8,160,.45)',   y: .88 },
  ];
  let t = 0;
  function draw() {
    cx.clearRect(0, 0, cv.width, cv.height);
    ws.forEach(w => {
      cx.beginPath();
      const by = cv.height * w.y;
      cx.moveTo(0, by);
      for (let x = 0; x <= cv.width; x += 3) {
        const y = by + Math.sin(x * w.f + t * w.sp + w.ph) * w.a + Math.sin(x * w.f * 1.8 + t * w.sp * .5 + w.ph) * (w.a * .35);
        cx.lineTo(x, y);
      }
      cx.lineTo(cv.width, cv.height); cx.lineTo(0, cv.height); cx.closePath();
      const g = cx.createLinearGradient(0, by - w.a, 0, by + w.a * 2);
      g.addColorStop(0, w.color); g.addColorStop(1, 'transparent');
      cx.fillStyle = g; cx.fill();
    });
    t++; requestAnimationFrame(draw);
  }
  draw();
})();

// ─── INIT ───────────────────────────────────────────────────
load();
updateDate();
renderProfileChip();
updateNotifBadge();
renderView('dashboard');
document.getElementById('badgeProjetos').textContent = state.projetos.length;