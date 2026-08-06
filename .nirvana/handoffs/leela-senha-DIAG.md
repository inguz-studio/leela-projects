# DIAG-SENHA — o "esqueci minha senha" que morria em produção

- **Lane:** DIAG-SENHA · **Trace:** `leela-pixreal-diag-20260804`
- **Employee:** sf-backend-lead (software-forge)
- **Território:** `functions/` (a lane de spec fica com `leela-specs/`)
- **Base:** `main` em `846ce8ee`
- **Data:** 2026-08-06

---

## 1. A causa-raiz, com a prova

A proteção de enumeração de e-mail do Firebase Auth está **LIGADA** no
`leela-hub`, e o Admin SDK não sabe traduzir o desfecho que ela produz.

### O que a produção respondeu

Config real do projeto (Identity Platform Admin API, leitura de hoje):

```json
"subtype": "IDENTITY_PLATFORM",
"emailPrivacyConfig": { "enableImprovedEmailPrivacy": true },
"authorizedDomains": ["localhost", "leela-hub.firebaseapp.com",
  "leela-hub.web.app", "leela-hub--preview-y4n0cxzj.web.app",
  "leela-landing.web.app"]
```

Com essa proteção ligada, o Identity Toolkit parou de devolver `EMAIL_NOT_FOUND`
para endereço sem conta. Probe executado hoje contra produção, com endereço em
TLD reservado (`.invalid`, sem conta possível, nenhum e-mail sai porque
`returnOobLink` suprime o envio):

```
POST identitytoolkit.googleapis.com/v1/projects/leela-hub/accounts:sendOobCode
  { requestType: PASSWORD_RESET, returnOobLink: true, continueUrl: ... }
HTTP 200
{ "kind": "identitytoolkit#GetOobConfirmationCodeResponse",
  "email": "diag-senha-20260806@leela-diagnostico.invalid" }
```

**200, sem `oobLink`.** O `firebase-admin` tem um validador de resposta que só
conhece dois mundos (`auth-api-request.js`):

```js
.setResponseValidator((response) => {
  if (!response.oobLink) {
    throw new FirebaseAuthError(AuthClientErrorCode.INTERNAL_ERROR,
      'INTERNAL ASSERT FAILED: Unable to create the email action link');
  }
```

Esse erro sai com `code = 'auth/internal-error'` (verificado no
`node_modules`, não de memória). É exatamente a linha da produção:

```
2026-08-05T11:43:11.901270Z E  {"message":"Error: reset_senha_falhou ...",
  "err":"INTERNAL ASSERT FAILED: Unable to create the email action link"}
2026-08-05T11:43:11.901681Z I  {"desfecho":"falha_envio","message":"reset_senha"}
```

O ramo que o repositório escreveu para "conta não existe" só reconhecia
`auth/user-not-found` e `auth/email-not-found`. Ele virou **código morto** no dia
em que a proteção foi ligada, e "endereço desconhecido" passou a viajar como
exceção de infra.

### Controle positivo (custo zero, tirado da própria produção)

`pedidos/ped-wNXRTvMM…-chk-ed77a161` carrega
`contaSemFriccao.emailStatus: "enviado"`, `contaCriada: true`,
`processadoEm: 2026-08-04T19:00:01.971Z`. Ou seja: **a MESMA chamada do Admin
SDK funcionou em produção**, com `actionCodeSettings` apontando para
`https://leela-landing.web.app/definir-senha`, para uma conta recém-criada e
**sem senha**. Isso mata três hipóteses de uma vez:

| Hipótese | Veredicto | Prova |
|---|---|---|
| `continueUrl` fora dos domínios autorizados | **DESCARTADA** | os dois domínios que o código consegue produzir (`leela-hub.web.app`, `leela-landing.web.app`) estão na allowlist; e o link foi gerado com sucesso em 04/08 com um deles. Além disso o código já degradava para link sem `continueUrl` nesse erro |
| Segredo/env ausente no runtime | **DESCARTADA** | `BREVO_API_KEY` está bindada na função (audit log do deploy) e o e-mail de 04/08 SAIU; `secretsBinding.contract` verde (23/23) |
| Quota/rate do Identity Toolkit | **DESCARTADA** | quota devolve `RESOURCE_EXHAUSTED`/429, não 200 sem `oobLink`; e o probe de hoje reproduz o 200 com o projeto ocioso |
| Conta desabilitada | **DESCARTADA** | nenhuma das 19 contas do projeto está `disabled` |
| Interação com a DEPLOY-EMAIL de 04/08 | **DESCARTADA** | aquela lane trocou o `continueUrl`; o defeito é anterior a qualquer valor de `continueUrl` — ele acontece antes, na classificação do erro |
| **Proteção de enumeração + Admin SDK sem tradução** | **CONFIRMADA** | probe 200-sem-`oobLink` + config + controle positivo |

