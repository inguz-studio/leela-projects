---
lane: SPEC-CONTAS-LANDING
trace: leela-pixreal-diag-20260804
employee: sf-cto (software-forge)
data: 2026-08-05
territorio: leela-specs/ (mais este handoff)
codigo_escrito: nenhum
---

# Handoff · SPEC-CONTAS-LANDING

Lane de documento. **Nenhuma linha de código foi escrita.** Toda afirmação sobre o repositório
foi medida com o caminho citado.

## O que o dono pediu, e o que foi entregue

Três falas: os dois CTAs no modal de entrada da landing, a máquina por trás deles (código de
seis dígitos por e-mail, primeiro acesso e criação de conta de participante), e a resposta ao
ADMINSEP-1. A rodada está em `leela-specs/02-rodadas/2026-08-05-contas-landing/`, com quatro
arquivos na convenção da casa: decisões, spec, delta de RNs e fila de código.

## A pesquisa da referência que o dono citou

Ele mandou simular o fluxo da Cheers. Pesquisa em fontes públicas, 05/08/2026, sem acesso
autenticado. O achado que muda o registro:

**A Cheers não sustenta os seis dígitos.** A recuperação documentada dela é **link por e-mail**,
não código (`ajuda.cheers.com.br/pt-BR/articles/15811184`, 27/06/2026), e nenhuma fonte diz
quantos dígitos. Há sinal forte de que existe login por código — o rótulo "PREFIRO ENTRAR COM
SENHA" é opt-out, e uma avaliação na App Store de ~02/08/2026 diz *"ele manda um código pro seu
email"* —, mas isso sustenta a existência, não o número nem o prazo.

**Quem documenta seis dígitos é a Sympla**, com quinze minutos de validade, por e-mail, SMS ou
WhatsApp, e com o login por senha descontinuado
(`ajuda.sympla.com.br/hc/pt-br/articles/42334777719956`).

**O que a Cheers confirma e vale registrar:** a dicotomia dela é `ENTRAR` × `CRIE UMA CONTA`,
sem CTA de primeiro acesso — o caso é absorvido pelo link "Esqueceu a senha ou ainda não criou
uma?"; a conta de organizador **não é conta separada**, é uma página criada por cima de uma
conta pessoal já logada, o que valida a RN-461 de 04/08; e o aceite dos termos lá é **tácito**,
que é o ponto onde a Leela não pode seguir, porque a RN-412 e a RN-446 exigem checkbox
desmarcado e carimbo de servidor.

Os seis dígitos ficaram registrados como **decisão do dono**, não como cópia verificada, para
que ninguém os defenda depois com uma autoridade que a pesquisa não dá.

## As sete regras novas

Faixa livre conferida antes: a mais alta em uso era a **475**, e `RN-476` a `RN-482` devolveram
zero ocorrências em `leela-specs`, `apps`, `packages`, `functions` e `firestore.rules`.

| RN | Épico | Núcleo |
|---|---|---|
| RN-476 | E00 | a mecânica do código: entropia do sistema, digest **HMAC com pepper**, dez minutos, uso único em transação, cinco tentativas com morte do código, um código vivo por endereço, limitador por alvo, resposta única |
| RN-477 | E00 | as duas portas são a mesma máquina; a divergência só existe **depois** da prova de posse |
| RN-478 | E00 | a conta nasce depois da prova, e nasce inteira ou não nasce |
| RN-479 | E00 | consentimento com o termo da conta (RN-466), carimbado pelo servidor no molde da RN-446 |
| RN-480 | E00 | nenhuma porta cria conta profissional, de tenant ou de plataforma — provado por teste |
| RN-481 | E12 | as duas portas terciárias (`ghost`/`sm`), que navegam para `/primeiro-acesso` e `/criar-conta` |
| RN-482 | E12 | o nono e-mail do catálogo, neutro, e falha de envio como incidente |

Stories novas: **S1229** (primeiro acesso) e **S1230** (criar conta), ambas no E12. Os três hits
de varredura para esses IDs eram prosa de varredura anterior, no padrão de armadilha que o
índice de RNs já documenta.

## A mecânica escolhida, e a decisão técnica que a sustenta

O ponto que decide tudo é aritmético. A casa guarda credencial como **digest**, e o precedente
óbvio seria SHA-256 puro, que é o que o convite de assessoria usa. Ele não serve aqui: o token
do convite tem 256 bits, e um código de seis dígitos tem **10⁶ valores**, que qualquer um com
acesso ao documento enumera offline em milissegundos.

