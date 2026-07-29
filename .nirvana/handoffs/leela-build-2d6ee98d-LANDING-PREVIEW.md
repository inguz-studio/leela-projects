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
- [x] **Task 4 — smoke por curl** — home, página de evento, checkout, health, robots, sitemap, asset e painel:
  tudo conforme, provas abaixo. Nenhum navegador foi aberto.

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

## Provas de smoke (curl, 2026-07-29 ~09:50 BRT)

Todas com `curl -s -w`. Script guardado fora do repo (scratchpad da sessão); os comandos são triviais de repetir.

**1 · Home `https://leela-landing.web.app/`** — `http=200`, 45.399 bytes, 7,71 s (cold start da primeira
invocação; ver Custo & performance).

```
<title>Leela — inscrições para corridas</title>
href="/corrida-inverno-floripa-2026"        Corrida de Inverno Floripa 2026
href="/desafio-mtb-costa-lagoa-2026"        Desafio MTB Costa da Lagoa 2026
href="/meia-floripa-2026"                   Meia Maratona Floripa 2026
href="/noturna-beira-mar-2026"              Noturna da Beira-Mar 2026
href="/retiro-bem-estar-rio-vermelho-2026"  Retiro Bem-Estar Rio Vermelho 2026
```

Cinco eventos VIGENTES sob a seção «Eventos abertos», lidos do Firestore de produção pelo Admin SDK. Isto prova a
cadeia inteira de uma vez: SSR vivo, credencial do runtime funcionando, Firestore de produção respondendo e seed
re-datado em dia. Ocorrências de `beh.ro`: **0**.

**2 · Página de evento `/corrida-inverno-floripa-2026`** — `http=200`, 70.110 bytes, 1,84 s.

```
<title>Corrida de Inverno Floripa 2026 — inscrições abertas · Leela</title>
href="/corrida-inverno-floripa-2026/inscricao"   →  "Garantir inscrição"   estado: "aberto"
Data: 18 de junho de 2027 · Parque de Coqueiros, Florianópolis/SC · a partir de R$ 63,00
shareUrl: https://leela-landing.web.app/corrida-inverno-floripa-2026
```

O CTA vem no HTML **servido pelo servidor** (é o `fallback` do `<Suspense>` que embrulha o `CtaInscricao`), então
existe antes de qualquer JavaScript rodar. `estado: "aberto"` é o cálculo real de `estadoVenda` contra o relógio
de verdade — sem `LEELA_CLOCK`. Ocorrências de `beh.ro`: **0**.

**3 · Checkout `/corrida-inverno-floripa-2026/inscricao`** — `http=200`, 1,66 s. A rota de compra responde. **A
compra em si é do dono** — a lane não comprou nada, conforme o brief.

**4 · Superfícies de apoio**

```
/health                  http=200   {"status":"ok"}
/robots.txt              http=200   Host: https://leela-landing.web.app
/sitemap.xml             http=200   903 bytes, <loc>https://leela-landing.web.app/…</loc>
/leela-logo-brasa.svg    http=200   content-type: image/svg+xml
```

O `sitemap.xml` sair povoado com as URLs certas fecha o ciclo do `NEXT_PUBLIC_LEELA_URL`: uma variável só, e
canonical, Open Graph, JSON-LD, robots e sitemap seguem juntos.

**5 · Painel INTOCADO**

```
https://leela-hub--preview-y4n0cxzj.web.app/   http=200   (canal de preview do painel, no ar)
https://leela-hub.web.app/                     http=404   (live, 404 de propósito — preservado)
```

Também verificado ANTES de a landing releasar (quando ela ainda devolvia "Site Not Found"): painel já respondia
200 e o live já era 404. Os dois estados atravessaram a lane inteira sem mudar.

## Custo & performance do backend SSR

`ssrleelalanding`: Cloud Functions **gen2**, Node 22, us-central1, **1 GiB**, `minInstances: 0`,
`maxInstances: 3`, `concurrency: 80`. URL interna do Cloud Run:
`https://ssrleelalanding-k32cilz52q-uc.a.run.app` (o tráfego entra pelo Hosting, não por ela).

- `minInstances: 0` = **zero custo ocioso**, ao preço de cold start. Medido: 7,7 s na primeira requisição, 1,6 a
  1,8 s depois. Para um preview que o dono abre de vez em quando, é a troca certa. Se o link virar demo ao vivo
  com plateia, subir para `minInstances: 1` no `firebase.landing.json` resolve — e passa a custar instância
  parada 24/7. Decisão do dono, não minha.
- `maxInstances: 3` limita o pior caso de conta em pico ou laço de requisição.
- `concurrency: 80` é o default do gen2. Com 1 GiB, 80 requisições SSR simultâneas na mesma instância é otimista;
  se aparecer OOM no log, o primeiro botão a girar é esse (para 20), não a memória.

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

## Resumo executivo (selo da lane)

**Os dois links, para o dono navegar entre eles:**

| Superfície | Link | Estado |
|---|---|---|
| **Site público (landing)** | **https://leela-landing.web.app** | No ar, canal LIVE, **sem expiração** |
| Painel do organizador | https://leela-hub--preview-y4n0cxzj.web.app | Intocado (canal de preview, expira 2026-08-27) |
| Live do painel | https://leela-hub.web.app | 404 de propósito, preservado |

