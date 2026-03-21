import { useState } from 'react'
import PlanCalendar, { buildGoogleCalendarUrl } from './PlanCalendar'
import FamilyGroup from './FamilyGroup'
import './SavedPlans.css'

function formatDate(iso) {
  if (!iso) return 'No date set'
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

export default function SavedPlans({ plans, spots, memories = [], onDeletePlan, onOpenPlan, googleAccessToken, onRefreshGoogleToken, familyProps }) {
  const [view, setView] = useState('calendar')

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

  return (
    <div className="plans-page">
      <div className="plans-page-header">
        <div className="plans-title-row">
          <div>
            <h1>My Stardust</h1>
            <p className="plans-count">{entries.length} planned · {memories.length} collected</p>
          </div>
          <div className="plans-header-actions">
            {familyProps && (
              <FamilyGroup {...familyProps} />
            )}
            {entries.length > 0 && (
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

      {entries.length === 0 ? (
        <div className="plans-empty">
          <div className="plans-empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <h3>No plans yet</h3>
          <p>Use "Plan Visit" on any place to get started.</p>
        </div>
      ) : view === 'calendar' ? (
        <PlanCalendar entries={entries} onOpenPlan={onOpenPlan} googleAccessToken={googleAccessToken} onRefreshGoogleToken={onRefreshGoogleToken} />
      ) : (
        <div className="plans-list">
          {entries.map(({ spotId, plan, spot }) => {
            const gcalUrl = buildGoogleCalendarUrl(spot, plan)
            return (
              <div key={spotId} className="plan-card" onClick={() => onOpenPlan(spot)}>
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
        </div>
      )}

      {memories.length > 0 && (
        <div className="memories-section">
          <h2 className="memories-section-title">✦ Collected Stardust</h2>
          <p className="memories-section-count">{memories.length} {memories.length === 1 ? 'memory' : 'memories'}</p>
          <div className="memories-list">
            {memories.map(m => (
              <div key={m.id} className="memory-card">
                <h3 className="memory-card-name">{m.spotName}</h3>
                {m.note && <p className="memory-card-note">"{m.note}"</p>}
                {m.tasteCard && (
                  <p className="memory-card-taste">
                    ☕ {m.tasteCard.drink}
                    {m.tasteCard.flavors.length > 0 && ` · ${m.tasteCard.flavors.join(', ')}`}
                  </p>
                )}
                <p className="memory-card-meta">
                  with {m.withWho.join(', ')}
                  {m.mood ? ` · left feeling ${m.mood}` : ''}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
