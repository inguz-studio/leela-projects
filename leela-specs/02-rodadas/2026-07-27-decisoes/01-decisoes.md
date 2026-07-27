---
tags: [leela, decisoes, rodada, produto]
aliases: ["Rodada de decisões 2026-07-27", "DEC-0727", "DEC-0727C"]
trace: leela-build-2d6ee98d
lote: DECISOES-0727
data: 2026-07-27
fonte: respostas do Vitor ao painel DECISOES-ABERTAS (madrugada) + resposta aos itens 37-41 da review da Caixa
---

# Rodada de decisões do Vitor — 2026-07-27 (DEC-0727 e DEC-0727C)

Arquivo canônico das rodadas do dia. Preserva o **verbatim** do Vitor e registra a consolidação em RNs, épicos e lotes de código. O painel do que ainda depende dele vive em [[DECISOES-ABERTAS]]; quando um item resolve, ele sai de lá e o registro fica aqui.

Nota de nomenclatura: o dia teve duas rodadas com conteúdo próprio, **DEC-0727** (madrugada) e **DEC-0727C** (a Caixa simples). O rótulo DEC-0727B chegou a ser usado para nomear "as decisões do dono do dia" em bloco, mas não corresponde a um conjunto separado de respostas: tudo o que o Vitor decidiu em 2026-07-27 está nas duas seções abaixo.

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

## Unificação do painel (mesma data)

Em 2026-07-27 o painel [[DECISOES-ABERTAS]] absorveu a camada descrita (o que é, por que importa, caso de uso, o que destrava) e os casos de uso que viviam em dois arquivos paralelos. Os dois foram removidos e não voltam. A proveniência das explicações absorvidas: [[CHECKOUT-UX-REPORT]] (D-2, D-4, D-5, D-6, D-7 e gênero) · [[COMF2-REPORT]] e [[LEELA-E08-influenciador]] (item 23 e o repasse parcial da fila) · `§S-R9-11` (HIP-R9-01) · [[ADR-016-firebase-storage-upload]] (item 18) · [[ADR-017-modal-e-primitivos-radix-free-superficie-publica]] (item 34) · [[D17-REPORT]] (item 35) · [[E19-CRM-REPORT]] e [[LEELA-E19-crm]] (item 36) · reports PIXCARRINHO-REV, IAMENU-REV, PAINEL-NAV-DIAG, NAVFIX-REV, SUITE-STAB e R6-ASAAS-SANDBOX (itens 27 a 33 e a dívida técnica).

## Efeitos no painel

- Itens 27, 28, 37, 38, 40 e 41 saem do corpo; ficam como uma linha na seção de resolvidas.
- P-IAMENU-1 sai do pré-go-live; P-IAMENU-2 sai resolvido.
- Item 39 continua aberto.
- Entram abertos os itens 42 a 45, vindos das quatro decisões da investigação do estorno.

## Fontes

`outputs/leela-build-2d6ee98d/INV-CANCEL-ESTORNO-REPORT.md` · `PIXCARRINHO-REV-REPORT.md` · `IAMENU-REV-REPORT.md` · `CAIXADISP-REV-REPORT.md` · `BENCHMARK-REEMBOLSO-REPORT.md` · [[LEELA-E09-financeiro-profissional]] · [[LEELA-E19-crm]] · [[LEELA-E12-landing]] · [[V1-KANBAN]]
