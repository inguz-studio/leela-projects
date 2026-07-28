---
tags: [leela, decisoes, rodada, produto]
aliases: ["Rodada de decisões 2026-07-27", "DEC-0727", "DEC-0727C", "DEC-0727D"]
trace: leela-build-2d6ee98d
lote: DECISOES-0727
data: 2026-07-27
fonte: respostas do Vitor ao painel DECISOES-ABERTAS (madrugada) + resposta aos itens 37-41 da review da Caixa + rodada da noite sobre estorno, carrinho e preços
---

# Rodada de decisões do Vitor — 2026-07-27 (DEC-0727, DEC-0727C e DEC-0727D)

Arquivo canônico das rodadas do dia. Preserva o **verbatim** do Vitor e registra a consolidação em RNs, épicos e lotes de código. O painel do que ainda depende dele vive em [[DECISOES-ABERTAS]]; quando um item resolve, ele sai de lá e o registro fica aqui.

Nota de nomenclatura: o dia teve três rodadas com conteúdo próprio, **DEC-0727** (madrugada), **DEC-0727C** (a Caixa simples) e **DEC-0727D** (noite: estorno, carrinho, painel e preços). O rótulo DEC-0727B chegou a ser usado para nomear "as decisões do dono do dia" em bloco, mas não corresponde a um conjunto separado de respostas: tudo o que o Vitor decidiu em 2026-07-27 está nas três seções abaixo.

## DEC-0727 (madrugada) — estornos, teto do gateway e Caixa

### Cancelar inscrição pelo painel admin via estorno (pedido novo)

> Verbatim: *"para facilitar no inicio da operação, como nao teremos muitos braços, é mais fácil cancelarmos inscrições, através do estorno de pagamento via painel admin interno, onde cancelamos, via API, no ASAAS. Veja se isso é possivel."*

Lane de investigação somente-leitura despachada (INV-CANCEL-ESTORNO): mapear o que já existe (fila de reembolso S904-T5, `estornarInscricao`, suporte a estorno no `AsaasProvider`, RN-304 da vaga que não volta sozinha) e responder viabilidade mais plano.

**Veredito da investigação:** dá, e a maior parte já está construída. O estorno por inscrito via API do Asaas existe ponta a ponta e tem botão no painel hoje. Falta (a) decidir por qual porta o operador entra, (b) ensinar o sistema a aceitar que o Asaas responde "estou processando o estorno" em vez de "estornei", e (c) resolver a contradição de política sobre a taxa de serviço.

A investigação devolveu **quatro decisões de dono**, que entraram no painel numeradas de 42 a 45 e seguem abertas:

- **D1 (item 42)** · a taxa de serviço volta no estorno, e em qual bolso? Bloqueia a tarefa T4.
- **D2 (item 43)** · por qual porta o operador entra? Bloqueia a tarefa T2.
- **D3 (item 44)** · o admin pode furar o corte de véspera (RN-339)? Bloqueia a tarefa T3.
- **D4 (item 45)** · cancelar sem estornar entra no pacote? Opcional, tarefa L7.

Report completo: `outputs/leela-build-2d6ee98d/INV-CANCEL-ESTORNO-REPORT.md`.

### Item 27 · pagamento retardatário = estorno automático

> Verbatim: *"Sobre os pagamentos que caem depois, devemos cancelar automaticamente."*

Pagamento que entra depois do cancelamento cai num registro durável (`ignorado_estado_final`): o dinheiro saiu do comprador e fica anotado, e nada alerta. Das três saídas possíveis (estorno automático, fila de reconciliação, ressuscitar a inscrição), o Vitor escolheu o **estorno automático**.

Pré-requisito da review mantido: o contador com alerta sobre esse registro nasce **antes** do gatilho, senão a rotina de acerto nasce sem o momento em que alguém é avisado de que há acerto a fazer. A implementação entra no mesmo pacote de estorno da investigação acima, por usar a mesma mecânica de estorno no gateway. Fonte do achado: `PIXCARRINHO-REV-REPORT.md` §Escalados item 7.

### Item 28 · teto de 15 segundos no gateway

> Verbatim: *"Aceito o teto de 15s, de aguardar o asaas."*

> Verbatim, sobre a face para o comprador: *"confirmo a sugestao de falar 'processando pagamento'. Isso pode se aplicar para cartao e pix."*

