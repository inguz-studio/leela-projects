# Handoff — Design System Leela: tema dark-wine, camada glass e tela de Engajamento

## Visão geral

Este pacote entrega três coisas, nesta ordem de prioridade:

1. **Tema `dark-wine`** — terceiro tema do DS (vinho escuro + acento lime da marca), no mesmo formato dos temas existentes.
2. **Camada `glass`** — glassmorphism como par de tokens por tema, ligável/desligável, sem componente lendo valor cru.
3. **Tela de Engajamento do organizador** — painel de análise da comunidade (clubs → eventos), que consome os dois itens acima.

## Sobre os arquivos de design

Os arquivos `.dc.html` deste pacote são **referências de design feitas em HTML** — protótipos que mostram aparência e comportamento pretendidos, **não** código de produção para copiar. A tarefa é **recriar esses designs no ambiente do monorepo** (`packages/design-system` + `apps/painel`, React + Tailwind + tokens), usando os padrões já estabelecidos ali.

Os arquivos JSON de `tokens/`, ao contrário, **são para entrar no repositório como estão** (com revisão), porque seguem exatamente o formato de `packages/design-system/tokens/`.

## Como usar este pacote com o Claude Code

1. Descompacte a pasta na raiz do monorepo (`leela-projects/design_handoff_engajamento/`) e faça commit numa branch — assim o Claude Code lê os arquivos direto do repositório.
2. Abra o Claude Code na raiz do monorepo e dê um prompt como:

   > Leia `design_handoff_engajamento/README.md`. Implemente as seções 1 a 4 (tema dark-wine, camada glass, tipografia) em `packages/design-system`, rodando `pnpm generate-tokens` ao final e mantendo os testes de contraste passando. Não altere os temas brasa e wine além do que o README pede.

3. Só depois disso peça a tela:

   > Agora implemente a seção 5: a tela de Engajamento em `apps/painel`, usando os componentes existentes do DS. Os protótipos em `design_handoff_engajamento/design/*.dc.html` são referência visual — abra no navegador para conferir espaçamento, estados e movimento. Não copie o HTML.

Faça em duas conversas separadas: tokens e tela têm critérios de revisão diferentes, e o diff do pipeline de tokens é grande o bastante para poluir o contexto da tela.

## Fidelidade

**Alta (hifi).** Cores, tipografia, espaçamentos, estados e movimento estão definidos. Contrastes foram medidos (ver §Acessibilidade). Recrie fielmente usando os componentes do DS.

---

## 1. Tema `dark-wine`

### Arquivos a adicionar

```
packages/design-system/tokens/primitives.dark-wine.json   ← tokens/primitives.dark-wine.json deste pacote
packages/design-system/tokens/semantic.dark-wine.json     ← tokens/semantic.dark-wine.json deste pacote
```

### Patch no gerador — `src/scripts/generate-tokens.ts`

O gerador hoje conhece dois temas. Adicionar o terceiro segue o padrão do `wine` (base semântica + overrides):

```ts
import primitivesDarkWine from '../../tokens/primitives.dark-wine.json';
import semanticDarkWine from '../../tokens/semantic.dark-wine.json';

const semanticDarkWineMerged = mergeTokens(semanticBase as TokenRecord, semanticDarkWine as TokenRecord);

const darkWineCSS = generateCSS(
  'dark-wine',
  primitivesDarkWine as TokenRecord,
  semanticDarkWineMerged,
  component as TokenRecord,
  { aliases: shadcnAliases as TokenRecord },
);

writeFileSync(resolve(themesDir, 'dark-wine.css'), darkWineCSS, 'utf8');
const indexCSS = \`/* Leela Design System — all themes combined */\\n\\n\${brasaCSS}\\n\\n\${wineCSS}\\n\\n\${darkWineCSS}\`;

// RN
const darkWineRN = generateRNTheme(primitivesDarkWine as TokenRecord, semanticDarkWineMerged, component as TokenRecord);
// …exportar darkWineTheme em rn-themes.ts
```

### Patch no ThemeProvider — `src/theme/ThemeProvider.tsx`

```ts
export type Theme = 'brasa' | 'wine' | 'dark-wine';
```

Ajustar as três validações de valor persistido (`readStoredTheme` e `getThemeInitScript`) para aceitar `'dark-wine'`. A retrocompatibilidade `'leela' → 'wine'` continua válida. A chave `leela-theme-preference` **não muda**.

### Identidade do tema

| Papel | Valor |
|---|---|
| Fundo da página | `#080306` |
| Superfície de card (opaca) | `#12070A` |
| Ação primária | `#C8E84A` (lime da marca) sobre `#12160A` |
| Texto primário / secundário / terciário | `#F7F2F3` · `#C9B6BA` · `#9A8388` |
| Vinho (família primary) | `#E85662` · `#C42C3A` · `#7A1520` |
| Glow de página | dois radiais de vinho, **fixos no viewport** |

