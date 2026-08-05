# SPEC-CRM-ESTRATEGIA · o que o CRM pode mostrar, e o que vale a pena pedir

- **Trace:** `leela-pixreal-diag-20260804` · **Lane:** SPEC-CRM-ESTRATEGIA
- **Employee:** sf-ux-engineer (software-forge)
- **Território:** `leela-specs/` apenas. **Zero código.** Nenhum arquivo em `apps/`,
  `packages/`, `functions/`, `firestore.rules` ou `firestore.indexes.json` foi tocado.
- **Lanes em voo respeitadas:** `FIX-PARSE-MILHAR-RET` (`packages/core` + `apps/painel`) e
  `DIAG-CLUBES` (`firestore.indexes.json` + `packages/api-client`) — sem interseção.
  Commit por `--only` nos caminhos da lane; sem `--amend`, sem `stash`.

## O que a lane produziu

Rodada `leela-specs/02-rodadas/2026-08-05-crm-estrategia/`, três arquivos:

| Arquivo | O que carrega |
|---|---|
| `01-pergunta-do-dono.md` | verbatim, a leitura das duas metades da pergunta, os três achados que mudaram o que valia propor |
| `02-spec-crm-estrategia.md` | inventário medido, 10 visões por valor sobre custo, a frente de localização inteira, 8 recusas, a régua de honestidade, LGPD visão a visão, a escada de coleta |
| `03-fila-proposta.md` | 15 tarefas em 4 frentes, **inteira retida**, com critério de aceite e o grafo de dependência dos vetos |

Mais: quatro vetáveis em `leela-specs/01-produto/DECISOES-ABERTAS.md`, card com histórias e
tarefas em `leela-specs/00-boards/V1-KANBAN.md`, e duas notas de estado em
`leela-specs/03-canon/epics/LEELA-E19-crm.md` ao lado da premissa P-CKMOD-1.

**Nenhuma RN nasceu.** A instrução da lane e a disciplina da casa coincidem: regra nasce quando o
dono ratifica. O índice de RNs não foi tocado; a faixa livre continua a partir de 500.

## Os três achados que mudaram o desenho

**1. O e-mail de cada participante é pedido, obrigatório, e descartado.** O campo existe no
checkout (`StepDados.tsx:451-458`), no validador do cliente (`checkout/validacao.ts:37`), no
contrato de transporte (`packages/api-client/src/checkout.ts:117`), no payload
(`CheckoutFlow.tsx:1273`) e no validador do servidor (`packages/core/src/checkout/validarDados.ts:36`).
A Function monta `[reg]` com CPF, nascimento, gênero e telefone e não grava o e-mail
(`functions/src/checkout/createInscricaoCharge.ts:1669-1683`), porque `DadosPessoaisInscrito` não
tem o campo (`packages/core/src/eventos/dadosPessoais.ts:172-190`). Efeito colateral medido: a
chave de linking do CRM (`packages/core/src/crm/cliente.ts:93-106`) cai em `atletaId` para todo
participante que não comprou, e ele vira cliente novo a cada evento. Subiu como **CRM-3**.

**2. O código IBGE do município chega e é jogado fora.** `EnderecoLookup` declara quatro campos
(`apps/landing/.../checkout/cep.ts:82-86`) e o mapeamento aproveita quatro (`:137-145`). O ViaCEP
devolve `ibge` junto. Sem ele, contagem por cidade depende de casar texto digitado por gente — e o
lookup é fail-open por contrato (`:8-16`), então texto manual é caminho normal, não exceção.
Guardá-lo elimina a única parte cara da frente de localização. Tarefa `COL-T2`.

**3. A decisão que o dono acabou de fazer já estava reservada por escrito.** A premissa
**P-CKMOD-1** (`LEELA-E19-crm.md:130`) diz que endereço não entra no CRM e que incluí-lo *"exige
decisão explícita do Vitor registrada aqui"*. A pergunta de 05/08 é ela, dezoito dias depois. A
proposta não pede para revogá-la: separa endereço na ficha (segue proibido) de contagem agregada
por cidade (categoria diferente, molde de `demografia/current`, k=5). Subiu como **CRM-2**.

