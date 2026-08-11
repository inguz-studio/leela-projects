---
tags: [leela, design, refactor, painel, design-system]
origem: estudo de design "Redesign das telas Leela" (Claude)
data: 2026-08-10
---

# REFACTOR — delta do estudo de design sobre o que já está em `main`

## Leia isto primeiro

**O trabalho de 09/08 já está implementado.** As lanes `leela-redesign-ds-20260809`
TOKENS (`c23d916b`, `5a895da8`, `b5e75f49`, `3ecbe818`) e TELA (`9d00c305`,
`69203486`, `2c5f3066`, `fcc4ce33`) estão seladas em `main`: tema dark-wine,
camada glass, Exo 2 + Rubik, tokens `--peso-*`, Visão Geral v3 e
`/clubes/engajamento`.

Este documento **não pede para construir nada de novo**. Ele lista o que mudou no
protótipo **depois** daquela entrega, arquivo por arquivo. Cada item é uma
alteração cirúrgica em código que já existe.

---

## ⚠ Qual tela é esta — leia antes de qualquer coisa

**Tudo neste documento é sobre a tela de ENGAJAMENTO**, na rota
`/clubes/engajamento`, implementada em
`apps/painel/src/routes/clubes/engajamento/`.

**Nada aqui é sobre a Visão Geral** (`apps/painel/src/routes/overview/`). A Visão
Geral não muda neste trabalho — `LEELA-E02` mantém analytics aprofundado fora
dela.

Há duas armadilhas que já causaram a leitura errada uma vez:

1. **O protótipo tem "Visão Geral" escrito no H1.** O arquivo de referência é um
   estudo montado dentro do shell do painel, e o cabeçalho ficou com o texto da
   home. **Ignore o H1.** O que importa são os cards de análise abaixo dele:
   Mapa de Check-ins, Volume de Check-ins, funil, pilares, ações. Esses são os
   cards da tela de Engajamento.
2. **A URL do Netlify serve esse mesmo estudo** — e portanto também mostra
   "Visão Geral" no topo. Mesma regra: ignore o título, olhe os cards.

**Arquivo de referência, único:**
`design_handoff_engajamento/design/engajamento-referencia.dc.html`

O pacote não contém nenhum outro arquivo de design. Se você encontrar um segundo,
ele não é deste trabalho.

**Referência visual viva:** https://leela-vis-o-geral-cd-cc500dffee.netlify.app
Abra e interaja (troque tema, filtros, redimensione) — lembrando das duas
armadilhas acima. Não copie HTML dela; é protótipo, não código de produção.

---

**Contexto de cautela:** existe um incidente aberto de 10/08
(`.nirvana/handoffs/leela-incidente-tela-preta-20260810.md`) que menciona
`RootShell` + `AppShell` + `Sidebar` + card translúcido. Leia antes de tocar no
shell — dois itens abaixo caem exatamente nesses arquivos.

---

## Sumário: 13 itens em 4 grupos

| # | Item | Território |
|---|---|---|
| 1 | `--card-blur` ganha consumidor (fecha vetável 1 da lane TELA) | DS |
| 2 | Rampa lime→âmbar no brasa (fecha vetável 2 da lane TELA) | DS |
| 3 | Ícones Lucide oficiais no catálogo da Sidebar | DS |
| 4 | Glass do brasa mais escuro | DS |
| 5 | Drawer: scrim montado só quando aberto | DS |
| 6 | Quebra de 480px (KPIs e legenda em coluna única) | DS/painel |
| 7 | Mapa de Check-ins: monocromático + normalização min-max | painel |
| 8 | Tooltip de gráfico como overlay de raiz | painel |
| 9 | Filtro por card, não global | painel |
| 10 | Animação escopada por filtro | painel |
| 11 | Volume de Check-ins: hora do dia como padrão + datas nas semanas | painel |
| 12 | Títulos e tooltips de cabeçalho; fim do "ponto de equilíbrio" | painel |
| 13 | Top 5 por pilar + overlay Top 10 | painel |

---

# Grupo A — fecha os vetáveis que a lane TELA deixou abertos

## 1. `--card-blur` ganha consumidor

**Arquivos:** `packages/design-system/src/components/Card/Card.tsx` ·
`packages/design-system/src/components/KpiCard/KpiCard.tsx`

A lane TOKENS entregou o token e a lane TELA registrou que **nenhum componente o
consome** — então hoje o modo vidro tem superfície translúcida, glow fixo e o fio
de luz, mas **não desfoca**. É a diferença entre "card meio transparente" e
"vidro".

Uma linha em cada, inerte fora do modo vidro (no modo opaco o token é `none`):

