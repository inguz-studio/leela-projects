---
tags: [leela, handoff, lane, terciario, navegacao, rodada-2026-08-27, e01, e04]
rodada: 2026-08-27-vetos-do-dono
lane: TERCIARIO-E-NAV
itens: [V2708-03, V2708-04, V2708-05, V2708-11]
branch: nav/terciario-20260827
atualizado: 2026-08-27
---

# Handoff — TERCIARIO-E-NAV (rodada 2026-08-27)

Quatro itens da sessão de aprovação da landing: o terciário vira padrão no
desktop (V2708-03), a página de vendas entra nele (V2708-11), a barra inferior
mobile encolhe (V2708-04) e a troca de menu para de quebrar a barra (V2708-05).

---

## 1 · A DECISÃO COLHIDA — o vetável TERCIARIO-1 fecha, e contra o default

**Isto é o registro mais importante deste handoff.** A fala do dono de 27/08
responde uma pergunta que estava aberta desde 17/08, e responde **derrubando o
default que a spec tinha adotado**.

**O que ele disse:** *"o formato de menu em clubs, configurações ficou bom, pois
o menu terciário se encaixa melhor no formato web. **Padronize isso no
desktop**."*

**O que estava em aberto (TERCIARIO-1).** A `01-spec-menu-terciario.md` da leva
22 leu *"abas fixas"* de duas formas e escolheu uma, deixando o veto aberto:

| | Leitura | Consequência |
|---|---|---|
| **Adotada em 17/08** | as seções viram **painéis exclusivos** — só a ativa existe na tela | nasce o `TabsPanel` no DS; `Ctrl+F` deixa de achar texto de outra seção (a spec registrou isso como "efeito colateral honesto") |
| **Alternativa** | as seções seguem **empilhadas e roláveis**; o que é fixo é a **barra** | é o molde que já rodava em Clubs |

**A fala de 27/08 fecha na ALTERNATIVA, e o motivo é factual, não interpretativo:
o `TabsPanel` nunca foi construído.** A onda B da S049 não subiu (o board de
migração registra "Não construída"), e `grep -rn "TabsPanel"` sobre `packages/`
e `apps/` não retorna nada. Logo, o que o dono olhou na tela em 27/08 e chamou
de bom foi **exatamente o molde âncora que já existia** — coluna vertical
sticky, seções empilhadas, pílula preenchida no ativo. Ele elogiou o que estava
no ar.

**Efeitos:**

- ✅ **TERCIARIO-1 fecha** na leitura alternativa. O default de painéis
  exclusivos está **derrubado pela fala**, e com ele morre a regressão de
  `Ctrl+F` que a spec tinha aceitado de antemão.
