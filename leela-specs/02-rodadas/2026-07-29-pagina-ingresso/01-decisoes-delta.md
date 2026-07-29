---
tags: [leela, decisoes, rodada, produto, ingresso, qr, landing, email, privacidade]
aliases: ["Rodada pagina-ingresso 2026-07-29", "SPEC-INGPAGE", "DEC-ING-0729"]
trace: leela-build-2d6ee98d
lote: SPEC-INGPAGE
data: 2026-07-29
fonte: item 55 do painel de decisoes + vetor 5 da review INGQR-REV
---

# Delta da página própria do ingresso

## De onde veio

Item 55 do painel, verbatim do que está escrito lá:

> *"o QR do e-mail não aparece no Gmail nem no Outlook. O QR vai embutido no corpo por
> privacidade (nada de URL pública com a credencial), mas Gmail e Outlook não renderizam
> imagem embutida assim, e anexo inline é inviável no provider atual — provado pela review.
> O código em texto carrega o ingresso nesses clientes. Default proposto: construir a página
> própria do ingresso (que também dá destino ao 'link do ingresso' do e-mail e desbloqueia o
> PDF); vira o primeiro card depois do E08 na fila."*

A recomendação (b) do vetor 5 da INGQR-REV é a mesma, com a razão técnica embaixo: o port
`EmailProvider` não tem superfície de anexo, o `POST /v3/smtp/email` do Brevo não expõe
`Content-ID`, e nada disso é verificável sem rede. Anexo inline morreu por prova, não por
gosto.

Esta página resolve três coisas de uma vez: o QR que não aparece, o "link do ingresso" da
RN-398 que hoje aponta para a página do evento por falta de destino, e a superfície que o
`S1206-T7` (código no PDF) esperava.

## Inventário antes de especificar

**O que já existe e não se reescreve.** A emissão grava `qrToken` assinado, `codigoIngresso`
e `ingressoEmitidoEm` por inscrito (RN-396/218), com unicidade por reserva de chave primária
e idempotência provada sob contenção real. O keyring HMAC com rotação vive em
`functions/src/eventos/qrToken.ts` e a rotação foi provada ponta a ponta: token emitido não
é re-assinado, e a virada de kid não mata ingresso emitido. `gerarQrDataUrl` renderiza QR no
servidor. A landing tem leitor público server-side por Admin SDK com o gate de autorização no
código (`leitor.ts`, desde a S1200-T2) e base pública por env (`baseUrl()` em `seo.ts`). A
ADR-017 deu ao DS duas portas Radix-free para a superfície pública. O e-mail da compra é um
por pedido, ao responsável, idempotente pela RN-219, com o código sempre em texto.

**O que não existe.** Nenhuma superfície onde o comprador veja o próprio ingresso sem
login. Nenhum destino para o "link do ingresso". Nenhum gerador de PDF (varredura da
INGRESSO-QR: zero `pdfkit|jspdf|puppeteer|pdf-lib` no repo).

**O que o inventário achou de errado, e entra na spec.**

1. `EVENTO_URL_BASE = 'https://beh.ro'` está hardcoded em
   `functions/src/eventos/publicarEvento.ts`, e `beh.ro` é o domínio dos mocks Be Hero. O
   e-mail da compra já manda hoje um link para domínio de terceiro. A landing usa outra base
   (`NEXT_PUBLIC_LEELA_URL`, `seo.ts`). São duas bases divergentes no mesmo produto.
2. Não existe lista de slug reservado. `slug.ts` garante unicidade entre eventos e mais
   nada. Um evento chamado "Convite" já sombrearia a rota `/convite` que existe hoje.
3. O `S1206-T7` não está bloqueado por código: está bloqueado por falta de superfície.

## Decisões

### D-ING-1 · A página vive na landing pública ⇒ RN-418

Rota `/ingresso/{token}` em `apps/landing`, Server Component, sem login.

As três alternativas e por que morrem:

- **Painel Vite.** Exige sessão de organizador. Quem recebe o e-mail é o comprador, que
  frequentemente nem é inscrito (ADR-011: o pagador pode ter comprado para a família). Além
  disso o painel é um bundle único de 2,18 MB medido pela INGQR-REV. Errado no público e
  caro na entrega.
