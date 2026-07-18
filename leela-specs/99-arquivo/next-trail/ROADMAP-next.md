# ROADMAP-next · Delta da próxima trilha da Leela

> PROPOSTA revisável (não promovida). Não sobrescreve `ROADMAP.md`/`V1-CHECKLIST.md`.
> Autor: **sf-cto** (DNA Fowler/DHH/Kleppmann) consultando **sf-ux-engineer** (JTBD, autoridade Norman/Sierra/Zhuo).
> Trace: `leela-plan-nexttrail` · Parent build: `leela-build-2d6ee98d` · Data: 2026-07-10.
> Convenções herdadas de `ROADMAP.md §7`: `LEELA-E##` épico · `LEELA-S###`/prefixo temático story · `-T#` task = 1 PR. MoSCoW por horizonte. T-shirt: XS <0.5d · S 0.5-1d · M 1-2d · L 2-4d · XL módulo. Status: ✅ 🔄 📋 🧊 🚫.

---

## 0 · O que esta trilha entrega (4 frentes)

| Frente | Nome | Natureza | Roteamento | MoSCoW | Fase |
|---|---|---|---|---|---|
| **F1** | Trilha Fable — backend crítico (A-G) | modelo/pagamento/segurança/rules | **Fable** | Must | V1 (vender) |
| **F2** | RESP-MOBILE — passe mobile real 390×844 | UI/mecânico (1 sweep) | **Opus** | Must (escopo travado pelo Vitor) | V1 |
| **F3** | Onda 2 — vender ponta a ponta (reconciliada) | telas + Functions + rules | Opus + Fable | Must | V1 (spine) / V1.5 (engajar) |
| **F4** | Consolidações — dívida técnica/DS | DS/infra | Opus | Should/Could | transversal |

O alvo primário é o **JOB** (L-004): cada story em `STORIES-next.md` cita o JTBD de `jobs-to-be-done.md` que serve. A priorização abaixo pesa JTBD × horizonte, não ordem de tela.

---

## 1 · Reconciliação de "Onda 2" (exigência do brief)

Existiam **dois sentidos conflitantes**, mais uma terceira definição já revisada:

| Fonte | O que chama de "Onda 2" | Veredito |
|---|---|---|
| `ROADMAP.md §5` | "Vendas ponta a ponta" = E04 Config&Vendas + E12 Landing/checkout + PaymentProvider | **Sentido ESTREITO** (só a espinha de venda) — desatualizado |
| `HANDOFF` (retomada) | "features novas" = E04 (vendas/cupons/equipe/gateway) + E06 (comunicação) + E08 (promotores) = as abas que faltam na sub-nav do evento | **Sentido de SUPERFÍCIE** (as abas novas), taquigrafia; inclui E08 que já foi adiado |
| `V1-CHECKLIST.md §"Onda 2 · Vender"` (revisado 2026-07-05) | E04-slim + E12 + E09-slim + E07-web + E06 + transversais (coleta E11 + backend do desafio); **E08 adiado, afiliação cortada** | **Sentido CANÔNICO já reconciliado** (superconjunto real, decisões-escopo 2026-07-04 aplicadas) |

**Definição única adotada (esta trilha):**

> **Onda 2 = "Vender ponta a ponta + as features que fecham o ciclo do evento"** = o escopo de `V1-CHECKLIST.md §Onda 2 · Vender`, a saber:
> - **Núcleo de venda (o sentido estreito do ROADMAP §5):** E04-slim (S300 vendas/lotes/cupons + S304 equipe + PaymentProvider) + E12 (landing + checkout público sandbox) + E09-slim (repasses do organizador).
> - **Superfície nova (o sentido do HANDOFF, sem E08):** as abas que faltam na sub-nav do evento — **Página de vendas** (E04-L3), **Configurações** (E04-L5), **Comunicação** (E06-L3). E08 (Promotores) **fora** — dependia de afiliação, cortada.
> - **Robustez + coleta:** E07-web (404/500/403) + transversais (rollup diário E11-S821 + backend do desafio S1307/S1308).

O `ROADMAP.md §5` deve ser corrigido de "Onda 2 = E04+E12+PaymentProvider" para o superconjunto acima. Ver `DECISOES-NECESSARIAS.md` (nó ONDA2-NOME) — é edição documental, não de escopo.

