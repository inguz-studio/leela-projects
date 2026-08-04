---
tags: [leela, email, brevo, gatilhos, validacao-externa]
atualizado: 2026-08-04
trace: leela-build-2d6ee98d
---

# Leela · catálogo de e-mails

O produto envia oito e-mails. Este documento responde, sem abrir código, o que dispara cada um, quem recebe, por onde sai, o que acontece quando o envio falha e onde se mexe para ajustar. Foi escrito para duas leituras: a do dono, que vai calibrar as mensagens ao longo do tempo, e a de quem valida o trabalho de fora e precisa saber o que está no ar de verdade.

Um aviso vale antes de qualquer tabela, porque muda a leitura de tudo o que vem depois.

> [!warning] O que está no repositório não é o que está em produção
> A identidade visual dos oito e-mails e o e-mail de redefinição de senha foram construídos na madrugada de 04/08 e **não foram deployados**. Em produção, os sete e-mails antigos ainda saem com a moldura anterior, e o de "esqueci minha senha" continua saindo pelo template genérico do Firebase, com remetente `noreply@leela-hub.firebaseapp.com`. O detalhe do que mudou está em [[12-identidade-email]]. Enquanto não houver deploy de functions, leia a coluna de estado deste catálogo, não a promessa.

## Os oito e-mails

| # | E-mail | O que dispara | Quem recebe | O que a pessoa faz ao receber |
|---|---|---|---|---|
| 1 | Ingressos da compra | pagamento confirmado e ingressos emitidos | quem pagou o pedido | guarda o QR e o código; abre o link do ingresso |
| 2 | Conta criada, defina sua senha | primeira compra confirmada de um e-mail sem conta | quem pagou, só quando a conta acabou de nascer | clica e define a senha |
| 3 | Convite de afiliado | organizador cadastra influenciador pessoa física sem conta | a pessoa convidada | aceita o convite pelo link |
| 4 | Convite de assessoria parceira | organizador cadastra assessoria cujo responsável não tem conta | o responsável pela assessoria | aceita o convite pelo link |
| 5 | Campanha do evento | organizador dispara, agendamento vence, ou automação de inscrição | quem pagou, um por endereço | lê; não há ação obrigatória |
| 6 | Repasse de comissão | repasse registrado pelo organizador | o afiliado | confere o valor contra o próprio extrato |
| 7 | Marco de comissão | uma venda atribuída cruza uma faixa de comissão | o afiliado | acompanha; não há ação |
| 8 | Redefinição de senha | pedido de "esqueci minha senha" | quem pediu, se a conta existir | clica e define a senha nova |

O e-mail 5 tem quatro gatilhos distintos, e vale destrinchar porque é o único assim: o organizador apertando enviar, o agendador de campanhas a cada cinco minutos, a gravação de um inscrito que passa a `confirmado`, e o agendador de automações que cuida de kit disponível, véspera e pós-evento.

O e-mail 1 tem uma rede de segurança. Além de sair junto da emissão, o agendador `varrerIngressosOrfaos` roda a cada quinze minutos procurando pedido pago que não virou ingresso completo. Emissão parcial não dispara o e-mail de propósito, para não gastar a chave de idempotência numa lista incompleta.

## Onde se mexe

| # | Template (render) | Quem chama | Etiqueta na Brevo |
|---|---|---|---|
| 1 | `email/templates.ts:358` | `eventos/emitirIngressos.ts:410` e `eventos/varrerIngressosOrfaos.ts:134` | `ingressos-compra` |
| 2 | `email/templates.ts:248` | `checkout/contaSemFriccao.ts:220` | `conta-sem-friccao` |
| 3 | `email/templates.ts:145` | `affiliation/salvarAfiliado.ts:470` | nenhuma |
| 4 | `email/templates.ts:195` | `assessorias/cadastrarAssessoria.ts:445` | `convite-assessoria` |
| 5 | `email/templates.ts:509` | `eventos/enviarCampanha.ts:360` | `campanha-evento` |
| 6 | `email/templates.ts:567` | `affiliation/avisoAfiliado.ts:249` | `aviso-repasse-comissao` |
| 7 | `email/templates.ts:624` | `affiliation/avisoAfiliado.ts:313` | `aviso-marco-comissao` |
| 8 | `email/templates.ts:682` | `auth/solicitarRedefinicaoSenha.ts:179` | `redefinir-senha` |

Todos os caminhos partem de `functions/src/`. A moldura compartilhada, com cabeçalho, logo, rodapé e paleta, vive em `functions/src/email/identidade.ts`; mexer nela muda os oito de uma vez. Não existe repositório de templates no banco: o catálogo é código, e toda mudança de texto ou de layout exige editar o arquivo e deployar.

Para ver os oito renderizados antes de mandar qualquer coisa para alguém:

```bash
npm --prefix functions run email:render
```

A saída cai em `.nirvana/outputs/leela-build-2d6ee98d/emails/`, com um `index.html` que percorre os oito e a versão em texto puro ao lado de cada um. O caminho é fixo no script e o `.gitignore` o exclui, então os arquivos são descartáveis por construção.

## O que se ajusta sem tocar em código

