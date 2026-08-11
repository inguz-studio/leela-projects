# PONTE-FIX · os dois bloqueadores e as três ressalvas da PONTE-REV, pagos

**Trace:** `leela-redesign-v2-20260810` · lane **PONTE-FIX** · **Employee:** `sf-frontend-lead`
**Contexto:** FRESCO — não vi a construção nem a review; julguei e consertei pelo disco.
**Repo:** `C:\dev\LEELA` · branch `main` (árvore compartilhada — `commit --only` sempre)
**Início:** 11/08 03:40 (-03) · **Fim:** 11/08 04:55 (-03) — **75 minutos**
**HEAD de partida:** `10d4b319` · **HEAD de chegada:** `369a512e` + o commit deste handoff
**Fonte dos consertos:** `.nirvana/handoffs/leela-ponte-REV-20260811.md`

⏱️ **Passou de uma hora, e a casa manda avisar.** O que consumiu foi medição, não construção: as
três execuções de suíte completa somaram **~38 minutos** sozinhas (landing 639 s + 215 s,
functions 1388 s). Os cinco consertos e as seis falsificações couberam nos outros 37.

⛔ Nenhum deploy. ⛔ `apps/landing/lib/portaOrganizador.ts` nunca entrou no território (o
comentário pinado das linhas 52-68 está intacto). ⛔ `apps/painel` intocado.

---

## Estado ao fechar

| Item | Estado | Commit |
|---|---|---|
| **B1** · dist envenenado + guarda durável + eco da callable | ✅ pago | `36510249` `ec517c5c` |
| **B2** · recusa de quem nunca digitou | ✅ pago | `1a3b024b` |
| **R1** · retorno descartado nos dois ramos | ✅ pago | `36510249` `1a3b024b` |
| **R2** · a frase das "duas portas" | ✅ pago | `369a512e` (+ comentário em `36510249`) |
| **R3** · `aria-invalid` real no campo | ✅ pago | `1a3b024b` |

**Divergência da REV: nenhuma.** Reproduzi as duas medições dela por conta própria antes de
tocar em qualquer arquivo, e as duas bateram. Um achado NOVO apareceu na estreia do gate (o
design system, abaixo).

---

# ⛔ B1 · o `dist/` envenenado

## Root cause, confirmada por medição própria

A REV está certa na causa e no tamanho. A contagem que eu tirei do disco, **antes** de qualquer
conserto, com o controle `xyzzy` provando que a contagem distingue:

```
packages/api-client/dist/*                        build de 09/08 13:01
packages/api-client/src/platform/profissionais.ts fonte de 11/08 02:33   → 42 h de atraso

                              index.js   index.mjs
  promoverParaProfissional        4          3     ← PRESENTE (o probe velho dá FALSO VERDE)
  nomeProfissional                0          0     ← AUSENTE
  intencao                        0          0     ← AUSENTE
  nome_profissional_invalido      0          0     ← AUSENTE
  conta_inelegivel                1          1
  xyzzy (controle)                0          0

assinatura no dist: `async function promoverParaProfissional()`  — ZERO parâmetros
```

E confirmei a razão de nenhum gate ver isso: `apps/landing/tsconfig.json` mapeia
`@leela/api-client` para `../../packages/api-client/src/index.ts` (o `tsc` lê a **fonte**), a
suíte da ponte faz `vi.mock('@leela/api-client', …)` (lê um **dublê**), e `next.config.js` não
tem alias nenhum para os pacotes — o resolvedor cai no `exports` → `./dist/index.mjs`. **Só o
bundle lê o `dist/`, e ninguém o inspeciona antes de subir.**

## (a) O rebuild, e a prova no bundle

`pnpm --filter @leela/api-client build` **falha nesta máquina** — o pre-check de dependências do
pnpm aborta com `ERR_PNPM_IGNORED_BUILDS` (`@sentry/cli` está como
`set this to true or false` no `allowBuilds` do `pnpm-workspace.yaml`). Isso é anterior a mim e
não é do meu território, mas **é o passo 2 do runbook de deploy que a lane anterior escreveu** —
quem seguir o handoff ao pé da letra vai bater nisso. Rodei `npx tsup` dentro do pacote, que é o
que o script `build` executa.

Contagem no `dist/` novo, mesmo controle:

```
                              index.js   index.mjs
  promoverParaProfissional        4          3
  nomeProfissional                0 → 3      0 → 3     ✅
  intencao                        0 → 3      0 → 3     ✅
  nome_profissional_invalido      0 → 1      0 → 1     ✅
  conta_inelegivel                1          1
  xyzzy (controle)                0          0

assinatura no dist: `async function promoverParaProfissional(opcoes)`  ✅ aridade nova
```

⚠️ **`intencaoRegistrada` e `nomeAplicado` valem 0 no `dist/`, e isso está CERTO** — no
api-client eles são campos de *interface*, apagados pelo compilador. Quem for escrever o probe
do runbook precisa mirar em símbolo **de runtime** (`nomeProfissional`, `intencao`), nunca nos
dois do eco. É a mesma armadilha do probe de 08/08, com outra roupa.

## (b) A guarda durável — a CLASSE, e não a instância

**Escolhido:** um gate de **frescor** em `scripts/verificar-frescor-do-workspace.mjs`, ligado ao
`build` da landing (`node ../../scripts/verificar-frescor-do-workspace.mjs && next build`). Ele
compara o `mtime` dos arquivos que o `exports` do pacote **promete** contra o mais recente entre
`src/**`, `tsup.config.*`, `tsconfig.json` e o próprio `package.json` — para **toda** dependência
`workspace:` do app, e não só o api-client.

**Por que este, e não as alternativas:**

- **Recusado: o build do app reconstruir as dependências sozinho.** `turbo run build` já faz
  isso (`build.dependsOn: ["^build"]`), então um rebuild embutido duplicaria trabalho no caminho
  que já está correto — e, pior, **esconderia** o erro de ordem. Reconstruir em silêncio é a
  mesma família do descarte silencioso que esta rodada inteira existe para matar.
- **Recusado: `prebuild` do ciclo de vida do npm.** O pnpm tem `enable-pre-post-scripts=false`
  por padrão desde a 7 e este repo **não tem `.npmrc`** — o gate simplesmente não rodaria. Ele
  entra dentro do próprio script `build`, que roda em qualquer forma de invocação
  (`pnpm --filter … build`, `pnpm build`, `turbo run build`).
- **Recusado como peça única: o `grep` nos chunks do `.next` depois do build** (B1.4 da REV).
  Ele prova **um símbolo**; o gate de frescor prova a **classe**, custa milissegundos e roda
  *antes* de gastar um build inteiro. O grep continua valendo como probe do runbook.

**Falsificado, com número:**

```
antes  (disco como estava)            → EXIT=1
        "@leela/design-system: ./dist/tailwind-preset.js está 1281 min atrás da fonte"
depois (design-system reconstruído)   → EXIT=0
        "3 pacote(s) de workspace com dist/ à frente da fonte"

F5a  gate desligado do script `build`          → 1 falha (o caso da fiação)
F5b  dist do api-client carimbado 24 h atrás   → EXIT=1 + 1 falha (o caso do repo real)
     "@leela/api-client: ./dist/index.js está 1422 min atrás da fonte"
```

### 🔎 Achado NOVO, não previsto pela REV

O gate pegou, na primeira execução, um **segundo caso vivo do mesmo defeito**:
`@leela/design-system` com `dist/` de 09/08 16:00 contra fonte de 10/08 13:20 — **21 horas de
atraso**, com todos os gates da casa verdes. Um `next build` de hoje embarcaria um design system
de ontem. Reconstruído nesta lane (`npx tsup` no pacote; `dist/` é gitignorado, nada versionado).

⚠️ **`apps/painel` tem a MESMA exposição** — o `vite.config.ts` dele só apelida `@`, não os
pacotes `@leela/*`, então o bundle do painel também resolve pelo `exports` → `dist/`. O script já
é genérico (lê o `package.json` do cwd) e a fiação é **uma linha**. Ficou fora desta lane por
território: mexer no `package.json` do painel obrigaria a rodar a suíte inteira dele, e o pedido
era a landing. **Card de uma linha para a próxima lane que tocar o painel.**

## (c) O eco da callable

`PromoverParaProfissionalResult` ganhou `intencaoRegistrada: IntencaoRegistrada` e
`nomeAplicado: boolean`, nos **dois** retornos. Aditivo e compatível: o cliente velho ignora
campo desconhecido.

