---
tags: [leela, rn, delta, leva22, rn-574, rn-575, rn-576, e01, e03, e04]
aliases: [Delta de RNs da leva 22]
atualizado: 2026-08-17
---

# Delta de regras de negócio — leva 22

> **Só o delta.** O texto canônico mora no épico dono de cada uma, e é lá que ele deve ser
> lido e alterado (CONVENCAO-BOARDS). Três regras novas, em três épicos.

| RN | Enunciado curto | Épico dono |
|---|---|---|
| **RN-574** | Menu terciário é padrão nomeado, com abas fixas que trocam conteúdo no lugar | [[LEELA-E01-design-system]] |
| **RN-575** | Preço de kit é editável, com efeito só para frente | [[LEELA-E04-config-vendas]] |
| **RN-576** | Kit é composição de itens cadastrados, e a contagem deriva do catálogo | [[LEELA-E03-operacao-evento]] |

---

## RN-574 (nova, dona = E01 · 2026-08-17) · o terciário é padrão nomeado, e ele não rola a página

**Navegação terciária com painel é padrão nomeado do design system.** Seção dentro de uma
página troca o conteúdo **no lugar**, sem mover o scroll da página; o estado da seção vive na
URL, para o endereço continuar colável; o indicador de seção ativa **desliza** entre
posições; e a peça é uma só, com orientação horizontal ou vertical, nunca uma variante por
nível de profundidade.

**O que ela separa, e é a razão de existir:** navegação entre **rotas** (`SubNav` /
`AreaSubNav`, semântica de `nav` e `aria-current`) e troca de **painel** dentro de uma rota
(o padrão novo, semântica de `tablist`). As duas se pareciam e faziam coisas diferentes; a
partir daqui a escolha tem critério escrito — seção que é destino de link e carrega dado
próprio continua rota; seção que é parte de uma mesma coisa vira painel.

**Ela nasce medida.** O padrão que o dono elogiou é **bespoke** e é o **único** lugar do
painel com scroll spy por `IntersectionObserver` mais `scrollIntoView`
(`clubes/clube/configuracoes/ConfiguracoesView.tsx:124-147`); os três níveis acima dele já
são canônicos; e o próprio cânone já dizia que variante por profundidade não deveria existir
(`03-canon/canone-de-componentes.md:234-235`). O `Tabs` do DS já resolve a parte difícil —
troca no lugar com a11y completa (`Tabs.tsx:137-152`) — e falta nele exatamente o que esta
regra exige: estado na URL (`:37-46`) e indicador deslizante (`:111-115`), este último com a
mecânica pronta e testada no `SubNav.tsx:98-112`.

**O que ela acrescenta às três vizinhas de procedência.** A RN-558 exige que instância de
padrão nomeado use o componente do cânone; a RN-568 diz que composição recorrente de
controles também é padrão nomeado; a RN-573 julga o que a tela diz. Esta julga **como a
seção se comporta** — uma tela pode usar o componente certo, com os tokens certos, sem
redundância, e ainda assim jogar o leitor 800px para baixo a cada clique.

**Ela estende a D-1008-R18** para um componente que aquela decisão deixou de fora de
propósito: a barra do padrão novo nasce sem fundo e sem borda inferior, como o `SubNav`, com
AA por estado medido contra o fundo da página. Escrito aqui em vez de aplicado em silêncio.

⚠️ **Condicionada ao vetável TERCIARIO-1.** A leitura "abas fixas mata o formato âncora" é o
default e é o que resolve a queixa; a palavra "fixas" também admite ler como barra sticky
sobre conteúdo rolável. O número é consumido de qualquer jeito, para não virar buraco — a
mesma disciplina da RN-546, da RN-557 e da RN-552.

**Falsificação:** clicar numa aba do padrão novo e medir `window.scrollY` antes e depois — se
mudar, a regra está violada. E abrir o endereço de uma aba não-primeira em janela nova: se
cair na primeira, o estado não está na URL.

**Onde aterrissa:** componente novo no design system, linha no cânone
`03-canon/canone-de-componentes.md`, e o critério no gate de UI. Spec em
`02-rodadas/2026-08-17-leva22/01-spec-menu-terciario.md`.

---

## RN-575 (nova, dona = E04 · 2026-08-17) · o preço do kit é editável, e só vale para frente

**O organizador pode editar o preço de um kit a qualquer momento, inclusive depois da
primeira venda. O efeito é estritamente prospectivo: nenhum pedido já realizado muda de
valor, em nenhuma superfície.** Preço de **evento** e de **lote** continuam congelados após a
primeira venda.

