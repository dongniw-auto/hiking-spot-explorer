import { useState, useMemo } from 'react'

// Stardust value per task based on spot difficulty
function stardustForDifficulty(difficulty) {
  switch (difficulty) {
    case 'easy': return 2
    case 'moderate': return 4
    case 'hard': return 6
    default: return 3
  }
}

// Generate bounty tasks for a spot
function generateTasksForSpot(spot) {
  const value = stardustForDifficulty(spot.difficulty)
  const category = spot.category || 'outdoors'

  if (category === 'outdoors' && spot.difficulty) {
    // Trail spots: before / mid / after
    return [
      { id: `${spot.id}-before`, spotId: spot.id, spotName: spot.name, title: '📸 Selfie at the trailhead', stardust: value, type: 'trail' },
      { id: `${spot.id}-mid`, spotId: spot.id, spotName: spot.name, title: '📸 Selfie at the midpoint', stardust: value, type: 'trail' },
      { id: `${spot.id}-after`, spotId: spot.id, spotName: spot.name, title: '📸 Selfie at the summit / end', stardust: value, type: 'trail' },
    ]
  }

  // Coffee, library, gym, etc.
  const emoji = category === 'cafe' ? '☕' : category === 'library' ? '📚' : '⭐'
  return [
    { id: `${spot.id}-visit`, spotId: spot.id, spotName: spot.name, title: `${emoji} Visit & check in`, stardust: 3, type: 'visit' },
  ]
}

export default function useBounty(spots, starredSpotIds, savedPlans) {
  const [completions, setCompletions] = useState([]) // [{taskId, spotId, completedAt}]

  const eligibleSpotIds = useMemo(() => {
    const starred = new Set(starredSpotIds || [])
    const planned = new Set(Object.keys(savedPlans || {}))
    return spots
      .filter((s) => starred.has(s.id) || planned.has(String(s.id)))
      .map((s) => s.id)
  }, [spots, starredSpotIds, savedPlans])

  const bounties = useMemo(() => {
    const eligible = spots.filter((s) => eligibleSpotIds.includes(s.id))
    return eligible.flatMap(generateTasksForSpot)
  }, [spots, eligibleSpotIds])

  const completedTaskIds = useMemo(
    () => new Set(completions.map((c) => c.taskId)),
    [completions]
  )

  const totalStardust = useMemo(() => {
    return completions.reduce((sum, c) => {
      const task = bounties.find((b) => b.id === c.taskId)
      return sum + (task?.stardust || 0)
    }, 0)
  }, [completions, bounties])

  function completeTask(taskId) {
    const task = bounties.find((b) => b.id === taskId)
    if (!task || completedTaskIds.has(taskId)) return
    setCompletions((prev) => [...prev, { taskId, spotId: task.spotId, completedAt: new Date().toISOString() }])
  }

  return { bounties, completedTaskIds, completeTask, totalStardust }
}
