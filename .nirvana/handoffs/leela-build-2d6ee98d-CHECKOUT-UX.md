# Handoff vivo · lane CHECKOUT-UX · trace leela-build-2d6ee98d · 2026-07-29

Executor: sf-frontend-lead (software-forge). Brief: `.nirvana/briefs/leela-build-2d6ee98d-CHECKOUT-UX-enriched.md`.
Autoridade: `leela-specs/02-rodadas/2026-07-29-checkout-ux/01-achados-dono.md` (DEC-0729).
Insumo: handoff `.nirvana/handoffs/leela-build-2d6ee98d-CHECKOUT-PIXQR-INV.md` (root causes de A1/A2/B5).

## Estado da fila

### Fase A — dados
- [x] A1 (T-SEED-2) · double-redate corrigido + dry-run PASS + re-seed de produção provado
- [x] A2 (T-SEED-1) · documento do cupom `FLORIPARUN10` criado e vivo em produção

### Fase B — jornada de compra
- [ ] B1 · aceites (termos + saúde) movem para o passo PAGAR
- [ ] B2 · cartão de crédito abre o formulário no 1º clique
- [ ] B3 · nascimento por teclado numérico (inputmode/máscara)
- [ ] B4 · seletor de parcelas com contraste AA por estado
- [ ] B5 (T-CKUX-1) · coalescing das cotações
- [ ] B6 · troca de etapa rola para o topo
- [ ] B7 · resumo do pedido editável antes de pagar
- [ ] B8 · endereço CEP-first (progressive disclosure)
- [ ] B9 · componente único de formulário (nome completo + endereço)

### Fase C — superfície
- [ ] C1 · vocabulário "participantes" no lugar de corrida
- [ ] C2 · larguras de container unificadas na landing
- [ ] C3 · ritmo vertical por tokens

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

## Commits desta lane (sem push — o maestro pusha)

(a preencher)
