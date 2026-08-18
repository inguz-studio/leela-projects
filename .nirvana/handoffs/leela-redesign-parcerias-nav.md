---
trace: leela-redesign-v2-20260810
lane: PARCERIAS-NAV (leva 4 · D-1008-R16 + R17 + R18 · T1-T3)
alvo: branch redesign-engajamento-v2 · base a0a1cfec → HEAD (em curso) · C:/dev/leela-wt-redesign-v2
data: 2026-08-11
estado: CONCLUÍDA — T1 (8a369df7) + T2 (9986a02d) + T3 (7230a75d) pagas e PUSHED; árvore LIMPA; gates finais todos verdes; :4601 re-servido PID 29476 (bundle index-uTmz4HsF.js); :4599 PID 25384 intocado; NENHUM deploy
---

# PARCERIAS-NAV · handoff vivo

Contrato: `.nirvana/briefs/leela-redesign-parcerias-nav-enriched.md`. Decisões-fonte:
D-1008-R16, R17, R18 (leva 4) em
`leela-specs/02-rodadas/2026-08-09-redesign-ds/01-decisoes-dono-1008-retomada.md`.

Disciplina: `git commit --only` pathspec por tarefa; push a cada 2 commits; pnpm com
`--config.verify-deps-before-run=false`; suítes em série; :4599 (PID 25384) INTOCADO;
NENHUM deploy. Lei de moldura vale (a lane toca o rail): suíte painel INTEIRA + suíte DS
completa + type-check + lint 0 warnings + generate-tokens 2× + grep hex/px + grep L-021 +
inventários `navegacao-spa`/`aviso-bloqueia` via `nomeAcessivel` sem afrouxar asserção.

Estado inicial verificado: árvore LIMPA em `a0a1cfec` (up to date com origin);
:4601 PID 20004 servindo `index-DsXayGgU.js`; :4599 PID 25384 intocado.

## Ordem de execução

T1 (R16 · auditoria de moldura da área de clubs — root cause na ANATOMIA) →
T2 (R17 · Marcas→Parcerias + migração assessorias/afiliações + redirects SPA + grep de
rótulos) → T3 (R18 · SubNav transparente + gate AA por estado contra fundo da página) →
gates finais + rebuild + re-serve :4601. ✔ TUDO PAGO.

## Gates finais da lane (números reais)

| Gate | Resultado |
|---|---|
| Suíte painel INTEIRA | **2565/2565** (235 arquivos) ✔ exit 0 — log `.maestro-logs/painel-suite-parcerias-nav.log` |
| Suíte DS completa | **1808/1808** (75 arquivos) ✔ — inclui os 18 do gate AA D-1008-R18 |
| type-check | painel exit 0 ✔ · DS exit 0 ✔ |
| lint `--max-warnings 0` | painel exit 0 ✔ · DS exit 0 ✔ |
| generate-tokens 2× | `git status --porcelain` VAZIO após cada rodada ✔ |
| hex/px no diff da lane (`a0a1cfec..7230a75d`) | ZERO em código; únicos hits em linhas adicionadas são PROSA (comentários/LLM.txt citando medidas de token pré-existentes: 48px/96px/2px/40px/11px) ✔ |
| grep L-021 no diff do painel | ZERO controle cru adicionado · ZERO `bg-[var(--surface-raised)]` cru novo ✔ |
| Inventários de moldura | navegacao-spa +3 superfícies (menus de área clubes/Parcerias + terciária Afiliações, contagem exata + aria-current + SPA vivo); aviso-bloqueia lista nominal `A:Parcerias` via `nomeAcessivel` — NENHUMA asserção afrouxada ✔ |

## Rebuild + re-serve (fase final)

- DS tocado (T3) → tsup re-buildado ANTES das suítes (o painel consome dist — sem
  rebuild os testes veriam o rail/SubNav antigos; foi exatamente o vermelho transitório
  pego e pago durante o T2).
- `vite build --mode leela-hub` OK (16,9s) — bundle novo
  `dist/assets/index-uTmz4HsF.js` (sha256 `83dde453d4e93d6c…`).
- PID 20004 (bundle pré-lane `index-DsXayGgU.js`) MORTO; `.maestro-logs/serve-4601.js`
  re-servindo a MESMA porta — **:4601 PID novo = 29476**, `GET /` 200, SPA fallback de
  `/parcerias` 200, index referencia `index-uTmz4HsF.js`. **:4599 PID 25384 INTOCADO.**
  NENHUM deploy.

## Commits da lane (todos pushed, base a0a1cfec → 7230a75d)

- `8a369df7` T1 (R16 · moldura da área de clubs — layout route dono do menu; 15 arquivos, +398/−80)
- `9986a02d` T2 (R17 · área Parcerias + migração + redirects + rótulos; 50 arquivos, +819/−207)
- `7230a75d` T3 (R18 · SubNav transparente + gate AA por estado; 4 arquivos, +93/−18)

