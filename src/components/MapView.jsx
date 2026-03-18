import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './MapView.css'

const createIcon = (color) =>
  L.divIcon({
    className: 'custom-marker',
    html: `<div style="background:${color};width:28px;height:28px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M14 6l-3.75 5 2.85 3.8-1.6 1.2C9.81 13.75 7 10 7 10l-6 8h22L14 6z"/></svg>
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })

const greenIcon = createIcon('#4a7c23')
const orangeIcon = createIcon('#e67e22')
const redIcon = createIcon('#e74c3c')

const iconByDifficulty = {
  easy: greenIcon,
  moderate: orangeIcon,
  hard: redIcon,
}

function MapUpdater({ center }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, map.getZoom())
  }, [center, map])
  return null
}

function formatTime(minutes) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export default function MapView({ spots, center, selectedSpot, onSpotSelect }) {
  return (
    <MapContainer center={center} zoom={9} className="map-container" scrollWheelZoom={true}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapUpdater center={center} />
      {spots.map((spot) => (
        <Marker
          key={spot.id}
          position={[spot.lat, spot.lng]}
          icon={iconByDifficulty[spot.difficulty]}
          eventHandlers={{ click: () => onSpotSelect(spot) }}
        >
          <Popup>
            <div className="map-popup">
              <strong>{spot.name}</strong>
              <span className="popup-location">{spot.location}</span>
              <div className="popup-details">
                <span>{spot.distance} mi</span>
                <span>{formatTime(spot.estimatedHikingTime)}</span>
                <span className={`difficulty-badge ${spot.difficulty}`}>{spot.difficulty}</span>
              </div>
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
