# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Weekly Schedule Planner** — A React-based web application for planning and managing a weekly schedule. Built fully in Arabic (RTL) with multi-week navigation, task categorization, goal tracking, localStorage persistence, Supabase cloud sync, and print-to-PDF export.

## Commands

```bash
npm run dev          # Dev server on 0.0.0.0:5173
npm run build        # Production build
npm run preview      # Preview production build on 0.0.0.0
npm test             # Run all Vitest tests once
npm run test:watch   # Run tests in watch mode
```

## Environment Variables

Create `.env.local` in the project root (already gitignored):

```
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
```

For Netlify Functions (set in Netlify dashboard — never use `VITE_` prefix for these):
```
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
```

## Architecture

The app is organized into layers:

```
src/
├── features/
│   ├── planner/
│   │   ├── PlannerPage.jsx       # Root UI component — renders tabs and toolbar
│   │   ├── usePlannerState.js    # Central state orchestrator (see below)
│   │   └── hooks/
│   │       ├── useTaskManagement.js             # updateDay, copyDay, copyPreviousWeek, carryTaskToNextDay
│   │       ├── useGoalManagement.js             # Monthly/weekly goal CRUD
│   │       └── usePersistenceAndColorManagement.js  # changeColor, import/export, JSON editor plumbing
│   └── archive/ArchivePage.jsx   # Read-only archive view
├── domain/schedule/
│   ├── constants.js          # CATEGORY_META, DEFAULT_COLORS, LS_KEY
│   ├── categories.js         # normalizeColors, normalizeDaysCategories
│   ├── goals.js              # Goal progress calculation, goal store normalization
│   ├── week.js               # Week/date arithmetic (week keys, date formatting)
│   ├── time.js               # Time parsing, duration calculation, conflict detection
│   ├── stats.js              # calculateWeekStats, parseHoursLoose
│   ├── suggestions.js        # buildTaskSuggestions — frequency-ranked autocomplete
│   ├── print.js              # Print HTML generation
│   ├── ids.js                # Task ID generation helpers
│   └── seedData.js           # createInitialDays — default week scaffold
├── theme/
│   └── tokens.js             # Design tokens: SPACING, RADIUS, FONT, getTheme(darkMode) light/dark palettes
├── hooks/
│   ├── useUndoRedo.js           # Wraps useState with 30-state undo/redo history
│   ├── useLocalStorageState.js  # useState synced to localStorage
│   ├── useSchedulePersistence.js  # Debounced auto-save + restore from localStorage
│   ├── useSupabaseSync.js       # Supabase auth + cloud push/pull + unload keepalive flush
│   ├── usePrintStyle.js         # Injects/removes <style id="__print_style__"> + hidden print DOM
│   └── useKeyboardShortcuts.js  # Ctrl+Z/Y/P/S handlers
├── components/
│   ├── schedule/DayCard.jsx     # Collapsible day section with task table
│   ├── schedule/TaskRow.jsx     # Inline-editable task row (autocomplete, smart time, carry-over button)
│   ├── schedule/GoalSelector.jsx  # Per-task goal-link dropdown (grouped + memoized)
│   ├── schedule/EnergyLog.jsx   # Intraday energy entries (day.energyLog)
│   ├── schedule/TimePickerField.jsx
│   ├── AuthModal.jsx            # Email+password login / sign-up modal
│   ├── TemplateManager.jsx / TemplateEditModal.jsx / TemplateSelectionModal.jsx
│   └── tabs/                   # ColorsTab, GoalsTab, GoalStatsTab, GeneralNotesTab, PreviewTab,
│                               # JSONEditorTab, StatsTab (+ WeekTrends 4-week trend charts)
├── services/
│   ├── supabaseClient.js     # createClient — also exports supabaseUrl/supabaseAnonKey for keepalive flush
│   ├── cloudStore.js         # CRUD for `days`/`tasks`/`user_data` tables + flushPushKeepalive
│   ├── archiveExport.js      # exportArchiveRange — ID-less JSON for archive/AI
│   ├── scheduleTransfer.js   # exportScheduleBackup, importScheduleFromFile
│   └── dayTemplates.js       # Day-template storage (dayTemplatesV1) read/write
└── SyncStatusIndicator.jsx
```

