---
id: LEELA-S207
type: story
epic: E03
epic_name: Operação do Evento
onda: 1
surface: painel
moscow: Should
status: backlog
v1: true
tasks_total: 2
tags: [leela, story]
---
# LEELA-S207 · Financeiro do evento
**Como** Organizador de Evento, **quero** ver o financeiro do evento (receita bruta, líquida, taxas, repasses), **para** acompanhar o resultado e planejar saques.

## Critérios de aceite
- Dado o financeiro, quando abro, então vejo receita bruta, taxa Leela e receita líquida.
- Dado a tela, quando carrega, então vejo breakdown por modalidade e por lote e inscrições por forma de pagamento.
- Dado repasses, quando existem, então vejo o status de repasse (afiliados/organizador).
- Dado os dados, quando clico em "Exportar", então baixo um CSV.

## Subtarefas
- [ ] LEELA-S207-T1 — Tela Financeiro do evento (bruto/taxa/líquido, breakdown, repasse, export CSV)
- [ ] LEELA-S207-T2 — Agregado financeiro do evento por Function (receita/taxa/repasse)

## Links
Épico: [[LEELA-E03-operacao-evento]]
