# Handoff · lane DEPLOY-EMAIL · trace `leela-build-2d6ee98d` · 2026-08-04

Executor: sf-backend-lead (software-forge). Brief: `.nirvana/briefs/leela-build-2d6ee98d-DEPLOY-EMAIL-enriched.md`.
Território: `functions/`. Base: `40ea9d8a`. Commit da lane: `abf4b794`.

**18 functions no ar, nominais, `05:53:59Z → 05:54:45Z`, exit 0.** A porta do organizador continua em 404,
provada depois do deploy com três controles positivos.

## O que subiu, nominal

Uma criada e dezessete atualizadas. O alvo não saiu de palpite: saiu do **fecho de imports** a partir dos
arquivos que mudaram desde o artefato que estava no ar (`c0f84c66`, md5 `6fc4c391…`), calculado sobre os
89 exports de `functions/src/index.ts`.

| # | Function | Antes → depois | Por que entrou no alvo |
|---|---|---|---|
| 1 | `solicitarRedefinicaoSenha` | **404 → v1 ACTIVE** | function NOVA · o VETO 1 da PIXREAL-REV |
| 2 | `asaasWebhook` | v6 → v7 | e-mail dos ingressos + conta sem fricção |
| 3 | `pagamentoWebhook` | v6 → v7 | idem, mais o aviso ao afiliado |
| 4 | `confirmarPagamentoSandbox` | v5 → v6 | idem |
| 5 | `createInscricaoCharge` | v7 → v8 | o fix do `gatewayReal` (`49a731ae`) |
| 6 | `cotarInscricaoCheckout` | v3 → v4 | compartilha o módulo do checkout |
| 7 | `salvarAfiliado` | v4 → v5 | link do convite + template |
| 8 | `cadastrarAssessoriaParceira` | v4 → v5 | link do convite + template |
| 9 | `provisionAfiliadoAccount` | v4 → v5 | fecho do módulo de convite |
| 10 | `provisionAssessoriaAccount` | v4 → v5 | idem |
| 11 | `encerrarParceriaAssessoria` | v4 → v5 | idem |
| 12 | `definirCondicaoDesconto` | v4 → v5 | idem |
| 13 | `registrarRepasseComissao` | v4 → v5 | aviso de repasse e de marco |
| 14 | `enviarCampanha` | v4 → v5 | template de campanha |
| 15 | `dispatchCampanhasAgendadas` | v4 → v5 | idem |
| 16 | `dispatchAutomacoes` | v3 → v4 | idem |
| 17 | `onInscritoWriteAutomacao` | v4 → v5 | idem |
| 18 | `varrerIngressosOrfaos` | v5 → v6 | e-mail dos ingressos |

```
npx firebase-tools@13 deploy --only functions:<os 18 nomes> \
  --project prod --config firebase.prod.json --force
```

### Prova de que o alvo foi mesmo alvo

**88 functions em produção. Exatamente 18 com `updateTime` ≥ 05:45Z.** As outras 70 seguem paradas, e a
mais recente entre elas é de `2026-07-29T13:53:41Z`.

Fora do alvo de propósito, além da porta do organizador: **`expirarPixPendente`**, que segue com
`updateTime 2026-07-29T01:09:39Z` e versão 4. É o cron que cancela PIX vencido, e as três cobranças vivas
do dono passam por ele. Não era necessário e não foi tocado.

## Prova por marcador · o artefato servido mudou, e mudou onde devia

`functions-deploy/index.js` é o arquivo que sobe. O md5 do que estava lá **bate byte a byte** com o que a
PIXREAL-FIX registrou como deployado às 03:42Z, então a medição "antes" é do artefato que estava no ar,
não de uma reconstrução.

| | md5 | bytes |
|---|---|---|
| antes | `6fc4c391ca9fa6b6a9a7acaea60aaee6` | 1.180.165 |
| depois | `4519d58aa1f99e833290498b62901c6f` | 1.205.507 |

| Marcador | Origem | Antes | Depois |
|---|---|---:|---:|
| `leela-wordmark-email` | a logo na moldura dos e-mails | **0** | **1** |
| `color-scheme` | dark-first declarado | **0** | **4** |
| `supported-color-schemes` | idem | 0 | 2 |
| `solicitarRedefinicaoSenha` | a function nova | 0 | 11 |
| `reescreverParaOPainel` | o link cai na nossa tela | 0 | 6 |
| `actionCodeSettingsSenha` | o `continueUrl` | 0 | 6 |
| `gatewaySimulado` | o fix do `gatewayReal` | 0 | 3 |
| `basePublica` | a base pública dos links | 18 | 26 |
| `NEXT_PUBLIC_LEELA_URL` | o bypass que morreu | **3** | **1** |
| `jurosParcelamento` (controle) | DEPLOY-FINAL | 7 | 7 |
| `digestIdempotencyKey` (controle) | PIXFIX T1 | 4 | 4 |
| `EXTERNAL_REF_MAX_LEN` (controle) | PIXFIX T2 | 4 | 4 |
| `sem_keyring` (controle) | emissão de ingresso | 2 | 2 |

