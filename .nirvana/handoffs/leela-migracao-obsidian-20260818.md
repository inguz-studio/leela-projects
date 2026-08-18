# Handoff — MIGRACAO-OBSIDIAN (18/08)

- **trace:** `leela-redesign-v2-20260810` · squad `software-forge`
- **lane:** `MIGRACAO-OBSIDIAN` · leva 26 do dono
- **projeto:** `C:\dev\LEELA`, branch `main`, docs-only
- **status:** PAGA. Quatro commits na `main`, todos empurrados, `main == origin/main`.
- **código tocado:** nenhum. Zero deploy, zero valor de segredo em qualquer arquivo.

---

## 1 · O que a leva 26 pediu, e o que virou o quê

A fala de 18/08 ~01h tem três ordens. Esta lane cobriu duas; a terceira é da `DEPLOY-J4`,
que correu em paralelo.

| Ordem do dono | Onde aterrissou |
|---|---|
| "faça o deploy do que está pendente" | Lane `DEPLOY-J4`. Aqui ficou só o placeholder `## Estado do deploy` no doc, para ela preencher |
| "deixe tudo guardado no nosso obsidian, que está pendente" | `leela-specs/00-boards/MIGRACAO-DE-MAQUINA.md`, 521 linhas |
| "Se necessário, migre o obsidian para outro Github diferente" | Decidido: **não migra**. Registro e condição de reabertura na rodada de 18/08 |

## 2 · A decisão do GitHub, e por quê

**As specs continuam no mesmo repositório do código.** A condicional era do próprio dono
("se necessário"), e a medição diz que não é necessário: todo o contexto de produto já vive
em `leela-specs/` e já está em `inguz-studio/leela-projects`, com `main` idêntica ao `origin`.
O Obsidian não guarda nada por conta própria — ele lê o repo por duas junções locais.

Três razões, na rodada com o texto completo:

1. **Lockstep.** Rodada, RN e handoff são escritos contra um hash de commit do código.
   Separar cria dois relógios.
2. **O commit é a prova.** As lanes provam trabalho citando o commit que mudou spec e código
   no mesmo ato. Em dois repos, isso vira "confie em mim".
3. **A junção é barata.** O que quebra na troca de máquina é o atalho, não o conteúdo.

**Condição de reabertura, escrita e concreta:** se ele quiser consumir as specs sem clonar o
código (Obsidian no celular, Obsidian Sync, leitura por quem não é da engenharia), nasce um
espelho **somente leitura** de `leela-specs` em repositório próprio, alimentado por push a
cada merge na `main`. É configuração, não migração, e a fonte da verdade não muda. Basta pedir.

## 3 · O documento consolidado

`leela-specs/00-boards/MIGRACAO-DE-MAQUINA.md` — nove seções, e cada uma aponta para a casa
canônica em vez de duplicá-la.

| Seção | Contagem |
|---|---|
| Decisões pendentes do dono | **11** — 9 decisões + 2 ações, espelho compacto por link do painel |
| Fila de construção | **22** — 12 do doc canônico (3 delas do CTO humano) + 10 nascidas entre 13 e 18/08 |
| Gates visuais pendentes | **6** frentes |
| Buraco de registro | **1** — a fala da leva 21 |
| Bring-up | **9** passos |

O painel `01-produto/DECISOES-ABERTAS.md` **não foi tocado**. Continua com 11 itens, cabeçalho
de 3 linhas e sem ata. O `V1-KANBAN.md` também não foi tocado, de propósito: a `DEPLOY-J4`
estava em voo e o kanban é o arquivo de maior chance de colisão.

## 4 · Os três achados que valem por si

### 4.1 · A junção `LEELA-reports` aponta para fora do git

O Obsidian do dono lê o produto por duas junções:

| Junção | Alvo |
|---|---|
| `LEELA-specs` | `C:\dev\LEELA\leela-specs` — versionado, vem no clone |
| `LEELA-reports` | `C:\dev\LEELA\outputs\leela-build-2d6ee98d` — **ignorado por `.gitignore:10`** |

