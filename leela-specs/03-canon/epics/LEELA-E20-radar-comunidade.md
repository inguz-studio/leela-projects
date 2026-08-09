# LEELA-E20 · Radar da comunidade no WhatsApp

- **Superfície:** Painel
- **Horizonte:** H2 (piloto convidado; F1 travado por parecer jurídico)
- **MoSCoW:** Should
- **Estimativa:** L
- **Status:** 📋 spec escrita 09/08; F0.a despachável, F1 bloqueada pelo LGPD-1
- **Depende de:** LEELA-E05 (clubs — a comunidade é o clube), LEELA-E11 (convenção de agregado mantido por Function), LGPD-1 (quarta frente do painel; trava o F1)
- **De-para:** novo (sem BH- direto). Fonte técnica: estudo `arquitetura-radar-leela.md`, trace `c5a4a8bd-e9e4-4759-869c-a70f874c9c52`; decisões do dono em `02-rodadas/2026-08-09-radar-whatsapp/01-decisoes-dono.md`

## Objetivo

O organizador mantém a comunidade dos participantes no WhatsApp e não tem retrato nenhum dela dentro da Leela. Este épico entrega esse retrato no Painel Profissional: volume de conversa por dia, mapa de horários, palavras mais faladas, entradas e saídas de membro, e a pirâmide de engajamento com o nome de quem fala. O dado nasce fora, num número dedicado que observa os grupos daquele organizador, e chega ao painel já agregado.

O radar não envia nada. Nunca. Nenhuma mensagem, nenhuma resposta, nenhum aviso automático em grupo, e nenhuma ponte entre o ranking e a tela de comunicação. Mensagem bruta, telefone e identificador de WhatsApp também não sobem: eles morrem na máquina que roda o motor. O que atravessa a fronteira são números e o nome de exibição que o participante já mostra na comunidade.

## Personas & JTBD

- **Persona primária:** Profissional — Organizadora (**Marina Castelo**).
- **Persona secundária:** Coordenador de Assessoria (**Felipe Martins**), quando a comunidade é do clube.
- **JTBD atendidos:**
  - "Saber quem são meus participantes mais engajados, pelo nome, para conversar com quem sustenta a comunidade."
  - "Ver se a comunidade esquentou ou esfriou depois da experiência, sem rolar mil mensagens."
  - "Descobrir do que a comunidade fala, para escolher o assunto da próxima experiência."
- **JTBD explicitamente não atendido:** falar com a comunidade a partir do radar. Disparo continua sendo E06 e a área de comunicação do clube, por dentro da Leela.

## Critérios de sucesso do épico

- O organizador abre `/clubes/:slug/radar` e reconhece a própria comunidade nos números, com os sete estados de tela cobertos (sem instância, sem pareamento, sem grupo, sem dado no período, sincronismo atrasado, dia parcial, radar pausado).
- Nenhuma superfície do produto oferece envio a partir do radar; a varredura de código não acha caminho do ranking para qualquer canal de saída.
- Um tenant nunca lê o ramo do outro, provado por teste dirigido de rules e pela recusa de ingestão com tenant divergente.
- Republicar o mesmo lote não muda `atualizadoEm`: a idempotência é observável, não presumida.
- O expurgo roda com carimbo por grupo, no mesmo formato de incidente do expurgo de saúde, sem criar uma segunda política de alerta.
- Zero índice composto novo e zero `fieldOverride` novo em `firestore.indexes.json`.

## Por que épico novo, e não extensão do E11

Li os dois antes de decidir. O E11 é analytics do próprio negócio da Leela: ele agrega o que a plataforma já registrou (inscrições, receita, membros, conversão) num rollup mantido por Function, e a tela dele mora hoje em CRM › Visão geral. Tudo o que ele toca é dado de dentro.

