# REV2-FRIA — segunda opinião sobre o `--apply`

**Lane:** `REV2-FRIA` · **Trace:** `leela-limpeza-prod-20260806` · **Employee:** `sf-reliability-engineer`
**Data:** 2026-08-06 · **Alvo:** commit `73e2c593`, digital `8aa714b4…8696978a` · **Projeto:** `leela-hub`

Escopo desta lane: **confiabilidade da execução**, não do plano. Não fui atrás dos quatro bloqueadores da
`REV-LIMPEZA` nem das correções deles. Nenhuma escrita em produção, nenhum `--apply`. Leitura de produção,
função pura contra o inventário real e o próprio script em `--dry-run`, que só grava arquivo local.

---

## VEREDITO: **BLOQUEAR**

O `--apply` não consegue escrever coisa nenhuma: o portão do plano congelado compara um hash que muda a cada
leitura da mesma produção inalterada, então ele sai com `exit 3` sempre — e, quando esse portão for consertado,
o `--retomar` continua inalcançável, porque os dois mecanismos que a review anterior exigiu se cancelam.

---

## R1 · A digital do plano não é reproduzível · CRÍTICO

**Onde:** `functions/scripts/limpeza-prod-leela-hub.ts:338-340` (`digitalDoPlano`), `:444-456` (o portão),
`:191-195` (`campos()`), e `functions/src/limpeza/planoLimpeza.ts:301-334` (`podarChavesCondenadas`).

**Como quebra.** O `--apply` relê produção, replaneja do zero e recomputa
`sha256(JSON.stringify(plano.operacoes))`. `JSON.stringify` serializa na ordem de inserção; a ordem de inserção
vem de `Object.entries()` sobre o mapa `fields` que a API REST do Firestore devolve. **Essa ordem é aleatória a
cada resposta.** A operação 2805 do plano — a poda de `platform/rollups` — carrega um mapa aninhado
reconstruído a partir dela. Um campo do plano muda de ordem, o hash muda, o portão recusa.

**Prova.**

Doze leituras do mesmo documento, com `updateTime` idêntico (`2026-07-29T15:45:44.164848Z`, sem escrita há oito
dias), devolveram **doze ordens de campo distintas**:

```
leitura  1 · tenantId,eventosAtivos,status,health,receitaLeela,gmv,platformFeePct,nome
leitura  2 · status,platformFeePct,nome,tenantId,eventosAtivos,gmv,receitaLeela,health
leitura  3 · platformFeePct,receitaLeela,gmv,nome,eventosAtivos,status,tenantId,health
…
12 ORDENS DISTINTAS em 12 leituras do MESMO documento (updateTime identico)
```

O próprio script, compilado do commit congelado e rodado três vezes seguidas contra produção inalterada:

```
2810 exclusões, 7 edições · digital 6d8496d2e5aa062c
2810 exclusões, 7 edições · digital 23f77755b90ae859
2810 exclusões, 7 edições · digital d920eb7c83944d16
```

Isolamento do defeito, sobre esses mesmos três planos:

| recorte | corrida 1 | corrida 2 | corrida 3 |
|---|---|---|---|
| as 2810 exclusões | `69d1675ac9bff84f` | `69d1675ac9bff84f` | `69d1675ac9bff84f` |
| as 7 edições | `01eb0dd8e0afc75a` | `7096ba9aecf8172a` | `a652b366ca5db4ac` |
| edições **sem** `platform/rollups` | `54cd5f27dc64f7d9` | `54cd5f27dc64f7d9` | `54cd5f27dc64f7d9` |
| plano canonicalizado (chaves ordenadas) | `4160e945cdb77ad1` | `4160e945cdb77ad1` | `4160e945cdb77ad1` |

**Correção.** Duas, e a segunda importa mais que a primeira.

1. Canonicalizar antes de hashear — ordenar chaves recursivamente. A última linha da tabela é a prova de que
   basta isso para o hash estabilizar.
2. **O `--apply` tem de EXECUTAR as operações do arquivo congelado**, e não as que ele acabou de recomputar.
   Hoje o arquivo serve só de checksum: `main()` itera `plano.operacoes` da linha 396, e de `congelado` lê
   apenas `.digital`. Mesmo com o hash consertado, o que roda é o plano recomputado — que casa com o revisado
   por coincidência aritmética, não por identidade.

Não rodei `--apply`. Não precisei: o portão está nas linhas 449-456 e a primeira escrita na 476.

---

## R2 · `--retomar` é inalcançável: A5 e B2 se cancelam · CRÍTICO

