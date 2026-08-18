---
tags: [leela, handoff, modalidades, s316, e04, onda-c, leva22]
aliases: [Handoff MODALIDADE-BUILD]
atualizado: 2026-08-17
---

# Handoff · MODALIDADE-BUILD (onda C da leva 22)

- **Trace:** `leela-redesign-v2-20260810` · lane `MODALIDADE-BUILD`
- **Worktree:** `C:\dev\leela-wt-modalidade`, branch `modalidade-build`
- **Escopo:** S316 inteira, re-ancorada no desenho pai/filho da leva 22
- **Estado:** seis das sete tarefas no ar; **T5 aberta**, com a razão escrita abaixo

## O que nasceu

O cadastro de modalidade, que era a cobrança do dono: *"já perdi as contas em dizer que
não consigo encontrar onde adicionar modalidades num evento."*

**A porta única no servidor** — `functions/src/eventos/editarModalidadesEvento.ts`. Um
callable com as três operações, owner-only, transacional, com motivo obrigatório e trilha
em `auditoriaAcessos` no molde da RN-304.

**A aba Modalidades** — `apps/painel/src/routes/eventos/lotes/`. O bloco por modalidade já
existia (era ele quem agrupava); o que faltava era o nível de cima **ter ações**. Agora
tem: "Adicionar modalidade" no topo, renomear e remover por bloco, e modalidade sem lote
deixa de ser tabela vazia e vira o convite, com o botão que resolve.

## As sete tarefas

| Tarefa | Estado | Onde |
|---|---|---|
| `S316-T1` · porta única (RN-500) | ✅ | `functions/src/eventos/editarModalidadesEvento.ts` |
| `S316-T2` · renomear migra cinco alvos num commit (RN-501) | ✅ | mesma Function, uma transação |
| `S316-T3` · remover recusa nomeando quem impede (RN-502) | ✅ | kernel do core + `ConfirmModal` |
| `S316-T4` · a tela pai/filho | ✅ | `lotes/LotesView.tsx`, `lotes/ModalidadeModal.tsx` |
| `S316-T5` · evento degradado (RN-505) | ⚠️ **metade** | ver §"O que ficou aberto" |
| `S316-T6` · docId opaco para lote novo | ✅ | `lotes/_lib/loteForm.ts` |
| `S316-T7` · renome da aba + morte dos textos de lacuna | ✅ | `eventos/_lib/subnav.ts:36` |

## Telas e fluxos

**Aba Modalidades** (`/eventos/{slug}/lotes` — a rota **não** mudou):

1. Cabeçalho com "Adicionar modalidade" quando o evento não vendeu; quando vendeu, o botão
   some e a tela **diz por quê**, incluindo que PIX pendente conta e que preço e vaga de
   lote seguem editáveis.
2. Um bloco por modalidade, com preço vigente, lote ativo, a tabela de lotes intacta, e dois
   ícones novos no topo-direita: renomear e remover.
3. Modalidade sem lote: `EmptyState` com "Configurar o primeiro lote". É o conserto do
   círculo fechado — a pergunta "qual delas ainda não tem preço?" passa a ter resposta na
   tela.
4. Evento sem modalidade nenhuma: convite para criar a primeira, no lugar do texto que
   mandava embora.
5. Bloco de modalidade **órfã**, marcado com `Badge` "Fora da lista do evento", explicando
   que nenhuma edição daqueles lotes é gravada e oferecendo o caminho de volta.

**`ModalidadeModal`** — acrescentar e renomear. Nome, sugestões (as mesmas da criação de
evento), motivo, e no renome um `Alert` com o que muda e o que fica, antes do gesto.

**`ConfirmModal` de remoção** — consequências nomeadas antes do gesto, campo de motivo
opcional, e a recusa do servidor ocupando o slot do alvo, com o diálogo **aberto**.

## A decisão de migração dos eventos existentes

**Nenhum documento foi migrado, e não havia o que migrar.** A hierarquia pai/filho já era
verdade no modelo desde sempre: `Lote.modalidade` é campo obrigatório, a Rule
`modalidadeExisteNoEventoPai` exige que a modalidade conste da lista do pai no create **e**
no update, e o docId do lote até embutia o nome dela. O produto sempre foi pai e filho — a
tela é que mostrava só os filhos. Inventar um campo ou reescrever documento vivo para
"implantar" a hierarquia teria sido trabalho inventado, com risco em cima de dado do dono.

