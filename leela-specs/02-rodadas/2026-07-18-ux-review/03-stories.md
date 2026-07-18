# STORIES-r9 · User stories da revisão UX do Vitor (2026-07-18)

> PROPOSTA revisável. Pacote de spec do LOTE **R9** — transforma a revisão **verbatim** do Vitor (`~/.harness-logs/2026-07-18/briefs/leela-r9-ux-review-spec.txt`, blocos principal + adendo 2 + decisão de antecipar influenciadores) em stories prontas pra dev codar. **NÃO se codou nada neste lote** — é documentação.
> Formato canônico de [[STORIES-onda3]]: cada story cita **JTBD servido**, **épico pai**, **RNs tocadas**, **rota/arquivo âncora conferido por leitura** e critérios Given/When/Then. `[ ]` a fazer.
> Dimensões JTBD: **T** Transacional (H1) · **H** Heroica (H2) · **M** Marketplace (H2-H3) · **S** Social/identitária (transversal).
> **Priorização por JTBD (L-004), não pela ordem da lista do Vitor.** Agrupamento em lotes executáveis no fim (`§ Lotes`). Numeração `S-R9-01..S-R9-13`. RNs novas numeradas após grep da maior RN vigente por série.

---

## Nota de fidelidade (o que JÁ existe vs. o que é novo)

A releitura REAL do código mudou a natureza de vários itens — registro aqui para o dev não reconstruir o que já roda:

- **`/financeiro` JÁ é a análise de vendas unificada** (`FinanceiroRoutes.tsx` — index = `AnaliseVendasPage`; `/financeiro/repasses` = `RepassesPage`; SubNav Análise|Repasses). O bloco **"Desempenho de vendas"** já existe em `AnaliseVendasView.tsx` (KPIs + Sparkline). A entrada **"Analytics"** do sidebar é um **placeholder inerte** (`sidebar.ts:31`, href `undefined`). Item 1 = **resolver esse placeholder** (a fusão que o Vitor pede) + adicionar o que falta: filtro por evento e seleção temporal.
- **A demografia idade×sexo JÁ tem fonte real** (`agregarDemografia` → `eventos/{id}/demografia/current`, RN-820, sem PII) e a Análise já renderiza BarChart de faixa etária + DonutChart de sexo. Item 2 = **re-bucketizar para 5 em 5 anos** (hoje os buckets são `ate_17/18_24/25_34/35_44/45_54/55_mais` — bandas de 7-10 anos, não 5).
- **A capa do evento (`Evento.imagemUrl`) já existe** no modelo (16/10, doc-comentada "media do card e hero da landing") e o backend `atualizarConfiguracoesEvento` já a persiste — **mas nenhuma tela do painel a grava hoje** (o `EventoForm` coleta a URL e a DESCARTA; `ConfigGeraisForm` não a inclui). Item 9 = **ligar a edição da capa** na página de vendas com thumb horizontal.
- **Não existe** no DS: `Calendar`/`DateRangePicker`, `Combobox`/`Command`, `Popover` primitivo (o E01 renomeou Popover→DropdownMenu). O `Select` do DS é `<select>` **nativo** restilizado — a lista de opções que abre é a do SO, o que É a "caixa de seleção fora do padrão/shadcn" que o Vitor viu.
- **Comunicação central não existe** como hub do menu principal. O que existe é comunicação **por evento** (campanhas/automações E06) e **por clube** (comunicados E05). Item 13 propõe o hub central (possivelmente fundido com o CRM).

---

## S-R9-01 · `/financeiro` unificado: fusão Análise+Analytics, filtro por evento e seleção temporal (calendário shadcn) · E11

**Como** organizador, **quero** uma única superfície de análise de vendas onde eu filtro por evento e por intervalo de datas com um calendário, **para** parar de procurar o mesmo número em duas entradas do menu e recortar o desempenho por evento e por período.

- **JTBD servido:** T · doc: *"Publico evento → acompanhar resultado de relance"* (04.1, Organizador) + persona 03.1 *"inadimplência/desempenho invisível"*. Dimensão **Transacional H1**.
- **Verbatim:** *"em desempenho de vendas, vejo que podemos unificar com a aba analytics para que seja uma coisa só, e haja o filtro de análise por eventos, podendo acontecer a seleção temporal, com componente de calendário (shadcn, SEMPRE)."*
- **Âncoras (conferidas):** `apps/painel/src/routes/financeiro/FinanceiroRoutes.tsx` · `.../analise/AnaliseVendasView.tsx` (Desempenho de vendas, l.100-120) · `apps/painel/src/shell/sidebar.ts:31` (`analytics: undefined`, placeholder). **Sem** date-picker no DS (dep S-R9-05).
- [ ] **Fusão:** o placeholder "Analytics" do sidebar deixa de existir como entrada morta — ou aponta para `/financeiro` (a análise É o Analytics ao nível do profissional, RN-820), ou é removido; a Análise passa a ser a superfície única de "desempenho + analytics". **Given** o sidebar, **when** clico em qualquer entrada de análise, **then** caio em `/financeiro` (Análise) — não há duas entradas divergentes.
- [ ] **Filtro por evento:** **Given** a Análise, **when** seleciono um evento no filtro (Combobox shadcn — S-R9-05), **then** todos os blocos (Desempenho, Perfil de compradores, Modalidades, Tamanhos) recortam para aquele evento; "Todos os eventos" = agregado atual do tenant. Fonte = leitura do agregado `eventos/{id}/…/current` do evento escolhido (nunca varredura no cliente).
- [ ] **Seleção temporal:** **Given** a Análise, **when** escolho um intervalo no date-range picker (calendário shadcn — S-R9-05), **then** os blocos temporais (Desempenho/Sparkline de conversão) recortam ao intervalo; sem intervalo = comportamento atual. **Nota de honestidade:** buckets demográficos (`demografia/current`) e ∑ de modalidades/tamanhos são snapshots do agregado — se não houver série temporal, o recorte por data aplica só onde há dado datado (o dev declara a lacuna com nota, nunca fabrica série).
- **RNs:** **RN-821** (nova, ver `RN-r9.md` §E11). **Épico:** E11-analytics. **Território:** `apps/painel/src/routes/financeiro/**` + `apps/painel/src/shell/sidebar.ts` (Opus) · Function/agregado só se faltar recorte por evento (Fable, provável reuso do que já existe). **Dep:** S-R9-05 (Combobox+Calendar shadcn). **Gate:** conformidade shadcn (S-R9-05) + AA.

---

## S-R9-02 · Cohort idade×sexo em faixas de 5 em 5 anos · E11

**Como** organizador, **quero** ver o perfil dos compradores por faixa etária de 5 em 5 anos cruzada com sexo, **para** entender o público real do evento com a granularidade que o mercado de corrida usa.

