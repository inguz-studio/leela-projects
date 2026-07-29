# Handoff vivo · lane CHECKOUT-UX · trace leela-build-2d6ee98d · 2026-07-29

Executor: sf-frontend-lead (software-forge). Brief: `.nirvana/briefs/leela-build-2d6ee98d-CHECKOUT-UX-enriched.md`.
Autoridade: `leela-specs/02-rodadas/2026-07-29-checkout-ux/01-achados-dono.md` (DEC-0729).
Insumo: handoff `.nirvana/handoffs/leela-build-2d6ee98d-CHECKOUT-PIXQR-INV.md` (root causes de A1/A2/B5).

## Estado da fila

### Fase A — dados
- [x] A1 (T-SEED-2) · double-redate corrigido + dry-run PASS + re-seed de produção provado
- [x] A2 (T-SEED-1) · documento do cupom `FLORIPARUN10` criado e vivo em produção

### Fase B — jornada de compra
- [x] B1 · PAGAR virou UMA tela; aceites colados no ato de pagar
- [x] B2 · cartão de crédito abre o formulário no 1º clique
- [x] B3 · nascimento por teclado numérico (inputmode/máscara) — `18a798a`
- [x] B4 · seletor de parcelas com contraste AA por estado
- [x] B5 (T-CKUX-1) · coalescing das cotações — `0d83e7c`
- [x] B6 · troca de etapa rola para o topo
- [x] B7 · resumo do pedido editável antes de pagar
- [x] B8 · endereço CEP-first (progressive disclosure) — `18a798a`
- [x] B9 · componente único de formulário (nome completo + endereço) — `18a798a`

**Fase B COMPLETA (9/9).** Checklist estava defasado (queda de conexão antes do
update do handoff) — os commits provam o trabalho: `8c28f59` (B1/B2/B4/B6/B7) e
`18a798a`+`0d83e7c` (B3/B5/B8/B9). Ver seções dedicadas abaixo.

### Fase C — superfície
- [x] C1 · vocabulário "participantes" no lugar de corrida — `8588d27`
- [x] C2 · larguras de container unificadas na landing — `fa8a2d8`
- [x] C3 · ritmo vertical por tokens — `a2ac06b`

### Fechamento
- [ ] Deploy da landing + provas curl
- [ ] Boards + épicos
- [ ] Resumo executivo + self-score

---

## A1 (T-SEED-2) · o seed re-datava DUAS vezes tudo que escrevia por `ref.set`

**Root cause (confirmado, herdado da CHECKOUT-PIXQR-INV).** `prod-seed-leela-hub.ts`
patchava três protótipos de escrita — `DocumentReference.set`, `WriteBatch.set` e
`CollectionReference.add`. No `@google-cloud/firestore@7.11.6`, `DocumentReference.set()`
é implementado **por cima de** `WriteBatch.set()`: abre um batch, chama `.set` e faz commit.
Logo todo payload escrito por `ref.set(...)` atravessava os dois patches e levava `redate()`
duas vezes (+270 d em vez de +135 d).

**Fix escolhido: `redate()` idempotente**, não "remover o patch de `DocumentReference.set`".
O objeto/array devolvido carrega um marcador de `Symbol` não-enumerável; segunda passagem
devolve o valor intacto. Motivo da escolha: remover o patch assume que a lib continuará
roteando `ref.set` por `WriteBatch.set` — isso é detalhe interno de implementação e pode
mudar de versão sem aviso. A idempotência está correta nas **duas** topologias, com ou sem
o roteamento interno, e não cria acoplamento à versão da lib.

O `Symbol` não é enumerado por `Object.entries`/`for..in` nem serializado pelo Firestore —
provado no dry-run (`chaves enumeráveis=["inicio","aninhado"]`, `JSON` sem o marcador).

**Arquivos.** `functions/scripts/redate.ts` (novo — lógica extraída, agora testável),
`functions/scripts/redate-dry-run.ts` (novo — prova offline re-rodável),
`functions/scripts/prod-seed-leela-hub.ts` (passa a importar; comportamento idêntico).

### Prova 1 — dry-run contra as classes REAIS da lib, sem rede

