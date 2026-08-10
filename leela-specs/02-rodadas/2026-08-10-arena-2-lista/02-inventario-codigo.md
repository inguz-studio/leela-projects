---
tags: [leela, inventario, rodada, arena, pilares, modalidades, taxonomia, medicao]
trace: leela-arena-2-20260810
lote: SPEC-ARENA-2-LISTA
data: 2026-08-10
---

# 02-inventário de código · onde pilares e modalidades vivem hoje

> Toda linha citada foi lida nesta lane, em 10/08, contra o HEAD do repositório. O único dado de
> produção citado vem do **inventário congelado da purga de 10/08**
> (`.nirvana/outputs/leela-purga-20260810/`), produzido por outra lane — esta não leu produção.

## 1 · Os pilares existem, e têm regra canônica desde o E05

A frase do painel que abriu o ARENA-2 — *"a lista dos pilares de bem-estar não existe em
documento nenhum"* — envelheceu mal, e o defeito foi da busca, não do repositório. A varredura
de 04/08 procurou "pilares de bem-estar" ao pé da letra
(`02-rodadas/2026-08-04-pos-pagamento/02-spec-pos-pagamento-e-arena-social.md:159-169`) e não
olhou o vocabulário dos clubes, onde os pilares moram com outro sobrenome:

- **O tipo e a lista.** `type Pilar = 'fisico' | 'mental' | 'espiritual'`
  (`packages/core/src/clubs/catalogo-acoes.ts:23`), com a constante `PILARES` (`:25`) e a guarda
  `isPilar` (`:27-29`). O comentário do próprio tipo os chama de **"os 3 pilares do produto
  (Físico · Mental · Espiritual)"** (`:22`).
- **A regra.** RN-114, dona no [[LEELA-E05-clubs]]: *"Catálogo tem 16 ações em 3 pilares
  (7 Físico, 5 Mental, 4 Espiritual)"* (`LEELA-E05-clubs.md:51`). O arquivo materializa as 16 em
  `CATALOGO_ACOES` (`catalogo-acoes.ts:55-75`), com `TOTAL_ACOES_CATALOGO = 16` (`:78`) e a
  distribuição 7/5/4 em `ACOES_POR_PILAR` (`:81-85`). O cabeçalho avisa: **"NÃO alterar sem
  revisão de produto: apps e seeds derivam daqui"** (`:53`).
- **O espelho em produção.** O seed `functions/src/seed/catalogoAcoes.seed.ts` grava as 16 ações
  em `catalogoAcoes/{acaoId}` a partir da constante (`:52`), e as Rules trancam: leitura global
  autenticada, `write: if false` (`firestore.rules:2856-2859`). O inventário congelado da purga
  confere: **16 docs**, ids `caminhar` a `yoga-alongamento`, com os campos
  `{id, nome, pilar, unidade, unidadeBase, pontosBase, icone}` — o doc `catalogoAcoes/caminhar`
  tem `pilar: "fisico"` (`inventario-congelado.json:1029-1054`; contagem em `analise.txt:190`;
  lista completa em `plano-purga-legivel.txt:298-313`).

**Veredito de fonte única:** a **constante do core é a verdade**; a coleção é derivada dela por
seed e ninguém mais escreve. Não há terceira cópia.

### Quem consome os pilares hoje

| Consumidor | O quê | Onde |
|---|---|---|
| Desafios (core) | `minimoPorPilar` (Modelo C — RN-111) e o agregado `progressoPorPilar` (∑ só Function) | `packages/core/src/clubs/desafio.ts:135`, `:147`, `:86-90` |
| Jornada do atleta (core) | `pontosPorPilar` por participante e `derivarProgressoPorPilar` | `packages/core/src/atleta/registro.ts:83`, `:274-289` |
| Functions | `onRegistroWrite → recomputarAgregadosDesafio` mantém os agregados | `functions/src/jornada/onRegistroWrite.ts`, `functions/src/clubs/desafiosAggregates.ts` |
| Painel — Engajamento | `resumirPilares` (média ponderada por `qtdParticipantes`, conserto D-1 da REV do redesign) e os rótulos `ROTULO_PILAR` (Físico/Mental/Espiritual) | `apps/painel/src/routes/clubes/engajamento/_lib/engajamento.ts:31-35`; conserto em `.nirvana/handoffs/leela-redesign-ds-20260809-FIX.md` §D-1 |
| Painel — Desafios | catálogo de 16 ações em tabs por pilar no editor | `apps/painel/src/routes/clubes/clube/desafios/DesafioEditor.tsx` |
| Landing | **nada** — zero ocorrência de "pilar" fora de build | grep desta lane em `apps/landing`, 10/08 |

Dois fatos que a spec usa: os **rótulos** de exibição dos pilares vivem hoje **no painel**
(`ROTULO_PILAR`), não no core — a Arena mora na landing, e sem mover o rótulo nasceria a segunda
cópia; e o mapa da REDESIGN-V2 confirma que o bloco de pilares do Engajamento é o único gráfico
de pilar do produto, alimentado por `Desafio.progressoPorPilar?` que só o Modelo C reporta
(`.nirvana/outputs/leela-redesign-v2-20260810/mapa-dados-reais.md`, linha "Pilares (equilíbrio)").

## 2 · "Modalidades" são duas coisas no produto, e só uma é taxonomia

