const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const net = require('node:net');
const os = require('node:os');
const Database = require('better-sqlite3');

const isDev = !app.isPackaged;

/** @type {import('better-sqlite3').Database} */
let db;

function initDb() {
  const dbPath = path.join(app.getPath('userData'), 'pospe-offline.db');
  db = new Database(dbPath);
  // Catalog tables are a JSON-blob mirror of whatever the server returns —
  // this is a cache, not a second source of truth, so there's no value in
  // hand-maintaining a rigid column-per-field schema that has to track the
  // API's shape exactly. pending_sales gets real columns since the sync
  // engine actually queries/filters on status and ordering.
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS customers (id TEXT PRIMARY KEY, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS pending_sales (
      id TEXT PRIMARY KEY,
      idempotency_key TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL,
      status TEXT NOT NULL,
      error TEXT
    );
  `);
}

function replaceTable(table, rows) {
  const insert = db.prepare(`INSERT OR REPLACE INTO ${table} (id, data) VALUES (?, ?)`);
  const tx = db.transaction((items) => {
    db.prepare(`DELETE FROM ${table}`).run();
    for (const item of items) insert.run(item.id, JSON.stringify(item));
  });
  tx(rows);
}

function readTable(table) {
  return db
    .prepare(`SELECT data FROM ${table}`)
    .all()
    .map((row) => JSON.parse(row.data));
}

function pendingSaleRowToObject(row) {
  return {
    id: row.id,
    idempotencyKey: row.idempotency_key,
    payload: JSON.parse(row.payload),
    createdAt: row.created_at,
    status: row.status,
    error: row.error ?? undefined,
  };
}

function registerIpcHandlers() {
  ipcMain.handle('db:getCachedProducts', () => readTable('products'));
  ipcMain.handle('db:cacheProducts', (_event, products) => replaceTable('products', products));
  ipcMain.handle('db:upsertProducts', (_event, products) => {
    const insert = db.prepare('INSERT OR REPLACE INTO products (id, data) VALUES (?, ?)');
    const tx = db.transaction((rows) => {
      for (const row of rows) insert.run(row.id, JSON.stringify(row));
    });
    tx(products);
  });
  ipcMain.handle('db:getCachedCategories', () => readTable('categories'));
  ipcMain.handle('db:cacheCategories', (_event, categories) => replaceTable('categories', categories));
  ipcMain.handle('db:getCachedCustomers', () => readTable('customers'));
  ipcMain.handle('db:cacheCustomers', (_event, customers) => replaceTable('customers', customers));

  ipcMain.handle('db:decrementCachedStock', (_event, productId, quantity) => {
    const row = db.prepare('SELECT data FROM products WHERE id = ?').get(productId);
    if (!row) return;
    const product = JSON.parse(row.data);
    product.stockQty = Math.max(0, product.stockQty - quantity);
    db.prepare('UPDATE products SET data = ? WHERE id = ?').run(JSON.stringify(product), productId);
  });

  ipcMain.handle('db:queueSale', (_event, payload, idempotencyKey) => {
    const sale = {
      id: crypto.randomUUID(),
      idempotencyKey,
      payload,
      createdAt: new Date().toISOString(),
      status: 'pending',
    };
    db.prepare(
      'INSERT INTO pending_sales (id, idempotency_key, payload, created_at, status) VALUES (?, ?, ?, ?, ?)',
    ).run(sale.id, sale.idempotencyKey, JSON.stringify(sale.payload), sale.createdAt, sale.status);
    return sale;
  });

  ipcMain.handle('db:listPendingSales', () =>
    db.prepare('SELECT * FROM pending_sales ORDER BY created_at').all().map(pendingSaleRowToObject),
  );

  ipcMain.handle('db:markSaleSynced', (_event, id) => {
    db.prepare('DELETE FROM pending_sales WHERE id = ?').run(id);
  });

  ipcMain.handle('db:markSaleFailed', (_event, id, error) => {
    db.prepare('UPDATE pending_sales SET status = ?, error = ? WHERE id = ?').run('failed', error, id);
  });

  ipcMain.handle('db:retrySale', (_event, id) => {
    db.prepare('UPDATE pending_sales SET status = ?, error = NULL WHERE id = ?').run('pending', id);
  });
}

// Receipt printing. Raw ESC/POS goes straight to a network thermal printer
// on TCP 9100 (the de-facto "JetDirect" raw port); "system" printing prints
// the current page (print CSS isolates the receipt) silently to an installed
// OS printer, which covers USB printers with a vendor driver.
function registerPrinterHandlers() {
  ipcMain.handle('printer:sendRaw', (_event, host, port, bytes) => {
    if (typeof host !== 'string' || !/^[a-zA-Z0-9.-]{1,253}$/.test(host)) throw new Error('Invalid printer host');
    const portNum = Number(port);
    if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535) throw new Error('Invalid printer port');
    const data = Buffer.from(bytes);
    return new Promise((resolve, reject) => {
      const socket = net.createConnection({ host, port: portNum, timeout: 5000 }, () => {
        socket.end(data, () => resolve(true));
      });
      socket.on('timeout', () => {
        socket.destroy();
        reject(new Error(`Printer ${host}:${portNum} did not respond`));
      });
      socket.on('error', (err) => reject(new Error(`Printer ${host}:${portNum}: ${err.message}`)));
    });
  });

  ipcMain.handle('printer:list', async (event) => {
    const printers = await event.sender.getPrintersAsync();
    return printers.map((p) => p.name);
  });

  ipcMain.handle(
    'printer:printSystem',
    (event, deviceName) =>
      new Promise((resolve, reject) => {
        event.sender.print({ silent: true, deviceName: deviceName || undefined, printBackground: false }, (ok, reason) =>
          ok ? resolve(true) : reject(new Error(reason || 'Print failed')),
        );
      }),
  );

  ipcMain.handle('device:info', () => ({ platform: process.platform, osVersion: os.release(), appVersion: app.getVersion() }));
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    win.loadURL('http://localhost:5175');
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  initDb();
  registerIpcHandlers();
  registerPrinterHandlers();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
