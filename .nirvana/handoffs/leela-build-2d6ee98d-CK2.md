# Handoff — leela-build-2d6ee98d · lote CHECKOUT2-MODELO (CK2)

employee: sf-backend-lead (software-forge) · modelo: Fable · 2026-07-19

## Estado por task

- [x] T1 — RN-173 CPF único global: registry `pessoas/{cpf_hmac32}` transacional (upsert na tx do
      checkout, corrida serializa por retry otimista), `pessoaRef` no inscrito (CAMPOS_FUNCTION +
      Rules + espelhos), first-claim de conta + anti-hijack, Rules `pessoas` deny-all.
      Integração 5/5 (incl. corrida concorrente) + unit 13 novas + espelhos 55.
- [x] T2 `706bf77` — RN-154: genero no input (enum GENEROS_INSCRITO reusado) → [reg] + dadosConhecidos
      da pessoa; callable `getCheckoutPrefill` (só o PRÓPRIO via contaUid do token; anônimo=null);
      api-client espelhado. Integração 3/3.
- [x] T3 — RN-155: `contaSemFriccao.ts` (conta Auth SEM senha na 1ª compra confirmada +
      `generatePasswordResetLink` oficial + EmailProvider fail-closed → carimbo
      `pedidos/{id}.contaSemFriccao` {contaUid, contaCriada, emailStatus: enviado|pendente_chave|
      falha_envio|nao_aplicavel, pessoaVinculada}); disparo best-effort pós-confirmação nos 3
      confirmadores (sandbox/pagamentoWebhook/asaasWebhook) — falha NUNCA quebra compra; template
      renderContaCriadaEmail (escape+link-servidor). Integração 5/5 (auth emulator real) + unit 3.
- [ ] T4 — RN-156 termo de saúde base sempre + custom aditivo versionado (fence server-side F-4a pattern)
- [ ] T5 — RN-157 PIX expira 30 min (contrato provider + pixExpiraEm + expirarPixPendente)
- [ ] T6 — review antagonista Fable contexto fresco + fixes re-provados
- [ ] T7 — boards/épicos E12/E19/E04 + report

## Decisões de desenho (premissas — consolidar no report)

1. **Registry `pessoas/{cpf_<hmac32>}`** — docId = HMAC-SHA256(CRM_ID_PEPPER, `pessoa:cpf:{cpf11}`)[0:32]
   (reuso do pepper do CRM, domínio de mensagem distinto — path sem PII; padrão do registry de
   @handle: unicidade estrutural pela CHAVE, escrita só por Function, Rules deny-all).
   CPF em claro FICA no doc (Function-only; necessário p/ prefill e gateway) — minimização RN-172
   segue valendo no CRM (que nunca lê este doc em claro).
2. **Anti-hijack de conta**: `contaUid` só é escrito quando null (first-claim); `dadosConhecidos`
   só atualiza se pessoa não-reivindicada OU caller autenticado == contaUid. Compra de terceiro com
   CPF alheio nunca lê nem regrava dados da vítima.
3. **Duplicatas pré-existentes**: registry nasce vazio; inscritos legados sem `pessoaRef` = leitura
   Postel; produção sem dado real ⇒ nada a migrar; backfill = reprocesso Admin futuro (follow-up).
4. **PIX expirado**: transição escolhida = `pendente → cancelado` + `canceladoMotivo: 'pix_expirado'`
   (matriz existente reusada; retry = NOVA cotação/pedido com idempotencyKey nova — BC-1).
   Enforcement de 30 min é da PLATAFORMA (Asaas real: dueDate é dia-nível; contrato do provider
   coberto por teste; follow-up produção: cancelar cobrança no gateway ao expirar).
5. **Link de senha** = `admin.auth().generatePasswordResetLink` (fluxo oficial Firebase, oobCode
   single-use). Conta já existente ⇒ não recria, não reenvia (idempotente por marker no pedido).

## Portas/lanes

Emulator TESTE: 8480/9598 (`firebase.r6.json` + emulators:exec fb-tools@13, JDK 21 ~/.jdks) —
NUNCA :8180/:9198 do preview. Não tocar: apps/painel, apps/landing (exceto leitores), packages/design-system,
.nirvana/HANDOFF.md, produto/00-MOC-produto.md. Lane UPLOAD-SWEEP ativa no painel.
