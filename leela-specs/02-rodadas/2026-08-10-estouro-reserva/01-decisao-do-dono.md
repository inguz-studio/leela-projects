---
tags: [leela, decisoes, rodada, estouro, reserva, checkout, pix, estoque]
aliases: ["Estouro e reserva 2026-08-10", "SPEC-ESTOURO-RESERVA"]
trace: leela-estouro-reserva-20260810
lote: SPEC-ESTOURO-RESERVA
data: 2026-08-10
fonte: decisão ESTOURO-1 do dono em 2026-08-09, registrada em 2026-08-09-decisoes-dono
---

# 01-decisão do dono · pagamento pendente segura a vaga

## O verbatim, sem retoque

> "estouro 1. Se um pedido eesta com pagamento pednente, a vaga nao está disponivel para compra."

Registrado em [[01-decisoes-dono]] (bloco 5, rodada `2026-08-09-decisoes-dono/`), com a fila de
trabalho em `02-fila-execucao.md` §ESTOURO-RESERVA (Parte B).

## A leitura do maestro, herdada e mantida

É a **reserva**, e é a opção que o painel propôs como default. A frase escolhe o lado difícil de
propósito: a vaga sai do estoque quando a **cobrança nasce**, não quando ela paga. Duas pessoas
deixam de conseguir comprar a mesma última vaga, que era o efeito a impedir. As outras duas opções
do painel saíram com a decisão: nem aceitar o estouro e apenas avisar, nem bloquear a confirmação
e estornar.

E a vaga **volta**: quando o pagamento pendente vence ou falha, a reserva morre e a vaga fica
disponível de novo. Sem essa segunda metade, a reserva vira um jeito novo de perder venda — um PIX
abandonado seguraria a vaga para sempre.

## O que esta rodada formaliza, e o que ela não decide

**Formaliza.** A decisão acima, contra o código real, com as duas peças que sobem juntas ou
nenhuma: a reserva na criação da cobrança e a expiração automática do PIX pendente. A dependência
foi medida na própria rodada de 09/08 e este documento a reconfirma linha a linha em
[[02-inventario-codigo]]: `expirarPixPendente` é `https.onCall` e **nunca roda sozinho** — a
expiração de PIX pendente não acontece automaticamente hoje. Subir a reserva sem a varredura é
pior do que o estado atual.

**Não decide.** ⚔ Assunto de dinheiro e de estoque: a spec PROPÕE dentro do que ESTOURO-1 cravou.
Um único ponto fica **além** da letra da decisão e vira vetável nomeado no painel
([[DECISOES-ABERTAS]] §ESTOURO-2): o pedido pendente de **cartão** não tem vencimento natural como
o PIX tem, então o teto da reserva dele é escolha que o dono ainda não fez. Nenhum default
silencioso: a proposta está escrita com as três opções e o custo de cada uma
([[03-spec]] §Parte 5).

## O que a decisão NÃO reabre

- **Estorno não devolve vaga.** Decisão registrada no `virarLote` (decisão #1 do cabeçalho,
  `functions/src/eventos/virarLote.ts:20-25`): inscrito `estornado` conta como venda. A reserva
  não mexe nisso.
- **A virada de lote continua one-way (RN-300).** Reserva não dispara virada nem reabre lote
  carimbado; o mecanismo está desenhado para isso ([[03-spec]] §RN-543).
- **RN-182 intocada.** O líquido do produtor segue `face − taxa(meio)`. Nada aqui toca preço,
  taxa ou repasse — a reserva é de vaga, nunca de dinheiro.
- **A correção mínima da RN-498 não é absorvida.** O estouro deixa de ser silencioso
  (`S315-T3`/`S315-T4` de `2026-08-05-lotes-ux/03-fila-codigo.md`) independentemente desta
  frente, como o painel já dizia. As três exigências da RN-498 valem com ou sem a reserva.

## O que esta rodada entrega

Docs somente. Zero código, zero mudança em Rules, zero deploy, zero leitura de produção. Toda
afirmação sobre o sistema tem caminho `arquivo:linha` citado; onde não deu para medir, está
escrito que não deu.

| Arquivo | O que guarda |
|---|---|
| `01-decisao-do-dono.md` | esta página: o verbatim, a leitura e a fronteira do que se decide |
| [[02-inventario-codigo]] | a medição: o que o código faz hoje, linha a linha |
| [[03-spec]] | RNs novas (RN-543 a RN-546), histórias S322/S323 com Given/When/Then, vetável |
| [[04-fila-codigo]] | tarefas atômicas com território, dependências e gates |

O épico [[LEELA-E04-config-vendas]] é atualizado na mesma aterrissagem (delta + marca no
§"não decide" da RN-498), a RN-158 ganha o delta no épico dono ([[LEELA-E12-landing]]), e o card
entra no [[V1-KANBAN]] no padrão épico → história → tarefa.
