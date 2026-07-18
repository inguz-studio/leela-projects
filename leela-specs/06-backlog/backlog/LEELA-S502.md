---
id: LEELA-S502
type: story
epic: E07
epic_name: Estados de Sistema
onda: "—"
surface: painel
moscow: Should
status: backlog
v1: false
tasks_total: 2
tags: [leela, story]
---
# LEELA-S502 · Erro interno (500)
**Como** usuário que topou com uma falha do servidor, **quero** uma tela que reconheça o erro e ofereça recuperação, **para** tentar de novo sabendo que a equipe foi avisada, sem ver stack trace.
## Critérios de aceite
- Dado erro não tratado num segmento do Painel, quando `error.tsx` captura, então vejo o 500 dentro do shell com "Tentar novamente" (`reset()`) + "Voltar" e id de erro.
- Dado erro na raiz, quando `global-error.tsx` captura, então vejo o 500 em tela cheia sem shell.
- Dado qualquer erro capturado, quando monta, então o evento vai ao Sentry e o `eventId` aparece; nenhum detalhe sensível.
- Dado o App, quando um erro derruba a tela, então o ErrorBoundary mostra o 500 RN e registra no Sentry.
## Subtarefas
- [ ] LEELA-S502-T1 — 500 no web (`error.tsx` de segmento + `global-error.tsx` + Sentry)
- [ ] LEELA-S502-T2 — 500 no App (ErrorBoundary + Sentry)
## Links
Épico: [[LEELA-E07-estados-sistema]]
