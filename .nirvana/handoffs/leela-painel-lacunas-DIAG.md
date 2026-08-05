# DIAG-PAINEL-LACUNAS — modalidades, lotes e o kit que não se vincula a lote

Trace `leela-pixreal-diag-20260804` · lane `DIAG-PAINEL-LACUNAS` · employee `sf-frontend-lead`
Commit `3fdfb6f5` (pushed) · **sem deploy** — o maestro sequencia.

---

## As duas perguntas do dono

> "Aonde eu configuro as modalidades e seus respectivos lotes? O CTA de 'Nova modalidade' não
> está aparente em nenhuma rota. Também estamos sem opções no painel profissional de vincular
> um kit a um lote."

---

## Frente 1 · modalidades e seus lotes — **EXISTE PELA METADE**

**Os lotes existem e são alcançáveis. As modalidades não têm edição nenhuma depois da criação.**

### O caminho que funciona hoje (lotes)

`/eventos/{slug}/lotes` — aba **Lotes** da sub-nav do evento, quarta posição, sem gate de papel.

| O quê | Onde |
|---|---|
| A aba na sub-nav | `apps/painel/src/routes/eventos/_lib/subnav.ts:36` |
| A rota | `apps/painel/src/routes/eventos/EventosRoutes.tsx` (`<Route path="lotes" element={<LotesPage />} />`) |
| O CTA **"Novo lote"**, um por modalidade | `apps/painel/src/routes/eventos/lotes/LotesView.tsx:205-208` |
| Editar / Capacidade / Desativar / Remover por lote | `LotesView.tsx:218-256` |

A tela agrupa por modalidade, mostra preço vigente e lote ativo derivados do kernel, e o botão
"Novo lote" fica no cabeçalho de **cada** bloco de modalidade. Não há botão global — quem tem
uma modalidade só vê um botão só, e ele fica ao lado do nome dela.

### O caminho que NÃO existe (modalidade)

`evento.modalidades[]` é escrito **uma única vez**, na criação:

| Etapa | Evidência |
|---|---|
| Nasce no formulário de criação | `apps/painel/src/routes/eventos/novo/EventoForm.tsx:355-403` — sugestões 5k/10k/21k/42k + entrada livre |
| Obrigatório, mínimo 1 | `apps/painel/src/routes/eventos/novo/validacao.ts:77-79` |
| Persistido pela Function | `functions/src/eventos/criarEvento.ts` |
| **Não** entra no contrato de update | `packages/api-client/src/eventos/configuracoesEvento.ts:13-15` e `:53-69` — o comentário é explícito: "NÃO envia `percursos`/`modalidades`" |
| Nenhuma outra escrita em todo o api-client | varredura de `modalidades` em `packages/api-client/src`: só leitura, o create, e o filtro do kit |

Não está escondido por papel (a rota `lotes` não tem `RequirePapel`), nem por status do evento
(rascunho e publicado renderizam igual), nem por feature flag (não há nenhuma no painel para
isto). **Simplesmente não foi construído.**

### O defeito de afordância que estava por cima disso: um círculo fechado

As duas telas apontavam uma para a outra, e nenhuma das duas fazia o que prometia:

- `LotesView.tsx:81-84` (antes): *"Cadastre os percursos (5k, 10k, 21k…) **na edição do evento**"*
  — essa edição não existe.
- `ConfigGeraisForm.tsx:288-289` (antes): *"Data e percursos são editados na criação do evento
  **e nos lotes**"* — a tela de Lotes não cria modalidade.

O organizador que seguisse qualquer uma das duas frases voltava para a outra. **Consertado**
(ver abaixo): os dois textos passam a contar o estado real.

### O que a Rule permitiria (e por que isso importa para a decisão)

`firestore.rules:557-560` (`percursosEditaveis`) **autoriza** o cliente a alterar
`modalidades`/`percursos` enquanto `qtdInscritos == 0`. A trava é do produto, não do servidor:
falta o contrato no api-client e falta a tela. Isso barateia muito a decisão que devolvo abaixo.

---

## Frente 2 · vincular kit a lote — **NÃO EXISTE, e não é lacuna de tela**

**O modelo não tem essa relação. O kit se vincula à MODALIDADE.**

