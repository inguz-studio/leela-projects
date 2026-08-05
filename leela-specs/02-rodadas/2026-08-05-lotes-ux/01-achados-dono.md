---
tags: [leela, achados, rodada, lotes, capacidade, desativar, subnav, review-antagonista]
trace: leela-pixreal-diag-20260804
lote: SEAL-LOTES
data: 2026-08-05
---

# 01-achados · os seis achados do dono na tela de lotes

> O dono abriu `/eventos/{slug}/lotes` para editar um lote que já vendia e saiu de lá com seis
> queixas de naturezas diferentes: duas de mensagem errada, duas de número escondido, uma de ação
> que não existia e uma barra de rolagem que já tinha sido consertada uma vez.
>
> Duas lanes atenderam. A **BUILD-LOTES-UX** entregou seis frentes em quatro commits; a
> **REV-LOTES**, em contexto fresco, atacou as seis, achou três defeitos, corrigiu os três e
> registrou um quarto que estava fora do território dela. Esta rodada sela o que ficou de pé, o
> que ficou de fora e o que o ataque descobriu.
>
> **Nada está no ar.** Os oito commits vivem no repositório e nenhum deploy aconteceu. O
> território desta lane de selo foi `leela-specs/`, e zero linha de código foi tocada aqui.

## O que o dono pediu

Uma ressalva de honestidade antes das falas. **Só um dos seis achados sobreviveu verbatim** no
que ficou escrito: o brief da BUILD-LOTES-UX não foi persistido em `.nirvana/briefs/`, e por isso
cinco das seis queixas chegam a este arquivo pela descrição que a lane de build fez delas, não
pela letra do dono. Está registrado como falha de processo em §"O que esta rodada aprendeu de
método", porque perder a letra do dono é perder o critério de aceite.

**Verbatim, sobre o lote em vigência:**

> "Fui editar o lote em vigencia, porém nao consegui ajustar quantidades disponiveis, e datas de
> inicio e fim, isso eu posso editar, só nao posso editar os valores."

**Os seis achados, na ordem em que as frentes os atenderam:**

| Frente | O que ele viu |
|---|---|
| **A** | O aviso de erro acendia no campo de **preço** quando o que faltava era a vaga. O preço estava preenchido e válido. |
| **B** | A recusa por janela sobreposta dizia que os lotes se sobrepõem e não dizia **qual** lote nem **quando** ele vende. |
| **C** | Não conseguiu ajustar quantidade nem datas do lote em vigência (o verbatim acima). |
| **D** | Os números da capacidade não fechavam na tela: 50 configurados, 19 vendidos, digitou 20 e continuou lendo **31 disponíveis**. |
| **E** | Faltava **desativar** um lote. Encerrar a venda de um lote vigente não tinha porta. |
| **F** | Barra de rolagem no menu secundário do evento, de novo. Vertical e horizontal, em tela estreita. |

## O que cada frente entregou

| Frente | Commit | O que entrou | Estado |
|---|---|---|---|
| **F** (design system) | `fd6e5e69` | `SubNav`: some o cromo da barra, `overflow-y: hidden` e quatro asserções de contrato de estilo | ✅ entregue |
| **A · B** | `41ac6bbb` | `loteForm.ts`: erro por campo na ordem visual, endereço do conflito de janela, capacidade prevista, vias de desativação (+22 casos) | ✅ entregue |
| **C · D · E** | `d4ce8d12` | `LoteModal` / `LotesView` / `LotesPage`: painel dos lotes da modalidade, três números, atalho de capacidade, ação Desativar (+16 casos) | ✅ C em parte |
| **F** (painel) | `1357163a` | Guard do menu secundário do evento no `EventoShell` | ✅ entregue |
| **A** (review) | `2a97a592` | A recusa do **servidor** passou a ganhar endereço: o `catch` cego descartava a causa e mostrava "Falha ao salvar o lote" | ✅ defeito corrigido |
| **D** (review) | `08a09465` | O painel do `CapacidadeModal` passou a acompanhar o total **digitado** | ✅ defeito corrigido |
| **F** (review) | `c2b19244` | A trava de estilo passou para depois do `className`, e deixou de ser apagável por um consumidor | ✅ defeito corrigido |
| — | `35c051ef` | O handoff da review | — |

Quatro das seis frentes passaram o ataque sem defeito: B, C, E e o conserto de F. A frente A
tinha um segundo caminho de erro sem endereço. A frente D não entregava o pedido do dono.

## O achado da review, e por que ele é lição de método

A frente D foi construída, testada, aprovada pela própria lane e **não resolvia o caso do dono**.
Vale desmontar o mecanismo, porque ele não é sobre lotes.

