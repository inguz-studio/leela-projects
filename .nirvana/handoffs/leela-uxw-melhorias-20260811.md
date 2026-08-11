# Handoff — UXW-MELHORIAS · estado CONCLUÍDA-PELO-CLOSER

- **trace_id:** `leela-redesign-v2-20260810` · lane UXW-MELHORIAS, fechada pela lane **UXW-CLOSER**
- **worktree:** `C:\dev\leela-wt-uxw` · branch `uxw-melhorias` · base `3f3f0ec8` (= `origin/main` no início)
- **fonte do escopo:** `.nirvana/handoffs/leela-uxw-review.md` (40 achados) conferido contra
  `.nirvana/handoffs/leela-uxw-fix.md` (20 bloqueadores + 6 melhorias já pagos)
- **status:** **PAGA e MERGEADA.** Merge `--no-ff` `049254ad` em `main`, pushed. Worktree removido.
- **⚠️ contexto do fechamento:** a lane original estalou duas vezes esperando suíte em background e
  foi encerrada pelo maestro. O closer entrou em contexto fresco e fechou o protocolo pelo disco.

---

## 1. Inventário herdado (o que estava no disco quando o closer entrou)

| Estado | O que era |
|---|---|
| **Commitado** | **nada.** `git log origin/main..HEAD` vazio; a branch estava exatamente em `3f3f0ec8`. |
| **Órfão (na árvore, sem commit)** | 24 arquivos modificados: 15 das melhorias, F6 (AgendaCard) e as 5 trocas de `be-hero.com.br`, mais `pnpm-workspace.yaml`. |
| **Handoff** | **inexistente.** O arquivo que o brief mandava criar nunca foi escrito — não havia registro de progresso por tarefa. |
| **Faltante do escopo** | ver seção 2. |

### O verde alegado era falso

A regra da casa se confirmou na primeira medição: **`apps/painel/src/routes/__tests__/navegacao-spa.test.tsx:292`
fixava `atual: 'Visão Geral'`** para a superfície "menu lateral do produtor". A lane já tinha trocado o
label no design system (`DEFAULT_SIDEBAR_NAV_ICONS` → `'Visão geral'`) e atualizado três suítes
irmãs — mas não essa. A asserção é `toContain`, case-sensitive: a suíte do painel estava **vermelha**
na árvore herdada. Nenhum gate foi rodado pela lane original.

---

## 2. O que o closer completou

| # | O que faltava | O que ficou |
|---|---|---|
| — | `navegacao-spa.test.tsx:292` quebrado pela troca do DS | `atual: 'Visão geral'` |
| MEL-19 | pago só no menu do DS; o **H1 da própria tela** (`OverviewShell.tsx:37`) seguia `title="Visão Geral"` | `title="Visão geral"` + a asserção em `OverviewShell.test.tsx:14`. **Escopo esticado, declarado** — ver abaixo. |

### Por que o H1 entrou (esticada declarada)

A revisora escreveu MEL-19 como "menu principal × vitrine". A vitrine (`areasDaVitrine.ts:92`) já dizia
`'Visão geral'`; então trocar só o menu **não removia a divergência, mudava o lado dela**: o menu passaria
a dizer "Visão geral" abrindo uma página cujo H1 diz "Visão Geral", a um clique de distância — o mesmo
defeito que o BLQ-20 fechou para "Clubs". Title Case em heading também é violação direta do contrato de
escrita da casa. Uma linha de código, uma de teste.

### Escopo herdado, conferido e aceito sem retoque

As 15 melhorias, o F6 e o be-hero foram avaliados contra o contrato antes dos gates. Todos pagam o que
a revisão pediu. Dois pontos merecem registro:

- **MEL-14 era vetável do dono** (cortar a frase do pilar líder ou dar número a ela). A lane escolheu
  **dar o número**: "Físico lidera, com 75,4 pontos por participante." Mantido — a outra saída apaga a
  única leitura que a barra sozinha não entrega. **Segue vetável.**
- **F6** montou a grade como `role="grid"` → `role="row"` → `role="gridcell"` usando `display:contents`,
  o que preserva a malha CSS de 7 colunas intacta, mais roving tabindex e setas com clamp no mês. As
  7 asserções visuais que já existiam seguem verdes sem toque.
