# Cânone de componentes — o mapa padrão → componente

> Paga **S005-T3** do épico `LEELA-E01-design-system`. Este é o artefato que faltava: a L-021
> mostrou que sem ele o critério "usa o DS" é inchecável por construção, porque não há contra o
> quê reprovar.
>
> **Promoção na aterrissagem:** esta tabela vira `leela-specs/03-canon/canone-de-componentes.md`,
> canônico e único. A partir daí, todo brief de UI a injeta como critério de aceite, ao lado do
> guia de marca (L-011) e do JTBD (L-004), e o gate `leela-canon` lê dela a lista de nomes.

## Como ler

Três colunas e uma regra. **Se a linha tem componente, a discussão acabou**: a instância importa
de `@leela/design-system` e não reconstrói. Componente custom fora do DS só existe pela porta única
da governança §8 — ADR ou nota de decisão com contexto, critérios ordenados e a11y provada, no
padrão do ADR-017.

Linha marcada `sem cânone` é lacuna real, não licença. O que fazer com ela está na §14.

## 1. Seleção

| Padrão | Canônico | Quando é este e não o outro |
|---|---|---|
| Escolha única, poucas opções, dentro de formulário | `Select` | até ~7 opções conhecidas, sem busca |
| Escolha única ou múltipla com busca, cardinalidade alta | `Combobox` | quando rolar a lista é pior que digitar; anatomia Popover + Command |
| Filtro de lista ou tabela | `FilterMenu` | filtro nunca é `Select`; ele mostra o que está aplicado |
| Menu de ações sobre um item | `DropdownMenu` | ação, não valor. Se o resultado é escolher um dado, é `Select`/`Combobox` |
| Âncora flutuante genérica | `Popover` (+ `PopoverTrigger`, `PopoverContent`, `PopoverAnchor`, `PopoverClose`) | base dos anteriores; usar direto só quando o conteúdo não é lista |
| Lista filtrável dentro de um painel | `Command` (+ `CommandInput`, `CommandList`, `CommandEmpty`, `CommandGroup`, `CommandItem`) | primitivo de `Combobox`; direto só em composição própria |
| Alternância entre 2+ recortes do mesmo dado | `Chip` com `active`, ou `Tabs` | chip para filtro empilhável, tab para recorte exclusivo com painel |

**Proibido:** `<select>` nativo para filtro ou seleção rica. A lista dele é desenhada pelo sistema
operacional e não aceita os tokens do DS — é a "caixa fora do padrão" que o dono apontou.

## 2. Data e hora

| Padrão | Canônico |
|---|---|
| Data única | `DatePicker` — no painel, o adaptador `components/fields/DateField.tsx`, que já traz rótulo e erro |
| Intervalo de datas | `DateRangePicker` |
| Grade de calendário embutida | `Calendar` |
| Data + hora | `components/fields/DateTimeField.tsx` (`DatePicker` + entrada de hora) |
| Selo de data em cartão ou linha | `DateBadge` |

**Proibido:** `<input type="date">` e `<input type="datetime-local">`. O calendário do sistema
operacional não é estilizável e a governança §8 o proíbe por nome. `<input type="time">` segue
permitido dentro do `DateTimeField`: é spinner, não é o calendário do SO.

## 3. Formulário

| Padrão | Canônico |
|---|---|
| Entrada de texto de uma linha | `Input` |
| Texto de múltiplas linhas | `Textarea` |
| Senha | `InputSenha` — traz mostrar/ocultar, `autocomplete` e medidor de força |
| Busca | `SearchInput` |
| Arquivo | `FileInput`; imagem com preview e proporção, `components/upload/ImageUploadField.tsx` |
| Marcação booleana | `Checkbox` |
| Liga/desliga com efeito imediato | `Switch` — `Switch` muda estado agora; `Checkbox` só na submissão |
| Escolha exclusiva | `Radio` / `RadioGroup` |
| Escolha exclusiva com descrição e peso visual | `RadioCard` |
| Rótulo + dica + erro + `aria-describedby` | `Field` — envolve qualquer controle acima |
| Fluxo em etapas | `Stepper` |

**Proibido:** todo controle nativo desta tabela, sem exceção. Checkbox nativo é violação da mesma
severidade que `<select>` nativo: os estados de um `<input type="checkbox">` cru não passam pelo AA
por estado do DS.

`Field` está em **1** arquivo hoje contra 41 de `Input`. Rótulo, dica, erro e a ligação ARIA entre
eles são o trabalho que o `Field` faz e que cada tela vem refazendo à mão. Formulário novo compõe
`Field` + controle; não é opcional.

