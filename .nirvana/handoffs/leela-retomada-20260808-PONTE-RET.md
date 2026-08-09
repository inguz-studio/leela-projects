---
trace: leela-retomada-20260808
lane: PONTE-RET
employee: sf-frontend-lead
business: software-forge
repo: C:\dev\LEELA
branch: main
base: 1e5ee639
inicio: 2026-08-08 20:57 (-03)
estado: EM CURSO
---

# Handoff vivo — PONTE-RET

Atualizado a cada task. Se a lane morrer, a retomada lê este arquivo antes de qualquer coisa.

## Estado da máquina no início

`Get-CimInstance Win32_OperatingSystem` → `FreePhysicalMemory: 541792` KB de `TotalVisibleMemorySize: 8321488` KB.
**0,52 GB livres de 7,94 GB.** O emulator da T3 é o risco aberto da lane desde o minuto zero.

## Linha do tempo

| Hora | Task | O que aconteceu |
|---|---|---|
| 20:57 | T0 | Leitura da persona, do brief e do dispatch. Repo em `1e5ee639`, árvore com o staged alheio da SEAL-DEFAULTS + `DECISOES-ABERTAS-TRIAGEM.md` modificado (também da SEAL-DEFAULTS). |
| 21:00 | T1 | Varredura do território antes de tocar em código. **A premissa do brief sobre "Criar Club" está factualmente errada** — ver achado A1 abaixo. |
| 21:04 | T1 | Rótulo trocado, cartão redesenhado, testes atualizados e três guardas novas escritas. |
| 21:05 | T2 | Gates re-provados do zero. Um vermelho na suíte cheia, diagnosticado como flake de carga (achado A3). |
| 21:09 | T2 | Fronteira re-provada **e falsificada de propósito** — achado A4. |
| 21:12 | T1 | Painel canônico e registro da rodada escritos (PONTE-CTA-1 + `06-desenho-do-cartao.md`). |

---

## Achados

### A1 · A criação de clube EXISTE como superfície. O que não existe é medição.

O brief e o dispatch partem de que "criação de clube não existe como superfície hoje". A varredura
diz outra coisa:

- `apps/painel/src/routes/clubes/novo/NovoClubePage.tsx` — tela de criação de clube **construída**,
  com formulário, validação do core (`validarClube`), slug derivado e `codigoConvite` gerado no
  submit (RN-101).
- `apps/painel/src/routes/clubes/ClubesRoutes.tsx:45` — rota `/clubes/novo` registrada.
- `apps/painel/src/routes/clubes/hub/HubClubes.tsx:114` — CTA "+ Criar clube" no hub, navegando
  para `/clubes/novo` (`HubRoute.tsx:22`).

O que trava a criação **não é a ausência de tela** — é o mesmo portão de tudo o mais:

- `NovoClubePage.criar()` exige `session.tenantId`; sem tenant, ele para em "Sessão não autenticada".
- `apps/painel/src/App.tsx:62` embrulha a árvore inteira de rotas no `ContaTravadaGate`, que troca
  o painel pela `VitrinePainel` para conta sem tenant. Logo `/clubes/novo` **nem monta** para a
  conta recém-promovida.
- A vitrine nomeia as duas áreas com o mesmo peso: `areasDaVitrine.ts` tem `/eventos` → "Eventos" e
  `/clubes` → "**Clubs**" (a grafia da casa é a do dono).
- `resgatarConviteOrganizador` → `provisionTenantCore` dá o tenant. Depois do código, **as duas**
  áreas abrem.

**Consequência para o desenho:** "Criar Club" e "Organizar eventos" são **simétricas**. Nenhuma das
duas espera superfície nova; as duas esperam o mesmo código de convite, e as duas já estão nomeadas
na vitrine. A assimetria que o brief supôs não existe.

### A2 · Não há medição nenhuma na landing.

`grep -rln "gtag|plausible|posthog|analytics|logEvent|mixpanel" apps/landing` (fora de
`node_modules` e `.next`) devolve **zero arquivos**.

