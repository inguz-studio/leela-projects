# Handoff vivo · lane CHECKOUT-PIXQR-INV · trace leela-build-2d6ee98d · 2026-07-29

Executor: sf-reliability-engineer (software-forge). Brief: `.nirvana/briefs/leela-build-2d6ee98d-CHECKOUT-PIXQR-INV-enriched.md`.
Autoridade do sintoma: `leela-specs/02-rodadas/2026-07-29-checkout-ux/01-achados-dono.md` (DEC-0729, achados 1, 2, 4 e 6).
Natureza: **investigação de incidente em produção** (read-only por default). Nada foi comprado.

## Estado

- [x] **Q1 · Por que o QR do PIX não renderiza** — root cause provado por log de produção
- [x] **Q2 · "Calculando total" preso** — medido por log de produção (durações reais da chamada)
- [x] **Q3 · Taxa de serviço do meia-floripa-2026** — config real lida no Firestore de produção
- [x] **Q4 · Cupons `FLORIPARUN10` / `RITMOFORTE10`** — veredito provado pela API pública
- [x] **Fix de config aplicado e provado** — binding do secret + redeploy de UMA function
- [x] Resumo executivo + self-score

---

## Q1 · Root cause do QR do PIX (achado 1 · ALTA)

**Classificação: CONFIG (secret não vinculado à function deployada). Não é gateway, não é front, não é timeout.**

O comprador clicou em pagar **três vezes** (14:07:31, 14:07:42, 14:07:50 UTC de 2026-07-29). As três
chamadas de `createInscricaoCharge` terminaram em **HTTP 500** antes de qualquer contato com o Asaas.
O QR nunca chegou a existir: a function morreu no meio do caminho, o callable devolveu `internal`,
e a tela não tinha o que renderizar.

### Prova (log real de produção)

Comando:

```
npx firebase-tools@13 functions:log --project prod --config firebase.prod.json --lines 400
```

Trecho literal (as três tentativas são idênticas; abaixo a primeira):

```
2026-07-29T14:07:31.655079602Z D createInscricaoCharge: Function execution started
2026-07-29T14:07:32.118885Z D createInscricaoCharge: {"message":"Callable request verification passed","verifications":{"app":"MISSING","auth":"VALID"}}
2026-07-29T14:07:39.807789Z E createInscricaoCharge: Unhandled error Error: CRM_ID_PEPPER ausente — a chave de cliente do CRM é HMAC com pepper secreto (hardening A3, fail-closed). Produção: provisionar no Secret Manager; emulator/teste: setar env explícita de teste.
    at crmIdPepper (/workspace/index.js:14372:15)
    at impressaoDoCarrinho (/workspace/index.js:15044:89)
    at docIdTravaPix (/workspace/index.js:15047:47)
    at avaliarTravaPix (/workspace/index.js:15050:65)
    at lerTravaPixForaDaTx (/workspace/index.js:15088:14)
    at encerrarPixAnteriorNaCriacao (/workspace/index.js:15092:34)
    at createInscricaoChargeCore (/workspace/index.js:16043:69)
2026-07-29T14:07:39.810323267Z D createInscricaoCharge: Function execution took 8155 ms, finished with status code: 500
```

As outras duas: `14:07:45.636` (2815 ms, 500) e `14:07:52.893` (2666 ms, 500). Mesmo stack, mesmo erro.

### Cadeia causal

1. `createInscricaoChargeCore` chama `encerrarPixAnteriorNaCriacao` (mata cobrança PIX anterior do
   mesmo carrinho antes de criar a nova — RN da trava de cobrança).
2. Isso desce até `docIdTravaPix` → `impressaoDoCarrinho`, em
   `functions/src/checkout/travaCobrancaPix.ts:166`, que faz
   `createHmac('sha256', crmIdPepper())` para derivar o id do documento de trava.
3. `crmIdPepper()` (`functions/src/crm/agregarClientes.ts:101-107`) lê `process.env['CRM_ID_PEPPER']`
   e **lança fail-closed** quando ausente.
