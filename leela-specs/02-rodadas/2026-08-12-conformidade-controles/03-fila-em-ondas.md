# Fila de conserto, em ondas por job servido

> Sete ondas, ordenadas pelos mesmos três critérios do roadmap de 11/08: job servido ganha de
> dependência, que ganha de densidade da dívida. Nenhuma roda nesta rodada — cada uma nasce com
> brief próprio, e o que segue é a fila.
>
> **A ordem tem uma inversão declarada.** As seis ondas de 11/08 começam pelo dinheiro (landing e
> checkout). Esta fila começa por um enabler, e não é por conforto: 59 das 134 ocorrências não têm
> para onde ir. Converter tela antes de a peça existir é escrever a décima quarta barra de filtro
> com outro nome. A Onda C0 é a mesma decisão que a Onda 0 Parte B tomou em 11/08, pelo mesmo
> motivo, e o dono já pagou esse custo de olhos abertos uma vez.

## Fila

| Onda | O que serve | Ocorrências | Estimativa | Estado |
|---|---|---:|---|---|
| **C0** | enabler · as peças nascem no DS | — (destrava 59) | 2 a 3 dias | livre |
| **C1** | as 7 violações da regra que o dono citou | 7 | meio dia | livre, independe da C0 |
| **C2** | 04.1 *"me inscrever em poucos cliques"* — checkout e conta | 5 | meio dia | espera C0 |
| **C3** | 04.1 *"vendo inscrições chegarem"* — operação do evento | 17 | 1,5 dia | espera C0 |
| **C4** | 04.4 *"comunidade com rosto e nome"* — clubes | 26 | 2 dias | espera C0 |
| **C5** | 04.1 *"acompanhar resultado"* + 04.4 — parcerias e CRM | 15 | 1 dia | espera C0 |
| **C6** | 04.1 *"processo repasse"* — plataforma e administrativo | 24 | 1,5 dia | espera C0 |

Total: **94 ocorrências convertidas**, mais as 40 que já são conformes e ficam como estão. Cerca de
nove dias de lane, com a C0 valendo um terço deles.

## Onda C0 · As peças nascem no design system

**JTBD:** nenhum. **Enabler**, marcado como tal, seguindo o precedente honesto do projeto
(`S-R9-04`, `S-R9-05`, `S-R9-06`, `S-R9-10` e a própria Onda 0). Forjar âncora de JTBD para
infraestrutura é a fraude que a L-004 existe para impedir.

**Por que vem primeiro:** as ondas C2 a C6 convertem para componentes que ainda não existem.

### As cinco peças

| Peça | Anatomia, em uma linha | Substitui |
|---|---|---|
| `FilterChips` | recebe `options`, `selected`, `onChange`, `label`, `multiple` e `allLabel`; **escolhe sozinha** fileira de `Chip` (menos de 4 opções) ou `FilterMenu` (4+), fechando o limiar do cânone por construção | 12 grupos à mão + 2 chips recriados |
| `FilterBar` | slots `search` / `facets` / `count` / `actions`; layout, ARIA de `role="search"` e refluxo mobile num lugar só; compõe `Toolbar`, não a substitui | 13 barras à mão |
| `ResultCount` | recebe `visiveis`, `total`, `substantivo` e `temMais`; canal de ARIA **por prop com default `polite`**; nunca apresenta o carregado como total quando `temMais` | 12 contadores em 3 dialetos |
| `CheckboxField` | `Checkbox` + rótulo ao lado, `htmlFor`/`id` fiado, `description` e `errorMessage` opcionais, alinhamento ao topo quando o rótulo quebra | 17 pares em 3 dialetos |
| `FieldGroup` | `fieldset` + `legend` com o espaçamento que o navegador tira da legenda, `description` e `errorMessage` de grupo | 11 grupos à mão |

**Três decisões de desenho, escritas antes do código para ninguém as ajustar ao resultado.**

O `ResultCount` herda a honestidade do `rotuloContagem` do painel master, e não o contrário. Ele
existe porque a paginação por cursor não conhece o total: dez das doze instâncias afirmam um total
que só é verdade porque a lista é pequena. A peça leva a regra, não a exceção.

