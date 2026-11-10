import type { Editor } from '@tiptap/react'

const ACCENT_VOWEL_MAP: Record<string, string> = {
  a: 'á',
  e: 'é',
  i: 'í',
  o: 'ó',
  u: 'ú',
  A: 'Á',
  E: 'É',
  I: 'Í',
  O: 'Ó',
  U: 'Ú'
}

/**
 * Normalizes a word by removing accents and converting to lowercase.
 */
export function normalizeDiacritics(w: string): string {
  return w.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

/**
 * Computes Damerau-Levenshtein distance (insertions, deletions, substitutions, and transpositions).
 */
export function damerauLevenshtein(a: string, b: string): number {
  const an = a.length
  const bn = b.length
  if (an === 0) return bn
  if (bn === 0) return an
  const matrix: number[][] = Array.from({ length: bn + 1 }, (_, i) => [i])
  for (let j = 0; j <= an; j++) matrix[0][j] = j

  for (let i = 1; i <= bn; i++) {
    for (let j = 1; j <= an; j++) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1
      let val = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      )
      // transposition of adjacent characters
      if (i > 1 && j > 1 && a[j - 1] === b[i - 2] && a[j - 2] === b[i - 1]) {
        val = Math.min(val, matrix[i - 2][j - 2] + 1)
      }
      matrix[i][j] = val
    }
  }
  return matrix[bn][an]
}

/**
 * Rich curated Portuguese and application vocabulary dictionary for instant offline spellcheck suggestions.
 */
export const PORTUGUESE_VOCABULARY: string[] = [
  // Ações de arquivos, lixeira e edição
  'excluir', 'excluído', 'excluídos', 'excluída', 'excluídas', 'excluindo', 'exclui', 'excluem', 'excluiu', 'excluímos',
  'lixeira', 'lixeiras', 'disco', 'discos', 'armazenamento', 'armazenar', 'armazenado',
  'reutilizável', 'reutilizáveis', 'reutilizar', 'reutilizado', 'reutilização',
  'botão', 'botões', 'clique', 'cliques', 'clicar', 'clicado', 'arrastar', 'arrastado', 'soltar', 'solto',
  'otimização', 'otimizações', 'otimizar', 'otimizado', 'inconsistente', 'inconsistentes', 'inconsistência',
  'consistente', 'consistentes', 'consistência', 'extensão', 'extensões', 'versão', 'versoes', 'versões',
  'diretório', 'diretórios', 'pasta', 'pastas', 'arquivo', 'arquivos', 'raiz', 'caminho', 'caminhos',
  'código', 'códigos', 'programa', 'programas', 'programação', 'software', 'sistema', 'sistemas',
  'título', 'títulos', 'subtítulo', 'subtítulos', 'sumário', 'sumários', 'estrutura', 'estruturas',
  'hierarquia', 'hierarquias', 'cascata', 'tópico', 'tópicos', 'subtópico', 'subtópicos',
  'seção', 'seções', 'conteúdo', 'conteúdos', 'parágrafo', 'parágrafos', 'linha', 'linhas',
  'função', 'funções', 'método', 'métodos', 'parâmetro', 'parâmetros', 'variável', 'variáveis',
  'configuração', 'configurações', 'configurar', 'configurado', 'preferência', 'preferências',
  'janela', 'janelas', 'painel', 'painéis', 'aba', 'abas', 'guia', 'guias', 'lateral', 'laterais',
  'esquerda', 'esquerdo', 'direita', 'direito', 'topo', 'fundo', 'centro', 'meio',
  'imagem', 'imagens', 'foto', 'fotos', 'visualização', 'visualizações', 'visualizar', 'modal', 'modais',
  'conexão', 'conexões', 'vínculo', 'vínculos', 'referência', 'referências', 'documento', 'documentos',
  'nota', 'notas', 'projeto', 'projetos', 'tarefa', 'tarefas', 'processo', 'processos',
  'adicionar', 'adicionado', 'adiciona', 'remover', 'removido', 'remove',
  'renomear', 'renomeado', 'renomeia', 'duplicar', 'duplicado', 'duplica',
  'abrir', 'aberto', 'abertos', 'aberta', 'abertas', 'abre', 'fechar', 'fechado', 'fecha',
  'expandir', 'expandido', 'expande', 'recolher', 'recolhido', 'recolhe',
  'sincronizar', 'sincronizado', 'sincronização', 'salvar', 'salvamento', 'salvo', 'salva',
  'tempo', 'segundo', 'segundos', 'minuto', 'minutos', 'hora', 'horas', 'data', 'datas',
  'possível', 'possíveis', 'impossível', 'impossíveis', 'disponível', 'disponíveis', 'indisponível', 'indisponíveis',
  'responsável', 'responsáveis', 'visível', 'visíveis', 'invisível', 'invisíveis',
  'acessível', 'acessíveis', 'incrível', 'incríveis', 'sustentável', 'sustentáveis',
  'fácil', 'fáceis', 'difícil', 'difíceis', 'rápido', 'rápida', 'rápidos', 'rápidas',
  'prático', 'prática', 'práticos', 'práticas', 'básico', 'básica', 'básicos', 'básicas',
  'único', 'única', 'únicos', 'únicas', 'próximo', 'próxima', 'próximos', 'próximas',
  'último', 'última', 'últimos', 'últimas', 'ótimo', 'ótima', 'ótimos', 'ótimas',
  'automático', 'automática', 'automáticos', 'automáticas',
  'ajuste', 'ajustes', 'ajustar', 'ajustado', 'corrigir', 'corrigido', 'correção', 'correções',
  'ortografia', 'ortográfico', 'ortográfica', 'ortográficos', 'ortográficas', 'dicionário', 'dicionários',
  'ignorar', 'ignorado', 'ignorada', 'termo', 'termos', 'palavra', 'palavras',
  'estilo', 'estilos', 'tema', 'temas', 'modo', 'modos', 'cor', 'cores', 'destaque', 'destaques',
  'mouse', 'teclado', 'atalho', 'atalhos', 'roda', 'cursor',
  'também', 'você', 'vocês', 'não', 'estão', 'padrão', 'padrões', 'opção', 'opções',
  'informação', 'informações', 'solução', 'soluções', 'visão', 'visões', 'política', 'políticas',
  'início', 'histórico', 'históricos', 'memória', 'memórias', 'experiência', 'experiências',
  'comunicação', 'geração', 'integração', 'criação', 'definição', 'definições',
  'validação', 'navegação', 'orientação', 'construção', 'produção', 'introdução',
  'conclusão', 'conclusoes', 'conclusões', 'divisão', 'divisões', 'precisão', 'decisão', 'decisões',
  'geral', 'gerais', 'principal', 'principais', 'especial', 'especiais', 'normal', 'normais',
  'diferente', 'diferentes', 'diferença', 'diferenças', 'semelhante', 'semelhantes',
  'grande', 'grandes', 'pequeno', 'pequena', 'pequenos', 'pequenas',
  'novo', 'nova', 'novos', 'novas', 'antigo', 'antiga', 'antigos', 'antigas',
  'bom', 'boa', 'bons', 'boas', 'melhor', 'melhores', 'maior', 'maiores', 'menor', 'menores',
  'muito', 'muita', 'muitos', 'muitas', 'pouco', 'pouca', 'poucos', 'poucas',
  'qualquer', 'quaisquer', 'quando', 'quanto', 'quantos', 'onde', 'como', 'qual', 'quais',
  'sempre', 'nunca', 'antes', 'depois', 'agora', 'ainda', 'já', 'só', 'apenas',
  'sobre', 'entre', 'através', 'durante', 'conforme', 'segundo', 'contra',
  'porque', 'porém', 'todavia', 'portanto', 'além', 'ninguém', 'alguém'
]

