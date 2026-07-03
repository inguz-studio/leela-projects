---
id: LEELA-S203
type: story
epic: E03
epic_name: Operação do Evento
onda: 1
surface: painel
moscow: Must
status: backlog
v1: true
tasks_total: 2
tags: [leela, story]
---
# LEELA-S203 · Gestão de inscritos
**Como** Organizador de Evento, **quero** ver e filtrar a lista de inscritos com kit e chip, **para** acompanhar o funil e gerenciar a operação em tempo real.

## Critérios de aceite
- Dado 453 inscritos, quando abro a lista, então vejo tabela densa (§2.5) com ~18 linhas/página e paginação obrigatória, com contador "mostrando X de Y".
- Dado a tela, quando navego pelas 4 tabs (Geral, Pagamento, Comunicação, Histórico), então todas estão no DOM (§2.7) e alternam sem recarregar.
- Dado a coluna de kit, quando listo, então vejo badge de kit (RN-202) e `chipNumero` vazio até a entrega (RN-203).
- Dado busca/filtros sem correspondência, quando aplico, então EmptyState.
- Dado uma linha, quando clico, então abre slide-in de detalhe (status RN-204).

## Subtarefas
- [ ] LEELA-S203-T1 — Subcoleção `inscritos` + tipo `Inscrito` + query paginada + Rules
- [ ] LEELA-S203-T2 — Tela de inscritos (tabela densa §2.5, paginação, 4 tabs §2.7, slide-in)

## Links
Épico: [[LEELA-E03-operacao-evento]]