| Fato | Evidência |
|---|---|
| `Kit` tem `modalidades: string[]` e **nenhum** campo de lote | `packages/core/src/eventos/kit.ts:85` (o arquivo inteiro não menciona lote) |
| `Lote` tem `modalidade: string` e **nenhum** campo de kit | `packages/core/src/eventos/lote.ts` (ADR-012: "o lote pertence à modalidade") |
| O checkout filtra kit por modalidade, nunca por lote | `apps/landing/app/(public)/[eventSlug]/inscricao/checkout/tipos.ts:86` — `kits.filter((k) => k.modalidades.includes(modalidade))` |
| As Rules validam `modalidades is list` no kit; não há campo de lote | `firestore.rules:964` |

**O vínculo que existe está ligado e visível:**

- Tela: `/eventos/{slug}/kits/novo` e `/eventos/{slug}/kits/editar/{kitId}`
- Seção "Modalidades" com chips removíveis + `Select` das modalidades do evento —
  `apps/painel/src/routes/eventos/kits/KitEditor.tsx:346-381`
- Entrada pela lista: "+ Adicionar kit" em `KitsCadastroView.tsx:70`; "Editar" por card em
  `KitsCadastroView.tsx:151-153`; o card já exibe as modalidades do kit (`:143-148`)

A separação é deliberada e coerente: **o lote é degrau de preço da inscrição dentro de uma
modalidade; o kit é oferta paralela** (delta sobre o preço, aceita negativo — RN-211). Um kit
que valesse só no Lote 1 e sumisse no Lote 2 é produto novo, não conserto.

O que **faltava** era a tela dizer isso. Consertado.

---

## O que consertei (commit `3fdfb6f5`, 7 arquivos, todos em `apps/painel/**`)

### 1. O alerta crítico agora leva ao lugar que ele nomeia

`_lib/alertas.ts` — o alerta `vitrine-nao-vende` dizia *"Configure os lotes para abrir as
inscrições"* e parava ali. A rota existia; a frase obrigava o organizador a adivinhar a aba.
Agora o alerta carrega `acao: { label, href }` e `OverviewDashboard.tsx` renderiza um botão
**"Configurar lotes"** → `/eventos/{slug}/lotes`. `Link` do router, não `<a>` cru (a casca do
evento é SPA — mesmo motivo do `navSpa` do `EventoShell`).

Vale para os quatro casos que os lotes de fato resolvem: `sem_preco` com modalidades,
`esgotado`, `lotes_encerrados` e o aviso `modalidade-sem-preco`.

`derivaAlertas` passou a exigir `slug` no recorte do evento.

### 2. Bug provado: `undefined` na tela do organizador

Evento com **zero** modalidades cai em `motivo: 'sem_preco'` com `modalidadesSemPreco: []`
(0 sem preço de 0 modalidades — `diagnosticoVitrine`, `packages/core/src/eventos/vitrine.ts:206`).
`listarModalidades([])` fazia `nomes[-1]` e a mensagem saía literalmente:

> "A página pública está no ar mas NÃO vende: As modalidades  e **undefined** estão sem preço."

Não é hipotético: doc que não parseia vira `eventoDegradado`
(`packages/api-client/src/eventos/queries.ts:186`), que devolve `modalidades: []`.
Agora tem frase própria — *"este evento não tem nenhuma modalidade cadastrada, e sem modalidade
não há lote nem preço para vender"* — e ela **não** oferece o caminho dos lotes, porque lá não
haveria o que fazer (o lote exige uma modalidade existente; `firestore.rules:1069-1075`).

### 3. O círculo fechado virou texto honesto

- `LotesView.tsx` — EmptyState de zero modalidades: *"As modalidades (5k, 10k, 21k…) são
  definidas quando o evento é criado, e o painel ainda não edita essa lista. Sem modalidade não
  há lote para configurar."* Mais uma linha no cabeçalho da tela dizendo que ali se configuram
  os **lotes** de cada modalidade, não a lista de modalidades.
- `ConfigGeraisForm.tsx` — *"Data e modalidades são definidas na criação do evento; o preço de
  cada modalidade vive na aba Lotes. Esta lista não é editável depois de criado o evento."*

### 4. O editor de kit diz onde o vínculo mora

`KitEditor.tsx`, seção Modalidades: *"O kit é oferecido por modalidade e vale em todos os lotes
dela. Kit não se vincula a lote: o lote define o preço da inscrição naquele momento da venda."*

---

