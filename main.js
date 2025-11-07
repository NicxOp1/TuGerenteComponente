const { app, BrowserWindow, ipcMain, globalShortcut } = require('electron');
const path = require('path');
const Store = require('electron-store');

const store = new Store();

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#1a1a1a',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }
  });

  mainWindow.loadFile('src/index.html');

  // Open DevTools in debug mode
  if (process.argv.includes('--debug')) {
    mainWindow.webContents.openDevTools();
  }

  // Global shortcut for quick entry (Cmd/Ctrl + Shift + A)
  globalShortcut.register('CommandOrControl+Shift+A', () => {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.send('trigger-quick-entry');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// IPC handlers for settings
ipcMain.handle('get-settings', () => {
  return store.get('settings', {
    airtableApiKey: '',
    airtableBaseId: '',
    airtableTableName: 'Tasks'
  });
});

ipcMain.handle('save-settings', (event, settings) => {
  store.set('settings', settings);
  return true;
});
