import { useState, useCallback, useEffect } from 'react'
import SearchBar from './components/SearchBar'
import SpotList from './components/SpotList'
import MapView from './components/MapView'
import VisitPlanner from './components/VisitPlanner'
import SavedPlans from './components/SavedPlans'
import AuthButton from './components/AuthButton'
import useAuth from './hooks/useAuth'
import useFirestore from './hooks/useFirestore'
import TodayCard from './components/TodayCard'
import useSpots from './hooks/useSpots'
import './App.css'

function App() {
  const { user, loading, login, logout, hasConfig, googleAccessToken, refreshGoogleToken, authError } = useAuth()
  const { spots, loading: spotsLoading, error: spotsError } = useSpots(user)
  const {
    starred, savedPlans, toggleStar, savePlan, deletePlan,
    familyGroup, familyPlans, familyMembers,
    createFamilyGroup, joinFamilyGroup, leaveFamilyGroup,
  } = useFirestore(user)

  const [filteredSpots, setFilteredSpots] = useState(spots)
  const [selectedSpot, setSelectedSpot] = useState(null)
  const [planningSpot, setPlanningSpot] = useState(null)
  const [mapCenter, setMapCenter] = useState([37.7749, -122.4194])
  const [activeTab, setActiveTab] = useState('today')
  const [filters, setFilters] = useState({
    petFriendly: false,
    kidFriendly: false,
    libraryParkPass: false,
    starredOnly: false,
    difficulty: 'all',
    category: 'all',
  })

  // Re-apply filters when spots data updates (e.g. after Firestore loads)
  useEffect(() => {
    setFilteredSpots(applyFilters(spots, filters))
  }, [spots])

  // Merge own plans with family plans for the Plans tab
  const mergedPlans = familyGroup ? { ...familyPlans, ...savedPlans } : savedPlans

  const applyFilters = useCallback((spotList, f) => {
    return spotList.filter((s) => {
      if (f.category && f.category !== 'all' && (s.category || 'outdoors') !== f.category) return false
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

  const handleSpotSelect = useCallback((spot) => {
    setSelectedSpot(spot)
    if (spot) setMapCenter([spot.lat, spot.lng])
  }, [])

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters)
    setFilteredSpots(applyFilters(spots, newFilters))
  }

  const planCount = Object.keys(mergedPlans).length

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-row">
          <div>
            <h1 className="app-title">Stardust</h1>
            <p className="app-subtitle">Discover trails, museums, heritage sites & hidden gems</p>
          </div>
          {hasConfig && <AuthButton user={user} onLogin={login} onLogout={logout} />}
        </div>
      </header>

      {authError && (
        <div style={{ background: '#f8d7da', color: '#721c24', padding: '10px 16px', fontSize: '13px', textAlign: 'center' }}>
          Login error: {authError}
        </div>
      )}

      {activeTab === 'today' && (
        <main className="page">
          <TodayCard spots={spots} />
        </main>
      )}

      {activeTab === 'explore' && (
        <main className="page">
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
                onSpotSelect={handleSpotSelect}
              />
            </div>

            <div className="list-section">
              <div className="list-header">
                <h2 className="section-title">
                  {filteredSpots.length} Place{filteredSpots.length !== 1 ? 's' : ''}
                </h2>
              </div>
              <SpotList
                spots={filteredSpots}
                selectedSpot={selectedSpot}
                onSpotSelect={handleSpotSelect}
                onPlanVisit={setPlanningSpot}
                starred={starred}
                onToggleStar={toggleStar}
                savedPlans={savedPlans}
              />
            </div>
          </div>
        </main>
      )}

      {activeTab === 'plans' && (
        <main className="page">
          <SavedPlans
            plans={mergedPlans}
            spots={spots}
            onDeletePlan={deletePlan}
            onOpenPlan={(spot) => { setPlanningSpot(spot) }}
            googleAccessToken={googleAccessToken}
            onRefreshGoogleToken={refreshGoogleToken}
            familyProps={user && hasConfig ? {
              user, familyGroup, familyMembers,
              onCreateGroup: createFamilyGroup,
              onJoinGroup: joinFamilyGroup,
              onLeaveGroup: leaveFamilyGroup,
            } : null}
          />
        </main>
      )}

      {planningSpot && (
        <VisitPlanner
          spot={planningSpot}
          onClose={() => setPlanningSpot(null)}
          savedPlan={savedPlans[planningSpot.id]}
          onSavePlan={(plan) => savePlan(planningSpot.id, plan)}
          onDeletePlan={() => deletePlan(planningSpot.id)}
        />
      )}

      <nav className="tab-bar">
        <button
          className={`tab-item ${activeTab === 'today' ? 'active' : ''}`}
          onClick={() => setActiveTab('today')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="tab-icon">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span>Today</span>
        </button>
        <button
          className={`tab-item ${activeTab === 'explore' ? 'active' : ''}`}
          onClick={() => setActiveTab('explore')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="tab-icon">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <span>Explore</span>
        </button>
        <button
          className={`tab-item ${activeTab === 'plans' ? 'active' : ''}`}
          onClick={() => setActiveTab('plans')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="tab-icon">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span>Plans</span>
          {planCount > 0 && <span className="tab-badge">{planCount}</span>}
        </button>
      </nav>
    </div>
  )
}

export default App
