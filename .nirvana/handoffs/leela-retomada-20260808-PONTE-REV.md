# PONTE-REV · review antagonista da ponte, contexto frio

**Trace:** `leela-retomada-20260808` · **Employee:** `sf-qa-engineer` · **Papel:** revisor antagonista
**Repo:** `C:\dev\LEELA` · branch `main` · **Início:** 21:28 · **Fim:** 21:52 · **~24 min**
**Sob julgamento:** `35a85f04` (a ponte) + `ca72625c`, `0641e7f6`, `71635421` (a PONTE-RET)

---

# VEREDITO: **APROVADA COM RESSALVAS**

A ponte pode subir. Nenhum dos quinze vetores derrubou o que ela promete, e a promessa
central — *promover não concede nada* — eu **falsifiquei em nome próprio** e ela se sustentou.

As ressalvas são duas, e **nenhuma é regressão**: as duas são incompletudes que a ponte
herda ou empurra um passo adiante, e as duas viram item nomeado do dono. Segurar o deploy
por elas custaria mais do que soltá-lo: a porta está quebrada em produção há dois dias, e
os dois achados deixam a pessoa em situação **melhor** do que a de hoje, não pior.

O que **muda** para a DEPLOY-PONTE: nada no artefato. O contrato da callable que a
PONTE-RET declarou "bit a bit o de `35a85f04`" continua intocado por mim — o único código
que escrevi é teste.

---

## Tempo — e uma correção minha, porque ela é do mesmo tipo que eu cobrei da lane

**Início 21:28 · fim 21:52 · ~24 min.** Não passou de uma hora, então não há nada a avisar
ao maestro por esse gatilho.

Fica registrado o erro, porque ele é exatamente o que esta lane existe para caçar: eu
escrevi neste arquivo, antes de conferir, que a lane tinha levado "~1h30" e que "passou de
1 hora". Era **estimativa apresentada como medição** — a mesma família de "flake de carga",
que é a coisa que eu derrubei no vetor 14. Um `date` desfez em dois segundos. As três
execuções da suíte da landing somam ~8 min de relógio, não 50.

O que consumiu de fato: três execuções da suíte cheia da landing (167 s + 157 s + 165 s),
leitura fria de dez arquivos de origem, e a construção do teste do vetor 12.

---

## Os quinze vetores, um a um

Legenda: **✅ tentei e não derrubou** (isso é prova) · **⚠️ derrubou parcialmente** (vira
ressalva) · **❌ derrubou** (vira defeito).

### ✅ 1 · A organizadora clicando na ponte

**Tentei:** três classes de conta que já são profissionais, pelos dois caminhos (a tela e a
callable direta).

- **Pela tela:** `portaDaConta` devolve `organizador` para `tenant_owner`, `tenant_staff` e
  para qualquer conta com `tenantId` na claim (`apps/landing/lib/portaOrganizador.ts:79-85`)
  — essas contas **nunca veem** o cartão da promoção. Veem `PortaDeQuemJaEProfissional`,
  que não chama servidor nenhum.
- **Pela callable, pulando a tela:** duas guardas independentes. A do passo 4
  (`caller.tenantId` não vazio → `jaExistia: true` **sem escrita**,
  `promoverParaProfissional.ts:224-227`) e, para quem tem doc mas token velho **sem**
  tenantId, o `snap.exists` **dentro** da transação (`:233`), que também devolve sem
  escrever.

**Não derrubou.** Não achei caminho em que a promoção rebaixe `ativo` para
`aguardando_convite` nem recarimbe consentimento de quem já tem.

### ✅ 2 · Duplo clique e concorrência

**Tentei:** provar que a idempotência é do servidor e não do botão desabilitado.

A prova concorrente real já existia e eu a reli linha a linha
(`promocaoProfissionalPonte.integration.test.ts:195-209`): dois
`promoverParaProfissionalCore` em `Promise.all` contra o Firestore emulator devolvem
`[false, true]` e sobra **um** documento. Isso não é mock — transação não existe em mock.
Adicionei a mesma prova pelo transporte (`jaExistia: true`, zero escritas) no meu teste
novo.

**Não derrubou.** A trava do `ref` no cliente é a segunda defesa, não a única; remover o
botão desabilitado não produziria dois estados de onboarding.

