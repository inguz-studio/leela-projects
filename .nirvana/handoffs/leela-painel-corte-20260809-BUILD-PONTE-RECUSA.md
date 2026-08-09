# BUILD-PONTE-RECUSA · a sexta recusa nomeada na porta (PONTE-ELEGIVEL-1)

**Trace:** `leela-painel-corte-20260809` · wave A · **Employee:** `sf-backend-lead`
**Repo:** `C:\dev\LEELA` · branch `main` · **HEAD de partida:** `94f47c5e`
**Início:** 09/08 10:13 (-03)

---

## O que esta lane constrói

A ponte (`promoverParaProfissional`) recusa MENOS que o portão
(`contaElegivelParaResgate`, no `resgatarConviteOrganizador`). O divulgador (`promoter`) e a
ex-organizadora rebaixada de propósito (`athlete` + `demotedFromRole`) atravessam a porta,
esperam o convite e só ouvem a negativa genérica no resgate, dias depois.

A porta ganha a **sexta recusa nomeada**, com frase de produto própria. Nenhuma recusa sai como
`internal`.

**A regra é uma só:** o predicado de elegibilidade sai de dentro do resgate para um módulo
compartilhado, e as duas guardas passam a lê-lo. Nada de segunda cópia da lista de papéis.

## Invariantes sob vigilância (não podem quebrar)

- promoção continua **não concedendo nada** (`setCustomUserClaims`/`admin.auth`/`provisionTenant`
  ausentes do módulo; `promocaoProfissionalFronteira.test.ts` continua falsificável);
- idempotência transacional (concorrente e sequencial) intacta;
- máscara anti-enumeração intacta — a recusa nova só fala da conta LOGADA;
- comentário pinado de `portaOrganizador.ts:52-68` intocado (arquivo não é tocado);
- o wrapper `https.onCall` serializa a recusa nova como as outras;
- o cartão da landing mostra uma frase por recusa.

## Território

`functions/src/platform/**` + testes · `packages/api-client/src/platform/**` ·
`apps/landing/app/(public)/minha-conta/` (só a frase) + o teste do cartão.
⛔ `apps/painel` não é tocado (BUILD-OVERLAY roda em paralelo lá).

---

## Diário (task a task)

### T0 · leitura e desenho — 10:13 → em curso

Lido: `sf-backend-lead.md`, a fila (`02-fila-execucao.md` · PONTE-ELEGIVEL-1), o bloco do maestro
(`01-decisoes-maestro.md`), a review `PONTE-REV`, e os cinco arquivos de origem
(`promoverParaProfissional.ts`, `resgatarConviteOrganizador.ts`, `profissionais.ts` do api-client,
`PortasDaConta.tsx`, e os três testes da ponte).

Desenho fechado antes de escrever:

1. **`functions/src/platform/elegibilidadeOrganizador.ts`** (novo) — o predicado puro, fonte única.
2. **`resgatarConviteOrganizador.ts`** — `contaElegivelParaResgate` mantém a leitura do Auth e o
   fail-open, e delega a decisão ao predicado.
3. **`promoverParaProfissional.ts`** — `demotedFromRole` entra no `CallerPromocao` (lido do token,
   sem `admin.auth`), e a recusa `conta_inelegivel` entra **depois** do ramo do tenant (quem já tem
   tenant continua recebendo `jaExistia: true`) e **antes** da transação — a ex-organizadora
   rebaixada pode ter doc antigo, e o doc não pode virar travessia silenciosa.
4. **api-client** — `conta_inelegivel` na união e na lista de motivos nomeados, com a união
   DERIVADA da lista (as duas não podem mais divergir).
5. **landing** — a frase nova no `FRASE_DA_RECUSA` (o `Record` já obriga uma frase por motivo).
6. **Testes** — comparação porta × portão (não repete a lista à mão), a sexta recusa na fronteira,
   a sexta recusa no transporte, a frase no cartão.

### T1 · a régua sai do resgate — `2271fd78`