O vinho é a **atmosfera** (fundo, glow, bordas, thumbs); o lime é a **ação** (botões, links, destaque de dado). Nunca o inverso: vinho não vira botão, lime não vira fundo de área grande.

---

## 2. Camada glass

Arquivo: `tokens/glass.json` deste pacote. Entra como tokens de **componente** (`tokens/component.json` ou arquivo próprio incluído pelo gerador).

### Regra de arquitetura

Cada tema declara **um par**: valores opacos (default) e valores glass. O app alterna entre eles com um atributo no `<html>`; **nenhum componente lê valor cru nem sabe que glass existe**.

```css
[data-glass="on"] {
  --card-blur:        var(--glass-blur);
  --surface-raised:   var(--glass-surface-raised);
  --surface-overlay:  var(--glass-surface-overlay);
  --elevation-2:      var(--glass-elevation);
  --page-glow:        var(--glass-page-glow);
}
```

Cards continuam escrevendo `background: var(--surface-raised)` e `box-shadow: var(--elevation-2)` — o mesmo CSS de hoje. Só o `backdrop-filter: var(--card-blur)` é novo, e no modo opaco `--card-blur` é `none`.

### Valores por tema

| Token | brasa | dark-wine |
|---|---|---|
| `glass.blur` | `blur(24px) saturate(1.45)` | `blur(24px) saturate(1.45)` |
| `glass.surface-raised` | `rgba(30, 11, 16, 0.42)` | `rgba(46, 18, 26, 0.34)` |
| `glass.surface-overlay` | `rgba(255, 255, 255, 0.045)` | `rgba(255, 255, 255, 0.045)` |
| `glass.elevation` | `0 8px 28px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.075), inset 0 0 0 0.5px rgba(255,255,255,0.045)` | idem |

O `inset 0 1px 0` é o **fio de luz** na borda superior do card — é ele que faz o vidro parecer vidro. Não remover.

### Três regras não-negociáveis do glass

1. **O glow de fundo é fixo no viewport** (`background-attachment: fixed`). Se ele rolar com o conteúdo, o desfoque perde o referencial e o efeito morre.
2. **A superfície é translúcida; o texto nunca é.** Todo par superfície/texto mantém 4.5:1 medido **sobre o fundo composto**, não sobre a cor nominal.
3. **Fallback obrigatório:** onde `backdrop-filter` não existe, o card cai para a superfície opaca do tema.

```css
@supports not (backdrop-filter: blur(1px)) {
  [data-glass="on"] { --surface-raised: var(--surface-raised-opaque); }
}
```

---

## 3. Tipografia

### Famílias por tema

| Tema | Display | Texto |
|---|---|---|
| brasa | **Exo 2** | **Rubik** |
| dark-wine | Geist | Geist |
| wine | Syne | Figtree |

O brasa passa a ser **pareado**: Exo 2 nos títulos (a voz da marca) e **Rubik** no texto corrido, que tem altura-x maior e cinza óptico mais estável em corpo pequeno — é a mistura validada no estudo. Isso exige separar `font.family.display` de `font.family.ui` em `primitives.brasa.json` (hoje os dois são Exo 2) e carregar Rubik 400/500/600/700.

### Escala de peso dependente da fonte

O DS hoje tem pesos fixos (400/500/600/700/800). O estudo introduziu quatro papéis que se **adaptam aos cortes que a família realmente tem**, evitando negrito sintético:

```
--peso-display : título de bloco    (800, ou o maior corte disponível)
--peso-forte   : ênfase / números   (700)
--peso-medio   : rótulos, botões    (600, cai para 500)
--peso-suave   : corpo com ênfase   (500, cai para 400)
```

Regra de contraste tipográfico: **se o título é 700+, o corpo é 400/500** — nunca semibold contra regular no mesmo tamanho. Em famílias de corte único (display fantasia), a hierarquia vem de tamanho e cor, e o `letter-spacing` do display afrouxa de `-0.02em` para `-0.005em`.

---

## 4. Breakpoints e responsividade

Os breakpoints são os já declarados em `src/tailwind-preset.ts` — **não inventar novos**:

```
sm 640 · md 768 · lg 1024 · xl 1280 · 2xl 1536
```

**`lg` (1024px) é o ponto de colapso do shell**, igual ao AppShell/Drawer/Table de hoje:

- **≥ lg:** rail fixo de 240px, grid de duas colunas, fidelidade desktop 1440 intocada.
- **< lg:** rail sai do fluxo e vira Drawer off-canvas com scrim, acionado por hambúrguer no cabeçalho; o grid principal colapsa para uma coluna e todos os cards ocupam a largura inteira.
- **< md:** moldura de 40px → 20px; H1 2.5rem → 1.875rem; blocos de 4 KPIs viram 2×2; pares lado a lado empilham; o mapa de check-ins ganha rolagem horizontal em vez de espremer as células.

