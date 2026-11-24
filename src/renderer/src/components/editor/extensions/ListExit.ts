import { Extension } from '@tiptap/core'
import { liftListItem } from '@tiptap/pm/schema-list'

export const ListExit = Extension.create({
  name: 'listExit',
  priority: 110,

  addKeyboardShortcuts() {
    return {
      Enter: () => {
        const { state, view } = this.editor
        const { selection } = state
        const { $from } = selection

        if (
          !selection.empty ||
          $from.depth < 2 ||
          !$from.parent.isTextblock ||
          $from.parent.content.size > 0
        ) return false

        const listItem = $from.node(-1)
        if (!['listItem', 'taskItem'].includes(listItem.type.name) || listItem.childCount !== 1) {
          return false
        }

        return liftListItem(listItem.type)(state, (transaction) => view.dispatch(transaction))
      }
    }
  }
})
