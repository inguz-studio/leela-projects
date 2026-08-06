# SPEC-PROCESSO-DEPLOY — o aprendizado e o gate que ele virou

- **Trace:** `leela-pixreal-diag-20260804` · **Lane:** SPEC-PROCESSO-DEPLOY
- **Employee:** sf-cto (software-forge) · **Data:** 2026-08-06
- **Repo:** `C:\dev\LEELA` · HEAD de partida `846ce8ee` (== `origin/main`)
- **Território tocado:** `leela-specs/**` e `functions/scripts/**`. Nada em `functions/src`, nada em `apps/`, nada em `packages/` além de leitura. Nenhuma escrita em produção.

## O pedido

> "quero que ao final isso gere um aprendizado e processo para evitar que isso aconteça em deploys futuros"

O caso dos clubes foi um de vários da mesma família nesta rodada. O processo cobre a família.

## O que aterrissou

| Artefato | Onde |
|---|---|
| O aprendizado, escrito para durar | `leela-specs/04-engenharia/o-que-so-a-producao-cobra.md` |
| A conferência de prontidão (executável) | `functions/scripts/prontidao-de-deploy.mjs` |
| Ponteiro no doc irmão de gates | `leela-specs/04-engenharia/como-verificar.md` §"O gate que nenhum comando desta página cobre" |
| Índices | `leela-specs/HOME.md` (tabela de pastas + trilha externa) |
| Boards | `leela-specs/00-boards/V1-KANBAN.md` — **S033** em Feito, **S034** em Backlog (o que foi devolvido) |

## A família, nomeada

**O que só a produção cobra.** Coisas que o ambiente local não exige, não simula e não sabe que existem. Enquanto elas faltam, o código está certo, a suíte está verde, o deploy diz "Deploy complete!" e o produto não funciona.

| # | Caso | Data | Por que foi invisível |
|---|---|---|---|
| 1 | índice composto ausente (`clubes`, `tenants`, e os dois do expurgo de LGPD) | 05/08; o expurgo falhou **8 madrugadas**, 29/07–05/08 | o emulador **não cobra índice** — serve qualquer filtro + ordenação |
| 2 | `roles/firebaserules.firestoreServiceAgent` nunca concedido | descoberto 05/08; bucket com **zero objetos** desde sempre | o emulador resolve o cross-service no processo local, sem service agent e sem IAM |
| 3 | ruleset de Storage 3 dias atrás do arquivo; functions em commits diferentes | 29/07–05/08 | nenhum teste olha o servidor |

Parentes registrados no documento: `dist/` gitignorado (deploy sem rebuild sobe código velho com a suíte verde) e o `secretsBinding.contract`, que **funcionou** e pegou o `QR_TOKEN_KEYS` do webhook antes de virar incidente.

## O que o script verifica

Um comando, sem navegador, sem emulador, sem service account, sem chave em disco:

```bash
node functions/scripts/prontidao-de-deploy.mjs
```

| | Confere | Do caso |
|---|---|---|
| **C1** | índices compostos: arquivo × servidor (o que seria criado, o que seria removido, o que ainda constrói) | 1 |
| **C2** | isenções de campo único: arquivo × servidor, **bloqueando** quando o deploy apagaria um escopo `COLLECTION` vivo | 1 |
| **C3** | `firestore.rules` × ruleset publicado — bytes, sha256, primeira linha divergente, linhas de cada lado | 3 |
| **C4** | idem para `storage.rules` | 3 |
| **C5** | cada `firestore.get/exists` das `storage.rules` tem o papel de IAM concedido ao service agent; se não, imprime o `gcloud` que concede | 2 |
| **C6** | todo segredo declarado em `runWith` existe no Secret Manager **com versão ENABLED** | parente |
| **C7** | artefato de build mais velho que a fonte (indício de mtime, declarado como tal) | parente |
| **C8** | chama a guarda estática que já existia (query no código → índice no arquivo) | 1 |

