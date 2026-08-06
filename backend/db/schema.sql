PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'cashier'
       CHECK (role IN ('admin','manager','cashier','viewer')),
  passwordHash TEXT NOT NULL,
  phone TEXT,
  isActive INTEGER NOT NULL DEFAULT 1,
  mustChangePassword INTEGER NOT NULL DEFAULT 0,
  lastLoginAt TEXT,
  createdBy INTEGER,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  storeName TEXT NOT NULL,
  storePhone TEXT,
  storeAddress TEXT,
  receiptFooter TEXT,
  brandColor TEXT NOT NULL,
  logoDataUrl TEXT,
  gstEnabled INTEGER NOT NULL DEFAULT 1,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS suppliers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  loyaltyPoints INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  sku TEXT,
  barcode TEXT UNIQUE,
  category TEXT,
  batchNo TEXT,
  unit TEXT NOT NULL DEFAULT 'pcs',
  price REAL NOT NULL DEFAULT 0,
  cost REAL NOT NULL DEFAULT 0,
  gstRate REAL NOT NULL DEFAULT 0,
  stockQty INTEGER NOT NULL DEFAULT 0,
  reorderLevel INTEGER NOT NULL DEFAULT 0,
  expiryDate TEXT,
  supplierId INTEGER,
  isActive INTEGER NOT NULL DEFAULT 1,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  shelf	TEXT,
  FOREIGN KEY (supplierId) REFERENCES suppliers(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);

CREATE TABLE IF NOT EXISTS sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoiceNo TEXT NOT NULL UNIQUE,
  userId INTEGER NOT NULL,
  customerId INTEGER,
  paymentMethod TEXT NOT NULL,
  subTotal REAL NOT NULL,
  gstTotal REAL NOT NULL,
  discount REAL NOT NULL DEFAULT 0,
  grandTotal REAL NOT NULL,
  status TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  totalItems INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (userId) REFERENCES users(id),
  FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS sale_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  saleId INTEGER NOT NULL,
  productId INTEGER NOT NULL,
  qty INTEGER NOT NULL,
  price REAL NOT NULL,
  costPrice REAL NOT NULL DEFAULT 0,            -- Snapshot of product cost price at checkout
  -- Extended discount columns (added in v2)
  productDiscount REAL NOT NULL DEFAULT 0,       -- % discount applied first on base price
  discountAmount REAL NOT NULL DEFAULT 0,        -- absolute Rs amount of productDiscount
  -- Extra discount columns (added in v3) ── NEW ──
  extraDiscount REAL NOT NULL DEFAULT 0,         -- % discount applied after productDiscount
  extraDiscountAmount REAL NOT NULL DEFAULT 0,   -- absolute Rs amount of extraDiscount
  -- GST
  gstRate REAL NOT NULL DEFAULT 0,
  gstAmount REAL NOT NULL,
  lineTotal REAL NOT NULL,
  packagingUnit TEXT NOT NULL DEFAULT 'unit',
  FOREIGN KEY (saleId) REFERENCES sales(id) ON DELETE CASCADE,
  FOREIGN KEY (productId) REFERENCES products(id)
);

CREATE INDEX IF NOT EXISTS idx_sales_createdAt ON sales(createdAt);

CREATE TABLE IF NOT EXISTS returns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  saleId INTEGER NOT NULL,
  userId INTEGER NOT NULL,
  reason TEXT,
  refundTotal REAL NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL,
  FOREIGN KEY (saleId) REFERENCES sales(id),
  FOREIGN KEY (userId) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS return_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  returnId INTEGER NOT NULL,
  productId INTEGER NOT NULL,
  qty INTEGER NOT NULL,
  refundAmount REAL NOT NULL,
  FOREIGN KEY (returnId) REFERENCES returns(id) ON DELETE CASCADE,
  FOREIGN KEY (productId) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  poNo TEXT NOT NULL UNIQUE,
  userId INTEGER NOT NULL,
  supplierId INTEGER,
  status TEXT NOT NULL CHECK (status IN ('DRAFT','SENT','RECEIVED')) DEFAULT 'DRAFT',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id),
  FOREIGN KEY (supplierId) REFERENCES suppliers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  purchaseOrderId INTEGER NOT NULL,
  productId INTEGER NOT NULL,
  qty INTEGER NOT NULL,
  cost REAL NOT NULL DEFAULT 0,
  FOREIGN KEY (purchaseOrderId) REFERENCES purchase_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (productId) REFERENCES products(id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- AUDIT LOG TABLE
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER,
  action TEXT NOT NULL,
  details TEXT,
  createdAt TEXT NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_log_createdAt ON audit_log(createdAt);
CREATE INDEX IF NOT EXISTS idx_audit_log_userId ON audit_log(userId);