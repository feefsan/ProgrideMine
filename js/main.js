import { PHASES, app,
         parseBullets,
         toggleProgress,
         addCustomItem, updateItem, removeCustomItem,
         persistOrder, resetProgress, syncSharedJourneyToApp, hydrateLegacyPhaseData } from './state.js';
import { renderAll, updateUI, getTimelineEl, setSyncStatus } from './ui.js?v=20261001-1';
import { onSyncStatusChange, setReadOnly } from './storage.js';
import { getSession, signIn, signOut, isEnabled } from './supabase.js';
import {
  addJourneyMember, createSharedJourney, createJourneyPhase, getAvailableJourneyMembers,
  getJourneyMembers, listPublicJourneys, listUserJourneys, loadSharedJourney,
  removeJourneyMember, setSharedJourneyPublicState,
  setDefaultJourney, updateJourneyPhase,
} from './journeys.js?v=20261001-2';

const timelineEl = getTimelineEl();
const accessGate = document.getElementById('accessGate');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const guestButton = document.getElementById('guestButton');
const accountActions = document.getElementById('accountActions');
const accessMode = document.getElementById('accessMode');
const btnLogin = document.getElementById('btnLogin');
const btnLogout = document.getElementById('btnLogout');
const journeysMenu = document.getElementById('journeysMenu');
const journeysTrigger = document.getElementById('journeysTrigger');
const journeysDropdown = document.getElementById('journeysDropdown');
const journeysBackdrop = document.getElementById('journeysBackdrop');
const btnSelectJourney = document.getElementById('btnSelectJourney');
const btnCreateJourney = document.getElementById('btnCreateJourney');
const btnToggleJourneyVisibility = document.getElementById('btnToggleJourneyVisibility');
const btnManageMembers = document.getElementById('btnManageMembers');
const membersDialog = document.getElementById('membersDialog');
const btnCloseMembersDialog = document.getElementById('btnCloseMembersDialog');
const memberAddForm = document.getElementById('memberAddForm');
const memberSelect = document.getElementById('memberSelect');
const btnAddMember = document.getElementById('btnAddMember');
const membersList = document.getElementById('membersList');
const membersFeedback = document.getElementById('membersFeedback');
const createJourneyDialog = document.getElementById('createJourneyDialog');
const createJourneyForm = document.getElementById('createJourneyForm');
const createJourneyTitle = document.getElementById('createJourneyTitle');
const createJourneyFeedback = document.getElementById('createJourneyFeedback');
const btnCloseCreateJourneyDialog = document.getElementById('btnCloseCreateJourneyDialog');
const btnCancelCreateJourney = document.getElementById('btnCancelCreateJourney');
const btnConfirmCreateJourney = document.getElementById('btnConfirmCreateJourney');
const selectJourneyDialog = document.getElementById('selectJourneyDialog');
const journeyPickerList = document.getElementById('journeyPickerList');
const btnCloseSelectJourneyDialog = document.getElementById('btnCloseSelectJourneyDialog');
const publicJourneyDialog = document.getElementById('publicJourneyDialog');
const publicJourneyPickerList = document.getElementById('publicJourneyPickerList');
const btnClosePublicJourneyDialog = document.getElementById('btnClosePublicJourneyDialog');
let draggedJourneyItem = null;