**Sub-abas que faltam na sub-nav do evento** (`apps/painel/src/routes/eventos/_lib/subnav.ts`), ordem canônica de acréscimo **E04 → E06** (cada épico só acrescenta a sua, sem reordenar): `Página de vendas` (E04-L3) · `Configurações` (E04-L5) · `Comunicação` (E06-L3). Hoje o evento tem **5 abas** (fonte: `subnav.ts`, verificado): Visão geral, Inscritos, Kits, Entrega, Financeiro. ("Hub" NÃO é aba do evento — é a lista `/eventos`.)

---

## 2 · Overlap Fable A/B × Onda 2 (a decisão central do CTO)

O brief Fable diz: as frentes **A** (modelo pedido/pagamento no Inscrito) e **B** (estorno) cruzam **E12 (checkout)** e **E04 (vendas)**. A pergunta do Vitor: *"abre parte da Onda 2 OU fica como enriquecimento da Onda 1 das telas já feitas?"*

**Análise (lente Kleppmann — dados sobrevivem ao código; consistency é decisão type-1):**
O ponto de fricção é a coleção **`pedidos/{id}`**. Ela **não existe no código**, mas o MODELO dela **já está decidido**: o **ADR-011** (`leela-specs/03-canon/adr/ADR-pedido-em-grupo.md`, ✅ travado pelo Vitor, 2026-07) define **pedido em grupo** — 1 responsável/pagador, N inscritos com titular próprio, pagamento único por pedido, **reembolso/cancelamento POR INSCRITO** (nunca sobre o pedido inteiro), campos `responsavel`/`inscritoRefs[]`/`pagamentoRef`/`valorTotal`, escrita de estado financeiro **só por Function**, e `inscritos` ganhando `pedidoRef`+`ehResponsavel`. Dois consumidores a querem:
1. **Onda 1 (enriquecimento):** o slide-in rico de Inscritos (`LEELA-S203-T3`) precisa LER valor/forma/parcelamento/estorno de um pedido — hoje `Inscrito` é projeção fina e mostra EmptyState honesto.
2. **Onda 2 (checkout):** `E12-L4 / S1203-T5 createInscricaoCharge` precisa ESCREVER `pedidos/{id}` no fluxo de compra pública.

Se `pedidos` nascer duas vezes (uma no Fable, outra no E12), teremos dois modelos do MESMO agregado de dinheiro — exatamente o anti-pattern que o Kleppmann rejeita (o dado do pedido é o que dura; o modelo de consistência dele é milionário).

**Recomendação do CTO (a ratificar pelo Vitor — nó `OVERLAP-FABLE-ONDA2` em `DECISOES-NECESSARIAS.md`):**

> **Fable A abre o KERNEL de dados da Onda 2, não a Onda 2 inteira — implementando o ADR-011, não redecidindo-o.** Construir `pedidos/{id}` **conforme o ADR-011** + o link `Inscrito`↔pedido (`pedidoRef`/`ehResponsavel`) **UMA vez, na trilha Fable (Frente A)**, como fundação canônica (o `V1-CHECKLIST` já a agenda em `S1203-T5` citando o mesmo ADR). Efeito:
> - **Onda 1 colhe imediatamente:** o slide-in de Inscritos (S203-T3) consome o kernel **read-only** → enriquecimento da Onda 1 entregue já, sem esperar o checkout público.
> - **Onda 2 escreve o mesmo kernel:** `E12-L4` cria `pedidos` via `createInscricaoCharge` sem redefinir o modelo — só adiciona o produtor de escrita (checkout).
> - **Fable B (estorno)** é genuinamente enriquecimento da Onda 1 (ação de reembolso numa tela já feita), mas **compartilha o seam de gateway** com `E04-L6 PaymentProvider` → a interface de refund **já existe** em `PaymentProvider` (ADR-006: interface decidida com `refund`; o fornecedor concreto é a pendência — nó D2), Fable B implementa contra o sandbox, e o E04-L6 reusa. Pelo ADR-011, o estorno opera **por inscrito** (parcial dentro do pedido em grupo) — critério de aceite de B. Reforço jurídico: a execução de reembolso é load-bearing (CDC art. 49; `KICKOFF-BUILD.md` já recomendava puxar a fatia S904 para cedo) — B antecipa exatamente essa fatia.
>
> Ou seja: **nem "abre a Onda 2", nem "só enriquece a Onda 1" — Fable A/B constroem o kernel compartilhado que ambos consomem, entregando o enriquecimento da Onda 1 agora e de-riscando a Onda 2 depois.** Fowler: narrow-waist reusável, reversível. DHH: escrever o modelo que a gente queria que já existisse, uma vez. L-001: decisão ratificada exige gate — **FABLE-A carrega gate `adr-conformance` contra o ADR-011**; a consulta Kleppmann vira revisão de IMPLEMENTAÇÃO (denorm × join, fronteiras transacionais), não re-decisão do modelo.

