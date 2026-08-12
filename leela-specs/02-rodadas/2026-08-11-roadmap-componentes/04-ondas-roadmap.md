# Ondas de revisão — o roadmap, ordenado por job servido

> Paga **S005-T4** do épico `LEELA-E01-design-system`. As ondas se ordenam por JTBD servido, nunca
> por ordem de tela nem por tamanho da pilha. Cada onda declara o job da superfície e traz a
> medição anti-carga: **passos até o job, antes e depois**. Overengineering aparece como número.
>
> Nenhuma onda roda nesta rodada. Cada uma nasce com brief próprio, e a ordem abaixo é a fila.

## Como as ondas foram ordenadas

Três critérios, nesta ordem, e o primeiro ganha dos outros dois.

1. **Job servido.** Dor central antes de polimento. A superfície onde um desconhecido decide gastar
   dinheiro pesa mais que a superfície onde o organizador confere um número pela terceira vez.
2. **Dependência.** A onda que destrava outras vem antes, mesmo servindo job indireto.
3. **Densidade da dívida.** Desempata, nunca decide. Ordenar pela pilha maior é ordenar por tela,
   que é exatamente o que a disciplina proíbe.

Por isso a onda com 61 divergências (eventos) vem **depois** da onda com 51 (landing): a landing é
o único lugar onde a fricção vira abandono de compra, e o painel é usado por quem já pagou para
usar.

## Fila

| Onda | Superfície | JTBD servido | Divergências | Estado |
|---|---|---|---|---|
| **0** | design system e moldura | enabler (marcado como enabler, não forjado) | 2 + 4 lacunas | Parte A paga em 11/08 · **Parte B livre desde 11/08** (CANONE-1 decidido) |
| **1** | landing pública e checkout | 04.1 *"Descubro evento → me inscrever em poucos cliques"* | 64 | livre |
| **2** | painel · eventos | 04.1 *"Vendo inscrições chegarem"*, *"Preparo a entrega de kits"*, *"Faço check-in no balcão"* | 65 | livre |
| **3** | painel · plataforma e recebimento | 04.1 *"Processo repasse → operação escalável"* | 36 | livre |
| **4** | painel · clubes e parcerias | 04.4 *"comunidade com rosto e nome"* + 04.1 *"Vendo com promotor → link rastreável"* | 31 | livre |
| **5** | painel · visão geral e CRM | 04.1 *"acompanhar resultado de relance"* + candidato P8 *"conhecer meus clientes"* | 20 | livre |

Total convertido ao fim das seis: 223 divergências, mais as quatro lacunas de cânone — que o
CANONE-1 resolveu em 11/08 pela criação das peças no design system, e não pela receita de tela.

## A medição anti-carga

A régua, escrita antes dos números para que ninguém a ajuste ao resultado:

**Passo** é uma ação interativa obrigatória no caminho feliz até o job: clicar, preencher campo
obrigatório, abrir menu ou modal, confirmar, trocar de tela. Não contam rolagem, leitura, campo
opcional nem caminho de erro. **Decisão** é um ponto onde a pessoa escolhe entre duas ou mais
opções que não são o job — filtro, aba, modo, escopo. **Passo de arquitetura** é o passo que existe
porque o sistema foi montado assim, não porque o job pede.

O terceiro número é o que o dono chamou de overengineering, e é o único dos três que uma onda pode
prometer derrubar sem mexer no produto.

### O antes, medido

Uma tela representativa por onda, contada linha a linha no código de `b0f979e5`.

| Onda | Tela representativa | Passos | Decisões | Passos de arquitetura |
|---|---|---|---|---|
| 1 | checkout público (caminho PIX) | **16** | 3 | **3** |
| 2 | balcão de entrega de kit | 3 (5 com chip) | 0 | **0** |
| 3 | fila de repasses (solicitado → pago) | 4 | 0 | **0** |
| 4 | engajamento do clube | 0 | 0 | **0** |
| 5 | clientes (CRM), até a ficha | 2 | 1 opcional | **1** |
| — | visão geral do organizador | 0 | 0 | **0** |

