# SUBNAV-UNIFICA · handoff vivo (fechado pela SUBNAV-RESUME, 16/08)

- **Lane:** `SUBNAV-UNIFICA` → retomada como `SUBNAV-RESUME` · branch `subnav-unifica` · worktree `C:\dev\leela-wt-subnav`
- **Trace:** `leela-roadmap-componentes-20260810`
- **Brief:** `.nirvana/briefs/leela-subnav-unifica-20260813-enriched.md` (+ levas 15 e 16 do maestro em voo)
- **Estado:** construído, auditado, gates re-rodados do zero, **mergeado na main**. **NENHUM deploy.**

> A sessão de 13/08 morreu de quota às ~03h50, no instante exato do merge — a
> última fala dela foi "gates verdes contra a main nova, indo para o `--no-ff`".
> A regra da herança é que declaração não é prova: **tudo foi re-medido**. Abaixo,
> primeiro o que a auditoria encontrou, depois o que a lane entregou.

---

## 1 · Auditoria da herança, leva por leva

Estado herdado: branch `subnav-unifica` @ `6cd117cc`, árvore limpa, 8 commits
próprios + um merge da main. O merge nunca aconteceu.

| Leva | Veredito | O que a auditoria mediu |
|---|---|---|
| **14** — a linha morre | **PAGA** | `divider` não existe mais no `SubNav` e a borda inferior é travada em `border-b-0` **depois** do `className`; `AreaSubNav` é o consumidor único e as **11** áreas o importam, **clubs incluído** (`ClubesAreaNav` + `ClubeShell`) — a prova de que a área correta não ficou com uma versão própria; catraca `menu-secundario-cru` no `gate-canon` com baseline **0 painel · 0 landing**; linha no cânone §9, story, `LLM.txt` e testes no mesmo commit |
| **15** — Configurações sai do rail | **PAGA** | `configuracoes` saiu do **catálogo do DS** (não por filtro no app) e a seção `CONTA` foi junto; `sidebar.test.ts` trava **5 itens** e trava que o id não voltou por outro nome; medido na tela: o rail do produtor tem **Visão geral · Eventos · Clubs · CRM · Parcerias** |
| **16** — Sair no popover | **PAGA, com dois buracos** | itens, ordem (Sair por último) e ícone por item estão implementados e testados, e `--popover-icon-size` é token nos três temas. **Mas:** o `tsc` do design-system nunca rodou e o arquivo novo não compilava; e o `useSair`, cujo commit diz que existe por causa do fail-safe, foi entregue **sem nenhum teste próprio** |

**Desvio do brief, aceito:** o brief pedia "promover o menu canônico de clubs a
componente do DS". O `SubNav` **já era** o componente do DS — os onze o
importavam. O que divergia era a montagem, e a peça que nasceu (`AreaSubNav`)
mora no painel porque fia `react-router`, que o DS não tem como dependência.
A rejeição de publicar um `AreaNav` ao lado do `SubNav` está registrada: seria o
segundo nome para um padrão só, na semana em que o cânone nasceu para impedir
exatamente isso.

---

## 2 · O que a SUBNAV-RESUME consertou

Seis defeitos, nenhum deles cosmético:

1. **`tsc` do DS reprovava** (`776d8265`) — `icone-do-item.test.tsx`, nascido na
   leva 16, tinha dois `TS2532` sob `noUncheckedIndexedAccess`. O `vitest` não
   typecheca, então o arquivo passava verde. O handoff antigo declarava "`tsc`
   (painel) 0" e o território da lane incluía o DS, tocado em quatro commits.
   **O `tsc` do DS entra nos gates de qualquer lane que toque `packages/design-system`.**
2. **O fail-safe do logout não tinha teste** (`592669e4`) — quatro casos, sendo o
   que importa o `logout()` que rejeita e ainda assim navega para `/entrar`.
   Sem ele, quem clica em Sair com a rede caindo fica preso numa sessão
   encerrada, sem nada na tela (o `catch` é mudo de propósito).
3. **Colisão de id de história** (`d98534a1`) — `S1260` e `S1261` estavam
   gravadas **duas vezes** no V1-KANBAN: esta lane e a da landing escolheram os
   mesmos números no mesmo dia. A da landing tem 11 sub-tarefas e já estava na
   main; esta andou para **S1266/S1267**. ⚠️ **Id de história se confere no board
   RE-PUXADO na aterrissagem, não no board lido na abertura da lane.**
4. **RN-229 seguia valendo onde ela é definida** (`83311729`) — o supersede
   estava no card e no registro da rodada, mas os dois `rns-delta` que criaram e
   ampliaram a regra continuavam mandando pôr o `border-b` de volta. Quem lê a
   regra lê a tabela, não o board.
5. **Gate visual sem cobertura e com foto repetida** (`70dd1399`) — ver §5.
6. **Sobras do emulador sujando o `git status`** (`0d89d7b2`) — `.gitignore`.

---

## 3 · A causa da linha (medida na leva 14, reconferida aqui)

