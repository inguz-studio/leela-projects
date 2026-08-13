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

---

# Adendo · o que as levas 9 e 10 acrescentam ao corpus (lane REGISTRO-CRM4-LEVA9)

> Mesmo desenho da seção acima: **delta apenas**. O texto canônico de cada regra mora no épico
> dono. As palavras do dono estão nos adendos de [[01-decisoes-dono]].

## Faixa consumida: RN-569 a RN-571

⚠️ **Esta lane bateu numa colisão de numeração e a desfez antes do fecho.** Ela abriu com a faixa
livre em **568**, que era o que o [[indice-de-regras-de-negocio]] anunciava, e escreveu as três
regras nessa numeração. A conferência refeita **no momento do commit** — e não a do começo da
rodada — achou a **RN-568 já consumida pela lane CONFORMIDADE-CONTROLES**, que aterrissou na main
no intervalo (commit `4f43eb37`). As três foram renumeradas de 568-570 para **569-571** durante a
própria aterrissagem, **sem deixar buraco**. É o terceiro caso da mesma família, depois do 483-485
e do 516, e o segundo com desfecho bom, depois da SPEC-ADMIN-VISAO em 09/08. Duas lanes de
registro no mesmo dia é o normal deste projeto, não a exceção.

A conferência final foi por grep de `RN-569` a `RN-573` sobre o corpus inteiro fora do índice:
**zero definições** fora das desta rodada. **A próxima livre passa a ser a 572.**

E a conta do índice foi refeita duas vezes na mesma aterrissagem: a linha da CONFORMIDADE-CONTROLES
não tinha sido refeita por ela, então esta lane a repara (298 → 299) antes de somar as próprias
três (→ **302**). Mesma disciplina que a SERV1-BUILD aplicou pela ROADMAP-COMPONENTES na véspera.

| RN | Enunciado curto | Épico dono | Item do dono |
|---|---|---|---|
| **RN-569** | **A casa não envia nada.** Kit é retirada no balcão, e nenhuma superfície que a pessoa lê promete, sugere ou pressupõe envio, entrega em domicílio, despacho ou postagem. A regra declara o que **não** proíbe: entregar no balcão (RN-205/RN-222), "enviaremos" sobre e-mail, a logística do próprio organizador e o registro de benchmark. | [[LEELA-E03-operacao-evento]] | CRM-4 |
| **RN-570** | A **primeira entrada** na área do cliente conduz à definição da senha — segundo gatilho, ao lado do link de e-mail da RN-453, que **não é revogada**. Nasce como passo **adiável**, não como parede. | [[LEELA-E12-landing]] | CRM-4 |
| **RN-571** | O banner de conclusão de cadastro na área do cliente **convida e nunca bloqueia**, e **não pede endereço** — a RN-561 já o coletou. Não inventa contrapartida: a razão dita é a que a RN-564 sustenta. | [[LEELA-E12-landing]] | CRM-4 |

## O que estas levas decidem e **não** consomem número

- **O CRM-4 fecha sem consumir número.** Recusar tela pós-compra é veto de escopo de fila, como
  o CRM-1 foi. O que virou regra foi a **premissa** por trás da tela, e ela é a RN-569.
- **A leva 10 inteira não consome número.** O slug editável nas três superfícies é **direção de
  produto**, no mesmo desenho do ARENA-1: o mecanismo não está decidido, e regra escrita antes do
  mecanismo cravaria o que a spec futura precisa responder. Fica registrado aqui porque decisão do
  dono que não aparece nesta seção parece rodada que esqueceu de registrar.

## O que muda de estado sem virar regra

**A premissa da ponte é superada.** Em 11/08 o painel registrou, ao fechar o PONTE-NOME-1, que
*"depois do código não existe renomear"*. Era medição verdadeira e virou premissa de desenho. A
leva 10 a **supersede**: o "depois" passa a existir por ordem do dono. O conserto na origem
continua certo e continua barato — o que muda é que ele deixa de ser o único caminho, e o card
**renomear DEPOIS** (`S1234-T5` no [[V1-KANBAN]]), separado e sem dono desde 11/08, **ganha dono**.
A premissa fica **marcada, não apagada**, no [[LEELA-E16-plataforma-superadmin]].

## O que as regras novas NÃO fazem

- **A RN-569 não renomeia dado nem função.** `registrarEntrega`, `kitEntregueEm` e o id de área de
  permissão `entrega` seguem intocados, exatamente como a RN-399 já tinha decidido: a régua é o que
  a **pessoa lê**. Quem for cumprir a regra mexendo em identificador está consertando a coisa errada.
