# Handoff · lane ONBOARD-REV · trace `leela-build-2d6ee98d` · 2026-08-03

Reviewer: sf-qa-engineer (software-forge), contexto FRESCO — sem participação na construção.
Brief: `.nirvana/briefs/leela-build-2d6ee98d-ONBOARD-REV-enriched.md`.
Alvo: `d0b7cd49..aa0e2183` (8 commits; o 8º chegou depois do dispatch — ratificação do item 57).

`git commit --only` por caminho, sufixo `[leela-build-2d6ee98d]`. Zero deploy, zero mutação em produção.

## Placar por vetor

| # | Vetor | Veredito |
|---|---|---|
| 1 | enumeração de convite | **FAIL → DEF-B corrigido** (oráculo de validade para papel conflitante) |
| 2 | corrida de uso único e resíduo | **PASS** (3 falsificações executadas) |
| 3 | bypass de rate-limit | **PASS no que a RN-415 promete · VETO-DONO no que ela não cobre** |
| 4 | `ProvisionOptions.autoCadastroUid` | **PASS** (6 ataques executados, nenhum promoveu) |
| 5 | premissa 1 (RN-417) | **PREMISSA SUSTENTADA** — falsificação executada |
| 6 | item 57 × RN-411 | **FAIL → DEF-A corrigido · resíduo em VETO-DONO** |
| 7 | Rules do Firestore | **PASS** (3 falsificações de Rule executadas) |
| 8 | LGPD | **FAIL → VETO-DONO** (aceite se perde e a conta segue ativa) |
| 9 | conformidade de marca | **FAIL → DEF-C corrigido** (véu do overlay não compilava) |
| 10 | roteamento por papel | **PASS** (decisão do dono virou caso de teste) |

Defeitos: **3 confirmados, 3 corrigidos** (`52f27f76`, `06ea10f8`, `37b9ec94`) + 1 commit de prova (`d8d36697`).
Vetos ao dono: **3**.

---

## DEF-A · o formulário aceitava o que o servidor recusa — fix `52f27f76`

O gate do `/cadastrar` era `nome.trim().length > 0` e `organizacao.trim().length > 0`, sem teto. A Rule
`shapeAutoCadastroValido`, escrita pela MESMA lane, exige de 2 a 80 caracteres nos dois campos. E o core
já tinha `validarCadastroOrganizador` com essa faixa exata, com o comentário dizendo para que serve:
*"a tela usa para habilitar o botão, a Function usa para não confiar na tela"*. A tela não usava.

**Falsificação EXECUTADA** (probe em jsdom, `CadastrarPage` real, `criarPerfilOrganizador` recusando):

```
nome=F     botao disabled? false   payload {"nome":"F",...} enviado   navegou para "/"
org 81ch   botao disabled? false   organizacao.length enviado: 81      navegou para "/"
```

A negativa do servidor cai no `catch {}` vazio do submit. **A conta Auth nasce sem
`profissionais/{uid}`.**

E o estrago não morre ali. No login seguinte o item 57 usa a existência desse doc como discriminante:
sem doc → `barrar` + `logout()`. Não há volta — o e-mail já está em uso (cadastro recusa), e o resgate
do convite, que recriaria o doc, só é alcançável **depois** de entrar. Beco sem saída, com o convite do
Francisco do outro lado.

O teste que a build escreveu para esse caminho
(`falha ao gravar o perfil NÃO prende a pessoa fora da conta que já existe`) afere o passo IMEDIATO —
a navegação para `/` — e nunca o login seguinte, que é exatamente onde a propriedade falha. A
propriedade foi testada onde ela vale.

**Falsificação do fix EXECUTADA** (gate frouxo restaurado por índice de linha): `Tests 3 failed | 9
passed (12)`. Morrem os três casos de limite; o quarto (`2 e 80 passam`) passa nos dois mundos de
propósito, como guarda contra apertar demais.

## DEF-B · a recusa não era única — fix `06ea10f8`

RN-414 promete uma resposta só para todos os "não". A promessa valia para o candidato do caminho feliz e
para mais ninguém.

Conta com papel conflitante (`platform_admin`, `tenant_staff`, `promoter`, `athlete` com
`demotedFromRole`) atravessava a validação de formato, **RESERVAVA o código** (`ativo → usado`) e só
morria no `provisionTenantCore` — cuja recusa chega ao cliente como `internal`. E `internal` só acontece
depois de um código VÁLIDO; o próprio `api-client` documentava isso como contrato.