Isso mata a versão "dois botões lado a lado": dois CTAs que disparam a **mesma** promoção, sem uma
linha de telemetria, não medem qual converte. Seria um teste que não testa, cobrando da pessoa uma
decisão a mais num cartão cuja função é justamente desbloquear um caminho quebrado.

---

### A3 · A suíte cheia da landing não é gate confiável nesta máquina.

`npx vitest run` em `apps/landing` (60 arquivos, paralelo) deu **1 vermelho**:

```
FAIL test/entrar-overlay-s1221.test.tsx > "Entrar" é botão e abre o overlay — não navega para outra origem
Error: Test timed out in 20000ms.
Test Files  1 failed | 59 passed (60)
Tests       1 failed | 768 passed (769)
```

Isolado, o **mesmo teste passa em 5,1 s**:

```
npx vitest run test/entrar-overlay-s1221.test.tsx
✓ test/entrar-overlay-s1221.test.tsx (23 tests) 5766ms
Test Files  1 passed (1)   Tests  23 passed (23)
```

Diagnóstico: **flake de carga, não regressão.** O arquivo não tem relação com a ponte, e a máquina
tem 0,5 GB livres — o `collect` da rodada cheia levou 533 s contra 317 ms no isolado. É a mesma
família de problema que o brief descreve para a suíte de functions, e vale registrar que ela também
existe na landing: **vermelho de carga é indistinguível de regressão em rodada cheia aqui.**

Não mexi no arquivo. O gate que sustento é o dos arquivos rodados em isolamento.

### A4 · A prova de fronteira é de verdade — falsifiquei para saber.

19 casos verdes não provam nada se o teste não souber ficar vermelho. Injetei o símbolo proibido e
rodei duas vezes:

**Tentativa 1 — como comentário.** Continuou verde, e está **certo**: o teste tira comentários
antes de olhar (`.replace(/^\s*\/\/.*$/gm, ' ')`). Uma menção em comentário não é uma chamada. A
minha primeira injeção é que era inválida como falsificação.

**Tentativa 2 — como código real**, uma linha antes do `logger.info` do core:

```ts
await admin.auth().setCustomUserClaims(caller.uid, { role: 'tenant_owner' });
```

```
Test Files  1 failed (1)
Tests       6 failed | 13 passed (19)
❯ Module.promoverParaProfissionalCore src/platform/promoverParaProfissional.ts:256:15
```

**6 dos 19 casos caem.** A guarda é executável e falsificável — não é comentário prometendo gate,
que é o defeito de 06/08.

Restaurado byte a byte a partir de cópia (`cp` de backup, sem `git checkout`, sem `stash`):
`git status --short functions/src/platform/promoverParaProfissional.ts` devolve **vazio**, e a
re-rodada volta 19/19 verdes.

---

## T1 · Decisão de desenho — PONTE-RET-D1

**Registro completo:** `leela-specs/02-rodadas/2026-08-06-painel-cliente/06-desenho-do-cartao.md`
**Painel canônico:** `leela-specs/01-produto/DECISOES-ABERTAS.md` → item novo **PONTE-CTA-1**
(painel de 60 para 61; contagem corrigida no cabeçalho).

**A decisão, em uma linha:** uma porta com o nome do lugar — CTA **"Painel Profissional"**, texto
exato do dono —, o título do cartão nomeando as **duas intenções** que ele pediu, e as outras duas
variantes de rótulo escritas ao lado numa constante única (`ROTULO_DA_TRAVESSIA`), a uma linha de
distância.

**Por que não os dois botões:** não é falta de superfície (achado A1 — a criação de clube existe),
é falta de **medição** (achado A2). Dois CTAs disparando a mesma promoção, sem telemetria, não dizem
qual converteu.

**Fora de escopo, declarado:** os dois CTAs simultâneos · a infra de medição · qualquer construção
de criação de clube · deep-link para a área escolhida (exigiria parâmetro de redirecionamento
atravessando duas origens de Hosting) · a conversa de vocabulário "eventos/Club" × "experiência".

### Premissas que assumi sozinho (o dono não estava na mesa)

1. **"a primeira é" é ordem, não ênfase.** Li o recado do dono como fila de variantes e não como
   cartão de dois botões. Se ele quis os dois lado a lado, é uma linha de código — e aí a pergunta
   da medição fica de pé do mesmo jeito.
