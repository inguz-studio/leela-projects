# HANDOFF — LEELA build (trace leela-build-2d6ee98d) · atualizado 2026-07-12

# ▶️ SESSÃO ATIVA 2026-07-12 (noite). Git SÃO em `C:\dev\LEELA`. Working tree limpo (commits incrementais + push por aterrissagem). **Em voo: S300-T2 (Fable, backend) ∥ wire EstoqueView (Opus, UI).** Preview do Vitor de pé: painel 5273 + Firestore 8180 + Auth 9198 (NÃO derrubar). Matar `java`/`node` órfãos se retomar do zero. Modo: **"pode rodar tudo" + paralelizar quando memória livre** (8GB: ~1 emulator por vez; 1 emulator Fable + 1 leve Opus juntos = ok). Sessão em /effort **ultracode (xhigh)**.

## ▶️ COMECE AQUI — retomada

**🧭 ESTADO 2026-07-12 (tarde) — o mais recente primeiro:**
- **`/harness` pontos 1-3 FECHADOS:** (1) KPIs da Visão Geral eram **operacionais** (getOverview sempre funcionou; caixas vazias = emulator morria a 512m + cold-start) → fix heap `preview.sh` 512→**1024m** (`c7d39f9`). (2) **Refino evento+checkout ao Figma** (`112-4622`, dark) + **kit-por-modalidade** (checkout filtra kits pela modalidade) + **logos** (`dc57504`); Fable-review pegou 2 bugs de dinheiro (exploit fulfillment kitId↔rótulo ~R$104 + crash valor negativo) → `c59dc28`. (3) **`MODELO-ROADMAP.md`** = terminologia única **Onda→Épico→US→Task** (fim da mistura Wave/Onda; "Wave"=lote de execução) + épicos **E17** (perfil social/link-in-bio) e **E18** (assessorias parceiras) planejados (`d1fb2a6`).
- **Follow-ups fechados:** logo LEELA no sidebar do painel (`5539ece`); **`kitId` persistido + travado nas Rules** (fulfillment exato, 177/177, `2aa1f90`); hero cover sem capa já ok.
- **✅ BATCH BACKEND ONDA 2 COMPLETO (Fable B/G/D + E-T1):** **FABLE-B** estorno por-inscrito ADR-011 (`a7ffe94`, 38/38+213, exploit ressurreição pego); **FABLE-G** log de comunicação PII → fonte E06 (`5a144f1`, 244/244 superfície; 2 falhas full-run = flaky pré-existente CONS-2); **FABLE-D** estoque de kit por tamanho (agregação idempotente, estorno reverte via filtro `confirmado`, máquina de estados, alertas) + **E-T1** chave Kit↔enum (`d54c53a`, 116/116 emulator). Todos: Rules write:false + ataques negados; **review antagonista Fable na ATIVAÇÃO de cada um** (E04-refund/E06/EstoqueView D-T3 — hoje inertes).
- **🔨 TELAS VISÍVEIS DO ORGANIZADOR (E04) — EM ANDAMENTO (telas do painel, uma por vez p/ evitar conflito):**
  - **✅ Config de LOTES/MODALIDADES 100% FECHADA (2026-07-12 noite)** — tela `d4a6c02` + **(a) gate visual PASS** (lote criado via modal ficou ATIVO, preço vigente do kernel, mobile card-mode ok) + **(b) Fable-review APPROVE-COM-FIXES**: payload de lote vendido SÓ-NOME (`6968758`), janela pinada FUSO_EVENTO (`da98231`), +7 ataques negados nas Rules (`a385b16`). Riscos residuais REGISTRADOS (não bloqueiam): sobreposição de janela por payload direto (kernel segura, `loteAtivo` determinístico) · `criadoEm` editável (trilha, não dinheiro).
  - **✅ Config da PÁGINA do evento (S300-T3, `ce4c5b5`) — GATE PASS**: editor de seções por canal (Checkout travado), SEO `{DOMINIO_LEELA}`, publicar/despublicar (ConfirmModal+Toast); write path provado no preview (toggle persistiu reload). **Lacuna → S300-T2:** callables `publicar/despublicarPaginaVendas` não existem (UI chama seam e falha honesto); flag `publicada` = escrita exclusiva de Function + Rule congelando.
  - **⚠️ Lição operacional:** o preview consome `packages/api-client/dist` — tela nova que adiciona export ao api-client exige `pnpm --dir packages/api-client build` antes do gate visual (senão SyntaxError de export e main vazio).
  - **✅ Wire EstoqueView D-T3 (`edd395c`) — GATE PASS** (tabela por SKU real, estados/alertas/ações pela matriz do core; mobile card-mode). ⚠️ Maestro semeou 3 SKUs demo no preview p/ o gate (P/M/G da camiseta-tecnica sobrescritos; `preview.sh` restaura no próximo boot). Review antagonista da ativação = em voo.
  - **✅ S300-T2 backend (`2f0fb0a`)** — virada de lote (onWrite+cron, ADR-011/012, ratchet) + guard RN-200 + `publicar/despublicarPaginaVendas` (lacuna do editor fechada). Ressalva p/ decisão de negócio: `confirmado→cancelado` sem estorno sai da contagem de vaga.
  - **FALTAM (próximas, painel, uma por vez):** aba Comunicação E06-L3 (consome FABLE-G; brief `leela-e06-l3-comunicacao-enriched.md`) · tela de estorno E04-refund (consome FABLE-B; brief `leela-e04-refund-tela-enriched.md`) · depois S300-T5/T6 (modais cupom/percurso) e S304 (equipe). Cada tela: gate visual + Fable-review na fiação de dinheiro.
- **4 decisões de estoque p/ Vitor ratificar (defaults defensáveis, não bloqueiam):** estoqueFisico nasce da transição `em_estoque`; limiar "baixa" = 10 un default; máquina de estados linear estrita (RN-226); validação de tamanho na origem (S209-T2 checkout).
- **Referências de design (LER):** `references/DESIGN-REFERENCES.md` (Figma `112-4622` wireframes + regras novas: cupom-only, repasse D+2 ajustável, retenção 15%, assessorias). Identidade = DARK (brasa), logos em `brand/`.
- **Chave Asaas:** PRODUÇÃO em `functions/.env` (`ASAAS_PROD_API_KEY`, autentica — conta "FAROL SOLUCOES"; **recomendei ao Vitor rotacionar**, apareceu no chat). Mock ativo; sandbox indisponível; AsaasProvider inerte.
- **6 decisões do planejamento seguindo os defaults** (E17/E18, JTBD, Onda 3, de-para, RNs, @handle) — Vitor pode ratificar/ajustar.

---

