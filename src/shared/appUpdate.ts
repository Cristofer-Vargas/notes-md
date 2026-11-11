export type AppEnvironment = 'stable' | 'dev'

export interface AppRuntimeInfo {
  version: string
  environment: AppEnvironment
  isPackaged: boolean
  userDataPath: string
  defaultVaultDir: string
}

export type AppUpdatePhase =
  | 'idle'
  | 'unsupported-dev'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'error'

export interface AppUpdateState {
  phase: AppUpdatePhase
  currentVersion: string
  availableVersion?: string
  releaseDate?: string
  downloadPercent?: number
  message: string
  checkedAt?: number
}
