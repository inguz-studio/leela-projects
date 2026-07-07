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
- **(JTBD expandido — decisão Vitor 2026-07-07)** Dado uma inscrição PAGA, quando abro o slide-in, então vejo o **pedido completo**: identificador da compra, forma de pagamento, valor e parcelamento, kit incluso (se houver), status de pagamento, e a ação de **estorno** quando aplicável. Motivo: o Organizador gerencia o pedido, não só o status — a informação de pagamento tem lógica própria para existir. O chip NÃO aparece aqui como coletável (RN-203: vinculado só no credenciamento/Entrega).
- **Chip:** o de-para chip↔participante acontece SOMENTE no credenciamento (aba Entrega, na retirada do kit — RN-203). No Geral/slide-in o chip é read-only (vazio até a entrega).

## Dependência de backend (registrada 2026-07-07)
O slide-in rico depende do MODELO DE PEDIDO/PAGAMENTO: hoje `Inscrito` não carrega valor/forma/parcelamento/id-da-compra nem link para o pedido, e não há Function de estorno. NÃO inventar esses dados no cliente (mostrar dinheiro/pedido errado é pior que omitir). Requer lote de backend (link Inscrito↔pedido/pagamento + campos + Function de estorno) ANTES de enriquecer o slide-in. Cruza com E04/E12 (vendas/checkout) e com o lote firebase-admin.

## Subtarefas
- [ ] LEELA-S203-T1 — Subcoleção `inscritos` + tipo `Inscrito` + query paginada + Rules
- [ ] LEELA-S203-T2 — Tela de inscritos (tabela densa §2.5, paginação, 4 tabs §2.7, slide-in) — FEITO (slide-in enxuto)
- [ ] LEELA-S203-T3 — **(novo)** Slide-in rico do pedido: pagamento completo + estorno. BLOQUEADO pela dependência de backend acima.

## Links
Épico: [[LEELA-E03-operacao-evento]]