A saída é a que o CRM já aplicou ao CPF, pela mesma conta de espaço de busca: **HMAC-SHA256 com
pepper secreto**, fail-closed sem pepper, com o material sendo o par `"<e-mail>:<código>"` para
que um digest observado num documento não seja testável contra outro.

O resto do desenho, com a razão de cada peça:

- **Entropia do sistema**, nunca `Math.random`. A casa acabou de varrer o repositório inteiro
  por isso (`61776052`, `8d779dce`, `20a9c904`); nascer previsível reintroduziria o defeito na
  mesma semana.
- **Dez minutos.** Credencial de sessão, contra os quinze da Sympla. Registrado por contraste
  com a RN-420: o link do ingresso **não** tem prazo, porque é comprovante de compra.
- **Cinco tentativas, e o código morre inteiro ao esgotar.** Sem isso, um milhão de combinações
  contra um código vivo por dez minutos é força bruta resolvida numa tarde. O contador é
  incrementado **na mesma transação** da comparação; fora dela, dois pedidos simultâneos leem o
  mesmo valor e o teto vira decoração. É o alvo número um da review.
- **Um código vivo por endereço**, com o novo invalidando o anterior, para que pedir substitua
  a chance do atacante em vez de acumulá-la.
- **Limitador por alvo** (`consumirRateLimit`, 3/15min e 10/24h por endereço), e **nenhuma chave
  por origem** — o `rateLimit.ts` tem a decisão escrita contra isso, com motivo. O brief desta
  lane pedia "por e-mail e por origem", e a segunda metade não cabe na aplicação; ela é da
  borda, e a borda não está ligada. Virou nota no item de CTO que já existia no painel.
- **Uma resposta só** para as cinco causas de negativa, no molde da RN-419.

## A reconciliação que evita o oráculo

Duas portas que respondem conforme o que encontram viram o oráculo mais barato possível: digite
um endereço em cada uma e descubra quem já comprou. A saída escrita: **antes da prova, as duas
portas são indistinguíveis** em resposta e em tempo, e o servidor não consulta "existe conta?"
antes de enviar, porque é a ausência desse ramo que faz a latência não distinguir.

**Depois da prova, a divergência é livre**, e a frase que sustenta tudo é: não é vazamento
contar sobre a caixa de e-mail de quem acabou de provar que a tem. Quem entrou por "primeiro
acesso" sem conta ganha o campo de nome e cria; quem entrou por "criar conta" com conta define
a senha e entra. **Nenhuma tela diz "você não tem conta" nem "e-mail já cadastrado"**, e as duas
frases estão proibidas em letra no épico.

## POSSE-EMAIL-1 · a recomendação, sem decidir

O item mede que o vínculo da compra à conta sai de busca por e-mail, sem prova de posse, e que
desde a RN-469 esse vínculo é chave de leitura. A correção exata já estava escrita nele: uma
condição de e-mail verificado em **um único ramo** da regra do pedido.

Esta rodada muda duas coisas, e elas atacam pontas diferentes. **A metade do atacante morre na
origem**, porque sob a RN-478 nenhuma conta nasce antes do código provado — vale para a porta
nova; o `/cadastrar` do painel continua criando conta sem verificar, e isso é o CONTA-2. **A
metade do custo colateral morre também**, e é a que destrava a correção: hoje a condição tiraria
leitura de quem comprou e nunca verificou, e essa pessoa depende de um e-mail para verificar;
com o código ela tem caminho próprio, e o servidor carimba `emailVerified` no mesmo gesto.

**Recomendação registrada:** aplicar a condição na mesma onda em que o código subir. Conferido
quem ficaria de fora, que é o teste da afirmação: quem comprou e não fez o primeiro acesso
continua lendo o pedido pela sessão do checkout, que é o ramo que não muda, e continua abrindo
o ingresso pelo link assinado (RN-452). Ninguém fica trancado.

**O que sobra do item:** o vínculo em si continua saindo de igualdade de endereço, e erro de
digitação continua carimbando na conta errada. O que muda é que essa conta só lê se também
tiver provado posse do endereço, o que reduz o caso a alguém que controla a caixa para a qual a
compra foi endereçada — e nesse cenário o e-mail com o ingresso já chegaria lá de qualquer
forma. **Nada foi decidido.** A tarefa está na fila marcada como GATED.

## ADMINSEP-1 · fechado e removido do painel

Verbatim do dono: *"Acho que podemos deixar separado o acesso de cliente e o acesso admin
mesmo."* Profundidade escolhida: **só as superfícies de login**, que era o default proposto.

