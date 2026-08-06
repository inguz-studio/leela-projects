# PAPEL-DUPLO — uma conta, um e-mail, os dois painéis

trace `leela-papel-duplo-20260806` · lane `PAPEL-DUPLO` · employee `sf-backend-lead`
território: `packages/core/src/platform` · `functions/src` · `firestore.rules`
⛔ nada deployado. O maestro sequencia a publicação.

---

## O estado em uma linha

A base está pronta e commitada. A claim do dono **já está gravada em produção**.
Ele **ainda não entra** — faltam duas coisas, e uma delas não é minha.

| | falta | de quem |
|---|---|---|
| 1 | deploy do `firestore.rules` | maestro (sequenciamento) |
| 2 | o painel aprender a ler a capacidade (`session.ts`) | lane FRONTEIRA-AUTH |
| 3 | deploy da function `setPlatformAdminCapability` | maestro (só para nomeações futuras; não bloqueia o dono) |

---

## A pergunta do dono: digitando a URL ele chega?

**Não.** Nem depois do deploy das Rules, nem depois do re-login.

O `/plataforma` tem duas portas em série, e o deploy só abre a primeira:

1. **Firestore Rules** — os dados. Abre com o deploy. ✔ resolvido por esta lane.
2. **`PlatformGuard`, no cliente** — a tela. Continua fechada.

`apps/painel/src/routes/plataforma/_data/session.ts:60` monta a sessão assim:

```ts
return { status: 'authenticated', uid, role, isAdmin: role === 'platform_admin' };
```

Lê **só** o `role` e descarta o resto do crachá. O papel do dono é `tenant_owner`,
então `isAdmin` sai `false`, e `PlatformGuard` (`_components/PlatformGuard.tsx:33`)
devolve o `EmptyState` **"403 — acesso restrito"**. Digitar a URL bate nesse 403.

O conserto é uma linha, e é do território da FRONTEIRA-AUTH (`apps/`, que eu não
toco). O contrato para ela está pronto no core — ver §T5.

---

## T1 · O modelo

Campo novo em `AuthClaims` (`packages/core/src/platform/roles.ts`):

```ts
platformAdmin?: true;
```

**Por que uma capacidade e não outro papel.** `role` é valor único: virar
`tenant_owner` sobrescreveu `platform_admin` e foi isso que fechou o painel.
Papel e capacidade são eixos diferentes — o papel diz o que a conta **é**, a
capacidade diz o que ela **também pode fazer**. Por serem eixos distintos, não
precisam ser reconciliados: nenhuma combinação é inválida.

**Só `true` existe.** Revogar **apaga a chave**; `false` nunca é gravado. Um
único valor possível mantém TypeScript e Rules lendo a mesma coisa e elimina a
terceira possibilidade que sempre vira bug de comparação frouxa.

**Nome.** `platformAdmin` não está em `RESERVED_CLAIMS` do firebase-admin
(`acr, amr, at_hash, aud, auth_time, azp, cnf, c_hash, exp, iat, iss, jti, nbf,
nonce, sub, firebase` — conferido em `functions/node_modules/firebase-admin/lib/auth/auth-api-request.js:40`).
Crachá do dono serializado: 74 de 1000 caracteres.

**Ponto único de decisão**, nas duas camadas:

```ts
isPlatformAdmin(claims) = role === 'platform_admin' || platformAdmin === true
```

Contas legadas seguem valendo com **zero migração** — a perna antiga nunca saiu.

### O que foi rejeitado, e por quê

| alternativa | por que não |
|---|---|
| `roles: Role[]` | duplica `role`; duas fontes que podem discordar (Kleppmann: dado sobrevive ao código). E espalha a decisão para `isTenantWriter`/`isTenantOwner` — de 1 ponto para 3 |
| mapa de capacidades nomeadas | generalidade especulativa: existe exatamente uma capacidade. Promover boolean → mapa depois é aditivo, então nada se perde esperando |
| gravar `platformAdmin: false` | a terceira possibilidade vira bug de comparação. Revogar apaga |

---

## T2 · Quem concede, quem revoga, e o que está fechado

Function nova: `functions/src/platform/setPlatformAdminCapability.ts`
Input `{ uid, conceder: boolean }`. Superfície própria, **não** um campo a mais
no `setTenantClaims` — lá o input é o *papel*, e a primeira chamada que
omitisse o campo novo apagaria a capacidade sem querer.

**Autoridade (`canSetClaims`): as duas pernas.** O papel legado **e** a própria
capacidade nomeiam. Um sistema de administração que não consegue nomear o
próximo administrador está incompleto — e a alternativa (manter uma conta legada
viva para sempre, ou recorrer a credencial de serviço) é dívida sem prazo.

