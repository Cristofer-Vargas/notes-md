# Notes-MD — Diretrizes de Desenvolvimento e Regras de Agente

Bem-vindo ao repositório do **Notes-MD**. Este arquivo serve como referência principal para assistentes de IA (Antigravity/Gemini) e desenvolvedores trabalhando nesta base de código.

---

## 🏛️ 1. Arquitetura e Estrutura do Código

- **Ambiente**: Electron 31 + React 18 + TypeScript + Vite (`electron-vite`).
- **Estilização**: Tailwind CSS com tokens semânticos (`surface-*`, `content-*`, `accent-*`) e suporte a múltiplos temas (Dracula oficial, Claro, Sépia).
- **Editor Central**: TipTap (ProseMirror) com extensão personalizada de WikiLinks, blocos de código com realce sintático e diagramas Mermaid.
- **Espaço de Trabalho**: Janelas flexíveis (Split Panes) com suporte a divisão horizontal e vertical, arraste de abas e auto-fechamento inteligente.

---

## 📐 2. Regras de Estilização e Componentização (UI Primitiva)

> Todas as implementações devem seguir a regra oficial em [.agents/rules/component-styling-guide.md](.agents/rules/component-styling-guide.md).

- **Proibido**: `<button>` e `<input>` com classes Tailwind inline repetidas.
- **Obrigatório**: Utilizar os componentes reutilizáveis de `src/renderer/src/components/ui/`:
  - `Button`: Botões de ação textual (`primary`, `secondary`, `ghost`, `danger`, `outline`).
  - `IconButton`: Botões compactos com ícones para barras e abas (`ghost`, `secondary`, `accent`, `accent-soft`, `danger`).
  - `Badge`: Pílulas e tags de status/contadores.
  - `Input`: Campos de texto com ícones opcionais e foco padronizado.
  - `cn(...)`: Função utilitária para fusão de classes condicionais.
- **Tokens Semânticos**: Nunca utilize cores fixas arbitrárias (como `bg-slate-900` ou `text-gray-400`); utilize sempre os tokens `surface-*`, `content-*` e `accent-*` para garantir suporte perfeito a todos os temas.

---

## 🏷️ 3. Versionamento e Semantic Commits (Commitizen)

> Todos os commits e releases devem seguir a skill [.agents/skills/git-semantic-workflow/SKILL.md](.agents/skills/git-semantic-workflow/SKILL.md).

1. **Estágio Alpha Pré-v1.0.0**: O projeto está em fase Alpha. Versões atuais são `0.x.y-alpha.z`. Nenhuma versão `1.0.0` deve ser lançada sem aprovação explícita do usuário.
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
- [Guia de Comandos e Scripts (doc/guia-de-comandos.md)](doc/guia-de-comandos.md)
