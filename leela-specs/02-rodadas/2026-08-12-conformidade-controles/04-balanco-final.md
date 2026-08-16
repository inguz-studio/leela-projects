# Balanço final — a fila de 12/08, do C0 ao C6

> Registrado ao fechar a **Onda C6**, última da fila (`03-fila-em-ondas.md`). Sete ondas, sete
> lanes, cinco dias corridos (12→16/08). Este documento fecha o ciclo que `leela-conformidade-controles-20260812.md`
> abriu: a pergunta do dono, medida, respondida, e agora com o número de depois.

## 1. As oito contagens da catraca, do início ao fim

Cinco nasceram nesta rodada (camada B, `02-catraca-controles.md` §3); três já existiam e a rodada
também as moveu (camada A — Regra 1 `controle-cru-fora-do-ds`, Regra 2 `padrao-reimplementado-fora-do-ds`,
Regra 3 `filtro-fora-do-canone`, esta última nascida nesta mesma rodada). Todas as oito só descem —
nenhuma subiu em nenhum momento da campanha sem a razão registrada no próprio commit.

| Contagem | 12/08 (início) | 16/08 (final) | O que resta | Dono |
|---|---:|---:|---|---|
| `controle-cru-fora-do-ds.total` | 3 | **0** | — | fechada, C1 |
| `padrao-reimplementado-fora-do-ds.total` | 3 | **3** | `SecaoHead.tsx`, `EngajamentoView.tsx` (`Painel`=`Card`), `DistribuicaoView.tsx` (`Vazio`=`EmptyState`) | dívida do roadmap de 11/08, anterior a esta rodada — não é desta campanha (a rodada passou por 3→4→3: C0 achou `HubEventos` como novo hit ao ligar o sinônimo de `FilterChips`, C5 fechou o mesmo arquivo; saldo líquido zero) |
| `filtro-fora-do-canone.total` | 3 | **0** | — | fechada, C1 (2) + C5 (1, decisão do órfão de ordenação) |
| `faceta-crua.painel` | 13 | **2** | `InscritosView.tsx:410` (ADR-019), `EventosGlobaisRoute.tsx:117` (ADR-020) | DS — `FilterChips` ganhar `disabled` + um jeito de honrar limiar maior que 4, condição de reabertura escrita nos dois ADRs; dois consumidores nomeados são o sinal que a spec original previu para abrir essa lane |
| `barra-de-filtro-crua.painel` | 12 | **1** | `AtendimentoPanel.tsx:265` (ADR-018) | DS — `Combobox mode="flow"`, ou segundo consumidor do mesmo padrão |
| `contador-de-resultado-cru.painel` | 13 | **1** | `ComunicacaoView.tsx:203` | **sem dono ainda** — achado do gate na C0 (`02-inventario-componentes.md`/handoff C0), nunca entrou na fila de nenhuma onda (fica fora de `eventos/comunicacao` coberto por qualquer C-onda nomeada); candidato de uma linha para a próxima lane que tocar `eventos/comunicacao/**` |
| `rotulo-de-checkbox-cru` (painel+landing) | 17 (12+5) | **0** | — | fechada — painel na C2/C3/C4/C6, landing na C2 |
| `grupo-de-campos-cru.painel` | 11 | **3** | `CampanhaEditor.tsx:398`, `EventoForm.tsx:356`, `EventoForm.tsx:398` | **sem dono ainda** — a spec original (`01-inventario-controles.md` §7) já nomeou "mais oito `fieldset` à mão... entram como carona da peça de grupo" sem atribuir onda; C3/C4/C6 pagaram 8 dos 11, sobram os 3 em `eventos/**`, fora do território de qualquer onda fechada |

**Leitura do saldo.** Das oito, cinco fecharam em zero. Das três que restam com número, duas têm
exceção NOMEADA com ADR e condição de reabertura escrita (não são esquecimento — são decisão), e
duas são achados legítimos da catraca que nenhuma fila chegou a nomear por onda, e ficam registrados
aqui com dono em aberto pela primeira vez.