### Supabase schema (normalized: days + tasks + user_data)

Schedule data lives in **normalized `days` and `tasks` tables** (migrated June 2026 from the old jsonb `weeks` table, which still exists but is legacy/stale — do not write to it).

```sql
-- One row per user per day. UNIQUE (user_id, week_key, day_index) drives upserts.
CREATE TABLE days (
  id          bigint PRIMARY KEY,        -- sequence
  user_id     uuid REFERENCES auth.users(id),
  week_key    text NOT NULL,             -- "YYYY-WNN"
  day_index   integer NOT NULL,          -- 0–6 within the week
  name        text, date text, type text, notes text,
  enabled     boolean DEFAULT true,
  energy      text, rating text, sleep_hours text, phone_hours text,
  energy_log  jsonb DEFAULT '[]',        -- intraday entries [{time, level}]
  updated_at  timestamptz DEFAULT now()
);

-- One row per task. (day_id, app_id) is the stable upsert key — app_id is the
-- task id generated client-side, so notes/edits survive re-pushes.
CREATE TABLE tasks (
  id bigint PRIMARY KEY,
  user_id uuid, day_id bigint REFERENCES days(id),
  app_id integer, task_order integer,
  time text, task text, cat text, notes text,
  done boolean DEFAULT false, recurring boolean DEFAULT false,
  carry_count integer DEFAULT 0,         -- how many times the task was carried to the next day
  linked_weekly_goal_id text, linked_monthly_goal_id text,
  linked_goal_type text, linked_goal_id text,
  updated_at timestamptz DEFAULT now()
);

-- All other user data in a single row
CREATE TABLE user_data (
  user_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  colors        jsonb,
  dark_mode     boolean DEFAULT false,
  selected_week integer,
  monthly_goals jsonb DEFAULT '{}',
  weekly_goals  jsonb DEFAULT '{}',
  templates     jsonb DEFAULT '{}',
  general_notes jsonb DEFAULT '[]',
  updated_at    timestamptz DEFAULT now()
);
```

All tables have RLS enabled — users can only access their own rows. `cloudStore.js` is the only module that talks to these tables; it converts between the app's Arabic-keyed day objects and the snake_case columns (see `buildDayRow`/`buildTaskRow`).

### `usePlannerState` — the core

All application state lives in `usePlannerState`. It owns:

- **`days`** (via `useUndoRedo`) — the currently displayed week's task array
- **`weekSchedules`** — all weeks keyed by `"YYYY-WNN"` (e.g. `"2026-W24"`); stored in a `useRef` to avoid stale closures when switching weeks
- **`monthlyGoalsStore` / `weeklyGoalsStore`** — keyed by month/week key, persisted via `useLocalStorageState`
- **`generalNotes`** — array, persisted via `useLocalStorageState` and synced to Supabase
- **`colors`**, **`tab`**, **`darkMode`**, **`printZoom`**, **`selectedWeek`**

Persistence: `useSchedulePersistence` debounces saves (500ms) to `localStorage` key `weekScheduleV2`. Supabase sync (`useSupabaseSync`) pulls all data on login and auto-pushes (1.5s debounce) whenever `supabasePayload` changes.

#### Return shape (namespaced)

`usePlannerState` returns a **namespaced object**, not a flat property bag. `PlannerPage` is the only consumer; it destructures these groups and passes explicit props down to child components. The groups:

