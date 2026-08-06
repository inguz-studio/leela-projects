# SEAL-0806 — o dia inteiro aterrissado nos boards, nos épicos, na fila e no painel

- **Lane:** SEAL-0806 · **Trace:** `leela-pixreal-diag-20260804`
- **Employee:** sf-cto (software-forge)
- **Território:** `leela-specs/` apenas. Zero linha de código, zero deploy.
- **Base:** `main` em `cb5922a7` (== `origin/main` no início e no fim)
- **Data:** 2026-08-06

---

## 1. O que este selo cobre

Tudo o que aconteceu depois do selo anterior (`a1117fdd` e `b77f4f4f`, manhã de 05/08) e não estava
registrado em lugar nenhum de `leela-specs/`: **treze lanes de construção, review e diagnóstico,
mais o deploy que subiu quase tudo, mais o processo de prontidão e o conserto da senha.**

A fonte de cada linha é o handoff da lane. Nenhuma afirmação deste selo é inferência: onde o
handoff não diz, este documento diz que não diz.

## 2. A distinção que o selo existia para acertar: o ar e o repositório

O deploy de 05/08 (`.nirvana/handoffs/leela-deploy-tudo-0805.md`) mudou o estado de metade dos
cards do board, e nenhum deles sabia disso. Corrigido em toda superfície.

**No ar desde 05/08 à noite**, com prova de servidor em cada passo:

| Alvo | Prova |
|---|---|
| Regras do Storage | ruleset `34131880-544c-4e67-9939-3c29d2594eba`, 13856 bytes, impressão digital idêntica ao arquivo |
| Functions | **21 de 21** — 3 criadas, 18 atualizadas, 97 no projeto, nenhuma fora do ar |
| Regras do Firestore | ruleset `4eabe733-d343-4f61-8378-0e20e07f29ef`, 165932 bytes, idêntico; o diff era **uma linha** |
| Landing | release `1785983098700000`, 2026-08-06T02:24:58Z |
| Painel | release `1785983161411000`, 2026-08-06T02:26:01Z — **o salto de 22 horas** |
| Índices | **sem deploy**: 18 compostos e 8 isenções, arquivo == servidor, zero diferença |

**Fora do ar:** `cb5922a7`, o conserto da redefinição de senha, posterior ao deploy e em review. É a
única frente do dia que não subiu, e o selo diz isso em cinco lugares diferentes de propósito.

**Construído e sem tela:** o motor do código de seis dígitos responde em produção (as três chamadas
passaram o smoke) e **nenhuma superfície o chama**.

## 3. O que marquei nos boards

### `V1-KANBAN.md`

**Oito cards novos em Feito**, todos no padrão épico → história → tarefa, com hash por tarefa:

| Card | História | Lanes |
|---|---|---|
| [E00/E12] o "esqueci minha senha" parou de morrer | **S038** (7 tarefas, 5 feitas) | DIAG-SENHA |
| [E00] a rodada inteira subiu ao ar | **S037** (8 tarefas, todas feitas) | DEPLOY-TUDO-0805 |
| [E01] a barra superior saiu, e o topo voltou a ter respiro | **S003** (4 tarefas, 3 feitas) | BUILD-SUPRIMIR-TOOLBAR → REV-PAINEL |
| [E04/E01] o ponto e a vírgula passaram a valer | **S319** (6 tarefas, 5 feitas) | FIX-PARSE-DINHEIRO → FIX-PARSE-MILHAR → REV-PARSE |
| [E04/E02] o alerta leva até os lotes, e o `undefined` saiu | **S320** (4 tarefas, todas feitas) | DIAG-PAINEL-LACUNAS |
| [E00/E03] o upload de imagem nunca funcionou, e agora funciona | **S036** (5 tarefas, 4 feitas) | DIAG-STORAGE-CAPA |
| [E00/E05/E16] os clubes voltaram a carregar | **S035** (5 tarefas, 4 feitas) | DIAG-CLUBES |
| [E01] abrir e fechar deixaram de ser o mesmo movimento | **S002** (5 tarefas, 4 feitas) | BUILD-MOTION → REV-MOTION → BUILD-MOTION-ASSIM |

Mais o card do **primeiro acesso do comprador (S1223)**, movido de Em execução para Feito: as três
tarefas estão pagas, incluindo a T3, que era passo de operação no Auth e **já estava feita sem
ninguém saber** — a DIAG-SENHA leu a configuração de produção e o endereço da landing está na lista
de domínios autorizados, com um controle positivo de 04/08 mostrando o link sendo gerado com ele.

**Nove cards existentes corrigidos**, quase todos por causa da mesma frase velha:

- o motor das duas portas (S1229/S1230): de "especificado, nada construído" para seis tarefas feitas
  e no ar, com a review antagonista registrada como tarefa própria;
