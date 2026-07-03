---
id: LEELA-S210
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
# LEELA-S210 · Aprovisionamento de kit (encomenda → estoque) + "a encomendar por SKU"
**Como** Organizador de Evento, **quero** ver quanto encomendar por SKU e acompanhar o estado de aprovisionamento (encomenda → estoque), **para** resolver a logística de kit sem chutar a quantidade a comprar por item e tamanho.

## Critérios de aceite
- Dado um item/kit, quando o configuro, então escolho seu modelo de estoque `sob_encomenda` (vende sem estimativa, encomenda pelo vendido) ou `estoque_proprio` (saldo físico) (RN-225).
- Dado inscritos confirmados que exigem (item, tamanho), quando a Function agrega, então "a encomendar por SKU" = Σ inscritos confirmados que exigem (item, tamanho) − estoque físico do SKU (RN-224), calculado no `onWrite` de inscrito confirmado, nunca varrido no cliente.
- Dado um SKU (item + tamanho), quando avanço o aprovisionamento, então a máquina de estados vai `estimativa → encomendado → em_estoque` e cada transição registra quantidade e data (RN-226).
- Dado a tela `Kits-Estoque.html`, quando abro, então vejo por SKU o estado, quantidade vendida, estoque físico e "a encomendar".
- Dado que o tamanho por inscrito ainda não é persistido (S209), quando tento calcular "a encomendar por SKU", então a dependência dura é declarada e o cálculo depende de S209.

## Subtarefas
- [ ] LEELA-S210-T1 — Adicionar `modeloEstoque` (`sob_encomenda`|`estoque_proprio`) e `tamanhosDisponiveis[]` em `itensKit/{itemId}`
- [ ] LEELA-S210-T2 — Subcoleção `eventos/{id}/aprovisionamento/{sku}` (docId `itemId__tamanho`): `estado`, `qtdVendida`, `estoqueFisico`, `aEncomendar`, `historico[]`
- [ ] LEELA-S210-T3 — Function de agregação Σ no `onWrite` de inscrito confirmado + máquina de estados `estimativa → encomendado → em_estoque`
- [ ] LEELA-S210-T4 — Nova coluna/estado de aprovisionamento e "a encomendar por SKU" em `Kits-Estoque.html`

## Links
Épico: [[LEELA-E03-operacao-evento]]
