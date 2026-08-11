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
  - **Marca não se apaga (decisão do dono, 09/08 · PATROCINADOR-TOGGLE).** Nenhuma superfície do produto exclui uma marca do registro. O que existe é o interruptor sobre o `status` que o modelo já carrega (`ativa | inativa`, `packages/core/src/brands/marca.ts`): marca **inativa** some do autocomplete de patrocínios **novos** e continua listada, com o estado visível, para poder voltar. Desligar avisa na tela o que muda e o que não muda; a contagem de patrocínios afetados **não** entra no aviso enquanto o **S812** estiver no gelo, porque não há leitor barato para ela. Patrocínios já cadastrados em eventos e clubes nunca são tocados — são cópias independentes, e isso é provado por teste, não descrito. Registro: `02-rodadas/2026-08-09-decisoes-dono/01-decisoes-dono.md` §20.

Story `S-R9-12`. Spec: `02-rodadas/2026-07-18-ux-review/`.

### Tela dedicada `/marcas` (lote MARCAS-TELA · 2026-07-19)

A **tela dedicada** do recorte S811 foi entregue no painel (antes só havia o registro + autocomplete no modal de patrocínio do R9-E). Escopo entregue:

- **Rota própria `/marcas`** na sidebar (o item "Marcas" do DS, antes inerte, agora navega) — decisão de navegação: rota de 1º nível, não aba em Configurações, pelo padrão do painel (espelho de `CrmRoutes`) e porque o DS já reserva o item "Marcas". Commits `[LEELA-MARCAS-T1..T3]`.
- **Lista** densa (logo 1:1 + nome + Badge de modelo comercial + detalhe R$/ano ou contrapartida), busca por nome, contador "mostrando X de Y", EmptyState honesto.
- **Criar/editar** via modal do DS (nome + modelo RN-123 condicional + valor/contrapartida + FileInput de logo 1:1 upload-only). Em edição o docId é fixo (renomear não cria órfão).
- **Excluir** via `ConfirmModal` com consequências reais. **⛔ Removido em 11/08** pelo PATROCINADOR-TOGGLE — ver abaixo.

**Decisões documentadas (honestidade de dado):**
- "Em quantos patrocínios a marca é usada" foi **OMITIDO** — a contagem de ativações (`qtdAtivacoes`) é o **S812** (ainda 🧊 Icebox) e não há reader barato neste recorte. Não se exibe número inventado; a tela explica o papel do registro.
- **Semântica de exclusão:** excluir removia o doc do registro reutilizável — a marca saía do autocomplete de patrocínios **futuros**; patrocínios **já cadastrados** em eventos/clubes são cópias independentes (`ParceriaPatrocinador`) e **permaneciam intactos**. Registro histórico: a exclusão saiu do produto em 11/08.

### Liga e desliga no lugar da exclusão (PATROCINADOR-TOGGLE · 2026-08-11)

O dono decidiu em 09/08: *"Podemos deixar botao de liga e desliga, avisando"*, esclarecido como *"para excluir algum patrocinador, que na verdade será liga e desliga"*. O que mudou na tela:

- O botão **Excluir** e o `ConfirmModal` de consequências saíram da `MarcasPage`. A porta `excluirMarca` saiu do `@leela/api-client` no mesmo commit — botão religado por engano não encontra função para chamar.
- A coluna **"No autocomplete"** traz o `Switch` do DS (cânone §3, liga/desliga com efeito imediato) ao lado do `Badge` de estado (cânone §4). O `ConfirmModal` **não** foi reaproveitado de propósito: ele é a peça da ação destrutiva (cânone §8, botão `destructive`), e vestir de vermelho um gesto reversível ensinaria de volta o medo que a decisão removeu.
- O aviso é a **frase genérica** do §20 e sai no toast da escrita (cânone §11): diz que a marca some do autocomplete de patrocínios novos e que os patrocínios já cadastrados continuam intactos. O **número** de patrocínios afetados continua fora, e entra quando o **S812** sair do gelo — custa uma string.
- Defeito fechado no mesmo build: o `MarcaFormModal` não carrega `status` no input e a escrita é `setDoc` com `merge` carimbando `status: input.status ?? 'ativa'` — editar uma marca **desligada** a religava em silêncio. O input passa a preservar o `status` de origem; o formulário continua sem campo de estado, porque o estado é do interruptor.

**Falta (segue no horizonte do épico):** consolidação de ativações + toggle de logo (**S812**), que mantém `marcas/{marcaId}/ativacoes` + `qtdAtivacoes` por Function. Quando entrar, exibir a contagem na lista e trocar a frase genérica do aviso pelo número de patrocínios afetados.

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

