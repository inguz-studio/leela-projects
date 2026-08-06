---
tags: [leela, spec, rodada, painel-cliente, participante, ponte-profissional, vitrine]
trace: leela-spec-painel-cliente-20260806
lote: SPEC-PAINEL-CLIENTE
data: 2026-08-06
---

# 02-spec · O painel do cliente, e a porta para o painel profissional

> Zero código. Toda afirmação sobre o repositório foi medida e o caminho está citado. Onde não
> deu para medir, está escrito que não deu.
>
> Esta spec **reaproveita**: a área do cliente está no ar desde 05/08, a vitrine aterrissou
> hoje, e o crachá de papel duplo foi provado ontem. O que falta é o pedaço entre elas.

## Parte 1 · O que existe hoje, medido

### A área do cliente está no ar, com sete das oito coisas que o dono pediu

`apps/landing/app/(public)/minha-conta/` — 1.170 linhas em oito arquivos. Uma rota, um
componente por painel, e a decisão de porta isolada em função pura.

| O dono pediu (RN-451) | Estado | Onde |
|---|---|---|
| Meus Ingressos, próximos e passados | ✅ no ar | `PainelIngressos.tsx` |
| Histórico de compras | ✅ no ar | `PainelCompras.tsx` |
| Meus Clubes | ✅ no ar | `PainelClubes.tsx` |
| Convites para promotor ou influenciador | ✅ no ar, na mesma aba dos clubes | `PainelClubes.tsx` |
| Meus dados | ✅ no ar, sobre `atletas/{uid}` | `PainelMeusDados.tsx` |
| Trocar senha | ✅ no ar, com reautenticação embutida | `PainelMeusDados.tsx` |
| Botão para a área de administrador | ✅ no ar, condicionado ao papel | `PortasDaConta.tsx` |
| Criar conta de organizador | ⚠️ **no ar e quebrado** | `PortasDaConta.tsx` → `/cadastrar` do painel |

A aba escolhida vive em estado de React e **não** entra na URL, por invariante do projeto
(nenhum dado de pessoa na URL). A contagem da aba de clubes conta só os convites pendentes,
porque somar clube com convite viraria um aviso permanente para quem só participa.

### O defeito da oitava, e por que ele é o coração desta rodada

`PortasDaConta.tsx:67` aponta para `painelUrl('/cadastrar')`. O `CadastrarPage.tsx:119` chama
`criarContaComEmail`. Quem lê aquele cartão está autenticada na landing — a área inteira exige
sessão nomeada. Logo, o e-mail dela já existe no Auth, e a chamada volta
`auth/email-already-in-use`, que o `authErrors.ts:47-54` converte na mensagem única, de
propósito, para a tela não virar oráculo de quem tem conta.

O desenho correto já estava escrito em 04/08, em
`02-rodadas/2026-08-02-retomada/09-spec-contas-e-area-cliente.md` §"Duas portas para virar
organizador": a pessoa **ganha o doc** `profissionais/{uid}` em `aguardando_convite` e cai no
overlay do convite. A construção pulou o gesto de promoção e mandou a pessoa ao formulário. O
conserto não inventa regra: ele constrói o que a spec já dizia.

A copy também errou o vocabulário. O cartão promete *"Ela nasce separada desta"* falando de
**conta**, e a RN-450 diz o contrário: organizador e cliente cabem na mesma conta, e o que
nasce separado é o documento de perfil. Some a RN-468, que rebatizou o painel para
**profissional**.

### A vitrine é o destino que faltava

A RN-510 aterrissou hoje. Conta autenticada sem tenant **entra** no painel profissional em modo
vitrine: o shell desenha, o menu navega, cada área diz o que faz, e nenhuma consulta
tenant-scoped sai (allowlist fechada de quatro portas, travada por teste). No primeiro gesto
sobre algo acionável sobe o aviso de boas-vindas, com o campo do código Leela dentro.

