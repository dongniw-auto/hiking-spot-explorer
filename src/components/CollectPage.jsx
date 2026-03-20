import './CollectPage.css'

function timeAgo(isoString) {
  const diff = (Date.now() - new Date(isoString)) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function CollectPage({ bounties, completedTaskIds, completeTask, totalStardust }) {
  const open = bounties.filter((b) => !completedTaskIds.has(b.id))
  const completed = bounties.filter((b) => completedTaskIds.has(b.id))

  // Group open bounties by spot
  const grouped = open.reduce((acc, task) => {
    if (!acc[task.spotId]) acc[task.spotId] = { spotName: task.spotName, tasks: [] }
    acc[task.spotId].tasks.push(task)
    return acc
  }, {})

  return (
    <div className="collect-page">
      {/* Stardust balance header */}
      <div className="collect-balance-card">
        <div className="collect-star-icon">⭐</div>
        <div className="collect-balance-value">{totalStardust}</div>
        <div className="collect-balance-label">stardust earned</div>
        {totalStardust > 0 && (
          <div className="collect-balance-sub">
            {completed.length} task{completed.length !== 1 ? 's' : ''} completed
          </div>
        )}
      </div>

      {/* Empty state */}
      {bounties.length === 0 && (
        <div className="collect-empty">
          <div className="collect-empty-icon">🗺️</div>
          <h3>No bounties yet</h3>
          <p>Star some spots or make a plan to unlock bounties!</p>
        </div>
      )}

      {/* Open bounties */}
      {open.length > 0 && (
        <section className="collect-section">
          <h2 className="collect-section-title">📋 Open Bounties</h2>
          <div className="collect-bounty-groups">
            {Object.values(grouped).map((group) => (
              <div key={group.spotName} className="collect-spot-group">
                <div className="collect-spot-name">{group.spotName}</div>
                {group.tasks.map((task) => (
                  <div key={task.id} className="collect-task-card">
                    <div className="collect-task-info">
                      <div className="collect-task-title">{task.title}</div>
                      <div className="collect-task-value">+{task.stardust} ⭐</div>
                    </div>
                    <button
                      className="collect-complete-btn"
                      onClick={() => completeTask(task.id)}
                    >
                      Complete
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <section className="collect-section">
          <h2 className="collect-section-title">✅ Completed</h2>
          <div className="collect-completed-list">
            {completed.map((task) => {
              // find completion record — we don't have it directly, use task.id as key
              return (
                <div key={task.id} className="collect-completed-card">
                  <div className="collect-completed-check">✓</div>
                  <div className="collect-completed-info">
                    <div className="collect-completed-title">{task.title}</div>
                    <div className="collect-completed-spot">{task.spotName}</div>
                  </div>
                  <div className="collect-completed-value">+{task.stardust} ⭐</div>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