**O que a medição derrubou.** A hipótese confortável era que a carga cognitiva estivesse espalhada
pelo painel, na mesma proporção da dívida de componente. Ela não está. Quatro das seis telas já
operam com zero passo de arquitetura, e duas delas com zero passo — a Visão Geral e o Engajamento
carregam o resumo sem exigir clique, e o balcão funde "retirar kit" e "registrar presença" num
gesto só por decisão registrada (RN-205, comentada no próprio `AtendimentoPanel.tsx:5-6`). Isso é
desenho deliberado, e o roadmap não vai fingir que precisa consertá-lo.

**Onde ela está.** Dezesseis passos no checkout, três deles puramente de arquitetura, mais um passo
de navegação forçada no CRM. Vinte passos de carga medida no produto inteiro, e dezesseis estão na
única tela onde um desconhecido decide pagar.

Isso confirma a ordem da fila por outro caminho que não o JTBD. A Onda 1 já era a primeira por
servir o job mais caro; a medição mostra que ela também é a primeira por carga. As duas réguas
apontam para o mesmo lugar, o que é raro e vale registrar.

**Os três passos de arquitetura do checkout, nomeados:**

1. **Endereço completo cobrado sempre.** CEP e número são obrigatórios
   (`StepDados.tsx:216-225`, `:254-263`) mesmo quando o kit é retirado presencialmente — e o
   próprio produto diz que é: "Retirado nas janelas do evento, mediante documento"
   (`StepModalidadeKit.tsx:271`). Nada no fluxo envia kit pelo correio. O endereço não serve ao job
   de se inscrever e pagar; serve a uma exigência à parte que não está declarada como tal em lugar
   nenhum do código.
2. **Opção única que ainda exige clique.** Os `RadioGroup` de modalidade e de kit
   (`StepModalidadeKit.tsx:213-240`, `:259-279`) não têm ramo de auto-seleção quando existe uma
   opção só. Evento com uma modalidade e um kit cobra dois cliques que não decidem nada. É o
   exemplo literal do "filtro que só tem um valor útil".
3. **O comprador precisa perguntar se pagou.** Depois do PIX, saber que o pagamento entrou exige
   clicar "Atualizar estado do pedido" (`StepPagamento.tsx:352-360`). A v1 é deliberadamente barata
   — sem `onSnapshot`, sem polling, registrado na RN-470 e comentado em `CheckoutFlow.tsx:1438-1446`.
   Quem paga pelo aplicativo do banco, fora da aba, não tem como saber que pagou.

Nenhum dos três se conserta trocando componente, e é por isso que estão nomeados aqui em vez de
diluídos na lista de conversão: **dois deles são decisão de produto** (o endereço tem dono fora do
frontend; a RN-470 foi escolha explícita de custo) e um é código de meia hora. A Onda 1 leva os
três como pergunta ou tarefa, com destino declarado, e não os trata como dívida de componente.

**O passo de arquitetura do CRM:** o índice `/crm` abre em "Visão geral"
(`CrmRoutes.tsx:83-85`), então quem quer a lista de clientes clica na aba "Clientes"
(`CrmSubNav.tsx:46`) antes de ver o dado. Não existe segunda tela candidata a "clientes". Não é
decisão, é navegação forçada por um default que não é o job daquela área.



## Onda 0 · A fundação, e a moldura que já está devendo

**JTBD:** nenhum diretamente. Marcado como **enabler**, seguindo o precedente honesto do projeto
(`S-R9-04`, `S-R9-05`, `S-R9-06` e `S-R9-10` fizeram o mesmo em vez de forjar um job). Forjar
âncora de JTBD para trabalho de infraestrutura é a fraude que a L-004 existe para impedir.

**Por que vem primeiro mesmo sem job:** as ondas 1 a 5 convertem para componentes que precisam
existir. Layout composto não tem para onde ir hoje, e o `ConfirmModal` que as telas usam carrega,
por dentro, o defeito que elas vão parar de cometer.

