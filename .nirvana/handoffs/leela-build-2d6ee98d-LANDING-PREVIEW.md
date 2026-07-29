# Handoff vivo · lane LANDING-PREVIEW · trace leela-build-2d6ee98d · 2026-07-29

Executor: sf-platform-lead (software-forge). Brief: `.nirvana/briefs/leela-build-2d6ee98d-LANDING-PREVIEW-enriched.md`.
Objetivo: pôr `apps/landing` (Next.js) no ar num link público real do projeto **leela-hub**, apontando para o backend
de produção já deployado pela lane DEPLOY-PREVIEW, com o painel INTOCADO.

## Estado

- [x] **Task 1 — reconhecimento + escolha do veículo de deploy** (decisão executada nas tasks seguintes)
- [x] **Task 2 — site, config e env versionados** — site `leela-landing` CRIADO
  (`https://leela-landing.web.app`); `firebase.landing.json` (um site, mais nada);
  `apps/landing/.env.leela-hub` (config web pública + `NEXT_PUBLIC_LEELA_URL`, sem emulador, sem
  `LEELA_CLOCK`); `apps/landing/scripts/deploy-leela-hub.mjs` (redeploy em 1 comando);
  `.gitignore` com a exceção cirúrgica do env, `.firebase/` e `*.deploybak`.

## Reconhecimento (fatos, com prova)

**A landing NÃO pode ser export estático.** Prova no código:
`app/(public)/page.tsx:40`, `app/(public)/convite/page.tsx:16`, `app/(public)/convite/afiliado/page.tsx:16` e
`app/(public)/[eventSlug]/inscricao/page.tsx:12` declaram `export const dynamic = 'force-dynamic'`;
`app/(public)/[eventSlug]/page.tsx:27` usa ISR (`revalidate = 300`, `dynamicParams = true`, sem
`generateStaticParams`); `app/sitemap.ts` e `app/robots.ts` são gerados em runtime; `app/health/route.ts` é
Route Handler. Leitura de dados é server-side por Admin SDK (`lib/firebaseAdmin.ts` → `lib/leitor.ts`).
Conclusão: **precisa de servidor Node**. Export estático está descartado por evidência, não por gosto.

**O runtime do SSR só precisa de `next` + `firebase-admin`.** Prova: o rastro de output file tracing do Next
(`.next/server/app/(public)/page.js.nft.json`, 897 arquivos) referencia de `node_modules` apenas `next`,
`firebase-admin` e o store `.pnpm`; dos workspaces `@leela/core` e `@leela/design-system` aparece **só o
`package.json`** — o código deles é **bundlado pelo webpack do Next** no build. Isto é o que torna seguro não
enviar `@leela/*` no `package.json` da função (ver Premissa 2).

**O `workspace:*` é uma mina conhecida.** A DEPLOY-PREVIEW já provou (Task 4) que o Cloud Build roda **npm puro**
e morre com `EUNSUPPORTEDPROTOCOL` diante de `workspace:*`. O `apps/landing/package.json` tem três:
`@leela/api-client`, `@leela/core`, `@leela/design-system`.

**Como a integração do firebase-tools monta a função** (lido em
`firebase-tools@15.22.4/lib/frameworks/index.js:295-355` e `lib/frameworks/next/index.js:379-467`):
copia o `package.json` do app verbatim, **apaga `scripts` e `devDependencies`**, acrescenta
`firebase-frameworks`/`firebase-functions`/`firebase-admin`, e gera um `server.js` com
`onRequest` de `firebase-functions/v2/https` (**gen2**). `engines.node` só é preenchido se o app não declarar —
com Node 24 local ele escreveria `"24"`, runtime que o GCF ainda não serve.

**Painel:** site `leela-hub`, canal `preview` (`https://leela-hub--preview-y4n0cxzj.web.app`), live em 404 de
propósito. Só existe **um** site de Hosting no projeto hoje (`firebase hosting:sites:list --project prod`).

## Decisão do veículo (uma recomendação, executada)

**Escolhido: site de Hosting NOVO (`leela-landing`) + web frameworks (`source: apps/landing`) no canal LIVE
desse site, por um `firebase.landing.json` dedicado.**

| Alternativa | Por que não |
|---|---|
| Canal de **preview** no site do painel (`leela-hub`) | Um site só tem um `public`/`source`; o canal do painel seria sobrescrito. Fere "painel intocado". |
| Canal de preview num site novo | Funciona, mas **expira em 30 dias** e o link muda a cada recriação. O dono quer navegar entre painel e site; link estável vale mais. |
| Export estático | Impossível — provado acima. |
| Cloud Run direto (`gcloud run deploy --source`) | `gcloud` não está instalado nesta máquina (fato registrado na DEPLOY-PREVIEW). |
| Função HTTPS própria + `output: 'standalone'` + wrapper artesanal | É o "heroísmo" que a DEPLOY-PREVIEW recusou. Reinventa o que o `firebase-frameworks` já faz. |
| Firebase App Hosting | Exige conectar repositório GitHub por OAuth no console — não é headless. |

**Critério de sucesso falsificável:** `curl` na URL da landing devolve 200 com nome de evento vigente do seed de
produção; `curl` na página de um evento devolve 200 com o CTA de inscrição no HTML; `curl` no canal do painel
segue 200 e `leela-hub.web.app` segue 404.

**Por que o site novo protege o painel por construção:** sites de Hosting são superfícies independentes.
`firebase.landing.json` só declara `site: leela-landing` — não existe caminho pelo qual esse deploy toque
`leela-hub`.

## Premissas assumidas

1. Link **estável sem expiração** (canal live de um site novo) vale mais que canal de preview de 30 dias, já que
   o pedido do dono é navegar entre painel e site público. O painel continua no canal de preview como está.
2. Os pacotes de workspace (`@leela/*`) **não** vão no `package.json` da função SSR. Base: o rastro de output
   file tracing prova que o runtime só resolve `next` e `firebase-admin`; o resto entra bundlado pelo webpack. O
   `deploy-leela-hub.mjs` faz o move para `devDependencies` de forma temporária (a integração do firebase-tools
   apaga `devDependencies`) e restaura no `finally`. Se um dia algum `@leela/*` passar a ser `require`ado em
   runtime (ex.: entrar em `serverExternalPackages`), esta premissa cai e o deploy quebra ruidosamente no boot.
3. A landing **reusa a app web `painel`** já registrada (mesmo `appId`). Um appId a menos para divergir e
   rotacionar. Se App Check entrar por app, aí vale registrar uma app web própria para a landing.

## Reaproveitado vs criado

*(preenchido ao longo da lane)*

- **Reaproveitado:** alias `prod` do `.firebaserc`; padrão de config de deploy dedicada
  (`firebase.preview.json` / `firebase.r6.json` / `firebase.prod.json` → `firebase.landing.json`); convenção
  `.env.leela-hub` (arquivo versionado com a config web pública, exceção cirúrgica no `.gitignore`); config web
  do Firebase e `appId` já registrados pela DEPLOY-PREVIEW; seed de produção já re-datado.

## Próxima ação

Task 2 — criar o site `leela-landing`, o `firebase.landing.json` e o `apps/landing/.env.leela-hub`.
