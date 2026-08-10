---
tags: [leela, handoff, review, antagonista, design-system, redesign-ds]
trace: leela-redesign-ds-20260809
lane: REV
data: 2026-08-09
---

# Handoff — REDESIGN-DS · lane REV (review antagonista do pacote inteiro)

> Persona: `sf-qa-engineer` (Software Forge), com `sf-ux-engineer` como segunda lente.
> Mind-clones declarados nos employees (kent-c-dodds, kyle-kingsbury, daniel-kahneman,
> kathy-sierra, don-norman, julie-zhuo) — **nenhum invocado via Task tool**: a lane é
> execução de gate e leitura de código contra autoridade escrita, sem decisão de
> estratégia de teste nem de padrão de interação novo. Registrado por transparência.

Contrato: `.nirvana/briefs/leela-redesign-ds-20260809-rev-enriched.md`.
Sob review: handoffs TOKENS, TELA e BLUR (selados) + README-mãe
`leela-specs/02-rodadas/2026-08-09-redesign-ds/handoff/README.md` + `00-decisao.md`.
Autoridades de aceite: `leela-specs/04-engenharia/governanca-design.md` (L-011) e
`~/.claude/skills/harness/references/design-principles.md`.
Território: **READ-ONLY em código de produto**. Nenhum arquivo de `apps/` ou
`packages/` foi tocado por esta lane. Escrita: este handoff + nota no board.

---

## Veredito

# REPROVADA (2026-08-09) → LIBERADA PARA DEPLOY (2026-08-10)

> **A lane FIX pagou os dois bloqueadores.** O veredito vigente é o do re-gate
> delta, na última seção deste documento: **LIBERADA PARA DEPLOY**. O que vem
> abaixo é a review original, preservada inteira porque é a prova de onde os dois
> defeitos vieram.

Duas coisas pagam antes do deploy. As duas são na tela de Engajamento, as duas são de
derivação/rótulo em `apps/painel`, nenhuma pede arquitetura nova:

1. **D-1** — o bloco "Equilíbrio dos pilares" soma médias e chama o resultado de
   "Pontos acumulados".
2. **D-2** — a barra "Inativos (30 dias+)" afirma ausência de atividade que o campo
   `ultimaAtividadeEm` não registra em produção.

Todo o resto do pacote passou, inclusive as partes que eu esperava derrubar: o
isolamento de tema é limpo, os tokens do dono entraram byte a byte, o gerador é
determinístico, e as três suítes são verdes tanto em lote quanto arquivo a arquivo.
Os defeitos D-3 a D-12 são reais e ficam registrados, mas nenhum deles justifica
segurar o deploy sozinho.

---

## Gates re-provados (comando + saída real, nada herdado dos handoffs)

| Gate | Comando | Saída |
|---|---|---|
| Determinismo do gerador | `pnpm --config.verify-deps-before-run=false run generate-tokens` ×2 + `sha256sum` dos 5 gerados antes/depois de cada rodada | hashes **idênticos nos 3 estados** (`brasa.css 39119607…`, `wine.css dbf986fa…`, `dark-wine.css 0d6e7248…`, `index.css d6b9e78d…`, `rn-themes.ts 48989ef8…`); `git status --short -- themes/ rn-themes.ts` **vazio** |
| DS · type-check | `pnpm … run type-check` (`tsc --noEmit`) | limpo, exit 0 |
| DS · lint | `pnpm … run lint` (`eslint src showcase/src --max-warnings 0`) | limpo, exit 0 |
| DS · suíte | `pnpm … run test` (`vitest run`) | **1579 passed / 1579, 70 arquivos**, 49,71s |
| Painel · type-check | `pnpm … run type-check` | limpo, exit 0 |
| Painel · lint | `pnpm … run lint` (`eslint src --max-warnings 0`) | limpo, exit 0 |
| Painel · suíte | `pnpm … run test` (`vitest run`) | **2378 passed / 2378, 224 arquivos, exit 0**, 360,78s |

### O lote não mentiu (checagem de colisão)

O contrato avisa que verde de lote pode esconder colisão. Rodei **16 arquivos críticos
um a um** e todos bateram com o lote, sem flake:

`superficie.test.ts` 19/19 · `SuperficieDoPainel.test.tsx` 5/5 · `GlowDaPagina.test.tsx`
3/3 · `ClubesRoutes.test.tsx` 6/6 · `marca-executavel.test.ts` 9/9 ·
`EngajamentoView.test.tsx` 16/16 · `_lib/engajamento.test.ts` 20/20 · `ocupacao.test.ts`
7/7 · `ComunidadeResumo.test.tsx` 6/6 · `OcupacaoEventos.test.tsx` 11/11 ·
`glass.test.ts` 27/27 · `contrast.test.ts` 219/219 · `tokens.test.ts` 570/570 ·
`ThemeProvider.test.tsx` 18/18 · `shadcn-aliases.test.ts` 35/35 · `color-scheme.test.ts`
19/19.

### Isolamento de tema (vetor 2)

**O commit-base do contrato está errado, e isso importa.** O brief manda diferenciar
contra `dd5b0e05` como "pré-pacote". `git log -1 --format=%ci dd5b0e05` devolve
**2026-08-09 22:59:00** — depois da lane TOKENS inteira (21:33 a 22:20) e depois de
`9d00c305` (22:48). Um diff contra ele **esconde o tema dark-wine inteiro, a camada
glass, o ThemeProvider e a fiação da superfície**. A base real é `9fbcd9ab` (21:05:30),
pai de `c23d916b`. Rodei contra a base certa.

`git diff 9fbcd9ab..HEAD -- packages/design-system/themes/brasa.css`:

