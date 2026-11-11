import Highlight from '@tiptap/extension-highlight'

/**
 * Custom TipTap Highlight extension that omits inline `color: inherit`
 * so pastel highlight marks keep readable dark foreground contrast across themes.
 */
export const CustomHighlight = Highlight.extend({
  addAttributes() {
    if (!this.options.multicolor) {
      return {}
    }

    return {
      color: {
        default: null,
        parseHTML: (element: HTMLElement) =>
          element.getAttribute('data-color') || element.style.backgroundColor,
        renderHTML: (attributes: Record<string, string | null | undefined>) => {
          if (!attributes.color) {
            return {}
          }

          return {
            'data-color': attributes.color,
            style: `background-color: ${attributes.color}`
          }
        }
      }
    }
  }
})