```
backdrop-filter: var(--card-blur);
```

A proposta da própria lane TELA era exatamente esta, e ela deliberadamente **não**
fez ponte no app para não criar drift de superfície. Aplicar no DS resolve as
telas novas e as antigas no mesmo gesto.

## 2. Rampa lime→âmbar existe no brasa

**Arquivos:** `packages/design-system/tokens/primitives.brasa.json` ·
`semantic.json` (ou `semantic.brasa` se houver) — depois `pnpm generate-tokens`

A lane TELA mediu: `--chart-accent` e `--chart-accent-2` **só existem em
`dark-wine.css`**. Brasa e wine têm apenas `--chart-cat-1..5`. Como o painel do
organizador roda brasa, a rampa da §6 do README anterior nunca aparece em
produção, e os rankings caem na paleta categórica.

Valores do estudo:

| Tema | `chart.accent` | `chart.accent-2` |
|---|---|---|
| brasa | `{primary.400}` (laranja da marca, `#FF450C`) | `{accent.400}` (lime, `#C8E84A`) |
| wine | `{primary.500}` (`#7A1520`) | `#7E9B12` |
| dark-sea (se existir) | `#D8E0E8` | `#C8E84A` |

**Sem isso, os itens 7 e 11 deste documento não têm cor para pintar.** É
pré-requisito, não polimento.

## 3. Ícones Lucide oficiais

**Arquivo:** `packages/design-system/src/components/Sidebar/Sidebar.tsx`
(`DEFAULT_SIDEBAR_SECTIONS`)

Os ícones do menu mudaram de significado, não só de desenho:

| Item | Antes | Agora | Por quê |
|---|---|---|---|
| Visão Geral | `layout-dashboard` | `layout-dashboard` | mantém |
| Eventos | `calendar` | **`ticket`** | evento é ingresso, não data |
| Clubs | `user` | **`heart`** | comunidade, não pessoa |
| CRM | `bell` | **`user`** | pessoa é o cliente |
| Marcas | `briefcase` | **`megaphone`** | patrocínio comunica |
| Configurações | `settings` | `settings` | mantém |

`ticket` é **exclusivo do item de menu** — agenda e campos de data seguem com
`calendar`/`calendar-check`. Todos os paths saem de `lucide-icons/lucide@main`
verbatim; `lucide-react` já é peer dep.

Há uma cópia desatualizada em
`packages/design-system/showcase/src/sections/IconsPage.tsx` (lista hardcoded
citando Financeiro e Analytics) — a lane IAMENU registrou e pulou. Bom momento
para fechar.

---

# Grupo B — glass e shell

## 4. Glass do brasa mais escuro

**Arquivo:** `packages/design-system/tokens/glass.json` (ou onde os `--glass-*`
do brasa vivem) → `pnpm generate-tokens`

O vinho do brasa estava lavado sob o desfoque. Dois valores:

```
glass.surface-raised.brasa : rgba(30, 11, 16, 0.42)
glass.page-glow.brasa      : radial-gradient(75% 55% at 22% -8%, rgba(92,16,26,.72), transparent 62%),
                             radial-gradient(55% 45% at 96% 8%, rgba(255,69,12,.06), transparent 60%),
                             radial-gradient(65% 55% at 108% 104%, rgba(70,12,20,.48), transparent 62%)
```

dark-wine e wine **não mudam**. A suíte `glass.test.ts` (27 casos) precisa seguir
verde: o par superfície/texto continua acima de 4.5:1 sobre o fundo composto.

## 5. Drawer: scrim montado só quando aberto

**Arquivo:** `packages/design-system/src/components/AppShell/AppShell.tsx`

Bug real encontrado na verificação do protótipo, e vale para o AppShell: um scrim
que existe sempre e anima por `transition` a partir de `opacity: 0` **nunca
commita o estado inicial**, então sobra uma camada transparente interceptando
cliques com o menu fechado.

Correção: montar o scrim condicionalmente e animar por `@keyframes` (fade de
240ms), não por transição. Se o AppShell hoje já monta condicional, ignore o
item — verifique antes.

Aproveite para o `aria-expanded` que três lanes já registraram e nenhuma pôde
tocar (`AppShell.tsx:111`/`:114`, `IconButton aria-label={menuLabel}`) — é a
mesma linha.

## 6. Quebra de 480px

**Arquivos:** `AppShell.tsx` ou as telas, conforme onde os grids vivem

Os breakpoints `sm 640 · md 768 · lg 1024` do `tailwind-preset.ts` seguem
valendo, com `lg` como colapso do shell — nada muda aí. O estudo acrescentou
**uma** quebra abaixo de 480px, medida em 390 e 430:

