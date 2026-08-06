---
tags: [leela, decisoes, rodada, produto, onboarding, organizador, convite, vitrine]
aliases: ["Vitrine do organizador 2026-08-06", "D-ONB-6", "ONBOARD-VITRINE"]
trace: leela-onboard-vitrine-20260806
lote: ONBOARD-VITRINE
data: 2026-08-06
fonte: ordem do dono em 2026-08-06, depois de duas contas reais pararem na parede
---

# Delta a parede do convite vira vitrine, e o aviso responde ao gesto

## Verbatim do Vitor (2026-08-06)

> *"uma coisa importante, só deve ter o código de liberação de convite, quem for
> profissional. Acho que o componente deve apenas aparecer como overlay, após a pessoa
> entrar no sistema. Ela entra no sistema e ao tentar clicar em qualquer botão, ou aba de
> menu, sobe o aviso, de boas vindas à leela, e orientando para falar com nosso time, para
> receber o código Leela, para conhecer a plataforma."*

## O que provocou a ordem

Em 06/08 duas contas reais se cadastraram e pararam numa parede. O desenho da **RN-416**
(rodada de 28/07, construído na ONBOARD-BUILD) barrava a conta autenticada sem papel nem
tenant **antes de qualquer coisa**: a rota nem montava, e a pessoa via um campo de código e
nada mais. A tranca fazia sentido técnico — e é justamente essa parte que a ordem do dono
**não** desfez, como se lê abaixo. O que ela desfez foi a experiência: quem chega não
conhece a plataforma antes de ser cobrado por um código.

## D-ONB-6 · A conta sem código ENTRA, e o aviso responde ao gesto ⇒ RN-510

Quatro peças, na ordem em que a pessoa as encontra:

1. **O cadastro continua livre** — sem código no `/cadastrar`. Nada muda aqui (RN-411).
2. **Depois do login ela ENTRA, em modo vitrine.** O shell desenha, o menu navega, e cada
   área diz o que faz. Não é a página real com os dados escondidos: é uma tela outra, sem
   consulta nenhuma.
3. **Na primeira interação sobe o aviso de boas-vindas.** Clique em botão, aba de menu,
   item de navegação — e o equivalente por teclado. O aviso dá as boas-vindas, orienta a
   falar com o time para receber o **código Leela** e mantém o campo de resgate ali mesmo,
   para quem já tem o código. O mecanismo de resgate não muda (RN-414).
4. **O código é de quem vai ser profissional.** A copy não empurra visitante nenhum para o
   campo: acolhe, explica que a plataforma de organização é por convite e aponta o caminho.
   Quem só participa de experiências encontra a área do cliente na landing, e o aviso diz
   isso em **uma linha** — o aviso não vira labirinto.

**O nome é "código Leela"**, que é como o dono o chamou. A rodada de 28/07 dizia "código de
convite"; onde a pessoa lê, passa a ser código Leela.

## A propriedade que NÃO foi negociada

A razão técnica de a rota não montar era exata: uma conta sem claim de tenant que dispara a
query da tela colhe `permission-denied` atrás do véu, paga round-trip e anuncia ao servidor
uma intenção que ela não tem. **Trocar a parede pela vitrine só é honesto se a propriedade
sobreviver à troca** — e sobreviveu, com prova executável em vez de leitura: com a conta em
vitrine, o painel chama do api-client **só** o que está numa lista fechada de quatro portas,
nenhuma delas tenant-scoped. Qualquer leitura nova, em qualquer tela, em qualquer lane
futura, aparece como nome desconhecido e derruba o caso.

A tranca de DADO continua sendo das Rules (RN-400/401). A vitrine é experiência, como o
overlay sempre foi.

## O que a construção achou, e que a ordem do dono não previa

O desenho antigo renderizava as **rotas reais** enquanto o crachá era lido — decisão
documentada na época ("piscar o overlay na cara de quem já tem acesso é pior que meio
segundo de conteúdo"). Nessa janela, `/crm` disparava `getOverview` e `/marcas` disparava
`listarMarcas`: duas consultas de tenant de uma conta que, um tique depois, se revelaria
sem tenant nenhum. O `enabled` das duas telas olha `uid`/`eventoId`, nunca `tenantId`.
Elas voltariam negadas — exatamente o custo que a parede dizia evitar.

A janela fecha com um estado de espera, e ele custa **um tique** a quem tem crachá em
cache, que é todo mundo que trabalha no painel: `getClaims` sem forçar lê o token em
memória e não sai do dispositivo. Está travado por teste.

## Premissas assumidas (o dono deixou o detalhe com a lane)

| # | Premissa | Onde vive |
|---|---|---|
| P11 | Conta como interação **só** o gesto sobre algo acionável (botão, link, item de menu, campo, `[role]` de widget). Clicar em texto ou na moldura não conta | RN-510 |
| P12 | Teclado: `Enter` e `Espaço` sobre alvo acionável valem como clique. Tecla própria de widget (setas em `role="tab"`) não conta | RN-510 |
| P13 | O aviso **fecha** por `Esc` e por botão ("Continuar olhando"), invertendo o não-descartável da RN-416 | RN-510 |
| P14 | Fechado, ele **rearma**: a interação seguinte sobe o aviso de novo. Mostrar uma vez por sessão deixaria a pessoa clicando em botões inertes no silêncio | RN-510 |
| P15 | A vitrine acompanha o endereço (o menu continua navegando), mas **nunca** mostra número ou exemplo. Vitrine com dado inventado ensina a desconfiar do painel de verdade no dia seguinte | RN-510 |
| P16 | `/conta` continua sendo da pessoa: ali a rota real monta e o aviso não sobe (RN-416 preservada nesta parte) | RN-510 |

## Delta de RN

| RN | Situação |
|---|---|
| **RN-510** | **Nova.** Sucede a RN-416. Enunciado no épico dono, [[LEELA-E16-plataforma-superadmin]]. |
| **RN-416** | **Superada em 06/08**, e **marcada** em vez de apagada — o enunciado segue legível no delta de 28/07 e no épico. Sobrevivem dela: `/conta` como rota da pessoa, e "o overlay é experiência, não segurança". Morre o desenho de parede (rota não montada, overlay não-descartável). |
| **RN-411, RN-413, RN-414, RN-415, RN-417** | **Inalteradas.** Cadastro aberto, formato do código, resgate atômico, taxa de tentativas e canal do CTA não são assunto desta ordem. |

## Fora desta rodada

- **Tour guiado / onboarding com passos** na vitrine. O dono pediu que a pessoa possa
  circular, não que seja conduzida.
- **Dado de demonstração** na vitrine (evento fictício, número de exemplo). Fora por P15.
- **Fila de pedidos de acesso** para o dono prospectar quem entrou em vitrine e não
  resgatou código: candidata natural, agora com muito mais gente para prospectar. Continua
  não pedida — card próprio se o dono quiser.
