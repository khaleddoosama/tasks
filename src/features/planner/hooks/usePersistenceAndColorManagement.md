# usePersistenceAndColorManagement Hook - Documentation

## Overview

The `usePersistenceAndColorManagement` hook handles data persistence (export/import) and color/theme management. It encapsulates the logic for:
- Exporting schedule data to files (backup, archive)
- Importing schedule data from files
- Managing task category colors
- Normalizing imported colors

**Location:** `src/features/planner/hooks/usePersistenceAndColorManagement.js`

---

## Purpose & Scope

### Why Extract?
The monolithic `usePlannerState` hook mixes 6 separate concerns. Persistence and color management is a cohesive domain that should be isolated:
- Export operations (backup, archive range)
- Import operations (validate, restore, merge)
- Color management (theme selection, category colors)

### What It Manages
- **Schedule exports** — save schedule data to files (JSON format)
- **Schedule imports** — restore schedule data from files with validation
- **Archive exports** — export historical data for specific date ranges
- **Color management** — update task category colors
- **Data normalization** — normalize imported colors and days

### What It Does NOT Manage
- Task operations (belongs in useTaskManagement)
- Goal operations (belongs in useGoalManagement)
- Gist sync (separate hook, external API)
- localStorage persistence (belongs in usePlannerState core)

---

## Function Signatures

### Input Parameters

```javascript
usePersistenceAndColorManagement(
  // Data state
  days,                          // Array — current week's days
  colors,                        // Object — current color palette
  effectiveWeekSchedules,        // Object — all weeks' data
  monthlyGoalsStore,            // Object — all monthly goals
  weeklyGoalsStore,             // Object — all weekly goals
  selectedWeek,                 // number — current week (1-52)
  currentYear,                  // number — current year

  // State setters
  setColors,                    // Function — setState for colors
  setMonthlyGoalsStore,        // Function — setState for monthly goals
  setWeeklyGoalsStore,         // Function — setState for weekly goals
  replace,                     // Function — from useUndoRedo
  updateWeekSchedules,         // Function — setState for week schedules

  // Utilities
  applyPlannerData,            // Function — apply imported data to state
  normalizeDaysCategories,     // Function — normalize day data
  normalizeColors,             // Function — normalize color data
  createMissingGoalsForImportedData, // Function — create missing goals
  createInitialDays,           // Function — scaffold default week
  exportScheduleBackup,        // Function — export to file (service)
  exportArchiveRange,          // Function — export archive (service)
  importScheduleFromFile,      // Function — import from file (service)
  normalizeDaysCategories,     // Function — normalize days
)
```

### Return Object

```javascript
{
  // Color management
  changeColor(section, field, value),        // Update color palette

  // Export operations
  exportSchedule(),                          // Export current week backup
  exportArchive(fromDate, toDate),          // Export historical archive

  // Import operations
  importSchedule(file),                      // Import schedule from file
  
  // Data access
  getScheduleData(),                         // Get current schedule JSON
  updateScheduleFromJSON(newData),          // Update from imported JSON
}
```

---

## Function Details

### Color Management

#### `changeColor(section, field, value)` (lines 368-376)

**Purpose:** Update a specific color in the task category palette.

**Parameters:**
- `section` (string) — category name (e.g., "worship", "sports_fitness")
- `field` (string) — color property ("bg" for background, "text" for text color)
- `value` (string) — hex color code (e.g., "#ff6b6b")

**Behavior:**
1. Update nested color object: `colors[section][field] = value`
2. Write to state via `setColors`
3. Change is immediate (no validation)

**Example:**
```javascript
changeColor("worship", "bg", "#e8f5e9")
// Changes worship category background to light green

changeColor("sports_fitness", "text", "#ffffff")
// Changes sports text color to white
```

**Performance:** O(1) for color update

**Error Handling:** No validation - assumes valid hex color

---

### Export Operations

#### `exportSchedule()` (lines 378-387)

**Purpose:** Export current week's schedule as a backup file.

**Parameters:** None (uses closure state)

**Behavior:**
1. Compile all relevant data:
   ```javascript
   {
     weekSchedules: effectiveWeekSchedules,
     days,
     colors,
     selectedWeek,
     monthlyGoals: monthlyGoalsStore,
     weeklyGoals: weeklyGoalsStore
   }
   ```
