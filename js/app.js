// app.js — Main entry point
// Uses ES modules — served from a real server (not file://)

import { getAllSongs, getMeta } from './db.js';
import { syncSongs, seedIfEmpty } from './sync.js';
import { initSearch, search, filterByCategories, getCategories } from './search.js';
import { renderSong, renderSongList, renderSearchResults, CATEGORY_LABELS } from './render.js';
import { initInstall, triggerInstall, getUninstallInstructions, getIOSInstallInstructions, isIOS } from './install.js';

// ─── State ───────────────────────────────────────────────────────────────────
const state = {
  songs: [],
  categories: [],
  activeCategories: [],         // [] = all
  viewMode: 'text',             // 'text' | 'chords-inline' | 'chords-split'
  currentSong: null,
  searchQuery: '',
  installType: null             // 'native' | 'ios' | null
};

// Load persisted settings
function loadSettings() {
  state.viewMode = localStorage.getItem('viewMode') || 'text';
  try {
    state.activeCategories = JSON.parse(localStorage.getItem('activeCategories')) || [];
  } catch { state.activeCategories = []; }
}

function saveSettings() {
  localStorage.setItem('viewMode', state.viewMode);
  localStorage.setItem('activeCategories', JSON.stringify(state.activeCategories));
}

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

const els = {
  listView: $('list-view'),
  songView: $('song-view'),
  searchInput: $('search-input'),
  searchClear: $('search-clear'),
  content: $('content'),
  toast: $('toast'),
  menuBtn: $('menu-btn'),
  drawer: $('drawer'),
  drawerClose: $('drawer-close'),
  overlay: $('overlay'),
  installSection: $('install-section'),
  installBtn: $('install-btn'),
  uninstallBtn: $('uninstall-btn'),
  syncBtn: $('sync-btn'),
  syncStatus: $('sync-status'),
  modeSelect: $('mode-select'),
  categoryFilters: $('category-filters'),
  backBtn: $('back-btn'),
  songViewContent: $('song-view-content'),
  offlineBanner: $('offline-banner')
};

// ─── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  loadSettings();
  registerServiceWorker();

  // Seed from local JSON if first run
  await seedIfEmpty();

  // Load songs from DB
  state.songs = await getAllSongs();
  state.categories = getCategories(state.songs);
  initSearch(state.songs);

  renderCategoryFilters();
  applyModeSelect();
  showList();

  // Try to sync if online
  if (navigator.onLine) {
    doSync({ silent: true });
  }

  // Online/offline banner
  window.addEventListener('online', () => {
    els.offlineBanner.hidden = true;
    doSync({ silent: false });
  });
  window.addEventListener('offline', () => {
    els.offlineBanner.hidden = false;
  });
  els.offlineBanner.hidden = navigator.onLine;

  // Init PWA install
  initInstall({
    onInstallAvailable: ({ type }) => {
      state.installType = type;
      els.installSection.hidden = false;
      els.installBtn.hidden = false;
    },
    onInstalled: () => {
      els.installSection.hidden = false;
      els.installBtn.hidden = true;
      els.uninstallBtn.hidden = false;
    },
    onInstallHide: () => {
      els.installBtn.hidden = true;
    }
  });

  bindEvents();
}

// ─── Service Worker ───────────────────────────────────────────────────────────
function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('./sw.js').catch(console.error);
}

// ─── Sync ─────────────────────────────────────────────────────────────────────
async function doSync({ silent = false } = {}) {
  els.syncBtn.classList.add('spinning');
  const lastSync = await getMeta('lastSync');
  if (lastSync) {
    els.syncStatus.textContent = `Ostatnia sync: ${new Date(lastSync).toLocaleDateString('pl')}`;
  }

  await syncSongs({
    onUpdated: async ({ version, count }) => {
      state.songs = await getAllSongs();
      state.categories = getCategories(state.songs);
      initSearch(state.songs);
      renderCategoryFilters();
      showList();
      showToast(`Zaktualizowano ${count} piosenek (v${version})`);
    },
    onAlreadyCurrent: () => {
      if (!silent) showToast('Śpiewnik aktualny');
    },
    onOffline: () => {
      if (!silent) showToast('Brak połączenia');
    },
    onError: () => {
      if (!silent) showToast('Błąd synchronizacji');
    }
  });

  els.syncBtn.classList.remove('spinning');
}

// ─── Navigation ───────────────────────────────────────────────────────────────
function showList() {
  const query = state.searchQuery.trim();

  if (query.length >= 2) {
    const results = search(query);
    const filtered = filterByCategories(
      results.map(r => r.song),
      state.activeCategories
    );
    // Re-filter results
    const filteredResults = results.filter(r => filtered.some(s => s.id === r.song.id));
    els.content.innerHTML = '';
    els.content.appendChild(renderSearchResults(filteredResults));
  } else {
    const filtered = filterByCategories(state.songs, state.activeCategories);
    els.content.innerHTML = '';
    els.content.appendChild(renderSongList(filtered, state.activeCategories));
  }

  els.listView.hidden = false;
  els.songView.hidden = true;
}

