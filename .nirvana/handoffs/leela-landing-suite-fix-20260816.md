# Handoff · LANDING-SUITE-FIX — a suíte da landing volta a medir comportamento

- **Trace:** `leela-landing-suite-fix-20260816` · lane `LANDING-SUITE-FIX` · card **S1260**
- **Worktree:** `C:\dev\leela-wt-suitefix`, branch `landing-suite-fix`, saído de `bfd81cec`
- **Entrada:** S1260/S1261 no [[V1-KANBAN]] · `leela-specs/02-rodadas/2026-08-12-copy-landing/05-review-antagonista.md` · `.nirvana/handoffs/leela-copy-REV2-20260816.md`
- **Estado:** causa raiz provada, conserto aplicado, falsificação nos dois sentidos, suíte inteira verde. ⛔ **NENHUM deploy.**

---

## A causa raiz

# O custo de IMPORT era cobrado contra o teto de tempo de um caso de teste

Nenhum teste da landing estava quebrado. O que quebrava era a conta do tempo.

O barril do design-system é caro de avaliar em jsdom. Esse custo era pago **dentro do primeiro
caso de teste que renderizasse** em cada arquivo — o caso que por acaso viesse primeiro pagava o
import inteiro contra o próprio teto. Ele estourava por import, nunca por comportamento. Pior: o
`act()` que ficava pendente nesse caso morto contaminava os casos seguintes do mesmo arquivo, e o
arquivo inteiro caía junto.

Medição desta lane, em worktree próprio, com `pnpm install` e `turbo build` do zero:

| import | custo |
|---|---|
| `@leela/core` | 0,5s – 2,6s |
| `@leela/api-client` | 0,7s – 5,5s |
| `@leela/design-system/server` | 0,2s – 5,5s |
| **`@/app/_ds/ds`** (o barril inteiro) | **35s – 62s, POR ARQUIVO DE TESTE** |

E o gasto é de **avaliação**, não de transform: um segundo arquivo no mesmo run, com o transform
inteiro quente (9s no run todo), pagou **46s de novo**.

### As duas causas somadas, as duas de resolução de módulo

1. **O alias apontava `@leela/design-system` para `src/index.ts`.** O barril arrastava **~296
   módulos de fonte** pelo vite-node, um a um, em cada arquivo de teste. O **painel** — a referência
   que o próprio comentário do arquivo declarava espelhar — **nunca teve esse alias**: resolve pelo
   `exports` do pacote, ou seja, pelo dist bundlado. A landing já resolvia `@leela/core` e
   `@leela/api-client` exatamente assim. O DS era o único fora do padrão da casa.

2. **Tirar o alias não bastou** (caiu para 12s–18s). `@leela/*` é link de workspace, e o Vite resolve
   link para o caminho **real** (`packages/design-system/dist/index.mjs`), que não contém
   `/node_modules/` — a substring exata da regra default de externalização do Vitest. Os três
   pacotes da casa caíam no lado **inline** e o dist bundlado voltava a ser mastigado módulo a
   módulo.

### Por que ela era INSTÁVEL, que era a outra metade do card

35s e 62s são **o mesmo import**. Quem decide de que lado do teto ele cai é a contenção de CPU e de
I/O dos 3 workers — não o código. Um arquivo cujo import custe perto do teto sai verde numa execução
e vermelho na seguinte, na mesma árvore, no mesmo commit. É por isso que a medição de 12/08 leu 140
reprovados com `minha-conta-ponte-s1234` **verde sozinho** e a de 16/08 leu 147 com o mesmo arquivo
**vermelho sozinho**. As duas medições estavam certas.

---

## O conserto

`apps/landing/vitest.config.ts` e `apps/landing/test/setup.ts` (commit `a74d8214`):

1. **o alias de `src` do DS sai** — volta ao padrão do painel, resolvendo pelo `exports` do pacote;
2. **os três pacotes da casa viram externos** — quem carrega o dist passa a ser o Node, direto do
   bundle, em vez do vite-node módulo a módulo;
3. **o barril é aquecido em `setupFiles`** — o custo que sobra (recharts e os primitivos do Radix em
   jsdom são caros de verdade) passa a ser cobrado no **hook de setup**, que tem teto próprio, e não
   mais dentro de um caso. O teto do caso volta a medir comportamento;
4. **`testTimeout: 20_000` e `hookTimeout: 60_000` no arquivo de config** — **55 dos 65** arquivos
   rodavam no default de 5s, sem folga nenhuma.

⛔ **`@leela/api-client` e `@leela/core` ficam FORA do aquecimento, de propósito.** Os arquivos de
teste os substituem por `vi.mock`, e pré-carregar um módulo que o teste pretende trocar deixaria a
instância real no cache. Só o DS pode ser aquecido, porque **nenhum teste o mocka** — conferido antes
de escrever a linha.

O frescor do dist não fica com o alias: fica com o `test.dependsOn: ["^build"]` que o `turbo.json` já
declarava — o mesmo contrato de que o painel já vivia.

---

## Os números

