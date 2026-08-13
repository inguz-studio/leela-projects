# A catraca passa a ver o controle e a montagem em volta dele

> Extensão do gate `leela-canon`, especificada e não implementada nesta leva. A spec original é
> `02-rodadas/2026-08-11-roadmap-componentes/05-gate-leela-canon.md` e nada dela é revogado aqui —
> o que segue são uma regra de lint nova, cinco contagens novas na catraca e dois consertos de
> régua que a medição desta rodada tornou obrigatórios.

## 1. O buraco, dito com o número

O gate de 11/08 mede cinco coisas: superfície reconstruída, botão estilizado, moldura à mão,
receita de grid e padrão órfão. Das 134 ocorrências que esta rodada mediu, **129 passam por essas
cinco contagens sem tocar em nenhuma**.

Uma décima quarta barra de filtro montada à mão entra hoje com o gate verde. Um décimo oitavo par
rótulo-checkbox, também. Um décimo terceiro contador "Mostrando X de Y" sem canal de ARIA, também.
O gate existe para impedir a próxima instância, e para estas quatro famílias ele não impede nenhuma.

O desenho abaixo segue a fronteira que a spec original declarou e que continua certa: **o que é
ambíguo não vira erro de lint.** Regra dura só onde o fato é sintático e local; o resto entra como
contagem com catraca.

## 2. Regra 3 · `leela-canon/filtro-fora-do-canone`

**Severidade:** nasce `error` com lista de dívida nomeada por onda, como o `senha-fora-do-ds` fez.
Não nasce `warn`: a Parte B de 11/08 já provou que `warn` não é instrumento de rollout neste repo,
porque os três `lint` rodam com `--max-warnings 0`.

### O que ela barra

Um elemento de seleção usado para **filtrar, recortar ou ordenar** uma lista. O fato é sintático e
local: o papel está declarado no próprio atributo do elemento.

| Assinatura | Canônico que a mensagem sugere |
|---|---|
| `<Select>` ou `<select>` cujo `label` ou `aria-label` casa `/^(filtrar|filtro|recorte|recortar|ordenar)/i` | `FilterMenu` (4+ valores), `Chip active` (menos de 4), `Combobox` (cardinalidade alta com busca) |
| `<Select>` ou `<select>` cujo `label` ou `aria-label` casa `/^(quantos|quantas|top)/i` | `Chip active` ou `Tabs` — cânone §1, alternância entre recortes |
| `role="combobox"`, `role="listbox"`, `role="option"`, `aria-autocomplete` ou `aria-activedescendant` fora de `packages/design-system/src/**` | `Combobox` — o motor é do DS |

Os três atributos de ARIA da terceira linha **não têm hit nenhum hoje** (medido na §6 do
inventário). A regra entra com contagem zero, que é o melhor momento possível para uma regra dura
nascer: ela nunca vai precisar de dívida, e a primeira violação é a que ela existe para pegar.

### O que ela não barra

As mesmas isenções da Regra 1, sem invenção: `packages/design-system/src/components/**`,
`**/__tests__/**`, `**/*.test.tsx`, `**/*.stories.tsx`, `apps/mobile/**`, mais a lista
`arquivosDeExcecao` que materializa a porta única da governança §8.

### Configuração

```js
'leela-canon/filtro-fora-do-canone': ['error', {
  // Prefixos de rótulo que denunciam papel de filtro. Extensível por config
  // porque o vocabulário da casa é português e pode ganhar termo novo.
  prefixosDeFiltro: ['filtrar', 'filtro', 'recorte', 'recortar', 'ordenar'],
  prefixosDeRecorte: ['quantos', 'quantas', 'top'],
  arquivosDeExcecao: [],
}]
```

### Dívida de entrada, nomeada por onda

```js
const DIVIDA_FILTRO_FORA_DO_CANONE = [
  // Onda C1 · três Select fazendo trabalho de filtro (inventário §4.1)
  'apps/painel/src/routes/clubes/engajamento/EngajamentoView.tsx',
  // Onda C1 · Select de ordenação — padrão ÓRFÃO, sai da lista quando a
  // decisão de ordenação voltar e o cânone ganhar a linha (inventário §5)
  'apps/painel/src/routes/crm/ClientesPage.tsx',
];
```

Dois arquivos. A camada A do script já reprova entrada morta, então a lista não sobrevive à
conversão que a apaga.

