# REV-SENHA — review antagonista do conserto do "esqueci minha senha"

- **Lane:** REV-SENHA · **Trace:** `leela-pixreal-diag-20260804`
- **Employee:** sf-qa-engineer (software-forge) — antagonista, contexto fresco
- **Sob review:** `cb5922a7` (lane DIAG-SENHA, sf-backend-lead)
- **Território:** `functions/` · **Base:** `main` em `cb5922a7`
- **Fix-commit desta review:** `883c70f3`
- **Data:** 2026-08-06

---

## 1. Veredito

**A causa-raiz está certa e foi reproduzida de forma independente.** O conserto
resolve a CLASSE, não o caso: o par código+frase não engole nenhum dos vetores
legítimos que testei, incluindo o mais perigoso (conta que existe e não tem
senha). O `getUserByEmail` do checkout está intacto, e os três caminhos que
criam link de ação são mesmo três.

**Um defeito ALTO no aparato de prova**, e é justamente a garantia que o commit
vende: o `Directive:` afirma que "se o SDK mudar o texto, o teste quebra junto".
Não quebrava. Consertado aqui, com a prova executável.

**É SEGURO DEPLOYAR** — com uma condição operacional, na seção 6.

---

## 2. Vetor → resultado

Probes 1-5 e 11-12 rodaram pelo Admin SDK REAL (`firebase-admin@13.10.0`)
contra `leela-hub`, com ADC derivado do `firebase-tools` logado. A coluna da
classificação roda a função sob review no erro que a produção devolveu.

| # | Vetor | Como | Observado | `classificarFalhaDeLink` | Veredito |
|---|---|---|---|---|---|
| V1 | Endereço em TLD reservado (`.invalid`) | SDK real vs. produção | `auth/internal-error` · `INTERNAL ASSERT FAILED: Unable to create the email action link` | `sem_conta` | **causa confirmada** |
| V2 | Endereço válido inexistente em domínio REAL (`gmail.com`) | idem | erro idêntico ao V1 | `sem_conta` | confirmado — não é artefato do TLD reservado |
| V3 | Conta EXISTE, **com** senha (`marina@demo-leela.dev`) | idem | link gerado | n/a | não engole |
| V4 | Conta EXISTE, **sem** senha (`vitoreldp@gmail.com`, uid `Qbql…`) | idem | link gerado | n/a | **não engole** — mata a hipótese mais cara |
| V5 | Conta EXISTE, com senha (2º caso, `felipe@demo-leela.dev`) | idem | link gerado | n/a | não engole |
| V6 | Conta **DESABILITADA** | ⛔ não falsificável em produção (exigiria escrita); rodado no emulador | emulador **gera o link normalmente**, sem erro | n/a | **INCONCLUSIVO em produção** — ver §5 |
| V7 | Rede caída | `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9` | `app/network-error` · `ECONNREFUSED` | `desconhecida` | **não engole** |
| V8 | IAM / projeto sem permissão | `projectId` inexistente, mesma credencial | `auth/project-not-found` | `desconhecida` | **não engole** |
| V9 | Quota | estático: `AUTH_SERVER_TO_CLIENT_CODE` do SDK | `QUOTA_EXCEEDED → auth/quota-exceeded`; `PERMISSION_DENIED → auth/insufficient-permission`; `USER_DISABLED → auth/user-disabled` | `desconhecida` | não engole (não induzida) |
| V10 | Erro de servidor NÃO mapeado | estático: `FirebaseAuthError.fromServerError` | vira `auth/internal-error` com ` Raw server response: "…"` anexado | `desconhecida` | não engole — a frase do assert é string do CLIENTE, o servidor nunca a produz |
| V11 | `getUserByEmail` para endereço inexistente | SDK real vs. produção | `auth/user-not-found` — o dialeto clássico, **intacto** | — | **checkout preservado** |
| V12 | `getUserByEmail` para endereço existente | idem | uid devolvido | — | ok |
| V13 | **Frase do SDK trocada** (simula upgrade) | patch em `node_modules/firebase-admin/lib/auth/auth-api-request.js` + probe em produção | probe: `desconhecida` (sintoma de 05/08 de volta) · suíte: **38/38 VERDE** | `desconhecida` | **DEFEITO ALTO — D1** |
| V14 | V13 com o teste desta review | idem | **38 passed / 1 failed** — e a que falha é o detector | — | detector funciona |
| V15 | Quem foi afetado (hash do balde) | 144 candidatos independentes | **sem casamento** | — | conclusão do construtor confirmada |
| V16 | Os irmãos | varredura de `functions/src` | 2 call sites de `generatePasswordResetLink`, 3 caminhos; zero `generateEmailVerificationLink` / `generateSignInWithEmailLink` / `generateVerifyAndChangeEmailLink` | — | confirmado |

