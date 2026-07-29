# Handoff vivo · lane CHECKOUT-PIXQR-INV · trace leela-build-2d6ee98d · 2026-07-29

Executor: sf-reliability-engineer (software-forge). Brief: `.nirvana/briefs/leela-build-2d6ee98d-CHECKOUT-PIXQR-INV-enriched.md`.
Autoridade do sintoma: `leela-specs/02-rodadas/2026-07-29-checkout-ux/01-achados-dono.md` (DEC-0729, achados 1, 2, 4 e 6).
Natureza: **investigação de incidente em produção** (read-only por default). Nada foi comprado.

## Estado

- [x] **Q1 · Por que o QR do PIX não renderiza** — root cause provado por log de produção
- [x] **Q2 · "Calculando total" preso** — medido por log de produção (durações reais da chamada)
- [ ] **Q3 · Taxa de serviço do meia-floripa-2026** — config real do evento
- [ ] **Q4 · Cupons `FLORIPARUN10` / `RITMOFORTE10`** no checkout público
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

*(Q3 e Q4 em andamento — este handoff é atualizado a cada pergunta respondida.)*
