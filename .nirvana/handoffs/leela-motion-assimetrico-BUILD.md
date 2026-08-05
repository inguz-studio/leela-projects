# BUILD-MOTION-ASSIM — abrir é marca, fechar é pedágio

- **Trace:** `leela-pixreal-diag-20260804`
- **Lane:** BUILD-MOTION-ASSIM
- **Employee:** sf-frontend-lead · software-forge
- **Território:** `packages/design-system/**` (+ testes). Nada fora.
- **Data:** 05/08/2026
- **Base:** `bc4f2304` (REV-MOTION) · **Commit:** ver §7

---

## 1. A decisão, e o dado que a produziu

A REV-MOTION transformou em número o efeito colateral que a BUILD-MOTION tinha
registrado só em prosa: com o token único de **800ms**, a página ficava **800ms
exatos inerte a cada fechamento** — a cortina interceptando clique, o `body` sem
rolar e o diálogo ainda se declarando `aria-modal="true"`. Apresentado o número,
o dono decidiu:

> **800ms para abrir, 250ms para fechar.**

A razão dele está escrita em três lugares do código, para não ser "otimizada" de
volta por simetria: **a abertura é onde a marca aparece; o fechamento acontece
depois de a pessoa já ter decidido sair, e ali a lentidão vira pedágio.**

---

## 2. Os dois tokens

| Token | Valor | O que ele governa |
|---|---|---|
| `--motion-overlay-enter-duration` | **800ms** | animação de ABERTURA de Dialog, Modal, Drawer, Toast |
| `--motion-overlay-exit-duration` | **250ms** | animação de FECHAMENTO **e a janela de inércia** — é o número que o JS espera com a cortina ainda na frente |
| `--motion-menu-duration` | 120ms (inalterado) | DropdownMenu, as duas direções |

**Onde:** `packages/design-system/tokens/component.json`, grupo `motion`, **tier
compartilhado** — o mesmo lugar e o mesmo tier que o construtor anterior
escolheu de propósito. Um valor, os dois temas, uma linha para trocar. Gerados
por `generate-tokens` para `themes/brasa.css`, `themes/wine.css`,
`themes/index.css` e `src/theme/rn-themes.ts`.

**O menu não foi dividido**, e o motivo está no código: o par existe para pagar a
marca na abertura sem cobrar pedágio no fechamento; em 120ms não há pedágio a
cobrar. Menu é affordance de ponteiro, não superfície de leitura.

---

## 3. Como os cinco primitivos leem isso

O motor (`src/utils/overlayMotion.ts`) passou a trabalhar com um **par**, não com
uma variável solta:

```ts
export interface ParDeDuracao { entrada: string; saida: string }
export const DURACAO_OVERLAY: ParDeDuracao = { entrada: …ENTRADA, saida: …SAIDA };
export const DURACAO_MENU:   ParDeDuracao = { entrada: …MENU,    saida: …MENU  };
```

O par existe para que abrir e fechar **não possam ser passados separados por
engano**: quem escolhe a superfície escolhe o par inteiro, e o motor decide qual
metade usar.

- `estiloMotion(estado, par)` — duração e easing andam juntos pelo `data-state`.
  Aberto → `var(--motion-overlay-enter-duration)` + `easing-enter`. Saindo →
  `var(--motion-overlay-exit-duration)` + `easing-exit`. (O easing já era um par;
  a duração passou a acompanhar.)
- `usePresencaOverlay(open, par)` — lê **`par.saida`**. É ela que define quanto
  tempo o nó fica vivo depois do `open=false`, ou seja, a janela de inércia.
- `duracaoDeSaidaMs()` — default trocado para o token de saída (é o que o
  `ToastProvider` usa para segurar o item na fila).

Call sites: `Dialog`, `Modal`, `Drawer` e `Toast` usam o default e não mudaram de
forma; `DropdownMenu` passou de `VAR_DURACAO_MENU` para `DURACAO_MENU`.

**`prefers-reduced-motion` continua zerando as duas.** O sinal é um só e é lido
nos dois lados (`duracaoDeSaidaMs` devolve 0; todas as classes de animação seguem
gated por `motion-safe:`). Teste novo cobre explicitamente que **nenhum dos
sentidos sobra esperando**.

---

## 4. A prova de que a janela caiu para 250ms

A medição da REV-MOTION continua onde estava (`overlayMotion.rev.test.tsx`) e
continua **ancorada no token** — só que agora com um anzol melhor:

```ts
const VALOR_SAIDA = brasaTheme['motion-overlay-exit-duration'] ?? '';
const SAIDA = msDoValorCSS(VALOR_SAIDA);   // = 250, vindo do tema GERADO
```

