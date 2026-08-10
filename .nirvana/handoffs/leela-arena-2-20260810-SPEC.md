# Handoff · leela-arena-2-20260810 · lane SPEC

- **trace:** leela-arena-2-20260810
- **lane:** SPEC (documentação pura — zero código, zero teste, zero deploy, zero leitura de produção)
- **perfil:** sf-backend-lead (software-forge) com lente de produto
- **brief:** `.nirvana/briefs/leela-arena-2-lista-20260810-enriched.md`
- **território:** `leela-specs/**` + este handoff
- **estado:** ✅ ATERRISSADA E COMMITADA (push feito no fecho da lane)

## O que a lane entregou

Rodada **`leela-specs/02-rodadas/2026-08-10-arena-2-lista/`** (SPEC-ARENA-2-LISTA), que
formaliza a decisão ARENA-2 de 09/08 (*"de acordo com os pilares e modalidades disponíveis?
podemos usar de base"*) contra o código real, **sem tocar em nada de ARENA-1/social**:

| Arquivo | Conteúdo |
|---|---|
| `01-decisao-do-dono.md` | verbatim do bloco 10, leitura herdada + a premissa dela corrigida por medição, fronteira |
| `02-inventario-codigo.md` | onde pilares e modalidades vivem, arquivo:linha — core, functions, rules, painel, landing, produção congelada |
| `03-spec.md` | RN-553 a RN-557, história S1245 (GWT), as 4 perguntas do brief respondidas, vetável ARENA-4 com a tabela de 20 termos |
| `04-fila-codigo.md` | 3 tarefas com território e gates; não compete com a S1226 — entrega o contrato que a S1226-T2 consome |

## O achado que muda o item (o coração da lane)

**A listagem que o painel dizia não existir, existe.** O item ARENA-2 nasceu da frase "a lista
dos pilares de bem-estar não existe em documento nenhum" — mas a varredura de 04/08 buscou
"pilares de bem-estar" ao pé da letra e não olhou o vocabulário dos clubes. Medido em 10/08:

- **RN-114** (E05) define os **3 pilares do produto** (Físico, Mental, Espiritual) e as **16
  ações** do catálogo — `packages/core/src/clubs/catalogo-acoes.ts:23-85`, semeadas em
  `catalogoAcoes` (16 docs em produção, conferidos no inventário congelado da purga de 10/08 —
  esta lane não leu produção).
- **MODALIDADES_CLUBE** (`clube-opcoes.ts:41-51`) fecha as 9 modalidades do clube.
- As modalidades **do evento** são texto livre de percurso ("5k"/"10k", 2 eventos de teste na
  produção congelada) e ficam **fora** da derivação por decisão medida.
- A **fonte única é a constante do core**, não a coleção (a coleção é espelho semeado,
  `write: if false` — `firestore.rules:2856-2859`).

Correção ao brief, com prova: **a RN-535 não usa pilares** (engajamento do radar = mensagens +
`diasAtivos`; grep por "pilar" no E20 e na rodada do radar: zero). Citada como fronteira,
intocada. O único "pilar" em tela hoje é o bloco do Engajamento do painel (`resumirPilares`
sobre `Desafio.progressoPorPilar`), que segue intocado.

## RNs novas (todas donas no E12)

- **RN-553** · a lista deriva da taxonomia canônica, de fonte única (constantes do core; nenhuma cópia, nenhuma leitura de Firestore, nenhuma edição por terceiro)
- **RN-554** · interesse grava o id canônico; termo que morre vira órfão declarado (some da tela, nenhum processo apaga, sai no save da própria pessoa); termo novo entra no deploy sem migração
- **RN-555** · ordem da fonte (nunca alfabética/popularidade) e vazios honestos; rótulos de pilar sobem do painel para o core
- **RN-556** · uma lista, dois consumidores (Arena + home futura, D-0802-1) e as 4 fronteiras: social, radar, agregados de desafio, vitrine/evento
- **RN-557** · o vocabulário exposto nasce do corte do dono — **condicionada ao ARENA-4** (número consumido de qualquer jeito, molde RN-546/552)

Índice atualizado: faixa mais alta = **557**, próxima livre = **558**. Sweep RN-553..565 fora do
índice/rodada: só prosa de varreduras anteriores (refeito antes do commit). A linha de contagem
do índice também **reparou a lacuna da SPEC-ADMIN-USUARIOS** (547-552 não tinham entrado na
tabela de faixas nem na conta; agora 288).

## História nova

**LEELA-S1245** · A lista de interesses nasce da taxonomia (E12) — T1 derivação no core (sem
veto), T2 lista exposta (aguarda ARENA-4), T3 órfão declarado. Numeração conferida: S1244 era a
mais alta da faixa E12; sweep S1245..1249 repo-wide zero antes desta rodada. Sem ⚔ na fila —
nada toca dinheiro, claim ou dado sensível (o campo do art. 11 segue na S1226 com a rota de lá).

## Vetáveis

- **ARENA-4** — NOVO no painel (troca no padrão ESTOURO-1→2): o corte do vocabulário, com a
  tabela derivada integral (20 termos em 3 pilares, 5 fusões marcadas, 2 rótulos reescritos pela
  esteira e declarados). Default proposto: ratificar a tabela. **ARENA-2 saiu** (decidido 09/08 +
  formalizado hoje). A conta do painel não muda (30).
- **ARENA-1 não foi tocado** — social é fronteira desta spec, não assunto; segue com a lane das
  decisões de 09/08 e o jurídico no LGPD-1.

## Épico e boards (mesma aterrissagem)

- **E12** (`03-canon/epics/LEELA-E12-landing.md`): delta novo "SPEC-ARENA-2-LISTA · 2026-08-10"
  com as cinco RNs e a S1245; marca **+2026-08-10** na RN-471 (a frase "a lista não existe"
  envelheceu, apontando para a RN-553); marca no gate da S1226 (ARENA-2/3 fechados, gate vivo =
  ARENA-4).
- **Índice de RNs**: linha 553-557, linha 547-552 reparada, contagem 288, §próximo número → 558.
- **V1-KANBAN**: card da Arena atualizado (ARENA-2 ✅, aguarda ARENA-4) + S1245 (T1-T3) sob o
  card, padrão épico → história → tarefa.
- **BOARD-EPICOS**: nota +2026-08-10 no tail da linha E12.
- **DECISOES-ABERTAS**: header "Terceira troca de 10/08" + ARENA-2 → ARENA-4.

## O que fica para as próximas lanes

1. **ARENA-4 com o dono** — o corte da tabela. Nenhuma tela de interesses nasce antes.
2. **S1245-T1** pode ser construída sem veto (contrato puro + rótulos no core); T2 espera
   ARENA-4; a seção continua sendo a S1226, com os gates dela (inclusive o art. 11 ⚔).
3. A purga do restante das decisões de 09/08 no painel (ARENA-1 incluído) segue sendo de outra
   lane, como o registro daquela rodada declara.

## Commits desta lane

1. `docs(spec): rodada SPEC-ARENA-2-LISTA — a lista da Arena deriva da taxonomia real` — os 4 arquivos da rodada
2. `docs(canon): E12 ganha o delta SPEC-ARENA-2-LISTA e o indice avanca para RN-558 livre` — épico + índice
3. `chore(board): terceira troca de 10/08 — ARENA-2 sai, ARENA-4 entra` — painel + kanban + board de épicos
4. `chore(handoff): fecho da lane SPEC leela-arena-2-20260810` — este arquivo

Todos `git commit --only` com pathspec explícito; push no fecho.
