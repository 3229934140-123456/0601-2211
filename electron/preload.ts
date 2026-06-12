import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  saveFile: (content: string, filename: string, type: string) =>
    ipcRenderer.invoke('save-file', { content, filename, type }),
  openFile: (filters: { name: string; extensions: string[] }[]) =>
    ipcRenderer.invoke('open-file', filters),
  exportPdf: (buffer: ArrayBuffer, filename: string) =>
    ipcRenderer.invoke('export-pdf', { buffer, filename }),
});
