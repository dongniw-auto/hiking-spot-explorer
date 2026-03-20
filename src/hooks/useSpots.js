import { useState, useEffect, useRef } from 'react'
import { collection, onSnapshot, writeBatch, doc, getDoc } from 'firebase/firestore'
import { db, hasConfig } from '../firebase'
import { SAMPLE_SPOTS } from '../data/spots'

// Bump this when adding/updating spots in the static seed data
const SEED_VERSION = 11

const CACHE_KEY = 'cachedSpots'

function loadCache() {
  try {
    const data = localStorage.getItem(CACHE_KEY)
    return data ? JSON.parse(data) : null
  } catch { return null }
}

function saveCache(spots) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(spots)) } catch {}
}

async function seedSpots() {
  const batch = writeBatch(db)
  SAMPLE_SPOTS.forEach((spot) => {
    batch.set(doc(db, 'spots', String(spot.id)), spot)
  })
  // Store version in a meta document
  batch.set(doc(db, 'spots', '_meta'), { version: SEED_VERSION })
  await batch.commit()
}

export default function useSpots(user) {
  const [spots, setSpots] = useState(() => loadCache() || SAMPLE_SPOTS)
  const [loading, setLoading] = useState(hasConfig)
  const [error, setError] = useState(null)
  const seedingRef = useRef(false)

  // Seed spots when user logs in
  useEffect(() => {
    if (!hasConfig || !user) return
    if (seedingRef.current) return

    const checkAndSeed = async () => {
      try {
        const metaSnap = await getDoc(doc(db, 'spots', '_meta'))
        const currentVersion = metaSnap.exists() ? (metaSnap.data()?.version || 0) : 0
        if (currentVersion < SEED_VERSION) {
          seedingRef.current = true
          await seedSpots()
          setError(null)
          seedingRef.current = false
        }
      } catch (err) {
        console.error('Failed to seed spots:', err)
        setError(`Failed to write spots to Firestore: ${err.code || err.message}`)
        seedingRef.current = false
      }
    }
    checkAndSeed()
  }, [user?.uid])

  // Listen for spots data
  useEffect(() => {
    if (!hasConfig) {
      setLoading(false)
      return
    }

    return onSnapshot(collection(db, 'spots'), (snap) => {
      const firestoreSpots = snap.docs
        .filter((d) => d.id !== '_meta')
        .map((d) => ({ ...d.data(), id: Number(d.id) || d.id }))

      if (firestoreSpots.length > 0) {
        firestoreSpots.sort((a, b) => a.id - b.id)
        setSpots(firestoreSpots)
        saveCache(firestoreSpots)
      }
      setLoading(false)
    }, (err) => {
      console.error('Spots snapshot error:', err)
      setError(`Firestore read error: ${err.code || err.message}`)
      setLoading(false)
    })
  }, [])

  return { spots, loading, error }
}
