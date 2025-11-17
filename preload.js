const { contextBridge, ipcRenderer } = require('electron');

// Sichere API für den Renderer-Prozess
contextBridge.exposeInMainWorld('financeAPI', {
  loadData: () => ipcRenderer.invoke('load-data'),
  saveTransaction: (transaction) => ipcRenderer.invoke('save-transaction', transaction),
  deleteTransaction: (id) => ipcRenderer.invoke('delete-transaction', id),
  updateTransaction: (transaction) => ipcRenderer.invoke('update-transaction', transaction)
});
