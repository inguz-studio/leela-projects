---
trace: leela-redesign-v2-20260810
lane: DELTA-UX (4 decisões do dono 10/08 noite: D-1008-R2/R4/R5/R6)
alvo: branch redesign-engajamento-v2 · base 11c1e4c7 · C:/dev/leela-wt-redesign-v2
data: 2026-08-10
estado: CONCLUÍDA — T1..T4 pagos e pushed (HEAD 486ebaa4); gates completos re-executados do zero; :4601 re-servido (PID 22812)
---

# DELTA-UX · handoff vivo

Contrato: `.nirvana/briefs/leela-redesign-deltaux-enriched.md`. Disciplina:
`git commit --only` com pathspec por tarefa; pnpm com
`--config.verify-deps-before-run=false`; suítes em série; :4599 intocado;
NENHUM deploy.

## T1 · docs re-ancorados no handoff-v2 — PAGO

- `leela-projects/design_handoff_engajamento/` agora É o pacote v2:
  `Visao Geral v3.dc.html` e `Engajamento estudo.dc.html` DELETADOS; arquivo
  único `design/engajamento-referencia.dc.html`; PROMPTS.md com o 3º bloco
  (guardrail anti-recriação); REFACTOR.md com "Qual tela é esta".
- Commit `2e0eb8b2` (docs, 4 arquivos, −796 linhas).

## T2 · menus secundários pretos — PAGO (root cause provado)

**A hipótese do brief era FALSA.** "Painel portalizado fora da árvore das CSS
vars" não se sustenta: `data-theme` (ThemeProvider) e `data-glass`
(SuperficieDoPainel) são escritos no `<html>` — um portal em `document.body`
está DENTRO da árvore. O teste novo prova por render.

**Causa real = cascata.** Sob o vidro, `[data-glass="on"]` remapeia
`--surface-overlay` para o FILME translúcido (`rgba(255,255,255,0.045)` no
brasa); no dark-wine o overlay JÁ nasce filme (`rgba(255,255,255,0.028)`),
sem vidro nenhum. O filme é desenhado para elemento EM FLUXO sobre um cartão
(receita do protótipo). `--popover` seguia o overlay por alias
(`shadcn.json`), então todo painel flutuante em portal (DropdownMenu,
FilterMenu, Popover, Combobox, Tooltip, Toast) pintava um rgba a 4.5% tendo
atrás só a página escura: lia como PRETO. O protótipo v3 desenha painéis
flutuantes OPACOS (listbox e tooltip = `--surface-base` + sombra) — vidro em
menu flutuante foi REJEITADO por fidelidade ao protótipo e por contraste
inaferível sobre conteúdo arbitrário.

**Fix (uma causa, um fix):** `popover: {surface.overlay-opaque}` — token
semântico companheiro opaco por tema (brasa `{neutral.850}` #1C1C1C · wine
`{neutral.100}` · dark-wine `{neutral.850}` #1C0C11), mesmo padrão do
`raised-opaque` do fallback `@supports`. Nenhum componente mudou de classe.
Select nativo ganhou `[&_option]:bg-[var(--popover)]` (o popup herdava o
sunken quase-preto do campo).

**Prova:** `DropdownMenu/__tests__/superficie-portal.test.tsx` — (1) renderiza
o menu portalizado com `data-theme`/`data-glass` no html e mostra que o portal
está na árvore; (2) resolve `--popover` pela cascata REAL de
`themes/index.css` (tema+glass) e afere: hex opaco, igual a
`--surface-overlay-opaque`, nos 3 temas, com e sem vidro; (3) regressão de
sentido: `--surface-overlay` sob o vidro CONTINUA filme. Matrizes atualizadas:
contrast.test.ts 38+21 pares (+4/−1 texto; 5 não-texto do Toast moveram),
shadcn-aliases espelho popover→overlay-opaque.

- Commit `1a5d8491` (17 arquivos). DS completa após T2: **1775/1775** (74
  arquivos; 1748 + 27 novos).

## T4 · popover do perfil + alternador flat + rótulos novos — PAGO

Retomada pós-travamento (sf-frontend-lead, contexto fresco): o diff órfão da
sessão morta foi inspecionado arquivo a arquivo contra o contrato ANTES de
qualquer commit — aproveitado quase inteiro, com dois acréscimos meus
(LLM.txt do DropdownMenu re-sincronizado; separação T3/T4 por estado
intermediário do working tree, já que a sessão morta misturou as duas tarefas
nos MESMOS arquivos).

- **DS · DropdownMenu**: prop `side: 'bottom' | 'top'` (ancora por `bottom`
  em coordenadas de viewport — cresce para cima sem medir a própria altura) +
  `containerClassName` (trigger `w-full`). Teste novo `side-top.test.tsx`
  (3 casos). LLM.txt re-sincronizado: proibia `side="top"` (agora existe) e
  documentava `className` INVERTIDO (dizia trigger; o código sempre aplicou no
  painel) — as duas defasagens pagas.
- **DS · SidebarRail**: prop `footerMenu` — o rodapé do perfil vira TRIGGER do
  DropdownMenu canônico (L-021, nada artesanal), `button` com `aria-label` =
  footerName SEMPRE (rail fechado E aberto — **dívida F5 morta**),
  aria-haspopup/expanded/controls via Slot. Precedência sobre `onFooterClick`.
  **F4 paga junto** (mesmo território): tooltip do rail ganhou
  `group-focus-visible/item:` — rótulo visível também por teclado.
- **Painel · AlternadorDePainel**: `travessia()` com rótulos novos "Acessar
  painel master" / "Acessar painel profissional" (D-1008-R6 na íntegra;
  RN-468). Regra 2 (rótulo = destino) intacta.
