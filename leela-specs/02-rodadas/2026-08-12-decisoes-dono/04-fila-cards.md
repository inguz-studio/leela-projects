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

---

# Adendo · os cards das levas 9 e 10 (lane REGISTRO-CRM4-LEVA9)

> Mesma régua da seção acima: **nenhuma linha de código nesta lane**, épico → história → tarefa, e
> nenhum card nasce sem o épico na frente. As falas do dono estão nos adendos de
> [[01-decisoes-dono]].

## Card 7 · [E12] A senha se define na primeira entrada, e não só pelo e-mail

**Decisão-fonte:** CRM-4, 12/08 tarde — *"quando a pessoa entra na área do cliente pela primeira
vez, podemos enviar para ela definir a senha deça."*
**Regra:** RN-570 · **História:** S1247 (tarefa nova) · **Épico:** [[LEELA-E12-landing]]

A RN-562 faz a conta nascer no fim da compra. A conta nasce **sem senha**, e até aqui o único
caminho da senha era o link de e-mail da RN-453 — que exige que a pessoa saia do produto, abra a
caixa e volte. Este card fecha a lacuna do lado de dentro.

| Tarefa | O que entrega |
|---|---|
| S1247-T4 | a condução à definição de senha na **primeira** entrada na área do cliente, adiável e não bloqueante, sumindo no instante em que a senha existe e nunca oferecida a quem entrou por senha |

**Por que é tarefa da S1247 e não história própria:** é o desfecho do mesmo fluxo que a T1 abre.
Separar em história daria a duas lanes a chance de construir metade cada uma, e a metade sem a
outra é uma conta logada que não sabe entrar de novo.
**Prioridade:** alta, e amarrada à T1 — a T1 sem esta tarefa entrega uma conta que a pessoa não
consegue reabrir sozinha.
**Espera:** a `S1247-T1`. Não faz sentido antes da promoção da sessão.
**Vetável do dono:** a condução nasce **adiável**. Uma linha dele a torna obrigatória, e o custo do
veto está escrito: a RN-416 já custou duas contas reais paradas numa parede em 06/08.

## Card 8 · [E12] O banner convida a concluir o cadastro

**Decisão-fonte:** CRM-4, 12/08 tarde — *"na area do cliente podemos colocar um banner/alerta
convidando o usuário para concluir o cadastro."*
**Regra:** RN-571 · **História:** S1250 · **Épico:** [[LEELA-E12-landing]]

É a casa nova do que a escada do CRM chamava de degrau 3. Sai da tela pós-compra, que morreu, e
vira convite numa superfície que a pessoa já visita por vontade própria.

| Tarefa | O que entrega |
|---|---|
| S1250-T1 | o banner de convite na área do cliente: convida, não bloqueia, fechar não tranca nada e nenhuma tela fica atrás dele |
| S1250-T2 | a coleta de interesses lendo a **derivação** da RN-564, nunca uma cópia da lista |

**Prioridade:** média. Não bloqueia venda nem acesso, e o valor dele depende de haver gente
entrando na área do cliente — o que a RN-562 acabou de destravar.
**Espera:** a `S1245-T1`, que é a derivação no core. Consumidor que cola a própria cópia da lista é
o defeito que a RN-553 existe para impedir.
**O que fica de fora, de propósito:** **endereço**. A RN-561 já o coletou no checkout, e repetir o
pedido é exatamente a pergunta que o CRM-4 matou.
**⛔ Restrição de copy, não sugestão:** o banner **não promete envio** (RN-569) e **não inventa
contrapartida** — a razão dita na tela é a que a RN-564 já sustenta.

## Card 9 · [E03 · E05 · E16] O slug da própria página passa a ser editável