---

## Prontidão de build · posição 3 da fila (SPECS-0728 · 2026-07-28)

Autorizada em DEC-0728A. O plano de 2026-07-19 já tinha a ordem certa das quatro
tarefas; o que faltava era a auditoria de viabilidade. Ela encontrou um bloqueio real, e
por isso esta seção acrescenta uma tarefa **antes** da que estava em primeiro lugar.

### Inventário antes de especificar

**O que existe e não se reescreve.** `packages/core/src/brands/marca.ts` com o tipo e as
validações condicionais por modelo comercial. `packages/api-client/src/brands.ts` com o
CRUD, o `listarMarcas` do autocomplete e o `upsertMarcaDoPatrocinio`. A rota `/marcas`
com lista, modal de criar e editar, exclusão com consequências e o `Thumb` do design
system no logo. O campo `exibirLogo` já existe no item de kit
(`packages/core/src/eventos/kit.ts`), com helper de decisão, então o T3 é uma tela sobre
um campo que já está no modelo, e não um campo novo.

**O bloqueio.** A tarefa `S812-T1` foi escrita assumindo que o gatilho consegue ir do
vínculo até a marca. Nenhuma das três fontes carrega essa chave hoje:

| Fonte do vínculo | O que ela guarda da marca | Dá para chegar em `marcaId`? |
|---|---|---|
| `clubes/{id}/parcerias` tipo patrocinador | `nome` (cópia independente, `ParceriaPatrocinador`) | não, só o texto |
| `clubes/{id}/desafios` | `patrocinioId`, que aponta para a parceria | não, a parceria também não tem |
| `itensKit/{id}` com `origem = patrocinador` | `marca`, uma string livre | não, só o texto |

Existe um atalho tentador e errado: o `marcaId` é derivado do nome normalizado
(`marcaIdDoNome` em `packages/api-client/src/brands.ts`), então dá para calcular a chave
a partir do texto do vínculo. O modo de falha é exatamente o que a própria tela já
documentou. Na edição, o docId é **fixo** de propósito, para renomear não criar órfão.
Logo, depois de um "CDL Wellness" virar "CDL Wellness Brasil", o texto do vínculo antigo
deriva para uma chave que não existe mais, e o vínculo some do índice sem ninguém
perceber. Casar por nome também funde duas marcas parecidas numa só.

**Consequência de escopo.** A chave precisa ser **gravada no vínculo**, no instante em
que o autocomplete já sabe qual marca foi escolhida e hoje descarta o id. Isso é uma
tarefa nova, `S812-T0`, e ela bloqueia todas as outras. Sem ela, o índice conta errado, e
número errado numa conversa com patrocinador é o dano que este épico existe para evitar.

**Fronteira de escrita.** O índice mora sob `profissionais/{profId}/marcas/{marcaId}`,
que é do profissional, enquanto as três fontes são de clube e de evento. O gatilho tem de
resolver o dono a partir do `tenantId` do documento de origem, nunca de um parâmetro do
cliente (RN-400). É a parte que mais merece o olho do review antagonista.

### Regras de negócio novas (SPECS-0728)

- **RN-387 · Chave da ativação é gravada, não adivinhada.** Todo vínculo que patrocina
  algo (parceria de patrocínio, desafio patrocinado, item de kit de origem patrocinador)
  grava o **`marcaId` explícito** do registro reutilizável no momento em que o vínculo é
  criado ou editado pela seleção do autocomplete (RN-171). O índice de ativações e a
  contagem **só consideram vínculos com `marcaId` gravado**. Casar ativação por nome é
  **proibido**: o docId é fixo na renomeação (por decisão do lote MARCAS-TELA) e a
  derivação por texto passa a apontar para o vazio depois do primeiro rename, além de
  fundir marcas homônimas. Vínculo legado sem a chave não conta e não é adivinhado; ele
  aparece na tela como pendência de revínculo, com o nome que tem.
- **RN-388 · Contagem de ativação vem do índice ou não vem.** O número de ativações de
  uma marca é lido do índice mantido por Function e do agregado `qtdAtivacoes`; nunca de
  varredura no cliente, nunca estimado. Enquanto o índice não existir para uma marca, a
  tela **omite o número** em vez de exibir zero, porque zero e desconhecido são coisas
  diferentes para quem vai sentar com o patrocinador. Formaliza como regra a omissão
  deliberada que o lote MARCAS-TELA já praticava.

---

### LEELA-S812 · Ativações da marca · complemento de prontidão (SPECS-0728)

