# BRIEF ENRIQUECIDO — LEELA-ASAAS-ADAPTER · AsaasProvider real (atrás de PaymentProvider)

> Trace: `leela-build-2d6ee98d` · Rota: **Fable** (pagamento/segurança — INVIOLÁVEL; passar `model:"fable"` EXPLÍCITO) · ⚔ (dinheiro) · Empresa: **software-forge** (sf-backend-lead) · Repo: `C:\dev\LEELA` (main). **NÃO commitar, NÃO push** (maestro fecha após gate). DNA: **Schneier** (verificação de assinatura de webhook, modo de falha) + **Kleppmann** (idempotência/consistência).

## Objetivo
Construir o `AsaasProvider` real que implementa a interface `PaymentProvider` (ADR-006), atrás da MESMA seleção — sem tocar no fluxo do checkout. O Mock continua sendo o provider do checkout; o Asaas entra depois por ativação **deliberada**. Esta task entrega o adapter + testes com HTTP **mockado** (zero rede real na suíte).

## ⛔ REGRA DE SEGURANÇA DE PRODUÇÃO (a chave disponível é de PRODUÇÃO)
- A única chave que temos hoje é de **produção** (`ASAAS_PROD_API_KEY` em `functions/.env`, gitignored). **A chave sandbox não está disponível.**
- **PROIBIDO** qualquer teste que CRIE recurso em produção: nada de `POST /payments` (cobrança), `POST /customers` (cliente), refund real, subscription. Isso geraria fatura/registro REAL na conta do Vitor.
- A suíte roda **100% com HTTP mockado** (ex.: `nock`/`undici` MockAgent/`msw`) — testa montagem de request + parsing de resposta + verificação de assinatura, SEM tocar a rede.
- **NÃO** rode nenhuma chamada de rede real você mesmo. Se criar um teste de integração real, ele deve ser **skip por default** (`describe.skip`/gated por env `RUN_ASAAS_READONLY=1`) e, se um dia rodar, **SÓ read-only** (`GET /myAccount` ou saldo) — nunca escrita. A verificação read-only de produção é feita pelo **maestro**, não por você.
- **NÃO** defina `ASAAS_API_KEY` nem altere `selectProvider.ts`/o fluxo de checkout para usar o Asaas. A ativação é um passo separado e revisado. O fail-safe de ADR-006 PERMANECE.

## Contexto (CONSUMIR — não redefinir)
- **Interface:** `packages/core/src/payments/PaymentProvider.ts` (ADR-006) — `createCharge`, `refund`, processamento de `webhook`. Implemente-a fielmente.
- **Referência da API (JÁ mapeada):** `leela-specs/discovery/asaas-api-reference.md` — endpoints, autenticação (header `access_token`), criação de cobrança PIX/cartão, webhook (eventos `PAYMENT_CONFIRMED`/`PAYMENT_RECEIVED`/etc.), assinatura de webhook. Leia antes de codar.
- **Ambiente-consciente:** base URL por ambiente — **sandbox** `https://api-sandbox.asaas.com/v3` (chave prefixo `$aact_hmlg_`) vs **produção** `https://api.asaas.com/v3` (chave prefixo `$aact_prod_`). O adapter deriva o ambiente do prefixo da chave OU de config explícita. **Nunca** aponte a suíte para produção.
- **Mock existente:** `functions/src/payments/mockProvider.ts` — espelhe a forma dos retornos (mesmos tipos de `PaymentProvider`) para que a troca seja transparente.
- **Split/repasse:** `packages/core/src/finance/` (`calcularSplit`, `commercialTerms`) — se o Asaas suportar split nativo, mapeie; senão, o repasse segue como hoje. Não fabrique regra nova.

## Escopo (SÓ o adapter + testes mockados)
1. **`functions/src/payments/asaasProvider.ts`** — `AsaasProvider implements PaymentProvider`:
   - `createCharge` (PIX e cartão) — monta o request Asaas, idempotente por `idempotencyKey` (Asaas suporta `externalReference`/idempotência — usar), mapeia a resposta para o tipo do domínio. Sem valor fabricado; centavos só na borda.
   - `refund` — estorno por cobrança (a granularidade por-inscrito do ADR-011 é resolvida acima, no domínio).
   - `parseWebhook`/`verifyWebhook` — **verifica a assinatura/autenticidade** do webhook Asaas (Schneier: rejeita não-autêntico), idempotente, mapeia evento → transição de pagamento. Persistir bloco `cartao` na confirmação de cartão (follow-up já registrado; PIX não exige).
2. **Registro (se ADR-013 aprovado; senão, exportar pronto para plugar):** deixar o adapter registrável por `providerId='asaas'`, MAS **manter a resolução default = Mock** (não ativar). Se ADR-013 ainda não aprovado, só exporte o adapter + deixe o TODO de wiring.
3. **Testes com HTTP mockado:** unit de `createCharge` (PIX+cartão, idempotência), `refund`, `parseWebhook` (assinatura válida/ inválida, idempotência, evento→transição). Cobertura de erro (4xx/5xx do Asaas → erro de domínio tratado, sem vazar). **Nenhuma rede real.**
4. (Opcional) Um teste `describe.skip` de sanidade read-only gated por `RUN_ASAAS_READONLY=1` que faria `GET /myAccount` — **deixe SKIP**; o maestro decide se roda.

## Fora de escopo
NÃO ativar Asaas no checkout · NÃO `ASAAS_API_KEY` · NÃO tocar `selectProvider`/fluxo · NÃO teste que escreve em produção · NÃO a camada de roteamento/failover do ADR-013 (só deixar plugável) · NÃO UI.

## Gates (rode você; SERIAL; máquina 8GB — sem paralelismo; sem rede real)
`tsc` (core+functions) + `ESLint --max-warnings 0` + `vitest` unit (HTTP mockado). **Não** rode emulator (o adapter não precisa) nem rede. Se algo exigir a chave real, PARE e reporte — não rode contra produção.

## Report
`outputs/leela-build-2d6ee98d/ASAAS-ADAPTER-REPORT.md`: mapeamento endpoint→método, como a idempotência é feita (externalReference), como a assinatura de webhook é verificada (prova), tratamento de erro, ambiente sandbox vs prod (como decide), o que fica pendente para a ativação real (o passo deliberado) e para o teste ponta-a-ponta (precisa da chave sandbox). Retorno: resumo 10 linhas + arquivos + saída real dos gates + a checklist exata da ATIVAÇÃO (o que o maestro/Vitor faz para ligar o Asaas com segurança).
