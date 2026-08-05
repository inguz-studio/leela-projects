# FIX-PARSE-DINHEIRO · o separador de milhar cortava o valor no painel

- **Trace:** `leela-pixreal-diag-20260804` · **Lane:** FIX-PARSE-DINHEIRO (⚔ dinheiro)
- **Employee:** sf-frontend-lead (software-forge)
- **Commit:** `300aba61` — 19 arquivos, +758/−53. Pushed (`main`).
- **Território:** `apps/painel/**` + `packages/core/src/finance/` (o parser mora
  lá) + `packages/core/src/index.ts` (export). Nada em `packages/design-system`,
  `functions/**`, `firestore.rules`, `apps/landing` (só leitura) ou `leela-specs/`.
- **Sem deploy** — o maestro sequencia.

## O defeito

Oito leitores de valor liam dinheiro com `Number(texto.replace(',', '.'))`. Com
separador de milhar a troca não converte, ela **corta**:

```
"1.234,56"  →  "1.234.56"  →  parseFloat → 1.234  →  R$ 1,23
```

`Number("1.234.56")` é NaN, mas `parseFloat` para no segundo ponto e devolve
1.234 — um número perfeitamente finito, que passa por qualquer
`Number.isFinite`. Sete superfícies de dinheiro: preço de lote, preço de kit,
valor de cupom, comissão de afiliado, valor de repasse, condição de parceria e
solicitação de repasse. Nenhum erro, nenhum aviso, nenhum sintoma até a fatura.

## Onde o parser ficou, e por quê

`packages/core/src/finance/parseValorPtBr.ts`, exportado por `@leela/core`.

**Inventário antes de criar (regra permanente).** Varri o repositório inteiro
por helper de dinheiro:

| O que existe | Onde | Serve? |
|---|---|---|
| `roundMoney(number)` | `core/finance/calc.ts` | arredonda `number`, não lê texto |
| `parseMoney(ctx, campo, unknown)` | `core/pedidos/validacao.ts` | apesar do nome, é **validador**: lança se não for `number` |
| `isMoneyCentExato` | `core/affiliation/afiliado.ts` | predicado, não parser |
| `centavosFromReais` | `functions/payments/asaasProvider.ts` | server-only, `number→number` |
| `formatBRL` ×6 + `formatarPreco` | 7 arquivos do painel/landing | direção oposta (formatação) |
| `CurrencyInput` / máscara no DS | — | **não existe** |

**Não havia parser de texto para dinheiro em lugar nenhum do repositório.**
Reaproveitado: a convenção monetária do core (half-up, cent-exato,
`moneyCentExato`) e os predicados de domínio que cada tela já usava
(`valorCupomValido`, `validarSolicitacao`, `isComissaoAfiliadoValida`) —
nenhuma regra de dinheiro foi reimplementada. Criado: só o parser.

**Por que no core e não em `apps/painel/src/lib`:** o core já é a casa de 16
normalizadores de texto do usuário, incluindo `normalizarCodigoCupom`, que
normaliza **outro campo do mesmo formulário**. Um parser de dinheiro no painel
seria uma segunda autoridade monetária fora do core.

## A regra de ponto vs vírgula

1. **Com vírgula:** a vírgula é o decimal; o ponto é milhar e precisa estar
   agrupado de três em três (`1.234,56` ✓, `1.23,45` ✗, `1,234.56` ✗).
2. **Sem vírgula, grupo final ≠ 3 dígitos:** o ponto é decimal
   (`1234.56` → 1234,56). É o teclado numérico e o `String(kit.preco)` do editor.
3. **Sem vírgula, grupo final = 3 dígitos com agrupamento válido (`1.234`):**
   **RECUSA.**
4. **Dois ou mais pontos sem vírgula:** só pode ser milhar (`1.234.567`).

**A justificativa da recusa (3).** "1.234" é indecidível: mil duzentos e trinta
e quatro e um vírgula duzentos e trinta e quatro são leituras igualmente
legítimas, e a diferença entre elas é **mil vezes o valor**. Não existe escolha
conservadora entre duas leituras nessa distância — qualquer default acerta
metade das vezes e erra a outra metade **calado**, que é exatamente o defeito de
origem. Recusar devolve a decisão a quem digitou ao custo de um caractere:
"1.234,00" e "1234" passam sem ambiguidade nenhuma.

**Centavos saem dos dígitos, não do float.** `roundMoney` arredonda um `number`
que já perdeu a identidade decimal e compensa com EPSILON o que o binário
estragou; no boundary do texto os dígitos ainda estão inteiros. "1,005" dá
R$ 1,01 aqui e dava R$ 1,00 por `Math.round(n * 100)` (1.005 × 100 em double é
100.49999999999999). O erro é **intermitente** — "10,005" acerta pelos dois
caminhos — que é o motivo de nunca ter virado bug reproduzível.

