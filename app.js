import { makeExamplePlan, blankPlan, calculate, regenerate, togglePin, updateEvent, addEvent, deleteEvent, duplicateEvent, normalizePlan, serialize, timetableCsv } from './engine.js';

const STORAGE_KEY = 'patchwork-plan-v1';
let plan = loadPlan(); let activeTab = 'schedule'; let pendingRevision = null;
const $ = (id) => document.getElementById(id);
const state = { plan, result: calculate(plan) };

function loadPlan() { try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? normalizePlan(JSON.parse(raw)) : makeExamplePlan(); } catch { return makeExamplePlan(); } }
function save(silent = false) { try { localStorage.setItem(STORAGE_KEY, serialize(plan)); $('saveState').textContent = 'Saved just now'; if (!silent) toast('Plan saved to this browser.'); } catch { $('saveState').textContent = 'Save unavailable'; if (!silent) toast('Could not save locally. Export a project file to keep this plan.', 'error'); } }
function toast(message, tone = '') { const item = $('toast'); item.textContent = message; item.className = `toast show ${tone}`; window.setTimeout(() => { item.className = 'toast'; }, 2600); }
function download(filename, content, type) { const url = URL.createObjectURL(new Blob([content], { type })); const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url); }
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char])); }

function render() {
  state.result = calculate(plan); $('planTitle').textContent = plan.festivalName; $('festivalName').value = plan.festivalName; $('capacity').value = plan.capacity; $('budgetLimit').value = plan.budgetLimit;
  $('healthScore').textContent = `${state.result.score}%`; $('healthDetail').textContent = `${state.result.conflicts.length} conflict${state.result.conflicts.length === 1 ? '' : 's'} · ${plan.events.length} act${plan.events.length === 1 ? '' : 's'}`; $('scheduleCount').textContent = plan.events.length;
  $('undoRevision').disabled = !plan.lastRevision; renderView(); renderConflicts();
}

function renderView() {
  const meta = { schedule: ['GENERATED VIEW / SCHEDULE', 'The running order'], budget: ['GENERATED VIEW / BUDGET', 'Production ledger'], equipment: ['GENERATED VIEW / EQUIPMENT', 'Shared kit map'] }[activeTab]; $('viewKicker').textContent = meta[0]; $('viewTitle').textContent = meta[1];
  document.querySelectorAll('.tab').forEach(tab => { const active = tab.dataset.tab === activeTab; tab.classList.toggle('active', active); tab.setAttribute('aria-selected', active); });
  if (activeTab === 'schedule') $('viewContent').innerHTML = renderSchedule(); if (activeTab === 'budget') $('viewContent').innerHTML = renderBudget(); if (activeTab === 'equipment') $('viewContent').innerHTML = renderEquipment();
}