- **JTBD servido:** T+S · doc: *"Falo com patrocinador → ter dados na mão"* (04.4) + *"acompanhar resultado de relance"* (04.1). Dimensão **Transacional H1 + Social**.
- **Verbatim:** *"Gráfico cohort, de idade e sexo, onde a faixa de idade vá variando de 5 em 5 anos."*
- **Âncoras (conferidas):** `packages/core/src/analytics/demografia.ts:39-60` (`FAIXAS_ETARIAS` + `faixaEtariaDaIdade` — hoje `ate_17/18_24/25_34/35_44/45_54/55_mais`) · `functions/src/analytics/agregarDemografia.ts` · `apps/painel/src/routes/financeiro/analise/AnaliseVendasView.tsx:125-183` (BarChart faixa + DonutChart sexo).
- [ ] **Re-bucketização (RN-822):** os buckets passam a bandas de 5 anos padrão de corrida de rua. **Default recomendado** (decisão em `DECISOES-ABERTAS`): `ate_17, 18_24, 25_29, 30_34, 35_39, 40_44, 45_49, 50_54, 55_59, 60_mais` (18-24 = banda jovem "open" do padrão de corrida; 5 em 5 de 25 em diante; bordas `ate_17`/`60_mais` preservadas). Idade calculada NA DATA CIVIL DA PROVA, determinística, mesma disciplina de PII do RN-820 (agregado só de contagens; nascimento/CPF nunca sobem ao painel).
- [ ] **Given** um evento com inscritos confirmados com `[reg]`, **when** abro o Perfil de compradores, **then** vejo o cohort em bandas de 5 anos × sexo; inscrito sem `[reg]` cai em `semNascimento`/`semGenero` (honesto, nota de cobertura) — nada é fabricado.
- [ ] **Given** o cohort, **when** um patrocinador pede o recorte, **then** o cruzamento idade×sexo é legível (cohort/stacked por sexo dentro de cada faixa, ou par BarChart faixa + segmentação por sexo — decisão de viz do dev, respeitando `charts` do DS + tokens brasa).
- **RNs:** **RN-822** (nova). **Épico:** E11-analytics. **Território:** `packages/core/src/analytics/demografia.ts` + `functions/src/analytics/agregarDemografia.ts` (Fable — recompute idempotente, sem PII) · `apps/painel/.../analise` (Opus, viz). **Dep:** RN-820 ✅ (fonte demográfica já existe). **Gate:** review antagonista (PII/LGPD — confirmar que só contagens sobem) + AA.

---

## S-R9-03 · Repasses = visão consolidada de todos os eventos (explícito na UI) · E09

**Como** organizador, **quero** que a tela de Repasses deixe claro que é a visão consolidada de todos os meus eventos, **para** não confundir com o financeiro de um evento específico.

- **JTBD servido:** T · doc: *"Processo repasse → ver saldo, operação escalável"* (04.1, Admin/Organizador). Dimensão **Transacional H1**.
- **Verbatim:** *"a parte de repasses, deve ser mais clara que é a visão unificada, de todos os eventos."*
- **Âncoras (conferidas):** `apps/painel/src/routes/financeiro/repasses/RepassesView.tsx` (SaldoCards + `RepassesPorEvento` — já agrega por evento, mas o título não declara o escopo consolidado).
- [ ] **Given** a rota `/financeiro/repasses`, **when** abro, **then** título/subtítulo declaram explicitamente "consolidado de todos os eventos" (ex.: subtítulo "Saldo e repasses somando todos os seus eventos"); os 3 cards de saldo seguem como saldo autoritativo (∑ do servidor, `saldo/current`).
- [ ] **Given** organizador sem eventos com repasse, **when** abro, **then** EmptyState honesto que reforça o escopo ("Quando seus eventos gerarem saldo, o repasse consolidado aparece aqui").
- **RNs:** **RN-358** (nova — regra de apresentação: Repasses é a visão consolidada). **Épico:** E09-financeiro-profissional. **Território:** `apps/painel/src/routes/financeiro/repasses/**` (Opus). **Dep:** nenhuma. **Gate:** AA + copy do glossário. **Quick-win.**

---

## S-R9-04 · Auditoria AA REAL do Switch + estilo flat (thumb escuro) · E01/DS

**Como** usuário do painel em tema escuro, **quero** enxergar o thumb do Switch quando desligado e a borda dos campos flat, **para** operar sem adivinhar o estado dos controles.

- **JTBD servido:** enabler de acessibilidade (sem linha de usuário direta — honesto; sustenta toda tela com toggle/formulário). Dimensão transversal.
- **Verbatim:** *"o Toggle button está com a visibilidade ruim, quando nao selecionado, o botão arredondado de dentro está muito escuro, acho que voce nao passou o gate de validação de contraste para esse componente. e nem para o estilo flat."*
- **Âncoras (conferidas):** `packages/design-system/src/components/Switch/Switch.tsx:79` (thumb OFF = `bg-[var(--surface-raised)]` = `#161616`, sobre track OFF `--surface-sunken` = `#0A0A0A` → **≈1.1:1**, abaixo do mínimo 3:1 de 1.4.11) · flat: `Input.tsx:118-120`/`Select.tsx:77-79`/`Textarea.tsx:79-81` (fill `--surface-sunken #0A0A0A` sobre página `--surface-base #0C0C0C` → borda do campo ≈1.0:1, quase imperceptível quando sem foco) · matriz AA: `packages/design-system/src/theme/__tests__/contrast.test.ts` (`NON_TEXT_PAIRS` l.131-153, gate ≥3:1; contagem travada em `l.180-181`).
- [ ] **Medição REAL (prova numérica no DoD):** medir a razão de contraste do par thumb-OFF × track-OFF do Switch e da borda do campo flat × página, nos DOIS temas (brasa/wine). **Given** o gate, **then** o par do Switch entra em `NON_TEXT_PAIRS` (ex.: `['surface-raised','surface-sunken']`) e a contagem sobe de 20→21 — o teste FALHA com o token atual, provando o buraco.
- [ ] **Fix de tokens:** o thumb OFF passa a um token com ≥3:1 sobre o track OFF (ex.: `--border-strong`/`--text-tertiary` ou um component-token novo `--switch-thumb-off`); a borda do campo flat ganha delta perceptível vs. página (component-token de borda flat ou 1px `--border-subtle`). Zero valor cru (governança §2). **Given** o fix, **then** matriz AA verde nos 2 temas + prova visual no showroom.
- [ ] **Lição registrada (L-006):** "gate de contraste passado não cobriu o thumb do Switch nem a borda do flat — pares não-texto de componente precisam entrar na matriz AA, não só pares de texto". Ver `V1-CHECKLIST` (lições).
- **RNs:** — (não é RN de negócio; é DoD/AA + lição **L-006**). **Épico:** E01-design-system. **Território:** `packages/design-system/src/components/Switch/**` + `Input/Select/Textarea` + `tokens/*.json` + `theme/__tests__/contrast.test.ts` (Opus/DS; token novo segue processo §5 da governança). **Gate:** matriz AA (prova numérica) + showroom nos 2 temas. **Quick-win de conformidade.**

