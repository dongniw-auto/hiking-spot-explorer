/**
 * useSuggestion.js
 *
 * The scoring engine for Stardust's TodayCard.
 * Pure functions + a React hook that wires them to spots, user state, and calendar.
 *
 * Scoring breakdown (0–100):
 *   time_fit:         0–35 pts  (highest weight — does this fit your window?)
 *   recency:          0–25 pts  (natural rotation — go somewhere new)
 *   starred_unvisited: 15 pts   (you saved it for a reason)
 *   seasonal_fit:     0–10 pts  (right place, right season)
 *   time_of_day:      0–8 pts   (cafes morning, libraries evening, trails morning)
 *   mood_match:       0–7 pts   (need quiet → quiet spots)
 *   mode_bonus:       0–10 pts  (solo/family/body mode alignment)
 */

import { useState, useMemo, useCallback } from 'react'

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

const SEASONS = {
  0: 'winter', 1: 'winter',
  2: 'spring', 3: 'spring', 4: 'spring',
  5: 'summer', 6: 'summer', 7: 'summer',
  8: 'fall',   9: 'fall',  10: 'fall',
  11: 'winter'
}

const HOUR_RANGES = {
  morning:   [6, 11],
  midday:    [11, 14],
  afternoon: [14, 17],
  evening:   [17, 21],
}

/** Default estimated duration by category (minutes) when spot doesn't specify */
const DEFAULT_DURATION = {
  outdoors: 90,
  cafe: 60,
  library: 90,
  sports: 90,
  wellness: 60,
}

/** Default best time of day by category */
const DEFAULT_TIME_OF_DAY = {
  outdoors: ['morning', 'afternoon'],
  cafe: ['morning', 'afternoon'],
  library: ['afternoon', 'evening'],
  sports: ['morning', 'midday', 'afternoon'],
  wellness: ['morning', 'afternoon', 'evening'],
}

