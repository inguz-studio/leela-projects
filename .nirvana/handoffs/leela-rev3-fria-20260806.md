# REV3-FRIA — a review de contexto zero que decide o `--apply`

**Lane:** `REV3-FRIA` · **Trace:** `leela-limpeza-prod-20260806` · **Papel:** revisor antagonista frio
**Data:** 2026-08-06 · **Alvo:** `e14ce3f0` + `fd73aac0` + `42808c04` · **Projeto:** `leela-hub`

Não construí nada do que julgo aqui. Compilei o runner por conta própria, rodei quatro dry-runs contra
produção, dissequei o plano congelado contra um inventário meu de 3.176 documentos, li teste por teste das
três suítes e escrevi uma quarta para cobrir o que elas não cortam. Nenhuma escrita em produção, nenhum
`--apply`, nenhuma conta de Auth tocada.

---

## VEREDITO: **LIBERAR**, com as pré-condições do runbook

Os quatro bloqueadores da REV2-FRIA, os dois da rodada 2 e o achado N1 morreram, e morreram contra execução,
não contra argumento. Nenhum vetor livre meu derrubou o plano.

O que eu derrubo é o **número que está autorizado**, e a **papelada**. O plano que rodaria hoje tem **2.873
operações e 19 conflitos de proteção**, não 2.817 e 18: o brief, o selo do maestro e a rodada 2 descrevem o
plano de *antes* do FIX3. E o runbook que a lane FIX3 tinha como gate 5 não existe em lugar nenhum — o próprio
`planoLimpeza.ts:96` manda ler uma seção dele que nunca foi escrita. Ele vai no fim deste arquivo.

---

## Placar item a item

| # | Item | Veredito | Prova executada |
|---|---|---|---|
| F1/R1 | Digital reproduzível | **SUSTENTA** | 7 dry-runs, 2 lanes, 90 min de intervalo, mesmo sha256 do **arquivo inteiro** |
| F1 item 2 | O `--apply` executa o congelado | **SUSTENTA** | `aplicarPlano(congelado.plano)` nos dois caminhos; o recomputado só abre o portão |
| F2/R2 | Retomada que não replaneja | **SUSTENTA** | suíte corta em todos os pontos; o corte que faltava eu escrevi, e ele aguenta |
| F3/R3+B2 | Chave de checkpoint única | **SUSTENTA** | 2.873 operações, 2.873 chaves; sem o índice seriam 2.871 |
| F4/N1 | Condenação transitiva | **SUSTENTA** | os 45 sob `clubes/` condenados, **mais um 46º** que ninguém tinha visto; 0 órfão estrutural |
| B1/F11 | Drenagem 20 s / 90 s | **SUSTENTA** | 13 medições, máximo 17,3 s; 90 s é 5,2× o pior caso — com uma ressalva na retomada |
| B4/F7 | Rollups fechando no PATCH | **SUSTENTA** | os quatro números no PATCH, valores e **tipos** conferidos contra o dado bruto |
| R4/F5 | Régua do backup | **SUSTENTA** | executada contra o bucket real: os **dois** exports existentes são recusados agora |
| R7/F8 | Fantasmas varridos | **SUSTENTA** | os 10 do felipe saem; lastro dele depois do plano = **zero** |
| — | Número autorizado (2.817/18) | **DERRUBA** | é 2.873 e 19; o `+56` é o próprio conserto do N1 e do R7 |
| — | Runbook (gate 5 da FIX3, F6, F9) | **DERRUBA** | não existe; `exportDocuments` com `snapshotTime` nunca foi disparado no projeto |

---

## F1/R1 · A digital não dança mais. Nem o arquivo.

Compilei `limpeza-prod-leela-hub.ts` + `limpeza/*.ts` num diretório meu, fora do repo, e rodei quatro dry-runs
contra produção. Não comparei só a digital: comparei o **sha256 do arquivo congelado inteiro**, que é coisa
mais forte, porque pega também o relatório que a digital deixa de fora.

```
rev3-dry1.json  286367503312bd5331e14eff18695e06586494bd156c6338c1fa84a97a3d621c   618.193 bytes
rev3-dry2.json  286367503312bd5331e14eff18695e06586494bd156c6338c1fa84a97a3d621c   618.193 bytes
rev3-dry3.json  286367503312bd5331e14eff18695e06586494bd156c6338c1fa84a97a3d621c   618.193 bytes
rev3-dry4.json  286367503312bd5331e14eff18695e06586494bd156c6338c1fa84a97a3d621c   618.193 bytes
```

