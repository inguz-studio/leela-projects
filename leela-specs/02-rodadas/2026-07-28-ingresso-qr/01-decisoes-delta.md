---
tags: [leela, decisoes, rodada, produto, ingresso, qrcode, credenciamento]
aliases: ["Rodada ingresso-qr 2026-07-28", "INGRESSO-QR", "DEC-QR-0728"]
trace: leela-build-2d6ee98d
lote: SPECS-0728
data: 2026-07-28
fonte: DEC-0728E (refinada) e DEC-0728G, em 02-rodadas/2026-07-28-decisoes/01-decisoes.md
---

# Delta ingresso com QR e virada de "entrega" para "credenciamento"

Delta sobre a S1206 do E12 e sobre o balcão do E03. Nada aqui recomeça o ingresso digital:
a RN-218, o `qrToken` assinado e o e-mail idempotente ao responsável já estão
especificados e em parte construídos.

## Verbatim do Vitor (2026-07-28)

> *"Sobre os QR Codes. Precisamos gerar os qr codes para pagamento pix, mas atmbém gerar o dos ingressos, com código identificador. Que deverá poder ser visualizado na área do organizador, ou visualizar apenas o código da tabela. Sempre que uma compra for realizada, enviaremos para o comprador responsável os QR Codes e identificadores. No campo "entrega" que temos no sistema, podermos mudar anomenclatura para "credenciamento"."*

## Inventário antes de especificar

**Já existe e não se reescreve.** `functions/src/eventos/qrToken.ts` com assinatura e
verificação; `registrarCheckin.ts` consumindo o token no balcão; os campos `qrToken` e
`ingressoEmitidoEm` no inscrito (RN-218); a subcoleção de notificações que dá idempotência
ao disparo (RN-219); a rota `/eventos/:slug/entrega` inteira, com balcão, atendimento,
banner e galeria de estados; o provedor de e-mail Brevo com remetente validado desde o
item 13 (DEC-0727E).

**O que não existe.** Um código legível. O `qrToken` é opaco e assinado de propósito, e
opaco é o oposto de exibível numa tabela ou ditável por telefone.

**QR de PIX.** Fica como está. O gateway emite e o checkout mostra. Gerar do nosso lado
seria recriar um artefato que já vem assinado pela instituição de pagamento.

## Decisões

### D-QR-1 · O ingresso ganha um código legível ao lado do token opaco ⇒ RN-396

São dois artefatos com funções diferentes, e é por isso que são dois.

| | `qrToken` | código identificador |
|---|---|---|
| Para que serve | provar quem é, no balcão | dizer qual é, em conversa e em tabela |
| Formato | opaco, assinado, longo | curto, legível, sem ambiguidade visual |
| Onde aparece | dentro do QR e no app | tabela do organizador, e-mail, ingresso impresso |
| Vale como prova? | sim | **não** |

O código **nunca** substitui o token na validação. Ele é chave de busca e de conferência
humana. Confundir os dois transformaria um código de seis caracteres ditado ao telefone em
credencial de entrada, que é exatamente o buraco que a assinatura do token existe para
fechar.

Alfabeto sem `0`, `O`, `1`, `I` e `L`, porque o código vai ser lido em voz alta e digitado
por gente cansada às seis da manhã. Unicidade garantida por evento, não global: o
organizador convive com um evento por vez no balcão.

### D-QR-2 · O organizador vê o código na tabela e abre o QR quando precisa ⇒ RN-397

A tabela de inscritos ganha o código como coluna. O QR **não** vai para a tabela: quatrocentas
imagens numa lista é peso sem uso. Abrir o QR é ação por linha, sob demanda.

### D-QR-3 · O e-mail de compra carrega QR e código, e degrada para o código ⇒ RN-398

Amplia a RN-219, que já manda um e-mail ao responsável listando os inscritos do pedido. O
delta é o conteúdo: cada inscrito entra com **seu QR e seu código**.

A decisão que importa é a de degradação. Cliente de e-mail que bloqueia imagem remota é
regra, não exceção, e um ingresso que depende da imagem carregar chega quebrado na véspera
da prova. Então o **código vai como texto**, sempre, ao lado do QR e do link para o
ingresso. Se a imagem não carregar, o atleta ainda tem o que dizer no balcão.

A idempotência é a que já existe (RN-219, subcoleção de notificações). Reprocessar o
webhook não reenvia.

### D-QR-4 · "Entrega" vira "credenciamento" no que a pessoa lê ⇒ RN-399

A mecânica não muda: RN-205 (retirar kit equivale a check-in), RN-221 (QR identifica, não
é status concorrente) e RN-222 (dois carimbos distintos) ficam intactas.

A virada separa duas camadas, e a separação é a decisão:

**Muda agora, porque é vocabulário.** Rótulo do SubNav do evento, títulos de tela, textos
do balcão e dos estados, mensagens de confirmação, colunas de lista, copy de e-mail, e o
nome da aba nos épicos e nos boards. A rota `/eventos/:slug/entrega` também vira
`/credenciamento`, e o custo disso já está pago pela máquina que existe: a RN-234 obriga
redirecionamento garantido para toda rota antiga, com teste orientado a tabela e guarda
anti-laço.

**Não muda agora, porque é identificador.** O campo persistido `kitEntregueEm`, com 75
ocorrências no código, e o id da área de permissão `entrega`, usado em
`RequirePapel area="entrega"` e na matriz de papéis testada. Renomear campo gravado é
migração de dado, não troca de palavra; renomear área de permissão mexe numa matriz de
papéis que hoje já carrega um teste vermelho conhecido na lista de dívida técnica. O dono
pediu nomenclatura, e nomenclatura não deve virar migração.

Se um dia o alinhamento de identificador for desejado, ele volta como card próprio, com o
custo declarado, e não de carona numa virada de rótulo.
