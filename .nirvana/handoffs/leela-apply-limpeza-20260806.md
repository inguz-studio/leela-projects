# APPLY-LIMPEZA — o expurgo autorizado, executado pelo runbook da REV3

**Lane:** `APPLY-LIMPEZA` · **Trace:** `leela-limpeza-prod-20260806` · **Employee:** `sf-platform-lead`
**Data:** 2026-08-06 · **Repo:** `C:\dev\LEELA` (branch `main`) · **Projeto:** `leela-hub` (produção)

Esta é a lane que ESCREVEU em produção. Autorização: dono, "Roda agora", 06/08 ~18h (BRT), com os números
novos na pergunta. Lei da corrida: o runbook da REV3 (`leela-rev3-fria-20260806.md`), passo a passo.

Todos os horários abaixo são **UTC**. O relógio local do operador é BRT (UTC−3), então `21:22Z` = `18:22`
na hora que o dono autorizou.

---

## Linha do tempo

| Hora (UTC) | Passo | O que aconteceu |
|---|---|---|
| 21:21:36 | 0 | Leitura do banco: `earliestVersionTime` 20:21:36Z, retenção 3600s, **PITR DESLIGADO** |
| 21:21:51 | 1 | Export **com** `snapshotTime` → **400 INVALID_ARGUMENT** (ver Desvio 2). Nada foi criado |
| 21:22:13 | 1 | `AGORA` guardado = `2026-08-06T21:22:13Z`; export disparado **sem** `snapshotTime` |
| 21:22:21 | 1 | Export **SUCCESSFUL** em 8,4 s · 3.172 documentos · 1.845.979 bytes · 21 objetos |
| 21:22:49 | 2 | Dry-run disparado |
| 21:22:58 | 2 | Plano congelado (9 s de corrida) |
| 21:23:00 | 3 | Os 19 conflitos lidos na tela e colados aqui **antes** da flag |
| 21:23:51 | 4 | `--apply` invocado (PID 29736) |
| 21:24:0x | 5 | `[backup] régua OK` · `digital confere` · `[4/4] APLICANDO…` |
| 21:26:35 | — | `saldo/current` recomputado por gatilho no meio da corrida (ver lacuna) |
| 21:30:33 | 5 | **2873 operações aplicadas · 0 já estavam no checkpoint** — 6 min 42 s |
| 21:31–21:35 | 7 | Conferências de leitura + segundo dry-run (0 exclusões pendentes) |

---

## Passo 1 · Export fresco

```
--backup-minimo : 2026-08-06T21:22:13Z      (instante guardado ANTES do disparo)
prefixo         : leela-limpeza-prod-20260806-2122-pre-apply
URI             : gs://leela-hub.firebasestorage.app/firestore-backups/leela-limpeza-prod-20260806-2122-pre-apply
operação        : projects/leela-hub/databases/(default)/operations/ASAzZjRkY2MwYzQ3YTctNDY1OC0wOWU0LWI3MWItN2M0MTAyMzUkGnNlbmlsZXBpcAkKMxI
estado          : SUCCESSFUL (startTime 21:22:13.568Z · endTime 21:22:21.975Z)
documentos      : 3.172 (completedWork)
objetos no bucket: 21  ·  .overall_export_metadata presente
tirado (updated) : 2026-08-06T21:22:21.958Z
snapshotTime     : AUSENTE — recusado pela API (Desvio 2)
```

A régua do R4 foi executada pelo próprio runner na corrida e passou:
`[backup] régua OK: posterior a 2026-08-06T21:22:13Z e com menos de 180 min de idade.`

## Passo 2 · Dry-run refeito na hora — bateu dígito a dígito

```
2866 exclusões, 7 edições · digital 2bcfdc6e0e3710ea
310 documentos sobrevivem (de 3176)          [3172 reais + 4 fantasmas]
ÓRFÃOS QUE O PLANO PREVINE : 3   (os três financeiros vetados pelo maestro)
intocáveis                 : 1   profissionais/QbqlSxanxlcFeHCy4g47Vp7jlgz1/dashboard/current
conflitos                  : 19
TOTAL de operações no arquivo congelado: 2873
digital completa: 2bcfdc6e0e3710eaf2174553c81f3b80a4b7710e2a3daf2f12c141671ea4cb27
```

