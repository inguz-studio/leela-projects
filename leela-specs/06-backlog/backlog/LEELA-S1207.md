---
id: LEELA-S1207
type: story
epic: E12
epic_name: Landing Pública
onda: 2
surface: landing
moscow: Must
status: backlog
v1: true
tasks_total: 3
tags: [leela, story]
---
# LEELA-S1207 · Aceite de regulamento + contato de emergência no checkout
**Como** responsável por um pedido em grupo, **quero** informar contato de emergência e aceitar o regulamento por inscrito dentro do pedido, **para** cumprir a responsabilidade legal do evento e a segurança operacional de cada atleta.

## Critérios de aceite
- Dado um inscrito no pedido, quando preencho a etapa Dados do Stepper (E12-S1203-T2), então o contato de emergência (nome + telefone) é obrigatório por inscrito e persiste em `inscritos.contatoEmergencia` (RN-145).
- Dado a etapa Dados, quando avanço, então o aceite de regulamento é um checkbox obrigatório e distinto do consentimento LGPD, coletado por inscrito (RN-148).
- Dado o aceite de regulamento, quando o inscrito aceita, então persiste `regulamentoAceite{ versao, aceitoEm, ipHash? }` no inscrito, separado de `consentimentoLgpd{ aceitoEm }` (RN-148).
- Dado um inscrito sem contato de emergência ou sem aceite de regulamento, quando tento concluir a inscrição, então a validação bloqueia e sinaliza qual inscrito do pedido está incompleto.
- Dado a tela INFORMAÇÕES (`39:2633`), quando renderizo o checkout, então o contato de segurança já desenhado é formalizado como obrigatório e o aceite de regulamento é adicionado.

## Subtarefas
- [ ] LEELA-S1207-T1 — Adicionar `contatoEmergencia{ nome, telefone }`, `regulamentoAceite{ versao, aceitoEm, ipHash? }` e `consentimentoLgpd{ aceitoEm }` em `inscritos`, por inscrito do pedido
- [ ] LEELA-S1207-T2 — Validação por inscrito (contato de emergência obrigatório + aceite de regulamento distinto do LGPD) em `packages/core`
- [ ] LEELA-S1207-T3 — Coletar contato de emergência e aceite de regulamento por inscrito na etapa Dados do Stepper (`39:2633`, E12-S1203-T2), espelhado em E13

## Links
Épico: [[LEELA-E12-landing]]
