import './SavedPlans.css'

function formatDate(iso) {
  if (!iso) return 'No date set'
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

export default function SavedPlans({ plans, spots, onClose, onDeletePlan, onOpenPlan }) {
  const entries = Object.entries(plans).map(([spotId, plan]) => {
    const spot = spots.find((s) => s.id === Number(spotId))
    return { spotId: Number(spotId), plan, spot }
  }).filter((e) => e.spot)

  // Sort by visit date (upcoming first), then by saved time
  entries.sort((a, b) => {
    if (a.plan.visitDate && b.plan.visitDate) return a.plan.visitDate.localeCompare(b.plan.visitDate)
    if (a.plan.visitDate) return -1
    if (b.plan.visitDate) return 1
    return (b.plan.savedAt || '').localeCompare(a.plan.savedAt || '')
  })

  return (
    <div className="plans-overlay" onClick={onClose}>
      <div className="plans-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>x</button>
        <div className="plans-header">
          <h2>Saved Plans</h2>
          <p>{entries.length} planned visit{entries.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="plans-body">
          {entries.length === 0 ? (
            <p className="no-plans">No saved plans yet. Use "Plan Visit" on any place to get started.</p>
          ) : (
            entries.map(({ spotId, plan, spot }) => (
              <div key={spotId} className="plan-card">
                <div className="plan-info">
                  <h3>{spot.name}</h3>
                  <p className="plan-location">{spot.location}</p>
                  <div className="plan-details">
                    {plan.visitDate && <span>Date: {formatDate(plan.visitDate)}</span>}
                    {plan.startTime && <span>Depart: {plan.startTime}</span>}
                    {plan.bringPets && <span className="plan-tag pet">With pets</span>}
                    {plan.bringKids && <span className="plan-tag kid">With kids</span>}
                  </div>
                </div>
                <div className="plan-actions">
                  <button className="plan-edit-btn" onClick={() => onOpenPlan(spot)}>Edit</button>
                  <button className="plan-remove-btn" onClick={() => onDeletePlan(spotId)}>Remove</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
