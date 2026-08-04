# Handoff vivo · lane PAINEL-DEPLOY · trace leela-build-2d6ee98d · 2026-08-04

Executor: sf-platform-lead (software-forge). Brief: `.nirvana/briefs/leela-build-2d6ee98d-PAINEL-DEPLOY-enriched.md`.
Retomada de uma sessão que morreu por indisponibilidade da API (522) antes de pagar qualquer frente.

**O painel está no ar em https://leela-hub.web.app** — canal live, endereço estável, sem expiração.

## Estado

- [x] **F1 · causa** — não foi esquecimento; foi decisão registrada
- [x] **F2 · inventário** — o que o canal de produção passou a servir, e a divergência medida
- [x] **F3 · gates + deploy** — artefato servido igual ao local, byte a byte
- [x] **F4 · jornada externa** — os três pontos de entrada da landing chegam a tela real
- [x] **F5 · variáveis** — uma resolvida pelo próprio deploy, uma escalada com causa nomeada

## Primeira providência: medir a árvore

Quatro lanes trabalham em `C:\dev\LEELA` agora. Ao abrir, a árvore tinha `apps/landing/package.json` e
`functions/src/checkout/createInscricaoCharge.ts` modificados — nenhum dos dois meu. No fim da lane só
`createInscricaoCharge.ts` seguia sujo (a VITRINE-FIX aterrissou o dela no meio do caminho, e o HEAD
andou de `358a0471` para `6dc66f19` enquanto os meus gates rodavam).

**Zero `git add -A`.** O único commit desta lane é `git commit --only` deste handoff. A lane não mudou
uma linha de código: a configuração de deploy já estava certa, faltava o comando.

## F1 · por que nunca subiu

Não foi lapso. Está escrito na Task 5 da DEPLOY-PREVIEW (`leela-build-2d6ee98d-DEPLOY-PREVIEW.md`, linha 22):

> Live channel (leela-hub.web.app) segue 404 = **não tocado**.

A lane de 28/07 escolheu deliberadamente `hosting:channel:deploy preview` e registrou a promoção como
pendência do dono (`PENDENTE-DONO` nº 4: "renovar/promover o canal em 27/08"). A STORAGE-BUCKET não
tem nada sobre hosting do painel — só somou o bloco `storage` ao mesmo arquivo de config.

O que isso significa na prática: **a configuração nunca faltou.** `firebase.prod.json` tem o bloco
`hosting` correto desde 28/07 (`site: leela-hub`, `public: apps/painel/dist`, rewrite SPA `**` →
`/index.html`). O que faltava era trocar o canal do comando. A linha 47 do mesmo handoff explica o
detalhe que faz tudo isso conviver: `hosting` nunca entrou no `firebase.json` canônico porque acordaria
o emulador de hosting dentro da suíte — daí a config-por-propósito.

Ou seja: dívida de um comando, não de arquitetura. E ela virou defeito visível ontem, quando a landing
foi publicada apontando para o endereço morto.

## F2 · o que o canal de produção passou a servir

O preview servia o build de `56fd53a2` (FIX-AUTHGUARD, 28/07 23:40), asset `index-Bk10tvNM.js`,
sha256 `7ba929e2…`. Confirmei por marcador, não por suposição: `Verificando sessão` **presente** (o
guard da FIX-AUTHGUARD), e `convitesOrganizador` / `OverlayConvite` / `resgatarConviteOrganizador`
**ausentes**.

Entre aquele build e o HEAD deployado há **29 commits** em `apps/painel` + `packages/`. Não escalei por
divergência porque não é divergência inesperada: é exatamente o que o brief antecipa em Trabalho 2.

### O que é mais fechado do que o preview

- `ContaTravadaGate` (`a010ac9e`, `37b9ec94`) — não existia. Conta sem tenant passa a ver overlay
  bloqueante, e a rota de destino **não é montada** (nenhuma query tenant-scoped sai só para voltar
  negada atrás do véu). É restrição, não abertura.