### Parte A — livre, começa agora

| Item | O que é | Origem | Estado |
|---|---|---|---|
| `ConfirmModal` compõe `Textarea` e `Checkbox` | o DS duplicava o próprio motor em `ConfirmModal.tsx:198` e `:226-228`; toda tela que usa `ConfirmModal` herdava estados que não passaram pelo AA por estado do `Checkbox` | inventário §3 | ✅ **PAGO** `e173b63a` |
| As dez lacunas de catálogo | `charts`, `Checkbox`, `Dialog`, `Field`, `InputSenha`, `Radio`, `Select`, `SidebarRail`, `Switch`, `Textarea` sem story — **sete são controle de formulário**; controle sem vitrine é controle que a próxima pessoa não encontra | inventário §8 | ✅ **PAGO** `b63e968e` (11 arquivos: `charts` entra por dois, um título de Storybook por arquivo) |
| `Command` ganha teste | único dos 50 componentes sem teste algum, e é a base do `Combobox` | inventário §8 | ✅ **PAGO** `37751b4b` (12 casos) |
| **F4** · tooltip do rail visível por teclado | hover-only (`group-hover/item:`); uma classe (`group-focus-visible/item:`) | `leela-redesign-hifi-rec-FIX.md` | ⚠️ **JÁ ESTAVA PAGO** — ver abaixo |
| **F5** · rodapé do rail ganha nome acessível | `<button>` + `navigate` sem nome acessível fechado (avatar `aria-hidden`) | `leela-redesign-hifi-rec-FIX.md` | ⚠️ **JÁ ESTAVA PAGO** — ver abaixo |
| Gate `leela-canon` vira código | duas regras ESLint + `scripts/gate-canon.mjs` com baseline e catraca | `05-gate-leela-canon.md §9` | ✅ **PAGO** `2ceb9fd4` |
| Cânone promovido a canônico | a tabela do `03` vira `03-canon/canone-de-componentes.md` | `03-canone-componentes.md` | ✅ **PAGO** na própria rodada |

**Correção de leitura — F4 e F5 já estavam pagos ANTES da medição (verificado 11/08).** Os dois
saíram no commit `55ea0d42` (`DELTA-UX-T4`, 10/08 19:59), que é **ancestral de `b0f979e5`** — ou
seja, já estavam na árvore que a varredura mediu. A mensagem do commit é literal: *"F5 morta:
trigger button com aria-label sempre (a entrada `''` do inventário navegacao-spa some). F4: tooltip
do rail também por group-focus-visible"*. O código confirma: `SidebarRail.tsx` carrega
`group-focus-visible/item:opacity-100` com o comentário nomeando a F4, o rodapé com `footerMenu` é
`button` com `aria-label={footerName}` fechado e aberto, e o inventário de
`navegacao-spa.test.tsx:302` já diz `['Abrir menu', 'Marina Castelo']` — a entrada `''` não existe
mais. Há teste pinando os dois (`SidebarRail — F4: tooltip por focus-visible, não só hover` e
`FECHADO: o rodapé é button com nome acessível + aria-haspopup/expanded (F5 morta)`).

Os dois entraram nesta onda porque a fila do handoff `leela-redesign-hifi-rec-FIX.md` foi copiada
sem reconferir contra o código — **o mesmo modo de falha da entrada do BarChart**, que o maestro já
corrigiu em `25da1ad8`. Nenhuma lane futura para F4 ou F5. Fica a lição de processo: item herdado
de handoff se reconfere no código antes de virar linha de onda.

### Parte B — DESTRAVADA em 11/08 (leva 7 do dono)

> **O CANONE-1 foi decidido**, pela primeira opção, com a leitura do próprio dono: *"Se um
> componente nao existe, precisamos documentar e padronizar o componente para nao ficar refazendo
> ele."* A diretriz completa e as três razões dele (tokens, tempo, conformidade) estão em
> `04-engenharia/governanca-design.md`, na seção da diretriz de reuso. Esta parte deixa de esperar
> resposta e entra na fila como qualquer outra onda.

