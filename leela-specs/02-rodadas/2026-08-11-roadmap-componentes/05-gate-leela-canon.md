# Gate `leela-canon` — a trava que reprova controle cru fora do design system

> Paga **S005-T5** do épico `LEELA-E01-design-system`. Fecha o furo que a L-021 nomeou: o
> projeto tinha gate de marca (`leela-tokens`), gate de rolagem (`leela-scroll`) e gate de
> fronteira (`leela-auth`), e nenhum deles julgava **procedência do componente**.

## 1. O que este gate existe para impedir

Não é o defeito de hoje. O inventário mede o defeito de hoje e as ondas o pagam. Este gate existe
para impedir **a próxima instância**, escrita daqui a três semanas por alguém que não leu o
inventário nem a governança, num arquivo que ninguém está revisando com o cânone na mão.

O precedente do projeto é literal e vale citar, porque foi escrito para a mesma classe de problema:

> "Eram **dezessete** campos de senha em nove arquivos, nos dois apps. O décimo oitavo será
> escrito por alguém que não leu nenhum dos outros — e é ele que esta regra pega."
> — `leela-auth-plugin.mjs`, regra `senha-fora-do-ds`

`leela-canon` é a generalização de `senha-fora-do-ds`: onde aquela regra trava um controle
(`<input type="password">`), esta trava a **família inteira** dos controles nomeados no cânone.

## 2. Onde ele entra na infraestrutura que já existe

Nada de novo é inventado. O projeto tem duas formas de gate, e este usa as duas, cada uma para o
que ela sabe fazer.

| Forma | Onde vive | O que ela julga bem | Exemplo vigente |
|---|---|---|---|
| Regra ESLint (plugin flat config) | `packages/design-system/lint/*-plugin.mjs`, ligada em `eslint.config.mjs` da raiz | fato sintático local, com zero ambiguidade e mensagem que ensina | `leela-tokens/no-hardcoded-tokens`, `leela-scroll/no-scroll-de-um-eixo`, `leela-auth/senha-fora-do-ds` |
| Script executável (`.mjs` com contador) | `scripts/` ou `apps/*/scripts/` | agregado do repositório, contagem, catraca que só desce | `apps/landing/scripts/verify-brand-fonts.mjs` |

A divisão de trabalho abaixo segue essa fronteira, e ela é deliberada: **o que é ambíguo não vira
erro de lint.** Uma regra que dispara falso positivo é desligada em duas semanas, e um gate
desligado é pior que gate nenhum, porque ele mente sobre a cobertura.

## 3. Regra 1 · `leela-canon/controle-cru-fora-do-ds`

**Severidade:** `error`. Zero ambiguidade, zero falso positivo esperado.

### O que ela barra

Elemento intrínseco de JSX que **é** um controle com componente canônico publicado no DS:

| Elemento cru | Componente canônico | Mensagem sugere |
|---|---|---|
| `<select>` / `<option>` | `Select` (baixa cardinalidade) ou `Combobox` (busca/alta cardinalidade) | os dois, com o critério de escolha |
| `<textarea>` | `Textarea` | — |
| `<input type="checkbox">` | `Checkbox` | — |
| `<input type="radio">` | `Radio` / `RadioGroup` / `RadioCard` | — |
| `<input type="date">` / `datetime-local` / `month` / `week` / `time` | `DatePicker` / `DateRangePicker` / `Calendar` | o calendário do sistema operacional é proibido pela governança §8 |
| `<input type="file">` | `FileInput` | — |
| `<input type="search">` | `SearchInput` | — |
| `<input type="password">` | `InputSenha` | delegado à `leela-auth/senha-fora-do-ds`, que já existe — a regra nova não duplica |
| `<input>` sem `type` ou com `type` textual (`text`, `email`, `tel`, `number`, `url`) | `Input` (ou `Field` quando há rótulo e validação) | — |
| `<dialog>` | `Modal` / `ConfirmModal` / `Dialog` / `Drawer` | — |
| `<details>` / `<summary>` | não há canônico — vira finding de processo (ver §5) | — |

### O que ela não barra

