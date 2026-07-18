# DECISOES-NECESSARIAS · Nós de decisão desta trilha (aguardam o Vitor)

> PROPOSTA revisável. Cada nó: contexto + recomendação fundamentada (lente CTO Fowler/DHH/Kleppmann + UX Norman) + impacto. Não decido no seu lugar — surfaço com recomendação.

---

## 🔴 D1 · `OVERLAP-FABLE-ONDA2` — Fable A/B abrem a Onda 2 ou enriquecem a Onda 1? (OBRIGATÓRIO)

**Contexto.** As frentes Fable **A** (modelo pedido/pagamento) e **B** (estorno) cruzam E12 (checkout) e E04 (vendas) da Onda 2. O ponto físico de fricção é a coleção **`pedidos/{id}`**, que ainda não existe **no código** — mas cujo MODELO **você já travou**: o **ADR-011** (`leela-specs/03-canon/adr/ADR-pedido-em-grupo.md`, ✅ decidido 2026-07) define **pedido em grupo** (1 responsável/pagador, N inscritos, pagamento único, **estorno/cancelamento POR INSCRITO**, escrita de estado financeiro só por Function, `inscritos` com `pedidoRef`+`ehResponsavel`). Dois consumidores querem a coleção: o slide-in rico de Inscritos (Onda 1, LÊ) e o `createInscricaoCharge` do checkout (Onda 2, ESCREVE). Se nascer duas vezes, viram dois modelos do mesmo agregado de dinheiro — e a segunda violaria um ADR ratificado (a lição L-001 é exatamente essa: decisão sem gate deriva).

**Recomendação (CTO).** **Implementar o ADR-011 UMA vez, na trilha Fable (Frente A), com gate `adr-conformance`** — nem "abre a Onda 2 inteira", nem "só enriquece a Onda 1":
- Fable A entrega o **enriquecimento da Onda 1 agora** (slide-in consome read-only) **e** o **kernel que a Onda 2 escreve depois** (E12-L4 só adiciona o produtor de escrita, sem redefinir a coleção — o `V1-CHECKLIST` já agendava `S1203-T5` citando o mesmo ADR-011).
- Fable B (estorno) implementa o `refund` que **já existe na interface** `PaymentProvider` (ADR-006), **por inscrito** (ADR-011) — E04-L6 e a futura máquina completa de reembolso (E09-S904) reusam, sem reimplementar. Bônus jurídico: a execução de reembolso é load-bearing (CDC art. 49); o `KICKOFF-BUILD.md` já recomendava antecipar essa fatia.
- Razão: Kleppmann (o dado do pedido é o que dura; um agregado só); Fowler (narrow-waist reusável, reversível); DHH (escrever o modelo que já queríamos, uma vez). E L-001: como o modelo JÁ está decidido, o que se despacha é implementação + conformidade, não re-decisão — a consulta Kleppmann na Frente A revisa denorm × join e fronteiras transacionais.

**Impacto.** Adiciona a dependência `FABLE-A → E12-L4` e `FABLE-A → S203-T3`. **O que você ratifica aqui é o SEQUENCIAMENTO** (kernel na Frente A agora), não o modelo (esse já é seu, ADR-011). **Se você preferir** adiar A/B inteiros para dentro da Onda 2 (não enriquecer a Onda 1 agora), o slide-in de Inscritos segue com EmptyState honesto por mais tempo — perde-se o ganho rápido na dor #1 (inadimplência visível, candidata P5) e o de-risco antecipado do checkout. **Recomendo a opção do kernel.**

---

## 🟡 D2 · `GATEWAY-CONCRETO` (ADR-006) — qual gateway, quando integrar?