## Fila / vetáveis / achados

- **Vetável (T2):** ícone do rail segue **Megaphone** — a decisão só renomeou; se o dono
  quiser ícone de parceria, **Handshake** (lucide) é a candidata natural (1 linha no DS).
- **Vetável (T2):** a frente Afiliações usa sub-nav TERCIÁRIA (padrão RN-229, o mesmo de
  eventos) para os dois lados RN-318/319 — Influenciadores (`/parcerias/afiliacoes`) ·
  Minhas afiliações (`/parcerias/afiliacoes/minhas`). Alternativa rejeitada: 4ª aba no
  menu da área (contraria as 3 abas registradas na decisão).
- **Vetável (T1):** posição do menu de área = TOPO da moldura, acima do PageHeader de
  cada aba (único lugar que um layout route pode possuir; padrão EventosHubLayout). Antes
  o menu ficava abaixo do header em 4 abas e acima em 1 (a inconsistência era parte do
  defeito).
- **Achado (nomenclatura):** dentro do painel de um club existe a aba "Parcerias"
  (`/clubes/:slug/parcerias` — marcas ligadas ao club). Agora coexiste com a ÁREA
  "Parcerias" do rail. Não renomeada (fora do contrato); se confundir o dono, é decisão
  nova.
- **Achado (T2):** MinhasAfiliacoesPage ainda tem `<article>` cru com
  `bg-[var(--surface-raised)]` (cartão de afiliação) — pré-existente, já no inventário
  ~40 do roadmap `leela-roadmap-componentes-20260810` (achado da AJUSTES-DONO T2).
- **Conferência renderizada (dono/maestro) no :4601:** rail com "Parcerias" no slot de
  Marcas; área com 3 abas e indicador deslizando; assessorias com PageHeader canônico e
  menu estável entre abas; detalhe de assessoria COM menu; clubs com 2 abas (Clubes ·
  Engajamento); barra de abas SEM fundo (transparente sobre o glow); links antigos
  redirecionando.

## T1 · R16 — auditoria das rotas de clubs — PAGA (commit `8a369df7`)

**Conserto aplicado:** `ClubesAreaLayout` (layout route, padrão EventosHubLayout) é o
ÚNICO dono do menu; `clubesAreaAtiva(pathname)` puro deriva a aba; páginas perderam o
menu colado e o prop `areaNav` (HubRoute/HubClubes, EngajamentoPage/View,
Influenciadores, MinhasAfiliacoes, Assessorias); AssessoriasPage realinhada (PageHeader
canônico + subtítulo + CTA no slot; conteúdo `px-6` full-width — a coluna `max-w-5xl`
com menu `px-0` morreu); detalhe `assessorias/:parceriaId` ENTROU na moldura (era o
beco); `novo` e `assessorias/nova` fora POR DESIGN (precedente /eventos/novo), afirmado
em teste. **Provas:** `moldura-da-area.test.tsx` (16 testes rota a rota: 1 menu exato +
ativa certa + fora-da-moldura sem menu) + `AssessoriasPage.test.tsx` novo (4: zero menu
próprio + header canônico + tabela + vazio honesto) + `clubesAreaAtiva` (7). Clubes
**411/411** (41 arquivos) ✔ · type-check painel exit 0 ✔ · lint painel exit 0 ✔.
15 arquivos, +398/−80.

### Inventário da auditoria (código lido, não memória)

**Root cause confirmado: a área de clubs NÃO tem layout route.** O R9 (AJUSTES-DONO T5)
colou o `ClubesAreaNav` página a página — exatamente a anatomia que o brief manda matar.
Consequências medidas no código:

| Rota | Menu? | Ativa | Layout |
|---|---|---|---|
| `/clubes` (hub) | ✔ colado (HubRoute → prop `areaNav`) | ✔ | PageHeader → menu (ordem A) |
| `/clubes/engajamento` | ✔ colado (prop `areaNav` na View) | ✔ | PageHeader → menu (ordem A) |
| `/clubes/minhas-afiliacoes` | ✔ colado | ✔ | PageHeader → menu (ordem A) |
| `/clubes/influenciadores` | ✔ colado | ✔ | PageHeader → menu (ordem A) |
| `/clubes/assessorias` | ✔ colado | ✔ | ✗ **QUEBRADO**: menu DENTRO de coluna `mx-auto max-w-5xl` com `px-0`, sem PageHeader canônico (header custom) — o menu salta de posição/largura vs TODAS as irmãs (ordem B: menu → header estreito) |
| `/clubes/assessorias/:parceriaId` (linha da tabela leva aqui) | ✗ **SEM MENU** | — | coluna `max-w-2xl` própria, só botão "Voltar" |
| `/clubes/assessorias/nova` (CTA "Cadastrar assessoria") | ✗ **SEM MENU** | — | coluna `max-w-2xl` própria, retorno próprio (Cancelar) |
| `/clubes/novo` (CTA do hub) | ✗ sem menu | — | fluxo de criação em tela cheia |
| `/clubes/:slug/*` (painel do club) | shell PRÓPRIO (ClubeShell: breadcrumb "Clubes › nome" D-1008-R10 + abas do clube) | — | íntegro |

