# Handoff vivo · lane CKUX-REV · trace leela-build-2d6ee98d · 2026-08-02

Reviewer: sf-qa-engineer (software-forge), contexto fresco, sem participação na
construção. Brief: `.nirvana/briefs/leela-build-2d6ee98d-CKUX-REV-enriched.md`.
Alvo: pacote CHECKOUT-UX (handoff `.nirvana/handoffs/leela-build-2d6ee98d-CHECKOUT-UX.md`).
Base da suíte medida no início: **209/209** (`--pool=forks --singleFork`, 57 s).

## Veredito

**APROVADA COM RESSALVAS.** Dois defeitos confirmados nos vetores de dinheiro,
os dois consertados por cima com teste que falha antes e passa depois. Nenhum
deles invalida a lane: são janelas abertas pela própria mudança de tela do B1 e
pelo coalescing do B5, não erros no que eles se propuseram a corrigir.

## Defeitos confirmados

### D-1 · a cotação de uma seleção ABANDONADA aterrissava sobre a atual (B5)

Commit do fix: `bcf7df2`. Prova: `apps/landing/test/checkout-ckux-rev-cotacao.test.tsx`,
caso "voltar à seleção já cotada enquanto a outra está no ar não troca o total exibido".

O coalescing do `0d83e7c` só incrementa o número de sequência no ramo que
DISPARA cotação. O ramo de early-return — assinatura já cotada — devolve
`cotando` a `false` sem invalidar o que está no ar. Sequência:

1. PIX cotado (`assinaturaCotadaRef` = PIX).
2. Trocar para cartão e deixar passar o debounce: a chamada SAI.
3. Voltar para PIX antes de a resposta chegar: o efeito cai no early-return,
   não mexe na sequência.
4. A resposta do cartão chega e passa no teste de obsolescência.

Medido: com o radio de PIX marcado, a tela mostrava `Total: R$ 5.400,00` — o
preço do cartão. E não havia saída: nenhuma dependência do efeito muda quando a
resposta obsoleta aterrissa, então o número errado ficava até a próxima mudança
de preço. O mesmo `cotacao` alimenta o rótulo do botão de pagar.

Fix: a sequência sobe também no early-return. Voltar a uma assinatura já cotada
é exatamente o momento de invalidar o que está em voo — o `cotacao` que a tela
já tem É a resposta certa para aquela assinatura.

### D-2 · o botão de pagar oferecia o preço da seleção anterior (B1)

Commit do fix: `f291f33`. Prova: mesmo arquivo, caso "com a cotação nova no ar,
o botão não oferece o preço velho".

O B1 juntou resumo, parcelas e botão de pagar na mesma tela. Mexer no que move
preço passou a acontecer a um clique do ato de pagar, e a cotação nova custa os
200 ms de debounce mais o round-trip que a própria lane mediu em 1,7-9,8 s em
produção. Nessa janela o botão seguia habilitado com `Pagar {total}` montado
sobre a cotação ANTERIOR.

Reprodução: cartão à vista cotado (R$ 5.400,00) → trocar para 3x → esperar o
debounce. Botão habilitado dizendo "Pagar R$ 5.400,00"; o clique manda
`parcelas: 3`, que o servidor precifica como 3x. **A pessoa lê um valor e
autoriza outro.**

O PIX tinha a mesma doença por outro caminho: a auto-geração da cobrança (A-3)
não olhava para a cotação em voo, então o código PIX nascia com o preço NOVO
embaixo de um total ANTIGO — já com a cobrança criada.

Fix: `totalDefasado` (= cotação em voo) desabilita os dois botões de pagar, o
rótulo do cartão diz "Atualizando o total…" em vez de prometer um número, e a
auto-geração do PIX espera a cotação assentar.

Um teste existente foi ajustado, sem mudar asserção: o helper de cartão do
`checkout-asaas-teto` trocava de meio e pagava no mesmo instante, sem esperar a
cotação. Passa a esperar — que é o que o comprador faz.

## Premissas da construtora: o que caiu e o que sobreviveu

| # | Premissa | Veredito |
|---|---|---|
| 1 | Fix do A1 por idempotência, não por remoção de patch | **SOBREVIVE.** Ver leitura do A1 abaixo. |
| 2 | `FLORIPARUN10` com escopo `geral` | **SOBREVIVE** (não re-testada em produção; raciocínio sobre `club_parceiro` confere com o código do checkout). |
| 3 | Relógio dos seeds relativos era da mesma família | **SOBREVIVE.** |
| 4 | C1 não toca texto legal nem a marca da home | Superada pelos fatos: o texto legal foi tratado depois em `4735e39` (C1-LEGAL). |
| 5 | C2 unifica a home em `max-w-5xl` | **SOBREVIVE** (decisão de gosto, fora do meu mandato). |
| 6 | C3 não toca o `RadioGroup`/`RadioCard` do DS | **SOBREVIVE.** |

## A1 · o que a re-datação aguenta e o que não foi provado

Vetores do contrato, um a um:

- **Re-seed sobre estado já re-datado — NÃO corrompe.** Varri os seeds: todos
  leem o documento existente apenas para consultar `snap.exists` (decidir se
  grava `criadoEm`); nenhum lê VALOR gravado para reescrever. Toda escrita parte
  das constantes-fonte, então rodar N vezes aplica o offset de hoje uma vez, não
  N vezes.
- **Idempotência não mente na topologia real.** O marcador é posto no objeto de
  SAÍDA, nunca no payload de entrada — payloads compartilhados entre duas
  escritas na mesma execução continuam sendo re-datados uma vez cada. O
  "Not-tested" registrado no commit `574abaa` (mesmo objeto em dois documentos
  viraria no-op) descreve um risco que o código não tem.
