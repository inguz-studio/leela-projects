# Onda C5 — parcerias, CRM e o relance adotam as peças da C0

**Trace** `leela-roadmap-componentes-20260810` · lane **CONTROLES-C5** · branch `controles-c5`
**Worktree** `C:\dev\leela-wt-controles-c5` (criado sobre `origin/main` @ `06b9da77`, a mesma base
que a CONTROLES-C4 deixou)
**Data** 2026-08-16 · sf-frontend-lead (software-forge)

Paga a **Onda C5** de `02-rodadas/2026-08-12-conformidade-controles/03-fila-em-ondas.md` — a
fatia de S006-T7 do épico `LEELA-E01-design-system` que cobre `§04.4` ("Falo com patrocinador |
Ter dados na mão") e `§04.1` ("acompanhar resultado de relance"). **Nenhum deploy.**

## As conversões, por família

| Família | Onde | Vira | Commit |
|---|---|---|---|
| barra de filtro à mão (5) | `InfluenciadoresPage:265`, `AssessoriasPage:174`, `MarcasPage:296`, `ClientesPage:108`, `HubEventos:99` | `FilterBar` | `5d4f25f9`, `5ece9d49`, `2bdece92`, `7f4b381e`, `da55180f` |
| contador de resultado (2) | `InfluenciadoresPage:274`, `MarcasPage:406` | `ResultCount` | `5d4f25f9`, `2bdece92` |
| `Select` de ordenação (1) | `ClientesPage:118` | padrão órfão — decidido, ver abaixo | `7f4b381e` + `2362dfe5` |

A fila resumiu a onda em "15 ocorrências"; a tabela própria da C5 (a que este handoff segue, como
C4 seguiu a sua) nomeia 5+2+1 = 8. `HubEventos` não tinha contador (a incerteza que a fila
registrou com "se existir" — não existe) nem `AssessoriasPage`. O órfão da C5 puxou uma nona peça
de trabalho que não estava no inventário original: a decisão do cânone em si.

## O veredito do órfão — `ClientesPage.tsx:118`

Decisão tomada **na onda**, como `03-fila-em-ondas.md` mandou (não sobe ao dono — não é dinheiro
nem dado pessoal, o default é técnico). Dos três destinos apontados — prop `sort` da `FilterBar`,
peça própria `SortSelect`, ou `Select` legítimo com linha nova no cânone —, o veredito é o
**terceiro**: ordenar não retira item da lista (não é filtro) e não vira dado de formulário, mas
É "escolha única, poucas opções, sem busca" — a forma que `Select` já cobre. `SortSelect` para um
único consumidor no produto inteiro violaria o reuso-primeiro que justificou as cinco peças da C0
(12-13 consumidores cada); a prop `sort` na `FilterBar` misturaria "reordena tudo" com uma peça
desenhada para "recorta por faceta".

Consequência: `"ordenar"` saiu de `prefixosDeFiltro` (config e default do plugin) — reordenar
declara papel diferente de filtrar, no mesmo rótulo que o autor escreve, e é esse rótulo que a
regra lê. A mudança vale para a categoria inteira (grep confirmou: `ClientesPage.tsx` era o único
consumidor com rótulo "Ordenar…" no repo, então não há risco de mascarar filtro disfarçado).
`03-canon/canone-de-componentes.md` §1 ganhou a linha "Ordenação de lista". Condição de
reabertura registrada em `eslint.config.mjs`: segundo consumidor de ordenação fora de formulário,
ou um `Select` "Ordenar por…" achado filtrando de verdade.

## O veredito do item de higiene — `be-hero.com.br` hardcoded

A fila (`03-fila-em-ondas.md`, seção final) citou o item **sem arquivo:linha**, herdado de
`leela-uxw-fix.md` (MEL-21 + um segundo caso irmão em `NovoClubePage.tsx:113`). C2 e C4 já tinham
recusado varrer por falta de escopo preciso; esta onda varreu o repositório inteiro (`apps/painel`,
`apps/landing`, `packages`) por `be-hero\.com\.br` e variantes.

**Resultado: zero ocorrência de produção fora do helper canônico.** Todos os hits reais são: (a)
`lib/linkPublico.ts`, a fonte única declarada por design; (b) fixtures/asserts de teste
(`TermosModal.test.tsx`, `fixtures.ts`, `PerfilPublicoEditor.test.tsx`,
`paginaVendasView.test.ts`); (c) comentários que **alertam contra** hardcodar, não que hardcodam
(`configForm.ts`, `paginaVendasView.ts`). Os dois casos nomeados em `leela-uxw-fix.md` —
`ClubeShell.tsx:56` (MEL-21) e `NovoClubePage.tsx:113` — **já não existem**: os dois importam
`linkClubePublico` de `lib/linkPublico.ts` há duas lanes. `git log` confirma a origem:
`0c4b7e3d` (`fix(painel): o endereco publico dos clubs sai do hardcode e le da fonte`, 11/08,
antes até do relatório MEL-21 datar a exceção como aberta), com adoção espalhada depois por
`c30b15a0` (SUBNAV) e `f742bd5f` (C4). **Item fechado, sem código a tocar.** Nenhuma linha da
onda toca este item — o veredito É o trabalho.

## Gates, do zero

| Gate | Resultado |
|---|---|
| `pnpm install --frozen-lockfile` | limpo |
| rebuild `core → design-system → api-client` (`tsup`) | limpo, os três |
| `tsc --noEmit` (painel) | limpo |
| `eslint src --max-warnings 0` (painel) | limpo |
| `eslint src showcase/src --max-warnings 0` (design-system) | limpo |
| `eslint app lib --max-warnings 0` (landing) | limpo |
| suíte direcionada das 5 telas tocadas + lint plugin | **6 arquivos · 75 casos**, verdes (5 telas · 50 casos + `leela-canon-plugin.test.mjs` · 25 casos) |
| `vitest run` — painel INTEIRO, em 5 fatias seriais (pós-rebuild) | **256 arquivos · 2876 casos**, verdes — ver tabela abaixo |
| `vitest run` — design-system INTEIRO (inclui `lint/**/*.test.mjs`) | **90 arquivos · 2084 casos**, verdes (inalterado) |
| `vite build --config showcase/vite.config.ts` | compila, 3318 módulos |
| `vite build --mode leela-hub` (painel) | compila, 4039 módulos, sem erro |
| `pnpm gate:canon` (antes da conversão) | `PASS`, baseline batendo com o que C0-C4 deixaram |
| `pnpm gate:canon` (depois da conversão, antes do `--atualizar`) | `PASS`, quatro contagens descendo |
| `pnpm gate:canon --atualizar` | baseline regravado, `47394888` |
| `pnpm gate:canon` (depois do commit de baseline) | `PASS`, zero delta |

### A suíte do painel, fatia por fatia

| Fatia | Arquivos · casos |
|---|---|
| `routes/eventos` | 83 · 953 |
| `routes/clubes` | 35 · 323 |
| `routes/plataforma` + `components` + `lib` + `shell` + `src/__tests__` | 70 · 786 |
| `routes/crm` + `parcerias` + `overview` + `conta` + `onboarding` + `_system` | 66 · 698 |
| `routes/__tests__` (fronteira-auth + navegacao-spa) | 2 · 116 |
| **total** | **256 · 2876** |

Bate exatamente com o número que a C4 fechou (256 · 2876) — nenhuma lane vizinha mudou a árvore
de testes entre o fechamento da C4 e o início desta.

## A catraca, antes/depois

`pnpm gate:canon --atualizar` (commit `47394888`):

| Contagem | Antes | Depois | Por quê |
|---|---:|---:|---|
| `barra-de-filtro-crua.painel` | 5 | **1** | as cinco conversões nomeadas; resta `AtendimentoPanel.tsx:265` (typeahead do balcão), fora de escopo — C0/C3 |
| `contador-de-resultado-cru.painel` | 7 | **5** | `InfluenciadoresPage` + `MarcasPage` |
| `padrao-reimplementado-fora-do-ds.total` | 4 | **3** | `HubEventos.tsx` sai da dívida — o `FiltroStatus` que colidia com o sinônimo de `FilterChips` deixou de existir (inlined, sem o wrapper redundante) |
| `filtro-fora-do-canone.total` | 1 | **0** | `ClientesPage.tsx` — decisão do órfão |

Todas as outras dezenove contagens ficaram no baseline que C0-C4 deixaram. Nenhuma subiu.

## Um desvio do plano da C0, decidido nesta onda

O comentário de dívida da C0 (`eslint.config.mjs`, `DIVIDA_PADRAO_REIMPLEMENTADO`) presumia que
`HubEventos.tsx` devia literalmente importar `FilterChips` para a dívida morrer. Não é bem assim:
`FilterChips` só produz o `<div role="group">` no ramo de **fileira** (menos de 4 opções); o ramo
de **dropdown** (4+) devolve `<FilterMenu>` puro, sem wrapper. A faceta de `HubEventos` tem 3
categorias reais — abaixo do limiar — e só cruza "4" porque o dono decidiu, em 2026-07-11, contar
"Todos" como um quarto estado (migração single→multi, documentada no cabeçalho do arquivo e
**travada em teste** — `HubEventos.test.tsx`, "filtro de status é um dropdown..."). Rotear pela
`FilterChips` de verdade (3 < 4) reverteria essa decisão em silêncio, trocando dropdown por
fileira de chips sem provocação nenhuma. Escolha de padrão é o critério 9 da rubrica de design
(`02-catraca-controles.md` §7: "é leitura humana... o gate que tentar isso produz falso
positivo"), e não é desta lane reabrir uma decisão do dono sem achado novo.

O conserto real: o `<div role="group" aria-label="Filtrar eventos por status">` amarrado à mão era
redundante — o `FilterMenu` já nomeia o próprio gatilho ("Status: Todos" / "Status: 2"). Removido,
com `FilterMenu` inlined direto no slot `facets` de uma `FilterBar`. O teste trocou
`getByRole('group', {name: ...})` por `getByRole('toolbar', {name: 'Filtros de eventos'})` — novo
landmark, zero mudança de UX ou de interação.

## Anti-carga

**0 passos hoje, 0 depois — procedência pura.** Nenhuma das 8 conversões muda fluxo, clique ou
passo. A decisão do órfão não move o `Select` de lugar na hierarquia visual, só troca o container
que o hospeda (do `<div className="flex flex-wrap items-end gap-...">` para `FilterBar`, slot
`actions`).

## Boards

- `leela-specs/03-canon/epics/LEELA-E01-design-system.md` — S006-T7 estendida com a C5.
- `leela-specs/00-boards/BOARD-EPICOS.md` — linha do S006 estendida com a C5.
- `leela-specs/00-boards/V1-KANBAN.md` — S006-T7 recebe o progresso da C5; segue `🔄` (C6 falta).

## Aterrissagem

| O que | Hash |
|---|---|
| `InfluenciadoresPage.tsx` | `5d4f25f9` |
| `AssessoriasPage.tsx` | `5ece9d49` |
| `MarcasPage.tsx` | `2bdece92` |
| `ClientesPage.tsx` | `7f4b381e` |
| decisão do cânone (órfão + dívida do HubEventos) | `2362dfe5` |
| `HubEventos.tsx` + teste | `da55180f` |
| baseline `gate-canon.baseline.json` | `47394888` |
| boards + épico | `ad2e70d0` |
| main re-puxada antes do merge | ver próximo passo |
| merge `--no-ff` na main | ver próximo passo |
| push | ver próximo passo |

Worktree removido ao final se a árvore ficar limpa.

## O que fica para as próximas ondas

- **C6 segue livre** (plataforma e administrativo) — a última onda da fila de 12/08. As cinco
  peças da C0 seguem provadas em mais 8 conversões nesta onda (44 no total entre C2-C5).
- **Prova renderizada nos dois temas (L-019), com navegador, das telas AO VIVO**: segue deferida
  ao primeiro deploy que tocar `parcerias/**`, `crm/**` e `eventos/hub/**` — mesmo padrão que
  C0/C2/C3/C4 já registraram. A prova de PEÇA (não de tela) foi feita com navegador real nesta
  lane: showcase subido localmente (`vite preview`, porta 4529), seção "Filtro e montagem de
  controle" capturada nos temas Brasa (escuro) e Wine (claro) — as cinco peças renderizam vivas
  nos dois.
- **Item de higiene `be-hero.com.br` fechado** — não fica pendência para as próximas ondas.
- **Órfão `ClientesPage.tsx:118` fechado** — não fica pendência; reabre só sob as condições
  registradas em `eslint.config.mjs`.
