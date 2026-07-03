---
id: LEELA-S702
type: story
epic: E08
epic_name: Painel do Influenciador
onda: 2
surface: painel
moscow: Could
status: backlog
v1: true
tasks_total: 1
tags: [leela, story]
---
# LEELA-S702 · Eventos disponíveis para divulgar
**Como** promotor, **quero** ver eventos com programa de afiliação aberto e aceitar num clique, **para** obter link rastreável e cupom sem negociar manualmente.
## Critérios de aceite
- Dado eventos com `programaAfiliacao` aberto a promotores, quando abro a lista, então vejo comissão %, janela e cupom (read-only — RN-310).
- Dado evento disponível, quando aceito, então cria `promotores/{id}/parcerias/{parceriaId}` com `linkMaster` + `cupom` e status `ativa` (RN-125).
- Dado nenhum evento elegível, quando abro, então EmptyState "Nenhum evento disponível para divulgação no momento".
## Subtarefas
- [ ] LEELA-S702-T1 — Lista de eventos elegíveis + aceitar afiliação (gera link/cupom)
## Links
Épico: [[LEELA-E08-influenciador]]
