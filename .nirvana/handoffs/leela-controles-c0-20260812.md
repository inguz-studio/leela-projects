# Onda C0 — as cinco peças nascem no DS e a catraca aprende a vê-las

**Trace** `leela-roadmap-componentes-20260810` · lane **CONTROLES-C0** · branch `controles-c0`
**Worktree** `C:\dev\leela-wt-controles-c0` (criado sobre `origin/main` @ `997acacc`)
**Data** 2026-08-12 · sf-frontend-lead (software-forge)

Paga a **Onda C0** de `02-rodadas/2026-08-12-conformidade-controles/03-fila-em-ondas.md` e a tarefa
**S006-T5** do épico `LEELA-E01-design-system`. **Nenhum deploy. Nenhuma tela convertida** — a
conversão das 59 ocorrências é C1 a C6, ondas próprias. Esta lane entrega as peças e o gate armado.

## O que mudou, peça por peça

| # | Peça | Commit | Teste | Cânone |
|---|---|---|---|---|
| 1 | `FilterChips` — a faceta, com o limiar do cânone §1 fechado por construção | `3570d74a` | 17 casos | §1, mesmo commit |
| 2 | `ResultCount` — o contador, com a honestidade do número como regra | `450707d3` | 15 casos | §7, mesmo commit |
| 3 | `FilterBar` — a barra que treze telas escreveram | `161da9f7` | 10 casos | §7, mesmo commit |
| 4 | `CheckboxField` — o par rótulo + caixinha | `9c3f99ab` | 17 casos | §3, mesmo commit |
| 5 | `FieldGroup` — o grupo de campos | `04c1b047` | 15 casos | §3, mesmo commit |
| 6 | A catraca: regra 3 + cinco contagens + dois consertos de régua | `6f08f59e` | 25 casos de `RuleTester` + falsificação | — |

Cada peça nasceu com **story + docs + contrato LLM + teste + linha do cânone no MESMO commit**. A
quebra de atomicidade da Onda 0 Parte B (`443394a1`) ficou registrada e não se repetiu.

## Decisões de desenho, escritas antes do código

