---
tags: [leela, decisoes, rodada, arena, pilares, modalidades, interesses, taxonomia]
aliases: ["Arena 2 lista 2026-08-10", "SPEC-ARENA-2-LISTA"]
trace: leela-arena-2-20260810
lote: SPEC-ARENA-2-LISTA
data: 2026-08-10
fonte: decisão ARENA-2 do dono em 2026-08-09, registrada em 2026-08-09-decisoes-dono
---

# 01-decisão do dono · a lista da Arena deriva de pilares e modalidades

## O verbatim, sem retoque

> "arena2- Nao temos essa listgem? de acordo com o spilares e modaldiades disponiveis? podemos
> usar de base."

Registrado em [[01-decisoes-dono]] (bloco 10, rodada `2026-08-09-decisoes-dono/`).

## A leitura do maestro, herdada — e uma premissa dela corrigida por medição

A instrução é o **"podemos usar de base"**. O dono não crava a lista nem pede proposta editorial
do zero: manda **derivar** da taxonomia existente. O que fecha é o **método** — a lista de
interesses da Arena sai dos pilares e das modalidades disponíveis, e não de uma invenção. As duas
opções do painel saíram com a decisão: nem a lista ilustrativa da esteira, nem a lista cravada por
ele de uma vez.

A premissa que **cai** é a resposta "não" à pergunta dele. O painel dizia que *"a lista dos
pilares de bem-estar não existe em documento nenhum"*, e a leitura do bloco 10 repetiu isso. O
inventário desta lane mediu o contrário: **a listagem existe, com nome de produto e regra
canônica**. A RN-114 define o catálogo de 16 ações em **3 pilares** (Físico, Mental, Espiritual),
versionado em `packages/core/src/clubs/catalogo-acoes.ts` e semeado em produção
(`catalogoAcoes`, 16 docs conferidos no inventário congelado da purga de 10/08). A varredura de
04/08 buscou "pilares de bem-estar" ao pé da letra e não olhou o vocabulário dos clubes — o
detalhe está em [[02-inventario-codigo]] §1. A pergunta do dono ("Não temos essa listagem?") tem
resposta verdadeira **sim**, e é exatamente a que ele mandou usar de base.

Isso torna a decisão **mais barata** do que o bloco 10 supôs: derivar não é inventar categorias
novas, é compor o que a RN-114 e as modalidades do clube já dizem, com o corte final dele.

## O que esta rodada formaliza, e o que ela não decide

**Formaliza.** A derivação, contra o código real: qual constante é a verdade dos pilares e das
modalidades (fonte única — [[03-spec]] §RN-553), o que acontece quando um termo nasce ou morre
(RN-554), a ordem e os vazios (RN-555), e a fronteira do que a lista não cruza (RN-556). Uma
história (S1245) com critérios GWT e a fila de código.

**Não decide.** ⚔ O **corte do vocabulário exposto** é escolha de marca e fica com o dono. A
derivação encontra a decisão embutida que o bloco 10 previu: as fontes se sobrepõem (Correr do
catálogo e Corrida de rua do clube são a mesma prática com dois rótulos), e fundir, manter ou
cortar termos é vocabulário de produto. A proposta sobe inteira, com a origem de cada termo ao
lado, no vetável **ARENA-4** ([[DECISOES-ABERTAS]]). Nenhum default silencioso: nenhuma tela
nasce antes do corte.

Uma honestidade que o bloco 10 pedia e a medição nega: a proposta **não** vem com "número de
eventos por termo ao lado". A produção congelada em 10/08 tem **2 eventos**, com modalidades
`["5k","10k"]` e `["Inscrição de teste"]` — texto livre de percurso, sem valor taxonômico e sem
massa. A proposta se ancora nas constantes canônicas (16 ações + 9 modalidades de clube), e o
porquê está no inventário §2.

## O que a decisão NÃO reabre

- **Nada de social.** ARENA-1 (visibilidade do perfil) foi respondida em 09/08 como direção de
  futuro e **não é assunto desta rodada**: a visibilidade da Arena segue o default restrito da
  RN-471/RN-472 (só a própria pessoa), e o jurídico do campo sensível segue no **LGPD-1**. Esta
  spec não expõe dado a ninguém.
- **O radar (E20) fica intocado.** A RN-535 define o engajamento do radar como volume em dois
  eixos (mensagens e `diasAtivos`) — ela **não consome pilares**, e a conferência está no
  inventário §4. Citada como fronteira, não mexida.
- **RN-114 intocada.** O catálogo de ações continua com 7/5/4 por pilar e dono no E05. A Arena
  passa a **consumir** a taxonomia, nunca a redefini-la.
- **RN-500 a RN-505 intocadas.** A lista de modalidades **do evento** é outra coisa (percursos,
  editáveis pelo organizador) e não entra na derivação — a razão está no inventário §2.

## O que esta rodada entrega

Docs somente. Zero código, zero Rules, zero deploy, zero leitura de produção (o dado de
`catalogoAcoes` vem do inventário congelado da purga, produzido por outra lane).

| Arquivo | O que guarda |
|---|---|
| `01-decisao-do-dono.md` | esta página: o verbatim, a leitura e a fronteira do que se decide |
| [[02-inventario-codigo]] | onde pilares e modalidades vivem hoje, arquivo:linha |
| [[03-spec]] | RNs novas (RN-553 a RN-557), história S1245 com Given/When/Then, vetável |
| [[04-fila-codigo]] | tarefas atômicas com território, dependências e gates |

O épico [[LEELA-E12-landing]] é atualizado na mesma aterrissagem (delta + marca na RN-471 e no
gate da S1226), o índice de RNs avança para a 558 livre, e o card entra no [[V1-KANBAN]] no
padrão épico → história → tarefa. No painel, o **ARENA-2 sai** e o **ARENA-4** entra no lugar,
no padrão da troca ESTOURO-1→2.
