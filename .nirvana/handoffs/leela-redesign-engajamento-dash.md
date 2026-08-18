---
trace: leela-redesign-v2-20260810
lane: ENGAJAMENTO-DASH (paga D-1008-R15)
alvo: branch redesign-engajamento-v2 · base 50c369ba → HEAD a0a1cfec · C:/dev/leela-wt-redesign-v2
data: 2026-08-11
estado: CONCLUÍDA — T0 (3 gates AJUSTES-DONO verdes sem fix) + T1..T4 pagas e PUSHED; árvore LIMPA; gates finais todos verdes; :4601 re-servido PID 20004 (bundle index-DsXayGgU.js); :4599 intocado; NENHUM deploy
---

# ENGAJAMENTO-DASH · handoff vivo

Contrato: `.nirvana/briefs/leela-redesign-engajamento-dash-enriched.md`. Decisões-fonte:
D-1008-R15 + R2 + R3. Referência de design (autoridade de aparência):
`leela-projects/design_handoff_engajamento/design/engajamento-referencia.dc.html` (lida na
íntegra, 1618 linhas) + `PROMPTS.md` (3º bloco anti-recriação) + `REFACTOR.md` ("Qual tela
é esta" + item 7).

Disciplina: `git commit --only` com pathspec por tarefa; push a cada 2 commits; pnpm com
`--config.verify-deps-before-run=false`; suítes em série; :4599 (PID 25384) intocado;
NENHUM deploy. Guardrail de sangue: `routes/overview/` NÃO se toca (VG v3 ratificada
D-1008-R3); contratos de honestidade pinados (média ponderada + "Sem registro (30 dias+)")
SOBREVIVEM.

Estado inicial verificado: árvore LIMPA em `50c369ba` (branch `redesign-engajamento-v2`,
up to date com origin). :4601 PID 22812 servindo bundle pré-lane; :4599 PID 25384 intocado.

## Ordem de execução

T0 (3 gates formais pendentes da AJUSTES-DONO) → mapa de fonte de dado dos 7 blocos →
seções por tarefa na ordem do acoplamento → gates finais + rebuild + re-serve :4601.

## T0 · 3 gates formais da AJUSTES-DONO — PAGOS, TODOS VERDES (sem fix necessário)

- [x] **generate-tokens 2× sem diff** — rodado 2× em sequência
      (`pnpm --filter design-system run generate-tokens`); `git status --porcelain` VAZIO
      após cada rodada. Determinístico.
- [x] **grep hex/px no diff `486ebaa4..50c369ba`** — varredura em linhas ADICIONADAS
      (`#hex | rgba( | Npx`): **3 ocorrências, todas na exceção declarada**:
      `${indicador.x}px` (SubNav.tsx) e `${indicadorY}px` (SidebarRail.tsx) = px de
      RUNTIME por medição de layout; 1× "2px" em prosa do `SubNav/LLM.txt` descrevendo o
      underline PRÉ-existente (a linha removida já o citava). Zero px/hex de design novo.
- [x] **grep L-021 no diff do painel** — zero controle cru adicionado
      (`<button|select|input|textarea|table|dialog>`); únicos hits de
      `bg-[var(--surface-raised)]` são comentário histórico + asserções NEGATIVAS de teste
      (pinam que o cru não volta). Imports do diff consomem o cânone
      (Card/Table/SubNav/KpiCard/Breadcrumb…).

**Veredito: a lane AJUSTES-DONO fecha limpa. Nenhuma tarefa de conserto. Restava desta
fila só o rebuild + re-serve :4601, que esta lane entrega no fechamento (gate próprio).**

## T1 · Mapa de fonte de dado — 7 blocos do estudo (verificado no código, não em memória)

| # | Bloco do estudo | Fonte real? | Contrato real / impedimento nomeado |
|---|---|---|---|
| 1 | **Check-ins realizados** (total display + split por pilar + ranking de ações c/ abas + modal Top 10 + seletor de período c/ calendário) | ❌ | Precisa de CONTAGEM de registros por ação/pilar/período legível pelo organizador. O que existe: `atletas/{uid}/registros` (RN-114 valida contra o catálogo de 16 ações do core) com Rules `allow read: uid == atletaId \|\| isPlatformAdmin` (firestore.rules:2810-2824) — organizador NÃO lê; e `desafios/{id}.progressoPorPilar` = MÉDIAS de pontos por participante (outro dado — já servido honestamente pelo card "Equilíbrio dos pilares", pinado). Nenhum agregado por ação (o desafio guarda total por pilar, nunca a ação que o formou) nem bucket temporal. → EmBreve honesto NOMEANDO o bloco do estudo (consolida o card "Ações mais registradas por pilar" sob o nome do bloco 1). |
| 2 | **Mapa de Check-ins** (heatmap semana×dia, min-max + monocromático, tooltip por pilar) | ❌ | Mesma causa do bloco 1. REFACTOR item 7, nota de dado: "implemente a forma se e somente se o dado existir". → EmBreve honesto (JÁ existe, pinado em teste). |
| 3 | **Volume de Check-ins** (áreas empilhadas por pilar, SVG 560×210) | ❌ | Mesma causa. `progressoPct` é acumulado por participante, sem eixo temporal. → EmBreve honesto (JÁ existe, pinado). |
| 4 | **Top 5 modalidades de interesse** | ⚠️ **variante honesta IMPLEMENTÁVEL** | O estudo rotula "interesse declarado pelos membros" — esse dado NÃO existe (nenhum campo de interesse no atleta/membro). O que EXISTE: `clube.modalidade` (vocabulário fechado `MODALIDADES_CLUBE`, 9 opções, core) + `clube.qtdMembrosAtivos` (∑ por Function) — já carregados pela `clubesDoTenantQuery`. Métrica real: **membros ativos por modalidade dos clubs** (uma pessoa conta em cada club, como o KPI de participações). → IMPLEMENTAR com derivação pura + BarChart canônico; a copy diz o que mede, nunca "interesse declarado". |
| 5 | **Conversão da base** (toggle Funil / Por club) | ❌ | RN-489 (contagem de visitantes) medida e ausente + cadastro do cliente sem vínculo membro↔comprador. → EmBreve honesto (JÁ existe, pinado com as DUAS causas). |
| 6 | **Ocupação dos últimos 5 eventos** | ✅ | `evento.qtdInscritos` (∑ Function) + `evento.capacidade` (doc; null = linha fora com nota honesta) via `eventosDoOrganizadorQuery` (chave PARTILHADA VG↔Hub — cache reidrata, zero leitura nova) + derivação pura `derivarOcupacao` + componente `OcupacaoEventos` (VG v3 RATIFICADA). → IMPLEMENTAR compondo o canônico (CONSUMO de overview/, zero alteração lá). |
| 7 | **Formas de pagamento** (donut stroke 16 + legenda 2 col) | ❌ | `Pagamento.forma` ('cartao_credito'\|'pix') existe no doc (`pagamentos/{id}`, leitura restrita a gestão) mas NENHUM agregado por forma chega ao cliente — impedimento JÁ declarado na HIFI-REC ("destrava com série financeira E12+"); `demografia/current` não traz; padrão do painel: tela NUNCA varre docs financeiros. → EmBreve honesto NOVO na banda Eventos (mesmo card que a VG já mostra). |

Transversais: bandas com legenda + hairline = `SecaoTitulo` (existe); "?" explicativo em
portal = `SecaoHead.ajuda` (existe, REFACTOR itens 8/12); reveal/hover-lift = `Cascata` +
`Painel` (existem); DS já tem `BarChart` e `DonutChart` — nenhum gráfico novo nasce no DS
nesta lane porque os blocos que pediriam heatmap/áreas/donut estão SEM fonte (formar
gráfico sem dado violaria o contrato de honestidade).

## Plano de seções (ordem de acoplamento)

- **T2** — Banda "Eventos" (nova, 3ª banda): `SecaoTitulo` + bloco 6 REAL (compõe
  `OcupacaoEventos` + `derivarOcupacao` + `eventosDoOrganizadorQuery` via `useTenantSession`)
  + bloco 7 EmBreve (`EmBreveV3` consumido). View + Page + `_data` + testes.

## T2 · Banda "Eventos" — PAGA

- **No app:** `_data/engajamento.ts` ganhou `useEventosDoOrganizador` (chave PARTILHADA
  `eventos.doOrganizador` VG↔Hub↔Engajamento — zero leitura nova; erro CONTIDO no card);
  `EngajamentoPage` deriva `ocupacao` com o canônico `derivarOcupacao` (consumo de
  `overview/_lib/ocupacao`, sem alterar a VG); `EngajamentoView` ganhou a 3ª banda:
  `SecaoTitulo "Eventos"` ("O resultado: ocupação das provas e como as pessoas pagam.") +
  `OcupacaoEventos` (bloco 6 REAL, componente da VG v3 ratificada consumido) + `EmBreveV3`
  "Formas de pagamento" (bloco 7 sem fonte, causa nomeada). Filtro de club NÃO recorta a
  banda (eventos são do organizador) — documentado no código.
- **No DS:** nada (nenhum componente novo necessário).
- **Testes novos:** 5 (banda + ocupação real por aria-label do canônico + nota de
  sem-capacidade + erro contido no card + formas de pagamento honesto). Suites engajamento:
  **68/68** ✔ (3 arquivos).
- **Commit `ff6302a5`** (4 arquivos, +193/−2).
- **Primeiro import cross-route do painel** (clubes → overview/_components): deliberado —
  alternativa (promover a `src/components/`) exigiria editar a VG ratificada; promoção
  anotada para a lane do roadmap de componentes (`leela-roadmap-componentes-20260810`).

## T3 · Modalidades da comunidade (bloco 4, versão honesta) — PAGA

- **No app:** `_lib/engajamento.ts` ganhou `resumirModalidades` puro (soma
  `qtdMembrosAtivos` por `clube.modalidade`; `?? 0` janela pré-Function D-7; zerada sai;
  empate por nome; lista INTEIRA — corte é recorte de card) + `RANKING_MAX_MODALIDADES=5`;
  View ganhou o card `ModalidadesDaComunidade` (SecaoHead + "?" que diz o que o bloco mede
  E o que não é; recorte próprio Top 5/Todas só quando excede; BarChart canônico;
  reanimação por `club|recorte`); Page deriva do MESMO `recorte` de clubs (filtro de club
  recorta o bloco, como os vizinhos).
- **Honestidade registrada (vetável):** o estudo rotula "modalidades de interesse
  declaradas pelos membros" — o campo NÃO existe; o card se chama "Modalidades da
  comunidade" e mede membros ativos por modalidade DO CLUB (uma pessoa conta em cada
  club, igual ao KPI de participações). Se o dono quiser interesse declarado de verdade,
  é campo novo de atleta + agregado (card de backend, fora desta lane).
