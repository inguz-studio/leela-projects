---
tags: [leela, discovery, asaas, pagamentos, payment-provider, adr-006]
aliases: [Asaas API Reference, Referência Asaas, AsaasProvider]
status: discovery
data: 2026-07-11
fontes-verificadas: [docs.asaas.com/docs/autenticação-1, docs.asaas.com/docs/sandbox, docs.asaas.com/docs/como-configurar-sua-conta-no-sandbox, docs.asaas.com/docs/como-adicionar-dinheiro-para-testes, docs.asaas.com/reference/confirmar-pagamento, docs.asaas.com/reference/rate-e-quota-limit, docs.asaas.com/docs/como-implementar-idempotencia-em-webhooks, docs.asaas.com/docs/sobre-os-webhooks, docs.asaas.com/reference/criar-novo-cliente, docs.asaas.com/reference/list-customers, docs.asaas.com/reference/criar-nova-cobranca, docs.asaas.com/reference/estornar-cobranca, docs.asaas.com/reference/retrieve-refunds-of-a-single-payment, docs.asaas.com/docs/webhook-para-cobrancas, docs.asaas.com/docs/split-de-pagamentos, docs.asaas.com/docs/split-em-cobrancas-avulsas, docs.asaas.com/reference/retrieve-walletid, docs.asaas.com/reference/obter-qr-code-para-pagamentos-via-pix]
fontes-nao-carregadas: [reference/get-webhook, reference/update-webhook, reference/remove-webhook (só referenciados, schema não buscado), números de cartão de teste em sandbox (não encontrados), endpoints de saldo/transferência para getPayout (não coletados)]
---

# Referência da API Asaas para o AsaasProvider

> Este doc traduz a API REST do Asaas para a interface `PaymentProvider` (ADR-006), definida em `packages/core/src/payments/PaymentProvider.ts`, com o mock atual em `functions/src/payments/mockProvider.ts` como espelho de comportamento. O objetivo é permitir escrever o `functions/src/payments/asaasAdapter.ts` sabendo exatamente qual endpoint alimenta qual método, qual campo vira qual, e o que dá para testar no sandbox sem KYC.
> Regra de honestidade: cada fato carrega a fonte, ou está marcado como "não verificado". Nada de endpoint, campo ou taxa inventado. Onde a coleta veio ambígua ou bloqueada, o texto diz.

## Nota de honestidade sobre a coleta

O que carregou bem (WebFetch 200 nas páginas `.md` da doc oficial `docs.asaas.com`, mais WebSearch de apoio):

- Autenticação, headers e base URLs por ambiente (docs/autenticação-1).
- Sandbox: o que é, isolamento, como pegar a chave, como gerar saldo fictício, confirmação programática de pagamento (docs/sandbox, docs/como-configurar-sua-conta-no-sandbox, docs/como-adicionar-dinheiro-para-testes, reference/confirmar-pagamento).
- Clientes: criar, listar, recuperar (reference/criar-novo-cliente, reference/list-customers).
- Cobranças: criar, recuperar, listar, parcelamento, QR Code PIX (reference/criar-nova-cobranca e afins).
- Estorno: total e parcial, listar estornos (reference/estornar-cobranca, reference/retrieve-refunds-of-a-single-payment).
- Webhooks: payload real, eventos, autenticação por token, entrega at-least-once, idempotência (docs/sobre-os-webhooks, docs/webhook-para-cobrancas, docs/como-implementar-idempotencia-em-webhooks).
- Split: array embutido na cobrança, walletId, fixo vs percentual, subcontas, reversão no estorno (docs/split-de-pagamentos, docs/split-em-cobrancas-avulsas, reference/retrieve-walletid).
- Rate limit e quota (reference/rate-e-quota-limit).

O que bloqueou ou não foi confirmado nesta coleta:

- Números de cartão de crédito de teste no sandbox. A página de saldo cita só BOLETO e PIX; existe menção a cartão fictício em outra página, mas sem os números. Fica **não verificado** (buscar em reference/tokenizar-cartao numa próxima coleta).
- Endpoints de saldo e transferência que alimentariam `getPayout` (saldo disponível, repasses). **Não coletados** nesta rodada. Só apareceu `GET /v3/finance/split/statistics`, que é estatística de split, não saldo do produtor.
- Endpoints de gestão de webhook `GET/PUT/DELETE /v3/webhooks/{id}`. Só o `POST` (criar) e o `GET` (listar) foram confirmados por página dedicada. Os outros três são **inferidos** por convenção REST, schema não buscado.
- Alguns hosts HTML devolveram HTTP 429 (anti-bot); a coleta contornou pela versão `.md` das mesmas páginas, que carregaram.
- Campos `discount.type`, `fine.type`, `interest.type` com valor `PERCENTAGE` vieram por WebSearch, **não confirmados** na página de criação de cobrança fetchada.
- O nome exato do campo de split no corpo do `POST /v3/payments` aparece como `split` numa página e `splits` em outra dentro da própria coleta. **Não verificado** qual é o correto no request; confirmar em sandbox ou no OpenAPI antes de implementar.

## Autenticação e ambiente sandbox (o ponto-chave: testar sem KYC)

O Asaas não usa OAuth nem Bearer. A chave da conta vai num header próprio (docs/autenticação-1).

Headers obrigatórios em toda requisição REST:

- `access_token: <apiKey>` (chave `$aact_hmlg_...` em sandbox, `$aact_prod_...` em produção).
- `Content-Type: application/json`.
- `User-Agent: <nome-da-app>` (obrigatório para contas root criadas a partir de 13/06/2024, segundo docs/autenticação-1).

Base URL por ambiente (a chave e a base URL têm que casar):

- Sandbox: `https://api-sandbox.asaas.com/v3`
- Produção: `https://api.asaas.com/v3`

Usar a chave do ambiente errado devolve `401 invalid_environment`. Outros 401 documentados: `access_token_not_found` (header ausente), `invalid_access_token_format` (chave malformada), `invalid_access_token` (chave desativada, expirada ou deletada). Guardar a chave em `.env`, nunca no cliente (docs/autenticação-1).

### Como testar sem KYC (passo a passo confirmado)

O sandbox tem aprovação automática. Dá para exercer o ciclo `createCharge → confirmação → webhook → refund` de ponta a ponta sem dinheiro real e sem verificação de documento.

1. Criar conta sandbox em `https://sandbox.asaas.com/onboarding/createAccount`. No fluxo de aprovação, enviar qualquer imagem como "documento": não há verificação real de CPF/CNPJ (confirmado por WebSearch da página de onboarding). Mesmo quem já tem conta de produção precisa criar uma conta separada de sandbox.
2. Pegar a API Key sandbox no painel: Menu do Usuário, Minha Conta, Configurações, Sandbox. A chave começa com `$aact_hmlg_` (docs/como-configurar-sua-conta-no-sandbox).
3. Gerar saldo fictício, sem dinheiro real: criar cliente (mínimo `name` + `cpfCnpj`), criar cobrança (BOLETO ou PIX), confirmar o pagamento, saldo liberado na hora. Nenhuma transação financeira real ocorre (docs/como-adicionar-dinheiro-para-testes).
4. Confirmar ou simular o pagamento programaticamente, só no sandbox: `POST /v3/sandbox/payment/{id}/confirm` com body vazio `{}`. Devolve o objeto payment com status atualizado (reference/confirmar-pagamento). Esse endpoint não existe em produção.

Dados de sandbox e produção são totalmente isolados, não se replicam (docs/sandbox). Recomenda-se não usar e-mails nem telefones reais em clientes de sandbox.

### Rate limit e quota (afeta o backoff do adapter)

Por reference/rate-e-quota-limit:

- Rate limit por endpoint via headers `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` (segundos até o reset). Quando `RateLimit-Remaining=0`, retorna HTTP 429.
- Quota global: 25.000 requisições por conta a cada 12h, independente do endpoint. Reset 12h após a primeira requisição.
- Concorrência: até 50 requisições GET concorrentes por conta.
- Não há header `Retry-After` documentado. Usar `RateLimit-Reset` para o backoff. O valor exato de `RateLimit-Limit` por endpoint varia (não verificado o número por endpoint).

## Tabela: endpoint Asaas → método/campo do PaymentProvider

