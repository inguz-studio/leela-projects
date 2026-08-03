# Handoff · Lane SPEC-ACHADOS-0802 · trace leela-build-2d6ee98d

- **Employee:** `sf-cto` (software-forge) · DNA Fowler / DHH / Kleppmann
- **Escopo:** MINI-SPECS dos achados do dono da DEC-0802B — B1 (cálculo pronto ao chegar no
  pagamento), B2 (taxas discriminadas), B5 (parcelas a 2,89% a.m.), B6 (aceites migram para a
  inscrição) e B10 (página do produtor como mini rede social). **Zero código de aplicação.**
- **Território:** `leela-specs/**` + este handoff. Nada fora disso.
- **Repo:** `C:\dev\LEELA`, branch `main`. Commits `[LEELA-SPEC-ACHADOS-0802]`, `git commit --only`.
  **SEM push** (o maestro pusha).
- **Painel `DECISOES-ABERTAS.md`:** intocado (é do maestro).
- **Suítes e emulador:** não rodados — DUAS lanes de build detêm a árvore (KITCUPOM-BUILD em
  `apps/**`+`packages/**`, PIXFIX-EXTREF em `functions/**`).
- **Dono DORMINDO:** toda ambiguidade real vira pergunta de veto numerada aqui, com default
  profissional assumido e marcado vetável. Nada bloqueia em pergunta.

## Placar

| # | Task | Estado | Commit |
|---|---|---|---|
| T0 | Inventário + abertura do handoff | ✅ | `2ed18d1` |
| T1 | `04-spec-achados.md` — B1/B2/B5/B6 (D-ACH-1..14) | ✅ | (este) |
| T2 | `05-rns-achados.md` — RN-434..445 + o que o B6 supersede | ✅ | (este) |
| T3 | `06-spec-produtor-page.md` — B10 (D-ACH-15..21) | ✅ | (este) |
| T4 | `07-fila-achados.md` — 16 tasks, 5 frentes, 19 vetores ⚔ | ✅ | (este) |
| T5 | Selo · resumo executivo + self-score | ✅ | (este) |

## Autoridade de entrada lida

1. `leela-specs/02-rodadas/2026-08-02-retomada/03-achados-dono.md` — os 10 achados verbatim.
2. `leela-specs/02-rodadas/2026-08-02-retomada/01-decisoes.md` — D-0802-1 (vocabulário) e D-0802-2.
3. `leela-specs/02-rodadas/2026-07-29-checkout-ux/` inteira — formato de referência e fronteira.
4. `.nirvana/outputs/leela-build-2d6ee98d/INV-PIXINTERNAL-REPORT.md` — o lastro do B1.
5. `.nirvana/handoffs/leela-build-2d6ee98d-CKUX-REV.md` — o item 64 e as ressalvas R-2/R-3/R-5.

## Inventário antes de especificar (reaproveitado vs criado)

Leitura direta do checkout público (`CheckoutFlow.tsx` 1321 linhas, `StepResumo.tsx`,
`StepPagamento.tsx`, `SeletorForma.tsx`, `CheckoutStepper.tsx`, `StepModalidadeKit.tsx`) mais
quatro varreduras paralelas (taxa, parcelamento + aceites, página do produtor, numeração).

### Já existe e a spec REUSA