O radar tem outra natureza em quatro eixos, e cada um deles sozinho já pediria arquivo próprio. A **fonte é externa e não oficial**, com risco permanente de o número ser banido, o que nenhuma métrica do E11 carrega. O **ciclo de vida é por fase com portão de sobrevivência**: F0.a decide se o produto continua existindo antes de qualquer linha de código na Leela. A **frente jurídica é dele**, entrou como quarta frente do LGPD-1 em 09/08 e trava o F1 inteiro. E a **superfície é a rota do clube**, não a área de CRM.

Pendurar isso no E11 misturaria um épico gelado de rollup interno com um produto que tem motor de terceiro, chip, banimento e advogado no caminho. O E11 continua sendo dependência conceitual, porque o radar copia a disciplina dele (agregado mantido por Function, nunca cálculo no cliente, nunca dado individual sem regra explícita), e nada mais.

## Regras de negócio aplicáveis

Definidas aqui: RN-520 a RN-529 (seção "Regras de negócio novas" adiante). Herdadas:

- **RN-172** — identidade individual tem fronteira própria; o radar expõe nome de participante e cai do lado de dentro dessa fronteira.
- **RN-147** — dado pessoal tem retenção limitada e expurgo provado; o radar reusa o mecanismo, não inventa um segundo.
- **Governança de agregados (E11)** — número que a tela mostra vem de documento mantido por Function; o cliente nunca calcula ranking.

## Modelo de dados tocado

Contrato normativo completo em [[ponte-radar-whatsapp]]. Coleções novas, todas sob `tenants/`:

- `tenants/{tenantId}/radarInstancias/{instanciaId}` — registro da instância e marca d'água do sincronismo.
- `tenants/{tenantId}/radarInstancias/{instanciaId}/entregas/{publishSeq}` — livro-razão de entrega.
- `tenants/{tenantId}/radarGrupos/{grupoHash}` — o grupo observado, com `clubeSlug` opcional ligando ao clube.
- `tenants/{tenantId}/radarGrupos/{grupoHash}/dias/{YYYY-MM-DD}` — o que é aditivo.
- `tenants/{tenantId}/radarGrupos/{grupoHash}/janelas/{7d|30d|90d}` — os rankings, substituídos por inteiro.
- `tenants/{tenantId}/radarFrota/{7d|30d|90d}` — comparação entre grupos do mesmo organizador.

Nada mora sob `clubes/`: o catch-all de subcoleção de clube está fechado por decisão declarada, e furá-lo por conveniência de caminho seria reabrir o que já foi fechado.

## Fora de escopo (Won't nesta fase)

- Qualquer envio, resposta, automação de mensagem ou botão que leve do radar a um canal de saída (RN-520).
- Telefone, identificador de WhatsApp, texto de mensagem, mídia e transcrição na nuvem (RN-523).
- QR de pareamento dentro do painel (fica no fluxo operado fora, até F2).
- Provedor terceiro de API não oficial hospedando o motor: entregaria o texto integral das conversas a um terceiro, o que contradiz o princípio central do desenho.
- Índice composto novo ou `fieldOverride` novo (RN-527).

---

## User stories

### LEELA-S2001 · O número sobrevive antes de existir produto (F0.a)

**Como** dono do produto, **quero** provar que um chip dedicado consegue ficar mudo dentro de uma comunidade real por duas semanas, **para** não construir uma feature em cima de um número que vai ser banido.

- **MoSCoW:** Must · **Estimativa:** S · **Superfície:** nenhuma (operação fora da Leela) · **RNs:** RN-520, RN-525, RN-526, RN-529

**Critérios de aceite (Given/When/Then):**
- **Dado** um chip dedicado pareado como instância do motor, **quando** ele entra na comunidade de teste, **então** nenhuma mensagem é publicada no grupo e o perfil do contato aparece como "Radar · [nome da experiência]" com a descrição de que ele só conta e nunca envia.
- **Dado** a configuração da instância, **quando** alguém procura por capacidade de envio, **então** `respond` está ausente de todo lugar e o modo padrão é observação.
- **Dado** 14 dias corridos de operação, **quando** o período fecha, **então** o número está vivo, o listener esteve conectado em pelo menos 95% do tempo e o dono confirma que os números contam algo que ele não sabia.
- **Dado** o número banido dentro dos 14 dias, **quando** isso acontece, **então** o épico volta para a mesa e nenhuma tarefa da S2002 é despachada.

