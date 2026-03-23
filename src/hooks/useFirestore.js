import { useState, useEffect, useCallback } from 'react'
import {
  doc, collection, setDoc, onSnapshot,
  query, where, updateDoc, arrayUnion, arrayRemove, deleteField
} from 'firebase/firestore'
import { db, hasConfig } from '../firebase'

function loadLocal(key, fallback) {
  try {
    const val = localStorage.getItem(key)
    return val ? JSON.parse(val) : fallback
  } catch { return fallback }
}

function saveLocal(key, val) {
  localStorage.setItem(key, JSON.stringify(val))
}

// setDoc with merge — safe even if doc doesn't exist yet
function safeUpdate(ref, data) {
  return setDoc(ref, data, { merge: true }).catch((err) => {
    console.error('Firestore write failed:', err)
  })
}

export default function useFirestore(user) {
  const [starred, setStarred] = useState(() => loadLocal('starredSpots', []))
  const [savedPlans, setSavedPlans] = useState(() => loadLocal('savedPlans', {}))
  const [memories, setMemories] = useState(() => loadLocal('stardustMemories', {}))
  const [familyGroup, setFamilyGroup] = useState(null)
  const [familyPlans, setFamilyPlans] = useState({})
  const [familyMembers, setFamilyMembers] = useState([])
  const [userDocReady, setUserDocReady] = useState(false)

  const isOnline = hasConfig && !!user

  // Sync user data from Firestore when logged in
  useEffect(() => {
    if (!isOnline) {
      setUserDocReady(false)
      return
    }
    const userDoc = doc(db, 'users', user.uid)
    const localPlans = loadLocal('savedPlans', {})
    const localStarred = loadLocal('starredSpots', [])
    const localMemories = loadLocal('stardustMemories', {})

    return onSnapshot(userDoc, (snap) => {
      if (snap.exists()) {
        const data = snap.data()

        // Starred: Firestore wins if non-empty, else push local
        if (data.starred && data.starred.length > 0) {
          setStarred(data.starred)
        } else if (localStarred.length > 0) {
          updateDoc(userDoc, { starred: localStarred }).catch(() => {})
        }

        // Plans: Firestore wins if non-empty, else push local
        const firestorePlans = data.plans || {}
        const hasFirestorePlans = Object.keys(firestorePlans).length > 0
        const hasLocalPlans = Object.keys(localPlans).length > 0

        if (hasFirestorePlans) {
          setSavedPlans(firestorePlans)
          saveLocal('savedPlans', firestorePlans)
        } else if (hasLocalPlans) {
          // Firestore is empty but we have local plans — push them up
          setSavedPlans(localPlans)
          updateDoc(userDoc, { plans: localPlans }).catch(() => {})
        }

        // Memories: Firestore wins if non-empty, else push local
        const firestoreMemories = data.memories || {}
        const hasFirestoreMemories = Object.keys(firestoreMemories).length > 0
        const hasLocalMemories = Object.keys(localMemories).length > 0

        if (hasFirestoreMemories) {
          setMemories(firestoreMemories)
          saveLocal('stardustMemories', firestoreMemories)
        } else if (hasLocalMemories) {
          setMemories(localMemories)
          updateDoc(userDoc, { memories: localMemories }).catch(() => {})
        }

        if (data.familyGroupId) {
          setFamilyGroup(data.familyGroupId)
        } else {
          setFamilyGroup(null)
        }
      } else {
        // First login — push local data to Firestore
        setDoc(userDoc, {
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          starred: localStarred,
          plans: localPlans,
          memories: localMemories,
          familyGroupId: null,
        })
      }
      setUserDocReady(true)
    }, (err) => {
      console.error('Firestore snapshot error:', err)
      setUserDocReady(true)
    })
  }, [isOnline, user?.uid])

  // Listen to family group plans
  useEffect(() => {
    if (!isOnline || !familyGroup) {
      setFamilyPlans({})
      setFamilyMembers([])
      return
    }
    const q = query(collection(db, 'users'), where('familyGroupId', '==', familyGroup))
    return onSnapshot(q, (snap) => {
      const merged = {}
      const members = []
      snap.forEach((d) => {
        const data = d.data()
        members.push({
          uid: d.id,
          displayName: data.displayName,
          photoURL: data.photoURL,
          email: data.email,
        })
        if (data.plans) {
          Object.entries(data.plans).forEach(([spotId, plan]) => {
            if (!merged[spotId]) {
              merged[spotId] = { ...plan, _owner: data.displayName, _ownerUid: d.id }
            }
          })
        }
      })
      setFamilyPlans(merged)
      setFamilyMembers(members)
    })
  }, [isOnline, familyGroup])

  const toggleStar = useCallback((spotId) => {
    setStarred((prev) => {
      const next = prev.includes(spotId) ? prev.filter((id) => id !== spotId) : [...prev, spotId]
      saveLocal('starredSpots', next)
      if (isOnline) {
        const userRef = doc(db, 'users', user.uid)
        if (next.includes(spotId)) {
          safeUpdate(userRef, { starred: arrayUnion(spotId) })
        } else {
          // arrayRemove doesn't work with merge setDoc, use updateDoc with catch
          updateDoc(userRef, { starred: arrayRemove(spotId) }).catch(() => {})
        }
      }
      return next
    })
  }, [isOnline, user?.uid])

  const savePlan = useCallback((spotId, plan) => {
    setSavedPlans((prev) => {
      const next = { ...prev, [spotId]: plan }
      saveLocal('savedPlans', next)
      if (isOnline) {
        const userRef = doc(db, 'users', user.uid)
        // updateDoc interprets dot-notation as nested paths (plans -> spotId)
        updateDoc(userRef, { [`plans.${spotId}`]: plan }).catch((err) => {
          // If doc doesn't exist yet (race with first login), fall back to setDoc merge
          // setDoc doesn't interpret dots as paths, so pass nested object
          console.warn('updateDoc failed, trying setDoc merge:', err.code)
          return setDoc(userRef, { plans: { [spotId]: plan } }, { merge: true })
        }).catch((err) => {
          console.error('Save plan failed:', err)
        })
      }
      return next
    })
  }, [isOnline, user?.uid])

  const deletePlan = useCallback((spotId) => {
    setSavedPlans((prev) => {
      const next = { ...prev }
      delete next[spotId]
      saveLocal('savedPlans', next)
      if (isOnline) {
        updateDoc(doc(db, 'users', user.uid), { [`plans.${spotId}`]: deleteField() }).catch(() => {})
      }
      return next
    })
  }, [isOnline, user?.uid])

  const saveMemory = useCallback((memory) => {
    setMemories((prev) => {
      const next = { ...prev, [memory.id]: memory }
      saveLocal('stardustMemories', next)
      if (isOnline) {
        const userRef = doc(db, 'users', user.uid)
        updateDoc(userRef, { [`memories.${memory.id}`]: memory }).catch((err) => {
          console.warn('updateDoc failed, trying setDoc merge:', err.code)
          return setDoc(userRef, { memories: { [memory.id]: memory } }, { merge: true })
        }).catch((err) => {
          console.error('Save memory failed:', err)
        })
      }
      return next
    })
  }, [isOnline, user?.uid])

  // Family group management
  const createFamilyGroup = useCallback(async () => {
    if (!isOnline) return null
    try {
      const groupId = `family_${user.uid}_${Date.now()}`
      // Create the group doc
      await setDoc(doc(db, 'groups', groupId), {
        name: `${user.displayName}'s Family`,
        createdBy: user.uid,
        createdAt: new Date().toISOString(),
      })
      // Update user doc (merge to handle missing doc)
      await setDoc(doc(db, 'users', user.uid), { familyGroupId: groupId }, { merge: true })
      setFamilyGroup(groupId)
      return groupId
    } catch (err) {
      console.error('Failed to create family group:', err)
      return null
    }
  }, [isOnline, user?.uid, user?.displayName])

  const joinFamilyGroup = useCallback(async (groupId) => {
    if (!isOnline) return false
    try {
      await setDoc(doc(db, 'users', user.uid), { familyGroupId: groupId }, { merge: true })
      setFamilyGroup(groupId)
      return true
    } catch (err) {
      console.error('Failed to join family group:', err)
      return false
    }
  }, [isOnline, user?.uid])

  const leaveFamilyGroup = useCallback(async () => {
    if (!isOnline) return
    try {
      await setDoc(doc(db, 'users', user.uid), { familyGroupId: null }, { merge: true })
      setFamilyGroup(null)
    } catch (err) {
      console.error('Failed to leave family group:', err)
    }
  }, [isOnline, user?.uid])

  return {
    starred,
    savedPlans,
    toggleStar,
    savePlan,
    deletePlan,
    memories,
    saveMemory,
    familyGroup,
    familyPlans,
    familyMembers,
    createFamilyGroup,
    joinFamilyGroup,
    leaveFamilyGroup,
  }
}