É exatamente o que o dono pediu com *"se cadastrar no painel profissional"*. A leitura desta
spec: **"se cadastrar" não é criar segunda conta, é começar o caminho de virar profissional** —
e esse caminho, por decisão do dono na RN-510, é conhecer a plataforma em vitrine e receber o
código Leela do time.

### A guarda que fica entre a conta de cliente e a vitrine

`destinoPosLogin.ts:83-93` barra a conta que não tem tenant, não tem capacidade de plataforma e
**não tem `profissionais/{uid}`**. É a guarda de conta órfã, e ela está certa: sem ela, toda
conta do ecossistema que descobrisse a URL do painel entraria nele.

Consequência que decide o desenho da ponte: uma conta **só de cliente** hoje é barrada no
painel, mesmo com a vitrine no ar. A vitrine serve quem já tem o doc de profissional. O gesto de
promoção é, portanto, o que transforma a cliente em alguém que a vitrine acolhe — e é a única
peça de servidor que esta rodada precisa.

### As duas origens, e o segundo login

`apps/landing` e `apps/painel` são **sites de Hosting distintos** do mesmo projeto
(`firebase.prod.json`), com as mesmas credenciais de app web mas origens diferentes. A sessão
do Firebase Auth persiste por origem. Atravessar da área do cliente para o painel significa
autenticar de novo, e o código atual já assume isso ao apontar para `/entrar` em vez da home.

Isso não é defeito, é a topologia. O que é defeito é a tela não avisar.

## Parte 2 · JTBD da participante no painel

Os cinco primeiros já são servidos. O sexto é o pedido do dono. O sétimo está mapeado e fora.

| # | Job | Servido por | Estado |
|---|---|---|---|
| J1 | *"Comprei. Quero achar meu ingresso sem procurar e-mail."* | Meus ingressos, próximos e passados | ✅ |
| J2 | *"O que eu já vivi com a Leela?"* | Ingressos passados + histórico de compras | ✅ |
| J3 | *"Quanto paguei, e por qual compra?"* | Minhas compras, com o código curto da compra | ✅ (código retroativo pendente) |
| J4 | *"De quais clubes eu faço parte, e o que estão me convidando a fazer?"* | Clubes e convites | ✅ |
| J5 | *"Meus dados estão certos, e minha senha é minha."* | Meus dados + trocar senha | ✅ |
| J6 | *"Eu também organizo. Como entro do outro lado?"* | **a ponte desta rodada** | ⚠️ quebrada |
| J7 | *"Não vou mais. Como peço reembolso ou passo para outra pessoa?"* | nada, dos dois lados da landing | 📋 mapeado, fora (PCLIENTE-5) |

O J6 tem duas pessoas dentro, e elas precisam de tratamentos diferentes:

- **A que já é profissional.** Comprou um ingresso como participante e também produz eventos. A
  conta é a mesma (RN-450). Ela precisa de uma saída visível, não de um cadastro.
- **A que ainda não é.** Comprou, gostou, e quer saber o que é o outro lado. Ela precisa de um
  convite para conhecer, e o código Leela é o mecanismo — nunca uma parede.

## Parte 3 · A ponte, escrita em fluxo

### Fluxo A · quem já é profissional atravessa

> **Dado** que a Ana está em `/minha-conta` com sessão nomeada e o crachá dela tem `tenantId`
> ou papel de organizador,
> **Quando** a área desenha as portas,
> **Então** ela vê um cartão só, "Ir para o painel profissional", com o apoio dizendo que é a
> mesma conta e que o painel vai pedir a senha de novo;
> **E** o clique abre `painelUrl('/entrar')`, onde ela entra e cai na Visão Geral do tenant
> dela, pelo `destinoPosLogin` que já existe e não muda.

Nada de servidor nesta metade. Muda a copy e a expectativa.

### Fluxo B · quem só é cliente conhece o painel profissional