- `1e4b3b2a` — roteamento pós-login por papel: cada papel cai na própria casa.
- `06ea10f8` — a recusa de convite volta a ser uma só, inclusive para quem nunca podia entrar.

### A única tela nova de admin

`/plataforma/convites` (`c770fef5`), **dentro** do `PlataformaRoutes` que já estava público no preview
com tenants, termos, macro, repasses, estornos, planos e taxa — atrás do mesmo `PlatformShell` /
`PlatformGuard` (403 sem claim `platform_admin`). É uma tela a mais atrás de uma porta que já existia,
não uma porta nova. E ela sobe **inerte** (ver F-porta abaixo).

### Funcionalidade nova de hoje (VITRINE-FIX)

O maestro avisou no meio da lane, e confirmei no diff: `10c05ae1` acrescenta ao painel um **alerta
crítico no Overview do evento** para evento publicado que não está vendendo, nomeando as modalidades
sem preço, e silencia o conselho "divulgue a página pública" quando a página não vende
(`routes/eventos/_lib/alertas.ts`, `routes/eventos/evento/overview/OverviewPage.tsx`, alimentados por
`packages/core/src/eventos/vitrine.ts` de `8f892f3c`). É leitura e conselho — nenhuma rota nova,
nenhum caminho de escrita novo.

Esse alerta estava em código e não no ar. **Agora está.** Hoje há dois eventos publicados e sem vender
em produção, e até este deploy o organizador não tinha sinal nenhum disso.

### Paridade conferida

`demo-leela` aparece 4× no artefato novo e 4× no bundle do preview — é a constante morta `DEMO_CONFIG`
do `api-client`, fail-closed por mensagem explícita ("permitido apenas com `useEmulator: true`"). Não é
regressão nem novidade. A config assada é a real: `leela-hub.firebaseapp.com`, appId
`1:76126035891:web:d858cdf41199c7103575c6`.

## F3 · gates e deploy

Gates em série, `tsup` do DS primeiro (a receita contra o vermelho fantasma):

| Gate | Resultado |
|---|---|
| `@leela/design-system build` (tsup) | exit 0 |
| `@leela/core build` · `@leela/api-client build` | exit 0 · exit 0 |
| `@leela/painel type-check` | exit 0 |
| `@leela/painel lint` (`--max-warnings 0`) | exit 0 |
| `@leela/painel test` | **194 arquivos / 1828 testes, todos verdes**, exit 0, 371s |

Os 5 commits que chegaram durante os gates (`dd7a5ec9`, `dd6cd20f`, `52cc152d`, `90b45e0e`, `6dc66f19`)
tocam **zero** arquivo de `apps/painel` ou `packages/` — provado por
`git diff --name-only 358a0471..HEAD -- apps/painel packages/` = vazio. Os gates valem para o HEAD que
subiu.

**Conferência feita ANTES de deployar:** `leela-hub.web.app` já estava em `authorizedDomains` do
Identity Toolkit (junto de `localhost`, `leela-hub.firebaseapp.com`, o domínio do preview e
`leela-landing.web.app`). Sem isso o login quebraria no endereço novo e eu teria escalado por
configuração inexistente. Não foi o caso.

### Receita (ficava só para o canal preview; agora tem a do live)

```
cd apps/painel && npx vite build --mode leela-hub     # env na RAIZ (envDir do vite.config.ts)
npx firebase-tools@13 deploy --only hosting --project prod --config firebase.prod.json
```

`--only hosting` mantém `firestore`, `storage` e `functions` fora — nenhum outro target foi tocado.

### Provas

- **Artefato idêntico, byte a byte:** sha256 do JS servido em live == sha256 do build local =
  `0e3e10a3639f5544a1f180beb8d25214bb093a11522946b1df73feb5bc332bef`. CSS idem
  (`4703a7ed7de45b15947e3917eab885c4daf321717a5750757eecab6755e114f6`).
