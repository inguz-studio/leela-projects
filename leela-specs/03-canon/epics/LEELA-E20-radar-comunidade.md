# LEELA-E20 · Radar da comunidade no WhatsApp

- **Superfície:** Painel
- **Horizonte:** H2 (piloto convidado)
- **MoSCoW:** Should
- **Estimativa:** L
- **Status:** 📋 spec escrita 09/08, reparada no mesmo dia depois da review antagonista (trace `3ed45e7f`); F0.a despachável; **F1 destravado** pela decisão 12 do dono, que assumiu o risco jurídico
- **Depende de:** LEELA-E05 (clubs — a comunidade é o clube), LEELA-E11 (convenção de agregado mantido por Function). O LGPD-1 **deixou de ser dependência bloqueante** em 09/08 (decisão 12): a quarta frente dele segue correndo com o advogado, em paralelo, sem gate sobre este épico
- **De-para:** novo (sem BH- direto). Fonte técnica: estudo `arquitetura-radar-leela.md`, trace `c5a4a8bd-e9e4-4759-869c-a70f874c9c52`; decisões do dono em `02-rodadas/2026-08-09-radar-whatsapp/01-decisoes-dono.md`; review antagonista da spec, trace `3ed45e7f-73ee-460e-9f93-270f06b6c09c` (25 achados)

## Objetivo

O organizador mantém a comunidade dos participantes no WhatsApp e não tem retrato nenhum dela dentro da Leela. Este épico entrega esse retrato no Painel Profissional: volume de conversa por dia, mapa de horários, palavras mais faladas, entradas e saídas de membro, e a pirâmide de engajamento com o nome de quem fala. O dado nasce fora, num número dedicado que observa os grupos daquele organizador, e chega ao painel já agregado.

O radar não envia nada. Nunca. Nenhuma mensagem, nenhuma resposta, nenhum aviso automático em grupo, e nenhuma ponte entre o ranking e a tela de comunicação. Mensagem bruta, telefone e identificador de WhatsApp também não sobem: eles morrem na máquina que roda o motor, que é a máquina do organizador (RN-530). O que atravessa a fronteira são números e o nome que o WhatsApp entrega — o `notify_name` que o próprio participante mostra na comunidade, até ele virar cliente e o cadastro passar a mandar (RN-532).

## Personas & JTBD

- **Persona primária:** Profissional — Organizadora (**Marina Castelo**).
- **Persona secundária:** Coordenador de Assessoria (**Felipe Martins**), quando a comunidade é do clube.
- **JTBD atendidos, e a história que fecha cada um:**

| Job | O que o organizador quer trocar | História que fecha |
|---|---|---|
| a. Compreender a própria base | trocar sensação por evidência sobre volume, horário, entrada e saída de gente | **S2005** |
| b. Descobrir demandas | escolher o assunto da próxima experiência sem rolar mil mensagens | **S2006**, com o limite honesto declarado lá |
| c. Reconhecer quem sustenta a comunidade | saber pelo nome quem carrega o grupo | **S2003** |
| c′. Saber quais deles são clientes | parar de casar duas listas na memória | **S2008**, conciliação pela mão do admin |
| d. Gerir as comunidades | ver qual está esfriando antes de ela morrer | **S2007**, a frota |

Antes desta rodada, quatro dessas cinco linhas não tinham história nenhuma, e a coluna da direita ficava vazia enquanto o dado já estava contratado na ponte. Nenhuma das histórias novas coleta dado novo: todas leem o que a S2002 já publica.

- **JTBD explicitamente não atendido:** falar com a comunidade a partir do radar. Disparo continua sendo E06 e a área de comunicação do clube, por dentro da Leela.

## Critérios de sucesso do épico

- O organizador abre `/clubes/:slug/radar` e reconhece a própria comunidade nos números, com os oito estados de tela cobertos (sem instância, sem pareamento, sem grupo, sem dado no período, sincronismo atrasado, dia parcial, cobertura desconhecida, radar pausado).
- A tela entrega os quatro blocos de conteúdo, e não só o ranking: volume por dia, mapa de horários, palavras e saldo de entradas e saídas. Uma tela que renderize apenas a pirâmide não fecha este épico.
- Nenhuma superfície do produto oferece envio a partir do radar; a varredura de código não acha caminho do ranking para qualquer canal de saída, e a prova é comportamental: zero job de envio na instância ao fim da medição.
- Um tenant nunca lê o ramo do outro, provado por teste dirigido de rules e pela recusa de ingestão com tenant divergente.
- Republicar o mesmo lote não muda `atualizadoEm`: a idempotência é observável, não presumida.
- O expurgo roda com carimbo por grupo, no mesmo formato de incidente do expurgo de saúde, sem criar uma segunda política de alerta.
- Zero índice composto novo e zero `fieldOverride` novo em `firestore.indexes.json`.

## Por que épico novo, e não extensão do E11

Li os dois antes de decidir. O E11 é analytics do próprio negócio da Leela: ele agrega o que a plataforma já registrou (inscrições, receita, membros, conversão) num rollup mantido por Function, e a tela dele mora hoje em CRM › Visão geral. Tudo o que ele toca é dado de dentro.

O radar tem outra natureza em quatro eixos, e cada um deles sozinho já pediria arquivo próprio. A **fonte é externa e não oficial**, com risco permanente de o número ser banido, o que nenhuma métrica do E11 carrega. O **ciclo de vida é por fase com portão de sobrevivência**: F0.a decide se o produto continua existindo antes de qualquer linha de código na Leela. A **frente jurídica é dele**, entrou como quarta frente do LGPD-1 em 09/08 e trava o F1 inteiro. E a **superfície é a rota do clube**, não a área de CRM.

Pendurar isso no E11 misturaria um épico gelado de rollup interno com um produto que tem motor de terceiro, chip, banimento e advogado no caminho. O E11 continua sendo dependência conceitual, porque o radar copia a disciplina dele (agregado mantido por Function, nunca cálculo no cliente, nunca dado individual sem regra explícita), e nada mais.

## Regras de negócio aplicáveis

Definidas aqui: RN-520 a RN-529 e RN-530 a RN-536 (seção "Regras de negócio novas" adiante). Herdadas:

