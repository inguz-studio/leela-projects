# REV-FINAL do redesign — portão do merge

- **trace_id:** `leela-redesign-v2-20260810` · lane REV-FINAL (revisão antagonista · contexto fresco · READ-ONLY)
- **alvo:** delta `e64b8c47..89537700` na branch `redesign-engajamento-v2`, worktree `C:\dev\leela-wt-redesign-v2`
- **tamanho:** 117 arquivos, +4069 / −1493, 24 commits, 9 lanes nunca revisadas em conjunto
- **disciplina cumprida:** zero commit, zero mutação de código, foreground e série, `:4601`/`:4599` intocados
- **estado final da árvore:** limpa em `89537700` (`git status --porcelain` = 0 linhas)

## Veredito: LIBERADA COM RESSALVAS

O merge está liberado. Nenhum bloqueador estrutural sobreviveu à tentativa de derrubada: as suítes,
a identidade do build servido, a honestidade do ticket médio, a moldura das duas áreas, os tokens e
a prontidão do merge foram todos re-provados por execução minha, do zero. O único defeito não
declarado é uma linha de copy (R-3) numa tela que este delta criou. As outras seis ressalvas são
dívida declarada, assimetria de teste ou operação de build.

**A ressalva R-3 é a única que pede código.** As demais são registro, teste ou disciplina de comando.

---

## Vetor 1 · Suítes completas (números que EU rodei)

Rodadas em série, foreground, do zero, com a árvore limpa em `89537700`.

| Gate | Comando | Resultado |
|---|---|---|
| Suíte design system | `npx vitest run` em `packages/design-system` | **75 arquivos · 1809 testes · 1809 passed · 0 failed** (47,65 s) |
| Suíte painel COMPLETA | `npx vitest run` em `apps/painel` | **235 arquivos · 2580 testes · 2580 passed · 0 failed** (445,87 s) |
| `tsc --noEmit` painel | `npx tsc --noEmit` | exit **0** |
| `tsc --noEmit` design system | `npx tsc --noEmit` | exit **0** |
| Lint painel | `npx eslint src --max-warnings 0` | exit **0** |
| Lint design system | `npx eslint src showcase/src --max-warnings 0` | exit **0** |
| `generate-tokens` 2× | `npx tsx src/scripts/generate-tokens.ts` | exit 0 nas duas · diff **vazio** após a segunda → determinístico |

O 235/2580 do painel bate exatamente com o número alegado pela UXW-FIX. Zero contenção: rodei
sozinha, sem lane vizinha, e nenhuma falha mudou entre execuções.

## Vetor 2 · Moldura e navegação

**Tentei derrubar e não caiu:**

- **Inventário `aviso-bloqueia` não foi afrouxado.** A asserção continua `toEqual(LISTA_NOMINAL)`,
  exata e ordenada. A lista foi de 8 para 9 com causa documentada (o toggle do rail é um controle
  novo de verdade) e a identidade subiu de `textContent` para nome acessível, o que conserta o
  `'ClubsClubs'` do item fechado. O `BUTTON:` anônimo da lista antiga virou
  `BUTTON:Abrir menu de navegação`. Isso é asserção mais forte, não mais fraca.
- **O helper novo não é o elo fraco.** `apps/painel/src/test/nomeAcessivel.ts` faz `aria-label`,
  senão texto sem as subárvores `aria-hidden`. Devolve `''` de propósito para controle sem nome, e
  documenta que o inventário que aceitar `''` está declarando a dívida.
- **Redirects legados preservam query e hash, sem laço.** `/marcas/*` → `/parcerias` passa por
  `RedirectLegado` (`RotasLegadas.tsx:77-80`), que remonta `${para}${search}${hash}` com `replace`.
  As cinco entradas migradas de clubs (`assessorias`, `assessorias/nova`, `assessorias/:id`,
  `influenciadores`, `minhas-afiliacoes`) usam o mesmo wrapper. Nenhum destino reentra na origem.
- **Moldura rota a rota provada nas duas áreas.** Tabelas com `getAllByRole(...).toHaveLength(1)`
  (um menu a menos é aba órfã, um a mais é moldura duplicada) e asserção de `aria-current="page"`
  único por rota.

