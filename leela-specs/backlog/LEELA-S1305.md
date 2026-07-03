---
id: LEELA-S1305
type: story
epic: E13
epic_name: App do Atleta
onda: 3
surface: mobile
moscow: Must
status: backlog
v1: true
tasks_total: 1
tags: [leela, story]
---
# LEELA-S1305 · Página do evento
**Como** Atleta, **quero** ver todos os detalhes de um evento e seus kits, **para** decidir me inscrever.

## Critérios de aceite
- Dado a página do evento, quando carrega, então vejo Banner Hero, nome, data, local, modalidades e a lista de kits (nunca "tier") com preço vigente.
- Dado um kit, quando vejo, então mostra o que inclui e a capacidade; "Sem kit" aparece como opção válida.
- Dado que cheguei por link master de clube (`?c=`), quando abro, então o contexto de afiliação/cupom é preservado para o checkout.
- Dado o botão "Inscrever-se", quando toco, então vou para o checkout com a modalidade/kit selecionados.

## Subtarefas
- [ ] LEELA-S1305-T1 — Tela de detalhe do evento + seleção de modalidade/kit

## Links
Épico: [[LEELA-E13-app-atleta]]
