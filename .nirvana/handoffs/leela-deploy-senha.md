# DEPLOY-SENHA — o conserto do "esqueci minha senha" em produção

- Trace: `leela-pixreal-diag-20260804` · Lane: DEPLOY-SENHA
- Employee: sf-platform-lead (software-forge)
- Projeto: `leela-hub` (alias `prod`), config `firebase.prod.json`
- HEAD no deploy: `5aa55777` · commits sob deploy: `cb5922a7` + `883c70f3`
- Data: 2026-08-06T04:06Z

## Veredito

**Subiu, uma função, e o erro de 05/08 não voltou.** A condição imposta pela
review passou sem remendo: o artefato fixa `firebase-admin` em **13.10.0**, a
mesma versão em que o detector da frase rodou verde.

Uma coisa não foi provada e não vou fingir que foi: **o ramo consertado não foi
exercitado em produção**. A prova positiva exigiria escrita no Firestore, que
esta lane tem proibida. Detalhe na seção 6.

## 1. Pré-flight

| Checagem | Resultado |
|---|---|
| `git pull` | `Already up to date` |
| `pnpm-workspace.yaml` sujo | não, limpo o tempo todo |
| Árvore de `functions/` suja | não |
| `npm --prefix functions run build` (tsc) | verde, exit 0 |
| `npx tsc --noEmit` (functions) | verde, exit 0 |
| `packages/core` buildado | dist de 05/08 17:38, mais nova que a última mudança em `src` (05/08 14:36); nada do core entra no fecho desta rodada |
| `functions/scripts/prontidao-de-deploy.mjs` | **PRONTO**, 1 atenção (C7) |

A atenção do C7 é `packages/design-system` e `packages/api-client` com artefato
mais velho que a fonte. Nenhum dos dois entra no bundle das functions, provado
por leitura do artefato: `@leela/design-system` e `@leela/api-client` não
aparecem em `functions-deploy/index.js`. `@leela/api-client` só é importado
dentro de `functions/src/__tests__/`.

Rules do Firestore e do Storage já estavam idênticas ao arquivo (C3 e C4), então
nada de rules subiu nesta lane.

## 2. A condição obrigatória — `firebase-admin` 13.10.0

Rodei `node functions/scripts/bundle-deploy.mjs` antes do deploy e conferi. Fui
além do que a condição pedia, porque a versão no lock é declaração e o que
importa é o byte que sobe.

| Prova | Resultado |
|---|---|
| `functions-deploy/package-lock.json` | `firebase-admin => 13.10.0` |
| `functions-deploy/node_modules/firebase-admin/package.json` | `13.10.0` |
| A frase exata (`MSG_SEM_OOB_LINK` lida de `linkDeAcao.ts`) existe no SDK **do artefato** (`lib/auth/auth-api-request.js`) | **sim** |
| A mesma frase existe no SDK do pnpm, onde o detector rodou (`firebase-admin@13.10.0`) | **sim** |
| `functions-deploy/index.js` contém a frase e `classificarFalhaDeLink` | **sim**, 1 321 388 bytes |
| Lock reconferido **depois** do predeploy do deploy real (que roda `npm install` de novo) | `13.10.0`, sem re-resolução |

Não precisei rodar `redefinirSenhaProprio` de novo: a condição do "se fixar outra
versão" não disparou. O topo do registro para `^13.4.0` é hoje o próprio 13.10.0,
o que explica a estabilidade — e é exatamente o que o defeito D2 da review diz
que não está garantido para sempre.

## 3. Fecho de dependências e a lista deployada

Grafo de imports de `functions/src` (sem `__tests__`) calculado por script: 96
functions exportadas em `index.ts`, 147 módulos. Sete functions alcançam algum
arquivo tocado pelo commit. **Uma foi deployada.**

| Function | Alcança | Mudou o comportamento? | Ação |
|---|---|---|---|
| `solicitarRedefinicaoSenha` | `solicitarRedefinicaoSenha.ts`, `linkDeAcao.ts`, `incidenteEmail.ts` | **sim** | **deploy** |
| `asaasWebhook` | `linkDeAcao.ts`, `incidenteEmail.ts` | não | fora |
| `confirmarPagamentoSandbox` | idem | não | fora |
| `pagamentoWebhook` | idem | não | fora |
| `reenviarEmailsDoPedido` | idem | não | fora |
| `solicitarCodigoDeAcesso` | `solicitarCodigoDeAcesso.ts`, `incidenteEmail.ts` | não | fora |
| `varrerIngressosOrfaos` | `incidenteEmail.ts` | não | fora |

A razão de cada exclusão, medida e não deduzida:

