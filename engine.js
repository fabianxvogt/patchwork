export const SCHEMA_VERSION = 1;
export const EQUIPMENT = [
  { id: 'pa', name: 'PA system', quantity: 1, unitCost: 1800 },
  { id: 'lights', name: 'Lighting rig', quantity: 1, unitCost: 1200 },
  { id: 'monitors', name: 'Stage monitors', quantity: 2, unitCost: 300 },
  { id: 'backline', name: 'Shared backline', quantity: 1, unitCost: 900 },
  { id: 'power', name: 'Silent power', quantity: 1, unitCost: 650 }
];

const uid = (prefix = 'id') => `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36).slice(-4)}`;
const minutes = (time) => { const [h, m] = String(time).split(':').map(Number); return h * 60 + m; };
const validClock = (time) => /^\d\d:\d\d$/.test(String(time)) && Number.isInteger(minutes(time)) && minutes(time) >= 0 && minutes(time) <= 23 * 60 + 59 && minutes(time) % 60 < 60;
const clock = (value) => `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
const clone = (value) => JSON.parse(JSON.stringify(value));

export function makeExamplePlan() {
  return normalizePlan({
    schemaVersion: SCHEMA_VERSION, planId: uid('plan'), festivalName: 'Harbour Lights Festival', capacity: 1800, budgetLimit: 19000,
    events: [
      { id: 'act-moss', name: 'Moss & Mercury', stage: 'Harbour', start: '16:00', duration: 45, audience: 420, budget: 2600, equipment: ['pa', 'monitors'], pins: {} },
      { id: 'act-runa', name: 'Runa Vale', stage: 'Pier', start: '17:00', duration: 50, audience: 520, budget: 3100, equipment: ['pa', 'backline'], pins: {} },
      { id: 'act-signal', name: 'Signal Fires', stage: 'Harbour', start: '18:00', duration: 60, audience: 760, budget: 4200, equipment: ['pa', 'lights', 'monitors'], pins: {} },
      { id: 'act-juniper', name: 'Juniper Club', stage: 'Pier', start: '19:20', duration: 55, audience: 680, budget: 3600, equipment: ['pa', 'lights', 'backline'], pins: {} }
    ],
    settings: { changeRequest: 'balanced' }, revision: 0, lastRevision: null
  });
}

export function blankPlan() { return normalizePlan({ schemaVersion: SCHEMA_VERSION, planId: uid('plan'), festivalName: 'Untitled festival', capacity: 1000, budgetLimit: 12000, events: [], settings: { changeRequest: 'balanced' }, revision: 0, lastRevision: null }); }

export function normalizePlan(input) {
  if (!input || typeof input !== 'object') throw new Error('Project must be a JSON object.');
  if (input.schemaVersion !== SCHEMA_VERSION) throw new Error(`Unsupported project version. Expected ${SCHEMA_VERSION}.`);
  if (!Array.isArray(input.events)) throw new Error('Project events must be an array.');
  const events = input.events;
  if (events.length > 24) throw new Error('This browser plan is limited to 24 acts.');
  const ids = new Set();
  const cleanEvents = events.map((event, index) => {
    if (!event || typeof event !== 'object') throw new Error(`Act ${index + 1} is not an object.`);
    const eventId = String(event.id ?? '');
    if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(eventId) || ids.has(eventId)) throw new Error(`Act ${index + 1} has a duplicate or missing identity.`);
    ids.add(eventId);
    const duration = Number(event.duration); const audience = Number(event.audience); const budget = Number(event.budget);
    if (!event.name || !event.stage || !validClock(event.start) || !Number.isFinite(duration) || duration < 15 || duration > 180 || !Number.isFinite(audience) || audience < 0 || !Number.isFinite(budget) || budget < 0) throw new Error(`Act ${index + 1} has an invalid field.`);
    return { id: eventId, name: String(event.name).slice(0, 60), stage: event.stage === 'Pier' ? 'Pier' : 'Harbour', start: event.start, duration, audience, budget, equipment: Array.isArray(event.equipment) ? event.equipment.filter(id => EQUIPMENT.some(item => item.id === id)) : [], pins: { ...(event.pins || {}) } };
  });
  let lastRevision = null;
  if (input.lastRevision && typeof input.lastRevision === 'object') {
    try { const before = normalizePlan({ ...input.lastRevision.before, lastRevision: null }); const after = normalizePlan({ ...input.lastRevision.after, lastRevision: null }); lastRevision = { before, after, request: input.lastRevision.request }; } catch { throw new Error('Invalid undo history.'); }
  }
  return { schemaVersion: SCHEMA_VERSION, planId: String(input.planId || uid('plan')), festivalName: String(input.festivalName || 'Untitled festival').slice(0, 48), capacity: clamp(Number(input.capacity) || 1000, 100, 10000), budgetLimit: clamp(Number(input.budgetLimit) || 12000, 1000, 500000), events: cleanEvents, settings: { changeRequest: ['balanced', 'earlier', 'compact'].includes(input.settings?.changeRequest) ? input.settings.changeRequest : 'balanced' }, revision: Number(input.revision) || 0, lastRevision };
}

function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }

export function calculate(plan) {
  const schedule = [...plan.events].sort((a, b) => minutes(a.start) - minutes(b.start)).map(event => ({ ...event, end: clock(minutes(event.start) + event.duration) }));
  const equipment = EQUIPMENT.map(item => ({ ...item, usedBy: schedule.filter(event => event.equipment.includes(item.id)).map(event => ({ id: event.id, name: event.name, start: event.start, end: event.end })) }));
  const totalBudget = plan.events.reduce((sum, event) => sum + event.budget, 0) + 4550;
  const conflicts = [];
  for (const stage of ['Harbour', 'Pier']) {
    const staged = schedule.filter(event => event.stage === stage);
    for (let i = 1; i < staged.length; i++) if (minutes(staged[i].start) < minutes(staged[i - 1].end) + 15) conflicts.push({ type: 'stage', ids: [staged[i - 1].id, staged[i].id], message: `${staged[i - 1].name} and ${staged[i].name} need a 15 min changeover on ${stage}.` });
  }
  for (const item of equipment) {
    if (item.quantity !== 1) continue;
    const users = item.usedBy;
    for (let i = 1; i < users.length; i++) if (minutes(users[i].start) < minutes(users[i - 1].end)) conflicts.push({ type: 'equipment', ids: [users[i - 1].id, users[i].id], message: `${item.name} is double-booked between ${users[i - 1].name} and ${users[i].name}.` });
  }
  if (totalBudget > plan.budgetLimit) conflicts.push({ type: 'budget', ids: [], message: `The plan is €${totalBudget.toLocaleString()} against a €${plan.budgetLimit.toLocaleString()} limit.` });
  if (schedule.reduce((sum, event) => sum + event.audience, 0) > plan.capacity * 2) conflicts.push({ type: 'capacity', ids: [], message: 'The combined audience estimate exceeds two venue turns.' });
  return { schedule, equipment, totalBudget, conflicts, score: Math.max(0, Math.round(100 - conflicts.length * 14)) };
}

function nextFreeTime(events, stage, desired, duration) {
  let candidate = desired;
  const staged = events.filter(event => event.stage === stage).sort((a, b) => minutes(a.start) - minutes(b.start));
  for (const event of staged) { const eventEnd = minutes(event.start) + event.duration; if (candidate < minutes(event.start) && candidate + duration + 15 <= minutes(event.start)) break; else if (candidate < eventEnd + 15) candidate = eventEnd + 15; }
  return candidate;
}

export function regenerate(plan, request = plan.settings.changeRequest, { force = false } = {}) {
  const original = clone(plan); original.lastRevision = null;
  const draft = clone(plan); draft.lastRevision = null; draft.settings.changeRequest = request; draft.revision = plan.revision + 1;
  const sorted = [...draft.events].sort((a, b) => minutes(a.start) - minutes(b.start));
  const shiftable = sorted.filter(event => !event.pins.start && !event.pins.stage);
  if (request === 'balanced') {
    shiftable.forEach((event, index) => { if (index % 2 === 0) event.stage = 'Harbour'; else event.stage = 'Pier'; });
  } else if (request === 'earlier') {
    shiftable.forEach(event => { event.start = clock(Math.max(14 * 60, minutes(event.start) - 20)); });
  } else if (request === 'compact') {
    let cursor = 16 * 60;
    for (const event of sorted) if (!event.pins.start) { event.start = clock(cursor); cursor += event.duration + 15; }
  }
  for (const event of draft.events) if (!event.pins.start) event.start = clock(nextFreeTime(draft.events.filter(other => other.id !== event.id), event.stage, minutes(event.start), event.duration));
  const result = calculate(draft);
  const pinnedChanged = draft.events.some(event => { const before = original.events.find(item => item.id === event.id); return event.pins.start && event.start !== before?.start || event.pins.stage && event.stage !== before?.stage || event.pins.budget && event.budget !== before?.budget; });
  if ((pinnedChanged || result.conflicts.length) && !force) return { plan: draft, result, requiresResolution: true, original };
  if (result.conflicts.length && force) return { plan: draft, result, requiresResolution: true, original };
  draft.lastRevision = { before: original, after: clone(draft), request };
  return { plan: draft, result, requiresResolution: false, original };
}

export function togglePin(plan, eventId, field) { const next = clone(plan); const event = next.events.find(item => item.id === eventId); if (!event) return next; event.pins[field] = !event.pins[field]; if (!event.pins[field]) delete event.pins[field]; return next; }
export function updateEvent(plan, eventId, field, value) { const next = clone(plan); const event = next.events.find(item => item.id === eventId); if (!event) return next; event[field] = field === 'duration' || field === 'audience' || field === 'budget' ? Number(value) : field === 'equipment' ? (Array.isArray(value) ? value : String(value).split('|').filter(Boolean)) : value; return normalizePlan(next); }
export function addEvent(plan) { const next = clone(plan); next.events.push({ id: uid('act'), name: `New act ${next.events.length + 1}`, stage: 'Harbour', start: '20:30', duration: 45, audience: 300, budget: 1800, equipment: ['pa'], pins: {} }); return normalizePlan(next); }
export function deleteEvent(plan, eventId) { const next = clone(plan); next.events = next.events.filter(event => event.id !== eventId); return normalizePlan(next); }
export function duplicateEvent(plan, eventId) { const next = clone(plan); const original = next.events.find(event => event.id === eventId); if (!original || next.events.length >= 24) return next; next.events.push({ ...clone(original), id: uid('act'), name: `${original.name} copy`, start: clock(minutes(original.start) + original.duration + 15), pins: {} }); return normalizePlan(next); }

export function serialize(plan) { return JSON.stringify({ ...normalizePlan(plan), exportedAt: new Date().toISOString() }, null, 2); }
export function timetableCsv(plan) { const { schedule } = calculate(plan); return [['Time', 'End', 'Stage', 'Act', 'Audience', 'Budget'], ...schedule.map(event => [event.start, event.end, event.stage, event.name, event.audience, event.budget])].map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n'); }
