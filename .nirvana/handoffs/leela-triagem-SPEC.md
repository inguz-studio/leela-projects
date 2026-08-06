# SPEC-TRIAGEM — os 60 itens do dono viram uma página de uma sentada

- **Lane:** SPEC-TRIAGEM · **Trace:** `leela-pixreal-diag-20260804`
- **Employee:** sf-cto (software-forge)
- **Território:** `leela-specs/` e mais nada
- **Base:** `main` em `5aa55777`
- **Data:** 2026-08-06

---

## 1. Por que a lane existiu

O dono disse "acabei me perdendo", e o selo de 06/08 contou 60 itens esperando
juízo dele: 50 decisões, 9 ações e 1 hipótese. Isso é acúmulo, não ritmo de
decisão. Cada review antagonista desta rodada devolveu de dois a cinco itens de
dono, e todos foram empilhados no mesmo lugar com o mesmo peso.

O deliverable é uma **vista de leitura** sobre o painel canônico, não um painel
novo.

## 2. O que aterrissou

**`leela-specs/01-produto/DECISOES-ABERTAS-TRIAGEM.md`** — página nova, 59 itens
em três blocos mais o ADMINSEP-3 no bloco de fechamento.

**`leela-specs/01-produto/DECISOES-ABERTAS.md`** — três linhas a mais no
cabeçalho, apontando para a vista e declarando que a fonte continua sendo o
painel.

### A regra que a lane respeitou

A casa tem **um** painel de decisões e já foi cobrada três vezes por duplicata.
A triagem:

- declara no topo, em negrito, que não é painel;
- não carrega item que o painel não tenha;
- não reescreve nenhuma decisão, opção ou default;
- não guarda resposta;
- devolve para o painel em toda linha, por wikilink com âncora de heading;
- diz por escrito que, se as duas divergirem, o painel manda.

Nenhum item foi criado, alterado ou removido no painel canônico.

## 3. A ordenação

Três blocos, e dentro de cada um a ordem é por **custo de errar**, não por data.
A data só aparece onde ela diz alguma coisa: há quanto tempo aquilo está parado.

| Bloco | Itens | Critério |
|---|---|---|
| 1 · Trava trabalho | 16 | impede código de ser escrito ou de subir hoje |
| 2 · Mexe em dinheiro ou em risco | 25 | muda valor cobrado ou repassado, expõe dado, ou é obrigação legal |
| 3 · Preferência | 18 | anda sozinho com o default; responder só melhora |
| Fechamento | 1 | ADMINSEP-3, ação dele que não é decisão |

Cada linha tem cinco coisas e nada mais: o ID, um título de uma linha, o default
em vigor dito como frase afirmativa, o que muda se ele responder outra coisa, e
o que está parado quando for o caso.

## 4. O bloco 1, com a evidência de retenção

Cada item deste bloco tem retenção **escrita numa fila do repositório**. Não foi
juízo meu sobre o que parece urgente.

| Item | O que está parado | Há | Onde a retenção está escrita |
|---|---|---|---|
| LGPD-1 | o seed do primeiro convite, e com ele toda entrada de organizador novo | 3 dias | `02-rodadas/2026-08-02-retomada/08-achados-dono-0803.md:320` |
| DEPLOY-1 | as três functions de convite (só uma existe no código); a porta de resgate em 404 provado | 3 dias | painel §DEPLOY-1 + `2026-08-04-qualificacao-profissional/03-fila-codigo.md:23` |
| CRM-3 · CRM-2 · CRM-4 · CRM-1 | a fila de CRM **inteira**, nada despachável | 1 dia | `2026-08-05-crm-estrategia/03-fila-proposta.md:10` |
| ARENA-1 · ARENA-3 · ARENA-2 | tarefas 3a e 3c da fila de pós-pagamento | 2 dias | `2026-08-04-pos-pagamento/04-fila-codigo.md:506` |
| SEMKIT-1 | tarefa 2b, o reparo dos dois kits em `leela-hub` | 1 dia | `2026-08-05-sem-kit/04-fila-codigo.md:100` |
| 12 (domínio) | substituição do marcador nos dois apps e nas specs, o CTA `contato@leela.app`, e o item 66 | 10 dias | painel §12 |
| 34 (compra real) | a prova do go-live; a função de cobrança segue com zero sucesso na história | 8 dias | painel §34 |
| SERV-3 | tarefas 4a, 4b e 4c — 34 strings em três aplicações | 1 dia | `2026-08-05-metricas-e-servico/04-fila-codigo.md:132` |
| CONV-1 | tarefa 4d | 1 dia | `2026-08-05-metricas-e-servico/04-fila-codigo.md:133` |
| 12b · QUALIF-6 | o lote ESTRANGEIRO-CHECKOUT, gated por ação externa | 18 dias | `2026-08-04-qualificacao-profissional/03-fila-codigo.md:181` |