Antes disso não existia teto em camada nenhuma: o adapter chamava `fetch` sem `AbortController` e a callable do checkout não declarava `timeoutSeconds`, então o único limite era o timeout da Function (60s) e o comprador recebia o erro genérico de uma Function que estourou, sem explicação sobre o gateway.

Teto por chamada no `request` do adapter (um lugar só, vale para todas as chamadas Asaas), erro tipado próprio, e o comprador vê "processando pagamento" nos dois meios quando o gateway demora.

**Lane ASAAS-TETO entregue** (`3279b1c`, `9a58dbe`, `e5e731b`): teto no `request` do adapter com `AsaasTimeoutError` de estado desconhecido, tela `ProcessandoPagamento` nos dois meios, callable com 120s derivados do pior caso de 7 chamadas. Aguarda review antagonista. Fonte do achado: `PIXCARRINHO-REV-REPORT.md` §A3-REV.

### P-IAMENU-1 · separar quem vê o agregado de quem vê a ficha = despriorizado

> Verbatim: *"nao é relevante agoar, visto que nem fizemos nada quanto à acessos admin, em configurações."*

O CRM tem duas camadas de dado muito diferentes. Visão geral mostra o público em agregado, sem identidade, com supressão de grupos pequenos (k=5). Clientes mostra a ficha individual, com nome, gênero, valor gasto e histórico. Depois da reorganização do menu as duas passaram a dividir a mesma casca, e a medida do código diz que as duas são liberadas pela mesma regra: a coleção de clientes é lida por quem escreve na conta do organizador, e a área do CRM não tem guarda de papel no roteador. Logo, quem vê o gráfico vê a lista.

Separar de verdade exige um papel no nível da conta do organizador que o painel não tem: o único papel existente vive dentro de um evento e não há como consultá-lo numa rota daquele nível. Por isso a lane não resolveu, é decisão de produto mais backend, não de tela. Ficou no lugar um portão executável de 16 testes que reprova por adição, fechando os quatro caminhos que borrariam a fronteira dentro do modelo atual (filtro demográfico na lista, ir do agregado para a ficha, filtro por endereço e exportar a base individual).

**Sai do pré-go-live.** O item volta quando o modelo de acessos admin em Configurações nascer. A base legal de LGPD segue com a nota explícita de revisitar antes do go-live, como o Vitor já havia mandado relevar em 2026-07-19. Fonte: [[LEELA-E19-crm]] §P-IAMENU-1 · `IAMENU-REV-REPORT.md`.

### P-IAMENU-2 · o disponível da Caixa abate o repassado

> Verbatim: *"sim disponivel tem que abater o que já foi repassado, isso é muito imoprtante."*

O cálculo do disponível na aba Caixa do evento partia da receita total, descontava a retenção e descontava o repassado, mas o repassado entrava cravado em zero. Isso fechava enquanto a Caixa exibia "repassado R$ 0,00". Depois que ela passou a ler o registro de repasse de verdade, a tela podia mostrar "repassado R$ 500" ao lado de um disponível calculado como se nada tivesse saído.

Ratificada a opção (a): **o disponível por evento abate os repasses vivos**. Autorizada também a reconciliação da função de derivação e da asserção de teste que ainda descreviam o mundo anterior.

**Lane CAIXA-DISPONIVEL entregue** (`7e8c3cd`, `05948f1`, `fe81a1c`) com **review antagonista paga, aprovado com fixes** (6 fixes, `5ea0bd3..1c9efb7`): soma do extrato de repasses exata até o centavo, inclusive na planilha exportada; falha de leitura do extrato deixou de virar "nada saiu" com disponível cheio; nota exata que declara o que absorveu e aponta o número oficial. A conta em si sobreviveu a todos os ataques. RN-351. A review devolveu **cinco decisões novas**, que viraram os itens 37 a 41 do painel; quatro fecharam na DEC-0727C abaixo e o item 39 segue aberto. Fonte: [[LEELA-E09-financeiro-profissional]] §P-IAMENU-2 · `IAMENU-REV-REPORT.md` · `CAIXADISP-REV-REPORT.md`.

## DEC-0727C — a Caixa simples (fecha os itens 37, 38, 40 e 41)

> Verbatim integral: *"o que devemos mostrar: Receita Total, Disponível para Repasse, Valor Repassado. 38, nao complica essa porra. Faz o simples. TUdo que entrou, menos tudo que foi repassado, e o que tem por repassar. Evento nao pode repassar mais do que tá liberado. Valor Repassado."*