`brasaTheme` é a saída de `generate-tokens`, isto é, o número que o produto
embarca de verdade. Trocar a duração de novo é editar `component.json` e
regenerar: **nenhum número precisa ser caçado em teste** — foi assim que os 250ms
entraram nesta lane, sem tocar em nenhuma asserção de tempo.

Três casos guardam isso:

1. **cortina, trava de rolagem e `aria-modal` duram o token — nem 1ms a mais.**
   Em `SAIDA - 1` a página ainda está inerte; em `+1` está livre.
2. **a medida acompanha o token.** Planta 90ms e cobra 90ms.
3. **⛔ a janela de inércia é a duração de FECHAMENTO, nunca a de abertura**
   (caso NOVO). Afirma `SAIDA < ENTRADA` e prova que, passada a duração de
   fechamento, a página já é da pessoa de novo — com o token de abertura valendo
   bem mais.

E em `overlayMotion.test.tsx`, um caso novo no nível da função:
**`duracaoDeSaidaMs` lê o token de SAÍDA e ignora o de abertura.**

**Mutação testada (evidência, não opinião):** trocando `par.saida` por
`par.entrada` no `usePresencaOverlay`, os **3** casos de medida falham. Revertido
em seguida e verde de novo. O erro natural — religar a espera no token de
abertura, porque era um token só — é o que essa asserção pega.

Os demais casos de `overlayMotion.test.tsx` provam o MECANISMO, então passaram a
plantar valores **sintéticos** (500ms) e cobrar os mesmos de volta. O arquivo não
conhece mais o ritmo do produto; quem mede o produto é a suíte da REV.

---

## 5. Os fixes da REV-MOTION seguem verdes

Nada foi regredido — os quatro casos de `useDialogBehavior.coexistencia.test.tsx`
passam:

- dois overlays vivos: o que SAI não devolve a rolagem com o outro aberto;
- dois overlays vivos: o que SAI não arranca o foco de dentro do que está aberto;
- **pilha** — a confirmação por cima devolve o foco ao botão de dentro do diálogo
  de baixo (o caso que reprova o atalho "só o último devolve o foco");
- alvo de foco desconectado: pula o nó morto e cai no abridor vivo.

⚠️ **A janela encolheu de 800ms para 250ms, e não fechou.** Está escrito no
`useDialogBehavior.ts` e no cabeçalho do teste: 250ms de dois overlays vivos é a
mesma corrida em tempo menor. Encurtar duração nunca conserta corrida — só a
torna mais rara, que é o pior estado possível para um bug. O contador de rolagem
e a pilha de foco continuam sendo o que resolve.

O teste de coexistência também passou a ler a duração do tema gerado, então segue
medindo a janela real qualquer que seja o número.

---

## 6. Gates

| Gate | Resultado |
|---|---|
| `tsc --noEmit` (DS) | **0 erros** |
| `eslint src --max-warnings 0` (DS) | **0** |
| Suíte do DS | **62 arquivos · 1156 testes · verde** (base 1154 + 2 casos novos) |
| Landing, arquivos que tocam overlay, `--no-file-parallelism` | **10 arquivos · 160 testes · verde** |

Landing rodada: `checkout-fixes-steps`, `checkout-form-aceites`,
`checkout-s1209-cupom-forma`, `checkout-tamanhos-grade`, `cupom-link-s1215`,
`evento-vocabulario-x1`, `ingresso-pdf`, `kit-imagem-lightbox`,
`regulamento-modal-focus-trap`, `vitrine-estado-venda`.

`tsup` não foi rodado em paralelo com suíte nenhuma. **Sem deploy** — `dist/` é
gitignorado e precisa de rebuild no deploy, que o maestro sequencia.

---

## 7. Território e desvios

Só `packages/design-system/**` foi tocado. `packages/core/src/index.ts` e
`packages/core/src/finance/parseValorPtBr.ts` estavam sujos na árvore quando esta
lane começou (REV-CONTAS-MOTOR) e **ficaram de fora do commit** — `--only` com
paths explícitos, sem `--amend` e sem `stash`.

**Desvio de ambiente (não de escopo):** `pnpm generate-tokens` não roda nesta
máquina — o `verify-deps-before-run` do pnpm dispara um `install` que morre em
`ERR_PNPM_IGNORED_BUILDS` (`@sentry/cli`). Contornado chamando o binário local:
`./node_modules/.bin/tsx src/scripts/generate-tokens.ts`. Mesmo efeito, mesmos
quatro arquivos escritos. Vale para `eslint` e `vitest` também (rodados por
binário direto). Não mexi em nada de infra para consertar isso.
