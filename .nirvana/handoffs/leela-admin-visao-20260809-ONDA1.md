# Handoff selado · ADMIN-VISAO onda 1 (backend, sem pixel)

- **trace_id:** `leela-admin-visao-20260809`
- **empresa:** software-forge · perfil `sf-backend-lead`
- **natureza:** BACKEND — código + testes, zero pixel, zero deploy
- **repo:** `C:\dev\LEELA` · branch `main`
- **contrato:** `.nirvana/briefs/leela-admin-visao-onda1-20260809-enriched.md`
- **spec:** `leela-specs/02-rodadas/2026-08-09-admin-visao/` (04→03→02→01)

## Estado

🏁 **Selado.** Seis tarefas, oito commits de código/teste, gate da onda verde.

## Território honrado

Tocado: `functions/src/platform/`, `functions/src/index.ts`,
`packages/api-client/src/platform/`, `packages/api-client/src/index.ts` (ver
premissa P-ONDA1-2), `functions/src/__tests__/`, `leela-specs/00-boards/`
(aterrissagem). **Não tocado:** `apps/painel/` (a lane TELA do REDESIGN-DS
esteve em voo na mesma árvore durante toda esta lane — `git status --short`
conferido antes de cada `add`, nada dela entrou aqui), `firestore.rules`
(zero linha — o canário de S1612-T7 PROVA isso), `packages/design-system/`.

## Entregas por tarefa

| # | Tarefa | Commit(s) | Arquivo(s) principal(is) |
|---|---|---|---|
| 1.1 | Agendamento do `recomputePlatformRollups` + `atualizadoEm` no contrato (RN-538) | `7541ffdf` | `functions/src/platform/rollups.ts`, `functions/src/index.ts` |
| 1.2 | Callable `listarClientesDoTenant` (RN-539) | `135978a9` (Function), `69e70de8` (api-client) | `functions/src/platform/listarClientesDoTenant.ts`, `packages/api-client/src/platform/clientesTenant.ts` |
| 1.3 | Leitura por tenant de eventos/clubs, paginada | `354116a9` | `packages/api-client/src/platform/tenantEventosClubs.ts` |
| 1.4 | Leitura por tenant de pedidos/pagamentos, paginada | `17f17088` | `packages/api-client/src/platform/tenantVendas.ts` |
| 1.5 | Leitura global paginada de eventos/clubes | `e80ab899` | `packages/api-client/src/platform/listasGlobais.ts` |
| 1.6 | Canário: `crmClientes` segue negado ao client SDK | `73eae392` | `functions/src/__tests__/adminVisaoOnda1.integration.test.ts` |
| testes 1.3/1.4/1.5 | Paginação honesta (mock, sem emulator) | `e4b78913` | `functions/src/__tests__/adminVisaoOnda1Paginacao.test.ts` |

`atualizadoEm` (metade textual da RN-538) já era parte do contrato de
leitura — `PlatformRollups.atualizadoEm` existe desde S1605 e
`getPlatformRollups` já o devolve. Nenhuma mudança de tipo foi necessária; a
lacuna real era só o agendamento, e é isso que 1.1 fecha.

## Gate da onda — evidência real

| Item do gate | Comando | Resultado |
|---|---|---|
| type-check `functions` | `pnpm --config.verify-deps-before-run=false run type-check` (em `functions/`) | limpo, 0 erros |
| lint `functions` | `pnpm --config.verify-deps-before-run=false run lint` (em `functions/`) | limpo, 0 erros/warnings |
| type-check `api-client` | idem, em `packages/api-client/` | limpo, 0 erros |
| lint `api-client` | idem, em `packages/api-client/` | limpo, 0 erros/warnings |
| paginação honesta (mock) | `vitest run src/__tests__/adminVisaoOnda1Paginacao.test.ts` | **17/17 verde**, ~3s, sem emulator |
| canário `crmClientes` + callable | `npx firebase-tools@13 emulators:exec --only firestore "cd functions && pnpm --config.verify-deps-before-run=false exec vitest run src/__tests__/adminVisaoOnda1.integration.test.ts"` | **12/12 verde**, ~30-50s |
| regressão `platformRollups.integration.test.ts` | mesmo padrão de emulator | **8/8 verde** (o agendamento não quebrou o callable manual nem o core) |
| regressão `crm.integration.test.ts` | mesmo padrão de emulator | **17/17 verde** (a perna legada do canário, herdada do E19, continua provando negação) |

**Suíte de functions rodada arquivo por arquivo** (disciplina da casa — sem
gate de lote confiável): os quatro acima. Porta padrão 8080 (nenhuma
variável `LEELA_FS_EMU_PORT` precisou ser setada). Java 17 da máquina via
`npx firebase-tools@13` (não o `firebase` global, que exige JDK 21).

## O achado que corrige a premissa da spec (registrar, não esconder)

O brief e a spec afirmam que o canário de `crmClientes` contra
`platform_admin` **"hoje não existe"** (S1612-T7, 03-spec.md). **Isso é
parcialmente falso, e vale a correção**: a perna do **papel legado**
(`role === 'platform_admin'`) já tinha canário desde `crm.integration.test.ts`
— commit `2e864f02` (`feat(rules): crmClientes fail-closed...
[LEELA-E19-T3-RULES]`), que é **anterior a esta spec inteira** (a construção
do CRM em si, não algo desta rodada). Rodei a suíte de novo agora
(regressão acima) para confirmar que ela segue verde.

