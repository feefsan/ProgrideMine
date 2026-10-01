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
const journeyTitleEl = document.getElementById('journeyTitle');

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

function renderPhaseComposer() {
  if (!app.isSharedJourney || app.readOnly) return '';

  if (!app.phaseComposerOpen) {
    return `
      <li class="phase-composer-trigger" style="--accent:#8ef29a">
        <button type="button" class="btn-add-phase" data-open-phase-composer
                title="Adicionar nova fase" aria-label="Adicionar nova fase">
          ${svgIcon('i-plus', '')}
        </button>
      </li>
    `;
  }

  return `
    <li class="phase phase-composer" data-phase="new-phase" style="--accent:#8ef29a">
      <div class="marker">${svgIcon('i-plus')}</div>
      <section class="card">
        <header class="card-head">
          <div class="head-text">
            <span class="phase-label">Nova etapa</span>
            <h2>Nova fase</h2>
            <p>Defina título, descrição, ordem, ícone e cor visual.</p>
          </div>
        </header>

        <form class="phase-composer-form" data-phase-composer>
          <div class="phase-form-grid">
            <label class="phase-field">
              <span>Rótulo</span>
              <input type="text" name="phaseLabel" placeholder="Fase 6" maxlength="40">
            </label>
            <label class="phase-field">
              <span>Título</span>
              <input type="text" name="phaseTitle" placeholder="Planejamento final" maxlength="120" required>
            </label>
            <label class="phase-field phase-field-full">
              <span>Descrição</span>
              <textarea name="phaseDescription" rows="3" maxlength="500" placeholder="Descreva o objetivo desta etapa..."></textarea>
            </label>
            <div class="phase-form-row">
              <label class="phase-field">
                <span>Cor</span>
                <input type="color" name="phaseColor" value="#8ef29a">
              </label>
              <label class="phase-field">
                <span>Ícone</span>
                <select name="phaseIcon">
                  <option value="i-house">Casa</option>
                  <option value="i-cube">Cubo</option>
                  <option value="i-flame">Chama</option>
                  <option value="i-end">End</option>
                  <option value="i-beacon">Beacon</option>
                  <option value="i-plus">Mais</option>
                </select>
              </label>
            </div>
          </div>

          <div class="mini-form-actions">
            <button type="button" class="btn-cancel" data-close-phase-composer>Cancelar</button>
            <button type="submit" class="btn-save">Salvar fase</button>
          </div>
        </form>
      </section>
    </li>
  `;
}

function renderPhase(phase) {
  const items = getOrderedItems(phase);
  const showAddForm = (app.addingPhaseId === phase.id);
  const isEditing = app.phaseEditingId === phase.id;

  if (isEditing) {
    return `
      <li class="phase phase-editing" data-phase="${phase.id}" style="--accent:${phase.color}">
        <div class="marker">${svgIcon(phase.icon)}</div>
        <section class="card">
          <header class="card-head">
            <div class="head-text">
              <span class="phase-label">Editar etapa</span>
              <h2>Editar fase</h2>
              <p>Atualize os detalhes visuais e a descrição desta etapa.</p>
            </div>
          </header>

          <form class="phase-editor-form" data-phase-editor="${phase.id}">
            <div class="phase-form-grid">
              <label class="phase-field">
                <span>Rótulo</span>
                <input type="text" name="phaseLabel" value="${escapeAttr(phase.label || '')}" maxlength="40" required>
              </label>
              <label class="phase-field">
                <span>Título</span>
                <input type="text" name="phaseTitle" value="${escapeAttr(phase.title || '')}" maxlength="120" required>
              </label>
              <label class="phase-field phase-field-full">
                <span>Descrição</span>
                <textarea name="phaseDescription" rows="3" maxlength="500">${escapeHTML(phase.desc || '')}</textarea>
              </label>
              <div class="phase-form-row">
                <label class="phase-field">
                  <span>Cor</span>
                  <input type="color" name="phaseColor" value="${escapeAttr(phase.color || '#5ec26a')}">
                </label>
                <label class="phase-field">
                  <span>Ícone</span>
                  <select name="phaseIcon">
                    ${['i-house:Casa', 'i-cube:Cubo', 'i-flame:Chama', 'i-end:End', 'i-beacon:Beacon', 'i-plus:Mais']
                      .map((option) => {
                        const [value, label] = option.split(':');
                        return `<option value="${value}" ${phase.icon === value ? 'selected' : ''}>${label}</option>`;
                      }).join('')}
                  </select>
                </label>
              </div>
            </div>

            <div class="mini-form-actions">
              <button type="button" class="btn-cancel" data-close-phase-editor>Cancelar</button>
              <button type="submit" class="btn-save">Salvar fase</button>
            </div>
          </form>
        </section>
      </li>
    `;
  }

  return `
    <li class="phase" data-phase="${phase.id}" style="--accent:${phase.color}">
      <div class="marker">
        ${svgIcon(phase.icon)}
        ${app.readOnly ? '' : `<button type="button" class="phase-edit-trigger" data-edit-phase="${phase.id}"
          title="Editar fase" aria-label="Editar fase">${svgIcon('i-wrench', '')}</button>`}
      </div>

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
  if (journeyTitleEl) journeyTitleEl.textContent = app.journeyTitle || 'Sua jornada';
  timelineEl.innerHTML = `${PHASES.map(renderPhase).join('')}${renderPhaseComposer()}`;
  updateUI();
  window.scrollTo(0, scrollY);
}

/* ---------- Barra de progresso + contadores ---------- */
export function updateUI() {
  let done = 0, total = 0;

  PHASES.forEach(phase => {
    const items = getOrderedItems(phase);
    let phaseDone = 0;

    items.forEach(item => {
      const cb = timelineEl.querySelector(`input[data-id="${CSS.escape(item.id)}"]`);
      if (cb && cb.checked) phaseDone++;
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
  xpFill.parentElement.setAttribute('aria-valuenow', String(pct));
}