O bug nasce da **composição** dos patches dentro da biblioteca; um teste da `redate()`
isolada não o pegaria. O dry-run exercita `firebase-admin/firestore` de verdade, espiona o
payload no ponto em que ele chega ao código original e stuba `WriteBatch.commit` (nenhuma
chamada de rede, nenhuma credencial).

```
$ node <tsx> functions/scripts/redate-dry-run.ts
[dry-run] offset de referência: +135 d · fonte 2026-01-01T00:00:00.000Z
[dry-run] esperado: 2026-05-16T00:00:00.000Z

OK   cupons/via-ref-set           2026-05-16T00:00:00.000Z  (+135 d)
OK   cupons/via-batch-set         2026-05-16T00:00:00.000Z  (+135 d)

OK   redate idempotente · chaves enumeráveis=["inicio","aninhado"] · symbols ocultos=1 ·
     JSON={"inicio":{"_seconds":1778889600,...},"aninhado":{"fim":{...}}}

[dry-run] PASS — deslocamento único nos dois caminhos de escrita.
```

### Prova 2 — controle negativo (o dry-run reprova o código antigo)

Desliguei a guarda de idempotência (`jaRedatado` → `false`) e re-rodei. O dry-run acusa, e
a data que ele cospe é **exatamente** a que está hoje em produção no `RITMOFORTE10`:

```
FALHA cupons/via-ref-set           2026-09-28T00:00:00.000Z  (+270 d)
OK    cupons/via-batch-set         2026-05-16T00:00:00.000Z  (+135 d)
[dry-run] 2 FALHA(S) — patch de re-datação incorreto.
```

`2026-09-28` é a data real do `inicioEm` do `RITMOFORTE10` em produção (fonte
`2026-01-01`). O dry-run reproduz o defeito de produção com fidelidade de dia.

### Gate

- `tsc --noEmit` sobre `functions/scripts/**` + `functions/src/**` (tsconfig do functions
  estendido para incluir scripts) → **exit 0**.
- Dry-run → **exit 0**; controle negativo → **exit 1**.

---

## A2 (T-SEED-1) · o cupom `FLORIPARUN10` que a parceria referenciava e nunca existiu

A parceria de afiliado nascia com `cupom: 'FLORIPARUN10'` no contrato, mas **nenhum**
documento `eventos/meia-floripa-2026/cupons/FLORIPARUN10` era escrito em lugar nenhum do
repo. Afiliado com cupom no contrato e sem cupom no checkout.

**Fix.** O documento passa a ser escrito na MESMA função que escreve a parceria
(`seedParceriasDoClube` → `seedCupomAfiliado`), e ambos leem o mesmo
`CUPOM_AFILIADO_CODIGO`. Divergir de novo exigiria mudar duas linhas de propósito.

**Escopo `geral`, não `club_parceiro`** — decisão de peso, premissa vetável (nº 2 abaixo).

`usos` é semeado **só na criação** (é campo de escrita exclusiva da Function do checkout,
`CAMPOS_FUNCTION_CUPOM`): um re-seed não pode zerar o contador de um cupom que já vendeu.
Os cupons canônicos não fazem isso hoje — `HEROI10`/`CORRA50` reescrevem `usos` a cada
seed. Não uniformizei (fora da fila), mas fica registrado.

---

## A1+A2 · re-seed de produção (executado, com antes/depois)

Rodado 2× (a segunda passada carrega também o fix de relógio descrito abaixo):
`node <tsx> functions/scripts/prod-seed-leela-hub.ts` com ADC do firebase-tools +
`QR_TOKEN_KEYS`/`QR_TOKEN_KID_ATIVO=prod1` + `CRM_ID_PEPPER`. Offset de hoje: **+136 d**.

### Terceiro defeito, achado durante o re-seed: o relógio errado nos seeds relativos

Ao ler produção antes de re-seedar, a data da prova estava em **2027-05-02** e um comunicado
com status `enviado` aparecia datado de **2027-04-21** — futuro. Nenhum dos dois é explicado
só pelo double-redate.

Causa: `preview-seed-extra`/`preview-seed-clubes` derivam datas RELATIVAS (`agora − 3 dias`,
`agora + 8 dias`) e recebem o "agora" por parâmetro, com default `new Date()`. O runner de
produção não passava nada — então o seed calculava a partir do relógio REAL e o `redate()`
ainda somava o offset por cima, jogando tudo +136 d para a frente. Somado ao double-redate,
+272 d.

