# useGoalManagement Hook - Documentation

## Overview

The `useGoalManagement` hook handles all goal-related operations in the planner state. It encapsulates the logic for:
- Creating/updating/deleting monthly goals
- Creating/updating/deleting weekly goals
- Managing goal hierarchy (monthly → weekly → task linkage)
- Cascading deletions (deleting monthly goal deletes child weekly goals)
- Clearing goal links from days and week schedules

**Location:** `src/features/planner/hooks/useGoalManagement.js`

---

## Purpose & Scope

### Why Extract?
The monolithic `usePlannerState` hook mixes 6 separate concerns. Goal management is a complex, cohesive domain that should be isolated:
- Monthly goal CRUD operations
- Weekly goal CRUD operations
- Goal hierarchy management (parent-child relationships)
- Cascading deletion logic (complex multi-step operations)
- Goal link clearing (propagates to tasks and schedules)

### What It Manages
- **Monthly goals store** — goals persisted by month key ("YYYY-MM")
- **Weekly goals store** — goals persisted by week key ("YYYY-WNN")
- **Goal hierarchy** — weekly goals linked to parent monthly goals
- **Goal links in tasks** — tasks can reference goals via `linkedMonthlyGoalId` or `linkedWeeklyGoalId`
- **Goal progress tracking** — data for calculating completion rates

### What It Does NOT Manage
- Task operations (belongs in useTaskManagement)
- Persistence/localStorage (belongs in usePersistenceAndColorManagement)
- Goal progress calculation (handled separately via useMemo in usePlannerState)
- Color management (belongs in usePersistenceAndColorManagement)

---

## Function Signatures

### Input Parameters

```javascript
useGoalManagement(
  // Monthly goal state
  monthlyGoalsStore,         // Object — all monthly goals keyed by month key
  setMonthlyGoalsStore,      // Function — setState for monthly goals
  
  // Weekly goal state
  weeklyGoalsStore,          // Object — all weekly goals keyed by week key
  setWeeklyGoalsStore,       // Function — setState for weekly goals
  
  // Day/schedule state (for clearing links)
  days,                      // Array — current week's days
  setDays,                   // Function — setState for days
  updateWeekSchedules,       // Function — setState for all weeks' schedules
  effectiveWeekSchedules,    // Object — all weeks' data with current week merged
  
  // Context
  monthKey,                  // string — current month key "YYYY-MM"
  weekKey,                   // string — current week key "YYYY-WNN"
  
  // Utilities
  createGoalId,              // Function — generate unique goal IDs
  ensureMonthGoalBucket,     // Function — ensure month exists in store
  ensureWeekGoalBucket,      // Function — ensure week exists in store
  normalizedWeeklyGoals,     // Object — normalized weekly goals
  clearGoalLinksFromDays,    // Function — remove goal references from days
  clearGoalLinksFromSchedules, // Function — remove goal references from schedules
)
```

### Return Object

```javascript
{
  // Monthly goal operations
  addMonthlyGoal(title),                    // Create new monthly goal
  updateMonthlyGoalTitle(goalId, title),    // Update goal title
  deleteMonthlyGoal(goalId),                // Delete goal + child weekly goals

  // Weekly goal operations
  addWeeklyGoal(monthlyGoalId, title),      // Create new weekly goal
  updateWeeklyGoalTitle(goalId, title),     // Update goal title
  deleteWeeklyGoal(goalId),                 // Delete goal + clear links from tasks
}
```

---

## Function Details

### Monthly Goals

#### `addMonthlyGoal(title)` (lines 347-367)

**Purpose:** Create a new monthly goal for the current month.

**Parameters:**
- `title` (string) — goal title (trimmed)

**Behavior:**
1. Validate title is not empty after trim
2. Generate unique goal ID via `createGoalId("monthly-goal")`
3. Record current timestamp as `createdAt`
4. Ensure `monthlyGoalsStore[monthKey]` bucket exists
5. Insert goal object with structure:
   ```javascript
   {
     id,         // unique ID
     title,      // user-provided title
     status,     // "active"
     createdAt   // ISO timestamp
   }
   ```
6. Write to state

**Example:**
```javascript
addMonthlyGoal("تطوير مشروع جديد")
// Creates goal under monthlyGoalsStore["2026-05"]
```

**Performance:** O(1) for lookup + insertion

**Error Handling:** Returns silently if title is empty after trimming

---

