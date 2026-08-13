# FIX-CANON-MAIN · handoff (12/08)

- **Lane:** `FIX-CANON-MAIN` · trace `leela-roadmap-componentes-20260810`
- **Árvore:** main de `C:\dev\LEELA`
- **Brief:** `.nirvana/briefs/leela-fix-canon-main-20260812-enriched.md`

## O que subiu e o que desceu

`grade-crua.painel` voltou de **109 para 104** (baseline). As cinco ocorrências novas do merge
`f962efe3` (ADMINVISAO-ONDAS-235) foram convertidas para o primitivo que a anatomia pedia:

| Arquivo:linha | Recipe crua | Virou |
|---|---|---|
| `apps/painel/src/routes/plataforma/tenants/FinanceiroTab.tsx:161` | `grid-cols-1 sm:grid-cols-2` (2 KpiCard) | `<MetricGrid columns={2}>` |
| `apps/painel/src/routes/plataforma/tenants/FinanceiroTab.tsx:175` | `grid-cols-1 sm:grid-cols-2` (2 EmBreveV3) | `<FormGrid as="section">` |
| `apps/painel/src/routes/plataforma/tenants/_components/RepassesDoTenant.tsx:64` | `grid-cols-2 sm:grid-cols-4` (4 KpiCard) | `<MetricGrid columns={4}>` |
| `apps/painel/src/routes/plataforma/tenants/_components/RepassesDoTenant.tsx:79` | `grid-cols-1 sm:grid-cols-2` (KpiCard + EmBreveV3) | `<FormGrid>` |
| `apps/painel/src/routes/plataforma/tenants/_components/ResponsavelCard.tsx:70` | `grid-cols-1 sm:grid-cols-2` (`<dl>` de Campo) | `<FormGrid as="dl">` |

## Extensão necessária no DS

Nenhum dos quatro primitivos (`FormGrid`/`MetricGrid`/`SplitPanel`/`Stack`) aceitava `as="dl"`, e o
`ResponsavelCard` precisa do wrapper `<dl>` porque `Campo` grava `<dt>`/`<dd>` (agrupados em
`<div>`, filho válido de `dl` pela spec) — trocar para `<div>` teria quebrado a validade HTML.
`FormGridElement` ganhou `'dl'` (`packages/design-system/src/components/FormGrid/FormGrid.tsx` +
`LLM.txt`). É uma extensão de tipo pura, aditiva, zero mudança de comportamento para quem já usa a
peça. `Campo` (dt/dd) e a receita de rótulo/valor não foram tocados — ficam para as ondas C2-C6.

## Mudança visual intencional

As duas conversões para `MetricGrid` mudam o ponto de quebra (a escada fixa do preset é
`1 → xs:2 → lg:N`, diferente das receitas `sm`/`lg` que o merge escreveu à mão). É a catraca fazendo
o que ela existe para fazer — converge para a decisão do REDESIGN-V2 item 6, não é acidente. As
outras três conversões (`FormGrid` default `columns=2 from="sm" gap="md"`) são 1:1 byte-a-byte com a
classe anterior: zero mudança visual.

## Gates

- `node scripts/gate-canon.mjs`: **PASS** (`grade-crua.painel = 104`, todas as demais contagens
  inalteradas).
- Testes direcionados: `FinanceiroTab.test.tsx` (16), `RepassesDoTenant.test.tsx` (14),
  `ResponsavelCard.test.tsx` (4) — 34/34 verdes. `FormGrid.test.tsx` do DS — 14/14 verdes.
- `tsc --noEmit` limpo em `apps/painel` e `packages/design-system`.
- `eslint --max-warnings 0` limpo nos cinco arquivos tocados e em `apps/painel/src/routes/plataforma/tenants` inteiro.

## Commit

| Hash | O que |
|---|---|
| `65028522` | fix(canon): a catraca do grade-crua volta ao baseline na main |

Push feito: `628bc3b9..65028522` em `origin/main`.

## O que a próxima lane faz primeiro

Onda C0/C1 (peças novas + adoção das 7 violações já nomeadas na CONFORMIDADE-CONTROLES) segue livre
para abrir — o gate está verde e é pré-condição já satisfeita. Nenhum vetável novo nasceu aqui.