O canal de ARIA do `ResultCount` é prop, com default `aria-live="polite"` — o mesmo desenho que o
`Alert` já pratica e pela mesma razão (`role="alert"` com `aria-live="polite"` é contradição que o
navegador resolve do jeito dele). Duas das doze instâncias hoje não têm canal nenhum, e quem filtra
com leitor de tela não ouve que a lista mudou.

A `FilterChips` decidir sozinha entre chips e dropdown é o que fecha o limiar do cânone sem pedir
ao gate uma leitura que ele não faz. O script não sabe quantos valores uma faceta tem em execução;
a peça sabe, porque recebe a lista.

### Carona da C0 — três consertos de default, custo marginal zero

| Item | O que |
|---|---|
| `SearchInput.shortcutLabel` passa a `null` por default | 11 dos 12 consumidores desligam o `⌘K`, e o atalho não existe no painel: o `kbd` promete uma tecla que não faz nada. Apaga 11 linhas de tela. |
| `Combobox` ganha modo de fluxo, **ou** o balcão vira exceção com ADR | resultados inline sob o campo, sem popover e sem trigger. É a bifurcação que a Onda 2 de 11/08 deixou escrita e a CANONE-1 resolveu: a peça nasce. Único consumidor hoje: `eventos/entrega/AtendimentoPanel.tsx:275-286` |
| a regra 3 e as cinco contagens do `02-catraca-controles.md` entram | com o baseline medido nesta rodada e a dívida nomeada por onda |

### Também na C0, e não é desta família — o gate está vermelho

`node scripts/gate-canon.mjs` na main devolve `FAIL (1)`: `grade-crua.painel` subiu de 104 para
109 com o merge `f962efe3`. Cinco molduras novas escritas à mão depois de `Stack`, `FormGrid` e
`MetricGrid` existirem. **Nenhuma onda desta fila pode fechar com a catraca vermelha** — o critério
de aceite comum manda o relatório do `leela-canon` acompanhar o fechamento, e relatório de gate
reprovado não é prova de nada.

### Carona da C0 — as sete receitas que a lane do administrativo nomeou

A auditoria de `ADMINVISAO-ONDAS-235` mediu, dentro dos componentes que ela escreveu, sete montagens
inline que a Onda 0 Parte B tornou desnecessárias. Elas entram aqui porque são o mesmo mecanismo
desta rodada, num território vizinho.

| O que | Quantas | Para |
|---|---:|---|
| cabeçalho de seção inline | 3 | `SectionHeader` — cobre as três sozinho |
| par rótulo/valor inline | 4 | **peça nova candidata**, em `plataforma/tenants/_components/ResponsavelCard.tsx`, `FichaDoClienteDrawer.tsx`, `PlanoAplicadoCard.tsx` e a lista de divergências do mesmo arquivo |

As três de cabeçalho são adoção direta. As quatro de rótulo/valor são o mesmo caso das cinco peças
acima: quatro receitas para uma família, e a CANONE-1 manda a peça nascer. A C0 decide se ela é
componente próprio ou composição de `Stack` — e a decisão sai medida, com as quatro lidas linha a
linha antes, como o `CardDominio` foi decidido.

**Critério de aceite da C0:** cada peça com story, teste, contrato LLM, AA por estado e a linha do
cânone **no mesmo commit** (a Parte B escorregou nisso em `443394a1` e ficou registrado); prova
renderizada nos dois temas pelo toggle do Storybook (L-019); regra 3 e as cinco contagens ligadas
com baseline; `gate-canon` verde.

## Onda C1 · As sete violações

**JTBD:** nenhum diretamente, e ela vem cedo por outra razão: **é a resposta direta à pergunta do
dono.** São as sete ocorrências que quebram a regra que ele nomeou, e as sete são adoção de peça
que já existe. Independe da C0 — pode rodar em paralelo.