**Caiu — ressalva R-1 (teste):** a tabela de Parcerias não tem contra-tabela `FORA_DA_MOLDURA`.
A de clubs tem, e declara o próprio critério: vereditos de "fora por design" ficam "afirmados, não
esquecidos" (`clubes/__tests__/moldura-da-area.test.tsx:66-73`). Em Parcerias, a rota
`assessorias/nova` (`ParceriasRoutes.tsx:55`) fica fora do `<Route element={<ParceriasAreaLayout/>}>`
e não aparece em tabela nenhuma. Não é beco: `CadastrarAssessoriaPage` tem retorno próprio
(`Cancelar` → `/parcerias/assessorias`, l.181-182) e é destino vivo do redirect de
`/clubes/assessorias/nova`. O que falta é a asserção do veredito. Hoje a intenção mora só num
comentário, e quem envolver essa rota no layout amanhã não quebra teste nenhum.

## Vetor 3 · Honestidade de dado

**Falsificação do ticket médio re-executada por mim.** Extraí os seis casos do bloco
`D-1008-R19` de `financeiro.test.ts` e recalculei o denominador ANTIGO (total de inscritos) à mão:

| # | Caso | Denominador antigo | Valor novo | Quebra? |
|---|---|---|---|---|
| 1 | 100.000 · 400 pagantes / 600 inscritos | 166,67 | 250 | **sim** |
| 2 | 100.000 · 400 pagantes / 700 com pendentes | 142,86 | 250 | **sim** |
| 3 | 2.500 · 10 pagantes / 12 com 2 estornados | 208,33 | 250 | **sim** |
| 4 | receita 0 · 0 pagante / 30 inscritos | R$ 0,00 | `null` ("—") | **sim** |
| 5 | 9.000 · contagem ausente / 40 inscritos | 225 | `null` ("—") | **sim** |
| 6 | `STATUS_PAGANTE === 'confirmado'` | não se aplica | constante | não |

**5 de 6, exatamente como o contrato previa.** O caso 6 é asserção de constante e não envolve
denominador.

**A premissa que sustenta a régua foi verificada por mim, não aceita:** `estornarInscricao.ts:845`
grava `receitaConfirmada: Math.max(0, receitaNova)`, revertendo o face; `agregarFinanceiro.ts:21`
declara `receitaBruta = eventos.receitaConfirmada`. O estorno parcial mantém o pagamento
`confirmado` e desconta só a fatia devolvida (`agregarFinanceiro.ts:285-301`), então numerador e
denominador continuam falando do mesmo conjunto. O estorno integral vira status `estornado` e sai
dos dois lados. A conta fecha.

**Outros contratos do vetor, conferidos:** RN-489 aplicada (nenhuma string `visitantes → inscritos`
no código do painel, só comentários explicativos; card cortado). Contratos pinados vivos:
`'Parados há 30 dias ou mais'` (`engajamento/_lib/engajamento.ts:56`) e o `aria-label` da média
ponderada (`EngajamentoView.tsx:568`).

**Ressalva R-2 (registro):** a D-1008-R19 escrita ainda manda usar `STATUS_QUE_CONTAM_VENDA`
(= confirmado + estornado). O código recusa a constante de propósito e pina a recusa em teste
(caso 6). A lane METRICAS-PAGANTES agiu certo ao registrar a divergência como vetável do dono, com
condição de reabertura. O que ninguém fez foi emendar o registro: hoje o cânone e o código dizem
coisas diferentes sobre a mesma régua. A próxima lane que ler só a decisão vai "consertar" o código
de volta. Correção é de documento, não de código.

## Vetor 4 · Copy e cânone (greps meus, independentes)

**Ressalva R-3 — a única que pede código. Jargão interno renderizado na área nova.**

`apps/painel/src/routes/parcerias/marcas/MarcaFormModal.tsx:145`

```
description="Registro reutilizável de patrocinador — reaproveitado no cadastro de patrocínios (RN-171)."
```

