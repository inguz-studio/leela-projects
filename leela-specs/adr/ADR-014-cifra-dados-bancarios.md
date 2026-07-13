---
tags: [leela, adr, arquitetura, seguranca, lgpd, repasse, proposta]
---

# ADR-014 · Cifra dos dados bancários do organizador (AES-256-GCM + Secret Manager)

**Status.** 🟡 **PROPOSTA — aguarda sim/não do Vitor.** Resolve a decisão #5 do brief E09-slim (consolidador 2026-07-05: "AES-256-GCM com chave no Secret Manager; ADR curto antes de L2-T2; KMS pós-V1"). Implementada em `saveDadosBancarios`/`getBankDetailsForPayout` (E09s-L2-T2/T5) conforme o desenho abaixo — ajuste do Vitor ⇒ ajuste no código, o envelope persistido carrega `keyVersion` justamente para isso.

**Contexto.** RN-354 (LGPD): o número da conta e a chave PIX do organizador são dado bancário sensível. O modelo L1 já separa `tenants/{tid}/dadosBancarios/current` (MASCARADO — `****1234`, único legível por cliente) de `tenants/{tid}/dadosBancariosSecret/current` (blob cifrado, `read:false`/`write:false` para TODO cliente nas Rules — só Function via Admin SDK). Falta fixar o MECANISMO da cifra. A ameaça-modelo da V1: (a) vazamento de um dump do Firestore (backup, export, acesso indevido ao console) não pode expor conta/PIX em claro; (b) um blob copiado de um tenant para outro não pode decifrar; (c) o acesso legítimo do admin ao número completo é raro (payout manual mock — RN-356) e SEMPRE auditado (L2-T5). NÃO está na ameaça-modelo da V1: comprometimento do runtime das Functions (quem controla o runtime lê a chave — isso só KMS/HSM com política de acesso resolve, e mesmo assim parcialmente).

**Decisão (proposta).**

1. **Algoritmo: AES-256-GCM** (`node:crypto`, nativo — zero dependência nova). Envelope por doc, no shape que o L1 já fixou em `DadosBancariosSecret`: `{ algoritmo: 'aes-256-gcm', ciphertext, iv, authTag, keyVersion }` (base64; IV de 12 bytes ÚNICO por escrita via `randomBytes`; authTag de 16 bytes). Payload em claro = JSON `{ conta, pix }` — só os dois campos sensíveis; o resto (banco, agência, titular) não é segredo bancário e vive mascarado/aberto no doc público.
2. **AAD = `tenantId`.** O GCM autentica dados associados: cifrar com `setAAD(tenantId)` faz um blob **copiado para outro tenant falhar a decifra** (integridade de contexto, não só de conteúdo). Ataque (c) do modelo morre aqui.
3. **Chave: Secret Manager, exposta como env `BANK_DATA_KEY`** (base64 de 32 bytes). Em produção, via `runWith({ secrets: ['BANK_DATA_KEY'] })` do Functions v1 — o Secret Manager injeta como variável de ambiente, a chave nunca vai para código/repo/config não-secreta. No Emulator/testes, a mesma env setada localmente. **Sem a env, a Function falha fechada** (`failed-precondition` — nunca grava em claro, nunca "cifra" com chave derivada de fallback).
4. **Rotação por versão.** `BANK_DATA_KEY_VERSION` (int, default 1) carimba `keyVersion` no envelope a cada escrita. Rotacionar = publicar chave nova como `BANK_DATA_KEY` + bump da versão + manter a(s) anterior(es) como `BANK_DATA_KEY_V{n}`; a decifra escolhe a chave pelo `keyVersion` do envelope (atual → `BANK_DATA_KEY`; antiga → `BANK_DATA_KEY_V{n}`). Re-cifra é **lazy**: o próximo `saveDadosBancarios` do tenant regrava com a versão vigente — sem job de re-cifra em massa na V1 (1 doc por tenant, reenvio é 1 write).
5. **Nunca em log.** Conta/PIX em claro não aparecem em `logger.*`, `HttpsError.message` nem Sentry — logs carregam só ids, versão de chave e resultado. A leitura em claro existe num ÚNICO ponto (`getBankDetailsForPayout`, platform_admin, auditado — L2-T5).

**Por que NÃO Cloud KMS na V1 (mock).** O payout da V1 é registro manual (RN-356) — não há integração bancária real e o dado é lido raramente, por 1 admin. KMS traria: dependência de API externa em toda escrita/leitura (latência + indisponibilidade), custo por operação, impossibilidade de rodar no Emulator (testes da cifra virariam mock do KMS — exatamente o que se quer provar deixaria de ser provado), e setup de IAM que o projeto ainda não tem. O ganho real do KMS (chave nunca presente no processo; política de acesso auditável no nível da chave; HSM) importa quando houver transferência bancária REAL e equipe com acesso segregado — **pós-V1, junto do gateway de payout**. O envelope com `keyVersion` já deixa a migração barata: trocar o "abridor de envelope" sem tocar nos dados.

**Fora de escopo agora.** Re-cifra em massa agendada; múltiplas chaves por tenant; cifra dos campos não-sensíveis (banco/agência/titular — abertos por necessidade operacional do admin conferir o favorecido); CPF/CNPJ completo (NÃO é armazenado em lugar nenhum — só mascarado; minimização LGPD: o admin confere o favorecido por titular + final do documento).

**Consequência.**
- `functions/src/finance/cifraDadosBancarios.ts` concentra cifrar/decifrar/mascarar (puro, unit-testável sem Emulator — roundtrip, IV único, AAD errada falha, chave errada falha).
- Operacional: registrar `BANK_DATA_KEY` no Secret Manager ANTES do primeiro deploy real (`firebase functions:secrets:set BANK_DATA_KEY`); gerar com `openssl rand -base64 32`. Emulator/CI usam chave efêmera de teste.
- **Alternativa rejeitada:** Cloud KMS já na V1 | custo/latência/impossibilidade de teste no Emulator desproporcionais a um payout mock lido raramente (ver seção acima).
- **Alternativa rejeitada:** cifra client-side (organizador cifra no navegador) | a chave teria que viver no cliente — qualquer XSS/extensão lê; e o admin não conseguiria decifrar para pagar. Server-side com secret é estritamente melhor aqui.
- **Alternativa rejeitada:** hash/tokenização em vez de cifra | payout manual PRECISA do número completo de volta (reversível por desenho); hash não devolve, tokenização exige cofre externo que a V1 não tem.
- **Alternativa rejeitada:** chave em `functions.config()`/`.env` commitado | config não-secreta vaza em export/CI; Secret Manager é o lugar de segredo no stack Firebase, com o mesmo esforço de código.

---
Relacionado: [[ADR-006]] · [[ADR-013]] (ADR-orquestracao-pagamento) · [[modelo-de-dados-firestore]] · RN-354/356/357 · E09s-L1 (shape `DadosBancariosSecret`) · E09s-L2-T2/T5
