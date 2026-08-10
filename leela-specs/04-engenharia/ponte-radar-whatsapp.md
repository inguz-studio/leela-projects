---
tags: [leela, radar, whatsapp, contrato, ingestao, idempotencia, firestore, rules, lgpd]
atualizado: 2026-08-09
trace: 60ebd3f5-7a71-4841-8603-cf549ee294f9
reparo: 662b9248-be60-4aae-bf5e-3a40c19bd987 (pós-review antagonista 3ed45e7f)
---

# Leela · contrato da ponte do radar de WhatsApp

Contrato normativo entre o motor que observa as comunidades e a Leela. É derivado do estudo de arquitetura do trace `c5a4a8bd-e9e4-4759-869c-a70f874c9c52`, que continua sendo a fonte do raciocínio, das medições contra o código real e das alternativas recusadas. Este documento não repete o estudo: ele fixa o que a implementação tem de obedecer.

**O estudo é registro histórico do raciocínio, e onde os dois divergirem este contrato vence** — inclusive nas seções que o estudo escreveu antes das decisões do dono e que continuam lá: o bloco de rules com escrita de cliente sobre `rotulos`, a recomendação de identidade por pseudônimo e a tabela de correspondência com o motor. A rodada anterior afirmava que a lista de divergências abaixo era completa, e não era: quem for implementar abre o estudo pelas tarefas e encontra desenho já derrubado. As divergências que o contrato registra por escrito estão marcadas ao longo do texto, e a regra geral acima cobre o resto.

O épico dono é [[LEELA-E20-radar-comunidade]], e as regras citadas aqui vivem lá.

## O princípio que organiza tudo

O banco local na máquina que roda o motor é a fonte da verdade. O Firestore é projeção derivada, somente leitura do ponto de vista do produto, e reconstruível a partir do local **com uma exceção declarada: `radarVinculos`**. Nada flui de volta. Qualquer defeito de publicação vira problema recuperável: recalcula e republica.

A exceção existe porque `radarVinculos` nasce na nuvem, de um ato do admin (RN-533), e não do motor. O `nomeManual` que ele digitou e o vínculo que ele confirmou não existem no SQLite local, no motor nem no CRM: recalcular e republicar não os traz de volta, apaga. Por isso `radarVinculos` fica fora de qualquer rotina de recálculo e republicação, e entra no backup e no expurgo como dado primário, e não como projeção descartável.

## Grão do dado: dia aditivo, janela recalculada

Contagem por hora, por dia e volume total são aditivas, então somam para qualquer janela. Ranking não é: a palavra que fica em 31º lugar todo dia pode ter mais ocorrências no mês do que a campeã de um único dia, e somar listas de topo produz um ranking mensal errado de um jeito silencioso e plausível.

- `dias/{YYYY-MM-DD}` guarda só o aditivo: mensagens, mídias, links, histograma de 24 horas no fuso local, entradas e saídas, participantes ativos, tamanho do grupo no fim do dia, cobertura.
- `janelas/{7d|30d|90d}` guarda os rankings, recalculados por inteiro a cada publicação e gravados por substituição total, nunca merge.

É o mesmo par que a casa já usa em `analyticsSnapshots/{YYYY-MM-DD}` (retrato diário) e `demografia/current` (agregado recomputado por inteiro). O radar copia as duas convenções em vez de criar uma terceira.

### O dia é um recorte, e todo campo do item de dia é medido dentro dele

O `dia` é a data no **fuso do organizador** — o mesmo `fusoMinutos` que viaja no envelope — e **todos os campos do item de dia são medidos dentro daquele recorte**: mensagens, mídias, links, participantes ativos, entradas, saídas, tamanho do grupo no fim e as 24 posições de `porHora`. Um campo de dia nunca carrega total de período.

