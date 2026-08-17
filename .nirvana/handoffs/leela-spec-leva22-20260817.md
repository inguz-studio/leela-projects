---
tags: [leela, handoff, leva22, spec, kits, modalidades, terciario]
aliases: [Handoff SPEC-LEVA22]
atualizado: 2026-08-17
---

# Handoff · SPEC-LEVA22 (retomada de lane morta)

- **Trace:** `leela-redesign-v2-20260810` · lane `SPEC-LEVA22-RESUME`
- **Árvore:** `main` de `C:\dev\LEELA`, checkout principal, `commit --only` com pathspec
- **Escopo:** registro, medição, spec e fila. ⛔ **Zero código de produto.**

## O que aconteceu antes desta lane

A lane original morreu em voo por volta das 16h10 de 17/08, com o terminal travado e **sem
commit**. Ela tinha ido longe: a rodada `2026-08-17-leva22/` inteira estava escrita no disco
(seis arquivos, ~98 KB), o adendo da leva 22 estava no registro do dia e o delta da RN-574
estava no E01. Nada disso existia para o git.

Esta lane **não confiou que estivesse completo**. Conferiu item a item contra os 17 pedidos da
fala e achou cinco buracos, todos de aterrissagem — a matéria-prima estava boa, o que faltava
era o cânone receber o que a rodada produziu.

## O que faltava, e foi feito

| Buraco | O que foi feito |
|---|---|
| **Índice de RNs intacto** — ainda dizia que a faixa mais alta era a 573 e a próxima livre, a 574 | Parágrafo da leva 22 escrito, conta de definições de 304 → **307**, **próxima livre = 577** |
| **E04 sem delta** — a RN-575 e a MODALIDADES-1 não existiam no épico dono | Delta escrito: RN-575 com o veredito do snapshot, e a S316 re-ancorada tarefa a tarefa (T4 cresce, T7 nasce) |
| **E03 sem delta** — a RN-576 e a marcação da RN-200 não existiam | Delta escrito + **RN-200 marcada na linha `:39`**, legível e não apagada |
| **Boards mudos** — nenhum card para as quatro ondas | Card no `V1-KANBAN` ancorado no E01 (S047 paga, S048/S049/S050 na fila, S316 re-ancorada) + nota datada no `BOARD-EPICOS` |
| **Referência quebrada** — o registro apontava CAIXA-1 e CRED-1 para `03-spec-caixa-e-credenciamento.md`, arquivo que não existe | Corrigido: CAIXA-1 → `03-spec-caixa-e-kit-composicao.md` §Parte 1 · CRED-1 → `01-spec-menu-terciario.md` §Aplicação 2 |

Uma correção a mais, de contrato: o cabeçalho do painel tinha ganhado um parêntese explicando
por que a contagem antiga estava errada. **Isso é ata, e ata não mora no painel** — a contagem
corrigida ficou, a narrativa saiu. A regra está escrita no topo do próprio arquivo.

## RNs consumidas

Faixa conferida **duas vezes** — no começo desta retomada e imediatamente antes do commit —
por grep de `RN-574` a `RN-580` sobre o corpus fora do índice. **Zero definições**: os únicos
retornos fora dos documentos desta leva são prosa de rodadas anteriores descrevendo as próprias
varreduras (`2026-08-12-decisoes-dono/03-rns-delta.md:178` e
`2026-08-17-carga-cognitiva/05-rns-delta.md:63,65`), o molde de sempre. Dupla conferência
porque **três lanes escreveram em 17/08** e a CARGA-COGNITIVA consumiu a 573 depois que a leva
22 começou.

| RN | O quê | Épico |
|---|---|---|
| **RN-574** | Navegação terciária é padrão nomeado: troca no lugar sem rolar, estado na URL, indicador deslizante, uma peça com duas orientações | [[LEELA-E01-design-system]] |
| **RN-575** | Preço de kit é editável, com efeito só para frente — recorta o kit da RN-200 sem revogá-la | [[LEELA-E04-config-vendas]] |
| **RN-576** | Kit é composição de itens cadastrados, e a contagem deriva do catálogo | [[LEELA-E03-operacao-evento]] |

**Próxima livre: 577.**

**Catorze dos dezessete itens não consomem número, e é deliberado.** Bordas, botão editar,
trilha, botão de voltar, espaçamentos, alertas, seletor de modalidades, fotos, tabela de
inclusos sem quantidade, o renome de Lotes para Modalidades, a página de vendas mudando de
casa, o credenciamento em duas abas, a barra de severidade quebrada e a tabela do caixa são
conformidade a régua que já existe (§2.16 do guia visual, RN-558, RN-568, RN-399). **No caso das
bordas isso é literal: não falta regra, falta o `Card` obedecer à que existe.**

## Cards criados

Card no `V1-KANBAN`, ancorado em [[LEELA-E01-design-system]]:

- **S047** ✅ paga — medição das 15 frentes, três specs, fila em quatro ondas, três RNs
- **S048** · onda A — a arrumação das telas de kits, 10 tarefas, dispara já
- **S049** · onda B — o `TabsPanel` no DS + Configurações de eventos + Credenciamento em 2 abas
- **S316** · onda C — história que **já existia**, re-ancarada no desenho pai/filho; T4 cresce de — para ⚔ e nasce a T7 (o renome)
- **S050** · onda D — carimbo do preço, as três travas, a trava de nome/composição, kit derivado do catálogo