## 4. Cartão e superfície

| Padrão | Canônico |
|---|---|
| Bloco de conteúdo com elevação | `Card` (+ `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`) |
| Indicador numérico com rótulo e variação | `KpiCard` |
| Miniatura de imagem com proporção | `Thumb` |
| Retrato de pessoa | `Avatar` |
| Separador | `Divider` |
| Rótulo de estado ou categoria | `Badge` |
| Marcador interativo ou removível | `Chip` — `Badge` informa, `Chip` responde a clique |

**A regra que fecha as 192 divergências:** superfície com elevação é `Card`. `<div>` ou `<section>`
com `rounded-[var(--card-radius)]` + `bg-[var(--surface-raised)]` + `p-[var(--spacing-*)]` é a
anatomia do `Card` reescrita, e passa a ser divergência mesmo com todos os tokens corretos.

Na landing, o `Card` entra por `@leela/design-system/server` — entrada server-safe e Radix-free
ratificada pelo ADR-017, sem custo de bundle público.

## 5. Cartão de domínio

| Padrão | Canônico |
|---|---|
| Cartão de evento | `CardEvento` |
| Cartão de desafio | `CardDesafio` |
| Linha de evento em lista | `EventRow` |
| Clube, comunicado, campanha, parceria, afiliação | **sem cânone** — ver §14, decisão CANONE-1 |

## 6. Slot, bento e grade composta

| Padrão | Canônico |
|---|---|
| Grade de formulário, grade de indicadores, bento assimétrico, empilhamento com ritmo, cabeçalho de bloco interno | **sem cânone** — ver §14, decisão CANONE-1 |

O DS publica 50 componentes e nenhum é layout. Dois dos padrões que o dono nomeou na ordem, slot e
bento, caem inteiros aqui. Enquanto a decisão não voltar, layout composto é finding de processo, não
de tela: quem escreve não está violando nada, porque não há nada.

## 7. Tabela e lista

| Padrão | Canônico |
|---|---|
| Dado tabular com colunas | `Table` (+ `TableColumn`) |
| Paginação | `Pagination` |
| Lista de eventos | `EventRow` dentro de `<ul>` |
| Barra de ações sobre a lista | `Toolbar` |

`<table>` cru é permitido em um caso só, e ele existe: tabela `sr-only` pareada com um gráfico,
para leitor de tela (`crm/visao-geral/CohortIdadeSexo.tsx:132`). Não é atalho de estilo; é a versão
acessível do dado.

## 8. Modal e overlay

| Padrão | Canônico |
|---|---|
| Diálogo com formulário ou conteúdo | `Modal` |
| Confirmação de ação destrutiva | `ConfirmModal` — com preview de consequências (§2.15) |
| Diálogo na superfície pública | `Dialog` via `@leela/design-system/dialog` (Radix-free, ADR-017) |
| Painel lateral | `Drawer` |
| Dica curta ancorada | `Tooltip` (+ `TooltipTrigger`, `TooltipContent`, `TooltipProvider`) |

**Proibido:** `<dialog>` nativo e backdrop artesanal (`fixed inset-0` montado à mão). Todo modal
tem as quatro vias de fechamento do DoD de Tela: cancelar, X, overlay, Esc.

## 9. Navegação

| Padrão | Canônico |
|---|---|
| Moldura da aplicação | `AppShell` |
| Menu lateral | `Sidebar` / `SidebarRail` |
| Trilha | `Breadcrumb` |
| Cabeçalho de página | `PageHeader` |
| Navegação de área | `SubNav` — ativa com sublinhado Brasa 2px e contador pill |
| Abas com painel | `Tabs` — painéis permanecem no DOM (`forceMount`) |

## 10. Estado

| Padrão | Canônico |
|---|---|
| Lista ou bloco sem dado | `EmptyState` — sempre com o próximo passo, nunca só a frase |
| Carregando | `Skeleton` — spinner solto em lista é proibido |
| Erro ou estado de sistema em tela cheia | `SystemStateScreen` |

## 11. Feedback

| Padrão | Canônico |
|---|---|
| Retorno de ação de escrita | `Toast` (`ToastProvider`, `useToast`) — obrigatório em toda escrita; `danger` persiste até dismiss manual |

## 12. Indicador e dado

| Padrão | Canônico |
|---|---|
| Série categórica | `BarChart` |
| Composição de um total | `DonutChart` |
| Tendência inline | `Sparkline` |

## 13. Botão e ação

