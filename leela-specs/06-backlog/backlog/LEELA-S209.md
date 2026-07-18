---
id: LEELA-S209
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
# LEELA-S209 · Persistência de tamanho por inscrito + coleta no checkout
**Como** Organizador de Evento, **quero** que o tamanho de cada item tamanhado do kit seja coletado no checkout e persistido por inscrito, **para** garantir 100% do kit certo na entrega e acabar com o kit errado por falha de coleta manual.

## Critérios de aceite
- Dado um kit com item tamanhado (RN-212), quando o inscrito avança na etapa Modalidade/Kit do checkout, então o tamanho é obrigatório por item tamanhado e a inscrição não conclui sem ele (RN-223 — tamanho persistido por inscrito por item, map `itemId → tamanho`).
- Dado um kit sem item tamanhado, quando o inscrito avança, então nenhum tamanho é exigido.
- Dado um tamanho coletado, quando a inscrição é gravada, então `inscritos/{inscritoId}.tamanhos` recebe o map (ex.: `{ "camiseta-dry": "M" }`) e o dado persiste para consumo na distribuição.
- Dado a tela de distribuição (`Kits-Distribuicao.html`), quando o operador abre um inscrito, então vê o tamanho persistido por item (não um campo coletado e descartado).
- Dado um valor de tamanho fora dos `tamanhosDisponiveis` do item, quando o checkout valida, então a validação pura em `packages/core` rejeita e exibe erro.

## Subtarefas
- [ ] LEELA-S209-T1 — Adicionar campo `tamanhos: Record<itemId, string>` em `eventos/{id}/inscritos/{inscritoId}`
- [ ] LEELA-S209-T2 — Validação pura de tamanho obrigatório por item tamanhado em `packages/core`
- [ ] LEELA-S209-T3 — Exigir tamanho no `ModalidadeKitStep` do checkout web (E12-S1203-T3) e no fluxo mobile (E13-S1306-T2)
- [ ] LEELA-S209-T4 — Consumir e exibir `tamanhos` por item em `Kits-Distribuicao.html`

## Links
Épico: [[LEELA-E03-operacao-evento]]
