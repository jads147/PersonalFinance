const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const DATA_FILE = path.join(app.getPath('userData'), 'finances.json');

let mainWindow;

// Daten laden
function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Fehler beim Laden der Daten:', error);
  }
  return {
    transactions: [],
    recurringTransactions: [],
    categories: ['Gehalt', 'Einkäufe', 'Miete', 'Transport', 'Unterhaltung', 'Sonstiges']
  };
}

// Daten speichern
function saveData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Fehler beim Speichern der Daten:', error);
    return false;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile('index.html');

  // DevTools für Entwicklung öffnen
  mainWindow.webContents.openDevTools();
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

// IPC Handlers für Datenverwaltung
ipcMain.handle('load-data', () => {
  return loadData();
});

ipcMain.handle('save-transaction', (event, transaction) => {
  const data = loadData();
  transaction.id = Date.now().toString();
  transaction.date = transaction.date || new Date().toISOString();
  data.transactions.push(transaction);
  return saveData(data) ? transaction : null;
});

ipcMain.handle('delete-transaction', (event, id) => {
  const data = loadData();
  data.transactions = data.transactions.filter(t => t.id !== id);
  return saveData(data);
});

ipcMain.handle('update-transaction', (event, updatedTransaction) => {
  const data = loadData();
  const index = data.transactions.findIndex(t => t.id === updatedTransaction.id);
  if (index !== -1) {
    data.transactions[index] = updatedTransaction;
    return saveData(data);
  }
  return false;
});

// Wiederkehrende Transaktionen
ipcMain.handle('save-recurring', (event, recurring) => {
  const data = loadData();
  if (!data.recurringTransactions) {
    data.recurringTransactions = [];
  }
  recurring.id = Date.now().toString();
  data.recurringTransactions.push(recurring);
  return saveData(data) ? recurring : null;
});

ipcMain.handle('delete-recurring', (event, id) => {
  const data = loadData();
  if (!data.recurringTransactions) {
    data.recurringTransactions = [];
  }
  data.recurringTransactions = data.recurringTransactions.filter(t => t.id !== id);
  return saveData(data);
});

ipcMain.handle('process-recurring', () => {
  const data = loadData();
  if (!data.recurringTransactions) {
    data.recurringTransactions = [];
  }

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  let added = 0;

  data.recurringTransactions.forEach(recurring => {
    // Prüfen ob für diesen Monat schon eine Transaktion existiert
    const alreadyProcessed = data.transactions.some(t => {
      const tDate = new Date(t.date);
      return t.recurringId === recurring.id &&
             tDate.getMonth() === currentMonth &&
             tDate.getFullYear() === currentYear;
    });

    if (!alreadyProcessed) {
      // Neue Transaktion für diesen Monat erstellen
      const transaction = {
        id: Date.now().toString() + '_' + Math.random(),
        description: recurring.description,
        amount: recurring.amount,
        type: recurring.type,
        category: recurring.category,
        date: new Date(currentYear, currentMonth, recurring.dayOfMonth || 1).toISOString(),
        recurringId: recurring.id,
        isRecurring: true
      };
      data.transactions.push(transaction);
      added++;
    }
  });

  if (added > 0) {
    saveData(data);
  }

  return added;
});