**Tasks:** LEELA-S2001-T1, LEELA-S2001-T2.

#### LEELA-S2001-T1 · Parear o chip dedicado e travar a mudez na configuração
- **Tipo:** setup · **Depende de:** — · **Bloqueia:** S2001-T2 · **Estimativa:** XS

**Objetivo**
Deixar uma instância do motor rodando na máquina do dono, pareada com o chip dedicado, com a comunidade de teste na allowlist e sem nenhuma capacidade de envio configurada.

**Contexto & referências**
- Estudo `arquitetura-radar-leela.md` §7, F0.a; capability `whatsapp.groups.radar` do fork, declarada como somente leitura.
- Decisão do dono: o chip é pago pelo organizador e existe só para isso (RN-529).

**Arquivos (criar/editar)**
- Fora do repositório da Leela: `config.yaml` da instância do motor. Nenhum arquivo do monorepo é tocado nesta task.

**Passos de implementação**
1. Parear o chip como instância dedicada, com identificador próprio.
2. Modo padrão de observação; a comunidade de teste entra na allowlist em modo de análise.
3. Conferir por varredura que `respond` não aparece em nenhum ponto da configuração.
4. Nomear o perfil do contato como "Radar · [nome da experiência]" com a descrição de transparência passiva.

**Regras de negócio a respeitar**
- RN-520, RN-525, RN-529.

**Critérios de aceite (testáveis)**
- **Dado** a configuração pronta, **quando** rodo a varredura por capacidade de envio, **então** o resultado é zero ocorrência.

**Fora de escopo**
- Qualquer escrita na nuvem da Leela.

#### LEELA-S2001-T2 · Operar 14 dias e registrar o laudo de sobrevivência
- **Tipo:** test · **Depende de:** S2001-T1 · **Bloqueia:** S2002 inteira · **Estimativa:** S

**Objetivo**
Medir a sobrevivência do número e a utilidade do dado antes de autorizar construção na Leela.

**Passos de implementação**
1. Rodar o cálculo do radar sobre o espelho local e ler o resultado só no painel local do motor.
2. Registrar diariamente o tempo conectado do listener.
3. Fechar o laudo com o veredito do dono sobre a utilidade dos números.

**Critérios de aceite (testáveis)**
- **Dado** o fim dos 14 dias, **quando** somo o tempo conectado, **então** ele é de pelo menos 95% e o laudo registra o número exato.
- **Dado** o laudo aprovado, **quando** a S2002 for despachada, **então** ela cita o laudo como pré-requisito pago.

**Fora de escopo**
- Publicar qualquer coisa na nuvem.

---

### LEELA-S2002 · A ponte de dados sobe agregado contra o emulador (F0.b)

**Como** engenheiro da Leela, **quero** a função de ingestão, as coleções e as rules provadas no emulador de preview, **para** que o primeiro dado real chegue por um contrato fechado e idempotente.

- **MoSCoW:** Must · **Estimativa:** L · **Superfície:** Painel (tela mínima só para provar a leitura) · **RNs:** RN-521, RN-522, RN-523, RN-527, RN-528
- **Depende de:** S2001 aprovada; conta de serviço criada; termo do organizador em rascunho.

**Critérios de aceite (Given/When/Then):**
- **Dado** um lote de dias válido, **quando** a ingestão recebe pela primeira vez, **então** os documentos de dia são gravados por substituição total e `ultimoSeq` avança na mesma transação.
- **Dado** o mesmo lote reenviado, **quando** a ingestão recebe de novo, **então** nada é reescrito, `atualizadoEm` fica intocado e a resposta diz que não aplicou.
- **Dado** um lote cujo `tenantId` não bate com o registrado para a instância, **quando** a ingestão valida, **então** ela recusa com 403 antes de escrever qualquer coisa.
- **Dado** um payload com campo desconhecido, **quando** a ingestão valida, **então** ela recusa com 400 e nenhum documento é tocado.
- **Dado** um cliente autenticado como `platform_admin`, **quando** ele tenta escrever em `dias` ou `janelas`, **então** a rule nega.
- **Dado** o organizador A logado, **quando** ele tenta ler o ramo do tenant B, **então** a rule nega.

