import { describe, it, expect } from 'vitest'
import { activityDuration, scoreSpot, getSuggestions } from './TodayCard.jsx'

// ─── Fixtures ────────────────────────────────────────────────────────────────

const SF = { lat: 37.7749, lng: -122.4194 }

// A spot in SF (~5 miles from SF center → ~13 min one-way → ~26 min round-trip)
const LANDS_END = {
  id: 1, name: 'Lands End Trail', category: 'outdoors',
  lat: 37.7879, lng: -122.5054,
  estimatedHikingTime: 90,
  rating: 4.7,
  bestSeasons: ['spring', 'fall'],
  bestTimeOfDay: ['morning', 'afternoon'],
  vibes: ['quiet'],
}

// A nearby cafe in SF (~0.3 miles from SF center → ~1 min one-way → ~2 min round-trip)
const NEARBY_CAFE = {
  id: 2, name: 'Corner Cafe', category: 'cafe',
  lat: 37.7752, lng: -122.4201,
  estimatedHikingTime: null,
  estimatedDuration: null,
  rating: 4.2,
  bestSeasons: ['spring', 'winter'],
  bestTimeOfDay: ['morning', 'afternoon'],
  vibes: ['quiet'],
}

const BASE_CONTEXT = {
  availableMinutes: 120,
  mood: 'open',
  season: 'spring',
  timeOfDay: 'morning',
  userLocation: SF,
}

// ─── activityDuration ────────────────────────────────────────────────────────

describe('activityDuration', () => {
  it('reads estimatedDuration first (sample-spot compat)', () => {
    expect(activityDuration({ estimatedDuration: 75, estimatedHikingTime: 90 })).toBe(75)
  })

  it('falls back to estimatedHikingTime for real spots', () => {
    expect(activityDuration({ estimatedDuration: null, estimatedHikingTime: 90, category: 'outdoors' })).toBe(90)
  })

  it('returns 30 for cafe when both fields null', () => {
    expect(activityDuration({ estimatedDuration: null, estimatedHikingTime: null, category: 'cafe' })).toBe(30)
  })

  it('returns 30 for library when both fields null', () => {
    expect(activityDuration({ estimatedDuration: null, estimatedHikingTime: null, category: 'library' })).toBe(30)
  })

  it('returns 60 for sports when both fields null', () => {
    expect(activityDuration({ estimatedDuration: null, estimatedHikingTime: null, category: 'sports' })).toBe(60)
  })

  it('returns 60 as ultimate fallback for unknown category', () => {
    expect(activityDuration({ estimatedDuration: null, estimatedHikingTime: null, category: 'unknown' })).toBe(60)
  })
})

// ─── getSuggestions — time-window hard filter ────────────────────────────────

describe('getSuggestions — time-window filter', () => {
  it('excludes spots where activity alone exceeds available window', () => {
    const longTrail = { ...LANDS_END, estimatedHikingTime: 180 }
    const results = getSuggestions([longTrail], { ...BASE_CONTEXT, availableMinutes: 60, userLocation: null })
    expect(results).toHaveLength(0)
  })

  it('includes spots that fit within the window', () => {
    const results = getSuggestions([NEARBY_CAFE], { ...BASE_CONTEXT, availableMinutes: 60 })
    expect(results).toHaveLength(1)
  })

  it('excludes spots where travel + activity exceeds window (core bug regression)', () => {
    // Lands End: ~26 min round-trip + 90 min activity = ~116 min — should not fit in 60 min
    const results = getSuggestions([LANDS_END], { ...BASE_CONTEXT, availableMinutes: 60 })
    expect(results).toHaveLength(0)
  })

  it('includes the same spot when window is large enough', () => {
    // 26 min round-trip + 90 min activity = ~116 min — fits in 2 hours
    const results = getSuggestions([LANDS_END], { ...BASE_CONTEXT, availableMinutes: 120 })
    expect(results).toHaveLength(1)
  })

  it('returns spots sorted best-first (unvisited ranks above recently visited)', () => {
    const neverVisited = { ...NEARBY_CAFE, id: 10, lastVisited: null, visitCount: 0 }
    const visitedToday = { ...NEARBY_CAFE, id: 11, lastVisited: new Date().toISOString(), visitCount: 3 }
    const results = getSuggestions([visitedToday, neverVisited], BASE_CONTEXT)
    expect(results[0].id).toBe(10)
  })

  it('returns empty array when no spots fit', () => {
    const results = getSuggestions([], BASE_CONTEXT)
    expect(results).toHaveLength(0)
  })

  it('treats missing userLocation as zero travel time', () => {
    // Without location, travel = 0; activity 90 min fits in 120 min window
    const results = getSuggestions([LANDS_END], { ...BASE_CONTEXT, userLocation: null })
    expect(results).toHaveLength(1)
  })
})

// ─── scoreSpot ───────────────────────────────────────────────────────────────

describe('scoreSpot', () => {
  it('returns a non-negative number', () => {
    const score = scoreSpot(LANDS_END, BASE_CONTEXT)
    expect(score).toBeGreaterThanOrEqual(0)
  })

  it('gives recency bonus to unvisited spots', () => {
    const unvisited = { ...LANDS_END, lastVisited: null }
    const recentlyVisited = { ...LANDS_END, lastVisited: new Date().toISOString() }
    expect(scoreSpot(unvisited, BASE_CONTEXT)).toBeGreaterThan(scoreSpot(recentlyVisited, BASE_CONTEXT))
  })

  it('gives bonus to starred-but-never-visited spots', () => {
    const starredNever = { ...LANDS_END, starred: true, visitCount: 0, lastVisited: null }
    const unstarredNever = { ...LANDS_END, starred: false, visitCount: 0, lastVisited: null }
    expect(scoreSpot(starredNever, BASE_CONTEXT)).toBeGreaterThan(scoreSpot(unstarredNever, BASE_CONTEXT))
  })

  it('gives seasonal bonus when spot matches current season', () => {
    const inSeason = { ...LANDS_END, bestSeasons: ['spring'] }
    const outOfSeason = { ...LANDS_END, bestSeasons: ['winter'] }
    const ctx = { ...BASE_CONTEXT, season: 'spring' }
    expect(scoreSpot(inSeason, ctx)).toBeGreaterThan(scoreSpot(outOfSeason, ctx))
  })

  it('gives time-of-day bonus when spot matches current time', () => {
    const goodMorning = { ...LANDS_END, bestTimeOfDay: ['morning'] }
    const badMorning = { ...LANDS_END, bestTimeOfDay: ['evening'] }
    const ctx = { ...BASE_CONTEXT, timeOfDay: 'morning' }
    expect(scoreSpot(goodMorning, ctx)).toBeGreaterThan(scoreSpot(badMorning, ctx))
  })
})
