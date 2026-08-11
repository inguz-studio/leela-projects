# PONTE-RESOLVE · os pontos de ponte do painel do Obsidian

**Trace:** `leela-redesign-v2-20260810` · lane **PONTE-RESOLVE** · **Employee:** `sf-frontend-lead`
**Repo:** `C:\dev\LEELA` · branch `main` (árvore compartilhada — `commit --only` sempre)
**Início:** 11/08 02:25 (-03) · **HEAD de partida:** `f9ed402b`

---

## Ordem

Do dono, dormindo: *"resolve os pontos de 'ponte' no obsidian"*. Autonomia delegada, com três
resoluções cravadas pelo maestro. Esta lane foi dona de
`leela-specs/01-produto/DECISOES-ABERTAS.md` esta noite.

| Item | Resolução | Estado ao fim |
|---|---|---|
| PONTE-ELEGIVEL-1 | BUILD — alinhar as recusas da porta ao critério do portão | **já estava construído em 09/08** · re-provado aqui |
| PONTE-CTA-1 | BUILD — dois CTAs + campo `intencao` na callable | **construído, provado, NÃO no ar, sem review** |
| PONTE-NOME-1 | origem, com juízo de esforço | **construído na origem, provado contra banco real, NÃO no ar, sem review** |

⛔ Nenhum deploy nesta lane. ⛔ `portaOrganizador.ts:52-68` não foi tocado — o arquivo inteiro
ficou fora do território.

---

## Item 1 · PONTE-ELEGIVEL-1 — a correção de coerência já existia

**O que encontrei, e é diferente do que a ordem supunha.** O item **não está no painel** e não
está por escolha registrada: o corte de 09/08 o decidiu (*"a porta ganha a sexta recusa nomeada"*,
`02-rodadas/2026-08-09-corte-painel/01-decisoes-maestro.md`, com **"Reabre quando: não reabre"**) e
a lane BUILD-PONTE-RECUSA o construiu no mesmo dia (`2271fd78`, `38420cb6`, `9f75c286`). A régua
mora em `functions/src/platform/elegibilidadeOrganizador.ts`, sozinha, e as duas guardas a importam.

**Os dois perfis vazantes já têm caso próprio**, e não precisei acrescentar nenhum: o divulgador e
a rebaixada com documento antigo estão na A4 desde 09/08, contra banco real. A suíte de fronteira
não tem 19 casos e sim **23** — os 19 são o número da PONTE-REV de 08/08, antes de a sexta recusa
existir.

**Prova re-executada em 11/08 (sem tocar em código):**

```
cd C:\dev\LEELA\functions
npx vitest run src/__tests__/elegibilidadePortaVersusPortao.test.ts   → 31 passed (31)
npx vitest run src/__tests__/promocaoProfissionalFronteira.test.ts    → 23 passed (23)   [antes das minhas]
npx vitest run src/__tests__/promocaoProfissionalWrapper.test.ts      →  7 passed  (7)
# contra emulator (Firestore 8080 + Auth 9099, IPv4 explícito)
npx vitest run src/__tests__/resgateConvite.integration.test.ts
    + conviteOrganizadorCore + elegibilidadePortaVersusPortao        → 65 passed (65)
```

**O que continua devendo, e não é meu:** a review antagonista deste item, que o corte de 09/08
declarou obrigatória por mudar contrato de chamada. Ela nunca aconteceu. A REV desta lane deve
cobrir os três de uma vez — o contrato mudou de novo aqui.

---

## Item 2 · PONTE-CTA-1 — os dois CTAs subiram, com o carimbo que os torna legíveis

**Decisão aplicada.** Dois botões, "Criar Club" e "Organizar eventos", cada um carimbando
`intencao` na callable. "Painel Profissional" — a palavra do dono — virou o **título** do cartão,
então os três rótulos que ele pediu existem, cada um no lugar que lhe cabe.