> **Dado** que a Ana está em `/minha-conta` com sessão nomeada, sem tenant, sem capacidade de
> plataforma e sem `profissionais/{uid}`,
> **Quando** ela clica em "Conhecer o painel profissional",
> **Então** a tela pede o aceite do termo do profissional (RN-466, checkbox nascendo
> desmarcado) e chama a promoção no servidor;
> **E** o servidor cria `profissionais/{uid}` com `statusOnboarding: 'aguardando_convite'`
> (RN-411) e carimba o consentimento com versão e instante do **servidor** (RN-446);
> **E** a tela a manda para `painelUrl('/entrar')`;
> **E** depois de entrar ela aterrissa em **vitrine** (RN-510), e o primeiro gesto sobe o aviso
> de boas-vindas com o campo do código Leela.

### Fluxo C · a promoção repetida não duplica nada

> **Dado** que a Ana já pediu a promoção antes e o doc existe em `aguardando_convite`,
> **Quando** ela clica de novo,
> **Então** o servidor devolve sucesso sem escrever segunda vez, e a tela a manda direto ao
> painel;
> **E** o consentimento carimbado não é recoletado, pela RN-467.

Idempotência não é higiene aqui: a área do cliente é uma tela de leitura, e um duplo clique não
pode produzir dois estados de onboarding.

### Fluxo D · a conta de administração da plataforma não vê porta nenhuma

> **Dado** que o crachá tem `role: 'platform_admin'` e nenhum papel de organizador,
> **Quando** a área desenha as portas,
> **Então** nenhuma aparece, pela RN-449;
> **E** nenhum caminho da área do cliente produz URL de `/plataforma`, o que hoje é garantido
> pelo tipo `RotaPainel`, que só admite `/entrar` e `/cadastrar`.

O ponto cego que a FRONTEIRA-AUTH pinou continua pinado: em `portaOrganizador.ts:68` a pergunta
é *"esta conta é SÓ da plataforma?"*, não *"esta conta administra a plataforma?"*. Trocar por
`isPlatformAdmin` tiraria do dono, que é `tenant_owner` **com** a capacidade, a porta que ele é
o mais qualificado a usar. A promoção do Fluxo B tem de herdar essa leitura, e não a outra.

### O que a promoção recusa, e recusa nomeando

| Chamador | Resposta |
|---|---|
| Sem sessão | recusa de autenticação, a mesma dos outros callables da área |
| Sessão anônima do checkout | recusa: promover conta anônima criaria profissional sem e-mail |
| Conta que já tem tenant | sucesso sem escrita, porque já é profissional |
| Conta de administração da plataforma | **recusa nomeada**, pela RN-449 — e o teste existe com esse nome |
| Aceite do termo ausente ou datado pelo cliente | recusa, pela RN-446 |

Erro tipado, com mensagem própria, nunca `internal`. É a lição do DEF-B da ONBOARD-REV, e ela
vale aqui inteira.

## Parte 4 · Autenticação e fronteira, o que muda e o que não muda

**Não muda nada na fronteira.** Esta é a afirmação que mais importa desta spec, e ela é
deliberada: a FRONTEIRA-AUTH provou ontem, com 18 URLs em produção sem sessão, que o painel
manda todo mundo para `/entrar`. A ponte desta rodada não pede exceção nenhuma nessa parede.

| Pergunta | Resposta |
|---|---|
| Onde a cliente loga? | Na landing, no overlay de entrada (S1232). O painel nunca vira porta de cliente |
| Onde a profissional loga? | No painel, em `/entrar`, como sempre |
| A guarda de conta órfã muda? | **Não.** A promoção dá à conta o doc que a guarda procura; a guarda continua idêntica |
| Alguma Rule abre para `athlete`? | **Não.** A área continua servida por callables do próprio dono da conta, no molde do `getCheckoutPrefill` |
| A travessia carrega sessão? | **Não**, e a tela passa a dizer isso. Origens diferentes, sessões diferentes (PCLIENTE-3) |
| A vitrine muda? | **Não.** Ela recebe um público novo, que é o que a RN-510 já desenhou |