### As quatro invariantes, e o que fecha cada uma

| # | invariante | o que fecha | prova |
|---|---|---|---|
| 1 | quem não administra a plataforma não nomeia ninguém | `canSetClaims` recusa athlete, promoter, tenant_staff, tenant_owner puro | unit + produção |
| 2 | **ninguém concede a si mesmo**, por caminho nenhum | `alvo === caller` → `permission-denied`, **antes** de qualquer escrita | unit + emulator + **produção** |
| 3 | `tenant_owner` não escala | ser dono do próprio tenant não dá capacidade nem direito de nomear | unit + Rules Q3 |
| 4 | client SDK não escreve claim | **construção, não regra**: custom claim mora no Firebase Auth; `setCustomUserClaims` só existe no Admin SDK. Nenhum SDK de cliente (web, iOS, Android, REST do Identity Toolkit) expõe escrita de custom claim. Não há Rule a escrever porque as Rules não governam essa superfície | estrutural |

⚠️ **A trava de autoconcessão é a invariante 2, não a autoridade.** Se alguém
estreitar `canSetClaims` achando que é ali que mora a segurança, quebra a
sucessão sem ganhar nada. Está escrito no código, nos dois lados.

### O efeito colateral assumido (não escondido)

Com **dois** portadores, A pode conceder a B e B a A. A proibição de auto-alvo
trava **engano**, não conluio. A defesa contra conluio não é proibir a operação
— é a **trilha**: toda concessão, revogação e **tentativa negada** vira doc em
`auditoriaAcessos` (`tipo: 'capacidade_plataforma'`) com `callerUid`,
`callerRole`, `targetUid`, `targetRole`, `resultado`, `em`. Sem PII.

A coleção **não tem `match` no `firestore.rules`**, de propósito (conferido):
deny-by-default para todo cliente. Trilha que o auditado lê ou apaga não é trilha.

Há um teste que documenta esse efeito. **Se ficar vermelho, foi mudança de
política deliberada — releia antes de "consertar".**

### O piso de 1 administrador — estrutural, não contado

Toda revogação bem-sucedida tem um caller que (i) é administrador, porque passou
em `canSetClaims`, e (ii) não é o alvo, porque auto-alvo é recusado. Logo o
caller **sobrevive à revogação que ele mesmo faz**. Com exatamente um
administrador restante, ninguém pode revogá-lo — só ele teria autoridade, e
sobre si mesmo a operação não existe.

Por isso **não há varredura de usuários** na Function: não é preciso contar, é
preciso não deixar zerar.

⚠️ **O piso vale contra REVOGAÇÃO, não contra EXCLUSÃO DE CONTA.** Apagar a
última conta administradora zera o sistema, e isso acontece fora desta Function.
**Guarda operacional: nomeie o sucessor antes de apagar qualquer conta de
administração.** Zerando mesmo assim, o único caminho de volta é o break-glass
`setPlatformAdminCapabilityAdmin` (Admin SDK, sem caller, **não** exportado
como Cloud Function — há teste que prende isso, e log em WARN).

### Revogação: o prazo do crachá em cache

`setCustomUserClaims` + `revokeRefreshTokens` **não** invalidam o ID token já
emitido. Ele vale até expirar: **no máximo 1 hora**. Nessa janela o revogado
ainda passa nas Rules (Rules não consultam revogação de refresh token) e nas
callables (`https.onCall` v1 verifica sem `checkRevoked`).

**Corte imediato** (só para incidente): `admin.auth().updateUser(uid, { disabled: true })`
— conta desabilitada tem o token rejeitado no ato pelo backend do Auth, em Rules
e em callables. Derruba **todo** o acesso da pessoa, não só a capacidade.

---

## T3 · As Rules

`firestore.rules:44` (função única, ~129 chamadas passam por ela):

```
function isPlatformAdmin() {
  return isSignedIn()
    && (request.auth.token.role == 'platform_admin'
        || request.auth.token.platformAdmin == true);
}
```

**Nenhuma outra rule contorna a função** — verificado: as únicas leituras de
`token.role` no arquivo são a linha 45 (esta) e as linhas 65-66 e 72, que
comparam com `tenant_owner`/`tenant_staff` em `isTenantWriter`/`isTenantOwner`.
Zero exceções a justificar.

### ⚠️ O ponto cego que quase passou — leia antes de mexer nesta função

