---
tags: [leela, rn, delta, rodada, serv2, face-minima, e04]
trace: leela-redesign-v2-20260810
lane: SERV1-BUILD
data: 2026-08-11
---

# 02-rns-delta · a venda paga tem chão (SERV-2)

> **Delta apenas.** O texto canônico da regra mora no épico dono,
> [[LEELA-E04-config-vendas]], seção "Delta a venda paga tem chão". Repetir o
> enunciado aqui criaria uma segunda definição, que é o defeito que o
> [[indice-de-regras-de-negocio]] existe para evitar. Decisão do dono em
> `01-decisoes-dono.md`, bloco SERV-2.

## Faixa consumida

**RN-559**, uma só. O índice anunciava a 559 como a próxima livre, e a conferência foi refeita
imediatamente antes do commit por grep de `RN-559` a `RN-561` sobre o corpus inteiro fora do
índice: **zero definições**. As ocorrências de "RN-559" que o grep devolve são o registro da
decisão desta manhã, o próprio índice, e prosa da SPEC-ESTOURO-RESERVA descrevendo a varredura
dela — nenhuma é definição. A próxima livre passa a ser a **560**.

| RN | Enunciado curto | Épico dono | Lane |
|---|---|---|---|
| **RN-559** | A venda PAGA tem face mínima de R$ 10,00; a validação vive na origem (criação/edição de preço de lote), com recusa nomeada na tela e no servidor. R$ 0,00 continua permitido — gratuidade não é venda. | [[LEELA-E04-config-vendas]] (dona) · E09 (consome, pelo piso da RN-491) | SERV1-BUILD |

## O que a regra NÃO faz

Três fronteiras, escritas aqui para a próxima lane não redescobri-las:

- **Não substitui a RN-494.** O clamp "o Serviço nunca ultrapassa a face" continua uma camada
  acima, como defesa em profundidade. A RN-559 resolve na origem; a RN-494 segue pegando o que
  escapar por dado legado.
- **Não retroage.** Não entra em `parseLote` nem em `loteShapeValido` — doc legado com face de
  R$ 5,00 continua legível. No update, o mínimo só morde quando o `preco` entra no diff, para não
  trancar um lote legado vendido cujo preço a RN-200 congela.
- **Não toca `percursos[].preco`.** O preço legado não é superfície editável: `EventoForm.tsx`
  cria todo percurso com `preco: 0`. Fronteira declarada, sem tarefa.

## Histórias

**S324 · a venda paga tem chão** — nova, quatro tarefas, construída na mesma aterrissagem
(`1621414a`, `4d674ce2`, `95ed393b`). Detalhe e estado por tarefa no épico.

Nenhuma outra história foi tocada. As tarefas retidas pelo **SERV-3** (as 34 strings do renome)
seguem retidas pela decisão, e este delta não as reordena.
