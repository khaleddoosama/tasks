# useTaskManagement Hook - Documentation

## Overview

The `useTaskManagement` hook handles all task-related operations in the planner state. It encapsulates the logic for:
- Creating/updating individual tasks within a day
- Copying tasks between days
- Copying entire weeks with task cloning
- Saving and applying day templates

**Location:** `src/features/planner/hooks/useTaskManagement.js`

---

## Purpose & Scope

### Why Extract?
The monolithic `usePlannerState` hook (767 lines) mixes 6 separate concerns. Task management is one cohesive domain that should be isolated:
- Task CRUD operations (updateDay)
- Week-to-week copying (copyDay, copyPreviousWeek)
- Template persistence (saveAsTemplate, applyTemplate)
- Task ID generation (createTaskId)

### What It Manages
- **Current week's days array** — the visible task list
- **Weekly schedule cache** — all saved weeks (via ref)
- **Task ID generation** — unique IDs for new tasks
- **Week-to-week state transitions** — switching weeks while preserving data
- **Template operations** — localStorage-based day templates

### What It Does NOT Manage
- Goal management (belongs in useGoalManagement)
- Persistence/localStorage (belongs in usePersistenceAndColorManagement)
- Undo/redo (already handled by useUndoRedo)
- Color/theme management (belongs in usePersistenceAndColorManagement)

---

## Function Signatures

### Input Parameters

```javascript
useTaskManagement(
  // Current state
  days,                      // Day[] — the currently visible week
  setDays,                   // Function — setState for days array
  
  // Refs
  weekSchedulesRef,          // Ref<Object> — cache of all weeks' data
  nextTaskIdRef,             // Ref<number> — counter for generating task IDs
  
  // State setters
  updateWeekSchedules,       // Function — setState for weekSchedules
  setWeeklyGoalsStore,       // Function — setState for weekly goals (for copyPreviousWeek)
  
  // Context
  selectedWeek,              // number — current week (1-52)
  currentYear,               // number — current year
  weekKey,                   // string — "YYYY-WNN" key for current week
  weeklyGoalsStore,          // Object — all weekly goals (for copying)
  
  // Utilities
  createTaskId,              // Function — generate unique task ID
  replace,                   // Function — from useUndoRedo (replace all days)
  cloneTasksWithNewIds,      // Function — utility to clone tasks with new IDs
  createGoalId,              // Function — utility to generate goal IDs
  getWeekDates,              // Function — utility to get week dates
  getWeekKey,                // Function — utility to generate week key
  createInitialDays,         // Function — utility to scaffold default week
  normalizeDaysCategories,   // Function — utility to normalize day data
)
```

### Return Object

```javascript
{
  // Task operations on current day
  updateDay(dayId, patch),          // Update specific day with partial object
  copyDay(dayId),                   // Clone all tasks in a day with new IDs
  
  // Week operations
  copyPreviousWeek(),               // Copy entire previous week (all 7 days + weekly goals)
  
  // Template operations
  saveAsTemplate(dayId, templateName),  // Save day to localStorage as reusable template
  applyTemplate(dayId, templateName),   // Apply saved template to a specific day
  
  // Utilities
  createTaskId(),                   // Generate next unique task ID
}
```

---

## Function Details

### `updateDay(dayId, patch)` (lines 324-330)

**Purpose:** Update one or more properties of a specific day without affecting other days.

**Parameters:**
- `dayId` (number) — the day's ID (1-7 for Sat-Fri)
- `patch` (object) — properties to update: `{ type?, notes?, tasks?, ... }`

**Behavior:**
- Maps over `days` array
- Finds day matching `dayId`
- Spreads existing day properties with new `patch` values
- Returns updated array to state

**Example:**
```javascript
updateDay(3, { type: "أوفيس", notes: "عمل مهم" })
// Day 3 gets new type and notes, other properties unchanged
```

**Performance:** O(n) where n = 7 days

---

### `copyDay(dayId)` (lines 333-344)

**Purpose:** Duplicate all tasks within a single day, generating new task IDs.

**Parameters:**
- `dayId` (number) — the day to copy tasks from