| Método da nossa interface | Endpoint(s) Asaas | Observação de mapeamento |
|---|---|---|
| `createCharge(CreateChargeParams)` | `POST /v3/customers` (resolver cliente) seguido de `POST /v3/payments` | Dois passos. A cobrança referencia um `id` de cliente (`cus_...`), não os dados inline. Ver mapa de campos abaixo. |
| `splitRules(SplitRulesParams)` | array de split embutido no corpo do `POST /v3/payments` (mais `GET /v3/wallets` e `POST /v3/accounts` como pré-requisito de walletId) | Divergência estrutural: no Asaas o split é definido na criação da cobrança, não numa chamada separada por `chargeId`. Ver seção de divergências. |
| `refund(RefundParams)` | `POST /v3/payments/{id}/refund` (mais `GET /v3/payments/{id}/refunds` para reconciliação) | `amount` omitido = estorno total; `amount` presente = parcial. |
| `handleWebhook(WebhookPayload)` | endpoint SEU recebendo `POST` do Asaas, eventos `PAYMENT_*` | A "assinatura" é o header `asaas-access-token` (token estático), não HMAC. Ver seção de divergências. |
| `getPayout(GetPayoutParams)` | **não mapeado nesta coleta** | Endpoints de saldo e repasse não foram coletados. Marcar como pendente de próxima descoberta. |

Endpoints de apoio confirmados, úteis mas sem método 1:1 na interface:

- `GET /v3/customers` e `GET /v3/customers/{id}`: lookup de cliente por `cpfCnpj` ou `externalReference` para evitar duplicidade antes do `POST` (a API Asaas permite clientes duplicados; a unicidade é responsabilidade nossa) (reference/list-customers).
- `GET /v3/payments/{id}` e `GET /v3/payments`: reconciliação e busca por `externalReference`.
- `GET /v3/payments/{id}/pixQrCode`: QR dinâmico (base64 + copia-e-cola + validade) para preencher `ChargeResult.qrCode` (reference/obter-qr-code-para-pagamentos-via-pix).
- `POST /v3/sandbox/payment/{id}/confirm`: confirmar pagamento no sandbox para disparar os webhooks sem dinheiro real.
- `POST /v3/webhooks` e `GET /v3/webhooks`: registrar e listar a configuração de webhook (a URL + o `authToken` que vira o `asaas-access-token`).

## Conversão de valores: centavos contra reais

Ponto que o adapter tem que acertar em toda chamada. Derivado de cruzar a interface com a doc, não é uma citação:

- A nossa interface trabalha em **centavos** (inteiro): `CreateChargeParams.amount`, `ChargeItem.amount`, `SplitRecipient.amount`, `RefundParams.amount`, `RefundResult.amount`, `WebhookResult.amount` (ver comentários em `PaymentProvider.ts`, "Valor em centavos").
- O Asaas trabalha em **reais** (número decimal): `value`, `fixedValue`, `netValue` etc. (reference/criar-nova-cobranca, docs/split-de-pagamentos).

Regra: dividir por 100 ao enviar para o Asaas, multiplicar por 100 (e arredondar) ao ler resposta e webhook. Esse é um ponto clássico de bug de arredondamento; testar com valores que não fecham redondo (ex.: 999 centavos vira 9,99).

## Mapa de campos por método

### createCharge

Passo 1, resolver o cliente:

- Fazer `GET /v3/customers?cpfCnpj=<taxId>` (opcionalmente com `externalReference`) para achar um `id` existente. Se não achar, `POST /v3/customers`.
- `CustomerData.name` vira `name`; `CustomerData.taxId` vira `cpfCnpj`; `CustomerData.email` vira `email`; `CustomerData.phone` vira `phone` (fixo) ou `mobilePhone` (celular; preferir `mobilePhone` para notificação/SMS).
- Obrigatórios no Asaas: `name` e `cpfCnpj`. Guardar um id estável nosso em `externalReference` (a nossa `CustomerData` não tem `externalReference` hoje; o adapter pode usar `orderId` ou `tenantId` como base) (reference/criar-novo-cliente).

Passo 2, criar a cobrança (`POST /v3/payments`):

- `customer` = o `cus_...` resolvido no passo 1.
- `billingType` = mapeado de `CreateChargeParams.paymentMethod`: `credit_card` vira `CREDIT_CARD`, `pix` vira `PIX`, `boleto` vira `BOLETO`.
- `value` = `amount / 100` (só cobrança à vista).
- `dueDate` = data de vencimento no formato `YYYY-MM-DD` (a interface não carrega `dueDate` hoje; o adapter precisa derivar, ex.: hoje + N dias). Ponto de atenção.
- `description` = concatenação de `items[].description` ou o primeiro item.
- `externalReference` = `orderId` (ADR-011), para casar webhook e reconciliação.
- Parcelamento (`CreateChargeParams.installments`, só cartão): regra crítica do Asaas. 1x usa só `value`, nunca `installment*`. 2x ou mais usa `installmentCount` + (`installmentValue` ou `totalValue`), nunca `value`. Recomendado usar `installmentCount` + `totalValue` para o Asaas dividir e ajustar a última parcela (docs/criar-uma-cobranca-parcelada; reference/criar-nova-cobranca).

