---
trace: leela-redesign-v2-20260810
lane: HIFI-REC (recriação fiel do protótipo — ordem do dono 10/08 ~15:45)
employee: sf-frontend-lead (software-forge) com lente de design
repo: C:/dev/leela-wt-redesign-v2 (worktree · branch redesign-engajamento-v2)
base: 5f5489f7 (C1+C2 seladas)
data: 2026-08-10
estado: CONCLUÍDA (T1–T5 pagas · gates verdes · :4601 re-servido PID 22212 · aguarda conferência renderizada do maestro/dono)
---

# REDESIGN · HIFI-REC — handoff vivo

Contrato: `.nirvana/briefs/leela-redesign-hifi-rec-20260810-enriched.md`.
Fidelidade ao protótipo é o critério primário; L-004 não se aplica.

## Premissas registradas

- **P-REC-1 · Netlify não entrega medida.** O fetch de
  `https://leela-vis-o-geral-cd-cc500dffee.netlify.app` devolve só a casca SPA
  (title "Leela — Engajamento (estudo)"), sem HTML estrutural — é bundle React.
  Autoridade efetiva de medida: os dois `.dc.html` da rodada 2026-08-09
  (`Visao Geral v3.dc.html` extraído na íntegra, 770 linhas). Onde divergirem,
  vence o v3 (P-2 herdada).
- **P-REC-2 · brasa + glass ligado** (P-1 herdada): o alvo renderizado é o
  protótipo NO TEMA BRASA com `data-glass="on"` — valores glass do brasa já
  pinados pela C1 (rgba(30,11,16,0.42) + page-glow 3 radiais).
- **P-REC-3 · `min-width:1440px` do v3 é moldura, NÃO entra** (P-3 herdada) —
  foi o estouro horizontal que o dono viu.
- **P-REC-4 · número não volta a mentir**: fidelidade é visual; rótulo segue a
  semântica REAL do dado (ex.: "Receita confirmada", não "Receita 7 dias" sem
  janela de 7d no agregado).
- **P-REC-5 · elevation-rail do protótipo ≡ `--elevation-3`** do DS (byte a
  byte no brasa: `0 8px 32px rgba(0,0,0,0.6), 0 0 0 0.5px rgba(255,255,255,0.08)`).
  Nenhum token novo para isso; `--glow-brand` (halo do item ativo) não existia
  e nasce como token por tema com os valores do protótipo.

## Tarefas

- T1 · Shell/rail flutuante — **FEITA** (retomada HIFI-REC-RET pós-crash).
  Commits: `04946ba8` (tokens rail/chrome v3) + `6c0c9bbf` (SidebarRail) +
  `48662fe8` (resgate: RootShell monta o rail ≥ lg; AppShell ganha
  `sidebarFlutuante` + `drawerSidebar`; glow da página sobe à raiz da moldura;
  testes RootShell/Glow reescritos para a anatomia do rail). Regra da casa
  cumprida: verde pré-crash descartado — gates re-rodados do zero na árvore
  (type-check ✓ · lint 0 warnings ✓ · DS 1727/1727 ✓ · painel recorte 610/610 ✓).
- T2 · Visão Geral v3 — **FEITA**. Commits: `6fa78186` (DS: tokens de
  movimento §5 — paga o impedimento dos 750ms da C2 — + medidas v3 restantes,
  PageHeader subtitle ReactNode/0.9375rem) + `0f5a6de0` (painel: grade
  1.15fr/1fr, saudação v3, Próximo evento com régua de 4 stats + CTA único,
  Clubs, **Agenda nova com dado real**, régua de indicadores, Ocupação
  lista-régua com limiar 85%, Alertas com "Ver agora", em-breve estilizados,
  cascata de entrada §5). Suíte overview: 170/170.
- T3 · Movimento + responsividade — movimento §5 PAGO na T2 (tokens
  `--motion-bar/area/pop/stagger/reveal-shift`, cascata, pop do calendário,
  barras 750ms, tudo `motion-reduce`-safe); responsividade §4/item 6 na régua
  (1 col < 480 · 2×2 `xs` · 4 `lg`) e nas grades (colapso `lg`). Restante
  (conferência Engajamento) na T4.
- T4 · Engajamento estilizado — **FEITA**. Commits: `a826dc3a` (DS: tick do
  BarChart trunca — mata a colisão de rótulos na raiz; `--v3-band-size`) +
  `e3907b45` (painel: Painel vira cartão vidro com hover-lift §5, SecaoTitulo
  vira a faixa do estudo, SecaoHead vira eyebrow, cascata de entrada; blocos
  v3 compartilhados em `src/components/CartaoV3.tsx`; inclui os arquivos novos
  da T2 que o pathspec de diretório não capturou).
- T5 · Comparação por seção + 3 defeitos — **FEITA** (tabela abaixo).

## T5 · Comparação por seção (medida extraída × implementado)

