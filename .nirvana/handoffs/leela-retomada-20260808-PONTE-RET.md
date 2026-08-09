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

## Colunas de honestidade

| Item | Construído | Revisado | NO AR |
|---|---|---|---|
| Ponte (`35a85f04`) | sim, 06/08 | **não** — PONTE-REV é a wave 2 | **não** |
| Rótulo novo do cartão | _em curso_ | não | não |
| Gates re-provados | _em curso_ | n/a | n/a |
| A4 contra emulator | _em curso_ | n/a | n/a |

Nada desta lane está resolvido. Está construído e (quando o for) provado — que é coisa diferente.
