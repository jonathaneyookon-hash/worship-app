// Builds bible.db from the bundled source SQLite database.
// The importer discovers every compatible t_* translation table in the source,
// so downloaded Bible packs are automatically wired into search and presentation.
const fs=require('fs');const path=require('path');const Database=require('better-sqlite3');const BOOKS=require('./books');
const SOURCE_DB=path.join(__dirname,'source-bible.db');
if(!fs.existsSync(SOURCE_DB)){console.error(`Missing ${SOURCE_DB}.`);process.exit(1);}
const DB_PATH=path.join(__dirname,'bible.db');if(fs.existsSync(DB_PATH))fs.unlinkSync(DB_PATH);const db=new Database(DB_PATH);db.exec(`ATTACH DATABASE '${SOURCE_DB.replace(/'/g,"''")}' AS src`);
db.exec(`CREATE TABLE versions(code TEXT PRIMARY KEY,name TEXT);CREATE TABLE books(id INTEGER PRIMARY KEY,abbrev TEXT,name TEXT,book_order INTEGER);CREATE TABLE verses(id INTEGER PRIMARY KEY AUTOINCREMENT,version TEXT,book_id INTEGER,book_name TEXT,chapter INTEGER,verse INTEGER,text TEXT);CREATE INDEX idx_verses_lookup ON verses(version,book_id,chapter,verse);CREATE VIRTUAL TABLE verses_fts USING fts5(text,content='verses',content_rowid='id');`);
const VERSION_NAMES={
 kjv:'King James Version',asv:'American Standard Version',bbe:'Bible in Basic English',web:'World English Bible',ylt:"Young's Literal Translation",
 akjv:'American King James Version',erv:'English Revised Version',webster:"Webster's Revision",geneva:'Geneva Bible',darby:'Darby Translation',jps:'JPS 1917',lsv:'Literal Standard Version',mlv:'Modern Literal Version',oeb:'Open English Bible',bsb:'Berean Standard Bible',msb:'Majority Standard Bible',cpdv:'Catholic Public Domain Version',nheb:'New Heart English Bible',litv:"Green's Literal Translation",mkjv:"Green's Modern King James Version",
 dra:'Douay-Rheims American Edition',geneva1599:'Geneva Bible 1599',svd:'Smith-Van Dyck Arabic Bible',bkr:'Bible Kralická',dansk1931:'Danish Bible 1931',elb1905:'Elberfelder Bibel 1905',luth1912:'Luther Bible 1912',lsb:'La Sankta Biblio',
 'darby-fr':'French Darby Bible',lsg:'Louis Segond 1910',martin1744:'Bible David Martin 1744',tr:'Textus Receptus',aleppo:'Aleppo Codex',wlc:'Westminster Leningrad Codex',kar:'Károli Bible',diodati:'Bibbia Diodati 1649',riveduta:'Bibbia Riveduta 1927',clem:'Clementine Vulgate',vulg:'Latin Vulgate',nb1930:'Norwegian Bible 1930',dutch1917:'Dutch Bible 1917',bg:'Biblia Gdańska', 'almeida-livre':'Almeida 1819 / Bíblia Livre',vdc:'Cornilescu Bible 1924',synodal:'Russian Synodal Bible',sv1917:'Swedish Bible 1917',kp:'Kulish-Puliui Bible 1905',vi1934:'Vietnamese Bible 1934',cuv:'Chinese Union Version Traditional',cuvs:'Chinese Union Version Simplified'
};
const sourceTables=db.prepare("SELECT name FROM src.sqlite_master WHERE type='table' AND name LIKE 't_%' ORDER BY name").all().map(x=>x.name);
const VERSIONS=sourceTables.filter(table=>{try{const cols=db.prepare(`PRAGMA src.table_info("${table}")`).all().map(x=>x.name);return ['b','c','v','t'].every(x=>cols.includes(x));}catch(_){return false;}}).map(table=>{const code=table.slice(2).toLowerCase();return{table,code,name:VERSION_NAMES[code]||code.toUpperCase()};});
if(!VERSIONS.length){console.error('No compatible Bible translation tables found in source-bible.db.');process.exit(1);}
const insVersion=db.prepare('INSERT INTO versions(code,name) VALUES(?,?)');const insBook=db.prepare('INSERT INTO books(id,abbrev,name,book_order) VALUES(?,?,?,?)');const insVerse=db.prepare('INSERT INTO verses(version,book_id,book_name,chapter,verse,text) VALUES(@version,@book_id,@book_name,@chapter,@verse,@text)');const insFts=db.prepare('INSERT INTO verses_fts(rowid,text) VALUES(?,?)');
BOOKS.forEach(([abbrev,name],idx)=>insBook.run(idx+1,abbrev,name,idx+1));
let totalVerses=0;
for(const v of VERSIONS){console.log(`Importing ${v.name} (${v.code})...`);insVersion.run(v.code,v.name);const rows=db.prepare(`SELECT b,c,v as verse,t as text FROM src."${v.table}" ORDER BY id`).all();db.transaction(allRows=>{for(const row of allRows){const bookIdx=row.b-1;if(bookIdx<0||bookIdx>=BOOKS.length)continue;const info=insVerse.run({version:v.code,book_id:row.b,book_name:BOOKS[bookIdx][1],chapter:row.c,verse:row.verse,text:row.text});insFts.run(info.lastInsertRowid,row.text);totalVerses++;}})(rows);}
console.log(`Done. Imported ${totalVerses} verses across ${VERSIONS.length} versions.`);db.close();
