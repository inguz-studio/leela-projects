# Onda 1 · E05 — Clubs (núcleo + desafio mínimo) · brief de lotes

Recorte V1 = **~22T = S101–S111** (Kanban; S111 é placeholder XS). Dep: E00 (feito), E01. Desafio em versão mínima (sem anti-streak).

Roteamento: **Fable** = data-model/Functions/rules/core-negócio; **Opus** = telas painel. 1 task = 1 commit.

## Lote E05-L1 · Núcleo de dados do clube — FABLE
- Tasks: S101-T1 (`clubes` + tipos + código-convite + Rules + seed), S103-T1 (`membros` + `derivarStatus` + Function agregados + cron + Rules)
- Superfície: `packages/core/src/clubs/{clube,codigo-convite,membro}.ts`, `packages/api-client/src/clubs.ts`, `functions/src/clubs/*`, `functions/src/seed/{clubes,membros}.seed.ts`, `firestore.rules`
- Dep: E00. **Bloqueia S101-T2, S102-*, S103-T2** + toda L2 + E02 (KPIs de clube).
- Aceite: `validarCodigoConvite('8A3K9')` válido; código com `0/O/1/I/L` inválido (RN-101); não-owner não lê clube privado (Rule); `derivarStatus` = novo(<7d)/inativo(30d+ sem atividade)/ativo (RN-102); onWrite incrementa `qtdMembrosAtivos` idempotente; cliente não escreve `status`/agregados (Rule nega). Rules reusam helpers multi-tenant de S1600-T3 (feito).

## Lote E05-L2 · Motores de domínio (desafios, parcerias, comunicados) — FABLE
- Tasks: S105-T1 (`desafios`+`catalogoAcoes` seed 16 + junção `acoes` + Rules), S106-T1 (motor pontuação + validação de modelo, core puro), S107-T1 (`parcerias` + espelho read-only programa + agregados + Rules), S108-T1 (`comunicados` + limite push + agregados + Rules), S109-T1 (segmentação + validações, core)
- Superfície: `packages/core/src/clubs/{desafio,catalogo-acoes,pontuacao,desafio-validacao,evento-vinculo,comunicado,segmentacao}.ts`, `functions/src/clubs/*`, `functions/src/seed/{catalogoAcoes,desafios}.seed.ts`, `firestore.rules`
- Dep: E05-L1 (todos ←S101-T1; S106-T1←S105-T1; S109-T1←S108-T1)
- Aceite: seed cria exatamente 16 ações (7/5/4 por pilar, RN-114); Modelo A exige `meta` por ação, B/C não; `calcularPontos` aplica +20% (3 pilares/dia) e +10% (5+ dias/semana), acumuláveis (RN-115); Modelo C sem mínimo por pilar → `validarPublicacao` erro (RN-111); `copyPreparacao('Meia Maratona Floripa 2026')` → "(Preparação para …)" (RN-113); comunicado respeita 4 push/semana (RN-133) e 160 chars (RN-134); comissão read-only p/ clube (RN-120/122).

## Lote E05-L3 · Shell, hub, overview, membros, convite — OPUS
- Tasks: S101-T2 (hub 2 zonas + KPIs), S102-T1 (shell clube: header 96px + sub-nav 6 tabs), S102-T2 (Overview: 4 KPIs + tabela novos membros), S103-T2 (lista membros: filtros combináveis + popover), S104-T1 (modal convite 3 tabs + `core/convite`)
- Superfície: `routes/clubs/*`, `routes/clubs/[slug]/{membros,...}/*`; S104 adiciona `packages/core/src/clubs/convite.ts` (validação pura, sem segurança)
- Dep: E05-L1 (dados) + E01. S102-*/S103-T2 ← S102-T1 (shell).
- Aceite: hub owner+parceiro nas 2 zonas (RN-100), popover exclusivo (C3); shell mostra header + sub-nav c/ contadores pill + código 8A3K9 copiável (RN-101); Overview 4 KPIs + tabela densa de novos membros (nunca grid avatares); busca "Camila" filtra + contador; filtros status×papel = interseção; zera → EmptyState; remover/transferir → ConfirmModal §2.15; modal convite: `validarConvite` 1–50 ok, 0 ou 51 inválido (RN-106), 4 vias de fechamento (C10).

