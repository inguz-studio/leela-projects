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

---

# Segunda tarefa — o campo de senha (revelar · regra · medidor)

Pedido do dono, verbatim: ver a senha ao configurar/recuperar/entrar, exigir
número e caractere especial, e indicar fraca ou forte.

## §6 · Onde ficou, e por quê

**Duas casas, não uma.** A régua em `packages/core/src/platform/politicaDeSenha.ts`;
a apresentação em `packages/design-system/src/components/InputSenha/`.

A régua não podia morar no design system porque **o servidor precisa dela**: três
Cloud Functions criam ou trocam senha pelo Admin SDK, e Cloud Function não
importa design system. A apresentação não podia morar no core porque core é
puro, sem React. O componente recebe `avaliacao={avaliarSenha(senha)}` e desenha
— mesmo desenho de `PlatformGuard` (presentacional) com `PlatformShell`
(contêiner), que já é o padrão da casa.

`Input` ganhou um slot `trailing`. Nasceu no primitivo, e não no consumidor,
porque o `Input` renderiza label + campo + erro numa pilha: um botão posicionado
por fora se ancora na PILHA e desliza sozinho quando a mensagem de erro aparece.
Sem `trailing`, o DOM sai idêntico ao de sempre — é por isso que os 18 testes do
`Input` seguem verdes sem uma linha alterada.

**A régua estava em quatro lugares.** `SENHA_CONTA_MIN` (6) no core,
`SENHA_MIN_AFILIADO` (8) na Function, `SENHA_MIN_ASSESSORIA` (8) copiado no
api-client "como espelho de premissa", `SENHA_MIN` (6) no painel. Os quatro
viraram apelidos de um número só, que subiu para **8**.

## §7 · A política é garantia ou é orientação? Depende da porta.

| Porta | Como a senha é gravada | A regra vale no servidor? |
|---|---|---|
| `provisionAfiliado` | `auth.createUser` (Admin SDK) | **Sim** — `senhaValida()` na Function |
| `provisionAssessoria` | `auth.createUser` (Admin SDK) | **Sim** — `senhaValida()` na Function |
| `concluirAcessoComProva` | `auth.updateUser`/`createUser` (Admin SDK) | **Sim** — `senhaDeContaValida()` (= a política) |
| `/cadastrar` (painel) | `createUserWithEmailAndPassword` (browser → IdP) | **Não** — só a política nativa do IdP |
| `/definir-senha`, `/redefinir-senha` | `confirmPasswordReset` (browser → IdP) | **Não** — idem |
| troca de senha na conta | `updatePassword` (browser → IdP) | **Não** — idem |

Para as três primeiras a regra é **garantia**: nenhuma chamada direta passa por
cima. Para as três últimas é **orientação de interface** — quem chama o Identity
Platform direto ignora a tela.

**A ação que fecha isso não é de código, é de projeto** (e por isso não a
executei — proibido escrever em produção):

> Firebase Console → Authentication → Settings → Password policy → modo
> **Require**, com: comprimento mínimo 8, "Numeric character required" e
> "Non-alphanumeric character required" ligados. Equivalente por API: Identity
> Toolkit `projects.updateConfig`, campo `passwordPolicyConfig`.
> (docs.cloud.google.com/identity-platform/docs/password-policy, 06/08/2026.)

