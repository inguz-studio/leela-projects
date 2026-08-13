# RESPONSIVO-FIX · a moldura que encolhia e o título que nunca encolhia

- **Trace:** `leela-redesign-v2-20260810` · lane `RESPONSIVO-FIX` · branch `responsivo-fix`
- **Worktree:** `C:\dev\leela-wt-responsivo` (criado sobre `main` @ `be8589b8`)
- **Brief:** `.nirvana/briefs/leela-responsivo-fix-20260812-enriched.md`
- **Data:** 2026-08-12/13 · sf-frontend-lead (software-forge) · **nenhum deploy**

> **Fala do dono (12/08 noite):** *"quando entro no modo de tablet e mobile, a tela de visao geral
> está com componentes sobrepostos, e reparei que os eventos nao estao ajustando tamanhos das fontes
> para o mobile e tablet, nos titulos principais (h1)"*

As duas queixas são defeitos **do design system**, não das telas. Nenhuma das duas foi consertada
com classe local: a primeira nasceu na anatomia do `PageHeader`, a segunda num par de tokens.

---

## 1 · Como foi medido (antes de consertar)

Stack local seeded pelo `preview.sh` (Emulator Firestore 8180 · Auth 9198 · Functions 5201, painel
em `:5273`, já logado) — é o caminho que serve o painel com **dados reais de exemplo**, e por isso
foi preferido ao `vite build --mode leela-hub` (que serve o bundle, mas sem sessão nem dados).
Captura e medição por Playwright em viewport exato, 4 breakpoints, três telas.

Screenshots: `.nirvana/shots/responsivo-fix/{antes,depois}/` — 12 pares
(`visao-geral`, `eventos-lista`, `evento-detalhe` × 320/375/768/1024).
Medidas cruas: `.nirvana/shots/responsivo-fix/{antes,depois}.json`.

Além do olho, dois medidores objetivos por tela: **vazamento do header** (quanto o último filho
ultrapassa a caixa do `<header>`) e **varredura de sobreposição** (pares de irmãos visíveis cujos
retângulos se cruzam + transbordo horizontal).

---

## 2 · Queixa 1 — sobreposição na Visão Geral

### Causa raiz

O `<header>` do `PageHeader` declara `min-h-[var(--header-height)]` (96px) **e é item de um flex
COLUNA com altura definida** — a área de rolagem do `RootShell`
(`relative flex flex-col flex-1 overflow-y-auto`). Nesse contexto o `flex-shrink: 1` padrão
**comprime a caixa até o próprio `min-height`** enquanto o conteúdo continua exigindo mais.

Abaixo de `lg` o slot de ações embrulha para a própria linha (`basis-full`, herança da LEELA-RESP-M4)
e o conteúdo do header passa de 96px para 135–157px. A caixa permanecia em 96px, `overflow` é
visível, e **a linha embrulhada era pintada POR CIMA do primeiro bloco da página**: na Visão Geral, a
régua de data (`DateBadge`) caía exatamente sobre o eyebrow "PRÓXIMO EVENTO" do cartão de contagem
regressiva.

`min-height` nunca foi o problema — ele impedia a caixa de encolher **abaixo** de 96px, e a caixa
precisava era de licença para **crescer**.

### Medição

| Breakpoint | caixa do header | conteúdo | vazamento ANTES | vazamento DEPOIS |
|---|---|---|---|---|
| 320 | 96px | 157px | **+61px** (37px sobre o cartão) | **0** |
| 375 | 96px | 157px | **+61px** (37px sobre o cartão) | **0** |
| 768 | 96px | 135px | **+39px** (15px sobre o cartão) | **0** |
| 1024 | 96px | 96px | −5px (sem defeito) | −5px (**inalterado**) |

Hipótese falsificada no navegador antes de tocar em código: injetar `flex-shrink:0` no header ao
vivo derrubou a sobreposição de 37px para −24px de folga em 320/375/768 e **não mexeu em 1024**.

### Conserto — **no DS**

`packages/design-system/src/components/PageHeader/PageHeader.tsx`: `shrink-0` no `<header>`.
Uma classe, e vale para **todo** consumidor de `PageHeader` no painel, não só a Visão Geral.