**Vereditos de moldura (na anatomia da casa — precedente `EventosHubLayout`, que declara
`/eventos/novo` fora da moldura por ser criação em tela cheia):**
- DENTRO da moldura da área: hub, engajamento, minhas-afiliacoes, influenciadores,
  assessorias (lista) e assessorias/:parceriaId (detalhe SEM shell próprio — era beco).
- FORA por design (registrado): `novo` e `assessorias/nova` (criação em tela cheia com
  retorno próprio — precedente eventos/novo) e `:slug/*` (shell próprio do club).

**Conserto (anatomia):** `ClubesAreaLayout` (layout route, padrão EventosHubLayout:
`pt-5` + SubNav + Outlet) passa a ser o ÚNICO dono do menu; aba ativa derivada do
pathname (`clubesAreaAtiva` puro); páginas perdem o menu colado (props `areaNav` morrem);
AssessoriasPage se realinha ao padrão das irmãs (PageHeader canônico + conteúdo `px-6`
full-width — a coluna 5xl era a quebra que o dono viu). Prova por teste de moldura da
área: rota → exatamente UM landmark "Seções de clubes" + `aria-current` certo; rotas fora
da moldura afirmadas SEM o menu (veredito virou asserção).

## T2 · R17 — Marcas → Parcerias — PAGA (commit `9986a02d`, 50 arquivos, +819/−207, PUSHED)

**Mapa de rotas antigas → novas (todas com redirect SPA `replace`, query/hash preservados):**

| Antiga | Nova | Onde vive o redirect |
|---|---|---|
| `/marcas` (e `/marcas/*`) | `/parcerias` | tabela `REDIRECTS_LEGADOS` |
| `/clubes/assessorias` | `/parcerias/assessorias` | ClubesRoutes (antes do `:slug`) |
| `/clubes/assessorias/nova` | `/parcerias/assessorias/nova` | ClubesRoutes |
| `/clubes/assessorias/:parceriaId` | `/parcerias/assessorias/:parceriaId` | ClubesRoutes (param) |
| `/clubes/influenciadores` | `/parcerias/afiliacoes` | ClubesRoutes |
| `/clubes/minhas-afiliacoes` | `/parcerias/afiliacoes/minhas` | ClubesRoutes |

**O que entrou:** rail "Marcas"→"Parcerias" (DS `Sidebar.tsx`, id `parcerias`, MESMO
slot, Megaphone fica — Handshake anotado como vetável); `ParceriasRoutes` +
`ParceriasAreaLayout` (moldura R16) + menu 3 abas (Marcas raiz · Assessorias parceiras ·
Afiliações); `AfiliacoesLayout` com terciária divider RN-229 (Influenciadores · Minhas
afiliações — os DOIS lados RN-318/319 a um clique, nenhum vira beco); git mv das três
árvores (histórico preservado, renames 93-100%); ClubesAreaNav = 2 abas (comunidade);
gate RN-234 estendido (positivos/negativos/anti-laço/query-hash da migração);
navegacao-spa +3 superfícies (menus de área + terciária); aviso-bloqueia `A:Parcerias`
(lista nominal via nomeAcessivel, asserção intacta); vitrine `/parcerias` "Parcerias";
sidebar do shell (`/marcas` legado = nenhum item aceso, regra do `/financeiro`);
fronteira-auth cobre `/parcerias` + `/marcas` legado.

**Rótulos:** "Marcas"-área trocada em rail (DS), Sidebar.test, LLM.txt, docs.mdx,
aviso-bloqueia, vitrine (areasDaVitrine + 2 testes), RootShell.test (comentário),
superficie.test. "marca"-conceito INTACTO: h1 "Marcas" da aba (patrocinadores
cadastrados), caption da tabela, KPI "Marcas ativadas" (kits), `listarMarcas` e afins.

**Gates parciais:** clubes+parcerias+_system **514/514** (50 arquivos) ✔ ·
shell+onboarding+routes **329/329** (18) ✔ · DS Sidebar **58/58** ✔ · type-check painel
0 ✔ · lint painel 0 ✔ · **tsup DS re-buildado** (o painel consome dist — sem rebuild os
testes viam o rail antigo).

