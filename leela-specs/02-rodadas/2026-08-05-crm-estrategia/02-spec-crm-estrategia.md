---
tags: [leela, spec, rodada, crm, estrategia, localizacao, cep, coleta, lgpd, honestidade]
trace: leela-pixreal-diag-20260804
lote: SPEC-CRM-ESTRATEGIA
data: 2026-08-05
---

# 02-spec · O que o CRM pode mostrar, e o que vale a pena pedir

> Proposta, não decisão. Dez visões em ordem de valor sobre custo, a frente de localização por
> inteiro, oito recusas escritas, a régua de honestidade e a escada de coleta.
>
> **O resultado que mais importa vem antes das visões:** o dado que falta para responder quase
> tudo que o dono quer **já está sendo coletado** — e, em dois casos, já está sendo descartado no
> caminho. Os dois achados estão em §"Dois campos que já pedimos e jogamos fora".

## O que foi medido

Quatro varreduras de leitura sobre `apps/painel/src/routes/crm/**`, `apps/landing/app/(public)/`,
`packages/core/src/{pedidos,eventos,crm,analytics}`, `functions/src/{checkout,crm,analytics,eventos}`,
`firestore.rules` e `firestore.indexes.json`, mais os épicos E11, E12 e E19, o índice de RNs e as
rodadas CHECKOUT-UX, IA-MENU, pós-pagamento e métricas-e-serviço. Nenhuma query contra produção.

---

## Parte 1 · O inventário

### O que o participante entrega hoje, e onde isso mora

| Dado | Quem preenche | Onde é persistido | Evidência |
|---|---|---|---|
| Nome, e-mail, telefone | comprador (responsável) | `pedidos/{id}.responsavel` | `packages/core/src/pedidos/pedido.ts:97-110` |
| CPF | cada participante | `[reg]` do inscrito | `packages/core/src/eventos/dadosPessoais.ts:175` |
| Nascimento | cada participante | `[reg]` do inscrito | `dadosPessoais.ts:179`; form `StepDados.tsx:477-482` |
| Gênero (opcional) | cada participante | `[reg]` do inscrito | `dadosPessoais.ts:181`; form `StepDados.tsx:488-501` |
| **Endereço completo** — CEP 8 dígitos, logradouro, bairro, cidade, UF, número, complemento | comprador, **1× por pedido** | `pedidos/{id}.endereco` | `packages/core/src/pedidos/endereco.ts:39-51`; grava em `createInscricaoCharge.ts:1774-1778` |
| Modalidade, kit, tamanhos | cada participante | inscrito | `packages/core/src/eventos/inscrito.ts:137, 147, 175` |
| Aceites versionados, com IP em hash e user-agent | comprador | `pedidos/{id}.aceites` | `packages/core/src/pedidos/aceites.ts:107-137` |
| Consentimento LGPD da conta | participante que cria conta | `atletas/{uid}.consentimentoLgpd` | `functions/src/auth/confirmarCodigoDeAcesso.ts:416-433` |

Três campos existem no schema do inscrito e **nunca são coletados**: `cidade` e `uf`
(`dadosPessoais.ts:183-185`, com o comentário "checkout §5 não coleta cidade por atleta"),
`contatoEmergencia` e `restricoesMedicas` (`:187-189`, tipo e exibição no painel prontos, sem
nenhuma superfície de coleta).

### O comportamento que já está gravado e ninguém lê

Esta é a parte do inventário que surpreende. A Leela registra bem mais do que o painel mostra.

| Dado | Onde | Evidência |
|---|---|---|
| Forma de pagamento, parcelas, bandeira, últimos quatro dígitos | `pagamentos/{id}.cartao` | `packages/core/src/pedidos/pagamento.ts:228-239` |
| Taxa congelada por venda, com origem | `pagamentos/{id}.taxaCongelada` | `pagamento.ts:250-261` |
| Cupom usado, com escopo e clube de origem | `pagamentos/{id}.cupom` | `pagamento.ts:212-222` |
| Afiliado de origem, com o instante do clique e se veio de link ou de cupom | `pagamentos/{id}.afiliado` | `createInscricaoCharge.ts:1906-1911` |
| Ledger de conversão por afiliado, uma linha por pedido | `eventos/{e}/afiliados/{a}/conversoes/{pedidoId}` | `functions/src/checkout/webhookPagamento.ts:675-685` |
| **Carrinho abandonado, com ciclos** — aberto, expirado, concluído | `carrinhos/{uid}_{eventoId}` e `/ciclos/{n}` | `functions/src/checkout/carrinhoCheckout.ts:58, 70, 214-218` |
| Check-in na largada | `inscrito.checkinEm` | `inscrito.ts:188`; escrita em `registrarCheckin.ts:244-245` |
| Retirada de kit | `inscrito.kitEntregueEm` | `inscrito.ts:186` |
| Estorno, com valor, taxa devolvida e janela de arrependimento | `pagamentos/{id}/estornos/{inscritoId}` | `functions/src/checkout/estornarInscricao.ts:561-579` |
| Cancelamento, com trilha e quem executou | `pagamentos/{id}/cancelamentos/{inscritoId}` | `functions/src/finance/cancelarInscricao.ts:233-247` |
| Envio e abertura de comunicação | `logComunicacao` | `packages/core/src/comms/logComunicacao.ts:407, 420` |
| Cliente consolidado por tenant — LTV, valor gasto, nº de eventos, histórico | `tenants/{t}/crmClientes/{key}` | `packages/core/src/crm/cliente.ts:167-193` |