Dependência dura resultante: `LEELA-FABLE-A` → `LEELA-S203-T3` (Onda 1) **e** `LEELA-FABLE-A` → `E12-L4/S1203-T5` (Onda 2).

---

## 3 · F1 · Trilha Fable — mapa de épicos e delta

Todas as frentes enriquecem **E03 (Operação do Evento)** fechando as dependências honestas (EmptyState) das 6 telas; A/B cruzam E12/E04 conforme §2. Roteamento **Fable** (pagamento/segurança/rules/core), review antagonista em todas (reusável/sensível/segurança).

| Story | Frente | Enriquece | Épico | MoSCoW | T-shirt | Depende de | Review antag. |
|---|---|---|---|---|---|---|---|
| `LEELA-FABLE-A` | A · Modelo pedido/pagamento no Inscrito (implementa **ADR-011**: kernel `pedidos` + `pedidoRef`/`ehResponsavel`) | slide-in S203-T3, Financeiro S207, coluna valor | E03 (kernel p/ E12) | **Must** | **L** | S203-T1 ✅, S1600 ✅ (Rules), ADR-011 ✅ (decidido) | **Sim** (dinheiro/reusável) + gate adr-conformance |
| `LEELA-FABLE-B` | B · Function de estorno idempotente, **por inscrito** (ADR-011) — ≙ fatia de `E09-S904` (execução; política = E04-S305) | ação "Reembolsar" S203, cancelamento c/ histórico | E03 (seam E04-L6) | **Must** | **L** | FABLE-A, `PaymentProvider` ✅ (interface c/ `refund`, ADR-006; fornecedor pendente = D2) | **Sim** (dinheiro/idempotência) |
| `LEELA-FABLE-C` | C · QR server-side (ENCOLHIDA — validação de assinatura) — ≙ recorte de `S208-T3` (+ carimbo `checkinEm` de S208-T1 p/ rejeitar "já usado") | check-in seguro Entrega/Balcão (S204) | E03 | **Must** | **M** | firebase-admin ✅ (escritas já provadas) | **Sim** (segurança) |
| `LEELA-FABLE-D` | D · Estoque por tamanho + movimentações — ≙ `S209` (map `tamanhos` RN-223) + `S210` (aprovisionamento/Σ) | EstoqueView (S205-T4), dor "kit errado" | E03 | **Should** | **L** | FABLE-A (`[reg]`), FABLE-E | **Sim** (reusável) |
| `LEELA-FABLE-E` | E · Chave estável Kit↔enum (integridade) | remove ponte `kitCasa` do Estoque | E03 | **Should** | **XS** | S205 ✅ (seed) | Não (mecânico) |
| `LEELA-FABLE-F` | F · Cronograma do evento + faixa de chip | banner "Entrega ativa · Dia N", alertas balcão | E03 | **Should** | **M** | S204 ✅ | **Sim** (Rules novas no `Evento`) |
| `LEELA-FABLE-G` | G · Logs de comunicação + histórico do registro | abas Comunicação/Histórico do slide-in S203 | E03 (overlap E06 + `S1206-T2`) | **Should** | **M** | FABLE-A | **Sim** (reusável/PII) |

**Sequência interna Fable** (do brief, refinada): `A → B → C` serializados **por disciplina de review de dinheiro/segurança** (C não depende de B por dado — só firebase-admin ✅) ∥ `E → D` ∥ `F` ∥ `G` podem paralelizar por área após A. Consultar mind-clone **Kleppmann** no A sobre a **implementação** do ADR-011 (denorm × join, fronteiras transacionais) — o modelo em si já está decidido.

**Nota de escopo (fidelidade ao estado real):** Frente C está **encolhida** — o lote firebase-admin (`8e6badd`) já provou `criarEvento`/`vincularChip`/`registrarEntrega` no emulator; sobra só a validação de assinatura do `qrToken` (RN-221/222). Não replanejar as escritas já destravadas.

