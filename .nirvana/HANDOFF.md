# HANDOFF — LEELA build (trace leela-build-2d6ee98d) · atualizado 2026-07-06

## ⛔ CHECKPOINT 97-98% COTA FABLE (2026-07-06) — DESPACHOS FABLE ENCERRADOS
**Delta desde os 90%:** Lote Fidelidade T1-T6 COMMITADOS E PUSHED (f611082..16ac386 — inclui as 2 queixas do Vitor: sidebar T2, tabela T6). Agente Fable interrompido pelo Vitor no T7; **WIP de 51 arquivos no worktree** (varredura Clubs×Clubes + minors nas telas de clubes). Gates finais NÃO rodaram.
**AGORA:** finalizador do T7 + gates despachado em **OPUS 4.8** (decisão Vitor: concluir em Opus). Reset Fable ~03:50 America/Sao_Paulo. Pós-reset ou em Opus: QA vivo → DS-Forms & UX → firebase-admin → Onda 2 E04.

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

## Regras vigentes (inalteradas — detalhe WIKI §3/§6)
Roteamento CALIBRADO (Vitor 2026-07-06): Opus 4.8 p/ QA visual de rotina/smoke e execução mecânica · Fable p/ vereditos de gate, root-cause, fix-loops, reviews e arbitragens · Sonnet PROIBIDO — detalhe no WIKI §3 · 1 task = 1 commit `[LEELA-DS-*]` · staging cirúrgico · mutexes · suíte em blocos (máquina 8GB) · handoff a 90%+97% · review antagonista antes de gate · relatórios em outputs/ no ato · audit JSONL (`~/.harness-logs/`) por evento · push por aterrissagem de lote (maestro).

## Retomada se a sessão morrer
`git status` → inventariar WIP · conferir último sumário em outputs/ · executar a FILA AUTOMÁTICA do ponto onde parou. Onda 2 (23 lotes/71 tasks, `.nirvana/plans/onda2-decisoes.md`) abre APÓS o item 4 da fila.