O carrinho merece destaque porque ele resolve, em parte, a lacuna que a rodada de ontem declarou.
**A Leela não conta visitantes, mas conta intenção de compra** — e conta desde que a janela de
quinze minutos existe.

### O que o CRM mostra hoje

Três abas (`apps/painel/src/routes/crm/_components/CrmSubNav.tsx:47-56`).

**Visão geral** (`/crm`) tem quatro blocos: desempenho com inscrições, receita e conversão
(`AnaliseVendasView.tsx:293-308`), perfil de compradores com faixa etária, sexo e o cohort idade ×
sexo (`:200-232`), modalidades (`:251`) e tamanhos de camiseta (`:269`). O seletor de período
existe na tela e **não recorta nada** — o estado é guardado em `AnaliseVendasPage.tsx:40` e nenhum
hook o consome (`:43-46`); a tela declara isso ao usuário em `AnaliseVendasView.tsx:418-427`.

**Clientes** (`/crm/clientes`) lista nome, gênero, nº de eventos, valor gasto e LTV, com busca por
prefixo de nome e quatro ordenações (`ClientesPage.tsx:31-36, 43-56`). A ficha individual mostra
gênero, idade ao vivo, aniversário, os quatro números e o histórico por evento
(`ClienteDetailPage.tsx:107-132`).

**Comunicação** (`/crm/comunicacao`) é uma casca honesta que diz o que ainda não existe
(`ComunicacaoIndisponivel.tsx:21-36`), travada na chave do Brevo.

### O que não existe, medido

Contagem de visitantes, em nenhuma camada (RN-489, varredura completa em
`02-rodadas/2026-08-05-metricas-e-servico/02-spec-metricas-e-servico.md:189-207`). Parâmetros de
campanha do tipo `utm`, zero ocorrências. Registro de quem pagou e não apareceu — derivável de
`status == 'confirmado' && checkinEm == null`, nunca gravado. Motivo estruturado de cancelamento:
o campo existe e é **texto livre de 3 a 500 caracteres**, sem enum
(`estornarInscricao.ts:255, 285-290`). Endereço ou coordenada do evento: `Evento.local` é string
livre (`packages/core/src/eventos/evento.ts:119`), e `latitude`, `longitude`, `GeoPoint` e
`coordenadas` não existem em lugar nenhum. Arena Social: zero linhas de código. FormBuilder: spec
apenas, `packages/core/src/forms/` não existe. PAR-Q e atestado: modelo, Rules e expurgo prontos
(`packages/core/src/eventos/saudeInscrito.ts:52-71`; `functions/src/eventos/expurgarSaude.ts`),
**sem nenhum writer de produção** — os únicos `set` da subcoleção estão em testes.

### Dois campos que já pedimos e jogamos fora

Aqui está o achado que sozinho justifica a varredura, e ele é duplo.

**O e-mail de cada participante.** O checkout exibe um campo de e-mail para cada atleta que não é
o comprador, com `required` (`StepDados.tsx:451-458`); o validador do cliente o exige
(`apps/landing/.../checkout/validacao.ts:37`); o contrato de transporte o carrega
(`packages/api-client/src/checkout.ts:117`); o payload o envia (`CheckoutFlow.tsx:1273`); e o
servidor valida (`packages/core/src/checkout/validarDados.ts:36`). Aí a Function monta o bloco
`[reg]` com CPF, nascimento, gênero e telefone e **não grava o e-mail**
(`createInscricaoCharge.ts:1669-1683`), porque `DadosPessoaisInscrito` não tem esse campo
(`dadosPessoais.ts:172-190`).

A consequência não é abstrata. **O organizador não tem como falar com quem participou do evento
dele, só com quem pagou.** Numa inscrição de família ou de equipe, três de quatro pessoas são
invisíveis para qualquer campanha. E a chave de identidade do CRM, que tenta CPF, depois e-mail,
depois `atletaId` (`crm/cliente.ts:93-106`), cai no último recurso para todo participante que não
comprou — o núcleo já documenta a limitação: *"não une cross-evento se a conta variar"* (`:15-16`).
Quando o CPF falta ou vem torto, o participante vira um cliente novo a cada evento.

Ninguém decidiu isso. É um campo que não nasceu, e a esteira herdou o buraco como se fosse regra.

**O código IBGE do município.** O lookup de CEP recebe do ViaCEP um objeto com dez campos e
aproveita quatro — logradouro, bairro, localidade e UF (`checkout/cep.ts:82-86, 137-145`). Entre os
descartados está `ibge`, o código de sete dígitos que identifica o município de forma canônica.

Sem ele, qualquer contagem por cidade depende de casar texto digitado por gente: "Florianópolis",
"Florianopolis", "FLORIANÓPOLIS" e "Floripa" são quatro cidades diferentes para um `groupBy`. E o
texto vem de gente com frequência real, porque o lookup é **fail-open** por contrato — API fora ou
CEP não encontrado nunca bloqueia a compra, e a pessoa digita à mão (`cep.ts:8-16`). Guardar o
`ibge` custa um campo opcional e **elimina o problema de normalização inteiro**, que é a única
parte cara da frente de localização.

---

## Parte 2 · As visões, em ordem de valor sobre custo

O critério de ordenação é único e vale a pena declará-lo: **uma visão vale pelo que ela muda numa
decisão que o organizador toma.** Gráfico que não muda decisão é enfeite caro de manter. Por isso
a lista começa com dinheiro e logística, e não com demografia, que é o que costuma abrir esse tipo
de proposta.

### V1 · De onde veio a venda

