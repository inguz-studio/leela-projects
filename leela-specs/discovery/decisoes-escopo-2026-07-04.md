# Decisões de escopo — Vitor, 2026-07-04

Respostas às 10 decisões da `proposta-revisao-escopo-2026-07-04.md`. Vinculantes para o planejamento da Onda 2+.

## Decididas

1. **Corte aceito: V1 = vender (fim da Onda 2) · V1.5 = engajar (fim da Onda 3).**
2. **Gamificação GymRats entra** (V1.5). Leaderboard como board de consistência; spec E13 deve ser atualizada onde contradiz.
3. **Sem medalhas** (S1309 cortada). Perfil com estante "em breve".
4. **E09-slim repasses entra na V1** com o seguinte recorte (spec do Vitor, vinculante):
   - Organizador vê **quanto já vendeu** e **quanto tem disponível** para saque.
   - **Dados bancários salvos** (cadastra uma vez, reutiliza; LGPD aplicável).
   - Solicitação de repasse: seleciona/preenche dados bancários + **informa o valor**.
   - **Histórico completo do que foi pago.**
   - **Comprovante gerado por repasse** (registro de que foi feito).
   - **Retenção de 15%** do total, liberada **somente após o evento** (contingência de fraude). Percentual **editável pelo admin master** (platform_admin).
   - V1: registro/workflow (PaymentProvider mock — "pago" é registro, sem transferência bancária real; UI explícita).
5. Strava: integração segue gated (Onda 3.1). **Ação externa pendente do Vitor: registrar o app OAuth na Strava** (lead time de semanas). Não respondido explicitamente; default da proposta mantido.
6. E11 coleta: **default aprovado** (rollup de coleta entra cedo na Onda 2 — histórico não é backfillável). Não respondido explicitamente; sujeito a veto.
7. E15 Creator Studio: **só higiene** no E05 (autorId + campo de anexo). Default da proposta; sem recorte encomendado.
8. **Leela+: PAGO, mensalidade, receita 100% Leela** (sem split com clube/parceiro neste início). Namespacing `parceirosBeneficio` separado de `parcerias` (afiliação).
9. **E07 aprovado**: 403 casado com papéis (E04-S304). Fatia web na Onda 2; manutenção/offline-web V1.1.
10. **Backend do desafio adiantado aprovado**: lote surface-agnostic no fim da Onda 2.

## Decisão adicional (impacto grande na Onda 2)

**Sem afiliados neste início. Cupons sim.**
- E04: bloco S301 (programa de afiliação, links master, split, painel de afiliados) **SAI da V1**. Cupons (S300-T5) **ficam**.
- E08 (promotor self-service): **adiado** (dependia de afiliação).
- E12: atribuição por link de afiliado (S1204) **sai**; cupom no checkout **fica**.
- Infra de split plugável permanece como desenho (ADR-006), sem UI.

## Onda 2 revisada (composição para o planejamento operacional)

E04-slim (config & vendas sem afiliação, com cupons + equipe/papéis + PaymentProvider concreto) → E12 (landing + checkout; decisões comerciais pendentes do benchmark Cheers: taxa incorporada 8% vs não incorporada 10%, parcelamento, frete vs retirada) → E09-slim (repasses, spec acima) + E07-web + E06 (comunicação) + coleta E11 (cedo) + higiene E15 (XS) + lote backend desafio (fim da onda).
