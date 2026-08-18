# DEPLOY-POSPAG — rodada DEC-0804 em produção

- Trace: `leela-pixreal-diag-20260804`
- Lane: DEPLOY-POSPAG
- Employee: sf-platform-lead (software-forge)
- Projeto: `leela-hub` (alias `prod`), config `firebase.prod.json`
- HEAD no deploy: `162a1276` (é o código que subiu, rules + functions + landing)

⚠ Durante a lane o HEAD avançou para `bca95e71` — commit de OUTRA lane em voo
(`docs(painel): a review da S1225 vira tres itens de dono…`). Conferi o diff:
toca só `leela-specs/**` e `.nirvana/handoffs/**`, **zero** arquivos em
`functions/src`, `apps/landing/app` ou `firestore.rules`. Logo, tudo o que foi
para produção continua correspondendo a `162a1276`.

## 1. Pré-flight

| Checagem | Resultado |
|---|---|
| `git status` (tracked) | limpo — zero arquivos modificados/staged |
| HEAD == origin/main | sim, ambos `162a1276853bc98747fca081619e43d2194ef838` |
| `npm run build` (functions) | verde, `tsc` sem saída |
| `npx tsc --noEmit` (functions) | verde, EXIT=0 |

### Arquivos de `functions/` tocados pela rodada

Commits `9abe8396 9d980bae e6c96a1d 946e41f4 bdc9a531 7f992e75 0bf6f60c a769cfb9`
(o range `aa1b0000..HEAD` não resolve neste repo — usei a lista explícita).

Fonte alterada dentro de `functions/src` (fora de testes):

- `checkout/reenviarEmailsPedido.ts` (NOVO — 9abe8396, 9d980bae, e6c96a1d, 946e41f4)
- `checkout/contaSemFriccao.ts` (9abe8396, 9d980bae)
- `email/enviarIngressos.ts` (9abe8396, 9d980bae, 946e41f4)
- `email/incidenteEmail.ts` (NOVO — 9d980bae)
- `eventos/emitirIngressos.ts` (9abe8396)
- `finance/getBankDetailsForPayout.ts` (9abe8396)
- `shared/auditoriaAcessos.ts` (NOVO — 9abe8396)
- `index.ts` (9abe8396 — só a linha de export da callable nova)
- `firestore.rules` (bdc9a531 — RN-469, comprador lê o próprio pedido)

Os demais commits (`7f992e75`, `0bf6f60c`, `a769cfb9`) tocam apenas
`apps/landing/**` e `leela-specs/**` → entram pelo deploy da landing.

### Fecho de dependências reversas

Grafo de imports de `functions/src` (excluindo `__tests__`) calculado por script;
90 functions exportadas em `index.ts`, 7 com o conjunto alterado no fecho:

| Function | Módulo | Toca | Deployada hoje? | Ação |
|---|---|---|---|---|
| `reenviarEmailsDoPedido` | `checkout/reenviarEmailsPedido.ts` | ela própria + contaSemFriccao, enviarIngressos, incidenteEmail, emitirIngressos, auditoriaAcessos | não (NOVA) | **deploy** |
| `asaasWebhook` | `checkout/webhookAsaas.ts` | contaSemFriccao, enviarIngressos, incidenteEmail, emitirIngressos | sim | **deploy** |
| `confirmarPagamentoSandbox` | `checkout/confirmarPagamentoSandbox.ts` | contaSemFriccao, enviarIngressos, incidenteEmail, emitirIngressos | sim | **deploy** |
| `getBankDetailsForPayout` | `finance/getBankDetailsForPayout.ts` | ela própria + auditoriaAcessos | sim | **deploy** |
| `ajustarCapacidadeLote` | `eventos/ajustarCapacidadeLote.ts` | getBankDetailsForPayout (re-export de `AUDITORIA_ACESSOS_COL`) → auditoriaAcessos | sim | **deploy** |
| `pagamentoWebhook` | `checkout/webhookPagamento.ts` | contaSemFriccao, enviarIngressos, incidenteEmail, emitirIngressos | **não** | fora da lista |
| `varrerIngressosOrfaos` | `eventos/varrerIngressosOrfaos.ts` | enviarIngressos, incidenteEmail, emitirIngressos | **não** | fora da lista |

