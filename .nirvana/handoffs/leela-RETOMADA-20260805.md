# RETOMADA — Leela, pausa de 05/08 (dono desligou a máquina)

**Ler este arquivo primeiro.** Zero lane em voo (a última foi parada pelo maestro, limpa). `HEAD == origin/main == 73e2944a`. Trace da rodada: `leela-pixreal-diag-20260804`.

## Estado da árvore ao pausar

Uma lane foi interrompida no meio, **de propósito e sem perda**: `FIX-PARSE-MILHAR`. Ela tinha acabado de commitar a parte do dinheiro e estava começando a de contagem.

- **Commitado e publicado:** `73e2944a` — `"1.234"` num campo de preço passa a gravar R$ 1.234,00 (decisão do dono; 61 testes preservados).
- **NÃO commitado, na árvore, e que COMPILA (`tsc --noEmit` exit 0):**
  - `packages/core/src/finance/pontuacaoPtBr.ts` — **arquivo novo, untracked**: extração da regra de pontuação pt-BR para um lugar só.
  - `packages/core/src/finance/parseValorPtBr.ts` — modificado para importar dessa extração (−89/+14).
  - Intenção declarada no próprio comentário: *"dinheiro e contagem lendo `1.000` de formas diferentes é um defeito esperando data"*.
- ⚠️ **O que falta da lane:** o parser irmão de **contagem** (inteiro, sem casa decimal) e a troca dos consumidores (teto de usos de cupom, limite de vagas/`quantidadeLimite`, capacidade, estoque de kit). Brief completo no despacho da lane; a decisão do dono ("assumir milhar") vale para os dois parsers.
- Sujeira conhecida e inofensiva: muitos `.nirvana/handoffs/*` e `.nirvana/briefs/*` untracked (convenção da casa) e `.nirvana/handoffs/leela-pixreal-diag-20260804-REV-5B.md` staged por lane antiga. ⚠️ `pnpm-workspace.yaml` volta a sujar sozinho com `'@sentry/cli': set this to true or false` (placeholder inválido do pnpm) — **reverter sempre, nunca commitar: quebra o install**.

## O que está NO AR (produção, `leela-hub`)

Deployado na madrugada e conferido: tela "Estamos confirmando o seu pedido" (PIX e cartão), **área do cliente inteira**, **botão Salvar como PDF** do ingresso, código curto de compra `PED-XXXXX` nas superfícies, guarda de conta admin, lista parcial de e-mail corrigida, 4 índices + os 2 do expurgo LGPD (READY), rules com a leitura do próprio pedido, 65 functions. O backfill rodou: **17 pedidos carimbados** (o do dono é `PED-8CDHM`) e os **dois e-mails dele foram entregues** (`delivered` na Brevo às 06:54).

## O que está NO REPOSITÓRIO e FORA DO AR (o próximo deploy)

Tudo com review antagonista paga, salvo onde indicado:
1. **Motion** nos 5 overlays — 800ms abrir / **250ms fechar** (decisão do dono), `prefers-reduced-motion` respeitado, portal + pilha de foco. `bf93ed51`, `bc4f2304`, `df0848a0`.
2. **Unificação do "Entrar"** + logo no modal. `60c50382`, `8cfe56bb`.
3. **Seis achados do painel de lotes** + os 3 fixes da review (a prévia de capacidade que ainda mostrava "31"). `fd6e5e69`, `41ac6bbb`, `d4ce8d12`, `1357163a`, `2a97a592`, `08a09465`, `c2b19244`.
4. **Motor dos dois fluxos de conta** (código de 6 dígitos) + `email_verified` no ramo (b) — POSSE-EMAIL-1 autorizado pelo dono. `39a98908`, `6f5b7915`, `a0f12500`, `23c644f2`, `cb33344e`, `8f7dfa36`, `59980b48`, `6da5bd7f`.
5. **Parse de dinheiro** (8 consumidores) + a virada do milhar. `300aba61`, `73e2944a` — ⚠️ **sem review antagonista ainda** (é ⚔, dinheiro).
6. **Correção do expurgo LGPD** (índices já deployados; código não). `4804e5c2`, `a776628a`, `f66808b9`.

## Ordem obrigatória do próximo deploy