---

## 2. Quem foi afetado

Um pedido, não autenticado, às **2026-08-05T11:43:05.465Z** (`auth: MISSING`,
`app: MISSING` — o normal para "esqueci minha senha").

O log não carrega PII por desenho (LGPD). O que carrega evidência é o balde do
rate limit. Em produção existe **exatamente um**:

```
rateLimits/reset-senha:74a43f5a2491b706609180d3059d0b4269b25d85
  atualizadoEm = 2026-08-05T11:43:05.604Z   marcos = 1
```

`marcos = 1` ⇒ **uma única tentativa**, ninguém insistiu. A chave é
`sha256(email)[0:40]`, então dá para testar candidatos sem nunca ter o endereço.
Testados e **sem casar**:

- as 19 contas do Firebase Auth (`auth:export`);
- todos os e-mails de `pedidos`, `carrinhos`, `pessoas`, `tenants`;
- `vitoreldp@gmail.com` e `inguzbuilders@gmail.com`;
- variantes de digitação (domínios trocados, `gmail.con`, sem pontos) dos
  endereços conhecidos.

**Conclusão: o endereço digitado não tem conta na Leela e nunca comprou.** Não
foi um comprador real perdendo acesso, e não foi o dono num endereço que ele
usa. Foi alguém — provavelmente o próprio dono testando com um endereço
inventado, ou um curioso na landing — pedindo senha para um endereço
desconhecido.

**A urgência é menor do que o log sugeria, mas o defeito não é menor:** com a
proteção ligada, **todo** pedido de senha para endereço sem conta cai nesse
caminho. Enquanto isso, quem TEM conta continuava sendo atendido normalmente —
por isso não houve avalanche de reclamação.

---

## 3. O que consertei

Tudo em `functions/`. Nenhuma alteração em produção.

### `functions/src/auth/linkDeAcao.ts`
Ganhou a classificação do erro do Auth, no módulo que já é o ponto único de
decisão dos links de ação:

- `MSG_SEM_OOB_LINK` — a frase do SDK, copiada da fonte;
- `classificarFalhaDeLink(err) → 'sem_conta' | 'continue_uri_recusada' | 'desconhecida'`.

`sem_conta` exige o **par** `auth/internal-error` + a frase. Só o código não
basta: ele é o genérico do SDK e cobre infra de verdade, que precisa continuar
subindo em vez de virar um "conta não existe" silencioso.

### `functions/src/auth/solicitarRedefinicaoSenha.ts`
1. O adapter usa a classificação nova ⇒ endereço sem conta volta a `null` ⇒
   desfecho `conta_inexistente`, resposta neutra, Brevo não é gasta.
2. O adapter ganhou uma **costura** (`AuthSdkDeLinkSenha`, default = SDK real):
   a tradução de erro é onde o defeito morava e não tinha um único teste, porque
   `admin.auth()` é global. Produção não enxerga diferença.
3. Desfecho novo **`erro_inesperado`**. O wrapper inicializava a variável em
   `falha_envio`, então qualquer exceção antes da Brevo saía acusando o
   provedor — foi por isso que o log de 05/08 mandou caçar a chave errada.
4. Os dois `logger.error` viraram `registrarIncidenteEmail`, com os nomes de
   evento preservados (`reset_senha_email_falhou`, `reset_senha_falhou`).

### `functions/src/email/incidenteEmail.ts`
Novo tipo `'redefinir_senha'` na doutrina.

### `functions/src/auth/solicitarCodigoDeAcesso.ts`
Só comentário: o cabeçalho afirmava que `generatePasswordResetLink` devolve
`null` para conta inexistente. Não devolve — quem devolve é o adapter. A frase
era carga de raciocínio para quem for mexer no piso de tempo.

### `functions/src/__tests__/redefinirSenhaProprio.test.ts`
S8/S9/S10, no molde do `expurgoIncidente.test.ts` (que fixa o erro REAL da
produção). Cobrem: a frase exata do assert lida como `sem_conta`; os dialetos
antigos preservados; `auth/internal-error` sozinho **não** virando `sem_conta`;
o adapter devolvendo `null` em vez de lançar; a degradação de `continueUrl`
recusada, inclusive quando ela esbarra na proteção; `erro_inesperado` separado de
`falha_envio`; e o payload de incidente com `alerta`/`severidade`/`tipo` e sem PII.