4. O secret **não está vinculado** a esta function. `createInscricaoCharge` declara apenas:

   ```ts
   // functions/src/checkout/createInscricaoCharge.ts:2138-2140
   export const createInscricaoCharge = runWith({
     timeoutSeconds: TETO_CALLABLE_CHECKOUT_SEGUNDOS,
     secrets: ['ASAAS_API_KEY', 'ASAAS_WEBHOOK_AUTH_TOKEN'],
   })
   ```

   `CRM_ID_PEPPER` está fora da lista. Hoje o único `runWith` que o declara é
   `onInscritoWriteCrm` (`functions/src/crm/agregarClientes.ts:428`).

5. O secret **existe e está provisionado** no Secret Manager do `leela-hub` — confirmado por
   `npx firebase-tools@13 functions:secrets:access CRM_ID_PEPPER --project prod` (valor retornado;
   não transcrito aqui). Portanto **não falta provisionar: falta vincular**.

### Por que isto não apareceu antes

O emulador roda `demo-leela` e carrega `functions/.env.local`, onde `CRM_ID_PEPPER` tem valor de
teste explícito — ou seja, no emulador a variável está no `process.env` do processo inteiro e
qualquer function a enxerga. Em produção o Cloud Functions injeta o secret **só** nas functions que
o declaram em `runWith({ secrets })`. A suíte verde no emulador não podia pegar este defeito: ele
só existe no modelo de isolamento de produção. Prod é o único ambiente real.

### Blast radius (quem mais precisa do pepper e não tem)

`crmIdPepper` é importado por dois módulos do checkout:

- `functions/src/checkout/pessoaRegistry.ts:42`
- `functions/src/checkout/travaCobrancaPix.ts:89`

Ambos são importados por **um único** ponto de entrada deployado: `createInscricaoCharge`
(`createInscricaoCharge.ts:118` e `:134`). Nenhuma outra function deployada depende do pepper sem
declará-lo. **Raio de explosão: uma function.**

### Consequência de produto

Enquanto o secret não for vinculado, **nenhuma compra fecha em produção** — nem PIX, nem cartão.
O defeito é anterior à escolha da forma de pagamento (a trava PIX é avaliada antes do gateway).
Isto é P0 de go-live, não fricção de UX.

---

## Q2 · "Calculando total" preso (achado 2 · média)

**Classificação: latência real do servidor + chamadas redundantes. Não é bug de front, não é
travamento — a tela está honestamente esperando uma resposta que demora.**

O texto vive em `CheckoutFlow.tsx` / `StepResumo.tsx` e cobre a chamada `cotarInscricaoCheckout`.
Durações reais medidas no log de produção, sessão do dono:

| horário (UTC) | duração | status |
|---|---|---|
| 14:07:16.033 | **8725 ms** | 200 |
| 14:07:18.962 | **5655 ms** | 200 |
| 14:07:20.420 | **5847 ms** | 200 |
| 14:26:17.156 | 5325 ms | 200 |
| 14:26:18.923 | **9796 ms** | 200 |
| 14:27:05.592 | 3262 ms | 200 |
| 14:27:08.426 | 4396 ms | 200 |
| 14:29:34.835 | 1721 ms | 200 |
| 14:32:16.812 | 1772 ms | 200 |

Leitura:

1. **Piso quente ≈ 1,7 s.** As duas últimas medições (instância já aquecida, mesmo payload) ficam em
   1721/1772 ms. Esse é o custo de trabalho real da cotação — não é cold start.
2. **Cauda de cold start ≈ 5-10 s.** As primeiras chamadas de cada sessão custam 3-10× o piso. O
   dono viu exatamente isso: a primeira cotação da jornada é a mais lenta, e é a que ele encontra.
3. **Chamadas redundantes.** Em 14:07:16→14:07:20 há **três cotações em 4,4 segundos**; em
   14:26/14:27 o padrão se repete em pares. A tela está cotando mais de uma vez por interação
   (provável: um efeito reagindo a mudanças de estado encadeadas, sem debounce/coalescing). Cada
   round-trip extra empilha 1,7-9,8 s de "Calculando total".
4. **Cross-região não explica.** `getCheckoutPrefill`, do mesmo par landing↔functions, responde em
   **7-10 ms quente** e 674 ms frio. O overhead de rede é desprezível; o custo está dentro da
   cotação e no número de vezes que ela é chamada.

