# Handoff vivo · ONBOARD-BUILD (`leela-build-2d6ee98d`)

- **lane:** ONBOARD-BUILD — porta de entrada do organizador
- **employee:** sf-backend-lead (software-forge)
- **repo:** `C:\dev\LEELA` · branch `main`
- **início:** 2026-08-03
- **fila:** `leela-specs/02-rodadas/2026-07-28-onboarding-organizador/03-fila-codigo.md`

## Ordem de execução

`(S1608-T1, S030-T1, S1213-T1)` → `(S030-T2, S1608-T2)` → `S1609-T1` → `S1609-T2` → delta item 57

## Estado das tasks

| # | Task | Estado | Commit |
|---|------|--------|--------|
| 1 | S1608-T1 — modelo + core + Rules do convite | **PAGO** | `d0b7cd49` |
| 2+3 | S030-T1 + S030-T2 — `/cadastrar` completo + doc `profissionais/{uid}` | **PAGO** | `336bb736` |
| 7 | S1213-T1 — entrada do organizador na landing | **PAGO** | `da3d8c88` |
| 6 | S1608-T2 — tela `/plataforma/convites` | **PAGO** | `c770fef5` |
| 4 | S1609-T1 — Function `resgatarConviteOrganizador` | **PAGO** | `a359f07a` |
| 5 | S1609-T2 — overlay bloqueante + CTA configurável | **PAGO** | `a010ac9e` |
| δ | item 57 — roteamento pós-login por papel | **PAGO** | `1e4b3b2a` |

**LANE COMPLETA.** 7 commits, todos em `origin/main` (HEAD `1e4b3b2a`). Working
tree limpo do que é desta lane. Zero deploy — como o brief mandou.

### Nota da retomada (2026-08-03, pós-crash)

O terminal anterior morreu antes de qualquer commit. As 5 tasks marcadas
"gates verdes" no handoff pré-crash foram **re-auditadas**, e o verde não era
verdadeiro: `apps/painel` lint acusava
`no-hardcoded-tokens` em `ConvitesView.tsx:76` (`tracking-[0.08em]`). Corrigido
para `var(--table-header-spacing)` — o mesmo token que o código de convite de
clube já usa (`ConviteModal.tsx:83`). Lição: gate pré-crash não vale como
prova; re-rodar sempre.

**S030-T1 e S030-T2 pagaram num commit só.** Os dois são inseparáveis em
`CadastrarPage.tsx`: a escrita do doc acontece dentro do submit, e a T1 sozinha
deixaria o checkbox de LGPD carimbando lugar nenhum — um commit intermediário
que não type-checa é pior que um commit com duas tasks.

Separação dos commits feita por staging parcial (blob direto no índice via
`git hash-object` + `git update-index`), porque `firestore.rules`,
`packages/core/src/index.ts` e `packages/api-client/src/index.ts` carregam
blocos de 3 tasks diferentes cada um. Os blocos da S1609 ficaram fora do índice
e seguem no working tree.

### Operação (ambiente)

- `pnpm` recusa rodar script por causa de `ERR_PNPM_IGNORED_BUILDS`
  (`@sentry/cli`). Contorno usado em toda a lane:
  `pnpm --config.verify-deps-before-run=false --filter <pkg> <script>`.
  **Não rode `pnpm install` nem `pnpm approve-builds`** — a primeira tentativa
  escreveu `'@sentry/cli': set this to true or false` dentro de
  `pnpm-workspace.yaml` (revertido com `git checkout --`).
- `vitest` não existe em `node_modules/.bin` da raiz; use o do app
  (`apps/painel/node_modules/.bin/vitest`).

## Inventário de reuso (feito antes de codar)

- `packages/core/src/clubs/codigo-convite.ts` — alfabeto sem ambíguos (RN-101). **Reusado**
  como fonte única do alfabeto; o convite de organizador só muda o tamanho (8).
- `packages/core/src/eventos/dadosPessoais.ts` — `telefoneValido`/`normalizarTelefone`
  (10–13 dígitos, máscara livre). **Reusado** no cadastro em vez de abrir uma segunda régua.
- `functions/src/shared/rateLimit.ts` — `consumirRateLimit` + `hashChave`, janela deslizante
  fail-closed com resposta genérica `resource-exhausted`. **Reusado** no RN-415.
- `functions/src/platform/provisionTenant.ts` — `provisionTenantCore` (RN-403). **Reusado**
  como única máquina de provisionamento; o resgate acrescenta um chamador.
- `functions/src/assessorias/provisionAssessoria.ts` — molde de callable de resgate atômico
  (anti-TOCTOU, replay, compensação). **Referência de desenho**, não copiado.
