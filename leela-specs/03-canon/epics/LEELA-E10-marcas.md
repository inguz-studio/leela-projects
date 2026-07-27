# LEELA-E10 · Marcas do Profissional

- **Superfície:** Painel
- **Horizonte:** H2 (Onda 5 — Expansão)
- **MoSCoW:** Could
- **Estimativa:** M
- **Status:** 🧊 Icebox
- **Depende de:** LEELA-E00 (fundação), LEELA-E01 (Design System & Shell)
- **De-para:** BH-E10 (BH-810 · Marcas do Profissional)

## Objetivo

Dar ao **profissional** (organizador ou coordenador) um lugar único para gerenciar suas marcas/patrocinadores e ver onde cada marca está ativada em seus clubes e eventos. Hoje o vínculo de patrocínio existe pontualmente no clube (E05 · `parcerias` tipo patrocinador, RN-123) e nos itens de kit patrocinados (E03 · RN-213/214); o E10 consolida essas relações num registro de marca reusável e mostra as ativações de cada uma (desafios patrocinados, itens de kit, presença em eventos), com o modelo comercial (financeiro ou permuta — RN-123) e a contrapartida acordada.

O valor é a promessa da persona Organizador ("chegar na reunião com o patrocinador com dados na mão") e do Coordenador ("ter dados na mão ao falar com patrocinador"): uma visão de marca que atravessa clubes e eventos, em vez de dado disperso por tela.

## Personas & JTBD

- **Persona primária:** Profissional — Organizador (**Marina Castelo**, Castelo Produções) e Coordenador de Assessoria (**Felipe Martins**, Corrida Perfeita Sul).
- **Marca de referência (leitura):** Marca Parceira — **CDL Wellness** (patrocinador master do Corrida Perfeita Sul; financeiro R$ 12.000/ano).
- **JTBD atendidos:**
  - "Ter dados de patrocínio na mão ao falar com a marca."
  - "Gerenciar num lugar só onde cada marca aparece (desafios, kits, eventos)."
  - "Controlar contrapartida e modelo comercial de cada patrocinador."

## Critérios de sucesso do épico

- Profissional cadastra e edita marcas com modelo comercial financeiro ou permuta (RN-123), contrato e contrapartida.
- Cada marca mostra suas ativações consolidadas (desafios patrocinados — RN-112; itens de kit patrocinados — RN-213/214; eventos), lendo dos vínculos já existentes.
- Toggle "exibir logo ao atleta" por ativação de item reflete e respeita RN-214.
- Listas com busca + filtros + estado vazio + contador "mostrando X de Y"; ações destrutivas (desativar marca) via `ConfirmModal` com preview (§2.15) e disclaimer LGPD onde irreversível (RN-144); telas consomem `packages/design-system` (§2.16 flat).

## Regras de negócio aplicáveis

- **RN-123** — Patrocinador tem modelo comercial: financeiro (R$/ano) ou permuta.
- **RN-112** — Desafio pode ter patrocínio vinculado (institucional do clube) → ativação de marca.
- **RN-213** — Item de kit tem origem: organizador ou patrocinador → ativação de marca.
- **RN-214** — Item patrocinado tem toggle de visibilidade de logo ao atleta.
- **RN-124 / §2.15** — Ações destrutivas exigem `ConfirmModal` com preview de consequências.
- **RN-144** — Ações irreversíveis com disclaimer; export de dados por 90 dias.

## Modelo de dados tocado

Ver `modelo-de-dados-firestore.md`. Este épico introduz o registro de marca no nível do profissional e o consolida com os vínculos existentes:

- **`profissionais/{profId}/marcas/{marcaId}`** (nova subcoleção) — `nome`, `logoUrl?`, `modeloComercial`(financeiro/permuta — RN-123), `valorAnual?`, `contrapartida`, `contratoUrl?`, `status`(ativa/inativa), `criadoEm`. Fonte de verdade da marca do profissional.
- Ativações são **derivadas** dos vínculos já existentes (não duplicadas): `clubes/{clubId}/parcerias` tipo `patrocinador` (RN-123), `clubes/{clubId}/desafios` com `patrocinioId` (RN-112) e `itensKit/{itemId}` com `origem=patrocinador` (RN-213/214). Estratégia: 🔁 índice inverso desnormalizado `marcas/{marcaId}/ativacoes` (refs) mantido por Function no onWrite desses vínculos, evitando fan-in caro no cliente.
- ∑ `marcas.qtdAtivacoes` mantido por Function.