**Códigos de saída (é o gate):** `0` PRONTO · `1` BLOQUEIO · `2` INDETERMINADO. O 2 existe porque a pior saída possível seria dizer "ok" porque a medição falhou.

**Transporte:** refresh token do `firebase-tools` já logado (`~/.config/configstore/firebase-tools.json`), trocado por access token de vida curta. Token nunca impresso, nunca gravado. Só leituras: `firestore.googleapis.com`, `firebaserules.googleapis.com`, `cloudresourcemanager.googleapis.com` (`:getIamPolicy`), `secretmanager.googleapis.com`.

## O que ele declara NÃO verificar

O relatório imprime esta lista toda vez, junto do veredito.

1. Que a query devolva o dado **certo** (índice presente prova que ela é planejável).
2. As regras em si — publicada e idêntica ao arquivo pode estar errada.
3. O **conteúdo** dos segredos (só existência + versão ativa).
4. Quais **functions** estão atrás do repositório (exige o grafo de imports por baseline; segue manual).
5. O **hosting** — nenhuma comparação de release nem de bundle servido.
6. Os índices que `functions/` precisa (a C8 lê `packages/api-client`; Admin SDK fica fora).
7. A direção do `__name__` num composto (um `__name__` final é removido dos dois lados, como o `firebase-tools` faz).
8. O build — a C7 é mtime, e mtime mente depois de um `git pull`.
9. Navegador, upload real, pagamento real.
10. App Check, cotas, billing, região.

## Reuso vs criado

| Reaproveitado | Como |
|---|---|
| `packages/api-client/scripts/auditar-indices-firestore.mjs` | **executado** pela C8 (`spawnSync`), não reimplementado. A cadeia fica completa: query → arquivo (guarda antiga) → servidor (guarda nova). |
| `functions/src/__tests__/secretsBinding.contract.test.ts` | a C6 **lê a lista canônica `SEGREDOS` de dentro dele**, para não haver duas verdades. É o que resolve o `BANK_DATA_KEY`, que viaja pelo fonte como constante `ENV_BANK_DATA_KEY` e nenhuma varredura de literal enxerga. |
| `functions/src/__tests__/firestoreIndexes.contract.test.ts` | a regra do não-aditivo veio dele; a C2 a aplica contra o **servidor** (o contrato a aplica contra o arquivo). |
| Padrão de credencial das lanes DEPLOY-PREVIEW / STORAGE-BUCKET / DEPLOY-TUDO | mesmo caminho de token e mesmas APIs REST. |
| Constantes do `firebase-tools` | `clientId`/`clientSecret` públicos e `CROSS_SERVICE_RULES_ROLE`, lidos de `lib/api.js` e `lib/rulesDeploy.js`. |

**Criado:** o script inteiro (`prontidao-de-deploy.mjs`, ~640 linhas), o documento `o-que-so-a-producao-cobra.md`, os dois cards de board.

## Prova — execução real contra produção

### Verde (`leela-hub`, raiz do repo) — exit 0