**✅ RODADA DE RE-REVIEW FABLE FECHADA E VERDE (gate consolidado 181/181, 5 arquivos emulator, 2026-07-12).** Sem bug aberto. A Frente A (Fable) + fundação do checkout sandbox foram re-revisadas em **Fable EXPLÍCITO** (correção de rota: inheritance NÃO alcança Fable — passar `model:"fable"` sempre) e todos os gaps reais de dinheiro foram fechados. Commits da rodada: `d50584d` (QR) · `8007f52` (vazamento repasse via catch-all → Rules writer-only + allowlist) · `308275f` (contrato pedido `valorTotal` fixo + `itens[]` por-inscrito) · `9a5a671` (saleState janela-morta) · **`7ce033f` (moneyCentExato portável — causa real: `math.isInfinite` NÃO existe no runtime de Rules do emulator@13; helper reescrito `v*0.0==0.0`, `beforeAll`→30s)**. **Diretriz herdada: nunca usar `math.isInfinite`/`math.isNaN` em `firestore.rules` (não existem no runtime do emulator).**

**Feito antes nesta sessão (tudo pushed):** Wave A UI (`0b0e00b`,`96ccd0f`) + fix infra `f60c59e` · **Wave B mobile COMPLETA** (11/11 sem overflow) · refinamento UI (FilterMenu + SubNav plano `9fc4231`) · **Onda 2**: S300-T1 kernel de vendas (`6b45b9c`, ADR-012 lote-por-modalidade) + **fundação do checkout SEM Asaas** (MockProvider sandbox, `selectProvider` fail-safe, `computeSaleState`, `createInscricaoCharge`, webhook idempotente). Benchmarks em `discovery/`: cheers, shotgun, stayf, ticketing-br, wellable, **asaas-api-reference** (mapeada p/ PaymentProvider).

**✅ E12 SUPERFÍCIES PÚBLICAS v1 ATERRISSADAS (gate visual PASS 2026-07-12, `974c8e2`).** `apps/landing` Next 14: fundação (leitor Admin SDK gate por `status`→404) + home marketplace + página de evento (`precoVigente` por modalidade, seções por config, share/QR, CTA preserva atribuição). Gates tsc/eslint/next build 0 + bundle 0 vazamentos + gate visual maestro 8/8 (404 no rascunho provado, sem overflow mobile). **Preview de pé p/ o Vitor: landing `http://127.0.0.1:3000` (clock 2026-03-15=vendas abertas, aponta no emulator seedado 8180) + painel `http://127.0.0.1:5273`.** Follow-ups não-bloqueantes: (1) hero cover=placeholder gradiente quando sem URL; (2) seedar lotes p/ demais eventos (aparecem "encerrados").

**✅ ADAPTER ASAAS ATERRISSADO (gate PASS 2026-07-12, `9afade4`, verificado pelo maestro).** `AsaasProvider` implementa `PaymentProvider` (ADR-006) **inerte**: checkout intocado, Mock ativo; PIX/cartão/boleto idempotente, webhook em tempo constante (Schneier), `permitirProducao` fail-closed, plugável por `providerId='asaas'`. Testes 100% mockado (86 pass/1 skip). **Directive: review antagonista Fable OBRIGATÓRIA na ativação** (antes de trocar `selectProvider`); persistir `pagamento.cartao` + wrapper HTTP do webhook Asaas = ativação. Checklist de ativação em `outputs/leela-build-2d6ee98d/ASAAS-ADAPTER-REPORT.md`.

**✅ CHECKOUT DE 5 ETAPAS ATERRISSADO + REVIEW ANTAGONISTA FABLE (gate visual+segurança PASS 2026-07-12, `c5a7d2a` + fix `703db9c`).** `/{eventSlug}/inscricao` clica de ponta a ponta contra o Mock (ADR-011 grupo, `computeSaleState`, PIX/cartão, cupom, idempotência, anônimo). Review Fable APPROVE-COM-FIXES: integridade de dinheiro provada por **15 testes de ataque**; 1 achado de confidencialidade corrigido (cotação vazava `taxa`→`platformFeePct`). vitest 22/22. **🏁 MARCO "vender ponta a ponta" FECHADO.**

**🖥️ PREVIEW CLICÁVEL DE PÉ p/ o Vitor (stack completo):** landing `http://127.0.0.1:3000` (marketplace + evento + **checkout clicável**) · painel `http://127.0.0.1:5273` · emulators Functions 5001 + Auth 9099 + Firestore seedado 8180. Login demo: `marina@demo-leela.dev`/`demo1234`. **SE O STACK CAIR (next start/emulators morrem em máquina de 8GB após horas), reabrir:** (1) `bash preview.sh` (sobe Firestore 8180 seedado + Auth 9198 + painel 5273); (2) `cd functions && JAVA_HOME=~/.jdks/jdk-21.0.11+10 FIRESTORE_EMULATOR_HOST=127.0.0.1:8180 LEELA_CLOCK=2026-03-15T12:00:00-03:00 FUNCTIONS_EMULATOR=true npx firebase-tools@13 emulators:start --only functions,auth --project demo-leela`; (3) build da landing com `NEXT_PUBLIC_USE_EMULATOR=true NEXT_PUBLIC_EMULATOR_FIRESTORE_PORT=8180 NEXT_PUBLIC_EMULATOR_FUNCTIONS_PORT=5001 NEXT_PUBLIC_EMULATOR_AUTH_PORT=9099 npx next build` e depois `FIRESTORE_EMULATOR_HOST=127.0.0.1:8180 LEELA_CLOCK=2026-03-15T12:00:00-03:00 npx next start -p 3000`. **Relógio 2026-03-15 é obrigatório** (seed tem datas fixas de 2026; sem ele a Meia Floripa aparece encerrada).

**📐 REFERÊNCIAS DE DESIGN (LER NO REINÍCIO): `references/DESIGN-REFERENCES.md`** — Figma "V1 - DS" (`pP90MWzw03NNlRpXicFt6Q`): wireframes de eventos/checkout/social (`112-4622`, snapshot em `references/figma-snapshots/`), logos (`112-51` → `brand/leela-logos-variantes.png`, 5 variantes). **Identidade = DARK (brasa)**, marca vermelho/marrom + laranja + verde-limão + creme, wordmark Exo 2. Logos = pendência RESOLVIDA (aplicar nos apps: SidebarBrand/header landing/favicon — exportar SVG por variante dos nós `112:5/13/21/29/37` na aplicação).

**🎯 PRIORIDADE (decisão Vitor 2026-07-12):** refinar a **página do evento + checkout + jornada de compra** à fidelidade dos wireframes `112-4622` (mobile-first, dark). A v1 atual foi desenhada sobre benchmarks; agora tem o mockup. Rota Opus + design-principles + os snapshots como alvo de aparência (JTBD ainda vence divergências).

