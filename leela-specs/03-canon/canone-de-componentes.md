---
tags: [leela, design-system, canone, componentes]
aliases: [Cânone de componentes, Mapa padrão componente, Component canon]
atualizado: 2026-08-11
---

# Cânone de componentes · Leela

> **O que é.** O mapa padrão → componente canônico do `@leela/design-system`. Se a linha tem
> componente, a discussão acabou: a instância importa do DS e não reconstrói.
>
> **Por que existe.** Sem este artefato, "usa o design system" é critério de aceite inchecável por
> construção — não há contra o quê reprovar, cada lane inventa o seu e ninguém erra formalmente.
> Foi assim que 223 instâncias divergiram com o gate de marca verde. Medição em
> `02-rodadas/2026-08-11-roadmap-componentes/02-inventario-componentes.md`.
>
> **Quem obedece.** Todo brief de UI o injeta como critério de aceite, ao lado do guia de marca
> (L-011) e do JTBD (L-004). O gate `leela-canon` lê dele a lista de nomes. O DoD de Tela o cita.
>
> **Fronteira.** Procedência ≠ escolha ≠ marca. Este documento julga **procedência** (é o
> componente do DS?). A escolha do padrão (checkbox ou radio, tabela ou cards) é o critério 9 da
> rubrica de design. Marca é `governanca-design.md` §1-§2 e a regra `leela-tokens`. Os três são
> necessários e nenhum cobre o outro.

## Porta única de exceção

Componente custom fora do DS só existe quando **(a)** não há equivalente shadcn nem no DS para o
padrão, ou **(b)** há necessidade técnica forte que o primitivo do DS não atende — e, nos dois
casos, com justificativa documentada: ADR ou nota de decisão com contexto, critérios ordenados e
a11y provada. O padrão correto de exceção é o **ADR-017**. Desviar sem esse registro é violação,
não exceção. Regra completa em `04-engenharia/governanca-design.md` §8.

## 1. Seleção

| Padrão | Canônico | Quando é este e não o vizinho |
|---|---|---|
| Escolha única, poucas opções, em formulário | `Select` | até ~7 opções conhecidas, sem busca |
| Ordenação de lista (reordena, não retira) | `Select` | decisão da Onda C5 (2026-08-16), `02-rodadas/2026-08-12-conformidade-controles/03-fila-em-ondas.md` — o cânone não tinha linha para isto: não é filtro (nada some da lista) e não é campo de formulário (não vira dado). A forma bate com a linha de cima — escolha única, poucas opções, sem busca —, então o veredicto é o mesmo componente, não peça nova. `prefixosDeFiltro` da regra 3 excluiu `"ordenar"`: reordenar declara papel diferente de filtrar, no mesmo rótulo que o autor escreve |
| Escolha com busca, cardinalidade alta | `Combobox` | quando rolar é pior que digitar; anatomia Popover + Command |
| Filtro de lista ou tabela | `FilterMenu` | filtro nunca é `Select`; ele mostra o que está aplicado |
| A faceta de UM filtro (a fileira ou o menu) | `FilterChips` | recebe as opções e **conta**: fileira de `Chip` abaixo de 4, `FilterMenu` (empilhável) ou `Combobox` (exclusiva) a partir de 4 |
| Menu de ações sobre um item | `DropdownMenu` | ação, não valor; se o resultado é um dado, é `Select`/`Combobox` |
| Âncora flutuante genérica | `Popover` + `PopoverTrigger` / `PopoverContent` / `PopoverAnchor` / `PopoverClose` | direto só quando o conteúdo não é lista |
| Lista filtrável dentro de painel | `Command` + `CommandInput` / `CommandList` / `CommandEmpty` / `CommandGroup` / `CommandItem` | primitivo do `Combobox` |
| Alternância entre recortes do mesmo dado | `Chip` com `active`, ou `Tabs` | chip para filtro empilhável; tab para recorte exclusivo com painel |
| Busca com resultado inline, sem popover ("modo de fluxo") | `SearchInput` + lista própria — exceção registrada, **ADR-018** | `Combobox` é picker de popover; o balcão (`AtendimentoPanel.tsx`) não pode pagar o clique de abrir um gatilho antes de buscar (RN-205). Único consumidor hoje; um segundo justifica `Combobox` ganhar `mode="flow"` |

