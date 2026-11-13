import { describe, it, expect } from 'vitest'
import { join } from 'path'
import { formatWindowTitle, resolveAppIconPath, resolveRuntimeConfig } from '../runtimeEnv'

describe('runtimeEnv — Isolamento entre Versão Estável e Dev', () => {
  const baseInputs = {
    appDataPath: 'C:\\Users\\tester\\AppData\\Roaming',
    documentsPath: 'C:\\Users\\tester\\Documents',
    cwdPath: 'C:\\Projetos\\Notes-MD'
  }

  it('isola userData, AppUserModelId e Vault padrão entre executável estável e dev', () => {
    const stable = resolveRuntimeConfig({ ...baseInputs, isPackaged: true })
    const dev = resolveRuntimeConfig({ ...baseInputs, isPackaged: false })

    expect(stable.environment).toBe('stable')
    expect(dev.environment).toBe('dev')
    expect(stable.appName).toBe('Notes MD')
    expect(dev.appName).toBe('Notes MD Dev')
    expect(stable.userDataPath).not.toBe(dev.userDataPath)
    expect(stable.userDataPath).toBe(join(baseInputs.appDataPath, 'Notes-MD'))
    expect(dev.userDataPath).toBe(join(baseInputs.appDataPath, 'Notes-MD-Dev'))

    expect(stable.appUserModelId).toBe('com.cristofer.notesmd')
    expect(dev.appUserModelId).toBe('com.cristofer.notesmd.dev')

    expect(stable.defaultVaultDir).toBe(join(baseInputs.documentsPath, 'Notes-MD', 'Vault-Notas'))
    expect(dev.defaultVaultDir).toBe(join(baseInputs.cwdPath, 'Vault-Notas'))

    expect(stable.windowTitleSuffix).toBe('')
    expect(dev.windowTitleSuffix).toBe(' [DEV]')
  })

  it('resolve ícone a partir de app-resources quando empacotado', () => {
    const expectedPackagedIcon = join('C:\\App\\resources', 'app-resources', 'icon.png')
    const found = resolveAppIconPath({
      isPackaged: true,
      mainDir: 'C:\\App\\resources\\app.asar\\out\\main',
      resourcesPath: 'C:\\App\\resources',
      fileExists: () => true
    })

    expect(found).toBe(expectedPackagedIcon)
  })

  it('resolve ícone local em desenvolvimento e evita duplicar sufixo no título', () => {
    const devIcon = join('C:\\Repo\\out\\main', '../../resources/icon.png')
    const found = resolveAppIconPath({
      isPackaged: false,
      mainDir: 'C:\\Repo\\out\\main',
      fileExists: () => true
    })

    expect(found).toBe(devIcon)
    expect(formatWindowTitle('Notes MD - Editor Markdown', '')).toBe('Notes MD - Editor Markdown')
    expect(formatWindowTitle('Notes MD - Editor Markdown', ' [DEV]')).toBe('Notes MD - Editor Markdown [DEV]')
    expect(formatWindowTitle('Notes MD - Editor Markdown [DEV]', ' [DEV]')).toBe('Notes MD - Editor Markdown [DEV]')
  })
})
