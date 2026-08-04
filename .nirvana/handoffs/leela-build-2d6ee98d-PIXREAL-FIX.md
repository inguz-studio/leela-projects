# Handoff vivo · lane PIXREAL-FIX · trace leela-build-2d6ee98d · 2026-08-03/04

Executor: sf-backend-lead (software-forge). Brief: `.nirvana/briefs/leela-build-2d6ee98d-PIXREAL-FIX-enriched.md`.
Laudo de origem: lane INV-PIX-INTERNAL (`~/.harness-logs/2026-08-03/audit.jsonl`, linha 63).
Receita de deploy: `.nirvana/handoffs/leela-build-2d6ee98d-DEPLOY-FINAL.md`.

Base: `main` em `f37b8187`.

Autorização do dono (verbatim): *"faça o que for necessário, para eu começar a rodar pagamentos
reais, mesmo que sejam como forma de testar"*.

## Mudanças de contrato no meio da lane (SendMessage do maestro)

1. **DEPLOY-1 LIBERADO** — a landing DEVE ser deployada ao fim do T3, com o seed do primeiro convite
   de organizador RETIDO. Nenhum convite semeado em ambiente nenhum. Prova no artefato SERVIDO.
2. **T5 + T6 entraram na lane** (P0 achado pela lane INV-EMAIL-INGRESSO): functions usando segredo
   que o `runWith` delas não declara. Efeito: o primeiro PIX pago não gera ingresso nenhum.
3. O dono CONFIRMOU que `FAROL SOLUCOES UNIVERSITARIAS LTDA` é a empresa dele. Nenhuma das três
   cobranças vivas pode ser cancelada.

## Estado da fila

- [x] **T1 · guard antes do provider** (C3) — `9f48e288`
- [x] **T2 · binding do secret** (C1) — `9f48e288`
- [x] **T3 · a tela para de mentir** (C2) — `a6ca463d` · deploy da landing PENDENTE
- [x] **T5 · bindings de segredo que faltam** — 15 functions
- [x] **T6 · a guarda contra reincidência** — `secretsBinding.contract.test.ts`
- [ ] **T4 · a sentinela que nunca rodou** (C4)
- [ ] Deploy alvo das functions + deploy da landing + provas

---

## T1 · a ordem era o conserto, não a checagem

O fail-safe `hasAsaasKey` existe desde a S1203 e sempre esteve certo. O que estava errado era
**quando** ele rodava: a callable montava `selectPaymentProvider()` como ARGUMENTO do core, então o
provider era construído antes da primeira linha do guard. Com chave `$aact_prod_` e sem
`ASAAS_WEBHOOK_AUTH_TOKEN` no `runWith`, essa construção levantava `AsaasConfigError` — que não é
`HttpsError` — e o Firebase traduzia para `internal`.

O guard passou para a PORTA (`confirmarPagamentoSandboxHandler`), espelhando `pagamentoWebhook`
(410 antes de tocar no selector). O guard do core ficou: defesa em profundidade.

### Prova de falsificação (executada)

Com a ordem de `f37b8187` restaurada temporariamente:

```
AssertionError: expected AsaasConfigError: [asaas] ASAAS_WEBHOOK_A… to be an instance of HttpsError
Tests  1 failed | 20 skipped (21)
```

É o erro exato do laudo. Com o conserto: **21 passed**.

## T2 · o binding, e por que ele não viaja sozinho

`ASAAS_WEBHOOK_AUTH_TOKEN` entrou no `runWith`. Sozinho ele trocaria o `internal` por um
AsaasProvider REAL construído com sucesso dentro da porta de simulação — pior que o defeito. Com o
guard na frente, o par existe para o sandbox seguir funcionando em ambiente de sandbox.

## T3 · o sinal de ambiente vem de quem construiu o provider

`PaymentProvider` ganhou `simulado?: boolean`; o Mock é o único que declara `true`;
`createInscricaoCharge` devolve `gatewayReal` no resultado. A tela obedece ao servidor.

**Polaridade fail-safe nas duas pontas** — `simulado` ausente = REAL; `gatewayReal` ausente na
resposta = REAL. Servidor antigo ou dublê de teste faz a simulação sumir, nunca aparecer.

Com gateway real: banner e botão somem; a copy diz que o valor sai da conta, que há prazo e que a
confirmação chega sozinha pelo webhook.

### Prova de falsificação (executada)

Com `gatewaySimulado = true` (comportamento de `f37b8187`): **3 failed | 2 passed**. Com o conserto:
**5 passed**. Suíte da landing inteira: **454 passed / 42 arquivos**.