function openSong(id) {
  const song = state.songs.find(s => s.id === id);
  if (!song) return;
  state.currentSong = song;

  els.songViewContent.innerHTML = '';
  els.songViewContent.appendChild(renderSong(song, state.viewMode));
  els.listView.hidden = true;
  els.songView.hidden = false;
  window.scrollTo(0, 0);

  // Update hash for deep-link
  history.pushState({ song: id }, '', `#song-${id}`);
}

function goBack() {
  state.currentSong = null;
  els.listView.hidden = false;
  els.songView.hidden = true;
  history.back();
}

// ─── Events ──────────────────────────────────────────────────────────────────
function bindEvents() {
  // Search
  els.searchInput.addEventListener('input', e => {
    state.searchQuery = e.target.value;
    els.searchClear.hidden = !state.searchQuery;
    showList();
  });

  els.searchClear.addEventListener('click', () => {
    els.searchInput.value = '';
    state.searchQuery = '';
    els.searchClear.hidden = true;
    showList();
    els.searchInput.focus();
  });

  // Song clicks (delegated)
  els.content.addEventListener('click', e => {
    const btn = e.target.closest('[data-id]');
    if (btn) openSong(btn.dataset.id);
  });

  // Song view content clicks (shouldn't have song items, but just in case)
  els.songViewContent.addEventListener('click', e => {
    const btn = e.target.closest('[data-id]');
    if (btn) openSong(btn.dataset.id);
  });

  // Back button
  els.backBtn.addEventListener('click', goBack);
  window.addEventListener('popstate', e => {
    if (!e.state?.song) {
      state.currentSong = null;
      els.listView.hidden = false;
      els.songView.hidden = true;
    }
  });

  // Drawer
  els.menuBtn.addEventListener('click', openDrawer);
  els.drawerClose.addEventListener('click', closeDrawer);
  els.overlay.addEventListener('click', closeDrawer);

  // Sync
  els.syncBtn.addEventListener('click', () => doSync({ silent: false }));

  // Mode select
  els.modeSelect.addEventListener('change', e => {
    state.viewMode = e.target.value;
    saveSettings();
    // Re-render current song if open
    if (state.currentSong) {
      els.songViewContent.innerHTML = '';
      els.songViewContent.appendChild(renderSong(state.currentSong, state.viewMode));
    }
  });

  // Install
  els.installBtn.addEventListener('click', async () => {
    if (state.installType === 'ios') {
      showIOSGuide();
    } else {
      await triggerInstall();
    }
  });

  // Uninstall
  els.uninstallBtn.addEventListener('click', () => {
    showToast(getUninstallInstructions(), 5000);
  });
}

function openDrawer() {
  els.drawer.classList.add('open');
  els.overlay.classList.add('visible');
  document.body.style.overflow = 'hidden';
}

function closeDrawer() {
  els.drawer.classList.remove('open');
  els.overlay.classList.remove('visible');
  document.body.style.overflow = '';
}

function applyModeSelect() {
  els.modeSelect.value = state.viewMode;
}

// ─── Category filters ─────────────────────────────────────────────────────────
function renderCategoryFilters() {
  els.categoryFilters.innerHTML = '';

  for (const cat of state.categories) {
    const label = document.createElement('label');
    label.className = 'category-filter';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = cat;
    cb.checked = state.activeCategories.length === 0 || state.activeCategories.includes(cat);
    cb.addEventListener('change', () => {
      updateActiveCategories();
      showList();
      saveSettings();
    });

    label.appendChild(cb);
    label.appendChild(document.createTextNode(CATEGORY_LABELS[cat] || cat));
    els.categoryFilters.appendChild(label);
  }
}

function updateActiveCategories() {
  const checked = Array.from(els.categoryFilters.querySelectorAll('input:checked')).map(i => i.value);
  const all = Array.from(els.categoryFilters.querySelectorAll('input')).map(i => i.value);
  // If all checked, treat as no filter
  state.activeCategories = checked.length === all.length ? [] : checked;
}

// ─── iOS guide ────────────────────────────────────────────────────────────────
function showIOSGuide() {
  const steps = getIOSInstallInstructions();
  const msg = steps.map((s, i) => `${i + 1}. ${s}`).join('\n');
  showToast(msg, 7000);
}

// ─── Toast ────────────────────────────────────────────────────────────────────
let toastTimer = null;
function showToast(message, duration = 3000) {
  els.toast.textContent = message;
  els.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove('show'), duration);
}

// ─── Start ────────────────────────────────────────────────────────────────────
init();
