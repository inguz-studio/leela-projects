---
id: LEELA-S205
type: story
epic: E03
epic_name: Operação do Evento
onda: 1
surface: painel
moscow: Must
status: backlog
v1: true
tasks_total: 4
tags: [leela, story]
---
# LEELA-S205 · Cadastro de kits e catálogo de itens
**Como** Organizador de Evento, **quero** configurar os kits do evento e o catálogo de itens, **para** oferecer opções por modalidade com patrocinadores vinculados.

## Critérios de aceite
- Dado o cadastro, quando abro, então vejo sub-nav interna (Cadastro, Distribuição, Estoque, Entrega), seção A com cards de kit (incl. "Sem kit") e seção B com catálogo de itens.
- Dado um item, quando o vejo, então mostra "Usado em: [kits]" (RN-215) e badges de tipo (RN-212) e origem (RN-213).
- Dado um item patrocinado, quando o abro, então vejo bloco da marca + toggle "Exibir logo ao atleta" (RN-214).
- Dado a tela, quando carrega, então o rodapé mostra 3 cards de resumo.
- Dado toda a nomenclatura, quando leio, então aparece "kit" e nunca "tier" (RN-216).

## Subtarefas
- [ ] LEELA-S205-T1 — Modelo `kits` + `itensKit` + N:N Kit↔Item + Rules
- [ ] LEELA-S205-T2 — Tela Kits · Cadastro (sub-nav interna, cards de kit, catálogo, rodapé de resumo)
- [ ] LEELA-S205-T3 — Modal de item de kit (tamanhado, origem, patrocinador, toggle logo)
- [ ] LEELA-S205-T4 — Sub-telas Distribuição e Estoque de kits

## Links
Épico: [[LEELA-E03-operacao-evento]]