---

## 4. Observabilidade: por que ninguém soube — e ainda não saberia

A doutrina de hoje (`incidenteEmail.ts`, campo `alerta`) **não estava aplicada**
neste arquivo: os dois `logger.error` eram crus. Agora estão.

Mas a resposta honesta à pergunta "por que passou despercebido" é maior que isso.
Consulta de hoje ao projeto `leela-hub`:

| Superfície | Estado |
|---|---|
| `monitoring.googleapis.com/v3/.../alertPolicies` | **`{}` — zero políticas** |
| `logging.googleapis.com/v2/.../metrics` (log-based) | **`{}` — zero métricas** |
| `monitoring.googleapis.com/v3/.../notificationChannels` | **`{}` — zero canais** |

O gancho existe no código e o formato está estável, exatamente como o
`incidenteEmail.ts` promete. **Do outro lado do gancho não há nada.** Mesmo com
o conserto de hoje, uma falha nova continuaria invisível até alguém abrir o log.
Criar a política é custo de infra recorrente — decisão do CTO humano, como a
própria doutrina registra, e por isso não fiz.

---

## 5. Os irmãos — todo caminho que cria link de ação

| # | Arquivo:linha | Caminho | Conta existe? | Classificação corrigida | Incidente |
|---|---|---|---|---|---|
| 1 | `functions/src/auth/solicitarRedefinicaoSenha.ts:136-137` | esqueci minha senha | **não garantido** — é o ponto do defeito | ✅ agora | ✅ agora |
| 2 | `functions/src/checkout/contaSemFriccao.ts:163` (via `entregarEmailContaCriada:192`), chamado em `contaSemFriccao.ts:375` | 1º acesso do comprador | **sim, por construção** (linha 274-281 resolve ou cria a conta imediatamente antes) | não precisa | ✅ já tinha (`conta_sem_friccao_email_falhou`) |
| 3 | mesmo helper, chamado em `checkout/reenviarEmailsPedido.ts:678` | reenvio administrativo | **sim** — gateia por `contaCriada === true` | não precisa | ✅ já tinha (`reenvio_conta_falhou`) |

Não existe `generateEmailVerificationLink`, `generateSignInWithEmailLink` nem
`generateVerifyAndChangeEmailLink` em lugar nenhum de `functions/src`. O convite
de clube e o de assessoria usam token próprio, não link do Auth. O código de
acesso (`solicitarCodigoDeAcesso`) é código numérico, não link, e já registra
incidente.

**Irmão fora do meu território, verificado e SÃO:** o fallback do cliente em
`packages/api-client/src/auth.ts:291` usa `sendPasswordResetEmail` do SDK web.
Sob proteção de enumeração o SDK **web** resolve normalmente para endereço
desconhecido (é o comportamento que a proteção existe para dar), então esse
caminho não tem o defeito — ele é protegido pela plataforma, não pelo nosso
código. Nada a fazer.

**`getUserByEmail` não foi afetado**, e isso importa porque o checkout depende
dele (`contaSemFriccao.ts:107-113`). Probe de hoje: `accounts:lookup` para
endereço inexistente devolve `200 {kind}` vazio, e o SDK converte em
`auth/user-not-found` como sempre. O fluxo de conta sem fricção está intacto.

---

## 6. Devolvido para o maestro sequenciar

1. **Deploy** de `solicitarRedefinicaoSenha` (bundle único — a lane de deploy
   decide o recorte). Sem isso o conserto não existe para o usuário.
2. ⛔ **NÃO desligar `enableImprovedEmailPrivacy`.** É a saída "fácil" (restaura
   o `auth/user-not-found` e o código antigo voltaria a funcionar) e é a errada:
   ela protege os fluxos do SDK **web** contra enumeração de base de clientes. O
   conserto certo é o SDK do servidor entender o desfecho novo, que é o que foi
   feito.
3. **Nenhum ajuste de configuração de produção é necessário.** Os domínios
   autorizados estão corretos, o secret está bindado, o IAM está certo. Não há
   nada para você executar no console.