## Fora de escopo (Won't nesta fase)

- Portal/login da própria marca (a marca não acessa o painel).
- Relatórios de mídia/ROI para a marca (isso vive no Analytics — E11 — e no H3).
- Faturamento/cobrança do patrocínio (financeiro do profissional — E09).
- Criação de ativação a partir daqui (a ativação nasce no clube/evento; E10 só consolida e configura visibilidade de logo).

---

## User stories

### LEELA-S811 · Gestão de marcas e patrocinadores · (de-para BH-810)

**Como** profissional, **quero** cadastrar e editar minhas marcas com modelo comercial e contrapartida, **para** ter um registro único e reusável dos meus patrocinadores.

- **MoSCoW:** Could · **Estimativa:** M · **Superfície:** Painel · **RNs:** RN-123, RN-124, RN-144

**Critérios de aceite (Given/When/Then):**
- **Dado** o módulo Marcas, **quando** cadastro uma marca, **então** escolho modelo comercial financeiro (com `valorAnual`) ou permuta (com `contrapartida`) — RN-123.
- **Dado** uma marca com ativações, **quando** tento desativá-la, **então** `ConfirmModal` mostra preview das ativações que perdem patrocínio (§2.15) + disclaimer LGPD (RN-144).
- **Dado** a lista de marcas, **quando** filtro por modelo comercial e nada casa, **então** EmptyState + contador "mostrando 0 de N".

**Tasks:** LEELA-S811-T1.

#### LEELA-S811-T1 · CRUD de marca (lista + editar) com modelo comercial
- **Tipo:** screen + data-model · **Depende de:** E01-S001-3-T1 (Shell), E01-S001-3-T2 (Table), E01-S001-3-T3 (ConfirmModal) · **Bloqueia:** S812 · **Estimativa:** M

**Objetivo**
Entregar a lista de marcas e a tela de edição, criando a subcoleção `marcas` com Security Rules e o modelo comercial (RN-123).

**Contexto & referências**
- Não há tela dedicada no protótipo; derivar do backlog BH-810 e do bloco de patrocinadores do Club-Parcerias (E05) e Kits-Cadastro (E03).
- Mocks: CDL Wellness (financeiro, R$ 12.000/ano, renovação Dez 2026), ACATE Run Club (permuta), Secretaria de Esportes PMF (permuta) — HANDOFF-05.
- DS: Table densa (§2.5), Input/Badge/Chip, ConfirmModal (§2.15), Toast, upload (dashed) para logo/contrato.

**Arquivos (criar/editar)**
- `apps/painel/app/marcas/page.tsx` — lista + busca + filtro por modelo comercial.
- `apps/painel/app/marcas/[marcaId]/page.tsx` — editar marca (nome, logo, modelo comercial, contrapartida, contrato).
- `packages/core/src/brands/marca.ts` — tipo `Marca` + validações (financeiro exige `valorAnual`; permuta exige `contrapartida`).
- `packages/api-client/src/brands.ts` — CRUD de `profissionais/{profId}/marcas`.
- Security Rules — `marcas` legível/gravável só pelo `ownerId` (profissional dono).

**Passos de implementação**
1. Criar subcoleção `marcas` + Security Rules (owner only).
2. Lista densa com busca + filtro por `modeloComercial`; EmptyState + contador.
3. Tela de edição com validação condicional por modelo (RN-123); upload de logo e contrato.
4. Desativar via `ConfirmModal` com preview de ativações + disclaimer LGPD (RN-144); Toast.

**Modelo de dados / contratos**
- Coleção: `profissionais/{profId}/marcas/{marcaId}` — campos conforme modelo de dados.
- Tipo: `type Marca = { id; nome; logoUrl?; modeloComercial: 'financeiro'|'permuta'; valorAnual?; contrapartida; contratoUrl?; status }`.

**Regras de negócio a respeitar**
- RN-123 — modelo comercial financeiro/permuta; RN-124/§2.15 — confirmação com preview; RN-144 — disclaimer + export 90d.

**Critérios de aceite (testáveis)**
- **Dado** modelo financeiro sem `valorAnual`, **quando** salvo, **então** validação bloqueia com erro inline.
- **Dado** uma marca com ativações, **quando** desativo, **então** o preview lista as ativações afetadas antes de confirmar.