| Peça | Onde | O que a spec aproveita |
|---|---|---|
| Motor de parcelamento com juros | `packages/core/src/finance/calc.ts:73` (`buildInstallmentOptions`) | O laço, o teto `maxParcelas`, o corte por `parcelaMinima` e o `jurosAoMes` — **o motor já lê juros; está configurado em 0** |
| Config de juros no painel | `apps/painel/src/routes/plataforma/tenants/termos/TermsEditor.tsx:273-282` | Os três campos (`maxParcelas`, `jurosAoMes`, `parcelaMinima`) já editáveis — **nenhuma tela nova** |
| Taxa por meio (TAXAFLEX) | `packages/core/src/finance/taxaPlataforma.ts` (RN-178..183) | `resolverTaxaMeio`, `computeTaxaPlataforma`, a precedência override→global→legado e o congelamento |
| Total por opção de meio | `cotarInscricaoCheckout.ts:264-296` (`totaisPorMeio`, RN-180) | **Já é entregue pelo servidor**; só a condição de exibição muda |
| Coalescing da cotação | `CheckoutFlow.tsx:557-611` (T-CKUX-1) | Assinatura de preço, debounce de 200 ms e `cotacaoSeqRef` — o B1 só move o GATILHO |
| Carimbo da prova de aceite | `createInscricaoCharge.ts:1516-1545` | Versão + `materialHash` + `serverTimestamp` lidos na tx — **a migração do B6 não toca uma linha disto** |
| Bloco de aceites | `checkout/AceitesCompra.tsx` | Os dois checkboxes, os dois modais e os rótulos de versão mudam de ETAPA, não de conteúdo |
| Estado "total defasado" | `StepPagamento.tsx:108` + `CheckoutFlow.tsx:1262` (item 64) | O B1 encurta a espera e **não** substitui a guarda |
| Perfil público do produtor | `app/(public)/_perfil/PerfilView.tsx` + `lib/leitorPerfil.ts` | Hero, timeline de eventos, patrocinadores, clubs e o `getPublicPerfil` inteiro |
| Primitivo de aba | `packages/design-system/src/components/Tabs` | O menu secundário do B10 — **nenhum componente novo de DS** |
| Cascata de mock | `apps/landing/lib/mockImagem.ts` (`ehPreview`) | O Feed mockado do B10 pelo mesmo degrau que o kit já usa |

### Criado por esta spec (o que não existia)

- Gatilho de cotação na etapa de dados e o descarte de resposta obsoleta nos caminhos manuais de
  cupom (fecha a ressalva R-2 da CKUX-REV).
- Linha de taxa nomeada por meio, linha de "inclusa" no modo incorporada e linha própria de juros.
- Tabela Price real no lugar do composto simplificado, com parcela única sem juros.
- Terceiro aceite condicional (termo de saúde custom) e o envio da versão exibida.
- Endereço de origem e agente do navegador na prova de aceite.
- Menu secundário Feed/Eventos/Clubs e ícones de rede inferidos pela URL.

### Achados do inventário (entram nas specs, não são opinião)

1. **O motor de juros já existe e está desligado.** Simular 2,89% a.m. é dado, não código. O que
   pede código é o modelo: `calc.ts:83` faz `valor × (1+j)^n`, que **não é tabela Price** — com
   R$ 300 em 12x cobra R$ 422,03 onde Price cobra R$ 359,90 (17% a mais, contra o comprador).
2. **O laço começa em `n = 1` com fator `(1+j)`.** Ligar os juros faria a opção "À vista" do
   cartão nascer 2,89% acima do PIX, com o rótulo dizendo "à vista", e `totalAVista` passaria a
   divergir de `opcoesParcelamento[0].valorTotal` na mesma tela.
3. **Há uma decisão anterior de 3,49% a.m. documentada no core** (`pedidos/pagamento.ts:21-23` e
   `seed/pedidos.seed.ts:50`, de 2026-07-05). O 2,89% do dono supersede e os comentários precisam
   ser corrigidos na mesma aterrissagem.
4. **A taxa do meia-floripa é `incorporada`, então `taxaServico` volta 0 e a linha do resumo não
   é renderizada** (`StepResumo.tsx:283`). O dono não viu a taxa sumir: viu o resumo calar. É o
   item 61 do painel visto do lado do comprador.
5. **O total por opção só aparece quando os totais DIFEREM** (`StepResumo.tsx:89`). Em taxa
   incorporada eles nunca diferem — a RN-180 fica 100% invisível justamente no evento testado.
6. **A prova de aceite é independente da tela.** O cliente manda booleanos; o servidor lê versão e
   hash na tx. Mover o bloco de etapa não toca o carimbo — o que a migração toca são **oito gates
   de interface**, listados na fila.
7. **A migração acende a auto-geração do PIX na chegada.** Com aceites já dados e `forma` valendo
   `'pix'` por default, entrar no PAGAR passaria a criar pedido pendente, inscritos pendentes e
   cobrança real no gateway, antes de qualquer escolha. Virou a D-ACH-12.