**PRÓXIMO grande passo (retomada — decisão do Vitor):** (0) aplicar as logos + refino do evento ao Figma (prioridade acima); (1) resto E04 (S300-T2 virada de lote + telas de config de evento/lotes) · E09 repasses · E07 erros · E06 campanhas · frentes Fable restantes. (2) **Épico novo a planejar:** perfil social / link-in-bio (Feed·Eventos·Clubs, tematização por-usuário, capas) — benchmark Cheers. E, com chave SANDBOX Asaas: **ATIVAÇÃO do Asaas** (checklist `ASAAS-ADAPTER-REPORT.md`, com review Fable). Decisão aberta (não bloqueia): sim/não ADR-013.

**ATUALIZAÇÃO 2026-07-12 (turno):** (a) **Chave Asaas de PRODUÇÃO colada** em `functions/.env` → var isolada `ASAAS_PROD_API_KEY` (166 chars, `$aact_prod_`); `ASAAS_API_KEY` ativa NÃO existe → Mock intacto, fail-safe não dispara. ⚠️ **Segurança:** a chave de produção apareceu no transcript → **recomendei ao Vitor regenerá-la no painel Asaas** (não urgente; eu troco depois). ⚠️ **Só temos chave de PRODUÇÃO (sandbox indisponível) → PROIBIDO teste que crie cobrança/cliente real**; adapter testa com HTTP mockado; no máx. 1 check read-only (`GET /myAccount`) feito pelo maestro. (b) **ADR-013 orquestração de pagamento** escrita como PROPOSTA (`leela-specs/adr/ADR-orquestracao-pagamento.md`) — aguarda sim/não. (c) **Brief do adapter** pronto (`.nirvana/briefs/leela-asaas-adapter-enriched.md`, rota Fable) — dispara após o E12 público aterrissar. (d) **Preview do painel NO AR** p/ o Vitor ver: `http://127.0.0.1:5273` (emulator isolado 8180, não colide com o agente).

**AGUARDANDO O VITOR (NADA bloqueia — sigo sem):** (1) **sim/não p/ ADR-013** (orquestração de pagamento — registry+`resolveProvider(contexto)`+`providerId` de roteamento+webhook demux; failover depois); (2) **logos** em `brand/` → SidebarBrand/landing/e-mail/favicon (landing usa placeholder "LEELA" até lá); (3) **chave SANDBOX Asaas** quando conseguir → destrava o teste ponta-a-ponta de cobrança sem risco. Decisões travadas: Leela=marketplace+SaaS; checkout via Mock; landing E12 v1 já.

**FOLLOW-UP registrado (não bloqueia):** webhook deve persistir bloco `cartao` na confirmação de CARTÃO (parse já exige; PIX ok; fix antes do checkout de cartão ir ao ar).

Trilha de auditoria: `~/.harness-logs/2026-07-12/audit.jsonl` (+ `2026-07-11/`). Constraint: JDK 17 → emulator via `npx firebase-tools@13`.

Este bloco é autossuficiente. As seções antigas abaixo são HISTÓRICO (o remoto é a verdade).

## Estado atual (o que está PRONTO — não refazer)
- **App inteiro no nível de fidelidade, ancorado no JTBD** (não no pixel do mockup): Eventos (6 telas: Visão Geral, Inscritos, Hub, Financeiro, Kits/Estoque, Entrega/Balcão) + Clubes + Plataforma. 0 MAJOR de UI.
- **Camada de dados = TanStack Query (ADR-010)** nos 3 módulos; navegação com cache; **criar/editar funcionam de verdade** com read-your-writes (invalidação). Gateway em `apps/painel/src/lib/query/{queries,mutations,keys}.ts` (hooks `_data/*` preservam contrato; consumidores intocados). Exceção correta: `*/session.ts` seguem `useEffect` (assinaturas de auth).
- **Design system**: primitivos de form (Input/Select/Checkbox/SearchInput/Textarea/Radio/RadioGroup/Switch/Field/RadioCard) + charts (BarChart/DonutChart/Sparkline) — nativos, tokenizados, born-responsive, a11y revisada por antagonista. Documentados no showroom.
- **firebase-admin DESTRAVADO** (45 arquivos migrados p/ imports modulares; escritas provadas no emulator). Botões criar/salvar + balcão funcionam no preview.
- **Roadmap #1 (DS-Forms+mutations) + #2 (rascunho-ao-fim, Chip-fora-do-Geral) + #3 (Clubes/Plataforma: F0 dados + L1 seletores-card + L2 plataforma + L3 i18n/densidade) CONCLUÍDO** — tudo em Opus (cota Fable esgotada nesta sessão).
- Decisões fixas: "Clubs" no sidebar FICA (Vitor); tema = 1 eixo brasa/leela; barra do showroom global; hub = linhas híbridas (foto+métricas); ordenação hub = rascunhos ao fim.

## ROADMAP RESTANTE — TRILHA NEXT-TRAIL RATIFICADA (Vitor, 2026-07-10/11 — D1-D7)

Planejamento completo em **`leela-specs/next-trail/`** (ROADMAP-next §7 = waves A-D · STORIES-next · TASKS-next · JTBD-TRACE · DECISOES-NECESSARIAS), **PROMOVIDO aos canônicos em 2026-07-10**: `ROADMAP.md §5` (Onda 2 reconciliada + waves + grafo delta) · `V1-CHECKLIST.md §Trilha next-trail` (todas as stories/tasks `[ ]`) · `jobs-to-be-done.md §04.1` (P1-P5 aplicadas) · `DECISOES-ABERTAS.md` (D1-D6 em Ratificadas). Brief Fable original: `.nirvana/briefs/leela-fable-track-backend.md` (campos do slide-in em `leela-specs/backlog/LEELA-S203.md`).

**Decisões D1-D7 RESOLVIDAS (one-liners):**
- **D1** — kernel `pedidos/{id}` implementado UMA vez na **Fable Frente A** conforme **ADR-011** + gate adr-conformance; deps `FABLE-A → E12-L4/S1203-T5` e `FABLE-A → S203-T3` valem (overlap Onda 1×2 DECIDIDO: kernel compartilhado, nem abre a Onda 2 inteira nem só enriquece a Onda 1).
- **D2** — gateway = **Asaas**; KYC = ação externa pendente (não bloqueia sandbox; `E04-PAY-T2` parked até KYC).
- **D3** — **E06 campanhas = V1**; middle-action do card "Próximo evento" vira "Comunicar" quando E06-L3 aterrissar.
- **D4** — `ROADMAP.md §5` corrigido p/ o superconjunto reconciliado (E04-slim + E12 + E09-slim + E07-web + E06 + transversais; E08 adiado).
- **D5** — **RESP-MOBILE = Must V1**, antes/em paralelo à Onda 2 (390×844, 1 sweep, gate Norman, ordem M1→M3→M5→M4→M2/M6/M7).
- **D6** — **P1-P5 aplicadas** a `jobs-to-be-done.md §04.1` (P5 inadimplência visível · P1 estorno digno · P2 QR sem fraude · P3 estoque por tamanho · P4 operar pelo celular).
- **D7** — reconstituir `QA-LIVE-2-REPORT.md` (corrompido, NUL) = **1ª task da Wave B** (`LEELA-RESP-QA2-RECON` no checklist) — registrado, não executar agora.