**De-para com IDs canônicos (não re-modelar o que os épicos já quebram):** `FABLE-A` ≙ implementação do **ADR-011** · `FABLE-B` ≙ fatia de **LEELA-E09-S904** (execução do estorno disparada pelo organizador, RN-337; a máquina completa RN-341 + fila + política S305 seguem na Onda 2/E09) · `FABLE-C` ≙ recorte de **LEELA-S208** (T3 validação de assinatura + carimbo T1; scanner T4 fica com S208) · `FABLE-D` ≙ **LEELA-S209 + LEELA-S210** (`epics/LEELA-E03` já traz aceites Given/When/Then e tasks — o executor os herda). Os IDs temáticos `LEELA-FABLE-*` são o rótulo do LOTE; o aceite canônico vive nos épicos.

---

## 4 · F2 · RESP-MOBILE — passe mobile real (1 sweep)

Insumo obrigatório: os **7 MAJOR** do `QA-LIVE-2-REPORT.md` — **causa-raiz única = shell drawer M1** (RootShell/Sidebar sem breakpoint; documento estoura horizontal), cascateando nos demais. Desktop 1440 = **0 defeito** (não tocar). UI nova já nasce responsiva (L-004) → o passe varre **só o desktop-only**. **Não são regressões** — é o escopo mobile-real decidido pelo Vitor (emenda ao PRD).

Ordem de fix dimensionada no HANDOFF: **M1 → M3 → M5 → M4 → M2/M6/M7**. Uma story por grupo de componente; M1 destrava o refluxo sozinho.

| Story | Alvo (MAJOR) | Componente(s) | Épico | MoSCoW | T-shirt | Depende de |
|---|---|---|---|---|---|---|
| `LEELA-RESP-M1` | M1 · shell/drawer + remove offset fixo do `main` | RootShell/Sidebar (todas as rotas) + breakpoints tokenizados no DS | E01 | **Must** | **M** | — (destrava M2-M7) |
| `LEELA-RESP-M3` | M3 · KpiRow grid→1col | KpiRow (5 rotas) | E01 | **Must** | **S** | M1 |
| `LEELA-RESP-M5` | M5 · Table card/scroll mobile | Table (inscritos/membros/tenants/macro) | E01 | **Must** | **M** | M1 |
| `LEELA-RESP-M4` | M4 · Header + TabNav (truncamento + overflow das abas) | Header + TabNav/SubNav (drills) | E01 | **Must** | **S** | M1 |
| `LEELA-RESP-M2` | M2 · Toolbar/CTA | Toolbar (⌘K) | E01 | **Should** | **XS** | M1 |
| `LEELA-RESP-M6` | M6 · EventRow | EventRow | E01 | **Should** | **XS** | M1 |
| `LEELA-RESP-M7` | M7 · prose/intro | blocos prose | E01 | **Should** | **XS** | M1 |

Primeira task do lote = **emenda ao PRD-01 + handoff-claude-design** (desktop-first → responsivo com alvo mobile) + **projeto mobile 390×844 no Playwright** nos gates visuais daqui em diante (fecha a promessa do handoff §3.5 nunca implementada). Fidelidade ao mockup segue valendo **em desktop**; mobile segue padrões do DS (mockup não tem referência mobile).

Gate sf-ux-engineer (Norman): affordance do drawer visível, feedback <100ms na abertura, constraint que impede scroll horizontal, `prefers-reduced-motion` respeitado no drawer.

---

## 5 · F3 · Onda 2 — mapa reconciliado (referencia IDs existentes, NÃO os duplica)

As stories da Onda 2 **já existem** em `V1-CHECKLIST.md` como `[ ]`. Esta trilha **não as re-planeja**; o delta é: (a) reconciliar o nome (§1), (b) fixar a dependência do kernel `pedidos` vindo de FABLE-A (§2), (c) **ancorar cada story a um JTBD** (o valor-add — honra G-003; hoje as stories da Onda 2 não citam JTBD). Detalhe story-a-story com JTBD em `STORIES-next.md`; tasks já quebradas nos briefs `onda2-*`.