O item saiu do painel pela disciplina de limpeza, com o registro completo em
`02-rodadas/2026-08-05-contas-landing/01-decisoes-dono.md`. **A alternativa recusada por ora
ficou escrita com o motivo:** somar um endereço próprio para o painel de administração era a
recomendação do maestro, e o argumento dela continua verdadeiro — mesma origem significa que
uma falha de tela no painel do organizador alcança o token da plataforma, e App Check não pode
ser ligado só no segundo. Fica registrada para não voltar como surpresa.

Três referências cruzadas foram consertadas na remoção: o preâmbulo do painel ganhou a nota de
saída, o **ADMIN-VE-AREA-1** parou de citar um item que não existe mais (e ganhou uma nota de
que o fechamento fortalece o default dele sem decidi-lo), e o **ADMINSEP-3** teve a frase
"não espera o ADMINSEP-1" atualizada. **ADMINSEP-2 e ADMINSEP-3 continuam abertos.**

## A fila proposta

Dez tarefas, três ondas, nada executado.

| # | Task | O que faz | ⚔ |
|---|---|---|---|
| A1 | `S1229-T1` | o núcleo do código | ⚔ |
| A2 | `S1229-T2` | o nono e-mail do catálogo | — |
| A3 | `S1229-T3` | a callable que pede o código | ⚔ |
| A4 | `S1229-T4` | a callable que consome, ramo de conta existente | ⚔ |
| A5 | `S1230-T1` | o ramo de criação, com consentimento e rollback | ⚔ |
| B1 | `S1229-T5` | as duas portas no modal (espera a BUILD-MOTION) | — |
| B2 | `S1229-T6` | a rota `/primeiro-acesso` e a guarda de volta | — |
| B3 | `S1230-T2` | a rota `/criar-conta` | — |
| C1 | `S1230-T3` | a prova da fronteira por teste | ⚔ |
| C2 | `S1230-T4` | a condição de e-mail verificado na Rule — **GATED** | ⚔ |

## Três coisas que a próxima lane precisa saber antes de começar

**Colisão de território, agora.** A lane `BUILD-MOTION` tem `apps/landing` e
`packages/design-system` em voo, e o `EntrarOverlay.tsx` está no caminho dela. A logo do modal,
que o dono pediu na mesma fala, é **dela**, e a B1 não parte antes de ela aterrissar.

**Um segredo novo de operação.** O pepper do HMAC é o terceiro desse tipo na casa e precisa
existir no Secret Manager antes do deploy das functions. Nenhum teste do emulador cobra isso.

**A dependência com a SPEC-QUALIFICACAO.** A onda A daquela fila mexe no mesmo módulo do core
que a A5 desta. Qualquer ordem funciona desde que a segunda consuma o contrato da primeira; o
que não pode acontecer é nascerem dois contratos paralelos. É o CONTA-2 no painel.

## O que sobe ao dono

**CONTA-1** (novo) · o código convive com o link do e-mail da compra, ou o substitui? Default
proposto: convivem. O argumento contra é da casa e é bom — duas superfícies de credencial para
a mesma capacidade.

**CONTA-2** (novo) · uma porta de criar conta, ou duas? Default proposto: uma, na landing, com
o `/cadastrar` do painel apontando para ela quando a SPEC-QUALIFICACAO rodar.

**POSSE-EMAIL-1** (existente) · ganhou a recomendação e o custo, e continua sem decisão.

**Nota, não pergunta:** o item da borda de força bruta ganhou um consumidor novo, o pedido de
código, que é público, anônimo e dispara e-mail. Continua sendo do CTO humano.

## Arquivos tocados

Rodada nova: `leela-specs/02-rodadas/2026-08-05-contas-landing/` (quatro arquivos).
Épicos: `LEELA-E00-fundacao-tecnica.md` (+172), `LEELA-E12-landing.md` (+144).
Canon: `indice-de-regras-de-negocio.md` (faixa 476-482, próximo número 483).
Painel: `DECISOES-ABERTAS.md` (ADMINSEP-1 removido, CONTA-1 e CONTA-2 novos, POSSE-EMAIL-1 e o
item de borda atualizados).
Boards: `BOARD-EPICOS.md` (E00 e E12), `V1-KANBAN.md` (card novo com as dez tarefas),
`V1-CHECKLIST.md` (seção da rodada).
Engenharia: `catalogo-de-emails.md` (a seção do nono, que está especificado e não existe).

Nada fora de `leela-specs/`, além deste handoff.