Está escrito assim porque o motor hoje não entrega assim, e o caminho errado é plausível. No código do fork, `total`, `media_count`, `link_count`, `joins`, `leaves` e `member_count.end` são contagens sobre a janela `since..until` inteira; a única série por dia que existe, `message_volume.per_day`, agrupa por `date(timestamp, 'unixepoch')`, ou seja, em **UTC**; e o histograma de horas aplica o fuso (`strftime('%H', timestamp + offset)`). A tabela de correspondência do estudo (linha 334) mapeia justamente esses campos de período, e **vale só para o item de janela**.

Duas consequências que a implementação tem de tratar como requisito, não como detalhe:

1. **Montar um lote de dias com os números do período grava o total do mês dentro de cada dia**, e a invariante `soma(porHora) == mensagens` não pega, porque os dois lados vêm da mesma fonte errada. O painel mostraria trinta dias idênticos sem nada reclamar na borda.
2. **Misturar o dia em UTC com as horas no fuso local produz recusa de dado correto.** Em Brasília, toda mensagem entre 21h e 23h59 do dia local cai no dia seguinte em UTC, que é a faixa de pico de uma comunidade de corrida. A ingestão devolveria 422 quase todo dia com conversa à noite, e quem depurasse iria procurar o defeito na contagem.

O recorte por dia no fuso local é trabalho novo do lado do motor, declarado na S2002-T3. Enquanto ele não existir, não há lote de dias para publicar — publicar dia com número de período é pior do que não publicar.

## Coleções

```
tenants/{tenantId}/radarInstancias/{instanciaId}
tenants/{tenantId}/radarInstancias/{instanciaId}/entregas/{publishSeq}
tenants/{tenantId}/radarGrupos/{grupoHash}
tenants/{tenantId}/radarGrupos/{grupoHash}/dias/{YYYY-MM-DD}
tenants/{tenantId}/radarGrupos/{grupoHash}/janelas/{7d|30d|90d}
tenants/{tenantId}/radarFrota/{7d|30d|90d}
tenants/{tenantId}/radarVinculos/{participanteHash}
```

`radarInstancias/{instanciaId}` é o registro da instância e a marca d'água: `tenantId`, `status`, `ultimoSeq`, `ultimoDiaPublicado`, `ultimoContatoEm`, `versaoSchema`, `aceiteTermo`, `criadoEm`, `atualizadoEm`. É contra ele que a ingestão confere o tenant, e dele que o painel tira o aviso de atraso.

`radarGrupos/{grupoHash}` guarda `nomeGrupo`, `membrosAtuais`, `primeiroDia`, `ultimoDia`, `radarExpurgadoEm` e `clubeSlug` opcional, que é o que liga a comunidade do WhatsApp ao clube da Leela.

`radarVinculos/{participanteHash}` é o único documento do conjunto que nasce de um gesto humano, e não do motor: `nomeManual` (a correção que o admin digita), `atletaId` ou `membroId` quando o admin concilia o participante com alguém do cadastro, `vinculadoPor`, `vinculadoEm` e `origemNome`. Ele é escrito por Function, nunca pelo cliente, e o motor não o lê nem o recebe de volta — nada flui para o lado local. As regras dele são a RN-532 (o nome) e a RN-533 (o vínculo).

Os dados ficam sob `tenants/`, e não sob `clubes/`, porque o catch-all de subcoleção de clube é fechado por decisão declarada. A tela mora na rota do clube, que resolve o `clubeSlug` para o `grupoHash` antes de montá-la. A tela em si é chaveada pelo `grupoHash`, e é isso que permite a segunda entrada, pela lista de radares do tenant, quando o clube já não existe (RN-534, S2009).

**Divergência do estudo, registrada.** A coleção `rotulos/{participanteHash}`, que existia para o organizador digitar um nome sobre o pseudônimo, sai do contrato. Ela era o mecanismo do nível de identidade que o dono descartou: com nome real no ranking (RN-521), o rótulo digitado perde a função e manteria a única coleção do conjunto com escrita de cliente, junto de uma validação de shape que ninguém precisa. Reabre se o organizador pedir para corrigir nome de exibição errado, e aí volta como decisão nova.