Renderiza: `Modal.tsx:218-223` desenha `{description}` e a amarra em `aria-describedby` (l.142), então
a string vai para a tela E para o leitor de tela. Três agravantes. O commit `e5ee7d21` tem por
assunto "Parcerias sem jargao interno", e este é o modal de criar marca dentro de Parcerias. A
ocorrência não está na lista de dívida declarada da UXW-FIX (que declara RN-144 ×2, RN-141 ×2,
`idempotente` ×1 e as stories do DS). E a alegação da lane de "zero RN-XXX em prop de render" foi
medida com um conjunto de props que não inclui `description`.

**A causa é estrutural e vale mais que o achado:** a UXW-REVIEW mirou "strings visíveis no diff
`e64b8c47..HEAD`". `MarcaFormModal.tsx` entrou em Parcerias como rename puro, zero linha de
conteúdo alterada, logo nunca apareceu num diff de conteúdo. Arquivo movido para uma área nova
carrega copy não revisada para uma superfície renomeada. Qualquer review de copy futura precisa
varrer a área RENDERIZADA, não o diff.

**Ressalva R-4 (dívida declarada, com aresta):** `NovoClubePage.tsx:210` mostra
`"Exigir aprovação manual de novos membros (RN-141)"`. A UXW-FIX declarou o item na fila, o que é
honesto. A aresta é que o delta editou esse mesmo arquivo, trocando `clube` por `club` em cinco
rótulos, e passou duas linhas acima do jargão.

**Ressalva R-5 (pré-existente):** `KitsCadastroView.tsx:195` renderiza `"Logo exibido ao atleta"`.
Vocabulário que a D-0802-1 aposentou. É anterior ao delta (`d4bb22f1`), mas está num arquivo que
este delta tocou.

**Não caiu:** a varredura de `corrida`/`prova`/`atleta` como CATEGORIA em superfície não achou mais
nada. Os outros acertos são comentários de código, identificadores internos (`atletasAlcancados`,
com o rótulo já corrigido para "Pessoas alcançadas") e tokens de tema (`gradient-corrida`). O
placeholder `"Assessoria Corrida Livre"` (`CadastrarAssessoriaPage.tsx:151`) é nome próprio de
exemplo, não categoria. RN-468 cumprida: `AlternadorDePainel.tsx:54` devolve `'Painel Profissional'`;
o que sobra de "Painel do Organizador" é comentário e story do DS, ambos já declarados.

## Vetor 5 · Tokens e L-021

- **Zero hex de design no delta.** Os três acertos de hex em linhas `+` estão todos em
  `rn-themes.ts`, arquivo com cabeçalho `AUTO-GENERATED — do not edit manually`, gerado a partir de
  `tokens/semantic*.json`, que por sua vez usam referência (`{neutral.850}`), nunca cor solta.
- **Zero px cru de design.** Os três acertos de `px` são uma asserção de teste (`menu.style.top`),
  um comentário e uma linha de prosa em `SubNav/LLM.txt`.
- **D-1008-R7 honrada de verdade:** `cta-h`/`cta-h-sm` saíram de `tokens/component.json` e das três
  peles (`--v3-cta-h` e `--v3-cta-h-sm` removidos em brasa, wine e dark-wine).
- **D-1008-R4 é fix real, não no-op.** Cheguei a suspeitar de no-op, porque em brasa e wine o
  `surface-overlay-opaque` resolve o mesmo primitivo que o `surface-overlay`. Não é: o bloco
  `[data-glass="on"]` (`index.css:550-556`) reescreve `--surface-overlay` para
  `var(--glass-surface-overlay)` nos três temas, e o `--popover` agora aponta para o token que o
  vidro nunca toca.
- **Gate do R18 existe e é nomeado.** `contrast.test.ts` ganhou um `describe` próprio, "SubNav
  transparente", varrendo os 3 temas × 5 estados (ativo, inativo, hover, focus-visible, indicador)
  contra `surface-base`, com 4.5 para texto e 3.0 para não-texto. A matriz genérica subiu para 38
  pares de texto.

**Ressalva R-6 (baixa, de fundamentação):** o gate chama `surface-base` sólido de "piso
conservador" sob o vidro. Para o tema CLARO isso é direcionalmente errado: o `page-glow` do wine é
`rgba(232,86,98,.16)`, que ESCURECE a página, e escurecer fundo claro derruba o contraste de texto
escuro. Medi o pior caso em vez de supor:

| Par (wine) | Sobre base sólida | Sobre o pico do glow | Mínimo |
|---|---|---|---|
| `text-secondary` (aba inativa) | 7,52:1 | **6,26:1** | 4,5:1 |
| `text-primary` (ativa e hover) | 15,16:1 | **12,61:1** | 4,5:1 |

Nenhuma reprovação AA: a margem absorve o glow com folga. A ressalva é sobre a justificativa
escrita, que ficará errada no dia em que alguém encostar nos tokens de texto do tema claro.

## Vetor 6 · Build servido = HEAD (provado byte a byte)

`:4601` responde HTTP 200 e serve `/assets/index-DtmHYTG9.js`. `:4599` responde 200. Não toquei em
nenhum dos dois: buildei para um `outDir` no scratchpad.

**Ordenação da armadilha, paga e provada por timestamp:**

| Artefato | Momento | Evidência |
|---|---|---|
| commit `89537700` (BARCHART-FIX) | 05:08:06 | `git show` |
| `design-system/dist/index.mjs` (tsup) | 05:08:53 | contém `formatarTickEixoY` (2 ocorrências) |
| `painel/dist/assets/index-DtmHYTG9.js` (vite) | 05:09:15 | posterior ao dist do DS |

O DS resolve só por `dist` (o `exports` do `package.json` não expõe `src`), então a ordem tsup antes
de vite é o que faz o fix chegar ao bundle. Ela foi respeitada.

**O primeiro rebuild NÃO bateu, e persegui a diferença até o fim.** Deu `index-D-cpkvdo.js`, cerca
de 4,9 kB menor. Grep de `formatarTickEixoY` no bundle servido devolve 0, mas isso não prova nada:
o bundle é minificado por esbuild e o nome é mangled. Extraí então os literais de prosa dos dois
bundles e diferenciei. O servido tinha exatamente 5 strings a mais, todas de configuração do
Firebase (`leela-hub`, `leela-hub.firebaseapp.com`, `leela-hub.firebasestorage.app`, a API key e a
URL da landing). A diferença era modo de build, não deriva de fonte.

**Rebuild com o modo certo reproduz o servido byte a byte:**

```
npx vite build --mode leela-hub
```

| Arquivo | sha256 | Bytes |
|---|---|---|
| `index-DtmHYTG9.js` servido | `6170f763538449af25c30bc91c47df02cc44e309214ff8888038f931259a75db` | 2.291.253 |
| `index-DtmHYTG9.js` rebuild | `6170f763538449af25c30bc91c47df02cc44e309214ff8888038f931259a75db` | 2.291.253 |
| `index-sDPZyP0B.css` servido | `f81c5190e1a55b912db7d9b7b8eb69e0ba3b3937fc029b8448b17478adb4e862` | — |
| `index-sDPZyP0B.css` rebuild | `f81c5190e1a55b912db7d9b7b8eb69e0ba3b3937fc029b8448b17478adb4e862` | — |

`index.html` idêntico por `diff`. **O `:4601` serve o build do HEAD `89537700`.** Vetor fechado.

**Ressalva R-7 (operacional, para a lane de deploy):** `pnpm build` sem `--mode leela-hub` produz um
bundle SEM configuração de Firebase. Compila, sobe e não fala com o backend. O modo é obrigatório no
comando de deploy.

**Ressalva R-8 (operacional, para a lane de merge):** qualquer comando `pnpm` sem
`--config.verify-deps-before-run=false` dispara `pnpm install`, que escreve
`'@sentry/cli': set this to true or false` em `pnpm-workspace.yaml` e suja a árvore. Aconteceu
comigo, restaurei com `git checkout --` e reconferi: árvore limpa em `89537700`. Um `git add -A`
distraído na lane de merge commita esse lixo.

## Vetor 7 · Prontidão do merge (leitura, sem execução)

| Medida | Valor |
|---|---|
| merge-base | `eed6cf22` |
| `origin/main` na leitura | `5a952bc1` (+46 commits, 71 arquivos desde a base) |
| `HEAD` da branch | `89537700` (+48 commits, 167 arquivos desde a base) |
| Interseção de arquivos tocados nos dois lados | **vazia** |
| `git merge-tree --write-tree origin/main HEAD` | exit **0**, uma linha (tree `3d05e057`), **zero conflito** |