Os quatro controles seguram a pergunta "este deploy desfez algum anterior?". Nenhum mexeu. E o
`NEXT_PUBLIC_LEELA_URL` caindo de 3 para 1 é o conserto: sobrou só o nome do alias **dentro** do
`basePublica.ts`, que é o único módulo autorizado a nomeá-lo.

A logo que os e-mails apontam está viva antes deles: `https://leela-landing.web.app/brand/leela-wordmark-email.png`
responde **200 · image/png · 3.036 bytes**, e um caminho de controle no mesmo diretório responde 404 — o
200 é do arquivo, não de um rewrite.

## Prova de segredo · a function nova nasceu com a chave

Lido da API do Cloud Functions v1, projeto `leela-hub`:

```
solicitarRedefinicaoSenha  ACTIVE  v1  2026-08-04T05:53:59Z
  secretEnvironmentVariables: BREVO_API_KEY → BREVO_API_KEY @1
```

**O VETO 1 da PIXREAL-REV está pago.** O e-mail de definir senha — o primeiro acesso do comprador depois
de pagar — deixou de sair pelo template do Firebase.

Os bindings das outras não regrediram: `asaasWebhook`, `pagamentoWebhook` e `confirmarPagamentoSandbox`
seguem com os quatro (`ASAAS_API_KEY`, `ASAAS_WEBHOOK_AUTH_TOKEN`, `BREVO_API_KEY`, `QR_TOKEN_KEYS`);
`createInscricaoCharge` com os três, incluindo `CRM_ID_PEPPER`; `varrerIngressosOrfaos` com
`QR_TOKEN_KEYS` e `BREVO_API_KEY`.

## A porta do organizador · 404 depois do deploy, com controle positivo

Medido **depois** de subir, por dois caminhos independentes e sem mutação (GET na API, OPTIONS no
endpoint — preflight não executa o corpo do handler).

| Function | API v1 | `OPTIONS` | Leitura |
|---|---|---|---|
| `resgatarConviteOrganizador` | **404** | **404** | existe no código, nunca deployada — é ela que o LGPD-1 retém |
| `gerarConviteOrganizador` | **404** | **404** | **não existe no código**, em lugar nenhum |
| `revogarConviteOrganizador` | **404** | **404** | **não existe no código**, em lugar nenhum |
| `solicitarRedefinicaoSenha` | ACTIVE v1 | **204** | controle positivo forte: criada **neste** deploy |
| `asaasWebhook` | ACTIVE v7 | **405** | controle positivo: distingue 404 de existente |
| `provisionTenant` | ACTIVE v3, `2026-07-28T23:57:09Z` | **204** | controle positivo: o filtro nominal não encostou em quem não era alvo |

O primeiro controle é o que fecha a dúvida de verdade: a sonda enxerga uma function que nasceu há
segundos, então o 404 das três não é sonda quebrada nem propagação atrasada.

**Nota que corrige a leitura da review.** A PIXREAL-REV listou as três como ausentes. Duas delas nunca
existiram — o painel chama a tela `/plataforma/convites`, mas o backend de gerar e revogar convite não
foi escrito. Produção tem 88 functions e o repositório exporta 89; a diferença é exatamente
`resgatarConviteOrganizador`. A ausência é deliberada, e o veto **LGPD-1** segue com o dono.

## Fumaça · a release nova rodou de verdade, não só respondeu preflight

Log de produção depois do deploy, sem um `Unhandled error` e sem um 500:

```
05:56:11  solicitarRedefinicaoSenha   started → 126 ms, status 204   ← cold start da function NOVA
05:56:13  provisionTenant             51 ms, 204                     ← intocada, segue de pé
05:56:14  asaasWebhook                52 ms, 405
05:56:14  createInscricaoCharge       90 ms, 204
05:56:14  salvarAfiliado              36 ms, 204
05:56:14  cadastrarAssessoriaParceira 30 ms, 204
05:59:01  dispatchCampanhasAgendadas  5958 ms, status 'ok'           ← execução AGENDADA, release nova
05:59:01  dispatchAutomacoes          6895 ms, status 'ok'           ← execução AGENDADA, release nova
```

As duas últimas são o que separa fumaça de preflight: são execuções **agendadas de verdade**, não sondas,
rodando o bundle novo com o corpo do handler inteiro. E o cold start da `solicitarRedefinicaoSenha`
fechando em 126 ms prova que o binding do segredo não quebra a carga — que é exatamente a classe de falha
que a `secretsBinding.contract` existe para pegar.

