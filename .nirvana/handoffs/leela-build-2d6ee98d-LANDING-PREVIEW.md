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
- [x] **Task 3 — deploy** — build Next VERDE, backend SSR `ssrleelalanding` **criado** (Node 22, gen2,
  us-central1, 1GiB, maxInstances 3). O `package.json` gerado saiu **sem nenhum `workspace:*`** — a aposta da
  Premissa 2 pagou. Primeira passada não RELEASOU o Hosting por um gate de política de artefatos (ver abaixo);
  segunda passada fecha. `leela-landing.web.app` autorizado no Auth (`authorizedDomains`), domínios do painel
  intactos.

### Pedágio da Task 3: política de limpeza do Artifact Registry

A primeira passada terminou assim, DEPOIS de criar a função com sucesso:

```
+  functions[firebase-frameworks-leela-landing:ssrleelalanding(us-central1)] Successful create operation.
!  functions: No cleanup policy detected for repositories in us-central1.
Error: Functions successfully deployed but could not set up cleanup policy in location us-central1.
       Pass the --force option to automatically set up a cleanup policy or run
       'firebase functions:artifacts:setpolicy' to manually set up a cleanup policy.
```

O CLI aborta ANTES de releasar o Hosting, então a função ficou no ar e o site ficou em "Site Not Found"
(confirmado por curl). As três saídas e a escolha:

| Saída | Efeito | Veredito |
|---|---|---|
| `--force` no deploy | Cria política de limpeza automática no repo `gcf-artifacts` **compartilhado** | Recusada: apagaria imagens antigas das 86 functions gen1 do painel; `--days` default é 1 dia |
| `setpolicy --days N` | Mesma coisa, explícito | Recusada pelo mesmo motivo |
| **`setpolicy --none`** | Grava só a marca de opt-out; **não apaga imagem nenhuma** | **Escolhida** — raio de explosão zero, reversível com um comando |

Executado: `firebase functions:artifacts:setpolicy --none --location us-central1 --project prod --force`.
**Pendência de custo escalada ao dono** — sem política, as imagens de container se acumulam no Artifact Registry
e viram conta mensal pequena e crescente. Quando o dono quiser, a decisão dele é qual janela usar:
`firebase functions:artifacts:setpolicy --days 7 --location us-central1 --project prod`. Não tomei essa decisão
sozinho porque o repositório é compartilhado com o backend do painel, que não é escopo desta lane.

Cabe também um segundo par de olhos: por design do Firebase essas imagens são artefato de build e apagar as
antigas não derruba função no ar, mas quem mexer nisso deve verificar o comportamento das **gen1** antes.

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

## ESCALAÇÃO — `EVENTO_URL_BASE` / `beh.ro` (RN-423, achado do brief)

**O que subiu nesta lane está limpo.** Nenhuma ocorrência de `beh.ro` no payload estático
(`.firebase/leela-landing/hosting`, 87 arquivos) nem no bundle do servidor
(`.firebase/leela-landing/functions/.next`) — varredura por `grep -rl`. A base pública da landing vem de
`NEXT_PUBLIC_LEELA_URL` e foi inlinada como `https://leela-landing.web.app` (prova direta: o `robots.txt`
servido traz `Host: https://leela-landing.web.app` e `Sitemap: https://leela-landing.web.app/sitemap.xml`).

**O que NÃO dá para corrigir por config, e por isso escala.** `EVENTO_URL_BASE` está **hardcoded no código das
Functions**, não em env:

```
functions/src/eventos/publicarEvento.ts:39   export const EVENTO_URL_BASE = 'https://beh.ro';
functions/src/eventos/publicarEvento.ts:56   return `${EVENTO_URL_BASE}/${slug}`;
```

Trocar isso é editar código de Function + redeploy de Function — as duas coisas que o brief põe fora de escopo
(«Mexer no painel, nas functions ou nas Rules … escalar no handoff»). O `publicarEvento` já rodou em produção com
esse valor, então **eventos já publicados têm `url` gravada apontando para `beh.ro` no Firestore**; um fix de
código novo não reescreve documento antigo sozinho.

**Vira task do build S1214** (D-ING-8 / RN-423 já especificou o desenho):
1. `EVENTO_URL_BASE` sai do código e passa a vir do ambiente da Function, com o MESMO valor que a landing usa
   (`https://leela-landing.web.app` hoje; o domínio próprio do item 12 depois).
2. Sem base configurada, o e-mail sai **sem link** e com o código em texto (D-ING-8) — link quebrado ou link para
   empresa de terceiro é pior que link nenhum.
3. Backfill decidido pelo dono: reescrever a `url` dos eventos já publicados no Firestore, ou deixar como está e
   confiar só no link novo. Recomendo o backfill — o campo é lido pelo painel e pelo QR do evento.

Enquanto isso não roda, **o e-mail de compra continua mandando o comprador para `beh.ro`**. Isso é anterior a esta
lane e não piorou com ela, mas é a pendência que segura a divulgação do link.

## Receita de redeploy (1 comando)

```
node apps/landing/scripts/deploy-leela-hub.mjs
```

Roda da raiz do repo. O script carrega `apps/landing/.env.leela-hub`, aplica o patch temporário no
`package.json` do app, chama
`firebase deploy --only hosting:leela-landing --project prod --config firebase.landing.json`
(com `FIREBASE_CLI_EXPERIMENTS=webframeworks`) e restaura o `package.json` no `finally`. Argumentos extras
passam adiante — ex.: `node apps/landing/scripts/deploy-leela-hub.mjs --debug`.

Guardas embutidas: aborta se `NEXT_PUBLIC_USE_EMULATOR=true` e aborta se `LEELA_CLOCK` estiver definido.

**Mudar o domínio público** (item 12, quando o dono decidir): trocar `NEXT_PUBLIC_LEELA_URL` no
`apps/landing/.env.leela-hub` e redeployar. É a única variável — canonical, Open Graph, JSON-LD, `robots.txt` e
`sitemap.xml` derivam dela (`lib/seo.ts:baseUrl()`).

## Reaproveitado vs criado

- **Reaproveitado:** alias `prod` do `.firebaserc`; padrão de config de deploy dedicada
  (`firebase.preview.json` / `firebase.r6.json` / `firebase.prod.json` → `firebase.landing.json`); convenção
  `.env.leela-hub` (arquivo versionado com a config web pública, exceção cirúrgica no `.gitignore`); config web
  do Firebase e `appId` da app web `painel` já registrados pela DEPLOY-PREVIEW; seed de produção já re-datado
  (+135d) — nada foi re-semeado; backend inteiro de produção (86 functions, Firestore, Auth anônimo, webhook
  Asaas) tal como a DEPLOY-PREVIEW deixou; transporte de credencial por refresh token do firebase-tools em
  memória (mesmo caminho da DEPLOY-PREVIEW) para o ajuste de `authorizedDomains`; `lib/seo.ts:baseUrl()` e
  `lib/leelaClient.ts:configProducao()`, que já eram configuráveis por env — **zero linha de app tocada**.
- **Criado:** site de Hosting `leela-landing`; `firebase.landing.json`; `apps/landing/.env.leela-hub`;
  `apps/landing/scripts/deploy-leela-hub.mjs`; três entradas no `.gitignore` (exceção do env, `.firebase/`,
  `*.deploybak`).

## Próxima ação

*(atualizado ao fim da lane)*
