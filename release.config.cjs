module.exports = {
  branches: ['main'],
  plugins: [
    [
      '@semantic-release/commit-analyzer',
      {
        preset: 'angular',
        releaseRules: [
          { breaking: true, release: 'major' },
          { revert: true, release: 'patch' },
          { type: 'feat', release: 'minor' },
          { type: 'fix', release: 'patch' },
          { type: 'perf', release: 'patch' }
        ]
      }
    ],
    [
      '@semantic-release/release-notes-generator',
      {
        preset: 'angular',
        writerOpts: {
          transform: (commit) => {
            const c = { ...commit }
            if (c.type === 'feat') c.type = 'Novos Recursos'
            else if (c.type === 'fix') c.type = 'Correções'
            else if (c.type === 'perf') c.type = 'Desempenho'
            else if (c.type === 'revert') c.type = 'Reversões'
            else if (c.type === 'docs') c.type = 'Documentação'
            else return null
            return c
          }
        }
      }
    ],
    [
      '@semantic-release/changelog',
      {
        changelogFile: 'CHANGELOG.md'
      }
    ],
    [
      '@semantic-release/npm',
      {
        npmPublish: false
      }
    ],
    [
      '@semantic-release/exec',
      {
        prepareCmd: 'npm run dist:win:ci'
      }
    ],
    [
      '@semantic-release/git',
      {
        assets: ['package.json', 'package-lock.json', 'CHANGELOG.md'],
        message: 'chore(release): publicar v${nextRelease.version} [skip ci]\n\n${nextRelease.notes}'
      }
    ],
    [
      '@semantic-release/github',
      {
        assets: [
          { path: 'release/latest.yml', label: 'Manifesto de atualização (latest.yml)' },
          { path: 'release/Notes-MD-Setup-*.exe', label: 'Instalador Windows (NSIS)' },
          { path: 'release/Notes-MD-Setup-*.exe.blockmap', label: 'Mapa diferencial (.blockmap)' },
          { path: 'release/Notes-MD-*-portable.exe', label: 'Executável Portátil (Windows)' }
        ]
      }
    ]
  ]
}
