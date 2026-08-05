# REV-LOTES — review antagonista da BUILD-LOTES-UX

**Lane:** REV-LOTES (contexto fresco) · **Papel:** sf-qa-engineer (antagonista, software-forge)
**Trace:** `leela-pixreal-diag-20260804` · **Data:** 2026-08-05
**Sob review:** `fd6e5e69` (SubNav) · `41ac6bbb` (loteForm) · `d4ce8d12` (LoteModal/LotesView/LotesPage) · `1357163a` (guard do menu do evento)

## Veredito

**APROVADO COM CORREÇÕES APLICADAS.** Quatro das seis frentes passaram o ataque
sem defeito (B, C, E-parcial, F-conserto). Três defeitos reais foram achados e
corrigidos nesta lane, um deles no coração do pedido do dono. Um quarto defeito
é real e fica REGISTRADO SEM FIX por estar fora do território (`functions/`).

O que o construtor afirmou e se sustentou:
- a causa-raiz da frente A era **endereço**, não validação — confirmado;
- a frente B nomeia o lote certo, com a janela certa, no fuso certo;
- a frente C não abriu nada além do autorizado (a Rule segue intocada);
- a cascata da frente F está descrita corretamente e o conserto ataca a causa.

O que não se sustentou: a frente D **não entregava o caso verbatim do dono na
tela onde ele acontece**, e o teste que dizia prová-lo montava um estado que o
produto não alcança.

## Defeitos

| # | Sev | Frente | Defeito | Fix |
|---|-----|--------|---------|-----|
| 1 | **ALTA** | D | O caso verbatim do dono (50→20 com 19 vendidos ⇒ 1) não acontecia na única tela onde a vaga de lote vendido é editável. No `LoteModal` a prévia viva foi ligada num campo que fica `disabled` exatamente quando `vendidos > 0`; no `CapacidadeModal` — a porta real (RN-304) — o painel lia só o valor GRAVADO e seguia mostrando **31 disponíveis** enquanto o dono digitava 20. O número da reclamação continuava na tela. | `CapacidadeModal.tsx` + testes |
| 2 | MÉDIA | A | Erro do SERVIDOR não ganhou endereço nenhum: `catch {}` cego descartava a causa e mostrava "Falha ao salvar o lote". Recusa de Rule (congelamento pós-venda, modalidade inexistente, sem permissão) chegava muda ao dono — a mesma queixa dele, noutro caminho. | `loteForm.ts` + `LoteModal.tsx` + testes |
| 3 | MÉDIA | F | A trava de regressão tinha um buraco: `cn` é `twMerge` e resolve conflito pelo ÚLTIMO da lista. Com a trava ANTES do `className`, um consumidor passando `overflow-y-auto` apagava `overflow-y-hidden` em silêncio e **a suíte seguia verde** (o teste renderiza sem `className`). Numa reincidência de 2ª vez, o caminho mais provável de volta estava descoberto. | `SubNav.tsx` + testes |
| 4 | MÉDIA-ALTA | E | **Sem fix — fora do território.** PIX em voo fura a desativação: a cobrança já criada carrega `pedido.itens[].loteId`; o `webhookPagamento` vira o inscrito para `confirmado` sem revalidar lote nem capacidade; o `virarLote` recomputa `vendidos = max(atual, tally)` sem teto. Resultado: `vendidos` passa de `quantidadeLimite` e o painel exibe "20 vendidos · 0 disponíveis · 19 no total", sem aviso. | registrado abaixo |

### Correção exata do #4 (para a lane dona de `functions/`)

O ingresso pago não deve ser recusado (isso seria dinheiro tomado sem entrega),
então a correção NÃO é bloquear o webhook. Duas peças:

1. `functions/src/eventos/virarLote.ts` — expor no `ResultadoVirarLote` os lotes
   em que `vendidos > quantidadeLimite` (excedente por venda em voo) e logar
   `lote_excedido` com `{eventoId, loteId, vendidos, quantidadeLimite}`. Hoje o
   estouro é silencioso.
2. `apps/painel` (território desta lane, mas depende do dado acima para ser
   honesto) — quando `vendido > configurado`, a `ContagemVagas` e a coluna de
   vagas da `LotesView` precisam dizer "N acima do configurado" em vez de exibir
   `0 disponíveis` como se estivesse tudo certo.