- blocos de 4 KPIs: de 2×2 para **1 coluna** (em 2×2 o rótulo corta);
- legenda de donut com 4 itens: para **1 coluna** (trunca "Crédito 7 a 12x");
- as divisórias verticais entre KPIs saem junto (sem coluna, não separam nada).

Medido: nenhum overflow horizontal em 390, 430, 768 e 1024; paddings 40px→20px
abaixo de `md` mantidos.

---

# Grupo C — dataviz da tela de ENGAJAMENTO

**Território:** `apps/painel/src/routes/clubes/engajamento/` — e só ele.
Todos estes itens são de `EngajamentoView.tsx` e `_lib/engajamento.ts`.

Se você se pegar editando qualquer arquivo em
`apps/painel/src/routes/overview/`, pare: está na tela errada.

## 7. Mapa de Check-ins: monocromático + normalização min-max

Dois defeitos de leitura, um de cor e um de escala.

**Cor.** A rampa interpolava entre duas cores ao longo da intensidade, o que faz
o heatmap parecer categórico ("verde é uma coisa, âmbar é outra"). Um heatmap é
**uma variável só** — logo, **um tom só**, variando opacidade:

```
tom = o mais quente do tema (laranja no brasa, âmbar no dark-wine)
alfa(k) = 0.06 + k^0.75 * 0.94
```

A translucidez tem propósito duplo: deixa o vidro aparecer sob as células fracas.

**Escala — o defeito mais importante.** Normalizar `0 → máximo` esmaga a
variação quando a série é agrupada: com valores entre 18 e 88, nenhuma célula
chega perto do piso, tudo cai na faixa média e o mapa parece uniforme. Normalize
no **intervalo real da série**:

```
k = (v - min) / (max - min)
```

**Contraste:** o número dentro da célula escolhe claro ou escuro pela luminância
do fundo composto, e o alfa **sobe** em passos de 5% enquanto a razão estiver
abaixo de 4,6:1. Medido nos quatro temas: mínimo 4,64:1, nenhuma célula abaixo de
4,5. A legenda "menos → mais" usa exatamente a mesma função de alfa — o que ela
mostra é o que a célula pinta.

**Recorte por hora do dia.** O mapa alterna entre semana × dia e dia × faixa
horária (6 faixas, 5–8h … 20–23h). Na visão semanal os rótulos de linha são
**intervalos de data** (`26/06–03/07`), não `S1..S6`.

> Nota de dado: a lane TELA documentou que **não existe check-in de club** no
> backend (`registrarCheckin` é o QR da largada) e que
> `atletas/{uid}/registros` não é legível pelo organizador. Este item é a
> **forma** do gráfico; ele só sai do empty-state quando houver fonte. Implemente
> a forma agora se e somente se o dado existir — caso contrário, mantenha o
> estado vazio honesto e guarde este item.

## 8. Tooltip de gráfico como overlay de raiz

**Causa raiz, que vale como regra do DS:** o card tem `transform: translateY(-2px)`
no hover. Um ancestral com `transform` vira bloco de contenção, então
`position: fixed` passa a se ancorar **no card**, e o tooltip vai para trás dos
vizinhos.

Correção: renderizar o tooltip em nível de raiz (portal), não como filho do card,
com `z-index` acima dos cards, seguindo o cursor por `mousemove`. E declarar
`font-family` explicitamente — fora da árvore do painel ele deixa de herdar a
família e cai na fonte do sistema.

Conteúdo do tooltip do mapa: total da célula + divisão entre os três pilares
(valor e percentual).

## 9. Filtro por card, não global

Cada card tem **seu próprio** estado de recorte. Havia um filtro compartilhado
entre "Mapa de Check-ins" e "Volume de Check-ins" — clicar num mudava os dois, o
que não faz sentido semântico e provocava relayout dos vizinhos.

Junto: a grade do mapa reserva **altura do pior caso** (7 linhas) com
`align-content: start`, então alternar recorte não muda a altura do card.
Medido: 446px em qualquer combinação. As legendas dos dois cards ficam ancoradas
no rodapé, na mesma linha.

## 10. Animação escopada por filtro

**Regra:** trocar um filtro reanima **só o gráfico afetado**. Um contador global
reanima a tela inteira a cada clique — era o comportamento anterior e lê como
falha.

Implementação: um contador **por filtro**, alternando entre dois nomes de
keyframe idênticos (`dcBar`/`dcBar2`). Trocar o nome força o browser a rodar a
animação de novo sem remontar o nó, então o estado do componente sobrevive.

