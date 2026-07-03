---
id: LEELA-S107
type: story
epic: E05
epic_name: Módulo Clubs
onda: 1
surface: painel
moscow: Must
status: backlog
v1: true
tasks_total: 5
tags: [leela, story]
---
# LEELA-S107 · Gestão de parcerias
**Como** Coordenador de Assessoria, **quero** gerenciar eventos que promovo, patrocinadores institucionais e convites de parceria, **para** capturar valor financeiro do tráfego que gero e formalizar apoios ao clube.

## Critérios de aceite
- Convites pendentes → "Aceitar parceria" gera spinner + toast + card some + badge atualiza; "Recusar" some com fade.
- Bloco de eventos promovidos → tabela densa (3 eventos) com link master + QR + info de comissão por linha.
- Clico no info de comissão → modal de termos read-only (RN-122); clube nunca edita comissão (RN-120/121).
- Bloco patrocinadores → "+ Adicionar" abre modal; "Desativar"/"Pausar" abrem modal com preview (§2.15, RN-124).
- "Remover parceria" de evento → modal de remoção com preview de consequências (§2.15).

## Subtarefas
- [ ] LEELA-S107-T1 — Modelo `parcerias` + espelho read-only do programa + agregados + Rules
- [ ] LEELA-S107-T2 — Tela de parcerias (3 blocos + aceitar/recusar convite + ações rápidas)
- [ ] LEELA-S107-T3 — Modal adicionar patrocinador (validação progressiva)
- [ ] LEELA-S107-T4 — Modais destrutivos: desativar patrocinador + remover evento (§2.15)
- [ ] LEELA-S107-T5 — Modal termos do programa (read-only, 5 slugs + fallback)

## Links
Épico: [[LEELA-E05-clubs]]