O que a lane achou é o **oposto de uma migração: a tela antiga escondia lote.** Ela fazia
`lotes.filter(l => l.modalidade === m)` sobre `evento.modalidades`, então um lote cuja
modalidade saiu da lista sumia — sem erro, sem aviso, com o preço dele ainda no banco e a
Rule impedindo qualquer conserto. A compat entregue é de **leitura**: o bloco órfão volta a
aparecer, marcado, com o caminho de recuperação, e o organizador decide. **A regra morde na
escrita, nunca na leitura** — a mesma disciplina da RN-559 e da RN-576, e a lição que a
SERV1-BUILD já pagou. Zero escrita silenciosa em documento vivo.

O único caminho que ESCREVE em documento existente é o rename, e ele é a RN-501 na letra:
cinco alvos numa transação, pai e filhos no mesmo commit, docId intocado.

## Números reais dos gates

| Gate | Resultado |
|---|---|
| `tsc --noEmit` · core | **0 erros** |
| `tsc --noEmit` · api-client | **0 erros** |
| `tsc --noEmit` · functions | **0 erros** |
| `tsc --noEmit` · painel | **0 erros** |
| `eslint --max-warnings 0` · core, api-client, functions, painel | **0** nos quatro |
| `functions` · `modalidadesCore.test.ts` | **37/37 verdes** |
| `painel` · fatia `eventos/lotes` | **109/109 verdes** (5 arquivos) |
| `painel` · fatias `eventos/lotes` + `_lib` + `novo` + `configuracoes` | **461/461 verdes** (34 arquivos) |
| `painel` · suíte completa | **ver §Fecho** |
| `node scripts/gate-canon.mjs` | **PASS**, sem bump de baseline |

**O gate-canon pegou uma coisa antes do commit**, e vale registrar: o primeiro corte do
`ModalidadeModal` subia `superficie-crua.painel` de 107 para 108 — uma caixa artesanal com
`bg-[var(--surface-sunken)]` para "o que muda / o que fica". Ela virou `Alert` canônico, que
é a peça do papel (§11 do cânone). A catraca só desce.

**Limite honesto de teste.** A suíte de emulator
(`functions/src/__tests__/editarModalidadesEvento.integration.test.ts`) está escrita e
**não foi executada nesta máquina**: `firebase-tools` 15 exige JDK 21 e a máquina tem
JDK 17 — a mesma limitação que a SERV1-BUILD declarou em 11/08. Ela é quem prova a
atomicidade real do Firestore sob falha injetada, e roda no CI, que provisiona Java 21. O
que roda verde em qualquer máquina são os 37 casos contra dublês, que cobrem as guardas, a
ordem delas, as recusas nomeadas e que as cinco escritas do rename vivem numa transação só.

## Régua da L-021, medida antes e depois

O job frequente desta tela é editar preço e vaga de um lote existente. **Antes:** abrir a
aba → clicar no ícone de editar na linha do lote. **Depois:** idêntico. A linha da tabela e
o `RowActions` dela não foram tocados; nada virou acordeão, nada foi colapsado, a
hierarquia cresceu ao redor do job, não por cima dele. Há teste congelando isso
(`LotesView.test.tsx` → *"L-021: editar um lote continua custando UM toque"*).

## Reaproveitamento — o que foi reusado e o que foi criado

**Reusado:** `MODALIDADES_MAX` (o teto que o `criarEvento` já aplicava, trazido para o core
para criação e acréscimo não derivarem); o molde inteiro do `ajustarCapacidadeLote` (guards,
transação, auditoria, `logger` de fallback); `ConfirmModal`, `Modal`, `Alert`, `EmptyState`,
`IconButton`, `SectionHeader`, `Chip`, `Stack`, `Badge` do DS; o `ModalidadeBloco` e a
`Table` de lotes, que já existiam; `SUGESTOES_MODALIDADE`, que era const local do
`EventoForm` e virou fonte única no core.

**⛔ Nenhum catálogo novo nasceu, e nenhum catálogo existente foi forçado.** A modalidade do
evento é **distância** (5k, 21k, Kids 1k) e é string livre por regra (RN-500); os catálogos
fechados do produto descrevem **esporte** — `MODALIDADES_CLUBE` (`clubs/clube-opcoes.ts`),
os pilares da RN-114 (`clubs/catalogo-acoes.ts`) e a tabela de 50 termos derivada do Strava
(ARENA-4, que hoje **só existe em spec**, `2026-08-12-decisoes-dono/02-tabela-modalidades.md`,
sem uma linha de código). O próprio produto já registra a distinção:
`apps/landing/lib/esporte.ts` abre dizendo que *"`modalidades: string[]` guarda as
DISTÂNCIAS, não o esporte praticado"*. Fechar a lista quebraria evento vivo.

