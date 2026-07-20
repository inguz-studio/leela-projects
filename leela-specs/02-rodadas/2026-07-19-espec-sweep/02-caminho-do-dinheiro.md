---
tags: [leela, rodada, planejamento, espec-sweep, dinheiro]
aliases: [Caminho do dinheiro em curso, ESPEC-SWEEP 1]
atualizado: 2026-07-19
---

# 02 · Caminho do dinheiro em curso — o que resta (E04 · E09 · E12 · E16)

> Primeiro item da ordem de implementação. Não re-especifica nada que já tem spec: TAXA-FLEX, formbuilder e checkout2/claim já foram escritos nas suas rodadas. O que este arquivo entrega é o **mapa do que resta**, com passo a passo, território de arquivos, rota de modelo e critério de pronto — para que o caminho do dinheiro feche antes de qualquer frente nova abrir.

## Inventário de reuso (o que já está pago)

Antes de listar lacuna, o que existe. Nada abaixo volta a ser especificado.

| Camada | Estado | Onde |
|---|---|---|
| Kernel de pedido/pagamento (ADR-011) | ✅ | `functions/` · rodada FABLE-A |
| Gateway Asaas em sandbox (PIX, cartão, boleto) | ✅ | lote R6 |
| Modelo do checkout novo: endereço, telefone, nascimento, aceites versionados | ✅ | CHECKOUT-MODELO |
| Backend do checkout novo: CPF único, conta sem fricção, termo de saúde, PIX 30 min | ✅ | CHECKOUT2-MODELO · RN-154/155/156/157/173 |
| Posse de identidade por CPF (claim condicionado) | ✅ | CLAIM-FIX · RN-174 |
| Taxa flexível: tabela por meio, congelamento, estorno cent-exato, config super-admin | ✅ | TAXA-FLEX · RN-178..183 · S308/S905/S1210/S1606 |
| Política de vendas + máquina de reembolso/transferência (T1-T4) | ✅ | Onda 3 · L1 · S305 · S904-T1..T4 |
| Comissão do afiliado + repasse manual registrado | ✅ | COMF2 · UI em CRM-COMISSAO-UI |
| Suíte de functions estável (164 arquivos, 2× verde) | ✅ | SUITE-STAB · S021 |

**Regra de infraestrutura herdada da SUITE-STAB e que vale para todo lote abaixo:** rodar `npm run build` antes de qualquer `emulators:exec`, e todo teste de integração novo usa o helper `stability.ts`.

## Bloco A · Camada de tela do checkout novo (E12-S1209)

O backend das cinco regras está pago; falta a tela. É a maior lacuna do caminho do dinheiro e a que o comprador vê.

| Task | O que faz | Território | Dep | Rota | ⚔ |
|---|---|---|---|---|---|
| `S1209-T1` | cupom no step 0 + Pix/Cartão como botões (sem toggle) | checkout na `apps/landing` | CHECKOUT2-MODELO ✅ | **opus** xhigh | — |
| `S1209-T2` | QR PIX + copia-e-cola + timer de 30 min + auto-copy com toast, na tela de pagamento **e** na tela do pedido pendente | checkout + tela de pedido pendente na `apps/landing` | S1209-T1 · RN-157 ✅ | **opus** xhigh | ⚔ |
| `S1209-T3` | campo de gênero por inscrito + pré-preenchimento de pessoa conhecida | formulário de inscrito na `apps/landing` | RN-154 ✅ · RN-174 ✅ | **opus** xhigh | ⚔ |
| `S1209-T4` | um card por atleta + botão "+ adicionar atleta" | checkout na `apps/landing` | S1209-T1 | **opus** xhigh | — |

**Por que tudo em opus.** T2 mostra o estado de uma cobrança viva: um timer que mente sobre a validade do PIX cria pedido zumbi ou cobrança dupla. T3 lê o prefill, que é a superfície onde o RN-174 fecha o vazamento F1 — errar o gate de leitura reabre o oráculo de CPF. T1 e T4 mudam o shape do pedido antes do pagar. Nenhuma é mecânica.

**Ordem interna:** `T1 → T2 → T4` na mesma tela (serializam por território); `T3` pode correr em paralelo (formulário de inscrito, arquivo distinto).

**Critério de pronto do bloco:**
- [ ] tsc 0 · eslint 0 nos pacotes tocados
- [ ] `verify:brand` PASS (a landing tem gate de identidade próprio desde o R12)
- [ ] teste de tela cobrindo: cupom inválido no step 0, PIX expirado dentro da janela de 30 min, gênero "não informado", adicionar e remover atleta
- [ ] o prefill **nunca** responde diferente para "CPF sem ficha" e "CPF de terceiro" (prova de não-oráculo, herdada do CLAIM-FIX)
- [ ] review antagonista em contexto fresco nas tasks ⚔

## Bloco B · Fila de reembolso e transferência no painel (E09-S904-T5)

A máquina de estados existe e é auditável (T1-T4 aterrissados com review antagonista). Falta a superfície pela qual o organizador aprova ou recusa o que não caiu em `aprovado_auto`. Hoje o pós-venda funciona sem quem o opere.

| Task | O que faz | Território | Dep | Rota | ⚔ |
|---|---|---|---|---|---|
| `S904-T5` | fila de reembolso/transferência no painel financeiro: listar solicitações por estado, aprovar/recusar com registro auditado, mostrar `transicoes[]` | `apps/painel` · financeiro | S904-T1..T4 ✅ | **opus** xhigh | ⚔ |

