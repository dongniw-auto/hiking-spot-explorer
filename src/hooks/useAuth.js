import { useState, useEffect, useCallback } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut, GoogleAuthProvider } from 'firebase/auth'
import { auth, googleProvider, hasConfig } from '../firebase'

// Request Google Calendar read/write scope
googleProvider?.addScope('https://www.googleapis.com/auth/calendar.events')

const TOKEN_KEY = 'stardust_gcal_token'
const TOKEN_TS_KEY = 'stardust_gcal_token_ts'
const TOKEN_TTL = 55 * 60 * 1000 // 55 minutes (tokens last ~60 min)

function getSavedToken() {
  const token = sessionStorage.getItem(TOKEN_KEY)
  const ts = Number(sessionStorage.getItem(TOKEN_TS_KEY) || 0)
  if (token && Date.now() - ts < TOKEN_TTL) return token
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(TOKEN_TS_KEY)
  return null
}

function saveToken(token) {
  sessionStorage.setItem(TOKEN_KEY, token)
  sessionStorage.setItem(TOKEN_TS_KEY, String(Date.now()))
}

function clearToken() {
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(TOKEN_TS_KEY)
}

export default function useAuth() {
  const [user, setUser] = useState(null)
  const [googleAccessToken, setGoogleAccessToken] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState(null)

  useEffect(() => {
    if (!hasConfig) {
      setLoading(false)
      return
    }
    return onAuthStateChanged(auth, (u) => {
      setUser(u)
      if (u) {
        const saved = getSavedToken()
        if (saved) setGoogleAccessToken(saved)
      } else {
        setGoogleAccessToken(null)
        clearToken()
      }
      setLoading(false)
    })
  }, [])

  const login = useCallback(async () => {
    if (!hasConfig) return
    try {
      const result = await signInWithPopup(auth, googleProvider)
      const credential = GoogleAuthProvider.credentialFromResult(result)
      if (credential?.accessToken) {
        setGoogleAccessToken(credential.accessToken)
        saveToken(credential.accessToken)
      }
    } catch (err) {
      console.error('Login failed:', err)
      setAuthError(`${err.code}: ${err.message}`)
    }
  }, [])

  // Re-authenticate to get a fresh Google access token (for calendar)
  const refreshGoogleToken = useCallback(async () => {
    if (!hasConfig || !auth.currentUser) return
    try {
      const result = await signInWithPopup(auth, googleProvider)
      const credential = GoogleAuthProvider.credentialFromResult(result)
      if (credential?.accessToken) {
        setGoogleAccessToken(credential.accessToken)
        saveToken(credential.accessToken)
      }
    } catch (err) {
      console.error('Token refresh failed:', err)
    }
  }, [])

  const logout = useCallback(async () => {
    if (!hasConfig) return
    try {
      await signOut(auth)
      setGoogleAccessToken(null)
      clearToken()
    } catch (err) {
      console.error('Logout failed:', err)
    }
  }, [])

  return { user, loading, login, logout, hasConfig, googleAccessToken, refreshGoogleToken, authError }
}