**Onde:** `limpeza-prod-leela-hub.ts:390-396` (relê e replaneja) → `:444-456` (`exit 3`) → `:466-471` (só então
lê o checkpoint).

**Como quebra.** Depois de uma queda parcial o banco tem menos documentos, o replanejamento produz menos
operações e a digital diverge **por construção**. O processo morre antes de chegar ao checkpoint. O registro
por operação que o B2 exigiu, e que foi implementado, nunca é lido.

**Prova.** Seis pontos de queda simulados sobre o inventário real de produção, com a função pura do commit
congelado. Zero escrita.

```
queda apos    1 exclusoes -> banco 3173 docs, replanejo 2816 ops, digital ec47339f6c10a092  DIVERGE
queda apos    7 exclusoes -> banco 3167 docs, replanejo 2810 ops, digital 52ff21a45cab4312  DIVERGE
queda apos   50 exclusoes -> banco 3124 docs, replanejo 2767 ops, digital da94d9317322b832  DIVERGE
queda apos  833 exclusoes -> banco 2341 docs, replanejo 1984 ops, digital 7b47e6a0bf12b727  DIVERGE
queda apos 1500 exclusoes -> banco 1674 docs, replanejo 1317 ops, digital be67525ee81fb488  DIVERGE
queda apos 2809 exclusoes -> banco  365 docs, replanejo    8 ops, digital bf4e87d8b9e65c30  DIVERGE
```

A saída documentada para o `exit 3` é *"refaça o dry-run e revise de novo"*. Num banco meio apagado isso quer
dizer aprovar um plano novo sobre destroços, que é precisamente o que o B2 existe para impedir.

**Correção.** Executar do arquivo congelado (R1, item 2) resolve os dois de uma vez: o `--retomar` passa a
reler o plano aprovado, não o banco.

---

## R3 · Duas operações dividem a mesma chave de checkpoint · ALTO

**Onde:** `limpeza-prod-leela-hub.ts:352` (`chaveDaOp = ${tipo}:${caminho}`) e `:486`.

Medido no plano congelado: **2817 operações, 2815 chaves**.

```
2x  editar:perfis/castelo
      #1 nome de exibição      {"nome":"Leela"}
      #2 link de semente       {"linksExternos":[]}
2x  editar:platform/rollups
      #1 poda de chave         {"tenants":{"castelo-producoes":{…}}}
      #2 nome de exibição      {"tenants.castelo-producoes.nome":"Leela"}
```

**Como quebra.** Numa retomada, `if (feitas.has(chave)) continue` pula as duas. Queda entre a #1 e a #2 de
`perfis/castelo` e os dois links de semente ficam para sempre — o Instagram de uma conta que não existe e o
`.example.com`, na página pública. Queda entre as duas de `platform/rollups` e o painel do platform_admin
segue mostrando "Castelo Produções". Nos dois casos o script imprime que aplicou tudo.

Só morde depois que o R2 for consertado. Entra junto, ou o conserto do R2 entrega este defeito pronto.

**Correção.** Chave com índice da operação, ou hash do conteúdo: `${i}:${tipo}:${caminho}`.

---

## R4 · O portão do `--backup` não compara com nada · ALTO

O A4 tirou o `--backup=x` de circulação, mas o gate só exige que o export exista e imprime o instante com um
"confira que este instante é POSTERIOR". Não há com o que comparar.

Estado do bucket agora:

```
firestore-backups/leela-limpeza-prod-20260806/                 21 objetos · 2026-08-06T13:45:46Z
firestore-backups/leela-limpeza-prod-20260806-pos-titularidade/ 21 objetos · 2026-08-06T15:02:29Z
```

O primeiro é **anterior à transferência de titularidade**. Ele passa no gate. Restaurar ele desfaz a
transferência e tranca o dono fora do painel — o incidente de hoje de manhã, repetido pela rede de segurança.

**Correção.** Receber um instante mínimo na linha de comando e recusar export anterior a ele; recusar também
export com mais de N minutos.

---

## R5 · O caminho de volta é parcial, e a metade que falta é o Auth · ALTO

O import repõe por caminho: devolve os 2810 apagados e reverte os 7 editados. Não apaga o que existir a mais, e
**não toca em Auth**.

A titularidade do dono mora em dois lugares: `ownerUid` no Firestore e a claim
`{"role":"tenant_owner","tenantId":"castelo-producoes"}` no Identity Platform. Um import devolve `ownerUid`
para `uid-marina-castelo` e deixa a claim onde está. Nenhum dos dois backups descreve esse par, e nenhum
handoff diz em que ordem restaurar os dois nem que restaurar um sozinho é estado quebrado.

