# REV-PAINEL — review antagonista de `2332bebb` (barra superior) e `3fdfb6f5` (afordâncias)

**Lane:** REV-PAINEL · contexto fresco · sf-qa-engineer (antagonista)
**Trace:** `leela-pixreal-diag-20260804`
**Data:** 2026-08-05
**Território:** `apps/painel/**` + testes. `packages/**`, `functions/**`, `firestore.rules`,
`leela-specs/`, `apps/landing` intocados.

---

## Veredito

**APROVADO COM TRÊS DEFEITOS CORRIGIDOS NA LANE** — mais um quarto, pré-existente, achado de raspão e consertado à parte. Seguro deployar o painel
depois de aplicar os fix-commits abaixo — que já estão no `main`.

As afirmações de MEDIÇÃO do construtor estão exatas. O que falhou foi a
CONCLUSÃO tirada delas: o argumento que dispensou a recomposição de espaço vale
para telas que abrem com `PageHeader` e não alcança duas áreas que abrem com
`SubNav`.

---

## Tabela vetor → resultado

| # | Vetor de ataque | Resultado | Evidência |
|---|---|---|---|
| 1 | Layout: alguma rota do produtor ficou com o conteúdo colado no topo? | **DEFEITO** (7 rotas) | `/eventos`, `/eventos/repasses` e `/crm/*` abrem com `SubNav` de 48px sem padding vertical → aba a ~12px do topo, contra ~32px do controle `/plataforma` |
| 2 | O canário de ausência da barra vale alguma coisa? | **VÁLIDO** | Barra reintroduzida no `RootShell` → 4 das 5 asserções do bloco "Adendo 13" viram vermelho; suíte volta verde ao reverter |
| 3 | "Nenhum outro renderizador de `Toolbar`" | **CONFIRMADO** | Varredura independente em `apps/painel`, `apps/landing`, `apps/mobile`, `e2e/` e `packages/design-system/showcase`: zero. Só sobram o próprio componente, o teste dele, `stories` e `docs.mdx` |
| 4 | Botão dentro do alerta crítico (`3fdfb6f5`) | **DEFEITO** | `<Link><Button>` gerava `<a><button>`: HTML inválido, DOIS pontos de tabulação, o primeiro deles um `<a>` sem classe (sem anel de foco) |
| 4b | O botão é `Link` de verdade (sem recarregar)? | **SIM** | `Link` do router; `href` correto no DOM |
| 4c | O destino existe para todo estado do evento? | **SIM** | Rota `lotes` existe sob `:slug` e **não** tem `RequirePapel` — nenhum papel cai em 403. `eventoDegradado` preenche `slug: id`, então nunca sai `/eventos/undefined/lotes` |
| 4d | Contraste AA nos dois temas | **PASSA** | `secondary` = texto `--text-primary` sobre `--surface-raised`: 17:1 (brasa) e 15:1 (wine). Borda `--border-strong`: 3.82:1 (brasa) e 3.74:1 (wine) — acima do mínimo de 3:1 para componente de UI |
| 5 | O caso "undefined" é reproduzível e a frase nova aparece? | **CONFIRMADO** | `diagnosticoVitrine([], futuro, agora)` → `{vende:false, motivo:'sem_preco', modalidadesSemPreco:[]}` pelo caminho real do `@leela/core`, e o alerta sai com a frase própria |
| 5b | Sobrou `undefined`/`[object Object]` na família de alertas? | **NÃO** | Varredura de 3 recortes × 6 diagnósticos sobre `derivaAlertas`: nenhuma mensagem e nenhum `href` casa `/undefined|\[object Object\]|NaN/` |
| 6 | Regressão em telas estreitas (320/768/1024) — vinda de `2332bebb` | **SEM REGRESSÃO** | O bloco removido não tinha variante responsiva. O hambúrguer do `AppShell` vive em `<main>` ANTES da área de rolagem (`lg:hidden`) e não foi tocado. A trava de rolagem do `SubNav` é interna ao componente; o `pt` do fix mora na moldura da área, fora dela |
| 6b | Regressão em 320px — vinda de `3fdfb6f5` | **DEFEITO** | O grupo de ações do alerta virou ~135px `shrink-0` numa linha `flex` **sem** `flex-wrap`, com a mensagem travada em `min-width:auto` → estouro de largura em 320px |
| 6c | O mesmo aninhamento inválido existe em outro lugar do painel? | **SIM, pré-existente** | `KitsCadastroView.tsx` repete `<Link><Button/></Link>` em dois atalhos ("+ Adicionar kit" e o "Editar" de cada card) — fora dos commits sob review, consertado em commit à parte |
| 7 | A remoção da condicional `produtor` mudou algo para quem NÃO é produtor? | **NÃO** | Com `produtor === false` o `RootShell` já renderizava exatamente `<div class="flex flex-col flex-1 overflow-y-auto">{children}</div>`. O diff deixa esse `div` byte a byte igual — `/plataforma` é idêntico ao de antes |
| 8 | Os 89px/101px do construtor | **EXATOS** | Desktop: 32 (`--layout-page-pt`) + 36 (`--iconbtn-size`) + 16 (`--layout-toolbar-pb`) + 1 (hairline) + 4 (`--toolbar-mb`) = **89px**. Abaixo de `lg` a toolbar empilha: 0 + 12 (`--toolbar-gap`) + 36 = 48 de conteúdo → **101px** |
| 9 | Fatos que sustentam os textos novos de `3fdfb6f5` | **VERDADEIROS** | `atualizarConfiguracoesEvento` monta `payload` com `nome, local, usaChip, capacidade, atualizadoEm` + condicionais `imagemUrl/regulamento/taxaModo/vendaSomentePorCupom` — **sem `modalidades`**. O checkout filtra kit por modalidade (`tipos.ts:86`) e o `saleState.ts:271` reforça — kit↔lote não existe no modelo |