8. **Defeito vivo · `saudeCustom` é exigido pelo servidor e nunca coletado pela tela**
   (`createInscricaoCharge.ts:1367` × `CheckoutFlow.tsx:784`). Todo evento com termo de saúde
   próprio ativo está com a compra quebrada hoje, por construção.
9. **Defeito vivo · a prova de aceite não guarda IP nem user agent.** `context.rawRequest` está
   disponível e não é lido. Fragilidade probatória num termo de isenção por lesão.
10. **A página do produtor não tem pasta própria:** é a rota `[eventSlug]` desambiguada por `@`
    (`page.tsx:49`), com a view inteira em `_perfil/PerfilView.tsx`. Os "botões de rede social"
    são `linksExternos` genéricos (`{label, url}`) renderizados como pílulas de texto — **não
    existe conceito de rede social no modelo**.
11. **A navegação por aba do perfil já é task canônica não executada:** `LEELA-S1700-T2` no E17
    pede exatamente "Feed leitura · Eventos · Clubs + navegação por aba". O que foi entregue
    achatou as três em seções empilhadas.
12. **O Feed é greenfield total** (zero modelo, zero Rules, zero leitor) e **Clubs tem dado real
    sem página de destino** — `CardClube` é um `<div>` sem `href`.

## Perguntas de veto ao dono

Todas com default profissional **já assumido na spec**. Nada está bloqueado; vetar é barato
enquanto o build não começou.

| # | Pergunta | Default assumido | Custo de vetar |
|---|---|---|---|
| V-1 | O parcelamento passa a usar **tabela Price de verdade** no lugar do cálculo de hoje? | Sim — Price. O modelo atual cobra 17% a mais em 12x, e o próprio core já documenta "tabela Price" | Baixo agora, alto depois da primeira compra parcelada |
| V-2 | A parcela **única** do cartão fica **sem juros**? | Sim. Senão "à vista" do cartão nasce 2,89% acima do PIX com esse rótulo | Uma linha |
| V-3 | Os **2,89% a.m.** superseem os **3,49% a.m.** decididos em 2026-07-05 e documentados no core? | Sim, 2,89% vence e os comentários do core são corrigidos | Uma linha + reconciliação |
| V-4 | O **juro fica com a plataforma** (não entra no repasse do organizador nem na comissão do afiliado)? | Sim — é o que o código já faz; a spec só escreve | Alto: mexe em repasse, ledger e RN-310 |
| V-5 | Em taxa **incorporada**, o resumo passa a dizer **"Taxa de serviço · inclusa no valor"**, sem número? | Sim. "R$ 0,00" mentiria e o valor real vazaria o termo do organizador | Uma linha |
| V-6 | Os dois aceites vão para o **fim da etapa de dados** (e não para a de modalidade e kit)? | Sim — é onde os participantes são identificados, e ali o aceite gateia o "Continuar" | Médio: muda o gate e o lugar do bloco |
| V-7 | **Nenhuma forma de pagamento vem pré-selecionada**, e o PIX só nasce quando a pessoa escolhe PIX? | Sim. Sem isso, chegar ao pagamento cria pedido pendente e cobrança real sozinho | Médio |
| V-8 | Divergência entre a **versão do termo exibida** na inscrição e a vigente na compra **recusa** a compra e repõe o aceite? | Sim. A janela passou de segundos para minutos | Baixo: volta o comportamento de hoje |
| V-9 | A prova de aceite passa a registrar **IP e agente do navegador**? | Sim, com base legal na prova do aceite. Nada quebra se você vetar | Nenhum |
| V-10 | A cotação começa na **etapa de dados** (step 1), e não já na escolha de modalidade? | Sim. No step 0 cada clique em kit viraria uma chamada | Baixo |
| V-11 | O total de **cada opção** de pagamento aparece no rótulo mesmo quando os dois são **iguais**? | Sim. Saber que a escolha não muda o preço é informação | Uma linha |
| V-12 | **WhatsApp, TikTok e Strava** ganham ícone próprio (o `lucide` não os tem)? | Sim, três SVGs locais. Sem eles, o produtor cai num ícone genérico justamente no WhatsApp | Baixo |
| V-13 | A **rede social é inferida pelo endereço do link**, sem campo novo no modelo do perfil? | Sim. O campo novo custaria seis arquivos, Function e editor do painel | Baixo |
| V-14 | O **Feed mockado** do preview vem rotulado como exemplo? | Sim, como a galeria e os patrocinadores já fazem | Uma linha |
| V-15 | Os assets de kit reais (B9) entram como **acervo local versionado**, sem link para fora? | Sim. Hotlink quebra no primeiro deploy | Baixo |