**Diagnóstico:** o "Calculando total" preso é a soma de (a) cold start de 3-10 s na primeira
cotação da jornada e (b) 2-3 cotações disparadas por interação. Otimização pertence à lane
CHECKOUT-UX (ver tasks abaixo); esta lane só mede.

---

## Q3 · Taxa de serviço do meia-floripa-2026 (achado 4 · média)

**Veredito: taxa INCORPORADA no preço de face. A ausência da linha "Taxa de serviço" no checkout
está CORRETA para este evento — o achado 4 não é defeito aqui.**

### Config real lida no Firestore de produção

Leitura pontual via Admin SDK read-only (ADC derivado do refresh token do firebase-tools, conforme
receita do handoff DEPLOY-PREVIEW §Credenciais; **arquivo apagado ao fim da leitura**).

`eventos/meia-floripa-2026`:

```
slug     = "meia-floripa-2026"
nome     = "Meia Maratona Floripa 2026"
tenantId = "castelo-producoes"
chaves com taxa|fee|termo|comiss: (NENHUMA)
```

O evento **não tem campo `taxaModo`**. Por `packages/core/src/eventos/evento.ts:257`
(`return evento.taxaModo ?? 'incorporada'`), o modo efetivo é **`'incorporada'`** — pelo default,
não por configuração explícita.

`tenants/castelo-producoes/commercialTerms/current` (versão 1):

```
platformFeePct    = 10.5
installmentRules  = { maxParcelas: 12, jurosAoMes: 0, parcelaMinima: 10 }
anticipation      = { disponivel: false }
saasMonthlyFee    = 0
```

### Prova pela mesma API que a tela usa

`cotarInscricaoCheckout` em produção (5k, Lote 2, PIX, 1x, sem cupom):

```json
{"itens":[{"modalidade":"5k","loteNome":"Lote 2","kitNome":null,"kitPreco":0,"preco":75}],
 "valorBase":75,"desconto":0,"valorFinal":75,"cupomAplicado":null,
 "taxaServico":0,"totalAVista":75,
 "totalCobrado":75,"forma":"pix","totaisPorMeio":{"pix":75,"cartao_credito":75}}
```

`taxaServico: 0` e `totaisPorMeio.pix == totaisPorMeio.cartao_credito == valorFinal` é a assinatura
exata de `'incorporada'` (RN-347). Em `'repassada'` os dois meios divergiriam (TAXAFLEX) e a UI
mostraria a linha.

### Os números, em reais

Para uma inscrição 5k no Lote 2:

| | valor |
|---|---|
| Preço de face (o que o comprador paga) | **R$ 75,00** |
| Taxa de serviço cobrada do comprador | **R$ 0,00** (incorporada) |
| Comissão da plataforma (10,5% do face) | R$ 7,88 |
| Líquido do organizador | **R$ 67,13** |

Bate com a decisão ratificada **DEC-0726 (comissão sobre o FACE)**: em `'incorporada'` o líquido é
`face − taxa`, ou seja a comissão incide sobre o valor de face e sai do repasse do organizador.
Config e decisão de produto estão coerentes.

### O que continua em aberto (decisão do dono, não defeito)

O modo `'incorporada'` está valendo **pelo default do core**, não por escolha registrada no evento.
Nada quebra, mas o evento não declara o próprio modelo de taxa. Se o dono quiser o outro modelo
(taxa por fora, visível ao comprador), basta gravar `taxaModo: 'repassada'` no evento — e aí a linha
"Taxa de serviço" passa a aparecer sozinha, sem mudança de código. **Pergunta ao dono**, não task.

---

## Q4 · Cupons no checkout público (achado 6 · pedido)

**Veredito: nenhum dos dois cupons do pedido funciona hoje. Mas existem DOIS cupons válidos em
produção agora — `HEROI10` e `CORRA50` — provados aplicando de verdade.**

Todas as chamadas abaixo em `cotarInscricaoCheckout` de produção, com token anônimo real (a mesma
autenticação que a tela usa), evento `meia-floripa-2026`, 5k, PIX 1x. Nada foi comprado — cotação é
read-only.