## Nomenclatura

Obedece à convenção por camada do repositório. Coleções `radar*` em camelCase; `expurgarRadar` e `expurgarRadarCore` como verbo de domínio em português; `radarIngestao` como substantivo, na linha das três HTTP que já existem; eventos de log `radar_ingerido`, `expurgo_radar_diario` e `expurgo_radar_falhou`. Constante de nome de coleção mora em módulo sem dependência, nunca no primeiro módulo que a usou, porque importar de módulo pesado arrasta o fecho de imports e faz a function exigir segredo que ela não usa.

## Payload de ingestão

Uma requisição carrega **ou** um lote de dias **ou** um lote de janelas, nunca os dois, e no máximo 100 itens. Cada requisição tem um `publishSeq`.

Envelope comum: `versaoSchema`, `instanciaId`, `tenantId`, `publishSeq`, `computadoEm`, `fusoMinutos`, `tipo`, `itens`.

Item de dia: `grupoHash`, `nomeGrupo`, `dia`, `cobertura` (opcional), `mensagens`, `midias`, `links`, `participantesAtivos`, `membrosFim`, `entradas`, `saidas`, `porHora` (24 inteiros). Todos medidos no recorte daquele dia, no fuso do organizador.

Item de janela: `grupoHash`, `janela`, `de`, `ate`, `mensagens`, `cobertura` (opcional), `palavras[{palavra, n, remetentes}]`, `participantes[{hash, nome, diasAtivos, posicao, n}]`, `porDiaSemana` (7 inteiros), `porHora` (24 inteiros). O lote de janelas pode carregar `frota`, com o mesmo shape agregado por organizador.

O campo de origem de `porHora`, nos dois itens, é o histograma **com fuso aplicado** — `peak_hours_local` no JSON do motor, nunca `peak_hours`, que é UTC. Os dois campos convivem no mesmo objeto e têm a mesma forma, então pegar o errado não aparece numa inspeção rápida. O teste de projeção usa fixture com fuso diferente de zero, que é a única condição em que as duas listas divergem e o erro fica visível.

**Divergência do estudo, registrada.** O item de participante ganha o campo `nome`, por decisão do dono (RN-521). O `hash` continua sendo a chave estável de continuidade entre períodos, porque nome muda e chave não. `jid`, telefone e qualquer identificador de contato seguem descartados na origem e não existem no tipo (RN-523). O `nome` tem tamanho máximo declarado no schema, **é opcional** e obedece à RN-532 na origem e na forma.

### De onde vem o `nome`, e o que ele pode não ser

O publicador usa o `notify_name` do participante, que é o nome que ele mesmo mostra na comunidade, e **não** o `display_name`. Os dois existem na tabela `contacts` do motor e o cálculo hoje resolve `coalesce(display_name, notify_name, verified_name)`, com o `display_name` descrito no próprio esquema como "nome no catálogo local / pushName": é o catálogo da máquina do organizador, não o nome público de quem falou. Num chip novo o catálogo tende a estar vazio e os dois coincidem, o que faz a diferença passar despercebida até o dia em que o organizador parear um número que já tinha agenda. A ordem fica fixada aqui: `notify_name`, e ausente quando ele não existe.

`nome` ausente é caso normal, não erro — o motor devolve `string | null` porque a origem é um `LEFT JOIN contacts`. O lote não é recusado por isso e a tela tem rótulo próprio para a linha sem nome (RN-532).

`nome` também é a única string livre que atravessa a fronteira, e o schema fechado não protege contra **valor** ruim: ele bloqueia um campo `telefone` e deixa passar `nome: "+55 11 98888-7777"`. Quem usa o número como nome de exibição não é raro, e conta business preenche `verified_name` com o que quiser. Por isso existe a invariante de forma de telefone na tabela abaixo, e por isso a prova da tarefa do publicador confere valor, não campo.

