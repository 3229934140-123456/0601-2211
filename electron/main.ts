import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

let mainWindow: BrowserWindow | null = null;

const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1200,
    minHeight: 768,
    title: '数据要素流通资产估值系统',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('save-file', async (_event, data: { content: string; filename: string; type: string }) => {
  const result = await dialog.showSaveDialog({
    title: '保存文件',
    defaultPath: data.filename,
    filters: [{ name: data.type.toUpperCase(), extensions: [data.type] }],
  });

  if (!result.canceled && result.filePath) {
    fs.writeFileSync(result.filePath, data.content, 'utf-8');
    return { success: true, path: result.filePath };
  }
  return { success: false };
});

ipcMain.handle('open-file', async (_event, filters: Electron.FileFilter[]) => {
  const result = await dialog.showOpenDialog({
    title: '选择文件',
    properties: ['openFile'],
    filters,
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0];
    const content = fs.readFileSync(filePath, 'utf-8');
    return { success: true, path: filePath, content };
  }
  return { success: false };
});

ipcMain.handle('export-pdf', async (_event, data: { buffer: ArrayBuffer; filename: string }) => {
  const result = await dialog.showSaveDialog({
    title: '导出 PDF 报告',
    defaultPath: data.filename,
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  });

  if (!result.canceled && result.filePath) {
    fs.writeFileSync(result.filePath, Buffer.from(data.buffer));
    return { success: true, path: result.filePath };
  }
  return { success: false };
});
