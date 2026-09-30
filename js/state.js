import { PHASES } from './data.js';
import { persist } from './storage.js';

/* ============================================================
   Estado em memória — a única fonte de verdade durante a sessão.
   ============================================================ */
export const app = {
  progress:  {},
  custom:    {},
  order:     {},
  overrides: {},
  editingId: null,
  addingPhaseId: null,
  readOnly: true,
  isPublic: false,
};

/* ============================================================
   Parser de bullets
   Linhas iniciadas por "- ", "* " ou "• " viram subs.
   ============================================================ */
export function parseBullets(raw) {
  if (!raw) return { text: '', subs: [] };
  const lines = String(raw).split(/\r?\n/);
  const textLines = [];
  const subs = [];

  for (const line of lines) {
    const m = line.match(/^\s*[-*•]\s+(.*)$/);
    if (m) {
      const val = m[1].trim();
      if (val) subs.push(val);
    } else {
      textLines.push(line);
    }
  }

  return {
    text: textLines.join('\n').replace(/^\s+|\s+$/g, ''),
    subs,
  };
}

export function itemToEditorText(item) {
  const lines = [];
  if (item.text) lines.push(item.text);
  if (item.subs?.length) {
    if (lines.length) lines.push('');
    item.subs.forEach(s => lines.push(`- ${s}`));
  }
  return lines.join('\n');
}

/* ============================================================
   Overrides e ordenação
   ============================================================ */
function applyOverride(item) {
  const o = app.overrides[item.id];
  if (!o) return item;

  const result = { ...item, title: o.title, text: o.text, edited: true };
  if (Array.isArray(o.subs)) {
    if (o.subs.length) result.subs = o.subs;
    else delete result.subs;
  }
  return result;
}

export function getItemsFor(phase) {
  const builtin = phase.items.map(i => ({ ...i, custom: false }));
  const extras  = (app.custom[phase.id] || []).map(i => ({ ...i, custom: true }));
  return [...builtin, ...extras].map(applyOverride);
}

export function getOrderedItems(phase) {
  const allItems = getItemsFor(phase);
  const saved = app.order[phase.id] || [];
  const byId = new Map(allItems.map(i => [i.id, i]));
  const result = [];

  for (const id of saved) {
    if (byId.has(id)) { result.push(byId.get(id)); byId.delete(id); }
  }
  for (const item of allItems) {
    if (byId.has(item.id)) result.push(item);
  }
  return result;
}

/* ============================================================
   Mutadores — sempre chamam persist() ao final
   ============================================================ */

export function toggleProgress(id, checked) {
  if (app.readOnly) return;
  if (checked) app.progress[id] = true;
  else         delete app.progress[id];
  persist(app);
}

export function addCustomItem(phaseId, { title, text, subs }) {
  if (app.readOnly) return null;
  const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const newItem = { id, title, text };
  if (subs?.length) newItem.subs = subs;

  if (!app.custom[phaseId]) app.custom[phaseId] = [];
  app.custom[phaseId].push(newItem);

  persist(app);
  return id;
}

export function updateItem(id, { title, text, subs }) {
  if (app.readOnly) return;
  const original   = PHASES.flatMap(p => p.items).find(i => i.id === id);
  const customItem = Object.values(app.custom).flat().find(i => i.id === id);

  if (customItem) {
    customItem.title = title;
    customItem.text  = text;
    if (subs.length) customItem.subs = subs;
    else             delete customItem.subs;
    delete app.overrides[id];
  } else if (original) {
    const unchanged =
      title === original.title &&
      text === (original.text || '') &&
      JSON.stringify(subs) === JSON.stringify(original.subs || []);

    if (unchanged) delete app.overrides[id];
    else           app.overrides[id] = { title, text, subs };
  }

  persist(app);
}

export function removeCustomItem(id) {
  if (app.readOnly) return;
  for (const phaseId in app.custom) {
    const idx = app.custom[phaseId].findIndex(i => i.id === id);
    if (idx !== -1) {
      app.custom[phaseId].splice(idx, 1);
      if (app.custom[phaseId].length === 0) delete app.custom[phaseId];
      if (app.order[phaseId]) {
        app.order[phaseId] = app.order[phaseId].filter(x => x !== id);
        if (app.order[phaseId].length === 0) delete app.order[phaseId];
      }
      break;
    }
  }
  delete app.progress[id];
  delete app.overrides[id];
  persist(app);
}

export function persistOrder(phaseId, ids) {
  if (app.readOnly) return;
  app.order[phaseId] = ids;
  persist(app);
}

export function resetProgress() {
  if (app.readOnly) return;
  app.progress = {};
  persist(app);
}

export { PHASES };