## 2. Os dois itens de carona que a C0 deixou escritos, e o que aconteceu com eles

| Item | Estado em 16/08 |
|---|---|
| `SearchInput.shortcutLabel` passar a `null` por default | **não pago em nenhuma onda.** Onze dos doze consumidores medidos em 12/08 já desligam manualmente (`shortcutLabel={null}`); o default do componente segue `'⌘K'`. Custo de troca: uma linha no componente, sem migração de consumidor nenhuma (quem já desliga não muda de comportamento). Sem dono nomeado — candidato de próxima lane que tocar `SearchInput.tsx`. |
| `Combobox` ganhar modo de fluxo, ou o balcão virar exceção com ADR | **resolvido por ADR.** A C3 decidiu ADR-018: o balcão (`AtendimentoPanel.tsx`) fica como exceção registrada, o modo de fluxo não foi construído. Mesma condição de reabertura do item acima em espírito — segundo consumidor do mesmo padrão reabre a decisão de construir. |

## 3. Por onda, o que cada uma pagou (número que a própria onda reportou)

| Onda | O que serve | Ocorrências nomeadas → convertidas | Exceções registradas |
|---|---|---:|---:|
| C0 | enabler — as 5 peças nascem (`FilterChips`, `FilterBar`, `ResultCount`, `CheckboxField`, `FieldGroup`) + a catraca aprende a ver | — | — |
| C1 | as 7 violações da regra que o dono citou | 7 → 7 | 0 |
| C2 | checkout e conta (§04.1) | 5 → 5 | 0 |
| C3 | operação do evento (§04.1) | 17 → 15 | 2 (ADR-018, ADR-019) |
| C4 | comunidade — clubes (§04.4) | 21 → 21 | 0 |
| C5 | relance + parcerias/CRM (§04.1 + §04.4) | 8 (tabela própria da onda; a fila estimava 15) → 8 | 0 |
| C6 | plataforma e administrativo (§04.1) — **última onda** | 12 nomeadas na fila → 10 convertidas + 1 obsoleta (`VendasTab`, tela redesenhada por lane não relacionada, sem barra de filtro nenhuma hoje) + 1 exceção (ADR-020) · carona: 2 facets (`TenantsList`/`RepassesFilaView`), `ListaGlobal`→`FilterBar` (7 consumidores), `DefinitionItem` nasce no DS e cobre 2 das 4 receitas de rótulo/valor (1 fica de fora por anatomia horizontal, decisão registrada no cânone), 3 receitas de `SectionHeader` | 1 (ADR-020) + 1 decisão sem ADR (Modo de visualização de `ContasRoute` não é faceta) |

**Nota de método, para quem comparar os números.** Três réguas diferentes mediram esta campanha em
momentos diferentes — o inventário humano de 12/08 (134 ocorrências, classificadas a/b/c), a fila em
ondas (que reestimou por onda ao planejar, às vezes com números que a execução corrigiu — ver C5
sobre isso no próprio handoff) e a catraca mecânica (as oito contagens da seção 1, a única fonte que
não pode divergir de si mesma). Este balanço usa a catraca como número final porque é a única que o
gate audita a cada commit; os números "nomeadas → convertidas" por onda vêm do que cada handoff já
tinha registrado, sem recontagem.

## 4. A resposta ao dono, atualizada com o número de depois

