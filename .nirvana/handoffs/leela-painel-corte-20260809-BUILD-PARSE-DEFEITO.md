# BUILD-PARSE-DEFEITO · PARSE-1

- **Trace:** `leela-painel-corte-20260809` · wave B · lane própria
- **Employee:** `sf-frontend-lead` (software-forge)
- **Repo/branch:** `C:\dev\LEELA` · `main` · HEAD de partida `eecb10c9`
- **Card:** `S1242-T5` no [[V1-KANBAN]]
- **Contrato:** `leela-specs/02-rodadas/2026-08-09-corte-painel/02-fila-execucao.md` §PARSE-1
- **Commits:** `41bb7e8b` (o defeito) e `431c92ac` (a calibragem), **empurrados**
  (`94d2af45..431c92ac`). A árvore andou durante a lane: `94d2af45` (docs do
  radar-whatsapp) entrou entre o `eecb10c9` de partida e o primeiro commit daqui,
  sem conflito de território.
- **Tempo da lane:** ~2h20 do primeiro arquivo lido ao push. O que pesa é a suíte
  cheia do painel: **826s** na última rodada (213 arquivos), e ela roda três vezes
  numa lane que mexe em nove telas.

## Estado

| | |
|---|---|
| Início | 2026-08-09 |
| Inventário fechado | ✅ (abaixo, antes de qualquer edição) |
| Metade 1 · o defeito | ✅ construída |
| Metade 2 · a calibragem | ✅ construída |
| **No ar** | ❌ **não** — o painel inteiro espera deploy |
| Review antagonista | ❌ pendente — nada aqui está "resolvido" |

---

## O inventário dos dezoito, antes de mexer

Ordem: os **cinco de dinheiro alcançáveis** (já são campo de texto — são estes que
recebem a régua do ponto e da vírgula) e os **treze numéricos do navegador** (onze de
contagem e **dois de dinheiro**, que a fila conta entre os treze e não entre os cinco).
O 5+13 da fila **bate** com a árvore.

### Os cinco de dinheiro alcançáveis (`parseValorPtBr`)

| # | Campo (`id`) | Input | Validação | Mensagem do parser tem caminho hoje? |
|---|---|---|---|---|
| M1 | `lote-preco` | `LoteModal.tsx:279` `text`/`decimal` | `loteForm.ts:475` | ❌ o motivo é descartado; sai `Preço inválido (use R$ ≥ 0).` para todo texto |
| M2 | `kit-preco` | `KitEditor.tsx:410` `text`/`decimal` | `KitEditor.tsx:246` | ✅ `mensagemValorInvalido` |
| M3 | `cupom-valor` | `CupomModal.tsx:183` `text`/`decimal` | `cupomForm.ts:~155` | ❌ domínio (`Informe um percentual…`) |
| M4 | `repasse-comissao-valor` | `InfluenciadoresPage.tsx:343` `text`/`decimal` | `repasseForm.ts:90` | ✅ `mensagemValorInvalido` |
| M5 | `condicao-valor` | `ParceriaDetailPage.tsx:233` `text`/`decimal` | `assessoriaForm.ts:141` | ❌ **nenhuma mensagem em tela** — `erros` só desabilita o botão |

### Os treze do navegador (`type="number"`)

| # | Campo (`id`) | Input | Parser | Mensagem do parser tem caminho hoje? |
|---|---|---|---|---|
| N1 | `lote-ordem` | `LoteModal.tsx:224` | contagem | ❌ domínio (`A ordem deve ser um inteiro ≥ 1.`) |
| N2 | `lote-quantidadeLimite` | `LoteModal.tsx:235` | contagem | ❌ domínio |
| N3 | `capacidade-nova` | `CapacidadeModal.tsx:142` | contagem | ⚠️ montada em `:86` e **suprimida** em `:152` pelo guard `capacidadeParseavel &&` |
| N4 | `config-capacidade` | `ConfigGeraisForm.tsx:162` | contagem | ❌ domínio (`configForm.ts:130`) |
| N5 | `kit-capacidade` | `KitEditor.tsx:427` | contagem | ✅ `KitEditor.tsx:262` (mas inalcançável pelo teclado) |
| N6 | `transicao-sku-qtd` | `EstoqueView.tsx:687` | contagem | ❌ genérica (`EstoqueView.tsx:648`) |
| N7 | `cupom-teto-uso` | `CupomModal.tsx:193` | contagem | ❌ domínio (`cupomForm.ts:189`) |
| N8 | `condicao-teto` | `ParceriaDetailPage.tsx:242` | contagem | ❌ **nenhuma** |
| N9 | `auto-offset` | `AutomacoesPage.tsx:330` | contagem | ❌ **nenhuma** — e o valor some calado (RS1-22) |
| N10 | `afiliado-janela` | `AfiliadoModal.tsx:291` | contagem | ❌ **nenhuma** |
| N11 | `afiliado-minimo` | `AfiliadoModal.tsx:299` | contagem | ❌ **nenhuma** |
| N12 | `afiliado-comissao-valor` | `AfiliadoModal.tsx:334` | **valor** | ❌ **nenhuma** |
| N13 | `repasse-valor` | `SolicitarRepasseModal.tsx:164` | **valor** | ✅ `solicitarForm.ts:85` (inalcançável pelo type — RS1-21) |

