import data from './data/trophies.json' with { type: 'json' };
import { drawRoadmap } from './roadmap.js';

const { trophies, sourceIndex } = data;
const trophyIds = new Set(trophies.map(trophy => trophy.id));
const storageKey = 'leonida-ledger-v1';
const $ = id => document.getElementById(id);
const capitalize = word => word[0].toUpperCase() + word.slice(1);
const grades = ['platinum', 'gold', 'silver', 'bronze'];
const kinds = ['All', 'Story', 'Missable', 'Collectibles', 'Activities', 'Completion', 'Online'];
const riskLabels = { possible: 'Possible missable', route: 'Timed route option', unknown: 'Trigger unconfirmed' };
const state = { earned: new Set(), spoilers: false, kind: 'All', selected: 1, view: 'tracker' };

function node(tag, cls, value) {
  const item = document.createElement(tag);
  if (cls) item.className = cls;
  if (value !== undefined) item.textContent = value;
  return item;
}

function validateBackup(backup) {
  if (!backup || backup.format !== 'leonida-ledger/v1' || !Array.isArray(backup.earned) ||
      backup.earned.length > trophyIds.size || !backup.earned.every(id => trophyIds.has(id)) ||
      new Set(backup.earned).size !== backup.earned.length || typeof backup.spoilers !== 'boolean') {
    throw new Error('Invalid Ledger backup');
  }
  return backup;
}

function loadProgress() {
  try {
    const stored = localStorage.getItem(storageKey);
    if (!stored) return;
    const backup = validateBackup(JSON.parse(stored));
    state.earned = new Set(backup.earned);
    state.spoilers = backup.spoilers;
  } catch {
    $('save-status').textContent = 'Saved progress unavailable';
  }
}

function backupData() {
  return { format: 'leonida-ledger/v1', earned: [...state.earned].sort((a, b) => a - b), spoilers: state.spoilers };
}

function saveProgress() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(backupData()));
    $('save-status').textContent = 'Saved on this device';
  } catch {
    $('save-status').textContent = 'Storage unavailable · export to keep';
  }
}

function isMasked(trophy) {
  return state.spoilers && trophy.kind === 'Story' && !state.earned.has(trophy.id);
}

function maskedName(trophy) {
  return `Hidden story trophy #${String(trophy.id).padStart(2, '0')}`;
}

function matchesKind(trophy, kind) {
  if (kind === 'All') return true;
  if (kind === 'Missable') return ['possible', 'route'].includes(trophy.missable);
  return trophy.kind === kind;
}

function filterTrophies() {
  const query = $('search').value.trim().toLocaleLowerCase();
  const grade = $('grade').value;
  const status = $('status').value;
  return trophies.filter(trophy => {
    if (!matchesKind(trophy, state.kind) || (grade !== 'all' && trophy.grade !== grade)) return false;
    if (status !== 'all' && state.earned.has(trophy.id) !== (status === 'earned')) return false;
    const text = isMasked(trophy) ? maskedName(trophy) : `${trophy.name} ${trophy.description}`;
    return !query || text.toLocaleLowerCase().includes(query);
  });
}

function drawProgress() {
  const earned = state.earned.size;
  $('progress-count').textContent = `${earned} / ${trophies.length} trophies earned`;
  $('percent').textContent = `${Math.round(100 * earned / trophies.length)}%`;
  $('progress').value = earned;
}

function gradeBadge(grade) {
  return node('span', `grade ${grade}`, capitalize(grade));
}

function setEarned(id, earned) {
  if (earned) state.earned.add(id);
  else state.earned.delete(id);
  saveProgress();
  render();
}