Uma consequência de segurança que vale escrever: como a promoção **não** concede tenant nem
papel, ela não é elevação de privilégio. O que ela concede é a travessia da guarda de conta
órfã até uma tela que, por construção da RN-510, não consulta nada de tenant. O pior desfecho de
um abuso é alguém ver a vitrine.

## Parte 5 · As histórias

Numeradas no [[LEELA-E12-landing]], que é o épico dono das superfícies da landing. Prova de não
colisão em `03-rns-delta.md`.

### LEELA-S1233 · O painel do cliente ganha casca, navegação e estados

A área vira painel: cabeçalho de conta com identidade e saída, navegação persistente das quatro
áreas, e os estados de sistema com nome próprio em vez de improviso por painel. Reusa
`AppShell`, `Tabs`, `PageHeader` e `SystemStateScreen` do design system; nenhum componente novo.

- **T1** · a casca: cabeçalho de conta, navegação persistente, e o comportamento em telas
  estreitas.
- **T2** · os estados de sistema da área inteira, unificados: sem sessão, carregando, erro de
  leitura, sessão anônima, e conta sem vínculo de compra.
- **T3** · a saída (sair da conta) deixa de ser implícita e ganha lugar fixo na casca.

### LEELA-S1234 · A ponte para o painel profissional

- **T1** · a promoção no servidor: callable que cria `profissionais/{uid}` em
  `aguardando_convite` com o carimbo do termo, idempotente, com as cinco recusas nomeadas. ⚔
- **T2** · o cartão da ponte na área do cliente, nos dois estados (já é profissional × ainda
  não é), com o aceite do termo e o aviso do segundo login.
- **T3** · a prova de fronteira: passar pela ponte **não** produz claim de tenant, **não**
  produz `platform_admin` e **não** altera o papel da conta. Teste em nome próprio. ⚔
- **T4** · a demonstração ponta a ponta: conta de cliente atravessa, aterrissa em vitrine, o
  aviso sobe no primeiro gesto e o resgate do código Leela funciona sem passo a mais.

### LEELA-S1235 · A travessia declarada nos dois sentidos

- **T1** · o par do alternador no lado do cliente: quem alcança os dois painéis vê a saída dos
  dois lados, com o mesmo vocabulário do `AlternadorDePainel` do painel profissional.
- **T2** · a copy da travessia, com o segundo login dito antes do clique e o rebatismo da
  RN-468 aplicado (profissional, não organizador).

### O que estas histórias deliberadamente não fazem

Não tocam `apps/painel`, exceto pela leitura do que a vitrine já faz. Não abrem Rule. Não criam
segunda porta de cadastro. Não mexem no overlay de entrada da landing, que é território das
lanes de conta.

## Parte 6 · O que esta rodada não toca, e por quê

- **CONTA-1 e CONTA-2** (o código de seis dígitos e a porta única de criar conta). A ponte serve
  quem já tem conta e já está logada, então ela não depende de nenhuma das duas. Quando aquela
  fila rodar, o rótulo do header muda e nada aqui muda.
- **ADMINSEP-2.** Continua aberto. Esta spec constrói sobre o default de lá.
- **A Arena Social (S1226).** Fora por PCLIENTE-6, agora por decisão e não por bloqueio.
- **Reembolso e troca de titularidade.** Fora por PCLIENTE-5, mapeados como história própria.
- **O kit do design system.** Outra lane (`DS-CLAUDE-DESIGN`). Esta spec só nomeia os
  componentes, no [[04-inventario-de-telas]].

## Vizinhos

`01-decisoes-dono.md` tem o verbatim e as decisões. `03-rns-delta.md` tem as quatro regras.
[[04-inventario-de-telas]] é a peça para o Claude Design. [[05-fila-codigo]] tem a ordem.