**A pergunta:** o meu afiliado e o meu clube parceiro trazem venda nova, ou só recebem comissão
por venda que eu já teria feito?

**O dado existe inteiro.** Cada pagamento carrega `cupom` e `afiliado`, com `origem: 'ref' | 'cupom'`
(`createInscricaoCharge.ts:1882-1893, 1906-1911`), e existe um ledger fechado de conversões por
afiliado, chaveado por pedido (`webhookPagamento.ts:675-685`). Falta só a repartição do bolo numa
tela: quanto do evento veio de link de afiliado, quanto de cupom, quanto direto, e quanto cada
canal custou em comissão.

**Custo:** baixo. Agregado por evento somando o que o webhook já grava, no molde de
`demografia/current`.

**Sem dado:** evento sem cupom e sem afiliado mostra cem por cento direto, que é verdade, não
lacuna. Nada a esconder.

**Por que é a primeira:** é a única visão da lista que muda um número de contrato. O organizador
que descobre que oitenta por cento das vendas do afiliado vieram de gente que já ia comprar
renegocia a comissão na semana seguinte.

### V2 · Distribuição geográfica dos compradores

A frente que o dono pediu por nome. Detalhe inteiro na Parte 3.

**Custo:** baixo para cidade e UF, médio para bairro, alto para distância.

**Por que é a segunda:** o dado está pronto e persistido, e é a única visão que responde uma
pergunta que o organizador não consegue responder de nenhum outro jeito — onde fazer a próxima
edição.

### V3 · Quem pagou e não apareceu

**A pergunta:** quantos compraram e não vieram? Isso muda quanto kit eu compro na próxima.

**O dado é derivação pura,** sem campo novo: `status == 'confirmado'` e `checkinEm == null`
depois da data do evento (`inscrito.ts:188`). O mesmo vale para kit não retirado (`:186`).

**Custo:** baixo.

**Sem dado, e aqui está o dente da régua:** um evento que não usou credenciamento tem zero
check-ins, e a leitura ingênua diria "cem por cento de ausência". A tela precisa distinguir "todo
mundo faltou" de "ninguém escaneou", e a regra que proponho é dura: **a visão só existe para
eventos com pelo menos um check-in registrado.** Sem isso ela mente com número grande, que é a
pior forma de mentir.

### V4 · Como o meu público paga

**A pergunta:** PIX ou cartão? Em quantas parcelas? Vale ligar a antecipação?

**O dado existe:** `pagamento.forma` (só PIX e cartão — não há boleto no domínio, decisão de
05/07, `pagamento.ts:63-69`), `cartao.parcelas`, `cartao.bandeira`, `pixExpiraEm` e `pagoEm`.

**Custo:** baixo.

**Por que importa agora:** o painel tem quatro itens abertos sobre juros, custo de gateway e
antecipação de recebíveis (JUROS-1, JUROS-3, JUROS-4, JUROS-5). Nenhum deles pode ser decidido bem
sem saber a distribuição real de parcelamento da base. Esta visão é insumo de decisão do dono, não
só do organizador.

### V5 · Novos e recorrentes

**A pergunta:** este evento trouxe gente nova, ou é a mesma base comprando de novo?

**Metade do dado já está calculado.** O doc do cliente carrega `qtdEventos`, o número de eventos
distintos com inscrição confirmada (`crm/cliente.ts:174-175`), mantido por Function fechada sobre
o próprio ledger. Falta a contagem agregada por evento: quantos daqueles inscritos eram clientes
de primeira viagem.

**Custo:** médio-baixo. É projeção do que `agregarClientes` já computa.

**Sem dado:** primeiro evento do organizador mostra cem por cento novos, e a tela diz que é o
primeiro. Honesto e correto.

**Fronteira que não se atravessa:** recorrência é **dentro do tenant**. O `tenantId` entra dentro
do HMAC da chave do cliente exatamente para impedir correlacionar a mesma pessoa entre
organizadores (`functions/src/crm/agregarClientes.ts:125`, com o motivo escrito em `:22-24`).
"Este participante já comprou de outro organizador" é informação que a Leela tem e **não pode
mostrar**.

### V6 · O funil que existe de verdade

**A pergunta:** onde eu perco a venda?

**O dado existe e ninguém o lê.** `carrinhos/{uid}_{eventoId}` guarda o ciclo de cada tentativa,
com `status: aberto | expirado | concluido`, o instante de abertura e o de expiração
(`carrinhoCheckout.ts:58, 70, 214-218, 286-290`). Somado aos pedidos por status e aos PIX
expirados, isso é um funil de quatro degraus: **abriu o carrinho, virou pedido, gerou cobrança,
pagou.**

**Custo:** médio. Agregado novo por evento.

**O nome importa mais que a implementação.** Isto **não é taxa de conversão** e não pode ser
chamado assim. A conversão de tráfego precisa de visitantes, que não existem (RN-489), e o épico
E11 já promete uma terceira coisa com o mesmo nome — conversão por atribuição de link de clube
(PRD 7.1, RN-125/RN-311). Duas métricas diferentes com o mesmo rótulo já produziram um item de
painel; três produziriam um defeito. O nome proposto é **"onde a compra parou"**, e ele descreve o
que a tela faz.

**Sem dado:** evento sem carrinho aberto mostra só os degraus que existem, nunca os quatro com
zeros.

### V7 · Ritmo de venda, e a comparação com a edição anterior

**A pergunta:** vou encher? Estou à frente ou atrás do meu último evento nesta altura?

**O dado existe** — `pedido.criadoEm`, `pagamento.pagoEm`, e o índice
`pedidos(tenantId, eventoId, criadoEm DESC)` já está declarado em `firestore.indexes.json`.

