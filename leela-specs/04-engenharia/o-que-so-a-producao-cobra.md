---
tags: [leela, deploy, producao, indices, rules, iam, segredos, gate, processo, prontidao]
atualizado: 2026-08-06
trace: leela-pixreal-diag-20260804
---

# Leela · o que só a produção cobra

Este documento existe porque "os clubes não carregam" virou uma investigação inteira, e no fim ela achou não um defeito, mas uma **família** de defeitos. Todos com a mesma assinatura: verde na máquina de quem escreveu, quebrado no ar, e nenhum erro visível para quem estava olhando.

A família tem nome, e o nome importa mais que os casos: **o que só a produção cobra**. Existem coisas que o ambiente local não exige, não simula e não sabe que existem. Enquanto elas faltam, o código está certo, a suíte está verde, o deploy diz "Deploy complete!" e o produto não funciona. O defeito não está no código. Está entre o repositório e o servidor.

O que segue é o que aconteceu, por que ninguém viu, e o que passa a rodar antes de todo deploy para que não aconteça de novo.

## Os três casos, com data e prova

### 1. O índice que só a produção cobra (05/08)

A tela de clubes do painel desenhava lista vazia. A consulta que a alimenta combina um filtro por produtora com uma ordenação por data de criação, e essa combinação exige um índice composto no Firestore. O índice nunca existiu, nem no arquivo do repositório nem no servidor.

O Firestore não engoliu nada. Ele respondeu **HTTP 400** com a frase exata `The query requires an index`. Quem engoliu foi a camada de cima: o painel contava os documentos da resposta, achava zero e desenhava o estado vazio, sem nunca olhar o campo de erro que vinha junto. Silêncio de instrumento, não de servidor.

O mesmo defeito, no mesmo dia, apareceu numa segunda consulta (`tenants` filtrado por situação e ordenado por data) e numa terceira que custou mais caro: **o expurgo de retenção de dados de saúde falhou todas as madrugadas entre 29/07 e 05/08**, oito execuções seguidas, sempre com o mesmo erro, porque faltavam dois índices. Um composto e uma isenção de campo único. Dado de saúde é dado sensível, e a obrigação de apagá-lo tem prazo legal. A descoberta foi por acaso, oito dias depois, enquanto alguém lia o log atrás de outra coisa.

**Por que foi invisível:** o emulador do Firestore **não cobra índice**. Ele serve qualquer combinação de filtro e ordenação que você pedir. Um teste de integração no emulador passa com folga enquanto a produção erra na primeira linha, e nenhuma quantidade de testes desse tipo mudaria isso. A cegueira é estrutural.

### 2. A permissão que só existe em produção (05/08)

O dono tentou trocar a capa de um evento e leu: "você não tem permissão para acessar `eventos/teste-taxa-repassada/capa`". A regra que governa esse upload estava certa, e a conta dele tinha todos os direitos. O problema era outro.

As regras do Storage consultam o Firestore para decidir se a imagem é sua ("este evento pertence à sua produtora?"). Essa consulta atravessa dois serviços, e quem a executa não é o usuário: é um agente de serviço do Google, que precisa de uma permissão específica para ler o banco. Quem concede essa permissão é o próprio comando de deploy. E ele **só concede quando roda em terminal interativo**, perguntando "quer conceder?" e esperando você digitar sim. Está no código do `firebase-tools`, literalmente: `if (this.options.nonInteractive) { return; }`.

Todos os nossos deploys eram automatizados. Publicavam a regra e não concediam nada. A regra ficava publicada, correta e inútil.

A consequência medida: **nenhum upload de imagem que dependa de checagem no banco jamais funcionou em produção**. Capa de evento, capa de clube, logo de patrocinador, foto de kit. O bucket estava com zero objetos, em todos os prefixos, desde que existe. Só funcionavam foto de perfil e logo de marca, que não consultam o banco. O papel foi concedido em 05/08, com prova.

Um detalhe que fez o defeito durar: quando a consulta cross-service falha, a negação sai **com a mesma frase** de uma negação legítima de permissão. Quem lê não consegue distinguir "você não pode" de "eu não consegui perguntar".

