---
tags: [leela, fila, rodada, metricas, inscritos, conversao, servico, piso, renome]
trace: leela-pixreal-diag-20260804
lote: SPEC-METRICAS-SERVICO
data: 2026-08-05
---

# 04-fila-codigo · O inscrito pagante, o piso do Serviço e o renome

> Quatro frentes, em ordem de risco crescente. Regras em `03-rns-delta.md`, canônicas nos épicos;
> spec em `02-spec-metricas-e-servico.md`. A fila da rodada de pós-pagamento
> (`../2026-08-04-pos-pagamento/04-fila-codigo.md`) continua valendo linha a linha — esta fila
> não a reordena.
>
> **A marca ⚔ está onde a tarefa toca dinheiro congelado ou o contador que congela configuração
> de evento.** São seis das dezesseis. Nenhuma delas sobe sem review antagonista em contexto
> fresco.
>
> **Nada aqui é retroativo.** O piso vale para compras futuras; nenhuma venda já cobrada é
> recalculada. A tabela do piso nasce **vazia**, então a Frente 3 pode subir inteira sem mudar um
> centavo em produção — o comportamento novo só começa quando o `platform_admin` configurar o
> valor na tela.

## Frente 1 · o texto que sai (E09 · S908, parte 1) — primeiro da fila

Barata, isolada e sem efeito em dinheiro. Vale ir primeiro para tirar do ar a única ocorrência
visível de "Taxa Leela" e o campo com a marca anterior.

| # | Task | O que faz | Território | Dep | Rota | ⚔ |
|---|---|---|---|---|---|---|
| 1a | `S908-T1` | Suprime a descrição do "Repasse previsto" (RN-496): sai a linha que compõe `após taxa 10,5%` e o fallback `após taxa Leela`; o badge de liberação fica; a prop `taxaPct` sai da assinatura e da fiação | `apps/painel/.../overview/{OverviewKpis,OverviewDashboard,OverviewPage}.tsx` | — | sonnet | — |
| 1b | `S908-T2` | Suprime o campo "Taxa Be Hero" do slide-in do inscrito (RN-496/RN-404): dois defeitos num campo só — marca da plataforma anterior e exibição da taxa ao produtor | `apps/painel/src/routes/eventos/inscritos/InscritoSlideIn.tsx` | — | sonnet | — |
| 1c | `S908-T3` | Estende a guarda que já existe: o teste que prova a ausência de "Taxa Leela" na tela financeira passa a cobrir o Overview e o slide-in, para o rótulo não voltar por descuido | `apps/painel/**/__tests__` | 1a, 1b | sonnet | — |

## Frente 2 · o inscrito pagante (E03 · S221 · E09 · S908, parte 2)

O conserto que o dono pediu. Sobe depois da Frente 1 porque toca agregado, e antes da Frente 3
porque o piso mexe no mesmo arquivo de agregado.

| # | Task | O que faz | Território | Dep | Rota | ⚔ |
|---|---|---|---|---|---|---|
| 2a | `S221-T1` | O campo de pagantes nasce no agregado (RN-486): projeção de `inscritos.porStatus.confirmado`, gravada na mesma transação de `recomputarFinanceiroEvento`, mais o espelho no doc do evento para quem lê sem abrir o agregado | `functions/src/eventos/agregarFinanceiro.ts`, `packages/core` | — | opus | ⚔ |
| 2b | `S221-T2` | As dezenove superfícies de exibição passam a ler o número novo (RN-486): cabeçalho, sub-nav, countdown, hub, KPI de portfólio, rótulo de esgotado, alertas, vagas restantes, limiar de últimas vagas e dashboard do profissional | `apps/painel/src/routes/{eventos,overview}`, `packages/core/src/overview` | 2a | opus | — |
| 2c | `S221-T3` | **Prova de que a fechadura não se mexeu** (RN-487): teste de ataque nas Rules e nos guards mostrando que percurso, modalidade, kit, preço e `taxaModo` continuam congelados por um evento que só tem PIX pendente | `functions/src/__tests__` (Rules), `guardPreco`, `guardPrecoLote` | 2a | opus | ⚔ |
| 2d | `S908-T4` | O ticket médio sai do cliente e vira campo do agregado, com o denominador de pagantes (RN-488) | `functions/src/eventos/agregarFinanceiro.ts`, `apps/painel/.../OverviewKpis.tsx` | 2a | opus | ⚔ |
| 2e | `S221-T4` | O snapshot diário passa a carregar o número novo sem perder o antigo, para a série histórica não quebrar de significado no meio | `functions/src/analytics/coletaDiaria.ts`, `packages/core/src/analytics/snapshot.ts` | 2a | sonnet | — |

## Frente 3 · o piso do Serviço (E09 · S907, com o modelo em E04)

