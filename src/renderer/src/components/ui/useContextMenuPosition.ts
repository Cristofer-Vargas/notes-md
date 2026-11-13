import { useLayoutEffect, type RefObject } from 'react'

interface MenuAnchor {
  x: number
  y: number
  trigger?: 'contextmenu' | 'selection'
  selectionBottom?: number
}

const EDGE = 8

/** Positions the menu using its rendered size, which varies with its contents. */
export function useContextMenuPosition(
  menuRef: RefObject<HTMLDivElement>,
  anchor: MenuAnchor | null,
  submenu: string | null = null
): void {
  useLayoutEffect(() => {
    const menu = menuRef.current
    if (!menu || !anchor) return

    const update = (): void => {
      const width = window.innerWidth
      const height = window.innerHeight
      menu.style.maxWidth = `${Math.max(0, width - EDGE * 2)}px`
      menu.style.maxHeight = `${Math.max(0, height - EDGE * 2)}px`
      const rect = menu.getBoundingClientRect()
      const x = Number.isFinite(anchor.x) ? anchor.x : EDGE
      const y = Number.isFinite(anchor.y) ? anchor.y : EDGE
      const top = anchor.trigger === 'selection'
        ? (y - rect.height - 10 >= EDGE ? y - rect.height - 10 : (anchor.selectionBottom ?? y + 24) + 10)
        : y
      menu.style.left = `${Math.max(EDGE, Math.min(x, width - rect.width - EDGE))}px`
      menu.style.top = `${Math.max(EDGE, Math.min(top, height - rect.height - EDGE))}px`

      const panel = menu.querySelector<HTMLElement>('[data-submenu-panel]')
      const trigger = panel?.parentElement?.querySelector<HTMLElement>('[data-submenu-trigger]')
      if (!panel || !trigger) return
      panel.style.position = 'fixed'
      panel.style.maxWidth = `${Math.max(0, width - EDGE * 2)}px`
      panel.style.maxHeight = `${Math.max(0, height - EDGE * 2)}px`
      panel.style.overflowY = 'auto'
      panel.style.margin = '0'
      panel.style.right = 'auto'
      const triggerRect = trigger.getBoundingClientRect()
      const panelRect = panel.getBoundingClientRect()
      const right = triggerRect.right
      const left = right + panelRect.width <= width - EDGE ? right : triggerRect.left - panelRect.width
      panel.style.left = `${Math.max(EDGE, Math.min(left, width - panelRect.width - EDGE))}px`
      panel.style.top = `${Math.max(EDGE, Math.min(triggerRect.top, height - panelRect.height - EDGE))}px`
    }

    update()
    const observer = new ResizeObserver(update)
    observer.observe(menu)
    const panel = menu.querySelector<HTMLElement>('[data-submenu-panel]')
    if (panel) observer.observe(panel)
    window.addEventListener('resize', update)
    menu.addEventListener('scroll', update)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', update)
      menu.removeEventListener('scroll', update)
    }
  }, [menuRef, anchor, submenu])
}
