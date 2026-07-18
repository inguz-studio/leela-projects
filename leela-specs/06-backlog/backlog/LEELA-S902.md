---
id: LEELA-S902
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
# LEELA-S902 · Split de afiliação e saldo consolidado (organizador + coordenador)
**Como** profissional que organiza eventos e coordena clube, **quero** que o split de afiliação seja calculado corretamente e meu saldo consolide os dois papéis, **para** saber quanto tenho a receber sem cruzar planilhas.
## Critérios de aceite
- Dado pagamento atribuído a afiliado dentro da janela, quando confirma, então a comissão é debitada do organizador e creditada em `parcerias.valorAReceber` (RN-332), uma única vez (RN-333).
- Dado pagamento fora da janela, quando confirma, então não há split (RN-125/311).
- Dado reembolso de pagamento com split, quando processa, então a comissão a receber do afiliado é revertida proporcionalmente (RN-337).
- Dado profissional organizador e coordenador, quando abro o saldo, então vejo repasses + comissões somados (RN-334).
## Subtarefas
- [ ] LEELA-S902-T1 — Split de afiliação no webhook (`PaymentProvider.splitRules`) idempotente
- [ ] LEELA-S902-T2 — Function de saldo consolidado do profissional (cruza eventos + clubes)
- [ ] LEELA-S902-T3 — Bloco de saldo consolidado na tela (organizador + coordenador)
## Links
Épico: [[LEELA-E09-financeiro-profissional]]
