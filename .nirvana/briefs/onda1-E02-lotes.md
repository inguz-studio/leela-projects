# Onda 1 · E02 — Visão Geral do Profissional · brief de lotes

Recorte V1 = **7T = S600(T1–T3) + S601(T1–T2) + S602(T1–T2)**. Épico read-only sobre o negócio: **não cria coleção de domínio**, só o agregado `profissionais/{profId}/dashboard/current`. Dep: E01, **E03 (∑`qtdInscritos`,`receitaConfirmada`)**, **E05 (∑`qtdMembrosAtivos`,`qtdDesafiosAtivos`)**.

Roteamento: **Fable** = Function de agregado; **Opus** = telas/blocos (core de derivação é puro, sem segurança).

## Lote E02-L1 · Function de agregado do dashboard — FABLE
- Tasks: S600-T2 (`aggregateProfessionalDashboard` fan-out + `getOverview` callable + `core/overview/kpis.ts` + Rules)
- Superfície: `functions/src/overview/{aggregateProfessionalDashboard,getOverview}.ts`, `packages/core/src/overview/kpis.ts`, `packages/api-client/src/overview.ts`, `firestore.rules`
- Dep: E00 + **agregados de origem de E03-L1 e E05-L1** (barreira dura). Bloqueia L2/L3.
- Aceite: com ∑`qtdInscritos`=1.284 e ∑`receitaConfirmada`=142.280 → `getOverview` retorna esses totais + `vagasRestantes`=47; evento com ocupação ≥ limiar → `eventoEmRisco`="Meia Maratona Floripa"; reprocessar gatilho não duplica (idempotente); cliente não escreve `dashboard/**` (Rule nega); `taxaConversaoPct` sem dado de visita → `null` (não inventa).
- Nota: a derivação server-side de **alertas** (usada por S602-T2) deve morar aqui ou em callable irmã (`getAlerts`) — este lote é o dono do backend do overview.

## Lote E02-L2 · Rota, shell e KPIs — OPUS
- Tasks: S600-T1 (rota `(overview)` + layout 2 colunas + `core/overview/greeting.ts` + PageHeader), S600-T3 (KPI row 4 cards consumindo agregado)
- Superfície: `routes/(overview)/*` (ver decisão Vite), consome DS + `api-client/overview`
- Dep: E01 + E02-L1 (S600-T3 consome `OverviewKPIs`). S600-T1←shell E01.
- Aceite: usuário "Marina Castelo" → saudação "Olá, Marina — aqui está o resumo das suas operações." + item "Visão Geral" ativo; viewport estreito → 1 coluna; KPIs renderizam "1.284"/"R$ 142.280"/"47" (badge "Esgotando")/"68,2%" c/ sparkline; carregando → 4 skeletons (nunca spinner); `taxaConversaoPct` indisponível → "—" sem quebrar; sem eventos/clubes → zeros + CTA "Crie seu primeiro evento".

## Lote E02-L3 · Blocos: eventos, inscrições, coluna lateral — OPUS
- Tasks: S601-T1 (eventos ativos + `core/overview/activeEvents.ts`), S601-T2 (últimas inscrições cross-evento + `core/overview/recentRegistrations.ts`), S602-T1 (countdown próximo evento + `core/overview/countdown.ts`), S602-T2 (painel de alertas + `core/overview/alerts.ts`)
- Superfície: `routes/(overview)/_components/*`, `packages/core/src/overview/*` (derivação pura)
- Dep: E02-L2 (S600-T1 grid). S602-T2 consome o retorno de alertas de E02-L1.
- Aceite: 3 eventos mock → Meia Maratona (453/500, "Últimas vagas", "Publicado") + Retiro (Rascunho); "Gerenciar" → `/eventos/meia-floripa-2026` (E03); 5 inscrições ordenadas por data desc, badges RN-204 (Pago/Pendente/Recusado); `pendente`→"Pendente" (Alerta) não "Pago"; countdown 27 Abr vs hoje 19 Abr → "08 dias restantes" + 453/47; "Check-in" → balcão (E03); alerta ocupação ≥90% → `warn`; 3 pendentes >24h → `info`; sem sinais → "Tudo em dia. Nenhum alerta."; EmptyStates + skeletons em todos os blocos.

## Sequência interna E02
`L1 → L2 → L3`. L2 e L3 podem sobrepor após L1 (L3 só precisa do grid de L2 para montar as colunas).

## Paralelismo entre épicos (barreira dura)
- **E02 é o mais dependente**: seus KPIs vêm de agregados que **E03 e E05 precisam ter criado e populado por Function**. Barreira: **E02-L1 só arranca depois de E03-L1 + E05-L1** (coleções + agregados ∑ existindo). Idealmente também E03-L2/E05-L1 Functions de agregado rodando.
- Telas de E02 (`routes/(overview)`) não colidem com E03/E05/E16 → L2/L3 paralelos às telas dos outros épicos.
- `firestore.rules`: E02-L1 adiciona só a regra de `profissionais/{id}/dashboard/**` (superfície pequena, baixo conflito, mas ainda o mesmo arquivo — coordenar).

## Riscos / entidades compartilhadas
- E02 **não cria** Evento/Clube/Inscrição/Membro — só lê. Nenhum risco de primeiro-movedor; ao contrário, é **último consumidor**.
- `collection group` de `inscritos` (S601-T2) exige índice composto por `organizadorId`/escopo + `criadoEm` → prever no `firestore.indexes.json`.
- Limiar de "Esgotando"/"Últimas vagas" deve ser **fonte única** reusada de `kpis.ts` (S600-T2) por S601-T1/S602-T1 — não duplicar constante.

## Decisões pendentes
1. **Vite vs Next.js**: spec usa `apps/painel/app/(overview)/page.tsx` (Next.js grupo de rota `()`); código real é Vite `apps/painel/src/routes/`. Traduzir `(overview)` para a rota-raiz autenticada do painel.
2. **Fonte de `taxaConversaoPct`**: depende de dado de visitas (E12/analytics, fora da Onda 1) → confirmado retornar `null` e UI trata; não bloqueia.
3. **`alerts` no `getOverview` vs callable dedicada** (`getAlerts`): decidir contrato único (recomendo estender `getOverview -> {...KPIs, alerts[]}` para 1 round-trip).