- **A RN-570 não revoga a RN-453** e não traz a senha para dentro do checkout. A RN-562 fechou isso
  na leva 8, e este gatilho acontece depois do dinheiro.
- **A RN-571 não cria coleta nova nem lista nova.** Ela dá superfície ao que a RN-564 já deriva.
- **Nenhuma das três toca a RN-565, a RN-566 ou a minimização da RN-172.** O que o CRM guarda não
  mudou nesta leva; mudou o que ele pergunta, que passou a ser nada.

## Histórias

| História | O que entrega | Estado |
|---|---|---|
| **S1247-T4** · A senha na primeira entrada | tarefa **nova dentro da história que já existe** (RN-570) — não vira história solta, porque é o desfecho do mesmo fluxo que a T1 abre | acrescentada à S1247 |
| **S1250** · O banner convida a concluir o cadastro | o banner de convite na área do cliente, lendo a derivação da RN-564 e sem pedir endereço (RN-571) | nova, espera a S1245-T1 |
| **SLUG-1** · O slug editável nas três superfícies | card de **backlog**, direcional, ancorado em E03, E05 e E16; **não entra em execução** — as quatro perguntas abertas vêm antes | novo, retido por desenho |

---

# Adendo · a área de kits perde a redundância e ganha nomes de gente (lane REGISTRO-LEVA11-KITS-IA)

> Mesmo desenho das seções acima: **delta apenas**. O texto canônico da regra mora no épico
> dono. A fala do dono está no adendo "Leva 11" de [[01-decisoes-dono]].

## Faixa consumida: RN-572

Das três decisões da leva 11, só uma consome número. A conferência foi refeita imediatamente
antes do commit, por grep de `RN-572` a `RN-576` sobre o corpus inteiro fora do índice: **zero
definições**. **A próxima livre passa a ser a 573.**

| RN | Enunciado curto | Épico dono | Item do dono |
|---|---|---|---|
| **RN-572** | A aba índice de Kits troca o rótulo "Cadastro" por "Gerenciamento" — o conteúdo já é gestão de kits e catálogo (criar, editar, configurar patrocínio), não só cadastro inicial. O `id` interno e a rota não mudam, mesma régua da RN-399. | [[LEELA-E03-operacao-evento]] | item 3 da leva 11 (rótulo da aba Cadastro) |

## O que esta leva decide e **não** consome número

- **A duplicata de credenciamento dentro de Kits sai (item 1).** É remoção de item de navegação
  redundante, não regra de negócio: o vocabulário e a identidade do credenciamento já são
  governados pela RN-399, e o item removido é um `href` idêntico ao da aba do menu secundário,
  sempre inativo — sem conteúdo próprio a preservar.
- **Distribuição e a leitura de retirada de Estoque unificam (item 2).** A decisão de unificar
  está tomada, mas o desenho é vetável (nome da aba, o que cada metade vira, hierarquia interna)
  — mesmo desenho da leva 10 (slug editável): regra escrita antes do desenho responder cravaria o
  que o card de build ainda precisa perguntar. Se o veto fechar como reorganização pura de tela, a
  build não deve precisar de RN nem nessa hora.

## O que a regra nova NÃO faz

- **A RN-572 não muda `kitEntregueEm`, `registrarEntrega` nem o id de área de permissão
  `entrega`.** Nenhum deles é tocado por esta leva — o rótulo trocado é só o de
  `KitsLayout.tsx:26`, e o `id: 'cadastro'` da aba índice de Kits segue intocado, mesma régua que
  a RN-399 já cravou para o credenciamento.
- **A RN-572 não muda o que a aba faz.** Ela só nomeia o que a aba já fazia — criar e editar kits
  e itens do catálogo — com o nome que fecha com o conteúdo.

## Histórias

| História | O que entrega | Estado |
|---|---|---|
| **S1257** · A sub-nav de Kits para de duplicar Credenciamento | remove o 4º item (sempre inativo) da sub-nav interna de Kits | nova, backlog |
| **S1258** · Distribuição e a leitura de retirada de Estoque viram uma aba só | desenho vetável da aba unificada + implementação depois do veto | nova, backlog — T1 é o vetável |
| **S1259** · A aba índice de Kits vira "Gerenciamento" | RN-572: troca de rótulo, sem tocar id nem rota | nova, backlog |
