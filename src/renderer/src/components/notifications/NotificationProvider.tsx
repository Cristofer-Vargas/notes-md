import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { Bell, X } from 'lucide-react'
import { IconButton } from '../ui'
import { pomodoroRewardNotification, type NotificationContent } from './pomodoroNotifications'

type Notification = NotificationContent & { id: number; duration: number }
type Notify = (notification: NotificationContent & { duration?: number }) => void
const NotificationContext = createContext<Notify>(() => {})

/** Displays a transient, dismissible notification in the current app window. */
export function useNotification(): Notify { return useContext(NotificationContext) }

function NotificationItem({ item, dismiss }: { item: Notification; dismiss: (id: number) => void }): React.ReactElement {
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    if (paused || item.duration <= 0) return
    const timer = window.setTimeout(() => dismiss(item.id), item.duration)
    return () => window.clearTimeout(timer)
  }, [item.id, item.duration, paused, dismiss])
  return <div role="status" aria-live="polite" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false) }} className="pointer-events-auto flex w-full gap-3 border border-surface-border bg-surface-secondary p-3 text-content-primary shadow-xl">
    <Bell aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
    <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{item.title}</p><p className="mt-1 break-words text-xs leading-relaxed text-content-secondary">{item.message}</p></div>
    <IconButton size="xs" tooltip="Dispensar notificação" icon={<X className="h-3.5 w-3.5" />} onClick={() => dismiss(item.id)} />
  </div>
}

export function NotificationProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [items, setItems] = useState<Notification[]>([])
  const nextId = useRef(0)
  const notify = useCallback<Notify>((notification) => {
    const item = { ...notification, id: ++nextId.current, duration: notification.duration ?? 8000 }
    setItems((current) => [item, ...current].slice(0, 5))
  }, [])
  const dismiss = useCallback((id: number) => setItems((current) => current.filter((item) => item.id !== id)), [])
  useEffect(() => window.electronAPI.onPomodoroReward((reward, level) => {
    const notification = pomodoroRewardNotification(reward, level)
    if (notification) notify(notification)
  }), [notify])
  return <NotificationContext.Provider value={notify}>{children}<div aria-label="Notificações" className="pointer-events-none fixed bottom-4 right-4 z-[9999] flex max-h-[calc(100vh-2rem)] w-[min(24rem,calc(100vw-2rem))] flex-col-reverse gap-2 overflow-y-auto">{items.map((item) => <NotificationItem key={item.id} item={item} dismiss={dismiss} />)}</div></NotificationContext.Provider>
}