| cupom | HTTP | resposta |
|---|---|---|
| `FLORIPARUN10` | 400 | `Cupom 'FLORIPARUN10' não existe.` |
| `RITMOFORTE10` | 400 | `computeSaleState: cupom "RITMOFORTE10" fora da janela de validade` |
| **`HEROI10`** | **200** | `desconto: 7.5` · R$ 75,00 → **R$ 67,50** (percentual 10%) |
| **`CORRA50`** | **200** | `desconto: 50` · R$ 75,00 → **R$ 25,00** (fixo R$ 50) |

### Cupom para o dono usar AGORA

> **`HEROI10`** — 10% de desconto. R$ 75,00 → R$ 67,50 no 5k.
> **`CORRA50`** — R$ 50 fixos. R$ 75,00 → R$ 25,00 no 5k (o mais barato para testar o fluxo real).

Ambos com janela aberta até **08/09/2026** e teto folgado (`HEROI10` 37/100 usos; `CORRA50` sem teto).

### Por que os dois do pedido falham

Estado real das três coleções de cupom do evento em produção:

| cupom | tipo | escopo | janela de validade | usos |
|---|---|---|---|---|
| `HEROI10` | percentual 10 | — | 2026-04-15 → **2026-09-08** | 37/100 |
| `CORRA50` | fixo 50 | — | 2026-06-16 → **2026-09-08** | 8 / ilimitado |
| `RITMOFORTE10` | percentual 10 | `club_parceiro` | **2026-09-28 → 2027-01-22** | 0 |
| `FLORIPARUN10` | — | — | **documento inexistente** | — |

**`FLORIPARUN10` — nunca foi criado como cupom.** O seed cria a parceria de afiliado
`parceria-meia-floripa-frc` com o campo `cupom: 'FLORIPARUN10'`
(`functions/scripts/preview-seed-clubes.ts:358`), mas **nenhum documento**
`eventos/meia-floripa-2026/cupons/FLORIPARUN10` é escrito em lugar nenhum do repo. A parceria
aponta para um código que não existe. Isso vale como defeito de dado: o afiliado tem cupom no
contrato e não tem cupom no checkout.

**`RITMOFORTE10` — existe, mas a janela abre daqui a dois meses** (28/09/2026). Não está expirado:
ainda não começou. E o motivo é um bug real do seed de produção, descrito a seguir.

### Achado colateral (sério): o seed de produção re-data DUAS VEZES parte dos documentos

`functions/scripts/prod-seed-leela-hub.ts` desloca todas as datas na escrita (offset de 135 dias, do
relógio de referência 2026-03-15 para o dia da rodada). Para isso ele monkey-patcha **três**
protótipos (`instalarRedatePatch`, linhas 160-183): `DocumentReference.prototype.set`,
`WriteBatch.prototype.set` e `CollectionReference.prototype.add`.

O problema: no `@google-cloud/firestore@7.11.6`, `DocumentReference.set()` é implementado **por cima
de** `WriteBatch.set()` —
`node_modules/.pnpm/@google-cloud+firestore@7.11.6/.../reference/document-reference.js:341-351`:

```js
set(data, options) {
    return this._firestore._traceUtil.startActiveSpan(SPAN_NAME_DOC_REF_SET, () => {
        let writeBatch = new index_1.WriteBatch(this._firestore);
        if (options) { writeBatch = writeBatch.set(this, data, options); }
        else { writeBatch = writeBatch.set(this, data); }
        return writeBatch.commit().then(([writeResult]) => writeResult);
    });
```

Ou seja: quem escreve via `ref.set(...)` passa pelos **dois** patches e leva `redate()` **duas
vezes** (+270 dias). Quem escreve via `batch.set(...)` direto passa por um só (+135 dias).

Os dados de produção provam a aritmética exatamente:

