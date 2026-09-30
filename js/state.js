import { PHASES, STORAGE_KEYS } from './data.js';

/* ---------- Persistência ---------- */
function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

export function saveJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

export function saveProgress()  { saveJSON(STORAGE_KEYS.progress,  app.progress); }
export function saveCustom()    { saveJSON(STORAGE_KEYS.custom,    app.custom); }
export function saveOrder()     { saveJSON(STORAGE_KEYS.order,     app.order); }
export function saveOverrides() { saveJSON(STORAGE_KEYS.overrides, app.overrides); }

/* ---------- Estado global ---------- */
export const app = {
  progress:  loadJSON(STORAGE_KEYS.progress,  {}),
  custom:    loadJSON(STORAGE_KEYS.custom,    {}),
  order:     loadJSON(STORAGE_KEYS.order,     {}),
  overrides: loadJSON(STORAGE_KEYS.overrides, {}),
  editingId: null,
  addingPhaseId: null,
};

export function resetProgress() {
  app.progress = {};
  saveProgress();
}

/* ---------- Parser de bullets ----------
   Linhas iniciadas por "- ", "* " ou "• " viram subs. */
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

/* ---------- Overrides e listagem ---------- */
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
    if (byId.has(id)) {
      result.push(byId.get(id));
      byId.delete(id);
    }
  }
  for (const item of allItems) {
    if (byId.has(item.id)) result.push(item);
  }
  return result;
}

/* ---------- Remoção de item personalizado ---------- */
export function removeCustomItem(id) {
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

  saveCustom(); saveProgress(); saveOrder(); saveOverrides();
}

/* ---------- Reorder ---------- */
export function persistOrder(phaseId, ids) {
  app.order[phaseId] = ids;
  saveOrder();
}

export { PHASES };