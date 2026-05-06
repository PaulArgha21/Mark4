'use client'
import { useState, useEffect, useCallback, useSyncExternalStore } from 'react'

const CLOTHING_KEY = 'aprdite-size-clothing'
const SHOE_KEY = 'aprdite-size-shoe'

// External store for cross-component reactivity
let listeners: (() => void)[] = []
function emitChange() { listeners.forEach(l => l()) }
function subscribe(listener: () => void) {
  listeners = [...listeners, listener]
  return () => { listeners = listeners.filter(l => l !== listener) }
}

function getClothingSize() {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem(CLOTHING_KEY) || ''
}

function getShoeSize() {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem(SHOE_KEY) || ''
}

export function useSizePreference() {
  const clothingSize = useSyncExternalStore(subscribe, getClothingSize, () => '')
  const shoeSize = useSyncExternalStore(subscribe, getShoeSize, () => '')

  const setClothingSize = useCallback((size: string) => {
    if (size) localStorage.setItem(CLOTHING_KEY, size)
    else localStorage.removeItem(CLOTHING_KEY)
    emitChange()
  }, [])

  const setShoeSize = useCallback((size: string) => {
    if (size) localStorage.setItem(SHOE_KEY, size)
    else localStorage.removeItem(SHOE_KEY)
    emitChange()
  }, [])

  const hasPreference = Boolean(clothingSize || shoeSize)

  // Returns the preferred size string for API calls (e.g. "M" or "9")
  const preferredSize = clothingSize || shoeSize || ''

  return { clothingSize, shoeSize, setClothingSize, setShoeSize, hasPreference, preferredSize }
}
