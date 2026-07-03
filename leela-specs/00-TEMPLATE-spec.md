# Template de Spec · formato canônico para execução por IA (Fable 5)

> Todo épico e toda task seguem este molde. O objetivo é que cada task seja **autocontida**: o Fable 5 consegue executá-la sem precisar reconstruir contexto. Especificidade > brevidade.

---

## Princípios (por que este formato)

1. **Uma task = uma unidade de PR** (1 tela/componente/Function/módulo). Herdado de §2.11/§2.13.
2. **Critérios de aceite testáveis** em Given/When/Then — viram testes.
3. **Arquivos explícitos** — a task lista os paths que cria/edita no monorepo.
4. **Referências, não repetição** — aponta para RN-###, telas do protótipo, mocks canônicos (HANDOFF-05) e modelo de dados; não redescreve.
5. **Determinístico** — sem "etc.", sem "similar a X". Lista completa.
6. **Rastreável** — todo item liga a um RF/RN/story existente.

---

## Estrutura de um arquivo de ÉPICO (`epics/LEELA-E##-nome.md`)

```markdown
# LEELA-E## · [Nome do épico]

- **Superfície:** Painel | Landing | Mobile | Todas
- **Horizonte:** H1 | H2 | H3
- **MoSCoW:** Must | Should | Could | Won't
- **Estimativa:** XS/S/M/L/XL
- **Status:** ✅ | 🔄 | 📋 | 🧊 | 🚫
- **Depende de:** [LEELA-E##, ...]
- **De-para:** BH-E## (rastreabilidade com backlog anterior)

## Objetivo
[1-2 parágrafos: o valor que o épico entrega e para quem.]

## Personas & JTBD
[Personas servidas + jobs-to-be-done atendidos.]

## Critérios de sucesso do épico
[Resultados observáveis que provam o épico pronto.]

## Regras de negócio aplicáveis
[Lista de RN-### relevantes, com 1 linha cada.]

## Modelo de dados tocado
[Entidades/coleções Firestore afetadas — link para modelo-de-dados-firestore.md.]

## Fora de escopo (Won't nesta fase)
[Explícito.]

## User stories
[Lista de stories LEELA-S### — cada uma no formato abaixo. Tasks vêm dentro de cada story.]
```

---

## Estrutura de uma USER STORY

```markdown
### LEELA-S### · [Título] · (de-para BH-###)

**Como** [persona], **quero** [ação], **para** [benefício].

- **MoSCoW:** Must | Should | Could
- **Estimativa:** S/M/L
- **Superfície:** Painel | Landing | Mobile
- **Tela(s) de referência:** [arquivo.html do protótipo em WEB-APPV2 (1)/]
- **RNs:** RN-###, RN-###

**Critérios de aceite (Given/When/Then):**
- **Dado** [contexto], **quando** [ação], **então** [resultado observável].
- [Cobrir caminho feliz + estados: vazio, erro, validação, limite.]

**Tasks:** [lista de LEELA-S###-T# abaixo]
```

---

## Estrutura de uma TASK AI-ready (a unidade que o Fable 5 executa)