E os três da lane FIX3, gerados 90 minutos antes, por outra pessoa, com outro build:

```
fix3/dryrun1.json  286367503312bd5331e14eff18695e06586494bd156c6338c1fa84a97a3d621c
fix3/dryrun2.json  286367503312bd5331e14eff18695e06586494bd156c6338c1fa84a97a3d621c
fix3/dryrun3.json  286367503312bd5331e14eff18695e06586494bd156c6338c1fa84a97a3d621c
```

Sete arquivos, dois builds independentes, uma hora e meia de distância, byte por byte iguais. O R1 dizia que
doze leituras do mesmo documento davam doze ordens de campo; agora a ordem de leitura não muda uma linha.

Digital: `2bcfdc6e0e3710eaf2174553c81f3b80a4b7710e2a3daf2f12c141671ea4cb27`. Uma corrida ponta a ponta do
dry-run leva **7,9 s** (3.172 documentos reais + 4 fantasmas).

Sobre o item 2, que a REV2 disse importar mais que o primeiro: li os dois caminhos de `main()`. O congelado é
a fonte nos dois. Na primeira corrida (`:568`) e na retomada (`:512`), quem entra em `aplicarPlano` é
`congelado.plano`; o plano recomputado só existe para responder "produção ainda é a que foi revisada?" e é
descartado depois. Não sobrou lugar onde o recomputado seja executado.

## F3/R3 · 2.873 operações, 2.873 chaves

Medido no plano real desta hora, não no de antes:

```
TOTAL OPS        : 2873   (2866 exclusões, 7 edições)
chaves COM índice: 2873
chaves SEM índice: 2871
colisões que o índice mata:
   2x  editar:perfis/castelo        (nome + linksExternos)
   2x  editar:platform/rollups      (poda + nome)
```

As duas colisões que a rodada 2 apontou continuam existindo no plano — o conserto não as fez sumir, fez a
chave parar de casá-las. É o conserto certo: sumir com elas seria mexer no que se escreve.

Detalhe que ninguém pediu e que importa para a ordem das duas de `platform/rollups`: a primeira substitui o
mapa `tenants` inteiro (carregando ainda "Castelo Produções") e a segunda troca só o nome dentro dele. Se
rodassem invertidas, o nome antigo voltaria. A ordem vem do passo que empurrou cada uma (3b antes do 4) e da
estabilidade do `sort`, e é determinística — os sete arquivos idênticos provam isso melhor que a leitura.

## F2/R2 · A retomada aguenta, inclusive no corte que a suíte não dava

A suíte do runner é boa e não é teatro: ela corta em **todos** os 2.873 pontos possíveis, não numa amostra, e
não compara só a lista de chaves — compara o **retrato final do banco** contra a corrida sem queda. Isso é a
asserção certa.

O que ela não faz: `talvezCair()` incrementa e lança **antes** da escrita. A janela em que o processo morre
*depois* de escrever e *antes* de registrar o checkpoint — a única em que a retomada reexecuta uma operação —
nunca é exercitada. O comentário de `executarPlano:104` declara essa janela segura e não tem teste atrás.

Escrevi o teste. `functions/src/__tests__/limpezaProdRev3.test.ts`, caso `[REV3-1]`: mata o processo depois da
escrita, em todos os cortes, e confere que o banco final é idêntico ao da corrida sem queda e que houve
exatamente **uma escrita a mais** que o plano (a reexecutada). Passa em todos.

Aguenta porque nenhuma operação do plano lê o estado atual para decidir o que escrever: `DELETE` de documento
ausente devolve 200 e todo `PATCH` carrega corpo fixo vindo do arquivo. Confirmado operação a operação.

## F4/N1 · A condenação desce por caminho — e desce onde ninguém tinha olhado

Os 45 documentos de nível 2 sob `clubes/` entram no plano com motivo explícito, não em silêncio:

```
33  clubes/{c}/desafios/{d}/acoes/{a}       27 sob corrida-perfeita-sul
12  clubes/{c}/parcerias/{p}/conversoes/{x} 18 sob floripa-run-coletivo
motivo: "descendente de documento condenado (clubes/corrida-perfeita-sul/desafios/desconexao-rota-do-sol)"
```

