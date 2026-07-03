---
id: LEELA-S501
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
# LEELA-S501 · Sem permissão (403)
**Como** usuário autenticado sem direito de acesso, **quero** uma tela que explique a falta de permissão, **para** saber que não é um erro meu e como pedir acesso, em vez de uma página que quebra.
## Critérios de aceite
- Dado usuário sem papel para o recurso (RN-320), quando acesso rota protegida no Painel, então vejo o 403 dentro do shell com "Voltar" + "Falar com o organizador".
- Dado que a autorização vem do servidor, quando o cliente renderiza, então ele só reflete o veredito, nunca decide localmente.
- Dado a mesma situação no App, quando ocorre, então vejo o 403 RN com contato/voltar.
- Dado usuário não autenticado, quando tenta área privada, então o fluxo é de login (E00), não 403.
## Subtarefas
- [ ] LEELA-S501-T1 — 403 no web (guard de autorização + página, com shell)
- [ ] LEELA-S501-T2 — 403 no App (Expo)
## Links
Épico: [[LEELA-E07-estados-sistema]]
