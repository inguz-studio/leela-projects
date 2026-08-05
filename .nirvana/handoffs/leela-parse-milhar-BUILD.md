# FIX-PARSE-MILHAR · o separador de milhar cortava a contagem

- **Trace:** `leela-pixreal-diag-20260804` · **Lane:** FIX-PARSE-MILHAR (⚔ dinheiro e capacidade)
- **Employee:** sf-backend-engineer (software-forge) · retomada da lane parada em `73e2944a`
- **Commits:** `450a0734` (core, 5 arquivos, +573/−89) e `9af33b17` (painel, 14 arquivos, +328/−43). Pushed (`main`).
- **Território:** `packages/core/src/finance/**`, `packages/core/src/index.ts`, `apps/painel/**`. Nada em `apps/landing`, `packages/design-system`, `functions/**`, `firestore.rules`, `leela-specs/`.
- **Sem deploy** — o maestro sequencia. **Sem review antagonista ainda.**

## Veredito sobre o WIP que estava na árvore: a extração se sustenta

`pontuacaoPtBr.ts` estava untracked e `parseValorPtBr.ts` modificado para
consumi-lo. Conferi antes de seguir, e **segui por ela**. Três razões, na ordem
em que pesam:

1. **É refatoração pura, não mudança de comportamento.** Conferi ramo a ramo:
   os seis caminhos de `separarPtBr` devolvem exatamente os mesmos
   `(negativo, inteiro, fracao)` que os seis caminhos antigos passavam ao
   `montar`. Os 61 testes de dinheiro seguem verdes sem uma linha alterada, o
   que só é possível porque nada mudou de fato.
2. **A divergência que ela previne já existia no repositório.** O teto de usos
   estava implementado duas vezes e as duas discordavam: `"1e3"` era 1000 na
   assessoria (`Number`) e recusa no cupom do evento (`parseInt` + round-trip).
   Não é risco hipotético — é um defeito já materializado em duas telas.
3. **`temDecimal` é a peça que faltava, e só faz sentido compartilhada.** É o
   campo que deixa a contagem recusar `"1,000"` **pelo que a entrada é**, e não
   pelo valor que sobra. Sem ele, a contagem teria de reimplementar a regra de
   pontuação para distinguir mil de um — que é exatamente o que a extração veio
   impedir.

**A única ressalva, e ela é de endereço, não de conteúdo:** os três módulos
moram em `packages/core/src/finance/`, e estoque de camiseta e limite de vagas
não são finanças. Deixei onde estão de propósito: mover `parseValorPtBr.ts`
renomearia um arquivo commitado duas vezes nas últimas horas e sujaria a review
antagonista que vem agora. **Quando aparecer o terceiro parser de campo
digitado, a casa passa a ser `packages/core/src/entrada/`** e os três vão
juntos. Fica registrado como dívida de endereço.

## O defeito da contagem

`Number(s)` e `Number.parseInt(s, 10)` truncam o milhar de formas diferentes, e
as duas dão o mesmo resultado no caso que mais aparece:

```
Number("1.000")            → 1     e Number.isInteger(1) === true
Number.parseInt("1.500")   → 1     (para no ponto)
```

O 1 que sobra é um inteiro perfeitamente válido. Nenhuma guarda do painel tinha
como reprovar: `Number.isInteger` aprova, `>= 1` aprova, o kernel aprova. Num
campo de vaga isso abre **mil vezes menos lugares**, e o organizador descobre
quando o evento "esgota" no primeiro inscrito.

## A regra, e a linha onde as duas famílias se separam

A pontuação é a mesma (decisão do dono, `73e2944a`): vírgula é decimal, ponto é
milhar de três em três, e sem vírgula o tamanho do grupo final decide.
**Contagem é inteira**, então qualquer separador decimal é recusa de campo.

O par que justifica a recusa por tipo:

| Entrada | Dinheiro | Contagem |
|---|---|---|
| `1.000` | R$ 1.000,00 | **1000** |
| `1,000` | R$ 1,00 | **recusa `decimal`** |

Os dois textos têm os mesmos dígitos e significam mil vezes um ao outro. Não
existe leitura conservadora entre eles: qualquer default acerta metade das vezes
e erra a outra metade **calado**, que é o defeito de origem. Arredondar `"2,5"`
para 2 ou 3 seria a mesma decisão no escuro.

### Tabela final das duas famílias