Alternativa mais forte, se o dono da regra quiser fechar de vez: reserva de vaga
no `createInscricaoCharge` (contador de pendentes por lote, expirando junto com
o PIX). É mudança de modelo — decisão do dono da RN, não desta lane.

## Ataque por item

### 1. Causa-raiz da frente A — CONFIRMADA, com um buraco

O construtor está certo: a validação devolvia UMA string e o `LoteModal`
pendurava no `errorMessage` do input de PREÇO. Agora `validarFormLote` devolve
`ErroLote[]` ordenado por `ORDEM_CAMPOS_LOTE`.

- **Dois/três campos pendentes ao mesmo tempo:** todas as pendências são
  coletadas na MESMA passada (uma por campo) e o foco vai para a primeira. ✓
- **Ordem visual vs ordem do objeto:** `ORDEM_CAMPOS_LOTE` = nome, ordem, vaga,
  início, fim, preço. Confere com o DOM do `LoteModal` (nome → grid[ordem,vaga]
  → grid[início,fim] → preço), inclusive em `grid-cols-1` no celular. O foco vai
  para o primeiro **na ordem visual**. ✓ `pesoDoAlvo` joga `formulario` sempre
  para o fim, e o `sort` é estável. ✓
- **Foco em campo de data:** `DateTimeField` passa o `id` ao `DatePicker`, que o
  entrega ao `PopoverTrigger` (um `button`) — `getElementById(...).focus()`
  funciona. ✓
- **Campo com máscara de moeda:** o input de preço é `type="text"` +
  `inputMode="decimal"`, SEM máscara. O erro acerta o endereço. ✓ Mas ver
  achado LOW-2 abaixo: `parsePrecoReais` corrompe separador de milhar.
- **Erro do servidor:** ✗ → **defeito #2, corrigido.**

### 2. Aritmética da capacidade (frente D)

| Vetor | Esperado | Antes do fix | Depois |
|-------|----------|--------------|--------|
| total 20, vendidos 19 (CapacidadeModal) | 1 disponível | **31** ✗ | 1 ✓ |
| total 20, vendidos 19 (LoteModal) | — | campo `disabled`, inalcançável | idem (correto: a porta é RN-304) |
| total < vendidos | recusar | recusado, botão fechado, limite à mostra ✓ | ✓ |
| total == vendidos | 0 disponível, aceito | aceito ✓ | prévia mostra 0 ✓ |
| total negativo digitado | nunca negativo | cai no gravado ✓ | ✓ + salvar bloqueado |
| campo vazio / meio-digitado | não piscar | painel estático ✓ | cai no gravado ✓ |
| venda entre leitura e salvamento | fail-closed | `validarAjusteCapacidade` no callable recusa; toast genérico; repetir resolve — LOW |
| estorno conta como venda? | sim | `STATUS_QUE_CONTAM_VENDA = ['confirmado','estornado']` — a UI nunca recomputa, lê o `vendidos` da Function ✓ |

`capacidadeDoLote` clampa `disponivel` em `Math.max(0, …)`; nenhum caminho de
tela exibe negativo. ✓

### 3. Desativar (frente E)

- **Interrompe a venda de fato?** Sim. Via capacidade → `loteEsgotado` →
  `loteEncerrado` → `loteAtivo` pula o lote → `computeSaleState` fecha ou passa
  ao próximo. Via janela → `agora ≥ fimEm`, mesmo efeito. Não é cosmético. ✓
- **Ingresso já vendido continua válido?** Sim. Nenhum dos dois caminhos escreve
  em `inscritos`; as Rules garantem `vendidosIntocado`/`viradaIntocada`. ✓
- **Reversível?** Sim, nos dois. O carimbo `encerradoEm` NÃO é apagado
  (monotônico por decisão), mas a UI decide pelo DERIVADO
  (`estadoLoteBadge` → `loteAtivo`/`loteEsgotado`/`loteEncerrado`), então subir a
  capacidade ou pôr um fim novo reabre de verdade. ✓
- **Lote agendado:** `loteDesativavel` exige `agora > inicioEm` sem venda, e o
  botão nasce `disabled`. Se escapasse, a Rule barraria (`shapeLoteValido` exige
  `fimEm > inicioEm`). Duas camadas. ✓
- **Copy do ConfirmModal:** "se houver lote seguinte, ele assume" é verdade —
  `loteAtivo` faz hand-off pelo antecessor encerrado mesmo com a janela do
  próximo ainda fechada. ✓
- **PIX em voo:** ✗ → **defeito #4, registrado sem fix.**