Resposta e preenchimento do `ChargeResult`:

- `id` (`pay_...`) vira `chargeId`.
- `status` inicial `PENDING` vira `pending` (ver ciclo de status).
- `invoiceUrl` ou `bankSlipUrl` vira `paymentUrl` / `boletoUrl`; `pixQrCode` (ou `GET /v3/payments/{id}/pixQrCode`) vira `qrCode`; linha digitável do boleto vira `boletoBarCode`; validade vira `expiresAt`. Os nomes exatos de campo na resposta de criação não vieram todos no JSON de exemplo capturado; confirmar em sandbox.

Idempotência: a interface exige `idempotencyKey` no `createCharge` (RN-333). O Asaas **não tem header de idempotência HTTP-level** (confirmado ausente; a idempotência oficial do Asaas é só para consumo de webhook). O adapter tem que implementar isso do nosso lado: guardar `idempotencyKey → chargeId` (ex.: em Firestore) e/ou usar `externalReference` + lookup por `GET /v3/payments?externalReference=` antes de criar (docs/como-implementar-idempotencia-em-webhooks confirma idempotência só de webhook).

### splitRules

O parâmetro `split` do ADR-006 serializa no array de split embutido no corpo do `POST /v3/payments`, não é chamada separada (docs/split-em-cobrancas-avulsas). Cada `SplitRecipient` vira um item:

- `SplitRecipient.recipientId` vira `walletId` (id de carteira de uma conta Asaas ativa; obtido em `GET /v3/wallets` da subconta, ou no retorno de `POST /v3/accounts` ao criar a subconta).
- `SplitRecipient.amount` (centavos) vira `fixedValue = amount / 100` (2 casas decimais).
- `SplitRecipient.percentage` vira `percentualValue` (percentual, até 4 casas decimais).
- Em parcelamento, o Asaas usa `totalFixedValue` no lugar de `fixedValue` para distribuir o split entre as parcelas.

Regras do Asaas a respeitar: não indicar a própria carteira no split; soma dos `fixedValue` menor ou igual ao `netValue`; soma dos `percentualValue` menor ou igual a 100%. A base de cálculo é o `netValue` (valor menos as taxas do Asaas), e o restante não alocado credita automaticamente na conta emissora (docs/split-de-pagamentos).

Sobre `platformFeePct`: o Asaas não tem um campo "taxa da plataforma". A conta emissora fica com o que sobra depois dos recipients. Então `SplitRulesParams.platformFeePct` não vira um item de split; ele é implícito no resíduo. Cuidado: o mock calcula split sobre o total bruto; o Asaas calcula sobre o `netValue` (após taxas). Isso é uma divergência de base de cálculo (ver seção de divergências).

Statuses próprios do split no Asaas: `PENDING`, `AWAITING_CREDIT`, `DONE`, `CANCELLED`, `REFUSED`, `REFUNDED`. São sub-estado do repasse, não do payment (docs/split-de-pagamentos).

### refund

`POST /v3/payments/{id}/refund` (reference/estornar-cobranca):

- `{id}` = `RefundParams.chargeId`.
- `RefundParams.amount` (centavos): omitir para estorno total; enviar `value = amount / 100` para parcial.
- `RefundParams.reason` vira `description`.
- `splitRefunds[]`: reversão de split. A nossa `RefundParams` não tem esse campo hoje; o Asaas reverte o split automaticamente no estorno total.

Resposta e `RefundResult`:

- A cobrança volta com um array `refunds`, cada item com `status`, `value`, `description`, `dateCreated`, `endToEndIdentifier`, `transactionReceiptUrl`, `refundedSplits[]`.
- `RefundStatus` da nossa interface é `pending | approved | rejected`. O Asaas usa `PENDING | CANCELLED | DONE` no array `refunds`. Mapa: `PENDING` vira `pending`; `DONE` vira `approved`; `CANCELLED` vira `rejected`. O evento de webhook `PAYMENT_REFUND_DENIED` (só boleto) também vira `rejected`.
- Uma cobrança pode ter múltiplos refunds (PIX permite vários parciais). Iterar o array inteiro antes de somar o total estornado (docs/refunds).