- **Governança de agregados (E11)** — número que a tela mostra vem de documento mantido por Function; o cliente nunca calcula ranking.
- **Mecanismo de expurgo da RN-147** — o radar reusa o **mecanismo** de expurgo criado para o dado de saúde, **sem herdar a base legal nem o prazo dela**. A RN-147 trata de dado sensível de saúde (LGPD Art. 11): ela exige consentimento específico e destacado e amarra a retenção ao ciclo do evento. O radar não tem esse consentimento, não pode obtê-lo e guarda 400 dias (RN-524). Herdar o enunciado inteiro importaria uma base legal e um prazo que contradizem este épico.

**O que este épico não herda, e precisa dizer em voz alta.** A rodada anterior escreveu que o radar "cai do lado de dentro" da fronteira da RN-172. Não cai, e a review provou pelos dois eixos. A RN-172 ancora a base legal em legítimo interesse **sobre a base transacional própria**, e participante de grupo que nunca comprou não tem transação nem contrato para ancorar; e a minimização dela é uma lista fechada de seis atributos (nome, nº de eventos, valor/LTV, sexo, idade, aniversário), enquanto o radar acrescenta contagem de mensagens, horário e posição em ranking sobre as mesmas pessoas. A frente jurídica ia receber uma premissa errada.

O radar cria uma **categoria nova**: agregado nominal de não-cliente. Ela não é o agregado sem identidade do [[LEELA-E11-analytics]], que declara dado individual de atleta fora de escopo por LGPD; não é a identidade transacional do [[LEELA-E19-crm]], que só constrói perfil de quem comprou e chama de incidente qualquer segmento que inclua quem nunca comprou; e vai na direção contrária da **RN-167** do [[LEELA-E17-perfil-social]], que fixou opt-in com padrão negativo para exibir participação de terceiro pelo nome. A categoria, a exceção e a fronteira contra o CRM estão na **RN-531**.

## Modelo de dados tocado

Contrato normativo completo em [[ponte-radar-whatsapp]]. Coleções novas, todas sob `tenants/`:

- `tenants/{tenantId}/radarInstancias/{instanciaId}` — registro da instância e marca d'água do sincronismo.
- `tenants/{tenantId}/radarInstancias/{instanciaId}/entregas/{publishSeq}` — livro-razão de entrega.
- `tenants/{tenantId}/radarGrupos/{grupoHash}` — o grupo observado, com `clubeSlug` opcional ligando ao clube.
- `tenants/{tenantId}/radarGrupos/{grupoHash}/dias/{YYYY-MM-DD}` — o que é aditivo.
- `tenants/{tenantId}/radarGrupos/{grupoHash}/janelas/{7d|30d|90d}` — os rankings, substituídos por inteiro.
- `tenants/{tenantId}/radarFrota/{7d|30d|90d}` — comparação entre grupos do mesmo organizador.
- `tenants/{tenantId}/radarVinculos/{participanteHash}` — o que o admin decidiu sobre aquele participante: nome corrigido à mão e vínculo com alguém do cadastro. É o único documento do conjunto que nasce de gesto humano, e mesmo assim quem escreve é a Function (RN-532, RN-533).

Nada mora sob `clubes/`: o catch-all de subcoleção de clube está fechado por decisão declarada, e furá-lo por conveniência de caminho seria reabrir o que já foi fechado.

## Fora de escopo (Won't nesta fase)

- Qualquer envio, resposta, automação de mensagem ou botão que leve do radar a um canal de saída (RN-520).
- Telefone, identificador de WhatsApp, texto de mensagem, mídia e transcrição na nuvem (RN-523).
- QR de pareamento dentro do painel (fica no fluxo operado fora, até F2).
- **Resumo de conversa gerado por modelo, ainda que na máquina local.** O fork tem a capability `whatsapp.groups.intelligence`, que resume grupo e detecta oportunidade, e ela serviria o job de demandas melhor do que contagem de palavra. Fica fora porque resumo é derivado do texto, e a RN-523 quer o texto morrendo na origem: subir resumo é subir conteúdo de conversa com outro nome. A escolha é registrada aqui em vez de tomada por omissão, e reabre por decisão nova do dono, que é quem pode aceitar o risco de conteúdo agregado subir.
- Provedor terceiro de API não oficial hospedando o motor: entregaria o texto integral das conversas a um terceiro, o que contradiz o princípio central do desenho.
- Índice composto novo ou `fieldOverride` novo (RN-527).

---

## User stories

### LEELA-S2001 · O número sobrevive antes de existir produto (F0.a)

**Como** dono do produto, **quero** provar que um chip dedicado consegue ficar mudo dentro de uma comunidade real por duas semanas, **para** não construir uma feature em cima de um número que vai ser banido.

- **MoSCoW:** Must · **Estimativa:** S · **Superfície:** nenhuma (operação fora da Leela) · **RNs:** RN-520, RN-525, RN-526, RN-529

**Critérios de aceite (Given/When/Then):**
- **Dado** um chip dedicado pareado como instância do motor, **quando** ele entra na comunidade de teste, **então** nenhuma mensagem é publicada no grupo e o perfil do contato aparece como "Radar · [nome da experiência]" com a descrição de que ele só conta e nunca envia.
- **Dado** a configuração da instância, **quando** a conferência da RN-520 roda, **então** `superadmin.enabled` é falso com a tabela `superadmins` vazia, `followups`, `funnels` e o gancho de voz estão desligados, o grupo observado está em `analyze` e nenhum JID está em `respond`.
- **Dado** o fim dos 14 dias, **quando** conto os jobs de envio da instância, **então** o resultado é zero. Esta é a prova que vale: ela diz o que aconteceu, e não o que estava configurado.
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
2. Modo padrão de observação; a comunidade de teste entra na allowlist em modo de análise, porque o cálculo do radar exige `analyze` e não roda em `observe`.
3. Rodar a conferência da RN-520 sobre a configuração da instância, item a item, e guardar a saída.
4. Consertar o `config.yaml` do fork onde o comentário e o valor discordam: o bloco de superadmin diz "MASTER SWITCH: nasce OFF" e entrega `enabled: true`. Corrigir o valor, e o comentário junto se ele continuar impreciso.
5. Desligar `auto_update` pelos 14 dias e anotar a versão do Baileys que ficou congelada.
6. Nomear o perfil do contato como "Radar · [nome da experiência]" com a descrição de transparência passiva.

**Regras de negócio a respeitar**
- RN-520, RN-525, RN-529, RN-530.