### 4. Janela na mensagem (frente B) — PASSOU

Provado com vetor de dois conflitos (L1 jan, L2 fev, novo L3 digitado dentro de
jan):

- nomeia `"Promocional" (L1)` com a vigência por extenso, campo `inicioEm`; ✓
- `formatDataHoraCurta` pina `FUSO_EVENTO = America/Sao_Paulo`, e o rótulo
  "(horário de Brasília)" bate — organizador em Manaus vê a hora do produto; ✓
- sem vazamento: os irmãos são do MESMO evento e da MESMA modalidade, já
  visíveis na tabela atrás do modal, sob a mesma permissão de leitura. ✓
- **com mais de um conflito** a mensagem nomeia o primeiro do array e o conselho
  ("comece depois do fim dele") não resolve de primeira — mas a segunda tentativa
  devolve uma mensagem nova, correta, nomeando L2. Correção iterativa e sempre
  verdadeira. **Limitação aceita, não defeito.**

Limitação registrada: sobreposição PRÉ-EXISTENTE entre dois irmãos trava a
criação de qualquer lote novo com a mensagem genérica do kernel (o
`conflitoDeJanela` devolve `null` porque a janela projetada não é a culpada).
Comportamento anterior à lane; fica como dívida.

### 5. Barra de rolagem (frente F) — a trava foi falsificada

Experimento executado (não é leitura de código):

| Vetor | Trava antes | Trava depois |
|-------|-------------|--------------|
| remover `overflow-y-hidden` do fonte | **VERMELHA** ✓ (1 fail / 19) | vermelha ✓ |
| remover `[scrollbar-width:none]` do fonte | **VERMELHA** ✓ (1 fail / 19) | vermelha ✓ |
| consumidor com `className="overflow-y-auto"` | **VERDE** ✗ (buraco) | vermelha ✓ |
| consumidor com `className="overflow-auto"` | **VERDE** ✗ | vermelha ✓ |
| consumidor com `className="[scrollbar-width:auto]"` | **VERDE** ✗ | vermelha ✓ |
| consumidor com `className="overflow-x-hidden"` | **VERDE** ✗ | vermelha ✓ |

Prova do mecanismo (twMerge real, não suposição):

```
twMerge('… overflow-y-hidden', 'overflow-y-auto')       → overflow-y-auto
twMerge('… [scrollbar-width:none]', '[scrollbar-width:auto]') → [scrollbar-width:auto]
```

Fix: a trava passou para DEPOIS do `className` no `cn`, então vence qualquer
override. Cor, fundo, padding e borda seguem sobrescrevíveis (grupos distintos —
coberto por teste). Com a ordem antiga, os 4 testes novos ficam vermelhos —
verificado.

**320 / 768 / 1024 sem cortar conteúdo:** jsdom não faz layout, então isto NÃO
foi provado por teste e vai para a lista de conferência visual do dono. O que dá
para afirmar por construção: `overflow-x` continua `auto` (as abas que não cabem
seguem alcançáveis por gesto, trackpad e pelas setas ←/→), e a lista tem a altura
exata do nav, então `overflow-y-hidden` não tem o que cortar.

### 6. Delta de RN (frente C) — LIMPO

- `firestore.rules` **intocada** pelos quatro commits (verificado por
  `--name-only`). ✓
- Quantidade: NÃO foi aberta no formulário — o input segue `disabled={congelado}`.
  O que entrou foi um ATALHO para a porta auditada (`ajustarCapacidadeLote`,
  RN-304, com motivo na trilha). ✓
- Datas: seguem congeladas. ✓
- A Rule congela 6 campos (`preco, inicioEm, fimEm, quantidadeLimite, ordem,
  modalidade`) via `loteComercialImutavelSeVendido`. A RN-200 canônica (só o
  preço trava) segue sendo a regra escrita, e a extensão continua vivendo só na
  Rule — o `MSG_LOTE_VENDIDO` diz isso ao dono com todas as letras, inclusive que
  a mudança aguarda selo. Honestidade de estado preservada. ✓

## Achados LOW (sem fix)

- **LOW-1 — `CAMPOS_CONGELADOS_APOS_VENDA` é export morto.** Declarado em
  `loteForm.ts` como "espelho" da Rule e **nunca usado**. Espelho que ninguém
  consulta diverge em silêncio.