**Testes a escrever**
- unit: validação condicional por modelo comercial (`core`).
- integração: Security Rules (só o dono lê/escreve suas marcas).

**Definition of Done**
- [ ] Ver checklist padrão (`definition-of-done.md` — DoD Tela + API/Function).

**Fora de escopo**
- Cobrança/faturamento do valor anual (E09).

---

### LEELA-S812 · Ativações da marca · (de-para BH-810)

**Como** profissional, **quero** ver onde cada marca está ativa (desafios, kits, eventos) e controlar a exibição de logo, **para** provar contrapartida e gerenciar a presença da marca.

- **MoSCoW:** Could · **Estimativa:** M · **Superfície:** Painel · **RNs:** RN-112, RN-213, RN-214, RN-123

**Critérios de aceite (Given/When/Then):**
- **Dado** uma marca, **quando** abro suas ativações, **então** vejo, consolidados, os desafios patrocinados (RN-112), itens de kit patrocinados (RN-213) e eventos onde ela aparece.
- **Dado** um item de kit patrocinado por esta marca, **quando** alterno "exibir logo ao atleta", **então** o toggle reflete e persiste conforme RN-214.
- **Dado** uma marca sem nenhuma ativação, **quando** abro, **então** EmptyState "Esta marca ainda não tem ativações".

**Tasks:** LEELA-S812-T1.

#### LEELA-S812-T1 · Consolidação de ativações (índice inverso por Function) + toggle de logo
- **Tipo:** screen + api/function · **Depende de:** S811-T1, E05 (parcerias/desafios), E03 (itensKit) · **Estimativa:** M

**Objetivo**
Consolidar as ativações de cada marca via índice inverso mantido por Function e expor o toggle de visibilidade de logo dos itens patrocinados.

**Contexto & referências**
- Backlog BH-810; ativações leem de vínculos existentes (E03/E05) — nada é reconfigurado aqui além do logo.
- Mocks: CDL Wellness ativa em desafios (Preparação Meia Floripa, Verão Leve) e itens de kit patrocinados (Olympikus/Growth/Centauro/Probiótica como marcas de kit) — HANDOFF-05.
- DS: Tabs (§2.7, todas no DOM) por tipo de ativação, Table densa (§2.5), Toggle, EmptyState.

**Arquivos (criar/editar)**
- `apps/painel/app/marcas/[marcaId]/ativacoes/page.tsx` — abas Desafios / Itens de kit / Eventos.
- `functions/src/brands/indexBrandActivations.ts` — onWrite de parceria/desafio/item mantém `marcas/{marcaId}/ativacoes` + ∑`qtdAtivacoes`.
- `packages/core/src/brands/activation.ts` — tipo `Ativacao` + normalização das origens.

**Passos de implementação**
1. Function: no onWrite de `parcerias` (patrocinador), `desafios.patrocinioId` e `itensKit.origem=patrocinador`, atualizar índice inverso `marcas/{marcaId}/ativacoes` idempotentemente.
2. Tela: ler índice, agrupar por tipo em tabs (§2.7); contador + EmptyState.
3. Toggle "exibir logo ao atleta" grava em `itensKit/{itemId}.exibirLogo` (RN-214) com Toast.

**Modelo de dados / contratos**
- Escreve (via Function) `marcas/{marcaId}/ativacoes/{ativacaoId}` (ref + tipo) + ∑`qtdAtivacoes`.
- Toggle grava `itensKit/{itemId}.exibirLogo` (RN-214).

**Regras de negócio a respeitar**
- RN-112 — desafio patrocinado; RN-213 — origem do item; RN-214 — toggle de logo; agregados por Function.

**Critérios de aceite (testáveis)**
- **Dado** um desafio vinculado à marca, **quando** o vínculo é criado, **então** a ativação aparece na aba Desafios sem recarregar o mundo (índice por Function).
- **Dado** um item patrocinado, **quando** desligo "exibir logo", **então** `exibirLogo=false` persiste (RN-214).

**Testes a escrever**
- integração: Function de índice idempotente (reprocessar não duplica ativação).
- unit: normalização das origens de ativação (`core`).

**Definition of Done**
- [ ] Ver checklist padrão (`definition-of-done.md` — DoD Tela + API/Function).

