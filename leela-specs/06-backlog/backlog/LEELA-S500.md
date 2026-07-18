---
id: LEELA-S500
type: story
epic: E07
epic_name: Estados de Sistema
onda: "—"
surface: painel
moscow: Must
status: backlog
v1: false
tasks_total: 3
tags: [leela, story]
---
# LEELA-S500 · Página não encontrada (404)
**Como** usuário de qualquer superfície, **quero** uma tela clara quando o endereço não existe, **para** entender que o link quebrou e achar o caminho de volta sem tela branca.
## Critérios de aceite
- Dado URL inexistente no Painel autenticado, quando resolve, então vejo o 404 dentro do shell com "Voltar" + "Ir para a Visão Geral".
- Dado URL inexistente na Landing, quando resolve, então vejo o mesmo componente em layout mínimo com "Ir para a página inicial".
- Dado rota inexistente no App, quando navego, então o fallback mostra o 404 com "Voltar".
- Dado o 404 renderizado, quando monta, então o foco vai à ação primária e a ilustração tem `aria-hidden`.
## Subtarefas
- [ ] LEELA-S500-T1 — Componente `SystemStateScreen` no Design System (web + RN)
- [ ] LEELA-S500-T2 — 404 no web (Painel com shell + Landing mínima)
- [ ] LEELA-S500-T3 — 404 no App (Expo — fallback de rota desconhecida)
## Links
Épico: [[LEELA-E07-estados-sistema]]
