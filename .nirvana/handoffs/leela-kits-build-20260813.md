# KITS-BUILD / KITS-RESUME · handoff final

Trace `leela-redesign-v2-20260810` · lane KITS-BUILD (construiu os 3 cards, morta pela quota em
13/08 ~03h51 logo após mergear a main e no meio do rebuild dos pacotes, antes de escrever este
handoff) → fechada pela KITS-RESUME (sf-frontend-lead, software-forge), que auditou os commits
herdados contra os 3 cards, refez os gates do zero e mergeou.

**Veredito por card — os três PAGOS e verificados, não só declarados:**

- **S1257 · sub-nav de Kits para de duplicar Credenciamento.** `160b4fc0`. O item `entrega`
  (mesmo `href` da aba de Credenciamento do menu secundário do evento, `active` sempre `false`)
  saiu de `KitsLayout.tsx`. Kits volta a ter 2 abas (Gerenciamento, Distribuição) em vez de 4. O
  teste `KitsLayout.test.tsx` prova "nenhuma aba de Kits é Credenciamento" e a navegação por
  `EventosRoutes.tsx` mantém o destino alcançável pelo menu do evento.
- **S1258 · Distribuição e a leitura de retirada de Estoque viram uma aba só.** `47b9d7d3`. Design
  vetável do próprio card aplicado como desenhado: total no KPI (`MetricGrid`), detalhe nas duas
  barras de progresso, matriz de estoque parou de repetir "Retirados" (célula agora fala
  `confirmados` = demanda). Tabela de SKU/aprovisionamento preservada inteira — teste "a tabela de
  SKU/aprovisionamento vem inteira (nenhum dado se perde)" verde. `kits/estoque` salta para
  `kits/distribuicao` via `RedirectEstoqueParaDistribuicao` (mesma máquina da RN-234), confirmado
  também pelo screenshot `depois/kits-estoque-*` (URL resolvida para `/kits/distribuicao`).
  `grade-crua.painel` baixou de 104 para 103 no mesmo commit, `SectionHeader` nos 4 blocos.
- **S1259 · aba-índice vira "Gerenciamento" (RN-572).** `219ccce4`. Varredura de strings completa:
  sub-nav (`KitsLayout.tsx`), breadcrumb do `KitEditor.tsx:329`, e a frase "Adicione itens no
  Gerenciamento" (antes citava "cadastro"). O `id: 'cadastro'` interno e a rota
  `/eventos/:slug/kits` não mudaram — RN-572 é troca de rótulo, não de identificador.

## Gates rodados do zero (a KITS-BUILD morreu no meio do rebuild, sem confirmar nenhum)

| Gate | Resultado |
|---|---|
| `pnpm install` + rebuild `core → design-system → api-client` | 3/3 build success, sem erro |
| `gate:canon` (contagem nunca sobe) | **PASS** — todas as 21 métricas bateram o baseline (`grade-crua.painel` = 103, já refletindo o -1 do S1258) |
| `tsc --noEmit` (turbo, todos os pacotes exceto mobile) | limpo — painel, design-system, core, api-client, landing, functions |
| `tsc --noEmit` em `@leela/mobile` | **falha pré-existente** (`evento.ts:48-49`, `URL.protocol`/`.hostname` fora do lib do tsconfig do app mobile) — confirmada também na `main` limpa antes deste merge, fora de escopo de kits, não bloqueou |
| `eslint --max-warnings 0` (apps/painel) | 0 problemas |
| Suíte da área de eventos (`src/routes/eventos`) | **83 arquivos / 951 testes verdes** — inclui os 8 arquivos / 197 testes da superfície de kits |
| Lei F2 (moldura → suíte completa do painel) | **não se aplica** — nenhum commit toca `RootShell`/`AppShell`/DS shell; só `KitsLayout.tsx` (sub-nav terciária) e `EventosRoutes.tsx` |
| Gate visual | screenshots desktop/768/375 em `.nirvana/shots/kits-build/antes/` (13/08 03:00-03:02, pré-existentes) e `.nirvana/shots/kits-build/depois/` (13/08 03:46-03:49, já capturados pela KITS-BUILD antes de morrer) — `antes.json`/`depois.json` provam 4→2 abas e o salto de `kits/estoque` |

Merge base de `kits-ia` com `origin/main` = `5cf5b29d` (o próprio HEAD de `origin/main` no
momento do fechamento) — nada da lane RESPONSIVO-FIX havia avançado, então o re-pull da main foi
um no-op confirmado, sem conflito de linha.

## Merge e push

- Merge `--no-ff` de `kits-ia` em `main`: **`0fc01da8`**
- Commit de kanban (aterrissagem, `V1-KANBAN.md`): **`edef7abc`**
- Push: **confirmado**, `5cf5b29d..edef7abc main -> main`, 1ª tentativa, sem force
- **NENHUM deploy** — só código na main

## Achado fora de escopo (não corrigido, registrado)

Ao entrar na worktree principal `C:\dev\LEELA` para o merge, `leela-specs/00-boards/V1-KANBAN.md`
já estava **modificado e não commitado** (mtime 13/08 03:52, ~1min depois do último commit real da
KITS-BUILD) com o registro de **S1260** (suíte da landing vermelha na própria `main`) e **S1261**
(9 ressalvas da review antagonista da COPY-REV) — conteúdo de outra lane, sem commit até agora.
Preservado sem alteração; a seção de kits foi editada por cima dele no mesmo commit `edef7abc`
porque não dá para separar por arquivo. Quem landar S1260/S1261 confere a autoria antes de fechar
— não é desta lane e o conteúdo não foi tocado, só carregado junto.

## Limpeza da worktree

Removidos sem commit (lixo de emulador, fora do escopo do card): `firebase-debug.log`,
`firestore-debug.log`, `functions/lib/`, `shot-kits-secoes.local.mjs`, `shot-kits.local.mjs`. Os
screenshots em `.nirvana/shots/kits-build/{antes,depois}/` ficam — são a prova do gate visual.
Worktree `C:\dev\leela-wt-kitsbuild` limpo (branch `kits-ia` já mergeada e pushed como backup);
removido nesta lane.
