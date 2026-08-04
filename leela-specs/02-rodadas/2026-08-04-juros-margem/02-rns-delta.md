---
tags: [leela, rn, regras-de-negocio, rodada, juros, margem, parcelamento, admin]
trace: leela-build-2d6ee98d
lane: SPEC-JUROS-MARGEM
data: 2026-08-04
historia: LEELA-S1610
---

# 02-rns-delta · a economia do parcelamento

> Delta de RN da lane SPEC-JUROS-MARGEM. O enunciado canônico de cada regra vive no épico
> dono, consolidado na mesma aterrissagem ([[CONVENCAO-BOARDS]] §2). Este arquivo é o delta
> do dia e diz para onde cada uma foi.

## Prova de não colisão

A faixa mais alta com enunciado é a **RN-453**, criada em 04/08 pela lane SPEC-ADMINSEP e
registrada em [[indice-de-regras-de-negocio]]. Varredura por `RN-45[4-9]` sobre
`leela-specs/`, `functions/`, `packages/` e `apps/`: os únicos hits são as citações que a
própria spec desta lane já fazia a RN-455, RN-457 e RN-459, escritas antes de as regras
existirem. Nenhuma outra ocorrência.

O **RN-460** fica de fora de propósito. Ele é um dos seis números que existem só como
marcador de faixa e nunca receberam enunciado, e ressuscitá-lo agora quebraria a leitura de
quem confia no índice. **Esta lane consome RN-454 a RN-459.**

## Novas

| RN | Regra | Épico dono | Lane |
|---|---|---|---|
| **RN-454** | **Custo, markup e margem são três números distintos, com fonte única no core.** *Custo* é o que o gateway cobra da Leela por processar a venda naquele número de parcelas. *Markup* é o que a Leela acrescenta ao preço por financiar, e hoje é o juro do parcelamento. *Margem* é o que sobra: markup menos o custo **incremental** sobre a venda em 1x. As três derivam de `buildInstallmentOptions` e de `computeTaxaPlataforma` em `packages/core/src/finance/economiaParcelamento.ts`, que é a única autoridade. Nenhuma tela, Function ou relatório recalcula dinheiro por conta própria — mesma disciplina que `cotarInscricaoCheckout` já impõe ao juro. Três invariantes: `markup(1) = 0`, `margem(1) = 0` e **`margem(n)` pode ser negativa e nunca é zerada nem escondida**. A palavra "taxa" fica reservada à taxa da plataforma (RN-178), que incide no face, não depende de parcelas e nunca é somada ao markup. | E09 (dona) · E16 (consome) | SPEC-JUROS-MARGEM |
| **RN-455** | **A tabela de custo do gateway é dado configurável, global, e nasce marcada como estimativa.** Vive em `platform/config.custoGateway`, por meio de pagamento e por número de parcelas, no par `{percentual, fixoCentavos}` que a RN-178 já usa, mais `origem: 'estimativa' \| 'contrato'` e `atualizadoEm`. **Nenhum valor de custo em constante de código**, pela mesma razão da RN-183. Escrita exclusiva do `platform_admin` (RN-404): escrita vinda de `tenant_owner` ou de cliente é negada pelas Rules com `permission-denied`, e percentual fora de `[0, 100]` ou fixo negativo é recusado na validação com `invalid-argument`. **Sem dado não há margem:** quando a linha do meio/parcela está ausente, a tela declara "custo não configurado" e a coluna Margem fica **vazia** — nunca zero, nunca estimativa silenciosa. A tabela é global e **não** tem override por tenant: o custo é o contrato da Leela com o gateway e não muda porque o produtor mudou (P3). | E16 (dona) · E09 (consome) | SPEC-JUROS-MARGEM |
| **RN-456** | **O total parcelado é dividido em centavos exatos, e o resíduo mora na última parcela.** Com `jurosAoMes = 0`, `totalParcelado(n) = totalAVista` para todo `n` ofertável: não há o que financiar, então nenhum centavo nasce do arredondamento. A divisão é `base = floor(totalCentavos ÷ n)`, `resto = totalCentavos − base × n`, parcelas `1..n−1` valendo `base` e a parcela `n` valendo `base + resto`. A maior é a última porque é o que o gateway faz: o adapter manda `installmentCount` mais `totalValue` e o Asaas divide ajustando a última (`05-discovery/asaas-api-reference.md:119`). Com `jurosAoMes > 0` a **RN-436 fica intacta**, byte a byte, incluindo os R$ 359,28 de R$ 300,00 em 12x. O piso do principal permanece no código e vira inalcançável no ramo de juros zero (P6). Invariante server-side: uma opção cujo somatório de parcelas difira do `valorTotal` é defeito do servidor, não erro do cliente, e a cotação recusa com `internal`. A parcela mínima do termo passa a ser conferida contra a **menor** parcela (P8). | E04 (dona) · E12 (consome) | SPEC-JUROS-MARGEM |
| **RN-457** | **A linha de juros mostra juro contratado, nunca resíduo de arredondamento.** `jurosParcelamento` continua sendo `totalCobrado − totalComprador`, calculado no servidor, e continua não sendo receita do organizador (RN-437). O que muda é que, pela RN-456, ele passa a ser **zero por construção** sempre que o juro contratado é zero. A guarda de renderização já existe e não é o conserto: as duas telas só desenham a linha quando o valor é maior que zero (`StepResumo.tsx:397`, `StepConfirmacao.tsx:162`). O defeito estava a montante, no cálculo. Falsificação: qualquer par `(valor, n)` com `jurosAoMes = 0` que devolva `jurosParcelamento > 0` reprova a regra. Apresentação: quando todas as parcelas são iguais, a opção diz `n x de R$ X,XX`; quando a última difere, diz `n x de R$ X,XX (última R$ Y,YY)`, sem asterisco e sem "aproximadamente". O comentário `ACHADOS-REV` que hoje deixa o resíduo na mesa do dono (`cotarInscricaoCheckout.ts:137-144`) é substituído pela decisão PB-2 na mesma aterrissagem. | E12 (dona) · E09 (consome) | SPEC-JUROS-MARGEM |
| **RN-458** | **"Sem juros" é liberação do admin da plataforma, por tenant, e nunca escolha do produtor.** Campo `commercialTerms/current.parcelamentoSemJuros?: { ateParcelas: number, custoAbsorvidoPor: 'plataforma' \| 'produtor' }`. Ausência significa desligado, que é o estado de todo tenant hoje. `ateParcelas: 6` zera o juro de 2x a 6x e devolve o `jurosAoMes` do termo de 7x em diante. Escrita exclusiva do `platform_admin` (RN-404): tentativa vinda de `tenant_owner` é negada com `permission-denied`, e `ateParcelas` não inteiro ou fora de `[2, maxParcelas]` é recusado com `invalid-argument`. **Não existe campo equivalente no evento, no lote nem em tela alguma do organizador**, e a ausência desse caminho é a regra, não um detalhe de implementação. Na tela do comprador, o total das opções sem juro é **exatamente** o total à vista pela RN-456, e a frase "sem juros" nunca aparece quando o total difere do à vista, nem por um centavo. **Contrato especificado, construção não priorizada** — não há tarefa na fila desta história. | E16 (dona) · E12 (consome) | SPEC-JUROS-MARGEM |
| **RN-459** | **O custo é carimbado na venda, no mesmo instante em que a taxa já é carimbada.** Espelha a RN-179 e existe pela mesma razão: `platform/config` não é versionado, então trocar a tabela de custo reescreveria retroativamente a margem de toda venda passada, e o dono leria o faturamento de junho com o custo de agosto. No ato da compra, o par `{percentual, fixoCentavos}` do meio e do número de parcelas escolhidos é resolvido e carimbado ao lado da taxa, em `conciliacao`, junto de `custoOrigem` (`'estimativa' \| 'contrato'`). **Mudança da tabela nunca reprecifica nem re-margina pedido existente.** Falsificação: alterar `custoGateway` depois de uma venda e reler a margem daquela venda tem de devolver o número anterior. Junto vem a captura do custo real: o `netValue` do webhook passa a ser registrado como campo de **observação**, sem entrar no cross-check de integridade, que continua usando `payment.value` (`asaasProvider.ts:1506-1508`). É a diferença entre `value` e `netValue` que torna a margem apurável em vez de apenas estimada. | E09 (dona) · E16 (consome) | SPEC-JUROS-MARGEM |

