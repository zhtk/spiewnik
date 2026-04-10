// sync.js — Fetch remote songs, compare version, update DB

import { getAllSongs, putSongs, deleteSong, getMeta, setMeta } from './db.js';

const INDEX_URL = './data/index.yaml';

async function fetchYaml(url, opts = {}) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return jsyaml.load(await res.text());
}

export async function syncSongs({ onUpdated, onAlreadyCurrent, onOffline, onError, onProgress } = {}) {
  if (!navigator.onLine) {
    onOffline?.();
    return { status: 'offline' };
  }

  try {
    const index = await fetchYaml(INDEX_URL, { cache: 'no-cache' });

    const localVersion = await getMeta('songsVersion');
    if (index.version === localVersion) {
      onAlreadyCurrent?.();
      return { status: 'current', version: index.version };
    }

    // Fetch only songs whose version changed
    const toUpdate = [];
    for (const entry of index.songs) {
      const localSongVersion = await getMeta(`songVersion:${entry.id}`);
      if (entry.version !== localSongVersion) toUpdate.push(entry);
    }

    let updatedCount = 0;
    for (const entry of toUpdate) {
      const song = await fetchYaml(`./data/songs/${entry.id}.yaml`, { cache: 'no-cache' });
      await putSongs([song]);
      await setMeta(`songVersion:${entry.id}`, entry.version);
      updatedCount++;
      onProgress?.({ current: updatedCount, total: toUpdate.length });
    }

    // Remove songs no longer in the index
    const indexIds = new Set(index.songs.map(s => s.id));
    const allSongs = await getAllSongs();
    for (const song of allSongs) {
      if (!indexIds.has(song.id)) {
        await deleteSong(song.id);
      }
    }

    await setMeta('songsVersion', index.version);
    await setMeta('lastSync', new Date().toISOString());

    onUpdated?.({ version: index.version, count: updatedCount });
    return { status: 'updated', version: index.version };

  } catch (err) {
    console.warn('[sync] Failed:', err);
    onError?.(err);
    return { status: 'error', error: err };
  }
}

// Seed from remote on first run (when IndexedDB is empty)
export async function seedIfEmpty({ onProgress } = {}) {
  const songs = await getAllSongs();
  if (songs.length > 0) return false;
  const result = await syncSongs({ onProgress });
  return result.status === 'updated';
}
