# Handoff selado · SPEC-ADMIN-VISAO

- **trace_id:** `leela-admin-visao-20260809`
- **empresa:** software-forge · perfil `sf-cto`
- **natureza:** SPEC (docs somente — zero código, zero mudança em rules, zero leitura de produção)
- **repo:** `C:\dev\LEELA` · branch `main`
- **rodada:** `leela-specs/02-rodadas/2026-08-09-admin-visao/`

## Estado

🏁 **Selado.** Quatro entregáveis, épico atualizado na mesma aterrissagem, cards no board, cinco
vetáveis no painel canônico do dono.

## Entregas

| # | Arquivo | Commit |
|---|---|---|
| 01 | `leela-specs/02-rodadas/2026-08-09-admin-visao/01-ordem-do-dono.md` | `e45bba83` |
| 02 | `leela-specs/02-rodadas/2026-08-09-admin-visao/02-inventario-gap-map.md` | `da4869c8` |
| 03 | `leela-specs/02-rodadas/2026-08-09-admin-visao/03-spec.md` | `26924733` |
| 04 | `leela-specs/02-rodadas/2026-08-09-admin-visao/04-fila-build.md` | `1a4307d2` |
| — | E16 + `V1-KANBAN` + `BOARD-EPICOS` + `DECISOES-ABERTAS` | `3672ff86` |

**Números:** 4 histórias novas (S1612 a S1615), 6 RNs novas (RN-537 a RN-542), 23 tarefas em 5 ondas,
5 vetáveis (ADMINVISAO-1 a 5). O painel do dono foi de 25 para **30** itens abertos — contagem
conferida à mão contra as duas seções (26 + 4).

## O que a conferência campo a campo devolveu

A hipótese do dono ("temos isso no banco") foi tratada como hipótese. Resultado:

**Ele estava certo em nove dos onze itens, na camada que não podia ver.** O `platform_admin` já
cruza a fronteira em `eventos` (`firestore.rules:744`), `clubes` (`:2018`), `atletas` (`:2812`),
`profissionais` (`:2922`), `pagamentos` (`:2530`), `pedidos` (`:2671`), `inscritos` (`:931`) e
`tenants` (`:154`). As duas listas globais de eventos e clubs são coleções raiz e a consulta passa
hoje. **Nenhuma Security Rule precisa ser aberta por esta spec.**

**Quatro achados de código que dimensionam a fila:**

1. `recomputePlatformRollups` **não tem cron** — é `https.onCall` puro. `/plataforma/macro` mostra o
   retrato do último clique sem dizer que é isso. Virou RN-538.
2. `custoGateway`, `custoReal`, `receitaPlataforma` e qualquer cálculo de margem têm **zero
   ocorrências** em `packages/core`, `packages/api-client` e `functions/src` — existem só em spec. O
   `netValue` do Asaas é descartado de propósito (`asaasProvider.ts:1506`, com teste travando).
3. `crmClientes` (`firestore.rules:382`) é a única coleção tenant-scoped que **omite
   `isPlatformAdmin()` de propósito**, com a razão escrita na própria Rule. Virou RN-539: callable
   com Admin SDK, Rule intocada.
4. **Não existe nenhuma regra de `collectionGroup`** no arquivo, enquanto `firestore.indexes.json` já
   tem índices de CG servindo consumidores server-side. CG do cliente é negada até para admin, e o
   erro pareceria falta de índice.

**Dois itens em que "temos no banco" não se sustenta:** não há campo de **responsável** próprio do
tenant (só `ownerUid`), e não há **plano vivo** por tenant — `aplicarPlano` estampa e grava
`planoAplicadoId`, sem vínculo.

**Correção de premissa que muda o vocabulário de toda tarefa futura:** `apps/painel` **não é Next.js
app-router**. É Vite + React Router v6, rotas em `apps/painel/src/routes/plataforma/`, convenção
`XxxRoute.tsx` + `XxxView.tsx`. Está escrito na Parte 0 do inventário.

## Regras duras honradas

- **Dinheiro reconcilia com o cânone.** RN-537 fixa que a visão master lê o carimbo
  (`conciliacao.taxaValor`, `conciliacao.repasseOrganizador`, congelados pela RN-179) e nunca
  recalcula. A **RN-182 é mode-aware** e a spec diz isso em voz alta: no modo `repassada` o líquido do
  produtor é o **face cheio**, e aplicar `face − taxa` a todo mundo erraria todo evento repassado.
  Número que exigiria semântica nova (margem, custo) virou **vetável V-1**, com a coluna nascendo
  "custo não configurado" — nunca zero, nunca estimativa.
- **Juros não foi automatizado.** A correção do dono de 09/08 já é o comportamento vigente: o
  `jurosAoMes` é campo de dado no termo, e nenhum cron ou heurística o move. Nada nesta spec muda
  isso.