**Custo: alto, e a causa não é esta visão.** Série temporal depende do rollup de período
`S821-T1`, que é o gargalo declarado do E11 (`LEELA-E11-analytics.md:345-352`) e o que faria o
seletor de período do CRM deixar de ser inerte. Enquanto ele não existir, qualquer curva aqui é
recálculo no cliente, que a governança do épico proíbe.

**A armadilha, e ela é a mais perigosa da lista.** Os campos do snapshot diário são de **estoque**,
não de fluxo. Somar `receitaConfirmada` de trinta dias dá trinta vezes o número errado. A regra já
está escrita no épico (`LEELA-E11-analytics.md:341`) e vale palavra por palavra para qualquer
coisa que esta rodada proponha: métrica de fluxo no período é diferença entre as pontas, métrica de
estoque é o valor da ponta final. Errar isso produz um número plausível e falso, que é o pior modo
de falha de um painel financeiro.

**Por que vale mesmo cara:** é a pergunta que o organizador faz todo dia até o evento acontecer.
Nenhuma outra visão desta lista é consultada com essa frequência.

### V8 · Por que devolvem o dinheiro

**A pergunta:** estou perdendo venda por preço, por data, por desistência ou por erro meu?

**O dado quase existe.** Cada estorno grava um doc com valor, taxa devolvida, se estava na janela
de arrependimento, quem solicitou — e **`motivo` como texto livre de 3 a 500 caracteres**
(`estornarInscricao.ts:255, 285-290`). Cancelamento sem dinheiro segue o mesmo desenho
(`cancelarInscricao.ts:60-61`). Texto livre não agrega, então a visão não é construível hoje.

**Custo:** baixo depois de uma decisão de produto, e a decisão é pequena: uma lista curta de
motivos com "outro, descreva" ao lado, preservando o texto livre. O campo estruturado nasce vazio
para o histórico, e a tela declara a cobertura, como o cohort já faz com nascimento.

**Sem dado:** os estornos anteriores à mudança aparecem como "sem motivo registrado", nunca
distribuídos num motivo inventado.

### V9 · Interesses da base

**A pergunta:** que tipo de experiência a minha base quer que eu faça?

**O dado não existe, e a regra que existe hoje proíbe entregá-lo ao organizador.** A Arena Social
está especificada (RN-471) e sem uma linha de código. A RN-472, que trata do campo sensível, é
explícita quanto à finalidade: *"conexão entre participantes dentro do produto, nunca projeção
pública, export de organizador ou marketing"* (`LEELA-E12-landing.md:2900-2911`). Os demais campos
da Arena — pilares de interesse, tipos de experiência, mini bio — têm visibilidade default de "só
a própria pessoa" até o veto **ARENA-1**, cuja terceira opção é justamente "organizador da
experiência também vê".

**Tradução direta para a pergunta do dono:** se ele quiser que o CRM mostre interesses, isso
depende de responder ARENA-1 pela terceira opção, e o campo de gêneros de pessoas fica de fora em
qualquer cenário.

**Custo:** alto, e a maior parte dele não é de código. Depende de ARENA-1, ARENA-2 (a lista dos
pilares não existe em documento nenhum) e ARENA-3, mais a revisão jurídica que já viaja no LGPD-1.

### V10 · Satisfação depois do evento

**A pergunta:** valeu a pena para quem foi?

**Nada existe.** Nenhum campo, nenhum canal, nenhuma pergunta.

**Custo:** médio, e o bloqueio é externo — o disparo por segmento depende do hub de comunicação
(`S1901-T4a/b/c`), travado na chave do Brevo (`LEELA-E19-crm.md:200`).

**Por que fica por último apesar do valor alto:** é a única visão da lista cujo dado depende de a
pessoa querer responder. Todas as outras leem o que já aconteceu.

### O quadro, junto

| # | Visão | Dado existe? | Custo | Bloqueio |
|---|---|---|---|---|
| V1 | De onde veio a venda | sim, inteiro | baixo | — |
| V2 | Distribuição geográfica | sim, inteiro | baixo a médio | **CRM-2** |
| V3 | Quem pagou e não apareceu | derivação pura | baixo | — |
| V4 | Como o público paga | sim, inteiro | baixo | — |
| V5 | Novos e recorrentes | metade calculada | médio-baixo | — |
| V6 | Onde a compra parou | sim, não lido | médio | — |
| V7 | Ritmo de venda | sim, sem série | **alto** | rollup `S821-T1` |
| V8 | Por que devolvem o dinheiro | texto livre | baixo após decisão | coleta nova |
| V9 | Interesses da base | não | alto | ARENA-1/2/3 + jurídico |
| V10 | Satisfação | não | médio | Brevo |

---

## Parte 3 · A frente de localização

### O que já temos, e é mais do que parece

O endereço do comprador é persistido inteiro e canônico: CEP em oito dígitos sem máscara,
logradouro, bairro, cidade, UF, número e complemento (`packages/core/src/pedidos/endereco.ts:39-51`),
gravado pela Function do checkout (`createInscricaoCharge.ts:1774-1778`) e espelhado no registro
global da pessoa (`functions/src/checkout/pessoaRegistry.ts:105-108`). As Rules de `pedidos` negam
toda escrita de cliente, então o campo é inforjável por construção.

**Cidade, bairro e UF não são só de tela.** Eles chegam preenchidos pelo lookup e são salvos. Isso
significa que a distribuição geográfica **não precisa de nenhum serviço externo** — o
enriquecimento já aconteceu no instante da compra, de graça, e o resultado está no banco.

