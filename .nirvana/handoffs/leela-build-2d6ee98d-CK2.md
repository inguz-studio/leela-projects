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
- [x] T4 — RN-156: base já incondicional (F-4a); NOVO termo CUSTOM aditivo em
      `eventos/{e}/termoSaude/config` (core termoSaude.ts; ''=inativo) + trigger
      `versionarTermoSaude` (bump material por hash) + fence in-tx no charge
      (`aceites.saudeCustom` obrigatório com termo ativo; prova versão+hash carimbada;
      inativo ignora flag) + Rules (owner-only, versão congelada, delete nunca) +
      leitor público `termoSaudeCustom {texto, versao}|null` + fixtures landing.
      Integração 5/5 + Rules 8/8 (ck2Rules).
- [x] T5 — RN-157: `PIX_EXPIRACAO_SEGUNDOS=1800` (fonte única core) →
      `pagamento.pixExpiraEm` carimbado do relógio injetado (parse exige forma pix) +
      `CreateChargeParams.pixExpiraEmSegundos` (Mock devolve/replay estável; Asaas:
      expirationDate do pixQrCode vence, fallback relógio+30min — premissa CK2-4b:
      dueDate do Asaas é DIA, enforcement fino é da plataforma) + resultado
      `pixExpiraEmMillis` + callable `expirarPixPendente` (dono-only, relógio do
      SERVIDOR decide, pendente→cancelado motivo pix_expirado nos 2 docs, webhook em
      corrida vence, idempotente). api-client: wrapper em checkout.ts (re-export raiz
      fica p/ lane FORM — index.ts em edição pela lane UPSW). Integração 6/6 + Asaas
      unit 3 novas + Mock contrato.
- [x] T6 `f46c83c` — review antagonista Fable contexto fresco: **APROVADO COM FIXES**. WIP do disco (vitest.setup.ts + config) aproveitado-e-commitado (pepper de TESTE global; a suíte de functions inteira roda verde com o checkout fail-closed do RN-173). Findings: F1 (MÉDIO→ALTO p/ prod: first-claim de CPF alheio sem prova de posse; ordem anônima-primeiro vaza PII da vítima via prefill) e F2 (conta/e-mail p/ e-mail arbitrário em pedido pago) **ESCALADOS como decisão type-1 de identidade do Vitor** (Direção A prova de posse vs. B claim segue o pagamento — NÃO redecidido em T6 p/ não pré-emptar); F3/F5/F6 LOW/INFO aceitos; F4 premissa já aceita. Gates: tsc/eslint 0 (functions+core+api-client+landing) · suíte functions INTEIRA **159 arquivos/2857 testes/0 falhas** (emulator TESTE via emulators:exec fb-tools@13 JDK 21; suítes CK2 também em 8480/9598).
- [x] T7 — report `outputs/leela-build-2d6ee98d/CHECKOUT2-MODELO-REPORT.md` (5 premissas consolidadas + review + escalação F1/F2) · boards: V1-KANBAN (cards DEC-0719 d/e/f → Feito; c reduzido a UI; card de DECISÃO F1/F2 no Backlog) + V1-CHECKLIST (LEELA-CK2-T1..T7) · épicos E19 (RN-173 pago + decisão F1/F2 aberta), E12 (status backend das 5 RNs), E04 (termo custom versionado).

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