## Dois defeitos vivos achados de passagem (não são do escopo pedido)

Nenhum dos dois foi procurado; os dois apareceram no inventário do B6 e entraram na fila porque
esta é a única lane que vai abrir esses arquivos.

1. **Todo evento com termo de saúde próprio ativo está com a compra quebrada.** O servidor exige
   `aceites.saudeCustom === true` (`createInscricaoCharge.ts:1367-1373`) e a tela nunca coleta nem
   envia esse campo (`CheckoutFlow.tsx:784` manda `{termos: true, saude: true}` fixo). Não é
   intermitente: é `failed-precondition` garantido. Task `S1217-T3`, RN-441.
2. **A prova de aceite não tem origem.** Sem endereço e sem agente do navegador em nenhum ponto da
   cadeia, num termo de isenção de responsabilidade por lesão. A RN-148 já previa `ipHash?` para o
   irmão dele e nunca foi construída. Task `S1217-T5`, RN-442.

## Entregáveis (aceite do brief, item a item)

| Aceite do brief | Onde |
|---|---|
| `04-spec-achados.md` com mini-specs de B1/B2/B5/B6 e decisões D-ACH-n | D-ACH-1 a D-ACH-14, no padrão da `02-spec-kitcupom` |
| `05-rns-achados.md` com RNs na sequência vigente e o que o B6 supersede | RN-434 a RN-445, faixa provada por varredura literal; seção "O que esta rodada SUPERSEDE" nomeia a decisão de 2026-07-18 (CKFORM §5.3, T2 `e860b8e`) e lista, item a item, o que **não** cai junto |
| `06-spec-produtor-page.md` com recorte, mock e épico futuro nomeado | D-ACH-15 a D-ACH-21; o feed real aponta para o que o E17 já especifica, sem re-especificar |
| `07-fila-achados.md` executável, com gates, ⚔ no dinheiro e territórios sem colisão | 16 tasks em 5 frentes, tabela de colisão arquivo a arquivo com KITCUPOM-BUILD e PIXFIX-EXTREF, 19 vetores, gates por task |
| Ambiguidade vira pergunta de veto numerada, com default assumido | V-1 a V-15 acima; nenhuma delas bloqueia o build |
| Vocabulário da D-0802-1 | Experiência e participante em toda superfície nova; a home e o texto do layout ficam intocados por decisão (D3 da fila) |
| Padrão épico → história → tarefa | `S1216`, `S1217`, `S1218` (E12), `S314` (E04), `S1707` (E17), ids com varredura de colisão |
| Commit por entregável, `--only`, sem push | `2ed18d1`, `f15f630`, `edd8866`, `73f75e4`, `194e883` e este |

## Disciplina em vigor

- `git commit --only <caminhos>` sempre; nunca `git add` amplo (duas lanes de build na árvore).
- `DECISOES-ABERTAS.md` intocado. Os itens novos que o dono precisa ver estão nas perguntas de
  veto acima, para o maestro levar ao painel (o próximo número livre do painel é **65**).
- Épicos e boards **não** foram tocados nesta lane: o brief define o território como
  `leela-specs/02-rodadas/2026-08-02-retomada/**` mais este handoff, e as duas lanes de build têm
  os boards abertos. Os deltas de épico (E04, E09, E12, E17) e os cards de kanban estão
  especificados na fila e são a primeira tarefa da aterrissagem da ACHADOS-0802.