**Lacunas do motor que a S2002-T3 tem de fechar antes de existir payload.** A rodada anterior declarava uma só, e a lista real é maior: recorte por dia no fuso local, mídias e links por dia, entradas e saídas por dia, participantes ativos por dia, `diasAtivos` por participante, `cobertura` (ver adiante) e `remetentes` por palavra. Nenhuma delas é grande sozinha; juntas são uma tarefa de métricas por dia, separada da tarefa do publicador desde esta rodada.

## Invariantes conferidos na borda

A ingestão recusa antes de escrever qualquer coisa. Validar na fronteira é mais barato do que descobrir depois que o painel mostra número impossível.

| Invariante | Resposta se quebrar |
|---|---|
| Schema fechado: campo desconhecido no payload | 400 `SCHEMA_INVALIDO` |
| `soma(porHora) == mensagens`, os dois medidos no mesmo recorte de dia e no mesmo fuso | 422 `INVARIANTE_QUEBRADA` |
| `porHora` com 24 inteiros não negativos; `porDiaSemana` com 7 | 422 |
| `tenantId` diferente do registrado em `radarInstancias/{instanciaId}` | 403 `TENANT_NAO_CONFERE` |
| `versaoSchema` desconhecida | 400 `SCHEMA_DESCONHECIDO` |
| `dia` fora do formato `YYYY-MM-DD`, ou no futuro pelo fuso do envelope | 422 |
| String livre além de `palavra` (mínimo 3 letras, sem dígito), `nomeGrupo` e `nome` do participante | 400 |
| `nome` que, removidos espaços e pontuação, tenha 8 ou mais dígitos, ou comece com `+` | 400 `NOME_COM_FORMA_DE_TELEFONE` |
| `cobertura` presente e fora do intervalo de 0 a 1 | 422 |
| `diasAtivos` maior que o número de dias da janela | 422 |
| Lote acima de 100 itens | 413 |

`nome` ausente e `cobertura` ausente **não** quebram invariante: são estados previstos, tratados na tela.

O schema fechado é a trava mais importante do desenho, e o motivo está na RN-523. A invariante de forma de telefone existe porque o schema fechado sozinho não fecha a porta: ele confere chaves, e o furo estava no valor de `nome`. Os três casos do teste são `"+55 11 98888-7777"` e `"5511988887777"`, que têm de ser recusados, e `"Maria"`, que passa.

## Idempotência: livro-razão por entrega e sequência monótona

Cliente pode repetir, servidor não pode duplicar efeito. O modelo é o mesmo do processamento de webhook de pagamento, que a casa já provou: livro-razão por entrega criado com `tx.create()` **dentro da mesma transação dos efeitos**.

Cada requisição vira `radarInstancias/{instanciaId}/entregas/{publishSeq}`. Se o documento já existe, a entrega já foi processada.

O `publishSeq` é contador monótono por instância, guardado no banco local e comparado com `ultimoSeq`:

- maior: aplica os itens e avança `ultimoSeq` na mesma transação;
- igual: retentativa depois de confirmação perdida, responde 200 com `aplicado: false`, que é sucesso e não erro;
- menor: carga velha fora de ordem, ignora e responde 200 com `aplicado: false`.

Sequência em vez de relógio, de propósito: comparar por `computadoEm` obrigaria a confiar no relógio de uma máquina doméstica.

Cada dia é gravado por substituição total no documento cujo identificador é a própria data, e o servidor compara campo a campo antes de escrever, deixando `atualizadoEm` intocado no caso sem mudança. Isso é o que torna a idempotência testável em vez de prometida. O limite de 500 escritas por transação é o motivo do teto de 100 itens.

## Daemon offline, backfill, marca d'água e cobertura