Os três órfãos denunciados, verbatim:

```
tenants/castelo-producoes/parceirosAssessoria/51888000000199 :: condicaoDesconto.eventoId -> meia-floripa-2026
tenants/castelo-producoes/repasses/repasse-demo-0001 :: eventoId -> meia-floripa-2026
tenants/castelo-producoes/repasses/repasse-demo-0002 :: eventoId -> desafio-mtb-costa-lagoa-2026
```

**Prova mais forte que a digital.** O sha256 do arquivo congelado inteiro saiu

```
286367503312bd5331e14eff18695e06586494bd156c6338c1fa84a97a3d621c   618.193 bytes
```

byte a byte igual aos quatro da REV3 e aos três da FIX3. São **oito arquivos, três builds independentes,
cerca de seis horas de distância**. Produção não mudou entre a review e o botão.

## Passo 3 · Os 19 conflitos, lidos ANTES de `--aceitar-conflitos-de-protecao`

Todos do uid `wNXRTvMM3vc7Boyi91vRgx3DBQy2` — a sessão que fez a compra real. **Nenhum deles é a compra real.**

```
 1  carrinhos/wNXRTvMM3vc7…__desafio-mtb-costa-lagoa-2026                    :: (chave composta)
 2  carrinhos/wNXRTvMM3vc7…__meia-floripa-2026                               :: (chave composta)
 3  carrinhos/wNXRTvMM3vc7…__meia-floripa-2026/ciclos/1                      :: (chave composta)
 4  carrinhos/wNXRTvMM3vc7…__meia-floripa-2026/ciclos/3                      :: (chave composta)
 5  cobrancasPixAtivas/wNXRTvMM3vc7…__desafio-mtb-costa-lagoa-2026__a5bf201a57eaf43bc18c18b5efb4dd59
 6  cobrancasPixAtivas/wNXRTvMM3vc7…__desafio-mtb-costa-lagoa-2026__fccadfc405155dab65cf3c71b91129c6
 7  cobrancasPixAtivas/wNXRTvMM3vc7…__meia-floripa-2026__f26c32f392d1b5c9d40bd9389523dc13
 8  eventos/meia-floripa-2026/inscritos/ped-wNXRTvMM3vc7…-chk-60f7487f-…-i1  :: (chave composta)
 9  eventos/meia-floripa-2026/inscritos/ped-wNXRTvMM3vc7…-chk-60f7487f-…-i1  :: atletaId
10  pagamentos/pag-wNXRTvMM3vc7…-chk-1c675f35-3d12-4be4-adff-82bdd08a10fb    :: (chave composta)
11  pagamentos/pag-wNXRTvMM3vc7…-chk-60f7487f-755f-4c84-aa21-ee120011b2a9    :: (chave composta)
12  pagamentos/pag-wNXRTvMM3vc7…-chk-60f7487f-…/webhookEventos/evt_071da53af2a9613df04213d0157d6b88&1450653376
13  pagamentos/pag-wNXRTvMM3vc7…-chk-963e27d7-2ea7-453d-aeb3-b49faacf319f    :: (chave composta)
14  pedidos/ped-wNXRTvMM3vc7…-chk-1c675f35-3d12-4be4-adff-82bdd08a10fb       :: (chave composta)
15  pedidos/ped-wNXRTvMM3vc7…-chk-1c675f35-3d12-4be4-adff-82bdd08a10fb       :: responsavel.atletaId
16  pedidos/ped-wNXRTvMM3vc7…-chk-60f7487f-755f-4c84-aa21-ee120011b2a9       :: (chave composta)
17  pedidos/ped-wNXRTvMM3vc7…-chk-60f7487f-755f-4c84-aa21-ee120011b2a9       :: responsavel.atletaId
18  pedidos/ped-wNXRTvMM3vc7…-chk-963e27d7-2ea7-453d-aeb3-b49faacf319f       :: (chave composta)
19  pedidos/ped-wNXRTvMM3vc7…-chk-963e27d7-2ea7-453d-aeb3-b49faacf319f       :: responsavel.atletaId
```

