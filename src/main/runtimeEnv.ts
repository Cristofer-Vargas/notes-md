import { join } from 'path'
import type { AppEnvironment } from '../shared/appUpdate'

export interface RuntimeEnvInputs {
  isPackaged: boolean
  appDataPath: string
  documentsPath: string
  cwdPath: string
}

export interface RuntimeConfig {
  environment: AppEnvironment
  isPackaged: boolean
  appName: string
  appUserModelId: string
  userDataPath: string
  defaultVaultDir: string
  windowTitleSuffix: string
}

/**
 * Isolates userData, taskbar AppUserModelId, window titles, and default vault
 * between the packaged stable executable and local development instances so both
 * can run simultaneously without profile locks or settings collisions.
 */
export function resolveRuntimeConfig(inputs: RuntimeEnvInputs): RuntimeConfig {
  const { isPackaged, appDataPath, documentsPath, cwdPath } = inputs

  if (isPackaged) {
    return {
      environment: 'stable',
      isPackaged: true,
      appName: 'Notes-MD',
      appUserModelId: 'com.cristofer.notesmd',
      userDataPath: join(appDataPath, 'Notes-MD'),
      defaultVaultDir: join(documentsPath, 'Notes-MD', 'Vault-Notas'),
      windowTitleSuffix: ''
    }
  }

  return {
    environment: 'dev',
    isPackaged: false,
    appName: 'Notes-MD Dev',
    appUserModelId: 'com.cristofer.notesmd.dev',
    userDataPath: join(appDataPath, 'Notes-MD-Dev'),
    defaultVaultDir: join(cwdPath, 'Vault-Notas'),
    windowTitleSuffix: ' [DEV]'
  }
}

/**
 * Resolves the application icon path across both packaged extraResources
 * and local development directories.
 */
export function resolveAppIconPath(options: {
  isPackaged: boolean
  mainDir: string
  resourcesPath?: string
  fileExists: (targetPath: string) => boolean
}): string | undefined {
  const { isPackaged, mainDir, resourcesPath, fileExists } = options
  const candidates: string[] = []

  if (isPackaged && resourcesPath) {
    candidates.push(
      join(resourcesPath, 'app-resources', 'icon.png'),
      join(resourcesPath, 'app-resources', 'icon.ico'),
      join(resourcesPath, 'app-resources', 'logo-transparente.png')
    )
  }

  candidates.push(
    join(mainDir, '../../resources/icon.png'),
    join(mainDir, '../../resources/icon.ico'),
    join(mainDir, '../../resources/logo-transparente.png')
  )

  return candidates.find((candidate) => fileExists(candidate))
}

/**
 * Ensures development window titles preserve an explicit [DEV] marker even
 * after the renderer document updates its <title>.
 */
export function formatWindowTitle(baseTitle: string, suffix: string): string {
  if (!suffix) return baseTitle
  return baseTitle.endsWith(suffix) ? baseTitle : `${baseTitle}${suffix}`
}