| cupom | caminho de escrita | data-fonte no código | data em produção | deslocamento |
|---|---|---|---|---|
| `HEROI10` início | `batch.set` (`eventos.seed.ts:258-274`) | 2025-12-01 | 2026-04-15 | **+135 d** |
| `HEROI10` fim | `batch.set` | 2026-04-26 | 2026-09-08 | **+135 d** |
| `CORRA50` início | `batch.set` | 2026-02-01 | 2026-06-16 | **+135 d** |
| `CORRA50` fim | `batch.set` | 2026-04-26 | 2026-09-08 | **+135 d** |
| `RITMOFORTE10` início | `upsert` → `ref.set` | 2026-01-01 | 2026-09-28 | **+270 d** |
| `RITMOFORTE10` fim | `upsert` → `ref.set` | 2026-04-26 | 2027-01-22 | **+270 d** |

Os quatro campos escritos por `batch.set` levaram 135; os dois escritos por `ref.set` levaram
exatamente o dobro. Não é coincidência de tipo (todos os seis são `Timestamp`) — é o caminho de
escrita.

**Raio de explosão:** tudo que os seeds gravam por `upsert()`/`ref.set()` está com datas dobradas em
produção — `preview-seed-clubes.ts` (2 `upsert` + 6 `ref.set`) e `preview-seed-extra.ts`
(11 `upsert` + 3 `ref.set`). Clubes, desafios, comunicados, assessoria, parcerias, repasses e
conversões seedados por esses dois arquivos merecem conferência de data. Vira task (abaixo); não é
território desta lane.

---


## Fix aplicado (CONFIG) — binding do secret + redeploy de uma function

**Autorização:** o maestro liberou correção quando o root cause fosse config (binding de secret
ausente na function deployada). É exatamente este caso: o secret já existia provisionado; faltava
declará-lo. Em Cloud Functions v1 a declaração `runWith({ secrets })` **é** a superfície de config —
não existe outra forma de vincular. Nenhuma linha de lógica foi tocada.

### Diff (1 arquivo, 1 linha efetiva + comentário de racional)

`functions/src/checkout/createInscricaoCharge.ts:2137-2149`

```diff
-  secrets: ['ASAAS_API_KEY', 'ASAAS_WEBHOOK_AUTH_TOKEN'],
+  secrets: ['ASAAS_API_KEY', 'ASAAS_WEBHOOK_AUTH_TOKEN', 'CRM_ID_PEPPER'],
```

### Gate

- `npx tsc --noEmit -p functions/tsconfig.json` → **exit 0**.
- Nenhuma suíte, nenhum emulador (a lane INGPAGE-REV os detém).

### Deploy dirigido

```
npx firebase-tools@13 deploy --only functions:createInscricaoCharge \
  --project prod --config firebase.prod.json --force
```

Saída: `functions[createInscricaoCharge(us-central1)] Successful update operation.` · `Deploy
complete!` — **uma única function atualizada**, nenhuma outra tocada.

### Prova 1 — a revisão ACTIVE em produção carrega o secret

Cloud Functions API v1, `projects/leela-hub/locations/us-central1/functions/createInscricaoCharge`:

```
status     = ACTIVE
updateTime = 2026-07-29T15:04:18.898Z
versionId  = 4
timeout    = 120s
secretEnvironmentVariables:
   - ASAAS_API_KEY            → secret=ASAAS_API_KEY            version=1
   - ASAAS_WEBHOOK_AUTH_TOKEN → secret=ASAAS_WEBHOOK_AUTH_TOKEN version=1
   - CRM_ID_PEPPER            → secret=CRM_ID_PEPPER            version=1   ← ANTES NÃO EXISTIA
```

O próprio audit log do Google confirma a mudança (entrada `UpdateFunction` de
2026-07-29T15:03:00Z, `permission: cloudfunctions.functions.update, granted: true`, com os três
`secretEnvironmentVariables` no corpo do request).

### Prova 2 — linha do tempo do log de produção, antes e depois

| horário (UTC) | evento | resultado |
|---|---|---|
| 14:07:39 · 14:07:45 · 14:07:52 | 3 tentativas de compra do dono | **500** · `CRM_ID_PEPPER ausente` |
| **14:54:47** | **4ª tentativa do dono, já durante a investigação** | **500** · `CRM_ID_PEPPER ausente` |
| 15:03:00 → 15:04:18 | `UpdateFunction` (este fix) | revisão 4 ACTIVE com o secret |
| 15:07:08 · 15:07:09 | probes pós-deploy no callable | **400 INVALID_ARGUMENT** (erro de domínio limpo) |

