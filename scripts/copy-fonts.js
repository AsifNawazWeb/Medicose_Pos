/**
 * Copies the Material Icons and Roboto font files from node_modules
 * into src/assets/fonts so the app is fully self-contained (offline-capable).
 *
 * Usage: node scripts/copy-fonts.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const destDir = path.join(root, 'src', 'assets', 'fonts');
const iconSrc = path.join(root, 'node_modules', 'material-icons', 'iconfont');
const robotoSrc = path.join(root, 'node_modules', '@fontsource', 'roboto', 'files');

console.log('copy-fonts: ensuring', destDir);
fs.mkdirSync(destDir, { recursive: true });

/** @type {[string, string][]} */
const copies = [];

// ── Material Icons (ligature icon font) ─────────────────────────────
for (const file of [
  'material-icons.woff2',
  'material-icons.woff',
  'material-icons-outlined.woff2',
  'material-icons-round.woff2',
  'material-icons-sharp.woff2',
  'material-icons-two-tone.woff2',
]) {
  copies.push([path.join(iconSrc, file), path.join(destDir, file)]);
}

// ── Roboto (latin subset, weights used by the app) ──────────────────
for (const weight of [300, 400, 500, 700]) {
  const names = [
    `roboto-latin-${weight}-normal.woff2`,
    `roboto-latin-${weight}-normal.woff`,
  ];
  for (const name of names) {
    copies.push([path.join(robotoSrc, name), path.join(destDir, name)]);
  }
}

let copied = 0;
let missing = 0;

for (const [src, dest] of copies) {
  if (!fs.existsSync(src)) {
    console.warn('  ⚠ missing:', path.relative(root, src));
    missing++;
    continue;
  }
  fs.copyFileSync(src, dest);
  console.log('  ✓', path.relative(root, dest));
  copied++;
}

console.log(`\ncopy-fonts: ${copied} files copied${missing ? `, ${missing} missing` : ''}.`);

if (missing > 0) {
  process.exit(1);
}