| medição | antes | depois |
|---|---|---|
| `test:gate`, suíte inteira | **147 reprovados · 702 verdes (849)**, 22 arquivos de 65, exit 1, 1478s | **849 verdes (849)**, 65 de 65, exit 0, **407s** |
| `definir-senha-s1223` sozinho | 13 de 13 reprovados, 130s | **13 de 13 verdes**, casos em 921ms |
| `tsc --noEmit` | exit 0 | exit 0 |
| `eslint app lib --max-warnings 0` | exit 0 | exit 0 |

### As duas execuções seguidas na árvore canônica (a estabilidade, provada por repetição)

Depois do merge, em `C:\dev\LEELA`, com o comando do gate:

| execução | resultado |
|---|---|
| 1ª | ✅ **849 verdes (849)**, 65 de 65 arquivos, **exit 0**, 210,02s |
| 2ª | ✅ **849 verdes (849)**, 65 de 65 arquivos, **exit 0**, 192,52s |

---

## ⚠️ O segundo achado: o dist DEFASADO existe — só não era a causa dos 147

Entre a primeira dupla de execuções, um caso reprovou sozinho, e **não era timeout**: 114ms e 77ms,
determinístico. Era o **gate de frescor**, `test/build-frescor-dist.test.ts`, no caso que se chama
`⚔ o REPO DE VERDADE está fresco agora — se este caso ficar vermelho, não builde`:

```
@leela/design-system · ./dist/tailwind-preset.js · estado: "defasado"
  distEm  ≈ 13/08      fonteEm ≈ 16/08
```

A fonte do DS estava **três dias à frente** do dist na árvore canônica. Basta um `merge`/`checkout`
reescrever mtime de arquivo de pacote para o gate abrir — e ele estava certo em abrir. `turbo run
build` dos três pacotes fechou o caso (14 de 14 verdes), e as duas execuções seguidas vieram depois
disso.

**Como isso convive com a falsificação do C0 registrada acima:** dist defasado é um problema **real e
recorrente** desta árvore, e o gate de frescor o pega. O que está falsificado é ele ser a causa dos
**147 reprovados** — o worktree limpo, com dist recém-buildado e byte a byte igual, reproduziu o
vermelho idêntico. São dois defeitos distintos, com dois sintomas distintos: dist defasado dá **um**
caso vermelho, nomeado, em 100ms; o custo de import dava **147**, espalhados por 22 arquivos, em
timeout.

⚠️ **Nota operacional para toda lane que rode esta suíte:** se `build-frescor-dist` abrir, o conserto
é `turbo run build` dos pacotes, **não** mexer no teste.

---

## ⚔ A falsificação, nos dois sentidos

A falsificação ingênua (reverter a config e esperar vermelho) **não reproduz** depois que a máquina
esquenta — e isso não é ruído, é a própria tese do card sobre instabilidade. A falsificação honesta
controla a variável: mesma árvore, mesmo instante, mesmo estado de máquina, **só a config muda**.

`minha-conta-ponte-s1234.test.tsx`, os dois rodados em sequência:

| config | resultado |
|---|---|
| a original (alias de `src`, sem `setupFiles`) | ⛔ **48 reprovados · 5 verdes (53)** |
| a desta lane | ✅ **53 verdes (53)** |

**48 de 53** é, no número exato, o que a review antagonista mediu para este arquivo. O mecanismo
reproduz sob demanda e o conserto o apaga.

---

## Três correções de registro, para a próxima lane não herdar erro

1. ⛔ **A "prova que fecha o caso" da S1260-T1 não era determinística.** `definir-senha-s1223`
   reprovando 13 de 13 sozinho é real e foi reproduzido aqui — mas o **mesmo arquivo, na árvore
   canônica, sem uma linha alterada, passou 13 de 13** mais tarde na mesma sessão, com
   `tests 20,21s` contra um teto de 20s. Ele não é um arquivo quebrado; é um arquivo que vive na
   borda do teto. A conclusão que sobrevive é a certa: **a `main` estava vermelha por conta própria
   e não era a copy.** O que não sobrevive é o "determinístico".

2. ✅ **A S1260-T5 estava certa, e era o fio.** A suíte de fato não lia o dist do DS, e era
   exatamente esse alias o problema. A nota poupou a lane de perseguir md5 de `dist/`.

3. ⛔ **A hipótese herdada de "dist defasado" (achado do C0) está FALSIFICADA para este caso.** O
   worktree subiu com `pnpm install` e `turbo build` do zero e reproduziu o vermelho **idêntico**; o
   `packages/core/dist/index.mjs` recém-buildado saiu **byte a byte igual** ao da árvore canônica.
   Não havia dist defasado. O padrão "spy não chamado em massa" tem outra causa e ela agora tem nome:
   o efeito não chega a rodar porque o caso morreu no import.

## O que era dist × o que era defeito real

**Nada era dist.** E **nenhum teste da landing tinha defeito**: os 849 casos passam sem que uma linha
de teste ou de produto tenha sido tocada. O defeito era de **infraestrutura de suíte** — resolução de
módulo e onde o custo de import é cobrado —, e mora inteiro em dois arquivos de configuração.

## Fila depois desta lane

1. **S1261** — as dez ressalvas da review que cabem na esteira (duas vão ao painel do dono).
2. **S1251** — o deploy do renome do Serviço, junto do pacote que sobe a copy, **com gate visual em
   navegador obrigatório**.

**Nenhum número de RN foi consumido. A próxima livre continua sendo a 573.**