- Suítes, emulador e navegador: não rodados, por contrato.

## Self-score (contrato do sf-cto)

| Critério | Peso | Limiar | Nota | Evidência |
|---|---|---|---|---|
| `technical_correctness` | 1,5 | 0,85 | **0,94** | Toda decisão aponta para símbolo lido no repositório: `precisaCotar`/`assinaturaDe`/`cotacaoSeqRef`/`aplicarCupom` (`CheckoutFlow.tsx`), `buildInstallmentOptions` (`calc.ts:73`), `computeSaleState` (`saleState.ts:341`), `resolverTaxaMeio`/`computeTaxaPlataforma` (`taxaPlataforma.ts`), `modoTaxaDoEvento` (`evento.ts:256`), `totaisPorMeio` (`cotarInscricaoCheckout.ts:264`), o bloco `<dl>` de totais (`StepResumo.tsx:268-309`), `installmentRules` (`commercialTerms.ts:36`), `TermsEditor.tsx:273-282`, o carimbo (`createInscricaoCharge.ts:1516-1545`), o fence do termo custom (`:1367`), `AceitesCompra.tsx`, `macroDaEtapa` (`CheckoutStepper.tsx:46`), `PerfilView.tsx`, `leitorPerfil.ts`, `Tabs`/`SubNav` do design system e `ehPreview` (`mockImagem.ts:43`). A conta do Price foi fechada com números (R$ 359,90 × R$ 422,03). Não fica em 1,0 porque nada foi executado: o contrato da lane proíbe suíte e emulador |
| `scalability_check` | 1,0 | 0,75 | **0,86** | Nenhuma coleção, índice novo (o do E1 é dívida existente), Function nova ou infra nova nas cinco frentes. O único acréscimo de chamada é uma cotação por sessão abandonada, e ele **reduz** a latência percebida ao mover o despertar frio para fora da tela do dinheiro. Modos de falha nomeados e virados em estado de tela: cotação antecipada que falha é indistinguível de não ter cotado; derivação do meio alternativo que falha volta ao rótulo genérico sem derrubar a opção principal; divergência de versão recusa em vez de carimbar; endereço de link desconhecido cai em ícone genérico; feed sem publicação mostra vazio digno. A propriedade `parcela × n === total` foi escolhida para eliminar divergência de centavos entre a tela e a divisão do gateway. Não fica mais alto porque o efeito real do pré-aquecimento sobre o despertar frio é raciocínio, não medição |
| `security_posture` | 1,5 | 0,80 | **0,91** | Três eixos. **Confidencialidade:** percentual de taxa, taxa fixa e percentual de juros continuam proibidos em superfície pública, e a decisão do modo incorporada foi tomada para não vazar o termo do organizador — daí "inclusa" em vez do valor. **Prova legal:** a migração do B6 foi desenhada para não tocar o carimbo; o cliente segue mandando booleanos; a versão exibida entra como conferência e nunca como gravação; e a janela nova aberta pela própria migração (minutos entre o gesto e o carimbo) foi fechada pela RN-439 em vez de ficar em silêncio. **Superfície de escrita:** a RN-440 fecha um caminho em que abrir uma tela criava pedido, inscrito pendente e cobrança real no gateway sem ato humano — o inventário mostrou que o gate humano de hoje era acidental, não desenhado. Dois defeitos vivos foram nomeados sem maquiagem, incluindo um que reprova a compra hoje. O IP entra em hash, nunca em claro, alinhado ao que a RN-148 já tinha escolhido. Não fica mais alto porque a base legal do agente do navegador é enunciada e não passou por revisão jurídica |
| `cost_envelope` | 1,0 | 0,70 | **0,85** | Custo calculado por frente e comparado ao free tier: uma callable de leitura a mais por sessão abandonada, dois campos a mais em documentos que já são escritos na mesma transação, uma leitura extra só nos eventos com termo custom, e um índice que já deveria existir. O B1 foi explicitamente posicionado como a resposta **barata** ao item 62 do painel, deixando `minInstances` como decisão que só volta com medida. A configuração real da tabela de juros por organizador foi mantida fora do escopo e nomeada como épico, evitando que a lane pague por uma decisão comercial que o dono ainda não tomou. Não fica mais alto porque o número de sessões que abandonam no preenchimento é estimativa |