- **Function HTTPS servindo HTML.** Nasce sem design system, sem marca e sem as duas portas
  Radix-free que a ADR-017 abriu. Vira superfície de deploy própria só para uma página.
  Fica registrada como plano B operacional se a landing não estiver no ar quando o e-mail
  entrar em produção, não como arquitetura.
- **Área logada do atleta (E13).** Exige conta, e a decisão de arquitetura do PWA nem foi
  ratificada. Ancorar a página ali travaria o item 55 atrás de um épico inteiro.

**Consequência honesta:** a landing não está deployada no preview hoje (só o painel está no
ar). O dono só percorre a página quando o preview da landing subir, o que já tem receita
pronta na DEPLOY-PREVIEW. Isso é sequência de operação, não razão de arquitetura.

### D-ING-2 · O link nunca carrega o `qrToken` ⇒ RN-419

O `qrToken` é a credencial de presença: `classificarCheckinQr` compara byte a byte com o
que está gravado no doc, então **quem lê o token entra no evento**. Numa URL ele vaza pelo
histórico do navegador, pelo cabeçalho `Referer`, pelo log de qualquer proxy, pela barra de
endereço numa tela compartilhada e pelo print que a pessoa manda no grupo. Reusar o
`qrToken` como identificador da página seria trocar a credencial de lugar, não protegê-la.

O link carrega um token próprio, `LLIP1`, irmão do `LLQR1`:

```
LLIP1.<kid>.<payloadB64url>.<assinatura>
```

Mesmo payload mínimo (`{i,e,t}`, zero PII), mesmo alfabeto base64url, mesmo HMAC-SHA256,
mesmo keyring. **A separação de domínio é a constante de versão:** `parseQrToken` recusa
qualquer coisa que não comece em `LLQR1`, e o verificador do link recusa qualquer coisa que
não comece em `LLIP1`. Um não vira o outro em nenhuma direção, e um teste guarda que as
duas constantes nunca sejam iguais.

Reusar o ring em vez de criar um segredo novo é decisão de operação: dois segredos são duas
rotações, dois lugares para errar e duas chances de alguém deixar um deles para trás.

### D-ING-3 · A chave de assinatura não desce para a landing ⇒ RN-419

A página não verifica o token sozinha. Ela chama uma Function
(`ingressoPorLink`) que verifica, lê o inscrito e devolve a projeção pronta, com o QR já
renderizado como imagem por `gerarQrDataUrl`.

O argumento decisivo não é a leitura do banco. A landing já tem Admin SDK e já poderia ler
qualquer `qrToken` do Firestore. O argumento é a **chave**. Com `QR_TOKEN_KEYS` dentro do
runtime do Next, uma falha em qualquer dependência de uma aplicação grande, que processa
slug de URL e imagem de terceiro e que é redeployada a cada mexida de marketing, passa a
permitir **forjar QR de check-in offline, para qualquer evento, de qualquer tenant, para
sempre, sem tocar no banco**. Ler o banco é barulhento e deixa rastro; cunhar token é
silencioso. Essa assimetria paga o salto de rede.

De quebra, o contrato nasce reusável: quando o "meus ingressos" logado do E13 existir, ele
consome a mesma projeção em vez de reimplementar a leitura.

**Custo declarado:** um salto a mais no SSR, com risco de cold start da Function (a ordem de
1 a 3 segundos numa instância fria). A página trata a falha do salto como estado, nunca como
500. Custo financeiro: uma invocação de Function e uma leitura de documento por abertura de
ingresso, o que em qualquer volume de evento brasileiro fica no fundo do free tier.

### D-ING-4 · O link é amarrado ao `qrToken` vigente ⇒ RN-420

A assinatura do link cobre `LLIP1.<kid>.<payload>` **mais o `qrToken` gravado no inscrito**.
A verificação recomputa o HMAC usando o token que está no doc, numa leitura que a página faz
de qualquer forma.