**Critérios de aceite (testáveis)**
- **Dado** a configuração pronta, **quando** rodo a conferência da RN-520, **então** os cinco itens dela passam e a saída fica anexada ao laudo.
- **Dado** o `config.yaml` da instância, **quando** leio o bloco de superadmin, **então** comentário e valor dizem a mesma coisa.
- **Dado** o início da medição, **quando** olho a configuração de atualização, **então** `auto_update.enabled` é falso e a versão do Baileys está registrada.

**Fora de escopo**
- Qualquer escrita na nuvem da Leela.

#### LEELA-S2001-T2 · Operar 14 dias e registrar o laudo de sobrevivência
- **Tipo:** test · **Depende de:** S2001-T1 · **Bloqueia:** S2002 inteira · **Estimativa:** S

**Objetivo**
Medir a sobrevivência do número e a utilidade do dado antes de autorizar construção na Leela.

**Passos de implementação**
1. Rodar o cálculo do radar sobre o espelho local e ler o resultado só no painel local do motor.
2. Registrar diariamente o tempo conectado do listener.
3. Anotar toda desconexão com o código de status que o motor já grava em `last_disconnect`, para separar queda de rede de banimento.
4. Fechar o laudo com o veredito do dono sobre a utilidade dos números.

**Critérios de aceite (testáveis)**
- **Dado** o fim dos 14 dias, **quando** somo o tempo conectado, **então** ele é de pelo menos 95% e o laudo registra o número exato.
- **Dado** o laudo, **quando** ele é lido, **então** traz a versão congelada do Baileys, a contagem de jobs de envio (que tem de ser zero) e a lista de desconexões com código de status.
- **Dado** o laudo aprovado, **quando** a S2002 for despachada, **então** ela cita o laudo como pré-requisito pago.

**Por que a atualização automática fica congelada.** O `auto_update` do fork vem ligado, no canal `latest`, aplicando patch, rc e minor sozinho às 04h, com um circuito de rollback que dispara depois de três falhas de conexão em trinta minutos. Regressão de update e banimento produzem o mesmo sintoma — conexão que cai e não volta —, e este laudo é o portão que decide se o produto continua existindo. Medir sobrevivência com o alvo se atualizando sozinho contamina o resultado.

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

**Tasks:** LEELA-S2002-T1 a LEELA-S2002-T7. A T3 foi quebrada em duas nesta rodada: métricas por dia no motor (T3) e publicador (T7). A estimativa anterior estava ancorada numa lacuna declarada — "o campo `remetentes` não existe hoje, é trabalho novo, pequeno" — e a lista real do que falta no motor tem sete itens.

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
- **Dado** um payload com `nome` igual a `"+55 11 98888-7777"` ou a `"5511988887777"`, **quando** valido, **então** recebo recusa; com `"Maria"`, passa.
- **Dado** um payload sem `nome` e sem `cobertura`, **quando** valido, **então** ele passa, porque os dois são opcionais.

**Testes a escrever**
- unit: um caso por invariante, mais o caminho feliz de dias e de janelas.
- **contrato do grão do dia**, que é o teste que separa o caminho certo do plausível: fixture com três dias de 10, 20 e 30 mensagens publicado num lote só, e asserção de que `dias/D1.mensagens` é 10, `D2` é 20, `D3` é 30 e nenhum documento carrega 60.
- **contrato do fuso**: fixture com 10 mensagens às 22h de Brasília em 2026-08-09 e nada em qualquer outro horário. O documento gravado é `dias/2026-08-09`, com `mensagens` igual a 10 e `porHora[22]` igual a 10. Hoje esse fixture produziria dois documentos errados e um 422.
- **projeção com fuso diferente de zero**, a única condição em que `peak_hours` e `peak_hours_local` divergem e pegar o campo errado fica visível.

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

#### LEELA-S2002-T3 · Métricas por dia no motor, no fuso do organizador
- **Tipo:** integration · **Depende de:** T1 · **Bloqueia:** T7 · **Estimativa:** L

**Objetivo**
Fazer o motor calcular por dia o que hoje ele só calcula por período, no fuso local, e criar a fonte da cobertura. Sem esta tarefa não existe lote de dias para publicar.

**Contexto & referências**
- Contrato: [[ponte-radar-whatsapp]] §"O dia é um recorte" e §"`cobertura` não tem fonte hoje".
- A tabela de correspondência do estudo (linha 334) mapeia totais de período e **não** serve para o item de dia. Ela vale para o item de janela.

**Arquivos (criar/editar)**
- Fora do monorepo, no fork: cálculo por dia, migration da tabela `connection_log`, ganchos nos dois ramos de `connection.update` e testes.

**Passos de implementação**
1. Recorte por dia no fuso local, em vez do `date(timestamp, 'unixepoch')` em UTC que existe hoje.
2. Mídias, links, entradas, saídas e participantes ativos por dia, que hoje só existem como total do período.
3. `diasAtivos` por participante na janela (RN-535).
4. `remetentes` por palavra.
5. Tabela `connection_log(instance_id, at, event)` alimentada nos dois ramos de conexão, mais a consulta que integra o tempo conectado por dia e produz `cobertura`.

**Regras de negócio a respeitar**
- RN-535 — o segundo eixo do engajamento nasce aqui.

**Critérios de aceite (testáveis)**
- **Dado** três dias com 10, 20 e 30 mensagens, **quando** peço o lote de dias, **então** cada dia traz o próprio número e nenhum traz 60.
- **Dado** 10 mensagens às 22h de Brasília, **quando** peço o dia, **então** elas contam no dia local e `porHora[22]` é 10.
- **Dado** uma conexão derrubada por 3h num dia sintético de 24h, **quando** calculo a cobertura, **então** ela fica entre 0,86 e 0,88.

#### LEELA-S2002-T7 · Publicador no motor: hash, fila local e sequência monótona
- **Tipo:** integration · **Depende de:** T1, T3 · **Estimativa:** M

**Objetivo**
Somar ao motor o publicador que mapeia o cálculo do radar para o payload, aplica o piso de frequência das palavras, mantém a fila e a sequência, e descarta na origem tudo que não pode subir.

**Arquivos (criar/editar)**
- Fora do monorepo, no fork: publicador, CLI e teste.

**Regras de negócio a respeitar**
- RN-523 — telefone, identificador e texto são descartados na origem, não filtrados no servidor.
- RN-521 e RN-532 — o nome sobe a partir de `notify_name`; o identificador que o gerou não sobe, e `display_name` não é usado.