### V15 em detalhe — a afirmação de quem foi afetado

Refiz por amostragem independente, sem olhar a lista do construtor. Um único
balde em produção:

```
rateLimits/reset-senha:74a43f5a2491b706609180d3059d0b4269b25d85
  atualizadoEm = 2026-08-05T11:43:05.604Z
  marcos = [1785930185604]      ← UM carimbo, ninguém insistiu
```

Candidatos testados com `sha256(email.trim().toLowerCase())[0:40]`: 144 —
todos os e-mails de `accounts:batchGet` (19 contas), todos os endereços
encontrados em `pedidos`, `carrinhos`, `pessoas`, `tenants`, `inscritos`,
`comunicacoes` mais três collection-groups, os dois endereços do dono, e
variantes de digitação geradas por domínio (`gmail.con`, `gmail.co`,
`gmai.com`, `gmial.com`, `hotmail`, `outlook`, `yahoo.com.br`) e por remoção
de pontos do local-part. **Zero casamentos.** A conclusão do construtor se
sustenta: o endereço não tem conta e não está em nenhuma base.

**E ela não muda nada no conserto** — que é o teste que importa. O conserto foi
calibrado pela CLASSE (todo endereço sem conta cai no mesmo caminho, provado
por V1 e V2, e V2 é um endereço de domínio real que não tem nada a ver com o
incidente), não pelo caso.

---

## 3. Defeitos

### D1 · ALTO · o detector de regressão prometido não existia
**Corrigido nesta review — `883c70f3`.**

O commit `cb5922a7` fecha com dois compromissos explícitos:

> `Directive:` … Se o SDK mudar o texto, o ramo fica inalcançável e o sintoma de
> 05/08 volta — **o teste fixa a frase e quebra junto**
>
> §7 do handoff DIAG: … O teste quebra junto, **e é esse o aviso**.

As duas pontas da asserção eram do repositório. O dublê
`erroDaProtecaoDeEnumeracao()` monta a mensagem de um literal escrito no
próprio arquivo de teste; `MSG_SEM_OOB_LINK` mora no nosso `linkDeAcao.ts`. A
linha `expect(erroDaProtecaoDeEnumeracao().message).toContain(MSG_SEM_OOB_LINK)`
compara o repositório com ele mesmo. **Nenhum teste da suíte lia o
`firebase-admin` instalado.**

Prova executada (mutação + probe, com o `node_modules` já mutado):

```
suíte com a frase trocada no SDK ....... 38/38 VERDE
probe em produção, mesmo node_modules .. classificarFalhaDeLink => 'desconhecida'
                                          (= o sintoma de 05/08 de volta)
```

Com o teste do fix-commit, a mesma mutação dá **38 passed / 1 failed**, e a que
falha é `S8 › a frase NÃO é só nossa — ela existe no firebase-admin instalado`.
O teste resolve o entry point do pacote (o subpath `lib/…` não é exportado) e
lê `lib/auth/*.js`; a asserção é sobre o booleano, não sobre o fonte, para a
linha vermelha dizer qual frase sumiu em vez de despejar 1 MB de SDK.

**Sobre o discriminante em si — o julgamento que a lane pediu.** Existe um
melhor: chamar `accounts:sendOobCode` direto e tratar `HTTP 200 sem oobLink`
como `sem_conta`, sem depender de string nenhuma. Custa reimplementar auth,
retry e versionamento de endpoint que hoje o SDK dá de graça, e é escopo de
outra lane. **Enquanto ele não existir, o par código+frase é aceitável — mas só
com o detector que agora existe.** Sem ele, o acoplamento era invisível.

### D2 · MÉDIO · a versão do SDK que sobe não é a que a suíte testa
**Não corrigido — é decisão de política de dependência, não do antagonista.**

`functions/package.json` declara `firebase-admin: "^13.4.0"` (intervalo).
`functions/scripts/bundle-deploy.mjs` marca o pacote como `external` do bundle
esbuild e **copia o intervalo** para o `package.json` do artefato, resolvendo
com `npm install` (linhas 84-92 e 131-136). A suíte local roda pelo
`pnpm-lock.yaml` (13.10.0); o artefato de deploy resolve por conta própria a
cada `bundle-deploy`.

Isso muda a natureza do risco que a lane descreveu. Não é "se algum dia alguém
atualizar o SDK": é **a cada deploy**. Hoje o `functions-deploy/package-lock.json`
gerado está em 13.10.0 e é enviado junto, então o próximo deploy sobe o que foi
testado — mas o lock é regenerado por `npm install` toda vez.