### Plano original (registro)

- DS `Sidebar.tsx`: item do rail `marcas` → rótulo "Parcerias", MESMO slot.
- Área nova `routes/parcerias/`: `ParceriasRoutes` + `ParceriasAreaLayout` (mesma
  moldura) + nav de 3 abas: **Marcas (`/parcerias`) · Assessorias parceiras
  (`/parcerias/assessorias`) · Afiliações (`/parcerias/afiliacoes`)**.
- Migram (git mv): `routes/marcas` → `parcerias/marcas`; `clubes/assessorias` →
  `parcerias/assessorias`; `clubes/influenciadores` → `parcerias/afiliacoes`
  (InfluenciadoresPage = `/parcerias/afiliacoes`; MinhasAfiliacoesPage =
  `/parcerias/afiliacoes/minhas`, sub-nav terciária divider padrão RN-229 entre os dois
  lados — 3 abas preservadas no menu da área, nenhum dos dois lados vira beco).
- Redirects SPA (RedirectLegado, preserva query/hash): `/marcas/*`→`/parcerias` (tabela
  REDIRECTS_LEGADOS); dentro de ClubesRoutes ANTES do coringa `:slug`:
  `assessorias`→`/parcerias/assessorias` · `assessorias/nova`→`/parcerias/assessorias/nova`
  · `assessorias/:parceriaId`→param-redirect · `influenciadores`→`/parcerias/afiliacoes` ·
  `minhas-afiliacoes`→`/parcerias/afiliacoes/minhas`.
- ClubesAreaNav reconciliado: 2 abas (Clubes · Engajamento) — comunidade fica.
- Rótulos "Marcas"-área → "Parcerias": rail (DS), `aviso-bloqueia` (`A:Marcas` na lista
  nominal + regex), `Sidebar.test`, vitrine (`areasDaVitrine` chave `/marcas` + título).
  "marca"-conceito NÃO muda (MarcasPage h1/caption, KPI "Marcas ativadas" de kits,
  listarMarcas etc.).

## T3 · R18 — SubNav transparente — PAGA (commit `7230a75d`, 4 arquivos, +93/−18)

**Root provado:** o container do SubNav canônico pintava `bg-[var(--surface-base)]`
OPACO — igual à página flat, mas por cima do `--page-glow` do vidro virava a faixa
sólida que o dono viu. (Nota de registro: a decisão cita "surface-overlay"; o token
real do fundo era `surface-base` — o destino é o mesmo, transparente.)

**Fix no canônico:** `bg-transparent` explícito (grep-ável; teste pina que o opaco não
volta); pill do contador MANTÉM `surface-raised`; `divider` opcional das terciárias
fica; Tabs §2.7 (segmentados em card) e menus flutuantes (R4) INTOCADOS. Docstring +
LLM.txt re-sincronizados. Todas as áreas herdam (clubs, Parcerias, eventos, CRM,
clube, plataforma — mesmo componente).

**Gate AA por estado (describe D-1008-R18 na suíte de contraste, 6 casos × 3 temas —
18 testes; números REAIS medidos contra `surface-base`, o fundo da página):**

| Estado | brasa | wine | dark-wine | Régua |
|---|---|---|---|---|
| ativo/hover (`text-primary`) | 18.58:1 | 15.16:1 | 18.47:1 | ≥4.5 |
| inativo (`text-secondary`) | 10.64:1 | 7.52:1 | 10.61:1 | ≥4.5 |
| focus-visible (`border-focus`) | 6.65:1 | 10.33:1 | 14.72:1 | ≥3.0 |
| indicador (`border-brand`, sem trilho) | 5.69:1 | 10.33:1 | 14.72:1 | ≥3.0 |
| pill contador (`text-secondary`×raised composto) | ✔ | ✔ | ✔ | ≥4.5 |

Suíte DS completa pós-T3: **1808/1808** (75 arquivos) ✔ · DS type-check 0 ✔ · DS lint 0 ✔.

### Plano original (registro)

Root do fundo que o dono vê: o container do SubNav canônico pinta
`bg-[var(--surface-base)]` OPACO por cima do `--page-glow` do vidro (o "fundo" da
barra). Fix no canônico: container transparente (itens + indicador direto sobre a
página); pill do CONTADOR mantém `surface-raised` (anatomia própria); segmentados em
card (Tabs §2.7) e menus flutuantes (R4) intocados. Gate: describe novo na suíte de
contraste do DS — por tema (3): ativo/hover `text-primary`×`surface-base` ≥4.5 ·
inativo `text-secondary`×`surface-base` ≥4.5 · focus-visible
`border-focus`×`surface-base` ≥3.0 · indicador `border-brand`×`surface-base` ≥3.0.