| Épico (recorte) | Lotes | Superfície | MoSCoW | T-shirt | Depende de | Fase |
|---|---|---|---|---|---|---|
| **E04-slim** Config & Vendas | L1-L2 (Fable) · L3 (Opus) · L4-L5 (equipe) · L6 (PaymentProvider) | painel `routes/eventos/[slug]/{pagina-vendas,configuracoes}` | Must | XL | S200 ✅, S205 ✅, S1600 ✅ | V1 |
| **E12** Landing + checkout | L0 pricing · L1 fundação · L2 páginas+SEO · L3 checkout UI · L4 cobrança/webhook · L5 ingresso/email | `apps/landing` (Next) | Must | XL | E04-L1/L6, **FABLE-A** (kernel `pedidos`), E01 (BannerHero/CardKit novos) | V1 |
| **E09-slim** Repasses do organizador | L1-L4 | painel `routes/.../financeiro` | Must | L | S207 ✅, S1602 ✅ (termos) | V1 |
| **E07-web** Estados de sistema | T1-T6 (404/500/403) | painel + landing | Should | L | E01, E04-L4 (papéis p/ 403) | V1 |
| **E06** Comunicação do evento (só Campanhas) | L1-L3 | painel `routes/.../comunicacao` | Should | L | S108/S109 ✅ (extração A/B), **FABLE-G** (logs) | V1 |
| **Transversais** coleta E11 + backend desafio | S821 (rollup) · S1307/S1308 (registros/participação) · higienes | functions | Should | M | S600 ✅, S105 ✅ | S821 V1 (funil) · S1307/S1308 **V1.5** (engajar) |
| ~~E08 Promotores~~ | — | — | **Won't (V1)** | — | dependia de afiliação (cortada) | adiado |

**Delta de dependência vs. `V1-CHECKLIST.md`:** adicionar `FABLE-A` como pré-requisito de `E12-L4/S1203-T5` (o `pedidos` nasce em FABLE-A, não no E12) e de `S203-T3`. Adicionar `FABLE-G` como fonte dos logs que a aba Comunicação do slide-in consome (overlap E06) **e** do log de envio que `S1206-T2` (`hasSent`/`markSent`, E12-L5) usa — é o MESMO agregado de log de comunicação; não nascer duas vezes. Tudo o mais das dependências dos briefs `onda2-*` permanece.

**Faseamento V1/V1.5:** a espinha de venda (E04/E12/E09-slim/E07-web/E06 campanhas + E11 coleta) = **V1 (vender)**. O backend do desafio (S1307 registros, S1308 participação/board) = **V1.5 (engajar)** — dimensão Heroica, não bloqueia vender.

---

## 6 · F4 · Consolidações (dívida técnica / DS · baixa urgência)

| Story | Item | Origem | Épico | MoSCoW | T-shirt | Review |
|---|---|---|---|---|---|---|
| `LEELA-CONS-1` | KpiCard/StatTile canônico no DS + migrar 4 cópias | G-004 (eventos/clubes/plataforma/EstoqueView) | E01 | **Should** | **S** | **Sim** (reusável) |
| `LEELA-CONS-2` | Teste flaky `EventoLayout.test.tsx` (timeout na suíte cheia 8GB) | HANDOFF §C | E03 | Should | XS | Não |
| `LEELA-CONS-3` | Mutations de plataforma (`useTenantActions`/`useSaveCommercialTerms`) → useMutation (parked) | HANDOFF §C | E16 | Could | S | Não |
| `LEELA-CONS-4` | Backend-dep pequenos: nome do owner do tenant (join `profissionais/{ownerUid}`) · nome canônico do evento na parceria (denorm.) · 5º segmento de comunicado | HANDOFF §C | E16/E05 | Could | S | Não |
| `LEELA-CONS-5` | Adotar G-001..G-004 nas DEFINIÇÕES de empresa/squad (não improvisar de novo) | ledger `07-org-scope-gaps.md` | (meta org) | Should | S | — |
| `LEELA-CONS-6` | 6 bugs de componente do showroom + mutations UX-DADOS lote 2 (financeiro/balcão onSnapshot, kits, Clubes, Plataforma) | HANDOFF, V1-CHECKLIST | E01/E03 | Could | M | parcial |

`LEELA-CONS-5` é meta-organizacional (adotar as correções do ledger nas definições `~/businesses/software-forge/*` e `~/squads/magic-ds/*`): **G-001** baseline de primitivos DS (checklist de completeness) · **G-002** gate de crítica de design no `sf-ux-engineer` (veto, antes do gate de fidelidade) · **G-003** injeção de JTBD como convenção do enriched brief de UI · **G-004** KpiCard no DS (executado por CONS-1).

---

## 7 · Ondas de execução propostas (sequenciamento por dependência)