- **Item 37 · a Caixa mostra três números:** Receita Total, Disponível para Repasse e Valor Repassado. O Disponível para Repasse é o que dá para repassar de verdade, na mesma base do saque autoritativo, o que acaba com a disputa entre o número bruto e o líquido. O card de retenção sai da conta visível e a diferença entre a receita e os outros dois fica implícita. O achado de origem media a divergência: mesmo evento e mesmo instante, a Caixa mostrava 9.700 e o saque autoritativo 8.000, uma liderança de cerca de 8,5% do bruto (R$ 4.774,45 no mock canônico).
- **Item 38 · "faz o simples":** a conta é tudo que entrou, menos tudo que foi repassado, e o que tem por repassar. Consequência de engenharia: **repasse sempre amarrado a um evento**. O default "sem associação (saldo geral)" morre, porque sem amarra a conta simples não fecha e o R$ 500 que não abate Caixa nenhuma volta pelo caminho padrão.
- **Item 40 · guarda dura:** evento não pode repassar mais do que está liberado. A validação do repasse passa a ser **por evento**; hoje ela valida só contra o saldo da conta do organizador, que era o furo achado pela review.
- **Item 41 · o nome é "Valor Repassado"**, não "Repasse comprometido", mesmo somando os repasses solicitados, aprovados e pagos.
- **Item 39 segue aberto:** o que a planilha exportada faz quando o extrato de repasses não pôde ser lido.

**Implementação:** lane CAIXA-SIMPLES armada, dispara na retomada. Toca o painel e a `requestRepasse` das functions, sequenciada depois que a ASAAS-TETO aterrissar.

## DEC-0727D — estorno, carrinho, painel e preços (noite)

Rodada respondida em bloco sobre o painel reformado. Fecha treze itens, adia quatro e devolve trabalho novo para quatro cards.

> Verbatim integral: *"42 aceito a proposta dos 7 dias. 43. Cancelamento automático, se estiver dentro da regra. se não nós podemos cancelar pelo painel admin. 44 - sim. 45, sim, o admin pode cancelar qualquer coisa. e o organizador também, se estiver dentro da regra de cancelamento. 39 nao é importante agora. 46, estorno só é feito utilizando via API do ASAAS, a solicitação é feita e pode cair. dependemos desse retorno do webhook deles. 26 - quanto a pessoa clica em garantir os ingressos, já começa o temporizador, ela tem 15 minutos para concluir a compra. 30 - o cancelamento de carrinho tem que ser uma regra de tempoe xpirado. Expirou o tempo? cancela. Nao é pra fazer varredura geral. 31 - nao entendi. 32, nao é urgente hoje, entao foda-se agora. deixa anotado pra depois. 47 - nao entendi. Mas qualquer tela deve mostrar para o usuário algo como um loading com "processando sua compra" se for o caso. Retomar compra esse caso de retomada de compra, pode ser somente se ela logar na área do cliente (que nao temos ainda) e ela entra para pagar. 33 - ok . 34 - me mostre aonde confiro, em qual porta? 35 - deixar como estar. 36 - pode adiar. nao entendi. 16 - as fontes dexem estar instaladas sempre, igual ao painel do organizador, se isso nao prejudicar o carregamento. 13 - brevo foi ativada. 14 - Leela + ainda nao vamos cobrar mensalidade. e SaaS, podemos deixar 249,00 já as parcelas, pode ir adicionando 2.5% a cada parcela, e depois eu edito.11, nao entendi. nao perciso de identidade de estrangeiro, pq vc ta me cobrando isso??? Dividas técnicas, resolvam todas."*

### O pacote de cancelamento e estorno (itens 42 a 46)

As quatro decisões que a investigação INV-CANCEL-ESTORNO devolveu fecharam todas, e a review do teto trouxe a quinta.

