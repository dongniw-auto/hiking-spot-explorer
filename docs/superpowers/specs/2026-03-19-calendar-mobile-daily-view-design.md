# Calendar Mobile Daily View — Design Spec

**Date:** 2026-03-19
**Issue:** #8 — Calendar layout on device
**Status:** Approved

---

## Problem

The Plans tab renders a Google Calendar-style 7-column weekly grid (`PlanCalendar.jsx`). On mobile viewports (< ~600px), each day column shrinks to ~40–80px wide, making event titles truncate immediately and the grid unusable at a glance.

## Goal

Default to a single-day view on mobile that is readable and actionable, while preserving the weekly grid for users who want to plan across the full week.

---

## Design Decision: Option C — Day Strip + Day/Week Toggle

### Responsive Behavior

- **Mobile (< 600px):** Show a day strip nav and a single-column time grid. A Day/Week segmented toggle appears in the nav bar.
- **Desktop (≥ 600px):** Existing 7-column weekly grid renders unchanged. Toggle is hidden.
- Breakpoint is a CSS media query; no JS detection needed.

### Day Strip

- A scrollable horizontal row of day pills centered on the selected day.
- Shows 7 pills at a time (the selected day plus 3 on each side).
- Left/right arrows on the strip shift the visible window by one week (reuses the existing `prevWeek`/`nextWeek` logic).
- Tapping a pill sets the selected day and updates the time grid below.
- The selected day pill is highlighted with `var(--accent)` (terra-cotta). Today's date uses this color on initial load.

### Day/Week Toggle

- A small segmented control (`Day | Week`) placed in the top-right of the existing `.cal-nav` bar.
- Visible only on mobile via `@media (max-width: 599px)`.
- Defaults to `Day` on mobile.
- Switching to `Week` renders the full 7-column grid (the existing layout) inline — no modal or separate page.
- State is component-local (`useState`), not persisted. Resets to `Day` on next mount.

### Day View Time Grid

- A single full-width day column replaces the 7-column grid.
- Renders the selected day's Stardust plans and GCal events using the same absolute-position block logic as today.
- `HOUR_HEIGHT`, `START_HOUR`, `END_HOUR`, and all event rendering helpers remain unchanged.
- The now-line is shown when the selected day is today.

### GCal Sync

- `fetchEvents` continues to fetch the full week window (same `weekStart`/`weekStart+7` range).
- The day view filters `gcalByDate[selectedDateStr]` client-side — no new API calls per day tap.

### Unscheduled Section

- Unchanged. Rendered below the calendar in both day and week views.

---

## What Does Not Change

- Desktop weekly grid layout — no modifications.
- List view toggle in `SavedPlans.jsx` — no modifications.
- All GCal sync logic (`syncToGCal`, `createEvent`, token management) — no modifications.
- `useGoogleCalendar` hook — no modifications.
- Event block rendering logic (`getTripDetails`, `formatTime`, positioning math) — no modifications.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/PlanCalendar.jsx` | Add `selectedDay` state, day strip rendering, Day/Week toggle, conditional grid rendering |
| `src/components/PlanCalendar.css` | Add day strip styles, toggle styles, responsive media query to hide toggle on desktop |

No new files. No changes to hooks, `SavedPlans.jsx`, or other components.

---

## Acceptance Criteria

- [ ] On mobile, the calendar defaults to today's daily view on mount
- [ ] The day strip shows the selected day highlighted; tapping another day switches the grid
- [ ] The Day/Week toggle is visible on mobile and hidden on desktop
- [ ] Switching to Week renders the existing 7-column grid
- [ ] Switching back to Day returns to the day strip view
- [ ] The now-line appears when viewing today
- [ ] GCal events for the selected day appear in the day view
- [ ] The weekly grid on desktop is unaffected
- [ ] No regressions to GCal sync, unscheduled list, or list view
