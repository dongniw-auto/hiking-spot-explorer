import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import useGoogleCalendar from '../hooks/useGoogleCalendar'
import './PlanCalendar.css'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const START_HOUR = 5
const END_HOUR = 22
const HOUR_HEIGHT = 48

function formatTime(minutes) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ''}` : `${m}m`
}

function formatHour(h) {
  if (h === 0) return '12 AM'
  if (h < 12) return `${h} AM`
  if (h === 12) return '12 PM'
  return `${h - 12} PM`
}

function getTripDetails(spot, plan) {
  const drivingMin = Math.round((plan.drivingDistance || 30) * 2)
  const hikingMin = plan.hikingTime || spot.estimatedHikingTime
  const breakMin = plan.breakTime ?? (hikingMin > 120 ? 30 : 15)
  const totalMin = drivingMin * 2 + hikingMin + breakMin

  let returnTime = null
  if (plan.startTime) {
    const [h, m] = plan.startTime.split(':').map(Number)
    const totalMinutes = h * 60 + m + totalMin
    const retH = Math.floor(totalMinutes / 60) % 24
    const retM = totalMinutes % 60
    returnTime = `${String(retH).padStart(2, '0')}:${String(retM).padStart(2, '0')}`
  }

  return { drivingMin, hikingMin, breakMin, totalMin, returnTime }
}

function buildGoogleCalendarUrl(spot, plan) {
  if (!spot || !plan) return null
  const title = encodeURIComponent(`Visit: ${spot.name}`)
  const location = encodeURIComponent(spot.location)
  const { totalMin } = getTripDetails(spot, plan)

  let startDt, endDt
  if (plan.visitDate && plan.startTime) {
    const start = new Date(`${plan.visitDate}T${plan.startTime}:00`)
    const end = new Date(start.getTime() + totalMin * 60000)
    startDt = fmtGDate(start)
    endDt = fmtGDate(end)
  } else if (plan.visitDate) {
    startDt = plan.visitDate.replace(/-/g, '')
    endDt = startDt
  } else {
    return null
  }

  const details = encodeURIComponent(
    `${spot.name} - ${spot.location}\n` +
    `Trail: ${spot.distance} mi, ${spot.difficulty}\n` +
    `Driving: ~${plan.drivingDistance || 30} mi each way\n` +
    (plan.bringPets ? 'Bringing pets\n' : '') +
    (plan.bringKids ? 'Bringing kids\n' : '') +
    `\nPlanned with Stardust`
  )

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDt}/${endDt}&details=${details}&location=${location}`
}

function fmtGDate(d) {
  return d.getFullYear().toString() +
    String(d.getMonth() + 1).padStart(2, '0') +
    String(d.getDate()).padStart(2, '0') + 'T' +
    String(d.getHours()).padStart(2, '0') +
    String(d.getMinutes()).padStart(2, '0') + '00'
}

function getWeekStart(date) {
  const d = new Date(date)
  d.setDate(d.getDate() - d.getDay())
  d.setHours(0, 0, 0, 0)
  return d
}

function dateToStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Parse Google Calendar event into a positioned block
function parseGCalEvent(ev) {
  const start = ev.start?.dateTime ? new Date(ev.start.dateTime) : null
  const end = ev.end?.dateTime ? new Date(ev.end.dateTime) : null
  if (!start || !end) return null // skip all-day events
  return {
    id: ev.id,
    title: ev.summary || '(No title)',
    location: ev.location || '',
    startHour: start.getHours(),
    startMin: start.getMinutes(),
    durationMin: (end - start) / 60000,
    dateStr: dateToStr(start),
    isGcal: true,
  }
}