### Achado fora do escopo, ESCALADO

`StepResumo` dizia "Ambiente de simulação: os dados do cartão não são enviados nem cobrados" numa
etapa que roda ANTES de existir cobrança — ali não há sinal de ambiente possível. Sobrou o que é
verdade nos dois mundos ("Os dados do cartão não são enviados por esta tela").

**O fluxo de CARTÃO em produção continua sem desfecho**: `pagarCartao` encadeia
`createInscricaoCharge` + `confirmarPagamentoSandbox`, então em produção ele cria uma cobrança
`CREDIT_CARD` real no Asaas e em seguida recebe a recusa tipada do T1. Melhor que `internal`, mas
ainda é um beco. O caminho existente seria mandar o comprador ao `paymentUrl` da fatura — jornada
nova, copy nova, **decisão de produto**. Não inventei.

## T5 · bindings de segredo que faltavam (15 functions)

| Function | Faltava | Efeito em produção |
|---|---|---|
| `asaasWebhook` | `QR_TOKEN_KEYS` | **P0** — PIX pago, keyring nulo, `sem_keyring`, e-mail nunca chamado. Dinheiro entra, comprador não recebe nada nem erro |
| `varrerIngressosOrfaos` | `QR_TOKEN_KEYS`, `BREVO_API_KEY` (tinha **zero**) | **P0** — a rede de segurança re-tentava com keyring nulo a cada 15 min, para sempre |
| `pagamentoWebhook` | `ASAAS_WEBHOOK_AUTH_TOKEN`, `BREVO_API_KEY`, `QR_TOKEN_KEYS` | P1 — em produção responde 410, mas em sandbox confirmava sem entregar |
| `confirmarPagamentoSandbox` | `BREVO_API_KEY`, `QR_TOKEN_KEYS` | P1 — sandbox confirmava sem emitir ingresso nem e-mail |
| `salvarAfiliado`, `cadastrarAssessoriaParceira`, `enviarCampanha`, `registrarRepasseComissao`, `definirCondicaoDesconto`, `encerrarParceriaAssessoria`, `provisionAfiliadoAccount`, `provisionAssessoriaAccount`, `dispatchAutomacoes`, `onInscritoWriteAutomacao`, `dispatchCampanhasAgendadas` | `BREVO_API_KEY` | P1 — `pendente_chave` em silêncio: a tela confirma, nada sai |

## T6 · a guarda: `functions/src/__tests__/secretsBinding.contract.test.ts`

Estático, sem Emulator, roda em ~0,4 s. Lê os 73 exports de `index.ts`, fecha o grafo de imports
relativos, procura chamadas aos acessores (`obterQrKeyring`, `selectEmailProvider`,
`selectPaymentProvider`, `asaasConfigFromEnv`, `crmIdPepper`) e leituras diretas de `process.env`,
e exige que tudo esteja declarado no `runWith`.

**Por que só um teste estático resolve:** no Emulator as variáveis vivem no `process.env` do
processo inteiro, então todo mundo enxerga todo mundo e a suíte fica verde enquanto a produção
quebra. O binding só existe em produção — a prova tem que ser sobre o código.

Aproximação por import erra para o lado seguro (binding a mais, nunca a menos). Duas dispensas
nominais, com motivo escrito, e **só para necessidade herdada**: chamada no módulo da própria
function nunca é dispensável.

- `cotarInscricaoCheckout` (3 segredos) — importa `carregarInsumos` de `createInscricaoCharge.ts`,
  mas cotar é read-only; dar chave da conta Asaas a ela seria menor privilégio ao contrário.
- `requestTransfer` (2 segredos) — importa `lerPoliticaVendasTx` de `requestRefund.ts`; o saque
  grava na fila de repasse e não fala com o gateway.

### Prova de falsificação (executada)

Removida a linha `'QR_TOKEN_KEYS'` do `asaasWebhook`: `"asaasWebhook → falta QR_TOKEN_KEYS"`,
1 failed. Restaurada: 4 passed. A própria guarda das dispensas pegou duas justificativas preguiçosas
minhas ("mesmo import, mesmo motivo", 44 caracteres) e me obrigou a escrevê-las.

## T4 · a premissa tinha o defeito dentro: não existe sentinela

O brief pergunta "agendamento? região? deploy? nome do job?". Nenhuma das quatro.
**`expirarPixPendente` não é um job.** É `https.onCall` (`expirarPixPendente.ts:263`), e os únicos
dois gatilhos dela no produto inteiro estão em `CheckoutFlow.tsx:1401` e `:1456` — os dois exigem
`charge !== null` no estado vivo do React, isto é, o comprador com a aba do checkout ABERTA quando o
relógio de 30 minutos zera.

