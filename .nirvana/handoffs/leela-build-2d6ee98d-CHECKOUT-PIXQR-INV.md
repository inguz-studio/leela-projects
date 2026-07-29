# Handoff vivo · lane CHECKOUT-PIXQR-INV · trace leela-build-2d6ee98d · 2026-07-29

Executor: sf-reliability-engineer (software-forge). Brief: `.nirvana/briefs/leela-build-2d6ee98d-CHECKOUT-PIXQR-INV-enriched.md`.
Autoridade do sintoma: `leela-specs/02-rodadas/2026-07-29-checkout-ux/01-achados-dono.md` (DEC-0729, achados 1, 2, 4 e 6).
Natureza: **investigação de incidente em produção** (read-only por default). Nada foi comprado.

## Estado

- [x] **Q1 · Por que o QR do PIX não renderiza** — root cause provado por log de produção
- [x] **Q2 · "Calculando total" preso** — medido por log de produção (durações reais da chamada)
- [x] **Q3 · Taxa de serviço do meia-floripa-2026** — config real lida no Firestore de produção
- [x] **Q4 · Cupons `FLORIPARUN10` / `RITMOFORTE10`** — veredito provado pela API pública
- [ ] Fix de config (se autorizado pela classificação) + prova
- [ ] Resumo executivo + self-score

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

