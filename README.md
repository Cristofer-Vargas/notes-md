# Notes-MD — Editor Markdown WYSIWYG & Conhecimento Conectado

<div align="center">

[![Última Release](https://img.shields.io/github/v/release/Cristofer-Vargas/notes-md?label=release%20est%C3%A1vel&style=for-the-badge&color=50fa7b)](https://github.com/Cristofer-Vargas/notes-md/releases/latest)
[![Data da Release](https://img.shields.io/github/release-date/Cristofer-Vargas/notes-md?label=publicada%20em&style=for-the-badge&color=blue)](https://github.com/Cristofer-Vargas/notes-md/releases)
[![CI & Release](https://img.shields.io/github/actions/workflow/status/Cristofer-Vargas/notes-md/release.yml?branch=main&label=CI%20%26%20Release&style=for-the-badge)](https://github.com/Cristofer-Vargas/notes-md/actions/workflows/release.yml)
![Plataforma](https://img.shields.io/badge/plataforma-Windows%20x64-0078D6?style=for-the-badge&logo=windows&logoColor=white)
[![Licença](https://img.shields.io/github/license/Cristofer-Vargas/notes-md?label=licen%C3%A7a&style=for-the-badge&color=green)](LICENSE.md)

![Electron](https://img.shields.io/badge/Electron-31.0-47848F?style=for-the-badge&logo=electron&logoColor=white)
![React](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

**O seu segundo cérebro local: une a edição visual rica (WYSIWYG) com a liberdade do Markdown puro, conexões bidirecionais estilo Obsidian e ferramentas de foco.**

[Status das Releases](#-status-das-releases-e-versões) • [Download (Windows)](#-download-e-instalação-windows-x64) • [Recursos](#-principais-recursos) • [Como Usar](#-guia-rápido-de-uso) • [Atalhos](#-principais-atalhos) • [Desenvolvedores](#-execução-e-build-para-desenvolvedores) • [Documentação](doc/README.md)

</div>

---

## 🎯 Sobre o Projeto e Transparência

O **Notes-MD** nasceu da busca pelo equilíbrio entre praticidade visual e propriedade total sobre as próprias anotações:

1. **Edição visual imediata (WYSIWYG)**: formate títulos, tabelas, checklists, blocos de código, diagramas Mermaid e marcações sem precisar decorar sintaxe ou manter duas janelas lado a lado para pré-visualização.
2. **Privacidade e liberdade do Markdown puro**: todas as notas são arquivos `.md` padrão salvos localmente em uma pasta do seu computador (o seu *Vault*). Sem nuvem proprietária, sem banco de dados fechado e sem aprisionamento de conteúdo.
3. **Conhecimento conectado (estilo Obsidian & Zettelkasten)**: links `[[Nome da Nota]]`, painel de referências reversas (*Backlinks*), pré-visualização instantânea com `Ctrl + Hover`, sumário interativo que acompanha o cursor e busca global no cofre.
4. **Espaço de trabalho flexível e foco**: painéis divididos estilo VS Code (lado a lado ou empilhados) com arraste de abas, observações laterais por nota e Pomodoro integrado com estatísticas e progressão.

> [!NOTE]
> **Declaração de Uso e Escopo Atual**:
> - Este software é desenvolvido prioritariamente para **uso pessoal e individual** de [Cristofer Vargas](https://github.com/Cristofer-Vargas), sendo distribuído em código **100% aberto sob a licença MIT** (*as is*, sem garantias comerciais) para qualquer pessoa usar, estudar ou adaptar.
> - **Plataforma oficial atual**: as releases empacotadas e testadas no GitHub são direcionadas ao **Windows (x64)**. Não há instaladores oficiais para macOS ou Linux publicados no momento.

---

## 📦 Status das Releases e Versões

O **Notes-MD** segue o **Versionamento Semântico (SemVer)** com publicação automatizada na branch `main` via [GitHub Actions](.github/workflows/release.yml) e `semantic-release`.

- **Estágio atual**: **Estável** (`v1.6.0` como release `Latest` no GitHub).
- **Histórico completo**: consulte o [`CHANGELOG.md`](CHANGELOG.md) ou a página de [Releases do GitHub](https://github.com/Cristofer-Vargas/notes-md/releases).
- **Pré-lançamentos anteriores (`alpha`)**: as versões `v0.1.0-alpha.1` até `v0.2.0-alpha.4` pertencem à fase inicial antes da `v1.0.0` e permanecem apenas como registro histórico.

### Resumo das Versões Estáveis Publicadas

| Versão | Data (UTC) | Principais entregas publicadas | Links |
| :--- | :--- | :--- | :--- |
| **`v1.6.0`** *(Latest)* | 2026-11-24 | Escolha de fontes instaladas no sistema, cópia limpa em texto puro, quebra automática em títulos longos, `Ctrl+Tab` alternando com a última guia acessada e preservação de títulos recolhidos ao alternar para Markdown puro | [Release](https://github.com/Cristofer-Vargas/notes-md/releases/tag/v1.6.0) • [Compare](https://github.com/Cristofer-Vargas/notes-md/compare/v1.5.1...v1.6.0) |
| **`v1.5.0` – `v1.5.1`** | 2026-11-24 | Estilo destacado configurável para títulos e subtítulos, memória de colapso das observações e ajustes de quebra após listas | [v1.5.1](https://github.com/Cristofer-Vargas/notes-md/releases/tag/v1.5.1) • [v1.5.0](https://github.com/Cristofer-Vargas/notes-md/releases/tag/v1.5.0) |
| **`v1.4.0` – `v1.4.2`** | 2026-11-23 | Sistema de **Observações laterais (Side Notes)** acoplado às sessões e correções de foco do cursor | [v1.4.2](https://github.com/Cristofer-Vargas/notes-md/releases/tag/v1.4.2) • [v1.4.0](https://github.com/Cristofer-Vargas/notes-md/releases/tag/v1.4.0) |
| **`v1.3.0`** | 2026-11-22 | Personalização de espaçamentos tipográficos nas notas (linha, parágrafo, letras e palavras) | [Release](https://github.com/Cristofer-Vargas/notes-md/releases/tag/v1.3.0) |
| **`v1.2.0`** | 2026-11-15 | Pesquisa global de conteúdo em todo o cofre, autocomplete com criação no Quick Switcher, títulos recolhíveis, sumário que acompanha o cursor, movimentação/duplicação de blocos e sons no Pomodoro | [Release](https://github.com/Cristofer-Vargas/notes-md/releases/tag/v1.2.0) |
| **`v1.1.0`** | 2026-11-14 | **Pomodoro integrado** com XP/conquistas e constelação, notificações globais e atalhos de formatação inline ao selecionar texto | [Release](https://github.com/Cristofer-Vargas/notes-md/releases/tag/v1.1.0) |
| **`v1.0.0`** | 2026-11-13 | Primeiro lançamento estável: editor WYSIWYG/Markdown, Split Panes, WikiLinks, Backlinks, temas, corretor ortográfico, Discord Rich Presence, janelas independentes e instalador/portátil Windows | [Release](https://github.com/Cristofer-Vargas/notes-md/releases/tag/v1.0.0) |

---

## 📥 Download e Instalação (Windows x64)

Para apenas usar o aplicativo sem compilar o código-fonte, baixe os artefatos oficiais na [última release do GitHub](https://github.com/Cristofer-Vargas/notes-md/releases/latest):

| Formato | Arquivo na Release | Indicado para |
| :--- | :--- | :--- |
| **Instalador Windows (NSIS)** | `Notes-MD-Setup-<versão>.exe` | Uso diário — cria atalhos no Menu Iniciar/Área de Trabalho e suporta **atualizações automáticas** |
| **Executável Portátil** | `Notes-MD-<versão>-portable.exe` | Execução direta sem instalação tradicional |

### Atualizações Automáticas
- Na versão instalada via `Setup`, o Notes-MD consulta o GitHub Releases automaticamente ao iniciar, ao focar a janela e em verificações periódicas em segundo plano (usando `latest.yml` e `.blockmap` para atualização incremental).
- Você também pode verificar, baixar e instalar novas versões manualmente em **Configurações (`Ctrl+,`) → Sobre & Atualizações**.
- Quem executa o projeto em modo desenvolvimento (`npm run dev`) utiliza perfil (`userData`) e cofre padrão isolados para não interferir na instalação estável.

---

## 🚀 Principais Recursos

> Os recursos listados abaixo cobrem a release estável **`v1.6.0`** e as evoluções recentes na branch `development` (áudio gravado nas notas, atalho configurável de marca-texto e melhorias no autocomplete de WikiLinks).

- ✍️ **Editor Híbrido Completo (WYSIWYG + Código Markdown)**:
  - Títulos `H1`–`H6` recolhíveis (fold) preservando o estado na sessão, com opção de estilo destacado para títulos e subtítulos.
  - Personalização tipográfica completa: escolha entre presets (`Geist`, `Georgia`, `IBM Plex Mono`) ou **qualquer fonte instalada no sistema**, além de tamanho base, peso da fonte (`200`–`500`) e espaçamentos (altura de linha, parágrafo, letras e palavras).
  - Tabelas interativas, listas de tarefas (`- [ ]`), cores de texto, marca-texto multicolorido (com atalho rápido `Ctrl+G` para laranja), blocos de código com realce sintático multilinguagem e renderização de diagramas **Mermaid.js**.
  - Formatação rápida ao selecionar texto com `*`, `_`, `~`, `` ` `` ou `=`, além de movimentação (`Ctrl+↑/↓`) e duplicação (`Ctrl+Alt+↑/↓`) de blocos.
  - Cópia limpa em texto puro e alternância instantânea entre **Modo Visual (WYSIWYG)** e **Código Fonte Markdown** (`Ctrl+/`).
- 🎙️ **Áudio Gravado Integrado ao Cofre**:
  - Gravação direta pelo microfone com pausa/continuação, forma de onda ao vivo, prévia e conversão local para **MP3** (`wasm-media-encoders`) salva em `.notes-md/audio/`.
  - Player embutido na nota com forma de onda interativa, além da aba **Áudios** no painel direito para localizar, saltar até a ocorrência na nota ou desvincular gravações.
- 🪟 **Janelas Flexíveis (Split Panes) & Abas**:
  - Divisão horizontal (lado a lado) ou vertical (em cima e embaixo), com divisor redimensionável por arraste (duplo clique redefine em 50%/50%).
  - Arraste de abas entre painéis com zonas visuais de encaixe, persistência da sessão por cofre e alternância direta com a última guia acessada via `Ctrl+Tab`.
  - Fechamento automático inteligente quando um painel fica sem guias abertas.
- 🔗 **Conhecimento Conectado & Painel Direito Modular**:
  - Autocompletar ao digitar `[[` ou `Ctrl+K`, sugerindo notas existentes e **WikiLinks mencionados que ainda não têm arquivo criado**, com suporte a apelidos (`[[Nota|Texto]]`).
  - **Ctrl + Hover Preview**: pré-visualização flutuante do conteúdo da nota ao passar o mouse sobre um link segurando `Ctrl`.
  - Criação automática ao clicar em links para notas inexistentes e **atualização automática de todos os `[[WikiLinks]]`** ao renomear notas ou pastas.
  - Painel direito dividido e reorganizável com 4 abas: **Conexões (Backlinks)**, **Sumário** interativo que acompanha o cursor, **Áudios** e **Observações**.
- 🔎 **Busca Global, Quick Switcher & Observações**:
  - **Quick Switcher (`Ctrl+P`)** com autocompletar de pastas/notas e criação instantânea no cofre.
  - **Pesquisa no Cofre (`Ctrl+Shift+F`)** para buscar palavras em títulos e no conteúdo completo das notas.
  - **Observações Laterais (Side Notes)** ancoradas a trechos da nota para comentários e anotações paralelas sem poluir o texto principal.
- ⏱️ **Pomodoro, Gamificação & Modo Zen**:
  - Timer Pomodoro integrado (com janela flutuante fixável e janela de relatórios) com histórico de sessões, estatísticas, sons de notificação, progresso infinito de XP/conquistas e constelação visual.
  - **Modo Zen (`F11`)** para ocultar barras laterais e escrever sem distrações.
- 📁 **Explorador de Arquivos com Lixeira Segura**:
  - Reorganização por arraste e solte na árvore, navegação por teclado, menu de cofres recentes e clique com o botão do meio do mouse para abrir notas em nova guia.
  - Visualizador de imagens integrado (`.png`, `.jpg`, `.svg`, etc.) com suporte a janela dedicada.
  - Exclusão segura enviando itens para a **Lixeira do sistema**.
- 🎨 **Temas, Ortografia, Atalhos & Integrações**:
  - **Tema Dracula (Dark)**, **Tema Claro (Clean Paper)** e **Tema Sépia Editorial**, com 6 presets de cores de destaque (*accent*) configuráveis.
  - Corretor ortográfico nativo em **Português (`pt-BR`)** e **Inglês (`en-US`)** (além de outros idiomas configuráveis) com sugestões via menu de contexto e lista de palavras ignoradas.
  - Integração opcional com **Discord Rich Presence** e editor de **atalhos personalizáveis** nas Configurações (`Ctrl+,`).

---

## 📖 Guia Rápido de Uso

### 1. Escolhendo seu Cofre (Vault)
Ao abrir o Notes-MD pela primeira vez, ele cria automaticamente uma pasta padrão chamada `Vault-Notas` com notas introdutórias. Você pode trocar para qualquer pasta local do seu computador pelo seletor no topo do explorador à esquerda.

### 2. Alternando entre WYSIWYG e Markdown Puro
- Clique no seletor **WYSIWYG / Código** na barra superior do editor ou pressione `Ctrl + /`.
- As edições feitas em qualquer modo são sincronizadas com o arquivo `.md` no disco.

### 3. Dividindo a Tela (Trabalhando com Múltiplas Notas)
- **Via Botão**: no canto superior direito do painel, use os ícones de divisão horizontal ou vertical.
- **Via Drag and Drop**: arraste uma aba para uma das bordas do editor para criar uma nova divisão naquela direção.
- **Redimensionamento e Fechamento**: arraste o divisor central (ou dê duplo clique para 50%/50%). Ao fechar a última aba de um painel, o layout volta automaticamente para o painel restante.

### 4. Conectando Notas (`[[WikiLinks]]`), Observações e Busca
- Digite `[[` ou pressione `Ctrl + K` para abrir a lista de notas e criar conexões.
- Segure `Ctrl` e passe o mouse sobre um `[[WikiLink]]` para pré-visualizar a nota sem sair do contexto atual.
- Use `Ctrl + P` para abrir/criar notas rapidamente e `Ctrl + Shift + F` para pesquisar dentro de todo o cofre.

---

## ⚡ Principais Atalhos

> Os atalhos principais podem ser consultados e reconfigurados em **Configurações (`Ctrl+,`) → Atalhos**.

| Atalho Padrão | Ação |
| :--- | :--- |
| <kbd>Ctrl</kbd> + <kbd>P</kbd> | **Quick Switcher**: abrir ou criar notas rapidamente |
| <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>F</kbd> | **Pesquisar no Cofre**: buscar termos em títulos e conteúdos |
| <kbd>Ctrl</kbd> + <kbd>N</kbd> | Criar nova nota Markdown |
| <kbd>Ctrl</kbd> + <kbd>S</kbd> | Salvar imediatamente no disco |
| <kbd>Ctrl</kbd> + <kbd>,</kbd> | Abrir **Configurações** (Temas, Fontes, Espaçamentos, Atalhos, Updates) |
| <kbd>Ctrl</kbd> + <kbd>/</kbd> | Alternar entre **Modo Visual (WYSIWYG)** e **Markdown Puro** |
| <kbd>Ctrl</kbd> + <kbd>K</kbd> | Inserir conexão `[[WikiLink]]` |
| <kbd>Ctrl</kbd> + <kbd>G</kbd> | Aplicar marca-texto laranja ao texto selecionado |
| <kbd>Ctrl</kbd> + <kbd>B</kbd> | Ocultar ou exibir a barra lateral esquerda (Arquivos) |
| <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>B</kbd> | Ocultar ou exibir o painel direito (Backlinks e Sumário) |
| <kbd>Ctrl</kbd> + <kbd>Tab</kbd> | Alternar entre a guia atual e a última guia acessada no painel ativo |
| <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Tab</kbd> | Voltar para a guia anterior no painel ativo |
| <kbd>Ctrl</kbd> + <kbd>W</kbd> | Fechar a guia ativa |
| <kbd>F11</kbd> | Alternar **Modo Zen** (foco total) |
| <kbd>Alt</kbd> + <kbd>Enter</kbd> | Ferramentas rápidas e sugestões de ortografia |
| <kbd>Ctrl</kbd> + <kbd>↑</kbd> / <kbd>↓</kbd> | Mover bloco de texto ou item para cima/baixo |
| <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>↑</kbd> / <kbd>↓</kbd> | Duplicar bloco para cima/baixo |
| <kbd>Ctrl</kbd> + <kbd>Hover</kbd> | Pré-visualizar nota referenciada em um `[[WikiLink]]` |
| <kbd>Botão do meio do mouse</kbd> | Abrir nota em nova aba (no explorador) ou fechar aba |
| <kbd>Esc</kbd> | Fechar modais e menus flutuantes |

---

## 💻 Execução e Build para Desenvolvedores

### Pré-requisitos
- **[Node.js](https://nodejs.org/)**: versão `>= 22.14.0` (série 22) ou `>= 24.10.0`.
- **Git** instalado no sistema.

### 1. Clonar e Instalar Dependências
```bash
git clone https://github.com/Cristofer-Vargas/notes-md.git
cd notes-md
npm install
```

### 2. Executar em Modo de Desenvolvimento
Abre o aplicativo com Hot Reload em ambiente isolado (não interfere no app instalado):
```bash
npm run dev
```

### 3. Validar Tipos e Testes Automatizados
Antes de abrir PRs ou publicar alterações:
```bash
npm run typecheck
npm test
```

### 4. Compilar e Empacotar Localmente (Windows)
```bash
# Apenas compilar o bundle Electron/Vite em out/
npm run build

# Gerar instalador NSIS e executável portátil em release/
npm run dist:win
```

### 5. Fluxo de Commits e Releases Automatizadas
- Os commits seguem **Conventional Commits** em português (`npm run commit` abre o assistente do Commitizen e o Husky valida com `commitlint`).
- Pushes na branch `main` disparam o workflow [`.github/workflows/release.yml`](.github/workflows/release.yml), que executa `npm run typecheck`, `npm test` e `npx semantic-release` para gerar versão, `CHANGELOG.md`, tags, binários Windows e publicar a release no GitHub.

---

## 📚 Documentação Técnica para Iniciantes

Quer entender como o aplicativo funciona por dentro em linguagem acessível? Confira a pasta de documentação:

👉 **[Acesse o Índice da Documentação (`/doc`)](doc/README.md)**
- **[Arquitetura do Aplicativo (`doc/arquitetura-do-app.md`)](doc/arquitetura-do-app.md)**: Processo Principal vs Renderizador no Electron e armazenamento local.
- **[Como Funciona o Editor (`doc/como-funciona-o-editor.md`)](doc/como-funciona-o-editor.md)**: TipTap, conversão Markdown em tempo real e Split Panes.
- **[Conexões e WikiLinks (`doc/conexoes-e-wikilinks.md`)](doc/conexoes-e-wikilinks.md)**: Indexação de links `[[...]]`, Backlinks e atualização automática.
- **[Identidade Visual e Experiência (`doc/identidade-visual-e-experiencia.md`)](doc/identidade-visual-e-experiencia.md)**: Marca, temas e padrões visuais da interface.
- **[Guia de Estilos e Componentes (`doc/guia-de-estilos-e-componentes.md`)](doc/guia-de-estilos-e-componentes.md)**: Primitivos de UI (`Button`, `IconButton`, `Badge`, `Input`, `Switch`, `SelectMenu` etc.) e tokens semânticos.
- **[Estrutura de Dados e Multimídia (`doc/estrutura-de-dados-e-multimidia.md`)](doc/estrutura-de-dados-e-multimidia.md)**: Organização de arquivos do cofre, áudios gravados e evolução estrutural.
- **[Guia de Comandos e Versionamento (`doc/guia-de-comandos.md`)](doc/guia-de-comandos.md)**: Scripts npm, Semantic Commits e fluxo de release.
- **[Arquitetura do Canvas Infinito (`doc/arquitetura-do-canvas.md`)](doc/arquitetura-do-canvas.md)**: Especificação planejada para o futuro recurso de Canvas (`.canvas`).

---

## 📄 Licença e Direitos de Uso

Distribuído sob a licença **MIT**. Consulte [`LICENSE.md`](LICENSE.md) para detalhes completos, termos de uso pessoal e atribuição das bibliotecas de código aberto utilizadas.

