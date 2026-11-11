# 🛠️ Guia de Comandos e Versionamento do Projeto

Este guia prático serve como referência rápida para qualquer pessoa que queira rodar, testar, alterar ou contribuir com o código do **Notes-MD**.

---

## 💻 1. Comandos Principais no Terminal

Todos os comandos devem ser executados na raiz da pasta do projeto através do seu terminal favorito (PowerShell, Bash, Git Bash ou terminal do VS Code).

| Comando | O que ele faz? | Quando usar? |
| :--- | :--- | :--- |
| `npm run dev` | Abre o Notes-MD em **modo de desenvolvimento** com recarregamento em tempo real (Hot Reload). | Sempre que você estiver alterando o código e quiser ver as mudanças imediatamente na tela. |
| `npm test` | Executa a suíte de **testes unitários automatizados** com o Vitest. | Antes de salvar ou commitar qualquer alteração para ter certeza de que nada quebrou. |
| `npm run typecheck` | Executa o compilador TypeScript para verificar se todos os tipos de dados estão corretos. | Para validar a integridade estática do código sem rodar a aplicação inteira. |
| `npm run build` | Compila o aplicativo e gera os pacotes otimizados para produção na pasta `out/`. | Quando você quiser testar a versão final pronta para distribuição. |
| `npm run dist:dir` | Compila e empacota o aplicativo descompactado em `release/win-unpacked/`. | Para testar rapidamente o executável final sem gerar instalador. |
| `npm run dist:win` | Compila e gera o instalador atualizável (`Notes-MD-Setup-*.exe`) e portátil em `release/`. | Sempre que quiser gerar ou atualizar o executável estável no Windows. |
| `npm run dist:win:ci` | Gera o instalador e os manifestos (`latest.yml`, `.blockmap`) sem publicar diretamente (usado pelo CI). | Uso automatizado pelo `semantic-release` no GitHub Actions. |
| `npm run commit` | Abre o assistente interativo do **Commitizen** no terminal para montar uma mensagem de commit perfeita. | Sempre que você for criar um novo commit no Git. |
| `npm run release:dry-run` | Simula a análise do **Semantic Release** sem criar tags ou publicar no GitHub. | Para conferir qual será a próxima versão gerada a partir dos commits. |

---

## 📦 2. Ciclo de Versões em Estágio Alpha (Pré-v1.0.0)

O Notes-MD segue o padrão de **Versionamento Semântico (SemVer)** adaptado para projetos em fase ativa de evolução inicial:

> [!IMPORTANT]
> **Fase Alpha Pré-Lançamento**:
> Até que o autor ([Cristofer Vargas](https://github.com/Cristofer-Vargas)) considere que o aplicativo atingiu maturidade completa para lançamento geral, todas as versões permanecem identificadas no ciclo **Alpha**:
> - **Versão Atual**: `0.1.0-alpha.1`
> - **Tags de Release**: `v0.1.0-alpha.1`, `v0.1.0-alpha.2`, etc.

### Como as versões sobem de número?
- **Correções e melhorias pequenas**: sobe o sufixo alpha (`0.1.0-alpha.1` ➔ `0.1.0-alpha.2`).
- **Grandes novos módulos ou refatorações**: sobe o número secundário (`0.1.0-alpha.X` ➔ `0.2.0-alpha.1`).
- **Versão Oficial `1.0.0`**: apenas quando o aplicativo for considerado estável e pronto para lançamento ao público geral.

---

## 🏷️ 3. O Padrão de Semantic Commits (Commitizen)

Para manter o histórico do Git limpo, profissional e fácil de auditar, utilizamos a convenção mundial do **Conventional Commits**:

```text
tipo(escopo): descrição no imperativo em português

[corpo detalhado explicando o motivo da mudança e o que foi feito]
```

### Principais Tipos de Commit:
- **`feat`** (*Feature*): Criação de algo novo para o usuário (ex: nova janela flexível, novo modal).
- **`fix`** (*Correção*): Conserto de algum bug ou comportamento indesejado.
- **`docs`** (*Documentação*): Criação ou melhoria de arquivos como `README.md` ou manuais na pasta `doc/`.
- **`style`** (*Estilo visual*): Ajuste de cores, temas (como paleta Dracula), fontes e margens, sem alterar lógica de código.
- **`refactor`** (*Refatoração*): Limpeza ou reorganização de código interno sem mudar a funcionalidade.
- **`test`** (*Testes*): Criação ou ajuste de testes automatizados unitários.
- **`chore`** (*Manutenção*): Ajustes de arquivos de configuração, dependências ou regras de `.gitignore`.

### Exemplo de Commit Real do Notes-MD:
```text
feat(workspace): implementar suporte a janelas flexíveis lado a lado e em cascata

- Adiciona componentes EditorWorkspace e EditorPaneView.
- Permite arrastar abas entre janelas e redimensionar a proporção da tela.
- Implementa fechamento automático da janela ao esvaziar suas notas.
```

---

## 🤖 4. A Skill Automatizada: `git-semantic-workflow`

Se você estiver utilizando um assistente de IA configurado com o Antigravity neste repositório, basta pedir:

> *"Pode commitar as mudanças e dar push para o GitHub"*

O assistente ativará automaticamente a skill [.agents/skills/git-semantic-workflow/SKILL.md](../.agents/skills/git-semantic-workflow/SKILL.md), executando sozinho:
1. Validação de testes (`npm test`) e tipos (`npm run typecheck`).
2. Limpeza de arquivos temporários respeitando o `.gitignore`.
3. Bump da versão Alpha no `package.json` se for uma release.
4. Redação de mensagem semântica completa e descritiva em português.
5. Criação de tags de release (`v0.x.y-alpha.z`).
6. Sincronização automática com o GitHub (`git push origin main --tags`).