**`FilterChips` conta as opções e escolhe o desenho.** Abaixo de quatro, fileira de `Chip`; a partir
de quatro, `FilterMenu` quando a faceta é empilhável e `Combobox` quando é exclusiva. A régua do
segundo caso não é nova — está escrita no cabeçalho do próprio `FilterMenu` (*"para seleção ÚNICA
exclusiva com 4+ valores, use `Combobox`"*) —, e um menu de `menuitemcheckbox` anunciaria "marcado"
onde a semântica é "selecionado". O chip de "Todos" deixa de ser escolha de tela: existe em faceta
exclusiva (quatro das doze medidas só destravavam reclicando o chip ativo, afordância que nada
anuncia) e não existe em empilhável.

**`ResultCount` ignora o `total` quando há `temMais`.** A paginação por cursor nunca computou total,
e dez das doze instâncias medidas afirmam um número que só é verdade porque a lista é pequena. O
canal de ARIA é prop com default polido (`role="status"` + `aria-live="polite"`), e a escala **não
tem canal assertivo**: um contador de lista nunca é urgente a ponto de interromper a fala do leitor,
e o único efeito de oferecer a opção seria alguém escolhê-la.

**`FilterBar` não leva `role="search"` — a única divergência declarada da letra da spec.** O
`SearchInput` do DS já declara `role="search"` no próprio contêiner (`SearchInput.tsx:66`). Um
segundo landmark do mesmo tipo seria aninhamento, que a regra `landmark-unique` do axe reprova e que
faz o leitor de tela anunciar duas buscas onde há uma. A barra é o `toolbar` nomeado (`Filtros de
comunicados`) e o `search` fica no campo. O ganho que a spec pedia — ARIA num lugar só — é idêntico.

**`CheckboxField` usa `<label htmlFor>` irmão e alinha ao topo, sempre.** Dos três dialetos medidos,
o irmão é o que deixa um link viver dentro do rótulo (o aceite de compra hoje resolve tirando o
gatilho do `<label>`), e o alinhamento ao topo é o único correto quando o rótulo quebra — "centro
quando cabe" devolveria a decisão para a tela.

**`FieldGroup` conserta três defaults do navegador.** `min-inline-size: min-content` do `fieldset`
(que impede o grupo de encolher e empurra a página para a rolagem horizontal), `padding-inline: 2px`
da `legend` (que desalinha a legenda de todo rótulo da tela) e a borda/padding próprios que o produto
não usa. A legenda é sempre visível: `sr-only` + `<span>` ao lado é o mesmo rótulo escrito duas
vezes.

## A restrição da Onda C2, provada antes de a C2 abrir

`CheckboxField` e `FieldGroup` entram na landing pelo boundary `app/_ds/ds.ts`, **não** por
`@leela/design-system/server`: o `Checkbox` usa `useRef`/`useEffect` para o `indeterminate` e as duas
peças usam `useId` para fiar `htmlFor` e `aria-describedby` — hook em grafo de RSC é ilegal. Trocar o
`useId` por um `id` obrigatório empurraria para dezessete telas a invenção de identificador único,
que é o que a peça existe para tirar delas.

O que o ADR-017 realmente proíbe é Radix no bundle público, e isso ficou **executável**:
`server-safety.test.ts` ganhou um bloco que caminha o grafo das duas peças e reprova qualquer
`@radix-ui` ou dependência fora da allowlist.

## A catraca, com os números medidos

| Contagem | Rodada leu | Gate mede | Por quê a diferença |
|---|---:|---:|---|
| `faceta-crua` | 12 | **13** | entram os dois `<button>` que replicam `Chip` (`TenantsList:37`, `RepassesFilaView:61`) — a régua da spec manda contar `<button>`; sai `ContasRoute:292`, cujo `aria-label` ("Modo de visualização") não começa com prefixo de filtro |
| `barra-de-filtro-crua` | 13 | **12** | a régua da spec exigia busca **E** recorte no mesmo bloco, e cinco das treze barras hospedam só a busca; o conjunto de recorte saiu da régua. Ficam fora `HubEventos:99` (a faceta está num componente local, invisível ao corpo do bloco) e `VendasTab:183` (não tem busca); entra `AtendimentoPanel:265`, o typeahead do balcão |
| `contador-de-resultado-cru` | 12 | **13** | `ComunicacaoView:203` é um contador real que a varredura não listou |
| `rotulo-de-checkbox-cru` | 17 | **17** | exato (12 painel + 5 landing) |
| `grupo-de-campos-cru` | 11 | **11** | exato |
| `filtro-fora-do-canone` (regra 3) | — | **3** | `EngajamentoView:299`, `:382` e `ClientesPage:118`, medidos sem a lista de dívida |

**Por que o baseline é o que o gate mede, e não o que a rodada leu.** Um baseline que não bate com a
própria régua reprova na primeira execução, e gate que nasce vermelho é desligado no mesmo dia. Cada
divergência está nomeada acima, arquivo por arquivo, e todas as seis contagens são catraca: só
descem.

**Dois consertos de régua**, os que a spec original já tinha nomeado como ponto cego: o contador é
lido por LINHA (ele mora em `<p>` e em `<span>`, doze de doze) e as cinco contagens varrem o arquivo
inteiro, inclusive os componentes locais declarados com `const`/`function` — que é onde a faceta e a
barra moram.

**Um terceiro conserto que a execução obrigou:** a régua da faceta conta chips renderizados, não
ocorrências de texto. Onze dos doze grupos escrevem UM `<Chip` dentro de um `.map()` das opções; sem
isso a contagem nascia em quatro e mentia.

**Falsificação, de propósito** (gate que não falha quando deve não é gate): um arquivo com uma
faceta, uma barra, um contador, um par rótulo+checkbox, um `fieldset` e um `Select` de filtro fez as
**seis** contagens subirem e a regra 3 reprovar; removido, o gate voltou a `PASS`.

## Sinônimos: a peça e o nome entram juntos

`FilterBar`, `FilterChips`, `ResultCount`, `CheckboxField` e `FieldGroup` entraram na opção
`sinonimos` da Regra 2 **no mesmo commit em que nasceram** — foi a separação entre as duas coisas que
custou uma remedição em 11/08, quando `SecaoHead` virou sinônimo de `SectionHeader` com o componente
já no ar. O spread de `SINONIMOS_PADRAO` é obrigatório: a opção SUBSTITUI o default do plugin, e sem
ele os quinze sinônimos anteriores sumiriam em silêncio — o número desceria e o gate ficaria mais
cego parecendo mais verde.

Consequência medida: `padrao-reimplementado-fora-do-ds` subiu 3 → 4, porque `FiltroStatus`
(`HubEventos.tsx:83`) é literalmente a anatomia da `FilterChips` — `<div role="group" aria-label>` em
volta de um `FilterMenu`, com o limiar de quatro valores explicado à mão no comentário. A entrada
nasceu na dívida, nomeada pela Onda C5, e o baseline foi regravado por `--remedir` com a razão por
escrito.

## O gate vermelho da main, e a espera

| Momento | O que | Estado |
|---|---|---|
| início da lane | `gate-canon` na base `997acacc` | `FAIL (1)` · `grade-crua.painel` 104 → 109 |
| antes de gravar o baseline | `origin/main` re-puxada; `65028522 fix(canon)` da lane FIX-CANON-MAIN já tinha aterrissado | merge `24aad047` · `grade-crua.painel` de volta em **104** |
| depois do merge | baseline gravado com `--remedir` | `GATE LEELA-CANON: PASS` |

A espera não custou tempo de lane: o fix aterrissou enquanto as cinco peças eram escritas. **O
registro que fica é a razão de a ordem ser essa** — `--atualizar` e `--remedir` regravam o baseline
INTEIRO, então gravar com a main vermelha carimbaria `grade-crua.painel: 109` e engoliria a
regressão em silêncio, que é o "conserte o baseline em vez do código" que o script existe para
impedir.

## Gates, do zero

| Gate | Resultado |
|---|---|
| DS · `vitest run` (suíte inteira) | **89 arquivos · 2066 casos**, verdes (baseline da Onda 0: 77 · 1842) |
| Painel · `vitest run` (suíte INTEIRA, em fatias seriais) | **254 arquivos · 2855 casos** — ver a tabela por fatia |
| `eslint --max-warnings 0` (DS, showcase, painel, landing) | limpo |
| `tsc --noEmit` (DS e landing) | limpo |
| `generate-tokens` 2× | idempotente — zero diferença de conteúdo (só LF×CRLF do gerador) |
| `pnpm gate:canon` | **PASS**, com o baseline remedido |
| Falsificação das seis contagens novas | reprova quando deve, volta a verde quando o arquivo sai |

### A suíte do painel, fatia por fatia

| Fatia | Arquivos · casos |
|---|---|
| `routes/eventos` | 82 · 938 |
| `routes/clubes` | 35 · 323 |
| `routes/plataforma` | 45 · 433 |
| `routes/crm` + `parcerias` + `overview` + `conta` + `onboarding` + `_system` + `__tests__` | 68 · 814 |
| `components` + `lib` + `shell` + `src/__tests__` | 24 · 347 |

**O `dist` do design system tem de ser rebuildado antes da suíte do painel, e isso custou duas
fatias.** O painel resolve `@leela/design-system` pelo `dist`, não pelo `src`. Com o `dist` construído
ANTES do merge da main, `clubes/_data/session.test.tsx` estourou o teto de espera do RTL três vezes
seguidas (12s onde a mesma árvore leva 2,2s) e passava sozinho — o retrato de artefato defasado, não
de defeito. Rebuildado `core → design-system → api-client`, a fatia fechou verde.

Duas quedas restantes foram **teto de tempo sob carga**, cada uma provada verde isolada no mesmo
estado da árvore: `clubes/_data/session.test.tsx` (8/8 sozinho) e
`eventos/comunicacao/CampanhaEditor.test.tsx` (7/7 sozinho, 20,6s na fatia contra 4,1s sozinho). Os
dois arquivos são da família que o próprio `vitest.config.ts` do painel nomeia no comentário do
`testTimeout`: pesados, verdes isolados, sensíveis a contenção. Nenhuma linha desta lane entra no
grafo deles — o único arquivo de `apps/` que a lane toca é o boundary `_ds/ds.ts` da landing.

## O que fica para as próximas ondas

- **C1 a C6 convertem as telas.** Esta lane não converteu nenhuma, por desenho.
- **Caronas da C0 que não entraram nesta lane** (não estão no aceite do brief): o default
  `SearchInput.shortcutLabel = null`, o modo de fluxo do `Combobox` (ou o ADR do balcão) e a decisão
  sobre a peça de rótulo/valor das quatro receitas do administrativo. As três seguem escritas na
  rodada, livres para a próxima lane.
- **Prova renderizada nos dois temas (L-019).** As cinco peças têm story com os estados, mas nenhuma
  tela as consome ainda — a prova visual cai na primeira onda de conversão, junto com a tela que a
  mostra.
- **A regra 3 não pega `EngajamentoView:461`** (`aria-label="Club analisado"`): o rótulo não declara
  papel de filtro, e a régua é justamente "o rótulo denuncia o papel". A conversão dela é da C1, por
  leitura humana.