- **Painel · RootShell**: `menuPerfil` = Configurações + travessia (só para
  quem `podeAlternar` — regra 1); alternador SAIU do `slotAberto` (ficou só o
  nome do painel). Configurações CONTINUA como item do rail (default do
  maestro, vetável). **Decisão de interpretação (registrada, vetável): os
  itens do menu SÃO o "flat button" do vocabulário do DS** (menuitem
  transparente, hover em accent) — criar variant `flat` no Button para viver
  DENTRO de um menu quebraria a semântica `menuitem`; nenhum variant novo.
- **Grep dos rótulos antigos**: zero sobras em superfície — restam só a
  asserção NEGATIVA do teste (grep vivo) e um handoff histórico. O
  "Ir para o painel profissional" da LANDING (PortasDaConta) é OUTRO rótulo,
  fora do escopo da D-1008-R6 — anotado na fila.
- `navegacao-spa.test.tsx`: inventário `['Abrir menu', '']` →
  `['Abrir menu', 'Marina Castelo']` (as duas metades da F5 documentadas).
- Commit `55ea0d42` (11 arquivos, +348/−87), pushed.

## T3 · menu mobile no chrome v3 — PAGO

Lado DS da sessão morta aproveitado: `variant="drawer"` no SidebarRail (o
protótipo < lg desenha o menu mobile como o PRÓPRIO rail: sempre aberto,
altura total, `w-[--rail-width-open]`, sem margem/raio/toggle/tooltip; a
anatomia off-canvas — portal, scrim condicional do item 5, focus-trap — segue
sendo do Drawer) + 3 testes. FALTAVA a fiação no RootShell — completada nesta
retomada:

- **RootShell**: `drawerSidebar` deixou de montar a Sidebar clássica e passou
  a montar `<SidebarRail variant="drawer" {...propsDoRail} />` — as MESMAS
  props das duas anatomias (itens, marca, nome do painel via `slotAberto`,
  `footerMenu` do perfil). Morreram junto: `brand`/`sections`/`footer` e os
  imports `Sidebar`/`SidebarFooter`/`Avatar`/`shellSidebarSections`/
  `AlternadorDePainel` (componente). Consequência aceita e registrada no
  código: o rodapé mobile mostra INICIAIS, não a foto da sessão (paridade com
  o desktop, que é assim desde a HIFI-REC).
- **Testes novos (5)** em RootShell.test.tsx, todos scoped no dialog (jsdom
  não aplica CSS — o rail desktop coexiste no DOM com o drawer aberto): rail
  v3 sempre aberto sem toggle e sem seções OPERAÇÃO/CONTA; nome do painel no
  mobile; trigger do perfil no drawer; item navega E fecha o drawer (contrato
  do AppShell); nav do super-admin em `/plataforma` no mesmo chrome. Detalhe
  de nome acessível: aberto, o badge entra no nome ("Eventos 2") — queries de
  item por prefixo.
- Commit `486ebaa4` (4 arquivos, +184/−96), pushed.