O nº 12 é o 46º órfão que a REV3 achou e que as duas rodadas anteriores não tinham visto. Confere com a
tabela do runbook classe a classe: 3 pedidos + 3 pagamentos + 1 webhookEvento + 3 cobranças Pix + 2 carrinhos
+ 2 ciclos + 1 inscrição + 3 pedidos por `responsavel.atletaId` + 1 inscrição por `atletaId` = **19**.

## Passo 4 · A invocação

```bash
node build/scripts/limpeza-prod-leela-hub.js \
  --apply \
  --plano=C:/dev/leela-apply-20260806/plano-apply.json \
  --checkpoint=C:/dev/leela-apply-20260806/plano-apply.checkpoint \
  --backup=gs://leela-hub.firebasestorage.app/firestore-backups/leela-limpeza-prod-20260806-2122-pre-apply \
  --backup-minimo=2026-08-06T21:22:13Z \
  --aceitar-conflitos-de-protecao
```

Checkpoint **não existia** no disparo (conferido: `No such file or directory`). Drenagens nos defaults
medidos — `--drenagem-ms=20000` e `--drenagem-fantasmas-ms=90000` não foram passadas e não foram baixadas.
`--backup-idade-max-min` ficou no default 180.

---

## Passo 5 · O que a tela mostrou

```
[backup] 21 objetos · export concluído em 2026-08-06T21:22:21.958Z
[backup] régua OK: posterior a 2026-08-06T21:22:13Z e com menos de 180 min de idade.
[1/4] 3172 documentos reais · 4 fantasmas
[2/4] 2866 exclusões, 7 edições · digital 2bcfdc6e0e3710ea
[3/4] digital confere — e o que vai rodar é o ARQUIVO, não este plano recomputado.
[4/4] APLICANDO…
2873 operações aplicadas · 0 já estavam no checkpoint.
```

**As dez drenagens, na ordem, como o runbook exige:**

```
10→20   20s      60→70    20s
20→30   20s      70→80    20s
30→40   20s      80→90    20s
40→50   20s      90→100   20s
50→60   20s     100→110   90s   ← a décima, antes do grupo FANTASMAS
```

Nove de 20 s e uma de 90 s. A de 90 s apareceu: a varredura de fantasma **não** correu cedo demais.

**Duração: 6 min 42 s** (21:23:51Z → 21:30:33Z), abaixo da janela estimada de 9–12 min. O checkpoint fechou
em **2.873 linhas**, uma por operação. Zero quedas, zero retomadas, zero repetições.

## Passo 7 · Conferências contra o banco (leitura, nunca escrita)

`platform/rollups` — os seis números do runbook, todos batendo, e os **tipos** preservados:

```
OK  gmvTotal                                   167277      integerValue
OK  receitaLeelaTotal                          17564.09    doubleValue
OK  tenantsAtivos                              1           integerValue
OK  tenants.castelo-producoes.eventosAtivos    2
OK  tenants.castelo-producoes.nome             "Leela"
OK  chaves de tenants                          1           (só castelo-producoes)
    atualizadoEm                               2026-07-29T15:45:44Z   ← segue 29/07 (A6), fora da máscara
```

⛔ `recomputePlatformRollups` **NÃO foi chamado**, e não deve ser: ele desfaria o `eventosAtivos: 2`.

**Estado final do banco, medido por um segundo dry-run** (gravado em `plano-pos.json`, arquivo novo — o
congelado não foi tocado, sha256 idêntico depois da corrida):

```
306 documentos reais · 2 fantasmas   (eram 3.172 e 4)
0 exclusões pendentes                ← o expurgo está COMPLETO
0 conflitos
1 intocável, o mesmo de sempre
```

