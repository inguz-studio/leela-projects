---
tags: [leela, spec, rodada, juros, margem, parcelamento, admin]
trace: leela-build-2d6ee98d
lane: SPEC-JUROS-MARGEM
data: 2026-08-04
historia: LEELA-S1610
epicos: [LEELA-E16-plataforma-superadmin, LEELA-E09-financeiro-profissional, LEELA-E12-landing]
---

# A economia do parcelamento, visível no admin

> Spec da lane SPEC-JUROS-MARGEM. Delta da história **S1610** (PB-2 e JUROS-2 do DEC-0803B). Zero código nesta lane.
>
> **Regra de honestidade desta spec.** Todo número aqui ou foi conferido no código, ou está marcado como lacuna. O custo que o Asaas cobra por parcela **não existe em lugar nenhum do sistema hoje**, e por isso nenhuma margem fechada aparece neste documento. A seção §7 lista as cinco lacunas, cada uma com o que a fecha.

## O que o dono pediu

> "O cálculo de 2,89% é apenas uma estimativa para você colocar na tabela que já existe no admin também. Inclua o custo de parcelamento também para que eu veja quanto custa e quanto preciso colocar de markup, para saber nossa margem exata a ser cobrada, por parcela."

> "considere o 2,89% a.m. para preencher a tabela de configuração no admin que gerencia os tenants. Meu intuito na verdade, é pegar o custo de parcelamento e antecipação, e colocar um markup em cima, para saber meu faturamento com o tempo, mas isso é cena para os próximos capítulos, pois somente irei antecipar sobre demanda e não automaticamente. Se tivermos como fazer isso via painel admin, melhor."

Junto vieram três restrições da PB-2: a compradora vê o **preço exato** e nunca um resíduo rotulado como juros; "pagamento sem juros" não existe hoje e, quando existir, será ferramenta do **admin da plataforma** liberada por tenant; e os 2,89% a.m. são **estimativa**, não número negociado.

---

## 1. O modelo econômico

Três números se confundem hoje porque um deles nunca foi escrito em lugar nenhum. Esta seção nomeia os três, dá a fórmula de cada um e diz de onde vem cada insumo.

### 1.1 Os três números

| Nome | O que é | Quem paga | Onde vive hoje |
|---|---|---|---|
| **Custo** | O que o gateway cobra da Leela para processar aquela venda naquele número de parcelas | A Leela, descontado do que entra | **Em lugar nenhum.** Ver §7 · L1 e L2 |
| **Markup** | O que a Leela acrescenta ao preço por financiar a compra. Hoje é o juro do parcelamento | A compradora, embutido no total | `commercialTerms/current.installmentRules.jurosAoMes` |
| **Margem** | O que sobra: markup menos o custo incremental de parcelar | Resultado, não insumo | Não existe. É o que esta spec cria |

A palavra "taxa" fica reservada para a **taxa da plataforma** sobre a venda (RN-178, tabela por meio de pagamento). Ela é outra conta, incide no face e não depende do número de parcelas. Aparece na tela como linha de contexto, nunca somada ao markup do parcelamento.

### 1.2 As fórmulas

Todas operam em **centavos inteiros com arredondamento half-up**, a convenção RN-183 que `computeTaxaPlataforma` já usa. Nada de aritmética nova: as opções de parcelamento continuam vindo de `buildInstallmentOptions` (`packages/core/src/finance/calc.ts:127`), que é a única autoridade sobre parcela e total.

Sejam `PV` o valor à vista simulado, `n` o número de parcelas e `T` o termo comercial do tenant.

```
totalAVista            = PV
totalParcelado(n)      = buildInstallmentOptions(PV, T.installmentRules)[n].valorTotal
markup(n)              = totalParcelado(n) − totalAVista
custoGateway(n)        = round(totalParcelado(n) × custo[n].percentual) + custo[n].fixoCentavos
custoIncremental(n)    = custoGateway(n) − custoGateway(1)
margem(n)              = markup(n) − custoIncremental(n)
margemPorParcela(n)    = margem(n) ÷ n
margemPct(n)           = margem(n) ÷ totalParcelado(n)
```

Três invariantes que valem por construção e viram caso de teste:

- `markup(1) = 0`. A parcela única do cartão nunca tem juros (RN-436), então não há o que acrescentar.
- `margem(1) = 0`, porque `custoIncremental(1) = 0` por definição. A linha 1x da tabela existe só para ancorar o custo-base.
- `margem(n)` pode ser **negativa**. Se o custo de parcelar supera o juro cobrado, a Leela paga para financiar. A tela mostra o número negativo, com destaque, e nunca o esconde nem o zera.