Diferença do plano antigo para o novo, medida arquivo contra arquivo, sem uma operação a menos:

```
SÓ NO NOVO: 56          SÓ NO ANTIGO: 0
   + 33  clubes/{id}/desafios/{id}/acoes/{id}
   + 12  clubes/{id}/parcerias/{id}/conversoes/{id}
   +  9  profissionais/{id}/analyticsSnapshots/{id}     (uid-felipe-martins)
   +  1  profissionais/{id}/dashboard/{id}              (uid-felipe-martins)
   +  1  pagamentos/{id}/webhookEventos/{id}            ←←← este ninguém viu
```

O 46º órfão. `pagamentos/pag-wNXRTvMM3vc7…-chk-60f7487f…/webhookEventos/evt_071da53a…`, criado em
**05/08 06:03**, portanto vivo desde antes das duas reviews. Ele não carrega `eventoId` nem `tenantId`, mora
sob raiz `pagamentos/` e não cita id condenado nenhum: escapava do Passo 1, do Passo 3c e da varredura por
valor exatamente como os 45 escapavam. As duas rodadas anteriores mediram o defeito só sob `clubes/` e
concluíram "45"; o número real era 46, e a generalização "em qualquer raiz" é o que o pega. Se o conserto
tivesse sido um remendo específico para `clubes/`, este documento ficaria pendurado.

Cheque final contra produção, com o plano aplicado em simulação sobre o inventário real:

```
sobreviventes com ancestral apagado : 0
sobreviventes citando id condenado  : 3   (os três financeiros vetados pelo maestro)
chave de mapa condenada sobrevivente: 0
operações sem documento correspondente: 0
```

Os três de sempre: `parceirosAssessoria/51888000000199.condicaoDesconto.eventoId` e os dois
`repasses/repasse-demo-000{1,2}.eventoId`. Continuam denunciados no relatório, continuam fora do plano por
decisão do maestro.

## R7/F8 · Felipe sai inteiro, e o lastro é zero de verdade

A varredura da ordem 110 tem **20** operações, não 10: os 10 da marina (que já saíam por apontar para
condenado) e os 10 do felipe (9 `analyticsSnapshots` + `dashboard/current`), estes por declaração.

Conferi a afirmação "não sobra um documento de lastro dele" contra o inventário, não contra o comentário:

```
uid-felipe-martins : 1 referência sobrevive — `profissionais/uid-felipe-martins`, que é o PAI FANTASMA
                     (documento que não existe). Sem filhos, ele deixa de aparecer até com showMissing.
uid-ritmo-forte    : 13 sobrevivem — decisão declarada, clube vivo com 4 membros, linha de base de 06/08
uid-marina-castelo :  7 sobrevivem — autoria e trilha de auditoria, decisão registrada no T7
```

## B1/F11 · A drenagem é medida, e a margem aguenta o pior caso

Treze execuções observadas no Cloud Logging, máximo 13.325 ms de execução e 17,3 s ponta a ponta do write até
a última escrita do gatilho. 20 s entre grupos comuns cobre 1,16× o pior caso observado; 90 s antes do grupo
FANTASMAS cobre 5,2×. O limite que importa é só um — o 100 para o 110 —, porque é onde `onClubeWriteDashboard`
pode recriar um dashboard depois de a varredura ter passado, e é justamente esse que ganhou os 90 s.

Custo: 11 grupos de ordem, 10 transições, 9 × 20 s + 1 × 90 s = **4,5 min** de espera. Somado a ~2.873
operações sequenciais a 65–163 ms, dá **9 a 12 min ponta a ponta**, dentro da janela de 60 min de retenção de
versão com folga larga.

**Ressalva minha, provada em teste:** a drenagem só acontece se o grupo anterior escreveu *nesta rodada*. Numa
retomada que pega o grupo 100 inteiro já registrado no checkpoint, a espera de 90 s **não acontece** e a
varredura de fantasma entra direto (`[REV3-4]` no meu arquivo de teste). Medi a consequência: nenhuma das 7
edições da ordem 100 recria um dashboard que a ordem 110 apague — `floripa-run-coletivo` é do dono e
`ritmo-forte-assessoria` é do uid que fica. Some-se o humano entre a queda e o `--retomar`, e o risco é
nenhum. Mas é comportamento, não acidente, e por isso está no runbook como uma linha de espera manual.

