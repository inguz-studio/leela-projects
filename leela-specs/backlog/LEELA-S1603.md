---
id: LEELA-S1603
type: story
epic: E16
epic_name: Plataforma & Super-Admin
onda: "—"
surface: painel
moscow: Should
status: backlog
v1: false
tasks_total: 3
tags: [leela, story]
---

# LEELA-S1603 · Recorrência da comunidade (mensalidade tenant→membro, destrava clube pago)
**Como** produtor (tenant), **quero** cobrar mensalidade dos membros do meu clube, **para** destravar o clube pago (RN-104) e gerar receita recorrente da comunidade.

## Critérios de aceite
- Dado `communityMonthlyEnabled = true`, quando o produtor habilita o clube pago, então `modeloEntrada` do clube destrava (RN-104/407).
- Dado um membro que assina, quando a assinatura é criada, então vira `tenants/{id}/subscriptions/{subId}` (`ativa`) via `PaymentProvider`.
- Dado a renovação mensal, quando o webhook chega, então é processado idempotentemente (RN-333) e mantém o status.
- Dado `communityMonthlyEnabled = false`, quando o produtor tenta cobrar, então é bloqueado (RN-407).

## Subtarefas
- [ ] LEELA-S1603-T1 — Modelo `subscriptions` (comunidade) + tipos + Rules
- [ ] LEELA-S1603-T2 — Function de assinatura da comunidade (`PaymentProvider`) + webhook idempotente
- [ ] LEELA-S1603-T3 — Tela de gestão de assinaturas da comunidade + destravar clube pago

## Links
Épico: [[LEELA-E16-plataforma-superadmin]]
