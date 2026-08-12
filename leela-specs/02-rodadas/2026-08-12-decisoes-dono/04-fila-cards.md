---
tags: [leela, fila, cards, kanban, rodada, leva8]
trace: leela-redesign-v2-20260810
lane: REGISTRO-LEVA8
data: 2026-08-12
---

# 04-fila-cards · o trabalho que a leva 8 manda para a fila

> **Nenhuma linha de código nesta lane.** O que segue são os cards que entram no
> [[V1-KANBAN]] e no épico correspondente, cada um ancorado em épico, com a decisão que o
> gerou e o que ele espera. O padrão da casa é épico → história → tarefa, e nenhum card nasce
> sem o épico na frente.

## Card 1 · [E12] A conta nasce no fim da compra, e a fronteira é re-provada

**Decisão-fonte:** CKLOGIN-1, 12/08 — *"Ok, promova a sessao ao confirmar o pagamento."*
**Regra:** RN-562 · **História:** S1247 · **Épico:** [[LEELA-E12-landing]]

Quem compra pela primeira vez paga, a tela confirma e a área do cliente pede o login de uma
conta que a pessoa ainda não sabe que tem. A lane que construiu o pós-pagamento deixou um aviso
explicando o caminho do e-mail, e o aviso é o remendo que este card remove.

| Tarefa | O que entrega |
|---|---|
| S1247-T1 | a promoção da sessão anônima a conta logada no instante do pagamento confirmado, uma vez só e nunca em cobrança pendente |
| S1247-T2 | a **re-prova da fronteira de autenticação** das RN-476 a RN-480, com teste que compara o desfecho campo a campo — o custo que a decisão declarou de olhos abertos |
| S1247-T3 | o aviso do caminho do e-mail sai da porta, porque ele existia para explicar o buraco que a T1 fecha |

**Prioridade:** alta. O fluxo pós-pagamento está construído e provado desde 11/08 e chega numa
porta trancada para metade de quem compra.
**Espera:** nada. Decidido e destravado.
**Gate obrigatório:** a T2 não é opcional e não é "teste de regressão". É a condição que a
própria decisão carregou.

## Card 2 · [E16] A fila de cadastros ganha recusa e revogação

**Decisão-fonte:** ADMIN-USUARIOS-2, 12/08 — *"admin usuários - aprovar cadastro, reusar e
revogar devem existir já"*
**Regra:** RN-552, forma final · **Tarefa:** S1616-T5 · **Épico:**
[[LEELA-E16-plataforma-superadmin]]

Hoje a fila só cresce, e a única revogação do sistema é a de convite ainda não usado. Conta
liberada não tem caminho de volta pelo painel: desfazer é operação de engenharia.

| Tarefa | O que entrega |
|---|---|
| S1616-T5 | recusa com estado próprio e **sem** comunicação automática à pessoa, revogação como suspensão do tenant pelo `transitionTenant`, e o rastro da RN-551 nas três operações |

**Prioridade:** alta, porque a tela da fila (S1615) nasce agora e nascer sem o gesto de recusa é
barato hoje e caro quando a fila tiver volume.
**Espera:** nada. A RN-552 saiu da condição.
**O que fica de fora, de propósito:** revogação de organizador com venda viva. A cascata toca
dinheiro de terceiro e volta ao dono quando houver caso real.
**Leitura declarada:** "reusar" foi lido como **recusar**. Se o dono corrigir, este card reabre
barato — nada foi construído em cima.

## Card 3 · [E12] O onboarding e o perfil perguntam a mesma coisa que a Arena

**Decisão-fonte:** ARENA-4, 12/08 — *"é o mesmo que devemos perguntar num onboardins de novos
usuários. e entra como preferencias do perfil também"*
**Regras:** RN-563, RN-564 · **Histórias:** S1248 e S1249 · **Épico:** [[LEELA-E12-landing]]

Escopo **novo**: a spec de 10/08 desenhou uma lista para dois consumidores, e a frase do dono
acrescentou dois. Nascer uma vez, num lugar só, é a razão inteira de a lista ter sido
especificada como derivação.

| História | Tarefa | O que entrega |
|---|---|---|
| S1248 | S1248-T1 | o passo de interesses no onboarding de usuário novo, consumindo a derivação — nunca uma cópia da lista |
| S1249 | S1249-T1 | as preferências do perfil lendo a mesma derivação, com o que a pessoa já escolheu no onboarding |

