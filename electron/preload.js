const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('medpos', {
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  openExternal: (url) => ipcRenderer.invoke('app:openExternal', url),
  printReceipt: (html, options) => ipcRenderer.invoke('print:receipt', html, options), // ✅ channel matches
  update: {
    check:    () => ipcRenderer.invoke('update:check'),
    getState: () => ipcRenderer.invoke('update:getState'),
    install:  () => ipcRenderer.invoke('update:install'),
    onStatus: (callback) => {
      const listener = (_event, payload) => callback(payload);
      ipcRenderer.on('update:status', listener);
      return () => ipcRenderer.removeListener('update:status', listener);
    },
  },
});