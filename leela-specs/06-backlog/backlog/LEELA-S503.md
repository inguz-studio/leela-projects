---
id: LEELA-S503
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
# LEELA-S503 · Offline
**Como** usuário que perdeu a conexão, **quero** saber que estou offline e que o app volta sozinho, **para** não achar que o produto quebrou e retomar sem recarregar na mão.
## Critérios de aceite
- Dado perda de conexão no web, quando `navigator.onLine` vira falso, então vejo aviso não bloqueante mantendo o shell; conteúdo indisponível cai no estado offline com "Tentar novamente".
- Dado que a conexão volta, quando o evento `online` dispara, então o aviso some e o conteúdo recarrega sozinho.
- Dado PWA sem rede em rota não cacheada, quando o SW responde, então serve o fallback offline.
- Dado o App sem rede, quando o NetInfo detecta, então mostra o estado offline e recupera ao reconectar.
## Subtarefas
- [ ] LEELA-S503-T1 — Offline no web (detecção + banner + fallback PWA)
- [ ] LEELA-S503-T2 — Offline no App (NetInfo + banner + tela)
## Links
Épico: [[LEELA-E07-estados-sistema]]
