---
trace: leela-redesign-v2-20260810
lane: ADMINVISAO-ONDA4
data: 2026-08-11
branch: adminvisao-onda4
worktree: C:\dev\leela-wt-adminvisao
epico: LEELA-E16
historia: LEELA-S1614
---

# ADMINVISAO-ONDA4 · as duas listas globais do painel master

## O que a onda 4 continha

A fila da rodada (`leela-specs/02-rodadas/2026-08-09-admin-visao/04-fila-build.md`) dá à onda 4 três
tarefas, todas da história **S1614**, e declara que ela **não espera veto nenhum**:

| # | Tarefa | Estado |
|---|---|---|
| 4.1 | Tela `/plataforma/eventos` (tabela densa, filtros, coluna Tenant, paginação) · `S1614-T2` | entregue · `efd3912d` |
| 4.2 | Tela `/plataforma/clubs` · `S1614-T3` | entregue · `7e3ad3c2` |
| 4.3 | Dois itens novos no `PLATFORM_NAV` + ícones Lucide + `activeNavId` · `S1614-T4` | entregue · `e3546450` |

**Conferência dos vetáveis, item a item.** A tabela de dependências da fila liga vetos às ondas 2
(V-1), 3 (V-2 e V-3) e 5 (V-4 e V-5). A onda 4 aparece com "nenhum", e a leitura da spec confirma:
a S1614 não exibe dinheiro (V-1 é o nome do faturamento na ficha), não exibe pessoa (V-2 é a aba
Clientes, V-4 é o diretório de contas), não toca responsável (V-3) nem o gatilho do aviso (V-5).
**Nada ficou de fora por dependência de vetável.**

A onda dependia da leitura da **onda 1** (`S1614-T1`) e do **REDESIGN-DS**. As duas já estão na main:
`listarEventosGlobalPaginado` / `listarClubesGlobalPaginado` em
`packages/api-client/src/platform/listasGlobais.ts`, e o mecanismo de superfície por área em
`apps/painel/src/shell/superficie.ts` + `SuperficieDoPainel.tsx` (glass `off` em `/plataforma`, por
segmento de rota, não por prefixo de string). **A fiação do tema não foi tocada** — as telas novas
nascem dentro da área que já resolve o fundo do admin.

## O que foi entregue, tarefa a tarefa

### 4.1 · `/plataforma/eventos` — `efd3912d`

Arquivos novos:

- `apps/painel/src/routes/plataforma/_lib/listasGlobais.ts` — puros do recorte e do contador.
- `apps/painel/src/routes/plataforma/_data/listasGlobais.ts` — hooks de paginação por cursor sobre os
  readers da onda 1.
- `apps/painel/src/routes/plataforma/_components/ListaGlobal.tsx` — a casca das duas listas.
- `apps/painel/src/routes/plataforma/eventos/EventosGlobaisRoute.tsx` — a tela.
- Testes: 12 casos de puros, 8 de hooks, 11 de tela.

Colunas: Evento (nome + local), **Tenant**, Data, Status (Badge do vocabulário do organizador),
Inscrições. Clique na linha leva à ficha do tenant dono.

### 4.2 · `/plataforma/clubs` — `7e3ad3c2`

`apps/painel/src/routes/plataforma/clubs/ClubsGlobaisRoute.tsx` + 10 casos de teste. Colunas: Clube
(nome + categoria), **Tenant**, Modalidade, Onde, Visibilidade, Entrada, Membros, Desafios.

### 4.3 · o menu — `e3546450`

`_lib/nav.ts` (dois itens + `activeNavId`), `shell/sidebar.ts` (ícones) e o contrato do
`shell/__tests__/sidebar.test.ts` (9 → 11 itens, mais três casos novos). Eventos e Clubs entram
**colados em Tenants**: a barra passa a ler "quem opera na plataforma" e, em seguida, "o que existe
nela"; comercial e dinheiro seguem onde estavam.

## As três decisões que a lane tomou, e por quê

**1. Nenhuma cifra na lista global.** `Evento.receitaConfirmada` existe e tem escritor. Ainda assim
ficou de fora: dinheiro no painel master é a ficha do tenant, onde a RN-537 e o mode-aware da RN-182
são declarados na tela e a rota é de review antagonista. Uma coluna de receita na varredura global
entregaria número sem a régua ao lado. A varredura responde "o que existe"; "quanto rendeu" é a onda
2. Travado por teste (`queryByText(/R\$/)` ausente nas duas telas).

