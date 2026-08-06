---
tags: [leela, spec, rodada, painel-cliente, telas, design-system, simulacao]
aliases: ["Inventário de telas do painel do cliente", "Telas para o Claude Design"]
trace: leela-spec-painel-cliente-20260806
lote: SPEC-PAINEL-CLIENTE
data: 2026-08-06
---

# 04-inventário · As telas do painel do cliente, para simular

> Esta é a peça que o dono leva ao Claude Design junto com o kit do design system. Cada tela
> abaixo tem nome, propósito, o job que ela serve, os estados que precisam existir e os
> componentes do design system que a compõem. Uma tela por bloco, na ordem em que a pessoa as
> encontra.
>
> **Dezoito telas.** Onze já existem no ar, quatro estão especificadas e não construídas, e três
> nascem nesta rodada. A coluna de estado diz qual é qual, porque simular uma tela que já existe
> serve para revisá-la, e simular uma que não existe serve para decidi-la.

## Como usar isto no Claude Design

Cole o kit do design system primeiro. Depois, para cada tela, cole o bloco dela inteiro com
este cabeçalho na frente:

```
Simule a tela "<nome>" do painel do cliente da Leela, tema `leela`, em português do Brasil.
Use exclusivamente os componentes e tokens do design system que enviei — nada de componente
inventado, nada de cor fora dos tokens.
Vocabulário obrigatório: "experiência" (nunca "corrida", nunca "prova" como categoria),
"participante" (nunca "atleta" na copy), "painel profissional" (nunca "painel do organizador").
Sentence case em todo título. Sem emoji.
Desenhe os estados na ordem: feliz, vazio, carregando, erro.
<cole aqui o bloco da tela>
```

Três invariantes que valem para todas as telas e não precisam ser repetidas por bloco:

- **Nenhum dado de pessoa entra na URL.** Nem aba escolhida, nem identificador, nem e-mail.
- **Nenhuma tela diz se um e-mail tem conta.** É a disciplina anti-enumeração da casa.
- **Largura mínima real é 320 pixels.** Linha de ação sem refluxo estoura ali e reabre a barra
  horizontal que o dono já reportou duas vezes.

## Índice

| # | Tela | Bloco | Estado |
|---|---|---|---|
| A1 | Overlay de entrada | entrada | ✅ no ar |
| A2 | Primeiro acesso | entrada | 📋 especificada, não construída |
| A3 | Criar conta | entrada | 📋 especificada, não construída |
| A4 | Definir senha | entrada | ✅ no ar |
| B1 | Casca do painel do cliente | painel | 🆕 nasce nesta rodada |
| B2 | Meus ingressos | painel | ✅ no ar |
| B3 | Ingresso aberto | painel | ✅ no ar (pública, sem login) |
| B4 | Minhas compras | painel | ✅ no ar |
| B5 | Compra aberta | painel | 📋 parcial — a linha existe, o detalhe não |
| B6 | Clubes e convites | painel | ✅ no ar |
| B7 | Meus dados e senha | painel | ✅ no ar |
| C1 | Porta para o painel profissional (quem já é) | ponte | ✅ no ar, copy muda |
| C2 | Porta para o painel profissional (quem ainda não é) | ponte | 🆕 nasce nesta rodada |
| C3 | Travessia entre os painéis | ponte | 🆕 nasce nesta rodada |
| C4 | Painel profissional em vitrine | ponte | ✅ no ar (destino, outro app) |
| C5 | Aviso de boas-vindas com o código Leela | ponte | ✅ no ar (destino, outro app) |
| D1 | Sem sessão, a porta de entrada | sistema | ✅ no ar |
| D2 | Conta sem vínculo de compra | sistema | ✅ no ar |
| D3 | Falha de leitura | sistema | ✅ no ar |

---

## Bloco A · Entrada e credencial

### A1 · Overlay de entrada

**Propósito.** Autenticar sem tirar a pessoa da página em que ela estava.
**JTBD.** *"Quero entrar sem perder o que eu estava vendo."*
**Componentes.** `Input`, `InputSenha`, `Button` (primário), `Button` `variant="ghost"
size="sm"` para as duas portas terciárias, `Field`.
**Estados.**