Depois do deploy o callable responde com validação de domínio legível, e **zero** `Unhandled error`
ou 500 aparecem no log. Resposta literal do probe:

```
CreateInscricaoChargeInput inválido: "eventoId" é obrigatório. "inscritos" deve ter ≥ 1 inscrição
(ADR-011). "responsavel" { nome, email } é obrigatório (ADR-011). "aceites" é obrigatório:
{termos: true, saude: true} (spec §5.3 — F-4a). "forma" deve ser cartao_credito ou pix.
"parcelas" deve ser inteiro ≥ 1. "idempotencyKey" é obrigatória (8–64 caracteres — RN-333).
```

### O que NÃO foi provado, e por quê (declarado, não escondido)

Não gerei um QR de verdade. O único caminho que executa `crmIdPepper()` é o de uma compra válida, e
ele é irreversível na ordem do core: `encerrarPixAnteriorNaCriacao` (onde morria) roda **depois de
toda validação e derivação de preço, imediatamente antes das escritas**
(`createInscricaoCharge.ts:2018` → `:2026`). Não existe payload que atravesse o pepper e pare antes
de gravar pedido/inscrito em produção e abrir cobrança no Asaas. Como a regra da lane é não comprar
e não sujar dado de produção, parei na fronteira.

O que resta é determinístico, não probabilístico: `crmIdPepper()` só lê
`process.env['CRM_ID_PEPPER']`, e o Cloud Functions injeta todo secret declarado na revisão ACTIVE
(mesmo mecanismo que já faz `onInscritoWriteCrm` funcionar com este mesmo secret, versão 1, cujo
valor eu li com sucesso via `functions:secrets:access`).

**O teste canônico de go-live volta a ser do dono** — e é exatamente o que ele tentou quatro vezes
hoje. Basta repetir a compra em `https://leela-landing.web.app/meia-floripa-2026/inscricao`, agora
com `CORRA50` (R$ 75,00 → R$ 25,00) para baratear o teste real.

---

## Tasks devolvidas (código — fora do território desta lane)

### Para a lane CHECKOUT-UX

**T-CKUX-1 · "Calculando total": cotação disparada 2-3× por interação** · *média*
Arquivo: `apps/landing/app/(public)/[eventSlug]/inscricao/checkout/CheckoutFlow.tsx`.
Evidência: 3 chamadas de `cotarInscricaoCheckout` em 4,4 s (14:07:16 / :18 / :20) e outros pares em
14:26-14:27. Cada round-trip custa 1,7-9,8 s. Root cause provável: efeito reagindo a mudanças de
estado encadeadas sem coalescing. Fix proposto: debounce curto + descartar respostas obsoletas por
sequência (a última resposta vence), e não recotar quando o payload derivado não mudou.

**T-CKUX-2 · cold start de 3-10 s na primeira cotação** · *média*
`cotarInscricaoCheckout` não declara `minInstances`. Piso quente medido = 1,7 s; primeira chamada de
cada sessão = 3-10 s. Fix proposto: `minInstances: 1` na function da cotação (custo baixo, é a
primeira impressão de preço da jornada) **ou** cotação otimista no cliente com reconciliação. Decidir
com o dono — tem custo mensal.

**T-CKUX-3 · achado 4 não é defeito neste evento** · *fechar*
`meia-floripa-2026` roda taxa `'incorporada'`; a ausência da linha "Taxa de serviço" está correta
(RN-347). Nada a implementar. O que existe é uma **pergunta ao dono**: quer declarar `taxaModo`
explicitamente no evento em vez de herdar o default do core?

### Para quem detém o seed / dado de produção

**T-SEED-1 · `FLORIPARUN10` não existe como cupom** · *média*
`functions/scripts/preview-seed-clubes.ts:358` cria a parceria de afiliado com
`cupom: 'FLORIPARUN10'`, mas nenhum documento `eventos/meia-floripa-2026/cupons/FLORIPARUN10` é
escrito em lugar nenhum. Afiliado com cupom no contrato e sem cupom no checkout. Fix: criar o
documento do cupom (percentual, escopo de afiliado, janela vigente) junto com a parceria.