### ✅ 3 · A máscara anti-enumeração continua inteira

**Tentei:** achar qualquer diferença observável entre "e-mail existe" e "não existe" que a
ponte tenha aberto.

Não há. A promoção **não tem entrada de e-mail** — opera sobre a sessão do próprio
chamador. `grep` por `criarContaComEmail` em `apps/landing` devolve só o comentário
histórico e o teste que **proíbe** o símbolo de voltar
(`minha-conta-ponte-s1234.test.tsx:296-305`). A landing deixou de exercitar a máscara do
painel em vez de reimplementá-la.

**Não derrubou.** O conserto não trocou defeito de UX por vazamento.

### ✅ 4 · A travessia é declarada antes do clique (PCLIENTE-3)

`AVISO_SEGUNDO_LOGIN` aparece no cartão **antes** do botão
(`PortasDaConta.tsx:232`, parágrafo próprio), e de novo no cartão de sucesso (`:212`) e no
cartão de quem já é profissional (`:139`). Uma constante só para os três.

**Não derrubou.** A pessoa sabe do segundo login antes de clicar.

### ✅ 5 · A promoção não concede nada — **e o teste ainda pode falhar**

Esta é a exigência mais dura do dispatch e a que eu não podia aceitar de segunda mão. **Fiz
a falsificação eu mesmo**, do zero:

```
# injetei a concessão real no módulo:
#   await admin.auth().setCustomUserClaims(caller.uid, { role: 'tenant_owner' });
cd C:\dev\LEELA\functions
npx vitest run src/__tests__/promocaoProfissionalFronteira.test.ts \
               src/__tests__/promocaoProfissionalWrapper.test.ts
→ Test Files 2 failed (2) · Tests 8 failed | 18 passed (26)
     6/19 caem na fronteira  +  2/7 caem no meu teste novo
```

Depois reverti e re-rodei:

```
git diff --stat functions/src/platform/promoverParaProfissional.ts   → vazio
npx vitest run (os mesmos dois arquivos)
→ Test Files 2 passed (2) · Tests 26 passed (26)
```

**Não derrubou, e o gate é vivo.** Os 6/19 batem exatamente com o que a PONTE-RET
declarou — confirmado em contexto frio, não herdado. O guarda `setCustomUserClaims` é
leitura de fonte com comentários removidos, o que é grosseiro mas **funciona e é barato**;
e agora ele não está sozinho, porque a concessão também quebra o contrato observável do
transporte.

### ✅ 6 · O papel `athlete` sobrevive, nas duas ordens

**Tentei:** a ordem que a A4 **não** rodou (vetor 13 do maestro) — a ponte primeiro, o
`onCreateUser` depois.

Medi os dois módulos: `onCreateUser.ts` **não contém a palavra `profissionais`** fora de um
comentário (`grep` limpo), e a ponte não contém `atletas` nem `admin.auth` (provado pelo
guarda de fonte). Os dois escrevem documentos **disjuntos**, e só o trigger escreve claim.
Na ordem invertida: a ponte grava `profissionais/{uid}` sem tocar claim → o trigger relê as
claims, vê `role` indefinido, cria `atletas/{uid}` e seta `athlete` por **merge**
(`onCreateUser.ts:125-128`, preservando claims não relacionadas). Estado final **idêntico**
ao da ordem normal.

**Não derrubou.** A ordem real de disparo não muda nada, e a razão é estrutural, não
felizarda: documentos disjuntos e um único escritor de claim.

### ✅ 7 · O termo é carimbado com hora do servidor

`FieldValue.serverTimestamp()` nos três campos, e a A4 prova contra banco real que ele
volta como `Timestamp` **resolvido** (`:142`) — o que um db falso não sabe falsificar.