1. `pnpm --filter @leela/design-system build` — **`dist/` é gitignorado**; sem isso o motion não chega ao painel nem ao bundle e a leitura vira "não funcionou".
2. `firebase deploy --only firestore:indexes` (se houver índice novo) → esperar READY.
3. `functions` (conjunto justificado pelo fecho de dependências) → `rules` → `landing` → `painel`.
4. Smoke: token inválido no `ingressoPorLink` devolvendo `{"ok":false}`; a página do ingresso do dono abrindo; o PDF respondendo `%PDF`; `functions:log` sem erro novo.

**Segredo já criado em produção:** `CODIGO_ACESSO_PEPPER` v1 (48 bytes de entropia do sistema, nunca impresso, não recuperável — trocar = versão nova + redeploy).

## Fila ao retomar, na ordem que eu seguiria

1. **Terminar a FIX-PARSE-MILHAR** (parser de contagem + consumidores) — a árvore já tem o começo.
2. **Review antagonista do parse** (dinheiro + contagem) — é ⚔ e ainda não rodou.
3. **Deploy completo** na ordem acima.
4. **Telas dos dois fluxos de conta** (B1–B3 da fila de contas) + os CTAs "É meu primeiro acesso" e "Criar conta" no modal — hoje o modal está sem eles de propósito (botão sem destino é pior que botão ausente).
5. **Frente 3 da rodada de métricas** e a tarefa `S315-T1` (abrir a janela do lote nas Rules, ⚔).
6. **B4 revisada** já entrou; falta a decisão de produto do **CLUBES-1** (não existe caminho para participante entrar em clube).

## Decisões que esperam o dono (painel: ~40 + 9 ações)

Bloqueiam trabalho: **LGPD-1** (retém o seed do 1º convite), **ARENA-1/2** (travam a Arena Social), **SERV-3** e **CONV-1** (travam tarefas de métricas), **DEPLOY-1** (porta do organizador pronta e fora do ar). O resto tem default em vigor e não trava nada. Novos desta leva: **ESTOURO-1** (duas pessoas podem comprar a última vaga — o aviso entra de qualquer forma; a reserva depende de varredor de PIX, que não existe), **CONTA-1/2**, **SERV-1/2**, **INSCR-1**, **CLUBES-1**.

**Ofereci ao dono** montar uma página única de triagem do painel, ordenada por "trava trabalho → mexe em dinheiro → preferência". Ele não respondeu; a oferta segue de pé.

## Conferência visual pendente (o dono precisa ver com os olhos)

Jornada completa ponta a ponta (comprar → e-mail → definir senha → cair em Meus Ingressos) · o PDF gerado · o e-mail com os dois códigos num cliente real · as telas novas em 320/768/1024 · o menu secundário sem barra de rolagem e sem aba sumida (também em CRM e clube) · os avisos do topo da lista · o "Ajustar capacidade" com os três números mudando na hora.

⚠️ **Achado do maestro, não confirmado:** ao testar o modal em produção, o **primeiro clique no "Entrar" não abriu; só o segundo**. Pode ser artefato da automação (foco da janela). Se o dono reproduzir, é defeito.

## Regras operacionais aprendidas nesta rodada (valem na retomada)

- ⛔ **`git commit --amend` e `git stash` são proibidos** com lane vizinha viva: destruíram trabalho verde duas vezes. `git commit --only <paths>` sempre. Acima de 2 lanes vizinhas, **worktree por lane**.
- ⛔ **Rotação/criação de credencial se registra no mesmo ato** (a senha do super-admin foi rotacionada sem registro e bloqueou o reenvio por horas).
- Emulator: porta própria por lane, **IPv4 explícito** (`"host": "::"` dá falso-vermelho), reservar hub+logging; exportar **`FIRESTORE_EMULATOR_HOST` E `LEELA_FS_EMU_PORT`** (só a segunda faz a suíte sair *skipped com exit 0*).
- Suíte da landing só dá sinal confiável com `--no-file-parallelism` nesta máquina.
- Suíte completa de functions: **nunca** (colisão de emulator indistinguível de regressão).
- `tsup` do DS nunca em paralelo com suíte (`clean: true`).

## Conta de administração

`admin@demo-leela.dev` está **sem senha utilizável** (usei uma temporária para o reenvio e a invalidei em seguida). O dono tem um link de redefinição que **já expirou** — gerar outro leva segundos. `ADMINSEP-3` segue aberto: a conta real de administrador ainda precisa nascer com e-mail dele e segundo fator.
