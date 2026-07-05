# Onda 2 · E12 — Landing + checkout público · brief de lotes

Recorte V1 do épico E12 (`leela-specs/epics/LEELA-E12-landing.md`), alinhado às **decisões vinculantes** do Vitor (`discovery/decisoes-escopo-2026-07-04.md`) e ao **benchmark Cheers** (`discovery/benchmark-cheers.md`).
Superfície: `apps/landing` (Next.js App Router SSR/ISR — já scaffoldado no repo, com Sentry/Tailwind/health). Regra 1 task = 1 commit atômico. Roteamento: **Fable** = Functions/rules/core-negócio/segurança; **Opus** = telas/páginas Next (DS + api-client).

---

## CORTES aplicados (spec original × decisões do Vitor)

A decisão "Sem afiliados neste início. Cupons sim." (`decisoes-escopo-2026-07-04.md`) corta a espinha de afiliação do E12. Registro os cortes no topo, por instrução do orquestrador:

- **CORTADA — S1204-T1** (captura de link master `?c=` + cookie de atribuição por janela). É atribuição de afiliado. Sai integralmente.
- **CORTADA — S1204-T3** (Function de conversão + split: ∑ `conversoes`/`valorAReceber`, janela, teto). É comissão/split de afiliado. Sai integralmente. A infra de split plugável permanece **como desenho** (`PaymentProvider.splitRules`, ADR-006), sem uso/UI na V1.
- **REENQUADRADA — S1204-T2** (cupom). Fica **só a parte de cupom**: valida o código, aplica desconto. **Deixa de "resolver o afiliado dono"** (`afiliadoRef`) e deixa de atribuir conversão. Vira cupom de evento (desconto puro), consumindo o modelo de cupom que o **E04-slim (S300-T5)** entrega nesta mesma onda.
- **TRIM de referências a afiliação** em stories que sobrevivem:
  - S1201: CTA "preservando parâmetros de atribuição" → passa a preservar **só o contexto do evento + cupom via query** (sem cookie de afiliado).
  - S1202-T2: o bloco "eventos que o clube promove" depende de `parcerias/evento_afiliado` (RN-125), que não é populado sem programa de afiliação. **Recomendo cortar o bloco na V1** (ou "em breve"); clube mantém hero+bio+KPIs+desafios públicos+CTA app (ver Decisão aberta #5).
  - S1203-T4/T5: "afiliado resolvido"/"`splitRules` do afiliado quando houver" → cupom vira **desconto puro**; `createCharge` **sem** split de afiliado.
  - Critério de sucesso do épico "link master `beh.ro/mfl26?c=cps` que converte gera conversão atribuída" → **cortado**.
- RNs neutralizadas na V1: **RN-125, RN-310, RN-311 (janela/teto/atribuição)**. Sobra de RN-311 só o conceito de cupom, agora dono do E04.

- **DEFERIDA — S1208** (portal público do organizador). É **Should** (não Must), **greenfield** (sem Figma), pede **rodada de design** e depende do editor no painel (E04). Não está no caminho crítico de "vender ponta a ponta". **Recomendo V1.1.** Listada como **L6 (opcional)** para o consolidador puxar se o Vitor quiser (ver Decisão aberta #6).

---

## L0 · Martelo comercial (Cheers) + fundação de pricing — FABLE

> Lote de **decisão + fundação**. As três decisões abaixo pedem martelo do Vitor; o código de L0 encoda a decisão default com testes falsificáveis, e é barato reverter porque o cálculo já existe em `finance/calc.ts`.

### Decisão 1 — Taxa: incorporada vs não incorporada (modelo Cheers 8%/10%)
- **Estado atual:** `commercialTerms.platformFeePct` (mock 10,5%) é deduzido da receita bruta (RN-330, `computeReceitaLiquida`) — ou seja, hoje a Leela é **incorporada** (produtor absorve). Não existe flag "quem paga a taxa" nem linha de taxa no checkout.
- **Recomendação p/ o Vitor:** adicionar `commercialTerms.taxaIncorporada: boolean` (default `true`). Checkout lê o flag: `false` (não incorporada) → adiciona linha visível "Taxa de serviço" ao total do comprador (comprador paga `subtotal + taxa`; produtor recebe `subtotal` integral); `true` (incorporada) → sem linha (produtor recebe `subtotal − taxa`). Núcleo em `core/checkout/serviceFee.ts` reusando `finance/calc.computeTaxa`.
- **Martelo pendente:** (a) aprovar flag + default incorporada; (b) escopo do flag: por-tenant (termo versionado) vs por-evento — recomendo **por-tenant V1**; (c) mínimos por método (R$ cartão/PIX): **NÃO copiar os números da Cheers** (R$1,50/0,80/2,00) — ou o Vitor fixa os mínimos da Leela ou adiamos (recomendo adiar; percentual puro na V1, campo `taxaMinima` no termo depois); (d) o **percentual efetivo** da Leela (mock 10,5% vs Cheers 8/10) é decisão de pricing do Vitor, é **dado do termo**, não código.
- **Dono do campo `taxaIncorporada`:** E16/E04 (termo comercial). Dependência cross-épico (ver Decisão aberta #1).

### Decisão 2 — Parcelamento com taxa por parcela
- **Estado atual:** `finance/calc.buildInstallmentOptions(valor, installmentRules)` **já** monta as opções a partir do termo (`maxParcelas`, `jurosAoMes`, `parcelaMinima`). `DEFAULT_COMMERCIAL_TERMS` = até 12x, `jurosAoMes: 0` (sem juros), parcela mínima R$10. Só cartão parcela (`PaymentProvider.installments` só cartão); PIX/boleto à vista.
- **Recomendação p/ o Vitor:** V1 **apenas consome** `buildInstallmentOptions` no passo Pagamento e renderiza. Manter default 12x sem juros. O campo `jurosAoMes` já suporta juros se o Vitor decidir repassar o custo de parcelamento ao comprador (modelo Cheers de taxa por parcela).
- **Martelo pendente:** `jurosAoMes = 0` (produtor/plataforma absorve, menos fricção de ticket alto) **ou** `> 0` (repassa ao comprador) na V1. Recomendo **0**; o custo real do parcelamento só é conhecido com o **gateway concreto (ADR-006 pendente)** — revisar quando fixar o fornecedor.
- **Sem código novo de cálculo** (já existe); E12 só consome + renderiza (tratado em L0-T2 e S1203-T4).

### Decisão 3 — Frete vs retirada
- **Recomendação p/ o Vitor: RETIRADA-ONLY V1; FRETE V1.1.**
- **Justificativa:** (1) o kit da Leela é escopado ao evento com **balcão de retirada já construído** (E03: retirar kit = check-in, RN-205); o JTBD V1 é inscrição em prova com retirada no local, não e-commerce de merch enviado. (2) Frete exige coleta de endereço, cálculo de frete, integração com transportadora e máquina de fulfillment — **nada existe** e nada está no caminho crítico de vender. (3) A Cheers precisa de frete porque vende produto contínuo o ano todo; a Leela V1 vende inscrição com retirada. (4) **Consequência de desenho:** o checkout **não tem etapa "escolha de entrega"** (ao contrário do passo 1 da Cheers). O stepper permanece **5 etapas** (Dados → Modalidade/Kit → Resumo → Pagamento → Confirmação); retirada é implícita (balcão E03).
- **Martelo pendente:** confirmar retirada-only V1. Se o Vitor quiser merch enviado já na V1, frete vira Must, o stepper ganha etapa de endereço + cálculo de frete, e L3 é replanejado.

### Tasks de fundação (encodam as decisões com teste)
- **L0-T1** (`core/checkout/serviceFee.ts`): função pura que, dado `subtotal`, `platformFeePct`, `taxaIncorporada`, retorna `{ totalComprador, receitaProdutor, taxaPlataforma, linhaTaxaVisivel: boolean }`. Reusa `finance/calc.computeTaxa`/`computeReceitaLiquida`.
- **L0-T2** (`core/checkout/installments.ts`): wrapper de exibição sobre `finance/calc.buildInstallmentOptions` — filtra por método (só `credit_card`), rotula "à vista" (1x) e "Nx de R$ Y".

- **Dep:** E00, `finance/calc.ts` (feito), `commercialTerms.ts` (feito). **Bloqueia:** S1203-T3/T4 (pricing no checkout).
- **Aceite (falsificável por teste):**
  - `serviceFee(100, 10, false)` → `{ totalComprador: 110, receitaProdutor: 100, taxaPlataforma: 10, linhaTaxaVisivel: true }`.
  - `serviceFee(100, 10, true)` → `{ totalComprador: 100, receitaProdutor: 90, taxaPlataforma: 10, linhaTaxaVisivel: false }`.
  - `buildInstallmentOptions(100, {maxParcelas:12, jurosAoMes:0, parcelaMinima:10})` → 10 opções (para em 10x; 100/11 = 9,09 < 10 quebra em 11x); todas com `valorTotal === 100`.
  - `buildInstallmentOptions(120, {maxParcelas:12, jurosAoMes:0, parcelaMinima:10})` → 12 opções; 12x = R$10,00.
  - `installments(...)` só oferta parcela para `credit_card`; PIX/boleto retornam só 1x.

---

## L1 · Fundação pública SSR/ISR + leitor + Rules + core-checkout puro — FABLE

- **Tasks:** S1200-T1 (formalizar `apps/landing`: layout público `(public)/`, `ThemeProvider theme="leela"`, header/footer públicos, convenção ISR `revalidate`/tags `event:{slug}`/`club:{slug}`, credenciais Admin só server) · S1200-T2 (`getPublishedEvent`/`getPublicClub` server-side com gate `status`/`visibilidade` + tipos públicos `PublicEvent`/`PublicClub`/`PublicKit`/`PublicChallenge` em `core/public` + Rules de leitura pública) · **core-checkout puro:** `core/checkout/steps.ts` (5 etapas + guards), `core/checkout/validateDados.ts`, `core/checkout/types.ts`, `core/public/saleState.ts` (`deriveSaleState`).
- **Superfície:** `apps/landing/app/(public)/layout.tsx`, `apps/landing/app/components/*`, `apps/landing/next.config.js`, `packages/api-client/src/public/*`, `packages/core/src/public/*`, `packages/core/src/checkout/*`, `firestore.rules`.
- **Dep:** E00, E01 (`ThemeProvider`). `apps/landing` já scaffoldado (Next.js/Sentry/Tailwind presentes) → T1 é refinamento, não do zero. **Bloqueia todo o resto do épico.**
- **Aceite (falsificável):**
  - build: bundle do cliente **não** contém credencial Firebase Admin (grep no output); rota SSR responde 200 sem vazar env server-only no HTML.
  - `getPublishedEvent(slug)` de evento `rascunho` → `null`; de `publicado`/`ao_vivo` → `PublicEvent` sem campos privados.
  - `getPublicClub(slug)` de clube `privada` → `null`; `indexavel` → `PublicClub` **sem** `codigoConvite`.
  - Rules (emulator): anônimo lê evento `publicado` e clube `publico/indexavel`; leitura de evento não publicado / clube `privada` é **negada**.
  - `deriveSaleState(event)` → `'aberto' | 'encerrado' | 'esgotado'` por data/capacidade (unit).
  - `steps.ts`: exatamente 5 etapas na ordem canônica; transição só com etapa válida (unit).
- **Rules DEVEM reusar** os helpers multi-tenant (`isTenantMember`, `isPlatformAdmin`, `tenantAtivo`) já no `firestore.rules` (S1600 feito).

---

## L2 · Página pública de evento + clube + estados + SEO — OPUS

- **Tasks:** S1201-T1 (rota SSR/ISR `[eventSlug]` + `SectionRenderer` orientado por config), S1201-T2 (componentes de seção: Hero, Modalidades, Kits, Retirada, Info/FAQ, Percurso, Patrocinadores, Depoimentos), S1201-T3 (estados públicos rascunho→404/encerrado/esgotado + `ShareBlock` URL+QR), S1202-T1 (rota `c/[clubSlug]` + gate RN-140), S1202-T2 (conteúdo do clube: hero/bio/KPIs/desafios públicos/CTA — **sem bloco de eventos afiliados**, ver corte), S1205-T1 (`generateMetadata` + OG/Twitter + JSON-LD `Event`), S1205-T2 (`sitemap.ts` + `robots.ts`).
- **Superfície:** `apps/landing/app/(public)/[eventSlug]/*`, `apps/landing/app/(public)/c/[clubSlug]/*`, `apps/landing/app/sitemap.ts`, `apps/landing/app/robots.ts`, `apps/landing/app/lib/seo.ts`, `packages/api-client/src/public/listIndexable.ts`.
- **Dep:** L1 (S1200-T2 leitor + tipos). SEO (S1205) depende de S1201-T1/S1202-T1. **Consome DS/E01** (ver risco DS).
- **Aceite (falsificável):**
  - `meia-floripa-2026` publicado → renderiza Hero + seções ativas na **ordem publicada**; seção com `ativo=false` **não aparece**; slug rascunho/inexistente → **404** (`notFound()`).
  - 4 kits incl. "Sem kit" → 4 cards com rótulo "kit" (nunca "tier", RN-216) e preços vigentes; "a partir de" = menor preço (RN-301); evento sem depoimentos → seção Depoimentos **não renderiza**.
  - evento com data passada → CTA desabilitado + "Inscrições encerradas"; capacidade atingida → "Esgotado" + CTA desabilitado; copiar link → toast "Link da página pública copiado".
  - clube `privada` → 404; `indexavel` → 200 com dados públicos; 1 desafio `publico` + 2 `membros` → só o público aparece (RN-117); clube com aprovação manual → CTA informa liberação pendente (RN-141).
  - `<head>` de evento tem title/description/canonical/OG/JSON-LD `Event`; clube `publica` → metadata `noindex`; sitemap lista 2 eventos publicados + 1 clube `indexavel` e **exclui** clube `publica`/`privada` (RN-140); canonical usa `{leela-domain}` (placeholder, **nunca** `be-hero.com.br`).

---

## L3 · Checkout — stepper 5 etapas (UI) + compliance na etapa Dados — OPUS

- **Tasks:** S1203-T1 (rota `[eventSlug]/inscricao` + máquina de estado das 5 etapas, consome `steps.ts` de L1; bloqueia se `deriveSaleState` ≠ aberto; sem `localStorage` de domínio), S1203-T2 (etapa Dados: form anônimo + `validateDados`), S1203-T3 (etapa Modalidade/Kit: seleção + subtotal via `core/checkout/pricing.ts`, kit negativo RN-211), S1203-T4 (etapa Resumo: order summary + linha "Taxa de serviço" condicional de L0 + opções de parcelamento de L0 + campo de cupom via `validateCoupon` de L4), S1207-T3 (na etapa Dados, por inscrito: contato de emergência obrigatório + checkbox de aceite de regulamento distinto do checkbox LGPD, bloqueio via `validateInscrito`).
- **Superfície:** `apps/landing/app/(public)/[eventSlug]/inscricao/*` (`page.tsx`, `CheckoutMachine.tsx`, `steps/*`), `packages/core/src/checkout/pricing.ts`, `applyCoupon.ts`.
- **Dep:** L1 (S1200-T2, steps/validateDados), L0 (pricing/serviceFee/installments), L4 (S1204-T2 `validateCoupon`, S1207-T2 `validateInscrito`), **E01 Stepper** (existe em `packages/design-system/src/components/Stepper`).
- **Aceite (falsificável):**
  - checkout monta exatamente **5 etapas** na ordem Dados → Modalidade/Kit → Resumo → Pagamento → Confirmação; **não há etapa de entrega** (Decisão 3).
  - etapa Dados: email inválido → erro inline + avanço bloqueado; sem consentimento LGPD → bloqueado.
  - Modalidade/Kit: escolher "Sem kit" com desconto → subtotal reflete preço negativo (RN-211); UI **nunca** renderiza a string "tier".
  - Resumo: com `taxaIncorporada=false`, subtotal R$100 → mostra linha "Taxa de serviço R$10" e total R$110; com cupom `CORRIDAPERFEITA10` válido → total cai 10% (sem "afiliado resolvido"); cupom inválido → erro inline, total inalterado.
  - Resumo mostra opções de parcelamento (só cartão) vindas de `buildInstallmentOptions`.
  - etapa Dados com pedido de 2 inscritos: um sem contato de emergência → avanço bloqueado apontando o inscrito (RN-145); aceite de regulamento marcado mas LGPD não → bloqueado (são checkboxes distintos, RN-148).
  - evento esgotado → entrada no checkout bloqueada.

---

## L4 · Checkout backend — cupom, cobrança, webhook idempotente, agregados, compliance persist — FABLE

- **Tasks:** S1204-T2 (`validateCoupon(eventoId, codigo)` callable server-side — cupom **de evento, sem afiliado**; consome o modelo de cupom do E04-slim **S300-T1** (data-model/Rules/seed; S300-T5 é só o modal do painel); `core/checkout/coupon.ts` regras puras), S1207-T2 (`validateInscrito` core-pure: contato + aceite × LGPD distintos, por inscrito), S1207-T1 (persistir `contatoEmergencia`/`regulamentoAceite{versao,aceitoEm,ipHash?}`/`consentimentoLgpd{aceitoEm}` ao criar inscrito), S1203-T5 (`createInscricaoCharge` + `sandboxProvider`: cria `pedidos/{id}` [ADR-011, coleção nova] + inscritos `pendente` + `PaymentProvider.createCharge` com `idempotencyKey`; validação server), S1203-T6 (`handlePaymentWebhook` idempotente + assinado: inscrito→`confirmado`, cria/associa `atletas` por email, `chipNumero=null` RN-207, atualiza ∑ **reusando** `functions/src/eventos/agregarFinanceiro.ts`).
- **Superfície:** `functions/src/payments/*` (`createInscricaoCharge`, `handlePaymentWebhook`, `sandboxProvider`), `functions/src/eventos/validateCoupon.ts` (cupom é domínio de evento — **não** criar pasta `affiliation/`, afiliação foi cortada), `packages/core/src/checkout/{coupon,validateInscrito,types}.ts`, `firestore.rules` (`pedidos`, `inscritos` create-via-function).
- **Dep:** L1 (tipos), L0 (pricing p/ montar `amount`), **E04-slim S300-T1** (modelo de cupom), ADR-006 (interface `PaymentProvider` feita). Ordem interna: T2/validateInscrito antes de L3; T5←pedido/pricing; T6←T5.
- **Aceite (falsificável):**
  - `validateCoupon(eventoId, 'CORRIDAPERFEITA10')` → `{ valid: true, descontoPct: 10 }` (**sem** `afiliadoRef`); cupom inexistente → `{ valid: false }`; expirado → `{ valid: false }`.
  - pedido válido → Function cria `pedidos/{id}` + inscrito(s) `pendente` + `createCharge` do sandbox retorna `{ chargeId, status:'pending', pixCode? }`; falha do provider → **não** cria inscrição confirmada.
  - webhook aprovado → inscrito vira `confirmado` e ∑ `qtdInscritos`/`receitaConfirmada` sobem **uma vez**; **mesmo webhook reenviado → nada duplica** (idempotente por `chargeId`); atleta criado/associado por email; `chipNumero` permanece `null`.
  - inscrito criado tem os **três campos** independentes (`contatoEmergencia`, `regulamentoAceite`, `consentimentoLgpd`); `regulamentoAceite.versao` reflete a versão vigente recebida.
  - Rules: anônimo **não** escreve inscrito/pedido direto (só via Function); `createCharge` idempotente por `idempotencyKey` (RN-333).
- **Split de afiliado NÃO é montado** (corte); `PaymentProvider.splitRules` fica sem uso na V1.

---

## L5 · Ingresso digital + e-mail de marca + PDF (por inscrito do pedido) — FABLE + template

- **Tasks:** S1206-T1 (`issueTicket`: `qrToken` assinado opaco + `ingressoEmitidoEm` por inscrito, gerado na confirmação; `core/tickets/qrToken.ts` assina/verifica), S1206-T2 (subcoleção `inscritos/{id}/notificacoes/{tipo}` + helpers `hasSent`/`markSent` + Rules sem leitura pública), S1206-T3 (`EmailProvider` interface em `core` espelhando `PaymentProvider` + `sandboxEmailProvider` + disparo ao **responsável do pedido** listando inscritos, guardado por `notificacoes`), S1206-T4 (template HTML de marca com variáveis `{nome}`/`{evento}`/`{kit}`/`{modalidade}` + `renderTicketPdf` sob demanda a partir do mesmo `qrToken`).
- **Superfície:** `functions/src/tickets/*`, `functions/src/notifications/notificationLog.ts`, `functions/src/email/*` (+ `templates/confirmacaoPedido.ts`), `packages/core/src/{tickets,email}/*`, `firestore.rules` (`notificacoes`).
- **Dep:** L4 (S1203-T6 webhook confirmado é o ponto de disparo). Ordem interna: T1/T2 → T3 → T4.
- **Aceite (falsificável):**
  - pedido de 3 inscritos confirmado → 3 `qrToken` **distintos** + `ingressoEmitidoEm`; webhook reprocessado → tokens **não mudam** (idempotente); token adulterado → `verifyQrToken` rejeita.
  - disparo já registrado → `hasSent` = `true`, envio pulado; anônimo lê `notificacoes` → Rules **bloqueiam**.
  - pedido confirmado → `EmailProvider` sandbox recebe **um** envio ao responsável com lista de inscritos e variáveis preenchidas; webhook reprocessado → **nenhum** segundo e-mail.
  - `renderTicketPdf` produz PDF com o QR do inscrito **sem regerar** token.
- **Greenfield:** o template de marca (T4) **precisa de rodada de design** (sem Figma) — ver Decisão aberta #9. Fornecedor de e-mail concreto fica atrás da interface (ADR de e-mail pendente); V1 roda no sandbox.

---

## L6 (OPCIONAL / recomendo V1.1) · Portal público do organizador — OPUS

- **Tasks:** S1208-T1 (`tenants/{id}/portal` blocos ordenáveis + leitor SSR/ISR + gate + Rules), S1208-T2 (blocos: hub de eventos+agenda, fotos, blog, patrocinadores + `PortalRenderer`), S1208-T3 (captura de newsletter `tenants/{id}/newsletterLeads` + consentimento LGPD + Rules).
- **Dep:** L1 (leitor público). **Greenfield** (sem Figma), **Should**, depende do editor no painel (E04), **precisa rodada de design**.
- **Status:** **DEFERIDA p/ V1.1** por padrão (não é caminho crítico de vender). Se o Vitor puxar, entra como L6 e conta +3 tasks. Ver Decisão aberta #6.

---

## Sequência interna E12
`L0 (decisão + pricing) ∥ L1 (fundação) → L2 (páginas públicas + SEO) ∥ [L4 core-cupom/validate] → L3 (checkout UI) → L4 (cobrança + webhook) → L5 (ingresso/e-mail)`.
- L0 e L1 paralelizáveis (core puro vs scaffold/leitor).
- L2 depende só de L1 → roda cedo, em paralelo com o início de L4 (parte core: `validateCoupon`, `validateInscrito`).
- L3 (UI) precisa de L0 (pricing), L1 (steps) e das partes core de L4.
- L4 funções de cobrança (T5/T6) fecham depois da UI do Pagamento; L5 pendura no webhook de T6.

## Paralelismo entre épicos (Onda 2: E12 × E04-slim × E09-slim × E07-web × E06 × E11)
- **Telas isoladas:** E12 vive em `apps/landing/*` (Next.js), separado do `apps/painel` (Vite) dos outros épicos → **full paralelo de telas**. (Nota: ao contrário da Onda 1, aqui **não há dúvida Vite×Next** — `apps/landing` é genuinamente Next.js App Router; a decisão Vite foi só do painel.)
- **Barreira = `firestore.rules`** (compartilhado): E12 adiciona regras de leitura pública (L1), `pedidos`/`inscritos`-via-Function (L4), `notificacoes` (L5). Serializar via `.rules-mutex`; coordenar com E04/E09 que também tocam o arquivo na Onda 2.
- **Contrato E12↔E04 (dep dura):** E12 **lê** config de seções, campos SEO e **cupom** que o E04-slim **produz** no painel. Alinhar contratos (`getPublishedEvent`, shape do cupom) antes de fechar L2/L4.
- **Agregado financeiro:** E12 (S1203-T6) **reusa** `functions/src/eventos/agregarFinanceiro.ts` (E03 feito) e o `financeiro/current` por evento — **não duplicar** o trigger.

## Riscos / entidades compartilhadas
- **`pedidos/{pedidoId}` (ADR-011) nasce aqui** (não existe no repo) — nova coleção + Rules. **VERIFICADO pelo consolidador (2026-07-05): E09-slim NÃO define `pedidos`** (só `tenants/{tid}/{dadosBancarios,repasses,saldo}` e lê `financeiro/current`). Ownership de `pedidos` = E12, sem dupla definição.
- **Política de reembolso na V1 (decisão do consolidador):** S305/S306 foram para a Onda 3; a landing exibe a política padrão CDC (arrependimento 7d, Art. 49) como **conteúdo estático** na seção Info/FAQ — sem coleção de config nova nesta onda.
- **`atletas` global** — checkout cria/associa por email (S1203-T6); coleção já existe (WIKI §2).
- **DS/E01 sob SSR (verificado):** `Stepper`, `CardEvento`, `CardDesafio` **confirmados** em `packages/design-system/src/components/` (23 componentes: AppShell, Avatar, Badge, Breadcrumb, Button, CardDesafio, CardEvento, Chip, Divider, EmptyState, Input, Modal, PageHeader, Pagination, Popover, Sidebar, Skeleton, Stepper, SubNav, Table, Tabs, Toast). **`Banner Hero` e `Card de kit` NÃO existem** no DS — a varredura não achou nenhum componente Hero/kit. Precisam ser **criados no E01** (ou construídos como componentes locais da landing) **antes de L2 (S1201-T2)** e do Hero de S1201-T1. Confirmar também que componentes interativos (`Stepper`, `Input`) são `'use client'` compatíveis com RSC/SSR do Next. E01 está em fix (git status) → checar prontidão. Ver Decisão aberta #12.
- **PaymentProvider é interface + sandbox** (ADR-006) — funil ponta a ponta é testado no sandbox; Pix nativo/split real dependem do gateway concreto.

## Decisões em aberto (para o consolidador / Vitor)
1. **Taxa incorporada/não (Decisão 1):** aprovar flag `commercialTerms.taxaIncorporada` (default incorporada) + dono E16/E04; escopo por-tenant vs por-evento (recomendo por-tenant); mínimos por método — **não copiar Cheers** (definir ou adiar); percentual efetivo Leela (dado do termo).
2. **Parcelamento (Decisão 2):** `jurosAoMes = 0` vs `> 0` na V1 (recomendo 0); custo real depende do **gateway concreto (ADR-006 pendente)**.
3. **Frete/retirada (Decisão 3):** confirmar **retirada-only V1** (recomendado; sem etapa de entrega no stepper). Frete V1.1.
4. **Modelo de cupom — RESOLVIDO (consolidador, 2026-07-05): shape canônico é o do E04-slim S300-T1**, que roda ANTES de E12-L4 na trilha Fable: `eventos/{id}/cupons/{id}` com `codigo` (único por evento), `tipo:'percentual'|'valor'`, `valor`, `tetoDesconto?` (cap em R$ p/ percentual), `validadeAte?`, `usosMax?`, `usosFeitos` (Function-only — **E12 incrementa no webhook**, E04 nunca). Sem `afiliadoId`. E12 consome via `validateCoupon` server-side; não define contrato próprio.
5. **Página de clube (S1202):** sem afiliação, o bloco "eventos que o clube promove" (RN-125) fica sem fonte (`parcerias/evento_afiliado` não populado). **Recomendo cortar o bloco na V1** (ou "em breve"); manter hero/bio/KPIs/desafios públicos/CTA. Confirmar.
6. **S1208 Portal público (L6):** **recomendo DEFERIR p/ V1.1** (Should + greenfield + rodada de design + editor no E04). Confirmar se entra na Onda 2.
7. **Domínio público `{leela-domain}` TBD** — bloqueia canonical/sitemap/QR definitivos; placeholder até o Vitor fixar (**não** `be-hero.com.br`). Ação externa do Vitor.
8. **Fornecedor de pagamento (ADR-006 concreto)** pendente — Pix nativo, split real e **custo de parcelamento** dependem dele. V1 no sandbox.
9. **Fornecedor + template de e-mail (ADR de e-mail, S1206):** `EmailProvider` interface + sandbox construídos; **entregabilidade real bloqueada** até a ADR; **template de marca (T4) precisa de rodada de design**.
10. **`pedidos` (ADR-011) — RESOLVIDO (consolidador, 2026-07-05):** ownership é do E12 (S1203-T5). E09-slim verificado — não define `pedidos` nem toca suas Rules.
11. **firestore.rules compartilhado** — serializar edições E12 (L1/L4/L5) via `.rules-mutex`; coordenar com E04/E09.
12. **Gap de DS — RESOLVIDO (consolidador, 2026-07-05): criar `BannerHero` e `CardKit` no DS (E01)** como **primeiro commit de E12-L2** (sob `.index-mutex` no barrel), respeitando `no-hardcoded-tokens` e compatíveis com SSR/RSC (`'use client'` onde interativo). Proibido componente local da landing com token hardcoded. Checar prontidão do E01 (em fix no git) antes de abrir L2.