**Decisão-fonte:** leva 10, 12/08 tarde — *"deixarmos o usuários editarem a página deles, quanto ao
nome de slug, caso o slug esteja disponivel … Registre essa decisão para seguirmos depois."*
**Regra:** nenhuma, por desenho · **Card:** SLUG-1 · **Épicos:** [[LEELA-E03-operacao-evento]]
(evento), [[LEELA-E05-clubs]] (club), [[LEELA-E16-plataforma-superadmin]] (produtor)

⚠️ **Card de BACKLOG, retido de propósito.** As palavras dele são *"para seguirmos depois"*, e há
quatro perguntas abertas que vêm antes de qualquer linha de código. Quem puxar este card sem
respondê-las vai desenhar um input editável para uma operação que é migração.

**O fato que dimensiona o card:** nas três superfícies o slug é o **`docId`** —
`eventos/{eventoId}`, `clubes/{clubId}` e `tenantId == slug == docId`. Trocar o slug move o
documento e a subárvore inteira. É migração, não edição de campo.

| Antes de virar história, a spec precisa responder |
|---|
| **1 · destino dos links antigos** — redireciona ou morre? A RN-201 gera URL **e QR** na publicação, e QR impresso e PDF de ingresso baixado **não se reimprimem**. A RN-234 já é a máquina de redirecionamento da casa |
| **2 · colisão e reserva** — o slug liberado volta ao pool na hora? Se sim, um terceiro captura o endereço de um evento com QR na rua |
| **3 · limite ou janela de renomes** — sempre, ou só antes da primeira venda, como a edição de modalidades da RN-500? |
| **4 · o que é "a propria página"** — o slug do tenant, o `/@handle` de `perfis/{handle}`, ou os dois? |

**Prioridade:** nenhuma até as quatro respostas. Não é fila de execução.
**O que este card já resolve, sem construir nada:** o card **renomear DEPOIS** da ponte
(`S1234-T5`), separado e sem dono desde 11/08, **ganha dono** — é esta decisão, e ela supersede a
premissa *"depois do código não existe renomear"*.
**Não entra no painel:** decisão tomada não é pendência.

## Card 10 · [E03] O gate que impede a terceira reintrodução da premissa de envio

**Decisão-fonte:** não é decisão do dono — é **default vetável da esteira**, nascido da varredura
da leva 9.
**Regra:** RN-569 (a prova dela) · **Épico:** [[LEELA-E03-operacao-evento]]

⚠️ **Este card é proposta, não ordem.** Ele está aqui porque a premissa foi corrigida **duas
vezes** — 05/08 e 12/08 — e porque a segunda reintrodução aconteceu numa spec escrita no **mesmo
dia** da primeira correção. Correção por edit não impede a terceira vez.

| Tarefa | O que entrega |
|---|---|
| SEMENVIO-T1 | gate de vocabulário sobre copy renderizada, começando em **aviso**: promessa de envio físico ao comprador vira flag com o arquivo e a linha, no molde do `leela-canon` da RN-558 |

**Prioridade:** baixa em urgência, alta em durabilidade. Nada está quebrado hoje — a varredura
achou **zero** promessas na copy dos apps.
**O custo do veto, escrito:** sem gate, a quarta ocorrência será encontrada por um comprador, e não
por nós.
**O que o gate NÃO pode fazer:** acusar "entrega" no balcão, "enviaremos" de e-mail e as citações
de benchmark. A RN-569 lista as quatro famílias legítimas, e um gate que não as conhece vira ruído
que alguém desliga na primeira semana.

## O que estas levas deixaram explicitamente fora da fila

- **Nenhum card de copy em código.** A varredura da leva 9 procurou promessa de envio na copy
  renderizada dos apps e achou **zero**. O desenho previa card nomeado para cada achado; não houve
  achado.
- **O degrau 4 da escada** — a pergunta de satisfação depois do evento — **não foi decidido** pela
  fala. Ele não virou tela, não virou card e não foi recusado. Fica como estava.
- **A Arena Social continua fora de build**, pela mesma razão da leva 8.
- **O item 12** segue onde estava.
