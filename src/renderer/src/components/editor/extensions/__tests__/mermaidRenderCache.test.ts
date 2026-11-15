import { describe, expect, it } from 'vitest'
import { cacheMermaid, getCachedMermaid } from '../mermaidRenderCache'

describe('cache de diagramas Mermaid', () => {
  it('reutiliza a renderização sem compartilhar identificadores entre diagramas', () => {
    cacheMermaid('light\ngraph TD; A-->B', '<svg id="original"><use href="#original"/></svg>', 'original')
    expect(getCachedMermaid('light\ngraph TD; A-->B', 'copia-1'))
      .toBe('<svg id="copia-1"><use href="#copia-1"/></svg>')
    expect(getCachedMermaid('light\ngraph TD; A-->B', 'copia-2'))
      .toContain('id="copia-2"')
    expect(getCachedMermaid('dark\ngraph TD; A-->B', 'copia-3')).toBeNull()
  })
})
