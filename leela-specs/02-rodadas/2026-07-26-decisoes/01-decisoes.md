---
tags: [leela, decisoes, rodada, produto]
aliases: ["Rodada de decisões 2026-07-26", "DEC-0726", "DEC-0726B"]
trace: leela-build-2d6ee98d
lote: DECISOES-0726
data: 2026-07-26
fonte: respostas do Vitor ao painel DECISOES-ABERTAS (retomada pós-pausa + arbitragem do PIX)
---

# Rodada de decisões do Vitor — 2026-07-26 (DEC-0726 e DEC-0726B)

Arquivo canônico das duas rodadas do dia. Preserva o **verbatim** do Vitor e registra a consolidação em RNs, épicos e lotes de código. O painel do que ainda depende dele vive em [[DECISOES-ABERTAS]]; quando um item resolve, ele sai de lá e o registro fica aqui.

## DEC-0726 (manhã) — retomada pós-pausa

> Verbatim integral: *"quanto ao asaas, nao precisamso disso agora. Bervo te passo mais tarde. e o ponto 4 pode seguir."*

### Asaas = adiado sem urgência

Os itens 8, 9, 10 e 12b do painel (chave sandbox, KYC, rotação da chave de produção e liberação para pagador estrangeiro) saem da fila ativa de cobrança. Ninguém volta a lembrá-los a cada retomada.

Consequências mantidas: o lote `ESTRANGEIRO-CHECKOUT` segue gated (nem contato com o gerente de contas agora) e a **rotação da chave de produção continua mandatória antes do primeiro deploy real**. O adiamento não cancela a rotação, só a desliga do dia a dia.

### Brevo = chave prometida

O Vitor disse que passaria a `BREVO_API_KEY` mais tarde no mesmo dia. Segue como a dependência externa de maior alavancagem: destrava o disparo a segmentos do CRM (E19), o convite de influenciador pessoa física (E08) e as campanhas por e-mail (E06).

Registro do que aconteceu depois, na tarde do mesmo dia: a chave chegou e foi ligada no `functions/.env`, validada ao vivo (`GET /v3/account` respondeu 200 depois que o Vitor desativou a trava de Authorised IPs, incompatível com Cloud Functions). Ficou faltando só a ativação da conta de envio pelo suporte do Brevo, que segue aberta no painel como item 13.

### "O ponto 4 pode seguir" = três defaults ratificados

Fecha as três pontas que a seção TAXA-FLEX do painel mantinha abertas desde 2026-07-19 (rodada `02-rodadas/2026-07-19-taxa-flex/`, verbatim de origem *"6% pix + 2,00 ou 8% de cartão + 1,50"*):

1. **Comissão de afiliado sobre o valor de face.** RN-310 confirmada; a premissa P-TAXAFLEX-3 fecha.
2. **Taxa da plataforma única por meio de pagamento no v1.** Sem variação por parcela. Refinamento futuro só se o Vitor reabrir.
3. **Reembolso não devolve a taxa de serviço.** O default operante do item 23 fica confirmado para seguir. A revisão fina do benchmark (`outputs/leela-build-2d6ee98d/BENCHMARK-REEMBOLSO-REPORT.md`) fica disponível se ele quiser reabrir.

Nota de continuidade: a ponta 3 voltou a ser mexida em 2026-07-27, quando a investigação do estorno mostrou que o código devolve a taxa e que reter dentro dos 7 dias tem risco jurídico nomeado. Virou a decisão D1 (item 42 do painel), ainda aberta.

## DEC-0726B (tarde) — arbitragem do PIX

Contexto: as lanes S1209-PIXBE e a review antagonista deixaram o servidor mandando o relógio, travando segunda cobrança viva e cancelando no gateway antes de expirar. Sobraram três decisões (reports `S1209-PIXBE-REPORT.md` e `S1209-PIXREV-REPORT.md`).

> Verbatim integral: *"25 - ok. 26 - nao existem carrinhos simultaneos, para isso temos o timer de 15 minutos ao momento de abertura do checkout, para conclusao de compra, nao concluiu? cancelamo. preisamos mapear os carrinhos abandonados também, para ter visibilidade depois (fase 2)."*

Leitura normalizada registrada no painel na mesma data: *"não existem carrinhos simultâneos: o checkout tem timer de 15 minutos a partir da abertura para concluir a compra; não concluiu, cancelamos."*

### Item 25 · opção (b) ratificada

Antes de criar cobrança nova, a antiga é cancelada no gateway **dentro do fluxo de criação** (disciplina gateway-primeiro do T3). Negativa honesta só quando o gateway recusa o cancelamento. Vira o lote de código `PIX-CARRINHO` (dinheiro, então rota opus mais review antagonista).

**Implementado em 2026-07-26** (lane PIX-CARRINHO, `7e957e9`) e com **review antagonista paga** (lane PIXCARRINHO-REV, aprovado com fixes). A trava não solta mais pelo relógio: morta significa que o gateway confirmou, nas duas lanes. Gateway recusa e a criação é negada com `pix_anterior_nao_encerrado`; o gateway voltando destrava sozinho, sem tela nova.

