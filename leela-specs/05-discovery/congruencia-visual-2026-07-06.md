# Auditoria de congruência visual — mockup Claude Design vs design system

> Data: 2026-07-06 · Squad: magic-ds (despacho Nirvana-OS, trace leela-build-2d6ee98d)
> Escopo: passo 1 do protocolo de intake (`handoff-claude-design.md`) executado retroativamente + exame das queixas reportadas pelo Vitor no preview ("tabelas, hover de buttons, espaçamentos, border radius e o sistema de cores não estão tão congruentes").
> Fontes: `WEB-APPV2 (1)/be-hero.css` (2110 linhas, :root L5-60) vs `packages/design-system/tokens/*.json` + `themes/brasa.css` (saída gerada) + componentes em `packages/design-system/src/components/`. Screenshots: `.nirvana/outputs/leela-build-2d6ee98d/lote-b-screens/`.
> Método: valores exatos dos dois lados, com composição alpha calculada quando o mockup usa rgba e o DS usa hex opaco. Contrastes WCAG calculados (relação sRGB).

---

## 1. Resumo executivo

O diagnóstico central: **o DS não traduziu a paleta do mockup — substituiu-a**. Os nomes semânticos batem 1:1 (como o handoff previa), mas as escalas primitivas por trás deles são outras. Dos 35 hex únicos do mockup, só 4 existem no DS (`#FF450C`, `#0C0C0C`, `#161616`, `#FFFFFF`). As famílias de status inteiras (vulcao, vitoria, alerta) viraram paletas Tailwind stock (danger, success, warning), e a família heroico (rosa) não existe no DS — o Badge mapeia `heroico` para `info` (azul). É por isso que o badge "Publicado" aparece **azul** na tela (`02-eventos-lista.png`) num sistema visual que não tem um único azul no mockup.

### Contagem por grupo

| Grupo | Iguais | Divergentes | Observação |
|---|---|---|---|
| Semânticos de cor (20 compartilhados por nome) | 5 | 15 | 5 de impacto alto, 6 médio, 4 desprezível |
| Primitivos (35 hex do mockup) | 4 | 31 | 4 famílias inteiras trocadas, 1 ausente (heroico) |
| Radius (6) | 4 | 2 | `sm` 6px→4px; `xs` sem par; bridge shadcn rebaixa card 12→8px |
| Elevação (4) | 0 | 4 | mockup tem anel hairline .5px branco em todas; DS não |
| Motion (4) | 1 | 3 | easings totalmente diferentes; 240ms vs 250ms |
| Tipografia — famílias (3) | 3 | 0 | Exo 2 / Exo 2 / JetBrains Mono dos dois lados |
| Tipografia — tamanhos | 6 | 6 usados sem par | mockup usa 11, 13, 15, 18, 22, 28px; escala DS pula esses degraus |
| Tipografia — pesos | 2 | 2 ausentes | DS não tem 500 nem 800 (mockup usa ambos; brand-mark é 800) |
| Tokens de componente (btn/input/badge/table) | — | 14 divergências numéricas | detalhadas no §3 |

### Top 10 divergências por impacto visual

