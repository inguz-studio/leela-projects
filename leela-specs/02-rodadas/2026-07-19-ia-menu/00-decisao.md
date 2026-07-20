---
tags: [leela, rodada, ia-menu, navegacao, decisao]
aliases: [Decisão de IA do menu, Menu novo, CRM e repasses por origem]
trace: leela-build-2d6ee98d
lote: IA-MENU
data: 2026-07-19
---

# 00 · A decisão — o menu principal encolhe e ganha sentido

> Rodada de **spec**. Nenhuma linha de código de produto saiu daqui. O que sai é o desenho ratificado, o mapa de para-onde-vai-cada-tela ([[01-mapa-de-para]]) e o lote de execução ([[02-fila-codigo]]).

## O que o Vitor disse (verbatim, 2026-07-19, noite)

> "não vejo no menu principal o CRM ou analytics, pois em análise de vendas e comunicação as coisas estão se misturando um pouco. No financeiro tenho a visão de perfil dos compradores, e comunicação tenho clientes e comunicação. Acho que poderíamos simplificar essas duas rotas em uma só, tendo subdivisões, deixando a parte repasses como uma subdivisão de eventos com a visão macro. Já que o caixa de eventos é separado dos repasses que poderão vir futuramente dos clubs, caso eles sejam pagos."

## O diagnóstico que ele fez, em outras palavras

O menu tinha duas portas para o mesmo assunto. **Financeiro › Análise** mostrava desempenho de vendas e o perfil demográfico de quem compra. **Comunicação** abria um hub chamado "Clientes & Comunicação" com a ficha individual de cada cliente. Quem quer conhecer o comprador precisava saber, de antemão, que metade da resposta estava atrás da palavra "Financeiro". E o menu ainda carregava um item **Analytics** que não levava a lugar nenhum.

Do outro lado, "Financeiro" prometia dinheiro e entregava duas coisas que não são a mesma: análise de vendas (que é conhecimento sobre o cliente) e repasses (que é o dinheiro saindo para a conta do organizador).

## O desenho ratificado

### 1. Nasce a área **CRM**, com três subdivisões

| Subdivisão | O que tem | De onde veio |
|---|---|---|
| **Visão geral** | desempenho de vendas, perfil demográfico dos compradores, cohort idade × sexo | era `Financeiro › Análise` |
| **Clientes** | lista cross-evento com LTV, ficha individual, histórico, aniversário | era o hub `Comunicação` |
| **Comunicação** | campanhas e disparo por segmento da base | é a superfície que ainda não existe (E19 · S1901-T4) |

O item de menu passa a se chamar **CRM** e leva a `/crm`. A troca entre as três subdivisões acontece por SubNav, no padrão §2.14 que o produto já usa em Eventos, Clubs e no antigo Financeiro.

### 2. **Repasses viram subdivisão de Eventos**, por origem

Repasse deixa de ser um assunto guarda-chuva e passa a pertencer à **origem do dinheiro**. Hoje a origem é uma só — eventos. Amanhã, se o clube pago existir, ele ganha a própria subdivisão de repasses, sem herdar nada de eventos.

O item **Eventos** ganha SubNav: **Eventos** (a lista que já existe) | **Repasses** (a visão macro — saldo, o que já foi repassado, o que está por liberar, quebrado por evento).

### 3. O evento ganha visão de caixa

Dentro de cada evento, a aba que hoje se chama "Resumo" dentro de Financeiro passa a se chamar **Caixa** — é o macro daquele evento: o que entrou, o que é taxa, o que sobra. Caixa do evento e repasse são coisas separadas, e o Vitor foi explícito nisso: *"o caixa de eventos é separado dos repasses"*.

A URL e a permissão da aba não mudam (`/eventos/{slug}/financeiro`, `area="financeiro"` na matriz de papéis) — muda o rótulo, que é o que a pessoa lê.

### 4. Duas entradas de menu morrem

- **Financeiro** deixa de existir. Os dois filhos se mudaram: Análise → CRM › Visão geral; Repasses → Eventos › Repasses.
- **Analytics** sai de vez. Era placeholder sem rota, já suprimido no painel pela RN-821; agora sai também do design system, para não voltar por descuido em outro consumidor.

O menu principal passa de 8 itens para **6**: Visão geral · Eventos · Clubs · CRM · Marcas · Configurações.

## O trade-off, e como o Vitor o fechou

