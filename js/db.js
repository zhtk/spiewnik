// db.js — IndexedDB wrapper
// Depends on idb loaded globally via CDN

const DB_NAME = 'spiewnik';
const DB_VERSION = 1;

let _db = null;

async function getDB() {
  if (_db) return _db;
  _db = await idb.openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Songs store
      if (!db.objectStoreNames.contains('songs')) {
        const store = db.createObjectStore('songs', { keyPath: 'id' });
        store.createIndex('category', 'category');
        store.createIndex('title', 'title');
      }
      // Metadata store (version, last sync, etc.)
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
    }
  });
  return _db;
}

export async function getAllSongs() {
  const db = await getDB();
  return db.getAll('songs');
}

export async function getSongsByCategory(category) {
  const db = await getDB();
  return db.getAllFromIndex('songs', 'category', category);
}

export async function getSong(id) {
  const db = await getDB();
  return db.get('songs', id);
}

export async function putSongs(songs) {
  const db = await getDB();
  const tx = db.transaction('songs', 'readwrite');
  await Promise.all(songs.map(s => tx.store.put(s)));
  await tx.done;
}

export async function deleteSong(id) {
  const db = await getDB();
  return db.delete('songs', id);
}

export async function getMeta(key) {
  const db = await getDB();
  const row = await db.get('meta', key);
  return row ? row.value : null;
}

export async function setMeta(key, value) {
  const db = await getDB();
  return db.put('meta', { key, value });
}
