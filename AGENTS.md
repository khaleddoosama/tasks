# AGENTS.md

Guidance for AI coding agents working on the Weekly Schedule Planner.

## Quick Start

**Project**: React-based weekly schedule planner with task management, time tracking, and print-to-PDF export (Arabic/RTL).

**Key commands**:
```bash
npm run dev      # Dev server at http://localhost:5173 (or 0.0.0.0:5173)
npm run build    # Production build
npm run preview  # Preview production build
``` 

**Main files**:
- `src/App.jsx` — Main app component (v2, full-featured)
- `src/main.jsx` — React entry point
- `CLAUDE.md` — Comprehensive project documentation
- `improvements.md` — Prioritized feature roadmap (Arabic)

## Priority Features

### 🔴 Critical: Auto-Save to localStorage
**Why**: All changes are lost on page refresh. This is blocking.

**Current state**: App has state management (useState, useRef, useCallback) but no persistence.

**Implementation notes**:
- Look for the `LS_KEY = "weekScheduleV2"` constant in App.jsx (lines 71) — storage key already defined
- Save state on every change (debounce for performance)
- Load on component mount (useEffect)
- Data structure is in CLAUDE.md under "Data Model"

### 🟡 Medium Priority: Features from improvements.md

1. **Day Templates** — Copy/paste day layouts
2. **Responsive Design** — Mobile/tablet support
3. **Time Conflict Detection UI** — Visual warning (data structure already built, just needs UI)
4. **Dark Mode** — User preference toggle

## Architecture Deep Dive

### State Management
- Uses React hooks exclusively (useState, useRef, useCallback, useMemo, useEffect)
- Undo/Redo system is **already implemented** via custom `useUndoRedo` hook (see CLAUDE.md)
- No external state management library

### Time Handling (Critical)
- Times stored as strings: `"HH:MM - HH:MM"` (e.g., `"9:00 - 10:30"`)
- Single times treated as end-of-day markers: `"10:00"`
- **Midnight wraparound supported**: `"23:00 - 1:00"` = 2 hours
- Duration calculation uses 24-hour arithmetic (see `calculateDurationMin()`)
- **When modifying time logic, test wraparound cases**

### Key Utility Functions
Located in App.jsx (lines 4–87):
- `parseTimeToMin(str)` — "HH:MM" → minutes since midnight
- `calculateDurationMin(timeStr)` — Duration in minutes (handles wraparound)
- `calculateDuration(timeStr)` — Formatted Arabic text ("س" hours, "د" minutes)
- `detectConflicts(tasks)` — Returns Set of conflicting task IDs
- `isValidTimeFormat(str)` — Validates time strings
- `calcGoalHours(days)` — Aggregates hours per goal (API Design, OIC, LH2L, English, Quran, Cycling)

### Print Stylesheet
- Dynamically injected into `<head>` with ID `__print_style__`
- A4 format (210mm × 297mm with 8mm padding)
- Creates hidden `#__print_root__` div
- **Must clean up on unmount** to avoid memory leaks

### Goal Tracking
- 6 goals tracked: API Design, OIC, LH2L, إنجليزي, قرآن, ركوب عجلة
- Keywords defined in `GOAL_KEYWORDS` constant (line 80)
- Auto-matched from task descriptions (case-insensitive)
- Only counted in enabled days
- Displayed in print output (not in UI yet)

## Data Structure

```javascript
{
  days: [
    {
      id: number,
      name: string,           // Arabic day name
      type: string,           // "أوفيس", "بيت", "إجازة", etc.
      notes: string,          // Day notes
      enabled: boolean,
      tasks: [
        {
          id: number,
          time: string,       // "HH:MM - HH:MM" or "HH:MM"
          task: string,       // Description
          cat: string,        // "", "highlight", "ibadah", "buffer"
          recurring: boolean
        }
      ]
    }
  ],
  colors: {
    header: { bg, text },
    highlight: { bg, text },
    ibadah: { bg, text },
    buffer: { bg, text }
  }
}
```

## Common Pitfalls

1. **Time wraparound**: Don't assume end time > start time. Always use 24-hour arithmetic.
2. **Print cleanup**: Inject with `__print_style__` ID and remove on unmount.
3. **RTL layout**: Maintain `direction: rtl` in all new CSS. Test with Arabic text.
4. **Goal keyword matching**: Case-insensitive and partial. "Quran" matches multiple keywords.
5. **localStorage sync**: Changes must persist immediately (with debounce for performance).

## Testing Locally

1. Start dev server: `npm run dev`
2. Test in browser at http://localhost:5173
3. Use React DevTools extension to inspect state
4. Print preview available in UI (👁 معاينة tab)
5. Open DevTools Console to check for warnings/errors

## For New Features

1. **Read CLAUDE.md** for architecture and current state
2. **Review improvements.md** for feature details and priorities
3. **Follow existing patterns**: Hooks, no external dependencies except React/Vite
4. **Test time logic thoroughly** if modifying duration/conflict code
5. **Maintain RTL support** for all new UI
6. **Consider performance**: Use useMemo and useCallback where state changes frequently

## Notes

- `schedule_editor.jsx` is a legacy simpler version — focus on `App.jsx`
- No tests currently exist — test manually with `npm run dev`
- Undo/Redo is implemented but not exposed in UI (no buttons)
- App is fully Arabic/RTL — maintain right-to-left layouts
