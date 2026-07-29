# Handoff · Lane SPEC-KITCUPOM · trace leela-build-2d6ee98d

- **Employee:** `sf-cto` (software-forge) · DNA Fowler / DHH / Kleppmann
- **Escopo:** MINI-SPEC de duas features da DEC-0729 — galeria do kit (D-0729-4) e cupom
  pré-aplicado por link (D-0729-5). **Zero código de aplicação.**
- **Território:** `leela-specs/**` + este handoff. Nada fora disso.
- **Repo:** `C:\dev\LEELA`, branch `main`. Commits `[LEELA-SPEC-KITCUPOM]`. **SEM push** (o maestro pusha).
- **Painel `DECISOES-ABERTAS.md`:** intocado (é do maestro).
- **Suítes e emulador:** não rodados (contrato da lane — outra lane pode deter a máquina).

## Placar

| # | Task | Estado | Commit |
|---|---|---|---|
| T0 | Inventário + abertura do handoff | ✅ | `a1984f9` |
| T1 | Rodada · decisões e premissas (`02-spec-kitcupom.md`) | ✅ | `e268cd0` |
| T2 | Rodada · RNs (`03-rns-kitcupom.md`) | ✅ | `e450adb` |
| T3 | Stories nos épicos (E03 galeria, E12 cupom) + deltas de fronteira | ✅ | `dd6419b` |
| T4 | Fila de código com ⚔ + boards | ✅ | `398ac51` |
| T5 | Selo · resumo executivo + self-score | ✅ | (este) |

## Inventário antes de especificar (reaproveitado vs criado)

Feito ANTES de qualquer proposta, lendo os arquivos — não por memória.

### Galeria do kit · já existe e a spec REUSA

| Peça | Onde | O que a spec aproveita |
|---|---|---|
| Modelo do kit com visão de compra | `packages/core/src/eventos/kit.ts` (RN-227/RN-230) | `imagemUrl?`, `isUrlImagemKitValida` (delega em `isUrlCapaValida`), `normalizarItensKit` como PADRÃO Postel de campo decorativo, tetos `KIT_*_MAX` |
| Upload real de imagem de kit | `packages/api-client/src/storage.ts` (`uploadImagemKit`) + `apps/painel/.../kits/KitEditor.tsx` | O fluxo de upload, a semântica `undefined`=não tocado / `null`=removido no payload do `salvarKit`, o `FileInput` do DS e a prévia |
| Rules de Storage do kit | `storage.rules` §`eventos/{eventoId}/kits/{kitId}` | `kitObjetoValido`, `eventoDoMeuTenant` (cross-service `firestore.get`, fail-closed), `imagemValida()`, e a propriedade "nome de objeto fixo ⇒ re-upload sobrescreve, zero órfão" |
| Cascata de imagem nas superfícies públicas | `apps/landing/lib/kitImagem.ts` + `app/components/KitImagem.tsx` | Os três níveis (real → mock de PREVIEW → placeholder Leela em produção) e os assets locais `KITS_MOCK` |
| Detalhe do kit no checkout | `apps/landing/.../checkout/KitDetalhe.tsx` + `kitDetalheDados.ts` | Já consome `KitPublico.imagemUrl` e já tem lightbox (`test/kit-imagem-lightbox.test.tsx`) |
| Listagens públicas do kit | `sections/KitsSection.tsx`, `checkout/StepModalidadeKit.tsx` | Leem `imagemUrl` — permanecem intocadas pela decisão de shape |
| Primitivo de miniatura | `packages/design-system/src/components/Thumb` (exportado no `index.ts`) | As miniaturas da galeria; **nenhum componente novo de DS** |
| Padrão de galeria | `sections/GaleriaSection.tsx` | O formato visual (grid, `figure`, lazy, dimensão intrínseca) e a lição "mock é app-side, rotulado como exemplo" |

### Cupom por link · já existe e a spec REUSA