Os critérios de aceite da história seguem os já escritos acima nesta mesma página. Esta
seção acrescenta os que a auditoria descobriu e a quebra de tarefas que faltava.

**Critérios de aceite acrescentados (Given/When/Then):**

- **Dado** um patrocínio criado pela seleção de uma marca no autocomplete, **quando** o
  vínculo é gravado, **então** ele carrega o `marcaId` escolhido, e não só o nome
  (RN-387).
- **Dado** uma marca renomeada depois de já ter vínculos, **quando** abro suas ativações,
  **então** todos os vínculos anteriores continuam listados, porque a ligação é por chave
  e não por texto.
- **Dado** um vínculo legado sem `marcaId`, **quando** abro as ativações da marca de mesmo
  nome, **então** ele **não** aparece como ativação e a tela mostra, em separado, quantos
  vínculos aguardam revínculo.
- **Dado** que o índice de uma marca ainda não foi construído, **quando** vejo a lista de
  marcas, **então** a coluna de ativações fica vazia com explicação, e não com zero
  (RN-388).
- **Dado** um vínculo de patrocínio removido, **quando** o gatilho processa, **então** a
  ativação some do índice e `qtdAtivacoes` decrementa.
- **Dado** o mesmo evento de vínculo reprocessado, **quando** o gatilho roda de novo,
  **então** nada duplica e a contagem não incrementa duas vezes.

**Tasks:** `S812-T0`, `S812-T1`, `S812-T2`, `S812-T3`, `S812-T4`.

#### LEELA-S812-T0 · Chave `marcaId` nos três vínculos de patrocínio
- **Tipo:** data-model · **Depende de:** S811 (entregue) · **Bloqueia:** S812-T1 · **Estimativa:** M · **Rota:** opus · ⚔ review antagonista

**Objetivo**
Dar ao índice uma chave confiável, gravando no vínculo o id da marca que o autocomplete
já conhece no instante da escolha.

**Arquivos (criar/editar)**
- `packages/core/src/clubs/parceria.ts` — campo `marcaId?` em `ParceriaPatrocinador`.
- `packages/core/src/clubs/desafio.ts` — o desafio já aponta para a parceria por
  `patrocinioId`; decidir e documentar se ele herda a chave da parceria em vez de guardar
  a própria (herdar é o default proposto, uma fonte só).
- `packages/core/src/eventos/kit.ts` — campo `marcaId?` ao lado do `marca` textual, que
  permanece para exibição e para item sem registro.
- `apps/painel/src/routes/**` — os pontos de criação e edição dos três vínculos passam a
  propagar o id que o autocomplete devolve.
- `firestore.rules` — o campo entra na validação de escrita dos vínculos.

**Passos de implementação**
1. Campo opcional nos três shapes do core, com o textual preservado. Opcional de
   propósito: documento legado continua válido, só não conta como ativação.
2. Telas de criação e edição passam a gravar o id vindo da seleção; digitar um nome livre
   que não existe no registro continua permitido e grava sem chave.
3. Migração dos legados: **nenhuma adivinhação automática**. A tela de ativações mostra os
   pendentes e oferece revincular um a um, com a marca escolhida por quem sabe.

**Regras de negócio a respeitar**
- RN-387 (chave gravada), RN-171 (registro reutilizável e autocomplete), RN-123 (modelo
  comercial), RN-400 (escopo por tenant).

**Testes a escrever**
- unit: parse dos três shapes com e sem `marcaId`; documento legado normaliza sem erro.
- integração: criar patrocínio pelo autocomplete grava a chave; digitar nome livre grava
  sem chave e não quebra.

**Definition of Done**
- [ ] Checklist padrão (DoD API/Function) e review antagonista, porque é mudança de
      modelo em documento que já existe em produção de teste.

**Fora de escopo**
Backfill automático por nome. Está proibido pela RN-387.

#### LEELA-S812-T1 · Function de índice inverso e agregado por gatilho
- **Tipo:** api/function · **Depende de:** S812-T0 · **Bloqueia:** S812-T2, S812-T3 · **Estimativa:** L · **Rota:** opus · ⚔ review antagonista

**Objetivo**
Manter `profissionais/{profId}/marcas/{marcaId}/ativacoes` e o agregado `qtdAtivacoes` a
partir dos três gatilhos, de forma idempotente.

**Arquivos (criar/editar)**
- `functions/src/brands/indexBrandActivations.ts` (novo).
- `packages/core/src/brands/activation.ts` (novo) — tipo `Ativacao` e normalização das
  três origens numa forma só.
