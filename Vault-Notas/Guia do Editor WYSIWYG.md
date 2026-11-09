# Guia Completo do Editor WYSIWYG

Esta nota está conectada à página inicial [[Bem-vindo ao Notes-MD]] e demonstra todas as ferramentas disponíveis na barra superior.

---

## 1. Formatação de Texto e Destaques

Você pode combinar **Negrito**, *Itálico*, <u>Sublinhado</u>, ~~Tachado~~, `código inline`, além de destaques coloridos como <mark data-color="#fef08a">Amarelo Solar</mark>, <mark data-color="#bbf7d0">Verde Menta</mark>, <mark data-color="#bfdbfe">Azul Céu</mark> e <mark data-color="#fbcfe8">Rosa Suave</mark>.

## 2. Blocos de Código com Syntax Highlighting

```typescript
interface NoteConnection {
  source: string
  target: string
  backlinksCount: number
}

export function connectNotes(a: string, b: string): NoteConnection {
  console.log(`Conectando ${a} com ${b}...`)
  return { source: a, target: b, backlinksCount: 42 }
}
```

```python
def calcular_relevancia(palavras: int, backlinks: int) -> float:
    # Pontuação baseada em densidade de conexões
    fator = 1.5 if backlinks > 0 else 1.0
    return round((palavras / 100) * fator, 2)
```

## 3. Diagramas Mermaid Interativos (Estilo Obsidian)

Assim como no Obsidian, você pode criar fluxogramas, sequências e grafos diretamente em blocos de código com linguagem `mermaid`:

```mermaid
graph TD
  A[💡 Nova Ideia] --> B{Conectar a Nota?}
  B -->|Sim| C[Inserir [[WikiLink]]]
  B -->|Não| D[Salvar como Rascunho]
  C --> E[Explorar Backlinks]
  D --> E
  E --> F[✨ Conhecimento Integrado]
```

## 4. Citações e Listas

> "O conhecimento só se torna poderoso quando as ideias se conectam de forma fluida." — Veja mais em [[Sistema Zettelkasten e Links]].

1. Alterne entre o modo **Visual (WYSIWYG)** e o **Código Fonte Markdown (`<>`)** a qualquer momento na barra superior.
2. Insira tabelas, listas de tarefas, links e imagens com um clique.