- **PII com escopo estrito.** RN-540: só `platform_admin` (conta separada, RN-449), **sem export nem
  CSV**, `pessoas` (CPF em claro) segue fechada, registro de acesso e da negativa. As duas decisões
  de PII (V-2 contato de cliente, V-4 CPF no diretório) subiram ao dono com default conservador
  proposto.
- **Abertura de rule é item de spec, nunca carona.** Nenhuma foi proposta. A única fronteira que a
  ordem encosta (`crmClientes`) vira callable, que é o caminho que a própria Rule recomenda por
  escrito.

## Premissas assumidas (registradas)

- **P-AV-1 · colisão de faixa de RN, detectada e resolvida antes do fecho.** A varredura de abertura
  achou o 5xx terminando em **529** e esta lane reservou **RN-530 a RN-535**. Durante a aterrissagem,
  a lane vizinha **RADAR-REPARO-0809** publicou o E20 consumindo **RN-520 a RN-536** (commit
  `d5d4221b`), atropelando a reserva. As seis regras foram **renumeradas para RN-537 a RN-542** em
  todos os sete arquivos, e a varredura foi refeita: por `RN-537` a `RN-560`, fora desta rodada,
  **zero ocorrências**. Lição de mecanismo, e ela vale para toda lane de spec: varredura de faixa
  vale no instante em que roda — com lanes vizinhas em voo, o intervalo entre reservar e commitar é
  onde a colisão nasce, e a conferência precisa ser refeita imediatamente antes da aterrissagem.
- **P-AV-2.** Numeração de histórias: `S1610` e `S1611` já em uso (kanban). Consumidas **S1612 a
  S1615**.
- **P-AV-3.** O `indice-de-regras-de-negocio.md` **não** foi tocado: estava modificado por outra lane
  em voo durante esta aterrissagem. A fonte canônica da RN é o épico (convenção dos boards), e o E16
  está atualizado. Registrar as seis RNs no índice quando a lane vizinha aterrissar.
- **P-AV-4.** Volume de dados não foi medido (leitura de produção fora de escopo). A decisão de
  paginação das listas globais assume ordem de grandeza desconhecida e por isso exige contagem
  honesta em vez de total truncado.

## Pendências que ficam com o dono

Cinco, todas no painel canônico `leela-specs/01-produto/DECISOES-ABERTAS.md` e detalhadas em
`03-spec.md §Parte 5`:

| # | Item | Natureza | Default proposto |
|---|---|---|---|
| V-1 | ADMINVISAO-1 · o que "faturamento gerado" nomeia | dinheiro | os três números nomeados, margem vazia |
| V-2 | ADMINVISAO-2 · clientes: comportamento ou contato | **PII** | só comportamento |
| V-3 | ADMINVISAO-3 · responsável é o dono da conta? | modelo | é o owner (sem campo novo) |
| V-4 | ADMINVISAO-4 · CPF no diretório | **PII** | manter `pessoas` fechada |
| V-5 | ADMINVISAO-5 · gatilho do aviso + saída da liberação direta | mecanismo | (a) ratificar RN-510 · **(b) sem default** |

## Dívida e lacunas registradas, sem carona

- **Claim de administrador com duas leituras.** Rules e core aceitam `role == 'platform_admin'` **ou**
  `platformAdmin == true`; quase toda guarda de callable compara `claims.role` na mão
  (`assertPlatformAdmin`, `aplicarPlano`, `setTaxaPlataformaGlobal`, `transitionTenant`,
  `provisionTenant`, `recomputePlatformRollups`). Conta com capacidade e sem papel legado lê tudo e é
  barrada em quase toda escrita. Card próprio no kanban, fora das ondas.
- **Três lacunas de teste** viraram tarefa porque as telas novas passam por elas: nenhum caso
  exercita `platform_admin` contra `crmClientes`; nenhum caso de `collectionGroup` com crachá de
  administrador; `pessoas` não tem caso nomeado com administrador.

## Dependências declaradas na fila

- **REDESIGN-DS** segura as quatro ondas de tela, e a dependência é maior do que o enunciado: o glass
  é atributo no `<html>` e os dois painéis são a **mesma aplicação**; além disso, desligar o glass
  devolve os tokens opacos do tema e **não produz fundo preto** — preto exige variante de superfície
  ou quarto tema. O dono escreveu "se possível" e mandou propor alternativa em vez de decidir em
  silêncio. A **onda 1 (backend) não depende disso** e pode sair já.
- **S1610** é dona de custo, carimbo e margem. Esta spec consome, não duplica nem antecipa.

## Disciplina cumprida

`git commit --only` com pathspec explícito em todos os cinco commits; `git status --short` conferido
antes de cada `add` (a árvore tinha `LEELA-E20`, `indice-de-regras-de-negocio` e `KICKOFF-BUILD` de
outras lanes, e nenhum entrou). Push a cada 2-3 commits. Zero arquivo fora de `leela-specs/`. Sem
navegador.