**Medido no Emulator, com a MESMA conta:**

```
platform_admin   codigo vivo: internal   codigo morto: permission-denied
tenant_staff     codigo vivo: internal   codigo morto: permission-denied
```

Segundo estrago: cada tentativa dessas queimava e devolvia convite alheio, e a pessoa lia "Tente de novo
em instantes" — convite para repetir para sempre um pedido que nunca ia passar, gastando o teto da
RN-415 no caminho.

**Fix.** `contaElegivelParaResgate` lê a claim uma vez antes da transação; o veredito é aplicado DENTRO
dela, **depois do ramo de replay** (quem já resgatou é `tenant_owner`, inelegível por esta régua, e o
retry idempotente tem de continuar de pé) e **antes do CAS**. Recusa idêntica à do código morto, e o
convite não é sequer escrito. A leitura da claim é fail-OPEN: não autoriza nada — a guarda de verdade
segue sendo o `provisionTenantCore`.

**Falsificação do fix EXECUTADA:** `Tests 2 failed | 11 passed (13)`. O segundo caso só discrimina
porque afere o `updateTime` do convite — o estado FINAL sozinho não prova nada, a compensação já o
restaurava; o que muda é o convite nunca ter sido tocado.

## DEF-C · o véu do overlay bloqueante não existia — fix `37b9ec94`

Vetor 9, por código, sem navegador. O backdrop pedia `bg-[var(--surface-base)]/95 backdrop-blur`. O
Tailwind não compila a primeira metade: modificador de opacidade sobre valor arbitrário `var()` é
descartado no build.

**Medido no CSS do `vite build --mode leela-hub`, antes e depois:**

| | antes | depois |
|---|---|---|
| regra contendo `\/95` | **não existe** | não existe |
| `.bg-\[var\(--surface-base\)\]{` | existe, mas **não casa** (o token de classe do elemento é `bg-[var(--surface-base)]/95`) | idem |
| `.backdrop-blur{` | existe (DEFAULT do Tailwind) | — |
| `.bg-\[var\(--modal-overlay-bg\)\]{` | já no bundle | **aplicada** |

O blur pegava; a COR de fundo não. O overlay que se anuncia `role="dialog" aria-modal` e que a RN-416
chama de bloqueante ficava com véu **transparente** — a home seguia visível, desfocada, atrás dele —, e
o contraste do painel passava a depender do que estivesse por baixo (não fecha AA por estado, L-011).

Fix por REUSO: `--modal-overlay-bg` (rgba(0,0,0,.6)) e `--modal-overlay-blur` (4px) são os tokens do
backdrop do Modal do DS, e as duas classes já estavam no bundle (o `content` do Tailwind varre
`packages/design-system/src`). Custo em CSS: zero byte novo. O componente segue NÃO sendo um Modal do DS.

**Varredura do mesmo padrão em todo o repo:** zero outra ocorrência de `[var(--…)]/N` fora dos
comentários deste fix.

---

## Vetor a vetor — o que foi falsificado

### 1 · enumeração — FAIL ⇒ DEF-B