**Behavior:**
1. Maps over `days` array
2. For matching day, clones tasks via `cloneTasksWithNewIds()`
3. Task IDs increment via `nextTaskIdRef`
4. All other day properties remain unchanged
5. Goal links are preserved (tasks keep `linkedWeeklyGoalId`, `linkedMonthlyGoalId`)

**Example:**
```javascript
// Day 3 has tasks with IDs: [101, 102, 103]
copyDay(3)
// Day 3 now has tasks with IDs: [104, 105, 106]
// Same content, different IDs
```

**Performance:** O(n * m) where n = 7 days, m = tasks per day

**Use Case:** User wants to repeat today's schedule for tomorrow within the same week

---

### `copyPreviousWeek()` (lines 346-379)

**Purpose:** Copy entire previous week (all 7 days + tasks + weekly goals) to current week.

**Parameters:** None (uses context: `selectedWeek`, `currentYear`, `weekKey`, `weekSchedulesRef`)

**Behavior:**
1. Guard: return if `selectedWeek === 1` (no previous week)
2. Fetch previous week's data from `weekSchedulesRef` by key
3. For each day in previous week:
   - Clone all tasks with new IDs
   - Update date from `التاريخ` to current week's dates
4. Replace current week via `replace()` (for undo/redo support)
5. If previous week had weekly goals:
   - Clone each goal with new ID (via `createGoalId`)
   - Update `createdAt` timestamp
   - Save to `weeklyGoalsStore[weekKey]`

**Side Effects:**
- Modifies `days` (via replace)
- Modifies `weeklyGoalsStore[weekKey]`
- Does NOT copy monthly goals (they persist across weeks automatically)

**Example:**
```javascript
// Week 21: 3 days of tasks, 2 weekly goals
// Switch to Week 22
copyPreviousWeek()
// Week 22 now has:
//   - Same 3 days structure
//   - Same tasks (new IDs)
//   - Same weekly goals (new IDs)
//   - Updated dates for each day
```

**Performance:** O(n * m + g) where:
- n = 7 days
- m = tasks per day
- g = weekly goals to clone

**Important:** This is the user's answer to "will weekly goals be copied?" → YES

---

### `saveAsTemplate(dayId, templateName)` (lines 381-400)

**Purpose:** Persist a day's complete structure to localStorage for reuse across weeks.

**Parameters:**
- `dayId` (number) — the day to save
- `templateName` (string) — user-friendly name for the template

**Behavior:**
1. Validate: find day matching `dayId`, trim template name
2. Read existing templates from localStorage key `"dayTemplatesV1"`
3. Create template object:
   ```javascript
   {
     name,                 // string
     type,                 // "إجازة" | "أوفيس" | "بيت"
     notes,                // string
     tasks,                // array (shallow copy)
     مستوى_الطاقة,         // "عالية" | "متوسطة" | "منخفضة"
     تقييم_اليوم,         // string (user comment)
     عدد_ساعات_النوم,      // string (duration)
     عدد_ساعات_الهاتف,     // string (duration)
   }
   ```
4. Store under `templates[templateName]`
5. Write back to localStorage

**Side Effects:**
- Modifies localStorage (key: `"dayTemplatesV1"`)

**Example:**
```javascript
saveAsTemplate(6, "يوم عمل قياسي")
// localStorage.dayTemplatesV1 now contains:
// {
//   "يوم عمل قياسي": {
//     type: "أوفيس",
//     tasks: [...],
//     // ...
//   }
// }
```

**Performance:** O(1) for template creation + O(m) for localStorage serialization

**Error Handling:**
- Returns silently if day not found
- Returns silently if template name is empty after trimming

---

### `applyTemplate(dayId, templateName)` (lines 402-420)

**Purpose:** Load a saved template and apply it to a specific day.

**Parameters:**
- `dayId` (number) — the day to apply template to
- `templateName` (string) — name of template to load

**Behavior:**
1. Read templates from localStorage key `"dayTemplatesV1"`
2. Find template by name; return if not found
3. Call `updateDay()` with patch containing:
   - All properties from template
   - Tasks cloned with new IDs (via `cloneTasksWithNewIds`)