---

## Defeitos

### D-1 · Topo rente em 7 rotas do produtor · severidade MÉDIA · introduzido em `2332bebb`

O commit argumenta: *"não recompus com um `pt` na moldura porque `/plataforma`
nunca teve a barra e já entrega o `PageHeader` rente ao topo: o `min-h` de 96px
do `PageHeader` com conteúdo centrado é o respiro."*

O argumento é verdadeiro — e é verificável que TODA rota de `/plataforma` abre
com `PageHeader`. Ele só nunca foi conferido contra as áreas que **não** abrem
com `PageHeader`. Duas abrem com `SubNav`:

- `EventosHubLayout` → `/eventos` e `/eventos/repasses`
- `CrmLayout` → `/crm`, `/crm/visao-geral`, `/crm/clientes`,
  `/crm/clientes/:clienteKey`, `/crm/comunicacao`

O `SubNav` do DS tem `--subnav-height` 48px, `--subnav-px` só no eixo
horizontal e **zero padding vertical**; a aba é `h-full pb-1` com conteúdo
centrado. Sem a barra, o texto da aba passou a nascer a ~12px do topo do
contêiner de rolagem, contra ~32px de qualquer tela que abra com `PageHeader`.
Metade do respiro do controle declarado.

Note-se que o item 2 da conferência do próprio construtor (*"`/eventos` — o
header 'Eventos' com o botão '+ Novo evento' subiu ~89px"*) descreve o
`PageHeader` como se fosse o primeiro elemento de `/eventos`. Não é: o
`EventosHubSubNav` vem antes dele.

**Fix:** `pt-[var(--spacing-5)]` (20px) na moldura de cada uma das duas áreas —
mesmo token e mesma razão do `pt-5` que o `EventoShell` já usa para o próprio
primeiro elemento baixo (o breadcrumb). Com ele, o texto da aba cai a ~32px, em
cima do respiro das telas com `PageHeader`. O `pt` mora na MOLDURA DA ÁREA, não
no shell — não ressuscita a barra invisível que a lane proibiu, e não toca
`/plataforma`.

**Teste que o teria pegado:** `apps/painel/src/shell/__tests__/RespiroTopo.test.tsx`
(novo, 8 casos). Monta cada moldura de área dentro do `RootShell`, pega o
primeiro filho da área de rolagem e exige respiro próprio — padding explícito
OU `PageHeader` com `min-h-[var(--header-height)]`. **Falsificado:** removendo o
`pt`, 6 dos 8 casos ficam vermelhos.

### D-2 · Controle aninhado dentro de controle no alerta crítico · severidade MÉDIA · introduzido em `3fdfb6f5`

`OverviewDashboard.tsx` montava:

```tsx
<Link to={a.acao.href}>
  <Button variant="secondary" size="sm">{a.acao.label}</Button>
</Link>
```

O DOM que sai disso é `<a href="…"><button …></button></a>`. Três consequências,
todas medidas em jsdom:

1. **HTML inválido.** O modelo de conteúdo do `<a>` é transparente *mas sem
   descendente interativo*. `<button>` é descendente interativo.
2. **Dois pontos de tabulação para uma ação só.** Sonda de `userEvent.tab()`
   dentro do alerta devolveu `["A:NO-CLASS", "BUTTON:styled", "A:NO-CLASS"]`.
3. **WCAG 2.4.7 (foco visível).** O `<a>` sai **sem atributo `class`**: o anel
   de foco (`focus-visible:ring`) está no `<button>` de dentro, não no elemento
   que recebe o foco primeiro.

O teste existente (`getByRole('link', { name: 'Configurar lotes' })`) passa nas
DUAS formas — o nome acessível do `<a>` é computado a partir do texto do botão
aninhado —, então ele nunca protegeu nada aqui.

**Fix:** inverter o aninhamento para `<Button asChild>` por fora e `<Link>` por
dentro. O Radix `Slot` funde os dois num `<a>` único com o estilo e o anel de
foco do botão. É exatamente o par que a `ContaPage` já usa em dois lugares
(linhas 132 e 271) — o commit tinha invertido a convenção da casa.

**Testes que o teriam pegado:** 3 casos novos em
`OverviewDashboard.test.tsx` — um ponto de tabulação, nenhum descendente
interativo dentro do link, e `focus-visible:ring` no elemento que recebe o foco.
**Falsificados:** com a forma antiga, os 3 ficam vermelhos.

### D-3 · Linha do alerta estoura a largura em 320px · severidade BAIXA · introduzido em `3fdfb6f5`

A linha do alerta é `flex items-center justify-between` **sem `flex-wrap`**. O
único filho da direita era o `Badge` "Atenção" (~60px). Com o botão de destino,
o grupo passou a `shrink-0` de ~135px (botão `sm` ~123px + gap 12 + badge ~60).
A mensagem é um `<span>` de texto: em flexbox ela **não encolhe abaixo da
palavra mais longa** (`min-width:auto`).

Conta em 320px (abaixo de `lg` a sidebar sai do fluxo):
`320 − 48` (o `p-6` do `EventoShell`) `− 32` (o `p-4` do `<li>`) `= 240px` úteis.
Largura mínima da linha ≈ `70` (palavra mais longa) `+ 12 + 123 + 12 + 60` ≈
**277px**. Estoura ~37px. O contêiner de rolagem é `overflow-y-auto`, e pelo CSS
de overflow um eixo não-`visible` promove o outro a `auto` — ou seja, volta a
barra horizontal que o dono já reportou duas vezes em outras telas. Em 390px
(a base mobile do projeto) ainda cabe; o estouro é da faixa 320–355.

**Fix:** o MESMO par do `PageHeader` do DS — `flex-wrap` + `sm:flex-nowrap` na
linha, `min-w-0` na mensagem e `ml-auto basis-full sm:basis-auto` no grupo de
ações. Abaixo de `sm` o `basis-full` garante que o grupo desça inteiro para a
própria linha (só `min-w-0` não bastaria: trocaria estouro de linha por estouro
de palavra, já que uma palavra sozinha não quebra por padrão). De `sm` para cima
nada muda e o desktop fica idêntico.

**Teste:** 1 caso novo em `OverviewDashboard.test.tsx`. **Limite declarado:** o
jsdom não faz layout, então o teste trava o CONTRATO (`flex-wrap` +
`sm:flex-nowrap` na linha, `min-w-0` na mensagem, `basis-full` +
`sm:basis-auto` no grupo de ações), não o pixel. A conferência em 320px real está na lista
de olho humano.

### D-4 · O mesmo aninhamento inválido, PRÉ-EXISTENTE, em Kits · severidade BAIXA

Achado na varredura da família, não nos dois commits sob review:
`KitsCadastroView.tsx` monta `<Link><Button/></Link>` em DOIS atalhos —
"+ Adicionar kit" (linha 70) e o "Editar" de cada card de kit (linha 155). É o
mesmo `<a><button>` do D-2, com as mesmas três consequências, multiplicado por
quantos kits o evento tiver: na fixture do próprio teste são 4 cards, ou seja 8
pontos de tabulação onde deveriam existir 4.

O teste que já existia lá (`getAllByRole('link', { name: 'Editar' })`) passa nas
duas formas, pela mesma razão do D-2: o nome acessível do `<a>` é computado a
partir do texto do botão aninhado.

**Fix:** mesma inversão para `Button asChild` + `Link`. **Teste:** 1 caso novo em
`KitsCadastroView.test.tsx`, cobrindo os dois atalhos.

Vai em commit SEPARADO de propósito: não veio de `2332bebb` nem de `3fdfb6f5`, e
o maestro pode descartá-lo sem tocar nos fixes da review.

### Achado sem fix (fora do território) · severidade BAIXA

Depois de `2332bebb`, os três tokens da moldura de página — `--layout-page-px`,
`--layout-page-pt`, `--layout-page-pb` — ficaram com **zero consumidor** em
`apps/painel/src`. `--layout-toolbar-pb`, `--toolbar-gap`, `--toolbar-end-gap` e
`--toolbar-mb` também, junto com o componente `Toolbar` órfão que o commit já
registrou como dívida. Apagar primitivo do DS é `packages/**` — outra alçada.

---

## Rotas onde o topo mudou (para o dono conferir)

O `RootShell` é o layout raiz de `/*`, então **toda** rota autenticada perdeu os
89px (101px abaixo de 1024px). O que muda de tela para tela é o que segura o
respiro depois disso:

| Rota | Primeiro elemento | Respiro depois do Adendo 13 |
|---|---|---|
| `/` Visão Geral | `PageHeader` (`min-h` 96px) | ~32px — o próprio header |
| `/eventos` | `SubNav` 48px | **era ~12px → agora ~32px (fix D-1)** |
| `/eventos/repasses` | `SubNav` 48px | **era ~12px → agora ~32px (fix D-1)** |
| `/eventos/novo` | `EventoForm` (`px-6 py-4`) | 16px próprio |
| `/eventos/:slug/*` | `EventoShell` (`pt-5` no breadcrumb) | 20px próprio |
| `/clubes` | `PageHeader` | ~32px |
| `/clubes/novo`, `/clubes/assessorias*` | `p-6` | 24px próprio |
| `/clubes/influenciadores`, `/clubes/minhas-afiliacoes` | `PageHeader` | ~32px |
| `/clubes/:slug/*` | `ClubeShell` → `PageHeader` | ~32px |
| `/crm`, `/crm/visao-geral`, `/crm/clientes`, `/crm/clientes/:key`, `/crm/comunicacao` | `SubNav` 48px | **era ~12px → agora ~32px (fix D-1)** |
| `/marcas` | `PageHeader` | ~32px |
| `/conta/*` | `p-6` | 24px próprio |
| 404 / 500 / 403 no shell | `SystemStateScreen` (`p-8`) | 32px próprio |
| `/plataforma/*` | `PageHeader` em TODAS as 9 rotas | ~32px — **inalterado, é o controle** |

---

## Gates

| Gate | Resultado |
|---|---|
| `tsc --noEmit` | 0 erros |
| `eslint src --max-warnings 0` | 0 |
| Suíte do painel (inteira, sem `--singleFork`) | verde — ver rodapé desta seção |
| `tsup` do DS | não foi preciso: nada tocado depende do DS buildado |
| Deploy | **NÃO feito** — o maestro sequencia |

Base antes desta lane: **199 arquivos / 2030 testes** — confere com o briefing.
Depois: **200 arquivos / 2046 testes**, zero erro. Delta `+16`:

| Arquivo | Casos novos |
|---|---|
| `shell/__tests__/RespiroTopo.test.tsx` (novo) | 8 |
| `eventos/evento/overview/__tests__/OverviewDashboard.test.tsx` | 4 |
| `eventos/_lib/__tests__/alertas.test.ts` | 3 |
| `eventos/kits/__tests__/KitsCadastroView.test.tsx` | 1 |

Nenhum teste existente foi alterado ou removido.

> Nota de método: duas execuções intermediárias morreram com
> `Worker exited unexpectedly` (tinypool). A causa fui eu — rodei um arquivo
> avulso enquanto a suíte inteira coletava. Colisão de processo é
> indistinguível de regressão no relatório do vitest (uma delas apareceu como
> "199 arquivos / 2029 testes", ou seja MENOS que a base, sem nenhum FAIL). O
> número acima é de uma execução limpa, sem nada concorrente.
---

## O que precisa de olho humano

1. **Os 20px do D-1 são calibragem, não teorema.** `--spacing-5` foi escolhido
   por alinhar o texto da aba (~32px do topo) com o texto do título das telas
   que abrem com `PageHeader` (~32px), e por ser o mesmo token que o
   `EventoShell` já usa. Se o dono achar que `/eventos` e `/crm` ficaram altos
   ou baixos DEMAIS ao lado de `/`, é uma linha em duas molduras.
2. **A conferência visual continua pendente** — jsdom não faz layout. Nenhum
   número deste relatório saiu de pixel medido em navegador; todos saíram dos
   tokens do DS e da árvore renderizada. As telas para olhar são as da tabela
   acima; as que mudaram DE VERDADE nesta lane são `/eventos`,
   `/eventos/repasses` e `/crm/*`.
3. **O alerta crítico em 320px** (`/eventos/{slug}` de um evento publicado que
   não vende). O D-3 é conta de CSS, não medição: vale confirmar no aparelho
   que a linha refluí em vez de abrir barra horizontal.
4. **Decisão de produto ainda aberta (herdada de `3fdfb6f5`, não é defeito):**
   a lista de `modalidades` não é editável em superfície nenhuma do painel
   depois que o evento nasce. Os textos agora contam esse estado com
   honestidade em vez de mandar o organizador em círculo, mas a edição em si
   continua não existindo.
5. **`Toolbar` segue no DS, órfão**, junto com sete tokens sem consumidor.
   Apagar é `packages/**`.
