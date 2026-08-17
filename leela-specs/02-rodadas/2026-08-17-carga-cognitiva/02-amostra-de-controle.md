---
tags: [leela, design, carga-cognitiva, medicao, amostra, vg, crm, clubs, plataforma]
rodada: 2026-08-17-carga-cognitiva
lane: CARGA-COGNITIVA-SPEC
---

# Amostra de controle nas outras áreas

> Parte 2.3 do brief: a mesma régua nas áreas fora do evento, **para dimensionar a
> fila, não para converter**. Ninguém conserta nada a partir deste arquivo.

Critério, declarado porque muda a contagem:

- **Dura** — o mesmo número renderizado duas vezes ou mais na mesma rota montada,
  sem papel distinto entre as ocorrências. É o que entra na fila.
- **Branda** — agregado ao lado da própria decomposição visível (total × colunas),
  ou contador cardinal sobre lista curta enumerada logo abaixo. Fica registrada e
  não entra na fila: pode ser desenho legítimo.

| Área | Telas varridas | Duras | Brandas |
|---|---|---|---|
| Visão geral | 1 (12 arquivos) | 2 | 1 |
| CRM | 4 | 0 | 2 |
| Financeiro global | rota não existe | — | — |
| Clubes · área do clube | 2 + casca | 4 | 1 |
| Clubes · abas irmãs e hub | 6 | 7 | — |
| Plataforma e superadmin | 18 | 2 | 1 |
| **Total** | **31** | **15** | **5** |

## Visão geral

| Fato | Fonte A | Fonte B | Papel distinto? |
|---|---|---|---|
| Inscritos do próximo evento | `overview/_components/Countdown.tsx:124` | `overview/_components/OcupacaoEventos.tsx:116-118` | não |
| Ocupação do próximo evento | `Countdown.tsx:126` | `OcupacaoEventos.tsx:83`, `:98` | não |
| Nº de alertas ativos | `AlertsPanel.tsx:67-69` | `AlertsPanel.tsx:90-129` | branda |

As duas duras são reais e não coincidência de dataset: `_lib/ocupacao.ts:76-78`
ordena por data decrescente e corta em cinco, então o próximo evento
(`_lib/countdown.ts:113-127`) cai sempre na régua de ocupação enquanto o tenant
tiver cinco eventos ou menos com capacidade à frente.

Fora da conta, mas anotado: `KpiRow.tsx:179` ("Vagas restantes", soma do
portfólio) e `Countdown.tsx:129-134` ("vagas livres", do próximo evento) mostram o
mesmo número com rótulos diferentes quando há um único evento publicado. É
ambiguidade de rótulo, não cópia.

## CRM

Nenhuma dura. Duas brandas em `ClienteDetailPage.tsx` (KpiCard "Eventos" `:118` e
KpiCard "Inscrições" `:119` contra a tabela "Histórico por evento" `:126-132`), e
uma descartada por papel distinto (`AnaliseVendasView.tsx:295` × `:297-307` é
ponto contra série).

Anotação cruzada, fora do critério de mesma dobra: `AnaliseVendasView.tsx:293-295`
e `overview/_components/KpiRow.tsx:163-190` leem o **mesmo** `getOverview` e
mostram os mesmos três números (inscrições, receita confirmada, conversão) em duas
rotas com dois desenhos. Na Visão geral o par KPI mais sparkline vive numa célula
só; no CRM está partido em dois blocos.

## Financeiro global

A rota não existe. Não há `apps/painel/src/routes/financeiro/`; o único
`financeiro` do painel é o de dentro do evento, já medido. O equivalente global é
`plataforma/tenants/FinanceiroTab.tsx`, contado na Plataforma.

## Clubes

É aqui que a fila fica grande, e pelo mesmo defeito do evento **amplificado por um
terceiro canal**: a sub-nav do clube também carrega contador em pill
(`clubes/_lib/subnav.ts:72-77`).

| Fato | Fontes | Papel distinto? |
|---|---|---|
| Membros ativos (aba Visão geral) | `clube/ClubeShell.tsx:69` + pill da aba (`_lib/subnav.ts:72-74`) + `clube/overview/OverviewClube.tsx:32` | não — 3× |
| Desafios ativos (aba Visão geral) | pill da aba (`_lib/subnav.ts:75-77`) + `OverviewClube.tsx:33` | não |
| Total de membros (aba Membros) | `membros/MembrosList.tsx:110` + `:122` + `:158-164` (ResultCount) | não — 3× |
| Membros ativos (aba Membros) | `MembrosList.tsx:111` + `:122` + `ClubeShell.tsx:69` + pill | não — 4× |

A quarta linha carrega um risco que as outras não têm: as duas primeiras fontes
contam a lista carregada (`clubes/_lib/membros.ts:82-88`) e as duas últimas leem o
agregado gravado no documento (`clube.qtdMembrosAtivos`). São dois caminhos de
cálculo lado a lado, e nada garante que concordem.

Nas abas irmãs e no hub o padrão se repete: desafios (`DesafiosList.tsx:195-196`,
`:207`, `:244-246`, mais a pill), comunicados (`ComunicadosList.tsx:164-165`,
`:176`, `:219-221`), parcerias (`ParceriasView.tsx:178` × `:188`, `:181` × `:229`),
o card do hub que mostra "N membros" e "Membros ativos N" no mesmo card
(`hub/ClubeCard.tsx:33` e `:105`) e o hub que diz "meus clubs" três vezes
(`HubClubes.tsx:60`, `:68`, `:156`).

## Plataforma e superadmin

A área mais limpa das cinco, e a única com guarda anti-redundância escrita em
código.

| Fato | Fonte A | Fonte B | Papel distinto? |
|---|---|---|---|
| Bruto movimentado pelo tenant | `tenants/FinanceiroTab.tsx:164` ("TPV") | `tenants/_components/RepassesDoTenant.tsx:68` ("Vendido bruto") | não |
| Tamanho da fila de repasses | `repasses/RepassesFilaView.tsx:169` (chip "Todos") | `RepassesFilaView.tsx:185-189` (ResultCount) | não — mesma linha flex |
| Nº de planos / convites | `planos/PlanosView.tsx:110`, `convites/ConvitesView.tsx:178` | as tabelas logo abaixo | branda |

A primeira é a pior da amostra inteira: dois rótulos diferentes para "o que
entrou", alimentados por **fontes diferentes** — retrato em `platform/rollups`
contra soma viva em `packages/core/src/finance/repasse.ts:328-363`. Podem divergir
na mesma tela, e o leitor não tem como saber qual acreditar.

**O precedente.** `tenants/TenantFichaLayout.tsx:57` chama
`precisaDeFaixaDeIdentidade(ativa)` para suprimir a faixa de identidade na aba
Resumo, com a razão escrita em `:12-13`: *"no Resumo ela seria o mesmo nome duas
vezes"*, porque `TenantDetail.tsx:97-99` já tem PageHeader próprio. É o único lugar
do painel onde esta redundância foi vista, nomeada e resolvida. O critério da
Parte 4 generaliza o que este arquivo já faz sozinho.