1. **Paleta de status trocada + heroico→azul.** vitoria `#136A01/#2D9315/#5CB73B` → success Tailwind `#22C55E/#4ADE80`; vulcao `#FF2F2D` → danger `#EF4444`; alerta `#E8B100` → warning `#F59E0B`; heroico rosa `#ED3585` → info azul `#3B82F6` no Badge. Muda a cor de todo badge, alerta e feedback da tela. — **decisão Vitor** (identidade vs contraste; greens do mockup são mais escuros)
2. **Pressed do botão primário invertido.** Mockup escurece (`#E03800`, be-hero.css:463 via :root L34); DS clareia (`#FF8E6E` = primary-300, semantic.json:21). Todo clique em botão primário pisca para o lado errado. — **adotar mockup**
3. **Botão secondary com outra personalidade.** Mockup: outline transparente com borda, hover vira brand-tint (`rgba(255,69,12,.08)` + borda `#FF450C` + texto `#FF6520`, be-hero.css:464-469). DS: filled cinza `#242424`→hover `#383838`, sem borda (Button.tsx:66-70). — **adotar mockup**
4. **Sidebar: fundo e item ativo.** Mockup: sidebar no fundo da página `#0C0C0C`, ativo com tint laranja `rgba(255,69,12,.10)` + texto `#FF6520` + barra 2px `#FF450C` (be-hero.css:84-163). DS: sidebar `#161616` (surface-raised, Sidebar.tsx:111), ativo cinza `#242424` com texto branco, sem barra (Sidebar.tsx:172-174). Visível em todos os screenshots. — **adotar mockup**
5. **Densidade de tabela.** DS: linha 64px, célula px 20px, corpo 14px, header 12px (component.json:61-66, Table.tsx:96,117,224). Mockup: linha ~47px (py 14px, sem altura fixa), célula px 16px, corpo 13px, header 10px (be-hero.css:483-507). E o mockup embrulha em `.table-wrap` (raised + radius 12 + elev-1, L477-482); o DS renderiza a tabela nua. — **adotar mockup**
6. **text-tertiary 2 tons mais claro.** `#6D6D6D` → `#999999`. Todo label, metadado e sub-texto da tela clareou. Contraste sobre `#0C0C0C`: mockup 3.78:1 (falha AA texto pequeno), DS 6.87:1 (passa). — **decisão Vitor**
7. **radius-sm 6px → 4px + card 12px → 8px.** O degrau 6px não existe no DS; botão, input, nav-item, search, menus caem para 4px. Card DS usa `rounded-lg` = `var(--radius)` = radius-md 8px (bridge shadcn, tailwind-preset.ts:136, brasa.css:235) onde o mockup usa 12px em todo card/kpi. — **adotar mockup**
8. **Bordas: alpha-branco → cinza opaco, e mais claras.** Mockup: `rgba(255,255,255,.06/.12/.24)` (efetivo sobre raised: `#242424/#323232/#4E4E4E`). DS: `#242424/#383838/#737373`. border-strong efetivo salta de `#4E4E4E` para `#737373` — o input de 1px `#737373` (Input.tsx:84 via border-input) é muito mais pesado que o `.5px` a 12% do mockup (be-hero.css:1092-1093). — **decisão Vitor** (o DS documenta WCAG 1.4.11: a borda do mockup dá 1.41:1, a do DS 3.82:1)
9. **Elevação sem o anel hairline.** Mockup elev-1/2/3 têm `0 0 0 .5px rgba(255,255,255,.04/.06/.08)` além da sombra (be-hero.css:42-44); DS usa sombras Tailwind sem anel (primitives.brasa.json:127-133). O "recorte" sutil de cada card sumiu. Glow brand: 24px/.35 vs 20px/.4. — **adotar mockup**
10. **Hover primário + motion.** Hover `#FF6520` vs `#FF6640` (a divergência-semente do intake, agora explicada: é a escala primitiva inteira, não um token). Easing `cubic-bezier(.2,.8,.2,1)` (snappy) vs `cubic-bezier(0.4,0,0.2,1)` (Material default); dur-normal 240ms vs 250ms. — **adotar mockup** (escala brasa-400) / easing adotar mockup

Placar: **6 "adotar mockup" óbvias** (2, 3, 4, 5, 7, 9, mais o easing do 10) e **4 que exigem decisão do Vitor** (1, 6, 8, e o par fg-do-botão + hover que depende de qual escala primitiva vence — §4).

---

## 2. Diff completo de tokens

Convenção: valores efetivos (referências resolvidas). Par de linhas: `be-hero.css:L` vs arquivo do DS. Veredito: ✅ igual · ⚠️ divergente-menor · ❌ divergente.

### 2.1 Primitivos — escala da marca

Mockup `--brasa-*` (be-hero.css:7-9) vs DS `primary.*` (tokens/primitives.brasa.json:2-13):

