# Handoff · UI-ACOES-MOTION (2026-08-17)

- **Trace:** `leela-redesign-v2-20260810` · lane `UI-ACOES-MOTION`
- **Branch:** `ui-acoes-motion` · worktree `C:\dev\leela-wt-acoesmotion`
- **Frentes:** T1 tooltip do rail · T2 ações de tabela por ícone · T3 drawer que desliza · T4 campo de busca flat (adicionado pelo maestro no meio da lane)
- **Registro das falas:** a lane da rodada é dona das Levas 18 e 19; esta lane **não** escreveu em `01-decisoes-dono.md`.

## T1 · A dica do rail saía cortada

**Causa raiz MEDIDA antes do conserto**, no rail recolhido: dica de **99px de largura com 0px
visível — 100% recortada**. O recorte **não era do `<nav>`** (`overflow-x: visible`); era do
**contêiner de rolagem dos itens**, que carrega `SCROLL_Y_ONLY` (`overflow-y:auto` +
`overflow-x:hidden`) e estabelece retângulo de recorte na largura de 84px do rail. Nenhum conserto
de `z-index` resolveria: `z-index` não vence recorte de overflow — só sair da caixa vence.

Isso também explica por que o defeito sobreviveu ao P-REC-6: aquela correção tirou o recorte do
**item** e não olhou para o de cima.

**Conserto no nível canônico, uma vez:**
1. `TooltipContent` passou a sair em `TooltipPrimitive.Portal`. Vale para **toda dica do sistema**.
2. O motion do Tooltip entrou atrás de `motion-safe:` — vinha stock do shadcn **sem** o gate, e era
   a última superfície flutuante do DS a animar para quem pediu menos movimento.
3. O rail parou de desenhar dica à mão e passou a consumir o `Tooltip` canônico (fecha a violação
   do shadcn-first, governança §8, que lista "tooltip" nominalmente) — ~25 linhas de posicionamento
   artesanal apagadas. Hover **e** foco de teclado agora vêm do Radix, o que aposenta o
   `group-focus-visible` que pagava a dívida F4 à mão.

Geometria conferida depois: gap de **14px do item** (= `--rail-tip-gap`) e borda esquerda em
**128px**, exatamente a borda externa do rail — a mesma posição que a implementação artesanal
pretendia.

⚠️ **Consequência para quem for testar dica:** ela não está mais na árvore do componente. Teste que
use `container.querySelector()` não a acha; ela nasce no `body`. Os testes desta lane deixaram de
afirmar **classe** e passaram a afirmar **procedência do nó** — um teste de `className` passaria
verde com a dica recortada de novo.

## T2 · Ações de tabela viram ícone

**Inventário primeiro.** Medido: **40 ações de linha em texto, em 21 tabelas de 20 arquivos, com 25
rótulos distintos para 17 verbos** — três grafias só para "ver". A catraca conta **39** (a leitura
manual chega a 40 porque conta duas vezes a coluna que duas tabelas compartilham).

**A peça nasceu no DS:** `RowActions`, com story, docs no próprio arquivo, testes e linha do cânone
(§7) no mesmo commit.

O que decide a qualidade aqui é a **API, não o desenho**: `verbo` é uma união **FECHADA** e o
consumidor **não escolhe o ícone**. Um `icon` livre teria devolvido, no primeiro mês, dois lápis
diferentes para "editar" — a divergência que a peça existe para impedir. Com verbo fechado,
"mesmo verbo, mesmo ícone" passa a ser cobrado pelo compilador, não pela revisão.

Acessibilidade como aceite: `aria-label` obrigatório por construção, e **a dica não é o único canal
do nome** (ela só existe no hover e no foco) — há teste afirmando o nome com a dica fechada.

**Esta peça só é possível por causa do T1**: sem o portal, a dica nasceria dentro do `<td>` e a
`Table` densa, que rola no próprio card, a recortaria igual ao rail.

**Conversão — corte declarado.** A lane converteu **Eventos (15 ações, 7 arquivos)**; sobram **24 em
13 sítios**, nomeados arquivo a arquivo em três ondas:
`leela-specs/02-rodadas/2026-08-17-acoes-de-tabela/03-fila-em-ondas.md`.
Eventos veio primeiro por ser a superfície de operação diária (04.1). Catraca
`acao-de-tabela-em-texto`: **39 → 24**, baseline regravado no mesmo commit.

Nenhum verbo precisou ser criado nem forçado nas 15 conversões — primeira evidência de que o
vocabulário foi medido antes de ser escrito.

**O rótulo foi o trabalho de verdade.** No `RowActions` o `label` é o nome acessível **e** a dica,
então ele carrega a linha: "Editar lote Pista", não "Editar". Onde havia `title` explicando bloqueio,
a razão entrou no rótulo ("Remover cupom X (já usado…)") em vez de morar num atributo paralelo.

**Um defeito caiu junto:** `RowActions` passou a marcar o invólucro com `data-row-stop`. Os ícones já
são `<button>` e paravam o clique sozinhos, mas o **vão** entre eles vazava para `onRowClick` —
acertar 4px entre dois ícones abria o detalhe da linha.

## T3 · Drawer com slide-in/slide-out

**Medição antes do conserto: o `Drawer` canônico já fazia tudo isso.** Compilei o Tailwind com o
preset do DS para não aceitar a classe pela aparência — `slide-in-from-right` e `slide-out-to-right`
emitem mesmo `--tw-enter-translate-x: 100%` / `--tw-exit-translate-x: 100%`, porque
`tailwindcss-animate` declara `DEFAULT: "100%"` em `animationTranslate`. A saída já era animada de
verdade (`usePresencaOverlay` segura o nó pela `--motion-overlay-exit-duration`) e
`prefers-reduced-motion` já era respeitado nas duas metades: `motion-safe:` no CSS e
`duracaoDeSaidaMs() = 0` no JS.

