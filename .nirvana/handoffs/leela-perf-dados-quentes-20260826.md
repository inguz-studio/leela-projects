# Handoff — leela-perf-dados-quentes-20260826

**Branch:** `perf/dados-quentes-20260826`
**Data:** 2026-08-26
**Lane:** PERF-DADOS-QUENTES

---

## Item 1 — Inscritos: 26 viagens sequenciais → 3

### O que foi feito

`INSCRITOS_PAGE_SIZE` em `packages/api-client/src/eventos/inscritos.ts` subiu de **18 para 200**.

Régua de dimensionamento adicionada no comentário do arquivo: a latência de round-trip
(network + Firestore invoke) domina o custo total — não o payload. 200 docs JSON de inscrito
representam menos de 200 KB; o overhead de cada viagem é dezenas de vezes maior. Com 453
inscritos: 18/página → 26 round-trips; 200/página → 3 round-trips.

O comportamento de cursor foi preservado integralmente — `listarInscritos` ordena por
`atletaNome` e desempata por docId; o cursor é o `DocumentSnapshot` do último item da
página, imune ao tamanho da página.

### Testes atualizados

| Arquivo | O que mudou |
|---|---|
| `apps/painel/src/routes/eventos/inscritos/__tests__/InscritosView.test.tsx` | Mock `INSCRITOS_PAGE_SIZE: 18` → `200`; teste "mostra ~200 linhas por página" (`toHaveLength(201)` = header + 200 linhas) |
| `apps/painel/src/routes/eventos/entrega/__tests__/AtendimentoPanel.test.tsx` | Mock `INSCRITOS_PAGE_SIZE: 18` → `200` |
| `functions/src/__tests__/inscritosRules.test.ts` | Asserções de paginação ajustadas: `expect(paginas).toBe(3)`, `tamanhos.slice(0, 2)`, `tamanhos[2] === 53`; nomes dos testes e comentários atualizados — **este teste roda no emulador via CI do PR (~37 min), não localmente** |

### Impacto colateral em `queries.ts`

`MAX_PAGINAS_INSCRITOS` em `apps/painel/src/lib/query/queries.ts` foi ajustado de 200 para **20**
(teto de segurança de páginas a percorrer). Com 200/página, 453 inscritos geram 3 páginas;
um teto de 20 é folga confortável sem risco de loop ilimitado.

---

## Item 2 — Overview: caminho tomado = `minInstances: 1`

### Investigação das Rules

`firestore.rules` na linha 3013:
```
match /dashboard/{docId} {
  allow read: if (isSignedIn() && request.auth.uid == profId)
              || isPlatformAdmin();
  allow write: if false;
}
```
O cliente autenticado **TEM** permissão de leitura direta em `profissionais/{uid}/dashboard/current`.

### Por que NÃO foi usado getDoc direto

A função `getOverview` (`functions/src/overview/getOverview.ts`) **não é um getDoc simples**:

1. Lê `dashboard/current`.
2. Verifica se o doc existe e se `computadoEm` está dentro de `DASHBOARD_STALE_MS`.
3. Se ausente ou stale: chama `recomputeProfessionalDashboard` (agrega de verdade —
   percorre eventos, clubes e calcula KPIs + alertas dependentes de tempo como pendências > 24h).

Trocar para getDoc direto no api-client quebraria o fallback de recompute on-demand —
o cliente ficaria servindo dados stale silenciosamente.

### O que foi feito

`getOverview` passou a usar `runWith({ minInstances: 1 }).https.onCall(...)` em vez de
`https.onCall(...)` diretamente.

### Custo

- **~R$ 0,50/mês** (estimativa Blaze, 1 instância ociosa na região us-central1, agosto 2026).
- Só entra em vigor no **próximo deploy** — ato do dono do projeto, com gate visual próprio.
- Se o projeto migrar para o plano Spark: remover `minInstances: 1` (Spark não suporta instâncias reservadas).

---

## Gates verificados

| Gate | Resultado |
|---|---|
| `pnpm turbo run lint type-check --filter=@leela/api-client` | ✅ 0 erros |
| `pnpm turbo run lint type-check --filter=@leela/painel` | ✅ 0 erros |
| `pnpm turbo run lint type-check --filter=@leela/functions` | ✅ 0 erros |
| `pnpm --filter @leela/painel test --run` | ✅ 262 arquivos, 3034 testes |
| Suíte de functions com emulador | Não rodada localmente — cobre o CI do PR (~37 min) |

---

## Arquivos tocados

- `packages/api-client/src/eventos/inscritos.ts`
- `apps/painel/src/lib/query/queries.ts`
- `apps/painel/src/routes/eventos/inscritos/__tests__/InscritosView.test.tsx`
- `apps/painel/src/routes/eventos/entrega/__tests__/AtendimentoPanel.test.tsx`
- `functions/src/__tests__/inscritosRules.test.ts`
- `functions/src/overview/getOverview.ts`