Zero execuções em produção não é uma falha: é a consequência exata de ninguém ter ficado meia hora
parado na tela de pagamento. Nada quebrou; a função faz precisamente o que foi construída para
fazer, e o que foi construída para fazer não cobre o caso real.

### As quatro hipóteses do brief, descartadas por verificação executada

| Hipótese | Veredito |
|---|---|
| deploy | **descartada** — `expirarPixPendente` está em produção: `UpdateFunction` em 2026-07-29T00:31:18Z e 01:09:24Z |
| nome do job | **descartada** — deployada sob esse nome exato, é como o audit log a encontra |
| região | **descartada** — `us-central1`, a mesma de todas as outras |
| agendamento | **não se aplica** — não existe agendamento nenhum a configurar |

A função está no ar, saudável, e nunca foi chamada. Não é um job que falhou: é uma porta que
ninguém bateu.

### O que isso significa para o dinheiro

Não existe varredura server-side de PIX vencido. `varrerEstornosOrfaos` cuida de estorno,
`expirarCarrinhosAbandonados` cuida de carrinho, `varrerIngressosOrfaos` cuida de ingresso — o PIX
vencido não tem gêmeo. O comprador que fecha a aba deixa a cobrança **viva no gateway**, porque o
`dueDate` do Asaas é contado em DIAS (`dueDateDays`) e a janela de 30 minutos é só da tela. O código
"expirado" segue pagável horas depois, e quem pagar cai num pedido `pendente`.

É a mesma família do defeito que a S1209-PIXBE-T3 fechou para o caminho do cliente, agora no caminho
que não tem cliente nenhum.

### O conserto existe, está desenhado, e NÃO foi construído — por conflito com uma ordem direta

O molde é o `varrerEstornosOrfaos` (ADR-015: `runWith({secrets}).pubsub.schedule('every 15
minutes')`) chamando o `expirarPixPendenteCore` já existente, com o uid lido do próprio pedido —
zero máquina nova, exatamente como o `encerrarPixAnteriorNaCriacao` já faz, só que disparado por
tempo em vez de por uma nova compra.

**Por que não subiu:** esse cron cancela cobranças vencidas no gateway na primeira execução. As três
cobranças vivas do dono (R$ 63, R$ 75, R$ 11,05) estão vencidas pela janela da tela, e o brief é
explícito: *"Não cancele nenhuma cobrança viva: as três são do dono e ele decide o que fazer com
elas."* Construir e deployar hoje seria cancelar as três em até 15 minutos. **Escalado.**

### As "5 sentinelas vencidas" não são um vazamento — são duas coisas diferentes

Lendo `travaCobrancaPix.ts` (`avaliarTravaPix`, linhas 221-272), o veredito é sempre RELIDO dos docs
apontados, então:

- **as 2 órfãs** (do bug de `externalReference`) apontam para pedido/pagamento que não existem ⇒
  `avaliarTravaPix` devolve `bloqueio: null` ⇒ elas **não bloqueiam nada**. São lixo inerte:
  apagá-las e não apagá-las produzem o mesmo comportamento. A limpeza é cosmética.
- **as 3 restantes** apontam para as cobranças VIVAS do dono e são a **guarda de cobrança
  duplicada** em funcionamento. Apagá-las libera uma segunda cobrança viva do mesmo carrinho — o
  achado A1 da review S1209-PIXREV, reaberto à mão.

E há um segundo lado que o dono precisa saber: com a sentinela NO LUGAR, uma nova tentativa de
compra do mesmo carrinho dispara `encerrarPixAnteriorNaCriacao`, que **cancela** a cobrança anterior
no gateway. Ou seja, as três cobranças dele morrem se ele repetir a compra. Nas duas direções há
consequência de dinheiro, e é por isso que "higiene de QA" não se aplica aqui.

**Nenhuma sentinela foi tocada.** Além do conflito acima, este ambiente não tem credencial de
Firestore de produção (sem `gcloud`, sem ADC — o Admin SDK falha em `Could not load the default
credentials`), então nem a prova antes/depois das 2 órfãs seria possível. Como a limpeza delas tem
efeito comportamental **zero**, o custo de deixá-las para a próxima janela é zero.

---

## Deploy das functions · 16 alvos, nominais

