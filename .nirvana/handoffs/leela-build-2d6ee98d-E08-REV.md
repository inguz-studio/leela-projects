# Handoff · Lane E08-REV (review antagonista) · trace leela-build-2d6ee98d

- **Employee:** `sf-cto` (software-forge), contexto fresco — não produziu o código.
- **Alvo:** 6 commits da E08-REPASSE (`1cd6274`, `3b063d4`, `8be358b`, `444effc`,
  `684501e`, `845c817`). Repo `C:\dev\LEELA`, branch `main`.
- **Veredito:** **APROVADA COM RESSALVAS.** Posição 2 da fila FECHADA.

## Veredito por vetor

| # | Vetor | Veredito | Prova |
|---|---|---|---|
| 1 | digest sha256 como docId do log | **CORRETO** · spec corrigida | `avisoAfiliadoChave.test.ts` 11/11 |
| 2 | recruzamento cala o 2º e-mail | **CORRETO** | H2 (3 recruzamentos = 1 e-mail) |
| 3 | replay avisa pelo ledger | **CORRETO** | H1 (input adulterado 25 → e-mail 10) |
| 4 | guarda da tela × core | **core é a lei** · 1 achado ALTO na tela | H3 (9 valores) + F3 |
| 5 | fixes do modal + hazard latente | **fixes mordem** · sem hazard no `SolicitarRepasseModal` | F1, F2 |
| 6 | TRIAGEM CK2-T5 | **contrato morto** → teste atualizado | `6b1d7c4` |
| 7 | zero asserção removida | **confirmado** | auditoria do diff |

## Commits desta review

| Commit | O que |
|---|---|
| `6b1d7c4` | CK2-T5: pagamento sobre PIX vencido volta ao comprador (RN-379), com extrato + ledger órfão + segunda entrega sem segundo refund |
| `2ed4ba8` | H1/H2/H3 na `afiliados.integration` + `avisoAfiliadoChave.test.ts` (trava da chave) |
| (este) | RN-386 corrigida no épico E08 + boards + handoff |

## Falsificações (aplicadas sem commit, revertidas)

| # | O que desliguei | Efeito |
|---|---|---|
| F1 | `type="text"` → `type="number"` no campo de valor | **3/14 vermelhos** |
| F2 | `fecharRepasse` memoizado → handler inline | **3/14 vermelhos** |
| F3 | `validarSolicitacao` neutralizado em `avaliarRepasse` | **7/28 vermelhos** |

Os três fixes da lane são load-bearing e testados.

## Achados escalados ao maestro

- **A-1 (ALTO):** `parseValorRepasse("1.500")` = **1.5**, `podeEnviar: true`.
  Separador de milhar pt-BR vira centavo — o organizador registra R$ 1,50 onde
  pagou R$ 1.500,00. NÃO consertei: a correção exige escolher semântica de parse
  para `"10.005"` (R$ 10.005,00 × três casas), e o contrato atual já reprova
  `10.005` com teste. Pede **máscara de dinheiro** no campo — decisão de produto.
  Mitigação vigente: o `ConfirmModal` mostra o valor parseado antes do clique
  ("R$ 1,50 do saldo em aberto (restam R$ 1.498,50)").
- **A-2 (MÉDIO):** `"1.234,56"` e `"R$ 1.234,56"` colados → `valor: null` com
  `hint: null` — o campo fica sem mensagem nenhuma (o clique cai num toast
  genérico). O formato colado é o que a própria tela imprime no extrato.
- **A-3 (BAIXO):** `"1e3"` aceito como R$ 1.000,00.
- **A-4 (informativo):** `SolicitarRepasseModal` (repasse do organizador) segue
  com `type="number"` e, em jsdom, engole o separador decimal — só dá para digitar
  inteiros. Território de outra lane; não toquei.

## Gates (comando + número literal)

| Gate | Exit / resultado |
|---|---|
| core lint · tsc · build (tsup) | 0 · 0 · 0 |
| functions build · lint · tsc | 0 · 0 · 0 |
| painel tsc · lint | 0 · 0 |
| painel · influenciadores + comunicação | **68/68** (7 arquivos) |
| emulador exclusivo 8080/9099 · 9 suítes | **184/184** · exit 0 |
| — CK2 (era 23/24 com o vermelho pré-existente) | **24/24** |
| — afiliados.integration (33 → 36 com H1/H2/H3) | **36/36** |
| — estornoOrfao (não regrediu com a mudança do CK2) | **5/5** |

## Disciplina

Preview do dono (3000/5273/8180) intocado e NO AR o tempo todo. Emulador
exclusivo por `emulators:exec --only firestore,auth --project demo-leela`
(8080/9099), build de functions antes; core tocado ⇒ `tsup` antes da suíte do
painel. Sem re-seed, sem navegador, sem rede real. `BREVO_API_KEY` e
`ASAAS_API_KEY` seguem vazias — o `EmailProvider` entra por injeção.
`git fetch` antes de cada commit; `HEAD..origin/main` = 0 nas três aterrissagens.
`leela-specs/01-produto/DECISOES-ABERTAS.md` estava modificado no tree desde o
início — é o painel do maestro, **não toquei**.