---

## S-R9-05 · Diretriz shadcn PERMANENTE + Combobox/filtro conforme (Popover+Command) · E01/DS

**Como** organizador, **quero** que os seletores/filtros/calendários do painel sigam um padrão único e polido, **para** não encontrar uma "caixa do sistema operacional" toda vez que abro um filtro.

- **JTBD servido:** enabler de consistência (transversal). O Vitor já pediu isso mais de uma vez — a diretriz precisa ficar GRAVADA onde todo lote de UI a herde.
- **Verbatim:** *"a caixa de seleção quando abre um filtro está fora do nosso padrao de design e shadcn também."*
- **Âncoras (conferidas):** `packages/design-system/src/components/Select/Select.tsx:12-14` (ENGINE = `<select>` nativo — a lista aberta é a do SO, não estilizável) · `FilterMenu.tsx` (compõe `DropdownMenu`) · **não existe** `Command`/`Combobox`/`Popover` primitivo no DS.
- [ ] **Diretriz permanente (governança):** gravar em `leela-specs/governanca-design.md` (nova §8) a regra: *"selects/dropdowns/popovers/calendários do painel seguem a anatomia shadcn/Radix (Popover + Command, focus ring de 2px, densidade do DS, tokens semantic-only). O `<select>` nativo fica proibido para filtros e seleções ricas — só é aceitável em formulário simples de baixa cardinalidade quando o listbox estilizado não agrega."* Vira item de gate de UI: "o seletor/filtro abre um painel do DS (não do SO)?".
- [ ] **Combobox/Command:** criar o primitivo que hoje falta — `Popover` (âncora) + `Command` (lista filtrável WAI-APG) → `Combobox` (single/multi), com focus ring, teclado completo e tokens do DS. **Given** um filtro, **when** abro, **then** o painel é do DS (tokens brasa, `bg-popover`, focus 2px), não a lista do SO. Este primitivo **destrava** o filtro por evento (S-R9-01) e o `Calendar`/`DateRangePicker` shadcn (S-R9-01/react-day-picker + Popover).
- [ ] **Sweep de conformidade:** inventariar os `Select`/filtros existentes fora do padrão (o único filtro single-choice hoje é o `<select>` nativo; `FilterMenu` já compõe DropdownMenu) e migrar os que forem filtro/seleção rica para o Combobox. `<select>` de formulário simples pode ficar, conforme a diretriz.
- **RNs:** — (diretriz de DS + gate). **Épico:** E01-design-system. **Território:** `packages/design-system/src/components/{Popover,Command,Combobox,Calendar}/**` (novos) + sweep em `apps/painel` (Opus/DS). **Dep:** nenhuma (é fundação). **Gate:** stories no showroom + AA + a11y (teclado). **Prioridade alta — destrava S-R9-01.**

---

## S-R9-06 · Fluidez de navegação (rotas param de "carregar") · E-transversal

**Como** organizador, **quero** navegar entre telas já visitadas sem ver a página recarregar do zero, **para** ter a sensação de app, não de site que recarrega.

- **JTBD servido:** enabler de UX (transversal; sustenta todos os jobs de operação diária no painel).
- **Verbatim:** *"sobre a questao de rotas ficarem 'carregando' no navegador, ainda está acontecendo, revisar para que a experiencia seja fluida."*
- **Âncoras:** TanStack Query já implantado (ADR-010, lote UX-DADOS) mas nem toda superfície migrou; lição **L-002** (SPA sem cache = "carregar do zero"). Superfícies vivas (financeiro/balcão) usam `onSnapshot`.
- [ ] **Investigar e especificar** (task com critério mensurável): (a) **prefetch on-hover/on-viewport** dos links de navegação primária; (b) `staleTime`/`gcTime` calibrados nas queries TanStack para rotas já visitadas não re-buscarem no mount; (c) **skeletons locais** por bloco em vez de tela cheia; (d) **suspense boundaries** por seção. **Given** navego A→B→A entre rotas já visitadas, **then** volto sem spinner de página inteira e sem refetch visível (critério: navegação entre rotas visitadas **< 150ms** sem skeleton de página cheia — medível por Playwright, padrão do gate L-001).
- [ ] **Given** uma rota nunca visitada, **when** abro, **then** vejo skeleton LOCAL por bloco (nunca spinner solto de lista — DoD Tela), não a tela em branco.
- **RNs:** — (perf; referencia L-002/ADR-010). **Épico:** transversal (data-layer). **Território:** `apps/painel/src/lib/query/**` + navegação primária (Opus). **Dep:** nenhuma. **Gate:** medição Playwright (critério de ms) + suíte verde. **Nota:** é diagnóstico+fix; a task pode virar sub-lote se a auditoria achar causa estrutural.

---

## S-R9-07 · Input de imagem do perfil é UPLOAD-ONLY (mata "cole uma URL") · E17/conta

**Como** organizador, **quero** subir a foto de perfil por arquivo, sem o campo "cole uma URL", **para** ter um input limpo e um caminho único de imagem.

- **JTBD servido:** S · doc: *"Olho meu perfil → identidade, não consumo"* (04.4). Dimensão **Social**.
- **Verbatim:** *"o input de imagens no perfil nao deve ter a opção 'cole uma URL'."*
- **Âncoras (conferidas):** `apps/painel/src/routes/conta/perfil/ContaPage.tsx:251-290` (upload `FileInput` id `conta-foto-arquivo` + fallback `Input` "Ou cole uma URL" l.272, estado `fotoEditada/fotoUrl`, `urlDeImagemValida` l.41-50, `salvarFoto` l.177-193) · teste que assere a URL: `.../__tests__/ContaPage.test.tsx:109` · o fallback de URL é decisão da **ADR-016 item 5** (não tem RN próprio; entregue por O3-UIC-F3 + upload por LEELA-R5).
- [ ] **Given** a seção "Foto de perfil", **when** abro, **then** só existe o caminho de upload (`FileInput`) — o `Input` de URL, o botão "Salvar foto" da URL e o estado/validação de URL são removidos; upload persiste na hora (como já faz). Atualizar o teste `ContaPage.test.tsx:109`.
- [ ] **Decisão de escopo (registrada em `DECISOES-ABERTAS`, NÃO apagar histórico):** esta decisão **SUPERSEDE** o fallback de URL da ADR-016 (item 5). Pergunta explícita ao Vitor: **o "cole uma URL" morre também na capa de clube, no avatar/capa do perfil público e na capa de evento?** **Default recomendado = morre em todo lugar** (as 4 superfícies restantes: `PerfilPublicoEditor.tsx:280,313`, `ConfiguracoesView.tsx:267`, `EventoForm.tsx:181-188`). Se ratificado, vira sweep único; até lá, este lote entrega SÓ a foto de perfil da conta.
- **RNs:** **RN-168** (nova — inputs de imagem do painel são upload-only via Storage; URL colada removida) + **atualização da ADR-016** (item 5 supersedido). **Épico:** E17-perfil-social (política de imagem). **Território:** `apps/painel/src/routes/conta/perfil/**` (Opus) + ADR-016 (doc). **Dep:** LEELA-R5 ✅ (Storage/`FileInput`). **Gate:** AA + teste atualizado. **Quick-win.**

