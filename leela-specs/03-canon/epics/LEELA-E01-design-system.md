# LEELA-E01 · Design System temável & Shell (como código)

- **Superfície:** Todas
- **Horizonte:** H1 (Onda 0 → habilita Onda 1)
- **MoSCoW:** Must
- **Estimativa:** XL
- **Status:** 📋 Backlog (DS visual v3 pronto; portar para código)
- **Depende de:** LEELA-E00
- **De-para:** BH-E01 (Foundation)

## Objetivo

Portar o Design System v3 para código em `packages/design-system`, como **sistema temável**: um conjunto único de componentes React (e variante React Native) consome **tokens semânticos**; os temas `brasa` (identidade atual das 36 telas) e `leela` (Oxblood/Lima) são apenas conjuntos distintos de **tokens primitivos**, trocáveis em runtime via `ThemeProvider`. Nenhuma tela redefine token ou componente localmente — essa é a governança. Os componentes web são construídos com **Tailwind CSS + shadcn/ui (Radix)**, customizados para atender às regras §2.x; os tokens do tema `brasa` (e do `leela`) alimentam o `tailwind.config.ts` + o tema shadcn, mantendo o contrato semantic-only.

## Personas & JTBD

Infraestrutura de UI. Serve todas as personas via consistência visual e velocidade de construção das telas de domínio.

## Critérios de sucesso do épico

- `tokens.json` gera CSS custom properties (web) e objeto de tema (RN), em **3 tiers** (primitives → semantic → component).
- Trocar `theme="brasa"` ↔ `theme="leela"` re-tematiza todas as telas sem tocar componente.
- Biblioteca de componentes cobre o inventário abaixo, com variantes/estados e a11y AA.
- Catálogo navegável (Storybook ou equivalente) documenta cada componente.
- Shell (Sidebar 8 itens + Breadcrumb + Header 96px §2.1 + SubNav §2.14) montável em qualquer app.

## Regras de negócio / de design aplicáveis

- §2.1 (Header 96px), §2.2/§2.14 (sub-nav, underline Brasa 2px na ativa + contador pill), §2.5 (tabela densa: linha 64px), §2.7 (tabs no DOM), §2.15 (ConfirmModal com preview de consequências), §2.16 (flat, sem borda decorativa; exceções: input, divider, card selecionado, upload dashed, card crítico border-left Vulcão).
- Governança de tokens: componente referencia **semantic**, nunca primitivo direto.

## Modelo de dados tocado

Nenhum. Puramente apresentação.

## Fora de escopo

- Telas de domínio (ficam nos épicos de cada módulo).
- Migração visual das 36 telas para o tema `leela` (decisão de tema fica no consumidor; o E01 só entrega ambos os temas).

---

## Tema · arquitetura de tokens (3 tiers)

- **Primitives** (por tema): escalas de cor cruas. Tema `brasa`: Brasa 50→900 (500 `#FF450C`), Vulcão, Heroico, Vitória, Alerta, Neutros (surface base `#0C0C0C`, raised `#161616`). Tema `leela`: Oxblood `#7A1520` + Lima `#C8E84A` + neutros próprios.
- **Semantic** (compartilhado entre temas): `--surface-base/raised/overlay/high/sunken`, `--text-primary/secondary/tertiary/disabled/brand/danger/success`, `--action-primary(+hover/pressed/disabled)/secondary/destructive`, `--border-subtle/default/strong/brand/focus/danger`, feedback success/danger/warning/info.
- **Component:** `--btn-height-md`, etc.
- **Tipografia:** por tema — `brasa`: Exo 2 (display+ui) + JetBrains Mono; `leela`: Figtree/Syne conforme a marca. Escala Major Third (10→50px); H3+ Bold Italic; sem italic ≤16px.
- **Espaçamento** baseline 4px; **radius** none→pill; **elevação** elev-0→3 + elev-brand (glow); **motion** com `prefers-reduced-motion`; **ícones** Lucide 24×24 stroke 1.75 currentColor.

---

## User stories

### LEELA-S001-1 · Tokens em 3 tiers + temas trocáveis · (de-para BH-E01)

**Como** time, **quero** os tokens como código em tiers com temas trocáveis, **para** re-tematizar o produto sem tocar componentes.

- **MoSCoW:** Must · **Estimativa:** M · **Superfície:** Todas · **RNs:** §2.16

**Critérios de aceite:**
- **Dado** `theme="brasa"`, **quando** renderizo qualquer componente, **então** usa Brasa `#FF450C` + Exo 2.
- **Dado** que troco para `theme="leela"`, **quando** re-renderiza, **então** paleta e tipografia mudam sem alterar markup do componente.
- **Dado** um componente, **quando** referencia cor, **então** usa token semantic (nunca hex nem primitivo direto).

**Tasks:**