**A do clube é vocabulário fechado.** `MODALIDADES_CLUBE`
(`packages/core/src/clubs/clube-opcoes.ts:41-51`): Corrida de rua, Trail, Ciclismo, MTB,
Caminhada, Triatlo, Natação, Funcional, Bem-estar/Yoga — nove termos, com a guarda
`isModalidadeClube` (`:54-56`). O clube guarda o valor literal do termo
(`clube.ts:58` — *"∈ MODALIDADES_CLUBE (vocabulário fechado)"* — e a validação em `:154`). O
próprio arquivo nasceu de decisão do dono de **tirar o texto livre** (`clube-opcoes.ts:4-9`,
fix-tema-clube). No mesmo arquivo vive `CATEGORIAS_CLUBE` (`:23-29`), que é **tipo de
organização** (Assessoria esportiva, Academia…), não interesse — fica fora da derivação.

**A do evento é texto livre por evento.** `Evento.modalidades: string[]` é a *"lista de
percursos/modalidades do evento"* (`packages/core/src/eventos/evento.ts:120-121`), digitada pelo
organizador e editável pelas RN-500 a RN-505 (E04). A vitrine a trata como unidade de venda
(`ModalidadeVitrine`, `packages/core/src/eventos/vitrine.ts:51-57`), e a home da landing apenas
concatena os valores (`ev.modalidades.join(' · ')`,
`apps/landing/app/(public)/page.tsx:158`) — **não existe categorização taxonômica na home hoje**.

**Por que a derivação não usa a do evento.** Três razões, e cada uma basta: é texto livre de
terceiro (derivar dali entregaria o vocabulário do produto a quem digita percurso); é percurso,
não interesse ("5k" não é um interesse de bem-estar); e não há massa — a produção congelada em
10/08 tem **2 eventos**, com `["5k","10k"]` e `["Inscrição de teste"]` (inventário da purga).
Pela mesma medição, a proposta ao dono **não pode** vir com "número de eventos por termo", que o
bloco 10 imaginou: o denominador honesto hoje é zero evento real.

## 3 · O que a "arena" é no canône atual

Não há épico próprio de arena, e o **E11 não é ela** — E11 é analytics (RN-820-823). A Arena
Social vive no **E12** desde 04/08:

- **RN-471** ([[LEELA-E12-landing]]:2885-2899) — escopo e campos; é ela que carrega a frase "a
  lista dos pilares não existe em doc nenhum e está no painel como ARENA-2", que esta rodada
  corrige com marca.
- **RN-472** (`:2901-2912`) — o dado sensível (gêneros de pessoas) com consentimento específico;
  os interesses em pilares **não** são esse campo, mas moram no mesmo doc e herdam o regime da
  Arena (default privado).
- **S1226** (`:2942-2961`) — a história da seção, "gated pelos vetos ARENA-1/2/3".
- **Os três vetáveis:** ARENA-1 decidido em 09/08 (social é futuro; jurídico no LGPD-1 — bloco 9
  de `2026-08-09-decisoes-dono/01-decisoes-dono.md`); ARENA-2 decidido em 09/08 (esta rodada);
  ARENA-3 decidido em 09/08 pelo corte do painel (seção da área do cliente —
  `2026-08-09-corte-painel/01-decisoes-maestro.md:98` e §359), com a fronteira do E17 anotada
  (`LEELA-E17-perfil-social.md:261`).
- **Board:** card da Arena no [[V1-KANBAN]] (bloco E12, S1226 com T1-T3), ainda dizendo "aguarda
  os vetos ARENA-1 e ARENA-2" — atualizado nesta aterrissagem.
- A spec de origem está em `2026-08-04-pos-pagamento/02-spec-pos-pagamento-e-arena-social.md`
  §Parte 3 (campos, LGPD, e o § "Os pilares de bem-estar não existem em doc nenhum — ARENA-2",
  que esta rodada supera).

## 4 · O radar e os pilares — conferência que corrige o brief

O brief desta lane dizia "RN-535 usa pilares — cite, não mexa". A citação vai, e com a correção:
a **RN-535 não usa pilares**. Ela define o engajamento do radar como volume medido em dois eixos
— contagem de mensagens por remetente (`n`) e `diasAtivos`
(`LEELA-E20-radar-comunidade.md:885-892`). Grep desta lane por "pilar" no E20 inteiro e na rodada
`2026-08-09-radar-whatsapp/`: **zero ocorrências**. O único "engajamento por pilar" do produto é
o bloco do painel citado no §1, e ele lê agregado de desafio (RN-114), não radar.

Consequência para a spec: a fronteira com o radar é total — a lista da Arena não lê, não escreve
e não redefine nada do E20; a RN-535 fica citada como a régua de engajamento **do radar**, e os
dois vocabulários não se tocam.

## 5 · O que NÃO existe, e a spec precisa criar ou declarar

1. **Rótulo de pilar fora do painel.** `ROTULO_PILAR` vive em
   `apps/painel/.../engajamento.ts:31-35`. A Arena (landing) precisaria dos mesmos rótulos —
   sem subir isso ao core, nasce a segunda cópia (vira tarefa).
2. **Qualquer derivação pilares+modalidades.** Nenhuma função hoje compõe as duas fontes numa
   lista só; os dois vocabulários nunca se encontraram em código.
3. **Modelo de interesses da Arena.** A S1226-T1 (modelo + Rules) segue não construída — o shape
   do doc é da task, depois dos vetos (premissa 4 da spec POSPAG). Esta rodada fixa o contrato
   dos valores (ids canônicos da fonte), não o shape.
4. **Sobreposição entre as fontes.** Correr (ação) ↔ Corrida de rua (modalidade), Caminhar ↔
   Caminhada, Pedalar ↔ Ciclismo, Nadar ↔ Natação, Yoga/alongamento ↔ Bem-estar/Yoga — cinco
   pares nomeando a mesma prática. Fundir é escolha de vocabulário: vetável ARENA-4.