Repasse por origem é a escolha certa para o produto que ele está construindo (o dinheiro do evento e o dinheiro do clube são fluxos diferentes, com liberação diferente), e cobra um preço quando a segunda origem chegar: dados bancários são do **organizador**, não da origem; o saque é um botão sobre um saldo que é dele; e o "quanto eu tenho a receber no total" precisa de um lugar.

Os três pontos foram levados a ele na mesma noite e **os três voltaram decididos**. Nada desta lane fica pendente.

## Decisões ratificadas (Vitor, 2026-07-19)

### 5. Dados bancários uma vez só; o saque acontece na origem

Aprovada a recomendação da lane. **Dados bancários viram Configurações › Dados de recebimento** — cadastro único do organizador, nunca duplicado por origem. O **saldo continua único** (RN-334) e o **saque acontece em cada origem** sobre esse saldo.

Com isso, RN-334 (saldo consolidado) e RN-346 (clawback de comissão) seguem valendo exatamente como estão, por profissional. A origem é uma dimensão do lançamento, não do titular — e mudar isso depois, com dinheiro real circulando, seria a migração que ninguém quer fazer.

**Consequência de UI que a execução não pode perder:** hoje o botão de solicitar repasse só existe quando há dados bancários salvos, porque o formulário está na mesma tela. Com o cadastro em Configurações, a tela de Repasses passa a checar o mesmo pré-requisito e, quando faltar, manda a pessoa para lá — nunca abre um modal de saque que vai falhar no servidor.

**Efeito colateral bem-vindo:** o item **Configurações** do menu, que era inerte desde sempre, ganha destino (`/conta`). A RN-233 ("item de menu sem rota é proibido") nasce sem exceção aberta.

### 6. Repasse individualizado por evento — e isso já é lei desde 13/07

Requisito dele, verbatim:

> "cada evento seu repasse, e deve ter o registro individualizado e controle. Embora ainda seja possível termos a visão geral e consolidada."

**Isto não é regra nova.** É a **RN-349**, que ele mesmo ratificou em 2026-07-13, e a **RN-358**, da revisão de UX de 18/07. As duas juntas dizem o que ele acabou de repetir: a tela de repasses mostra a quebra por evento (vendido, retido, disponível e os repasses associados a cada um) **e** o consolidado do tenant, na mesma superfície.

E está construído. O que o código já entrega hoje em `/financeiro/repasses`:

- quebra por evento (`RepassesPorEvento`, reader `repassesPorEvento`);
- histórico agrupado pelo campo `eventoId` do próprio lançamento — associação exata, não heurística;
- solicitação de repasse **com o evento escolhido** (`requestRepasse` recebe `eventoId`, o servidor valida que o evento é do tenant e recusa o que não for);
- os três cards de saldo como número autoritativo do servidor, declarados na tela como consolidado de todos os eventos (RN-358).

**Portanto o delta desta rodada é de navegação, não de domínio.** A tela inteira muda de endereço (`/financeiro/repasses` → `/eventos/repasses`) e nada do modelo de dados é tocado.

**A única lacuna real entre o que a RN-349 promete e o que existe** está do outro lado: a aba de **Caixa do evento** mostra "repassado R$ 0,00" com um aviso honesto, porque nunca leu o ledger de repasse — a informação existe, mas só na tela consolidada. Com "registro individualizado e controle" ratificado, isso vira delta explícito: a Caixa do evento passa a mostrar a linha de repasse **daquele** evento, lendo o reader que já existe, com atalho para a subdivisão macro. É reuso de leitor, não backend novo.

### 7. A visão consolidada vive em Eventos › Repasses

Nenhum lugar novo. O consolidado fica **na visão macro dentro de Eventos, junto do eixo de repasses** — exatamente onde a RN-358 já o colocou, só que agora nessa casa.

Foi descartada a ideia de um bloco de saldo na Visão geral: criaria um segundo lugar para o mesmo número, que é o problema que esta rodada existe para resolver.

### 8. Redirects — decisão delegada à lane

O Vitor delegou ("da forma que você julgar melhor"). O padrão escolhido é o mais simples que sobrevive a link salvo: **redirecionamento na entrada da rota, preservando o que vier depois do prefixo**, com um teste por linha do mapa. Sem camada nova, sem configuração de servidor, sem estado.

- `/financeiro` → `/crm`
- `/financeiro/repasses` → `/eventos/repasses`
- `/financeiro/qualquer-outra-coisa` → `/crm`
- `/crm/{chave-de-cliente}` (formato antigo) → `/crm/clientes/{chave}`

