import { useState, useCallback } from 'react'
import SearchBar from './components/SearchBar'
import SpotList from './components/SpotList'
import MapView from './components/MapView'
import VisitPlanner from './components/VisitPlanner'
import SavedPlans from './components/SavedPlans'
import { SAMPLE_SPOTS } from './data/spots'
import './App.css'

function loadFromStorage(key, fallback) {
  try {
    const val = localStorage.getItem(key)
    return val ? JSON.parse(val) : fallback
  } catch { return fallback }
}

function App() {
  const [spots] = useState(SAMPLE_SPOTS)
  const [filteredSpots, setFilteredSpots] = useState(SAMPLE_SPOTS)
  const [selectedSpot, setSelectedSpot] = useState(null)
  const [planningSpot, setPlanningSpot] = useState(null)
  const [mapCenter, setMapCenter] = useState([37.7749, -122.4194])
  const [starred, setStarred] = useState(() => loadFromStorage('starredSpots', []))
  const [savedPlans, setSavedPlans] = useState(() => loadFromStorage('savedPlans', {}))
  const [showSavedPlans, setShowSavedPlans] = useState(false)
  const [filters, setFilters] = useState({
    petFriendly: false,
    kidFriendly: false,
    libraryParkPass: false,
    starredOnly: false,
    difficulty: 'all',
  })

  const toggleStar = useCallback((spotId) => {
    setStarred((prev) => {
      const next = prev.includes(spotId) ? prev.filter((id) => id !== spotId) : [...prev, spotId]
      localStorage.setItem('starredSpots', JSON.stringify(next))
      return next
    })
  }, [])

  const savePlan = useCallback((spotId, plan) => {
    setSavedPlans((prev) => {
      const next = { ...prev, [spotId]: plan }
      localStorage.setItem('savedPlans', JSON.stringify(next))
      return next
    })
  }, [])

  const deletePlan = useCallback((spotId) => {
    setSavedPlans((prev) => {
      const next = { ...prev }
      delete next[spotId]
      localStorage.setItem('savedPlans', JSON.stringify(next))
      return next
    })
  }, [])

  const applyFilters = useCallback((spotList, f) => {
    return spotList.filter((s) => {
      if (f.petFriendly && !s.petFriendly) return false
      if (f.kidFriendly && !s.kidFriendly) return false
      if (f.libraryParkPass && !s.libraryParkPass) return false
      if (f.starredOnly && !starred.includes(s.id)) return false
      if (f.difficulty !== 'all' && s.difficulty !== f.difficulty) return false
      return true
    })
  }, [starred])

  const handleSearch = useCallback((query) => {
    if (!query.trim()) {
      setFilteredSpots(applyFilters(spots, filters))
      return
    }
    const q = query.toLowerCase()
    const results = spots.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.location.toLowerCase().includes(q) ||
        s.region.toLowerCase().includes(q)
    )
    setFilteredSpots(applyFilters(results, filters))
  }, [spots, filters])

  const handleLocationSearch = useCallback((lat, lng, regionName) => {
    setMapCenter([lat, lng])
    if (regionName) {
      const q = regionName.toLowerCase()
      const results = spots.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.location.toLowerCase().includes(q) ||
          s.region.toLowerCase().includes(q)
      )
      setFilteredSpots(applyFilters(results.length > 0 ? results : spots, filters))
    } else {
      // No region name (e.g. "Use my location") -- filter by proximity (50km radius)
      const toRad = (deg) => (deg * Math.PI) / 180
      const distanceKm = (lat1, lng1, lat2, lng2) => {
        const R = 6371
        const dLat = toRad(lat2 - lat1)
        const dLng = toRad(lng2 - lng1)
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      }
      const nearby = spots.filter((s) => distanceKm(lat, lng, s.lat, s.lng) <= 50)
      setFilteredSpots(applyFilters(nearby.length > 0 ? nearby : spots, filters))
    }
  }, [spots, filters])

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters)
    setFilteredSpots(applyFilters(spots, newFilters))
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Stardust</h1>
        <p className="subtitle">Discover trails, museums, heritage sites & hidden gems</p>
      </header>

      <SearchBar
        onSearch={handleSearch}
        onLocationSearch={handleLocationSearch}
        filters={filters}
        onFilterChange={handleFilterChange}
      />

      <div className="main-content">
        <div className="map-section">
          <MapView
            spots={filteredSpots}
            center={mapCenter}
            selectedSpot={selectedSpot}
            onSpotSelect={setSelectedSpot}
          />
        </div>

        <div className="list-section">
          <div className="list-header">
            <h2 className="section-title">
              {filteredSpots.length} Place{filteredSpots.length !== 1 ? 's' : ''} Found
            </h2>
            {Object.keys(savedPlans).length > 0 && (
              <button className="saved-plans-btn" onClick={() => setShowSavedPlans(true)}>
                Saved Plans ({Object.keys(savedPlans).length})
              </button>
            )}
          </div>
          <SpotList
            spots={filteredSpots}
            selectedSpot={selectedSpot}
            onSpotSelect={setSelectedSpot}
            onPlanVisit={setPlanningSpot}
            starred={starred}
            onToggleStar={toggleStar}
            savedPlans={savedPlans}
          />
        </div>
      </div>

      {planningSpot && (
        <VisitPlanner
          spot={planningSpot}
          onClose={() => setPlanningSpot(null)}
          savedPlan={savedPlans[planningSpot.id]}
          onSavePlan={(plan) => savePlan(planningSpot.id, plan)}
          onDeletePlan={() => deletePlan(planningSpot.id)}
        />
      )}

      {showSavedPlans && (
        <SavedPlans
          plans={savedPlans}
          spots={spots}
          onClose={() => setShowSavedPlans(false)}
          onDeletePlan={deletePlan}
          onOpenPlan={(spot) => { setShowSavedPlans(false); setPlanningSpot(spot) }}
        />
      )}
    </div>
  )
}

export default App
