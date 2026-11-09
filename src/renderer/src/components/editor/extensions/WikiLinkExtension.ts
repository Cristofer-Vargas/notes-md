import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    wikiLink: {
      insertWikiLink: (attrs: { target: string; alias?: string }) => ReturnType
    }
  }
}

export const wikiLinkPluginKey = new PluginKey('wikiLinkLivePreview')

const WIKILINK_SCAN_REGEX = /\[\[([^\]|#\n]+)(?:#([^\]|\n]+))?(?:\|([^\]\n]*))?\]\]/g

function buildWikiLinkDecorations(doc: any, selection: any): DecorationSet {
  const decorations: Decoration[] = []
  const selFrom = selection.from
  const selTo = selection.to

  doc.descendants((node: any, pos: number) => {
    if (node.type.name === 'codeBlock') {
      return false
    }

    if (!node.isText || !node.text) {
      return true
    }

    // Do not decorate inside inline code marks
    if (node.marks && node.marks.some((m: any) => m.type.name === 'code')) {
      return true
    }

    const text: string = node.text
    const regex = new RegExp(WIKILINK_SCAN_REGEX.source, 'g')
    let match: RegExpExecArray | null

    while ((match = regex.exec(text)) !== null) {
      const fullMatch = match[0]
      const rawTarget = (match[1] || '').trim()
      if (!rawTarget) continue

      const hasPipe = fullMatch.includes('|')
      const rawAlias = match[3] !== undefined ? match[3].trim() : ''

      const matchFrom = pos + match.index
      const matchTo = matchFrom + fullMatch.length

      // Obsidian Live Preview behavior:
      // If the cursor or selection is inside or touching [matchFrom, matchTo],
      // reveal the raw [[Target|Alias]] syntax so the user can edit it directly in the text!
      const isCursorInside = selFrom <= matchTo && selTo >= matchFrom

      if (isCursorInside) {
        decorations.push(
          Decoration.inline(matchFrom, matchTo, {
            class: 'wiki-link-editing',
            'data-wiki-link': rawTarget,
            'data-wiki-alias': rawAlias
          })
        )
      } else {
        if (hasPipe && rawAlias.length > 0) {
          const pipeIndex = fullMatch.indexOf('|')
          const prefixEnd = matchFrom + pipeIndex + 1
          const aliasEnd = matchTo - 2

          // Hide "[[Target|"
          decorations.push(
            Decoration.inline(matchFrom, prefixEnd, {
              class: 'wiki-link-syntax-hidden'
            })
          )

          // Style visible "Alias"
          decorations.push(
            Decoration.inline(prefixEnd, aliasEnd, {
              class: 'wiki-link-node',
              'data-wiki-link': rawTarget,
              'data-wiki-alias': rawAlias,
              title: `Link para "${rawTarget}" (Clique no texto para editar • Clique em ↗ ou Ctrl+Clique para abrir)`
            })
          )

          // Hide "]]"
          decorations.push(
            Decoration.inline(aliasEnd, matchTo, {
              class: 'wiki-link-syntax-hidden'
            })
          )
        } else {
          const contentStart = matchFrom + 2
          const contentEnd = matchTo - 2

          // Hide "[["
          decorations.push(
            Decoration.inline(matchFrom, contentStart, {
              class: 'wiki-link-syntax-hidden'
            })
          )

          // Style visible "Target"
          decorations.push(
            Decoration.inline(contentStart, contentEnd, {
              class: 'wiki-link-node',
              'data-wiki-link': rawTarget,
              title: `Nota "${rawTarget}" (Clique no texto para editar • Clique em ↗ ou Ctrl+Clique para abrir)`
            })
          )

          // Hide "]]"
          decorations.push(
            Decoration.inline(contentEnd, matchTo, {
              class: 'wiki-link-syntax-hidden'
            })
          )
        }

        // Add a small clickable open-note button widget at the end of the pill
        decorations.push(
          Decoration.widget(
            matchTo,
            () => {
              const btn = document.createElement('span')
              btn.className = 'wiki-link-open-trigger'
              btn.setAttribute('data-wiki-open', rawTarget)
              btn.setAttribute('title', `Abrir nota: ${rawTarget}`)
              btn.textContent = '↗'
              return btn
            },
            { side: -1 }
          )
        )
      }
    }

    return true
  })

  return DecorationSet.create(doc, decorations)
}

export const WikiLinkExtension = Extension.create({
  name: 'wikiLink',

  addCommands() {
    return {
      insertWikiLink:
        (attrs) =>
        ({ commands }) => {
          const cleanTarget = (attrs.target || '').replace(/^\[+|\]+$/g, '').trim()
          const cleanAlias = (attrs.alias || '').replace(/^\[+|\]+$/g, '').trim()
          if (!cleanTarget) return false

          const wikiSyntax =
            cleanAlias && cleanAlias !== cleanTarget
              ? `[[${cleanTarget}|${cleanAlias}]] `
              : `[[${cleanTarget}]] `

          return commands.insertContent(wikiSyntax)
        }
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: wikiLinkPluginKey,
        state: {
          init(_, state) {
            return buildWikiLinkDecorations(state.doc, state.selection)
          },
          apply(tr, oldSet, _oldState, newState) {
            if (tr.docChanged || tr.selectionSet) {
              return buildWikiLinkDecorations(newState.doc, newState.selection)
            }
            return oldSet
          }
        },
        props: {
          decorations(state) {
            return this.getState(state)
          }
        }
      })
    ]
  }
})
