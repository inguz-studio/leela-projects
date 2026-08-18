---
trace: leela-redesign-v2-20260810
lane: HIFI-REC-REV (review antagonista · contexto fresco)
alvo: commits 04946ba8..e64b8c47 (base 5f5489f7) · branch redesign-engajamento-v2 · C:/dev/leela-wt-redesign-v2
data: 2026-08-10
veredito: REPROVADA — 1 bloqueador (suíte painel INTEIRA vermelha em HEAD: 5 testes / 2 arquivos, causados pela troca da moldura), fix curto e mecânico; a fidelidade, os tokens, o flip e a honestidade de dado PASSARAM em tudo o que re-provei
---

# REV antagonista · HIFI-REC + FLIP-ACCENT

Contrato: `.nirvana/briefs/leela-redesign-hifi-rec-REV-enriched.md`. Não vi a conversa
da construção; re-provei do zero. Disciplina cumprida: read-only no código (zero
commit meu, zero arquivo temporário deixado), :4601 e :4599 intocados, nenhum deploy,
suítes em série, pnpm sempre com `--config.verify-deps-before-run=false`.

## Veredito

**REPROVADA** — por UM bloqueador que o gate da lane não podia deixar passar: a lane
mudou a MOLDURA de todas as rotas (RootShell/AppShell → SidebarRail) e validou só o
"recorte" (638/638, número que confirmo). A suíte do painel INTEIRA, que é o que a
branch entrega para a próxima lane, está vermelha em HEAD: **2439/2444 (5 falhas em
2 arquivos)**, reproduzido 2× com o mesmo conjunto (determinístico, não flake). As 5
falhas são causadas pela anatomia nova do rail sob testes de moldura pré-existentes
que a lane não rodou. O produto em si se comporta certo nesses fluxos (inert cai,
foco volta ao abridor alcançável); o que quebrou é o INVENTÁRIO que os testes fazem
da moldura — mas branch com suíte vermelha não sela. Fix é de teste, pequeno, listado
abaixo; nada do restante precisa ser retocado.

Tudo o mais tentei derrubar e não caiu — detalhe por vetor abaixo.

## Bloqueador (evidência)

**B1 · Suíte painel inteira vermelha em HEAD — regressão de gate causada pela lane.**

```
cd apps/painel && pnpm test         # rodada completa, 2×
Test Files  2 failed | 227 passed (229)
Tests       5 failed | 2439 passed (2444)     [406s e 447s — mesmas 5 falhas]
```

Falhas e mecanismo (provado por execução isolada do arquivo):

1. `src/routes/__tests__/navegacao-spa.test.tsx` · 1 falha
   "menu lateral do produtor: todo destino é âncora — só sobram os botões declarados".
   A tabela declara, dentro do landmark `Navegação principal`, apenas o botão
   `'MCMarina CasteloVer perfil'` (rodapé da Sidebar clássica). O rail introduziu
   botões novos não declarados: o toggle (`Abrir menu`, textContent vazio) e o rodapé
   novo do rail (fechado, só `MC`). `git show 5f5489f7` confirma que a lista declarada
   não mudou desde a base; o arquivo não foi tocado pela lane (último commit 0a2708f9,
   27/07 — ancestral da base).

2. `src/routes/onboarding/__tests__/aviso-bloqueia.test.tsx` · 4 falhas
   - 3× sondas DEF-R1: `expected [ 'BUTTON:', …(8) ] to deeply equal [ 'A:Visão
     Geral', 'A:Eventos', …(6) ]` — o inventário de alcançáveis da moldura mudou (o
     toggle do rail virou o 1º tabbável; 6 âncoras + 2 botões).
   - 1× retorno de foco: `expected [ 'A:ClubsClubs' ] to include 'A:Clubs'` — o item
     FECHADO do rail carrega o rótulo DUAS vezes no textContent (span `sr-only` +
     tooltip `aria-hidden`), e o espião do teste monta a identidade por textContent.
     Só o markup do rail produz `ClubsClubs`: na base, RootShell montava a Sidebar
     clássica (rótulo único por item — conferido em `git show 5f5489f7:.../Sidebar.tsx`
     e `.../RootShell.tsx`). Arquivo não tocado pela lane (último commit d9394f51,
     09/08 — ancestral da base).

   Importante: nas 4, o comportamento do PRODUTO está certo (o foco VOLTA à âncora,
   fora da subárvore inerte; `sobInerte` vazio) — a quebra é o retrato da moldura que
   o teste tira por textContent. Não é mentira ao usuário; é suíte vermelha na branch.

## fix_list

