# R3-MICROFIX — jargão interno (RN-XXX) fora da tela renderizada

- **trace_id:** `leela-redesign-v2-20260810` · lane R3-MICROFIX (rota proporcional, escopo estreito)
- **origem:** ressalva R-3 da `leela-redesign-REV-final.md` (única ressalva alta de código)
- **worktree:** `C:\dev\leela-wt-redesign-v2`, branch `redesign-engajamento-v2`
- **base:** `89537700` (árvore limpa, confirmada antes de iniciar)
- **commit:** `f815c5ae` (pushed em `origin/redesign-engajamento-v2`)

## Strings trocadas (antes → depois)

### 1. `apps/painel/src/routes/parcerias/marcas/MarcaFormModal.tsx:145` (o defeito original, R-3)

- **Antes:** `"Registro reutilizável de patrocinador — reaproveitado no cadastro de patrocínios (RN-171)."`
- **Depois:** `"Registro reutilizável de patrocinador, reaproveitado no cadastro de patrocínios."`
- Renderiza em `Modal.tsx` (`<p>` + `aria-describedby`), então saía para a tela E para o leitor de tela. O `(RN-171)` some dos dois. Referência preservada em comentário na linha acima (`// RN-171: ...`). Aproveitei para tirar o em-dash que colava as duas orações (contrato de escrita do repo: dash não substitui vírgula).

### 2 e 3. Varredura da área achou mais duas ocorrências da MESMA classe, fora do arquivo original

`apps/painel/src/routes/parcerias/assessorias/ParceriaDetailPage.tsx` — não fazia parte do diff revisado pela UXW-FIX/UXW-REVIEW (mesma causa estrutural que a REV-FINAL apontou: strings escapam de review que mira só o diff).

- **`:53` (fallback de erro, `mensagemErro`, code `failed-precondition` sem mensagem do servidor):**
  - Antes: `msg || 'A parceria precisa estar ativa para definir a condição (RN-364).'`
  - Depois: `msg || 'A parceria precisa estar ativa para definir a condição.'`
- **`:290` (aviso quando a parceria está com convite pendente, `<p>` renderizado direto):**
  - Antes: `'A condição de desconto só pode ser definida depois que o responsável aceitar o convite e a parceria ficar ativa (RN-364).'`
  - Depois: `'A condição de desconto só pode ser definida depois que o responsável aceitar o convite e a parceria ficar ativa.'`
- Referência RN-364 preservada em comentário nos dois pontos.

## Varredura da área (parcerias/) — resultado

Grep de `RN-\d+`, `tenant`, `idempotente`, `Rules`, `agregado` em toda `apps/painel/src/routes/parcerias/` (recursivo, `.ts`/`.tsx`, fora de `__tests__`/`.test.`):

| Padrão | Ocorrências fora de comentário/identificador |
|---|---|
| `RN-\d+` | 2 achadas (as duas de `ParceriaDetailPage.tsx` acima) — pagas nesta lane |
| `tenant` | 0 — só `tenantId`/`useTenantSession`/`AfiliadoDoTenant` (identificadores técnicos) e comentários |
| `idempotente` | 0 renderizado — já fixado antes desta lane (`InfluenciadoresPage.tsx:317`, comentário `UXW-FIX · BLQ-14` documenta a troca) |
| `Rules` | 0 — só em comentários (`Rules: uid == profId` etc.) |
| `agregado` | 0 — só em comentário (`MinhasAfiliacoesPage.tsx:145`) |
| `RN-144` (`AssessoriasPage.tsx`) | 0 renderizado — já fixado antes desta lane (comentário `UXW-FIX · BLQ-09/10` documenta a troca) |

Nada ficou grande demais para a rota proporcional — nenhum item foi parado ou empurrado para a fila. `RN-141` em `clubes/NovoClubePage.tsx` NÃO entrou (fora da área `parcerias/`, já é dívida declarada da UXW-FIX / ressalva R-4 da REV-FINAL).

## Teste

- `MarcaFormModal.tsx`: não havia teste próprio; adicionada asserção em `marcas/__tests__/MarcasPage.test.tsx` (novo `it`) — abre o modal "Nova marca" e afirma `expect(dialog).not.toHaveTextContent(/RN-\d+/)`.
- `ParceriaDetailPage.tsx`: não havia teste cobrindo nem o fallback `mensagemErro` nem o estado `convite_pendente`. `mensagemErro` foi exportada (era função local pura, `unknown → string`) para teste direto sem precisar simular o formulário inteiro (os campos de data usam `DateTimeField`/DatePicker do DS, fora de proporção para esta lane). Dois `it` novos em `assessorias/__tests__/ParceriaDetailPage.parse.test.tsx`:
  - `mensagemErro({ code: 'failed-precondition' })` não casa `/RN-\d+/` e bate com a string nova.
  - render com `parceria.status = 'convite_pendente'` → texto renderizado não casa `/RN-\d+/`.

## Números do delta gate

Todos rodados via `pnpm --config.verify-deps-before-run=false exec ...`, foreground, série, árvore em `redesign-engajamento-v2`.

| Gate | Comando | Resultado |
|---|---|---|
| Testes da área parcerias | `vitest run src/routes/parcerias` (em `apps/painel`) | **9 arquivos · 119 testes · 119 passed · 0 failed** (24,57 s) — inclui os 3 `it` novos |
| `tsc --noEmit` painel | `tsc --noEmit` (em `apps/painel`) | exit **0** |
| Lint painel | `eslint src --max-warnings 0` (em `apps/painel`) | exit **0** |

## Commit

- `f815c5ae` em `redesign-engajamento-v2`, `git commit --only` com os 4 arquivos tocados (2 fonte + 2 teste), pathspec explícito (sem `-A`).
- `git status --porcelain` = 0 linhas antes e depois do commit. Nenhum `pnpm-workspace.yaml` sujo (R-8 evitado).
- Pushed para `origin/redesign-engajamento-v2`.

## Rebuild e re-serve `:4601`

- `vite build --mode leela-hub` (painel) — DS não tocado nesta lane, sem rebuild de `tsup` necessário.
- Bundle novo: `assets/index-BuNH0eyQ.js` (era `index-DtmHYTG9.js` no HEAD anterior — mudou porque o conteúdo mudou). CSS idêntico (`index-sDPZyP0B.css`, mesmo sha256 de antes — não tocado).
- sha256 `assets/index-BuNH0eyQ.js`: `b97647eeaf7131cc5dc5941369df728800a84dbc1efd21e9adf65c325da0bf2b` (2.286,74 kB / gzip 608,78 kB).
- **PID antigo 5380** (`:4601`) morto (`taskkill /PID 5380 /F`).
- Re-servido com o MESMO script (`.maestro-logs/serve-4601.js`, estático + fallback SPA), MESMA porta `4601`.
- **PID novo: 19132.** `curl http://localhost:4601/` → 200; asset servido = `/assets/index-BuNH0eyQ.js`, sha256 idêntico ao bundle local (comparado byte a byte).
- `:4599` **intocado**: PID `25384` seguiu o mesmo antes e depois (conferido por `netstat`).

## Nenhum deploy

Não houve `firebase deploy` nem qualquer publicação além do rebuild local e re-serve de conferência em `:4601`.