**Prioridade:** depois da `S1245-T1`, sem exceção. Consumidor que cola a própria cópia da lista
é o defeito que a RN-553 existe para impedir, e ele nasce exatamente aqui se a ordem inverter.
**Espera:** `S1245-T1` (a derivação no core).

## Card 4 · [E12] A lista de modalidades derivada do Strava, para o corte do dono

**Decisão-fonte:** ARENA-4, 12/08 — *"Essa listagem deve ser baseada nas modaliades disponiveis
no strava (para as fisicas)"*
**Regras:** RN-563, RN-557 forma final · **Tarefa:** S1245-T2 · **Épico:**
[[LEELA-E12-landing]]

A tabela derivada está pronta em [[02-tabela-modalidades]]: 50 termos em 3 pilares, com 16
cortes, 2 fusões novas e 3 acréscimos declarados, cada um com a razão escrita para o veto custar
uma frase.

| Tarefa | O que entrega |
|---|---|
| S1245-T1 | a derivação pura no core, agora com a fonte física do Strava, e os rótulos de pilar num lugar só |
| S1245-T2 | a lista exposta com o corte, **destravada** pela RN-557 na forma final |
| S1245-T3 | o órfão declarado, agora com duas classes: termo que saiu da taxonomia interna e termo que nunca veio da fonte externa (beach tennis, triatlo, sono e descanso) |

**Prioridade:** alta. A tela de interesses da S1226 não nasce sem a lista, e três consumidores
esperam por ela agora, não dois.
**Espera:** nada. O corte fino do dono continua barato e não bloqueia a T1.
**Gate recorrente:** o gate de frescor da RN-563 — o Strava acrescenta tipo de esporte com
frequência, e a lista de casa envelhece sozinha se ninguém a reconsultar.

## Card 5 · [E19] O CRM ganha as quatro visões e o e-mail que se jogava fora

**Decisões-fonte:** CRM-1 (*"1-ok"*), CRM-2 (*"2-ok"*) e CRM-3 (*"3-guardar (isso é muito
importante para que o organizador consiga exportar ou enviar notificações depois pelo nosso
sistema)"*), todas de 12/08
**Regras:** RN-565, RN-566 · **Épico:** [[LEELA-E19-crm]]

| Tarefa | O que entrega | Origem |
|---|---|---|
| COL-T1 | o e-mail de cada participante persistido no bloco de dados pessoais, com a minimização de sempre | CRM-3 · RN-565 |
| 2a a 2d | o agregado de cidade e bairro, sem identidade, com a supressão do cohort — e o endereço **fora** da ficha | CRM-2 · RN-566 |
| Frentes 1 e 3 | as quatro visões: origem da venda com comissão por canal, distribuição geográfica, quem pagou e não apareceu, e como o público paga | CRM-1 |

**Prioridade:** a COL-T1 primeiro, e por uma razão de tempo e não de valor: cada compra que
acontece sem o campo é um e-mail que já foi digitado e não foi guardado, e não existe backfill
para dado que ninguém gravou.
**Espera:** nada das três. **CRM-4 continua aberto** e mexe no mesmo território — o que se pede
ao participante **depois** da compra. Este card não o antecipa.
**Destrava junto:** a `S1904-T3` (a tela do club diz quantos da comunidade compraram), que
esperava o CRM-1 para saber o recorte.

## Card 6 · [E12] O retry carimba a vigente, e a divergência fica registrada

**Decisão-fonte:** PB-11, 12/08 — *"3 - em vigor."*
**Regra:** RN-567 · **Épico:** [[LEELA-E12-landing]]

O comportamento já vale; o que este card entrega é a parte que a ratificação acrescentou.

| Tarefa | O que entrega |
|---|---|
| PB11-T1 | a divergência entre a versão exibida e a carimbada passa a ser **registrada** no pedido, em vez de sumir — o que separa "prova errada" de "prova errada e rastreável" |

**Prioridade:** baixa. Nada quebra sem ele, e a decisão jurídica está tomada.
**Espera:** nada. O default do registro é vetável: uma linha do dono derruba.

## O que esta lane deixou explicitamente fora da fila

- **A Arena Social não entra em build.** O ARENA-1 fechou com o dado nascendo guardado e a
  abertura endereçada à versão mobile. O que a decisão obriga desde já é desenho de modelo, no
  [[LEELA-E13-app-atleta]] e na spec da Arena, não uma lane.
- **Nada de CRM-4.** A escada de coleta pós-compra continua sem resposta do dono.
- **Nada do item 12.** O marcador `{DOMINIO_LEELA}` segue onde estava.
