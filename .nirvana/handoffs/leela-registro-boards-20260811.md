# Handoff · REGISTRO-BOARDS — a leva 6 vira registro

**Trace:** `leela-redesign-v2-20260810` · **Lane:** REGISTRO-BOARDS · **Data:** 2026-08-11, noite
**Fonte da verdade:** `leela-specs/02-rodadas/2026-08-11-decisoes-dono/03-leva6-tarde.md` (leva 6 +
adendo da noite)
**Território:** só `leela-specs/`. Nenhum arquivo de código tocado. `git commit --only` por
arquivo-tema, cinco commits, todos com push.

## O que a lane fez

| # | Commit | O que entrou |
|---|---|---|
| 1 | `83ba4774` | painel de decisões: 11 blocos decididos saem, parágrafo de troca no cabeçalho, conta 25 → 14, CANONE-1 ganha a linha "Em uma frase" |
| 2 | `7b433604` | E12: RN-560 e RN-561, RN-470 revogada e marcada, índice de RNs refeito, delta da rodada |
| 3 | `031a8251` | E16: os cinco vetáveis fechados e as ondas 2/3/5 destravadas; ADMINSEP-3 registrado; E09 e E11: TICKET-1 ratificado |
| 4 | `b6c16f41` | kanban e BOARD-EPICOS refletindo a leva inteira |
| 5 | `fe5c153a` | VISAO-DE-PROJETO: refresh completo do estado da noite |

## A conta do painel, antes → depois

**25 → 14.** Contada à mão contra as duas seções, antes e depois, e a contagem bateu com o previsto
pela ordem operacional (com o adendo do SERV-3 somando o décimo primeiro).

- Antes: 22 em "Decisões que dependem de você" + 3 em "Ações que só você pode executar".
- Depois: 12 + 2.

**Os onze removidos:** CKPIX-1 · CKENDERECO-1 · SERV-3 · SEMKIT-1 · SEMKIT-2 · ADMINVISAO-1 ·
ADMINVISAO-2 · ADMINVISAO-3 · ADMINVISAO-4 · ADMINVISAO-5 (as dez primeiras da seção de decisões) ·
ADMINSEP-3 (da seção de ações).

**Os catorze que ficam:** LGPD-1, ESTOURO-2, 12 (domínio público), PB-11, ARENA-1, ARENA-4, CRM-1,
CRM-2, CRM-3, CRM-4, ADMIN-USUARIOS-2, CANONE-1 · e as ações 69 (conferência visual) e JUROS-1.

## As RNs novas

Índice conferido antes de escrever: a faixa livre anunciada era 560, e o grep de `RN-560` a
`RN-563` sobre o corpus fora do índice devolveu **zero definições** (as quatro ocorrências são prosa
de rodadas anteriores descrevendo as próprias varreduras). **Próxima livre agora: 562.** Conta do
índice: 290 → 292.

| RN | O que diz | Épico dono |
|---|---|---|
| **RN-560** | o desfecho do pagamento chega à tela sozinho, nos quatro ramos; **revoga a RN-470** | [[LEELA-E12-landing]] |
| **RN-561** | o endereço completo é exigido por segurança e cadastro, e a razão fica legível | [[LEELA-E12-landing]] |

A **RN-470 não foi apagada**: ficou legível e marcada no épico, com a citação do dono e o ponteiro
para a sucessora, no molde da RN-211 e da RN-416. Ela é o que ainda explica o comportamento do
código que está no ar enquanto a lane CKPIX-FLOW não subir.

**A RN-542 não nasce** — o V-3 foi respondido com "é o owner", que era a opção sem campo novo.

**O SERV-3 não consome número**: dá alcance à RN-495 que já existe, e derruba a recomendação de
"Serviço da plataforma" no super-admin.

## Decisões de maestro registradas nesta lane (todas vetáveis)

1. **Mecanismo do CPF no diretório (V-4).** A frase do dono responde *se* o CPF aparece, não *por
   onde*. Fica a saída do meio: callable auditado com registro de cada consulta, e a Rule de
   `pessoas` continua fechada. Abrir a Rule seria barato de construir e caro de defender.
2. **Letra (b) do V-5.** A frase do dono responde a letra (a). A (b) segue o default proposto em
   10/08 (RN-550), que já estava em vigor — e default em vigor não retém tarefa, então S1616-T2 e
   T3 destravam.
3. **Mecanismo de observar o pedido (RN-560).** Listener, polling ou outra coisa é decisão de
   engenharia e sai decidida com registro **dentro da lane CKPIX-FLOW**. Esta lane é de registro e
   não escolheu custo de infra sem medição.

## O que ficou nomeado para as próximas lanes