## Lote E05-L4 · Desafios & Parcerias (telas) — OPUS
- Tasks: S105-T2 (lista desafios + filtros + popover 6 ações), S106-T2 (editor 70/30 + modelo dual + preview ao vivo), S107-T2 (tela parcerias 3 blocos + aceitar/recusar), S107-T3 (modal add patrocinador), S107-T4 (modais destrutivos §2.15), S107-T5 (modal termos read-only)
- Superfície: `routes/clubs/[slug]/{desafios,parcerias}/*`
- Dep: S102-T1 (L3), S105-T1/S106-T1/S107-T1 (L1/L2)
- Aceite: chip modelo "C" + busca "Floripa" → só Preparação Meia Floripa; filtro zera → EmptyState; popover 6 ações; editor create sem `?id` / edit com `?id` pré-preenchido; Modelo C sem mínimo por pilar → erro ao publicar (RN-111); marcar ação recalcula resumo+preview ao vivo (C16); aceitar parceria → link master + cupom rastreável (RN-125); termos do programa read-only (RN-122); desativar/remover → ConfirmModal c/ preview (RN-124).

## Lote E05-L5 · Comunicação, Configurações & placeholder — OPUS + FABLE
- Tasks: S108-T2 (lista comunicados), S109-T2 (editor 70/30 + preview Push/Email), S110-T1 (configurações 25/75 scroll-spy + toggles/permissões), S111-T1 (modal placeholder sub-afiliação) [OPUS]; S110-T2 (deletar clube §2.15+LGPD + export Function) [FABLE]
- Superfície: `routes/clubs/[slug]/{comunicacao,configuracoes}/*`; S110-T2 → `functions/src/clubs/deleteClube.ts` + export dados
- Dep: S102-T1 (L3), S108-T1/S109-T1 (L2); **S110-T2 ← S110-T1** (sequenciar o Fable após a tela)
- Aceite: comunicados filtráveis por 3 grupos + popover contextual; editor preview push (160 chars) vs email (imagem capa, RN-135); 6 permissões admin independentes (RN-142); deletar clube irreversível c/ disclaimer LGPD + export 90 dias (RN-144); sub-afiliação só placeholder (RN-105).
- Nota: S110-T2 é a única superfície Fable deste lote — despachar isolada após S110-T1.

## Sequência interna E05
`L1 → L2 → (L3 ∥ L4 ∥ L5telas)`; L4 e L5 exigem L2. S110-T2 (Fable) por último. L3 pode começar assim que L1 fecha.

## Paralelismo entre épicos
- Telas em `routes/clubs/*` não colidem com E03/E02/E16. **Barreira = `firestore.rules`** (L1/L2 escrevem regras — coordenar com E03-L1/E16-L1). `functions/src/seed/*` por coleção (baixo risco).
- E02 depende de `qtdMembrosAtivos`/`qtdDesafiosAtivos` → **E05-L1 (e idealmente L2) antes de E02**.

## Riscos / entidades compartilhadas
- **Clube/Membro** nascem em E05-L1 → consumidos por E02 (KPIs) e E16 (rollups leem `clubes.tenantId`). **E05-L1 é primeiro-movedor.**
- **Evento** é consumido (leitura) por S105/S107 (vínculo de desafio/parceria) → depende de E03-S200-T1 existir. Se E05-L4 rodar antes de E03-L1, mockar o vínculo ou sequenciar E03-L1 antes de E05-L4.

## Decisões pendentes
1. **Vite vs Next.js** (mesma de E03): paths reais em `apps/painel/src/routes/`, não `app/`. Bloqueia telas.
2. **Lacuna de protótipo**: `Club-Desafios.html` e `Club-Configuracoes.html` não existem em `WEB-APPV2 (1)/` — usar SPEC-01 §2.5/§2.10 como fonte (afeta S105-T2 e S110-T1). Recomendação: gerar os HTMLs faltantes ou aceitar a descrição textual como contrato.
3. **Contagem 22T vs 23 tasks** na spec — diferença de 1 (provável S111 placeholder não contado). Sem impacto de execução.
