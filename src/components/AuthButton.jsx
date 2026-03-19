import './AuthButton.css'

export default function AuthButton({ user, onLogin, onLogout }) {
  if (user) {
    return (
      <div className="auth-user">
        <img className="auth-avatar" src={user.photoURL} alt="" referrerPolicy="no-referrer" />
        <button className="auth-logout-btn" onClick={onLogout}>Sign out</button>
      </div>
    )
  }

  return (
    <button className="auth-login-btn" onClick={onLogin}>
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" />
        <polyline points="10 17 15 12 10 7" />
        <line x1="15" y1="12" x2="3" y2="12" />
      </svg>
      Sign in
    </button>
  )
}
