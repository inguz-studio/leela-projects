---
id: LEELA-S1306
type: story
epic: E13
epic_name: App do Atleta
onda: 3
surface: mobile
moscow: Must
status: backlog
v1: true
tasks_total: 2
tags: [leela, story]
---
# LEELA-S1306 · Inscrição / checkout mobile (PaymentProvider)
**Como** Atleta, **quero** me inscrever e pagar em poucos toques, **para** garantir minha vaga sem fricção e acompanhar tudo num lugar só.

## Critérios de aceite
- Dado o checkout, quando carrega, então vejo um Stepper (evento/kit → dados → pagamento → confirmação) com o resumo e o kit escolhido.
- Dado um cupom de afiliação, quando aplico, então o total reflete o desconto e a atribuição ao clube é registrada dentro da janela.
- Dado o pagamento via `PaymentProvider` (sandbox), quando confirmo, então vejo "pendente" e, no webhook, "confirmado".
- Dado a confirmação, quando conclui, então o app cria/atualiza `atletas/{uid}/inscricoes` e aparece em "Minhas inscrições".
- Dado falha/recusa de pagamento, quando ocorre, então vejo mensagem clara e posso tentar de novo sem duplicar cobrança.

## Subtarefas
- [ ] LEELA-S1306-T1 — `inscricoes` do atleta + Function de conversão/split (via PaymentProvider) + Rules
- [ ] LEELA-S1306-T2 — Tela de checkout (Stepper + cupom + pagamento + confirmação) + Minhas inscrições

## Links
Épico: [[LEELA-E13-app-atleta]]
