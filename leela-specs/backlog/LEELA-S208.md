---
id: LEELA-S208
type: story
epic: E03
epic_name: Operação do Evento
onda: 1
surface: painel
moscow: Should
status: backlog
v1: false
tasks_total: 4
tags: [leela, story]
---
# LEELA-S208 · Identificação e check-in por QR no balcão
**Como** operador de balcão, **quero** escanear o QR do ingresso para carregar o inscrito e registrar presença, **para** identificar o atleta e entregar o kit num fluxo único e rápido, sem buscar por nome ou dorsal.

## Critérios de aceite
- Dado um inscrito com `qrToken` válido, quando escaneio o QR (câmera do painel ou leitor USB), então o inscrito é carregado no balcão e o mesmo fluxo de 3 passos de S204 roda (RN-221 — QR é token de identificação/presença, não status de check-in concorrente).
- Dado o fluxo padrão de balcão, quando retiro o kit, então a presença continua sendo registrada pela retirada (RN-205 preservada) e a Function `registrarEntrega` seta `kitEntregueEm` e `checkinEm` juntos.
- Dado um kit entregue antecipadamente (correios ou retirada dias antes), quando o atleta escaneia o QR na largada, então a Function `registrarCheckin` seta apenas `checkinEm`, sem reabrir a entrega do kit (RN-222).
- Dado um QR escaneado, quando o servidor valida a assinatura do `qrToken`, então uma assinatura inválida ou payload adulterado é rejeitado (validação server-side, nunca confiando no payload do cliente).
- Dado um QR de outro evento ou de inscrito já com `checkinEm != null`, quando escaneio, então vejo estado de erro/aviso ("QR inválido para este evento" / "Check-in já realizado") sem duplicar o registro.

## Subtarefas
- [ ] LEELA-S208-T1 — Adicionar campos `kitEntregueEm?` e `checkinEm?` em `inscritos` (substituem a presença implícita em `status`)
- [ ] LEELA-S208-T2 — Estender Function `registrarEntrega` (S204-T2) para setar `kitEntregueEm` + `checkinEm` no fluxo padrão
- [ ] LEELA-S208-T3 — Function `registrarCheckin` (só `checkinEm`) + validação server-side da assinatura do `qrToken`
- [ ] LEELA-S208-T4 — Caminho de scanner (câmera/leitor USB) em `Entrega-Atendimento.html` como terceiro caminho de identificação, com estados de erro

## Links
Épico: [[LEELA-E03-operacao-evento]]