Ao acordar, o publicador compara `ultimoDiaPublicado` com hoje e enfileira o que faltou, em lotes de 100. Como o dia é idempotente por identificador, repetir não faz mal.

Duas sutilezas evitam número errado. O publicador **sempre republica os últimos 3 dias**, porque o espelho continua crescendo para trás quando o histórico chega na reconexão; o número de um dia estabiliza em 72 horas em vez de congelar cedo e errado. E o campo `cobertura` carrega a fração do dia em que o listener esteve conectado: abaixo de 0,9 a tela marca o dia como parcial.

### `cobertura` não tem fonte hoje, e nasce anulável por isso

O estudo dizia que a cobertura sairia "do registro de saúde que o supervisor do fork já mantém". Esse registro não existe com resolução histórica. O que o motor guarda é `connection_status` e `last_disconnect` em `runtime_state`, que é tabela chave-valor sobrescrita a cada evento, e dois eventos de auditoria (`connection_degraded`, disparado só depois de N falhas seguidas, e `connection_recovered`). A tabela `channel_state`, que tem coluna `health`, é do canal de e-mail. Nenhuma das migrations guarda janela de conexão por dia.

O caso que a cobertura existe para pegar é exatamente o que não deixa rastro: uma queda de dez minutos que reconecta na primeira tentativa. Preencher o campo com número inventado é pior do que não ter campo, porque ele existe para ser honesto.

Então, nesta versão do contrato:

- `cobertura` é **opcional** no schema da versão 1. Ausente significa desconhecida, e a tela diz isso em vez de fingir 1,0.
- O estado "dia parcial" fica atrás da **presença** do campo com valor abaixo de 0,9, nunca atrás de um valor default.
- A fonte de verdade a construir é uma tabela `connection_log(instance_id, at, event)` no motor, alimentada nos dois ramos de `connection.update` que já existem, mais a consulta que integra o tempo conectado por dia no fuso local. É trabalho declarado da S2002-T3, e o teste dele é derrubar a conexão por 3h num dia sintético de 24h e assertar cobertura entre 0,86 e 0,88.

Limitação declarada, não resolvida: se o participante falou enquanto o listener estava fora e o WhatsApp não entregou aquele histórico na reconexão, o dado se perdeu e ninguém consegue saber. A cobertura é a única defesa honesta contra isso, e ela é aproximada.

## Autenticação da ponte

`radarIngestao` é função HTTP restrita por IAM, invocada com token de identidade assinado pelo Google, audiência igual à URL da função. O daemon usa conta de serviço dedicada com o papel de invocador.

Callable está fora porque espera token de usuário do Firebase Auth, e daemon não é usuário. Token compartilhado em cabeçalho está fora por dois motivos: é o padrão que a própria documentação de arquitetura da casa aponta como a fraqueza conhecida da porta de webhook, e token é segredo, e segredo precisa de binding declarado, que já custou dois incidentes de produção. Autenticação por IAM não tem segredo nenhum para vincular, então uma classe inteira de defeito deixa de existir.

**Divergência do padrão da casa, registrada no estudo e mantida aqui.** O radar é a primeira função HTTP do projeto autenticada por IAM. A divergência é deliberada, não pede infraestrutura nova além de uma conta de serviço e uma vinculação de papel, e reabre se o CTO humano preferir uniformidade, aceitando herdar a fraqueza documentada.

Reuso obrigatório em vez de código novo: teto de instâncias, memória e tempo limite no `runWith`, copiando a única function do repositório que já declara teto; o limitador de taxa compartilhado como defesa em profundidade, com janela por instância; classe de erro no molde da que já carrega status HTTP; cabeçalhos de resposta `Cache-Control: no-store`, `Referrer-Policy: no-referrer` e `X-Robots-Tag: noindex, nofollow`.

## Security rules

Padrão dominante do arquivo: leitura para quem é do tenant, escrita fechada para todo cliente, porque quem escreve é a Function pelo Admin SDK.

