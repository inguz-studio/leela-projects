# ONBOARD-VITRINE — handoff vivo

**Lane:** `ONBOARD-VITRINE-RET` · **Trace:** `leela-onboard-vitrine-20260806` · **Employee:** `sf-frontend-lead`
**Repo:** `C:\dev\LEELA` · branch `main` · base `42808c04`

## Veredito

O trabalho que estava na árvore era bom e está resgatado, mas o "verde" de antes do
travamento era **falso**: rodada do zero, a suíte da lane abria **1 teste vermelho**, e o
gate que os próprios comentários do código diziam existir (`veu-buildado.test.ts`, a prova
do DEF-C no CSS buildado) **não existia** — o arquivo nunca foi escrito. As duas coisas
estão consertadas e provadas abaixo. As specs também não tinham aterrissado; aterrissaram.

## Tarefas

| # | Tarefa | Estado | Commit |
|---|---|---|---|
| T1 | Resgate do código da vitrine + o teste vermelho + a prova do véu no buildado | ✅ | `f7477821` |
| T2 | Specs que não aterrissaram (D-ONB-6, RN-510, delta E00/E16, índice de RNs, board) | ✅ | `133ef123` |
| T3 | Gates do zero + handoff + vetores para a review | ✅ | (este commit) |

Push: `42808c04..133ef123` em `origin/main`.

---

## §1 · O que estava na árvore, e o que dela era mentira

O diff da lane morta cobria o desenho inteiro e com o raciocínio escrito nos cabeçalhos.
Resgatado sem reescrita: `VitrinePainel.tsx`, `_lib/areasDaVitrine.ts`,
`_lib/primeiraInteracao.ts`, o novo `ContaTravadaGate`, o novo `OverlayConvite` e três
suítes (`vitrine-sem-query`, `vitrine-interacao`, `OverlayConvite` reescrita).

Duas coisas **não** sobreviveram à primeira execução honesta:

**1. Um teste vermelho** — `vitrine-interacao.test.tsx:152`,
`interagir DENTRO do aviso não o reabre nem o multiplica`:

```
TestingLibraryElementError: Found multiple elements with the text of: /código Leela/i
```

Não é falha do produto: no painel REAL o nome "código Leela" aparece **duas vezes por
acessibilidade** — no rótulo do campo do aviso e no `EmptyState` da vitrine por baixo, que
o DS anuncia com `role="status"` + `aria-label="Esta área abre com o código Leela"`. A
busca solta acha as duas. Corrigido ancorando a busca no `dialog` (`within(aviso)`), que é
o que a asserção sempre quis dizer. **O achado importa para a review:** qualquer teste
futuro que procure "código Leela" solto no painel inteiro cai no mesmo lugar.

**2. A prova do véu não existia.** `OverlayConvite.tsx` e `OverlayConvite.test.tsx`
afirmam, em comentário, que quem mede o CSS buildado é `__tests__/veu-buildado.test.ts`.
Esse arquivo não estava na árvore — nem untracked, nem no HEAD. O critério de aceite mais
caro da lane (lição DEF-C: `/95` sobre `var()` arbitrário compila transparente) estava
sustentado por uma referência a um arquivo inexistente. **Escrito nesta retomada.**

## §2 · A prova do véu, e por que ela morde

`apps/painel/src/routes/onboarding/__tests__/veu-buildado.test.ts` (novo, 8 casos).

Ele não pergunta "a classe é a certa?" — o teste que fazia isso passou verde em 03/08 com
o véu transparente. Ele pergunta: **a classe que está HOJE na fonte, compilada pelo mesmo
Tailwind e pelo mesmo preset do painel, produz cor de fundo de verdade?**

- a classe do véu é **lida da fonte** (o elemento com `role="dialog"`), nunca escrita no
  teste — trocar o véu por outra classe que não compile derruba o gate sozinho;
- a compilação é a real (`postcss` + `tailwindcss` + preset do DS), não uma imitação;
- o desfoque é medido nos **dois elos** (`--tw-backdrop-blur` recebe
  `blur(var(--modal-overlay-blur))` e o `backdrop-filter` a consome) — medir só o segundo
  passaria verde com a variável vazia;
- o token é medido no tema: `--modal-overlay-bg` tem de existir nos três arquivos de tema
  do DS com alfa ≥ 0,5 (hoje 0,6). Regra que compila e resolve `transparent` é o mesmo
  defeito de roupa nova;
- **falsificação embutida**: o último caso compila `bg-[var(--surface-base)]/95` — a classe
  exata do DEF-C — e exige **zero** declaração de fundo. Um gate que não falha no defeito
  que veio prevenir é decoração.

Medida independente, no `dist` de verdade (`vite build` desta retomada, exit 0,
`dist/assets/index-DufB2CDQ.css`, 109.895 bytes):

| Medição no CSS buildado | Resultado |
|---|---|
| ocorrências da classe do DEF-C (`\/95`) | **0** |
| regra do véu | `.bg-\[var\(--modal-overlay-bg\)\]{background-color:var(--modal-overlay-bg)}` |
| regra do desfoque | `.backdrop-blur-\[var\(--modal-overlay-blur\)\]{--tw-backdrop-blur: blur(var(--modal-overlay-blur));…}` |
| token no bundle | `rgba(0,0,0,.6)` |

