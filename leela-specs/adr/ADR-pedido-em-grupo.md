---
tags: [leela, adr, arquitetura, inscricao, pedido, checkout]
---

# ADR-011 · Pedido em grupo (um responsável, N inscritos)

**Contexto.** O modelo de inscrição precisa reconciliar dois lados que hoje divergem. Os wireframes Be Hero (Figma) desenham "Responsável pelo pedido" e "Novo participante", ou seja, uma compra única em que um pagador inscreve várias pessoas. O spec Leela, em E13-S1306, assumia **auto-inscrição** (o próprio atleta se inscreve, um por transação). Sem uma decisão, o checkout, o pagamento, o reembolso e a titularidade ficam ambíguos: não se sabe se a unidade de negócio é a pessoa ou a compra. Corridas de rua têm caso real de um responsável inscrevendo família/equipe num pagamento só.

**Decisão.** O modelo de inscrição é **pedido em grupo**. Uma entidade **Pedido** (`pedidos/{pedidoId}`) representa a compra: um **responsável/pagador** e **N inscritos**, cada inscrito com **titular próprio** (dados, tamanho, saúde e, quando exigido, contato de emergência individuais).
- **Pagamento único** para o pedido inteiro (um `createCharge`, um webhook de confirmação).
- **Reembolso, cancelamento, troca de titularidade e troca de ingresso operam por inscrito** dentro do pedido, não sobre o pedido inteiro. Cancelar um inscrito não cancela os demais.
- **E-mail ao responsável** listando todos os inscritos do pedido; cada inscrito recebe seu ingresso/QR individual.
- Corrige E13-S1306: o app do atleta passa a suportar o fluxo de responsável inscrevendo terceiros, não apenas auto-inscrição.

**Status.** ✅ Decidido (travado pelo usuário, 2026-07). Impacta E12 (checkout), E13 (app do atleta) e E09 (reembolso por inscrito, ver [[LEELA-S904]]).

**Consequência.**
- Nova coleção **`pedidos/{pedidoId}`**: `responsavel` (pagador), `inscritoRefs[]`, `pagamentoRef`, `valorTotal`, `criadoEm`. Escrita de estado financeiro só por Function.
- **`inscritos`** ganha `pedidoRef` (a que pedido pertence) e `ehResponsavel: bool` (se o inscrito também é o responsável/pagador do pedido, caso comum de auto-inscrição, que vira um pedido de 1 inscrito).
- O split de afiliação, o estorno (RN-337) e o clawback (RN-346) incidem por inscrito estornado, não pelo pedido; a máquina de estados de reembolso ([[LEELA-S904]]) opera na granularidade do inscrito.
- Auto-inscrição continua válida como caso particular: pedido com um único inscrito que é o próprio responsável (`ehResponsavel = true`).
- Contato de emergência, tamanho de kit e dados de saúde permanecem por inscrito (não herdados do responsável).

---
Relacionado: [[modelo-de-dados-firestore]] · [[LEELA-S904]] · [[LEELA-E12-landing]] · [[LEELA-E13-app-atleta]] · [[ADR-multitenancy]]
