import { useState, useCallback } from 'react'

const GCAL_API = 'https://www.googleapis.com/calendar/v3'

export default function useGoogleCalendar(accessToken) {
  const [calendarEvents, setCalendarEvents] = useState([])
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [tokenExpired, setTokenExpired] = useState(false)
  const [error, setError] = useState(null)

  const fetchEvents = useCallback(async (timeMin, timeMax) => {
    if (!accessToken) return
    setLoadingEvents(true)
    setTokenExpired(false)
    setError(null)
    try {
      const params = new URLSearchParams({
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: '50',
      })
      const res = await fetch(`${GCAL_API}/calendars/primary/events?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (res.status === 401) {
        setTokenExpired(true)
        setCalendarEvents([])
        return
      }
      if (res.status === 403) {
        const body = await res.json().catch(() => ({}))
        const msg = body?.error?.message || ''
        console.error('GCal 403:', msg, body)
        if (msg.includes('insufficient') || msg.includes('Insufficient')) {
          // Token doesn't have calendar scope — user needs to sign out and sign in again
          setError('Calendar permission not granted. Sign out and sign in again to authorize calendar access.')
          setTokenExpired(true)
        } else {
          setError(`GCal: ${msg || 'Access denied (403). Check that Google Calendar API is enabled in GCP Console.'}`)
        }
        setCalendarEvents([])
        return
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        console.error('GCal fetch failed:', res.status, body)
        setError(`Calendar fetch failed (${res.status})`)
        setCalendarEvents([])
        return
      }
      const data = await res.json()
      setCalendarEvents(data.items || [])
    } catch (err) {
      console.error('GCal fetch error:', err)
      setError('Network error fetching calendar')
      setCalendarEvents([])
    } finally {
      setLoadingEvents(false)
    }
  }, [accessToken])

  const createEvent = useCallback(async ({ summary, location, description, startDateTime, endDateTime }) => {
    if (!accessToken) return null
    try {
      const body = {
        summary,
        location,
        description,
        start: { dateTime: startDateTime, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
        end: { dateTime: endDateTime, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
      }
      const res = await fetch(`${GCAL_API}/calendars/primary/events`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })
      if (res.status === 401) {
        setTokenExpired(true)
        return null
      }
      if (!res.ok) {
        console.error('GCal create failed:', res.status)
        return null
      }
      return await res.json()
    } catch (err) {
      console.error('GCal create error:', err)
      return null
    }
  }, [accessToken])

  return { calendarEvents, loadingEvents, fetchEvents, createEvent, tokenExpired, error }
}