2. **Mantive a capitalização "Painel Profissional"** no rótulo, como o dono escreveu, e uso
   minúscula em prosa corrida. É nome de lugar, não título.
3. **`data-slot` renomeado** de `conhecer-painel-profissional` para `ponte-cta-painel-profissional`:
   um seletor batizado com o texto de um rótulo apodrece na primeira troca de variante. Só o teste
   referenciava.
4. **Não toquei em `portaOrganizador.ts`.** O comentário pinado da FRONTEIRA-AUTH (linhas 52-68) e
   o papel literal seguem intactos.
5. **Não toquei no contrato da callable.** Nenhum campo de "intenção" viaja ao servidor: o artefato
   que a DEPLOY-PONTE vai publicar é bit a bit o de `35a85f04`.

---

## T2 · Os gates, re-provados do zero

Tudo abaixo foi executado nesta lane, hoje. Nada é herdado de `35a85f04`.

| # | Comando | Resultado |
|---|---|---|
| 1 | `cd apps/landing && npx vitest run test/minha-conta-ponte-s1234.test.tsx test/minha-conta-portas-s1222.test.tsx` | **38/38 verdes**, 2 arquivos |
| 2 | `cd apps/landing && npx vitest run` (suíte cheia) | 768/769 · 1 flake de carga → **achado A3** |
| 3 | `cd apps/landing && npx vitest run test/entrar-overlay-s1221.test.tsx` | **23/23 verdes** em 5,1 s (isola o flake) |
| 4 | `cd apps/landing && npx tsc --noEmit` | exit **0** |
| 5 | `cd apps/landing && npx eslint app lib --max-warnings 0` | exit **0** |
| 6 | `cd apps/landing && npx eslint test/minha-conta-ponte-s1234.test.tsx test/minha-conta-portas-s1222.test.tsx --max-warnings 0` | exit **0** |
| 7 | `cd functions && npx vitest run src/__tests__/promocaoProfissionalFronteira.test.ts` (**arquivo a arquivo**, nunca em lote) | **19/19 verdes** |
| 8 | falsificação da fronteira (injeção de `setCustomUserClaims` real) | **6/19 vermelhos** → **achado A4** |
| 9 | `cd functions && npx tsc --noEmit` | exit **0** |
| 10 | `cd functions && npx eslint src --max-warnings 0` | exit **0** |
| 11 | `cd packages/api-client && npx tsc --noEmit` | exit **0** |
| 12 | `cd packages/api-client && npx eslint src --max-warnings 0` | exit **0** |

