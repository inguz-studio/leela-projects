---
trace: leela-redesign-v2-20260810
lane: CONVERSA1-DS
employee: sf-frontend-lead (software-forge)
repo: C:/dev/leela-wt-redesign-v2 (worktree · branch redesign-engajamento-v2)
base: aad1faf5
data: 2026-08-10
escopo: Grupos A e B do REFACTOR (itens 1 a 6), território packages/design-system
estado: SELADO — aguarda aprovação dos gates pelo dono antes da Conversa 2
head: 094173a4
gates: 6/6 verdes · suíte 1610/1610 em 71 arquivos (baseline 1579/1579 em 70)
vetaveis_no_dono: 1 (item 2 — {primary.400} × #FF450C)
---

# REDESIGN-V2 · Conversa 1 (DS) — handoff vivo

Contrato: `.nirvana/briefs/leela-redesign-v2-conversa1-enriched.md`.
Especificação: `leela-projects/design_handoff_engajamento/REFACTOR.md`.
Ordem executada: **2, 1, 4, 3, 5, 6**.

Árvore principal (`C:\dev\LEELA`) **não foi tocada** por esta lane: nenhum
arquivo editado, nenhum commit. Dela só saíram leituras (o incidente de tela
preta) e este handoff.

## Baseline medido antes de qualquer edição

`pnpm install --config.verify-deps-before-run=false` + build do DS (tsup, ok) e
suíte completa:

```
 Test Files  70 passed (70)
      Tests  1579 passed (1579)
   Duration  56.64s
```

Bate exatamente com o baseline declarado no contrato (1579/1579 em 70 arquivos).

---

## Item 2 · rampa lime→âmbar no brasa (e no wine) — FEITO · `b6600b90`

Era o pré-requisito do Grupo C, e o item com mais divergência entre o que o
REFACTOR supõe e o que o repo tem.

**O que eu encontrei, contra o que o contrato previa.** O contrato dizia que
`semantic.brasa.json` já tinha `chart.accent = {primary.500}` **e**
`chart.accent-2`. Falso: o arquivo tinha **só** `chart.accent-2` (o âmbar
`oklch(0.75 0.13 75)` da lane BLUR, `c8f45e17`). `chart.accent` não existia em
lugar nenhum do brasa. O wine não tinha nenhum dos dois.

**Mudança aplicada** (os valores da tabela do item 2 vencem, como mandado):

| Tema | `chart.accent` | `chart.accent-2` | antes |
|---|---|---|---|
| brasa | `{primary.400}` → `#FF6520` | `#C8E84A` (lime) | não existia / âmbar oklch |
| wine | `{primary.500}` → `#7A1520` | `#7E9B12` | nenhum dos dois existia |
| dark-wine | intocado | intocado | já correto |

`dark-wine.css` fecha com **zero linha de diff** — confirmado por `git diff`.

**Por que a ponta lime do brasa é literal e não `{accent.400}`.** Achado
técnico que muda a instrução: `primitives.brasa.json` **não tem rampa
`accent`** (só primary/danger/success/warning/heroico/neutral — a rampa lime só
existe em wine e dark-wine). A ref `{accent.400}` teria gerado
`var(--accent-400)`, variável inexistente no bloco do brasa, e no React Native
cairia como a string crua `"{accent.400}"` — o gerador faz fall-through
silencioso (`refToValue`, `generate.ts:51`). O literal `#C8E84A` é o mesmo valor
que `{accent.400}` resolve nos outros dois temas. Descartei abrir uma rampa
`accent` completa no brasa: dez vars novas para um consumidor só, e "O que NÃO
tocar" pede cirurgia no brasa.

**Buraco de gate encontrado e fechado no caminho.** `tokens.test.ts` validava
as `{ref}` do brasa contra a semantic **base**, não contra o merge com
`semantic.brasa.json` — wine e dark-wine já eram validados no merge, o brasa
não. Ou seja: exatamente o erro acima passaria limpo pela suíte. Passou a
validar o merge, como o gerador faz. Foi o que me deixou provar a decisão em
vez de apostar nela.

### ⚠️ Vetável para o dono — conflito dentro da própria tabela do item 2

A linha do brasa diz **`{primary.400}` (laranja da marca, `#FF450C`)**. Na rampa
do brasa, `primary.400 = #FF6520` e `primary.500 = #FF450C`. A referência e o
hex apontam para passos diferentes; os dois não podem estar certos.

Implementei `{primary.400}` (a referência), porque é o que o contrato desta lane
cravou e porque a linha do wine usa referência e ela bate com o hex — o autor
usa refs de propósito. **Se o que o estudo enxergou foi o laranja da marca
`#FF450C`, o flip é uma linha** (`"accent": "{primary.500}"` em
`tokens/semantic.brasa.json`) + `generate-tokens`. Não decidi por conta própria
porque é cor de marca em superfície de produção.

### Registrado, não implementado

`dark-sea` (terceira linha da tabela do item 2) **não existe** no DS — os temas
são brasa, wine e dark-wine. Ignorado, como o contrato mandou.

---

## Item 1 · `--card-blur` ganha consumidor — JÁ ESTAVA FEITO · gate em `c40c35e1`

**Zero linha de produção mudada.** A micro-lane BLUR (`f98b2c0a`) já havia
ligado o token — e em **quatro** componentes, dois a mais do que o REFACTOR
pede:

| Componente | Linha | REFACTOR pedia? |
|---|---|---|
| `Card/Card.tsx` | 44 | sim |
| `KpiCard/KpiCard.tsx` | 67 | sim |
| `CardEvento/CardEvento.tsx` | 54 | não (bônus da BLUR) |
| `CardDesafio/CardDesafio.tsx` | 46 | não (bônus da BLUR) |

Nenhum consumidor faltando. Nada duplicado.

**O que faltava era o gate.** Não havia teste algum afirmando o consumo: um
`cn()` reordenado apagaria o vidro com a suíte inteira verde. Adicionei os
quatro casos. Junto, corrigi o cabeçalho de `glass.test.ts`, que ainda afirmava
"nenhum componente lê `--card-blur` ainda" — verdade na lane TOKENS, mentira
desde a BLUR.

O teste lê o **fonte** em vez de renderizar, de propósito: a classe arbitrária
do Tailwind (`[backdrop-filter:var(--card-blur)]`) só vira CSS no build do
consumidor, então renderizar em jsdom provaria apenas que a string está no
atributo `class` — não o efeito.

---

## Item 4 · glass do brasa mais escuro — JÁ ESTAVA FEITO · gate em `c40c35e1`

**Zero linha mudada em `glass.json`.** Os dois valores do estudo já estavam no
arquivo, **idênticos caractere a caractere**, entregues pela lane TOKENS
(`b5e75f49`) antes de o estudo os formalizar:

```
glass.surface-raised.brasa   spec == atual  → true
glass.page-glow.brasa        spec == atual  → true (3 radiais)
```

O contrato apontava o `page-glow` de três radiais como "delta real provável" —
não era: também já batia. dark-wine (`rgba(46, 18, 26, 0.34)`) e wine
(`rgba(255, 255, 255, 0.62)`) intocados, como manda o item.

Como no item 1, o que faltava era o gate: nada impedia alguém de clarear o
vinho de volta. Os dois valores viraram pin, mais uma asserção de que o item é
do brasa e só dele.

`glass.test.ts`: **27 → 35 casos** (4 do item 1, 3 do item 4, 1 de inércia do
token fora do modo vidro).

---

## Item 3 · ícones Lucide oficiais — FEITO · `3d56ce26`

Quatro ícones trocaram de **significado**, não de desenho. O menu antigo
descrevia o dado que a tela guarda; o novo descreve o que o organizador vende
ou cuida.

| Item | Antes (no código) | Agora |
|---|---|---|
| Visão Geral | `LayoutDashboard` | mantido |
| Eventos | `CalendarDays` | **`Ticket`** |
| Clubs | `UsersRound` | **`Heart`** |
| CRM | `Bell` | **`User`** |
| Marcas | `Briefcase` | **`Megaphone`** |
| Configurações | `Settings` | mantido |

`Ticket` é exclusivo do item de menu — há teste afirmando que nenhum outro item
o reusa. Agenda e campos de data seguem em `CalendarDays`/`CalendarCheck`.

**A cópia desatualizada do showcase deixou de existir, em vez de ser
re-sincronizada.** `showcase/src/sections/IconsPage.tsx` anunciava 8 itens e
listava "Financeiro" e "Analytics", removidos há rodadas (a lane IAMENU
registrou e pulou). Corrigir os literais consertaria o sintoma e deixaria a
próxima deriva acontecer — a causa era **estrutural**: `DEFAULT_SIDEBAR_SECTIONS`
guarda o ícone já **renderizado** (`React.ReactNode`), e de um nó renderizado
não se recupera o nome do componente, então qualquer catálogo tinha de ser
escrito à mão em paralelo.

Agora existe `DEFAULT_SIDEBAR_NAV_ICONS` (id · label · iconName · componente)
como catálogo único; `DEFAULT_SIDEBAR_SECTIONS` é **derivado** dele e o showcase
o **importa**. O shape de `DEFAULT_SIDEBAR_SECTIONS` não mudou — consumidores no
painel não veem diferença; o export é aditivo.

Testes novos: os seis ícones, a exclusividade do `Ticket`, `iconName` conferido
contra o `displayName` real do componente Lucide (o nome não pode mentir) e a
derivação seções ↔ catálogo.

**Para o dono:** o ícone certo para cada significado é chamada de design. Os
testes provam que o mapeamento pedido foi aplicado, não que o desenho comunica.

---

## Item 5 · drawer e `aria-expanded` — meio FEITO, meio JÁ CORRETO · `562ee28a`

**Scrim: o defeito descrito não existe aqui. Zero linha de produção.** O
`AppShell` **não tem scrim próprio** — delega ao `Drawer`, que devolve `null`
quando não está presente (`if (!presente) return null`), de modo que overlay e
painel saem do DOM **juntos**, e anima por `animate-in`/`animate-out`
(keyframes), **não** por `transition` a partir de `opacity: 0`. Ou seja: nem a
montagem incondicional nem a animação por transição — as duas metades do bug —
estão presentes. O REFACTOR previa este desfecho ("se o AppShell hoje já monta
condicional, ignore o item — verifique antes"). O que entra é o teste que
impede alguém de "consertar" para pior.

**`aria-expanded`: essa faltava mesmo.** Três lanes registraram e nenhuma pôde
tocar. Sem ele o leitor de tela anuncia "Abrir menu de navegação, botão" com o
drawer **já aberto** — o nome acessível é imperativo e não carrega estado.

### ⚠️ Nota de risco — incidente de tela preta

Esta é a **única** mudança da Conversa 1 dentro do shell, e o incidente de
10/08 ronda exatamente `RootShell`/`AppShell`/`Sidebar`/card translúcido com
**causa-raiz não cravada**.

O que a mudança é: **um atributo ARIA num botão**. Não toca layout, stacking
context, `transform`, superfície nem `data-glass` — as famílias de causa que
sobraram vivas no diagnóstico (o handoff do incidente aponta bug visual/CSS em
rotas autenticadas como hipótese líder). Não altera nenhuma árvore de render.

Mesmo assim os testes novos afirmam o **negativo**, que é o que interessa ao
incidente: nenhum scrim montado com o menu fechado, e o conteúdo alcançável
dentro do `main`. Uma camada invisível cobrindo a tela é justamente a forma que
"tela preta" teria dentro do shell.

`aria-controls` foi **deliberadamente não** adicionado: exigiria plumbar um id
para fora do `Drawer` (o `useId` interno nomeia só o título), alargando
superfície no componente que o incidente pede para não mexer sem necessidade.
`aria-expanded` sozinho é válido e entrega o estado.

`AppShell.test.tsx`: **9 → 13 casos**.

---

## Item 6 · quebra de 480px — FEITO na parte que é do DS · `094173a4`

O DS entrega o **degrau**; os grids ficam nas telas. `xs: '480px'` entra na
escala do `tailwind-preset.ts`; `sm`/`md`/`lg`/`xl`/`2xl` seguem nos mesmos
valores e `lg` segue sendo o colapso do shell.

Mobile-first importa aqui: o estado **estreito** é o default (1 coluna, sem
divisória) e `xs:` é que **restaura** o 2×2. Escrever `max-xs:` inverteria o
sentido do sistema e sumiria com o layout em quem não suporta a variante.

A escala era contrato versionado desde LEELA-RESP-M1-T1 e **não tinha teste
nenhum** — nasce `breakpoints.test.ts` (5 casos) afirmando o degrau novo e que
os cinco antigos não se moveram.

Não inventei grid no DS para "aproveitar": o único grid de KPI do pacote está
numa story (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`), que já nasce em
coluna única abaixo de 640.

### Para a Conversa 2 (não é território desta lane)

1. **Os grids de 4 KPIs e as divisórias verticais** vivem nas telas do painel.
   O degrau `xs` já está publicado para eles.
2. **A legenda de donut de 4 itens que trunca não é a do DS.** O `DonutChart`
   do pacote já usa `flex flex-col` — uma coluna em qualquer largura, nunca
   trunca por número de colunas. A legenda de 2 colunas do item 6 é do painel.

---

## Tabela de gates — saída real

| # | Gate | Comando | Saída real |
|---|---|---|---|
| 1 | Type-check | `pnpm --filter @leela/design-system run type-check` | `$ tsc --noEmit` · **exit=0**, zero erro |
| 2 | Lint | `... run lint` (`eslint src showcase/src --max-warnings 0`) | `$ eslint src showcase/src --max-warnings 0` · **exit=0**, zero erro e zero warning |
| 3 | Tokens determinísticos | `... run generate-tokens` ×2 | 1ª e 2ª rodadas: árvore limpa nos dois casos. Hashes byte a byte iguais entre as duas: `brasa 68d63518…`, `wine fd4eb548…`, `dark-wine 0d6e7248…`, `index 1d2bbb46…`, `rn-themes 482b7dcd…` |
| 4 | Contraste | `vitest run contrast.test.ts glass.test.ts` | `glass.test.ts (35 tests)` ✓ · `contrast.test.ts (219 tests)` ✓ · **254 passed (254)** |
| 5 | Suíte DS completa | `... run test` | **Test Files 71 passed (71)** · **Tests 1610 passed (1610)** · 43.70s |
| 6 | Zero hex/px no diff | `git diff aad1faf5..HEAD` filtrado | **Zero em código de estilo** — ver classificação abaixo |

**Baseline × final:** 1579/1579 em 70 arquivos → **1610/1610 em 71 arquivos**.
+31 casos, +1 arquivo, zero regressão, zero teste removido ou afrouxado.

### Gate 6, classificado item a item (nada varrido para debaixo do tapete)

Rodei o filtro sobre o diff inteiro da branch. **Em código de componente
(`src/components`, `src/index.ts`, `showcase/`) o resultado é literalmente
vazio** — é o que o gate protege. As demais ocorrências, todas legítimas:

| Onde | Quantas | O que é |
|---|---|---|
| `tokens/semantic.brasa.json` · `semantic.wine.json` | 2 + 2 | os valores dos itens 2 e 4 — o lugar deles, exempto pelo próprio contrato |
| `themes/*.css` · `src/theme/rn-themes.ts` | 1+2+4 | artefatos **gerados** a partir dos JSONs acima, versionados |
| `tokens.test.ts` · `glass.test.ts` · `breakpoints.test.ts` | 4 + 6 + 9 | **asserções** que fixam valor de token/breakpoint; é o padrão que o arquivo já usava (`'#0C0C0C'`, `'#D63500'`) |
| `tailwind-preset.ts` | 2 (1 código, 1 comentário) | `xs: '480px'` — um breakpoint **é** um valor em px por definição, e é o item 6 inteiro; as outras cinco linhas da escala são iguais |

## Commits (branch `redesign-engajamento-v2`, base `aad1faf5`)

| Commit | Item |
|---|---|
| `b6600b90` | item 2 — rampa lime→âmbar no brasa e no wine |
| `c40c35e1` | itens 1 e 4 — gates que faltavam |
| `1e9a2020` | item 4 — non-null no pin do page-glow (fix de tsc) |
| `3d56ce26` | item 3 — ícones novos + catálogo com dono único |
| `562ee28a` | item 5 — `aria-expanded`; scrim verificado |
| `094173a4` | item 6 — degrau `xs` de 480px |

Push feito. NENHUM deploy. Nenhum navegador interativo.

## Impedimentos

Nenhum bloqueou a entrega. Um vetável aberto (o `{primary.400}` × `#FF450C` do
item 2, acima) espera decisão do dono e é flip de uma linha.

---

## Achados laterais registrados (não corrigidos nesta lane)

1. **`glass.test.ts` repete o buraco do brasa.** Na linha 99, `semBrasa` é a
   semantic **base**, não o merge com `semantic.brasa.json` — o mesmo padrão
   que corrigi em `tokens.test.ts`. Hoje é inofensivo (o arquivo só mede
   contraste de papéis de texto/superfície, que o brasa não sobrescreve), mas é
   a mesma armadilha esperando um override futuro. Não mexi: fora do escopo
   dos seis itens e o ganho não paga o churn agora.
2. **`pnpm install` mexe em `pnpm-workspace.yaml`** — insere
   `'@sentry/cli': set this to true or false` em `allowBuilds`. Revertido para
   não poluir a branch. Vale saber que todo worktree novo vai nascer com essa
   sujeira.