Em `tenants` a ordem é `isTenantMember() || isPlatformAdmin()`: o curto-circuito
nunca chega na perna nova para quem já é membro. **Mas dezenas de rules têm a
forma inversa** — `isPlatformAdmin() || isTenantWriter(...)` — em `inscritos`
(L931), `lotes` (L1158) e outras. Ali a perna **nova** é a **primeira** avaliada,
num crachá que **não tem a chave**.

Se ler chave ausente fosse *erro de avaliação* em vez de `false`, o `||` seria
envenenado e **todo organizador perderia a leitura de inscritos e lotes** —
regressão silenciosa, cross-tenant, em produção.

Provado que devolve `false` nos **dois** avaliadores (o emulator imprime
"Property platformAdmin is undefined" como *motivo* de uma avaliação falsa, não
como abort). Testado nos dois porque este repo já foi mordido pela divergência
inversa (`math.isInfinite` existe em produção e não no emulator).

**Se um dia a forma da função mudar, reteste lotes e inscritos ANTES de publicar.**

### Os quatro quadrantes

`functions/src/__tests__/papelDuploRules.integration.test.ts` — 21 testes, verde.

| | sem capacidade | com capacidade |
|---|---|---|
| **sem tenant** | Q1 athlete → negado em tudo | Q2 `platform_admin` legado → passa (não-regressão) |
| **com tenant** | Q3 `tenant_owner` puro → negado na plataforma, ok no próprio tenant | Q4 `tenant_owner` + capacidade → **os dois lados** (o dono) |

Mais: isolamento cross-tenant nos dois sentidos; comparação estrita
(`false`, `'true'`, `1` **não** passam); anônimo negado; e o describe de
regressão da ordem de disjunção.

### Confirmação no avaliador de produção — sem deploy

`firebaserules:test` (avaliador real do Google, fonte inline):

- **fonte local:** 13/13 ✔
- **ruleset publicado:** falha **exatamente os 2** casos que são a feature, e nenhum outro

Esse é o diff comportamental completo: nada além do pretendido mudou.

---

## T4 · O dono

### Estado da claim, relido do servidor

```
uid    QbqlSxanxlcFeHCy4g47Vp7jlgz1   vitoreldp@gmail.com
antes  {"role":"tenant_owner","tenantId":"castelo-producoes"}
agora  {"role":"tenant_owner","tenantId":"castelo-producoes","platformAdmin":true}
tokensValidAfterTime  14:17:55 → 15:15:21 GMT (06/08)   ·   disabled: false
```

Concedido pelo **handler oficial**, com caller = uid `FTqslV98itZUNGwL5ss6201d23Z2`
(`inguzbuilders@gmail.com`, `{"role":"platform_admin"}`), lido da produção.
Não foi `setCustomUserClaims` direto nem script paralelo: é o arquivo de
produção, com os guards rodando.

**O que essa prova não cobre:** a callable **publicada** de ponta a ponta (hop
HTTPS + verificação de ID token pelo runtime). A function não está deployada e
deploy é proibido nesta lane, então o handler rodou local contra o Auth de
produção. Os guards que importam são os mesmos; o transporte não foi exercitado.

### Invariantes verificadas **contra produção**

- dono tentando conceder ao uid do concedente → `permission-denied`
- dono tentando conceder a si mesmo → `permission-denied`
- crachá do concedente intocado depois de tudo: `{"role":"platform_admin"}`

⚠️ Essas duas probes rodaram sob a política **anterior** (autoridade só pela
perna legada). Sob a política final, "dono nomeia terceiro" **passa** — está
provado no emulator e nos unitários, e **não** foi re-probado em produção de
propósito, para não gravar linhas de teste na trilha de auditoria real.

### O dono precisa sair e entrar de novo

O refresh forçado de `onboarding.ts:61` só dispara quando `role` **e** `tenantId`
faltam no cache — ele tem os dois, então não dispara. Sem re-login, o crachá
novo pode levar até 1h para valer.

---

## T5 · O contrato para a lane de interface

Em `packages/core/src/platform/roles.ts`, exportado por `@leela/core`:

```ts
paineisDaConta(claims): {
  master: boolean;        // alcança o Painel Master
  organizador: boolean;   // alcança o Painel Organizador
  tenantId: string | null;
  podeAlternar: boolean;  // os dois → o alternador aparece
}
```

**Como perguntar sem chamada de rede extra:** `getClaims()` (api-client) devolve
as claims do ID token **já em memória**. Só passe `getClaims(true)` logo depois
de uma concessão/revogação.