**Critérios de aceite (testáveis)**
- **Dado** um cálculo de janela, **quando** publico, **então** o payload não contém campo **nem valor** com forma de telefone, provado por asserção sobre o JSON serializado com os três casos da ponte.
- **Dado** um participante sem contato conhecido, **quando** publico, **então** o `nome` sai ausente e o lote continua válido.
- **Dado** o objeto do motor com `peak_hours` e `peak_hours_local`, **quando** projeto `porHora`, **então** o valor vem do campo com fuso aplicado, provado por fixture com fuso diferente de zero.

#### LEELA-S2002-T4 · Rules das sete coleções, com escrita fechada para todo cliente
- **Tipo:** integration · **Depende de:** T2 · **Estimativa:** S

**Arquivos (criar/editar)**
- `firestore.rules` — um match dedicado por coleção, nunca catch-all.

**Regras de negócio a respeitar**
- RN-522 — leitura por `isTenantWriter(tenantId)` ou administrador de plataforma; escrita `if false` para todo cliente.

**Critérios de aceite (testáveis)**
- **Dado** um administrador de plataforma, **quando** ele tenta escrever em qualquer coleção do radar, **então** a rule nega. Matches compõem por OR, então `allow write: if isPlatformAdmin()` reabriria escrita de cliente e está proibido.
- **Dado** o organizador dono do tenant, **quando** ele tenta escrever em `radarVinculos` direto do cliente, **então** a rule nega: a correção de nome e o vínculo passam pela Function da S2008, mesmo sendo gesto dele.

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
- Os oito estados, o cuidado visual e os gates de design, que são da S2003.
- Qualquer elemento que leve à tela de comunicação.

---

### LEELA-S2003 · O radar vira tela de verdade no Painel Profissional (F1)

**Como** organizadora, **quero** a tela do radar com os estados honestos e a lista de quem mais falou, pelo nome, **para** reconhecer quem carrega a minha comunidade.

- **MoSCoW:** Should · **Estimativa:** L · **Superfície:** Painel · **RNs:** RN-521, RN-524, RN-525, RN-526, RN-531, RN-532, RN-535
- **Status:** ✅ **destravada em 09/08 pela decisão 12 do dono.** O LGPD-1 deixou de ser gate: o dono assumiu o risco jurídico agora, com condição de reabertura registrada na rodada. O termo do organizador continua existindo como camada de transparência da RN-525, e não como portão do advogado.

**Critérios de aceite (Given/When/Then):**
- **Dado** um tenant sem termo aceito, **quando** alguém tenta ligar o radar dele, **então** a ativação é recusada. O termo é do produto, e deixa de depender de parecer.
- **Dado** uma instância sem pareamento, **quando** abro a tela, **então** vejo a instrução de pareamento e nenhum botão que envie coisa alguma.
- **Dado** `ultimoContatoEm` acima de 26 horas, **quando** abro, **então** uma faixa de aviso mostra a data do último dia coberto.
- **Dado** um dia com `cobertura` presente e abaixo de 0,9, **quando** o gráfico renderiza, **então** aquele ponto é marcado como parcial.
- **Dado** um dia sem `cobertura`, **quando** o gráfico renderiza, **então** o ponto aparece como cobertura desconhecida, e nunca como dia cheio.
- **Dado** o ranking, **quando** ele renderiza, **então** cada linha mostra o nome do participante, o total de mensagens e os dias ativos, o título diz "quem mais falou no período" e nenhuma linha oferece caminho para mensagem, ligação ou comunicado.
- **Dado** um participante sem nome, **quando** a linha renderiza, **então** ela aparece com rótulo próprio e a ação de nomear ao lado, em vez de linha em branco.
- **Dado** um documento de dia com mais de 400 dias, **quando** o expurgo roda de madrugada, **então** ele é apagado e o grupo recebe carimbo de expurgo.

**Tasks:** LEELA-S2003-T1 a LEELA-S2003-T4.

#### LEELA-S2003-T1 · Termo do organizador como pré-condição de ligar o radar
- **Tipo:** api/function · **Depende de:** S2002-T2 · **Estimativa:** S

**Objetivo**
Registrar o aceite com versão, finalidade, impressão digital do texto e hora de servidor, e recusar ativação de instância sem esse registro.

**Regras de negócio a respeitar**
- RN-521 — o nome real só é exibido onde há aceite registrado do organizador.
- RN-531 — o termo declara a finalidade e a categoria de dado, e é onde a decisão do dono aparece para quem assina.

**Critérios de aceite (testáveis)**
- **Dado** um tenant sem aceite registrado, **quando** alguém tenta ativar a instância, **então** a ativação é recusada com motivo próprio.
- **Dado** o parecer do advogado quando ele chegar, **quando** ele mudar a finalidade ou a base legal, **então** o termo ganha versão nova e o aceite anterior não vale para a versão nova.

#### LEELA-S2003-T2 · Tela completa com os oito estados
- **Tipo:** screen · **Depende de:** S2002-T6, S2003-T1 · **Estimativa:** L

**Contexto & referências**
- Ordem de gate da casa: crítica de design com veto do UX antes do gate de fidelidade; JTBD declarado no brief.
- Os quatro blocos de conteúdo têm história e critério próprios: S2005 (o tempo), S2006 (as palavras), S2007 (a frota) e o ranking, que é desta história. Esta tarefa monta a casca, os oito estados e o ranking; os blocos entram por elas.

**Arquivos (criar/editar)**
- `apps/painel/src/routes/clubes/ClubesRoutes.tsx` e o arquivo da sub-navegação do contexto de clube, que ganha o item do radar **condicionado ao tenant ter radar ligado** — a RN-526 proíbe o radar aparecer para quem não foi convidado, e um sétimo item fixo na SubNav vazaria a existência dele para todo mundo.

**Fora de escopo**
- Conexão com a área de comunicação, em qualquer forma (RN-520).

**Divergência de grafia, registrada.** O [[LEELA-E05-clubs]] grafa a área como `/clubs/[slug]` e declara a sub-navegação fechada em seis abas; este épico usa `/clubes/:slug`, que é a grafia do painel em produção (`apps/painel/src/routes/clubes/`). O radar segue a grafia do painel. Reconciliar a grafia do E05 com o código é trabalho do E05, e fica anotado no card do board: dois documentos canônicos discordando sobre a rota da mesma área já custou caro na casa quando o catálogo de menu divergiu, e aquilo foi resolvido na fonte, não por filtro no consumidor.

#### LEELA-S2003-T3 · Cron `expurgarRadar` em três camadas, reusando o incidente de expurgo
- **Tipo:** api/function · **Depende de:** S2002-T2 · **Estimativa:** M