| Entrada | `parseValorPtBr` | `parseContagemPtBr` |
|---|---|---|
| `1.000` | 100000 ¢ | **1000** |
| `1.234` | 123400 ¢ | 1234 |
| `12.345` / `1.234.567` | 1234500 / 123456700 ¢ | 12345 / 1234567 |
| `999.999` | 99999900 ¢ | 999999 |
| `1000` / `7` | 100000 / 700 ¢ | 1000 / 7 |
| `0` / `000` / `007` | 0 ¢ | 0 / 0 / 7 |
| `  1.000  ` / `1 000` / NBSP | 100000 ¢ | 1000 |
| `+7` / `-3` / `-1.000` | 700 / −300 / −100000 ¢ | 7 / −3 / −1000 |
| `-0` | 0 ¢ | **0** (`negativo: false`, nunca `-0`) |
| `1.234,56` | 123456 ¢ | **recusa `decimal`** |
| `99,90` / `2,5` / `0,5` | 9990 / 250 / 50 ¢ | **recusa `decimal`** |
| `1,000` | 100 ¢ | **recusa `decimal`** |
| `1.5` / `12.34` / `1.2345` | 150 / 1234 / 123 ¢ | **recusa `decimal`** |
| `1234,` / `,5` / `.5` | 123400 / 50 / 50 ¢ | **recusa `decimal`** |
| `0.500` | 50 ¢ | **recusa `decimal`** |
| `1,005` | 101 ¢ (half-up nos dígitos) | recusa `decimal` |
| `1.23.456` / `1..000` / `1,234.56` | recusa `agrupamento` | recusa `agrupamento` |
| `abc` / `1e3` / `1E3` / `--5` / `-` | recusa `formato` | recusa `formato` |
| `Infinity` / `NaN` / `1.000%` | recusa `formato` | recusa `formato` |
| `` / `   ` | recusa `vazio` | recusa `vazio` |
| `999.999.999` | 99999999900 ¢ | 999999999 (teto: 9 dígitos) |
| `1.000.000.000` | 100000000000 ¢ | **recusa `magnitude`** |
| `R$ 1.000` | 100000 ¢ | 1000 (quirk pinado — ver abaixo) |

**Quirk conhecido e pinado em teste:** a leitura de pontuação é compartilhada e
tira o `R$` antes de olhar os dígitos, então `parseContagemPtBr("R$ 1.000")`
devolve 1000. Campo de contagem não tem `R$` na tela; está no teste para que a
próxima leitura saiba que é conhecido, e não um buraco.

**Mudança de comportamento que vale registrar:** `"1e3"` era **1000** em
`assessoriaForm`, `configForm`, `CapacidadeModal` e `AfiliadoModal` (via
`Number`) e **1** em `loteForm` (via `parseInt`). Agora é recusa nos dois lados.
Ninguém digita vaga por exponencial, e a divergência era real.

## Os catorze consumidores trocados

| # | Arquivo:linha | Campo | Como lia | Guarda preservada |
|---|---|---|---|---|
| 1 | `eventos/lotes/_lib/loteForm.ts:454` | vaga (`quantidadeLimite`) | `parseInt` → 1 | inteiro ≥ 1 + `loteShapeValido` |
| 2 | `eventos/lotes/_lib/loteForm.ts:448` | `ordem` do lote | `parseInt` → 1 | inteiro ≥ 1 + `validarLotesModalidade` |
| 3 | `eventos/lotes/_lib/loteForm.ts:287` | prévia de capacidade | `parseInt` → 1 | ilegível cai no gravado |
| 4 | `eventos/lotes/CapacidadeModal.tsx:62` | capacidade do lote **com venda** | `Number` → 1 | `validarAjusteCapacidade` (kernel) |
| 5 | `eventos/pagina-vendas/_lib/cupomForm.ts:183` | teto de usos do cupom | `parseInt` + round-trip | inteiro ≥ 1, vazio = ilimitado |
| 6 | `clubes/assessorias/_lib/assessoriaForm.ts:176` | teto de usos (payload) | `Number` → 1 | ≥ 1, vazio = ilimitado |
| 7 | `clubes/assessorias/_lib/assessoriaForm.ts:153` | teto de usos (validação) | `Number` separado | agora chama a MESMA função do payload |
| 8 | `eventos/configuracoes/_lib/configForm.ts:68` | capacidade do evento (payload) | `Number` → 1 | inteiro > 0, vazio = `null` (RN-210) |
| 9 | `eventos/configuracoes/_lib/configForm.ts:129` | capacidade do evento (validação) | `Number` separado | agora chama a MESMA função do payload |
| 10 | `eventos/kits/KitEditor.tsx:248` | capacidade do kit | `parseInt` → 1, ilegível → **0 calado** | vazio segue 0; negativo segue válido |
| 11 | `eventos/kits/EstoqueView.tsx:646` | estoque (receber/encomendar) | `Number` → 1 | inteiro ≥ 0 |
| 12 | `eventos/afiliados/AfiliadoModal.tsx:123,149` | janela de atribuição (dias) | `Number` ×2 separados | inteiro 1..90 |
| 13 | `eventos/afiliados/AfiliadoModal.tsx:126,150` | mínimo de inscrições | `Number` ×2 separados | inteiro ≥ 1, vazio = `null` |
| 14 | `eventos/comunicacao/_lib/automacaoForm.ts:88` | offset em horas | `Number` → 1 | ≥ 1 + faixa 1..720 no core |