**Proibido:** `<select>` nativo para filtro ou seleção rica. A lista dele é desenhada pelo sistema
operacional e não aceita os tokens do DS.

## 2. Data e hora

| Padrão | Canônico |
|---|---|
| Data única | `DatePicker` — no painel, `components/fields/DateField.tsx` (já traz rótulo e erro) |
| Intervalo | `DateRangePicker` |
| Grade de calendário embutida | `Calendar` |
| Data + hora | `components/fields/DateTimeField.tsx` |
| Selo de data em cartão ou linha | `DateBadge` |

**Proibido:** `<input type="date">` e `<input type="datetime-local">`. `<input type="time">` segue
permitido dentro do `DateTimeField`: é spinner, não é o calendário do SO.

## 3. Formulário

| Padrão | Canônico |
|---|---|
| Texto de uma linha | `Input` |
| Texto de múltiplas linhas | `Textarea` |
| Senha | `InputSenha` |
| Busca | `SearchInput` |
| Arquivo | `FileInput`; imagem com preview, `components/upload/ImageUploadField.tsx` |
| Marcação booleana | `Checkbox` |
| Marcação booleana **com rótulo ao lado** | `CheckboxField` — `Checkbox` + `<label htmlFor>` irmão, dica e erro por `aria-describedby` |
| Liga/desliga com efeito imediato | `Switch` — muda agora; `Checkbox` só na submissão |
| Escolha exclusiva | `Radio` / `RadioGroup` |
| Escolha exclusiva com descrição e peso | `RadioCard` |
| Rótulo + dica + erro + `aria-describedby` | `Field` — envolve qualquer controle acima |
| Grupo de campos com rótulo comum | `FieldGroup` — `fieldset` + `legend` visível, dica e erro DO grupo, `disabled` nativo |
| Fluxo em etapas | `Stepper` |

**Proibido:** todo controle nativo desta tabela. Checkbox nativo é violação da mesma severidade que
`<select>` nativo.

**Formulário novo compõe `Field` + controle.** Rótulo, dica, erro e a ligação ARIA entre eles são o
trabalho do `Field`, e cada tela vinha refazendo à mão.

## 4. Cartão e superfície

| Padrão | Canônico |
|---|---|
| Bloco de conteúdo com elevação | `Card` + `CardHeader` / `CardTitle` / `CardDescription` / `CardContent` / `CardFooter` |
| Indicador numérico com rótulo e variação | `KpiCard` |
| Miniatura com proporção | `Thumb` |
| Retrato de pessoa | `Avatar` |
| Separador | `Divider` |
| Rótulo de estado ou categoria | `Badge` — `variant` semântico (`brand`, `heroico`, `vulcao`, `vitoria`, `alerta`, `neutro`); `size` separa o selo (`sm`) da pílula (`md`, `lg`) |
| Pílula informativa de contorno | `Badge` com `variant="outline"` |
| Marcador interativo ou removível | `Chip` — `Badge` informa, `Chip` responde |

**Superfície com elevação é `Card`.** `<div>`, `<section>` ou `<article>` com
`rounded-[var(--card-radius)]` + `bg-[var(--surface-raised)]` + `p-[var(--spacing-*)]` é a anatomia
do `Card` reescrita, e é divergência mesmo com todos os tokens corretos. Esta linha sozinha responde
por 192 das 223 divergências medidas.

O `Card` tem `as` (`div` · `article` · `section` · `li` · `aside`) e o `CardTitle` tem `as`
(`h2`/`h3`/`h4`). As duas props são de **semântica, nunca de visual**: o `className` é byte a byte o
mesmo em qualquer tag. Elas existem porque a conversão para o canônico não pode apagar um marco de
navegação — `<div>` filho direto de `<ul>` quebra a lista, e `<div aria-label>` sem `role` não é
landmark nenhum. `asChild` do Radix resolveria e está barrado na landing pelo ADR-017.