**Os destinos não foram redefinidos no core, de propósito.** As rotas já têm
dono: `ROTA_PLATAFORMA` (`/plataforma`) e `ROTA_VISAO_GERAL` (`/`) em
`apps/painel/src/routes/conta/auth/_lib/destinoPosLogin.ts`. Duplicá-las no core
criaria a segunda verdade que um dia diverge. **Importe de lá.**

As quatro combinações (todas com teste):

| crachá | master | organizador | podeAlternar |
|---|---|---|---|
| `platform_admin` legado | ✔ | ✘ (sem tenantId) | ✘ |
| `tenant_owner` puro | ✘ | ✔ | ✘ |
| `tenant_owner` + capacidade ← **o dono** | ✔ | ✔ | **✔** |
| athlete / sem crachá | ✘ | ✘ | ✘ |

### O que a FRONTEIRA-AUTH precisa mudar

`apps/painel/src/routes/plataforma/_data/session.ts:60` hoje faz
`isAdmin: role === 'platform_admin'`, lendo só o `role`. Precisa passar a
derivar de `paineisDaConta(claims).master` (ou `isPlatformAdmin(claims)`) —
o hook já tem as claims completas em mãos, só está descartando.

Enquanto isso não acontece, `PlatformGuard` devolve 403 ao dono mesmo com as
Rules publicadas.

Três avisos de contrato, do próprio código:
1. **Botão não é crachá.** Esconder o item de menu é cosmética; quem nega é
   Rules + guards das Functions. Nunca use `PaineisDaConta` como autorização.
2. `destinoPosLogin` decide a porta de **entrada** por precedência. O alternador
   é navegação **depois** de dentro — não vira seletor no login.
3. `platform_admin` legado **não** alterna: não tem `tenantId`, logo não tem
   painel de organizador para onde ir.

---

## O delta de Rules não deployado — inventário

**A premissa do brief está falsificada, com medição.**

`firestore.rules` estava **byte a byte idêntico** ao ruleset publicado antes de
eu tocar no arquivo:

```
sha256  23b3a92b0e06ef7d946055621c792637e38586ab0bf3c7039f638a3ab14df848  (local)
sha256  23b3a92b0e06ef7d946055621c792637e38586ab0bf3c7039f638a3ab14df848  (publicado)
cmp     idênticos · 165932 bytes
ruleset 4eabe733-d343-4f61-8378-0e20e07f29ef · publicado 2026-08-05T20:50:38Z
```

**Não existia delta de 3,3 KB.** Nenhum ruleset do histórico do projeto tem
162.615 bytes — o histórico inteiro do `cloud.firestore` são 4 rulesets:

| criado | ruleset | bytes |
|---|---|---|
| 05/08 20:50 | `4eabe733` **← no ar** | 165.932 |
| 05/08 07:19 | `20e64b19` | 163.310 |
| 05/08 01:59 | `ba5ad1c6` | 163.278 |
| 28/07 23:51 | `04937a60` | 151.814 |

O número 162.615 não bate com nenhum ruleset nem com nenhuma versão do arquivo
no histórico do git. Provável leitura obsoleta, de antes do deploy de 05/08 20:50.

### Classificação do delta pendente **agora**

| mudança | classificação |
|---|---|
| `isPlatformAdmin()` ganha a segunda perna (+ comentários) | **segura de subir**, com a ressalva abaixo |

É o único delta. 165.932 → 167.691 bytes, todo dele. Verificado no avaliador de
produção: 13/13 na fonte local, e o publicado falha só os 2 casos que são a
feature.

**Ressalva do sequenciamento:** publicar as Rules **antes** de o painel aprender
a capacidade não quebra nada (o dono só continua vendo 403 na tela), e publicar
**depois** também não. As duas ordens são seguras. O que **não** funciona é
avisar o dono antes das duas.

⚠️ **Nota de higiene, fora do meu escopo:** o repo não tem `.gitattributes`.
Num checkout com `core.autocrlf=true`, `firestore.rules` viraria CRLF e o
arquivo deployado teria bytes diferentes do commitado. Nesta máquina está LF
puro (0 CR) e disco == blob == 167.691 bytes, então o deploy daqui é fiel.

---

## Fora de escopo, medido e entregue de bandeja

Os guards das **Cloud Functions** comparam `role === 'platform_admin'`
**direto**, sem passar pelo core — 12 pontos. Eu **não** os alarguei, e a
consequência é concreta: **o dono vai ver os dados do painel master e levar
`permission-denied` nas ações de escrita.**

Não alarguei porque três desses pontos não só autorizam — **derivam
`TrilhaOperacao`**, o carimbo de quem mandou mexer. Trocar por `isPlatformAdmin`
sem cuidar da **ordem** faz o dono operando o **próprio** tenant ser carimbado
como `plataforma`, apagando a única prova de que a mão foi do organizador. Isso
é uma lane com testes próprios, não um efeito colateral desta.