#### LEELA-S001-1-T1 · `tokens.json` (3 tiers) + gerador CSS vars / tema RN
- **Tipo:** ui-component · **Depende de:** E00-S000-1-T4 · **Estimativa:** M
- **Arquivos:** `packages/design-system/tokens/{primitives.brasa,primitives.leela,semantic,component}.json`; `packages/design-system/src/theme/generate.ts` (gera CSS vars web + objeto RN); `themes/{brasa,leela}.css`
- **Passos:** 1) codificar primitives dos dois temas (do design brief); 2) mapear semantic → primitive; 3) gerador que emite `:root[data-theme="brasa"]{...}` e `[data-theme="leela"]{...}` + export tipado p/ RN.
- **Aceite:** dado build, quando gero, então saem os dois arquivos de tema e um `tokens.d.ts` tipado.
- **Testes:** unit — semantic sempre resolve para um primitive existente no tema.

#### LEELA-S001-1-T2 · `ThemeProvider` (web + RN) com troca em runtime
- **Tipo:** ui-component · **Depende de:** T1 · **Estimativa:** S
- **Arquivos:** `packages/design-system/src/theme/ThemeProvider.tsx` (web via `data-theme` no root) + variante RN (context).
- **Aceite:** dado `<ThemeProvider theme="leela">`, quando monto, então `data-theme="leela"` aplica e os componentes re-tematizam.
- **Testes:** unit — troca de tema muda a var computada.

### LEELA-S001-2 · Componentes átomos · (de-para BH-E01)

**Como** dev de telas, **quero** os átomos do DS, **para** montar qualquer tela sem estilizar do zero.

- **MoSCoW:** Must · **Estimativa:** M · **RNs:** §2.16

**Critérios de aceite:**
- **Dado** cada átomo, **quando** uso, **então** cobre todas as variantes/estados e é acessível (foco, contraste AA).

**Tasks:**
#### LEELA-S001-2-T1 · Button (Primary/Secondary/Ghost/Destructive · sm/md/lg · estados)
- **Tipo:** ui-component · **Depende de:** S001-1-T2 · **Estimativa:** S
- **Arquivos:** `packages/design-system/src/components/Button/*`
- **Detalhe:** máx 1 Primary por tela; radius-sm; SemiBold 16px sem italic; foco 2px AA; `type="button"` default (RN anti-submit acidental).
- **Testes:** render por variante/estado; ação de clique; foco por teclado.
#### LEELA-S001-2-T2 · Input, Badge, Chip, Avatar, Divider
- **Tipo:** ui-component · **Depende de:** S001-1-T2 · **Estimativa:** M
- **Detalhe:** Input estados default/hover/focus(glow)/invalid(border-danger+erro inline)/disabled; Badge semânticos (brasa/heroico/vulcao/vitoria/alerta/neutro — nunca misturar semântica); Chip radius-pill active brasa; Avatar sm/md/lg + gradiente inicial + estado VIP; Divider subtle/default/strong.
- **Testes:** render por variante/estado; Input inválido mostra erro.

### LEELA-S001-3 · Moléculas & organismos · (de-para BH-E01)

**Como** dev de telas, **quero** os componentes compostos (tabela densa, sub-nav, modais, cards, shell), **para** entregar telas de domínio rapidamente e consistentes.

- **MoSCoW:** Must · **Estimativa:** L · **RNs:** §2.5, §2.7, §2.14, §2.15, §2.16

**Critérios de aceite:**
- **Dado** ConfirmModal, **quando** disparo ação destrutiva, **então** mostra preview de consequências (perde/mantém) e confirma em Vulcão (§2.15).
- **Dado** Table densa, **quando** listo, **então** linha 64px, header uppercase, paginação e EmptyState.

**Tasks:**
#### LEELA-S001-3-T1 · Shell (Sidebar 8 itens + Breadcrumb + Header 96px + SubNav §2.14)
- **Tipo:** ui-component · **Estimativa:** M
- **Detalhe:** Sidebar OPERAÇÃO (Visão Geral, Eventos badge, Clubs, Financeiro, Comunicação, Marcas, Analytics) + CONTA (Configurações); SubNav underline Brasa 2px + contador pill; Header 96px (avatar/nome/badges/metadados/ações).
#### LEELA-S001-3-T2 · Table densa (§2.5) + EmptyState + paginação + Popover de linha
- **Tipo:** ui-component · **Estimativa:** M
- **Detalhe:** linha 64px, padding 14/20, header uppercase 0.08em; EmptyState "Nenhum X encontrado com os filtros aplicados"; contador "mostrando X de Y"; Popover (só um aberto por vez, `stopPropagation`).
#### LEELA-S001-3-T3 · Modal + ConfirmModal (§2.15) com 4 vias de fechamento
- **Tipo:** ui-component · **Estimativa:** M
- **Detalhe:** overlay blur; larguras 480/560/640; fechar por cancelar/X/overlay/Esc; ConfirmModal com card do alvo + lista perde (Vulcão) + mantém (Vitória) + motivo opcional + checkbox notificar.
#### LEELA-S001-3-T4 · Toast, Cards (Evento/Desafio), Stepper, Skeleton, Tabs (§2.7)
- **Tipo:** ui-component · **Estimativa:** M
- **Detalhe:** Toast some 4s (danger persiste), borda esq 3px por variante; Card Evento (media 16/10 gradiente por categoria + badge modalidade, hover translateY); Card Desafio (progress-bar vitoria + 100% elev-brand); Stepper de checkout 5 etapas; Skeleton shimmer (nunca spinner solto em lista); Tabs todas no DOM.