O scrim deve ser **montado apenas quando aberto** e animado por keyframe. Transição a partir de um estado nunca pintado não commita, e sobra uma camada transparente bloqueando cliques (foi o bug encontrado na verificação do protótipo).

---

## 5. Movimento

Durações e easings saem de `--motion-*` (já existem). O que o estudo acrescenta como **regra**:

| Situação | Comportamento |
|---|---|
| Entrada da tela | cards revelam em cascata (fade + 12px de subida), `stagger` ~60ms, uma vez por sessão de visualização |
| Troca de filtro | **só o gráfico afetado reanima** — filtro de período reanima ações e pilares; filtro de club reanima o funil; abas de pilar reanimam só a lista |
| Barras | crescem da esquerda (`transform-origin: left`), 750ms `cubic-bezier(.22,1,.36,1)` |
| Áreas empilhadas | crescem da base (`transform-origin: 50% 100%`, `scaleY`), 600ms |
| Calendário / overlays | fade + pop de 160ms |
| Hover de card | `translateY(-2px)` + sombra mais aberta, 250ms |

Implementação: o gatilho de reanimação é um contador por filtro que alterna entre dois nomes de keyframe idênticos (`dcBar`/`dcBar2`). Trocar o nome força o browser a rodar a animação de novo sem remontar o nó. **Um contador global reanima a tela inteira a cada clique** — foi o erro corrigido no protótipo.

Tudo dentro de `@media (prefers-reduced-motion: reduce)` desliga transform e transição, mantendo o estado final.

---

## 6. Dataviz

- **Rampa contínua** para séries do mesmo tipo (ranking, heatmap): interpola `--chart-accent` (lime) → `--chart-accent-2` (âmbar `oklch(0.75 0.13 75)`). Nunca ciclar a paleta categórica em ranking.
- **Paleta categórica** (`chart.cat-1..5`) continua valendo para séries de identidade fixa, na ordem existente.
- **Heatmap:** cor pela rampa **e** opacidade de 0,30 a 1,0 — a translucidez deixa o vidro aparecer sob as células fracas. A opacidade sobe automaticamente quando o contraste do número cai abaixo de 4,6:1.
- **Rótulo direto sempre presente** (regra de dataviz já vigente no DS).
- Tooltips de gráfico são **overlay em nível de raiz**, não filhos do card: card com `transform` no hover vira bloco de contenção e o `position: fixed` do tooltip passa a se ancorar nele, indo parar atrás dos vizinhos.

---

## 7. Ícones

Todos os ícones são **Lucide oficial** (`lucide-icons/lucide@main`), grid 24, `stroke-width: 2`, cantos e pontas arredondados. Mapa do menu: Visão Geral `layout-dashboard` · Eventos `ticket` · Clubs `heart` · CRM `user` · Marcas `megaphone` · Configurações `settings`. Datas e agenda usam `calendar`/`calendar-check` — `ticket` é exclusivo do item de menu.

---

## 8. Acessibilidade

- Contraste medido nos quatro temas para o heatmap: mínimo **4,64:1**, nenhuma célula abaixo de 4,5.
- `color-scheme` por tema (`dark` no dark-wine) — o token `color.scheme` vira declaração CSS, como já documentado em `semantic.json`.
- Alvos de toque ≥ 44px no mobile; o hambúrguer é 40×40 com área de toque efetiva maior pelo padding do cabeçalho.
- Drawer: `aria-expanded` no gatilho, scrim com `aria-hidden`, foco preso enquanto aberto (usar o Drawer do DS, que já resolve isso).

---

## 9. Ordem sugerida de implementação

1. `primitives.dark-wine.json` + `semantic.dark-wine.json` + patch do gerador → `pnpm generate-tokens` → conferir `themes/dark-wine.css`.
2. `Theme` type + ThemeProvider + init script.
3. Camada glass (`glass.json` + bloco `[data-glass="on"]` + `@supports` de fallback).
4. Pareamento tipográfico do brasa (Exo 2 + Rubik) e os quatro tokens de peso.
5. Tela de Engajamento no painel, consumindo o que está acima.

## Arquivos deste pacote

```
README.md                          este documento
tokens/primitives.dark-wine.json   primitivos do tema dark-wine
tokens/semantic.dark-wine.json     semânticos do tema dark-wine
tokens/glass.json                  camada glass, por tema
design/Engajamento estudo.dc.html  protótipo da tela de Engajamento (referência)
design/Visao Geral v3.dc.html      protótipo da Visão Geral com gráficos (referência)
```

Os protótipos abrem direto no navegador. O seletor de tema no cabeçalho troca entre brasa, wine, dark-wine e dark-sea em tempo real; os controles de fonte e glass ficam no painel de ajustes.
