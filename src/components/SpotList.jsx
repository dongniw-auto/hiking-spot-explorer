import './SpotList.css'

function formatTime(minutes) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function StarRating({ rating }) {
  const full = Math.floor(rating)
  const half = rating % 1 >= 0.5
  return (
    <span className="stars" title={`${rating} / 5`}>
      {'★'.repeat(full)}
      {half ? '½' : ''}
      <span className="rating-number">{rating}</span>
    </span>
  )
}

export default function SpotList({ spots, selectedSpot, onSpotSelect, onPlanVisit, starred = [], onToggleStar, savedPlans = {} }) {
  if (spots.length === 0) {
    return (
      <div className="no-results">
        <p>No places found matching your criteria.</p>
        <p>Try adjusting your filters or search terms.</p>
      </div>
    )
  }

  return (
    <div className="spot-list">
      {spots.map((spot) => (
        <div
          key={spot.id}
          className={`spot-card ${selectedSpot?.id === spot.id ? 'selected' : ''}`}
          onClick={() => onSpotSelect(spot)}
        >
          <div className="spot-image-wrap">
            <img src={spot.image} alt={spot.name} className="spot-image" loading="lazy" />
            <span className={`difficulty-pill ${spot.difficulty}`}>{spot.difficulty}</span>
            <button
              className={`star-btn ${starred.includes(spot.id) ? 'starred' : ''}`}
              onClick={(e) => { e.stopPropagation(); onToggleStar(spot.id) }}
              title={starred.includes(spot.id) ? 'Remove from saved' : 'Save for later'}
            >
              {starred.includes(spot.id) ? '★' : '☆'}
            </button>
          </div>
          <div className="spot-info">
            <div className="spot-name-row">
              <h3 className="spot-name">{spot.name}</h3>
              {savedPlans[spot.id] && <span className="planned-badge">Planned</span>}
            </div>
            <p className="spot-location">{spot.location}</p>
            <div className="spot-stats">
              <span>{spot.distance} mi</span>
              <span className="divider">|</span>
              <span>{spot.elevationGain} ft gain</span>
              <span className="divider">|</span>
              <span>{formatTime(spot.estimatedHikingTime)}</span>
            </div>
            <div className="spot-meta">
              <StarRating rating={spot.rating} />
              <div className="spot-tags">
                {spot.petFriendly && (
                  <span className="tag pet" title={spot.petNotes}>Pet OK</span>
                )}
                {spot.kidFriendly && (
                  <span className="tag kid" title={spot.kidNotes}>Kid OK</span>
                )}
                {!spot.petFriendly && (
                  <span className="tag no-pet" title={spot.petNotes}>No Pets</span>
                )}
                {spot.libraryParkPass && (
                  <span className="tag library-pass" title="Free entry with Santa Clara County Library Park Pass">FREE Pass</span>
                )}
              </div>
            </div>
            {spot.entranceFee && (
              <div className={`fee-badge ${spot.entranceFee === 'Free' ? 'free' : 'paid'}`}>
                {spot.entranceFee === 'Free' ? 'Free Entry' : spot.entranceFee}
              </div>
            )}
            <p className="spot-desc">{spot.description}</p>
            {spot.sourceUrl && (
              <a className="source-link" href={spot.sourceUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                Source info
              </a>
            )}
            <button
              className={`plan-btn ${savedPlans[spot.id] ? 'has-plan' : ''}`}
              onClick={(e) => {
                e.stopPropagation()
                onPlanVisit(spot)
              }}
            >
              {savedPlans[spot.id] ? 'View Plan' : 'Plan Visit'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