## Gates — números reais (re-executados DO ZERO nesta retomada; verde pré-crash descartado)

| Gate | Resultado |
|---|---|
| Suíte painel INTEIRA | **2452/2452** (229 arquivos) ✔ — era 2444 na FIX; +8 do RootShell |
| Suíte DS completa | **1786/1786** (75 arquivos) ✔ — 1775 pós-T2 +3 side-top +4 footerMenu +3 drawer +1 F4 |
| type-check | DS exit 0 ✔ · painel exit 0 ✔ |
| lint `--max-warnings 0` | DS exit 0 ✔ · painel exit 0 ✔ |
| generate-tokens 2× | árvore idêntica nas duas rodadas (0 arquivos alterados) ✔ |
| hex/px no diff (componentes+shell, 1a5d8491→HEAD) | 0 hex · 0 px de design (únicos hits: asserção de teste sobre estilo COMPUTADO serializado pelo jsdom e um comentário JSX) ✔ |
| cânone L-021 | 0 controle cru e 0 re-implementação de overlay no diff do painel (popover = DropdownMenu canônico; drawer = Drawer canônico) ✔ |

## Commits da lane (--only com pathspec, todos pushed; base 11c1e4c7 → HEAD 486ebaa4)

- `2e0eb8b2` — docs(handoff): re-ancora design_handoff_engajamento no pacote v2 [DELTA-UX-T1]
- `1a5d8491` — fix(ds): popover resolve superficie opaca por tema [DELTA-UX-T2]
- `55ea0d42` — feat(ds+painel): popover do perfil no rodape do rail + alternador com rotulos novos [DELTA-UX-T4] · 11 arquivos (+348/−87) — inclui F5 e F4
- `486ebaa4` — feat(ds+painel): menu mobile no chrome v3 — drawer monta o rail em variant=drawer [DELTA-UX-T3] · 4 arquivos (+184/−96)

Nota de método: a sessão morta misturou T3 e T4 nos MESMOS arquivos
(SidebarRail.tsx + teste). A separação por tarefa foi feita por estado
intermediário do working tree (compatível com `--only`): T4 commitada com o
SidebarRail SEM os bits de `variant="drawer"`, depois união restaurada e T3
completada por cima. Os dois estados rodaram teste antes de commitar.

## Servidor :4601 re-servido (T3/T4 mudaram byte servido)

- Rebuild: `vite build --mode leela-hub` → bundle novo **`index-D-BqnPen.js`
  + `index-DxzKQgzy.css`** (antes `index-D_oCnNiR.js`/`index-DOOMP3tm.css`).
- PID 8640 morto; **PID novo 22812**, MESMA porta 4601, mesmo
  `.maestro-logs/serve-4601.js`; `curl` confirma o index servindo o bundle
  novo. :4599 (PID 25384, outro worktree) INTOCADO. NENHUM deploy.
- A conferência RENDERIZADA (rail desktop, drawer mobile, popover nos 3
  temas) segue sendo do maestro/dono, como o contrato define.

## Fila / notas para a próxima lane

- Esc com o popover do perfil aberto DENTRO do drawer mobile fecha menu E
  drawer (dois listeners de documento independentes) — avaliar stopPropagation
  coordenado se incomodar em uso real.
- Irmã da nota acima: navegar por um ITEM DO POPOVER dentro do drawer mobile
  NÃO fecha o drawer (o menuitem faz stopPropagation, o fecha-ao-navegar do
  AppShell depende do borbulhar) — a rota troca por baixo do drawer aberto.
  Comportamento herdado do canônico; decidir junto com a nota do Esc.
- Órfãos pós-T3 (sem consumidor no painel): `shellSidebarSections` +
  `producerSections`/`platformSections` (sidebar.ts) e o componente
  `AlternadorDePainel` (as funções puras `travessia`/`nomeDoPainelAtual`/
  `estaNoPainelMaster` seguem vivas no shell). A `Sidebar` clássica segue no
  DS (stories/showroom). Remoção é decisão de limpeza — não desta lane.
- LANDING usa "Ir para o painel profissional" (PortasDaConta, 2 ocorrências)
  — rótulo de OUTRA superfície, fora da D-1008-R6; se o dono quiser
  "Acessar…" também lá, é decisão nova.
- `porDiaSemana` sem consumidor e F6 (`role="grid"` do calendário) seguem na
  fila, como antes.
