// Vice Panels editor: wires the controls to the cover renderer (./cover.js), manages the
// photo pool and per-panel slots, handles canvas selection/dragging, PNG export, and the
// ?shot= staging scenes (./shots.js).
import { drawCover, panelAt, LAYOUTS, SIZES } from './cover.js';
import { parseShotQuery, markShotReady } from './shots.js';

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const poolEl = document.getElementById('pool');
const panelLabel = document.getElementById('panelLabel');
const zoomRange = document.getElementById('zoomRange');
const captionInput = document.getElementById('captionInput');
const subtitleInput = document.getElementById('subtitleInput');

const state = {
  size: 'square',
  layout: 'hero',
  grade: 'sunset',
  letterStyle: 'vice',
  caption: captionInput.value,
  subtitle: subtitleInput.value,
  selected: 0,
  coverMode: false,
};

/** Loaded photos: [{ id, name, img, thumbUrl }]. */
const pool = [];
let nextPhotoId = 1;
/** Per-panel slots, parallel to the current layout's panels: [{ photoId, zoom, ox, oy }]. */
let slots = [];

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function panelCount() {
  return LAYOUTS[state.layout].panels().length;
}

function ensureSlots() {
  const n = panelCount();
  while (slots.length < n) slots.push({ photoId: null, zoom: 1, ox: 0, oy: 0 });
  slots.length = n;
  if (state.selected >= n) state.selected = 0;
}

function photoById(id) {
  return pool.find((p) => p.id === id) || null;
}

function render() {
  ensureSlots();
  drawCover(canvas, {
    layout: state.layout,
    grade: state.grade,
    caption: state.caption,
    subtitle: state.subtitle,
    letterStyle: state.letterStyle,
    selected: state.selected,
    showSelection: !state.coverMode,
    panels: slots.map((s) => {
      const photo = photoById(s.photoId);
      return { img: photo ? photo.img : null, zoom: s.zoom, ox: s.ox, oy: s.oy };
    }),
  });
  panelLabel.textContent = `Panel ${state.selected + 1} of ${panelCount()}`;
  const slot = slots[state.selected];
  if (slot) zoomRange.value = String(slot.zoom);
}

function renderPool() {
  poolEl.innerHTML = '';
  const activeId = slots[state.selected] ? slots[state.selected].photoId : null;
  for (const photo of pool) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'thumb' + (photo.id === activeId ? ' active' : '');
    btn.title = `${photo.name} — click to put it in panel ${state.selected + 1}`;
    const img = document.createElement('img');
    img.src = photo.thumbUrl;
    img.alt = photo.name;
    btn.appendChild(img);
    btn.addEventListener('click', () => {
      slots[state.selected].photoId = photo.id;
      render();
      renderPool();
      setStatus(`${photo.name} is in panel ${state.selected + 1}.`);
    });
    poolEl.appendChild(btn);
  }
}

function setStatus(text) {
  status.textContent = text;
}

async function addSample(name) {
  const existing = pool.find((p) => p.name === name);
  if (existing) return existing;
  const url = `samples/${name}.jpg`;
  const img = await loadImage(url);
  const photo = { id: nextPhotoId++, name, img, thumbUrl: url };
  pool.push(photo);
  renderPool();
  return photo;
}

async function addFile(file) {
  const url = URL.createObjectURL(file);
  const img = await loadImage(url);
  const photo = { id: nextPhotoId++, name: file.name.replace(/\.[^.]+$/, ''), img, thumbUrl: url };
  pool.push(photo);
  renderPool();
  return photo;
}

/** Assigns a photo to every panel (the one-photo-everywhere look), or one per panel when given a list. */
function fillPanels(photos) {
  ensureSlots();
  slots.forEach((slot, i) => {
    slot.photoId = photos[Math.min(i, photos.length - 1)].id;
  });
  render();
  renderPool();
}

function setSize(key) {
  if (!SIZES[key]) return;
  state.size = key;
  canvas.width = SIZES[key].w;
  canvas.height = SIZES[key].h;
  markActive('sizeBtns', 'size', key);
  render();
}

function markActive(containerId, attr, value) {
  document.querySelectorAll(`#${containerId} .opt`).forEach((btn) => {
    btn.classList.toggle('active', btn.dataset[attr] === value);
  });
}

/* ---------- controls ---------- */
document.getElementById('fileInput').addEventListener('change', async (e) => {
  const files = [...e.target.files];
  if (!files.length) return;
  const added = [];
  for (const file of files) added.push(await addFile(file));
  if (added.length === 1) {
    slots[state.selected].photoId = added[0].id;
  } else {
    fillPanels(added);
  }
  render();
  renderPool();
  setStatus(`${added.length} photo${added.length > 1 ? 's' : ''} loaded — photos never leave your machine.`);
});