### O que o inventário corrige na premissa da fila

A fila diz "a mensagem do parser existe no código e nunca tem onde aparecer". Ela
existe em **quatro** dos dezoito (M2, M4, N5, N13) e é montada-e-suprimida em um
quinto (N3). Nos outros **treze** o parser nem chega a produzir mensagem: o motivo é
descartado e o campo mostra frase de domínio, frase genérica, ou nada.

Consequência para o aceite "caminho de exibição provado, campo a campo": trocar o
tipo do campo é necessário e **não é suficiente**. A lane também liga a mensagem do
parser em cada campo que não a tem, preservando a frase de domínio para o caso em que
o texto **é** legível e a faixa é que reprova.

## As frases, e de onde cada uma sai

Fonte: painel do dono, item PARSE-1, "As cinco, em ordem de peso"
(`git show eba43277^:leela-specs/01-produto/DECISOES-ABERTAS.md`, linhas 233-238),
que por sua vez cita `.nirvana/handoffs/leela-parse-REV.md` §"Para o dono".

| Item | Frase | Onde |
|---|---|---|
| 1 | `O ponto separa o milhar (1.234 = mil duzentos e trinta e quatro). Para centavos, use vírgula (1,23).` | embaixo de M1-M5 |
| 2 | *(não é frase — é a decisão de tela que vira a metade 1)* | os treze |
| 3 | `Ex.: 1.000` | campo de vaga (N2) |
| 4 | capacidade de kit em branco — **avisa** | N5 |
| 5 | `Sem preencher, a campanha sai 24 horas antes.` | N9 |

⚠️ **O item 4 é o único sem texto literal no registro.** O painel escreve o
diagnóstico (`Capacidade do kit em branco vale zero e a tela não avisa. Hoje "0"
significa tanto "sem kit disponível" quanto "não configurei"`) e manda avisar, sem
propor a frase. A lane compôs a frase **só com as palavras do próprio item** e a
declara aqui para veto barato: **`Em branco vale 0 (nenhum kit disponível).`**

## Achados para o maestro

1. **A régua sob cinco ou sob sete?** Depois da metade 1, `afiliado-comissao-valor` e
   `repasse-valor` (N12, N13) também passam a ser campo de dinheiro alcançável. O
   aceite diz **cinco** e é isso que a lane entrega; virar sete é acrescentar a mesma
   string em dois lugares.
2. **`CapacidadeModal:152` suprime a própria mensagem.** Defeito independente do
   `type="number"`: mesmo com o campo de texto, o guard `capacidadeParseavel &&`
   apagaria a mensagem exatamente quando ela existe.
3. **`auto-offset` com `0`** continua caindo no padrão de 24h. A frase aprovada fala
   do campo **vazio**; `0` é texto legível e o parser não tem o que recusar. Fica
   nomeado, não consertado (é a lane de automação, RS1-22).
4. **Dois dos cinco campos de dinheiro trocam de unidade.** `cupom-valor` e
   `condicao-valor` viram percentual quando o organizador escolhe "Percentual (%)",
   e a régua aprovada fala de milhar e de **centavos**. A frase continua verdadeira
   (o parser é o mesmo e lê a pontuação igual), mas soa deslocada num campo de "%".
   Não inventei variante: é uma string, e a decisão é do dono.

---

## O que mudou, campo a campo

### Metade 1 · o defeito (commit 1)

