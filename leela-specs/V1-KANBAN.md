---

kanban-plugin: board
tags:
  - leela
  - v1
  - kanban

---

## 📋 Backlog
- [ ] **O1** · E02 · Dashboard do produtor — 7T · dep E03-L1+E05-L1 (agregados)
- [ ] **O2** · E04 · Config & Vendas (+ afiliação/split) — 19T · dep E03
- [ ] **O2** · E12 · Landing + checkout público — 18T · dep E04
- [ ] **O2** · E08 · Promotor self-service — 4T · dep E04
- [ ] **O2** · E06 · Comunicação do evento — 5T · dep E03
- [ ] **O3** · E13-slim · App do atleta (mínimo) — 14T · dep E12,E05


## 🔨 Fazendo

- [ ] **O1** · E03 · Operação do evento — **L1 ✅ 3/3T** (475574d, 8caec72, df09392 · Emulator 284/284 zero skip) · L2-L5 na fila · escopo S200–S207
- [ ] **O1** · E05 · Clubs núcleo — **L1 ✅ 2/2T** (ee39d9a, e2762f8 · 57 testes novos · suíte 503/503 zero skip) · em REVIEW-ONDA1-L1 · L2/L3 destravados
- [ ] **O1** · E16-slim · onboard tenant + termos — **L1 ✅ 6/6T** (2ec1e85, 0eca288, 73e8366, 1d5e1af, de14546, 7876d9b · suíte 503/503 zero skip c/ Auth emulator) · em REVIEW-ONDA1-L1 · 5 pontos sinalizados p/ review antagonista


## 🔍 Revisão

- [ ] **O1** · REVIEW-ONDA1-L1 — **CONCLUÍDO 2026-07-04**: E03 pass-c/-ressalvas · E05 pass-c/-ressalvas · **E16 FAIL** (#1 crítico stale-claim rollback→takeover cross-owner; #2 alto reuso Auth por e-mail sobrescreve claims) · **gate Onda 1 BLOQUEADO** · relatório em .nirvana/outputs/leela-build-2d6ee98d/REVIEW-ONDA1-L1.md
- [ ] **O1** · FIX-ONDA1-E16 — **EM EXECUÇÃO** (sf-platform-lead/Fable): fix #1 + #2 c/ testes de injeção de falha pós-setCustomUserClaims + aposentar /inscritos legada (#4) · re-review na sequência
- [ ] **O1** · Follow-ups do review (não bloqueiam gate, datar na Onda 1): #3 teste adversarial cross-tenant em `eventos` · teste de leitura deny do lifecycleAudit · protocolo `.index-mutex` p/ arquivos-índice compartilhados (adotar nas regras do HANDOFF)


## ✅ Feito

- [x] **O0** · Gate da Onda 0 — **PASSED 2026-07-04** · root-cause exit 134: `process.exit(0)` do expo CLI c/ handles libuv vivos sob oversubscription (não era OOM) · fix config `f9f5acb` (turbo concurrency 6 + metro maxWorkers 2, tempo de pipeline inalterado) · 5 runs consecutivos 23/23 tasks verdes c/ DS reincluído · Emulator 515/515 · relatório GATE-ONDA0.md
- [x] **O0** · E01 · Design System — 10/10T + 26 achados REVIEW-E01 + 5 do REVIEW-E01-b fechados · re-review antagonista Fable: **pass** (tag `e01`) · 502/502 testes, 104 asserts de contraste (48 pares × 2 temas), matriz independente do revisor bate com a do autor · follow-ups Onda 1: diretriz de marca (laranja AA) + Playwright Popover
- [x] **O0** · E00 · Fundação técnica — 10/10T + 19 achados fechados · VERIFY-FIX-E00 Fable: **pass** (tag `e00`) — gate 20/20 verde (--force) + Emulator Java 21 165/165 zero skip · residuais críticos: strict env escondia skip das rules; race .next/types
- [x] **O0** · E16·S1600 · Multi-tenant (isolamento+claims) — 3/3T · exploit de takeover corrigido · 150/150 testes no Emulator (Java 21) · teste de regressão commitado



## ❄️ Fora da V1

- [ ] Épicos adiados: E07 Estados · E09 Financeiro · E10 Marcas · E11 Analytics · E14 Integrações de treino · E15 Creator Studio (MyDose)
- [ ] Recortes pós-V1: desafio anti-streak (E05) · recorrências de mensalidade (E16 S1603/S1604) · campanhas & automações (E06) · jornada heroica/medalhas/sync (E13)




%% kanban:settings
```
{"kanban-plugin":"board","list-collapse":[false,false,false,false,false]}
```
%%