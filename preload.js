const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  abrirCalendario: () => ipcRenderer.send('abrir-calendario'),
  onDataSelecionada: (callback) => ipcRenderer.on('data-selecionada', (event, data) => callback(data)),
  forcarFoco: () => ipcRenderer.send('forcar-foco-janela'),
  atualizarCalendario: () => ipcRenderer.send('atualizar-calendario')
});