- **Item 42 · a taxa de serviço.** *"42 aceito a proposta dos 7 dias."* Vale a proposta: a taxa volta na rota automática, dentro dos 7 dias do art. 49, e fica retida na rota em análise, fora dessa janela. Isso encerra a contradição entre o item 23 ("não devolve") e o código, que devolvia sempre (`estornarInscricao.ts:365`), e afasta o risco medido no benchmark, onde o Procon-MG multou a Ingresse em R$ 300.047,34 por reter dentro do prazo de arrependimento. Destrava a tarefa T4 do pacote.
- **Item 43 · por qual porta o operador entra.** *"Cancelamento automático, se estiver dentro da regra. se não nós podemos cancelar pelo painel admin."* Dentro da regra de cancelamento, o fluxo é automático e não passa por operador. Fora da regra, o caminho é o painel admin interno. Destrava a tarefa T2.
- **Item 44 · o corte de véspera (RN-339).** *"44 - sim."* O admin pode cancelar na véspera da prova. A tarefa T3 precisa do caminho de exceção com motivo obrigatório e trilha.
- **Item 45 · cancelar sem devolver dinheiro.** *"sim, o admin pode cancelar qualquer coisa. e o organizador também, se estiver dentro da regra de cancelamento."* O caminho existe e tem dois níveis de alcance: o admin cancela qualquer coisa; o organizador cancela dentro da regra. Cobre cortesia, ausência e fraude, que hoje não têm saída. Destrava a tarefa L7.
- **Item 46 · a autoridade da confirmação do estorno.** *"46, estorno só é feito utilizando via API do ASAAS, a solicitação é feita e pode cair. dependemos desse retorno do webhook deles."* O estorno é sempre pedido pela API do Asaas, e quem diz que ele aconteceu é o aviso do Asaas (webhook), não a resposta imediata da chamada. O pedido pode cair, e cair não significa que não saiu. Consequência direta para o achado A-2 da review do teto: nada de re-envio automático de estorno, porque re-enviar sobre um estado desconhecido é o caminho para o comprador receber duas vezes.

A lane ESTORNO-ADMIN está **em execução** com estas cinco decisões no brief.

### O carrinho e a tela de processamento (itens 26, 30, 31 e 47)

- **Item 26 · onde o relógio começa.** *"26 - quanto a pessoa clica em garantir os ingressos, já começa o temporizador, ela tem 15 minutos para concluir a compra."* O ponto de partida dos 15 minutos passa a ser o clique em "Garantir inscrição", não a primeira cotação no servidor, que era o que a lane havia cravado por ser o único sinal existente. Trabalho novo: a RN-158 muda de ponto de partida, o que exige um sinal de abertura na entrada da tela. Virou card no backlog (E12).
- **Item 30 · como o carrinho vence.** *"30 - o cancelamento de carrinho tem que ser uma regra de tempoe xpirado. Expirou o tempo? cancela. Nao é pra fazer varredura geral."* A expiração é regra de tempo por carrinho, agendada, e não rodada que varre a base inteira. Registro honesto do estado atual: a regra já é aplicada no uso (carrinho vencido não conclui a compra) e a varredura de hoje serve só para carimbar o abandono. A engenharia propõe o desenho do substituto na lane, honrando o "sem varredura geral". Isso substitui a pergunta anterior sobre avisar quando a rodada sai lotada, que deixa de existir junto com a varredura. Virou card no backlog (E12/E09).
- **Item 31 · a mensagem de quem já pagou.** *"31 - nao entendi."* Respondido pelo que ele escreveu no item 47: qualquer tela deve mostrar "processando sua compra" quando for o caso. Então a mensagem errada, que falava de cobrança vencida para quem já tinha pagado, vira a frase de processamento. Fica a opção (a) da pergunta original: mensagem própria para o caso, sem tocar em estado. Entrou no card do carrinho.
- **Item 47 · o botão de tentar de novo.** *"47 - nao entendi. Mas qualquer tela deve mostrar para o usuário algo como um loading com "processando sua compra" se for o caso."* Direção dada: a tela trava e ocupa o comprador com o loading de "processando sua compra" enquanto o servidor ainda trabalha. Isso mata a corrida dos 70 segundos do aplicativo contra os 120 do servidor sem mexer em nenhum dos dois tempos, que é a opção (c) da pergunta. Trabalho novo: travar o botão pelo tempo restante. Entrou no card do carrinho.

### Adiados nesta rodada (itens 39, 32, 36 e 48)