**Fora de escopo**
- Criar/remover a ativação em si (nasce no clube/evento — E03/E05).

---

## Ordem sugerida

`S811 (CRUD de marca) → S812 (ativações + toggle de logo)`. As ativações são derivadas de vínculos já criados no E03 (itens de kit) e E05 (parcerias/desafios); o E10 apenas consolida e controla a exibição de logo.

## Recorte ANTECIPADO (R9 · adendo 2 do Vitor 2026-07-18)

> O Vitor (adendo 2): *"a parte de marcas é para ter salvo patrocinadores que já foram cadastrados previamente em algum evento, para que quando haja a necessidade de cadastrar algum patrocinador, futuramente, já haja a listagem."* O recorte **listagem reutilizável** (seed de S811) foi ANTECIPADO no LOTE R9; as ativações consolidadas (S812) seguem no horizonte do épico (Icebox).

- **RN-171 · Registro de patrocinador reutilizável no tenant + autocomplete.** O patrocinador cadastrado fica salvo no registro reutilizável (`profissionais/{profId}/marcas`, o alvo de S811) e alimenta o cadastro futuro de patrocínio em outro evento por **autocomplete/seleção** — não se recomeça do zero. Reusa o shape `ParceriaPatrocinador` (`packages/core/src/clubs/parceria.ts:122-132`: nome/modeloComercial/valorAnual/contrapartida) promovido a registro reutilizável. RN-123 ✅ (modelo comercial).

Story `S-R9-12`. Spec: `02-rodadas/2026-07-18-ux-review/`.

### Tela dedicada `/marcas` (lote MARCAS-TELA · 2026-07-19)

A **tela dedicada** do recorte S811 foi entregue no painel (antes só havia o registro + autocomplete no modal de patrocínio do R9-E). Escopo entregue:

- **Rota própria `/marcas`** na sidebar (o item "Marcas" do DS, antes inerte, agora navega) — decisão de navegação: rota de 1º nível, não aba em Configurações, pelo padrão do painel (espelho de `CrmRoutes`) e porque o DS já reserva o item "Marcas". Commits `[LEELA-MARCAS-T1..T3]`.
- **Lista** densa (logo 1:1 + nome + Badge de modelo comercial + detalhe R$/ano ou contrapartida), busca por nome, contador "mostrando X de Y", EmptyState honesto.
- **Criar/editar** via modal do DS (nome + modelo RN-123 condicional + valor/contrapartida + FileInput de logo 1:1 upload-only). Em edição o docId é fixo (renomear não cria órfão).
- **Excluir** via `ConfirmModal` com consequências reais.

**Decisões documentadas (honestidade de dado):**
- "Em quantos patrocínios a marca é usada" foi **OMITIDO** — a contagem de ativações (`qtdAtivacoes`) é o **S812** (ainda 🧊 Icebox) e não há reader barato neste recorte. Não se exibe número inventado; a tela explica o papel do registro.
- **Semântica de exclusão:** excluir remove o doc do registro reutilizável — a marca sai do autocomplete de patrocínios **futuros**; patrocínios **já cadastrados** em eventos/clubes são cópias independentes (`ParceriaPatrocinador`) e **permanecem intactos**. Documentada na própria `ConfirmModal`.

**Falta (segue no horizonte do épico):** consolidação de ativações + toggle de logo (**S812**), que mantém `marcas/{marcaId}/ativacoes` + `qtdAtivacoes` por Function. Quando entrar, exibir a contagem na lista e trocar o preview da exclusão para as ativações afetadas.

## Plano de execução (ESPEC-SWEEP · 2026-07-19)

**Onda 4 · item 3.** É o menor épico da onda e o mais isolado: nada depende dele, e ele depende só de vínculos que já existem.

### Estado real

S811 está entregue em duas camadas: o registro reutilizável com autocomplete (R9-E, RN-171) e a tela dedicada `/marcas` (lote MARCAS-TELA) com lista, criar/editar por modal, logo 1:1 upload-only e exclusão com consequências. Falta **S812** inteira — e a tela de hoje carrega uma omissão deliberada por causa disso: não mostra em quantos patrocínios a marca é usada, porque não há reader barato e a casa não exibe número inventado.

### O que resta