- Espaço de busca real: alfabeto `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (31 símbolos, sem `O I L 0 1`),
  8 posições ⇒ **31⁸ ≈ 8,53 × 10¹¹**. A regex de validação é derivada da constante do alfabeto, e a
  normalização remove só separadores (espaço, NBSP, travessões) — não amplia o conjunto aceito.
- Oráculo de TEMPO entre os quatro "não" (5 amostras cada, medianas em ms):
  `inexistente 89 · usado 74 · revogado 89 · expirado 89`. A diferença é ruído de emulator sobre ~85 ms;
  não é oráculo utilizável.
- Oráculo de ERRO: **encontrado** (DEF-B, acima), corrigido.
- Consumo em tentativa malformada: **confirmado** (premissa 5). Cinco `nao-e-codigo` seguidos e a sexta
  chamada, com código bem-formado, já volta `resource-exhausted`.

### 2 · corrida de uso único e compensação — PASS

| Cenário | Resultado medido |
|---|---|
| duas contas, MESMO código, simultâneo | `a: {tenantId: alfa-producoes, replay: false}` · `b: permission-denied` · 1 tenant · convite `usado` por `a` · `b` segue `athlete` |
| MESMA conta, DOIS códigos, simultâneo (mesma semente de slug) | `r1` vence · `r2: internal` e **seu código volta a `ativo`** · 1 tenant · nenhum código queimado a mais |
| falha DENTRO da tx do provisionamento (doc do profissional apontando outro tenant) | convite volta a `ativo`, `usadoPor`/`tenantId` apagados, **zero tenant**, claims intactas |

O resíduo que a compensação não cobre (compensação falhar depois da reserva) é logado como
`resgate_convite_compensacao_falhou` e exige runbook — está declarado no código e não foi engolido.

### 3 · bypass de rate-limit — PASS no que a RN-415 promete

| Ataque | Resultado medido |
|---|---|
| conta nova a cada 5 tentativas | 3 contas × 6 tentativas = 18; **15 chegaram ao convite**, 3 esgotadas, 3 baldes |
| 10 tentativas SIMULTÂNEAS com teto 5 (chaos) | **exatamente 5** admitidas, 5 `resource-exhausted`, balde com 5 marcos — a transação de janela deslizante não superadmite sob paralelismo |
| código malformado | consome o balde igual (premissa 5 confirmada) |
| reautenticação | o balde é por `uid` hasheado, não por sessão — reautenticar não zera |

**O que a RN-415 NÃO cobre e vira veto:** o teto é estritamente POR CONTA e o cadastro é aberto, então
o teto global de tentativas é `5 × (contas que o atacante criar)`. Quem segura força bruta é o espaço de
busca (31⁸), não o limitador. O `rateLimit.ts` já declara a escolha por escrito (sem balde por IP; o
throttle volumétrico é da borda — App Check / Cloud Armor). **Nenhuma das duas está ligada.**

### 4 · `autoCadastroUid` (o ponto mais quente) — PASS

Seis ataques executados contra o Emulator. **Nenhum promoveu ninguém.**

| Ataque | Resultado |
|---|---|
| `platform_admin` resgata | recusado · código volta a `ativo` · claims intactas · 0 tenant |
| `athlete` + `demotedFromRole` resgata | recusado · código volta · claims intactas · 0 tenant |
| `tenant_owner` de OUTRO tenant resgata | recusado · código volta · claims intactas |
| `tenant_staff` resgata | recusado · código volta · claims intactas |
| `autoCadastroUid` de TERCEIRO (chamada direta ao core, atacante passando o próprio uid com `ownerEmail` da vítima) | `failed-precondition` · claims da vítima intactas · `tenants/tenant-forjado` **não existe** |
| conta SEM doc de profissional resgata | sucesso · doc recriado · claims corretas |

A guarda é a igualdade `options.autoCadastroUid === ownerUid`, e `ownerUid` sai de
`getUserByEmail(input.ownerEmail)` — no resgate, o e-mail vem do token, não do cliente. Nenhum caminho de
admin passa `options` (o callable `provisionTenant` chama o core sem o 6º argumento — conferido).

**Assimetria registrada (não é defeito, é dívida de simetria):** o caminho `viaClaimRepair` ganhou, na
review L2 #29, um RE-CHECK da prova dentro da transação, porque a prova era lida fora dela. O
`viaAutoCadastro` lê a claim fora da transação e **não** tem re-check. A janela é estreita e o pior caso
é um `platform_admin` promovido a `tenant_owner` no instante exato em que ele mesmo resgata um convite —
com o DEF-B corrigido, esse caminho passa a ser recusado antes de chegar lá. Fica anotado para quem
mexer.

### 5 · premissa 1 (divergência da letra da RN-417) — **PREMISSA SUSTENTADA**

A RN-417 grafou `platform/config.contatoOnboarding`; a build pôs o contato em
`platform/configOnboarding`. Rules do Firestore não filtram CAMPO, então abrir `platform/config` para a
conta travada entregaria a tabela global de taxa junto.

- O teste de ataque citado na premissa **existe e passa**:
  `taxaFlexRules.integration.test.ts > Rules — platform/config (tabela GLOBAL) > read: platform_admin
  SIM; tenant_owner NÃO`.
- **Falsificação EXECUTADA:** `allow read` do bloco `platform/{doc=**}` trocado por `isSignedIn()`.
  Morrem **3 casos em 2 arquivos**, incluindo o de ataque acima e
  `a MESMA conta travada que lê o contato NÃO lê platform/config`. Os testes discriminam de verdade.
- Varredura de leitores de `platform/config` no cliente: só `taxaPlataforma.ts` e `TaxaGlobalRoute.tsx`,
  ambos anteriores e ambos de platform_admin. **Nenhum caminho novo lê `platform/config`.**
- O `hasOnly` do doc do contato segura campo extra e sub-campo extra (dois casos, verdes).

**Veredito: a premissa sustenta.** O que ela custa é uma linha de spec desalinhada, não uma decisão de
produto — a semântica (editável pelo admin sem deploy, fail-closed para o mailto padrão) é a que a
RN-417 pediu; muda o docId. Recomendação: reconciliar o texto da RN-417 para `platform/configOnboarding`.

### 6 · item 57 × RN-411 (a costura mais frágil) — FAIL ⇒ DEF-A, com resíduo em veto

Ciclo completo provado, passo a passo:

1. **Cadastro com a escrita de perfil falhando.** Antes do DEF-A isso era alcançável pelo formulário
   (nome de 1 letra, organização de 81 caracteres). Depois do fix, só por causas fora de shape (rede,
   quota, indisponibilidade).
2. **Login.** `lerSessaoPosLogin` lê a claim com refresh forçado (`athlete`, sem tenant) e então
   `getProfissional`. **Falsificação executada nas Rules:** conta `athlete` sem tenant LÊ o próprio doc
   inexistente — a leitura é PERMITIDA e devolve "não existe", não `permission-denied`. Ou seja
   `temPerfilProfissional: false` é um veredito de verdade, não um erro engolido.
3. **O que a pessoa vê:** `destinoPosLogin` devolve `barrar`; a `EntrarPage` chama `logout()` e mostra
   *"Esta conta não tem acesso ao painel do organizador."*
4. **Resgate:** inalcançável. O overlay vive dentro do `RootShell`, atrás do login.
5. **Recadastro:** inalcançável. `auth/email-already-in-use`.

**Existe caminho de recuperação?** No SERVIDOR, sim: o resgate recria o doc (medido — caso F). No
PRODUTO, não: a pessoa não chega ao resgate. A premissa 7 da build (*"o resgate recria o doc quando
falta"*) é verdadeira sobre a Function e **falsa como caminho de recuperação do usuário** em qualquer
sessão que não seja a imediatamente posterior ao cadastro.

O DEF-A fecha a causa que o próprio formulário produzia. O resíduo (falha de rede/quota) é veto — ver
abaixo.

### 7 · Rules do Firestore — PASS

| Promessa | Prova |
|---|---|
| `convitesOrganizador` sem delete para ninguém | **falsificação executada**: `allow delete: if isPlatformAdmin()` ⇒ morre `delete é negado até para platform_admin (auditoria de acesso)` |
| create de `profissionais/{uid}` só pelo próprio, com shape fechado | **falsificação executada**: `hasOnly` ampliado com `tenantId`/`papeis` ⇒ morrem `` `tenantId` é negado `` e `` `papeis` é negado `` |
| leitura da tela de convites só para quem deve | 7 casos de leitura (owner, staff, promoter, athlete, conta sem papel, anônimo negados; admin lê) |
| carimbo de `usado` é exclusivo da Function | caso `cliente NÃO marca usado` |

Suítes de Rules da lane, limpas: `convitesOrganizador` 25/25 · `autoCadastro` 17/17 · `contatoOnboarding`
13/13.

### 8 · LGPD — FAIL ⇒ VETO-DONO

- Versão carimbada: `TERMO_LGPD_VERSAO = '2026-07-28'` ✔, gravada junto com a finalidade e o instante.
- Instante: `serverTimestamp()`, e a Rule exige `is timestamp` (avalia `request.time`). Aceite datado
  pelo cliente é negado — caso verde.
- **Quando a escrita best-effort falha, o aceite se perde — e a conta segue.** Medido: conta sem doc
  resgata o convite e o doc nasce com

  ```
  campos: [atualizadoEm, criadoEm, email, id, nome, papeis, statusOnboarding, tenantId]
  statusOnboarding: "ativo"    consentimentoLgpd: null
  ```

  Organizador **ativo, operando, sem nenhum registro de consentimento** — e nada no produto sinaliza a
  ausência. Ver veto 2.

### 9 · conformidade de marca — FAIL ⇒ DEF-C

- Estilos hardcoded fora de token nas 5 superfícies novas (`/cadastrar`, `/plataforma/convites`,
  overlay, `ContaTravadaGate`, entrada na landing): **zero** valor arbitrário sem `var(--…)`, **zero**
  cor literal (`#…`, `rgb(`, `hsl(`).
