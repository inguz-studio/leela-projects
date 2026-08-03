# Handoff vivo · lane PIXFIX-EXTREF · trace leela-build-2d6ee98d · 2026-08-02/03

Executor: sf-backend-lead (software-forge). Brief: `.nirvana/briefs/leela-build-2d6ee98d-PIXFIX-EXTREF-enriched.md`.
Diagnóstico de origem: `.nirvana/outputs/leela-build-2d6ee98d/INV-PIXINTERNAL-REPORT.md`.

Base: `main` em `36587d8`. Sem push — o maestro pusha.
Território: `functions/**` + `firestore.indexes.json`. **Zero arquivo tocado em `apps/**` ou `packages/**`** (a lane KITCUPOM-BUILD é dona desses agora).

## Estado da fila

- [x] **T1 · formato** — sufixo do `externalReference` vira digest de 16; 155 → 91 chars
- [x] **T2 · guarda dura** — teto de 100 recusado com erro NOMEADO, medido com id de tamanho real
- [x] **T3 · fim do "internal"** — família `AsaasError` inteira sai tipada e humana
- [x] **T4 · índice de `parcerias`** — collectionGroup `status+tenantId+tipo`
- [x] **T5 · deploy cirúrgico + prova** — `createInscricaoCharge` + `firestore:indexes`, exit 0
- [ ] **T6 · parecer read-only sobre os contadores**

---

## T1 · o `externalReference` cabe no gateway

Commit `34ed0e7`.

A aritmética inteira do defeito, que é o defeito:

```
externalReference = `${pedidoId}::charge-${pedidoId}`
pedidoId          = 'ped-' + uid(28) + '-' + chave(40)   = 73
externalReference = 73 + 2 + 7 + 73                      = 155
limite do Asaas                                          = 100
```

O sufixo nunca carregou informação: no único caller de produção a chave é
`charge-${pedidoId}`, função pura do prefixo. O que ele dá é **estabilidade** — a
mesma chave tem de produzir sempre o mesmo valor, senão o lookup
`GET /payments?externalReference=` deixa de achar o replay antes do POST e a segunda
tentativa cria a **segunda cobrança**. Um digest sha256 hex truncado em 16 preserva a
propriedade em tamanho fixo: **73 + 2 + 16 = 91**, com folga de 9.

O prefixo fica **verbatim**. É dele que o `parseExternalReference` tira o `orderId`, e é
o `orderId` que abre o pedido no Firestore quando o webhook chega. Digest no prefixo
teria trocado um defeito que aparece ANTES do pagamento por um que aparece DEPOIS —
compra paga que nunca confirma.

`parseExternalReference` passa a devolver `idempotencyDigest`. O campo mudou de
natureza; manter o nome `idempotencyKey` seria mentira no tipo. Nenhum consumidor de
produção lia esse lado — só o `orderId` (conferido: `webhookAsaas.ts`,
`webhookPagamento.ts`, `index.ts`).

**Janela sem migração:** `createInscricaoCharge` nunca retornou 200 em produção
(0 × 200 na janela 28/07→03/08, §2.4 da INV). Não existe cobrança com o formato antigo.
A janela fecha na primeira compra bem-sucedida.

| Gate | Resultado |
|---|---|
| `npm run build` (tsc) | **exit 0** |
| `eslint --max-warnings 0` | **exit 0** |
| `asaasProvider.test.ts` | **89 passed / 1 skipped** (87 antes) |
| `webhookAsaas.integration.test.ts` (emulador) | **13/13**, script exit **0** (12 antes) |

O teste do webhook usa `pedidoId` de 73 chars e o formato novo, e afirma
`resultado.pedidoId === pedidoId` — é a prova de que o desempate do webhook sobrevive.

## T2 · a guarda que faltava

Commit `3e056ec`.

`validarCreateCharge` reconstrói o `externalReference` e recusa acima de 100 com
`AsaasExternalReferenceTooLongError` (subclasse de `AsaasValidationError`, para quem já
tratava a família). Validar por **reconstrução**, e não por conta paralela, é o ponto: a
guarda usa o mesmo `buildExternalReference` do `createCharge`, então não tem como
divergir do valor enviado.

Por que a suíte não pegava o bug, e o que mudou: as fixtures usavam `ped-1` (19 chars); o
HTTP do Asaas é 100% mockado e a validação de tamanho é **server-side do gateway**; no
emulador `ASAAS_API_KEY` é vazia e o `selectPaymentProvider` devolve o mock, que nem monta
`externalReference`. Nenhuma das três mudou. O que mudou é que a plataforma agora **mede
sozinha**, com a fixture canônica de tamanho real (uid 28 + chave 40 = pedidoId 73).

Aritmética do que a guarda deixa passar:

```
len(orderId) ≤ 100 − 2 − 16 = 82     e     len(pedidoId) = 33 + len(chave)
⇒ chave até 49 chars passa; de 50 a 64 é recusada.
```

| Gate | Resultado |
|---|---|
| `npm run build` (tsc) | **exit 0** |
| `eslint --max-warnings 0` | **exit 0** |
| `asaasProvider.test.ts` | **93 passed / 1 skipped** (89 depois do T1) |

