---
id: LEELA-S1316
type: story
epic: E13
epic_name: App do Atleta
onda: 3
surface: mobile
moscow: Should
status: backlog
v1: false
tasks_total: 3
tags: [leela, story]
---
# LEELA-S1316 · Transferir titularidade / trocar ingresso no app
**Como** Atleta titular de uma inscrição num pedido em grupo, **quero** transferir minha titularidade a outra pessoa ou trocar meu ingresso, **para** evitar reembolso + recompra quando não posso mais correr ou escolhi o kit errado.

## Critérios de aceite
- Dado o evento com `permiteTransferencia` habilitada, quando inicio a transferência de titularidade, então a operação atua por inscrito (não pelo pedido inteiro) e cria `eventos/{id}/transferencias/{transferenciaId}` com `tipo=titularidade`, dentro da janela default de 72h antes do evento (RN-343).
- Dado uma transferência de titularidade, quando o novo titular preenche os dados, então coleto CPF, dados da prova, tamanho e (se exigido) saúde; se o kit ainda não foi entregue, o tamanho é recoletado do novo titular e o chip só é vinculado na entrega (RN-203/RN-345); se o kit já foi entregue, a transferência é bloqueada.
- Dado uma troca de ingresso (mesmo titular), quando faço upgrade (kit/modalidade mais caro), então cobro a diferença pelo lote vigente disparando `createCharge`; no downgrade não há reembolso da diferença por padrão, salvo política do organizador (RN-344).
- Dado a troca de ingresso, quando tento fora da janela (até 48h antes do evento), então a operação é bloqueada com mensagem clara.
- Dado a transferência aberta, quando ela é registrada, então a escrita de estado é feita por Function e o histórico de titularidade fica em `inscritos.titularHistorico[]` (append-only).

## Subtarefas
- [ ] LEELA-S1316-T1 — Callable de transferência criando `transferencias/{id}` (`tipo` titularidade|ingresso) por inscrito, com validação de flag e janelas (RN-343/RN-344)
- [ ] LEELA-S1316-T2 — Coleta de dados/tamanho/saúde do novo titular na transferência de titularidade + regra de chip/kit (RN-345); upgrade dispara `createCharge` da diferença
- [ ] LEELA-S1316-T3 — Tela de transferência/troca no app com estados de bloqueio (kit entregue, fora de janela) e leitura do `estado`

## Links
Épico: [[LEELA-E13-app-atleta]]