A frente de dinheiro. Toda tarefa daqui é ⚔, sem exceção, e a ordem interna é rígida: o modelo
antes da aritmética, a aritmética antes do carimbo, o carimbo antes da tela.

| # | Task | O que faz | Território | Dep | Rota | ⚔ |
|---|---|---|---|---|---|---|
| 3a | `S907-T1` | O piso entra no modelo da linha de taxa (RN-491): campo por meio de pagamento na tabela global e no override, validação pura, Rules de escrita só `platform_admin`, semente **vazia** e teste que varre o código atrás de literal de dinheiro | `packages/core/src/finance/taxaPlataforma.ts`, `packages/core/src/platform`, `functions/firestore.rules` | — | opus | ⚔ |
| 3b | `S907-T2` | A aritmética (RN-491 e RN-494): `max` com o piso e `min` com a face, em centavos inteiros, dentro de `computeTaxaPlataforma` — a única autoridade; nenhuma tela e nenhuma Function recalcula por fora | `packages/core/src/finance/taxaPlataforma.ts`, `packages/core/src/checkout/saleState.ts` | 3a | opus | ⚔ |
| 3c | `S907-T3` | O carimbo auto-descritivo (RN-492): `pisoCentavos` e `pisoAplicado` gravados na mesma transação em que a taxa já é carimbada, e o validador de carimbo passa a aceitar a venda em que o piso mordeu em vez de tratá-la como corrompida | `functions/src/checkout/createInscricaoCharge.ts`, `packages/core/src/pedidos/pagamento.ts`, `functions/src/checkout/webhookPagamento.ts` | 3b | opus | ⚔ |
| 3d | `S907-T4` | O estorno com piso (RN-493): nenhuma mecânica nova, só a prova de que a invariante do rateio fecha — estornar as N linhas de um pedido devolve exatamente o piso, sem centavo sobrando | `packages/core/src/pedidos/pedido.ts` (prova), `functions/src/checkout/estornarInscricao.ts` | 3b | opus | ⚔ |
| 3e | `S907-T5` | O rollup macro deixa de estimar a receita da plataforma por percentual e passa a somar o carimbo, porque com o piso a estimativa fica enviesada para baixo em base com muita venda pequena | `functions/src/platform/rollups.ts` | 3c | opus | ⚔ |
| 3f | `S907-T6` | A coluna do piso na tela da tabela global, com o aviso de que o valor vazio significa "sem piso" e não "piso zero" | `apps/painel/src/routes/plataforma/taxa/TaxaGlobalRoute.tsx` | 3a | sonnet | — |

## Frente 4 · o nome (E12 · S1231) e a conversão (E11 · S824)

| # | Task | O que faz | Território | Dep | Rota | ⚔ |
|---|---|---|---|---|---|---|
| 4a | `S1231-T1` | O renome nas superfícies do comprador (RN-495): 11 strings no checkout, na confirmação e na página do evento, mais as asserções de teste que caem junto | `apps/landing/app/(public)/[eventSlug]/**` | **SERV-3** | sonnet | — |
| 4b | `S1231-T2` | O renome nas superfícies do organizador (RN-495): 10 strings em config do evento, política de vendas, estorno e CRM | `apps/painel/src/routes/eventos/**`, `apps/painel/src/routes/crm/**` | **SERV-3** | sonnet | — |
| 4c | `S1231-T3` | O renome no super-admin (RN-495): 12 strings na tabela global, no editor de termos, no provisionamento e na navegação; a rota `/plataforma/taxa` **não** muda | `apps/painel/src/routes/plataforma/**` | **SERV-3** | sonnet | — |
| 4d | `S824-T1` | O card de conversão para de prometer o que não existe (RN-489): o rótulo `visitantes → inscritos` deixa de ser renderizado sem denominador, e a faixa de KPIs se reorganiza | `apps/painel/.../overview/OverviewKpis.tsx`, `apps/painel/src/routes/overview/_components/KpiRow.tsx` | **CONV-1** | sonnet | — |

**Sem tarefa, de propósito:** a **RN-490** (o contrato do contador de visitas) tem contrato escrito
e **não** entra na fila. O contador não existe, o dono não pediu para construí-lo, e a regra
existe para que a primeira vez que alguém pedir não vire improviso. Mesmo molde da RN-458.

## Critério de aceite por tarefa

**Frente 1.** Uma varredura por `Taxa Leela`, `taxa Leela` e `Taxa Be Hero` sobre `apps/` devolve
zero strings visíveis. O badge "Aguardando encerramento" continua na tela e continua com teste.
As quatro asserções que quebram (`__tests__/OverviewDashboard.test.tsx:52, 54, 57-60, 70`) são
reescritas, não removidas — a que prova o degradar honesto passa a esperar um `—` a menos.