### LEELA-S001-4 · Governança & catálogo · (de-para BH-E01)

**Como** time, **quero** um catálogo documentado e regras de governança, **para** que o DS permaneça único e consistente ao longo do tempo.

- **MoSCoW:** Should · **Estimativa:** S

**Critérios de aceite:**
- **Dado** o catálogo, **quando** abro, **então** vejo cada componente com props, variantes e exemplos, nos dois temas.
- **Dado** um PR de tela, **quando** usa cor/spacing hardcoded, **então** o lint de tokens acusa.

**Tasks:**
#### LEELA-S001-4-T1 · Catálogo (Storybook) dos componentes nos 2 temas
- **Tipo:** ui-component · **Estimativa:** S
#### LEELA-S001-4-T2 · Lint de tokens (proíbe hex/px hardcoded em componentes) + doc de governança
- **Tipo:** setup · **Estimativa:** XS
- **Arquivos:** `leela-specs/governanca-design.md` (regras: semantic-only, flat §2.16, a11y AA, nomenclatura, processo de adicionar componente/token).

---

## Ordem sugerida

`S001-1 (tokens+tema) → S001-2 (átomos) → S001-3 (moléculas/organismos) → S001-4 (governança)`. Ao fim, Onda 1 (E05/E03/E02) consome estes componentes.

---

## Regras de negócio novas (IA-MENU · Vitor 2026-07-19)

Rodada `02-rodadas/2026-07-19-ia-menu/`. O E01 é o dono da navegação — a arquitetura de informação do menu principal é regra deste épico, e os épicos de domínio (E09, E11, E19, E03) apenas consomem o endereço que ela define. Verbatim e desenho completo em `00-decisao.md`; mapa das rotas em `01-mapa-de-para.md`.

- **RN-233 · O menu principal tem 6 áreas.** OPERAÇÃO: **Visão geral · Eventos · Clubs · CRM · Marcas**; CONTA: **Configurações**. Saem `Financeiro` (os dois filhos se mudaram: Análise → CRM › Visão geral; Repasses → Eventos › Repasses) e `Analytics` (placeholder sem rota, hoje suprimido no consumidor pela RN-821 — passa a ser removido do `DEFAULT_SIDEBAR_SECTIONS` do próprio DS, e o filtro `IDS_SUPRIMIDOS` do painel deixa de existir). `Comunicação` vira **CRM** (id `crm`, destino `/crm`). **Item de menu sem rota é proibido** — por isso `Configurações` passa a apontar para `/conta`, fechando a última entrada inerte. A troca dentro de cada área acontece por SubNav no padrão §2.14 (underline 2px na ativa, divisória, rolagem lateral própria em tela estreita), o mesmo componente que Eventos, Clubs e o antigo Financeiro já usavam.
- **RN-234 · Rota antiga nunca quebra.** Toda URL que existia antes de uma reorganização de navegação redireciona para o destino novo, preservando o que vier depois do prefixo. Para esta rodada: `/financeiro` → `/crm`; `/financeiro/repasses` → `/eventos/repasses`; `/financeiro/*` → `/crm`; `/crm/{chave}` no formato antigo → `/crm/clientes/{chave}`. O redirecionamento é declarado na entrada da rota (sem camada nova, sem configuração de servidor) e **cada linha do mapa tem teste próprio** — a falha aqui é silenciosa no build e barulhenta na cara de quem clicou. Armadilha estrutural: a rota legada `/crm/:param` casa com qualquer segmento, então as subdivisões nomeadas (`clientes`, `comunicacao`) precisam ser declaradas antes do parâmetro, com teste provando que `/crm/clientes` abre a lista e não entra em laço.

### Efeito no S001-3-T1 (Shell)

