const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.resolve(__dirname, '..', 'data', 'medical_pos.sqlite');
const db = new Database(dbPath, { fileMustExist: true });

const email = process.argv[2];
const password = process.argv[3];
const name = process.argv[4] || 'New User';
const role = process.argv[5] || 'cashier';

if (!email || !password) {
  console.log("Usage: npm run create-user <email> <password> [name] [role]");
  process.exit(1);
}

const passwordHash = bcrypt.hashSync(password, 10);
const now = new Date().toISOString();

try {
  db.prepare(`
    INSERT INTO users (email, name, role, passwordHash, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(email, name, role, passwordHash, now, now);
  console.log(`✅ User created successfully!`);
  console.log(`- Email: ${email}`);
  console.log(`- Name: ${name}`);
  console.log(`- Role: ${role}`);
} catch (err) {
  console.error("❌ Failed to create user:", err.message);
}

db.close();
