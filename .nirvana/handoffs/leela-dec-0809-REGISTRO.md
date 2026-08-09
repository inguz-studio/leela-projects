# Handoff · DEC-0809-REGISTRO

**Trace:** `leela-dec-0809` · **Lane:** REGISTRO · **Employee:** `sf-cto` (software-forge)
**Data:** 2026-08-09 · **Duração:** ~50 min · **Branch:** `main`, a partir de `1fb9fd4a`

## O que a lane fez

Registrou a leva de quinze decisões que o dono respondeu em lote no chat em 09/08, e produziu a fila
de trabalho que ela gera. Dois arquivos, num diretório novo:

- `leela-specs/02-rodadas/2026-08-09-decisoes-dono/01-decisoes-dono.md`
- `leela-specs/02-rodadas/2026-08-09-decisoes-dono/02-fila-execucao.md`

## Coordenação de árvore respeitada

⛔ **O painel canônico não foi tocado.** `leela-specs/01-produto/DECISOES-ABERTAS.md` foi **lido**,
nunca escrito — a lane REV-CORTE estava viva no mesmo arquivo. O board, os épicos e os arquivos de
teste também ficaram intactos. Território desta lane: **um diretório novo, e nada mais**.
`git commit --only`, sem `--amend`, sem `stash`.

**A segunda lane, que o maestro sequencia depois da REV-CORTE:** retirar do painel os quinze itens
fechados e manter os cinco que continuam do dono. A fonte dela é o `01-decisoes-dono.md`, seção final
"O que esta rodada deixa para a próxima lane do painel".

## O placar

Quinze blocos cobrindo **vinte** linhas do painel. Quinze fecham, cinco continuam dele.

| | Linhas |
|---|---|
| Fecham | SERV-1, SERV-2, SERV-3, JUROS-3, JUROS-4, ESTOURO-1, SEMKIT-1, SEMKIT-2, PB-11, ARENA-1, ARENA-2, CLUBES-1, ADMIN-USUARIOS-1, ADMINSEP-3, 69 |
| Continuam com o dono | item 12, CRM-1, CRM-2, CRM-3, CRM-4 |
| Conferidas de passagem | JUROS-1 e JUROS-5, nas Ações |

O **SEMKIT-2** entra sem ter sido chamado pelo nome: a frase do dono sobre kit responde a pergunta
dele por inteiro. A inclusão está marcada como leitura do maestro, não como palavra dele.

## A fila gerada

Dez frentes. Parte A build direto (SEMKIT-REPARO ⚔, CLUBES-CTA, SERV-3-RENOME, JUROS-ALINHAMENTO ⚔
retido) · Parte B spec antes de build (ESTOURO-RESERVA ⚔, ADMIN-USUARIOS-FLUXO, ARENA-2-LISTA) ·
Parte C pesquisa (ICONES-BIBLIOTECA) · Parte D execução administrativa (CONTAS-DEMO) · Parte E só
regra (SEMKIT-2-REGRA).

## Achados de medição feitos nesta lane

Cinco fatos apurados contra o código e contra os registros, que mudam o tamanho ou a ordem de
tarefas já escritas:

1. **O checkout cobra juros em 2x e 3x, contra a decisão de hoje.** Price a 2,89% a.m. de `n = 2` em
   diante. Numa compra de R$ 300,00 em 3x a compradora paga R$ 105,83 por parcela e **R$ 317,49** no
   total, R$ 17,49 a mais que à vista. É dinheiro cobrado de gente real, em produção, agora.
2. **O modelo "até 3x sem juros" não é representável.** `InstallmentRules` tem taxa única
   (`commercialTerms.ts:36-43`). Só cabem `maxParcelas: 3 + jurosAoMes: 0` (mata 4x-12x) ou
   `jurosAoMes: 0 + maxParcelas: 12` (doze vezes por conta da plataforma). A terceira saída é um
   campo novo. **Pergunta ao dono.**
3. **A parcela mínima de R$ 10,00 já está em vigor.** `parcelaMinima: 10` no default
   (`commercialTerms.ts:210`), aplicada em `calc.ts:154`. Metade do SERV-2 não gera tarefa.
4. **A reserva do ESTOURO-1 depende de uma varredura que não existe.**
   `expirarCarrinhosAbandonados` roda de 5 em 5 minutos, mas cobre só a janela do carrinho;
   `expirarPixPendente` é `https.onCall` (`expirarPixPendente.ts:263`) e nunca roda sozinho. Sem
   agendá-la, um PIX abandonado segura a vaga para sempre.
5. **O expurgo de 06/08 não tocou em conta de Auth nenhuma.** `marina@demo-leela.dev` e
   `felipe@demo-leela.dev` seguem vivas com senha válida em produção, e a do preview está em texto
   claro no repositório. `admin@demo-leela.dev` **não existe mais como endereço** — foi renomeada
   para `inguzbuilders@gmail.com` no mesmo uid, então tentar apagá-la seria apagar o super-admin.

## Tensões marcadas para spec, não resolvidas aqui

**ADMIN-USUARIOS-1 × RN-510, a principal.** A RN-510 já sobe o aviso na primeira interação, contando
qualquer gesto sobre algo acionável (P11), inclusive por teclado (P12), e rearmando depois de fechado
(P14). O dono disse "tenta fazer alguma ação". Pode ser ratificação da regra que já existe, ou pode
ser **ação bloqueada**, e aí navegar pelo menu deixa de disparar o aviso — o que muda P11 e P14 e
derruba parte do que a REV-VITRINE mediu em 08/08. Registrada como pergunta, com as duas leituras e o
custo de cada uma.

Junto dela, duas que a mesma frase abriu: a **liberação direta** é caminho que a RN-510 não prevê (o
que tira a conta da vitrine sem resgate, o que o aviso passa a dizer, como a tela descobre que foi
liberada), e o **alcance do diretório** continua sem resposta.

**SERV-2.** O piso de R$ 10,00 vale sobre o total do pedido ou sobre o preço unitário. Com o piso no
total, um lote de R$ 6,00 sobrevive e passa a só poder ser comprado aos pares; no unitário, ele não
pode ser criado.

**ARENA-1 × LGPD-1.** A visibilidade social futura torna a frente jurídica **mais** necessária, não
menos: existe agora um plano declarado de expor perfil de participante, com um campo do art. 11 no
mesmo formulário (RN-472), e quem preencher sob "só você vê" não consentiu com "outras pessoas verão
no app". Somada à decisão do radar de WhatsApp de hoje cedo, o LGPD-1 fica com **três frentes**.

**JUROS-1 deixou de ser executável como está escrito.** Ele pede um save que selaria a v2 com 2,89%
em toda parcela, que é o que a decisão de hoje derruba para 1x-3x. Não executar antes da resposta.

## O que não foi feito, de propósito

⛔ Painel canônico, board, épicos, RNs e código: nada tocado. ⛔ Nenhum deploy, nenhum processo
pesado, nenhuma escrita em produção. ⛔ Nenhuma das três perguntas de dinheiro foi respondida por
default da esteira.
