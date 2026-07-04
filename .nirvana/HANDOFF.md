# HANDOFF — LEELA build (trace leela-build-2d6ee98d) · para TERMINAL NOVO

Escrito em 2026-07-04 ~15:5x UTC a pedido do Vitor. Sessão anterior encerrada de forma limpa:
ZERO agentes em voo, mutexes livres, tudo relevante commitado e pushed.
**IMPORTANTE (sessão nova):** os agentes da sessão anterior NÃO existem mais — toda retomada é por
despacho fresco usando os briefs versionados abaixo. Frase de entrada: **"retomar leela"** + ler este arquivo.

## Marcos fechados e pushed (github.com/inguz-studio/leela-projects, branch main)
- **E00 Fundação — gate_passed** (tag `e00`): pipeline 20/20 --force, Emulator 165/165 zero skip.
- **E01 Design System — gate_passed** (tag `e01` = 5cbaea3): 26+5 achados fechados, re-review
  antagonista pass, 502/502 testes, 104 asserts de contraste.
- **E16·S1600 Multi-tenant — done** (onda 0): exploit corrigido, 150/150.
- **E03-L1 COMPLETO ✅** (3/3 tasks): 475574d (S200-T1 Evento+query+rules agregados),
  8caec72 (S203-T1 subcoleção inscritos + cursor 18/pág), df09392 (S205-T1 kits+itensKit N:N
  + Function itemKitIndex). **Emulator 284/284 zero skip** (165 baseline + 119 novos, zero regressão).
- **E05-L1 parcial**: S101-T1 commitado (ee39d9a — coleção clubes + código-convite + Rules + seed).

## WIP NÃO commitado no working tree (inventário por dono)
- **E05-L1 (S103-T1 Cloud Functions de clubs):** `functions/src/clubs/` (novo, untracked),
  `M packages/core/src/clubs/index.ts`, `M packages/core/src/index.ts`.
- **E16-L1 (0 commits):** `M functions/src/platform/tenantLifecycle.ts` + `M functions/src/__tests__/tenantLifecycle.test.ts`,
  `functions/src/platform/provisionTenant.ts`, `functions/src/seed/{platformAdmin,commercialTerms}.seed.ts`,
  `functions/src/seed/emulator-guard.ts`, testes untracked: provisioning, provisionTenant.integration,
  tenantLifecycle.integration, commercialTerms, commercialTermsRules.integration, platformAdminSeed,
  `M functions/src/index.ts` (wiring).
- Estado da suíte com esse WIP: 378/408 no worktree — os 30 vermelhos estão TODOS nos 4 arquivos de
  teste WIP do E16 (ex.: provisionTenant.integration exige Auth emulator). Código commitado: 284/284.

## Retomada no terminal novo (ordem exata)
1. **Despachar E05-L1-b e E16-L1-b em paralelo (Fable, general-purpose):**
   personas `~/businesses/software-forge/employees/` (sf-backend-engineer p/ E05, sf-platform-lead p/ E16);
   cada um lê `.nirvana/plans/onda1-decisoes.md` (vinculante) + seu brief
   (`.nirvana/briefs/onda1-E05-lotes.md` / `onda1-E16slim-lotes.md`) + o inventário WIP acima;
   instrução-chave: **inventariar o WIP com git status, rodar os testes, commitar o que passa
   (1 task = 1 commit [LEELA-S###-T#]) e completar o lote L1**. E16: auditar tenantLifecycle
   existente, provisioning idempotente, bootstrap platform_admin com guard; os testes de
   integração que exigem Auth emulator → subir Auth emulator no run (`--only firestore,auth`).
2. **REVIEW-ONDA1-L1** (Fable, sf-qa-engineer antagonista): os 3 lotes L1 juntos — cross-tenant deny,
   RBAC, idempotência/counters, qualidade dos testes. Persistir relatório em `.nirvana/outputs/leela-build-2d6ee98d/`.
3. **Root-cause mobile exit 134** (SIGABRT 1x/5 sob paralelismo pesado, ressalva do QA no E00) +
   **gate formal da Onda 0** (turbo total com design-system reincluído) — paralelizável com o passo 2.
4. **L2s Fable**: E03-L2 (Functions transacionais criar/publicar/chip/financeiro), E05-L2 (motores
   desafios/parcerias/comunicados). **Telas Opus destravadas** (E01 pass): E03-L3/L4/L5, E05-L3/L4/L5,
   E16-L2/L3. **E02-L1 (Fable)** só após review do passo 2 aprovar E03-L1+E05-L1; depois E02-L2/L3 (Opus).
5. Gates por épico conforme fecham (review antagonista → gate_passed → V1-KANBAN → **push + tag**
   e03/e05/e02/e16-slim) → gate da Onda 1 → **Onda 2** (E04 → E12 → E08+E06) → **Onda 3** (E13-slim + tag v1).

## Ambiente e pendências herdadas (decisões de maestro em aberto)
- **Java 21 Temurin portátil em `~/.jdks/jdk-21.0.11+10`** (máquina só tinha JDK 17; firebase-tools
  15.22.4 exige ≥21). Runs usam JAVA_HOME explícito — NÃO está no PATH global.
- Coleção `/inscritos` top-level legada do S1600 coexiste com a subcoleção canônica
  `eventos/{id}/inscritos` do E03 — decidir migração (recomendação: migrar testes S1600 e aposentar
  a legada num lote curto antes do gate da Onda 1).
- Triggers v1 (`syncItemUsadoEm`/`syncItensDoKit`) testados por chamada direta; suite não sobe
  Functions emulator — aceitável agora, revisitar no gate da onda.
- Premissa E03: capacidade dos kits 80/260/300/60 (protótipo só mostra contagens de escolha).
- Follow-ups estacionados do E01 (entram como tasks na Onda 1): diretriz de marca (laranja AA nos
  botões primary), teste Playwright do reposicionamento do Popover, token border-hover, auditoria
  de motion, paleta accent lima órfã.

## Regras vigentes (inalteradas)
- **Roteamento:** Fable = backend/rules/pagamentos/auth/segurança + TODA review antagonista/gate.
  Opus = telas que consomem DS, docs, planejamento. Sonnet PROIBIDO.
- 1 task = 1 commit atômico `[LEELA-S###-T#]`. Mutex `mkdir .forge-mutex` (commits/install) e
  `mkdir .rules-mutex` c/ HOLDER.txt (firestore.rules; reler o arquivo do disco após adquirir).
- Ritual por lote: review antagonista + testes + V1-KANBAN.md + audit
  (`~/.harness-logs/YYYY-MM-DD/audit.jsonl`, trace leela-build-2d6ee98d). Relatórios de review
  persistidos em `.nirvana/outputs/<trace>/` no ato (dir é gitignored — cópia local apenas).
- Push a cada gate_passed + tag por épico. Handoff atualizado a ~90% de contexto (regra do Vitor).
- Emulator-only, sem chaves reais. Windows: Git Bash nos agentes.