| Arquivo:linha | O que é hoje | Para | Já estava em |
|---|---|---|---|
| `plataforma/tenants/ProvisionTenantModal.tsx:150-158` | `<select>` nativo + 2 `<option>` + `<label>` à mão | `Select` | Onda 3 de 11/08 |
| `plataforma/tenants/TenantsList.tsx:37-60` | `<button>` replicando o `Chip` | `Chip` com `active` | Onda 3 de 11/08 |
| `plataforma/repasses/RepassesFilaView.tsx:61-88` | `<button>` replicando o `Chip` | `Chip` com `active` | Onda 3 de 11/08 |
| `clubes/engajamento/EngajamentoView.tsx:299` | `Select` filtrando (Top N / Todos) | `Chip` com `active` | — |
| `clubes/engajamento/EngajamentoView.tsx:382` | `Select` filtrando (Top N / Todas) | `Chip` com `active` | — |
| `clubes/engajamento/EngajamentoView.tsx:461` | `Select` escolhendo o club analisado | `Combobox` | — |
| `eventos/afiliados/AfiliadoModal.tsx:283` | `Input` de texto livre para o clube vinculado | `Combobox` | follow-up escrito no próprio arquivo, linhas 8-11 |

**Anti-carga:** zero passo hoje, zero depois nas sete. Nenhuma troca acrescenta clique. As três de
`EngajamentoView` **derrubam** carga de leitura: um seletor de formulário para escolher entre duas
opções ("Top 5" e "Todos") é dois toques onde um chip é um.

**Cuidado nomeado:** as duas conversões de chip do administrativo derrubam `botao-cru-estilizado`
de 6 para 4 no baseline. O commit que as converte atualiza o baseline no mesmo ato, com
`--atualizar`, nunca à mão.

## Onda C2 · O caminho do dinheiro

**JTBD:** `§04.1` — *"Descubro evento | Me inscrever em poucos cliques | Reduzir fricção | Atleta"*.

**Superfícies:** `apps/landing/app/(public)/[eventSlug]/inscricao/checkout/**` e
`(public)/minha-conta/**`.

| O que | Quantas | Para |
|---|---:|---|
| par rótulo + checkbox à mão | 5 (`AceitesCompra:138`, `:160`, `:190`, `StepDados:398`, `PortasDaConta:422`) | `CheckboxField` |

**Restrição herdada: ADR-017.** A landing é Radix-free por peso de bundle público. O `CheckboxField`
precisa entrar por `@leela/design-system/server` ou pelo boundary `app/_ds/ds.ts`, e a C0 tem de
provar isso no `server-safety.test.ts` antes da C2 abrir — o `Checkbox` já passa pelo `_ds/ds.ts` e
o par não pode ser o que quebra a fronteira.

**Por que só cinco ocorrências merecem uma onda:** três delas são os aceites de compra. É a tela
onde alguém que não conhece a marca marca uma caixa que tem efeito jurídico, e é a única do produto
onde o rótulo carrega um link que precisa ser clicável sem alternar a caixa. Dos três dialetos
medidos, o do aceite é o único que resolve isso, e ele resolve por dentro. A `CheckboxField` leva
esse caso como contrato, não como acidente.

**Anti-carga:** 16 passos hoje no checkout, e nenhum desta onda. A onda é procedência pura; os
passos são da Onda 1 de 11/08 e das decisões CKENDERECO-1 e CKPIX-1, que têm dono fora daqui.

## Onda C3 · A operação do evento

**JTBD:** `§04.1` — *"Vendo inscrições chegarem"*, *"Preparo a entrega de kits"*, *"Faço check-in no
balcão"*.

**Superfície:** `apps/painel/src/routes/eventos/**`.

| O que | Quantas | Para |
|---|---:|---|
| barra de filtro à mão | 3 (`InscritosView:353`, `CampanhasList:197`, `AfiliadosPage:207`) | `FilterBar` |
| grupo de faceta à mão | 3 (`InscritosView:390`, `CampanhasList:205`, `AfiliadosPage:216`) | `FilterChips` |
| contador de resultado | 3 (`InscritosView:385`, `CampanhasList:215`, `AfiliadosPage:230`) | `ResultCount` |
| par rótulo + checkbox | 4 (`InscritosView:408`, `ItemKitModal:243`, `:288`, `KitEditor:462`) | `CheckboxField` |
| grupo de campos à mão | 1 (`ItemKitModal:230`) | `FieldGroup` |
| typeahead de fluxo | 1 (`AtendimentoPanel:275-286`) | `Combobox` em modo fluxo (C0) ou exceção com ADR |
| `<Input type="date">` | 1 (`plataforma/convites/ConvitesView.tsx:142`) | `DateField`, que existe **para isto** desde o GATE-DS-W1 — carona, a rota é de plataforma mas o item é da família |
| **contagem de faceta a conferir** | 1 | `InscritosView:390` tem contagem por chip; a `FilterChips` precisa suportar `count` sem que a tela o desenhe |

