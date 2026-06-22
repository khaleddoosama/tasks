let db = null;

// Set the database instance (called from server/index.js)
function setDatabase(database) {
  db = database;
}

// Get all user data
function getAll(userId) {
  if (!db) throw { status: 500, message: 'Database not initialized' };

  try {
    const weekSchedules = getWeekSchedules(userId);
    const monthlyGoals = getMonthlyGoalsStore(userId);
    const weeklyGoals = getWeeklyGoalsStore(userId);
    const colors = getColors(userId);
    const generalNotes = getGeneralNotes(userId);
    const preferences = getUserPreferences(userId);

    return {
      weekSchedules,
      monthlyGoals,
      weeklyGoals,
      colors,
      generalNotes,
      darkMode: preferences?.dark_mode || false,
      selectedWeek: preferences?.selected_week || 1,
      lastUpdated: new Date().toISOString(),
      version: '1.0'
    };
  } catch (error) {
    console.error('Error getting all user data:', error);
    throw { status: 500, message: 'Failed to retrieve user data' };
  }
}

// Save all user data
function saveAll(userId, data) {
  if (!db) throw { status: 500, message: 'Database not initialized' };

  try {
    if (data.weekSchedules) {
      for (const [weekKey, schedule] of Object.entries(data.weekSchedules)) {
        saveWeekSchedule(userId, weekKey, schedule);
      }
    }

    if (data.monthlyGoals) {
      for (const [monthKey, goals] of Object.entries(data.monthlyGoals)) {
        saveMonthlyGoals(userId, monthKey, goals);
      }
    }

    if (data.weeklyGoals) {
      for (const [weekKey, goals] of Object.entries(data.weeklyGoals)) {
        saveWeeklyGoals(userId, weekKey, goals);
      }
    }

    if (data.colors) {
      saveColors(userId, data.colors);
    }

    if (data.generalNotes) {
      saveGeneralNotes(userId, data.generalNotes);
    }

    if (typeof data.darkMode !== 'undefined' || typeof data.selectedWeek !== 'undefined') {
      updateUserPreferences(userId, data.darkMode, data.selectedWeek);
    }

    return data;
  } catch (error) {
    console.error('Error saving all user data:', error);
    throw { status: 500, message: 'Failed to save user data' };
  }
}

// Get specific key/table
function get(userId, table, key) {
  if (!db) throw { status: 500, message: 'Database not initialized' };

  try {
    switch (table) {
      case 'weekSchedules':
        return getWeekSchedule(userId, key);
      case 'monthlyGoals':
        return getMonthlyGoals(userId, key);
      case 'weeklyGoals':
        return getWeeklyGoals(userId, key);
      case 'colors':
        return getColors(userId);
      case 'generalNotes':
        return getGeneralNotes(userId);
      default:
        throw { status: 400, message: `Unknown table: ${table}` };
    }
  } catch (error) {
    if (error.status) throw error;
    console.error(`Error getting ${table}:`, error);
    throw { status: 500, message: `Failed to retrieve ${table}` };
  }
}

// Save specific key/table
function save(userId, table, key, value) {
  if (!db) throw { status: 500, message: 'Database not initialized' };

  try {
    switch (table) {
      case 'weekSchedules':
        return saveWeekSchedule(userId, key, value);
      case 'monthlyGoals':
        return saveMonthlyGoals(userId, key, value);
      case 'weeklyGoals':
        return saveWeeklyGoals(userId, key, value);
      case 'colors':
        return saveColors(userId, value);
      case 'generalNotes':
        return saveGeneralNotes(userId, value);
      default:
        throw { status: 400, message: `Unknown table: ${table}` };
    }
  } catch (error) {
    if (error.status) throw error;
    console.error(`Error saving to ${table}:`, error);
    throw { status: 500, message: `Failed to save to ${table}` };
  }
}

// Import user data (merge)
function importData(userId, importedData) {
  if (!db) throw { status: 500, message: 'Database not initialized' };

  try {
    return saveAll(userId, importedData);
  } catch (error) {
    if (error.status) throw error;
    console.error('Error importing data:', error);
    throw { status: 500, message: 'Failed to import data' };
  }
}

// Export user data
function exportData(userId) {
  if (!db) throw { status: 500, message: 'Database not initialized' };

  try {
    return getAll(userId);
  } catch (error) {
    if (error.status) throw error;
    console.error('Error exporting data:', error);
    throw { status: 500, message: 'Failed to export data' };
  }
}

// === Week Schedules ===
function getWeekSchedules(userId) {
  const rows = db.prepare(`
    SELECT week_key, data FROM week_schedules
    WHERE user_id = ?
    ORDER BY week_key
  `).all(userId);

  const result = {};
  for (const row of rows) {
    result[row.week_key] = JSON.parse(row.data);
  }
  return result;
}

function getWeekSchedule(userId, weekKey) {
  const row = db.prepare(`
    SELECT data FROM week_schedules
    WHERE user_id = ? AND week_key = ?
  `).get(userId, weekKey);

  return row ? JSON.parse(row.data) : null;
}