function closeJourneysMenu() {
  if (!journeysDropdown || !journeysTrigger) return;
  journeysDropdown.hidden = true;
  if (journeysBackdrop) journeysBackdrop.hidden = true;
  journeysTrigger.setAttribute('aria-expanded', 'false');
}
function toggleJourneysMenu() {
  if (!journeysDropdown || !journeysTrigger) return;
  const shouldOpen = journeysDropdown.hidden;
  journeysDropdown.hidden = !shouldOpen;
  if (journeysBackdrop) journeysBackdrop.hidden = !shouldOpen;
  journeysTrigger.setAttribute('aria-expanded', String(shouldOpen));
}
function updateJourneyVisibilityOption() {
  if (!btnToggleJourneyVisibility) return;
  const available = !app.readOnly && app.isSharedJourney && Boolean(app.journeyId);
  btnToggleJourneyVisibility.hidden = !available;
  btnToggleJourneyVisibility.textContent = app.isPublic
    ? 'Tornar jornada privada'
    : 'Tornar jornada pública';
}
function updateManageMembersOption() {
  if (!btnManageMembers) return;
  btnManageMembers.hidden = !(!app.readOnly && app.isSharedJourney && Boolean(app.journeyId));
}
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[character]));
}
function setMembersFeedback(message = '', type = 'error') {
  membersFeedback.hidden = !message;
  membersFeedback.textContent = message;
  membersFeedback.dataset.type = message ? type : '';
}
function setCreateJourneyFeedback(message = '') {
  createJourneyFeedback.hidden = !message;
  createJourneyFeedback.textContent = message;
}
async function refreshMembersDialog() {
  if (!app.journeyId) return;
  const [members, availableMembers] = await Promise.all([
    getJourneyMembers(app.journeyId),
    getAvailableJourneyMembers(app.journeyId),
  ]);

  membersList.innerHTML = members.map((member) => {
    const isOwner = member.role === 'owner';
    return `
      <li class="member-row">
        <span class="member-name">${escapeHTML(member.display_name || 'Usuário')}</span>
        <span class="member-role">${isOwner ? 'Proprietário' : 'Editor'}</span>
        ${isOwner ? '' : `<button class="member-remove" type="button" data-remove-member="${member.user_id}">Remover</button>`}
      </li>
    `;
  }).join('') || '<li class="members-empty">Nenhum membro encontrado.</li>';

  memberSelect.innerHTML = availableMembers.length
    ? `<option value="">Selecione um usuário</option>${availableMembers.map((member) => `
        <option value="${member.user_id}">${escapeHTML(member.display_name || 'Usuário')}</option>
      `).join('')}`
    : '<option value="">Não há usuários disponíveis para adicionar</option>';
  memberSelect.disabled = availableMembers.length === 0;
  btnAddMember.disabled = availableMembers.length === 0;
  return members;
}
async function openMembersDialog() {
  if (!app.isSharedJourney || !app.journeyId) return;
  closeJourneysMenu();
  try {
    setMembersFeedback();
    await refreshMembersDialog();
    membersDialog.showModal();
  } catch (err) {
    console.error('[journey] load members failed:', err);
    window.alert(err?.message || 'Não foi possível carregar os membros da jornada.');
  }
}
function closeMembersDialog() {
  if (membersDialog?.open) membersDialog.close();
}
function showApp(readOnly, modeText) {
  app.readOnly = readOnly; setReadOnly(readOnly);
  document.body.classList.remove('auth-pending');
  document.body.classList.toggle('read-only', readOnly);
  accessGate.hidden = true; accountActions.hidden = false;
  accessMode.textContent = modeText;
  btnLogin.hidden = !readOnly; btnLogout.hidden = readOnly;
  journeysMenu.hidden = readOnly;
  updateJourneyVisibilityOption();
  updateManageMembersOption();
  closeJourneysMenu();
  renderAll(); setSyncStatus(readOnly ? 'readonly' : 'synced');
}
function showGate(message = '') {
  accessGate.hidden = false; document.body.classList.add('auth-pending');
  loginError.hidden = !message; loginError.textContent = message;
}
async function enterGuest() {
  try {
    const journeys = await listPublicJourneys();
    if (!journeys.length) {
      showGate('Não há jornadas públicas disponíveis no momento.');
      return;
    }

    publicJourneyPickerList.innerHTML = journeys.map((journey) => `
      <li>
        <button class="journey-picker-option" type="button" data-public-journey-id="${journey.id}">
          <span>${escapeHTML(journey.title || 'Jornada sem nome')}</span>
          <small>Pública</small>
        </button>
      </li>
    `).join('');
    publicJourneyDialog.showModal();
  } catch (err) {
    console.warn('[guest] load failed:', err);
    showGate(err?.message || 'Não foi possível carregar as jornadas públicas.');
  }
}

async function openPublicJourney(journeyId) {
  try {
    setSyncStatus('saving');
    const shared = await loadSharedJourney(journeyId);
    if (!shared || !syncSharedJourneyToApp(shared)) {
      throw new Error('Não foi possível abrir esta jornada pública.');
    }
    publicJourneyDialog.close();
    showApp(true, 'Visitante');
  } catch (err) {
    console.warn('[guest] open journey failed:', err);
    showGate(err?.message || 'Não foi possível abrir esta jornada pública.');
  }
}
function createJourneyFromUser() {
  closeJourneysMenu();
  setCreateJourneyFeedback();
  createJourneyForm.reset();
  createJourneyTitle.value = 'Nossa jornada';
  createJourneyDialog.showModal();
  requestAnimationFrame(() => createJourneyTitle.select());
}