**Contrato.** `intencao?: 'eventos' | 'clube'`. Telemetria pura: **nunca recusa**. Ausente vira
`nao_declarada`, desconhecido vira `invalida`, e os dois estados são distintos **por regra** — a
landing no ar hoje manda só `{ aceiteTermo: true }`, então fundir os dois faria um typo de deploy
novo desaparecer dentro do volume do deploy velho e a medição diria que ninguém clicou. O log sai
nos **dois** desfechos de sucesso, inclusive o `jaExistia` do passo do tenant, que retorna cedo.

**Copy e vocabulário.** Os dois rótulos são as palavras do dono e nenhum texto do cartão ganhou ou
perdeu ocorrência de "experiência" ou "participante". ⚠️ **Uma correção de premissa que a REV
precisa conferir:** o dispatch desta lane diz que a D-0802-1 **bane** "experiência"/"participante";
o cânone diz o oposto, em verbatim do dono (`LEELA-E12-landing.md:131`) — os dois são o **guarda-
chuva obrigatório**, e o que a D-0802-1 bane é corrida/prova/atleta como categoria do produto.
Segui o cânone e não introduzi nem removi nenhum dos dois termos, então a decisão não depende de
qual leitura vence. Mas a divergência está aqui por escrito.

**Guardas de tela (quebram de propósito):** exatamente dois botões; intenções distintas; enquanto
um corre, o outro não aceita clique — uma travessia carimba **uma** intenção, e permitir duas
estragaria a medição que os botões existem para produzir.

---

## Item 3 · PONTE-NOME-1 — resolvido na origem, e coube na noite

**Decisão aplicada.** A porta pergunta o **nome da produtora**, pré-preenchido com o nome da
pessoa e editável, e o campo desce até `organizacao`.

**Por que coube, e a ordem previa que pudesse não caber.** O batismo já lê `organizacao`: o
`sementeDoSlug` do resgate tenta organização, depois nome, depois o pedaço do e-mail antes do
arroba. Preencher o primeiro degrau **não mexe em provisionamento de tenant nenhum** — o resgate
continua lendo o mesmo campo, do mesmo jeito. O custo real foi um campo na tela e uma régua no
servidor, não uma migração. Por isso não escrevi spec: construí.

**O pré-preenchimento não é invenção da tela.** Ele mostra o default que já existia em silêncio.
E **sem `name` no token o campo nasce vazio**: repetir ali o degrau seguinte do servidor daria cara
de escolha a um palpite que ninguém fez.

**Nome inválido é recusa nomeada, a sétima** (`nome_profissional_invalido`), e não descarte
silencioso — descartar é o próprio defeito que o item existe para matar. Régua de três partes: 2 a
80 caracteres (`ORGANIZACAO_MIN/MAX`, os mesmos do `/cadastrar`, para as duas portas não aceitarem
coisas diferentes) **e** o slug derivado precisa sobrar. `"!!"` tem o comprimento e vira `''`.

**O que NÃO construí, de propósito:** renomear depois. Continua card separado — exige abrir escrita
em `profissionais/{uid}` mais migração de tenant para o endereço interno. A janela que faz este
conserto chegar a tempo está medida: a **porta está no ar desde 08/08**, mas o resgate do código
**não está** (404 medido em 04/08, três chamadas da porta do organizador) e a semente do primeiro
código segue retida pelo LGPD-1. Enquanto isso durar, ninguém teve slug cunhado.

---

## Commits

| # | Hash | O que |
|---|---|---|
| 1 | `e48032a8` | contrato do servidor: `intencao` + `nomeProfissional` + a sétima recusa (functions, api-client, 2 suítes) |
| 2 | `6cfb5fe2` | o cartão: dois CTAs, o campo do nome, as suítes da landing |
| 3 | `8f447b12` | a A4 ganha o batismo provado contra o banco que cunha o slug |
| 4 | `5973434b` | painel canônico, rodada, RN-512/513 e board |

`git commit --only` com pathspec explícito em todos. Sem `add -A`, sem `--amend`, sem `stash`.
Push depois do 2 e do 3.