| Estado | O que a tela mostra |
|---|---|
| feliz | e-mail, senha com olho de revelar, "Entrar", e o rodapé com as portas |
| carregando | botão em estado ocupado, campos travados |
| erro | **uma frase só** para qualquer falha de credencial. A tela nunca distingue senha errada de conta inexistente |
| vazio | não se aplica |

**Cuidado de simulação.** O rodapé tem três elementos concorrendo: "É meu primeiro acesso",
"Criar conta" e "Não sei minha senha". A hierarquia proposta é os dois primeiros lado a lado em
ghost pequeno, e o terceiro como link discreto abaixo. Se ficar pesado na simulação, é sinal a
favor do **CONTA-1**, que pergunta se dá para fundir dois deles.

### A2 · Primeiro acesso

**Propósito.** Dar uma senha a quem já tem conta e nunca teve senha, sem depender de um e-mail
que já falhou uma vez.
**JTBD.** *"Comprei e nunca entrei. Como eu entro?"*
**Componentes.** `Input` (e-mail), `Input` (código de seis dígitos), `InputSenha`, `Button`,
`Field`, `EmptyState` para os becos.
**Estados.**

| Estado | O que a tela mostra |
|---|---|
| pediu o código | "Se este endereço puder receber um código, ele já saiu." O campo de código aparece na mesma tela, com o endereço visível e um caminho para corrigi-lo |
| código errado | "Código incorreto ou vencido", com quantas tentativas restam |
| tentativas esgotadas | "Este código não vale mais. Peça um novo" |
| limitador estourou | "Muitas tentativas. Tente novamente em alguns minutos" |
| envio falhou | "Não conseguimos enviar agora. Tente de novo em instantes" |
| código aceito | o formulário de senha, com o campo de nome quando ele fizer falta |

**Cuidado de simulação.** O campo do código é credencial pelos dez minutos em que vive: nada de
autopreenchimento de senha, e ele nunca aparece na URL.

### A3 · Criar conta

**Propósito.** Criar conta de participante na landing, sem passar pelo painel.
**JTBD.** *"Quero ter conta antes de comprar."*
**Componentes.** os mesmos da A2, mais `Checkbox` para o termo.
**Estados.** iguais aos da A2. O que muda é a moldura, a copy e o campo de nome.
**Cuidado de simulação.** O checkbox do termo **nasce desmarcado**, com a finalidade declarada
ao lado. E a tela nunca diz "e-mail já cadastrado": quem já tem conta simplesmente define a
senha e entra.

### A4 · Definir senha

**Propósito.** Fechar o caminho do link que sai no e-mail da compra.
**JTBD.** *"Recebi um e-mail dizendo para definir minha senha."*
**Componentes.** `InputSenha`, `Button`, `SystemStateScreen` para os becos.
**Estados.** cinco, e cada um com saída própria: link válido · link já usado · link expirado ·
quem **já definiu** a senha (a essa pessoa se oferece entrar, não redefinir) · quem chegou sem
código nenhum e veio pedir um.
**Cuidado de simulação.** O caminho de volta nunca é "peça ajuda". É um botão que reenvia, com
confirmação neutra.

---

## Bloco B · O painel do cliente

### B1 · Casca do painel do cliente 🆕

**Propósito.** Dar à área a forma de painel: quem é a pessoa, onde ela está, para onde ela pode
ir, e como ela sai.
**JTBD.** J1 a J5, todos. É a casca que os serve.
**Componentes.** `AppShell` e `PageHeader` do design system, `Tabs` para as quatro áreas,
`Skeleton` no carregamento, `Button` `variant="ghost"` para sair.
**Estados.**

| Estado | O que a tela mostra |
|---|---|
| feliz | cabeçalho com "Sua conta" e o nome, navegação das quatro áreas com contagem onde ela informa, conteúdo da área ativa |
| carregando | a casca desenhada e o miolo em `Skeleton`. A casca **não** pisca |
| erro | casca intacta, miolo com a falha de leitura e um botão de tentar de novo |
| vazio | não se aplica à casca; cada área tem o vazio dela |