---

## S-R9-08 · Imagens de KITS em formato 1:1 (landing + gestão) · E03

**Como** organizador, **quero** subir uma imagem quadrada para cada kit, **para** que o atleta veja o kit na página de vendas e eu o reconheça na gestão do evento.

- **JTBD servido:** T · doc: *"Descubro evento → me inscrever"* (04.1 — o kit com imagem reduz fricção de escolha) + *"kit sem fricção"* (RN-216). Dimensão **Transacional H1**.
- **Verbatim:** *"em kits suba uma opção para que os kits tenham imagens, formato 1:1, prévia na landing de vendas do evento e na gestão de eventos."*
- **Âncoras (conferidas):** `packages/core/src/eventos/kit.ts:40-54` (`interface Kit` — **sem** campo de imagem hoje) + `parseKit` l.67-97 · landing `apps/landing/app/(public)/[eventSlug]/sections/KitsSection.tsx` (grid de cards, **sem** imagem) · painel `apps/painel/src/routes/eventos/kits/KitEditor.tsx` (**sem** upload) · seam Storage `packages/api-client/src/storage.ts` (**sem** path de evento/kit — só `users/**` e `clubes/{clubeId}/capa`).
- [ ] **Modelo:** adicionar `imagemUrl?: string` ao `Kit` + `parseKit` (validação http(s), padrão `isUrlCapaValida`) + `SalvarKitInput` (api-client) + Rules. **RN-227:** imagem do kit é **1:1 (quadrada)**, opcional, ≤5MB, formatos da allowlist ADR-016 (SVG banido); ausência = placeholder do DS (nunca imagem falsa).
- [ ] **Upload (reusa infra R5):** novo path de Storage `eventos/{eventoId}/kits/{kitId}` no seam `storage.ts` (paralelo a `clubes/{clubeId}/capa`) + regra em `storage.rules` com `firestore.get` provando o tenant do evento (mesmo padrão do clube). **Given** o `KitEditor`, **when** subo uma imagem, **then** ela é validada 1:1/≤5MB e persiste no kit.
- [ ] **Exibição nos 2 lugares:** (a) landing `KitsSection.tsx` — thumb 1:1 no card do kit (dobra de kits da página de vendas); (b) painel `KitsCadastroView`/`KitEditor` — thumb 1:1 na gestão. **Given** um kit com imagem, **when** o atleta vê a landing e o organizador vê a gestão, **then** a imagem quadrada aparece nos dois; sem imagem = placeholder consistente.
- **RNs:** **RN-227** (nova). **Épico:** E03-operacao-evento (kits). **Território:** `packages/core/src/eventos/kit.ts` + `functions`/`storage.rules` (Fable — Rules/tenant) · `apps/painel/src/routes/eventos/kits/**` + `apps/landing/.../sections/KitsSection.tsx` + `packages/api-client/src/storage.ts` (Opus). **Dep:** LEELA-R5 ✅ (Storage). **Gate:** review antagonista (Rules de Storage cross-tenant) + AA.

---

## S-R9-09 · Thumb horizontal de capa na edição da página de vendas · E03/E12

**Como** organizador, **quero** definir a imagem de capa horizontal do evento na edição da página de vendas, **para** que a página e o card apareçam com identidade.

- **JTBD servido:** S+T · doc: *"Falo com patrocinador → ser visto como profissional"* (04.4) + descoberta orgânica (04.1). Dimensão **Social + Transacional**.
- **Verbatim:** *"A edição da página de vendas deve ser uma imagem horizontal de thumb, busque referencias dos benchmarks citados (preferencialmente cheers) para definirmos a dimensão."*
- **Âncoras (conferidas):** `packages/core/src/eventos/evento.ts:135-142` (`Evento.imagemUrl?` — doc "media 16/10 do card e hero da landing") · backend `atualizarConfiguracoesEvento` **já persiste** `imagemUrl` (`configuracoesEvento.ts:45,58`) · **mas** nenhuma tela grava: `EventoForm.tsx:20-21` coleta a URL da capa e **NÃO envia**; `ConfigGeraisForm` não inclui `imagemUrl` · editor da página de vendas `apps/painel/src/routes/eventos/pagina-vendas/PaginaVendasView.tsx` (toggles de seção + SeoCard com OG image — campo **diferente** da capa) · landing hero `HeroSection.tsx:113` usa `aspect-[16/10]`.
- [ ] **Ligar a edição da capa:** o editor da página de vendas (ou o config gerais, decisão do dev por JOB) ganha um controle de capa com **thumb horizontal**, upload via Storage (novo path `eventos/{eventoId}/capa`, mesmo padrão do clube) OU o `imagemUrl` já suportado, persistido por `atualizarConfiguracoesEvento`. **Given** a edição, **when** subo/edito a capa, **then** ela persiste em `Evento.imagemUrl` e aparece no card + hero da landing; sem capa = gradiente (RN-166).
- [ ] **Dimensão (RN-228) — RATIFICADA pelo Vitor (adendo 6, 2026-07-18; fonte = spec da Cheers):** **1600×838 px, proporção 1.9:1, arquivo ≤2MB, formatos JPEG/GIF/PNG.** Fecha a pesquisa do item 9 (a `S-R9-09-T3` de pesquisa web está RESOLVIDA/removida — dimensão fornecida pelo Vitor). O preview do editor e o hero da landing passam a usar **1.9:1** (ajustar o `aspect-[16/10]` hoje em `HeroSection`/`EventoForm` para a proporção ratificada — nota para o dev de execução). Contexto histórico: o discovery não tinha a dimensão da cheers (`benchmark-cheers.md` sem pixel/aspect; `benchmark-shotgun.md:46,148` só confirmava o conceito de capa horizontal) — o Vitor forneceu a spec direto.
- [ ] **Validação de upload (AC):** **Given** o controle de capa, **when** subo um arquivo, **then** é aceito só se **≤2MB** e formato **JPEG/GIF/PNG**; fora disso, erro inline. **Alinhamento com R5:** a allowlist do `storage.rules` já aceita `image/(jpeg|png|webp|gif|avif)` — JPEG/PNG/GIF **já cobertos**, **sem** mudança de Rules; o cap de **2MB é app-level** (mais estrito que os 5MB das Rules). Não mexer nas Rules neste lote.
- **RNs:** **RN-228** (nova — capa/banner horizontal editável/persistida na página de vendas; **1600×838, 1.9:1, ≤2MB, JPEG/GIF/PNG** — ratificado) + RN-166 ✅ (gradiente fallback). **Épico:** E03-operacao-evento / E12-landing. **Território:** `apps/painel/src/routes/eventos/pagina-vendas/**` (ou `configuracoes`) + `storage.rules` (Fable) + `packages/api-client/src/storage.ts` (Opus). **Dep:** LEELA-R5 ✅. **Gate:** AA + review antagonista (Storage cross-tenant, se novo path).

