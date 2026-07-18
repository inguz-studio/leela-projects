---
id: LEELA-S403
type: story
epic: E06
epic_name: Marketing Unificado
onda: "—"
surface: painel
moscow: Should
status: backlog
v1: false
tasks_total: 2
tags: [leela, story]
---
# LEELA-S403 · Patch retroativo de sub-nav (9 → 8 tabs)
**Como** time de desenvolvimento, **quero** migrar a sub-nav do evento de 9 para 8 tabs em todas as telas do evento, **para** que o módulo Marketing unificado seja consistente e "Promotores" + "Comunicação" deixem de existir como abas separadas.

## Critérios de aceite
- Qualquer rota do evento → exatamente 8 tabs na ordem: Overview · Inscritos · Entrega · Kits · Página de Vendas · Marketing · Financeiro · Configurações (RN-002).
- Não existem mais as abas isoladas "Promotores" nem "Comunicação"; absorvidas por Marketing.
- Clico na aba Marketing → navego para `/eventos/[slug]/marketing` (default Campanhas) com underline Brasa 2px (§2.14).
- PR que reintroduza "Promotores"/"Comunicação" como aba → guarda de regressão falha.

## Subtarefas
- [ ] LEELA-S403-T1 — Refatorar `EventoSubNav` para as 8 tabs canônicas + rota Marketing
- [ ] LEELA-S403-T2 — Guarda de regressão contra sub-nav de 9 tabs

## Links
Épico: [[LEELA-E06-marketing]]