O preview local em `:5273` continua abrindo em qualquer URL que já estivesse na mão dele. O mapa completo, com a armadilha de ordem de rotas que isso cria, está em [[01-mapa-de-para]].

## O que esta rodada **não** mexe

- A comunicação **por evento** (E06, campanhas e automações em `/eventos/{slug}/comunicacao`) e **por clube** (E05, comunicados) continuam exatamente onde estão. O hub central soma, não substitui — essa regra já era do E19 e continua valendo.
- A disciplina de PII não afrouxa. CRM › Visão geral é agregado sem identidade (RN-820/RN-822, com supressão k=5 no cohort); CRM › Clientes é identidade individual (RN-172). Estar sob a mesma casca de menu **não** autoriza cruzar as duas camadas — a fronteira é de dado, não de tela.
- Nenhuma regra de dinheiro muda. Taxa, congelamento, estorno, clawback e liberação de repasse são exatamente os mesmos; o que muda é por qual porta se chega até eles.

## Regras de negócio novas nesta rodada

Detalhe e texto canônico ficam nos épicos. O resumo:

- **RN-233 · Navegação do painel em 6 áreas** (dono: E01). Visão geral · Eventos · Clubs · CRM · Marcas · Configurações. `Financeiro` e `Analytics` deixam de existir como itens de menu. Item de menu sem rota é proibido — se não leva a lugar nenhum, não entra; por isso `Configurações` passa a apontar para `/conta`.
- **RN-234 · Rota antiga nunca quebra** (dono: E01). Toda URL que existia antes da reorganização redireciona para o destino novo, preservando o que vier depois. Link salvo, favorito e o preview local continuam abrindo.
- **RN-366 · Repasse pertence à origem** (dono: E09). O repasse é subdivisão da origem que gerou o dinheiro — eventos hoje, clube pago no futuro; cada origem tem a própria visão macro. **Dados bancários são do titular, não da origem:** cadastro único em Configurações › Dados de recebimento (move a superfície da RN-354, sem mudar a regra de mascaramento). **O saldo permanece único** (RN-334 intacta) e o saque acontece na origem, sobre esse saldo. RN-349 (quebra por evento com registro e controle individualizados) e RN-358 (consolidado explícito na mesma superfície) **seguem vigentes sem alteração** — mudam de endereço, não de conteúdo.
- **RN-823 · A análise de vendas é a Visão geral do CRM** (dono: E11). Supersede a parte da RN-821 que fixava `/financeiro` como superfície única de análise. O destino do analytics do organizador passa a ser `CRM › Visão geral`; a supressão do item "Analytics" deixa de ser um filtro no consumidor e vira remoção no design system.

## Reconciliação com o que já estava escrito

| Onde | O que dizia | O que passa a valer |
|---|---|---|
| E19 (título e S1901) | hub "Clientes & Comunicação" no item `comunicacao` do menu | área **CRM** no item `crm`, com 3 subdivisões; o hub vira a subdivisão Comunicação |
| E11 · RN-821 | `/financeiro` = superfície única de análise; "Analytics" suprimido no consumidor | RN-823: a análise vive em `/crm`; "Analytics" sai do DS |
| E11 · plano ESPEC-SWEEP | território das tarefas de tela = `apps/painel/src/routes/financeiro/analise` | `apps/painel/src/routes/crm/visao-geral` |
| E09 · S-R9 repasses (RN-349 + RN-358) | `/financeiro/repasses` | `/eventos/repasses` — mesmo conteúdo, mesmo eixo por evento, mesmo consolidado |
| E09 · RN-354 (dados bancários) | seção dentro de Repasses | Configurações › Dados de recebimento (`/conta`) |
| E09 · "Redefinição da aba Financeiro" (Vitor, 2026-07-13) | menu "Financeiro" = ANÁLISE (E11); financeiro operacional na aba do evento; repasses em Repasses | evolução da mesma decisão: a análise sai do menu "Financeiro" (que morre) e vira CRM › Visão geral; o operacional por evento vira a aba **Caixa**; repasses viram subdivisão de Eventos |
| E03 · S207 | aba "Financeiro do evento", sub-aba "Resumo" | aba "Caixa do evento" (mesma URL e mesma permissão) + linha de repasse **daquele** evento (fecha a lacuna da RN-349 do lado do evento) |
