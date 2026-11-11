module.exports = {
  branches: [
    'development',
    {
      name: 'main',
      prerelease: 'alpha',
      channel: false
    }
  ],
  plugins: [
    [
      '@semantic-release/commit-analyzer',
      {
        preset: 'conventionalcommits',
        releaseRules: [
          { breaking: true, release: 'minor' },
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
        preset: 'conventionalcommits',
        presetConfig: {
          types: [
            { type: 'feat', section: 'Novos Recursos' },
            { type: 'fix', section: 'Correcoes' },
            { type: 'perf', section: 'Desempenho' },
            { type: 'revert', section: 'Reversoes' },
            { type: 'docs', section: 'Documentacao', hidden: false },
            { type: 'style', section: 'Estilo e UI', hidden: true },
            { type: 'refactor', section: 'Refatoracoes', hidden: true },
            { type: 'test', section: 'Testes', hidden: true },
            { type: 'build', section: 'Build e Empacotamento', hidden: true },
            { type: 'ci', section: 'CI/CD', hidden: true },
            { type: 'chore', section: 'Manutencao', hidden: true }
          ]
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