---

## S-R9-10 · Padronizar divisórias de menus terciários dentro de eventos · E01/DS

**Como** organizador, **quero** que as sub-navegações terciárias dentro de eventos tenham o mesmo tratamento visual, **para** não ver umas com divisória e outras sem.

- **JTBD servido:** enabler de consistência (transversal).
- **Verbatim:** *"padronize divisórias de menus terciários dentro de eventos (Financeiro sem divisória; seguir o padrão de Comunicação)."*
- **Âncoras (conferidas):** **causa-raiz = escolha de componente.** `SubNav` (DS) é **plano sem divisor** por decisão do Vitor 2026-07-11 (`SubNav.tsx:4,12-18`); `Tabs` (DS) tem `border-b border-b-[var(--border-subtle)]` (`Tabs.tsx:73`). Financeiro do evento usa **SubNav** (sem divisória — `FinanceiroLayout.tsx:37`); Comunicação usa **Tabs** (com divisória — `ComunicacaoPage.tsx:180`). Inventário completo das sub-navs terciárias:

  | Sub-área (dentro de eventos) | Arquivo:linha | Componente | Divisória hoje |
  |---|---|---|---|
  | Nav secundária do evento (Visão/Inscritos/Kits/…/Financeiro/Config) | `evento/EventoShell.tsx:175` | SubNav | Não |
  | **Financeiro (Resumo · Reembolsos e transferências)** | `financeiro/FinanceiroLayout.tsx:37` | SubNav | **Não** ← queixa |
  | Kits (Cadastro · Distribuição · Estoque · Entrega) | `kits/KitsLayout.tsx:29` | SubNav | Não |
  | Configurações (Geral · Política · Exigências · Equipe) | `configuracoes/ConfiguracoesLayout.tsx:90` | SubNav | Não |
  | **Comunicação (Campanhas · Histórico · Automações)** | `comunicacao/ComunicacaoPage.tsx:180` | Tabs | **Sim** ← padrão-alvo |
  | Inscritos (Todos · Grupos · …) | `inscritos/InscritosView.tsx:428` | Tabs | Sim |
  | Inscrito slide-in (abas) | `inscritos/InscritoSlideIn.tsx:226` | Tabs | Sim |
  | Campanha editor (preview de canais) | `comunicacao/CampanhaEditor.tsx:446` | Tabs | Sim |

  Nota: o Financeiro do evento tem **2** abas (Resumo · Reembolsos e transferências) — não há aba "Transferências" separada; a troca de titularidade está dobrada na aba "Reembolsos e transferências".
- [ ] **Given** as sub-navs terciárias dentro de eventos, **when** o dev padroniza, **then** todas seguem o padrão de Comunicação (COM divisória). **Duas vias** (decisão do dev + Vitor): (a) trocar as terciárias que usam `SubNav` por `Tabs`; ou (b) dar ao `SubNav` uma variante com divisória. **Cuidado:** mexer no `SubNav` compartilhado afeta TODOS os consumidores (nav secundária, Kits, Configurações), não só Financeiro.
- [ ] **Decisão registrada (`DECISOES-ABERTAS`):** o pedido **conflita com a decisão do Vitor de 2026-07-11** ("SubNav plano, sem divisor"). **RN-229** registra o novo padrão (terciárias dentro de eventos seguem Comunicação, com divisória) e marca a supersessão. Default recomendado = seguir a instrução mais nova do Vitor (com divisória nas terciárias), confirmando se vale só para as terciárias dentro de eventos ou para todo `SubNav`.
- **RNs:** **RN-229** (nova — padrão de divisória das sub-navs terciárias; supersede a decisão SubNav-plano de 2026-07-11 no escopo das terciárias). **Épico:** E01-design-system. **Território:** `packages/design-system/src/components/{SubNav,Tabs}/**` + layouts de eventos (Opus). **Gate:** showroom nos 2 temas + AA. **Task mecânica** (inventário acima já feito).

---

## S-R9-11 · Afiliado/influenciador ANTECIPADO (link ref → atribuição → conversões) · E08 (recorte antecipado 2026-07-18)

**Como** organizador, **quero** gerar um link de afiliado com código para um influenciador e ver as conversões que ele trouxe, **para** ativar marketing de influência agora, sem depender do painel completo do promotor.

- **JTBD servido:** T+M · doc: *"Vendo com promotor → link rastreável"* (04.1) + *"Quero crescer o evento"* (candidato P6). Dimensão **Transacional H1 + Marketplace**.
- **Verbatim:** item 11 do brief principal (*"links de afiliado para influenciadores — temos isso definido?"*) + **decisão do Vitor 2026-07-18: *"a parte de influenciadores pode ser antecipada para agora."*** Recorte mínimo viável — **sem comissionamento** (fase 2).
- **Âncoras (conferidas, ponto de reuso provado por leitura):**
  - Kernel de janela de atribuição: `packages/core/src/clubs/parceria.ts:184` `dentroDaJanelaAtribuicao(clicadoEm, convertidoEm, janelaDias)` — helper puro já usado por E05/E08.
  - Atribuição que POUSA na venda sem split: `functions/src/checkout/createInscricaoCharge.ts:365-401` (`cupomParceria: { parceriaPath, clubeRef, cupomPath }` — o checkout re-lê a parceria, exige `ativa`, cupom byte-coerente) + `packages/core/src/eventos/cupom.ts:53,113-122` (`escopo: 'geral'|'club_parceiro'` + `clubeRef`/`parceriaRef`, RN-364). **É este o kernel de atribuição-sem-split que o E18 usa e que o item 11 reusa.**
  - Preservação de atribuição no CTA (E12): `apps/landing/app/(public)/[eventSlug]/CtaInscricao.tsx` (o CTA leva ao checkout preservando o contexto da inscrição).
