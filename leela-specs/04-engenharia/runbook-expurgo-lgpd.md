---
tags: [leela, lgpd, expurgo, retencao, saude, cron, incidente, runbook, observabilidade]
atualizado: 2026-08-05
trace: leela-pixreal-diag-20260804
---

# Leela · runbook: o expurgo de retenção falhou

Este documento existe por causa de um caso real. Entre 29/07 e 05/08 o cron `expurgarSaude` falhou **todas as madrugadas** em produção, sempre com o mesmo erro, e ninguém soube. A causa era um índice composto de `eventos(status, data)` que nunca foi declarado em `firestore.indexes.json`: a query estourava com `FAILED_PRECONDITION` na primeira linha e a função morria antes de olhar um documento sequer. A descoberta foi por acaso, oito dias depois, enquanto se lia `functions:log` atrás de outra coisa.

O expurgo não é um cron qualquer. Dado de saúde é dado pessoal sensível (LGPD Art. 11, RN-147), e a retenção dele é limitada ao ciclo do evento mais a janela legal de 90 dias. Um expurgo que não roda é uma obrigação legal que deixa de ser cumprida, em silêncio, todo dia.

O runbook cobre o alerta, o diagnóstico e a retomada. Ele não cobre a decisão de qual ferramenta de alerta usar, que é do CTO humano.

## O que o cron faz

`expurgarSaude` roda diariamente às **03:20 (America/Sao_Paulo)**, escalonado depois dos crons das 03:00, 03:05 e 03:10. Ele varre eventos com `status == "encerrado"` cuja `data` passou do corte de retenção, apaga todos os docs `eventos/{e}/inscritos/{i}/saude/{current}` daqueles eventos e carimba `saudeExpurgadaEm` no evento como prova.

O carimbo não é um pulo cego: evento já carimbado ainda leva um probe de um documento, para o caso de uma reabertura ter coletado saúde nova. Retenção eterna por causa de carimbo antigo não acontece.

## Como a falha aparece

Toda falha do expurgo grava um log de erro com estes campos:

| Campo | Valor |
|---|---|
| `alerta` | `expurgo_lgpd_falhou` |
| `severidade` | `critico` |
| `canal` | `retencao` |
| `tipo` | `saude` |
| `causa` | `indice_ausente` ou `desconhecida` |
| `indiceUrl` | link de criação do índice, quando o Firestore o manda (campo próprio, inteiro) |
| `err` | mensagem do erro, truncada em 200 caracteres |

O nome do evento no log é `expurgo_saude_falhou`. A política de alerta, quando existir, casa o **campo** `alerta`, nunca a mensagem — texto de erro de provedor muda, campo estruturado não. É a mesma doutrina de [[runbook-email-transacional]], de propósito: uma política, um formato.

O `err` é truncado em 200 caracteres e o link do índice passa disso com folga. Por isso o link tem campo próprio: truncá-lo junto do erro destruiria a única coisa acionável da linha.

Conteúdo de saúde nunca entra no log. Seria o inverso do que o expurgo existe para fazer.

## O gancho de alerta, e por que ele está desligado

A instrumentação está pronta e a política não. Criar métrica baseada em log, canal de notificação e destino de plantão é custo de infraestrutura recorrente, e essa decisão não é da engenharia de aplicação. Quando a política for criada, o filtro é este:

```
jsonPayload.alerta="expurgo_lgpd_falhou"
```

Enquanto ela não vem, a checagem manual é barata e vale a pena depois de qualquer deploy de índices:

```
firebase functions:log --only expurgarSaude
```

Uma execução sadia deixa `expurgo_saude_diario` com as três contagens. Ausência de linha nenhuma é tão suspeita quanto uma linha de erro: quer dizer que o cron não rodou.

## Onde olhar sem depender de log

O próprio evento carrega a prova do expurgo.

| Campo | O que conta |
|---|---|
| `eventos/{id}.saudeExpurgadaEm` | quando o expurgo daquele evento fechou |
| ausência do campo em evento encerrado e vencido | expurgo pendente ou falhando |

Progresso parcial também não se perde. O núcleo loga `saude_expurgada` com `eventoId` e `docsApagados` a cada evento, antes de seguir para o próximo. Um erro no meio da varredura deixa no log a trilha exata do que já tinha sido apagado.

## O que fazer, na ordem

**1. Leia `causa` antes de qualquer coisa.** As duas saídas são opostas. `indice_ausente` é conserto de arquivo e nenhum dado foi apagado naquela execução — a query nem chegou a rodar. Qualquer outra causa é investigação, e aí o expurgo pode ter parado no meio.