`elegibilidadeOrganizador.ts` nasce com o predicado puro. O portão mantém o que é dele (leitura do
crachá no Auth Admin e o fail-open quando essa leitura falha) e delega a decisão.
`contaElegivelParaResgate` fica **exportada**, para que o teste da porta compare contra a função de
verdade em vez de contra uma cópia da lista. Nenhum comportamento muda nesta passada.

### T2 · a sexta recusa — `38420cb6`

`conta_inelegivel`, `failed-precondition`, `details.motivo` como as outras. Entra **depois** do ramo
do tenant e **antes** da transação — as duas coisas são parte da regra, não detalhe de escrita.

O marcador de demoção entra no `CallerPromocao` como `unknown`, lido do token e **sem
estreitamento**: só a presença decide, e é assim que o portão o lê. `admin.auth` continua fora do
módulo.

No api-client a união de motivos passou a ser **derivada** da lista de validação. Eram duas listas,
e um motivo novo que entrasse só na união compilaria e cairia em `indisponivel` em produção — a
pessoa leria "tente de novo em instantes" para uma recusa que o servidor tinha acabado de nomear.

### T3 · a recusa contra o banco real — `9f75c286`

Dois casos novos na A4: o divulgador para na porta e o Firestore fica intacto; a rebaixada com doc
**antigo** (`statusOnboarding: 'ativo'`) é recusada e o doc dela não é tocado.

### T4 · epic e board

RN-512 no `LEELA-E12-landing` passou a dizer seis, com o parágrafo da régua única e a nota de que a
recusa nova fala só da conta logada. `S1242-T14` e `S1234-T7` fechadas no board como **construído,
não no ar, sem review**.

---

## Provas rodadas (comando → saída)

```
# a comparação porta × portão — 24 crachás, expectativa vinda do portão
cd C:\dev\LEELA\functions
npx vitest run src/__tests__/elegibilidadePortaVersusPortao.test.ts
  → Test Files 1 passed (1) · Tests 31 passed (31)

# a fronteira, com a sexta recusa e a ordem das guardas
npx vitest run src/__tests__/promocaoProfissionalFronteira.test.ts
  → Test Files 1 passed (1) · Tests 23 passed (23)

# o transporte — as SEIS recusas serializadas
npx vitest run src/__tests__/promocaoProfissionalWrapper.test.ts
  → Test Files 1 passed (1) · Tests 7 passed (7)

# contra emulator (Firestore 8080 + Auth 9099, LEELA_CLOCK=2026-03-15)
npx vitest run src/__tests__/promocaoProfissionalPonte.integration.test.ts
  → Test Files 1 passed (1) · Tests 9 passed (9)
    inclui o duplo clique concorrente e o resgate em cima do doc da ponte

# o portão, depois da extração — as guardas DEF-B contra Auth real
npx vitest run src/__tests__/resgateConvite.integration.test.ts
  → Test Files 1 passed (1) · Tests 13 passed (13)

npx vitest run src/__tests__/conviteOrganizadorCore.test.ts
  → Test Files 1 passed (1) · Tests 21 passed (21)

# gates
cd functions      && npx tsc --noEmit -p tsconfig.json   → 0 erros
                     npx eslint src --max-warnings 0     → 0
cd packages/api-client && npx tsc --noEmit               → 0 erros
                          npx eslint src --max-warnings 0 → 0
cd apps/landing   && npx tsc --noEmit -p tsconfig.json   → 0 erros
                     npx eslint app lib --max-warnings 0 → 0

# o cartão
cd apps\landing
npx vitest run --maxWorkers=3 --minWorkers=1 \
    test/minha-conta-ponte-s1234.test.tsx test/minha-conta-portas-s1222.test.tsx
  → Test Files 2 passed (2) · Tests 39 passed (39)

# a suíte cheia da landing, no gate de lote da PONTE-REV
npx vitest run --maxWorkers=3 --minWorkers=1
  → Test Files 60 passed (60) · Tests 770 passed (770) · 206.86 s
```

