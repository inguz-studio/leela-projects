# REV-VITRINE — handoff vivo

**Lane:** `REV-VITRINE` · **Trace:** `leela-retomada-20260808` · **Employee:** `sf-qa-engineer`
**Papel:** revisor antagonista de contexto frio
**Repo:** `C:\dev\LEELA` · branch `main` · base `71635421`
**Alvo:** `f7477821` + `133ef123` + `f9b946b4` (a vitrine do onboarding, RN-510)

## VEREDITO

# APROVADA COM RESSALVAS

A propriedade central sobrevive ao ataque: **nenhuma query tenant-scoped sai da vitrine**, e o
véu compila de verdade no CSS que o build entrega — medido por mim no `dist`, não lido do código.
Os números da lane construtora conferem.

O que ela acertou por sorte, e que o ataque derrubou, são **três**:

1. **DEF-R1 · o véu bloqueia o mouse e não bloqueia a tecnologia assistiva.** Com o aviso na tela,
   um clique de leitor de tela no menu lateral NAVEGA o painel e o aviso continua lá. Provado.
2. **DEF-R2 · a fronteira de PAPEL não tem gate nenhum.** Uma rota irmã com `RequireSessao` e sem
   `ContaTravadaGate` vaza `getOverview` para a conta em vitrine com **eslint, os 28 casos e a
   própria allowlist os três verdes**. Provado por falsificação.
3. **DEF-R3 · a espera do crachá não assenta nunca.** `getClaims` pendurado = skeleton eterno.
   Provado com 5 minutos de relógio simulado.

Mais um buraco de gate sem defeito por trás (**DEF-R4**: `/conta`, a única rota onde a tela REAL
monta para a conta em vitrine, é a única que a allowlist nunca visita) e dois juízos do dono.

---

## Estado das tarefas

| # | Tarefa | Estado | Commit |
|---|---|---|---|
| T1 | Medição no buildado (véu, tokens, z-index, contraste AA por estado) | ✅ | — (medição) |
| T2 | Ataque aos 9 vetores + falsificações | ✅ | — (medição) |
| T3 | Gate estrutural da camada de PAPEL (DEF-R2) | ✅ | `182d2852` |
| T4 | Prazo da espera do crachá + `/conta` na allowlist (DEF-R3, DEF-R4) | ✅ | `1defe563` |
| T5 | O elo do desfoque no gate do véu (DEF-R5) | ✅ | `998cea5f` |
| T6 | Painel canônico + board + épico | ✅ | `df3bfb28` |

Push: `aaf1673a..998cea5f` e `df3bfb28` em `origin/main`.

**Construído × revisado × NO AR.** A vitrine está **construída** e agora **revisada**. Ela
**não está no ar** — nada desta lane sobe sozinho, e os três consertos entram no mesmo deploy do
painel que a `S1609-T2-DEPLOY` espera.

**Tempo da lane: ~1h20.** Passou de uma hora; o custo maior foi o `vite build` (19s) mais quatro
execuções de suíte de arquivo único a ~14–47s cada, e as duas falsificações, que exigem rodar
eslint e dois arquivos de teste com o `App.tsx` patchado e depois revertido.

---

## §1 · O que foi medido no BUILDADO (não lido do código)

`vite build` desta lane: exit 0, 19,06 s, `dist/assets/index-DufB2CDQ.css` **109.895 bytes** —
byte a byte o mesmo hash e o mesmo tamanho que a lane construtora reportou. A âncora bate.

| Medição no CSS que o build produz | Resultado |
|---|---|
| ocorrências da classe do DEF-C (`\/95`) | **0** |
| regra do véu | `.bg-\[var\(--modal-overlay-bg\)\]{background-color:var(--modal-overlay-bg)}` ✅ presente |
| regra do desfoque | `.backdrop-blur-\[var\(--modal-overlay-blur\)\]{--tw-backdrop-blur: blur(var(--modal-overlay-blur));…}` ✅ presente |
| `--modal-overlay-bg` no bundle | `rgba(0,0,0,.6)` nos dois blocos de tema |
| `--modal-overlay-blur` no bundle | `4px` nos dois blocos de tema |
| maior `z-index` do painel inteiro | **50** — e ele é o do véu (`.z-50`). Não há regra acima dele |
| `isolation` / `will-change` / `contain` no bundle | **0 ocorrências** — nenhum ancestral rouba o `fixed` do véu |
| blocos de tema embarcados | `:root:not([data-theme]),[data-theme=brasa]` e `[data-theme=wine]` |