| # | Campo | O que mudou | Prova (arquivo · nome do teste) |
|---|---|---|---|
| M1 | `lote-preco` | frase do parser no lugar de "Preço inválido (use R$ ≥ 0)" para texto ilegível; a faixa fica com o negativo | `lotes/__tests__/LoteModal.test.tsx` · "preço no estilo en-US ensina a pontuação" · `_lib/__tests__/loteForm.test.ts` · "rejeita preço inválido" |
| M2 | `kit-preco` | nada (já tinha) | `kits/__tests__/KitEditor.test.tsx` · "preço no estilo en-US ensina a pontuação" |
| M3 | `cupom-valor` | frase do parser antes da frase de faixa | `pagina-vendas/_components/__tests__/CupomModal.test.tsx` · "desconto no estilo en-US…" |
| M4 | `repasse-comissao-valor` | nada (já tinha) | `clubes/influenciadores/__tests__/InfluenciadoresPage.test.tsx` · "PARSE-1 · é campo de TEXTO…" |
| M5 | `condicao-valor` | **mensagem nasceu** (antes: nenhuma) | `clubes/assessorias/__tests__/ParceriaDetailPage.parse.test.tsx` · "valor no estilo en-US…" |
| N1 | `lote-ordem` | `number` → `text`/`numeric` + frase do parser | `LoteModal.test.tsx` · "ordem ilegível acusa na ORDEM…" |
| N2 | `lote-quantidadeLimite` | idem | `LoteModal.test.tsx` · "vaga com pontuação torta…" e "…casa decimal…" |
| N3 | `capacidade-nova` | `number` → `text` **e** o guard que suprimia a frase caiu | `lotes/__tests__/CapacidadeModal.test.tsx` · "casa decimal na capacidade…" |
| N4 | `config-capacidade` | `number` → `text` + frase do parser | `configuracoes/_components/__tests__/ConfigGeraisForm.test.tsx` · "capacidade com casa decimal…" |
| N5 | `kit-capacidade` | `number` → `text` (frase já existia) | `KitEditor.test.tsx` · "capacidade com casa decimal acusa…" |
| N6 | `transicao-sku-qtd` | `number` → `text` + frase do parser | `kits/__tests__/DistribuicaoEstoque.test.tsx` · "casa decimal na quantidade…" |
| N7 | `cupom-teto-uso` | `number` → `text` + frase do parser | `CupomModal.test.tsx` · "limite de usos com casa decimal…" |
| N8 | `condicao-teto` | `number` → `text` + **mensagem nasceu** | `ParceriaDetailPage.parse.test.tsx` · "teto com casa decimal…" |
| N9 | `auto-offset` | `number` → `text` + **mensagem nasceu** | `comunicacao/__tests__/AutomacoesPage.parse.test.tsx` · "intervalo ilegível para de sumir calado" |
| N10 | `afiliado-janela` | `number` → `text` + **mensagem nasceu** | `afiliados/__tests__/AfiliadoModal.test.tsx` · "janela ilegível deixa de ser botão morto" |
| N11 | `afiliado-minimo` | idem | `AfiliadoModal.test.tsx` · "mínimo ilegível acusa no MÍNIMO…" |
| N12 | `afiliado-comissao-valor` | idem, com a frase de **dinheiro** | `AfiliadoModal.test.tsx` · "comissão em R$ no estilo en-US…" |
| N13 | `repasse-valor` | `number` → `text` (frase já existia, inalcançável) | `repasses/_components/__tests__/SolicitarRepasseModal.test.tsx` · "valor no estilo en-US…" |

Peça nova: `apps/painel/src/lib/mensagemDoParser.ts` (`mensagemDeValor` /
`mensagemDeContagem`), com teste próprio. Ela é a ponte, não um parser novo.

### Metade 2 · a calibragem (commit 2)

| Frase | Onde | Prova |
|---|---|---|
| régua do ponto e da vírgula | M1, M2, M3, M4, M5 — os **cinco** | um teste por tela, todos afirmando a constante e o `aria-describedby` |
| `Ex.: 1.000` | N2 (vaga do lote) | `LoteModal.test.tsx` · "a régua … e o exemplo de mil embaixo da vaga" |
| capacidade de kit em branco | N5 | `KitEditor.test.tsx` · "a régua fica embaixo do preço, e a capacidade em branco…" |
| intervalo padrão da automação | N9 | `AutomacoesPage.parse.test.tsx` · "o campo passa a dizer o que acontece quando fica vazio" |

