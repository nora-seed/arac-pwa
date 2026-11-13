(function (root) {
  "use strict";

  const DB_NAME = "arac-takip-db";
  const DB_VERSION = 1;
  const STORE = "photos";
  let dbPromise = null;

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      if (!root.indexedDB) {
        reject(new Error("IndexedDB desteklenmiyor."));
        return;
      }
      const request = root.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = function () {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: "id" });
          store.createIndex("vehicleId", "vehicleId", { unique: false });
        }
      };
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error || new Error("Veritabanı açılamadı.")); };
    });
    return dbPromise;
  }

  function withStore(mode, fn) {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        const tx = db.transaction(STORE, mode);
        const store = tx.objectStore(STORE);
        let result;
        try {
          result = fn(store);
        } catch (error) {
          reject(error);
          return;
        }
        tx.oncomplete = function () { resolve(result); };
        tx.onerror = function () { reject(tx.error); };
        tx.onabort = function () { reject(tx.error || new Error("İşlem iptal edildi.")); };
      });
    });
  }

  function requestResult(request) {
    return new Promise(function (resolve, reject) {
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error); };
    });
  }

  function putPhoto(id, blob, vehicleId) {
    return withStore("readwrite", function (store) {
      store.put({ id: id, vehicleId: vehicleId || "", blob: blob, createdAt: new Date().toISOString() });
    });
  }

  function getPhoto(id) {
    return open().then(function (db) {
      return requestResult(db.transaction(STORE, "readonly").objectStore(STORE).get(id));
    });
  }

  function deletePhoto(id) {
    return withStore("readwrite", function (store) { store.delete(id); });
  }

  function deleteForVehicle(vehicleId) {
    return allPhotos().then(function (records) {
      return Promise.all(records.filter(function (record) {
        return record.vehicleId === vehicleId;
      }).map(function (record) { return deletePhoto(record.id); }));
    });
  }

  function allPhotos() {
    return open().then(function (db) {
      return requestResult(db.transaction(STORE, "readonly").objectStore(STORE).getAll());
    });
  }

  function clearPhotos() {
    return withStore("readwrite", function (store) { store.clear(); });
  }

  root.AracDB = {
    putPhoto: putPhoto,
    getPhoto: getPhoto,
    deletePhoto: deletePhoto,
    deleteForVehicle: deleteForVehicle,
    allPhotos: allPhotos,
    clearPhotos: clearPhotos
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