**Tasks:** LEELA-S2002-T1 a LEELA-S2002-T6.

#### LEELA-S2002-T1 · Núcleo puro de validação e projeção do payload
- **Tipo:** data-model · **Depende de:** S2001-T2 · **Bloqueia:** T2, T3 · **Estimativa:** M

**Objetivo**
Escrever em `packages/core/src/radar/` o schema fechado, os invariantes de borda e a projeção do payload para os documentos de dia, janela e frota, sem depender de Firestore.

**Contexto & referências**
- Contrato normativo: [[ponte-radar-whatsapp]] §payload e §invariantes.
- Regra da casa: function não reimplementa lógica que o core pode carregar.

**Arquivos (criar/editar)**
- `packages/core/src/radar/contrato.ts` — tipos e schema fechado da versão 1.
- `packages/core/src/radar/invariantes.ts` — as oito checagens de borda com o código de recusa de cada uma.
- `packages/core/src/radar/projecao.ts` — payload para documentos.

**Regras de negócio a respeitar**
- RN-523 — o schema fechado é a trava que impede um campo de telefone nascer no publicador e a nuvem aceitar calada.
- RN-521 — `nome` do participante é campo previsto e limitado; `telefone` e identificador de WhatsApp não existem no tipo.

**Critérios de aceite (testáveis)**
- **Dado** um payload com `soma(porHora)` diferente de `mensagens`, **quando** valido, **então** recebo recusa por invariante quebrada.
- **Dado** um payload com campo extra, **quando** valido, **então** recebo recusa por schema inválido.

**Testes a escrever**
- unit: um caso por invariante, mais o caminho feliz de dias e de janelas.

#### LEELA-S2002-T2 · Function `radarIngestao` com IAM, livro-razão e escrita transacional
- **Tipo:** api/function · **Depende de:** T1 · **Bloqueia:** T4, T5 · **Estimativa:** M

**Objetivo**
Criar a função HTTP que recebe o lote, confere tenant e sequência, grava o livro-razão de entrega e aplica os itens na mesma transação.

**Arquivos (criar/editar)**
- `functions/src/radar/radarIngestao.ts`
- `functions/src/radar/COLECOES.ts` — constantes de nome de coleção no próprio módulo, sem dependência pesada.

**Regras de negócio a respeitar**
- RN-522, RN-528.

**Critérios de aceite (testáveis)**
- **Dado** `publishSeq` menor que `ultimoSeq`, **quando** a carga chega, **então** ela é ignorada e a resposta é 200 sem aplicação.
- **Dado** o mesmo `publishSeq` já registrado no livro-razão, **quando** a carga chega, **então** nada é escrito.

**Testes a escrever**
- integração no emulador de preview (Firestore em `127.0.0.1:8180`, functions em 5201): replay, sequência fora de ordem, tenant divergente, lote acima de 100 itens.

#### LEELA-S2002-T3 · Publicador no motor: hash, fila local e sequência monótona
- **Tipo:** integration · **Depende de:** T1 · **Estimativa:** M

**Objetivo**
Somar ao motor o publicador que mapeia o cálculo do radar para o payload, aplica o piso de frequência das palavras, mantém a fila e a sequência, e descarta na origem tudo que não pode subir.

**Arquivos (criar/editar)**
- Fora do monorepo, no fork: publicador, CLI, teste e o campo de remetentes por palavra que hoje não existe no cálculo.

**Regras de negócio a respeitar**
- RN-523 — telefone, identificador e texto são descartados na origem, não filtrados no servidor.
- RN-521 — o nome de exibição sobe; o identificador que o gerou não.

**Critérios de aceite (testáveis)**
- **Dado** um cálculo de janela, **quando** publico, **então** o payload não contém nenhum campo de telefone ou identificador, provado por asserção sobre o JSON serializado.

