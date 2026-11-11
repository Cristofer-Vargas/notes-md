import { describe, it, expect } from 'vitest'
import { CustomHighlight } from '../CustomHighlight'

describe('CustomHighlight', () => {
  it('omits inline color: inherit so mark foreground contrast remains legible in dark mode', () => {
    const configured = CustomHighlight.configure({ multicolor: true })
    const attrs = configured.config.addAttributes?.call(configured as never) as Record<
      string,
      {
        parseHTML: (el: HTMLElement) => string | null
        renderHTML: (attrs: Record<string, string | null | undefined>) => Record<string, string>
      }
    >

    expect(attrs?.color).toBeDefined()
    const rendered = attrs.color.renderHTML({ color: '#fef08a' })
    expect(rendered).toEqual({
      'data-color': '#fef08a',
      style: 'background-color: #fef08a'
    })
    expect(rendered.style).not.toContain('color: inherit')

    expect(attrs.color.renderHTML({ color: null })).toEqual({})

    const mockEl = {
      getAttribute: (name: string) => (name === 'data-color' ? '#bbf7d0' : null),
      style: { backgroundColor: '' }
    } as unknown as HTMLElement
    expect(attrs.color.parseHTML(mockEl)).toBe('#bbf7d0')
  })
})