function trophyRow(trophy) {
  const masked = isMasked(trophy);
  const name = masked ? maskedName(trophy) : trophy.name;
  const row = node('li', 'trophy-row');
  row.dataset.id = trophy.id;
  const box = node('input', 'tick');
  box.type = 'checkbox';
  box.checked = state.earned.has(trophy.id);
  box.setAttribute('aria-label', `Mark earned: ${name}`);
  box.addEventListener('change', () => setEarned(trophy.id, box.checked));
  const open = node('button', 'row-open');
  open.setAttribute('aria-pressed', String(state.selected === trophy.id));
  open.append(node('strong', '', name), node('span', 'official', masked ? 'Revealed when marked earned.' : trophy.description));
  open.addEventListener('click', () => {
    state.selected = trophy.id;
    render();
    if (matchMedia('(max-width: 760px)').matches) $('guide').scrollIntoView({ block: 'start' });
  });
  row.append(box, open, gradeBadge(trophy.grade));
  if (!masked && ['possible', 'route'].includes(trophy.missable)) row.append(node('span', 'row-risk', riskLabels[trophy.missable]));
  return row;
}

function sourcePill(key) {
  const source = sourceIndex[key];
  const pill = node(source.url ? 'a' : 'span', 'source', source.name + (source.url ? ' ↗' : ''));
  pill.title = source.detail;
  if (source.url) {
    pill.href = source.url;
    pill.target = '_blank';
    pill.rel = 'noopener noreferrer';
  }
  return pill;
}

function drawGuide(trophy) {
  const panel = $('guide');
  panel.replaceChildren();
  if (!trophy) {
    panel.append(node('p', 'eyebrow', 'FIELD GUIDE'), node('h2', '', 'No matching trophies'));
    return;
  }
  const masked = isMasked(trophy);
  const isEarned = state.earned.has(trophy.id);
  const ordinal = String(trophy.id).padStart(2, '0');
  const label = node('div', 'guide-meta');
  label.append(node('span', 'eyebrow', `FIELD GUIDE / ${ordinal}`), gradeBadge(trophy.grade));
  panel.append(label, node('h2', '', masked ? maskedName(trophy) : trophy.name));
  panel.append(node('p', 'guide-official', masked ? 'Official description and guide are hidden.' : trophy.description));
  if (!masked) {
    const risk = riskLabels[trophy.missable];
    panel.append(node('span', `risk ${risk ? 'caution' : ''}`, risk || (trophy.chapter ? 'Automatic story unlock' : 'No known cutoff')));
    panel.append(node('h3', 'eyebrow how', 'HOW TO UNLOCK'), node('p', 'guide-copy', trophy.guide));
    const sources = node('div', 'sources');
    sources.append(...trophy.sources.map(sourcePill));
    panel.append(node('h3', 'eyebrow source-title', 'SOURCES'), sources);
  }
  const actions = node('div', 'guide-actions');
  const mark = node('button', 'primary', isEarned ? '✓ Earned · undo' : '✓ Mark earned');
  mark.id = 'mark-earned';
  mark.addEventListener('click', () => setEarned(trophy.id, !isEarned));
  const roadmap = node('button', 'secondary', 'Platinum route →');
  roadmap.addEventListener('click', () => switchView('roadmap', true));
  actions.append(mark, roadmap);
  panel.append(actions);
}