- ganhou §3 (`--font-family-ui` Exo 2 → Rubik, `--peso-display/forte/medio/suave`);
- ganhou §2 (`--surface-raised-opaque`, `--page-glow: none`, `--card-blur: none`, os
  cinco `--glass-*`, o bloco `[data-glass="on"]`, o `@supports`);
- ganhou §6 (`--chart-accent-2: oklch(0.75 0.13 75)`);
- **nenhum valor pré-existente mudou** além do `--font-family-ui`, que é o §3 pedindo.

`wine.css`: só a camada §2 (mais `--surface-raised-opaque` e `--page-glow: none`), zero
de §3, zero de §6. `dark-wine.css`: nasce inteiro, 463 linhas.

**Os tokens do dono entraram como estão.** `sha256sum` de
`handoff/tokens/glass.json` e `packages/design-system/tokens/glass.json`:
`1184be18072d1c7e5b4c7be95930066bf1b88cb08c7d45cb2c42d7b79f6b2be1` nos dois — byte a
byte. (Fui atrás disto achando invenção de marca: o README §2 tabela só mostra brasa e
dark-wine, e o CSS gerado traz um jogo completo de wine com `blur(20px) saturate(1.3)` e
um radial lime. Os valores vêm do `glass.json` do dono. Suspeita retirada.)

`diff -u` dos dois arquivos dark-wine (dono → repo) mostra **exatamente os dois desvios
que a lane TOKENS declarou**: `surface.raised-opaque` novo (exigência do fallback §2) e
`border.strong` `{neutral.700}` → `{neutral.500}` (premissa 8, medida). O resto é
aditivo, cada seção com `$description` marcando "REVISÃO (lane TOKENS, 09/08)". Nada
escondido.

### Marca executável (vetor 6)

- **Zero hex/px/rgba** nas linhas adicionadas de código de app e de componente em todo o
  diff acumulado do pacote: `git diff 9fbcd9ab..HEAD -- 'apps/painel/src/**'
  'packages/design-system/src/components/**' ':(exclude)**/__tests__/**' | grep '^+' |
  grep -E '#[0-9a-fA-F]{3,8}|rgba?\(|[0-9]+px'` → **saída vazia**.
- **Nenhuma var órfã**: extraí os 36 `var(--*)` distintos usados pelos arquivos
  novos/tocados do painel e conferi contra `themes/brasa.css` — **zero não definidos**.
  `--peso-display: 700` · `--peso-medio: 600` · `--section-title-size:
  var(--font-size-xl)` · `--card-radius: var(--radius-lg)` — todos existem e resolvem.
- **Fonte por token**: `--font-family-display: "Exo 2", sans-serif` e
  `--font-family-ui: "Rubik", sans-serif` no brasa; `globals.css` aponta `html` para a
  ui e `h1..h6` para a display, com a display primeiro. `SecaoTitulo` usa
  `font-display italic` + `--peso-display` (700), e o `@import` carrega Exo 2 `1,700` —
  itálico real, sem sintético.
- **Limite honesto**: `marca-executavel.test.ts` não prova `font-family` COMPUTADA, e
  diz isso no cabeçalho ("a suíte roda com `css: false`… um teste que fingisse observá-la
  seria pior que nenhum"). A prova de computação continua sendo do olho do dono. O teste
  não mente sobre o que mede.

---

## Defeitos que bloqueiam o deploy

### D-1 · O equilíbrio dos pilares soma médias e chama de "pontos acumulados"

**Prova.** `packages/core/src/atleta/registro.ts:266-289` — `derivarProgressoPorPilar`
escreve `out[pilar] = { atual: arred1(soma / participantes.length), meta }`, onde `soma`
percorre `p.pontosPorPilar[pilar]` de cada participante. O `$description` do tipo
concorda: `packages/core/src/clubs/desafio.ts:88` — "Pontos acumulados no pilar (**média
coletiva**)". `meta` é `minimoPorPilar[pilar]`, o mínimo **por participante** do Modelo C
(RN-111). Único escritor em produção: `functions/src/jornada/onRegistroWrite.ts:233`.

`apps/painel/src/routes/clubes/engajamento/_lib/engajamento.ts:153-155`:

```
acumulado[pilar].atual += p.atual;
acumulado[pilar].meta  += p.meta;
```

Soma essas médias ao longo de N desafios, sem peso. `EngajamentoView.tsx:236` rotula
"Pontos acumulados sobre a meta de cada pilar, somando os desafios que operam
equilíbrio", e `:256` repete no `aria-label` do gráfico, que é o que o leitor de tela
ouve.

**Consequência.** Um desafio com 2 participantes pesa igual a um com 500. O número
resultante não é total nem média: é soma de médias, uma quantidade sem unidade. E como
`atual` vem com uma casa decimal, `formatInt` (que é `Intl.NumberFormat('pt-BR')`, sem
`maximumFractionDigits`) imprime **"37,2"** sob um rótulo que promete pontos acumulados.
Verificado: `new Intl.NumberFormat('pt-BR').format(37.2)` → `"37,2"`.

**Caminho do conserto (não aplicado).** Ou ponderar por `qtdParticipantes`
(`Σ atualᵢ·nᵢ / Σ nᵢ`, e a meta pelo mesmo peso), ou abandonar a soma cross-desafio e
renderizar por desafio. Nas duas saídas o rótulo e o `aria-label` mudam junto: o que a
API entrega é "média de pontos por participante contra o mínimo do pilar".

**Severidade: bloqueia.** É um número exibido com uma afirmação que o contrato da API
nega.

### D-2 · A barra "Inativos (30 dias+)" afirma o que o campo não sustenta

**Prova.** `EngajamentoView.tsx:267` escreve na tela "quem entrou nos últimos 7 dias,
quem segue ativo e **quem está sem atividade há 30 dias ou mais**".
`_lib/engajamento.ts:41` rotula a barra "Inativos (30 dias+)".