### Três coisas que precisam estar escritas antes de qualquer gráfico

**Primeira, e é a que mais muda a leitura: o endereço é do comprador, não do participante.** Está
declarado na origem: *"1× por pedido, coletado no checkout DEPOIS dos atletas... NUNCA por
inscrito"* (`endereco.ts:7-13`). Quem compra quatro ingressos para a família dá um endereço; os
outros três participantes não têm nenhum. Então qualquer mapa da Leela hoje descreve **de onde vem
o dinheiro**, não de onde vem a gente. A diferença é pequena num evento de compra individual e
grande num evento de equipe, e o rótulo da tela precisa dizer "compradores", não "participantes".
Trocar isso por descuido faria o organizador planejar logística com uma população que não é a que
vai aparecer.

**Segunda: a casa já proibiu isso uma vez, e por um bom motivo.** A premissa **P-CKMOD-1** diz que
o doc do cliente não ganha endereço nem cidade e UF derivadas dele, por minimização da RN-172, e
reserva a mudança para decisão explícita do dono (`LEELA-E19-crm.md:130`). **A proposta não pede
para revogar a premissa** — ela pede outra coisa. Endereço na ficha individual é um dado a mais
sobre uma pessoa nomeada, numa área que não tem papel por tenant (P-IAMENU-1). Contagem por cidade
num agregado sem identidade é a mesma arquitetura que a casa já usa para idade e sexo, com Rules
de escrita fechadas e nenhum caminho da tela para a pessoa. **A recomendação é: agregado sim,
ficha não.**

**Terceira: CEP é onde a pessoa recebe, não necessariamente onde ela mora.** Para logística de kit
é o dado certo, e é literalmente para isso que ele foi coletado. Para "de onde vem meu público" é
uma aproximação boa e vale usar, desde que a tela não prometa precisão de domicílio.

### O que dá para fazer, por custo

| # | O que | De onde sai | Enriquecimento externo |
|---|---|---|---|
| L1 | Distribuição por **UF** | campo `uf`, enum fechado (`UFS_BRASIL`) | **nenhum** |
| L2 | Distribuição por **cidade**, top N | campo `cidade` | **nenhum**, se o `ibge` for guardado; senão, normalização de texto |
| L3 | Distribuição por **bairro** dentro da cidade do evento | campo `bairro`, quando não vazio | **nenhum** |
| L4 | **Região por faixa de CEP**, para o que não tiver cidade | os oito dígitos do CEP | tabela estática dos Correios, embarcável — não é serviço |
| L5 | **Concentração acumulada do tenant**, para escolher a próxima praça | L1 a L3 somados por organizador, não por evento | **nenhum** |
| L6 | **Ponto de retirada de kit** sugerido por concentração de bairro | L3 mais o cronograma de entrega que já existe (`eventos/cronogramaEntrega.ts`) | **nenhum** |
| L7 | **Distância até o local do evento** | exige as duas pontas em coordenada | **sim, e falta a ponta de destino** |

### O que sai do dado cru, e o que não sai

**Sai do dado cru: L1, L2, L3, L4, L5 e L6.** Junto, isso é a maior parte do que a pergunta do dono
quer — de onde vem quem compra, onde concentrar a próxima edição, onde colocar o balcão de kit.
Nenhuma chamada externa, nenhum custo por consulta, nenhuma dependência nova.

**Não sai: L7.** E o bloqueio não é a geocodificação do participante — é que **o evento não tem
endereço.** `Evento.local` é string livre (`packages/core/src/eventos/evento.ts:119`), o parser
aceita qualquer coisa e devolve vazio quando falta (`:412`), e não existe `latitude`, `longitude`
nem `GeoPoint` em lugar nenhum do repositório. Sem destino não há distância, e geocodificar texto
livre de local de prova é a pior entrada possível para um serviço de geocodificação.

**Por isso a recomendação da frente é uma inversão de ordem.** Antes de qualquer cálculo de
distância, o barato e o útil é **dar endereço estruturado ao evento** — o mesmo bloco que o
checkout já usa, com o mesmo lookup de CEP, na configuração do evento. Isso vale por si, mesmo que
a distância nunca seja construída: destrava mapa na página pública, endereço correto no e-mail e
no ingresso, busca por proximidade na vitrine e o "eventos perto de você" que a home vai querer
quando o dono mexer nela (D-0802-1). A distância vira consequência barata depois, não a razão do
trabalho.

### O k-anonimato vale aqui também, e não é zelo

Cidade e bairro são identificadores indiretos fortes. "Um comprador em Urubici" é quase um nome, e
a área do CRM não tem separação de audiência (P-IAMENU-1). A casa já decidiu que cruzamento
demográfico exposto passa por supressão com k igual a cinco
(`packages/core/src/analytics/cohortPrivacidade.ts:82`), com os residuais de diferenciação
documentados no próprio módulo.

**A mesma régua vale para a geografia**, e por consequência direta daqueles residuais: cidade com
menos de cinco compradores entra em "outras", bairro só aparece dentro de cidade com volume, e
cruzar geografia com idade ou sexo **não acontece** — seria a reidentificação que o k=5 existe para
fechar, montada a partir de duas visões que sozinhas passam.

---

## Parte 4 · O que eu recuso, e por quê

Métrica bonita e inútil é dívida: alguém a mantém, alguém a explica, e ela ocupa o lugar da que
importava. Estas oito não entram, e cada uma tem a razão escrita para que a recusa não precise ser
redecidida daqui a dois meses.