2. Call `exportScheduleBackup()` service with compiled data
3. Browser triggers file download (JSON format)

**Side Effects:**
- Downloads file to user's device
- No state modifications

**Example:**
```javascript
exportSchedule()
// Downloads file: "schedule-backup-2026-05-31.json"
// Contains all schedule data for current viewing context
```

**Performance:** O(n) where n = total data size (depends on schedule)

**File Format:**
```json
{
  "weekSchedules": {...},
  "days": [...],
  "colors": {...},
  "selectedWeek": 22,
  "monthlyGoals": {...},
  "weeklyGoals": {...}
}
```

---

#### `exportArchive(fromDate, toDate)` (lines 389-400)

**Purpose:** Export historical archive data for a specific date range.

**Parameters:**
- `fromDate` (Date|string) — start date
- `toDate` (Date|string) — end date

**Behavior:**
1. Compile data filtered to date range:
   ```javascript
   {
     weekSchedules: effectiveWeekSchedules,
     monthlyGoalsStore,
     weeklyGoalsStore,
     fromDate,
     toDate
   }
   ```
2. Call `exportArchiveRange()` service
3. Service handles filtering by date and generates archive
4. Browser triggers file download

**Side Effects:**
- Downloads file to user's device
- No state modifications

**Example:**
```javascript
const from = new Date(2026, 4, 1); // May 1, 2026
const to = new Date(2026, 4, 31);   // May 31, 2026
exportArchive(from, to)
// Downloads file: "schedule-archive-2026-05.json"
// Contains all schedule data within May 2026
```

**Performance:** O(w) where w = weeks in range

**File Format:** Similar to backup, but filtered to date range

---

### Import Operations

#### `importSchedule(file)` (lines 402-408)

**Purpose:** Import schedule data from a user-selected file.

**Parameters:**
- `file` (File) — HTML File object from input

**Behavior:**
1. Call `importScheduleFromFile()` service with file
2. Service reads and parses JSON
3. Call `applyPlannerData()` to merge imported data into state
4. Use current `selectedWeek` as fallback for week selection

**Side Effects:**
- Modifies state (days, colors, goals, week selection)
- No file is saved (data stored in-memory via localStorage)

**Example:**
```javascript
// User selects file: "schedule-backup-2026-05-31.json"
importSchedule(file)
// Parses JSON and applies to state
// Updates: days, colors, goals based on file content
```

**Performance:** O(n) where n = imported data size

**Error Handling:**
- Service validates JSON format
- Throws error if malformed
- Wrapped in try-catch at UI level

---

#### `getScheduleData()` (lines 426-432)

**Purpose:** Export current schedule as JSON object (not to file).

**Parameters:** None

**Returns:**
```javascript
{
  days: [...],        // Current week's days
  colors: {...},      // Current color palette
  weekKey: "2026-W22" // Current week key
}
```

**Behavior:**
1. Collect current display data
2. Return as plain object (not serialized)
3. Useful for copy-to-clipboard, display in UI, etc.

**Example:**
```javascript
const data = getScheduleData()
// Returns JSON-serializable object with current week data
// Can be used to populate JSON editor, send to API, etc.
```

**Performance:** O(d) where d = tasks in current week (typically small)

---

#### `updateScheduleFromJSON(newData)` (lines 434-458)

**Purpose:** Update schedule from imported JSON object (inverse of getScheduleData).

**Parameters:**
- `newData` (object) — schedule object with `days`, optionally `colors`

**Behavior:** **COMPLEX - Multi-step validation and merge**

1. **Validate input:**
   ```javascript
   if (!newData.days || !Array.isArray(newData.days)) {
     throw new Error("Invalid format: missing 'days' array");
   }
   ```

2. **Normalize imported days:**
   ```javascript
   const normalizedDays = normalizeDaysCategories(newData.days);
   ```

3. **Create missing goals:**
   - Detect which months/weeks are in imported data
   - Generate missing goal IDs for any referenced months/weeks
   - Merge with existing goals
   ```javascript
   const { monthlyGoalsStore: updatedMonthlyStore, 
           weeklyGoalsStore: updatedWeeklyStore, 
           hasChanges } = createMissingGoalsForImportedData(
     normalizedDays, 
     monthlyGoalsStore, 
     weeklyGoalsStore, 
     currentYear
   );
   ```