## O que devolvo como DECISÃO DE PRODUTO (não construí)

### D-1 · editar a lista de modalidades de um evento já criado

**Hoje não existe em lugar nenhum.** Quem errou uma modalidade na criação, ou quer acrescentar
um percurso depois, não tem caminho — nem "Nova modalidade", nem renomear, nem remover.

- **O que fica com o dono:** decidir se o painel passa a editar essa lista, e sob qual trava.
- **Por que é barato:** `firestore.rules:557-560` **já autoriza** enquanto o evento não vendeu
  (`qtdInscritos == 0`). Falta um campo opcional em `AtualizarConfiguracoesEventoInput`
  (`packages/api-client/src/eventos/configuracoesEvento.ts:53`) e a seção na tela de
  Configurações gerais — o mesmo componente de chips que a criação já usa.
- **Por que não fiz:** o contrato de escrita vive em `packages/api-client`, fora do território
  desta lane, e ligar o CTA sem ele seria botão que não salva.
- **Opções:** (a) editar livre enquanto `qtdInscritos == 0`, congelando após a 1ª venda — é
  exatamente o que a Rule já faz, custo mínimo, e resolve o caso do dono; (b) permitir só
  **acrescentar** modalidade a qualquer momento (remover/renomear orfanaria lotes e inscritos);
  (c) manter como está e assumir que modalidade errada = evento refeito.
- **Onde aterrissa:** `configuracoesEvento.ts` + `ConfigGeraisForm.tsx` + a dica que acabei de
  reescrever nas duas telas.

### D-2 · kit por lote

**O modelo não suporta e a fronteira é deliberada.** Kit é oferta por modalidade; lote é degrau
de preço. Se o dono quiser "kit só no Lote 1", isso é entidade nova (ou `Kit.lotes[]`), com
efeito em checkout, estoque e Rules. Não é conserto de tela — é decisão de produto, e recomendo
perguntar antes qual é o job por trás ("kit promocional para quem compra cedo" tem resposta mais
barata: **preço** de kit já aceita negativo, RN-211).

---

## Não é meu escopo (confirmado)

O painel contando 2 inscritos com 1 pago é **spec de hoje (RN-486/487), não construída** — o
maestro já respondeu isso ao dono. Nada nesta lane toca contagem.

---

## Gates

```
tsc --noEmit ........................ 0 erros
eslint --max-warnings 0 (7 arquivos)  0
vitest src/routes/eventos ........... 851 passed / 80 files / 0 failed
  (dos quais, arquivos tocados + vizinhança, execução dirigida: 160 passed / 16 files)
```

Nenhum `packages/core`, `packages/api-client`, `functions/**`, `firestore.rules`,
`storage.rules`, `apps/landing`, `packages/design-system` ou `leela-specs/` tocado.
`storageRules.integration.test.ts` está modificado na árvore por **outra lane** (DIAG-STORAGE-CAPA)
— ficou fora do commit por `--only`.

---

## Conferência visual do dono (depois do deploy — 5 itens)

O painel **não foi deployado** nesta rodada; o que está no ar é código anterior a estes
consertos e aos da rodada de hoje (menu secundário, capacidade, erro por campo).

1. **`/eventos/{slug}` de um evento publicado que não vende** — o alerta vermelho agora tem o
   botão **"Configurar lotes"** à direita, ao lado do selo "Atenção". Clicar deve abrir a aba
   Lotes **sem recarregar a página**.
2. **`/eventos/{slug}/lotes`** — o texto de apoio no topo agora diz que as modalidades vêm da
   criação do evento e que ali se configuram os lotes de cada uma. Conferir que o **"Novo lote"**
   aparece no cabeçalho de **cada** bloco de modalidade (é o CTA que existe; "Nova modalidade"
   continua não existindo — é a decisão D-1).
3. **`/eventos/{slug}/configuracoes`** — o bloco "Data e modalidades" não manda mais para os
   lotes editarem a lista; diz que ela não é editável depois de criado o evento.
4. **`/eventos/{slug}/kits/editar/{kitId}`** — a seção Modalidades ganhou a linha explicando que
   o kit vale em todos os lotes da modalidade e que kit não se vincula a lote.
5. **Contraste AA nos dois temas** no botão novo dentro do alerta crítico (`secondary` sobre
   `surface-raised` com a borda esquerda de perigo) — é o único elemento visual novo da lane.
