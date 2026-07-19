# Handoff — leela-build-2d6ee98d · lote COMISSIONAMENTO-F2

employee: sf-backend-lead (software-forge) · modelo: Fable · 2026-07-18

## Estado por task

- [x] T1 `33628bd` — core: modelo de comissão (percentual/valor_fixo cent-exato, saldo, validação, parse) + 17 unit verdes.
- [x] T2 `a1771ba` — acúmulo na confirmação (webhook, mesma tx, config CONGELADA na conversão) + estorno decrementa pela config congelada (mesma TX do Finding 1b) + salvarAfiliado persiste config.
- [x] T3 `aedc9f9` — registrarRepasseComissao (manual, idempotente por repasseId, guarda de saldo) + readers saldo/extrato RN-318 + Rules `repasses` + api-client tipado. PUSHED.
- [x] T4 — testes integração F1-F6 no emulator 8480/9598 (emulators:exec, firebase.r6.json): 28/28 verdes.
- [x] T5 `ccfc161` — hardening A3 do CRM (HMAC + CRM_ID_PEPPER fail-closed; 17/17 emulator; .env dev + .env.example; épico E19 anotado). PUSHED.
- [x] T6 — DECISOES-ABERTAS item 23 (default de desembolso proposto) + épico E08 §"Fase 2 entregue" + boards (kanban/épicos/histórico) + report COMF2-REPORT.md.
- [x] Review antagonista Fable em contexto fresco: **APROVADO — 0 bloqueador, 0 alto, 3 BAIXO.** F-1 (guarda NaN no compute) CORRIGIDO e re-provado (`b32757a`); F-2 (troca de chave CRM só é limpa em base virgem) e F-3 (repasse manual é auto-declaração do organizador — mitigado pelo extrato visível ao afiliado) = riscos aceitos registrados no report.
- [x] Regressão emulator: estorno+webhookAsaas+checkoutFoundation 46/46 · eslint functions COMPLETO 0 · unit 79/79 (afiliadoCore+crmCore+checkoutCore).

## Decisões/premissas desta fase

1. **Desembolso default (proposto, aberto):** repasse MANUAL registrado no sistema (organizador paga off-platform e registra; saldo = acumulada − repassada). Split Asaas = fase 3, NÃO integrado (aguarda ratificação do Vitor).
2. Config de comissão congelada POR CONVERSÃO (`comissaoConfig` no doc do ledger) — anti-forja de percentual pós-venda nos dois sentidos (acúmulo e estorno).
3. Saldo PODE ser negativo (estorno pós-repasse = dívida honesta; reader não clampa).
4. `valor_fixo` é POR INSCRIÇÃO (base coerente com `conversoes`, premissa 1 do R9-E).
5. DIRECTIVE R9-E mantida: nenhuma rota automática de dinheiro a `responsavelUid`; fase 3 exigirá `emailVerified===true`.

## Gates até aqui

tsc core/api-client/functions = 0 · eslint (arquivos tocados) 0 · unit 17 · emulator afiliados 28/28 (porta 8480, nunca 8180).
