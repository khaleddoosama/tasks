# usePersistenceAndColorManagement Hook - Documentation

## Overview

The `usePersistenceAndColorManagement` hook handles data persistence (export/import) and color management:
- Exporting schedule data to files (full backup, archive date range)
- Importing schedule data from files
- Updating task category colors

**Location:** `src/features/planner/hooks/usePersistenceAndColorManagement.js`

> The JSON editor tab (`getScheduleData` / `updateScheduleFromJSON`) was removed in July 2026 — it was unreachable dead code. `createMissingGoalsForImportedData` in `domain/schedule/goals.js` went with it.

---

## Parameters

```javascript
{
  // Data state
  days,                     // Array — current week's days
  colors,                   // Object — current color palette
  effectiveWeekSchedules,   // Object — all weeks with the current week merged in
  monthlyGoalsStore,        // Object — all monthly goals
  weeklyGoalsStore,         // Object — all weekly goals
  selectedWeek,             // number — current week (1-52)

  // State setters
  setColors,                // Function — setState for colors

  // Utilities
  applyPlannerData,         // Function — apply imported data to state
  exportScheduleBackup,     // Function — services/scheduleTransfer
  exportArchiveRange,       // Function — services/archiveExport
  importScheduleFromFile,   // Function — services/scheduleTransfer
}
```

## Returns

```javascript
{
  changeColor(section, field, value),  // Update one color in the palette
  exportSchedule(),                    // Download full backup JSON
  exportArchive(fromDate, toDate),     // Download ID-less archive JSON for a range
  importSchedule(file),                // Parse a backup file and apply via applyPlannerData
}
```

## Behavior notes

- `importSchedule` delegates all state restoration (normalization, goal stores, notes, dark mode) to `applyPlannerData` in `usePlannerState` — the same path used by the Supabase pull.
- `exportArchive` returns the result of `exportArchiveRange` so the caller (PlannerPage) can toast when the range contained no days.
- `changeColor` writes through `setColors`; persistence to localStorage/Supabase happens automatically via `usePlannerState`'s payloads.
