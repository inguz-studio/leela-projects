# REV-PARSE — review antagonista do parser de dinheiro e de contagem

Lane: REV-PARSE (contexto fresco) · trace `leela-pixreal-diag-20260804`
Sob review: `300aba61` · `73e2944a` · `450a0734` · `9af33b17`
Fix-commit desta review: **`41df2d7f`**

## Veredito

**APROVADO COM UM DEFEITO CORRIGIDO.** O núcleo dos quatro commits resiste ao
ataque: a tabela das duas famílias está correta em todos os casos que testei, a
extração de `pontuacaoPtBr` é provadamente pura, e o half-up sobre dígitos não
quebra em 100 mil casos. O defeito real não estava no parser — estava no
**outro lado do round-trip**, num campo que ninguém tocou.

**Seguro deployar** depois de `41df2d7f`. Ver "riscos que ficam" antes de subir.

## O defeito (corrigido em `41df2d7f`)

**Severidade: ALTA. Corrupção de dinheiro por fator 1000, silenciosa.**

Depois que `"1.234"` virou MILHAR (`73e2944a`), todo campo de dinheiro semeado
com `String(numero)` passou a se contradizer com o parser que o lê:

```
String(12.345) === "12.345"   →  parseValorPtBr  →  12345  (grupo final de 3)
```

Duas telas semeavam assim:

| Tela | Semente antes | Consequência |
|---|---|---|
| `KitEditor.tsx:88` | `String(kit.preco)` | abrir um kit de R$ 12,345 e salvar **sem tocar em nada** gravava **R$ 12.345,00** |
| `CupomModal.tsx:85` (ramo `percentual`) | `String(cupom.valor)` | reabrir um cupom de 12,345% e salvar era **recusado**: "Valor de desconto inconsistente com o tipo" |

Por que nada barrava no kit: `precoKitValido` só exige número **finito** (RN-211
admite negativo) e a Rule do kit só exige `preco is number` — **sem**
`moneyCentExato`, que o lote tem (`firestore.rules:1060`). Preço de três casas
**existe no acervo**: até `300aba61` esta tela gravava `Number.parseFloat(texto)`
cru, sem arredondar.

Por que o cupom aceita três casas: `valorCupomValido` (core) só exige
`0 < valor ≤ 100` no percentual, sem passo decimal.

O conserto é o que o `LoteModal:114` já fazia (`String(lote.preco).replace('.',
',')`): o campo nasce com **vírgula**. Com vírgula não existe leitura de milhar
possível. O ramo `fixo` do `CupomModal` já se protegia assim; só o `percentual`
vinha cru.

Testes: 5 novos (3 em `KitEditor.test.tsx`, 2 em `CupomModal.test.tsx`).
**Falsificados**: revertendo só as duas linhas de fonte, 4 dos 5 quebram.

## A tabela completa das duas famílias

Rodada contra o core **buildado** (`packages/core/dist`).
Contagem: `RECUSA(decimal)` = tinha separador decimal; contagem é inteira.

