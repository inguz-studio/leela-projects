# Handoff · leela-admin-usuarios-20260810 · lane SPEC

- **trace:** leela-admin-usuarios-20260810
- **lane:** SPEC (documentação pura — zero código, zero teste, zero deploy)
- **perfil:** sf-backend-lead (software-forge) com lente de produto
- **brief:** `.nirvana/briefs/leela-admin-usuarios-fluxo-20260810-enriched.md`
- **território:** `leela-specs/**` + este handoff
- **estado:** ✅ ATERRISSADA E COMMITADA (push feito no fecho da lane)

## O que a lane entregou

Rodada **`leela-specs/02-rodadas/2026-08-10-admin-usuarios/`** (SPEC-ADMIN-USUARIOS), que
formaliza a decisão ADMIN-USUARIOS-1 de 09/08 contra o código real e reconcilia as duas
decisões do dono sem quebrar nenhuma:

| Arquivo | Conteúdo |
|---|---|
| `01-decisao-do-dono.md` | verbatim do bloco 13, leitura herdada, fronteira do que se decide |
| `02-inventario-codigo.md` | medição arquivo:linha — cadastro, resgate, ponte, convites, estado de aprovação, vitrine/RN-510, painel master |
| `03-spec.md` | RN-547 a RN-552, história S1616 (GWT), as 5 perguntas do brief respondidas, vetáveis |
| `04-fila-codigo.md` | tarefas com território e gates; entra na onda 5 da ADMIN-VISAO, não compete com ela |

## A reconciliação (o coração da lane)

- **As duas frases do dono não colidem.** O verbatim de 06/08 (que gerou a RN-510) já incluía
  "aba de menu" como gatilho; e na vitrine todo acionável é, por construção (P15), uma ação
  que não pode acontecer — os conjuntos "gesto sobre acionável" e "tentativa de ação" só
  divergem na navegação, que o próprio dono incluiu por escrito. Default proposto:
  **ratificar a RN-510**, com a régua escrita (RN-549). Decisão continua no ADMINVISAO-5 (a).
- **A vitrine aberta e a ação bloqueada convivem** porque aprovação não é campo: é a posse da
  claim `tenantId`. A conta sem código ENTRA e vê a vitrine (RN-510 intocada); "aparecer no
  painel master" é leitura do estado `aguardando_convite` que o cadastro já grava (RN-547);
  as duas portas de aprovação convergem no mesmo destino pelo mesmo `provisionTenantCore`
  (RN-548); o buraco real medido — a vitrine NÃO descobre liberação server-side (zero
  listener; único destrave é o resgate na própria tela) — vira RN-550 com default proposto
  (doc próprio como sinal, allowlist +1 nome declarado), no ADMINVISAO-5 (b).

## RNs novas (todas donas no E16)

- **RN-547** · quem espera aparece: a fila lê o estado que já existe
- **RN-548** · aprovar tem duas portas e um destino só (prova por comparação de desfechos)
- **RN-549** · a régua do "AÇÃO" — **condicionada ao ADMINVISAO-5 (a)**
- **RN-550** · a liberação chega sem F5 — **condicionada ao ADMINVISAO-5 (b)**
- **RN-551** · todo ato de aprovação deixa rastro (quem, quando, porta, sobre quem; negativa)
- **RN-552** · recusar/revogar — **condicionada ao ADMIN-USUARIOS-2** (número consumido)

Índice atualizado: faixa mais alta = **552**, próxima livre = **553**. Sweep RN-547..560 fora
do índice/rodada/E16: zero ocorrências (refeito antes do commit).

## Vetáveis

- **ADMINVISAO-5** — atualizado NO LUGAR no painel: (a) mantém default "ratificar", agora com
  os dois argumentos e a régua; (b) **ganhou default proposto** (doc próprio → releitura do
  crachá → queda por sessão com travas devolvidas + linha de copy da segunda espera), onde
  09/08 tinha deixado sem proposta.
- **ADMIN-USUARIOS-2** — NOVO no painel (recusa/revogação, a pergunta que a frase do dono não
  alcança), com defaults conservadores propostos. **ADMIN-USUARIOS-1 saiu** (decidido 09/08 +
  formalizado hoje; alcance respondido pela ordem "todos os usuários" + dois modos da S1615).
  A conta do painel não muda (30).

## Épico e boards (mesma aterrissagem)

- **E16** (`03-canon/epics/LEELA-E16-plataforma-superadmin.md`): delta novo
  "SPEC-ADMIN-USUARIOS · 2026-08-10" com as seis RNs, a S1616, a nota de que a RN-510 segue
  inalterada no enunciado, e o que entrou/saiu do painel.
- **V1-KANBAN**: S1616 (T1-T5) sob o card E16 do painel master; tail do card atualizado.
- **BOARD-EPICOS**: anotação +2026-08-10 na linha do E16.

## História nova

**LEELA-S1616 · A aprovação converge, e a vitrine descobre** — contrato da S1615-T3/T4:
T1 convergência (⚔), T2 saída da vitrine sem F5 (⚔, aguarda 5b), T3 copy das duas esperas
(aguarda 5b), T4 régua do gatilho (aguarda 5a), T5 recusa/revogação (aguarda ADMIN-USUARIOS-2).

## Fatos medidos que a próxima lane precisa saber

- Cadastro `/cadastrar` é client-side puro (3 gestos; write do perfil é best-effort com catch
  vazio — conta órfã é frente LGPD-1); painel master NÃO lê `aguardando_convite` em lugar
  nenhum; nenhum reader lista `profissionais` (Rule já permite ao admin — S1615-T1).
- Emissão de convite é write direto de cliente (`convites.ts:75-78`), não callable.
- Vitrine: gatilho = `click`+`keydown` em captura no document sobre `SELETOR_INTERATIVO`;
  copy atual do aviso só conhece a espera do código.
- **Gate de produção herdado:** registro de 09/08 diz que `resgatarConviteOrganizador`
  responde **404 em produção** — conferir deploy antes de build da porta do código.
- Pontas sem carona (fila §P1/P2): sidebar troca para nav de plataforma por pathname sem olhar
  claim (`shell/sidebar.ts:148-157`); puros da régua sem teste unitário dedicado.
- PONTE-ELEGIVEL-1: citado, não resolvido (lane própria) — esta spec iguala DESFECHOS das
  portas; aquela iguala RECUSAS. Tesouras complementares.

## Commits

Todos com `git commit --only` e pathspec explícito (lane vizinha viva na árvore — nada dela
foi tocado):

- `3fac549a` — docs(spec): rodada SPEC-ADMIN-USUARIOS (4 arquivos, 741 linhas)
- `59f488a5` — docs(canon): delta no E16 + índice (faixa 552, próxima livre 553)
- `230f7270` — chore(board): segunda troca de 10/08 no painel + S1616 no kanban + épicos
- (este handoff no commit de fecho)
