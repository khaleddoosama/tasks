# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Weekly Schedule Planner** — A React-based web application for planning and managing a weekly schedule with task categorization, time tracking, and print-to-PDF functionality. The app is built in Arabic (RTL) and supports multiple task categories (worship, highlighted, buffer, regular).

## Tech Stack

- **Framework**: React 18+ with Vite
- **Language**: JavaScript (JSX)
- **Build Tool**: Vite
- **Styling**: Inline CSS (no external CSS framework)
- **State Management**: React hooks (useState, useRef, useCallback, useMemo, useEffect)

## Common Commands

```bash
# Development server (runs on http://localhost:5173 by default, or 0.0.0.0:5173 with --host)
npm run dev

# Production build
npm run build

# Preview production build locally
npm run preview
```

## Project Structure

```
src/
├── main.jsx              # React entry point
├── App.jsx               # Main app component (v2 - full-featured version)
└── schedule_editor.jsx   # Alternative editor component (simpler version)
index.html               # HTML template
package.json             # Dependencies and scripts
```

## Architecture & Key Concepts

### Data Model

The app manages a weekly schedule with this structure:

```javascript
{
  days: [
    {
      id: number,
      name: string,           // Day name in Arabic (e.g., "الأحد")
      type: string,           // Day type (e.g., "أوفيس", "بيت", "إجازة")
      notes: string,          // Day notes (optional)
      enabled: boolean,       // Whether day is active
      tasks: [
        {
          id: number,
          time: string,       // Format: "HH:MM - HH:MM" or "HH:MM" (for end-of-day)
          task: string,       // Task description
          cat: string,        // Category: "", "highlight", "ibadah", "buffer"
          recurring: boolean  // For future recurring task feature
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

### Key Features

1. **Task Management**: Add, edit, delete, and reorder tasks within each day
2. **Time Tracking**: Automatic duration calculation from time ranges (handles midnight wraparound)
3. **Categorization**: Tasks colored by category (worship, highlighted, buffer, regular)
4. **Conflict Detection**: Warns when task times overlap
5. **Print/PDF Export**: Generates A4-formatted pages with task tables, notes, and goal tracking
6. **Undo/Redo**: Full history support (30-state limit by default)
7. **Color Customization**: Adjust colors for each category and header
8. **Goal Tracking**: Tracks hours toward 6 goals (API Design, OIC, LH2L, English, Quran, Cycling) based on task keywords

### Utility Functions

- `parseTimeToMin(str)` — Converts "HH:MM" to minutes since midnight
- `calculateDurationMin(timeStr)` — Calculates duration in minutes from "HH:MM - HH:MM" range
- `calculateDuration(timeStr)` — Formats duration as Arabic text ("س" for hours, "د" for minutes)
- `detectConflicts(tasks)` — Finds overlapping time ranges
- `isValidTimeFormat(str)` — Validates time format
- `calcGoalHours(days)` — Aggregates hours per goal across all enabled days

### Custom Hooks

- `useUndoRedo(initial, max)` — Manages undo/redo state with history limit
- `usePrintStyle(colors, days)` — Injects print stylesheet and generates print HTML

### Components

- **App** — Main container, manages tabs (editor/preview), day selection, color panel
- **DayCard** — Collapsible day section with task table (in App.jsx)
- **TaskRow** — Single task row with inline editing (in App.jsx)
- **ColorPanel** — Color picker for each category
- **PreviewPage** — Print preview for a single day

## Important Implementation Details

### Time Handling

- Times are stored as strings: "HH:MM - HH:MM" (e.g., "9:00 - 10:30")
- Single times (no range) are treated as end-of-day markers (e.g., "10:00" for bedtime)
- Midnight wraparound is supported: "23:00 - 1:00" correctly calculates as 2 hours
- Duration calculation uses 24-hour arithmetic for wraparound cases

### Print Stylesheet

- Dynamically injected into `<head>` with ID `__print_style__`
- Generates A4 pages (210mm × 297mm) with 8mm padding
- Creates a hidden `#__print_root__` div containing all print HTML
- Cleaned up on component unmount to avoid memory leaks

### Goal Keyword Matching

Goals are matched by keywords in task descriptions (case-insensitive):
- "API Design" → ["api design", "api"]
- "OIC" → ["oic"]
- "LH2L" → ["lh2l"]
- "إنجليزي" → ["إنجليزي"]
- "قرآن" → ["قرآن", "تسميع", "حفظ قرآن"]
- "ركوب عجلة" → ["عجلة", "ركوب"]

### State Persistence

Currently **not implemented** — all changes are lost on page refresh. This is the highest-priority feature in `improvements.md`.

## Future Features (from improvements.md)

**High Priority:**
- Auto-save to localStorage (critical — data is lost on refresh)

**Medium Priority:**
- Responsive design for mobile/tablet
- Day templates (copy/paste day layouts)
- Time conflict detection UI improvements
- Dark mode

**Low Priority:**
- Drag-and-drop task reordering
- Weekly statistics dashboard
- Recurring task support
- Keyboard shortcuts (Ctrl+Z, Ctrl+P, etc.)

## Testing & Debugging

- No test framework currently set up
- Use `npm run dev` to test locally
- Print preview is available in the UI (👁 معاينة tab)
- Browser DevTools can inspect React state via React DevTools extension

## Notes for Future Work

- The `schedule_editor.jsx` file is an older, simpler version — `App.jsx` is the current main component
- Undo/Redo is already implemented but not exposed in the UI (no buttons)
- Goal tracking is calculated but only displayed in print output
- The app is fully RTL (Arabic) — maintain `direction: rtl` in all layouts