/**
 * Intelligent algorithmic suggestions using Damerau-Levenshtein distance, typo patterns, and missing accent correction.
 */
export function generateFallbackSuggestions(word: string): string[] {
  if (!word || word.length < 2) return []
  const cleanInput = word.trim()
  const normInput = normalizeDiacritics(cleanInput)
  const isCapitalized = cleanInput[0] === cleanInput[0].toUpperCase() && cleanInput[0] !== cleanInput[0].toLowerCase()

  const candidates: { word: string; score: number }[] = []
  const seen = new Set<string>()

  const addCandidate = (item: string, score: number): void => {
    const formatted = isCapitalized ? item[0].toUpperCase() + item.slice(1) : item
    if (formatted.toLowerCase() !== cleanInput.toLowerCase() && !seen.has(formatted.toLowerCase())) {
      seen.add(formatted.toLowerCase())
      candidates.push({ word: formatted, score })
    }
  }

  // 1. Direct normalized match in vocabulary (missing accents, e.g. excluídos -> excluidos, reutilizáveis -> reutilizaveis)
  for (const item of PORTUGUESE_VOCABULARY) {
    const normItem = normalizeDiacritics(item)
    if (normItem === normInput) {
      addCandidate(item, 0)
    }
  }

  // 2. Suffix regex accent patterns (-veis, -vel, -coes, -cao, -botoes, -oes, -orio, -ario)
  if (/[aeiou]veis$/i.test(cleanInput)) {
    const sug = cleanInput.replace(/([aeiou])veis$/iu, (_m, v) => (ACCENT_VOWEL_MAP[v] || v) + 'veis')
    addCandidate(sug, 0.5)
  }
  if (/[aeiou]vel$/i.test(cleanInput)) {
    const sug = cleanInput.replace(/([aeiou])vel$/iu, (_m, v) => (ACCENT_VOWEL_MAP[v] || v) + 'vel')
    addCandidate(sug, 0.5)
  }
  if (/[aeiou]ri[oa]s?$/i.test(cleanInput)) {
    const sug = cleanInput.replace(/([aeiou])(ri[oa]s?)$/iu, (_m, v, end) => (ACCENT_VOWEL_MAP[v] || v) + end)
    addCandidate(sug, 0.5)
  }
  if (/(?:[a-z]{2,})coes$/i.test(cleanInput)) {
    addCandidate(cleanInput.replace(/coes$/iu, 'ções'), 0.5)
  }
  if (/(?:[a-z]{2,})cao$/i.test(cleanInput)) {
    addCandidate(cleanInput.replace(/cao$/iu, 'ção'), 0.5)
  }
  if (/botoes$/i.test(cleanInput)) {
    addCandidate(cleanInput.replace(/botoes$/iu, 'botões'), 0.5)
  }
  if (/botao$/i.test(cleanInput)) {
    addCandidate(cleanInput.replace(/botao$/iu, 'botão'), 0.5)
  }

  // 3. Remove repeated consecutive characters (e.g. computadorr -> computador, developerr -> developer)
  const dedupeEnd = cleanInput.replace(/(.)\1+$/u, (_m, char) => char)
  if (dedupeEnd !== cleanInput && dedupeEnd.length >= 2) {
    addCandidate(dedupeEnd, 0.5)
  }
  const dedupeAll = cleanInput.replace(/([\p{L}])\1+/gu, (_m, char) => char)
  if (dedupeAll !== cleanInput && dedupeAll.length >= 2) {
    addCandidate(dedupeAll, 0.8)
  }

  // 4. Damerau-Levenshtein distance search over the curated vocabulary
  const maxDistance = cleanInput.length <= 4 ? 1 : cleanInput.length <= 8 ? 2 : 3

  for (const item of PORTUGUESE_VOCABULARY) {
    const normItem = normalizeDiacritics(item)
    // Fast length check to skip distant words
    if (Math.abs(normItem.length - normInput.length) > maxDistance) continue

    const dist = damerauLevenshtein(normInput, normItem)
    if (dist <= maxDistance) {
      // Bonus if prefix matches
      const prefixBonus = normItem[0] === normInput[0] ? 0 : 0.6
      addCandidate(item, dist + prefixBonus)
    }
  }

  candidates.sort((a, b) => a.score - b.score)
  return candidates.map((c) => c.word).slice(0, 5)
}

