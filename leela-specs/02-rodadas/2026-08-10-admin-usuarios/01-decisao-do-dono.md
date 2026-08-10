---
tags: [leela, decisoes, rodada, admin, usuarios, onboarding, vitrine, aprovacao]
aliases: ["Admin usuários 2026-08-10", "SPEC-ADMIN-USUARIOS", "ADMIN-USUARIOS-FLUXO"]
trace: leela-admin-usuarios-20260810
lote: SPEC-ADMIN-USUARIOS
data: 2026-08-10
fonte: decisão ADMIN-USUARIOS-1 do dono em 2026-08-09, registrada em 2026-08-09-decisoes-dono
---

# 01-decisão do dono · o cadastro aparece no painel master, e o dono libera

## O verbatim, sem retoque

> "admin usuários, esse cadastro deve aparecer no painel master. que lá eu aprovarei, passando um
> código. Ou liberando diretamente o acesso. O modal de liberar acesso deve aparecer depois que a
> pessoa já entra no sistema e tenta fazer alguma ação."

Registrado em [[01-decisoes-dono]] (bloco 13, rodada `2026-08-09-decisoes-dono/`), com a fila de
trabalho em `02-fila-execucao.md` §ADMIN-USUARIOS-FLUXO. Na mesma leva, o **ADMINSEP-3** cravou a
identidade do aprovador: super admin é `inguzbuilders@gmail.com`, conta demo nunca.

## A leitura do maestro, herdada e mantida

A frase desenha um fluxo inteiro, em três peças. O **diretório**: quem se cadastra passa a
aparecer no painel da plataforma — hoje as duas pessoas que se cadastraram em 06/08 são
invisíveis, e o único caminho é o Console do Firebase. A **aprovação, com duas portas**: passar
um código, que é o caminho que existe (`/plataforma/convites` emite, RN-414 resgata), **ou**
liberar o acesso diretamente, que é porta nova — hoje não há como conceder acesso sem que a
pessoa digite um código. O **gatilho do modal**: "depois que a pessoa já entra no sistema e tenta
fazer alguma ação".

A terceira peça é onde mora o coração desta rodada, porque já existe uma regra no ar dizendo
quase isso: a **RN-510** (D-ONB-6, 06/08) põe a conta sem código **dentro** do painel, em modo
vitrine, com o aviso subindo na **primeira interação**. Reconciliar as duas frases do mesmo
autor — a de 06/08 e a de 09/08 — sem quebrar nenhuma é o trabalho de [[03-spec]].

## O que esta rodada formaliza, e o que ela não decide

**Formaliza.** As três peças acima, contra o código real ([[02-inventario-codigo]]): onde o
estado "aguardando" já vive, o que o resgate de código já faz, o que a liberação direta precisa
fazer para terminar **no mesmo lugar** que o resgate termina, a régua proposta para "tenta fazer
alguma ação", e o rastro de auditoria do ato de aprovar. A tela em si é a **S1615** da
SPEC-ADMIN-VISAO (uma rota, dois modos, Fila como padrão) — esta spec conecta, não duplica.

**Não decide.** Três coisas ficam com o dono, e nenhuma sobe sem resposta:

- **ADMINVISAO-5 (a)** — se "ação" é qualquer gesto sobre acionável (ratifica a RN-510) ou só
  ação bloqueada. A spec escreve a régua e propõe ratificar; o veto é dele.
- **ADMINVISAO-5 (b)** — como a liberação direta termina do lado da pessoa. A spec agora propõe
  um default com custo medido, onde a rodada de 09/08 tinha deixado sem proposta; continua
  vetável.
- **ADMIN-USUARIOS-2** (novo) — recusa e revogação. A frase dele cobre aprovar; não cobre
  recusar um cadastro nem desfazer uma liberação. Nenhum default silencioso: vai ao painel.

## O que a decisão NÃO reabre

- **O cadastro continua livre** (RN-411): "aparecer no painel master" é leitura de estado que já
  existe, não pedágio novo na porta.
- **A vitrine continua sendo a experiência da espera** (RN-510): a conta sem código ENTRA e vê a
  vitrine. A frase de 09/08 não manda ninguém de volta para a parede da RN-416.
- **O mecanismo do resgate não muda** (RN-414): atômico, anti-enumeração, rate-limit (RN-415).
  A porta do código é a mesma; o que nasce é a segunda porta e o rastro das duas.
- **A propriedade da vitrine não ganha exceção**: nenhuma consulta tenant-scoped sai da vitrine,
  provado por allowlist fechada. Se a saída da vitrine sem resgate exigir uma leitura nova, ela
  entra **na allowlist, nomeada** — nunca por fora da medição.

## O que esta rodada entrega

Docs somente. Zero código, zero mudança em Rules, zero deploy, zero leitura de produção. Toda
afirmação sobre o sistema tem caminho `arquivo:linha` citado; onde não deu para medir, está
escrito que não deu.

| Arquivo | O que guarda |
|---|---|
| `01-decisao-do-dono.md` | esta página: o verbatim, a leitura e a fronteira do que se decide |
| [[02-inventario-codigo]] | a medição: cadastro, resgate, vitrine e painel master, linha a linha |
| [[03-spec]] | RNs novas (RN-547 a RN-552), história S1616 com Given/When/Then, vetáveis |
| [[04-fila-codigo]] | tarefas atômicas com território, dependências e gates |

O épico [[LEELA-E16-plataforma-superadmin]] é atualizado na mesma aterrissagem (delta novo +
amarra na RN-510), o painel [[DECISOES-ABERTAS]] troca ADMIN-USUARIOS-1 (decidido) por
ADMIN-USUARIOS-2 (recusa/revogação) e atualiza o ADMINVISAO-5 no lugar, e o card entra no
[[V1-KANBAN]] no padrão épico → história → tarefa.