**O que ficou de fora do bloco 1 de propósito, com a fila dizendo por quê:**
as filas de **lotes-ux** e de **modalidade-e-kit** declaram em letra "nada desta
fila está retido", e a fila de **contas-landing** declara "nenhuma gated". Então
ESTOURO-1, MODAL-1, MODAL-2, CONTA-1 e CONTA-2 são caros de errar e não param
nada — foram para os blocos 2 e 3.

## 5. Datas de nascimento, medidas no git

As datas do bloco de acúmulo não são estimativa. Vieram de `git log -S` sobre o
painel, com uma ressalva honesta: em 03/08 houve uma reescrita de títulos
(`7e2c58b4`, `62f15ddf`), então para os itens numéricos a busca pelo heading
devolve 03/08 e a busca pelo **conteúdo** devolve a data real. Usei a segunda.

| Item | Heading diz | Conteúdo diz | Usei |
|---|---|---|---|
| 11 · três segredos | 03/08 | 18/07 (`031ad0bb`, `BANK_DATA_KEY`) | 18/07 |
| HIP-R9-01 | 03/08 | 18/07 (`031ad0bb`) | 18/07 |
| 12b | 03/08 | 19/07 (`71c0df6a`) | 19/07 |
| 12 · domínio | 03/08 | 27/07 (`385ad3b6`) | 27/07 |
| 34 | 03/08 | 29/07 (`87b2ed8f`) | 29/07 |
| 66 | 03/08 | 02/08 (`13a3f007`) | 02/08 |

## 6. O critério de default permanente, e quem passa

**Critério, escrito na página:** vira decisão minha com default permanente quando
as três valem juntas — aberto há 8 dias ou mais; nada quebrou nem foi cobrado
nesse tempo; e a resposta não muda valor cobrado nem toca dado pessoal.

**Passam hoje (3 itens, 4 linhas do painel):**

- **12b + QUALIF-6** — 18 dias, adiado por ele em 26/07, paliativo de custo zero
  funcionando, lote sem nem contato com o gerente. Os dois saem juntos.
- **11 · os três segredos** — 19 dias, e o próprio item já diz "nada fica com
  você, a execução é da esteira". Está na lista de ações por herança da moldura
  "antes do primeiro deploy", que envelheceu. Vira tarefa minha.
- **HIP-R9-01** — 19 dias, default conservador em vigor, nada bloqueado.

Aprovado, o painel cai de **60 para 56**.

**Velhos que NÃO passam, e o motivo dito em voz alta:** item 12 (10 dias, falha
na 3ª condição — e-mail transacional saindo por Gmail cai em spam) e item 34
(8 dias, falha na 2ª — nada quebrou porque nada foi provado).

**Jovens demais e fortes no mérito:** CODPED-PODA-1 e PDF-SPINNER-1. Os dois já
dizem no próprio texto que nada empurra. Reavaliar na semana que vem sem
perguntar de novo.

## 7. Conferência da contagem

O selo dizia 50 decisões, 9 ações, 1 hipótese. **Bate exatamente.**

- `grep -c '^### '` no painel devolve **72**.
- 72 = 50 (§Decisões que dependem de você) + 9 (§Ações que só você pode
  executar) + 1 (§Hipótese a validar em campo) + 12 (§Fila de construção, que
  não é item de dono).
- A triagem tem **59** headings de item, e o ADMINSEP-3 vive no bloco de
  fechamento com link próprio: 59 + 1 = **60**.
- Verificação cruzada executada: os 60 headings do painel foram procurados
  literalmente na triagem, **zero faltantes**, e a varredura por âncora
  duplicada devolveu **zero duplicatas**.

Nenhum item duplicado no painel.

## 8. Uma ponta que este handoff registra e a página não carrega

`2026-08-04-pos-pagamento/04-fila-codigo.md:500` diz que "a convergência do
rerun para zero só pode ser provada depois do `--apply`, que é **ato do dono**".
Isso é ação operacional dele e **não tem item no painel canônico**. Não foi
acrescentado à triagem, porque a triagem é vista e não pode inventar item. Se
for de fato dele, o lugar de nascer é o painel, não esta página.

## 9. O que a lane não fez

- Não tocou em código, teste, fila ou épico.
- Não reordenou o painel canônico. A instrução era propor, não executar, se a
  conclusão fosse "a vista deveria ser o painel". A conclusão foi outra: a vista
  ganha por ser descartável — ela pode ser redesenhada a cada leva sem mexer no
  registro, e o painel continua sendo o lugar onde o verbatim mora.
- Não respondeu, ratificou nem presumiu nenhum item.