#### `updateMonthlyGoalTitle(goalId, title)` (lines 369-382)

**Purpose:** Update the title of an existing monthly goal.

**Parameters:**
- `goalId` (string) — the goal ID to update
- `title` (string) — new title

**Behavior:**
1. Ensure `monthlyGoalsStore[monthKey]` bucket exists
2. Find goal by ID
3. Return unchanged if goal not found
4. Update title, preserve other properties
5. Write to state

**Example:**
```javascript
updateMonthlyGoalTitle("2026-05-goal-1", "تطوير مشروع محسّن")
```

**Performance:** O(1) for lookup + update

---

#### `deleteMonthlyGoal(goalId)` (lines 438-478)

**Purpose:** Delete a monthly goal AND all its child weekly goals, clearing task links.

**Parameters:**
- `goalId` (string) — monthly goal ID to delete

**Behavior:** **COMPLEX - Multi-step cascade**

1. **Find child weekly goals:**
   ```javascript
   const childWeeklyGoalIds = Object.values(normalizedWeeklyGoals)
     .flatMap(goals => Object.values(goals))
     .filter(goal => goal.monthlyGoalId === goalId)
     .map(goal => goal.id);
   ```

2. **Delete from monthly goals store:**
   - Remove `monthlyGoalsStore[monthKey][goalId]`

3. **Delete all child weekly goals:**
   - Iterate all weeks in `weeklyGoalsStore`
   - Remove each `childWeeklyGoalIds` entry
   - Preserve goals from other months

4. **Clear goal links from current week tasks:**
   ```javascript
   // Remove weekly goal links for children
   clearGoalLinksFromDays(days, childWeeklyGoalIds, "weekly")
   // Remove monthly goal links for parent
   clearGoalLinksFromDays(days, [goalId], "monthly")
   ```

5. **Clear goal links from all weeks:**
   ```javascript
   // Same clearing logic applied to effectiveWeekSchedules
   clearGoalLinksFromSchedules(schedules, childWeeklyGoalIds, "weekly")
   clearGoalLinksFromSchedules(schedules, [goalId], "monthly")
   ```

**Side Effects:**
- Modifies `monthlyGoalsStore`
- Modifies `weeklyGoalsStore` (removes children)
- Modifies `days` (clears goal links)
- Modifies `effectiveWeekSchedules` (clears goal links)

**Example:**
```javascript
// User deletes monthly goal "2026-05-goal-1"
// This also deletes:
//   - 3 child weekly goals
//   - All task links to this goal and children
//   - All links in saved weeks
deleteMonthlyGoal("2026-05-goal-1")
```

**Performance:** O(w * d * t) where w = weeks, d = days, t = tasks
- Iterates all weeks to find children
- Iterates all weeks to clear links
- Iterates all days to clear links

**Critical:** This is a destructive operation with cascading effects

---

### Weekly Goals

#### `addWeeklyGoal(monthlyGoalId, title)` (lines 384-405)

**Purpose:** Create a new weekly goal linked to a parent monthly goal.

**Parameters:**
- `monthlyGoalId` (string) — parent monthly goal ID
- `title` (string) — goal title (trimmed)

**Behavior:**
1. Validate title is not empty after trim
2. Generate unique goal ID via `createGoalId("weekly-goal")`
3. Record current timestamp as `createdAt`
4. Ensure `weeklyGoalsStore[weekKey]` bucket exists
5. Insert goal object with structure:
   ```javascript
   {
     id,              // unique ID
     title,           // user-provided title
     monthlyGoalId,   // parent goal reference
     status,          // "active"
     createdAt        // ISO timestamp
   }
   ```
6. Write to state

**Example:**
```javascript
addWeeklyGoal("2026-05-goal-1", "إنجاز المرحلة الأولى")
// Creates weekly goal under weeklyGoalsStore["2026-W22"]
// Links to monthly goal "2026-05-goal-1"
```

**Performance:** O(1) for lookup + insertion

**Error Handling:** Returns silently if title is empty after trimming

---

#### `updateWeeklyGoalTitle(goalId, title)` (lines 407-420)

**Purpose:** Update the title of an existing weekly goal.

**Parameters:**
- `goalId` (string) — the goal ID to update
- `title` (string) — new title

**Behavior:**
1. Ensure `weeklyGoalsStore[weekKey]` bucket exists
2. Find goal by ID
3. Return unchanged if goal not found
4. Update title, preserve other properties (including `monthlyGoalId`)
5. Write to state