| Peça | Onde | O que a spec aproveita |
|---|---|---|
| **Auto-apply do cupom da URL** | `apps/landing/.../checkout/CheckoutFlow.tsx` (efeito A-2, `cupomUrlPendente`/`erroCupomUrl`) | **Já existe e funciona.** A spec não recria: consolida e alimenta |
| Campo de cupom do step 0 | `checkout/CupomCampo.tsx` (S1209 · D-4) | O componente único; o estado "Cupom X aplicado — menos R$ Y"; a lógica fica no `CheckoutFlow` |
| Propagação da atribuição no CTA | `[eventSlug]/CtaInscricao.tsx` + `ctaStyles.ts` (`ATRIBUICAO_KEYS`) | O CTA já copia `cupom`/`ref`/`utm_*` da página para o checkout |
| Captura e persistência do `?ref=` | `[eventSlug]/RefTracker.tsx` | A disciplina inteira: normalização, primeiro-clique-vence para o mesmo código, last-click-wins para código diferente, claim do cliente, storage indisponível degrada |
| **Kernel de atribuição** | `functions/src/checkout/createInscricaoCharge.ts` §"Atribuição de afiliado" (RN-313/315) | Precedência `cupom de afiliado > ?ref=`, `origem: 'cupom'\|'ref'`, clamp do `clicadoEmMillis`, `dentroDaJanelaAtribuicao`, gate `descontoAfiliadoAtivo`, re-checagem na confirmação. **Nada disso muda** |
| Cotação pública | `functions/src/checkout/cotarInscricaoCheckout.ts` | Autoridade do número; anônima com login anônimo; já é a fronteira que diz se o cupom cola |
| Modelo do cupom | `packages/core/src/eventos/cupom.ts` | `normalizarCodigoCupom`, `CODIGO_CUPOM_RE`, `cupomVigente`, `descontoDoCupom`, escopo `club_parceiro` (E18) |
| Modelo do afiliado e da parceria | `packages/core/src/affiliation/afiliado.ts`, `packages/core/src/clubs/parceria.ts` | `refCodigo` (docId), `cupomCodigo`, `janelaAtribuicaoDias`, `linkMaster` espelhado, `dentroDaJanelaAtribuicao` |
| Leitura server-side da landing | `apps/landing/lib/leitor.ts` + `lib/firebaseAdmin.ts` | O padrão "Admin SDK no servidor, gate no código, Rules intocadas" (doutrina desde a S1200-T2) |
| Base pública única | RN-423 (SPEC-INGPAGE → INGPAGE-BUILD) | O link do afiliado passa a nascer da MESMA base; `beh.ro` morre em mais um lugar |
| Cupons de demonstração | `functions/scripts/preview-seed-clubes.ts` (`FLORIPARUN10` afiliado, `RITMOFORTE10` assessoria) | Os dois cupons do meia-floripa já existem — a demonstração é de LINK, não de cupom novo |

### Criado por esta spec (o que não existia)

- Campo `fotosSecundarias[]` no `Kit` e o acessor canônico de galeria, mais o pareamento
  "promover a principal" como função pura.
- Dois slots fixos de Storage por kit para a 2ª e a 3ª foto.
- Galeria no detalhe do kit (principal + miniaturas) e três slots no `KitEditor`.
- Geração do link de afiliado/assessoria com cupom embutido (hoje `linkMaster` é texto livre).
- Persistência do cupom do link pela jornada, em simetria com o `?ref=`.
- Banner pós-Hero e a verificação server-side que o alimenta.
- Marca "(desconto aplicado)" na linha de desconto do resumo.

### Achados do inventário (entram na spec, não são opinião)

1. **O auto-apply de cupom por URL JÁ EXISTE** no `CheckoutFlow` (efeito A-2). O pedido do dono
   não é uma máquina nova: é o link do afiliado que nunca carregou o cupom, mais a comunicação
   (banner e marca no valor). Especificar isso como feature nova seria reconstruir o que roda.
2. **`?c=` é chave morta.** `ATRIBUICAO_KEYS` preserva `'c'` do primeiro clique até o checkout, e
   **nenhum arquivo do repo lê `'c'`**. O seed grava `parceria.linkMaster = 'beh.ro/mfl26?c=frc'`.
   Logo o "link master" da assessoria hoje entrega **nada**: nem cupom, nem atribuição — e ainda
   aponta para `beh.ro`, o domínio dos mocks Be Hero que a RN-423 acabou de expulsar do e-mail.
