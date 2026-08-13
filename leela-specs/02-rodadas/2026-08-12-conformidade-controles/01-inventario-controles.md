# Inventário medido das seis famílias de controle

> **A ordem que abriu a leva, na íntegra (12/08):** *"Pesquisadores, combobox, filtros, componente de
> seleção e pesquisa dos filtros e caiaxs de seleção naoe stao padronizados. Voce está apliacndo
> sempre o design system ou recriando eles do zero? se estiver recriando está quebrando uma regra
> nossa que nao pode ser quebrada. E precisamos ter uma leva de conferencia de conformidade ao
> design system apdronização de componentes também."*
>
> **Método.** Varredura estrutural de `apps/painel/src` (todas as rotas) e `apps/landing/app` — 303
> arquivos de tela, excluídos testes e stories. Padrões procurados: `<input`, `<select`,
> `type="checkbox"`, `role="combobox"`, `role="listbox"`, `aria-autocomplete`, `role="group"` com
> rótulo de filtro, popover e listbox artesanais, mais os nomes canônicos do DS. Cada hit foi lido
> no arquivo antes de virar linha. O que a régua não alcançou está declarado na §8.
>
> **Unidade de contagem.** Uma ocorrência é **um controle renderizado ou uma montagem de controle**.
> A fileira de chips de uma faceta é uma ocorrência; a barra que a hospeda é outra; o contador de
> resultado ao lado é uma terceira. Contar só o controle esconderia exatamente o que a medição achou.

## 1. A resposta, com número

**134 ocorrências. 68 conformes, 7 recriações onde o canônico existe, 59 recriações onde o canônico
não existe.**

| Veredito | O que significa | Quantas | % |
|---|---|---:|---:|
| **(a)** | usa o componente canônico do DS | **68** | 51% |
| **(b)** | recria onde o canônico EXISTE — violação da regra, conserto é adoção | **7** | 5% |
| **(c)** | recria onde NÃO existe canônico — a peça precisa nascer no DS (CANONE-1) | **59** | 44% |

**A hipótese de partida do brief estava certa pela metade, e a medição é quem corrige.** O brief
supunha que a violação objetiva fosse recriação onde o canônico existe. Ela existe, e são sete
casos — cinco por cento. O que domina é o outro mecanismo: em quarenta e quatro por cento das
ocorrências a tela monta à mão uma peça que o design system **nunca publicou**.

O produto não recria o controle. Recria o que fica em volta do controle.

## 2. Família 1 · Campo de busca e pesquisa

**Canônico:** `SearchInput` (cânone §3). **Proibido:** `<input type="search">` cru.

| Ocorrências | (a) | (b) | (c) |
|---:|---:|---:|---:|
| 12 | **12** | 0 | 0 |

Todas as doze usam o `SearchInput`. Zero `<input>` cru nos dois apps — a landing tinha uma
(`ShareBlock.tsx:47`, o link copiável) e a Onda 1 a converteu em 11/08, com a entrada morrendo da
lista de dívida do lint no mesmo dia.

| Arquivo:linha | Superfície |
|---|---|
| `clubes/clube/comunicacao/ComunicadosList.tsx:177` | comunicados do clube |
| `clubes/clube/desafios/DesafiosList.tsx:220` | desafios do clube |
| `clubes/clube/membros/MembrosList.tsx:129` | membros do clube |
| `clubes/hub/HubClubes.tsx:176` | hub de clubes |
| `crm/ClientesPage.tsx:109` | CRM · clientes |
| `eventos/afiliados/AfiliadosPage.tsx:208` | afiliados do evento |
| `eventos/comunicacao/CampanhasList.tsx:198` | campanhas |
| `eventos/entrega/AtendimentoPanel.tsx:266` | balcão de entrega |
| `eventos/inscritos/InscritosView.tsx:354` | inscritos |
| `parcerias/afiliacoes/InfluenciadoresPage.tsx:265` | influenciadores |
| `parcerias/assessorias/AssessoriasPage.tsx:175` | assessorias |
| `parcerias/marcas/MarcasPage.tsx:297` | marcas |

**Achado de design system, não de tela.** Onze dos doze consumidores passam `shortcutLabel={null}`.
O default do componente é `'⌘K'` (`SearchInput.tsx:45`) e ele desenha um `kbd` prometendo um atalho
que **não existe no painel**. Um default que noventa e dois por cento dos consumidores desligam não
é default, é imposto. O conserto é uma linha no DS, e ele apaga onze linhas de tela.

