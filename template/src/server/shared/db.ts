/**
 * Database connection and initialization
 * Using Node.js native 'node:sqlite' module (requires Node.js v20.12.0+)
 */

import { DatabaseSync } from 'node:sqlite';
import * as schema from './schema';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

// Ensure data directory exists
const dbDir = dirname('./data/todos.db');
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

// Create SQLite connection using Node.js native module
const sqlite = new DatabaseSync('./data/todos.db');

// Enable foreign keys
sqlite.exec('PRAGMA foreign_keys = ON');

// Export the database instance for use with services
export { sqlite };

/**
 * Initialize database schema
 */
export async function initializeDb() {
  // Create tables if they don't exist
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS todos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    )
  `);
}

// Initialize on import
initializeDb().catch(console.error);