```markdown
#### LEELA-S###-T# · [Título curto e imperativo]

- **Tipo:** setup | ui-component | screen | api/function | data-model | integration | test | refactor
- **Depende de:** [task IDs] · **Bloqueia:** [task IDs]
- **Estimativa:** XS/S/M

**Objetivo**
[1-2 frases: o que esta task entrega, sem ambiguidade.]

**Contexto & referências**
- Tela protótipo: `WEB-APPV2 (1)/[Arquivo].html`
- RNs: RN-###
- Mocks canônicos: [entidades de HANDOFF-05 a reusar — ex: Corrida Perfeita Sul, código 8A3K9]
- Componentes DS: [Button, Table densa §2.5, ConfirmModal §2.15, ...]

**Arquivos (criar/editar)**
- `apps/painel/app/(...)/page.tsx` — [o quê]
- `packages/core/src/[dominio]/[x].ts` — [o quê]
- `functions/src/[x].ts` — [o quê, se houver]
- `packages/design-system/...` — [se tocar componente]

**Passos de implementação**
1. [passo concreto]
2. [passo concreto]
3. [passo concreto]

**Modelo de dados / contratos**
- Coleção/doc Firestore tocado: `[colecao]/{id}` — campos [...]
- Tipos: `type X = {...}` em `packages/core`
- Function/endpoint: `nome(input) -> output` (se aplicável)

**Regras de negócio a respeitar**
- RN-### — [comportamento exato]

**Critérios de aceite (testáveis)**
- **Dado** ... **quando** ... **então** ...

**Testes a escrever**
- unit: [o quê, em `packages/core` ou componente]
- integração: [Firestore rules / Function]
- e2e: [fluxo, se crítico]

**Definition of Done**
- [ ] Critérios de aceite passam
- [ ] Testes escritos e verdes
- [ ] Sem borda decorativa em cards (§2.16); tokens do DS (nada hardcoded)
- [ ] Estados vazio/erro/carregando cobertos (§2.12)
- [ ] Acessibilidade AA (foco, labels, contraste)
- [ ] Sem `localStorage` para estado de domínio; sem segredo no cliente
- [ ] Lint + type-check limpos
- [ ] (ver `definition-of-done.md` para a lista completa)

**Fora de escopo**
[Explícito, o que NÃO fazer aqui.]
```

---

## Exemplo preenchido (mini)

```markdown
#### LEELA-S103-T2 · Tabela de membros com busca e filtros

- **Tipo:** screen · **Depende de:** T1 (rota + layout), E01-T(Table) · **Estimativa:** M

**Objetivo**
Renderizar a tabela densa de membros do clube com busca em tempo real e filtros combináveis por status e papel.

**Contexto & referências**
- Tela: `WEB-APPV2 (1)/Club-Membros.html`
- RNs: RN-005 (tabela densa), RN-102 (status ativo/novo/inativo), RN-103 (papéis)
- Mocks: Corrida Perfeita Sul, 120 membros (12 base: Felipe Martins, Camila Ramos, ...)
- DS: Table (variante densa §2.5), Chip de filtro, EmptyState, Popover de ações

**Arquivos**
- `apps/painel/app/clubs/[slug]/membros/page.tsx`
- `packages/core/src/clubs/membro.ts` (tipo Membro + derivação de status)

**Passos**
1. Query `clubs/{clubId}/members` (paginada).
2. Derivar `status` (computado: novo <7d, inativo 30d+) em `core`.
3. Busca client-side + filtros chip combináveis (status × papel).
4. EmptyState quando filtro não casa; contador "mostrando X de Y".
5. Popover por linha: ver / promover / transferir / remover (remover = §2.15).

**Critérios de aceite**
- Dado 120 membros, quando busco "Camila", então só linhas que casam aparecem e o contador atualiza.
- Dado filtro "inativo", quando nenhum casa, então EmptyState "Nenhum membro encontrado com os filtros aplicados".

**Testes**
- unit: derivação de `status` por data (core).
- e2e: busca + filtro combinado atualiza contador.

**DoD:** ver checklist padrão.
```

---

## Convenções que toda task herda

- **Design:** tokens do `packages/design-system`; §2.16 (flat), §2.14 (sub-nav), §2.5 (tabela densa). Nada de valor hardcoded.
- **Interatividade (§2.12):** estados vazio/erro/carregando sempre; feedback via Toast.
- **Ações destrutivas (§2.15):** `ConfirmModal` com preview de consequências (perde/mantém).
- **Nomenclatura:** "kit" nunca "tier" (RN-216). Copy exata vem do glossário (HANDOFF-07).
- **Dados:** agregados (conversões, alcance, pontos) são mantidos por Cloud Function, nunca calculados ad-hoc no cliente (ver modelo de dados).
- **Segurança:** Firestore Security Rules por task que cria coleção; nunca confiar no cliente.

---

*Fim do template.*
