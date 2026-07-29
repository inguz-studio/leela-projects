# Handoff vivo · lane CHECKOUT-UX · trace leela-build-2d6ee98d · 2026-07-29

Executor: sf-frontend-lead (software-forge). Brief: `.nirvana/briefs/leela-build-2d6ee98d-CHECKOUT-UX-enriched.md`.
Autoridade: `leela-specs/02-rodadas/2026-07-29-checkout-ux/01-achados-dono.md` (DEC-0729).
Insumo: handoff `.nirvana/handoffs/leela-build-2d6ee98d-CHECKOUT-PIXQR-INV.md` (root causes de A1/A2/B5).

## Estado da fila

### Fase A — dados
- [x] A1 (T-SEED-2) · double-redate corrigido + dry-run PASS (re-seed roda junto com A2)
- [ ] A2 (T-SEED-1) · documento do cupom `FLORIPARUN10`

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

## Premissas assumidas

1. **Fix por idempotência, não por remoção de patch (A1).** Decisão de peso, vetável: a
   alternativa (patchar só `WriteBatch.set` + `CollectionReference.add`) é menor em linhas
   mas fica refém do detalhe interno da lib. Escolhi a que sobrevive a upgrade de versão.

## Commits desta lane (sem push — o maestro pusha)

(a preencher)
