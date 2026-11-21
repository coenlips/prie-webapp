// Kleine IndexedDB-wrapper. Alle recepten blijven lokaal op het toestel.
const DB = (() => {
  const NAME = 'recepten';
  const STORE = 'recipes';
  let dbPromise;

  function open() {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(NAME, 1);
        req.onupgradeneeded = () => {
          req.result.createObjectStore(STORE, { keyPath: 'id' });
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
    return dbPromise;
  }

  async function tx(mode, fn) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const t = db.transaction(STORE, mode);
      const store = t.objectStore(STORE);
      const result = fn(store);
      t.oncomplete = () => resolve(result && 'result' in result ? result.result : undefined);
      t.onerror = () => reject(t.error);
    });
  }

  return {
    all: () => tx('readonly', s => s.getAll()),
    get: id => tx('readonly', s => s.get(id)),
    put: recipe => tx('readwrite', s => s.put(recipe)),
    remove: id => tx('readwrite', s => s.delete(id)),
    async putMany(list) {
      const db = await open();
      return new Promise((resolve, reject) => {
        const t = db.transaction(STORE, 'readwrite');
        const s = t.objectStore(STORE);
        list.forEach(r => s.put(r));
        t.oncomplete = resolve;
        t.onerror = () => reject(t.error);
      });
    },
  };
})();
