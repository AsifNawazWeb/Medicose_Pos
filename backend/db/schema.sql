PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','cashier')),
  passwordHash TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
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
-- LICENSE / SUBSCRIPTION EXPIRY TABLE  (Requirement 2)
-- ─────────────────────────────────────────────────────────────────────────────
-- Controls whether any user can log in. Admin manually updates expiry_date
-- via SQL tool to extend the subscription. No frontend bypass is possible
-- because the check happens server-side before the JWT is issued.
--
-- Example: INSERT INTO license_expiry (expiry_date, status) VALUES ('2026-05-24', 'active');
-- Example: UPDATE license_expiry SET expiry_date = '2026-07-24' WHERE id = 1;
CREATE TABLE IF NOT EXISTS license_expiry (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  expiry_date TEXT NOT NULL,    -- ISO date string: 'YYYY-MM-DD'
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  note        TEXT,             -- optional admin note (e.g. "Extended 2 months")
  createdAt   TEXT NOT NULL,
  updatedAt   TEXT NOT NULL
);

-- ─────────────────────────────────────────────────────────────────────────────
-- MIGRATION SCRIPTS — run these on existing databases to add new columns
-- (safe to run multiple times — SQLite will error on duplicate, catch in app)
-- ─────────────────────────────────────────────────────────────────────────────
-- ALTER TABLE sale_items ADD COLUMN productDiscount REAL NOT NULL DEFAULT 0;
-- ALTER TABLE sale_items ADD COLUMN discountAmount REAL NOT NULL DEFAULT 0;
-- ALTER TABLE sale_items ADD COLUMN extraDiscount REAL NOT NULL DEFAULT 0;
-- ALTER TABLE sale_items ADD COLUMN extraDiscountAmount REAL NOT NULL DEFAULT 0;
-- ALTER TABLE sale_items ADD COLUMN packagingUnit TEXT NOT NULL DEFAULT 'unit';
-- ALTER TABLE sales ADD COLUMN billDiscount REAL NOT NULL DEFAULT 0;
-- ALTER TABLE sales ADD COLUMN amountPaid REAL;
-- ALTER TABLE sales ADD COLUMN balanceDue REAL NOT NULL DEFAULT 0;
-- ALTER TABLE sales ADD COLUMN prevBalance REAL NOT NULL DEFAULT 0;
-- ALTER TABLE customers ADD COLUMN balance REAL NOT NULL DEFAULT 0;