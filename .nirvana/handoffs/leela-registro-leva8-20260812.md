---
trace: leela-redesign-v2-20260810
lane: REGISTRO-LEVA8
alvo: main de C:/dev/LEELA — docs apenas (leela-specs/ + .nirvana/handoffs/), NENHUM código
data: 2026-08-12
estado: CONCLUÍDA — 4 commits pagos, 2 pushes; painel 12→4; RN-562 a RN-567; zero código; zero deploy
---

# REGISTRO-LEVA8 · handoff vivo

Brief-fonte: `.nirvana/briefs/leela-registro-leva8-20260812-enriched.md`. Oito decisões do
dono na manhã de 12/08, mais dois itens que ele deliberadamente **não** fechou.

## Contrato desta lane

- Rodada nova em `leela-specs/02-rodadas/2026-08-12-decisoes-dono/`.
- Painel canônico `leela-specs/01-produto/DECISOES-ABERTAS.md`: **12 → 4**.
- RNs novas conferidas contra o índice, épicos atualizados na MESMA aterrissagem.
- Cards novos na fila/kanban.
- Gate de frescor do Strava: URL + data da consulta no registro.
- Proibições: nenhuma linha de código de produto; não decidir CRM-4 nem o item 12 pelo
  dono; nada fora de `leela-specs/` + `.nirvana/handoffs/`.

## Faixa de RN — conferência feita ANTES de numerar

O brief avisou que a contagem da noite dizia 562, e que **o índice é a autoridade**. As duas
fontes batem: `03-canon/indice-de-regras-de-negocio.md` §Onde mora cada faixa termina em
560-561 (lane REGISTRO-BOARDS, 11/08 à noite), e o grep de `RN-562` a `RN-568` sobre
`leela-specs/` devolve **zero definições** — as únicas ocorrências de 563 e 565 são prosa de
rodadas anteriores descrevendo as próprias varreduras, o molde de sempre.

**Faixa consumida hoje: RN-562 a RN-567.** Duas regras já numeradas nascem agora na forma da
resposta, sem consumir número novo: a **RN-552** (condicionada ao ADMIN-USUARIOS-2 desde
10/08) e a **RN-557** (condicionada ao ARENA-4 desde 10/08).

| RN | Item do dono | Épico dono |
|---|---|---|
| RN-562 | CKLOGIN-1 | E12 |
| RN-563 | ARENA-4 (fonte física = Strava) | E12 |
| RN-564 | ARENA-4 (uma lista, três consumidores) | E12 |
| RN-565 | CRM-3 | E19 |
| RN-566 | CRM-2 | E19 |
| RN-567 | PB-11 | E12 |
| RN-552 (forma final) | ADMIN-USUARIOS-2 | E16 |
| RN-557 (forma final) | ARENA-4 (tabela exposta) | E12 |

Próxima livre depois desta lane: **568**.

## Gate de frescor do Strava — consultado em 2026-08-12

- **Fonte de máquina (autoridade dos ids):** `https://developers.strava.com/swagger/sport_type.json`
  — 56 valores no enum `SportType`.
- **Fonte humana (nomes e agrupamento):** `https://support.strava.com/en-us/articles/15402005-supported-sport-types-on-strava`
  — 52 tipos em 5 grupos.
- **A diferença de 4, medida e não presumida:** `VirtualRide`, `VirtualRun`, `VirtualRow` e
  `PhysicalTherapy` existem no enum e **não** aparecem na lista humana.
- A página `https://developers.strava.com/docs/reference/` **não** enumera o `SportType` —
  ela dá só os exemplos "Run, MountainBikeRide, Ride". Quem for refazer o gate vai direto ao
  `sport_type.json`, senão perde a lista inteira.

## Aterrissagens

Todos os commits com `--only` e pathspec explícito, na ordem: rodada → épicos → painel e
índice → boards.

### 1 · a rodada — `23110a70`

`leela-specs/02-rodadas/2026-08-12-decisoes-dono/` com os quatro arquivos da casa:

| Arquivo | O que carrega |
|---|---|
| `01-decisoes-dono.md` | as oito falas na íntegra, com leitura, efeito, onde aterrissa e condição de reabertura |
| `02-tabela-modalidades.md` | o gate de frescor do Strava, a tabela PT-BR de 50 termos, os 16 cortes, as 2 fusões e os 3 acréscimos |
| `03-rns-delta.md` | a faixa consumida, o que cada regra faz e o que ela **não** faz |
| `04-fila-cards.md` | os seis cards que a leva manda para a fila |

### 2 · os épicos, na mesma aterrissagem — `97c468aa`

**E12** ganha RN-562, RN-563, RN-564 e RN-567, mais a RN-557 na forma final e as histórias
S1247, S1248 e S1249. **E16** ganha a RN-552 na forma final e a `S1616-T5` destravada. **E19**
ganha RN-565 e RN-566, o escopo ratificado do CRM-1, a P-CKMOD-1 saindo da espera e a direção
de exportação/notificação registrada. **E13** recebe a visão de conexão entre participantes
como direção de produto, sem história e sem card.

### 3 · painel e índice de RN — `d9931223` · push `7aa78e00..d9931223`

Painel **12 → 4**, com a narrativa de saída dos oito e a conta refeita à mão contra as duas
seções. O CRM-4 ganhou a nota de onde parou e o degrau 3 dele foi corrigido (os dois ARENA que
o seguravam destravaram). Índice: faixa 562-567 na tabela, narrativa do próximo número
reescrita, conta de 292 para 298, **próxima livre = 568**.

Uma limpeza de vocabulário entrou junto: o termo banido começado em v saiu da linha 7 do painel
e virou "a sua fala na íntegra".

### 4 · os boards — `496c8492` · push `d9931223..496c8492`

Seis cards no kanban, todos no padrão épico → história → tarefa e com a fala do dono no
cabeçalho. BOARD-EPICOS ganha a seção da leva 8. V1-CHECKLIST ganha as 14 tarefas e o gate de
frescor do Strava com as duas URLs e a data.

## O que esta lane NÃO fez

- **CRM-4 continua aberto.** O dono perguntou *"como assim em troca de que?"*, o
  esclarecimento foi dado no chat e a resposta dele não veio. O item fica no painel, intacto.
- **Item 12 (domínio público) continua aberto**, com as duas ações (69 e JUROS-1).
- **Nenhuma linha de código.** Tudo que a leva 8 destrava virou card, não commit de produto.