Logins do painel seguem os da DEPLOY-PREVIEW (`marina@`/`felipe@`/`admin@demo-leela.dev`, senha `demo1234`). A
landing é pública e não pede login — é onde a Ana vê o evento e compra.

**O que subiu:** site de Hosting novo `leela-landing` + backend SSR `ssrleelalanding` (Cloud Functions gen2,
Node 22, us-central1, 1 GiB, min 0 / max 3), apontado ao backend real de produção — Firestore por Admin SDK com a
credencial do runtime, callables em us-central1, Auth anônimo. **Zero flag de emulador, zero `LEELA_CLOCK`**
(o script de deploy aborta se qualquer um dos dois aparecer). Nenhuma linha de código de aplicação foi tocada: a
landing já lia base pública e config do Firebase por env.

**Commits da lane** (sem push — o maestro pusha):
- `139376f` — docs(handoff): reconhecimento da landing e escolha do veículo de deploy
- `5df2742` — feat(landing): site leela-landing, config de deploy e receita em um comando
- `33b5b80` — docs(handoff): landing SSR no ar, escalações de beh.ro e de política de artefatos
- *(este)* — docs(handoff): provas de smoke e selo da lane

**Provas** (curl, sem navegador): home 200 com os 5 eventos vigentes do seed de produção; página de evento 200
com CTA "Garantir inscrição" → `/{slug}/inscricao` no HTML servido e estado `aberto`; checkout 200; `/health` 200
`{"status":"ok"}`; `robots.txt` e `sitemap.xml` 200 com a base correta; asset SVG 200; painel 200 no canal de
preview e 404 no live. `beh.ro`: **0 ocorrências** na home, na página de evento, no payload estático (87
arquivos) e no bundle do servidor.

**PENDENTE-DONO:**
1. **Compra real de valor baixo** pela rota `https://leela-landing.web.app/{slug}/inscricao` — o teste canônico
   do go-live. A lane não compra nada. Herda o PENDENTE-DONO nº 1 da DEPLOY-PREVIEW, que agora tem endereço
   público em vez de `pnpm dev` local.
2. **`EVENTO_URL_BASE` / `beh.ro`** (seção ESCALAÇÃO): o e-mail de compra ainda manda o comprador para domínio de
   terceiro. Vira task do S1214; inclui decidir o backfill dos eventos já publicados.
3. **Política de limpeza do Artifact Registry**: hoje em opt-out. Escolher a janela quando quiser
   (`--days 7` é um bom default) — o repo é compartilhado com as 86 functions do painel, por isso não decidi.
4. **Domínio próprio (item 12)**: quando decidir, é uma variável só —
   `NEXT_PUBLIC_LEELA_URL` em `apps/landing/.env.leela-hub` + redeploy.
5. **Logins demo do painel** antes de divulgar qualquer link (herdado da DEPLOY-PREVIEW).
6. `minInstances: 1` se o link virar demo ao vivo — hoje o primeiro acesso leva ~7,7 s.

**Suíte canônica:** NÃO rodada nesta lane, de propósito. Nenhum arquivo de código de aplicação foi alterado — os
commits tocam `.gitignore`, uma config de deploy, um `.env` versionado, um script de deploy e o handoff. O
`next build` completo rodou verde duas vezes (é parte do deploy) e o `apps/landing/package.json` voltou byte a
byte ao original (`git diff` vazio, sem `.deploybak` residual).

## Self-score (contrato do sf-platform-lead)

| Critério | Limiar | Nota | Base |
|---|---|---|---|
| `delegation_quality` | 0,85 | **0,90** | Lane de uma pessoa só, sem sub-delegação: a decisão foi não abrir mão de contexto para um especialista quando o trabalho é uma sequência de deploy indivisível. Onde o conhecimento não era meu (comportamento interno do `firebase-tools`), fui à fonte — o código instalado — em vez de adivinhar. |
| `outcome_clarity` | 0,85 | **0,95** | Critério de sucesso escrito ANTES do deploy («home 200 com evento vigente; evento 200 com CTA; painel 200 e live 404») e verificado depois, um a um, com o número do lado. |
| `prioritization_call` | 0,80 | **0,92** | Seis veículos de deploy avaliados, um recomendado e executado, com a razão de morte de cada alternativa registrada. No pedágio do Artifact Registry, três saídas, uma escolhida, com o porquê do raio de explosão. Nenhuma paralisia. |
| `escalation_compliance` | 0,90 | **0,95** | Zero toque em functions, painel e Rules. O `beh.ro` exigiria código de Function: escalado, não improvisado. A política de artefatos afetaria o backend do painel: opt-out sem apagar nada, decisão devolvida ao dono. Sem push. Nenhuma compra. |

**Média ponderada: 0,930** — acima de todos os limiares. Sem iteração de revisão.

## Próxima ação

Maestro: `git push` dos quatro commits da lane. Depois, a fila natural é a **S1214** (página do ingresso), que
esta lane preparou o chão para hospedar — a rota `/ingresso/{token}` nasce nesta mesma superfície, com a mesma
receita de redeploy, e leva junto o conserto do `EVENTO_URL_BASE`.