**O que precisa de decisão na simulação.** Navegação em abas horizontais (o que existe hoje) ou
navegação lateral persistente (o que "painel" costuma sugerir). Em 320 pixels as quatro abas
com contagem não cabem lado a lado, então a simulação precisa mostrar a forma estreita também.

**Nota técnica para quem for construir.** `AppShell`, `PageHeader` e `Skeleton` existem no
design system mas **ainda não atravessaram** o boundary de cliente da landing
(`apps/landing/app/_ds/ds.ts`, que hoje exporta vinte e um nomes e não inclui os três). São
três linhas naquele arquivo, não componente novo.

### B2 · Meus ingressos

**Propósito.** Achar o ingresso sem procurar e-mail.
**JTBD.** J1 — *"Comprei. Quero achar meu ingresso."*
**Componentes.** `Card`, `Badge` de status, `DateBadge`, `EmptyState`, `Button` para abrir o
ingresso.
**Estados.**

| Estado | O que a tela mostra |
|---|---|
| feliz | dois grupos com título, "Próximas" e "Passadas", cada item com a experiência, a data, o status e o caminho para o ingresso |
| vazio | um `EmptyState` que não culpa ninguém e aponta para a vitrine de experiências |
| só passadas | o grupo "Próximas" não aparece, e o vazio não sobe — quem já viveu algo não vê tela vazia |
| carregando | `Skeleton` no lugar dos cartões |
| erro | falha de leitura com botão de tentar de novo |

**Cuidado de simulação.** Ingresso de experiência passada continua abrindo. É comprovante, não
credencial de sessão.

### B3 · Ingresso aberto

**Propósito.** Mostrar o ingresso, com o QR, para quem abre pelo link do e-mail **ou** pela área.
**JTBD.** J1, e o caso do presente: quem ganhou a inscrição e nunca terá conta ligada à compra.
**Componentes.** `Card`, `Badge`, `DateBadge`, `Button` para imprimir e para salvar em PDF.
**Estados.** feliz · token inválido · token de inscrição cancelada · carregando · erro.
**Cuidado de simulação.** Esta tela é **pública e sem login**, por regra (RN-452), e não pode
ganhar nada que dependa de sessão. Ela é a porta que garante que ninguém fica sem ingresso.

### B4 · Minhas compras

**Propósito.** Responder quanto foi pago, quando, e por qual compra.
**JTBD.** J3 — *"Quanto paguei, e por qual compra?"*
**Componentes.** `Card`, `Badge` de status do pagamento, `EmptyState`, código curto em fonte
mono.
**Estados.**

| Estado | O que a tela mostra |
|---|---|
| feliz | uma linha por compra, com data, valor, status e o código curto no formato `PED-XXXXX` |
| compra antiga sem código | a linha existe sem o código, sem inventar nada. Dezessete compras estão nesse estado até o retroativo rodar |
| vazio | `EmptyState` |
| carregando | `Skeleton` |
| erro | falha de leitura |

### B5 · Compra aberta

**Propósito.** Abrir uma compra e ver o que ela contém: participantes, kits, o total e sua
composição.
**JTBD.** J3, na profundidade que a lista não alcança. Uma compra pode ter vários inscritos
(ADR-011), e a linha da lista não os mostra.
**Componentes.** `Card`, `Badge`, `Divider`, `Button` para ir a cada ingresso.
**Estados.** feliz · compra pendente de pagamento · compra estornada · carregando · erro.
**Cuidado de simulação.** O total tem composição declarada (o que é inscrição, o que é serviço,
o que é juro), e a linha de juro mostra juro contratado, nunca resíduo de arredondamento.
**Estado real.** A linha da lista existe; a tela aberta não. Ela é candidata desta rodada e
depende do que o dono achar da simulação.

### B6 · Clubes e convites

**Propósito.** Mostrar de quais clubes a pessoa faz parte e o que estão convidando-a a fazer.
**JTBD.** J4.
**Componentes.** `Card`, `Badge` de estado do convite, `Button` para aceitar, `EmptyState`,
`Divider` entre as duas seções.
**Estados.**