`border-bottom` de **1px em `--border-subtle`**, desenhado pela prop `divider`
(RN-229) no **mesmo `bottom: 0`** do indicador Brasa. Onde o laranja está, some;
onde não está, aparece — a descrição do dono, literal. Oito dos onze menus
passavam a prop; clubs, que não passava, era o único certo por acaso de quem
escreveu primeiro.

O que estava duplicado **não era o primitivo, era a MONTAGEM**: onze pontos de
render repetindo `useNavigate` + `useLocation` + `tabsComNavSpa`, cada um
escolhendo as props da barra. Reuso de primitivo sem reuso de montagem é a forma
de divergência que dá gate de procedência verde com telas diferentes.

**Um defeito caiu junto:** `TenantFichaLayout` escrevia o `onClick` à mão e
chamava `preventDefault()` sem conferir tecla nem botão. Naquela barra — e só
naquela — ctrl/cmd+clique, clique do meio e "abrir em nova aba" não funcionavam.

⛔ **Diretiva:** `AreaSubNav` não tem uma linha de estilo e não pode passar a ter.
No dia em que ele precisar de `className`, o que mudou é o contrato visual e o
conserto é no DS.

---

## 4 · Gates — TODOS re-rodados do zero, na árvore final

Pacotes rebuildados antes de qualquer suíte (a suíte julga o `dist`, não o `src`).

| Gate | Resultado |
|---|---|
| `gate-canon` inteiro (camada A + catraca) | **PASS** |
| catraca `menu-secundario-cru` | **0 painel · 0 landing** |
| `tsc --noEmit` painel · **DS** · landing | **0 · 0 · 0** |
| `eslint --max-warnings 0` painel · DS+showcase | **0 · 0** |
| tokens, 2 passadas | **0 e 0 arquivos alterados** (geração determinística e igual ao commitado) |
| Suíte do design system | **2084/2084** em 90 arquivos |
| Suíte **COMPLETA** do painel (lei F2 — o rail é moldura) | **2876/2876** em **256** arquivos, em 6 fatias seriais (83+45+35+32+36+25 = 256, que é o total do `find` — nenhum arquivo ficou fora) |
| Gate visual | **PASS** — 18 medições + popover (§5) |

**Duas re-puxadas da main no mesmo dia.** A primeira trouxe 6 commits (lane
KITS-BUILD) com **um conflito, de somar**: `KitsLayout.tsx`, tocado pelas duas
lanes em eixos diferentes — a KITS decidiu QUAIS abas existem (duas, com a
índice renomeada para "Gerenciamento"), esta decidiu COMO a barra é montada.
Ficou o conteúdo da main com a montagem daqui; qualquer um dos dois lados
sozinho perderia trabalho, e tomar o da main nem compilaria. A segunda trouxe
mais 12 (lane CONTROLES-C1), **sem conflito** — inclusive no
`gate-canon.baseline.json`, que as duas lanes tocam.

⚠️ **Relatório de gate embaralhado:** duas execuções escreveram no mesmo arquivo
depois de um kill que não levou os filhos junto, e o relatório ficou com linhas
das duas intercaladas. Foi descartado e tudo re-rodou com relatório de nome
único. **Relatório de gate embaralhado é pior que relatório nenhum: ele parece
verde.**

---

## 5 · Gate visual — o que a rodada anterior não conseguiu, e por quê

A rodada anterior entregou 48 imagens e declarou dois limites. A auditoria achou
que os dois eram consertáveis, e que um deles estava sendo reportado errado.