**A prévia viva foi ligada na porta errada.** O número que muda enquanto se digita entrou no
`LoteModal`, o editor do lote. Só que o campo de vaga do `LoteModal` fica `disabled` exatamente
quando `vendidos > 0`, que é a única situação em que a queixa existe: o dono estava editando um
lote **com venda**. A prévia funcionava num campo que ele não conseguia tocar.

**A porta real é outra e ela ficou intacta.** Capacidade de lote vendido se ajusta pelo
`CapacidadeModal`, que chama a Function auditada da RN-304. Esse painel lia o valor **gravado** e
seguia mostrando **31 disponíveis** enquanto o dono digitava 20. O número da reclamação continuava
na tela, no mesmo lugar, depois de uma frente inteira construída para tirá-lo de lá.

**O teste que dava a frente por verde montava um estado impossível.** Ele instanciava o
`LoteModal` com `vendidos = 19` e mexia num campo de vaga habilitado. O produto nunca produz essa
combinação: com venda, o campo nasce desabilitado. O caso passava porque o teste construiu por
dentro um mundo que a tela não alcança.

Três coisas ficam escritas como regra de trabalho, e nenhuma delas é sobre este código.

1. **O caso do dono tem endereço.** "50 → 20 com 19 vendidos" não é um número solto: é um número
   numa tela específica, atrás de um gesto específico. Provar a aritmética onde ela é fácil de
   provar, e não onde ela acontece, é a forma mais barata de entregar verde sem entregar nada.
2. **Teste que monta o estado por dentro não prova a porta.** O estado tem de nascer do caminho
   que a pessoa percorre. Se o caminho não alcança o estado, o caso não é prova, é encenação — e
   ele fica verde para sempre, inclusive depois de a tela quebrar.
3. **A review em contexto fresco é o que pega isso.** A lane de build escreveu o código e o teste
   com a mesma premissa errada, e nenhuma quantidade de rigor interno derruba uma premissa que os
   dois lados compartilham. Foi a leitura de fora, perguntando "onde o dono estava quando viu o
   31?", que achou a porta certa.

Vale registrar uma quarta, de processo: **o brief da lane não foi persistido**, e com ele se
perderam cinco dos seis verbatins. O critério de aceite de um achado é a frase de quem o
reportou. Sem ela, a lane seguinte confere contra a descrição de quem construiu, que é
exatamente a parte interessada.

## O que o dono ainda não recebeu

**A janela do lote vendido continua travada.** O campo de datas segue cinza, e a tela diz isso ao
organizador com todas as letras. Não é esquecimento nem teimosia de interface: a trava vive na
Rule, em `firestore.rules`, e habilitar o campo sem mexer nela produziria `permission-denied` no
salvar, que é pior que a trava honesta.

O delta é o assunto de `02-rns-delta.md`, e ele tem uma inversão que vale adiantar: **o código é
que divergiu da regra escrita, não o pedido do dono.** A RN-200 sempre travou só o preço. Foi a
Rule que estendeu o congelamento à janela, à quantidade, à ordem e à modalidade, e essa extensão
nunca teve enunciado — existia só em comentário de código. O dono pediu a RN-200 como ela está
escrita.

A quantidade já voltou, pela porta autorizada da RN-304. A janela virou tarefa com marca de
dinheiro, na fila de `03-fila-codigo.md`.

## O que a review achou por conta, e vale mais que a lane

Atacando a ação de desativar, a review foi olhar o que acontece com um PIX que já está em voo
quando o organizador fecha o lote. Achou uma coisa que **não depende da desativação**: duas
pessoas com PIX pendente para a última vaga pagam as duas, confirmam as duas, e o `vendidos`
passa do `quantidadeLimite` sem que nada avise. A tela mostra "20 vendidos · 0 disponíveis · 19 no
total" e segue em frente.

Virou o item **ESTOURO-1** do painel do dono, com a correção técnica mínima entrando de qualquer
forma. O registro completo está em [[DECISOES-ABERTAS]] e a regra em `02-rns-delta.md`.

## Vizinhos

`02-rns-delta.md` tem o delta da RN-200 e as duas regras novas. `03-fila-codigo.md` tem a fila,
com a tarefa da janela, a correção mínima do estouro e os cinco achados de baixa severidade da
review, incluindo o de dinheiro. [[DECISOES-ABERTAS]] tem o **ESTOURO-1**. Os dois handoffs das
lanes que produziram tudo isto estão em `.nirvana/handoffs/leela-lotes-ux-BUILD.md` e
`.nirvana/handoffs/leela-lotes-REV.md`.