Os 306 reais batem na bala com os "306 reais" que a REV3 previu. Os fantasmas caíram de 4 para 2 exatamente
como ela previu: `uid-felipe-martins` perdeu o último filho e parou de aparecer até com `showMissing`.

A única operação que o segundo dry-run ainda propõe é **o mesmo PATCH de `platform/rollups`, de corpo
idêntico ao que já foi aplicado** — o planejador é sem estado e reprõe a escrita fixa sem ler o banco. Não é
trabalho pendente: os seis valores já estão lá (bloco acima). Não foi executada.

Sobreviveu o que tinha de sobreviver, conferido documento a documento:

```
VIVO  pedidos/ped-wNXRTvMM3vc7…-chk-ed77a161-87e8-41c7-8e09-010f72ccd1dc   pago · R$ 10 · teste-taxa-repassada
VIVO  pagamentos/pag-wNXRTvMM3vc7…-chk-ed77a161-…                          confirmado
VIVO  eventos/teste-taxa-repassada/ingressoCodigos/T93N7F
VIVO  pedidos/ped-wNXRTvMM3vc7…-chk-68fcbd20-…   falhou · corrida-inverno-floripa-2026
VIVO  profissionais/QbqlSxanxlcFeHCy4g47Vp7jlgz1/dashboard/current          (o intocável)
VIVO  eventos/teste-taxa-repassada · eventos/corrida-inverno-floripa-2026 · tenants/castelo-producoes
```

E morreu o que tinha de morrer — os 7 eventos condenados e os 5 tenants condenados, um a um, todos `MORTO`.

---

## A LACUNA DO `saldo/current` — e a correção que ela impõe na A7

A REV3 declarou (A7) que `tenants/castelo-producoes/saldo/current` ficaria **congelado e errado** em
`vendidoBruto 167287`, porque os três caminhos que recomputam saldo (`onRepasseWrite`, `encerrarEventos`,
`transicoesRepasse`) não seriam acionados por esta corrida.

**Não foi o que aconteceu, e a A7 estava incompleta.** Existe um quarto caminho:

```
functions/src/finance/updateSaldoRepasse.ts → onFinanceiroEventoWrite
  gatilho: eventos/{eventoId}/financeiro/current  ·  onWrite (e onWrite pega DELETE)
```

O plano apaga **6** documentos `eventos/{id}/financeiro/{id}`. Cada exclusão disparou o gatilho, que
recomputou o saldo do tenant dono. Marca do relógio no documento: `atualizadoEm 2026-08-06T21:26:35.696Z`,
**dentro** da janela da corrida (21:23:51 → 21:30:33).

Estado agora, e ele é aritmeticamente consistente com o que sobrou:

```
vendidoBruto   23490      = 10 (teste-taxa-repassada) + 23480 (corrida-inverno-floripa-2026)
                             — a soma exata da receitaBruta dos dois eventos vivos ✔
comprometido   16700      = 8200 + 5400 + 3100, os três repasses sobreviventes ✔
disponivel      1170.91
retido          3153.69
```

**O que continua errado, e é a lacuna real para o dono:** `comprometido = 16700` são os **três repasses
vetados** — `repasse-demo-0001` aponta para `meia-floripa-2026` e `repasse-demo-0002` para
`desafio-mtb-costa-lagoa-2026`, dois eventos que esta corrida apagou. É dinheiro comprometido contra evento
que não existe mais. São os mesmos três órfãos que o plano denuncia e não toca, **por veto do maestro**,
porque mexer neles é mexer em dinheiro.

⛔ **Não foi remendado.** Nenhuma escrita em `repasses` nem em `saldo`. A decisão de consertar os três é do
dono, e é outra lane.

Correção de rumo boa: o número não ficou em 167287. Ficou consistente com o banco, e a sujeira restante é
só a que o veto deixou de propósito.

---

## Desvios (três, todos registrados, nenhum de substância)

