const path = require('path');
const Database = require('better-sqlite3');
const BOOKS = require('./books');

let db = null;
function getDb() {
  if (!db) {
    db = new Database(path.join(__dirname, 'bible.db'), { readonly: true, fileMustExist: true });
  }
  return db;
}

// Build a lookup of every alias -> book_id, longest aliases first so
// "1 john" matches before "john".
const ALIAS_TO_BOOK = [];
BOOKS.forEach(([abbrev, name, ...aliases], idx) => {
  const bookId = idx + 1;
  [name, abbrev, ...aliases].forEach((alias) => {
    ALIAS_TO_BOOK.push({ alias: alias.toLowerCase(), bookId, name });
  });
});
ALIAS_TO_BOOK.sort((a, b) => b.alias.length - a.alias.length);

/**
 * Attempts to parse a raw string (typed or voice-transcribed) as a scripture
 * reference, e.g. "John 3:16", "john chapter 3 verse 16", "genesis 1 1-5",
 * "1 corinthians 13:4-7".
 * Returns { bookId, bookName, chapter, verseStart, verseEnd } or null.
 */
function parseReference(raw) {
  if (!raw) return null;
  let text = raw.toLowerCase().trim()
    .replace(/chapter/g, ' ')
    .replace(/verses?/g, ' ')
    .replace(/[.,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // find which book this starts with
  const match = ALIAS_TO_BOOK.find((b) => text.startsWith(b.alias + ' ') || text === b.alias);
  if (!match) return null;

  const rest = text.slice(match.alias.length).trim();
  if (!rest) return { bookId: match.bookId, bookName: match.name, chapter: 1, verseStart: null, verseEnd: null };

  // Patterns: "3:16", "3 16", "3:16-18", "3 16 18", "3"
  const refMatch = rest.match(/^(\d+)[\s:]*(\d+)?(?:\s*[-to]+\s*(\d+))?/);
  if (!refMatch) return { bookId: match.bookId, bookName: match.name, chapter: 1, verseStart: null, verseEnd: null };

  const chapter = parseInt(refMatch[1], 10);
  const verseStart = refMatch[2] ? parseInt(refMatch[2], 10) : null;
  const verseEnd = refMatch[3] ? parseInt(refMatch[3], 10) : verseStart;

  return { bookId: match.bookId, bookName: match.name, chapter, verseStart, verseEnd };
}

/** Fetch verse(s) for a parsed reference in a given version. */
function getByReference(ref, version) {
  const database = getDb();
  if (ref.verseStart) {
    const rows = database.prepare(`
      SELECT book_name, chapter, verse, text FROM verses
      WHERE version = ? AND book_id = ? AND chapter = ? AND verse BETWEEN ? AND ?
      ORDER BY verse
    `).all(version, ref.bookId, ref.chapter, ref.verseStart, ref.verseEnd);
    return rows;
  }
  // whole chapter
  const rows = database.prepare(`
    SELECT book_name, chapter, verse, text FROM verses
    WHERE version = ? AND book_id = ? AND chapter = ?
    ORDER BY verse
  `).all(version, ref.bookId, ref.chapter);
  return rows;
}

/** Fetch the same reference across ALL installed versions (for multi-version display). */
function getByReferenceAllVersions(ref) {
  const database = getDb();
  const versions = database.prepare('SELECT code, name FROM versions').all();
  return versions.map((v) => ({
    version: v.code,
    versionName: v.name,
    verses: getByReference(ref, v.code),
  }));
}

/**
 * Free-text / phrase search, e.g. "and the darkness comprehended it not".
 * Uses SQLite FTS5. Falls back gracefully on odd input by quoting each word.
 */
function phraseSearch(query, version, limit = 20) {
  const database = getDb();
  const cleaned = query.trim().replace(/[^\w\s']/g, ' ').trim();
  if (!cleaned) return [];

  // Try as an exact phrase first, then fall back to an AND of all terms.
  const phraseQuery = `"${cleaned.replace(/"/g, '')}"`;
  const words = cleaned.split(/\s+/).filter(Boolean);
  const andQuery = words.map((w) => `"${w}"`).join(' AND ');

  const runQuery = (ftsQuery) => database.prepare(`
    SELECT v.book_name, v.chapter, v.verse, v.text, v.version
    FROM verses_fts f
    JOIN verses v ON v.id = f.rowid
    WHERE verses_fts MATCH ? AND v.version = ?
    ORDER BY rank
    LIMIT ?
  `).all(ftsQuery, version, limit);

  let results = [];
  try {
    results = runQuery(phraseQuery);
  } catch (e) { /* fall through */ }

  if (results.length === 0 && words.length > 1) {
    try {
      results = runQuery(andQuery);
    } catch (e) { /* fall through */ }
  }
  return results;
}

function listVersions() {
  return getDb().prepare('SELECT code, name FROM versions').all();
}

/**
 * Main entry point used by the app: given raw voice/typed input, decide
 * whether it's a direct reference or a phrase search, and return results.
 */
function search(rawInput, version) {
  const ref = parseReference(rawInput);
  if (ref) {
    return { type: 'reference', reference: ref, results: getByReference(ref, version) };
  }
  return { type: 'phrase', results: phraseSearch(rawInput, version) };
}

module.exports = { parseReference, getByReference, getByReferenceAllVersions, phraseSearch, listVersions, search };
