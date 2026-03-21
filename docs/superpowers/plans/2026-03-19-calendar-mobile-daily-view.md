# Calendar Mobile Daily View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On mobile viewports, default the Plans calendar to a single-day view with a scrollable day strip and a Day/Week toggle, leaving the desktop weekly grid untouched.

**Architecture:** All changes are self-contained in `PlanCalendar.jsx` and `PlanCalendar.css`. Add two pieces of local state (`selectedDay`, `calView`), render the day strip and toggle conditionally via CSS media query, and switch the time grid between a single-column day view and the existing 7-column week view based on `calView`.

**Tech Stack:** React 19, CSS custom properties (existing design system), no new dependencies.

---

## File Map

| File | What changes |
|------|-------------|
| `src/components/PlanCalendar.jsx` | Add `selectedDay` + `calView` state; add day strip JSX; add Day/Week toggle to nav; conditionally render single-column day grid vs existing week grid |
| `src/components/PlanCalendar.css` | Add `.cal-day-strip`, `.cal-day-pill`, `.cal-view-toggle` styles; media query to show/hide toggle; day-view grid layout |

---

### Task 1: Add state and wire up the toggle

**Files:**
- Modify: `src/components/PlanCalendar.jsx`

- [ ] **Step 1: Add `selectedDay` and `calView` state**

  In `PlanCalendar.jsx`, after the existing `weekStart` state, add:

  ```jsx
  const [selectedDay, setSelectedDay] = useState(() => {
    const d = new Date(today)
    return d
  })
  const [calView, setCalView] = useState('day') // 'day' | 'week'
  ```

- [ ] **Step 2: Add the Day/Week toggle to the nav bar**

  In the JSX, inside `.cal-nav-title` div (after the existing `<strong>{weekLabel}</strong>`), add:

  ```jsx
  <div className="cal-view-toggle">
    <button
      className={`cal-view-btn ${calView === 'day' ? 'active' : ''}`}
      onClick={() => setCalView('day')}
    >Day</button>
    <button
      className={`cal-view-btn ${calView === 'week' ? 'active' : ''}`}
      onClick={() => setCalView('week')}
    >Week</button>
  </div>
  ```

- [ ] **Step 3: Verify toggle renders on mobile**

  Open `http://localhost:5173/stardust/` → Plans tab → resize browser to < 600px wide. You should see "Day" and "Week" buttons appear in the nav. Clicking them should not crash (no logic wired yet).

- [ ] **Step 4: Commit**

  ```bash
  git add src/components/PlanCalendar.jsx
  git commit -m "feat(calendar): add calView state and Day/Week toggle buttons"
  ```

---

### Task 2: Style the toggle (mobile-only)

**Files:**
- Modify: `src/components/PlanCalendar.css`

- [ ] **Step 1: Add toggle styles**

  Append to `PlanCalendar.css`:

  ```css
  /* Day/Week view toggle — mobile only */
  .cal-view-toggle {
    display: none; /* hidden on desktop */
    background: var(--bg);
    border-radius: 8px;
    padding: 2px;
    gap: 2px;
    border: 1px solid var(--border);
  }

  .cal-view-btn {
    background: transparent;
    border: none;
    border-radius: 6px;
    padding: 3px 10px;
    font-size: 12px;
    font-weight: 600;
    color: var(--text);
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
  }

  .cal-view-btn.active {
    background: var(--accent);
    color: white;
  }

  @media (max-width: 599px) {
    .cal-view-toggle {
      display: flex;
    }
  }
  ```

- [ ] **Step 2: Verify styling**

  At < 600px wide, the toggle should appear as a compact segmented control next to "Today". At ≥ 600px, it should be invisible. The active button should be terra-cotta.

- [ ] **Step 3: Commit**

  ```bash
  git add src/components/PlanCalendar.css
  git commit -m "feat(calendar): style Day/Week toggle, mobile-only via media query"
  ```

---

### Task 3: Build the day strip

