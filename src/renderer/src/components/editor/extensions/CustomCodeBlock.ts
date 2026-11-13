import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { common, createLowlight } from 'lowlight'
import { CodeBlockComponent } from './CodeBlockComponent'

export const lowlight = createLowlight(common)
// Registra 'mermaid' no lowlight para evitar warnings e habilitar suporte completo
lowlight.registerAlias({ markdown: ['mermaid'] })

export const CustomCodeBlock = CodeBlockLowlight.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      spellcheck: {
        default: 'false',
        rendered: true
      },
      viewMode: {
        default: null,
        rendered: false
      }
    }
  },
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockComponent, {
      update: ({ oldNode, newNode, updateProps }) => {
        if (oldNode.type !== newNode.type) {
          return false
        }
        updateProps()
        return true
      }
    })
  }
})