**A janela de 60 minutos, medida agora:**

```
pointInTimeRecoveryEnablement  POINT_IN_TIME_RECOVERY_DISABLED
deleteProtectionState          DELETE_PROTECTION_DISABLED
versionRetentionPeriod         3600s
earliestVersionTime            2026-08-06T16:21:20.975630Z   (= agora − 60,0 min, deslizante)
concurrencyMode                PESSIMISTIC
```

Ela foi provada para **leitura** em `readTime` passado. O rollback não precisa de leitura: precisa de
`exportDocuments` com `snapshotTime`. Esse caminho nunca foi exercido — a lista de operações do banco não tem
um único export com `snapshotTime` preenchido. Rede não testada é rede que se descobre furada no dia.

**Orçamento de tempo, medido.** O inventário completo leva **11,2 s** (3.174 documentos, 3.291 chamadas REST,
latência média 65 ms, p95 255 ms). As 2.817 operações são sequenciais: 3 a 8 min conforme a latência. Dez
transições de grupo de ordem a 10 s cada somam 100 s. **Ponta a ponta: 5 a 10 minutos.** A corrida cabe na
janela com folga.

O prazo apertado não é a corrida, é a **descoberta**. Quem começa a apagar em T tem até T+60min para disparar o
export com `snapshotTime=T`. Os recomputes obrigatórios e a conferência dos cinco números acontecem dentro
desses 60 minutos, e é neles que um erro aparece.

---

## R6 · O recompute obrigatório depende de uma conta cuja senha ninguém tem · ALTO

`recomputePlatformRollups` é callable de `platform_admin`, sem cron. O único portador do papel é
`FTqslV98itZUNGwL5ss6201d23Z2`, hoje `inguzbuilders@gmail.com`. O registro de credenciais
(`leela-credenciais-20260806.md:19`) diz, verbatim: *"Onde vive o valor da senha: em lugar nenhum do sistema e
em lugar nenhum meu… Quem define a senha é ele."* O link de definição é de uso único e vale cerca de 1 hora.

Se a senha não estiver definida quando a corrida acabar, `platform/rollups` fica errado por tempo
indeterminado: `gmvTotal` R$ 364.627, `receitaLeelaTotal` R$ 39.598,84, `tenantsAtivos` 4 e `eventosAtivos` 5,
num banco com um tenant, dois eventos e uma venda real de R$ 10. É a primeira tela que o dono abre em
`/plataforma`.

Isto é pré-requisito de corrida, não item de follow-up. Confirmar o acesso **antes** do `--apply`.

---

## R7 · A varredura de fantasmas cobre um de três subtrees, e um cron os realimenta · MÉDIO

| fantasma | filhos | apagados | sobrevivem |
|---|---|---|---|
| `profissionais/QbqlSxanxlcFeHCy4g47Vp7jlgz1` (o dono) | 1 | 0 | 1 — correto, intocável por regra |
| `profissionais/uid-marina-castelo` | 10 | 10 | 0 |
| `profissionais/uid-felipe-martins` | 10 | **0** | **10** |
| `profissionais/uid-ritmo-forte` | 10 | **0** | **10** |

O Passo 3c (`planoLimpeza.ts:510-536`) só condena filho de fantasma que **referencie** entidade condenada. Os
`analyticsSnapshots` do felipe e do ritmo-forte não citam nenhuma, então ficam. Vinte documentos de duas
produtoras de semente sobrevivem à faxina cujo objetivo declarado é deixar uma produtora.

E eles crescem. `coletaDiaria` (03:05, diário) descobre profissionais com `listDocuments()`
(`analytics/coletaDiaria.ts:133`), que devolve pai inexistente de propósito, e escreve
`analyticsSnapshots/{dia}` sem checar o pai (`:200`). Um documento novo por dia, por identidade morta,
invisível em listagem comum.

Ainda: `onClubeWriteDashboard` reescreve `profissionais/uid-felipe-martins/dashboard/current` durante a própria
corrida — no delete de `clubes/corrida-perfeita-sul`, ordem 70 — com valor computado no meio da deleção. O
plano não o apaga depois.

---

## R8 · O gate de proteção do B3 tem de ser desligado para a corrida acontecer · MÉDIO

