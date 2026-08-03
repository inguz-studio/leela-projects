# Handoff vivo · lane KITCUPOM-BUILD · trace leela-build-2d6ee98d · 2026-08-02

Executor: sf-frontend-lead (software-forge). Brief: `.nirvana/briefs/leela-build-2d6ee98d-KITCUPOM-BUILD-enriched.md`.
Autoridade das 8 tarefas: `leela-specs/02-rodadas/2026-07-29-checkout-ux/04-fila-kitcupom.md`.
Specs de origem: `02-spec-kitcupom.md` (D-KC-1..12) e `03-rns-kitcupom.md` (RN-425..433).

Base: `main` em `8de6894`. Sem push — o maestro pusha.

## Estado da fila

- [x] **D0 · deploy do HEAD** (task do maestro, antes de tudo)
- [ ] **A1 · S212-T1** — forma da galeria no core + slots nas Rules
- [ ] **A2 · S212-T2** — três posições no `KitEditor` + slot no `uploadImagemKit`
- [ ] **A3 · S212-T3** — `KitPublico`/leitor projetam as secundárias; galeria no `KitDetalhe`
- [ ] **A4 · S212-T4** — quarto degrau da cascata do `kitImagem.ts`
- [ ] **B1 · S1215-T1** — gerador único do link + `linkMaster` derivado
- [ ] **B2 · S1215-T2** — captura e guarda do cupom por evento
- [ ] **B3 · S1215-T3** — faixa pós-Hero + verificação server-side
- [ ] **B4 · S1215-T4** — dois links de demonstração no seed do meia-floripa
- [ ] **X1** — vocabulário/a11y da página do evento

---

## D0 · o site no ar volta a ser o HEAD

O deploy vigente (`806475ae3b089041`, da lane RETOMADA-SEAL) foi cortado ANTES dos dois
consertos de dinheiro que a review antagonista CKUX-REV fez em `CheckoutFlow.tsx` e
`StepPagamento.tsx` (`bcf7df2`, `f291f33`). O site servia, portanto, a tela em que o botão de
pagar podia oferecer o preço da seleção anterior. Esta task refez o deploy do HEAD.

Receita, um comando (LANDING-PREVIEW / RETOMADA-SEAL):
`node apps/landing/scripts/deploy-leela-hub.mjs`.

| | |
|---|---|
| Exit do script | **0** — *Deploy complete!* |
| Release na live | `2026-08-02 21:25:02`, sem expiração |
| Backend SSR | `ssrleelalanding` (gen2, Node 22, us-central1) — *Successful update operation* |
| Payload | 89 arquivos no Hosting, 5 novos; pacote da função 256,24 MB |
| `package.json` do app | restaurado pelo `finally` (`[deploy-landing] package.json restaurado.`) |

### Prova 1 — códigos HTTP, medidos depois do release

```
200   7,53 s   45.710 B   https://leela-landing.web.app/
200   1,92 s   78.613 B   https://leela-landing.web.app/meia-floripa-2026
200   1,24 s   39.932 B   https://leela-landing.web.app/meia-floripa-2026/inscricao
200   0,27 s        15 B  https://leela-landing.web.app/health
```

Os 7,5 s da home são o cold start de `minInstances: 0`, o mesmo número medido na
LANDING-PREVIEW e na RETOMADA-SEAL. Comportamento esperado, não regressão.

### Prova 2 — o fix da CKUX-REV está SERVIDO

O chunk da rota de inscrição é content-addressed, então a troca de hash já é prova de build
novo; o que faltava era o marcador do fix. Baixei o chunk **antes** do deploy e **depois**:

- antes: `.../inscricao/page-**79adbd49c17b6407**.js` (o mesmo que a RETOMADA-SEAL deixou)
- depois: `.../inscricao/page-**8581cec0538e410c**.js`

| Marcador (ASCII — acentuado não casa nos chunks desta máquina) | Antes | Depois |
|---|---|---|
| `Atualizando o total` — o rótulo que o botão de cartão passa a exibir enquanto a cotação está no ar (`f291f33`) | **0** | **1** |
| `totalDefasado` — o estado que desabilita os dois botões de pagar; o nome sobreviveu à minificação | **0** | **2** |
| `Pagar ` (o rótulo normal, que NÃO podia sumir) | 1 | 1 |
| `preparando o c`ódigo PIX | 1 | 1 |

As duas primeiras linhas são o fix novo entrando; as duas últimas são o controle — se elas
tivessem zerado, o deploy teria trocado a tela por outra coisa em vez de consertá-la.

`bcf7df2` (a cotação de seleção abandonada que aterrissava sobre a atual) é incremento de um
número de sequência dentro de um `useEffect`: não deixa string para grep. Ele viaja no mesmo
chunk, cujo hash mudou, e está coberto pelo teste `checkout-ckux-rev-cotacao.test.tsx` que a
própria CKUX-REV escreveu.

---

## Commits desta lane (sem push — o maestro pusha)

| # | Hash | Task |
|---|---|---|
| 1 | *(este)* | D0 · deploy do HEAD com provas |