| ponto | classificação |
|---|---|
| `platform/aplicarPlano.ts:110` · `setTaxaPlataformaGlobal.ts:67` · `rollups.ts:137` | **seguro alargar** — autorização pura |
| `finance/atores.ts:46` (`assertPlatformAdmin`) · `getBankDetailsForPayout.ts:130` · `checkout/reenviarEmailsPedido.ts:351` | **seguro alargar**, sensível — acesso auditado; a trilha passa a registrar o uid do dono |
| `eventos/criarEvento.ts:290` (`assertTenantWriterOuAdmin`) · `finance/operador.ts:42,64` (`resolverOperador`) | ⚠️ **precisa de decisão** — deriva `TrilhaOperacao`. Ordem correta: **tenant primeiro** (→ `organizador`), capacidade depois (→ `plataforma`). O swap é no-op para o legado, que não tem `tenantId` |
| `platform/setTenantClaims.ts:98` · `provisionTenant.ts:631` · `eventos/setClaimsEquipe.ts:138` | **manter legado** — escrevem crachá. A capacidade nomeia o próximo administrador; não redistribui papéis de tenant |

---

## Durabilidade — a capacidade não some por efeito colateral

Os **três** escritores de claim do sistema são merge preservador, com teste que
os prende: `mergeTenantClaims`, `mergeClaimsEquipe`, `onCreateUser`. A
capacidade atravessa troca de papel, rebaixamento a athlete e papel de evento.

Um ponto que **apaga tudo**, e é correto que apague:
`provisionTenant.ts:543` faz `setCustomUserClaims(ownerUid, null)` no rollback —
mas só para owner **criado naquele run**. Para owner pré-existente, restaura o
snapshot anterior (que inclui a capacidade).

---

## Verificação

| gate | resultado |
|---|---|
| `tsc --noEmit` (core + functions) | zero |
| `eslint --max-warnings 0` | zero |
| `papelDuploConcessao.test.ts` | **40/40** |
| `papelDuploRules.integration.test.ts` | **21/21** (emulator, porta 8393, IPv4) |
| `papelDuploConcessao.integration.test.ts` | **8/8** (Auth emulator 9393) |
| `firebaserules:test` fonte local (avaliador de produção) | **13/13** |
| regressão: `roles` · `setTenantClaims` · `equipeCore` · `e16Hardening` | **93/93** |

Emulador em config próprio (`firebase.papelduplo.json`, 8393/9393/4393/4394),
por arquivo, IPv4 explícito, `FIRESTORE_EMULATOR_HOST` **e** `LEELA_FS_EMU_PORT`
exportados. Nunca a suíte completa.

## O que ficou sem prova

1. **A callable publicada de ponta a ponta** — hop HTTPS + verificação de ID
   token pelo runtime. Só depois do deploy.
2. **As ~129 chamadas de `isPlatformAdmin()` uma a uma** — a suíte cobre a
   *forma* de cada ordem de disjunção e uma amostra por coleção, não cada call site.
3. **"Dono nomeia terceiro" em produção** — provado no emulator; não re-probado
   em produção para não sujar a trilha de auditoria real.
4. **A tela** — nada de `apps/` foi tocado nem exercitado. O 403 do
   `PlatformGuard` foi determinado por leitura de código, não por navegador.
5. **Concorrência** entre duas concessões simultâneas na mesma conta — último
   write vence, sem CAS. Improvável e de baixo impacto (a operação é idempotente).

---

## Commits

```
fbe5b160  feat(core): a administracao de plataforma vira capacidade, e para de disputar o papel
4aa0f747  feat(rules): o cracha de plataforma passa a ter duas pernas, num ponto so
178683df  feat(plataforma): quem administra a plataforma passa a poder nomear o proximo
a3fcdcc2  test(plataforma): os quatro quadrantes, a escalada tentada e o ponto cego da ordem
```

Pushed (`25d4526f..a3fcdcc2`). Commits `--only` por caminho; nada de `-a`,
`--amend` ou `stash`.

⚠️ **Carona de outra lane:** `packages/core/src/index.ts` (meus exports) foi
commitado por engano dentro de `77b2ec43` da FRONTEIRA-AUTH, que passou por cima
do arquivo enquanto minha mudança estava na árvore. Os exports estão corretos e
na main — **não desfiz**, porque desfazer mexeria no commit da outra lane. Fica
o registro: meu commit `fbe5b160` não contém o `index.ts` que deveria acompanhá-lo.