```
match /tenants/{tenantId}/radarInstancias/{instanciaId} {
  allow read: if isTenantWriter(tenantId) || isPlatformAdmin();
  allow write: if false;

  match /entregas/{publishSeq} {
    allow read: if isPlatformAdmin();
    allow write: if false;
  }
}

match /tenants/{tenantId}/radarGrupos/{grupoHash} {
  allow read: if isTenantWriter(tenantId) || isPlatformAdmin();
  allow write: if false;

  match /dias/{dia} {
    allow read: if isTenantWriter(tenantId) || isPlatformAdmin();
    allow write: if false;
  }
  match /janelas/{janela} {
    allow read: if isTenantWriter(tenantId) || isPlatformAdmin();
    allow write: if false;
  }
}

match /tenants/{tenantId}/radarFrota/{janela} {
  allow read: if isTenantWriter(tenantId) || isPlatformAdmin();
  allow write: if false;
}

match /tenants/{tenantId}/radarVinculos/{participanteHash} {
  allow read: if isTenantWriter(tenantId) || isPlatformAdmin();
  allow write: if false;
}
```

`radarVinculos` é escrito por Function mesmo sendo o único documento que nasce de gesto do admin: a alternativa seria abrir escrita de cliente numa coleção que carrega nome de pessoa e ligação com o cadastro, que é a classe de dado onde a casa menos aceita cliente escrevendo. O caminho é a função de conciliação da S2008.

Três regras da casa que o bloco obedece, e cada uma custou um defeito. `allow write: if false` significa negado para todo cliente, administrador de plataforma incluído: em Firestore os matches compõem por OR, então `if isPlatformAdmin()` re-concederia escrita de cliente sobre agregados. Subcoleção sensível ganha match próprio, nunca catch-all. E `isTenantWriter` na leitura, e não `isTenantMember`, porque retrato de comunidade é informação de gestão, na mesma classe das coleções de dinheiro e de dado pessoal.

## Índices

Zero índice composto novo e zero `fieldOverride` novo (RN-527). A varredura do expurgo ordena por identificador de documento e usa `endBefore(corte)`, servida pelo índice automático, porque a data em `YYYY-MM-DD` ordena igual ao calendário. A lista de instâncias é collection group sem filtro.

Se um requisito futuro pedir filtro em collection group, a regra é declarar `COLLECTION` ascendente, `COLLECTION` descendente e `COLLECTION_GROUP` ascendente juntos, e acrescentar a linha ao teste de contrato de índices na mesma tarefa. Override novo nasce reprovado por padrão, e é assim que deve continuar.

## Retenção e expurgo

`expurgarRadar` roda às 03h25 no fuso de São Paulo, fechando a escada da madrugada que hoje vai de 03h00 a 03h20, em três camadas: núcleo puro com relógio injetado e deletes em lotes de 400; camada do meio que envolve o núcleo, registra incidente e **relança**, porque engolir o erro deixaria a execução verde no agendador, trocando falha silenciosa por falha invisível; e o agendador por cima.

O registro de incidente é o que já existe: a união de tipos de expurgo ganha o membro do radar e o módulo é usado como está. O campo de alerta **continua** sendo o do expurgo de LGPD, porque é ele que a política de alerta casa; o que muda é o tipo e o nome do evento de log. Trocar o alerta criaria uma segunda política, que é exatamente o que o runbook proíbe. O payload do incidente higieniza antes de truncar em 200, nessa ordem, porque cortar o fim não é cortar o conteúdo.

O carimbo `radarExpurgadoEm` fica no documento do grupo, com timestamp de servidor, e **sem pulo cego**: grupo já carimbado ainda leva uma sondagem de um documento, porque dia novo pode ter chegado depois do último expurgo.