| Namespace | Contents |
|-----------|----------|
| `undoRedo` | `undo`, `redo`, `replace`, `canUndo`, `canRedo` |
| `ui` | `tab`/`setTab`, `darkMode`/`setDarkMode`, `printZoom`/`zoomIn`/`zoomOut`, `showAuthModal`/`setShowAuthModal` |
| `theme` | `colors`, `changeColor` |
| `week` | `selectedWeek`/`setSelectedWeek`, `incrementWeek`/`decrementWeek`, `weekKey`, `monthKey`, `monthLabel`, `weekRangeLabel` |
| `tasks` | `days`, `weekSchedules`, `updateDay`, `copyDay`, `copyPreviousWeek`, `carryTaskToNextDay`, `saveAsTemplate`, `applyTemplate`, `deleteTemplate`, `updateTemplate`, `templates`, `createTaskId`, `goalOptions`, `taskSuggestions` |
| `goals` | `currentMonthGoals`, `currentWeekGoals`, `monthlySummary`, and all goal CRUD (`addMonthlyGoal`, `updateMonthlyGoalTitle`, `addWeeklyGoal`, `updateWeeklyGoalTitle`, `deleteMonthlyGoal`, `deleteWeeklyGoal`) |
| `notes` | `generalNotes`, `activeGeneralNotes`, `addGeneralNote`, `updateGeneralNote`, `toggleGeneralNoteActive`, `deleteGeneralNote` |
| `sync` | `syncStatus`, `lastSyncTime`, `syncError`, `pullFromCloud`, `pushToCloud`, `signOut`, `user`, `isAuthenticated`, `needsMigration`, `importFromLocal` |
| `persistence` | `saveIndicator`, `saveColor`, `exportSchedule`, `exportArchive`, `importSchedule`, `getScheduleData`, `updateScheduleFromJSON`, `resetPlanner` |

### Data model

```javascript
// Day object (stored in weekSchedules[weekKey][] and Supabase weeks.data)
{
  id: number,
  name: string,           // Arabic day name
  التاريخ: string,        // ISO date "YYYY-MM-DD" — used for month-key matching
  type: string,           // e.g. "أوفيس" | "بيت" | "إجازة"
  notes: string,
  enabled: boolean,
  energyLog: [{ time: string, level: string }],  // intraday energy entries (replaced مستوى_الطاقة)
  تقييم_اليوم: string,    // "1"–"5" day rating
  عدد_ساعات_النوم: string, // free-text sleep hours (parsed by parseHoursLoose)
  عدد_ساعات_الهاتف: string,// free-text phone hours
  tasks: [
    {
      id: number,
      time: string,               // "HH:MM - HH:MM" or single "HH:MM"
      task: string,
      cat: string,                // category key (see CATEGORY_META)
      done: boolean,
      linkedWeeklyGoalId: string,
      linkedMonthlyGoalId: string,
      linkedGoalType: string,     // "weekly" | "monthly" | ""
      linkedGoalId: string,
      recurring: boolean,
      notes: string,
      carryCount: number          // times carried to the next day via "رحّل لبكرة"
    }
  ]
}
```

### Categories

11 categories are defined in `constants.js` under `CATEGORY_META`. Each has an `icon` and Arabic `label`. The `DEFAULT_COLORS` map provides `{bg, text}` per category. `normalizeDaysCategories` (in `categories.js`) migrates old single-string categories to the new keys on load.

### Goal system

Goals are **user-defined**, not keyword-based. Monthly goals are stored by `monthKey` (`"YYYY-MM"`), weekly goals by `weekKey`. Weekly goals link to a parent monthly goal via `monthlyGoalId`. Tasks link to goals via `linkedWeeklyGoalId` or `linkedMonthlyGoalId`. Progress is computed in `goals.js` by counting `done` tasks. Monthly progress rolls up across all weeks in that month (`weekSchedules` filtered by `day.التاريخ`).

### Week arithmetic

Weeks start on **Saturday** (`WEEK_START_DAY = 6`). Week 1 starts on the first Saturday of the year. `getWeekKey(week, year)` → `"YYYY-WNN"`. `getMonthKey(dateStr)` → `"YYYY-MM"`. `getWeekNumberFromDate` uses `Math.round` (not floor) on ms diff to handle DST clock-shift correctly.

### Supabase sync

`useSupabaseSync(syncData, onDataMerged)`:
- On mount: `supabase.auth.onAuthStateChange` listener — on login, fetches all data (`fetchAllWeeks` + `fetchUserData`) and calls `onDataMerged`
- `onDataMerged` **returns `{ appliedWeekSchedules }`** — the exact post-normalization array references stored in state. The hook seeds `lastPushedWeeksRef` with them so subsequent pushes only upload weeks whose array reference actually changed (without this, the first push after login re-uploads every week in history).
- Auto-push: debounced 1.5s after `syncData` changes; only changed weeks + the `user_data` row
- **Unload flush**: on `beforeunload`/`pagehide`, a pending debounced push is flushed via `flushPushKeepalive` in `cloudStore.js` — raw `fetch(..., { keepalive: true })` PostgREST upserts that the browser completes after the tab closes (supabase-js requests would be aborted). Task rows are only flushed for days whose DB id is in `dayIdCache` (filled by `upsertWeek`/`fetchAllWeeks`); task deletions are not replayed at unload — the next normal push reconciles.
- `needsMigration = true` when user just logged in and the `days` table is empty → `AuthModal` shows a one-time import button; `importFromLocal()` reads all localStorage keys and upserts to Supabase