## As visões, resumidas

| # | Visão | Dado existe? | Custo | Bloqueio |
|---|---|---|---|---|
| V1 | de onde veio a venda (cupom, afiliado, direto, com comissão) | sim, inteiro | baixo | CRM-1 |
| V2 | distribuição geográfica | sim, inteiro | baixo a médio | **CRM-2** |
| V3 | quem pagou e não apareceu | derivação pura | baixo | CRM-1 |
| V4 | como o público paga | sim, inteiro | baixo | CRM-1 |
| V5 | novos e recorrentes | metade calculada | médio-baixo | CRM-1 |
| V6 | onde a compra parou (funil de carrinho) | sim, **não lido hoje** | médio | CRM-1 |
| V7 | ritmo de venda entre edições | sim, sem série | alto | rollup `S821-T1` |
| V8 | por que devolvem o dinheiro | motivo é texto livre | baixo após decisão | coleta nova |
| V9 | interesses da base | não | alto | ARENA-1/2/3 + jurídico |
| V10 | satisfação | não | médio | Brevo |

O funil da V6 é o achado de reuso: `carrinhos/{uid}_{eventoId}` com ciclos
(`functions/src/checkout/carrinhoCheckout.ts:58, 70, 214-218`) já registra intenção de compra, e
ninguém lê. **Não é conversão e não pode receber esse nome** — a casa já tem duas métricas
disputando o rótulo (RN-489 e a conversão por atribuição do E11).

## A frente de localização, em uma tela

Sai do dado cru, sem serviço externo: UF, cidade, bairro, região por faixa de CEP, concentração
acumulada do organizador e sugestão de ponto de retirada de kit. **Não sai:** distância até o
evento — e o bloqueio não é geocodificar o participante, é que o evento não tem destino.
`Evento.local` é string livre (`packages/core/src/eventos/evento.ts:119`) e não existe `latitude`,
`longitude` nem `GeoPoint` no repositório.

Por isso a frente inverte a ordem esperada: **`LOC-T1`, dar endereço estruturado ao evento, vem
antes de qualquer conversa sobre distância, e é a única tarefa da fila que não espera veto
nenhum** — ela vale sozinha por mapa na página pública, endereço certo no ingresso e busca por
proximidade na vitrine.

Régua aplicada: k=5 vale para geografia pela mesma razão do cohort
(`packages/core/src/analytics/cohortPrivacidade.ts:82`), cidade com menos de cinco compradores
entra em "outras", e cruzar geografia com demografia não é possível pela API do agregado — o
aceite exige um teste provando que os dois agregados não se juntam por chave nenhuma.

## O que foi recusado

Conversão de tráfego em qualquer forma (RN-489, mais o fecho da saída lateral: não trocar o
denominador por cliques); mapa com pino por participante; LTV preditivo e score de churn;
comparação com a média da plataforma (vaza informação comercial cross-tenant, e o isolamento está
dentro do HMAC de `agregarClientes.ts:125`); filtro demográfico ou geográfico na lista de Clientes
(reprovado por adição em `FronteiraPII.test.ts:100-108`); rótulo de cliente VIP; contagem de
visitante por IP; export CSV da base (`FronteiraPII.test.ts:110-114`).

## A régua de honestidade

Três estados por visão, nunca dois: tem dado, ainda não tem (e diz por quê), **não medimos** (e o
card não é renderizado). O molde já existe na casa (`AnaliseVendasView.tsx:178-186`).

Regra permanente proposta, a partir do defeito medido: **nenhum campo que a Function de produção
não escreve pode ser lido por uma tela.** Hoje a mesma linha do CRM
(`crm/visao-geral/_lib/desempenho.ts:40`) mostra `—` em produção e 42% no preview, porque o seed
injeta `taxaConversaoPct` (`preview-seed-extra.ts:1282`) num campo que `agregarFinanceiro.ts:305-319`
nunca grava. São quatro campos nessa condição: `taxaConversaoPct`, `receitaSemana`,
`ticketSparkline` e `receitaPorModalidade`.

