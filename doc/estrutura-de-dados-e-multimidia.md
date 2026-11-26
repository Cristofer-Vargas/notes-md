# Estrutura de Dados e Mídia no Notes MD

Este documento organiza as decisões e propostas para ampliar o Notes MD com imagens, áudio e outros recursos sem tirar as notas do centro do produto. Ele diferencia o funcionamento atual das recomendações para a evolução do aplicativo. As decisões marcadas como **em aberto** ainda dependem de conversa e não representam escolhas definitivas.

## Princípio central

O Notes MD é um aplicativo de notas local-first. A nota deve continuar sendo o lugar principal para escrever, consultar e relacionar conhecimento. Imagens, gravações, vídeos e embeds entram como conteúdo complementar da nota. Uma mesma mídia pode ser vinculada a várias notas, e o app pode oferecer uma biblioteca para organizar e localizar esses itens sem transformá-la no centro da experiência.

Os dados precisam continuar acessíveis fora do aplicativo sempre que isso fizer sentido. Recursos auxiliares podem depender de um índice local, mas não devem tornar os arquivos Markdown ilegíveis ou proprietários.

## Como o aplicativo funciona hoje

- Cada nota é um arquivo `.md` dentro de um cofre escolhido pelo usuário.
- O cofre também pode conter outros arquivos, inclusive imagens. O explorador reconhece imagens e o processo principal consegue ler imagens do disco para exibição.
- O editor permite inserir imagens por URL. A experiência atual de importar, organizar e editar imagens ainda é limitada.
- A primeira experiência de áudio inclui gravação pelo microfone, pausa/continuação, prévia, descarte e salvamento no cofre com um player inserido na nota. A captura temporária do microfone é convertida localmente para MP3 antes de salvar; gravações WebM já existentes continuam sendo reconhecidas e reproduzidas. O player prepara o arquivo antes de liberar a reprodução e mostra o tempo atual e a duração total.
- As gravações são salvas em `.notes-md/audio/` e referenciadas no Markdown por um bloco HTML de áudio; o arquivo binário permanece separado do texto.
- Preferências, estado de interface e cofres recentes são mantidos no armazenamento local do aplicativo, incluindo `localStorage`.
- O Pomodoro mantém configuração, sessão, histórico e progresso em arquivos JSON no perfil local do aplicativo.
- O índice de notas e conexões é calculado para uso do app; não há atualmente um banco de dados único que seja a fonte das notas.
- Ainda não há biblioteca de mídia, transcrição, importação de áudio externo ou organização avançada das gravações.

Essas informações descrevem a implementação encontrada no projeto e podem mudar conforme o app evoluir.

## Proposta de armazenamento

### Arquivos do cofre como conteúdo principal

Manter as notas em Markdown e guardar os arquivos de mídia no próprio cofre, em uma pasta organizada para anexos. A nota referencia esses arquivos por caminhos relativos, para que links continuem funcionando quando o cofre for movido ou sincronizado.

Exemplo ilustrativo:

```text
Meu Cofre/
├── Projetos/
│   └── Pesquisa.md
└── _assets/
    └── Projetos/
        ├── pesquisa-capa.webp
        └── entrevista-2026-11-25.m4a
```

Uma nota pode apresentar uma imagem com a sintaxe Markdown padrão e, quando houver suporte, incluir um link de áudio reproduzível. O formato exato de incorporação deve ser validado para manter compatibilidade com outros editores Markdown.

O nome e a localização definitivos da pasta de anexos ainda devem ser definidos. A proposta acima é uma convenção inicial, não uma migração já aprovada.

### Banco local para catálogo e relações

Não mover o conteúdo das notas para um banco de dados. Se a evolução do produto precisar de consultas e histórico mais ricos, introduzir um banco local — por exemplo, SQLite — apenas para metadados, índices e estado auxiliar.

Um banco local pode ser útil para relacionar uma mídia a várias notas, encontrar conteúdo sem percorrer manualmente cada arquivo e montar uma biblioteca organizada. Esse banco não substitui os arquivos Markdown. Ele poderia guardar:

- identificadores estáveis de cofres, notas e mídias;
- caminho relativo, tipo de mídia, MIME, tamanho, hash e datas de criação/importação;
- relações entre notas e mídias, com posição e contexto de uso quando necessário;
- duração e data de gravação de áudios;
- dimensões e dados de miniaturas de imagens;
- origem e URL de vídeos ou embeds externos, título e metadados de apresentação;
- estado de transcrição, somente quando esse recurso futuro for definido;
- fila de sincronização, conflitos e informações de disponibilidade offline, se necessário;
- dados estruturados de relatórios e recursos que hoje usam JSON, após uma migração planejada.