```
Wave A · Fable kernel (reset da cota Fable)            ← backend crítico, ROTA FABLE
   FABLE-A (pedido/pagamento, kernel `pedidos` ADR-011)  ── linchpin
        ├─► FABLE-B (estorno)                              (seam gateway ↔ E04-L6)
        ├─► LEELA-S203-T3 (slide-in rico · Onda 1 colhe já)
        └─► [alimenta E12-L4 na Wave C]
   FABLE-C (QR sig) · FABLE-F (cronograma)  ∥ independentes de A (deps: firebase-admin ✅ / S204 ✅)
   FABLE-E→D (kit/estoque) · FABLE-G (logs)  ∥ após A (D cruza [reg]; G ancora no pedido)

Wave B · RESP-MOBILE (Opus, sobre telas estáveis)     ← 1 sweep, independente de dados
   M1 (shell/drawer) ─► M3 · M5 · M4 ─► M2 · M6 · M7

Wave C · Onda 2 · vender ponta a ponta                ← Opus (UI) + Fable (Functions/rules)
   E04-slim [L1→L2→L3 ∥ L4→L5 ∥ L6]
   E12 [L0 ∥ L1 → L2 ∥ (core L4) → L3 → L4(cobrança, consome kernel FABLE-A) → L5]
   E09-slim [L1→L2→L3→L4]  ·  E07-web  ·  E06 [L1→L2→L3, consome FABLE-G]
   transversais: S821 (V1) · S1307/S1308 (V1.5)

Wave D · Consolidações (interleave, baixa urgência)   ← CONS-1..6, Should/Could
```

**Grafo textual de dependências (delta desta trilha):**

```
firebase-admin ✅ ─► FABLE-C          S204 ✅ ─► FABLE-F (cronograma/chip)
S203-T1 ✅ ─► FABLE-A ─┬─► FABLE-B ──► (E04-L6 reusa refund seam)
   (ADR-011 ✅ = modelo) ├─► S203-T3 (Onda 1 enrichment)
                       ├─► FABLE-D (tamanhos S209) ◄─ FABLE-E
                       ├─► FABLE-G ─► E06-L3 (aba Comunicação) · S1206-T2 (log envio)
                       └─► E12-L4 / S1203-T5 (Onda 2 escreve `pedidos`)
E01 ─► RESP-M1 ─► {M3,M5,M4,M2,M6,M7}
E04-L1 + E04-L6 ─► E12 ; E04-L4 (papéis) ─► E07w-T6 (403)
S207 ✅ + S1602 ✅ ─► E09-slim
G-004 ─► CONS-1 (KpiCard) ; ledger ─► CONS-5 (org defs)
```

**Regra de granularidade (herdada §5 ROADMAP):** 1 task ≈ 1 tela/componente/Function = 1 PR = 1 commit `[LEELA-*]`. Ver `TASKS-next.md`.

---

## 8 · Premissas assumidas

- **IDs temáticos** (`LEELA-FABLE-*`, `LEELA-RESP-M*`, `LEELA-CONS-*`) seguem o precedente canônico dos lotes temáticos já no `V1-CHECKLIST.md` (`LEELA-FID-EVT-*`, `LEELA-DS-FORMS-*`, `LEELA-UXDADOS-*`). Não inventei entidades de domínio novas. Onde já existe ID canônico de story (S208/S209/S210/S904), o de-para está declarado em §3 — o rótulo temático nomeia o LOTE, o aceite vive no épico.
- **`pedidos/{id}`**: o MODELO é do **ADR-011** (`adr/ADR-pedido-em-grupo.md`, ✅ decidido — pedido em grupo, estorno por inscrito, escrita financeira só por Function). FABLE-A o **implementa** (com gate adr-conformance, L-001); o E12 continua dono do produtor de ESCRITA no checkout. O que o Vitor ratifica em D1 é o **sequenciamento** (kernel na Frente A agora), não o modelo.
- **Onda 2 canônica** = a de `V1-CHECKLIST.md §Vender` (superconjunto já reconciliado); `ROADMAP.md §5` está desatualizado e recebe correção documental.
- **RESP-MOBILE é Must** no escopo travado pelo Vitor (emenda ao PRD, mobile real 390×844); os M2/M6/M7 caem por tabela após M1, por isso Should individual.
- **QA-LIVE-2-REPORT.md está corrompido** (arquivo zerado — bytes NUL no disco, verificado por dump binário); o dimensionamento M1-M7 foi lido da síntese fiel no `HANDOFF` e no `V1-CHECKLIST` (que carregam a ordem de fix e a causa-raiz única). Ver `DECISOES-NECESSARIAS.md` nó `QA2-REPORT-CORROMPIDO`.