- **Decisão da entidade (decidida e justificada aqui; ver `DECISOES-ABERTAS`):** o afiliado-influenciador **nasce como subcoleção própria do evento — `eventos/{eventoId}/afiliados/{afiliadoId}`** (organizador dono: `nome`, `refCodigo` único, `canal?`, `janelaAtribuicaoDias`, ∑`conversoes`, ∑`valorAtribuido`), **em vez de** sobrecarregar o union `parcerias` (que vive sob `clubes/` = dono clube, e `promotores/` = dono promotor, H3). Justificativa: o dono é OUTRO (organizador cria o afiliado para o próprio evento), então coleção própria é mais limpa que um 3º ramo do union — **mas REUSA** o `dentroDaJanelaAtribuicao` e a disciplina de atribuição-na-venda do `cupomParceria`. E08 (painel do promotor) segue H3 intacto; este recorte é a fatia organizador-side.
- [ ] **T1 · Link com ref:** organizador cria afiliado no painel → gera link `{landing}/{slug}?ref=<refCodigo>`. **Given** um afiliado, **when** gero o link, **then** o `refCodigo` é único por evento e o link é copiável. Core: geração/validação do `refCodigo` (padrão `masterLink` do E05).
- [ ] **T2 · Captura na inscrição (RN-313):** **Given** um atleta que chega por `?ref=<código>`, **when** completa a inscrição, **then** o `ref` é capturado e atribuído na venda dentro da janela (`dentroDaJanelaAtribuicao`), preservando a disciplina do CTA (E12) — mesma costura do `cupomParceria`, **sem split**. Atribuição fora da janela não conta.
- [ ] **T3 · Registro de conversões (RN-314):** ∑ conversões por afiliado mantido por Function (idempotente, recontagem/append como os outros ∑), escrita exclusiva de Function (Rules negam ao cliente).
- [ ] **T4 · Visão do organizador:** tela no painel do evento: lista de afiliados com conversões, valor atribuído (bruto, informativo — **sem** cálculo de comissão), busca/filtro/EmptyState. **Given** conversões atribuídas, **when** abro, **then** vejo quanto cada afiliado trouxe.
### Mecânica do influenciador (adendo 3 do Vitor · 2026-07-18 — dois tipos)

- [ ] **Clube como influenciador (RN-315):** o clube pode ter o PRÓPRIO link de desconto, **condicionado a um número mínimo de inscrições** definível pelo organizador (threshold por parceria/evento). **Onde vive o parâmetro:** `minimoInscricoes` na parceria/afiliado do clube (`eventos/{id}/afiliados/{id}` ou na `parceria` evento_afiliado — o dev decide pelo dono). **Antes de atingir o mínimo** (pergunta de decisão, `DECISOES-ABERTAS`, **default recomendado**): o link é **rastreável desde já, mas o desconto só ativa ao atingir o mínimo** (sem desconto retroativo — retroatividade abriria buraco de estorno/reprocessamento de vendas já pagas). **Given** um clube-afiliado com `minimoInscricoes=N`, **when** as inscrições atribuídas < N, **then** o link atribui conversão mas o cupom de desconto não aplica; ao cruzar N, o desconto passa a valer para novas inscrições.
- [ ] **HIPÓTESE (NÃO ratificada) · modelo "pré-compra" do clube-influenciador (adendo 5, 2026-07-18):** o Vitor quer **validar com um organizador de eventos** antes de fixar. Mecânica proposta (group-buy): inscrições pelo link do clube entram em estado **"pré-compra"**; ao atingir o número **X** (o mínimo do organizador), dispara-se a **cobrança no cartão de todas** de uma vez. **Registrada como HIP-R9-01 em `DECISOES-ABERTAS` — "pendente validação com organizador"**, NÃO é RN. A spec entrega a proposta + as **perguntas de dinheiro explícitas** que a validação precisa responder: **(a)** pré-autorização de cartão expira em dias — reter pré-auth até X pode estourar a janela; alternativa = salvar método de pagamento (token) e cobrar no gatilho, com risco de recusa na hora do disparo; **(b)** o que acontece se X **nunca** é atingido (expiração da pré-compra + comunicação aos pré-compradores); **(c)** **recusas parciais** no disparo em lote (as bem-sucedidas ficam abaixo do mínimo de novo?); **(d)** impacto em **vaga/estoque** de lote durante a pré-compra (reserva vs não-reserva). **Quando/se implementar:** dinheiro ⇒ **rota Fable + review antagonista** (anotar no DoD). O default conservador enquanto não valida = RN-315 (gate de desconto, sem cobrança em lote).
- [ ] **Influenciador pessoa física (RN-316):** convidado **por e-mail** a criar conta; acompanha as PRÓPRIAS vendas pelo link com cupom aplicado (dashboard de conversões próprio). **REUSO OBRIGATÓRIO (provado por leitura):** convite-por-e-mail→conta = provisionamento do aceite E18 (`functions/src/assessorias/provisionAssessoria.ts` — `provisionAssessoriaAccount`: localiza convite hasheado, cria/vincula Auth por e-mail, transação anti-TOCTOU) + rate-limit R2 (failures-only keyed no alvo); atribuição/conversões = kernel `cupom.clubeRef`/`parcerias` + `dentroDaJanelaAtribuicao`. **Produção depende do EmailProvider (fail-closed hoje)** — a antecipação do E08 **SOBE A URGÊNCIA do EmailProvider** na lista de ações externas (`DECISOES-ABERTAS §🟡`).
- [ ] **Config via MODAL (RN-317):** o cadastro de novo influenciador (clube ou PF) é um **modal** no painel (padrão shadcn — diretriz S-R9-05), **não** página dedicada. 4 vias de fechamento (DoD Modal).
- [ ] **Escopo de leitura do influenciador (RN-318):** o influenciador vê **SÓ as próprias conversões** — projeção fechada: quantidade, valor atribuído e status das conversões do próprio link; **nunca** dados de outros compradores além do agregado da própria atribuição (sem CPF/nome/e-mail de terceiros). Rules fail-closed; reader server-side com shape fechado. **PII do influenciador PF:** mesmo cuidado do E18 — documento mascarado, trust anchors nas Rules.
- [ ] **Acompanhamento de vendas na aba Clubs, DOIS lados (RN-319 · RATIFICADA, adendo 5):** **(organizador)** vê as vendas/conversões do clube-influenciador E do influenciador PF na **sua aba Clubs**; **(clube/influenciador)** vê as PRÓPRIAS vendas na **aba Clubs da própria conta**. Escopo de leitura coerente com RN-318 (cada lado do influenciador só vê as próprias conversões; o organizador vê as dos afiliados do próprio tenant). **Given** conversões atribuídas, **when** o organizador abre Clubs, **then** vê o desempenho de cada clube/influenciador; **when** o clube/influenciador abre Clubs na própria conta, **then** vê só as próprias vendas (nunca de terceiros).
- [ ] **Fase 2 (pergunta de decisão, NÃO neste recorte):** comissionamento/repasse ao influenciador (envolve dinheiro → **review Fable** quando implementar; provavelmente absorve/antecipa mais de E08 + split do `PaymentProvider`). Registrar em `DECISOES-ABERTAS`.
- **RNs:** **RN-313** (captura de `?ref=`, atribuição por janela, sem split) + **RN-314** (registro de conversões, visão do organizador) + **RN-315** (clube como influenciador, threshold de mínimo de inscrições) + **RN-316** (influenciador PF por convite de e-mail, reuso E18/R2) + **RN-317** (config via modal shadcn) + **RN-318** (escopo de leitura do influenciador — vê só as próprias conversões) + **RN-319** (acompanhamento na aba Clubs dos dois lados — organizador e influenciador). **Hipótese não-ratificada:** HIP-R9-01 (modelo pré-compra, pendente validação com organizador). **Nota no E08:** recorte afiliados ANTECIPADO por decisão do Vitor 2026-07-18; resto do E08 (painel do promotor completo, financeiro/split) segue **H3**. **Épico:** E08-influenciador (recorte antecipado). **Território:** `packages/core/src/affiliation/**` + `functions/src/checkout` (atribuição) + `functions/src/assessorias/provisionAssessoria.ts` (reuso do provisionamento) + `functions` (∑, Rules) — **Fable ⚔** (atribuição/dinheiro/PII/idempotência) · `apps/painel/src/routes/eventos/[slug]/**` (modal + dashboard) + `apps/landing` (captura `?ref=` + aceite do convite) — Opus. **Dep:** E12 checkout ✅, E18 kernel de atribuição + provisionamento ✅, EmailProvider (ação externa — urgência elevada). **Gate:** review antagonista (atribuição/idempotência/PII — não contar conversão duas vezes, não vazar entre eventos, influenciador não lê dado de terceiros).