## B4/F7 · Os quatro números fecham, e os tipos também

O PATCH que sai, lido do plano real:

```
gmvTotal           167277        (era 364627)
receitaLeelaTotal  17564.09      (era 39598.84)
tenantsAtivos      1             (era 4)
tenants.castelo-producoes.eventosAtivos  2   (era 5)
tenants.castelo-producoes.health         "saudavel"
```

Fui atrás de um defeito que ninguém tinha procurado: `envelope()` decide `integerValue` ou `doubleValue` por
`Number.isInteger`, então um total que caia num número redondo trocaria o **tipo** do campo em produção. Li o
documento bruto e cruzei um a um:

```
gmvTotal          integerValue 364627   → 167277    integer   ✔ mesmo tipo
receitaLeelaTotal doubleValue  39598.84 → 17564.09  double    ✔ mesmo tipo
tenantsAtivos     integerValue 4        → 1         integer   ✔ mesmo tipo
gmv               integerValue 167277   → 167277    integer   ✔
receitaLeela      doubleValue  17564.09 → 17564.09  double    ✔
platformFeePct    doubleValue  10.5     → 10.5      double    ✔
```

Nenhuma troca. O risco existe no `envelope()` e não é acionado por este plano. Também conferi que o mapa
`tenants` não carrega `timestampValue` nem `referenceValue` em nenhum tenant — se carregasse, o `achatar` os
teria virado string e o PATCH os reescreveria como string.

O que **não** fecha, e o runbook tem de dizer com todas as letras: `platform/rollups.atualizadoEm` fica fora
da máscara e continua marcando 29/07 depois de a corrida reescrever os números.

## R4/F5 · A régua reprova os dois exports que existem

Executada agora, com os instantes lidos do bucket neste minuto:

```
RECUSA  | idade 434,6 min | export 13:45:46.040Z, mínimo = transferência de titularidade
        → "export é ANTERIOR ao mínimo exigido (2026-08-06T14:22:39Z)"
RECUSA  | idade 357,9 min | export 15:02:29.241Z, mínimo = transferência de titularidade
        → "export tem 357.9 min de idade, acima do teto de 180 min"
PASSA   | idade   1,0 min | export fresco hipotético
```

Duas travas independentes, e hoje as duas mordem. O export de 13:45 — o que restauraria o dono para fora do
painel — morre pela régua do instante mínimo, que era o caso de teste exigido. O de 15:02, que passaria nessa,
morre pela idade. Só um export fresco entra.

---

## O que tentei derrubar e não consegui

Vetores livres, fora da lista do brief. Cada um era hipótese de defeito e morreu contra medição.

1. **Troca de tipo em campo numérico do rollup.** Cruzei os seis números contra o dado bruto. Nenhum flip.
2. **`achatar`/`envelope` corrompendo timestamp dentro de mapa reescrito.** O único mapa reescrito é
   `tenants`, e ele não tem timestamp em nenhum dos seis tenants.
3. **Máscara de PATCH apagando irmãos.** `segmentoMascara` escapa `castelo-producoes` com crase, então a
   máscara sai ``tenants.`castelo-producoes`.nome`` e atinge só a folha. As sete edições foram conferidas uma
   a uma: nenhuma manda mapa parcial sob máscara de raiz.
4. **Operação apontando para documento que não existe.** 0 de 2.873.
5. **Ordem invertida entre pai e filho.** 0 inversões dentro do mesmo grupo de ordem e 0 fora de `eventos/`.
   As 2.024 inversões que uma varredura ingênua acusa são todas a inversão deliberada do B1 (o documento do
   evento morre primeiro, para desarmar os quatro gates de recompute).
6. **Reexecução de operação não registrada corrompendo o resultado.** Testado em todos os cortes. Idêntico.
7. **A compra real morrendo junto.** `pedidos/ped-…ed77a161…` (pago, R$ 10, `teste-taxa-repassada`) sobrevive,
   e `eventos/teste-taxa-repassada/ingressoCodigos/T93N7F` sobrevive com ele.
8. **A varredura de fantasma furando a proteção de identidade.** O Passo 3c empurra direto em `operacoes` sem
   passar por `condenar()`, então ele **não gera `conflitosDeProtecao`** — assimetria real. Medi: dos 20
   documentos da ordem 110, **zero** citam uid protegido. Não morde neste plano.