Fonte de medida: `Visao Geral v3.dc.html` (autoridade; P-REC-1) + `Engajamento
estudo.dc.html` onde o v3 não cobre. "Bate" = mesma medida por token; a
conferência RENDERIZADA é do maestro/dono em http://localhost:4601.

| Seção | Extraído (protótipo) | Implementado | Bate? |
|---|---|---|---|
| Rail fechado | 84px, raio 26, margem 20, sticky, elevation-rail, pt 18/pb 14 | `--rail-width/radius/margin/pt/pb`, shadow-elev-3 (≡ byte a byte, P-REC-5) | ✔ |
| Rail aberto | 248px, item 46px raio 14, gap 10, px 14, ícone 21/traço 2, badge só aberto | `--rail-*` idem; badge/rodapé/slot só abertos | ✔ |
| Toggle | 32px, top 34, right −16, chevron 16 gira 180°, 650ms | idem por token (`--rail-toggle-*`, `--rail-motion`) | ✔ |
| Item ativo | bg action-primary, fg action-primary-fg, 700, glow-brand | idem; `--elevation-brand` alinhado nos 3 temas | ✔ |
| Tooltip do rail | h 34, raio 10, left 100%+14, surface-high, 150ms slide | idem (`--rail-tip-*`) | ✔ |
| Header | h1 2.5rem 800 ls −0.01em; "Olá, NOME," strong text-brand; sub 0.9375rem; pill de data com dot | PageHeader (40px display) + saudação v3 + DateBadge; **h1 segue itálico** (anatomia global — divergência nomeada) | ✔ c/ 1 div. |
| Moldura | header 32/40/0 · conteúdo 24px 40px 48px · gap 20 · `min-width:1440` | px 40 ≥ md (20 < md), pt 24/pb 48, gap `--v3-gap`; **min-width NÃO entrou** (P-REC-3) | ✔ |
| Grade | `minmax(0,1.15fr) minmax(0,1fr)` | idem, `lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]`, 1 col < lg | ✔ |
| Próximo evento | eyebrow calendário; nome 1.25rem 800; meta com calendário; 4 stats (1º brand, 1.5rem/label 0.75) entre hairlines; CTA 48px action-primary | idem por token; 4º stat = "vagas livres" (receita por evento sem fonte — impedimento) | ✔ c/ 1 imp. |
| Clubs | eyebrow coração; identidade do club; 2 stats; CTA 44px surface-high | eyebrow+stats+CTA idem; identidade fora (LCP — impedimento); rótulo "desafios ativos" (P-REC-4) | ✔ c/ 2 div. |
| Agenda | célula 34px raio 10 gap 3; nav 30px; letras 0.625rem; dots 4px; sel=action-primary; hoje=brand-tint; item 36px tile + tag; "Ver agenda completa" | idem por token (`--v3-cal-*`, `--v3-tile`, `--v3-tag-py`); só eventos (desafios sem fonte); pop 160ms na lista do dia | ✔ c/ 1 imp. |
| Régua KPI | ícone circle 46 + label 0.6875 upper 0.06em + valor 1.625rem + "↑ 12%"; divisórias | idem (`--v3-kpi-*`, `--v3-label-spacing`); rótulos REAIS e título "Indicadores" (P-REC-4); delta só com base real | ✔ c/ P-REC-4 |
| Presença por semana | área 640×180, 8 semanas, chart-accent | SEM fonte → em breve v3 (impedimento) | — |
| Formas de pagamento | donut 132, r46/stroke16, legenda swatch 9 | SEM fonte → em breve v3 (impedimento) | — |
| Ocupação 5 eventos | linha `200px· 1fr · 88px`; barra 10px pill; ≥85% âmbar; "42/50" | idem (`--v3-name-col/bar-h/count-col`), limiar 85 pinado em teste; barra cresce 750ms | ✔ |
| Alertas | itens surface-overlay p14 raio md; círculo 38; "Ver agora →"; rodapé "Ver todos" | idem (`--v3-alert-icon*`); severidade real pinta a cor; rodapé fora (sem hub — divergência) | ✔ c/ 1 div. |
| Engajamento · cards | vidro blur + elevation-2 + p24 + hover −2px | Painel = vidro + elev-2 + `--v3-card-p-lg` + hover-lift (§5) | ✔ |
| Engajamento · faixas | h2 display 1.0625rem + legenda + hairline | SecaoTitulo = idem (`--v3-band-size`) | ✔ |
| Engajamento · card head | eyebrow 0.6875 700 upper 0.08em tint-fg (+ "?") | SecaoHead = idem, "?" em Popover (portal — item 8) | ✔ |
| Movimento §5 | entrada cascata 60ms/12px; barras 750ms `cubic-bezier(.22,1,.36,1)`; áreas 600ms; pop 160ms; reduced-motion | tokens `--motion-*` novos + keyframes; TUDO motion-reduce-safe | ✔ |
| Ícones §7 | ticket/heart/user/megaphone (menu) | pagos na C1; rail consome o mesmo catálogo | ✔ |

### Os 3 defeitos da primeira rodada (obrigatórios)