```
==============================================================================
PRONTIDÃO DE DEPLOY · projeto leela-hub
raiz de arquivos: C:\dev\LEELA
medido em 2026-08-06T03:24:52.750Z
==============================================================================

OK ......  C1 · índices compostos (arquivo × servidor)
    arquivo: 18   servidor: 18
    nada no arquivo que falte no servidor

OK ......  C2 · fieldOverrides (e a regra do não-aditivo)
    arquivo: 8   servidor: 8
    os dois lados batem, override a override

OK ......  C3 · regras do Firestore (arquivo × publicado)
    ruleset no ar: 4eabe733-d343-4f61-8378-0e20e07f29ef (2026-08-05T20:50:38.465167Z)
    firestore.rules e o publicado são IDÊNTICOS (sha256[0:16] 23b3a92b0e06ef7d, 165932 bytes)

OK ......  C4 · regras do Storage (arquivo × publicado)
    ruleset no ar: 34131880-544c-4e67-9939-3c29d2594eba (2026-08-05T20:42:49.886031Z)
    storage.rules e o publicado são IDÊNTICOS (sha256[0:16] 53803f9c8dd1eb77, 13856 bytes)

OK ......  C5 · IAM do cross-service das storage.rules
    storage.rules tem 2 chamada(s) cross-service (firestore.get()×2), em funções auxiliares reusadas por vários matches
    service agent: service-76126035891@gcp-sa-firebasestorage.iam.gserviceaccount.com
    papéis concedidos a ele: roles/firebaserules.firestoreServiceAgent, roles/firebasestorage.serviceAgent
    roles/firebaserules.firestoreServiceAgent CONCEDIDO — o get() cross-service responde.

OK ......  C6 · segredos do runWith × Secret Manager
    esperados pelo código: 7 (ASAAS_API_KEY, ASAAS_WEBHOOK_AUTH_TOKEN, BANK_DATA_KEY, BREVO_API_KEY,
      CODIGO_ACESSO_PEPPER, CRM_ID_PEPPER, QR_TOKEN_KEYS)
    declarados por CONSTANTE, não por literal: ENV_BANK_DATA_KEY — resolvidos pela lista do contrato
    todos existem no Secret Manager

ATENCAO .  C7 · artefatos de build × fonte (heurística de mtime)
    `dist/` é gitignorado: um deploy sem rebuild sobe o código VELHO com a suíte verde.
    possivelmente desatualizados:
        packages/api-client: artefato 289 min mais velho que a fonte
        functions → bundle: artefato 394 min mais velho que a fonte
    mtime é indício, não prova: `git pull` reescreve datas. A prova é rodar o build.

OK ......  C8 · guarda estática de índices (reuso, sem rede)
    query no código → índice declarado no arquivo (a metade que este script não faz):
        auditoria de índices do Firestore — @leela/api-client
          variantes de query analisadas: 39
          índices compostos declarados:  18
        ok — toda query com where+orderBy tem índice declarado.

==============================================================================
VEREDITO: PRONTO (com 1 atenção: C7).
==============================================================================
EXIT=0
```

A C5 verde é o retrato do conserto que o maestro fez em 05/08. Até ontem ela seria vermelha.

### Falseado de propósito — exit 1

Cópia dos arquivos comparados numa pasta fora do repo, cinco defeitos plantados à mão, **servidor de produção real do outro lado**. Comando:

```bash
node functions/scripts/prontidao-de-deploy.mjs --raiz=<copia>
```

Defeitos plantados: (a) índice composto `pedidos(status, criadoEm DESC)` que não existe no servidor; (b) `membros.atletaId` reduzido a `COLLECTION_GROUP` — a remoção não-aditiva; (c) duas linhas a mais em `firestore.rules`; (d) o bloco `slotFotoKitValido` **removido** de `storage.rules`; (e) dois segredos inexistentes, um na lista do contrato e outro só num `runWith` novo.

