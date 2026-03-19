import { useEffect, useRef } from 'react'
import './SpotList.css'

function formatTime(minutes) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
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

  const cardRefs = useRef({})

  useEffect(() => {
    if (selectedSpot && cardRefs.current[selectedSpot.id]) {
      cardRefs.current[selectedSpot.id].scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [selectedSpot?.id])

  return (
    <div className="spot-list">
      {spots.map((spot) => {
        const isStarred = starred.includes(spot.id)
        const hasPlan = !!savedPlans[spot.id]
        return (
          <div
            key={spot.id}
            ref={(el) => { cardRefs.current[spot.id] = el }}
            className={`spot-card ${selectedSpot?.id === spot.id ? 'selected' : ''}`}
            onClick={() => onSpotSelect(spot)}
          >
            <div className="spot-image-wrap">
              <img src={spot.image} alt={spot.name} className="spot-image" loading="lazy" />
              {spot.category === 'cafe' ? (
                <span className="difficulty-pill cafe">cafe</span>
              ) : (
                <span className={`difficulty-pill ${spot.difficulty}`}>{spot.difficulty}</span>
              )}
              <button
                className={`star-btn ${isStarred ? 'starred' : ''}`}
                onClick={(e) => { e.stopPropagation(); onToggleStar(spot.id) }}
                title={isStarred ? 'Remove from saved' : 'Save for later'}
              >
                {isStarred ? '★' : '☆'}
              </button>
            </div>

            <div className="spot-info">
              <div className="spot-header">
                <div className="spot-name-col">
                  <h3 className="spot-name">{spot.name}</h3>
                  <span className="spot-location">{spot.location}</span>
                </div>
                <button
                  className={`plan-btn ${hasPlan ? 'has-plan' : ''}`}
                  onClick={(e) => { e.stopPropagation(); onPlanVisit(spot) }}
                >
                  {hasPlan ? 'View' : 'Plan'}
                </button>
              </div>

              <div className="spot-bottom">
                {spot.category !== 'cafe' && spot.distance != null && (
                  <span className="stat">{spot.distance}mi · {spot.elevationGain}ft · {formatTime(spot.estimatedHikingTime)}</span>
                )}
                <span className="stars" title={`${spot.rating} / 5`}>
                  {'★'.repeat(Math.floor(spot.rating))}{spot.rating % 1 >= 0.5 ? '½' : ''}
                  <span className="rating-num">{spot.rating}</span>
                </span>
                <div className="spot-tags">
                  {spot.petFriendly && <span className="tag pet">Pets</span>}
                  {spot.kidFriendly && <span className="tag kid">Kids</span>}
                  {spot.libraryParkPass && <span className="tag lib">Free</span>}
                  {spot.entranceFee && spot.entranceFee !== 'Free' && <span className="tag fee">{spot.entranceFee}</span>}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