| Filtro | Reanima |
|---|---|
| período | ações e pilares |
| club | funil |
| aba de pilar | lista de ações |
| recorte semana/hora | só o card daquele recorte |

Barras crescem da esquerda (`transform-origin: left`, 750ms
`cubic-bezier(.22,1,.36,1)`); áreas empilhadas crescem da base
(`transform-origin: 50% 100%`, `scaleY`, 600ms). Tudo desligado sob
`prefers-reduced-motion`, mantendo o estado final.

## 11. Volume de Check-ins

- **"Hora do dia" é o padrão inicial** e fica à esquerda no par de abas.
- Eixo X em intervalos de data na visão semanal (mesmo formato do item 7).
- As áreas reanimam ao trocar o filtro (item 10).
- Tooltip nomeia a faixa/semana e o total, com os três pilares.

## 12. Títulos e tooltips de cabeçalho

- "Quando a comunidade aparece" → **"Mapa de Check-ins"**
- "Pilares ao longo do tempo" → **"Volume de Check-ins"**
- O subtítulo descritivo **sai** dos dois e vira o conteúdo de um "?" ao lado do
  título, que acompanha o recorte selecionado.
- **A marca de "ponto de equilíbrio (33%)" some** das barras de pilar, junto com
  a linha "X pontos acima/abaixo do equilíbrio" e a nota de rodapé. Não existe
  equilíbrio-alvo entre pilares — era invenção de design. O card diz apenas qual
  pilar concentra a maior parte dos check-ins.

## 13. Top 5 por pilar + overlay Top 10

A lista de ações ganha abas **Físico / Mental / Espiritual**, mostrando o top 5 do
pilar escolhido, e um link "Ver top 10" que abre overlay com as dez ações mais
registradas de todos os pilares, cada uma com etiqueta do pilar.

Números e unidades saem do catálogo real de ações (km, sessões, min, páginas,
noites, horas) e acompanham o período selecionado. O agregado do card soma **todo
o catálogo** — trocar de aba não muda o número-título.

---

# O que NÃO tocar

- **Valores pré-existentes de brasa e wine** além do que os itens 2 e 4 pedem. A
  lane TOKENS provou por diff que nenhum valor antigo mudou; preserve isso.
- **Retrocompat `'leela' → 'wine'`** e a chave `leela-theme-preference`.
- **`data-glass` derivado da rota** (`shell/superficie.ts` +
  `SuperficieDoPainel.tsx`). O vidro é a marca de qual painel está aberto, não
  preferência do usuário. O estudo tem um switch de glass porque é protótipo —
  **não porte esse switch.**
- **A Visão Geral inteira** (`apps/painel/src/routes/overview/`). Nenhum item
  deste documento toca nela. `LEELA-E02` mantém analytics aprofundado fora da
  Visão Geral — não mova os gráficos do Grupo C para lá por parecerem bonitos
  lá, e não "aproveite" para harmonizar as duas telas.
- **Os empty-states honestos** do Engajamento. Onde não há fonte, não há gráfico
  zerado — vale para tudo neste documento.
- **Gradiente `thumb-virtual` do dark-wine** (vetável de marca em aberto, 2,45:1
  contra piso 3:1). Não conserte por conta própria.

---

# Gates

Os mesmos da lane anterior, mais um:

| Gate | Comando |
|---|---|
| Type-check | `pnpm run type-check` |
| Lint | `pnpm run lint` (`--max-warnings 0`) |
| Tokens determinísticos | `pnpm generate-tokens` duas vezes → sem diff |
| Contraste | `vitest run` em `contrast.test.ts` + `glass.test.ts` |
| Suíte do DS | `pnpm --filter design-system run test` |
| Suíte do painel | `vitest run src/routes/clubes src/routes/overview src/shell` |
| Zero hex/px no diff | `git show \| grep -E '#[0-9a-fA-F]{3,8}\|rgba?\(\|[0-9]+px'` |
| **Contraste do heatmap** | nenhuma célula abaixo de 4,5:1 nos temas ativos |

O último é novo e é o que protege o item 7: a translucidez do mapa só é
aceitável porque o alfa sobe quando o contraste cai.

---

# Ordem de execução

**Primeira conversa (DS):** itens 2, 1, 4, 3, 5, 6 — nesta ordem. O item 2 vem
primeiro porque o grupo C depende dele.

**Segunda conversa (painel):** itens 9, 10, 7, 8, 11, 12, 13.

Separe as duas. O diff do pipeline de tokens é grande o bastante para poluir o
contexto da tela, e os critérios de revisão são diferentes.