**2. Se for `indice_ausente`, declare o índice no arquivo, nunca só no console.** O link de `indiceUrl` cria o índice direto no projeto, o que conserta a produção e deixa `firestore.indexes.json` mentindo — no próximo `firebase deploy --only firestore:indexes` o índice criado à mão é **removido**, porque o arquivo é a lista completa do que passa a existir. O caminho certo é acrescentar a entrada ao arquivo, rodar o contrato e deployar índices.

As duas queries do expurgo exigem declaração explícita:

| Query | O que precisa |
|---|---|
| `eventos where status == "encerrado" and data < corte` | composto `eventos(status ASC, data ASC)`, escopo `COLLECTION` |
| `collectionGroup("saude") where eventoId == …` | `fieldOverride` de `saude.eventoId` com escopo `COLLECTION_GROUP` |

A segunda é a pegadinha: índice automático de campo único é de escopo `COLLECTION`, e query de collection group não é coberta por ele. Consertar só a primeira move a falha uma linha para baixo em vez de resolvê-la.

**3. Ao acrescentar um `fieldOverride`, re-liste `COLLECTION` ASC e DESC.** Um override não soma à política automática: ele a **substitui**. Declarar só `COLLECTION_GROUP` apaga os índices de coleção que o Firestore mantinha sozinho, e toda query de coleção sobre aquele campo passa a falhar no próximo deploy de índices — separando a causa do efeito por quanto tempo o maestro quiser. É o defeito D1, que já custou um susto nesta mesma rodada. A guarda está em `functions/src/__tests__/firestoreIndexes.contract.test.ts`.

**4. Rode o contrato antes de deployar.** O Emulator **não cobra índice nenhum**, então nenhum teste de execução deste repositório acusa índice faltante. A única prova possível antes do deploy é sobre o arquivo:

```
cd functions && npx vitest run src/__tests__/firestoreIndexes.contract.test.ts
```

**5. Deploy de índices, depois confira que ficaram READY.** Índice composto grande leva minutos para construir; a função só volta a passar quando o estado sai de `CREATING`.

**6. Não force uma execução para "recuperar" o dia perdido.** O expurgo é idempotente e varre por data de corte, não por dia. A próxima execução das 03:20 pega tudo o que ficou para trás, inclusive o que venceu durante a janela de falha. Disparar manualmente só antecipa isso, e não há nada que a espera perca.

## O que ficou sem ser expurgado entre 29/07 e 05/08

**Nada.** Não por acerto do sistema, e sim porque não havia o que apagar: a superfície de **coleta** de dado pleno de saúde (atestado e PAR-Q, flags `exigenciasSaude`) ainda não existe no produto. As Security Rules negam escrita de cliente na subcoleção `saude` de forma absoluta, e a Function de coleta que teria a outra chave é de E12-S1207/E13, ainda não construída. Nenhum documento de saúde foi gravado em produção, então nenhum passou da janela de retenção.

O que a falha custou foi a **garantia**, não o dado. No dia em que a coleta entrar no ar, um expurgo quebrado passa a reter dado sensível indefinidamente, e o formato do incidente acima é o que faz alguém saber disso na primeira madrugada em vez de na oitava.

**Consequência prática:** quando o lote de coleta de saúde for para produção, confira que este cron está verde **antes** de ligar a flag `exigenciasSaude` em qualquer evento.

## Quando escalar

Suba para o CTO humano quando a causa não for `indice_ausente` e a mesma mensagem se repetir por três madrugadas, quando o expurgo passar a estourar prazo por volume de eventos, ou quando um evento encerrado e vencido continuar sem `saudeExpurgadaEm` depois de duas execuções verdes. As duas últimas são defeito nosso, não azar de infraestrutura.

## Onde isto está no código

| Peça | Arquivo |
|---|---|
| Formato do incidente | `functions/src/eventos/incidenteExpurgo.ts` |
| Cron e núcleo do expurgo | `functions/src/eventos/expurgarSaude.ts` |
| Modelo do dado sensível e retenção | `packages/core/src/eventos/saudeInscrito.ts` |
| Índices declarados | `firestore.indexes.json` |
| Guarda dos índices | `functions/src/__tests__/firestoreIndexes.contract.test.ts` |
| Guarda do incidente | `functions/src/__tests__/expurgoIncidente.test.ts` |

A regra de negócio é RN-147 em [[LEELA-E04-config-vendas]]. O runbook irmão, com a mesma doutrina de incidente aplicada a e-mail, é [[runbook-email-transacional]].