**Por que só a Visão Geral aparecia quebrada:** só o `OverviewShell` renderiza o `PageHeader` como
filho **direto** do flex de rolagem. `eventos-lista` e `evento-detalhe` têm um wrapper no meio, que
os protegia por acidente — media 0 de vazamento antes e depois. O defeito era do componente; a
exposição é que dependia do consumidor.

---

## 3 · Queixa 2 — h1 de eventos sem escala

### Causa raiz

`--header-title-size` é alias **estático** de `--font-size-3xl` (2.5rem/40px), redeclarado idêntico
nos três temas. Não existia mecanismo nenhum de escala tipográfica responsiva no monorepo: **zero
`clamp()`, zero unidade `vw`, zero media query de `font-size`, zero `fontSize` no preset do
Tailwind**. O título de página saía em 40px de 320px a 1440px.

O degrau **já estava declarado e nunca foi implementado**:
`leela-specs/02-rodadas/2026-08-09-redesign-ds/handoff-v2/README.md` §4 —
*"**< md:** moldura de 40px → 20px; **H1 2.5rem → 1.875rem**; blocos de 4 KPIs viram 2×2"*.
As outras linhas da mesma frase foram pagas (a moldura 40→20 está no `OverviewShell`); a do H1 ficou
para trás e ninguém viu, porque nenhum teste e nenhum gate falava de tamanho de fonte.

Medido antes: **40px nos 4 breakpoints, nas 3 telas** (lista de eventos, detalhe do evento e
Visão Geral).

### Conserto — **no DS**

1. **Token novo** `header.title-size-compact` = `{font.size.2xl}` em
   `packages/design-system/tokens/component.json`, regenerado para os 3 temas + RN.
   A **decisão de tamanho** mora no DS; a tela não escolhe.
2. `PageHeader` (DS) aplica o degrau: compacto por padrão, `md:` devolve o cheio.
3. `EventoShell` (detalhe do evento, painel) consome **o mesmo par de tokens**.

**Sobre o valor.** O contrato pedia 1.875rem, degrau que **não existe** na escala do DS —
`xl-plus` (1.75rem) e `2xl` (2rem) são exatamente equidistantes de 1.875rem. Vale `2xl`: um degrau
cheio abaixo do `3xl`, dentro da escala. Inventar `1.875rem` violaria a regra de zero valor fora de
token, e o desvio está registrado na `$description` do token.

**Por que `clamp()` no token foi recusado:** os tokens alimentam **também** o React Native
(`rn-themes.ts`), que não entende sintaxe só-CSS. Não há um único `calc()`/`clamp()` em nenhum tier
de token hoje, e abrir essa porta por um caso exigiria mover o token para a camada CSS-only —
refatoração maior que o defeito. O par de tokens + variante de breakpoint é o idioma que o repo já
pratica (`EventRow`, `PageHeader` RESP-M4).

### O corte que sobrava

Reduzir para 32px e ainda entregar **"Meia Marato…"** não resolve a queixa, só a encolhe. Com a
caixa do header agora crescendo (§2), o corte deixou de ser necessário embaixo: `truncate` virou
`md:truncate` nos dois h1. Em `md`+ o corte segue protegendo a linha única de 96px.

### Medição

| Tela | 320 | 375 | 768 | 1024 |
|---|---|---|---|---|
| `visao-geral` | 40 → **32px** | 40 → **32px** | 40px | 40px |
| `eventos-lista` | 40 → **32px** | 40 → **32px** | 40px | 40px |
| `evento-detalhe` | 40 → **32px** | 40 → **32px** | 40px | 40px |

O nome do evento no detalhe passa a aparecer **inteiro** ("Meia Maratona Floripa 2026", embrulhado
em duas linhas) em 320 e 375 — antes vinha cortado em "Meia Marato…".

---

## 4 · Prova de não-regressão no desktop

Diff de pixels antes×depois, mesma tela, mesmo viewport:

| Captura | pixels diferentes | leitura |
|---|---|---|
| `eventos-lista-768` | **0 / 691.200** | idêntico |
| `eventos-lista-1024` | 7 / 921.600 (0,001%) | ruído de antialiasing (caixa de 4×2px) |
| `evento-detalhe-1024` | 5 / 921.600 (0,001%) | ruído de antialiasing (3×2px) |
| `evento-detalhe-768` | 5 / 691.200 (0,001%) | ruído de antialiasing |
| `visao-geral-1024` | 1.155 / 921.600 (0,125%) | **o relógio ao vivo** do `DateBadge` (00:17 → 00:33), região x[753-973] y[32-63] |

Nenhuma mudança de layout em 1024. Em 768 o h1 continua em 40px por contrato (o degrau é `< md`), e
a única mudança é o fim do vazamento do header.

---

## 5 · Gates

| Gate | Resultado |
|---|---|
| `tsc --noEmit` DS + painel | limpo nos dois |
| `eslint --max-warnings 0` DS + painel | limpo nos dois |
| Suíte **completa** do DS | **84 arquivos · 1990 casos** verdes (era 1984; +6 casos novos) |
| Suíte **completa** do painel | ver §7 |
| `node scripts/gate-canon.mjs` | **PASS** — as 12 contagens no baseline, **nenhuma subiu** |
| Tokens gerados 2× | sem drift (mesmos 5 arquivos, diff estável) |
| Gate visual da lane | 12 pares de screenshot nos 4 breakpoints, conferidos |

### Testes novos (e falsificados)

Seis casos, e os três do `PageHeader` foram **provados vermelhos** revertendo o conserto (os 9
originais seguiram verdes na mesma rodada) — sem isso seriam decoração:

- `PageHeader.test.tsx` (+3): `shrink-0` presente na moldura; o par de tokens no h1; `md:truncate`
  sem `truncate` solto.
- `tokens.test.ts` (+3): o par existe e aponta para degraus da escala; o compacto é **menor** que o
  cheio nos 3 temas; vira `var()` no CSS e **valor resolvido** no RN (com asserção explícita de que
  não há `clamp`/`vw`/`calc` vazando para o React Native).

jsdom não resolve media query nem calcula layout — a prova por breakpoint são os screenshots; os
testes pinam a **assinatura** para que a próxima edição não devolva os defeitos em silêncio, que foi
exatamente como o degrau do §4 passou dois meses sem existir.

---

## 6 · No dono (1 decisão, não bloqueia)

**O tablet a partir de 768px mantém o h1 em 40px.** O contrato do §4 declara o degrau em `< md`
(768), então 768/810/820/834 — todas as larguras de iPad em retrato — ficam no tamanho cheio. A
sobreposição em 768 **está morta**; o que segue grande é só a letra do título, e ali ela cabe sem
cortar (medido: zero transbordo). Reduzir também o tablet é **mudar o contrato declarado**, não
implementá-lo — por isso não foi feito por conta própria. Se ele quiser o degrau em `< lg`, é uma
linha em cada um dos dois h1.

---

## 7 · Commits

| Hash | O que |
|---|---|
| (ver §8) | — |

---

## 8 · Fila herdada (não desta lane)

- O h1 do `EventoShell` continua sendo **cópia manual** da receita do `PageHeader` (dívida já
  contada pelo `gate-canon` em `padrao-reimplementado-fora-do-ds`). Promovê-lo ao componente do DS
  exige absorver tile, badge e duas linhas de meta — é redesenho de anatomia, não conserto.
- A varredura de sobreposição achou **transbordo horizontal residual** fora do escopo das duas
  queixas, que segue de pé: valores `whitespace-nowrap` sem `truncate` no `KpiRow` e no
  `StatV3`/`CartaoV3` (o cartão não tem `overflow-hidden`; só o `Countdown` adiciona por conta
  própria). Não sobrepõe hoje nos dados de seed, mas transborda a caixa com número grande.
- `apps/landing` escala h1 por `text-4xl sm:text-5xl` — **escala default do Tailwind, fora dos
  tokens do DS**. Segunda incoerência de tipografia, não tocada aqui.
