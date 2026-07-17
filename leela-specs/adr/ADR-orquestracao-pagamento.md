---
tags: [leela, adr, arquitetura, pagamento, checkout, gateway, aceita]
---

# ADR-013 · Orquestração de pagamento (provedores plugáveis + roteamento por providerId)

**Status.** ✅ **ACEITA (Vitor, 2026-07-17).** Implementação em **lote próprio** — nesta rodada só o status muda de proposta para aceita (registry + `resolveProvider(contexto)` + `providerId` de roteamento + webhook demux; **failover fica para depois**). Estende [[ADR-006]] (PaymentProvider) sem quebrar o fluxo atual. Motivada pela pergunta do Vitor (2026-07-11): "é comum termos que rotear para outro gateway; como construir a integração de forma que seja só plugar outros provedores no futuro, ou orquestrar internamente?".

**Contexto.** Hoje o gateway é decidido (Asaas, ADR-006/D2) e a seleção é `selectPaymentProvider(env)`: sem chave → Mock; com chave → adapter real (fail-safe). Isso resolve UM provedor. Mas o negócio prevê cenários reais de **múltiplos gateways**: um provedor cai (failover), um método fica mais barato noutro gateway (custo), um tenant exige um adquirente específico (contrato), ou uma migração gradual entre provedores. Se cada um desses vira um `if` espalhado no checkout e no webhook, o código de dinheiro apodrece. A questão não é *qual* gateway, é *como plugar N deles sem tocar no fluxo*.

**Decisão (proposta).** Trocar a **seleção por-ambiente** por uma **resolução por-contexto com registry**, plugável, mantendo a interface `PaymentProvider` (ADR-006) intacta. Três costuras agora; inteligência de roteamento depois.

1. **Registry de provedores.** Um mapa `providerId → PaymentProvider` (ex.: `'mock'`, `'asaas'`). Registrar um gateway novo = adicionar um adapter que implementa a interface + uma entrada no registry. Zero mudança no checkout.
2. **`resolveProvider(contexto)` no lugar de `selectProvider(env)`.** A resolução recebe um contexto (`{ tenantId, metodo, valor, env }`) e devolve `{ providerId, provider }`. Na V1 a regra é trivial (o `providerId` default do ambiente/tenant), mas a **assinatura** já aceita o contexto — é o ponto único onde, depois, entram custo/failover/contrato sem tocar em quem chama.
3. **`providerId` como chave de roteamento persistida.** O `pedido`/`pagamento` grava **qual provedor processou** (`providerId`). Isso é o que torna o **webhook demux** possível: o webhook chega, lê o `providerId` do registro (ou da rota), e despacha para `registry[providerId].handleWebhook()` — cada gateway tem assinatura/payload próprios, então o demux por `providerId` é obrigatório assim que houver 2+.

**Fora de escopo agora (as costuras acima habilitam, mas não implementam):** a **inteligência de roteamento** (escolher gateway por custo/método), **failover automático** (retry noutro provedor quando um cai), **reconciliação multi-gateway**, e **split/repasse por adquirente**. Entram quando existir o 2º gateway real. A V1 roda com Asaas (+ Mock em teste) atrás dessas costuras — o preço de construí-las agora é baixo; o preço de retrofitá-las depois, alto.

**Consequência.**
- `functions/src/payments/selectProvider.ts` evolui para `resolveProvider.ts` com o registry; `selectPaymentProvider` vira um caso particular (`resolveProvider({env}).provider`). O fail-safe de [[ADR-006]] (chave real presente sem adapter → lança) **permanece** dentro do resolver.
- `pedido`/`pagamento` ganham `providerId: string` (qual gateway processou) — chave de roteamento do webhook e da conciliação. Migração trivial (default `'asaas'`/`'mock'`).
- O webhook deixa de assumir um único gateway: passa a demultiplexar por `providerId`. Idempotência e verificação de assinatura permanecem por-adapter.
- Custo: ~1 nível de indireção (registry + contexto) que a V1 quase não exercita. Benefício: adicionar gateway = 1 adapter + 1 linha no registry, sem cirurgia no fluxo de dinheiro.
- **Alternativa rejeitada:** manter `selectProvider(env)` e adicionar gateways com `if/switch` no checkout e no webhook — espalha decisão de roteamento pelo código de dinheiro, o pior lugar para lógica condicional crescer. | motivo: acoplamento e superfície de bug monetário.
- **Alternativa rejeitada:** adotar um orquestrador de pagamento de terceiros (ex.: um PSP-agregador) agora — over-engineering para 1 gateway; reavaliar se/quando houver 3+. | motivo: custo/complexidade desproporcionais à V1.

---
Relacionado: [[ADR-006]] · [[ADR-pedido-em-grupo]] (ADR-011) · [[LEELA-E12-landing]] · [[LEELA-S1203]] · [[modelo-de-dados-firestore]]