- **F1 (bloqueador · teste, não produto)** — re-inventariar as 2 suítes de moldura
  para a anatomia do rail, SEM afrouxar o que elas protegem:
  - `navegacao-spa.test.tsx`: na entrada `menu lateral do produtor`, declarar os
    botões do rail em `botoesQueNaoSaoDestino` (toggle com textContent `''` e rodapé
    `MC`) — ou, melhor, trocar a chave do inventário de textContent para accessible
    name (o tooltip `aria-hidden` deixa de contaminar).
  - `aviso-bloqueia.test.tsx`: identidade das sondas e do espião de `focus()` por
    accessible name/aria-label em vez de textContent, e inventário esperado da
    moldura atualizado (toggle + 6 âncoras + rodapé). As asserções de inert/foco
    permanecem intactas.
- **F2 (bloqueador · processo)** — re-rodar a suíte painel INTEIRA (não recorte) e
  registrar o número no handoff da lane. Regra a levar adiante: mudança de moldura
  (RootShell/AppShell/DS shell) obriga suíte completa do painel no gate.
- **F3 (ressalva · cânone L-021)** — `CtaV3` em `apps/painel/src/components/CartaoV3.tsx`
  re-implementa botão com `<button>` cru (primário 48/neutro 44, action-primary,
  focus ring) — o DS tem `Button` (primary/secondary · sm/md/lg). Migrar para o
  Button do DS com a altura por token, ou registrar a dívida com a razão.
- **F4 (ressalva · a11y)** — tooltip do rail fechado só aparece em hover
  (`group-hover/item:`); teclado não o vê (o protótipo também é hover-only e o nome
  acessível está no `sr-only`, então não bloqueia). Uma classe resolve:
  `group-focus-visible/item:opacity-100` + transform.
- **F5 (ressalva · dívida de navegação)** — o rodapé do rail navega para `/conta`
  por BUTTON (`onFooterClick` → `navigate`), a mesma exceção do SidebarFooter
  clássico — mas a regra da tabela navegacao-spa existe contra destino-em-botão
  (sem ctrl+clique/copiar endereço). Ao declarar a exceção (F1), registrar a dívida
  de virar âncora + onClick SPA.
- **F6 (ressalva · a11y menor)** — grade do calendário da Agenda usa `role="grid"`
  com botões diretos (sem `row`/`gridcell`, sem navegação por setas) — igual ao
  protótipo, células são buttons tabbáveis com `aria-label` completo. ARIA técnica
  a alinhar quando a Agenda crescer.

## Evidência por vetor

### 1 · Medidas pinadas × protótipo (extraí eu mesma dos .dc.html)

Extraí 40+ medidas de `Visao Geral v3.dc.html` (linhas 195-345, 478-770) e
`Engajamento estudo.dc.html` (banda de seção, motion §5) e confrontei com
`rail-v3-tokens.test.ts` + `brasa.css` gerado. **Todas batem**, amostra:

| Medida (protótipo, extraída por mim) | Token pinado | Bate |
|---|---|---|
| rail fechado 84px / aberto 248px (l.722) | `--rail-width` 84px / `--rail-width-open` 248px | ✔ |
| raio 26, margem 20, pt 18/pb 14, sticky, transição width 650ms cubic-bezier(0.2,0.8,0.2,1) (l.720-725) | `--rail-radius` 26px, `--rail-margin` {spacing.5}, `--rail-pt/pb`, `--rail-motion` 650ms + easing default | ✔ |
| item 46px raio 14 gap 14, px 12 fechado/13 aberto, fonte 0.875rem (l.509-513) | `--rail-item-h/radius/gap/px/px-open`, `--rail-item-size`=font-size-base=0.875rem | ✔ |
| ícone 21 em caixa 22 traço 2; toggle 32 top 34 chevron 16 traço 2.25 (l.196-207) | `--rail-icon-*`, `--rail-toggle-*` | ✔ |
| tooltip h34 raio 10 left 100%+14 0.8125rem (l.208) | `--rail-tip-h/radius/gap`, `--rail-tip-size`=sm-plus | ✔ |
| marca 42/42 raio 14, wordmark h34; avatar 44, dot 10; badge px7 (l.200-240) | `--rail-brand-*`, `--rail-avatar/dot`, `--rail-badge-px` | ✔ |
| grade `minmax(0,1.15fr) minmax(0,1fr)` gap 20, moldura 32/40/0 + 24/40/48 (l.246, 268) | classe pinada em OverviewContent.test + `--v3-gap` | ✔ |
| célula do calendário 34px raio 10, gap pontos 3, dots 4, nav 30, letras 0.625rem/0.06em (l.315-330, 552-580) | `--v3-cal-cell-h/radius/gap`, `--v3-dot-sm`, `--v3-cal-nav`, `--v3-label-spacing` | ✔ |
| CTA 48px primário / 44px neutro (l.281, 298) | `--v3-cta-h/-sm` | ✔ |
| KPI: círculo 46, valor 1.625rem, ícone svg 20 (l.350-380) | `--v3-kpi-icon/size`, `--v3-icon-md` | ✔ |
| chart 640×180 h180; donut 132 r46 stroke16 swatch 9/3; barra 10 pill; colunas 200px/88px; limiar ≥85 âmbar (l.388-450, 692) | `--v3-chart-h/donut-size/swatch*/bar-h/name-col/count-col` + `LIMIAR_ATENCAO_PCT=85` exportado e testado | ✔ |
| banda de seção 1.0625rem display + legenda + hairline (estudo l.460-465) | `--v3-band-size` + SecaoTitulo (gap/mt 14, -mb 4) | ✔ |
| motion §5: barras .75s cubic-bezier(.22,1,.36,1), áreas .6s, pop .16s, rise 12px (estudo l.38, 1180-1192) | `--motion-bar-duration` 750ms + easing, `--motion-area/pop-duration`, `--motion-reveal-shift` 12px | ✔ |
| elevation-rail brasa `0 8px 32px rgba(0,0,0,0.6), 0 0 0 0.5px rgba(255,255,255,0.08)` (l.130) | ≡ `--elevation-3` byte a byte (P-REC-5 conferida em brasa.css l.129) | ✔ |
| glow-brand 3 temas (l.60, 131, 166) | `--elevation-brand` byte a byte nos 3 (rail-v3-tokens.test) | ✔ |