**Ondas:** Wave A Fable kernel (A→B ∥ C·F ∥ E→D ∥ G) → Wave B RESP-MOBILE (QA2-RECON → M1 → M3·M5·M4 → M2·M6·M7 → GATE) → Wave C Onda 2 (E04-slim · E12 · E09-slim · E07-web · E06 · S821 V1 · S1307/S1308 V1.5) → Wave D Consolidações (CONS-1..6).

**✅ FABLE-A-T1 ATERRISSADO 2026-07-11** (re-clone limpo = `C:\dev\LEELA`, git OK — o ⚠️ acima vale só p/ o clone antigo *-CORROMPIDA*). Kernel `pedidos/{id}` root (`tenantId`+`eventoId` 🔁) + `Pedido`/`Pagamento`(`Conciliacao` embutida) + api-client + Rules (read=`isTenantWriter`, write=false) · antagonista APPROVE-COM-FIXES → r1 9/9 fixes · unit 45/45 · Rules 19/19 emulator · adr-conformance PASS · report `outputs/leela-build-2d6ee98d/FABLE-A-T1-REPORT.md`. Constraints: JDK 17 → emulator via `npx firebase-tools@13`; índices compostos só validáveis no deploy; falha pré-existente `tenantLifecycle.test.ts` (commit `8e6badd`) = lote próprio futuro.

**✅ WAVE A BACKEND (Fable) COMPLETA E PUSHED 2026-07-11** (HEAD `6a46509`) — 3 raias paralelas + A-T1, todas com review antagonista + fix + gate de emulator:
- **A-T1 kernel pedidos** ✅ `a2782b4` (+fix r1) — coleção root, `Conciliacao` embutida, Rules write=false.
- **C-T1 QR seguro** ✅ `bc2bf04` + `8158a3f` — HMAC sem bypass (2 antagonistas APPROVE; corrida/replay/cross-tenant provados). Pendência OPERACIONAL: setar `QR_TOKEN_KEYS`/`QR_TOKEN_KID_ATIVO` no env do preview/prod. Follow-ups sistêmicos: App Check nos callables; charset de `inscritoId` no path.
- **F-T1 cronograma+chips** ✅ `7662651` + `5c83538` — F1 listagem tolera doc envenenado; F3 janela≤dia da prova. Limitação: meia-noite `24:00` inexprimível (F4).
- **A-T2 ficha do inscrito + PII** ✅ `2c01306` + `6a46509` — `[reg]` no Inscrito, `[pag]` por join; **decisão PII do Vitor aplicada**: read de inscritos E pagamentos = `isTenantWriter` (promoter+athlete NEGADOS, provado no emulator 158/158). CUIDADO herdado: o catch-all `match /{subcol}/{docId}` sob eventos exclui `inscritos` — qualquer subcoleção NOVA de eventos com PII precisa da mesma exclusão OU regra própria de writer.

**✅ WAVE A UI COMPLETA** (Opus): **A-T3** slide-in rico `0b0e00b` (abas [reg]/[pag] dado real, PII mascarada) + **F-T2** banner do balcão `96ccd0f` — gate visual PASS. Fix de infra `f60c59e` (pnpm allowBuilds — `bash preview.sh` voltou a subir).

**✅ WAVE B (RESP-MOBILE) COMPLETA 2026-07-11** — os 7 MAJOR mobile do QA-2 (causa-raiz M1) resolvidos: **M1** drawer `f0f7a79`+`1dc44c1` · **M3** KpiRow `302cd02` · **M4** header `9e1f518` · **M5** Table card-mode `c6f6c2f`+`33c7390` · **M2** Toolbar `a29bb38` · **M6** EventRow `0255685` (M7 caiu por refluxo). Cada ⚔ com antagonista+fix. **Gate visual final PASS: 11/11 rotas `scrollWidth==390` (zero overflow-x), desktop 1440 intocado**; gate consolidado DS 960/960 + painel 646/646. Script reusável `outputs/.../wave-b-final-shots.mjs`.

**✅ ONDA 2 iniciada em paralelo (D5):** **S300-T1** kernel de vendas `6b45b9c` — lotes-por-modalidade (**ADR-012** travado: lote pertence à modalidade) + cupons + paginaVendas; antagonista APPROVE-COM-FIXES → índice composto `21d8604` + cupom regex `52f629b`; emulator 161/161.

**➡️ PRÓXIMO DESPACHO: continuar Onda 2 (Wave C).** Antes do E12/checkout, fechar as frentes Fable que faltam (destravam a Onda 2): **FABLE-B** (estorno, reusado por E04-PAY), **FABLE-G** (log de comunicação, base do E06), **FABLE-D/E** (estoque por tamanho). Depois: **S300-T2** (Function de virada de lote, conta por modalidade×lote) → resto do E04-slim (S300-T3..T6 UI + S304) → **E12** (landing+checkout) → E09-slim → E07-web → E06. Fonte: `V1-CHECKLIST.md §Onda 2 · Vender` + briefs `onda2-*`.

**DECISÕES ABERTAS DO VITOR** (`DECISOES-ABERTAS.md`): (1) **homepage/catálogo da Leela na V1?** rec: adiar (SaaS de produtor, não marketplace); (2) **logos** — Vitor entrega em `brand/` ou anexo → aplico em SidebarBrand/landing/e-mail/favicon; (3) **landing E12 sem mockup** → desenhar sobre DS + benchmarks com UI-SPEC antes do S1201. **Benchmarks em `discovery/`:** cheers, shotgun (429, reconstruído), + em produção: stayf (deep), ticketing-br (5 sites), wellable — via `competitor-radar-squad`.

**PENDÊNCIA OPERACIONAL pré-preview-p/-Vitor:** setar `QR_TOKEN_KEYS`/`QR_TOKEN_KID_ATIVO` no env (senão check-in fail-closed). `seedPedidos` já fiado no preview-seed.

Trilha de auditoria: `~/.harness-logs/2026-07-11/audit.jsonl`. Constraint de ambiente: JDK 17 → emulator via `npx firebase-tools@13` (v15 exige JDK 21).