Primitivos de layout (as três famílias medidas), cartões de domínio por composição, cabeçalho de
bloco interno promovido de `components/SecaoHead.tsx` para o DS. Cada um com story, teste e AA por
estado, como qualquer componente — é essa a conta que a decisão pesa.

**Critério de aceite da onda:** os 50 componentes com story e teste; zero controle cru dentro do
DS; gate `leela-canon` rodando em `warn` com relatório publicado; prova renderizada nos dois temas
pelo toggle do Storybook (L-019).

**Fechamento da Parte A (11/08 · lane `canon-onda-0`).** Os cinco itens livres estão pagos. Os
números: DS 77 arquivos de teste, 1842 casos; painel 235 arquivos, 2583 casos; 50 de 50 componentes
com story e com teste; zero controle cru dentro do DS.

Uma correção ao texto da spec do gate, que só apareceu na execução: **§9 manda o gate nascer `warn`
para não barrar ninguém, e `warn` não faz isso neste repositório.** Os três `lint` rodam com
`--max-warnings 0`, então warning barra igual a erro — a severidade não tem como ser o instrumento
do rollout. O que faz o papel é a lista de dívida herdada no `eslint.config.mjs`, com o arquivo e a
onda que o paga, e a camada A do script provando que cada entrada ainda é verdade (entrada morta
reprova). O número real, medido SEM essas listas, é o que vive no baseline versionado e o que cada
onda derruba. A intenção da §9 fica intacta; o mecanismo é outro.

**Baseline inicial do gate (11/08):**

| Contagem | painel | landing | total |
|---|---|---|---|
| `superficie-crua` | 107 | 27 | 134 |
| `botao-cru-estilizado` | 6 | 5 | 11 |
| `receita-de-grid` (assinaturas distintas) | 23 | 9 | — |
| `padrao-orfao` | 0 | 0 | 0 |
| `controle-cru-fora-do-ds` (regra 1) | — | — | **4** |
| `padrao-reimplementado-fora-do-ds` (regra 2) | — | — | **2** |

As 23 receitas de grid do painel batem com as 23 assinaturas distintas que o inventário §7.1 contou
por leitura dirigida — duas medições independentes no mesmo número, e é isso que dá crédito às
outras. `superficie-crua` (107/27) NÃO é o mesmo número da divergência de cartão do inventário
(141/51): o script exige a assinatura completa (raio + fundo de superfície + espaçamento) nos dois
dialetos de classe, e o inventário classificou por leitura. Os dois números medem a mesma dívida com
réguas diferentes, e só o do script tem catraca.

**Dois achados que a medição de 11/08 não tinha**, produzidos pelo gate no primeiro dia e já
distribuídos às ondas: `Painel` em `clubes/engajamento/EngajamentoView.tsx:119` é o `Card` com
outro nome (**Onda 4**), e `Vazio` em `eventos/kits/DistribuicaoView.tsx:110` é o `EmptyState` com
outro nome (**Onda 2** — é o mesmo item que a onda já listava como "estado vazio artesanal"). A
varredura contou superfície reconstruída em `<div>`/`<article>` e não procurou DECLARAÇÃO com nome
de canônico; é o segundo mecanismo da L-021, e o mais caro.

**Residual nomeado, para não virar silêncio:** as 12 instâncias de `rounded-ds-pill` da landing que
o inventário §4 classificou como "CTA replicando variante" são, em boa parte, `<span>` — ou seja,
`Badge`/`Chip` reescrito, não `Button`. Elas não entram em `botao-cru-estilizado` (a contagem
existe para medir botão) e não têm bucket próprio na catraca. A Onda 1 as converte; enquanto isso,
não há número que impeça uma décima terceira.

## Onda 1 · O caminho do dinheiro

**JTBD:** `jobs-to-be-done.md §04.1` — *"Descubro evento | Me inscrever em poucos cliques | Reduzir
fricção | Atleta"*. Reforço em §04.1 *"Compro inscrição | Acompanhar kit, pagamento e resultado no
mesmo lugar"*.