```
npx firebase-tools@13 deploy --only \
  functions:asaasWebhook,functions:varrerIngressosOrfaos,functions:pagamentoWebhook,\
functions:confirmarPagamentoSandbox,functions:createInscricaoCharge,functions:salvarAfiliado,\
functions:cadastrarAssessoriaParceira,functions:enviarCampanha,functions:registrarRepasseComissao,\
functions:definirCondicaoDesconto,functions:encerrarParceriaAssessoria,functions:provisionAfiliadoAccount,\
functions:provisionAssessoriaAccount,functions:dispatchAutomacoes,functions:onInscritoWriteAutomacao,\
functions:dispatchCampanhasAgendadas \
  --project prod --config firebase.prod.json --force
```

| | |
|---|---|
| Janela | `2026-08-04T03:42:34Z` → `03:47Z` |
| Exit | **0** — *Deploy complete!* |
| Functions | 16, todas *Successful update operation* |
| Outras ~57 | intocadas (filtro por nome) |
| Pré-condição | `packages/core → tsup` rodado ANTES do deploy (lição da DEPLOY-FINAL) |

### Como o alvo foi escolhido (a pergunta que o acoplamento obriga)

`git diff --name-only 5a785ff6 HEAD -- functions/src` separa limpo:

| Mudou ANTES desta lane (`5a785ff6..f37b8187`) | Deployado? |
|---|---|
| `index.ts`, `platform/provisionTenant.ts`, `platform/resgatarConviteOrganizador.ts`, `seed/convitesOrganizador.seed.ts` | **NÃO** — é a porta do organizador, `DEPLOY-1` |

Os 17 arquivos restantes do diff são todos desta lane, e nenhum deles é onboarding.

### Prova 1 — o artefato servido mudou, e mudou onde devia

`functions-deploy/index.js`: md5 `1ba9f600…` (1.160.021 B, o da DEPLOY-FINAL) → **`6fc4c391…`** (1.180.165 B).

| Marcador | Origem | Antes | Depois |
|---|---|---|---|
| `QR_TOKEN_KEYS` | T5 · +4 bindings | 11 | **15** |
| `BREVO_API_KEY` | T5 · +14 bindings | 9 | **23** |
| `ASAAS_WEBHOOK_AUTH_TOKEN` | T2 + T5 · +2 | 8 | **10** |
| `recusarSandboxComGatewayReal` | T1 · o guard | 0 | **5** |
| `confirmarPagamentoSandboxHandler` | T1 · a porta testável | 0 | **4** |
| `gatewayReal` | T3 · sinal de ambiente | 0 | **1** |
| `simulado` | T3 · marcador do provider | 0 | **6** |
| `jurosParcelamento` (controle) | DEPLOY-FINAL | 7 | 7 |
| `digestIdempotencyKey` (controle) | PIXFIX T1 | 4 | 4 |
| `EXTERNAL_REF_MAX_LEN` (controle) | PIXFIX T2 | 4 | 4 |
| `sem_keyring` (controle) | emissão de ingresso | 2 | 2 |

Os quatro controles seguram a pergunta "este deploy desfez algum anterior?". Nenhum mexeu.

### Prova 2 — os segredos estão amarrados na release nova (audit log de produção)

`asaasWebhook` · `UpdateFunction` **2026-08-04T03:42:34Z** (anterior: 2026-07-29T13:53:40Z), com
`secretEnvironmentVariables` lidos do próprio log: `ASAAS_API_KEY`, `ASAAS_WEBHOOK_AUTH_TOKEN`,
`BREVO_API_KEY` e **`QR_TOKEN_KEYS`** — os quatro, versão 1, projeto `leela-hub`. **O P0 está no ar.**

| Function | Segredos na release nova |
|---|---|
| `varrerIngressosOrfaos` | `QR_TOKEN_KEYS`, `BREVO_API_KEY` (antes: **nenhum**) |
| `confirmarPagamentoSandbox` | `ASAAS_API_KEY`, `ASAAS_WEBHOOK_AUTH_TOKEN`, `BREVO_API_KEY`, `QR_TOKEN_KEYS` |
| `pagamentoWebhook` | os mesmos quatro |

### Prova 3 — controle: a porta do organizador NÃO subiu

| Function | Último `UpdateFunction` |
|---|---|
| `resgatarConviteOrganizador` | **nunca deployada** — zero entradas no audit log |
| `provisionTenant` | 2026-07-29T00:31:02Z (intocada por esta lane) |

O backend da porta do organizador continua fora de produção. O `DEPLOY-1` segue com o dono no que
diz respeito às Functions.