`pagamentoWebhook` (webhook sandbox legado, `cbd032b7`) e `varrerIngressosOrfaos`
(`45c47220`) nunca foram deployados em `leela-hub` e **não** são desta rodada.
Deployá-los seria ADICIONAR function nova a produção, fora do que a lane autoriza.
Ficam registrados como pendência para quem decidir a varredura em prod.

**Lista final (5):**
`reenviarEmailsDoPedido, asaasWebhook, confirmarPagamentoSandbox, getBankDetailsForPayout, ajustarCapacidadeLote`

Baseline: 51 functions ativas em `leela-hub` antes desta lane.

## 2. Deploy das rules — OK

```
=== Deploying to 'leela-hub'...
i  deploying firestore
i  firestore: reading indexes from firestore.indexes.json...
i  cloud.firestore: checking firestore.rules for compilation errors...
+  cloud.firestore: rules file firestore.rules compiled successfully
i  firestore: uploading rules firestore.rules...
+  firestore: released rules firestore.rules to cloud.firestore
+  Deploy complete!
```

Release confirmado pela linha `released rules firestore.rules to cloud.firestore`.
Conteúdo liberado inclui a RN-469 (`bdc9a531`) — comprador lê o próprio pedido por
`responsavel.atletaId` ou `contaSemFriccao.contaUid`, `write: if false`.

## 3. Deploy das functions — OK (5/5)

Comando:

```
npx firebase-tools@13 deploy --only functions:reenviarEmailsDoPedido,functions:asaasWebhook,\
functions:confirmarPagamentoSandbox,functions:getBankDetailsForPayout,functions:ajustarCapacidadeLote \
  --project prod --config firebase.prod.json --non-interactive
```

```
+  functions: Finished running predeploy script.   (build + bundle-deploy.mjs OK)
i  functions: packaged C:\dev\LEELA\functions-deploy (318.5 KB) for uploading
i  functions: creating Node.js 20 (1st Gen) function reenviarEmailsDoPedido(us-central1)...
i  functions: updating Node.js 20 (1st Gen) function ajustarCapacidadeLote(us-central1)...
i  functions: updating Node.js 20 (1st Gen) function asaasWebhook(us-central1)...
i  functions: updating Node.js 20 (1st Gen) function confirmarPagamentoSandbox(us-central1)...
i  functions: updating Node.js 20 (1st Gen) function getBankDetailsForPayout(us-central1)...
+  functions[ajustarCapacidadeLote(us-central1)]      Successful update operation.
+  functions[confirmarPagamentoSandbox(us-central1)]  Successful update operation.
+  functions[getBankDetailsForPayout(us-central1)]    Successful update operation.
+  functions[asaasWebhook(us-central1)]               Successful update operation.
+  functions[reenviarEmailsDoPedido(us-central1)]     Successful create operation.
+  Deploy complete!
```

Zero falhas, zero retry. Function URL confirmada:
`https://us-central1-leela-hub.cloudfunctions.net/asaasWebhook`.

Avisos não-bloqueantes registrados (nenhum é desta rodada):

- runtime **Node.js 20 depreciado em 2026-04-30, decomissiona em 2026-10-31**.
  Todas as 51 functions gen1 da casa estão nele. Prazo real, dono do assunto é
  a lane de plataforma — não dá para deixar virar surpresa em outubro.
- `firebase-functions` desatualizado no `package.json` (upgrade tem breaking changes).
- `Unhandled error cleaning up build images` — imagens de build ficaram no
  Artifact Registry (custo pequeno e recorrente). Limpeza em
  `console.cloud.google.com/gcr/images/leela-hub/us/gcf`.

Confirmação independente pelo audit log do Cloud Functions — a callable nova
nasceu `ACTIVE`, com os DOIS secrets amarrados:

```
reenviarEmailsDoPedido: "state":"ACTIVE",
  "uri":"https://us-central1-leela-hub.cloudfunctions.net/reenviarEmailsDoPedido",
  "secretEnvironmentVariables":[{"secret":"QR_TOKEN_KEYS","version":"1"},
                               {"secret":"BREVO_API_KEY","version":"1"}],
  "runtime":"nodejs20", "environment":"GEN_1"
```

Registro para a lane de segurança (não é regressão, é o padrão da casa): o deploy
aplicou `SetIamPolicy` com `roles/cloudfunctions.invoker → allUsers` na callable.
É como o firebase-tools publica TODA callable — a porta de rede é aberta e quem
tranca é o código (`unauthenticated` sem `context.auth`, depois a checagem de
`platform_admin`). Vale saber que a superfície existe.

## 4. Deploy da landing — OK

`node apps/landing/scripts/deploy-leela-hub.mjs --non-interactive`. Li o script
antes de rodar: aponta para o site `leela-landing` via `firebase.landing.json`,
que declara UM site e nada mais — sem caminho para tocar painel, Functions ou Rules.

```
> firebase deploy --only hosting:leela-landing --project prod --config firebase.landing.json
✓ Compiled successfully
✓ Generating static pages (10/10)
i  functions: packaged .firebase\leela-landing\functions (266.06 MB) for uploading
+  hosting[leela-landing]: file upload complete   (96 arquivos, 14 novos)
i  functions: updating Node.js 22 (2nd Gen) function ssrleelalanding(us-central1)...
+  Deploy complete!
Hosting URL: https://leela-landing.web.app
[deploy-landing] package.json restaurado.
EXIT=0
```

**Patch temporário restaurado** — verificado por fora do log:
`git status --porcelain` (tracked) voltou VAZIO e `apps/landing/package.json.deploybak`
não existe mais.

### Prova do release: hash de chunk servido, antes × depois

`curl` na home de produção, antes e depois (a régua da RETOMADA-SEAL):

| Chunk | Antes | Depois |
|---|---|---|
| shared `870` | `870-0c99d48b449a785b.js` | **`870-a25ff9af6f89a86c.js`** |
| `main-app` | `main-app-6e6eae0686183405.js` | **`main-app-b21bdda6cce833e7.js`** |

Na página do evento `/teste-taxa-repassada`, além dos dois acima,
`796-0670ff28dca943cd.js` deu lugar a `287-a61479d249ed0a49.js`. Os chunks não
tocados pela rodada (`136-…`, `28-…`, `415a2810-…`, `4a2876f6-…`, `85-…`,
`polyfills-…`, `webpack-…`) seguem idênticos — o que é a prova de que o que mudou
foi exatamente o código do checkout, e não um rebuild cego.

Rollout confirmado no log do Cloud Run:

```
ssrleelalanding: Starting new instance. Reason: DEPLOYMENT_ROLLOUT …
ssrleelalanding: Default STARTUP TCP probe succeeded after 1 attempt … port 8080
```

Revisão nova: `ssrleelalanding-00025-kev`, `state: ACTIVE`,
`updateTime: 2026-08-05T02:14:36Z`.

⚠ Dois ruídos NÃO-fatais no log, dignos de nota porque vão reaparecer:

- `Failed to find esbuild with npx which` + `Failed to install esbuild:
  npm install esbuild@^0.19.2 --no-save` → `npm error Cannot read properties of
  null (reading 'matches')`. O deploy passou assim mesmo (o webpack do Next já
  embute o que precisa), mas é uma tentativa de instalação que falha em toda
  execução nesta máquina. Vale consertar antes que vire causa-raiz de um deploy
  que falha de verdade.
- O passo `updating … ssrleelalanding` levou **~13 min** (02:01 → 02:14) e o
  comando inteiro, **~22 min**, puxado pelo pacote de 266 MB. Não é erro, é o
  custo atual do deploy da landing — bom saber ao orçar uma janela.