async function submitCreateJourney() {
  const title = createJourneyTitle.value.trim();
  if (!title) {
    createJourneyTitle.focus();
    return;
  }

  const raw = title;
  const slug = `${raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'journey'}-${Date.now().toString().slice(-6)}`;

  btnConfirmCreateJourney.disabled = true;
  btnConfirmCreateJourney.textContent = 'Criando…';
  setCreateJourneyFeedback();

  try {
    const journeyId = await createSharedJourney({ title: raw, slug });
    const shared = await loadSharedJourney(journeyId);

    if (shared && syncSharedJourneyToApp(shared)) {
      createJourneyDialog.close();
      showApp(false, 'Autenticado');
      return;
    }

    setCreateJourneyFeedback('Jornada criada com sucesso. Recarregue a página para abri-la.');
  } catch (err) {
    console.error('[journey] create failed:', err);
    setCreateJourneyFeedback(err?.message || 'Não foi possível criar a jornada.');
  } finally {
    btnConfirmCreateJourney.disabled = false;
    btnConfirmCreateJourney.textContent = 'Criar jornada';
  }
}

async function selectJourneyFromUser() {
  closeJourneysMenu();
  try {
    const journeys = await listUserJourneys();
    if (!Array.isArray(journeys) || journeys.length === 0) {
      window.alert('Você ainda não tem jornadas para selecionar.');
      return;
    }

    journeyPickerList.innerHTML = journeys.map((journey) => `
      <li class="journey-picker-item" draggable="true" data-is-default="${Boolean(journey.is_default)}">
        <button class="journey-drag-handle" type="button" aria-label="Arrastar jornada" title="Arraste para alterar a jornada inicial">⠿</button>
        <button class="journey-picker-option" type="button" data-journey-id="${journey.journeyId || journey.id}">
          <span>${escapeHTML(journey.title || 'Jornada sem nome')}</span>
          <small>${journey.is_default ? 'Inicial' : (journey.is_public ? 'Pública' : 'Privada')}</small>
        </button>
      </li>
    `).join('');
    selectJourneyDialog.showModal();
  } catch (err) {
    console.error('[journey] select failed:', err);
    window.alert(err?.message || 'Não foi possível carregar as jornadas.');
  }
}

async function openSelectedJourney(journeyId) {
  try {
    const shared = await loadSharedJourney(journeyId);
    if (shared && syncSharedJourneyToApp(shared)) {
      selectJourneyDialog.close();
      showApp(false, 'Autenticado');
      return;
    }

    window.alert('Não foi possível abrir essa jornada.');
  } catch (err) {
    console.error('[journey] open selected journey failed:', err);
    window.alert(err?.message || 'Não foi possível abrir essa jornada.');
  }
}

async function setSelectedJourneyAsDefault(journeyId) {
  try {
    await setDefaultJourney(journeyId);
    selectJourneyDialog.close();
    await selectJourneyFromUser();
  } catch (err) {
    console.error('[journey] set default failed:', err);
    window.alert(err?.message || 'Não foi possível definir a jornada inicial.');
  }
}

async function toggleSharedJourneyVisibility() {
  if (!app.isSharedJourney || !app.journeyId) return;

  const nextValue = !app.isPublic;
  btnToggleJourneyVisibility.disabled = true;
  try {
    app.isPublic = await setSharedJourneyPublicState({
      journeyId: app.journeyId,
      isPublic: nextValue,
    });
    updateJourneyVisibilityOption();
    closeJourneysMenu();
  } catch (err) {
    console.error('[journey] visibility update failed:', err);
    window.alert(err?.message || 'Não foi possível alterar a visibilidade da jornada.');
  } finally {
    btnToggleJourneyVisibility.disabled = false;
  }
}

