---
id: LEELA-S1204
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
# LEELA-S1204 · Atribuição de conversão via link master / cupom de afiliado
**Como** clube/promotor afiliado, **quero** que uma venda originada pelo meu link master ou cupom seja atribuída a mim quando ocorre dentro da janela, **para** receber a comissão sem controlar em planilha.

## Critérios de aceite
- Dado o acesso via link master `?c=cps`, quando chego à página do evento, então o código de afiliado é capturado e persiste (cookie assinado) pela janela.
- Dado o cupom `CORRIDAPERFEITA10` aplicado, quando valido, então resolvo o afiliado dono e aplico o desconto.
- Dado uma conversão paga dentro da janela, quando o pagamento confirma, então registro a conversão atribuída e atualizo ∑ `conversoes`/`valorAReceber` via `splitRules`.
- Dado uma conversão fora da janela, quando confirmo, então não atribuo comissão.
- Dado teto mensal atingido, quando processo, então respeito o teto.

## Subtarefas
- [ ] LEELA-S1204-T1 — Captura de link master (`?c=`) + cookie de atribuição por janela
- [ ] LEELA-S1204-T2 — Validação e resolução de cupom de afiliado (aplica desconto + resolve afiliado)
- [ ] LEELA-S1204-T3 — Function de conversão + split (∑ conversoes/valorAReceber, janela, teto)

## Links
Épico: [[LEELA-E12-landing]]
