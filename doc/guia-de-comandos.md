# 🛠️ Guia de Comandos e Versionamento do Projeto

Este guia prático serve como referência rápida para qualquer pessoa que queira rodar, testar, alterar ou contribuir com o código do **Notes-MD**.

---

## 💻 1. Comandos Principais no Terminal

Todos os comandos devem ser executados na raiz da pasta do projeto através do seu terminal favorito (PowerShell, Bash, Git Bash ou terminal do VS Code).

| Comando | O que ele faz? | Quando usar? |
| :--- | :--- | :--- |
| `npm run dev` | Abre o Notes-MD em **modo de desenvolvimento** com Hot Reload e perfil/cofre isolados. | Sempre que você estiver alterando o código e quiser ver as mudanças imediatamente na tela. |
| `npm start` | Executa a pré-visualização da build compilada com `electron-vite preview`. | Para testar localmente os arquivos já compilados em `out/`. |
| `npm run typecheck` | Executa `typecheck:node` e `typecheck:web` via TypeScript para validar Main, Preload e Renderer. | Antes de commitar alterações ou para validar integridade estática dos tipos. |
| `npm test` | Executa a suíte de **testes unitários automatizados** com o Vitest. | Antes de salvar ou commitar qualquer alteração para ter certeza de que nada quebrou. |
| `npm run build` | Executa `npm run typecheck` e compila os pacotes otimizados para produção em `out/`. | Quando você quiser gerar e validar o bundle final da aplicação. |
| `npm run dist:dir` | Compila e empacota o aplicativo descompactado em `release/win-unpacked/`. | Para testar rapidamente o executável final sem gerar instalador. |
| `npm run dist:win` | Compila e gera o instalador NSIS (`Notes-MD-Setup-*.exe`) e o portátil em `release/`. | Sempre que quiser gerar manualmente os executáveis de distribuição para Windows. |
| `npm run dist:win:ci` | Gera o instalador, o portátil e os manifestos (`latest.yml`, `.blockmap`) sem publicar diretamente. | Usado automaticamente pelo `semantic-release` no GitHub Actions. |
| `npm run dist:win:publish` | Compila e publica os artefatos diretamente via `electron-builder --win --publish always`. | Uso restrito a publicações manuais com credenciais configuradas. |
| `npm run commit` | Abre o assistente interativo do **Commitizen** no terminal para montar uma mensagem de commit válida. | Sempre que você for criar um novo commit no Git interativamente. |
| `npm run commitlint` | Valida a mensagem de commit conforme o padrão Conventional Commits (executado pelo Husky). | Validação automática no hook `commit-msg` do Git. |
| `npm run release:dry-run` | Simula a análise do **Semantic Release** sem criar tags ou publicar no GitHub. | Para conferir qual será a próxima versão gerada a partir dos commits. |

---

## 📦 2. Ciclo de Versões Estáveis e Release Automatizada

O Notes-MD segue o **Versionamento Semântico (SemVer)** a partir da versão `1.0.0` (atualmente na release estável `v1.6.0`); as versões anteriores com sufixo `alpha` permanecem no histórico apenas como registro de pré-lançamentos.

### Como as versões sobem de número?
- **Correções e desempenho (`fix`, `perf`, `revert`)**: incrementam a versão de correção (`1.6.0` ➔ `1.6.1`).
- **Novas funcionalidades compatíveis (`feat`)**: incrementam a versão secundária (`1.6.0` ➔ `1.7.0`).
- **Alterações incompatíveis (`BREAKING CHANGE`)**: incrementam a versão principal (`1.6.0` ➔ `2.0.0`).

### Fluxo Automatizado no GitHub Actions
Ao realizar push na branch `main`, o workflow [`.github/workflows/release.yml`](../.github/workflows/release.yml) executa `npm run typecheck`, `npm test` e `npx semantic-release` (configurado em [`release.config.cjs`](../release.config.cjs)), atualizando automaticamente `package.json`, `package-lock.json`, `CHANGELOG.md`, criando a tag `vX.Y.Z` e publicando no GitHub Releases o instalador NSIS, o executável portátil, o `latest.yml` e o `.blockmap`.

---

## 🏷️ 3. O Padrão de Semantic Commits (Commitizen)

Para manter o histórico do Git limpo, profissional e fácil de auditar, utilizamos a convenção mundial do **Conventional Commits**:

```text
tipo(escopo): descrição no imperativo em português

[corpo detalhado explicando o motivo da mudança e o que foi feito]
```

### Principais Tipos de Commit:
- **`feat`** (*Feature*): Criação de algo novo para o usuário (ex: nova janela flexível, novo modal).
- **`fix`** (*Correção*): Conserto de algum bug ou comportamento indesejado.
- **`docs`** (*Documentação*): Criação ou melhoria de arquivos como `README.md` ou manuais na pasta `doc/`.
- **`style`** (*Estilo visual*): Ajuste de cores, temas (como paleta Dracula), fontes e margens, sem alterar lógica de código.
- **`refactor`** (*Refatoração*): Limpeza ou reorganização de código interno sem mudar a funcionalidade.
- **`test`** (*Testes*): Criação ou ajuste de testes automatizados unitários.
- **`chore`** (*Manutenção*): Ajustes de arquivos de configuração, dependências ou regras de `.gitignore`.

### Exemplo de Commit Real do Notes-MD:
```text
feat(workspace): implementar suporte a janelas flexíveis lado a lado e em cascata

- Adiciona componentes EditorWorkspace e EditorPaneView.
- Permite arrastar abas entre janelas e redimensionar a proporção da tela.
- Implementa fechamento automático da janela ao esvaziar suas notas.
```

---

## 🤖 4. A Skill Automatizada: `git-semantic-workflow`

Se você estiver utilizando um assistente de IA configurado com o Antigravity neste repositório, basta pedir:

> *"Pode commitar as mudanças e dar push para o GitHub"*

O assistente ativará automaticamente a skill [.agents/skills/git-semantic-workflow/SKILL.md](../.agents/skills/git-semantic-workflow/SKILL.md), executando:
1. Validação de testes (`npm test`) e tipos (`npm run typecheck`).
2. Verificação de arquivos temporários respeitando o `.gitignore`.
3. Redação de mensagem semântica completa e descritiva em português (conforme `commitlint`).
4. Sincronização com o GitHub (`git push`), onde a branch `main` dispara o `semantic-release` para atualizar versão, `CHANGELOG.md`, tags e artefatos de release automaticamente.
