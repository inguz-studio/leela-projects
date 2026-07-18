---
id: LEELA-S811
type: story
epic: E10
epic_name: Marcas do Profissional
onda: "—"
surface: painel
moscow: Could
status: backlog
v1: false
tasks_total: 1
tags: [leela, story]
---
# LEELA-S811 · Gestão de marcas e patrocinadores
**Como** profissional, **quero** cadastrar e editar minhas marcas com modelo comercial e contrapartida, **para** ter um registro único e reusável dos meus patrocinadores.
## Critérios de aceite
- Dado o módulo Marcas, quando cadastro uma marca, então escolho modelo comercial financeiro (com `valorAnual`) ou permuta (com `contrapartida`) — RN-123.
- Dado marca com ativações, quando tento desativá-la, então `ConfirmModal` mostra preview das ativações que perdem patrocínio (§2.15) + disclaimer LGPD (RN-144).
- Dado a lista de marcas, quando filtro por modelo comercial e nada casa, então EmptyState + contador "mostrando 0 de N".
## Subtarefas
- [ ] LEELA-S811-T1 — CRUD de marca (lista + editar) com modelo comercial
## Links
Épico: [[LEELA-E10-marcas]]