- **Artefato antigo fora do ar:** `/assets/index-Bk10tvNM.js` no live devolve 200 **mas com
  `Content-Type: text/html`** — é o rewrite SPA servindo `index.html`, não o JS antigo (sha do corpo
  `85acbe0c…` ≠ sha do JS antigo `7ba929e2…`).
- **Canal preview intacto:** segue servindo `index-Bk10tvNM.js`, expira 27/08. O deploy não o tocou.
- **Fumaça:** 200 em `/`, `/entrar`, `/cadastrar`, `/recuperar-senha`, `/plataforma/convites`,
  `/crm/clientes`. Todo path devolve 200 por construção (rewrite `**`); o roteamento é client-side e
  curl não vê redirect — limitação que a FIX-AUTHGUARD já havia registrado, e por isso a rota
  autenticada é provada estruturalmente: `Verificando sessão` (o skeleton do `RequireSessao`) está no
  bundle servido, e os 4 casos do `PlatformGuard` mais os do `RequireSessao` estão verdes na suíte.

## F4 · a jornada, provada do lado de fora

A landing em produção serve **8 links** ao painel: 4× `/entrar` e 4× `/cadastrar`. Rótulos lidos do HTML
servido:

| Ponto de entrada | Destino | Antes | Agora |
|---|---|---|---|
| Header · "Entrar" | `/entrar` | 404 | 200, shell real do painel |
| Header · "Criar conta" | `/cadastrar` | 404 | 200 |
| Rodapé · nav `aria-label="Organizador"` · "Entrar" | `/entrar` | 404 | 200 |
| Rodapé · "Criar conta de organizador" | `/cadastrar` | 404 | 200 |

O documento servido é o shell do painel (`<title>Leela Painel</title>`) e o bundle servido carrega a
copy das telas reais: `Entrar`, `Criar conta`, `Esqueci minha senha`, `Nome da organização`,
`Confirmar senha`. Tudo por requisição HTTP e leitura do HTML/bundle — sem navegador, sem screenshot.

## Veto LGPD-1 e a porta do organizador

**Nenhum convite semeado, em ambiente nenhum.** A lane é hosting-only: nenhum seed rodou, nenhum doc de
Firestore foi escrito, nenhuma function foi deployada. E o único seed de convite que existe
(`functions/src/seed/convitesOrganizador.seed.ts`) abre com `assertEmulatorOnly()`, não é exportado em
`functions/src/index.ts`, e nenhum script de produção o importa.

**A porta continua inalcançável sem convite** — re-medido DEPOIS do deploy, por probe GET (zero mutação):

| Function | HTTP | Leitura |
|---|---|---|
| `resgatarConviteOrganizador` | **404** | nunca deployada |
| `gerarConviteOrganizador` | **404** | nunca deployada |
| `revogarConviteOrganizador` | **404** | nunca deployada |
| `provisionTenant` | 400 | existe, mas exige `platform_admin` (RN-401) |
| `asaasWebhook` | 405 | controle positivo — o probe distingue 404 de existente |

Some-se a isso `firestore.rules:453-456`, que sela a coleção: `allow read/create/update` só
`isPlatformAdmin()`, `allow delete: if false`.

Conclusão em uma frase: **a tela `/plataforma/convites` subiu inerte** — não há backend para gerar,
resgatar ou revogar convite em produção, e o `CadastrarPage` cria conta sem tenant e sem claim por
construção, aterrissando no overlay bloqueante. Confirma independentemente o achado da SPEC-ADMINSEP.

## F5 · variáveis

### `LEELA_PAINEL_URL` — resolvida pelo próprio deploy, sem tocar em nada