#### LEELA-S2002-T4 · Rules das seis coleções, com escrita fechada para todo cliente
- **Tipo:** integration · **Depende de:** T2 · **Estimativa:** S

**Arquivos (criar/editar)**
- `firestore.rules` — um match dedicado por coleção, nunca catch-all.

**Regras de negócio a respeitar**
- RN-522 — leitura por `isTenantWriter(tenantId)` ou administrador de plataforma; escrita `if false` para todo cliente.

**Critérios de aceite (testáveis)**
- **Dado** um administrador de plataforma, **quando** ele tenta escrever em qualquer coleção do radar, **então** a rule nega. Matches compõem por OR, então `allow write: if isPlatformAdmin()` reabriria escrita de cliente e está proibido.

**Testes a escrever**
- rules no emulador isolado: leitura cruzada entre tenants, escrita por cada papel.

#### LEELA-S2002-T5 · Provar que o radar não declara índice nenhum
- **Tipo:** test · **Depende de:** T2 · **Estimativa:** XS

**Objetivo**
Fechar por teste a porta do defeito conhecido de `fieldOverride` com escopo isolado.

**Critérios de aceite (testáveis)**
- **Dado** o lote do radar mergeado, **quando** comparo `firestore.indexes.json` com o estado anterior, **então** o arquivo está idêntico.
- **Dado** a varredura do expurgo, **quando** ela roda, **então** ela ordena por identificador de documento e não pede índice declarado.

#### LEELA-S2002-T6 · Tela mínima em `/clubes/:slug/radar` para provar a leitura
- **Tipo:** screen · **Depende de:** T4 · **Estimativa:** S

**Objetivo**
Renderizar sem capricho visual os números de um organizador, lendo direto do Firestore, só para fechar a prova ponta a ponta.

**Arquivos (criar/editar)**
- `apps/painel/src/routes/clubes/ClubesRoutes.tsx` — rota irmã de membros, desafios, parcerias, comunicação e configurações.

**Fora de escopo**
- Os sete estados, o cuidado visual e os gates de design, que são da S2003.
- Qualquer elemento que leve à tela de comunicação.

---

### LEELA-S2003 · O radar vira tela de verdade no Painel Profissional (F1)

**Como** organizadora, **quero** a tela do radar com os estados honestos e a pirâmide de engajamento pelo nome, **para** identificar quem sustenta a minha comunidade.

- **MoSCoW:** Should · **Estimativa:** L · **Superfície:** Painel · **RNs:** RN-521, RN-524, RN-525, RN-526
- **Status:** 🚫 **BLOQUEADA pela quarta frente do LGPD-1** — expor nome real de participante ao organizador, sem aviso publicado no grupo, precisa de base legal e do termo do organizador definidos por advogado antes de qualquer linha desta história.

**Critérios de aceite (Given/When/Then):**
- **Dado** o parecer jurídico entregue e o termo aceito pelo organizador, **quando** a história é despachada, **então** o aceite do termo é pré-condição de ligar o radar daquele tenant.
- **Dado** uma instância sem pareamento, **quando** abro a tela, **então** vejo a instrução de pareamento e nenhum botão que envie coisa alguma.
- **Dado** `ultimoContatoEm` acima de 26 horas, **quando** abro, **então** uma faixa de aviso mostra a data do último dia coberto.
- **Dado** um dia com cobertura abaixo de 0,9, **quando** o gráfico renderiza, **então** aquele ponto é marcado como parcial.
- **Dado** o ranking de participantes, **quando** ele renderiza, **então** cada linha mostra o nome de exibição do participante e nenhuma linha oferece caminho para mensagem, ligação ou comunicado.
- **Dado** um documento de dia com mais de 400 dias, **quando** o expurgo roda de madrugada, **então** ele é apagado e o grupo recebe carimbo de expurgo.

**Tasks:** LEELA-S2003-T1 a LEELA-S2003-T4.