- **be-hero:** 6 ocorrências. Cinco telas de club passaram a consumir `linkClubePublico`; a sexta é a
  constante `PUBLIC_BASE` em `apps/painel/src/lib/linkPublico.ts`, que **é** a fonte canônica. Varredura
  final em `apps/` + `packages/` + `e2e/`: nenhum literal de domínio sobrou em código de produção fora
  desse arquivo (as demais ocorrências são comentários, fixtures de teste e props injetadas).

---

## 3. Gates — números reais, do zero, em série e em foreground

Nenhum background, nenhum watcher. `pnpm --config.verify-deps-before-run=false`.

| Gate | Resultado |
|---|---|
| Build do design-system (o label do MEL-19 vive no DS e o painel lê do `dist/`) | exit 0 · `Vis\xE3o geral` conferido dentro de `dist/index.mjs` |
| **Suíte painel INTEIRA** · `--fileParallelism=false` | **239/239 arquivos · 2646/2646 testes · 0 failed** · 1069,33 s |
| ↳ fatia 1 · `routes/eventos` | 82 arquivos · 938 testes · 359,32 s |
| ↳ fatia 2 · `routes/clubes` + `routes/plataforma` | 65 arquivos · 549 testes · 257,58 s |
| ↳ fatia 3 · `routes/overview` + `crm` + `conta` + `parcerias` | 52 arquivos · 523 testes · 273,14 s |
| ↳ fatia 4 · `shell` + `onboarding` + `_system` + `routes/__tests__` + `lib` + `components` + raiz | 40 arquivos · 636 testes · 179,29 s |
| **Suíte design-system INTEIRA** · `--fileParallelism=false` | **77/77 arquivos · 1842/1842 testes · 0 failed** · 137,34 s |
| `tsc --noEmit` painel | exit 0 |
| `tsc --noEmit` design-system | exit 0 |
| `eslint src --max-warnings 0` painel | exit 0 |
| `eslint src showcase/src --max-warnings 0` design-system | exit 0 |
| `generate-tokens` 2× | exit 0 nas duas · `git diff --quiet` nos 5 arquivos gerados = **exit 0** (zero delta de conteúdo) |
| `gate-canon` | **PASS** · baseline INTACTA nas 10 catracas (`superficie-crua.painel = 107`, `botao-cru-estilizado.painel = 6`, `receita-de-grid.painel = 23`, `padrao-orfao = 0`, …) |
| L-021 · hex/rgb/hsl/px cru nas linhas `+` do diff | **0** |

### Por que a suíte do painel foi rodada em 4 fatias

`--fileParallelism=false` é serial por construção: a coleta sozinha custa ~110 s por fatia. A suíte
inteira num comando só passa de 17 minutos e estoura o teto de 600 s de uma chamada de shell — e
**esperar em background é exatamente o vício que matou a lane**. As 4 fatias cobrem os 239 arquivos
sem sobreposição (conferido: `find src -name "*.test.ts*" | wc -l` = 239 = a soma das fatias), cada
uma em foreground, cada exit lido no próprio comando. Zero falhas em lote, então não houve o que
julgar por isolado.

### Nota sobre o `generate-tokens`

`git status` acusou 5 arquivos gerados como modificados depois das duas rodadas. **É ruído de fim de
linha** (o gerador escreve LF, o worktree está em CRLF): `git diff --numstat` vazio e `git diff --quiet`
exit 0 nos mesmos 5 caminhos provam delta de conteúdo zero. Restaurados com `git checkout --` antes dos
commits. O gerador é determinístico; o gate passa pelo conteúdo, não pelo `git status`.

### Grep final — superfície limpa

- `atleta|prova|idempotent|tenant|verbatim|Rules|agregado|RN-[0-9]|split|be-hero` nas linhas `+`:
  as **únicas** ocorrências são as menções a `be-hero.com.br` **dentro de comentários do próprio
  `linkPublico.ts`**, que documentam a regra. Zero em string de usuário.
- `recorte`: sobrou só como **nome de variável** em dois testes. Nenhuma ocorrência em `aria-label`,
  `ajuda`, `label` ou texto.
- Title Case em `title|titulo|label|aria-label|caption`: **zero**.

---

## 4. Commits e merge

Sete commits `--only` com pathspec, um por superfície-tema, todos com trailers da casa.