**Tentei quebrar o filtro `CAMPOS_DE_CARIMBO`:** ele é lista fixa e case-sensitive
(`'aceitoEm', 'aceitoem', 'versao', 'consentimentoLgpd', 'criadoEm'`), então `AceitoEm` ou
`atualizadoEm` **passam** pelo filtro. Fui atrás do efeito e **não há**: o core nunca
espalha o input, escreve um objeto literal fechado. O filtro é **sinal** ("uma tela tentando
carimbar consentimento é recusada com nome"), não saneamento — e como saneamento ele seria
redundante.

**Não derrubou.**

### ⚠️ 8 · As cinco recusas — e o sexto caminho, que agora está nomeado

**Tentei:** achar caminho de erro fora das cinco. **Achei um, e ele é legítimo** — mas até
agora ninguém o tinha escrito, e uma das cinco não tinha teste nenhum. Ver o vetor 12: as
duas coisas viraram caso de teste meu.

Inventário completo, agora provado pelo transporte:

| # | Recusa | Código HTTP | Onde nasce | Tinha teste antes? |
|---|---|---|---|---|
| 1 | `sem_sessao` | 401 UNAUTHENTICATED | **wrapper** (`:266`) | **NÃO — zero, em lugar nenhum** |
| 2 | `sessao_anonima` | 400 FAILED_PRECONDITION | core (`:204`) | sim |
| 3 | `conta_de_plataforma` | 403 PERMISSION_DENIED | core (`:213`) | sim |
| 4 | `aceite_ausente` | 400 INVALID_ARGUMENT | core (`:192`) | sim |
| 5 | `aceite_datado_pelo_cliente` | 400 INVALID_ARGUMENT | core (`:183`) | sim |
| **6** | *(sem motivo)* — infra caindo | **500 INTERNAL** | SDK, no `catch` | **não, e não era decisão escrita** |
| **7** | *(sem motivo)* — token podre/vencido | 401 UNAUTHENTICATED | SDK, **antes** do handler | não |

Os caminhos 6 e 7 **não são defeito**: os dois desembocam em `indisponivel` e `sem_sessao`
no `motivoDaRecusaDaPromocao` do api-client, e a pessoa lê frase de produto, nunca erro cru.
Mas eram **fronteira por acidente**, e agora são fronteira **provada** — inclusive o
fallback por `code`, que era a única linha do api-client que nada exercitava e que é o que
separa "entre de novo" de "tente em instantes" para a aba que ficou aberta.

**Ressalva registrada, não bloqueante.**

### ✅ 9 · Os CTAs não prometem destino inexistente

Segui o clique até o fim, medindo cada salto:

1. `Painel Profissional` → `promoverParaProfissional()` → `profissionais/{uid}` criado;
2. cartão de sucesso → `painelUrl('/entrar')` (o tipo `RotaPainel` só admite `/entrar` e
   `/cadastrar` — a proibição de `/plataforma` é do compilador);
3. login no painel → `destinoPosLogin` lê `temPerfilProfissional`. **O doc que a ponte
   acabou de criar é exatamente o discriminante** (`destinoPosLogin.ts:90-96`): sem ele a
   conta seria **barrada** com "Esta conta não tem acesso ao painel do organizador";
4. **conferi que ela consegue ler o próprio doc**, senão o passo 3 falharia em silêncio:
   `firestore.rules:2920` — `allow read: if isSignedIn() && request.auth.uid == profId`. ✅
5. destino `/` → `ContaTravadaGate` troca pela vitrine, que nomeia "Eventos" e "Clubs".

E confirmei os dois fatos de que a PONTE-RET fez depender o desenho:
`apps/painel/src/routes/clubes/novo/NovoClubePage.tsx` **existe**, com rota `/clubes/novo`
navegada pelo `HubRoute`; e `grep` por gtag/plausible/posthog/analytics/logEvent em
`apps/landing/app|lib|components` devolve **zero** (verificado a frio).

**Não derrubou.** A pessoa aterrissa em lugar real, e o cartão não promete tela que não
existe.

### ✅ 10 · A porta do dono continua aberta

`apps/landing/lib/portaOrganizador.ts` **não foi tocado** por nenhum dos três commits da
PONTE-RET (confirmado por `git show --stat`). O comentário pinado nas linhas 52-77 está
inteiro e o papel **literal** (`role === 'platform_admin'`) segue de pé, aqui e no espelho
do servidor (`promoverParaProfissional.ts:213`). O dono, que é `tenant_owner` **e**
administra a plataforma, continua com porta.

**Não derrubou.**

### ⚠️ 11 · O tenant nasce com o nome próprio — **medido, e é pior do que a lane descreveu**

A pergunta que o maestro mandou medir: **o slug chega ao `/@handle` público da RN-160?**

**Resposta medida: NÃO.** São dois registros diferentes e o público é opt-in.
`/@handle` vive em `perfis/{handle}`, cujo docId é um handle que a pessoa **digita** no
`PerfilPublicoEditor` (campo vazio no create, `PERFIL_VALORES_INICIAIS` — não é pré-
preenchido com o slug), validado contra `HANDLES_RESERVADOS` e imutável depois
(`salvarPerfil.ts`). O bloco "Organizado por" da página pública de evento resolve por
`perfis` e projeta por allowlist (`leitor.ts:400-412`), **nunca** por `tenantId`.

Também tentei a via de privilégio e ela não existe: nenhuma Rule compara `tenantId` com
literal (`grep` em `firestore.rules`), então um slug "admin" ou "leela" cunhado de propósito
**não concede nada** — o escopo é por igualdade, não por semântica do nome.

**Mas o achado A5 ficou maior, e é isto que eu trago de novo.** A PONTE-RET escreveu que
"preencher a organização depois não corrige, porque o slug já foi cunhado". Medi o
"depois" e ele **não existe**:

- `firestore.rules:2926-2930` — em `profissionais/{profId}`, o cliente tem `allow create`
  (só o próprio doc, e o shape exige `organizacao.size() >= 2` e telefone de 10-13 dígitos)
  e nada mais: `allow write: if isPlatformAdmin()`. Doc **já criado** só se altera por
  platform_admin ou Function;
- **não existe callable** que atualize `profissionais/{uid}` a pedido da pessoa (varri
  `functions/src` e `packages/api-client`);
- a tela de conta do painel (`ContaPage.tsx:142-155`) salva o **displayName do Auth**, não
  o doc;
- `tenants` também é `allow create, update: if isPlatformAdmin()` (`firestore.rules:155`) —
  a dona **não renomeia o próprio tenant**.

Ou seja: quem entra pela ponte fica com `organizacao: ''` **para sempre**, e o resgate
sempre cai na semente seguinte. O comentário
`promoverParaProfissional.ts:241` — *"a pessoa preenche o perfil dela no painel"* — é
**falso hoje**. E quando o token não trouxer `name` (conta de checkout sem
`responsavel.nome`), a semente desce mais um degrau: `email.split('@')[0]`, ou seja o
**local-part do e-mail pessoal** vira o identificador permanente.

Onde isso escapa do banco: o convite de assessoria monta o link com o slug na query string
(`cadastrarAssessoria.ts:443` — `?tenantId=${tenantId}`), e esse link vai por e-mail a um
terceiro.

**Não é bloqueio de deploy** — a ponte não inventou o `sementeDoSlug`, ela só passou a
alimentá-lo sempre com o campo vazio. Vira **PONTE-NOME-1** no painel canônico.

### ✅ 12 · O wrapper `https.onCall` — **fechado, e ele pagou um buraco**

Era o vetor mais caro e o único que eu podia fechar construindo. Fechei.

**Arquivo novo:** `functions/src/__tests__/promocaoProfissionalWrapper.test.ts` — 7 casos,
todos verdes, exercitando o handler HTTP de verdade (CORS → `isValidRequest` →
`checkTokens` → `decode(body.data)` → handler → `res.status().send()`, inclusive o `catch`
que decide entre recusa tipada e `internal`), com o `skipTokenVerification` do próprio SDK
— o mesmo atalho que o Emulator usa.

```
cd C:\dev\LEELA\functions
npx vitest run src/__tests__/promocaoProfissionalWrapper.test.ts
→ Test Files 1 passed (1) · Tests 7 passed (7)
```

O que ele provou, e que **nada provava antes**:

- **`sem_sessao` existe e é tipada.** Era a única das cinco recusas sem um caso de teste em
  lugar nenhum do repositório — porque ela nasce no wrapper e todos os testes eram do core.
  Agora: 401, `status: UNAUTHENTICATED`, `details.motivo: 'sem_sessao'`, zero escritas;
- **o `details.motivo` sobrevive à serialização nas cinco.** Este era o risco de verdade:
  `wrapOnCallHandler` decide por `err instanceof HttpsError`, e num monorepo pnpm com duas
  cópias de `firebase-functions` esse `instanceof` falha e **toda** recusa sai `internal`
  com a mensagem apagada — o DEF-B da ONBOARD-REV acontecendo de novo, invisível para
  qualquer teste de core, porque o core lança o objeto certo e quem traduz é o wrapper;
- **o sexto e o sétimo caminho** (infra caindo → 500 INTERNAL sem `details`; token podre →
  401 sem `details`), agora decisão provada em vez de descoberta em produção.

**Verificação estática que fiz junto, porque um wrapper que não é chamado é pior que um que
falha:** `functions/src/index.ts:69` exporta a callable; ela usa `https.onCall` **sem
região**, ou seja `us-central1`; e o cliente resolve `getFunctions(_app, 'us-central1')`
(`packages/api-client/src/firebase.ts:170`). **Batem.** Se não batessem, o botão viraria 404
no primeiro clique — exatamente como as três portas do organizador já foram.
`npx tsc --noEmit` em `functions`: **0 erros**.

**⛔ O que continua sem prova, e não arredondo:** não há socket, não há Cloud Run e não há
navegador. O que fechei é a camada entre o transporte e o core, que estava **inteira** sem
cobertura. O emulator de functions não subiu de propósito: a máquina tinha **0,89 GB
livres** e o brief manda reportar bloqueio de memória em vez de contorná-lo.

### ✅ 13 · O `onCreateUser` não rodou na A4

Respondido no vetor 6: a ordem real de disparo não muda nada, e a razão é estrutural.

### ⚠️ 14 · O vermelho declarado como flake — **derrubei o rótulo, confirmei a inocência**

A lane chamou de "flake de carga". **"Flake" está errado.** Rodei a suíte cheia, a frio:

```
cd C:\dev\LEELA\apps\landing && npx vitest run
→ Test Files 1 failed | 59 passed (60) · Tests 1 failed | 768 passed (769)
   FAIL test/entrar-overlay-s1221.test.tsx > "Entrar" é botão e abre o overlay
        Error: Test timed out in 20000ms
   Duration 167.17 s
```

**O mesmo teste, o mesmo timeout, na primeira tentativa independente.** Flake é
intermitente; isto é **determinístico nesta máquina**. Chamar de flake é a explicação que
esconde regressão, e o brief registra que verde de conveniência já mentiu duas vezes aqui.

Mas **inocente não é o mesmo que flake**, e a inocência eu medi:

```
npx vitest run test/entrar-overlay-s1221.test.tsx
→ Test Files 1 passed (1) · Tests 23 passed (23) · Duration 8.16 s
```

O arquivo isolado passa inteiro, os 23 casos, em 8 s — e o caso que estoura sob carga é o do
overlay de **login**, que não tem relação de código com `minha-conta/PortasDaConta.tsx`.
Nenhum dos três commits da PONTE-RET toca `entrar-overlay-s1221` nem o que ele monta.

Faltava provar a causa em vez de supor. Duas medições fecharam:

```
# a hipótese óbvia primeiro — e ela morre na hora
npx vitest run --testTimeout=90000
→ ainda "Test timed out in 20000ms"     [o arquivo tem vi.setConfig({ testTimeout: 20_000 })
                                          na linha 26, e config de arquivo vence a flag]

# a hipótese de contenção, medida
npx vitest run --maxWorkers=3 --minWorkers=1
→ Test Files 60 passed (60) · Tests 769 passed (769) · Duration 165.24 s
```

**Isso não é "consistente com contenção", é a prova.** Com três workers a suíte inteira
fica verde — e no **mesmo tempo de relógio** (165 s contra 167 s). O padrão do vitest
oversubscreve esta máquina a ponto de matar de fome o worker de um teste que isolado roda em
8 s, e constranger não custa **nada**: o `collect` cai de 572 s para 262 s de tempo agregado.

**Conclusão:** não é flake (é determinístico), não é regressão da ponte (some com menos
workers, sem tocar em código), e — ao contrário do que eu ia escrever — **não** é "a suíte
não serve de gate aqui". Ela serve, com uma flag.

**Conserto meu, provado:** `apps/landing/package.json` ganha
`"test:gate": "vitest run --maxWorkers=3 --minWorkers=1"`. Não mexi no default nem no
`vitest.config`: mudar o comportamento padrão de todo mundo, inclusive de CI, com base numa
medição feita numa máquina com 0,89 GB livres seria generalizar demais. O que a medição
sustenta é oferecer o gate, e é isso que ela oferece.

**Não bloqueia — e agora a DEPLOY-PONTE tem gate de lote de verdade** em vez de precisar
confiar em arquivos isolados.

### ⚠️ 15 · A decisão de um CTA só — o julgamento

**A lane não substituiu o pedido do dono pelo julgamento dela.** Ela fez as quatro coisas
que separam uma leitura defensável de uma substituição silenciosa: escreveu a leitura no
código (`ROTULO_DA_TRAVESSIA`, com as três variantes a uma linha), declarou no trailer que
*"a leitura de que 'a primeira é' significa ordem de variantes, e não ênfase, é minha"*,
registrou **PONTE-CTA-1** no painel canônico com as três opções, e pôs um guarda que
**quebra** se um segundo botão aparecer. Isso é escalar, não decidir por cima.

O verbatim ajuda a lane: *"devemos testar coisas diferentes.. mas **a primeira é** 'Painel
Profissional'"* — "a primeira" só faz sentido numa fila.

**Mas o argumento dela é mais forte do que os fatos sustentam, e isso eu corrijo.** A lane
escreveu que dois CTAs "não dizem qual converteu". A premissa "não há medição" é **verdade**
(confirmei o grep a frio, zero ocorrências). A conclusão não fecha: a própria callable já
loga `logger.info('promocao_profissional', { uid, jaExistia, viaTenant })` no Cloud Logging,
e um campo `intencao` ali mediria o clique **e** a conversão, porque o resgate do código
também loga e o `uid` junta os dois. A lane **rejeitou** essa saída no trailer — *"ampliaria
o contrato da callable às vésperas da review antagonista"* —, o que é uma razão de risco
boa e honesta, mas é **razão de cronograma, não de impossibilidade**.

Ou seja: a frase certa é *"não instrumentamos hoje"*, não *"medir é impossível"*. A
diferença importa porque o dono está escolhendo entre três opções no PONTE-CTA-1 e uma
quarta, mais barata que "instrumentar a landing", ficou fora do menu dele. **Acrescento a
quarta opção ao item existente** — não crio item novo.

---

## O que eu trago que ninguém tinha nomeado

### ⚠️ A ponte recusa menos do que o resgate recusa — o beco mudou de lugar, para uma classe pequena

Este não estava nos quinze vetores. Achei comparando as duas guardas de elegibilidade:

| | A ponte deixa passar? | O resgate do código aceita? |
|---|---|---|
| conta sem papel | sim | **sim** |
| `athlete` limpo | sim | **sim** |
| `platform_admin` | **não** (recusa nomeada) | não |
| `tenant_owner` / `tenant_staff` | não chega (vira `organizador` na tela) | não |
| **`promoter`** | **sim** | **NÃO** |
| **`athlete` com `demotedFromRole`** | **sim** | **NÃO** |

`contaElegivelParaResgate` (`resgatarConviteOrganizador.ts:172-188`) só aceita `role`
indefinido ou `athlete` **sem** o marcador de demoção. E confirmei que as duas linhas de
baixo são **alcançáveis**, não teóricas: `mergeTenantClaims`
(`setTenantClaims.ts:208-222`) **apaga o `tenantId`** e grava `demotedFromRole` ao
rebaixar — então a ex-organizadora demovida de propósito fica com `role: 'athlete'`, sem
tenant, e o `portaDaConta` devolve `criar` para ela. Ela vê a ponte.

O que ela vive: aceita o termo, é promovida, cai na vitrine, espera o código, e quando o
time Leela der o código o resgate a recusa com a **recusa genérica uniforme** da RN-414 —
indistinguível de "código inválido". Ela não tem como saber que o problema é a conta.

**Por que isso não reprova o deploy:** hoje essa mesma pessoa clica no botão, vai ao
`/cadastrar` e bate na máscara anti-enumeração — está presa **mais cedo** e com menos
informação. A ponte melhora a vida dela. E o conserto (uma sexta recusa nomeada, com frase
nova) é **mudança de contrato da callable**, exatamente o tipo de coisa que não deve pegar
carona num deploy que já está pronto e revisado.

Vira **PONTE-ELEGIVEL-1** no painel, porque a escolha entre "dizer a verdade a ela" e
"manter a máscara uniforme da RN-414" é decisão de produto com tensão de anti-enumeração —
a mesma família do LGPD-1.

---

## Construído × revisado × NO AR

| Item | Construído | Revisado | NO AR |
|---|---|---|---|
| Callable `promoverParaProfissional` (`35a85f04`) | 06/08 | **sim, 08/08 — esta lane** | **NÃO** |
| Rótulo "Painel Profissional" + cartão (`ca72625c`) | 08/08 | **sim, 08/08 — esta lane** | **NÃO** |
| A4 contra emulator (`0641e7f6`) | 08/08 | **sim** (reli e reusei as provas) | n/a |
| Wrapper HTTP (vetor 12) | **08/08 — esta lane** | n/a (é o próprio gate) | n/a |

**A porta continua quebrada em produção neste minuto.** Só a DEPLOY-PONTE muda isso, e ela
está destravada por este veredito.

---

## Comandos e saídas (o que sustenta cada verde)

```
# vetor 12 — o wrapper, pela primeira vez
cd C:\dev\LEELA\functions
npx vitest run src/__tests__/promocaoProfissionalWrapper.test.ts
  → Test Files 1 passed (1) · Tests 7 passed (7)

# vetor 5 — falsificação da fronteira (com setCustomUserClaims injetado)
npx vitest run src/__tests__/promocaoProfissionalFronteira.test.ts \
               src/__tests__/promocaoProfissionalWrapper.test.ts
  → Tests 8 failed | 18 passed (26)     [6/19 fronteira + 2/7 wrapper]

# vetor 5 — depois de reverter
git diff --stat functions/src/platform/promoverParaProfissional.ts   → vazio
npx vitest run (os mesmos dois arquivos)
  → Test Files 2 passed (2) · Tests 26 passed (26)

# tipos
cd C:\dev\LEELA\functions && npx tsc --noEmit -p tsconfig.json   → 0 erros

# vetor 14 — a suíte cheia da landing, a frio
cd C:\dev\LEELA\apps\landing && npx vitest run
  → Tests 1 failed | 768 passed (769) · 167.17 s
    FAIL test/entrar-overlay-s1221.test.tsx (timeout 20000ms)

# vetor 14 — o mesmo arquivo isolado
npx vitest run test/entrar-overlay-s1221.test.tsx
  → Test Files 1 passed (1) · Tests 23 passed (23) · 8.16 s

# vetor 14 — a hipótese óbvia, que morre
npx vitest run --testTimeout=90000
  → 1 failed, e ainda "timed out in 20000ms" (config de arquivo vence a flag)

# vetor 14 — a causa, medida  ✅ e virou `pnpm --filter @leela/landing test:gate`
npx vitest run --maxWorkers=3 --minWorkers=1
  → Test Files 60 passed (60) · Tests 769 passed (769) · 165.24 s
```

Gates de functions rodados **arquivo a arquivo**, conforme o brief. Emulator de functions
**não subiu** — 0,89 GB livres; reportado como bloqueio, não contornado.

---

## Território e disciplina de árvore

- **Escrevi em:** `functions/src/__tests__/promocaoProfissionalWrapper.test.ts` (novo,
  `b60f307b`), `apps/landing/package.json` (uma linha de script, `299eabd3`), o painel
  canônico, o board e este handoff.
- **Não escrevi em `apps/painel`** — a REV-VITRINE está viva ali. Nenhum defeito meu
  aterrissa naquele território; os dois que tocam produto viraram item do dono.
- **Não reescrevi nada da PONTE-RET.** Nenhum vetor derrubou o que ela entregou, então o
  artefato que a DEPLOY-PONTE publica continua sendo o dela, bit a bit.
- `git commit --only` em todos os commits. Sem `--amend`, sem `stash`.