4. **Decisão do dono/CTO:** a política de alerta no Cloud Logging
   (`jsonPayload.alerta="email_transacional_falhou"`) + um canal de notificação.
   Hoje o projeto tem zero. Enquanto não existir, "aplicamos a doutrina" quer
   dizer "o log está pronto para ser casado", não "alguém é avisado".

---

## 7. O que os testes NÃO provam

- **O emulador não reproduz a proteção de enumeração.** Ela é config do projeto
  de produção (`emailPrivacyConfig`), o Auth Emulator não a implementa. Os testes
  provam que o CÓDIGO traduz corretamente o erro que a produção emite — o erro
  está fixado na suíte com o `code` e a frase exatos. Quem prova que a produção
  emite aquele erro é o probe da seção 1, não o teste.
- **Nada aqui prova o deploy.** O conserto só vale depois que o bundle subir.
- **Se o `firebase-admin` mudar a frase do assert**, o ramo `sem_conta` volta a
  ser inalcançável e o sintoma de 05/08 volta. O teste quebra junto, e é esse o
  aviso. Não há como o SDK sinalizar isso de outro jeito: a frase é a única
  evidência que ele entrega.
- **Resíduo de tempo, PRÉ-EXISTENTE, não introduzido aqui:** o piso é 1200 ms e
  o caminho da conta que existe paga Auth + `getUserByEmail` + Brevo, que pode
  passar disso em produção. Quando passa, o piso deixa de igualar os dois
  caminhos e o relógio volta a ser um oráculo fraco. O teste S3 prova a igualdade
  **abaixo** do piso, com dublês. Medir a p50 real e recalibrar
  `PISO_RESPOSTA_MS` é trabalho de outra lane — anotado, não feito.
- **Não sei o endereço de quem pediu.** Provei que ele não está em nenhuma das
  bases (seção 2), o que é o suficiente para a decisão; identificá-lo exigiria
  quebrar o hash ou guardar PII no log, e nenhuma das duas coisas deve acontecer.

---

## 8. Gates

| Gate | Resultado |
|---|---|
| `npm run build` (tsc) | ✅ exit 0 |
| `tsc --noEmit` | ✅ exit 0 |
| `eslint src --max-warnings 0` | ✅ exit 0 |
| `secretsBinding.contract` (obrigatório) | ✅ **23/23** |
| `redefinirSenhaProprio` (arquivo alterado) | ✅ **38/38** |
| `linkSenhaPorOrigem` · `linkDosEmails.contract` · `basePublicaEmailLink` | ✅ 3 arquivos, 3 passed |
| `emailIncidente.integration` · `revContasMotor.antagonista` · `codigoAcessoTemplate` | ✅ 3 arquivos, 3 passed |
| `contaAdminSemVinculo.integration` · `contaCriadaTemplate` | ✅ 2 arquivos, 2 passed |

Emulador próprio da lane, IPv4 explícito, hub e logging reservados:
`firebase.diagsenha.json` — firestore **8290**, auth **9290**, hub **4290**,
logging **4390** (as quatro conferidas livres antes de subir).

```bash
cd functions
export JAVA_HOME="$HOME/.jdks/jdk-21.0.11+10"; export PATH="$JAVA_HOME/bin:$PATH"
export LEELA_FS_EMU_PORT=8290 LEELA_AUTH_EMU_PORT=9290
export FIRESTORE_EMULATOR_HOST=127.0.0.1:8290
npx firebase-tools@13 emulators:exec --config ../firebase.diagsenha.json \
  --project demo-leela "npx vitest run src/__tests__/<arquivo>.test.ts"
```

Arquivo a arquivo, nunca a suíte completa. As duas variáveis exportadas — só a
`LEELA_FS_EMU_PORT` impede o verde falso de suíte *skipped* com exit 0.

## 9. Toques em produção nesta lane

Só leitura, mais um probe sem efeito. Nada foi alterado:

- `GET` da config do Identity Platform, dos domínios autorizados, das políticas
  de alerta, das métricas e dos canais de notificação;
- `GET` de `rateLimits`, `pedidos`, `carrinhos`, `pessoas`, `tenants` e dos
  collection-groups, via Firestore REST;
- `firebase auth:export` para o scratchpad (fora do repositório), usado só para
  o casamento de hash e apagado depois;
- **um** `POST accounts:sendOobCode` para
  `diag-senha-20260806@leela-diagnostico.invalid` — TLD reservado, conta
  impossível, `returnOobLink: true` suprime envio. Não criou dado, não mandou
  e-mail, não mexeu em config.