## Os três consertos de uma linha (`abf4b794`)

São a mesma classe de defeito: o link de um e-mail montado a partir de uma fonte que não é a canônica.

**1 · `checkout/contaSemFriccao.ts:107`** chamava `generatePasswordResetLink(email)` com **um** argumento.
O e-mail nº 2 ("conta criada, defina a senha") é a primeira tela do produto para quem acabou de pagar, e
o clique caía no handler hospedado do Firebase. Agora leva `actionCodeSettingsSenha()` e sai reescrito
para `/redefinir-senha` do painel, com o `oobCode` junto — a credencial é o código, não a URL que o
entregou. Ponto único de decisão: `functions/src/auth/linkDeAcao.ts`.

**2 · `affiliation/salvarAfiliado.ts:463`** e **3 · `assessorias/cadastrarAssessoria.ts:436`** liam
`process.env['NEXT_PUBLIC_LEELA_URL']` cru com fallback `http://localhost:3000`. Produção seta
`LEELA_PUBLIC_URL` e mais nada, então os dois caíam no fallback. **Era defeito vivo, não teórico:** as duas
functions estavam deployadas desde 03:43Z, e todo convite de afiliado e de assessoria emitido hoje saía
com link para a máquina de quem enviou. Agora leem `basePublica()`, que resolve as duas variáveis.

### O teste, e a falsificação executada

`functions/src/__tests__/linkDosEmails.contract.test.ts`, 6 casos, cobre comportamento **e** contrato:
nenhum módulo de produção pode nomear as variáveis da base pública fora de `basePublica.ts`.

O contrato existe porque `basePublica()` **já estava certo** quando os dois call sites nasceram. O que
falhou não foi a função — foi um caminho paralelo até o mesmo dado, e é só o contrato que impede o quarto.

Com os três consertos revertidos por `git stash`, **4 dos 6 casos caem**:

```
× passa `actionCodeSettings` ao Firebase   → expected undefined to deeply equal { …(2) }
× reescreve o link para /redefinir-senha   → expected 'https://leela-hub.firebaseapp.com/__/…'
                                              to be 'https://leela-hub.web.app/redefinir-s…'
× nenhum módulo lê NEXT_PUBLIC_LEELA_URL   → expected [ …(2) ] to deeply equal []
× os dois call sites importam basePublica  → affiliation/salvarAfiliado.ts: expected … to match …
```

Com os consertos: **6/6**.

**Lacuna declarada.** Os dois call sites de convite não têm cobertura de integração viva:
`afiliados.integration` e `assessoriaParceira.integration` pulam sem `FIRESTORE_EMULATOR_HOST` no
ambiente e, mesmo rodando, apagam `BREVO_API_KEY` — o bloco que monta o link só executa com provider de
e-mail. Quem guarda os dois é o teste de contrato.

## Gates · e o vermelho que não era regressão

| Gate | Resultado |
|---|---|
| `@leela/core build` (tsup) | exit 0 |
| `@leela/functions type-check` (`tsc --noEmit`) | exit 0 |
| `@leela/functions lint` (`--max-warnings 0`) | exit 0 |
| `@leela/functions test` (lote, porta padrão 8080) | 205 arquivos · 3778 testes · **2992 verdes, 689 skip, 97 vermelhos** |

**A armadilha documentada não foi a que apareceu.** Rodei na porta padrão, como o brief mandou, então
cérebro dividido entre 8080 e outra porta não aconteceu. A colisão foi outra e mais difícil de ver:
**outro `vitest` rodando ao mesmo tempo no mesmo emulador**. `Win32_Process` pegou os PIDs 25504 e 3288
executando `vitest run src/__tests__/inscritoPedidoRules.integration.test.ts` em paralelo com o meu run,
e o processo alheio terminou entre duas medições. A assinatura bate: 22 ocorrências de
`seedVerified: canários ausentes após 4 tentativas (seed engolido pelo emulator?)` e 12 de
`5 NOT_FOUND: no entity to update: app "dev~demo-leela"`.

**Não conclui nada por dedução.** Os 20 arquivos vermelhos foram re-rodados com o emulador só meu:

| Re-execução | Resultado |
|---|---|
| 19 arquivos, sozinhos | **19/19 arquivos · 391/391 testes verdes**, exit 0, 212s |
| `platformAdminSeed.test.ts` com `FIREBASE_AUTH_EMULATOR_HOST` | **6/6 verdes** |

A soma fecha exata: **94 + 3 = 97**. Todo vermelho do lote tem causa nomeada e nenhum é regressão. O caso
do `platformAdminSeed` é o que a IDENTIDADE-EMAIL já tinha registrado — a guarda proposital contra rodar
o bootstrap de `platform_admin` contra produção —, e dar a variável à suíte inteira reprovaria outros
três arquivos.

