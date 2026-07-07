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

## Campos do slide-in "Detalhe do inscrito" — EXTRAÍDOS do protótipo Claude Design (`WEB-APPV2 (1)/Inscritos do Evento.html`, painel `#slidePanel`)
Fonte-de-verdade dos campos (o protótipo JÁ especifica tudo; não é vago). 4 abas internas. Marcado o ORIGEM do dado: `[reg]` coletado na inscrição/checkout (S1202 — provavelmente já existe, só não é surfaçado) · `[pag]` do modelo de pedido/pagamento (backend E12/E04) · `[com]` do log de comunicação · `[hist]` do log de eventos.

**Header:** avatar, nome, e-mail, badge de status, modalidade.

**Aba Geral (dados do atleta) `[reg]`:** CPF · Telefone · Nascimento (+ idade) · Gênero · Cidade/UF · Modalidade · Camisa (tamanho) · Contato de emergência (nome + telefone) · Restrições médicas.

**Aba Pagamento `[pag]` (o núcleo do que faltava):**
- Status · **Valor da inscrição** (R$ + Lote, ex.: "R$ 189,00 · Lote 2 — Regular") · **Cupom aplicado** (código + % + "Aplicado") · **Desconto** (– R$) · **Data do pagamento** (data · hora) · **Valor final pago** (destacado, "após cupom").
- **Forma de pagamento:** bandeira + •••• 4 últimos + parcelamento ("Visa •••• 4821 · 12× de R$ 14,18"); nota "à vista p/ organizador · parcelado p/ atleta pela Be Hero"; tag "custo do parcelamento absorvido".
- **Conciliação da transação:** ID da transação (mono) · Gateway/adquirente · **Taxa Be Hero (%)** (– R$) · **Repasse ao organizador** (R$) · **Previsão de repasse** (data · "N dias após o evento").
- **Ação: "Reembolsar inscrição"** → modal de confirmação de estorno ("estornado no cartão •••• em até N faturas; inscrição permanece cancelada" · "Confirmar reembolso").

**Aba Comunicação `[com]`:** contador "Comunicações enviadas (N)" + filtro Todas/E-mail/Push; por item: tipo, assunto, trecho, data·hora, status (Entregue), "Abriu: Sim/Não".

**Aba Histórico `[hist]`:** timeline de eventos do registro (inscrição criada, pagamento, cancelamento com motivo/reembolso — ver §"Cancelamentos aparecem aqui com histórico de motivo e reembolso").

## Subtarefas
- [ ] LEELA-S203-T1 — Subcoleção `inscritos` + tipo `Inscrito` + query paginada + Rules
- [ ] LEELA-S203-T2 — Tela de inscritos (tabela densa §2.5, paginação, 4 tabs §2.7, slide-in) — FEITO (slide-in enxuto)
- [ ] LEELA-S203-T3 — **(novo)** Slide-in rico: abas Geral `[reg]` + Pagamento `[pag]` + Comunicação `[com]` + Histórico `[hist]` conforme os campos acima. **Geral `[reg]` pode adiantar** se o dado da inscrição já existir (surfaçar, não backend novo). Pagamento/estorno `[pag]` BLOQUEADO pelo lote de backend (modelo pedido/pagamento + Function de estorno).

## Links
Épico: [[LEELA-E03-operacao-evento]]
