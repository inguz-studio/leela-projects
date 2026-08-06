---
tags: [leela, fila, rodada, painel-cliente, ponte-profissional]
trace: leela-spec-painel-cliente-20260806
lote: SPEC-PAINEL-CLIENTE
data: 2026-08-06
---

# 05-fila · A ordem de execução

> Nada aqui foi construído. A fila existe para quando o dono destravar, e a ordem não é
> arbitrária: a ponte quebrada é o que dói hoje, então ela vem antes da casca.

## Por que a ordem é esta

A **onda A** conserta o que está quebrado no ar: a porta que manda a participante a um cadastro
que a recusa. Ela é independente da casca e cabe sozinha num lote.

A **onda B** é a forma do painel, e é a que depende da resposta do **PCLIENTE-1**. Enquanto o
dono não olhar as simulações, ela não sai — construir a casca errada é o desperdício exato que
esta spec existe para evitar.

A **onda C** é a travessia nos dois sentidos, e ela precisa da B de pé para ter onde morar.

## Onda A · A ponte

| # | Task | O que faz | Território | Depende de | ⚔ |
|---|---|---|---|---|---|
| A1 | `S1234-T1` | A promoção no servidor: cria `profissionais/{uid}` em `aguardando_convite`, carimba o termo do profissional, idempotente, com as cinco recusas nomeadas | `functions/src/platform` (novo), `packages/api-client` | — | ⚔ |
| A2 | `S1234-T3` | A prova de fronteira: a ponte não concede tenant, não concede `platform_admin`, não altera papel | `functions/src/__tests__` | A1 | ⚔ |
| A3 | `S1234-T2` | O cartão da ponte nos dois estados, com o aceite do termo e o aviso do segundo login | `apps/landing/app/(public)/minha-conta` | A1 | — |
| A4 | `S1234-T4` | A demonstração ponta a ponta: cliente atravessa, aterrissa em vitrine, o aviso sobe e o código resgata | preview/seed | A3 | — |

**Cuidado de território na A3.** `PortasDaConta.tsx` e `portaOrganizador.ts` são os dois arquivos
que mudam, e o segundo tem um comentário pinado pela FRONTEIRA-AUTH que **não pode ser
"consertado"**: ali o papel literal está certo, porque a pergunta é *"esta conta é só da
plataforma?"*. Quem mexer sem ler o comentário tira do dono a porta de organizador.

## Onda B · A casca — retida pelo PCLIENTE-1

| # | Task | O que faz | Território | Depende de | ⚔ |
|---|---|---|---|---|---|
| B1 | `S1233-T1` | A casca: cabeçalho de conta, navegação persistente, comportamento em 320 pixels | `apps/landing/app/(public)/minha-conta`, `apps/landing/app/_ds/ds.ts` | **PCLIENTE-1** | — |
| B2 | `S1233-T2` | Os estados de sistema da área unificados, com vazio e falha separados por construção | mesmo território | B1 | — |
| B3 | `S1233-T3` | A saída da conta ganha lugar fixo na casca | mesmo território | B1 | — |

**Pré-requisito de uma linha.** `AppShell`, `PageHeader` e `Skeleton` precisam entrar no
boundary de cliente da landing (`apps/landing/app/_ds/ds.ts`). São três nomes no `export`, e o
arquivo já explica por que o boundary existe.

## Onda C · A travessia

| # | Task | O que faz | Território | Depende de | ⚔ |
|---|---|---|---|---|---|
| C1 | `S1235-T1` | O par do alternador no lado do cliente, com o mesmo vocabulário do `AlternadorDePainel` | `apps/landing/app/(public)/minha-conta` | B1, A3 | — |
| C2 | `S1235-T2` | A copy da travessia e o rebatismo da RN-468 nos rótulos | mesmo território | C1 | — |

## Três coisas que atravessam a fila

**O termo do profissional já existe.** A RN-466 define os dois termos e a constante de versão. A
promoção **não** cria termo novo, e criar um seria a divergência que a RN-466 existe para
impedir.

**A promoção convive com o `onCreateUser`.** O gatilho de conta nova grava `atletas/{uid}` por
conta própria. A escrita de `profissionais/{uid}` é outro documento e não colide, mas a task
precisa provar que não sobrescreve o papel `athlete` da conta — a RN-512 diz que a ponte não
concede papel nenhum, e é isso que a A2 falsifica.

**Nada nesta fila abre Rule.** A área continua servida por callables do próprio dono da conta.
Se alguma task precisar de Rule nova, ela está errada e volta para a spec.

## O que não está nesta fila

- O código de seis dígitos e a porta única de criar conta (CONTA-1, CONTA-2). Outra fila,
  outra lane, e a ponte não depende deles.
- Reembolso e troca de titularidade (PCLIENTE-5). Card de backlog no [[V1-KANBAN]].
- A Arena Social (PCLIENTE-6).
- O kit do design system, que é da lane `DS-CLAUDE-DESIGN`.

## Estado

Nenhuma task despachada. A onda A pode sair a qualquer momento; a B e a C esperam o
**PCLIENTE-1**.