**2. Um recorte por vez na lista de eventos: tenant OU status.** O reader global da onda 1 tem filtro
de `status` e **não** tem filtro de tenant — a decisão está escrita no próprio módulo: o recorte por
tenant reusa `listarEventosDoTenantPaginado`, "é a mesma leitura, não duas". Combinar os dois exigiria
um reader que ninguém escreveu, e peneirar status no cliente sobre a página do tenant faria o contador
mentir na primeira paginação. A tela desliga os chips de status quando um tenant está escolhido e diz
por quê. **Se alguém quiser os dois juntos, é tarefa de api-client e reabre a decisão da onda 1.**

**3. "Inscrições", não "Inscritos pagantes".** O agregado `qtdInscritos` conta todas as inscrições da
subcoleção, cancelada inclusive (`functions/src/eventos/agregarFinanceiro.ts:31-33`). O rótulo diz o
que o número é. A régua R19 (dinheiro conta pagante) não foi acionada porque não há dinheiro na tela.

## Gates

| Gate | Resultado |
|---|---|
| Suíte do painel INTEIRA | **239 arquivos · 2635 testes · 0 falhas** na branch (baseline da main era 235 · 2591 — 44 testes novos: 41 em 4 arquivos novos e 3 no contrato da sidebar). **Re-rodada na main já mergeada: 239 · 2641 · 0 falhas** |
| `tsc --noEmit` (painel) | limpo |
| `eslint src --max-warnings 0` | limpo |
| `generate-tokens` 2× | idempotente (duas execuções, zero diferença de conteúdo) |
| `gate-canon` | **PASS**, tudo no baseline: superfície-crua painel 107, botão-cru 6, receita-de-grid 23, órfão 0, lint 4 e 2 |
| Hex/px de design | zero — só token e escala do preset |
| Deploy | **nenhum** |

O bloco de erro das duas telas usa `Card` do DS em vez da superfície montada à mão que as telas
vizinhas usam (`rounded + bg-surface + p`): copiar o padrão da casa teria subido a catraca de
superfície-crua de 107 para 109. **A catraca não subiu e nenhuma entrada de dívida herdada foi
tocada** — `ProvisionTenantModal`, que pertence à onda 3 do ROADMAP de componentes, ficou intacto.

## O que fica para as ondas vizinhas

- Os puros do contador (`rotuloContagem`) e do join de tenant (`nomeDoTenant`) já servem as abas
  Eventos e Clubs da ficha (onda 3) — mesma leitura por cursor, mesma regra de contagem honesta.
- A casca `ListaGlobal` aceita qualquer coluna; a aba da ficha pode reusá-la se o recorte couber.
- A restrição "um recorte por vez" só existe na lista global. As abas da ficha já são por tenant e
  usam o reader do tenant direto.

## Estado

**Mergeada.** `9c93dabe` na main (merge `--no-ff` de `adminvisao-onda4`, 3 commits de código + 1 de
boards). Worktree `C:\dev\leela-wt-adminvisao` removido. **Sem deploy.**

### A armadilha da aterrissagem, registrada porque vale para toda lane

Entre o `merge-tree` limpo e o merge de verdade, a main andou **duas vezes** (a Onda 1 do roadmap de
componentes e o `builds-destravados`, este último tocando `apps/painel/src/routes/parcerias`,
`routes/clubes` e `packages/api-client`). O git juntou tudo sem conflito, mas o tree resultante
**nunca tinha sido testado junto com o meu** — e a suíte do painel roda contra o `dist` do
`api-client`, que ficou obsoleto no mesmo instante.

Os gates foram re-executados sobre a main já mergeada, com `@leela/api-client` reconstruído antes:
suíte 239/2641 verde, tsc e eslint limpos, `gate-canon` PASS. **A lição de mecanismo é a mesma da
varredura de faixa de RN: prova de merge vale no instante em que roda.** Com lanes vizinhas em voo,
o gate depois do merge não é redundância — é o único que fala do que foi publicado.