| entrada | DINHEIRO | CONTAGEM |
|---|---|---|
| `"1234"` | R$ 1.234,00 | 1234 |
| `"1234,56"` | R$ 1.234,56 | RECUSA(decimal) |
| `"1.234,56"` | R$ 1.234,56 | RECUSA(decimal) |
| `"1.234"` | R$ 1.234,00 | 1234 |
| `"1.000"` | R$ 1.000,00 | 1000 |
| `"1,000"` | R$ 1,00 | RECUSA(decimal) |
| **milhar múltiplo** | | |
| `"1.234.567"` | R$ 1.234.567,00 | 1234567 |
| `"1.234.567,89"` | R$ 1.234.567,89 | RECUSA(decimal) |
| `"12.345.678"` | R$ 12.345.678,00 | 12345678 |
| `"999.999.999"` | R$ 999.999.999,00 | 999999999 |
| `"1.000.000"` | R$ 1.000.000,00 | 1000000 |
| **grupo final ≠ 3 (decimal)** | | |
| `"1234.56"` | R$ 1.234,56 | RECUSA(decimal) |
| `"1.23"` | R$ 1,23 | RECUSA(decimal) |
| `"1.2"` | R$ 1,20 | RECUSA(decimal) |
| `"12.34"` | R$ 12,34 | RECUSA(decimal) |
| `"123.4"` | R$ 123,40 | RECUSA(decimal) |
| `"1234.5"` | R$ 1.234,50 | RECUSA(decimal) |
| `"1.2345"` | R$ 1,23 (valor 1.2345) | RECUSA(decimal) |
| `"12.3456"` | R$ 12,35 (valor 12.3456) | RECUSA(decimal) |
| `"1.0"` / `"1.00"` | R$ 1,00 | RECUSA(decimal) |
| `"1.0000"` | R$ 1,00 (centExato=false) | RECUSA(decimal) |
| **`R$`, espaço, NBSP** | | |
| `"R$1.234,56"` | R$ 1.234,56 | RECUSA(decimal) |
| `"R$ 1.234,56"` | R$ 1.234,56 | RECUSA(decimal) |
| `"r$1234"` | R$ 1.234,00 | 1234 |
| `"R$ 1.234,56"` (NBSP do Intl) | R$ 1.234,56 | RECUSA(decimal) |
| `"R$ 1.234"` | R$ 1.234,00 | 1234 |
| `" 1.234,56"` / `"1.234,56 "` | R$ 1.234,56 | RECUSA(decimal) |
| `"1 234,56"` (espaço como milhar) | R$ 1.234,56 | RECUSA(decimal) |
| `"1 234,56"` / `"1 234,56"` | R$ 1.234,56 | RECUSA(decimal) |
| **sinal** | | |
| `"-1.234,56"` | −R$ 1.234,56 | RECUSA(decimal) |
| `"+1.234,56"` | R$ 1.234,56 | RECUSA(decimal) |
| `"- 1.234,56"` | −R$ 1.234,56 | RECUSA(decimal) |
| `"--1"` / `"1-"` | RECUSA(formato) | RECUSA(formato) |
| `"R$ -10"` | −R$ 10,00 | −10 |
| `"-R$ 10"` | RECUSA(formato) | RECUSA(formato) ⚠️ assimetria |
| `"-0"` | R$ 0,00 (**centavos = `-0`**) ⚠️ | 0 (defende `-0`) |
| `"-0,004"` | R$ 0,00 (**centavos = `-0`**) ⚠️ | RECUSA(decimal) |
| **pontuação repetida / en-US** | | |
| `"1,2,3"` | RECUSA(formato) | RECUSA(formato) |
| `"1..234"` | RECUSA(agrupamento) | RECUSA(agrupamento) |
| `"1.234..567"` | RECUSA(agrupamento) | RECUSA(agrupamento) |
| `"1,234.56"` (en-US) | RECUSA(agrupamento) | RECUSA(agrupamento) |
| `"1.234.56"` | RECUSA(agrupamento) | RECUSA(agrupamento) |
| `"1.23,45"` / `"1,23.45"` | RECUSA(agrupamento) | RECUSA(agrupamento) |
| `"..5"` / `".,"` / `",."` | RECUSA(agrupamento) | RECUSA(agrupamento) |
| `"."` / `","` | RECUSA(formato) | RECUSA(decimal) ⚠️ motivo diverge |
| **separador pendurado** | | |
| `"1."` / `"1,"` | R$ 1,00 | RECUSA(decimal) |
| `",56"` / `".56"` | R$ 0,56 | RECUSA(decimal) |
| `",5"` / `".5"` | R$ 0,50 | RECUSA(decimal) |
| **exponencial e lixo** | | |
| `"1e3"` / `"1E3"` / `"1e-3"` | RECUSA(formato) | RECUSA(formato) |
| `"abc"` / `"12abc"` / `"10%"` | RECUSA(formato) | RECUSA(formato) |
| `"NaN"` / `"Infinity"` / `"1_000"` | RECUSA(formato) | RECUSA(formato) |
| `"R$"` / `"R$ "` | RECUSA(vazio) | RECUSA(vazio) |
| **zero à esquerda** | | |
| `"007"` | R$ 7,00 | 7 |
| `"0.500"` | R$ 0,50 | RECUSA(decimal) |
| `"0,500"` | R$ 0,50 | RECUSA(decimal) |
| `"00"` / `"0"` | R$ 0,00 | 0 |
| `"0,00"` | R$ 0,00 | RECUSA(decimal) |
| `"000.000"` | R$ 0,00 | RECUSA(decimal) |
| `"01.234"` | **R$ 1,23** (zero à esquerda não abre milhar) | RECUSA(decimal) |
| **vazio** | | |
| `""` / `"   "` / `" "` / `"\t"` | RECUSA(vazio) | RECUSA(vazio) |
| **magnitude** | | |
| `"999999999"` | R$ 999.999.999,00 | 999999999 |
| `"999999999999"` (12 díg.) | R$ 999.999.999.999,00 | RECUSA(magnitude) |
| `"9999999999999"` (13 díg.) | RECUSA(magnitude) | RECUSA(magnitude) |
| `"999.999.999.999,99"` | R$ 999.999.999.999,99 | RECUSA(decimal) |
| `"1.000.000.000"` / `"1000000000"` | R$ 1.000.000.000,00 | RECUSA(magnitude) |
| **centavos (half-up sobre dígitos)** | | |
| `"0,145"` | **R$ 0,15** (float dizia 0,14) | RECUSA(decimal) |
| `"1,005"` | **R$ 1,01** (float dizia 1,00) | RECUSA(decimal) |
| `"10,005"` | R$ 10,01 (float concorda) | RECUSA(decimal) |
| `"2,675"` | R$ 2,68 (float concorda) | RECUSA(decimal) |
| `"0,005"` | R$ 0,01 | RECUSA(decimal) |
| `"0,004"` / `"1,004"` / `"1,0049"` | arredonda para baixo | RECUSA(decimal) |
| `"1,006"` / `"1,0051"` | arredonda para cima | RECUSA(decimal) |
| `"1,995"` → R$ 2,00 · `"2,005"` → R$ 2,01 · `"8,015"` → R$ 8,02 | | RECUSA(decimal) |
| `"0,999"` → R$ 1,00 · `"1,9999"` → R$ 2,00 | | RECUSA(decimal) |
| `"-1,005"` → −R$ 1,01 · `"-0,145"` → −R$ 0,15 | | RECUSA(decimal) |
| **o que o dono digita sem pensar** | | |
| `"99,90"` / `"R$ 99,90"` | R$ 99,90 | RECUSA(decimal) |
| `"150"` / `"150,00"` | R$ 150,00 | 150 / RECUSA |
| `"1.500"` / `"1500"` / `"1.500,00"` | R$ 1.500,00 | 1500 / 1500 / RECUSA |
| `"2.500"` / `"5.000"` / `"10.000"` / `"100.000"` | milhar correto | idem |
| `"0,5"` / `"0,50"` / `"1,5"` | R$ 0,50 / R$ 0,50 / R$ 1,50 | RECUSA(decimal) |
| `"120"` / `"120,00"` | R$ 120,00 | 120 / RECUSA |
| **tipos hostis** (`null`, `undefined`, `123`, `{}`, `[]`, `NaN`, `true`) | RECUSA(formato), sem throw | idem |

