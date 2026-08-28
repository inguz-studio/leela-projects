# Handoff de sessão · 26–28/08/2026 · do CI vermelho aos vetos do dono

> Escrito para quem retomar em sessão nova (o dono ou outro agente). Modelo: a sessão rodou em
> Fable 5 até bater o limite em 28/08; a última lane foi concluída em Opus 5.
> Estado da `main` ao fechar: `1b449e98`. **11 PRs mergeados** nestes três dias (#1 a #12),
> **2 abertos em draft** (#13, #14) e 1 em conclusão (RN, branch pushada).

---

## 1 · O que mudou de verdade (a lista curta)

1. **O CI passou pela primeira vez em 899 execuções** (26/08, PR #1). Antes: 898 runs, zero
   sucessos, morrendo no `Setup pnpm`. Detalhe completo em
   `leela-specs/00-boards/MIGRACAO-DE-MAQUINA.md`, seção "A dívida do CI foi paga".
2. **O E2E Playwright rodou e passou pela primeira vez na história do repo** (27/08, disparo
   manual; o cron noturno foi movido de 03:00 para 03:17 UTC porque o agendador do GitHub
   descarta topo de hora).
3. **Performance do painel**: bundle inicial 630 → 464 kB gzip (code-split por rota);
   carga de inscritos de 19 viagens sequenciais para 2 (page size 18 → 200); `getOverview`
   com `minInstances: 1` (custo declarado ~R$ 0,50/mês, só vale no próximo deploy).
4. **Landing nível Awwwards** aprovada e mergeada (PR #2), com um achado que valia a rodada:
   o preset Tailwind descartava o modificador de alpha em silêncio — a barra de CTA fixa da
   página de evento estava **transparente em produção de CSS**.
5. **Três rodadas de vetos do dono** (27 e 28/08) viraram 29 itens registrados em
   `leela-specs/02-rodadas/2026-08-27-vetos-do-dono/01-itens.md` — a fonte de verdade desta
   sessão. Toda fala dele está lá transcrita.
6. **Três catracas novas no CI**: lint de tokens com o furo de `_` fechado, **gate do cânone
   como step da esteira**, e `componente-sem-story.ds`. A do cânone já pegou uma superfície
   crua na soma dos merges no mesmo dia em que nasceu.

---

## 2 · Regras que o dono declarou (valem daqui pra frente)

Registradas em `leela-specs/04-engenharia/governanca-design.md` (§10 e §11), no cânone e na
memória do assistente:

- **Sem linhas de borda** em bento cards e tabelas, em todo o DS (reafirmada — ele já tinha
  sido explícito antes). Separação por superfície e espaçamento.
- **Sem textos descritivos de apoio** por padrão. Tooltip de dúvida é PROPOSTA, nunca default.
- **Alertas**: no máximo ícone + cor de severidade. **Nunca listra lateral** ("foge totalmente
  à nossa identidade").
- **Overlay/modal entra centralizado** (fade + zoom do centro), nunca deslizando de baixo.
- **Terciário é o padrão de navegação desktop**; barra inferior mobile compacta.
- **Reuso primeiro** (§10): busca no barrel do DS antes de criar; componente novo é exceção
  justificada por escrito, nasce NO DS, com doc + showroom + Storybook.
- **Push sempre** (V2708-28): todo trabalho, inclusive spike, termina a sessão com push.
  Nasceu da perda do tema azul (ver §5).
- **Princípio de produto**: *"o importante é sempre darmos essa flexibilidade para ele
  [o organizador] atuar"* — flexibilidade > trava preventiva.

---

## 3 · Onde parou (o que retomar)

### Em conclusão agora
- **Lane RN-MODALIDADE-E-LOTES** — branch `rn/modalidade-lotes-20260828` **pushada** (3 commits,
  32 arquivos): revogação da RN-500 + RN-578 (ciclo de vida da modalidade) + RN-579 (janela do
  lote flexível), kernel, Rules, checkout fail-closed, telas, testes. **Faltava** gates finais,
  gate visual, handoff e PR — despachado em Opus para fechar. Se ao retomar o PR não existir,
  siga o roteiro do §6.

### Abertos, com CI verde, esperando o veto visual do dono
- **PR #13** — Alert sem listra (4 tons, todas as telas herdam) + Dialog entrando do centro;
  §11 da governança documentando as duas.
- **PR #14** — TerciarioNav em Inscritos (modo âncora) + Afiliações (modo rota) + o
  "Credenciamento ao vivo" em **bento 2×2** na Visão geral do evento.

### Decisões que esperam a palavra do dono
Consolidadas na Mesa de Decisões (artefato):
https://claude.ai/code/artifact/be0a2145-5d80-4c89-9ce7-8f55229d5a09
1. **Padrão de tooltip** — 5 propostas no handoff `leela-eventos-polimento-20260827.md`
   (a #1 e a #3 resolveriam a confusão do "não consigo adicionar modalidade").
2. **Estoque por SKU** — a entrega por inscrito é transacional e garantida, mas a agregação de
   `qtdEntregue` por SKU **não existe**; criar tem custo (escrita em `itensKit` global, leitura
   em evento grande). Proposta no handoff `leela-checkin-entrega-20260827.md`.
3. **Consolidações restantes** — `CardValor` ×3 + `KpiTile` (~13h). `SecaoHead` já foi.
4. **Go-live**: domínio público (item 12, sem default), passeio de conferência (ação 69),
   os 3 backfills. Painel completo:
   https://claude.ai/code/artifact/3d357668-245d-42ca-926b-4cd275b90b54

---

## 4 · O bug que o dono achou e ainda não foi consertado

**"Não consigo adicionar modalidade, mesmo com o botão aparecendo."** Diagnosticado ao vivo
(28/08): o modal exige um segundo campo — **Motivo**, mínimo 3 caracteres — e o botão de
confirmar fica desabilitado **mudo**, sem dizer o que falta. A lane RN remove a exigência de
motivo dos fluxos do organizador (V2708-26), o que deve fechar o sintoma; **confirmar no gate
visual dela**. Se sobrar algo, a validação inline (proposta de tooltip #3) é o complemento.

---

## 5 · A falha de workflow verificada (e fechada)

O **tema azul** do LEELA foi feito e testado na máquina Windows e **nunca commitado** — morreu
na migração. Verificação de 28/08: nenhum branch, nenhum commit na história tocou tokens de
tema azul (só a rampa `info` do wine), e o zip da migração não existe mais. **Causa-raiz**:
trabalho vivia só na árvore não-commitada. **Regra que fecha**: push sempre (§2).

O DS tem hoje **3 temas** — `brasa` (atual), `wine`, `dark-wine` — e o showroom oferece os 3.
O dono **não pediu** reconstrução do azul agora, mas registrou a intenção estratégica
(V2708-29): **DS + showroom reaplicáveis a outros projetos dele**, por duplicação de
primitives/semantic, sem tocar componente (governança §1). O squad `magic-ds` do vault é o
instrumento natural quando essa demanda vier.

---

## 6 · Como trabalhar nesta máquina (o essencial, para não redescobrir)

- **Node**: fnm; `.node-version` = 24 para toolchain (`eval "$(fnm env)" && fnm use`);
  Functions em Node 20 (`fnm exec --using=20 -- <cmd>`). O CI espelha essa divisão.
- **⚠️ Antes de qualquer suíte: `pnpm turbo run build`.** Dist velho de `@leela/core` ou
  `@leela/design-system` produz falso vermelho — dois agentes caíram nisso e chamaram de
  "falhas pré-existentes". **O CI é o único juiz.**
- **As duas superfícies locais** (ambas no ar ao fechar a sessão):
  `:4601` réplica de produção (`vite build --mode leela-hub` — o mode agora está fixo no script)
  e `:4602` mock com dados (`--mode mock-emulador --outDir dist-mock-campeche`, autologin
  `?preview=castelo` ou `?preview=admin`). **Depois de todo merge, reconstruir e religar as
  duas** — senão o dono vê bundle velho e acha que nada mudou (lição V2708-20).
- **Kill de processo só por PID exato** (`lsof -nP -iTCP:<porta> -sTCP:LISTEN -t`).
- **Emulador**: o do mock (8280) fica no ar; ⛔ não subir um `demo-leela` novo em paralelo
  (colisão de hub por project id). Lane que precisa de emulador próprio usa seu
  `firebase.<lane>.json` — há mais de 20 no repo, e o `preview-seed` agora honra
  `GCLOUD_PROJECT`.
- **Protocolo de lane que funcionou**: worktree isolado → branch → gates locais → gate visual
  com captura → handoff → push → **PR draft** → CI (~25-37 min) → veto do dono → merge por
  rebase. Nunca `git add -A` (a árvore tem arquivos do dono e ~77 provas não-rastreadas).
- **Playwright**: importar de `@playwright/test` (o pacote `playwright` puro não resolve);
  `waitUntil: 'networkidle'` não assenta no painel (tempo-real) — use `domcontentloaded` + espera.

---

## 7 · Próximos passos sugeridos

1. Fechar a lane RN (ou conferir o PR dela) e mergear #13 e #14 após o veto visual.
2. **A tarde de vetos do dono**: `:4602?preview=castelo`, com os itens 1-4 do §3 em mãos.
3. Decidir o padrão de tooltip — destrava 4 melhorias já especificadas.
4. Lane DEPLOY: produção segue pinada em `82aea920` (18/08) e a `main` andou muito. Inclui as
   functions de convite que dão **404 em produção** ("bloqueia o go-live", segundo o board) e
   os 3 backfills.
5. Branch protection exigindo o check "Lint · Type-check · Build · Test" — agora é possível
   pela primeira vez.