9. **Produção ter mudado desde o congelamento.** Não mudou: os sete arquivos idênticos cobrem 90 minutos, e o
   portão de digital pega qualquer mudança que altere o conjunto de escritas.

---

## Achados que não bloqueiam, e que o runbook tem de carregar

**A1 · O número autorizado está errado em todo lugar.** Brief, selo do maestro e rodada 2 dizem 2.817
operações e 18 conflitos. O plano de hoje tem **2.873 e 19**. Os 56 a mais são o conserto do N1 (46) e do R7
(10); o 19º conflito é o `webhookEventos` do parágrafo do N1. Quem apertar o botão confere o número na tela
contra o que autorizou — e ia bater de frente com um número diferente.

**A2 · O runbook não existe.** Era o gate 5 da lane FIX3. Pior: `planoLimpeza.ts:96` manda o próximo leitor
consultar "o runbook, seção 'Os dois fantasmas de semente'", e essa seção nunca foi escrita. O F9 (os
conflitos justificados um a um antes de a flag ser digitada) também não existia. Os dois vão abaixo.

**A3 · `exportDocuments` com `snapshotTime` continua sem nunca ter sido disparado.** Listei as 28 operações do
banco: há exatamente dois `ExportDocumentsMetadata`, os dois `SUCCESSFUL`, e nos dois o `snapshotTime` está
**ausente**. É o item 5 da lista LIBERAR da REV2 ("exercitado uma vez"), e ele segue aberto. Não o exercitei
porque disparar export não estava autorizado nesta lane. A saída é barata e está no runbook: o export fresco
que o `--apply` já exige passa a ser **feito com `snapshotTime`**, o que fecha o item e prova a rede de volta
antes de ela ser necessária, ao custo de nada. A rede primária — export comum mais `importDocuments` — está
provada duas vezes e restaura tudo, porque o plano só apaga e faz sete edições de corpo fixo.

**A4 · A digital protege as operações e mais nada.** `lerPlanoCongelado` diz em comentário que "o conteúdo tem
de casar com ela", mas `digitalDoPlano` só come `plano.operacoes`. Provado em teste (`[REV3-2]`): apagar
`conflitosDeProtecao` do arquivo mantém a digital válida — e é `conflitosDeProtecao` que decide o `exit 4`.
Mexer numa operação continua sendo pego. O motivo registrado para a exclusão era que o relatório "muda de
ordem entre leituras"; isso **deixou de ser verdade** no FIX3, e eu provei nos dois sentidos: os sete arquivos
byte a byte iguais, e o teste `[REV3-3]`, que embaralha ordem de documento e ordem de campo com seis sementes
e obtém o plano canônico idêntico. Estender a digital ao plano inteiro é barato e não reabre o R1. Fica como
recomendação, não como trava: o furo exige edição manual do arquivo, e quem edita já tem a flag.

**A5 · A idade do backup pode trancar uma retomada legítima.** O teto de 180 min vale também no `--retomar`.
Uma queda às 22h com export das 19h faz o `--retomar` das 22h10 passar, mas o das 23h será **recusado**. A
armadilha é o operador sob pressão tirar um export novo para satisfazer o portão: esse export novo já não tem
os documentos apagados e **não serve de volta nenhuma**. O certo é subir `--backup-idade-max-min` e continuar
apontando para o export original. Está no runbook em caixa alta.

**A6 · `recomputePlatformRollups` piora o resultado se for rodado.** Li `recomputePlatformRollupsCore`: ele faz
`set()` **integral** e tira `eventosAtivos` de `tenants/{id}.eventosAtivos`, que hoje vale **5** e que o plano
não toca. Rodar a "conferência" depois da corrida desfaz o `eventosAtivos: 2` que o PATCH acerta. Os outros
números batem. Conclusão prática, e ela simplifica a vida: a conferência dos rollups é uma **leitura**, não uma
chamada — e o acesso `platform_admin` do R6, que era pré-requisito de corrida, deixa de ser necessário para o
`--apply`. Ele volta a ser necessário só se alguém decidir consertar `tenants/castelo-producoes.eventosAtivos`.