**A linha declarada bate**: `1.000` → R$ 1.000,00 / 1000; `1,000` → R$ 1,00 /
recusa. Nenhuma entrada da tabela contradiz o cabeçalho dos módulos.

## Item 2 — a decisão do dono abriu buraco?

Não abriu buraco novo além do declarado, e a regra do grupo final é exata:

| digitado | lido | quem erra |
|---|---|---|
| `"1.23"` | R$ 1,23 | ninguém — grupo final 2 = decimal |
| `"1.2"` | R$ 1,20 | ninguém |
| `"12.34"` | **R$ 12,34** (não doze mil) | ninguém — grupo final 2 |
| `"1.234"` | R$ 1.234,00 | quem quis R$ 1,23 com 3 casas de teclado numérico |

**Onde a regra erra, exatamente**: só quando o grupo final tem **exatamente três
dígitos** e o primeiro grupo começa com 1–9. `"1.005"` vira R$ 1.005,00 e
`"0.500"` continua R$ 0,50 (zero à esquerda não abre milhar). O buraco tem
tamanho conhecido e é o que o dono aceitou.

**O que a decisão abriu e ninguém tinha visto**: o buraco não é de quem digita,
é de quem **relê**. É o defeito de `41df2d7f` acima — `String(12.345)` cai
exatamente no grupo final de três. A decisão do dono transformou uma semente de
formulário inofensiva numa corrupção de mil vezes.