#### LEELA-S2003-T1 · Termo do organizador como pré-condição de ligar o radar
- **Tipo:** api/function · **Depende de:** parecer jurídico (LGPD-1) · **Estimativa:** S

**Objetivo**
Registrar o aceite com versão, finalidade, impressão digital do texto e hora de servidor, e recusar ativação de instância sem esse registro.

**Regras de negócio a respeitar**
- RN-521 — o nome real só é exibido onde há aceite registrado do organizador.

**Critérios de aceite (testáveis)**
- **Dado** um tenant sem aceite registrado, **quando** alguém tenta ativar a instância, **então** a ativação é recusada com motivo próprio.

#### LEELA-S2003-T2 · Tela completa com os sete estados
- **Tipo:** screen · **Depende de:** S2002-T6, S2003-T1 · **Estimativa:** L

**Contexto & referências**
- Ordem de gate da casa: crítica de design com veto do UX antes do gate de fidelidade; JTBD declarado no brief.

**Fora de escopo**
- Conexão com a área de comunicação, em qualquer forma (RN-520).

#### LEELA-S2003-T3 · Cron `expurgarRadar` em três camadas, reusando o incidente de expurgo
- **Tipo:** api/function · **Depende de:** S2002-T2 · **Estimativa:** M

**Objetivo**
Apagar dia vencido às 03h25 no fuso de São Paulo, com núcleo puro de relógio injetado, camada do meio que registra incidente e relança, e o agendador por cima.

**Regras de negócio a respeitar**
- RN-524 — 400 dias corridos nos documentos diários.
- O campo de alerta continua sendo o do expurgo de LGPD, para não nascer uma segunda política de alerta. O que muda é o tipo e o nome do evento de log.

**Critérios de aceite (testáveis)**
- **Dado** um grupo já carimbado, **quando** o expurgo roda, **então** ele ainda sonda um documento, porque dia novo pode ter chegado depois do último carimbo.

#### LEELA-S2003-T4 · Poda do texto local depois que o agregado sobe
- **Tipo:** integration · **Depende de:** S2002-T3 · **Estimativa:** S

**Regras de negócio a respeitar**
- RN-524 — 90 dias de texto no espelho local, apagado só depois de o agregado daquele dia estar publicado e confirmado.

**Critérios de aceite (testáveis)**
- **Dado** um dia cujo agregado ainda não subiu, **quando** a poda roda, **então** o texto daquele dia permanece.

---

### LEELA-S2004 · Multi-locação e autoatendimento (F2)

**Como** operação da Leela, **quero** rodar dez radares sem uma máquina por organizador, **para** que o produto saia do piloto convidado.

- **MoSCoW:** Could · **Estimativa:** XL · **Superfície:** Painel · **RNs:** RN-522, RN-526, RN-529
- **Depende de:** F1 estável; veto do sócio sobre custo recorrente de hospedagem.

**Critérios de aceite (Given/When/Then):**
- **Dado** dez organizadores ativos, **quando** um teste dirigido tenta cruzar dados entre eles, **então** nenhum vazamento acontece em nenhuma camada.
- **Dado** uma instância caída, **quando** a supervisão roda, **então** a detecção acontece em menos de uma hora.
- **Dado** um organizador novo, **quando** ele é convidado, **então** o pareamento acontece fora do painel e o sal dele nasce só na máquina que roda a instância.

**Tasks:** LEELA-S2004-T1 (host multi-instância e supervisão), LEELA-S2004-T2 (registro de instância por tenant e rotação de sal), LEELA-S2004-T3 (política de alerta de verdade, hoje a lacuna aberta do expurgo de saúde).

---

## Ordem sugerida

`S2001 (sobrevivência) → S2002 (ponte no emulador) → [portão jurídico do LGPD-1] → S2003 (tela e expurgo) → S2004 (multi-locação)`. A S2001 é portão de produto e a única que pode começar hoje. A S2002 é despachável assim que a S2001 fechar verde, porque ela não expõe nome a ninguém além do dono. A S2003 espera o advogado.

---

## Regras de negócio novas (rodada 2026-08-09 · radar de WhatsApp)