## 3. Família 2 · Combobox e autocomplete (escolher um valor com busca)

**Canônico:** `Combobox` — anatomia `Popover` + `Command` (cânone §1).

| Ocorrências | (a) | (b) | (c) |
|---:|---:|---:|---:|
| 4 | **2** | **1** | **1** |

| Arquivo:linha | O que usa hoje | Veredito |
|---|---|---|
| `clubes/clube/parcerias/AddPatrocinadorModal.tsx:180` | `Combobox` | **(a)** |
| `eventos/configuracoes/_components/EquipeLista.tsx:111` | `Combobox` | **(a)** |
| `eventos/afiliados/AfiliadoModal.tsx:283` | `Input` de texto livre para escolher o clube vinculado | **(b)** |
| `eventos/entrega/AtendimentoPanel.tsx:275-286` | `SearchInput` + `<ul>`/`<button>` de resultado montados à mão | **(c)** |

**O (b) está confessado no próprio arquivo.** `AfiliadoModal.tsx:8-11` registra: *"o Combobox/DS do
lote R9-A ainda não aterrissou nesta árvore; cupom/clube entram por Input simples e a troca pelo
Combobox fica como follow-up de conformidade quando o R9-A mergear"*. O R9-A mergeou. O follow-up
não. Escolher um clube existente por campo de texto livre é o cânone §1 invertido: cardinalidade
alta com busca é `Combobox`, e digitar um slug de memória é pior que rolar.

