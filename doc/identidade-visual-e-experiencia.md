# Identidade visual e experiência do Notes-MD

Este documento oficializa a direção visual do Notes-MD e orienta novas telas e alterações na interface. A referência para a linguagem visual é o portfólio de Cristofer, adaptada à interação de um aplicativo de desktop: uma interface profissional, minimalista e centrada na escrita.

O [guia de estilos e componentes](guia-de-estilos-e-componentes.md) complementa esta referência com os componentes e tokens usados na implementação. A regra técnica do projeto está em [component-styling-guide.md](../.agents/rules/component-styling-guide.md).

## Princípios visuais

- **Interface de aplicativo:** barras, painéis e comandos compactos devem dar prioridade ao espaço de trabalho e ao conteúdo da nota. Evite composições de página promocional, cabeçalhos grandes e elementos decorativos que não ajudem na tarefa.
- **Hierarquia discreta:** organize a tela com espaçamento consistente, tipografia clara, superfícies e divisórias sutis. Use bordas e sombras para separar elementos quando necessário, sem destacar todos os controles igualmente.
- **Geometria contida:** prefira cantos pouco arredondados e componentes compactos. Evite adicionar arredondamentos grandes a menus, campos, abas e painéis.
- **Destaque com moderação:** reserve a cor de destaque para ações principais, estados ativos e informações importantes. Estados de seleção e passagem do mouse devem ser sutis.
- **Conteúdo direto:** use nomes curtos e claros. Nas configurações, apresente as opções diretamente por categoria, sem numeração, descrições promocionais ou cabeçalhos de página redundantes.
- **Ações compactas:** em ações pequenas e reconhecíveis, como copiar, renomear ou fechar, prefira ícones. Todo botão apenas com ícone precisa de nome acessível e indicação de sua função, como um tooltip.

## Temas, tipografia e marca

Os temas Claro, Escuro (Dracula) e Sépia compartilham a mesma organização e os mesmos componentes. Cores de superfícies, textos, bordas e destaques devem vir dos tokens semânticos definidos no projeto; não crie uma paleta isolada para cada tela. Blocos de código usam as variáveis semânticas próprias `--code-*`.

Geist é a fonte padrão da interface. O projeto também disponibiliza IBM Plex Mono para conteúdo monoespaçado e Barlow Condensed para usos específicos; as opções de tipografia do editor continuam configuráveis. As fontes locais e suas licenças ficam em `src/renderer/src/assets/fonts/`.

A marca tem três apresentações na interface, escolhidas automaticamente pelo tema:

| Tema | Logo |
| --- | --- |
| Claro | Preta |
| Escuro | Branca |
| Sépia | Roxa, na versão colorida original |

As imagens estão em `src/renderer/src/assets/`: `logo.png`, `logo-black.png` e `logo-white.png`. A classe `app-logo` aplica as variações nos elementos da interface. Preserve essa adaptação ao reutilizar a marca, inclusive em janelas de configurações e ajuda.

O ícone do aplicativo e de sua distribuição é separado da logo exibida na interface: usa **fundo branco e marca roxa**, independentemente do tema. `resources/icon.png` é usado pelas janelas; `resources/icon.ico` é usado também no empacotamento para Windows e no instalador. Alterações no ícone instalado exigem gerar uma nova distribuição.

## Componentes e superfícies

### Explorador e cofres

A nota ou pasta selecionada recebe um fundo discreto, sem contorno permanente. Ações rápidas próximas ao nome aparecem de forma leve, sem molduras persistentes; o foco do teclado continua visível. O menu de cofres recentes segue a mesma linguagem, exibe até cinco itens e oferece remoção rápida da lista.

Com foco no explorador, as setas para cima e para baixo percorrem os itens visíveis; esquerda e direita permitem recolher ou expandir pastas e voltar à pasta pai. `Home` e `End` vão aos extremos da lista visível e `F2` inicia a renomeação. Essas ações não devem perder o indicador de foco.

### Menus, seletores e configurações

Use seletores e menus compactos, com cores do tema, bordas discretas e estados de foco e seleção perceptíveis. O componente `SelectMenu` é a referência para seletores como estilo de bloco e linguagem de código. Ele oferece navegação por teclado e reposiciona a lista conforme o espaço disponível.

Menus de contexto devem permanecer dentro da janela, com rolagem quando necessário. Suas ações são percorridas com as setas; no menu da nota, a seta para a direita entra em um submenu e a esquerda retorna ao menu anterior. Preserve os nomes acessíveis e os estados de foco ao modificar esses controles. `useContextMenuPosition` centraliza o posicionamento dos menus do editor e do explorador.

As configurações usam uma navegação lateral simples por ícone e nome. O conteúdo começa pelas opções da categoria selecionada, sem números na navegação ou uma seção introdutória repetida em cada categoria.

### Editor, código e diagramas

A área de escrita deve permanecer visualmente tranquila. A caixa de um checklist fica alinhada ao centro da primeira linha de texto, inclusive quando o item quebra em várias linhas.

Blocos de código e Mermaid compartilham uma superfície discreta: borda e cantos sutis, cabeçalho compacto, seletor de linguagem integrado e ações por ícone. No Mermaid, as ações de visualizar e editar devem deixar o modo atual claro. Mantenha a legibilidade dos blocos em todos os temas e os nomes acessíveis dos controles.

Uma nota nova é criada como **Nova nota**, com o corpo em branco e o nome pronto para edição. O nome do arquivo é apresentado como título da nota, separado do corpo Markdown; não insira automaticamente um `# Título` ou texto inicial no conteúdo editável.

## Ao implementar ou revisar uma tela

1. Reutilize os componentes em `src/renderer/src/components/ui/`, especialmente `Button`, `IconButton`, `Input`, `Badge` e `SelectMenu`, conforme o tipo de controle.
2. Use tokens semânticos e confira contraste, seleção, hover, foco e estados desabilitados nos três temas.
3. Mantenha ações compactas identificáveis por nome acessível e teste a navegação por teclado.
4. Verifique menus próximos das bordas, conteúdo longo e janelas menores, preservando acesso a todas as ações.
5. Preserve espaço para o conteúdo e evite acrescentar molduras, textos explicativos ou decoração sem função clara.