A task de Shell foi escrita com "Sidebar OPERAÇÃO (Visão Geral, Eventos badge, Clubs, Financeiro, Comunicação, Marcas, Analytics) + CONTA (Configurações)" — **8 itens**. Esse inventário está superado pela RN-233. O contrato do componente não muda (seções, itens, badge, item ativo derivado do pathname); muda a lista default e a documentação que a acompanha: `Sidebar.stories.tsx`, `Sidebar.docs.mdx`, `LLM.txt` e a suíte do Sidebar precisam ser reconciliados para 6 itens no mesmo lote — senão o catálogo passa a documentar um menu que não existe, que é exatamente o tipo de divergência que a governança do S001-4 existe para impedir.

**Execução:** `IAM-T1` (menu de 6 áreas) e `IAM-T6` (redirects) em `02-rodadas/2026-07-19-ia-menu/02-fila-codigo.md`.

**Rota de modelo (Regra L — o teto é opus, haiku só com gate determinístico, sonnet proibido no Leela):** `IAM-T1` é **opus xhigh**, porque nenhuma suíte prova que `Sidebar.docs.mdx`, `Sidebar.stories.tsx` e `LLM.txt` *descrevem* o menu que passou a existir — o teste do componente passa com a documentação errada, e catálogo divergente é justamente o que a governança do S001-4 existe para impedir. `IAM-T6` é **haiku**, condicionada a um gate determinístico cravado na fila: um teste orientado a tabela que resolve cada rota legada e cada negativo (`/crm/clientes` não redireciona, no máximo um salto). Sem esse teste no PR, T6 não é haiku — é opus.

### Apêndice de execução (2026-07-26 · lane IAMENU-EXEC)

**RN-233 e RN-234 estão construídas.** `IAM-T1` `41fcb73` · `IAM-T6` `7a8f158`. Ambas rodaram em **opus xhigh** — a rota haiku condicional do T6 foi absorvida pela lane, mantendo o gate que a condicionava.

**RN-233.** `DEFAULT_SIDEBAR_SECTIONS` tem 6 itens; `financeiro` e `analytics` saíram do catálogo do DS e `IDS_SUPRIMIDOS` foi deletado do painel — a supressão deixou de ser filtro no consumidor e virou remoção na fonte, como a RN-823 exige. `comunicacao` virou `crm` (rótulo "CRM"); o ícone seguiu o mesmo (`Bell`): a rodada renomeia o item, não redesenha a nav. `Configurações` ganhou `/conta` no `IAM-T5`, fechando a última entrada inerte. Stories, `docs.mdx` e `LLM.txt` reconciliados no mesmo commit, e o `LLM.txt` passou a carregar o **inventário nominal dos 6 itens** com a instrução explícita de não reintroduzir os ids mortos — o catálogo deixou de poder mentir em silêncio. Testes novos que travam isso: inventário exato e ordenado (ids + rótulos), ausência dos 3 ids mortos, e uma varredura que exige destino para **todo** item do menu.

**RN-234.** Os 4 redirects vivem em `routes/_system/RotasLegadas.tsx`, que exporta a tabela como **fonte única** consumida pelo `App.tsx` e pelo teste — não há como divergirem. O 4º (`/crm/{chave}`) mora dentro do `CrmRoutes`, de propósito: depende da precedência sobre as subdivisões nomeadas, e separar o redirect de quem declara essa ordem é como o laço nasce. Gate entregue com **44 testes** sobre o roteador real: as 4 linhas do mapa, caminho fundo, chave com caractere especial, os negativos com **zero salto** medido pela trilha de pathnames, e a guarda anti-laço em 11 entradas.

**Achado que vale a lição:** a primeira versão exportava `<RotasLegadas />` como componente React. O `<Routes>` do react-router só aceita `<Route>` ou `React.Fragment` e **lança em runtime** diante de qualquer outro componente — teria derrubado o painel inteiro na primeira renderização, e nem `tsc` nem `eslint` pegariam. **Quem pegou foi o gate orientado a tabela**, antes do commit. É a prova prática do argumento que travou a rota do T6: falha silenciosa é ausência de gate, e o gate se paga na primeira vez que roda.

**Divergência de catálogo ainda aberta (fora do território do T1):** `packages/design-system/showcase/src/sections/IconsPage.tsx` descreve "os 8 ícones de `DEFAULT_SIDEBAR_SECTIONS`" com Financeiro e Analytics na lista hardcoded. Não quebra build nem teste — e é exatamente a classe de problema que a RN-233 existe para fechar. Merece card próprio.

---

## Thumb — miniatura de mídia de entidade (RN-236 · lane THUMBS-LISTAS 2026-07-27)

Componente novo no DS, `2e48d28`. A **RN-236** é do **E03**; aqui fica o
primitivo que ela exige.

**Por que nasceu no DS e não na tela.** Três superfícies do painel pediam a mesma
caixa — imagem de kit 1:1 (RN-227), logo de marca 1:1 (RN-171), capa de evento
1.9:1 (RN-228) — e o DS não publicava nenhuma. Governança §7: o que a tela
precisa e o DS não tem nasce no DS.

