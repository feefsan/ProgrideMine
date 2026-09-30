import { PHASES, app,
         parseBullets,
         toggleProgress,
         addCustomItem, updateItem, removeCustomItem,
         persistOrder, resetProgress } from './state.js';
import { renderAll, updateUI, getTimelineEl, setSyncStatus } from './ui.js';
import { loadLocal, loadRemote, loadPublic, persist, hasAnyData, onSyncStatusChange, setReadOnly, setPublicState } from './storage.js';
import { getSession, signIn, signOut, isEnabled } from './supabase.js';

const timelineEl = getTimelineEl();
const accessGate = document.getElementById('accessGate');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const guestButton = document.getElementById('guestButton');
const accountActions = document.getElementById('accountActions');
const accessMode = document.getElementById('accessMode');
const btnLogin = document.getElementById('btnLogin');
const btnLogout = document.getElementById('btnLogout');
const publicControl = document.getElementById('publicControl');
const publicToggle = document.getElementById('publicToggle');

function applyState(data = {}) {
  app.progress = data.progress || {};
  app.custom = data.custom || {};
  app.order = data.order || {};
  app.overrides = data.overrides || {};
  app.isPublic = Boolean(data.isPublic);
}
function showApp(readOnly, modeText) {
  app.readOnly = readOnly; setReadOnly(readOnly);
  document.body.classList.remove('auth-pending');
  document.body.classList.toggle('read-only', readOnly);
  accessGate.hidden = true; accountActions.hidden = false;
  accessMode.textContent = modeText;
  btnLogin.hidden = !readOnly; btnLogout.hidden = readOnly;
  publicControl.hidden = readOnly; publicToggle.checked = app.isPublic;
  renderAll(); setSyncStatus(readOnly ? 'readonly' : 'synced');
}
function showGate(message = '') {
  accessGate.hidden = false; document.body.classList.add('auth-pending');
  loginError.hidden = !message; loginError.textContent = message;
}
async function enterGuest() {
  try {
    setSyncStatus('saving');
    const remote = await loadPublic();
    applyState(remote || {});
    showApp(true, 'Visitante');
    if (!remote) setSyncStatus('readonly');
  } catch (err) {
    console.warn('[guest] load failed:', err);
    applyState({}); showApp(true, 'Visitante'); setSyncStatus('error');
  }
}
async function enterOwner() {
  const remote = await loadRemote();
  if (remote) applyState(remote);
  else {
    const local = loadLocal(); applyState(local);
    if (hasAnyData(local)) persist(app);
  }
  showApp(false, 'Autenticado');
}


/* =========================================================
   Drag & Drop
   ========================================================= */
let dragState = null;

function clearDropIndicators() {
  timelineEl.querySelectorAll('.drop-before, .drop-after').forEach(el => {
    el.classList.remove('drop-before', 'drop-after');
  });
}

timelineEl.addEventListener('dragstart', (e) => {
  if (app.readOnly) { e.preventDefault(); return; }
  const handle = e.target.closest('.drag-handle');
  if (!handle) { e.preventDefault(); return; }

  const li = handle.closest('.task');
  if (!li) return;
  const cb = li.querySelector('input[type="checkbox"]');
  const phaseEl = li.closest('.phase');
  if (!cb || !phaseEl) return;

  dragState = { id: cb.dataset.id, phaseId: phaseEl.dataset.phase, li };

  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', dragState.id);
  try { e.dataTransfer.setDragImage(li, 30, 18); } catch {}

  setTimeout(() => li.classList.add('dragging'), 0);
});

timelineEl.addEventListener('dragover', (e) => {
  if (!dragState) return;
  const targetLi = e.target.closest('.task');
  if (!targetLi || targetLi === dragState.li) { clearDropIndicators(); return; }
  const targetPhase = targetLi.closest('.phase');
  if (!targetPhase || targetPhase.dataset.phase !== dragState.phaseId) {
    clearDropIndicators(); return;
  }
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const rect = targetLi.getBoundingClientRect();
  const before = e.clientY < rect.top + rect.height / 2;
  clearDropIndicators();
  targetLi.classList.add(before ? 'drop-before' : 'drop-after');
});

timelineEl.addEventListener('dragleave', (e) => {
  if (!dragState) return;
  const related = e.relatedTarget;
  if (!related || !timelineEl.contains(related)) clearDropIndicators();
});

timelineEl.addEventListener('drop', (e) => {
  if (!dragState) return;
  const targetLi = e.target.closest('.task');
  if (!targetLi || targetLi === dragState.li) { clearDropIndicators(); return; }
  const targetPhase = targetLi.closest('.phase');
  if (!targetPhase || targetPhase.dataset.phase !== dragState.phaseId) {
    clearDropIndicators(); return;
  }
  e.preventDefault();
  const rect = targetLi.getBoundingClientRect();
  const before = e.clientY < rect.top + rect.height / 2;
  const targetId = targetLi.querySelector('input[type="checkbox"]').dataset.id;
  reorderItems(dragState.phaseId, dragState.id, targetId, before);
  clearDropIndicators();
  if (dragState.li) dragState.li.classList.remove('dragging');
  dragState = null;
});

timelineEl.addEventListener('dragend', () => {
  if (dragState?.li) dragState.li.classList.remove('dragging');
  clearDropIndicators();
  dragState = null;
});