**Objetivo**
Apagar dia vencido às 03h25 no fuso de São Paulo, com núcleo puro de relógio injetado, camada do meio que registra incidente e relança, e o agendador por cima.

**Regras de negócio a respeitar**
- RN-524 — 400 dias corridos nos documentos diários.
- RN-534 — o expurgo não olha o estado do clube: clube fora do ar mantém o radar.
- RN-536 — janela e frota sem republicação há mais de 120 dias são apagadas.
- O campo de alerta continua sendo o do expurgo de LGPD, para não nascer uma segunda política de alerta. O que muda é o tipo e o nome do evento de log.

**Critérios de aceite (testáveis)**
- **Dado** um grupo já carimbado, **quando** o expurgo roda, **então** ele ainda sonda um documento, porque dia novo pode ter chegado depois do último carimbo.
- **Dado** um clube com soft-delete e radar ligado, **quando** o expurgo roda, **então** os documentos do radar continuam lá e continuam alcançáveis pela lista de radares do tenant.
- **Dado** uma janela sem republicação há 121 dias, **quando** o expurgo roda, **então** ela é apagada.

#### LEELA-S2003-T4 · Poda do texto local depois que o agregado sobe
- **Tipo:** integration · **Depende de:** S2002-T7 · **Estimativa:** S

**Regras de negócio a respeitar**
- RN-524 — 90 dias de texto no espelho local, apagado só depois de o agregado daquele dia estar publicado e confirmado.

**Critérios de aceite (testáveis)**
- **Dado** um dia cujo agregado ainda não subiu, **quando** a poda roda, **então** o texto daquele dia permanece.

---

#### LEELA-S2003-T5 · Função de exclusão de participante pelo lado da nuvem
- **Tipo:** api/function · **Depende de:** S2002-T2 · **Estimativa:** S

**Objetivo**
Dar ao organizador e à operação um caminho de esquecimento que não dependa da máquina do organizador estar viva.

**Regras de negócio a respeitar**
- RN-536 — o caminho da nuvem e o caminho local são independentes.

**Critérios de aceite (testáveis)**
- **Dado** uma janela publicada com três participantes, **quando** a instância é desligada e a exclusão de um deles é chamada, **então** o documento já não contém aquele `hash` nem aquele `nome`, e o mesmo vale para a frota e para `radarVinculos`.
- **Dado** um pedido de exclusão, **quando** ele é atendido, **então** fica carimbado com quem pediu e quando.

---

### LEELA-S2005 · O pulso da comunidade no tempo (F1)

**Como** organizadora, **quero** ver o volume de conversa por dia, os horários em que a comunidade fala e o entra e sai de gente, **para** entender a base que eu tenho em vez de sentir que entendo.

- **MoSCoW:** Should · **Estimativa:** M · **Superfície:** Painel · **RNs:** RN-524, RN-527, RN-535
- **Depende de:** S2002-T3 (as métricas por dia), S2003-T2 (a casca da tela)
- **Lê apenas dado já contratado:** `dias.{mensagens, porHora, entradas, saidas, membrosFim, participantesAtivos, cobertura}`. Nenhuma coleta nova.

**Critérios de aceite (Given/When/Then):**
- **Dado** 30 dias com dado, **quando** abro a tela, **então** vejo o volume de mensagens por dia, com os dias parciais marcados e os dias de cobertura desconhecida marcados de outro jeito.
- **Dado** o mesmo período, **quando** olho o mapa de horários, **então** vejo hora do dia por dia da semana, no fuso do organizador, e a faixa de pico é legível sem eu contar nada.
- **Dado** o mesmo período, **quando** olho o bloco de gente, **então** vejo entradas, saídas, o saldo e o tamanho do grupo ao longo do tempo.
- **Dado** um período sem nenhuma mensagem, **quando** abro, **então** cada bloco mostra o próprio vazio e diz desde quando não há dado, em vez de gráfico em branco.

**Tasks:** S2005-T1 (blocos de tempo e horário), S2005-T2 (bloco de entra e sai), cada um com o estado vazio próprio.

**O limite honesto.** Este bloco mostra o que aconteceu, não por quê. Uma queda de volume pode ser comunidade esfriando ou listener desconectado, e é por isso que a cobertura aparece junto do gráfico, e não numa tela de diagnóstico à parte.

---

### LEELA-S2006 · O que a comunidade fala (F1)

**Como** organizadora, **quero** ver as palavras mais faladas e por quanta gente diferente, **para** escolher o assunto da próxima experiência com evidência em vez de palpite.

- **MoSCoW:** Should · **Estimativa:** S · **Superfície:** Painel · **RNs:** RN-523, RN-527
- **Depende de:** S2002-T3 (`remetentes` por palavra), S2003-T2
- **Lê apenas dado já contratado:** `janelas.palavras[{palavra, n, remetentes}]`. Nenhuma coleta nova.

**Critérios de aceite (Given/When/Then):**
- **Dado** uma janela com dado, **quando** abro o bloco, **então** vejo as 15 palavras mais faladas, cada uma com quantas vezes apareceu e por quantas pessoas distintas.
- **Dado** duas palavras com a mesma contagem, **quando** a lista ordena, **então** a de mais remetentes vem antes, porque assunto espalhado vale mais do que assunto de uma pessoa só.
- **Dado** um período abaixo do piso de frequência, **quando** abro, **então** o bloco diz que não houve palavra recorrente, em vez de mostrar ruído.

**O limite honesto, e ele fica escrito na própria tela.** Frequência de palavra é **assunto**, não demanda. Uma lista com "treino", "prova" e "camiseta" não separa elogio de reclamação, e o organizador que ler isso como pedido da comunidade vai errar. O `remetentes` ajuda a distinguir assunto espalhado de assunto de um, e é o melhor que este desenho entrega.

A alternativa mais forte existe e foi recusada por escrito: o fork tem uma capability de resumo de grupo que serviria melhor o job, e ela está na seção "Fora de escopo" do épico, com o motivo — resumo é derivado do texto, e o texto morre na origem por RN-523. Reabre por decisão do dono.

---

### LEELA-S2007 · Comparar as minhas comunidades (F1)

**Como** organizadora com mais de um grupo, **quero** comparar as minhas comunidades lado a lado, **para** perceber qual está esfriando antes de ela morrer.

