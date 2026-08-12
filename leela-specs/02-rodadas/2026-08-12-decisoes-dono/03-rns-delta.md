---
tags: [leela, rn, delta, rodada, leva8, e12, e16, e19]
trace: leela-redesign-v2-20260810
lane: REGISTRO-LEVA8
data: 2026-08-12
---

# 03-rns-delta · o que a leva 8 do dono acrescenta ao corpus

> **Delta apenas.** O texto canônico de cada regra mora no épico dono, e é lá que ele deve ser
> lido e alterado. Repetir o enunciado aqui criaria uma segunda definição, que é o defeito que
> o [[indice-de-regras-de-negocio]] existe para evitar. As palavras do dono estão em
> [[01-decisoes-dono]], item a item.

## Faixa consumida

**RN-562 a RN-567.** O brief avisou que a contagem da noite de 11/08 dizia 562 e que **o índice
é a autoridade**; as duas fontes batem. O índice termina a tabela de faixas em 560-561, e a
conferência foi refeita antes do commit por grep de `RN-562` a `RN-568` sobre o corpus inteiro
fora do índice: **zero definições**. As ocorrências que o grep devolve para 563 e 565 são prosa
de rodadas anteriores descrevendo as próprias varreduras, o molde de sempre. **A próxima livre
passa a ser a 568.**

**Duas regras já numeradas nascem hoje sem consumir número.** A RN-552 e a RN-557 foram
consumidas em 10/08 como **condicionadas**, cada uma com o enunciado preso a um vetável do
dono. Ele respondeu os dois nesta leva, e elas nascem agora na forma da resposta. É exatamente
o desenho que a SPEC-ESTOURO-RESERVA inaugurou com a RN-546: o número é consumido de qualquer
jeito, para não virar buraco.

| RN | Enunciado curto | Épico dono | Item do dono |
|---|---|---|---|
| **RN-562** | A sessão anônima do checkout é promovida a conta logada ao confirmar o pagamento, e a fronteira de autenticação das RN-476 a RN-480 é **re-provada** no mesmo ato, nunca presumida intacta. | [[LEELA-E12-landing]] | CKLOGIN-1 |
| **RN-563** | A parte física da lista de interesses deriva do catálogo de tipos de esporte do **Strava**, com gate de frescor recorrente (URL e data registradas a cada consulta) e termo órfão da fonte externa **declarado**. Amenda a fonte da RN-553. | [[LEELA-E12-landing]] | ARENA-4 |
| **RN-564** | Uma lista, **três** consumidores: interesses da Arena, onboarding de usuário novo e preferências do perfil. Amplia a RN-556, que fica citada e não revogada. | [[LEELA-E12-landing]] | ARENA-4 |
| **RN-565** | O e-mail de cada participante é persistido no bloco de dados pessoais, com a mesma minimização e a mesma leitura restrita do resto do bloco. | [[LEELA-E19-crm]] | CRM-3 |
| **RN-566** | A localização entra como **agregado sem identidade**, com a supressão de privacidade do cohort; o endereço **não** entra na ficha individual do cliente, e a P-CKMOD-1 continua valendo para a ficha. | [[LEELA-E19-crm]] | CRM-2 |
| **RN-567** | No replay de uma cobrança, a prova de aceite carimba a política **vigente no momento do carimbo**, e a divergência com a versão exibida não recusa a compra — ela é registrada. | [[LEELA-E12-landing]] | PB-11 |
| **RN-552** (forma final) | Recusar e revogar **existem**, ao lado de aprovar. Recusa com estado próprio e sem comunicação automática; revogação = suspender o tenant pelo lifecycle, nunca apagar dado. Rastro da RN-551 nas três. | [[LEELA-E16-plataforma-superadmin]] | ADMIN-USUARIOS-2 |
| **RN-557** (forma final) | O vocabulário exposto é a tabela de **50 termos em 3 pilares** de [[02-tabela-modalidades]], com 16 cortes, 2 fusões novas e 3 acréscimos declarados — tudo vetável barato enquanto a tela não nascer. | [[LEELA-E12-landing]] | ARENA-4 |

## O que muda de estado sem virar regra

