# 📖 Documentação Técnica Descomplicada — Notes-MD

Bem-vindo à documentação técnica do **Notes-MD**! 

Este guia foi elaborado especialmente para explicar, em **linguagem simples e acessível (mesmo para quem não é programador)**, como o aplicativo funciona por dentro, quais tecnologias ele utiliza e por que cada escolha de design foi feita.

---

## 🗺️ Mapa dos Documentos

Para navegar pelos conceitos no seu próprio ritmo, dividimos o conteúdo em capítulos temáticos:

1. **[Arquitetura do Aplicativo (`arquitetura-do-app.md`)](arquitetura-do-app.md)**  
   *Entenda o que é o Electron, a separação entre a "Cozinha" (Processo Principal) e o "Salão" (Interface Visual), e por que suas notas ficam salvas no seu computador em formato Markdown puro, sem bancos de dados misteriosos.*

2. **[Como Funciona o Editor e as Janelas Flexíveis (`como-funciona-o-editor.md`)](como-funciona-o-editor.md)**  
   *Descubra a tecnologia por trás do editor WYSIWYG (o que você vê é o que você tem), como o texto se transforma em Markdown em tempo real e como funciona o sistema de janelas divididas (Split Panes) com arraste e solte.*

3. **[Conexões de Notas e Conhecimento em Rede (`conexoes-e-wikilinks.md`)](conexoes-e-wikilinks.md)**  
   *Como o aplicativo funciona como um "segundo cérebro" estilo Obsidian? Entenda como o indexador lê os links `[[...]]`, cria a teia de Backlinks, exibe prévias instantâneas e atualiza tudo automaticamente ao renomear arquivos.*

4. **[Guia de Comandos e Versionamento (`guia-de-comandos.md`)](guia-de-comandos.md)**  
   *Um manual prático dos comandos do projeto: como rodar em desenvolvimento, executar testes automáticos de qualidade, criar commits semânticos no padrão Commitizen e gerenciar versões Alpha pré-v1.0.0.*

5. **[Guia de Estilos e Componentes Reutilizáveis (`guia-de-estilos-e-componentes.md`)](guia-de-estilos-e-componentes.md)**  
   *Como utilizar a camada de componentes primitivos (Button, IconButton, Badge, Input, cn) para otimizar código, evitar repetição e garantir consistência visual em todos os temas.*

6. **[Arquitetura do Canvas Infinito (`arquitetura-do-canvas.md`)](arquitetura-do-canvas.md)**  
   *Como funciona o Canvas visual estilo Obsidian (.canvas), a especificação aberta JSON Canvas, os tipos de nós (textos, notas, imagens, grupos) e as opções arquiteturais de implementação.*

7. **[Identidade Visual e Experiência (`identidade-visual-e-experiencia.md`)](identidade-visual-e-experiencia.md)**: direção visual oficial do aplicativo, temas, marca e padrões de interação dos principais componentes.

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
- **SemVer (Versionamento Semântico)**: Padrão numérico (`Maior.Menor.Correção-estágio`) para organizar a evolução de um aplicativo.
