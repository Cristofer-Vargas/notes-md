# Notes-MD — Editor Markdown WYSIWYG & Notas Conectadas

Um aplicativo desktop moderno, rápido e personalizável construído com **Electron + React + TypeScript + Tailwind CSS + TipTap**, combinando a experiência de edição **WYSIWYG completa** com o sistema de conhecimento conectado (`[[WikiLinks]]`, **Backlinks** e **Hover Preview**) inspirado no **Obsidian**.

## Recursos Principais

- **Barra de Ferramentas WYSIWYG Completa**:
  - Títulos (`H1`–`H6`), controle de tamanho da fonte (`- 16px +`), Negrito, Itálico, Sublinhado, Tachado, Subscrito e Sobrescrito.
  - Cores de texto e Marca-texto / Destaque multicor (`Highlight`).
  - Conversão de caixa (`MAIÚSCULAS`, `minúsculas`, `Capitalizar`).
  - Inserção e edição completa de **Tabelas**, **Checklists (`- [ ]`)**, **Blocos de Código**, **Citações**, **Links** e **Imagens**.
  - Alternância instantânea entre **Editor Visual (WYSIWYG)** e **Código Fonte Markdown (`.md`)**.
- **Conexão Entre Notas (Estilo Obsidian)**:
  - Digite `[[` ou clique em `[[Nota]]` na barra superior para abrir o autocompletar inteligente de notas do Vault.
  - **Hover Preview**: Passe o mouse sobre qualquer `[[WikiLink]]` para visualizar o resumo, tópicos e conexões da nota sem sair da página atual.
  - **Criação Automática**: Clicar em um `[[WikiLink]]` de uma nota que ainda não existe cria o arquivo `.md` automaticamente.
  - **Painel de Backlinks & Sumário**: Veja todas as notas que citam a nota atual (com o trecho exato da citação), links de saída e a estrutura de títulos (`Outline`).
  - **Atualização de Links ao Renomear**: Renomear qualquer nota atualiza automaticamente os `[[WikiLinks]]` nas demais notas do Vault.
- **Personalização Completa**:
  - Temas **Claro (Clean Paper)**, **Escuro (Obsidian Dark)** e **Sépia Editorial**.
  - Cores de destaque personalizáveis, escolha de tipografia (`Sans`, `Serif`, `Mono`), tamanho de fonte, espaçamento e largura da página.

## Como Executar

```bash
# Instalar dependências
npm install

# Executar em modo de desenvolvimento
npm run dev

# Executar testes unitários
npm test

# Compilar para produção
npm run build
```
