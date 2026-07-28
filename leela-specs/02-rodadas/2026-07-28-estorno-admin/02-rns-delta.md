---
tags: [leela, decisoes, rns, rodada, estorno, admin, retardatario]
trace: leela-build-2d6ee98d
lote: ESTORNO-ADMIN
data: 2026-07-28
---

# 02-rns-delta · RNs da lane ESTORNO-ADMIN (RN-370 a RN-380)

> **Numeração.** A faixa RN-348..353 pertencia ao E09-slim (repasse); a lane
> renumerou 1:1 para a faixa livre 370+ em `8ac2730` (só nomes, zero
> comportamento). A rodada SPECS-0728 (formbuilder) conferiu a não colisão e
> reservou **RN-381 a RN-384** como folga desta lane; ela própria usa 389+.
>
> **Fonte das decisões:** rodada DEC-0727D do dono (42–46) + item 27 da rodada
> anterior. **Consolidação nos épicos na mesma aterrissagem:** E09 (dono do
> dinheiro — bloco "Novas · ESTORNO-ADMIN" + modelo de dados), E04 (política:
> notas em RN-339/340), E12 (aceite do retardatário superado pelo T5).

## Novas

| RN | Regra | Épico | Decisão |
|---|---|---|---|
| **RN-370** | **Carimbo antes do POST.** O ledger `pagamentos/{id}/estornos/{inscritoId}` grava compromisso + carimbo `enviando` em transação COMMITADA antes do `POST /refund`. Function morrer ≠ efeito invisível. | E09 (dono) | 46 |
| **RN-371** | **Nunca re-enviar sobre carimbo vivo.** `enviando`/`solicitado`/`gateway_sem_resposta`/`divergencia_valor`/`rejeitado_gateway` bloqueiam novo POST da mesma chave; timeout = efeito possível = conferência manual. Mata o estorno duplo do ASAASTETO-REV §V4. | E09 (dono) | 46 |
| **RN-372** | **O webhook `PAYMENT_REFUNDED` é a autoridade.** Refund `pending` não aplica efeito local; a entrega fecha a saga (o ramo `refunded` corre antes da guarda de estado final). | E09 (dono) | 46 |
| **RN-373** | **Janela de arrependimento pelo relógio da compra.** 7 dias do art. 49 contados de `criadoEm` do pedido, relógio injetado (derivação pura). | E09 (dono) · E04 | 42 |
| **RN-374** | **Destino da taxa de serviço por rota.** Rota automática (dentro dos 7 dias) devolve `valorFinal + taxa repassada`; rota em análise devolve `valorFinal` e RETÉM a taxa. A tela do comprador diz o que volta. Reconcilia RN-181/347 (o código devolvia taxa SEMPRE — contradição L5). | E09 (dono) · E04 · E12 | 42 |
| **RN-375** | **A abertura é a porta única do estorno pelo painel.** Tudo entra por `requestRefund` (política roteia: automática dentro da regra; `em_analise` fora); o primitivo direto sai da tela. | E09 (dono) | 43 |
| **RN-376** | **Furar o corte de véspera.** Só `platform_admin`, só com `motivoOverride`; o furo fica NO DOC (`overrideCorte`/`motivoOverride`/`overridePor`/`corteHorasNoOverride`) e a fila denuncia a origem. Organizador com a flag = permission-denied. RN-402 (tenant suspenso) deixa de valer para a plataforma. | E09 (dono) · E04 (RN-339) | 44 |
| **RN-377** | **Cancelar sem estornar existe.** `cancelarInscricao`: transição auditada `confirmado|pendente → cancelado`, dinheiro FICA (cortesia/no-show/fraude). Admin cancela qualquer coisa; organizador só fora do corte. Kit/checkin/vaga como no estorno (kit volta ao aprovisionamento; vaga NÃO volta — RN-304). | E09 (dono) | 45 |
| **RN-378** | **Trilha do cancelamento.** `eventos/{id}/cancelamentos/{inscritoId}` com `trilha`(`organizador`\|`plataforma`), motivo, autor, `dinheiroDevolvido: false` — quem mandou fica no doc. | E09 (dono) | 45 |
| **RN-379** | **Estorno automático do retardatário.** Confirmação após cancelamento = efeito `retardatario_pos_cancelamento` + estorno TOTAL automático pela MESMA máquina (RN-370/371/372), ledger próprio `pagamentos/{id}/estornosOrfaos/total` (docId fixo, `amount` omitido no gateway). Caminho próprio porque o pagamento cancelado é terminal (L9). **Devolução INTEGRAL, taxa inclusa, FORA da régua da RN-374 — não houve serviço:** a inscrição já estava cancelada quando o dinheiro entrou, então reter taxa seria cobrar por nada. Frase acrescentada pela POLIMENTO-0728 (achado E-5: o código sempre fez assim, a regra não estava escrita). | E09 (dono) · E12 (S1209) | item 27 |
| **RN-380** | **Extrato e varredura do retardatário.** Detecção grava `estornosOrfaosPendentes/{pagamentoId}` na MESMA tx da entrega; cron de 15 min conta, alerta (`estornos_orfaos_pendentes`) e re-dispara com segurança; detecção nunca des-resolve extrato resolvido. O re-disparo devolve o MESMO valor integral da RN-379 — a régua do art. 49 não entra por esta porta. | E09 (dono) | item 27 |

## Ampliadas / reconciliadas (sem número novo)

- **RN-339 (E04):** ganha o ramo do furo (RN-376) — corte continua sendo a
  regra do organizador; a exceção é da plataforma, com trilha.
- **RN-340 (E04):** dentro da política = rota automática sem humano (decisão
  43); a fila em análise ganhou a superfície cross-tenant do admin
  (`/plataforma/estornos`).
- **`origem` do reembolso:** união vira `atleta|organizador|plataforma` — a
  trilha do operador é a origem do doc; parser do api-client preserva (o bug
  de coação foi pago no T4-frontend).
- **Aceite do retardatário em E12/S1209:** "ignorado por estado final" foi
  SUPERADO pelo T5 — ver nota no épico.

## Provas executáveis (emulador, gateway espião que conta POSTs)

`estornoLedger.test.ts` (15) · `estornoAssincrono.integration.test.ts` (21) ·
`estornoAdmin.integration.test.ts` (17) · `estornoOrfao.integration.test.ts`
(5) · `pixArbitragem.integration/.ataque` atualizados ao contrato novo ·
`estornarInscricao.e2e.review.test.ts` (10, Auth real 9099) ·
`estornosAdmin.test.tsx` (8, painel).