A variante `outline` do `Badge` usa `border-strong`, não `border-default`: numa pílula transparente
a borda é o componente inteiro, o que a tira da isenção de frame decorativo e a põe sob a 1.4.11
(≥ 3:1). `border-default` dá 1.67:1 no brasa e 1.46:1 no wine.

Na landing, `Card` entra por `@leela/design-system/server` — entrada server-safe e Radix-free do
ADR-017, sem custo de bundle público.

## 5. Cartão de domínio

| Padrão | Canônico |
|---|---|
| Evento | `CardEvento` |
| Desafio | `CardDesafio` |
| Evento em lista | `EventRow` |
| Clube, comunicado, campanha, parceria, afiliação | `CardDominio` — composição do `Card`, com slots `leading` / `badges` / `description` / `meta` / `actions` / `footer` / `accent` |

**Uma peça para as cinco famílias, e a razão está medida.** As cinco foram lidas linha a linha
antes do código (`ClubeCard.tsx:67`, `ComunicadosList.tsx:58`, `CampanhasList.tsx:81`,
`ParceriasView.tsx:55`, `MinhasAfiliacoesPage.tsx:65`) e têm **a mesma anatomia**: mídia opcional à
esquerda, título com selos, resumo curto, linha de metadados, ações no canto, acento lateral de
estado em duas e rodapé de botões em três. O que muda é o conteúdo dos slots, não a montagem.
Publicar cinco componentes com o mesmo corpo seria criar cinco motores para manter em sincronia —
a lição que o `ConfirmModal` custou.

Família nova com a mesma anatomia (publicação, aviso, o que vier) é `CardDominio` com outros slots,
e entra aqui como linha, não como componente.

## 6. Slot, bento e grade composta

| Padrão | Canônico |
|---|---|
| Empilhamento com ritmo | `Stack` — `gap` em sete degraus fechados, `align`, `as` |
| Grade de formulário (1 → 2/3 colunas) | `FormGrid` — `columns` 2 ou 3, `from` `sm`/`md`/`lg`, `gap` |
| Grade de indicadores (1 → xs:2 → lg:N) | `MetricGrid` — `columns` 2, 3 ou 4, `gap` |
| Bento assimétrico de dois painéis | `SplitPanel` — `ratio` `3:2`/`7:3`/`1:3`, `gap` |
| Cabeçalho de bloco interno | `SectionHeader` — `title`, `titleAs`, `description` e os slots `help` / `control` / `action` |
| Par rótulo + valor em pé, de leitura (ficha, resumo) | `DefinitionItem` — `label`, `value`, `emptyLabel`, `size` `sm`/`base`; compõe `FormGrid as="dl"` ou `Stack`, não substitui — decisão da Onda C6 (2026-08-16), `02-rodadas/2026-08-12-conformidade-controles/03-fila-em-ondas.md`: rótulo+valor LADO A LADO numa linha de comparação (`PlanoAplicadoCard`) NÃO é esta peça, anatomia horizontal diferente |

**O DS publicava 50 componentes e nenhum era layout.** Consequência medida: 106 ocorrências de
`grid grid-cols-*` no painel, com **23 assinaturas distintas**, para o que são três famílias
(inventário §7.1). A CANONE-1 foi decidida em 11/08 (leva 7) com a frase do dono: *"Se um componente
nao existe, precisamos documentar e padronizar o componente para nao ficar refazendo ele."* As cinco
peças acima nasceram na Onda 0 Parte B, com story, teste e esta linha no mesmo commit.

**A escala de cada peça é FECHADA, e é esse o serviço que ela presta.** Um primitivo que
reexportasse a régua inteira do Tailwind não teria fechado nada. Três consequências que valem como
regra:

