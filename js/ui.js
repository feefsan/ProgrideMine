import { PHASES, app, getOrderedItems, itemToEditorText } from './state.js';


const syncStatusEl = document.getElementById('syncStatus');

export function setSyncStatus(state) {
  if (!syncStatusEl) return;
  syncStatusEl.dataset.state = state;
  const textMap = {
    local:   'Local',
    saving:  'Salvando…',
    synced:  'Sincronizado',
    error:   'Erro de sync',
    readonly:'Somente leitura',
  };
  syncStatusEl.querySelector('.sync-text').textContent = textMap[state] || 'Local';
}

/* ---------- Helpers ---------- */
export function escapeHTML(str) {
  return String(str).replace(/[&<>"']/g, m => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[m]));
}
export function escapeAttr(str) {
  return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
export function svgIcon(id, cls = 'icon') {
  return `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><use href="#${id}"></use></svg>`;
}

/* ---------- DOM refs ---------- */
const timelineEl = document.getElementById('timeline');
const xpFill     = document.getElementById('xpFill');
const xpPct      = document.getElementById('xpPct');
const statDone   = document.getElementById('statDone');
const statTotal  = document.getElementById('statTotal');
const statCustom = document.getElementById('statCustom');
const statEdited = document.getElementById('statEdited');

export function getTimelineEl() { return timelineEl; }

/* ---------- Mini-form ---------- */
function renderMiniForm({ mode, id, title = '', text = '' }) {
  const dataAttr = mode === 'edit' ? `data-edit="${id}"` : `data-add="${id}"`;
  const placeholder = mode === 'edit'
    ? 'Título do objetivo'
    : 'Título do objetivo (obrigatório)';

  return `
    <form class="mini-form" ${dataAttr} autocomplete="off">
      <input type="text" name="title"
             value="${escapeAttr(title)}"
             placeholder="${placeholder}"
             maxlength="120" required>
      <textarea name="text" rows="4" maxlength="1500"
                placeholder="Descrição (opcional). Comece uma linha com - para criar um tópico.">${escapeHTML(text)}</textarea>
      <span class="form-hint">
        <code>-</code> <code>*</code> ou <code>•</code> no início da linha viram tópicos
      </span>
      <div class="mini-form-actions">
        <button type="button" class="btn-cancel" data-cancel="${mode}:${id}">Cancelar</button>
        <button type="submit" class="btn-save">Salvar</button>
      </div>
    </form>
  `;
}

/* ---------- Tarefa ---------- */
function renderTask(item) {
  const checked = app.progress[item.id] ? 'checked' : '';
  const customBadge = item.custom ? '<span class="custom-badge">personalizado</span>' : '';
  const editedBadge = (item.edited && !item.custom) ? '<span class="edited-badge">editado</span>' : '';
  const delBtn = !app.readOnly && item.custom
    ? `<button type="button" class="btn-del" data-del="${item.id}"
              title="Remover objetivo" aria-label="Remover objetivo">×</button>` : '';
  const subsHTML = item.subs?.length
    ? `<ul class="subs">${item.subs.map(s => `<li>${escapeHTML(s)}</li>`).join('')}</ul>` : '';

  return `
    <li class="task">
      ${app.readOnly ? '' : `<button type="button" class="drag-handle" draggable="true"
              aria-label="Arrastar para reordenar" title="Arraste para reordenar">
        ${svgIcon('i-grip', '')}
      </button>`}

      <label class="task-label">
        <input type="checkbox" data-id="${item.id}" ${checked} ${app.readOnly ? 'disabled' : ''}>
        <span class="box" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M4 12.6 9.4 18 20 6.6" fill="none" stroke="currentColor"
                  stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
        <span class="task-body">
          <span class="task-title">${escapeHTML(item.title)}${customBadge}${editedBadge}</span>
          ${item.text ? `<span class="task-text">${escapeHTML(item.text)}</span>` : ''}
          ${subsHTML}
        </span>
      </label>

      ${app.readOnly ? '' : `<div class="task-actions">
        <button type="button" class="btn-edit" data-edit="${item.id}"
                title="Editar objetivo" aria-label="Editar objetivo">
          ${svgIcon('i-pencil', '')}
        </button>
        ${delBtn}
      </div>`}
    </li>
  `;
}

function renderItem(item) {
  if (app.editingId === item.id) {
    return `
      <li class="task-editing">
        ${renderMiniForm({
          mode: 'edit',
          id: item.id,
          title: item.title,
          text: itemToEditorText(item)
        })}
      </li>
    `;
  }
  return renderTask(item);
}

function renderPhase(phase) {
  const items = getOrderedItems(phase);
  const showAddForm = (app.addingPhaseId === phase.id);

  return `
    <li class="phase" data-phase="${phase.id}" style="--accent:${phase.color}">
      <div class="marker">${svgIcon(phase.icon)}</div>

      <section class="card">
        <header class="card-head">
          <div class="head-text">
            <span class="phase-label">${phase.label}</span>
            <h2>${phase.title}</h2>
            <p>${phase.desc}</p>
          </div>

          <div class="head-actions">
            <div class="phase-count" data-count="${phase.id}">0/${items.length}</div>
            ${app.readOnly ? '' : `<button type="button" class="btn-add-icon" data-add="${phase.id}"
                    title="Adicionar objetivo nesta fase" aria-label="Adicionar objetivo nesta fase">
              ${svgIcon('i-plus', '')}
            </button>`}
          </div>
        </header>

        <ul class="tasks">
          ${items.map(renderItem).join('')}
        </ul>

        ${showAddForm ? `
          <div class="add-wrap">
            ${renderMiniForm({ mode: 'add', id: phase.id })}
          </div>
        ` : ''}
      </section>
    </li>
  `;
}

/* ---------- Render principal ---------- */
export function renderAll() {
  const scrollY = window.scrollY;
  timelineEl.innerHTML = PHASES.map(renderPhase).join('');
  updateUI();
  window.scrollTo(0, scrollY);
}

/* ---------- Barra de progresso + contadores ---------- */
export function updateUI() {
  let done = 0, total = 0, customCount = 0, editedCount = 0;

  PHASES.forEach(phase => {
    const items = getOrderedItems(phase);
    let phaseDone = 0;

    items.forEach(item => {
      const cb = timelineEl.querySelector(`input[data-id="${CSS.escape(item.id)}"]`);
      if (cb && cb.checked) phaseDone++;
      if (item.custom) customCount++;
      if (item.edited && !item.custom) editedCount++;
    });

    done  += phaseDone;
    total += items.length;

    const countEl = timelineEl.querySelector(`[data-count="${phase.id}"]`);
    if (countEl) countEl.textContent = `${phaseDone}/${items.length}`;

    const phaseEl = timelineEl.querySelector(`[data-phase="${phase.id}"]`);
    if (phaseEl) phaseEl.classList.toggle('done', items.length > 0 && phaseDone === items.length);
  });

  const pct = total ? Math.round((done / total) * 100) : 0;

  xpFill.style.width = pct + '%';
  xpPct.textContent  = pct + '%';
  statDone.textContent   = done;
  statTotal.textContent  = total;
  statCustom.textContent = customCount;
  statEdited.textContent = editedCount;

  xpFill.parentElement.setAttribute('aria-valuenow', String(pct));
}