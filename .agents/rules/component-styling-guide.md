---
title: Diretriz de Estilização e Reaproveitamento de Componentes UI
trigger: always_on
---

# Diretriz de Estilização por Componentes e Reaproveitamento de UI

Esta regra define o padrão arquitetural obrigatório para todas as implementações (atuais e futuras) no projeto **Notes-MD**, visando otimização de código, consistência visual entre temas e eliminação de duplicação de estilos.

---

## 1. Princípio Fundamental: Proibição de Botões e Inputs Crus Inline

> [!IMPORTANT]
> **Nunca utilize elementos `<button>` ou `<input>` crus com cadeias repetitivas de classes Tailwind inline.**
> Toda ação clicável, botão de ferramenta, controle de janela, tag ou campo de formulário deve utilizar os componentes primitivos reutilizáveis de `src/renderer/src/components/ui`.

### Catálogo de Componentes Primitivos (`src/renderer/src/components/ui/`):

1. **`Button` (`Button.tsx`)**:
   - Usado para botões com texto (ex: "Nova Nota", "Confirmar", "Cancelar", "Quick Switcher").
   - **Variantes**:
     - `primary`: Ação de destaque principal (`bg-accent text-white hover:bg-accent-hover`).
     - `secondary`: Ação neutra com borda (`bg-surface-secondary border border-surface-border`).
     - `ghost`: Botão translúcido para barras ou cancelamentos (`hover:bg-surface-tertiary`).
     - `danger`: Ações destrutivas (`bg-rose-500/10 text-rose-500 hover:bg-rose-500/20`).
     - `outline`: Botão transparente com borda destacável.
   - **Tamanhos**: `xs`, `sm` (padrão), `md`, `lg`.
   - **Propriedades**: `leftIcon`, `rightIcon`, `isLoading`, `disabled`.

2. **`IconButton` (`IconButton.tsx`)**:
   - O componente padrão para ações compactas (barras de ferramentas, controles de janela, cabeçalhos, ações de pastas e abas).
   - **Variantes**: `ghost` (padrão), `secondary`, `accent`, `accent-soft`, `danger`.
   - **Tamanhos**: `xs` (24x24px), `sm` (28x28px), `md` (32x32px).
   - **Propriedade `isActive?: boolean`**: Ativa automaticamente o estilo de destaque visual (`bg-accent-soft text-accent` ou `bg-accent text-white`).
   - **Acessibilidade**: Sempre passe `tooltip="Descrição da ação"` ou `title`.

3. **`Badge` (`Badge.tsx`)**:
   - Indicadores de quantidade, status, atalhos e tags.
   - **Variantes**: `default`, `accent`, `secondary`, `success`, `warning`, `danger`.
   - **Tamanhos**: `sm` (11px), `md` (12px).

4. **`Input` (`Input.tsx`) & `Textarea` (`Textarea.tsx`)**:
   - Campos de digitação e áreas de texto com anel de foco padronizado (`focus:ring-1 focus:ring-accent`).
   - `Input` suporta `leftIcon` (ex: lupa de busca), `rightIcon` e propriedade `error`.

5. **`Switch` (`Switch.tsx`)**:
   - Alternador booleano acessível (`role="switch"`, `aria-checked`, `label`) para configurações e preferências.

6. **`SelectMenu` (`SelectMenu.tsx`) & `BlockStyleSelect` (`BlockStyleSelect.tsx`)**:
   - Menus seletores em portal com posicionamento automático (acima ou abaixo conforme espaço disponível) e navegação completa por teclado.

7. **`SelectionButton` (`SelectionButton.tsx`) & `RangeInput` (`RangeInput.tsx`)**:
   - `SelectionButton`: botão base para cartões selecionáveis, itens de árvore, botões de barra do editor e controles estruturados com anel de foco consistente.
   - `RangeInput`: controle deslizante estilizado com a cor de destaque do tema (`--accent-color`).

8. **Utilitários (`useContextMenuPosition.ts` e `src/renderer/src/utils/cn.ts`)**:
   - `useContextMenuPosition`: posiciona menus flutuantes e de contexto dentro dos limites visíveis da janela.
   - `cn(...)`: combina classes Tailwind condicionais de forma segura via `clsx` + `tailwind-merge`.

---

## 2. Regra de Cores e Temas: Apenas Tokens Semânticos

O Notes-MD suporta múltiplos temas simultâneos (**Dracula oficial**, **Claro Clean Paper** e **Sépia Editorial**).

Para que os temas funcionem sem quebras visuais:
- ❌ **PROIBIDO**: Cores fixas como `bg-slate-900`, `bg-zinc-800`, `text-gray-400`, `border-gray-200`.
- ✅ **OBRIGATÓRIO**: Tokens semânticos universais do Tailwind:
  - **Superfícies**: `bg-surface-bg`, `bg-surface-secondary`, `bg-surface-tertiary`, `bg-surface-canvas`.
  - **Bordas**: `border-surface-border`.
  - **Textos**: `text-content-primary`, `text-content-secondary`, `text-content-muted`.
  - **Destaque**: `bg-accent`, `hover:bg-accent-hover`, `bg-accent-soft`, `border-accent`, `text-accent`.
  - **Blocos de Código**: variáveis CSS `--code-bg`, `--code-header-bg`, `--code-border`, `--code-text`.

---

## 3. Checklist para Futuras Implementações

Antes de criar qualquer tela, modal ou componente novo:
1. **Identifique botões e ações**: use `Button` para ações textuais e `IconButton` para botões com apenas ícone.
2. **Campos de entrada**: use `Input` em vez de `<input>` solto.
3. **Tags e badges**: use `Badge` para contadores ou indicadores de status.
4. **Regra de 3x**: Se você estiver estilizando um elemento repetitivo (ex: Switch, Card, Dropdown) mais de duas vezes, **crie um novo componente em `src/renderer/src/components/ui/`** antes de prosseguir.

---

## 4. Diretriz para Refatoração de Código Existente

Sempre que um arquivo legado for aberto para modificação, substitua os botões ou inputs inline pelo equivalente em `components/ui`. Isso garante uma migração gradual e contínua até que 100% da interface esteja unificada e otimizada.
