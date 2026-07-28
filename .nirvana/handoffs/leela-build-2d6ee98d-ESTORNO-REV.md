# Handoff · Lane ESTORNO-REV (review antagonista) · trace leela-build-2d6ee98d

Employee `sf-cto` (software-forge), contexto FRESCO. Alvo: os 8 commits da lane
ESTORNO-ADMIN (`1201044` → `2a39a7e`, RN-370..380). Emulador exclusivo via
`emulators:exec` (8080/9099/5001); preview do dono (5273/8180/3000) intocado;
sem navegador, sem rede real, SEM push.

## Placar por vetor

| # | Vetor | Veredito | Prova |
|---|---|---|---|
| 1 | Fan-out da fila admin + Rules | **RESSALVA** | Rules provadas (`52671ee`, 36/36); teto de página escalado |
| 2 | `parseReembolso` no barrel | **OK** | julgamento (função pura sobre tipo já público) |
| 3 | Contrato `retardatario_pos_cancelamento` | **OK** | zero consumidor do string antigo fora de teste/spec |
| 4 | Corridas (a: retardatário×refund, b: 2 retardatários) | **OK** | 2 provas novas em `estornoRev.review.test.ts` |
| 5 | `divergencia_valor` no órfão | **OK** (era lacuna) | prova nova escrita nesta lane |
| 6 | Operador ansioso | **DEFEITO → CORRIGIDO** | `8f82588` (vermelho 3/3 → verde) |
| 7 | Bordas RN-373/374 | **OK** + 2 ressalvas | suíte pura já cobre limite exato/fuso |
| 8 | Zero asserção removida (pixArbitragem) | **OK** | auditoria linha a linha do diff do T5 |
| — | Casamento do ledger no webhook | **DEFEITO → CORRIGIDO** | `0149813` (vermelho → verde) |

## Falsificação dos guards centrais (sem commitar a remoção)

| Guard neutralizado | Suíte mordeu? | Detalhe |
|---|---|---|
| `carimbarEnvio` (carimbo ANTES do POST, RN-370) | SIM — 3/71 vermelhos | mas os 3 caem em `tentativasEnvio`, não em contagem de POST: a suíte da lane só provava o caso SEQUENCIAL. Gap fechado com a prova de concorrência real. |
| `carimboEstornoVivo` (nunca re-enviar, RN-371) | SIM — 5/71 vermelhos | inclui "SEGUNDA chamada NÃO emite segundo POST". O órfão sobreviveu por defesa em profundidade (`podeEnviarRefund` segura sozinho). |

Ambas as neutralizações foram revertidas por `git checkout` antes de qualquer
commit (verificado: `git status` limpo no arquivo).

## Fixes (vermelho → verde)

1. `0149813` — `confirmarEstornoPorWebhook` fechava o carimbo vivo de OUTRO
   inscrito quando a entrega trazia o refundId de um estorno JÁ aprovado
   (pedido de grupo: gateway devolve 1×, livro baixa 2×). Filtro de candidatos
   por refundId. Prova: `estornoRev.review.test.ts` (+5 casos).
2. `8f82588` — a fila admin mostrava toast de erro SEM descrição (leitura de
   `acoes.error` do render anterior) e, quando mostrava, trocava a frase da
   RN-371 pelo texto genérico de plataforma. `ultimoErro()` + `mensagemDaRecusa`.
   Prova: `estornosAdminErro.test.tsx` (3 casos, 3/3 vermelhos antes).
3. `52671ee` — o fan-out da fila admin não tinha prova de Rules por LISTA.
   4 provas novas com papel real.

## Gates literais

- functions `tsc --noEmit` 0 · `eslint --max-warnings 0` 0
- Emulador (8080/9099/5001), corrida consolidada de 13 arquivos: **201/201** —
  estornoRev.review 5 · estornoLedger 15 · estornoAssincrono 21 · estornoOrfao 5
  · estornoAdmin 17 · devolucaoEstorno 13 · vendasRules 36 · pixArbitragem
  (integration + ataque) 44 · estornarInscricao.e2e.review 10 · webhookAsaas ·
  checkoutFoundation · politicaVendasRules
- painel: `tsc --noEmit` 0 · eslint (rota estornos) 0 · vitest 7 arquivos
  **83/83** (estornos 11 = 8 + 3 novos · sidebar 34 · financeiro/ReembolsosView)

## Escalado sem fix (decisão do maestro/dono)

- **E-1 · Teto silencioso da fila admin**: `listTenants` (100, mais recentes)
  × `listarEventosDoTenant` (50, sem ordenação) — estorno de tenant #101+ ou de
  evento #51+ NUNCA aparece na fila, sem aviso.
- **E-2 · Fan-out sem isolamento**: `Promise.all` puro — uma leitura que falhe
  derruba a fila inteira; `criadoEm` corrompido estoura no `sort`.
- **E-3 · `valorSolicitado` na coluna "Valor"** = face + taxa SEMPRE, mesmo
  quando a política reterá a taxa (RN-374). O admin aprova vendo mais do que o
  comprador receberá.
- **E-4 · Leitura velha de erro em outras telas de plataforma**:
  `RepassesAdminRoute` e `PlanosRoute` repetem o padrão corrigido em `8f82588`.
- **E-5 · Órfão devolve a taxa sempre** (refund TOTAL), fora da régua RN-374 —
  correto (não houve serviço), mas não está escrito em RN-379/380.

## Veredito

**APROVADA COM RESSALVAS** — ver report.