function pinButton(event, field, label) { const on = Boolean(event.pins[field]); return `<button class="pin-button ${on ? 'pinned' : ''}" data-pin="${event.id}" data-field="${field}" aria-label="${on ? 'Unpin' : 'Pin'} ${label} for ${escapeHtml(event.name)}">${on ? '●' : '○'} ${label}</button>`; }
function renderSchedule() {
  if (!state.result.schedule.length) return `<div class="empty-state"><span class="empty-glyph">＋</span><h4>A blank canvas</h4><p>Add your first act to start a linked schedule.</p><button class="button button-primary" data-add-event>Add an act</button></div>`;
  return `<div class="table-wrap"><table><thead><tr><th>Time</th><th>Act</th><th>Stage</th><th>Run</th><th>Decisions</th><th aria-label="Actions"></th></tr></thead><tbody>${state.result.schedule.map(event => `<tr data-event-id="${event.id}"><td><input class="inline-input time-input" data-edit="start" value="${event.start}" aria-label="Start time for ${escapeHtml(event.name)}" /></td><td><input class="inline-input act-name" data-edit="name" value="${escapeHtml(event.name)}" aria-label="Name of ${escapeHtml(event.name)}" /><label class="sr-only" for="audience-${event.id}">Audience estimate for ${escapeHtml(event.name)}</label><input id="audience-${event.id}" class="inline-input audience-input" type="number" min="0" data-edit="audience" value="${event.audience}" aria-label="Audience estimate for ${escapeHtml(event.name)}" /><span class="subline">audience estimate</span></td><td><select class="inline-select" data-edit="stage" aria-label="Stage for ${escapeHtml(event.name)}"><option ${event.stage === 'Harbour' ? 'selected' : ''}>Harbour</option><option ${event.stage === 'Pier' ? 'selected' : ''}>Pier</option></select></td><td><input class="inline-input duration-input" type="number" min="15" max="180" data-edit="duration" value="${event.duration}" aria-label="Duration for ${escapeHtml(event.name)}" /><span class="unit">min</span></td><td class="pin-stack">${pinButton(event, 'start', 'time')}${pinButton(event, 'stage', 'stage')}${pinButton(event, 'budget', 'budget')}</td><td><div class="row-actions"><button class="icon-button" data-duplicate="${event.id}" aria-label="Duplicate ${escapeHtml(event.name)}">⧉</button><button class="icon-button danger" data-delete="${event.id}" aria-label="Delete ${escapeHtml(event.name)}">×</button></div></td></tr>`).join('')}</tbody></table></div><div class="table-footer"><span>${state.result.conflicts.length ? 'Resolve conflicts before publishing a timetable.' : 'All linked views are in sync.'}</span><button class="text-button" data-add-event ${plan.events.length >= 24 ? 'disabled' : ''}>＋ Add act</button></div>`;
}
function renderBudget() { return `<div class="budget-summary"><div class="metric-card"><span>Total plan</span><strong>€${state.result.totalBudget.toLocaleString()}</strong><small>including €4,550 shared setup</small></div><div class="metric-card"><span>Available</span><strong class="${state.result.totalBudget > plan.budgetLimit ? 'over' : ''}">€${Math.max(0, plan.budgetLimit - state.result.totalBudget).toLocaleString()}</strong><small>of €${plan.budgetLimit.toLocaleString()} ceiling</small></div></div><div class="budget-list">${[...plan.events].sort((a,b)=>b.budget-a.budget).map(event => `<div class="budget-row" data-event-id="${event.id}"><div><strong>${escapeHtml(event.name)}</strong><span>${escapeHtml(event.stage)} · ${event.duration} min</span></div><div class="budget-value"><label class="sr-only" for="budget-${event.id}">Budget for ${escapeHtml(event.name)}</label><span>€</span><input id="budget-${event.id}" class="inline-input duration-input" type="number" min="0" step="100" data-edit="budget" value="${event.budget}" /><span>${pinButton(event, 'budget', 'pin')}</span></div></div>`).join('')}<div class="budget-row shared"><div><strong>Shared production setup</strong><span>PA, power, site operations</span></div><strong>€4,550</strong></div></div>`; }
function renderEquipment() { return `<div class="equipment-grid">${state.result.equipment.map(item => `<article class="equipment-card"><div class="equipment-icon">${item.id === 'pa' ? '◉' : item.id === 'lights' ? '✦' : item.id === 'backline' ? '♫' : item.id === 'power' ? '⌁' : '▦'}</div><div><h4>${item.name}</h4><p>€${item.unitCost.toLocaleString()} · ${item.quantity} available</p></div><div class="kit-users">${item.usedBy.length ? item.usedBy.map(user => `<span><b>${user.start}</b> ${escapeHtml(user.name)}</span>`).join('') : '<span class="muted">Not assigned</span>'}</div></article>`).join('')}</div><div class="equipment-editor"><p class="eyebrow">ASSIGNMENTS / EDITABLE</p><h4>Kit by act</h4>${plan.events.map(event => `<div class="equipment-edit-row" data-event-id="${event.id}"><label for="kit-${event.id}">${escapeHtml(event.name)}</label><select id="kit-${event.id}" class="inline-select equipment-select" multiple data-edit="equipment" aria-label="Equipment for ${escapeHtml(event.name)}">${['pa','lights','monitors','backline','power'].map(id => `<option value="${id}" ${event.equipment.includes(id) ? 'selected' : ''}>${id}</option>`).join('')}</select></div>`).join('')}</div>`; }
function renderConflicts() { const panel = $('conflictPanel'); if (!state.result.conflicts.length) { panel.hidden = true; return; } panel.hidden = false; $('conflictTitle').textContent = `${state.result.conflicts.length} decision${state.result.conflicts.length === 1 ? '' : 's'} needed`; $('conflictCopy').textContent = state.result.conflicts.slice(0, 2).map(item => item.message).join(' '); }