O plano traz **18 `conflitosDeProtecao`**, todos do uid `wNXRTvMM3vc7…` em chave composta (carrinhos, ciclos,
`cobrancasPixAtivas`, pagamentos). Sem `--aceitar-conflitos-de-protecao` o `--apply` sai com `exit 4`.

Ou seja: a bandeira de desligamento é **obrigatória** nesta corrida, e o gate que o B3 pediu vira impressão na
tela. Não é defeito de código — é o operador aprendendo, na primeira corrida, que a proteção se desliga com uma
flag. O runbook precisa registrar por que estes 18 são aceitáveis (pedidos cancelados e falhos em eventos
condenados; a compra paga `8CDHM` sobrevive), para que a flag não vire hábito.

---

## O que tentei derrubar e não consegui

Também é resultado. Cada um era hipótese de defeito e morreu contra medição.

1. **Cobrança Pix viva sendo apagada.** As três `cobrancasPixAtivas` condenadas venceram em 03/08
   (`pixExpiraEmMillis` → `2026-08-03T00:53:31Z`, `00:59:38Z` e `11:12:13Z`). Nenhuma cobrança aberta morre.
2. **Cron de carrinho criando ciclo órfão no meio da corrida.** `expirarCarrinhosAbandonados` consulta
   `status == 'aberto'`; nenhum dos 9 carrinhos está aberto (todos `expirado_sem_concluir` ou `concluido`).
3. **`varrerEstornosOrfaos` disparando estorno real no gateway.** `estornosOrfaosPendentes` e
   `ingressosPendentes` têm 0 documentos, e nada na corrida os cria. Os 12 pagamentos apagados são
   `confirmado` de semente (sem id de gateway), `cancelado` e `falhou`.
4. **`virarLoteCron` (collectionGroup sem `limit`, a cada 5 min) pegando lote condenado.** Cinco dos sete lotes
   vencidos são condenados, mas `virarLote.ts:152` checa o evento, e o evento morre na ordem 10.
5. **A corrida estourando a janela de 60 minutos.** Não estoura: 5 a 10 minutos ponta a ponta, medidos.
6. **Tempestade de gatilhos por delete de inscrito.** A ordem evento-primeiro desarma cinco dos seis gatilhos
   de `inscritos`. Sobra `onInscritoWriteCrm`, que escreve um documento por cliente — sem alvo comum de
   contenção. O banco é `PESSIMISTIC`, então seria bloqueio e não aborto, mas não há documento quente.
7. **Vencimento de credencial no meio das 2.817 operações.** O cache do A6 guarda o token com margem de 120 s e
   o refresh está no `configstore`. Numa corrida de 5 a 10 minutos, o token não vence.
8. **Retentativa de gatilho ressuscitando o que já morreu.** Nenhum gatilho declara `maxInstances` e nenhum tem
   `failurePolicy` (todos v1, sem `setGlobalOptions`): falha de gatilho é descartada, nunca retentada. Aqui
   isso joga a favor.

---

## O que vira LIBERAR

1. **[R1]** Digital canonicalizada (chaves ordenadas) **e** `--apply` executando as operações do arquivo
   congelado, não as recomputadas. Teste: três dry-runs seguidos produzem a mesma digital.
2. **[R2]** Retomada provada com um teste que aplique parcialmente, mate o processo e rode `--apply --retomar`
   até o fim, contra emulador ou dado sintético.
3. **[R3]** Chave de checkpoint única por operação. Teste que falhe com o plano atual, que tem duas colisões.
4. **[R4]** `--backup` recusando export anterior a um instante dado e export velho demais.
5. **[R5]** Runbook de volta escrito e **exercitado uma vez**: `exportDocuments` com `snapshotTime` provado no
   projeto, a ordem Firestore↔Auth explícita, e o aviso de que restaurar um sem o outro quebra a titularidade.
6. **[R6]** Acesso de `platform_admin` confirmado funcionando **antes** do `--apply`.
7. **[R7]** Decisão sobre os 20 documentos de `uid-felipe-martins` e `uid-ritmo-forte`: varrer junto ou
   registrar que ficam, sabendo que `coletaDiaria` acrescenta um por dia a cada um.
8. **[R8]** Os 18 conflitos justificados no runbook, um a um, antes de a flag ser digitada.

---

*Nenhuma escrita em produção nesta lane. Nenhum `--apply`. `apps/`, `packages/design-system`,
`packages/api-client`, `packages/core/src/platform`, `functions/src/platform` e `firestore.rules` não foram
tocados. Ferramentas de medição ficaram fora do repo.*
