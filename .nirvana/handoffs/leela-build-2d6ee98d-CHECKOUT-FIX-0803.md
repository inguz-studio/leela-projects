# CHECKOUT-FIX-0803 — os três achados do dono no parcelamento vivo

- **Trace:** `leela-build-2d6ee98d`
- **Lane:** CHECKOUT-FIX-0803 (`sf-frontend-lead`, software-forge)
- **Autoridade:** `leela-specs/02-rodadas/2026-08-02-retomada/08-achados-dono-0803.md`
- **Base:** `main` @ `b7b3f823`
- **Território:** `apps/landing/app/(public)/[eventSlug]/inscricao/checkout/` — functions NÃO mudam nesta lane.

Handoff vivo: cada task escreve aqui na aterrissagem.

---

## C1-0803 · total instantâneo — PAGA

**Commit:** `d8391a5a` · `fix(checkout): o total muda no ato da escolha entre opções já cotadas [leela-build-2d6ee98d]`

### O que estava errado

Verbatim do dono: *"sub total, nao altera imediatamente, quando eu faço a seleção."*

O total exibido saía direto de `cotacao.totalCobrado`, e `cotacao` só mudava quando
a cotação NOVA voltava do servidor: 200 ms de debounce mais 1,7-9,8 s de round-trip
(medidos em produção). No meio disso a guarda do item 64 (`totalDefasado={cotando}`)
travava o botão em "Atualizando o total…".

A causa não era a espera: era pedir de novo o que o servidor já tinha mandado. A
cotação chega com a **escada inteira** (`opcoesParcelamento`: parcelas, valorParcela e
valorTotal de cada opção ofertável) e com o total à vista de cada meio
(`totaisPorMeio`). Trocar entre opções já cotadas é releitura, não round-trip.

### O que passou a valer

`projetarCotacao` (puro, em `CheckoutFlow.tsx`) devolve a cotação que responde pela
seleção de AGORA, montada só com números que o servidor calculou:

- **parcelas** — a opção sai de `opcoesParcelamento` (`valorTotal` vira `totalCobrado`,
  `valorParcela` vira a linha de parcela). Zero aritmética.
- **meio** — projetável apenas quando os dois totais por meio existem e são **iguais**
  (taxa incorporada, ou repassada com a mesma taxa nos dois meios), porque aí a
  composição do resumo não muda. Com totais diferentes a projeção se recusa: derivar a
  linha "Taxa de serviço" (total do meio − valorFinal) criaria a segunda autoridade
  sobre dinheiro que a RN-437 proíbe.
- **juro** — acompanha a projeção só quando é fato do contrato (à vista = 0) ou quando a
  parcela projetada é a mesma que o servidor cotou. Nos demais casos a linha some até a
  cotação nova chegar, em vez de exibir o juro de outra parcela ao lado do total certo.

A régua que autoriza a projeção é a **base de preço** (`evento | seleção | cupom`), agora
guardada em estado (`baseCotada`) ao lado da cotação. Base diferente = o valor de face
mudou = nenhuma projeção responde.

`totalDefasado` deixou de ser `cotando` e passou a ser `cotando && cotacaoExibida === null`:
o item 64 continua exato — botão travado com cotação NOVA em voo — e para de disparar
onde não há preço novo a esperar.

### Gates

| Gate | Resultado |
|---|---|
| `tsc --noEmit` (landing) | 0 erros |
| `eslint app lib --max-warnings 0` | 0 |
| Suíte da landing (processo único) | **427/427** (38 arquivos) |
| Regressão reprova a versão anterior | **5/7** casos do arquivo novo falham em `b7b3f823` |

### Falsificações (dinheiro)

| Vetor | Resultado |
|---|---|
| O que o botão prometeu é o que vai ao servidor (`parcelas: 3` com o total de 3x no rótulo) | PASS |
| Mudar a seleção de ITENS com cotação presa no ar ⇒ guarda dispara, botão travado | PASS |
| Trocar de MEIO com totais diferentes por meio ⇒ guarda dispara, botão travado | PASS |
| Cotação de 3x que NUNCA volta ⇒ botão promete o total de 3x da escada, habilitado | PASS |

### Arquivos

- `apps/landing/app/(public)/[eventSlug]/inscricao/checkout/CheckoutFlow.tsx`
- `apps/landing/test/checkout-dec0803-total-instantaneo.test.tsx` (novo, 7 casos)
- `apps/landing/test/checkout-ckux-rev-cotacao.test.tsx` (B1 refinado — ver abaixo)

### Supersede registrado

`CKUX-REV · B1` media "o botão não oferece o preço velho" com um mock em que o total de
3x era **igual** ao de 1x — impossível distinguir "prometeu o preço velho" de "já leu o
preço da opção nova". O mock passou a ter escada real e o caso passou a exigir o que o
B1 sempre quis dizer: o rótulo mostra o total de 3x, nunca o de 1x, e é `parcelas: 3`
que vai ao servidor.

### Premissas vetáveis

1. **Troca de meio com taxa que varia por meio continua esperando a cotação.** A tela
   projeta o total, não a composição; a linha de taxa do outro meio não vem pronta na
   resposta. Alternativa (fora desta lane, mexe em functions): `cotarInscricaoCheckout`
   devolver `taxaServico` por meio ao lado de `totaisPorMeio`.
2. **A linha "Juros do parcelamento" some por alguns segundos** ao trocar para uma
   parcela > 1 diferente da cotada, até a cotação nova aterrissar. Alternativa (mexe em
   functions): cada opção da escada carregar o próprio juro.
