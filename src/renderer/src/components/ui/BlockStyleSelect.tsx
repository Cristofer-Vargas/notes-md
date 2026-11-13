import React from 'react'
import { Code2, Heading, Network, Pilcrow, Quote } from 'lucide-react'
import { SelectMenu } from './SelectMenu'

const OPTIONS = [
  { value: 'paragraph', label: 'Parágrafo', hint: 'Texto normal', icon: Pilcrow },
  ...[1, 2, 3, 4, 5, 6].map((level) => ({
    value: `h${level}`, label: `Título ${level}`, hint: `H${level}`, icon: Heading, separator: level === 1
  })),
  { value: 'blockquote', label: 'Citação', icon: Quote, separator: true },
  { value: 'codeBlock', label: 'Bloco de código', icon: Code2 },
  { value: 'mermaid', label: 'Diagrama Mermaid', icon: Network }
]

export function BlockStyleSelect(props: { value: string; disabled?: boolean; onChange: (value: string) => void }): React.ReactElement {
  return <SelectMenu {...props} label="Estilo de bloco" icon={Pilcrow} options={OPTIONS} />
}
