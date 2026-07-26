# Handoff vivo · Lane S1209-PIXBE · trace leela-build-2d6ee98d

- **Employee:** sf-backend-lead (software-forge) · rota opus xhigh
- **Repo:** `C:\dev\LEELA` · branch `main` · base `1ec466a` → topo `d545aa5`
- **Origem:** itens ESCALADOS pela review antagonista S1209-REV (`outputs/leela-build-2d6ee98d/S1209-REV-REPORT.md`)
- **Território:** `functions/` · `packages/core` · `packages/api-client` · `firestore.rules` (só comentário) · `apps/landing` em T4/T5. `packages/design-system` NÃO tocado.
- **Emulator:** exclusivo desta lane. `npm run build` antes de todo `emulators:exec`.

## Estado

LANE CONCLUÍDA (T1–T5). Falta a review ANTAGONISTA em contexto fresco — não me auto-aprovo.

## Placar

| Task | Estado | Commit | O que entrou |
|---|---|---|---|
| T1 relógio do servidor | OK | `c6e6712` | `servidorAgoraMillis` no resultado de `createInscricaoCharge` (+ replay/leitor do pedido pendente) e espelho no api-client |
| T2 trava de 2ª cobrança | OK | `33d4f08` | recusa server-side transacional via sentinela `cobrancasPixAtivas/{uid}__{evento}__{hash do carrinho}` + erro tipado `pix_pendente_ativo` |
| T3 cancelamento gateway-primeiro | OK | `df25872` | `PaymentProvider.cancelCharge` (Mock + Asaas `DELETE /payments/{id}`) e `expirarPixPendente` reordenado com fail-safe |
| T4 higiene da ponte | OK | `d545aa5` | raiz do `@leela/api-client` re-exporta `expirarPixPendente`; subpath-bridge removido do tsconfig e do vitest da landing |
| T5 tela consome o relógio | OK | `d545aa5` | `desvioRelogioMs` medido na resposta da cobrança ancora a contagem do PIX |

T4 e T5 vieram no MESMO commit de propósito: os dois mexem em `CheckoutFlow.tsx` (T4 troca o import, T5 acrescenta o desvio) e separá-los deixaria um commit que não compila.

## Gates (exit code literal)

| Gate | Comando | Baseline | Final |
|---|---|---|---|
| suíte functions | de `functions/`: `npm run build && npx firebase-tools@13 emulators:exec --project demo-leela "npx vitest run"` | 164 arq / 2935 | **exit 0 · 165 arq verdes / 2960 testes verdes · 0 falhas** |
| tsc functions | `npx tsc --noEmit` | 0 | **exit 0** |
| tsc core | `npx tsc --noEmit` | 0 | **exit 0** |
| tsc api-client | `npx tsc --noEmit` | 0 | **exit 0** |
| tsc landing | `npx tsc --noEmit` | 0 | **exit 0** |
| eslint functions | `npx eslint src --max-warnings 0` | 0 | **exit 0** |
| eslint landing | `npx eslint app lib --max-warnings 0` | 0 | **exit 0** |
| suíte landing | de `apps/landing`: `npx vitest run` | 14 arq / 119 | **exit 0 · 14 arq / 124** |
| next build | `npx next build` | exit 0 | **exit 0** |
| marca | `node scripts/verify-brand-fonts.mjs` | PASS | **PASS** (81 arquivos) |

Nenhum navegador foi aberto.

## Escalados (decisão do Vitor — nada improvisado aqui)

1. **Pagamento que entra DEPOIS do cancelamento (premissa CK2-4).** Gateway-primeiro estreita muito a janela (cobrança recebida não é deletável ⇒ o pedido nem morre), mas sobra o pagamento em voo no instante do DELETE: ele chega ao webhook, cai em `ignorado_estado_final`, nada de dinheiro se move sozinho — e o dinheiro saiu do comprador. Opções: (a) estorno automático, (b) fila de reconciliação manual, (c) ressuscitar a inscrição. É política de produto.
2. **Cartão sobre PIX vivo.** T2 recusa a segunda cobrança PIX. Abrir CARTÃO do mesmo carrinho com o PIX ainda no prazo continua passando (teste fixa o comportamento). Se pagar os dois, cobra dois. Fechar exige decidir o que fazer com quem quer trocar de meio de pagamento.
3. **Escopo da trava.** Escolhi (comprador, evento, CARRINHO). (comprador, evento) barraria quem volta para inscrever outra pessoa com o próprio PIX no prazo — segunda compra, não cobrança duplicada. Confirmar a intenção de produto.
4. **Asaas `DELETE /payments/{id}` não validado contra conta real.** Shape `{deleted: true}` veio da doc; a suíte cobre com HTTP mockado (rede real é proibida nela). Validar em sandbox junto da ativação da chave.

## Parada limpa

Não houve emergência. Árvore limpa, tudo commitado e pushado.
