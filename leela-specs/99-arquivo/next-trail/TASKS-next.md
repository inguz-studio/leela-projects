# TASKS-next · Quebra AI-ready (1 task = 1 PR = 1 commit `[LEELA-*]`)

> PROPOSTA revisável. Cada task = 1 commit atômico, staging cirúrgico, trailers de decisão. Roteamento: **Fable** (pagamento/segurança/gate/root-cause/rules/core-negócio) · **Opus** (UI/mecânico/QA). Sonnet PROIBIDO. `⚔` = review antagonista obrigatório (reusável/sensível/segurança). Estimativa T-shirt (XS<0.5d · S 0.5-1d · M 1-2d · L 2-4d).

---

## F1 · Trilha Fable (após reset da cota Fable · consultar Kleppmann no A)

| Task | Descrição | Est. | Dep | Rota | ⚔ |
|---|---|---|---|---|---|
| `LEELA-FABLE-A-T1` | Modelo `pedidos/{id}` **conforme ADR-011** (pedido em grupo: `responsavel`, `inscritoRefs[]`, `pagamentoRef`, `valorTotal`; escrita de estado financeiro só por Function) + tipos core `Pedido`/`Pagamento`/`Conciliacao` + api-client + Rules (nesta fase só organizador lê) + **gate adr-conformance ADR-011** | M | S203-T1 ✅ | **Fable** | ⚔ |
| `LEELA-FABLE-A-T2` | Enriquecer projeção `Inscrito` (`pedidoRef`+`ehResponsavel` do ADR-011; denormalizar `[reg]` pessoais OU join; `tamanhos` = map por item, S209); surfaçar campos do slide-in S203 §"Campos" | M | A-T1 | **Fable** | ⚔ |
| `LEELA-FABLE-A-T3` | Wire do slide-in rico `LEELA-S203-T3`: abas Geral `[reg]` + Pagamento `[pag]` renderizam dado real (Onda 1 colhe) | S | A-T2 | **Opus** (UI) | ⚔ (PII no cliente: CPF/saúde/emergência — mascarar/mínimo necessário) |
| `LEELA-FABLE-B-T1` | Function `estornarInscricao` transacional idempotente **por inscrito** (ADR-011: estorno PARCIAL dentro do pedido em grupo; RN-337 sem split — afiliação cortada) + guard (só paga, só organizador) + audit trail; testes: reexec não duplica + estorno de 1 inscrito não afeta os demais | M | A-T1, PaymentProvider ✅ | **Fable** | ⚔ |
| `LEELA-FABLE-B-T2` | Ação "Reembolsar" no slide-in + ConfirmModal §2.15 (reflete resultado real "•••• em N faturas" com o **valor parcial** do inscrito) | S | B-T1, A-T3 | **Opus** (UI) | ⚔ (UI de ação de dinheiro — valor parcial por inscrito) |
| `LEELA-FABLE-C-T1` | Validação server-side de assinatura do `qrToken` (RN-221/222): rejeita adulterado/outro-evento/**já usado** (persiste carimbo `checkinEm`, recorte S208-T1) — ≙ `S208-T3` | M | firebase-admin ✅ | **Fable** | ⚔ |
| `LEELA-FABLE-E-T1` | Alinhar seed `Kit.id` ao enum `inscrito.kit` (chave canônica Kit↔enum) + remover ponte `kitCasa` | XS | S205 ✅ | **Opus** (mecânico) | — |
| `LEELA-FABLE-D-T1` | Modelo de estoque por tamanho (lado kit): `modeloEstoque`/`tamanhosDisponiveis[]` em `itensKit` + subcoleção `aprovisionamento/{sku}` + Rules — ≙ `S210-T1/T2`; o campo `tamanhos` do inscrito (≙ `S209-T1`) entra por A-T2 (herdar aceites do épico E03) | M | E-T1 | **Fable** | ⚔ |
| `LEELA-FABLE-D-T2` | Function de agregação Σ de estoque (onWrite de inscrito confirmado, idempotente, lê `inscrito.tamanhos`) + máquina de estados de aprovisionamento + alertas baixa/esgotado derivados — ≙ `S210-T3` *(task nova r2: faltava a Function entre modelo e UI)* | M | D-T1, A-T2 | **Fable** | ⚔ |
| `LEELA-FABLE-D-T3` | Validação de coleta de tamanho (≙ `S209-T2`, core puro RN-223) + wire EstoqueView (S205-T4) a dado real *(era D-T2 na r1)* | S | D-T2 | **Opus** (UI) | — |
| `LEELA-FABLE-F-T1` | `Evento` ganha cronograma de entrega (janelas dia/local/horário) + faixa/estoque de chips + Rules | M | S204 ✅ *(dep C-T1 removida r2 — sem dado compartilhado)* | **Fable** | ⚔ (Rules novas no `Evento` — gate operacional do balcão) |
| `LEELA-FABLE-F-T2` | Banner "Entrega ativa · Dia N de M" + alertas de chip órfão/estoque no balcão (dado real) | S | F-T1 | **Opus** (UI) | — |
| `LEELA-FABLE-G-T1` | Modelo/expor log de comunicações (e-mail/push, status entrega/abertura) + histórico do registro + Rules — **agregado ÚNICO** consumido por E06-L1 e `S1206-T2` (`hasSent`/`markSent`) | M | A-T1 | **Fable** | ⚔ |
| `LEELA-FABLE-G-T2` | Abas Comunicação `[com]` + Histórico `[hist]` do slide-in renderizam o log real (S203) | S | G-T1, A-T3 | **Opus** (UI) | — |

---

## F2 · RESP-MOBILE (Opus · 1 sweep · gate Norman) — ordem M1→M3→M5→M4→M2/M6/M7

| Task | Descrição | Est. | Dep | Rota | ⚔ |
|---|---|---|---|---|---|
| `LEELA-RESP-M1-T0` | Emenda ao PRD-01 + handoff-claude-design (desktop-first → responsivo, alvo mobile) + projeto mobile 390×844 no Playwright nos gates | XS | — | **Opus** | — |
| `LEELA-RESP-M1-T1` | `screens` breakpoints tokenizados no tailwind-preset (DS) | XS | M1-T0 | **Opus** | — |
| `LEELA-RESP-M1-T2` | RootShell/Sidebar → drawer mobile + remove offset fixo do `main` (destrava refluxo); gate Norman (affordance/feedback/constraint/reduced-motion) | M | M1-T1 | **Opus** | ⚔ (DS estrutural, todas as rotas) |
| `LEELA-RESP-M3-T1` | KpiRow grid→1col em 390px (5 rotas) | S | M1-T2 | **Opus** | — |
| `LEELA-RESP-M5-T1` | Table card-mode/scroll contido em 390px (inscritos/membros/tenants/macro) | M | M1-T2 | **Opus** | ⚔ (reusável, 4 consumidores) |
| `LEELA-RESP-M4-T1` | Header + TabNav/SubNav truncamento + overflow das abas em 390px | S | M1-T2 | **Opus** | ⚔ (interação nova em componente reusável dos drills — a11y teclado/roving; classe de bug que o antagonista pegou TODA vez) |
| `LEELA-RESP-M2-T1` | Toolbar/CTA (⌘K) mobile | XS | M1-T2 | **Opus** | — |
| `LEELA-RESP-M6-T1` | EventRow mobile | XS | M1-T2 | **Opus** | — |
| `LEELA-RESP-M7-T1` | prose/intro mobile | XS | M1-T2 | **Opus** | — |
| `LEELA-RESP-GATE` | Gate visual vivo 390×844 nas 18 rotas (Playwright headless viewport explícito) — 0 MAJOR mobile; desktop 1440 intocado | S | todos M* | **Fable** (veredito de gate) | — |

---

## F3 · Onda 2 (tasks já detalhadas nos briefs `onda2-*`; aqui o delta de dependência + rota)

> Não re-quebro as tasks (os briefs `onda2-E04/E12/E09slim/E07web/E06/transversais` já as têm 1-task=1-PR). Registro só as **mudanças de dependência/rota** desta trilha.

| Task (do brief) | Delta desta trilha | Rota | ⚔ |
|---|---|---|---|
| `LEELA-S1203-T5` createInscricaoCharge + `pedidos/{id}` | **Dep NOVA: `LEELA-FABLE-A-T1`** (o `pedidos` já existe como kernel — aqui só o produtor de escrita do checkout; NÃO redefinir a coleção) | **Fable** | ⚔ |
| `LEELA-E04-PAY-T1` DI seam + conformance | `refund` do seam **reusa** a Function de `LEELA-FABLE-B-T1` (não reimplementar estorno) | **Fable** | ⚔ |
| `LEELA-E06-L1-T1` extração + `S401-*` campanhas | **Dep NOVA: `LEELA-FABLE-G-T1`** (a aba Comunicação do slide-in e as campanhas partilham o log de comunicação) | **Fable**(core) + **Opus**(UI) | ⚔ (parcial) |
| `LEELA-S1206-T2` log de notificações (`hasSent`/`markSent`) | **Dep NOVA: `LEELA-FABLE-G-T1`** — o log de envio do ingresso é o MESMO agregado do log de comunicação; NÃO modelar um 2º log (idempotência de envio sobre o modelo de G) | **Fable** | ⚔ |
| `LEELA-E07w-T6` 403 no painel | Dep já existente E04-L4 (matriz `podeAcessar`) — sem mudança | **Opus** | — |
| `LEELA-S821-T1b` rollup diário | Sem mudança — **Fase V1** (funil) | **Fable** | — |
| `LEELA-S1307-T1` / `S1308-T1/T3` desafio | Sem mudança — **Fase V1.5** (engajar, Heroica) | **Fable** | — |
| demais tasks E04/E12/E09-slim | inalteradas vs briefs `onda2-*` | Opus/Fable conforme brief | conforme brief |

---

## F4 · Consolidações (Opus · baixa urgência · interleave)

| Task | Descrição | Est. | Dep | Rota | ⚔ |
|---|---|---|---|---|---|
| `LEELA-CONS-1-T1` | Promover `KpiCard`/`StatTile` canônico ao DS (flat §2.16) + showroom + testes | S | — | **Opus** | ⚔ (reusável) |
| `LEELA-CONS-1-T2` | Migrar as 4 cópias (eventos/clubes/plataforma/EstoqueView) para o KpiCard do DS | S | CONS-1-T1 | **Opus** | — |
| `LEELA-CONS-2-T1` | Ajustar timeout/paralelismo do `EventoLayout.test.tsx` (passa isolado ~1.3s; falha na suíte cheia 8GB) | XS | — | **Opus** | — |
| `LEELA-CONS-3-T1` | `useTenantActions`/`useSaveCommercialTerms` → useMutation + invalidação (read-your-writes) | S | — | **Opus** | — |
| `LEELA-CONS-4-T1` | Backend-dep: nome do owner do tenant (join `profissionais/{ownerUid}`) | XS | — | **Fable** (rules/join) | — |
| `LEELA-CONS-4-T2` | Nome canônico do evento na parceria (denormalização) + 5º segmento de comunicado | XS | — | **Fable** | — |
| `LEELA-CONS-5-T1` | Adotar G-001..G-004 nas definições `~/businesses/software-forge/*` + `~/squads/magic-ds/*` (baseline DS, gate UX, injeção JTBD, KpiCard no checklist) | S | — | **Opus** (docs/config) | — |
| `LEELA-CONS-6-T1` | 6 bugs de componente do showroom (Input aria-describedby · DropdownMenu className · Toast duration danger · Card export tipos · comentário Table · CardEvento href+onClick) | S | — | **Opus** | — |
| `LEELA-CONS-6-T2` | UX-DADOS lote 2: financeiro/balcão onSnapshot + kits + Clubes + Plataforma mutations → useQuery/useMutation | M | UX-DADOS L1 ✅ | **Opus** | — |

---

## Resumo de contagem

| Frente | Stories | Tasks (novas) | Rota dominante |
|---|---|---|---|
| F1 Fable (A-G) | 7 | **14** (r2: +D-T2 Function Σ) | Fable (backend) + Opus (UI wire) |
| F2 RESP-MOBILE (M1-M7) | 7 | 10 (incl. T0 emenda + GATE) | Opus + Fable (gate) |
| F3 Onda 2 | (existentes) reconciliadas + JTBD | delta de dep em **4** tasks (r2: +S1206-T2); demais nos briefs `onda2-*` | Opus + Fable |
| F4 Consolidações | 6 | 9 | Opus + Fable (backend-dep) |

**Antagonista (⚔) — verificado task a task na r2:** FABLE-A-T1/T2 (dinheiro/modelo), **A-T3** (PII no cliente), FABLE-B-T1 (idempotência/dinheiro), **B-T2** (UI de estorno, valor parcial), FABLE-C-T1 (segurança), FABLE-D-T1/**D-T2** (modelo+agregado de estoque), **F-T1** (Rules novas), FABLE-G-T1 (PII/reusável) · RESP-M1-T2 (DS estrutural), RESP-M5-T1 (Table 4 consumidores), **M4-T1** (TabNav interação/a11y) · S1203-T5, E04-PAY-T1, E06-L1 parcial, **S1206-T2** (checkout/segurança/log) · CONS-1-T1 (DS reusável). **Deliberadamente SEM ⚔** (não inflar): E-T1 (mecânico, sem Rules) · D-T3/F-T2/G-T2 (UI de leitura sobre dado já gateado pelas Rules das tasks ⚔) · M3-T1/M2-T1/M6-T1/M7-T1 (reflow CSS puro, sem interação nova) · M1-T0/T1 (doc/token) · RESP-GATE (é o próprio gate) · CONS-2..6 (fixes pontuais já revisados, docs ou mutations mecânicas).