- `Stack` publica sete degraus e **`--spacing-5` ficou de fora**: é o único da lista sem papel
  declarado na moldura (`--layout-*` usa 2, 4 e 6) e sobreviveu como escolha de tela.
- `MetricGrid` **não tem prop de breakpoint**. A diferença entre `md:` e `lg:` na última coluna era
  gosto; o ponto de partida (1 ou 2 colunas) tem decisão escrita no preset (REDESIGN-V2 · item 6:
  abaixo de 480px o rótulo do KPI corta) e a escada a executa.
- `SplitPanel` lê a proporção de **token** (`--layout-split-3-2`, `-7-3`, `-1-3`), não de classe
  arbitrária — foi a classe arbitrária que produziu cinco receitas para uma família. Uma quarta
  proporção entra por token novo em `tokens/component.json` e linha aqui, no mesmo commit.

`Grid` e `Surface` **não** são nomes disponíveis: já são sinônimos reservados de `Table` e `Card` na
regra 2 do gate. Layout composto deixou de ser finding de processo e virou divergência como
qualquer outra — a catraca `grade-crua` do `scripts/gate-canon.mjs` mede as instâncias que ainda
montam moldura à mão, e ela só desce.

Fora das famílias, os **casos próprios** seguem legítimos e sem canônico: grade de calendário
(`grid-cols-7`), cohort e planos. Eles não são família; forçá-los num primitivo seria inventar
generalidade que a medição não achou.

## 7. Tabela e lista

| Padrão | Canônico |
|---|---|
| Dado tabular | `Table` + `TableColumn` |
| Paginação | `Pagination` |
| Lista de eventos | `EventRow` dentro de `<ul>` |
| Ações de UMA linha de tabela | `RowActions` — botões de **ícone**, nunca texto; entra pelo `renderActions` do `Table` |
| Barra de ações sobre a lista | `Toolbar` |
| Barra de busca, facetas e contador da lista | `FilterBar` — compõe `Toolbar`; o `role="search"` fica no `SearchInput`, não na barra |
| Contagem da lista recortada ("Mostrando X de Y") | `ResultCount` — canal de ARIA por prop, default polido; com `temMais` o total não aparece |

`<table>` cru é permitido em um caso: tabela `sr-only` pareada com gráfico, para leitor de tela. Não
é atalho de estilo; é a versão acessível do dado.

**Ação de linha é ÍCONE, e o ícone sai do verbo.** Decisão do dono em 2026-08-17, na íntegra: *"E
nas ações, de tabelas, quero que ao invés de escritos, utilzemos ícones de ação, que ao clicar,
abrimos modais, ou direcionamos para páginas. Como por exemplo 'detalhes'."* O inventário da lane
mediu **40 ações em texto, em 21 tabelas de 20 arquivos, com 25 rótulos distintos para 17 verbos** —
três grafias só para "ver". O `RowActions` fecha isso pela API: a prop é `verbo`, de uma união
FECHADA, e o consumidor **não escolhe o ícone** — o desenho sai de `ICONES_DE_ACAO`, dentro do DS.
É o que faz "mesmo verbo, mesmo ícone" ser cobrado pelo compilador em vez da revisão.

Sinônimo de rótulo não vira verbo novo: "Detalhe", "Detalhes" e "Ver termos" são todos `ver`, e o
que muda é o `label` — que segue livre, é obrigatório e vira o `aria-label`. **Verbo novo entra como
linha em `ICONES_DE_ACAO` mais linha aqui, no mesmo commit**, com a mesma disciplina do token novo
(governança §5) e da escala fechada do `Stack`.

A dica do `Tooltip` é reforço VISUAL e nunca o único canal do nome: o nome acessível é o `aria-label`
do `IconButton`, que existe com a dica fechada. A catraca `acao-de-tabela-em-texto` do
`scripts/gate-canon.mjs` conta o que ainda não converteu, e ela só desce.

## 8. Modal e overlay