**Superfícies:** `apps/landing/app/(public)/[eventSlug]/**` (página do evento e seções),
`checkout/**`, `minha-conta/**`, `convite/**`, `definir-senha/**`.

**Por que é a primeira onda de tela.** É a única superfície do produto onde alguém que não conhece
a marca decide gastar dinheiro. Fricção no painel é incômodo de quem já pagou; fricção aqui é
carrinho abandonado. O CTA do hero, o botão mais caro do produto, é um dos doze que replicam
`buttonVariants` à mão.

**Instâncias a converter — 64:**

| O que | Quantas | Para |
|---|---|---|
| Superfície reconstruída à mão | 51 (37 arquivos) | `Card` via `@leela/design-system/server` |
| CTA replicando variante | 12 | `buttonVariants` de `/server` |
| `<input readOnly>` de link copiável (`ShareBlock.tsx:47`) | 1 | `Input` |

A concentração está exatamente onde o dinheiro passa: `checkout/PixCobranca.tsx` (4 instâncias),
`checkout/StepConfirmacao.tsx` (2), `checkout/AceitesCompra.tsx`, `checkout/KitDetalhe.tsx`,
`checkout/CupomCampo.tsx`, `sections/HeroSection.tsx`, `sections/KitsSection.tsx`.

**Restrição herdada:** ADR-017. A landing é Radix-free por peso de bundle público. Toda conversão
entra por `@leela/design-system/server` ou `/dialog`; nada puxa o barrel completo. `marca.tsx`,
`tipografia.tsx` e `ctaStyles.ts` seguem como composição de app, ratificados pelo ADR — não são
alvo desta onda.

**Anti-carga — 16 passos hoje, 13 é o alvo, e um dos três tem dono fora daqui:**

| Passo de arquitetura | Destino |
|---|---|
| Opção única exigindo clique (`StepModalidadeKit.tsx:213-240`, `:259-279`) | **tarefa da onda.** Auto-selecionar quando a lista tem um item, mantendo o controle visível e alterável. Derruba 2 passos em todo evento de modalidade e kit únicos. |
| Endereço cobrado com retirada presencial (`StepDados.tsx:216-225`, `:254-263`) | **pergunta antes da tarefa.** Se a exigência é fiscal, ela precisa estar escrita como RN e o campo ganha a justificativa na tela; se não é, sai do caminho feliz e derruba mais 2. Não se resolve no frontend sem saber qual das duas. |
| "Atualizar estado do pedido" depois do PIX (`StepPagamento.tsx:352-360`) | **fora desta onda.** É a RN-470, escolha explícita de custo da v1. Fica registrado como o passo mais caro do produto — quem paga pelo banco não descobre que pagou — e volta quando alguém decidir pagar `onSnapshot`. |

O alvo publicado da onda é **13 passos** contando só a auto-seleção, e **11** se a resposta sobre o
endereço liberar. Nenhum dos dois números depende de trocar um único `<div>` por `<Card>`, e essa é
justamente a razão de a medição existir separada da contagem de divergências.

## Onda 2 · A operação do evento

**JTBD:** `§04.1` — três linhas do doc, todas do Organizador: *"Vendo inscrições chegarem | Ver
quem pagou e quem está pendente | Tornar a inadimplência visível sem checagem manual"*; *"Preparo a
entrega de kits | Conferir estoque por tamanho (PP-XG) com movimentações | Não errar o kit por
falha de coleta de tamanho"*; *"Faço check-in no balcão | Validar o ingresso server-side"*. Mais
*"Estou no local do evento | Operar o painel pelo celular | Gerenciar em campo sem depender do
desktop"*.

**Superfície:** `apps/painel/src/routes/eventos/**` — 78 arquivos, a maior rota do painel.

**Por que aqui.** É a superfície do dia do evento. O balcão roda com fila na frente, e é o único
lugar do produto onde o custo de um passo a mais é medido em pessoas esperando de pé.

**Instâncias a converter — 65:**