**Por que foi invisível:** o emulador resolve a consulta cross-service dentro do próprio processo, sem agente de serviço e sem permissão nenhuma. Ele não tem como saber que essa permissão existe. A suíte de regras do Storage tem 85 testes verdes e nenhum deles podia enxergar o defeito.

### 3. A regra publicada atrás do repositório (29/07 a 05/08)

O arquivo `storage.rules` do repositório tinha um bloco a mais desde 02/08. O ruleset publicado em produção era de 29/07. Três dias de divergência que ninguém mediu, porque não havia nada que medisse.

O mesmo padrão apareceu nas functions, e ali foi pior. A lane de deploy de 05/08 descobriu, ao conferir contra o servidor, que a baseline escrita no brief estava errada e que **funções diferentes estavam em commits diferentes**: 65 delas em um commit, 28 em outro, sete dias mais velho. Ninguém tinha essa informação; ela foi reconstruída lendo a data de atualização de cada função no servidor.

**Por que foi invisível:** nenhum teste olha o servidor. O repositório sabe o que ele contém, e é só isso que ele sabe. Se alguém deploya uma parte, ou se um deploy falha no meio, ou se três dias passam, nada no projeto acusa.

## Os parentes, que valem citar

**O artefato de build gitignorado.** As pastas `dist/` não são versionadas. Um deploy sem rebuild sobe o código velho, e a suíte continua verde porque a suíte lê o fonte, não o artefato. É a mesma família: a coisa que quebra não está no que os testes olham.

**A guarda de segredos, que funcionou.** Existe no projeto um teste estático que confere se toda function declara os segredos que ela pode ler. Ele nasceu depois de três incidentes de pagamento e nesta rodada **pegou o quarto antes de virar incidente**: `QR_TOKEN_KEYS` faltando na declaração do webhook do gateway, o que faria o dinheiro entrar e o comprador não receber ingresso nem erro. Vale registrar que esta classe tem cura, e que a cura tem forma conhecida: a prova é sobre o código, não sobre a execução, porque a execução local mente por construção (local, todas as variáveis vivem no mesmo processo e todo mundo enxerga todo mundo).

## O que o emulador não prova

Lista explícita, para nenhuma lane futura confundir verde local com garantia.

| O emulador não sabe | Consequência |
|---|---|
| que índice existe | serve qualquer filtro + ordenação; produção recusa |
| que isenção de campo único existe | não reproduz a remoção que um override causa |
| que permissão de IAM existe | resolve consulta cross-service no processo, sem agente de serviço |
| o que está publicado no servidor | compara com nada; divergência de dias passa batida |
| binding de segredo por função | tudo vive num `process.env` só, todo mundo lê tudo |
| qual artefato vai subir | lê o fonte, nunca o `dist/` |
| cotas, billing, região, App Check | não existem no emulador |

A suíte do projeto tem cerca de 6.840 casos verdes e 109 mil linhas de teste. Ela não podia pegar nenhum dos três casos acima. Isso não é falha da suíte; é o limite do que uma suíte local mede. O argumento completo, com o método de cada número, está em [[laudo-testes-2026-08-04]] §1.5.

## A conferência de prontidão

O que fecha a lacuna não é lembrete nem checklist. É verificação que roda, mede arquivo contra servidor, e falha alto.

```bash
node functions/scripts/prontidao-de-deploy.mjs
```

Um comando, sem navegador, sem emulador, sem service account, sem chave em disco. Basta ter feito `firebase login` alguma vez. O transporte é o token do próprio `firebase-tools`, trocado por um acesso de vida curta que nunca é impresso nem gravado. Nada é escrito em produção: são só leituras.

O script imprime um relatório em português e devolve um código de saída que serve de portão:

| Código | Significado |
|---|---|
| `0` | **PRONTO** — nada atrás, nada faltando |
| `1` | **BLOQUEIO** — algo atrás ou faltando; não deploye antes de ler |
| `2` | **INDETERMINADO** — não consegui medir (login vencido, API fora, sem permissão) |

O código 2 existe de propósito. A pior saída possível seria dizer "ok" porque a medição falhou, e é exatamente assim que esta família de defeitos se propaga. Falha de medição é vermelha, nunca verde.

### O que ele confere