**Files:**
- Modify: `src/components/PlanCalendar.jsx`
- Modify: `src/components/PlanCalendar.css`

- [ ] **Step 1: Derive the 7 pills centered on `selectedDay`**

  Add a `stripDays` memo below the existing `weekDays` memo:

  ```jsx
  const stripDays = useMemo(() => {
    const days = []
    for (let i = -3; i <= 3; i++) {
      const d = new Date(selectedDay)
      d.setDate(d.getDate() + i)
      days.push({
        date: d,
        dateStr: dateToStr(d),
        dayName: DAYS[d.getDay()],
      })
    }
    return days
  }, [selectedDay])
  ```

- [ ] **Step 2: Add strip prev/next handlers**

  Add two handlers that shift `selectedDay` by 7 days:

  ```jsx
  const prevStripWeek = () => {
    const d = new Date(selectedDay)
    d.setDate(d.getDate() - 7)
    setSelectedDay(d)
  }
  const nextStripWeek = () => {
    const d = new Date(selectedDay)
    d.setDate(d.getDate() + 7)
    setSelectedDay(d)
  }
  ```

- [ ] **Step 3: Render the day strip in JSX**

  Add this block immediately after the `.cal-nav` div and before `.gcal-container`, wrapped so it only renders when `calView === 'day'`:

  ```jsx
  {calView === 'day' && (
    <div className="cal-day-strip">
      <button className="cal-strip-arrow" onClick={prevStripWeek}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
      {stripDays.map((d) => {
        const isSelected = d.dateStr === dateToStr(selectedDay)
        const isToday = d.dateStr === todayStr
        return (
          <button
            key={d.dateStr}
            className={`cal-day-pill ${isSelected ? 'selected' : ''} ${isToday && !isSelected ? 'is-today' : ''}`}
            onClick={() => setSelectedDay(new Date(d.date))}
          >
            <span className="cal-pill-name">{d.dayName}</span>
            <span className="cal-pill-num">{d.date.getDate()}</span>
          </button>
        )
      })}
      <button className="cal-strip-arrow" onClick={nextStripWeek}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M9 18l6-6-6-6"/></svg>
      </button>
    </div>
  )}
  ```

- [ ] **Step 4: Add day strip CSS**

  Append to `PlanCalendar.css`:

  ```css
  /* Day strip */
  .cal-day-strip {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-bottom: 10px;
    padding: 0 2px;
  }

  .cal-strip-arrow {
    background: none;
    border: none;
    color: var(--text);
    padding: 6px 4px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    cursor: pointer;
    flex-shrink: 0;
  }

  .cal-strip-arrow:hover {
    background: var(--border);
  }

  .cal-day-pill {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 6px 4px;
    border: none;
    border-radius: 10px;
    background: transparent;
    cursor: pointer;
    transition: background 0.15s;
  }

  .cal-day-pill:hover {
    background: var(--bg);
  }

  .cal-day-pill.selected {
    background: var(--accent);
  }

  .cal-day-pill.selected .cal-pill-name,
  .cal-day-pill.selected .cal-pill-num {
    color: white;
  }

  .cal-day-pill.is-today .cal-pill-num {
    color: var(--accent);
    font-weight: 700;
  }

  .cal-pill-name {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    color: var(--text);
  }

  .cal-pill-num {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-h);
    line-height: 1.2;
  }
  ```

- [ ] **Step 5: Verify strip renders and works**

  At < 600px: strip of 7 pills should appear below the nav. Today should be selected (highlighted in terra-cotta). Tapping another pill should re-center the strip. Arrows should shift the window by 7 days.

- [ ] **Step 6: Commit**

  ```bash
  git add src/components/PlanCalendar.jsx src/components/PlanCalendar.css
  git commit -m "feat(calendar): add day strip with pill navigation"
  ```

---

### Task 4: Render the single-column day view grid

**Files:**
- Modify: `src/components/PlanCalendar.jsx`
- Modify: `src/components/PlanCalendar.css`