O que isso compra de graça: **re-emitir o ingresso invalida o link antigo**, que é
exatamente a semântica que o balcão já tem (`qr_divergente` quando o token apresentado não
bate com o gravado). Um modelo mental só de revogação por inscrito no produto inteiro.

O que isso NÃO é: rotação de chave. A rotação continua não matando nada, porque o `kid`
viaja dentro do link e o ring guarda os kids antigos. As duas coisas são fáceis de confundir
no código, por isso são ⚔ separados na review.

### D-ING-5 · Sem expiração por tempo; o que expira é o estado ⇒ RN-420

Nada de `exp` no token. O ingresso é o comprovante de uma compra e a pessoa abre o link na
fila da largada, meses depois, com a rede ruim. Um prazo dentro do token cria a classe de
defeito "ingresso vencido no dia do evento" e obriga uma máquina de reemissão que não existe.

O que muda com o tempo é o estado do inscrito, e a página lê o estado a cada abertura:
cancelado, estornado, credenciado, evento encerrado. A alavanca de revogação em massa
continua sendo tirar o kid do ring; a de revogação individual é re-emitir o ingresso (D-ING-4).

### D-ING-6 · A matriz de estados é lei da página ⇒ RN-421

| Estado do inscrito | O que a página mostra |
|---|---|
| `confirmado`, com `qrToken`, sem `checkinEm` | QR + código + dados mínimos. É o caminho feliz |
| `confirmado`, com `checkinEm` | O mesmo, com o estado de credenciamento em destaque e o carimbo. O QR CONTINUA visível |
| `confirmado`, sem `qrToken` | "Estamos emitindo seu ingresso" + código quando houver. Sem QR quebrado. É a face da pendência da RN-382, que a varredura de 15 minutos cura |
| `pendente` | Sem QR. Pagamento ainda não confirmado |
| `cancelado` ou `estornado` | **Sem QR.** Texto claro do que aconteceu; o código fica só para atendimento |
| Evento encerrado | Abre como histórico, com aviso, sem QR |
| Token inválido, inscrito inexistente, evento inexistente | Uma resposta só, genérica. Sem oráculo |

As duas linhas que são decisão de produto, não de engenharia:

- **Estornado e cancelado não renderizam QR.** Renderizar convidaria a pessoa a viajar até o
  evento e ser barrada na fila, às seis da manhã. A tranca real continua no servidor
  (`inscrito_cancelado`); a página só não mente.
- **Credenciado mantém o QR.** Esconder depois do check-in não protege nada (o servidor já
  responde `qr_ja_utilizado`) e tira da pessoa a conferência de que aquele é o ingresso dela.

### D-ING-7 · Dado mínimo e três cabeçalhos ⇒ RN-422

A página mostra nome do titular, evento com data e local, modalidade, kit com tamanho quando
houver, código e estado. **Não mostra** CPF, telefone, e-mail, data de nascimento, endereço,
contato de emergência nem resposta de formulário. O link chega por e-mail e é encaminhável;
tudo que estiver na página é dado que vaza junto com o encaminhamento.

Três cabeçalhos que não são detalhe de implementação e por isso estão na regra:
`noindex, nofollow` (senão o buscador indexa ingresso), `Referrer-Policy: no-referrer`
(senão o token viaja no `Referer` de todo link de saída) e `Cache-Control: no-store` (o
token está na URL; CDN e proxy não podem guardar a resposta).

**Escrito porque tem de ficar escrito:** encaminhar o link é encaminhar o ingresso. É a
mesma propriedade do e-mail que já existe. Transferência formal de titularidade é outra
coisa e tem casa própria (E13-S1316).

### D-ING-8 · Uma base pública só, e o e-mail degrada em vez de mentir ⇒ RN-423

O `EVENTO_URL_BASE` hardcoded sai e a base passa a vir do ambiente, com o mesmo valor que a
landing já usa. O item 12 (domínio) continua sendo decisão do dono; o que muda é que a
máquina para de ter um domínio de terceiro cravado no código.

Sem base configurada, o e-mail sai **sem link**, com o código em texto. Um link que dá 404
ou que leva ao site de outra empresa é pior que link nenhum: gasta a confiança de quem
acabou de pagar.

