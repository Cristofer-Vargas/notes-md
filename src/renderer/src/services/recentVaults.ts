import type { RecentVault } from '../types/app'

export const MAX_RECENT_VAULTS = 5

export function addRecentVault(vaults: RecentVault[], vault: RecentVault): RecentVault[] {
  return [vault, ...vaults.filter((item) => item.path.toLowerCase() !== vault.path.toLowerCase())].slice(0, MAX_RECENT_VAULTS)
}

export function removeRecentVault(vaults: RecentVault[], path: string): RecentVault[] {
  return vaults.filter((item) => item.path.toLowerCase() !== path.toLowerCase())
}