4. Preserves other day properties not in template

**Side Effects:**
- Modifies `days` (via updateDay)
- Does NOT modify localStorage
- Does NOT modify goals

**Example:**
```javascript
// Template "يوم عمل قياسي" has 4 tasks
applyTemplate(5, "يوم عمل قياسي")
// Day 5 now has:
//   - type: "أوفيس" (from template)
//   - tasks: [...] (cloned, with new IDs)
//   - notes: "..." (from template)
//   - Other properties unchanged
```

**Performance:** O(1) for template lookup + O(m) for task cloning

**Error Handling:**
- Returns silently if template not found
- No validation of template structure (assumes valid format)

---

### `createTaskId()` (lines 158-161)

**Purpose:** Generate unique, monotonically increasing task IDs.

**Parameters:** None

**Returns:** number — next available task ID

**Behavior:**
1. Increments `nextTaskIdRef.current` by 1
2. Returns the new value
3. On component mount, `nextTaskIdRef` is seeded with max ID from current days

**Performance:** O(1)

**Example:**
```javascript
// After mount, nextTaskIdRef = 105
createTaskId()  // returns 106
createTaskId()  // returns 107
createTaskId()  // returns 108
```

**Important:** Task IDs persist across weeks (shared counter), ensuring uniqueness even when copying between weeks.

---

## Data Flow Diagram

```
User Action                 Hook Function           State Updates
─────────────────────────────────────────────────────────────────

Edit task details    →      updateDay()       →     days[X] updated
                                              →     persist to weekSchedules

Copy today tasks     →      copyDay()         →     days[X] tasks cloned
                            (createTaskId)    →     nextTaskIdRef incremented

Copy prev week       →      copyPreviousWeek()→     days array replaced
                            (createTaskId)    →     weeklyGoalsStore[weekKey] updated
                            (createGoalId)    →     nextTaskIdRef incremented

Save template        →      saveAsTemplate()  →     localStorage updated

Apply template       →      applyTemplate()   →     days[X] updated
                            (createTaskId)    →     tasks cloned
```

---

## Integration Points

### Used By
- `PlannerPage.jsx` — calls hook via `usePlannerState()`
- `DayCard.jsx` — receives `updateDay`, `copyDay`, `saveAsTemplate`, `applyTemplate` as props

### Depends On
```javascript
// External utilities
import { cloneTasksWithNewIds, getNextTaskIdSeed } from "../../domain/schedule/ids";
import { createGoalId } from "../../domain/schedule/goals";
import { createInitialDays } from "../../domain/schedule/seedData";
import { getWeekDates, getWeekKey } from "../../domain/schedule/week";

// From composed hook
import useUndoRedo    // provides replace()
import normalizeData   // from categories.js

// React
import { useCallback, useRef, useEffect } from "react";
```

### Returns To
- `usePlannerState()` — consumed by composed hook, spread into return object

---

## State Synchronization

### Critical: Weekly Schedule Synchronization

The hook maintains two sources of truth:
1. **`days`** — currently visible week (in state via useUndoRedo)
2. **`weekSchedulesRef`** — cache of all weeks (in ref)

**Why both?**
- `days` supports undo/redo (useUndoRedo requirement)
- `weekSchedulesRef` avoids stale closures when copying between weeks

**Sync Challenge:**
- When user navigates to week N, `days` is updated but `weekSchedulesRef` must also include week N-1
- `changeSelectedWeek()` (in usePlannerState) updates weekSchedulesRef before switching
- This hook must ALWAYS update both in sync

**Current Pattern:**
```javascript
// After any modification, also update weekSchedulesRef
updateWeekSchedules((currentSchedules) => ({
  ...currentSchedules,
  [weekKey]: modifiedDays
}));
```

---

## Testing Strategy

### Unit Tests Needed

1. **updateDay()**
   - ✅ Updates target day properties
   - ✅ Leaves other days unchanged
   - ✅ Handles partial patch
   - ✅ Preserves task order

