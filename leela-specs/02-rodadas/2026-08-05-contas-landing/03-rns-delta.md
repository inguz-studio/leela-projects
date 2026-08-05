---
tags: [leela, rns, rodada, contas, primeiro-acesso, cadastro, otp, lgpd]
trace: leela-pixreal-diag-20260804
lote: SPEC-CONTAS-LANDING
data: 2026-08-05
---

# 03-rns · O primeiro acesso por código e a criação de conta na landing

> **Prova de não colisão (2026-08-05).** A faixa mais alta em uso era a **475**, consumida em
> 05/08 pela SPEC-CODPEDIDO. Varredura por `RN-476` a `RN-482` em `leela-specs`, `apps`,
> `packages`, `functions` e `firestore.rules`, fora de `node_modules`: **zero ocorrências nos
> sete**. Esta lane consome **RN-476 a RN-482**. O 460 continua marcador de faixa sem enunciado
> e segue de fora, como em todas as rodadas anteriores.
>
> **Prova de não colisão de story.** `S1229` e `S1230` varridos nos mesmos alvos: três hits, e
> os três são prosa de varredura anterior, no padrão de armadilha que o
> [[indice-de-regras-de-negocio]] já documenta. Nenhum é definição. Esta lane minta **S1229** e
> **S1230** no E12.
>
> Este arquivo é o delta da rodada. **O texto canônico vive nos épicos donos**:
> [[LEELA-E00-fundacao-tecnica]] para a mecânica de credencial e a fronteira de contas,
> [[LEELA-E12-landing]] para as superfícies. Decisões em `01-decisoes-dono.md`; spec em
> `02-spec-contas-landing.md`; fila em `04-fila-codigo.md`.

## Novas

| RN | Regra (resumo — canônico no épico) | Épico | Lote |
|---|---|---|---|
| **RN-476** | **O código de seis dígitos é a prova de posse do e-mail, e a mecânica dele é fechada.** Seis dígitos decimais com zeros à esquerda preservados, sorteados com a entropia do sistema. Persiste só `HMAC-SHA256(pepper, "<e-mail>:<código>")`, fail-closed sem pepper — SHA-256 puro não serve, porque 10⁶ valores são enumeráveis offline em milissegundos (mesma conta do CPF na RN-174/A3). Prazo de **10 minutos**; **uso único** consumido em transação; teto de **5 tentativas** por código, ao fim do qual o código morre inteiro; **um código vivo por endereço**, e pedir um novo invalida o anterior; comparação em tempo constante; limitador `consumirRateLimit` por **alvo** (3/15min e 10/24h por endereço). Errado, vencido, já usado, inexistente e esgotado devolvem **a mesma negativa**. O throttle por origem é da **borda** (App Check/Cloud Armor), por decisão já escrita no `rateLimit.ts`, e a borda não está ligada. | E00 (dona) | SPEC-CONTAS-LANDING |
| **RN-477** | **As duas portas do modal são a mesma máquina, e a divergência só existe depois da prova.** "É meu primeiro acesso" e "Criar conta" pedem o e-mail, dizem a mesma frase e fazem o mesmo trabalho no servidor: nenhuma consulta a "existe conta?" antes de enviar, então nem a resposta nem o tempo distinguem. **Depois** do código correto, o desfecho é livre e a tela adapta sem erro: quem entrou por primeiro acesso e não tem conta ganha o campo de nome e cria; quem entrou por criar conta e já tem conta define a senha e entra; quem já tinha senha define outra. Nenhuma tela diz "você não tem conta" nem "e-mail já cadastrado". Molde de resposta única = RN-419. | E00 (dona) · E12 (superfície) | SPEC-CONTAS-LANDING |
| **RN-478** | **A conta de participante nasce depois da prova, e nasce inteira ou não nasce.** Enquanto o código não é digitado, o que existe é um digest com prazo: digitar o endereço de terceiro não cria conta, não ocupa endereço e não impede nada. Verificado o código, o **servidor** cria a conta no Auth, grava `atletas/{uid}` e **desfaz a conta do Auth se a gravação falhar**, e carimba `emailVerified` na mesma passada. A gravação convive com o gatilho `onCreateUser` por merge, sem sobrescrever. Inverte a ordem que produziu a conta órfã e o vetor do POSSE-EMAIL-1; **não fecha o LGPD-1**, que é do caminho do organizador. | E00 (dona) | SPEC-CONTAS-LANDING |
| **RN-479** | **O consentimento da conta de participante é o mesmo termo da conta, carimbado pelo servidor.** Checkbox nascendo desmarcado, finalidade declarada, versão e instante do **servidor** em `atletas/{uid}.consentimentoLgpd`, no molde da RN-446 (aceite datado pelo cliente é negado). A constante de versão é a **do termo da conta** da RN-466, compartilhada com o `/cadastrar`: duas superfícies criando conta com dois termos seria a divergência que a RN-466 existe para impedir. `profissionais/{uid}` não é tocado (RN-450). Quem chega pelo primeiro acesso de conta existente **não** vê checkbox: o aceite dela está carimbado no pedido, e recoletar contraria a RN-467. | E00 (dona) | SPEC-CONTAS-LANDING |
| **RN-480** | **Nada nas duas portas cria ou toca conta profissional, de organizador ou de plataforma.** A porta nova cria conta de participante com papel `athlete`, e mais nada. Conta profissional continua sendo promoção de conta existente (RN-461); conta de administração continua sendo outra conta (RN-449, ratificada pelo dono no fechamento do ADMINSEP-1 em 05/08); organizador e cliente continuam cabendo na mesma conta (RN-450). A fronteira é **provada por teste**, não presumida: passar pelas duas portas não produz `profissionais/{uid}`, não produz claim de tenant e não produz `platform_admin`. | E00 (dona) | SPEC-CONTAS-LANDING |
| **RN-481** | **O modal ganha duas portas terciárias, e elas navegam para rotas próprias.** Os dois CTAs são `variant="ghost" size="sm"` do DS, que é o terceiro degrau real da hierarquia — não existe variante "terciária" e inventá-la criaria um degrau que o sistema não tem. Eles **navegam** em vez de trocar o miolo do `aria-modal` (WCAG 3.2, mesmo motivo já escrito no `RodapeEsqueciSenha`). Nascem `/primeiro-acesso` e `/criar-conta` na landing, com `noindex`, `no-store` e `disallow`, no tratamento que `/minha-conta` recebeu. O caminho de volta é parâmetro **só relativo à própria origem**, conferido contra forma conhecida, caindo na home diante de qualquer outra coisa; nenhum dado de pessoa entra na URL. Estados de erro honestos, e o campo de código nunca vai para URL, log ou autopreenchimento. | E12 (dona) | SPEC-CONTAS-LANDING |
| **RN-482** | **O e-mail do código é o nono do catálogo, e a falha de envio não é silêncio.** Moldura de `identidade.ts` como os outros oito, etiqueta própria na Brevo, assunto e corpo **neutros** — servem os quatro desfechos e não revelam se existe conta. O documento do código é escrito **antes** do envio: provedor recusando, a chamada devolve erro explícito e marca o documento como morto, porque devolver "enviamos" para quem não vai receber é o incidente de 04/08 servido de novo. Sem provedor, recusa antes de começar (fail-closed, molde do e-mail 3). **Sem repetição automática**: a política dos oito é no máximo uma vez, e a repetição é a pessoa pedir de novo, dentro do limitador da RN-476. | E12 (dona) | SPEC-CONTAS-LANDING |