As quatro moram em `apps/painel/src/lib/textosDeCampo.ts`, uma constante cada:
**trocar qualquer frase custa uma string**, que é a condição escrita do corte.

**Peça do DS, por reaproveitamento:** o `Input` ganhou o slot `hint`
(`packages/design-system/src/components/Input/Input.tsx`). O `Field` já tinha
`description` com essa função, mas `Field` é casca para controle **cru** — envolver
um `Input` nele renderiza duas labels. O `hint` usa o mesmo token
(`--text-tertiary`, par provado na matriz AA), o mesmo tamanho e o mesmo
`aria-describedby` do `Field`. Nenhuma moldura nova. Cinco testes no DS, incluindo
a ordem no DOM (a régua não se move quando a recusa aparece) e a cor por token.

## Baseline da colagem de planilha, medido ANTES de mexer

Inserção de uma vez só (o que a colagem faz), num `input type="number"` em jsdom:

| Colado | Vira |
|---|---|
| `1.000` | `1.000` ✅ |
| `1234` | `1234` ✅ |
| `1.234,56` | `""` ❌ **apaga** |
| `1234,56` | `""` ❌ |
| `1.234.567` | `""` ❌ |
| `99,90` | `""` ❌ |

É a medição que sustenta a metade do defeito: o caminho que a lane do parser dizia
estar coberto ("pelo colar o conserto já funciona") só vale para o texto **sem
vírgula**. Todo valor pt-BR com centavos era apagado em silêncio.

Cada campo tocado ganhou um teste `BASELINE colar de planilha`, e todos passam
depois da mudança. O caso do item 56 da história do parser — `1.500` lido como
R$ 1,50 — continua coberto pelos testes de milhar que já existiam
(`loteForm.test.ts`, `InfluenciadoresPage.test.tsx`), intocados.

## Gates

```
apps/painel        tsc --noEmit ................. 0
apps/painel        eslint src --max-warnings 0 ... 0
apps/painel        vitest run --maxWorkers=3 --minWorkers=1 (suíte INTEIRA)
                     antes do commit 1 ........... 213 arquivos · 2259 testes · 0 falhas
                     antes do commit 2 ........... 213 arquivos · 2266 testes · 0 falhas
packages/design-system  tsc --noEmit ............. 0
packages/design-system  eslint src --max-warnings 0  0
packages/design-system  vitest run (suíte INTEIRA)  69 arquivos · 1274 testes · 0 falhas
apps/landing       tsc --noEmit ................. 0  (consumidor do DS, não tocado)
```

`--maxWorkers=3` sozinho **não roda** neste repo: o pool reclama de
`minThreads/maxThreads` em conflito. O par correto é `--maxWorkers=3
--minWorkers=1`, que é o que o `test:gate` da landing já usava.

Sem emulator. Sem `--singleFork`. Sem `--amend` e sem `stash`; os dois commits
saíram por `git commit --only` com os caminhos nominais.

## O que ficou sem exercitar

- **Navegador real.** A medição de higienização é de jsdom. A conferência visual dos
  dezoito campos (e da régua embaixo dos cinco) **não foi feita** — não abro
  navegador sem validação prévia.
- **`EstoqueView`, anomalia de digitação no harness.** Digitar `25` no campo de
  quantidade pelo `userEvent.type` deixa `2`; digitar de novo acrescenta
  normalmente, e `fireEvent.change` (o que a colagem faz) funciona sempre. Não
  reproduz nas outras telas com o mesmo `Input` do DS. É anterior à lane — o teste
  que já existia lá digitava um caractere só e nunca tocou nisso. **Fica nomeado,
  não consertado**, e o teste do campo usa a inserção de uma vez.
- **Dicas montadas à mão que não migrei.** `CapacidadeModal` e `EstoqueView` têm
  `<span>` de dica próprio, em `font-size-xs`. Migrar para o `hint` do DS mudaria o
  tamanho da fonte de duas telas, o que é mudança visual fora do item. Ficam como
  candidatas, agora que a peça existe.
- **`TermsEditor`, `RetencaoEditor` e `politicaForm`** (RS1-23) continuam **fora**:
  são dinheiro e nunca passaram pelo parser, então não estão entre os dezoito. Campo
  apagado ali ainda grava taxa de 0%.