**A7 · `saldo/current` não tem quem o recompute.** `recomputarSaldoRepasse` não é callable; ela só é alcançada
por `onRepasseWrite`, por `encerrarEventos` e por `transicoesRepasse`. Como o ajuste A1 tirou as três escritas
em `repasses` do plano, nenhum desses caminhos dispara nesta corrida. Estado de hoje:
`vendidoBruto 167287 · disponivel 122756.65 · comprometido 16700 · retido 10266.26`, para um banco que fica com
uma venda paga de R$ 10. O `recomputesObrigatorios[1]` pede um recompute explícito que **o operador não tem
como fazer** sem tocar em documento de repasse, que é dinheiro e está vetado. Isto é lacuna declarada do dono,
não item de corrida.

---

# RUNBOOK DO `--apply`

Escrito por esta lane porque não existia. Quem executa não é esta lane.

## Pré-condições

| # | Pré-condição | Estado |
|---|---|---|
| 1 | Autorização do dono | SATISFEITA — "pode fazer a limpeza" |
| 2 | Acesso `platform_admin` (R6) | SATISFEITA e **não mais necessária** para o apply (ver A6) |
| 3 | Backup de Auth | SATISFEITA — `C:\dev\leela-backups\…\auth-users-20260806.json`, 21 contas com hash |
| 4 | Export fresco do Firestore, com `snapshotTime` | **PENDENTE — passo 1 abaixo** |
| 5 | Dry-run refeito e revisado imediatamente antes | **PENDENTE — passo 2 abaixo** |
| 6 | Os 19 conflitos lidos na tela | **PENDENTE — passo 3 abaixo** |
| 7 | Janela de baixa circulação | Escolha do operador. Qualquer escrita real entre o passo 2 e o 4 derruba a digital e o `--apply` sai com `exit 3` |

## Passo 1 · Export fresco, e a rede de volta provada no mesmo ato

Guarde o instante **antes** de disparar. Ele vira o `--backup-minimo`.

```bash
AGORA=$(date -u +"%Y-%m-%dT%H:%M:%SZ")          # guarde este valor
PREFIXO="leela-limpeza-prod-$(date -u +%Y%m%d-%H%M)-pre-apply"
SNAP=$(date -u -d '-2 minutes' +"%Y-%m-%dT%H:%M:%SZ")

curl -X POST \
  "https://firestore.googleapis.com/v1/projects/leela-hub/databases/(default):exportDocuments" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -d "{\"outputUriPrefix\":\"gs://leela-hub.firebasestorage.app/firestore-backups/${PREFIXO}\",
       \"snapshotTime\":\"${SNAP}\"}"
```

`snapshotTime` tem de cair **dentro** da janela de retenção de versão (`earliestVersionTime`, hoje deslizante
em 60 min). Se a API recusar o campo, refaça **sem** `snapshotTime` e registre que a rede secundária não
existe — a primária basta, mas o item R5 fica aberto de novo.

Espere a operação virar `SUCCESSFUL` antes de seguir. Sem isso o `.overall_export_metadata` não existe e
`localizarBackup` recusa o URI:

```bash
curl -s "https://firestore.googleapis.com/v1/projects/leela-hub/databases/(default)/operations" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" | grep -E "operationState|outputUriPrefix"
```

Os dois exports anteriores levaram 9 s. Os 21 objetos do prefixo confirmam o export completo.

## Passo 2 · Dry-run que congela o plano da hora

```bash
node <build>/scripts/limpeza-prod-leela-hub.js --dry-run --plano=<dir>/plano-apply.json | tee dryrun-apply.txt
```

Confira na tela, e recuse seguir se algum não bater:

- `2866 exclusões, 7 edições` e digital começando em `2bcfdc6e0e3710ea`
- `310 documentos sobrevivem (de 3176)` — 306 reais mais 4 fantasmas
- `ÓRFÃOS QUE O PLANO PREVINE` traz **3** linhas, todas de `tenants/castelo-producoes` (os financeiros vetados)
- `intocáveis` traz **1**: `profissionais/QbqlSxanxlcFeHCy4g47Vp7jlgz1/dashboard/current`
- `conflitos` traz **19**

Se a digital vier diferente de `2bcfdc6e…`, produção mudou depois desta review. Não é para seguir: é para
revisar o diff do plano novo. O arquivo sai canonicalizado justamente para o diff ser legível.

## Passo 3 · Os 19 conflitos, lidos na tela antes de a flag ser digitada