A faixa 515 estava anunciada como livre no índice, e não estava: as rodadas de 08/08 consumiram 515, 517, 518 e 519. Esta rodada começa na **520**. O 516 fica como buraco deliberado, junto com 460 e 499.

### RN-520 · o radar é mudo por contrato, e a mudez não tem exceção de tela (nova · 2026-08-09)

Nenhuma superfície do produto, do motor ou do painel oferece envio a partir do radar. A capacidade de resposta é ausente da configuração da instância, não desligada por bandeira: bandeira desligada é bandeira que alguém liga. No painel, o ranking não tem botão de mensagem, de ligação nem de comunicado, e a tela do radar não se conecta à área de comunicação do clube, que é sua vizinha de rota.

A proibição é de adjacência, e vale dizer por quê. O produto se posiciona hoje como o jeito de avisar os participantes sem depender do WhatsApp, e a primeira ponte entre um ranking de engajamento e um botão de enviar é o começo do caminho contrário. Se um dia essa ponte existir, ela nasce de decisão nova e declarada do dono, nunca de proximidade de tela.

### RN-521 · o ranking mostra o nome real do participante, e o telefone nunca sobe (nova, dona · 2026-08-09)

Decisão do dono, verbatim de 09/08: nível de identidade sem pseudônimo, nome real, porque o job do organizador é enxergar a pirâmide de engajamento e reconhecer quem são os clientes e membros mais engajados. O que sobe é o **nome de exibição** que o participante já mostra na comunidade. O telefone, o identificador de WhatsApp e o texto do que foi dito continuam proibidos (RN-523).

A continuidade da pessoa entre períodos segue vindo do hash com sal do organizador, que é a chave estável: nome muda, chave não. O nome viaja ao lado dela como rótulo, com tamanho limitado pelo schema.

**Divergência registrada.** O estudo recomendava pseudônimo estável como padrão e colocava nome vindo do WhatsApp fora de escopo. O dono decidiu diferente, com razão de produto declarada, e a consequência foi assumida por escrito: dado pessoal de participante exposto a terceiro, sem consentimento direto de quem foi medido. Por isso a **dependência jurídica é bloqueante** — a base legal e o termo do organizador entraram como quarta frente do LGPD-1 e travam a S2003 inteira. O F0 não depende disso, porque observa uma comunidade de teste do próprio dono.

### RN-522 · uma instância é um organizador, e a fronteira é conferida nos dois lados (nova · 2026-08-09)

O mapa é um para um: uma instância do motor corresponde a um tenant da Leela. A ingestão recusa, com 403 e antes de escrever qualquer coisa, toda carga cujo tenant não bata com o registrado no documento daquela instância. No painel, a leitura acontece só dentro do próprio ramo `tenants/{tenantId}/radar…`, com rule dedicada por coleção e escrita fechada para todo cliente, administrador de plataforma incluído.

Vazamento entre locatários é a pior falha possível neste produto. Um número único da Leela em muitas comunidades transformaria essa falha num erro de digitação de distância, e é essa a razão de a topologia ser um número por organizador.

### RN-523 · só agregado atravessa a fronteira, e o schema fechado é quem garante (nova · 2026-08-09)

Sobem números e nomes de exibição. Nunca sobem: texto de mensagem, telefone, identificador de WhatsApp, mídia e transcrição. Eles são descartados na origem, no publicador, e não filtrados no servidor — filtrar depois pressupõe que já viajaram.

A trava é o schema fechado da ingestão: campo desconhecido no payload é recusa com 400, não campo ignorado. Sem isso, um dia alguém acrescenta um campo de telefone no publicador e a nuvem aceita calada.

### RN-524 · retenção de 400 dias na nuvem, 90 dias de texto no local, com poda (nova · 2026-08-09)

Documento diário vive 400 dias corridos, o que permite comparar o mesmo mês do ano anterior e não guarda dado pessoal. Documento de janela é sempre substituído por inteiro e não acumula histórico. O texto das mensagens no espelho local vive 90 dias e é apagado depois que os agregados daqueles dias subiram e foram confirmados; o agregado fica.

