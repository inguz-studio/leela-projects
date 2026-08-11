# PONTE-RESOLVE · os três pontos de ponte, resolvidos

**Rodada:** 11/08 (madrugada) · trace `leela-redesign-v2-20260810`, lane PONTE-RESOLVE
**Ordem do dono:** *"resolve os pontos de 'ponte' no obsidian"* — dormindo, autonomia delegada.
**Quem decidiu:** o maestro, com os defaults abaixo. O dono ratifica ou reabre pela condição escrita.

Os três itens vinham da review antagonista de 08/08 (`.nirvana/handoffs/leela-retomada-20260808-PONTE-REV.md`). Dois moravam no painel canônico até esta rodada; o terceiro já tinha sido decidido no corte de 09/08 e construído no mesmo dia.

---

## PONTE-ELEGIVEL-1 · a porta deixava passar duas contas que o resgate ia recusar

**Estado:** decidido em 09/08 (`02-rodadas/2026-08-09-corte-painel/01-decisoes-maestro.md`), construído em 09/08, **re-provado nesta rodada**. Não voltou ao painel.

**O que era.** A porta (`promoverParaProfissional`) recusava uma coisa só — a conta de administração da plataforma. O portão do código (`resgatarConviteOrganizador`) recusa cinco estados. O divulgador (`promoter`) e a ex-organizadora rebaixada de propósito (`athlete` com o marcador de demoção) atravessavam a porta, esperavam o convite e ouviam a recusa genérica da RN-414 dias depois — indistinguível de "código inválido".

**O que ficou.** A régua mora em `functions/src/platform/elegibilidadeOrganizador.ts`, sozinha, e as duas guardas a importam: a porta lê o crachá pelo token, o portão pelo Auth Admin. A porta ganhou a sexta recusa nomeada, `conta_inelegivel`, com frase própria no cartão.

**A prova, re-executada em 11/08.** A comparação porta × portão roda os 24 crachás e tira a expectativa **do portão**, não de uma cópia da lista: 31 casos verdes. A fronteira e o transporte, verdes. Contra Firestore + Auth de verdade, o divulgador para na porta e o banco fica intacto; a rebaixada com documento antigo é recusada e o documento dela não é tocado.

**Reabre quando.** Não reabre. Se a régua anti-enumeração mudar, a conversa é do LGPD-1.

---

## PONTE-CTA-1 · os dois CTAs por intenção subiram, e agora eles medem

**Decisão.** Os **dois** botões que o dono pediu — "Criar Club" e "Organizar eventos" —, cada um carimbando a própria intenção na chamada. "Painel Profissional", que é a palavra dele para o lugar, passa a ser o **título** do cartão.

**Porquê.** O pedido original era esse, e a lane de 08/08 entregou um botão só por uma razão honesta: a landing não tem uma linha de telemetria, então dois botões disparando a mesma promoção não diriam qual converteu. A review antagonista mediu que a conclusão não fechava — a callable **já** escreve uma linha de log a cada travessia, e o resgate do código também loga, então o identificador da conta junta os dois e mede **conversão**, não clique. Era razão de calendário, não de impossibilidade. Com um campo, o pedido do dono sobe inteiro e o teste passa a ter leitura.

**O que o campo faz, e o que ele nunca faz.** `intencao` é telemetria e **não recusa ninguém**. Valor ausente vira `nao_declarada`; valor desconhecido vira `invalida`. Os dois estados de ausência são separados de propósito: `nao_declarada` é o cliente velho — a landing que está no ar hoje, que manda só o aceite — e `invalida` é o cliente novo com um erro de digitação. Fundir os dois faria um typo de deploy novo sumir dentro do volume do deploy velho, e a medição diria que ninguém clicou.

**Vocabulário.** "Organizar **eventos**" e "Criar **Club**" são as palavras do dono, e nenhuma das duas colide com a D-0802-1: o guarda-chuva do produto continua sendo "experiência" e "participante", e "Eventos" e "Clubs" seguem sendo os nomes das **áreas do painel** — que é como a vitrine já os nomeia. O texto do cartão não ganhou nem perdeu ocorrência de nenhum dos dois termos.