document.getElementById('samplePier').addEventListener('click', async () => {
  const photo = await addSample('pier');
  slots[state.selected].photoId = photo.id;
  render(); renderPool();
});
document.getElementById('sampleBlvd').addEventListener('click', async () => {
  const photo = await addSample('boulevard');
  slots[state.selected].photoId = photo.id;
  render(); renderPool();
});
document.getElementById('fillAll').addEventListener('click', () => {
  const current = photoById(slots[state.selected].photoId) || pool[0];
  if (!current) { setStatus('Load a photo first.'); return; }
  fillPanels([current]);
  setStatus(`Every panel now shows ${current.name}.`);
});

document.getElementById('layoutBtns').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-layout]');
  if (!btn) return;
  state.layout = btn.dataset.layout;
  markActive('layoutBtns', 'layout', state.layout);
  ensureSlots();
  render(); renderPool();
});
document.getElementById('gradeBtns').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-grade]');
  if (!btn) return;
  state.grade = btn.dataset.grade;
  markActive('gradeBtns', 'grade', state.grade);
  render();
});
document.getElementById('letterBtns').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-letter]');
  if (!btn) return;
  state.letterStyle = btn.dataset.letter;
  markActive('letterBtns', 'letter', state.letterStyle);
  render();
});
document.getElementById('sizeBtns').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-size]');
  if (!btn) return;
  setSize(btn.dataset.size);
});

zoomRange.addEventListener('input', () => {
  slots[state.selected].zoom = Number(zoomRange.value);
  render();
});
document.getElementById('resetPanel').addEventListener('click', () => {
  const slot = slots[state.selected];
  slot.zoom = 1; slot.ox = 0; slot.oy = 0;
  render();
});
captionInput.addEventListener('input', () => { state.caption = captionInput.value; render(); });
subtitleInput.addEventListener('input', () => { state.subtitle = subtitleInput.value; render(); });

document.getElementById('exportBtn').addEventListener('click', () => {
  const wasCover = state.coverMode;
  state.coverMode = true; // render once without the selection ring
  render();
  canvas.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-panels-${canvas.width}x${canvas.height}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    setStatus(`Saved vice-panels-${canvas.width}x${canvas.height}.png`);
    state.coverMode = wasCover;
    render();
  }, 'image/png');
});

/* ---------- canvas selection + drag ---------- */
let drag = null;
function canvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  return { ux: (e.clientX - rect.left) / rect.width, uy: (e.clientY - rect.top) / rect.height, rect };
}
canvas.addEventListener('pointerdown', (e) => {
  const { ux, uy } = canvasPoint(e);
  const hit = panelAt(state.layout, ux, uy);
  if (hit >= 0) state.selected = hit;
  drag = { x: e.clientX, y: e.clientY };
  canvas.setPointerCapture(e.pointerId);
  canvas.classList.add('dragging');
  render(); renderPool();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const rect = canvas.getBoundingClientRect();
  const slot = slots[state.selected];
  slot.ox = Math.max(-1, Math.min(1, slot.ox + ((e.clientX - drag.x) / rect.width) * 2.2));
  slot.oy = Math.max(-1, Math.min(1, slot.oy + ((e.clientY - drag.y) / rect.height) * 2.2));
  drag = { x: e.clientX, y: e.clientY };
  render();
});
const endDrag = () => { drag = null; canvas.classList.remove('dragging'); };
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);

/* ---------- drag and drop files anywhere on the stage ---------- */
const stage = document.getElementById('stage');
stage.addEventListener('dragover', (e) => e.preventDefault());
stage.addEventListener('drop', async (e) => {
  e.preventDefault();
  const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith('image/'));
  if (!files.length) return;
  const added = [];
  for (const file of files) added.push(await addFile(file));
  fillPanels(added);
  setStatus(`${added.length} photo${added.length > 1 ? 's' : ''} loaded from the drop.`);
});

/* ---------- startup: staging scene or a friendly default ---------- */
async function start() {
  const shot = parseShotQuery();
  if (shot) {
    state.coverMode = shot.mode === 'cover';
    if (state.coverMode) document.body.classList.add('shot-cover');
    if (shot.mode === 'editor') document.body.classList.add('shot-editor');
    state.layout = shot.layout;
    state.grade = shot.grade;
    state.letterStyle = shot.letterStyle;
    state.caption = shot.caption;
    state.subtitle = shot.subtitle;
    captionInput.value = shot.caption;
    subtitleInput.value = shot.subtitle;
    markActive('layoutBtns', 'layout', state.layout);
    markActive('gradeBtns', 'grade', state.grade);
    markActive('letterBtns', 'letter', state.letterStyle);
    setSize(shot.size);
    const photos = [];
    for (const name of shot.photos) photos.push(await addSample(name));
    fillPanels(photos);
    markShotReady();
    return;
  }
  const pier = await addSample('pier');
  const boulevard = await addSample('boulevard');
  fillPanels([pier, boulevard, pier]);
  setStatus('Samples loaded — add your own photos to make it yours.');
}

ensureSlots();
render();
start();