| Estado | O que a tela mostra |
|---|---|
| feliz | clubes numa seção, convites em outra, com os pendentes primeiro |
| só clubes | a seção de convites não aparece, e a contagem da aba fica em zero |
| só convites | a seção de clubes some, e o convite pendente carrega o peso da tela |
| vazio nos dois | um `EmptyState` só, que explica o que é um clube |
| carregando · erro | `Skeleton` · falha de leitura |

**Cuidado de simulação.** A contagem da aba conta **só convites pendentes**. Clube não é
pendência, e um número que soma os dois vira aviso permanente para quem só participa.

### B7 · Meus dados e senha

**Propósito.** Corrigir os próprios dados e trocar a senha.
**JTBD.** J5.
**Componentes.** `Input`, `Field`, `InputSenha` (senha atual e senha nova), `Button`, `Divider`
entre os dois blocos.
**Estados.**

| Estado | O que a tela mostra |
|---|---|
| feliz | dados carregados e editáveis, senha em bloco próprio abaixo |
| salvando · salvo | botão ocupado, e a confirmação some sozinha |
| senha recusada | **uma frase só** para senha atual errada e senha nova fraca. Distinguir daria um oráculo a quem tivesse a sessão na mão |
| senha fraca antes de enviar | a exigência da política aparece **antes** do envio, no medidor do campo |
| carregando · erro | `Skeleton` · falha de leitura |

**Cuidado de simulação.** Esta tela escreve em `atletas/{uid}` e **não** toca o perfil
profissional. Quem tem os dois papéis edita cada um na sua casa.

---

## Bloco C · A ponte para o painel profissional

### C1 · Porta para o painel profissional, para quem já é

**Propósito.** Dar saída visível a quem tem os dois lados na mesma conta.
**JTBD.** J6, primeira metade — *"Eu também organizo. Como entro do outro lado?"*
**Componentes.** `Card` com título, apoio e `Button`.
**Estados.** presente (a conta tem tenant ou papel de organizador) · ausente (não tem) ·
ausente por ser conta de administração da plataforma.
**Copy proposta.**

> **Você também organiza**
> Suas experiências, inscrições e repasses ficam no painel profissional. Ele vai pedir sua senha
> de novo — é a mesma conta e o mesmo e-mail.
> `[ Ir para o painel profissional ]`

**O que muda em relação ao que está no ar.** O rótulo troca "organizador" por "profissional"
(RN-468), e a linha do segundo login passa a existir.

### C2 · Porta para o painel profissional, para quem ainda não é 🆕

**Propósito.** Convidar a conhecer o outro lado sem pedir um segundo cadastro e sem levantar
parede.
**JTBD.** J6, segunda metade — *"Comprei, gostei. O que é o outro lado?"*
**Componentes.** `Card`, `Checkbox` do termo do profissional, `Button`, `Toast` na confirmação.
**Estados.**

| Estado | O que a tela mostra |
|---|---|
| convite | título, apoio de duas linhas, checkbox do termo desmarcado, botão |
| termo não aceito | botão desabilitado com a razão explícita ao lado, nunca em silêncio |
| promovendo | botão ocupado |
| pronta | confirmação curta e a travessia (C3) |
| já promovida antes | mesma tela, mesmo desfecho, sem segundo aceite e sem mensagem de erro |
| recusada | frase própria, nomeando o motivo quando ele é do produto e não da segurança |

**Copy proposta.**

> **Quer organizar uma experiência?**
> O painel profissional é onde você publica experiências, vende inscrições e acompanha
> repasses. Você pode entrar e conhecer agora, com esta mesma conta. Para começar a vender, o
> time Leela libera seu código.
> ☐ Li e aceito o termo do profissional
> `[ Conhecer o painel profissional ]`

**Cuidado de simulação.** A copy não pode prometer que ela vira profissional no clique, e não
pode soar como parede. O que ela ganha é entrada em vitrine; o que ela ainda não tem é o código.

### C3 · Travessia entre os painéis 🆕

