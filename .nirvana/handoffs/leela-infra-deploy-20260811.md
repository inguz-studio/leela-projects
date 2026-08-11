# INFRA-DEPLOY — o gate do gate volta a rodar, a guarda desce para o funil que sobe, e a purga passa a mandar recomputar

**Trace** `leela-redesign-v2-20260810` · lane **INFRA-DEPLOY**
**Árvore** `C:\dev\LEELA` (main, compartilhada com SERV1-BUILD · `git commit --only` por pathspec em todos os commits)
**Data** 2026-08-11 · sf-reliability-engineer (software-forge)

Três consertos de infra, cada um com origem em achado auditado de outra lane. **Nenhum deploy real.**
O item 2 se prova por recusa em `--dry-run`.

| # | Item | Commit | Estado |
|---|---|---|---|
| 1 | Teste-guarda do gate de frescor volta a rodar | `399bfa7b` | ✅ pago, com vermelho real encontrado e pago junto |
| 2 | Gate de frescor entra no funil de deploy | `f5b15472` | ✅ pago, recusa provada nos dois alvos |
| 3 | Purga passa a declarar o recompute de agregado | `a030c3b0` | ✅ pago, presença e ordem pinadas por teste |

---

## 1 · O teste-guarda do gate de frescor

### Root cause — confirmada em parte, e corrigida no que importa

A lane ONDA-0 mediu `apps/landing/test/build-frescor-dist.test.ts` falhando na **coleta** com
`Error: Expected ident` e zero casos, causa apontada no shebang `#!/usr/bin/env node` da linha 1 de
`scripts/verificar-frescor-do-workspace.mjs`.

**Não reproduzi a coleta quebrada nesta árvore, e digo isso antes de qualquer outra coisa.** Com o
toolchain de hoje o teste coleta normalmente:

| Medição | Resultado |
|---|---|
| `vitest run test/build-frescor-dist.test.ts` | 12 casos coletados |
| idem, com `node_modules/.vite` e `.vitest` apagados | 12 casos coletados |
| `rollup.parseAst` com e sem shebang (vite 5.4.21 / rollup 4.62.2) | ambos OK |
| rollup nas 3 worktrees vizinhas | todas `4.62.2` |

Ou seja, o parser instalado hoje aceita shebang. O que a ONDA-0 mediu era real no ambiente dela, e o
que sobra é pior que a ocorrência: **o gate do gate ficava vivo ou morto conforme o `pnpm install` do
dia.** Um teste que pode se apagar sozinho, sem ninguém mexer nele, não é guarda.

### O conserto

Separação entre módulo importável e executável, que mata a classe em vez da ocorrência:

- `scripts/lib/frescor-do-workspace.mjs` — **novo**, sem shebang, sem efeito de import. Leva as seis
  funções puras e o corpo do CLI (`executarCli`, que devolve código de saída em vez de chamar
  `process.exit`).
- `scripts/verificar-frescor-do-workspace.mjs` — fica com o shebang, o argumento e a chamada. Ninguém
  o importa.
- O teste passa a importar a lib. Dois casos novos pinam a regra dos dois lados: a lib não começa com
  `#!`, e o entrypoint começa com `#!`, delega para a lib e não exporta nada.

O entrypoint também passou a aceitar o diretório do app como argumento.

### A prova, e o vermelho real que ela revelou

O aviso do brief se confirmou: ressuscitado, o teste apontou vermelho **legítimo**.

```
FAIL  ⚔ o REPO DE VERDADE está fresco agora — se este caso ficar vermelho, não builde
  expected [ { estado: 'defasado', nome: '@leela/design-system', … } ] to deeply equal []
```

O CLI concordou, com número:

```
⛔ [frescor] o build de @leela/landing consumiria dist/ DEFASADO.
   @leela/design-system: ./dist/index.mjs está 219 min atrás da fonte
   (dist 2026-08-11T08:58:57.085Z < src 2026-08-11T12:37:39.518Z)
```

O `dist/` do DS ficou para trás no merge da Onda 0. **Reconstruído com `npx tsup` (exit 0).** `dist/`
é gitignored (`.gitignore:38`), então a reconstrução não tocou a árvore compartilhada.

Falsificação, portanto, provada com dado do disco e não com simulação: dist velho → o caso reprova;
dist reconstruído → passa.

| Momento | Teste | CLI |
|---|---|---|
| dist do DS 219 min atrasado | 13 passam, **1 reprova** | exit **1** |
| depois do `tsup` | **14 passam** | exit **0** |

---

## 2 · O gate no funil que sobe

### Root cause — confirmada, e mais funda que o card dizia

O achado da DEPLOY-NOTURNO está certo: o firebase-tools ignora o script `build` do package.json e
roda `next build` puro. O card propunha `predeploy` do hosting como conserto. **Medi, e o predeploy
resolve metade do problema — e, no alvo da landing, resolve a metade errada.**

A ordem está no código do próprio firebase-tools (`lib/deploy/index.js`):