**Achado que essa consulta pagou.** A lista de "non-alphanumeric" do Identity
Platform é `^ $ * . [ ] { } ( ) ? " ! @ # % & / \ , > < ' : ; | _ ~ ` ` — e
**não** inclui `-`, `+` nem `=`. A primeira versão do nosso conjunto incluía os
três por reflexo. Com a política ligada no servidor, `senha-forte-123` passaria
na tela e morreria no servidor, sem a pessoa entender por quê. O conjunto agora
é cópia literal do publicado, com o caso travado por teste.

## §8 · Comprimento mínimo — proposta, decisão do dono

**Implementado: 8.** É o mínimo do NIST SP 800-63B e o piso que as duas portas
de convite já praticavam; unificar para 6 seria afrouxar produção.

**Proposta: subir para 12.** O NIST §5.1.1.2 recomenda explicitamente **não**
impor regras de composição e priorizar comprimento + bloqueio de senhas vazadas,
porque composição empurra a pessoa para `Senha1!` — oito caracteres que atendem
a tudo e são a primeira coisa que um dicionário tenta. O NIST sugere 15 para
senha escolhida por pessoa; 12 é o meio-termo que ainda cabe numa senha digitada
no celular. Mudar é editar **uma** constante; os dois apps e as três Functions
passam a exigir junto.

Mitigação já embutida enquanto a decisão não vem: `Senha1!` atende à regra e sai
**FRACA** no medidor, porque a força mede comprimento e variedade além da regra.
Medidor que fica verde no mínimo ensina o mínimo. O caso está travado por teste.

## §9 · Trava executável (mesmo padrão da fronteira)

Lint `leela-auth/senha-fora-do-ds`: `<input type="password">` cru em `apps/` é
erro, nas duas grafias (`"password"` e `{'password'}`). Eram 17 campos em 9
arquivos quando a lane começou; o 18º será escrito por alguém que não leu nenhum
dos outros, e é ele que a regra pega.

## §10 · Superfícies trocadas (17 campos, 9 arquivos)

| App | Arquivo | Campos | Medidor |
|---|---|---|---|
| painel | `routes/conta/auth/EntrarPage.tsx` | 1 (`current-password`) | não |
| painel | `routes/conta/auth/CadastrarPage.tsx` | 2 | só na senha |
| painel | `routes/conta/auth/RedefinirSenhaPage.tsx` | 2 | só na senha |
| painel | `routes/conta/perfil/ContaPage.tsx` | 3 | só na nova |
| landing | `(public)/definir-senha/DefinirSenhaFlow.tsx` | 1 | sim |
| landing | `components/EntrarOverlay.tsx` | 1 (`current-password`) | não |
| landing | `(public)/convite/ConviteForm.tsx` | 2 | só na senha |
| landing | `(public)/convite/afiliado/AfiliadoConviteForm.tsx` | 2 | só na senha |
| landing | `(public)/minha-conta/PainelMeusDados.tsx` | 2 | só na nova |

Regra do medidor: entra onde a senha **nasce**. No login não orienta ninguém e
anuncia ao vizinho de tela que a senha é fraca; no campo de confirmação leria a
mesma string duas vezes.

Duas decisões que valem veto do maestro:
1. **A senha ATUAL não é revalidada** na troca (painel e landing). Validar ali
   trancaria do lado de fora exatamente quem veio trocar uma senha antiga. Há
   teste falsificável.
2. **O login não aplica o piso novo.** Uma senha legada sem caractere especial
   continua entrando. Aplicar a regra no login seria trancar todo mundo que já
   tem conta.

## §11 · Gates da segunda tarefa

| Gate | Resultado |
|---|---|
| `tsc --noEmit` core · api-client · DS · functions · painel · landing | exit 0 nos seis |
| `eslint --max-warnings 0` painel · landing · DS | exit 0 nos três |
| DS: InputSenha + Input + Field | 41 testes, 0 falhas (os 18 do `Input` sem uma linha alterada) |
| painel: `src/routes/conta` | 11 arquivos · 128 testes · 0 falhas |
| landing: os 5 arquivos tocados | 69 testes · 0 falhas |
| política de senha (core) | 16 testes · 0 falhas |
| lint do DS (3 plugins) | 45 testes · 0 falhas |
| falsificação `senha-fora-do-ds` | campo cru → erro nominal, exit 1 |

## §12 · O que ficou sem prova

- **Pixel, contraste real e alvo de toque no celular.** jsdom não prova nenhum
  dos três. O medidor foi desenhado com token do DS e a força é sempre PALAVRA
  além de cor, mas quem confirma é o olho do dono.
- **As suítes de integração das Functions** exigem os emuladores da lane e não
  rodaram aqui. Os fixtures que dependiam do hífen como "especial" foram
  corrigidos por leitura, não por execução.
- **Se a política nativa do Identity Platform está ligada no `leela-hub`** —
  é configuração de projeto, não de repo, e a lane não escreve em produção.
- **O painel de decisões não foi editado.** `leela-specs/01-produto/DECISOES-ABERTAS.md`
  está com alteração NÃO COMMITADA de outra lane (37 linhas removidas); um
  `commit --only` nele carregaria o trabalho alheio junto. A decisão do
  comprimento mínimo (§8) vai para o maestro registrar.

---

# Terceira tarefa — o papel duplo na interface

## §13 · A segunda porta, e as outras três que a varredura achou

A `PAPEL-DUPLO` deixou as Rules aceitando as duas pernas do crachá (papel legado
OU capacidade) e apontou `plataforma/_data/session.ts:60` como a porta que
faltava. A varredura achou **seis** comparações literais de papel nos apps.
Quatro estavam erradas:

| # | Arquivo:linha (antes) | O que a comparação literal fazia | Agora |
|---|---|---|---|
| 1 | `plataforma/_data/session.ts:60` | 403 no dono — a porta do relato | `isPlatformAdmin(claims)` |
| 2 | `conta/auth/_lib/destinoPosLogin.ts:68` | barrava na porta o admin nomeado por CAPACIDADE (sem tenant, sem doc de profissional) e derrubava a sessão dele | `isPlatformAdmin(crachá)` |
| 3 | `conta/auth/_lib/destinoPosLogin.ts:87` | mandava esse mesmo admin para uma Visão Geral sem tenant nenhum | `paineisDaConta(crachá)` |
| 4 | `onboarding/_data/onboarding.ts:48` | cobria esse admin com o overlay "peça um convite" | `isPlatformAdmin(crachá)` |

**A quinta está CERTA e ficou de pé:** `apps/landing/lib/portaOrganizador.ts:54`.
Ali a pergunta é *"esta conta é SÓ da plataforma?"*, não *"esta conta administra
a plataforma?"* — trocar por `isPlatformAdmin` faria o dono perder a porta de
organizador na própria área de cliente. Ficou pinada com três testes e com o
porquê escrito na linha, para a próxima varredura não a "consertar".

A sexta (`plataforma/_data/session.ts:48`) era um comentário desatualizado.

**Nenhum destino de entrada muda para quem existe hoje.** Admin legado (sem
tenant) continua em `/plataforma`; o dono continua na Visão Geral, onde trabalha.
Só o caso que não existia — capacidade sem tenant — deixa de cair no lugar errado.

**Gatilho de refresh corrigido junto:** era `!role`, e a conta recém-nomeada TEM
`role` (`tenant_owner`), então nada forçava o refresh e o 403 durava até o token
rodar sozinho. Agora o gatilho é "o crachá em cache não concede".

## §14 · O alternador

`apps/painel/src/shell/AlternadorDePainel.tsx` + `shell/paineis.ts`, desenhado no
bloco de marca do `RootShell`.

Três regras, cada uma travada por teste: **só aparece para quem alcança os dois**
(`podeAlternar`); **rotula o destino**, não o estado; **não decide permissão** —
há um caso que o monta com `podeAlternar` mentindo `true` só para provar que o
clique navega e nada mais acontece.

De quebra, o sub da marca deixou de mentir: era o literal "Painel do Organizador"
em TODA rota, e `/plataforma` sempre rodou dentro deste mesmo shell.

## §15 · Laudo da escrita negada

Documento próprio: `.nirvana/handoffs/leela-fronteira-auth-20260806-LAUDO-ESCRITA-NEGADA.md`.

Resumo: **12 de 13 leituras passam, 7 de 8 escritas recusam**, e só uma superfície
diz ao dono que o motivo é permissão. Os guards das Functions continuam no papel
literal (16 sítios, 5 helpers compartilhados) e são de outra lane. Dois achados
que não são "mensagem ruim": o modal de dados bancários **audita um
`negado_papel` por tentativa**, e a escrita que PASSA no tenant do próprio dono é
carimbada `trilha: 'organizador'` — **corrupção silenciosa do rastro de
auditoria**, que não se manifesta como erro.

## §16 · Pendência DO DONO (não da lane)

A janela anônima em `https://leela-hub.web.app/plataforma` continua sem resposta.
Enquanto ele não reproduzir num navegador limpo, a hipótese de sessão residual
segue **sem confirmação**. Se reproduzir, a lane reabre e vira incidente.

## §17 · Gates da terceira tarefa

| Gate | Resultado |
|---|---|
| `tsc --noEmit` painel · landing | exit 0 |
| `eslint --max-warnings 0` painel · landing | exit 0 |
| `usePlatformSession` (os quatro crachás) | 11 testes |
| `destinoPosLogin` | 17 testes |
| `contaTravada` | 12 testes |
| `AlternadorDePainel` + `RootShell` | 22 + shell completo |
| `portaDaConta` (landing, a armadilha pinada) | 26 testes nos dois arquivos |
| falsificação da porta principal | 3 falhas, incluindo o caso do dono |