**Conflitos prováveis: nenhum.** As duas frentes trabalharam em arquivos disjuntos, e o merge-tree
confirma pelo algoritmo real, não por inspeção. Os renames pesados do delta (`routes/marcas/*` e as
entradas de assessorias e afiliações migrando para `routes/parcerias/`) não colidem porque a main
não encostou em nenhum desses caminhos.

Ressalva de validade: a leitura vale para `origin/main` em `5a952bc1`. Se a main andar antes do
merge (a lane METRICAS-PAGANTES-BACKEND corre lá), re-rodar o `merge-tree` custa segundos.

---

## fix_list

| ID | Gravidade | Onde | O quê | Custo |
|---|---|---|---|---|
| **R-3** | **Ressalva alta (código)** | `parcerias/marcas/MarcaFormModal.tsx:145` | Tirar `(RN-171)` da `description` do modal. Some da tela e do `aria-describedby`. Sugestão: "Registro reutilizável de patrocinador, reaproveitado no cadastro de patrocínios." | 1 linha |
| R-3b | Ressalva alta (processo) | lane de copy | Varredura de copy passa a mirar a área RENDERIZADA, não o diff de conteúdo. Arquivo movido por rename entra com copy não revisada. | processo |
| R-2 | Ressalva média (registro) | `01-decisoes-dono-1008-retomada.md`, D-1008-R19 | Emendar o texto: o denominador é `confirmado`, não `STATUS_QUE_CONTAM_VENDA`. Registrar a divergência já aceita como vetável. Sem isso o cânone contradiz o código. | doc |
| R-1 | Ressalva média (teste) | `parcerias/__tests__/moldura-da-area.test.tsx` | Adicionar `FORA_DA_MOLDURA` com `assessorias/nova`, no padrão da tabela de clubs. | 1 tabela |
| R-7 | Ressalva média (deploy) | comando de deploy | Fixar `--mode leela-hub` no build de produção. Sem o modo, bundle sem Firebase. | comando |
| R-8 | Ressalva baixa (merge) | lane de merge | Usar `--config.verify-deps-before-run=false`; conferir `pnpm-workspace.yaml` antes do commit. | disciplina |
| R-4 | Ressalva baixa (dívida declarada) | `clubes/novo/NovoClubePage.tsx:210` | `(RN-141)` na tela. Já na fila da UXW-FIX. | 1 linha |
| R-5 | Ressalva baixa (pré-existente) | `eventos/kits/KitsCadastroView.tsx:195` | "Logo exibido ao atleta" viola a D-0802-1. Anterior ao delta. | 1 linha |
| R-6 | Ressalva baixa (fundamentação) | `theme/__tests__/contrast.test.ts` | Corrigir a justificativa: base sólida não é piso conservador em tema claro. Medido, sem reprovação (6,26:1 no pior caso). | comentário |

## O que tentei derrubar e não caiu

Registrado com evidência, para a próxima review não repetir o caminho.

1. **Asserções afrouxadas para o gate passar.** Varri as 60 linhas de `expect` removidas nos testes
   do delta. Todas rastreiam renomeação (`clube`→`club`, "Painel do Organizador"→"Painel
   Profissional", `/marcas`→`/parcerias`) ou copy que a UXW-FIX trocou. O inventário do
   `aviso-bloqueia` ficou mais estrito, não menos.
2. **Fix do popover como no-op no tema padrão.** Falhou: o bloco do vidro reescreve
   `--surface-overlay` nos três temas.
3. **Bundle servido desatualizado em relação ao HEAD.** Falhou: sha256 idêntico após reproduzir o
   modo de build.
4. **Ticket médio com denominador errado.** Falhou: a régua `confirmado` é coerente com o fluxo real
   de estorno, verificado nas functions, e a falsificação quebra 5 de 6 casos como prometido.
5. **Conflito escondido de merge por causa dos renames.** Falhou: interseção vazia e merge-tree
   limpo.
6. **Termo banido "verbatim" introduzido pelo delta.** Falhou: zero ocorrências em linhas `+`.
   Existem 70 no repositório, todas anteriores. Fica como dívida de fora deste portão.