| Step | be-hero `--brasa-*` | DS `--primary-*` | Veredito |
|---|---|---|---|
| 50 | `#FFE9DC` | `#FFF3F0` | ❌ |
| 100 | `#FFC9A8` | `#FFD9CC` | ❌ |
| 200 | `#FFA575` | `#FFB49D` | ❌ |
| 300 | `#FF8244` | `#FF8E6E` | ❌ |
| 400 | `#FF6520` | `#FF6640` | ❌ (o hover do primário) |
| 500 | `#FF450C` | `#FF450C` | ✅ único ponto de contato |
| 600 | `#E03800` | `#D63600` | ❌ |
| 700 | `#B82D00` | `#A92A00` | ❌ |
| 800 | `#8C2100` | `#7D1E00` | ❌ |
| 900 | `#5C1600` | `#4F1300` | ❌ |

A escala DS é mais rosada/pálida nos claros e mais amarronzada nos escuros. Toda referência `{primary.N}` com N≠500 rende cor diferente do mockup.

### 2.2 Primitivos — status e neutros

| Família mockup (be-hero.css:10-17) | Valores mockup | Família DS (primitives.brasa.json) | Valores DS no mesmo papel | Veredito |
|---|---|---|---|---|
| vulcao 300/400/500 | `#FF5E5C` `#FF4140` `#FF2F2D` | danger (L14-25) | 300 `#FF8888`, 400 `#FF5555`, 500 `#EF4444` | ❌ família trocada |
| heroico 300/400/500 | `#F9619A` `#F14890` `#ED3585` | **não existe** | Badge mapeia p/ info azul `#3B82F6` | ❌ ausente |
| vitoria 300/400/500 | `#5CB73B` `#2D9315` `#136A01` | success (L26-37) | 300 `#86EFAC`, 400 `#4ADE80`, 500 `#22C55E` | ❌ família trocada (Tailwind green, muito mais claro) |
| alerta 500 | `#E8B100` | warning (L38-49) | 500 `#F59E0B` | ❌ |
| info (azul) | **não existe no mockup** | info (L50-61) | `#3B82F6` etc. | família só do DS |
| neutro 0/850/800/700/650/550/500/350/300/150/white | `#000` `#0A0A0A` `#0C0C0C` `#161616` `#1C1C1C` `#292929` `#313131` `#555` `#6D6D6D` `#B6B6B6` `#FFF` | neutral 0-950 (L62-75, direção invertida) | `#FFFFFF` `#F9F9F9` `#F0F0F0` `#E0E0E0` `#BFBFBF` `#999999` `#737373` `#545454` `#383838` `#242424` `#161616` `#0C0C0C` | só `#0C0C0C`, `#161616` e branco coincidem; os degraus intermediários escuros do mockup (`#1C1C1C` `#292929` `#313131`) **não existem** no DS |

### 2.3 Semânticos (nome a nome)

be-hero.css:20-39 vs themes/brasa.css:115-145 (fonte: tokens/semantic.json:2-41). Contrastes sobre `#0C0C0C` quando relevante.