- **CKPIX-FLOW** — história S1246 no E12, três tarefas, card no backlog. Não espera ninguém.
- **ESTOURO-BUILD** — S322 e S323 no E04, priorizadas pelo princípio ratificado ("não podemos ter
  excedentes de ingressos jamais"). Só a S323-T7 fica retida pelo ESTOURO-2.
- **ADMIN-VISAO ondas 2, 3 e 5** — destravadas pelos vetos. ⚠️ A metade de PII da onda 5 continua
  olhando o **LGPD-1**, que segue aberto e ficou **maior** com o V-2 e o V-4: a ficha de cliente do
  painel master passa a mostrar contato e documento.
- **SERV3-RENOME** — destravado, com a tarefa T0 de re-inventariar as 34 frases antes de trocar
  qualquer uma (o inventário é de 09/08 e mira caminhos que o rename de Parcerias mudou).

## Gates desta lane

- **Wikilinks:** varredura sobre os dez arquivos tocados — todos os `[[...]]` resolvem para arquivo
  existente.
- **Contagem do painel:** refeita à mão sobre as seções, antes e depois. 22+3 → 12+2.
- **Faixa de RN:** grep imediatamente antes do commit, zero definições em 560-563.
- **Fatos:** cada afirmação nova rastreia à leva 6 ou a registro que já existia (fila de build de
  09/08, spec do estouro de 10/08, purga de 10/08, medição da Onda 1 de 11/08). Onde a frase do dono
  não alcançava, entrou default do maestro **declarado como tal**.
- **Números da VISAO-DE-PROJETO:** nenhum foi copiado da versão anterior. Cards, histórias e tarefas
  por épico foram recontados sobre o kanban de agora.

## O que esta lane não fez, de propósito

- Não tocou em código nem em `V1-CHECKLIST` (parou em 06/08 e a decisão de mantê-lo ou aposentá-lo
  continua sendo do dono — está anotada na VISAO-DE-PROJETO).
- Não subiu ao painel os seis vetos pequenos do redesign (frases de apoio cortadas, modalidades em
  duas fases, "Modalidades da comunidade", nome do épico de Marcas, H1 itálico, "Acessar painel
  profissional"). Todos rodam com default em vigor e nenhum segura tarefa.
- Não mexeu na emenda anti-conserto-de-volta da D-1008-R19: ela permanece como está, agora com o
  TICKET-1 ratificado por trás.

---

# Adendo · a leva 7, na mesma aterrissagem

O dono decidiu mais três itens depois da leva 6, e eles entraram na mesma lane. Fonte: as seções
"Leva 7" e o complemento no fim de `03-leva6-tarde.md`.

| # | Commit | O que entrou |
|---|---|---|
| 6 | `f6c5774c` | painel: LGPD-1, ESTOURO-2 e CANONE-1 saem; parágrafo de troca; conta 14 → 11; a fila de construção registra o seed do convite destravado |
| 7 | `24f4fee8` | E04 (RN-546 com o número), E00 (aceite no resgate + seed), E12 (materialHash no termo de saúde), E01 + governança + cânone + ondas (a diretriz de reuso) e a nota jurídica na rodada do radar |
| 8 | `d6d2bf94` | kanban, BOARD-EPICOS e VISAO-DE-PROJETO |

## A conta do painel: 14 → 11

Recontada à mão contra as seções: **9 decisões + 2 ações**. Bate com o previsto.

**Os três removidos:** LGPD-1 · ESTOURO-2 · CANONE-1.

**Os onze que ficam:** 12 (domínio público), PB-11, ARENA-1, ARENA-4, CRM-1, CRM-2, CRM-3, CRM-4,
ADMIN-USUARIOS-2 · e as ações 69 (conferência visual) e JUROS-1.

## O que cada decisão moveu

**LGPD-1** — *"o aceite é obrigatório, e registrado no banco."* Três das quatro frentes do item
fecham com a frase: o resgate passa a **recoletar** o aceite no overlay quando o registro falta
(primeira das três saídas; as outras duas ficam escritas como recusadas), o termo de saúde passa a
carimbar `materialHash` como o termo de uso, e a Arena já estava contratada na RN-472. **O seed do
primeiro convite de organizador DESTRAVOU** — era a única coisa retida por este item, e está
marcado no painel (fila de construção), no E00 e na `S1242-T7` do kanban. A quarta frente — a base
legal do nome real de participante de comunidade — **saiu do painel**: é dado de terceiro, não
aceite de organizador, e passou a morar em `02-rodadas/2026-08-09-radar-whatsapp/01-decisoes-dono.md`
com a condição de reabertura que já existia. O radar não ganha nem perde gate com isso (o risco foi
assumido pelo dono em 09/08).

**ESTOURO-2** — teto de **15 minutos**, não os 30 do default, e a expiração **devolve a pessoa à
página do evento**. A RN-546 sai da condição no E04 e ganha os três pontos do enunciado; o texto
condicionado de 10/08 fica legível abaixo, marcado, porque é ele que explica de onde vinha o 30. O
trabalho se divide: contador e liberação na **ESTOURO-BUILD**, tela da expiração na **CKPIX-FLOW**
(nova `S1246-T4`) — a expiração é ramo do pós-pagamento, mesma família da RN-560.

**CANONE-1** — opção 1, pela leitura do próprio dono. Virou **diretriz permanente** em
`04-engenharia/governanca-design.md`: peça que o DS não publica nasce nele, documentada e
padronizada, antes de ser usada — nunca inline, nunca refeita. As três razões dele ficaram
escritas (tokens, tempo, conformidade). O cânone perdeu os dois "⛔ sem cânone" (§5 e §6), a **Onda
0 Parte B destravou** no roadmap e no E01, e o gate ganhou destino para o `padrao-orfao`: a
contagem vira fila de trabalho em vez de licença. O complemento do dono no mesmo ato — *"é
primordial que nossa software forge utilize a prática de snippets e design system"* — está
registrado como diretriz de casa, um nível acima do projeto.

## Gates do adendo

- Contagem do painel refeita à mão: 9 + 2 = 11.
- Wikilinks: varredura sobre os doze arquivos tocados nas duas levas — todos resolvem.
- Nenhuma RN nova foi consumida nesta leva: a 546 já existia (condicionada) e passou a ter
  enunciado firme. **Próxima livre continua 562.**
- Nenhum enunciado apagado: o texto condicionado da RN-546 ficou marcado, como a RN-470 já estava.