Então o defeito não era do componente, era de **um consumidor fora do cânone**. A varredura achou
**exatamente um** painel lateral à mão no repo inteiro: `InscritoSlideIn` — scrim `<button>` e
`<aside role="dialog">` próprios, sem portal, sem focus trap, sem scroll-lock, sem retorno de foco,
e **sem animação nenhuma**, entrando e saindo por corte seco. `FichaDoClienteDrawer`, o caso vizinho,
já estava certo e herdava tudo.

Convertido para `<Drawer side="right">`. **A armadilha que a conversão precisou resolver:** o pai
fecha anulando o inscrito, e devolver `null` nesse tick desmontaria o Drawer antes do primeiro frame
da saída — o mesmo defeito, só que mudado de lugar. O componente retém o último conteúdo e dirige o
Drawer por `open={inscrito !== null}`.

⚠️ **Deltas visuais declarados:** superfície passa a `--surface-base` (valor canônico, igual ao
`FichaDoCliente`), `max-w` para `85vw`, `z-50` → `z-40`, e o foco de entrada vai para o primeiro
focável em vez do `<h2>` (contrato do `useDialogBehavior`). **Pedem olho no gate visual.**

## T4 · O campo de busca entra no estilo flat

Medido nos três temas: o `SearchInput` era **o único campo do DS ainda desenhado como caixa de
contorno**. A varredura do GATE-DS-W1 (18/07) achatou a família inteira e passou batido por ele.

| | SearchInput (antes) | família flat |
|---|---|---|
| borda | `--border-default`, linha de 1px visível | `--input-border-flat` = `transparent` |
| fundo | `--surface-raised` (mais claro que a página, lê como cartão) | `--surface-sunken` |
| foco | anel de 3px por `box-shadow` | `focus:ring-2` (a governança pede 2px) |

Em wine era gritante: caixa branca pura ao lado de facetas `#F5F1EC` sem borda.

**Não virou variante**, e de propósito: `Calendar`, `Combobox`, `Select` e `Textarea` compartilham
UMA receita, e o conserto aplica essa mesma string — não há decisão nova para o cânone registrar, é
a LEELA-FLAT-DEFAULT alcançando quem ficou para trás. A caixa da borda ficou (borda transparente,
não `border-0`) para a altura seguir em 37.3px exatos: **zero deslocamento nas 12 telas**.

⚠️ **Trade-off herdado, declarado:** em brasa, `sunken` (#0A0A0A) sobre `base` (#0C0C0C) dá ~1.01:1 —
o campo passa a ser identificado por ícone, placeholder e anel de foco, não pela borda. É o mesmo
trade-off já ratificado para todos os outros campos flat. Se incomodar, **a decisão é da família de
campo inteira, nunca só do `SearchInput`** — foi exatamente assim que ele divergiu.

## Gates (do zero)

| Gate | Resultado |
|---|---|
| DS · suíte completa | **2112 testes, 92 arquivos — verde** |
| Painel · suíte completa (lei F2: rail é moldura) | **2883 testes, 256 arquivos — verde** |
| `gate-canon` inteiro | **PASS** · catraca nova `acao-de-tabela-em-texto` armada em 39 e derrubada para **24** |
| `tsc --noEmit` (DS + painel) | limpo |
| `eslint --max-warnings 0` (DS + showcase + painel) | limpo |
| Build local do painel | `npx vite build --mode leela-hub` — **4039 módulos, verde** |
| Deploy | **NENHUM**, como manda o brief |

## Gate visual — o que foi provado e o que NÃO foi

✅ **T1** — antes/depois nos 2 temas: `.nirvana/gate-visual/t1-tooltip-rail/`
✅ **T4** — antes/depois nos 3 temas + foco: `.nirvana/gate-visual/t4-searchinput/`
⚠️ **T2** — só o contrato do vocabulário em **brasa** (`.nirvana/gate-visual/t2-row-actions/`); o
segundo tema **não foi capturado**.
❌ **T3 — o GIF do drawer NÃO foi capturado.** A captura por CDP passou a estourar timeout na
sobreposição com `backdrop-blur` durante a animação de 800ms, e o renderer travou; depois disso a
ferramenta de screenshot ficou instável na sessão inteira. **Não substitua isso por "está provado":**
o que existe no lugar é (a) o compile do Tailwind mostrando que as classes emitem transform real,
(b) teste que prende a saída animada com o tempo exato (presente em 499ms, ausente em 500ms), e
(c) a suíte verde. **Falta ver o drawer deslizando com olho humano** — é o primeiro item de quem
pegar a próxima rodada.

Nenhuma das 7 telas convertidas no T2 foi vista renderizada. A prova ali é de teste e de catraca.

## Fila que esta lane deixa nomeada

1. **Ver o drawer deslizando** (T3) e as 7 telas de Eventos convertidas — gate visual pendente.
2. **Ondas A1, A2 e A3** das ações de tabela — 24 ações, 13 sítios, detalhadas em
   `02-rodadas/2026-08-17-acoes-de-tabela/03-fila-em-ondas.md`.
3. `--border-focus-ring-shadow` ficou órfão no web (segue emitido no `rn-themes.ts`). Remover exige
   regenerar tokens e colidiria com outras lanes.
4. As duas telas de repasse (`RepassesFilaView`, `RepassesDoTenant`) têm a **mesma tripla** de ações
   escrita separada. Quem pegar a onda A2 decide se vira helper — e se virar, **é do painel, não do
   DS**: uma segunda peça sobre o `RowActions` seria a duplicata batizada da L-021.