| Token | be-hero (efetivo) | DS (efetivo) | Veredito | Impacto percebido | Recomendação |
|---|---|---|---|---|---|
| surface-base | `#0C0C0C` (L20) | `#0C0C0C` (L115) | ✅ | — | — |
| surface-raised | `#161616` (L21) | `#161616` (L116) | ✅ | — | — |
| surface-overlay | `#1C1C1C` (L22) | `#242424` (L117) | ❌ | popovers/menus/panels mais claros | adotar mockup (exige degrau `#1C1C1C` na escala) |
| surface-high | `#292929` (L23) | `#383838` (L118) | ❌ | hover ghost/chips/toggle bem mais claro | adotar mockup (degrau `#292929`) |
| surface-sunken | `#0A0A0A` (L24) | `#0C0C0C` (L119) | ⚠️ | kbd/recessos perdem 1 tom | adotar mockup |
| text-primary | `#FFF` (L25) | `#F9F9F9` (L120) | ⚠️ | imperceptível | manter DS |
| text-secondary | `#B6B6B6` (L26) | `#BFBFBF` (L121) | ⚠️ | 9.65:1 vs 10.64:1 — quase imperceptível | manter DS |
| text-tertiary | `#6D6D6D` (L27) | `#999999` (L122) | ❌ | 3.78:1 vs 6.87:1 — todos os labels/metadados clarearam | **decisão Vitor** (mockup falha AA p/ texto <18px) |
| text-disabled | `#555` (L28) | `#545454` (L123) | ⚠️ | imperceptível | manter DS |
| text-brand | `#FF450C` (L29) | `#FF450C` (L124) | ✅ | — | — |
| text-danger | `#FF2F2D` (L30) | `#FF8888` (L125) | ❌ | 5.31:1 vs 8.50:1 — vermelho vivo → salmão | **decisão Vitor** (mockup passa AA; DS foi além) |
| text-success | `#2D9315` (L31) | `#4ADE80` (L126) | ❌ | 4.93:1 vs 11.23:1 — verde militar → verde menta | **decisão Vitor** (idem) |
| action-primary | `#FF450C` (L32) | `#FF450C` (L127) | ✅ | — | — |
| action-primary-hover | `#FF6520` (L33) | `#FF6640` (L128) | ❌ | hover mais rosado | adotar mockup (via escala brasa) |
| action-primary-pressed | `#E03800` (L34) | `#FF8E6E` (L129) | ❌ | **direção invertida**: escurece vs clareia | adotar mockup |
| border-subtle | `rgba(255,255,255,.06)` (L35) ≈ `#242424` s/ raised | `#242424` opaco (L141) | ⚠️ | igual sobre raised; sobre base o mockup rende `#1B1B1B` (mais escuro) | **decisão Vitor** (alpha adapta à superfície; opaco não) |
| border-default | `rgba(255,255,255,.12)` (L36) ≈ `#323232` s/ raised | `#383838` (L142) | ❌ | bordas ~1 tom mais claras | adotar mockup ou aproximar |
| border-strong | `rgba(255,255,255,.24)` (L37) ≈ `#4E4E4E` s/ raised | `#737373` (L143) | ❌ | 2.17:1 vs 3.82:1 sobre raised — outline/inputs bem mais claros | **decisão Vitor** (WCAG 1.4.11 pede ≥3:1; mockup falha) |
| border-brand | `#FF450C` (L38) | `#FF450C` (L144) | ✅ | — | — |
| border-focus | `#FF6520` (L39) | `#FF6640` (L145) | ❌ | anel de foco rosado | adotar mockup (segue a escala) |

Tokens só do DS (sem par nominal no mockup, mas com equivalente de facto nas classes):

| Token DS | DS (efetivo) | Equivalente de facto no mockup | Veredito |
|---|---|---|---|
| action-primary-fg | `#0C0C0C` (semantic.json:23) | `.btn-primary { color: white }` (be-hero.css:461) | ❌ **decisão Vitor**: branco/`#FF450C` = 3.44:1 (falha AA 14px); `#0C0C0C` = 5.69:1 (passa). Mockup quer branco. |
| action-secondary(+hover) | filled `#242424`→`#383838` (semantic.json:24-25) | outline transparente → brand-tint (be-hero.css:464-469) | ❌ personalidade diferente (ver §3.2) |
| action-ghost-hover | `#242424` (semantic.json:27) | `--surface-high` `#292929` (be-hero.css:471) | ❌ |
| action-destructive(+hover) | `#EF4444`→`#FF5555` (semantic.json:29-30) | `#FF2F2D`→`#FF4140` (be-hero.css:1520-1521) | ❌ mesma direção (clareia), cores da família trocada |
| feedback-*-surface/-fg | opacos (success-900 `#14532D` + success-50 `#F0FDF4` etc.) | tints alpha (`rgba(19,106,1,.2)` ≈ `#152712` + texto `#5CB73B`) | ❌ ver §3.5 badges |

### 2.4 Radius

be-hero.css:54 vs themes/brasa.css:96-101 (tokens/primitives.brasa.json:119-126):

