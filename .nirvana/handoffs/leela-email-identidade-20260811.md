# EMAIL-IDENTIDADE — handoff

**Trace:** `leela-redesign-v2-20260810` · **Lane:** EMAIL-IDENTIDADE
**Autor:** sf-backend-engineer (software-forge) · **Data:** 2026-08-11
**Commit:** `b59b4451` (push feito, `origin/main` atualizado)

## O defeito

`functions/src/__tests__/emailIdentidade.test.ts` vermelho em 2 asserções (M1):

```
PALETA.superficie === --surface-raised
  expected '#161616' to be 'RGBA(30, 11, 16, 0.42)'

PALETA.destaque === --surface-overlay
  expected '#1C1C1C' to be 'RGBA(255, 255, 255, 0.045)'
```

## Root cause

Não é bug de cor. É mudança de PAPEL de token que o teste não acompanhou.

O merge do redesign (DELTA-UX T2, dark-wine/brasa) introduziu um modo "vidro"
opcional na UI, ativado por `[data-glass="on"]`. Dentro de
`packages/design-system/themes/brasa.css`, esse seletor redeclara
`--surface-raised` e `--surface-overlay` — os MESMOS nomes que já existiam —
como filme translúcido:

```css
/* base, linha ~147-148 — continua opaco por padrão */
--surface-raised: var(--neutral-900);   /* #161616 */
--surface-overlay: var(--neutral-850);  /* #1C1C1C */

/* linha ~546-552 — só sob [data-glass="on"] */
[data-glass="on"] {
  --surface-raised: var(--glass-surface-raised);   /* rgba(30,11,16,.42) */
  --surface-overlay: var(--glass-surface-overlay); /* rgba(255,255,255,.045) */
}
```

O parser do teste (`tokensBrasa()`) lê o arquivo inteiro com um regex global
`/^\s*(--[a-z0-9-]+):\s*([^;]+);/gim` e monta um `Map` — sem noção de escopo
de seletor CSS. Como o bloco `[data-glass="on"]` vem DEPOIS do bloco base no
arquivo, a última ocorrência (a translúcida) vence no `Map`, e o teste passou
a comparar a paleta do e-mail contra um valor que só se aplica sob um atributo
que o e-mail nunca carrega.

**O valor base do tema não mudou.** `#161616`/`#1C1C1C` continuam sendo a cor
opaca padrão de `--surface-raised`/`--surface-overlay`. O que mudou é que
esses nomes agora têm dois sentidos possíveis (opaco por padrão, translúcido
sob `data-glass`), e o design system já resolveu essa ambiguidade para quem
precisa de opacidade garantida: existem os tokens-companheiro
`--surface-raised-opaque` / `--surface-overlay-opaque`, que resolvem SEMPRE
para `var(--neutral-900)`/`var(--neutral-850)`, nunca para o filme. O próprio
DS já usa esse padrão — `--popover: var(--surface-overlay-opaque)` em
`themes/index.css` — pelo mesmo motivo que o e-mail precisa: um popover pode
renderizar fora do contexto de blur, e um e-mail nunca compõe alfa de forma
confiável (motor Word do Outlook, entre outros).

## Direção escolhida e por quê

**Teste + comentários, não o template.** Os hex da `PALETA` em `identidade.ts`
já estavam certos (`#161616`, `#1C1C1C` — o valor opaco correto). O que estava
errado era QUAL token do design system esses valores deveriam provar que
espelham.

Mudei o mapeamento em `M1` (`emailIdentidade.test.ts`, `casos`):
- `superficie` → `--surface-raised-opaque` (era `--surface-raised`)
- `destaque` → `--surface-overlay-opaque` (era `--surface-overlay`)

E sincronizei os comentários de `PALETA.superficie`/`PALETA.destaque` em
`functions/src/email/identidade.ts` para citar o token `-opaque` e explicar o
motivo (compõe alfa não é seguro em cliente de e-mail).

Rejeitei duas alternativas:
1. Atualizar o teste para esperar o `RGBA(...)` — errado, porque o e-mail
   NUNCA pode renderizar aquele filme translúcido corretamente (sem backdrop,
   sem `data-glass`, compositing inconsistente entre clientes).
2. Hardcodar o número sem apontar para um token — perde o espelho provado que
   `M1` existe para garantir (a regra de governança do design.md: zero cor
   fora de token).

## Impacto visual (gate visual — sem screenshot de e-mail, descrição)

**Nenhum.** A cor renderizada nos 8 templates de e-mail não muda: o cartão da
mensagem continua `#161616` e o bloco de destaque/código continua `#1C1C1C`,
idênticos a antes do redesign. Esta é uma correção de PROVA (qual token o
teste usa para validar), não uma mudança de valor.

## Gates rodados

- `emailIdentidade.test.ts` isolado: **167/167 verde**.
- Grupo de e-mails de functions, sem emulador (por recorte):
  `emailIdentidade`, `emailTemplates`, `emailProvider`, `basePublicaEmailLink`,
  `linkDosEmails.contract` — **213/213 verde**.
- `emailIncidente.integration.test.ts` / `emailIngressos.integration.test.ts`:
  vermelho por `ECONNREFUSED ::1:8080` / `127.0.0.1:8080` — Firestore/Auth
  Emulator não subiu neste run. Ambiental, mesma categoria dos vermelhos
  conhecidos citados no brief — não persegui.
- `npx tsc --noEmit`: 0 erros.
- `npx eslint src --max-warnings 0`: 0 warnings/erros.

## Arquivos tocados

- `functions/src/__tests__/emailIdentidade.test.ts` — mapeamento `M1.casos` +
  comentário de root cause.
- `functions/src/email/identidade.ts` — comentários de `PALETA.superficie` e
  `PALETA.destaque` sincronizados com o token correto.

Nada além disso: `git commit --only` nos dois arquivos. Árvore compartilhada
com a lane INFRA-DEPLOY preservada — `apps/landing/test/build-frescor-dist.test.ts`
e `scripts/verificar-frescor-do-workspace.mjs` seguem modificados e não
tocados por mim.

## Sem deploy

Nenhum deploy foi feito. Fix commitado e pushed em `origin/main` (`b59b4451`).

## Follow-up parqueado (não corrigido nesta lane — proporcional a UM defeito)

`tokensBrasa()` em `emailIdentidade.test.ts` lê `brasa.css` inteiro com regex
global sem respeitar escopo de seletor CSS — a última declaração do MESMO
nome no arquivo vence no `Map`, não a que está em vigor no cascade base. Hoje
isso só não quebra de novo porque os tokens `-opaque` aparecem uma única vez
no arquivo (sem override sob nenhum seletor). Se algum dia um token `-opaque`
— ou qualquer outro dos 10 tokens que `M1` verifica — ganhar um override
escopado (glass ou qualquer outro modo futuro), o mesmo falso-vermelho (ou,
pior, um falso-VERDE que mascara divergência real) pode se repetir. Corrigir
isso exigiria tornar `tokensBrasa()` ciente de escopo (por exemplo, resolver
só o primeiro bloco top-level do arquivo, que hoje é o bloco base sem
seletores condicionais) — fora do escopo desta lane, mas vale um card.
