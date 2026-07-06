---

kanban-plugin: board
tags:
  - leela
  - v1
  - kanban

---

## 📋 Backlog
- [ ] **Higiene pré-E04 · lote DS-Forms & UX** (cobertura 80237d0 + pedido Vitor 2026-07-06 "shadcn onde melhorar UX"): Select/Switch(toggle)/Radio/Checkbox/Textarea via CLI shadcn + Progress + `size: icon` no Button · **Calendar/DatePicker shadcn** (eventos têm datas em toda parte) · **Charts** (shadcn charts/recharts, tokens brasa — Analytics/Financeiro/E02) · **QRCode component** (ingresso QR do app atleta é V1; lib wrapped token-only) · **visualização de caixas de mensagem/comunicados** (thread/inbox pattern p/ E06) · rename Popover→DropdownMenu · promover CardKPI ao DS · self-host fontes (woff2 Exo 2 + JetBrains Mono, remover CDN) · imports modulares firebase-admin (~13 módulos) · **DEPENDÊNCIA: só despachar após [LEELA-DS-TOKENPATCH] aterrissar (mesmo pacote)**
- [ ] **O2** · E04-slim · Config & Vendas — SEM afiliação/split (decisão 2026-07-04); cupons + equipe/papéis + PaymentProvider ficam · dep E03 · re-planejamento em curso
- [ ] **O2** · E12 · Landing + checkout público — dep E04 · decisões comerciais pendentes (taxa incorporada vs não, parcelamento, frete — insumo: benchmark-cheers.md)
- [ ] **O2** · E09-slim · Repasses — ENTROU na V1 (spec vinculante do Vitor: vendido/disponível, dados bancários salvos, valor, histórico, comprovante, retenção 15% pós-evento editável pelo admin) · dep E12
- [ ] **O2** · E07-web · Telas de sistema (404/500/403 c/ papéis) — ENTROU · 403 dep E04-S304
- [ ] **O2** · E06 · Comunicação do evento — 5T · dep E03
- [ ] **O2** · Coleta E11 (rollup, não backfillável) + higiene E15 (autorId+anexo, XS) + lote backend desafio (fim da onda, surface-agnostic)
- [ ] **O3/V1.5** · E13-slim + GymRats — perfil, registro de ações, leaderboard consistência, SEM medalhas · Strava gated O3.1 (⚠️ AÇÃO VITOR: registrar app OAuth na Strava — lead time semanas)
- [ ] **O3** · Leela+ teaser — decisões: PAGO/mensalidade/receita 100% Leela · tela "em breve" + CTA interesse + lista de espera · discovery em leela-plus-hipotese-jtbd.md
- [ ] **✅ ONDA 2 PLANEJADA (2e35997)** — 23 lotes / 71 tasks · briefs onda2-* + plans/onda2-decisoes.md + checklist atualizado · sequência Fable serial + Opus por gate definida · **DECISÕES: defaults comerciais RATIFICADOS 2026-07-05** (12x COM juros 3,49% a.m. Price repassado ao comprador + taxa de serviço percentual OU percentual+fixa ex. 8%+R$2 por tenant — ver DECISOES-ABERTAS.md) · restam 2 (nada bloqueia o início): gateway de pagamento (rec. Asaas, KYC tem lead time — iniciar já) + e-mail transacional · domínio público {DOMINIO_LEELA} + e-mail de suporte


## 🔨 Fazendo

- [ ] **O2 · E04-slim · Config & Vendas** — abre APÓS showroom (Onda 2 abre aqui; brief onda2-E04-lotes.md)


## 🔍 Revisão

- [ ] Follow-ups datados do gate (não bloqueiam Onda 2): **2026-07-18** #08 cron cura desafios/parcerias · #13 recência real · #21 owner-único · **2026-07-25 (pré-wiring E12/E04)** #23 · #24 · #42-boundary · deleteEvento cascata (→E04) · **2026-08-08** S10 · S11 · #25 · #30 concorrência Auth (E16)


## ✅ Feito

- [x] **Higiene · LOTE FIDELIDADE: GATE PASS 2026-07-06 (finalizador Opus 4.8, pós-crash)** — T1-T7 (`f611082..58a049a`): tokens de espaçamento do mockup · sidebar métricas exatas + brand slot · toolbar ⌘K · KPI row (trend chips + badge risco + Sparkline) · event-rows com thumb por modalidade · TABELA 6 col + date-badge + countdown + alertas c/ ícone · revisão atômica shadcn + fecha m2..m6 · **tsc 0 · ESLint (no-hardcoded) 0 · suíte DS 836/836 em 4 blocos (0 regressão) · QA visual vivo 4 rotas vs mockup Be Hero (visão geral/eventos/clubs/plataforma) fiel** · 3 observações não-bloqueantes p/ maestro (sparkline sem dado de conversão no seed · label Gerenciar vs Comunicar no card próximo-evento fora de escopo · thumbs homogêneos pois seed só tem corrida) · relatório FID-GATE-REPORT.md
- [x] **Higiene · SHOWROOM DS: GATE PASS 2026-07-06** — Storybook 25/25 componentes + showcase 5 páginas no AppShell (tema ao vivo) + LLM.txt anti-alucinação · auditoria interna APPROVE · 8a1e45e..da8227f
- [x] **Higiene · Consolidação DS Lote B: GATE PASS 2026-07-06 (incl. GATE VISUAL)** — B1-B4 (ícones Lucide, sidebar fixa 240px, AppShell raiz zero-rota-sem-shell, SidebarFooter) · DS 564/564 · painel 446+17 em blocos · 4 screenshots aprovados vs mockup Be Hero pelo maestro · DoD item 18 restabelecido · bd55a8e..69439f0
- [x] **Higiene · Consolidação DS Lote A: GATE PASS 2026-07-06** — A1-A11 (aliases shadcn→brasa, motion tokenizado, Button/Input/Badge/Skeleton/Separator/Breadcrumb/Toast/DropdownMenu/Card/Avatar/Modal/Tabs/Table shadcn stock brasa) · suíte DS 559/559 · matriz AA 49 pares × 2 temas · tsc+ESLint 0 · WIP órfão da sessão crashada 100% recuperado (A9-A11) · pushed até acfadb0
- [x] **O1** · **GATE FINAL ONDA 1: PASS 2026-07-05** · 4 épicos, gate principal FAILED→fix-loop 4/4→re-verify · **9/9 altos confirmados fechados c/ prova negativa** (E03 #01 data/#02 timezone/#04 RN-200 · E02 #03 estados fabricados · E05 S1 suite/S2 comunicado/S3 rules legadas/S4 config) · 15/15 testes integração + T13/T14/T15 (decisões Vitor) · **suíte 1933/1933 zero regressão** · tags `e03`/`e05`/`e02`/`e16-slim`/`onda1` @ 18d4ffc
- [x] **O1** · E03 · Operação do evento — **20/20T** (eventos, inscritos, balcão+galeria, kits N:N completos, financeiro+CSV) · tag `e03`
- [x] **O1** · E05 · Clubs núcleo — **L1-L5 + backend LGPD** (membros, desafios+motor pontuação, parcerias, comunicados, config, deleteClube cascata+retenção 90d) · tag `e05`
- [x] **O1** · E16-slim · onboard tenant + termos — **L1+fixes+hotfix+4 telas** super-admin (tenants, termos versionados, dashboard macro) · tag `e16-slim`
- [x] **O1** · E02 · Dashboard do produtor — **L1+6 telas** (KPIs, eventos ativos, inscrições, countdown, alertas, estados honestos) · tag `e02`
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