**Anti-carga: 3 passos hoje no balcão, 3 depois, e isso é resultado, não omissão.** A RN-205 fundiu
"retirar kit" e "registrar presença" num gesto por decisão registrada, e o comentário no topo de
`AtendimentoPanel.tsx:5-6` a documenta. Onda que conserta componente e acrescenta passo **não
fecha**, mesmo zerando divergência.

## Onda C4 · A comunidade

**JTBD:** `§04.4` — *"comunidade com rosto e nome"*, *"pertencimento a comunidade local"*.

**Superfície:** `apps/painel/src/routes/clubes/**`.

| O que | Quantas | Para |
|---|---:|---|
| barra de filtro à mão | 4 (`ComunicadosList:176`, `DesafiosList:219`, `MembrosList:128`, `HubClubes:176`) | `FilterBar` |
| grupo de faceta à mão | 7 (`ComunicadosList:185`, `:195`, `:202`, `DesafiosList:228`, `:238`, `MembrosList:138`, `:148`) | `FilterChips` |
| contador de resultado | 3 (`ComunicadosList:213`, `DesafiosList:249`, `MembrosList:159`) | `ResultCount` |
| par rótulo + checkbox | 4 (`ConfiguracoesView:339`, `:379`, `DesafioEditor:194`, `NovoClubePage:209`) | `CheckboxField` |
| grupo de campos à mão | 3 (`DesafioEditor:305`, `PerfilPublicoEditor:261`, `:278`) | `FieldGroup` — carona, os três hospedam `Chip`, não `Checkbox` |
| conversão dos 3 `Select` de filtro | — | **já paga na C1** |

**A onda mais densa da fila, e a razão é uma só:** as três listas de clube (comunicados, desafios,
membros) são a mesma tela escrita três vezes. Anatomia idêntica na barra, no grupo de faceta, no
contador e no espaçamento. Sete das doze facetas do produto estão aqui.

**Carona de copy, herdada de `leela-uxw-fix.md`:** `be-hero.com.br` hardcoded em seis lugares desta
superfície, mais o jargão visível ao usuário ("(RN-144)" em `ConfiguracoesView:400` e
`DeletarClubeModal:85`; "(RN-141)" em `ConfiguracoesView:343` e `NovoClubePage:210`).

**Anti-carga:** 0 passos hoje, 0 depois. Procedência pura.

## Onda C5 · Parcerias e o relance

**JTBD:** `§04.4` — *"Falo com patrocinador | Ter dados na mão"* e `§04.1` — *"acompanhar resultado
de relance"*. O CRM ancora no candidato **P8**, ainda não ratificado — citado como candidato, não
como doc.

**Superfícies:** `apps/painel/src/routes/parcerias/**` e `routes/crm/**`.

| O que | Quantas | Para |
|---|---:|---|
| barra de filtro à mão | 5 (`InfluenciadoresPage:265`, `AssessoriasPage:174`, `MarcasPage:296`, `ClientesPage:108`, `HubEventos:99`) | `FilterBar` |
| contador de resultado | 3 (`InfluenciadoresPage:274`, `MarcasPage:406`, mais o de `HubEventos` se existir) | `ResultCount` |
| `Select` de ordenação | 1 (`ClientesPage:118`) | **padrão órfão** — ver abaixo |

**O órfão desta onda precisa de decisão antes da conversão.** Ordenação de lista não tem linha no
cânone. Não é filtro (não retira nada) e não é campo de formulário (não vira dado). Três destinos
possíveis: prop `sort` da `FilterBar`, peça própria `SortSelect`, ou `Select` legítimo com linha
nova no cânone. A §6 da spec do gate manda contar e permitir enquanto a decisão não volta — e a
decisão **não sobe ao dono**, porque não é dinheiro nem dado pessoal e o default é técnico. Sai
decidida na onda, com registro e condição de reabertura.