O expurgo é cron auditável com carimbo por grupo, não política silenciosa de banco. A escolha é deliberada: exclusão por esforço, sem hora garantida e sem trilha, é exatamente o que o runbook de LGPD da casa não aceita como prova de cumprimento. Esta regra reabre com o parecer jurídico, que pode apontar prazo diferente.

### RN-525 · nenhum aviso é publicado no grupo; a transparência vem do perfil e do termo (nova, dona · 2026-08-09)

Decisão do dono: sem textos de aviso no grupo. O radar não publica nada ao entrar, e nada depois. A transparência com o participante acontece em duas camadas passivas: o perfil do número, chamado "Radar · [nome da experiência]", com descrição dizendo que ele só conta mensagens e nunca envia; e o termo que o organizador aceita, que é onde a finalidade fica declarada.

Configurar perfil não é enviar mensagem, então essa camada não conflita com a RN-520.

### RN-526 · o rollout é só para convidados enquanto o risco de banimento não estiver medido (nova, dona · 2026-08-09)

O radar não é oferecido no catálogo nem aparece para organizador que não foi convidado. A porta abre organizador a organizador, por decisão da operação, e continua assim até existir medida de quanto tempo um número sobrevive. A condição de reabertura é numérica, não subjetiva: o critério de pronto do F1 pede dois organizadores além do dono por 30 dias, e o do F2 pede dez.

### RN-527 · o radar não declara índice novo, e o motivo é um defeito já pago (nova · 2026-08-09)

Zero índice composto novo e zero `fieldOverride` novo. A varredura do expurgo ordena por identificador de documento, servida pelo índice automático que o Firestore mantém sozinho, porque a data em `YYYY-MM-DD` ordena igual ao calendário. A lista de instâncias é collection group sem filtro, que também dispensa declaração.

A proibição existe porque um `fieldOverride` declarando apenas escopo de collection group **substitui** a política automática do campo em vez de somar a ela, apagando os índices de coleção. Toda query de coleção sobre aquele campo passa a falhar no deploy seguinte, com a causa separada do efeito por quanto tempo se quiser. Se um requisito futuro pedir filtro em collection group, a regra é declarar os três escopos juntos e acrescentar a linha ao teste de contrato na mesma tarefa, nunca depois.

### RN-528 · entrega ao menos uma vez, aplicação idempotente, ordem por sequência (nova · 2026-08-09)

Cada requisição carrega uma sequência monótona por instância e vira um documento de livro-razão criado dentro da mesma transação dos efeitos. Sequência maior aplica e avança a marca d'água; sequência igual é retentativa depois de confirmação perdida e responde sucesso sem aplicar; sequência menor é carga velha fora de ordem e é ignorada.

A ordenação vem da sequência, e não do carimbo de tempo, de propósito: comparar por relógio obrigaria a confiar no relógio de uma máquina doméstica, que desvia. Cada dia é gravado por substituição total no documento cujo identificador é a própria data, e o servidor compara campo a campo antes de escrever, deixando `atualizadoEm` intocado quando nada muda. É assim que a idempotência vira coisa observável em teste, em vez de promessa.

### RN-529 · o chip é dedicado, é do organizador, e ele paga (nova, dona · 2026-08-09)

Decisão do dono: quem paga o número é o organizador, para ter um chip próprio dedicado ao radar. O número existe só para observar as comunidades daquele organizador, nunca é usado para conversa pessoal e nunca é compartilhado entre organizadores.

A consequência boa é o raio de explosão: um banimento derruba um radar, não a feature inteira. A consequência cara é operacional, um chip e um processo por organizador, e ela está tratada na S2004.

---

## Vizinhos

[[ponte-radar-whatsapp]] para o contrato normativo da ponte. [[LEELA-E05-clubs]] para a comunidade dentro da Leela. [[LEELA-E11-analytics]] para a disciplina de agregado mantido por Function. [[runbook-expurgo-lgpd]] para o mecanismo de expurgo que este épico reusa.
