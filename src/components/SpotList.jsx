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

export default function SpotList({ spots, selectedSpot, onSpotSelect, onPlanVisit }) {
  if (spots.length === 0) {
    return (
      <div className="no-results">
        <p>No trails found matching your criteria.</p>
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
          </div>
          <div className="spot-info">
            <h3 className="spot-name">{spot.name}</h3>
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
              </div>
            </div>
            <p className="spot-desc">{spot.description}</p>
            <button
              className="plan-btn"
              onClick={(e) => {
                e.stopPropagation()
                onPlanVisit(spot)
              }}
            >
              Plan Visit
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