| O que | Quantas | Para |
|---|---|---|
| Superfície reconstruída à mão | 61 | `Card` |
| Estado vazio artesanal | 4 (`kits/DistribuicaoView.tsx:112`, `kits/KitEditor.tsx:377`, `:455`, `:564`) | `EmptyState` |
| `<article>` cru em lista de comunicação | 2 (`comunicacao/CampanhasList.tsx:81`, `comunicacao/AutomacoesPage.tsx:240`) | cartão de domínio (depende de CANONE-1) ou `Card` |
| Typeahead em fluxo (`entrega/AtendimentoPanel.tsx:264-291`) | 1 | `Combobox` em modo fluxo, se a CANONE-1 der o modo; senão fica registrado como exceção |

**Carona de copy** (mesma tela, custo marginal zero, vem de `leela-uxw-fix.md`):
`entrega/estados/EstadosBalcao.tsx:74` mostra "(idempotente)" ao usuário — jargão de engenharia
numa tela de balcão.

**Anti-carga — 3 passos hoje, 3 depois, e isso é um resultado, não uma omissão.** O balcão já foi
desenhado contra carga: a RN-205 fundiu "retirar kit" e "registrar presença" num clique, e o
comentário no topo de `AtendimentoPanel.tsx:5-6` registra a decisão. Zero passo de arquitetura
medido. Esta onda é **procedência pura**, e o critério de aceite dela inclui provar que o número
não subiu. Onda que conserta componente e acrescenta passo falha, mesmo zerando divergência.

## Onda 3 · O dinheiro que sai

**JTBD:** `§04.1` — *"Processo repasse | Ver saldo a liberar e disparar em lote | Operação escalável
| Admin"*. Reforço em *"Preciso cancelar uma inscrição | Estornar com confirmação e histórico claro
| Ter processo de reembolso digno e sem duplicar dinheiro"*.

**Superfícies:** `apps/painel/src/routes/plataforma/**` (25 arquivos) e
`apps/painel/src/routes/conta/recebimento/**`.

**Por que antes de comunidade e relance.** Erro aqui move dinheiro de terceiros. É a única
superfície da fila onde um controle mal desenhado tem custo financeiro direto, e é onde estão
**todos** os controles nativos crus do painel.

**Instâncias a converter — 36:**

| O que | Quantas | Para |
|---|---|---|
| Superfície reconstruída à mão | 32 (26 plataforma, 6 conta) | `Card` |
| `<select>` cru (`tenants/ProvisionTenantModal.tsx:150-158`) | 1 | `Select` |
| `<Input type="date">` (`convites/ConvitesView.tsx:142-148`) | 1 | `DateField`, que existe **para isto** desde o GATE-DS-W1 |
| Chips à mão (`tenants/TenantsList.tsx:41-58`, `repasses/RepassesFilaView.tsx:65-80`) | 2 | `Chip` com `active` |

Os dois blocos de chip são duplicata um do outro, escritos em telas diferentes com a mesma lógica
do `Chip.tsx`. É a assinatura da falta de cânone em estado puro: duas pessoas, o mesmo problema, a
mesma solução, nenhuma das duas encontrou o componente.

**Anti-carga — 4 passos hoje, 4 depois.** Os quatro são dois pares de "clicar e confirmar", e os
dois pares movem dinheiro de terceiros com dado bancário à mostra. A dupla confirmação é mitigação
declarada (`RepassesAdminRoute.tsx:9-11`), não sobra de arquitetura, e derrubá-la seria trocar
carga por risco. O filtro por estado já abre em `todos` (`RepassesAdminRoute.tsx:40`), então ver a
fila custa zero. Procedência pura, como a Onda 2.

## Onda 4 · A comunidade e quem vende por você

