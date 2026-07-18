---
id: LEELA-S400
type: story
epic: E06
epic_name: Marketing Unificado
onda: 2
surface: painel
moscow: Should
status: backlog
v1: true
tasks_total: 4
tags: [leela, story]
---
# LEELA-S400 · Parceiros de marketing
**Como** Organizador de Evento, **quero** uma lista unificada de parceiros (clubes, influenciadores, lojas, promotores individuais) com programa de afiliação, comissão e conversões, **para** gerenciar toda a distribuição do evento num lugar só e remunerar quem traz venda sem planilha.

## Critérios de aceite
- Aba Marketing → sub-nav interna (§2.14) com Campanhas · Automações · Parceiros e aba corrente marcada.
- Sub-tela Parceiros → tabela densa (§2.5) com parceiro, status, cliques únicos, conversões, comissão e valor a receber + contador.
- Parceiro ativo, "Copiar link master" → copio `beh.ro/{slug}?p={codigo}` + Toast canônico.
- Programa não configurado → EmptyState com CTA "Configurar programa de afiliação".
- Convido parceiro → entra como `convite_pendente` e passa a `ativo` ao aceitar (aceite é E05/E08).
- Altero comissão → grava `programaAfiliacao` que o clube lê read-only (RN-121/122); só o organizador edita (RN-310).
- Conversão fora da janela → não incrementa `conversoes` (RN-125).

## Subtarefas
- [ ] LEELA-S400-T1 — Modelo `parceiros` + `programaAfiliacao` (escrita) + link master + Rules
- [ ] LEELA-S400-T2 — Shell de Marketing (sub-nav interna §2.14) + sub-tela Parceiros (tabela densa)
- [ ] LEELA-S400-T3 — Modal "Configurar programa de afiliação" (%, janela, teto, cupom)
- [ ] LEELA-S400-T4 — Modal "Convidar parceiro" + tela de detalhe do parceiro

## Links
Épico: [[LEELA-E06-marketing]]