### 1.3 De onde vem cada insumo

| Insumo | Origem | Quem escreve | Versionado? |
|---|---|---|---|
| `PV` (valor simulado) | Campo da própria tela, não persiste | Quem está olhando | Não se aplica |
| `jurosAoMes`, `maxParcelas`, `parcelaMinima` | `tenants/{id}/commercialTerms/current.installmentRules` | `platform_admin` (RN-404) | Sim, `versao` + snapshot `v{n}` |
| Taxa da plataforma por meio | `platform/config.taxaPlataforma`, com override em `commercialTerms.taxaTabela` (RN-178) | `platform_admin` | Global não; override sim |
| **Custo do gateway por parcela** | `platform/config.custoGateway` · **campo novo desta spec** | `platform_admin` | Ver RN-459 |
| Custo real cobrado na venda | Resposta do gateway. **Descartada hoje** | Ninguém | Ver §7 · L2 |

### 1.4 O 2,89% entra como dado, e continua entrando

O número já mora no lugar certo: `DEFAULT_COMMERCIAL_TERMS.installmentRules.jurosAoMes` (`packages/core/src/platform/commercialTerms.ts:209`), herdado pelo seed e editável na tela de termos. Nenhuma linha de cálculo carrega literal de percentual, e a S314-T2 registrou por escrito por que isso importa: quando o dono vetar o número, a mudança é de dado.

Esta spec não muda essa disciplina. Ela acrescenta a mesma disciplina ao **custo**: a tabela de custo é dado configurável, nunca constante, e nasce marcada como estimativa (RN-455).

### 1.5 Onde o modelo econômico mora no código

`packages/core/src/finance/` ganha um módulo próprio, `economiaParcelamento.ts`, com funções puras que **compõem** `buildInstallmentOptions` e `computeTaxaPlataforma` sem reimplementar nada. O painel chama o core; a tela não faz uma conta de dinheiro. É o mesmo contrato que a cotação do checkout já respeita, e pela mesma razão: duas autoridades sobre o mesmo valor divergem no dia em que uma das duas mudar.

---

## 2. A tela do admin

### 2.1 Qual tabela é "a tabela que já existe"

Existem três telas de taxa no painel de plataforma hoje, e o brief do dono aponta para uma só. Ele disse "a tabela de configuração no admin **que gerencia os tenants**".

| Tela | URL | O que edita | É a alvo? |
|---|---|---|---|
| Taxa da plataforma | `/plataforma/taxa` | Tabela global por meio (pix, cartão, boleto) | Não. É global, não por tenant |
| Planos de cobrança | `/plataforma/planos` | Planos nomeados, com uma grade 2x-12x de `tabelaTaxasParcela` | Não. Ver §2.5 |
| **Termos comerciais** | `/plataforma/tenants/:tenantId/termos` | `platformFeePct`, `installmentRules`, override por meio, SaaS | **Sim** |

A tela alvo é `apps/painel/src/routes/plataforma/tenants/termos/TermsEditor.tsx`. É onde os 2,89% já são editáveis, é por tenant e é a que o dono abre quando quer mexer na economia de um produtor. O bloco novo entra logo **depois** do fieldset "Parcelamento" (hoje em `TermsEditor.tsx:293`), no mesmo formulário e na mesma rota. Nenhuma tela nova, nenhuma rota nova, nenhuma tabela irmã.

### 2.2 O que a tela mostra

O bloco novo se chama **Economia do parcelamento** e é uma tabela de leitura, derivada, com uma linha por número de parcelas ofertável pelo termo. Ele não acrescenta campo editável nenhum: os três controles que governam a escada (`maxParcelas`, `jurosAoMes`, `parcelaMinima`) já existem acima, e a tabela reage a eles.

Colunas, na ordem de leitura:

| Coluna | Alinhamento | Conteúdo |
|---|---|---|
| Parcelas | esquerda | `1x`, `2x`, ... até `maxParcelas` |
| Parcela | direita | O valor de cada parcela. Quando a última difere, `R$ 5,83 (última R$ 5,85)` |
| Total do comprador | direita | `totalParcelado(n)` |
| Custo | direita | `custoGateway(n)`, com o incremental sobre 1x entre parênteses |
| Markup | direita | `markup(n)` |
| **Margem** | direita | `margem(n)`, e abaixo, menor, `margem por parcela` |