**O (c) é uma anatomia que o `Combobox` não tem.** O typeahead do balcão mostra os resultados
**inline, embaixo do campo**, sem popover e sem trigger — o operador digita o dorsal e a lista
aparece na mesma coluna. O `Combobox` do DS é picker de popover: abre por gatilho, fecha ao
escolher, devolve um valor. São dois padrões, não dois estilos. A Onda 2 do roadmap de 11/08 já
tinha visto isto e deixou a bifurcação escrita (*"`Combobox` em modo fluxo, se a CANONE-1 der o
modo; senão fica registrado como exceção"*). A CANONE-1 deu o modo: a peça nasce.

## 4. Família 3 · Barra e menu de filtros

**Canônicos:** `FilterMenu` (faceta com 4+ valores), `Chip` com `active` (faceta com menos de 4),
`Toolbar` (a linha que hospeda busca e ações). **Regra dura do cânone §1:** *"filtro nunca é
`Select`"*.

| Ocorrências | (a) | (b) | (c) |
|---:|---:|---:|---:|
| 50 | **8** | **5** | **37** |

Esta é a família onde a ordem do dono acerta em cheio, e é a maior das seis. Ela se parte em três
montagens que se contam separadamente porque falham por razões diferentes.

### 4.1 · A faceta — a fileira ou o menu de UM filtro (18 ocorrências)

| Veredito | Quantas | O que é |
|---|---:|---|
| **(a)** | 1 | `FilterMenu` em `eventos/hub/HubEventos.tsx:103` |
| **(b)** | 2 | `<button>` replicando a assinatura visual do `Chip`, com o `Chip` publicado |
| **(b)** | 3 | `Select` fazendo trabalho de filtro, contra a linha dura do cânone |
| **(c)** | 12 | `<div role="group" aria-label="Filtrar por …">` + `Chip.map()`, montado à mão |

As duas recriações de chip são duplicata uma da outra, escritas em telas diferentes com a mesma
lógica: `plataforma/tenants/TenantsList.tsx:37-60` e
`plataforma/repasses/RepassesFilaView.tsx:61-88`. As duas já estavam na Onda 3 do roadmap e as duas
já contam em `botao-cru-estilizado` no baseline do gate. Não são achado novo; são a confirmação de
que a catraca as vê.

Os três `Select` de filtro são novos:

| Arquivo:linha | O que filtra | Canônico correto |
|---|---|---|
| `clubes/engajamento/EngajamentoView.tsx:299` | quantos desafios mostrar (Top N / Todos) | `Chip` com `active` ou `Tabs` — cânone §1, alternância entre recortes |
| `clubes/engajamento/EngajamentoView.tsx:382` | quantas modalidades mostrar | idem |
| `clubes/engajamento/EngajamentoView.tsx:461` | qual club analisar | `Combobox` — recorte de cardinalidade alta |

Os doze grupos montados à mão, com o rótulo que cada um declara:

| Arquivo:linha | Faceta |
|---|---|
| `clubes/clube/comunicacao/ComunicadosList.tsx:185` | status |
| `clubes/clube/comunicacao/ComunicadosList.tsx:195` | canal |
| `clubes/clube/comunicacao/ComunicadosList.tsx:202` | origem |
| `clubes/clube/desafios/DesafiosList.tsx:228` | status |
| `clubes/clube/desafios/DesafiosList.tsx:238` | modelo |
| `clubes/clube/membros/MembrosList.tsx:138` | status |
| `clubes/clube/membros/MembrosList.tsx:148` | papel |
| `eventos/afiliados/AfiliadosPage.tsx:216` | tipo |
| `eventos/comunicacao/CampanhasList.tsx:205` | canal |
| `eventos/inscritos/InscritosView.tsx:390` | status, com contagem por chip |
| `plataforma/contas/ContasRoute.tsx:292` | modo de visualização |
| `plataforma/eventos/EventosGlobaisRoute.tsx:118` | status |

**Os doze têm a mesma anatomia, byte a byte na estrutura:** um `<div role="group">` com
`aria-label="Filtrar por X"`, `className="flex flex-wrap gap-[var(--spacing-2)]"`, um `Chip`
opcional de "Todos" e o `map` das opções. Sete deles compartilham até a mesma classe de espaçamento.
O `Chip` é canônico e está certo; o que se repete doze vezes é a montagem — e é a montagem que
decide se "Todos" existe, se a faceta é exclusiva ou empilhável, se o chip mostra contagem e como
o leitor de tela ouve o grupo. Hoje isso é escolha de cada tela, e as telas escolheram diferente:
oito têm o chip "Todos", quatro não; uma mostra contagem, onze não.

**O limiar do cânone não está sendo obedecido, e ninguém errou formalmente.** O `FilterMenu` existe
justamente para faceta com quatro ou mais valores (a regra Polaris citada no cabeçalho do próprio
componente). Doze facetas foram montadas como fileira de chips sem que ninguém contasse os valores,
porque não há contra o quê reprovar.

### 4.2 · A barra — o contêiner de busca, facetas e contador (20 ocorrências)

| Veredito | Quantas | O que é |
|---|---:|---|
| **(a)** | 7 | os sete usos de `ListaGlobal`, a casca do painel master que compõe `Toolbar` |
| **(c)** | 13 | barras montadas à mão, tela por tela |

A casca `plataforma/_components/ListaGlobal.tsx` é a única barra fatorada do produto, e o comentário
no topo dela diz exatamente por quê: *"em vez de dois arquivos que nascem iguais e divergem no
primeiro conserto"*. Ela é consumida por `ClubsGlobaisRoute:126`, `ContasRoute:321` e `:340`,
`EventosGlobaisRoute:143`, `ClientesTab:138`, `ClubsTabRoute:107` e `EventosTabRoute:119`.

Ela é **app-local**, não é do DS, e o oitavo consumidor já declarou a divergência: `VendasTab.tsx:6`
registra por escrito que não reusa a casca. Divergência com razão escrita é o melhor caso possível
de uma peça que devia ser do design system e não é.

As treze barras montadas à mão: `ComunicadosList:176`, `DesafiosList:219`, `MembrosList:128`,
`CampanhasList:197`, `AfiliadosPage:207`, `InscritosView:353`, `ClientesPage:108`, `MarcasPage:296`,
`AssessoriasPage:174`, `InfluenciadoresPage:265`, `HubClubes:176`, `HubEventos:99` e
`plataforma/tenants/VendasTab:183`.

### 4.3 · O contador de resultado filtrado (12 ocorrências)

Doze, todas **(c)**, e é o lugar onde a falta de peça mais aparece: doze escritas de uma frase de
seis palavras produziram três dialetos de ARIA e duas grafias.

| Arquivo:linha | Canal de ARIA | Grafia |
|---|---|---|
| `clubes/clube/comunicacao/ComunicadosList.tsx:213` | `aria-live="polite"` | "Mostrando" |
| `clubes/clube/desafios/DesafiosList.tsx:249` | `aria-live="polite"` | "Mostrando" |
| `clubes/clube/membros/MembrosList.tsx:159` | `aria-live="polite"` | "Mostrando" |
| `eventos/comunicacao/CampanhasList.tsx:215` | `aria-live="polite"` | "Mostrando" |
| `parcerias/marcas/MarcasPage.tsx:406` | `aria-live="polite"` | "Mostrando" |
| `plataforma/repasses/RepassesFilaView.tsx:184` | nenhum | "Mostrando" |
| `plataforma/tenants/TenantsList.tsx:166` | nenhum | "Mostrando" |
| `eventos/afiliados/AfiliadosPage.tsx:230` | `aria-live="polite"` | "mostrando" |
| `parcerias/afiliacoes/InfluenciadoresPage.tsx:274` | `aria-live="polite"` | "mostrando" |
| `eventos/inscritos/InscritosView.tsx:385` | `role="status"` | helper `contadorInscritos` |
| `plataforma/_components/ListaGlobal.tsx:104` | `aria-live="polite"` | helper `rotuloContagem` |
| `plataforma/tenants/VendasTab.tsx:193` | `aria-live="polite"` | helper `rotuloContagem` |

**Duas dessas doze têm consequência que não é de estilo.** As de `RepassesFilaView` e `TenantsList`
não têm canal de ARIA nenhum: quem filtra por teclado com leitor de tela não ouve que a lista mudou.
E o `rotuloContagem` do painel master existe porque a paginação por cursor não conhece o total —
ele nunca apresenta o carregado como total do sistema, o que é uma regra de honestidade de número
que as outras dez desconhecem, cada uma afirmando um total que só é verdade porque a lista é
pequena.

## 5. Família 4 · Select simples de formulário

**Canônico:** `Select` (cânone §3, escolha única até cerca de sete opções, sem busca).

| Ocorrências | (a) | (b) | (c) |
|---:|---:|---:|---:|
| 23 | **21** | **1** | **1** |

Os três `Select` que fazem trabalho de filtro estão contados na família 3, não aqui, para não
contar a mesma linha duas vezes.

**(b) — a única recriação de controle do produto inteiro:**
`plataforma/tenants/ProvisionTenantModal.tsx:150-158`. Um `<select>` nativo com dois `<option>`,
mais o `<label>` montado à mão acima dele com as classes que o `Select` já traz. Já está na dívida
do lint (`DIVIDA_CONTROLE_CRU`), já conta no baseline (`controle-cru-fora-do-ds: 3` — o select e as
duas opções) e já está na Onda 3 do roadmap. A conversão é de uma linha.

**(c) — padrão órfão:** `crm/ClientesPage.tsx:118` usa `Select` para **ordenar** a lista. O cânone
não tem linha para ordenação de lista. Não é filtro (não retira nada da lista) e não é campo de
formulário (não vira dado). Enquanto não houver decisão, a instância é permitida e contada, como
manda a §6 da spec do gate.

As vinte e uma conformes cobrem formulário de clube (`ConfiguracoesView:235`, `:242`, `:277`,
`NovoClubePage:127`, `:134`, `:170`), dados bancários (`DadosBancariosForm:106`), comunicação
(`AutomacoesPage:304`, `:315`, `CampanhaEditor:332`, `:341`), equipe
(`ConvidarMembroModal:114`), kits (`KitEditor:389`), repasses (`SolicitarRepasseModal:132`,
`RetencaoEditor:91`), parcerias (`ParceriaDetailPage:219`, `:234`), planos
(`AplicarPlanoModal:106`) e o checkout público (`StepDados:292`, `:489`, `StepResumo:238`).

## 6. Família 5 · Select com pesquisa (filtro e recorte com busca)

**Canônico:** `Combobox`.

| Ocorrências | (a) | (b) | (c) |
|---:|---:|---:|---:|
| 6 | **6** | 0 | 0 |

A família mais limpa das seis, e vale dizer por quê: ela nasceu depois do cânone, no lote R9-A, e
cada consumidor novo copiou o consumidor anterior em vez de inventar.

| Arquivo:linha | O que recorta |
|---|---|
| `crm/visao-geral/AnaliseVendasView.tsx:385` | análise por evento (RN-821) |
| `eventos/inscritos/InscritosView.tsx:362` | inscritos por kit |
| `eventos/inscritos/InscritosView.tsx:373` | inscritos por modalidade |
| `plataforma/clubs/ClubsGlobaisRoute.tsx:112` | clubs por tenant |
| `plataforma/eventos/EventosGlobaisRoute.tsx:104` | eventos por tenant |
| `plataforma/repasses/RepassesFilaView.tsx:172` | fila por tenant |

Zero combobox artesanal no produto: a varredura por `role="combobox"`, `role="listbox"`,
`role="option"`, `aria-autocomplete` e `aria-activedescendant` fora do design system **não teve um
único hit**.

## 7. Família 6 · Checkbox e caixas de seleção

**Canônico:** `Checkbox` (cânone §3). **Proibido:** `<input type="checkbox">` cru, com a severidade
declarada igual à do `<select>` nativo.

| Ocorrências | (a) | (b) | (c) |
|---:|---:|---:|---:|
| 39 | **19** | 0 | **20** |

**Procedência do controle: perfeita.** Dezenove `Checkbox`, todos do DS, nos dois apps. Zero
checkbox nativo. A proibição mais dura do cânone é a mais obedecida do produto.

**Montagem do rótulo: dezessete recriações, em três dialetos.** O `Checkbox` do DS não tem prop de
rótulo — `CheckboxProps` estende `InputHTMLAttributes` e acrescenta só `indeterminate`
(`Checkbox.tsx:23-27`). O `Field`, que o cânone indica para "rótulo + dica + erro +
`aria-describedby`", põe o rótulo **acima** do controle, e o rótulo de um checkbox vai **ao lado**.
Não há peça para o par. Então cada tela montou a sua:

| Dialeto | Quantas | Onde |
|---|---:|---|
| `<label className="flex items-center gap-[var(--spacing-2)]">` envolvendo o controle | 11 | `ConfiguracoesView:339`, `:379`, `DesafioEditor:194`, `NovoClubePage:209`, `InscritosView:408`, `ItemKitModal:243`, `:288`, `KitEditor:462`, `TaxaGlobalRoute:182`, `TermsEditor:344`, `:357` |
| `<label className="flex cursor-pointer items-start gap-3">` envolvendo o controle | 4 | landing: `AceitesCompra:138`, `:160`, `:190`, `StepDados:398` |
| `<div className="flex items-start gap-3">` + `<label htmlFor>` irmão | 2 | `CadastrarPage:239`, `PortasDaConta:422` |

**Os três dialetos não são gosto.** O primeiro alinha ao centro e quebra quando o rótulo tem duas
linhas. O segundo alinha ao topo e é o único que passa `cursor-pointer`. O terceiro não envolve o
controle, então depende do `htmlFor`/`id` casarem — e é o único dos três que funciona quando o
rótulo carrega um link (o aceite de termos da landing, que precisa disso, usa o segundo e resolve o
link por dentro). Três respostas para a mesma pergunta, e a diferença entre elas só aparece em
tela, nunca em teste.

As duas ocorrências restantes (`InscritosView:190` e `:198`, a coluna de seleção da tabela) usam
`aria-label` sem rótulo visível, que é o certo para célula de tabela. São **(a)**.

**Grupo de campos: três recriações.** `<fieldset>` + `<legend>` montados à mão hospedando
`Checkbox`, em `ItemKitModal:230`, `TaxaGlobalRoute:154` e `TermsEditor:299`. O cânone tem `Field`
para um controle e não tem nada para o grupo. (Há mais oito `fieldset` à mão no painel hospedando
`Chip` e `Input`; ficam fora desta contagem porque não são desta família, e entram na fila como
carona da peça de grupo.)

## 8. O que esta medição não cobriu, declarado

- **`apps/mobile`.** React Native não tem estes elementos e a adoção mobile é pendência já
  registrada na governança §2. Fora do escopo do brief.
- **`packages/design-system/showcase`.** O showroom demonstra os componentes e monta contraexemplos
  de propósito; o `eslint.config.mjs` já lhe concede a exceção documentada de um arquivo.
- **Escolha do padrão.** Este documento julga **procedência** e **existência de canônico**. Se um
  filtro devia ser chip ou dropdown, se uma marcação devia ser `Checkbox` ou `Switch`, é o critério
  9 da rubrica de design e não se decide aqui. A única exceção que atravessei é a linha dura do
  cânone (*"filtro nunca é `Select`"*), porque ela está escrita como regra e não como preferência.
- **Contagem de valores por faceta.** Não medi quantas opções cada uma das doze facetas tem, então
  não sei quantas passam do limiar de quatro que manda usar `FilterMenu`. A peça nova resolve isto
  por construção (ver `03-fila-em-ondas.md`, Onda C0).

## 9. O que a leitura cruzada com o roadmap de 11/08 acrescentou

O brief mandou não recontar o que já está contado. Não recontei, e o cruzamento produziu três fatos.

**Primeiro: as ondas de 11/08 não cobrem esta dívida.** As seis ondas somam 223 divergências, e 208
delas são superfície reconstruída (`Card`) mais moldura (`grade-crua`). Das 134 ocorrências desta
medição, apenas **5** já apareciam em alguma onda: o `<select>` do `ProvisionTenantModal` e os dois
chips à mão (Onda 3), o typeahead do balcão (Onda 2) e o `<Input type="date">` do `ConvitesView`
(Onda 3). As outras 129 são território novo.

**Segundo: a catraca não vê nenhuma das quatro peças que faltam.** As cinco contagens do
`gate-canon.mjs` medem superfície, botão, moldura, receita de grid e padrão órfão. Barra de filtro,
grupo de faceta, contador de resultado e par rótulo-checkbox passam por todas elas sem tocar em
nada. Uma décima terceira barra montada à mão entra hoje com o gate verde — é o mesmo buraco que a
L-021 nomeou, um nível abaixo.

**Terceiro, e este é achado de lado: o `gate-canon` está VERMELHO na main.** Rodando
`node scripts/gate-canon.mjs` na árvore de `f962efe3`, a saída é `GATE LEELA-CANON: FAIL (1)`:
`grade-crua.painel` subiu de 104 para 109. A catraca só desce, e ela pegou a regressão sozinha no
dia seguinte ao merge — cinco molduras novas escritas à mão depois de `Stack`, `FormGrid` e
`MetricGrid` existirem. Esta lane não conserta (leva de conferência, zero código de produto), e o
item abre a fila.

## 10. Resposta citável ao dono

> Nas seis famílias que você citou eu medi 134 ocorrências em 303 telas dos dois apps.
>
> **Você não está sendo desobedecido no controle.** Zero campo de texto cru, zero caixa de seleção
> nativa, zero combobox artesanal, e um único `<select>` do navegador no produto inteiro. Sessenta
> e oito ocorrências usam o componente da casa, e a família mais nova — o seletor com busca — está
> em seis de seis.
>
> **Sete lugares quebram a regra que você teme.** Duas telas do administrativo desenharam à mão um
> chip que já existe pronto; três controles da tela de Engajamento usam um seletor de formulário
> para filtrar, o que o cânone proíbe com essas palavras; um campo pede que a pessoa digite de
> memória o código de um clube que existe numa lista; e um modal do administrativo usa o seletor do
> navegador. Cinco por cento, todos com conserto de uma linha, e a fila já os tem nomeados.
>
> **Cinquenta e nove quebram a outra regra, e é aí que dói.** Não é o controle que está sendo
> refeito: é o que fica em volta dele. A barra de filtros foi montada à mão treze vezes. O grupo de
> chips de uma faceta, doze. O contador "Mostrando 12 de 40", doze — e as doze escreveram a mesma
> frase de três jeitos diferentes, duas delas sem avisar o leitor de tela que a lista mudou. O par
> rótulo mais caixinha, dezessete, em três desenhos que só se distinguem quando o rótulo quebra em
> duas linhas. **Nenhuma dessas quatro peças existe no design system.** Ninguém as recriou por
> preguiça; recriaram porque não havia o que importar.
>
> É exatamente o caso que a sua diretriz de 11/08 previu: *"se um componente não existe, precisamos
> documentar e padronizar o componente para não ficar refazendo ele."* A fila desta rodada faz as
> quatro nascerem primeiro, e só depois converte tela.

## Onde o resto mora

| Assunto | Documento |
|---|---|
| A extensão da catraca que passa a policiar estas famílias | `02-catraca-controles.md` |
| A fila de conserto em ondas | `03-fila-em-ondas.md` |
| O mapa padrão → componente canônico | `03-canon/canone-de-componentes.md` |
| A medição de 11/08 (superfície, moldura, botão) | `02-rodadas/2026-08-11-roadmap-componentes/02-inventario-componentes.md` |
| Spec original do gate | `02-rodadas/2026-08-11-roadmap-componentes/05-gate-leela-canon.md` |
| Épico dono | `03-canon/epics/LEELA-E01-design-system.md` |
