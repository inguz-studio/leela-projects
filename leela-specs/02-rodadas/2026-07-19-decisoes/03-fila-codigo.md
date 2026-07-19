---
tags: [leela, decisoes, fila, rodada]
trace: leela-build-2d6ee98d
lote: DECISOES-0719
data: 2026-07-19
---

# 03-fila-codigo · Lotes de código derivados da rodada DEC-0719

> Cards de fila **SEM implementar** (esta lane é só documentação). Cada card vira brief de execução num lote próprio. Ordem não fixada aqui; dependências marcadas.

| # | Lote | Escopo | RNs | Dep / Nota |
|---|---|---|---|---|
| (a) | **upload-sweep** | Sweep upload-only em todas as superfícies de imagem (remove URL colada) + ação TROCAR imagem + ajuste automático de proporção (fit/crop client-side por superfície) | RN-168, RN-170 | Reusa infra R5 (Storage/`FileInput`). Toca perfil (E17), clube (E05), evento/capa (E03 — coordenar com TAMANHOS-GRADE), kit (E03). |
| (b) | **subnav-divisórias** | Divisórias (`border-b`/`Tabs`) em **todo** `SubNav`, não só terciárias de evento | RN-229 (ampliada) | DS/UI. Supersede SubNav-plano globalmente. Gate AA. |
| (c) | **CHECKOUT-FORM-2** | Cupom no INÍCIO (step 0) + Pix\|Cartão como BOTÕES (sem toggle) + QR PIX com timer 30 min + auto-copy com toast + gênero por atleta + cards "+ adicionar atleta" | RN-154, RN-157 (+ D-2/D-4/D-5 UI) | Charge PIX precisa de `expiresIn=30min` no PaymentProvider/Asaas. Continua o CHECKOUT-FORM/CHECKOUT-MODELO. |
| (d) | **conta-sem-fricção** | Criação automática de conta na 1ª compra + link de definição de senha por e-mail | RN-155 | **Gated pelo EmailProvider** (RN-137, `BREVO_API_KEY`). Fail-closed sem a chave. |
| (e) | **saúde-termo-base** | Termo de saúde BASE obrigatório sempre no checkout + termo custom aditivo do organizador | RN-156 | Reconcilia RN-146/147 + aceite versionado RN-149. Carimbo de versão no `pedidos/{id}.aceites.saude`. |
| (f) | **cpf-unico** | Constraint de unicidade global de CPF + fluxo de colisão (linka a mesma pessoa, não duplica) | RN-173 | Base do linking CRM (RN-172) e do pré-preenchimento (RN-154). Identidade/checkout + cadastro. |
| (g) | **[PARKED] clube-retroativo** | Desconto retroativo do clube-influenciador ao cruzar o mínimo (todos passam a ter desconto) | RN-315 (direção retroativa) | **PARKED** — aguarda revisão Ticketsports do Vitor. É dinheiro ⇒ rota Fable + review antagonista obrigatória quando destravar. |

## Não-cards (dependências externas / pendências)
- **BENCHMARK-REEMBOLSO** (lane em paralelo) decide se o reembolso devolve ou não a taxa de serviço — só então vira RN.
- **`BREVO_API_KEY`** (ação externa do Vitor) destrava (d) conta-sem-fricção.
- **Revisão Ticketsports** (Vitor) destrava (g) clube-retroativo.