function render() {
  drawProgress();
  $('spoilers').checked = state.spoilers;
  $('tracker').hidden = state.view !== 'tracker';
  $('roadmap').hidden = state.view !== 'roadmap';
  for (const view of ['tracker', 'roadmap']) $(`${view}-view`).setAttribute('aria-pressed', String(state.view === view));
  if (state.view === 'roadmap') {
    drawRoadmap($('roadmap'), { node, trophies, isMasked, maskedName, earned: state.earned, sourcePill, openTrophy });
    return;
  }
  const rows = $('rows');
  const active = document.activeElement;
  const focusedRow = active.closest('.trophy-row');
  const focusClass = active.classList.contains('tick') ? '.tick' : '.row-open';
  const visible = filterTrophies();
  if (!visible.some(trophy => trophy.id === state.selected)) state.selected = visible[0]?.id;
  const scroll = rows.scrollTop;
  rows.replaceChildren(...visible.map(trophyRow));
  rows.scrollTop = scroll;
  if (!visible.length) rows.append(node('li', 'empty', state.kind === 'Online' ? 'No online trophies on the PS5 list.' : 'No trophies match these filters.'));
  $('match-count').textContent = `${visible.length} / ${trophies.length} shown`;
  for (const button of $('kinds').children) button.setAttribute('aria-pressed', String(state.kind === button.dataset.kind));
  drawGuide(visible.find(trophy => trophy.id === state.selected));
  if (focusedRow) (rows.querySelector(`[data-id="${focusedRow.dataset.id}"] ${focusClass}`) || $('search')).focus({ preventScroll: true });
  if (active.id === 'mark-earned') ($('mark-earned') || $('search')).focus({ preventScroll: true });
}

function switchView(view, focus = false) {
  state.view = view;
  render();
  if (focus) $(`${view}-view`).focus();
}

function openTrophy(id) {
  state.kind = 'All';
  state.selected = id;
  $('grade').value = 'all';
  $('status').value = 'all';
  $('search').value = '';
  switchView('tracker');
  $('rows').querySelector(`[data-id="${id}"] .row-open`)?.focus();
}

function notify(text) {
  $('notice').hidden = false;
  $('notice').textContent = text;
}

function exportProgress() {
  const url = URL.createObjectURL(new Blob([JSON.stringify(backupData(), null, 2) + '\n'], { type: 'application/json' }));
  const link = node('a');
  link.href = url;
  link.download = 'leonida-ledger-progress.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  notify('Progress exported.');
}

async function importProgress() {
  const file = $('import').files[0];
  $('import').value = '';
  if (!file) return;
  try {
    if (file.size > 16384) throw new Error('File too large');
    const backup = validateBackup(JSON.parse(await file.text()));
    if (state.earned.size && !window.confirm(`Replace your current checklist with ${backup.earned.length} earned trophies?`)) return;
    state.earned = new Set(backup.earned);
    state.spoilers = backup.spoilers;
    saveProgress();
    render();
    notify(`Imported ${state.earned.size} earned trophies.`);
  } catch {
    notify('Could not import this file. Choose a valid Leonida Ledger JSON backup.');
  }
}

for (const grade of grades) {
  const amount = trophies.filter(trophy => trophy.grade === grade).length;
  $('grade-totals').append(node('span', `grade ${grade}`, `${amount} ${capitalize(grade)}`));
}
for (const kind of kinds) {
  const button = node('button', '', kind);
  button.dataset.kind = kind;
  button.title = `${trophies.filter(trophy => matchesKind(trophy, kind)).length} trophies`;
  button.addEventListener('click', () => { state.kind = kind; $('rows').scrollTop = 0; render(); });
  $('kinds').append(button);
}

loadProgress();
const query = new URLSearchParams(location.search);
if (query.get('view') === 'roadmap') state.view = 'roadmap';
if (trophyIds.has(Number(query.get('trophy')))) state.selected = Number(query.get('trophy'));
if (kinds.includes(query.get('kind'))) state.kind = query.get('kind');
if (query.get('spoilers') === '1') state.spoilers = true;
$('tracker-view').addEventListener('click', () => switchView('tracker'));
$('roadmap-view').addEventListener('click', () => switchView('roadmap'));
$('search').addEventListener('input', () => { $('rows').scrollTop = 0; render(); });
for (const id of ['grade', 'status']) $(id).addEventListener('change', () => { $('rows').scrollTop = 0; render(); });
$('spoilers').addEventListener('change', () => { state.spoilers = $('spoilers').checked; saveProgress(); render(); });
$('export').addEventListener('click', exportProgress);
$('import-button').addEventListener('click', () => $('import').click());
$('import').addEventListener('change', importProgress);
render();