Um rodapé de tabela fecha a conta cheia da venda, que é a pergunta seguinte que o dono vai fazer: taxa da plataforma sobre o face, mais markup, menos custo total, igual à receita da Leela naquela venda. O rodapé é uma linha só e não repete as colunas.

Acima da tabela, um campo `Valor simulado (R$)` com `R$ 300,00` de partida. Trocar o valor recalcula a tabela na hora, sem salvar nada e sem ida ao servidor. É simulação, não configuração.

### 2.3 Por que tabela, e não cards ou lista

A autoridade de uso é `design-principles.md` §(c). O critério central: **tabela quando o usuário compara atributos entre muitos itens e varre dados estruturados densos**. É exatamente a tarefa aqui. O dono lê doze linhas homogêneas procurando onde a margem cai, e comparar colunas entre linhas **é** o trabalho. Cards quebrariam a comparação, e lista perderia o alinhamento decimal que torna a varredura possível.

Três consequências que a mesma reference impõe:

- Números monetários alinhados à direita, com a mesma quantidade de casas. A coluna Margem é a que o olho procura, então ela fica por último e é a única com ênfase tipográfica.
- Sem ordenação de coluna. A ordem por número de parcelas é a única que faz sentido e ordenar por margem embaralharia a escada, que é o próprio objeto de leitura.
- Sem ação por linha. É tela de informação, não de comando. O que se muda são os três campos acima da tabela.

### 2.4 O componente, e o que já existe

O primitivo é o `Table` do design system (`packages/design-system/src/index.ts:82`), com `TableColumn` e `align: 'right'`. Ele está no bundle e hoje só a tela de planos o usa. Formatação por `formatBRL` e `formatPct`, de `apps/painel/src/routes/plataforma/_lib/format.ts`. Estado de custo ausente pelo `Badge` que a tela já importa. Zero componente novo de design system.

O guia visual do projeto (`04-engenharia/governanca-design.md`) é critério de aceite, e três regras dele mordem aqui: flat por padrão sem borda decorativa, nenhum valor cru de cor ou de espaçamento (o lint `leela-tokens/no-hardcoded-tokens` quebra o build), e contraste AA na coluna de margem negativa, que é o único lugar com cor semântica.

### 2.5 A armadilha da grade 2x-12x que já existe

`commercialTerms.tabelaTaxasParcela` existe no modelo, tem validação no core, tem Rules e tem **interface completa** de 2x a 12x no modal de planos (`PlanoFormModal.tsx:175-195`, com a legenda "Taxa por parcela (%)"). E o checkout **nunca a consome**: o comentário do core diz, na letra, que ela foi superada pela `taxaTabela` da TAXAFLEX.

Isso é uma tela de administração que mostra um número que não move preço nenhum. Quem for construir esta história vai encontrá-la e vai achar que é o lugar de pendurar a economia nova. Não é.

Decisão desta spec, com default profissional e sem subir ao dono: a nova tabela **não** usa `tabelaTaxasParcela`, e a grade dela ganha, no mesmo lote, um aviso declarando que o campo não é consumido pelo checkout. A aposentadoria do campo entra como tarefa de dívida, fora desta história.

---

## 3. O que é editável sem deploy, e por quem

| O quê | Onde | Quem edita | Efeito |
|---|---|---|---|
| Juros ao mês, máximo de parcelas, parcela mínima | `commercialTerms/current.installmentRules`, tela de termos | `platform_admin` | Novo termo, `versao + 1`, com snapshot `v{n}` imutável |
| Override de taxa por meio | `commercialTerms/current.taxaTabela` | `platform_admin` | Mesmo save, mesma versão |
| "Sem juros" liberado por tenant | `commercialTerms/current.parcelamentoSemJuros` · campo novo | `platform_admin` | Mesmo save, mesma versão |
| Tabela global de taxa por meio | `platform/config.taxaPlataforma`, tela `/plataforma/taxa` | `platform_admin`, pela callable `setTaxaPlataformaGlobal` | Imediato, sem versão |
| **Tabela de custo do gateway** | `platform/config.custoGateway` · campo novo | `platform_admin` | Imediato. Ver RN-459 |
| Valor simulado da tabela | Campo de tela | Quem estiver olhando | Nenhum. Não persiste |

