# Handoff vivo · lane ACHADOS-0802 · trace leela-build-2d6ee98d · 2026-08-03

Executor: sf-frontend-lead (software-forge). Brief: `.nirvana/briefs/leela-build-2d6ee98d-ACHADOS-BUILD-enriched.md`.
Autoridade: `leela-specs/02-rodadas/2026-08-02-retomada/07-fila-achados.md` (fila), `04-spec-achados.md`
(D-ACH-1..14), `05-rns-achados.md` (RN-434..445), `03-achados-dono.md` (verbatim).

Base: `main` em `13a3f00`. Sem push — o maestro pusha. `git commit --only` por caminho, um commit por task.

## Estado da fila

- [x] **D0** · redeploy da landing (os dois fix-commits de dinheiro da KITCUPOM-REV entram no ar)
- [ ] **B1t · S314-T1** — tabela Price real em `buildInstallmentOptions`
- [ ] **B2t · S314-T2** — 2,89% a.m. no termo semeado e no default
- [ ] **A1 · S1216-T1** — gatilho da cotação na etapa de dados + sequência nos caminhos de cupom
- [ ] **A2 · S1216-T2** — `jurosParcelamento` no contrato da cotação e da cobrança
- [ ] **A3 · S1216-T3** — bloco de totais (taxa nomeada, "inclusa", linha de juros)
- [ ] **A4 · S1216-T4** — total por opção sempre que os dois existirem
- [ ] **C1 · S1217-T1** — aceites migram para a etapa de dados e gateiam o "Continuar"
- [ ] **C2 · S1217-T2** — nenhuma forma pré-selecionada
- [ ] **C3 · S1217-T3** — terceiro aceite condicional (termo de saúde do organizador)
- [ ] **C4 · S1217-T4** — versão exibida conferida pelo servidor
- [ ] **C5 · S1217-T5** — origem da requisição na prova de aceite
- [ ] **D1 · S1218-T1** — rótulo do grupo grudado no primeiro cartão
- [ ] **D2 · S1218-T2** — clique em qualquer ponto do cartão seleciona
- [ ] **D3 · S1218-T3** — "Escolha seu percurso" → "Modalidades disponíveis"
- [ ] **D4 · S1218-T4** — fotos reais de kit no acervo local

---

## D0 · o site no ar volta a ser o HEAD

O deploy vigente era o da KITCUPOM-BUILD (21:25 de 02/08), cortado ANTES da frente B da própria
KITCUPOM, da X1 e dos dois fix-commits de dinheiro da KITCUPOM-REV (`f68b22b` teto do cache do
cupom do link; `f249f33` remover cupom descarta a cotação). Um comando:
`node apps/landing/scripts/deploy-leela-hub.mjs`.

| | |
|---|---|
| Exit do script | **0** — *Deploy complete!* |
| Backend SSR | `ssrleelalanding` (gen2, Node 22, us-central1) — *Successful update operation* |
| Hosting | 90 arquivos, 12 novos · *release complete* |
| Pacote da função | 284,37 MB |
| `package.json` do app | restaurado pelo `finally` (`[deploy-landing] package.json restaurado.`) |

### Prova 1 — códigos HTTP, medidos depois do release

```
200   7,73 s   45.710 B   https://leela-landing.web.app/
200   2,06 s   79.831 B   https://leela-landing.web.app/meia-floripa-2026
200   1,43 s   40.205 B   https://leela-landing.web.app/meia-floripa-2026/inscricao
200   0,61 s        15 B  https://leela-landing.web.app/health
```

Os 7,7 s da home são o cold start de `minInstances: 0` — o mesmo número das lanes anteriores, não
regressão. A página do evento cresceu de 78.613 B para 79.831 B: é a faixa do cupom da B3.

### Prova 2 — o chunk da rota de inscrição trocou, e é BYTE A BYTE o que foi construído aqui

O chunk é content-addressed, então o nome É o hash do conteúdo:

- antes: `.../inscricao/page-**8581cec0538e410c**.js` (o que a KITCUPOM-BUILD deixou)
- depois: `.../inscricao/page-**ac6808a1385e2ca8**.js`

E o servido é o mesmo arquivo que saiu deste build — não "um build novo qualquer":

```
md5  d635c69729251361de93d7baf7d66782  (baixado de leela-landing.web.app)
md5  d635c69729251361de93d7baf7d66782  .firebase/leela-landing/hosting/.../page-ac6808a1385e2ca8.js
```

O chunk antigo passou a devolver o HTML de 404 (o release rotacionou de verdade).

### Prova 3 — marcadores ASCII no bundle novo

Cliente (chunk baixado do ar), com dois controles que NÃO podiam sumir:

| Marcador | Origem | Ocorrências |
|---|---|---|
| `(desconto aplicado)` | S1215-T2 · marca da linha de desconto | **1** |
| `do seu link` | S1215-T2 · cupom do link no resumo | **1** |
| `Atualizando o total` | CKUX-REV `f291f33` (controle) | 1 |
| `totalDefasado` | CKUX-REV (controle) | 2 |
| `Pagar ` | rótulo normal (controle) | 1 |

Servidor (`f68b22b` mora em `lib/leitor.ts`, que roda no `ssrleelalanding` e não é baixável). A
cadeia é: o marcador está no artefato construído, o artefato construído é o que foi empacotado, e o
empacotado subiu com *Successful update operation*.

| Marcador (minificado) | `apps/landing/.next/server/.../[eventSlug]/page.js` | `.firebase/leela-landing/functions/.next/...` |
|---|---|---|
| `size>=500` (teto de entradas do cache) | 1 | 1 |
| `!e.includes("/")` (régua do slug) | 1 | 1 |

Os dois arquivos têm o mesmo md5 (`94cc881aad65ec6ce2edb2e0ae0dc214`).

`f249f33` são duas linhas dentro do `removerCupom` (`assinaturaCotadaRef.current = null` +
`setCotacao(null)`): não deixam string para grep. Viajam no chunk cujo hash mudou e cuja identidade
byte a byte com o artefato local está provada acima, e estão cobertas por
`checkout-kitcupom-rev-remover.test.tsx` (4/4).

### Prova 4 — a X1 está servida (e o que ela NÃO fez)

Na página do evento no ar: `Grupo de corredores na largada` = **0**, `Corredores durante o percurso`
= **0**, `No percurso` = **0**, `Durante` = **2**. O vocabulário da X1 está no ar.

E o veredito que a fila pediu: **`Escolha seu percurso` = 2 ocorrências, vivas**. A X1 **não** pagou
o B8 — a **D3 é edição, não verificação**.

---
