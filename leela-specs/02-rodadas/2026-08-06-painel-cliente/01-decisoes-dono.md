---
tags: [leela, decisoes, rodada, painel-cliente, participante, ponte-profissional]
aliases: ["Painel do cliente 2026-08-06", "SPEC-PAINEL-CLIENTE"]
trace: leela-spec-painel-cliente-20260806
lote: SPEC-PAINEL-CLIENTE
data: 2026-08-06
fonte: pedido do dono em 2026-08-06, antes de qualquer código do painel do cliente
---

# 01-decisoes · O painel do cliente e a porta para o profissional

## Verbatim do dono (2026-08-06)

> *"antes de codar o painel do cliente, quero que faça o seguinte, gere uma spec para mim do
> painel do cliente, com a opção dele entrar e se cadastrar no painel profissional. e me
> entregue o design system também, para que eu envie para o claude design e faça as simulações
> por lá."*

Três pedidos numa frase: a spec antes do código, a ponte para o painel profissional dentro
dela, e o material para simular as telas fora daqui. O terceiro é de outra lane
(`DS-CLAUDE-DESIGN`, o kit do design system). Esta rodada entrega os dois primeiros, e o
[[04-inventario-de-telas]] é a peça feita para o dono levar ao Claude Design.

## O que a varredura achou antes de qualquer decisão

Três fatos mudaram o que esta spec ia escrever.

**A área do cliente já existe e está no ar.** `/minha-conta` na landing, com quatro abas
(Meus ingressos, Minhas compras, Clubes e convites, Meus dados) e as duas portas no fim da
página. Subiu no deploy de 05/08. O pedido do dono, portanto, não é uma superfície nova: é o
amadurecimento desta.

**A porta para o profissional está quebrada exatamente para quem ela existe.** O cartão "Quer
organizar uma experiência?" leva a `/cadastrar` do painel, que chama
`criarContaComEmail` — e quem está lendo aquele cartão está **logada**, com conta e e-mail já
cadastrados. O Firebase devolve `auth/email-already-in-use`, que o `authErrors.ts` mascara na
mensagem única anti-enumeração, por disciplina correta. Resultado: a participante clica em
"criar conta de organizador" e recebe uma negativa genérica, sem caminho. A spec de 04/08 já
descrevia o desenho certo — *"o cliente que clica não vira organizador ali: ele ganha o doc
`profissionais/{uid}` com `statusOnboarding: 'aguardando_convite'`"* — e a construção mandou a
pessoa para o formulário de cadastro. É a distância entre a spec e o que subiu.

**A vitrine de hoje é a outra metade da ponte.** A RN-510 aterrissou nesta mesma data: conta
autenticada sem tenant entra no painel profissional em modo vitrine, e o aviso de boas-vindas
sobe no primeiro gesto com o campo do código Leela. É exatamente o destino que a ponte precisa.
O que falta entre uma coisa e outra é o gesto que dá à conta o doc de profissional, porque sem
ele o `destinoPosLogin` a barra na porta como conta órfã.

## PCLIENTE-1 · o painel do cliente é a área que amadurece, e continua morando na landing

Sobe ao [[DECISOES-ABERTAS]], porque é o que trava a próxima ação do dono: ele vai simular as
telas, e simular a forma errada joga fora a simulação inteira.

- **Default proposto:** o painel do cliente é `/minha-conta` ganhando casca de painel —
  cabeçalho de conta, navegação persistente, estados próprios — na landing, no mesmo endereço.
  Nada muda de casa.
- **Por que este default:** a premissa 7 da SPEC-ADMINSEP já cravou que a área do cliente mora
  na landing, e o painel profissional barra na porta quem não é organizador nem administrador.
  Mudar a casa reabriria a porta que o item 57 fechou. Some a isso que a área está no ar, com
  callables, testes e um deploy atrás dela.
- **A alternativa, escrita para poder ser escolhida:** o painel do cliente vira superfície
  própria dentro do painel profissional, com o alternador servindo os dois lados. Custa
  derrubar a guarda de conta órfã, abrir o painel a todo participante do ecossistema e refazer
  a fronteira que a FRONTEIRA-AUTH acabou de provar fechada. Não é impossível; é caro e reabre
  risco fechado.
- **Onde aterrissa:** RN-511, [[LEELA-E12-landing]].

## PCLIENTE-2 · a ponte é promoção da conta que já existe, nunca um segundo cadastro

Vetável leve. Fica aqui.

- **Default:** da área do cliente, a porta chama uma promoção no servidor — cria
  `profissionais/{uid}` em `aguardando_convite` (RN-411) com o carimbo do termo do profissional
  (RN-466) — e entrega a pessoa no painel profissional, onde ela aterrissa em vitrine (RN-510)
  e encontra o aviso com o campo do código Leela.
