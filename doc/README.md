# 📖 Documentação Técnica Descomplicada — Notes-MD

Bem-vindo à documentação técnica do **Notes-MD**! 

Este guia foi elaborado especialmente para explicar, em **linguagem simples e acessível (mesmo para quem não é programador)**, como o aplicativo funciona por dentro, quais tecnologias ele utiliza e por que cada escolha de design foi feita.

---

## 🗺️ Mapa dos Documentos

Para navegar pelos conceitos no seu próprio ritmo, dividimos o conteúdo em capítulos temáticos:

1. **[Arquitetura do Aplicativo (`arquitetura-do-app.md`)](arquitetura-do-app.md)**  
   *Entenda o que é o Electron, a separação entre a "Cozinha" (Processo Principal) e o "Salão" (Interface Visual), as janelas auxiliares, o isolamento do modo dev, o auto-updater e por que suas notas ficam salvas no computador em Markdown puro.*

2. **[Como Funciona o Editor e as Janelas Flexíveis (`como-funciona-o-editor.md`)](como-funciona-o-editor.md)**  
   *Descubra a tecnologia por trás do editor WYSIWYG/Markdown, títulos recolhíveis, observações laterais, gravação de áudio nas notas, personalização tipográfica e o sistema de janelas divididas (Split Panes) com persistência de sessão.*

3. **[Conexões de Notas e Conhecimento em Rede (`conexoes-e-wikilinks.md`)](conexoes-e-wikilinks.md)**  
   *Como o aplicativo funciona como um "segundo cérebro" estilo Obsidian? Entenda o Live Preview dos `[[WikiLinks]]`, o painel direito modular (Conexões, Sumário, Áudios e Observações), busca global, Quick Switcher, prévias instantâneas e atualização automática ao renomear arquivos.*

4. **[Guia de Comandos e Versionamento (`guia-de-comandos.md`)](guia-de-comandos.md)**  
   *Manual prático dos comandos do projeto: como rodar em desenvolvimento, validar tipos e testes, gerar instaladores Windows, criar commits semânticos no padrão Commitizen e acompanhar o fluxo de releases automatizadas (`semantic-release`).*

5. **[Guia de Estilos e Componentes Reutilizáveis (`guia-de-estilos-e-componentes.md`)](guia-de-estilos-e-componentes.md)**  
   *Como utilizar a camada de componentes primitivos (`Button`, `IconButton`, `Badge`, `Input`, `Textarea`, `Switch`, `SelectMenu`, `SelectionButton`, `RangeInput`, `cn`) e tokens semânticos para garantir consistência visual em todos os temas.*

6. **[Identidade Visual e Experiência (`identidade-visual-e-experiencia.md`)](identidade-visual-e-experiencia.md)**  
   *Direção visual oficial do aplicativo, marca adaptativa, temas (Claro, Dracula e Sépia), 6 cores de destaque e padrões de interação dos principais componentes.*

7. **[Estrutura de Dados e Mídia (`estrutura-de-dados-e-multimidia.md`)](estrutura-de-dados-e-multimidia.md)**  
   *Estado atual e evolução planejada para organizar notas, imagens, gravações de áudio em `.notes-md/audio/`, biblioteca de áudios, sincronização e uso futuro em dispositivos móveis.*

8. **[Arquitetura do Canvas Infinito (`arquitetura-do-canvas.md`)](arquitetura-do-canvas.md)** *(Planejamento)*  
   *Especificação futura do Canvas visual estilo Obsidian (`.canvas`), baseada no padrão aberto JSON Canvas, com tipos de nós e opções arquiteturais de implementação.*

---

## 💡 Glossário Rápido de Termos Técnicos

Para facilitar a leitura dos outros capítulos, aqui estão alguns conceitos frequentes explicados em uma frase:

- **Markdown (`.md`)**: Um formato de arquivo de texto simples e universal, onde símbolos fáceis indicam formatação (ex: `**negrito**`, `# Título`). Pode ser lido em qualquer editor de texto do planeta.
- **WYSIWYG**: Sigla em inglês para *"What You See Is What You Get"* (O que você vê é o que você tem). É a edição visual direta, igual ao Word ou Notion.
- **Vault (Cofre)**: Uma pasta comum no seu computador onde todas as suas notas, pastas e imagens são guardadas.
- **WikiLink (`[[Nome]]`)**: Sintaxe popularizada pela Wikipédia e pelo Obsidian para criar uma ponte direta entre duas anotações.
- **Backlink**: A via de mão dupla de um link. Se a nota "A" cita a nota "B", a nota "B" sabe automaticamente que a nota "A" falou dela.
- **Electron**: Uma plataforma que permite construir programas de computador modernos usando as mesmas tecnologias da internet (HTML, CSS e JavaScript/TypeScript).
- **Split Panes**: Janelas divididas na mesma tela (lado a lado ou em cima e embaixo) para trabalhar com dois arquivos ao mesmo tempo.
- **Side Notes (Observações Laterais)**: Anotações independentes ancoradas a trechos específicos de uma nota para registrar comentários sem poluir o texto principal.
- **Áudio no Cofre**: Gravações de voz convertidas localmente para MP3 e armazenadas em `.notes-md/audio/` dentro do cofre, reproduzidas por um player com forma de onda dentro da nota.
- **Pomodoro & Gamificação**: Timer integrado com ciclos de foco/pausa, histórico, relatórios, acúmulo de XP e constelação visual.
- **SemVer (Versionamento Semântico)**: Padrão numérico (`Maior.Menor.Correção`, ex.: `1.6.0`) para organizar a evolução estável de um aplicativo.