### Por que `Select` entra na regra dura e `<button>` não

`<button>` ficou fora porque a violação dele se reconhece por **assinatura de classe**, e assinatura
de classe é onde falso positivo nasce (spec original §4). O `Select` de filtro é o oposto: a
violação está no **rótulo que o próprio autor escreveu**. Quem escreve `aria-label="Filtrar por
status"` num `<Select>` declarou o papel do controle em texto. Não há ambiguidade a resolver e não
há legítimo a proteger — o cânone diz *"filtro nunca é `Select`"* sem ressalva.

## 3. Cinco contagens novas na camada B

As quatro peças que não existem no DS não podem virar regra dura: enquanto o canônico não nasce,
reprovar a tela seria bloquear trabalho por um vazio que só a Onda C0 fecha. É literalmente o caso
da §6 da spec original — padrão sem cânone é finding de processo, contado e não barrado. Quando as
peças nascerem, as cinco viram catraca de verdade e a Onda C0 as trava.

| Contagem | O que ela mede | Régua |
|---|---|---|
| `faceta-crua` | grupo de faceta montado à mão | nó com `role="group"` cujo `aria-label` casa `/^(filtrar|filtro|recorte)/i` e que contém dois ou mais `<Chip` ou `<button` |
| `barra-de-filtro-crua` | a barra que hospeda busca, facetas e contador | bloco com `class` contendo `flex` que tem, como descendentes diretos ou de um nível, `<SearchInput` **e** pelo menos um de `<Chip` / `<Combobox` / `<Select` / `role="group"` de filtro — e que **não** é `<Toolbar` nem `<ListaGlobal` |
| `contador-de-resultado-cru` | o "Mostrando X de Y" | nó de texto casando `/\b[Mm]ostrando\b/` com uma interpolação e a palavra `de`, ou chamada a `contadorInscritos(` / `rotuloContagem(` fora do DS |
| `rotulo-de-checkbox-cru` | o par rótulo + caixinha | `<Checkbox` cujo pai é `<label>`, ou `<Checkbox` com irmão `<label htmlFor=` no mesmo bloco |
| `grupo-de-campos-cru` | o grupo de campos | `<fieldset>` fora de `packages/design-system/src/**` |

**Baseline de entrada, medido nesta rodada em `f962efe3`:**

| Contagem | painel | landing | total |
|---|---:|---:|---:|
| `faceta-crua` | 12 | 0 | **12** |
| `barra-de-filtro-crua` | 13 | 0 | **13** |
| `contador-de-resultado-cru` | 12 | 0 | **12** |
| `rotulo-de-checkbox-cru` | 12 | 5 | **17** |
| `grupo-de-campos-cru` | 11 | 0 | **11** |

O `grupo-de-campos-cru` conta os onze `fieldset` do painel, não só os três que hospedam `Checkbox`.
A régua mede a montagem, não o conteúdo dela — contar só os de checkbox seria pedir ao script uma
leitura de intenção que ele não faz, e deixaria oito grupos crescendo fora da vista.

## 4. Dois consertos de régua que a medição obrigou

A spec original registrou dois pontos cegos conhecidos: *"a catraca hoje não vê `<p>` nem const;
parser do tokensBrasa cego a escopo"*. Para estas famílias os dois importam, e o conserto é
pequeno.

**O contador mora num `<p>` ou num `<span>`.** Doze dos doze. Se a varredura só olha tags de
container, `contador-de-resultado-cru` nasce em zero e mente. **Régua:** esta contagem lê o
**conteúdo textual da linha**, não a tag — a assinatura é a frase, e a frase é o que se repete.

**A faceta e a barra moram em componentes locais declarados com `const` ou `function`.** As duas
recriações de chip vivem em `FiltroStatus` e `FiltroEstado`, funções internas do arquivo de tela.
Um parser que só desce a árvore do `export default` não as vê. **Régua:** as cinco contagens
varrem o arquivo inteiro, todas as declarações, como as contagens de superfície e moldura já fazem.

Os dois são conserto de leitura, não de escopo. Nenhuma das cinco contagens precisa de análise de
fluxo nem de resolução de import.

## 5. A camada A ganha as peças novas