## PADRÕES VIGENTES (invioláveis — herdar em todo lote)
- **JOB primeiro; mockup = aparência; a story vence quando divergem** (L-004). Injetar persona+JTBD+critérios Given/When/Then + `~/.claude/skills/harness/references/design-principles.md` nos dispatches de UI.
- **Reuso-first + showroom fonte-de-verdade** (documentar componente/padrão novo no ato). Grep antes de escrever.
- **Reusável/sensível/segurança → review antagonista** (regra Vitor; achou bug real TODA vez: feed, CSV-injection, useId, nome acessível do RadioCard).
- **Não inventar dado** — dependência de backend = EmptyState honesto (nunca número/dinheiro falso).
- **Regra de UI se avalia no AGREGADO da tela, não por componente** (L-005: os 11 chips).
- **Decisão ratificada sem gate deriva** (L-001: ADR-010 existia, não era aplicado) — gate de conformidade a ADR.
- Máquina 8GB: SERIAL (preview/suíte/screenshots nunca juntos); higiene de node/java órfãos antes de subir preview/emulator.
- Roteamento: **Opus** (UI/mecânico/QA), **Fable** (pagamento/segurança/gate/root-cause/fix-loops). Sonnet PROIBIDO.
- 1 task = 1 commit `[LEELA-*]`; staging cirúrgico; trailers de decisão; **push por aterrissagem**. Gates PROVAM ao vivo. Auditoria JSONL por evento em `~/.harness-logs/`.

## COMO RETOMAR (nova sessão)
1. **⚠️ NÃO rodar git neste clone (destruído).** Re-clonar `inguz-studio/leela-projects` e trabalhar no clone limpo; conferir contra o espelho `C:/Users/Vitor Eduardo/leela-rescue-20260710/` (promoted-canonicals/ + next-trail/) se os docs promovidos em 2026-07-10 já estão no remoto — se não, aplicá-los do espelho e commitar. Briefs enriquecidos em `.nirvana/briefs/`; reports/evidências em `outputs/leela-build-2d6ee98d/` (gitignored, LOCAIS); trilha de auditoria em `~/.harness-logs/<data>/audit.jsonl`.
2. Preview: `bash preview.sh` (painel :5273, já logado/mockado; rotas `?preview=castelo` eventos, `/clubes?preview=corrida`, `/plataforma?preview=admin`). Showroom: `pnpm --dir packages/design-system showcase`.
3. Trace: `leela-build-2d6ee98d`. Repo: `inguz-studio/leela-projects`, branch `main`. Personas: `~/businesses/software-forge/employees/sf-*`.
4. Despachar via harness: persona sf-* + injeção JTBD/design-principles + enriched brief + emitir audit + gate + review nos reusáveis.
5. **Primeiro passo sugerido ao reabrir:** re-clone limpo → confirmar reset da cota Fable → despachar **Fable Frente A** (`LEELA-FABLE-A-T1`, kernel `pedidos` ADR-011 — overlap Onda 1×2 já DECIDIDO em D1, não realinhar).

---
## (HISTÓRICO — abaixo é registro das rodadas; git é a fonte)

## ✅ LOTE firebase-admin: FECHADO (2026-07-07, Opus 4.8) — follow-up "~13 módulos" encerrado
Migração mecânica `admin.firestore.{FieldValue,Timestamp}` estático → imports modulares de
`firebase-admin/firestore`. Alvo real medido = **47 arquivos** em `functions/src` (não ~13):
**45 migrados**, 2 já eram modulares (só menção em comentário). `import * as admin` mantido em
todos (ainda usam `admin.firestore()`/`admin.auth()`/`admin.apps` ou os TIPOS
`admin.firestore.Firestore/…` que são compile-time e não sofrem a interceptação de runtime).
**Prova de destrave (não alegação):** emulator (firebase.preview.json) carrega as 23 definições +
todos os callables inicializam sem erro de API estática · seeds aplicam · **criarEvento**,
**vincularChip** e **registrarEntrega** chamados via HTTP no emulator (token de tenant real) →
efetivam (`prova-migracao-fieldvalue-2027` gravado c/ `criadoEm` de servidor; `insc-0002.chipNumero`
persistido) · log sem TypeError/serverTimestamp-undefined · tsc 0 · ESLint 0. Report:
`outputs/leela-build-2d6ee98d/FIREBASE-ADMIN-REPORT.md`. Botões criar/salvar de evento + balcão
DESTRAVADOS. QR server-side (S208) segue como frente Fable (segurança, escopo separado — não regressão).

