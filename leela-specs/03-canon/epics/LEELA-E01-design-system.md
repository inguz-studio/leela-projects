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
- **Semantic** (compartilhado entre temas): `--surface-base/raised/overlay/high/sunken`, `--text-primary/secondary/tertiary/disabled/brand/danger/success`, `--action-primary(+hover/pressed/disabled)/secondary/destructive`, `--border-subtle/default/strong/brand/focus/danger`, feedback success/danger/warning/info, e `color.scheme` — a polaridade do tema (`dark` no brasa, `light` no wine), único token que também sai como **declaração** CSS (`color-scheme`) e não só como custom property (RN-518).
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

---

## Delta o cromo do navegador passa a obedecer ao tema (2026-08-08 · SCROLLBAR-TEMA)

Terceiro relato de rolagem do dono, e o primeiro que não é sobre a barra existir:

> "o scroll também não está respeitando as regras de DS, para ficar no dark mode."

Os dois anteriores eram sobre **existência** e estão fechados: o eixo solto promovido a `auto` na
cascata do menu (`fd6e5e69`, S315-F) e o `.sr-only` absoluto esticando o `scrollHeight`
(`a06c16d4`). Este é sobre **cor**, e a causa é de outra natureza: `color-scheme` não existia em
ponto nenhum do fonte, e sem ela o navegador assume o esquema claro para desenhar o cromo que não
é do produto. Não é o DS sendo descumprido; é peça que nunca foi escrita.

### RN-518 · a polaridade é do tema, e ela é a única declaração que sai de um token (nova · 2026-08-08)

Todo tema declara a própria polaridade num token semântico, `color.scheme`, e o gerador a
transforma em `color-scheme:` dentro do bloco daquele tema. Três afirmações, cada uma com o
motivo:

1. **Nasce no tema, não no app.** Um `color-scheme` colado no `index.html` do painel resolveria o
   painel e deixaria de fora a landing, o showcase e o Storybook. No tema, ele nasce certo em
   qualquer consumidor que importe o CSS, inclusive os que ainda não existem.
2. **Cai no elemento raiz, e isso é requisito, não detalhe.** `color-scheme` só governa a barra de
   rolagem da página a partir do `<html>`. Os dois apps já põem `data-theme` ali — o painel pelo
   `ThemeProvider`, a landing estaticamente no layout —, e antes do mount o
   `:root:not([data-theme])` cobre. Se algum dia o atributo migrar para o `<body>` ou para um
   `<div>`, a barra volta a nascer clara e **nenhum teste pega**.
3. **O valor acompanha o tema; constante é defeito.** O `wine` **não é um tema escuro**, ao
   contrário do que a suposição corrente dizia: `--surface-base` é `#FDFAF7` e o texto é `#262220`.
   Um `dark` fixo já estaria errado hoje. Tema ausente de token não recebe declaração nenhuma, e
   cai no `normal` do navegador — degradação escolhida, porque carimbar um esquema errado é pior
   que não carimbar.

**Alcance maior que a barra, e declarado:** `color-scheme` é herdado, então a mesma linha muda
também controles de formulário nativos, o caret e o preenchimento automático do navegador nos
dois apps. Isso é ganho, e é a razão de o risco desta mudança ser "amplo" apesar de ela ter uma
linha.

**Diretrizes:**

- **A cor da barra é do tema; a existência dela é do `utils/scroll.ts`.** São dois arquivos e duas
  perguntas, e confundi-los foi o que fez o terceiro relato parecer reincidência do primeiro. Quem
  mexer na aparência mexe no tema; quem mexer na existência mexe nas constantes de rolagem.
- **`SCROLL_X_ONLY_SEM_CROMO` e `SCROLL_X_ONLY` ficam intactos.** Navegação sem cromo por ordem do
  dono dita duas vezes; matriz de kits com a barra à mostra, porque ali ela é a única pista de que
  há mais coluna.
- **Estilizar a barra desliga o cromo nativo, não convive com ele.** `scrollbar-color` faz o Chrome
  perder o desenho fino, e `::-webkit-scrollbar` ignora `color-scheme` por completo — quer dizer,
  a preferência de acessibilidade configurada no sistema da pessoa deixa de valer nas nossas telas.
  Por isso a barra nativa é o default e a estilizada subiu ao painel como **SCROLLBAR-1**, com os
  candidatos medidos: `--border-default` reprova (1,67:1 no brasa, 1,46:1 no wine, contra um piso
  de 3:1), `--border-strong` passa (4,13:1 e 3,60:1) e `--primary-500` passa com folga (5,69:1 e
  10,33:1).