Todos os 19 são do uid `wNXRTvMM3vc7Boyi91vRgx3DBQy2` — a sessão que fez a compra real. Nenhum deles é a
compra real. Classes, medidas documento a documento:

| # | Documento | Estado | Por que sai |
|---|---|---|---|
| 3 | `pedidos/ped-wNXRTvMM3vc7…` | `cancelado` (R$ 113), `cancelado` (R$ 175), `falhou` (R$ 75) | pedidos mortos em eventos condenados |
| 3 | `pagamentos/pag-wNXRTvMM3vc7…` | 2 `cancelado`, 1 `falhou` | pagamento dos pedidos acima |
| 1 | `pagamentos/…/webhookEventos/evt_071da53a…` | — | filho do pagamento `falhou` |
| 3 | `cobrancasPixAtivas/wNXRTvMM3vc7…` | vencidas em 03/08 | cobrança Pix expirada de evento condenado |
| 2 | `carrinhos/wNXRTvMM3vc7…` | `concluido`, `expirado_sem_concluir` | carrinho de evento condenado |
| 2 | `carrinhos/…/ciclos/{1,3}` | `expirado_sem_concluir` | ciclos do carrinho acima |
| 1 | `eventos/meia-floripa-2026/inscritos/ped-wNXRTvMM3vc7…` | `pendente` | inscrição não paga em evento condenado |
| 3 | `pedidos/…` por `responsavel.atletaId` | — | a mesma trinca, contada pelo campo além da chave |
| 1 | `eventos/…/inscritos/…` por `atletaId` | — | a mesma inscrição, contada pelo campo |

O que **sobrevive** do mesmo uid, conferido no plano: `pedidos/ped-…ed77a161…` (pago, R$ 10,
`teste-taxa-repassada`), o ingresso `T93N7F` e o pedido `falhou` de `corrida-inverno-floripa-2026`.

A flag `--aceitar-conflitos-de-protecao` é **obrigatória** nesta corrida — sem ela o comando sai com `exit 4`.
Ela libera em bloco: aceita estes 19 e qualquer outro que apareça junto. Por isso a leitura acima vem antes.

## Passo 4 · A invocação

```bash
node <build>/scripts/limpeza-prod-leela-hub.js \
  --apply \
  --plano=<dir>/plano-apply.json \
  --checkpoint=<dir>/plano-apply.checkpoint \
  --backup=gs://leela-hub.firebasestorage.app/firestore-backups/<PREFIXO do passo 1> \
  --backup-minimo=<AGORA do passo 1> \
  --aceitar-conflitos-de-protecao
```

O arquivo de checkpoint tem de **não existir** — com ele preenchido e sem `--retomar`, o comando sai com
`exit 5`, e isso é proteção, não estorvo. Os defaults que ficam implícitos: `--backup-idade-max-min=180`,
`--drenagem-ms=20000`, `--drenagem-fantasmas-ms=90000`. Não baixe as drenagens.

## Passo 5 · O que olhar enquanto roda

Tempo esperado: **9 a 12 min**. Sequência na tela:

1. `[backup] N objetos · export concluído em <ISO>` e `[backup] régua OK`. Se recusar, pare: é o portão do R4.
2. `[3/4] conferindo o plano aprovado contra a produção de agora…` seguido de `digital confere`.
   `exit 3` aqui quer dizer que produção mudou entre o passo 2 e agora. Não force: refaça o passo 2.
3. `[4/4] APLICANDO…` com progresso a cada 50 operações.
4. **Dez linhas de drenagem.** Nove dizendo `20s`; a décima, antes de entrar no grupo 110, dizendo `90s`.
   Se a de 90 s não aparecer, a varredura de fantasma correu cedo demais.
5. `2873 operações aplicadas · 0 já estavam no checkpoint.` Qualquer outro par de números merece leitura.

O arquivo de checkpoint cresce até **2.873 linhas**. Ele é a única memória do que foi feito: não o apague, não
o mova, não edite o `--plano` enquanto a corrida existir.

Códigos de saída: `2` falta `--backup`, `--backup-minimo` ou o arquivo de plano · `3` digital divergente ·
`4` conflitos sem a flag · `5` checkpoint existente sem `--retomar` · `6` contabilidade das operações não
fecha · `1` qualquer outro erro.

## Passo 6 · Se cair no meio