4. **Update goal stores (if changes detected):**
   ```javascript
   if (hasChanges) {
     setMonthlyGoalsStore(updatedMonthlyStore);
     setWeeklyGoalsStore(updatedWeeklyStore);
   }
   ```

5. **Update days and schedules:**
   ```javascript
   replace(normalizedDays);
   updateWeekSchedules((currentSchedules) => ({
     ...currentSchedules,
     [weekKey]: normalizedDays
   }));
   ```

6. **Update colors (if provided):**
   ```javascript
   if (newData.colors) {
     const normalizedColors = normalizeColors(newData.colors);
     setColors(normalizedColors);
   }
   ```

**Side Effects:**
- Modifies `days` (via replace for undo/redo)
- Modifies `effectiveWeekSchedules` (via updateWeekSchedules)
- Modifies goal stores (if missing goals detected)
- Modifies `colors` (if provided in newData)

**Example:**
```javascript
const jsonData = {
  days: [
    { id: 1, name: "السبت", tasks: [...], ... },
    // ... 6 more days
  ],
  colors: { worship: { bg: "#...", text: "#..." }, ... }
};

updateScheduleFromJSON(jsonData)
// Validates, normalizes, creates missing goals, updates all state
```

**Performance:** O(d + g) where:
- d = days to normalize
- g = goals to create/merge

**Error Handling:**
- Throws error if `days` array missing
- Logs/ignores malformed color data
- Continues with best-effort update

---

## Data Model

### Schedule Export Format
```javascript
{
  weekSchedules: {
    "2026-W22": [
      { id: 1, name: "السبت", التاريخ: "2026-05-31", ... },
      // ... 6 more days
    ],
    "2026-W23": [ ... ]
  },
  days: [...],           // Current week's days
  colors: {
    header: { bg: "#...", text: "#..." },
    worship: { bg: "#...", text: "#..." },
    // ... other categories
  },
  selectedWeek: 22,
  monthlyGoals: {
    "2026-05": {
      "goal-id-1": { id, title, status, createdAt },
      // ... more goals
    }
  },
  weeklyGoals: {
    "2026-W22": {
      "goal-id-5": { id, title, monthlyGoalId, status, createdAt }
      // ... more goals
    }
  }
}
```

### Color Palette Structure
```javascript
{
  header: { bg: "#2a2a3e", text: "#f0f0f0" },
  worship: { bg: "#e8f5e9", text: "#1b5e20" },
  quran_study: { bg: "#e3f2fd", text: "#01579b" },
  sports_fitness: { bg: "#fce4ec", text: "#880e4f" },
  rest_nutrition: { bg: "#fff3e0", text: "#e65100" },
  education: { bg: "#f3e5f5", text: "#4a148c" },
  tech_projects: { bg: "#e0f2f1", text: "#004d40" },
  personal_projects: { bg: "#fce4ec", text: "#880e4f" },
  relationships: { bg: "#ede7f6", text: "#311b92" },
  commute_buffer: { bg: "#f1f8e9", text: "#33691e" },
  planning_review: { bg: "#fff9c4", text: "#f57f17" },
  sleep: { bg: "#e1f5fe", text: "#01579b" }
}
```

---

## Integration Points

### Used By
- `ColorsTab.jsx` — displays colors, calls `changeColor()`
- `PlannerPage.jsx` toolbar — calls `exportSchedule()`, `exportArchive()`, `importSchedule()`
- `JSONEditorTab.jsx` — calls `getScheduleData()`, `updateScheduleFromJSON()`

### Depends On
```javascript
// State from usePlannerState
days, colors, effectiveWeekSchedules
monthlyGoalsStore, setMonthlyGoalsStore
weeklyGoalsStore, setWeeklyGoalsStore
selectedWeek, currentYear

// Utilities
applyPlannerData
normalizeDaysCategories
normalizeColors
createMissingGoalsForImportedData
createInitialDays
replace, updateWeekSchedules

// Services
exportScheduleBackup (from services/scheduleTransfer.js)
exportArchiveRange (from services/archiveExport.js)
importScheduleFromFile (from services/scheduleTransfer.js)
```

### Returns To
- `usePlannerState()` — consumed by composed hook

---

## Testing Strategy

### Unit Tests (6 test suites)

