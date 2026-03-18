import { useState, useMemo, useEffect } from 'react'
import { PACK_LIST_TEMPLATES } from '../data/spots'
import './VisitPlanner.css'

function formatTime(minutes) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}h ${m > 0 ? ` ${m}m` : ''}` : `${m}m`
}

function estimateDrivingTime(distanceMiles) {
  return Math.round(distanceMiles * 2)
}

function haversineDistanceMiles(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180
  const R = 3959 // Earth radius in miles
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export default function VisitPlanner({ spot, onClose, savedPlan, onSavePlan, onDeletePlan }) {
  const [visitDate, setVisitDate] = useState(savedPlan?.visitDate || '')
  const [startTime, setStartTime] = useState(savedPlan?.startTime || '08:00')
  const [drivingDistance, setDrivingDistance] = useState(savedPlan?.drivingDistance || 30)
  const [locationStatus, setLocationStatus] = useState('')
  const [bringPets, setBringPets] = useState(savedPlan?.bringPets || false)
  const [bringKids, setBringKids] = useState(savedPlan?.bringKids || false)
  const [checkedItems, setCheckedItems] = useState(savedPlan?.checkedItems || {})
  const [saved, setSaved] = useState(!!savedPlan)

  useEffect(() => {
    if (savedPlan?.drivingDistance) return
    if (!navigator.geolocation) return
    setLocationStatus('Estimating distance...')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const straightLine = haversineDistanceMiles(
          pos.coords.latitude, pos.coords.longitude,
          spot.lat, spot.lng
        )
        const roadEstimate = Math.round(straightLine * 1.3)
        setDrivingDistance(Math.max(1, roadEstimate))
        setLocationStatus('Based on your location')
      },
      () => {
        setLocationStatus('')
      },
      { timeout: 5000 }
    )
  }, [spot.lat, spot.lng])

  const drivingTime = estimateDrivingTime(drivingDistance)
  const hikingTime = spot.estimatedHikingTime
  const breakTime = hikingTime > 120 ? 30 : 15
  const totalTime = drivingTime * 2 + hikingTime + breakTime

  const packList = useMemo(() => {
    let items = [...PACK_LIST_TEMPLATES[spot.difficulty]]
    if (bringPets && spot.petFriendly) {
      items = [...items, ...PACK_LIST_TEMPLATES.pet]
    }
    if (bringKids && spot.kidFriendly) {
      items = [...items, ...PACK_LIST_TEMPLATES.kids]
    }
    return items
  }, [spot.difficulty, spot.petFriendly, spot.kidFriendly, bringPets, bringKids])

  const toggleItem = (item) => {
    setCheckedItems((prev) => ({ ...prev, [item]: !prev[item] }))
  }

  const estimatedReturn = useMemo(() => {
    if (!startTime) return null
    const [h, m] = startTime.split(':').map(Number)
    const totalMinutes = h * 60 + m + totalTime
    const retH = Math.floor(totalMinutes / 60) % 24
    const retM = totalMinutes % 60
    return `${String(retH).padStart(2, '0')}:${String(retM).padStart(2, '0')}`
  }, [startTime, totalTime])

  return (
    <div className="planner-overlay" onClick={onClose}>
      <div className="planner-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>x</button>

        <div className="planner-header">
          <h2>Plan Your Visit</h2>
          <h3>{spot.name}</h3>
          <p className="planner-location">{spot.location}</p>
        </div>

        <div className="planner-body">
          <section className="planner-section">
            <h4>Trip Details</h4>
            <div className="form-row">
              <label>
                <span>Visit Date</span>
                <input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} />
              </label>
              <label>
                <span>Departure Time</span>
                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </label>
            </div>
            <div className="form-row">
              <label>
                <span>Driving Distance (miles){locationStatus && <em className="location-hint"> — {locationStatus}</em>}</span>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={drivingDistance}
                  onChange={(e) => { setDrivingDistance(Number(e.target.value)); setLocationStatus('') }}
                />
              </label>
            </div>
          </section>

          <section className="planner-section">
            <h4>Time Breakdown</h4>
            <div className="time-breakdown">
              <div className="time-item">
                <span className="time-icon">🚗</span>
                <div>
                  <strong>Driving (one way)</strong>
                  <span>{formatTime(drivingTime)}</span>
                </div>
              </div>
              <div className="time-item">
                <span className="time-icon">🥾</span>
                <div>
                  <strong>Hiking ({spot.distance} mi)</strong>
                  <span>{formatTime(hikingTime)}</span>
                </div>
              </div>
              <div className="time-item">
                <span className="time-icon">☕</span>
                <div>
                  <strong>Break / Rest</strong>
                  <span>{formatTime(breakTime)}</span>
                </div>
              </div>
              <div className="time-item">
                <span className="time-icon">🚗</span>
                <div>
                  <strong>Return Drive</strong>
                  <span>{formatTime(drivingTime)}</span>
                </div>
              </div>
              <div className="time-total">
                <strong>Total Estimated Time:</strong>
                <span className="total-value">{formatTime(totalTime)}</span>
              </div>
              {estimatedReturn && (
                <div className="time-return">
                  Depart at <strong>{startTime}</strong> &rarr; Back by <strong>{estimatedReturn}</strong>
                </div>
              )}
            </div>
          </section>

          <section className="planner-section">
            <h4>Who's Coming?</h4>
            <div className="companion-toggles">
              <label className={`companion-option ${!spot.petFriendly ? 'disabled' : ''}`}>
                <input
                  type="checkbox"
                  checked={bringPets}
                  onChange={(e) => setBringPets(e.target.checked)}
                  disabled={!spot.petFriendly}
                />
                <span>Bringing Pets</span>
                {!spot.petFriendly && <span className="warning">Not pet-friendly</span>}
              </label>
              <label className={`companion-option ${!spot.kidFriendly ? 'disabled' : ''}`}>
                <input
                  type="checkbox"
                  checked={bringKids}
                  onChange={(e) => setBringKids(e.target.checked)}
                  disabled={!spot.kidFriendly}
                />
                <span>Bringing Kids</span>
                {!spot.kidFriendly && <span className="warning">Not kid-friendly</span>}
              </label>
            </div>

            {spot.petFriendly && bringPets && (
              <div className="info-note pet-note">
                <strong>Pet Info:</strong> {spot.petNotes}
              </div>
            )}
            {!spot.petFriendly && (
              <div className="info-note warning-note">
                <strong>Pet Policy:</strong> {spot.petNotes}
              </div>
            )}
            {spot.kidFriendly && bringKids && (
              <div className="info-note kid-note">
                <strong>Kid Info:</strong> {spot.kidNotes}
              </div>
            )}
            {!spot.kidFriendly && (
              <div className="info-note warning-note">
                <strong>Kid Advisory:</strong> {spot.kidNotes}
              </div>
            )}
          </section>

          <section className="planner-section">
            <h4>Trail Info</h4>
            <div className="trail-details">
              <div className="detail-row">
                <span>Difficulty</span>
                <span className={`difficulty-badge ${spot.difficulty}`}>{spot.difficulty}</span>
              </div>
              <div className="detail-row">
                <span>Distance</span>
                <span>{spot.distance} miles</span>
              </div>
              <div className="detail-row">
                <span>Elevation Gain</span>
                <span>{spot.elevationGain} ft</span>
              </div>
              <div className="detail-row">
                <span>Best Season</span>
                <span>{spot.bestSeason}</span>
              </div>
              <div className="detail-row">
                <span>Parking</span>
                <span>{spot.parkingInfo}</span>
              </div>
              {spot.entranceFee && (
                <div className="detail-row">
                  <span>Entrance Fee</span>
                  <span className={`fee-value ${spot.entranceFee === 'Free' ? 'free' : 'paid'}`}>{spot.entranceFee}</span>
                </div>
              )}
            </div>
            <div className="highlights">
              <strong>Highlights:</strong>
              <div className="highlight-chips">
                {spot.highlights.map((h) => (
                  <span key={h} className="highlight-chip">{h}</span>
                ))}
              </div>
            </div>
          </section>

          <section className="planner-section">
            <h4>Pack List</h4>
            <div className="pack-list">
              {packList.map((item) => (
                <label key={item} className="pack-item">
                  <input
                    type="checkbox"
                    checked={!!checkedItems[item]}
                    onChange={() => toggleItem(item)}
                  />
                  <span className={checkedItems[item] ? 'checked' : ''}>{item}</span>
                </label>
              ))}
            </div>
          </section>

          <div className="planner-actions">
            <button
              className="save-plan-btn"
              onClick={() => {
                onSavePlan({ visitDate, startTime, drivingDistance, bringPets, bringKids, checkedItems, savedAt: new Date().toISOString() })
                setSaved(true)
              }}
            >
              {saved ? 'Update Plan' : 'Save Plan'}
            </button>
            {saved && (
              <button
                className="delete-plan-btn"
                onClick={() => { onDeletePlan(); setSaved(false) }}
              >
                Delete Plan
              </button>
            )}
          </div>
          {saved && <p className="save-confirm">Plan saved!</p>}
        </div>
      </div>
    </div>
  )
}