**API:** `parseValorPtBr(texto)` devolve `{ ok, valor, centavos, centExato,
canonico }` ou `{ ok: false, motivo }`. `valor` é o decimal **exato** (sem
arredondar); `centavos` é o inteiro half-up. Campo de dinheiro usa
`centavos / 100`; percentual e guarda de sub-centavo usam `valor`.
`mensagemValorInvalido(motivo)` dá o texto de campo.

## Tabela de casos (56 testes · `apps/painel/src/lib/__tests__/parseValorPtBr.test.ts`)

| Entrada | Saída | Entrada | Saída |
|---|---|---|---|
| `1.234,56` | **123456 ¢** | `` (vazio) | erro `vazio` |
| `1234,56` | 123456 ¢ | `   ` | erro `vazio` |
| `1234.56` | 123456 ¢ | `R$` | erro `vazio` |
| `1.234.567,89` | 123456789 ¢ | `abc` | erro `formato` |
| `1234` | 123400 ¢ | `1e3` / `1E3` / `1e-3` | erro `formato` |
| `99,90` / `99.90` | 9990 ¢ | `Infinity` / `NaN` | erro `formato` |
| `12,5` | 1250 ¢ | `1,234,56` (2 vírgulas) | erro `formato` |
| `0` / `0,00` | 0 ¢ | `--5` | erro `formato` |
| `,56` / `.56` | 56 ¢ | `1.234%` | erro `formato` |
| `1234,` / `1.234,` | 123400 ¢ | `,` / `.` | erro `formato` |
| `  1.234,56  ` | 123456 ¢ | `1,234.56` (en-US) | erro `agrupamento` |
| `1 234,56` (espaço) | 123456 ¢ | `1.23,45` | erro `agrupamento` |
| `R$ 1.234,56` / `R$1.234,56` | 123456 ¢ | `1.2345,67` | erro `agrupamento` |
| `r$ 99,90` | 9990 ¢ | `1..234` | erro `agrupamento` |
| saída do `Intl` (NBSP) | 123456 ¢ | `999999999999999999,99` | erro `magnitude` |
| `+1234,56` | 123456 ¢ | **`1.234`** | **erro `ambiguo`** |
| `-1.234,56` | −123456 ¢ | **`1.500`** | **erro `ambiguo`** |
| `-5` | −500 ¢ | **`12.345`** | **erro `ambiguo`** |
| `99,999` | 10000 ¢ (half-up) | **`999.999`** | **erro `ambiguo`** |
| `1,005` | 101 ¢ (float dava 100) | `0.500` | 50 ¢ (zero à esquerda não é milhar) |
| `1,015` / `5,015` | 102 / 502 ¢ | `1234.567` | 123457 ¢ (`centExato: false`) |
| `10,005` | `valor` 10.005 preservado | `1234.5` | 123450 ¢ |

## Os oito consumidores trocados

| # | Arquivo | Como lê agora | Guarda preservada |
|---|---|---|---|
| 1 | `eventos/lotes/_lib/loteForm.ts` `parsePrecoReais` | `centavos/100` | negativo → `null` |
| 2 | `eventos/kits/KitEditor.tsx` `salvar` | `centavos/100` | negativo é VÁLIDO (RN-211) |
| 3 | `eventos/pagina-vendas/_lib/cupomForm.ts` `parseValorCupom` | fixo `centavos/100`, % `valor` | `valorCupomValido` do core |
| 4 | `eventos/afiliados/AfiliadoModal.tsx` `montarComissao` | fixo `centavos/100`, % `valor` | ilegível → `NaN` → `isComissaoAfiliadoValida` reprova |
| 5 | `eventos/repasses/_lib/solicitarForm.ts` `parseValorReais` | `centavos/100` | `validarSolicitacao` (RN-352/368) |
| 6 | `clubes/influenciadores/_lib/repasseForm.ts` `parseValorRepasse` | `valor` **cru** | RN-385: não arredonda, o core reprova a 3ª casa |
| 7 | `clubes/assessorias/_lib/assessoriaForm.ts` | `parseValorCondicao` | `valorCupomValido` |
| 8 | `clubes/assessorias/ParceriaDetailPage.tsx` | **o mesmo** `parseValorCondicao` | a validação e o submit tinham parses SEPARADOS; agora é um |

## Dois silêncios fechados junto (sem eles o conserto deixava botão morto)

- **`KitEditor`**: a recusa de preço ia para um estado (`erro`) que só era
  renderizado no campo de **nome**, e só com o nome vazio. Preço inválido =
  "Salvar kit" não fazia nada, sem mensagem. Agora tem `precoErro` no campo do
  preço, limpo a cada digitação. **Defeito pré-existente**, exposto pelo teste.
- **`avaliarRepasse` / `avaliarSolicitacao`**: texto ilegível caía no ramo
  "ainda digitando" e bloqueava sem hint. Agora só `vazio` fica calado; o resto
  vira `mensagemValorInvalido(motivo)`.

## Varredura por outros pontos (repo inteiro)

**Nenhuma outra ocorrência do mesmo defeito reachable.** O que apareceu:

- **`apps/landing`: limpo.** Zero campo de dinheiro digitável — todo valor do
  checkout vem da cotação do servidor. Só formatação (`formatarPreco`).