## §3 · Gates — todos rodados DO ZERO nesta retomada

| Gate | Comando | Resultado |
|---|---|---|
| Suíte da lane (arquivos tocados) | `vitest run src/routes/onboarding` | **5 arquivos · 54 testes · 0 falhas** |
| Contrato de roteamento da fronteira | dentro da corrida abaixo | **28 casos · 0 falhas** |
| Vizinhança do `App.tsx` (rotas, `_system`, shell) | `vitest run src/routes/__tests__ src/routes/_system/__tests__ src/shell` | **13 arquivos · 242 testes · 0 falhas** |
| Suíte do painel INTEIRA | `vitest run --no-file-parallelism` | **207 arquivos · 2.174 testes · 0 falhas** (exit 0 · 1.193,94 s) |
| Tipos | `tsc --noEmit` | **exit 0** |
| Lint | `eslint src --max-warnings 0` | **exit 0** |
| Lint da fronteira (`leela-auth/rota-fora-da-fronteira`) | dentro do `eslint src` | **exit 0** |
| Falsificação do lint da fronteira | rota irmã fora do `RequireSessao`, arquivo temporário | **exit 1**, erro nominal em `/vitrine-aberta` |
| Guia visual — token obrigatório (`leela-tokens/no-hardcoded-tokens`, cobre `apps/*/src/**`) | dentro do `eslint src` | **exit 0** |
| Falsificação do guia visual | `bg-[#ff0000]` num arquivo temporário do painel | **exit 1**, erro nominal citando `governanca-design.md` |
| Véu no CSS buildado | `veu-buildado.test.ts` + `vite build` + medição no `dist` | **8 casos verdes**, `\/95` = 0 |
| Build do painel | `vite build` | **exit 0**, 18,94 s |

Os dois arquivos de falsificação foram apagados na mesma chamada que os rodou; nenhum
deles entrou em commit.

A suíte rodou com `--no-file-parallelism` de propósito: a máquina estava com ~770 MB
livres, e a suíte em processos paralelos é a receita do "verde isolado, vermelho sob
carga" que a SUITE-STAB já pagou uma vez. O preço é tempo — vinte minutos, contra os
poucos da suíte paralela —, e ele foi pago inteiro em vez de amostrado. Log cru em
`.nirvana/painel-suite-onboard-vitrine.txt` (não versionado, como os outros logs de lane).

A baseline de comparação é a da FRONTEIRA-AUTH, hoje mais cedo: 202 arquivos · 2.078
testes. Os 5 arquivos e 96 testes a mais não são todos desta lane — 3 arquivos são
(`vitrine-sem-query`, `vitrine-interacao`, `veu-buildado`); os outros vieram das lanes que
correram no meio do dia.

**O que NÃO foi medido, de propósito:** contraste AA por estado e foco visível no
navegador. A regra da casa é não abrir navegador sem validação prévia, e o gate executável
que existe é o de token (acima). Fica declarado como vetor 9.

## §4 · Premissas assumidas (decisões de detalhe que o brief deixou comigo)

Registradas também na D-ONB-6, como P11 a P16.

1. **O que conta como interação:** só gesto sobre algo acionável (`a[href]`, `button`,
   `[role=button|link|menuitem|tab|switch]`, campos, `[tabindex]` navegável). Clicar em
   texto ou na moldura não conta — trazer o aviso ali seria ruído.
2. **Teclado:** `Enter` e `Espaço` sobre alvo acionável, por `keydown` em captura. Não dá
   para depender do clique sintetizado: widget com `role="button"` e handler próprio não
   sintetiza clique, e passaria calado.
3. **Fechar:** por `Esc` e por botão ("Continuar olhando"). A RN-416 pedia o oposto porque
   não havia nada por baixo para olhar; com a vitrine há, e o dono convidou a pessoa a
   conhecer a plataforma.
4. **Rearmar:** depois de fechado, a interação seguinte sobe o aviso de novo. Mostrar uma
   vez por sessão deixaria a pessoa clicando em botões inertes no silêncio — o beco que
   esta lane veio desfazer.
5. **Sem debounce:** o aviso é estado, não notificação; subir duas vezes não existe.
6. **Espera do crachá:** enquanto o claim não volta, a rota real **não monta** (ver §5).
7. **A vitrine acompanha o endereço** (o menu continua navegando), mas **nunca mostra dado
   inventado**: cada área diz o que faz, sem número e sem exemplo.

## §5 · O achado de verdade: a janela de espera vazava duas queries

O comentário novo do `ContaTravadaGate` descrevia um defeito real, e ele está **provado**,
não só descrito — `vitrine-sem-query.test.tsx`, caso
`enquanto o crachá é lido, a rota real NÃO monta (a janela que vazava)`.