---

## S-R9-12 · Registro reutilizável de patrocinadores (marcas) · E10 (seed antecipada)

**Como** organizador, **quero** que os patrocinadores que já cadastrei fiquem salvos numa listagem, **para** reaproveitá-los ao cadastrar patrocínio num evento futuro em vez de recomeçar do zero.

- **JTBD servido:** S · doc: *"Falo com patrocinador → ter dados na mão"* + *"gerenciar num lugar só onde cada marca aparece"* (04.4, E10). Dimensão **Social**.
- **Verbatim (adendo 2):** *"a parte de marcas é para ter salvo patrocinadores que já foram cadastrados previamente em algum evento, para que quando haja a necessidade de cadastrar algum patrocinador, futuramente, já haja a listagem."*
- **Âncoras (conferidas):** shape de patrocinador existente = `packages/core/src/clubs/parceria.ts:122-132` (`ParceriaPatrocinador`: `nome`, `modeloComercial`, `valorAnual?`, `contrapartida`, `contratoUrl?`) — hoje vive **por clube** (`clubes/{clubId}/parcerias`) · o épico **E10-marcas JÁ modela o registro reutilizável** ao nível do profissional: `profissionais/{profId}/marcas/{marcaId}` (E10-S811, `LEELA-E10-marcas.md:46,61-115`) — Status Icebox · a página de vendas do evento tem seção `patrocinadores` (`packages/core/src/eventos/paginaVendas.ts:161`) mas **não há modelo de patrocinador ao nível do evento** ligado a um registro reutilizável.
- [ ] **Seed antecipada de E10-S811:** o registro reutilizável de marca/patrocinador (`profissionais/{profId}/marcas`) do E10 é o alvo. **Given** que cadastrei um patrocinador num evento, **when** vou cadastrar patrocínio em outro evento, **then** a listagem do tenant aparece como autocomplete/seleção (parto dela, não do zero) — **RN-171** (patrocinador cadastrado fica salvo no registro do tenant e alimenta o cadastro futuro por seleção). Reusa o shape de `ParceriaPatrocinador` (nome/modeloComercial/contrapartida) promovido a registro reutilizável.
- [ ] **Nota de antecipação parcial no E10:** a story seed vive em E10 (Icebox) com nota "recorte de listagem reutilizável ANTECIPADO por decisão do Vitor 2026-07-18; ativações consolidadas (S812) seguem no horizonte do épico". **Não** especificar as ativações consolidadas agora — só a listagem + autocomplete.
- **RNs:** **RN-171** (nova — registro de patrocinador reutilizável no tenant + autocomplete no cadastro futuro) + RN-123 ✅ (modelo comercial). **Épico:** E10-marcas (seed antecipada de S811). **Território:** `packages/core/src/brands/marca.ts` + `packages/api-client/src/brands.ts` + Rules (Fable — owner) · `apps/painel` (Opus — lista + autocomplete no cadastro de patrocínio). **Dep:** shape `ParceriaPatrocinador` ✅. **Gate:** review antagonista (Rules owner-only) + AA.

---

## S-R9-13 · Aba CRM no menu principal + hub de Comunicação (PII/LGPD no coração) · E19 (épico novo)

**Como** organizador, **quero** ver todos os meus clientes (atletas que compraram) numa visão única com LTV, para conhecer minha base e agir sobre ela (inclusive comunicação e aniversário).

- **JTBD servido:** S+T · doc: *"Falo com patrocinador → ter dados na mão"* (04.4) + *"crescer o evento"* (candidato P6). Novo job de **CRM do organizador** (candidato **P8**, proposto em `JTBD-TRACE-r9.md §2`, não aplicado). Dimensão **Social + Transacional**.
- **Verbatim (adendo 2):** *"quero que tenhamos uma aba 'crm' prevista no Menu principal, para que todos os clientes do organizador apareçam lá, com informações gerais, numero de eventos que participou, valor gasto, ele tenha uma visão de LTV dos proprios clientes. sexo, idade, data de aniversário. Podemos ter isso unificado com comunicação."* + *"Em Comunicação não desenvolvemos nada ainda."*
- **Decisão de épico (decidida e justificada aqui):** **novo épico E19-CRM**, não extensão de E11/E06. Justificativa: E11 (analytics) é **agregado sem PII** (RN-820); o CRM é o OPOSTO — **identidade individual cross-evento** (linking por CPF/e-mail), que é OUTRA categoria de dado e exige base legal, finalidade e Rules próprias. Fundi-lo em E11 contaminaria a disciplina "agregado sem PII" que sustenta a Análise. E06 é comunicação POR EVENTO; o hub central é superfície nova. Logo, épico próprio.
- **Reconciliação "Comunicação" (inventário honesto):** o Vitor disse "não desenvolvemos nada" — o que EXISTE hoje é comunicação **por evento** (campanhas/automações E06 — construído) e **por clube** (comunicados E05 — construído); o que **NÃO existe** é um **hub central de Comunicação no menu principal** (o item `comunicacao` do sidebar é placeholder inerte, `sidebar.ts:29`). A peça nova = o hub central, **possivelmente fundido com o CRM** (desejo do Vitor: "podemos ter isso unificado com comunicação") — sem apagar o que já roda por evento/clube.
- **PII/LGPD (o coração desta spec — bloqueante de design):**
  - [ ] **RN-172 (nova — CRM individual do organizador):** o CRM cruza identidade do cliente **entre eventos** por chave (CPF e/ou e-mail). **Base legal/finalidade** declaradas (legítimo interesse do organizador sobre a própria base transacional / execução de contrato), **finalidade limitada** (gestão de clientes + comunicação), **minimização** (só os campos do job: nome, nº de eventos, valor gasto/LTV, sexo, idade, aniversário — **nada de dado sensível**). Isto é categoria DISTINTA do RN-820 (agregado sem PII) — o CRM individual é dado pessoal identificável e precisa de RN própria.
  - [ ] **Quem lê:** no mínimo `isTenantWriter` (organizador/admin do tenant) — **nunca** afiliado/patrocinador/coordenador de clube; Rules fail-closed; leitura via Function/reader com shape fechado (o cross-join de identidade roda server-side, não no cliente).
  - [ ] **Retenção + coerência:** retenção e expurgo alinhados às decisões PII vigentes (export 90d RN-144; disciplina A-T2). Exclusão de conta do atleta reflete no CRM.