---

## Provas (comando → saída)

```
# --- servidor, sem emulator ---
cd C:\dev\LEELA\functions
npx vitest run src/__tests__/promocaoProfissionalFronteira.test.ts
  → 34 passed (34)     [eram 23; +11 desta lane]
npx vitest run src/__tests__/promocaoProfissionalWrapper.test.ts
  → 7 passed (7)       [a sétima recusa entrou no caso das recusas serializadas]
npx vitest run src/__tests__/elegibilidadePortaVersusPortao.test.ts
  → 31 passed (31)

# --- contra emulator (Firestore 127.0.0.1:8080 + Auth 127.0.0.1:9099, LEELA_CLOCK=2026-03-15) ---
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
  npx vitest run src/__tests__/promocaoProfissionalPonte.integration.test.ts
  → 12 passed (12)     [eram 9; +3 desta lane]
     inclui: com nome escolhido → tenantId = 'castelo-producoes'
             sem nome escolhido → tenantId = 'ana-paula'   (o defeito, medido)
             nome que não vira slug → recusa antes de qualquer escrita

FIRESTORE_EMULATOR_HOST=... npx vitest run resgateConvite.integration + conviteOrganizadorCore
  + elegibilidadePortaVersusPortao
  → 65 passed (65)

# --- landing ---
cd C:\dev\LEELA\apps\landing
npx vitest run --maxWorkers=3 --minWorkers=1 \
    test/minha-conta-ponte-s1234.test.tsx test/minha-conta-portas-s1222.test.tsx
  → 51 passed (51)     [eram 39; +12 desta lane]

# --- gates ---
functions      : tsc --noEmit → 0 · eslint src --max-warnings 0 → 0
api-client     : tsc --noEmit → 0 · eslint src --max-warnings 0 → 0
landing        : tsc --noEmit → 0 · eslint app lib --max-warnings 0 → 0
```

### Falsificações — seis, cada guarda desligada e restaurada

```
F1  organizacao volta a nascer sempre vazia          → 1 falha  (fronteira)
F2  `invalida` fundida em `nao_declarada`            → 1 falha  (fronteira)
F3  nome inválido descartado em silêncio             → 2 falhas (fronteira)
F4  a chamada perde a `intencao`                     → 2 falhas (landing)
F5  o campo perde o pré-preenchimento                → 1 falha  (landing)
F6  um botão só (o estado de 08/08)                  → 10 falhas (landing)
# todas restauradas e re-verdes: 34/34 e 36/36
```

### ⚠️ A suíte cheia da landing NÃO fechou, e eu não vou arredondar isso

Duas execuções dos 60 arquivos, e as duas vermelhas:

```
run 1 (com o emulator de pé)          → 7 arquivos vermelhos · 53 verdes · 421 s
run 2 (pnpm --filter ... test:gate)   → 9 arquivos vermelhos · 51 verdes · 531 s · EXIT=1
```

**Por que eu leio isso como carga, e não como regressão — com o que sustenta cada parte:**

1. **O conjunto de arquivos vermelhos MUDOU entre as duas execuções.** `checkout-asaas-teto` e
   `checkout-s1209-rev-ataque` caíram na run 1 e passaram na run 2; `checkout-s1217`,
   `checkout-s1225`, `checkout-s1228` e `minha-conta-dados` passaram na run 1 e caíram na run 2.
   Regressão não anda de lugar.
2. **Onze das treze falhas são `Test timed out`** (6 de 20 s, 5 de 5 s); as duas `AssertionError`
   são spy não chamado, que é o mesmo timeout um nível acima.
3. **A máquina está dividida.** 11 processos `node` vivos durante a medição — a outra lane do trace
   está trabalhando nesta mesma árvore. O `collect` da run 2 sozinho somou **871 s**.