| linha | o que acontece |
|---|---|
| 78–80 | `if (hosting && isDeployingWebFramework(options)) await prepareFrameworks(…)` ← **o `next build` roda aqui** |
| 108 | `predeploys.push(lifecycleHooks(targetName, "predeploy"))` ← hooks só agora são coletados |
| 122 | `await chain(predeploys, …)` ← e só agora executados |

Confirmado empiricamente: com `dist/` carimbado velho, o `firebase deploy --config
firebase.landing.json --dry-run` entrou direto em `Building a Cloud Function to run this
application` sem nenhuma linha de `[frescor]`.

Consequência: no alvo da **landing** (`source`/webframeworks) o predeploy barraria o **envio**, com o
bundle podre já construído. No alvo do **painel** (`public` estático) não há `prepareFrameworks`, e o
hook morde de verdade.

### O conserto, por alvo

- **Landing:** gate dentro de `apps/landing/scripts/deploy-leela-hub.mjs`, que é o funil real, antes
  de invocar o firebase **e antes do patch de `package.json`** — recusa não deixa árvore suja para
  reverter. O `predeploy` de `firebase.landing.json` fica como segunda rede, para quem chamar
  `firebase deploy --config` na mão, com o comentário dizendo exatamente o que ele barra e o que não.
- **Painel:** `predeploy` em `firebase.prod.json` **mais** o gate no `build` de
  `apps/painel/package.json` — o `vite build` resolve `@leela/*` pelo `exports` e lê o mesmo `dist/`,
  e não tinha gate nenhum, nem no deploy nem no build. Exposição que a REV-FINAL apontou, confirmada.

Forma dos hooks: `npm --prefix <app> run verify:frescor`, a mesma já usada pelo hook das functions.

### A prova — recusa em `--dry-run`, nada enviado

`packages/api-client/dist/index.mjs` carimbado 1317 min atrás da fonte.

**Painel, dist velho:**
```
Running command: npm --prefix apps/painel run verify:frescor
⛔ [frescor] o build de @leela/painel consumiria dist/ DEFASADO.
   @leela/api-client: ./dist/index.mjs está 1317 min atrás da fonte
Error: hosting predeploy error: Command terminated with non-zero exit code 1
EXIT=1
```

**Painel, dist restaurado** (o outro lado, sem o qual a prova não vale — um hook que sempre falha não
é gate):
```
Running command: npm --prefix apps/painel run verify:frescor
[frescor] @leela/painel: 3 pacote(s) de workspace com dist/ à frente da fonte
+ hosting: Finished running predeploy script.
+ Dry run complete!
EXIT=0
```

**Landing, dist velho** (`deploy-leela-hub.mjs --dry-run`, com `--dry-run` só como rede — o gate
recusa antes de qualquer chamada de rede):
```
⛔ [frescor] o build de @leela/landing consumiria dist/ DEFASADO.
[deploy-landing] FALHOU: gate de frescor recusou: o bundle sairia com dist/ defasado.
EXIT=1
```
Sem `next build`, sem rede, e sem `package.json.deploybak` deixado na árvore (conferido).

### Ruído que vale registrar para o próximo leitor

Quando o hook sai com código 1, o firebase-tools imprime junto um **`ENOENT` espúrio** do cross-spawn
(`spawn npm --prefix apps\painel run verify:frescor ENOENT`, `spawnargs: []`). Não é falha de
resolução do comando: o comando roda, o texto do gate sai na tela antes do stack, e a saída correta
(`Command terminated with non-zero exit code 1`) chega. É o cross-spawn com `shell: true`, que deixa
`parsed.file` indefinido e trata qualquer exit 1 no Windows como comando-não-encontrado. Perdi tempo
com isso; quem vier depois não precisa.

---

## 3 · A purga que não recomputava agregado

### Root cause — confirmada em produção

A LIMPEZA-PROD de 10/08 apagou os eventos de `castelo-producoes` e deixou o agregado do tenant
apontando para o mundo antigo. O backfill de 11/08 reconciliou:

| Tenant | `gmvAcumulado` | `eventosAtivos` |
|---|---|---|
| `castelo-producoes` | **167.277 → 10** | **5 → 1** |

A fonte tinha **um** evento, de R$ 10, publicado. Cinco dias de GMV fictício no painel da plataforma.

**Por que ninguém viu:** o post-check da própria purga carimbou `OK  gmvTotal  167277  integerValue`
(`leela-apply-limpeza-20260806.md:159`). Ele conferiu o rollup **contra ele mesmo**. Nenhuma etapa
comparou o agregado com a fonte que ele resume.

**A causa:** `recomputarSaudeTenant` ganhou escritor em `30084e5a` e esse escritor **não tem gatilho,
não tem cron e não tem callable**. O plano já desarmava os agregados de EVENTO pela ordem `[B1]`;
faltava o nível acima.

### O conserto — registro e guarda de processo, sem tocar no executor

