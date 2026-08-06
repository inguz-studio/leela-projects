# FRONTEIRA-AUTH — handoff vivo

trace_id: `leela-fronteira-auth-20260806` · lane: `FRONTEIRA-AUTH` · employee: `sf-frontend-lead`
território: `apps/painel` + `apps/landing` + `eslint.config.mjs` + `packages/design-system/lint`
⛔ intocado: `functions/scripts` (lane `LIMPEZA-PROD`), produção (nenhum deploy, nenhuma escrita)

## Veredito

**Nenhum buraco de autenticação no painel.** A varredura cobriu as 20 superfícies do
`apps/painel` e as 13 rotas + 3 telas de sistema do `apps/landing`. Toda rota autenticada do
painel nasce debaixo do `RequireSessao`, e a prova agora é executável, não estrutural: o `App`
REAL, em ambiente de produção e sem sessão, manda 18 URLs distintas para `/entrar` — incluindo
`/plataforma`, a do relato do dono, e uma rota que não existe (o catch-all).

O relato do dono continua explicado pela sessão viva no navegador dele. Isso não é conclusão
minha — é o que sobra depois de fechar todas as outras portas, e o teste de dez segundos que o
confirma está em §4.

## Tarefas

- [x] T1 — varredura exaustiva das superfícies (painel + landing), com arquivo e linha.
- [x] T2 — nada a fechar no painel. Um achado de postura na landing (§2), reportado ao maestro
      sem conserto, porque mudá-lo é decisão de produto, não defeito.
- [x] T3 — trava executável: lint `leela-auth/rota-fora-da-fronteira` + contrato de roteamento.
      Os dois falsificados (§3).
- [x] T4 — o ponto do olho do dono (§4).

## §1 · A fronteira do painel

`apps/painel/src/App.tsx:32` — o `<Routes>` raiz tem **dois** filhos e só dois:

| # | `App.tsx` | Bloco | Guarda | Sem sessão | Sem papel |
|---|---|---|---|---|---|
| 1 | `:37-42` | `AuthLayout` (público, de propósito) | nenhum | renderiza (`/entrar`, `/cadastrar`, `/recuperar-senha`, `/redefinir-senha`) | n/a |
| 2 | `:49-86` | `RequireSessao` → `RootShell` → `ContaTravadaGate` → app | `RequireSessao.tsx:59` | `Navigate` p/ `/entrar` com `state.from` (`:87`) | camada de papel abaixo |

Tudo que o painel serve está dentro do bloco 2. Detalhe por subárvore no relatório da lane.

Camadas de papel (decidem o que um **autenticado** vê — não substituem o guarda de sessão):

| Subárvore | Guarda de papel | Arquivo:linha | Sem papel |
|---|---|---|---|
| `/plataforma/*` | `PlatformGuard` | `plataforma/_components/PlatformShell.tsx:20` | 403 (`PlatformGuard.tsx:33`) |
| `/eventos/:slug/*` | `RequirePapel` | `_system/RequirePapel.tsx:49` (12 usos) | `Forbidden` (`:72`) |
| toda rota autenticada | `ContaTravadaGate` | `onboarding/ContaTravadaGate.tsx:46` | overlay; rota não monta (`:67-77`) |

Os quatro vetores que o brief mandou caçar, um a um:

1. **Rota irmã do bloco guardado** — não existe. Dois filhos, medidos. Agora travado por lint.
2. **Loading que renderiza antes de decidir** — `avaliarSessao` (`RequireSessao.tsx:48`) devolve
   `'loading'` antes de qualquer render, e é o **único** caminho: `RequireSessao` é o único
   ponto de montagem do app. Coberto por teste no `App` real.
3. **Claims de cache que passam enquanto o refresh não volta** — não é vetor de entrada. Nem
   `tenantSession.ts` nem `plataforma/_data/session.ts` leem claims para decidir **sessão**;
   ambos partem de `onSessionChange` e usam claims só para `tenantId`/`role`, e ambos são
   fail-closed (`role: null` → 403, `session.ts:75-78`). `RequireSessao` não lê claims de
   propósito (`RequireSessao.tsx:20-24`).
4. **`ContaTravadaGate` como véu** — não é véu: a rota de destino **não é montada** quando a
   conta está travada (`ContaTravadaGate.tsx:67-77` devolve só o overlay). Nenhuma query
   tenant-scoped sai atrás dele. Ele renderiza os filhos enquanto a sessão resolve
   (`:52`) — decisão documentada, e sem risco porque isso já é **depois** do `RequireSessao`.

**404 e erro não vazam.** `NotFound.tsx:20` e `AppErrorBoundary.tsx:55` renderizam
`SystemStateScreen` com copy fixa; o boundary nunca põe `error.message`/stack no DOM
(`:41-44`, componentStack só vai ao Sentry). Ambos só existem dentro de subárvores já guardadas.

## §2 · A landing

13 rotas. **Uma** superfície autenticada: `/minha-conta`.