4. **O grupo que eu toquei roda verde junto, na mesma máquina carregada:**
   ```
   npx vitest run --maxWorkers=3 --minWorkers=1 \
     test/minha-conta-{ponte-s1234,portas-s1222,s1222,dados-s1222,clubes-s1222}.test.tsx \
     test/porta-organizador.test.tsx
     → Test Files 6 passed (6) · Tests 105 passed (105) · 25,49 s
   ```
   Vinte e cinco segundos para os seis arquivos que a suíte cheia levou minutos a estourar.

**O que isso NÃO prova, e é o que a REV precisa fechar:** que os 60 arquivos passam. Em 08/08 a
suíte cheia fechou 60/60 e 769/769 com este mesmo script, então o gate **já foi confiável nesta
máquina** — e hoje não é. Enquanto ele não fechar verde numa máquina livre, **o gate de lote da
landing não está pago**, e eu não conto isso como prova. Fica como bloqueio declarado do deploy,
não como pendência menor.

---

## ⚔ Vetores para a review antagonista (obrigatória antes de qualquer anúncio de conserto)

1. **A fronteira continua fechada?** A promoção segue sem conceder nada — mas o contrato cresceu
   em dois campos. Injetar um `setCustomUserClaims` real no módulo e confirmar que a guarda de
   fonte ainda derruba os casos que derrubava (era 6/19 na PONTE-REV, 6 na BUILD-RECUSA).
2. **`nomeProfissional` é escrita de cliente num campo que o resgate lê depois.** Ele entra em
   `organizacao`, que vira `nome` e `slug` do tenant. Atacar: nome com HTML, com `../`, com
   caracteres de controle, com o nome de um tenant que já existe, com um slug reservado
   (`admin`, `leela`, `plataforma`). O `slugLivre` desempata com sufixo, e nenhuma Rule compara
   `tenantId` com literal — **mas isso foi medido em 08/08 e precisa ser re-medido agora que o
   valor vem de fora**, e não mais do formulário de cadastro com Rule de shape.
3. **A régua de 2 a 80 é a mesma do `/cadastrar`?** Se o `/cadastrar` aceitar algo que a porta
   recusa (ou o contrário), nasceu a segunda cópia da lista que o PONTE-ELEGIVEL-1 existe para
   impedir — agora em validação de nome.
4. **Os dois estados de ausência da intenção.** Conferir que `nao_declarada` e `invalida` não se
   fundem em nenhum caminho, e que o cliente velho (`{ aceiteTermo: true }` puro) atravessa. Se as
   functions subirem antes da landing, **toda** travessia é `nao_declarada` — e isso tem de ser
   verdade, não acidente.
5. **A ordem do deploy.** Functions primeiro, landing depois. A landing nova com functions velhas
   manda `intencao` e `nomeProfissional` para um servidor que ignora os dois: a pessoa digitaria o
   nome, veria sucesso e ficaria com `organizacao: ''` — o defeito de volta, agora com cara de
   conserto. Este é o vetor mais caro da lane.
6. **PII no log.** `intencao` é um de quatro rótulos fechados e o nome entra como **booleano**.
   Conferir que nenhum caminho de log carrega a string do nome.
7. **O idempotente contra o nome.** Segunda chamada com nome diferente devolve `jaExistia: true` e
   **não** reescreve `organizacao` (RN-467). É correto, e é também uma limitação: quem errou o nome
   na primeira travessia não conserta pela porta. Julgar se isso merece frase na tela.
8. **A11y do campo novo.** `Input` do DS com `label` e `hint`; não passou por axe-core nem por
   navegador nesta lane.
9. **O guarda dos dois botões.** Confirmar que ele quebra com três botões e com dois botões de
   intenção igual — foi escrito para isso.
10. **A divergência de vocabulário da D-0802-1** (ver item 2 acima). Decidir qual leitura vale e
    registrar, porque ela vai reaparecer no próximo brief de copy.