- **Nenhum teste desta entrega prova o pixel.** jsdom não pinta barra de rolagem. Os 15 casos
  provam contrato: a declaração existe em cada tema, vem do token, some quando o token some, e a
  polaridade declarada bate com o brilho real de superfície contra texto — esse último é a trava
  do terceiro tema. A cor na tela é conferência do dono, em navegador, depois do deploy.

### RN-519 · quem estampa `data-theme` fora do DS tem de estampar um tema que existe (nova · 2026-08-08 · REV-SCROLLBAR)

Corolário operacional da RN-518, e ela nasceu de um defeito real, não de zelo. A RN-518 afirma que
a declaração "nasce certa em qualquer consumidor que importe o CSS". Isso é verdade para o CSS e
falso para o **atributo**: quem escreve `data-theme` com um valor que não tem bloco no tema não
recebe token nenhum e não recebe `color-scheme` nenhum. `:root:not([data-theme])` também não o
socorre, porque o atributo *está* lá — só está errado.

O `packages/design-system/showcase/index.html` é a única superfície do repositório que decide o
tema **sem passar pelo DS**: sendo HTML estático, ele não importa o TypeScript e carrega uma cópia
escrita à mão do script anti-FOUC. A cópia ficou no nome antigo do tema depois do rename
`leela` → `wine`, e errava nos dois sentidos — `wine`, que é o valor que o toggle grava hoje, caía
no fallback e a tela nascia `brasa`; `leela`, ainda em `localStorage` de quem usou o showroom antes
do rename, era estampado tal e qual. Nos dois casos o script entregava exatamente o flash que
existe para evitar, e desde `8e10ab8f` o flash carrega junto a polaridade do cromo do navegador.

**A regra:** superfície que estampa `data-theme` por conta própria só pode estampar valor com bloco
publicado em `themes/index.css`, e o valor tem de ser o **mesmo** que o `ThemeProvider` escolherá no
mount — divergência entre os dois é a definição operacional de flash. A trava é
`src/theme/__tests__/showcase-init-theme.test.ts`, e ela **executa o script real extraído do HTML**
em vez de reimplementá-lo: uma reimplementação passaria verde com o arquivo errado, que é o defeito.

**Dívida declarada, não paga:** a cópia continua sendo cópia. O caminho certo, se ela sair de
sincronia outra vez, é injetar `getThemeInitScript()` por `transformIndexHtml` no vite do showroom;
foi recusado agora por trocar um defeito de duas linhas por um passo de build numa superfície só de
desenvolvimento (o showroom não tem alvo de Hosting).

## Delta o chrome do painel entra no tema novo (2026-08-10/11 · DELTA-UX → AJUSTES-DONO → PARCERIAS-NAV)

Origem: as levas 3 e 4 de decisões do dono validando o `:4601`, registradas em
`02-rodadas/2026-08-09-redesign-ds/01-decisoes-dono-1008-retomada.md` (D-1008-R4, R5, R6, R7,
R11, R14, R18). O tema novo e a camada de vidro já estavam nos tokens e na tela; o que faltava
era o resto do painel — menus, perfil, altura de botão, cartão e barra de abas — falar a mesma
língua. Duas histórias novas, porque nenhuma das existentes deste épico cobre o assunto: a S002
é movimento de overlay e a S003 é a barra superior.

**O código destas duas histórias vive na branch `redesign-engajamento-v2` e ainda não está no
ar.** Enquanto não houver merge e deploy com conferência visual, elas ficam em execução, nunca
em feito.

### S004 · os menus, o perfil e a altura dos controles no tema novo

| Tarefa | Estado | Prova |
|---|---|---|
| S004-T1 · menu suspenso, filtro e dica voltam a ser opacos (R4) | ✅ | `1a5d8491` — a causa não era portal fora da árvore de tema: sob o vidro o `--surface-overlay` vira filme de 4,5% e todo painel flutuante pintava esse filme tendo só a página escura atrás |
| S004-T2 · o menu de celular ganha o desenho novo (R5) | ✅ | `486ebaa4` — a anatomia off-canvas fica; só a pele muda |
| S004-T3 · o perfil abre um painel pequeno com configurações e a troca de painel (R6) | ✅ | `55ea0d42` — rótulos "Acessar painel master" e "Acessar painel profissional", coerentes com a RN-468 |
| S004-T4 · o botão volta à altura do padrão (R7) | ✅ | `1e7cdfe9` — as medidas de 48 e 44 pixels vindas do protótipo morreram; o padrão do design system ganha do protótipo aqui, por decisão do dono |
| S004-T5 · o indicador de item ativo desliza (R14) | ✅ | `8cb1631b`, `ea79e9b9` — um elemento que se move por medição de layout, no lugar de um traço por aba |
| S004-T6 · a barra de abas fica transparente, com contraste medido contra a página (R18) | 🔄 | lane PARCERIAS-NAV · o fundo de pílula sai da navegação de área; segmentado dentro de cartão e menu flutuante ficam como estão |