## T3 · nenhuma recusa do gateway imprime "internal"

Commit `7b5ba3e`.

O comentário escrito em 26/07 no próprio arquivo previu o desfecho letra por letra, e a
tradução só existia para o timeout. A família `AsaasError` inteira agora sai tipada:

| Situação | `code` do HttpsError |
|---|---|
| 429 | `resource-exhausted` |
| 5xx | `unavailable` |
| 4xx | `failed-precondition` |
| validação/mapeamento do adapter | `failed-precondition` |
| erro que **não** é do adapter | sobe cru (a tradução não engorda) |

A mensagem não diz "nada foi cobrado": verdade num 4xx, indeterminado num 5xx. A única
coisa verdadeira em todos os casos é o contrato do retry, e é o que ela promete. O código
do provedor entra entre parênteses no fim; o `err.message` cru **não** atravessa a
fronteira (ele carrega o valor recusado, e o valor carrega o uid) — fica no
`logger.error`, server-side.

⚠️ Um teste desta suíte **pinava o defeito** ("erro que NÃO é timeout continua subindo
cru"). A intenção original — um 400 é veredito, não pode virar "processando pagamento" —
foi preservada: a separação agora se prova por `code` e `motivo` distintos. O equivalente
para erro fora do adapter (um `TypeError` nosso) entrou no lugar.

| Gate | Resultado |
|---|---|
| `npm run build` (tsc) | **exit 0** |
| `eslint --max-warnings 0` | **exit 0** |
| `asaasTetoCheckout.integration.test.ts` (emulador) | **11/11**, script exit **0** (8 antes) |

Inclui a reencenação do erro de 02/08 com o corpo verbatim do Asaas.

## T4 · o índice de `parcerias`

Commit `597d499`. Colateral 2 da INV, independente do PIX e falhando no site público:

```
2026-08-03T00:31:32Z ssrleelalanding: [leitorPerfil]
listarPatrocinadoresPublicosDoTenant falhou Error: 9 FAILED_PRECONDITION
```

Escopo **COLLECTION_GROUP** (a query é `collectionGroup('parcerias')` — índice de coleção
não serve consulta de grupo). Três igualdades: `status`, `tenantId`, `tipo`, na ordem que
o próprio Firestore sugere no corpo do erro.

O comentário do `leitorPerfil` já avisava que o deploy real exigia o índice e que estava
"registrado como pendência operacional". Nunca virou linha no arquivo; o emulador cria
índice sozinho, então o defeito só existia em produção. Consequência visível: o `catch`
devolve `[]` honesto e a **faixa de patrocinadores some da página pública** sem estado
vazio e sem erro — falha silenciosa.

Gate: JSON parseia, **15 índices** (14 antes).

## T5 · o deploy cirúrgico, e a prova que cabe sem criar compra

Receita (DEPLOY-PREVIEW), com o alvo estreitado a duas coisas:

```
npx firebase-tools@13 deploy \
  --only functions:createInscricaoCharge,firestore:indexes \
  --project prod --config firebase.prod.json --force
```

| | |
|---|---|
| Exit do comando | **0** — *Deploy complete!* |
| Predeploy | `npm --prefix functions run build` (tsc) + `bundle-deploy.mjs` — ambos OK |
| Pacote enviado | `functions-deploy` **298,47 KB** |
| Function | `createInscricaoCharge(us-central1)` — *Successful update operation* |
| Índices | *deployed indexes in firestore.indexes.json successfully for (default) database* |
| Outras 70+ functions | **intocadas** (o filtro é por nome) |
| Mutação de dado de produção | **nenhuma** além do deploy |

### Prova 1 — o código servido mudou, e mudou no lugar certo

O bundle é o artefato que sobe. Contagem de marcadores no `functions-deploy/index.js`
**antes** (o de 29/07, que estava em produção) e **depois** do predeploy:

| Marcador | Antes | Depois |
|---|---|---|
| `digestIdempotencyKey` | 0 | **4** |
| `EXTERNAL_REF_MAX_LEN` | 0 | **4** |
| `AsaasExternalReferenceTooLongError` | 0 | **5** |
| `idempotencyDigest` | 0 | **1** |
| `checkout_gateway_recusou` | 0 | **1** |
| `checkout_gateway_sem_resposta` (controle — não podia sumir) | 1 | **1** |

E o corpo da função no bundle, verbatim:

```js
return `${orderId}${EXTERNAL_REF_SEP}${digestIdempotencyKey(idempotencyKey)}`;
```

A última linha da tabela é o controle: se ela tivesse zerado, o deploy teria trocado o
comportamento por outro em vez de consertá-lo.

### Prova 2 — a release nova está no ar e aceita chamada

O audit log registra `UpdateFunction` em **2026-08-03T01:27:40Z** (o anterior era
**2026-07-29T15:04:18Z** — o deploy do `CRM_ID_PEPPER`), com os três segredos declarados
no `runWith` (`ASAAS_API_KEY`, `ASAAS_WEBHOOK_AUTH_TOKEN`, `CRM_ID_PEPPER`).

Sonda de **mutação zero** contra o endpoint público (preflight CORS, não executa o corpo
do handler e não escreve nada):

```
OPTIONS https://us-central1-leela-hub.cloudfunctions.net/createInscricaoCharge
→ 204, 0,52 s
log: 2026-08-03T01:31:27 Function execution took 116 ms, status code: 204
```

Contagem no log **depois** do deploy: 4 linhas, **0** com `invalid_externalReference`,
**0** com `status code: 500`. Antes do deploy eram 4 × 500 em 4 tentativas.

⚠️ Isto **não** é a prova da compra. Preflight não chega ao gateway. A prova de que o
`externalReference` de 91 chars é aceito só existe quando alguém percorrer a jornada, e
isso é do dono (o brief proíbe eu criar compra).

### Prova 3 — o índice está registrado em produção

`firestore:indexes --project prod` devolve **15 índices** (14 antes), incluindo:

```
COLLECTION_GROUP  parcerias  status + tenantId + tipo
```

Confere byte a byte com o que o próprio Firestore pediu. O link do erro em produção
carrega o índice codificado, e ele decodifica exatamente para
`collectionGroups/parcerias`, scope `2` (COLLECTION_GROUP), campos `status`, `tenantId`,
`tipo`, `__name__`, todos ASCENDING.

Índice composto leva minutos para construir depois do deploy. A confirmação visual — a
faixa de patrocinadores reaparecendo na página do organizador — é conferência do dono.

---

## Premissas assumidas (vetáveis)

1. **Digest no sufixo, prefixo verbatim** (T1) — segue a recomendação 1 da INV. Custo de
   vetar: a alternativa que também cabia era `externalReference = orderId` puro (ADR-011
   original), que mataria o `::` — o discriminador que separa cobrança nossa de cobrança
   alheia no webhook, hoje usado para dar ACK sem efeito a cobranças criadas no painel do
   Asaas. Recusei por isso.
2. **`parseExternalReference` devolve `idempotencyDigest`** (T1), não `idempotencyKey`. É
   renomeação de campo de retorno de função pura; nenhum consumidor de produção lia esse
   lado. Custo de vetar: um nome que mente sobre o conteúdo.
3. **RN-333 (chave 8–64) NÃO foi apertada** (T2). Com o formato novo, chave de 50 a 64
   chars produz `externalReference` de 101 a 115 e a guarda recusa — com erro claro, antes
   do POST, em vez de um 400 opaco do gateway. A landing emite 40 por construção
   (`chk-` + `randomUUID`) e é o único cliente. Apertar contrato publicado num hotfix P0 é
   decisão do dono. Custo de vetar (= apertar): uma linha na validação de input e uma RN
   editada; ganho = a recusa passa a acontecer na fronteira, não no adapter.
4. **`MOTIVO_GATEWAY_RECUSOU` / `MSG_GATEWAY_RECUSOU` nascem em `functions/`, não no
   `@leela/core`** (T3), porque `packages/**` é território da KITCUPOM-BUILD nesta janela.
   A UI já renderiza `error.message` e a frase foi escrita para ser lida crua, então o
   cliente não precisa da constante. Custo de vetar: promover ao core depois, se o dono
   quiser uma **tela** própria para o caso (follow-up abaixo).
5. **A mensagem do T3 não afirma "nada foi cobrado"** — ver seção T3. Custo de vetar: duas
   frases que divergem por status, e a chance de a divergência se perder na próxima edição.

## Follow-ups fora do território (não executados)

1. `apps/landing/lib/leitorPerfil.ts:114-115` — o comentário ainda diz que o índice é
   "pendência operacional". Depois do T5 ele está desatualizado.
2. `apps/landing/.../checkout/CheckoutFlow.tsx` — se o dono quiser tela própria para
   `MOTIVO_GATEWAY_RECUSOU` (hoje ela renderiza `error.message`, que já é humano), a
   constante precisa subir para o `@leela/core`.
3. `MaxListenersExceededWarning` recorrente no `ssrleelalanding` (colateral 3 da INV) —
   11 listeners acumulando. Ruído hoje, vazamento amanhã. Nada feito.

## Pendências do DONO

1. **O teste canônico de compra real, ponta a ponta, é dele.** Nenhuma compra foi criada
   por esta lane, por instrução do brief. Depois do T5, a jornada precisa ser percorrida
   uma vez para provar o primeiro `200` na história desta function.
2. Decisão sobre a premissa 3 (apertar ou não a RN-333).
3. Decisão sobre os dois pedidos órfãos (T6).

## Commits desta lane (sem push — o maestro pusha)

| # | Hash | Task |
|---|---|---|
| 1 | `34ed0e7` | T1 · sufixo do `externalReference` vira digest de 16 |
| 2 | `3e056ec` | T2 · guarda dura do teto de 100, com id de tamanho real |
| 3 | `7b5ba3e` | T3 · nenhuma recusa do gateway volta a imprimir "internal" |
| 4 | `597d499` | T4 · índice `parcerias` (collectionGroup) |