**Cuidados que a spec do épico já crava e a tela precisa honrar:** a incidência é **por inscrito dentro do pedido** (ADR-011), nunca sobre o pedido inteiro; escrita de estado só por Function; a transferência é bloqueada se o kit já foi entregue (RN-345). A tela não recalcula nada — ela dispara transição e lê o rastro.

**Critério de pronto:**
- [ ] aprovar e recusar gravam transição com autor e carimbo, e a lista reflete sem recarregar o mundo
- [ ] tentativa de aprovar duas vezes é idempotente na UI (o segundo clique não abre segunda transição)
- [ ] ação irreversível passa por `ConfirmModal` com preview real (§2.15) — o preview mostra o valor que será estornado, não um texto genérico
- [ ] review antagonista em contexto fresco

## Bloco C · Construtor de formulário de perguntas (E04-S310 · E05-S112 · E12-S1212)

O Vitor destravou em 2026-07-19; o corte de v1 é só perguntas. O modelo e o core são **fonte única** no E04 — a maior armadilha aqui é E05 e E12 criarem cada um o seu enum de tipos.

| Task | O que faz | Território | Dep | Rota | ⚔ |
|---|---|---|---|---|---|
| `S310-T1` | core único `packages/core/src/forms/` (tipos, obrigatória, opções, versão, tetos RN-187, helper de versionamento RN-188) + subcoleção sob o evento + Rules server-only fail-closed | `packages/core/src/forms` · `firestore.rules` | — | **opus** xhigh | ⚔ |
| `S310-T2` | tela do construtor na config do evento (criar, editar, ordenar, marcar obrigatória) | `apps/painel` · config de evento | S310-T1 | **opus** xhigh | — |
| `S112-T1` | builder na config do clube **reusando** o core de S310-T1 + subcoleção sob o clube + Rules | `apps/painel` · config de clube · `firestore.rules` | S310-T1 | **opus** xhigh | ⚔ |
| `S112-T2` | render na inscrição de clube + grava resposta no membro na mesma tx + fence de obrigatoriedade | inscrição de clube · `functions/` | S112-T1 | **opus** xhigh | ⚔ |
| `S1212-T1` | grava resposta no inscrito na tx da confirmação + carimbo de versão | `functions/` checkout | S310-T1 | **opus** xhigh | ⚔ |
| `S1212-T2` | render das perguntas no checkout + obrigatoriedade no **mesmo fence server-side dos aceites** (S1207) | checkout na `apps/landing` | S1212-T1 · **serializa após S1209** | **opus** xhigh | — |

**Dependência de território que precisa ser respeitada:** `S1212-T2` e o bloco A tocam a mesma tela de checkout. Despachar em paralelo produz conflito. A ordem é: bloco A inteiro, depois `S1212-T2`.

**Critério de pronto do bloco:**
- [ ] existe **um** enum de tipos de pergunta no repositório inteiro (prova por grep: nenhuma superfície redefine `unica|multipla|sim_nao`)
- [ ] os tetos (20 perguntas / 10 opções) são constante única no core, no padrão do `PIX_EXPIRACAO_SEGUNDOS`
- [ ] editar pergunta com resposta existente versiona e **não** reescreve a resposta antiga — teste de integração explícito
- [ ] pergunta obrigatória sem resposta é bloqueada **no servidor**, não só no cliente (teste que chama a Function direto, por fora da tela)
- [ ] a resposta viaja no inscrito/membro no export existente — sem relatório novo

## Bloco D · Estrangeiro sem CPF — GATED, não despachar

`E04-S309` (toggle por evento) · `E12-S1211` (checkout por passaporte) · `E19-S1903` (registry de documento tipado). A spec existe e está completa. O gatilho de liberação é **externo**: a conta Asaas precisa aceitar pagador estrangeiro (contato com o gerente, cerca de 6 dias úteis). Enquanto isso não volta, um brasileiro já pode comprar pelo estrangeiro — o produto não está travado.

**Não despachar antes da liberação.** Especificar mais nesta lane seria trabalho que a resposta do Asaas pode invalidar.

## O que volta para o Vitor

Um item, e é de dinheiro: **a fronteira do reembolso** (item 23 de `DECISOES-ABERTAS`). O desembolso já foi ratificado — repasse manual, split não abre. O que segue pendente é **se o reembolso devolve a taxa de serviço ao comprador**. A RN-181 crava o *como* ratear o componente fixo cent-exato; o *se* espera o benchmark. Detalhe em [[01-decisoes-abertas]].

Isso **não** bloqueia nenhum dos blocos A, B ou C. Bloqueia apenas o texto que a tela de reembolso mostra ao comprador sobre a taxa — e por isso o bloco B pode entrar antes, desde que a tela não afirme nada sobre devolução de taxa até a decisão sair.

## Rota de modelo agregada deste item

11 tasks despacháveis, todas **opus** effort xhigh; 7 delas com review antagonista obrigatório. Nenhuma qualifica para haiku: não há aqui trabalho mecânico com gate determinístico — tudo toca dinheiro, Rules, PII ou o shape do pedido antes do pagar. Mais 3 tasks GATED (estrangeiro) fora da fila.