O banco deve ser reconstruível a partir dos arquivos e das referências sempre que possível. Caminhos relativos evitam depender do local absoluto do cofre. Áudios, imagens e vídeos locais ficam como arquivos binários, não como grandes blocos dentro do banco. A nota Markdown continua sendo a fonte do texto e das referências que o usuário escreveu; o banco complementa isso com relações e metadados para navegação e organização.

### O que fica em cada lugar

| Conteúdo | Local recomendado | Fonte principal |
| --- | --- | --- |
| Texto e estrutura da nota | Arquivo `.md` no cofre | Arquivo Markdown |
| Imagem, gravação e vídeo local | Arquivos no cofre | Arquivo original |
| Referência da mídia dentro da nota | Link relativo ou bloco Markdown compatível | Arquivo Markdown |
| Mídias ligadas a várias notas | Relação no banco local, refletida nas referências existentes | Referências nas notas; catálogo como índice |
| URL e dados de apresentação de embed externo | Referência no Markdown e metadados no banco/cache | URL e referência na nota |
| Índice de busca, dimensões, duração e miniaturas | Banco local ou cache | Recalculável pelos arquivos quando possível |
| Tema, atalhos e preferências da interface | Perfil local do aplicativo | Configuração local; pode ser exportada e importada pelo usuário |
| Histórico de Pomodoro e progresso | Atualmente arquivos JSON no perfil local | JSON atual; banco pode ser avaliado depois |
| Transcrição, se adicionada no futuro | Arquivo de texto associado ou campo no Markdown; catálogo guarda estado e vínculo | Formato portátil a definir |

## Experiência de áudio integrada às notas

O áudio será criado dentro do aplicativo para registrar notas faladas, resumos e episódios ou trechos de podcast. Na primeira etapa, o escopo fica em gravar e manipular a mídia produzida no próprio Notes MD. Transcrição automática é uma possibilidade futura, mas não faz parte desta etapa. O conteúdo continua ligado ao fluxo de conhecimento: pode nascer a partir de uma nota, ser associado depois a uma ou mais notas e ser encontrado pela biblioteca de mídia.

Fluxo implementado para a primeira etapa:

1. O usuário inicia uma gravação a partir da nota atual ou escolhe uma nota antes de começar.
2. A gravação fica vinculada à nota selecionada mesmo se o usuário navegar para outra parte do app.
3. O usuário pode pausar, continuar, concluir, ouvir uma prévia, salvar ou descartar.
4. Ao salvar, o áudio é gravado como arquivo no cofre e a nota recebe uma referência reproduzível.
5. A nota mostra um player compacto para reproduzir, pausar e consultar informações básicas, como duração e data.

O app deve permitir que uma gravação seja vinculada a mais de uma nota sem duplicar o arquivo. A tela de gravação pode oferecer um título e uma categoria opcional — por exemplo, nota falada, resumo ou podcast — mantendo a nota como contexto e destino principal. A transcrição permanece fora deste fluxo inicial e poderá ser avaliada em uma etapa futura.

Gravações em andamento devem usar um arquivo temporário e só ser incorporadas ao cofre após confirmação. Se o app fechar inesperadamente, a recuperação de uma gravação incompleta deve ser considerada no desenho técnico. A permissão de microfone precisa ser solicitada no momento em que o usuário começar a gravar.

Uma visão geral de mídias pode ajudar a localizar arquivos depois, com filtros por tipo, data, nota relacionada e origem. A biblioteca deve abrir o contexto das notas vinculadas, permitir criar novos vínculos e evitar cópias desnecessárias. Ela é uma forma de organizar o conteúdo das notas, não uma área independente que concorra com elas.

## Imagens, vídeos e embeds

Fluxo proposto:

- inserir imagem por arquivo local, arrastar e soltar ou URL;
- mostrar uma prévia na nota e permitir abrir em tamanho maior;
- manter o arquivo original no cofre e criar referências relativas;
- oferecer operações de edição sem alterar o original silenciosamente;
- avisar quando uma referência estiver quebrada e permitir localizar novamente o arquivo.