**Por que não é duplicata.** O `Avatar` representa **pessoa**: é circular por
contrato, `aspect-square` fixo, exige `name` e o publica como
`role="img"`/`aria-label`, e deriva iniciais e gradiente desse nome. O thumb
híbrido do `EventRow` **fica onde está**: o fallback dele é semântico (gradiente
`--thumb-{modalidade}` + ícone da modalidade) e o mesmo elemento carrega a
colocação no grid responsivo da linha (`max-lg:row-span-3`) — migrar acoplaria em
vez de deduplicar. Os dois compartilham a família de tokens `--thumb-*`.

**Anatomia.** A **largura** vem do token do tamanho (sm 40 · md 64 · lg 96) e a
**altura** sai da razão (`aspect-[1/1]` / `aspect-[1.9/1]`, razões sem unidade
permitidas pela §2). Uma medida por tamanho serve às duas proporções.
`object-cover` sempre. `loading="lazy"` **por default**, porque o componente
nasceu para lista; `lazy={false}` na miniatura única ao lado de campo, já visível
na abertura.

**Fallback é o ponto, não o detalhe.** Cai nele sem `src` **e também quando a URL
morre** (`onError`) — é o que impede o quadrado quebrado do navegador de aparecer
quando uma URL de Storage é revogada. Engine de imagem própria (`img` +
`onError`), a mesma decisão já registrada no `Avatar`: o `AvatarImage` do Radix
espera o evento de load e nunca renderiza em jsdom.

**A11y e AA.** Mídia decorativa por default (`alt=''`): nas três superfícies o
nome fica ao lado e já é o rótulo — mesma decisão do `EventRow`. O componente não
tem estado interativo (caixa passiva, sem hover/focus/pressed), então o único par
de texto é o do fallback, `text-tertiary × surface-sunken`, já provado na matriz.
Nenhum par novo.

**Tokens novos** (tier component, família `--thumb-*`): `size-sm/md/lg`, `radius`,
`fallback-icon-size` — todos referenciando a escala, e por isso os 5 entraram de
graça no teste de resolução dos dois temas (+10 casos gerados).

**Gates:** tsc 0 · eslint 0 · 19 testes do componente · suíte do DS **1089/1089**
(baseline 1060 + 19 + 10 de resolução de token). Showroom, `stories`, `docs.mdx` e
`LLM.txt` no mesmo commit, como a disciplina do DS exige.

### Review antagonista (lane THUMBS-REV, 2026-07-27) — dois achados no DS

**`ratio`/`size` nulos apagavam a caixa (`537d613`).** `VariantProps` do cva
publica `null` como valor legal de toda variante e `defaultVariants` só cobre
`undefined`. Nos outros componentes do DS isso degrada a estilo; aqui degradava a
**tamanho zero**, porque as duas únicas medidas da caixa saem justamente dessas
variantes. `<Thumb ratio={null} />` passava em tsc e eslint e sumia da tela. E o
`null` já estava exposto ao painel: o `ImageUploadField` publica
`previewMiniatura?: ThumbProps['ratio']`. Corrigido por coerção para o default,
com teste que falha se a coerção sair.

**O `Thumb` não entrou no índice de contratos do package (`589950a`).** O
componente nasceu com `LLM.txt` próprio, mas `packages/design-system/LLM.txt` —
a porta de entrada que a governança §8 manda consultar — não ganhou a linha. Sem
ela, o próximo agente que precisar de miniatura lê a tabela, não acha nada e
refaz o `<img className="h-10 w-10">` à mão. O cabeçalho também estava com a
contagem errada; agora confere com o disco (48 diretórios, 36 com contrato).

**O que sobreviveu ao ataque:** a decisão de não migrar o thumb do `EventRow`
(conferida na fonte: gradiente `--thumb-{modalidade}` e `max-lg:row-span-3` estão
lá, o contrato de fallback é mesmo outro); os 5 tokens novos nos dois temas
(regerei `generate-tokens` e o diff dos gerados veio **vazio** — CSS e
`rn-themes.ts` estão em sincronia com o JSON, o que a suíte por si só não prova);
o par AA do fallback (`text-tertiary × surface-sunken` = **6.95:1** brasa,
**4.89:1** wine); e o `LLM.txt` do componente, fiel ao `.tsx` prop a prop.

Suíte do DS após os fixes: **1090/1090** (1089 + 1 do teste de variante nula).

---

## O menu principal ganha a sétima área (SPECS-0728 · 2026-07-28)

Rodada `02-rodadas/2026-07-28-formbuilder-templates/`. A DEC-0728B pediu os formulários no
menu principal, como templates reutilizáveis. A **RN-389** (dona no E04) é supersede
parcial do **inventário** da RN-233: o menu passa de seis para sete áreas, com
**Formulários** entrando em OPERAÇÃO.