**JTBD:** `§04.4` — *"Falo com patrocinador | Ter dados na mão | Ser visto como profissional"* e o
mapa de rastreabilidade do módulo Clubs (*"comunidade com rosto e nome"*, *"pertencimento a
comunidade local"*). Mais `§04.1` — *"Vendo com promotor | Link rastreável em tempo real | Calcular
comissão sem planilha"*.

**Superfícies:** `apps/painel/src/routes/clubes/**` (33 arquivos) e
`apps/painel/src/routes/parcerias/**` (12 arquivos).

**Instâncias a converter — 31:**

| O que | Quantas | Para |
|---|---|---|
| Superfície reconstruída à mão | 30 (23 clubes, 7 parcerias) | `Card` |
| `<article>` cru como cartão de domínio | 5 (`clubes/hub/ClubeCard.tsx:67`, `clubes/clube/parcerias/ParceriasView.tsx:55`, `:88`, `clubes/clube/comunicacao/ComunicadosList.tsx:58`, **`parcerias/afiliacoes/MinhasAfiliacoesPage.tsx:65`**) | cartão de domínio (CANONE-1) ou `Card` |
| Botão-ícone à mão (`clubes/clube/ClubeShell.tsx:45-52`) | 1 | `IconButton` |

**Dívida estrutural desta onda:** o primeiro import cross-route do painel. `clubes/engajamento`
consome `overview/_components/OcupacaoEventos`, `overview/_components/EmBreveV3` e
`overview/_lib/ocupacao` (`EngajamentoPage.tsx:19`, `EngajamentoView.tsx:51-53`). A promoção para
`src/components/` exige tocar a Visão Geral ratificada (D-1008-R3) — por isso vive aqui e não na
Onda 5: é a onda de clubes que herdou o débito, e o consumidor decide o lugar do compartilhado.

**Carona de copy** (`leela-uxw-fix.md`, todas nesta superfície):
`be-hero.com.br` hardcoded em **seis** lugares — `clubes/clube/ClubeShell.tsx:56` (o MEL-21),
`clubes/novo/NovoClubePage.tsx:113-114`, `lib/linkPublico.ts:22`,
`clubes/clube/desafios/DesafiosPage.tsx:34`, `ConviteModal.tsx:47`,
`clubes/clube/configuracoes/ConfiguracoesView.tsx:304`. Mais o jargão visível ao usuário:
"(RN-144)" em `ConfiguracoesView.tsx:400` e `DeletarClubeModal.tsx:85`; "(RN-141)" em
`ConfiguracoesView.tsx:343` e `NovoClubePage.tsx:210`.

**Anti-carga — 0 passos hoje, 0 depois, e ainda assim há carga a medir aqui.** O Engajamento abre
com o recorte em `TODOS_OS_CLUBS` (`EngajamentoPage.tsx:39`) e mostra tudo sem exigir clique. A
contagem de passos, sozinha, dá a essa tela nota máxima — e ela está errada sobre a experiência.

Cinco dos aproximadamente doze cartões da tela são marcadores "Em breve" sem fonte de dado:
check-ins realizados (`EngajamentoView.tsx:650-656`), mapa e volume de check-ins (`:658-671`),
conversão da base (`:726-732`) e formas de pagamento (`:755-761`). Não custam clique; custam
rolagem e leitura de texto explicativo sobre números que não vão acender nesta versão. É carga
cognitiva que a régua de passos não captura, e o critério 9 da rubrica de design captura:
"controles, etapas ou conceitos que servem à arquitetura e não ao job".

Esta onda acrescenta, por isso, **uma segunda medida**: número de blocos sem dado por tela, antes e
depois. A decisão sobre o que fazer com os cinco (esconder até ter fonte, ou manter como promessa
declarada) é da onda, com registro — não sobe ao dono, porque não é dinheiro nem dado pessoal e o
default é óbvio: bloco sem dado não ocupa a tela.

## Onda 5 · O relance e a base de clientes

**JTBD:** `§04.1` — *"Publico evento | Acompanhar resultado de relance"* (via a linha de resultado do
doc) e `§04.4` — *"Falo com patrocinador | Ter dados na mão"*. O CRM ancora no candidato **P8**
proposto em `2026-07-18-ux-review/02-jtbd.md §2` (*"conhecer meus clientes"*), ainda não ratificado
— citado como candidato, não como doc, para não forjar âncora.

**Superfícies:** `apps/painel/src/routes/overview/**` (15 arquivos) e
`apps/painel/src/routes/crm/**` (8 arquivos).

**Por que por último.** Serve consulta, não ação. Quem abre a Visão Geral já tem o evento no ar; a
dívida aqui custa atrito de leitura, não venda perdida nem fila no balcão. É a definição de
polimento na régua da §1, e polimento vem depois.

**Instâncias a converter — 20:**

| O que | Quantas | Para |
|---|---|---|
| Superfície reconstruída à mão | 15 (5 overview, 10 CRM) | `Card` |
| Botão-ícone à mão (`overview/_components/AgendaCard.tsx:92-105`, `:109-122`) | 2 | `IconButton` |
| Estado vazio artesanal (`overview/_components/Countdown.tsx:76`, `_components/RecentRegistrations.tsx:143`, `crm/ClienteDetailPage.tsx:134`) | 3 | `EmptyState` |

**Também aqui — F6:** a grade do calendário da Agenda usa `role="grid"` com botões diretos, sem
`row` nem `gridcell` e sem navegação por setas (`overview/_components/AgendaCard.tsx`). Ficou sem
prazo na lane HIFI-REC; ganha prazo aqui, porque é a mesma tela dos dois botões-ícone.

**Anti-carga — 2 passos hoje no CRM, 1 é o alvo.** O índice `/crm` abre em "Visão geral"
(`CrmRoutes.tsx:83-85`) e a lista de clientes exige clicar a aba (`CrmSubNav.tsx:46`). Não existe
segunda tela candidata a "clientes": a escolha de aba não decide nada, é navegação forçada por um
default. A ordenação já nasce em `ltv` (`ClientesPage.tsx:65`), então a lista serve o job assim que
aparece. Tarefa da onda: o índice do CRM cai onde o job está.

A Visão Geral fica em 0 passos, medida e confirmada — carrega Countdown, indicadores, Agenda com o
dia de hoje já selecionado (`AgendaCard.tsx:57-58`), ocupação e alertas sem exigir gesto
(`OverviewContent.tsx:110-209`). Nada a derrubar; a onda é procedência e a11y.

**Achado que a medição encontrou de lado:** `overview/_components/ActiveEvents.tsx` **não é
importado** por `OverviewContent.tsx` — o comentário em `OverviewContent.tsx:14-16` confirma que o
bloco saiu da tela. O componente só é referenciado pelo próprio teste. Código órfão sustentando
suíte verde: entra na onda como remoção ou como reintegração declarada, nunca como está.

**Fica fora — e JÁ FOI PAGO (correção do maestro, 11/08):** o defeito de aridade do
`tickFormatter` do BarChart (Recharts passa o índice como limite → rótulos de 1 caractere,
introduzido em `a826dc3a`) foi consertado pela lane BARCHART-FIX na mesma noite, ANTES do
merge: commit `89537700`, wrapper `formatarTickEixoY` + teste de aridade, presente na main
mergeada (`BarChart.tsx:142`). A leitura desta rodada capturou o estado pré-merge. Nenhuma
lane futura deve ser aberta para isto — conferir `formatarTickEixoY` antes de qualquer ação.

## Critério de aceite comum a todas as ondas

Herdado do DoD de Tela e da governança, com o que a L-021 acrescenta:

- [ ] toda instância convertida importa o componente do cânone; zero re-implementação nova
- [ ] AA por estado em cada componente tocado (contraste, foco de 2px `--border-focus`, teclado, ARIA)
- [ ] prova renderizada nos dois temas (L-019) — prova estática nunca basta
- [ ] o relatório do `leela-canon` acompanha o fechamento, com o número antes e depois
- [ ] a medição de passos publicada, antes e depois, para a tela representativa da onda
- [ ] `git commit --only` com pathspec; boards atualizados na aterrissagem

Onda que baixa o número de divergências mas sobe o número de passos **não fecha**. As duas ordens
do dono valem juntas, e a segunda é a que ele disse importar "principalmente".
