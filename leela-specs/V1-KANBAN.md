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

- [ ] **O1** · E03 · Operação do evento — **20/20T ✅ (núcleo S200–S207 completo)** · L1 ✅ 3/3T · L2 ✅ 4/4T (fcb7e1b, 908359c, 6fe2e9f, a0a48b3 + follow-up 9530caa) · L3 telas ✅ 4/4T (f599032, 9781173, 83d4036, d97250f) · **L4 telas ✅ 3/3T** (3da2976 S203-T2 inscritos · 6de9e43 S204-T1 balcão · 3dff94b S204-T3 galeria) · **L5 telas ✅ 6/6T** (d4bb22f S205-T2 · 9f9f463 S205-T3 · 60092e0 S205-T4 · 0d4a3da S206-T1 · 11adcae S206-T2 · 9e181ca S207-T1) + swap porta S201-T1 (3706b6b) + wrappers api-client balcão/financeiro (0698aa4) + tipos de kit no barrel (0fff0e5) · **124/124 na suíte de eventos do painel, tsc+lint verdes no escopo** — falta review antagonista da onda
- [ ] **O1** · E05 · Clubs núcleo — L1 ✅ 2/2T · **L3 telas ✅ 5/5T** (af18fe8, adc9c93, b0f991b, 171222b, 19103a1 · 49/49) · **L2 motores ✅ 5/5T** (43cf589 S105-T1 · 22431eb S106-T1 · cd591cf S107-T1 · c83532c S108-T1 · da301cf S109-T1 · suíte functions 844/844 no Emulator, zero skip, zero regressão nos rastreados) — contratos das telas PUBLICADOS: `removerMembro`/`transferirPropriedade` + `enviarConvites(clubeId, emails[])` via callable + wrappers tipados no api-client (f463337; falta só o wire nos containers, dono L3) · L4/L5 DESTRAVADOS
- [ ] **O1** · E16-slim · onboard tenant + termos — L1 ✅ 6/6T + fixes + HOTFIX ✅ · **L2 telas ✅ 4/4T** (e5ce3a5, 704f17a, 1103d1e, da27d37 · 62/62 RTL) · falta só review da onda (inclui hotfixes)
- [ ] **O1** · E02 · Dashboard do produtor — **L1 ✅ 1/1T** (c48b0e6) · **L2/L3 telas ✅ 6/6T** (6b11674 S600-T3 · d15fa06 S601-T1 · c451d01 S601-T2 · da20569 S602-T1 · 8e9ae80 S602-T2 · +S600-T1 rota/shell/layout · 206/206 na suíte do painel, zero regressão · build+tsc+lint verdes) — consomem `getOverview` (KPIs+alerts, 1 round-trip) + `listarEventosDoOrganizador`; falta review antagonista da onda


## 🔍 Revisão

- [ ] **O1** · Follow-ups do review (registrados por exigência do gate; não bloqueiam): **#8 [médio]** corrida onCreateUser×provisionTenant → no HOTFIX em voo · **R1 [baixo]** ordem do rollback → no HOTFIX · R3 caminho feliz destrói claims não relacionadas (hipotético, registrado) · **#3 ✅ FECHADO** teste adversarial cross-tenant em `eventos` (9530caa) · teste deny de leitura do lifecycleAudit · #5 scheduler de rollups/health → E12 · #6 protocolo `.index-mutex` **ADOTADO** (regras do HANDOFF)


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