**Anti-carga — 2 passos hoje no CRM, 1 é o alvo.** O índice `/crm` abre em "Visão geral"
(`CrmRoutes.tsx:83-85`) e a lista de clientes exige clicar a aba (`CrmSubNav.tsx:46`). Não existe
segunda tela candidata a "clientes". Herdado da Onda 5 de 11/08, e esta onda toca os mesmos
arquivos: leva junto.

## Onda C6 · A plataforma

**JTBD:** `§04.1` — *"Processo repasse | Ver saldo a liberar e disparar em lote | Admin"*.

**Superfície:** `apps/painel/src/routes/plataforma/**`.

| O que | Quantas | Para |
|---|---:|---|
| barra de filtro à mão | 1 (`VendasTab:183`) | `FilterBar` — a divergência já está declarada em `VendasTab.tsx:6` |
| grupo de faceta à mão | 2 (`ContasRoute:292`, `EventosGlobaisRoute:118`) | `FilterChips` |
| contador de resultado | 3 (`RepassesFilaView:184`, `TenantsList:166`, `VendasTab:193`) | `ResultCount` |
| par rótulo + checkbox | 4 (`TaxaGlobalRoute:182`, `TermsEditor:344`, `:357`, `CadastrarPage:239`) | `CheckboxField` |
| grupo de campos à mão | 4 (`TaxaGlobalRoute:154`, `TermsEditor:259`, `:299`, `PlanoFormModal:175`) | `FieldGroup` |
| as 7 receitas do administrativo | 7 | `SectionHeader` (3) + a peça de rótulo/valor que a C0 decidir (4) |
| `ListaGlobal` passa a compor a `FilterBar` | 7 usos | a casca app-local para de ser a única barra fatorada do produto |

**Duas das três conversões de contador desta onda têm consequência de acessibilidade, não de
estilo.** `RepassesFilaView:184` e `TenantsList:166` não têm canal de ARIA nenhum: filtrar por
teclado com leitor de tela não anuncia que a lista mudou. É a única correção de a11y real da fila
inteira, e ela cai numa tela que move dinheiro de terceiros.

**Por último na fila, e o critério é o do roadmap:** serve consulta e operação interna, não venda
nem fila no balcão. A dívida aqui custa atrito de leitura para quem já está dentro.

**Anti-carga — 4 passos hoje na fila de repasses, 4 depois.** Os quatro são dois pares de "clicar e
confirmar", e a dupla confirmação é mitigação declarada (`RepassesAdminRoute.tsx:9-11`), não sobra
de arquitetura. Derrubá-la seria trocar carga por risco.

## Critério de aceite comum

Herdado do roadmap de 11/08, com o que esta rodada acrescenta.

- [ ] toda instância convertida importa a peça do cânone; zero re-implementação nova
- [ ] AA por estado em cada componente tocado (contraste, foco de 2px `--border-focus`, teclado, ARIA)
- [ ] prova renderizada nos dois temas (L-019) — prova estática nunca basta
- [ ] o relatório do `leela-canon` acompanha o fechamento, com o número antes e depois, **e verde**
- [ ] as cinco contagens novas desceram e o baseline foi regravado por `--atualizar`, nunca à mão
- [ ] a medição de passos publicada, antes e depois, para a tela representativa da onda
- [ ] `git commit --only` com pathspec; boards atualizados na aterrissagem

**Onda que baixa o número de divergências e sobe o número de passos não fecha.** As duas ordens do
dono valem juntas, e a segunda é a que ele disse importar "principalmente".

## Um item de higiene que a varredura encontrou de lado

`apps/landing/app/(public)/[eventSlug]/inscricao/checkout/SeletorForma.tsx:9` traz, num comentário,
o termo que o dono baniu em 09/08 — o que começa com "v" e significa palavra por palavra. Citação
do dono na íntegra deve entrar como "na íntegra" ou entre aspas. Conserto de um token, sem efeito
em runtime, entra como carona da Onda C2, que já toca o checkout.