- **Testes novos:** 6 na `_lib` + 5 na View. Suites engajamento: **79/79** ✔.
- **Commit `11f58fef`** (5 arquivos, +256/−5). **Push feito (T2+T3).**

## T4 · Bloco 1 consolidado + esqueleto da banda Clubs — PAGA

- O em-breve "Ações mais registradas por pilar" virou o **bloco 1 do estudo com o nome
  dele** ("Check-ins realizados"); a causa nomeia as TRÊS partes desenhadas (total do
  período + divisão por pilar + ranking de ações com Top 10) e a fonte única que destrava
  tudo (contagem de registros por ação — Rules não abrem ao organizador; agregado guarda
  pontos médios por pilar, nunca contagem/ação). Banda re-assentada no esqueleto do
  estudo: bloco 1 full-width → Mapa + Volume lado a lado (grid 2) → Modalidades.
  Cascatas renumeradas (5..11). Nenhum seletor de período no em-breve — interatividade
  fake em card sem dado seria mentira de affordance.
- Teste do bloco atualizado (nome + 3 partes + fonte; sem tab, sem "Ver top 10").
  Suites engajamento: **79/79** ✔.
- **Commit `a0a1cfec`** (2 arquivos, +27/−17).

**Inventário do maestro (aceite) — estado final da tela:** as 3 bandas do estudo no
código: **Clubs** (KPIs reais · bloco 1 em-breve nomeado · bloco 2 Mapa em-breve · bloco 3
Volume em-breve · Equilíbrio dos pilares REAL pinado · Situação REAL pinada · Entrada REAL
· Ranking de desafios REAL · bloco 4 Modalidades REAL versão honesta) · **Do club para o
evento** (Desafios ligados a um evento REAL · bloco 5 Conversão em-breve pinado) ·
**Eventos** (bloco 6 Ocupação REAL canônico · bloco 7 Formas de pagamento em-breve).

