---
id: LEELA-S301
type: story
epic: E04
epic_name: Configuração e Vendas do Evento
onda: 2
surface: painel
moscow: Should
status: backlog
v1: true
tasks_total: 7
tags: [leela, story]
---
# LEELA-S301 · Promotores e programa de afiliação
**Como** Organizador de Evento, **quero** gerenciar promotores e clubes que divulgam meu evento com comissão rastreável, **para** remunerar quem traz vendas sem controlar em planilha.

## Critérios de aceite
- Dado o programa, quando o configuro, então defino comissão %, janela, teto e cupom (RN-310/311); o organizador define a comissão.
- Dado um clube afiliado, quando recebe os termos, então a comissão é read-only — só aceita ou recusa (RN-120/121/122).
- Dado a lista, quando abro, então vejo afiliados (clube e promotor — RN-312) com conversões, cliques e comissão; filtros e EmptyState.
- Dado um afiliado ativo, quando copio o link master, então é rastreável e usa `{DOMINIO_LEELA}`; Toast do glossário.
- Dado uma conversão via link master na janela, quando ocorre, então é atribuída e o split roda por `PaymentProvider.splitRules` (webhook idempotente).
- Dado o detalhe do afiliado, quando abro, então vejo link master, cupom, cliques, conversões, taxa e "a receber".

## Subtarefas
- [ ] LEELA-S301-T1 — Modelo `programaAfiliacao` + `afiliados` + tipos + Rules + seed
- [ ] LEELA-S301-T2 — Interface `PaymentProvider` em `core` + provider mock/sandbox (ADR-006)
- [ ] LEELA-S301-T3 — Function de conversão + atribuição por link master + split idempotente
- [ ] LEELA-S301-T4 — Tela Promotores (lista de afiliados: conversões, cliques, comissão)
- [ ] LEELA-S301-T5 — Modal Configurar programa (%, janela, teto, cupom)
- [ ] LEELA-S301-T6 — Modal Convidar afiliado (clube ou promotor)
- [ ] LEELA-S301-T7 — Tela Detalhe do afiliado (link master, cupom, conversões, a receber)

## Links
Épico: [[LEELA-E04-config-vendas]]