**Criado:** `packages/core/src/eventos/modalidades.ts` (kernel puro),
`functions/src/eventos/editarModalidadesEvento.ts`,
`packages/api-client/src/eventos/modalidades.ts`,
`apps/painel/.../lotes/ModalidadeModal.tsx`, `.../lotes/_lib/modalidadeForm.ts`.

## RNs consumidas

**Nenhuma.** A rodada já tinha selado RN-500, RN-501, RN-502 e RN-505, e o renome cai na
régua da RN-399. Faixa conferida por grep de `RN-577` a `RN-579` sobre o corpus fora do
índice: **zero definições** — os retornos são prosa de rodadas anteriores descrevendo as
próprias varreduras. **A próxima livre continua sendo a 577.**

## O que ficou aberto, e por quê

**`S316-T5` — o reparo do evento degradado (RN-505).** A metade que valia risco está no ar e
provada: **a edição nunca escreve a partir da projeção degradada.** O contrato do callable
recebe o NOME e a operação, jamais a lista, e há teste que manda um payload com
`modalidades: []` — exatamente o que `eventoDegradado` produziria — e prova que nada é
apagado; o acréscimo usa `arrayUnion`, que não sobrescreve o que outra aba escreveu.

A metade que falta é **a tela do reparo, e ela não mora nesta aba.** A degradação só existe
na listagem de eventos, e a leitura pontual mantém o fail-fast de propósito (afrouxar
`getEvento` segue recusado por escrito). Construí-la exige três coisas fora do território
desta lane: marcar a projeção degradada, dar afordância na linha do hub, e abrir um caminho
de LEITURA que não passe pelo `parseEvento`. Meia tela subindo junto seria pior que a tarefa
registrada.

⚠️ O aceite da onda C na rodada não a inclui — os nove itens do aceite da spec e os cinco da
fila são todos de T1 a T4, T6 e T7. Ela fica no `V1-KANBAN` como a única tarefa aberta da
onda.

## Telas para o gate visual do maestro (L-011)

Nenhuma foi vista renderizada — esta lane rodou sem navegador, por instrução do brief.

1. **`/eventos/{slug}/lotes`** — a aba renomeada, evento **sem venda**, com modalidades e
   lotes. Conferir: o rótulo "Modalidades" no menu secundário; o botão primário no topo; os
   dois ícones no cabeçalho de cada bloco (contraste AA por estado nos três temas, e o
   ícone-sem-texto com nome acessível).
2. **`/eventos/{slug}/lotes`** — mesma tela com uma **modalidade sem lote**. Conferir o
   `EmptyState` dentro do `Card` (dois níveis de superfície empilhados — é o caso que pode
   ficar feio no `wine`).
3. **`/eventos/{slug}/lotes`** — evento **com venda**. Conferir que o botão sumiu e que a
   frase que explica o congelamento não lê como erro.
4. **`/eventos/{slug}/lotes`** com **modalidade órfã** — o `Badge` "Fora da lista do evento"
   ao lado do nome e o botão de recuperação no rodapé do bloco.
5. **`ModalidadeModal`** em modo **acrescentar** — campo, chips de sugestão, motivo.
6. **`ModalidadeModal`** em modo **renomear** — o `Alert` de consequências dentro do modal
   (aninhamento de superfície: `Alert` dentro de `Modal`).
7. **`ConfirmModal` de remover modalidade** com a **recusa nomeada** preenchida — o `Alert`
   no slot do alvo, acima das listas de consequência. É a tela mais densa da onda.
8. **`/eventos/{slug}/configuracoes`** — a copy nova do bloco "Data e modalidades".
9. **`/eventos/novo`** — a copy nova do cabeçalho.
10. **375px** em todas as anteriores: o cabeçalho do bloco tem nome, badge, preço vigente e
    três controles na mesma fileira, e é onde ele quebra.

## Estado da árvore

Commits na branch `modalidade-build`, `--no-ff` na `main`. ⛔ **Nada no ar:** `dist/` e
`dist-mock-campeche/` da árvore principal **não foram tocados** — o rebuild é do maestro
depois do merge, e o dono estava validando os previews durante a lane.