## Gates finais da lane (números reais)

| Gate | Resultado |
|---|---|
| Suíte painel INTEIRA | **2490/2490** (231 arquivos) ✔ — 16 testes novos desta lane |
| Suíte DS completa | **1790/1790** (75 arquivos) ✔ — DS intocado |
| type-check | painel exit 0 ✔ · DS exit 0 ✔ |
| lint `--max-warnings 0` | painel exit 0 ✔ · DS exit 0 ✔ |
| generate-tokens 2× | re-rodado pós-lane 2× — `git status` VAZIO ✔ |
| hex/px no diff da lane (`50c369ba..a0a1cfec`) | **ZERO** ocorrência (nenhuma exceção necessária) ✔ |
| grep L-021 no diff da lane | ZERO controle cru · ZERO `bg-[var(--surface-raised)]` cru novo ✔ |

## Rebuild + re-serve (fase final)

- DS intocado → sem tsup. `vite build --mode leela-hub` OK (18,7s) — bundle novo
  `dist/assets/index-DsXayGgU.js` (sha256 `9617665a5a2b58d4…`).
- PID 22812 (bundle pré-lane `index-D-BqnPen.js`) MORTO; `.maestro-logs/serve-4601.js`
  re-servindo a MESMA porta — **:4601 PID novo = 20004**, `GET /` 200, SPA fallback de
  `/clubes/engajamento` 200. **:4599 PID 25384 INTOCADO.** NENHUM deploy.