- Componentes do DS: `Button`, `Checkbox`, `Input`, `Badge`, `PageHeader`, `Skeleton`, `Table`,
  `ConfirmModal`, `useToast` — nada recriado à mão.
- `apps/painel` lint (`no-hardcoded-tokens`) zero-warning; `tracking-tight` do overlay é utilitário de
  preset, não valor arbitrário, e emite CSS real (`letter-spacing:-.025em`).
- **Achado:** o véu do overlay (DEF-C) — classe que não compila. Corrigido.

### 10 · roteamento por papel (item 57 + `aa0e2183`) — PASS

| Caso | Destino |
|---|---|
| `platform_admin` sem origem | `/plataforma` |
| organizador com tenant | `/` (Visão Geral) |
| sem tenant COM doc (conta em onboarding, RN-411) | `/` — encontra o overlay |
| sem tenant SEM doc | barrado na tela de entrar, sessão cai |
| deep-link guardado | vence o default, inclusive para o super-admin |
| **admin + organizador (acesso único)** | `/plataforma` por precedência — **caso novo** (`d8d36697`) |
| **super-admin sem doc de profissional** | `/plataforma` — **caso novo**: a guarda de órfã lê `role !== 'platform_admin'` ANTES do doc, e nada travava essa ordem |

`/plataforma` não é escondida do admin: o `ContaTravadaGate` tem exceção explícita para
`platform_admin` (e para o estado `loading`), e o `PlataformaRoutes` segue montado dentro dele.

