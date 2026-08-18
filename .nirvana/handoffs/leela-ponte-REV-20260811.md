# PONTE-REV · review antagonista dos três itens de ponte

**Trace:** `leela-redesign-v2-20260810` · lane **PONTE-REV** · contexto **FRESCO** (não vi a construção)
**Repo:** `C:\dev\LEELA` · branch `main` · **HEAD revisado:** `10d4b319`
**Alvo:** a entrega da lane PONTE-RESOLVE (`e48032a8` `6cfb5fe2` `8f447b12` `5973434b` + 2 de docs)
**Início:** 11/08 03:26 (-03) · **Fim:** 11/08 03:40 (-03)
**Disciplina:** READ-ONLY em código. Zero commit meu. Zero deploy.

---

## VEREDITO · LIBERADA COM RESSALVAS

O que a lane construiu está **correto e provado**. Re-executei as quatro suítes do zero, sozinha,
em foreground, e os quatro números batem exatamente com o declarado. O gate de lote da landing,
que a lane deixou como bloqueio, **fechou verde numa máquina quieta** — o vermelho da noite era
contenção, como ela sustentou, e o bloqueio cai.

⛔ **Mas o pacote não pode ir a deploy como está.** Achei dois bloqueadores, e o primeiro é o
vetor 5 — pior do que o handoff descreve, porque **não precisa de functions velhas para acontecer**.
Ele está armado no disco agora, com todos os gates da landing verdes.

| | |
|---|---|
| Construção dos 3 itens | ✅ correta, provada, falsificável |
| Suítes declaradas (4) | ✅ re-provadas 34/34 · 7/7 · 31/31 · 12/12 |
| Gate de lote da landing (vetor 11) | ✅ **60/60 · 782/782 · 214,86 s · EXIT=0** — bloqueio CAI |
| Segurança da escrita de cliente (vetor 2) | ✅ nenhuma regressão; injeção e travessia impossíveis |
| Ordem do deploy (vetor 5) | ⛔ **BLOQUEADOR B1** — ordem é necessária e **não é suficiente** |
| Contrato "quem não tocar cai no de antes" | ⛔ **BLOQUEADOR B2** — é falso para uma classe de nomes |
| Descarte silencioso no `jaExistia` | ⚠️ RESSALVA R1 — o defeito que o item existe para matar sobrevive num ramo |

---

# ⛔ B1 · vetor 5 — a ordem do deploy não salva, e o `dist/` já está envenenado

**O que a lane afirmou:** landing nova com functions velhas manda os dois campos para um servidor
que os ignora; a ordem functions → api-client (build fresco) → landing resolve.

**A primeira metade é verdadeira, e eu provei por leitura do contrato velho.** Em `e48032a8^`,
`promoverParaProfissionalCore` só recusa os cinco `CAMPOS_DE_CARIMBO` (`aceitoEm`, `aceitoem`,
`versao`, `consentimentoLgpd`, `criadoEm`) e exige `aceiteTermo === true`. `intencao` e
`nomeProfissional` **não estão na lista e não são lidos** — o `onCall` do `firebase-functions/v1`
não valida shape. Campo desconhecido atravessa em silêncio, a pessoa vê sucesso e o doc nasce com
`organizacao: ''`. **Confirmado: campo ignorado silenciosamente, nunca recusado.**

**A segunda metade é onde a lane erra o tamanho do risco.** O defeito não precisa de functions
velhas. Ele está no `dist/` do `api-client`, e ele está armado agora:

```
packages/api-client/dist/index.js   (build de 09/08 13:01)
packages/api-client/src/platform/profissionais.ts  (fonte de 11/08 02:33)

Contagem de símbolos no dist ATUAL — controle `xyzzy` = 0 nos dois arquivos:
                              index.js   index.mjs
  promoverParaProfissional        4          3     ← PRESENTE
  nomeProfissional                0          0     ← AUSENTE
  intencao                        0          0     ← AUSENTE
  nome_profissional_invalido      0          0     ← AUSENTE
  conta_inelegivel                1          1
  xyzzy (controle)                0          0

Assinatura no dist: `async function promoverParaProfissional() {` — ZERO parâmetros.
Corpo: `fn({ aceiteTermo: true })` cravado.
```

**Por que nenhum gate vê isso, e os três estão verdes:**

1. **`tsc --noEmit` não vê.** `apps/landing/tsconfig.json` mapeia
   `"@leela/api-client": ["../../packages/api-client/src/index.ts"]`. O typecheck lê a **fonte**,
   com a assinatura nova. Passa.
2. **A suíte não vê.** `apps/landing/test/minha-conta-ponte-s1234.test.tsx:43` faz
   `vi.mock('@leela/api-client', …)`. O módulo real nunca é carregado. Os 51 testes passam contra
   um dublê.
3. **O bundle VÊ, e é o único que vê.** `apps/landing/next.config.js` não tem alias para
   `@leela/api-client`. O Next resolve pelo `exports` do pacote →
   `"import": "./dist/index.mjs"` → o arquivo de 09/08. **Um `next build` hoje produz uma landing
   que nunca manda os dois campos.**

**E o probe de verificação de 08/08 daria FALSO VERDE.** O runbook daquele dia contava a ocorrência
de `promoverParaProfissional` no `dist/` (0 → 3 depois do `tsup`). Hoje o símbolo já vale 3 no dist
velho, porque o que mudou foi a **aridade**, não a existência. O probe precisa mudar de alvo.

**Nada na configuração força o rebuild.** `firebase.json` tem `predeploy` para functions
(`npm --prefix "$RESOURCE_DIR" run build`), então o lado do servidor está coberto. Não existe
seção `hosting` em `firebase.json` e a de `firebase.prod.json` cobre só o painel — **nenhum
`predeploy` toca o `api-client`**. `turbo.json` tem `build.dependsOn: ["^build"]`, o que salvaria
`pnpm turbo run build --filter='@leela/landing...'`; mas o passo 2 do próprio handoff prescreve
`pnpm --filter @leela/api-client build`, que é a forma manual — e ela depende de alguém lembrar.

**Veredito do vetor 5:** a ordem functions → api-client → landing é **necessária e insuficiente**.
Falta guarda no código, e ela é barata: hoje o resultado da callable é
`{ statusOnboarding, jaExistia }` e **não ecoa nada do que aceitou**. Nem a tela nem uma sonda de
fumaça conseguem distinguir "o servidor gravou meu nome" de "o servidor ignorou meu nome". Essa é
a raiz comum de B1 e de R1.

---

# ⛔ B2 · o campo pré-preenchido recusa um nome que a pessoa nunca digitou

O registro do maestro diz, em letras: *"quem não tocar nele cai exatamente no comportamento de
antes"* (`01-decisoes-maestro.md`, PONTE-NOME-1). **Isso é falso**, e a falha vem justamente do
pré-preenchimento.

**A cadeia, medida.** `PortasDaConta.tsx:202` inicializa o campo com `nomeDaPessoa`, que é o `name`
do token (`nomeDoToken`, linha 363). O `conhecer` manda esse valor **sem a pessoa tocar em nada**
(linha 230). No servidor, `nomeProfissionalDoPayload` recusa quando
`derivarSlugOrganizacao(nome).length === 0` (`promoverParaProfissional.ts:291`).

Rodei `derivarSlugOrganizacao` com o corpo exato da fonte
(`packages/core/src/platform/cadastroOrganizador.ts:93`):

```
"Ana Paula"          → "ana-paula"     ✅
"Castelo Produções"  → "castelo-producoes" ✅
"José"               → "jose"          ✅
"Анна"      (4 chars) → ""             ⛔ RECUSA
"ゆき"       (2 chars) → ""             ⛔ RECUSA
"李"        (1 char)  → ""             ⛔ RECUSA
"😊😊"      (2 chars) → ""             ⛔ RECUSA
```

O regex é `replace(/[^a-z0-9]+/g,'-')` depois de NFD — **tudo fora do ASCII vira hífen e some**.

**O caminho é alcançável.** `NOME_PARTICIPANTE_MIN/MAX` valem 2 e 80
(`packages/core/src/platform/contaParticipante.ts:70`), os mesmos de `ORGANIZACAO_MIN/MAX` — então
o eixo de comprimento está alinhado e não é por aí que quebra. Mas o nome do participante é gravado
como `displayName` do Auth (`confirmarCodigoDeAcesso.ts:396`, `contaSemFriccao.ts:279`) e volta no
token. Uma participante chamada 李明 ou Анна Иванова tem conta válida, vê o próprio nome no campo,
não toca em nada, clica — e **é recusada**.

**Antes desta lane ela atravessava.** O caminho antigo mandava `{ aceiteTermo: true }` puro e o
`sementeDoSlug` caía no local-part do e-mail. O item nasceu para tirar gente do beco e, para essa
classe de nome, ele cria um beco novo.

**E a frase da recusa mente para ela.** `'Escolha um nome com pelo menos duas letras ou números
para a sua produtora.'` — o nome dela **tem** duas letras. A régua real é "pelo menos dois
caracteres do alfabeto latino", e a copy não diz isso.

**O conserto é uma linha, e ele já está escrito na lógica da própria lane.** A lane decidiu, com
razão, que *"sem `name` no token o campo nasce vazio"*. A mesma regra tem de valer quando o `name`
existe e não vira endereço: se `derivarSlugOrganizacao(nomeDaPessoa)` for vazio, o campo nasce
vazio. Aí "não tocar" volta a ser o comportamento de antes, como o registro promete.

---

# ⚠️ R1 · vetor 7 — o descarte silencioso sobrevive no ramo `jaExistia`

O item PONTE-NOME-1 se define contra o descarte silencioso:
*"descartar em silêncio um nome digitado é o defeito que este item existe para matar"*
(`promoverParaProfissional.ts:265`). **Ele continua vivo em dois ramos:**

- passo 4, `caller.tenantId` presente → retorna `jaExistia: true` **sem escrever** (linha 391-400);
- passo 6, `snap.exists` dentro da transação → `return true`, `tx.set` nunca roda (linha 426).

Nos dois, o nome digitado é **jogado fora sem uma palavra**. E a tela não tem como avisar porque
ela **descarta o resultado**: `PortasDaConta.tsx:230` é `await promoverParaProfissional({…})` com o
retorno não atribuído. O `jaExistia` que o servidor manda de propósito nunca é lido, e a pessoa vê
*"Pronto. O painel profissional já é seu"* como quem escolheu o nome.

A lane julgou isso como limitação e pediu juízo. **Meu juízo: é o mesmo defeito, num ramo menor, e
o conserto já está pago pelo contrato.** O `jaExistia` está em mãos; basta a tela dizer a frase
quando ele for `true` e o nome tiver sido declarado. Não é bloqueador porque a janela é estreita
(exige doc pré-existente), mas é incoerente deixá-lo de pé no item que existe contra ele.

---

# Vetores, um a um

## 1 · A fronteira continua fechada — ✅

`grep` por `setCustomUserClaims` em `promoverParaProfissional.ts` e `elegibilidadeOrganizador.ts`:
zero ocorrências fora do comentário que promete a ausência. O único `admin.auth()` citado está em
comentário do módulo de elegibilidade, descrevendo o **portão**, não a porta. O contrato cresceu
dois campos e nenhum deles toca claim, tenant ou papel. A suíte de fronteira roda **34/34** e a
lane registra a falsificação com claims injetadas.

## 2 · `nomeProfissional` é escrita de cliente que vira `nome` e `slug` — ✅ re-medido, limpo

Este era o segundo vetor caro. Re-medi contra o caminho **novo** (servidor, Admin SDK, sem Rules),
e não contra a medição de 08/08:

| Ataque | Entrada | `derivarSlugOrganizacao` | Desfecho |
|---|---|---|---|
| HTML / XSS | `<script>alert(1)</script>` | `script-alert-1-script` | slug inerte |
| Travessia de caminho | `../../etc/passwd` | `etc-passwd` | **`.` e `/` não sobrevivem** |
| Caracteres de controle | `\u0000\u0001` | `''` | recusado (7ª recusa) |
| Só símbolos | `!!` | `''` | recusado |
| Espaço | `"   "` | `''` | recusado (e `trim()` já o pega antes) |
| Comprimento | 85 chars | truncaria em 60 | recusado antes, por `ORGANIZACAO_MAX` |
| Colisão de slug | nome de tenant existente | igual | `slugLivre` desempata `-2`… `-50` |

**Injeção:** impossível por construção. O slug só admite `[a-z0-9-]`, e o `SLUG_RE` de
`validateProvisionInput` (`^[a-z0-9]+(?:-[a-z0-9]+)*$`, ≤60) é a segunda barreira, do lado do
provisionamento.

**Colisão:** `slugLivre` (`resgatarConviteOrganizador.ts:131`) varre `tenants/{candidato}` até
`-50` e o `provisionTenantCore` resolve a corrida com `already-exists`. Escolher o nome de uma
produtora existente **não a toma** — nasce `-2`.

**Máscara anti-enumeração:** intacta. A porta não consulta `tenants` nem `profissionais` de
terceiro; ela só lê o próprio token e escreve o próprio doc. A recusa fala da conta **já logada**,
nunca de conta alheia. Não há e-mail de entrada.

**Unicode:** de-acentuação por NFD funciona (`Aná` → `ana`, `Produções` → `producoes`). O efeito
colateral de escrita não-latina virar `''` é o B2 acima, e é problema de **produto**, não de
segurança.

**Uma coisa medida e deixada como está, porque é anterior à lane:** não existe lista de slugs
reservados para **tenant**. `admin`, `leela`, `plataforma`, `minha-conta`, `definir-senha` e
`ingresso` passam inteiros. `SLUGS_RESERVADOS` (`functions/src/eventos/slug.ts:61`) protege só o
slug de **evento**, que é o segmento público `/[eventSlug]`. Confirmei que o slug do tenant **não**
é segmento de rota pública na landing (`app/(public)/` tem `[eventSlug]`, `ingresso/[token]`,
`convite`, `definir-senha`, `minha-conta`). Então não há sequestro de rota. Fica como nota: o
mesmo campo já existia livre no `/cadastrar`, então **isto não é regressão desta lane**.

## 3 · A régua de 2 a 80 é a mesma do `/cadastrar`? — ⚠️ quase

`ORGANIZACAO_MIN/MAX` são importados do core, não recopiados — o eixo do comprimento é literalmente
a mesma constante, e a Rule concorda
(`firestore.rules:2906`: `organizacao.size() >= 2 && <= 80`).

**Mas as duas portas aceitam coisas diferentes**, e o handoff afirma o contrário. `validarCadastro
Organizador` (`cadastroOrganizador.ts:115`) **não** checa derivabilidade de slug: o `/cadastrar`
aceita `"!!"` e a porta o recusa. A divergência é **fail-safe** (a porta é mais estrita) e não
produz dado ruim, então não bloqueia. Mas a frase *"os mesmos do `/cadastrar`, para as duas portas
não aceitarem coisas diferentes"* está errada como escrita, e é exatamente o tipo de segunda cópia
que o PONTE-ELEGIVEL-1 existe para impedir. Recomendo mover a checagem de derivabilidade para o
core, ao lado de `validarCadastroOrganizador`, e as duas portas passarem a lê-la.

## 4 · Os dois estados de ausência da intenção — ✅

`normalizarIntencao` (linha 251): `undefined`/`null` → `nao_declarada`; string na lista → ela
mesma; **todo o resto** → `invalida`. Não há caminho de fusão: os dois `return` são disjuntos e o
`includes` vem de `INTENCOES`, fonte única. O cliente velho manda `{ aceiteTermo: true }` puro e
cai em `nao_declarada` **por regra**, não por acidente — o campo simplesmente não existe no payload
e o primeiro `if` o pega. O log sai nos **dois** desfechos de sucesso, incluindo o `jaExistia` do
passo 4 que retorna cedo (linhas 392 e 459). Confirmado por leitura e pela saída do wrapper:
`{"uid":"uid-ana","jaExistia":true,"viaTenant":false,"intencao":"nao_declarada","nomeDeclarado":false,…}`.

## 5 · A ordem do deploy — ⛔ **B1**, seção própria acima

## 6 · PII no log — ✅

`logger.info('promocao_profissional', { uid, jaExistia, viaTenant, intencao, nomeDeclarado })` nos
dois pontos. `intencao` é um de quatro rótulos fechados; o nome entra como **booleano**
(`nomeProfissional !== null`). Nenhum caminho de log carrega a string. Confirmado na saída real da
suíte do wrapper, que imprime a linha inteira. Nenhum `logger` novo em `PortasDaConta.tsx`.

## 7 · O idempotente contra o nome — ⚠️ **R1**, seção própria acima

## 8 · A11y do campo novo — ⚠️ lacuna pequena, e o DS não tem culpa

O `Input` do DS faz a casca certa: `useId` determinístico, `htmlFor` no label, `hintId` no
`aria-describedby`, `aria-invalid` quando há `error`
(`packages/design-system/src/components/Input/Input.tsx:111-157`).

**O que a tela não usa:** o cartão **não passa `error` ao `Input`** quando a recusa é
`nome_profissional_invalido`. A frase sai num `<p role="alert">` solto no fim do cartão
(`PortasDaConta.tsx:315`), depois do checkbox e antes dos botões. Resultado: o campo nunca fica
`aria-invalid`, o erro não é associado a ele, e quem usa leitor de tela ouve um alerta sem saber
**qual** campo recusou. O `Input` já tem a prop; é ligar. Sem axe-core e sem navegador nesta lane —
a conferência visual do vetor do handoff continua devendo.

## 9 · O guarda dos dois botões — ✅

`minha-conta-ponte-s1234.test.tsx:144-146`: `expect(botoes).toHaveLength(2)` e
`expect(new Set(intencoes).size).toBe(2)`. O primeiro quebra com três botões, o segundo com dois
botões de intenção igual. É exatamente o que a lane declarou. A trava de voo é `useRef`
(`emVoo`), lida no mesmo tick — correta contra duplo clique, e independente do `setFase`
assíncrono. Os dois botões ficam `disabled` enquanto um corre; só o apertado vira "Abrindo…".

## 10 · A divergência de vocabulário da D-0802-1 — ✅ **a lane está certa, o dispatch estava errado**

Li o cânone. `LEELA-E12-landing.md`, seção DEC-0802, na íntegra do dono:

> *"nao quero que a gente remeta 100% a corrida, pois nao somos isso, somos um hub de experiencias
> de bem-estar, de wellness, clubs, etc."* — **"experiência" é o termo guarda-chuva e "participante"
> é quem compra; corrida, prova e atleta são instâncias de um evento, nunca a categoria.**

A D-0802-1 **bane corrida/prova/atleta como categoria do produto**. Ela **não** bane
"experiência"/"participante" — ela os **obriga**. A premissa do dispatch da lane estava invertida.
A lane seguiu o cânone e a decisão não dependia de qual leitura vencesse, mas o registro fica:
**vale o cânone**. "Organizar eventos" e "Criar Club" nomeiam áreas do painel, não categorias, e
não colidem. A copy nova do cartão usa "experiências" e "participante" de forma consistente.
Recomendo corrigir a frase no dispatch antes que ela reapareça no próximo brief de copy.

## 11 · O gate de lote da landing — ✅ **VERDE. O bloqueio cai.**

Máquina quieta (11 processos `node`, dos quais 9 ociosos em 16-25 KB). Rodado **sozinho**, em
série, foreground, sem watcher, sem background:

```
cd C:\dev\LEELA\apps\landing
npx vitest run --maxWorkers=3 --minWorkers=1        (idêntico ao `test:gate`)

INICIO 03:31:28
  Test Files  60 passed (60)
       Tests  782 passed (782)
    Duration  214.86 s  (collect 350.07 s · tests 172.93 s · environment 74.98 s)
       EXIT=0
FIM 03:35:06
```

**A leitura da lane estava certa.** Comparado com a noite dela: run 1 = 7 arquivos vermelhos em
421 s, run 2 = 9 vermelhos em 531 s, com o **conjunto de falhas mudando** entre as duas. Agora,
sozinha: **zero vermelhos em 215 s** — 2,5× mais rápido que a run 2, com os mesmos 60 arquivos.
Regressão não some quando o vizinho para de trabalhar. Era contenção.

Contra o baseline de 08/08 (`PONTE-REV`, 60/60 e **769**/769 em 165,24 s): +13 testes. Doze são os
declarados por esta lane (39 → 51 nos dois arquivos de ponte); o décimo terceiro entrou entre 08/08
e hoje, fora deste território. **Nenhuma regressão em `checkout-*`, `definir-senha` ou
`entrar-overlay`** — a hipótese alternativa do vetor 11 está descartada.

---

## As quatro suítes declaradas, re-provadas do zero

Todas em foreground, em série, uma por vez. Nada em background.

```
cd C:\dev\LEELA\functions

npx vitest run src/__tests__/promocaoProfissionalFronteira.test.ts
  → Test Files 1 passed (1) · Tests 34 passed (34) · 2,93 s        [lane declarou 34 ✅]

npx vitest run src/__tests__/promocaoProfissionalWrapper.test.ts
  → Test Files 1 passed (1) · Tests  7 passed  (7) · 2,50 s        [lane declarou  7 ✅]

npx vitest run src/__tests__/elegibilidadePortaVersusPortao.test.ts
  → Test Files 1 passed (1) · Tests 31 passed (31) · 3,13 s        [lane declarou 31 ✅]

# contra emulator — IPv4 explícito, host:porta completo
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
  GCLOUD_PROJECT=demo-leela LEELA_CLOCK=2026-03-15 \
  npx vitest run src/__tests__/promocaoProfissionalPonte.integration.test.ts
  → Test Files 1 passed (1) · Tests 12 passed (12) · 8,75 s        [lane declarou 12 ✅]
     provado no banco: com nome  → tenantId 'castelo-producoes'
                       sem nome  → tenantId 'ana-paula'  (o defeito, medido)
```

**Nenhum número da lane estava arredondado.** Os quatro batem na casa.

**Nota de máquina:** os emuladores estavam **de pé** quando cheguei (`127.0.0.1:8080` PID 25452,
`127.0.0.1:9099` PID 26412). O handoff da PONTE-RESOLVE diz *"Derrubado ao terminar"*. Ou a lane
vizinha os subiu depois, ou a frase não se cumpriu. Não muda nenhum resultado — usei os que
estavam de pé, com host explícito — mas fica registrado porque suíte de integração compartilhando
emulator com outra lane é fonte de flake.

---

## `DECISOES-ABERTAS.md` 28 → 26 · os fechamentos são legítimos? — ✅ sim

Conferi o diff de `5973434b` linha a linha.

- **Os dois blocos removidos são exatamente PONTE-CTA-1 e PONTE-NOME-1**, e nada mais. Nenhum
  outro item saiu de carona.
- **Os dois tinham decisão registrada com condição de reabertura escrita**, em
  `02-rodadas/2026-08-11-ponte-resolve/01-decisoes-maestro.md`, antes de sair do painel. É a
  disciplina da própria página.
- **A aritmética fecha:** 28 = 25 decisões + 3 ações; saem 2 decisões; 26 = 23 + 3. O cabeçalho
  novo declara 23 + 3 e preserva o parágrafo de 10/08 com a conta antiga, marcado como histórico —
  o rastro fica.
- **O PONTE-ELEGIVEL-1 não estava no painel**, e a lane provou por quê: o corte de 09/08 o decidiu
  com **"Reabre quando: não reabre"**. Não é item sumido, é item fechado antes.
- ⚠️ **Uma ressalva de honestidade do painel.** O texto novo diz *"Nada disso subiu: os dois estão
  construídos, provados e esperando a fase de deploy."* Verdadeiro. Mas o dono lê o painel como
  registro de decisão fechada, e as condições de reabertura de ambos dependem de **número de
  log** — que só existe depois do deploy. Enquanto B1 não for pago, a condição de reabertura do
  PONTE-CTA-1 é inalcançável **e a de PONTE-NOME-1 mediria zero**, porque `nomeDeclarado` sairia
  `false` para todo mundo. Não peço reabrir; peço que o deploy não escorregue.

---

## fix_list — acionável, na ordem

### ⛔ B1 · fechar o vetor 5 com guarda, não com disciplina — **antes de qualquer deploy**

- **B1.1 (obrigatório, servidor).** O resultado da callable passa a ecoar o que ela aceitou:
  `{ statusOnboarding, jaExistia, intencaoRegistrada: IntencaoRegistrada, nomeAplicado: boolean }`.
  Custo: dois campos num objeto que já é construído. Ganho: a landing e qualquer sonda de fumaça
  passam a **distinguir** "o servidor gravou" de "o servidor ignorou". Sem isso, B1 volta no
  próximo deploy e no próximo depois dele.
  *Arquivo:* `functions/src/platform/promoverParaProfissional.ts` (`PromoverParaProfissionalResult`,
  linhas 173-178; os dois `return` em 399 e 466) + o espelho em
  `packages/api-client/src/platform/profissionais.ts:172`.
- **B1.2 (obrigatório, runbook).** Trocar o probe de verificação do `dist/`. Contar
  `promoverParaProfissional` dá **falso verde** (vale 3 no dist velho). O alvo tem de ser
  `nomeProfissional` e `intencao` — hoje **0/0**, e depois do `tsup` têm de ser >0, com um controle
  ausente (`xyzzy`) em 0 para provar que a contagem distingue.
- **B1.3 (recomendado, mecânico).** Deployar a landing por
  `pnpm turbo run build --filter='@leela/landing...'` em vez de `pnpm --filter @leela/landing build`.
  O `build.dependsOn: ["^build"]` do `turbo.json` reconstrói o `api-client` sozinho e a ordem deixa
  de depender de memória humana.
- **B1.4 (recomendado, gate).** Um passo de uma linha depois do `next build`: `grep` por
  `nomeProfissional` nos chunks de `.next/static`. Zero ocorrências = build sobre `dist/` velho =
  falhar o gate. É o único gate que enxerga o que os três atuais não enxergam.
- **Ordem de deploy, confirmada e ainda obrigatória:** functions → `api-client` (build fresco,
  verificado por B1.2) → landing. Necessária. Só não é suficiente sozinha.

### ⛔ B2 · o campo pré-preenchido não pode recusar quem não digitou — **antes de qualquer deploy**

- **B2.1 (obrigatório, tela).** O campo nasce **vazio** quando o nome do token não deriva slug —
  a mesma regra que a lane já aplicou para o token sem `name`, pelo mesmo motivo escrito. Uma
  linha em `PortasDaConta.tsx:202`:
  `useState(derivarSlugOrganizacao(nomeDaPessoa).length > 0 ? nomeDaPessoa : '')`.
  Devolve verdade à frase *"quem não tocar cai no comportamento de antes"*.
- **B2.2 (obrigatório, copy).** A frase da recusa
  (`PortasDaConta.tsx:159` e `promoverParaProfissional.ts:281`) descreve uma régua que não é a
  régua. "pelo menos duas letras ou números" é falso para quem escreveu duas letras não latinas.
  Dizer o que serve: letras de A a Z e números.
- **B2.3 (teste).** Caso de fronteira com `name` não latino no token, provando que o campo nasce
  vazio e a travessia atravessa. É o controle que faltava e o que impede a regressão.

### ⚠️ R1 · o descarte silencioso no ramo `jaExistia`

- **R1.1.** A tela lê o retorno de `promoverParaProfissional` (`PortasDaConta.tsx:230` descarta) e,
  quando `jaExistia === true` **e** o nome foi declarado, diz na tela de sucesso que a produtora
  dela já tinha nome e este não mudou. Com B1.1 no lugar, o sinal exato (`nomeAplicado: false`)
  já vem pronto do servidor e a frase deixa de ser inferência.

### ⚠️ R2 · a régua da derivabilidade em dois lugares (vetor 3)

- **R2.1.** Mover a checagem `derivarSlugOrganizacao(x).length > 0` para o core, ao lado de
  `validarCadastroOrganizador`, e as duas portas lerem a mesma função. Hoje o `/cadastrar` aceita
  `"!!"` e a porta o recusa. É fail-safe, mas é a segunda cópia que o PONTE-ELEGIVEL-1 existe para
  impedir, agora em validação de nome.

### ⚠️ R3 · a11y do campo (vetor 8)

- **R3.1.** Passar `error={…}` ao `Input` quando a recusa for `nome_profissional_invalido`, em vez
  de só pintar o `<p role="alert">` no fim do cartão. O DS já faz `aria-invalid` e
  `aria-describedby` sozinho; a tela só não está usando.
- **R3.2.** A conferência visual em navegador continua devendo, e é gate: o cartão mudou de forma
  (dois botões e um campo) e jsdom não desenha.

### 📝 R4 · registro

- **R4.1.** Corrigir a premissa da D-0802-1 no texto de dispatch. O cânone
  (`LEELA-E12-landing.md`, DEC-0802) **obriga** "experiência"/"participante" e bane
  corrida/prova/atleta como categoria. A leitura invertida vai reaparecer no próximo brief de copy.

---

## O que eu tentei derrubar e não caiu

Registro pelo avesso, porque review que só lista achado esconde o que foi testado e aguentou.

- **A fronteira.** Procurei concessão de claim, tenant ou papel na porta. Não existe, e a ordem dos
  passos 4 → 5 → 6 está certa: quem já tem tenant sai por `jaExistia` antes da régua de
  elegibilidade, e a rebaixada é barrada **antes** da transação, sem tocar no doc antigo dela.
- **A injeção pelo nome.** Ataquei com HTML, travessia de caminho, caracteres de controle, símbolo
  puro e comprimento. O `derivarSlugOrganizacao` reduz tudo a `[a-z0-9-]` e o `SLUG_RE` do
  provisionamento é a segunda barreira. Nada passa.
- **O sequestro de slug.** Escolher o nome de uma produtora existente não a toma: `slugLivre`
  desempata e o `provisionTenantCore` resolve a corrida.
- **A fusão dos dois estados de intenção.** Não existe caminho que funda `invalida` em
  `nao_declarada`. Os `return` são disjuntos e o cliente velho cai no primeiro `if`.
- **PII no log.** O nome é booleano nos dois pontos de log. Conferido na saída real, não no
  comentário.
- **A hipótese de regressão em `checkout-*`.** O gate de lote fechou 60/60 numa máquina livre. A
  lane leu a própria medição corretamente.
- **A aritmética do painel.** 28 → 26 fecha, e os dois blocos removidos são os dois certos.

---

## Território

Não escrevi uma linha de código. Não commitei. Não deployei. Não subi nem derrubei emulator
(usei os que já estavam de pé). Escrevi **só este arquivo**.

---
---

# ADENDO · re-gate do delta PONTE-FIX

**Lane:** PONTE-REV (mesma revisora, contexto continuado) · **Data:** 11/08 04:56 → 05:05 (-03)
**Delta julgado:** `36510249` `ec517c5c` `1a3b024b` `369a512e` `5a952bc1` (HEAD `5a952bc1`)
**Handoff da lane:** `.nirvana/handoffs/leela-ponte-FIX-20260811.md`
**Escopo:** só o delta. Não re-rodei a suíte completa da landing — já a medi verde sozinha
(60/60 · 782/782 · 214,86 s) e a FIX a re-confirmou (61/61 · 811/811 · 215,89 s).

## VEREDITO DO DELTA · ✅ DEPLOY TÉCNICO LIBERADO

Os dois bloqueadores estão pagos, e pagos **na classe**, não na instância. As três ressalvas
também. Nenhum achado novo meu que trave o deploy.

| Item da REV | Estado | Prova que EU tirei |
|---|---|---|
| **B1** · dist envenenado + falta de guarda | ✅ **PAGO** | dist reconstruído e medido por símbolo de runtime; gate falsificado por mim em fixture isolada |
| **B2** · recusa de quem nunca digitou | ✅ **PAGO** | `nomeInicialDaProdutora` na fonte; 53/53 na suíte da ponte |
| **R1** · retorno descartado | ✅ **PAGO** | `resultado.nomeAplicado === false` na fonte; 13/13 contra banco real |
| **R2** · frase da paridade | ✅ **PAGO** | corrigida em 3 lugares; concordo com preservar o handoff antigo |
| **R3** · `aria-invalid` real | ✅ **PAGO** | `errorMessage` por spread condicional na fonte |

---

## B1 · re-medido, e não caí no falso-zero

**Contagem no `dist/` atual, por símbolo de RUNTIME, com `xyzzy` como controle:**

```
                              index.js   index.mjs      (era, na REV)
  promoverParaProfissional        4          3          4 / 3   ← inútil como probe
  nomeProfissional                3          3          0 / 0   ✅ 0 → 3
  intencao                        3          3          0 / 0   ✅ 0 → 3
  nome_profissional_invalido      1          1          0 / 0   ✅ 0 → 1
  intencaoRegistrada              0          0                   ← CORRETO, ver abaixo
  nomeAplicado                    0          0                   ← CORRETO, ver abaixo
  xyzzy (controle)                0          0

assinatura: `async function promoverParaProfissional(opcoes)`  nos DOIS arquivos  ✅
mtimes: dist 11/08 04:04  ×  fonte 11/08 03:46  → dist à frente
```

**A armadilha do eco: conferida, e a nota da lane está certa.** `intencaoRegistrada` e
`nomeAplicado` valendo **0** no `dist/` não é regressão. No api-client eles existem só como campo
de `interface` (`profissionais.ts:194` e `:201`) e alias de tipo (`:179`) — o compilador os apaga,
e o corpo da função devolve `data` cru, repassando o que o servidor mandar. Onde eles **precisam**
existir em runtime é no servidor, e lá estão: `PromoverParaProfissionalResult` os declara
**obrigatórios** e os dois `return` os preenchem, então o `tsc` impede que um ramo futuro esqueça
um deles. Não é falso-zero; é o zero certo.

**O eco está correto nos dois ramos.** `nomeAplicado: false` cravado no ramo do tenant (que não
escreve) e `nomeProfissional !== null && !jaExistia` no ramo da transação. `intencaoRegistrada`
ecoa o rótulo **registrado**, e não o cru — typo volta `invalida`, cliente velho volta
`nao_declarada`. É exatamente o que faltava para uma sonda distinguir servidor novo de velho.

### O gate de frescor · falsificado por mim, em fixture isolada

Não aceito guarda que eu não tentei quebrar. Montei um mini-repo sintético no scratchpad
(zero toque no repo real, zero mtime alterada em `C:\dev\LEELA`) e rodei o CLI de verdade:

```
CASO 1 · dist mais novo que a fonte
  → "[frescor] @f/app: 1 pacote(s) … à frente da fonte — @f/falso"      EXIT=0  ✅
CASO 2 · dist carimbado 24 h atrás
  → "⛔ … @f/falso: ./dist/index.js está 1440 min atrás da fonte"        EXIT=1  ✅
CASO 3 · dist ausente
  → "⛔ … @f/falso: dist/ AUSENTE (./dist/index.mjs)"                    EXIT=1  ✅
```

**Fail-closed de verdade**, com o arquivo culpado nomeado e o comando do conserto na tela.
E no repo real: `cd apps/landing && node ../../scripts/verificar-frescor-do-workspace.mjs`
→ `3 pacote(s) de workspace com dist/ à frente da fonte — @leela/api-client, @leela/core,
@leela/design-system` · **EXIT=0**.

**A fiação está no lugar certo.** `apps/landing/package.json` →
`"build": "node ../../scripts/verificar-frescor-do-workspace.mjs && next build"`. O `&&` é
fail-closed e roda em qualquer forma de invocação do script.

**A recusa do rebuild automático: concordo, e a razão é boa.** Reconstruir em silêncio esconderia
o erro de ordem, e `turbo run build` já cobre o caminho correto por `^build`. Um gate que **nomeia**
o defeito é melhor que um conserto invisível — é a mesma lógica do descarte silencioso que esta
rodada inteira persegue. Detecção grossa por mtime é a escolha certa aqui: falso positivo custa um
`tsup`; falso negativo custou dois deploys.

**Um buraco transitivo que eu procurei e NÃO existe.** Se o `tsup` embutisse `@leela/core` dentro
do `dist/` do api-client, uma mudança no core exigiria rebuild do api-client e o gate não veria.
Medi: `@leela/core` aparece **1×** em cada arquivo do dist (é `import`, não código embutido) —
o tsup o mantém externo por ser `dependency`. E `@leela/core` é dependência **direta** da landing,
então o gate já o cobre por si. A cobertura fecha.

**O achado novo da lane confere.** O design system estava 21 h atrás da fonte, com todos os gates
verdes — segundo caso vivo do mesmo defeito, pego na estreia do gate. `dist/index.mjs` agora é de
11/08 03:53. É a melhor prova de que a guarda era da classe, e não da instância.

## B2 · o campo já não recusa quem nunca digitou

`nomeInicialDaProdutora(nomeDaPessoa)` devolve `''` quando `derivarSlugOrganizacao` não sobra, e o
`useState` inicial passou a usá-la. `derivarSlugOrganizacao` vem **do core**, importada — não
nasceu segunda cópia da régua. A fronteira do conserto está certa, e é o ponto fino: **quem digita**
um nome que não vira endereço continua recusado, e tem de continuar, porque afrouxar o servidor
recriaria o descarte silencioso no exato lugar onde o endereço é cunhado uma vez.

A frase parou de mentir, nas duas superfícies (tela e servidor), e agora nomeia os **dois** eixos:
*"dois caracteres ou mais e pelo menos uma letra de A a Z ou um número"*. `ゆき` tem duas letras, e
a frase antiga a mandava contar letras que ela já tinha.

## R1 · o descarte ficou audível

- **Servidor:** `nomeAplicado: false` nos dois ramos idempotentes.
- **Tela:** `const resultado = await promoverParaProfissional({…})` e
  `setNomeNaoAplicado(nomeEnviado.length > 0 && resultado.nomeAplicado === false)`.

**O `=== false` é a escolha certa, e eu conferi na fonte** (`PortasDaConta.tsx:319`), não no
comentário. Contra um servidor anterior ao eco o campo chega `undefined`, e `undefined === false`
é `false` — nenhuma frase falsa aparece. `!resultado.nomeAplicado` teria inventado uma perda que
pode não existir. O guard `nomeEnviado.length > 0` impede o aviso para quem não digitou nada.

## R2 · concordo com o método, e com preservar o handoff antigo

**Concordo, e por escrito:** o handoff da PONTE-RESOLVE é artefato datado de outra lane.
Reescrevê-lo apagaria o registro do que se acreditava na hora, que é justamente o valor de um
handoff. A correção entra **marcada, com data e lane**, onde o dono lê — e entrou nos três lugares
certos: o comentário da função no servidor, o registro do maestro (`01-decisoes-maestro.md:47` e
`:51`) e o board (`V1-KANBAN.md`, cards S1234-T5 / S1234-REV2 / S1234-T9). A divergência agora está
**declarada como fail-safe** em vez de negada.

## R3 · `aria-invalid` real

`{...(fase === 'recusada' && recusa === 'nome_profissional_invalido' ? { errorMessage: … } : {})}`
— spread condicional, obrigatório sob `exactOptionalPropertyTypes: true`. As outras seis recusas
continuam no alerta do cartão de propósito: elas falam da **conta**, não de um campo. A frase sai
de um lugar só, o que evita anúncio duplo no leitor de tela.

---

## Números que EU rodei no re-gate

Foreground, série, uma por vez. Nada em background, nenhum watcher. Emuladores 8080/9099 reusados
(IPv4 explícito, host:porta completo), sem subir nem derrubar nada.

| Suíte | Resultado | Declarado | Antes do delta |
|---|---|---|---|
| `promocaoProfissionalFronteira` | **43/43** · 2,43 s | 43 ✅ | 34 |
| `promocaoProfissionalWrapper` | **9/9** · 1,92 s | 9 ✅ | 7 |
| `promocaoProfissionalPonte.integration` (emulator) | **13/13** · 5,15 s | 13 ✅ | 12 |
| `minha-conta-ponte-s1234` (landing) | **53/53** · 11,69 s | 53 ✅ | 51 |
| `build-frescor-dist` (novo) | **12/12** · 1,98 s | 12 ✅ | — |
| | **130 casos, cinco de cinco verdes** | | |

Mais o gate de frescor no repo real (EXIT=0) e as **três falsificações independentes** do gate em
fixture isolada. **Nenhum número da lane estava arredondado**, pela segunda vez.

⚠️ **Não caí na armadilha do CRLF** que a lane declarou: minhas falsificações não patchearam
arquivo por regex — usaram fixture sintética e carimbo de mtime, que são independentes de fim de
linha. Registro o método porque a armadilha é real e derruba falsificação por regex de `\n` nesta
árvore.

---

## Residuais — nenhum trava o deploy técnico

1. ⛔ **Conferência visual no navegador. Continua sendo GATE, DEPOIS do deploy técnico.** O cartão
   mudou de forma pela terceira vez (dois botões, um campo, e agora um erro dentro do campo e uma
   frase nova de sucesso). jsdom não desenha, e 130 testes verdes não substituem ver a tela.
2. **`apps/painel` tem a mesma exposição de `dist/`** — `"build": "vite build"`, sem o gate, e o
   `vite.config.ts` não apelida os pacotes `@leela/*`. Fiação de uma linha. **Não bloqueia este
   deploy** (o alvo é landing + functions), mas é o mesmo defeito esperando a vez. Card.
3. **O gate protege o script `build`, não o binário.** Quem rodar `npx next build` direto passa por
   fora. Mitigado por três lados (o script, o `^build` do turbo, e o `pnpm turbo run build` do CI),
   mas quem escrever o runbook precisa mandar o comando do pacote, nunca o binário cru.
4. **Board desatualizado num ponto.** O card-pai do E12 (`V1-KANBAN.md:341`) ainda diz *"o gate de
   lote da landing não foi pago nesta lane e é bloqueio declarado do deploy"*. Isso já é falso — o
   gate fechou verde **três vezes** em máquina livre (REV 782/782, FIX 811/811, e a contagem da FIX
   bate com a minha). Os cards filhos S1234-REV2 e S1234-T9 já contam a história certa; o pai
   precisa de uma linha. Registro, não código.
5. **`ERR_PNPM_IGNORED_BUILDS`** no `pnpm --filter @leela/api-client build` (`@sentry/cli` com
   `set this to true or false` no `allowBuilds`). É passo do runbook de deploy e **não é veto meu** —
   mas quem seguir o handoff ao pé da letra bate nele. Ou resolve o `allowBuilds`, ou usa
   `pnpm turbo run build --filter='@leela/landing...'`, que é o comando que o próprio gate imprime.
6. **R2.1** (unificar derivabilidade no core, ao lado de `validarCadastroOrganizador`) e **R4** (a
   premissa invertida da D-0802-1 no texto de dispatch) continuam de pé. Nenhum bloqueia.
7. **Sem axe-core.** `aria-invalid` e `aria-describedby` estão provados por teste de DOM, não por
   auditoria de a11y.

## Ordem de deploy — confirmada, e agora com rede

**functions → api-client (build fresco) → landing.** Continua necessária, e continua sendo a
primeira defesa. O que mudou é que ela deixou de ser a **única**:

- o **gate de frescor** recusa o build antes de gastá-lo, e nomeia o pacote culpado;
- o **eco da callable** deixa uma sonda de fumaça distinguir servidor novo de velho pela resposta
  (`intencaoRegistrada`/`nomeAplicado` chegando `undefined` = servidor anterior ao contrato);
- o **probe de conteúdo do runbook** continua valendo, mirando em `nomeProfissional`/`intencao` com
  `xyzzy` de controle — **nunca** em `promoverParaProfissional`, que dá falso verde.

Depois do deploy técnico: **conferência visual no navegador**, e só então "no ar".

**Emuladores:** deixo os dois como os encontrei, de pé em `127.0.0.1:8080` e `127.0.0.1:9099`. Não
são meus e há lane vizinha na árvore. Quem fechar a noite mata os dois explicitamente.

**Território deste adendo:** READ-ONLY. Zero commit, zero código, zero mtime tocada no repo. A
falsificação do gate rodou em fixture sintética no scratchpad. Escrevi só neste arquivo.

---

## ⛔ POST-SCRIPTUM · condição de árvore que trava a LARGADA do deploy (não é defeito da PONTE-FIX)

Rodei o gate de frescor duas vezes no repo real, com **cinco minutos** de intervalo. A primeira deu
**EXIT=0**. A segunda, esta:

```
⛔ [frescor] o build de @leela/landing consumiria dist/ DEFASADO.
   @leela/core: ./dist/index.mjs está 6463 min atrás da fonte
       (dist 2026-08-06T20:18:51Z  <  src 2026-08-11T08:01:57Z)
EXIT=1
```

**O que mudou entre as duas:** uma **lane vizinha** editou `packages/core` na árvore compartilhada,
e as mudanças estão **não commitadas**:

```
 M packages/core/src/eventos/inscrito.ts   (+32)
 M packages/core/src/index.ts              (+4)
 M packages/core/src/overview/kpis.ts      (+36 −5)
```

**Não é da PONTE-FIX** — nenhum dos três arquivos está no território declarado dela, e o diff não
contém `promover`, `organizacao`, `derivarSlug`, `intencao` nem `nomeProfissional`. Não é meu:
sou READ-ONLY. É trabalho em voo de outra lane.

### Duas leituras, e as duas importam

1. **O gate está VIVO no repo real, e não só na minha fixture.** Ele pegou um **terceiro** caso de
   `dist/` defasado — `@leela/core` com dist de 06/08 — minutos depois de dar verde. É a melhor
   prova possível de que a guarda do B1 era da classe. Ela já pagou três vezes: api-client (42 h),
   design-system (21 h) e agora core (4,5 dias).

2. **⛔ O deploy não pode LARGAR neste estado.** `@leela/core` é dependência **direta** da landing.
   Quem for deployar agora encontra duas saídas, e as duas são ruins:
   - respeita o gate e **não builda** (correto, e é o gate fazendo o trabalho); ou
   - reconstrói o core para satisfazer o gate e **embarca no bundle da landing o trabalho não
     commitado de outra lane** — código que ninguém revisou e que não está em nenhum commit do
     pacote que está sendo aprovado.

   A segunda é exatamente a família de defeito desta rodada inteira: artefato que não corresponde
   ao que foi revisado.

### Condição de largada, para quem for deployar

O pacote PONTE-RESOLVE + PONTE-FIX está **liberado**. O que falta não é dele:

- **antes de buildar**, a árvore precisa estar limpa em `packages/**` e `apps/landing/**` — ou a
  lane vizinha commita e passa pelo gate dela, ou o deploy espera;
- `pnpm turbo run build --filter='@leela/landing...'` com `git status` limpo, e o gate de frescor
  tem de sair **EXIT=0** com a árvore nesse estado;
- só então functions → api-client → landing, e depois a conferência visual no navegador.

Se o gate acusar `@leela/core` na hora do deploy, **isso não é ruído**: é ele dizendo que o bundle
não corresponde ao que foi revisado.