- **MoSCoW:** Should · **Estimativa:** M · **Superfície:** Painel · **RNs:** RN-522, RN-527, RN-535
- **Depende de:** S2002-T4 (rules da frota), S2003-T2
- **Lê apenas dado já contratado:** `radarFrota/{7d|30d|90d}`, mais `dias.entradas` e `dias.saidas` por grupo. Nenhuma coleta nova.

**Por que esta história existe.** A frota já estava no modelo de dados, no payload, nas rules e no motor, e não tinha história, critério de aceite nem tela: era código nascendo sem dono, e pagava custo em quatro camadas para ninguém ler. Ela também é o único elo que o job de gerir a comunidade tinha.

**Critérios de aceite (Given/When/Then):**
- **Dado** um organizador com três grupos, **quando** abro a comparação, **então** vejo os três com volume, gente ativa e saldo de entradas e saídas na mesma janela.
- **Dado** um grupo cujo volume caiu contra a janela anterior, **quando** a comparação renderiza, **então** a queda é visível sem eu abrir grupo por grupo.
- **Dado** um grupo com saldo de saídas negativo em duas janelas seguidas, **quando** abro, **então** ele aparece destacado, porque debandada é o sinal que chega tarde demais quando ninguém olha.
- **Dado** um organizador com um grupo só, **quando** abro, **então** o bloco não aparece, em vez de aparecer vazio.

---

### LEELA-S2008 · Conciliar participante e cliente, pela mão do admin (F1)

**Como** organizadora, **quero** dizer que aquele participante do ranking é aquele membro do meu cadastro, **para** parar de casar duas listas de cabeça.

- **MoSCoW:** Should · **Estimativa:** M · **Superfície:** Painel · **RNs:** RN-531, RN-532, RN-533
- **Depende de:** S2003-T2

**Por que esta história existe.** A razão declarada do dono para pedir nome real foi identificar "usuários, clientes e membros mais engajados". A parte de clientes não fechava: o radar não coleta CPF, e-mail nem `atletaId`, que são as chaves do CRM, e não vai coletar. Sem conciliação, o épico entregava duas listas e devolvia ao organizador o trabalho manual que ele pagou para não fazer.

**Critérios de aceite (Given/When/Then):**
- **Dado** um participante do ranking, **quando** abro a ação de conciliar, **então** o painel sugere membros do cadastro daquele clube por semelhança de nome, e eu confirmo ou recuso.
- **Dado** um vínculo confirmado, **quando** o ranking renderiza depois, **então** aquela linha mostra o nome do cadastro, e não mais o do WhatsApp.
- **Dado** um participante com nome ausente ou irreconhecível, **quando** uso a edição manual, **então** o nome que eu digito vence a próxima publicação do motor.
- **Dado** um vínculo desfeito, **quando** o ranking renderiza, **então** a linha volta ao nome que vem do WhatsApp.
- **Dado** qualquer caminho do CRM, **quando** ele executa, **então** ele não lê documento do radar; e nenhum caminho do radar lê a base do CRM. O gate `FronteiraPII.test.ts` ganha esse caso nos dois sentidos.

**Fora de escopo**
- Sugestão automática aceita sozinha: o vínculo é sempre ato confirmado por gente.
- Qualquer escrita no CRM. O vínculo mora do lado do radar e não cria perfil de ninguém.
- Conciliação por telefone, que resolveria em um passo e está proibida pela RN-523.

---

### LEELA-S2004 · Multi-locação e autoatendimento (F2)

**Como** operação da Leela, **quero** rodar dez radares sem uma máquina por organizador, **para** que o produto saia do piloto convidado.

- **MoSCoW:** Could · **Estimativa:** XL · **Superfície:** Painel · **RNs:** RN-522, RN-526, RN-529, RN-530
- **Depende de:** F1 estável; veto do sócio sobre custo recorrente de hospedagem; **reavaliação declarada da RN-530**, porque host operado pela Leela põe o texto integral das conversas de todas as comunidades e o sal de cada organizador dentro da nossa infraestrutura, invertendo a promessa central do épico. Essa reavaliação reabre a frente jurídica, e é pré-condição, não consequência.

**Critérios de aceite (Given/When/Then):**
- **Dado** dez organizadores ativos, **quando** um teste dirigido tenta cruzar dados entre eles, **então** nenhum vazamento acontece em nenhuma camada.
- **Dado** uma instância caída, **quando** a supervisão roda, **então** a detecção acontece em menos de uma hora.
- **Dado** um organizador novo, **quando** ele é convidado, **então** o pareamento acontece fora do painel e o sal dele nasce só na máquina que roda a instância.

**Tasks:** LEELA-S2004-T1 (host multi-instância e supervisão), LEELA-S2004-T2 (registro de instância por tenant e rotação de sal), LEELA-S2004-T3 (política de alerta de verdade, hoje a lacuna aberta do expurgo de saúde).

---

## Ordem sugerida

`S2001 (sobrevivência) → S2002 (ponte no emulador) → S2003 (tela, ranking e expurgo) → S2005, S2006, S2007 e S2008 (o conteúdo da tela, em paralelo) → S2004 (multi-locação)`.

A S2001 é portão de produto e a única que pode começar hoje. A S2002 é despachável assim que a S2001 fechar verde. A S2003 **deixou de esperar o advogado** em 09/08 (decisão 12) e agora depende só da S2002; dentro dela, a S2002-T3 é a tarefa que destrava tudo, porque sem métricas por dia não existe lote de dias para publicar. As quatro histórias de conteúdo dependem da casca da S2003-T2 e podem correr em paralelo entre si.

Os identificadores não seguem a ordem de leitura: a S2004 é do F2 e fecha o arquivo, enquanto S2005 a S2008 nasceram na rodada de reparo de 09/08 e são do F1.

---

## Regras de negócio novas (rodada 2026-08-09 · radar de WhatsApp)

A faixa 515 estava anunciada como livre no índice, e não estava: as rodadas de 08/08 consumiram 515, 517, 518 e 519. Esta rodada começa na **520**. O 516 é buraco por lane concorrente, da mesma família do 483-485, e não marcador de faixa como o 460 e o 499 — a classificação está assim no índice e a versão anterior deste épico a contava errado. A rodada de reparo de 09/08 consome **530 a 536**, conferida contra o índice antes de usar.

### RN-520 · o radar é mudo por contrato, e a mudez se prova por comportamento (nova · 2026-08-09 · reparada 09/08)

