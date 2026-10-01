import { PHASES as DEFAULT_PHASES } from './data.js';
import { persist } from './storage.js';
import { saveJourneyProgress, saveJourneyObjective, deleteJourneyObjective, reorderJourneyObjectives, resetJourneyProgress } from './journeys.js';

export const PHASES = [...DEFAULT_PHASES];

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
  phaseComposerOpen: false,
  phaseEditingId: null,
  readOnly: true,
  isPublic: false,
  journeyId: null,
  journeyTitle: null,
  isSharedJourney: false,
};

export function hydrateLegacyPhaseData() {
  PHASES.splice(0, PHASES.length, ...DEFAULT_PHASES.map(phase => ({ ...phase, items: phase.items.map(item => ({ ...item })) })));
  app.isSharedJourney = false;
  app.journeyId = null;
  app.journeyTitle = null;
  app.phaseEditingId = null;
}

export function syncSharedJourneyToApp(journey) {
  if (!journey || !Array.isArray(journey.journey_phases)) {
    hydrateLegacyPhaseData();
    return false;
  }

  const objectivesByPhase = new Map();
  for (const objective of journey.journey_objectives || []) {
    const phaseId = objective.phase_id || objective.phaseId;
    if (!phaseId) continue;
    if (!objectivesByPhase.has(phaseId)) objectivesByPhase.set(phaseId, []);
    objectivesByPhase.get(phaseId).push({
      id: objective.id,
      title: objective.title,
      text: objective.description || '',
      subs: Array.isArray(objective.subtopics) ? objective.subtopics : [],
      position: Number(objective.position) || 0,
      custom: false,
      edited: false,
    });
  }

  const nextPhases = [...journey.journey_phases]
    .sort((a, b) => (Number(a.position) || 0) - (Number(b.position) || 0))
    .map((phase) => {
      const items = (objectivesByPhase.get(phase.id) || [])
        .slice()
        .sort((a, b) => (Number(a.position) || 0) - (Number(b.position) || 0))
        .map(item => ({
          id: item.id,
          title: item.title,
          text: item.text,
          subs: item.subs,
          custom: false,
          edited: false,
          position: item.position,
        }));

      return {
        id: phase.id,
        label: phase.label || phase.title,
        title: phase.title,
        desc: phase.description || '',
        color: phase.color || '#5ec26a',
        icon: phase.icon || 'i-house',
        position: Number(phase.position) || 0,
        items,
      };
    });

  PHASES.splice(0, PHASES.length, ...nextPhases);
  app.progress = {};
  for (const row of journey.journey_progress || []) {
    if (row.completed) app.progress[row.objective_id] = true;
  }
  app.custom = {};
  app.order = {};
  app.overrides = {};
  app.isPublic = Boolean(journey.is_public);
  app.isSharedJourney = true;
  app.journeyId = journey.id;
  app.journeyTitle = journey.title || null;
  app.phaseEditingId = null;
  return true;
}

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

  if (app.isSharedJourney && app.journeyId) {
    if (checked) app.progress[id] = true;
    else delete app.progress[id];

    saveJourneyProgress({
      journeyId: app.journeyId,
      objectiveId: id,
      completed: checked,
    }).catch((err) => {
      console.warn('[shared-journey] toggleProgress failed:', err);
      if (checked) delete app.progress[id];
      else app.progress[id] = true;
    });
    return;
  }

  if (checked) app.progress[id] = true;
  else delete app.progress[id];
  persist(app);
}

export function addCustomItem(phaseId, { title, text, subs }) {
  if (app.readOnly) return null;

  if (app.isSharedJourney && app.journeyId) {
    const tempId = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const phase = PHASES.find(p => p.id === phaseId);
    const local = { id: tempId, title, text, subs: subs || [], custom: true, edited: false };

    if (phase) phase.items.push(local);
    saveJourneyObjective({
      journeyId: app.journeyId,
      phaseId,
      title,
      description: text,
      subtopics: subs || [],
      position: (phase?.items?.length || 1) - 1,
    }).then((newId) => {
      const target = phase?.items?.find(item => item.id === tempId);
      if (target && newId) {
        target.id = newId;
      }
    }).catch((err) => {
      console.warn('[shared-journey] addCustomItem failed:', err);
      if (phase) phase.items = phase.items.filter(item => item.id !== tempId);
    });

    return tempId;
  }

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

  if (app.isSharedJourney && app.journeyId) {
    const original = PHASES.flatMap(p => p.items).find(i => i.id === id);
    if (!original) return;

    const phaseId = PHASES.find(p => p.items.some(i => i.id === id))?.id;
    if (!phaseId) return;

    saveJourneyObjective({
      journeyId: app.journeyId,
      phaseId,
      objectiveId: id,
      title,
      description: text,
      subtopics: subs || [],
      position: original.position ?? 0,
    }).catch((err) => console.warn('[shared-journey] updateItem failed:', err));

    const target = PHASES.flatMap(p => p.items).find(item => item.id === id);
    if (target) {
      target.title = title;
      target.text = text;
      target.subs = subs || [];
    }
    return;
  }

  const original = PHASES.flatMap(p => p.items).find(i => i.id === id);
  const customItem = Object.values(app.custom).flat().find(i => i.id === id);

  if (customItem) {
    customItem.title = title;
    customItem.text = text;
    if (subs.length) customItem.subs = subs;
    else delete customItem.subs;
    delete app.overrides[id];
  } else if (original) {
    const unchanged =
      title === original.title &&
      text === (original.text || '') &&
      JSON.stringify(subs) === JSON.stringify(original.subs || []);

    if (unchanged) delete app.overrides[id];
    else app.overrides[id] = { title, text, subs };
  }

  persist(app);
}

export function removeCustomItem(id) {
  if (app.readOnly) return;

  if (app.isSharedJourney && app.journeyId) {
    const phase = PHASES.find(p => p.items.some(item => item.id === id));
    if (phase) {
      phase.items = phase.items.filter(item => item.id !== id);
    }
    delete app.progress[id];
    deleteJourneyObjective({
      journeyId: app.journeyId,
      objectiveId: id,
    }).catch((err) => console.warn('[shared-journey] delete failed:', err));
    return;
  }

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

  if (app.isSharedJourney && app.journeyId) {
    app.order[phaseId] = ids;
    reorderJourneyObjectives({
      journeyId: app.journeyId,
      phaseId,
      orderedIds: ids,
    }).catch((err) => console.warn('[shared-journey] reorder failed:', err));
    return;
  }

  app.order[phaseId] = ids;
  persist(app);
}

export function resetProgress() {
  if (app.readOnly) return;

  if (app.isSharedJourney && app.journeyId) {
    app.progress = {};
    resetJourneyProgress({ journeyId: app.journeyId }).catch((err) => console.warn('[shared-journey] resetProgress failed:', err));
    return;
  }

  app.progress = {};
  persist(app);
}