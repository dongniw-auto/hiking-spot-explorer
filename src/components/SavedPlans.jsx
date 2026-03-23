import { useState, useMemo, useCallback } from 'react'
import PlanCalendar, { buildGoogleCalendarUrl } from './PlanCalendar'
import FamilyGroup from './FamilyGroup'
import './SavedPlans.css'

function formatDate(iso) {
  if (!iso) return 'No date set'
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

function formatMemoryDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatMemoryTimeRange(startIso, endIso) {
  if (!startIso) return ''
  const fmt = (iso) => {
    const d = new Date(iso)
    const h = d.getHours()
    const m = d.getMinutes()
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
  }
  const end = endIso || new Date(new Date(startIso).getTime() + 60 * 60 * 1000).toISOString()
  return `${fmt(startIso)} – ${fmt(end)}`
}

const WHO_OPTIONS = ['solo', 'spouse', 'kid', 'friend']
const MOOD_LEAVING = ['restored', 'peaceful', 'energized', 'grateful', 'present']

function EditMemoryModal({ memory, onSave, onClose }) {
  const start = new Date(memory.date)
  const end = memory.endDate ? new Date(memory.endDate) : new Date(start.getTime() + 60 * 60 * 1000)
  const [date, setDate] = useState(start.toISOString().split('T')[0])
  const [startTime, setStartTime] = useState(
    `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`
  )
  const [endTime, setEndTime] = useState(
    `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`
  )
  const [note, setNote] = useState(memory.note || '')
  const [withWho, setWithWho] = useState(memory.withWho || ['solo'])
  const [mood, setMood] = useState(memory.mood || '')

  function toggleWho(w) {
    setWithWho(prev => prev.includes(w) ? prev.filter(x => x !== w) : [...prev, w])
  }

  function handleSave() {
    const updated = {
      ...memory,
      date: new Date(`${date}T${startTime}:00`).toISOString(),
      endDate: new Date(`${date}T${endTime}:00`).toISOString(),
      note,
      withWho: withWho.length > 0 ? withWho : ['solo'],
      mood,
    }
    onSave(updated)
  }

  return (
    <div className="memory-edit-overlay" onClick={onClose}>
      <div className="memory-edit-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="memory-edit-title">{'\u2726'} {memory.spotName}</h3>
        <div className="memory-edit-fields">
          <label className="memory-edit-label">
            Note
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="memory-edit-input memory-edit-textarea"
              placeholder="What happened here?"
              rows={3}
            />
          </label>
          <div className="memory-edit-label">
            With who
            <div className="memory-edit-chips">
              {WHO_OPTIONS.map(w => (
                <button
                  key={w}
                  className={`memory-edit-chip ${withWho.includes(w) ? 'active' : ''}`}
                  onClick={() => toggleWho(w)}
                >{w}</button>
              ))}
            </div>
          </div>
          <div className="memory-edit-label">
            Mood leaving
            <div className="memory-edit-chips">
              {MOOD_LEAVING.map(m => (
                <button
                  key={m}
                  className={`memory-edit-chip ${mood === m ? 'active' : ''}`}
                  onClick={() => setMood(mood === m ? '' : m)}
                >{m}</button>
              ))}
            </div>
          </div>
          <label className="memory-edit-label">
            Date
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="memory-edit-input" />
          </label>
          <div className="memory-edit-time-row">
            <label className="memory-edit-label">
              Start
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="memory-edit-input" />
            </label>
            <label className="memory-edit-label">
              End
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="memory-edit-input" />
            </label>
          </div>
        </div>
        <div className="memory-edit-actions">
          <button className="memory-edit-btn cancel" onClick={onClose}>Cancel</button>
          <button className="memory-edit-btn save" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  )
}

export default function SavedPlans({ plans, spots, memories = {}, onDeletePlan, onOpenPlan, onSaveMemory, googleAccessToken, onRefreshGoogleToken, familyProps }) {
  const [view, setView] = useState('calendar')
  const [editingMemory, setEditingMemory] = useState(null)

  const entries = Object.entries(plans).map(([spotId, plan]) => {
    const spot = spots.find((s) => s.id === Number(spotId))
    return { spotId: Number(spotId), plan, spot }
  }).filter((e) => e.spot)

  entries.sort((a, b) => {
    if (a.plan.visitDate && b.plan.visitDate) return a.plan.visitDate.localeCompare(b.plan.visitDate)
    if (a.plan.visitDate) return -1
    if (b.plan.visitDate) return 1
    return (b.plan.savedAt || '').localeCompare(a.plan.savedAt || '')
  })

  const memoryList = useMemo(() =>
    Object.values(memories).sort((a, b) => b.date.localeCompare(a.date)),
    [memories]
  )

  const hasContent = entries.length > 0 || memoryList.length > 0

  const handleMemorySave = useCallback((updatedMemory) => {
    if (onSaveMemory) onSaveMemory(updatedMemory)
    setEditingMemory(null)
  }, [onSaveMemory])

  return (
    <div className="plans-page">
      <div className="plans-page-header">
        <div className="plans-title-row">
          <div>
            <h1>My Stardust</h1>
            <p className="plans-count">
              {entries.length > 0 && `${entries.length} plan${entries.length !== 1 ? 's' : ''}`}
              {entries.length > 0 && memoryList.length > 0 && ' \u00b7 '}
              {memoryList.length > 0 && `${memoryList.length} memor${memoryList.length !== 1 ? 'ies' : 'y'}`}
              {!hasContent && 'No stardust yet'}
            </p>
          </div>
          <div className="plans-header-actions">
            {familyProps && (
              <FamilyGroup {...familyProps} />
            )}
            {hasContent && (
              <div className="view-toggle">
                <button
                  className={`view-btn ${view === 'calendar' ? 'active' : ''}`}
                  onClick={() => setView('calendar')}
                  title="Calendar view"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </button>
                <button
                  className={`view-btn ${view === 'list' ? 'active' : ''}`}
                  onClick={() => setView('list')}
                  title="List view"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                    <line x1="8" y1="6" x2="21" y2="6" />
                    <line x1="8" y1="12" x2="21" y2="12" />
                    <line x1="8" y1="18" x2="21" y2="18" />
                    <line x1="3" y1="6" x2="3.01" y2="6" />
                    <line x1="3" y1="12" x2="3.01" y2="12" />
                    <line x1="3" y1="18" x2="3.01" y2="18" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {!hasContent ? (
        <div className="plans-empty">
          <div className="plans-empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>
          <h3>No stardust yet</h3>
          <p>Visit a place from the Today tab to collect your first stardust, or use "Plan Visit" on any spot.</p>
        </div>
      ) : view === 'calendar' ? (
        <PlanCalendar entries={entries} memories={memoryList} onOpenPlan={onOpenPlan} onEditMemory={setEditingMemory} googleAccessToken={googleAccessToken} onRefreshGoogleToken={onRefreshGoogleToken} />
      ) : (
        <div className="plans-list">
          {/* Future plans */}
          {entries.length > 0 && (
            <>
              {memoryList.length > 0 && <h3 className="list-section-title">Upcoming</h3>}
              {entries.map(({ spotId, plan, spot }) => {
                const gcalUrl = buildGoogleCalendarUrl(spot, plan)
                return (
                  <div key={spotId} className="plan-card plan-card-future" onClick={() => onOpenPlan(spot)}>
                    <div className="plan-card-content">
                      <h3 className="plan-card-name">{spot.name}</h3>
                      <p className="plan-card-location">{spot.location}</p>
                      <div className="plan-card-meta">
                        {plan.visitDate && (
                          <span className="plan-chip date-chip">{formatDate(plan.visitDate)}</span>
                        )}
                        {plan.startTime && (
                          <span className="plan-chip">{plan.startTime}</span>
                        )}
                        {plan.bringPets && <span className="plan-chip pet-chip">Pets</span>}
                        {plan.bringKids && <span className="plan-chip kid-chip">Kids</span>}
                      </div>
                    </div>
                    <div className="plan-card-actions">
                      {gcalUrl && (
                        <a
                          className="plan-action-btn gcal"
                          href={gcalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          title="Add to Google Calendar"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                          GCal
                        </a>
                      )}
                      <button className="plan-action-btn edit" onClick={(e) => { e.stopPropagation(); onOpenPlan(spot) }}>
                        Edit
                      </button>
                      <button className="plan-action-btn remove" onClick={(e) => { e.stopPropagation(); onDeletePlan(spotId) }}>
                        Remove
                      </button>
                    </div>
                  </div>
                )
              })}
            </>
          )}

          {/* Past memories */}
          {memoryList.length > 0 && (
            <>
              <h3 className="list-section-title">Collected Stardust</h3>
              {memoryList.map((m) => (
                <div key={m.id} className="memory-card" onClick={() => setEditingMemory(m)} style={{ cursor: 'pointer' }}>
                  <div className="memory-card-icon">{'\u2726'}</div>
                  <div className="memory-card-content">
                    <h3 className="memory-card-name">{m.spotName}</h3>
                    {m.note && <p className="memory-card-note">{m.note}</p>}
                    <div className="memory-card-meta">
                      <span className="memory-chip date-chip">{formatMemoryDate(m.date)} {formatMemoryTimeRange(m.date, m.endDate)}</span>
                      {m.mood && <span className="memory-chip mood-chip">{m.mood}</span>}
                      {m.withWho && m.withWho.map((w) => (
                        <span key={w} className="memory-chip">{w}</span>
                      ))}
                    </div>
                    {m.tasteCard && (
                      <div className="memory-taste-card">
                        <span className="memory-taste-drink">{m.tasteCard.drink}</span>
                        {m.tasteCard.flavors && m.tasteCard.flavors.length > 0 && (
                          <span className="memory-taste-flavors"> &middot; {m.tasteCard.flavors.join(', ')}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
      {editingMemory && (
        <EditMemoryModal
          memory={editingMemory}
          onSave={handleMemorySave}
          onClose={() => setEditingMemory(null)}
        />
      )}
    </div>
  )
}