## Item 3 — precisão em centavos: CONFIRMADO com número

Varredura de **100.000** entradas (`0,000` a `99,999`), comparando os dígitos
contra `Math.round(n*100)`:

- **quebras de half-up sobre os dígitos: 0 em 100.000.**
- **`Math.round(n*100)` errava em 572 de 100.000 (0,572%)** — o erro é
  intermitente exatamente como a lane declarou.
- Casos nomeados no brief: `0,145` → 15 (float 14 ✗) · `1,005` → 101 (float 100
  ✗) · `10,005` → 1001 (float concorda) · `2,675` → 268 (float concorda).
  Outros divergentes: `0,285`, `0,565`, `0,575`, `1,015`, `1,025`, `1,035`.

Half-up confirmado em todos, inclusive negativos (magnitude, não binário).

## Item 4 — os 22 consumidores

Nenhuma guarda de domínio regrediu. Conferido um a um:

| consumidor | guarda | preservada |
|---|---|---|
| `loteForm.parsePrecoReais` | recusa negativo (`valor < 0`) | ✅ |
| `loteForm` ordem / vaga | inteiro ≥ 1 via `Number.isInteger(NaN)` | ✅ |
| `loteForm.capacidadePrevista` | lê a mesma pontuação do submit | ✅ (era `parseInt`) |
| `CapacidadeModal` | `validarAjusteCapacidade` (kernel) | ✅ |
| `KitEditor` preço | negativo **válido** (RN-211) | ✅ (`lido.centavos` sem clamp) |
| `KitEditor` capacidade | vazio = 0; ilegível agora **acusa** | ✅ silêncio fechado |
| `EstoqueView` | inteiro ≥ 0 | ✅ |
| `cupomForm` valor | `valorCupomValido` (tipo↔valor) | ✅ |
| `cupomForm` teto | inteiro ≥ 1, vazio = ilimitado | ✅ (round-trip trocado por parser) |
| `assessoriaForm` valor | percentual usa `valor`, fixo usa `centavos` | ✅ |
| `assessoriaForm` teto | **uma função só** para validar e gravar | ✅ silêncio fechado |
| `configForm` capacidade | inteiro > 0, vazio = null (RN-210); **uma função só** | ✅ silêncio fechado |
| `AfiliadoModal` janela / mínimo | 1..90 e ≥ 1, ilegível → `NaN` → botão morto | ✅ |
| `AfiliadoModal` comissão | `isComissaoAfiliadoValida` (basis point / cent-exato) | ✅ |
| `repasseForm` (RN-385) | usa `lido.valor` **sem arredondar** | ✅ `10,005` segue reprovado |
| `solicitarForm` | usa `centavos/100` (arredonda de propósito) | ✅ divergência declarada |
| `automacaoForm` offset | ≥ 1 + faixa 1..720 no core | ⚠️ ver abaixo |

Os três silêncios que a lane diz ter fechado **de fato fecharam**: o
`Number.isFinite(cap) ? cap : 0` do `KitEditor` (capacidade zero calada), o
par validar-por-um / gravar-por-outro do `assessoriaForm` (`null` = **cupom
ilimitado**) e o mesmo par no `configForm`.

