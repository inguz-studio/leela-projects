# Handoff · SPEC-ESTOURO-RESERVA (leela-estouro-reserva-20260810)

- **Lane:** SPEC (documentação pura — zero código de produção, zero teste, zero deploy)
- **Perfil:** sf-backend-lead (software-forge) com lente de produto
- **Estado:** ✅ ATERRISSADA — rodada escrita, épicos e boards atualizados, painel trocado

## O que foi entregue

**Rodada nova** `leela-specs/02-rodadas/2026-08-10-estouro-reserva/` (padrão da casa, espelho da
2026-08-09-admin-visao):

| Arquivo | Conteúdo |
|---|---|
| `01-decisao-do-dono.md` | verbatim do ESTOURO-1 (09/08), leitura, fronteira do que se decide |
| `02-inventario-codigo.md` | medição arquivo:linha — 9 seções, tudo lido em 10/08 |
| `03-spec.md` | RN-543..546, S322/S323 com Given/When/Then, vetável ESTOURO-2 |
| `04-fila-codigo.md` | 11 tarefas em 2 frentes, territórios, deps, rotas, gates ⚔ |

**RNs novas (E04 dono, consolidadas no épico na mesma aterrissagem):**
- **RN-543** · a vaga sai do estoque quando a cobrança nasce (contador `reservas` Function-only,
  gate na tx de `criarDocsDeCheckout`; reserva nunca dispara virada — RN-300 intocada; RN-182
  intocada; RN-498 inteira)
- **RN-544** · a reserva morre pelas três portas (varredura, webhook, onCall) e a vaga volta ao
  lote da linha; liberação exactly-once na mesma tx do flip; recontagem absoluta cura drift
- **RN-545** · varredura agendada do PIX vencido: cron explícito `3-58/5 * * * *` +
  America/Sao_Paulo (fora dos instantes 03:00-03:20 — lição da REV Onda 1), reuso de
  `expirarPixPendenteCore` com chamador de sistema, secrets no molde `varrerEstornosOrfaos`,
  1 índice composto novo em `pagamentos` (declarado), observabilidade por log estruturado com o
  limite dito (zero alert policy = pendência CTO)
- **RN-546** · pendente de cartão reserva com teto — **condicionada ao vetável ESTOURO-2**

**Histórias:** S322 (varredura, 4 tarefas, sobe primeiro e sozinha) e S323 (reserva, 7 tarefas,
depende da S322 no ar; T7 retida pelo ESTOURO-2). **S321 foi pulada de propósito** — consumida
pelo E01 (SCROLLBAR-TEMA, 08/08); numeração de história é global.

**Fatos técnicos que sustentam a spec (medidos):** pendente NÃO segura vaga hoje
(`STATUS_QUE_CONTAM_VENDA = ['confirmado','estornado']`, virarLote.ts:67); `expirarPixPendente` é
onCall com ownership (expirarPixPendente.ts:123-128, :263-276) e NUNCA roda sozinho; o OVERDUE do
Asaas flipa para 'falhou' (webhookPagamento.ts:361-368) mas dueDate é DIA
(asaasProvider.ts:966-968) — chega ~1 dia tarde; a trava PIX é por (comprador, evento, carrinho)
e não fecha corrida entre compradores (travaCobrancaPix.ts:33-42); `pixExpiraEm` carimba +30 min
na criação (createInscricaoCharge.ts:1876-1882); `vendidos` Function-only
(firestore.rules:1109-1117); zero índice em `pagamentos` hoje.

## Épicos e boards (mesma aterrissagem)

- `LEELA-E04-config-vendas.md`: delta SPEC-ESTOURO-RESERVA no fim (RN-543..546 canônicas +
  S322/S323) + o §"O que a regra não decide" da RN-498 marcado como **decidido** (não apagado).
- `LEELA-E12-landing.md`: delta na RN-158 — exceção da cobrança emitida (carrinho segue sem
  segurar estoque; o pedido pendente passa a segurar).
- `indice-de-regras-de-negocio.md`: faixa 543-546 → E04; próxima livre = **547**; conta 273→277;
  atualizado 2026-08-10. Colisão re-verificada no commit (grep RN-543..559 + S322/S323 = só os
  arquivos desta lane).
- `DECISOES-ABERTAS.md` (painel canônico — fica em `01-produto/`, não em `00-boards/` como o
  brief dizia): **ESTOURO-1 saiu** (decidido 09/08, formalizado por esta rodada), **ESTOURO-2
  entrou** (teto da reserva do pendente de cartão, default proposto = 30 min). Conta mantida:
  30 itens (26 decisões + 4 ações), com a troca registrada no cabeçalho.
- `V1-KANBAN.md`: card novo `[E04] Pagamento pendente segura a vaga...` com S322/S323 e tarefas
  (padrão épico→história→tarefa); nota do card S315 atualizada (ESTOURO-1 decidido). V1-CHECKLIST
  não foi tocado — tasks entram lá quando despachadas, pela regra do próprio arquivo.

## O que fica retido / com o dono

- **ESTOURO-2** (painel): teto da reserva do pendente de cartão. Retém só a `S323-T7`.
- A frente 2 inteira (S323) espera a frente 1 (S322) **no ar e provada** — duas peças juntas ou
  nenhuma.
- A correção mínima da RN-498 (`S315-T3`/`S315-T4`) segue independente, na fila de 05/08.

## Disciplina cumprida

Território: `leela-specs/**` + este handoff, nada além. `.nirvana/handoffs/leela-incidente-tela-preta-20260810.md`
estava modificado por outra lane e **não foi tocado nem commitado**. Commits `--only` com
pathspec explícito; push ao final. Zero código, zero teste, zero deploy.