3. **A pergunta "quem ganha a comissão" já tem resposta no código**, e ela não é neutra: cupom de
   afiliado vence `?ref=` (`origem: 'cupom'`), e quando o cupom aplicado é de OUTRO afiliado o
   `clicadoEmMillis` do clique original é descartado (vira `agora`). Um cupom manual digitado por
   cima do link rouba a comissão do dono do link. Isso é comportamento VIGENTE — a spec ratifica
   e escreve, não inventa regra nova.
4. **O seed não pode "simular 3 fotos" como o pedido sugere.** A guarda `isUrlImagemKitValida`
   exige http(s), e a lição LEELA-R14 (`preview-seed-r14.ts`: "NÃO seedamos `imagemUrl` — a
   landing resolve app-side") é explícita. Seedar URL absoluta amarraria a porta do preview.
   A simulação tem de ser app-side, na cascata que já existe.
5. **A leitura de cupom é fechada por design.** `firestore.rules` restringe cupom ao organizador
   ("enumerar cupons = vazar descontos"). O banner, portanto, não pode ler cupom no cliente — e
   quem já responde a anônimo hoje é a `cotarInscricaoCheckout`.
6. **Nada no repo valida 1:1 de imagem.** `isUrlImagemKitValida` só olha a URL, e as Rules
   registram a limitação ("Rules não decodificam imagem"). O "1:1" da RN-227 é dica de painel e
   enquadramento de CSS. A spec não pode fingir que existe validação de proporção.
7. **O bucket de Storage não existe no ambiente online** (handoff DEPLOY-PREVIEW, pendência 3 do
   dono). Isso já bloqueia a PRIMEIRA foto; a 2ª e a 3ª herdam a mesma pendência — a galeria não
   cria dependência nova.

## Premissas assumidas

Tabela completa e vetável em `leela-specs/02-rodadas/2026-07-29-checkout-ux/02-spec-kitcupom.md`
(P1..P12, maior peso primeiro). As quatro que mudam desenho se o dono vetar:

- **P1** — a principal continua no campo `imagemUrl`; as outras duas vão num campo separado
  (`fotosSecundarias[]`). Não existe `fotos[]` unificado nem sinalizador de principal.
- **P2** — a comissão do desempate segue o que o código já faz: cupom manual de outro afiliado
  rouba a atribuição do link.
- **P3** — o nome da pessoa física afiliada aparece no banner público de quem tiver o código.
- **P4** — o banner some quando o cupom não se aplica, em vez de avisar na landing.

## Pontos ⚔ declarados para a review antagonista do build

Doze vetores em `04-fila-kitcupom.md`. Obrigatórios nas tarefas `S1215-T1` e `S1215-T3`, porque o
cupom por link toca dinheiro e atribuição. A frente da galeria não tem vetor de dinheiro.

**Dinheiro e atribuição (S1215-T1):** (1) provar por diff que o kernel não mudou uma linha;
(2) os dois desempates de comissão provados com teste, nas duas direções; (3) o gate do mínimo de
inscrições continua fechando, sem retroativo, falsificado abrindo; (4) nenhum domínio de terceiro
nem base ausente saindo do gerador; (5) o apelido `c` entra e nunca sai.

**Superfície pública (S1215-T3):** (6) Rules intocadas e zero leitura de cupom no cliente,
falsificado afrouxando; (7) sem oráculo, resposta idêntica nas cinco causas de recusa;
(8) nada além do nome sai do afiliado; (9) parceria desativada não aplica nem mostra faixa
(RN-364 intacta); (10) a página do evento continua estática e o bundle público não cresce;
(11) nenhuma soma de valor no cliente; (12) custo de raspagem medido com o cache ligado, e se o
cache não segurar a lacuna volta como decisão, não como silêncio.

## Disciplina em vigor

- `git commit --only <arquivos>` sempre; nunca `git add` amplo (outras lanes trabalham no repo).
- Épicos compartilhados: só ACRESCENTAR seção; edição cirúrgica apenas no ponteiro que evitaria
  contradição no canônico.
- `DECISOES-ABERTAS.md` intocado.

## Entregáveis (aceite do brief, item a item)

| Aceite do brief | Onde |
|---|---|
| Stories GWT ancoradas em épico, galeria e cupom separadas | `S212` (+4 tasks, 9 critérios) na seção "Delta galeria do kit" do `LEELA-E03-operacao-evento.md`; `S1215` (+4 tasks, 16 critérios) na seção "Delta cupom pré-aplicado" do `LEELA-E12-landing.md` |
| RNs com próximo número livre VERIFICADO (≥ RN-425) | RN-425 a RN-433, com o comando de varredura e o resultado literal em `03-rns-kitcupom.md`. Faixa RN-425..445 varrida na árvore inteira: único hit é a própria linha do brief |
| Deltas nos épicos tocados, na mesma aterrissagem | E03 (story + RN-425/427 + fronteira), E12 (story + RN-426/428/430/431/432 + fronteira da galeria), E08 (RN-429/433), E18 (fronteira do `linkMaster` e do gate RN-364), E04 (o que NÃO muda no modelo de cupom) |
| Rodada com premissas vetáveis P1..Pn | `02-spec-kitcupom.md` — D-KC-1 a D-KC-12 e P1 a P12, maior peso primeiro |
| Fila de código com dependências e pontos ⚔ | `04-fila-kitcupom.md` — 8 tarefas, 2 frentes paralelas, 12 vetores, ⚔ obrigatório em `S1215-T1` e `S1215-T3` |
| Cards no padrão épico→história→tarefa | `V1-KANBAN.md`: card `[E12]` → `S1215` → 4 tarefas + PENDENTE-DONO; card `[E03]` → `S212` → 4 tarefas. `BOARD-EPICOS.md`: 5 linhas acrescidas. `V1-CHECKLIST.md`: 10 itens |
| Reaproveitamento primeiro: inventário antes de propor | Seção "Inventário antes de especificar" acima, com as tabelas reusa/cria e os sete achados |

## Onde a spec responde cada pergunta do escopo

**Galeria.** Shape e compat retroativa em D-KC-1 (RN-425): a principal fica onde já está e só as
outras duas nascem, então nenhum documento migra e nenhuma leitura existente muda. Regra da
principal em D-KC-1 e D-KC-3, com o fallback de "só uma foto" sendo o próprio estado de hoje.
Superfícies em D-KC-2 (RN-426): listagem na principal, detalhe com a galeria inteira. Edição no
painel em D-KC-3 (RN-427), incluindo promover como troca e a promoção ao remover a principal.
Simulação no seed em D-KC-4 (RN-428), com a resposta honesta de que ela **não** pode ser no seed.
Limites em D-KC-1 e D-KC-3, com a correção de que o 1:1 da RN-227 nunca foi validado em lugar
nenhum: o que a spec promete é enquadramento, não verificação.

**Cupom.** Formato do link em D-KC-6 (RN-429), convivendo com o `linkMaster` por substituí-lo: ele
passa a ser derivado do mesmo gerador. Persistência da chegada até o checkout em D-KC-7 (RN-430),
em simetria com o `?ref=`. Auto-apply e "(desconto aplicado)" em D-KC-8, com a constatação de que
o auto-apply já existe e a garantia de que a marca é exibição. Conteúdo e estados do banner em
D-KC-9 (RN-431), com o silêncio honesto no lugar do erro agressivo. Relação com comissão em
D-KC-11 (RN-433), incluindo a resposta direta ao caso do cupom manual diferente do link.
Anti-abuso em D-KC-12 e no vetor 12 da fila. O que muda e o que não muda em E08 e E18 está escrito
nas seções novas dos dois épicos.

## Envelope de custo

- **Galeria:** zero infra nova. Duas URLs a mais no documento de kit que já é lido, dois objetos a
  mais por kit, nenhuma leitura adicional. O acréscimo é de banda no navegador de quem abre o
  detalhe, com carregamento tardio nas miniaturas. Menos de um centavo por evento.
- **Cupom:** uma leitura de cupom e, quando resolvível, uma de afiliado por abertura de página de
  evento **que traga cupom na URL**. Visita sem cupom não custa nada a mais. Com cache curto por
  código, mil cliques na mesma campanha ficam na casa de dezenas de leituras. Nenhuma escrita,
  coleção, índice ou Function nova. Cabe no free tier.
- **O que não foi medido:** o custo real de uma raspagem sustentada da verificação do banner. A
  estimativa assume que o cache segura, e o vetor 12 existe para isso virar número.
- **Orçamento da lane:** só spec. Zero custo de execução até o build começar.

## Self-score (contrato do sf-cto)

| Critério | Peso | Limiar | Nota | Evidência |
|---|---|---|---|---|
| `technical_correctness` | 1,5 | 0,85 | **0,93** | Toda recomendação aponta para símbolo lido no repo: `imagemUrl`/`isUrlImagemKitValida`/`normalizarItensKit`/`parseKit`/`KIT_*_MAX` (`packages/core/src/eventos/kit.ts`), `kitObjetoValido`/`eventoDoMeuTenant`/`imagemValida` (`storage.rules`), `uploadImagemKit` (`packages/api-client/src/storage.ts`), `KitEditor.tsx`, `kitImagem.ts`/`KitDetalhe.tsx`/`kitDetalheDados.ts`/`KitsSection.tsx`/`StepModalidadeKit.tsx`, `Thumb` (`packages/design-system/src/components/Thumb`), o efeito A-2 com `cupomUrlPendente`/`erroCupomUrl` (`CheckoutFlow.tsx`), `CupomCampo.tsx`, `ATRIBUICAO_KEYS`/`CtaInscricao.tsx`, `RefTracker.tsx`, `normalizarCodigoCupom`/`cupomVigente`/`descontoDoCupom`/`EscopoCupom` (`cupom.ts`), `dentroDaJanelaAtribuicao`/`descontoAfiliadoAtivo`/`origem`/`clicadoEmMillis` (`createInscricaoCharge.ts`), `cotarInscricaoCheckout.ts`, `linkMaster`/`CAMPOS_ESPELHO_PARCERIA` (`parceria.ts`), `preview-seed-clubes.ts`, `preview-seed-r14.ts`, `leitor.ts`/`firebaseAdmin.ts`, RN-423. Não fica em 1,0 porque nada foi executado: a lane é spec e o contrato proíbe suíte e emulador |
| `scalability_check` | 1,0 | 0,75 | **0,84** | Nenhuma coleção, índice ou Function nova nas duas frentes. A galeria não acrescenta leitura (as fotos vêm no documento já lido) e o cupom só custa em visita que traz código na URL. Modos de falha nomeados e virados em estado de tela: documento de kit envenenado (Postel descarta, o checkout não cai), foto que não carrega (a cascata cai no placeholder), cupom que não cola (faixa some, checkout avisa), armazenamento local indisponível (jornada segue, o servidor decide). O teto de três fotos é estrutural dos dois lados, modelo e Storage. Não fica mais alto porque a resistência da verificação do banner a raspagem sustentada é estimativa, não medição |
| `security_posture` | 1,5 | 0,80 | **0,90** | É o eixo da metade do cupom. O achado que ordena a spec é que a leitura de cupom é fechada por design, então o banner **não pode** ler no cliente: a leitura vai para o servidor da landing, pelo padrão já doutrinado, com Rules intocadas como aceite. Ausência de oráculo exigida nas cinco causas de recusa, com resposta idêntica. Superfície de ataque declarada sem maquiagem: a cotação anônima já responde se um cupom cola, então o que nasce é canal mais barato e o nome do promotor, e o nome virou premissa vetável (P3) em vez de decisão silenciosa. Lista do que não pode sair do afiliado. Limite por origem declarado como **ausente** no ferramental, não fingido. No dinheiro, a decisão mais defensiva foi não tocar o kernel e ratificar o desempate por escrito, com prova exigida por diff e por teste nas duas direções. Não fica mais alto porque a mitigação de raspagem depende de um cache cuja eficácia ninguém mediu |
| `cost_envelope` | 1,0 | 0,70 | **0,83** | Custo calculado por superfície e comparado ao free tier; zero infra nova nas duas frentes; a única variável real (raspagem) declarada como não medida e transformada em vetor de review. A dependência de bucket foi classificada como herdada, não nova, o que evita atribuir à galeria um custo de decisão que já era do produto. Não fica mais alto porque o número de aberturas por link é estimativa |

**Média ponderada: 0,883.** Os quatro critérios acima do limiar; nenhuma iteração de revisão
necessária (`on_below_threshold: revise` não disparou).

## Resumo executivo

**Lane SPEC-KITCUPOM fechada.** As duas features da segunda leva da DEC-0729 têm spec pronta para
build, sem uma linha de código de aplicação.

**O que o inventário mudou no tamanho do trabalho.** O pedido do cupom parecia máquina nova e não
é: **o auto-apply de cupom por URL já roda**, no efeito A-2 do `CheckoutFlow`. O que falta é o
link carregar o cupom e a comunicação em volta. Pior que isso: o link de hoje **não entrega nada**.
O `linkMaster` que a assessoria compartilharia carrega a chave `c`, que o CTA preserva e nenhum
arquivo do repositório lê, e aponta para `beh.ro`, o domínio dos mocks Be Hero que a RN-423 acabou
de expulsar do e-mail da compra. E a pergunta do brief sobre quem ganha a comissão quando o cupom
manual difere do link já tem resposta em produção, e ela não é neutra: o cupom vence o clique,
então quem digita o cupom de outro afiliado por cima do link transfere a comissão.

**O que foi decidido na galeria.** A principal continua exatamente onde está, no `imagemUrl` da
RN-227, e nascem só as outras duas, num campo próprio. A alternativa natural, uma lista com
sinalizador de principal, foi rejeitada por deixar representável o que o dono proibiu: zero
principais, ou duas. Com um campo só para a principal, a invariante não é validada, é forma, e
nenhuma tela pode violá-la por esquecimento. A compatibilidade vem de graça: **nenhum documento
migra** e toda leitura de `imagemUrl` que existe hoje continua correta sem uma linha alterada. No
painel são três posições, e "tornar principal" troca em vez de copiar; remover a principal promove
a próxima. No Storage, dois slots literais fazem o teto de três ser estrutural também lá. E a
simulação que o dono pediu **não pode** ser no seed: a guarda exige http(s) e a lição LEELA-R14 já
decidiu que mock de imagem é app-side, então ela entra como quarto degrau da cascata que já existe,
visível em preview e ausente em produção.

**O que foi decidido no cupom.** O link passa a nascer de um gerador único, com a base pública da
RN-423, o `ref` e o cupom dentro, o que mata o `beh.ro` em mais um lugar e aposenta o `linkMaster`
digitado; a chave `c` segue aceita na entrada, porque link de afiliado circula impresso e
desligá-la em silêncio custaria venda de quem já divulgou. O cupom passa a atravessar a jornada com
a disciplina que o `?ref=` já tem, corrigindo a assimetria em que a comissão sobrevive à navegação
e o desconto não. O banner anuncia quando o cupom se aplica e **cala** quando não se aplica, com o
aviso honesto ficando no checkout, onde a pessoa efetivamente tenta usar. O banner não lê cupom no
cliente, porque as Rules fecham essa leitura por design: a verificação vai para o servidor da
landing, com resposta idêntica nas cinco causas de recusa. Sobre o kernel de atribuição, a decisão
foi **não tocar** e ratificar por escrito o desempate que já existe.

**Números.** 9 RNs mintadas (RN-425 a RN-433, faixa provada livre por varredura na árvore inteira),
2 stories novas com id provado livre (`S212` no E03 e `S1215` no E12) e 8 tasks, 5 épicos tocados,
12 decisões, 12 premissas vetáveis, 12 vetores ⚔, 5 commits mais este selo.

**Veredito: ENTREGUE E PRONTA PARA BUILD**, condicionada ao veto do dono em P1, P2, P3 e P4, as
quatro que mudam desenho se caírem. As outras oito podem ser vetadas sem refazer a spec. A frente
da galeria e a do cupom são independentes e podem ser construídas em paralelo; só a do cupom exige
review antagonista, nas tarefas `S1215-T1` e `S1215-T3`.

**Riscos declarados que a lane não pôde fechar.** Nada foi executado: sem suíte e sem emulador, por
contrato, então cada critério de aceite é promessa a provar no build. O upload real de foto de kit
continua preso ao bucket de Storage que não existe no ambiente online, pendência do dono que já
bloqueia a primeira foto e que a galeria não agrava. A resistência da verificação do banner a uma
raspagem sustentada é estimativa, e por isso virou vetor de review em vez de afirmação. E a
premissa P2 é a mais desconfortável da rodada: ela ratifica que um cupom digitado por cima do link
transfere comissão. É o que o produto faz hoje, e mudar isso é mexer no kernel de dinheiro, o que
esta lane não tinha mandato para propor sem o dono olhar.