**A régua que ficou:** altura de controle é a do padrão canônico, não a do protótipo. Quando as
duas medidas divergirem, o protótipo perde — foi essa a palavra do dono, e ela inverte um pino
do arquivo de referência.

**O que a R4 ensinou sobre diagnóstico:** a hipótese escrita no contrato da lane estava errada e
foi derrubada por teste antes de virar código. Painel flutuante em portal está dentro da árvore
de tema; o preto vinha da cascata do vidro. Vale a nota porque a hipótese errada era plausível e
teria produzido um conserto que não conserta.

### S005 · a revisão de componentes vira roadmap, cânone e trava

| Tarefa | Estado | Prova |
|---|---|---|
| S005-T1 · o cartão volta a existir onde a informação estava solta (R11) | ✅ | `a60690c2`, `3ddb3c99` — kit, item e o bloco de modalidade viraram o Card canônico; a causa era marcação crua sob o filme de vidro, não a tela |
| S005-T2 · o inventário das telas que ainda usam superfície crua | ✅ | `02-rodadas/2026-08-11-roadmap-componentes/02-inventario-componentes.md` — 223 divergências e 106 instâncias de layout sem cânone, com arquivo e linha; a medição **derrubou** o número que esta linha carregava (ver delta abaixo) |
| S005-T3 · o mapa padrão para componente canônico, com o que falta proposto | ✅ | `03-canon/canone-de-componentes.md`, promovido a canônico; as quatro lacunas viraram a decisão CANONE-1 no painel do dono |
| S005-T4 · as ondas de revisão, cada uma com o número de passos até o trabalho antes e depois | ✅ | `02-rodadas/2026-08-11-roadmap-componentes/04-ondas-roadmap.md` — seis ondas por JTBD, com os passos medidos em seis telas |
| S005-T5 · a trava que reprova controle cru fora do design system | ✅ | `2ceb9fd4` — `packages/design-system/lint/leela-canon-plugin.mjs` (duas regras, 17 casos de `RuleTester`) + `scripts/gate-canon.mjs` com `gate-canon.baseline.json` versionado e catraca; `pnpm gate:canon`. Baseline inicial e as três decisões de implementação em `.nirvana/handoffs/leela-canon-onda0-20260811.md` |

**Por que uma história e não uma rodada solta:** o dono já disse que respeitar componente é
critério de aceite de interface, e a mesma família de defeito apareceu três vezes em duas
semanas. A revisão vira história do épico para poder ser cobrada como qualquer outra.

**Ordem de disparo:** o inventário só mede a verdade depois que o redesign entrar na main. Medir
antes seria medir tela morta.

## Delta o cânone de componentes nasce, e a medição corrige o número do próprio épico (2026-08-11 · ROADMAP-COMPONENTES)

A lane disparou depois do merge `b51cdcd9` e mediu `main` em `b0f979e5`, com o redesign inteiro
dentro. Quatro documentos em `02-rodadas/2026-08-11-roadmap-componentes/`, um canônico novo
(`03-canon/canone-de-componentes.md`) e um vetável no painel do dono. Nenhuma tela se mexeu.

**A correção que a medição impôs a este épico.** A prova da S005-T2 dizia "cerca de 40 telas do
painel" com superfície crua, herdado do handoff `leela-redesign-ajustes-dono.md`. A varredura
**não confirma esse número, e a natureza do defeito é outra**. Background cru literal — `bg-white`,
`bg-gray-*`, `bg-[#hex]` — tem **zero** ocorrências no painel e **zero** na landing; as 199
ocorrências de `bg-[var(--…)]` foram auditadas uma a uma e **100% apontam para token semântico**. O
gate de marca está verde e não está mentindo.

O defeito real é maior: o mesmo trio `rounded-[var(--card-radius)]` + `bg-[var(--surface-raised)]` +
`p-[var(--spacing-*)]` foi **reescrito à mão 192 vezes** — 141 no painel (86 arquivos) e 51 na
landing (37 arquivos) — em vez de `Card`. Tokens certos, marca conforme, procedência errada. É a
L-021 em estado puro, e nenhum gate existente a via.