- Não há `middleware.ts` em lugar nenhum do repo — zero enforcement de borda.
- `app/(public)/minha-conta/page.tsx:38` é server component fino de propósito: responde **200
  com casca** ao anônimo e decide no cliente (`AreaDoCliente.tsx:81` → `:124` → `PortaDeEntrada`).
  **Não redireciona para login.**
- A busca user-scoped **não** dispara antes da decisão: `AreaDoCliente.tsx:89-97` retorna cedo
  quando `!nomeado`. A tranca real é servidor: `functions/src/cliente/gateAreaCliente.ts:108-160`
  (anônimo → `sessao_anonima`; e-mail não verificado → barra; `contaUid == caller.uid`).
- `not-found.tsx:19`, `error.tsx:30`, `global-error.tsx:34` — limpos, e estruturalmente
  incapazes de vazar: ficam na raiz de `app/`, fora do grupo `(public)`, então o header de conta
  nem entra na árvore.

**Achado de postura, não defeito (para o maestro decidir):** a landing não tem sessão de
servidor, então "ninguém entra sem estar autenticado" ali é verdade sobre **dados**, não sobre
**tela** — o anônimo vê a casca e um convite a entrar. Dar a ela o mesmo redirect do painel
exigiria cookie de sessão que a landing não tem hoje. Não mexi: é mudança de produto.

## §3 · A trava (T3) — e a prova de que ela morde

**Mecanismo escolhido: os dois, porque cada um pega o que o outro não pega.**

1. **Lint `leela-auth/rota-fora-da-fronteira`**
   (`packages/design-system/lint/leela-auth-plugin.mjs`, ligado em `eslint.config.mjs`).
   No `<Routes>` debaixo de um Router, todo `<Route>` filho direto tem de declarar de que lado
   está: guarda (`RequireSessao`) ou público declarado na config (`AuthLayout`). Qualquer terceira
   coisa é erro. **Pega o caso que nenhum teste pega** — a rota que ainda não existe.
   Falsificado: com `<Route path="/status-interno">` injetada como irmã, `eslint` sai **1** com
   a mensagem nominal. Sem ela, sai **0**. 11 casos em
   `packages/design-system/lint/__tests__/leela-auth-plugin.test.mjs`.

2. **Contrato de roteamento** (`apps/painel/src/routes/__tests__/fronteira-auth.test.tsx`).
   Monta o `App` REAL com guarda ativo e sem sessão; 18 URLs → `/entrar`, `state.from`
   preservado, restauração pendente → espera (não conteúdo), 4 rotas públicas abrem, e com
   sessão o painel volta. **Pega o que o lint não pega**: guarda arrancado, subárvore movida,
   ordem de rota quebrada. 28 casos.
   Falsificado: montando `/plataforma/*` como irmã do guarda — o sintoma exato do relato — o
   arquivo cai com **5 falhas** (`expected '/plataforma' to be '/entrar'`).

Por que não só documento: o padrão da casa é regra executável (`leela-scroll-plugin.mjs`), e a
fronteira mora hoje na indentação do `App.tsx` — uma linha a reabre sem quebrar build nem teste.
Por que a allowlist de públicas vive no `eslint.config.mjs`: abrir rota ao anônimo passa a exigir
edição de arquivo compartilhado, que aparece sozinho no diff da review.

## §4 · O que só o olho do dono resolve

Minha varredura não alcança **o estado do navegador dele**. Teste de dez segundos:

> Abrir `https://leela-hub.web.app/plataforma` numa **janela anônima**. Se cair em `/entrar`, a
> fronteira está fechada e o que ele viu era a sessão dele, viva. Se entrar no painel, há algo
> que o código não explica e a lane reabre com esse fato.

Também sem prova por escolha (proibido tocar produção): que o bundle no ar é o do HEAD.

## §5 · Risco reportado, não mexido — senhas de demonstração

`apps/painel/src/lib/preview-autologin.ts:35-41`: `demo1234` em claro, para
`marina@`, `felipe@` e `admin@demo-leela.dev`. As duas primeiras existem em **produção** como
`tenant_owner`. Se a senha de produção for a mesma, **quem lê o repositório entra como dona de
produtora e vê a PII de 803 inscritos**. Não testei contra produção. As contas estão na fila da
`LIMPEZA-PROD`; o risco é a janela até lá. Decisão do maestro.

## Gates

| Gate | Resultado |
|---|---|
| `tsc --noEmit` painel | exit 0 |
| `tsc --noEmit` landing | exit 0 |
| `eslint src --max-warnings 0` painel | exit 0 |
| `eslint src showcase/src --max-warnings 0` DS | exit 0 |
| suíte do painel | **202 arquivos · 2.078 testes · 0 falhas** |
| suíte de lint do DS | 3 arquivos · 40 testes · 0 falhas |
| falsificação do lint | erro nominal, exit 1 |
| falsificação do contrato | 5 falhas na rota do relato |
