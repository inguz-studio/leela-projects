# PREP — build quebrado do painel disponível para inspeção real (incidente tela-preta)

- **Lane:** PREP-TELA-PRETA
- **Employee:** sf-platform-lead (software-forge)
- **Território:** worktree isolado `C:\dev\leela-wt-bootreal` (árvore principal não tocada, exceto este handoff)
- **Base:** commit `021e3e4a` (`docs(review): re-gate delta LIBERA o pacote REDESIGN-DS para deploy [leela-redesign-ds-20260809-REV]`)
- **Data:** 2026-08-10

---

## 1. O que está no ar

O build do `apps/painel` (mode `leela-hub`) do commit **quebrado** `021e3e4a` está
servido em `http://localhost:4599` para inspeção em navegador real. **Não é deploy**
— é um servidor estático local, isolado, num worktree separado.

| Item | Valor |
|---|---|
| **Porta** | `4599` |
| **PID do servidor** | `29320` (processo `node.exe` / `npx serve`, listening em `::4599`) |
| **PID do wrapper cmd.exe** (pai, desanexado) | `18096` |
| **Bundle JS servido** | `assets/index-1d8YC7zd.js` (NÃO é a família `index-NiMJIszs` citada na tarefa — hash mudou porque o build foi regerado agora; confirmado via `curl` que é este o hash real do commit `021e3e4a`) |
| **CSS servido** | `assets/index-CD9xuJJq.css` |
| **Worktree** | `C:\dev\leela-wt-bootreal` |
| **Log do servidor** | `C:\dev\leela-wt-bootreal\apps\painel\serve.log` |

## 2. Prova (curl, feito agora)

```
curl http://localhost:4599/
→ HTTP 200, index.html com <script src="/assets/index-1d8YC7zd.js">

curl http://localhost:4599/qualquer-rota-inexistente
→ HTTP 200, mesmo index.html (fallback SPA confirmado)

curl http://localhost:4599/assets/index-1d8YC7zd.js → HTTP 200
curl http://localhost:4599/assets/index-CD9xuJJq.css → HTTP 200
```

## 3. Nota de diagnóstico

O `vite build --mode leela-hub` **compilou sem erro** (4001 módulos, ~22s,
apenas warning de chunk > 500kB). Ou seja: a "quebra" do incidente tela-preta
não é falha de build/compilação — é comportamento em runtime no navegador.
Isso é exatamente por isso que o maestro precisa inspecionar num navegador
real em vez de só ler o log de build.

## 4. Ordem de build usada (para reprodução)

```
pnpm install --config.verify-deps-before-run=false          # na raiz do worktree
pnpm --config.verify-deps-before-run=false run build         # packages/core
pnpm --config.verify-deps-before-run=false run build         # packages/api-client
pnpm --config.verify-deps-before-run=false run build         # packages/design-system
pnpm --config.verify-deps-before-run=false exec vite build --mode leela-hub   # apps/painel
```

Nota de sintaxe: `pnpm run build --config.verify-deps-before-run=false` (flag
DEPOIS do subcomando) falha — o pnpm dispara um deps-status-check que roda
`pnpm install` internamente e trava no `ERR_PNPM_IGNORED_BUILDS` do
`@sentry/cli`. A flag precisa vir ANTES do subcomando: `pnpm
--config.verify-deps-before-run=false run build`.

## 5. Como matar o servidor depois da inspeção

```
taskkill /F /PID 29320
```

(ou `taskkill /F /PID 18096` para matar o wrapper cmd.exe também, mas o
processo real que escuta a porta é o `29320`)

## 6. Limites respeitados

- Nenhum deploy feito.
- Árvore principal (`C:\dev\LEELA`) não tocada, só este handoff.
- Worktree `C:\dev\leela-wt-bootreal` **não removido** — aguarda ordem do
  maestro depois da inspeção.
- `pnpm` sempre com `--config.verify-deps-before-run=false`.

## 7. Próximo passo (para quem pegar depois)

1. Maestro abre `http://localhost:4599/` num navegador real e reproduz o
   incidente tela-preta.
2. Console + Network do navegador devem entrar como evidência (screenshot ou
   `read_console_messages` via `claude-in-chrome`) na próxima lane de
   diagnóstico.
3. Depois da inspeção: `taskkill /F /PID 29320` e, quando o maestro autorizar,
   `git worktree remove C:/dev/leela-wt-bootreal`.