Duas visões carregam guarda dura no aceite: **V3 não renderiza para evento sem nenhum check-in**
(senão diz "cem por cento de ausência" para quem não escaneou), e **V7 não entra antes do rollup
`S821-T1`** (senão nasce com o seletor de período inerte ao lado, e sob a armadilha estoque ×
fluxo do `LEELA-E11-analytics.md:341`).

## LGPD

Base legal de todas as visões agregadas: legítimo interesse sobre a base transacional própria
(P-E19-2 / RN-172), com a nota de revisitar antes do go-live intacta. Três pontos que não são
rotina, e estão escritos na spec §Parte 6:

- **A finalidade do endereço muda de escopo.** Foi coletado para entrega; planejar a próxima
  edição é finalidade adjacente e pede declaração no ato da coleta.
- **Saúde não entra no CRM em nenhuma forma, nem agregada.** Art. 11, consentimento específico,
  retenção própria de 90 dias e expurgo (`saudeInscrito.ts:1-33`). O valor é operacional, não é
  conhecimento de cliente.
- **A Arena Social, como está escrita, exclui o organizador.** A RN-472 nomeia *"export de
  organizador"* entre as finalidades vedadas. Interesses só chegam ao CRM se o **ARENA-1** for
  respondido pela terceira opção, e o campo sensível fica fora em qualquer cenário.

## Vetáveis que subiram ao painel

| Item | O que fica com o dono | Default proposto |
|---|---|---|
| **CRM-1** | quais visões entram na primeira leva | as quatro que saem de dado pronto: canal, geografia, presença, meio de pagamento |
| **CRM-2** | localização agregada, e endereço na ficha | agregado sim, ficha não (P-CKMOD-1 preservada para a ficha) |
| **CRM-3** | guardar o e-mail que já se pede a cada participante | guardar |
| **CRM-4** | o que se pede depois da compra, e em troca de quê | degraus 1 e 2 apenas; 3 e 4 esperam Arena e Brevo |

## Fronteiras declaradas, não resolvidas

- **P-IAMENU-1 segue aberto e despriorizado** (27/07). Quem vê o agregado vê a ficha nominal.
  Nenhuma visão nova piora isso, mas a geografia o torna mais visível — cidade e bairro
  identificam melhor que faixa etária.
- **POSSE-EMAIL-1 é pré-requisito silencioso do degrau 1:** guardar e-mail de participante que não
  comprou cria endereço no banco que ninguém verificou.
- **O inscrito fantasma** contamina qualquer contagem que não filtre status; as visões propostas
  contam pagante por construção (RN-486).
- **`computadoEm` no futuro do seed** continua dívida nomeada, e agora tem uma consequência a
  mais: visão nova que dependa dele herdaria o congelamento.

## Autoavaliação

| Critério | Nota | Evidência |
|---|---|---|
| correctness | 0.95 | toda afirmação sobre o repositório tem arquivo:linha; quatro varreduras independentes, com os dois achados de descarte confirmados na fonte e no consumidor |
| regression_safety | 1.00 | zero código tocado; nenhum teste podia quebrar, e nenhum quebrou |
| scope_discipline | 0.95 | proposta e vetáveis, sem RN e sem tarefa despachável; a única expansão foi a nota em E19, que é disciplina de épico da casa |
| handoff_artifact | 0.95 | arquivos, achados, recusas, vetáveis e fronteiras nomeados |

## O que a próxima lane precisa saber

Nada desta rodada é despachável. A fila inteira espera CRM-1 a CRM-4, com **uma exceção**:
`LOC-T1`, o endereço estruturado do evento, não depende de veto nenhum e vale mesmo que o dono
recuse a frente de localização por completo.