## Ampliadas e reconciliadas, sem número novo

- **RN-453** — inalterada no contrato, e continua valendo inteira: o primeiro acesso define a
  senha e **entra no sistema**, com o destino decidido pela origem. A RN-476 acrescenta um
  segundo caminho até esse mesmo desfecho, iniciado pela pessoa em vez de pelo e-mail. O que a
  RN-453 diz sobre a ordem é diretamente herdado: senha primeiro, sessão depois. Um código que
  logasse sozinho seria login sem senha, que é a jornada da Sympla e não a que o dono descreveu.
- **RN-155** — inalterada. A conta continua nascendo na confirmação do pagamento, sem senha. É
  ela que faz o "primeiro acesso" ser caso real na Leela, e ela é a divergência deliberada em
  relação à Sympla, onde a conta não nasce na compra.
- **RN-461** — inalterada, e agora com uma consequência de superfície escrita: quando a fila da
  SPEC-QUALIFICACAO rodar, o `/cadastrar` do painel passará a fazer o mesmo que a porta nova da
  landing, e o rótulo "Criar conta de organizador" do header (`PublicHeader.tsx:74-79`) estará
  desatualizado. Vira o **CONTA-2** no painel; nada é decidido aqui.
- **RN-466** — inalterada, e é ela que fornece a constante de versão do termo da conta que a
  RN-479 consome. A partição de base legal continua exatamente como está: nada do termo do
  profissional entra na porta de participante.
- **RN-469** — inalterada no enunciado. A recomendação de acrescentar
  `request.auth.token.email_verified == true` ao ramo de vínculo por conta é **recomendação**,
  registrada no POSSE-EMAIL-1 do painel, e depende da ratificação do dono. A RN-476 é o que
  remove o custo colateral dessa condição, porque depois dela toda sessão nomeada da landing
  tem o e-mail verificado.
- **RN-452** — inalterada, e é o controle que prova que ninguém fica trancado: ver o ingresso
  continua não exigindo conta, então quem comprou e ainda não fez o primeiro acesso continua
  com o ingresso pelo link assinado.
- **RN-420** — citada por contraste e não alterada. O link do ingresso **não** tem prazo,
  porque é comprovante de compra aberto meses depois; o código tem dez minutos, porque é
  credencial de sessão. Confundir os dois em qualquer direção produz erro.
- **RN-174** — inalterada, e é o precedente aritmético da RN-476: o hardening que trocou
  `sha256` por HMAC com pepper no registro de pessoas foi feito pela mesma conta de espaço de
  busca que aqui se aplica a 10⁶ valores.
- **RN-419** — inalterada, e é o precedente de forma: quatro causas distintas devolvendo a
  mesma resposta. A RN-476 aplica o mesmo a cinco causas.
- **RN-446** — inalterada, e é o molde do carimbo de consentimento que a RN-479 reusa sem
  reescrever.
- **RN-449 e RN-450** — inalteradas, e ratificadas pelo dono em 05/08 no fechamento do
  ADMINSEP-1. A RN-480 é a leitura delas nesta superfície.

## Onde cada uma aterrissa no épico

| RN | Épico dono | Seção |
|---|---|---|
| RN-476, RN-477, RN-478, RN-479, RN-480 | [[LEELA-E00-fundacao-tecnica]] | "Delta o primeiro acesso por código e a criação de conta na landing" |
| RN-481, RN-482 | [[LEELA-E12-landing]] | "Delta as duas portas do modal de entrada" |

O [[indice-de-regras-de-negocio]] recebe a faixa **476-482** na tabela de faixas e a frase de
faixa livre passa a apontar para a **483**.