**O produtor não mexe em nada disso.** A regra já existe e já é fail-closed: RN-404 restringe a escrita de `commercialTerms` ao `platform_admin`, e as Rules do Firestore negam o resto. A tela de termos abre em modo leitura para `tenant_owner`, sem botão de salvar. O único controle vizinho que o produtor tem é o modo da taxa por evento (RN-347, incorporada ou repassada), e ele não encosta na escada de parcelas.

Nada nesta história exige deploy para mudar número. Exige deploy só a chegada do bloco novo na tela, uma vez.

**O que exige nova versão de termo comercial:** qualquer escrita em `commercialTerms/current`. O contrato já é esse, com trava otimista por `versao` e snapshot imutável a cada save. Vale lembrar o item JUROS-1 do painel, ainda aberto: o `current` do Castelo está em `versao: 1` enquanto o retrato `v1` ainda diz juros zero, porque a escrita de 03/08 foi minimalista por ordem. O primeiro save pela tela sela o rastro.

---

## 4. PB-2 · o preço exato para a compradora

### 4.1 O defeito, medido

Com `jurosAoMes: 0`, a compradora vê um resíduo de arredondamento apresentado como juros. A mecânica está inteira no código.

A ordem de arredondamento é normativa (RN-436): arredonda-se a **parcela**, e o total é a parcela multiplicada. Com R$ 35,00 em 3x isso dá `round(35 ÷ 3) = 11,67`, e `11,67 × 3 = R$ 35,01`. Um centavo apareceu do nada. A cotação devolve `jurosParcelamento = 0,01` e a tela do resumo renderiza a linha "Juros do parcelamento" com esse valor, num termo que não tem juros.

O piso do principal, que a ACHADOS-REV instituiu para consertar o defeito DEF-1, **agrava o resíduo em vez de eliminá-lo**. Ele existe porque o arredondamento para o mais próximo deixava o total cair abaixo do principal: R$ 35,00 em 6x dava `round(5,8333) = 5,83`, e `5,83 × 6 = R$ 34,98`, dois centavos a menos do que a compradora tinha combinado pagar. Isso quebrava três promessas ao mesmo tempo, e o piso está certo no que promete. Só que a correção sobe **um centavo em cada parcela**: `5,84 × 6 = R$ 35,04`. O resíduo de dois centavos para baixo virou quatro para cima.

Conferido em `packages/core/src/finance/calc.ts:144-151`. O piso nunca dispara com juros ligados, porque a parcela Price já é maior que `valor ÷ n`.

### 4.2 A regra

**Com juros zero, o total parcelado é exatamente o total à vista.** Não há o que financiar, então não há o que acrescentar, e nenhum centavo pode nascer do arredondamento.

O centavo residual passa a morar **numa parcela**, não no total. A divisão exata:

```
base    = floor(totalCentavos ÷ n)
resto   = totalCentavos − base × n          (0 ≤ resto < n)
parcelas 1..n−1 = base
parcela n       = base + resto
```

A soma fecha no total por construção, e a maior parcela é a última. A escolha da última não é estética: é o que o gateway faz. O adapter manda `installmentCount` mais `totalValue` e deixa o Asaas dividir, e a referência de API do projeto registra que o Asaas "divide e ajusta a última parcela" (`05-discovery/asaas-api-reference.md:119`). Fazer diferente na tela criaria divergência entre o que a compradora leu e o que a fatura dela vai dizer.

Com juros maiores que zero nada muda. `parcela = round(Price)`, `total = parcela × n`, todas as parcelas iguais, e a linha de juros mostra um custo de financiamento verdadeiro. Os números da RN-436 ficam byte a byte, incluindo os R$ 359,28 de R$ 300,00 em 12x que o épico E04 documenta.

O piso do principal **não é removido**. No ramo de juros zero ele passa a ser inalcançável, porque o total já é o principal por definição; no ramo com juros ele nunca disparava. Ele fica como a última linha de defesa da invariante, e apagá-lo seria trocar uma trava viva por uma suposição.

### 4.3 O que a pessoa vê e o que ela paga