**Confirmação independente, do outro lado da colisão.** Enquanto eu media isto, a PIXREAL-REV commitou
`dc8b4065` descrevendo o mesmo mecanismo pela ponta dela: 29 arquivos e 136 testes vermelhos no run de
lote, o A/B feito no emulador já degradado dando 6 falhas numa rodada e 1 na seguinte **com o mesmo
código**, e todas as dez suítes verificadas passando com emulador limpo por arquivo. As duas lanes
chegaram à mesma conclusão sem conversar, medindo de fontes diferentes — e a diretiva que ela deixou
("não use `npx vitest run` sem filtro como gate desta suíte") é a mesma lição, escrita antes de eu
terminar de escrever esta. Vale como decisão de infra de teste a subir: hoje o comando documentado
engana em duas direções, pela porta e pela concorrência.

No blast radius, tudo verde já no lote: `linkDosEmails.contract` 6/6, `emailIdentidade` 167/167,
`emailTemplates` 10/10, `contaCriadaTemplate` 3/3, `redefinirSenhaProprio` 23/23, `basePublicaEmailLink`
19/19, `checkoutModelo.integration` 15/15 (o fix do `gatewayReal`), `webhookAsaas.integration` 15/15,
`secretsBinding.contract` 23/23.

## Limpeza · `functions/src/__probe__`

Cheguei e a pasta **já não existia** no disco — o `tsc` do pacote passa em 0, que é a prova de que ela
sumiu. Mas ela **não estava no `.gitignore`**, ao contrário do que um `git check-ignore` mal lido sugeria:
criei um arquivo dentro e o `git status` o mostrou como `??`. Entrou no `.gitignore` com o motivo escrito.
Nada de valor morava só lá — era cópia de `functions/src`, sem rastreio, e a PIXREAL-REV já tinha
terminado de usá-la.

## As três cobranças vivas do dono

`pay_6e37hktx4xld12qf` (R$ 11,05), `pay_an8qpaqddzgey43x` (R$ 63) e `pay_sn5jaysnfcid5m3h` (R$ 75)
**não foram tocadas**. Esta lane não escreveu um documento no Firestore de produção: nenhum seed, nenhum
script, nenhuma sentinela apagada, nenhuma expiração forçada. A única mutação foi o próprio deploy de
código, e `expirarPixPendente` — a única function que poderia cancelá-las — ficou fora do alvo e segue com
release de 29/07.

Vale o alerta que a PIXREAL-FIX já tinha escrito: as sentinelas de cobrança duplicada continuam no lugar,
então **uma nova tentativa de compra do mesmo carrinho cancela a cobrança anterior no gateway**. Se o dono
for pagar uma delas, que pague a que já está aberta, sem recomeçar a compra.

## O que ficou pendente

1. **Conferência visual dos oito e-mails** (item 69 do painel) — os renderizados estão em
   `.nirvana/outputs/leela-build-2d6ee98d/emails/`, com `index.html` percorrendo os oito. O caso que
   merece o olho é o cabeçalho **com a imagem bloqueada**, que é o normal no Gmail.
2. **SENHA-1 virou ratificação** — o item do painel foi reescrito. Quando ele nasceu, "trazer para a
   Brevo" custava um template novo e um caminho de envio próprio; as duas coisas foram construídas e
   agora estão no ar. O caminho antigo continua como rede: se a callable ficar indisponível,
   `enviarResetSenha` cai no envio do Firebase.
3. **`ROTA_APOS_DEFINIR_SENHA` continua em `/entrar`**, esperando a SPEC-ADMINSEP. É uma linha em
   `functions/src/auth/linkDeAcao.ts` e nenhuma outra. A jornada não foi inventada aqui.
4. **A tela de definir senha na landing (S1223-T1) segue aberta.** O link hoje aterrissa no painel; para o
   comprador, a spec quer a landing, porque o painel o expulsaria pelo overlay de conta órfã. Quando a
   tela existir, muda `ROTA_REDEFINIR_SENHA`.
5. **`push` não executado.** A lane commitou local (`abf4b794` + o commit de boards); publicar é do
   maestro.
6. **Cobertura de integração dos dois links de convite** — descrita acima como lacuna declarada.

## Boards

Atualizados nesta aterrissagem, nas três altitudes: `BOARD-EPICOS` (E12), `V1-KANBAN` (card em Feito +
história **S1224** com seis tarefas) e `V1-CHECKLIST` (as seis tarefas com critério e prova). No painel,
**SENHA-1** foi reescrito, **LGPD-1** ganhou a medição pós-deploy das três functions em 404, e o **item
69** ganhou os oito e-mails.

Reconciliação feita na mesma aterrissagem: a `LEELA-S1223-T2` e a RN-453 diziam que `actionCodeSettings`
"não existe em lugar nenhum do código". Deixou de ser verdade — existe e está em produção.