`apps/painel/index.html` **não declara `data-theme`** → o painel roda o bloco
`:root:not([data-theme])`, que é o **brasa (escuro)**. É esse o tema medido abaixo.

**Vetor 1 não caiu pela cor.** Caiu por outro lado (DEF-R1, §3).

---

## §2 · Vetor 9 — contraste AA por estado, com número

Calculado dos **tokens resolvidos do bundle**, não do navegador. Composição alfa feita à mão onde
o token tem alfa (véu, brand-tint) e onde o Tailwind aplica `opacity-40` no estado desabilitado.

### Tema brasa (o que roda hoje no painel)

| Par medido | Razão | Limiar | |
|---|---|---|---|
| h1 "Boas-vindas à Leela" `--text-primary` #F9F9F9 / painel #161616 | **17,19:1** | 4,5 | PASSA |
| descrição "fale com o nosso time" `--text-secondary` #BFBFBF | **9,84:1** | 4,5 | PASSA |
| linha do participante `--text-tertiary` #999999 | **6,35:1** | 4,5 | PASSA |
| link "Falar com o time Leela" `--action-brand-tint-fg` #FF6520 | **6,15:1** | 4,5 | PASSA |
| "Minha conta" / "Sair" `--text-tertiary` | **6,35:1** | 4,5 | PASSA |
| erro `role="alert"` sobre `--surface-base` | **18,58:1** | 4,5 | PASSA |
| EmptyState da vitrine (título / descrição) | 17,19 / 9,84 | 4,5 | PASSA |
| **foco visível** `--ring` = `--border-focus` #FF6520 vs painel | **6,15:1** | 3,0 | PASSA |
| **foco visível** vs `--surface-base` | **6,65:1** | 3,0 | PASSA |
| botão primário repouso #FFFFFF / #D63500 | **4,81:1** | 4,5 | PASSA |
| botão primário **hover** #FFFFFF / #DC3700 | **4,58:1** | 4,5 | PASSA (margem de 0,08) |
| botão primário **pressed** #FFFFFF / #B82D00 | **6,15:1** | 4,5 | PASSA |
| botão secundário repouso (texto/borda #737373) | 17,19 / **3,82:1** | 4,5 / 3,0 | PASSA |
| botão secundário **hover** (tint 10% composto) #FF6520 | **5,58:1** | 4,5 | PASSA |
| botão primário **desabilitado** (`opacity-40`, o estado inicial de "Liberar acesso") | **3,15:1** | — | isento (1.4.3, componente inativo) |
| **painel do aviso #161616 vs o fundo VELADO rgb(5,5,5)** | **1,13:1** | 3,0 (1.4.11) | **FALHA** |
| borda do painel #242424 vs fundo velado | 1,31:1 | 3,0 | **FALHA** |

### Tema wine (não é o que roda; medido por completude)

Tudo passa com folga, e o par do painel contra o fundo velado dá **5,90:1** — o problema é
específico do escuro. O desabilitado cai para **1,43:1** (isento, mas ilegível).

**Leitura:** o texto e o foco estão AA em todo estado, com sobra. O que não passa é o **limite do
painel do aviso contra o próprio véu no tema escuro**: #161616 sobre um fundo velado de rgb(5,5,5)
é 1,13:1, e a borda `--border-subtle` não resgata (1,31:1). Na prática, quem tem baixa visão vê o
texto do aviso flutuando, sem enxergar onde o cartão começa e termina. Isso é **juízo do dono**
(§5, JUI-1): a cor mora no DS, fora do território desta lane, e mexer em `--surface-raised` afeta
o painel inteiro.

**O que sobrou para o navegador, e onde o dono confere.** Nada do contraste — está todo calculado
acima. Sobra só a confirmação visual do foco (o anel tem `ring-offset-2`, e offset com fundo
`ring-offset-background` num painel sobre véu é a única coisa que o cálculo de par não decide).
Endereço: `https://painel.leela.com.br/` logado com conta **sem** código Leela, `Tab` até
"Continuar olhando" dentro do aviso. **O que ele vai encontrar:** anel laranja #FF6520 de 2px com
2px de respiro, legível — o par já está em 6,15:1. Se o offset sumir contra o painel, é o
`ring-offset-background` que não resolve, e aí é linha para o DS.

---

## §3 · Os 9 vetores, um a um

### Vetor 1 · Véu que não bloqueia no buildado — **DERRUBADO, por outro lado**

**Tentei, na cor:** compilei o `dist` inteiro e procurei a regra do véu, a regra do desfoque, os
dois tokens e a classe do DEF-C. Tudo confere (§1). O ataque declarado (véu montado por `cn()` em
runtime) não existe hoje — o `className` do `role="dialog"` é literal.
**Nota sobre o gate:** o `veu-buildado.test.ts` lê o `className` com
`/className="([^"]+)"/` a partir de `role="dialog"`. Se alguém trocar para `className={cn(…)}`,
o regex pula o véu e casa com o `className` do **painel interno**, que tem
`bg-[var(--surface-raised)]` — e aí o caso 1 passa (há fundo e há `var(--`), mas os casos 2 e 3
falham. O gate é frágil, mas **fail-closed**. Não é defeito.
**Duas frestas reais do gate, essas sim:** (a) o teste compila a classe **isolada** com
`content: [{ raw }]` — ele nunca pergunta se a regra chegou ao bundle; se o `content` do
`tailwind.config.ts` deixar de cobrir `src/routes/onboarding/**`, a regra some do `dist` e o gate
segue verde. (b) o bloco de tema exige alfa ≥ 0,5 em `--modal-overlay-bg` nos três arquivos e
**nunca verifica que `--modal-overlay-blur` existe** — `blur(var(--indefinido))` invalida o
`backdrop-filter` inteiro, que é o DEF-C um degrau adiante. Hoje vale 4px. Corrigido em T3.

**O que derrubou o vetor: DEF-R1.** O véu bloqueia o **hit-test do mouse**. Não bloqueia mais nada.
Com o aviso aberto, medido na árvore renderizada:

```
[PROBE] regioes vivas com o aviso aberto: 1
[PROBE]   role=status aria-label="Esta área abre com o código Leela"
          dentroDoDialog=false  ariaHidden=false  inert=false
[PROBE] dialog esta dentro do <main>?  true
[PROBE] dialog portalizado no body?    false
[PROBE] focaveis FORA do dialog: 8
[PROBE] amostra fora: A:Visão Geral | A:Eventos | A:Clubs | A:CRM | A:Marcas |
                      A:Configurações | BUTTON: | BUTTON:Como receber o código
[PROBE] body.style.overflow = ""
[PROBE] achou o link Marcas fora do dialog? true
[PROBE] URL depois do clique de AT: /marcas
[PROBE] dialog AINDA na tela? true
```

Um clique de tecnologia assistiva (o `element.click()` sintético que VoiceOver, NVDA e TalkBack
emitem — não passa por hit-test, então o véu não o intercepta) **navegou o painel para `/marcas`
com o aviso "bloqueante" na frente**. E como os ouvintes saem do documento enquanto o aviso está
aberto (decisão 2 do `primeiraInteracao.ts`), essa navegação acontece em silêncio absoluto.

A armadilha de Tab é o único freio, e ela é um `onKeyDown` **no próprio dialog**: só morde se o
foco já estiver dentro. Cursor virtual, modo de leitura e o gesto de deslizar do celular não são
Tab. Não há `inert`, não há `aria-hidden` no fundo, não há trava de rolagem, e o dialog não é
portalizado — ele mora dentro do `<main class="overflow-hidden">`.

**E o repo já tem a peça certa:** `packages/design-system/src/components/Modal/Modal.tsx` faz
portal para o `document.body`, `useDialogBehavior` (armadilha cíclica, Esc, trava de rolagem,
retorno de foco) e `aria-hidden` no véu. O aviso construiu à mão uma versão pior de um componente
que já existe — vai contra a regra de reaproveitamento primeiro. Trocar o desenho é decisão do
dono (§5, JUI-2), não conserto de review.

### Vetor 2 · Query tenant-scoped escapando na vitrine — **de pé, com uma fresta**

**Tentei:** (a) varri `apps/painel/src` inteiro atrás de `firebase/firestore`, `firebase/auth` e
`firebase/functions` importados direto, que é o ataque declarado (o espelho do mock não os
cobriria): **zero ocorrências**. (b) Li os três hooks do `RootShell`, que ficam **acima** do gate e
que a allowlist cobre por tabela porque o teste monta o `App` real: `useShellSession` (só
`onSessionChange`), `usePaineisDaConta` (só `getClaims`) e `useEventosAtivosBadge` — este último
chama `listarEventosDoOrganizador`, mas com guarda por `tenantId`, e a conta em vitrine não tem.
Nada vaza. (c) Rodei a allowlist contra `/conta` e `/conta/perfil-publico`, que o teste da lane
nunca visita: `FORASTEIRAS = (nenhuma)`. A propriedade **é verdadeira também lá**.

**A fresta é de custo, não de dado:** a conta em vitrine paga **dois refreshes forçados de ID
token por carga de página** — `resolverSessao` faz `lerClaims(false)` e, com crachá vazio,
`lerClaims(true)`; e `usePaineisDaConta.resolver` faz o mesmo por conta própria porque
`paineis.master` é falso. Dois `POST` ao securetoken para descobrir duas vezes a mesma coisa. Não
é leitura de tenant, não derruba o vetor, e está registrado aqui para não sumir.

### Vetor 3 · Fronteira aberta por regressão — **DERRUBADO (DEF-R2)**

O ataque declarado ("rota aninhada com guarda de papel trocado") não é o buraco: a regra de lint
diz por escrito que não olha rota aninhada, e tem razão — tudo dentro de `<Route path="/*">` está
sob o guarda por construção. **O buraco é um nível acima, e é o mesmo defeito que a própria regra
de auth foi escrita para prevenir, uma camada abaixo dela.**

Falsificação, com o método da lane construtora (arquivo temporário, medido e revertido na mesma
sessão). Enxertei em `App.tsx` uma rota irmã autenticada, exatamente a forma que alguém escreve
sem pensar:

```jsx
<Route
  path="/relatorios/*"
  element={<RequireSessao><RootShell><CrmRoutes /></RootShell></RequireSessao>}
/>
```

Ela tem `RequireSessao`. Ela **não** tem `ContaTravadaGate`.

| Gate | Com a rota enxertada | |
|---|---|---|
| `eslint apps/painel/src --max-warnings 0` (inclui `leela-auth/rota-fora-da-fronteira`) | **exit 0** | verde |
| `fronteira-auth.test.tsx` (os 28 casos) | **28 passed** | verde |
| `vitrine-sem-query.test.tsx` (a allowlist) | **10 passed** | verde |
| a conta em vitrine abrindo `/relatorios` | `FORASTEIRAS = getOverview` | **VAZOU** |

Três gates verdes e uma query tenant-scoped saindo pela porta. `App.tsx` revertido com
`git checkout --` e conferido: `git diff --stat` vazio.

A causa é estrutural: a **camada de PAPEL não tem gate nenhum**. A camada de AUTH tem lint E
contrato de 28 casos. A propriedade da vitrine é protegida só por uma lista de sete URLs
enumeradas à mão num teste — e o cabeçalho desse teste afirma, verbatim, "qualquer leitura nova,
**em qualquer tela**, em qualquer lane futura, aparece aqui como nome desconhecido e derruba o
caso". Isso é falso: só aparece se a tela estiver numa das sete URLs **e** montar através do gate.
Conserto em T3.

### Vetor 4 · Teclado que não sobe o aviso — **de pé, latente**

`ArrowRight`, `ArrowDown`, `Home` e `End` sobre um item de menu focado: o aviso **não sobe**
(medido). `TECLAS_DE_USO` é `Enter`, `' '` e `'Spacebar'`, e nada mais.

Mas o ataque **não alcança nada hoje**, e isso é medida, não opinião: inventariei a superfície que
a conta em vitrine realmente vê (sidebar do `RootShell` + `VitrinePainel`) atrás de
`role=tab|switch|menuitem|slider|combobox|listbox|spinbutton`: **0 elementos**. Os dois widgets de
tecla própria do DS — `SubNav` (`ArrowLeft`/`ArrowRight`) e `DropdownMenu` (`ArrowUp`/`ArrowDown`)
— vivem **dentro das rotas**, que não montam na vitrine. O `Switch` do DS é
`<input type="checkbox" role="switch">` nativo, e nativo responde a `Espaço`, que já conta.

Vetor de pé como dívida latente, não como defeito. Vira item nomeado (§5, JUI-3) porque "o que
conta como tentar usar o painel" é fala do dono, não escolha de review.

### Vetor 5 · Resgate que destrava sem refresh de crachá — **de pé**

**`platformAdmin`:** `contaTravada` sai por `isPlatformAdmin(cracha)` **antes** de olhar
`tenantId`, e o crachá é remontado com as duas pernas (`role` + `platformAdmin`). Administrador de
plataforma sem tenant nunca entra em vitrine. E `resolverSessao` inclui `platformAdmin !== true` na
conta de "crachá vazio", então a conta nomeada por capacidade força o refresh em vez de ficar
presa. O caminho do PAPEL-DUPLO está coberto.

**Resgate em `/conta`:** confirmado que a vitrine não monta lá (`rotaDaPessoa` → `emVitrine` falso)
e portanto o aviso não existe naquela rota. **Não é buraco**: o aviso é o único lugar que tem o
campo de código, e ele sobe em todas as outras rotas. A pessoa que está em `/conta` navega para
qualquer lugar e o aviso volta. Além disso, o `Link to="/conta"` do próprio aviso é a saída
desenhada — e ele está sob `ATRIBUTO_ISENTO`, então não se rearma na cara dela.

**Sequência do destravamento, lida linha a linha:** `resgatar` → `resgatarConviteOrganizador` →
`getClaims(true)` (refresh forçado, dentro do hook) → `sessao.recarregar()` → `setRecarga(n+1)` →
o efeito remonta, `resolverSessao` faz `lerClaims(false)` e agora acha o `tenantId` no token
recém-refrescado. Se por corrida o cache ainda vier vazio, o `if (!claims.tenantId && !claims.role
&& …)` força um segundo refresh. Duas voltas de rede, mas fecha. Não achei buraco.

### Vetor 6 · A espera do crachá não tem prazo — **DERRUBADO (DEF-R3)**

Não é hipótese. Medido, com `getClaims` devolvendo `new Promise(() => {})` — a rede que engoliu a
resposta, que é o que uma aba suspensa no celular faz:

```
[PROBE] apos 5 min: skeleton ainda na tela? true
[PROBE] vitrine apareceu? false
```

Cinco minutos de relógio simulado e a pessoa continua olhando um retângulo cinza, sem erro no
console, sem caminho e sem nada para clicar. O estado terminal para o caso de **falha** já existe e
está certo (`catch` → `authenticated` sem papel → vitrine, fail-closed). O caso **pendurado** não
tem nenhum. Era um estado que não existia antes desta lane — ela criou o estado e não criou a
saída. Conserto em T3.

### Vetor 7 · `EmptyState` `role="status"` sob `aria-modal` — **de pé; o medo era outro**

Medi a leitura real na árvore renderizada, e o que a lane temia **não acontece**: navegar pela
vitrine com o aviso fechado **não** reanuncia nada.

```
[PROBE] mesmo nó DOM apos navegar? true
[PROBE] conteudo da regiao viva mudou? false
[PROBE] titulo da pagina agora: Marcas
```

O `EmptyState` é o mesmo nó, com o mesmo HTML, em todas as áreas — o que muda de `/` para
`/marcas` é o `PageHeader`, que **não** é região viva. Região viva só fala quando o conteúdo muda;
este nunca muda. Zero ruído por navegação. O vetor 7, como escrito, está falsificado na direção
boa.

O que sobra é menor e é isto: existe **uma** região viva no painel da conta em vitrine, ela está
**fora** do dialog, e não está `aria-hidden` nem `inert` (medido acima). É a mesma raiz do DEF-R1,
e o conserto é o mesmo — está contado lá.

**O que sobrou para o navegador, e onde o dono confere.** A ordem em que o NVDA lê o aviso ao
abrir. Endereço: `https://painel.leela.com.br/`, conta sem código Leela, NVDA ligado, clique em
"Eventos" no menu. **O que ele vai encontrar:** o foco vai para o painel (`tabIndex={-1}` +
`focus()`), e o NVDA anuncia "Boas-vindas à Leela, diálogo" pelo `aria-labelledby`, depois a
descrição pelo `aria-describedby`. É o encadeamento correto. O que o cálculo não decide é se o
NVDA respeita o `aria-modal` e para de expor os oito controles do fundo — e essa é exatamente a
pergunta do DEF-R1.

### Vetor 8 · `ROTAS_LIBERADAS = ['/conta']` — **de pé, com buraco de gate (DEF-R4)**

A lista tem um nome e o casamento é por prefixo com barra (`/contabilidade` **não** casa — conferi
o predicado). `/conta` é a única rota onde a tela REAL monta para a conta em vitrine, e é, por
isso, o único lugar onde a propriedade da RN-510 pode ser quebrada por uma tela de verdade.

**E é a única rota que a allowlist nunca visita.** `ROTAS_DA_VITRINE` enumera `/`, `/eventos`,
`/clubes`, `/crm`, `/marcas`, `/plataforma` e uma rota inventada. Sete URLs, e nenhuma delas é a
única onde há tela real. Rodei eu: `/conta` e `/conta/perfil-publico` estão limpos hoje
(`FORASTEIRAS = (nenhuma)`), e `/conta` tem `RecebimentoSection` e o editor de perfil público
dentro — duas telas que uma lane futura pode ligar a dado de tenant sem nenhum gate reclamar.
Conserto em T3 (é uma linha de lista, e fecha o buraco para sempre).

Se `/conta` continua sendo a única rota liberada é pergunta de produto, não de review (§5, JUI-4).

### Vetor 9 · Contraste AA por estado e foco visível — **medido, §2**

Sem navegador, calculado dos tokens resolvidos do bundle. Um número não passa e é juízo do dono
(JUI-1). Todo o resto passa, incluindo o anel de foco em ambos os fundos.

---

## §4 · Defeitos a consertar (T3)

| ID | O que é | Severidade | Onde |
|---|---|---|---|
| DEF-R2 | Camada de PAPEL sem gate estrutural: rota irmã sem `ContaTravadaGate` vaza com 3 gates verdes | **alta** | ✅ `182d2852` — `gate-de-papel.test.ts` |
| DEF-R3 | Espera do crachá sem prazo → skeleton eterno | **alta** | ✅ `1defe563` — prazo de 12s, fail-closed |
| DEF-R4 | `/conta` fora da allowlist — a única rota com tela real | média | ✅ `1defe563` — mais `/conta/perfil-publico` |
| DEF-R5 | `veu-buildado.test.ts` não verifica que `--modal-overlay-blur` existe | baixa | ✅ `998cea5f` |

DEF-R1 **não** vira commit meu: o conserto é adotar o `Modal` do DS no aviso, o que muda o desenho
da tela e é decisão do dono. Subiu ao painel canônico como **VITRINE-VEU-1**, com default.

---

## §5 · Juízos do dono (vão para o painel canônico)

Aterrissados em `leela-specs/01-produto/DECISOES-ABERTAS.md` (commit `df3bfb28`), com default
**em vigor** — nenhum dos dois trava o deploy da vitrine.

Subiram **dois**, não quatro, e isso é escolha. Outras duas perguntas que a review levantou não
merecem espaço num painel de 63 itens: a das teclas de seta em widget está respondida por medição
(zero widget de tecla própria na superfície da vitrine, então não alcança nada — ficou como uma
linha dentro do VITRINE-VEU-1, para voltar no dia em que a vitrine ganhar o primeiro), e a de
`/conta` continuar sendo a única rota liberada foi respondida pelo próprio conserto: ela continua
sendo a única, e agora é medida.

| ID | Pergunta | Default proposto |
|---|---|---|
| **VITRINE-CONTRASTE-1** | O painel do aviso não se separa do próprio véu no tema escuro (1,13:1; borda 1,31:1) | Subir `--border-subtle` do aviso para `--border-strong` (3,82:1) — muda uma borda, não a paleta |
| **VITRINE-VEU-1** | O aviso é `role="dialog"` feito à mão; o DS tem `Modal` com portal, `inert`, trava de rolagem e retorno de foco | Trocar pelo `Modal` do DS, que fecha o DEF-R1 pela raiz e obedece a reutilização-primeiro |


---

## §6 · Território e higiene

Tocado: `apps/painel/**` e os testes dela. **Nada** em `apps/landing`, `functions/`,
`packages/api-client`, `packages/design-system` — território da PONTE-REV.
`App.tsx` foi patchado para a falsificação do DEF-R2 e revertido por `git checkout --` na mesma
chamada; `git diff --stat apps/painel/src/App.tsx` vazio, conferido.
Nenhum emulator subiu. Nenhuma suíte cheia rodou. Nenhum `--singleFork`. Nenhum `--amend`,
nenhum `stash`.
Arquivo de sonda `_probe-rev.test.tsx` é temporário e **não entra em commit** — apagado no
fechamento da lane.

## §7 · Log dos comandos (evidência)

Nenhum emulator. Nenhuma suíte cheia. Arquivo a arquivo, nomeado, sem `--singleFork`.

```
vite build                                     exit 0 · 19,06 s · dist/assets/index-DufB2CDQ.css 109.895 B
--- baseline, antes do ataque ---
vitest run …/vitrine-sem-query.test.tsx        10 passed
--- falsificação do DEF-R2, com a rota enxertada no App.tsx ---
eslint apps/painel/src --max-warnings 0        exit 0     VERDE FALSO
vitest run …/fronteira-auth.test.tsx           28 passed  VERDE FALSO
vitest run …/vitrine-sem-query.test.tsx        10 passed  VERDE FALSO
sonda em /relatorios com a conta em vitrine    FORASTEIRAS = getOverview   ← vazou
vitest run …/gate-de-papel.test.ts             1 failed: "/relatorios/*"   ← o gate novo morde
git checkout -- apps/painel/src/App.tsx        git diff --stat vazio, conferido
--- depois do conserto, tudo do zero ---
vitest run …/gate-de-papel.test.ts             3 passed
vitest run …/vitrine-sem-query.test.tsx        13 passed  (era 10)
vitest run …/veu-buildado.test.ts              11 passed  (era 8)
vitest run …/vitrine-interacao.test.tsx        10 passed
vitest run …/OverlayConvite.test.tsx           14 passed
vitest run …/ContaTravadaGate.test.tsx         12 passed
vitest run src/routes/__tests__ src/routes/_system/__tests__   8 arquivos · 164 passed
tsc --noEmit                                   exit 0
eslint src --max-warnings 0                    exit 0
```

## §8 · Um erro meu, registrado porque quase virou o mesmo defeito que vim revisar

Na primeira tentativa de falsificar o gate novo contra o `App.tsx` **real**, o teste deu **3
passed** — e eu quase registrei isso como "o gate cobre". Não cobria: o script de patch não tinha
aplicado nada. O `git checkout --` da falsificação anterior devolveu o arquivo com **CRLF**
(`core.autocrlf` da máquina), e a âncora do meu script era LF. O `replace` não casou, escreveu o
arquivo idêntico, e eu tinha acabado de reproduzir, do meu lado, a coisa exata que esta review
existe para pegar: **um verde que prova nada**.

Só apareceu porque o segundo script trazia guarda de âncora e falhou alto. Fica a regra: script de
falsificação **verifica que o defeito entrou** antes de rodar o gate, e o `veredito` só vale
depois de ver o gate **vermelho** com o defeito posto. Com a âncora corrigida, o gate apontou
`/relatorios/*` pelo nome.

## §9 · O que fica para a próxima lane

- **Deploy.** Os três consertos estão em `main` e **não estão no ar**. Entram na
  `S1609-T2-DEPLOY`, junto com a vitrine.
- **Dois itens do dono**, com default em vigor, sem travar deploy: **VITRINE-VEU-1** e
  **VITRINE-CONTRASTE-1** em `leela-specs/01-produto/DECISOES-ABERTAS.md`.
- **Nada pendente por falta de emulator.** Nenhum dos nove vetores exigiu emulator: a vitrine é
  tela, e a propriedade que ela promete se mede com o api-client espelhado.
- **Um handoff alheio segue obsoleto e não editei:** `leela-fronteira-auth-20260806.md` §1 vetor 4
  descreve o `ContaTravadaGate` como ele era antes da vitrine. A lane construtora já tinha
  apontado isso; confirmo que continua obsoleto e continua sem dono.
- **Duas frentes de custo que não são defeito**, para quem for otimizar carga do painel: a conta em
  vitrine paga **dois refreshes forçados de ID token por carga de página** (`resolverSessao` e
  `usePaineisDaConta.resolver` fazem o mesmo trabalho sem se conhecer); e o
  `vitrine-sem-query.test.tsx` emite `act(...)` warning no caso da janela de espera — é
  pré-existente ao meu conserto, é warning e não falha.