**2a e 2b · o número novo.** Um evento com uma cobrança PIX pendente e nenhum pagamento exibe
**zero** inscritos nas dezenove superfícies, e o `financeiro/current` daquele evento continua
mostrando o `porStatus` completo. Falsificação: apagar o campo novo e reler tem de fazer as
dezenove caírem, não uma. O `desafio-mtb-costa-lagoa-2026`, com dois pedidos órfãos, é o caso
real de conferência — leitura apenas, **sem apagar inscrito**.

**2c · a fechadura.** É o teste que não pode faltar. Com um evento que tem só inscrito
`pendente`, cada uma das seis guardas é atacada e tem de negar: escrever `percursos`, escrever
`modalidades`, escrever `taxaModo`, criar kit, apagar kit e mudar preço. Negativa provada nas
Rules e nos guards, não por tela. **Se qualquer uma passar, a Frente 2 falhou** — é exatamente o
defeito que a RN-487 existe para impedir.

**2d · o ticket.** Um evento com dez confirmados, cinco pendentes e receita de R$ 1.000,00 mostra
R$ 100,00, não R$ 66,67. O número vem do agregado; um teste prova que a tela não faz divisão.

**3a · o modelo.** Piso negativo e piso não inteiro são recusados com `invalid-argument`, provado
por caso. Escrita direta de `tenant_owner` e de cliente comum é negada com `permission-denied`,
provada por ataque na suíte de Rules. A semente sobe vazia, e um teste varre o código atrás de
literal de piso para garantir que ninguém embutiu os R$ 3,00.

**3b · a aritmética.** Varredura de face de R$ 0,01 a R$ 100,00 em passos de um centavo, com a
linha de 10,5% e piso de R$ 3,00: o Serviço é exatamente R$ 3,00 em toda face de R$ 0,01 a
R$ 28,52, e volta a seguir a fórmula de R$ 28,53 em diante. Com o piso **ausente** na linha, toda
a varredura devolve byte a byte o que devolve hoje — nenhum número muda enquanto a tabela não for
configurada, e essa é a prova que autoriza subir a frente. O `min` com a face é provado em venda
de R$ 2,00: líquido do organizador em `incorporada` fica R$ 0,00 e nunca negativo.

**3c · o carimbo.** Fechar uma venda com piso, alterar o piso na tabela, reler a taxa daquela
venda: o número **não muda**. Falsificação direta: apagar `pisoAplicado` e reler tem de fazer o
caso quebrar. Uma venda com piso não dispara `taxaflex_carimbo_corrompido_sem_conciliacao`, e um
carimbo de verdade corrompido continua disparando.

**3d · o estorno.** Um pedido de três ingressos de R$ 3,00, com piso mordendo sobre face de
R$ 9,00, estornado linha a linha: a soma do Serviço devolvido é exatamente o piso carimbado, sem
centavo sobrando nem faltando. Dentro da janela de arrependimento a devolução é integral; fora
dela segue a política do evento. Em `incorporada`, nenhuma linha ganha `taxaRepassada`.

**3e · o rollup.** A receita da plataforma passa a bater com a soma dos carimbos numa base com
vendas abaixo de R$ 28,52. A divergência antes e depois é medida e registrada no report.

**Frente 4.** Uma varredura por `taxa de serviço`, `Taxa da plataforma` e `Taxa Leela` sobre
`apps/` devolve zero, exceto o que a decisão SERV-3 tiver preservado no super-admin. Nenhum campo
de dado foi renomeado: `platformFeePct`, `taxaModo`, `taxaCongelada`, `taxaRepassada`,
`taxaTabela`, `taxaPct`, `taxaValor` e `taxaServico` seguem idênticos, e um teste prova. A rota
`/plataforma/taxa` responde no mesmo endereço.

## O que depende de decisão do dono

Duas tarefas ficam **retidas** até o painel responder, e as duas são de texto, não de mecanismo:

- **SERV-3** trava 4a, 4b e 4c. Trocar 34 strings duas vezes é o desperdício que a espera evita.
- **CONV-1** trava 4d.

Nada mais espera. **SERV-1** (o efeito comercial do piso) e **SERV-2** (a venda menor que o piso)
rodam com default em vigor, porque a tabela nasce vazia e o comportamento novo só existe depois
que o valor for configurado. **INSCR-1** (o "N inscritos" da página pública) não bloqueia a
Frente 2, que trata do painel; a landing entra depois, quando o dono responder.

## Ordem executável

Frente 1 inteira, em paralelo. Depois 2a, e a partir dela 2b, 2c, 2d e 2e em paralelo — com **2c
sendo bloqueadora do fechamento da frente**, não opcional. Depois 3a, e a partir dela a cadeia
3b → 3c → 3e, com 3d atrás de 3b e 3f atrás de 3a. A Frente 4 entra quando o painel responder, e
não depende de nenhuma outra.
