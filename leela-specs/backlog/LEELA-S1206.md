---
id: LEELA-S1206
type: story
epic: E12
epic_name: Landing Pública
onda: 2
surface: landing
moscow: Must
status: backlog
v1: true
tasks_total: 4
tags: [leela, story]
---
# LEELA-S1206 · Ingresso digital + e-mail transacional de marca + PDF
**Como** responsável por um pedido em grupo, **quero** receber por e-mail a confirmação com os ingressos de todos os inscritos do meu pedido, cada um com seu QR, **para** ter o comprovante e o primeiro toque de marca logo após o pagamento.

## Critérios de aceite
- Dado um pedido em grupo confirmado, quando o pagamento confirma, então cada inscrito do pedido gera um ingresso digital com QR assinado (token opaco por inscrito), disponível no app e por e-mail (RN-218).
- Dado o pagamento confirmado, quando a Function de webhook confirmado dispara, então o responsável pelo pedido recebe um e-mail transacional com template de marca Leela listando os inscritos do pedido e usando variáveis (`{nome}`, `{evento}`, `{kit}`, `{modalidade}`) (RN-219).
- Dado um reprocessamento do webhook, quando a Function roda de novo, então o e-mail não é reenviado (idempotência via subcoleção de notificações) (RN-219).
- Dado um ingresso emitido, quando o usuário solicita o PDF, então ele é gerado sob demanda a partir do mesmo ingresso/QR, para impressão/offline ou retirada por terceiro (RN-220).
- Dado a tela `EVENTOS-MEUS INGRESSOS` (`39:605`), quando abro "Meus Qr Codes", então vejo o ingresso de cada inscrito com seu QR.

## Subtarefas
- [ ] LEELA-S1206-T1 — Adicionar `qrToken` (opaco, gerado na confirmação) e `ingressoEmitidoEm` em `eventos/{id}/inscritos/{inscritoId}`, um por inscrito do pedido
- [ ] LEELA-S1206-T2 — Subcoleção de auditoria `inscritos/{id}/notificacoes/{tipo}` (`emailConfirmacao`) para idempotência do disparo
- [ ] LEELA-S1206-T3 — Interface `EmailProvider` em `packages/core` (espelho de `PaymentProvider`, ADR-006) + disparo no webhook confirmado ao responsável, listando os inscritos do pedido
- [ ] LEELA-S1206-T4 — Template de e-mail de marca com variáveis + geração de PDF sob demanda a partir do ingresso/QR

## Links
Épico: [[LEELA-E12-landing]]