**O buraco real era outro**: nenhum teste do repositório exercitava a perna
de **capacidade** (`platformAdmin: true`, sem o papel legado — RN-401, lane
PAPEL-DUPLO) contra esta Rule especificamente. Como `isPlatformAdmin()` nas
Rules aceita as duas pernas, um `|| isPlatformAdmin()` acrescentado por
engano à regra de `crmClientes` teria sido pego pelo teste legado (que já
teria passado a suceder) — ou seja, o canário antigo já protegia contra essa
regressão específica, mas nenhum teste JÁ FALSIFICAVA a perna nova
isoladamente. `adminVisaoOnda1.integration.test.ts` fecha essa lacuna
diretamente (`platform_admin por CAPACIDADE... TAMBÉM é negado`).

Não é vetável — é achado técnico, registrado aqui e no commit `73eae392`
para quem ler a spec original não presumir que o trabalho de S1612-T7 era
"criar do zero" um canário que uma fatia dele já existia há semanas.

## Território além do declarado — premissas assumidas

- **P-ONDA1-1 · cadência do agendamento (RN-538).** A fila não cravou a
  cadência do cron. Escolhi **1 hora**: `platform/rollups` alimenta um
  dashboard que o dono olha para decidir preço, não uma superfície em tempo
  real, e o recompute é FULL (varre `tenants/*`) — hora em hora é fresco o
  bastante sem virar varredura contínua por um agregado que ninguém lê a
  cada minuto. Ajuste de 1 linha (`functions/src/platform/rollups.ts`) se o
  dono quiser outra.
- **P-ONDA1-2 · `packages/api-client/src/index.ts` tocado, fora da lista
  literal do território.** O território fechado cita
  `packages/api-client/src/platform/` mas não o barrel `index.ts` da raiz do
  pacote. Sem exportar dali, as seis funções novas ficam inalcançáveis pelas
  ondas 2/3/4 (que importam de `@leela/api-client`, não de caminhos
  internos). Tratei como plumbing necessária — só linhas de export
  adicionadas, nada reestruturado, nada removido.
- **P-ONDA1-3 · nomes NÃO reaproveitam `listarEventosDoTenant`
  (`eventos/queries.ts`) nem `listClubesByTenant` (`clubs.ts`).** As duas já
  existem, já leem por tenant, mas nenhuma pagina por cursor — a primeira
  serve hoje a fila de estornos (fan-out com teto conhecido e assumido,
  outro território). Estender essas funções exigiria tocar arquivos fora do
  território desta onda (`packages/api-client/src/eventos/`,
  `packages/api-client/src/clubs.ts`) e arriscaria quebrar o consumidor
  existente. Nasceram funções novas: `listarEventosDoTenantPaginado`,
  `listarClubesDoTenantPaginado`, etc.
- **P-ONDA1-4 · `listarClientesDoTenant` ordena SÓ por `ltv desc`, sem os
  outros três eixos que `listarCrmClientes` (organizador) oferece.** Onda 3
  (S1612-T6, consumidor da tela) ainda não especificou necessidade de outra
  ordenação — extensão futura de 1 parâmetro, não V1.
- **P-ONDA1-5 · doc de `crmClientes` corrompido não derruba a página do
  callable.** `parseCrmCliente` é fail-fast por doutrina (escrita), mas para
  LEITURA administrativa optei por logar e pular o doc ruim (molde do
  fan-out de `listarEventosDoTenant`, que já faz isso), não lançar a página
  inteira. Testado explicitamente.
- **P-ONDA1-6 · mecanismo de commit `--only`.** `git commit --only
  <pathspec>` commita o conteúdo do WORKING TREE do path, não uma fatia
  staged por hunk — descoberto ao tentar separar os exports de 1.1 e 1.2 em
  `functions/src/index.ts` via `git apply --cached` de patches parciais; o
  primeiro `--only` levou os dois hunks juntos porque ambos já estavam
  escritos na árvore de trabalho. Não houve arquivo fora do território em
  commit nenhum — só a granularidade por-tarefa do wiring em `index.ts`
  ficou mais grossa que o planejado. Lição para toda lane futura que tentar
  separar commits por hunk num arquivo com múltiplas edições já escritas.

## Vetáveis / findings novos

Nenhum vetável novo sobe ao dono nesta onda (o escopo é 100% backend
determinístico, sem decisão de produto). O único achado que merece
registro formal é o do canário (seção acima) — corrige a premissa da spec,
não abre decisão nova.

## Disciplina cumprida

`git commit --only` com pathspec explícito em todos os oito commits;
`git status --short` conferido antes de cada `add` — a árvore teve a lane
`leela-redesign-ds-20260809-TELA` em voo o tempo todo (renomeou
`SecaoHead.tsx`, criou `apps/painel/src/routes/clubes/engajamento/`,
commitou por conta própria entre os meus dois pushes); nada dela foi
tocado ou arrastado para dentro dos meus commits. Push a cada 2-3 commits
(dois pushes: `0bfcbf4a..e80ab899`, depois `2c5f3066..73eae392`). Deploy:
**não executado** — proibido nesta lane por contrato.

## Board atualizado

`leela-specs/00-boards/V1-KANBAN.md`: S1612-T2, S1612-T5, S1612-T7,
S1613-T1, S1613-T3 e S1614-T1 marcados `[x]` com hash de commit.
`leela-specs/00-boards/BOARD-EPICOS.md`: addendum na linha do E16
registrando a onda 1 e o achado do canário.

## Próximos passos (fora desta lane)

Onda 2 (frontend + dinheiro, opus com review antagonista) pode começar
assim que o REDESIGN-DS entregar o mecanismo de superfície por área — onda 1
não bloqueia nem é bloqueada por ela. Onda 4 (listas globais, tela) já tem
`listarEventosGlobalPaginado`/`listarClubesGlobalPaginado` prontas,
inclusive o filtro opcional de `status` que S1614-T2 vai precisar.