- [ ] **Given** o menu principal, **when** abro a aba CRM, **then** vejo a lista de clientes (atletas que compraram em qualquer evento do organizador) com nome, nº de eventos, valor gasto, LTV, sexo, idade, data de aniversário; busca/filtro/EmptyState/paginação (lista densa §2.5).
- [ ] **Given** um cliente, **when** abro o detalhe, **then** vejo o histórico consolidado (eventos, valor) — cross-evento por identidade, server-side.
- [ ] **Oportunidade (NÃO escopo obrigatório):** a data de aniversário sugere **campanha de aniversário** → conectar com as automações E06 (gatilho `aniversario`) como fase futura, registrado como oportunidade, não como escopo deste recorte.
- [ ] **Decisão registrada (`DECISOES-ABERTAS`):** (a) CRM e Comunicação central **unificados numa aba** ou abas irmãs? (default recomendado: **um hub "Clientes & Comunicação"** com CRM + disparo de comunicação para segmentos — atende o desejo do Vitor sem inflar); (b) base legal exata a ratificar com o Vitor; (c) chave de linking (CPF vs e-mail vs ambos — default: CPF quando presente, e-mail como fallback).
- **RNs:** **RN-172** (CRM individual cross-evento — PII/base legal/quem lê/retenção). **Épico:** **E19-CRM** (novo). **Território:** `packages/core/src/crm/**` + `functions/src/crm/**` (cross-join + Rules, **Fable ⚔** — PII pesada) · `apps/painel/src/routes/crm/**` + `sidebar.ts` (Opus). **Dep:** identidade transacional (inscrições/pedidos ✅), demografia (RN-820 ✅ para idade/sexo). **Gate:** **review antagonista obrigatório (PII/LGPD)** + AA. **Maior frente do pacote — precisa de decisão do Vitor antes de codar.**

---

## S-R9-14 · Adapter EmailProvider (impl de referência Brevo) · E06 (infra transversal)

**Como** plataforma, **quero** um provedor de e-mail transacional plugável, **para** entregar convites e comunicados de verdade — destravando o convite de assessoria/influenciador e as campanhas por e-mail.

- **JTBD servido:** enabler de infra (sem linha de usuário direta — honesto; sustenta convite E18/E08, campanhas E06, aniversário E19).
- **Verbatim (adendo 7 → adendo 8, 2026-07-18):** EmailProvider ratificado como Resend (adendo 7) e **superseded por Brevo no mesmo dia por custo** (adendo 8: free 300/dia vs 100/dia; primeiro pago US$9 vs US$20; SendPulse descartado pelo throttle 50/h). **Fornecedor final = Brevo** (brevo.com).
- **Âncoras (conferidas):** hoje **não existe** port concreto — só referência conceitual "EmailProvider é mock/pendente" que faz o convite **lançar em produção** (`functions/src/assessorias/cadastrarAssessoria.ts:41,181-190`: *"Convite de assessoria exige EmailProvider"*). Padrão a seguir = `PaymentProvider` (ADR-006: interface + impl plugável + fail-closed), como o `AsaasProvider` (R6).
- [ ] **Port + impl (padrão ADR-006):** criar a interface `EmailProvider` **provider-agnóstica** (ex.: `sendTransactional({ to, subject, template, data })`) + a impl de referência **`BrevoProvider`** (API transacional REST do Brevo, `POST /v3/smtp/email`) + o seletor (`selectEmailProvider`) espelhando `selectProvider` do pagamento. **A interface NÃO muda com o provedor:** trocar Brevo por outro no futuro = **nova impl do port, ZERO mudança nos consumidores**. **Given** `BREVO_API_KEY` **ausente** no env, **when** um consumidor tenta enviar, **then** o comportamento **fail-closed atual permanece intacto** (o convite segue lançando/sandbox — nada muda). **Given** a key **presente**, **when** envia, **then** o envio é **real** via Brevo.
- [ ] **Consumidores destravados:** (a) convite E18 (`9e7e017` — o ramo fail-closed passa a enviar); (b) convite de influenciador PF (RN-316); (c) campanhas por e-mail (E06 — o pipeline `executarDisparoCampanha` ganha o canal e-mail real); (d) futuro gatilho aniversário (E19). Cada um continua **fail-closed sem key**. Nenhum consumidor conhece "Brevo" — só o port.
- [ ] **Template mínimo transacional:** template transacional enxuto (convite/comunicado) com os campos necessários; **sanitização dos campos do organizador** nos templates (nome de evento/clube/mensagem) — superfície de e-mail é vetor de **phishing/injeção de conteúdo**; escapar/limitar HTML, nunca interpolar cru.
- [ ] **Segredo:** `BREVO_API_KEY` no `functions/.env` / Secret Manager, **nunca logado nem commitado** (mesma disciplina da chave Asaas, R6). Domínio de envio depende da decisão de domínio (`{DOMINIO_LEELA}`); até verificar o domínio, o envio fica limitado ao remetente/limitações do free tier do Brevo (anotar o que a doc do Brevo exigir na implementação — não inventar) — suficiente para teste.
- **RNs:** **RN-137** (nova — e-mail transacional via `EmailProvider` plugável, impl de referência Brevo, fail-closed sem `BREVO_API_KEY`). **Épico:** E06-marketing (infra transversal; referenciada por E18/E08/E19). **Território:** `packages/core/src/email/**` (port) + `functions/src/email/**` (BrevoProvider + seletor) + consumidores (E18/E08/E06) — **Fable ⚔** (superfície de e-mail = phishing/injeção; secret). **Dep:** conta Brevo + API key (ação externa do Vitor); decisão de domínio (item 12) para produção. **Gate:** review antagonista (sanitização de conteúdo do organizador + secret nunca vazado) + testes HTTP mockado + 1 E2E opt-in (padrão `ASAAS_E2E` do R6). **Lote:** R9-E (junto dos afiliados/convite que dependem dele).

## Nota de honestidade (L-004 · zero órfã)

Todas as stories com superfície de usuário citam uma linha de `jobs-to-be-done.md` (rotulada "doc:") ou marcam a aproximação. Exceções honestas (enablers sem linha direta): **S-R9-04** (contraste/AA), **S-R9-05** (diretriz shadcn), **S-R9-06** (fluidez) e **S-R9-10** (divisórias) — infra/consistência de UI, marcadas em vez de forjar um job. Candidato novo **P8** (CRM do organizador) proposto em `JTBD-TRACE-r9.md §2`, **não** aplicado a `jobs-to-be-done.md` até ratificação. RNs novas (RN-168/171/172/227/228/229/313/314/358/821/822) numeradas após grep da maior RN vigente por série; nenhuma inventada fora de série.