### ⚠️ Achado MÉDIO não corrigido — alegação falsa em `automacaoForm`

`automacaoForm.ts:88` diz no comentário: *"Fora da faixa o campo continua saindo
do input, e o core acusa."* **Não acusa.** Quando o texto é ilegível ou o valor
é `< 1`, `base.offsetHoras` fica **ausente**, e `validarAutomacao` só valida
`offsetHoras` quando `!== undefined`:

```
validarAutomacao({gatilho:'vespera_evento', templateRef:'t1', canal:['email'], ativa:true})
  →  []          // nenhum erro
```

A automação salva com o **default de 24h**, calada. Digitar `0` no campo
produz isso. **Não é regressão desta lane** (o `Number(...)` anterior tinha a
mesma forma) e o caso `> 720` **é** acusado corretamente, mas a alegação do
comentário é falsa e vale corrigir numa lane de automação.

## Item 5 — os que ficaram de fora

Ficaram **por razão declarada** (handoff `leela-parse-milhar-BUILD.md`, linhas
147–150), não por esquecimento. **Mas a premissa "nenhum deles é caminho de
dinheiro" é FALSA — três dos quatro são:**

| arquivo | é dinheiro? | razão declarada | veredito |
|---|---|---|---|
| `TermsEditor.tsx` | **SIM** — `platformFeePct`, `saasMonthlyFee`, `jurosAoMes`, `parcelaMinima`, `fixoCentavos` | família `plataforma/**`, defeito é outro (`Number("") === 0`) | razão válida, **mas é dinheiro**; ainda usa `Math.round(Number(x)*100)`, o float que esta lane removeu em toda parte |
| `RetencaoEditor.tsx` | **SIM** — retenção % de repasse | família `plataforma/**` | razão válida; **guardado** (`Number.isFinite` + 0..100 + vazio recusado) |
| `politicaForm.ts` | **SIM** — `transferenciaTaxa` | `paraNumero` é compartilhado com contagem; separar exige decisão sobre a taxa | razão válida; guardado pelo kernel (`validarPoliticaVendas` reprova `NaN`) |
| `desafioForm.ts` | não | aceita decimal por design; tornar inteiro seria regressão de produto | razão válida |

**Risco vivo em `TermsEditor` (não é desta lane, mas é dinheiro):**
`Number("") === 0`, então campo apagado grava **taxa 0% / mensalidade R$ 0** e
`validateCommercialTerms` aceita zero como legítimo. A lane declarou e não
tocou. Concordo com não tocar aqui; **mas isso precisa de lane própria antes de
qualquer negociação comercial nova.**

## Item 6 — `type="number"`: o número

**13 de 18 campos DOM** que carregam mensagem do parser são `type="number"` — a
mensagem nova é **inalcançável pelo teclado** (o browser higieniza antes) e o
campo apaga sozinho em vez de explicar. Pelo **colar** (planilha) o conserto
funciona: `"1.000"` é um "floating-point number válido" e chega inteiro ao
parser.

**Contagem — 11 de 11 campos são `type="number"`** (a lane declarou certo):
`LoteModal` ordem · `LoteModal` vaga · `CapacidadeModal` · `CupomModal` teto ·
`ParceriaDetailPage` teto · `ConfigGeraisForm` capacidade · `KitEditor`
capacidade · `EstoqueView` estoque · `AfiliadoModal` janela · `AfiliadoModal`
mínimo · `AutomacoesPage` offset.