- `intencaoRegistrada` ecoa o rótulo **registrado**, e não o que veio: typo volta `invalida`,
  cliente velho volta `nao_declarada`. Ecoar o valor cru devolveria o palpite do cliente com cara
  de confirmação do servidor.
- `nomeAplicado` é `true` só quando `organizacao` foi efetivada **nesta** chamada.
- No api-client os dois são **opcionais** (`?`), e o `?` é o contrato honesto: um bundle novo
  pode falar com um servidor anterior ao eco, e aí eles chegam `undefined`. **É essa leitura que
  uma sonda de fumaça usa para saber com quem está falando.**
- Nenhum dos dois carrega PII: o nome entra como booleano, pelo mesmo motivo do log.

---

# ⛔ B2 · a recusa de quem nunca digitou

**Root cause, confirmada.** `PortasDaConta.tsx` inicializava o campo com o `name` do token e o
`conhecer` mandava esse valor **sem a pessoa tocar em nada**; `nomeProfissionalDoPayload` recusa
quando `derivarSlugOrganizacao(nome)` é vazio; e o regex (`[^a-z0-9]+` depois do NFD) apaga tudo
o que está fora do ASCII. Conta válida, nome próprio no campo, zero toque, clique → sétima
recusa. **Antes da lane anterior ela atravessava** (o payload era `{ aceiteTermo: true }` puro).

**O conserto reusa a regra que já existia**, escrita pela própria lane para o token sem `name`:
se o default não vira endereço, o campo nasce vazio. `derivarSlugOrganizacao` vem do **core**,
importada e não recopiada — uma segunda cópia da régua aqui seria exatamente o que o
PONTE-ELEGIVEL-1 existe para impedir.

**A fronteira do conserto, que é o ponto fino:** quem **digita** algo que não vira endereço
continua sendo recusado. Afrouxar o servidor recriaria o descarte silencioso no lugar onde o
endereço é cunhado uma vez. O que muda é só o **default não escolhido**.

**A frase parou de mentir.** `ゆき` tem duas letras e era recusada por uma frase que dizia
"pelo menos duas letras ou números". A régua real tem dois eixos, e agora os dois estão escritos,
nas duas superfícies (tela e servidor):

> Escolha um nome com dois caracteres ou mais e pelo menos uma letra de A a Z ou um número. O
> endereço da sua produtora é escrito só com esses caracteres.

**Testes com os três nomes reais da evidência** (`Анна`, `李`, `ゆき`): campo nasce vazio ×3,
travessia sem toque ×3, mais o controle de que nome latino continua pré-preenchido — incluindo
`Анна2` e `李 Produções`, que **derivam** e por isso têm de aparecer inteiros (a régua é
derivabilidade, não "só ASCII").

---

# ⚠️ R1 · o descarte silencioso nos dois ramos

Duas metades, e a REV está certa nas duas.

- **Servidor:** os dois ramos idempotentes — passo 4 (`caller.tenantId` presente, retorno cedo) e
  passo 6 (`snap.exists` dentro da transação) — passam a devolver `nomeAplicado: false`. Nenhum
  dos dois escreve, e agora os dois **dizem** que não escreveram.
- **Tela:** `await promoverParaProfissional({…})` sem atribuição virou
  `const resultado = await …`. Quando o nome foi digitado **e** `resultado.nomeAplicado === false`,
  a tela de sucesso diz o que aconteceu e para onde ir.

`=== false`, e não `!resultado.nomeAplicado`: contra um servidor anterior ao eco o campo chega
`undefined`, e `undefined` é "não sei", não "não aplicou". Inferir descarte a partir de silêncio
inventaria uma perda que pode não existir — tem caso próprio.

Provado contra **banco de verdade** também: primeira travessia com `Castelo Produções` volta
`nomeAplicado: true`; a segunda, com nome diferente, volta `jaExistia: true` +
`nomeAplicado: false`, e o doc continua com o primeiro nome (RN-467 intacta).

---

# ⚠️ R2 · a frase da paridade