| Caso | Hoje | Depois |
|---|---|---|
| R$ 35,00 em 3x, juros 0 | `3x de R$ 11,67` · total **R$ 35,01** · linha "Juros do parcelamento R$ 0,01" | `3x de R$ 11,66 (última R$ 11,68)` · total **R$ 35,00** · sem linha de juros |
| R$ 35,00 em 6x, juros 0 | `6x de R$ 5,84` · total **R$ 35,04** · linha de juros R$ 0,04 | `6x de R$ 5,83 (última R$ 5,85)` · total **R$ 35,00** · sem linha de juros |
| R$ 300,00 em 12x, juros 2,89% | `12x de R$ 29,94` · total R$ 359,28 · juros R$ 59,28 | idêntico |

Regras de apresentação que vêm junto:

- Quando todas as parcelas são iguais, a opção diz `n x de R$ X,XX` e mais nada.
- Quando a última difere, a opção diz `n x de R$ X,XX (última R$ Y,YY)`, na lista de opções e no resumo. Sem asterisco, sem nota de rodapé, sem "aproximadamente".
- A linha "Juros do parcelamento" só é renderizada quando o valor é maior que zero, e essa guarda **já existe** nas duas telas (`StepResumo.tsx:397` e `StepConfirmacao.tsx:162`). Ela nunca foi o problema. Com a regra acima o valor passa a ser zero por construção em todo termo sem juros, e a linha desaparece sozinha (RN-457). O conserto é a montante, no cálculo, e mexer na tela seria consertar o lugar errado.
- O total é a promessa. É ele que a compradora compara com o preço anunciado, e é ele que precisa bater na casa do centavo.

### 4.4 Onde o resíduo passa a morar, em uma frase

Na última parcela, e nunca no total.

---

## 5. "Sem juros" como ferramenta do admin

Não construir agora. Especificar o contrato agora, para que a primeira vez que alguém pedir não vire improviso.

### 5.1 O contrato

Campo novo em `commercialTerms/current`, escrita exclusiva do `platform_admin` pela disciplina que já vale (RN-404):

```
parcelamentoSemJuros?: {
  ateParcelas: number          // inteiro ≥ 2 e ≤ maxParcelas; ausência do campo = desligado
  custoAbsorvidoPor: 'plataforma' | 'produtor'
}
```

Ausente significa desligado, que é o estado de todo tenant hoje. `ateParcelas: 6` significa que de 2x a 6x o juro é zero e de 7x em diante o `jurosAoMes` do termo volta a valer. É liberação por tenant, granulada, e cabe na mesma escada que já existe.

### 5.2 Quem decide, e quem nunca decide

O `platform_admin` liga e desliga, por tenant. **O produtor nunca escolhe.** Não há campo no evento, não há campo na tela do organizador, e não há caminho de escrita que alcance isso a partir do painel do produtor. A restrição é do dono, na letra: ferramenta do admin, liberada por tenant, nunca escolha do produtor.

### 5.3 Quem paga o custo quando o juro é zero

Esta é a pergunta de dinheiro, e a resposta é do dono. Ela sobe ao painel como **JUROS-3**, com o default proposto marcado.

O default proposto é **a plataforma absorve**. Duas razões. A RN-437 já estabelece que o juro do parcelamento não é receita do organizador, e a simetria manda que o custo também não seja despesa dele. E cobrar do produtor exigiria uma linha nova no razão do repasse, o que contradiz a RN-182, que hoje define o líquido como `face − taxa(meio)` e mais nada.

O caminho alternativo, se o dono preferir, é descontar o custo do líquido do produtor. Ele é mais caro: pede campo novo no pagamento, linha nova no extrato e revisão da RN-182.

### 5.4 O que aparece na tela do comprador

- Com `ateParcelas` ligado, a escada mostra `em até 6x sem juros` e, acima disso, as opções com juro, com o total de cada uma.
- O total das opções sem juros é **exatamente** o total à vista. A regra do centavo da §4 vale integralmente ali, e é ela que faz "sem juros" ser verdade na casa do centavo.
- Nenhuma linha de juros é renderizada nas opções sem juro.
- A frase "sem juros" nunca aparece quando o total difere do à vista, nem por um centavo.

---

## 6. Antecipação sob demanda · visão, não fila

**🧊 Não priorizado. Não construir.** Esta seção existe para que ninguém construa por engano, e para que a coluna de custo nasça já pensando nela.

O intento do dono, nas palavras dele: juntar o custo de parcelamento e o custo de antecipação, aplicar markup e enxergar o faturamento da plataforma ao longo do tempo. "Cena para os próximos capítulos."

Quatro contornos declarados, e nenhum deles é tarefa:

1. A antecipação é **sob demanda**, nunca automática. Nenhum agendamento, nenhum gatilho, nenhum cron.
2. É operada pelo **painel admin**, pela mesma conta que já governa os termos.
3. Antecipa **só o necessário** para cobrir os repasses devidos, nunca o saldo inteiro.
4. O custo dela entra na **mesma conta de margem** desta spec, como mais uma parcela de custo, e não numa conta paralela.

O campo `anticipation` já existe no termo desde a V1, com `disponivel` e `custoPct?`, e a RN-410 já diz que o campo existe e a mecânica é pós-V1. A tela de termos mostra o toggle desabilitado com o selo "disponível em breve". **Nada disso muda nesta história.** O `custoPct` continua sem interface e continua inerte.

O que a coluna de custo faz por antecipação, agora: nada, além de deixar o lugar pronto. A tabela de custo do gateway (§1.3) nasce com uma linha `antecipacao` inerte, validada e não consumida por caminho nenhum. Quando a mecânica existir, ela entra como mais um termo em `custoGateway(n)`, sem redesenhar a tabela.

O prazo de liquidação é o que dá sentido à visão, e ele está registrado na discovery: no Asaas o cartão liquida em cerca de 32 dias corridos **por parcela**, salvo antecipação (`05-discovery/pilares/05-vendas-afiliacao.md`). É isso que faz um parcelamento em 12x prender dinheiro por quase um ano, e é isso que a antecipação compra de volta, com custo.

---

## 7. As lacunas

Cinco. Nenhuma delas foi preenchida com estimativa apresentada como fato, porque o dono vai usar estes números para decidir preço.

### L1 · O custo real que o Asaas cobra por parcela não existe em lugar nenhum

O que existe é uma linha de benchmark de discovery, coletada em 2026-07-02 e explicitamente marcada como "sujeita a contrato e volume": Asaas em cartão à vista a **2,99% + R$ 0,49**, e PIX a R$ 0,99 nos três primeiros meses, R$ 1,99 depois (`05-discovery/pilares/05-vendas-afiliacao.md`). O documento fecha com a recomendação de "não fechar taxa sem cotação direta por volume".

Para o **parcelado** não há linha nenhuma. A tabela de benchmark tem a coluna de parcelado preenchida para a Pagar.me ("até 13,59%") e vazia para o Asaas.

**Consequência:** a coluna Custo da tabela nasce vazia, e a coluna Margem também. A tela mostra um estado de "custo não configurado" e **não calcula margem** enquanto não houver dado. Nenhum número inventado entra na conta.

**O que fecha:** o dono, ou quem tiver acesso ao painel do Asaas, informar a tabela de tarifas do contrato vigente, incluindo o acréscimo por parcela. Entra no painel como ação dele (JUROS-5).

### L2 · O sistema descarta o custo real quando ele passa

Esta é a lacuna mais reparável e a que ninguém tinha olhado. O webhook do Asaas traz `netValue`, que é o valor da cobrança já descontadas as taxas do gateway, e o adapter **descarta esse campo de propósito**:

> `// SEMPRE payment.value (valor da cobrança) — netValue desconta taxas e quebraria o cross-check de integridade do checkout.`
> `functions/src/payments/asaasProvider.ts:1506-1508`

A decisão está certa para o que ela protege: o cross-check de integridade compara o valor cobrado, e usar o líquido ali quebraria a conferência. Mas a diferença entre `value` e `netValue` **é o custo real daquela venda**, e ela é jogada fora sem ser registrada.

**Consequência:** não existe uma única venda na história do sistema cujo custo real seja conhecido. A margem só pode ser estimada, nunca apurada, e ninguém consegue conferir se a estimativa está certa.

**O que fecha:** capturar `netValue` como campo de observação ao lado do valor de cobrança, sem tocar no cross-check. É tarefa de backend pequena, e está na fila desta história como T5.

### L3 · O gateway não documenta qual parcela absorve o resto

A regra do centavo da §4 depende de o Asaas ajustar a **última** parcela. A referência de API do projeto registra que ele "divide e ajusta a última parcela", mas não diz a direção do arredondamento das outras, e a coleta original não exercitou o caso.

**Consequência:** se o Asaas arredondar para cima e reduzir a última, a tela vai dizer `5x de R$ 5,83 (última R$ 5,85)` e a fatura vai dizer `5x de R$ 5,84 (última R$ 5,80)`. Mesmo total, parcelas diferentes, e o dono descobre pelo suporte.