**Dinheiro — 2 de 7 campos são `type="number"`:**
- `AfiliadoModal:336` comissão — **declarado** pela lane.
- `SolicitarRepasseModal.tsx:166` `repasse-valor` — **NÃO declarado**. O handoff
  de dinheiro afirma que *"lote, kit, cupom e repasse usam `type="text"
  inputMode="decimal"`"*. Existem **dois** modais de repasse: o do
  influenciador (`InfluenciadoresPage:345`, `type="text"` ✅) e o do organizador
  (`SolicitarRepasseModal`, `type="number"` ❌). A lane conflacionou os dois.
  Consequência: o silêncio que `300aba61` diz ter fechado ("o botão morria sem
  dizer por quê") **segue aberto** nesse modal — texto ilegível vira `""`, cai
  em `motivo === 'vazio'`, e o hint continua `null`.

Os 5 campos alcançáveis: `LoteModal` preço · `KitEditor` preço · `CupomModal`
valor · `ParceriaDetailPage` valor · `InfluenciadoresPage` repasse.

**Dívida nomeada, não resolvida aqui** (é decisão de UI, lane do DS em voo).

## Item 7 — a extração `pontuacaoPtBr` é refatoração pura?

**SIM, e provado por diferencial, não por teste.**

Comparei `parseValorPtBr` em `73e2944a` (antes) contra `HEAD` (depois) sobre
**177.169 entradas**: varredura exaustiva de todas as strings de até 5
caracteres sobre o alfabeto `0 1 5 9 . , - + espaço R $`, mais um corpus
dirigido de casos longos. Comparei `valor`, `centavos` (distinguindo `-0`),
`centExato`, `canonico` e o `motivo` da recusa.

```
corpus=177169   divergentes=0
```

Ramo a ramo o código é literalmente o mesmo texto movido de arquivo — o `git
diff` só troca o corpo de `parseValorPtBr` por três linhas que delegam a
`separarPtBr`. `450a0734` **não tocou** `parseValorPtBr.test.ts`, então a
alegação "os 61 testes seguem verdes sem alteração" é literal.

**E a pergunta debaixo dela** — "isso não é porque os testes não cobrem o ramo
mudado?" — fica respondida por cima: mesmo que os testes não cobrissem nada, o
diferencial de 177 mil entradas cobre. Para o registro, os 61 testes **não**
cobrem `-0`, `"01.234"`, `"000.000"` nem `0,145`; cobrem `1,005`, `1,015`,
`5,015`, `99,99x` e a comparação explícita contra o float.

## O não declarado que cacei

1. **O defeito de `41df2d7f`** — corrigido. É o não declarado principal: a
   decisão do dono virou corrupção de dinheiro pelo lado da semente.
2. **`SolicitarRepasseModal` é `type="number"`** — contradiz o handoff.
3. **`automacaoForm`: "o core acusa" é falso.**
4. **`parseValorPtBr` vaza `-0`** (`centavos: -0`, `valor: -0`, `canonico:
   "-0"`), enquanto `parseContagemPtBr` **defende explicitamente** contra isso e
   documenta por quê ("para não vazar num payload e voltar como `-0` de um
   documento"). Assimetria entre irmãos. **Impacto real hoje: baixo** — o
   callable serializa em JSON e `JSON.stringify(-0) === "0"`, então o `-0` não
   chega ao doc; `loteForm.parsePrecoReais` deixa passar porque `-0 < 0` é
   `false`. Não consertei: mexer em `montar()` sem necessidade numa review de
   dinheiro custa mais do que vale. **Nomeado como dívida.**
5. **`"-R$ 10"` é recusado e `"R$ -10"` é aceito** — o strip de moeda acontece
   antes do strip de sinal. Cosmético, nomeado.
6. **`"."` e `","` divergem no motivo** entre as famílias (dinheiro:
   `formato`; contagem: `decimal`). A mensagem da contagem ("A quantidade é um
   número inteiro, sem casas decimais") é estranha para quem digitou só um
   ponto. Cosmético.
7. **Endereço dos módulos (`finance/` abrigando estoque de camiseta)**: conferi
   acoplamento real além do nome. **Não há.** `parseContagemPtBr` importa só
   `./pontuacaoPtBr`; `pontuacaoPtBr` não importa nada. Nenhum dos três toca
   `calc.ts`, `repasse.ts` ou `taxaPlataforma.ts`. É dívida de **nome**, não de
   dependência — a lane classificou certo.

## Gates

```
packages/core   tsc --noEmit ................... 0
packages/core   eslint src --max-warnings 0 .... 0
packages/core   tsup ........................... build success (ANTES da suíte, nunca em paralelo)
apps/painel     tsc --noEmit ................... 0
apps/painel     eslint src --max-warnings 0 .... 0
apps/painel     vitest run (suíte INTEIRA, baseline) ... 199 arquivos · 2025 testes · 0 falhas
apps/painel     vitest run (suíte INTEIRA, pós-fix) .... 199 arquivos · 2030 testes · 0 falhas
```

Sem `--singleFork`. Suíte inteira nas duas rodadas.

**Drift da base declarada**: o brief dizia 199/**2017**; a base real é
199/**2025**. Os +8 vieram de lanes posteriores ao parse (`3fdfb6f5` alertas +
OverviewDashboard, `2332bebb` RootShell + Countdown), não de teste fantasma.
Conferido por `git log 9af33b17..HEAD~1 --stat`.

`pnpm-workspace.yaml` **conferido limpo** antes e depois do commit; não sujou
nesta rodada e não foi commitado. `--amend` e `stash` não foram usados; o commit
saiu por `git commit --only` com os 4 arquivos, e o
`.nirvana/handoffs/leela-pixreal-diag-20260804-REV-5B.md` de lane antiga segue
**staged e intocado**.

## É seguro deployar?

**Sim, depois de `41df2d7f`.** Sem ele, qualquer organizador que abrisse um kit
com preço de três casas e salvasse gravaria mil vezes o valor, sem erro.

Antes de subir, duas coisas que **não** bloqueiam o deploy mas precisam de
decisão:

- **Inventário do acervo.** Não sei quantos kits e cupons reais têm três casas
  decimais — isso precisa de leitura de produção, que esta review não faz. O
  conserto impede a corrupção **daqui para frente**; os docs que já foram
  corrompidos entre `73e2944a` e `41df2d7f` (janela de ~3 horas) só aparecem
  numa varredura. **Recomendo rodar a varredura antes do deploy**, é barata.
- **`TermsEditor`** segue com `Number("") === 0` num caminho de dinheiro.

## Para o dono: onde falta texto de tela

1. **Campo de dinheiro precisa dizer como o sistema lê o ponto.** A decisão de
   `"1.234"` = mil está tomada e o custo está declarado, mas hoje ele mora só no
   cabeçalho de um arquivo `.ts`. O organizador que usa teclado numérico e
   escreve três casas grava mil vezes mais e não é avisado em lugar nenhum.
   **Texto sugerido, embaixo dos 5 campos de dinheiro alcançáveis:** *"O ponto
   separa o milhar (1.234 = mil duzentos e trinta e quatro). Para centavos, use
   vírgula (1,23)."*
2. **Campo de vaga não diz como se escreve mil** (já levantado pela lane).
   `hint` permanente *"Ex.: 1.000"*, em vez de mensagem só depois do erro.
3. **Capacidade do kit em branco vale 0 e a tela não avisa** (já levantado).
   "0" significa tanto "sem kit disponível" quanto "não configurei".
4. **Decisão de UI que destrava 13 campos:** trocar contagem e os 2 campos de
   dinheiro restantes de `type="number"` para `type="text" inputMode="numeric"`.
   Sem isso, boa parte das mensagens novas nunca aparece.
5. **Offset da automação:** valor ilegível ou `0` salva 24h calado. A tela
   precisa dizer *"Sem preencher, a campanha sai 24 horas antes."* ou recusar.

## O que NÃO consertei, e por quê

- **`-0` no dinheiro** — impacto real nulo hoje (JSON normaliza); mexer no
  `montar()` numa review de dinheiro custa mais do que vale.
- **`type="number"`** — decisão de UI, lane do DS em voo. Nomeado com número.
- **`automacaoForm`** — o comentário mente, o comportamento é pré-existente;
  corrigir a alegação é lane de automação, não de parse.
- **`TermsEditor` / `plataforma/**`** — a lane recomendou lane própria e
  concordo; mexer só na leitura deixaria o arquivo com duas réguas.
- **`"-R$ 10"`, motivo de `"."`** — cosméticos, sem caminho de dinheiro.