- **Item 39 · planilha exportada com o extrato de repasses em falha.** *"39 nao é importante agora."* Sai do menu do painel. Na tela o caso já estava resolvido; o que fica parado é só a saída do arquivo.
- **Item 32 · trocar a conta do gateway.** *"32, nao é urgente hoje, entao foda-se agora. deixa anotado pra depois."* Anotado. Já era runbook de operação e continua sendo; só importa quando existir uma segunda conta.
- **Item 36 · última atividade no CRM.** *"36 - pode adiar."* Recomendação de adiar aceita.
- **Item 48 · retomar a compra.** *"Retomar compra esse caso de retomada de compra, pode ser somente se ela logar na área do cliente (que nao temos ainda) e ela entra para pagar."* A retomada passa a ser um caminho logado na área do cliente, que não existe. Sai do menu e volta quando a área nascer. Até lá o link da fatura é a saída interina, o que resolve o achado E-3 sem código novo.

### Painel, fontes e preços (itens 33, 34, 35, 16, 14 e 13)

- **Item 33 · menu lateral.** *"33 - ok ."* Conferência aprovada. As teclas de ativação ficam no default do link (Enter), sem regra nova.
- **Item 34 · onde conferir a ADR-017.** *"34 - me mostre aonde confiro, em qual porta?"* Pergunta legítima, e o painel não dizia. Segue aberto, agora com o endereço: `http://127.0.0.1:3000/meia-floripa-2026`, porta 3000, com o preview da landing no ar. O que ele procura: a página pública do evento abrindo sem erro e com o visual do design system.
- **Item 35 · reagendar campanha vencida.** *"35 - deixar como estar."* Fica terminal, como a engenharia recomendou. Recriar é o caminho.
- **Item 16 · fontes do site.** *"16 - as fontes dexem estar instaladas sempre, igual ao painel do organizador, se isso nao prejudicar o carregamento."* Exo 2 e JetBrains Mono passam a ser embarcadas sempre, no mesmo padrão do painel do organizador, com uma condição: não piorar o carregamento. A diretriz de busca e velocidade da landing vale como aceite dessa condição. Virou card no backlog (E12).
- **Item 14 · mensalidades e taxa por parcela.** *"14 - Leela + ainda nao vamos cobrar mensalidade. e SaaS, podemos deixar 249,00 já as parcelas, pode ir adicionando 2.5% a cada parcela, e depois eu edito."* Leela+ sem mensalidade por ora. SaaS a R$ 249,00. Nas parcelas, acréscimo de 2,5% a cada parcela, com o valor editável depois. Virou card no backlog (E16/E04).
- **Item 13 · Brevo.** *"13 - brevo foi ativada."* A conta foi ativada por ele. O re-teste da noite de 27/07 ainda devolveu 401, o que aponta para a trava de IPs autorizados ligada de novo — ela é incompatível com Cloud Functions, que não têm endereço fixo. O item segue aberto no painel com o passo que falta: desativar a trava em `app.brevo.com/security/authorised_ips` e informar o remetente verificado.

### O item 11 e o mal-entendido do estrangeiro

> Verbatim: *"11, nao entendi. nao perciso de identidade de estrangeiro, pq vc ta me cobrando isso???"*

O item 11 nunca teve relação com estrangeiro; quem trata disso é o item 12b, adiado por ele em 2026-07-26 e sem cobrança desde então. O texto do painel usava a palavra "identificação" ao lado de "segredos de pré-deploy" e foi lido como identidade de pessoa. Reescrito em língua simples: são três valores de configuração que o servidor precisa ter antes do primeiro deploy real — a chave que protege os dados bancários guardados (`BANK_DATA_KEY`), o endereço do monitoramento de erros (Sentry de staging) e a semente que embaralha a identificação dos clientes no CRM (`CRM_ID_PEPPER`). Sem eles, essas três partes falham fechadas de propósito. Nada a fazer agora.

### Dívida técnica

> Verbatim: *"Dividas técnicas, resolvam todas."*

A seção 🔧 do painel deixou de ser fila de decisão e virou lane em execução (DEBT-SWEEP), com a lista inteira. A única peça que a lane não fecha sozinha é a prova do cancelamento contra o ambiente de teste do Asaas, que depende da chave de sandbox do item 8, hoje adiado.

### Efeitos no painel (DEC-0727D)

- Saem do corpo e viram uma linha em ✅: itens 42, 43, 44, 45, 46, 26, 30, 31, 47, 33, 35, 16 e 14, mais a ordem sobre dívida técnica.
- Saem do menu e viram uma linha na lista de adiados: itens 39, 32, 36 e 48.
- Seguem abertos, reformulados: item 34 (com o endereço e a porta) e item 11 (em língua simples, sem estrangeiro).
- Segue aberto, atualizado: item 13 (conta ativada, trava de IPs pendente).
- A seção 🔧 passa a declarar execução, não decisão.
- Nascem quatro cards no backlog de [[V1-KANBAN]]: temporizador no clique, expiração por carrinho com a tela de processamento, fontes embarcadas e preços do SaaS com o acréscimo por parcela.