1. **Estouro horizontal** — `min-width:1440px` do protótipo NÃO entrou
   (P-REC-3); página segue com contêiner único `SCROLL_Y_ONLY`; grades todas
   `minmax(0,…)`; lint `leela-scroll` 0 warnings. PAGO.
2. **Colisão de rótulos de gráfico** — causa: eixo Y de 92px do BarChart com
   nome maior vazando sobre a barra. Fix no DS (`truncarRotulo` + teste);
   identidade completa preservada em tooltip + tabela sr-only; na Visão Geral
   a Ocupação virou lista-régua com `truncate` + colunas fixas. PAGO.
3. **Coluna direita cortada** — grade do protótipo com `minmax(0,1.15fr)
   minmax(0,1fr)` (pinada em teste) + `min-w-0` nas células. PAGO
   (conferência renderizada é do maestro/dono).

### Gate do heatmap (REFACTOR)

"Nenhuma célula abaixo de 4,5:1" — o Mapa de Check-ins segue SEM fonte (card
em breve, decisão do REFACTOR item 7); não há célula pintada para medir. O
gate arma quando a fonte existir.

## Estado final (10/08 ~15:57)

- Gates (rodados do zero nesta árvore): type-check ✓ (5/5 território) · lint
  `--max-warnings 0` ✓ · generate-tokens 2× sem diff ✓ · **DS 1745/1745** ✓
  (baseline 1610 da C1 contido; contrast+glass inclusos) · **painel recorte
  638/638** ✓ · zero hex/px no diff de componentes ✓.
- Pré-existente FORA do território: `@leela/mobile` type-check quebra em
  `packages/core/src/eventos/evento.ts` (URL.protocol — commits O3-L1 de
  outras lanes). Não tocado por esta lane.
- Commits da lane (todos pushed): `04946ba8` · `6c0c9bbf` · `48662fe8` (T1) ·
  `6fa78186` · `0f5a6de0` (T2) · `a826dc3a` · `e3907b45` (T3/T4).
- Build: core → api-client → design-system → painel (`vite build --mode
  leela-hub`, 12.8s) — bundle `assets/index-CTffKP1O.js`.
- **Servidor: http://localhost:4601 · PID 22212** (novo; o 6044 foi morto),
  log em `C:\dev\leela-wt-redesign-v2\.maestro-logs\serve-4601.log`; servindo
  o build novo (200 em `/` e `/leela-icon.svg`). `:4599` (PID 25384) INTOCADO.
- NENHUM deploy. Merge/validação renderizada = fase 3 do maestro/dono.

## Impedimentos nomeados (fonte de dado)

- **Receita por evento** (stat "receita confirmada" do card Próximo evento no
  protótipo): o agregado do cliente é do portfólio (`getOverview`), não por
  evento. 4º stat virou "vagas livres" (real). Destrava com agregado
  server-side por evento.
- **Check-ins semanais** ("Presença por semana"): não existe check-in de club
  nem série semanal legível pelo organizador (mesma causa do REFACTOR item 7).
  Card "em breve" estilizado v3.
- **Formas de pagamento**: nenhum agregado por forma de pagamento chega ao
  cliente. Card "em breve" estilizado v3. Destrava com série financeira (E12+).
- **Desafios na Agenda** (segunda cor da legenda do protótipo): desafio vive
  por club; pintar pontos por dia exigiria N leituras na primeira tela.
  Agenda nasce só com eventos e a legenda diz só o que desenha.
- **Identidade do club** (linha "FC · Floripa Run Coletivo" do card Clubs):
  exigiria listar clubes no LCP da primeira tela; os agregados chegam no
  mesmo round-trip, o nome não. Stats + CTA ficam; identidade a um clique.

## Divergências nomeadas (fidelidade × verdade/função)

- **P-REC-4 aplicada nos rótulos**: "Últimos 7 dias" → "Indicadores";
  "Receita 7 dias" → "Receita confirmada"; "Check-ins 7 dias" → "Taxa de
  conversão" (KPI real); "check-ins" do card Clubs → "desafios ativos".
- **AlternadorDePainel** (papel duplo) vive no `slotAberto` do rail — função
  que o protótipo não previu e não pode sumir do desktop.
- **Rodapé "Ver todos os alertas"** do protótipo: não existe hub de alertas;
  rodapé fica de fora.
- **"Eventos ativos" e "Últimas inscrições"** saíram da Visão Geral (o
  protótipo não os tem); componentes e testes seguem no código; o job vive no
  hub /eventos. A busca de inscrições recentes saiu do LCP junto.
- **H1/PageHeader segue display itálico** (anatomia global do DS herdada do
  mockup FIDELIDADE); o v3 usa weight 800 sem itálico. Mudar é decisão de DS
  inteiro — fica para o veto do dono na conferência renderizada.
- **Mobile (< lg)**: o protótipo é desktop-only (moldura 1440); o Drawer segue
  com a Sidebar clássica (anatomia certa off-canvas), decisão registrada no
  próprio RootShell.
