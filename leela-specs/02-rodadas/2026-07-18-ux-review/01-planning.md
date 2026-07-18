# 01-planning · Lotes, execução e placar · revisão UX 2026-07-18

> Reconstruído dos eventos `dispatch_*`, `gate_passed`, `delivered`, `lane_completed` e `verify_passed` do audit (`~/.harness-logs/2026-07-18/audit.jsonl`, trace `leela-build-2d6ee98d`). A ata verbatim está em [[00-review]]; a spec em [[03-stories]] · [[04-tasks]] · [[05-rns-delta]].
>
> A revisão gerou **duas famílias de execução**: os **lotes de spec R9-A..F** (planejados em [[04-tasks]]) e as **rodadas de UI R10-R14** (landing/checkout/bug, resposta direta aos adendos 9-13). Todas rodaram pela business **software-forge**, multi-lane sobre uma árvore única. Uma queda de terminal às ~11:10 forçou 4 retomadas.

## Placar dos lotes de spec (R9-A..F)

| Lote | Escopo | Executor | Modelo | Estado | Evidência |
|---|---|---|---|---|---|
| **R9-A** | Conformidade de DS/UI (contraste AA por estado, Popover/Command/Combobox, `Calendar`/`DateRangePicker`, divisórias RN-229, upload-only RN-168) + adendo 12 (SubNav scroll, header sem busca) | sf-frontend-lead | Opus | ✅ **Feito** | `9d597c7`..`717ead6` + ret `45e8b36`/`f949ec2`/`f356788`/`1181cd0` · DS 1037/1037 · painel 1132/1132 · matriz AA verde (1.09→4.18) |
| **R9-B** | Análise financeira unificada (`/financeiro`): filtro por evento + calendário + cohort 5-em-5 (RN-822) + repasses consolidados (RN-358) | sf-frontend-lead | Opus | 🔄 **Em aberto** | despachado 11:34; **sem `gate_passed`** no audit — telas pendentes, retomar sobre o Calendar do R9-A |
| **R9-C** | Imagens: kit 1:1 (RN-227) + capa/banner horizontal na página de vendas (RN-228) | — | — | 📋 **Não iniciado** | não despachado nesta rodada |
| **R9-D** | Fluidez de navegação (rotas "carregando", L-002/ADR-010) | — | — | 📋 **Não iniciado** | não despachado nesta rodada |
| **R9-E** | Marketing/marcas antecipado: afiliados E08 (RN-313..319) + patrocinador reutilizável + logo 1:1 (RN-171) + `BrevoProvider` (RN-137) | sf-backend-lead (backend) + sf-frontend-engineer (UI) | Fable + Opus | ✅ **Feito** | backend `6203e0a`..`7919c3c` + UI `04154f4`..`bd86ba7` · 22 integ + 38 unit + regressão verde · 2 rodadas antagonistas (2 fixes de segurança) |
| **R9-F** | CRM + hub Comunicação (E19, RN-172, PII) | — | — | 🧊 **Bloqueado** | 3 decisões abertas (base legal LGPD · unificação CRM×Comunicação · chave CPF vs e-mail) — defaults propostos em [[DECISOES-ABERTAS]] |

## Rodadas de UI e correções (R10-R14)

