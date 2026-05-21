# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Weekly Schedule Planner** — A React-based web application for planning and managing a weekly schedule. Built fully in Arabic (RTL) with multi-week navigation, task categorization, goal tracking, localStorage persistence, GitHub Gist sync, and print-to-PDF export.

## Commands

```bash
npm run dev      # Dev server on 0.0.0.0:5173
npm run build    # Production build
npm run preview  # Preview production build on 0.0.0.0
```

No test framework is configured.

## Architecture

The app is organized into layers:

```
src/
├── features/planner/
│   ├── PlannerPage.jsx       # Root UI component — renders tabs and toolbar
│   └── usePlannerState.js    # Central state orchestrator (see below)
├── domain/schedule/
│   ├── constants.js          # CATEGORY_META, DEFAULT_COLORS, GOAL_KEYWORDS, LS_KEY
│   ├── categories.js         # normalizeColors, normalizeDaysCategories
│   ├── goals.js              # Goal progress calculation, goal store normalization
│   ├── week.js               # Week/date arithmetic (week keys, date formatting)
│   ├── time.js               # Time parsing, duration calculation, conflict detection
│   ├── print.js              # Print HTML generation
│   ├── ids.js                # Task ID generation helpers
│   └── seedData.js           # createInitialDays — default week scaffold
├── hooks/
│   ├── useUndoRedo.js        # Wraps useState with 30-state undo/redo history
│   ├── useLocalStorageState.js  # useState synced to localStorage
│   ├── useSchedulePersistence.js  # Debounced auto-save + restore from localStorage
│   ├── usePrintStyle.js      # Injects/removes <style id="__print_style__"> + hidden print DOM
│   └── useKeyboardShortcuts.js   # Ctrl+Z/Y/P/S handlers
├── components/
│   ├── schedule/DayCard.jsx  # Collapsible day section with task table
│   ├── schedule/TaskRow.jsx  # Inline-editable task row
│   ├── schedule/TimePickerField.jsx
│   └── tabs/                 # ColorsTab, GoalsTab, PreviewTab, JSONEditorTab
├── services/
│   └── scheduleTransfer.js   # exportScheduleBackup, importScheduleFromFile
├── useGistSync.js            # GitHub Gist push/pull/create with debounced auto-push
├── GistSettingsModal.jsx     # UI for entering Gist token/ID
└── SyncStatusIndicator.jsx
```

### `usePlannerState` — the core

All application state lives in `usePlannerState`. It owns:

- **`days`** (via `useUndoRedo`) — the currently displayed week's task array
- **`weekSchedules`** — all weeks keyed by `"YYYY-WNN"` (e.g. `"2025-W21"`); stored in a `useRef` to avoid stale closures when switching weeks
- **`monthlyGoalsStore` / `weeklyGoalsStore`** — keyed by month/week key, persisted via `useLocalStorageState`
- **`colors`**, **`tab`**, **`darkMode`**, **`printZoom`**, **`selectedWeek`**

When the user navigates to a different week, `days` is replaced with that week's saved schedule (or a fresh scaffold from `createInitialDays`), and the previous week is flushed into `weekSchedules`.

Persistence is handled by `useSchedulePersistence`, which debounces saves (500ms) and restores on mount from `localStorage` key `weekScheduleV2`. GitHub Gist sync (`useGistSync`) pulls on load and auto-pushes (3s debounce) whenever `syncData` changes.

### Data model

```javascript
// Day object (stored in weekSchedules[weekKey][])
{
  id: number,
  name: string,       // Arabic day name
  التاريخ: string,    // ISO date "YYYY-MM-DD" — used for month-key matching
  type: string,       // e.g. "أوفيس" | "بيت" | "إجازة"
  notes: string,
  enabled: boolean,
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
      recurring: boolean
    }
  ]
}

// Colors object
{
  header: { bg, text },
  // one entry per CATEGORY_META key:
  worship, quran_study, sports_fitness, rest_nutrition,
  education, tech_projects, personal_projects, relationships,
  commute_buffer, planning_review, sleep: { bg, text }
}
```

### Categories

11 categories are defined in `constants.js` under `CATEGORY_META`. Each has an `icon` and Arabic `label`. The `DEFAULT_COLORS` map provides `{bg, text}` per category. `normalizeDaysCategories` (in `categories.js`) migrates old single-string categories to the new keys on load.

### Goal system

Goals are **user-defined**, not keyword-based. Monthly goals are stored by `monthKey` (`"YYYY-MM"`), weekly goals by `weekKey`. Weekly goals link to a parent monthly goal via `monthlyGoalId`. Tasks link to goals via `linkedWeeklyGoalId` or `linkedMonthlyGoalId`. Progress is computed in `goals.js` by counting `done` tasks. Monthly progress rolls up across all weeks in that month (`weekSchedules` filtered by `day.التاريخ`).

### Week arithmetic

Weeks start on **Saturday** (`WEEK_START_DAY = 6`). Week 1 starts on the first Saturday of the year. `getWeekKey(week, year)` → `"YYYY-WNN"`. `getMonthKey(dateStr)` → `"YYYY-MM"`.

### Print

`usePrintStyle` dynamically injects a `<style id="__print_style__">` tag and a hidden `#__print_root__` div with A4 HTML. Printing is triggered via `window.print()`.

### Gist sync

Credentials (`gist_token`, `gist_id`) are stored in `localStorage`. On load, data is pulled from the Gist and merged via `applyPlannerData`. Changes auto-push after a 3s debounce. The Gist file is always named `todo-app-data.json`.

## Key implementation notes

- All layout uses inline CSS. `direction: rtl` must be maintained on all containers.
- `schedule_editor.jsx` is a legacy file — `App.jsx` → `PlannerPage` is the current entry point.
- `weekSchedulesRef` mirrors `weekSchedules` state to avoid stale closures in week-switch callbacks.
- Single times (no `" - "`) are treated as end-of-day markers in duration calculations.
- Midnight wraparound (e.g. `"23:00 - 1:00"`) is handled in `time.js` using 24-hour modulo arithmetic.
