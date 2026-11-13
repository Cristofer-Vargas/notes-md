import React, { useState, useEffect, useCallback } from 'react'
import type { AppSettings } from '../types/app'
import {
  loadSettings,
  saveSettings,
  applyThemeToDocument
} from '../services/settingsManager'
import { SettingsModal } from '../components/modals/SettingsModal'

export const SettingsWindow: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings())

  useEffect(() => {
    document.title = 'Configurações — Notes MD'
  }, [])

  // Apply theme & sync to HTML root
  useEffect(() => {
    applyThemeToDocument(settings)
  }, [settings])

  // Sync spellchecker with native Electron backend
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.setSpellCheckerEnabled(settings.spellcheck).catch(() => {})
      if (settings.spellcheckLanguages && settings.spellcheckLanguages.length > 0) {
        window.electronAPI.setSpellCheckerLanguages(settings.spellcheckLanguages).catch(() => {})
      }
      if (settings.ignoredWords && settings.ignoredWords.length > 0) {
        window.electronAPI.syncIgnoredWords(settings.ignoredWords).catch(() => {})
      }
      if (settings.discordPresence) {
        window.electronAPI.configureDiscordPresence(settings.discordPresence).catch(() => {})
      }
    }
  }, [settings.spellcheck, settings.spellcheckLanguages, settings.ignoredWords, settings.discordPresence])

  // Listen for broadcasted settings updates from other windows
  useEffect(() => {
    if (!window.electronAPI?.onSettingsChanged) return
    const unsubscribe = window.electronAPI.onSettingsChanged((updated: unknown) => {
      if (updated && typeof updated === 'object') {
        setSettings((prev) => ({ ...prev, ...(updated as Partial<AppSettings>) }))
      }
    })
    return () => unsubscribe()
  }, [])

  const handleUpdateSettings = useCallback((partial: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial }
      saveSettings(next)
      applyThemeToDocument(next)
      window.electronAPI?.broadcastSettings(next).catch(() => {})
      return next
    })
  }, [])

  const handleClose = useCallback(() => {
    if (window.electronAPI?.closeCurrentWindow) {
      window.electronAPI.closeCurrentWindow()
    } else {
      window.close()
    }
  }, [])

  // Close with Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        handleClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleClose])

  return (
    <div className="w-screen h-screen overflow-hidden bg-surface-bg text-content-primary">
      <SettingsModal
        isOpen={true}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onClose={handleClose}
        isStandalone={true}
      />
    </div>
  )
}