## 🎯 REGRA (Vitor 2026-07-06): UX/UI se ancora no JTBD + critérios da story, NÃO no mockup
Todo sub-lote de fidelidade/UI carrega no brief a persona + JTBD + os critérios Given/When/Then da user story da tela (`leela-specs/`). Mockup = aparência; story = job; divergiu, a story vence. Personas/JTBD: `be-hero-documentacao/be-hero-docs/{personas,jobs-to-be-done}.md`; stories em `leela-specs/{epics,backlog}/`. Encodado no harness: L-004 + SKILL.md Phase 4 (injeção de JOB).
**Correções que a releitura dos JTBD produziu (aplicar):**
- **Financeiro (S207 = "financeiro DO EVENTO"):** NÃO reconstruir p/ o multi-evento do mockup — o build por-evento está CERTO. Só adicionar os gráficos bar/donut que servem "acompanhar resultado de relance". O MAJOR #15 da auditoria (escopo multi-evento) é DESCARTADO.
- **Inscritos (S203 + dor #1 "inadimplência invisível") SOBE de prioridade:** coluna de VALOR/pagamento + banner "N pendentes >72h" + seleção em massa servem o job número um do Organizador — antes de polir gráficos de outras telas.
- **Hub híbrido validado por S200** ("abrir rapidamente o evento que gerencio" = varredura densa + thumb p/ reconhecer + métricas inline + status).
**Fila de fidelidade reancorada por JTBD (recomendação, não ordem de tela):** Inscritos (dor #1) → Hub híbrido → Financeiro (só gráficos, per-evento) → Kits/Entrega (dor "kit errado"). Overview ✅ (feed em fix).

## ✅ LOTE #1 UX-DADOS: GATE PASS (4c7ffb1..6aaf73a, pushed) — fila avança p/ firebase-admin
TanStack Query (ADR-010) implantado strangler-fig. T1 fundação+provider · T2 gateway `lib/query/queries.ts` (queryOptions centralizados reusando api-client) · T3-T5 Visão Geral/Hub/Inscritos → useQuery nos hooks `_data/` (consumidores intocados). **Gate do maestro (por evidência):** @tanstack instalado + provider raiz + useQuery nas 3 telas + 0 fetch-on-mount cru + queryOptions reusam api-client (grep) · journey L-001 A→B→A = 0 req/0 skeleton (Playwright, pixel-idêntico) · suíte 516/516 · tsc 0 · ESLint 0 · build limpo. Placement do gateway em `apps/painel/src/lib/query/` (não no api-client compartilhado) RATIFICADO pelo maestro (mantém api-client framework-agnóstico, Fowler, reversível). Reuso-first cumprido: nenhum fetch provado reescrito. Nada visual novo → nada a documentar no showroom neste lote.
**Faltam migrar (lote UX-DADOS-2):** Financeiro + balcão (superfícies vivas → onSnapshot) · kits/estoque · Clubes (E05) · Plataforma (E16) · mutations → useMutation + invalidação (read-your-writes). Report: `outputs/leela-build-2d6ee98d/UXDADOS-REPORT.md`.
**Fila:** ~~UX-DADOS~~ ✅ → **firebase-admin (#2, próximo)** → histórico→tabela → RESP-MOBILE → DS-Forms → Onda 2.

## 🔧 RODADA AJUSTES SHOWROOM + DIAGNÓSTICOS (2026-07-06, Opus)
**Aterrissado e pushed:** fonte dos 2 temas no showroom (505f148) · home reativa ao tema (7b3929d) · **fix scroll fantasma do showroom (48eb2c2)** — root-cause medido no DOM: `.sr-only` do Stepper (absolute, top estático, ancestrais static) tinha bloco de contenção no `<html>`, esticando html.scrollHeight→3592 (viewport 911) = 2ª barra + scroll pro vazio; `html{overflow:hidden}` no showcase.css (padrão app-shell fixo, só o painel interno rola). Verificado: html scrollTop=0, painel rola 4378 e para limpo.
**EM VOO (Opus):** agente das IMAGENS reais no mock (`[LEELA-DS-SEED-IMG]`) — CardEvento já tem slot `media`, baixa fotos topicais grátis p/ public/seed-images/ + campo no seed + fiação no EventoCard.
**Pesquisa UI entregue:** `outputs/leela-build-2d6ee98d/UI-GUIA-SELECAO-E-TABELAS.md` (checkbox/radio/toggle/select/combobox/filtros/tabelas, citado NNG/Material/Polaris). **Veredito: histórico de atividades de Eventos → TABELA** (colunas timestamp/ator/ação/alvo/status, ordem desc); timeline só no drill de 1 registro.
**DIAGNÓSTICO reload de rota (pergunta do Vitor):** painel usa BrowserRouter (SPA real, NÃO recarrega o documento) MAS **não tem camada de cache** (zero react-query/swr) — cada tela refaz o fetch no mount → skeletons reaparecem = "carregar do zero". Não é bug quebrado; é arquitetura sem cache. Fix = store/cache de dados (react-query) → **candidato a lote UX-DADOS** (não despachado, decisão do Vitor).
**DIAGNÓSTICO escopo Eventos:** core de eventos ESTÁ construído (hub S200-T2, novo S201-T1, layout S202-T1, inscritos-tabela S203-T2, financeiro S207-T1, overview, entrega/balcão). Diferenças vs mockup = (1) ~13 módulos functions com `admin.firestore.*` estático FALHAM no emulator → botões criar/salvar não funcionam no preview (já na fila como firebase-admin) · (2) Onda 2 (23 lotes/71 tasks) não aberta · (3) oportunidade histórico→tabela acima.
**Fila vigente:** IMAGENS (em voo) → RESP-MOBILE → [UX-DADOS? decisão Vitor] → DS-Forms → firebase-admin → Onda 2. Barra do showroom segue GLOBAL (Vitor não pediu só-home).

## ✅ QA VIVO 2 CONCLUÍDO (83b2d47) · 🎯 RESP-MOBILE DIMENSIONADO · SHOWROOM-MODO EM VOO
Sessão agora em **Opus 4.8** (cota Fable esgotada — main e subagentes em Opus). Anexo A1/A2/A3 + fix do seed de conversão pushed (cc532da). QA vivo 2 concluído com Playwright headless (contorna clamp HiDPI do host que impedia mobile): **7 MAJOR / 1 minor · desktop 1440 = 0 defeito · todos os 7 MAJOR são mobile 390×844 com causa-raiz única**. Relatório: `outputs/leela-build-2d6ee98d/QA-LIVE-2-REPORT.md` (36 shots em shots-qa2/).
**RESP-MOBILE dimensionado (1 lote, ordem de fix):** M1 RootShell/Sidebar (drawer + remove offset fixo do `main` — destrava o refluxo sozinho) → M3 KpiRow (grid→1col) → M5 Table (card/scroll mobile) → M4 Header+TabNav (truncamento + overflow das abas) → M2 Toolbar/CTA, M6 EventRow, M7 prose caem por tabela. Componentes: RootShell/Sidebar (todas rotas) · Toolbar · KpiRow (5 rotas) · Header+TabNav (drills) · Table (inscritos/membros/tenants/macro) · EventRow · prose. Confirmado: NÃO são regressões, é o escopo mobile-real já decidido.
**DECISÃO VITOR (arquitetura de tema):** DS hoje acopla marca+modo num eixo só (brasa=laranja+escuro, leela=vinho+claro — semantic.ts: "leela inverte os neutros"). Vitor escolheu MANTER 1 eixo e só expor melhor — brasa/leela seguem sendo os 2 looks completos. **SEM toggle de modo separado** (redundante hoje). Desacoplar em 4 combos (marca × dark/claro) = ÉPICO FUTURO Onda 2, só se Vitor pedir.
**SHOWROOM-BAR: ✅ GATED PASS (5c98eb3, pushed).** Barra fixa secundária sticky no topo do showroom (todas as rotas) com seletor de tema brasa/leela — segmented control ARIA radiogroup (roving tabindex, setas, aria-checked, focus-visible), tokens puros, botão antigo removido. Gate do maestro: type-check 0, a11y e tokens verificados por leitura do diff (ShowroomBar.tsx novo + App.tsx). Arquivos: `showcase/src/ShowroomBar.tsx`, `showcase/src/App.tsx`.
**PENDENTE DE CONFIRMAÇÃO DO VITOR (ao abrir):** a barra ficou GLOBAL (todas as rotas do showroom), não só-na-home — o pedido citou "tela inicial" mas o brief autorizou global. Reverter p/ só-home é `route === 'inicio' &&` de 1 linha, se ele preferir.
**Fila:** RESP-MOBILE (dimensionado pelo QA-2, pronto p/ despacho) → DS-Forms & UX → firebase-admin → Onda 2 E04. Comandos de abertura local: showroom `pnpm --dir packages/design-system showcase` · painel `bash preview.sh` (5273, já logado/mockado).

## ⛔ CHECKPOINT 97-98% COTA FABLE (2026-07-06) — DESPACHOS FABLE ENCERRADOS
**Delta desde os 90%:** Lote Fidelidade T1-T6 COMMITADOS E PUSHED (f611082..16ac386 — inclui as 2 queixas do Vitor: sidebar T2, tabela T6). Agente Fable interrompido pelo Vitor no T7; **WIP de 51 arquivos no worktree** (varredura Clubs×Clubes + minors nas telas de clubes). Gates finais NÃO rodaram.
**AGORA:** finalizador do T7 + gates despachado em **OPUS 4.8** (decisão Vitor: concluir em Opus). Reset Fable ~03:50 America/Sao_Paulo. Pós-reset ou em Opus: QA vivo → DS-Forms & UX → firebase-admin → Onda 2 E04.

## 🔁 RETOMADA PÓS-CRASH DO TERMINAL (2026-07-06, ~11:16)
Terminal morreu por exaustão de recursos (erros de fork 0xC000012D às 11:05, timeout do `_fid_shots.mjs` às 11:10). Inventário na retomada: **T7 COMMITADO pelo finalizador (58a049a, árvore limpa, 0 WIP)** — inclui docs.mdx+LLM.txt dos 6 componentes novos, minors m2..m6 e PageHeader da Directive T6. **Gates NÃO rodaram** (suíte/tsc/ESLint/QA visual — o crash pegou o gate visual no meio). 58a049a pushed nesta retomada. **EM VOO: gate Fidelidade redespachado em OPUS 4.8** (suíte em blocos + tsc + ESLint no-hardcoded + QA visual vivo 1440×900 e 390×844). Fila inalterada após o gate: QA vivo → DS-Forms & UX → firebase-admin → Onda 2 E04.

## GATE FIDELIDADE: ✅ PASS 4/4 (c5d3d57, pushed) · ANEXO+QA VIVO EM VOO · NOVO LOTE NA FILA
Gate PASS: tsc 0 · ESLint 0 · suíte DS 836/836 em blocos · QA visual 4 rotas fiel. Boards atualizados. **EM VOO (Opus):** anexo A1-A3 (seed conversão p/ Sparkline · seed ciclismo+wellness p/ thumbs · quick actions "Comunicar" se houver superfície, senão DECISOES-ABERTAS) + QA vivo 2 completo (desktop+mobile, relatório incremental `QA-LIVE-2-REPORT.md`, sem fixes).
**NOVO LOTE (pedido Vitor 2026-07-06) — SHOWROOM-MODO, entra APÓS o QA vivo 2, ANTES de DS-Forms:** (1) dimensão **modo dark/claro** no DS — hoje INEXISTENTE (ThemeProvider só tem theme brasa|leela, zero token de modo): tokens de modo por tema (4 combinações), extensão do ThemeProvider (mode + persistência + atributo no root), matriz AA revalidada p/ 4 combos; (2) **barra fixa secundária no topo da tela inicial do showroom** com seletor de TEMA (brasa/leela) + toggle de MODO (dark/claro) — substitui o botão único do PageHeader. Execução Opus, gate/veredito maestro.
**Fila atualizada:** QA vivo 2 (em voo) → SHOWROOM-MODO → DS-Forms & UX → firebase-admin → Onda 2 E04. Entrega visual ao Vitor após SHOWROOM-MODO: showroom (`pnpm --dir packages/design-system showcase`) + painel mockado (`bash preview.sh`, 5273).

## ⚖️ DECISÃO VITOR 2026-07-06 — MOBILE REAL (EMENDA AO PRD) + NOVO LOTE RESP-MOBILE
Forense (`outputs/leela-build-2d6ee98d/RESPONSIVIDADE-FORENSE.md`): NÃO houve remoção de código responsivo; doc atual é desktop-first (PRD-01:161, min-width 1280 em handoff-claude-design:15; mockup be-hero.css sem @media). Perda real de reflow = colateral T5/T6 (flex→grid fixo no dashboard, fiel ao mockup). Colapso 2→1 da Visão Geral (E02) segue funcionando.
**Vitor decidiu: alvo passa a ser MOBILE REAL (390×844).** Lote RESP-MOBILE, posição na fila: após SHOWROOM-MODO, ANTES de DS-Forms (forms nascem sobre os breakpoints, evita retrabalho). Escopo: (0) emenda ao PRD-01 e handoff-claude-design — desktop-first → responsivo com alvo mobile, PRIMEIRA task do lote; (1) breakpoints tokenizados no DS (`screens` no tailwind-preset, decisão explícita); (2) AppShell overflow-hidden→drawer + Sidebar modo mobile (3 arquivos DS estruturais); (3) reflow dos ~6 componentes de grid fixo (EventRow, Table, Toolbar, KpiRow, countdown, side-panel) preservando fidelidade desktop 1440; (4) auditoria das ~114/139 telas sem prefixo responsivo, guiada pelos MAJORs do QA-LIVE-2-REPORT (insumo obrigatório); (5) projeto mobile no Playwright + viewport 390×844 nos gates visuais daqui em diante (fecha a promessa do handoff §3.5 nunca implementada). Execução Opus por sub-lotes com commits atômicos; gate/veredito maestro. Fidelidade ao mockup segue valendo EM DESKTOP; mobile segue os padrões do DS (mockup não tem referência mobile).
**Fila vigente:** QA vivo 2 (em voo) → SHOWROOM-MODO → RESP-MOBILE → DS-Forms & UX → firebase-admin → Onda 2 E04.

## (histórico) CHECKPOINT 90% DE COTA FABLE (2026-07-06, ~8% restante)
**EM VOO (único consumidor de fundo):** Lote Fidelidade (LEELA-DS-FID T1-T7) em Fable — brief `leela-ds-lote-fidelidade-enriched.md`. Commits atômicos por task; se morrer, WIP fica no worktree — retomar por despacho fresco com `git status` + o brief. **Despachos NOVOS em Fable: SUSPENSOS** até reset da cota (~03:50 America/Sao_Paulo).
**Fable restante reservado para:** (1) receber e gatear o retorno do Fidelidade (julgamento do maestro), (2) o passe de handoff a 97%. TODO o resto vai em **Opus 4.8** (roteamento calibrado, WIKI §3): QA ao vivo pós-Fidelidade, lote DS-Forms & UX, lote firebase-admin (~13 módulos — fix mecânico já validado 2×).
**Ordem de retomada pós-reset:** gate Fidelidade (se pendente) → QA vivo Opus → DS-Forms & UX → firebase-admin → Onda 2 E04. Boards 100% sincronizados em 54c4d0e.

**Onda 1: FECHADA** (gate final PASS, épicos em Feito, tags criadas — e8ff32d). Histórico anterior deste arquivo: ver git (versão de 2026-07-05).
**Frente ativa: consolidação do Design System (shadcn + brasa)** — brief vinculante `.nirvana/briefs/ds-consolidacao-shadcn-brasa.md` + enriquecido `leela-build-2d6ee98d-ds-lote-a-restante-enriched.md`.

## Estado do DS agora
- **Pushed até 3d42cff:** A1 aliases shadcn→brasa + Tooltip PoC · A2 motion tokenizado · A3 Button/Input/Badge/Skeleton/Separator/Breadcrumb shadcn stock.
- **Local (SEM push, aguardando gate do lote):** A4 Toast (6c5abf9) · A5 DropdownMenu c/ 13 testes WAI-APG portados (5662960) · A6 Card (e1dbe58) · A7 Avatar determinístico SEM radix-avatar — arbitragem do maestro, não reabrir (ed7a8f1) · A8 matriz AA 49 pares × 2 temas (0adf4f9). Suíte DS 556/556.
- **EM VOO:** finalizador do WIP órfão da sessão crashada — Modal/ConfirmModal/Tabs/Table (commits previstos A9/A10/A11; corrigir TS2375 do Table; sumário em `outputs/leela-build-2d6ee98d/DS-LOTE-A-RESTANTE-SUMMARY.md`).

## FILA AUTOMÁTICA (decisão do Vitor, 2026-07-06 — executar em ordem, sem perguntar de novo)
1. **Gate do Lote A completo** (suíte DS + tsc + ESLint no-hardcoded + matriz AA) → atualizar V1-KANBAN **e** V1-CHECKLIST com todos os hashes → **push** da aterrissagem (inclui docs: protocolo handoff-claude-design + DECISOES-ABERTAS).
2. **Despacho Lote B** (software-forge + magic-ds): lucide-react peer dep no DS · 8 ícones no DEFAULT_SIDEBAR_SECTIONS (fim do icon:null nos 3 consumidores) · sidebar FIXA 240px substitui colapsável · AppShell como layout raiz em App.tsx envolvendo /eventos e /clubes (~29 telas) · rodapé avatar/logo · **gate visual BLOQUEANTE** contra o export WEB-APPV2 (browser real, desktop 1440×900 + mobile 390×844).
3. **Pós-Lote B: despacho SHOWROOM ao squad magic-ds** — Storybook/showcase vivo na identidade do próprio DS, aplicando TODOS os componentes (tokens, temas brasa/leela, animações, sidebar fixa com ícones), com mds-storybook-scribe + build-local-showcase + audit-showcase + LLM.txt por componente.
4. **Entrega visual ao Vitor:** showroom + preview local do painel com todos os ajustes (`bash preview.sh`, portas 5273/8180; subir só com worktree estável). Avisar explicitamente que os dois estão prontos pra ele abrir.

## TRILHA PARALELA-3 — FLG & publisher: ✅ COMPLETA 3/3 FASES E PUSHED (2026-07-06)
F1 pesquisa (96 fontes, 4 docs) · F2 parecer da mesa (`04-parecer-conselho-flg.md`: GO condicional documentativo · NO-GO publisher pleno · GO semente/newsletter mensal ≤15% · 9 condições · K1-K5 · dissidências Jobs/Hormozi/Taleb) · F3 nyx-social (`produto/09-pautas/`: estratégia 2 perfis, calendário M0-M2, 24 pautas gated, blueprint newsletter — rec. de nome "Volte amanhã" = RN-118).
**PENDÊNCIAS DO VITOR (S1-S2 do calendário):** domínio + ferramenta de e-mail da lista Leela (BLOQUEANTE — sem pesquisa de origem, K2 conta como disparado) · handles/página LinkedIn da marca · acordo societário do ativo de audiência antes do 1º milhar · escolher nome da newsletter · quota 5 pitches/semana começa na S1 · 2 press releases working-backwards.
**Arbitragem aberta (maestro):** proposta da nyx de reformular ângulo L6.5 do `produto/08-linhas-narrativas.md` (conflita com via negativa/arquitetura) — aplicar no próximo toque em produto/.

## TRILHA PARALELA — Governança de produto: ✅ ENTREGUE E PUSHED (gate PASS 2026-07-06)
Vault `produto/` completo: 12 notas, lint 0 órfãs/0 links quebrados, commits 6e2a2b5..cda886c. 6 linhas narrativas prontas (L1 anti-streak · L2 clube>solo · L3 game master · L4 economia do produtor · L5 atleta comum · L6 build in public). Lacunas registradas: retenção 2x = dado emprestado (regra: "dado de mercado, nunca nosso") · 95 stories reais (não 77) · E14/E15 sem arquivo de épico.
**nyx-social:** aguarda o parecer do strategic-council (fase 2 da trilha FLG) para despacho ÚNICO com roster de 2 perfis (Vitor + Leela), usando 08-linhas-narrativas + 09-pautas/README como insumos.

## Decisões novas (2026-07-05/06, já em leela-specs/DECISOES-ABERTAS.md)
- Parcelamento **COM juros 3,49% a.m., tabela Price, repassado ao comprador** (coef. 12x = 0,103424/parcela ≈ +24,11%).
- Taxa de serviço: percentual puro **ou percentual + fixo (ex.: 8% + R$2,00)**, configurável por tenant no CommercialTerms.

## Regra vinculante NOVA (Vitor 2026-07-06 — vale p/ TODO lote daqui em diante)
**Showroom = fonte-de-verdade + reuso-first.** (1) Todo componente/padrão novo é DOCUMENTADO no showroom no mesmo lote; o showroom é CONSULTADO antes de construir qualquer UI (mesmos botões/componentes, consistência de código). (2) SEMPRE procurar e reusar código existente, provado e funcionando antes de escrever novo — reusar quando fizer sentido em performance. Vira checagem de gate de UI: "consultou/reusou o existente?" + "documentou no showroom?". Par do padrão de design do harness (design-principles.md + design-critique + adr-conformance).

## Regras vigentes (inalteradas — detalhe WIKI §3/§6)
Roteamento CALIBRADO (Vitor 2026-07-06): Opus 4.8 p/ QA visual de rotina/smoke e execução mecânica · Fable p/ vereditos de gate, root-cause, fix-loops, reviews e arbitragens · Sonnet PROIBIDO — detalhe no WIKI §3 · 1 task = 1 commit `[LEELA-DS-*]` · staging cirúrgico · mutexes · suíte em blocos (máquina 8GB) · handoff a 90%+97% · review antagonista antes de gate · relatórios em outputs/ no ato · audit JSONL (`~/.harness-logs/`) por evento · push por aterrissagem de lote (maestro).

## Retomada se a sessão morrer
`git status` → inventariar WIP · conferir último sumário em outputs/ · executar a FILA AUTOMÁTICA do ponto onde parou. Onda 2 (23 lotes/71 tasks, `.nirvana/plans/onda2-decisoes.md`) abre APÓS o item 4 da fila.