1. **Espere dois minutos** antes de retomar. A drenagem não acontece para grupo que a retomada só pula (achado
   desta review), e esses dois minutos cobrem o pior gatilho medido com folga de 7×.
2. Retome com o **mesmo** plano, o **mesmo** checkpoint e o **MESMO export do passo 1**:

```bash
node <build>/scripts/limpeza-prod-leela-hub.js \
  --apply --retomar \
  --plano=<dir>/plano-apply.json \
  --checkpoint=<dir>/plano-apply.checkpoint \
  --backup=gs://…/<PREFIXO do passo 1> \
  --backup-minimo=<AGORA do passo 1> \
  --backup-idade-max-min=600 \
  --aceitar-conflitos-de-protecao
```

⛔ **NUNCA tire um export novo para satisfazer a régua numa retomada.** O export novo já não contém o que foi
apagado e não serve de volta. Suba `--backup-idade-max-min` e continue apontando para o original.

A retomada **não** relê produção e **não** valida digital — isso é o conserto do R2, não esquecimento. Em
compensação, o arquivo de plano vira a única verdade: se ele for editado, o `--apply` escreve o que ele disser.

## Passo 7 · Conferências depois da corrida

Leitura, não escrita. `platform/rollups` tem de mostrar:

```
gmvTotal                                167277
receitaLeelaTotal                     17564.09
tenantsAtivos                                1
tenants.castelo-producoes.eventosAtivos      2
tenants.castelo-producoes.nome          "Leela"
chaves de tenants                            1   (só castelo-producoes)
```

⛔ **NÃO rode `recomputePlatformRollups`.** Ele faz `set()` integral e lê `eventosAtivos` de
`tenants/castelo-producoes`, que continua valendo **5** — a chamada desfaria o `2` que o PATCH acerta. Só faz
sentido depois que alguém corrigir aquele campo, e isso é outra lane.

O quinto número, `tenants/castelo-producoes/saldo/current.vendidoBruto`, **vai ficar errado** (167287 para um
banco com R$ 10 de venda sobrevivente) e não há caminho de operador para consertá-lo (A7). Registre para o
dono; não improvise escrita em repasse.

Conferências restantes: `platform/rollups.atualizadoEm` segue marcando 29/07 (A6); `/@castelo` continua sendo
a URL pública, por decisão registrada em `DECISOES-ABERTAS.md · PERFIL-1`; e o seed reverte o nome se alguém
rodar `tenants.seed.ts` depois (handoff T3).

## Plano de volta

1. **Firestore primeiro.** `POST …:importDocuments` com `inputUriPrefix` apontando o export do passo 1. Ele
   repõe por caminho e não apaga o que existir a mais — como a corrida só apaga e faz sete edições de corpo
   fixo, a reposição é completa.
2. **Auth depois.** `firebase auth:import <arquivo> --hash-algo=SCRYPT --project leela-hub` mais os parâmetros
   de hash do projeto.
3. ⚠️ **Restaurar um sem o outro é estado quebrado.** A titularidade do dono mora nos dois lados: `ownerUid` no
   Firestore e a claim `{"role":"tenant_owner","tenantId":"castelo-producoes"}` no Identity Platform. Um import
   de Firestore sozinho devolveria `ownerUid` para `uid-marina-castelo` e deixaria a claim onde está.
4. **Depois de qualquer restauração, o dono precisa sair e entrar de novo** — `resolverSessao` só força refresh
   do token quando nem `role` nem `tenantId` estão no cache.

---

## Territórios e provas

Arquivos desta lane: `.nirvana/handoffs/leela-rev3-fria-20260806.md` e
`functions/src/__tests__/limpezaProdRev3.test.ts` (12 casos, verdes).

Suítes, uma por vez, na árvore exata dos três commits:
`limpezaProd` **49** · `limpezaProdFalsificacao` **18** · `limpezaProdRunner` **15** · `limpezaProdRev3` **12**
= **94 verdes**. `tsc --noEmit` no projeto `functions`: limpo.

*Nenhuma escrita em produção nesta lane. Nenhum `--apply`. Nenhuma conta de Auth tocada. O build de
verificação e as ferramentas de medição ficaram fora do repo. `apps/`, `packages/`, `firestore.rules` e
`functions/src/` fora de `limpeza/` e `__tests__/` não foram tocados.*