Imagens já podem ser referenciadas nas notas e sua experiência pode evoluir dentro do fluxo de edição. Vídeos locais, YouTube e embeds de outros sites ficam como possibilidades futuras, fora do foco da primeira etapa de mídia. Quando esse tema voltar, será necessário definir suporte por plataforma, disponibilidade offline e comportamento quando um site bloquear a incorporação. Para conteúdo externo, a direção é guardar a URL e não baixar ou copiar o vídeo automaticamente.

Uma mídia local pode aparecer em várias notas por meio de referências ao mesmo arquivo. A futura visão de mídia pode reunir imagens, áudios e, quando esse escopo for retomado, vídeos locais e embeds externos, com filtros por tipo e notas relacionadas. A organização deve manter visível de quais notas cada item faz parte.

Recorte, rotação, anotação e redimensionamento podem gerar uma nova versão derivada ou substituir o original mediante escolha explícita. A política de edição e preservação do original permanece em aberto.

## Identidade, vínculo e mudanças de arquivos

Notas e anexos devem ter uma identidade estável no catálogo local, mas os arquivos precisam continuar fáceis de entender e mover manualmente. O vínculo pode combinar o identificador interno com o caminho relativo legível no Markdown.

Ao renomear ou mover uma nota pelo app, os links de anexos associados precisam continuar válidos. Quando um arquivo for movido fora do app, o sistema deve detectar referências indisponíveis e oferecer reparo sem apagar o histórico. A exclusão de anexos deve avisar quais notas os referenciam e usar recuperação compatível com a política de exclusão do app.

## Google Drive, sincronização e uso offline

O direcionamento inicial é manter notas e gravações de áudio dentro do cofre. Assim, quando o cofre estiver numa pasta sincronizada pelo Google Drive, esses arquivos podem ser sincronizados junto com o restante do conteúdo. Os áudios devem usar uma pasta gerenciada dentro do cofre e referências relativas nas notas, sem depender de um caminho absoluto do computador.

Há uma distinção importante no funcionamento atual: preferências do aplicativo — como tema, atalhos, estado de janelas e alguns dados de interface — ficam no perfil local do Notes MD, fora do cofre. Portanto, sincronizar o cofre pelo Drive sincroniza notas e arquivos presentes nele, mas não sincroniza automaticamente as configurações locais atuais do aplicativo.

Exportação e importação de personalizações entre instalações ficam fora do foco atual e serão retomadas depois da implementação de áudio.

Quando esse tema for retomado, será necessário decidir quais preferências portáveis incluir e como excluir estado específico do dispositivo, como posição e tamanho de janelas, caminhos absolutos, cofres recentes e estado de sessões em andamento.

O histórico e as configurações do Pomodoro também ficam atualmente no perfil local. Exportar/importar esses dados pode ser uma opção separada, pois envolvem histórico pessoal e estado que podem exigir regras próprias de mesclagem.

O suporte futuro para Android deve distinguir arquivos disponíveis no dispositivo dos arquivos apenas na nuvem, permitir trabalho offline e tratar conflitos de edição.

Sincronização não deve ser implementada como simples substituição silenciosa de arquivos. Antes de suportar escrita por API do Drive, será necessário definir resolução de conflitos, retomada de upload, remoções e comportamento quando duas versões da mesma nota forem alteradas em dispositivos diferentes.

## Integridade, portabilidade e recuperação

- Salvar notas e anexos com operações seguras, evitando referências para arquivos ainda não concluídos.
- Evitar que gravações longas sejam embutidas em Base64 no Markdown.
- Preservar nomes e caminhos relativos previsíveis e compatíveis com outros sistemas.
- Detectar anexos sem referência e referências sem arquivo; não apagar automaticamente dados sem uma ação clara do usuário.
- Considerar cópia de segurança de banco e arquivos juntos, mas permitir reconstruir o catálogo a partir do cofre.
- Tratar arquivos duplicados por hash como sugestão de economia, nunca como mesclagem automática que possa perder contexto.
- Registrar datas em formato consistente e converter para o fuso local apenas na apresentação.

## Decisões ainda em aberto

Estas perguntas serão resolvidas em conversa antes de fechar o escopo de produto:

1. **Áudio:** quais metadados e controles são essenciais para gravar e organizar notas faladas, resumos e podcasts?
2. **Local das gravações:** o app deve salvar em uma pasta gerenciada dentro do cofre, permitir escolher uma pasta livre, oferecer uma pasta padrão configurável, ou combinar essas opções?
3. **Vínculo com notas:** toda gravação deve pertencer a uma nota, ou pode existir primeiro na biblioteca e ser associada depois?
4. **Imagens:** além de inserir e visualizar, quais edições são essenciais inicialmente — recorte, rotação, anotação ou redimensionamento?
5. **Biblioteca de mídia:** quais visualizações e filtros são mais úteis para encontrar mídia e entender suas relações com as notas?
6. **Banco local:** SQLite deve entrar desde a primeira versão multimídia ou somente quando o catálogo e as relações entre notas e mídias exigirem consultas estruturadas?
7. **Sincronização Android:** qual será a primeira experiência: abrir uma pasta sincronizada localmente, integrar com Google Drive, ou oferecer ambas em etapas?
8. **Formatos:** quais formatos de áudio e imagem precisam ser suportados em cada plataforma?

### Opções para armazenar gravações

| Opção | Como funciona | Vantagens | Pontos de atenção |
| --- | --- | --- | --- |
| Pasta gerenciada dentro do cofre | O app salva em uma pasta de áudio do cofre e cria referências nas notas | Portável junto do cofre, funciona bem com sincronizadores de pasta e mantém o áudio próximo do conhecimento | A pasta pode aparecer em outros exploradores; sincronização de arquivos grandes pode demorar |
| Pasta escolhida pelo usuário | Cada pessoa define qualquer local no computador | Flexibilidade e controle direto sobre o destino | O local pode ficar fora do Drive/cofre; mover a pasta quebra vínculos e pode complicar o uso em outro dispositivo |
| Local padrão configurável | O usuário escolhe uma pasta padrão nas configurações; gravações podem usar esse local | Conveniente e controlável, sem perguntar a cada gravação | É preciso definir como transportar vínculos e encontrar arquivos quando o caminho deixa de existir |
| Armazenamento interno gerenciado pelo app | O app guarda gravações numa pasta própria do perfil e mostra referências dentro das notas | Fluxo simples, sem escolher diretório; bom para rascunhos e conteúdo que ainda será organizado | Não acompanha automaticamente o cofre/Google Drive e exige exportação ou backup próprio |

O direcionamento escolhido é manter gravações dentro do cofre, para que possam acompanhar as notas na sincronização de pastas, como o Google Drive. A primeira implementação usa a pasta gerenciada e oculta `.notes-md/audio/`; as notas guardam referências relativas para preservar os vínculos quando o cofre for movido para outro computador.

A opção de escolher uma pasta externa pode ser avaliada depois. Se adicionada, o app precisará deixar claro que arquivos fora do cofre não serão sincronizados automaticamente pelo Drive junto com as notas.

### Decisões já tomadas

- A primeira implementação multimídia terá áudio como foco principal: gravar e manipular mídias produzidas internamente no Notes MD, como notas faladas, resumos e podcasts.
- As gravações ficam em `.notes-md/audio/` dentro do cofre e são inseridas na nota como um player Markdown/HTML portátil; o arquivo de áudio não é embutido no banco nem em Base64 no texto.
- Novas gravações são armazenadas em MP3 (`audio/mpeg`); WebM permanece aceito para compatibilidade com gravações anteriores.
- Transcrição não faz parte da primeira etapa; poderá ser considerada no futuro como um recurso separado.
- Vídeos locais, YouTube e embeds da internet ficam como possibilidades futuras e não entram no escopo imediato.
- Por enquanto, gravações devem ficar dentro do cofre para poderem acompanhar as notas na sincronização em nuvem configurada pelo usuário.
- Preferências do aplicativo continuam locais. Exportação/importação delas será avaliada depois da implementação de áudio.

## Direção recomendada para a primeira entrega

1. Priorizar gravação e reprodução de áudio criado dentro do Notes MD, associado a uma ou mais notas.
2. Salvar gravações dentro de `.notes-md/audio/` e manter vínculos relativos nas notas.
3. Manter arquivos de áudio fora do banco de dados e usar um catálogo local apenas se necessário para relações, busca e filtros.
4. Oferecer uma biblioteca de áudio ligada às notas como forma complementar de localizar e organizar gravações.
5. Evoluir imagens dentro do contexto das notas sem bloquear o trabalho prioritário de áudio.
6. Manter transcrição fora da primeira etapa e avaliar depois como recurso separado.
7. Retomar vídeos locais e embeds externos em uma etapa futura.
8. Retomar exportação e importação de preferências depois de concluir a primeira etapa de áudio.

Essa ordem preserva a portabilidade dos dados e permite validar o uso de mídia sem transformar o Notes MD em um gerenciador genérico de arquivos.