export default function PlanCalendar({ entries, onOpenPlan, googleAccessToken, onRefreshGoogleToken }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const [weekStart, setWeekStart] = useState(() => getWeekStart(today))
  const bodyRef = useRef(null)
  const [syncingId, setSyncingId] = useState(null)
  const [syncedIds, setSyncedIds] = useState(new Set())

  const { calendarEvents, loadingEvents, fetchEvents, createEvent, tokenExpired, error: gcalError } = useGoogleCalendar(googleAccessToken)

  // Fetch Google Calendar events when week changes or token available
  useEffect(() => {
    if (!googleAccessToken) return
    const start = new Date(weekStart)
    const end = new Date(weekStart)
    end.setDate(end.getDate() + 7)
    fetchEvents(start, end)
  }, [googleAccessToken, weekStart, fetchEvents])

  // Parse GCal events by date
  const gcalByDate = useMemo(() => {
    const map = {}
    calendarEvents.forEach((ev) => {
      const parsed = parseGCalEvent(ev)
      if (parsed) {
        if (!map[parsed.dateStr]) map[parsed.dateStr] = []
        map[parsed.dateStr].push(parsed)
      }
    })
    return map
  }, [calendarEvents])

  const plansByDate = useMemo(() => {
    const map = {}
    entries.forEach((e) => {
      if (e.plan.visitDate) {
        if (!map[e.plan.visitDate]) map[e.plan.visitDate] = []
        map[e.plan.visitDate].push(e)
      }
    })
    return map
  }, [entries])

  const weekDays = useMemo(() => {
    const days = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart)
      d.setDate(d.getDate() + i)
      const dateStr = dateToStr(d)
      days.push({
        date: d,
        dateStr,
        dayName: DAYS[d.getDay()],
        plans: plansByDate[dateStr] || [],
        gcalEvents: gcalByDate[dateStr] || [],
      })
    }
    return days
  }, [weekStart, plansByDate, gcalByDate])

  const todayStr = dateToStr(today)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)

  // Scroll to ~8am on mount
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = (8 - START_HOUR) * HOUR_HEIGHT
    }
  }, [])

  const weekLabel = (() => {
    const s = weekStart
    const e = weekEnd
    if (s.getMonth() === e.getMonth()) {
      return `${MONTHS[s.getMonth()]} ${s.getDate()}\u2013${e.getDate()}, ${s.getFullYear()}`
    }
    if (s.getFullYear() === e.getFullYear()) {
      return `${MONTHS[s.getMonth()].slice(0, 3)} ${s.getDate()} \u2013 ${MONTHS[e.getMonth()].slice(0, 3)} ${e.getDate()}, ${s.getFullYear()}`
    }
    return `${MONTHS[s.getMonth()].slice(0, 3)} ${s.getDate()}, ${s.getFullYear()} \u2013 ${MONTHS[e.getMonth()].slice(0, 3)} ${e.getDate()}, ${e.getFullYear()}`
  })()

  const prevWeek = () => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() - 7)
    setWeekStart(d)
  }
  const nextWeek = () => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + 7)
    setWeekStart(d)
  }
  const goToday = () => setWeekStart(getWeekStart(today))

  const hours = []
  for (let h = START_HOUR; h <= END_HOUR; h++) hours.push(h)

  const unscheduled = entries.filter((e) => !e.plan.visitDate)

  // Current time for now-line
  const now = new Date()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const nowTop = ((now.getHours() - START_HOUR) + now.getMinutes() / 60) * HOUR_HEIGHT

  // Sync a hiking plan to Google Calendar
  const syncToGCal = useCallback(async (e, ev) => {
    ev.stopPropagation()
    if (!googleAccessToken || !e.plan.visitDate || !e.plan.startTime) return
    setSyncingId(e.spotId)
    const trip = getTripDetails(e.spot, e.plan)
    const startDt = new Date(`${e.plan.visitDate}T${e.plan.startTime}:00`)
    const endDt = new Date(startDt.getTime() + trip.totalMin * 60000)
    const result = await createEvent({
      summary: `Visit: ${e.spot.name}`,
      location: e.spot.location,
      description:
        `${e.spot.name} - ${e.spot.location}\n` +
        `Trail: ${e.spot.distance} mi, ${e.spot.difficulty}\n` +
        `Driving: ~${e.plan.drivingDistance || 30} mi each way\n` +
        `Total trip: ${formatTime(trip.totalMin)}\n` +
        (e.plan.bringPets ? 'Bringing pets\n' : '') +
        (e.plan.bringKids ? 'Bringing kids\n' : '') +
        `\nPlanned with Stardust`,
      startDateTime: startDt.toISOString(),
      endDateTime: endDt.toISOString(),
    })
    setSyncingId(null)
    if (result) {
      setSyncedIds((prev) => new Set(prev).add(e.spotId))
      // Refresh calendar events
      const start = new Date(weekStart)
      const end = new Date(weekStart)
      end.setDate(end.getDate() + 7)
      fetchEvents(start, end)
    }
  }, [googleAccessToken, createEvent, fetchEvents, weekStart])

  return (
    <div className="plan-calendar">
      <div className="cal-nav">
        <button className="cal-nav-btn" onClick={prevWeek}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div className="cal-nav-title">
          <strong>{weekLabel}</strong>
          <button className="cal-today-btn" onClick={goToday}>Today</button>
          {googleAccessToken && !tokenExpired && (
            <span className="gcal-connected-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><polyline points="20 6 9 17 4 12"/></svg>
              GCal
            </span>
          )}
          {loadingEvents && (
            <span className="gcal-loading-badge">Loading GCal...</span>
          )}
          {tokenExpired && onRefreshGoogleToken && (
            <button className="gcal-reconnect-btn" onClick={onRefreshGoogleToken}>
              Reconnect GCal
            </button>
          )}
        </div>
        {gcalError && (
          <div className="gcal-error-banner">{gcalError}</div>
        )}
        <button className="cal-nav-btn" onClick={nextWeek}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>

      <div className="gcal-container">
        {/* Header row */}
        <div className="gcal-header">
          <div className="gcal-header-gutter" />
          {weekDays.map((day) => {
            const isToday = day.dateStr === todayStr
            return (
              <div key={day.dateStr} className="gcal-header-day">
                <div className="gcal-header-day-name">{day.dayName}</div>
                <div className={`gcal-header-day-num ${isToday ? 'today-num' : ''}`}>
                  {day.date.getDate()}
                </div>
              </div>
            )
          })}
        </div>

        {/* Time grid body */}
        <div className="gcal-body" ref={bodyRef}>
          <div className="gcal-time-col">
            {hours.map((h) => (
              <div key={h} className="gcal-time-label">{formatHour(h)}</div>
            ))}
          </div>

          {weekDays.map((day) => {
            const isToday = day.dateStr === todayStr
            const showNowLine = isToday && nowMinutes >= START_HOUR * 60 && nowMinutes <= END_HOUR * 60
            return (
              <div key={day.dateStr} className={`gcal-day-col ${isToday ? 'today-col' : ''}`}>
                {hours.map((h) => (
                  <div key={h} className="gcal-hour-line" />
                ))}

                {showNowLine && nowTop >= 0 && (
                  <div className="gcal-now-line" style={{ top: `${nowTop}px` }} />
                )}

                {/* Google Calendar events (grey) */}
                {day.gcalEvents.map((gev) => {
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

                {/* Stardust hiking plans (accent color) */}
                {day.plans.map((e) => {
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
            )
          })}
        </div>
      </div>

      {unscheduled.length > 0 && (
        <div className="cal-unscheduled">
          <h4>No date set ({unscheduled.length})</h4>
          {unscheduled.map((e) => (
            <button key={e.spotId} className="cal-unscheduled-item" onClick={() => onOpenPlan(e.spot)}>
              {e.spot.name}
              <span>Tap to set date</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export { buildGoogleCalendarUrl }