- o editor de lote (S315): de "fora do ar" para no ar, com a **T5 fechada** pela S319;
- a conta do painel de plataforma (S032-T4), o reenvio de e-mail (S1227), a área do cliente (S1222),
  o login em overlay (S1232), o PDF do ingresso (S1214-T5), o código da compra (S1228), o feedback
  do pedido (S1225) e o alerta da vitrine: todos de "código no repositório, fora do ar" para no ar,
  cada um com a prova que o deploy produziu.

⚠️ Onde o card guardava um bloqueio que deixou de existir, o bloqueio saiu com a razão: a área do
cliente tinha a sequência obrigatória de índices como aviso, e ela foi cumprida sem esforço porque
arquivo e servidor já batiam.

### `V1-CHECKLIST.md`

Seção nova **RODADA 2026-08-05/06 · o dia inteiro, e a noite em que tudo subiu (SEAL-0806)**, com o
mapa lane → entrega → prova das dezenove lanes, a separação explícita entre o que está no ar e o
que não está, a lição de método e as três coisas que o dia devolveu sem card.

### `BOARD-EPICOS.md`

Data atualizada, um parágrafo novo em "onde estamos" com o fato do deploy, e as linhas do **E00**,
**E01**, **E04** e **E12** com o delta do dia.

## 4. Épicos tocados

Sete, todos com estado por tarefa e as diretrizes que as reviews produziram. **Nenhuma RN nova** —
a faixa em uso segue em **509**, conferida no índice.

| Épico | O que entrou |
|---|---|
| `LEELA-E00-fundacao-tecnica` | S035, S036, S037, S038, S039/S040; a nota de renumeração; as diretrizes da família "o que só a produção cobra" |
| `LEELA-E01-design-system` | S002 e S003; motion em par, foco por pilha, trava de rolagem contada, "encurtar duração nunca conserta corrida", controle dentro de controle |
| `LEELA-E03-operacao-evento` | a permissão de IAM e o bloco da terceira foto do kit; a ressalva de que a prova é de configuração, não de upload |
| `LEELA-E04-config-vendas` | estado por tarefa da S315, a S319 inteira e a S320; "campo de dinheiro nasce com vírgula" |
| `LEELA-E05-clubs` | o índice ausente e a lista vazia honesta em cima de consulta que nem rodou |
| `LEELA-E12-landing` | estado por tarefa da S1229/S1230, o desvio de desenho declarado, as diretrizes da review, e o que subiu ao ar desta frente |
| `LEELA-E16-plataforma-superadmin` | a lista de tenants filtrada, que quebra só quando o filtro é usado |

## 5. Painel do dono

**Dois itens novos de decisão:**

- **PARSE-1 · o campo de dinheiro não diz como o sistema lê o ponto, e treze das dezoito mensagens
  não têm como aparecer.** Os cinco textos de tela que a REV-PARSE devolveu, com o principal
  primeiro: a régua do ponto e da vírgula, que hoje mora só num cabeçalho de arquivo de código
  enquanto a decisão já está valendo em produção. Inclui a troca de tipo de campo que destrava as
  outras mensagens.
- **RESPIRO-1 · os vinte pixels de respiro do topo são calibragem, e o olho é seu.** Se `/eventos` e
  `/crm` ficarem altos ou baixos ao lado da tela inicial, é uma linha em duas molduras.

**Um item registrado como decisão do CTO humano, não do dono**, na fila de construção, ao lado da
pendência de borda que já estava lá:

- **o gancho de incidente existe e do outro lado não há ninguém.** Zero políticas de alerta, zero
  métricas de log, zero canais de notificação no projeto de produção, medido pela DIAG-SENHA. O
  formato do log é estável e está pronto para ser casado; falha nova continua invisível até alguém
  abrir o log. Custo de infraestrutura recorrente, e a regra permanente da casa manda rotear isso ao
  sócio.

**Fechado:** nada além do **KITLOTE-1**, que a SPEC-SEM-KIT já tinha fechado em 05/08. A varredura
conferiu item a item e nenhum outro foi respondido nem perdeu objeto.

**Corrigido por estar velho:** o cabeçalho do painel ganhou a data do deploy como chave de leitura;
o item **69** (conferência visual) passou a dizer que a tela de lotes está no ar; o **CLUBES-1**
deixou de dizer que a aba está fora do ar; o **DEPLOY-1** ganhou a medição do que subiu e do que
continua fechado — as telas subiram, a máquina de convite não, e das três functions só uma existe
no código; o **SENHA-1** ganhou o registro do incidente de 05/08 e da causa-raiz, com a proibição
explícita de desligar a proteção de enumeração como saída fácil.

**Contagem final:** **50 decisões · 9 ações só dele · 1 hipótese de campo · 12 na fila de
construção.** O que espera resposta dele são as **60** primeiras; da fila, duas linhas são do CTO
humano e o resto não pede nada dele.