Decisão do dono, na íntegra: *"Quero alterar a RN-200, o organizador pode editar os preços
dos kits, se achar necessário, só que isso nao deve afetar pedidos já realizados. apenas da
edição para frente."*

### A RN-200 não é revogada — é recortada

Ela dizia: *"Após a 1ª venda, edição de preço do evento/kit é bloqueada"*
(`LEELA-E03-operacao-evento.md:39`). **O kit sai; o evento e o lote ficam.** O enunciado da
RN-200 **não é apagado**: fica legível e **marcado** no épico dono e nas cópias herdadas,
pela mesma disciplina que a RN-211, a RN-470 e a RN-416 receberam — ele continua explicando o
comportamento do código que está no ar até a onda D subir, e continua valendo inteiro para os
outros dois preços.

⚠️ **Correção a uma premissa herdada do brief desta lane.** O brief afirmava que a RN-497 já
havia revogado parte da RN-200. **Não revogou.** A RN-497 derrubou uma extensão que existia
apenas em comentário de código, trata do **lote**, e o épico é explícito: *"ela não muda de
enunciado"* (`:2193`) e *"A RN-200 permanece aqui, inalterada, e passa a ser exigível na
letra"* (`:2213`). Registrado porque premissa não conferida vira citação errada na spec
seguinte, e este índice existe para cortar isso.

### O veredito do snapshot, medido

**SNAPSHOT-PARCIAL**, e a metade que importa já está pronta.

O preço do kit é somado dentro de `pedido.itens[].valorBase` no ato da compra
(`packages/core/src/checkout/saleState.ts:294-300` →
`functions/src/checkout/createInscricaoCharge.ts:1361`) e **nunca é relido**. `ItemPedido`
(`packages/core/src/pedidos/pedido.ts:123-145`) tem cinco campos e nenhum é de kit. Nenhuma
superfície pós-compra lê preço de kit do documento vivo. **Liberar a edição hoje não altera
um centavo de nenhum pedido existente** — o dinheiro já obedece à regra antes de ela existir.

**Mas a regra não é só sobre dinheiro, e é aqui que ela acrescenta:**

1. **O pedido passa a carimbar o preço do kit na linha.** Sem isso ninguém prova depois
   quanto de uma compra foi kit — hoje não incomoda porque o preço é imutável, e no dia em
   que a edição existir a série histórica fica cega. Molde pronto no mesmo repositório e para
   o mesmo tipo de dado: `pagamento.taxaCongelada` (`packages/core/src/pedidos/pagamento.ts:468`,
   RN-179).
2. **Nome e composição do kit também não reescrevem compra antiga.** Renomear um kit hoje
   muda o que a confirmação de uma compra passada mostra (`CheckoutFlow.tsx:2052`, via
   `kitNomeFromId`), e trocar os itens muda o checklist do balcão (`_lib/balcao.ts:260`).
   Nenhuma Rule impede. **"Pedidos já realizados intocados" cobre isso**, mesmo sem dinheiro
   no meio — e é a parte da ordem que não parecia estar na ordem.

### Borda nomeada e não resolvida

O gatilho das três travas de hoje é `evento.qtdInscritos > 0`, que conta **qualquer status**,
inclusive PIX pendente (RN-487). Um comprador com PIX vivo está no meio de uma cotação. Se o
preço do kit mudar entre a cotação e a confirmação, ele paga um número e a tela mostrou
outro. **Congelar durante a janela, recusar a edição, ou aceitar com aviso** — a spec nomeia
e não decide.

**Falsificação:** criar pedido, editar o preço do kit, reler as seis superfícies pós-compra
(slide-in, confirmação, minhas compras, ingresso, PDF, e-mail) — todas devem mostrar o valor
antigo. E tentar editar preço de **lote** com venda: continua recusado, com o teste da RN-200
verde.

**Onde aterrissa:** [[LEELA-E04-config-vendas]], com a RN-200 marcada em
[[LEELA-E03-operacao-evento]]. Travas em `KitEditor.tsx:86`, `firestore.rules:1030-1033` e
`functions/src/eventos/guardPreco.ts:31-49`. Onda D.

---

## RN-576 (nova, dona = E03 · 2026-08-17) · o kit é um conjunto de itens cadastrados

**Um kit é composto por itens que já existem no catálogo de itens do evento. "O que está
incluso" deriva dessa composição em vez de ser digitado, e a contagem de itens do kit é a
contagem dos itens referenciados.** Texto livre deixa de ser porta de entrada.

Decisão do dono, na íntegra: *"Somente posso adicionar itens no kits, que já estejam
cadatrados como um item indivudal, Pois um kit é um conjunto de itens, e essa contagem deve
ser feita a partir disso."*