| Token | be-hero | DS | Veredito | Onde dói |
|---|---|---|---|---|
| xs | `4px` | não existe (`none: 0px` no lugar) | ⚠️ nome | badges/trends usam xs=4 → DS sm=4 cobre |
| sm | `6px` | `4px` | ❌ | botões, inputs, nav-item, search, menus, chips de tab — tudo 2px mais quadrado |
| md | `8px` | `8px` | ✅ | — |
| lg | `12px` | `12px` | ✅ | — |
| xl | `16px` | `16px` | ✅ | — |
| pill | `9999px` | `9999px` | ✅ | — |
| bridge shadcn | — | `rounded-lg` = `var(--radius)` = **8px**; `md`=6px, `sm`=4px por calc (tailwind-preset.ts:136-138, brasa.css:235) | ❌ | `Card` usa `rounded-lg` (Card.tsx:34) → **8px** onde todo card do mockup é `radius-lg` **12px** (kpi L287, event-row L392, table-wrap L479...) |

### 2.5 Elevação

be-hero.css:42-45 vs primitives.brasa.json:127-133 (brasa.css:102-106):

| Token | be-hero | DS | Veredito |
|---|---|---|---|
| elev-1 | `0 1px 2px rgba(0,0,0,.4), 0 0 0 .5px rgba(255,255,255,.04)` | `0 1px 3px 0 rgba(0,0,0,0.3), 0 1px 2px -1px rgba(0,0,0,0.3)` | ❌ sem anel hairline |
| elev-2 | `0 4px 12px rgba(0,0,0,.5), 0 0 0 .5px rgba(255,255,255,.06)` | `0 4px 6px -1px rgba(0,0,0,0.4), 0 2px 4px -2px rgba(0,0,0,0.4)` | ❌ blur menor, sem anel |
| elev-3 | `0 8px 32px rgba(0,0,0,.6), 0 0 0 .5px rgba(255,255,255,.08)` | `0 10px 15px -3px rgba(0,0,0,0.5), 0 4px 6px -4px rgba(0,0,0,0.5)` | ❌ idem |
| elev-brand | `0 0 24px rgba(255,69,12,.35)` | `0 0 20px 0 rgba(255,69,12,0.4)` | ⚠️ |

O anel `.5px` branco é o que separa card de fundo num tema quase-preto — sem ele os cards do painel "afundam" (visível nos screenshots: kpis de `05-visao-geral-pos-fix.png` são retângulos chapados).

### 2.6 Motion

be-hero.css:48-51 vs primitives.brasa.json:134-145:

| Token | be-hero | DS | Veredito |
|---|---|---|---|
| dur-fast | `150ms` | `150ms` | ✅ |
| dur-normal | `240ms` | `250ms` | ⚠️ |
| (slow) | — | `400ms` | só DS |
| ease-standard / default | `cubic-bezier(.2,.8,.2,1)` | `cubic-bezier(0.4, 0, 0.2, 1)` | ❌ o do mockup é snappy (overshoot suave); o do DS é o Material stock |
| ease-emphasized / enter+exit | `cubic-bezier(.3,.7,0,1)` | enter `cubic-bezier(0,0,0.2,1)`, exit `cubic-bezier(0.4,0,1,1)` | ❌ sem par |

### 2.7 Tipografia

| Aspecto | be-hero | DS (primitives.brasa.json:76-103) | Veredito |
|---|---|---|---|
| Famílias | `'Exo 2'`, `'JetBrains Mono'` (L57-59) | idem | ✅ |
| Base do body | 16px / lh 1.55 (L68-69) | `font-size-base` = 14px / lh base 1.5 | ❌ (mas o mockup usa 12-14px na prática; base 16 é só o root) |
| Tamanhos usados no mockup | 9, 10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24, 28, 32, 34, 40, 42, 72px | escala: 10, 12, 14, 16, 20, 24, 32, 40, 48px | ❌ faltam degraus **11, 13, 15, 18, 22, 28** — 13px é o tamanho de tabela/menus do mockup inteiro |
| Pesos usados | 500, 600, 700, 800 | tokens: 400, 600, 700 | ❌ faltam **500** (nav-item, chips, labels) e **800** (brand-mark, countdown) |
| Headings | h1 40px, h2 32px, h3 24px, h4 20px — todos display + itálico (L223-256) | escala cobre (3xl/2xl/xl/lg) | ✅ tamanhos; itálico é padrão de uso, não token |