## Ampliadas e reconciliadas (sem número novo)

- **RN-436** — inalterada no ramo com juros. A ordem normativa continua sendo arredondar a
  parcela e multiplicar. A RN-456 acrescenta o ramo de juros zero, que a RN-436 nunca tratou
  explicitamente, e é lá que o resíduo nascia.
- **RN-178 e RN-179** — inalteradas. A taxa da plataforma segue sendo outra conta, resolvida
  por meio de pagamento e congelada na compra. A RN-459 copia o mecanismo dela para o custo,
  sem mexer no original.
- **RN-183** — inalterada e reafirmada. Toda a aritmética nova opera em centavos inteiros com
  half-up, e a fonte de cálculo é função do core sem constante embutida.
- **RN-404** — inalterada, e é ela que sustenta a resposta a "quem edita o quê". O produtor
  não escreve `commercialTerms` hoje, não passa a escrever com a RN-458, e a tela de termos
  já abre em modo leitura para `tenant_owner`.
- **RN-410** — inalterada. O campo `anticipation` continua existindo com a mecânica pós-V1, o
  `custoPct` continua sem interface e o toggle continua desabilitado. Nada nesta rodada o
  desperta.
- **RN-437** — inalterada e agora com par. O juro não é receita do organizador; por simetria,
  o custo de parcelar não é despesa dele. É esse par que sustenta o default proposto no
  **JUROS-3**.
- **`tabelaTaxasParcela`** — não é regra e não vira uma. O campo tem modelo, validação, Rules
  e interface completa de 2x a 12x no modal de planos, e o checkout nunca o consome. A
  economia nova **não** é pendurada nele (P5); ele ganha aviso de campo inerte na mesma
  aterrissagem e a aposentadoria entra como dívida, fora desta história.

## Onde cada uma foi consolidada

| RN | Épico |
|---|---|
| RN-454, RN-459 | [[LEELA-E09-financeiro-profissional]] |
| RN-455, RN-458 | [[LEELA-E16-plataforma-superadmin]] |
| RN-456 | [[LEELA-E04-config-vendas]] |
| RN-457 | [[LEELA-E12-landing]] |

## Vizinhos

`01-spec-economia-parcelamento.md` para o modelo econômico inteiro, a tela e as lacunas.
`03-fila-codigo.md` para a fila executável. [[indice-de-regras-de-negocio]] para onde mora
cada faixa.