- [ ] **Step 1: Derive selected day's data**

  Add a memo for the selected day's events:

  ```jsx
  const selectedDateStr = dateToStr(selectedDay)
  const selectedDayPlans = plansByDate[selectedDateStr] || []
  const selectedDayGcal = gcalByDate[selectedDateStr] || []
  const showNowLineDay = selectedDateStr === todayStr && nowMinutes >= START_HOUR * 60 && nowMinutes <= END_HOUR * 60
  ```

- [ ] **Step 2: Conditionally render day view vs week view**

  Wrap the existing `.gcal-container` div so it only renders when `calView === 'week'`. Add a new day-view grid for `calView === 'day'`:

  ```jsx
  {calView === 'week' ? (
    <div className="gcal-container">
      {/* ...existing header + body JSX unchanged... */}
    </div>
  ) : (
    <div className="gcal-container gcal-container-day">
      {/* Header: single day */}
      <div className="gcal-header gcal-header-day">
        <div className="gcal-header-gutter" />
        <div className="gcal-header-day">
          <div className="gcal-header-day-name">{DAYS[selectedDay.getDay()]}</div>
          <div className={`gcal-header-day-num ${selectedDateStr === todayStr ? 'today-num' : ''}`}>
            {selectedDay.getDate()}
          </div>
        </div>
      </div>

      {/* Time grid: single column */}
      <div className="gcal-body gcal-body-day" ref={bodyRef}>
        <div className="gcal-time-col">
          {hours.map((h) => (
            <div key={h} className="gcal-time-label">{formatHour(h)}</div>
          ))}
        </div>
        <div className={`gcal-day-col ${selectedDateStr === todayStr ? 'today-col' : ''}`}>
          {hours.map((h) => (
            <div key={h} className="gcal-hour-line" />
          ))}

          {showNowLineDay && nowTop >= 0 && (
            <div className="gcal-now-line" style={{ top: `${nowTop}px` }} />
          )}

          {selectedDayGcal.map((gev) => {
            const top = ((gev.startHour - START_HOUR) + gev.startMin / 60) * HOUR_HEIGHT
            const height = Math.max((gev.durationMin / 60) * HOUR_HEIGHT, 20)
            return (
              <div
                key={gev.id}
                className="gcal-event gcal-event-external"
                style={{ top: `${top}px`, height: `${height}px` }}
              >
                <div className="gcal-event-title">{gev.title}</div>
                {gev.location && height > 30 && (
                  <div className="gcal-event-location">{gev.location}</div>
                )}
              </div>
            )
          })}

          {selectedDayPlans.map((e) => {
            if (!e.plan.startTime) return null
            const trip = getTripDetails(e.spot, e.plan)
            const [sh, sm] = e.plan.startTime.split(':').map(Number)
            const top = ((sh - START_HOUR) + sm / 60) * HOUR_HEIGHT
            const height = Math.max((trip.totalMin / 60) * HOUR_HEIGHT, 28)
            const showDetails = height > 80
            const isSyncing = syncingId === e.spotId
            const isSynced = syncedIds.has(e.spotId)

            return (
              <div
                key={e.spotId}
                className="gcal-event"
                style={{ top: `${top}px`, height: `${height}px` }}
                onClick={() => onOpenPlan(e.spot)}
              >
                <div className="gcal-event-title">{e.spot.name}</div>
                <div className="gcal-event-time">
                  {e.plan.startTime} &rarr; {trip.returnTime || '\u2014'}
                </div>
                {showDetails && (
                  <>
                    <div className="gcal-event-location">{e.spot.location}</div>
                    <div className="gcal-event-details">
                      <div className="gcal-event-detail-row">
                        <span>🚗 {formatTime(trip.drivingMin)}</span>
                        <span> · 🥾 {formatTime(trip.hikingMin)}</span>
                      </div>
                      <div className="gcal-event-detail-row">
                        <span>☕ {formatTime(trip.breakMin)}</span>
                        <span> · ⏱ {formatTime(trip.totalMin)} total</span>
                      </div>
                    </div>
                    <div className="gcal-event-badges">
                      <span className={`gcal-mini-badge ${e.spot.difficulty}`}>{e.spot.difficulty}</span>
                      {e.plan.bringPets && <span className="gcal-mini-badge pets">Pets</span>}
                      {e.plan.bringKids && <span className="gcal-mini-badge kids">Kids</span>}
                    </div>
                    {googleAccessToken && (
                      <button
                        className={`gcal-sync-btn ${isSynced ? 'synced' : ''}`}
                        onClick={(ev) => syncToGCal(e, ev)}
                        disabled={isSyncing || isSynced}
                      >
                        {isSyncing ? 'Syncing...' : isSynced ? 'Synced' : '+ Add to GCal'}
                      </button>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )}
  ```