São 47 MB, 480 arquivos, 167 markdown e 267 imagens. **Num clone limpo essa junção nasce
apontando para o vazio.** A pasta `outputs/` entrou no inventário de cópia manual. Não a
commitei: o próprio `.gitignore` diz que a exclusão é deliberada ("remova esta linha se quiser
versionar as entregas"), e reverter isso por conta própria seria decisão de política de repo
tomada de lado.

### 4.2 · Os dois scripts de emulador resolvem o Java de maneira diferente

| Script | Como resolve |
|---|---|
| `scripts/mock-campeche.sh:48` | `${LEELA_JAVA_HOME:-$HOME/.jdks/jdk-21.0.11+10}` — aceita override |
| `preview.sh:26` | `$HOME/.jdks/jdk-21.0.11+10` **fixo**, sem override; linha 126 aborta se a pasta não existir |

Isso decide onde instalar o JDK 21 na máquina nova. Instalar em `~/.jdks/jdk-21.0.11+10`
faz os dois funcionarem sem editar nada; instalar no caminho padrão do sistema resolve só o
`mock-campeche.sh` (que é a `:4602`, a superfície de conferência do dono) e deixa o
`preview.sh` quebrado. Está escrito no passo 3 do bring-up com as duas saídas.

**Por que isso importa agora:** é a mesma limitação que travou o gate visual da rosca das
formas de pagamento. A máquina da lane S825 tinha JDK 17, o firebase-tools 15 recusa Java
abaixo de 21, o emulador não subiu e a tela nunca foi vista. Instalar o 21 direto no
computador novo mata a pendência na origem.

### 4.3 · O probe de varredura da fenda Rules × parse não existe

O handoff `leela-inscritos-read-fix-20260817.md` cita `scratchpad/probe-parse.mjs` como
pronto. **Essa pasta não existe no repo.** Os únicos probes versionados são de render
(Playwright), não de varredura de parse. Quem for varrer produção atrás de docs que o
`parseInscrito` recusa vai precisar reescrever o probe. Está nomeado no item 2 da fila do doc.

## 5 · Varredura de completude do push

`git status` devolveu artefato de registro fora do git em três frentes.

**55 handoffs ausentes.** Havia 231 rastreados e 55 não. Entre os que faltavam, registros que
o painel e o kanban citam **por caminho**: `leela-deploy-j3-20260816.md`,
`leela-navbar-fix-20260817.md`, `leela-barchart-fix.md`, `leela-kits-build-20260813.md`, os
cinco da diagnose do PIX e os dois do incidente da tela preta. Num clone limpo, esses links
morriam — e o computador novo nasceria com metade do rastro que o produto cita.

**Varredura de segredo antes do `add`**, em dois padrões sobre os 55 arquivos: chave de API,
service account, PEM, DSN, token de provedor; e atribuição de variável com valor longo sob
nome sensível (`API_KEY`, `SECRET`, `TOKEN`, `PASSWORD`, `ASAAS`, `BREVO`, `DSN`).
**Zero ocorrências.** São 800 KB de markdown, nenhum binário.

**Também entraram:** `leela-specs/KICKOFF-BUILD.md` (prompt de retomada da construção,
referenciado pelo plano de implementação), dois probes de captura reusáveis
(`.nirvana/gate-visual/probe-cred.mjs`, `probe-visual.mjs`) e as duas medições em json dos
filtros, que são a prova numérica citada pelo item FILTRO-ALTURA-1 do painel.

**Ficaram fora, de propósito:** `.nirvana/briefs/` e `.nirvana/logs/` (trace de execução, não
registro de produto) e 94 PNG somando 16 MB em `.nirvana/gate-visual/filtros-lista/` e
`.nirvana/shots/kits-build/` — prova de trabalho já pago, não de decisão pendente. Os 16 MB
entraram no inventário de cópia manual.

## 6 · Inventário fora do git — o que a próxima lane precisa saber

⛔ **Só nomes e paths foram escritos. Nenhum valor de segredo, em lugar nenhum.**

Quatro arquivos guardam valor secreto e migram **pelo dono, por canal seguro**:
`functions/.env.local`, `functions/.secret.local`, `functions/.env` e o `.env` da raiz. Os
nomes de chave de cada um estão no passo 6 do doc.

Dois fatos que aliviam o risco: em produção esses valores vivem no **Secret Manager do GCP**
(o `bundle-deploy.mjs` diz explicitamente que nada é copiado no bundle), e **não existe
nenhum arquivo de service account** no repo nem fora dele — a autenticação é por credencial
padrão derivada do `firebase login`, que se **refaz** na máquina nova em vez de se copiar.

Cerca de 4,5 GB não precisam atravessar: `node_modules/` (1,3 GB), `.firebase/` (1,9 GB),
`apps/landing/.next/` (1,2 GB), `.turbo/`, `functions-deploy/`, `functions/lib/`, os `dist/`
e os logs de debug (o `firebase-debug.log` sozinho tem 81 MB).

## 7 · Commits

| Hash | O que |
|---|---|
| `4c7e6ef3` | O registro da leva 26 na rodada `2026-08-18-migracao-de-maquina/` |
| `dc732c50` | Os 55 handoffs ausentes e o `KICKOFF-BUILD.md` |
| `41150f16` | Os dois probes de captura e as duas medições dos filtros |
| `09830f78` | `MIGRACAO-DE-MAQUINA.md` |

Todos com `git commit --only` sobre caminho explícito, nunca `-a` nem `add -A`, porque a
`DEPLOY-J4` corria na mesma árvore. Nenhum push foi rejeitado; nenhum `pull` foi necessário.

**Ponto de partida:** `82aea920`, já com `main == origin/main`.
**`main == origin/main`** ao fechar, comprovado por `git fetch origin` seguido de
`git rev-list --left-right --count main...origin/main`, que devolveu `0  0`.

## 8 · Fila que esta lane deixa nomeada

1. **A seção `## Estado do deploy` do doc está vazia**, esperando a `DEPLOY-J4`. Não preencher
   por fora dela.
2. **A pasta `outputs/` (47 MB) e as 94 imagens de gate visual (16 MB) precisam ser copiadas
   à mão** para o computador novo, ou a junção `LEELA-reports` nasce vazia.
3. **A leva 21 continua sem registro na íntegra.** A primeira lane que tiver a fala em mãos
   abre `# Leva 21` em `02-rodadas/2026-08-17-decisoes-dono/01-decisoes-dono.md` e corrige o
   ponteiro do card da MODAL-LOTE no kanban.
4. **Dois itens da fila não têm card no kanban** e vivem só em handoff: a desnormalização para
   o operador de credenciamento e os quatro modais com footer duplicado. Pela regra de captura
   da casa, são candidatos a sumir do board.
5. **Colisão de IDs no kanban:** S047 e S049 aparecem duas vezes, uma pela leva 22 e outra pela
   carga cognitiva.
6. **O `PREVIEW.md` aponta para um caminho de duas mudanças atrás**
   (`/c/Users/Vitor Eduardo/Desktop/Vaults/Projetos/LEELA`). Vale um fix de uma linha, mas ele
   toca um arquivo que outra lane pode estar servindo; ficou nomeado em vez de aplicado.