- ⚠️ **A RN-574 precisa de emenda.** O enunciado dela ("abas fixas que trocam o
  conteúdo no lugar, estado na URL") descreve o `TabsPanel`, não o que foi
  aprovado. O que a fala confirma da RN-574 é a metade que sobreviveu: **uma peça
  só, em duas orientações, sem variante por nível de profundidade**. A metade de
  "troca de painel no lugar + `?secao=`" fica **sem pedido do dono**. Não emendei
  o cânone nesta lane (é registro, e a rodada mandou construir) — **fica como
  item para a lane de registro**.
- ✅ **A S049-B muda de forma**: não é mais "criar o `TabsPanel` no DS", é
  "publicar o molde que já existe". Foi o que esta lane fez.

---

## 2 · V2708-03 · o que migrou

### A peça publicada

`apps/painel/src/components/nav/TerciarioNav.tsx` — `TerciarioNav`,
`AreaTerciarioNav` (com a navegação SPA fiada) e `TerciarioLayout` (o 25/75).

**Por que uma peça nova, e por que não no DS.** A rodada proíbe componente novo
sem justificativa, e proíbe tocar `packages/design-system`. As duas se resolvem
no mesmo lugar: a peça **fia `react-router`**, que o DS não tem como dependência
e não deve ter (o pacote também serve a landing Next e o mobile). É a fronteira
literal do `AreaSubNav` ao lado, e o precedente exato da **S049-T1**, que
promoveu o bloco de Insights para `src/components/` e **não** para o DS, com a
razão escrita em `CartaoV3.tsx:9-12` e `SecaoHead.tsx:10-14`.

Sem ela, "padronizar no desktop" significaria copiar as mesmas classes numa
terceira e numa quarta tela — a 14ª escrita da mesma peça que a RN-568 existe
para impedir.

### Migradas nesta lane

| Área | Antes | Depois |
|---|---|---|
| **Configurações do evento** (prioridade: Eventos é a área mais usada) | `AreaSubNav` horizontal + `<Outlet>` | **terciário em modo ROTA** — coluna sticky ≥ `lg`, faixa < `lg`; as 5 seções seguem rotas com dado, guard e endereço próprios |
| **Configurações do club** (o molde que ele elogiou) | `<ul>` de `<button>` escrita à mão dentro da rota | **mesma peça, modo ÂNCORA** — o `IntersectionObserver` e o `scrollIntoView` seguem intactos, linha por linha |

O comportamento do Clubs **não mudou**; mudou a procedência. Era, pela medição
da S049, *"o único menu do painel que não é canônico"*, e escapava da catraca
`menu-secundario-cru` por não parecer um `SubNav`. Efeito colateral medido: a
catraca `botao-cru-estilizado.painel` **desceu de 4 para 3**.

**Modo rota × modo âncora.** A peça padroniza a APARÊNCIA e deixa o mecanismo
com a área — porque ele pediu *"o formato de menu"*, não o modelo de conteúdo.
Configurações do evento continua sendo cinco rotas (dado próprio, guard próprio,
endereço colável, que é o que a régua da RN-574 manda preservar); Clubs continua
sendo âncora.

### NÃO migradas — com o custo

Régua aplicada (a da própria spec): terciário onde as seções são partes de uma
mesma coisa; `AreaSubNav` onde cada seção é um lugar com vida própria e endereço
que as pessoas compartilham.

| Candidato | Veredito | Custo / razão |
|---|---|---|
| **Kits do evento** (`KitsLayout.tsx:65`, 2 abas) | não migrou | **~1h**. Duas abas numa coluna de 25% desperdiçam a largura; e Gerenciamento/Distribuição são lugares com dado próprio. Cabe, mas **não sem o dono ver o primeiro pronto** — condição que a própria spec impôs |
| **Financeiro do evento** (`FinanceiroLayout.tsx:48`, 2 abas) | não migrou | **~1h**. Mesma conta das Kits |
| **Ficha do tenant** (`TenantFichaLayout.tsx:77`, 7 abas) | não migrou | **~2h**. É superfície de super-admin, fora da fala do dono (que falou de clubs e eventos), e as 7 abas são lugares com carga própria |
| **Configurações da conta** (`/conta`) | não migrou | **~2h**. Hoje é coluna única de 6 seções empilhadas **sem menu nenhum** — é o candidato de maior ganho da lista, porque as seções já existem e só falta a coluna. Ficou de fora por ser fora de Eventos, que a rodada mandou priorizar |
| **`GaleriaEstados`** (`entrega/estados`, quase-gêmeo do molde) | não migrou | **~30min**. Rota de galeria de QA (RN-208), não tela de produto; e é painel exclusivo, não âncora |
| **7 usos do `Tabs` do DS** (Inscritos, Comunicação, editores) | não migrou | Fora de escopo: são abas **dentro de uma página**, não navegação terciária. Migrá-las seria a propagação cega que a RN-574 proíbe |

---

## 3 · V2708-03 · a proposta responsiva, defendida

O dono escopou o pedido (*"padronize isso **no desktop**"*) e abriu o resto:
*"permito você buscar a melhor solução"*. A escolha:

> **Abaixo de `lg`, a coluna vira uma faixa horizontal rolável. De `lg` para
> cima, é a coluna sticky que ele elogiou. Mesmo DOM, virada só por CSS.**

**A conta que decide.** A coluna vertical, num 390, custa **~200px de dobra**
(5 itens × 36px + respiros) **antes do primeiro campo** — numa tela onde a barra
superior já come ~61px e a barra inferior cobra os 82px que **esta mesma rodada
mandou encolher**. Entregar um menu de 200px no mesmo commit em que se corta a
barra por ser "muito grande" seria obedecer com uma mão e contradizer com a
outra. A faixa horizontal custa **~44px**.

**Três razões além da conta:**

1. **Ele mesmo escopou ao desktop.** A coluna é decisão dele para o desktop, por
   palavra dele. O mobile ficou explicitamente comigo.
2. **Não é linguagem visual nova.** Abaixo de `lg` o terciário fica com a mesma
   silhueta da barra que o painel já usa em todos os outros níveis. É a
   orientação dupla que a **própria RN-574 pediu** ("a peça é uma só com
   orientação horizontal ou vertical"), resolvida no **mesmo DOM** — sem segundo
   componente, sem breakpoint em JavaScript, sem remontagem na virada.
3. **O ativo é pílula preenchida, não indicador deslizante.** Isso é decisão de
   robustez, não de gosto: indicador medido em runtime
   (`offsetLeft`/`offsetWidth`) é a origem da S053 e do V2708-05. Preenchimento
   no próprio item funciona idêntico nas duas orientações **sem uma linha de
   JavaScript de layout** — a classe de defeito do V2708-05 não tem onde existir
   nesta peça. Está afirmado em teste para não ser "unificado" de volta.

⛔ Sem borda em nenhum estado (V2708-07 · §2.16): o ativo é preenchimento.

---

## 4 · V2708-11 · a página de vendas entra no terciário

*"configurações pode unificar a página de vendas no menu terciário, em eventos"*

- Rota nova: `/eventos/:slug/configuracoes/pagina-vendas`, **3ª seção** do
  terciário (depois de Política de vendas — as duas falam do que se vende).
- Saiu do menu secundário do evento, que **cai de 10 para 9 abas** e perde o
  único item que era configuração morando fora de Configurações.
- ⛔ **Endereço antigo preservado** (RN-234): `/eventos/:slug/pagina-vendas`
  salta para o novo, com querystring e fragmento, pelo mesmo `RedirectLegado`
  que já serve o balcão e o estoque de kits. **Um salto só.** Verificado no
  navegador: `…/pagina-vendas?preview=castelo` →
  `…/configuracoes/pagina-vendas?preview=castelo`.
- O redirect fica **FORA** do `RequirePapel`, pela razão já escrita no salto do
  credenciamento: quem não tem a área recebe o 403 no endereço **novo**, não um
  403 num endereço morto.

**A colisão de permissão que a spec avisou — medida, e ela não existe.** A spec
alertava que herdar o guard do pai *"mudaria quem entra"*. Medindo
`MATRIZ_ACESSO_EVENTO`: as colunas `pagina_vendas` e `configuracoes` são
**idênticas nos quatro papéis** (organizador T/T, administrador T/T, operador
F/F, financeiro F/F). O aninhamento **não afrouxou nem apertou nada**.

Ainda assim a filha **mantém o guard próprio** `area="pagina_vendas"`, aninhado
sob o do pai: no dia em que a matriz divergir, a célula certa é que decide.
Há teste afirmando as três coisas — que a rota atravessa os dois guards, que
`financeiro` segue negado (aceite E04-L4), e que as colunas seguem idênticas.

---

## 5 · V2708-04 · a barra inferior, com as medidas

*"revise o tamanho do menu bar de footer, pois está muito grande"* — o que
**decide a NAV-MOBILE-5 na direção compacta**.

### Antes e depois (medido no navegador, 390×844)

| | Antes | Depois | Δ |
|---|---|---|---|
| Altura da pílula | 58px | **48px** | −10px |
| Respiro por borda | 12px | **8px** | −4px |
| **Dobra cobrada** (`--bottomnav-space`) | **82px** | **64px** | **−18px (−22%)** |
| Dobra cobrada, iPhone com entalhe de 34 | **116px** | **98px** | **−18px** |
| **Alvo de toque** | 58px | **48px** | ✅ acima dos 44px de régua |

Também: ícone 22→20px, gap do item 3→2px. A tinta cai de 36px para 33px dentro
de um indicador de 40px — **a mesma folga de ~3px por lado** que a barra tinha
antes. Encolher a barra sem espremer o dedo era o ponto.

A safe-area segue entrando na **margem**, não no padding: o alvo mede o mesmo no
iPhone com entalhe e no sem.

**Efeito na régua da carga cognitiva** (linha de base de 17/08, 373×810): a
dobra útil sobe de 728px para **746px**, e o primeiro número novo sobe de 142px
para **124px abaixo da dobra**. ⛔ **Continua abaixo da dobra** — encolher a
barra **não** paga os Movimentos 1 e 3, e esta lane não anuncia que paga. O que
mudou é que o Movimento 1 sozinho agora quase fecha a conta: faltam 28px, não 46.

### ⚠️ Dívida nomeada: onde estes valores deveriam morar

Os seis tokens estão sobrepostos em `apps/painel/src/globals.css`, **não** nos
temas do DS, porque a rodada despachou `packages/design-system` para a lane
vizinha e duas lanes nos mesmos arquivos de tema é conflito programado.

**Para a lane DS-BORDAS-E-BENTO (ou quem herdar o DS):** mover este bloco para
`themes/{index,brasa,wine,dark-wine}.css` e apagar a sobreposição.

```css
--bottomnav-height: 48px;
--bottomnav-margin: var(--spacing-2);
--bottomnav-px: var(--spacing-1);
--bottomnav-item-gap: 2px;
--bottomnav-icon-size: 20px;
```

⛔ **No mesmo commit**, atualizar
`packages/design-system/src/components/BottomNav/__tests__/custo-na-dobra.test.ts`,
que hoje crava 58/12/82/116 lendo o tema — ele **continua verde** e passou a
descrever um número que nenhuma tela mostra. O número que o produto realmente
entrega está afirmado do lado de cá, em
`apps/painel/src/shell/__tests__/custo-da-barra-mobile.test.ts` (11 casos).

*Detalhe de cascata, para quem mover:* a sobreposição usa `:root:root` e não
`:root`. Os temas declaram os tokens em `:root:not([data-theme])` (0,2,0) e em
`[data-theme="…"]` (0,1,0); um `:root` simples perderia para o primeiro, e a
barra encolheria em três temas e ficaria grande no quarto.

---

## 6 · V2708-05 · o sintoma, a hipótese que caiu, e o conserto

### O sintoma, reproduzido

Numa janela de **1024** com a aba **Configurações** ativa, a barra do evento
mostra "Visão geral · Inscritos · Kits · Modalidades · Comunicação · Afiliados ·
Credenciamento" e é cortada na borda direita. **A aba em que a pessoa está — e o
sublinhado laranja que a marca — não aparecem em lugar nenhum da barra.**

Abrir o menu lateral piora: a moldura perde 164px e o pedaço escondido da aba
ativa salta de **65px para 229px**. Fechar devolve. É por isso que o defeito se
apresenta ao dono como *"trocar o menu quebra o layout"* — o que muda com o
menu é **o quanto da barra some**.

### ⚠️ A hipótese que NÃO se confirmou (registrada para ninguém repetir)

A leitura inicial era que o indicador do `SubNav` ficava com a medida velha:
ele mede `offsetLeft`/`offsetWidth` e só remede no `resize` da **janela**
(`SubNav.tsx:101-112`), e abrir o rail não redimensiona janela nenhuma. Era a
mesma causa que a NAVBAR-FIX consertou no `BottomNav` em 17/08 (S053), com
`ResizeObserver`.

**Foi medido e não reproduz.** Com o aviso de largura suprimido de propósito, o
desalinho entre a aba ativa e o sublinhado ficou em **1px em todos os estados**
(rail fechado, rail aberto, troca de aba, em 1024 e em 1440). A razão é
anatômica: os itens do `SubNav` são de **largura de conteúdo** dentro de um `ul`
com `w-max`, então as medidas **não dependem** do tamanho do contêiner. Os do
`BottomNav` são `flex-1 min-w-0` — **por isso lá a medida envelhecia e aqui
não**. Portar o `ResizeObserver` para o `SubNav` consertaria um defeito que ele
não tem.

Cheguei a escrever esse conserto e **o removi depois de medir**. Fica registrado
porque a hipótese é plausível e alguém vai tê-la de novo.

*Também medido e limpo:* a animação de 650ms do rail (que anima `width`, uma
propriedade de layout) **não** produz quebra observável — sem estouro
horizontal, sem desalinho, sem clipping, em 6 amostras ao longo da transição. O
custo dela é de reflow, não de layout quebrado.

### O conserto

`apps/painel/src/shell/abaAtivaVisivel.ts` — a moldura mantém a aba ativa dentro
da área visível de qualquer navegação que role na horizontal. Reage à troca de
rota e à mudança de **largura** da moldura (que é o que abrir/fechar o menu faz).

| 1024, aba Configurações | Antes | Depois |
|---|---|---|
| px da aba ativa fora da barra, menu fechado | **65px** | **0px** |
| px da aba ativa fora da barra, menu aberto | **229px** | **0px** |

⛔ Só o `scrollLeft` **da própria barra** é tocado. Nada de `scrollIntoView`,
que arrastaria a página na vertical junto — há teste que falha se alguém trocar
a implementação por ele.

**Por que na moldura e não no `SubNav`:** de escopo, o DS é da lane vizinha; de
anatomia, quem muda de tamanho e quem sabe que a rota trocou é a **moldura**.
Uma barra é só a primeira vítima — a régua serve qualquer navegação rolável do
painel, incluindo o `TerciarioNav` na orientação de faixa, sem que nenhuma
precise aprender convenção nova.

**Para a lane do DS, se preferirem a origem:** o conserto equivalente é o
`SubNav` rolar a aba ativa para dentro da vista ao montar, ao trocar de aba e
sob `ResizeObserver` do próprio `nav`. Aí esta régua da moldura pode sair.

**`prefers-reduced-motion`:** o painel já neutraliza durações em
`globals.css:43-48`, e o conserto acima não anima nada (ajuste de `scrollLeft`,
não transição). Quatro componentes do DS não têm `motion-reduce` no elemento
(`SubNav.tsx:198`, `Sidebar.tsx:287,318`, `Tabs.tsx:103`, `Breadcrumb.tsx:98`) —
cobertos dentro do painel pela regra global, **descobertos** no showcase do DS e
no `apps/mobile`, que não importam o `globals.css`. → lane do DS.

---

## 7 · Gates

| Gate | Resultado |
|---|---|
| `tsc --noEmit` | ✅ 0 |
| `eslint --max-warnings 0` | ✅ 0 |
| `pnpm --filter @leela/painel build` | ✅ OK |
| `pnpm --filter @leela/painel test` | ✅ **3070 verdes em 265 arquivos** (era 3030/261) |
| Gate visual, 1440 + 390 (+1024 para o V2708-05) | ✅ `.nirvana/gate-visual/terciario-nav/` |

**Testes atualizados** (5 casos, intenção mantida — todos afirmavam contagens que
o V2708-11 mudou por remoção, não por reordenação): `subnav.test.ts` (2),
`EventoShell.test.tsx` (10→9 abas), `navegacao-spa.test.tsx` (evento 10→9,
Configurações 4→5).

**Testes novos: 40 casos.** `TerciarioNav.test.tsx` (11),
`EventosRoutes.pagina-vendas.test.tsx` (10), `custo-da-barra-mobile.test.ts` (11),
`abaAtivaVisivel.test.ts` (8).

### ⛔ `gate-canon` está VERMELHO, e não é desta lane

```
✗ grade-crua.landing SUBIU: 12 → 14
✗ receita-de-grid.landing SUBIU: 9 → 11
```

**Conferido com a árvore limpa em `origin/main`: as duas já falhavam antes deste
branch.** Vêm da lane da landing (PR #2, a mesma aprovada em 27/08), que subiu
sem atualizar o baseline. Esta lane não tocou em `apps/landing`.

**Consequência prática que trava outras lanes:** o gate **recusa `--atualizar`**
enquanto houver catraca subindo (*"Conserte o código, não o baseline"*). Minha
catraca `botao-cru-estilizado.painel` **desceu de 4 para 3** e o gate pediu
`--atualizar` no mesmo commit — **não foi possível**, porque isso abençoaria de
carona a regressão da landing. **Deixei o baseline intocado.** Quem consertar a
landing colhe o meu −1 junto.

### Portas

Preview em **4612** (`--strictPort`), emulador em 8180/9198/5201/9599/4001/4401/4501.
Derrubado por PID exato (4205, 4219, 4279) e conferido liberado.
⛔ **4601, 4602 e 8280 intocadas** — conferidas de pé ao fim da lane.

*Nota de máquina:* o `preview.sh` usa `netstat -ano`/`taskkill` (Windows), então
no macOS a pré-checagem de porta e o `cleanup` são **no-ops silenciosos** — um
preview interrompido deixa o Vite de pé. Foi o que aconteceu duas vezes aqui.
Some com um `PREVIEW_STORAGE_PORT` também: a porta de Storage é fixa em
`firebase.preview.json` e colidiu com a lane vizinha (9299, 9399 e 9499 ocupadas).
→ item de ergonomia para quem cuidar do `preview.sh`.

---

## 8 · O que fica para outras lanes

1. **Registro (cânone):** emendar a **RN-574** — a metade "painéis exclusivos +
   `?secao=`" ficou sem pedido do dono; o que a fala confirma é "uma peça, duas
   orientações". E fechar o **TERCIARIO-1** na leitura alternativa.
2. **DS-BORDAS-E-BENTO:** mover os tokens da barra para os temas + atualizar
   `custo-na-dobra.test.ts` (§5); `motion-reduce` nos quatro componentes (§6);
   opcionalmente o conserto do `SubNav` na origem (§6).
3. **Governança:** o `gate-canon` vermelho herdado da landing (§7) — bloqueia
   `--atualizar` para todo mundo.
4. **Fila do terciário:** os seis candidatos não migrados, com custo (§2).
5. **Ergonomia:** `preview.sh` no macOS (§7).