**Remediação sugerida:** travar `firebase-admin` na versão exata em
`functions/package.json` (`13.10.0`), o que torna D1 redundante e alinha os dois
mundos. Uma linha, escopo estreito, e o detector de D1 vira a rede de
segurança de quem for subir a versão de propósito.

### D3 · MÉDIO-BAIXO · o rótulo do ALERTA ainda mente
**Não corrigido — mexe na doutrina compartilhada de `incidenteEmail.ts`.**

O commit conserta o rótulo do `desfecho` (`falha_envio` → `erro_inesperado`,
defeito nº 2 dele) e no mesmo movimento reintroduz o mesmo defeito um andar
acima. `montarIncidenteEmail` fixa `canal: 'email'` e
`alerta: 'email_transacional_falhou'`. O `catch` externo de
`solicitarRedefinicaoComTempoConstante` chama `registrarIncidenteEmail` para
QUALQUER exceção — inclusive quota do Auth, IAM ou rede, que acontecem **antes
de existir e-mail**. Quem responder ao alerta vai olhar a Brevo, exatamente a
caça errada que custou o diagnóstico de 05/08.

Hoje o dano é zero: o projeto tem **zero políticas de alerta, zero métricas e
zero canais** (confirmei junto com o construtor). Vira misdireção no dia em que
a política existir — que é o item que ele mesmo devolveu para o CTO humano. O
nome do evento (`reset_senha_falhou`) está certo e é o que salva.

### D4 · BAIXO · o runbook não acompanha o enum
`leela-specs/04-engenharia/runbook-email-transacional.md:22` lista `tipo` com
quatro valores (`ingressos`, `conta_sem_friccao`, `reenvio_ingressos`,
`reenvio_conta`). O código tem seis: `codigo_de_acesso` entrou na
REV-CONTAS-MOTOR e `redefinir_senha` entra agora. Território da lane de specs —
**não toquei**, fica devolvido.

### D5 · INFO · o fallback web nunca vai resgatar esta classe
`packages/api-client/src/auth.ts:270-291` cai em `sendPasswordResetEmail` (SDK
web) quando a callable LANÇA com código `internal`/`unavailable`/`not-found`/
`deadline-exceeded`. A callable **nunca lança** — responde `{ ok: true }` sempre,
por desenho anti-enumeração. Logo o fallback não rodou em 05/08 e não roda nesta
classe. É propriedade deliberada, não defeito; registro porque a leitura fácil
("tem fallback, então tem rede de proteção") é falsa, e o único controle
compensatório real é o incidente + a política de alerta que ainda não existe.

### Sobre a afirmação dos irmãos — confirmada
Varredura de `functions/src`: dois call sites de `generatePasswordResetLink`
(`solicitarRedefinicaoSenha.ts:136-137` e `contaSemFriccao.ts:163`), o segundo
alcançado por dois chamadores (`contaSemFriccao.ts` e
`reenviarEmailsPedido.ts`) = os três caminhos declarados. Nenhum outro
`generate*Link` em lugar nenhum. V4 é o que sustenta a proteção dos irmãos 2 e
3: a conta recém-criada **não tem senha**, e mesmo assim a produção gera o link
hoje — então o "existe por construção" deles vale de fato, não por sorte.

---

## 4. Gates

| Gate | Resultado |
|---|---|
| `npm run build` (tsc) | ✅ exit 0 |
| `npx tsc --noEmit` | ✅ exit 0 |
| `eslint src --max-warnings 0` | ✅ exit 0 |
| `redefinirSenhaProprio` | ✅ **39/39** (38 do construtor + o detector) |
| `secretsBinding.contract` | ✅ **23/23** |
| Suíte completa de functions | ⛔ NÃO rodada, por instrução |

Emulador próprio da review, IPv4 explícito, portas conferidas livres antes de
subir: `firebase.revsenha.json` — firestore **8291**, auth **9291**, hub
**4291**, logging **4391** (o construtor usou 8290/9290/4290/4390; sem colisão).

```bash
cd functions
export JAVA_HOME="$HOME/.jdks/jdk-21.0.11+10"; export PATH="$JAVA_HOME/bin:$PATH"
export LEELA_FS_EMU_PORT=8291 LEELA_AUTH_EMU_PORT=9291
export FIRESTORE_EMULATOR_HOST=127.0.0.1:8291
npx firebase-tools@13 emulators:exec --config ../firebase.revsenha.json \
  --project demo-leela "npx vitest run src/__tests__/<arquivo>.test.ts"
```

---

## 5. O que os testes NÃO provam

- **O emulador não implementa a proteção de enumeração** — confirmado por
  medição, não por leitura: no emulador, endereço sem conta devolve
  `auth/email-not-found`, o dialeto ANTIGO. A suíte prova a TRADUÇÃO do erro;
  quem prova que a produção emite o assert é o probe (V1/V2).