O desenho anterior renderizava as rotas REAIS enquanto o crachá era lido, por decisão
documentada ("piscar o overlay na cara de quem já tem acesso é pior"). Só que nessa janela
`/crm` disparava `getOverview` e `/marcas` disparava `listarMarcas` — duas queries
tenant-scoped de uma conta que, um tique depois, se revelaria sem tenant nenhum. O
`enabled` das duas telas olha `uid`/`eventoId`, nunca `tenantId`. Elas voltariam
`permission-denied`: exatamente o custo que o desenho da parede dizia evitar.

O fix é o estado de espera (`role="status"`, "Carregando o painel"), e ele custa um tique a
quem tem crachá em cache — que é todo mundo que trabalha no painel, porque `getClaims(false)`
lê o token em memória.

**Isso torna obsoleto um trecho de handoff alheio:** `leela-fronteira-auth-20260806.md` §1,
vetor 4, afirma "`ContaTravadaGate` … a rota de destino **não é montada** … Ele renderiza os
filhos enquanto a sessão resolve (`:52`) — decisão documentada, e sem risco". As duas metades
mudaram: agora monta a `VitrinePainel` (não a rota real) e **não** renderiza os filhos durante
a espera. A propriedade que aquele handoff protegia (nenhuma query tenant-scoped atrás do
gate) segue verdadeira e agora é executável. **Não editei o handoff da outra lane** — fica
apontado aqui para o maestro decidir.

## §6 · Specs aterrissadas

| Artefato | Path |
|---|---|
| Decisão do dono (**D-ONB-6**, ordem verbatim de 06/08) | `leela-specs/02-rodadas/2026-07-28-onboarding-organizador/04-decisao-vitrine-0806.md` |
| RN-416 marcada como superada (legível, não apagada) | `leela-specs/02-rodadas/2026-07-28-onboarding-organizador/02-rns-delta.md` |
| **RN-510** canônica + tabela de-para da S1609-T2 | `leela-specs/03-canon/epics/LEELA-E16-plataforma-superadmin.md` (delta novo no fim) |
| Delta no épico das jornadas de conta | `leela-specs/03-canon/epics/LEELA-E00-fundacao-tecnica.md` (delta novo no fim) |
| Índice de RNs: faixa mais alta passa a 510 + substituição registrada | `leela-specs/03-canon/indice-de-regras-de-negocio.md` |
| Board, card ancorado no épico com história e tarefas | `leela-specs/00-boards/V1-KANBAN.md` (🔄 Em execução) |

## §7 · Vetores para a review antagonista

Os cinco do brief, mais quatro que esta retomada levantou:

1. **Véu que não bloqueia no buildado.** O gate compila a classe lida da fonte. Ataque: um
   véu montado por `cn()`/variante em runtime, que o extrator da fonte não veria.
2. **Query tenant-scoped escapando na vitrine.** A allowlist tem 4 nomes e é fechada por
   inversão. Ataque: leitura que não passe pelo `@leela/api-client` (Firestore importado
   direto numa tela), que o espelho do mock não cobre.
3. **Fronteira aberta por regressão.** 28 casos + lint verdes, lint falsificado. Ataque:
   rota nova aninhada com guarda de papel trocado, que a regra não olha de propósito.
4. **Interação por teclado que não sobe o aviso.** Cobertos `Enter` e `Espaço` em item de
   menu e botão. Ataque: widget com tecla própria (setas em `role="tab"`, `role="switch"`
   por `ArrowRight`) — não conta como uso hoje.
5. **Resgate que destrava sem refresh de crachá.** `resgatar` → `sessao.recarregar()` com o
   token já refrescado pelo hook. Ataque: o caminho com `platformAdmin` do PAPEL-DUPLO, e
   o resgate feito na rota `/conta` (onde a vitrine não monta).
6. **A espera do crachá não tem prazo.** Erro de leitura do crachá **não** é o buraco:
   `useContaOnboardingSession` já captura a falha e cai em `authenticated` sem papel
   (`_data/onboarding.ts:88-101`), o que aterrissa em vitrine — fail-closed correto. O
   buraco é a promessa que **nunca assenta**: aí o estado de espera fica para sempre, e
   nenhum teste mede esse caso. Era um estado que não existia antes desta lane.
7. **O `EmptyState` da vitrine é `role="status"`** — região viva que anuncia sozinha ao
   leitor de tela em cada navegação, por baixo de um `aria-modal`. Não medi a leitura real.
8. **`ROTAS_LIBERADAS = ['/conta']`** continua da RN-416. Com a vitrine, a lista virou
   "onde a rota REAL monta". Vale reperguntar se `/conta` ainda é a única.
9. **Contraste AA por estado e foco visível** não foram medidos no navegador (ver §3). O
   que existe é o gate de token, que prova a origem da cor, não o contraste resultante.

## §8 · Território — o que NÃO foi tocado

`functions/**` · `packages/design-system/lint/leela-scroll-plugin.mjs` ·
`leela-specs/01-produto/DECISOES-ABERTAS-TRIAGEM.md` · o handoff staged
`leela-pixreal-diag-20260804-REV-5B.md` (**segue staged, intocado**) · `apps/landing` ·
deploy. Todo commit saiu com `git commit --only`, e cada um foi conferido depois: o
arquivo staged alheio continua no índice, sem entrar em commit nenhum.
