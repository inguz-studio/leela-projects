---
id: LEELA-S1307
type: story
epic: E13
epic_name: App do Atleta
onda: "—"
surface: mobile
moscow: Must
status: backlog
v1: false
tasks_total: 2
tags: [leela, story]
---
# LEELA-S1307 · Arena — registrar ações dos 3 pilares
**Como** Atleta, **quero** registrar o que fiz (correr, meditar, dormir bem) nos 3 pilares, **para** que minha rotina inteira conte como progresso.

## Critérios de aceite
- Dado a aba Arena, quando abro "Registrar ação", então vejo as 16 ações em 3 pilares (Físico 7, Mental 5, Espiritual 4) com ícone e unidade.
- Dado uma ação, quando informo a quantidade e salvo, então o registro é criado e vejo os pontos calculados.
- Dado que registrei os 3 pilares no mesmo dia, quando vejo o total, então o bônus +20% é aplicado; com 5+ dias na semana, +10% (acumulam).
- Dado que vinculo o registro a um desafio ativo, quando salvo, então ele conta no progresso daquele desafio.
- Dado que não registrei hoje, quando volto amanhã, então o app celebra o retorno, nunca pune a ausência.

## Subtarefas
- [ ] LEELA-S1307-T1 — Modelo `registros` + Function de agregação de progresso/pontos (bônus RN-115) + Rules
- [ ] LEELA-S1307-T2 — Tela de registro de ação (16 ações em 3 pilares + quantidade + feedback de pontos)

## Links
Épico: [[LEELA-E13-app-atleta]]
