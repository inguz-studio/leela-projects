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
6. E11 coleta: **APROVADO explicitamente pelo Vitor** (2026-07-04) — rollup de coleta entra cedo na Onda 2 (histórico não é backfillável).
7. E15 Creator Studio: **só higiene, confirmado pelo Vitor** (2026-07-04) — autorId + campo de anexo no E05; sem recorte encomendado.
8. **Leela+: PAGO, mensalidade, receita 100% Leela** (sem split com clube/parceiro neste início). Namespacing `parceirosBeneficio` separado de `parcerias` (afiliação).
9. **E07 aprovado**: 403 casado com papéis (E04-S304). Fatia web na Onda 2; manutenção/offline-web V1.1.
10. **Backend do desafio adiantado aprovado**: lote surface-agnostic no fim da Onda 2.

## Decisão adicional (impacto grande na Onda 2)

**Sem afiliados neste início. Cupons sim.**
- E04: bloco S301 (programa de afiliação, links master, split, painel de afiliados) **SAI da V1**. Cupons (S300-T5) **ficam**.
- E08 (promotor self-service): **adiado** (dependia de afiliação).
- E12: atribuição por link de afiliado (S1204) **sai**; cupom no checkout **fica**.
- Infra de split plugável permanece como desenho (ADR-006), sem UI.

## Decisões comerciais do checkout (Vitor, 2026-07-05 — vinculantes, substituem os defaults do planejamento)

- **Taxa por método de pagamento**: **10% cartão de crédito · 8% PIX** (modelo por método, não incorporada/não-incorporada).
- **Parcelamento**: estruturar com **taxa variável por número de parcelas, de 2x a 12x** (valores exatos serão exercitados depois — o modelo de dados e o finance/calc devem suportar tabela de taxas por parcela desde já; NÃO fixar "12x sem juros").
- **Sem boleto** (métodos V1: cartão de crédito + PIX).
- **Gateway de pagamento: ADIADO** (sem integração agora; sandbox/mock segue).
- **Domínio público: ADIADO** ({DOMINIO_LEELA} permanece placeholder).
- **Calibragem de gate aceita**: verificação adversarial `xhigh` só para achados críticos/altos; `high` para médios; baixos vão direto à lista. Painel completo só em gates de onda; lotes com reviewer único.

## Decisões 2026-07-05 (2ª rodada — Vitor)

- **T14 RESOLVIDO**: desafio `encerrado` PODE voltar a `ativo` pelo dono do clube (transição permitida, owner-only).
- **Plano de cobrança (novo conceito, vinculante)**: o admin master configura UMA VEZ um plano nomeado —
  tabela de taxas por parcela do cartão (2x-12x) + taxa PIX + taxa cartão à vista + mensalidade SaaS —
  e APLICA o plano ao organizador (tenant). Defaults iniciais: 10% cartão / 8% PIX. Aplicar um plano
  estampa os valores nos CommercialTerms do tenant (mantendo versionamento/snapshot existente).
  Substitui a edição campo-a-campo como fluxo primário; edição fina por tenant continua possível.
- **Strava: movido INTEIRO para evolução** (dependência do OAuth). PORÉM o front-end da V1.5 já nasce
  com a superfície prevista: seção/CTA de conexão Strava no perfil com estado "em desenvolvimento"
  (UI honesta, sem funcionalidade). Registro do app OAuth deixa de ser ação urgente.
- **Domínio e e-mails (transacional + suporte): ficam para o FINAL** (pré-go-live).
- Pendentes ainda: T15 (reativação unilateral de parceria), T13 (RN-111 no servidor), valores do plano de cobrança.

## Onda 2 revisada (composição para o planejamento operacional)

E04-slim (config & vendas sem afiliação, com cupons + equipe/papéis + PaymentProvider concreto) → E12 (landing + checkout; decisões comerciais pendentes do benchmark Cheers: taxa incorporada 8% vs não incorporada 10%, parcelamento, frete vs retirada) → E09-slim (repasses, spec acima) + E07-web + E06 (comunicação) + coleta E11 (cedo) + higiene E15 (XS) + lote backend desafio (fim da onda).
