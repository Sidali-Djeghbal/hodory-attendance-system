const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('hodory', {
  version: '0.1.0',
  hotspot: {
    start: (options) => ipcRenderer.invoke('hodory:hotspot:start', options),
    stop: () => ipcRenderer.invoke('hodory:hotspot:stop'),
    status: (options) => ipcRenderer.invoke('hodory:hotspot:status', options)
  }
});
