---
id: LEELA-S1203
type: story
epic: E12
epic_name: Landing Pública
onda: 2
surface: landing
moscow: Must
status: backlog
v1: true
tasks_total: 6
tags: [leela, story]
---
# LEELA-S1203 · Checkout do atleta anônimo — Stepper de 5 etapas + PaymentProvider
**Como** atleta anônimo, **quero** me inscrever e pagar por um evento em um fluxo guiado de 5 etapas sem criar conta, **para** garantir minha vaga com o mínimo de fricção.

## Critérios de aceite
- Dado o CTA "Garantir inscrição", quando entro no checkout, então vejo o Stepper com 5 etapas (Dados → Modalidade/Kit → Resumo → Pagamento → Confirmação).
- Dado a etapa Dados com campo inválido, quando tento avançar, então avanço é bloqueado com erro inline.
- Dado a etapa Modalidade/Kit (inclusive "Sem kit"), quando escolho, então o Resumo reflete o preço vigente; nunca aparece "tier".
- Dado o cupom `CORRIDAPERFEITA10`, quando aplico, então o total cai 10% e o afiliado é resolvido.
- Dado o Pagamento via `PaymentProvider` sandbox, quando confirmo, então a inscrição nasce `pendente` e vira `confirmado` no webhook.
- Dado o pagamento aprovado, quando chego à Confirmação, então vejo dados, kit, valor e próximos passos, sem coletar chip.

## Subtarefas
- [ ] LEELA-S1203-T1 — Rota + máquina de estado do Stepper (5 etapas) + preservação de contexto
- [ ] LEELA-S1203-T2 — Etapa Dados (formulário do atleta anônimo + validação)
- [ ] LEELA-S1203-T3 — Etapa Modalidade/Kit (seleção com preço vigente; "Sem kit")
- [ ] LEELA-S1203-T4 — Etapa Resumo (order summary + aplicação de cupom)
- [ ] LEELA-S1203-T5 — Etapa Pagamento (`PaymentProvider.createCharge`, Pix/cartão)
- [ ] LEELA-S1203-T6 — Confirmação + webhook idempotente (inscrito→confirmado, ∑ receita/inscritos)

## Links
Épico: [[LEELA-E12-landing]]