11. **O gate de lote da landing, que eu não paguei.** Rodar os 60 arquivos numa máquina livre. Se
    fechar verde, o vermelho desta noite era contenção e o registro acima fica como medição. Se
    **não** fechar, existe regressão em `checkout-*` / `definir-senha` / `entrar-overlay` — que
    esta lane não tocou — e ela é anterior a mim.

---

## O que precisa de deploy

Nada subiu. Para ir ao ar, **nesta ordem**:

1. **Functions** — `promoverParaProfissional` (contrato novo, retrocompatível: os dois campos são
   opcionais e o cliente velho atravessa como `nao_declarada`).
2. **api-client** — `pnpm --filter @leela/api-client build` **antes** do build da landing. A
   armadilha de 08/08 foi exatamente esta: o `dist/` 423 min atrás da fonte não continha o símbolo
   que a tela importa. Aqui a assinatura de `promoverParaProfissional` mudou (passou a aceitar
   argumento), então um `dist/` velho compila e manda o payload errado.
3. **Landing** — o bundle com o cartão novo.

⚠️ Depois do deploy, a **conferência visual no navegador** é gate: o cartão mudou de forma (dois
botões e um campo), e jsdom não desenha.

⛔ **Antes do deploy**, o gate de lote da landing precisa fechar verde numa máquina livre (vetor 11).

---

## Território e disciplina de árvore

- Escrevi em: `functions/src/platform/promoverParaProfissional.ts`,
  `functions/src/__tests__/{promocaoProfissionalFronteira,promocaoProfissionalWrapper,promocaoProfissionalPonte.integration}.test.ts`,
  `packages/api-client/src/platform/profissionais.ts`, `packages/api-client/src/index.ts`,
  `apps/landing/app/(public)/minha-conta/PortasDaConta.tsx`,
  `apps/landing/test/{minha-conta-ponte-s1234,minha-conta-portas-s1222}.test.tsx`,
  `leela-specs/01-produto/DECISOES-ABERTAS.md`,
  `leela-specs/02-rodadas/2026-08-11-ponte-resolve/01-decisoes-maestro.md`,
  `leela-specs/03-canon/epics/LEELA-E12-landing.md`, `leela-specs/00-boards/V1-KANBAN.md`,
  e este handoff.
- ⛔ **`apps/painel` intocado.** ⛔ `apps/landing/lib/portaOrganizador.ts` **intocado** — o
  comentário pinado das linhas 52-68 nunca entrou no território.
- `git commit --only` em todos os commits. Sem `--amend`, sem `stash`, sem `add -A`.
- Emulator: Firestore 8080 + Auth 9099 com `firebase-tools@13`, IPv4 explícito e
  `FIRESTORE_EMULATOR_HOST` completo (host:porta, não só a porta). **Derrubado ao terminar.**

---

## Construído × revisado × NO AR

| Item | Construído | Revisado | NO AR |
|---|---|---|---|
| PONTE-ELEGIVEL-1 (a régua e a sexta recusa) | 09/08 | **não** | ✅ desde 09/08 |
| PONTE-CTA-1 (dois CTAs + `intencao`) | **11/08 — esta lane** | **não** | **NÃO** |
| PONTE-NOME-1 (`nomeProfissional` → `organizacao`) | **11/08 — esta lane** | **não** | **NÃO** |
| A sétima recusa (`nome_profissional_invalido`) | **11/08 — esta lane** | **não** | **NÃO** |

**A review antagonista é obrigatória** — o contrato de chamada mudou pela segunda vez em três
dias. Nada aqui pega carona em deploy pronto.

---

## Tempo

Início **02:25**, fim **03:25** — **60 minutos**, medidos por relógio e não estimados. No limite do
que a casa manda avisar, e o que consumiu foi previsível: duas execuções da suíte cheia da landing
(421 s + 531 s) somaram 16 minutos sozinhas, e as seis falsificações com restauração e re-verde
levaram outro tanto. A construção dos três itens não foi o gargalo.

## Emergência / contexto

Sem parada limpa. A lane fechou o escopo inteiro.