- **Por que não há alternativa de verdade:** o caminho atual não funciona, medido acima. E a
  aprovação self-service sem convite revogaria o go-live controlado que o dono decidiu, então
  fica registrada e não adotada.
- **Onde aterrissa:** RN-512, [[LEELA-E12-landing]]; consome RN-510 de
  [[LEELA-E16-plataforma-superadmin]].

## PCLIENTE-3 · a travessia pede a senha de novo, e a tela diz isso antes do clique

Vetável leve. Fica aqui.

A landing e o painel são **sites de Hosting diferentes**, logo origens diferentes, e a sessão
do Firebase Auth é por origem. Quem está logada em `/minha-conta` e atravessa para o painel
chega deslogada. O código de hoje já assume isso: a porta aponta para `painelUrl('/entrar')`, e
não para a home do painel.

- **Default:** aceitar o segundo login e **dizer isso na tela**, antes do clique, em vez de
  deixar a pessoa descobrir. Uma linha de apoio no cartão da ponte.
- **A alternativa recusada, com razão:** handoff por token custom entre as duas origens. Cria
  uma segunda superfície de credencial para a mesma capacidade, que é o que a casa proíbe em
  letra desde a spec do convite, e o ganho é pular uma tela.
- **Onde aterrissa:** RN-513, [[LEELA-E12-landing]].

## PCLIENTE-4 · o rótulo deixa de prometer conta e passa a nomear painel

Vetável leve. Fica aqui.

O cartão de hoje diz *"Crie sua conta de organizador. Ela nasce separada desta"*. A frase
contradiz a RN-450, que é justamente a regra de que organizador e cliente cabem na **mesma**
conta — o que nasce separado é o documento de perfil, não a conta. E "organizador" foi
rebatizado para **profissional** pela RN-468, pela razão da D-0802-1: organizador deixa de fora
o professor de ioga, a assessoria e o clube.

- **Default:** os dois cartões passam a nomear o painel, não a conta. Quem já é profissional lê
  "Ir para o painel profissional"; quem ainda não é lê "Conhecer o painel profissional", com o
  apoio dizendo que é a mesma conta e o mesmo e-mail.
- **Onde aterrissa:** RN-512 e RN-513; sem número próprio, porque é copy sobre regra existente.

## PCLIENTE-5 · reembolso e troca de titularidade não entram nesta onda

Vetável leve. Fica aqui.

A varredura por promessas não cumpridas à participante achou uma real: a máquina de reembolso
(RN-339, RN-341, RN-342) e a troca de titularidade (RN-343, RN-344, RN-345) existem no servidor
e têm superfície do lado do profissional. Do lado de quem comprou, **não existe superfície
nenhuma** — a varredura na landing devolve zero.

- **Default:** ficam **mapeadas e fora desta onda**, com história própria. Mexem em dinheiro e
  em máquina de estados, e entrar de carona numa onda de casca e navegação é o jeito de errar.
- **Onde aterrissa:** entram no inventário de telas como **fora de escopo declarado**, para o
  dono não simular o que não vai existir, e viram card de backlog no [[V1-KANBAN]].

## PCLIENTE-6 · a Arena Social continua fora, e agora por decisão

Vetável leve. Fica aqui.

A S1226 (RN-471, RN-472) estava bloqueada por não existir área do cliente. A área existe, então
o bloqueio caiu e a ausência precisa de razão nova.

- **Default:** continua fora. O campo que pode inferir orientação sexual é dado sensível do
  art. 11 e está amarrado à mesma conversa jurídica do **LGPD-1**, que é do dono e segue aberta.
- **Onde aterrissa:** nota na S1226 do [[LEELA-E12-landing]]; nada muda no enunciado.

## O que já era do dono e esta rodada não reabre

- **ADMINSEP-2** — se o botão da área do cliente leva ao painel do profissional ou ao de
  plataforma. Continua aberto no painel, e esta spec constrói sobre o default de lá (é o do
  profissional). Se ele trocar a leitura, muda em `portaOrganizador.ts` e em nenhum outro lugar.
- **CONTA-1** e **CONTA-2** — o código de seis dígitos e a porta única de criar conta. A ponte
  desta rodada **não** depende de nenhum dos dois: ela serve quem já tem conta e já está logada.
  A relação está escrita na spec, §"O que esta rodada não toca".

## Vizinhos

[[02-spec-painel-cliente]] tem o desenho e as histórias. `03-rns-delta.md` tem as regras novas.
[[04-inventario-de-telas]] é o que vai para o Claude Design. [[05-fila-codigo]] tem a ordem de
execução.