**Nenhuma guarda de domínio afrouxou.** Onde o parser recusa, a variável vira
`NaN` de propósito e a guarda que já existia continua sendo a régua de faixa.

### Três silêncios fechados junto

- **`KitEditor` gravava capacidade ZERO** para qualquer texto ilegível
  (`Number.isFinite(cap) ? cap : 0`). Um kit sem capacidade nenhuma, sem aviso.
  Agora acusa no campo, do mesmo jeito que o preço passou a acusar na lane de
  dinheiro. **Campo em branco segue valendo 0** — não mexi nesse contrato.
- **`assessoriaForm` validava por um parse e gravava por outro.** A discordância
  caía do lado ruim: `tetoUsoParaNumero` devolve `null` para texto ilegível, e
  `null` ali significa **cupom ILIMITADO**. Uma função só agora.
- **`configForm` tinha o mesmo par separado** na capacidade do evento. Mesma
  unificação.

### O que ficou de fora, e por quê

| Arquivo:linha | Campo | Por que não entrou |
|---|---|---|
| `plataforma/tenants/termos/TermsEditor.tsx:128` | `maxParcelas` | Família `plataforma/**`: a lane de dinheiro examinou e recomendou lane própria. O defeito lá é outro (`Number("") === 0` vira "taxa zero"), e mexer só na contagem deixaria o arquivo com duas réguas. |
| `eventos/configuracoes/_lib/politicaForm.ts:69` | `janelaArrependimentoDias`, `corteHoras`, `slaAnaliseDias`, janelas de troca/transferência | O helper `paraNumero` é **compartilhado com dinheiro** (`transferenciaTaxa`). Separar as duas semânticas exige os dois parsers e uma decisão sobre a taxa — que a lane de dinheiro deixou parada de propósito. |
| `clubes/_lib/desafioForm.ts:121` | `metaTotalPontos`, `minimoPorPilar`, `acoes[].meta` | Hoje aceita decimal por design (`Number.isFinite`, não `isInteger`). Tornar inteiro seria **regressão de produto**, não conserto: falta decidir se a meta de uma ação pode ser 2,5. |
| `plataforma/repasses/_components/RetencaoEditor.tsx:35,71` | retenção | Família `plataforma/**`, mesma razão da primeira linha. |
| `components/fields/DateField.tsx`, `crm/_lib/format.ts` | datas | Conversão de captura de regex, não de campo digitado. |

## Prova vermelho→verde

**O parser** (`apps/painel/src/lib/__tests__/parseContagemPtBr.test.ts`), rodado
antes do export no índice do core:

```
❯ vitest run src/lib/__tests__/parseContagemPtBr.test.ts
  Tests  24 failed | 1 passed (25)
  TypeError: parseContagemPtBr is not a function
```

O único que passou no vermelho é o que documenta o defeito antigo
(`Number("1.000") === 1`) — ele não precisa do parser para valer.

Depois do export + `tsup`:

```
  Test Files  1 passed (1)
       Tests  25 passed (25)
```

**Os consumidores**, com os testes novos escritos antes da troca:

```
❯ vitest run loteForm cupomForm assessoriaForm configForm automacaoForm
  Tests  10 failed | 107 passed (117)

  × "1.000" abre mil lugares, não um
      → expected 1 to be 1000
  × "1.000" é um teto de mil usos
  × "1.000" é um teto de mil usos nas duas leituras
  × "1.000" é capacidade para mil pessoas nas duas leituras
  × a prévia de "1.000" mostra mil — o mesmo número que será gravado
  × a ordem lê a mesma pontuação da vaga
  × casa decimal na vaga é recusa de campo, nunca arredondamento calado
  × a mesma pontuação do cupom do evento — as duas telas não divergem mais
  × "1.000" horas não vira 1 hora calada — bate na faixa e acusa
  × total com casa decimal cai no gravado
```