**Ressalva do #5, para a PONTE-REV:** o script de lint da landing é `eslint app lib` — ele **não
cobre `test/`**. Rodei os dois arquivos de teste tocados à mão (#6) para não deixar o buraco calado,
mas o buraco existe no projeto e não é desta lane consertar.

Os 38 casos do #1 incluem **três guardas novas** que escrevi junto do rótulo, para que a decisão de
desenho não se desfaça em silêncio na próxima mão:

- o CTA é exatamente `Painel Profissional`, sem paráfrase, sem "conhecer", sem "virar";
- o cartão nomeia as duas intenções (`/eventos/i` e `/clubs?/i`);
- o cartão tem **um** botão — um segundo CTA sem medição derruba o teste;
- e nenhum link da área alcança `/clubes`, porque a criação mora no painel, atrás do tenant.

---

## T3 · A4 — a demonstração que nunca tinha acontecido

O emulator **subiu**. O risco de RAM não se materializou: no instante da subida a máquina tinha
**1,14 GB livres** (`FreePhysicalMemory: 1169300`), acima dos 0,52 GB do início. Subi só o
necessário — `--only firestore,auth`, sem UI e sem o emulator de functions.

### O comando, inteiro

```
LEELA_USE_EMULATOR=1 LEELA_CLOCK=2026-03-15 \
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
npx firebase-tools@13 emulators:exec --only firestore,auth --project demo-leela \
  "cd functions && npx vitest run src/__tests__/promocaoProfissionalPonte.integration.test.ts"
```

**Duas notas de operação, para quem repetir:**

1. A porta é **8080**, não 8180 — é o que está no `firebase.json` deste repo (`emulators.firestore.port`).
   O 8180 do brief é a config de preview. `FIRESTORE_EMULATOR_HOST` está setado **explicitamente**,
   que é o que impede a suíte de sair `skipped` com exit 0.
2. `emulators:exec` roda o script a partir da **raiz** (onde vive o `firebase.json`), e ali `vitest`
   não resolve. A primeira tentativa morreu com `'vitest' não é reconhecido`. O `cd functions &&`
   dentro do script resolve.

### A saída

```
✓ src/__tests__/promocaoProfissionalPonte.integration.test.ts (7 tests) 7991ms
Test Files  1 passed (1)
Tests       7 passed (7)
+  Script exited successfully (code 0)
```

### Os seis passos, e o que foi observado em cada um

| Passo do dispatch | Provado? | Como, e o que se viu |
|---|---|---|
| 1 · participante logada clica na porta | **sim**, a parte de servidor | O caso monta a conta como o produto a produz: usuário Auth nomeado, claim `athlete`, doc `atletas/{uid}`. O clique em si é tela — coberto pelos 38 casos da landing |
| 2 · `profissionais/{uid}` nasce em `aguardando_convite`, com termo carimbado pelo servidor | **sim** | Doc criado; `statusOnboarding: 'aguardando_convite'`; `versao`/`finalidade` da RN-466; **`aceitoEm` volta como `Timestamp` de verdade** — só um banco real resolve `serverTimestamp`, e é por isso que este caso não existia antes. `tenantId` ausente, `telefone`/`organizacao` vazios |
| 3 · aterrissa na vitrine (RN-510) | **sim, por outra prova** | `vitrine-sem-query.test.tsx` (10 casos) + `vitrine-interacao.test.tsx` (10) + `destinoPosLogin.test.ts` — **37/37 verdes**. Não é o mesmo que um navegador atravessando |
| 4 · o aviso sobe na **primeira interação**, não antes | **sim, por outra prova** | `vitrine-interacao.test.tsx`, no mesmo lote de 37 |
| 5 · o código resgata e destrava | **sim** | `resgatarConviteCore` rodou **em cima do doc que a ponte criou**: `statusOnboarding` → `ativo`, `tenantId` gravado, claim vira `role: tenant_owner` + `tenantId`. E o consentimento que a **ponte** carimbou sobreviveu ao resgate |
| 6 · o papel `athlete` sobrevive | **sim** | `atletas/{uid}` intacto depois da promoção; `customClaims` continua exatamente `{ role: 'athlete' }`; os dois documentos convivem (RN-450) |
| idempotência | **sim, nas duas formas** | Sequencial: segunda chamada devolve `jaExistia: true`, **um** doc, e o `aceitoEm` é **o mesmo milissegundo** (RN-467 — consentimento carimbado não se recolhe). Concorrente: duas promoções em `Promise.all` → `[false, true]`, um doc |
| as recusas contra banco real | **sim** | `conta_de_plataforma`, `aceite_ausente` e `aceite_datado_pelo_cliente` recusam **sem escrever nada** |

### O que este arquivo NÃO prova, dito antes que a review descubra

- **Não é um navegador.** Ninguém clicou. O que rodou foi o **core** (`promoverParaProfissionalCore`)
  contra Firestore e Auth de verdade; o wrapper `https.onCall` — que só destrincha `context.auth` e
  delega — não foi exercitado por HTTP. Uma travessia de navegador entre duas origens de Hosting
  precisa das duas apps servidas, e a máquina não comporta isso hoje.
- **O trigger `onCreateUser` não rodou** (o emulator de functions não subiu). O `atletas/{uid}` foi
  gravado à mão para reproduzir o efeito dele. O ponto do caso não é o trigger: é que a promoção
  **não encosta** nesse documento, e para isso ele precisa existir antes.
- **Nada foi exercitado contra produção.** Continua verdade o que o trailer de `35a85f04` dizia
  sobre produção.

### ⚠️ A5 · O achado da demonstração: o tenant nasce com o nome da PESSOA, e não dá para trocar

Observado no log do resgate, não esperado:

```
{"tenantId":"ana-paula","ownerUid":"lF7Td…","message":"provision_tenant_auto_cadastro"}
```

A conta de teste se chama "Ana Paula" e **não tem organização** — a ponte grava `organizacao: ''`
de propósito, porque não tem formulário. No resgate, `sementeDoSlug` tenta
`organizacao → nome → local-part do e-mail` e cai no **nome da pessoa**. O `tenantId` sai `ana-paula`.

Por que isso não é cosmético:

- `tenantId == slug`, determinístico, e o slug **é o docId do tenant**. DocId não se edita.
- Varri por caminho de renomeação (`renomear|renameTenant|alterarSlug|mudarSlug` em `apps`,
  `functions`, `packages`): **não existe nenhum**.
- O comentário da ponte diz *"a pessoa preenche o perfil dela no painel"* — e preencher
  `organizacao` **depois** não muda o slug, porque ele já foi cunhado no resgate. Quem entra pela
  ponte e só depois registra a produtora fica com um identificador permanente com o nome próprio.

**O que eu NÃO verifiquei, e não vou afirmar:** se esse `tenantId` chega ao endereço público. A
rota `/@{handle}` da landing lê `perfis/{handle}` (E17), que é coleção **separada** com handle
próprio. Se o handle é semeado pelo slug do tenant no dia em que o perfil nascer, o nome pessoal
vira URL pública e a RN-160 a torna imutável — mas isso é hipótese minha, não medição. **Vetor
nomeado para a PONTE-REV.**

Não consertei. Consertar significaria pedir o nome da organização na ponte (formulário que a
decisão de produto tirou de propósito) ou adiar a cunhagem do slug para depois do perfil — as duas
coisas são decisão de produto, não ajuste de rótulo, e nenhuma cabe numa lane de véspera de review.

---

## Colunas de honestidade

| Item | Construído | Revisado | NO AR |
|---|---|---|---|
| Ponte — callable + cartão (`35a85f04`) | sim, 06/08 | **não** — PONTE-REV é a wave 2 | **NÃO** |
| Rótulo novo do cartão (`ca72625c`) | sim, 08/08 | **não** | **NÃO** |
| Gates re-provados do zero | sim, 08/08 | n/a | n/a |
| A4 contra emulator (`+ commit T3`) | sim, 08/08 — 7/7 | **não** | n/a |
| Fronteira falsificada de propósito | sim, 08/08 — 6/19 caem | n/a | n/a |
| Achado A5 (tenant com nome da pessoa) | só **relatado** | — | — |

**Nada desta lane está resolvido.** Está construído e provado, que é coisa diferente. A porta
quebrada da área do cliente **continua quebrada em produção** neste minuto: a participante logada
que clica ainda vai para o `/cadastrar` do painel. Só a DEPLOY-PONTE muda isso, e só depois da
PONTE-REV.

## O que a DEPLOY-PONTE precisa subir

1. **A callable `promoverParaProfissional`** — nova. Sem ela o botão vira 404, exatamente como as
   três portas do organizador já foram (o precedente está no LGPD-1 do painel: produção tinha 88
   functions e o repositório exportava 89).
2. **O bundle da landing** — o cartão com o rótulo novo.

O contrato da callable **não mudou nesta lane**: o que vai ao ar é bit a bit o de `35a85f04`.
Âncora de baseline para a prova por diff/hash: `.nirvana/handoffs/leela-redeploy-painel-20260806.md`,
nunca a memória do maestro.

## Vetores que deixo nomeados para a PONTE-REV

1. **A5** — o `tenantId` cunhado com o nome da pessoa chega ao `/@handle` público? Eu não medi.
2. **O wrapper `https.onCall`** nunca foi exercitado por HTTP; só o core rodou contra emulator.
3. **A leitura de "a primeira é"** como ordem de variantes é minha, e o dono pode ter querido dois
   botões (PONTE-CTA-1).
4. **A suíte cheia da landing não é gate** nesta máquina (A3) — o verde que sustento é o dos
   arquivos isolados.
5. **`eslint app lib` não cobre `test/`** — buraco do projeto, contornado à mão nesta lane.