**A premissa P-CKMOD-1 sai da espera.** Ela dizia, desde 19/07, que endereço nunca entra no doc
do cliente e que incluí-lo *"exige decisão explícita do Vitor registrada aqui"*. A decisão
chegou, vinte e quatro dias depois, e ela **confirma a premissa para a ficha** e **autoriza a
metade que a premissa não tratava**, o agregado sem identidade. A premissa continua vigente; o
que muda é que ela deixa de ser uma pergunta aberta pendurada num épico.

## O que esta leva decide e **não** consome número

- **CRM-1** escolhe quatro visões entre dez. É veto de escopo de fila, não regra de negócio:
  cada visão recusada continua escrita e volta quando ele quiser. Registrado no
  [[LEELA-E19-crm]] como o escopo ratificado da primeira leva, e a `S1904-T3` destrava.
- **ARENA-1** ratifica o default que a RN-471 já governa e mantém a RN-472 intocada. O que
  nasce dele é **direção de produto** no [[LEELA-E13-app-atleta]], não regra: a abertura para
  conexão entre participantes vem com a versão mobile, e nada se constrói agora.
- **Item 12** e **CRM-4** não foram decididos, e por isso não produzem nada aqui.

## O que as regras novas NÃO fazem

- **A RN-562 não muda a RN-451.** A área do cliente continua inalcançável por sessão anônima. O
  que muda é que a sessão deixa de ser anônima no fim de uma compra paga. A regra também não
  escolhe o mecanismo da promoção: isso é decisão de engenharia, e sai decidida com registro
  dentro da lane de build.
- **A RN-563 não revoga a RN-553.** A derivação por função pura sobre constantes do core
  continua sendo o desenho, com as mesmas três proibições (nenhuma cópia literal em consumidor,
  nenhuma leitura de Firestore para obter a lista, nenhuma edição por organizador ou
  participante). O que muda é **de onde vem a parte física** dessas constantes.
- **A RN-564 não revoga a RN-556.** As quatro fronteiras que a RN-556 mediu continuam de pé:
  nada de social, radar intocado, agregados de desafio intocados, vitrine e evento intocados. A
  RN-564 acrescenta consumidores; ela não abre fronteira nenhuma.
- **A RN-565 não cria comunicação.** Guardar o e-mail e usar o e-mail são dois atos. A
  exportação de lista e o envio de notificação, que são a razão que o dono deu, ficam
  registradas como **direção** no E19 e continuam sendo trabalho com escopo e base legal
  próprios.
- **A RN-566 não move a RN-172.** A minimização segue intacta e o CRM continua lendo inscritos,
  nunca o pedido. O agregado é outra categoria de dado, não uma exceção na allowlist.
- **A RN-567 não afrouxa a conferência na criação.** O pedido que nasce com versão divergente
  continua sendo recusado. A regra vale só no replay de uma cobrança de pedido que já existe.
- **A RN-552 não abre revogação de organizador com venda viva.** Essa sub-decisão ficou fora de
  propósito: a cascata dela toca dinheiro de terceiro, e isso não sai por default de esteira.
- **A RN-557 não crava vocabulário para sempre.** Ela crava o vocabulário **de partida**, e o
  corte fino continua barato enquanto a tela de interesses não nascer.

## Histórias

| História | O que entrega | Estado |
|---|---|---|
| **S1247** · A sessão do checkout vira conta ao pagar | promoção da sessão anônima no pagamento confirmado + re-prova da fronteira de autenticação | nova, ainda não construída |
| **S1248** · O onboarding pergunta os interesses | a mesma lista derivada, no onboarding de usuário novo (RN-564) | nova, espera a S1245-T1 |
| **S1249** · As preferências do perfil leem a mesma lista | a mesma lista derivada, nas preferências do perfil (RN-564) | nova, espera a S1245-T1 |
| **S1245-T2** · A lista exposta com o corte | **destrava** com a RN-557 na forma final | já existia, estava esperando |
| **S1616-T5** · Recusa e revogação | **destrava** com a RN-552 na forma final | já existia, estava esperando |

As três histórias novas nascem no [[LEELA-E12-landing]], e as duas de interesse (S1248 e S1249)
consomem o **contrato** da `S1245-T1`, que é a derivação no core. Nenhuma delas nasce antes
dela, pela mesma razão que a S1226 não nascia antes da S1245: consumidor que cola a própria
cópia da lista é o defeito que a RN-553 existe para impedir.