function editField(target) { const row = target.closest('[data-event-id]'); if (!row) return; const id = row.dataset.eventId; try { const value = target.dataset.edit === 'equipment' ? [...target.selectedOptions].map(option => option.value) : target.value; plan = updateEvent(plan, id, target.dataset.edit, value); state.plan = plan; render(); save(true); } catch (error) { toast(error.message, 'error'); render(); } }
document.addEventListener('click', event => {
  const tab = event.target.closest('[data-tab]'); if (tab) { activeTab = tab.dataset.tab; render(); return; }
  const pin = event.target.closest('[data-pin]'); if (pin) { plan = togglePin(plan, pin.dataset.pin, pin.dataset.field); state.plan = plan; render(); save(true); toast(`${pin.dataset.field} ${plan.events.find(item => item.id === pin.dataset.pin)?.pins[pin.dataset.field] ? 'pinned' : 'unpinned'}.`); return; }
  const duplicate = event.target.closest('[data-duplicate]'); if (duplicate) { plan = duplicateEvent(plan, duplicate.dataset.duplicate); state.plan = plan; render(); save(true); toast('Act duplicated with a new identity.'); return; }
  const remove = event.target.closest('[data-delete]'); if (remove) { const target = plan.events.find(item => item.id === remove.dataset.delete); if (target && confirm(`Delete ${target.name}?`)) { plan = deleteEvent(plan, target.id); state.plan = plan; render(); save(true); toast('Act deleted.'); } return; }
  if (event.target.closest('[data-add-event]')) { plan = addEvent(plan); state.plan = plan; render(); save(true); toast('Act added.'); return; }
});
document.addEventListener('change', event => { if (event.target.dataset.edit) editField(event.target); });
document.addEventListener('focusout', event => { if (event.target.dataset.edit && event.target.tagName === 'INPUT') editField(event.target); });
$('festivalName').addEventListener('change', event => { plan.festivalName = event.target.value.trim() || 'Untitled festival'; render(); save(true); });
$('capacity').addEventListener('change', event => { plan.capacity = Math.min(10000, Math.max(100, Number(event.target.value) || 1000)); render(); save(true); });
$('budgetLimit').addEventListener('change', event => { plan.budgetLimit = Math.min(500000, Math.max(1000, Number(event.target.value) || 12000)); render(); save(true); });
$('changeRequest').addEventListener('change', event => { plan.settings.changeRequest = event.target.value; save(true); });
$('regenerate').addEventListener('click', () => {
  if ($('regenerate').dataset.accept === 'true') { $('regenerate').dataset.accept = ''; $('regenerate').textContent = 'Regenerate plan'; $('notice').hidden = true; save(true); toast(`Revision ${plan.revision} accepted.`); return; }
  pendingRevision = regenerate(plan, $('changeRequest').value);
  if (pendingRevision.requiresResolution) { $('notice').hidden = false; $('notice').textContent = 'This change would move a pinned decision. Resolve the conflict to preview it, or unpin the decision first.'; toast('Pinned decisions need a resolution.', 'error'); return; }
  plan = pendingRevision.plan; state.plan = plan; $('notice').hidden = false; $('notice').textContent = `Revision ${plan.revision} ready — inspect the linked views, then accept it.`; $('regenerate').textContent = 'Accept revision'; $('regenerate').dataset.accept = 'true'; render();
});
$('resolveConflicts').addEventListener('click', () => {
  pendingRevision = regenerate(plan, $('changeRequest').value, { force: true });
  if (pendingRevision.result.conflicts.some(conflict => conflict.type === 'budget')) pendingRevision.plan.budgetLimit = Math.max(pendingRevision.plan.budgetLimit, pendingRevision.result.totalBudget);
  const checked = calculate(pendingRevision.plan);
  if (checked.conflicts.length) { $('notice').hidden = false; $('notice').textContent = `Still unresolved: ${checked.conflicts[0].message}`; toast('The engine needs another decision.', 'error'); return; }
  pendingRevision.plan.lastRevision = { before: pendingRevision.original, after: JSON.parse(JSON.stringify(pendingRevision.plan)), request: $('changeRequest').value };
  plan = pendingRevision.plan; state.plan = plan; $('notice').hidden = false; $('notice').textContent = 'Conflict resolved by keeping pinned values and moving the flexible acts.'; render(); save(true); toast('Revision accepted with pins preserved.');
});
$('undoRevision').addEventListener('click', () => { if (!plan.lastRevision) return; plan = normalizePlan(plan.lastRevision.before); plan.lastRevision = null; state.plan = plan; $('notice').hidden = false; $('notice').textContent = 'Whole revision undone. All linked views are back to the previous plan.'; render(); save(true); toast('Revision undone.'); });
$('savePlan').addEventListener('click', () => save());
$('newPlan').addEventListener('click', () => { if (confirm('Start a blank plan? Your current plan is saved locally.')) { plan = blankPlan(); state.plan = plan; render(); save(true); toast('Blank plan ready.'); } });
$('resetPlan').addEventListener('click', () => { if (confirm('Reset to the Harbour Lights example?')) { plan = makeExamplePlan(); state.plan = plan; render(); save(true); toast('Example restored.'); } });
$('exportProject').addEventListener('click', () => { download(`${plan.festivalName.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'patchwork-plan'}.patchwork.json`, serialize(plan), 'application/json'); toast('Project exported.'); });
$('timetableExport').addEventListener('click', () => { download('patchwork-timetable.csv', timetableCsv(plan), 'text/csv'); toast('Timetable CSV exported.'); });
$('importProject').addEventListener('click', () => $('filePicker').click());
function importText(raw) { try { const imported = normalizePlan(JSON.parse(raw)); plan = imported; pendingRevision = null; state.plan = plan; render(); save(true); toast('Project reopened successfully.'); } catch (error) { toast(`Import failed: ${error.message} Current plan is unchanged.`, 'error'); } }
$('pasteImport').addEventListener('click', () => importText($('importText').value));
$('filePicker').addEventListener('change', async event => { const file = event.target.files[0]; if (!file) return; importText(await file.text()); event.target.value = ''; });
window.addEventListener('beforeunload', () => save(true));
render();