### Autocomplete & smart time defaults

- `buildTaskSuggestions(weekSchedules, weekKey)` in `suggestions.js` scans all saved weeks, returns `{ list, catByName, goalByName }` sorted by frequency (`goalByName` auto-links goals for task names already linked in the current week)
- Task name input renders `<datalist id="task-suggestions">` for native browser autocomplete
- On task name selection, `catByName[name]` auto-fills the category if the task has none set yet
- `getNextStartTime(tasks)` in `time.js` scans the task list bottom-up and returns the last valid end time — used as the default time when adding a new task row

### Stats tab

`StatsTab` component (`components/tabs/StatsTab.jsx`) uses `calculateWeekStats(days)` from `stats.js`:
- Returns: `totalTasks`, `doneTasks`, `completionRate`, `totalMinutes`, `categories[]` (sorted by minutes), `avgEnergy` (from `energyLog` entries), `avgRating`, `avgSleepHours`, `avgPhoneHours`, `perDay[]`
- `parseHoursLoose(value)` handles messy free-text formats like `"7:30 + 1:30"`, `"5:15 + 1:30= 6:45"`, `"8"`, `"9:30"`
- `WeekTrends` (`components/tabs/WeekTrends.jsx`) renders 4-week trend tiles (completion %, avg energy, avg sleep) computed from `weekSchedules`
- StatsTab is theme-aware: it takes a `darkMode` prop and reads all colors from `getTheme()` in `theme/tokens.js` — new UI should do the same instead of hardcoding hex values

### Print

`usePrintStyle` dynamically injects a `<style id="__print_style__">` tag and a hidden `#__print_root__` div with A4 HTML. Printing is triggered via `window.print()`.

### Netlify Functions

| Function | Purpose |
|----------|---------|
| `archive_json.js` | `GET /archive_json?from=YYYY-MM-DD&to=YYYY-MM-DD` — reads from Supabase (service role key), returns denormalized JSON for archiving/AI |
| `keep_alive.js` | Scheduled every 5 days (`0 12 */5 * *`) — pings Supabase to prevent free-tier project pausing |

## Testing

Vitest is configured. Test files live alongside source files as `*.test.js`.

```bash
npm test             # one-shot run
npm run test:watch   # watch mode
```

Covered modules (91 tests):
- `time.test.js` — all time parsing and manipulation functions
- `week.test.js` — all date/week arithmetic functions
- `stats.test.js` — `parseHoursLoose` + `calculateWeekStats`
- `suggestions.test.js` — `buildTaskSuggestions`
- `cloudStore.test.js` — field mapping app↔DB, task-deletion reconciliation, error propagation, keepalive flush
- `useSupabaseSync.test.jsx` — login/pull, changed-weeks-only push, unload flush, signOut (jsdom + @testing-library/react)

## Key implementation notes

- All layout uses inline CSS. `direction: rtl` must be maintained on all containers.
- Day templates are read/written **only** through `services/dayTemplates.js` (localStorage key `dayTemplatesV1`, guarded parsing). Do not access the key directly.
- `weekSchedulesRef` mirrors `weekSchedules` state to avoid stale closures in week-switch callbacks.
- Single times (no `" - "`) are treated as end-of-day markers in duration calculations.
- Midnight wraparound (e.g. `"23:00 - 1:00"`) is handled in `time.js` using 24-hour modulo arithmetic.
- `supabaseClient.js` guards against missing env vars with a placeholder URL so the app doesn't crash on cold load without credentials — auth features simply won't work until `.env.local` is configured.
- localStorage remains the **offline cache** — the app loads from it on mount and works without internet; Supabase is the authoritative remote source.
