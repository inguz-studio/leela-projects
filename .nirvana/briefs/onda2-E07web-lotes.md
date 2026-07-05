# Onda 2 · E07-web — Estados de sistema (web) · brief de lotes

Recorte **web-only** da decisão 9 (`decisoes-escopo-2026-07-04.md`): 404 + 500 + 403 (403 **casado** com os papéis de E04-S304). Landing pública com estados de erro SEO-safe (rascunho→404). Superfície única deste recorte: `apps/painel` (Vite) + `apps/landing` (Next). Mobile e os estados offline/manutenção ficam fora.

Regra 1 task = 1 commit atômico. Staging seletivo. Roteamento deste épico: **tudo OPUS** (telas/DS/frontend) — não há Function, não há `firestore.rules`, não há core de domínio novo aqui (ver corte do `authorize.ts` abaixo).

## Cortes aplicados à spec original (LEELA-E07 fala das 3 superfícies e 5 estados)

1. **Offline (S503) e Manutenção (S504) → V1.1** (decisão 9: "manutenção/offline-web V1.1"). Cortadas por inteiro nesta onda, web e app. Consequência: o singleton `config/system`, o `middleware.ts` de manutenção e as Rules de `config/system` **não** são criados agora. Débito registrado (ver Decisões pendentes #4).
2. **Toda a superfície App/Expo → adiada** (onda mobile / E13, horizonte V1.5). Cortadas: S500-T3, S501-T2, S502-T2, S503-T2, S504-T2. A variante `SystemStateScreen.native.tsx` **não** é construída agora; só a variante web.
3. **`packages/core/src/auth/authorize.ts` + `canAccess(role, resource)` (proposta da spec E07) → DESCARTADO.** A decisão 9 casa o 403 com **E04-S304**, cuja fonte de verdade é `podeAcessar(papel, area)` em `packages/core/src/eventos/equipe.ts` (4 papéis RN-320: `organizador|administrador|operador|financeiro`; claim por evento `{ eventos: { [eventoId]: papel } }`). E07-web **consome** esse contrato; não duplica RN-320 nem cria um segundo modelo de autorização.
4. **Fiação Next.js da spec para o Painel → retraduzida para React Router.** O código real é `apps/painel` = **Vite + React Router** (`App.tsx` com `<BrowserRouter>`/`<Routes>`), não Next App Router. Logo, para o Painel: 404 = rota catch-all `path="*"`; 500 = React ErrorBoundary (class); 403 = guarda de rota. Os arquivos `apps/painel/app/{not-found,error,global-error,forbidden}.tsx` e `apps/painel/middleware.ts` citados na spec **não existem e não serão criados**. Só a Landing (Next) usa os arquivos especiais do App Router.

Fundação já pronta (verificado no repo): DS com `Button`, `Skeleton`, `EmptyState`, `AppShell`, `Sidebar`, `PageHeader`, `Breadcrumb`, `Toast`; `SystemStateScreen` **não existe** (este épico cria). Sentry do Painel já inicializado (`apps/painel/src/lib/sentry.ts`, no-op sem DSN); Landing com `sentry.{client,server,edge}.config.ts` + `instrumentation.ts` e um `app/global-error.tsx` **stub** (renderiza `<h2>` cru, sem eventId). `packages/api-client/src/auth.ts` expõe `getClaims()`/`getCurrentUser()`/`onSessionChange()`.

---

## Lote E07web-L1 · Estados de sistema web (404 · 500 · 403) — OPUS

Lote único. 6 tasks. Ordem interna: `T1 → (T2 ∥ T3 ∥ T4 ∥ T5) → T6`.

RNs transversais: §2.1/§2.14 (shell/header/sub-nav do E01, mantidos no contexto autenticado), §2.12 (interativo; ação de recuperação sempre funcional), §2.16 (flat; exceção permitida = `border-left` Vulcão só no card de erro 500), copy **HANDOFF-07** (tabela canônica abaixo), zero token hardcoded (ESLint `leela-tokens/no-hardcoded-tokens` = error).

### T1 · `SystemStateScreen` (web) no Design System  ·  [recorte web-only de S500-T1]
- Superfície: `packages/design-system/src/components/SystemStateScreen/{SystemStateScreen.tsx,types.ts,index.ts,SystemStateScreen.stories.tsx}` + barrel `packages/design-system/src/index.ts` (`.index-mutex`).
- Dep: E01 (Button, Skeleton, tokens, ícones Lucide). **Bloqueia T2..T6.**
- Contrato: `SystemStateVariant = 'notFound'|'forbidden'|'error'|'offline'|'maintenance'` (declara as 5 para forward-compat; esta onda só liga 3). `SystemStateScreenProps = { variant; title; message; actions: SystemStateAction[]; icon?; illustration?; detail?; layout?: 'shell'|'fullscreen' }`. `SystemStateAction = { label; onPress; variant:'primary'|'secondary'|'ghost'; href? }`. Componente puro; copy vem por prop, nunca embutida.
- Aceite (unit + stories, falsificáveis):
  - `variant="notFound"` com 2 ações → exatamente 1 Button `primary` + 1 `secondary`; `document.activeElement` = ação primária ao montar.
  - Contagem de ações `variant='primary'` sempre ≤ 1 (render com 2 primárias → o teste falha/avisa).
  - `variant="error"` com `detail="abc123"` → o texto `abc123` está no DOM como auxiliar **e** o card carrega o token/classe `border-left` Vulcão (assert por token/classe, nunca hex).
  - `role="alert"` presente **só** em `variant="error"`; ausente em `notFound`/`forbidden`.
  - Ícone/ilustração com `aria-hidden="true"`.
  - `layout="fullscreen"` não renderiza container de shell; `layout="shell"` renderiza no slot de conteúdo.
  - Tema brasa↔leela troca cores/tipografia sem mudar markup; 0 valor hardcoded no arquivo (lint verde).
- Fora de escopo: `SystemStateScreen.native.tsx` (onda mobile); stories/ligações de `offline`/`maintenance` (entram com S503/S504 na V1.1).

### T2 · 404 no Painel — catch-all React Router, com shell  ·  [S500-T2 painel, retraduzido Vite]
- Superfície: `apps/painel/src/routes/_system/NotFound.tsx` (novo) + catch-all nos sub-routers (`OverviewRoutes/EventosRoutes/ClubesRoutes/PlataformaRoutes`). Reuso de destino "Visão Geral" = `/`.
- Dep: T1, E01 (AppShell).
- Nota de fiação (bloqueante para o executor): `App.tsx` hoje tem `<Route path="/*" element={<OverviewRoutes/>}/>` **greedy** que engole caminho desconhecido. Cada `*Routes.tsx` deve terminar com `<Route path="*" element={<NotFound/>}/>` para que a rota inexistente caia no 404 **dentro** do shell daquele domínio (recomendado sobre reestruturar `App.tsx`).
- Aceite (unit + e2e Playwright):
  - `/eventos/nao-existe` autenticado → `SystemStateScreen variant="notFound" layout="shell"`, sidebar+header visíveis, título "Essa página saiu para correr", ações "Voltar" + "Ir para a Visão Geral".
  - Clique em "Ir para a Visão Geral" → navega para `/`.
  - Foco inicial na ação primária; copy exata da tabela HANDOFF-07.

### T3 · 404 na Landing + guarda SEO (rascunho→404)  ·  [S500-T2 landing + requisito da decisão]
- Superfície: `apps/landing/app/not-found.tsx` (novo) + chamada `notFound()` no loader da rota pública do evento (edição pontual na rota criada por E12, ex.: `apps/landing/app/[evento]/page.tsx`).
- Dep: T1; **E12** (a rota pública do evento precisa existir para pendurar a guarda). A `not-found.tsx` genérica **não** depende de E12.
- Aceite (integração/e2e, falsificáveis por status HTTP):
  - GET de slug inexistente → **HTTP 404** + `SystemStateScreen variant="notFound" layout="fullscreen"`, ação única "Ir para a página inicial".
  - GET de evento em `status="rascunho"` → **HTTP 404** (via `notFound()`), nunca 200 (SEO-safe: rascunho não indexável).
  - GET de evento `publicado` → **HTTP 200** (página normal, não 404).
- Fora de escopo: a página de evento em si (E12); qualquer middleware.

### T4 · 500 no Painel — ErrorBoundary raiz + segmento + Sentry eventId  ·  [S502-T1 painel, retraduzido Vite]
- Superfície: `apps/painel/src/routes/_system/AppErrorBoundary.tsx` (novo, class component); `apps/painel/src/main.tsx` (boundary raiz fullscreen envolvendo `<App/>`); boundary de segmento nos `*Routes.tsx` (mantém shell); `apps/painel/src/lib/observability.ts` (novo — wrapper `captureException(err) → eventId` sobre `lib/sentry.ts`).
- Dep: T1, E00 (Sentry já inicializado — confirmado em `lib/sentry.ts`).
- Nota: o router atual usa `<BrowserRouter>`+`<Routes>` (não data-router), então `errorElement` não está disponível sem migrar para `createBrowserRouter`. Usar ErrorBoundary React (class) evita a migração.
- Aceite (unit + e2e):
  - Filho lança em render dentro de um segmento → boundary de segmento mostra `SystemStateScreen variant="error" layout="shell"`, título "Tropeçamos aqui, não foi você", ações "Tentar novamente" (reseta o boundary + re-renderiza) + "Voltar", `detail` = eventId.
  - `captureException` chamado exatamente 1x; `error.message`/stack **ausentes** do DOM (assert de não-presença).
  - Erro fora de qualquer rota → boundary raiz mostra `layout="fullscreen"`.

### T5 · 500 na Landing — `error.tsx` + upgrade do `global-error.tsx` + Sentry eventId  ·  [S502-T1 landing]
- Superfície: `apps/landing/app/error.tsx` (novo, segmento) + `apps/landing/app/global-error.tsx` (**upgrade** do stub existente → `SystemStateScreen` fullscreen + eventId + reset). Reusa `Sentry.captureException(error)` (retorno = eventId).
- Dep: T1, E00 (Sentry da Landing já wired — configs presentes).
- Aceite (unit + e2e):
  - Segmento que lança → `error.tsx` mostra `SystemStateScreen variant="error"`, "Tentar novamente" chama `reset()`, `detail` = eventId de `captureException`.
  - `global-error.tsx` reconstrói `<html><body>` + `SystemStateScreen layout="fullscreen"`; captura no Sentry; **sem** o `<h2>` cru atual; stack ausente do DOM.
  - Regressão: o comportamento de captura Sentry do stub atual é preservado (não regride).

### T6 · 403 no Painel — guarda por papel + tela, com shell (casado com E04-S304)  ·  [S501-T1]
- Superfície: `apps/painel/src/routes/_system/Forbidden.tsx` (novo) + `apps/painel/src/routes/_system/RequirePapel.tsx` (guarda: lê claim de evento via `api-client/auth.getClaims()` e chama `podeAcessar(papel, area)` do core).
- Dep: T1; **E04-S304-T1** (`podeAcessar` + `PapelEvento` + claim por evento em `core/eventos/equipe.ts` — hoje inexistente); E00 (Auth + fluxo de login); `api-client/auth.ts` (`getClaims`, já existe).
- Aceite (unit core reusado + integração emulator + e2e):
  - `podeAcessar('operador','financeiro') === false` → rota de financeiro renderiza `SystemStateScreen variant="forbidden" layout="shell"`, título "Esse espaço ainda não é seu", ações "Voltar" + "Falar com o organizador".
  - Usuário **não autenticado** em área privada → redireciona para login (E00), **não** 403 (distinção "não logado" × "logado sem permissão").
  - A guarda importa `podeAcessar` de `@leela/core` (assert de import) — o cliente só reflete o veredito, nunca recomputa RN-320.
- Fora de escopo: guarda da área de plataforma (`/plataforma/*` sem `platform_admin`) — pertence a **E16-L2** (já no aceite dele). E07-web fornece só a **tela** 403 compartilhada, reusada por ambos. Fluxo completo de "solicitar acesso" (só link/contato aqui).

## Copy canônica (HANDOFF-07 — só os 3 estados desta onda)

| Estado | Título | Mensagem | Ações |
|---|---|---|---|
| 404 | Essa página saiu para correr | O link que você seguiu não existe ou mudou de lugar. | Voltar · Ir para a Visão Geral (Painel) / página inicial (Landing) |
| 403 | Esse espaço ainda não é seu | Você não tem permissão para ver esta área. | Voltar · Falar com o organizador |
| 500 | Tropeçamos aqui, não foi você | Algo quebrou do nosso lado e a equipe já foi avisada. | Tentar novamente · Voltar · (id do erro) |

## Sequência interna E07-web

`T1 → (T2 ∥ T3 ∥ T4 ∥ T5) → T6`. T6 por último porque depende de E04-S304-T1. Como a Onda 2 põe **E04-slim antes de E07-web**, na retomada normal E04-S304-T1 já está mesclado; se E07-web for paralelizado com E04, só T6 bloqueia.

## Paralelismo entre épicos

- Superfícies novas e isoladas: `packages/design-system/src/components/SystemStateScreen/*`, `apps/painel/src/routes/_system/*`, `apps/landing/app/{not-found,error}.tsx`. Zero colisão com E03/E05/E16 (que vivem em `routes/{eventos,clubes,plataforma}`) e com E12/E06.
- **Barreiras compartilhadas**: `apps/painel/src/App.tsx` (T2 adiciona catch-all nos sub-routers) e `apps/painel/src/main.tsx` (T4 envolve o boundary raiz) são bootstrap tocado por todos os épicos de tela — **serializar** essas edições. Barrel do DS (`packages/design-system/src/index.ts`) via `.index-mutex`.
- **Zero** toque em `functions/firestore.rules`, `functions/*` e emulator (manutenção/`config/system` cortados) → E07-web **não** disputa `.rules-mutex`/`.emu-mutex` com os lotes Fable. Roda em paralelo total com o backend.

## Riscos / entidades compartilhadas

- **`SystemStateScreen` (T1) é primeiro-movedor de UI compartilhada**: E16-L2 também precisa dele para o 403 de plataforma. T1 deve entrar antes de E16 fechar o 403, ou E16 usa placeholder e refatora depois. Coordenar ordem.
- **T6 depende de artefato de E04 ainda não construído** (`podeAcessar` em `core/eventos/equipe.ts`). Sem ele, T6 não fecha — é a materialização do "403 casado com E04-S304".
- **Landing `global-error.tsx` já existe** (stub E00 que captura no Sentry): T5 é upgrade, não criação; o aceite fixa não-regressão da captura.
- **`App.tsx`/`main.tsx`**: catch-all + boundary raiz mexem no bootstrap comum; risco de conflito de merge com E02/E03/E05/E12/E16 se editados em paralelo.

## Decisões pendentes (consolidador / Vitor)

1. **Vite vs Next no Painel — ratificar.** Assumido pela realidade do repo: Painel = Vite + React Router; Landing = Next. Toda a fiação Next da spec do E07 para o Painel foi retraduzida (catch-all + ErrorBoundary + guarda). É a mesma pendência dos briefs E03/E16; aqui já foi resolvida na direção da realidade. Confirmar de vez.
2. **Fonte da autorização do 403 e fronteira de ownership.** Cortei `authorize.ts`/`canAccess`; o 403 de **evento** usa `podeAcessar` de E04-S304-T1, e o 403 de **plataforma** (`platform_admin`) fica com a guarda de E16-L2. E07-web entrega só a **tela** compartilhada. Confirmar que E16 não espera E07-web construir a guarda de plataforma, e que E04-S304-T1 expõe `podeAcessar(papel, area)` como público do `@leela/core`.
3. **Mobile adiado.** `SystemStateScreen.native.tsx` e todas as tasks de App (S500-T3, S501-T2, S502-T2, S503-*, S504-*) para a onda mobile (E13/V1.5). Confirmar que não há mobile na Onda 2.
4. **Débito V1.1 — offline + manutenção web.** `config/system` (singleton + Rules leitura-pública/escrita-Admin) e a detecção offline não entram agora. Quando entrarem: no Painel Vite, manutenção vira um provider de flag no bootstrap (não `middleware.ts` Next); offline vira hook `navigator.onLine` + fallback. Registrar como débito nomeado.
5. **SEO rascunho→404 (T3) depende de E12.** A chamada `notFound()` mora no loader do evento (rota do E12). Se E07-web rodar antes de E12, a parte SEO de T3 bloqueia; a `not-found.tsx` genérica não. A ordem da Onda 2 (E12 antes) resolve — confirmar.
6. **Strings de copy definitivas.** Os testes de T2/T4/T6 fixam os títulos canônicos da tabela ("Essa página saiu para correr" etc.). Se o glossário HANDOFF-07 final mudar alguma string, atualizar os testes junto. Confirmar strings antes de travar.
7. **Destino de "Falar com o organizador" — RESOLVIDO (consolidador, 2026-07-05): `mailto:{SUPORTE_LEELA}`** (constante placeholder, mesma família de `{DOMINIO_LEELA}`; endereço definitivo entra quando o Vitor nomear o domínio). Deep-link/contato do tenant fica V1.1 — a ação nunca fica morta.
8. **DSN de Sentry em staging.** Painel e Landing têm Sentry inicializável, mas o `eventId` real (exibido como id de erro no 500) só existe com DSN de ambiente. Sem DSN, o `detail` fica vazio e o aceite de eventId roda com mock. Confirmar que staging tem DSN para exercitar o id de verdade.
