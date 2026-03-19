import { useState } from 'react'
import './FamilyGroup.css'

export default function FamilyGroup({
  user,
  familyGroup,
  familyMembers,
  onCreateGroup,
  onJoinGroup,
  onLeaveGroup,
}) {
  const [joinCode, setJoinCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [showPanel, setShowPanel] = useState(false)

  if (!user) return null

  const copyCode = () => {
    navigator.clipboard.writeText(familyGroup)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleJoin = () => {
    if (joinCode.trim()) {
      onJoinGroup(joinCode.trim())
      setJoinCode('')
    }
  }

  return (
    <div className="family-section">
      <button className="family-toggle" onClick={() => setShowPanel(!showPanel)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 00-3-3.87" />
          <path d="M16 3.13a4 4 0 010 7.75" />
        </svg>
        Family
        {familyMembers.length > 0 && (
          <span className="family-count">{familyMembers.length}</span>
        )}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"
          style={{ transform: showPanel ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', marginLeft: 'auto' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {showPanel && (
        <div className="family-panel">
          {familyGroup ? (
            <>
              <div className="family-members">
                <div className="family-label">Group members</div>
                {familyMembers.map((m) => (
                  <div key={m.uid} className="family-member">
                    {m.photoURL && <img src={m.photoURL} alt="" className="family-member-avatar" referrerPolicy="no-referrer" />}
                    <span className="family-member-name">
                      {m.displayName}
                      {m.uid === user.uid && <span className="family-you"> (you)</span>}
                    </span>
                  </div>
                ))}
              </div>
              <div className="family-share">
                <div className="family-label">Invite code</div>
                <div className="family-code-row">
                  <code className="family-code">{familyGroup}</code>
                  <button className="family-copy-btn" onClick={copyCode}>
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <p className="family-hint">Share this code with family members so they can join your group.</p>
              </div>
              <button className="family-leave-btn" onClick={onLeaveGroup}>Leave group</button>
            </>
          ) : (
            <div className="family-setup">
              <p className="family-desc">
                Create or join a family group to share your hiking plans with others.
              </p>
              <button className="family-create-btn" onClick={onCreateGroup}>
                Create a group
              </button>
              <div className="family-divider"><span>or</span></div>
              <div className="family-join-row">
                <input
                  className="family-join-input"
                  placeholder="Paste invite code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                />
                <button className="family-join-btn" onClick={handleJoin} disabled={!joinCode.trim()}>
                  Join
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