| | Confere | Nasceu do caso |
|---|---|---|
| **C1** | índices compostos: arquivo × servidor, com o que seria criado, o que seria removido e o que ainda está construindo | 1 |
| **C2** | isenções de campo único: arquivo × servidor, e **bloqueia** quando o deploy apagaria um escopo de coleção que existe hoje | 1 |
| **C3** | regras do Firestore: arquivo × ruleset publicado, com tamanho, impressão digital, primeira linha divergente e as linhas de cada lado | 3 |
| **C4** | idem para as regras do Storage | 3 |
| **C5** | para cada consulta cross-service nas regras do Storage, se o agente de serviço tem a permissão concedida; quando não tem, imprime o comando que concede | 2 |
| **C6** | todo segredo que alguma function declara existe no Secret Manager e tem versão ativa | parente |
| **C7** | artefatos de build mais velhos que a fonte (indício, não prova) | parente |
| **C8** | roda a guarda estática que já existia: toda consulta do código tem índice **declarado no arquivo** | 1 |

A C2 merece nota. Uma isenção de campo único **não é aditiva**: declarar só o escopo de grupo APAGA os índices de coleção que o Firestore mantinha sozinho, e toda consulta de coleção sobre aquele campo passa a falhar. No próximo deploy de índices, não no deploy do código, o que separa a causa do efeito por quanto tempo o maestro quiser. Isso quase derrubou a entrada em desafio da plataforma inteira em 05/08, sem que uma linha do desafio tivesse sido tocada.

### O que ele não faz de novo

O repositório já tinha três guardas estáticas, e as três provam o **arquivo**:

- `packages/api-client/scripts/auditar-indices-firestore.mjs` — consulta no código leva a índice declarado
- `functions/src/__tests__/firestoreIndexes.contract.test.ts` — isenção declarada não remove escopo de coleção
- `functions/src/__tests__/secretsBinding.contract.test.ts` — segredo usado leva a segredo declarado

O script novo fecha o elo que faltava, e só ele: **arquivo leva a servidor**. Ele não reimplementa nenhuma das três. A C8 chama a primeira; a C6 lê a lista canônica de segredos de dentro da terceira, para não haver duas verdades sobre a mesma coisa.

### O que ele declara não verificar

O relatório termina imprimindo esta lista, toda vez, junto com o veredito. Um gate que esconde o próprio alcance é pior que gate nenhum.

- **Que a consulta devolva o dado certo.** Índice presente prova que ela é planejável, não que está correta.
- **As regras em si.** Regra publicada e idêntica ao arquivo pode estar errada. Quem prova isso é a suíte adversarial de regras.
- **O conteúdo dos segredos.** Prova que o segredo existe e tem versão ativa, não que o valor é o certo nem que o gateway o aceita.
- **Quais functions estão atrás do repositório.** A comparação por função exige reconstruir o grafo de imports por baseline, e ficou de fora. Hoje isso é trabalho manual da lane de deploy.
- **O hosting.** Nenhuma comparação de release nem do pacote servido, no painel ou na landing.
- **Os índices que as functions precisam.** A guarda estática lê o pacote do cliente; consultas do Admin SDK dentro de `functions/` ficam fora.
- **A direção do `__name__`** num índice composto. Um `__name__` final é removido dos dois lados antes de comparar, que é o que o `firebase-tools` faz. Uma divergência que existisse só ali passaria batida.
- **O build.** A C7 compara datas de arquivo, e data mente depois de um `git pull`. Rodar o build continua sendo passo obrigatório.
- **O caminho do navegador, o upload real, o pagamento real.** Nada aqui abre browser nem escreve em produção.
- **App Check, cotas, billing e limites de região.**

### Opções

```
--projeto=<id>    projeto a interrogar (padrão: leela-hub)
--raiz=<dir>      árvore de arquivos a comparar (padrão: a raiz do repositório)
--json            saída legível por máquina, além do relatório
--sem-estaticos   não roda a guarda estática de índices (C8)
```

`--raiz` serve a dois usos: rodar contra um checkout diferente na esteira, e falsear o script de propósito para provar que ele acusa.

## A ordem obrigatória do deploy

A ordem não é preferência. Cada passo existe porque o inverso já quebrou alguma coisa.