```
BLOQUEIO   C1 · índices compostos (arquivo × servidor)
    arquivo: 19   servidor: 18
    ATRÁS — 1 índice existe no arquivo e NÃO no servidor:
        + pedidos [COLLECTION] status:ASCENDING,criadoEm:DESCENDING

BLOQUEIO   C2 · fieldOverrides (e a regra do não-aditivo)
    arquivo: 8   servidor: 8
    divergentes:
        membros.atletaId: arquivo+[] servidor+[COLLECTION/ASCENDING COLLECTION/DESCENDING]
    ⛔ NÃO-ADITIVO — o deploy APAGARIA escopo COLLECTION que existe hoje:
        membros.atletaId perderia COLLECTION/ASCENDING e COLLECTION/DESCENDING

BLOQUEIO   C3 · regras do Firestore (arquivo × publicado)
    ruleset no ar: 4eabe733-d343-4f61-8378-0e20e07f29ef (2026-08-05T20:50:38.465167Z)
    ATRÁS — o publicado NÃO é o arquivo.
        local    166042 bytes  sha256[0:16] 6e69f2707b9b0e9f
        no ar    165932 bytes  sha256[0:16] 23b3a92b0e06ef7d
        divergem a partir da linha 3021
    linhas só no ARQUIVO (2) — o deploy as PUBLICARIA:
        // LINHA FALSEADA — nao existe no ruleset publicado
        // LINHA FALSEADA — nao existe no ruleset publicado
    linhas só NO AR (0) — o deploy as REMOVERIA:

BLOQUEIO   C4 · regras do Storage (arquivo × publicado)
    ruleset no ar: 34131880-544c-4e67-9939-3c29d2594eba (2026-08-05T20:42:49.886031Z)
    ATRÁS — o publicado NÃO é o arquivo.
        local    13770 bytes  sha256[0:16] d60f0c7fe6d9420f
        no ar    13856 bytes  sha256[0:16] 53803f9c8dd1eb77
        divergem a partir da linha 208
    linhas só no ARQUIVO (0) — o deploy as PUBLICARIA:
    linhas só NO AR (3) — o deploy as REMOVERIA:
        }
        function slotFotoKitValido(slot) {
        return slot == '2' || slot == '3';

BLOQUEIO   C6 · segredos do runWith × Secret Manager
    esperados pelo código: 9 (…, SEGREDO_QUE_NUNCA_FOI_CRIADO, SEGREDO_SO_NO_RUNWITH)
    ⛔ AUSENTES no Secret Manager: SEGREDO_QUE_NUNCA_FOI_CRIADO, SEGREDO_SO_NO_RUNWITH
    ATENÇÃO: declarado em runWith e fora da lista SEGREDOS do contrato: SEGREDO_SO_NO_RUNWITH

ATENCAO .  C8 · guarda estática de índices (reuso)
    auditar-indices-firestore.mjs não encontrado nesta raiz.

==============================================================================
VEREDITO: BLOQUEIO — C1, C2, C3, C4, C6. NÃO deploye antes de resolver.
==============================================================================
EXIT=1
```

### Falseamento da C5 — o único que não dá para plantar num arquivo

A C5 lê um fato de produção, então falseá-la exige um projeto onde o papel genuinamente não está concedido. Rodei contra outro projeto real da mesma conta, com os arquivos verdadeiros do Leela:

```
BLOQUEIO   C5 · IAM do cross-service das storage.rules
    storage.rules tem 2 chamada(s) cross-service (firestore.get()×2), em funções auxiliares reusadas por vários matches
    service agent: service-842085540286@gcp-sa-firebasestorage.iam.gserviceaccount.com
    papéis concedidos a ele: (nenhum)
    ⛔ roles/firebaserules.firestoreServiceAgent AUSENTE.
        Toda Rule que consulta o Firestore NEGA em produção, com a mesma frase de
        uma negação legítima de permissão. Conserto (uma vez por projeto):
        gcloud projects add-iam-policy-binding project-94ed616c-2f90-4f99-baa \
          --member=serviceAccount:service-842085540286@gcp-sa-firebasestorage.iam.gserviceaccount.com \
          --role=roles/firebaserules.firestoreServiceAgent
EXIT=1
```

É exatamente o estado em que o `leela-hub` esteve até 05/08.

### O caminho INDETERMINADO — exit 2

Terceiro projeto, com uma cópia de `storage.rules` **sem** cross-service (para a C5 sair do caminho e o veredito ser puro):

```
INDETERM.  C1 … → Cloud Firestore API has not been used in project … before or it is disabled.
INDETERM.  C2 … (idem)
INDETERM.  C3 · não consegui medir: nenhum release casa com "cloud.firestore" no projeto …
INDETERM.  C4 · não consegui medir: nenhum release casa com "firebase.storage" no projeto …
OK ......  C5 · storage.rules não chama firestore.get/exists — o papel não é exigido.
INDETERM.  C6 … → Secret Manager API has not been used …
==============================================================================
VEREDITO: INDETERMINADO — C1, C2, C3, C4, C6. Não consegui medir; não conte como verde.
==============================================================================
EXIT=2
```