- [ ] **Step 3: Add day-view grid CSS**

  Append to `PlanCalendar.css`:

  ```css
  /* Day view grid overrides */
  .gcal-header-day {
    grid-template-columns: 48px 1fr;
  }

  .gcal-body-day {
    grid-template-columns: 48px 1fr;
  }
  ```

- [ ] **Step 4: Verify day view**

  At < 600px, Plans tab should show:
  - Day strip with today selected
  - A single full-width time grid column for today
  - Any plans scheduled for today appear as event blocks
  - Tapping a pill switches the grid to that day
  - Switching to "Week" shows the original 7-column grid

  At ≥ 600px: only the 7-column grid is shown, toggle is hidden.

- [ ] **Step 5: Commit**

  ```bash
  git add src/components/PlanCalendar.jsx src/components/PlanCalendar.css
  git commit -m "feat(calendar): render single-column day view grid on mobile"
  ```

---

### Task 5: Sync `weekStart` with `selectedDay` for GCal fetching

**Files:**
- Modify: `src/components/PlanCalendar.jsx`

The existing `useEffect` fetches GCal events for the current `weekStart` window. When the user taps a pill that moves to a new week, GCal events won't load for that week unless we keep `weekStart` in sync.

- [ ] **Step 1: Add effect to sync `weekStart` when `selectedDay` moves outside the current week**

  Add this effect after the existing GCal fetch effect:

  ```jsx
  useEffect(() => {
    const start = getWeekStart(selectedDay)
    if (start.getTime() !== weekStart.getTime()) {
      setWeekStart(start)
    }
  }, [selectedDay, weekStart])
  ```

- [ ] **Step 2: Verify GCal sync follows day navigation**

  (Only verifiable if signed into Google.) Navigate to a different week via the day strip arrows — the GCal loading badge should briefly appear as events fetch for the new week window.

- [ ] **Step 3: Commit**

  ```bash
  git add src/components/PlanCalendar.jsx
  git commit -m "feat(calendar): sync weekStart with selectedDay for GCal event fetching"
  ```

---

### Task 6: Final verification and cleanup

**Files:**
- Modify: `src/components/PlanCalendar.jsx` (if any cleanup needed)

- [ ] **Step 1: Full mobile walkthrough**

  At < 600px:
  - [ ] Plans tab opens to today's daily view
  - [ ] Day strip shows today highlighted
  - [ ] Tapping another pill switches the grid
  - [ ] Strip arrows shift by one week
  - [ ] Day/Week toggle switches views
  - [ ] Week view renders the full 7-column grid
  - [ ] Switching back to Day returns to the strip
  - [ ] Unscheduled section still appears below

- [ ] **Step 2: Desktop sanity check**

  At ≥ 600px:
  - [ ] Weekly grid renders as before, no visual change
  - [ ] Toggle is not visible
  - [ ] Week navigation arrows still work

- [ ] **Step 3: Final commit**

  ```bash
  git add src/components/PlanCalendar.jsx src/components/PlanCalendar.css
  git commit -m "feat(calendar): mobile daily view — day strip + Day/Week toggle (closes #8)"
  ```