### 2.8 Espaçamento

A escala DS (4/8/12/16/20/24... primitives.brasa.json:104-118) cobre os paddings do mockup — as divergências reais estão nos **tokens de componente** (§3) e num degrau: o mockup usa 6px (gaps de botão/quick-actions), 10px (gaps de listas), 14px (paddings de célula/panel) que não têm token no DS (usáveis via arbitrary, mas fora da escala).

---

## 3. Exame por queixa do Vitor

### 3.1 Tabelas

| Aspecto | Mockup `.table`/`.dtable` | DS `Table` | Veredito |
|---|---|---|---|
| Container | `.table-wrap`: raised `#161616` + radius 12px + elev-1 + overflow hidden (be-hero.css:477-482) | nenhum — `<table>` nua com overflow-x (Table.tsx:44-50) | ❌ a tabela do mockup é um card; a do DS flutua no fundo |
| Altura de linha | sem altura fixa; py 14px → ~47px efetivos (L499-501); `.dtable` py 12px → ~43px (L1431-1436) | `--table-row-height: 64px` (component.json:62; Table.tsx:224) | ❌ **+36% de altura por linha** — a queixa de densidade |
| Padding célula | 14px 16px (L500) / 12px 16px (L1432) | 14px 20px (component.json:63-64) | ❌ px 16→20 |
| Fonte corpo | 13px (L486, L1420) | `--font-size-base` 14px (Table.tsx:118) | ❌ |
| Header | 10px / 600 / uppercase / ls .08em / bg `rgba(255,255,255,.015)` (L488-498) | 12px / 600 / uppercase / ls .08em / **sem bg** (Table.tsx:96-102) | ❌ fonte +2px, sem o fio de fundo do thead |
| Cor corpo | células `text-secondary` `#B6B6B6`, col destacada `text-primary` (L499-524) | tudo `text-foreground` = text-primary `#F9F9F9` (Table.tsx:120) | ❌ hierarquia de coluna sumiu — tudo branco |
| Hover | `.table`: `rgba(255,255,255,.02)` (L507); `.dtable`: `surface-high` `#292929` (L1438) | `surface-raised` `#161616` (Table.tsx:224) | ❌ se a tabela estiver sobre raised, o hover do DS é invisível |
| Zebra | não há (só border-b hairline .5px) | não há (border-b 1px subtle) | ✅ conceito; ⚠️ espessura .5px→1px e cor (§2.3) |
| Selecionada | `rgba(255,69,12,.06)` (L1439) | sem estado no DS | ❌ ausente |

### 3.2 Hover de botões

| Variante | Mockup (be-hero.css:441-474, 1520-1523) | DS (Button.tsx:60-83 + tokens) | Veredito |
|---|---|---|---|
| primary rest | bg `#FF450C`, **texto branco** (L461) | bg `#FF450C`, texto `#0C0C0C` (action-primary-fg) | ❌ fg |
| primary hover | `#FF6520` (L462) | `#FF6640` | ❌ |
| primary active | `#E03800` — escurece (L463) | `#FF8E6E` — **clareia** (primary-300) | ❌ direção invertida |
| secondary rest | transparente + borda 1px `border-strong` + texto primary (L464-468) | filled `#242424` + texto `#F9F9F9`, border-0 (L66-70) | ❌ outline vs filled |
| secondary hover | bg `rgba(255,69,12,.08)` + borda `#FF450C` + texto `#FF6520` (L469) | bg `#383838` | ❌ brand-tint vs cinza |
| ghost hover | `surface-high` `#292929` + texto primary (L471) | `#242424` (ghost-hover) + fg `#F9F9F9` | ❌ valor |
| destructive | `#FF2F2D` → hover `#FF4140` (L1520-1521) | `#EF4444` → `#FF5555` | ❌ família de cor |
| destructive-ghost | existe no mockup (L1522-1523) | não existe no DS | ❌ variante ausente |
| transição | background/border/color 150ms ease-standard (L455) | transition-colors 150ms easing-default | ⚠️ duração ok, easing diverge |
| dimensões md | h 36px / px 14px / 14px (L447-451) | h 40px / px 16px / **16px** (component.json:3-13) | ❌ botão DS maior e com fonte +2px |
| dimensões sm | h 32px / px 12px / 13px (L472) | h 32px / px 12px / 12px | ⚠️ só fonte |
| dimensões lg | h 48px / px 20px / 16px (L473) | h 48px / px 20px / 16px | ✅ |
| radius | 6px (L449) | 4px (btn-radius = radius.sm) | ❌ |