`functions/src/auth/linkDeAcao.ts:47` tem `PAINEL_URL_PADRAO = 'https://leela-hub.web.app'`. Esse
default **não estava errado — estava apontando para um endereço que não existia.** Com o painel no ar,
o link do e-mail de definir senha nasce vivo, sem variável nenhuma a configurar. A function que o usa
(`solicitarRedefinicaoSenha`) ainda não está em produção (probe: 404), então ela vai nascer certa.

Mesma coisa do lado da landing: `apps/landing/lib/painel.ts:23` tem o mesmo default e o build em
produção não define `NEXT_PUBLIC_PAINEL_URL` — logo a landing já usava o default, que agora responde.
**Nenhum rebuild da landing é necessário**, o que também respeita a lane VITRINE-FIX.

### `NEXT_PUBLIC_LEELA_URL` — a causa é outra, e é código

O laudo DOCS-EXTERNO está certo no sintoma e a causa não é variável faltando. `functions/.env` **já
tem** `LEELA_PUBLIC_URL=https://leela-landing.web.app`, e `basePublica()`
(`functions/src/eventos/basePublica.ts`) resolve `LEELA_PUBLIC_URL` primeiro e `NEXT_PUBLIC_LEELA_URL`
como alias. Quem passa por `basePublica()` está correto em produção hoje.

O defeito é que **dois call sites não passam por ela**:

- `functions/src/affiliation/salvarAfiliado.ts:463`
- `functions/src/assessorias/cadastrarAssessoria.ts:436`

Os dois leem `process.env['NEXT_PUBLIC_LEELA_URL'] ?? 'http://localhost:3000'` direto. Como só
`LEELA_PUBLIC_URL` está setada, os dois caem no `localhost`. **As duas functions estão deployadas**
(probe: 400 nas duas), então o defeito é vivo: todo convite de afiliado e de assessoria emitido em
produção hoje carrega link para `http://localhost:3000`.

**Não corrigi, e escalo.** O conserto certo é de uma linha em cada arquivo (usar `basePublica()` em vez
do `process.env` cru), mas mora em `functions/src/` — fora do meu território — e exige redeploy de
functions, que hoje arrastaria o `createInscricaoCharge.ts` que outra lane deixou sujo na árvore.
Setar `NEXT_PUBLIC_LEELA_URL` no `.env` seria remendo: mascara o bypass e deixa a próxima função que
copiar o padrão cair no mesmo buraco.

## O que ficou para decisão do dono

1. **ADMINSEP-3 sobe de prioridade por causa deste deploy.** A conta de super-admin de produção é a de
   demonstração (`admin@demo-leela.dev`, senha `demo1234`, publicada no repo — achado da SPEC-ADMINSEP,
   semeada por `prod-seed-leela-hub.ts`). Até hoje ela vivia atrás de uma URL de preview com sufixo
   aleatório; **agora o painel tem endereço estável e adivinhável a partir do nome do projeto, e a
   landing pública aponta para ele.** A credencial já era alcançável pela API de Auth sem hosting
   nenhum, então o deploy não cria a exposição — mas encurta muito a distância entre um curioso e a
   tela de login do super-admin. Recomendo matar a conta demo antes de divulgar o endereço.
2. **Convite de afiliado/assessoria apontando para `localhost` em produção** (F5 acima): decidir se
   entra numa lane de functions como fix de uma linha em cada call site.
3. **O canal de preview continua no ar até 27/08** servindo um build de 28/07. Agora que o live existe,
   vale decidir se ele é desligado — hoje são dois endereços públicos servindo versões diferentes do
   mesmo painel.
4. **Deploy do painel segue manual.** Não há pipeline; a receita está neste handoff. Montar CI/CD é
   decisão de escopo, não improviso de lane.

## Fora do meu território (não toquei, por contrato)

`functions/src/email/`, `packages/api-client/src/auth.ts`, a tela de senha do painel, `apps/landing`,
checkout/webhooks/`runWith`.

## Mutação em produção

Nenhuma além do próprio deploy de hosting. Zero doc de Firestore escrito, zero function deployada, zero
seed executado, zero convite semeado.
