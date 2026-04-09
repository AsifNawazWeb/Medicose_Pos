const { getDb } = require('../config/db');

function list({ q = '', category = '', limit = 50, offset = 0 }) {
  const db = getDb();
  const like = `%${q}%`;
  const cat  = String(category || '');
  return db.prepare(`
    SELECT p.*, s.name AS supplierName
    FROM products p LEFT JOIN suppliers s ON s.id = p.supplierId
    WHERE (p.name LIKE ? OR p.barcode LIKE ? OR p.sku LIKE ?)
      AND (? = '' OR p.category = ?)
    ORDER BY p.updatedAt DESC LIMIT ? OFFSET ?
  `).all(like, like, like, cat, cat, limit, offset);
}

function getById(id) {
  return getDb().prepare('SELECT * FROM products WHERE id=?').get(id);
}

function getByBarcode(barcode) {
  return getDb().prepare('SELECT * FROM products WHERE barcode=?').get(barcode);
}

// Build dynamic INSERT / UPDATE that is safe whether migration has run or not
function create(data) {
  const db  = getDb();
  const now = new Date().toISOString();
  const cols = db.prepare("PRAGMA table_info('products')").all().map(r => r.name);

  const base = { name:data.name, sku:data.sku||null, barcode:data.barcode||null,
    category:data.category||null, batchNo:data.batchNo||null, unit:data.unit||'pcs',
    price:data.price||0, cost:data.cost||0, gstRate:data.gstRate||0,
    stockQty:data.stockQty||0, reorderLevel:data.reorderLevel||0,
    expiryDate:data.expiryDate||null, supplierId:data.supplierId||null,
    isActive:data.isActive??1, shelf:data.shelf||null, createdAt:now, updatedAt:now };

  if (cols.includes('productDiscount')) base.productDiscount = Number(data.productDiscount||0);
  if (cols.includes('unitsPerStrip'))   base.unitsPerStrip   = Number(data.unitsPerStrip||1);
  if (cols.includes('stripsPerBox'))    base.stripsPerBox    = Number(data.stripsPerBox||1);
  if (cols.includes('packagingUnit'))   base.packagingUnit   = data.packagingUnit||'unit';

  const fields = Object.keys(base);
  const info   = db.prepare(
    `INSERT INTO products (${fields.join(',')}) VALUES (${fields.map(f=>'@'+f).join(',')})`
  ).run(base);
  return getById(info.lastInsertRowid);
}

function update(id, data) {
  const db  = getDb();
  const now = new Date().toISOString();
  const cols = db.prepare("PRAGMA table_info('products')").all().map(r => r.name);

  const base = { name:data.name, sku:data.sku||null, barcode:data.barcode||null,
    category:data.category||null, batchNo:data.batchNo||null, unit:data.unit||'pcs',
    price:data.price||0, cost:data.cost||0, gstRate:data.gstRate||0,
    stockQty:data.stockQty||0, reorderLevel:data.reorderLevel||0,
    expiryDate:data.expiryDate||null, supplierId:data.supplierId||null,
    isActive:data.isActive??1, shelf:data.shelf||null, updatedAt:now, id };

  if (cols.includes('productDiscount')) base.productDiscount = Number(data.productDiscount||0);
  if (cols.includes('unitsPerStrip'))   base.unitsPerStrip   = Number(data.unitsPerStrip||1);
  if (cols.includes('stripsPerBox'))    base.stripsPerBox    = Number(data.stripsPerBox||1);
  if (cols.includes('packagingUnit'))   base.packagingUnit   = data.packagingUnit||'unit';

  const sets = Object.keys(base).filter(k => k !== 'id').map(k => `${k}=@${k}`).join(',');
  db.prepare(`UPDATE products SET ${sets} WHERE id=@id`).run(base);
  return getById(id);
}

function updateStock(id, stockQty) {
  getDb().prepare('UPDATE products SET stockQty=?,updatedAt=? WHERE id=?').run(stockQty, new Date().toISOString(), id);
  return getById(id);
}

function remove(id) {
  getDb().prepare('DELETE FROM products WHERE id=?').run(id);
  return true;
}

module.exports = { list, getById, getByBarcode, create, update, updateStock, remove };