## 5. Smoke pós-deploy (read-only)

### (a) `ingressoPorLink` com token inválido — RN-419 VIVA

```
POST /ingressoPorLink  {"token":"token-invalido-de-smoke-nao-existe"}  → 404 {"ok":false}
POST /ingressoPorLink  {}                                             → 404 {"ok":false}
GET  /ingressoPorLink                                                 → 405 {"ok":false}
```

Negativa única, sem oráculo: token inválido e token ausente devolvem exatamente
o mesmo corpo e o mesmo status. Confirmado também do lado do servidor no log:
`ingressoPorLink: took 109 ms, finished with status code: 404` / `6 ms … 404` /
`3 ms … 405`.

### (b) `https://leela-landing.web.app/teste-taxa-repassada` — 200

```
GET /teste-taxa-repassada            → http=200  39880 bytes
GET /teste-taxa-repassada/inscricao  → http=200  36513 bytes
GET /                                → http=200  54793 bytes
```

Servindo os chunks NOVOS (`870-a25ff9af…`, `main-app-b21bdda6…`).

### (c) Log de functions — sem erro novo

Janela pós-deploy, só operação normal:

```
virarLoteCron                  status: 'ok'   {"candidatos":7,"eventosProcessados":[]}
expirarCarrinhosAbandonados    status: 'ok'
dispatchCampanhasAgendadas     status: 'ok'
dispatchAutomacoes             status: 'ok'
ingressoPorLink                404 / 404 / 405  (as três chamadas do smoke)
```

Nenhum `error`/`falhou` novo. As únicas entradas de nível alto são audit logs do
próprio deploy (`CreateFunction`/`UpdateFunction`/`SetIamPolicy`), todas com
`granted: true` e principal `inguzbuilders@gmail.com`.

## 6. REENVIO OFICIAL — ⛔ BLOQUEADO, não executado

**A escrita de produção desta lane NÃO aconteceu.** Motivo: não consigo
autenticar como `platform_admin`. Parei aqui em vez de improvisar.

### O que foi tentado

```
POST accounts:signInWithPassword?key=AIzaSy…MMb4
     {"email":"admin@demo-leela.dev","password":"demo1234"}
→ http=400 {"error":{"code":400,"message":"INVALID_LOGIN_CREDENTIALS"}}
```

Duas tentativas, mesmo resultado. A chave web está certa: é literalmente a
`NEXT_PUBLIC_FIREBASE_API_KEY` de `apps/landing/.env.leela-hub`, projeto
`leela-hub`.

### Diagnóstico (lookup read-only, via o token do próprio firebase-tools)

A conta existe e está saudável — o que mudou foi a SENHA:

```json
{
  "email": "admin@demo-leela.dev",
  "localId": "FTqslV98itZUNGwL5ss6201d23Z2",
  "disabled": false,
  "emailVerified": true,
  "customAttributes": "{\"role\":\"platform_admin\"}",
  "passwordUpdatedAt": "2026-08-04T03:39:23.000Z",
  "lastLoginAt":       "2026-08-04T03:39:24.160Z",
  "validSince":        "2026-08-04T03:39:23.000Z",
  "providers": ["password"]
}
```

Leitura dos carimbos: a senha foi trocada em 04/08 03:39:23Z e um login teve
sucesso 1 segundo depois — e ninguém mais entrou desde então. Ou seja, a senha
em vigor é a que foi definida naquele instante, e **não é a `demo1234` que o
repositório publica**. O `enableImprovedEmailPrivacy: true` do projeto é o que
faz o erro vir genérico (`INVALID_LOGIN_CREDENTIALS` não distingue senha errada
de conta inexistente) — por isso o lookup administrativo, que é o único jeito
honesto de saber que a conta está viva e com a claim certa.

### Por que eu NÃO destravei sozinho