| # | Task | O que faz | Território | Dep | Rota | ⚔ |
|---|---|---|---|---|---|---|
| 1 | `S812-T1` | Function de índice inverso: no onWrite de `parcerias` tipo patrocinador (RN-123), de `desafios.patrocinioId` (RN-112) e de `itensKit.origem=patrocinador` (RN-213), mantém `marcas/{marcaId}/ativacoes` e ∑`qtdAtivacoes`, idempotente; Rules de leitura pelo dono e escrita só por Function | `functions/src/brands` · `packages/core/src/brands` · `firestore.rules` | E03 ✅ · E05 ✅ · S811 ✅ | **opus** xhigh | ⚔ |
| 2 | `S812-T2` | tela de ativações da marca: abas Desafios / Itens de kit / Eventos (todas no DOM, §2.7), contador, EmptyState honesto | `apps/painel/src/routes/marcas` | S812-T1 | **opus** xhigh | — |
| 3 | `S812-T3` | toggle "exibir logo ao atleta" por item patrocinado, gravando `itensKit.exibirLogo` (RN-214) | `apps/painel/src/routes/marcas` · `firestore.rules` | S812-T1 | **opus** xhigh | — |
| 4 | `S812-T4` | fechar as duas dívidas que a tela `/marcas` declarou: mostrar `qtdAtivacoes` na lista e trocar o preview da exclusão pelas ativações realmente afetadas | `apps/painel/src/routes/marcas` | S812-T1, T2 | **opus** xhigh | — |

**Por que T1 leva review antagonista.** É fan-out por gatilho sobre três fontes distintas, e o modo de falha é silencioso: uma ativação contada duas vezes, ou um vínculo removido que não some do índice, produz um número errado numa conversa com patrocinador. Idempotência tem que ser provada por reprocesso, não assumida.

**Por que nada aqui é haiku.** T3 parece um toggle, mas grava num documento que o atleta lê — e a regra de quem pode gravar mora nas Rules. Sem gate determinístico de permissão, não desce de tier.

### Ordem interna

`T1 → T2 → T3` (T3 depende da aba de itens existir) `→ T4`. T4 por último de propósito: só faz sentido exibir a contagem depois que o índice está provado idempotente.

### Critério de pronto

- [ ] reprocessar o mesmo vínculo duas vezes não duplica ativação nem incrementa a contagem duas vezes (integração no emulador)
- [ ] remover o vínculo remove a ativação do índice — o caso que fan-out costuma esquecer
- [ ] a exclusão de marca continua honesta: o `ConfirmModal` diz que patrocínios já cadastrados são cópias independentes e permanecem intactos
- [ ] nenhum número na tela vem de varredura no cliente
- [ ] review antagonista em contexto fresco no T1

### Sem decisão aberta

Este épico não tem nada para o Vitor decidir. RN-112, RN-123, RN-213 e RN-214 já estão cravadas e a semântica de exclusão foi documentada no lote anterior.

---

## Miniatura do logo na lista (RN-236 · lane THUMBS-LISTAS 2026-07-27)

A **RN-236** é do **E03** (dona; especificada lá). Aqui vale a parte de marcas do
pedido do Vitor: reconhecer a marca **de vista** em `/marcas`, antes de abrir
para editar.

A lista já mostrava o logo 1:1 desde a S811, mas por um par `img`/`div` montado à
mão dentro da própria `MarcasPage`. Passou a usar o primitivo **`Thumb`** do DS
(`430e72c`), e o que a troca corrigiu de verdade:

- **`loading="lazy"`**, que não existia — a lista é do profissional e curta hoje,
  mas cresce, e toda imagem era baixada de saída.
- **Medida por token** no lugar de `h-10 w-10` cru.
- **URL morta degrada para a sigla.** O fallback anterior só cobria "esta marca
  nunca teve logo"; um `logoUrl` com URL de Storage revogada deixava o quadrado
  quebrado do navegador na tabela. Agora os dois casos caem na mesma caixa
  íntegra.

O `alt` continua nomeando a marca aqui — diferente da listagem de kits, onde a
miniatura é decorativa: a coluna do logo vem **antes** da coluna do nome e o
cabeçalho dela é vazio, então sem `alt` a célula seria muda para leitor de tela.

Nenhuma asserção da `MarcasPage` foi tocada. O logo não tinha teste; agora tem
três (logo próprio por linha, logos distintos entre marcas, fallback sem logo).
