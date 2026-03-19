import { useState } from 'react'
import './SearchBar.css'

const REGIONS = [
  { name: 'San Francisco Bay Area', lat: 37.7749, lng: -122.4194 },
  { name: 'Santa Clara County', lat: 37.3541, lng: -121.9552 },
  { name: 'All Bay Area', lat: 37.5585, lng: -122.1711 },
]

export default function SearchBar({ onSearch, onLocationSearch, filters, onFilterChange }) {
  const [query, setQuery] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    onSearch(query)
  }

  const handleRegionClick = (region) => {
    setQuery(region.name)
    onLocationSearch(region.lat, region.lng, region.name)
  }

  const handleUseMyLocation = () => {
    if (navigator.geolocation) {
      setQuery('Locating...')
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords
          fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`)
            .then((r) => r.json())
            .then((data) => {
              const addr = data.address || {}
              const city = addr.city || addr.town || addr.village || addr.county || ''
              const state = addr.state || ''
              const label = [city, state].filter(Boolean).join(', ')
              setQuery(label || `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`)
              onLocationSearch(latitude, longitude, label)
            })
            .catch(() => {
              setQuery(`${latitude.toFixed(2)}, ${longitude.toFixed(2)}`)
              onLocationSearch(latitude, longitude, '')
            })
        },
        () => {
          setQuery('')
          alert('Could not get your location. Please search by name instead.')
        }
      )
    }
  }

  return (
    <div className="search-bar">
      <form className="search-form" onSubmit={handleSubmit}>
        <div className="search-input-wrap">
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            className="search-input"
            placeholder="Search places by name, city, or region..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              onSearch(e.target.value)
            }}
          />
          <button type="button" className="location-btn" onClick={handleUseMyLocation} title="Use my location">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
            </svg>
          </button>
        </div>
      </form>

      <div className="quick-regions">
        <span className="quick-label">Quick search:</span>
        {REGIONS.map((r) => (
          <button key={r.name} className="region-chip" onClick={() => handleRegionClick(r)}>
            {r.name}
          </button>
        ))}
      </div>

      <div className="filters">
        <label className="filter-toggle">
          <input
            type="checkbox"
            checked={filters.petFriendly}
            onChange={(e) => onFilterChange({ ...filters, petFriendly: e.target.checked })}
          />
          <span className="filter-label">Pet-Friendly</span>
        </label>
        <label className="filter-toggle">
          <input
            type="checkbox"
            checked={filters.kidFriendly}
            onChange={(e) => onFilterChange({ ...filters, kidFriendly: e.target.checked })}
          />
          <span className="filter-label">Kid-Friendly</span>
        </label>
        <label className="filter-toggle library-pass-toggle">
          <input
            type="checkbox"
            checked={filters.libraryParkPass}
            onChange={(e) => onFilterChange({ ...filters, libraryParkPass: e.target.checked })}
          />
          <span className="filter-label">Library Park Pass</span>
        </label>
        <label className="filter-toggle starred-toggle">
          <input
            type="checkbox"
            checked={filters.starredOnly}
            onChange={(e) => onFilterChange({ ...filters, starredOnly: e.target.checked })}
          />
          <span className="filter-label">Starred Only</span>
        </label>
        <select
          className="category-select"
          value={filters.category || 'all'}
          onChange={(e) => onFilterChange({ ...filters, category: e.target.value })}
        >
          <option value="all">All Categories</option>
          <option value="outdoors">Outdoors</option>
          <option value="cafe">Cafes & Tea</option>
        </select>
        <select
          className="difficulty-select"
          value={filters.difficulty}
          onChange={(e) => onFilterChange({ ...filters, difficulty: e.target.value })}
        >
          <option value="all">All Difficulties</option>
          <option value="easy">Easy</option>
          <option value="moderate">Moderate</option>
          <option value="hard">Hard</option>
        </select>
      </div>
    </div>
  )
}
