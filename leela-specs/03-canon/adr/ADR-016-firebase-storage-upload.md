---
tags: [leela, adr, arquitetura, storage, upload, seguranca]
---

# ADR-016 · Firebase Storage para upload de imagens (perfil/capa)

> Autor: sf-backend-lead (Software Forge) · DNA Kleppmann/Hightower · Trace: leela-build-2d6ee98d · Data: 2026-07-18
> Formato herda ADR-stack.md: contexto → decisão → status → consequência.

**Contexto.** Até o LEELA-R5 o repo NÃO tinha camada de Storage (nada em
`firebase.json`, sem `storage.rules`); toda imagem (foto de perfil da conta,
capa de clube, avatar/capa do perfil público @handle) era campo "URL externa
colada + prévia" — o organizador precisava hospedar a imagem em outro lugar.
A lacuna estava registrada em 4 telas e no V1-CHECKLIST. Upload é superfície
de SEGURANÇA (conteúdo arbitrário servido em página pública), então a escolha
do provedor e o desenho das regras são decisão type-1.

**Decisão.**
1. **Provedor = Firebase Storage** (default profissional): nativo do stack
   (Auth/claims compartilhados, mesmo projeto/billing), Rules declarativas
   fail-closed e **emulator-testável** (`emulators:exec --only
   firestore,storage`, `@firebase/rules-unit-testing` v4). Hightower check:
   zero componente novo de infra — o menor número de peças que resolve.
   Alternativas rejeitadas: S3/R2 + CDN (novo vendor, nova credencial, sem
   Rules integradas ao Auth — complexidade sem ganho na V1); upload via
   Function (custo de banda/latência dobrado e a validação de bytes real
   continuaria pendente do mesmo jeito).
2. **Paths CONTRATADOS com nome de objeto fixo** (allowlist, sem filename do
   usuário): `users/{uid}/foto-perfil|perfil-avatar|perfil-capa` e
   `clubes/{clubeId}/capa`. Re-upload SOBRESCREVE (sem órfãos, path estável);
   a downloadURL muda a cada upload (token novo) — cache busting de graça.
3. **Ownership**: `users/**` = `request.auth.uid == uid`; `clubes/**` =
   claim de papel writer (`tenant_owner|tenant_staff`) **E cross-service
   `firestore.get`** provando `clubes/{clubeId}.tenantId ==
   claim.tenantId` (claim sozinho não prova que o clube é meu; clube
   inexistente → get erra → NEGA).
4. **Payload**: contentType allowlist `image/(jpeg|png|webp|gif|avif)` —
   **SVG fora** (vetor de XSS) — e tamanho 1B..5MB. Read público SÓ nesses
   objetos (são intrinsecamente públicos: avatar/capas exibidos na landing).
   Catch-all `read, write: if false` (disciplina do firestore.rules).
5. **Zero mudança de shape nos docs**: a downloadURL alimenta os MESMOS
   campos de hoje (`Auth.photoURL`, `avatarUrl`/`imagemUrl` do perfil,
   `imagemUrl` do clube). URL externa colada continua aceita (fallback).
   Seam único de upload no api-client (`uploadFotoPerfilConta`,
   `uploadAvatarPerfilPublico`, `uploadCapaPerfilPublico`,
   `uploadCapaClube`); componente `FileInput` no DS.

**Status.** **ACEITA — RATIFICADA pelo Vitor em 2026-07-19** (rodada DEC-0719,
item 18: *"Firebase Storage confirmado"*). Era PROPOSTA aplicada por default
(LEELA-R5, 2026-07-18). Reverter = trocar o provedor atrás do seam do api-client;
os campos de URL não mudam. **Nota de decisão associada (item 19, RN-168):** o
*fallback de URL colada* — citado no ponto 5 desta ADR — foi **supersedido**: a
URL colada morre em TODAS as superfícies de imagem (upload-only), e toda
superfície ganha ação de TROCAR imagem + ajuste automático de proporção
(RN-170). O provedor ratificado aqui permanece; muda só a política de entrada
(sem URL colada). Ver `DECISOES-ABERTAS.md` §Ratificadas e a rodada
`02-rodadas/2026-07-19-decisoes/`.

**Consequência.**
- (+) Upload real nas 3 superfícies com Rules fail-closed provadas no
  emulator (25 testes de ataque/fluxo); preview do Vitor ganha Storage
  emulator (porta 9299 alt / 9199 testes).
- (+) Portabilidade: o doc guarda URL simples — trocar de provedor não
  migra schema.
- (−) **LIMITE HONESTO: o contentType é DECLARADO pelo cliente.** Rules não
  fazem sniffing de bytes — um PNG "de mentira" (bytes não-imagem com
  contentType image/png) passa. Mitigação real = processamento server-side
  (validação de magic bytes + re-encode + resize/thumbnail), registrado como
  FOLLOW-UP explícito (fora do R5 por decisão do brief). O risco residual é
  limitado: só o DONO autenticado escreve no próprio path, o objeto é servido
  como imagem (`<img>`) e nunca executado.
- (−) Cost-DoS residual: dono autenticado pode re-subir 5MB em loop (sem
  rate-limit de Storage na V1) — mesma classe do residual do R2, borda
  (App Check) é o home correto.
- (−) TTL/GC: objetos de usuário removido não são varridos (cascata LGPD do
  `deleteClube`/conta não cobre Storage ainda) — follow-up junto do
  processamento server-side.
- (−) RN-402 (tenant suspenso) NÃO é checado nas `storage.rules` (o Firestore
  bloqueia write de tenant suspenso via `tenantAtivo()`; o Storage não). Um
  owner de tenant suspenso ainda sobrescreve `clubes/{clubeId}/capa` no
  Storage — MAS não consegue persistir a `imagemUrl` no doc do clube (gated
  por `tenantAtivo` no Firestore), então o objeto fica órfão e o efeito é
  contido. Registrado como nota de coerência (review antagonista R5); alinhar
  se um dia a suspensão precisar cobrir Storage.

## Revisão antagonista (2× contexto fresco, 2026-07-18)
Duas reviews Fable independentes sobre diff + `storage.rules` + brief. Ambas
**APPROVE-COM-FIXES**, zero achado CRÍTICO/ALTO/MÉDIO de EXPLOIT — nenhum vetor
de gravação cross-user/cross-tenant, path traversal, SVG/XSS, contentType null,
vazio, >5MB ou nome de objeto arbitrário resistiu como furo (todos negados e
testados). Fixes aplicados e re-provados (emulator 33/33):
- regex de contentType ANCORADA `^…$` + 6 testes de token embutido
  (`text/html; image/png`, `image/gifx`, …) — fecha a única aposta não testada
  (substring-match → XSS);
- `read`/`delete` escopados à MESMA allowlist de nomes do `create/update`
  (least-privilege: objeto fora do contrato nunca nasce world-readable);
- `tenantId is string` no writer role (fecha edge `null==null`);
- 2 asserts de regressão platform_admin (negado na capa alheia e no user path);
- read público de imagem de perfil com perfil `privada` = decisão consciente
  documentada (imagem não é PII; path exige o uid).