Redefinir a senha de um super-admin de produção seria (1) mutação de credencial
em produção, vizinha direta do "nenhuma rotação de secret" que a lane proíbe;
(2) sobrescrever em silêncio o que alguém deliberadamente definiu em 04/08; e
(3) exatamente o improviso que o brief manda não fazer. Também não existe caminho
alternativo legítimo: a callable exige `context.auth` com claim `platform_admin`,
e não há UI no painel (`grep reenviarEmailsDoPedido apps/` = zero ocorrências) —
o gesto só existe por REST.

### Estado do pedido do dono, lido AGORA (read-only, PII mascarada)

```json
{
  "status": "pago",
  "emailIngressos": null,
  "contaSemFriccao": {
    "processadoEm": "2026-08-04T19:00:01.971Z",
    "contaUid": "QbqlSxanxlcFeHCy4g47Vp7jlgz1",
    "pessoaVinculada": true,
    "contaCriada": true,
    "emailStatus": "falha_envio"
  },
  "reenvioEmails": null,
  "responsavel_email": "v***@gmail.com",
  "responsavel_atletaId": "wNXRTvMM3vc7Boyi91vRgx3DBQy2",
  "eventoId": "teste-taxa-repassada",
  "criadoEm":     "2026-08-04T18:57:44.509Z",
  "atualizadoEm": "2026-08-04T19:00:01.971Z"
}
```

Coleção `reenviosEmail`: **0 documentos**. Três coisas que isso prova:

1. nenhum reenvio foi tentado — a janela de 10 min está limpa e **`forcar` não
   é necessário** quando o gesto for executado;
2. `contaSemFriccao.emailStatus: "falha_envio"` é o carimbo do 401 da Brevo;
3. `emailIngressos` é `null` porque o carimbo de incidente (`9d980bae`) só
   entrou em produção AGORA, nesta lane — em 04/08 o código que grava esse campo
   ainda não estava no ar. Não é dado faltando, é ordem cronológica.

### Comando exato para quando a credencial existir

Payload validado contra a assinatura real em
`functions/src/checkout/reenviarEmailsPedido.ts` (`ReenviarEmailsInput`):

```json
POST https://us-central1-leela-hub.cloudfunctions.net/reenviarEmailsDoPedido
Authorization: Bearer <idToken de platform_admin>
{"data":{
  "pedidoId":"ped-wNXRTvMM3vc7Boyi91vRgx3DBQy2-chk-ed77a161-87e8-41c7-8e09-010f72ccd1dc",
  "reenvioId":"reenvio-oficial-t93n7f-20260805"
}}
```

`alvos` omitido = os dois e-mails (ingresso + conta), que é o desejado.
`forcar` fora, de propósito. A chave `reenvio-oficial-t93n7f-20260805` casa com
`REENVIO_ID_RE` (31 caracteres, começa com letra).

### Pré-checagem: o reenvio TEM o que enviar

Repliquei `lerIngressosVivosDoPedido` em leitura pura contra produção:

```json
{
  "inscritoId": "…-chk-ed77a161-…-i1",
  "status": "confirmado",
  "pedidoRef": "(confere)",
  "codigoIngresso": "T93N7F",
  "temQrToken": true,
  "qrTokenLen": 236,
  "checkinEm": null
}
```

`inscritoRefs` tem exatamente 1 item, ele está `confirmado`, com `qrToken` e
`codigoIngresso` válidos. Então o alvo `ingresso` NÃO vai cair em
`sem_ingresso` nem em `ingresso_incompleto`. E como `contaSemFriccao.contaCriada`
é `true`, o alvo `conta` também se aplica (não é `nao_aplicavel`). Com a Brevo
aceitando de novo, o desfecho esperado é `enviado` nos DOIS alvos.

Em outras palavras: falta só a credencial. Todo o resto está pronto e provado.

## 7. Verificação de entrega na Brevo — baseline (sem reenvio, nada a entregar)

A allowlist de IPs **caiu**: `GET /v3/account` respondeu **200** desta máquina
(era 401 `unrecognised IP address` no DIAG). A chave lida do Secret Manager
(`functions:secrets:access BREVO_API_KEY --project prod`) é válida.