**Nota de modelo, para o dono:** `setTenantClaims` põe `platform_admin` em `ROLES_WITHOUT_TENANT` — a
claim **nunca** carrega papel de admin e `tenantId` ao mesmo tempo. Então "conta que acumula admin +
organizador" hoje significa, na prática, uma conta `platform_admin` cujo tenant só é alcançável pelas
Rules de admin (`isPlatformAdmin()`), não pelas de membro. A precedência é a única forma possível hoje;
o caso de teste novo trava a decisão para o dia em que o modelo mudar.

---

## Vetos ao dono

### 1 · LGPD — organizador ativo sem prova de aceite (jurídico)

Quando o doc do cadastro não é escrito, o resgate do convite recria o doc **sem `consentimentoLgpd`** e
com `statusOnboarding: 'ativo'`. A pessoa marcou o checkbox; o registro nunca existiu; e o produto não
tem como saber quais contas estão nessa situação.

Três caminhos, todos decisão do dono:

1. **Recoletar no resgate** — o overlay pede o aceite junto do código quando o doc falta. Mais honesto,
   custa uma linha na tela e um campo no input da callable.
2. **Recusar a ativação sem aceite** — o resgate falha com mensagem própria e manda falar com o time.
   Mais rígido; tranca gente legítima na porta.
3. **Marcar e varrer** — o doc recriado nasce com `consentimentoLgpd: null` explícito e um relatório
   lista quem está sem. Não resolve, mas para de esconder.

Não foi consertado por conta própria porque qualquer das três muda comportamento de produto, e
**inventar um carimbo de consentimento seria fabricar a prova** — exatamente o que a RN-412 recusa.

### 2 · o beco do item 57 continua aberto para falha que não seja de shape

O DEF-A fechou a causa que o formulário produzia. Se o `setDoc` falhar por rede, quota ou
indisponibilidade, a conta ainda nasce sem doc e o login seguinte a barra sem caminho de volta.

Duas saídas possíveis, ambas de produto:

- **Retry + estado honesto na tela do cadastro** (a pessoa vê que faltou algo e pode tentar de novo
  ANTES de sair) — contraria a premissa 7 da build, que escolheu best-effort silencioso de propósito;
- **A tela de entrar oferecer o campo de código quando barra** — transforma o aviso em porta, e é
  desenho de UX, não conserto.

Fica registrado que hoje a única recuperação é intervenção de `platform_admin`.

### 3 · rate-limit não é o que segura força bruta

O teto de 5/hora é POR CONTA e o cadastro é aberto: o teto global é `5 × contas criadas`. O que torna a
enumeração inviável é o espaço de busca (31⁸ ≈ 8,5 × 10¹¹), não o limitador. O `rateLimit.ts` já
argumenta por escrito que o throttle volumétrico é da BORDA — **e a borda não está ligada**. Decisão do
dono: ligar App Check no painel antes do go-live, ou aceitar o custo (cada tentativa é uma invocação de
Function + transação de Firestore, tudo faturado).