**Example:**
```javascript
updateWeeklyGoalTitle("2026-W22-goal-5", "إنجاز المرحلة الأولى المحسّنة")
```

**Performance:** O(1) for lookup + update

---

#### `deleteWeeklyGoal(goalId)` (lines 422-436)

**Purpose:** Delete a weekly goal and clear all task links to it.

**Parameters:**
- `goalId` (string) — weekly goal ID to delete

**Behavior:**
1. **Delete from weekly goals store:**
   - Remove `weeklyGoalsStore[weekKey][goalId]`
   - Only affects current week

2. **Clear goal links from current week tasks:**
   ```javascript
   setDays(currentDays => 
     clearGoalLinksFromDays(currentDays, [goalId], "weekly")
   )
   ```

3. **Clear goal links from all weeks:**
   ```javascript
   updateWeekSchedules(currentSchedules =>
     clearGoalLinksFromSchedules(currentSchedules, [goalId], "weekly")
   )
   ```

**Side Effects:**
- Modifies `weeklyGoalsStore[weekKey]`
- Modifies `days` (clears goal links)
- Modifies `effectiveWeekSchedules` (clears goal links)

**Example:**
```javascript
// Delete weekly goal
deleteWeeklyGoal("2026-W22-goal-5")
// Tasks linked to this goal now have linkedWeeklyGoalId cleared
```

**Performance:** O(w * d * t) where w = weeks, d = days, t = tasks
- Iterates current week's days
- Iterates all weeks to clear links

**Difference from deleteMonthlyGoal:**
- Does NOT delete child goals (weekly goals have no children)
- Only clears weekly goal links (not monthly)
- Only modifies `weeklyGoalsStore[weekKey]`, not entire store

---

## Data Model

### Monthly Goal Structure
```javascript
{
  id: "2026-05-goal-1",  // "YYYY-MM-goal-{number}"
  title: "تطوير مشروع جديد",
  status: "active",
  createdAt: "2026-05-31T18:30:00Z"
}
```

### Weekly Goal Structure
```javascript
{
  id: "2026-W22-goal-5",       // "YYYY-WNN-goal-{number}"
  title: "إنجاز المرحلة الأولى",
  monthlyGoalId: "2026-05-goal-1",  // Link to parent
  status: "active",
  createdAt: "2026-05-31T18:30:00Z"
}
```

### Storage Organization
```javascript
// monthlyGoalsStore keyed by month
{
  "2026-05": {
    "2026-05-goal-1": { ... },
    "2026-05-goal-2": { ... }
  },
  "2026-06": { ... }
}

// weeklyGoalsStore keyed by week
{
  "2026-W22": {
    "2026-W22-goal-5": { ... },
    "2026-W22-goal-6": { ... }
  },
  "2026-W23": { ... }
}
```

---

## Goal Hierarchy

```
Monthly Goal (monthKey: "2026-05")
  ├── Weekly Goal (weekKey: "2026-W22", monthlyGoalId: "2026-05-goal-1")
  │   ├── Task 1 (linkedWeeklyGoalId: "2026-W22-goal-5")
  │   ├── Task 2 (linkedWeeklyGoalId: "2026-W22-goal-5")
  │   └── Task 3 (linkedWeeklyGoalId: "2026-W22-goal-5")
  │
  └── Weekly Goal (weekKey: "2026-W23", monthlyGoalId: "2026-05-goal-1")
      ├── Task 4 (linkedWeeklyGoalId: "2026-W23-goal-7")
      └── Task 5 (linkedWeeklyGoalId: "2026-W23-goal-7")
```

### Link Management
- Tasks can be linked to weekly OR monthly goals (not both simultaneously)
- `linkedWeeklyGoalId` — task linked to weekly goal
- `linkedMonthlyGoalId` — task linked to monthly goal (directly)
- `linkedGoalType` — "weekly" | "monthly" | "" (empty if not linked)

---

## Integration Points

### Used By
- `GoalsTab.jsx` — displays monthly goals, allows CRUD
- `GoalsTab.jsx` — displays weekly goals, allows CRUD
- Goal selection in `TaskRow.jsx` — link tasks to goals

