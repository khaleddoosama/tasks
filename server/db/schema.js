const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'database.db');

// Create or open database
function initializeDatabase() {
  const dbExists = fs.existsSync(DB_PATH);
  const db = new Database(DB_PATH);

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  if (!dbExists) {
    console.log('Creating new SQLite database...');
    createTables(db);
    console.log('Database initialized successfully');
  } else {
    console.log('Connected to existing database');
  }

  return db;
}

function createTables(db) {
  // Users table (single user with password)
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Week schedules (per user)
  db.exec(`
    CREATE TABLE IF NOT EXISTS week_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      week_key TEXT NOT NULL,
      data JSON NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, week_key)
    );

    CREATE INDEX IF NOT EXISTS idx_week_schedules_user_week
    ON week_schedules(user_id, week_key);
  `);

  // Monthly goals (per user)
  db.exec(`
    CREATE TABLE IF NOT EXISTS monthly_goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      month_key TEXT NOT NULL,
      data JSON NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, month_key)
    );

    CREATE INDEX IF NOT EXISTS idx_monthly_goals_user_month
    ON monthly_goals(user_id, month_key);
  `);

  // Weekly goals (per user)
  db.exec(`
    CREATE TABLE IF NOT EXISTS weekly_goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      week_key TEXT NOT NULL,
      data JSON NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, week_key)
    );

    CREATE INDEX IF NOT EXISTS idx_weekly_goals_user_week
    ON weekly_goals(user_id, week_key);
  `);

  // Colors (per user)
  db.exec(`
    CREATE TABLE IF NOT EXISTS colors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL UNIQUE,
      data JSON NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // General notes (per user)
  db.exec(`
    CREATE TABLE IF NOT EXISTS general_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL UNIQUE,
      notes_data JSON NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // User preferences (dark mode, selected week, etc.)
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_preferences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL UNIQUE,
      dark_mode BOOLEAN DEFAULT FALSE,
      selected_week INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
}

// Initialize default user (khaleddoosama / 111)
function initializeDefaultUser(db) {
  const bcrypt = require('bcrypt');

  try {
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
    if (userCount.count > 0) {
      console.log('User already exists, skipping initialization');
      return;
    }

    const username = 'khaleddoosama';
    const password = '111';
    const hashedPassword = bcrypt.hashSync(password, 10);

    db.prepare(`
      INSERT INTO users (id, username, password_hash)
      VALUES (?, ?, ?)
    `).run('user-1', username, hashedPassword);

    console.log('Created default user: khaleddoosama');
  } catch (error) {
    console.error('Error initializing default user:', error);
    throw error;
  }
}

// Migrate data from old JSON file to SQLite (one-time operation)
function migrateFromJSON(db) {
  const jsonFilePath = path.join(__dirname, 'data.json');

  if (!fs.existsSync(jsonFilePath)) {
    console.log('No legacy JSON data to migrate');
    return;
  }

  // Check if migration already happened
  const scheduleCount = db.prepare('SELECT COUNT(*) as count FROM week_schedules').get();
  if (scheduleCount.count > 0) {
    console.log('Migration already completed, skipping');
    return;
  }

  try {
    console.log('Migrating data from JSON to SQLite...');
    const jsonData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf-8'));

    // Use the single user for legacy data
    const defaultUserId = 'user-1'; // The default user created earlier

    // Migrate week schedules
    if (jsonData.weekSchedules && Object.keys(jsonData.weekSchedules).length > 0) {
      const scheduleStmt = db.prepare(`
        INSERT OR REPLACE INTO week_schedules (user_id, week_key, data, created_at, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `);

      for (const [weekKey, days] of Object.entries(jsonData.weekSchedules)) {
        scheduleStmt.run(defaultUserId, weekKey, JSON.stringify(days));
      }
      console.log(`  ✓ Migrated ${Object.keys(jsonData.weekSchedules).length} weeks`);
    }

    // Migrate monthly goals
    if (jsonData.monthlyGoals && Object.keys(jsonData.monthlyGoals).length > 0) {
      const monthlyStmt = db.prepare(`
        INSERT OR REPLACE INTO monthly_goals (user_id, month_key, data, created_at, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `);

      for (const [monthKey, goalData] of Object.entries(jsonData.monthlyGoals)) {
        monthlyStmt.run(defaultUserId, monthKey, JSON.stringify(goalData));
      }
      console.log(`  ✓ Migrated ${Object.keys(jsonData.monthlyGoals).length} monthly goal groups`);
    }

    // Migrate weekly goals
    if (jsonData.weeklyGoals && Object.keys(jsonData.weeklyGoals).length > 0) {
      const weeklyStmt = db.prepare(`
        INSERT OR REPLACE INTO weekly_goals (user_id, week_key, data, created_at, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `);

      for (const [weekKey, goalData] of Object.entries(jsonData.weeklyGoals)) {
        weeklyStmt.run(defaultUserId, weekKey, JSON.stringify(goalData));
      }
      console.log(`  ✓ Migrated ${Object.keys(jsonData.weeklyGoals).length} weekly goal groups`);
    }

    // Migrate colors
    if (jsonData.colors) {
      const colorStmt = db.prepare(`
        INSERT OR REPLACE INTO colors (user_id, data, created_at, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `);
      colorStmt.run(defaultUserId, JSON.stringify(jsonData.colors));
      console.log('  ✓ Migrated colors');
    }

    // Migrate general notes
    if (jsonData.generalNotes && Array.isArray(jsonData.generalNotes)) {
      const notesStmt = db.prepare(`
        INSERT OR REPLACE INTO general_notes (user_id, notes_data, created_at, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `);
      notesStmt.run(defaultUserId, JSON.stringify(jsonData.generalNotes));
      console.log('  ✓ Migrated general notes');
    }

    // Migrate user preferences
    const prefStmt = db.prepare(`
      INSERT OR REPLACE INTO user_preferences (user_id, dark_mode, selected_week, created_at, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);
    prefStmt.run(
      defaultUserId,
      (jsonData.darkMode ? 1 : 0) || 0,
      jsonData.selectedWeek || 1
    );
    console.log('  ✓ Migrated user preferences');

    // Backup JSON file
    const backupPath = jsonFilePath + '.backup';
    fs.renameSync(jsonFilePath, backupPath);
    console.log(`Migration complete! Legacy data backed up to ${backupPath}`);
  } catch (error) {
    console.error('Error migrating from JSON:', error.message);
    throw error;
  }
}

module.exports = {
  initializeDatabase,
  initializeDefaultUser,
  migrateFromJSON
};