#### 1. changeColor()
- ✅ Updates specific category color
- ✅ Updates nested color object correctly
- ✅ Preserves other colors unchanged
- ✅ Handles all 11 category keys
- ✅ No validation (accepts any hex string)

#### 2. exportSchedule()
- ✅ Calls exportScheduleBackup with correct payload
- ✅ Includes all required properties (weekSchedules, days, colors, etc.)
- ✅ Triggers file download

#### 3. exportArchive()
- ✅ Calls exportArchiveRange with date parameters
- ✅ Passes correct data structure
- ✅ Handles date range filtering

#### 4. importSchedule()
- ✅ Accepts File object
- ✅ Calls importScheduleFromFile service
- ✅ Calls applyPlannerData with imported data
- ✅ Uses selectedWeek as fallback

#### 5. getScheduleData()
- ✅ Returns object with days, colors, weekKey
- ✅ Current values are included
- ✅ JSON-serializable

#### 6. updateScheduleFromJSON()
- ✅ Validates days array exists
- ✅ Normalizes days categories
- ✅ Creates missing goals for imported weeks/months
- ✅ Updates goal stores if changes detected
- ✅ Replaces days with undo/redo support
- ✅ Updates week schedules
- ✅ Normalizes and applies colors if provided
- ✅ Throws error on invalid format

### Integration Tests (3 scenarios)

#### 1. Export→Import→Verify Round-trip
```javascript
1. getScheduleData() → jsonData
2. Modify state (add tasks, change colors)
3. updateScheduleFromJSON(jsonData)
4. Verify: state restored to original
```

#### 2. Import with Missing Goals
```javascript
1. importSchedule(file) with new month/week data
2. Verify: missing goals created
3. Verify: existing goals preserved
```

#### 3. Color Update Persistence
```javascript
1. changeColor() multiple times
2. exportSchedule()
3. importSchedule()
4. Verify: colors match exported values
```

---

## Error Handling

### Current Approach
- Validation only in `updateScheduleFromJSON()` (checks days array)
- Services handle file parsing errors
- UI layer should wrap importSchedule in try-catch

### Potential Improvements
- Validate color format (hex validation)
- Validate dates in exportArchive()
- Better error messages for users
- Recovery suggestions on invalid format

---

## Performance Considerations

### Time Complexity

| Operation | Complexity | Notes |
|-----------|-----------|-------|
| changeColor() | O(1) | Direct update |
| exportSchedule() | O(n) | Serialize all data |
| exportArchive() | O(w) | Filter by week range |
| importSchedule() | O(n) | Parse file |
| getScheduleData() | O(d) | Collect current data |
| updateScheduleFromJSON() | O(d + g) | Normalize + create goals |

**Variables:**
- n = total data size
- w = weeks in range
- d = days/tasks in imported data
- g = goals to create/merge

### Optimization Opportunities
- Compress exported JSON (gzip)
- Stream large imports (avoid memory issues)
- Lazy-load archive data (paginate by month)
- Cache color palette between exports

---

## Migration Plan

### From Monolithic to Composed

**Before (usePlannerState.js lines 368-458):**
```javascript
const changeColor = useCallback(/* ... */);
const exportSchedule = useCallback(/* ... */);
const exportArchive = useCallback(/* ... */);
const importSchedule = useCallback(/* ... */);
const getScheduleData = useCallback(/* ... */);
const updateScheduleFromJSON = useCallback(/* ... */);
```

**After (usePersistenceAndColorManagement.js):**
```javascript
export function usePersistenceAndColorManagement({
  days, colors, effectiveWeekSchedules,
  monthlyGoalsStore, setMonthlyGoalsStore,
  weeklyGoalsStore, setWeeklyGoalsStore,
  selectedWeek, currentYear,
  setColors, replace, updateWeekSchedules,
  // ... utilities
}) {
  // All 6 functions defined here
  return { changeColor, exportSchedule, ... };
}
```

**Integration (usePlannerState.js):**
```javascript
const persistence = usePersistenceAndColorManagement({
  // ... all parameters
});

return {
  ...persistence,  // spread into return object
  // ... other properties
};
```

---

**Last Updated:** 2026-05-31  
**Status:** Pre-implementation documentation  
**Next:** Create usePersistenceAndColorManagement.js implementation