- **LOW-2 — `parsePrecoReais` engole separador de milhar (pré-existente).**
  `'1.234,56'` → `replace(',', '.')` troca só a PRIMEIRA vírgula → `'1.234.56'`
  → `parseFloat` → **1.23**. Um lote de R$ 1.234,56 vira R$ 1,23 sem erro. Vale
  para o editor de kit também (mesma convenção). Não é desta lane, mas é dinheiro.
- **LOW-3 — `DateTimeField` sem `aria-invalid`/`aria-describedby`.** O comentário
  do `LoteModal` afirma que vêm do primitivo `Input` do DS; é verdade para
  nome/ordem/vaga/preço e **falso** para início/fim, que renderizam um
  `<span role="alert">` solto. É justamente onde a mensagem nova da frente B
  aterrissa. O fix pede um prop novo no `DatePicker` do DS — fora do território
  desta lane (só `SubNav` liberado).
- **LOW-4 — `LoteModal` reseta o formulário se `lotesDoEvento` mudar de
  identidade.** `useEffect(..., [open, lote, modalidade, lotesDoEvento])`.
  Mitigado na prática por `refetchOnWindowFocus: false` + `staleTime` 30s +
  structural sharing do TanStack Query. Pré-existente (já estava em `41ac6bbb`).
- **LOW-5 — desativação por capacidade com `vendidos` velho.** Se uma venda
  confirma entre a leitura e o clique, o callable recusa (fail-closed) e o toast
  sugere "tente de novo" — que resolve. Sem perda, só atrito.

## Território e gates

Fix aplicado só em `apps/painel/**` e `packages/design-system/src/components/SubNav/**`.
`apps/landing`, `functions/`, `firestore.rules` e `leela-specs/` **intocados**.

| Gate | Base | Resultado |
|------|------|-----------|
| `tsc --noEmit` painel | 0 | **0** ✓ |
| `tsc --noEmit` DS | 0 | **0** ✓ |
| `eslint --max-warnings 0` painel | 0 | **0** ✓ |
| `eslint --max-warnings 0` DS (`src/components/SubNav`) | 0 | **0** ✓ |
| vizinhança `src/routes/eventos` | 809 / 80 arquivos | **816 / 80** ✓ (+7) |
| `SubNav` do DS | 19 | **24** ✓ (19 + 5 novos) |

`tsup` do DS rodado ANTES da suíte do painel, nunca em paralelo. Sem
`--singleFork`. Sem `--amend`, sem `stash`, sem `push`. Commits com `--only`.

**Vermelho que NÃO é meu:** `eslint` do DS acusa
`src/components/Dialog/useDialogBehavior.ts:88 — 'desempilharDialogo' is defined
but never used`. O arquivo tem 91 inserções NÃO COMMITADAS da lane REV-MOTION,
que está viva no mesmo pacote. Não toquei. **A lane de motion precisa fechar isso
antes de qualquer gate de lint do DS inteiro passar.**

## Conferência visual do dono (o que teste nenhum prova)

1. Menu secundário do evento em **320px, 768px e 1024px**: nenhuma barra de
   rolagem visível, e **nenhuma aba sumida** — role a barra com o dedo/trackpad e
   confirme que Financeiro e Config continuam alcançáveis.
2. O mesmo nas outras duas áreas que usam a barra: **CRM** e **clube** (a mudança
   é do componente, não da tela de eventos).
3. `Ajustar capacidade` num lote com venda: digite um total menor e confirme que
   os três números mudam **na hora** e que aparece o aviso "ainda não salvo".
4. Deixe o campo de capacidade vazio e confirme que o painel **não pisca**.
5. Formulário de lote com **vaga e nome vazios ao mesmo tempo**: os dois campos
   acendem juntos e o cursor cai no NOME (primeiro na ordem visual).
6. Lote sobreposto: a mensagem deve trazer **nome do lote + datas por extenso**.
   Confirme que as datas batem com a linha daquele lote na tabela.
7. `Desativar` num lote vigente: o estado vira Encerrado, o preço vigente da
   modalidade pula para o próximo lote, e as inscrições já vendidas continuam.

## Pendências para o dono da regra

- **Selo da extensão da RN-200:** a Rule congela janela e ordem além do preço.
  Ou a RN-200 escrita passa a dizer isso, ou a Rule afrouxa. Hoje o produto conta
  a verdade ao organizador, mas a regra escrita e a regra executada divergem.
- **Estouro de vaga por PIX em voo (defeito #4):** aceitar e apenas mostrar, ou
  fechar com reserva de vaga no checkout.