| Commit | Conteúdo |
|---|---|
| `04b44adc` | `feat(painel): a grade da Agenda vira grid ARIA de verdade, com setas` · **F6** |
| `0c4b7e3d` | `fix(painel): o endereco publico dos clubs sai do hardcode e le da fonte` · **MEL-21 + as 6 ocorrências** |
| `4e7c829a` | `fix(painel): Engajamento diz a causa em uma frase e para de chamar filtro de recorte` · **MEL-03, 04, 06, 11, 12, 13, 14** |
| `2bea06ae` | `fix(painel): Parcerias sem split, sem escopo e sem caixa alta acusando` · **MEL-08, 15, 16, 17, 18** |
| `a5ad2626` | `fix(painel+ds): "Visao geral" com uma grafia so no menu, na vitrine e no H1` · **MEL-19** (+ o teste que a lane quebrou) |
| `62d39df4` | `fix(painel): o hint de "Clubs ativos" concorda em portugues` · **MEL-09** |
| `31c9dac0` | `chore(workspace): @sentry/cli explicito no allowBuilds` · **herdado, fora do escopo de copy** |

`navegacao-spa.test.tsx` carrega linhas de MEL-18 e MEL-19; como `--only` commita o arquivo inteiro,
ele viajou no commit do MEL-19 e isso está declarado nas duas mensagens.

- **Push da branch:** `origin/uxw-melhorias`, exit 0.
- **`git merge-tree --write-tree origin/main HEAD`:** exit 0, só a OID da árvore → **sem conflito**.
- **Merge:** `--no-ff` em `main` → **`049254ad`** · 26 arquivos · +279/−99. Push `3f3f0ec8..049254ad`, exit 0.
- **Worktree `C:\dev\leela-wt-uxw`:** removido. Branch `uxw-melhorias` preservada no remoto.

Nenhum deploy. Nenhum build servido novo — a conferência renderizada desta lane **não** foi feita
(ver seção 6).

---

## 5. O que precisa do dono

1. **MEL-14** segue vetável: "Físico lidera, com 75,4 pontos por participante." — a alternativa é cortar
   a linha inteira.
2. **"Visão geral" no H1** da tela (escopo esticado). Se ele preferir o Title Case no cabeçalho da
   página, a volta é mecânica — mas aí o menu tem de voltar junto, senão o defeito reabre.

---

## 6. Fila registrada

- ⛔ **Conferência renderizada pendente.** Esta lane fechou por prova estática (suítes, tsc, lint,
  gates, grep). O gate de navegador da casa exige ver a tela renderizada antes de qualquer "no ar" —
  e o build servido em `:4601` é da lane UXW-FIX, anterior a estas 15 melhorias. **Antes do próximo
  deploy do painel, servir um build novo e conferir:** grade da Agenda navegando por setas, "Visão geral"
  concordando entre rail, vitrine e H1, e os textos novos do Engajamento.
- ~~Rótulo do eixo Y do BarChart truncado para 1 caractere~~ — **ZUMBI, correção do maestro
  (3ª reaparição do item já pago):** a lane BARCHART-FIX consertou ONTEM à noite, antes do
  merge do redesign (`89537700`, wrapper `formatarTickEixoY` + teste de aridade; verificado
  na main `049254ad`, `BarChart.tsx:105/:142`). MEL-07 está pago no dado E visível na tela.
  NÃO abrir lane. A fonte do eco é o texto antigo da review — quem citar este item confere
  `formatarTickEixoY` no código antes.
- **Achados extras da UXW-FIX, ainda não pagos** (mesma classe dos bloqueadores, fora do diff revisado):
  `(RN-144)` visível em `ConfiguracoesView.tsx:400` e `DeletarClubeModal.tsx:85`; `(RN-141)` em
  `ConfiguracoesView.tsx:343` e `NovoClubePage.tsx:210`; `(idempotente)` em `EstadosBalcao.tsx:74`;
  `"Painel do Organizador"` como texto de exemplo em `Sidebar.stories.tsx:49` e `Sidebar.test.tsx:309`;
  `"Clube"/"Clubes"` como tipo de afiliado em `AfiliadosPage.tsx:220` e `InfluenciadoresPage.tsx:187`;
  telas dentro de um club (membros, configurações, desafios) ainda em "clube".
- **`aria-label="Seções de Eventos"`** (`EventosHubLayout.tsx:47`) é a mesma classe do MEL-18 e ficou
  fora porque não nasceu na rodada revisada. Uma linha, quando alguém tocar a área.