Nenhum botão do mockup muda elevação no hover; cards sim (translateY(-1px/-2px) + elev-1→elev-2, L296-299, L402). O DS não tem esse hover de card.

### 3.3 Espaçamentos

| Elemento | Mockup | DS | Veredito |
|---|---|---|---|
| Card KPI | padding 20px, gap 12px (be-hero.css:285-295) | `Card` p-24px fixo (Card.tsx:47,84) | ❌ |
| Side panel | 18px (L647) | 24px | ❌ |
| Cards financeiros/chart | 24px (L1643, L1681) | 24px | ✅ |
| Grid de KPIs | gap 16px (L282) | tela usa spacing-4 16px | ✅ |
| Main | padding 32px 40px 48px, gap 24px (L209-210) | conferir por tela (fora do DS) | — |
| Sidebar: nav | padding 16px 12px, gap entre itens 2px (L117-120) | py 16px + gap 4px (Sidebar.tsx:117,131) | ⚠️ |
| Sidebar: item | padding 10px 12px, gap ícone 12px, radius 6px (L131-137) | px 16px, gap 12px, radius 4px (Sidebar.tsx:163-167) | ❌ px e radius |
| Célula de tabela | 14px 16px | 14px 20px | ❌ (§3.1) |
| Input | h 44px, px 14px (L1098-1099) | h 40px, px 16px (component.json:17-20) | ❌ |
| Badge | 3px 7px (L345) | h 22px, px 8px (component.json:24-28) | ❌ |

### 3.4 Border radius (mapa por componente)

| Componente | Mockup | DS efetivo | Delta |
|---|---|---|---|
| Botão | 6px | 4px | -2px |
| Input/search | 6px | 4px | -2px |
| Nav-item | 6px | 4px | -2px |
| Card/kpi/event-row/table-wrap | 12px | Card: 8px (`rounded-lg` → `--radius` = radius-md) | **-4px** |
| Menu popover | 8px (L968) | popover shadcn `rounded-md` = calc(8-2) = 6px | -2px |
| Badge/trend | 4px | 4px | ✅ |
| Chip | pill | pill | ✅ |
| Avatar | pill/50% | pill | ✅ |
| Checkbox | 3px (L1453) | sem token (skeleton-radius=4px como proxy) | ⚠️ |

Raiz do problema: dois sistemas de radius convivem no DS — os tokens `--radius-*` (corretos exceto sm) e o bridge shadcn (`--radius` = md → `rounded-lg/md/sm` recalculados, tailwind-preset.ts:133-138). Componentes que usam classes shadcn (`Card`, popovers stock) herdam radius menor que o mockup.

### 3.5 Sistema de cores (mapa primitivo→semântico dos dois lados)

Cadeia do mockup: `brasa/vulcao/heroico/vitoria/alerta/neutro` → semânticos → classes. Cadeia do DS: `primary/danger/info/success/warning/neutral` (escalas **diferentes**) → mesmos nomes semânticos → componentes. Onde a tradução mudou a cor na tela:

1. **Badges** (be-hero.css:337-356 vs Badge.tsx:41-48): mockup usa tint alpha da própria família + texto no tom 300 (ex.: vitoria = bg `rgba(19,106,1,.2)` ≈ `#152712` + texto `#5CB73B`, 10px/700/uppercase). DS usa surface opaca 900 + fg 50 (ex.: `#14532D` + `#F0FDF4`, 12px/600/sem uppercase). E `heroico` → `feedback-info-*` = **azul** (`#1E3A8A`/`#EFF6FF`): o badge rosa do mockup virou azul. Evidência: badge "Publicado" azul em `02-eventos-lista.png` e `05-visao-geral-pos-fix.png`; no mockup (`Meus Eventos.html`) o equivalente é `badge-vitoria`/`badge-brasa`.
2. **Estados ativos brand-tint**: o mockup pinta ativo/selecionado com `rgba(255,69,12,.10-.14)` (nav L150, tile L1215, chip L1393, camp-item L1871, linha selecionada L1439). O DS não tem token para brand-tint (alpha com var() hex é proibido no pipeline — Button.tsx:15) e caiu em cinza (`action-ghost-hover`). Precisa de token dedicado (ex.: `--action-brand-tint: rgba(255,69,12,.10)` como valor literal por tema).
3. **text-danger/success/tertiary**: §2.3 — metadados mais claros, feedbacks pastel.
4. **Sidebar**: fundo `#0C0C0C` (mesma cor da página, separada só pela borda) no mockup vs `#161616` no DS — a sidebar do DS parece um painel, a do mockup parece parte do fundo.
5. **Gradientes de marca** (avatar L185, countdown L585, thumbs L412-415): usam brasa-400/heroico-500 — no DS, avatar cai em `primary-400` `#FF6640` e não existe heroico. Gradientes renderizam diferente.

---

## 4. O que exige decisão do Vitor (com trade-off explícito)

| # | Decisão | Opção mockup | Opção DS | Trade-off |
|---|---|---|---|---|
| D1 | Paleta de status (vitoria/vulcao/alerta) | verdes militares, vermelho vivo, âmbar | Tailwind green/red/amber | identidade da marca vs contraste maior das paletas Tailwind |
| D2 | Família heroico (rosa) | criar `heroico.*` no DS e remapear Badge | manter info azul | mockup não tem azul em lugar nenhum; azul quebra a linguagem |
| D3 | text-tertiary | `#6D6D6D` (3.78:1 — falha AA <18px) | `#999999` (6.87:1) | fidelidade visual vs acessibilidade; meio-termo possível (~`#8A8A8A` ≈ 5.5:1) |
| D4 | Texto do botão primário | branco (3.44:1 — falha AA 14px) | `#0C0C0C` (5.69:1) | o mockup inteiro usa branco; bold 14px+ atenua mas não resolve AA |
| D5 | Borda de input | `.5px rgba(255,255,255,.12)` (1.41:1 — falha 1.4.11) | `1px #737373` (3.82:1) | o DS documentou a razão (Input.tsx:8-11); um meio-termo (`#5A5A5A` ≈ 3:1 exato) mantém mais o clima |
| D6 | Bordas alpha vs opacas | rgba branco (adapta à superfície) | hex opaco (RN-friendly: o pipeline resolve para RN, generate.ts:48-52) | alpha quebra a saída React Native do generate; opaco desloca a cor fora da surface raised |
| D7 | text-danger/text-success | `#FF2F2D`/`#2D9315` (5.31/4.93:1 — passam AA) | `#FF8888`/`#4ADE80` | aqui o mockup passa AA; a troca do DS foi além do necessário |

Tudo o mais do top 10 é "adotar mockup" sem custo de acessibilidade: pressed escurecendo, secondary outline, sidebar ativa laranja, densidade de tabela, radius sm 6px, card 12px, anel hairline nas elevações, easing snappy, dimensões de botão md, tamanhos 11/13/15/18/22/28px e pesos 500/800 na escala tipográfica, degraus `#1C1C1C`/`#292929` nos neutros, token de brand-tint.

## 5. Definition of done (§4 do handoff) — estado

- [x] Diff de tokens executado (este doc)
- [ ] Divergências decididas e registradas (aguarda D1-D7 do Vitor; as "adotar mockup" podem virar patch de tokens imediatamente)
- [ ] Requisitos de layout transcritos nos épicos
- [ ] Mapa classe→componente completo
- [ ] Baselines do gate visual

*Gerado por magic-ds (mds-tokens + mds-ui) · Fable/Opus · read-only exceto este arquivo.*
