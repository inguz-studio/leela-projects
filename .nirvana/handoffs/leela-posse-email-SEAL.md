---
lane: SEAL-POSSE-EMAIL
trace: leela-pixreal-diag-20260804
employee: sf-cto (software-forge)
data: 2026-08-05
territorio: leela-specs/
codigo: nenhum
---

# SEAL-POSSE-EMAIL · o item saiu do painel e a C2 saiu do gate

Lane de documento. Zero código, zero mutação, zero deploy, nenhum arquivo tocado fora de
`leela-specs/`. Três lanes estavam em voo durante a execução — `BUILD-LOTES-UX` em
`apps/painel`, `BUILD-MOTION` em `apps/landing` e `packages/design-system`, e
`BUILD-CONTAS-MOTOR` em `functions/` e `packages/core` — e o commit foi feito com `--only`
sobre os oito arquivos desta lane.

## A autorização

**Verbatim do dono:** *"pode aplicar o POSSE-EMAIL-1 na mesma onda."*

A onda são os dois fluxos de conta com código de seis dígitos, spec `7a2a2b26`
(`02-rodadas/2026-08-05-contas-landing/`).

**Ratificação de passagem, verbatim:** *"a taxa minima ficou por pedido mesmo né? nao por
ingresso"* — confirmado, por pedido. A RN-491 nasceu assim, e a unidade é certa por medição:
a taxa é calculada uma vez sobre o `valorFinal` do pedido depois do cupom
(`packages/core/src/checkout/saleState.ts:369-371`). Registrada no lugar onde a decisão mora,
`02-rodadas/2026-08-05-metricas-e-servico/01-decisoes-dono.md` §"Correção posterior".

## Onde o registro aterrissou

O item saiu do painel pela disciplina de limpeza, e o registro completo vive na rodada de
contas: `leela-specs/02-rodadas/2026-08-05-contas-landing/01-decisoes-dono.md`, seção
**"Fechamento do POSSE-EMAIL-1"**, com quatro partes.

1. **O verbatim** da autorização, junto das outras quatro falas da mesma conversa.
2. **A exposição, como a REV-AREACLIENTE a mediu** — a cadeia inteira (cadastro aberto sem
   verificação → compra da vítima → `contaSemFriccao.ts:203` carimba o vínculo na conta do
   primeiro → área nega, Rule permite), com o atenuante que põe a severidade em média
   (o `pedidoId` não é enumerável) e o agravante que já tinha sido removido pelo fix D1.
3. **A correção exata** — `&& request.auth.token.email_verified == true` só no ramo (b).
4. **O argumento que destravou**, escrito por extenso porque é o que faz a decisão fazer
   sentido daqui a três meses: exigir `email_verified` hoje trancaria quem comprou e nunca
   verificou; com o código essa pessoa passa a ter caminho próprio até a senha (RN-476
   carimba `emailVerified` no mesmo gesto), então o remédio deixa de ter efeito colateral. A
   metade do atacante morre na origem pela RN-478, porque nenhuma conta nasce antes da prova.

O que sobra também está escrito: o vínculo por igualdade de e-mail continua no
`contaSemFriccao.ts:203`, e o `/cadastrar` do painel continua criando conta sem verificação,
que é matéria do **CONTA-2**.

## Estado da C2

`S1230-T4`, em `02-rodadas/2026-08-05-contas-landing/04-fila-codigo.md`. **AUTORIZADA**, a
marcação GATED caiu. A dependência que resta é técnica: vai atrás da **A4** (`S1229-T4`), que
é quem carimba `emailVerified`.

⛔ **A fronteira está escrita em cinco lugares.** A condição entra **só no ramo (b)** de
`ehCompradorDoPedido()`, o do vínculo por conta (`contaSemFriccao.contaUid`). O ramo (a) é o
`responsavel.atletaId`, uid da sessão **anônima** do checkout, que por construção não tem
`email_verified`: a condição ali quebraria a **S1225-T3**, que está em produção. O caso 6 da
suíte da BUILD-A4 fica vermelho se alguém mover a fronteira.

## Nota durável no épico

`03-canon/epics/LEELA-E12-landing.md`, ao lado da diretriz permanente da projeção do pedido
(RN-469): a fronteira de posse passa a ser exigida no ramo (b) a partir desta onda, com o
apontamento para a RN-476, a RN-478 e a tarefa C2. A diretriz permanente **não muda de forma**
— campo novo continua nascendo visível ao comprador; o que muda é quem é o comprador aos olhos
da Rule pelo ramo (b).

## Referências cruzadas consertadas na mesma passada

Sete, todas por afirmarem que o item continuava com o dono ou que a C2 continuava gated:

| Arquivo | O que dizia |
|---|---|
| `01-produto/DECISOES-ABERTAS.md` §CONTA-2 | citava "a metade do POSSE-EMAIL-1" como item vivo |
| `01-produto/DECISOES-ABERTAS.md` §TROCA-EMAIL-1 | "seria o POSSE-EMAIL-1 ao contrário", sem dizer que ele fechou |
| `02-rodadas/…/02-spec-contas-landing.md` §Parte 6 e §resumo | "a ratificação continua sendo do dono, no painel" |
| `02-rodadas/…/03-rns-delta.md` §RN-469 | "é recomendação e depende da ratificação do dono" |
| `03-canon/epics/LEELA-E00-fundacao-tecnica.md` §RN-469 | "é recomendação e espera o dono" |
| `03-canon/epics/LEELA-E12-landing.md` §tasks S1230 e §"o que não faz" | "gated pelo POSSE-EMAIL-1, sem partir sem o dono" |
| `00-boards/BOARD-EPICOS.md` linha E00 | "fica com o dono: … a ratificação do POSSE-EMAIL-1" |

## Verificação antes de fechar

- **ADMINSEP-2 e ADMINSEP-3 continuam abertos e intocados**, nas linhas 28 e 377 do painel.
  Nenhum dos dois dependia do POSSE-EMAIL-1.
- **Nenhum outro item do painel dependia dele** além das duas referências de linguagem já
  consertadas (CONTA-2 e TROCA-EMAIL-1). O `ADMIN-VE-AREA-1`, que cita o ADMINSEP-2, não foi
  tocado.
- O painel foi de **61 para 60** itens.

## Boards

`V1-KANBAN.md` — a linha da tarefa, no padrão épico → história → tarefa: o card
"[E12/E00] O modal ganha duas portas…" → **S1230** → **S1230-T4**, que passou a registrar a
autorização, a dependência real (S1229-T4) e a fronteira do ramo (a). O "fica com você" do
card perdeu a ratificação já dada.

`V1-CHECKLIST.md` — a linha `LEELA-S1230-T4` perdeu o GATED, e a linha `SPEC-CONTAS-LANDING`
ganhou o fechamento, no mesmo formato do fechamento do ADMINSEP-1.