2. **copyDay()**
   - ✅ Clones all tasks in target day
   - ✅ Generates new task IDs
   - ✅ Preserves task content/properties
   - ✅ Preserves goal links
   - ✅ Doesn't affect other days

3. **copyPreviousWeek()**
   - ✅ Returns early if week === 1
   - ✅ Fetches from weekSchedulesRef by key
   - ✅ Clones all 7 days
   - ✅ Updates التاريخ to current week dates
   - ✅ Generates new task IDs
   - ✅ Copies weekly goals with new IDs
   - ✅ Updates createdAt timestamps
   - ✅ Does NOT copy monthly goals
   - ✅ Calls replace() for undo/redo

4. **saveAsTemplate()**
   - ✅ Saves to localStorage with key "dayTemplatesV1"
   - ✅ Includes all template fields
   - ✅ Overwrites existing template of same name
   - ✅ Returns silently if day not found
   - ✅ Trims template name

5. **applyTemplate()**
   - ✅ Loads from localStorage
   - ✅ Applies all template properties
   - ✅ Clones tasks with new IDs
   - ✅ Returns silently if template not found
   - ✅ Preserves non-template properties

6. **createTaskId()**
   - ✅ Returns monotonically increasing IDs
   - ✅ Doesn't duplicate IDs
   - ✅ Updates nextTaskIdRef

### Integration Tests Needed

1. **Week Switching + Copy**
   - Create week 21 with tasks
   - Switch to week 22
   - copyPreviousWeek()
   - Verify week 21 data in weekSchedulesRef
   - Verify new IDs generated
   - Verify dates updated

2. **Template Workflow**
   - saveAsTemplate(day, name)
   - Verify localStorage contains template
   - Switch to different week
   - applyTemplate(different_day, name)
   - Verify properties applied, new IDs generated

---

## Future Optimizations

### Potential Improvements

1. **Memoization**
   - Memoize `cloneTasksWithNewIds()` calls
   - Cache template reads from localStorage

2. **Validation**
   - Validate day ID is 1-7
   - Validate patch object shape
   - Validate template structure on load

3. **Performance**
   - Consider using Immer for state immutability
   - Batch multiple updates with `useTransition`

4. **Error Handling**
   - Return success/error status instead of silent returns
   - Log errors for debugging
   - Provide user feedback on failures

---

## Migration Plan

### From Monolithic to Composed

**Before (usePlannerState.js lines 324-420):**
```javascript
export function usePlannerState() {
  // ... all state setup
  
  const updateDay = useCallback(/* ... */);
  const copyDay = useCallback(/* ... */);
  const copyPreviousWeek = useCallback(/* ... */);
  const saveAsTemplate = useCallback(/* ... */);
  const applyTemplate = useCallback(/* ... */);
  
  return {
    // ... 40+ properties
    updateDay, copyDay, copyPreviousWeek, saveAsTemplate, applyTemplate,
  };
}
```

**After (usePlannerState.js):**
```javascript
import { useTaskManagement } from "./hooks/useTaskManagement";

export function usePlannerState() {
  // ... base state setup (colors, goals, persistence, etc.)
  
  const tasks = useTaskManagement({
    days, setDays,
    weekSchedulesRef, nextTaskIdRef,
    updateWeekSchedules, setWeeklyGoalsStore,
    selectedWeek, currentYear, weekKey, weeklyGoalsStore,
    createTaskId, replace, cloneTasksWithNewIds, createGoalId,
    getWeekDates, getWeekKey, createInitialDays, normalizeDaysCategories,
  });
  
  return {
    // ... other properties
    ...tasks,  // spreads updateDay, copyDay, etc.
  };
}
```

**New File (useTaskManagement.js):**
```javascript
export function useTaskManagement({
  days, setDays,
  // ... all 15+ parameters
}) {
  return {
    updateDay, copyDay, copyPreviousWeek, saveAsTemplate, applyTemplate,
  };
}
```

---

## Last Updated

- **Date:** 2026-05-31
- **Status:** Pre-implementation documentation
- **Next:** Create useTaskManagement.js implementation