### Depends On
```javascript
// State from usePlannerState
monthlyGoalsStore, setMonthlyGoalsStore
weeklyGoalsStore, setWeeklyGoalsStore
days, setDays
updateWeekSchedules
effectiveWeekSchedules
monthKey, weekKey
normalizedWeeklyGoals

// Utilities from goals.js
createGoalId
ensureMonthGoalBucket
ensureWeekGoalBucket
clearGoalLinksFromDays
clearGoalLinksFromSchedules
```

### Returns To
- `usePlannerState()` — consumed by composed hook

---

## Testing Strategy

### Unit Tests (6 test suites)

#### 1. addMonthlyGoal()
- ✅ Creates goal with correct structure
- ✅ Generates unique ID
- ✅ Records createdAt timestamp
- ✅ Stores under correct monthKey
- ✅ Returns silently if title is empty
- ✅ Handles duplicate titles (no deduplication)

#### 2. updateMonthlyGoalTitle()
- ✅ Updates title in existing goal
- ✅ Preserves other properties (id, status, createdAt)
- ✅ Returns unchanged store if goal not found
- ✅ Handles empty titles

#### 3. deleteMonthlyGoal()
- ✅ Removes goal from monthlyGoalsStore
- ✅ Finds and removes all child weekly goals
- ✅ Clears goal links from current week's days
- ✅ Clears goal links from all weeks' schedules
- ✅ Handles goals with no children
- ✅ Handles non-existent goal IDs gracefully

#### 4. addWeeklyGoal()
- ✅ Creates goal with correct structure
- ✅ Links to parent monthly goal
- ✅ Generates unique ID
- ✅ Records createdAt timestamp
- ✅ Stores under correct weekKey
- ✅ Returns silently if title is empty

#### 5. updateWeeklyGoalTitle()
- ✅ Updates title in existing goal
- ✅ Preserves monthlyGoalId link
- ✅ Returns unchanged store if goal not found

#### 6. deleteWeeklyGoal()
- ✅ Removes goal from weeklyGoalsStore
- ✅ Clears goal links from current week's days
- ✅ Clears goal links from all weeks' schedules
- ✅ Does NOT delete parent monthly goal
- ✅ Handles non-existent goal IDs gracefully

### Integration Tests (4 scenarios)

#### 1. Create Monthly Goal → Create Weekly Goal → Link Task
```javascript
1. addMonthlyGoal("مشروع جديد")      → monthlyGoalId
2. addWeeklyGoal(monthlyGoalId, "أسبوع 1")  → weeklyGoalId
3. Task links to weeklyGoalId
   // Verify: goal progression shows task count
```

#### 2. Update Monthly Goal Title → Weekly Goals Unaffected
```javascript
1. Create monthly goal and 2 weekly child goals
2. updateMonthlyGoalTitle(monthlyGoalId, "اسم جديد")
3. Verify: weekly goals still have same monthlyGoalId
```

#### 3. Delete Monthly Goal → Cascade Deletes All Children
```javascript
1. Create monthly goal with 3 weekly child goals
2. Create 5 tasks linked to various weekly goals
3. deleteMonthlyGoal(monthlyGoalId)
4. Verify:
   - Monthly goal removed
   - All 3 weekly goals removed
   - All 5 tasks have goal links cleared
   - Other weeks unaffected
```

#### 4. Delete Weekly Goal → Monthly Goal Unaffected
```javascript
1. Create monthly goal with 2 weekly child goals
2. Create 3 tasks linked to weekly goal 1
3. deleteWeeklyGoal(weeklyGoalId1)
4. Verify:
   - Weekly goal 1 removed
   - Weekly goal 2 still exists
   - Monthly goal still exists
   - Tasks have goal links cleared
   - Weekly goal 2 unaffected
```

### Edge Cases to Test

- Empty stores (monthlyGoalsStore = {})
- Missing month/week buckets (auto-creation via ensure functions)
- Deleting goal with no children (monthly goal)
- Deleting goal with many children (multiple weeks)
- Goal links across multiple weeks
- Concurrent goal operations (rapid create/delete)

---

## State Synchronization

### Critical: Weekly vs All-Weeks Consistency

When deleting a weekly goal, links must be cleared in TWO places:
1. **Current week:** `days` state (via setDays)
2. **All weeks:** `effectiveWeekSchedules` (via updateWeekSchedules)

**Why both?**
- `days` is the actively displayed week (needs immediate update)
- `effectiveWeekSchedules` caches all weeks (must stay in sync)