### Falsificações — o gate é vivo, e o gate velho não foi afrouxado

```
# 1. a guarda nova desligada (`if (false && ...)`)
elegibilidadePortaVersusPortao  → 8 failed | 23 passed (31)
fronteira + wrapper             → 4 failed | 26 passed (30)
A4 contra emulator              → 2 failed |  7 passed (9)
# restaurada: 31, 23+7 e 9 verdes de novo

# 2. `setCustomUserClaims` injetado no módulo (o vetor 5 da PONTE-REV, refeito)
fronteira                       → 6 failed  [inclusive a guarda de fonte]
# restaurado: verde
```

### O vermelho que NÃO era regressão

Os dois arquivos do cartão rodados juntos **sem** as flags do gate deram vermelho em tudo, com
timeout de 35 s em casos que sozinhos passam em 8 s. É a contenção que a PONTE-REV mediu em 08/08 e
consertou com `--maxWorkers=3 --minWorkers=1`: com as flags, 39 de 39. Fica registrado porque
"vermelho de carga" é indistinguível de regressão para quem lê só o resultado.

## O que ficou sem exercitar

- **Navegador, socket e Cloud Run.** Nada aqui foi clicado. O cartão foi exercitado por teste de
  componente, e o transporte por handler HTTP com requisição de mentira.
- **Emulator de functions.** Não subiu: só Firestore e Auth. A callable exportada não foi chamada
  por HTTP real — o wrapper foi exercitado pelo atalho `skipTokenVerification`, como na PONTE-REV.
- **Produção.** Esta lane não faz deploy. A porta no ar continua sendo a de cinco recusas.
- **A conta com `tenantId` mas sem papel** existe na tabela de 24 crachás e a porta lhe devolve
  `jaExistia`; ela não é um estado que o produto saiba produzir, e não foi verificada contra o Auth.

## Território e disciplina de árvore

- Escrevi em: `functions/src/platform/{elegibilidadeOrganizador,promoverParaProfissional,
  resgatarConviteOrganizador}.ts`, quatro arquivos de teste de functions,
  `packages/api-client/src/platform/profissionais.ts`,
  `apps/landing/app/(public)/minha-conta/PortasDaConta.tsx`,
  `apps/landing/test/minha-conta-ponte-s1234.test.tsx`, o epic E12, o board e este handoff.
- ⛔ **Nada em `apps/painel`** — a BUILD-OVERLAY está viva ali, e as cinco alterações dela na árvore
  foram preservadas em todas as passadas (`git checkout` sempre por caminho, nunca amplo).
- `git commit --only` em todos os commits. Sem `--amend`, sem `stash`.
- Emulator: subi Firestore 8080 + Auth 9099 com `firebase-tools@13` e **derrubei ao terminar**. As
  portas do preview do dono (8180/9198/5273/3000) não estavam de pé e não foram tocadas.

## Tempo

Início **10:13**, fim **10:45** — **32 minutos**, medidos por `date` e não estimados. Não passou de
uma hora, então não há outlier a avisar ao maestro.

O que consumiu de relógio: a suíte cheia da landing (207 s), as três falsificações com restauração e
re-verde, as seis suítes de functions arquivo a arquivo, e a subida do emulator.

## Construído × revisado × NO AR

| Item | Construído | Revisado | NO AR |
|---|---|---|---|
| A régua única (`elegibilidadeOrganizador.ts`) | **09/08 — esta lane** | não | **NÃO** |
| A sexta recusa na porta (`conta_inelegivel`) | **09/08 — esta lane** | não | **NÃO** |
| O motivo no api-client + a frase no cartão | **09/08 — esta lane** | não | **NÃO** |
| A comparação porta × portão (31 casos) | **09/08 — esta lane** | n/a (é o gate) | n/a |

**A review antagonista é obrigatória** para este item, por decisão do corte: muda contrato de
chamada. Nada aqui pega carona em deploy pronto.