- Telas de plataforma (`planos/`): PageHeader/Table/Skeleton/Button + `_lib/format` +
  `_lib/errors`. **Reusados** integralmente pela tela de convites.

## Achado central desta lane (afeta a review)

**A conta recém-cadastrada nasce com claim `athlete`.** `functions/src/auth/onCreateUser.ts`
dá `role: 'athlete'` por default a toda conta nova. `provisionTenantCore` REJEITA promover
conta com papel conflitante (guarda do review Onda1 #2, `failed-precondition`). Sem tratar
isso, **todo resgate de convite falharia** — a jornada inteira do pacote morreria no último
passo.

Tratamento (S1609-T1): `ProvisionOptions.autoCadastroUid` — extensão explícita e estreita do
input de `provisionTenantCore` (a fila autoriza: "estende-se o input, não se cria função
irmã"). Autoriza `athlete → tenant_owner` SÓ quando o uid que resgata é o próprio dono da
conta, e só na ausência do marcador `demotedFromRole` (demoção deliberada segue rejeitada).

## Premissas assumidas

1. **`platform/configOnboarding` em vez de `platform/config`** (RN-417). A RN grafou
   `platform/config.contatoOnboarding`, mas `platform/config` guarda a tabela global de taxa
   e há teste de ataque provando que só `platform_admin` a lê
   (`functions/src/__tests__/taxaFlexRules.integration.test.ts:197`). Rules do Firestore não
   filtram CAMPO — abrir aquele doc para a conta travada entregaria a economia da plataforma
   junto. Mesma coleção, mesma semântica (editável pelo admin sem deploy, fail-closed para
   mailto); muda o docId.
2. **Fallback do CTA:** `contato@leela.app` (placeholder consciente — domínio definitivo é o
   item 12 do painel). Trocar pela config, não por deploy.
3. **`NEXT_PUBLIC_PAINEL_URL` default `https://leela-hub.web.app`** (canal live do site do
   painel). Env declarada em `apps/landing/.env.leela-hub`; o default existe só para o link
   não nascer morto num build sem env.
4. **Versão do termo LGPD = `2026-07-28`** (data da rodada). Mudou o texto ⇒ sobe a constante
   `TERMO_LGPD_VERSAO` no mesmo commit.
5. **Rate-limit consumido em TODA tentativa autenticada**, inclusive código malformado —
   uniformidade de resposta (dois caminhos de custo diferente seriam oráculo de tempo).
6. **Slug do tenant com desempate numérico** (`castelo-producoes`, `castelo-producoes-2`, …)
   quando a semente do nome da organização já está em uso.
7. **Escrita do perfil no cadastro é best-effort.** A conta Auth já existe e não dá para
   desfazê-la do cliente; travar a tela prenderia a pessoa fora de uma conta que ela não
   consegue recriar (e-mail já em uso). O resgate recria o doc quando falta, e o overlay se
   guia pela CLAIM (server-side), não pelo doc.
8. **`convitesOrganizador` não aceita delete de ninguém** — convite queimado é registro de
   auditoria de quem entrou na plataforma no go-live.
9. **Item 57 reconciliado com RN-411:** conta sem tenant que TEM doc `profissionais/{uid}`
   aterrissa na home (overlay); conta sem tenant e sem doc recebe o aviso na tela de entrar.
   Sem isso, o item 57 barraria na porta exatamente o organizador que a RN-411 manda entrar.

## Gates rodados

- `packages/core`: type-check + lint zero-warning + `tsup` build — verdes.
- `packages/api-client`: type-check + lint zero-warning — verdes.
- `apps/painel`: type-check + lint zero-warning; suíte dos módulos tocados (auth, plataforma,
  shell) verde.
- `apps/landing`: lint + type-check verdes; suíte `porta-organizador` 6/6.
- `functions`: build + `emulators:exec` nos arquivos novos — `conviteOrganizadorCore` +
  `convitesOrganizadorRules` 42/42; `autoCadastroOrganizadorRules` + `cadastroOrganizadorCore`
  27/27. Suíte completa: ver seção abaixo.

### Nota de operação (aprendizado desta lane)

Rodar a suíte do painel EM PARALELO com o `emulators:exec` derruba o emulator por contenção
de CPU (`fetch failed` no meio de um arquivo de Rules). Rodar as duas em série.

## Gates finais (números reais, rodados nesta sessão)

| Gate | Resultado |
|---|---|
| `packages/core` | type-check + lint zero-warning + `tsup` — verdes |
| `packages/api-client` | type-check + lint zero-warning + `tsup` — verdes |
| `apps/painel` | type-check + lint zero-warning; **suíte completa 194 arquivos / 1815 testes** |
| `apps/landing` | type-check + lint verdes; `porta-organizador` 6/6; `next build` 12 rotas |
| `functions` | build (`tsc`) + lint zero-warning — verdes |
| `emulators:exec` — onboarding | 4 arquivos / 69 testes |
| `emulators:exec` — resgate + provisionamento | 8 arquivos / 133 testes |
| `emulators:exec` — contato + taxa | 3 arquivos / 37 testes |
| `emulators:exec` — **todas as Rules do repo** | 34 arquivos / 811 testes |

Emulator e suíte do painel sempre em SÉRIE (a contenção de CPU derruba o
emulator no meio de um arquivo de Rules). Nenhum crash nesta sessão.

## O que a REV antagonista deve atacar

1. **Enumeração de convite** — Rules negam leitura a todo papel que não seja
   `platform_admin`; a callable é o único caminho. Atacar: query na coleção com
   cada papel; `listCollections`; e se a recusa do resgate vaza tempo diferente
   entre "inexistente" e "usado".
2. **Corrida de uso único** — a reserva é CAS numa transação; a compensação
   devolve a `ativo` só se `usadoPor` for o próprio. Atacar: dois resgates
   concorrentes; resgate que falha no provisionamento e deixa resíduo; replay
   de conta diferente.
3. **Bypass de rate-limit** — consumido antes de tudo, por `uid` hasheado.
   Atacar: código malformado (deve consumir igual), conta nova a cada
   tentativa, janela deslizante na virada da hora.
4. **Claim forjada** — `ProvisionOptions.autoCadastroUid` é a extensão nova e é
   o ponto mais quente da lane. Atacar: `autoCadastroUid` de terceiro, conta com
   `demotedFromRole`, promoção de conta que já é `tenant_owner` de outro tenant,
   e se algum caminho de admin consegue chegar nessa opção.
5. **Premissa 1 (divergência da RN-417)** — o contato saiu de `platform/config`
   para `platform/configOnboarding`. Atacar: a conta travada consegue ler a
   tabela de taxa por algum caminho? o `hasOnly` do doc do contato segura campo
   extra? (há teste, mas é premissa de dono, não decisão dele).
6. **Item 57 × RN-411** — o discriminante é a existência do doc
   `profissionais/{uid}`. Atacar: conta que apaga/nunca teve o doc por causa do
   best-effort do cadastro e fica barrada na porta sem conseguir se recadastrar
   (o e-mail já está em uso). É a costura mais frágil do pacote.

## Pendências de dono (não são bloqueio de código)

1. **Item 57: desenho RATIFICADO pelo dono em 03/08** — admin da plataforma →
   `/plataforma`, organizador → Visão Geral, conta sem papel → aviso na tela de
   entrar, mantida a reconciliação com a RN-411 (premissa 9). É exatamente o que
   está no commit `1e4b3b2a`; **não há veto pendente sobre o desenho**.
   O que resta é só escriturário: o arquivo
   `leela-specs/01-produto/DECISOES-ABERTAS.md` estava sendo reescrito pela lane
   **DECISOES-CLEAN em voo** durante esta sessão (mtime 19:09), então não toquei —
   fechar o item lá é da DECISOES-CLEAN ou do maestro.
2. **Fallback do CTA = `contato@leela.app`** (placeholder). Vira config, não
   deploy, quando o item 12 (domínio) fechar.
3. **Versão do termo LGPD = `2026-07-28`.** Se o texto mudar, sobe a constante.
4. **Deploy não autorizado nesta lane** — código + provas locais entregues; a
   janela de deploy é decisão do maestro depois da REV.
5. **Seed do primeiro convite** (`convitesOrganizador.seed.ts`) existe mas não
   foi rodado em ambiente nenhum. O Francisco é o 1º beta.

## Informações do dono que NÃO são desta lane (registradas para não se perderem)

Chegaram pelo maestro em 03/08, junto da ratificação do item 57. Nada aqui foi
construído — ficam para a fila, e ficam escritas para ninguém inventar depois:

1. **Uma conta pode acumular admin + organizador.** Decisão do dono: **acesso
   único**, e a UX de visualização multi-papel fica para depois. **Não construir
   seletor de papel.** O `destinoPosLogin` já se comporta assim por precedência
   (`platform_admin` vence e a conta cai em `/plataforma`); o comentário no
   arquivo avisa quem for mexer.
2. **O login vira um componente overlay central na landing.** Item futuro, fora
   do escopo desta lane — a entrada de hoje é o link do `PublicHeader` para o
   painel (S1213-T1), e trocá-la é trabalho de outra lane.