A review achou o furo que o próprio produtor apontou como risco: a negativa virava permanente quando o Asaas respondia que a cobrança **já tinha sido removida**. "Não consegui cancelar" e "já estava cancelada" chegavam pelo mesmo canal (4xx) e, como a chave da sentinela é determinística, toda tentativa daquele carrinho repetia o erro (12 provadas, estado imóvel). Corrigido: o adapter reconcilia por leitura (`GET /payments/{id}`) quando o DELETE não prova a morte, e só aceita resposta positiva (`DELETED` ou 404); paga, confirmada, pendente e ressuscitada continuam lançando. A matriz de contrato com as 12 respostas plausíveis ao DELETE ficou fixada na suíte. O bloqueio de go-live saiu. Detalhe na RN-157 do E12 e nos reports `PIX-CARRINHO-REPORT.md` e `PIXCARRINHO-REV-REPORT.md`.

### Item 26 · morre o teto, nasce o prazo do carrinho (RN-158 nova)

A regra não existia na spec (verificado em 2026-07-26; os "15 minutos" que já apareciam eram outro contexto). Nasceu nesta rodada e entrou no mesmo lote `PIX-CARRINHO`. Ponto cravado na spec do lote: a composição dos dois relógios, os 15 minutos do carrinho até concluir e os 30 minutos de validade do PIX já cobrado (RN-157).

**Fase 2, lastro novo do Vitor:** mapear carrinhos abandonados para visibilidade. Promove a ideia registrada no E06 §gatilhos (abandono de checkout) de "sem lastro" para backlog com dono.

**Implementado em 2026-07-26** (lane PIX-CARRINHO, `b7a2a77` e `522c23b`) e com **review antagonista paga** (aprovado com fixes). As duas definições ficaram cravadas: **abertura** é a primeira cotação daquele par comprador e evento no servidor; **concluir** é criar o pedido com a cobrança. Os dois relógios compõem em sequência (15 minutos até concluir, depois 30 minutos de PIX) e nenhum encurta o outro: concluir aos 14min59 dá os 30 minutos inteiros. Estado terminal `expirado_sem_concluir`, distinto do `pix_expirado`. A fase 2 **não foi construída**: só o dado nasce (`carrinhos/{uid}__{evento}/ciclos/{n}` com estado, instantes, evento e conta, sem dado pessoal novo), para que no dia da tela o histórico já exista.

**Duas coisas voltaram para o Vitor.** (1) "Abertura do checkout" igual a primeira cotação é a leitura mais fiel possível hoje, porque é o primeiro instante que chega ao servidor; qualquer sinal anterior exigiria fiação nova de tela, fora do território da lane. Se ele quis dizer outro ponto, ao entrar na tela ou ao chegar no pagamento, o ajuste é pequeno e a decisão é dele. **Esta ponta segue aberta como item 26 do painel.** (2) Quem chama a API sem passar pela cotação não tem carrinho e o prazo não o alcança; o portão deixa passar de propósito. Fechar isso seria tornar a cotação obrigatória para comprar, política nova que não foi ratificada. **Esta ponta ficou registrada e aceita.**

**A review antagonista atacou os dois pontos e não achou razão para mudar nenhum.** O portão que deixa passar foi medido: cotar o evento B não cria carrinho no evento A, e o buraco é exatamente o declarado, nem maior nem vazando entre eventos. Ninguém abre nem renova carrinho no nome de outra pessoa (o `uid` vem do `context.auth`), 20 recotações não movem o prazo um milissegundo, e 8 aberturas ou reaberturas simultâneas produzem **um** carrinho e **um** registro de abandono; um agregado que contasse duas vezes o mesmo abandono envenenaria a fase 2 em silêncio. Ficou fixado também um comportamento que a lane produziu sem declarar: a trava do PIX é por carrinho e o prazo da RN-158 é por evento, então trocar o conteúdo do carrinho depois dos 15 minutos não ganha prazo novo (senão bastaria acrescentar um atleta para renovar). E o "Function-only" de `carrinhos`, `ciclos` e `cobrancasPixAtivas`, que existia só em comentário, virou portão executável nas Rules reais.

## Efeitos no painel

- Itens 25 e 26 saem do corpo do painel. Do 26 fica aberta só a confirmação do que conta como abertura.
- A seção TAXA-FLEX sai inteira: as três pontas fecharam aqui.
- Os itens 8, 9, 10 e 12b continuam no painel como ações externas, com o marcador de adiados.
- Item 13 (Brevo) continua aberto, agora só na ativação da conta de envio.

## Fontes

`outputs/leela-build-2d6ee98d/S1209-PIXBE-REPORT.md` · `S1209-PIXREV-REPORT.md` · `PIX-CARRINHO-REPORT.md` · `PIXCARRINHO-REV-REPORT.md` · `BENCHMARK-REEMBOLSO-REPORT.md` · [[LEELA-E12-landing]] §RN-157 · [[LEELA-E09-financeiro-profissional]] §RN-158 · [[LEELA-E06-marketing]] §gatilhos
