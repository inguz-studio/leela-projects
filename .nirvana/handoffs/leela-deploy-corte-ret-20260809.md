---
trace: leela-deploy-corte-ret-20260809
lane: DEPLOY-CORTE-RET
employee: sf-platform-lead (software-forge)
repo: C:\dev\LEELA
worktree: C:\dev\leela-wt-deploy-corte-0809
head_pinado: 9fbcd9ab
data: 2026-08-09
papel: completar o deploy de painel + landing que a lane DEPLOY-CORTE original (~13h) não terminou
---

# DEPLOY-CORTE-RET — handoff vivo

Contrato: `.nirvana/briefs/leela-deploy-corte-ret-20260809-enriched.md`.
Medição que fundamenta a lane: `.nirvana/handoffs/leela-painel-corte-20260809-DEPLOY-CORTE.md`
(functions no ar desde 13:09; painel e landing fora do ar, byte a byte o baseline de 08/08).

## Etapa 0 · portão

REV-CORTE (`.nirvana/handoffs/leela-painel-corte-20260809-REV-CORTE.md`) aprovou os três alvos
com ressalvas não bloqueantes. "O deploy pode levar os três juntos." Pacote só é deployável com
`d9394f51` dentro (senão o alvo 1 sobe com o painel morto no caminho feliz). `9fbcd9ab` é
descendente de `d9394f51` — confere por `git merge-base --is-ancestor`.

Árvore principal no início desta lane: `packages/design-system/src/theme/ThemeProvider.tsx` e
`ThemeProviderRN.tsx` modificados (lane REDESIGN-DS-TOKENS em voo). Não tocados, não staged, não
stashed.

## Etapa 1 · worktree + build

`git worktree add C:\dev\leela-wt-deploy-corte-0809 9fbcd9ab` — ok, HEAD detached em `9fbcd9ab`.
`pnpm install --config.verify-deps-before-run=false` — ok (único aviso: `@sentry/cli` fica de
fora de propósito, igual ao resto do repo).

Build em ordem de dependência (nenhum pacote tem `dist/` num worktree novo — todos gitignorados):

| Pacote | Build | Resultado |
|---|---|---|
| `packages/core` | `tsup` | ok — `dist/index.js` 302.83 KB |
| `packages/api-client` (depende de `core`) | `tsup` | ok — `dist/index.js` 95.90 KB |
| `packages/design-system` | `tsup` | ok — `dist/index.js` 231.94 KB |
| `apps/painel` | `vite build --mode leela-hub` | ok — 3991 módulos, `index-_EVW2ljU.js` (2.246,67 kB) + `index-3PlkfKJK.css` (109.98 kB) + `browser-BXdiCFWD.js` (24.53 kB), 23.35s |

## Etapa 2 · painel — deploy ✅ e prova pelo ar

```
> node -e "..." firebase.prod.json
hosting alvos: 1
  site=leela-hub  public=apps/painel/dist

> npx firebase-tools@13 deploy --only hosting --project prod --config firebase.prod.json --non-interactive
+ hosting[leela-hub]: version finalized · release complete
+ Deploy complete!
```

**Um alvo só** (`--only hosting`, config declara 1 site) — nenhum comando tocou functions, rules,
índices ou storage.

### Prova 1 · hash do bundle baixado de produção — antes × depois

| asset | ANTES (baseline 08/08 23:27, medido pela DEPLOY-CORTE-CHECK) | DEPOIS (no ar agora) |
|---|---|---|
| JS | `index-CfBX04Vv.js` | **`index-_EVW2ljU.js`** |
| CSS | `index-3PlkfKJK.css` | `index-3PlkfKJK.css` (nome **igual** — esperado: nenhum fix desta lane toca CSS, conteúdo idêntico) |

### Prova 2 · o servido é byte a byte o construído localmente

```
index-_EVW2ljU.js  local a1dd6f53c35c53f600aaa3859a1f80df3be733f48d730ecb5ea509d9ca80014d
                    no ar a1dd6f53c35c53f600aaa3859a1f80df3be733f48d730ecb5ea509d9ca80014d   IDÊNTICO
index-3PlkfKJK.css local 60bce6cc9f9e4951d48784ed151638233c29506e9cdbe82340739cd5ebd783a8
                    no ar 60bce6cc9f9e4951d48784ed151638233c29506e9cdbe82340739cd5ebd783a8   IDÊNTICO (== baseline também, CSS não mudou)
```

### Prova 3 · as 4 frases novas do PARSE, no JS baixado do ar