**Reabre quando.** Quando houver número. O log do servidor passa a separar as duas intenções, e a primeira leitura desses dados é do dono: se um dos dois rótulos vencer e virar a porta permanente, ou se a medição disser que a distinção não muda nada e um botão só serve melhor, a conversa volta — com dado, não com hipótese. Reabre também se ele quiser um terceiro botão para "Painel Profissional": o guarda de tela quebra de propósito quando um terceiro aparece, e acrescentar a intenção é uma linha.

---

## PONTE-NOME-1 · a produtora ganha nome escolhido, na origem

**Decisão.** A porta pergunta o **nome da produtora**, pré-preenchido com o nome da pessoa e editável, e o campo desce até `organizacao`. O resgate do código continua lendo exatamente o mesmo campo, do mesmo jeito — nada de provisionamento de tenant mudou.

**Porquê.** O endereço interno é cunhado uma vez e é definitivo, e a review mediu que **não existe o depois**: o registro de profissional só admite criação pela própria pessoa, não há chamada que a deixe escrever a organização mais tarde, e renomear a produtora é exclusivo de administrador da plataforma. Das quatro saídas que o painel listava, três custam mais do que resolvem: adiar o batismo mexe na regra do resgate, abrir a edição conserta o nome de exibição e não o endereço, e deixar como está transforma dado pessoal de titular em identificador permanente sem que ninguém tenha escolhido. Pedir na porta é o preço mínimo, e ele é **um campo opcional**, não um formulário: quem não tocar nele cai exatamente no comportamento de antes.

**O pré-preenchimento não é invenção da tela.** Ele mostra o default que já existia em silêncio — o nome da pessoa é justamente o que o resgate usaria. A tela só devolve a caneta para a dona. E quando o token não traz nome, o campo nasce **vazio**: repetir ali o degrau seguinte do servidor (o pedaço do e-mail antes do arroba) daria cara de escolha a um palpite que ninguém fez.

**⚠️ Correção de 11/08 (lane PONTE-FIX, bloqueador B2 da review antagonista).** A frase acima — *"quem não tocar nele cai exatamente no comportamento de antes"* — era **falsa para uma classe de nomes**, e a falha vinha justamente do pré-preenchimento. O campo nascia com o nome do token e a travessia mandava esse valor **sem a pessoa tocar em nada**; o servidor recusa nome que não vira endereço; e nome escrito fora do alfabeto latino não vira endereço nenhum. Uma participante chamada `Анна`, `李` ou `ゆき` tem conta válida, via o próprio nome no campo, não mexia nele, clicava — e era recusada por um nome que nunca digitou. Antes desta rodada ela atravessava. **O conserto:** a regra que já valia para o token sem nome passou a valer também quando o nome existe e não vira endereço — o campo nasce vazio, e "não tocar" volta a ser o comportamento de antes, como esta página promete. Quem **digita** um nome que não vira endereço continua sendo recusado, e tem de ser: o endereço é cunhado uma vez.

**Nome inválido é recusa, não descarte.** Um nome digitado e jogado fora em silêncio é o próprio defeito que este item existe para matar — a pessoa só descobriria no dia em que o endereço já estivesse cunhado. A régua tem três partes: comprimento entre 2 e 80 e, além dele, o endereço derivado precisa sobrar. `"!!"` tem dois caracteres e não vira endereço nenhum.

**⚠️ Correção de 11/08 (ressalva R2 da review antagonista).** A frase anterior dizia que o comprimento eram *"os mesmos do formulário de cadastro, para as duas portas não aceitarem coisas diferentes"*. A primeira metade é verdade e a segunda não: `ORGANIZACAO_MIN/MAX` são a **mesma constante** nas duas portas, importada do core, mas o `/cadastrar` **não** checa se o endereço derivado sobra. Na prática o `/cadastrar` **aceita** `"!!"` e a porta o **recusa**. A divergência é *fail-safe* — a porta é a mais estrita, e o que ela barra é exatamente o que produziria endereço vazio —, então ela fica e passa a estar **declarada** em vez de virar promessa falsa de paridade. Unificar a régua no core, ao lado de `validarCadastroOrganizador`, é **card próprio**: mexe no `/cadastrar`, que não é território de uma lane de conserto.

**⚠️ Correção de 11/08 (bloqueador B2, segunda parte).** A frase da recusa mentia. Ela dizia *"pelo menos duas letras ou números"* para uma pessoa cujo nome **tem** duas letras — `ゆき` tem duas e é recusado, porque o endereço só é escrito com letras de A a Z e números. A régua real tem dois eixos: **dois caracteres no total** e **ao menos um caractere de A a Z ou um número**. É isso que a pessoa lê agora, nas duas superfícies (tela e servidor).