**1. Prontidão antes de tudo.** Rodar o script. Vermelho para o deploy. Ele mede em segundos o que a rodada levou oito dias para descobrir.

**2. Build antes de qualquer coisa que suba código.** `dist/` é gitignorado, então o repositório não sabe se o artefato é o do commit atual. Deploy sem rebuild sobe código velho com a suíte verde, que é a pior combinação possível: o sintoma não aponta para a causa.

**3. Índices antes de functions.** Índice novo pode levar minutos para ficar pronto, e função que depende dele falha em produção enquanto ele constrói. Deployar código primeiro é escolher uma janela de erro em vez de nenhuma.

**4. Isenções de campo único com atenção redobrada, sempre.** Não são aditivas. O arquivo é a lista **completa** do que passa a existir para aquele campo; o que não está listado é removido. Antes de mexer, confirmar que a C2 está verde e ler o que ela diz que seria removido.

**5. Regras depois dos índices, antes ou junto das functions.** Regra é publicada inteira, num gesto atômico. O risco não é ordem, é conteúdo: publicar arrasta todo diff acumulado no arquivo, inclusive o que outra lane deixou lá. A C3 e a C4 mostram exatamente o que seria arrastado, linha a linha, antes de o comando rodar.

**6. Se as regras do Storage consultam o Firestore, conferir o IAM depois do primeiro deploy.** Concessão automática só acontece em terminal interativo. Ou o deploy de Storage roda interativo uma vez, respondendo sim, ou a permissão é concedida à parte pelo `gcloud`. A C5 responde se ela está lá; sem ela, a regra publica e não funciona.

**7. Functions, com baseline medida no servidor, não no brief.** Funções diferentes podem estar em commits diferentes. A verdade é a data de atualização de cada função no servidor; qualquer baseline escrita à mão precisa ser conferida contra ele antes de recortar o conjunto a deployar.

**8. Confirmar pelo servidor, não pelo texto do CLI.** "Deploy complete!" é a opinião do comando sobre si mesmo. A prova é reler o estado publicado e comparar. Rodar a prontidão de novo, depois, é a forma mais barata de fazer isso.

## Onde o processo entra na esteira

**Pré-deploy, obrigatório.** Nenhum deploy de produção começa sem a prontidão verde ou sem uma justificativa escrita para cada bloqueio. É o primeiro passo de toda lane de deploy, antes do pré-flight que já existe. Vermelho para; indeterminado também para, porque não medir e estar certo são coisas diferentes.

**Pós-deploy, na mesma lane.** Rodar de novo fecha o ciclo: prova pelo servidor que o que subiu é o que estava no arquivo. Substitui a conferência manual que hoje cada lane refaz do zero.

**Na CI, quando ela virar gate.** Hoje a CI não bloqueia nada, por três razões medidas e registradas em [[como-verificar]]. Enquanto for assim, este script não é gate automático; é gate humano com saída de máquina. No dia em que a CI virar gate, ele entra como um passo de job próprio, com credencial de leitura, e a saída `--json` já existe para isso.

**O que fica para outra alçada.** Ligar o script a um `npm run` e a um passo de CI exige mexer em `functions/package.json`, em `turbo.json` e nos workflows, que estão fora do território desta lane e com outra lane em voo no mesmo diretório. O ajuste é pequeno e está descrito para quem pegar:

```jsonc
// functions/package.json — acrescentar em "scripts"
"prontidao": "node scripts/prontidao-de-deploy.mjs"
```

Não deve entrar em `turbo run test`: o script fala com a rede e depende de credencial de usuário, o que o torna impróprio para uma tarefa de build cacheável. O lugar dele é um passo explícito, chamado por quem deploya.

## Como falsear, se você desconfiar

Um gate em que ninguém confia não é gate. O script foi provado nos dois sentidos contra a produção real, e qualquer pessoa pode repetir:

```bash
# 1. copie os arquivos comparados para uma pasta qualquer
# 2. estrague um deles de propósito (some um índice, apague um bloco de regra)
# 3. rode apontando para a cópia — o servidor continua sendo o de verdade
node functions/scripts/prontidao-de-deploy.mjs --raiz=/caminho/da/copia
```

A saída real das duas execuções, verde e falseada, está no handoff da lane: `.nirvana/handoffs/leela-processo-deploy-SPEC.md`.