| Padrão | Canônico |
|---|---|
| Diálogo com formulário ou conteúdo | `Modal` |
| Confirmação de ação destrutiva | `ConfirmModal` — com preview de consequências (§2.15) |
| Diálogo na superfície pública | `Dialog` via `@leela/design-system/dialog` (Radix-free, ADR-017) |
| Painel lateral | `Drawer` |
| Dica curta ancorada | `Tooltip` + `TooltipTrigger` / `TooltipContent` / `TooltipProvider` |

**Proibido:** `<dialog>` nativo e backdrop artesanal (`fixed inset-0` à mão). Todo modal tem as
quatro vias de fechamento do DoD de Tela: cancelar, X, overlay, Esc.

## 9. Navegação

| Padrão | Canônico |
|---|---|
| Moldura da aplicação | `AppShell` |
| Menu lateral | `Sidebar` / `SidebarRail` — marca e rodapé por `SidebarBrand` / `SidebarFooter` |
| Navegação primária abaixo de `lg`, até cinco destinos | `BottomNav` — barra flutuante horizontal inferior; `lg:hidden` é anatomia da peça, e o contêiner que rola leva `RESPIRO_BOTTOMNAV` |
| Trilha | `Breadcrumb` |
| Cabeçalho de página | `PageHeader` |
| Navegação de área | `SubNav` — ativa com sublinhado Brasa 2px e contador pill; barra transparente e **sem borda inferior**, em qualquer nível |
| Abas com painel | `Tabs` — painéis permanecem no DOM (`forceMount`) |

**Menu secundário é UM só, e no painel ele entra por `AreaSubNav`.** Área, sub-área e terciária são o
mesmo componente com a mesma aparência: não existe variante por nível de profundidade. A prop
`divider` do `SubNav` foi removida na Leva 14 — ela desenhava, em `--border-subtle`, um traço no
mesmo `bottom: 0` do indicador Brasa, e o dono reprovou lendo a tela: *"o menu secundário de clubs
está coreto, mas nas outras telas, a linha esta aparecendo, aonde os seletores laranja ficam. Isso é
um exemplo de que voce naoe stá retulizando e padronizando os componentes."* Oito dos onze menus do
painel passavam a prop; clubs, que não passava, era o único certo. A borda inferior agora é travada
em `border-b-0` **depois** do `className`, pela mesma mecânica de `twMerge` da trava de rolagem —
separar a barra do conteúdo é trabalho do espaço da moldura, nunca de traço.

**A navegação mobile tem DUAS anatomias, e a escolha é da superfície.** O `BottomNav` nasceu na leva
20 pela fala do dono — *"Já o Menu no formato mobile, pode ser uma barra flutuante, horizontal a
ficar na parte inferior da tela"* — e ele supersede o drawer off-canvas (D-1008-R5) **na superfície
do produtor**, onde cinco destinos viram quatro slots mais uma casa para o quinto. Na superfície do
super-admin o drawer **fica**: são doze destinos, e barra que abandona destino é pior que drawer.
O `AppShell` carrega a regra em vez de descrevê-la — com `bottomNav` o hambúrguer não é renderizado
e o drawer não é montado, e sem `bottomNav` os dois seguem intactos. Nenhum modo da peça deixa a
superfície sem navegação abaixo de `lg`, que é o que impede rota inalcançável no mobile.

O consumidor único no painel é `apps/painel/src/components/nav/AreaSubNav.tsx`: ele fia a navegação
de SPA (`tabsComNavSpa`) que estava copiada em onze pontos de render, e é o que garante `href` real
com interceptação de clique em todas as barras de uma vez. Render direto de `<SubNav>` fora dele é
contado pela catraca `menu-secundario-cru` do `scripts/gate-canon.mjs`, com baseline **zero** — a
mesma catraca pega a barra reescrita à mão (`flex` + `border-b-2` na aba ativa), que é como a linha
voltaria sem passar pelo componente.

## 10. Estado