Os três códigos de saída estão provados: 0, 1, 2. Precedência confirmada: bloqueio vence indeterminado.

## Gates

| Gate | Resultado |
|---|---|
| `npx eslint functions/scripts/prontidao-de-deploy.mjs --max-warnings 0` | **exit 0** |
| execução real contra `leela-hub` | **exit 0** (verde) |
| execução falseada (5 defeitos plantados) | **exit 1**, 5 bloqueios |
| execução com IAM genuinamente ausente | **exit 1** |
| execução sem conseguir medir | **exit 2** |
| escrita em produção | **nenhuma** — só GET e o `:getIamPolicy`, que é POST de leitura |

## Onde entra na esteira

**Pré-deploy, obrigatório.** Primeiro passo de toda lane de deploy, antes do pré-flight que já existe. Vermelho para; indeterminado também para.

**Pós-deploy, na mesma lane.** Rodar de novo prova pelo servidor que o que subiu é o que estava no arquivo. Substitui a conferência manual que cada lane hoje refaz do zero.

**CI:** só faz sentido quando a CI virar gate. Hoje ela não bloqueia nada, pelas três razões medidas em `como-verificar.md`. A saída `--json` já existe para o dia em que virar.

## Devolvido (fora do território desta lane)

A lane de `functions/src` estava em voo e o brief cerca o meu território em `leela-specs/**` + `functions/scripts/**`. Ficou descrito e devolvido, com card **S034** no Backlog do kanban:

```jsonc
// functions/package.json — acrescentar em "scripts"
"prontidao": "node scripts/prontidao-de-deploy.mjs"
```

⚠️ **Não** ligar em `turbo run test`: o script fala com a rede e depende de credencial de usuário, o que o torna impróprio para uma tarefa de build cacheável. O lugar dele é um passo explícito, chamado por quem deploya.

Também devolvido: a **comparação por função** (qual function está atrás do repositório). Ela exige reconstruir o grafo de imports por baseline, que é a parte cara e hoje é trabalho manual da lane de deploy. Está declarada na lista do que o script não verifica e virou a tarefa S034-T3.

## A ordem obrigatória do deploy (resumo; a razão de cada passo está no documento)

1. **Prontidão** antes de tudo.
2. **Build** antes de qualquer coisa que suba código — `dist/` é gitignorado.
3. **Índices antes de functions** — índice novo leva minutos e a função que depende dele falha enquanto ele constrói.
4. **Isenções de campo único com atenção redobrada, sempre** — não são aditivas; o arquivo é a lista completa.
5. **Regras** depois dos índices; publicar arrasta todo diff acumulado, e a C3/C4 mostram qual.
6. **IAM do cross-service** conferido depois do primeiro deploy de Storage; concessão automática só em terminal interativo.
7. **Functions** com baseline medida no servidor, nunca no brief — funções diferentes podem estar em commits diferentes.
8. **Confirmar pelo servidor**, não pelo texto do CLI. Rodar a prontidão de novo é a forma mais barata.

## O que este trabalho NÃO prova

- **Não prova que o próximo deploy vai dar certo.** Prova que a produção está montada para executar o que se vai publicar. É a pergunta que ninguém fazia, não é todas as perguntas.
- **Não substitui a suíte.** Ele nem olha comportamento; olha configuração.
- **Não foi rodado numa máquina que não a minha.** A dependência de `firebase login` está declarada, mas o caminho de erro ("login vencido") foi exercitado só pela leitura do configstore, não por um token de fato expirado.
- **Não mede a landing nem o painel.** Hosting ficou fora por inteiro.
- **A C7 é heurística.** Ela pode acusar em falso depois de um `git pull`, e pode calar quando alguém toca um arquivo do `dist/` à mão. Está rotulada como ATENÇÃO justamente por isso, e nunca bloqueia.