Fix: o runner passa `RELOGIO_DO_DATASET` (= `REF_CLOCK_UTC`, 2026-03-15). Agora `agora − 3 d`
vale 2026-03-12, o redate soma o offset e o documento aterrissa em "3 dias atrás" de verdade.
`seedAssessoriaE18` também tinha um `new Date()` chumbado no meio — passa a receber `agora`.

### Antes → depois (leitura direta do Firestore de produção, Admin SDK)

| documento | antes | depois | leitura |
|---|---|---|---|
| `cupons/RITMOFORTE10` início | **2026-09-28** | **2026-05-17** | era +270 d; abria só daqui a 2 meses. Agora vigente hoje |
| `cupons/FLORIPARUN10` | **inexistente** | **2026-04-16 → 2026-09-10, percentual 10, usos 0** | criado (A2) |
| `eventos/meia-floripa-2026.data` | **2027-05-02** | **2026-08-05** | seed quer "prova em +8 d"; agora é isso |
| comunicado `inscricoes-meia-abertas.enviadoEm` | **2027-04-21** | **2026-07-25** | `enviado` com data futura → 4 dias atrás |
| comunicado `treino-longo-domingo.enviadoEm` | **2027-04-16** | **2026-07-20** | idem |
| lotes 5k/10k/21k | +136 d (já corretos) | +136 d | inalterados — sempre passaram por `batch.set` |
| `cupons/HEROI10`, `cupons/CORRA50` | +136 d | +136 d | inalterados, controle da leitura |

Os lotes e os dois cupons canônicos não mudarem é o controle da leitura: eles sempre
escreveram por `batch.set` (patch único) e por isso nunca estiveram errados.

### Achado operacional (custou uma janela de indisponibilidade)

Logo após o re-seed, **todo callable HTTPS de produção passou a responder `503 Rate
exceeded.`** — inclusive `cotarInscricaoCheckout` e `getCheckoutPrefill`. Não é defeito de
código: o seed grava centenas de inscritos e cada escrita acorda os triggers
`onInscritoWrite`/`onInscritoWriteEstoque`/`onInscritoWriteCrm`. O log mostra a tempestade,
com `onInscritoWriteEstoque` levando 17,8 s e abortando por contenção de transação
(`10 ABORTED: cross-transaction contention`). A fila de triggers consome a cota de
invocação e as chamadas de usuário levam 503 até a fila drenar.

**Consequência prática: re-seedar produção derruba o checkout por alguns minutos.** Não
fazer isso com o dono comprando. Registrado como fato operacional, não como task.

### Sobre o dado do dono

Antes do re-seed, `pedidos` tinha 11 documentos, todos `ped-0001..ped-0011` do próprio seed
— **nenhuma compra real foi perdida** (coerente com a INV: as 4 tentativas do dono morreram
em 500 antes de gravar).

---

## B1 + B2 + B4 + B6 + B7 · o PAGAR virou uma tela só

Commit `8c28f59`. Quatro achados do dono tinham a mesma causa estrutural, e por isso
vieram num lote: o PAGAR eram **duas telas internas** (resumo e pagamento) dentro da
**mesma macro-etapa** do indicador de progresso. O comprador escolhia a forma de pagamento
numa tela e só via o instrumento na outra, depois de clicar "Ir para pagamento" — um clique
que não movia a barra de progresso. Era literalmente o "clicar novamente" do achado 17.

### O que cada task virou

**B1 (achado 3).** As duas telas viraram uma: resumo → instrumento → aceites → botão de
pagar, na ordem em que a decisão acontece. O aceite fica colado no ato de pagar, como a
decisão de 2026-07-18 ratificou.

Vale registrar o que a leitura literal do brief dizia e o que o código mostrava: os aceites
**já estavam** no passo de pagamento desde `e860b8e` (CKFORM-T2). O defeito real não era o
passo, era a ordem dentro dele — o comprador chegava no pagamento e o que estava na frente
dele eram dois checkboxes, sem QR, sem nada acontecendo. **A regra do dinheiro não
afrouxou:** `createInscricaoCharge` recusa pedido sem os dois aceites antes de qualquer
escrita (flip F-4a), então o QR não pode preceder o aceite. O que se corrigiu foi a ordem
da tela e a eliminação do passo intermediário.