| Rodada | Escopo | Executor | Modelo | Estado | Evidência |
|---|---|---|---|---|---|
| **R10** | Bug "ver página pública" não abre a LP (env `DOMINIO_LEELA` placeholder) | sf-frontend-engineer | Opus | ✅ **Feito** | `6a29180` (`linkPublico.ts` + `VITE_LEELA_URL` + botão desabilitado em rascunho) · curl 200/404 · 10/10 |
| **R11** | Convenção dos boards (cards de 1 linha, 3 altitudes) | sf-ux-engineer | Opus | ✅ **Feito** | `78dd0a8` (+`6a29180`) · CONVENCAO-BOARDS + BOARD-EPICOS + BOARD-HISTORICO + V1-KANBAN reescrito |
| **R12** | Landing (adendo 9): identidade DS, sem chip/prova social, +modalidade, galeria mock, página-calendário do organizador ref Luma + patrocinadores | sf-frontend-engineer | Opus | ✅ **Feito** | `9a52640`/`be4f4ba`/`7c6fd95` + `534d38a`/`029b76f`/`6fceaa4` · tsc/lint/build 0 · smoke SSR 200/404 · aws-reviewer 8.5 |
| **R13** | Checkout (adendo 10): DS/tipografia, 3 etapas visíveis (5 internas), form vertical, footer wordmark, kits com hierarquia/descrição/imagem | sf-frontend-engineer | Opus | ✅ **Feito** | `f617a32`/`448abb4`/`6e03230`/`27d2b7a` · tsc 0 · eslint 0 · next build 9/9 · gap do kit em `05-discovery/R13-kit-model-gap.md` |
| **R12-fix** | Bug "layout meio quebrado" + adendo 13 (mock em todos os slots) | sf-frontend-engineer | Opus | ✅ **Feito** | veredito `stale_server` (não é bug no código) + `91c697a` (mock avatar organizador + logos 1:1) · build 10/10 · rota 200, 0 console errors |
| **R14** | Fechamento da landing: fix título duplicado + gate runtime do checkout + passe aws-reviewer | sf-frontend-engineer | Opus | 🔄 **Em voo** | despachado 12:17; sem `gate_passed` no audit desta rodada |

## As 4 retomadas (pós-queda de terminal ~11:10)

Despachadas às 11:14 com os briefs `leela-retomada-*-enriched.md` (validar WIP em disco, completar, gates determinísticos, commit incremental):

| Retomada | Lane | Executor | Desfecho |
|---|---|---|---|
| **R9-A-ret** | R9-A | sf-frontend-lead (Opus) | ✅ WIP validado; Calendar + adendo 12 completados; gate verde |
| **R9-E-ret** | R9-E | sf-backend-lead (Fable) | ✅ WIP íntegro (~1477 inserções); **despacho duplicado** commitou o mesmo WIP em paralelo (`6203e0a`..`7919c3c`, byte-idêntico) — sem duplicar commits; gates + review antagonista re-provados |
| **R12-ret** | R12 | sf-frontend-engineer (Opus) | ✅ WIP F1/F2/F3+sponsor presente; gates estáticos + smoke SSR verdes; push `717ead6`..`27d2b7a` |
| **R13-ret** | R13 | sf-frontend-engineer (Opus) | ✅ WIP da lane derrubada reaproveitado do report (stepper/kit/tipografia) + completado; R9-E ref-logic preservada |

## Incidente L-009 (registrado no ledger)

Multi-lane em árvore de trabalho única + `git stash -u`/autostash concorrente = **destrutivo** para os arquivos untracked de outra lane. Aconteceu: o autostash da lane R9-A varreu duas vezes o working tree da R13 (arquivos novos deletados; código preservado no report e re-aplicado). **Lição:** serializar lanes que compartilham árvore; nunca usar stash com `-u` numa árvore com WIP de outra lane.

## Pendências herdadas

- **`BREVO_API_KEY`** — única externa do e-mail; ação do Vitor. Liga os 3 consumidores (convite E18, convite influenciador PF, campanhas E06); e2e `BREVO_E2E=1` fica skip documentado.
- **HIP-R9-01 (pré-compra)** — hipótese, pendente validação com organizador; default = RN-315.
- **UI do painel R9-B** — lote despachado, telas sem gate; retomar sobre o Calendar já pronto.
- **Página `/convite/afiliado`** — aceite PF landou (`eccfbd0`); smoke live de click-through (firebase) fica para o Vitor.
- **R9-C / R9-D** — não iniciados (imagens de kit/capa; fluidez de rotas).
- **R9-F / E19-CRM** — bloqueado por 3 decisões (base legal, unificação, chave).
- **R14** — fechamento da landing em voo.
- Rotação da chave prod do Asaas (MANDATÓRIA) — ação do Vitor.
