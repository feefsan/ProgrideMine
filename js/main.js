import { PHASES, app,
         saveProgress, saveCustom, saveOverrides,
         parseBullets, removeCustomItem, persistOrder } from './state.js';
import { renderAll, updateUI, getTimelineEl } from './ui.js';

const timelineEl = getTimelineEl();

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
   Abrir / fechar mini-formulários
   ========================================================= */
function openEditForm(id) {
  app.editingId = id;
  app.addingPhaseId = null;
  renderAll();
  requestAnimationFrame(() => {
    const form = timelineEl.querySelector(`form[data-edit="${CSS.escape(id)}"]`);
    const input = form?.querySelector('input[name="title"]');
    const ta = form?.querySelector('textarea');
    input?.focus({ preventScroll: true });
    input?.setSelectionRange(input.value.length, input.value.length);
    ta?.setSelectionRange(ta.value.length, ta.value.length);
  });
}

function openAddForm(phaseId) {
  app.addingPhaseId = phaseId;
  app.editingId = null;
  renderAll();
  requestAnimationFrame(() => {
    const input = timelineEl.querySelector(`form[data-add="${CSS.escape(phaseId)}"] input[name="title"]`);
    if (input) {
      input.focus({ preventScroll: true });
      input.closest('.add-wrap')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });
}

function closeForms() {
  app.editingId = null;
  app.addingPhaseId = null;
  renderAll();
}

/* =========================================================
   Eventos
   ========================================================= */
timelineEl.addEventListener('change', (e) => {
  const cb = e.target.closest('input[type="checkbox"]');
  if (!cb) return;
  if (cb.checked) app.progress[cb.dataset.id] = true;
  else            delete app.progress[cb.dataset.id];
  saveProgress();
  updateUI();
});

timelineEl.addEventListener('click', (e) => {
  if (e.target.closest('.btn-add-icon')) {
    e.preventDefault();
    openAddForm(e.target.closest('.btn-add-icon').dataset.add);
    return;
  }

  const editBtn = e.target.closest('.btn-edit');
  if (editBtn) {
    e.preventDefault(); e.stopPropagation();
    openEditForm(editBtn.dataset.edit);
    return;
  }

  if (e.target.closest('.btn-cancel')) {
    e.preventDefault();
    closeForms();
    return;
  }

  const delBtn = e.target.closest('.btn-del');
  if (delBtn) {
    e.preventDefault(); e.stopPropagation();
    if (!window.confirm('Remover este objetivo personalizado?')) return;
    removeCustomItem(delBtn.dataset.del);
    renderAll();
  }
});

timelineEl.addEventListener('submit', (e) => {
  const form = e.target.closest('.mini-form');
  if (!form) return;
  e.preventDefault();

  const title   = form.querySelector('input[name="title"]').value.trim();
  const rawText = form.querySelector('textarea[name="text"]').value;
  if (!title) { form.querySelector('input[name="title"]').focus(); return; }

  const { text, subs } = parseBullets(rawText);

  /* --- Edição --- */
  if (form.dataset.edit) {
    const id = form.dataset.edit;
    const original   = PHASES.flatMap(p => p.items).find(i => i.id === id);
    const customItem = Object.values(app.custom).flat().find(i => i.id === id);

    if (customItem) {
      customItem.title = title;
      customItem.text = text;
      if (subs.length) customItem.subs = subs;
      else             delete customItem.subs;

      delete app.overrides[id];
      saveCustom(); saveOverrides();
    } else if (original) {
      const unchanged =
        title === original.title &&
        text === (original.text || '') &&
        JSON.stringify(subs) === JSON.stringify(original.subs || []);

      if (unchanged) delete app.overrides[id];
      else           app.overrides[id] = { title, text, subs };

      saveOverrides();
    }

    app.editingId = null;
    renderAll();
    return;
  }

  /* --- Criação --- */
  if (form.dataset.add) {
    const phaseId = form.dataset.add;
    const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const newItem = { id, title, text };
    if (subs.length) newItem.subs = subs;

    if (!app.custom[phaseId]) app.custom[phaseId] = [];
    app.custom[phaseId].push(newItem);
    saveCustom();

    app.addingPhaseId = null;
    renderAll();

    requestAnimationFrame(() => {
      const el = timelineEl.querySelector(`input[data-id="${CSS.escape(id)}"]`);
      el?.closest('.task-label')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && (app.editingId || app.addingPhaseId)) closeForms();
});

document.getElementById('btnReset').addEventListener('click', () => {
  const ok = window.confirm(
    'Apagar TODO o progresso marcado?\n\n' +
    'Objetivos personalizados, edições e ordem das listas NÃO são apagados.'
  );
  if (!ok) return;
  app.progress = {};
  saveProgress();
  renderAll();
});

/* =========================================================
   Boot
   ========================================================= */
renderAll();