**1. Taxa de conversão de tráfego, em qualquer forma.** Já é RN-489 e não se reabre aqui. O
acréscimo desta rodada é fechar a saída lateral: **não substituir o denominador por cliques em
link para ter um número.** Seria a terceira métrica da casa chamada "conversão", e a segunda a
nascer de um denominador que não mede o que o nome promete.

**2. Mapa com pino por participante.** É o pedido natural logo depois de "algo de localização", e é
o pior desenho possível. Um pino é um endereço; um endereço ao lado de uma lista nominal, numa área
sem papel por tenant, é a base inteira geolocalizada e identificada numa tela só. **Mapa, se
existir, é coroplético por cidade ou bairro, com k=5, sem drill-down para pessoa.**

**3. LTV preditivo, score de propensão, risco de churn.** Com dezenas a centenas de clientes por
organizador, qualquer modelo produz número com casa decimal e nenhum poder preditivo.
Pseudo-precisão é pior que ausência porque convence — o organizador toma decisão de preço em cima
de um número que é ruído formatado.

**4. Comparação com "a média da plataforma".** Duas razões independentes, e cada uma bastaria. A
Leela não tem base para dizer o que é média. E agregado cross-tenant vaza informação comercial de
um organizador para outro — o isolamento está dentro do HMAC de propósito
(`agregarClientes.ts:125`), e furá-lo por uma barra de comparação seria desfazer uma decisão de
arquitetura por causa de um gráfico.

**5. Filtro demográfico ou geográfico na lista de Clientes.** É exatamente o que o gate
`FronteiraPII.test.ts:100-108` reprova por adição. "Mulheres de 30 a 40 anos de Florianópolis" é a
base identificada recortada por atributo sensível, e o k=5 do agregado deixa de valer no mesmo
gesto. Se a necessidade real for falar com um segmento, o caminho é o disparo por segmento do
E19-S1901, que entrega a ação sem entregar a lista.

**6. Rótulo de "cliente VIP".** Ordenar por LTV já existe e resolve. Um selo na tela é juízo da
plataforma sobre uma pessoa, ele escapa para o atendimento, e nenhuma decisão do organizador
melhora por causa dele.

**7. Contagem de visitante por IP.** O contrato da RN-490 já diz que o contador nasce sem PII.
Reafirmo porque a implementação ingênua é sempre por IP, e ela arrastaria o contador para dentro
da conversa de retenção e expurgo, que é justamente o que a regra evitou.

**8. Exportar a base de clientes em CSV.** Também barrado pelo gate
(`FronteiraPII.test.ts:110-114`), e por um motivo que vale repetir: export é decisão, não layout.
Uma planilha com a base sai do controle de acesso da plataforma no primeiro anexo de e-mail. Se o
dono quiser, é item próprio, com a RN-144 de retenção ao lado.

---

## Parte 5 · A régua de honestidade

### Três estados, nunca dois

Toda visão desta proposta responde por escrito o que mostra sem dado, e a resposta tem três
saídas, não duas:

- **tem dado** — mostra;
- **ainda não tem** — estado vazio que diz **por quê**, e o molde já existe na casa: o CRM
  distingue hoje "em reprocessamento" de "sem dado ainda" (`AnaliseVendasView.tsx:178-186`);
- **não medimos isso** — o card **não é renderizado**, que é o default proposto no CONV-1.

A terceira saída é a que costuma faltar. Um card vazio ocupa espaço e ensina o organizador a
esperar um número que não vem, o que é pior que a ausência.

### O defeito que obriga uma regra permanente

Hoje a tela **não distingue número real de número de maquete**. Em produção o card de conversão
mostra `—`, porque a Function nunca escreve o campo (`agregarFinanceiro.ts:305-319` grava seis
campos e nenhum deles é conversão). Em preview ele mostra 68,2% no agregado do organizador e 42%
no recorte por evento, injetados pelo seed (`preview-seed-extra.ts:1171, 1282`) e lidos pela mesma
linha do CRM (`crm/visao-geral/_lib/desempenho.ts:40`). **É o mesmo componente nos dois casos, sem
nenhum marcador de proveniência.**

A regra que proponho, e que vale para toda visão nova: **nenhum campo que a Function de produção
não escreve pode ser lido por uma tela.** Ou o seed para de escrever campo que produção não tem,
ou o campo entra na Function. Os quatro que estão nessa situação hoje já têm nome —
`taxaConversaoPct`, `receitaSemana`, `ticketSparkline` e `receitaPorModalidade` — e três deles a
tela esconde, então o defeito visível é um só. O invisível é maior: qualquer visão futura pode
nascer bonita no preview e vazia em produção sem ninguém perceber.

### O seletor de período trava a fila, e é bom que trave

O seletor existe e não recorta nada (`AnaliseVendasPage.tsx:40` contra `:43-46`). Isso é honesto
hoje porque a tela declara a lacuna, mas deixa de ser no instante em que uma visão de série
temporal subir ao lado dele. **Nenhuma visão desta proposta que dependa de período entra antes do
rollup `S821-T1`.** V7 é a única nessa condição, e é por isso que ela está em sétimo lugar e não
em primeiro, apesar de ser a pergunta mais frequente do organizador.

### O que cada visão mostra sem dado