Divergência NÃO declarada: **nenhuma encontrada**. As divergências que achei (h1
itálico, rótulos P-REC-4, 4º stat vagas livres, alternador no slot, sem rodapé de
alertas, agenda só eventos, mobile Drawer) estão TODAS nomeadas no handoff da lane.
`min-width:1440` não entrou (grep vazio em componente — P-REC-3 cumprida).

### 2 · Regressão C1/C2 nos testes

`git diff 5f5489f7..HEAD -- '**/__tests__/**'`: 17 arquivos, +881/−209. Zero
`.skip/.todo/.only` na árvore (grep). Os expects removidos (60) são todos de
anatomias que o protótipo v3 substituiu (quick-actions do Countdown, chips de trend,
layout 3 colunas, "Eventos ativos"/"Últimas inscrições" — saída declarada no handoff);
os contratos de HONESTIDADE renasceram na anatomia nova e re-executaram verdes:
erro ≠ empty (#03) em Countdown/Agenda/Alertas, "—" para 0-falso (#15), "Hoje" nunca
"0", trend null → sem delta, staff → nota de escopo (#16). Testes do Engajamento
(C2) **não tocados** pela lane (diff só em EngajamentoView.tsx, styling/Cascata) e
verdes na suíte completa: média ponderada + "Sem registro (30 dias+)" seguem pinados
(`EngajamentoView.test.tsx:160` — teste anti-regressão dedicado — e
`engajamento.test.ts:101`). `tokens.test.ts` mudou 6 linhas = o pin do FLIP (abaixo),
sem afrouxar nada (o `not.toContain('var(--accent-400)')` continua).

### 3 · A11y do rail

Lido na íntegra (`SidebarRail.tsx`, 407 l.) + 158 l. de teste: nav landmark nomeado;
toggle `aria-expanded` + nome que troca (Abrir/Recolher) + focus-visible ring; item
ativo `aria-current="page"`; fechado, rótulo segue no nome acessível via `sr-only`
(teste `getByRole('link', { name: 'Visão Geral' })` no estado fechado); tooltip
`aria-hidden` decorativo; Enter nativo (âncoras/botões reais); `motion-reduce` em
TODAS as transições; itens roláveis com `SCROLL_Y_ONLY` (gate leela-scroll:
`leela-scroll/no-scroll-de-um-eixo` = **error** no eslint.config.mjs raiz, lint
verde abaixo). Drawer < lg intacto: AppShell só perde `overflow-hidden` no wrapper
quando `sidebarFlutuante` (default false — anatomia clássica preservada) e o Drawer
recebe a Sidebar clássica via `drawerSidebar`. Ressalvas F4/F6 acima.

### 4 · Os 3 defeitos do dono (por execução)

1. **Estouro horizontal**: `min-width:1440` ausente do código (grep). Contêiner
   único `SCROLL_Y_ONLY` com `relative` (RootShell) + regra lint em error re-rodada
   por mim (`eslint --max-warnings 0` → exit 0 nos 2 pacotes). Grades todas
   `minmax(0,…)` no diff. ScrollDaPagina.test (6 testes, inclui "FECHA a horizontal"
   e "único rolador") verde na suíte completa.
2. **Colisão de rótulos**: `truncarRotulo` + `tickFormatter` no BarChart do DS;
   executei via suíte DS os 3 testes novos — rótulo real longo
   `'Corrida noturna — Ibirapuera'` → `'Corrida notu…'` (≤ TICK_MAX_CHARS 13, sem
   espaço órfão) e identidade completa preservada na tabela sr-only. Na Visão Geral
   a Ocupação usa `truncate` + colunas fixas 200px/1fr/88px por token.
3. **Coluna direita cortada**: classe
   `lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]` pinada em
   `OverviewContent.test.tsx` ("minmax fecha a coluna direita") + `min-w-0` nas
   células (Cascata) — executado verde. Conferência renderizada já era do maestro
   (:4601, rail fechado/aberto — registrada no contrato).

### 5 · Empty/em-breve honestos

`EmBreveV3`: EmptyState do DS com NOME da métrica + CAUSA em uma frase — nenhuma
forma de gráfico, nenhum número. Presença por semana e Formas de pagamento = em
breve com impedimento nomeado (bate com o handoff). Agenda: legenda desenha SÓ
"Eventos" (desafios sem fonte — comentário e código conferidos); dia vazio = "Nada
agendado" e erro ≠ vazio (#03 testado). Delta "↑ 12%": `deltaTexto` só renderiza com
`trendPct` numérico vindo do contrato real (`OverviewKPIs`); null → "—" (teste
`trend null → "—" simples` re-executado verde). Card Clubs sem identidade fabricada
(stats reais + rótulo "desafios ativos", P-REC-4).

### 6 · Zero hex/px (grep meu no diff)

```
git diff 5f5489f7..HEAD -- componentes (DS + painel, sem __tests__)
  hex #RGB/#RRGGBB: 0 ocorrências
  Npx fora de comentário: 0 (todas as 35 menções de px são comentários JSX)
```
`fontSize: 13` do tick do BarChart é pré-existente (linha de contexto, não tocada).

### 7 · Cânone de componentes (L-021)

`SidebarRail` vive em `packages/design-system` + exportado no index + 158 l. de
teste — ✔. Nenhum `<select>`/input date nativo entrou (grep no diff). Blocos v3
(`CartaoV3/EyebrowV3/StatV3/Cascata/EmBreveV3/SecaoHead/SecaoTitulo`) vivem no app
com justificativa escrita de composição-de-tela e só tokens — aceito, EXCETO
`CtaV3`, que duplica o `Button` do DS (F3). `AgendaCard` monta grade própria — o
`Calendar` do DS é date-picker (react-day-picker), anatomia diferente da agenda com
pontos de evento; composição legítima (F6 registra a ARIA).

### 8 · Suítes completas (rodadas por mim, do zero, em série)

```
packages/design-system:  pnpm test → 73 files, 1745/1745 ✔ (47.7s)  [claim 1745 CONFERE]
apps/painel (INTEIRA):   pnpm test → 2439/2444 · 5 falhas ✘ (2 rodadas: 447s e 406s, mesmas falhas)
                         [claim era do RECORTE 638/638 — recorte confere, mas o gate
                          da moldura tinha que ser a suíte inteira → B1]
type-check:              DS exit 0 ✔ · painel exit 0 ✔
lint --max-warnings 0:   DS exit 0 ✔ · painel exit 0 ✔ (inclui leela-scroll em error)
generate-tokens 2×:      árvore limpa após cada rodada (git status vazio) ✔
```

### 9 · FLIP-ACCENT (decisão do dono: chart.accent brasa = {primary.500} #FF450C)

`git show e64b8c47 --stat`: **5 arquivos, todos de token/gerado/teste-de-token** —
`semantic.brasa.json` ({primary.400}→{primary.500}, primitivo pré-existente, zero hex
novo), `brasa.css`, `index.css`, `rn-themes.ts` (gerados) e `tokens.test.ts` (2 pins:
`#FF450C` na rampa e `--chart-accent: var(--primary-500)`; o guard `not.toContain
(var(--accent-400))` permanece). `wine.css`/`dark-wine.css` NÃO aparecem no commit e
o gerador re-rodado 2× por mim deixou a árvore limpa — logo os bytes commitados de
wine/dark-wine são exatamente o que o gerador emite: **byte-idênticos, provado**.
`chart.accent-2` intacto (`#C8E84A` pinado). Nenhum componente pina o valor (grep
hex zero no diff; consumo só via `var(--chart-accent)`).

## Números finais que EU rodei

- DS: **1745/1745** (73 arquivos) ✔
- Painel inteira: **2439/2444** ✘ (5 falhas · 2 arquivos · reproduzido 2×)
- type-check DS+painel: **0 erros** ✔ · lint DS+painel: **0 warnings** ✔
- generate-tokens: **determinístico 2×**, wine/dark-wine byte-idênticos ✔
- Medidas protótipo×token conferidas por mim: **40+, zero divergência não declarada** ✔

Reprovação estreita: pagando F1+F2 (2 arquivos de teste + rodada completa), esta
entrega está pronta para selar — o trabalho de fidelidade é o melhor que já passou
por esta trilha.