- Qualquer arquivo dentro de `packages/design-system/src/components/**`. O DS **precisa** do
  elemento cru: é ele que constrói o primitivo. Esta é a mesma exceção que `senha-fora-do-ds`
  já declara ("o design system precisa do `<input type="password">` cru para construir o
  `InputSenha`").
- `**/__tests__/**` e `**/*.test.tsx`. Um teste que renderiza `<select>` para provar que a tela
  **não** tem um afirma um fato, não declara UI.
- `**/*.stories.tsx`. Story de composição pode montar um contraexemplo.
- `apps/mobile/**`. React Native não tem esses elementos; a adoção mobile é pendência já
  registrada na governança §2.
- `<button>`. Deliberadamente fora, e a razão está na §4.

### Opção de configuração

```js
'leela-canon/controle-cru-fora-do-ds': ['error', {
  permitidos: [],          // elementos liberados neste bloco de config (vazio por padrão)
  arquivosDeExcecao: [],   // paths com ADR de exceção registrado (ver §6)
}]
```

`arquivosDeExcecao` é a **porta única** da governança §8 materializada em código: entrar nela
exige editar `eslint.config.mjs`, e a linha aparece sozinha no diff da revisão. É o mesmo
mecanismo que `leela-auth/rota-fora-da-fronteira` usa para abrir rota ao anônimo, e ele funcionou:
a decisão para de se esconder na indentação de um arquivo de tela.

## 4. Por que `<button>` fica fora da regra dura

`<button>` é o caso em que uma regra ingênua destrói a própria credibilidade. Ele aparece
legitimamente em três lugares que a análise sintática local não distingue de uma violação:

1. `asChild` do Radix — o Trigger de `Popover`, `DropdownMenu`, `Tooltip` e `Tabs` renderiza um
   botão por baixo, e o DS depende disso.
2. Alvo de clique que não é botão de ação (célula clicável, card inteiro navegável, item de
   lista) — semanticamente correto, e nenhuma variante de `Button` serve.
3. Botão-ícone dentro de composição, onde `IconButton` seria peso morto.

A violação real é a quarta: um `<button>` com `className` que **replica uma variante do
`Button`** — altura, raio, cor de ação, estado hover. Isso é reconhecível por assinatura de
classe, não por sintaxe, e assinatura de classe é exatamente onde falso positivo nasce.

Decisão: `<button>` entra no **script de varredura** (§7) como contagem com catraca, não como erro
de lint. A lane HIFI-REC-FIX já pagou uma instância dessa família por revisão humana (`CtaV3`
migrado para `Button`, commit `11c1e4c7`), o que confirma o diagnóstico: o caso é achável, mas
por leitura, não por regex.

## 5. Regra 2 · `leela-canon/padrao-reimplementado-fora-do-ds`

**Severidade:** `error`. Julga o segundo mecanismo da L-021, o mais caro: a re-implementação
batizada.

### O que ela barra

Declaração de componente (função ou `const` com JSX) **fora de `packages/design-system/src/`**
cujo nome colide com um export canônico do barrel `@leela/design-system`, ou com um sinônimo
reconhecido do mesmo padrão.

```js
'leela-canon/padrao-reimplementado-fora-do-ds': ['error', {
  canone: [ /* gerado do barrel — ver abaixo */ ],
  sinonimos: {
    Select:   ['Dropdown', 'DropdownSelect', 'Picker', 'Seletor'],
    Combobox: ['Autocomplete', 'SelectSearch', 'BuscaSelect'],
    Modal:    ['Overlay', 'Popup', 'Lightbox'],
    Card:     ['Cartao', 'Painel', 'Box', 'Surface', 'Tile'],
    Table:    ['DataTable', 'Tabela', 'Grid'],
    EmptyState: ['Vazio', 'SemDados', 'NoData'],
    Toast:    ['Notificacao', 'Snackbar', 'Alert'],
    Tooltip:  ['Hint', 'Dica'],
  },
}]
```

O nome do arquivo não é evidência suficiente e a regra não o usa: `KitCard.tsx` que **compõe**
`Card` do DS é o comportamento desejado. O que a regra pega é a **declaração** de um componente
chamado `Card`, `Dropdown` ou `Modal` fora do DS — o batismo que faz a duplicata parecer oficial.

### A fonte do cânone não é uma lista escrita à mão

Uma lista copiada envelhece na primeira semana e passa a mentir. A opção `canone` é gerada de
`packages/design-system/src/index.ts` por um passo do próprio gate (§7, camada A), e a regra
**falha** se a lista configurada divergir do barrel. O cânone do lint e o cânone do DS não podem
se separar em silêncio: essa separação é o defeito que a L-021 descreve, um nível acima.

## 6. Finding de processo · padrão sem cânone

A L-021 é explícita: padrão sem componente canônico declarado é finding de **processo**, nunca
silêncio. Traduzido em gate:

Quando um padrão aparece no código e **não** tem componente canônico no DS (hoje: layout
composto — bento, grid, slot, section, surface —, e `<details>`/acordeão), o gate não reprova a
tela. Ele reprova a **ausência de decisão**: o script da §7 lista o padrão órfão e aponta para o
item aberto no painel do dono. Enquanto a decisão não voltar, a instância nova é permitida e
contada; quando ela voltar, o padrão migra para a Regra 1 ou 2 e a contagem vira catraca.

Isto é o que impede o gate de virar bloqueio de trabalho por um vazio que só o dono pode fechar.

## 7. Script `scripts/gate-canon.mjs` — a catraca

Molde: `apps/landing/scripts/verify-brand-fonts.mjs` (duas camadas, contador `failures`, saída
`✓`/`✗`, CI-safe sem servidor).

**Camada A · integridade do cânone.** Lê `packages/design-system/src/index.ts`, extrai os exports
de componente, compara com `leela-specs/03-canon/canone-de-componentes.md` (a tabela promovida
pelo documento `03` desta rodada) e com a opção `canone` do `eslint.config.mjs`. Divergência entre
os três = falha. Componente novo no DS sem linha no cânone = falha, e é essa checagem que mantém o
mapa vivo sem depender de ninguém lembrar.

**Camada B · catraca das classes ambíguas.** Conta, por app e por padrão, as ocorrências que a
regra dura não julga sem ambiguidade:

| Contagem | O que ela mede |
|---|---|
| `superficie-crua` | `<div>`/`<section>`/`<article>` com a assinatura raio + fundo + espaçamento fazendo papel de cartão |
| `botao-cru-estilizado` | `<button>` com `className` que replica variante do `Button` |
| `receita-de-grid` | assinaturas distintas de `grid-cols-*` (mede a ausência de cânone de layout, §6) |
| `padrao-orfao` | instâncias de padrão sem canônico declarado |

O número de cada contagem vive em `scripts/gate-canon.baseline.json`, versionado. **Subir reprova;
descer atualiza o arquivo no mesmo commit.** A catraca é o que torna o inventário desta rodada um
ativo que não apodrece: cada onda derruba o número e o número não pode voltar.

Uso:

```
node scripts/gate-canon.mjs              # verifica contra o baseline
node scripts/gate-canon.mjs --atualizar  # regrava o baseline (só quando desceu)
node scripts/gate-canon.mjs --relatorio  # lista arquivo:linha de cada contagem
```

## 8. Testes da regra

Molde: `packages/design-system/lint/__tests__/leela-scroll-plugin.test.mjs` (`RuleTester` do
ESLint sob vitest). O padrão da casa é que **cada caso de teste é um vetor de reincidência real**,
não um exemplo inventado. Os casos inválidos saem do inventário desta rodada, com o arquivo de
origem citado no comentário; os casos válidos saem das composições legítimas que a regra não pode
barrar (Trigger com `asChild`, o cru dentro do DS, o teste que afirma classe, a exceção do
ADR-017).

Cobertura mínima para a regra nascer: um caso inválido por linha da tabela da §3, um caso válido
por item da lista "o que ela não barra", e um caso que prova a §5 (o `KitCard` que compõe `Card`
passa; um `Card` declarado fora do DS reprova).

## 9. Como o gate entra em vigor sem parar o trabalho

Três passos, nesta ordem. Ligar a regra dura antes do passo 2 quebraria o build do repositório
inteiro no primeiro `pnpm lint`, e um gate que nasce vermelho é desligado no mesmo dia.

1. **Nasce como `warn`, com o relatório completo.** O número inicial é o do inventário. Ninguém é
   barrado; o custo fica visível.
2. **As ondas do documento `04` derrubam o número.** Cada onda fecha com o relatório atualizado
   como prova, ao lado da prova renderizada.
3. **Vira `error` quando a contagem da Regra 1 chega a zero.** Regra 2 e as catracas do script
   viram `error` junto. A partir daí, entrar exige a porta única: ADR com contexto, critérios
   ordenados e a11y provada, e a linha em `arquivosDeExcecao` aparecendo no diff.

## 10. O que muda fora do código

O gate determinístico é metade da L-021. A outra metade é de planejamento, e ela não é
verificável por script:

- **`definition-of-done.md`, DoD de Tela** ganha uma linha. Hoje o DoD cobre só o caso de seleção
  ("Seletor/filtro/calendário abre um painel DO DS"). A linha nova generaliza: *toda instância de
  padrão nomeado usa o componente canônico do cânone, e componente custom exige o ADR de exceção.*
- **Todo brief de UI injeta o cânone** como critério de aceite, ao lado do guia de marca (L-011) e
  do JTBD (L-004). É a checagem de planejamento da L-021, e sem ela o gate só pega o que já nasceu
  errado.
- **`governanca-design.md` §8** ganha o ponteiro para o cânone e para este gate, fechando o
  circuito: a regra escrita em prosa passa a ter o artefato que a torna conferível.
