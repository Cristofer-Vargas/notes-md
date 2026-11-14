import React, { useEffect } from 'react'
import { PomodoroPanel } from '../components/pomodoro/PomodoroPanel'
import { applyThemeToDocument, loadSettings } from '../services/settingsManager'
import type { AppSettings } from '../types/app'

export function PomodoroWindow(): React.ReactElement {
  useEffect(() => {
    document.title = 'Pomodoro — Notes MD'
    applyThemeToDocument(loadSettings())
    return window.electronAPI.onSettingsChanged((settings) => applyThemeToDocument(settings as AppSettings))
  }, [])
  return <div className="h-screen w-screen overflow-hidden"><PomodoroPanel floating /></div>
}