## 6. Fila técnica

Sete itens novos em `02-rodadas/2026-08-04-pos-pagamento/04-fila-codigo.md`, seção
"Fila técnica das reviews de 05/08 e 06/08". Nenhum pede juízo do dono.

| # | O quê |
|---|---|
| RS1-21 | `SolicitarRepasseModal` é campo numérico do navegador e o handoff do parser dizia que não |
| RS1-22 | `automacaoForm` afirma no comentário que o core acusa, e o core salva 24h calado |
| RS1-23 | `TermsEditor`, `RetencaoEditor` e `politicaForm` **são** dinheiro e ficaram fora do conserto; campo apagado grava taxa de 0% |
| RS1-24 | o componente `Toolbar` órfão no design system e sete variáveis de layout sem consumidor |
| RS1-25 | o parser de dinheiro deixa vazar zero negativo e o irmão dele defende contra isso |
| RS1-26 | a tela de upload repassa a mensagem crua do provedor, que é ambígua por construção |
| RS1-27 | o runner do painel resolve o design system pelo artefato buildado, e o lint da landing não cobre `test/` |

**Atualizado, não duplicado:** o **RS1-10** (`pnpm-workspace.yaml`) foi promovido de ruído a conserto
com dono pedido — três reversões à mão no mesmo dia, e o arquivo que ele suja é o que descreve o
workspace, então quando suja o install quebra para todo mundo.

**Apontado, não duplicado:** ligar a conferência de prontidão à esteira já é a **S040** no Backlog.

## 7. Duas colisões de identificador corrigidas, três nomeadas

| ID | Situação | O que fiz |
|---|---|---|
| `S033` | `Criar conta na Leela` (SPEC-QUALIFICACAO, 04/08, Backlog) **e** `A conferência de prontidão` (SPEC-PROCESSO-DEPLOY, 06/08, Feito) | a nova virou **S039** |
| `S034` | `Painel Profissional na superfície` (04/08, Backlog) **e** `A prontidão na esteira` (06/08, Backlog) | a nova virou **S040** |
| `S1221` | `A régua de venda passa a ser uma só` (VITRINE-FIX, Feito) **e** `Login como overlay` (Em execução) | a segunda virou **S1232** |
| `S1214`, `S1222`, `S1223` | colisões anteriores a esta rodada, com metade já em Feito há semanas | **nomeadas e não mexidas** — renumerar entrada de histórico quebra referência em épico e em relatório por ganho cosmético |

## 8. A lição de método do dia

**Medição exata com conclusão errada**, e a REV-PAINEL formulou melhor do que qualquer resumo:
*as afirmações de medição do construtor estavam exatas; o que falhou foi a conclusão tirada delas.*

Aconteceu duas vezes, nas duas frentes de painel. Na barra superior, os 89 pixels estavam contados
token a token e o argumento que dispensou recompor o espaço é verdadeiro para toda rota de
plataforma — só nunca foi conferido contra as áreas que não abrem com cabeçalho de página. Em
lotes, a prévia viva da capacidade funcionava, e foi ligada na tela onde o campo está desabilitado
exatamente quando a queixa do dono existe.

O padrão é o mesmo: o número certo, o raciocínio válido, e uma premissa que ninguém enunciou. **A
defesa não é medir melhor; é perguntar contra o que a medição foi conferida.**

## 9. Gates

Lane de spec: não há suíte a rodar. O que confiro é a integridade do registro.

| Gate | Resultado |
|---|---|
| Território | ✅ `git status` devolve **só** `leela-specs/` mais este handoff; `functions/` intocado |
| `--amend` / `stash` | ✅ nenhum; commit por `git commit --only` com caminhos explícitos |
| Handoff de lane alheia staged (`...-REV-5B.md`) | ✅ preservado staged e intocado, fora do commit |
| Colisão de identificador | ✅ zero pares vivos com conteúdo divergente entre Backlog e Em execução |
| Frase velha de deploy | ✅ varredura por "fora do ar" devolve só o card da senha, que **está** fora do ar, mais quatro usos com outro sentido em cards históricos |
| RN nova | ✅ nenhuma; faixa em uso segue **509**, conferida no índice |
| Faixa de história | ✅ `S002`, `S003`, `S035` a `S040`, `S319`, `S320` e `S1232` conferidas livres antes de usar |

## 10. O que este selo não faz

- **Não conserta código.** Sete tarefas ficaram marcadas como abertas e sem dono; elas viram fila,
  não commit.
- **Não deploya.** O `cb5922a7` continua fora do ar, e é o maestro que sequencia.
- **Não roda a conferência visual.** As telas que mudaram estão listadas no item 69 e no RESPIRO-1;
  quem olha é o dono.
- **Não decide as três colisões antigas.** Nomeadas, com a razão de ficarem como estão.
