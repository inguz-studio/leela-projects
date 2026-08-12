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
| Escolha com busca, cardinalidade alta | `Combobox` | quando rolar é pior que digitar; anatomia Popover + Command |
| Filtro de lista ou tabela | `FilterMenu` | filtro nunca é `Select`; ele mostra o que está aplicado |
| Menu de ações sobre um item | `DropdownMenu` | ação, não valor; se o resultado é um dado, é `Select`/`Combobox` |
| Âncora flutuante genérica | `Popover` + `PopoverTrigger` / `PopoverContent` / `PopoverAnchor` / `PopoverClose` | direto só quando o conteúdo não é lista |
| Lista filtrável dentro de painel | `Command` + `CommandInput` / `CommandList` / `CommandEmpty` / `CommandGroup` / `CommandItem` | primitivo do `Combobox` |
| Alternância entre recortes do mesmo dado | `Chip` com `active`, ou `Tabs` | chip para filtro empilhável; tab para recorte exclusivo com painel |

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
| Liga/desliga com efeito imediato | `Switch` — muda agora; `Checkbox` só na submissão |
| Escolha exclusiva | `Radio` / `RadioGroup` |
| Escolha exclusiva com descrição e peso | `RadioCard` |
| Rótulo + dica + erro + `aria-describedby` | `Field` — envolve qualquer controle acima |
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
| Rótulo de estado ou categoria | `Badge` |
| Marcador interativo ou removível | `Chip` — `Badge` informa, `Chip` responde |

**Superfície com elevação é `Card`.** `<div>`, `<section>` ou `<article>` com
`rounded-[var(--card-radius)]` + `bg-[var(--surface-raised)]` + `p-[var(--spacing-*)]` é a anatomia
do `Card` reescrita, e é divergência mesmo com todos os tokens corretos. Esta linha sozinha responde
por 192 das 223 divergências medidas.

Na landing, `Card` entra por `@leela/design-system/server` — entrada server-safe e Radix-free do
ADR-017, sem custo de bundle público.

## 5. Cartão de domínio

| Padrão | Canônico |
|---|---|
| Evento | `CardEvento` |
| Desafio | `CardDesafio` |
| Evento em lista | `EventRow` |
| Clube, comunicado, campanha, parceria, afiliação | 🔨 **nasce no DS por composição** — CANONE-1 decidido em 11/08 (Onda 0 Parte B) |

## 6. Slot, bento e grade composta

| Padrão | Canônico |
|---|---|
| Grade de formulário · grade de indicadores · bento assimétrico · empilhamento com ritmo · cabeçalho de bloco interno | 🔨 **nasce no DS** — CANONE-1 decidido em 11/08 (Onda 0 Parte B) |

O DS publica 50 componentes e nenhum era layout. **A decisão voltou em 11/08** (leva 7): peça que
não existe nasce no design system, documentada, antes de ser usada — diretriz permanente do dono,
escrita em `04-engenharia/governanca-design.md`. Até os primitivos existirem, layout composto
continua sendo **finding de processo, não de tela**; a partir deles, é divergência como qualquer
outra. As três
famílias reais em uso (grade de formulário 1→2/3 colunas, grade de indicadores 2→4, bento
assimétrico `[Nfr_Mfr]`) estão medidas, com as 23 receitas que as implementam, no inventário §7.1.

## 7. Tabela e lista

| Padrão | Canônico |
|---|---|
| Dado tabular | `Table` + `TableColumn` |
| Paginação | `Pagination` |
| Lista de eventos | `EventRow` dentro de `<ul>` |
| Barra de ações sobre a lista | `Toolbar` |

`<table>` cru é permitido em um caso: tabela `sr-only` pareada com gráfico, para leitor de tela. Não
é atalho de estilo; é a versão acessível do dado.

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
| Retorno de ação de escrita | `Toast` / `ToastProvider` / `useToast` — obrigatório em toda escrita; `danger` persiste até dismiss manual |

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
