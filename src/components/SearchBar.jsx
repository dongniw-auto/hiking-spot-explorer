import { useState } from 'react'
import './SearchBar.css'

const REGIONS = [
  { name: 'San Francisco Bay Area', short: 'SF Bay', lat: 37.7749, lng: -122.4194 },
  { name: 'Santa Clara County', short: 'Santa Clara', lat: 37.3541, lng: -121.9552 },
  { name: 'All Bay Area', short: 'All Bay', lat: 37.5585, lng: -122.1711 },
]

const DIFFICULTIES = ['all', 'easy', 'moderate', 'hard']
const CATEGORIES = ['all', 'outdoors', 'cafe']

const DIFF_LABELS = { all: 'Any', easy: 'Easy', moderate: 'Med', hard: 'Hard' }
const CAT_LABELS = { all: 'All', outdoors: 'Outdoors', cafe: 'Cafes' }

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

  const toggle = (key) => onFilterChange({ ...filters, [key]: !filters[key] })
  const cycleDifficulty = () => {
    const i = DIFFICULTIES.indexOf(filters.difficulty)
    onFilterChange({ ...filters, difficulty: DIFFICULTIES[(i + 1) % DIFFICULTIES.length] })
  }
  const cycleCategory = () => {
    const i = CATEGORIES.indexOf(filters.category || 'all')
    onFilterChange({ ...filters, category: CATEGORIES[(i + 1) % CATEGORIES.length] })
  }

  const activeCount = [filters.petFriendly, filters.kidFriendly, filters.libraryParkPass, filters.starredOnly].filter(Boolean).length
    + (filters.difficulty !== 'all' ? 1 : 0)
    + ((filters.category || 'all') !== 'all' ? 1 : 0)

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
            placeholder="Search places..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              onSearch(e.target.value)
            }}
          />
          <button type="button" className="location-btn" onClick={handleUseMyLocation} title="Use my location">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
            </svg>
          </button>
        </div>
      </form>

      <div className="chip-row">
        {REGIONS.map((r) => (
          <button key={r.name} className="chip region" onClick={() => handleRegionClick(r)}>
            {r.short}
          </button>
        ))}

        <span className="chip-divider" />

        <button className={`chip toggle ${filters.petFriendly ? 'on' : ''}`} onClick={() => toggle('petFriendly')}>
          Pets
        </button>
        <button className={`chip toggle ${filters.kidFriendly ? 'on' : ''}`} onClick={() => toggle('kidFriendly')}>
          Kids
        </button>
        <button className={`chip toggle lib ${filters.libraryParkPass ? 'on' : ''}`} onClick={() => toggle('libraryParkPass')}>
          Free Pass
        </button>
        <button className={`chip toggle star ${filters.starredOnly ? 'on' : ''}`} onClick={() => toggle('starredOnly')}>
          Saved
        </button>

        <button className={`chip cycle ${filters.difficulty !== 'all' ? 'on' : ''}`} onClick={cycleDifficulty}>
          {DIFF_LABELS[filters.difficulty]}
        </button>
        <button className={`chip cycle ${(filters.category || 'all') !== 'all' ? 'on' : ''}`} onClick={cycleCategory}>
          {CAT_LABELS[filters.category || 'all']}
        </button>

        {activeCount > 0 && (
          <button
            className="chip clear"
            onClick={() => onFilterChange({
              petFriendly: false, kidFriendly: false, libraryParkPass: false,
              starredOnly: false, difficulty: 'all', category: 'all',
            })}
          >
            Clear
          </button>
        )}
      </div>
    </div>
  )
}