Atenção: taxas (compensação, notificação) não são estornadas. Estorno de PIX recém-recebido pode falhar com 400 pedindo saldo. O adapter deve tratar 400 como erro de operação, não como novo status de cobrança (reference/estornar-cobranca).

### handleWebhook

O `POST` de entrada do Asaas alimenta `handleWebhook`. O corpo vira `WebhookPayload`:

- `WebhookPayload.event` = campo `event` do Asaas (ex.: `PAYMENT_RECEIVED`).
- `WebhookPayload.data` = o objeto do evento (contém `id` do evento `evt_...`, `payment{...}`).
- `WebhookPayload.signature`: aqui está a divergência. O Asaas envia o header `asaas-access-token` com o `authToken` que você definiu ao cadastrar o webhook. O adapter põe esse valor recebido em `signature`, e a validação compara com o segredo esperado guardado em `.env`, em tempo constante. Não é HMAC (docs/sobre-os-webhooks).
- `WebhookPayload.deliveredAt` = timestamp de recebimento.

Idempotência do webhook: usar o `id` do evento (`evt_...`), estável entre reentregas (modelo at-least-once), como chave única. Deduplicar por esse id (unique constraint; 23505 no Postgres = duplicado, responder 200). Responder 2xx rápido; após 15 falhas consecutivas a fila do Asaas pausa e precisa ser reativada (docs/como-implementar-idempotencia-em-webhooks, docs/sobre-os-webhooks).

O `WebhookResult` sai com `chargeId` (do `payment.id`), `status` mapeado (ver ciclo de status), `amount` (`payment.value * 100`), `processedAt`.

### getPayout

Não mapeado nesta coleta. Os endpoints de saldo disponível e de repasse/transferência do produtor não foram buscados. O único endpoint financeiro que apareceu foi `GET /v3/finance/split/statistics`, que é estatística de split, não saldo. **Pendente de próxima descoberta** (candidatos prováveis pela convenção Asaas: saldo e transferências em `/v3/finance/*` e `/v3/transfers`, não confirmados).

## Ciclo de status: Asaas para o nosso enum

Nosso enum `ChargeStatus` = `pending | confirmed | failed | refunded | cancelled` (`PaymentProvider.ts`). O mock hoje só mapeia três eventos (`charge.confirmed`, `charge.failed`, `charge.refunded` em `mockProvider.ts`), então o adapter precisa de um mapa mais rico.

Status do objeto `payment` do Asaas para o nosso enum:

| Status Asaas | Nosso `ChargeStatus` | Nota |
|---|---|---|
| `PENDING` | `pending` | aguardando pagamento |
| `CONFIRMED` | `confirmed` | pago, saldo ainda não liberado (típico de cartão/PIX antes da liquidação) |
| `RECEIVED` | `confirmed` | fundos liquidados; o nosso enum colapsa CONFIRMED e RECEIVED em `confirmed` |
| `OVERDUE` | `failed` | sem equivalente direto; candidato a novo estado `overdue` se quisermos distinguir |
| `REFUNDED` | `refunded` | estorno total |
| `PAYMENT_PARTIALLY_REFUNDED` (evento) | sem equivalente | gap; o mock rastreia `refundedAmount`, mas o enum não tem estado parcial |
| `DELETED` | `cancelled` | cobrança removida |
| `RESTORED` | `pending` | volta ao fluxo |
| `CREDIT_CARD_CAPTURE_REFUSED`, `*_REPROVED_BY_RISK_ANALYSIS` | `failed` | recusa de cartão ou risco |

Eventos de webhook para o nosso enum (roteia `handleWebhook`):

| Evento Asaas | Nosso `ChargeStatus` |
|---|---|
| `PAYMENT_CONFIRMED` | `confirmed` |
| `PAYMENT_RECEIVED` | `confirmed` |
| `PAYMENT_OVERDUE` | `failed` |
| `PAYMENT_REFUNDED` | `refunded` |
| `PAYMENT_DELETED` | `cancelled` |
| `PAYMENT_CREDIT_CARD_CAPTURE_REFUSED`, `PAYMENT_REPROVED_BY_RISK_ANALYSIS` | `failed` |
| `PAYMENT_REFUND_IN_PROGRESS` | manter `pending` do refund |
| `PAYMENT_REFUND_DENIED` (boleto) | mantém `confirmed`, marca refund como `rejected` |