| String (`431c92ac`) | No ar? |
|---|---|
| "mil duzentos e trinta e quatro" (`REGUA_PONTO_E_VIRGULA`) | **presente** (1) |
| "Em branco vale 0 (nenhum kit disponível)" (`CAPACIDADE_DE_KIT_EM_BRANCO`) | **presente** (1) |
| "Ex.: 1.000" (`EXEMPLO_DE_MIL_NA_VAGA`) | **presente** (1) |
| "a campanha sai 24 horas antes" (`INTERVALO_PADRAO_DA_AUTOMACAO`) | **presente** (1) |
| controle positivo — "Ponto separa milhar e vírgula separa centavos" (erro pré-existente do parser) | **presente** (1) |
| controle negativo (`xyzzy0809corte`) | **ausente** (0) |

Mesma sonda da medição retroativa: as 4 estavam ausentes antes, presentes agora; os dois controles
se comportam como esperado.

### Prova 4 · `d9394f51` observável no bundle — por comparação de build, não por presunção

O conserto crítico é só lógica (React callback/estado), sem string literal nova — não sobrevive a
grep direto. Prova por diferença de bytecode compilado, dentro do próprio worktree (sandbox
descartável, sem risco à árvore principal):

1. Bundle **deployado** (`9fbcd9ab`, descendente confirmado de `d9394f51` — `git merge-base
   --is-ancestor` ok): `index-_EVW2ljU.js`, sha256 `a1dd6f53c3…`, 2.251.021 bytes.
2. Checkout temporário do worktree (isolado, não é a árvore principal) para
   `e0d9b0010967cce86c193068bdcb3a945f605bdd` — o **pai direto** de `d9394f51`, ou seja, o painel
   *sem* o fix. Rebuild do painel (pacotes já buildados não mudam — o diff de `d9394f51` só toca
   `apps/painel/src`): `index-uw_xXCuP.js`, sha256 `583b018ab2…`, 2.250.813 bytes.
3. `cmp` dos dois: **diferem no byte 3530**. Nomes diferentes (hash de conteúdo do Vite), tamanhos
   diferentes (208 bytes a mais no pós-fix — consistente com a chamada extra a `liberarFundo()`
   antes das quatro saídas do aviso).
4. `git reset --hard 9fbcd9ab` no worktree (restaura o pinado) e rebuild do painel de novo:
   hash bate de novo com o que está no ar (`a1dd6f53c3…`). Confirma que o passo 2 não deixou
   resíduo.

**Conclusão:** o bundle no ar não é byte a byte igual ao que um build sem `d9394f51` produziria —
o fix muda o artefato compilado, e o artefato no ar é exatamente o do commit pinado que o inclui.

## Etapa 3 · landing — deploy ✅ e prova pelo ar

```
> node apps/landing/scripts/deploy-leela-hub.mjs   (background, teto de 10 min)
[deploy-landing] env carregada de .env.leela-hub: 9 chaves
[deploy-landing] patch temporário: workspace:* → devDependencies; engines.node=22
  ▲ Next.js 14.2.35 · ✓ Compiled successfully · ✓ Generating static pages (12/12)
i  hosting[leela-landing]: found 99 files
+  hosting[leela-landing]: file upload complete
+  functions[firebase-frameworks-leela-landing:ssrleelalanding(us-central1)] Successful update operation.
+  hosting[leela-landing]: version finalized · release complete
+  Deploy complete!
[deploy-landing] package.json restaurado.
```

Uma execução, sem queda, exit code 0. `firebase deploy --only hosting:leela-landing --config
firebase.landing.json` — config declara **um site só** (`leela-landing`), sem `firestore` nem
`emulators`; a atualização da function `ssrleelalanding` é a integração `webframeworks` do próprio
Next (o mesmo aviso que a DEPLOY-FINAL já registrou — não é function de produto).

### Prova 1 · hash do bundle baixado — antes × depois

| chunk | ANTES (baseline 08/08 23:37, confirmado ainda no ar pela DEPLOY-CORTE-CHECK) | DEPOIS (no ar agora) |
|---|---|---|
| `main-app` | `main-app-e695e72d2f035e50.js` | **`main-app-a3edf82a1b6d0150.js`** |
| CSS do tema | `5c28c218c2cc65aa.css` | `5c28c218c2cc65aa.css` (nome **igual** — esperado: nenhum fix desta lane toca o tema) |

### Prova 2 · achado de método — os chunks de `/minha-conta` não são só os referenciados por `<script src>`

A sonda original (baixar os chunks que o HTML de `/minha-conta` referencia via regex
`/_next/static/.../.js`) trouxe **19 JS + 3 CSS = 22 arquivos**, mas **nenhum** continha as strings
de prova — nem os dois controles positivos que deveriam estar lá. O App Router do Next.js injeta o
código **específico da rota** (`PortasDaConta.tsx`, onde vivem as duas strings) via *flight data*
inline (`self.__next_f.push(...)`), que referencia caminhos **parciais** de chunk
(`/minha-conta/page-9fa6ff203c4c7b3f.js`, `/layout-....js`) sem o prefixo `/_next/static/chunks/app`.
Resolvido montando a URL completa
(`/_next/static/chunks/app/(public)/minha-conta/page-9fa6ff203c4c7b3f.js`, HTTP 200) e somando aos
22 — **25 arquivos, 1.406.393 bytes** no total pesquisado.