| Padrão | Canônico |
|---|---|
| Lista ou bloco sem dado | `EmptyState` — sempre com o próximo passo, nunca só a frase |
| Carregando | `Skeleton` — spinner solto em lista é proibido |
| Erro ou estado de sistema em tela cheia | `SystemStateScreen` |

## 11. Feedback

| Padrão | Canônico |
|---|---|
| Retorno de ação de escrita | `Toast` / `ToastProvider` / `useToast` — obrigatório em toda escrita; `danger` persiste até dismiss manual |
| Aviso em bloco, no fluxo da página | `Alert` — `tone` `info`/`vitoria`/`alerta`/`vulcao`, slots `title` / `icon` / `actions`, e o canal de ARIA em `live` |

**`Toast` flutua e some; `Alert` fica no fluxo.** A escolha é do papel, não do estilo: retorno de
escrita é `Toast`, estado que a pessoa precisa ler antes de seguir é `Alert`, erro de campo é o
`errorMessage` do controle, tela inteira de erro é `SystemStateScreen`.

**O canal de ARIA do `Alert` é prop, e o default é `none`.** Os três avisos do checkout escolheram
canais diferentes com a razão escrita no topo de cada arquivo, e estavam certos: `role="alert"` para
o desfecho final que muda o que fazer, `role="status"` com `aria-live="polite"` para a espera que
não pode atropelar o anúncio de erro ao lado. Aviso que já estava na tela quando ela carregou não é
live region — anunciar conteúdo estático a cada render é ruído, e ruído treina a pessoa a ignorar o
canal. `role` e `aria-live` saem de uma prop só porque `role="alert"` com `aria-live="polite"` é
contradição que o navegador resolve do jeito dele, e o defeito não aparece em teste nenhum.

## 12. Indicador e dado

| Padrão | Canônico |
|---|---|
| Série categórica | `BarChart` |
| Composição de um total | `DonutChart` |
| Tendência inline | `Sparkline` |

## 13. Botão e ação

| Padrão | Canônico |
|---|---|
| Ação com rótulo | `Button` — `primary`, `secondary`, `ghost`, `destructive`, `neutral` |
| Ação só de ícone | `IconButton` — exige nome acessível |
| Ação na superfície pública sem Radix | `buttonVariants` de `@leela/design-system/server` |

`<button>` cru é **legítimo** em três casos: trigger com `asChild` do Radix; alvo de clique que não
é botão de ação (célula, cartão navegável, item de lista); botão-ícone em composição onde
`IconButton` seria peso morto. É **ilegítimo** quando o `className` replica altura, raio e cor de
uma variante do `Button`. Por essa ambiguidade, `<button>` fica fora da regra dura do gate e entra
na catraca do script.

## Manutenção

- **Componente novo no DS nasce com a linha do cânone no mesmo commit.** A camada A do gate
  `leela-canon` compara este documento, o barrel `packages/design-system/src/index.ts` e a opção
  `canone` do `eslint.config.mjs`; divergência entre os três reprova.
- **Padrão sem cânone nunca vira componente em silêncio.** Vira decisão agrupada no painel do dono
  (`01-produto/DECISOES-ABERTAS.md`), como manda a L-021.
- **Este documento é a fonte.** A configuração do lint é gerada dele; o cânone não pode viver em
  dois lugares.

## Onde o resto mora

| Assunto | Documento |
|---|---|
| Tokens, temas, regras visuais duras, shadcn-first, exceção | `04-engenharia/governanca-design.md` |
| DoD de Componente e de Tela | `04-engenharia/definition-of-done.md` |
| Spec do gate `leela-canon` | `02-rodadas/2026-08-11-roadmap-componentes/05-gate-leela-canon.md` |
| Medição que originou este cânone | `02-rodadas/2026-08-11-roadmap-componentes/02-inventario-componentes.md` |
| Ondas de conversão | `02-rodadas/2026-08-11-roadmap-componentes/04-ondas-roadmap.md` |
| Épico dono | `03-canon/epics/LEELA-E01-design-system.md` (história S005, RN-558) |