- **Relógio na fronteira — sem defeito.** `offsetDias` compara componentes de
  calendário local contra `Date.UTC` de referência: sempre dias inteiros, e o
  offset é calculado UMA vez na carga do módulo, então uma execução que cruze a
  meia-noite não muda de offset no meio.
- **O dry-run não é teatro** — mas também não é gate. O espião é instalado em
  `WriteBatch.prototype.set` ANTES do patch de produção, então ele captura o
  payload depois dos dois patches: é o caminho real da lib, como o handoff
  afirma. O que não se sustenta é a durabilidade da prova (ver ressalva R-1).

## Ressalvas (suspeita não reproduzida ou risco fora do meu mandato de fix)

- **R-1 · a prova do A1 não é executável por ninguém além de quem a escreveu.**
  `functions/scripts/**` está fora de tudo: o vitest do functions inclui só
  `src/**/*.test.ts`, o lint roda `eslint src`, o `tsconfig` de build não cobre
  scripts e nenhum `package.json` chama `redate-dry-run.ts`. Uma regressão em
  `redate.ts` — que decide as datas de TODO o dado de produção — não é pega por
  nenhum gate. O controle negativo é ainda mais frágil: só existe editando
  `jaRedatado` para `false` à mão, então não é reproduzível. Recomendação:
  `redate.ts` vira `functions/src/seed/redate.ts` (dentro do include do vitest)
  com um teste de comportamento, ou o dry-run entra num script de `test:seed`.
  Não consertei: mexer no layout de `functions/scripts` é decisão de arquitetura
  do CTO, não de reviewer.
- **R-2 · `aplicarCupom` não passa por número de sequência nenhum.** Ele cota
  por fora do efeito e escreve `cotacao`/`assinaturaCotadaRef` na volta, usando
  a assinatura da closure. Se a pessoa trocar de kit enquanto o cupom está no
  ar, a resposta do cupom aterrissa com o preço da seleção antiga. O sistema se
  cura sozinho (a assinatura vigente passa a divergir e o efeito recota), e
  `cotando` fica alto durante a correção, então o D-2 já impede o clique — mas
  o caminho continua sem a proteção que o efeito tem. Não reproduzi o desfecho
  ruim depois do fix do D-2; fica como ressalva, não como defeito.
- **R-3 · desmarcar aceite depois da cobrança criada não desfaz nada.** Os
  checkboxes travam quando `charge !== null`, o que é coerente com a prova
  carimbada in-tx — só registro que a UI não oferece caminho de arrependimento
  ali, e o único caminho é a expiração do PIX.
- **R-5 · o fix do D-2 estreita o caminho se `cotando` ficar preso alto.** Com
  `totalDefasado`, o botão-fallback "Gerar código PIX" também fica desabilitado
  — antes ele era a saída manual quando a auto-geração não vinha. Procurei o
  estado em que `cotando` fica alto para sempre no passo PAGAR e **não achei**:
  o guard de topo do efeito (`!precisaCotar || !podeCotar || cupomUrlPendente`)
  é o único caminho que deixa `cotando` alto sem disparar chamada, e nenhuma
  das três condições vira falsa estando no PAGAR (não dá para remover inscrito
  nem perder modalidade a partir dessa tela). Não consertei o que não
  reproduzi; registro a condição exata para quem mexer no efeito: **se um
  caminho novo puder desligar `precisaCotar`/`podeCotar` com o comprador no
  PAGAR, o guard de topo precisa zerar `cotando` junto.**
- **R-6 · ViaCEP lento mantém os campos revelados porém `disabled`.** O teto do
  lookup é 6 s e os campos de endereço ficam desabilitados durante a espera. Não
  é beco (depois do teto o estado vira `falha` e libera tudo, provado com o
  `fetch` rejeitando), mas são até 6 s de campos visíveis e inertes.
- **R-4 · rolagem do B6/B7 continua sem prova de comportamento real.** O código
  só garante que a ausência de `scrollIntoView`/`scrollTo` não derruba a compra
  (jsdom não implementa nenhum dos dois). O "Not-tested" do `8c28f59` é honesto
  e continua valendo.

## Fatos operacionais

- **O deploy da landing ficou DEFASADO.** Os dois fixes tocam
  `CheckoutFlow.tsx` e `StepPagamento.tsx` — código servido pela landing, cuja
  última revisão no ar é `806475ae3b089041` (deploy de hoje, commit `9fbebb7`).
  Não deployei: decisão do maestro.
- Sem push, como pedido.

## Itens novos para o painel do dono

- **Item 64 (novo, `DECISOES-ABERTAS.md`)** — o botão de pagar ganhou o estado
  "Atualizando o total…" e para de aceitar clique enquanto o total é
  recalculado. A regra não é negociável (é a que impede ler um valor e
  autorizar outro); o que fica com o dono é a **palavra**, que troca em uma
  linha.
- Nada mais nasceu como decisão de dono. R-1 (o `functions/scripts` fora de
  todos os gates) é decisão de engenharia do CTO, não do dono.

## Commits desta lane (sem push)

1. `bcf7df2` — fix D-1 · a cotação da seleção abandonada não aterrissa mais.
2. `f291f33` — fix D-2 · o botão de pagar não oferece mais o preço anterior.
3. `17cc89c` — guarda de regressão para B3 e B8.
4. *(este)* — handoff + boards (kanban, checklist, painel de decisões).

## Suíte

- Base no início: 209/209 em 20 arquivos.
- Fim: **214/214 em 21 arquivos** (`--pool=forks --poolOptions.forks.singleFork=true`).
- `tsc --noEmit` da landing → exit 0. `eslint app lib test --max-warnings 0` → exit 0.
- Zero flake observado: a suíte cheia rodou 3× em single-fork nesta lane, sempre verde.
