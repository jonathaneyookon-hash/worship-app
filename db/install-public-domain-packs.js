// Downloads open/public-domain Bible datasets and adds them to source-bible.db.
// The installer is intentionally separate from the app database so the repo stays
// small. Run once with internet access, then run `npm run build-db`.
const fs = require('fs');
const path = require('path');
const https = require('https');
const Database = require('better-sqlite3');

const DB = path.join(__dirname, 'source-bible.db');

// Midvash publishes machine-readable Bible data with an explicit public-domain or
// free-redistribution status per version. Whole-Bible JSON is used here so one
// download creates a complete searchable translation table.
const BASE = 'https://raw.githubusercontent.com/midvash/bible-data/main/versions';
const PACKS = [
  ['en', 'asv', 'American Standard Version'],
  ['en', 'dra', 'Douay-Rheims American Edition'],
  ['en', 'geneva1599', 'Geneva Bible 1599'],
  ['en', 'kjv', 'King James Version'],
  ['en', 'web', 'World English Bible'],
  ['ar', 'svd', 'Smith-Van Dyck Arabic Bible'],
  ['cs', 'bkr', 'Bible Kralická'],
  ['da', 'dansk1931', 'Danish Bible 1931'],
  ['de', 'elb1905', 'Elberfelder Bibel 1905'],
  ['de', 'luth1912', 'Luther Bible 1912'],
  ['eo', 'lsb', 'La Sankta Biblio'],
  ['fr', 'darby-fr', 'French Darby Bible'],
  ['fr', 'lsg', 'Louis Segond 1910'],
  ['fr', 'martin1744', 'Bible David Martin 1744'],
  ['gr', 'tr', 'Textus Receptus'],
  ['he', 'aleppo', 'Aleppo Codex'],
  ['he', 'wlc', 'Westminster Leningrad Codex'],
  ['hu', 'kar', 'Károli Bible'],
  ['it', 'diodati', 'Bibbia Diodati 1649'],
  ['it', 'riveduta', 'Bibbia Riveduta 1927'],
  ['la', 'clem', 'Clementine Vulgate'],
  ['la', 'vulg', 'Latin Vulgate'],
  ['nb', 'nb1930', 'Norwegian Bible 1930'],
  ['nl', 'dutch1917', 'Dutch Bible 1917'],
  ['pl', 'bg', 'Biblia Gdańska'],
  ['pt', 'almeida-livre', 'Almeida 1819 / Bíblia Livre'],
  ['ro', 'vdc', 'Cornilescu Bible 1924'],
  ['ru', 'synodal', 'Russian Synodal Bible'],
  ['sv', 'sv1917', 'Swedish Bible 1917'],
  ['uk', 'kp', 'Kulish-Puliui Bible 1905'],
  ['vi', 'vi1934', 'Vietnamese Bible 1934'],
  ['zh', 'cuv', 'Chinese Union Version Traditional'],
  ['zh', 'cuvs', 'Chinese Union Version Simplified']
].map(([language, code, name]) => ({
  language,
  code,
  name,
  url: `${BASE}/${language}/${code}/${code}.json`
}));

function download(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) return reject(new Error('Too many redirects'));
    https.get(url, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return download(res.headers.location, redirects + 1).then(resolve, reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(body));
    }).on('error', reject);
  });
}

function normalise(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

const BOOK_ALIASES = new Map();
const BOOKS = require('./books');
BOOKS.forEach(([abbr, name, ...aliases], index) => {
  [abbr, name, ...aliases].forEach(value => BOOK_ALIASES.set(normalise(value), index + 1));
});

function bookId(value) {
  if (typeof value === 'number' && value >= 1 && value <= BOOKS.length) return value;
  const id = Number(value);
  if (Number.isInteger(id) && id >= 1 && id <= BOOKS.length) return id;
  return BOOK_ALIASES.get(normalise(value)) || null;
}

function collectMidvash(data) {
  const rows = [];
  const books = Array.isArray(data?.books) ? data.books : [];
  for (const book of books) {
    const b = bookId(book.bookId || book.id || book.book || book.englishName || book.name);
    if (!b) continue;
    for (const chapter of (book.chapters || [])) {
      const c = Number(chapter.chapter || chapter.number);
      if (!Number.isInteger(c) || c < 1) continue;
      for (const verse of (chapter.verses || [])) {
        const v = Number(verse.number || verse.verse);
        const text = typeof verse.text === 'string' ? verse.text.trim() : '';
        if (v > 0 && text) rows.push({ b, c, v, t: text });
      }
    }
  }
  return rows;
}

function uniqueRows(rows) {
  const seen = new Set();
  return rows.filter(row => {
    const key = `${row.b}:${row.c}:${row.v}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function main() {
  // The source database is generated locally on demand. The old implementation
  // expected a pre-existing source-bible.db, which made a clean GitHub Actions
  // runner (and a fresh user install) fail before any Bible could be downloaded.
  // Creating an empty SQLite database here makes the installer self-contained.
  const db = new Database(DB);
  try {
    for (const pack of PACKS) {
      const table = `t_${pack.code}`;
      const exists = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table);
      if (exists) {
        console.log(`Skipping ${pack.name} (${pack.code}) — already installed.`);
        continue;
      }

      console.log(`Downloading ${pack.name} (${pack.code})...`);
      let data;
      try {
        data = JSON.parse(await download(pack.url));
      } catch (error) {
        console.error(`Failed ${pack.code}: ${error.message}`);
        continue;
      }

      const rows = uniqueRows(collectMidvash(data));
      if (rows.length < 100) {
        console.error(`Skipping ${pack.code}: only ${rows.length} verses could be parsed.`);
        continue;
      }

      // A single malformed/unexpected pack should never abort the whole run —
      // earlier this crashed on hyphenated codes (e.g. "darby-fr") because the
      // table name was interpolated unquoted into raw SQL, which silently
      // starved every pack that came after it in the list.
      try {
        db.exec(`CREATE TABLE "${table}"(id INTEGER PRIMARY KEY,b INTEGER,c INTEGER,v INTEGER,t TEXT);`);
        const insert = db.prepare(`INSERT INTO "${table}"(id,b,c,v,t) VALUES(?,?,?,?,?)`);
        db.transaction(items => items.forEach((row, index) => {
          insert.run(index + 1, row.b, row.c, row.v, row.t);
        }))(rows);
        console.log(`Installed ${pack.name}: ${rows.length} verses.`);
      } catch (error) {
        console.error(`Failed to store ${pack.code}: ${error.message}`);
        try { db.exec(`DROP TABLE IF EXISTS "${table}";`); } catch (_) {}
      }
    }
  } finally {
    db.close();
  }

  console.log('Bible pack download complete. Now run: npm run build-db');
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