**T-SEED-2 · seed de produção re-data DUAS VEZES tudo que escreve por `ref.set`** · *alta*
`functions/scripts/prod-seed-leela-hub.ts:160-183` patcha `DocumentReference.prototype.set` **e**
`WriteBatch.prototype.set`; no `@google-cloud/firestore@7.11.6` o primeiro é implementado por cima
do segundo (`document-reference.js:341-351`), então `redate()` roda duas vezes nesse caminho.
Provado pelos cupons: +135 d via `batch.set`, +270 d via `ref.set`. Efeito visível hoje:
`RITMOFORTE10` só abre em 28/09/2026. Fix proposto: patchar **só** `WriteBatch.prototype.set` e
`CollectionReference.prototype.add` (todo `DocumentReference.set` já passa por lá), ou marcar o
payload já re-datado com um símbolo e tornar `redate()` idempotente. Depois: reconferir as datas de
tudo que `preview-seed-clubes.ts` e `preview-seed-extra.ts` gravaram em produção.

---

## Premissas assumidas

1. **O binding de secret conta como config, não como código.** O root cause é um secret ausente na
   function deployada — a classe que o brief autoriza corrigir. Em Functions v1 o array
   `runWith({ secrets })` é a única superfície de declaração; alterá-lo exige tocar o arquivo, mas
   não altera nenhuma linha de lógica. Se o maestro discordar, o revert é uma linha.
2. **Ler o Firestore de produção com ADC derivado do refresh token do firebase-tools** segue a
   receita já registrada no handoff DEPLOY-PREVIEW §Credenciais. Uso read-only; o arquivo de
   credencial foi criado no scratchpad e **apagado** ao fim das leituras.
3. **Cotação (`cotarInscricaoCheckout`) não é compra.** É read-only, não escreve nada e não abre
   cobrança — por isso foi o instrumento dos testes de cupom e de taxa.
4. **A janela de log consultada é a que o `functions:log` devolve** (últimas ~500 linhas, cobrindo
   13:52-15:07 UTC de 2026-07-29). Todas as tentativas de compra do dono relatadas caem dentro dela.
5. **Não conferi o painel do Asaas.** A conclusão "não chegou a falar com o gateway" vem do stack
   trace: a exceção acontece em `encerrarPixAnteriorNaCriacao`, antes de `criarDocsDeCheckout` e de
   `garantirCobrancaEMontarResultado`.

---

## Resumo executivo

**O checkout de produção estava 100% quebrado por um secret que não chegava na function — não pelo
gateway, não pelo front, não por timeout.** As quatro tentativas de compra do dono hoje (14:07:39,
14:07:45, 14:07:52 e 14:54:47 UTC) morreram todas em HTTP 500 dentro de `createInscricaoCharge`,
antes de qualquer contato com o Asaas: `crmIdPepper()` lança fail-closed porque `CRM_ID_PEPPER` não
estava na lista `runWith({ secrets })` da function. O secret já existia no Secret Manager; faltava o
vínculo. Nenhuma compra fechava em produção — nem PIX, nem cartão. **Corrigido e deployado**
(revisão 4 ACTIVE, 15:04:18Z, com o secret vinculado — confirmado pela API do Cloud Functions e pelo
audit log do Google); depois do deploy o callable responde com validação de domínio limpa e zero
500 no log.

A lição de confiabilidade vale registrar: **a suíte verde não podia pegar este defeito.** No
emulador o pepper vive no `process.env` do processo inteiro e qualquer function o enxerga; em
produção o Cloud Functions injeta secret só em quem o declara. O defeito só existe no modelo de
isolamento de produção. Vale um gate futuro: conferir que toda function cujo grafo de import alcança
um leitor de secret declare esse secret.

**O "Calculando total"** não é travamento: é latência honesta. Piso quente de 1,7 s, cauda de cold
start até 9,8 s, e a tela dispara 2-3 cotações por interação. Vira duas tasks para a CHECKOUT-UX
(coalescing e `minInstances`), com os números medidos.