**Propósito.** Dizer o que vai acontecer antes de acontecer: ela vai para outro endereço e vai
digitar a senha de novo.
**JTBD.** J6, na parte que hoje surpreende.
**Componentes.** `Card` ou confirmação inline, `Button` primário e `Button` `variant="ghost"`
para ficar.
**Estados.** aviso antes do clique · em travessia · de volta (quem cancelou continua onde
estava, na mesma aba).
**Cuidado de simulação.** Isto **não** é um modal de erro. É uma frase de expectativa. Se na
simulação virar um obstáculo, a forma está errada: o certo é a linha de apoio no próprio cartão,
e a tela cheia é o plano B.

### C4 · Painel profissional em vitrine

**Propósito.** Deixar a pessoa circular pelo painel profissional e entender o que cada área faz,
sem consultar nada.
**JTBD.** J6 — o "conhecer" que a promoção comprou.
**Componentes.** o shell do painel profissional, com `EmptyState` por área.
**Estados.** cada área com o texto do que ela faz · nunca com número, nunca com exemplo.
**Cuidado de simulação.** Vitrine com dado inventado ensina a pessoa a desconfiar do painel de
verdade no dia seguinte. Nada de gráfico de mentira, nada de "R$ 0,00" que parece saldo.
**Território.** Esta tela é do painel profissional e já está no ar. Entra no inventário porque é
o destino da ponte, e o dono precisa vê-la na sequência.

### C5 · Aviso de boas-vindas com o código Leela

**Propósito.** Acolher, explicar que a plataforma de organização é por convite, e manter o campo
de resgate à mão para quem já tem o código.
**JTBD.** J6, o fecho.
**Componentes.** overlay do painel, `Input` do código, `Button`, `Button` `variant="ghost"` para
continuar olhando.
**Estados.** aviso · código válido (entra como profissional) · código inválido (frase única) ·
fechado por `Esc` ou pelo botão, e **rearmando** na interação seguinte.
**Cuidado de simulação.** Uma linha só diz a quem só participa de experiências que a área dela é
a da landing. O aviso não pode virar labirinto.

---

## Bloco D · Estados de sistema da área

### D1 · Sem sessão, a porta de entrada

**Propósito.** Quem chega em `/minha-conta` sem sessão precisa de porta, não de erro.
**Componentes.** `SystemStateScreen` ou `EmptyState`, `Button` que abre o overlay de entrada.
**Cuidado de simulação.** A tela não diz se aquele endereço tem conta. Ela oferece entrar.

### D2 · Conta sem vínculo de compra

**Propósito.** Quem entrou mas ainda não tem compra ligada à conta precisa entender o que fazer.
**Componentes.** `EmptyState` com caminho de reenvio, `Button`.
**Cuidado de simulação.** Duas causas diferentes caem aqui — quem comprou com outro e-mail e
quem ainda não verificou o endereço —, e a copy tem de servir as duas sem acusar nenhuma.

### D3 · Falha de leitura

**Propósito.** O servidor não respondeu, e a tela diz isso em vez de mostrar uma lista vazia.
**Componentes.** `SystemStateScreen`, `Button` de tentar de novo.
**Cuidado de simulação.** Lista vazia por falha é a mentira mais barata de cometer nesta área.
Vazio e falha são telas diferentes, sempre.

---

## O que **não** simular

Fora de escopo declarado, para o dono não gastar simulação com o que esta onda não vai
construir.

| Tela | Por que fora | Onde está registrado |
|---|---|---|
| Pedir reembolso | mexe em máquina de dinheiro e tem onda própria | PCLIENTE-5 |
| Passar a inscrição para outra pessoa | mesma razão | PCLIENTE-5 |
| Arena Social | amarrada à conversa jurídica do LGPD-1 | PCLIENTE-6 |
| Qualquer tela de `/plataforma` | a área do cliente não é porta para lá, por construção | RN-449 |
| Segundo formulário de cadastro na landing | a ponte serve quem já tem conta | RN-512 |

## Vizinhos

[[01-decisoes-dono]] · [[02-spec-painel-cliente]] · [[03-rns-delta]] · [[05-fila-codigo]]