**Contexto.** O ADR-006 tem duas metades: a **interface `PaymentProvider`** (`createCharge`/`refund`/`handleWebhook`/`splitRules`/`getPayout`) está **decidida e construída** (S000-4-T2 ✅); o **fornecedor concreto** é o que está ADIADO por você (2026-07-05) — V1 roda 100% no sandbox/mock; `E04-PAY-T2` fica em espera. Métodos V1 travados = **cartão + PIX, sem boleto**. Parcelamento pela tabela por parcela (2x-12x) configurável pelo platform_admin. Falta só **escolher o fornecedor** e correr o KYC (lead time de negócio, não de código).

**Recomendação (CTO).** **Asaas** para a V1 (PIX + cartão parcelado nativos, split, subcontas, saldo/saque que espelha o UX de E09-slim). Alternativa **Pagar.me v5** para split/payout real pós-V1. Como a V1 mantém repasse como **registro** (mock), a escolha prioriza a **cobrança** (`createCharge`), não o payout. O adapter roda em sandbox até fechar; o executor valida a API atual (split/PIX/assinatura de webhook) contra a doc oficial antes de codar.

**Impacto.** Não bloqueia código (sandbox). Bloqueia só o go-live de cobrança real. Correr o KYC em paralelo destrava `E04-PAY-T2` sem custo de engenharia agora.

---

## 🟡 D3 · `COMUNICAR-POR-EVENTO` — o middle-action "Comunicar" do card Próximo evento

**Contexto.** (Já em `DECISOES-ABERTAS §Para-o-final`.) O mockup do card "Próximo evento" traz `Ver inscritos · Comunicar · Check-in`. Hoje só existe comunicação no escopo de **clube** (`/clubes/:slug/comunicacao`), não de **evento**. A impl atual mantém `Ver inscritos · Check-in · Gerenciar` (divergência consciente).

**Recomendação (CTO/UX).** **Sim, ter comunicação por evento na V1** — e esta trilha já a viabiliza: **E06 (Comunicação do evento, só Campanhas)** está na Onda 2 e **FABLE-G** entrega o log de comunicação. Quando E06-L3 adiciona a aba "Comunicação" na sub-nav do evento, o middle-action vira "Comunicar" apontando para ela e a ordem alinha ao mockup. Decisão a tomar: **confirmar que E06 campanhas entra na V1** (recomendo sim — serve a dor "comunicação fragmentada" do Organizador, JTBD H1). Se ficar V1.5, o card mantém "Gerenciar" até lá.

**Impacto.** Confirma o faseamento de E06 (V1) e destrava o alinhamento do card ao mockup. Nenhuma tela nova inventada até a decisão.

---

## 🟢 D4 · `ONDA2-NOME` — corrigir a nomenclatura desatualizada no `ROADMAP.md §5`

**Contexto.** `ROADMAP.md §5` define Onda 2 = "Vendas ponta a ponta (E04+E12+PaymentProvider)" — sentido estreito e desatualizado. O `V1-CHECKLIST.md §Onda 2 · Vender` (revisado 2026-07-05) já é o superconjunto reconciliado (E04-slim + E12 + E09-slim + E07-web + E06 + transversais; E08 adiado). Ver `ROADMAP-next.md §1`.

**Recomendação.** **Edição documental** (não de escopo): atualizar `ROADMAP.md §5` para o superconjunto do V1-CHECKLIST. É correção de fonte-da-verdade, sem mudar o que se constrói. **Recomendo aprovar** — remove a ambiguidade que gerou os dois sentidos conflitantes.

**Impacto.** Só documental. Um passo de promoção aplica quando você aprovar o plano.

---

## 🟢 D5 · `RESP-MOBILE-MUST` — confirmar o escopo do passe mobile

**Contexto.** Você já decidiu (emenda ao PRD): alvo = **mobile real 390×844**, 1 sweep, ordem M1→M3→M5→M4→M2/M6/M7 (dimensionado pelo QA-2, causa-raiz única M1). Fidelidade ao mockup segue em desktop; mobile segue o DS (mockup não tem referência mobile).