**O popover nunca foi fotografado.** O handoff atribuía ao modo preview ("a
sessão não carrega nome"). A causa real: o gatilho é o botão do rodapé do rail,
que só existe com `footerName`, que vem do `displayName` do Auth — e o seed não
grava nenhum. Gravar o `displayName` no Auth Emulator antes de abrir o navegador
resolve. É conserto de **fixture**, não de produto.

**Seis das 48 imagens eram a mesma imagem com dois nomes.** `clube-abas` saiu
byte a byte idêntica a `clubs-area` nos três tamanhos. Duas causas somadas: a
área de clubs abre **vazia** na conta `castelo` (quem tem clube no seed é o
`corrida`), e **não existe link `/clubes/<slug>` no DOM** — o card entra na ficha
por BOTÃO ("Acessar painel").

O gate virou script (`scripts/gate-visual-subnav.mjs`) e agora **mede** em vez de
só fotografar:

- **18 medições** (6 superfícies × 3 tamanhos) do `borderBottomWidth` computado
  do `<nav>` de cada área: **todas `0px`**, incluindo a ficha do clube, que desta
  vez é a ficha de verdade (`/clubes/corrida-perfeita-sul`, `Seções do club`).
- **Popover aberto e fotografado**: `Configurações` + `Sair`, cada um com `<svg>`,
  Sair por último, painel em `rgb(28,28,28)`.
- **Rail com 5 itens** do produtor no mesmo quadro — a leva 15, legível na imagem.
- **19 imagens, 19 hashes distintos.**

⛔ Cada superfície declara `rotuloEsperado` e o gate **reprova se a tela entregar
outra barra**. Sem essa trava, duas superfícies diferentes devolvem a mesma
imagem e ninguém vê — que foi o defeito de origem.
⛔ `networkidle` não serve neste painel: os listeners do Firestore mantêm a rede
ocupada e a espera estoura na segunda navegação. A espera é pelo ELEMENTO medido.

**Evidência:** `.nirvana/outputs/leela-subnav-unifica-20260813-resume/` — 19 PNG
+ `medicao.json`. O quadro que resolve a lane sozinho:
`popover-perfil__desktop__aberto.png` (popover aberto, rail de 5 ícones e a
sub-nav sem linha, tudo na mesma foto).

**Armadilha operacional:** o `mock-campeche.sh` é fail-closed sem
`functions/.secret.local`, que é gitignored e **não vem com o worktree**. Copiar
do worktree principal antes de subir o mock, ou o seed morre no CRM.

---

## 6 · Fica com o dono

**POPOVER-COR-1** em `leela-specs/01-produto/DECISOES-ABERTAS.md`.

Ele disse que *"o modal está fora do design system … quanto as cores"*. A
varredura achou **zero cor fora do sistema** — tudo token, e o componente já
respeita a D-1008-R4. A explicação medida é de **família de cor**: o painel
flutuante é `#1C1C1C` e o rail `#161616`, dois cinzas neutros, enquanto tudo em
volta é atravessado pelo `--page-glow` e pelo vidro, que são quentes. A medição
do gate visual confirma o `rgb(28,28,28)`.

⛔ **Não consertado de propósito:** `--popover` é lido por todo `DropdownMenu`,
`Select`, `Combobox`, `FilterMenu` e `Popover` do produto. Trocar o token repinta
o produto inteiro a partir de uma hipótese — é lane própria, com gate visual
próprio.

---

## 7 · Fila que sai daqui

- **S1265** — `rounded-md`/`rounded-sm` do Tailwind em vez dos tokens de raio, no
  painel e nos itens do `DropdownMenu`.
- **S1268** (novo, achado NA TELA no gate visual) — **"Desafios ativos" mostra
  `NaN`** no KPI de `/clubes` e dentro de 2 dos 4 cards de clube na conta
  `castelo`; na conta `corrida` o mesmo lugar mostra `3`. Não é da família desta
  lane e não foi consertado aqui, mas número mentindo na tela é cobrança antiga
  do dono. Conferir antes de codar se o buraco é do seed do mock ou do produto.
- ⚠️ **Duas colisões de id herdadas da main**, fora do território desta lane e
  **não mexidas**: `S1222` e `S1223`, cada uma com dois títulos de lanes
  diferentes no V1-KANBAN. Renumerar card alheio no meio do voo é o movimento
  destrutivo que esta lane evitou no próprio caso — precisa de quem saiba qual
  dos dois lados tem sub-tarefas escritas.
- **RN-229 está superseded** e agora marcada nos dois `rns-delta` que a definem.

---

## 8 · Aterrissagem

- **Merge na main:** `d82eb610` (`--no-ff`), **pushed** — `origin/main` = `d82eb610`.
- **Branch de backup:** `subnav-unifica` @ `4338cf0f`, também no remoto.
- **Base do merge:** main re-puxada **três vezes** no mesmo dia (KITS-BUILD, CONTROLES-C1 e LANDING-SUITE-FIX entraram durante a lane). Só a primeira deu conflito.
- **Commits da lane:** 8 herdados + 8 da retomada + 4 merges.

| Commit | O quê |
|---|---|
| `ee398608` | a prop `divider` sai do design system, e a borda vira `border-b-0` travado |
| `c30b15a0` | as onze barras passam a ser uma só (`AreaSubNav`) |
| `85ed9ab6` | catraca `menu-secundario-cru`, baseline 0/0 |
| `77cfd5a2` | o item de menu aceita ícone pequeno, por token |
| `6f85318f` | Configurações sai do rail e o popover ganha Sair |
| `fa3fc7bc` | o contrato do ícone do item |
| `6c6dd173` | o registro das levas 14/15/16 e a POPOVER-COR-1 |
| `c201c860` | os testes passam a guardar a AUSÊNCIA da linha |
| `776d8265` | **(retomada)** o teste do ícone compila sob `noUncheckedIndexedAccess` |
| `592669e4` | **(retomada)** o fail-safe do logout ganha teste |
| `d98534a1` | **(retomada)** as duas histórias saem da colisão de número |
| `83311729` | **(retomada)** a RN-229 marcada como superseded onde é definida |
| `0d89d7b2` | **(retomada)** as sobras do emulador saem do `git status` |
| `70dd1399` | **(retomada)** o gate visual vira script e passa a medir |
| `74e8538d` | **(retomada)** o épico E01 fecha com o que a auditoria achou |
| `4338cf0f` | **(retomada)** este handoff |

⛔ **NENHUM deploy.** O que está no ar não mudou.