### Ela nasce barata, e a medição explica por quê

**As duas coisas já existem e não se falam.** Há catálogo real — `interface ItemKit`
(`packages/core/src/eventos/kit.ts:535`), coleção `itensKit/{itemId}`, vínculo N:N em
`item.kits` (`:566`, fonte de verdade da RN-215) — e há, **em paralelo**, uma lista de texto
livre, `Kit.itens: string[]` (`:92`), que o próprio core descreve como *"a visão é
decorativa"* (`:57-58`).

As duas convivem na mesma tela do editor, com estado separado desde a declaração
(`KitEditor.tsx:124-126` contra `:107`), e **nada lê uma para preencher a outra**. Então a
regra não manda construir catálogo: manda **parar de aceitar texto livre e derivar**.
Nenhuma migração de dado — os dois campos já são gravados, e `ItemKit.nome` é exatamente o
texto que hoje se digita.

⚠️ **O que ela não resolve, e é a única parte cara: quantidade não existe.** `ItemKit` não
tem campo de quantidade e `Kit.itens` é string solta. A coluna "Qtd." na tabela que o dono
pediu exige campo novo no core e nas Rules. Por isso a tabela **sem** quantidade sobe na onda
A e **com** quantidade na onda D.

### A borda do acervo

Kits que já existem têm `Kit.itens` com strings que podem não casar com nenhum `ItemKit`.
**A regra morde na escrita, nunca na leitura** — é a mesma disciplina que a RN-559 aplicou ao
piso de venda (*"não entra em `parseLote`, porque leitura e shape precisam continuar
aceitando doc legado"*). Documento legado continua legível, a tela **sinaliza** o que não
casa, e o organizador resolve item a item. Regra que inutiliza documento vivo é defeito, não
rigor — a lição que a SERV1-BUILD já pagou.

**Falsificação:** tentar gravar em "o que está incluso" um texto que não corresponde a nenhum
item do catálogo — recusa nomeada. Abrir um kit legado com string órfã — abre, mostra, marca.

**Onde aterrissa:** [[LEELA-E03-operacao-evento]] (o kit é entidade de lá, como a RN-506 a
RN-509 e a RN-572). Tela em `kits/KitEditor.tsx:445-471` e `:556-602`. Onda D, com a tabela
na onda A.

---

## Conferência da faixa

Refeita imediatamente antes do commit, por grep de `RN-574` a `RN-578` sobre o corpus inteiro
fora deste índice: **zero definições**. Os quatro retornos são prosa de rodadas anteriores
descrevendo as próprias varreduras — `2026-08-12-decisoes-dono/03-rns-delta.md:178`,
`2026-08-17-carga-cognitiva/05-rns-delta.md:63` e `:65`, e o handoff da CARGA-COGNITIVA —, o
molde de sempre. **A próxima livre começa na 577.**

A conferência foi feita **duas vezes**: no início da lane e no momento do commit. Não é zelo,
é a prática que o índice cravou depois da colisão da REGISTRO-CRM4-LEVA9 — e neste mesmo dia
17/08 a CARGA-COGNITIVA consumiu a 573 e a UI-ACOES-MOTION aterrissou sem consumir número,
que é exatamente o cenário de duas lanes no mesmo dia em que a primeira conferência envelhece.

## Os catorze itens que não consomem número

Bordas, botão editar, trilha, botão de voltar, espaçamentos, alertas, seletor de modalidades,
fotos, tabela de inclusos sem quantidade, o renome de Lotes para Modalidades, a página de
vendas mudando de casa, o credenciamento em duas abas, a barra de severidade quebrada e a
tabela do caixa **não consomem número**, e é deliberado.

Os primeiros são **conformidade a régua que já existe**: a §2.16 do guia visual (flat, sem
borda decorativa), a RN-558 (procedência), a RN-568 (composição recorrente) e a RN-399
(muda o que a pessoa lê, não o identificador) já os cobrem. Escrever regra nova para eles
criaria uma segunda definição do que já é lei — o problema que o índice existe para evitar.
**O caso das bordas é o mais claro: não falta regra, falta o `Card` obedecer à que existe.**

A tabela do caixa não consome número porque **não foi decidida** — é o item CAIXA-1 no painel
do dono, e regra escrita antes da resposta cravaria a pergunta que a spec ainda faz. Mesmo
molde da leva 10, do ARENA-1 e das levas 18 e 19 do mesmo dia.

Fica registrado aqui porque decisão do dono que não aparece nesta seção parece rodada que
esqueceu de registrar.