- **`packages/core`, `packages/design-system`, `functions`: limpos.** Só
  `Number()` sobre captura de regex, dígitos de CPF/CEP e token de CSS. O DS
  **não tem** componente de dinheiro nem máscara.
- **Família `plataforma/**` — defeito DIFERENTE, não é truncamento.**
  `TermsEditor.tsx` (`platformFeePct`, `saasMonthlyFee`, `jurosAoMes`,
  `parcelaMinima`), `taxaGlobalForm.ts`, `PlanoFormModal.tsx`,
  `ProvisionTenantModal.tsx`, `MarcaFormModal.tsx`,
  `AddPatrocinadorModal.tsx`, `politicaForm.ts` fazem `Number(string)` sem
  guarda. **Conferi o tipo dos campos: todos são `type="number"`**, então o
  browser higieniza "1.234,56" para `""` antes do código ver — não há
  truncamento silencioso ali. O risco residual é outro: **`Number("") === 0`**,
  ou seja, campo apagado vira "taxa zero" / "mensalidade zero", e
  `validateCommercialTerms` do core aceita zero como valor legítimo. Isso é
  lacuna de **validação**, não de parse, e a correção é uma decisão de UX de
  admin de plataforma. **Não toquei — recomendo lane própria.**
- **Truncamento em campos de CONTAGEM (não dinheiro, mesma classe).**
  `Number("1.000")` = 1 e `parseInt("1.000", 10)` = 1: `assessoriaForm.ts:133`
  e `:151` (teto de usos), `loteForm.ts:439` (limite de vagas),
  `KitEditor.tsx` (capacidade, e sem guarda de finito),
  `CapacidadeModal.tsx:52`, `EstoqueView.tsx:643`. Um teto de 1000 usos vira 1
  e passa no `Number.isInteger`. Precisa de um parser de **inteiro** irmão
  deste — **recomendo lane própria** (não é dinheiro, e a régua é outra).
- **A defesa que já existia e serve de molde:** `cupomForm.ts:174` rejeita
  qualquer entrada que o parser tenha reinterpretado, com
  `String(n) !== tetoBruto`.
- **`formatBRL` duplicado 6×** no painel + `formatarPreco` na landing. Não é
  defeito, é dívida; a casa do `formatBRL` único agora é óbvia (ao lado do
  parser).

## Gates

```
packages/core   tsc --noEmit ............ 0
packages/core   eslint src --max-warnings 0 ... 0
packages/core   tsup ..................... build success (antes da suíte, nunca em paralelo)
apps/painel     tsc --noEmit ............ 0
apps/painel     eslint src --max-warnings 0 ... 0
apps/painel     vitest run (suíte INTEIRA) ... 198 arquivos · 1969 testes · 0 falhas
apps/landing    tsc --noEmit ............ 0  (consumidor do core, não tocado)
```

Sem `--singleFork`. Suíte inteira, não só a vizinhança.

## Vetores para a review

1. **A recusa de `1.234` é a decisão a bater o martelo.** É a única mudança de
   comportamento visível para quem digita: antes salvava R$ 1,23 calado, agora
   pede a vírgula. Se o veredito for "adivinhe milhar", é uma linha em
   `parseValorPtBr` — mas aí a mesma adivinhação transforma `1,234` (um real e
   duzentos e trinta e quatro milésimos) em 1234.
2. **`type="number"` na comissão do afiliado** (`AfiliadoModal`) enquanto lote,
   kit, cupom e repasse usam `type="text" inputMode="decimal"`. Com `number` o
   parser é **inalcançável pelo teclado** (o browser higieniza antes) e o campo
   apaga sozinho em vez de explicar. Não uniformizei: é decisão de UI e a lane
   do DS está em voo.
3. **Teste do core morando na suíte do painel** (`src/lib/__tests__/`). A casa
   canônica é `functions/src/__tests__/`, território de outra lane hoje. Ganho
   colateral: exercita o core **buildado** (implementação + export + tsup).
   Ao mover, leve a tabela inteira.
4. **`montarComissao` virou export** do `AfiliadoModal.tsx` só para o teste de
   mesa, pelo motivo do item 2.
5. **Mudança de arredondamento em sub-centavo**: entradas com 3+ casas agora
   arredondam half-up sobre os dígitos. `1,005` → R$ 1,01 (era R$ 1,00). Mais
   correto, mas é um centavo mudando de lado em relação ao que estava em
   produção.
6. **`pnpm-workspace.yaml` sujo no worktree compartilhado**, com
   `'@sentry/cli': set this to true or false` — placeholder inválido escrito por
   um prompt de `pnpm`. Não é meu, não commitei, e **quebra install** se subir.
   Alguém precisa limpar.
7. **Trailer de autoria:** o brief pedia `Co-Authored-By: Claude Fable 5`; o
   commit saiu com **`Claude Opus 5`**, que é o modelo que de fato executou.
   Se a auditoria depende da string do brief, o próximo commit da lane corrige
   (⛔ `--amend` proibido nesta rodada).