**Pattern in deleteWeeklyGoal:**
```javascript
// Clear from current week
setDays(currentDays => clearGoalLinksFromDays(currentDays, [goalId], "weekly"))

// Clear from all weeks
updateWeekSchedules(currentSchedules =>
  clearGoalLinksFromSchedules(currentSchedules, [goalId], "weekly")
)
```

### Cascade Pattern in deleteMonthlyGoal

When deleting a monthly goal:
1. Find all child weekly goals across ALL weeks
2. Delete from monthlyGoalsStore (entire month)
3. Delete children from weeklyGoalsStore (iterate all weeks)
4. Clear goal links from days (current week only)
5. Clear goal links from schedules (all weeks)

**Critical dependency:** Must process children BEFORE clearing links, otherwise can't find which links to clear.

---

## Performance Considerations

### Time Complexity

| Operation | Complexity | Notes |
|-----------|-----------|-------|
| addMonthlyGoal() | O(1) | Direct insertion |
| updateMonthlyGoalTitle() | O(1) | Direct update |
| deleteMonthlyGoal() | O(w + w·d·t) | Find children + clear links |
| addWeeklyGoal() | O(1) | Direct insertion |
| updateWeeklyGoalTitle() | O(1) | Direct update |
| deleteWeeklyGoal() | O(w·d·t) | Clear links across all weeks |

**Variables:**
- w = number of weeks with data
- d = days per week (constant 7)
- t = tasks per day (variable, typically 5-10)

**Bottleneck:** deleteMonthlyGoal() with many weeks and tasks
- Consider caching child goal IDs in monthly goal object
- Lazy-clear links instead of immediate cascade
- Use IndexedDB for large datasets (future optimization)

---

## Error Handling

### Current Approach
- **Silent returns** for invalid input (empty titles)
- **No exceptions** thrown for non-existent goals
- **Graceful degradation** if goal not found

### Potential Improvements
- Return success/error status instead of void
- Log warnings for non-existent goal deletions
- Validate goal ID format
- Type-check parameters (with TypeScript)

---

## Migration Plan

### From Monolithic to Composed

**Before (usePlannerState.js lines 347-478):**
```javascript
const addMonthlyGoal = useCallback(/* ... */);
const updateMonthlyGoalTitle = useCallback(/* ... */);
const addWeeklyGoal = useCallback(/* ... */);
const updateWeeklyGoalTitle = useCallback(/* ... */);
const deleteWeeklyGoal = useCallback(/* ... */);
const deleteMonthlyGoal = useCallback(/* ... */);
```

**After (useGoalManagement.js):**
```javascript
export function useGoalManagement({
  monthlyGoalsStore, setMonthlyGoalsStore,
  weeklyGoalsStore, setWeeklyGoalsStore,
  days, setDays, updateWeekSchedules,
  effectiveWeekSchedules,
  monthKey, weekKey,
  createGoalId, ensureMonthGoalBucket, ensureWeekGoalBucket,
  normalizedWeeklyGoals,
  clearGoalLinksFromDays, clearGoalLinksFromSchedules
}) {
  // Functions defined here
  return { addMonthlyGoal, updateMonthlyGoalTitle, ... };
}
```

**Integration (usePlannerState.js):**
```javascript
const goals = useGoalManagement({
  monthlyGoalsStore, setMonthlyGoalsStore,
  // ... all parameters
});

return {
  ...goals,  // spread into return object
  // ... other properties
};
```

---

## Summary of Extracted Functions

| Function | Lines | Complexity | Dependencies |
|----------|-------|-----------|--------------|
| addMonthlyGoal | 21 | O(1) | monthKey, setMonthlyGoalsStore, createGoalId |
| updateMonthlyGoalTitle | 14 | O(1) | monthKey, setMonthlyGoalsStore |
| addWeeklyGoal | 22 | O(1) | weekKey, setWeeklyGoalsStore, createGoalId |
| updateWeeklyGoalTitle | 13 | O(1) | weekKey, setWeeklyGoalsStore |
| deleteWeeklyGoal | 15 | O(w·d·t) | weekKey, setWeeklyGoalsStore, setDays, updateWeekSchedules |
| deleteMonthlyGoal | 41 | O(w + w·d·t) | monthKey, setMonthlyGoalsStore, setWeeklyGoalsStore, setDays, updateWeekSchedules, normalizedWeeklyGoals |
| **Total** | **126** | — | — |

---

**Last Updated:** 2026-05-31  
**Status:** Pre-implementation documentation  
**Next:** Create useGoalManagement.js implementation