/**
 * Combines suggestion providers without duplicating words that differ only by casing.
 */
export function mergeSpellSuggestions(
  word: string,
  ...suggestionGroups: Array<readonly string[] | null | undefined>
): string[] {
  const normalizedWord = word.trim().toLocaleLowerCase('pt-BR')
  const seen = new Set<string>()
  const merged: string[] = []

  for (const group of suggestionGroups) {
    if (!group) continue

    for (const suggestion of group) {
      const cleanSuggestion = typeof suggestion === 'string' ? suggestion.trim() : ''
      const normalizedSuggestion = cleanSuggestion.toLocaleLowerCase('pt-BR')

      if (
        !cleanSuggestion ||
        normalizedSuggestion === normalizedWord ||
        seen.has(normalizedSuggestion)
      ) {
        continue
      }

      seen.add(normalizedSuggestion)
      merged.push(cleanSuggestion)
    }
  }

  return merged
}

/**
 * Extracts the start offset, end offset, and word under a specific ProseMirror document position.
 */
export function getWordRangeAtPos(
  doc: { resolve: (pos: number) => any; textBetween: (from: number, to: number) => string },
  pos: number
): { from: number; to: number; word: string } | null {
  try {
    const $pos = doc.resolve(pos)
    const textBefore = $pos.parent.textBetween(0, $pos.parentOffset, undefined, '\ufffc')
    const textAfter = $pos.parent.textBetween(
      $pos.parentOffset,
      $pos.parent.content.size,
      undefined,
      '\ufffc'
    )

    const matchBefore = textBefore.match(/[\p{L}\p{N}_'-]+$/u)
    const matchAfter = textAfter.match(/^[\p{L}\p{N}_'-]+/u)

    const startOffset = matchBefore ? $pos.parentOffset - matchBefore[0].length : $pos.parentOffset
    const endOffset = matchAfter ? $pos.parentOffset + matchAfter[0].length : $pos.parentOffset

    if (startOffset === endOffset) return null

    const from = $pos.start() + startOffset
    const to = $pos.start() + endOffset
    const word = doc.textBetween(from, to)
    return { from, to, word }
  } catch {
    return null
  }
}

/**
 * Checks if the current editor selection or a specific document position is inside an inline code mark or a codeBlock node.
 */
export function isPosInsideCode(editor: Editor | null, pos?: number): boolean {
  if (!editor) return false

  if (typeof pos === 'number') {
    try {
      const $pos = editor.state.doc.resolve(pos)
      if ($pos.parent.type.name === 'codeBlock') return true
      if ($pos.marks().some((m) => m.type.name === 'code')) return true
      return false
    } catch {
      // ignore error
    }
  }

  if (editor.isActive('code') || editor.isActive('codeBlock')) return true

  const { from, to } = editor.state.selection
  try {
    const $from = editor.state.doc.resolve(from)
    const $to = editor.state.doc.resolve(to)
    if ($from.parent.type.name === 'codeBlock' || $to.parent.type.name === 'codeBlock') {
      return true
    }
    if (
      $from.marks().some((m) => m.type.name === 'code') ||
      $to.marks().some((m) => m.type.name === 'code')
    ) {
      return true
    }
  } catch {
    // ignore error
  }

  return false
}
