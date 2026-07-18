---
id: LEELA-S504
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
# LEELA-S504 · Manutenção
**Como** usuário que acessa durante uma janela de manutenção, **quero** uma tela que avise que é temporário, **para** entender que não é falha e voltar depois.
## Critérios de aceite
- Dado `config/system.maintenanceMode = true`, quando acesso qualquer rota do web, então o middleware me leva ao `/manutencao` em tela cheia com "Tentar novamente".
- Dado que a flag volta a `false`, quando recarrego, então volto ao conteúdo normal automaticamente.
- Dado o App no boot, quando a flag remota indica manutenção, então vejo a tela de manutenção RN antes de entrar.
- Dado que a flag é do servidor, quando o cliente avalia, então ele só reflete o estado, nunca decide localmente.
## Subtarefas
- [ ] LEELA-S504-T1 — Manutenção no web (middleware + flag `config/system` + `/manutencao`)
- [ ] LEELA-S504-T2 — Manutenção no App (flag remota no boot)
## Links
Épico: [[LEELA-E07-estados-sistema]]