Diferença de granularidade que precisa de decisão na ADR-006: o Asaas separa `CONFIRMED` (pago, não liquidado) de `RECEIVED` (liquidado); o nosso enum junta os dois em `confirmed`. Se o produto precisar saber da liquidação (ex.: liberar repasse só depois de `RECEIVED`), o enum precisa de um estado a mais. O mock não distingue estorno parcial, overdue nem chargeback (gaps conhecidos).

## Checklist do que o AsaasProvider precisa implementar

### Testável já no sandbox, sem KYC

- [ ] Camada de transporte: base URL por ambiente, header `access_token`, `Content-Type`, `User-Agent`; mapear os 401 (`invalid_environment`, `access_token_not_found`, etc.).
- [ ] Conversão centavos para reais em toda entrada e saída (dividir/multiplicar por 100, com arredondamento testado).
- [ ] Resolução de cliente: `GET /v3/customers?cpfCnpj=` seguido de `POST /v3/customers`; guardar `cus_...`.
- [ ] `createCharge` para PIX e BOLETO: `POST /v3/payments`, lógica de parcelamento (1x usa `value`; 2x+ usa `installmentCount` + `totalValue`), `externalReference = orderId`.
- [ ] Preencher `ChargeResult` (paymentUrl, qrCode via `GET /v3/payments/{id}/pixQrCode`, boletoUrl, boletoBarCode, expiresAt).
- [ ] Idempotência do `createCharge` do nosso lado (store `idempotencyKey → chargeId` e/ou lookup por `externalReference`), já que o Asaas não tem idempotency-key HTTP.
- [ ] Confirmar pagamento no sandbox: `POST /v3/sandbox/payment/{id}/confirm` para disparar webhook sem dinheiro real.
- [ ] Registrar webhook: `POST /v3/webhooks` com `authToken` válido (32 a 255 chars, sem espaços, não pode ser a API Key); receber via túnel (webhook.site, ngrok) em dev.
- [ ] `handleWebhook`: validar `asaas-access-token` em tempo constante antes de processar; deduplicar por `id` do evento (`evt_...`); responder 2xx rápido; mapear evento para o nosso enum.
- [ ] `refund`: `POST /v3/payments/{id}/refund` (total sem `value`, parcial com `value`); ler `GET /v3/payments/{id}/refunds`; mapear `PENDING/DONE/CANCELLED` para `pending/approved/rejected`; tratar 400 (saldo insuficiente) como erro de operação.
- [ ] `splitRules`: criar subconta de teste com `POST /v3/accounts` para obter walletId; embutir o array de split no `POST /v3/payments`; observar o ciclo do split e a reversão no estorno. Resolver a divergência estrutural (split na criação, não por `chargeId` depois) e a base de cálculo (netValue contra total bruto).
- [ ] Backoff: honrar `RateLimit-Reset` (não há `Retry-After`); backoff exponencial; respeitar quota 25.000/12h e 50 GET concorrentes.

### Atrás do KYC ou produção (não dá para fechar só no sandbox)

- [ ] Mover dinheiro de verdade: conta de produção exige KYC real (CPF/CNPJ aprovado); chave `$aact_prod_` e base `api.asaas.com`.
- [ ] Cartão de crédito real: provavelmente exige tokenização e produção; os números de cartão de teste do sandbox **não foram confirmados** nesta coleta, então o fluxo de cartão fica parcialmente sem cobertura de teste até achar esses números (reference/tokenizar-cartao numa próxima descoberta).
- [ ] `getPayout`: repasse e saldo do produtor. Endpoints **não coletados**; precisa de nova descoberta antes de implementar. Não implementar por adivinhação.
- [ ] Cobrança real de cliente real e webhooks de produção (a fila, os retries e a pausa após 15 falhas se comportam igual, mas com efeito financeiro real).

## Divergências entre a interface e o Asaas (ler antes de codar)