**O placar da procedência.** 223 divergências: 192 superfícies reconstruídas, 17 botões e CTAs
replicando variante publicada, 8 estados vazios artesanais, 5 controles nativos crus e 1 typeahead
fora do `Combobox`. Contra 237 arquivos que importam componente do DS.

**A notícia boa, e ela muda a leitura do resto.** A §8 shadcn-first **pegou** onde foi apontada:
zero `<input>` cru, zero `<textarea>` cru, zero checkbox, radio ou file nativos no painel; zero
`<select>` na landing; zero menu artesanal nos dois apps. Sobraram cinco controles crus no
repositório inteiro — e **dois deles estão dentro do próprio design system**: o `ConfirmModal`
duplica os motores de `Textarea` (`ConfirmModal.tsx:198`) e de `Checkbox` (`:226-228`) em vez de
compô-los. Toda tela que usa `ConfirmModal` herda estados que não passaram pelo AA por estado do
`Checkbox`. É a violação mais grave da lista, e não pela contagem.

**O que o DS não tem, e por isso não podia ser respeitado.** Nenhum dos 50 componentes é layout.
Não há `Grid`, `Bento`, `Stack`, `Section` nem `Surface`. Bento e slot, dois dos padrões que o dono
nomeou na ordem, caem inteiros nessa lacuna — 106 ocorrências de `grid-cols-*` com **23 assinaturas
distintas** para três famílias reais. A evidência mais limpa vem de dentro: o showroom precisou
escrever o próprio `Section` local (`showcase/src/ui.tsx:27`) porque o DS não oferece um. Isso
virou o **CANONE-1** no painel do dono, com a conta dos dois lados; a forma técnica dos primitivos
não sobe, só o alcance.

**Saúde do catálogo, medida:** 50 componentes, 50 exports, zero componente morto. **40 de 50 com
story** — e sete das dez lacunas são controle de formulário (`Checkbox`, `Field`, `InputSenha`,
`Radio`, `Select`, `Switch`, `Textarea`). Controle sem vitrine é controle que a próxima pessoa não
encontra, o que é causa plausível de reincidência num sistema onde formulário é metade da
superfície. **49 de 50 com teste**; o único sem nenhum é o `Command`, que é a base do `Combobox`.

**A carga cognitiva, medida em seis telas.** A hipótese confortável era que ela estivesse espalhada
pelo painel. Não está: quatro das seis telas têm zero passo de arquitetura e duas têm zero passo —
Visão Geral e Engajamento abrem resolvidas, e o balcão funde retirada e presença num gesto por
decisão registrada (RN-205). Dos 20 passos de carga medidos no produto, **16 estão no checkout**, a
única tela onde um desconhecido decide pagar. JTBD e carga apontam para a mesma primeira onda por
caminhos diferentes.

**Achados registrados que não são desta família e precisam de lane própria:**
`charts/BarChart.tsx:130` passa `tickFormatter={truncarRotulo}` e o Recharts chama a função com
`(valor, índice)` — o índice vira o limite de caracteres e trunca todo rótulo do eixo para um
caractere (pré-existente, `a826dc3a`). E `overview/_components/ActiveEvents.tsx` **não é importado**
por `OverviewContent.tsx`: é componente órfão sustentando suíte verde.

### RN-558 · toda instância de padrão nomeado usa o componente canônico, e padrão sem canônico vira decisão (nova · 2026-08-11 · ROADMAP-COMPONENTES)

A regra que torna conferível o critério de aceite que o dono já tinha declarado, e que derivou
mesmo assim. Ela tem duas metades, e a segunda é a que faltava.

**Primeira metade.** Toda instância de padrão nomeado — seleção, data, formulário, cartão,
superfície, slot, bento, tabela, lista, modal, overlay, navegação, estado, feedback, indicador,
botão — usa o componente declarado em `03-canon/canone-de-componentes.md`, importado de
`@leela/design-system`. Re-implementação local por divs estilizadas é violação **mesmo com todos os
tokens corretos**: procedência é gate distinto de marca e de escolha do padrão, e os três são
necessários.

**Segunda metade.** Padrão que aparece no código **sem** componente canônico declarado não vira
componente novo em silêncio nem bespoke de tela: vira decisão agrupada no painel do dono. Enquanto
a decisão não volta, a instância é permitida e **contada**, nunca ignorada.

**Porta única de exceção:** ADR ou nota de decisão com contexto, critérios ordenados e a11y provada,
no padrão do ADR-017. Sem esse registro é violação, não exceção.