## O que fica com o dono (4 vetáveis)

| Item | Pergunta | Onde |
|---|---|---|
| **CAIXA-1** | A tabela de inscrições da Caixa: redesenhar com propósito, trocar por divisão de receita, ou remover? Default proposto: remover | **painel** + `03-spec-caixa-e-kit-composicao.md` §Parte 1 |
| **FOTOS-1** | "50%" das fotos do kit é teto de largura ou outra escada de colunas? A galeria não tem px em lugar nenhum | `04-fila-em-ondas.md`, onda A |
| **CRED-1** | O check-in ganha scanner, ou só o corte em duas abas? O corte não tira nenhum toque | `01-spec-menu-terciario.md` §Aplicação 2 |
| **TERCIARIO-1** | Confirmar que "abas fixas" mata o formato âncora — *"me fiz claro?"* | `01-spec-menu-terciario.md` §O vetável |

**Só o CAIXA-1 entrou no painel**, porque é o único que é decisão de produto do dono sobre o que
uma tela conta. Os outros três são vetos de desenho dentro de ondas já decididas, e moram na
rodada — pôr os quatro no painel o encheria de coisa que não é escolha dele.

**MODALIDADES-1 saiu do painel.** Fechou pelo desenho dele, não pela escolha entre as opções.

## Os três vereditos que a lane devolve sem maquiagem

1. **Bordas dos cards de kit: REGRESSÃO, provada por diff.** Foi a lane que pagou a queixa
   anterior dele (D-1008-R11, `a60690c2`) que trocou o `<article>` sem borda pelo `Card`
   canônico, e o `Card` traz `border border-border` na receita base. **Não é defeito da lane; é
   defeito da receita que a lane obedeceu** — e a receita contradiz a §2.16 da própria casa, com
   43 instâncias herdando e nenhuma matando a borda.
2. **Snapshot da RN-200: SNAPSHOT-PARCIAL, e a metade que vale dinheiro já está pronta.** O
   preço do kit entra somado em `pedido.itens[].valorBase` e nunca é relido, então **editar hoje
   não altera um centavo de pedido nenhum**. Isso **rebaixa** a blindagem de dinheiro na onda D
   e **promove** a trava que impede nome e composição de reescreverem compra antiga, que é a
   parte da ordem que não parecia estar na ordem.
3. **A tabela do caixa não faz nenhuma das duas coisas que ele supôs.** Não tem coluna em R$ e
   não é matriz: são três listas independentes empilhadas, e a coluna somada de ponta a ponta dá
   **3× o número do cabeçalho**. Um terço das linhas já está no gráfico 40 px acima, e as três
   partições já existem **acionáveis** na tela de Inscritos.

## Travas para quem for construir

- ⛔ **A1 e A2 sobem no mesmo commit.** O teste que congela a borda
  (`superficie-cartoes.test.tsx:80,93`) foi escrito pela lane da R11; mudar só o código deixa a
  suíte vermelha, mudar só o teste apaga a memória.
- ⛔ **O aceite da borda não é "a borda sumiu"**, é "o contêiner continua legível nos três temas,
  sem borda", com olho por tema. **O wine é o caso de prova** e é onde fechar esta leva pode
  reabrir a D-1008-R11 no mesmo gesto.
- ⛔ **Renome e conteúdo sobem juntos** na onda C. A tela de Lotes declara hoje que não edita
  modalidades; renomeá-la antes da S316-T4 recria o círculo fechado que a DIAG-PAINEL-LACUNAS
  pagou para desfazer, com o agravante de que agora o nome prometeria.
- ⚠️ **A onda A cruza com a R1-c da leva 17** (mesma Caixa, mesmos kits). E onda B e onda C
  tocam as duas `eventos/_lib/subnav.ts` — se correrem em paralelo, **worktree por lane**.
- ⚠️ **Gate visual (L-011) vale para todas as ondas.** Nenhuma delas fecha por suíte verde.

## A lição de processo que esta leva deixa escrita

A MODALIDADES-1 estava formalmente correta: item no painel, contexto, caso de uso, job story,
opções com default proposto. E mesmo assim ele cobrou três vezes entre 10/08 e 17/08.
**Proposta vetável que fica semanas sem resposta não é decisão aguardando — é pendência que o
dono re-cobra como falha nossa**, porque do lado dele o que se vê é a tela que continua igual.

Vale ao lado da confissão da leva 17, que é o defeito oposto da mesma família: lá uma fala não
virou registro nenhum; aqui virou registro exemplar e não virou tela. A régua que fecha as
duas: **item de painel com default proposto e sem resposta em duas janelas do dono entra na
fila pelo default, com o veto seguindo aberto.** Não vale para dinheiro nem para dado pessoal,
que continuam sempre dele.

## Estado da árvore

Docs-only. Nenhuma suíte rodada, nenhum navegador aberto, nada em `apps/` ou `packages/`.
`commit --only` com pathspec explícito de `leela-specs/` e do handoff — sem `add .`, sem stash,
sem amend, porque a árvore é compartilhada e outras quatro lanes esperavam por ela.