**A taxa de serviço** do `meia-floripa-2026` é **incorporada** — não aparece porque não deve
aparecer. O comprador paga o face (R$ 75,00 no 5k Lote 2); os 10,5% de `platformFeePct` saem do
repasse do organizador (líquido R$ 67,13), coerente com a DEC-0726. O achado 4 fecha sem código. O
que sobra é uma pergunta ao dono: o evento herda o modo do default do core, não declara o próprio.

**Os dois cupons pedidos não servem.** `FLORIPARUN10` nunca foi criado como documento — a parceria
de afiliado aponta para um código que não existe. `RITMOFORTE10` existe mas só abre em 28/09/2026,
efeito de um bug real do seed de produção (re-data duas vezes tudo que escreve por `ref.set`, porque
`DocumentReference.set` é implementado por cima de `WriteBatch.set` e os dois estão patchados). Em
compensação, **dois cupons funcionam agora**, provados aplicando de verdade: **`HEROI10`** (10% ·
R$ 75,00 → R$ 67,50) e **`CORRA50`** (R$ 50 fixos · R$ 75,00 → R$ 25,00), ambos válidos até
08/09/2026.

**Próximo passo do dono:** repetir a compra em
`https://leela-landing.web.app/meia-floripa-2026/inscricao` com `CORRA50`. Esse é o teste canônico
de go-live — o mesmo que ele tentou quatro vezes hoje — e é o único que fecha o ciclo com o QR na
tela. Deliberadamente não o rodei: o caminho que exercita o pepper grava pedido e inscrito em
produção e abre cobrança no gateway, e a regra da lane é não sujar dado real.

---

## Self-score (contrato do sf-reliability-engineer)

| critério | peso | nota | justificativa |
|---|---|---|---|
| `correctness` (≥0.90) | 1.5 | **0.95** | Root cause provado por stack trace de produção, não hipótese. Fix aplicado e verificado em duas camadas independentes (API do Cloud Functions e audit log do Google) mais a linha do tempo do log 500→400. O ciclo ponta a ponta com QR renderizado fica com o dono, e isso está declarado, não escondido. |
| `regression_safety` (≥0.85) | 1.5 | **0.90** | `tsc --noEmit` exit 0. Diff de uma linha efetiva, aditiva (acrescenta um secret; não remove nem altera nenhum). Raio de explosão auditado antes de tocar: só `createInscricaoCharge` alcança `crmIdPepper` sem declará-lo. Deploy dirigido a uma única function. Sem suíte por proibição explícita da lane — o que impede nota mais alta. |
| `scope_discipline` (≥0.80) | 1.0 | **0.95** | Um arquivo de código tocado, uma linha efetiva. Tudo o mais virou task com root cause, arquivo e linha. Não mexi em `DECISOES-ABERTAS.md`, não rodei suíte nem emulador, não comprei nada, não fiz refactor de ocasião. Credencial temporária apagada. |
| `handoff_artifact` (≥0.75) | 1.0 | **0.95** | Handoff nomeia arquivos e linhas, transcreve logs e respostas literais, traz a linha do tempo antes/depois, cinco premissas declaradas, cinco tasks devolvidas com fix proposto e o limite do que não foi provado. Três commits por artefato, sem push. |

**Média ponderada: 0.93** — acima de todos os limiares. Sem iteração de revisão necessária.

## Higiene

- Credencial ADC temporária (`scratchpad/adc-leela-hub.json`) **apagada**; regenerável pela receita
  do handoff DEPLOY-PREVIEW §Credenciais.
- Tokens anônimos de teste descartados. Os usuários anônimos criados no Identity Toolkit ficaram sem
  nenhum dado associado — nenhum pedido, nenhum inscrito, nenhuma cobrança.
- `functions/lib/` e `functions-deploy/` são artefatos de build gitignorados, gerados pelo predeploy.

## Commits desta lane (sem push — o maestro pusha)

1. `7bedef1` — handoff com Q1 (root cause do QR) e Q2 (números do "calculando total").
2. `0f5047b` — handoff com Q3 (taxa incorporada) e Q4 (veredito dos cupons e bug do re-data duplo).
3. *(este)* — fix do binding + provas de deploy + tasks + resumo executivo + self-score.