async function enterOwner() {
  let journeys;
  try {
    journeys = await listUserJourneys();
    if (Array.isArray(journeys) && journeys.length > 0) {
      const shared = await loadSharedJourney(journeys[0].journeyId || journeys[0].id);
      if (shared && syncSharedJourneyToApp(shared)) {
        showApp(false, 'Autenticado');
        return;
      }

      throw new Error('A jornada atribuída à sua conta não pôde ser carregada.');
    }
  } catch (err) {
    console.error('[shared-journey] failed to load shared journey:', err);
    showGate(`Não foi possível carregar suas jornadas: ${err?.message || 'erro desconhecido'}`);
    return;
  }

  hydrateLegacyPhaseData();
  showApp(false, 'Sem jornada atribuída');
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

  const openPhaseComposer = e.target.closest('[data-open-phase-composer]');
  if (openPhaseComposer) {
    e.preventDefault();
    app.phaseComposerOpen = true;
    renderAll();
    return;
  }

  const closePhaseComposer = e.target.closest('[data-close-phase-composer]');
  if (closePhaseComposer) {
    e.preventDefault();
    app.phaseComposerOpen = false;
    renderAll();
    return;
  }

  const editPhaseButton = e.target.closest('[data-edit-phase]');
  if (editPhaseButton) {
    e.preventDefault();
    app.phaseComposerOpen = false;
    app.phaseEditingId = editPhaseButton.dataset.editPhase;
    renderAll();
    requestAnimationFrame(() => {
      timelineEl.querySelector('.phase-editor-form input[name="phaseTitle"]')?.focus({ preventScroll: true });
    });
    return;
  }

  const closePhaseEditor = e.target.closest('[data-close-phase-editor]');
  if (closePhaseEditor) {
    e.preventDefault();
    app.phaseEditingId = null;
    renderAll();
    return;
  }

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

timelineEl.addEventListener('submit', async (e) => {
  if (app.readOnly) { e.preventDefault(); return; }

  const phaseEditorForm = e.target.closest('.phase-editor-form');
  if (phaseEditorForm) {
    e.preventDefault();
    const phaseId = phaseEditorForm.dataset.phaseEditor;
    const label = phaseEditorForm.querySelector('[name="phaseLabel"]').value.trim();
    const title = phaseEditorForm.querySelector('[name="phaseTitle"]').value.trim();
    const description = phaseEditorForm.querySelector('[name="phaseDescription"]').value.trim();
    const color = phaseEditorForm.querySelector('[name="phaseColor"]').value || '#5ec26a';
    const icon = phaseEditorForm.querySelector('[name="phaseIcon"]').value || 'i-house';

    if (!label || !title) {
      phaseEditorForm.querySelector(!label ? '[name="phaseLabel"]' : '[name="phaseTitle"]')?.focus();
      return;
    }

    const saveButton = phaseEditorForm.querySelector('button[type="submit"]');
    saveButton.disabled = true;
    saveButton.textContent = 'Salvando…';
    try {
      await updateJourneyPhase({ journeyId: app.journeyId, phaseId, label, title, description, color, icon });
      app.phaseEditingId = null;
      const shared = await loadSharedJourney(app.journeyId);
      if (!shared || !syncSharedJourneyToApp(shared)) {
        throw new Error('A fase foi salva, mas não pôde ser recarregada.');
      }
      renderAll();
    } catch (err) {
      console.error('[journey] update phase failed:', err);
      window.alert(err?.message || 'Não foi possível salvar a fase.');
      saveButton.disabled = false;
      saveButton.textContent = 'Salvar fase';
    }
    return;
  }

  const phaseForm = e.target.closest('.phase-composer-form');
  if (phaseForm) {
    e.preventDefault();
    const label = phaseForm.querySelector('[name="phaseLabel"]').value.trim();
    const title = phaseForm.querySelector('[name="phaseTitle"]').value.trim();
    const description = phaseForm.querySelector('[name="phaseDescription"]').value.trim();
    const color = phaseForm.querySelector('[name="phaseColor"]').value || '#5ec26a';
    const icon = phaseForm.querySelector('[name="phaseIcon"]').value || 'i-house';

    if (!title) {
      phaseForm.querySelector('[name="phaseTitle"]').focus();
      return;
    }

    try {
      const highestPosition = PHASES.reduce((highest, phase) => {
        const position = Number(phase.position);
        return Number.isFinite(position) ? Math.max(highest, position) : highest;
      }, 0);
      const nextPosition = highestPosition + 1;
      const nextPhaseNumber = Math.max(PHASES.length + 1, nextPosition);
      const created = await createJourneyPhase({
        journeyId: app.journeyId,
        label: label || `Fase ${nextPhaseNumber}`,
        title,
        description,
        color,
        icon,
        position: nextPosition,
      });

      app.phaseComposerOpen = false;

      if (created && app.journeyId) {
        const shared = await loadSharedJourney(app.journeyId);
        if (shared && syncSharedJourneyToApp(shared)) {
          renderAll();
          return;
        }
      }

      renderAll();
    } catch (err) {
      console.error('[journey] create phase failed:', err);
      window.alert(err?.message || 'Não foi possível criar a fase.');
    }
    return;
  }

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
journeysTrigger.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  toggleJourneysMenu();
});
btnSelectJourney.addEventListener('click', selectJourneyFromUser);
btnCreateJourney.addEventListener('click', createJourneyFromUser);
btnToggleJourneyVisibility.addEventListener('click', toggleSharedJourneyVisibility);
btnManageMembers.addEventListener('click', openMembersDialog);
journeysBackdrop.addEventListener('click', closeJourneysMenu);
btnLogin.addEventListener('click', () => showGate());
btnLogout.addEventListener('click', async () => { await signOut(); showGate(); });
btnCloseMembersDialog.addEventListener('click', closeMembersDialog);
membersDialog.addEventListener('click', (event) => {
  if (event.target === membersDialog) closeMembersDialog();
});
btnCloseCreateJourneyDialog.addEventListener('click', () => createJourneyDialog.close());
btnCancelCreateJourney.addEventListener('click', () => createJourneyDialog.close());
createJourneyDialog.addEventListener('click', (event) => {
  if (event.target === createJourneyDialog) createJourneyDialog.close();
});
createJourneyForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  await submitCreateJourney();
});
btnCloseSelectJourneyDialog.addEventListener('click', () => selectJourneyDialog.close());
selectJourneyDialog.addEventListener('click', (event) => {
  if (event.target === selectJourneyDialog) selectJourneyDialog.close();
});
journeyPickerList.addEventListener('click', async (event) => {
  const option = event.target.closest('[data-journey-id]');
  if (!option) return;
  option.disabled = true;
  await openSelectedJourney(option.dataset.journeyId);
  option.disabled = false;
});
journeyPickerList.addEventListener('dragstart', (event) => {
  const item = event.target.closest('.journey-picker-item');
  if (!item) return;
  draggedJourneyItem = item;
  item.classList.add('dragging');
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', item.querySelector('[data-journey-id]').dataset.journeyId);
});
journeyPickerList.addEventListener('dragover', (event) => {
  event.preventDefault();
  const target = event.target.closest('.journey-picker-item');
  if (!target || target === draggedJourneyItem) return;
  const targetBounds = target.getBoundingClientRect();
  const insertAfter = event.clientY > targetBounds.top + targetBounds.height / 2;
  journeyPickerList.insertBefore(draggedJourneyItem, insertAfter ? target.nextSibling : target);
});
journeyPickerList.addEventListener('drop', async (event) => {
  event.preventDefault();
  const firstItem = journeyPickerList.querySelector('.journey-picker-item');
  const firstJourneyId = firstItem?.querySelector('[data-journey-id]')?.dataset.journeyId;
  const firstWasDefault = firstItem?.dataset.isDefault === 'true';

  if (firstJourneyId && !firstWasDefault) {
    await setSelectedJourneyAsDefault(firstJourneyId);
  }
});
journeyPickerList.addEventListener('dragend', () => {
  draggedJourneyItem?.classList.remove('dragging');
  draggedJourneyItem = null;
});
btnClosePublicJourneyDialog.addEventListener('click', () => publicJourneyDialog.close());
publicJourneyDialog.addEventListener('click', (event) => {
  if (event.target === publicJourneyDialog) publicJourneyDialog.close();
});
publicJourneyPickerList.addEventListener('click', async (event) => {
  const option = event.target.closest('[data-public-journey-id]');
  if (!option) return;
  option.disabled = true;
  await openPublicJourney(option.dataset.publicJourneyId);
  option.disabled = false;
});
memberAddForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!memberSelect.value || !app.journeyId) return;

  const selectedUserId = memberSelect.value;
  btnAddMember.disabled = true;
  setMembersFeedback();
  try {
    await addJourneyMember({ journeyId: app.journeyId, userId: selectedUserId });
    const members = await refreshMembersDialog();
    if (!members.some((member) => member.user_id === selectedUserId)) {
      throw new Error('O Supabase não confirmou a associação deste usuário à jornada.');
    }
    setMembersFeedback('Membro adicionado e salvo nesta jornada.', 'success');
  } catch (err) {
    console.error('[journey] add member failed:', err);
    setMembersFeedback(err?.message || 'Não foi possível adicionar este usuário.');
  } finally {
    btnAddMember.disabled = memberSelect.disabled;
  }
});
membersList.addEventListener('click', async (event) => {
  const removeButton = event.target.closest('[data-remove-member]');
  if (!removeButton || !app.journeyId) return;
  if (!window.confirm('Remover este usuário da jornada?')) return;

  removeButton.disabled = true;
  setMembersFeedback();
  try {
    await removeJourneyMember({ journeyId: app.journeyId, userId: removeButton.dataset.removeMember });
    await refreshMembersDialog();
  } catch (err) {
    console.error('[journey] remove member failed:', err);
    setMembersFeedback(err?.message || 'Não foi possível remover este usuário.');
    removeButton.disabled = false;
  }
});
document.addEventListener('click', (event) => {
  if (!journeysMenu?.contains(event.target)) closeJourneysMenu();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeJourneysMenu();
});
bootstrap();