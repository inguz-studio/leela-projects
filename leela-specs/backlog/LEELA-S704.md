---
id: LEELA-S704
type: story
epic: E08
epic_name: Painel do Influenciador
onda: 2
surface: painel
moscow: Could
status: backlog
v1: true
tasks_total: 1
tags: [leela, story]
---
# LEELA-S704 · Financeiro do influenciador
**Como** promotor, **quero** ver a receber / liberado / pago por evento, **para** confiar que o repasse é automático e transparente.
## Critérios de aceite
- Dado conversões confirmadas via split do `PaymentProvider`, quando abro o financeiro, então vejo totais a receber / liberado / pago e breakdown por evento com data de liberação.
- Dado janela de atribuição/liberação ainda aberta, quando listo, então o valor aparece como "a receber" (não liberado).
- Dado teto mensal do programa (RN-311) excedido, quando ocorre, então o excedente é sinalizado conforme a regra do programa.
## Subtarefas
- [ ] LEELA-S704-T1 — Painel financeiro do promotor sobre o split do PaymentProvider
## Links
Épico: [[LEELA-E08-influenciador]]