### D-ING-9 · O PDF é a própria página impressa ⇒ RN-424

`/ingresso/{token}/imprimir`: mesma leitura, folha A4, CSS de impressão, sem navegação. O
navegador gera o PDF, que é uma coisa que todo navegador faz há vinte anos.

A alternativa é um gerador server-side. Puppeteer arrasta um Chromium para dentro da
Function, o que significa memória na casa do gigabyte, cold start na casa dos dez segundos e
uma imagem a mais para manter. `pdfkit` ou `pdf-lib` são mais leves, mas obrigam a
redesenhar o layout do ingresso numa segunda linguagem de layout, que passa a divergir da
página no primeiro ajuste de marca. Nenhum dos dois se paga para um artefato que o botão de
imprimir já produz.

Com isso o **`S1206-T7` sai do gelo**: o código identificador aparece no PDF porque aparece
na página, e a página é o PDF. PDF anexado ao e-mail, gerado no servidor, continua fora e
continua sendo lane própria se o dono pedir.

### D-ING-10 · A página exibe, e só ⇒ RN-418

Fronteiras escritas para não serem redescobertas:

- **Não credencia.** Abrir a página não escreve nada. O credenciamento acontece no balcão,
  pelo organizador, com o scanner, e o estado mora no servidor (RN-399, RN-221/222 intactas).
- **Não emite.** Ingresso ausente é estado exibido, não gatilho. Quem cura é a RN-382.
- **Não substitui o app.** Quando o "meus ingressos" logado existir (E13), ele consome a
  mesma projeção; o link tokenizado continua sendo o caminho sem login, porque o pagador que
  comprou para a família não é inscrito de ninguém.

## Premissas vetáveis pelo dono

Ordenadas por peso: as primeiras mudam arquitetura se caírem.

| # | Premissa | Se o dono vetar | RN |
|---|---|---|---|
| P1 | A página vive na landing pública (Next), sem login | Muda a superfície inteira e a fila de código | RN-418 |
| P2 | O link carrega token próprio `LLIP1`, nunca o `qrToken`, e a chave de assinatura não desce para a landing | Volta a discussão de pôr credencial em URL; recusaria a spec inteira | RN-419 |
| P4 | O link é amarrado ao `qrToken` vigente (re-emitir revoga o link antigo) | Perde revogação por inscrito; sobra só a revogação em massa por rotação | RN-420 |
| P10 | O PDF é a página em versão imprimível; nenhum gerador server-side entra agora | Vira lane própria com dependência nova e custo operacional | RN-424 |
| P3 | Sem expiração por tempo no link | Precisa de máquina de reemissão que não existe | RN-420 |
| P5 | Ingresso estornado ou cancelado não mostra QR | Volta a mostrar, e alguém viaja para ser barrado na fila | RN-421 |
| P8 | Um link por INSCRITO no e-mail, não um link por pedido | Um link só para o pedido inteiro exigiria escolher o QR de quem | RN-423 |
| P9 | Sem base pública configurada, o e-mail sai sem link | Volta a mandar link quebrado ou para `beh.ro` | RN-423 |
| P7 | Dado mínimo na página (sem CPF, telefone, e-mail, nascimento, emergência, resposta de formulário) | Amplia o que vaza no encaminhamento do link | RN-422 |
| P6 | Ingresso já credenciado mantém o QR visível, com o estado em destaque | Esconde o QR depois do check-in | RN-421 |
| P11 | Evento encerrado: a página abre como histórico, com aviso, sem QR | Ou fecha de vez, ou mostra QR de evento que acabou | RN-421 |
| P12 | `ingresso` entra numa lista de slug reservado (junto de `convite` e das demais rotas estáticas) | Um evento com esse nome sombreia a rota | RN-418 |

## O que esta rodada NÃO decide

- O domínio público (item 12). Continua do dono; a spec só tira o hardcode do caminho.
- A tela da pendência esgotada da RN-382 no painel, que já é card próprio.
- O PDF anexado ao e-mail (server-side).
- A arquitetura do PWA do E13, que segue aguardando ratificação.
