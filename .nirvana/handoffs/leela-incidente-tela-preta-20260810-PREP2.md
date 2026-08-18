# PREP2 — build quebrado do painel reservido para inspeção real (incidente tela-preta)

- **Lane:** PREP2
- **Trace:** `leela-incidente-tela-preta-20260810`
- **Employee:** sf-platform-lead (software-forge)
- **Território:** worktree isolado `C:\dev\leela-wt-bootreal2` (árvore principal não tocada, exceto este handoff)
- **Base:** commit `021e3e4a` (`docs(review): re-gate delta LIBERA o pacote REDESIGN-DS para deploy [leela-redesign-ds-20260809-REV]`)
- **Data:** 2026-08-10

---

## 1. O que está no ar

O build do `apps/painel` (mode `leela-hub`) do commit **quebrado** `021e3e4a` está
servido de novo em `http://localhost:4599` para inspeção em navegador real —
recriação idêntica do ambiente do PREP original, que morreu antes da inspeção
do maestro. **Não é deploy** — servidor estático local, isolado, num worktree
separado.

| Item | Valor |
|---|---|
| **Porta** | `4599` |
| **PID do servidor** | `25384` (`node.exe` / `npx serve`, LISTENING em `0.0.0.0:4599` e `[::]:4599`, StartTime 10/08/2026 13:31:09) |
| **PID do wrapper cmd.exe** (pai, desanexado) | `19884` |
| **Bundle JS servido** | `assets/index-1d8YC7zd.js` |
| **JS secundário** | `assets/browser-BXdiCFWD.js` |
| **CSS servido** | `assets/index-CD9xuJJq.css` |
| **Worktree** | `C:\dev\leela-wt-bootreal2` |
| **Log do servidor** | `C:\dev\leela-wt-bootreal2\apps\painel\serve.log` |

**Reprodutibilidade confirmada:** os hashes de conteúdo do vite saíram IDÊNTICOS
aos do PREP original (`index-1d8YC7zd.js`, `index-CD9xuJJq.css`) — mesmo commit,
mesmo build, mesmo artefato. O que o maestro inspecionar aqui é o mesmo binário
do incidente.

## 2. Prova (curl, feito agora)

```
curl http://localhost:4599/
→ HTTP 200, index.html com <script type="module" crossorigin src="/assets/index-1d8YC7zd.js">

curl http://localhost:4599/rota-que-nao-existe-xyz
→ HTTP 200, MESMO index.html com o mesmo <script src> (fallback SPA confirmado)

curl http://localhost:4599/assets/index-1d8YC7zd.js   → HTTP 200
curl http://localhost:4599/assets/index-CD9xuJJq.css  → HTTP 200
curl http://localhost:4599/assets/browser-BXdiCFWD.js → HTTP 200
```

SHA-256 dos artefatos servidos (de `apps/painel/dist`):

```
81227473b6553346206d7fe8e0e63532e60c25e09c78ff8636e99297bb9221fc  index.html
78ab641580a5516b11f6f92c66a75ce0d1aa95fd918c7c3a9cf5d2682d85447a  assets/index-1d8YC7zd.js
79a027a90e00c10b1753631dfa4b215958c7e8b59972c3391a14443e9c62d77a  assets/index-CD9xuJJq.css
7e89b6da537b2218d27aa5c1a028b57eea8f852d2cdaaa1d29f5db76fdff9d3c  assets/browser-BXdiCFWD.js
```

## 3. Nota de diagnóstico (inalterada em relação ao PREP)

O `vite build --mode leela-hub` **compilou sem erro** (4001 módulos, ~17s,
apenas warning de chunk > 500kB). A "quebra" do incidente tela-preta não é
falha de build/compilação — é comportamento em runtime no navegador. Por isso
a inspeção precisa ser em navegador real, não em log de build.

## 4. Ordem de build usada (reprodução exata do §4 do PREP original)

```
pnpm install --config.verify-deps-before-run=false            # na raiz do worktree
pnpm --config.verify-deps-before-run=false run build          # packages/core
pnpm --config.verify-deps-before-run=false run build          # packages/api-client
pnpm --config.verify-deps-before-run=false run build          # packages/design-system
pnpm --config.verify-deps-before-run=false exec vite build --mode leela-hub   # apps/painel
```

Builds rodados UM POR VEZ (RAM baixa na máquina). Nota de sintaxe mantida: a
flag `--config.verify-deps-before-run=false` precisa vir ANTES do subcomando;
depois dele o pnpm dispara deps-status-check e trava no `ERR_PNPM_IGNORED_BUILDS`
do `@sentry/cli`. O mesmo `ERR_PNPM_IGNORED_BUILDS` aparece no FIM do
`pnpm install` como aviso (scripts do `@sentry/cli` ignorados) — não bloqueia.

## 5. Como matar o servidor depois da inspeção

```
taskkill /F /PID 25384
```

(ou `taskkill /F /PID 19884` para o wrapper cmd.exe também; o processo que
escuta a porta é o `25384`)

## 6. Limites respeitados

- Nenhum deploy feito.
- Árvore principal (`C:\dev\LEELA`) não tocada, só este handoff.
- Worktree `C:\dev\leela-wt-bootreal2` **não removido** — aguarda ordem do
  maestro depois da inspeção.
- Servidor **de pé** ao fim da lane (verificado por curl após o start).
- `pnpm` sempre com `--config.verify-deps-before-run=false` antes do subcomando.
- Nenhuma lane pesada rodada em paralelo.

## 7. Próximo passo (para quem pegar depois)

1. Maestro abre `http://localhost:4599/` num navegador real e reproduz o
   incidente tela-preta.
2. Console + Network do navegador entram como evidência (screenshot ou
   `read_console_messages` via `claude-in-chrome`) na próxima lane de
   diagnóstico.
3. Depois da inspeção: `taskkill /F /PID 25384` e, quando o maestro autorizar,
   `git worktree remove C:/dev/leela-wt-bootreal2`.