## Em uma frase

O emulador prova que o código está certo. Ele não prova, e não pode provar, que a produção está montada para executá-lo. Essa segunda pergunta agora tem quem a responda, em segundos, antes de cada deploy.

---

# Inventário por listagem não vê documento sob pai ausente

**Lane:** `LIMPEZA-PROD` · 2026-08-06 · descoberto no meio de uma operação destrutiva, pelo pior caminho possível: a lane criou um dos casos que depois teve de encontrar.

## O que aconteceu

Para planejar a exclusão de sete eventos e cinco produtoras, montei o inventário de produção do jeito óbvio: listar as coleções da raiz, e para cada documento listar as subcoleções, recursivamente. Deu **3.138 documentos**, e esse número virou base de decisão — quantos morrem, quantos sobrevivem, quantos órfãos o plano previne.

O número estava errado. O certo é **3.170**.

No Firestore, subcoleção **não pertence** ao documento pai: ela existe por caminho próprio. Apagar `profissionais/{uid}` não apaga `profissionais/{uid}/dashboard/current` — e, pior, o pai apagado **some da listagem da coleção**. O subtree continua lá, cobrando armazenamento, respondendo a leitura direta, e invisível para qualquer varredura que comece listando.

Eram 4 pais fantasmas escondendo 31 documentos. Um deles a própria lane criou, três horas antes, sem perceber.

## A causa, que é de código e não de operação

```ts
// functions/src/overview/aggregateProfessionalDashboard.ts
await db.collection('profissionais').doc(profId)
  .collection('dashboard').doc('current')
  .set({ ...current, atualizadoEm: FieldValue.serverTimestamp() });
```

`set` incondicional, sem checar se `profissionais/{profId}` existe. O gatilho `onEventoWriteDashboard` roda em `onWrite` — e `onWrite` acorda no **delete** — recomputando o dashboard do `organizadorId` que estava em `change.before`. Ou seja: apagar um evento **cria** um dashboard para o organizador dele, mesmo que esse organizador nunca tenha tido documento em `profissionais`.

Quando transferi a titularidade dos dois eventos sobreviventes para a conta do dono, o mesmo gatilho criou `profissionais/{uid-do-dono}/dashboard/current` sob um pai que não existe. A lane fabricou o próprio fantasma.

## A regra

**Sempre que uma contagem for base de decisão destrutiva, liste com `showMissing`.**

```
GET /v1/projects/{p}/databases/(default)/documents/{colecao}?showMissing=true
```

O parâmetro devolve o documento-fantasma: sem `fields`, sem `createTime`, só o nome — e é o único jeito de descobrir que existe subtree pendurado ali. Distinguir é trivial:

```ts
const existeDeVerdade = (d) => d.createTime !== undefined || d.fields !== undefined;
```

Sem isso, o inventário não erra por pouco: ele erra **silenciosamente e para menos**, que é a direção perigosa. Um plano de exclusão calculado sobre ele termina declarando "zero órfãos" enquanto deixa órfão que ele mesmo não consegue enxergar. Foi exatamente o que o dry-run passou a mostrar quando a listagem mudou: **10 referências penduradas** que antes não apareciam em lugar nenhum.

## O que generaliza

1. **Contagem que autoriza destruição precisa provar que enxerga tudo.** "Listei e deu N" não é prova; é prova de que N documentos têm pai vivo.
2. **Todo gatilho `onWrite` roda no delete.** Se ele escreve, ele escreve durante a limpeza — e pode escrever *depois* do que você acabou de apagar. Varredura de lixo vai por último, nunca no meio.
3. **`set` em caminho aninhado sem checar o pai é uma fábrica de fantasma.** É barato de escrever, invisível em teste com emulador limpo, e só aparece quando alguém apaga o pai — meses depois, noutra lane.
4. **A operação que investiga também suja.** A transferência de titularidade era leitura-e-escrita mínima, cinco campos, e mesmo assim disparou o gatilho e criou um fantasma. Medir de novo *depois* de escrever não é paranoia; foi o que fechou o caso.

## Em uma frase

Listagem mostra quem tem pai. Se a sua decisão apaga coisas, você precisa ver também os órfãos que já existem — e `showMissing` é a única porta.
