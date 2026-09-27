import { createBoard } from './model';

const DB_NAME = 'edu-student-boards';
const STORE = 'boards';

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      dbPromise = null;
      reject(request.error || new Error('Не удалось открыть локальное хранилище'));
    };
  });
  return dbPromise;
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function listBoards() {
  const db = await openDb();
  const tx = db.transaction(STORE, 'readonly');
  const rows = await requestToPromise(tx.objectStore(STORE).getAll());
  return (rows || []).sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
}

export async function loadBoard(id) {
  const db = await openDb();
  const tx = db.transaction(STORE, 'readonly');
  return requestToPromise(tx.objectStore(STORE).get(id));
}

export async function saveBoard(board) {
  const db = await openDb();
  const tx = db.transaction(STORE, 'readwrite');
  tx.objectStore(STORE).put(board);
  await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Запись доски прервана'));
  });
  return board;
}

export async function deleteBoard(id) {
  const db = await openDb();
  const tx = db.transaction(STORE, 'readwrite');
  tx.objectStore(STORE).delete(id);
  await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Удаление доски прервано'));
  });
}

export async function createBoardRecord(title) {
  const board = createBoard(title);
  await saveBoard(board);
  return board;
}
