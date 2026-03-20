import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './MapView.css'

const mountainSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M14 6l-3.75 5 2.85 3.8-1.6 1.2C9.81 13.75 7 10 7 10l-6 8h22L14 6z"/></svg>`
const coffeeSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M20 3H4v10c0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4v-3h2c1.11 0 2-.89 2-2V5c0-1.11-.89-2-2-2zm0 5h-2V5h2v3zM4 19h16v2H4z"/></svg>`
const dumbbellSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29l-1.43-1.43z"/></svg>`
const bookSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 18H6V4h2v8l2.5-1.5L13 12V4h5v16z"/></svg>`

const createIcon = (color, svg = mountainSvg) =>
  L.divIcon({
    className: 'custom-marker',
    html: `<div style="background:${color};width:28px;height:28px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
      ${svg}
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })

const greenIcon = createIcon('#4a7c23')
const orangeIcon = createIcon('#e67e22')
const redIcon = createIcon('#e74c3c')
const cafeIcon = createIcon('#8b5a2b', coffeeSvg)
const gymIcon = createIcon('#6b46c1', dumbbellSvg)
const libraryIcon = createIcon('#1a6b9a', bookSvg)

const iconByDifficulty = {
  easy: greenIcon,
  moderate: orangeIcon,
  hard: redIcon,
}

function getSpotIcon(spot) {
  if (spot.category === 'cafe') return cafeIcon
  if (spot.category === 'sports') return gymIcon
  if (spot.category === 'library') return libraryIcon
  return iconByDifficulty[spot.difficulty] || greenIcon
}

function MapUpdater({ center, selectedSpot, markerRefs }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, map.getZoom())
  }, [center, map])

  useEffect(() => {
    if (selectedSpot && markerRefs.current[selectedSpot.id]) {
      markerRefs.current[selectedSpot.id].openPopup()
    }
  }, [selectedSpot?.id])

  return null
}

function formatTime(minutes) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export default function MapView({ spots, center, selectedSpot, onSpotSelect }) {
  const markerRefs = useRef({})

  return (
    <MapContainer center={center} zoom={9} className="map-container" scrollWheelZoom={true}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapUpdater center={center} selectedSpot={selectedSpot} markerRefs={markerRefs} />
      {spots.map((spot) => (
        <Marker
          key={spot.id}
          position={[spot.lat, spot.lng]}
          icon={getSpotIcon(spot)}
          ref={(el) => { if (el) markerRefs.current[spot.id] = el }}
          eventHandlers={{ click: () => onSpotSelect(spot) }}
        >
          <Popup>
            <div className="map-popup">
              <strong>{spot.name}</strong>
              <span className="popup-location">{spot.location}</span>
              {spot.category !== 'cafe' && spot.distance != null && (
                <div className="popup-details">
                  <span>{spot.distance} mi</span>
                  <span>{formatTime(spot.estimatedHikingTime)}</span>
                  <span className={`difficulty-badge ${spot.difficulty}`}>{spot.difficulty}</span>
                </div>
              )}
              <div className="popup-tags">
                {spot.petFriendly && <span className="tag pet">Pet OK</span>}
                {spot.kidFriendly && <span className="tag kid">Kid OK</span>}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