**O que a RN-233 protege e continua protegido:**

- item de menu sem rota permanece proibido, e o item novo nasce com destino real;
- o catálogo do design system continua sendo a **fonte** da lista, sem filtro no
  consumidor, que foi exatamente o ganho da IAM-T1 quando `IDS_SUPRIMIDOS` foi deletado.

**O custo, declarado.** A RN-233 foi construída com um teste de inventário exato e ordenado
por ids e rótulos, mais uma varredura que exige destino para todo item. Acrescentar a
sétima área obriga a mexer, **no mesmo lote**, em `DEFAULT_SIDEBAR_SECTIONS`,
`Sidebar.stories.tsx`, `Sidebar.docs.mdx`, `LLM.txt` e na suíte do Sidebar. Metade da lista
atualizada é pior do que nenhuma, porque o catálogo volta a poder mentir em silêncio.

**Dívida conhecida a fechar junto.** A `IconsPage.tsx` do showcase ainda descreve "os 8
ícones de `DEFAULT_SIDEBAR_SECTIONS`", com Financeiro e Analytics numa lista fixa. A
divergência foi registrada na entrega da RN-233 e continua aberta. Ela deve ser corrigida
na mesma task da sétima área; caso contrário o catálogo passa a errar por dois motivos
diferentes ao mesmo tempo.

Task: `S313-T1`, especificada no E04. Fila em
`02-rodadas/2026-07-28-formbuilder-templates/03-fila-codigo.md`.

## O grupo de escolha ganha respiro e área de clique (DEC-0802B · 2026-08-03 · lane ACHADOS-0802, frente D)

Dois achados do dono no checkout foram medidos antes de consertados, e os dois eram do design system,
não da tela que os expôs. Valem para **todo `RadioGroup` do produto**, no painel e na landing.
Commits `cc93309` e `dde8182`, trace `leela-build-2d6ee98d`.

**O rótulo do grupo estava colado no primeiro cartão, e a separação era zero por construção.** O
`<fieldset>` é `flex flex-col` com `gap` por token, e a `<legend>` é a *rendered legend* do HTML: o
navegador a tira do formatting context para desenhá-la sobre a borda, então **o `gap` nunca a
alcança**. Não havia margem em lugar nenhum, e o consumidor não contribuía com um pixel. O conserto é
a margem inferior da legend — que **é** honrada, porque ela é um bloco dentro da área de borda do
fieldset — usando o **mesmo token do `gap`**, para o ritmo do grupo continuar sendo um número só.
⚠️ jsdom não faz layout: o teste asserta o mecanismo (a legend carrega a margem, e a margem é o mesmo
token), e a prova visual é do olho do dono.

**O card inteiro passou a selecionar.** O `<label>` cobria só a linha do título; a descrição e o
painel revelado ficam fora dele por regra de acessibilidade (`aria-describedby` não entra no nome
acessível, e conteúdo interativo não mora dentro de `label`), e o padding do card não era de ninguém —
enquanto o card inteiro mostrava `cursor-pointer`. A mão prometia um clique que metade da área não
entregava. O handler tem duas guardas, **cada uma com caso próprio que morde**:

| Guarda | O que ela impede |
|---|---|
| `checked` — card marcado não reprocessa | o painel revelado só existe quando marcado; sem ela, escolher um tamanho dentro do card do kit borbulharia até o card e chamaria o `onValueChange` do PAI com o mesmo valor, e no checkout esse handler zera kit e tamanhos |
| `label.contains(target)` | clique no título dispararia `onValueChange` duas vezes (nativo mais handler), e handler de consumidor não é obrigado a ser idempotente |

**Caminho rejeitado, com razão declarada:** o pseudo-elemento `before:inset-0` era a solução mais
limpa em CSS e ficaria **sem prova executável**, porque jsdom não faz hit-test — o aceite de
interação que a fila exigia seria impossível. E o overlay ainda precisaria de exceção para o painel
revelado continuar operável.

**Falsificação executada:** `Radio.tsx` restaurado do HEAD ⇒ 3 vermelhos em 30 (a margem da legend e
os dois cliques novos); os demais passam nos dois mundos e estão declarados como guardas no arquivo.
Suíte do design system **1098/1098** em 59 arquivos, tsc/eslint/tsup 0.

## Delta o painel passa a se chamar Painel Profissional (2026-08-04 · SPEC-QUALIFICACAO)

Spec e inventário completo em
`02-rodadas/2026-08-04-qualificacao-profissional/01-spec-conta-profissional.md` §Parte 9.

### RN-468 · Painel Profissional é o nome da superfície, e o rebatismo é de rótulo (nova, dona · 2026-08-04)

