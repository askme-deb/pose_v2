const { contextBridge, ipcRenderer } = require('electron');

// Thin invoke wrappers only — no direct DB or Node access reaches the
// renderer. contextIsolation stays on; this is the entire trusted surface.
contextBridge.exposeInMainWorld('posDB', {
  getCachedProducts: () => ipcRenderer.invoke('db:getCachedProducts'),
  cacheProducts: (products) => ipcRenderer.invoke('db:cacheProducts', products),
  getCachedCategories: () => ipcRenderer.invoke('db:getCachedCategories'),
  cacheCategories: (categories) => ipcRenderer.invoke('db:cacheCategories', categories),
  getCachedCustomers: () => ipcRenderer.invoke('db:getCachedCustomers'),
  cacheCustomers: (customers) => ipcRenderer.invoke('db:cacheCustomers', customers),
  decrementCachedStock: (productId, quantity) => ipcRenderer.invoke('db:decrementCachedStock', productId, quantity),
  queueSale: (payload, idempotencyKey) => ipcRenderer.invoke('db:queueSale', payload, idempotencyKey),
  listPendingSales: () => ipcRenderer.invoke('db:listPendingSales'),
  markSaleSynced: (id) => ipcRenderer.invoke('db:markSaleSynced', id),
  markSaleFailed: (id, error) => ipcRenderer.invoke('db:markSaleFailed', id, error),
  retrySale: (id) => ipcRenderer.invoke('db:retrySale', id),
});
