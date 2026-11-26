# Notes-MD — Diretrizes de Desenvolvimento e Regras de Agente

Bem-vindo ao repositório do **Notes-MD**. Este arquivo serve como referência principal para assistentes de IA (Antigravity/Gemini) e desenvolvedores trabalhando nesta base de código.

---

## 🏛️ 1. Arquitetura e Estrutura do Código

- **Ambiente**: Electron 31 + React 18 + TypeScript 5.5 + Vite (`electron-vite`) + Vitest.
- **Processo Principal (`src/main/`)**: gerenciamento de cofre e watcher em disco (`vaultService.ts`), observações laterais (`sideNotesService.ts`), Pomodoro com histórico e XP/constelação (`pomodoroService.ts`), corretor ortográfico (`spellcheckService.ts`), fontes do sistema (`fontService.ts`), Discord Rich Presence (`discordPresenceService.ts`), auto-updater (`updateService.ts`), isolamento dev/produção (`runtimeEnv.ts`) e estado de janela (`windowState.ts`).
- **Múltiplas Janelas**: janela principal do workspace e janelas independentes para Configurações (`SettingsWindow`), Pomodoro (`PomodoroWindow`) e Visualizador de Imagens (`ImageViewerWindow`).
- **Estilização**: Tailwind CSS com tokens semânticos (`surface-*`, `content-*`, `accent-*`, `--code-*`) e suporte a múltiplos temas (Dracula oficial, Claro e Sépia) e 6 presets de cor de destaque.
- **Editor Central**: TipTap (ProseMirror) + `tiptap-markdown`, com extensões personalizadas de `WikiLinkExtension` (Live Preview + sugestões de notas existentes e pendentes), `HeadingFold` (títulos recolhíveis persistidos na sessão), `CustomHighlight`, `CustomCodeBlock` (`lowlight`), diagramas **Mermaid.js**, `VaultAudio` (gravação/player MP3 em `.notes-md/audio/`), `ListExit`, `FontSizeExtension`, além de **Observações Laterais (Side Notes)** ancoradas ao texto.
- **Espaço de Trabalho**: Janelas flexíveis (Split Panes) com divisão horizontal/vertical, arraste de abas, persistência de sessão (`vaultSession.ts`), auto-fechamento inteligente e painel direito modular com 4 abas (`Conexões`, `Sumário`, `Áudios`, `Observações`).

---

## 📐 2. Regras de Estilização e Componentização (UI Primitiva)

> Todas as implementações devem seguir a regra oficial em [.agents/rules/component-styling-guide.md](.agents/rules/component-styling-guide.md).

- **Proibido**: `<button>`, `<input>` e `<textarea>` com classes Tailwind inline repetidas.
- **Obrigatório**: Utilizar os componentes reutilizáveis de `src/renderer/src/components/ui/`:
  - `Button`: Botões de ação textual (`primary`, `secondary`, `ghost`, `danger`, `outline`).
  - `IconButton`: Botões compactos com ícones para barras e abas (`ghost`, `secondary`, `accent`, `accent-soft`, `danger`).
  - `Badge`: Pílulas e tags de status/contadores.
  - `Input` e `Textarea`: Campos de texto e áreas de texto padronizados.
  - `Switch`: Alternadores acessíveis (`role="switch"`).
  - `SelectMenu` e `BlockStyleSelect`: Menus seletores com posicionamento automático e navegação por teclado.
  - `SelectionButton` e `RangeInput`: Botões de seleção estruturados e controles deslizantes.
  - `useContextMenuPosition` e `cn(...)`: Utilitários de posicionamento de menus e fusão de classes condicionais.
- **Tokens Semânticos**: Nunca utilize cores fixas arbitrárias (como `bg-slate-900` ou `text-gray-400`); utilize sempre os tokens `surface-*`, `content-*`, `accent-*` e `--code-*` para garantir suporte perfeito a todos os temas.

---

## 🏷️ 3. Versionamento e Semantic Commits (Commitizen)

> Todos os commits e releases devem seguir a skill [.agents/skills/git-semantic-workflow/SKILL.md](.agents/skills/git-semantic-workflow/SKILL.md).

1. **Versões estáveis**: O projeto segue SemVer a partir da versão `1.0.0`. Correções incrementam a versão patch, funcionalidades compatíveis a versão minor e mudanças incompatíveis a versão major.
2. **Padrão de Commit**: `<tipo>(<escopo>): <descrição no imperativo em português>` (ex: `feat(editor): adicionar suporte a tabelas`).
3. **Corpo do Commit**: Detalhado, explicando o porquê da alteração, solução técnica e arquivos envolvidos.
4. **Validação Obrigatória**: Antes de qualquer commit, execute `npm test` e `npm run typecheck`.

---

## 📚 4. Links Úteis da Documentação

- [README Principal](README.md)
- [Licença e Direitos de Uso (MIT)](LICENSE.md)
- [Documentação Técnica Descomplicada (doc/README.md)](doc/README.md)
- [Arquitetura do App (doc/arquitetura-do-app.md)](doc/arquitetura-do-app.md)
- [O Editor e Split Panes (doc/como-funciona-o-editor.md)](doc/como-funciona-o-editor.md)
- [Conhecimento Conectado & WikiLinks (doc/conexoes-e-wikilinks.md)](doc/conexoes-e-wikilinks.md)
- [Identidade Visual e Experiência (doc/identidade-visual-e-experiencia.md)](doc/identidade-visual-e-experiencia.md)
- [Guia de Estilos e Componentes (doc/guia-de-estilos-e-componentes.md)](doc/guia-de-estilos-e-componentes.md)
- [Estrutura de Dados e Multimídia (doc/estrutura-de-dados-e-multimidia.md)](doc/estrutura-de-dados-e-multimidia.md)
- [Guia de Comandos e Scripts (doc/guia-de-comandos.md)](doc/guia-de-comandos.md)
- [Arquitetura do Canvas Infinito — Planejamento (doc/arquitetura-do-canvas.md)](doc/arquitetura-do-canvas.md)
