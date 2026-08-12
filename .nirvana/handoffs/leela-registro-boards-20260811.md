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