Nenhuma superfície do produto, do motor ou do painel oferece envio a partir do radar. No painel, o ranking não tem botão de mensagem, de ligação nem de comunicado, e a tela do radar não se conecta à área de comunicação do clube, que é sua vizinha de rota.

Do lado do motor, a regra anterior dizia que a capacidade de resposta seria "ausente da configuração, não desligada por bandeira". A intenção estava certa e o enunciado era impossível de provar: o binário do fork é um sistema completo, que sabe enviar mensagem, tem fila de jobs de envio, followups, funis e um caminho de superadmin por WhatsApp. Uma varredura por capacidade de envio nesse binário nunca devolve zero, então o critério ou reprovava sempre ou era reinterpretado em silêncio por quem executasse, que é a pior das duas saídas.

O que a regra exige, na forma conferível:

- **Configuração da instância do radar**, checada antes de cada rodada: `superadmin.enabled == false` e tabela `superadmins` vazia; `followups.enabled == false`; `voice.whatsapp_followup == false`; `funnels.enabled == false`; o grupo observado em `analyze` e nenhum JID em `respond`.
- **Comportamento**, que é a prova que vale: `count(*)` de jobs de envio igual a zero ao fim do período medido. Configuração diz o que estava ligado; a fila diz o que aconteceu.

Um detalhe do fork precisa de conserto antes de a S2001 fechar: o `config.yaml` entregue traz o comentário "MASTER SWITCH: nasce OFF" logo acima de `superadmin.enabled: true`. Um dos dois está mentindo, e enquanto estiver assim a mudez do número depende de ninguém inserir uma linha na tabela `superadmins`.

A proibição é de adjacência, e vale dizer por quê. O produto se posiciona hoje como o jeito de avisar os participantes sem depender do WhatsApp, e a primeira ponte entre um ranking de engajamento e um botão de enviar é o começo do caminho contrário. Se um dia essa ponte existir, ela nasce de decisão nova e declarada do dono, nunca de proximidade de tela.

### RN-521 · o ranking mostra o nome real do participante, e o telefone nunca sobe (nova, dona · 2026-08-09 · reparada 09/08)

Decisão do dono, sem retoque, de 09/08: nível de identidade sem pseudônimo, nome real, porque o job do organizador é enxergar a pirâmide de engajamento e reconhecer quem são os clientes e membros mais engajados. O que sobe é o nome que o WhatsApp entrega, com a origem e a correção fixadas na RN-532. O telefone, o identificador de WhatsApp e o texto do que foi dito são proibidos pela **RN-523**, que é a dona desse enunciado — esta regra não o repete, para as duas não derivarem em silêncio como aconteceu com a RN-133 e a RN-312.

A continuidade da pessoa entre períodos segue vindo do hash com sal do organizador, que é a chave estável: nome muda, chave não. O nome viaja ao lado dela como rótulo, com tamanho limitado pelo schema.

**Divergência registrada.** O estudo recomendava pseudônimo estável como padrão e colocava nome vindo do WhatsApp fora de escopo. O dono decidiu diferente, com razão de produto declarada, e a consequência foi assumida por escrito: dado pessoal de participante exposto a terceiro, sem consentimento direto de quem foi medido. Isso vai na direção contrária da RN-167 do [[LEELA-E17-perfil-social]], que fixou opt-in com padrão negativo para exibir participação de terceiro pelo nome, e a exceção do radar está declarada na RN-531 com o motivo: audiência restrita ao organizador, que é quem administra aquela comunidade, e não perfil público.

**O que mudou em 09/08.** A dependência jurídica **deixou de ser bloqueante** pela decisão 12 do dono, que assumiu o risco agora. A quarta frente do LGPD-1 continua existindo e vai ao advogado em paralelo, e a pergunta que ela leva mudou de forma: com o radar mudo (RN-520) e sem aviso no grupo (RN-525), consentimento do participante é estruturalmente impossível de coletar, então a pergunta certa não é "como pedir consentimento" e sim qual base legal cobre medir e nomear alguém que nunca contratou nada com o organizador, num canal que o organizador não controla. O parecer, quando sair, é condição de reabertura de tudo isto.

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

Convidar não é só liberar a tela. Cada organizador do piloto entra com **máquina identificada, responsável nomeado e runbook de instalação escrito** — sem isso, os dois organizadores do F1 significam dois computadores fora do alcance da Leela guardando o texto das conversas de duas comunidades, sem ninguém declarado por eles (RN-530).

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

## Regras de negócio novas (rodada de reparo 2026-08-09 · pós-review antagonista)

Sete regras nascidas dos achados da review `3ed45e7f` e das quatro decisões do dono do mesmo dia. A faixa 530 foi conferida no índice antes de usar, como o próprio índice recomenda.

### RN-530 · a máquina que roda o motor é do organizador, e trocar isso reabre a frente jurídica (nova · 2026-08-09)

A instância do motor roda em máquina do organizador. Ele é o controlador do texto bruto das conversas e do sal que gera os hashes, e nenhum dos dois entra na infraestrutura da Leela.

A regra existe porque a promessa central do épico — "mensagem bruta, telefone e identificador morrem na máquina que roda o motor" — só é promessa enquanto a máquina não for da Leela. No F2, com host multi-instância operado por nós, o texto integral das conversas de todas as comunidades e o sal de cada organizador passariam a morar aqui, e a frase viraria o oposto do que está escrita sem que nenhuma regra registrasse a virada. Por isso a S2004 não herda esta regra calada: ela tem, como pré-condição declarada, reavaliar a RN-530 e reabrir a frente jurídica.

No F1, a consequência é operacional e está na RN-526: máquina identificada, responsável nomeado, runbook escrito, por organizador. O custo recorrente de hospedagem do F2 segue como decisão do sócio, fora deste épico.

### RN-531 · agregado nominal de não-cliente é categoria própria, e a fronteira com o CRM é dura (nova, dona · 2026-08-09)

O radar cria uma categoria de dado que o produto não tinha: **agregado nominal de não-cliente**. Nome de pessoa, com atributo comportamental (quantas mensagens, em que horário, em que posição do ranking), sobre gente que pode nunca ter comprado nada.

Ela não se encaixa em nenhuma das três fronteiras vizinhas, e a distinção precisa estar escrita para o advogado não receber premissa errada:

- **[[LEELA-E11-analytics]]** trabalha só com agregado sem identidade e declara métrica individual de atleta fora de escopo por LGPD.
- **[[LEELA-E19-crm]]** trabalha com identidade transacional, só de quem comprou, e chama de incidente de LGPD qualquer segmento que inclua quem nunca comprou.
- **RN-167** do [[LEELA-E17-perfil-social]] fixou opt-in com padrão negativo para exibir participação de terceiro pelo nome.