`packages/core/src/clubs/membro.ts:98` — `const ultimaAtividade = ultimaAtividadeEm ??
entrouEm;`. Varredura de quem escreve o campo (`grep -rn "ultimaAtividadeEm"
functions/src packages apps`, fora de teste): o **único** escritor é
`functions/src/seed/membros.seed.ts:176`. Os dois leitores
(`clubs/membrosAggregates.ts:50`, `jornada/entrarNoDesafio.ts:89`) só leem.

**Consequência.** Em produção nenhuma Function grava `ultimaAtividadeEm`, então o
fallback vale sempre e "inativo" é, na prática, "entrou há 30+ dias" — independente de o
membro ter treinado ontem. A tela afirma o contrário como fato, para o organizador
decidir a quem chamar de volta.

A lane TELA mediu isso e escreveu no próprio handoff que é "o gap de maior impacto sobre
número já exibido" — e publicou a legenda afirmativa mesmo assim. É o ponto exato onde a
regra da casa ("número silenciosamente incompleto é pior que tela que diz que falhou")
foi aplicada a seis blocos e não a este.

**Caminho do conserto (não aplicado).** Copy que descreva o campo real ("sem registro de
atividade desde a entrada"), ou uma lane de backend que passe a escrever
`ultimaAtividadeEm` nos gatilhos de atividade. O primeiro é minutos; o segundo é decisão
de produto.

**Severidade: bloqueia.** Correção de rótulo, não de arquitetura — e o custo de deixar
passar é o organizador agindo sobre uma lista errada.

---

## Defeitos que não bloqueiam (mas pagam antes de crescer)

### D-3 · Metade das superfícies do pacote não é vidro (deriva de superfície)

`Card.tsx:44` e `KpiCard` ganharam `[backdrop-filter:var(--card-blur)]` na lane BLUR.
Mas as três superfícies que o painel desenhou à mão **não** ganharam:

- `EngajamentoView.tsx:83-92` (`Painel`) — `rounded-[var(--card-radius)]
  bg-[var(--surface-raised)] p-[var(--spacing-5)]`, sem blur, sem `--elevation-2`;
- `OcupacaoEventos.tsx:87` — mesmo trio de classes;
- `ComunidadeResumo.tsx:54` — mesmo trio numa `<section>`.

No modo vidro (o default do organizador, por decisão do dono) `--surface-raised` vira
`rgba(30,11,16,0.42)` para todos eles. Resultado na mesma tela: os KPIs são vidro fosco
com o fio de luz na borda; os painéis de gráfico são janelas translúcidas sem desfoque e
sem elevação. É exatamente o "drift de superfície" que a lane TELA disse estar evitando
ao não aplicar ponte parcial — evitado no DS e criado no app.

**Flag de candidato a primitivo (G-001):** `Painel` é um `Card` refeito à mão, e é a
terceira cópia da mesma anatomia no pacote.

**Conserto:** trocar as três pelo `Card` do DS, ou promover `Painel` ao DS com os três
tokens (`--surface-raised`, `--elevation-2`, `--card-blur`).

### D-4 · O gate de AA do vidro mede um fundo que o produto não pinta

`glass.test.ts:217` compõe `glass-surface-raised` **sobre `surface-base`** e mais nada.
Mas o próprio pacote pinta `--page-glow` atrás do card (`RootShell.tsx:150`,
`[background-image:var(--page-glow)]`), e `ComunidadeResumo` ainda aninha um `KpiCard`
com `bg-[var(--surface-overlay)]` sobre a seção translúcida. A régua do README §2 é
"4.5:1 medido sobre o fundo **composto**, não sobre a cor nominal".

Medido por script (composição alpha + luminância relativa WCAG 2, stop mais claro de
cada glow):

| Tema | texto | B: sobre base (o que o gate mede) | C: sobre base + glow (o que a tela pinta) |
|---|---|---|---|
| brasa | text-tertiary `#999999` | 6,79:1 | **6,04:1** ✓ |
| brasa | aninhado em `surface-overlay` | — | **5,44:1** ✓ |
| wine | text-tertiary | 5,42:1 | 5,42:1 ✓ |
| dark-wine | text-tertiary `#9A8388` | 5,57:1 | **4,01:1** ✗ (piso 4,5) |

O tema em produção passa com folga; a régua do gate é que está frouxa, e ela esconde uma
reprovação real no dark-wine.

**Não está no ar:** `main.tsx` monta `<ThemeProvider theme="brasa">`, e a prop
controlada vence a preferência persistida (`ThemeProvider.tsx:106-129`) — o painel não
alcança dark-wine. E nenhuma superfície que roda dark-wine pinta o glow hoje (o showcase
não consome `--page-glow`). É latente, não vivo.

**Conserto:** o teste de glass precisa compor o stop mais forte de `glass-page-glow` sob
a superfície, e cobrir `surface-overlay` além de `surface-raised`.

### D-5 · `--chart-accent-2` no brasa é órfão: a rampa do §6 não existe

`themes/brasa.css:199` tem `--chart-accent-2`. `--chart-accent` (a ponta lime) **não
existe no brasa** — só no dark-wine. O §6 define a rampa como interpolação de uma ponta à
outra; com uma ponta só não há rampa. E nada consome nenhum dos dois: `BarChart.tsx:127`
pinta por `chartCategoryVar` (`--chart-cat-1..5`).

O card do kanban (`V1-KANBAN.md:363`) afirma "o brasa ganhou `chart.accent-2` **para a
rampa lime→âmbar**". O handoff BLUR é honesto no corpo ("a rampa fica pela metade"), mas
o Estado dele diz "as duas pontes do contrato concluídas". O §6 não fechou.

**Conserto:** ou o dono decide a ponta lime do brasa (decisão de marca) e a rampa nasce
com consumidor, ou o token órfão sai e o §6 reabre.

### D-6 · A camada glass depende de ordem de arquivo, não de especificidade (latente)

Duas coisas frágeis no contrato CSS que a lane TOKENS publicou:

1. `themes/brasa.css:1` abre com `:root:not([data-theme]),\n[data-theme="brasa"] {`. Pela
   Selectors L4, `:root:not([data-theme])` tem especificidade **(0,2,0)** (`:root` 0-1-0
   mais o argumento do `:not()`, 0-1-0). O bloco de ativação é `[data-glass="on"]`,
   **(0,1,0)**. Num documento com `data-glass="on"` e **sem** `data-theme`, o bloco de
   tema vence e **o vidro não faz nada, em silêncio**. Não alcança o painel
   (`ThemeProvider` escreve `data-theme` no MESMO `<html>`, em layout effect, antes do
   paint), mas alcança qualquer consumidor que use o `rootFallback` — que é a razão de o
   `rootFallback` existir (anti-FOUC em SSR).
2. O fallback `@supports` só vence porque é o **último bloco** de `index.css`. Os três
   arquivos de tema repetem o par [ativação, `@supports`], e a ativação do dark-wine
   sobrescreve o fallback do wine, que sobrescreveu o do brasa. Hoje fecha certo; um
   quarto tema que emita a ativação depois do último `@supports` mata o fallback dos três,
   com todos os gates verdes.

**Honestidade da prova:** sondei com jsdom (`getComputedStyle` do `<html>` com e sem
`data-theme`) e ele devolveu o valor de vidro nos dois casos — jsdom não modela a
especificidade do `:not()`. Então o item 1 é aritmética de spec, não browser executado.
O item 2 é ordem de arquivo, e essa eu li direto no CSS gerado (linhas 474/482 e
1432/1440 de `index.css`).

**Conserto:** `:root[data-glass="on"]` na ativação (empata em (0,2,0) e vence por ordem),
e envolver a ativação em `@supports (backdrop-filter: blur(1px))` para a correção parar
de depender de ordem.

### D-7 · Um club sem agregado transforma o KPI do tenant em "NaN"

`packages/api-client/src/clubs.ts:91` — `snap.docs.map(d => ({ ...(d.data() as
Omit<Clube,'id'>), id: d.id }))`, sem normalização e sem default.
`packages/core/src/clubs/clube.ts:96` mostra que a criação **omite**
`qtdMembrosAtivos`/`qtdDesafiosAtivos` (quem escreve é Function), então existe janela em
que o doc não tem o campo.

`_lib/engajamento.ts:121` — `clubes.reduce((s, c) => s + c.qtdMembrosAtivos, 0)`.
Executado: `NaN`. `Intl.NumberFormat('pt-BR').format(NaN)` → `"NaN"` na tela.

A classe é pré-existente (`ClubeCard.tsx:33` e `OverviewClube.tsx:32` fazem o mesmo por
club), mas o raio mudou: **um doc ruim envenena a soma do tenant inteiro**, não só o
próprio cartão.

**Conserto:** `?? 0` no redutor, ou normalizar na leitura do `api-client` (que é onde o
resto do produto também se beneficia).

### D-8 · O §5 (Movimento) não entrou, e nenhum handoff registra que não entrou

`grep -rnE "animate|keyframe|motion-safe|prefers-reduced-motion|stagger"` nos arquivos
novos do Engajamento e da Visão Geral: **nada**. `BarChart.tsx:123` —
`isAnimationActive={false}`. Não há cascata de entrada, não há barra crescendo da
esquerda, não há contador de keyframe por filtro.

O vetor 7 pergunta por "reanimação por filtro afetado (não global)". A resposta é que ela
é vacuamente verdadeira: não há reanimação nenhuma. `prefers-reduced-motion` idem — não há
movimento para reduzir (o `Drawer` do DS já respeita, via `motion-safe:`, mas isso é
pré-existente).

O defeito não é o movimento faltar; é **nenhum dos três handoffs listar o §5 como fora de
escopo ou como lacuna**. A seção some do registro entre o README e a entrega.

**Conserto:** decidir com o dono se o §5 entra. Se não entrar, precisa estar escrito.

### D-9 · `aria-expanded` no gatilho do drawer (§8)

`AppShell.tsx:114` — `<IconButton aria-label={menuLabel} onClick={() =>
setMenuOpen(true)}>`, sem `aria-expanded`. O README §8 pede nomeadamente.

O resto do §8 re-provado e verde: `Drawer.tsx:107` `if (!presente) return null` (o scrim e
o painel montam **só quando abertos**), scrim com `aria-hidden` (`:113`), foco preso por
`useDialogBehavior`, movimento gated por `motion-safe:`. Pré-existente ao pacote, mas o
§8 estava no contrato e ninguém registrou.

### D-10 · CTA de markup cru no estado vazio novo

`EngajamentoView.tsx:181-188` usa um `<button>` nu estilizado como texto sublinhado
(`text-[length:var(--font-size-sm)] … underline`), sem padding — alvo de toque na casa
dos 20px. `ComunidadeResumo.tsx:81`, para o MESMO trabalho ("Criar um club"), usa o
`<Button variant="secondary" size="sm">` do DS. Duas gramáticas para a mesma ação, no
mesmo pacote. **Flag de candidato a primitivo (G-001).**

**Nota honesta sobre os 44px:** os controles do DS têm `--input-height: 40px`, abaixo dos
44 do §8 — mas o próprio §8 aceita 40 ("o hambúrguer é 40×40 com área de toque efetiva
maior pelo padding do cabeçalho"). Os controles novos herdam o padrão da casa; não conto
como defeito novo. O `<button>` cru acima, sim.

### D-11 · A barra de ações do hub de clubs corta o próprio CTA primário abaixo de `lg`

`HubClubes.tsx:107-121` — cinco botões em `flex items-center gap-[var(--spacing-2)]`,
**sem `flex-wrap`**, dentro do contêiner `shrink-0` do `PageHeader.tsx:106`. O `<main>` é
`overflow-hidden` e o contêiner de rolagem é `SCROLL_Y_ONLY` (eixo x fechado), então o
excesso é **cortado, não rolável**. O último filho é `+ Criar clube`.

Pré-existente com quatro botões; este pacote acrescentou o quinto (Engajamento). A lane
TELA registrou como "balde" de varredura — o custo real é o CTA primário sumindo no
mobile. Também bate em `design-principles` §b ("foco na informação"): quatro botões
secundários acima de uma lista.

### D-12 · Móvel de gráfico para duas barras, e zero sem fonte nos pilares

- `resumirPonteComEventos` devolve **exatamente duas** categorias, renderizadas como
  `BarChart` completo (`EngajamentoView.tsx:369`): faixa de 34px por barra, tooltip,
  tabela `sr-only`. Por `design-principles` §c/§d, dois números são um par de estatísticas,
  não um gráfico.
- `_lib/engajamento.ts:161` — `PILARES.map(...)` devolve **sempre os três pilares**. Um
  desafio Modelo C que declare mínimo só para `fisico` produz barras "Mental 0" e
  "Espiritual 0": zeros sem fonte, na mesma tela que recusa desenhar zero em seis outros
  blocos.
- O eixo do `BarChart` trunca (`YAxis width={92}` fixo, `BarChart.tsx:110`) — vetável 3 da
  lane TELA, confirmado.
- O tooltip do `BarChart` é filho do card, não overlay de raiz (README §6). Na prática o
  Recharts posiciona por `absolute` dentro do próprio wrapper do gráfico, então o modo de
  falha que o §6 descreve (`position: fixed` reancorado por bloco de contenção) não
  dispara. Os overlays que usam `fixed` no DS (Dialog, Drawer, DropdownMenu, Modal) todos
  passam por `createPortal`, então o `backdrop-filter` novo dos cards — que **cria bloco
  de contenção e contexto de empilhamento** quando não é `none` — não os alcança. Risco
  registrado, sem defeito observável hoje.

---

## Vetores que passaram (com a prova, não com o benefício da dúvida)

**Fiação do vidro (vetor 3).** `SuperficieDoPainel.tsx:37` usa `useLayoutEffect`, que roda
depois do commit e antes do paint — atributo e conteúdo trocam no mesmo quadro. O teste
cobra o valor **sem `waitFor`** logo após a navegação por link real
(`SuperficieDoPainel.test.tsx:58-80`), nos dois sentidos: 5/5 verde isolado. A limpeza no
desmonte impede vazamento entre casos (`:82-89`). O casamento é por **segmento**
(`superficie.ts:47`), então `/plataformas-legais` continua sendo do organizador — coberto
nos 19 casos de `superficie.test.ts`. Preferência: o vidro **não** é preferência do
usuário, é derivado da rota sem storage; o tema segue persistindo pelo `ThemeProvider`
com a chave `leela-theme-preference` intocada e a retrocompat `leela → wine` viva
(`ThemeProvider.tsx:88-101`, 18/18).

**Fallback `@supports`.** Não dá para simular ausência de `backdrop-filter` sem browser, e
esta lane não tem browser. O que dá para provar é a cascata, e provei lendo o CSS gerado:
em `index.css` a ordem é [tema brasa] → [ativação] → [`@supports`] → [tema wine] →
[ativação] → [`@supports`] → [tema dark-wine] → [ativação] → [`@supports`], e o último
bloco do arquivo (linha 1440) é o fallback, que remapeia `--surface-raised` para
`var(--surface-raised-opaque)` — resolvido por tema, porque a var é escopada ao bloco do
tema. Num browser sem `backdrop-filter`, o card cai para o opaco correto. Fragilidade
estrutural registrada em D-6.

**O preto do admin.** Resolvido do CSS gerado: em `/plataforma` o vidro é `off`, o tema
continua brasa, e o fundo computado é `--surface-base` → `--neutral-950` → **`#0C0C0C`**.
Não é `#000000`. A diferenciação que o dono pediu acontece pelo glow (que some) e pela
translucidez (que some), não pela cor de fundo, que é a mesma nas duas áreas. Se "preto
mesmo" para ele significa `#000`, isso é decisão de marca, não conserto — vai para a
lista dele.

**Rota e guarda (vetor 4).** `/plataforma/*` continua dentro de `RequireSessao` →
`ContaTravadaGate` → `PlataformaRoutes` → `PlatformShell` → `PlatformGuard` (403 sem claim
`platform_admin`) — `App.tsx:56-95`, `PlatformShell.tsx:16-24`. A fiação do vidro não
toca guarda nenhuma: `SuperficieDoPainel` renderiza `null` e só escreve um atributo.
`/clubes/engajamento` é rota **estática antes** do coringa `:slug`
(`ClubesRoutes.tsx:52`), provado sobre a árvore real com deep-link
(`MemoryRouter initialEntries`) em 6/6, incluindo a não-regressão das quatro irmãs e do
detalhe de club.

**Verdade de dado do Engajamento (vetor 5), fora de D-1 e D-2.** Rastreei query → campo
para cada bloco. `qtdMembrosAtivos`/`qtdDesafiosAtivos` (`clube.ts:84-86`, agregado ∑ de
Function), `qtdParticipantes`/`progressoPct` (`desafio.ts:144-146`), `membros.status`
(RN-102), `membros.entrouVia`, `desafios.eventoVinculadoId` (RN-113) — todos existem e
são mantidos por Function, o cliente só lê e soma contador fechado. Estados: o container
(`EngajamentoPage.tsx:64-80`) resolve erro → sem clubs → loading → dado, nessa ordem, e
**nenhum caminho renderiza zero no lugar de vazio**; falha parcial derruba a tela inteira
de propósito (`_data/engajamento.ts:87-88`). Os seis blocos sem fonte recebem vazio que
nomeia métrica e causa. Isso é bom trabalho e fica dito.

---

## O que só o olho do dono fecha

Herdado dos três handoffs, mais o que esta review acrescenta. Nenhum item aqui é
conserto: é julgamento de marca ou conferência que exige tela de verdade.

1. **O vidro em movimento.** Rolar a Visão Geral e ver o glow parado atrás dos cards.
   Nenhum teste jsdom calcula `background-attachment: fixed`. Vale a pena olhar também no
   Safari: o CSS não emite `-webkit-backdrop-filter`, então Safari 17 e anteriores caem no
   opaco (comportamento seguro, mas é vidro que não aparece).
2. **A diferença entre os dois painéis.** Abrir `/` e `/plataforma/tenants` e sentir a
   troca sem ler rótulo. Se o `#0C0C0C` do admin não lê como preto, é decisão dele.
3. **O pareamento Exo 2 + Rubik em corpo pequeno.** Os cortes estão carregados e as
   famílias saem de token (gate); a mistura é julgamento.
4. **O desfoque de verdade nos quatro cartões**, e a deriva do D-3 ao lado deles na mesma
   tela — vale olhar as duas coisas juntas, porque a decisão é uma só.
5. **Nome longo truncando no eixo dos gráficos** (`YAxis width={92}`), com nome real de
   evento e de desafio.
6. **A cor clara do gradiente `thumb-virtual` do dark-wine** — reprova AA em t=0,25
   (2,45:1 contra piso 3:1), marcada `it.fails` em `contrast.test.ts:442`. Precisa de cor
   nova, e cor é marca. *(Nota de QA: `it.fails` sobre um laço de três pontos passa se
   QUALQUER um falhar — quando a cor for corrigida em t=0,25, o teste só fica verde de
   novo se os três passarem. Marcador aceitável, mas não é uma trava fina.)*
7. **A ponta lime do `--chart-accent` no brasa** (D-5) — decisão de marca que a rampa do
   §6 espera.
8. **Se o `EventRow` também vira vidro** — mesmo padrão CSS dos cartões, não é nomeado
   cartão no DS (achado da lane BLUR, inalterado).
9. **Se o §5 (movimento) entra ou sai do escopo** (D-8) — hoje ele não existe e não está
   registrado em lugar nenhum.
10. **`governanca-design.md` desatualizado** — cita `primitives.leela.json` (nome
    pré-rename) e não menciona wine nem dark-wine. Achado herdado, ainda aberto.
11. **Métricas de comunidade que precisam de backend** para sair do vazio honesto:
    check-in de club, leitura de `atletas/{uid}/registros` pelo organizador, agregado por
    janela/bucket, contagem de visitante (RN-489), vínculo membro↔comprador, agregado por
    meio de pagamento. Lista completa no handoff da lane TELA.

---

## Para o maestro

- **O contrato desta lane traz um commit-base errado.** `dd5b0e05` é posterior a metade
  do pacote. Qualquer review futura que confie nele vai relatar "nada mudou" sobre o
  dark-wine, o glass, o ThemeProvider e a fiação da superfície. A base certa é
  `9fbcd9ab`.
- **A lane de fix é separada e não foi aberta por mim.** Nenhuma linha de produto foi
  tocada aqui. D-1 e D-2 são o pedido mínimo; D-3, D-5, D-7 e D-8 valem o mesmo despacho
  porque são baratos e ficam na mesma vizinhança de arquivos.
- **Sem deploy, sem navegador**, conforme a regra da casa.

---
---

# Re-gate delta (2026-08-10)

Escopo estrito: **só os dois pagamentos**. Os dez achados não bloqueantes da
review original seguem registrados e não reabrem aqui. Fonte: lane FIX, commits
`5826466d` (código, 6 arquivos) e `c1c8124a` (board + handoff), handoff
`.nirvana/handoffs/leela-redesign-ds-20260809-FIX.md`.

## Veredito final

# LIBERADA PARA DEPLOY

D-1 e D-2 estão pagos, e pagos direito: a ponderação é a certa contra o contrato,
o teste prova o que diz provar, e o rótulo passou a dizer o que o número é. Zero
regressão nos onze arquivos que a review original usou como prova.

O delta produziu três achados novos. Nenhum deles bloqueia, e digo por quê antes
de listá-los: os dois bloqueadores originais eram defeitos do **caminho normal**
(toda tela com mais de um desafio mostrava número sem significado; toda tela
afirmava inatividade). Os três novos são de **caminho de borda** ou de raio
menor, e caem na mesma faixa em que a review original já havia classificado o
D-7 como "não bloqueia". Manter a barra no mesmo lugar vale mais do que
aproveitar a proximidade do arquivo para subir a régua.

---

## D-1 · PAGO

### A ponderação está certa contra o contrato

`resumirPilares` passou a acumular `atual × peso` e `meta × peso` por pilar, com
`peso = desafio.qtdParticipantes`, somar os pesos **por pilar** e dividir no
final. É `Σ(atualᵢ·nᵢ)/Σnᵢ`, com `arred1`.

A justificativa da lane FIX confere. Em
`functions/src/jornada/onRegistroWrite.ts:211-242`, a MESMA `participantesSnap`
(linha 211) gera o array `participantes` (218) que vai para
`derivarProgressoPorPilar` (233-236, que divide por `participantes.length`) e o
`qtdParticipantes: participantesSnap.size` (239), gravados no mesmo `update()`.
Então `atualᵢ · nᵢ` recupera a soma bruta de pontos daquele desafio, e dividir
pela soma dos pesos devolve a média real por participante da comunidade
inteira. Não é aproximação: é a inversa exata da média que a Function tirou.

O acumulador de peso é **por pilar**, não global, o que é o detalhe que faz a
conta fechar quando um desafio reporta `fisico` e outro reporta `espiritual`.

### O caso 2×500 prova o que diz provar

Executei a função REAL (import direto de
`apps/painel/src/routes/clubes/engajamento/_lib/engajamento.ts` via `tsx`, não
transcrição minha):

```
(100*2 + 10*500)/502 = 10.358565737051793 -> arred1 = 10.4
(200*2 + 20*500)/502 = 20.717131474103585 -> arred1 = 20.7
funcao real          = {"pilar":"fisico","rotulo":"Físico","atual":10.4,"meta":20.7}
soma crua (bug antigo) daria atual = 110  | media simples daria = 55
```

O teste separa três hipóteses de uma vez: ponderada (10,4), média simples (55) e
soma crua (110). O primeiro teste do bloco, com pesos iguais (40/40), não
distinguiria ponderada de simples sozinho, mas o 2×500 distingue, e o par ainda
prova o denominador por pilar (mental sai 30 vindo só do desafio A, espiritual
sai 10 vindo só do B). O `expect(...).not.toBe(110)` é redundante depois do
`toBe(10.4)`, o que é ruído, não fraqueza.

### O rótulo diz o que o número é

"Média de pontos por participante em cada pilar sobre o mínimo exigido,
ponderada pelo tamanho dos desafios que operam equilíbrio", e o `aria-label` do
gráfico (o que o leitor de tela ouve) diz o mesmo. `formatValue` trocou para
`formatDecimal1`, então a casa decimal é sempre visível (`150` sai `150,0`) e o
número nunca se disfarça de contagem. Verificado no teste da View pela tabela
`sr-only`: `75,4 / 150,9`.

Resíduo mínimo, registrado e não bloqueante: o denominador exibido também é uma
**média ponderada dos mínimos**, não um limiar único. Quando dois desafios têm
mínimos diferentes, a barra compara contra um mínimo médio. O JSDoc do tipo diz
isso ("Meta média ponderada pela mesma base"); a copy da tela diz "sobre o mínimo
exigido", e o "ponderada" da frase se lê como qualificando a média, não o
mínimo. Uma palavra resolve, se o dono achar que vale.

---

## D-2 · PAGO

Rótulo: "Inativos (30 dias+)" → **"Sem registro (30 dias+)"** (confirmado
executando o módulo: `ROTULO_SITUACAO = {"novo":"Novos (7 dias)",
"ativo":"Ativos","inativo":"Sem registro (30 dias+)"}`). Legenda: "quem está sem
atividade há 30 dias ou mais" → "quem está há 30 dias ou mais **sem nenhum
registro de atividade**". A frase deixou de afirmar um fato sobre o membro e
passou a afirmar a ausência de registro, que é o que o sistema sabe.

O teste da View não só afirma a legenda nova, como **falsifica a antiga**
(`expect(screen.queryByText(/sem atividade há 30 dias/i)).not.toBeInTheDocument()`).
Teste de falsificação é o formato certo aqui, e é o que impede a frase de
voltar por descuido.

### A varredura que o maestro pediu

`grep -rniE "sem atividade|inativ|última atividade|atividade há"` sobre
`apps/painel/src` e `apps/landing`, descartando testes e comentários. **A tela de
Engajamento está limpa.** Sobraram três superfícies, **todas pré-existentes e
fora do diff deste pacote** — não bloqueiam este deploy, mas a resposta honesta à
pergunta é que o produto ainda carrega a afirmação em outro lugar:

1. **`apps/landing/app/(public)/minha-conta/PainelClubes.tsx:58`** —
   `inativo: 'Sem atividade'`. É a frase exata que o D-2 removeu do painel, viva
   no painel do **próprio atleta**, sobre o mesmo `status` e o mesmo
   `derivarStatus`. Audiência pior: diz à pessoa que ela não teve atividade,
   quando ela pode ter treinado ontem. É o item que eu levaria primeiro para a
   próxima lane.
2. **`apps/painel/src/routes/clubes/clube/membros/MembrosList.tsx:111`** —
   `<KpiCard label="Inativos" hint="candidatos a reengajamento" />`, e o badge
   `_lib/membros.ts:17` (`label: 'Inativo'`). O rótulo afirma comportamento e o
   `hint` empurra uma ação baseada nele.
3. Sem defeito: `_components/MembrosTable.tsx:65` usa o cabeçalho **"Último
   registro"** para `ultimaAtividadeEm`. Já é honesto. A coluna simplesmente
   fica vazia em produção. Achado retirado.

A pendência real continua sendo o **escritor de `membro.ultimaAtividadeEm`**,
card de backend, corretamente recusado pela lane FIX por território.

---

## Achados novos do delta (nenhum bloqueia)

### N-1 · O ramo defensivo do D-1 desenha zero onde não há base

`resumirPilares` incrementa `desafiosComPilar += 1` **antes** da guarda
`if (peso <= 0) continue`. Executando a função real:

```
=== A · desafio COM pilar e qtdParticipantes = 0 ===
desafiosComPilar = 1
linhas           = [{"p":"fisico","atual":0,"meta":0},{"p":"mental","atual":0,"meta":0},{"p":"espiritual","atual":0,"meta":0}]
=> a tela desenha o grafico? SIM — tres barras em ZERO
```

A View decide o estado vazio por `semPilares = pilares.desafiosComPilar === 0`.
Com `1`, ela pula o vazio honesto ("Sem desafio de equilíbrio") e desenha três
barras em zero sob o rótulo "média de pontos por participante". É a mesma classe
que o D-1: número sem base apresentado como medição.

**E é alcançável em produção**, não só em teoria.
`onRegistroWrite.ts:242` faz `if (progressoPorPilar) update['progressoPorPilar'] = ...`
— quando `derivarProgressoPorPilar` devolve `null` (zero participantes) o campo
**não é escrito e não é apagado**, enquanto `qtdParticipantes` é atualizado para
`0` no mesmo `update()`. Um desafio que esvaziou fica exatamente com
`progressoPorPilar` presente e `qtdParticipantes: 0`.

Mesmo resultado com o campo ausente num doc legado (`undefined <= 0` é `false`,
então a guarda não pega, e a conta vira `NaN` antes de virar `0`):

```
=== B · desafio COM pilar e qtdParticipantes AUSENTE (doc legado) ===
desafiosComPilar = 1
linhas           = [{"p":"fisico","atual":0,"meta":0}, ...]
```

O caso misto está **correto**, e é por isso que isto não bloqueia: um desafio
vazio ao lado de um cheio não distorce nada (`fisico = {"atual":50,"meta":80}`,
os valores exatos do desafio que pesou). O defeito só aparece quando **todos** os
desafios com pilar no recorte têm peso zero.

O teste novo da lane (`'desafio sem participante não pesa (e não gera NaN)'`)
afirma `atual: 0, meta: 0` e **não afirma `desafiosComPilar`** — trava a saída
errada sem enxergar a consequência na tela. É o ponto cego.

**Conserto (1 linha):** mover `desafiosComPilar += 1` para depois da guarda, ou
derivar `desafiosComPilar` dos desafios que efetivamente pesaram. O teste ganha
uma asserção de `desafiosComPilar === 0`.

### N-2 · D-7 está pago pela metade, e a metade que faltou é a mais visível

O handoff FIX registra D-7 como pago. `membrosAtivos` ganhou `?? 0`;
`participacoes`, três linhas abaixo no mesmo objeto, não. Executado:

```
membrosAtivos = 120 | renderiza = "120"
participacoes = NaN | renderiza = "NaN"
```

"Participações" é um dos quatro KPIs do topo da tela. Um desafio sem
`qtdParticipantes` escrito ainda imprime **"NaN"** para o organizador.
Não bloqueia porque o D-7 nunca foi bloqueador na review original, e mover a
régua agora só porque o arquivo está aberto seria incoerente. Mas a afirmação
"D-7 pago" no handoff FIX precisa virar "D-7 pago em `membrosAtivos`".

**Conserto (1 linha):** `?? 0` também em
`ativos.reduce((s, d) => s + d.desafio.qtdParticipantes, 0)`.

### N-3 · Herdado, sem novidade

`resumirPilares` continua devolvendo os três pilares sempre (`PILARES.map`), então
um Modelo C que declare mínimo só para `fisico` segue desenhando "Mental 0" e
"Espiritual 0". Já estava no D-12 da review original, não mudou, e não reabre.

---

## Regressão: nenhuma

| Verificação | Resultado |
|---|---|
| Território | `git show --name-only 5826466d`: **6 arquivos, todos em `apps/painel/src/routes/clubes/`**. Zero em `packages/`, zero token, zero rota |
| Zero hex/px/rgba nas linhas adicionadas | `git show 5826466d -- 'apps/painel/**' \| grep '^+' \| grep -E '#[0-9a-fA-F]{3,8}\|rgba?\(\|[0-9]+px'` → **saída vazia** |
| Painel · type-check | `tsc --noEmit` limpo, sem output |
| Painel · lint | `eslint src --max-warnings 0` limpo, sem output |
| Arquivos tocados, isolados | `engajamento.test.ts` **23/23** · `EngajamentoView.test.tsx` **18/18** · `format.test.ts` **4/4** |
| Os 8 arquivos que a REV usou como prova, isolados | `ClubesRoutes` 6/6 · `marca-executavel` 9/9 · `superficie` 19/19 · `SuperficieDoPainel` 5/5 · `GlowDaPagina` 3/3 · `ComunidadeResumo` 6/6 · `OcupacaoEventos` 11/11 · `ocupacao` 7/7 — **todos idênticos ao pré-FIX** |
| Painel · suíte completa | `vitest run` → **2387 passed / 2387, 225 arquivos, exit 0**, 375,79s (era 2378/224 antes do FIX: +9 testes, +1 arquivo, exatamente o que a lane acrescentou) |
| DS | não re-rodado por escopo: o commit não toca `packages/` (provado acima) |

Nenhum dos vetores da review original mudou de resposta. O isolamento de tema, a
fiação do vidro, a guarda de rota e a prova de marca continuam como estavam.

---

## O que vai junto para a próxima lane

Ordem de valor por custo, todos de uma linha mais teste:

1. **N-1** — `desafiosComPilar` depois da guarda de peso. É o único que produz
   número falso na tela.
2. **N-2** — `?? 0` em `participacoes`, e corrigir a linha do handoff FIX.
3. **D-2 residual** — `'Sem atividade'` no painel do atleta
   (`apps/landing/.../PainelClubes.tsx:58`) e o par
   `label="Inativos"` + `hint="candidatos a reengajamento"` em `MembrosList.tsx:111`.
4. **D-9** — `aria-expanded` em `AppShell.tsx:114`, recusado por território pela
   lane FIX com razão. Precisa de mandato sobre `packages/design-system`.
5. Os demais achados da review original (D-3, D-4, D-5, D-6, D-8, D-11, D-12),
   inalterados.

E a pendência de produto que nenhuma lane de painel resolve: **o escritor de
`membro.ultimaAtividadeEm`**. Enquanto ele não existir, "Sem registro (30 dias+)"
é o teto de honestidade da tela, e é isso que ela afirma agora.

---

**Adendo (2026-08-10, lane DEPLOY):** o pacote liberado acima subiu ao ar —
prova em `.nirvana/handoffs/leela-redesign-ds-20260809-DEPLOY.md`.