- `firestore.rules` — leitura pelo dono, escrita só por Function.

**Passos de implementação**
1. Um docId **determinístico** por ativação, derivado da origem e do id do vínculo. Assim
   a idempotência nasce da chave, no mesmo padrão que o log de comunicação já usa, em vez
   de depender de leitura antes da escrita.
2. `onWrite` das três fontes: criação grava, remoção apaga, e a troca de marca num vínculo
   apaga da antiga e grava na nova, na mesma passagem.
3. `qtdAtivacoes` recomputado por contagem de escopo de coleção, no espelho do
   `agregarFinanceiro`, e não por incremento cego.
4. Resolver o `profId` dono pelo `tenantId` do documento de origem, nunca por parâmetro.

**Critérios de aceite (testáveis)**
- Reprocessar o mesmo vínculo duas vezes não duplica ativação nem conta duas vezes.
- Remover o vínculo remove a ativação e decrementa a contagem.
- Trocar a marca de um vínculo move a ativação, sem deixar a antiga para trás.
- Um vínculo de outro tenant nunca escreve no índice do profissional errado.

**Testes a escrever**
- integração no emulador para os quatro critérios acima, um a um.
- ataque de Rules: cliente tenta escrever em `ativacoes` e em `qtdAtivacoes` e falha nos
  dois.

#### LEELA-S812-T2 · Tela de ativações com abas por tipo
- **Tipo:** screen · **Depende de:** S812-T1 · **Estimativa:** M · **Rota:** opus

**Objetivo**
Mostrar onde a marca está ativa, separado por tipo, com estado vazio honesto.

**Arquivos (criar/editar)**
- `apps/painel/src/routes/marcas/**` — rota de ativações da marca.

**Critérios de aceite (testáveis)**
- Abas Desafios, Itens de kit e Eventos, todas no DOM (§2.7), com contador "mostrando X
  de Y" em cada uma.
- Marca sem nenhuma ativação mostra estado vazio com texto próprio.
- Vínculos legados sem chave aparecem numa faixa separada de pendências, com a ação de
  revincular, e **não** somam na contagem.

#### LEELA-S812-T3 · Exibir logo ao atleta por item patrocinado
- **Tipo:** screen · **Depende de:** S812-T2 · **Estimativa:** S · **Rota:** opus

**Objetivo**
Expor na aba de itens o toggle que grava `itensKit.exibirLogo`, campo que já existe no
modelo.

**Arquivos (editar)**
- `apps/painel/src/routes/marcas/**` e `firestore.rules`.

**Critérios de aceite (testáveis)**
- Desligar persiste `exibirLogo = false` e o atleta deixa de ver a logo (RN-214).
- Quem não é dono do item não consegue gravar, provado por Rules e não por interface.

#### LEELA-S812-T4 · Fechar as duas dívidas declaradas pela tela de marcas
- **Tipo:** screen · **Depende de:** S812-T1, S812-T2 · **Estimativa:** S · **Rota:** opus

**Objetivo**
Pagar o que o lote MARCAS-TELA registrou como omissão deliberada.

**Critérios de aceite (testáveis)**
- A lista de marcas passa a exibir `qtdAtivacoes`, vindo do índice, e omite quando o
  índice ainda não existe (RN-388).
- O `ConfirmModal` de exclusão troca o texto genérico pelas ativações realmente afetadas,
  mantendo a frase de que patrocínios já cadastrados são cópias independentes e
  permanecem intactos.

---

### Fila de código pronta · lane E10 (posição 3)

| # | Task | Território | Dep | Rota | ⚔ |
|---|---|---|---|---|---|
| 1 | `S812-T0` chave `marcaId` nos três vínculos | `packages/core`, `apps/painel/src/routes`, `firestore.rules` | — | opus | ⚔ |
| 2 | `S812-T1` índice inverso e agregado por gatilho | `functions/src/brands`, `packages/core/src/brands`, `firestore.rules` | 1 | opus | ⚔ |
| 3 | `S812-T2` tela de ativações com abas | `apps/painel/src/routes/marcas` | 2 | opus | — |
| 4 | `S812-T3` toggle de logo por item | `apps/painel/src/routes/marcas`, `firestore.rules` | 3 | opus | — |
| 5 | `S812-T4` contagem na lista e preview real da exclusão | `apps/painel/src/routes/marcas` | 2, 3 | opus | — |

**Serialização.** A fila é uma linha só, sem paralelismo interno: cada tarefa depende do
dado que a anterior grava. `firestore.rules` é tocado pela T0, T1 e T3, então o rebase
antes de cada aterrissagem é obrigatório enquanto outra lane estiver viva.