| Visão | Sem dado |
|---|---|
| V1 canal | cem por cento direto, que é verdade |
| V2 geografia | cidades com menos de cinco compradores em "outras"; nota de cobertura declarando quantos pedidos têm endereço |
| V3 presença | **não renderiza** para evento sem nenhum check-in |
| V4 pagamento | evento sem venda não tem o bloco |
| V5 recorrência | primeiro evento mostra cem por cento novos, e diz que é o primeiro |
| V6 funil | só os degraus que existem, nunca quatro zeros |
| V7 ritmo | **não renderiza** sem série; nunca soma estoque como se fosse fluxo |
| V8 devolução | estornos antigos como "sem motivo registrado", nunca redistribuídos |
| V9 interesses | **não renderiza** enquanto a Arena não existir |
| V10 satisfação | **não renderiza** sem resposta; nunca extrapola de amostra pequena |

---

## Parte 6 · LGPD, visão a visão

### O que vale para todas

A base do tratamento continua sendo a do CRM: **legítimo interesse sobre a base transacional
própria**, com finalidade de gestão e comunicação da própria base (P-E19-2 e RN-172,
`LEELA-E19-crm.md:33, 124`). Ela segue com a nota explícita de revisitar antes do go-live, e essa
nota não é apagada por esta rodada (`:147-148`). Nenhuma visão agregada desta proposta pede base
legal nova.

O que muda de fato é o volume de inferência possível sobre a mesma base, e por isso a régua k=5
deixa de ser exclusividade do cohort e passa a valer para qualquer cruzamento exposto.

### Por visão

| Visão | Base legal | Finalidade | Consentimento específico? |
|---|---|---|---|
| V1 canal | legítimo interesse (transacional) | gestão da própria base | não |
| V2 geografia agregada | legítimo interesse | gestão e planejamento da própria operação | **não, mas ver a nota de finalidade abaixo** |
| V3 presença | legítimo interesse | operação do evento | não |
| V4 pagamento | legítimo interesse | gestão financeira | não |
| V5 recorrência | legítimo interesse | gestão da própria base | não |
| V6 funil | dado de sessão do próprio comprador | melhoria do próprio checkout | não |
| V7 ritmo | agregado sem identidade | gestão comercial | não |
| V8 devolução | legítimo interesse | gestão de vendas | não |
| V9 interesses da Arena | **consentimento** | conexão entre participantes (RN-472) | **sim, e a finalidade atual exclui o organizador** |
| V10 satisfação | consentimento no ato de responder | melhoria da experiência | sim |

### Os três pontos que não são rotina

**A finalidade do endereço muda de escopo, e isso precisa ser dito.** O endereço foi coletado para
logística de entrega. Usá-lo para planejar onde fazer a próxima edição é finalidade adjacente, não
idêntica. A LGPD pede finalidade declarada, e o custo de declarar é uma linha na política e uma
frase no ato da coleta — algo como "usamos para a entrega e para entender de onde vem o público".
Esticar a finalidade em silêncio é barato hoje e caro exatamente quando alguém perguntar.

**Saúde não entra no CRM em nenhuma forma, nem agregada.** PAR-Q, atestado e restrições médicas
têm base legal própria de art. 11, consentimento específico e destacado, retenção própria de
noventa dias e expurgo programado (`saudeInscrito.ts:1-33`; `functions/src/eventos/expurgarSaude.ts`).
"Doze participantes com asma" é dado de saúde agregado, e o valor dele é operacional — equipe
médica, briefing de percurso — não é conhecimento de cliente. Se um dia existir, mora na operação
do evento, nunca nesta área.

**A Arena Social, como está escrita, exclui o organizador.** A RN-472 restringe a finalidade a
conexão entre participantes e nomeia o que fica de fora, incluindo *"export de organizador"*. O
campo de gêneros de pessoas fica fora do CRM em qualquer cenário. Os demais campos da Arena só
chegam ao organizador se o ARENA-1 for respondido pela terceira opção, e isso é decisão do dono,
não leitura de spec.

---

## Parte 7 · A escada de coleta

O princípio é único: **cada campo novo no checkout tem custo em venda perdida, e o checkout é a
única tela onde o dinheiro entra.** Por isso a escada anda para fora dele.

### Degrau 0 · o que já se pede na compra

Nome, e-mail e telefone do comprador; CPF e nascimento por participante; gênero opcional por
participante; endereço uma vez por pedido. O atrito já foi pago e já foi revisado na rodada
CHECKOUT-UX. **A proposta não acrescenta nenhum campo aqui.**

### Degrau 1 · o que custa zero de atrito porque já está na tela

Duas coisas, e as duas são conserto, não pedido.

**Guardar o e-mail que já se pede a cada participante.** Custo de atrito: **zero** — o campo já
está lá, é obrigatório e a pessoa já o preencheu. Ganho: o organizador passa a poder falar com quem
participou, não só com quem pagou; e a chave de identidade do CRM sai do último recurso
(`atletaId`) para o segundo (e-mail) sempre que o CPF falhar. É a mudança de maior retorno sobre
esforço de toda esta proposta, e sobe como **CRM-3** porque expande o que se guarda sobre alguém
que não é o comprador.

**Guardar o código IBGE do município.** Já vem na resposta do ViaCEP e é descartado
(`cep.ts:137-145`). Custo de atrito: zero, a pessoa não digita nada. Ganho: a contagem por cidade
deixa de depender de casar texto livre.

**Uma terceira, que é derivação e não coleta:** quando o participante é o próprio comprador — o
caso mais comum —, copiar cidade e UF do endereço do pedido para os campos `cidade` e `uf` do
`[reg]`, que existem no schema e nascem vazios (`dadosPessoais.ts:183-185`). Isso faz a
distribuição geográfica cobrir participantes, e não só compradores, na fatia em que isso é
verdade. **O campo derivado precisa ser marcado como derivado**, e a tela declara a cobertura, do
mesmo jeito que o cohort já declara quantos confirmados estão sem nascimento.