**A REV está certa, e o conserto é de registro.** `ORGANIZACAO_MIN/MAX` são a **mesma constante**
nas duas portas, importada do core — o eixo do comprimento está certo. Mas
`validarCadastroOrganizador` **não** checa derivabilidade: o `/cadastrar` **aceita** `"!!"` e a
porta o **recusa**. É *fail-safe* (a porta é a mais estrita, e o que ela barra é exatamente o que
produziria endereço vazio), então a divergência **fica, declarada**, em vez de virar promessa
falsa de paridade.

Corrigido em três lugares: o comentário da função no servidor, o registro do maestro
(`02-rodadas/2026-08-11-ponte-resolve/01-decisoes-maestro.md`) e o board (`00-boards/V1-KANBAN.md`).

⚠️ **Não corrigi o handoff da PONTE-RESOLVE.** Ele é artefato datado de outra lane; reescrevê-lo
apagaria o registro do que se acreditava na hora. A correção entra **marcada, com data e lane**,
no painel canônico — que é onde o dono lê.

📌 **Fica como card, e não é meu:** mover a checagem de derivabilidade para o core, ao lado de
`validarCadastroOrganizador` (recomendação R2.1 da REV). Mexe no `/cadastrar`, que não é
território de uma lane de conserto.

---

# ⚠️ R3 · o `aria-invalid` real

O `Input` do DS já faz tudo: `useId` determinístico, `aria-invalid` quando há `errorMessage`,
`aria-describedby` que **anexa** o `hint` e o erro sem um sobrescrever o outro, e o erro sai num
`<span role="alert">`. A tela só não estava usando.

A recusa `nome_profissional_invalido` saiu do `<p role="alert">` solto no fim do cartão e entrou
no `errorMessage` do campo. As outras seis continuam no alerta do cartão de propósito: elas falam
da **conta** (sessão, papel, aceite, indisponibilidade) e não têm campo a que se associar.

**A frase sai de UM lugar só** — repeti-la no rodapé faria o leitor de tela anunciar duas vezes o
mesmo erro. Tem caso contando ocorrência.

Detalhe de compilador: o `tsconfig` da casa tem `exactOptionalPropertyTypes: true`, então
`errorMessage={undefined}` **não compila**. A prop entra por spread condicional.

---

## Provas — comando → saída

Tudo em **série, uma por vez, com a máquina só para ela**. Nenhum watcher. As duas suítes
completas passam de 600 s e por isso saíram do primeiro plano do executor — mas nada rodou em
paralelo com elas, que é o que a proibição protege: eu bloqueei esperando cada uma terminar antes
de disparar a próxima, e a prova disso é a própria run 2 da landing fechando em 215 s, o mesmo
número da máquina quieta da REV.

```
# --- servidor, sem emulator ---
cd C:\dev\LEELA\functions
npx vitest run src/__tests__/promocaoProfissionalFronteira.test.ts   → 43 passed (43)   [eram 34; +9]
npx vitest run src/__tests__/promocaoProfissionalWrapper.test.ts     →  9 passed  (9)   [eram  7; +2]

# --- contra emulator (Firestore 127.0.0.1:8080 + Auth 127.0.0.1:9099, LEELA_CLOCK=2026-03-15) ---
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
  GCLOUD_PROJECT=demo-leela LEELA_CLOCK=2026-03-15 \
  npx vitest run src/__tests__/promocaoProfissionalPonte.integration.test.ts
                                                                     → 13 passed (13)   [eram 12; +1]

# --- landing ---
cd C:\dev\LEELA\apps\landing
npx vitest run test/minha-conta-ponte-s1234.test.tsx                 → 53 passed (53)   [eram 39; +14]
npx vitest run test/build-frescor-dist.test.ts                       → 12 passed (12)   [novo]
npx vitest run --maxWorkers=3 --minWorkers=1 \
    test/{minha-conta-ponte-s1234,minha-conta-portas-s1222,build-frescor-dist,porta-organizador}
                                                                     → 4 arquivos · 91 passed (91)

# --- suítes completas dos pacotes tocados ---
api-client     : node scripts/auditar-indices-firestore.mjs
                 → ok · 46 variantes de query, 18 índices compostos · EXIT=0

landing (gate de lote, 61 arquivos) — rodado DUAS vezes, e as duas medições importam:
  run 1  04:10:12 → 04:21:06   9 arquivos vermelhos · 100 testes vermelhos · 639,27 s
                               (collect 1120,00 s)  ⛔ CONTENÇÃO
  run 2  04:23:49 → 04:27:29   Test Files 61 passed (61)
                               Tests     811 passed (811)
                               Duration  215,89 s (collect 334,48 s) · EXIT=0  ✅

functions (suíte completa, 245 arquivos, contra os emuladores 8080/9099):
  04:27:54 → 04:51:05          Test Files  9 failed | 234 passed | 2 skipped (245)
                               Tests      18 failed | 4347 passed | 142 skipped (4507)
                               Duration   1387,96 s · EXIT=1
  ⚠️ os 18 vermelhos são AMBIENTAIS e fora do meu território — seção própria abaixo
  ✅ as quatro suítes da promoção, DENTRO desta run: 43 · 9 · 31 · 13, todas verdes

# --- gates estáticos ---
functions      : tsc --noEmit → 0 · eslint src --max-warnings 0 → 0
api-client     : tsc --noEmit → 0 · eslint src --max-warnings 0 → 0
landing        : tsc --noEmit → 0 · eslint app lib --max-warnings 0 → 0
```