**Fronteira com o E03 e o E05.** A T0 toca o modelo de item de kit (E03) e o de parceria e
desafio (E05). São campos acrescentados, não alterados, mas o dono do modelo continua
sendo o épico de origem; o E10 é consumidor. Qualquer mudança de semântica nesses campos
volta para o épico dono.

### Critério de pronto da posição 3

- [ ] os quatro critérios de idempotência e remoção do T1 provados no emulador
- [ ] renomear uma marca não perde nenhuma ativação
- [ ] nenhum vínculo é casado por nome em lugar nenhum do código
- [ ] nenhum número da tela vem de varredura no cliente
- [ ] a exclusão continua honesta sobre cópias independentes
- [ ] review antagonista em contexto fresco em `S812-T0` e `S812-T1`

### Sem decisão aberta

Continua valendo o que o plano de 19/07 registrou: o Vitor não tem nada a decidir aqui.
A escolha de proibir o casamento por nome é técnica, com o modo de falha nomeado, e
segue a disciplina que a própria tela já adotou de não exibir número inventado.

---

## Nota de fronteira · o cadastro de marcas do admin geral é do E16 (SPECS-0728 · 2026-07-28)

A DEC-0728C pediu, "como administrador Leela", o cadastro de cupons de desconto e de
parceiros presenciais com endereço, descritivo de benefícios, capa, logo e fotos. O dono
**não** é este épico.

O ator é `platform_admin` e o dado atravessa tenants, então ele mora em coleção de
plataforma, com escrita exclusiva do dono da plataforma (RN-401, RN-404). Pendurar um
catálogo cross-tenant sob `profissionais/{profId}/marcas`, que tem Rules de dono único,
furaria a RN-400. Além disso, o emprego é outro: o E10 serve o organizador que vai sentar
com o patrocinador dele; o catálogo serve a comunidade da Leela.

A costura entre os dois é de forma, não de dado. O tipo `Marca` e o primitivo `Thumb` são
referência de componente; as coleções seguem **separadas, sem sincronização e sem chave
compartilhada**. Uma marca que seja patrocinadora de um organizador e parceira da Leela
existe duas vezes, de propósito, na mesma semântica de cópia independente que a exclusão de
marca já explica.

Spec completa em `LEELA-E16-plataforma-superadmin` §"Catálogo de benefícios da plataforma".
Prioridade baixa declarada pelo dono; não bloqueia nada deste épico.

## Delta Marcas vira Parcerias e reúne as três frentes (2026-08-11 · PARCERIAS-NAV · D-1008-R17)

Decisão do dono, na íntegra: *"vejo que Marcas no Menu principal pode alterar para 'Parcerias'
onde incluimos tanto marcas quanto assessorias parceiras. faz mas sentido do que deixar em
clubs."* No mesmo ato, o adendo: *"o mesmo se aplica para minhas afiliações e influenciadores."*
Registro em `02-rodadas/2026-08-09-redesign-ds/01-decisoes-dono-1008-retomada.md`.

O que muda de fronteira: a área de clubs fica com o que é comunidade; **Parcerias** concentra
quem é parceiro de negócio. O épico segue sendo este; os conteúdos de assessoria parceira (E18) e
de afiliação (E08) passam a morar numa área que este épico governa, sem que as regras deles
mudem.

**Aberto para o dono:** o nome do épico. Ele continua se chamando "Marcas" nos arquivos enquanto
a área na tela já se chama "Parcerias". Renomear o épico é gesto de arquivo, não de produto, e
fica esperando a palavra dele.

### S813 · a área Parcerias reúne marcas, assessorias e afiliações

| Tarefa | Estado | Prova |
|---|---|---|
| S813-T1 · o item do menu principal passa a se chamar Parcerias, no mesmo lugar | 🔄 | lane PARCERIAS-NAV |
| S813-T2 · a área nasce com três abas: marcas, assessorias parceiras e afiliações | 🔄 | mesma moldura das outras áreas do painel |
| S813-T3 · as telas mudam de endereço, e o endereço antigo continua funcionando | 🔄 | link salvo não pode morrer |
| S813-T4 · a área de clubs devolve as abas que não são de comunidade | 🔄 | sobram clubs e engajamento |

**Cuidado que a lane registrou:** "marca" como conceito não muda de nome em lugar nenhum — o
título da tela de marcas, o número de marcas ativadas nos kits e o que o código chama de marca
seguem iguais. O que troca de nome é a **área**.