function saveWeekSchedule(userId, weekKey, schedule) {
  db.prepare(`
    INSERT OR REPLACE INTO week_schedules (user_id, week_key, data, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
  `).run(userId, weekKey, JSON.stringify(schedule));
  return schedule;
}

// === Monthly Goals ===
function getMonthlyGoalsStore(userId) {
  const rows = db.prepare(`
    SELECT month_key, data FROM monthly_goals
    WHERE user_id = ?
    ORDER BY month_key
  `).all(userId);

  const result = {};
  for (const row of rows) {
    result[row.month_key] = JSON.parse(row.data);
  }
  return result;
}

function getMonthlyGoals(userId, monthKey) {
  const row = db.prepare(`
    SELECT data FROM monthly_goals
    WHERE user_id = ? AND month_key = ?
  `).get(userId, monthKey);

  return row ? JSON.parse(row.data) : {};
}

function saveMonthlyGoals(userId, monthKey, goals) {
  db.prepare(`
    INSERT OR REPLACE INTO monthly_goals (user_id, month_key, data, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
  `).run(userId, monthKey, JSON.stringify(goals));
  return goals;
}

// === Weekly Goals ===
function getWeeklyGoalsStore(userId) {
  const rows = db.prepare(`
    SELECT week_key, data FROM weekly_goals
    WHERE user_id = ?
    ORDER BY week_key
  `).all(userId);

  const result = {};
  for (const row of rows) {
    result[row.week_key] = JSON.parse(row.data);
  }
  return result;
}

function getWeeklyGoals(userId, weekKey) {
  const row = db.prepare(`
    SELECT data FROM weekly_goals
    WHERE user_id = ? AND week_key = ?
  `).get(userId, weekKey);

  return row ? JSON.parse(row.data) : {};
}

function saveWeeklyGoals(userId, weekKey, goals) {
  db.prepare(`
    INSERT OR REPLACE INTO weekly_goals (user_id, week_key, data, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
  `).run(userId, weekKey, JSON.stringify(goals));
  return goals;
}

// === Colors ===
function getColors(userId) {
  const row = db.prepare(`
    SELECT data FROM colors
    WHERE user_id = ?
  `).get(userId);

  if (!row) {
    // Return default colors if not set
    return getDefaultColors();
  }
  return JSON.parse(row.data);
}

function saveColors(userId, colors) {
  db.prepare(`
    INSERT OR REPLACE INTO colors (user_id, data, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
  `).run(userId, JSON.stringify(colors));
  return colors;
}

function getDefaultColors() {
  return {
    header: { bg: '#1a1a2e', text: '#ffffff' },
    worship: { bg: '#6c5ce7', text: '#ffffff' },
    quran_study: { bg: '#00b894', text: '#ffffff' },
    sports_fitness: { bg: '#fd79a8', text: '#ffffff' },
    rest_nutrition: { bg: '#fdcb6e', text: '#000000' },
    education: { bg: '#0984e3', text: '#ffffff' },
    tech_projects: { bg: '#e17055', text: '#ffffff' },
    personal_projects: { bg: '#6c5ce7', text: '#ffffff' },
    relationships: { bg: '#00cec9', text: '#ffffff' },
    commute_buffer: { bg: '#dfe6e9', text: '#000000' },
    planning_review: { bg: '#95a5a6', text: '#ffffff' },
    sleep: { bg: '#2c3e50', text: '#ffffff' }
  };
}

// === General Notes ===
function getGeneralNotes(userId) {
  const row = db.prepare(`
    SELECT notes_data FROM general_notes
    WHERE user_id = ?
  `).get(userId);

  return row ? JSON.parse(row.data) : [];
}

function saveGeneralNotes(userId, notes) {
  db.prepare(`
    INSERT OR REPLACE INTO general_notes (user_id, notes_data, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
  `).run(userId, JSON.stringify(notes));
  return notes;
}

// === User Preferences ===
function getUserPreferences(userId) {
  return db.prepare(`
    SELECT dark_mode, selected_week FROM user_preferences
    WHERE user_id = ?
  `).get(userId);
}

function updateUserPreferences(userId, darkMode, selectedWeek) {
  db.prepare(`
    INSERT OR REPLACE INTO user_preferences (user_id, dark_mode, selected_week, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
  `).run(userId, darkMode || false, selectedWeek || 1);
}

// Legacy methods for backward compatibility (JSON storage, kept for reference)
function initialize() {
  if (db) {
    console.log('Database already initialized');
  }
}

module.exports = {
  setDatabase,
  initialize,
  getAll,
  saveAll,
  get,
  save,
  importData,
  exportData,

  // Backward compatibility - these are now wrappers
  getWeekSchedules,
  saveWeekSchedule,
  getMonthlyGoalsStore,
  saveMonthlyGoals,
  getWeeklyGoalsStore,
  saveWeeklyGoals,
  getColors,
  saveColors,
  getGeneralNotes,
  saveGeneralNotes
};