**Como se prova:** gate `leela-canon` (spec em
`02-rodadas/2026-08-11-roadmap-componentes/05-gate-leela-canon.md`) — regra ESLint para o fato
sintático, script com baseline versionado para o agregado ambíguo. A regra nasce `warn` e vira
`error` quando a contagem chega a zero; ligar dura antes quebraria o build inteiro no primeiro
`pnpm lint`, e gate que nasce vermelho é desligado no mesmo dia.

**Onde vive:** `03-canon/canone-de-componentes.md` (a fonte), `04-engenharia/governanca-design.md`
§8 (a regra em prosa), `04-engenharia/definition-of-done.md` (DoD de Tela ganha a linha geral de
procedência, além da linha de seleção que já existe), e todo brief de UI a partir de agora.

## Delta a Onda 0 paga a fundação, e o gate encontra o que a medição não tinha (2026-08-11 · lane `canon-onda-0`)

A Parte A da Onda 0 fecha inteira. Quatro commits de código, um de documento, nenhum deploy.

| Item | Prova |
|---|---|
| `ConfirmModal` compõe `Textarea` e `Checkbox` canônicos | `e173b63a` — a violação mais grave do inventário §3: o DS duplicava o próprio motor, e as ~26 telas consumidoras herdavam estados fora do AA por estado. API pública intacta; quatro testes provam a composição por **identidade de assinatura de classe** (reinlinar o engine quebra a suíte) |
| As dez lacunas de catálogo ganham story | `b63e968e` — **50 de 50 com story**; onze arquivos (`charts` entra por dois) |
| `Command` ganha teste | `37751b4b` — **50 de 50 com teste**; doze casos sobre o contrato do WAI-APG |
| Gate `leela-canon` vira código (S005-T5) | `2ceb9fd4` — duas regras ESLint + `scripts/gate-canon.mjs` com baseline versionado e catraca |
| Cânone ganha as três linhas que faltavam | `3029022d` — `CardFooter`, `SidebarBrand`, `SidebarFooter`, reprovados pela camada A do gate no primeiro dia |

**Zero controle cru dentro do DS.** Era 2 (inventário §8); é 0.

**Baseline inicial da catraca:** `superficie-crua` 107 painel / 27 landing · `botao-cru-estilizado`
6 / 5 · `receita-de-grid` 23 / 9 · `padrao-orfao` 0 / 0 · regra 1 = **4** · regra 2 = **2**. As 23
receitas de grid do painel batem com as 23 assinaturas distintas que o inventário §7.1 contou por
leitura dirigida — duas medições independentes no mesmo número.

**O que o gate achou que a varredura não tinha.** Duas re-implementações **batizadas**: `Painel` (=
`Card`) em `clubes/engajamento/EngajamentoView.tsx:119` e `Vazio` (= `EmptyState`) em
`eventos/kits/DistribuicaoView.tsx:110`. A medição contou superfície reconstruída em
`<div>`/`<article>` e não procurou declaração com nome de canônico — é o segundo mecanismo da L-021,
e o mais caro, porque a duplicata batizada é a que a próxima pessoa importa achando que importou o
cânone. Distribuídas às Ondas 4 e 2.

**Correção de leitura: F4 e F5 já estavam pagos antes da medição.** Saíram em `55ea0d42`
(`DELTA-UX-T4`), ancestral de `b0f979e5`, com teste pinando os dois no `SidebarRail`. A fila do
handoff `leela-redesign-hifi-rec-FIX.md` foi copiada para a onda sem reconferir o código — o mesmo
modo de falha da entrada do BarChart, corrigida pelo maestro em `25da1ad8`. Só **F6** segue aberto,
na Onda 5. Regra de processo que fica: item herdado de handoff se reconfere no código antes de virar
linha de onda.

**A régua que a §9 da spec não tinha.** A spec manda o gate nascer `warn` para não barrar ninguém, e
`warn` não faz isso neste repositório: `--max-warnings 0` é o contrato do CI, e warning barra igual
a erro. O instrumento do rollout virou a lista de dívida herdada no `eslint.config.mjs`, com o
arquivo e a onda que o paga, e a camada A provando que cada entrada ainda é verdade — entrada morta
reprova. O número real, medido sem as listas, vive no baseline versionado.

Detalhe completo, com as falsificações feitas e as três pendências nomeadas, em
`.nirvana/handoffs/leela-canon-onda0-20260811.md`.

## Delta a Onda 1 paga o caminho do dinheiro, e a catraca desce pela primeira vez (2026-08-11 · lane `canon-onda-1`)

