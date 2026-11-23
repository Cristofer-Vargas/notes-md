import { describe, expect, it, vi } from 'vitest'
import type { Editor } from '@tiptap/react'
import { recoverEditorFocusAfterClick } from '../editorFocus'

function fixture(options: { hasFocus?: boolean; selectionInside?: boolean; active?: 'body' | 'previous' | 'other' | 'editor'; hit?: number | null; editable?: boolean } = {}) {
  const body = {} as Element
  const previous = {} as Element
  const other = {} as Element
  const inside = {} as Node
  const root = { isConnected: true, contains: (node: unknown) => node === root || node === inside } as unknown as HTMLElement
  const focus = vi.fn()
  const setTextSelection = vi.fn()
  const editor = {
    isDestroyed: false,
    isEditable: options.editable !== false,
    view: { dom: root, hasFocus: () => Boolean(options.hasFocus), posAtCoords: () => options.hit === null ? null : { pos: options.hit ?? 7 }, focus },
    commands: { setTextSelection }
  } as unknown as Editor
  const active = options.active === 'previous' ? previous : options.active === 'other' ? other : options.active === 'editor' ? root : body
  const doc = { body, activeElement: active, getSelection: () => ({ anchorNode: options.selectionInside ? inside : other }) } as unknown as Document
  return { editor, previous, doc, focus, setTextSelection }
}

describe('retorno do foco ao editor principal', () => {
  it('restaura o cursor na posição clicada quando o foco permanece na observação', () => {
    const test = fixture({ active: 'previous', hit: 12 })
    expect(recoverEditorFocusAfterClick(test.editor, { left: 20, top: 30 }, test.previous, test.doc)).toBe(true)
    expect(test.setTextSelection).toHaveBeenCalledWith(12)
    expect(test.focus).toHaveBeenCalledOnce()
  })
  it('mantém a seleção já feita pelo clique nativo', () => {
    const test = fixture({ active: 'editor', hasFocus: true, selectionInside: true })
    expect(recoverEditorFocusAfterClick(test.editor, { left: 20, top: 30 }, test.previous, test.doc)).toBe(false)
    expect(test.setTextSelection).not.toHaveBeenCalled()
  })
  it('recupera a seleção quando o editor está focado, mas o cursor está fora dele', () => {
    const test = fixture({ active: 'editor', hasFocus: true, selectionInside: false })
    expect(recoverEditorFocusAfterClick(test.editor, { left: 20, top: 30 }, test.previous, test.doc)).toBe(true)
    expect(test.focus).toHaveBeenCalledOnce()
  })
  it('não rouba o foco de outro controle ou de um editor desabilitado', () => {
    for (const options of [{ active: 'other' as const }, { editable: false }]) {
      const test = fixture(options)
      expect(recoverEditorFocusAfterClick(test.editor, { left: 20, top: 30 }, test.previous, test.doc)).toBe(false)
      expect(test.focus).not.toHaveBeenCalled()
    }
  })
  it('preserva a seleção anterior se não for possível localizar a posição', () => {
    const test = fixture({ hit: null })
    expect(recoverEditorFocusAfterClick(test.editor, { left: 20, top: 30 }, test.previous, test.doc)).toBe(true)
    expect(test.setTextSelection).not.toHaveBeenCalled()
    expect(test.focus).toHaveBeenCalledOnce()
  })
})