Depois da troca: `Tests 117 passed (117)`.

## Gates

```
packages/core   tsc --noEmit ................. 0
packages/core   eslint src --max-warnings 0 ... 0
packages/core   tsup ......................... build success (ANTES da suíte, nunca em paralelo)
apps/painel     tsc --noEmit ................. 0
apps/painel     eslint src --max-warnings 0 ... 0
apps/painel     vitest run (suíte INTEIRA) ... 199 arquivos · 2017 testes · 0 falhas
apps/landing    tsc --noEmit ................. 0  (consumidor do core, não tocado)
```

Sem `--singleFork`. Suíte inteira, não a vizinhança. `pnpm-workspace.yaml`
conferido limpo antes de cada commit (não sujou nesta rodada). `--amend` e
`stash` não foram usados; os dois commits saíram por `git commit --only` com o
`.nirvana/handoffs/leela-pixreal-diag-20260804-REV-5B.md` de lane antiga
seguindo staged e intocado.

## Para o dono: onde falta texto de ajuda na tela

1. ⚠️ **Todos os campos de contagem são `type="number"` — e isso limita o
   alcance do conserto.** O browser só entrega ao código um "número de ponto
   flutuante válido", o que **inclui `"1.000"`** (é o caminho de quem **cola**
   de uma planilha, onde mil sai formatado assim) e **inclui `"1e3"`**. Pelo
   teclado, em pt-BR, o Chrome pode higienizar a pontuação antes de o parser
   ver. Ou seja: **o conserto pega o caso da colagem com certeza, e o da
   digitação depende do browser.** A lane de dinheiro levantou a mesma questão
   e não uniformizou porque é decisão de UI com a lane do DS em voo — mantive a
   mesma postura. **Decisão que o dono precisa dar:** trocar os campos de
   contagem para `type="text" inputMode="numeric"`, como já são os de dinheiro.
   Sem isso, parte das mensagens novas é inalcançável.
2. **O campo de vaga não diz como se escreve mil.** A recusa nova ("A
   quantidade é um número inteiro, sem casas decimais. Para mil, escreva 1.000
   ou 1000.") só aparece **depois** do erro. Um `hint` permanente embaixo do
   campo — *"Ex.: 1.000"* — resolve antes.
3. **Capacidade do kit em branco vale 0, e a tela não avisa.** Preservei o
   comportamento (era o que estava lá), mas "0" pode significar tanto "sem kit
   disponível" quanto "não configurei". Vale uma decisão de produto e um texto.
4. **A capacidade do lote com venda ganhou mensagens que explicam.** Antes
   qualquer texto ilegível dizia "Informe uma capacidade inteira."; agora
   casa decimal e pontuação torta dizem o que fazer. Campo vazio segue com a
   frase antiga. Conferência visual pendente — não abri navegador.

## Vetores para a review antagonista

1. **A recusa de `"1234,"` (separador pendurado sem dígito depois).** O dinheiro
   aceita como 1234; a contagem recusa. Escolhi recusar para que a regra não
   tenha exceção — a recusa é por **tipo** de entrada, e um separador pendurado
   ainda é um separador. É a decisão mais discutível da lane. O contra é o
   usuário que digita e apaga.
2. **`"1e3"` deixou de ser 1000** em quatro telas que aceitavam. Ver acima.
3. **Escopo:** entraram `ordem` do lote, `offsetHoras` da automação e os dois
   campos do afiliado, que não estavam nomeados no brief. Entraram por serem
   contagem inequívoca, sem colisão com dinheiro e sem decisão de produto
   pendente. Ficaram fora os quatro da tabela "o que ficou de fora".
4. **`KitEditor` agora bloqueia o salvar** com capacidade ilegível, onde antes
   gravava 0. É mudança de comportamento visível — deliberada.
5. **Dívida de endereço:** três parsers de campo digitado morando em `finance/`.
6. **O teste do core segue morando na suíte do painel**, pela mesma razão da
   lane de dinheiro (o core não tem runner; `functions/src/__tests__` é
   território de outra lane). Ao mover, leve as duas tabelas juntas.