```
GET /v3/smtp/statistics/events?email=vitoreldp@gmail.com&days=2  → 200  {}
GET /v3/smtp/statistics/events?days=7                            → 200  {}
GET /v3/smtp/statistics/aggregatedReport?days=7                  → 200
    {"range":"2026-07-29|2026-08-05","requests":0,"delivered":0,
     "hardBounces":0,"softBounces":0,"blocked":0,"invalid":0,"error":0, …}
```

**`requests: 0` e `delivered: 0` em sete dias.** Isso ratifica o root cause do
DIAG por um ângulo novo: os dois e-mails de 04/08 morreram ANTES da aceitação
(401 na borda), então a Brevo nunca registrou nem sequer um `request`. Não há
`delivered` a perseguir porque não houve envio.

Régua da casa aplicada: prova de entrega é o evento `delivered`. Hoje ele não
existe — e não vai existir enquanto o passo 6 não rodar. Quando rodar, o esperado
é `requests: 2` e `delivered: 2` para `vitoreldp@gmail.com`.

⚠ Plano da conta Brevo: **free, 300 e-mails de limite de envio**. Cabe o reenvio,
mas é um teto que a operação real vai encostar.

## 8. Auditoria

`nrv audit emit invocation_start` e `invocation_end`, trace
`leela-pixreal-diag-20260804`, lane DEPLOY-POSPAG, business `software-forge`,
employee `sf-platform-lead`, mais um `handoff --json` com o resumo. Gravados em
`.nirvana/logs/harness/2026-08-05/audit.jsonl`.

## Placar da lane

| Passo | Estado |
|---|---|
| 1. Pré-flight | ✅ tree limpo, HEAD == origin/main, build e `tsc --noEmit` verdes |
| 2. Rules | ✅ released |
| 3. Functions (5) | ✅ 5/5, zero retry |
| 4. Landing | ✅ release novo, chunks trocados, package.json restaurado |
| 5. Smoke | ✅ (a) RN-419 viva · (b) 200 · (c) log sem erro novo |
| 6. **Reenvio oficial** | ⛔ **NÃO EXECUTADO** — sem credencial de `platform_admin` |
| 7. Brevo | ⚠️ baseline apenas (`requests: 0`, `delivered: 0`); sem reenvio não há o que entregar |
| 8. Auditoria | ✅ |

**Zero escrita de produção nesta lane.** O único gesto de escrita autorizado
(passo 6) não aconteceu. Nada foi tocado no pedido do dono nem em qualquer outro.

## O que fica com o dono

1. **A senha do `admin@demo-leela.dev` em produção** (bloqueio do passo 6). Ela
   mudou em 04/08 03:39:23Z e a do repositório não vale mais. Com ela em mãos, o
   reenvio é um comando só — está pronto e escrito acima, e a pré-checagem já
   provou que ele tem o que enviar. Se a troca foi você fechando o ADMINSEP-3,
   melhor ainda: o caminho certo é criar o admin real e me passar como autenticar.
2. **ADMINSEP-3 continua aberto** e agora com uma consequência operacional
   medida: a lane parou porque a única conta de plataforma é a de demonstração,
   com fator único e senha fora de qualquer cofre.
3. **Node.js 20 decomissiona em 31/10/2026** e as 51 functions gen1 estão nele.
   Migração é trabalho de plataforma, não emergência — mas tem data.

## Pendências técnicas registradas (não são desta rodada)

- `pagamentoWebhook` e `varrerIngressosOrfaos` existem no código, foram afetados
  transitivamente, mas **nunca foram deployados em `leela-hub`**. Ficaram de fora
  de propósito. `varrerIngressosOrfaos` é a varredura que fecha pedido pago sem
  ingresso — vale decidir se ela deve existir em produção.
- `esbuild` falha ao instalar no deploy da landing (não-fatal hoje).
- Imagens de build sobrando no Artifact Registry (custo pequeno, recorrente).
- Deploy da landing custa ~22 min, dos quais ~13 min só no update do SSR.