> Você perguntou, em 12/08, se estávamos aplicando o design system ou recriando os controles do
> zero. Medi 134 ocorrências em seis famílias, nas 303 telas dos dois aplicativos. Sete quebravam a
> regra que você temia — usar a peça da casa — e cinquenta e nove quebravam uma regra que você não
> tinha nomeado: usar peça que a casa nunca publicou, porque ela não existia.
>
> **As sete primeiras estão em zero, desde a Onda C1.** Zero `<select>` nativo, zero botão
> imitando chip, zero seletor de formulário fazendo trabalho de filtro. `botao-cru-estilizado`,
> `controle-cru-fora-do-ds` e a metade de `filtro-fora-do-canone` que era desta família fecharam com
> a primeira onda e não voltaram a subir.
>
> **As cinquenta e nove passaram pelas seis peças que nasceram para isso — cinco previstas, mais uma
> que a última onda decidiu no caminho.** `FilterChips`, `FilterBar`, `ResultCount`, `CheckboxField`
> e `FieldGroup` nasceram na Onda C0, com cânone e teste no mesmo commit. `DefinitionItem` nasceu na
> Onda C6, fechando uma decisão que a C0 tinha deixado escrita: o par rótulo-valor de duas fichas do
> administrativo também não tinha peça, e agora tem. Das oito contagens que a catraca passou a medir
> nesta campanha, cinco terminam em zero.
>
> **Três ficam com número, e nenhuma delas é descuido.** Duas são exceções que dois arquivos
> diferentes registraram por escrito, com o motivo e a condição exata que as reabre — um seletor de
> status que bateria o limiar de quatro valores da peça nova e custaria um clique a mais numa
> interação de uso direto, duas vezes (`InscritosView`, `EventosGlobaisRoute`), e um typeahead que
> não é o mesmo desenho de picker que a peça oferece (`AtendimentoPanel`). A terceira, `padrao-reimplementado-fora-do-ds`,
> não é da família dos controles — é dívida de 11/08 que esta campanha só cruzou de passagem, e sai
> do jeito que entrou.
>
> **Dois achados ficam sem dono, nomeados aqui pela primeira vez:** um contador de resultado em
> `eventos/comunicacao/ComunicacaoView.tsx` que a catraca sempre viu e nenhuma fila chegou a colocar
> na lista, e três grupos de campo em `eventos/novo/EventoForm.tsx` e
> `eventos/comunicacao/CampanhaEditor.tsx` que a spec original já previa como carona sem apontar
> onda. Nenhum dos dois é urgente — nenhum bloqueia nada —, e os dois têm o conserto de uma peça já
> existente, sem decisão nova para tomar.
>
> A pergunta tinha duas partes, e a resposta de hoje é mais curta que a de 12/08: você não está
> sendo desobedecido, e o que estava sendo recriado agora tem para onde ir.

## 5. Gates, do fechamento

| Gate | Resultado |
|---|---|
| `pnpm install --frozen-lockfile` + rebuild `core → design-system → api-client` | limpo, os três |
| `tsc --noEmit` (painel, landing) | limpo |
| `eslint --max-warnings 0` (painel, landing, design-system, showcase) | limpo |
| `pnpm gate:canon` | PASS, baseline regravado por `--atualizar` |
| `vitest run` — painel INTEIRO, 5 fatias seriais pós-rebuild | **256 arquivos · 2876 casos**, verdes — bate exato com a referência (SUBNAV/C4/C5) |
| `vitest run` — design-system INTEIRO | **91 arquivos · 2095 casos**, verdes (+1 arquivo / +11 casos: `DefinitionItem.test.tsx`) |
| `vite build --config showcase/vite.config.ts` | compila, 3320 módulos |
| `vite build --mode leela-hub` (painel) | compila, 4039 módulos |
| Gate visual (L-019), nível da peça, navegador real | `FilterChips`/`FilterBar`/`ResultCount`/`CheckboxField`/`FieldGroup`/`SectionHeader`/`DefinitionItem` capturados nos temas Brasa (escuro) e Wine (claro) via showcase local |

Prova AO VIVO das telas de `plataforma/**` autenticadas segue deferida ao primeiro deploy que tocar
essas rotas — mesmo padrão que C0/C2/C3/C4/C5 já registraram (sem seed de tenant local nesta sessão).
