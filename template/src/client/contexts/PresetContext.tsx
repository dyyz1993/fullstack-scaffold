/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext } from 'react'

export const PresetContext = createContext<string>('todo')

export function usePreset(): string {
  return useContext(PresetContext)
}

export const PresetProvider = PresetContext.Provider