Decisão do dono, verbatim: *"Chamaremos também o nosso painel de Painel Profissional."*

O nome aparece hoje em três alturas, e só a primeira muda:

| Altura | Exemplo | Muda? |
|---|---|---|
| Rótulo visível | "Painel do Organizador" (`apps/painel/src/shell/RootShell.tsx:63`), `<title>Leela Painel</title>` (`apps/painel/index.html:7`), CTAs da landing | **sim** |
| Identificador técnico | diretório `apps/painel`, pacote `@leela/painel`, site `leela-hub`, `PAINEL_URL_PADRAO`, `LEELA_PAINEL_URL`, projeto Sentry `leela-painel` | **não** |
| Vocabulário de domínio | coleção `profissionais/{uid}`, campo `papeis[]`, claim `tenant_owner` | **não, já está certo** |

Renomear identificador produziria um diff enorme, quebraria caminho de import e não mudaria uma
letra do que a pessoa vê. É a mesma disciplina que o produto já pratica ao manter coleções em
PT-BR camelCase sem renomeá-las quando a copy muda
(`04-engenharia/convencoes-codigo.md:58`).

**Por que o nome fortalece o enquadramento durável, e não é rebatismo cosmético.** A D-0802-1
cravou que a Leela é hub de experiências de bem-estar e que corrida é instância, nunca
categoria. "Organizador" contradiz isso na raiz: descreve quem produz um evento e deixa de fora
o professor de ioga que vende a própria aula, a assessoria que vende plano de treino e o clube
que cobra mensalidade. "Profissional" cobre os quatro, e não é palavra nova: a coleção
`profissionais/{uid}` se chama assim desde o começo, `papeis[]` já é lista, e `marcas`,
`dashboard` e `analyticsSnapshots` já penduram nela. O código sempre soube que eram
profissionais; a copy é que ficou presa em organizador. A troca alinha a superfície ao modelo
que já existe embaixo dela.

Colisão nula, medida: "profissional" aparece hoje como rótulo visível em **um único ponto** do
produto inteiro (`apps/painel/src/routes/marcas/MarcasPage.tsx:350`), e nenhuma rota contém a
palavra. `profissionais/{uid}` passa a ser o nome canônico, o que já era verdade de fato.

**"Organizador" não morre.** Continua sendo o papel de quem produz eventos, e continua correto
no convite de organizador, no `PapelEvento` e em `evento.organizadorId`. Deixa de ser o nome do
lugar. Painel Profissional é a casa; organizador é uma das coisas que se é dentro dela.

Ponta que acompanha: `packages/core/src/perfil/perfil.ts:79-80` reserva os handles públicos
`organizador` e `organizadores` e **não reserva `profissional`**. A reserva entra junto, senão
alguém registra `@profissional` no dia seguinte.

**Ordem obrigatória:** o rebatismo entra no mesmo lote da reescopagem do `/cadastrar` (RN-461),
porque toca os mesmos arquivos. Separados, a segunda passada conflita com a primeira.

## Delta o movimento dos overlays e a supressão da barra superior (2026-08-05 · BUILD-MOTION → REV-MOTION → BUILD-MOTION-ASSIM · BUILD-SUPRIMIR-TOOLBAR → REV-PAINEL)

Duas frentes de design system no mesmo dia, as duas fechadas por review antagonista e as duas
**no ar** desde o deploy de 05/08. Nenhuma regra de negócio nova: o que sai daqui é diretriz de
desenho, e ela vale para quem encostar nos primitivos depois.

### S002 · abrir e fechar deixam de ser o mesmo movimento

| Tarefa | Estado | Prova |
|---|---|---|
| S002-T1 · o modal da landing para de nascer preso ao cabeçalho | ✅ | `504b5b3a` — o diálogo não portalizava |
| S002-T2 · overlays entram e saem animados, e a duração vira token | ✅ | `bf93ed51` |
| S002-REV · a review antagonista acha dois defeitos de ciclo de vida | ✅ | `bc4f2304` — os dois de severidade **alta** |
| S002-T3 · oitocentos para abrir, duzentos e cinquenta para fechar | ✅ | `df0848a0` — decisão do dono, verbatim: *"800ms para abrir, 250ms para fechar."* |
| S002-T4 · o menu suspenso em saída, e o overlay que some por corte no login | 📋 | devolvidos pela review, sem dono |

**A razão da assimetria está escrita em três lugares do código, de propósito, para não ser
otimizada de volta por simetria:** a abertura é onde a marca aparece; o fechamento acontece depois
de a pessoa já ter decidido sair, e ali a lentidão vira pedágio. Fechar é o gesto de quem quer
voltar a mexer na página, e é o pior lugar do produto para gastar tempo. O menu de cento e vinte
milissegundos **não** foi dividido pela mesma régua invertida: em cento e vinte não há pedágio a
cobrar.