**Desvio 1 · `gcloud` não existe nesta máquina.** O runbook pede
`gcloud auth print-access-token` só como mecanismo de obter o Bearer. Peguei o token pelo **mesmo caminho que
o próprio runner usa** — o configstore do `firebase-tools` (`~/.config/configstore/firebase-tools.json`, com
refresh via oauth2), em `gtok.mjs`, fora do repo. Mesma credencial, mesmo projeto, mesma API. Mecanismo, não
substância.

**Desvio 2 · `snapshotTime` foi RECUSADO pela API — e o runbook já mandava o que fazer.** O disparo com o
campo devolveu:

```
HTTP 400 INVALID_ARGUMENT
"Point-in-Time Recovery must be enabled in order to execute exports at a snapshot timestamp."
```

PITR está `POINT_IN_TIME_RECOVERY_DISABLED` (medido no mesmo minuto). O runbook diz, textual: *"Se a API
recusar o campo, refaça sem `snapshotTime` e registre que a rede secundária não existe — a primária basta,
mas o item R5 fica aberto de novo."* Foi exatamente isso. Nenhum export foi criado na tentativa recusada.

⚠️ **Consequência que sobe para o painel: o A3 da REV3 continua aberto.** `exportDocuments` com
`snapshotTime` segue **nunca tendo sido exercitado** neste projeto, e a razão agora está medida e tem nome:
não é limitação do operador, é **PITR desligado**. Ligar PITR é decisão do dono (custo + retenção) e é
pré-requisito para essa rede secundária existir. A rede **primária** — export comum + `importDocuments` —
está de pé e é a que valia: a corrida só apaga e faz sete edições de corpo fixo.

**Desvio 3 · o shell que disparou o `--apply` morreu, a corrida não.** Encadeei um `sleep` logo depois do
disparo para ler as primeiras linhas; este harness **bloqueia `sleep` em primeiro plano**, e o wrapper caiu
com exit 1. O processo `nohup` sobreviveu inteiro (PID 29736) e a corrida seguiu sem uma falha. Confirmado
antes de qualquer outra ação: log crescendo, checkpoint crescendo, `digital confere` já impresso. **Nada foi
relançado** — relançar teria sido o erro caro aqui. Zero consequência para o banco: o `0 já estavam no
checkpoint` no fim prova que nenhuma operação foi repetida.

---

## O que NÃO foi feito, de propósito

⛔ `recomputePlatformRollups` não foi chamado (A6 — desfaria o `eventosAtivos: 2`).
⛔ Nenhuma escrita em `repasses` ou `saldo` (A7 — dinheiro, vetado).
⛔ Nenhuma conta de Auth tocada. ⛔ Nenhum deploy. ⛔ `tenants/castelo-producoes.eventosAtivos` segue **5** —
é o campo que ninguém mantém, e consertá-lo é a outra lane que a A6 descreve.
⛔ Nada tocado fora do território desta lane: `packages/design-system` (lane vizinha), TRIAGEM e o handoff
staged ficaram como estavam.

## Rede de volta, se algum dia precisar

```
export : gs://leela-hub.firebasestorage.app/firestore-backups/leela-limpeza-prod-20260806-2122-pre-apply
Auth   : C:\dev\leela-backups\leela-limpeza-prod-20260806\auth-users-20260806.json
```

Firestore primeiro (`importDocuments`), Auth depois (`firebase auth:import --hash-algo=SCRYPT`), e **os dois
juntos** — restaurar um sem o outro devolve `ownerUid` para `uid-marina-castelo` com a claim do dono no lugar,
que é o incidente da manhã de novo. Depois de restaurar, o dono precisa sair e entrar para o token refrescar.

Artefatos da corrida, fora do repo, em `C:\dev\leela-apply-20260806\`: `plano-apply.json` (o congelado,
sha256 `286367503312bd53…`), `plano-apply.checkpoint` (2.873 linhas), `apply.log`, `dryrun-apply.txt`,
`dryrun-pos.txt`, `passo1.json`.