### Falsificações — cada guarda desligada, medida e restaurada

```
F1  o pré-preenchimento perde a regra de derivabilidade   → 6 falhas  (landing · B2)
F2  o retorno da callable volta a ser descartado          → 2 falhas  (landing · R1)
F3  `errorMessage` sai do Input, erro solto no <p>        → 6 falhas  (landing · B2+R3)
F4  o eco some dos dois retornos do servidor              → 10 falhas (functions · B1+R1)
F5a o gate de frescor sai do script `build`               → 1 falha   (landing · B1)
F5b o dist do api-client carimbado 24 h atrás             → EXIT=1 + 1 falha (landing · B1)
# todas restauradas e re-verdes: 53/53 · 52/52 · 12/12
```

### O gate de lote da landing, medido duas vezes na mesma noite

A primeira run fechou **9 arquivos vermelhos em 639 s**. A segunda, com o **mesmo código**, fechou
**61/61 e 811/811 em 215,89 s**. A diferença não é código — é máquina: 11 processos `node` vivos
durante a primeira, e `collect` sozinho somando **1120 s** contra 334 s na segunda.

O número da segunda bate na casa com o da PONTE-REV (**214,86 s**, máquina quieta), e o formato do
vermelho bate com a run 2 da PONTE-RESOLVE (**9 arquivos vermelhos, 531 s**). São agora **três**
medições dizendo a mesma coisa: **este gate só é confiável em máquina livre**, e o vermelho dele
sob carga não é sinal de regressão. Quem for re-gatear precisa rodá-lo sozinho, ou vai perseguir
fantasma.

Contra o baseline da REV (60 arquivos, 782 testes): **+1 arquivo** (o gate de frescor) e
**+29 testes** — 12 do gate de frescor e 17 líquidos na suíte da ponte (+18 casos novos, −1 que
saiu da lista genérica de recusas porque virou bloco próprio no R3). A conta fecha exata.

### Os 18 vermelhos da suíte de functions — ambientais, e não meus

Duas provas independentes, porque "não é meu" é exatamente o tipo de frase que precisa de número:

1. **Nenhum dos 9 arquivos toca a promoção.** `grep -l "promoverParaProfissional\|profissionais"`
   nos nove devolve **nada**. São `backfillCodigoPedido`, `codigoPedidoReserva` (×2),
   `emailIdentidade`, `ingressosOrfaos`, `journeyAceiteE18`, `rateLimitAceite`, `revContasMotor`
   e `storageRules`.
2. **Eles pedem emuladores que não estão de pé, e pedem por escrito.** Os próprios arquivos
   declaram portas DEDICADAS, cada um com o seu `firebase.*.json`:
   `codigoPedidoReserva.integration` → Firestore **8781**; `codigoPedidoReserva.attack` → **8881**
   (auth 9881); `backfillCodigoPedido` → **8981** (auth 9981); `storageRules` → Storage **9199**.
   `netstat` durante a run: só **8080** e **9099** ouvindo. Os erros são
   `ECONNREFUSED` nessas portas e `TypeError: fetch failed`, e nada mais.