## Commits da lane (todos pushed, base 50c369ba → a0a1cfec)

- `ff6302a5` T2 (banda Eventos: ocupação real + formas de pagamento honesto)
- `11f58fef` T3 (modalidades da comunidade — bloco 4 versão honesta)
- `a0a1cfec` T4 (bloco 1 consolidado + esqueleto da banda Clubs)

## Fila / vetáveis / achados

- **Vetável (T3):** título "Modalidades da comunidade" no lugar de "Top 5 modalidades de
  interesse" — interesse declarado não existe como dado; se o dono quiser o do estudo,
  é campo de atleta + agregado (backend, lane própria).
- **Vetável (T4):** o em-breve do bloco 1 NÃO ganhou o seletor de período com calendário
  do estudo — controle vivo em card sem dado é affordance mentirosa; nasce junto com a
  fonte.
- **Achado (T2):** primeiro import cross-route do painel (clubes → overview/_components,
  consumo de OcupacaoEventos/EmBreveV3/derivarOcupacao). Promoção para `src/components/`
  = lane do roadmap `leela-roadmap-componentes-20260810` (tocaria a VG ratificada).
- **Destravas mapeadas (T1):** blocos 1-3 = contagem de registros por ação/período
  legível pelo organizador (agregado por Function); bloco 5 = RN-489 + vínculo
  membro↔comprador; bloco 7 = série financeira (E12+). Quando existirem, heatmap/áreas/
  donut NASCEM no DS com teste (L-021) — DS já tem BarChart e DonutChart.
- Conferência RENDERIZADA (maestro/dono) no :4601: 3 bandas com hairline, ocupação com
  barras reais, modalidades com barras reais, em-breves nomeados, contratos pinados
  intactos.
- **T3** — Bloco 4 REAL (variante honesta): `resumirModalidades` puro em `_lib/engajamento.ts`
  + card com BarChart + recorte próprio (padrão item 9) + testes lib+view.
- **T4** — Bloco 1: consolidar o EmBreve "Ações mais registradas por pilar" sob o nome do
  bloco do estudo ("Check-ins realizados") + re-layout da banda 1 dos em-breves no esqueleto
  do estudo (bloco 1 full-width; Mapa+Volume lado a lado) + testes.
