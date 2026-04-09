const { getDb } = require('../config/db');

function get() {
  const db = getDb();
  const row = db.prepare(`SELECT * FROM settings WHERE id = 1`).get();
  return row || null;
}

function upsert(data) {
  const db = getDb();
  const now = new Date().toISOString();
  const existing = get();

  const payload = {
    storeName: data.storeName || '',
    storePhone: data.storePhone || '',
    storeAddress: data.storeAddress || '',
    receiptFooter: data.receiptFooter || '',
    brandColor: data.brandColor || '#4f46e5',
    logoDataUrl: data.logoDataUrl || null, // Prevents error
    gstEnabled: data.gstEnabled ? 1 : 0,
    createdAt: now,
    updatedAt: now
  };

  if (!existing) {
    db.prepare(`
      INSERT INTO settings (
        id,
        storeName,
        storePhone,
        storeAddress,
        receiptFooter,
        brandColor,
        logoDataUrl,
        gstEnabled,
        createdAt,
        updatedAt
      )
      VALUES (
        1,
        @storeName,
        @storePhone,
        @storeAddress,
        @receiptFooter,
        @brandColor,
        @logoDataUrl,
        @gstEnabled,
        @createdAt,
        @updatedAt
      )
    `).run(payload);
  } else {
    db.prepare(`
      UPDATE settings SET
        storeName=@storeName,
        storePhone=@storePhone,
        storeAddress=@storeAddress,
        receiptFooter=@receiptFooter,
        brandColor=@brandColor,
        logoDataUrl=@logoDataUrl,
        gstEnabled=@gstEnabled,
        updatedAt=@updatedAt
      WHERE id=1
    `).run(payload);
  }

  return get();
}
module.exports = { get, upsert };