### Prova 3 · a frase da sexta recusa, no ar

| String | Nos chunks de `/minha-conta`? |
|---|---|
| **"Fale com o time Leela para liberar o seu acesso"** (`conta_inelegivel`, `38420cb6`) | **presente** (1) — contexto: `"...essa conta não pode virar conta de profissional. Fale com o time Leela para liberar o seu acesso."` |
| controle positivo — "Painel Profissional" (rótulo já confirmado no ar) | **presente** (1) |
| controle positivo — "O painel vai pedir sua senha de novo" | **presente** (1) |
| rótulo antigo "Conhecer o painel profissional" | **ausente** (0) |
| controle negativo (`xyzzy0809corte`) | **ausente** (0) |
| controle negativo 2 (`xyzzy-nao-existe-0809`) | **ausente** (0) |

Achadas nos dois chunks corretos: `app/(public)/minha-conta/page-9fa6ff203c4c7b3f.js` (a frase da
recusa e "Painel Profissional") — o mesmo arquivo, `PortasDaConta.tsx`, empacota as duas.

### Prova 4 · o servido é byte a byte o construído

```
main-app-a3edf82a1b6d0150.js                        local 1c81351bdf5a50fd… no ar 1c81351bdf5a50fd…  IDÊNTICO
app/(public)/minha-conta/page-9fa6ff203c4c7b3f.js    local 7b4dc1cbbf005be0… no ar 7b4dc1cbbf005be0…  IDÊNTICO
_next/static/css/5c28c218c2cc65aa.css                local 7fca237066ca65d5… no ar 7fca237066ca65d5…  IDÊNTICO (== registrado em 08/08)
```

### Smokes finais (leitura, sem escrita)

| # | Smoke | Resultado |
|---|---|---|
| 1 | painel `/` | http=200 · 0,15s |
| 2 | landing `/` | http=200 · 3,44s |
| 3 | painel segue com o bundle novo depois do deploy da landing (sites independentes, mas checado) | `index-_EVW2ljU.js` ✅ |

## Etapa 4 · limpeza

`git worktree remove` reportou "Directory not empty" (arquivos residuais de `node_modules`); o git
já havia desregistrado o worktree (sumiu de `git worktree list`) e a pasta em disco foi apagada
manualmente (`rm -rf`). Confirmado: `git worktree list` mostra só `C:/dev/LEELA [main]`, e o path
`C:/dev/leela-wt-deploy-corte-0809` não existe mais.

## Fechamento

| Passo | Estado | Prova |
|---|---|---|
| 0. Portão | ✅ | REV-CORTE aprovou os três alvos com ressalvas não bloqueantes; `9fbcd9ab` confirmado descendente de `d9394f51` |
| 1. Worktree + build | ✅ | pinado em `9fbcd9ab`; `core`→`api-client`→`design-system`→`painel` nessa ordem, todos gitignorados, todos rebuildados do zero |
| 2. Painel | ✅ **NO AR** | hash mudou, byte a byte igual ao build local, 4 strings do PARSE presentes, `d9394f51` provado por comparação de build |
| 3. Landing | ✅ **NO AR** | hash mudou, byte a byte igual ao build local, frase da sexta recusa presente, 2 controles positivos presentes, 2 negativos ausentes |
| 4. Limpeza | ✅ | worktree removido (git + disco) |

### Zero mudança em functions/rules/índices

Nenhum comando desta lane usou `--only functions`, `--only firestore`, `--only storage` ou
deploy sem `--only`. Os dois comandos de deploy rodados: `firebase deploy --only hosting --project
prod --config firebase.prod.json` (painel) e, dentro do script, `firebase deploy --only
hosting:leela-landing --project prod --config firebase.landing.json` (landing) — os dois configs
declaram hosting como único alvo possível.

### Nenhum arquivo da lane TOKENS arrastado

Build e deploy rodaram inteiramente dentro do worktree isolado, pinado num commit anterior a
qualquer commit da REDESIGN-DS-TOKENS. Os commits de docs desta lane, na árvore principal, usam
`git commit --only` com pathspec explícito nos três arquivos tocados (este handoff, o adendo no
handoff da medição, o board) — nunca `add -A`, nunca `stash`, nunca `amend`.

### Nada foi violado

Não fiz deploy de functions, Firestore, Rules, storage ou índices · não rodei suíte · não editei
código de produto · não abri navegador (toda prova por `curl`/hash/grep) · não escrevi em nenhum
documento de produção além de handoff/board · `git commit --only` no fecho, sem `-A`, sem `stash`,
sem `amend`.

Status: **concluído.**