- **Conta desabilitada sob a proteção: não sei.** Desabilitar uma conta é
  escrita em produção, proibida nesta lane, e nenhuma das 19 contas está
  desabilitada. No emulador (sem a proteção) o link é gerado normalmente, e a
  documentação do Identity Platform lista a supressão de erro para sign-in
  (`INVALID_LOGIN_CREDENTIALS`) e `sendOobCode`, sem citar `USER_DISABLED`. A
  leitura mais provável é que conta desabilitada gere link (não caia em
  `sem_conta`), mas **é inferência, não medição**. Se um dia alguém desabilitar
  uma conta, este é o vetor a re-testar.
- **Quota real do Identity Toolkit não foi induzida** — falsifiquei pelo mapa
  estático do SDK, que é forte (`QUOTA_EXCEEDED` tem código próprio) mas não é
  o mesmo que ver acontecer.
- **Nada aqui prova o deploy**, e por D2 a versão do `firebase-admin` que sobe é
  re-resolvida no `bundle-deploy`.
- **LGPD:** o teste S10 prova que o payload do incidente não ACRESCENTA PII. Não
  prova que `err.message` de terceiro (Brevo) nunca a carregue — a asserção usa
  um dublê cuja mensagem o próprio teste escreveu. Comportamento igual ao de
  antes do commit; não é regressão, é limite da prova.
- **O piso de 1200 ms vs. latência real** continua não medido, como o construtor
  declarou. Confirmo que esta lane não mediu.

---

## 6. Para o maestro sequenciar

1. **Deploy liberado.** O conserto é correto na classe e nenhum vetor legítimo
   testado cai em `sem_conta`. Condição operacional única: rodar `bundle-deploy`
   e **conferir que `functions-deploy/package-lock.json` fixa `firebase-admin`
   em `13.10.0`** — que é a versão em que o detector de D1 rodou verde. Se o
   `npm install` do artefato subir a versão, rodar `redefinirSenhaProprio` de
   novo ANTES de subir; o teste novo é justamente o gate disso.
2. **D2 — travar `firebase-admin` na versão exata.** Uma linha em
   `functions/package.json`. Decisão de política de dependência; não a tomei.
3. **D3 — o alerta de falha anterior ao e-mail** não deveria dizer
   `canal: "email"`. Trabalho de quem for criar a política de alerta, junto com
   o item que a DIAG já devolveu ao CTO humano.
4. **D4 — runbook desatualizado**, para a lane de `leela-specs/`.
5. ⛔ **`enableImprovedEmailPrivacy` continua LIGADA.** Endosso o veto: V1 e V2
   mostram que ela funciona, e desligá-la reabriria enumeração da base.

---

## 7. Toques em produção nesta review

Leituras (sem efeito):

- `GET admin/v2/projects/leela-hub/config` — `emailPrivacyConfig`, `subtype`,
  `authorizedDomains`, confirmados de forma independente;
- `GET accounts:batchGet` (19 contas: e-mail, `passwordHash`, `disabled`,
  providers);
- `GET` Firestore REST de `rateLimits`, `pedidos`, `carrinhos`, `pessoas`,
  `tenants`, `inscritos`, `comunicacoes` + `runQuery` em três
  collection-groups, para o casamento de hash.

Probes com efeito — **declarados, porque não são de graça**:

- **3 probes que NÃO criam nada:** `generatePasswordResetLink` para
  `rev-senha-20260806@leela-diagnostico.invalid`,
  `leela-rev-qa-9f31c7ab@gmail.com` e
  `rev-senha-regress-20260806@leela-diagnostico.invalid` — endereços sem conta,
  `returnOobLink` suprime envio, nenhum e-mail saiu.
- **3 probes que criam um `oobCode` real:** V3, V4 e V5 geraram links de
  redefinição válidos para `marina@demo-leela.dev`, `felipe@demo-leela.dev` e
  `vitoreldp@gmail.com`. **Nenhum e-mail foi enviado** (`returnOobLink`), os
  links ficaram só no meu terminal e **não foram usados**. Eles expiram
  sozinhos. Duas dessas contas são de demonstração; a terceira é a do dono.
  Era a única forma de falsificar V3/V4/V5 sem desligar a proteção — mas é
  efeito, e por isso está aqui em vez de escondido em "probe sem efeito".

Nenhuma escrita de config, de usuário ou de documento. Nenhum deploy. Nenhuma
alteração em `apps/**`, `packages/**` ou `leela-specs/`. `node_modules` foi
mutado para a prova de D1 e **restaurado byte a byte** do backup (verificado).
Credencial ADC temporária apagada ao encerrar.
