# 🎨 Guia de Estilização e Componentes Reutilizáveis

Para manter o código do **Notes-MD** limpo, rápido e fácil de manter, adotamos o princípio da **Componentização de Interface (Atomic UI)**.

Este guia explica como os componentes reutilizáveis de interface funcionam e como usá-los no dia a dia.

---

## 🎯 Por Que Criar Componentes em Vez de Copiar Classes?

Antes da componentização, para criar um botão com ícone, era necessário repetir uma linha enorme de classes do Tailwind:

```tsx
// ❌ ANTES (Código repetitivo e difícil de manter):
<button
  type="button"
  onClick={salvar}
  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-accent text-white hover:bg-accent-hover transition-colors shadow-2xs"
>
  <Save className="w-3.5 h-3.5" />
  <span>Salvar</span>
</button>
```

Se quiséssemos mudar o arredondamento de todos os botões ou a cor de hover, teríamos que procurar e editar mais de 50 lugares no código!

Agora, com componentes reutilizáveis:

```tsx
// ✅ DEPOIS (Limpo, legível e padronizado):
<Button variant="primary" size="sm" onClick={salvar} leftIcon={<Save className="w-3.5 h-3.5" />}>
  Salvar
</Button>
```

Se amanhã precisarmos ajustar o estilo de todos os botões principais do aplicativo, alteramos **apenas 1 arquivo** (`Button.tsx`), e todo o app se atualiza na mesma hora!

---

## 📦 Catálogo de Componentes Primitivos (`src/renderer/src/components/ui/`)

### 1. `Button` (Botão com Texto)
Ideal para ações claras onde há um texto explicativo:

```tsx
import { Button } from '../ui'
import { Plus, Check } from 'lucide-react'

// Botão Primário (Destaque / Ação principal)
<Button variant="primary" size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />}>
  Nova Nota
</Button>

// Botão Secundário (Ação neutra)
<Button variant="secondary" size="sm">
  Cancelar
</Button>

// Botão Fantasma (Sem borda, apenas texto)
<Button variant="ghost" size="sm">
  Opções
</Button>

// Botão de Perigo (Ações destrutivas)
<Button variant="danger" size="sm">
  Excluir Item
</Button>

// Botão com Estado de Carregamento
<Button variant="primary" size="sm" isLoading={true}>
  Salvando...
</Button>
```

---

### 2. `IconButton` (Botão Apenas com Ícone)
O componente mais frequente no aplicativo. Usado em barras de ferramentas, cabeçalhos, abas e ações de listas:

```tsx
import { IconButton } from '../ui'
import { Columns2, X, Sun, Moon } from 'lucide-react'

// Botão de Barra de Ferramentas
<IconButton
  variant="ghost"
  size="sm"
  tooltip="Dividir Janela ao Meio"
  icon={<Columns2 className="w-3.5 h-3.5" />}
  onClick={dividirJanela}
/>

// Botão com Estado Ativo (Pressionado)
<IconButton
  variant="ghost"
  size="sm"
  isActive={modoDivididoAtivo}
  tooltip="Alternar Divisão"
  icon={<Columns2 className="w-3.5 h-3.5" />}
  onClick={toggleDividido}
/>

// Botão de Fechar / Ação Destrutiva
<IconButton
  variant="danger"
  size="xs"
  tooltip="Fechar Janela"
  icon={<X className="w-3.5 h-3.5" />}
  onClick={fecharJanela}
/>
```

---

### 3. `Badge` (Pílulas e Indicadores)
Usado para contadores, tags e status do sistema:

```tsx
import { Badge } from '../ui'
import { CheckCircle2 } from 'lucide-react'

<Badge variant="accent" size="sm">5 notas</Badge>
<Badge variant="success" size="sm" icon={<CheckCircle2 className="w-3 h-3" />}>Salvo</Badge>
<Badge variant="warning" size="sm">Não salvo</Badge>
<Badge variant="default" size="sm">Markdown</Badge>
```

---

### 4. `Input` (Campos de Digitação Padronizados)
Inputs com suporte a ícones, foco com anel suave e tema Dracula nativo:

```tsx
import { Input } from '../ui'
import { Search } from 'lucide-react'

<Input
  placeholder="Buscar notas ou comandos..."
  leftIcon={<Search className="w-3.5 h-3.5" />}
  value={termoBusca}
  onChange={(e) => setTermoBusca(e.target.value)}
/>
```

---

## 🛠️ O Utilitário `cn(...)`

Para misturar classes condicionais de forma segura, criamos o utilitário `cn` em `src/renderer/src/utils/cn.ts`:

```tsx
import { cn } from '../../utils/cn'

<div className={cn(
  'p-3 rounded-lg border transition-colors',
  ativo ? 'bg-accent-soft border-accent text-accent' : 'bg-surface-secondary border-surface-border',
  className // Permite que quem usa o componente passe classes extras!
)}>
  ...
</div>
```

---

## 📜 Regra de Ouro: Sempre Use Tokens Semânticos!

Ao criar ou customizar qualquer componente, **nunca use cores fixas** (como `bg-gray-800` ou `text-slate-200`). Use sempre as variáveis temáticas:

| Token | O que representa? |
| :--- | :--- |
| `bg-surface-bg` | Fundo principal da página ou do editor. |
| `bg-surface-secondary` | Fundo de barras laterais, cabeçalhos e modais. |
| `bg-surface-tertiary` | Fundo de campos de texto, inputs e estados de hover. |
| `border-surface-border` | Linhas divisórias e bordas sutis. |
| `text-content-primary` | Texto principal com contraste ideal. |
| `text-content-secondary` | Textos secundários, subtítulos e ícones inativos. |
| `text-content-muted` | Textos apagados, dicas e comentários. |
| `bg-accent` / `text-accent` | Cor de destaque personalizada (Roxo Dracula, Azul, Esmeralda, etc.). |