function reorderItems(phaseId, draggedId, targetId, insertBefore) {
  const phaseEl = timelineEl.querySelector(`.phase[data-phase="${CSS.escape(phaseId)}"]`);
  const tasksUl = phaseEl?.querySelector('.tasks');
  if (!tasksUl) return;

  const taskEls = [...tasksUl.querySelectorAll('.task')];
  const idToEl = new Map();
  const ids = [];
  taskEls.forEach(t => {
    const id = t.querySelector('input[type="checkbox"]').dataset.id;
    idToEl.set(id, t); ids.push(id);
  });

  const fromIdx = ids.indexOf(draggedId);
  if (fromIdx === -1) return;
  ids.splice(fromIdx, 1);

  let toIdx = ids.indexOf(targetId);
  if (toIdx === -1) return;
  if (!insertBefore) toIdx += 1;

  ids.splice(toIdx, 0, draggedId);
  ids.forEach(id => tasksUl.appendChild(idToEl.get(id)));
  persistOrder(phaseId, ids);
}

/* =========================================================
   Abrir / fechar formulários
   ========================================================= */
function openEditForm(id) {
  app.editingId = id; app.addingPhaseId = null;
  renderAll();
  requestAnimationFrame(() => {
    const form = timelineEl.querySelector(`form[data-edit="${CSS.escape(id)}"]`);
    form?.querySelector('input[name="title"]')?.focus({ preventScroll: true });
    const ta = form?.querySelector('textarea');
    if (ta) ta.setSelectionRange(ta.value.length, ta.value.length);
  });
}

function openAddForm(phaseId) {
  app.addingPhaseId = phaseId; app.editingId = null;
  renderAll();
  requestAnimationFrame(() => {
    const input = timelineEl.querySelector(`form[data-add="${CSS.escape(phaseId)}"] input[name="title"]`);
    input?.focus({ preventScroll: true });
    input?.closest('.add-wrap')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
}

function closeForms() {
  app.editingId = null; app.addingPhaseId = null;
  renderAll();
}

/* =========================================================
   Eventos
   ========================================================= */
timelineEl.addEventListener('change', (e) => {
  if (app.readOnly) return;
  const cb = e.target.closest('input[type="checkbox"]');
  if (!cb) return;
  toggleProgress(cb.dataset.id, cb.checked);
  updateUI();
});

timelineEl.addEventListener('click', (e) => {
  if (app.readOnly) return;
  const addBtn = e.target.closest('.btn-add-icon');
  if (addBtn) { e.preventDefault(); openAddForm(addBtn.dataset.add); return; }

  const editBtn = e.target.closest('.btn-edit');
  if (editBtn) { e.preventDefault(); e.stopPropagation(); openEditForm(editBtn.dataset.edit); return; }

  if (e.target.closest('.btn-cancel')) { e.preventDefault(); closeForms(); return; }

  const delBtn = e.target.closest('.btn-del');
  if (delBtn) {
    e.preventDefault(); e.stopPropagation();
    if (!window.confirm('Remover este objetivo personalizado?')) return;
    removeCustomItem(delBtn.dataset.del);
    renderAll();
  }
});

timelineEl.addEventListener('submit', (e) => {
  if (app.readOnly) { e.preventDefault(); return; }
  const form = e.target.closest('.mini-form');
  if (!form) return;
  e.preventDefault();

  const title   = form.querySelector('input[name="title"]').value.trim();
  const rawText = form.querySelector('textarea[name="text"]').value;
  if (!title) { form.querySelector('input[name="title"]').focus(); return; }

  const { text, subs } = parseBullets(rawText);

  if (form.dataset.edit) {
    updateItem(form.dataset.edit, { title, text, subs });
    app.editingId = null;
    renderAll();
    return;
  }

  if (form.dataset.add) {
    const id = addCustomItem(form.dataset.add, { title, text, subs });
    app.addingPhaseId = null;
    renderAll();
    requestAnimationFrame(() => {
      timelineEl.querySelector(`input[data-id="${CSS.escape(id)}"]`)
        ?.closest('.task-label')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && (app.editingId || app.addingPhaseId)) closeForms();
});

document.getElementById('btnReset').addEventListener('click', () => {
  if (app.readOnly) return;
  const ok = window.confirm(
    'Apagar TODO o progresso marcado?\n\n' +
    'Objetivos personalizados, edições e ordem das listas NÃO são apagados.'
  );
  if (!ok) return;
  resetProgress();
  renderAll();
});

/* =========================================================
   Bootstrap
   ========================================================= */
async function bootstrap() {
  if (!isEnabled()) {
    showGate('Configure a URL e a chave pública do Supabase em js/config.js.');
    return;
  }
  onSyncStatusChange(setSyncStatus);
  try {
    const session = await getSession();
    if (session?.user) return await enterOwner();
    showGate();
  } catch (err) {
    console.warn('[bootstrap] failed:', err);
    showGate('Não foi possível conectar ao Supabase.');
  }
}
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault(); loginError.hidden = true;
  const button = loginForm.querySelector('button[type="submit"]');
  button.disabled = true; button.textContent = 'Entrando…';
  try {
    await signIn(document.getElementById('loginEmail').value.trim(), document.getElementById('loginPassword').value);
    await enterOwner();
  } catch (err) {
    showGate(err.message === 'Invalid login credentials' ? 'E-mail ou senha inválidos.' : err.message);
  } finally { button.disabled = false; button.textContent = 'Entrar'; }
});
guestButton.addEventListener('click', enterGuest);
btnLogin.addEventListener('click', () => showGate());
btnLogout.addEventListener('click', async () => { await signOut(); showGate(); });
publicToggle.addEventListener('change', async () => {
  publicToggle.disabled = true;
  try { app.isPublic = await setPublicState(publicToggle.checked); }
  catch (err) { publicToggle.checked = app.isPublic; window.alert('Não foi possível alterar a visibilidade.'); }
  finally { publicToggle.disabled = false; }
});
bootstrap();