**O que fecha:** uma cobrança em sandbox de R$ 35,00 em 6x, lendo de volta o array de parcelas. É o critério de aceite da tarefa T1 e não custa nada além do tempo de rodar.

### L4 · Dois markups estão no registro e nunca foram reconciliados

Em 2026-07-27 o dono decidiu, verbatim: *"já as parcelas, pode ir adicionando 2.5% a cada parcela, e depois eu edito"* (`02-rodadas/2026-07-27-decisoes/01-decisoes.md`, item 14). Virou card no backlog, com o título "Preço do SaaS e acréscimo por parcela".

Em 2026-08-03 ele mandou preencher a tabela com **2,89% a.m.**, chamando o número de estimativa.

Os dois não são o mesmo modelo. Price a 2,89% ao mês cobra R$ 359,28 numa venda de R$ 300,00 em 12x, o que dá 19,8% sobre o principal. Acréscimo linear de 2,5% por parcela, na leitura mais direta da frase, dá 30% em 12x, o que seria R$ 390,00. Trinta reais e setenta e dois centavos de diferença na mesma venda, e a frase ainda admite uma segunda leitura, começando a contar em 2x, que daria 27,5%.

**Consequência:** o markup que a tabela vai exibir depende de qual dos dois vale. Nenhum dos dois é obviamente o vencedor: o de 2,89% está no ar e foi o que o teste de 03/08 exercitou; o de 2,5% é mais recente como decisão do dono e mais simples de explicar a um produtor.

**O que fecha:** o dono. Sobe ao painel como **JUROS-4**, com os três números na frente dele.

### L5 · O custo não é carimbado na venda, então a margem histórica não é reconstruível

A taxa da plataforma é congelada no ato da compra (RN-179): o par percentual e fixo do meio escolhido é carimbado no pagamento, e mudar a tabela depois nunca reprecifica pedido existente. O custo não tem nada disso. Ele viveria em `platform/config`, que não é versionado e não é carimbado.

**Consequência:** trocar a tabela de custo reescreve retroativamente a margem de todas as vendas passadas na tela. O dono olharia o faturamento de junho com o custo de agosto.

**O que fecha:** RN-459, nesta spec, exigindo o carimbo do custo no mesmo lugar e no mesmo instante em que a taxa já é carimbada. Tarefa T4 da fila.

---

## 8. Premissas assumidas

Decididas com default profissional, sem subir ao dono. Cada uma é barata de reverter enquanto nada estiver construído.

| # | Premissa | Por quê |
|---|---|---|
| P1 | A tabela alvo é a de termos por tenant, em `/plataforma/tenants/:tenantId/termos` | É a única por tenant, e é onde o `jurosAoMes` já é editável. As palavras do dono foram "o admin que gerencia os tenants" |
| P2 | O bloco novo é derivado e de leitura, sem campo editável próprio | Os três controles da escada já existem acima. Duplicá-los criaria duas autoridades sobre a mesma escada |
| P3 | A tabela de custo é **global**, em `platform/config`, e nunca por tenant | O custo é o contrato da Leela com o gateway. Ele não muda porque o produtor mudou |
| P4 | A margem é medida contra o custo **incremental** sobre 1x | É a pergunta do dono: quanto custa parcelar. O custo-base existe em qualquer venda, inclusive à vista |
| P5 | `tabelaTaxasParcela` não é reaproveitada, e ganha aviso de campo inerte | Ela é dormente e tem interface completa. Pendurar a economia nova nela ressuscitaria um caminho morto |
| P6 | O piso do principal permanece no código | Vira inalcançável no ramo de juros zero, mas é a última linha de defesa da invariante |
| P7 | O valor simulado da tabela parte de R$ 300,00 | É o valor dos exemplos canônicos da RN-436 e do épico E04, o que torna a tela conferível contra a documentação |
| P8 | A parcela mínima passa a ser conferida contra a **menor** parcela, não contra a uniforme | Com a divisão exata as parcelas diferem em um centavo. Conferir a menor é a leitura conservadora, e é no máximo um centavo mais rígida |

## 9. Vizinhos

[[LEELA-E16-plataforma-superadmin]] para os termos comerciais e a tela. [[LEELA-E09-financeiro-profissional]] para o razão e o repasse. [[LEELA-E12-landing]] para o que a compradora vê. `02-rns-delta.md` desta pasta para as regras novas, `03-fila-codigo.md` para a fila executável.
