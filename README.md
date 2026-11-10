# Notes-MD — Editor Markdown WYSIWYG & Conhecimento Conectado

<div align="center">

![Versão](https://img.shields.io/badge/versão-0.1.0--alpha.1-blue?style=for-the-badge)
![Status](https://img.shields.io/badge/estágio-ALPHA-orange?style=for-the-badge)
![Licença](https://img.shields.io/badge/licença-MIT-green?style=for-the-badge)
![Electron](https://img.shields.io/badge/Electron-31.0-47848F?style=for-the-badge&logo=electron&logoColor=white)
![React](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

**O seu segundo cérebro local: une a edição visual rica (WYSIWYG) com o poder do texto puro Markdown e conexões bidirecionais estilo Obsidian.**

[Instalação](#-instalação-passo-a-passo) • [Recursos](#-principais-recursos) • [Como Usar](#-guia-rápido-de-uso) • [Atalhos](#%EF%B8%8F-principais-atalhos) • [Documentação Técnica](doc/README.md) • [Licença](LICENSE.md)

</div>

---

## 🎯 Sobre o Projeto e Finalidade

O **Notes-MD** nasceu da busca pelo equilíbrio perfeito no gerenciamento diário de anotações e estudos:
1. **Facilidade do WYSIWYG**: você não precisa decorar sintaxe ou abrir duas janelas lado a lado para formatar texto, tabelas, imagens ou listas de tarefas. O que você vê na tela é exatamente o que é salvo no arquivo.
2. **Privacidade e Liberdade do Markdown puro**: todas as notas são arquivos `.md` padrão salvos diretamente em uma pasta local do seu computador (o seu *Vault*). Sem nuvem proprietária, sem banco de dados fechado, sem risco de perder o acesso ao seu conteúdo.
3. **Conhecimento Conectado (estilo Obsidian & Zettelkasten)**: links inteligentes `[[Nome da Nota]]`, painel de referências reversas (*Backlinks*), visualização prévia ao passar o mouse com `Ctrl`, e sumário em cascata.
4. **Espaço de Trabalho Flexível (estilo VS Code)**: divida o editor em duas janelas (lado a lado ou em cima e embaixo), arraste abas entre painéis e organize seu fluxo de trabalho com foco total.

> [!NOTE]
> **Declaração de Uso**: Este software foi desenvolvido primordialmente para meu **uso pessoal e individual** ([Cristofer Vargas](https://github.com/Cristofer-Vargas)). No entanto, o código é **100% aberto e livre (MIT)** para qualquer pessoa testar, estudar ou adaptar para sua própria rotina de estudos e trabalho.

---

## 🚀 Principais Recursos

- ✍️ **Editor Híbrido Completo**:
  - Títulos `H1`–`H6`, controle de tamanho de fonte (`- 16px +`), cores de texto e realce com marca-texto.
  - Tabelas interativas completas (adicionar/remover linhas e colunas com um clique).
  - Tarefas interativas com checkboxes (`- [ ]`), blocos de código com realce sintático multilinguagem e diagramas **Mermaid.js**.
  - Alternância instantânea com um clique entre **Modo Visual (WYSIWYG)** e **Código Fonte Markdown puro**.
- 🪟 **Janelas Flexíveis (Split Panes)**:
  - Divisão horizontal (lado a lado) ou vertical (em cima e embaixo).
  - Divisor central redimensionável por arraste (duplo clique redefine em 50%/50%).
  - Arraste de abas entre janelas com zonas de encaixe visuais.
  - Fechamento automático inteligente: ao esvaziar uma janela, o workspace colapsa suavemente de volta para janela única.
- 🔗 **Grafo e Conexões Entre Notas (Estilo Obsidian)**:
  - Digite `[[` para autocompletar notas do seu cofre.
  - **Ctrl + Hover Preview**: passe o mouse sobre qualquer link de nota segurando `Ctrl` para ler o conteúdo instantaneamente em pop-up flutuante.
  - Criação automática: clicar em um link para uma nota inexistente cria o arquivo `.md` na hora.
  - Painel de **Backlinks**: saiba exatamente quais outras notas citam a nota aberta no momento.
  - **Renomeação Inteligente**: ao renomear uma nota ou pasta, todos os `[[WikiLinks]]` em todas as demais notas do cofre são atualizados automaticamente.
- 📑 **Sumário Hierárquico Interativo**:
  - Geração automática de índice de tópicos em cascata a partir dos títulos (`H1`–`H6`) do texto.
  - Navegação suave com scroll até o tópico ao clicar.
  - Nós recolhíveis e expansíveis.
- 📁 **Explorador de Arquivos com Lixeira Segura**:
  - Arraste e solte arquivos e pastas para reorganização direta na árvore.
  - Clique com a **rodinha do mouse** (botão do meio) para abrir notas em nova guia.
  - Modal integrado para visualização de imagens (`.png`, `.jpg`, `.svg`, etc.).
  - Exclusão segura: itens apagados são enviados para a **Lixeira do sistema**, nunca destruídos definitivamente.
- 🎨 **Temas & Conforto Visual**:
  - **Tema Dracula (Dark)**: paleta oficial inspirada no VS Code Dracula (`#282a36`, `#21222c`, `#bd93f9`, `#50fa7b`), balanceada para conforto visual noturno sem contraste exagerado.
  - **Tema Claro (Clean Paper)** e **Tema Sépia Editorial**.
  - Corretor ortográfico nativo em Português (`pt-BR`) e Inglês (`en-US`) com menu de contexto.

---

## 💻 Instalação Passo a Passo

### Pré-requisitos
Antes de começar, certifique-se de ter instalado em sua máquina:
- **[Node.js](https://nodejs.org/)** (versão 18 ou superior recomendada).
- **Git** instalado no sistema.

### 1. Clonar o Repositório
Abra o terminal e execute:
```bash
git clone https://github.com/Cristofer-Vargas/notes-md.git
cd notes-md
```

### 2. Instalar as Dependências
```bash
npm install
```

### 3. Executar em Modo de Desenvolvimento
Para abrir o aplicativo com recarregamento rápido (Hot Reload):
```bash
npm run dev
```

### 4. Executar os Testes Automatizados
O projeto conta com testes unitários cobrindo o indexador de notas, layout de janelas, corretor ortográfico e serviços do cofre:
```bash
npm test
```

### 5. Compilar o Aplicativo para Produção
Para gerar a versão final otimizada para o seu sistema:
```bash
npm run build
```

---

## 📖 Guia Rápido de Uso

### 1. Escolhendo seu Cofre (Vault)
Ao abrir o Notes-MD pela primeira vez, ele criará automaticamente uma pasta padrão chamada `Vault-Notas` contendo notas introdutórias. Você pode trocar para qualquer pasta local do seu computador clicando no cabeçalho do explorador de arquivos à esquerda.

### 2. Alternando entre WYSIWYG e Markdown Puro
- Na barra superior do editor, clique no seletor **WYSIWYG / Código** para ver os bastidores do seu texto em Markdown puro.
- Suas alterações são sincronizadas imediatamente com o arquivo no disco.

### 3. Dividindo a Tela (Trabalhando com 2 Notas)
- **Via Botão**: No canto superior direito de qualquer janela, clique no ícone de colunas (`Columns2`) para dividir lado a lado, ou no ícone de linhas (`Rows2`) para dividir em cima e embaixo.
- **Via Drag and Drop**: Clique e segure em qualquer aba e arraste para a borda esquerda, direita, superior ou inferior do editor. Um indicador verde mostrará a área de divisão.
- **Redimensionando**: Passe o mouse sobre a linha que separa as duas janelas e arraste para o tamanho desejado. Um **duplo clique** no divisor redefine para 50%/50%.
- **Fechamento Automático**: Para voltar ao modo normal de uma janela, basta fechar a nota da outra janela ou arrastá-la de volta.

### 4. Criando e Pré-visualizando Conexões (`[[WikiLinks]]`)
- Enquanto digita, insira `[[` seguido do nome da nota desejada. Uma lista inteligente aparecerá para você selecionar com as setas do teclado e `Enter`.
- Pressione a tecla `Ctrl` e passe o mouse sobre qualquer `[[WikiLink]]` para ler a nota sem fechar o que você está escrevendo.

---

## ⌨️ Principais Atalhos

| Atalho | Ação |
| :--- | :--- |
| <kbd>Ctrl</kbd> + <kbd>P</kbd> | **Quick Switcher**: Busca rápida de notas ou comandos |
| <kbd>Ctrl</kbd> + <kbd>N</kbd> | Criar uma nova nota Markdown |
| <kbd>Ctrl</kbd> + <kbd>,</kbd> | Abrir painel de **Personalização** (Temas, Fontes, Cores) |
| <kbd>Ctrl</kbd> + <kbd>B</kbd> | Mostrar ou ocultar o Explorador de Arquivos esquerdo |
| <kbd>Ctrl</kbd> + <kbd>Hover</kbd> | Pré-visualizar conteúdo da nota sob o cursor |
| <kbd>Botão do meio do mouse</kbd> | Clique em uma nota no explorador para abrir em nova aba; clique em uma aba para fechar |
| <kbd>Esc</kbd> | Fechar modais e cancelar divisões flutuantes |

---

## 📚 Documentação Técnica para Iniciantes

Deseja entender como o aplicativo funciona por dentro, mesmo sem ser um desenvolvedor experiente? Criamos uma pasta dedicada com explicações descomplicadas, analogias simples e ilustrações:

👉 **[Acesse a Pasta de Documentação Técnica (`/doc`)](doc/README.md)**
- **[Como o App Funciona por Debaixo dos Panos (`doc/arquitetura-do-app.md`)](doc/arquitetura-do-app.md)**: O que é o Electron, processo principal vs visual, e por que suas notas são 100% suas.
- **[Como Funciona o Editor e o Markdown (`doc/como-funciona-o-editor.md`)](doc/como-funciona-o-editor.md)**: A tecnologia por trás da mágica do WYSIWYG e das janelas divididas.
- **[O Grafo e Conexões de Notas (`doc/conexoes-e-wikilinks.md`)](doc/conexoes-e-wikilinks.md)**: Como o sistema cria o cérebro conectado sem precisar de internet.
- **[Guia de Comandos e Versionamento (`doc/guia-de-comandos.md`)](doc/guia-de-comandos.md)**: Scripts npm, padronização de commits semânticos e controle de versões alpha.

---

## 📄 Licença e Direitos de Uso

Distribuído sob a licença **MIT**. Consulte o arquivo [LICENSE.md](LICENSE.md) para detalhes completos, termos de uso pessoal e atribuição de todas as bibliotecas de código aberto utilizadas.