### Degrau 2 · logo depois da compra, com contrapartida imediata

A tela de pós-pagamento e a área do cliente acabaram de nascer. É ali, com o ingresso na mão e a
ansiedade resolvida, que um pedido custa menos. Cabem: tamanho de camiseta quando o kit exige e não
foi escolhido, contato de emergência quando o evento pede, e a confirmação do endereço de entrega.

A contrapartida é imediata e verdadeira: **confirme para o kit chegar certo.** Nenhum desses
campos justifica uma tela própria; eles moram na confirmação que a pessoa já vai abrir.

### Degrau 3 · entre um evento e outro, com o motivo dito em voz alta

Interesses nos pilares, tipos de experiência, mini bio. Isto é a Arena Social, e ninguém preenche
perfil sem motivo — então o motivo tem de estar escrito na tela: **receba primeiro as experiências
que combinam com você.** Depende de ARENA-1, ARENA-2 e ARENA-3, e o que chega ao organizador
depende de como o ARENA-1 for respondido.

### Degrau 4 · depois do evento, uma pergunta só

Satisfação. Uma pergunta, não um formulário — a diferença entre trinta por cento de resposta e
três. Contrapartida: cupom da próxima edição. Depende do canal, travado no Brevo.

### Degrau 5 · o que eu não pediria em momento nenhum

Renda, profissão, estado civil, número de filhos, "como conheceu o evento" em campo aberto. São os
campos que todo formulário de evento pede e que nenhum organizador abre depois. Cada um é dado
pessoal a guardar, justificar e expurgar, e nenhuma decisão melhora por causa deles.

### Um degrau que não é do participante

**O motivo estruturado de cancelamento e estorno**, pedido a quem cancela — que às vezes é o
próprio organizador. Hoje é texto livre de 3 a 500 caracteres. Uma lista curta com "outro,
descreva" ao lado transforma a V8 de impossível em barata, e é a única coleta desta proposta que
não custa nada a quem compra.

### O FormBuilder é a casa natural dos degraus 2 a 4

O FormBuilder está em **Posição 2 da fila de construção** e permite ao organizador montar as
próprias perguntas, com resposta gravada no inscrito e nunca no pedido (RN-185). Isso significa que
os degraus 2 a 4 podem ser servidos sem cravar campo novo no modelo para cada pergunta.

Com uma consequência que precisa estar escrita: **resposta de FormBuilder é por evento, não
cross-evento.** Ela serve a operação daquele evento e não constrói perfil de cliente. A própria
spec do FormBuilder já registrou que o CRM não agregará respostas por default, e esta proposta
concorda — perfil cross-evento é o que a Arena Social existe para ser.

---

## Premissas assumidas, vetáveis

Valem por default e não sobem ao painel. Estão aqui para serem derrubadas de graça enquanto nada
foi construído.

1. **Localização é agregado por evento, no molde de `demografia/current`** — escrita exclusiva de
   Function, Rules negando escrita de cliente, contagens sem identidade. Nenhuma coleção nova de
   desenho próprio.
2. **A régua k=5 vale para geografia**, com "outras" absorvendo o resto, e cruzar geografia com
   demografia não acontece.
3. **O rótulo diz "compradores"** enquanto o endereço vier só do pedido, e passa a "participantes"
   só na fatia coberta pela derivação do degrau 1.
4. **Nenhuma visão nova acrescenta rota nova.** Todas entram como bloco da Visão geral, que já é a
   superfície única de análise (RN-823).
5. **Nada é retroativo.** Campo novo nasce vazio; a tela declara a cobertura em vez de esconder o
   buraco.
6. **Nenhuma visão desta proposta lê `crmClientes`** — a fronteira de PII do
   `FronteiraPII.test.ts` continua valendo por adição, e as visões novas passam a ser cobertas por
   ela.
7. **O nome da V6 não contém a palavra conversão**, pelo motivo escrito em §V6.

## Fronteiras declaradas, não resolvidas

- **O CRM continua sem papel por tenant** (P-IAMENU-1, despriorizado pelo dono em 27/07). Quem vê o
  agregado vê a ficha nominal. Toda visão nova nasce dentro dessa limitação, e nenhuma a piora —
  mas a geografia a torna mais visível, porque cidade e bairro identificam melhor que faixa etária.
- **A conversão por atribuição do E11** (link de clube contra tráfego direto, meta acima de 3x)
  segue prometida e não construída. Ela não é a V6 e não deve herdar o nome dela.
- **O `computadoEm` no futuro do seed de preview** segue como dívida nomeada, e ela agora tem uma
  consequência a mais: qualquer visão nova que dependa de `computadoEm` herdaria o congelamento.
- **O inscrito fantasma** — PIX expirado que nunca decai — contamina qualquer contagem de inscritos
  que não filtre status. As visões propostas contam pagante por construção, seguindo a RN-486.
- **A prova de posse do e-mail** (POSSE-EMAIL-1, respondido em 05/08 e em construção) é
  pré-requisito silencioso do degrau 1: guardar e-mail de participante que não comprou cria um
  endereço no banco que ninguém verificou.

## Vizinhos

`01-pergunta-do-dono.md` tem o verbatim e a leitura das duas metades da pergunta.
`03-fila-proposta.md` tem a fila retida. [[DECISOES-ABERTAS]] tem os quatro vetáveis.
[[LEELA-E19-crm]], [[LEELA-E11-analytics]] e [[LEELA-E12-landing]] recebem as regras se o dono
ratificar.