| Padrão | Canônico |
|---|---|
| Ação com rótulo | `Button` — variantes `primary`, `secondary`, `ghost`, `destructive`, `neutral` |
| Ação só de ícone | `IconButton` — exige nome acessível |
| Ação na superfície pública sem Radix | `buttonVariants` de `@leela/design-system/server` |

`<button>` cru continua legítimo em três casos, e é por isso que ele fica fora da regra dura do
gate (`05-gate-leela-canon.md §4`): trigger com `asChild` do Radix; alvo de clique que não é botão
de ação (célula, cartão navegável, item de lista); botão-ícone dentro de composição onde
`IconButton` seria peso morto. **Ilegítimo** é `<button>` com `className` replicando altura, raio e
cor de uma variante do `Button` — foi o caso do `CtaV3`, migrado em `11c1e4c7`, e são os 17 da
§4 do inventário.

## 14. As lacunas, agrupadas em uma decisão só

A L-021 manda: padrão sem cânone declarado vira decisão ao dono, nunca bespoke em silêncio. O
inventário achou quatro lacunas, e elas têm a mesma raiz e a mesma conta — por isso vão juntas ao
painel como **um** vetável, não quatro.

### CANONE-1 · o design system ganha layout e cartão de domínio, ou isso continua receita de tela

**O que está em jogo.** Quatro padrões sem componente: layout composto (106 ocorrências em 23
receitas distintas para três famílias reais), cartão de domínio (5 famílias sem componente,
produzindo 7 `<article>` crus), cabeçalho de bloco interno (resolvido localmente em `SecaoHead`,
depois de nascer duplicado) e typeahead em fluxo (1 instância, `Combobox` só sabe flutuar).

**Caso de uso.** Alguém abre uma tela nova de clube na semana que vem. Precisa de uma grade de dois
painéis assimétricos. Não há o que importar, então escreve `grid-cols-1 lg:grid-cols-[3fr_2fr]` —
a vigésima quarta receita. Ninguém reprova, porque não há contra o quê, e o dono vê mais uma tela
que "não respeita componente".

**Job story.** Quando eu abro duas telas do mesmo sistema, eu quero que elas respirem igual, para
não sentir que mudei de produto no meio do caminho.

**O que fica com você.** O alcance, não a forma técnica. As duas opções custam semanas diferentes e
entregam consistências diferentes.

**Opções, com a conta dos dois lados:**

- **O DS ganha os primitivos** (`Stack`, `Grid` com as três famílias medidas, `Bento`,
  `SectionHeader`), e os cartões de domínio nascem por composição de `Card` — não como cinco
  componentes novos, mas como um `Card` com slots nomeados. Custo: uma onda de fundação antes de
  qualquer onda de tela, e os primitivos precisam de story, teste e AA por estado como qualquer
  componente. Ganho: as 23 receitas viram 3, o gate passa a poder reprovar layout, e a tela nova da
  semana que vem tem o que importar. **Default proposto**, e a razão é a ordem do dono: ele nomeou
  bento e slot entre os padrões desrespeitados, e não dá para respeitar o que não existe.
- **Layout continua receita de tela**, com as três famílias documentadas como receita escrita no
  cânone em vez de componente. Custo: o gate nunca alcança layout, e a consistência depende de
  alguém lembrar de copiar a receita certa — o mecanismo que produziu 23 variantes. Ganho: zero
  trabalho de fundação, as ondas de tela começam amanhã.

**Onde aterrissa:** `03-canon/canone-de-componentes.md` §6 e §5, o épico `LEELA-E01`, e a Onda 0 do
documento `04` — que fica retida enquanto a resposta não vier.

**O que não fica com você, e por quê.** A forma técnica dos primitivos (nomes de prop, breakpoints,
API) é decisão de engenharia e sai decidida com registro. O que sobe é só o alcance, porque ele
compete com o roadmap por semanas.

## 15. Como o cânone é consumido

| Momento | O que acontece |
|---|---|
| Brief de UI nasce | injeta esta tabela como critério de aceite, junto de L-011 (marca) e L-004 (JTBD) |
| Código é escrito | quem não acha o padrão na tabela **propõe o cânone**; não escreve bespoke |
| Gate roda | `leela-canon` lê os nomes desta tabela e reprova o que diverge (`05-gate-leela-canon.md`) |
| Componente novo entra no DS | a linha do cânone nasce no mesmo commit; a camada A do gate reprova componente sem linha |
| DoD de Tela | ganha a linha geral de procedência, além da linha de seleção que já existe |

O cânone não pode viver em dois lugares. A tabela promovida em `03-canon/` é a fonte; a opção
`canone` do `eslint.config.mjs` é gerada dela e do barrel, e divergência entre os três reprova.