O executor externo (`C:\dev\leela-purga-executor-20260810\`) **não foi tocado**, como pedido.

**(b) Checklist versionado — existe, e é impresso.** `functions/src/limpeza/planoLimpeza.ts` já trazia
o array `recomputesObrigatorios`, que `functions/scripts/limpeza-prod-leela-hub.ts:599` imprime na
tela do operador ao fim do dry-run. O passo entrou lá **em primeiro lugar**:

1. `recomputarSaudeDeTodosOsTenants(db)` — sem gatilho, sem cron, sem callable; idempotente
   (2ª execução `escritos=0`).
2. **Depois** `recomputePlatformRollups` — porque ele **soma** o campo que o passo 1 conserta. Ordem
   invertida troca um número errado num tenant por números errados na plataforma inteira.

Corrigi também o aviso do item 1 do array, que dizia que ninguém mantinha `tenants/{id}.eventosAtivos`
— desatualizado desde `30084e5a`. O conserto é a ordem, e não pular o callable.

`limpezaProd.test.ts` ganhou caso que pina **presença e precedência**.

**(a) Registro durável:** nova seção em `leela-specs/04-engenharia/o-que-so-a-producao-cobra.md`,
o documento que já carrega a lição irmã da mesma purga. Traz o caso, a regra com a ordem, onde o
executor vive e por que documentar só nele seria perder o registro na próxima corrida.

---

## Gates

| Gate | Comando | Resultado |
|---|---|---|
| **Suíte landing completa** | `vitest run --maxWorkers=3 --minWorkers=1` | ✅ **exit 0** · **813/813** casos · **61/61** arquivos · 271,67 s |
| tsc landing | `tsc --noEmit` | ✅ exit 0 |
| lint landing | `eslint app lib --max-warnings 0` | ✅ exit 0 |
| tsc functions | `tsc --noEmit` | ✅ exit 0 |
| lint functions (tocados) | `eslint src/limpeza src/__tests__/limpezaProd.test.ts` | ✅ exit 0 |
| testes de limpeza | 5 arquivos | ✅ 95 passam, 9 pulados (integração exige emulador) |
| regressão em `scripts/` | 4 formas de invocação + `gate-canon.mjs` | ✅ todas exit 0 |

**Antes × depois da suíte da landing:**

| | arquivos | casos | exit |
|---|---|---|---|
| baseline (início da lane) | 3 vermelhos / 61 | 50 falham / 811 | **1** |
| fim da lane | **0 vermelhos / 61** | **0 falham / 813** | **0** |

### ⚠️ Uma ressalva honesta sobre o comando do gate

`pnpm test` da landing é `vitest run` **sem limite de workers**, e nessa forma ele **estourou o teto
de 10 min** desta lane sob a carga atual da máquina (a lane vizinha está construindo). Não é vermelho:
é contenção. Os dois arquivos que reprovavam no baseline (`minha-conta-ponte-s1234.test.tsx`,
`entrar-overlay-s1221.test.tsx`) foram medidos **isolados** e passam, 76/76, com casos individuais em
5,7 s contra um `testTimeout` de 5 s — ou seja, morriam de timeout por paralelismo, não por defeito.

O número que declaro exit 0 é o de `--maxWorkers=3 --minWorkers=1`, que é **a mesma suíte completa**
(61 arquivos, 813 casos) e é o `test:gate` que a casa já tinha no `package.json` justamente para isto.
Fica o card: ou `pnpm test` passa a apontar para o gate limitado, ou os dois arquivos de RTL ganham
timeout próprio.

## Para a próxima lane

1. ⛔ **`predeploy` de hosting com `source` não protege build nenhum.** Está provado no código do
   firebase-tools e vale para qualquer alvo webframeworks futuro. Gate pré-build vai no script da casa.
2. **`pnpm test` da landing não fecha sob paralelismo livre nesta máquina.** Ver a ressalva acima.
3. **O painel ainda não tem gate de frescor do próprio `apps/painel/dist`.** Esta lane fechou o
   frescor dos pacotes de workspace que o `vite build` consome; que o `dist/` do painel esteja à
   frente da fonte do painel continua sem guarda.
4. **`recomputarSaudeDeTodosOsTenants` segue sem gatilho, sem cron e sem callable.** O checklist
   impresso é a guarda possível hoje; a guarda boa seria invocação automática.

## Nada foi violado

- **Nenhum deploy real.** Os dois `firebase deploy` desta lane foram `--dry-run`, e o da landing nem
  chegou à rede — o gate recusou antes.
- **Árvore compartilhada respeitada.** Todos os commits por `git commit --only` com pathspec. Sem
  `add -A`, sem `amend`, sem `stash`. Territórios da SERV1-BUILD (validação de preço em
  core/painel/functions) não foram tocados.
- **Executor da purga intocado.**
- **Carimbos de mtime revertidos.** `packages/api-client/dist/index.mjs` restaurado ao valor original
  (`1786438185834.893`) e conferido.
- **`planoLimpeza.ts` usa NUL literal como separador de chave de ordenação.** Contagem conferida:
  4 antes, 4 depois da edição.