/** Default vibes by category */
const DEFAULT_VIBES = {
  outdoors: ['quiet', 'restorative'],
  cafe: ['quiet', 'focused'],
  library: ['quiet', 'focused', 'restorative'],
  sports: ['energized', 'social'],
  wellness: ['restorative'],
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

export function getCurrentTimeOfDay() {
  const h = new Date().getHours()
  for (const [vibe, [start, end]] of Object.entries(HOUR_RANGES)) {
    if (h >= start && h < end) return vibe
  }
  return 'evening'
}

export function getCurrentSeason() {
  return SEASONS[new Date().getMonth()]
}

function daysSince(timestamp) {
  if (!timestamp) return 999
  const ms = Date.now() - new Date(timestamp).getTime()
  return Math.floor(ms / (1000 * 60 * 60 * 24))
}

/**
 * Derive estimatedDuration from spot data.
 * Uses estimatedDuration if present, falls back to estimatedHikingTime,
 * then category default.
 */
function getDuration(spot) {
  if (spot.estimatedDuration) return spot.estimatedDuration
  if (spot.estimatedHikingTime) return spot.estimatedHikingTime
  return DEFAULT_DURATION[spot.category] ?? 60
}

/**
 * Parse bestSeason string(s) into a season array.
 * Handles: "Year-round", "Spring & Fall", "Spring (wildflowers) & Fall",
 * or already-array bestSeasons field.
 */
function getSeasons(spot) {
  if (Array.isArray(spot.bestSeasons)) return spot.bestSeasons
  const raw = spot.bestSeason || ''
  if (!raw || raw.toLowerCase().includes('year-round')) {
    return ['spring', 'summer', 'fall', 'winter']
  }
  const seasons = []
  const lower = raw.toLowerCase()
  if (lower.includes('spring')) seasons.push('spring')
  if (lower.includes('summer')) seasons.push('summer')
  if (lower.includes('fall') || lower.includes('autumn')) seasons.push('fall')
  if (lower.includes('winter')) seasons.push('winter')
  return seasons.length > 0 ? seasons : ['spring', 'summer', 'fall', 'winter']
}

function getVibes(spot) {
  if (Array.isArray(spot.vibes) && spot.vibes.length > 0) return spot.vibes
  return DEFAULT_VIBES[spot.category] ?? ['quiet']
}

function getTimeOfDay(spot) {
  if (Array.isArray(spot.bestTimeOfDay) && spot.bestTimeOfDay.length > 0) return spot.bestTimeOfDay
  return DEFAULT_TIME_OF_DAY[spot.category] ?? ['morning', 'afternoon']
}

function isShaded(spot) {
  if (typeof spot.shaded === 'boolean') return spot.shaded
  // Infer from description for outdoors
  if (spot.category === 'outdoors' && spot.description) {
    const d = spot.description.toLowerCase()
    return d.includes('shaded') || d.includes('redwood') || d.includes('canopy') || d.includes('forest')
  }
  // Indoor categories are always "shaded"
  return spot.category !== 'outdoors'
}

// ─────────────────────────────────────────────
// SCORING
// ─────────────────────────────────────────────

/**
 * scoreSpot — pure function, no side effects.
 *
 * @param {Object} spot - Spot object (from Firestore or sample data)
 * @param {Object} context
 * @param {number} context.availableMinutes - How much time the user has
 * @param {string} context.mood - 'need quiet' | 'open'
 * @param {string} context.season - 'spring' | 'summer' | 'fall' | 'winter'
 * @param {string} context.timeOfDay - 'morning' | 'midday' | 'afternoon' | 'evening'
 * @param {string} context.mode - 'solo' | 'family' | 'body'
 * @param {number[]} context.starredIds - Array of starred spot IDs
 * @returns {number} Score 0–100
 */
export function scoreSpot(spot, { availableMinutes, mood, season, timeOfDay, mode = 'solo', starredIds = [] }) {
  let score = 0
  const duration = getDuration(spot)
  const isStarred = starredIds.includes(spot.id) || spot.starred

  // 1. TIME FIT (0–35 pts) — most important signal
  if (duration <= availableMinutes) {
    const fit = 1 - Math.abs(duration - availableMinutes * 0.75) / availableMinutes
    score += Math.round(Math.max(0, fit) * 35)
  } else {
    score -= 20 // over time budget
  }

  // 2. RECENCY (0–25 pts)
  const days = daysSince(spot.lastVisited)
  if (days >= 30)      score += 25
  else if (days >= 14) score += 18
  else if (days >= 7)  score += 10
  else if (days >= 3)  score += 4
  else                 score -= 10 // just went

  // 3. STARRED BUT NEVER VISITED (15 pts)
  if (isStarred && (spot.visitCount === 0 || spot.visitCount === undefined)) {
    score += 15
  }

  // 4. SEASONAL FIT (0–10 pts)
  const seasons = getSeasons(spot)
  if (seasons.includes(season)) score += 10
  if (isShaded(spot) && season === 'summer') score += 8

  // 5. TIME OF DAY FIT (0–8 pts)
  const bestTimes = getTimeOfDay(spot)
  if (bestTimes.includes(timeOfDay)) score += 8

  // Category-specific time bonuses
  if (spot.category === 'cafe' && ['morning', 'afternoon'].includes(timeOfDay)) score += 5
  if (spot.category === 'library' && ['afternoon', 'evening'].includes(timeOfDay)) score += 5

  // 6. MOOD MATCH (0–7 pts)
  const vibes = getVibes(spot)
  if (mood === 'need quiet' && vibes.includes('quiet')) score += 7
  if (mood === 'open' && vibes.includes('social')) score += 3

  // 7. MODE BONUS (0–10 pts)
  score += scoreModeBonus(spot, mode, vibes)

  return Math.max(0, score)
}

/**
 * Mode-specific scoring adjustments.
 * Solo: boost quiet, nature, cafes. Penalize sports/social.
 * Family: boost kid-friendly. Penalize hard difficulty.
 * Body: boost sports, wellness. Penalize sedentary.
 */
function scoreModeBonus(spot, mode, vibes) {
  let bonus = 0

  switch (mode) {
    case 'solo':
      if (vibes.includes('quiet') || vibes.includes('restorative')) bonus += 6
      if (vibes.includes('focused')) bonus += 4
      if (spot.category === 'sports' && vibes.includes('social')) bonus -= 3
      break

    case 'family':
      if (spot.kidFriendly) bonus += 8
      if (vibes.includes('family')) bonus += 6
      if (spot.difficulty === 'hard') bonus -= 8
      if (!spot.kidFriendly) bonus -= 5
      break

    case 'body':
      if (spot.category === 'sports' || spot.category === 'wellness') bonus += 10
      if (spot.category === 'outdoors' && spot.difficulty !== 'easy') bonus += 5
      if (spot.category === 'library' || spot.category === 'cafe') bonus -= 5
      break
  }

  return bonus
}

/**
 * getSuggestions — rank all spots, best first.
 */
export function getSuggestions(spots, context) {
  return [...spots]
    .map(spot => ({ spot, score: scoreSpot(spot, context) }))
    .sort((a, b) => b.score - a.score)
    .map(({ spot, score }) => ({ ...spot, _score: score }))
}

// ─────────────────────────────────────────────
// CALENDAR-AWARE FREE TIME DETECTION
// ─────────────────────────────────────────────

/**
 * Given today's Google Calendar events, figure out the next free window.
 * Returns { availableMinutes, windowStart, windowEnd } or null.
 *
 * Logic:
 * - Look at events from now until end of day
 * - Find gaps between events that are >= 45 minutes
 * - Return the largest gap
 * - If no calendar data, return null (caller uses manual selection)
 */
export function detectFreeTime(calendarEvents) {
  if (!calendarEvents || calendarEvents.length === 0) return null

  const now = new Date()
  const endOfDay = new Date(now)
  endOfDay.setHours(21, 0, 0, 0) // Cap at 9pm — you're not going hiking at 10pm

  // Filter to today's events that haven't ended yet
  const todayEvents = calendarEvents
    .filter(evt => {
      if (!evt.start?.dateTime) return false // skip all-day events
      const end = new Date(evt.end.dateTime)
      return end > now
    })
    .map(evt => ({
      start: new Date(evt.start.dateTime),
      end: new Date(evt.end.dateTime),
    }))
    .sort((a, b) => a.start - b.start)

  // Find gaps
  const gaps = []
  let cursor = now

  for (const evt of todayEvents) {
    if (evt.start > cursor) {
      const gapMinutes = Math.round((evt.start - cursor) / 60000)
      if (gapMinutes >= 45) {
        gaps.push({
          availableMinutes: gapMinutes,
          windowStart: new Date(cursor),
          windowEnd: new Date(evt.start),
        })
      }
    }
    if (evt.end > cursor) cursor = evt.end
  }

  // Gap after last event until end of day
  if (endOfDay > cursor) {
    const gapMinutes = Math.round((endOfDay - cursor) / 60000)
    if (gapMinutes >= 45) {
      gaps.push({
        availableMinutes: gapMinutes,
        windowStart: new Date(cursor),
        windowEnd: endOfDay,
      })
    }
  }

  if (gaps.length === 0) return null

  // Return the largest gap — that's when you should go
  return gaps.reduce((best, g) => g.availableMinutes > best.availableMinutes ? g : best)
}

// ─────────────────────────────────────────────
// REACT HOOK
// ─────────────────────────────────────────────

/**
 * useSuggestion — the main hook for TodayCard.
 *
 * @param {Object[]} spots - All spots (from useSpots)
 * @param {number[]} starredIds - Starred spot IDs (from useFirestore)
 * @param {Object[]} calendarEvents - Today's Google Calendar events (optional)
 * @returns Hook state and actions
 */
export default function useSuggestion(spots, starredIds = [], calendarEvents = []) {
  const [availableMinutes, setAvailableMinutes] = useState(120)
  const [mood, setMood] = useState('open')
  const [mode, setMode] = useState('solo')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [rejections, setRejections] = useState(0)

  const season = getCurrentSeason()
  const timeOfDay = getCurrentTimeOfDay()

  // Detect free time from calendar
  const freeTime = useMemo(
    () => detectFreeTime(calendarEvents),
    [calendarEvents]
  )

  // Compute ranked suggestions
  const suggestions = useMemo(() => {
    if (!spots || spots.length === 0) return []
    return getSuggestions(spots, {
      availableMinutes,
      mood,
      season,
      timeOfDay,
      mode,
      starredIds,
    })
  }, [spots, availableMinutes, mood, season, timeOfDay, mode, starredIds])

  const currentSpot = suggestions[currentIndex] ?? null

  const reject = useCallback(() => {
    const next = currentIndex + 1
    setRejections(r => r + 1)
    setCurrentIndex(next >= suggestions.length ? 0 : next)
  }, [currentIndex, suggestions.length])

  const reset = useCallback(() => {
    setCurrentIndex(0)
    setRejections(0)
  }, [])

  // Apply calendar-detected time if available
  const applyCalendarTime = useCallback(() => {
    if (freeTime) {
      setAvailableMinutes(freeTime.availableMinutes)
    }
  }, [freeTime])

  return {
    // State
    suggestions,
    currentSpot,
    currentIndex,
    rejections,
    availableMinutes,
    mood,
    mode,
    season,
    timeOfDay,
    freeTime,

    // Actions
    setAvailableMinutes,
    setMood,
    setMode,
    reject,
    reset,
    applyCalendarTime,
  }
}
