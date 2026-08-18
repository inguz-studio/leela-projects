# HANDOFF vivo — DIAG-PIXREAL (leela-pixreal-diag-20260804)

- Lane: DIAG-PIXREAL · Employee: sf-reliability-engineer · Modo: INVESTIGAÇÃO READ-ONLY
- Report final: `.nirvana/outputs/leela-pixreal-diag-20260804/DIAG-PIXREAL-REPORT.md`
- Pagamento canônico: PIX `pay_6e37hktx4xld12qf`, R$ 11,05, evento `teste-taxa-repassada`, pago 04/08 (painel Asaas confirma).

## Estado por elo (atualizar a cada elo)

| Elo | Estado | Evidência |
|-----|--------|-----------|
| 1. Asaas (payment + webhook config) | ✅ FUNCIONOU | GET `/v3/payments/pay_6e37hktx4xld12qf` → **PENDING** (nunca pago; era o da rodada QA-DATA de 03/08). O dono pagou OUTRA cobrança: `pay_jay08p0u1qlz11r2` (criada 04/08, checkout novo, uid `wNXRTvMM3vc7Boyi91vRgx3DBQy2`) → **RECEIVED**, paymentDate 2026-08-04, pixTransaction `c04b2c72-...`. GET `/v3/webhooks` → 1 webhook id `38621f06-d73c-486a-b7ac-a06d6865b026`, url `https://us-central1-leela-hub.cloudfunctions.net/asaasWebhook`, **enabled:true, interrupted:false, penalizedRequestsCount:0**, apiVersion 3, eventos PAYMENT_RECEIVED/CONFIRMED etc. |
| 2. Function asaasWebhook (logs prod) | ✅ INVESTIGADO — CHEGOU e processou | Log 2026-08-04T18:59:53Z→19:00:04Z: `webhook_asaas_processado` chargeId `pay_jay08p0u1qlz11r2`, pedido `ped-wNXRTvMM3vc7Boyi91vRgx3DBQy2-chk-ed77a161-...`, statusGateway `confirmed`, 200. `ingressos_emitidos: emitidos=1`. MAS 2 erros: `conta_sem_friccao_email_falhou` e `email_ingressos_falhou`, ambos "Brevo respondeu 401 no envio transacional". Redelivery 19:00:30 tratada como `duplicado:true` (idempotência OK). Deploys de 04/08 03:42Z e 05:53Z confirmam binding dos 4 secrets (incl. QR_TOKEN_KEYS v1, BREVO_API_KEY v1) |
| 3. Firestore prod (estado do pedido) | ✅ FUNCIONOU | Leitura read-only via REST (authorized_user reconstituído do configstore, caminho DEPLOY-PREVIEW): `pedidos/{id}` → `status:"pago"`, `contaSemFriccao{contaCriada:true, contaUid:QbqlSxanxlcFeHCy4g47Vp7jlgz1, emailStatus:"falha_envio"}`; inscrito `…-i1` → `status:"confirmado"`, `codigoIngresso:"T93N7F"`, `qrToken` assinado kid prod1, `ingressoEmitidoEm 19:00:03Z`. O INGRESSO EXISTE. |
| 4. Brevo (eventos transacionais 04/08) | ✅ ROOT CAUSE | GET /v3/account com a BREVO_API_KEY de prod → HTTP 401 `"unrecognised IP address 187.112.108.181"` — allowlist de IPs AUTORIZADA ATIVA na conta Brevo. A chave é válida; o bloqueio é por IP. Cloud Functions gen1 tem egress IP dinâmico ⇒ allowlist NUNCA vai funcionar; 2 e-mails do pedido falharam 401 nos logs de prod (19:00:01Z e 19:00:04Z). O e-mail nem chegou a ser aceito pela Brevo (nada na fila; log de eventos inacessível pela mesma allowlist = elo "eventos Brevo" não-verificável, mas desnecessário: o 401 é pré-aceitação) |
| 5. Tela checkout (código polling pós-QR) | PENDENTE | — |
| 6. Área do cliente (superfície sem e-mail) | PENDENTE | — |

## Notas de sessão

- 2026-08-04: início da lane. `nrv audit emit invocation_start` OK.
- memória: `C:/dev/LEELA/memory.md` NÃO existe; `~/businesses/software-forge/memory/` NÃO existe (dir vazio/ausente). Sem memória prévia a carregar.
- `.firebaserc`: alias `prod` = `leela-hub`, `default` = `demo-leela`.

## Se o terminal cair

Retomar pela ordem dos elos acima; o que já tiver evidência está no report parcial ou nesta tabela. Nada foi alterado em produção (modo read-only absoluto).