A onda do checkout — primeira da fila por JTBD (`§04.1` *"Descubro evento → me inscrever em poucos
cliques"*) e por carga (16 dos 20 passos de arquitetura do produto estão nesta superfície). Três
commits de código, nenhum deploy.

| Item | Prova |
|---|---|
| Checkout: 12 superfícies reconstruídas à mão → `Card` | `2d5bfc5f` — entrada por `@leela/design-system/server` (Radix-free, ADR-017); tom de borda e tintas de feedback preservados, zero string tocada |
| Landing pública: 26 superfícies, 6 CTAs e o último controle cru da landing | `f8a75d32` — `ShareBlock` paga três divergências numa tela só (superfície, `<input readOnly>` → `Input`, botão → `buttonVariants`) |
| Opção única deixa de cobrar clique (passo de arquitetura nº 2) | `64be6b70` — `StepModalidadeKit` auto-seleciona modalidade e kit quando a lista tem um item; 5 casos, um deles contando os patches para provar que o efeito estabiliza |

**A catraca desceu, e é a primeira vez.** `superficie-crua.landing` **27 → 6**;
`botao-cru-estilizado.landing` **5 → 0**; `controle-cru-fora-do-ds` **4 → 3**. O baseline foi
regravado no mesmo commit, como a spec do gate manda. O painel não foi tocado — as contagens dele
seguem intactas para as ondas 2 a 5.

**O ciclo completo da dívida herdada rodou sozinho.** A camada A do `gate-canon` acusou a entrada
**MORTA** de `ShareBlock.tsx` no `eslint.config.mjs` no minuto seguinte à conversão do
`<input readOnly>` — *"já foi paga, tire a linha"* —, e a linha caiu no mesmo commit. É o mecanismo
que a Onda 0 construiu funcionando sem ninguém lembrar de conferir. A lista da Regra 1 fica com um
arquivo, do painel, que a Onda 3 paga.

**A carga caiu de 16 para 14 passos, e o alvo publicado estava otimista.** O `04-ondas-roadmap.md`
prometia 13 contando só a auto-seleção; os cliques que somem são **dois** (modalidade + kit), não
três. 14 é o número certo, e vai a 12 se a decisão do endereço liberar.

**Quarenta e cinco das 64 instâncias foram convertidas; as 19 restantes estão nomeadas, não silenciadas.**
A leitura dirigida do inventário classificou como "superfície reconstruída" seis **placas recuadas**
(`surface-base`/`sunken`/`overlay`: o QR do PIX, o QR do ingresso, o código do ingresso, o painel do
kit, o bloco de totais, a placa do compartilhar) — e o `Card` carrega `shadow-elev-1` + `card-blur`,
isto é, **elevação**: pôr sombra de elevação em superfície recuada é mentir sobre a profundidade na
tela do dinheiro. E classificou como "CTA replicando variante" cinco **pílulas informativas de
contorno** que são `<span>`, não botão — o `Badge` do brasa é 10px UPPERCASE preenchido e **não
publica variante `outline`** (a esteira shadcn→brasa dropou a do stock). Cada grupo virou candidato
nomeado à **CANONE-1**, com arquivo e linha no handoff. A variante `outline` do `Badge` é o item
mais bem definido que esta onda manda para lá: uma variante resolve as cinco de uma vez.

**E quatro instâncias do número 51 não têm arquivo e linha atrás.** Nem o detector do gate nem
uma varredura própria mais larga as reproduz; a hipótese é contagem dupla por aninhamento na
leitura dirigida. Fica registrado como limite da medição de origem, em vez de estimado.

**Dois furos do próprio gate, achados por quem o usou.** A catraca varre
`div|section|article|li|aside` e **não vê `<p>`** — duas superfícies com anatomia de cartão viviam
em `<p>` (`minha-conta/PainelIngressos.tsx`) e foram convertidas mesmo assim. E anatomia guardada em
`const CARTAO = '…'` escapa, porque o detector lê o texto do atributo (`PainelIngressos`,
`PortasDaConta`). Acrescentar `p` à lista de tags **sobe** a contagem do painel, então entra junto
com a onda que paga o que ele achar, nunca sozinho.

**O que subiu para o dono:** os outros dois passos de arquitetura, escritos no formato do painel em
`02-rodadas/2026-08-11-roadmap-componentes/06-decisoes-checkout-onda1.md` — **CKENDERECO-1** (o
checkout cobra endereço completo de quem retira o kit no balcão) e **CKPIX-1** (quem paga o PIX pelo
app do banco não descobre que pagou, RN-470). Nenhum comportamento dos dois foi tocado.

Detalhe completo, com o delta visual item a item para a conferência renderizada, em
`.nirvana/handoffs/leela-canon-onda1-20260811.md`.

---

## Delta o CANONE-1 fecha, e a fundação de layout destrava (leva 7 do dono · 2026-08-11)

O único vetável que a rodada de componentes mandou ao dono voltou na mesma noite, e ele escolheu a
primeira das duas opções — não pelo rótulo dela, mas pela própria leitura do problema. Na íntegra:

> *"o que eu enetndi é que voce nao tá respeitanod o design system, e nao criou um componente novo,
> acione nossa software house para padronizar esse procesos. Se um componente nao existe,
> precisamos documentar e padronizar o componente para nao ficar refazendo ele. Inclusive é
> diretriz nossa de sempre utilizar códigos, partes de código e componentes para fazer as telas,
> como forma de economia de tokens, tempo, e conformidade de código."*

**O que fica decidido, em uma frase:** peça que o design system não publica **nasce nele**,
documentada e padronizada, antes de ser usada — nunca inline na tela, nunca refeita na próxima. A
diretriz completa, com as três razões do dono (economia de tokens, economia de tempo, conformidade
de código), é permanente e vive em `04-engenharia/governanca-design.md`. Ela **complementa a RN-558**
sem substituí-la: a RN-558 diz que toda instância de padrão nomeado usa o componente do cânone; a
diretriz diz o que acontece quando o cânone não tem componente para o padrão.

**O que destrava, aqui:**

- **Onda 0 Parte B** — os primitivos de layout para as três famílias medidas (grade de formulário,
  grade de indicadores, painel assimétrico): **23 receitas viram 3**. Mais os cinco cartões de
  domínio por composição (clube, comunicado, campanha, parceria, afiliação) e o cabeçalho de bloco
  interno promovido de `components/SecaoHead.tsx` para o DS.
- **O cânone perde os dois "sem cânone"** — as linhas §5 e §6 de `03-canon/canone-de-componentes.md`
  deixam de dizer "decisão CANONE-1" e passam a apontar para a Onda 0 Parte B.
- **O gate ganha o destino do padrão órfão.** Enquanto não havia decisão, `padrao-orfao` era
  contagem sem consequência: a instância seguia permitida porque não havia contra o quê reprovar.
  Agora o órfão vira fila de trabalho — a peça nasce.

**O custo, escrito para não virar surpresa:** primitivo novo é componente como qualquer outro, com
story, teste e contraste AA por estado. É uma onda de fundação antes das ondas de tela — e o dono
aceitou esse custo de olhos abertos, porque o compara com o de reescrever a mesma moldura pela
vigésima quarta vez.

**Fora do projeto.** O dono registrou a mesma prática um nível acima, para a casa: *"é primordial
que nossa software forge utilize a prática de snippets e design system."* Registro em
`02-rodadas/2026-08-11-decisoes-dono/03-leva6-tarde.md §Leva 7` e no complemento do mesmo ato.

---

## Delta a conformidade dos controles é medida, e a resposta muda o diagnóstico (2026-08-12 · CONFORMIDADE-CONTROLES)

**A ordem do dono, na íntegra:**

> *"Pesquisadores, combobox, filtros, componente de seleção e pesquisa dos filtros e caiaxs de
> seleção naoe stao padronizados. Voce está apliacndo sempre o design system ou recriando eles do
> zero? se estiver recriando está quebrando uma regra nossa que nao pode ser quebrada. E precisamos
> ter uma leva de conferencia de conformidade ao design system apdronização de componentes
> também."*

### S006 · a conformidade dos controles vira medição, trava e fila

| Tarefa | Estado | Prova |
|---|---|---|
| S006-T1 · o inventário das seis famílias, ocorrência por ocorrência | ✅ | `02-rodadas/2026-08-12-conformidade-controles/01-inventario-controles.md` — 134 ocorrências em 303 arquivos de tela, com arquivo e linha |
| S006-T2 · a resposta com número à pergunta do dono | ✅ | mesmo documento, §10, citável |
| S006-T3 · a extensão da catraca para estas famílias | ✅ | `.../02-catraca-controles.md` — regra 3 `filtro-fora-do-canone` + cinco contagens novas com baseline medido |
| S006-T4 · a fila em ondas por JTBD | ✅ | `.../03-fila-em-ondas.md` — sete ondas, C0 enabler e C1 independente |
| S006-T5 · Onda C0, as cinco peças nascem no DS | ✅ | `FilterChips` `3570d74a`, `ResultCount` `450707d3`, `FilterBar` `161da9f7`, `CheckboxField` `9c3f99ab`, `FieldGroup` `04c1b047` — cada uma com story, docs, contrato LLM, teste e a linha do cânone no MESMO commit; a catraca aprendeu as seis contagens em `6f08f59e` (regra 3 + cinco contagens + três consertos de régua, falsificados); handoff em `.nirvana/handoffs/leela-controles-c0-20260812.md` |
| S006-T6 · Onda C1, as sete violações viram adoção | ⏳ | livre, independe da C0 |
| S006-T7 · Ondas C2 a C6, a conversão por superfície | ⏳ | esperam a C0 |

### O que a medição corrigiu no diagnóstico do próprio épico

A hipótese que abriu a leva era que a violação objetiva fosse **recriação onde o canônico existe**.
Ela existe, e são sete casos: cinco por cento das ocorrências. O que domina é o outro mecanismo.

| Veredito | Quantas | % |
|---|---:|---:|
| (a) usa o canônico | 68 | 51% |
| (b) recria onde o canônico EXISTE | **7** | 5% |
| (c) recria onde NÃO existe canônico | **59** | 44% |

**O produto não recria o controle. Recria o que fica em volta do controle.** Zero `<input>` cru,
zero `<input type="checkbox">`, zero combobox artesanal (`role="combobox"`, `role="listbox"` e
`aria-autocomplete` não têm um único hit fora do DS), um único `<select>` nativo no produto inteiro.
A proibição mais dura do cânone — checkbox nativo com a severidade do `<select>` nativo — é a mais
obedecida.

As quatro peças que faltam, e que respondem por 54 das 59 ocorrências (c):

| Peça ausente | Recriações | O que a ausência produziu |
|---|---:|---|
| barra de filtros | 13 | uma casca app-local (`ListaGlobal`) e treze montagens de tela |
| grupo de faceta | 12 | oito com chip "Todos", quatro sem; uma com contagem, onze sem |
| contador de resultado | 12 | três dialetos de ARIA, duas grafias, **duas sem canal nenhum** |
| par rótulo + checkbox | 17 | três dialetos que só se distinguem quando o rótulo quebra em duas linhas |

O `Checkbox` do DS não tem prop de rótulo (`CheckboxProps` estende `InputHTMLAttributes` e
acrescenta só `indeterminate`), e o `Field` põe o rótulo acima do controle — o rótulo de um checkbox
vai ao lado. Não é omissão de quem escreveu a tela: não havia o que importar.

### RN-568 · a montagem em volta do controle é peça do design system, não receita de tela (nova · 2026-08-12 · CONFORMIDADE-CONTROLES)

A RN-558 diz que toda instância de padrão nomeado usa o componente canônico. A CANONE-1 diz o que
acontece quando o cânone não tem componente para o padrão. Esta regra fecha o terceiro caso, que as
duas deixavam de fora por construção: **a composição recorrente de controles canônicos também é um
padrão nomeado.**

Uma barra de filtros feita inteiramente de `SearchInput`, `Chip` e `Combobox` do design system passa
no gate de marca, no gate de procedência e na leitura humana com o cânone na mão — e ainda assim é
a décima quarta escrita da mesma peça. O que ela decide não é estilo: é se a faceta tem "Todos", se
o contador avisa o leitor de tela, se o rótulo alinha ao topo quando quebra. Hoje isso é escolha de
cada tela, e as telas escolheram diferente.

**Aplicação:** montagem que aparece três vezes ou mais com a mesma anatomia nasce no design system,
com story, teste, contrato e linha do cânone no mesmo commit. A catraca a mede por contagem
(`faceta-crua`, `barra-de-filtro-crua`, `contador-de-resultado-cru`, `rotulo-de-checkbox-cru`,
`grupo-de-campos-cru`) enquanto a peça não existe, e vira `error` quando ela nasce.

### Achado de lado, e ele abre a fila

`node scripts/gate-canon.mjs` na main de `f962efe3` devolve `GATE LEELA-CANON: FAIL (1)`:
`grade-crua.painel` subiu de 104 para 109 com o merge do administrativo, que escreveu cinco molduras
à mão depois de `Stack`, `FormGrid` e `MetricGrid` existirem. A leva de conferência não conserta
(zero código de produto), e o item abre a Onda C0.

Vale o registro pelo que ele prova: **a catraca pegou a regressão sozinha, no dia seguinte, sem
ninguém revisar com o cânone na mão.** É o argumento inteiro a favor de estendê-la para as quatro
famílias que hoje passam batido.
