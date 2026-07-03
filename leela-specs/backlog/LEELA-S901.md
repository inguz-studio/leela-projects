---
id: LEELA-S901
type: story
epic: E09
epic_name: Financeiro do Profissional
onda: "—"
surface: painel
moscow: Should
status: backlog
v1: false
tasks_total: 3
tags: [leela, story]
---
# LEELA-S901 · Agregação financeira por Cloud Function (receita, taxa, líquido, ticket)
**Como** plataforma, **quero** manter os agregados financeiros por Cloud Function a partir dos eventos de pagamento, **para** que o painel exiba números íntegros e nunca calculados no cliente.
## Critérios de aceite
- Dado webhook de pagamento confirmado, quando a Function processa, então grava o pagamento no ledger e incrementa receita bruta, taxa, líquido e contagem atomicamente.
- Dado o mesmo `providerTxId` reprocessado, quando o webhook chega de novo, então os agregados não mudam (RN-333).
- Dado cancelamento/reembolso, quando processado, então os agregados são revertidos exatamente uma vez (RN-335/337).
- Dado pagamento `pendente`, quando processado, então não entra em receita confirmada, só em previsto.
## Subtarefas
- [ ] LEELA-S901-T1 — Modelo de dados: ledger de pagamentos + campos de rollup + Security Rules
- [ ] LEELA-S901-T2 — Function `onPaymentWebhook` — grava ledger + atualiza rollup (idempotente)
- [ ] LEELA-S901-T3 — Cálculo financeiro puro em `core` (taxa, líquido, ticket)
## Links
Épico: [[LEELA-E09-financeiro-profissional]]