- **`linkDeAcao.ts` mudou por adição pura.** O diff é `@@ -210,3 +210,74 @@`,
  74 linhas acrescentadas no fim, zero removidas. O que entrou foi
  `MSG_SEM_OOB_LINK` e `classificarFalhaDeLink`, e uma varredura em
  `functions/src` mostra que **só `solicitarRedefinicaoSenha.ts` os referencia**
  (as outras ocorrências são comentário). `contaSemFriccao.ts`, a porta das
  quatro functions de checkout para esse módulo, importa apenas
  `actionCodeSettingsSenha` e `reescreverParaTelaDeSenha`, ambos intocados.
- **`incidenteEmail.ts` mudou só no tipo.** O diff acrescenta o membro
  `'redefinir_senha'` à união `TipoEmailTransacional`. TypeScript apaga isso no
  emit, e o JS compilado confirma: `grep -c redefinir_senha` em
  `functions/lib/functions/src/email/incidenteEmail.js` devolve **0**.
- **`solicitarCodigoDeAcesso.ts` mudou só em comentário.** Todas as linhas do
  diff começam com `//`.

Redeployar as quatro de checkout custaria janela de atualização em
`asaasWebhook` e `pagamentoWebhook`, que são webhooks de pagamento vivos, em
troca de zero diferença de comportamento. Não fiz.

**Baselines lidas do servidor, não do brief.** As sete estavam na mesma geração
de bundle, `2026-08-05T20:49Z`, e o único commit que toca `functions/src` desde
então é o par sob deploy (`883c70f3` só acrescenta teste e um
`firebase.revsenha.json`, nada que entre no bundle).

## 4. O deploy

```
npx firebase-tools@13 deploy --only functions:solicitarRedefinicaoSenha \
  --project prod --config firebase.prod.json --non-interactive
```

```
+  functions: Finished running predeploy script.
i  functions: packaged C:\dev\LEELA\functions-deploy (339.86 KB) for uploading
i  functions: updating Node.js 20 (1st Gen) function solicitarRedefinicaoSenha(us-central1)...
+  functions[solicitarRedefinicaoSenha(us-central1)]  Successful update operation.
+  Deploy complete!
```

Estado lido do servidor depois, pela Cloud Functions v1 API:

| Function | Antes | Depois |
|---|---|---|
| `solicitarRedefinicaoSenha` | ACTIVE v3, `2026-08-05T20:49:09.355Z` | **ACTIVE v4, `2026-08-06T04:06:29.939Z`** |
| as outras 6 candidatas | ACTIVE, `2026-08-05T20:49Z` | inalteradas, mesma versão e mesmo `updateTime` |

96 functions no projeto, **zero não-ACTIVE**. O `firebase-functions-hash` da
função mudou de `033cff94…` para `b2d6e23d…`, que é a prova de que o servidor
recebeu fonte diferente.

Avisos não bloqueantes, nenhum desta rodada: Node.js 20 depreciado em
2026-04-30 e decomissionado em **2026-10-31**; `firebase-functions`
desatualizado; limpeza de imagens de build falhou de novo.

## 5. Verificação pós-deploy

Três chamadas à callable **sem sessão**, com endereço malformado. Esse ramo
retorna antes do rate limit e antes de qualquer chamada ao Auth, então **não
escreve nada**.

| Probe | HTTP | Tempo | Corpo |
|---|---|---|---|
| P1 · `{"email":"probe-deploy-senha-sem-arroba"}` | 200 | 2239 ms | `{"result":{"ok":true}}` |
| P2 · payload vazio | 200 | 1523 ms | `{"result":{"ok":true}}` |
| P3 · payload não-objeto | 200 | 1386 ms | `{"result":{"ok":true}}` |

O que isso prova: a função **existe e responde**; é pública por construção (a
política IAM tem `roles/cloudfunctions.invoker` para `allUsers`, e o log registra
`verifications: {app: MISSING, auth: MISSING}` seguido de
`Callable request verification passed`); **falha fechada**, respondendo neutro em
vez de distinguir; e o piso de 1200 ms está vivo nos três casos.

Log da função nos minutos seguintes:

```
2026-08-06T04:08:20.308193Z I  {"message":"reset_senha","desfecho":"email_invalido"}
2026-08-06T04:08:21.891735Z I  {"message":"reset_senha","desfecho":"email_invalido"}
2026-08-06T04:08:23.278573Z I  {"message":"reset_senha","desfecho":"email_invalido"}
```

Severidade `I`, status 200. Compare com o que a mesma função gravou em 05/08:

```
2026-08-05T11:43:11.901270Z E  {"message":"Error: reset_senha_falhou ...",
                                "err":"INTERNAL ASSERT FAILED: Unable to create the email action link"}
2026-08-05T11:43:11.901681Z I  {"desfecho":"falha_envio","message":"reset_senha"}
```

Varredura de log em **todas** as functions desde `2026-08-06T04:00Z`:

| Consulta | Resultado |
|---|---|
| `severity>=ERROR` em qualquer function | **0** |
| `"Unable to create the email action link"` | **0** |
| `jsonPayload.message="reset_senha"` | 3, todos `email_invalido`, todos INFO |
| incidentes (campo `alerta`) | **0** |

Zero de consulta quebrada é indistinguível de zero de verdade, então rodei a
mesma varredura numa janela que contém o incidente conhecido. Ela devolveu
`severity>=ERROR: 1` e `"Unable to create...": 1`, ambos o evento de
2026-08-05T11:43:11Z. **A consulta enxerga o defeito quando ele existe.**

## 6. O que esta lane NÃO provou

**O ramo consertado não rodou em produção.** Todos os caminhos que chegam a
`classificarFalhaDeLink` passam antes por `consumirRateLimit`, que grava
`rateLimits/reset-senha:<sha256 do e-mail>` no Firestore. O brief autoriza um
probe com TLD reservado (`.invalid`) descrevendo-o como "leitura sem efeito" —
isso vale para o probe da review, que chamou o Admin SDK **direto**. Pela
**callable**, o mesmo endereço grava. Como "escrever em Firestore" está na lista
de proibições da lane, não rodei, e não reinterpretei o veto por conta própria.

**A decisão é de uma linha e o custo é conhecido**, caso o maestro queira a prova
positiva: um documento `rateLimits/reset-senha:<hash>` com `marcos`,
`atualizadoEm` e `expiraEm`, consumindo 1 de 5 vagas de uma janela de 1 hora,
para um endereço que não existe e não é de ninguém. Sem PII, sem e-mail enviado,
sem conta tocada. O esperado é `desfecho: conta_inexistente` em severidade INFO.

O que substitui a prova, e não a iguala: a review já mediu, com o SDK real contra
produção, que endereço sem conta devolve o assert e que `classificarFalhaDeLink`
o classifica como `sem_conta` (V1 e V2 do REV-SENHA); e esta lane provou que o
bundle que subiu contém a frase e o classificador, que aquele diretório foi o
empacotado, e que a função executa o código novo.

Fora isso, seguem valendo os limites que a review já declarou: o emulador não
implementa a proteção de enumeração, conta desabilitada sob a proteção continua
não medida, e o piso de 1200 ms versus a latência real da Brevo não foi medido.

## 7. Desvios

1. **D-1 · A premissa do probe do brief está errada para a callable.** O brief
   chama o probe `.invalid` de "leitura sem efeito". É verdade pelo Admin SDK,
   falso pela callable, que grava o balde de rate limit. Seção 6.
2. **D-2 · Outra lane escreveu na árvore durante a janela do deploy.** No
   pré-flight só havia `leela-specs/**` modificado; ao fim apareceram 10
   arquivos modificados e 5 novos em `apps/painel/**` e
   `packages/design-system/**`. Nada em `functions/`, e o bundle não contém
   `@leela/design-system`, `@leela/api-client`, `apps/painel`, `InscritoSlideIn`,
   `RootShell` nem `leela-scroll-plugin`. O que subiu corresponde a `5aa55777`.
   HEAD não se moveu.
3. **D-3 · Quota de leitura do Cloud Logging estourou** (HTTP 429) nas duas
   últimas consultas da varredura de controle, a que roda sobre a janela do
   incidente. Não afeta nenhum resultado desta lane: as consultas da janela
   pós-deploy rodaram completas antes.

## 8. Nada foi violado

Não alterei código nem spec. Não desliguei `enableImprovedEmailPrivacy`. Não
disparei e-mail para ninguém. Não escrevi em Firestore, Auth ou Storage. Não
rotacionei secret. Não deployei function fora da lista justificada — deployei
uma, e menos do que o brief esperava, com a razão medida de cada exclusão.

## 9. Para o maestro

1. **Autorizar (ou dispensar) o probe positivo** da seção 6. É o único item que
   fecharia a prova em produção.
2. **D2 da review continua aberto.** `firebase-admin` segue em `^13.4.0`. Hoje
   resolve para 13.10.0 porque é o topo do registro; no dia em que sair 13.11.0,
   o próximo deploy sobe uma versão que ninguém testou, e o discriminante do
   conserto é uma frase desse pacote. Travar na versão exata é uma linha, e é
   decisão de política de dependência.
3. **`git push` para `origin/main`.** Reincidência de duas lanes de deploy
   seguidas. Produção agora roda `cb5922a7`, que existe **só nesta máquina**.
4. **Node.js 20 decomissiona em 2026-10-31.** As 96 functions gen1 da casa estão
   nele. Prazo real, e o aviso já apareceu em três deploys.
5. D3 e D4 da review seguem devolvidos, sem dono: o `canal: "email"` do alerta
   que mente para falha anterior ao e-mail, e o runbook desatualizado.
