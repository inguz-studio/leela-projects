---
id: LEELA-S1315
type: story
epic: E13
epic_name: App do Atleta
onda: 3
surface: mobile
moscow: Should
status: backlog
v1: false
tasks_total: 2
tags: [leela, story]
---
# LEELA-S1315 · Solicitar reembolso / cancelar inscrição no app
**Como** Atleta, **quero** solicitar reembolso ou cancelar minha inscrição pelo app, **para** desistir da prova sem precisar falar com o organizador, com um processo claro de reembolso.

## Critérios de aceite
- Dado uma inscrição minha dentro de um pedido em grupo, quando solicito reembolso, então a operação atua por inscrito (não pelo pedido inteiro) e cria `eventos/{id}/reembolsos/{reembolsoId}` com `estado=solicitado` e `origem=atleta` via callable.
- Dado a solicitação criada, quando ela abre, então a escrita de estado/financeiro é feita só por Function e o cliente não escreve valor nem estado (RN-341); a abertura notifica o organizador (RN-342).
- Dado uma solicitação em andamento, quando abro a tela, então leio o `estado` da máquina (`solicitado → aprovado_auto | em_analise → aprovado | recusado → estornado`) e cada transição me notifica (RN-342).
- Dado uma solicitação a menos de 48h do evento, quando tento abrir, então vejo o bloqueio por padrão (RN-339, salvo override do organizador) com mensagem clara.
- Dado que já existe uma solicitação aberta para a mesma inscrição, quando tento abrir outra, então a duplicidade é impedida.

## Subtarefas
- [ ] LEELA-S1315-T1 — Callable de abertura de reembolso/cancelamento por inscrito criando `reembolsos/{id}` `estado=solicitado` (sem escrita financeira no cliente)
- [ ] LEELA-S1315-T2 — Tela de solicitação e leitura do `estado` no app, com bloqueio de janela (RN-339) e estados vazio/erro

## Links
Épico: [[LEELA-E13-app-atleta]]
