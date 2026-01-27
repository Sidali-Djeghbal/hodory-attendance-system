const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('hodory', {
  version: '0.1.0'
});