**Média ponderada: 0,896.** Os quatro critérios acima do limiar; `on_below_threshold: revise` não
disparou.

## Resumo executivo

**Lane SPEC-ACHADOS-0802 fechada.** Os cinco achados que pedem regra (B1, B2, B5, B6 e B10) têm
spec pronta para build, sem uma linha de código de aplicação, e os quatro que não pedem (B3, B4,
B8, B9) entraram na fila com aceite curto.

**O inventário mudou o tamanho de três dos quatro achados de checkout.** O motor de juros já
existe e está configurado em zero: simular 2,89% a.m. é dado, não código. A taxa do meia-floripa é
incorporada, então o resumo não escondeu a taxa por descuido — ele calou por desenho, e foi esse
silêncio que o dono viu. E a prova de aceite é independente da tela, então mover os dois
checkboxes de etapa não custa um byte do carimbo.

**O que custa caro é outra coisa, e o inventário achou.** Ligar os juros como estão hoje cobraria
**17% a mais** do comprador em 12x, porque `calc.ts` faz o principal corrigido pelo prazo inteiro e
chama isso de parcelamento — não é tabela Price, e o próprio core documenta "tabela Price" a dois
arquivos de distância. Ligar os juros também faria a opção "à vista" do cartão nascer 2,89% acima
do PIX com esse rótulo. E migrar os aceites acenderia a auto-geração do PIX na chegada da tela:
com os checkboxes fora do caminho e o PIX pré-selecionado, **abrir a tela de pagamento passaria a
criar pedido, inscritos pendentes e cobrança real**, para quem só queria ver o preço. As três
viraram decisão explícita, não efeito colateral.

**Dois defeitos vivos apareceram de passagem.** Todo evento com termo de saúde próprio ativo está
com a compra quebrada hoje, porque o servidor exige um aceite que a tela nunca coletou. E a prova
de aceite não guarda endereço nem agente do navegador, num termo de isenção por lesão. Os dois
entraram na fila porque esta lane é a única que vai abrir esses arquivos.

**O B10 é menor do que parece.** As três abas que o dono pediu já são a task canônica
`LEELA-S1700-T2` do E17, nunca executada; a entrega anterior achatou Feed, Eventos e Clubs em
seções empilhadas. Os "botões de rede social" são links genéricos sem noção de rede, e a rede pode
ser inferida do endereço sem tocar modelo, Rules, Function nem editor do painel.

**Números.** 12 RNs mintadas (RN-434 a RN-445, faixa provada livre por varredura literal), 5
stories com id conferido contra colisão em código de produção (`S1216`, `S1217`, `S1218`, `S314`,
`S1707`), 21 decisões, 20 premissas vetáveis, 15 perguntas de veto ao dono com default assumido,
16 tasks em 2 lanes, 19 vetores ⚔, 5 commits mais este selo.

**Veredito: ENTREGUE E PRONTA PARA BUILD**, atrás de duas lanes que precisam aterrissar antes
(PIXFIX-EXTREF em `functions/`, KITCUPOM-BUILD em `StepResumo.tsx` e em `sections/`). As seis
premissas que mudam desenho se o dono vetar são P1 a P6; as outras catorze podem cair sem refazer
a spec.

**Riscos declarados que a lane não pôde fechar.** Nada foi executado, então cada critério de aceite
é promessa a provar no build. A conta do Price foi fechada no papel e não numa suíte. O ganho real
do pré-aquecimento sobre o despertar frio da function é raciocínio, não medição — e é justamente a
medida que o item 62 do painel espera. A base legal do agente do navegador na prova de aceite é
enunciada, não revisada por jurídico. E a premissa mais desconfortável da rodada é a P1: ela troca
o modelo de juros que está no código por outro, e a diferença entre os dois é dinheiro do
comprador. É por isso que ela é a primeira pergunta de veto e o primeiro vetor da review
antagonista.
