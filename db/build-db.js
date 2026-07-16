// Builds bible.db (SQLite) by importing from source-bible.db — a bundled,
// pre-built public-domain multi-version dataset (ASV, BBE, KJV, WEB, YLT)
// sourced from the scrollmapper/bible_databases project (2024 branch, GPLv3,
// all included translations public domain). See README for details/credit.
//
// Run with: node build-db.js
// Produces: verses table + FTS5 virtual table `verses_fts` for phrase search.

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const BOOKS = require('./books');

const SOURCE_DB = path.join(__dirname, 'source-bible.db');

// table name in source DB -> { code, name } for our app
const VERSIONS = [
  { table: 't_kjv', code: 'kjv', name: 'King James Version' },
  { table: 't_asv', code: 'asv', name: 'American Standard Version' },
  { table: 't_bbe', code: 'bbe', name: 'Bible in Basic English' },
  { table: 't_web', code: 'web', name: 'World English Bible' },
  { table: 't_ylt', code: 'ylt', name: "Young's Literal Translation" },
];

if (!fs.existsSync(SOURCE_DB)) {
  console.error(`Missing ${SOURCE_DB}. This file should be bundled in db/. See README.`);
  process.exit(1);
}

const DB_PATH = path.join(__dirname, 'bible.db');
if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
const db = new Database(DB_PATH);
db.exec(`ATTACH DATABASE '${SOURCE_DB.replace(/'/g, "''")}' AS src`);

db.exec(`
  CREATE TABLE versions (code TEXT PRIMARY KEY, name TEXT);
  CREATE TABLE books (id INTEGER PRIMARY KEY, abbrev TEXT, name TEXT, book_order INTEGER);
  CREATE TABLE verses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    version TEXT,
    book_id INTEGER,
    book_name TEXT,
    chapter INTEGER,
    verse INTEGER,
    text TEXT
  );
  CREATE INDEX idx_verses_lookup ON verses(version, book_id, chapter, verse);
  CREATE VIRTUAL TABLE verses_fts USING fts5(text, content='verses', content_rowid='id');
`);

const insVersion = db.prepare('INSERT INTO versions (code, name) VALUES (?, ?)');
const insBook = db.prepare('INSERT INTO books (id, abbrev, name, book_order) VALUES (?, ?, ?, ?)');
const insVerse = db.prepare(`INSERT INTO verses (version, book_id, book_name, chapter, verse, text)
                              VALUES (@version, @book_id, @book_name, @chapter, @verse, @text)`);
const insFts = db.prepare('INSERT INTO verses_fts (rowid, text) VALUES (?, ?)');

BOOKS.forEach(([abbrev, name], idx) => {
  insBook.run(idx + 1, abbrev, name, idx + 1);
});

let totalVerses = 0;

for (const v of VERSIONS) {
  console.log(`Importing ${v.name} (${v.code})...`);
  insVersion.run(v.code, v.name);

  // source uses standard book numbers 1-66 matching our BOOKS order
  const rows = db.prepare(`SELECT b, c, v as verse, t as text FROM src.${v.table} ORDER BY id`).all();

  const insertMany = db.transaction((allRows) => {
    for (const row of allRows) {
      const bookIdx = row.b - 1;
      if (bookIdx < 0 || bookIdx >= BOOKS.length) continue; // skip deuterocanonical etc.
      const bookName = BOOKS[bookIdx][1];
      const info = insVerse.run({
        version: v.code,
        book_id: row.b,
        book_name: bookName,
        chapter: row.c,
        verse: row.verse,
        text: row.text,
      });
      insFts.run(info.lastInsertRowid, row.text);
      totalVerses++;
    }
  });

  insertMany(rows);
}

console.log(`Done. Imported ${totalVerses} verses across ${VERSIONS.length} versions.`);
console.log(`Database written to ${DB_PATH}`);
db.close();