Ficam fora do código o endereço e o nome do remetente (`BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`), o endereço público que vira link nos e-mails (`LEELA_PUBLIC_URL`), a chave da Brevo e as chaves de assinatura do QR. Assunto e corpo de campanha são dado puro no Firestore, escritos pelo organizador na tela.

Tudo o mais é código: as linhas de assunto dos outros sete, a moldura, a paleta, o teto de dez QR por e-mail, os limites do fluxo de senha e a rota para onde o link de primeiro acesso leva depois que a pessoa define a senha.

## Por onde os e-mails saem

Os oito saem pela Brevo. O Firebase Auth só gera os links de ação; ele não envia nada por vontade da casa. A seleção do provedor é fail-closed em `functions/src/email/selectEmailProvider.ts`: sem chave devolve nulo e cada consumidor mantém o comportamento que já tinha; com chave e configuração inválida, lança. O que nunca acontece é envio pela metade em silêncio.

O canal esteve bloqueado até a madrugada de 04/08 por uma lista de IPs autorizados na conta Brevo, que recusava a chave com 401 em todos os endpoints. O dono desligou a lista às 00h20 e a verificação passou a devolver 200. O histórico da própria Brevo mostra entrega e clique reais em 27/07, então o canal funciona; o que faltava era a autorização.

## Quando o envio falha

Nenhum e-mail do produto tem retry nem fila de reprocessamento. A política é deliberada e vale para os oito: **no máximo uma vez**. Reenvio é decisão de quem opera, não repetição cega da máquina.

Sem chave configurada, os e-mails 1 e 6 não registram nada no log de comunicação, e a razão é sutil: registrar "enfileirado" para um envio que nunca existiu faria a própria idempotência suprimir a mensagem no dia em que a chave chegasse. O e-mail 2 carimba o desfecho no pedido. O 3 é o mais rígido de todos, porque recusa a operação inteira antes de começar quando não há provedor. O 5 simplesmente não faz nada e devolve zero.

Quando o envio é tentado e falha, o comportamento diverge por mensagem, e isso importa para quem for investigar uma reclamação. Só os e-mails 6 e 7 escrevem a falha no Firestore, com um marcador `falhou` no log de comunicação. Os outros seis registram apenas no log da nuvem. O caso mais traiçoeiro é o 5: o log de comunicação da campanha é escrito antes e independentemente do envio físico, então uma campanha aparece como entregue mesmo quando a Brevo recusou todos os endereços, e só um contador agregado no Cloud Logging conta a verdade.

## Estado de cada um

| # | Já saiu em produção? | Observação |
|---|---|---|
| 1 | não | nenhuma compra foi concluída em produção até 04/08 |
| 2 | não | depende da mesma compra |
| 3 | não verificado | caminho vivo, sem registro de envio real |
| 4 | não verificado | idem |
| 5 | não verificado | idem |
| 6 | não verificado | idem |
| 7 | não verificado | idem |
| 8 | sim, pelo Firebase | sai com o template genérico, não com o nosso |

A afirmação de que nada transacional havia saído vem do laudo INV-EMAIL-INGRESSO de 04/08. Ela foi feita quando `asaasWebhook` ainda não declarava a chave de assinatura do QR e a emissão morria antes do e-mail. Essa causa foi consertada e deployada às 00h47 de 04/08, em dezesseis functions nominais, o que inclui `asaasWebhook` e a rede de segurança `varrerIngressosOrfaos`. Desde então o caminho está aberto e ninguém completou uma compra real para atravessá-lo.

## Defeitos conhecidos neste catálogo

Cinco pontas ficam abertas, todas verificadas no código em 04/08. Nenhuma é decisão de produto: são consertos pequenos que esperam janela.

O e-mail 2 continua caindo na página hospedada do Firebase. A correção do link foi aplicada ao e-mail 8 e não ao 2, porque `checkout/contaSemFriccao.ts` estava sob outra lane naquela noite. É a primeira tela que um cliente novo vê, e é a que segue sem a marca. O conserto é um argumento na chamada, registrado em [[12-identidade-email]].

Os e-mails 3 e 4 montam o link de convite lendo `NEXT_PUBLIC_LEELA_URL`, que não existe no ambiente das functions. O que existe é `LEELA_PUBLIC_URL`. O default assumido é `http://localhost:3000`, e a validação aceita `http://`, então o convite sai em produção apontando para a máquina de quem clicou. Um módulo vizinho, `eventos/basePublica.ts`, já lê os dois nomes e serve de molde.

O e-mail 3 é o único dos oito sem etiqueta na Brevo, o que abre um buraco na análise de entrega.

O link do e-mail 8, quando ele subir, aponta para `https://leela-hub.web.app` por default. Esse endereço devolve a página "Site Not Found" do Firebase hoje, porque o painel nunca foi deployado ao canal de produção. Sem definir `LEELA_PAINEL_URL`, o e-mail chega com um link morto. O contexto está em [[estado-real]].

## Vizinhos

[[12-identidade-email]] tem o registro da noite em que a identidade entrou, com a tabela de contraste e as três decisões de desenho. [[estado-real]] diz o que está no ar. [[onboarding-externo]] é a porta de entrada de quem chega de fora.
