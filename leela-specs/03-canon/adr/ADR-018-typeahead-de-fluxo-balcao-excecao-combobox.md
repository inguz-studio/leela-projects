---
tags: [leela, adr, arquitetura, design-system, painel, frontend, a11y]
---

# ADR-018 · Typeahead de fluxo do balcão — exceção registrada ao `Combobox`

> Autor: sf-frontend-lead (Software Forge) · Trace: leela-roadmap-componentes-20260810 · lane CONTROLES-C3 · Data: 2026-08-16
> Formato herda ADR-stack.md: contexto → decisão → status → consequência.
> Origem: `02-rodadas/2026-08-12-conformidade-controles/03-fila-em-ondas.md`, Onda C3 —
> item "typeahead de fluxo" (`eventos/entrega/AtendimentoPanel.tsx:265-291`), com a
> bifurcação já escrita na fila: *"Combobox em modo fluxo (C0) ou exceção com ADR"*.

**Contexto.** `AtendimentoPanel.tsx` (balcão de entrega, S204-T1) busca o atleta por
nome ou dorsal com um `SearchInput` cujos resultados aparecem **inline, na mesma
coluna, sem popover e sem gatilho** — o operador digita e a lista de até 6 nomes
aparece embaixo do campo; um clique (ou Enter futuro) seleciona e a busca fecha
sozinha. O inventário de 2026-08-12 (§3, família 2) já tinha classificado este
padrão como uma anatomia que o `Combobox` do DS **não tem**: o `Combobox` é picker
de `Popover` + `Command` — abre por gatilho, fecha ao escolher. A Onda C0 (2026-08-12)
deixou a bifurcação em aberto por desenho (*"Caronas da C0 que não entraram nesta
lane: ... o modo de fluxo do Combobox (ou o ADR do balcão)"*), empurrando a decisão
para a primeira onda que tocasse o arquivo — esta.

**Por que a anti-carga da tela pesa mais que a conformidade estrutural.**
`AtendimentoPanel.tsx:5-6` documenta a RN-205: "retirar kit" e "registrar presença"
foram fundidos num gesto só, e o balcão opera sob pressão de fila física (evento ao
vivo, atletas enfileirados). O `Combobox` do DS exige abrir um popover antes de
digitar — um clique ou tab a mais **antes** da busca começar. Trocar o typeahead
inline pelo `Combobox` de popover adicionaria exatamente o passo que a RN-205 já
cortou noutro lugar do mesmo fluxo. O critério de aceite comum desta rodada é claro:
*"Onda que baixa o número de divergências e sobe o número de passos não fecha."*

**Critérios de decisão** (nesta ordem): 1. zero passo novo no balcão (RN-205,
anti-carga); 2. a11y do padrão atual, preservada; 3. escopo proporcional de uma
onda de conversão (não construir superfície nova no DS); 4. honestidade de
registro — a exceção fica nomeada, não escondida atrás de "já é `SearchInput`,
então conta como DS".

**Decisão — mantém o typeahead inline como está, registrado como exceção governada
pela §8 da `governanca-design.md` (porta única), critério (b): "há necessidade
técnica forte que o primitivo do DS não atende".** Não se constrói um modo de fluxo
novo no `Combobox` nesta lane. `BuscaAtleta` (função local de `AtendimentoPanel.tsx`)
permanece: `SearchInput` (`shortcutLabel={null}`, já correto) + `<ul>`/`<button>` de
resultado, ambos primitivos ou composições diretas de primitivos do DS — não há
recriação de controle, só ausência de casca para o padrão "resultado inline".

**a11y do padrão atual, provada por leitura (sem suíte nova nesta lane):** os
resultados são uma `<ul>` de `<button type="button">`, focáveis e ativáveis por
teclado (Tab + Enter/Espaço) sem estado próprio de menu — não há
`role="listbox"`/`aria-activedescendant`, então não há contradição de padrão ARIA
composto malformado. O `SearchInput` mantém `aria-label="Buscar atleta"`. O atalho
global `⌘K`/`Ctrl+K` foca o campo por seletor de `aria-label` (linha 66), inalterado
por esta decisão.

**Alternativas rejeitadas.**
- **Construir `Combobox` com `mode="flow"` nesta lane:** é a peça correta a médio
  prazo (torna o padrão reusável para o único consumidor de hoje e qualquer
  typeahead-sem-popover futuro), mas é superfície nova de DS — API, teclado,
  ARIA composta, story, contrato LLM, testes — proporcional a uma sub-onda da
  família "peça nasce" (como a própria C0), não a uma conversão de tela dentro do
  orçamento de 1,5 dia da C3. Registrado como trabalho futuro, não descartado.
- **Usar o `Combobox` de popover como está:** rejeitado por violar a RN-205
  diretamente (passo extra no balcão) — o critério de aceite comum desta rodada
  reprova a onda que troca divergência de componente por passo a mais.
- **Não registrar nada e deixar a tela como achado silencioso:** rejeitado por
  princípio de honestidade de registro (o mesmo que fez a C0 nomear a bifurcação em
  vez de escondê-la atrás de "já converteu 3 Select").

**Status.** Aplicada nesta lane (CONTROLES-C3, 2026-08-16) — decisão técnica, sem
mudança de código em `AtendimentoPanel.tsx` além do que as outras famílias desta
onda já tocam. Não aguarda ratificação do Vitor: é técnica, não de dinheiro nem de
dado pessoal, com condição de reabertura explícita abaixo.

**Consequência.**
- (+) Zero passo novo no balcão; comportamento do typeahead idêntico ao de antes
  da rodada.
- (+) A dívida fica **nomeada**, não escondida: `eventos/entrega/AtendimentoPanel.tsx`
  segue contando em `barra-de-filtro-crua` na catraca do `gate-canon` até a peça
  nascer — não há mecanismo de `arquivosDeExcecao` nas cinco contagens novas da
  §3 da catraca (elas são contagem pura, não regra de lint com lista de exceção),
  então este ADR é o registro que substitui essa lista ausente.
- (−) O produto carrega, por mais um ciclo, duas anatomias de busca-com-resultado
  (`Combobox` popover e o typeahead inline do balcão). Aceito porque são dois
  padrões de interação genuinamente diferentes, não dois estilos do mesmo padrão.
- **Condição de reabertura:** se um segundo consumidor precisar do mesmo padrão
  (resultado inline sem popover), o `Combobox` ganha `mode="flow"` no DS e os dois
  consumidores migram juntos — dois usos justificam a peça; um uso, documentado,
  não.

---

## ⚠️ PARCIALMENTE SUPERADO em 2026-08-17 (leva 20) — a régua caiu, a exceção continua

> Lane FILTROS-LISTA · trace `leela-redesign-v2-20260810` · registro em
> `02-rodadas/2026-08-17-decisoes-dono/01-decisoes-dono.md`, leva 20 item 1.

A decisão do dono de 17/08 derrubou o critério de aceite que os ADRs 018, 019 e 020 compartilhavam:
*"onda que baixa o número de divergências e sobe o número de passos não fecha"*. Ele pediu clareza
de padrão e pagou por ela o clique que essa régua protegia. Onde a régua de cliques era o único
argumento — ADR-019 e ADR-020 —, a exceção morreu na mesma data.

**Aqui ela não era o único argumento, e por isso este ADR fica de pé.** Este registro é honesto
sobre o que a decisão alcança e o que ela não alcança:

- **A perna que caiu:** "converter custaria um clique a mais no balcão" deixou de ser motivo
  suficiente por si só. Se um dia a conversão for possível sem perda de capacidade, o clique não a
  segura.
- **A perna que continua de pé:** o `Combobox` do DS é picker de popover e **não tem** modo de
  resultado inline. É ausência de capacidade, não preferência de gosto. Converter hoje não trocaria
  um padrão por outro melhor: trocaria por um que não existe.
- **A fronteira que a decisão do dono não cruza:** a fala é sobre **filtro de listagem** — a faceta
  ao lado da pesquisa. `AtendimentoPanel.tsx` não tem faceta nenhuma; ele tem um campo de busca com
  resultado inline. O padrão novo do cânone §1.1 não governa esta tela, e dizer que governa seria
  esticar a fala do dono para além do que ela diz.

**Consequência prática, sem silêncio:** a construção de `Combobox mode="flow"` entra na fila
nomeada da lane FILTROS-LISTA (handoff `leela-filtros-lista-20260817.md`, seção de fechamento) como
trabalho de DS, não de tela. Até lá `AtendimentoPanel.tsx` segue contando 1 em
`barra-de-filtro-crua` na catraca do `gate-canon` — número que esta lane **não** baixou e não
finge ter baixado.

**Condição de reabertura, inalterada:** um segundo consumidor do padrão "resultado inline sem
popover" abre a lane de DS e os dois migram juntos.