**Diretrizes que a rodada produziu, e que valem para o próximo primitivo:**

- **As duas durações viajam em par.** A interface recebe um objeto com entrada e saída, nunca dois
  argumentos soltos, para que abrir e fechar não possam ser passados trocados por engano. O teste
  lê o número do tema **gerado**, então nenhum número precisa ser caçado em teste, e trocar a saída
  pela entrada derruba três casos.
- **A trava de rolagem é contada, não guardada por cada um.** Cada diálogo salvava e restaurava o
  estilo do corpo da página por conta própria; com a saída animada, o desmonte do primeiro devolvia
  a rolagem oitocentos milissegundos depois, com o segundo já aberto. O conserto é um contador
  compartilhado: o último que sai destrava.
- **Quem devolve o foco é o topo da pilha, não o último a fechar.** Vale registrar que o primeiro
  conserto estava errado — a regra "só o último devolve" quebra o caso empilhado —, e que o caso
  empilhado virou teste permanente exatamente para o próximo conserto não ser vítima do anterior.
- **Foco só em nó conectado.** Chamar foco num nó já removido não falha e não faz nada: o foco cai
  no corpo da página, e some para quem navega por teclado.
- ⛔ **Encurtar duração nunca conserta corrida — só a torna mais rara, que é o pior estado
  possível.** A janela em que dois overlays disputam a página encolheu de oitocentos para duzentos
  e cinquenta milissegundos e **não fechou**. Quem for mexer nisso conserta a corrida, não o número.
- **O artefato buildado do design system não é versionado.** Quem deploya precisa rodar o build do
  design system antes, e quem roda a suíte do painel depois de mexer aqui está testando a versão
  anterior enquanto não houver alias no runner (fila técnica, RS1-27).

### S003 · a barra superior sai, e cada área segura o próprio respiro

| Tarefa | Estado | Prova |
|---|---|---|
| S003-T1 · a barra sai do layout raiz, com os imports órfãos | ✅ | `2332bebb` — 89px no desktop, 101px abaixo de 1024, contados token a token |
| S003-T2 · o teste que afirmava presença vira canário da ausência | ✅ | `2332bebb` — reintroduzir a barra deixa quatro das cinco asserções vermelhas |
| S003-REV · três defeitos corrigidos, mais um pré-existente | ✅ | `c9967d87`, `fb9f3b09`, `5f9f2b25`, `b793b906` |
| S003-T3 · o primitivo órfão e os sete tokens sem consumidor | 📋 | `packages/**`, outra alçada — fila técnica, RS1-24 |

**A lição de método desta frente é a mais transferível do dia, e a review a formulou melhor do que
qualquer resumo: as afirmações de medição do construtor estavam exatas; o que falhou foi a
conclusão tirada delas.** O argumento que dispensou recompor o espaço — "as telas já entregam o
cabeçalho de página rente ao topo, e o respiro é dele" — é verdadeiro, e é verificável que toda
rota de plataforma abre assim. Ele só nunca foi conferido contra as áreas que **não** abrem com
cabeçalho de página. Duas abrem com menu secundário, que tem altura fixa e zero folga vertical, e
sete rotas de produtor passaram a nascer com metade do respiro do controle declarado.

**Diretrizes:**

- **Controle dentro de controle é defeito, e o teste por papel não o pega.** Um link envolvendo um
  botão produz HTML inválido, dois pontos de tabulação para uma ação só, e o anel de foco no
  elemento errado — mas a busca por papel de link passa nas duas formas, porque o nome acessível do
  link é computado a partir do texto do botão de dentro. **A convenção da casa é o botão por fora
  com o comportamento de link por dentro**, que é o par que a tela de conta já usava; o commit
  tinha invertido. O mesmo aninhamento estava vivo, de antes, nos dois atalhos da tela de kits.
- **Linha de ação com texto ao lado precisa refluir.** Um grupo de ações que não encolhe ao lado de
  um texto que também não encolhe estoura a largura em trezentos e vinte pixels, e pelo CSS de
  overflow um eixo travado promove o outro: volta a barra de rolagem horizontal que o dono já
  reportou duas vezes. O par que resolve é o mesmo que o cabeçalho de página do design system usa.
- **O respiro de cada área é da moldura da área, nunca do shell.** Recompor no shell ressuscitaria
  a barra invisível que a decisão do dono removeu, e alcançaria as telas de plataforma, que são o
  controle. Os vinte pixels escolhidos são **calibragem, não teorema**, e por isso subiram ao painel
  como **RESPIRO-1**.
- **Nenhum número deste relatório saiu de pixel medido em navegador.** Todos saíram dos tokens do
  design system e da árvore renderizada, porque o runner de teste não faz layout. A conferência
  visual continua pendente e é do dono.
