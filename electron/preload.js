const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('medpos', {
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  openExternal: (url) => ipcRenderer.invoke('app:openExternal', url),
  printReceipt: (html, options) => ipcRenderer.invoke('print:receipt', html, options), // ✅ channel matches
});