Ou seja: `npx vitest run` na raiz de `functions` **não é o gate de lote desse pacote** — parte da
suíte foi escrita para rodar sob `firebase emulators:exec` com config própria, um arquivo por vez.
É a mesma nota que a casa já carrega ("suíte de functions sem gate de lote confiável"), agora com
os nomes e as portas.

⚠️ **Uma armadilha de método, para quem for falsificar nesta árvore:** os arquivos versionados
estão com **CRLF** no working copy (o Git avisa a cada commit). Uma primeira tentativa da F4 com
regex de `\n` casou só as linhas de uma linha só e **passou verde**, o que teria virado uma
falsificação falsa se eu tivesse parado ali. Falsificação que não fica vermelha **não é prova de
nada** — confira o arquivo depois de patchá-lo, sempre.

---

## Emuladores

Encontrei os dois **de pé**, com os PIDs que o dispatch declarou: `127.0.0.1:8080` **PID 25452**
(Firestore) e `127.0.0.1:9099` **PID 26412** (Auth). **Reusei os dois**, com host:porta explícito
e IPv4, sem subir nem derrubar nada.

**Estado final: os dois continuam DE PÉ, nos mesmos PIDs.** Não os derrubei de propósito — não
são meus, e a nota da REV registra que o "derrubado ao terminar" do handoff anterior não se
cumpriu, o que sugere uma lane vizinha usando os mesmos. Derrubá-los às cegas mataria a suíte de
quem estiver do lado. **Quem for fechar a noite precisa matá-los explicitamente.**

---

## Território

- **Escrevi em:** `functions/src/platform/promoverParaProfissional.ts`,
  `functions/src/__tests__/{promocaoProfissionalFronteira,promocaoProfissionalWrapper,promocaoProfissionalPonte.integration}.test.ts`,
  `packages/api-client/src/platform/profissionais.ts`, `packages/api-client/src/index.ts`,
  `apps/landing/app/(public)/minha-conta/PortasDaConta.tsx`,
  `apps/landing/test/{minha-conta-ponte-s1234,build-frescor-dist}.test.*`,
  `apps/landing/package.json`, `scripts/verificar-frescor-do-workspace.mjs`,
  `leela-specs/02-rodadas/2026-08-11-ponte-resolve/01-decisoes-maestro.md`,
  `leela-specs/00-boards/V1-KANBAN.md`, e este handoff.
- **Reconstruí (artefato, não versionado):** `packages/api-client/dist`,
  `packages/design-system/dist`.
- ⛔ `apps/landing/lib/portaOrganizador.ts` **intocado** — o comentário pinado das linhas 52-68
  nunca entrou no território. ⛔ `apps/painel` **intocado**. ⛔ Nenhum deploy.
- `git commit --only` com pathspec explícito em todos. Sem `add -A`, sem `--amend`, sem `stash`.
  Push depois do 2º e do 4º.

---

## DELTA para o re-gate da revisora

O que mudou desde o `HEAD 10d4b319` que ela revisou, por bloqueador e ressalva. Os quatro commits
são `36510249`, `ec517c5c`, `1a3b024b`, `369a512e`.

### B1 — o vetor 5

| O que mudou | Onde |
|---|---|
| `PromoverParaProfissionalResult` ganha `intencaoRegistrada` + `nomeAplicado`; os dois `return` os preenchem | `functions/src/platform/promoverParaProfissional.ts` |
| Espelho no cliente, com os dois campos **opcionais** e a razão escrita | `packages/api-client/src/platform/profissionais.ts` · `src/index.ts` (exporta `IntencaoRegistrada`) |
| Gate de frescor do `dist/` (novo arquivo) | `scripts/verificar-frescor-do-workspace.mjs` |
| Fiação do gate no `build` + script `verify:frescor` | `apps/landing/package.json` |
| 12 casos do gate, incluindo o que olha o **repo de verdade** | `apps/landing/test/build-frescor-dist.test.ts` |
| Eco no transporte + sonda de fumaça + typo ecoado | `functions/src/__tests__/promocaoProfissionalWrapper.test.ts` |
| `dist/` do api-client e do design-system reconstruídos | artefato, não versionado |