**A prova.** Contra Firestore + Auth de verdade: com o nome escolhido, a produtora nasce `castelo-producoes`; **sem** ele, nasce `ana-paula`. O segundo caso ficou no arquivo de propósito, como controle — é o desfecho de quem atravessar sem escolher, e é ele que a condição de reabertura descreve.

**O que esta decisão NÃO resolve, e continua card separado.** Quem atravessar sem escolher, ou quem já atravessou, continua sem caminho de troca. Renomear depois exige abrir escrita no registro do profissional e, para o endereço interno, uma migração de tenant — trabalho próprio, fora do que uma noite comporta com prova completa. A mitigação que existe hoje é de calendário: a porta está no ar desde 08/08, mas o resgate do código **não está** (as três chamadas da porta do organizador responderam 404 na medição de 04/08) e a semente do primeiro código segue retida pelo LGPD-1. Enquanto isso durar, ninguém teve endereço cunhado — e é essa janela que faz este conserto chegar a tempo.

**Reabre quando.** Quando a primeira pessoa reclamar do nome depois de resgatado o código, ou quando o dono quiser que a produtora seja renomeável pelo painel dele. Reabre também se ele achar que o campo pesa demais no cartão — a medição do `nomeDeclarado` no log diz quantas pessoas mexeram nele, e essa é a leitura que decide.

---

## O que subiu, e o que não subiu

Nenhum deploy nesta rodada. Os três itens estão **construídos e selados**, e sobem na fase de deploy com os gates dela — as functions e a landing precisam subir **juntas** ou em ordem: as functions primeiro (o campo novo é opcional e o cliente velho continua atravessando), a landing depois.

Detalhe de execução, provas e vetores para a review antagonista: `.nirvana/handoffs/leela-ponte-resolve-20260811.md`.

---

## A review antagonista aconteceu, e a rodada ganhou uma terceira lane (11/08)

A review foi feita em contexto fresco e está em `.nirvana/handoffs/leela-ponte-REV-20260811.md`. Ela liberou a construção dos três itens — re-executou as quatro suítes sozinha e os quatro números bateram, e o gate de lote da landing, que a lane anterior tinha deixado como bloqueio, **fechou verde numa máquina livre**, confirmando que o vermelho da noite era contenção. Mas ela achou **dois bloqueadores** e três ressalvas, e nenhum deles podia ir a deploy. A lane **PONTE-FIX** os pagou; o detalhe está em `.nirvana/handoffs/leela-ponte-FIX-20260811.md`.

O que mudou de decisão, e não só de código:

1. **A ordem do deploy é necessária e não é suficiente.** O defeito não precisa de functions velhas para acontecer: o `dist/` compilado do `api-client` estava 42 horas atrás da fonte, e é ele que o bundle da landing lê — `tsc` lê a fonte, a suíte lê um dublê, e só o bundle lê o `dist/`. Um `next build` naquele estado produzia uma landing que **nunca mandava** os dois campos, com os três gates verdes. Agora existe um gate de frescor no build da landing que recusa dist defasado, e ele **já pagou na primeira execução**: pegou o design system 21 horas atrás da fonte, um segundo caso vivo do mesmo defeito.

2. **A resposta da callable passou a ecoar o que ela aceitou.** Antes, "o servidor gravou o meu nome" e "o servidor ignorou o meu nome em silêncio" eram a mesma resposta na rede. Com o eco, a tela e qualquer sonda de fumaça distinguem os dois — e é isso, e não disciplina de deploy, que impede o defeito de voltar.

3. **O descarte silencioso sobrevivia em dois ramos, e a tela descartava o retorno.** Quem já tinha produtora digitava um nome, o servidor não o aplicava e a pessoa lia "Pronto. O painel profissional já é seu" como quem tinha escolhido. Agora a tela diz o que aconteceu.

4. **A recusa do nome ganhou endereço no campo.** Ela saía num alerta solto no fim do cartão, e quem usa leitor de tela ouvia o erro sem saber qual campo o produziu.

**Continua devendo, e é gate:** a conferência visual no navegador. O cartão mudou de forma duas vezes (dois botões, um campo, e agora o erro dentro do campo) e jsdom não desenha.