O radar abre exceção declarada a esse padrão, por decisão 9 do dono, com dois limites: a audiência é o organizador daquela comunidade, nunca perfil público, e o dado é de gestão da comunidade dele. A base legal está **aberta** — o dono assumiu o risco em 09/08 (decisão 12) e o advogado responde depois.

A fronteira contra o CRM é executável, não retórica: **nenhum caminho do CRM lê documento do radar, e nenhum caminho do radar lê a base do CRM.** O único ponto de contato é o vínculo manual da RN-533, que grava identificador do lado do radar e não devolve nada para o CRM. O gate de PII que o E19 já tem (`FronteiraPII.test.ts`, que reprova por adição) ganha o caso que prova essa separação nos dois sentidos.

### RN-532 · o nome do participante tem origem declarada, pode faltar, e o admin corrige (nova, dona · 2026-08-09)

Três coisas, nesta ordem de precedência:

1. **Enquanto a pessoa não é cliente**, o nome vem do WhatsApp — o `notify_name`, que é o que ela mostra na comunidade. Não é o `display_name`, que é o catálogo local da máquina do organizador e por isso pode trazer o apelido que ele mesmo digitou anos atrás.
2. **O admin pode corrigir o nome à mão**, participante a participante, na superfície do radar. A correção fica em `radarVinculos` e vence qualquer publicação seguinte do motor. É a saída para nome ausente, apelido irreconhecível e nome com cara de telefone.
3. **Quando a pessoa vira cliente e é conciliada** (RN-533), o cadastro da Leela passa a mandar e o nome do WhatsApp vira histórico.

`nome` ausente é estado previsto, não erro: no motor ele é `string | null`, porque sai de um `LEFT JOIN`. O lote não é recusado por causa disso, e a tela mostra a linha com rótulo próprio de participante sem nome, com a ação de nomear ao lado. Nome com forma de telefone é recusado na borda (contrato da ponte), porque `nome` é a única string livre que atravessa e o schema fechado confere chave, não valor.

### RN-533 · o vínculo entre participante e cliente é ato do admin, e nada sobe do motor para fazê-lo (nova · 2026-08-09)

O organizador contratou o radar para saber quem sustenta a comunidade **e** quais dessas pessoas são clientes dele. A segunda metade não fecha sozinha: a chave de identidade do CRM é CPF, com queda para e-mail e `atletaId`, e o radar não coleta nenhuma das três — telefone e identificador de WhatsApp são proibidos pela RN-523, o hash tem sal local e nome de exibição não é chave.

Então o vínculo é humano e explícito. O painel sugere candidatos do cadastro do clube para um participante do ranking, comparando nome, e **o admin confirma**. O que fica guardado é o identificador do lado da Leela dentro de `radarVinculos`, no ramo do próprio tenant. Nenhum dado novo sobe do motor por causa disso, nenhum perfil é criado no CRM e o participante não conciliado continua existindo no radar como sempre existiu.

Sem esta regra, o épico entregava duas listas e a tarefa de casar na memória, que é justamente o trabalho que o organizador pagou para não fazer.

### RN-534 · clube fora do ar não apaga o radar, e o radar não fica inalcançável (nova · 2026-08-09)

Os documentos do radar moram sob `tenants/`, então a deleção de clube não os alcança. Sem regra, um clube deletado levaria o `clubeSlug` junto e deixaria `radarGrupos` órfão: nome de grupo, nomes de participantes e 400 dias de contagem correndo atrás de uma rota que responde 404.

A decisão do dono de 09/08 sobre clube excluído é reter a base, e ela vale aqui: **o radar sobrevive ao clube.** O expurgo não olha o estado do clube, o `clubeSlug` fica gravado como histórico e o acesso passa a ser pela lista de radares do tenant, que não depende do clube existir. Dado retido e alcançável, ou nenhum dos dois.

Condição de reabertura: parecer do advogado que aponte prazo máximo de retenção para dado de participante, que é a mesma condição da RN-524.

### RN-535 · engajamento no radar é volume medido, com dois eixos, e o radar não afirma quem sustenta (nova · 2026-08-09)

O ranking ordena por `n`, que é contagem de mensagens por remetente no período, e nada além disso. Contagem bruta destaca quem fala mais, que não é a mesma pessoa que sustenta a comunidade: cinquenta reações curtas passam à frente de quem responde a dúvida de cada recém-chegado.

Duas consequências, e as duas são de spec, não de código:

- O contrato carrega um segundo eixo barato, que o motor já tem como calcular: `diasAtivos`, o número de dias distintos com pelo menos uma mensagem no período. Ele separa o constante do episódico, e a tela mostra os dois.
- A tela nomeia o que mostra. "Quem mais falou no período", com os dois números à vista, e a leitura de quem sustenta a comunidade continua sendo do organizador. Chamar a lista de pirâmide de engajamento sem dizer o que ela mede é vender interpretação como medida.

### RN-536 · esquecimento tem caminho pelo lado da nuvem, e janela parada expira (nova · 2026-08-09)

Esquecer um participante funciona nos dois lados, de forma independente:

- **Local:** o hash entra na lista de bloqueio da instância e a próxima publicação já sai sem ele.
- **Nuvem:** uma função de exclusão, chamada pelo organizador ou pela operação, remove o participante das janelas correntes, da frota e do `radarVinculos` pelo Admin SDK, e carimba o pedido.

O caminho da nuvem existe porque o local sozinho depende de duas coisas que podem não valer: a máquina viva e a próxima publicação acontecer. Instância morta ou radar abandonado congelava o nome dentro de documentos de janela, que são substituídos e nunca expiram, e a pessoa ficava dependendo de um computador doméstico voltar a ligar.

Pela mesma razão, **documento de janela ou de frota sem republicação há mais de 120 dias é apagado pelo expurgo**. A maior janela cobre 90 dias; uma parada de 120 descreve um período que já saiu inteiro do alcance do produto e só serve para guardar nome de gente.

---

## Vizinhos

[[ponte-radar-whatsapp]] para o contrato normativo da ponte. [[LEELA-E05-clubs]] para a comunidade dentro da Leela. [[LEELA-E11-analytics]] para a disciplina de agregado mantido por Function. [[runbook-expurgo-lgpd]] para o mecanismo de expurgo que este épico reusa.
