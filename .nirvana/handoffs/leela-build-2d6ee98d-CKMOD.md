# Handoff — leela-build-2d6ee98d · lote CHECKOUT-MODELO (CKMOD)

employee: sf-backend-lead (software-forge) · modelo: Fable · 2026-07-19

## Estado por task

- [x] T1 `f1845ef` — core: endereço no PEDIDO (novo, CEP canônico 8 dígitos, UF via UFS_BRASIL) + aceites versionados {termos, saude} (RN-149 pattern) + politicaVendas.versao (vigente=1 sem doc/legado, material hash) + validarDados destravado (telefone/nascimento opcionais estritos) + parseDadosPessoais Postel (bloco [reg] parcial). 28 unit CKMOD + 144 unit vizinhos verdes. Fix drive-by: teste-espelho CAMPOS_FUNCTION_INSCRITO estava dessincronizado desde S904 (titularHistorico).
- [x] T2 `03f9fc3` — functions: versionarPoliticaVendas (bump material por hash, transacional, idempotente) + createInscricaoCharge (endereco/aceites/telefone resp./nascimento; versão dos termos lida IN-TX; bloco [reg] parcial só com campo novo). 77 unit verdes.
- [x] T3 `ec369db` — leitor público (politicaVendas pública c/ defaults CDC + exigenciasSaude + termoSaudeVersao + taxaRepassada boolean RN-347) + api-client espelhado (CheckoutEnderecoInput etc.) + fixtures de teste da landing.
- [x] T4/T5 `30fc85a` — Rules congelam versao/hash/carimbo da politicaVendas (criar/tocar/limpar negados; edição material livre) + integração CKMOD 9/9 + rules 16/16 no emulator TESTE 8480/9598 (fb-tools@13, Java 17 na máquina) + regressão 94/94 (foundation/S1203/attack/tamanhos/webhookAsaas/estornarInscricao/rn347) + tsc painel/landing/core/api-client/functions 0.
- [x] T6 `02d3a60` — review antagonista Fable (contexto fresco): REPROVADO na 1ª (1 ALTO + 5 MÉDIO + 2 BAIXO) → fixes F-1 (materialHash na prova, in-tx), F-2 (freeze sem porta lateral platform_admin), F-3 (PII canônica + tetos brutos), F-4b (replay completa aceites), F-5 (baseline legado = material do before), F-6 (Postel simétrico), F-8a (teto nome) TODOS re-provados; F-4a = pendência dura (flip server-side no lote de UI); F-7/F-8b riscos aceitos. Re-prova: unit 199/199 · CKMOD 11/11 · rules 17/17 + 24/24 · regressão checkout/webhook/estorno/CRM/demografia verde.
- [x] T7 — boards (kanban card + BOARD-HISTORICO + V1-CHECKLIST) + épicos E12/E04/E19 + report `outputs/leela-build-2d6ee98d/CKMOD-REPORT.md`.

## Pendências que ficam (para os próximos lotes)

1. **Lote de UI do checkout**: coletar os campos + FLIPAR a obrigatoriedade dos aceites SERVER-SIDE em `validarCreateInscricaoChargeInput` (F-4a — pendência dura, documentada no contrato do input).
2. F-8b (pré-existente): replay emite cobrança com identidade do input do retry — candidato a hardening.
3. D-7 segue aberto: superfície de coleta PAR-Q/atestado no checkout (kernel S306 pronto; leitor já projeta as flags).
4. Deploy real: trigger `versionarPoliticaVendas` novo precisa subir com o próximo deploy de functions.

## Premissas registradas

1. **Endereço mora no PEDIDO** (comprador/responsável, 1× por pedido) — spec §5.4-ii default recomendado; ADR-011 não se aplica (endereço é do pagador, não do titular). CRM NÃO ganha endereço (RN-172; agregação do CRM lê inscritos, nunca pedido).
2. **Aceites moram no PEDIDO** (ato único do responsável no pagar); regulamentoAceite POR INSCRITO segue S1207 (outro lote). Declaração de aptidão = aceite de termo, não dado de saúde; PAR-Q/atestado seguem exclusivos de `inscritos/{id}/saude` (D-7, superfície futura).
3. **Campos novos OPCIONAIS no input** nesta camada (compat UI vigente — regressão verde); obrigatoriedade dos aceites flipa no lote de UI do checkout (registrar no épico).
4. **[reg] Postel**: painel intocável (lane S8FIX) ⇒ ausentes normalizam p/ ''/nao_informado; presente-e-inválido lança.
5. **Política sempre vige**: sem doc/legado = versão 1 (defaults legais CDC Art. 49).

## Portas/lanes

Emulator TESTE: 8480/9598 (firebase.r6.json) — NUNCA :8180 (preview). Não tocados: apps/painel, packages/design-system, modal/marca/tipografia da landing, CheckoutFlow/Step*.