**Para re-medir:** `cd apps/landing && node ../../scripts/verificar-frescor-do-workspace.mjs`
(espera EXIT=0) e a contagem de `nomeProfissional`/`intencao` no `dist/` com `xyzzy` como
controle. **Não** conte `promoverParaProfissional` — ele dá falso verde.

### B2 — a recusa de quem nunca digitou

| O que mudou | Onde |
|---|---|
| `nomeInicialDaProdutora` + `useState` inicial; import de `derivarSlugOrganizacao` do core | `apps/landing/app/(public)/minha-conta/PortasDaConta.tsx` |
| Frase honesta da recusa, na tela | idem (`FRASE_DA_RECUSA.nome_profissional_invalido`) |
| Frase honesta da recusa, no servidor | `functions/src/platform/promoverParaProfissional.ts` |
| 10 casos com `Анна`/`李`/`ゆき` + controle de nome latino e de quem digita | `apps/landing/test/minha-conta-ponte-s1234.test.tsx` |
| 3 casos da régua e da frase, no servidor | `functions/src/__tests__/promocaoProfissionalFronteira.test.ts` |

### R1 — o descarte silencioso

| O que mudou | Onde |
|---|---|
| `nomeAplicado: false` cravado no ramo do tenant e calculado no ramo da transação | `functions/src/platform/promoverParaProfissional.ts` |
| A tela lê o retorno e o estado `nomeNaoAplicado`; frase nova `data-slot="ponte-nome-nao-aplicado"` | `apps/landing/app/(public)/minha-conta/PortasDaConta.tsx` |
| 5 casos (com nome, sem nome, aplicado, servidor sem eco, e o estrutural que proíbe o `await` solto) | `apps/landing/test/minha-conta-ponte-s1234.test.tsx` |
| 2 casos dos ramos + 1 contra banco real | `functions/src/__tests__/promocaoProfissionalFronteira.test.ts` · `…Ponte.integration.test.ts` |

### R2 — a frase da paridade

| O que mudou | Onde |
|---|---|
| Correção marcada, com data e lane, no painel canônico | `leela-specs/02-rodadas/2026-08-11-ponte-resolve/01-decisoes-maestro.md` |
| Correção no card S1234-T5 + entradas S1234-REV2 e S1234-T9 | `leela-specs/00-boards/V1-KANBAN.md` |
| Comentário da função, na fonte | `functions/src/platform/promoverParaProfissional.ts` |

### R3 — a11y do campo

| O que mudou | Onde |
|---|---|
| `errorMessage` no `Input` por spread condicional; a recusa do nome sai do `<p>` do rodapé | `apps/landing/app/(public)/minha-conta/PortasDaConta.tsx` |
| 4 casos: `aria-invalid`, `aria-describedby` (erro **e** hint), frase única, e as recusas de conta que continuam no alerta | `apps/landing/test/minha-conta-ponte-s1234.test.tsx` |

---

## O que continua devendo, e não é meu

1. ⛔ **A conferência visual no navegador** (R3.2 da REV). O cartão mudou de forma pela terceira
   vez e jsdom não desenha. É **gate**, e nenhuma prova estática o substitui.
2. **Sem axe-core nesta lane.** O `aria-invalid` e o `aria-describedby` estão provados por teste
   de DOM, não por auditoria de a11y.
3. **`apps/painel` com a mesma exposição de `dist/`** — fiação de uma linha, fora do território.
4. **R2.1:** unificar a checagem de derivabilidade no core, ao lado de
   `validarCadastroOrganizador`. Mexe no `/cadastrar`.
5. **R4 da REV** (a premissa invertida da D-0802-1 no texto de dispatch) — não estava no meu
   pedido e o texto de dispatch não mora no repo. Continua de pé.
6. **`pnpm --filter … build` quebrado nesta máquina** (`ERR_PNPM_IGNORED_BUILDS`, `@sentry/cli`
   com `set this to true or false` no `allowBuilds`). É o passo 2 do runbook de deploy escrito
   pela lane anterior. Quem for deployar precisa disso resolvido ou vai usar `npx tsup`.

## Ordem de deploy, atualizada

Continua **functions → api-client → landing**, e continua necessária. O que mudou é que ela
deixou de ser a **única** defesa: o gate de frescor recusa o build errado, e o eco da callable
deixa uma sonda de fumaça distinguir servidor novo de servidor velho pela resposta.