**Recomendação.** Executar como está (Must, Opus, gate Norman + gate visual 390×844). Só confirmo o faseamento: **RESP-MOBILE é V1** (o Organizador opera no local pelo celular — JTBD proposto P4). **Recomendo antes ou em paralelo à Onda 2** (as telas da Onda 2 já nascem responsivas; varrer o desktop-only antes evita retrabalho, como você mesmo dimensionou).

**Impacto.** Confirma prioridade. Se preferir Onda 2 primeiro, o passe mobile cobre também as telas novas depois (custo maior).

---

## 🟢 D6 · `JTBD-EDITS` — ratificar as 5 linhas propostas a `jobs-to-be-done.md`

**Contexto.** O planejamento revelou **5** JTBD ausentes (P5 **inadimplência visível — a sua dor #1** · P1 estorno com dignidade · P2 validar ingresso sem fraude · P3 conferir estoque por tamanho · P4 operar no celular no dia da prova) — detalhados em `JTBD-TRACE.md §2`, cada um com seção + **ponto de inserção fixo** + linha exata (ratificável verbatim, inclusive parcialmente). **Não** editei o doc canônico. *(r2: P5 entrou porque a dor #1 vinha sendo usada como âncora de FABLE-A/RESP-M5 sem existir como linha no doc — a bidirecionalidade exigia propô-la, não fingi-la.)*

**Recomendação.** **Aprovar P1-P5** — cada um serve uma story real desta trilha e fecha uma lacuna entre as personas (que já têm as dores) e a tabela de JTBD (que não as nomeia). São aditivos, não removem nada. Se for aprovar só um, aprove **P5** (é o job que FABLE-A e o banner de pendências do S203 servem).

**Impacto.** Um passo posterior aplica as linhas aprovadas a `jobs-to-be-done.md §04.1` na ordem declarada. Até lá as stories citam o JTBD mais próximo existente (rotulado) — não bloqueia.

---

## ⚪ D7 · `QA2-REPORT-CORROMPIDO` — reconstituir o QA-LIVE-2-REPORT.md

**Contexto.** `outputs/leela-build-2d6ee98d/QA-LIVE-2-REPORT.md` está **corrompido no disco** — arquivo zerado, só bytes NUL (verificado por dump binário na r2; mesmo padrão do object store do git corrompido). O dimensionamento dos 7 MAJOR (M1-M7, causa-raiz única) foi recuperado da síntese fiel no `HANDOFF` e no `V1-CHECKLIST` (que carregam a ordem de fix e as evidências `shots-qa2/`).

**Recomendação.** Antes de despachar RESP-MOBILE, **reconstituir o report** a partir dos 36 screenshots em `shots-qa2/` (ou reconfirmar via novo passe Playwright 390×844) — para o executor ter o insumo visual, não só a síntese textual. Baixo esforço, evita despachar às cegas.

**Impacto.** Não bloqueia o plano (a síntese é suficiente para dimensionar), mas o report vivo é o insumo direto do lote. Recomendo reconstituir no início da Wave B.

---

## Resumo — o que aguarda você

| Nó | Tipo | Recomendação | Bloqueia? |
|---|---|---|---|
| **D1 Overlap Fable×Onda2** | sequenciamento (modelo já é seu: ADR-011) | implementar o kernel `pedidos` na Frente A (uma vez, c/ gate adr-conformance) | destrava sequência ótima |
| D2 Gateway concreto | fornecedor/negócio | Asaas V1 (correr KYC em paralelo) | não (sandbox) |
| D3 Comunicar-por-evento | escopo/faseamento | E06 campanhas na V1 → aba Comunicação | não |
| D4 Nome da Onda 2 | documental | corrigir ROADMAP §5 p/ superconjunto | não |
| D5 RESP-MOBILE prioridade | faseamento | Must V1, antes/∥ Onda 2 | não |
| D6 Edições JTBD | doc de JTBD | ratificar P1-**P5** (mínimo: P5, a dor #1) | não |
| D7 QA-2 report corrompido | insumo | reconstituir no início da Wave B | não |
