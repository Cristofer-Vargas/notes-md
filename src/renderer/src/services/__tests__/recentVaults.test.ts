import { describe, expect, it } from 'vitest'
import { addRecentVault, removeRecentVault } from '../recentVaults'

const vault = (path: string, lastOpened = 1) => ({ path, name: path, lastOpened })

describe('cofres recentes', () => {
  it('mantém os cinco mais recentes e move um cofre reaberto para o início', () => {
    const initial = ['A', 'B', 'C', 'D', 'E'].map((path) => vault(path))
    expect(addRecentVault(initial, vault('F', 2)).map((item) => item.path)).toEqual(['F', 'A', 'B', 'C', 'D'])
    expect(addRecentVault(initial, vault('b', 2)).map((item) => item.path)).toEqual(['b', 'A', 'C', 'D', 'E'])
  })

  it('remove somente o cofre escolhido, sem diferenciar maiúsculas', () => {
    expect(removeRecentVault([vault('A'), vault('B')], 'a')).toEqual([vault('B')])
  })
})