1. Assinatura de webhook não é HMAC. A `WebhookPayload.signature` foi pensada como "HMAC ou equivalente", mas o Asaas manda um token estático no header `asaas-access-token`. A validação é comparação de igualdade em tempo constante com o `authToken` cadastrado, não verificação de hash. O mock assina com HMAC de verdade; o adapter Asaas não vai reproduzir isso, e sim comparar o token (docs/sobre-os-webhooks).
2. Split é definido na criação da cobrança, não numa chamada separada por `chargeId`. A nossa `splitRules(chargeId)` sugere configurar split depois. No Asaas, o caminho natural é embutir o split já no `POST /v3/payments`. Configurar depois exigiria `PUT /v3/payments/{id}` (não coletado em detalhe). Decidir se `createCharge` passa a carregar o split, ou se o adapter faz `PUT`.
3. Base de cálculo do split difere. O mock calcula sobre o total bruto; o Asaas calcula sobre o `netValue` (após taxas Asaas). Os valores de recipient vão bater diferente entre mock e Asaas para a mesma entrada. Alinhar na ADR-006.
4. Sem idempotência HTTP nativa. A interface exige `idempotencyKey` em `createCharge` e `refund`; o Asaas só oferece idempotência para consumo de webhook. O adapter carrega essa responsabilidade.
5. `getPayout` sem endpoint mapeado. A interface tem o método; a coleta não achou o endpoint. Gap explícito.
6. Granularidade de status. `CONFIRMED` contra `RECEIVED` colapsam em `confirmed`; estorno parcial e overdue não têm estado próprio no enum.

## O que ficou não verificado

- Números de cartão de crédito de teste em sandbox: **não encontrados** nesta coleta.
- Endpoints de saldo e repasse para `getPayout`: **não coletados**.
- Nome do campo de split no request (`split` contra `splits`): **ambíguo** na própria coleta; confirmar em sandbox ou OpenAPI.
- Schema de `GET/PUT/DELETE /v3/webhooks/{id}`: **inferido** por convenção REST, páginas dedicadas não buscadas.
- `discount.type`, `fine.type`, `interest.type = PERCENTAGE`: vistos por WebSearch, **não confirmados** na página de criação de cobrança.
- Estrutura interna de `splitRefunds` no request: **inferida** do objeto de leitura, não citada na doc.
- Valor exato do enum de status do payment quando estornado (esperado `REFUNDED`): **não confirmado** textualmente na página de eventos.
- Valor exato de `RateLimit-Limit` por endpoint: a doc diz que varia; número **não verificado**.
- Nomes exatos dos campos de resposta da criação de cobrança (invoiceUrl, bankSlipUrl, pixQrCode, linha digitável): **parcialmente confirmados**; validar em sandbox.

## Fontes

Doc oficial `docs.asaas.com` (páginas `.md`), carregadas em julho/2026:

- Autenticação: docs/autenticação-1
- Sandbox: docs/sandbox, docs/como-configurar-sua-conta-no-sandbox, docs/como-adicionar-dinheiro-para-testes, reference/confirmar-pagamento
- Clientes: reference/criar-novo-cliente, reference/list-customers, reference/retrieve-a-single-customer, docs/creating-customers
- Cobranças: reference/criar-nova-cobranca, reference/recuperar-uma-unica-cobranca, reference/listar-cobrancas, docs/criar-uma-cobranca-parcelada, reference/obter-qr-code-para-pagamentos-via-pix
- Estorno: reference/estornar-cobranca (e reference/refund-payment), reference/retrieve-refunds-of-a-single-payment, docs/refunds, docs/payment-events
- Webhooks: docs/sobre-os-webhooks (about-webhooks), docs/webhook-para-cobrancas, docs/receive-asaas-events-at-your-webhook-endpoint, docs/como-implementar-idempotencia-em-webhooks, reference/create-new-webhook, reference/list-webhooks
- Split: docs/split-de-pagamentos, docs/split-em-cobrancas-avulsas, docs/split-em-parcelamentos, reference/retrieve-walletid, reference/criar-subconta, docs/consulta-de-splits-via-interface, docs/duvidas-frequentes-split
- Limites: reference/rate-e-quota-limit, docs/duvidas-frequentes-limites-da-api

WebSearch de apoio (confirmação cruzada): URL de onboarding do sandbox (`sandbox.asaas.com/onboarding/createAccount`), header `asaas-access-token` + `authToken`, prefixos de chave `$aact_hmlg_`/`$aact_prod_`, objetos `discount`/`fine`/`interest`, split `totalFixedValue`, permissão `ACCOUNT_INFO:READ` do `GET /v3/wallets`, campos de `POST /v3/accounts`.

Arquivos internos consultados para o mapeamento: `packages/core/src/payments/PaymentProvider.ts` (interface, ADR-006), `functions/src/payments/mockProvider.ts` (mock de referência).