### 4 · escriturário, herdado da build

`leela-specs/01-produto/DECISOES-ABERTAS.md` ainda não fechou o item 57 (a lane DECISOES-CLEAN estava em
voo). O dono ratificou o desenho em 03/08 e o `aa0e2183` registrou a decisão no código; falta só marcar
o painel.

---

## Gate final

Em SÉRIE, nunca em paralelo com o emulator (regra da build, respeitada).

| Superfície | `tsc` | `eslint` | Suíte |
|---|---|---|---|
| `packages/core` | **0** | **0** | `tsup` exit 0 |
| `packages/api-client` | **0** | **0** | — |
| `packages/design-system` | **0** | **0** | — |
| `apps/painel` | **0** | **0** | **1822/1822** em 194 arquivos (era 1815 — +7 desta lane) |
| `apps/landing` | **0** | **0** | **449/449** em 41 arquivos |
| `functions` (emulator `@13`, Java 17) | **0** | **0** | **3471 passed · 81 skipped** em 201 arquivos |

Comando do emulator:
`npx firebase-tools@13 emulators:exec --only firestore,auth --project demo-leela "npx vitest run"`

**Uma suíte não roda neste comando — preexistente, não regressão.**
`storageRules.integration.test.ts` morre no `beforeAll` com `ECONNREFUSED 127.0.0.1:9199` (e `::1:9199`):
exige o emulator de **Storage**, que o `--only firestore,auth` não sobe. **71 casos SKIPPED, zero
asserções avaliadas.** `git diff d0b7cd49^..HEAD -- functions/src/__tests__/storageRules.integration.test.ts
storage.rules` é VAZIO — nem o arquivo nem as Rules de Storage foram tocados por esta trace. É a mesma
causa que a REV anterior desta trace já registrou.

Suítes da lane no emulator (`emulators:exec --only firestore,auth --project demo-leela`):

| Arquivo | Antes | Depois |
|---|---|---|
| `resgateConvite.integration` | 11 | **13** (+2, DEF-B) |
| `convitesOrganizadorRules.integration` | 25 | 25 |
| `autoCadastroOrganizadorRules.integration` | 17 | 17 |
| `contatoOnboardingRules.integration` | 13 | 13 |
| `conviteOrganizadorCore` + `cadastroOrganizadorCore` + `contatoOnboardingCore` | 40 | 40 |
| **total das 8 suítes da lane** | 117 | **119** |

Movimento no painel: `CadastrarPage` 8 → **12**; `destinoPosLogin` 9 → **11**; `OverlayConvite` 8 → **9**.
Suíte `conta/auth` 47 → **53**.

## Commits desta lane

| Hash | O que é |
|---|---|
| `52f27f76` | fix DEF-A — gate do `/cadastrar` = gate da Rule (via `validarCadastroOrganizador`) + 4 casos |
| `06ea10f8` | fix DEF-B — recusa única para papel conflitante, sem tocar no convite + 2 casos |
| `d8d36697` | prova do vetor 10 — a decisão de acesso único do dono vira caso + 2 casos |
| `37b9ec94` | fix DEF-C — véu do overlay pelos tokens de overlay do DS + 1 caso |

Zero deploy. Nenhum arquivo das lanes de docs/dados em voo foi tocado (`git commit --only` por caminho
em todos os quatro).

## Falsificações executadas — índice

Toda falsificação multi-linha foi aplicada por ÍNDICE DE LINHA, com o conteúdo impresso antes da troca
(lição CRLF da REV anterior desta trace).

| Alvo | Falsificação | Resultado |
|---|---|---|
| gate do `/cadastrar` | régua ad-hoc restaurada | 3 failed \| 9 passed (12) |
| guarda de elegibilidade do resgate | `if (!elegivel) throw` removido | 2 failed \| 11 passed (13) |
| véu do overlay | classe antiga aferida no caso | 2 asserções morrem |
| `platform/{doc=**}` | `allow read: if isSignedIn()` | 3 failed em 2 arquivos |
| `convitesOrganizador` | `allow delete: if isPlatformAdmin()` | 1 failed |
| `shapeAutoCadastroValido` | `hasOnly` ampliado | 2 failed |
| `firestore.rules` | restaurado e conferido | `git diff` vazio |
