import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export function initializeSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS intel_items (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      external_id TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      url TEXT,
      published_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS daily_briefs (
      id TEXT PRIMARY KEY,
      date TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS brief_cards (
      id TEXT PRIMARY KEY,
      brief_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT NOT NULL, -- Stored as JSON array
      why_it_matters TEXT NOT NULL,
      suggested_action TEXT,
      confidence TEXT NOT NULL,
      FOREIGN KEY(brief_id) REFERENCES daily_briefs(id)
    );
  `);
}

type CreateDatabaseOptions = {
  logger?: Pick<Console, 'log'>;
};

export function createDatabase(dbPath: string, options: CreateDatabaseOptions = {}): Database.Database {
  const { logger = console } = options;
  const db = new Database(dbPath);

  db.pragma('foreign_keys = ON');
  const foreignKeyStatus = db.pragma('foreign_keys', { simple: true });

  if (foreignKeyStatus !== 1) {
    throw new Error('SQLite foreign key enforcement could not be enabled.');
  }

  logger.log('[db] SQLite foreign key enforcement enabled.');

  initializeSchema(db);

  return db;
}

// Ensure data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

const dbPath = path.join(dataDir, 'securepulse.db');
const db = createDatabase(dbPath);

export default db;
