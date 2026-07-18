---
id: LEELA-S110
type: story
epic: E05
epic_name: Módulo Clubs
onda: 1
surface: painel
moscow: Must
status: backlog
v1: true
tasks_total: 2
tags: [leela, story]
---
# LEELA-S110 · Configurações do clube
**Como** Coordenador de Assessoria, **quero** configurar identidade, página pública, regras de entrada, moderação e administração, **para** controlar como o clube se apresenta e opera.

## Critérios de aceite
- Layout 25/75 → anchor navigation sticky com scroll spy e 5 seções, cada uma com "Salvar alterações".
- Digito o slug → sanitiza em tempo real (minúsculas + números + hífens).
- "Gerar novo código" → spinner + código muda (pool de 5) + toast; respeita RN-101.
- Modelo "Pago" → disabled com badge "Em breve"; clicar dispara toast e não muda seleção (RN-104).
- 6 permissões de admin (RN-142) → toggles alternam de forma independente.
- Card "Deletar clube" → border-left Vulcão (exceção §2.16) e disclaimer LGPD de 90 dias (RN-144).

## Subtarefas
- [ ] LEELA-S110-T1 — Tela de configurações (25/75 + scroll spy + 5 seções + toggles/permissões)
- [ ] LEELA-S110-T2 — Deletar clube (§2.15 + LGPD) + exportação de dados (Function)

## Links
Épico: [[LEELA-E05-clubs]]