Assim que a Onda C0 publicar `FilterBar`, `FilterChips`, `ResultCount`, `CheckboxField` e
`FieldGroup`, a camada A passa a exigir delas o mesmo que exige das outras oitenta e cinco: export
no barrel, linha no `03-canon/canone-de-componentes.md` e presença na opção `canone` do
`eslint.config.mjs`, os três batendo. Componente novo sem linha do cânone **no mesmo commit**
reprova — e a auditoria da Parte B já registrou que essa atomicidade escorregou uma vez, no commit
`443394a1`. A Onda C0 não repete.

Junto entram os sinônimos, que são o segundo mecanismo da L-021 e o mais caro:

```js
sinonimos: {
  FilterBar:     ['BarraDeFiltros', 'FiltrosBar', 'Filtros', 'FilterToolbar'],
  FilterChips:   ['ChipGroup', 'GrupoDeChips', 'FiltroStatus', 'FiltroEstado', 'FiltroTipo'],
  ResultCount:   ['ContadorResultado', 'Mostrando', 'ContadorDeLista'],
  CheckboxField: ['CheckboxComRotulo', 'CampoCheckbox', 'LabeledCheckbox'],
  FieldGroup:    ['GrupoDeCampos', 'Fieldset', 'CampoGrupo'],
}
```

`FiltroStatus`, `FiltroEstado` e `FiltroTipo` entram como sinônimo porque são os nomes que as telas
já usaram para as funções locais que a peça substitui. É o mesmo movimento que fez `SecaoHead`
virar sinônimo de `SectionHeader` em 11/08, e ele custou uma remedição registrada — desta vez o
sinônimo entra **junto** com a peça, então o número não sobe sem razão.

## 6. Quando cada coisa vira barreira

Três degraus, na ordem, e o primeiro não espera peça nenhuma.

1. **Regra 3 entra `error` agora**, com os dois arquivos de dívida. Combobox artesanal reprova a
   partir do primeiro dia porque a contagem é zero; `Select` de filtro reprova em todo arquivo que
   não esteja na lista.
2. **As cinco contagens entram com o baseline acima.** Subir reprova. Elas medem uma dívida que
   ninguém pode pagar até a Onda C0 publicar as peças — e é por isso que entram como catraca e não
   como erro: o número não pode crescer enquanto a peça não existe.
3. **As cinco viram `error` quando a Onda C0 fecha.** Publicada a peça, recriar a montagem passa a
   ser violação da Regra 2 (declaração com nome de canônico ou sinônimo) e das contagens ao mesmo
   tempo. A partir daí, entrar exige a porta única: ADR com contexto, critérios ordenados, a11y
   provada, e a linha em `arquivosDeExcecao` aparecendo sozinha no diff.

## 7. O que fica de fora, e por quê

- **Contar valores por faceta para cobrar o limiar de quatro.** O cânone manda `FilterMenu` em
  faceta de quatro ou mais valores. Um script não sabe quantos valores uma faceta tem em tempo de
  execução — o array vem de `_lib`, de query ou de prop. A `FilterChips` da Onda C0 resolve isto por
  construção: ela recebe as opções e **ela** escolhe fileira ou dropdown pelo tamanho da lista.
  Regra que precisa de dado de execução não vira lint; vira componente.
- **Julgar se um filtro devia ser chip ou dropdown, ou se uma marcação devia ser `Checkbox` ou
  `Switch`.** É o critério 9 da rubrica de design, é leitura humana, e o gate que tentar isso
  produz falso positivo em uma semana.
- **`<label>` cru em geral.** Só o `<label>` que abraça um `Checkbox` entra. Rótulo de `Input`,
  `Select` e `Textarea` já é trabalho do `Field` e a adoção dele é outra fila (23 usos hoje).

## 8. O item que abre a fila, e não é desta lane

`node scripts/gate-canon.mjs` na main de `f962efe3` devolve `GATE LEELA-CANON: FAIL (1)`:
`grade-crua.painel` subiu de 104 para 109. Nenhuma linha desta rodada causou isso — a leva é de
conferência e não tocou código de produto. A subida entrou com o merge `f962efe3`, que escreveu
telas do administrativo com moldura à mão depois de `Stack`, `FormGrid` e `MetricGrid` existirem.

Vale registrar o que isso prova, porque é o argumento inteiro a favor de estender a catraca: **ela
pegou a regressão sozinha, no dia seguinte, sem ninguém revisar com o cânone na mão.** É exatamente
o que a spec original diz que o gate existe para fazer. As cinco contagens novas dão o mesmo
serviço a quatro famílias que hoje passam batido.
