---
id: LEELA-S305
type: story
epic: E04
epic_name: Configuração e Vendas do Evento
onda: 2
surface: painel
moscow: Must
status: backlog
v1: true
tasks_total: 3
tags: [leela, story]
---
# LEELA-S305 · Configuração de política de reembolso e transferência (organizador)
**Como** Organizador de Evento, **quero** configurar a política de reembolso, cancelamento e transferência do evento, **para** que as solicitações sigam regras claras e legais sem decisão manual caso a caso.

## Critérios de aceite
- Dado o evento, quando abro a aba Política de vendas, então configuro reembolso (`janelaArrependimentoDias`, `corteHoras`, `slaAnaliseDias`), transferência (`habilitada`, `janelaHoras`, `taxa`) e troca de ingresso (`habilitada`, `janelaHoras`, `permiteReembolsoDowngrade`).
- Dado a janela de arrependimento, quando salvo, então vale reembolso integral automático em até 7 dias corridos da compra desde que faltem mais de 48h para o evento (RN-338, CDC Art. 49).
- Dado o corte de 48h, quando uma solicitação chega a menos de 48h do evento, então é bloqueada por padrão, salvo override explícito e registrado do organizador (RN-339).
- Dado uma solicitação fora da janela de arrependimento e antes do corte, quando entra, então segue para análise do organizador (em análise → aprovado/recusado) dentro do SLA configurável (RN-340).
- Dado a flag de transferência de titularidade, quando habilitada, então a troca abre até a janela default de 72h com taxa configurável (default 0) (RN-343).
- Dado a troca de ingresso do mesmo titular, quando há upgrade, então cobra a diferença pelo lote vigente; no downgrade não há reembolso salvo política; janela até 48h (RN-344).
- Dado que reembolso, cancelamento e titularidade operam por inscrito dentro do pedido em grupo (ver [[ADR-pedido-em-grupo]]), quando a política é aplicada, então incide sobre o inscrito individual, não sobre o pedido inteiro.
- Dado a escrita do doc de política, quando salvo, então só o owner do evento grava (Security Rules).

## Subtarefas
- [ ] LEELA-S305-T1 — Modelo `eventos/{id}/politicaVendas/{unico}` (reembolso, transferência, trocaIngresso) + Security Rules (só owner do evento)
- [ ] LEELA-S305-T2 — Aba de configuração de política de reembolso (janela 7d, corte 48h, SLA de análise)
- [ ] LEELA-S305-T3 — Configuração de transferência de titularidade (flag, janela 72h, taxa) e troca de ingresso (janela 48h, downgrade)

## Links
Épico: [[LEELA-E04-config-vendas]]