### Fontes da rodada

`outputs/leela-build-2d6ee98d/INV-CANCEL-ESTORNO-REPORT.md` · `BENCHMARK-REEMBOLSO-REPORT.md` · `ASAASTETO-REV-REPORT.md` §V2, §V4 e §E-3 · `PIXCARRINHO-REV-REPORT.md` §A5-REV · [[ADR-017-modal-e-primitivos-radix-free-superficie-publica]] · [[LEELA-E12-landing]] · [[LEELA-E04-config-vendas]]

## Unificação do painel (mesma data)

Em 2026-07-27 o painel [[DECISOES-ABERTAS]] absorveu a camada descrita (o que é, por que importa, caso de uso, o que destrava) e os casos de uso que viviam em dois arquivos paralelos. Os dois foram removidos e não voltam. A proveniência das explicações absorvidas: [[CHECKOUT-UX-REPORT]] (D-2, D-4, D-5, D-6, D-7 e gênero) · [[COMF2-REPORT]] e [[LEELA-E08-influenciador]] (item 23 e o repasse parcial da fila) · `§S-R9-11` (HIP-R9-01) · [[ADR-016-firebase-storage-upload]] (item 18) · [[ADR-017-modal-e-primitivos-radix-free-superficie-publica]] (item 34) · [[D17-REPORT]] (item 35) · [[E19-CRM-REPORT]] e [[LEELA-E19-crm]] (item 36) · reports PIXCARRINHO-REV, IAMENU-REV, PAINEL-NAV-DIAG, NAVFIX-REV, SUITE-STAB e R6-ASAAS-SANDBOX (itens 27 a 33 e a dívida técnica).

## Efeitos no painel (DEC-0727 e DEC-0727C)

- Itens 27, 28, 37, 38, 40 e 41 saem do corpo; ficam como uma linha na seção de resolvidas.
- P-IAMENU-1 sai do pré-go-live; P-IAMENU-2 sai resolvido.
- Item 39 continua aberto.
- Entram abertos os itens 42 a 45, vindos das quatro decisões da investigação do estorno.

## Fontes

`outputs/leela-build-2d6ee98d/INV-CANCEL-ESTORNO-REPORT.md` · `PIXCARRINHO-REV-REPORT.md` · `IAMENU-REV-REPORT.md` · `CAIXADISP-REV-REPORT.md` · `BENCHMARK-REEMBOLSO-REPORT.md` · [[LEELA-E09-financeiro-profissional]] · [[LEELA-E19-crm]] · [[LEELA-E12-landing]] · [[V1-KANBAN]]

## Rodada DEC-0727E (noite — item 29)

> Verbatim: *"autorizo o afrouxamento, só para a simulação, para eu testar."*

- **Item 29 · o simulador trava o preview depois que o emulador reinicia.** Autorizado o caminho honesto que a review propôs: o `MockPaymentProvider` responde "já cancelada" para cobrança desconhecida **apenas** quando o pedido correspondente já está vencido. Fora desse caso a guarda continua lançando erro, porque é ela que pega bug de quem chama — um tratamento genérico a devolveria ao ponto em que deixa de pegar bug de verdade. Produção (`AsaasProvider`) intocada; o afrouxamento existe para o Vitor testar no preview sem ficar refém da memória do simulador. Implementação: task T7 da lane ESTORNO-ADMIN, com teste das duas pontas (pedido vencido ⇒ "já cancelada"; pedido vivo ⇒ erro, como hoje).

Na mesma mensagem ele avisou *"IP autorizado"* no Brevo (item 13): a trava de Authorised IPs foi tratada por ele; o re-teste `BREVO_E2E=1` decide se o item avança — o que resta do item 13 depois de um re-teste verde é só o remetente verificado.

### Efeitos no painel

- Item 29 sai do menu e do detalhe; vira linha em ✅ (DEC-0727E).
- Item 13 segue aberto até o re-teste confirmar e o remetente verificado ser informado.

Fonte: `PIXCARRINHO-REV-REPORT.md` §A4-REV.