O expurgo tem uma quarta responsabilidade desde esta rodada: **janela parada expira**. Documento em `janelas/` e em `radarFrota/` sem republicação há mais de 120 dias é apagado, porque a maior janela cobre 90 dias e uma parada de 120 descreve um período que já saiu inteiro do alcance do produto. Sem isso, instância morta deixa nome de participante congelado para sempre num documento que ninguém substitui (RN-536).

O expurgo **não** olha o estado do clube. Clube fora do ar mantém o radar, que é a decisão do dono de 09/08 sobre clube excluído reter a base, e o acesso passa a ser pela lista de radares do tenant, construída pela S2009, para o dado não ficar vivo e inalcançável ao mesmo tempo (RN-534). O expurgo, sendo função, prova só que o documento não foi apagado; a alcançabilidade é testada do lado da tela.

Prazos em RN-524. O TTL nativo do Firestore foi considerado e recusado: exclusão por esforço, sem hora garantida, sem carimbo e sem trilha, que é justamente a prova de cumprimento que o runbook valoriza.

## Mapa instância ↔ tenant

Um para um, e é a fronteira de locação inteira. O identificador de instância do motor é a chave do documento em `radarInstancias`, e o `tenantId` gravado ali é a única autoridade sobre a que organizador aquela instância pertence. A ingestão confere o par a cada requisição, antes de qualquer escrita, e recusa com 403 quando ele não bate. O sal usado no hash de participante é por organizador e nunca sai da máquina que roda a instância, o que significa que a Leela sozinha não reidentifica ninguém a partir do hash.

A máquina que roda a instância é do organizador, e ele é o controlador do texto bruto que mora nela (RN-530). Isso não é detalhe de operação: é a frase que sustenta a promessa de que mensagem, telefone e identificador morrem fora da Leela. Mudar a hospedagem muda o sujeito dessa frase, e é por isso que o F2 reabre a frente jurídica em vez de herdá-la calada.

Esquecimento de participante se resolve nos dois lados, e agora os dois existem. Do lado local, o hash entra em lista de bloqueio e a próxima publicação de janela já sai sem ele. Do lado da nuvem, uma função de exclusão invocada pelo organizador ou pela operação remove o participante das janelas correntes e do `radarVinculos` pelo Admin SDK, e carimba o pedido (RN-536).

O lado da nuvem passou a ser obrigatório por dois motivos. O mecanismo antigo dependia de a máquina estar viva **e** de haver próxima publicação: instância morta ou radar abandonado congela o nome dentro das janelas, que são substituídas e não expiram. E o argumento que justificava o sal local — a Leela sozinha não reidentifica ninguém a partir do hash — perdeu força no dia em que o nome real passou a viajar no mesmo documento, ao lado do hash. O sal continua fora da nuvem porque protege a **reidentificação retroativa**, não porque o nome esteja escondido.

## O que este contrato proíbe

- Qualquer capacidade de envio, em qualquer camada (RN-520).
- Texto de mensagem, telefone, identificador de WhatsApp, mídia e transcrição na nuvem (RN-523).
- Pacote de terceiro que se venda como proteção contra banimento. O precedente é o caso de abril de 2026, com credenciais de sessão e mensagens exfiltradas por um pacote com 56 mil downloads.
- Índice composto novo e `fieldOverride` novo (RN-527).
- Coleção do radar sob `clubes/`.
- Lote de dias montado com número de período, e dia em UTC misturado com hora em fuso local.
- `nome` com forma de telefone, ainda que o campo se chame `nome` (RN-523 pelo valor, não só pela chave).
- Escrita de cliente em qualquer coleção do radar, `radarVinculos` incluída.

## Vizinhos

[[LEELA-E20-radar-comunidade]] para o épico dono e as regras. [[runbook-expurgo-lgpd]] para o mecanismo de expurgo reusado. [[modelo-de-dados-firestore]] para as demais coleções. [[arquitetura-do-sistema]] para o padrão das funções HTTP existentes e a fraqueza documentada do token em cabeçalho.
