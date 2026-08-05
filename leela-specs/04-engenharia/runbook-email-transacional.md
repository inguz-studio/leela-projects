---
tags: [leela, email, brevo, incidente, runbook, observabilidade]
atualizado: 2026-08-05
trace: leela-pixreal-diag-20260804
---

# Leela · runbook: e-mail transacional falhou

Este documento existe por causa de um caso real. Em 04/08 o dono pagou o primeiro PIX de verdade, o backend entregou tudo em dez segundos e nenhum dos dois e-mails do pedido chegou nele. A causa foi uma trava de IPs autorizados na conta Brevo, que devolvia 401 antes mesmo de aceitar a mensagem. O que faltou não foi conserto, foi aviso: a falha existia só como duas linhas de log no meio de milhares.

O runbook cobre o alerta, o diagnóstico e o reenvio. Ele não cobre a decisão de qual ferramenta de alerta usar, que é do CTO humano.

## Como a falha aparece

Toda falha de envio transacional grava um log de erro com estes campos:

| Campo | Valor |
|---|---|
| `alerta` | `email_transacional_falhou` |
| `severidade` | `critico` |
| `canal` | `email` |
| `tipo` | `ingressos`, `conta_sem_friccao`, `reenvio_ingressos` ou `reenvio_conta` |
| `pedidoId`, `eventoId` | identificadores do caso |
| `err` | mensagem do provedor, truncada em 200 caracteres |

Os nomes dos eventos continuam os de sempre: `email_ingressos_falhou`, `conta_sem_friccao_email_falhou`, `reenvio_ingresso_falhou`, `reenvio_conta_falhou`. Quem já consultava por nome continua achando. A política de alerta, quando existir, casa o **campo** `alerta`, nunca a mensagem, porque nome de evento muda e campo estruturado não.

O e-mail nunca carrega PII para o log. Endereço e nome do comprador ficam fora, por decisão de LGPD que vale em todo o repositório.

## O gancho de alerta, e por que ele está desligado

A instrumentação está pronta e a política não. Criar métrica baseada em log, canal de notificação e destino de plantão é custo de infraestrutura recorrente, e essa decisão não é da engenharia de aplicação. Enquanto ela não vem, a evidência não se perde: além do log, o estado fica gravado no próprio pedido.

Quando a política for criada, o filtro é este:

```
jsonPayload.alerta="email_transacional_falhou"
```

## Onde olhar sem depender de log

O pedido carrega o desfecho dos dois e-mails.

| Campo | O que conta |
|---|---|
| `pedidos/{id}.emailIngressos.status` | `enviado`, `falha_envio`, `pendente_chave`, `ja_enviado` |
| `pedidos/{id}.emailIngressos.falhas` | quantas recusas o pedido acumulou |
| `pedidos/{id}.contaSemFriccao.emailStatus` | `enviado`, `falha_envio`, `pendente_chave`, `nao_aplicavel` |

A varredura de quem pagou e não recebeu é uma consulta de igualdade, sem índice composto:

```
pedidos where emailIngressos.status == "falha_envio"
```

`pendente_chave` quer dizer outra coisa e não deve ser confundido com falha: significa que o ambiente subiu sem `BREVO_API_KEY` e nada foi tentado. É o fail-closed da RN-137, e o conserto é o binding do secret, não o reenvio.

## O que fazer, na ordem

**1. Separe o que quebrou.** Se o `err` traz 401, o problema é credencial ou trava de IP na conta do provedor, e nenhum reenvio vai passar enquanto ele estiver de pé. Se traz 5xx ou timeout, o provedor teve indisponibilidade e o reenvio provavelmente basta.

**2. Prove que o canal voltou antes de reenviar.** Um `GET https://api.brevo.com/v3/account` com a chave de produção responde 200 quando a conta aceita a origem. Enquanto ele responder 401 com "unrecognised IP address", a trava segue ativa. Cloud Functions de primeira geração têm IP de saída dinâmico, então lista de IPs autorizados e Functions não convivem: ou a trava sai, ou o egress vira fixo com conector de VPC e Cloud NAT. A segunda opção custa dinheiro e é decisão do CTO humano.

**3. Confira se há ingresso para reenviar.** Se `ingressosPendentes/{pedidoId}` existir com `resolvido: false`, a emissão ficou incompleta. Não force o reenvio: a varredura de quinze minutos emite o que falta e fecha o e-mail sozinha. O reenvio recusa esse caso de propósito, com `ingresso_incompleto`, para não entregar uma lista pela metade que condenaria quem ficou de fora.

**4. Reenvie.** O callable `reenviarEmailsDoPedido` é a única porta, e só `platform_admin` passa por ela. Entrada:

```json
{
  "pedidoId": "ped-...",
  "reenvioId": "reenvio-2026-08-05-001",
  "alvos": ["ingresso", "conta"],
  "forcar": false
}
```

O `reenvioId` é a chave da operação e é obrigatório. Repetir a chamada com a mesma chave devolve o desfecho gravado sem enviar nada, que é o comportamento certo para um retry de timeout. Gere uma chave nova só quando o reenvio for mesmo novo. Um segundo reenvio para o mesmo pedido dentro de dez minutos é recusado; se a intenção for essa, passe `forcar: true` e o registro guarda que foi forçado.

**5. Confira o desfecho.** A resposta traz o status por alvo. O extrato completo fica em `reenviosEmail/{pedidoId}__{reenvioId}`, e a trilha de quem disparou fica em `auditoriaAcessos` com `tipo: "reenvio_emails_pedido"`. Nenhuma das duas coleções é legível por cliente.

## O que o reenvio não faz

Ele não emite ingresso. Entrega o `qrToken` e o `codigoIngresso` que já existem, e essa escolha é deliberada: reassinar o token depois de uma rotação de chave produziria um QR diferente do que já está no celular da pessoa, e o balcão recusaria o ingresso por divergência no dia da prova. O link do e-mail é amarrado ao token, então reemitir também mataria o link antigo.

Ele também não avisa "sua conta foi criada" para quem já tinha conta antes da compra. Esse aviso só faz sentido para conta recém-nascida; fora disso é mentira, e mentira com link de senha dentro parece phishing.

## Quando escalar

Suba para o CTO humano quando o 401 persistir depois de a trava de IPs sair, quando a solução exigir egress fixo, ou quando o mesmo pedido acumular mais de três falhas de reenvio. Três recusas seguidas com o canal comprovadamente no ar não são azar do provedor; são defeito nosso.

## Onde isto está no código

| Peça | Arquivo |
|---|---|
| Formato do incidente | `functions/src/email/incidenteEmail.ts` |
| Carimbo do desfecho no pedido | `functions/src/email/enviarIngressos.ts` |
| Reenvio administrativo | `functions/src/checkout/reenviarEmailsPedido.ts` |
| Rede de segurança da emissão | `functions/src/eventos/varrerIngressosOrfaos.ts` |
| Trilha de acesso | `functions/src/shared/auditoriaAcessos.ts` |

O catálogo de e-mails, com os oito gatilhos e o que cada um promete, está em [[catalogo-de-emails]]. O diagnóstico que originou este runbook está em `.nirvana/outputs/leela-pixreal-diag-20260804/DIAG-PIXREAL-REPORT.md`.