**B2 (achado 17 / D-0729-6).** Os campos do cartão passam a ser revelados DENTRO da opção
"Cartão de crédito", pelo contrato `children` do `RadioCard` do DS — que já existia
exatamente para isso, com `aria-expanded`/`aria-controls` de fábrica. Um clique, sem
navegação. Reaproveitado, não inventado.

**B4 (achado 5) — root cause numérico.** O seletor de parcelas usava a variante `flat` do
`Select`: fundo `--surface-sunken` (**#0A0A0A**) sobre a página `--surface-base`
(**#0C0C0C**), com borda `--input-border-flat`, que no tema Brasa vale **`transparent`**.
Contraste de superfície ≈ **1,03:1** e contorno nenhum — o controle era invisível, exatamente
como o dono descreveu ("mesma cor do plano de fundo"). A variante `bordered` traz
`border-input` (= `--border-strong`, **#737373**): **≈3,9:1** contra o cartão e **≈4,2:1**
contra a página, acima do piso de 3:1 da WCAG 1.4.11 para contorno de componente, e em
repouso — não só no foco.

**B6 (achado 10).** Toda troca de etapa leva ao topo. A rolagem checa `typeof` antes de
chamar: ambiente sem `scrollIntoView`/`scrollTo` (jsdom, navegador capado) apenas não rola.
Uma animação não pode derrubar a jornada de compra — e não é hipótese: o teste novo caiu com
`el.scrollIntoView is not a function` antes da guarda entrar.

**B7 (achado 12 / D-0729-3).** Cada linha do pedido ganhou "Alterar modalidade, kit ou
tamanho", que leva ao card daquele atleta (âncora `#atleta-{i}` no `CardAtleta`) com o
formulário inteiro preservado — é estado do fluxo, nada é remontado. Exceção deliberada à
regra do B6: esse caminho não rola ao topo, rola ao card. Ir ao topo do formulário seria
perto demais de "recomeçar", que é o que a decisão proíbe.

### Gates

- `tsc --noEmit` da landing → **exit 0**.
- `eslint app lib test --max-warnings 0` → **exit 0**.
- `vitest run` da landing → **198/198 em 20 arquivos** (192 antes + 6 novos).

### Testes novos (comportamento novo)

`apps/landing/test/checkout-dec0729-pagar.test.tsx`, 6 casos, cada um amarrado ao achado:

- não existe mais "Ir para pagamento"; resumo, meio e aceites coexistem na mesma tela;
- **a regra do dinheiro não afrouxou**: sem os 2 aceites o botão fica desabilitado e
  `createInscricaoCharge` não é chamado;
- clicar "Cartão de crédito" revela os 4 campos do cartão sem navegação;
- o radio do cartão anuncia `aria-expanded` `false → true` (é o painel do DS, não markup solto);
- as parcelas usam `border-input` e não a borda transparente da variante flat;
- "Alterar" volta à escolha com a modalidade marcada e, ao seguir, o nome e o número do
  endereço continuam preenchidos — a prova de que não se recomeça nada.

### Testes existentes ajustados (3 arquivos)

`checkout-asaas-teto`, `checkout-s1209-cards-atleta` e `checkout-s1209-rev-ataque`
navegavam por "Ir para pagamento". Passaram a ancorar no botão "Gerar código PIX" do passo
PAGAR. Em `rev-ataque`, o vetor "trocar a forma de pagamento e voltar ao PIX" deixou de
precisar de ida e volta entre etapas — os dois controles vivem na mesma tela; **o vetor de
ataque e as asserções continuam idênticos**. `checkout-form-aceites` e
`checkout-fixes-steps` só perderam as props `cartao`/`onCartao` do `StepPagamento`.

### Reaproveitado vs criado

Reaproveitado: `RadioCard` do DS (contrato `children` + a11y), variantes `bordered` de
`Select`/`Input`, `CardAtleta`, `CupomCampo`, `SeletorForma`, `StepResumo`/`StepPagamento`
inteiros (recompostos, não reescritos), `macroDaEtapa` como fonte única do agrupamento.
Criado: `checkout-dec0729-pagar.test.tsx`, o prop `id` do `CardAtleta`, os props
`conteudoPix`/`conteudoCartao` do `SeletorForma` e `onEditarItem` do `StepResumo`.

---

## B3 + B8 + B9 · nascimento por teclado, CEP-first e uma moldura de formulário só

Commit `18a798a`. Três achados, três telas diferentes, mesma classe de defeito: campo cru
fora do contrato do DS.

**B3 (achado 18 / D-0729-7).** A data de nascimento era `<input type="date">` — no celular
isso abre o calendário nativo, e para chegar a 1990 a pessoa navega ano a ano. Virou campo de
texto com máscara `dd/mm/aaaa` e `inputMode` numérico. O estado do fluxo continua em
`yyyy-mm-dd` (formato do core) — a máscara é só apresentação, como já acontecia com CEP e
telefone. Data pela metade não vira data: o estado só recebe ISO quando os 8 dígitos estão lá.

**B8 (achado 9 / D-0729-2).** O bloco de endereço nasce com o campo de CEP sozinho; os demais
campos aparecem quando o CEP fica **completo** (8 dígitos), não quando o ViaCEP responde com
sucesso — amarrar ao lookup quebraria o fail-open da spec 5.2, e com a API fora (ou num CEP
rural sem match) os campos nunca apareceriam. O prefill também revela os campos: quem já tem
endereço na ficha vê o endereço, sem esperar digitação.

**B9 (achado 7).** O bloco do responsável e o do endereço passam a usar a mesma moldura dos
cards de atleta (`MolduraFormulario`, extraída do `CardAtleta`). Não eram componentes
diferentes — era a mesma peça em duas superfícies. Dentro do card (`--surface-raised`,
`#161616`) o `Input` `flat` do DS lê como campo; solto sobre a página (`--surface-base`,
`#0C0C0C`) o mesmo `Input` cai para ≈1,03:1 de contraste, com `--input-border-flat`
transparente no tema Brasa — invisível, a mesma classe de bug do B4.

### Gates

- `tsc --noEmit` da landing → **exit 0**.
- `eslint app lib test --max-warnings 0` → **exit 0**.
- `vitest run` da landing → **207/207 em 20 arquivos** (re-executado nesta retomada,
  29/07 15h33, 86,45s — número real supera a estimativa do checklist anterior).

### Reaproveitado vs criado

Reaproveitado: `CardAtleta` como origem da moldura (extraída, não reescrita), o padrão de
máscara já usado em telefone/CEP, `cep.ts` (lookup ViaCEP já existente, fail-open da spec 5.2
preservado). Criado: `MolduraFormulario` (componente extraído para os 3 lugares), lógica de
máscara/parse de nascimento em `StepDados.tsx`, gate de revelação por CEP completo em `cep.ts`.

---

## B5 (T-CKUX-1) · coalescing da cotação — uma chamada por interação

Commit `0d83e7c`. Medido em produção na sessão do dono: três chamadas de
`cotarInscricaoCheckout` em 4,4s (14:07:16/:18/:20) e outros pares em 14:26-14:27, cada
round-trip custando 1,7-9,8s. Era isso que deixava "Calculando total" preso na tela.

Duas causas somadas: (1) o efeito dependia de `cotarCom`, cuja identidade muda a cada edição
de QUALQUER campo de inscrito — digitar o nome de um atleta re-disparava a cotação, embora
nome não mude preço; (2) aplicar cupom cotava duas vezes — uma no botão, outra pelo efeito
reagindo ao `cupomAplicado` recém-escrito.

**Fix.** Uma assinatura com a lista curta do que move preço (evento, modalidade+kit por
inscrito, forma, parcelas, cupom); o efeito só olha para ela, o resto passa por `ref`. Quem
cota registra a assinatura, então os caminhos manuais do cupom não geram a segunda chamada.
Debounce de 200ms para o vaivém, e número de sequência porque respostas de até 9,8s chegam
fora de ordem — a última PEDIDA vence, nunca a última a chegar. O retry manual é o único
caminho que fura o dedupe (zera `assinaturaCotadaRef`); o early-return por assinatura igual
zera `cotando` também, senão voltar à seleção anterior no meio do debounce travava
"Calculando total" para sempre.

**T-CKUX-2 segue aberta** (fora desta fila): cold start real de 3-10s é decisão de custo do
dono — `minInstances` na function de cotação. Não decidido aqui.

### Gates

- `tsc --noEmit` + `eslint` da landing → **exit 0**.
- `vitest run` → suíte completa verde; casos novos em `checkout-dec0729-pagar.test.tsx`
  (mesmo arquivo do B1, cobrindo o cenário "editar nome não re-cota" e "cupom cota uma vez").

### Reaproveitado vs criado

Reaproveitado: `CheckoutFlow.tsx` como local único da orquestração de cotação (nenhum
componente novo). Criado: assinatura de preço (string derivada), número de sequência de
resposta, debounce de 200ms.

---

## C1 (achado 11 / D-0729-1) · vocabulário de corrida vira "participante"

Commit `8588d27`. Varredura da jornada de compra inteira (não só o texto citado no
achado — "e afins"): checkbox "Eu também vou correr nesta prova" → "Eu também vou
participar deste evento"; título de seção "Quem vai correr" → "Participantes"; apoio
"Cada atleta tem os próprios dados" → "Cada participante..."; apoio do
`StepModalidadeKit` "kit de cada atleta" → "...cada participante"; bloqueio do cupom
"modalidade de cada atleta" → "...cada participante"; fallback de título do card/
resumo/ticket "Atleta N" → "Participante N" (4 arquivos: StepDados, StepModalidadeKit,
CheckoutFlow, StepConfirmacao); botão "+ Adicionar atleta" → "+ Adicionar participante".

**Escopo deliberadamente contido ao texto que o comprador lê** — não tocado (registrado,
não esquecido):
- nomes internos (`CardAtleta`, `BotaoAdicionarAtleta`, variável `euCorro`), o DOM
  `id="atleta-${i}"` e o anchor `#atleta-{i}` que o B7 usa pra rolar ao card certo,
  `autoComplete="section-atleta{i}..."` — invisível ao usuário, risco de regressão no
  scroll-to-card do B7 sem ganho nenhum de UX;
- **texto legal de `AceitesCompra.tsx`** ("Termo do Atleta", "regulamento da prova",
  "transferência de inscrição para outro atleta") — é declaração de saúde/termo de
  compra modelada no benchmark real da Sympla Sports (comentário do próprio arquivo).
  Mudar linguagem de aceite jurídico é decisão de peso fora do meu mandato de UX.
  **ESCALO**: se o dono quiser esse texto também sem vocabulário de corrida, é uma
  decisão sobre conteúdo legal que pede revisão own (talvez jurídica), não um find/
  replace de tela;
- **descrição de produto do kit** (`kitDetalheDados.ts`: "camiseta técnica premium/de
  corrida") — descreve um item físico de um evento que É uma corrida (meia-floripa);
  não é vocabulário de identidade do participante, é categoria real de produto (como
  "tênis de corrida" é nome de categoria em qualquer loja, independente do
  posicionamento do lugar que vende).

**Achado FORA do escopo da fila, registrado para o maestro decidir**: a home page (`/`)
tem vocabulário de corrida NA MARCA — eyebrow "Corrida de rua" e H1 "Ache sua próxima
corrida e garanta a inscrição em minutos" (`app/(public)/page.tsx`). É mais visível que
qualquer coisa dentro do checkout e não foi tocado (fora de "jornada de compra", que é o
escopo literal do C1). Se D-0729-1 vale "para toda superfície pública" como o texto da
decisão diz, esta é a maior pendência.

Testes ajustados (mesmo comportamento, string nova): `checkout-s1209-cards-atleta`,
`checkout-s1209-rev-ataque`, `checkout-s1209-cupom-forma` (3 arquivos).

---

## C2 (achado 14) · container público unificado (header, Hero, dobras)

Commit `fa8a2d8`. Raiz NÃO era um número de `max-w` diferente sozinho — eram DUAS
composições de padding+largura coexistindo com o MESMO valor nominal em alguns casos:
`Dobra.tsx` (canônico) aplica o gutter no `<section>` externo e o `max-w-5xl` sozinho no
`<div>` interno; como o `mx-auto` centraliza dentro da viewport inteira, o padding do pai
não desloca o conteúdo em telas ≥1024px. `HeroSection.tsx` aplicava gutter E `max-w-5xl`
no MESMO elemento — o padding mordia PARA DENTRO da caixa já centralizada, então o
conteúdo do Hero nascia ~16-32px mais recuado que o das dobras vizinhas, mesmo com o
"mesmo" `max-w-5xl` nominal. `PublicHeader.tsx` usava `max-w-6xl` (mais largo) na mesma
composição de padding-no-mesmo-elemento, sem o degrau `lg:px-8`.

Fix: `apps/landing/lib/containerPublico.ts` exporta `CONTAINER_GUTTER` +
`CONTAINER_LARGURA` como fonte única; `Dobra`/`HeroSection`/`PublicHeader` e a home page
passam a importar dela, todos na mesma composição de dois níveis.

**Decisão de escopo (premissa vetável)**: a home page (rota `/`) não estava citada no
achado 14, mas o header é COMPARTILHADO entre `/` e `/[eventSlug]` — alinhar só o header
à página de evento e deixar a home com `max-w-6xl` teria trocado a divergência de rota,
não eliminado. Convergi as duas rotas para `max-w-5xl` (valor mais usado no codebase,
8+ seções já o usavam). **Se o maestro preferir a home mais larga**, o caminho é dar ao
header uma largura configurável por rota — mais complexo, decisão do dono.

Não tocado (decisão, não esquecimento): `HeroMinimo.tsx` (`max-w-3xl`) — já usa a
composição de dois níveis correta; só aparece quando o evento não tem NENHUMA dobra
(nada pra desalinhar contra); a medida mais estreita é escolha de tipografia para um
hero solo, não bug de container.

---

## C3 (achado 13) · ritmo vertical em modalidade, kit e forma de pagamento

Commit `a2ac06b`. Três defeitos concretos, um por área nomeada no achado:
- **Modalidade → Kit** (`StepModalidadeKit`): separação era `mt-5` (20px) ad hoc, sem
  relação com o resto do arquivo. Vira `gap-6` (24px) — o mesmo valor que `StepResumo`
  já usa para separar seus próprios blocos maiores.
- **Seleção de kits**: o slot "depois de escolher o kit" tinha DUAS margens diferentes
  pro MESMO lugar dependendo do ramo — `mt-2` sem grade de tamanho, `mt-4` com grade
  (`SeletorGradeItem`) e outro `mt-4` no `KitDetalhe`. Convergido para um `gap-4` (16px)
  único cobrindo picker → nota/grade → detalhe.
- **Forma de pagamento** (`StepResumo`): a `<section>` que envolvia o `SeletorForma`
  tinha `gap-[var(--spacing-3)]` (12px) SEM EFEITO — um único filho, gap que não espaça
  nada. Removida; `SeletorForma` passa a ser irmão direto de Seu-pedido/Cupom/Totais no
  mesmo `gap-6` do stack externo.

Resultado: hierarquia de dois degraus, citável — 24px entre blocos maiores, 16px dentro
de um bloco entre peças relacionadas, 8px/4px em legendas coladas a um rótulo
(inalterado). Nenhum valor novo inventado.

Não mexido (fora do mandato de tela): o espaçamento INTERNO do `RadioGroup`/`RadioCard`
do DS entre as próprias opções — é primitivo compartilhado por todo o app; mudança de
design system, não fix de tela.

### Nota operacional · flakiness da suíte cheia nesta máquina

A suíte completa em modo default (threads paralelos) mostrou 4 falhas por TIMEOUT após
o C3 — as 4 reproduzidas em isolamento (arquivo a arquivo) passaram limpas, e nenhum
arquivo tocado pelo C3 tem lógica de PIX/relógio/cotação (mudança é só classe CSS).
Rodei `npx vitest run --pool=forks --poolOptions.forks.singleFork=true`: **207/207 em
63s, zero flakiness** (mais rápido que o modo paralelo — 94-138s — nesta máquina de
8GB). Registrado como diretriz operacional: se a suíte cheia mostrar timeout numa
retomada futura, re-rodar single-fork antes de assumir regressão.

---

## Premissas assumidas

1. **Fix por idempotência, não por remoção de patch (A1).** Decisão de peso, vetável: a
   alternativa (patchar só `WriteBatch.set` + `CollectionReference.add`) é menor em linhas
   mas fica refém do detalhe interno da lib. Escolhi a que sobrevive a upgrade de versão.
2. **`FLORIPARUN10` nasce com escopo `geral`, 10% (A2).** A task devolvida pela INV pedia
   "escopo de afiliado" — esse valor não existe: o enum é `geral | club_parceiro` (RN-364).
   E `club_parceiro` seria ERRADO aqui: ele exige `parceriaRef` apontando para
   `tenants/{t}/parceirosAssessoria/{id}`, documento que o checkout re-lê DENTRO da
   transação de venda exigindo `status: 'ativa'`. A parceria de afiliado vive em
   `clubes/{slug}/parcerias/{id}` — outra coleção. Escopar como `club_parceiro` faria o
   checkout ler um documento inexistente e derrubar a venda. A atribuição do afiliado já é
   feita por `linkMaster` + janela de 7 dias, que é o mecanismo modelado; o cupom é só
   desconto. Valor 10% pelo nome e por paridade com `RITMOFORTE10`; janela igual à dos
   cupons canônicos, que vale tanto no preview local quanto em produção.
3. **O relógio dos seeds relativos era defeito da mesma família (A1).** Não estava na fila
   nominalmente, mas o aceite escrito é "datas de clubes/extra voltam a +135 d" — e sem
   este fix elas voltariam a +136 d a partir do relógio errado, ou seja, ainda no futuro.
   Corrigi. Se o maestro achar que expandiu escopo, o revert são 3 linhas.
4. **C1 não toca o texto legal de `AceitesCompra.tsx` nem a marca da home page.** Decisão
   de peso, vetável — ESCALADA: "Termo do Atleta"/"regulamento da prova" é conteúdo
   jurídico (benchmark Sympla Sports); "Corrida de rua"/"Ache sua próxima corrida" é a
   marca da home (`/`, fora de "jornada de compra"). Ambos ficam para o maestro decidir
   se entram numa lane própria.
5. **C2 unifica a home page (`/`) para `max-w-5xl`, não só a página de evento (A1).**
   Decisão de peso, vetável — o header é componente COMPARTILHADO entre as duas rotas;
   alinhar só uma teria trocado a divergência de rota, não eliminado. Escolhi convergir
   as duas para o valor mais usado no codebase (o das dobras do evento). Revert possível:
   dar ao header uma largura por rota (mais complexo).
6. **C3 não toca o espaçamento interno do `RadioGroup`/`RadioCard` do DS.** É primitivo
   compartilhado por todo o app (painel do organizador incluído) — mudar lá é mudança de
   design system, fora do mandato de uma task de tela.

## Commits desta lane (sem push — o maestro pusha)

1. `574abaa` — A1 · re-datação idempotente + dry-run offline com controle negativo.
2. `4c8fae8` — A2 · cupom `FLORIPARUN10` junto da parceria + relógio do dataset nos seeds relativos.
3. `8c28f59` — B1+B2+B4+B7 (e B6) · PAGAR numa tela só, cartão no 1º clique, parcelas visíveis, resumo editável.
4. `f140530` — handoff das tasks B1/B2/B4/B6/B7.
5. `18a798a` — B3+B8+B9 · nascimento por teclado numérico, endereço CEP-first, moldura única de formulário.
6. `0d83e7c` — B5 (T-CKUX-1) · coalescing da cotação.
7. `ce7e30f` — handoff da pausa selada 29/07 ~13h20 (fase B completa em código, retomada = C1 + deploy).
8. `0afe592` — docs(regras): Regra L amendada (sonnet/haiku liberados via opus com gate) — fora do escopo desta lane, herdado do trace.
9. `5934a41` — checklist do handoff corrigido (B3/B5/B8/B9 ✓) + seções B3/B8/B9 e B5 documentadas + suíte re-verificada (207/207).
10. `8588d27` — C1 · vocabulário de corrida vira participante na jornada de compra.
11. `fa8a2d8` — C2 · container público unificado entre header, Hero e dobras.
12. `a2ac06b` — C3 · ritmo vertical coerente em modalidade, kit e forma de pagamento.
13. *(este)* — handoff das tasks C + premissas C1/C2/C3.
