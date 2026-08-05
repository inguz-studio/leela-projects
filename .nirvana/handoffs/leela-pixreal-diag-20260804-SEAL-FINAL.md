---
tags: [leela, handoff, selo, boards, epicos, fila, painel]
trace: leela-pixreal-diag-20260804
lane: SEAL-FINAL-0805
data: 2026-08-05
papel: sf-cto (software-forge)
territorio: leela-specs/ (+ este handoff)
---

# SEAL-FINAL-0805 · as nove lanes da madrugada aterrissam, e duas reviews mudam o registro

O primeiro selo (`9072edc6`+`fc756174`) fechou até a BUILD-AREACLIENTE-2. Desde então
aterrissaram **nove** lanes, e nenhuma pôde tocar `leela-specs/` — este selo é a aterrissagem de
todas. **Nenhuma linha de código foi tocada:** commit `--only` sobre sete arquivos de spec mais
este handoff, com `--amend` proibido por ordem, porque a rodada anterior teve uma lane arrastando
arquivo alheio do índice compartilhado.

Fonte de verdade: os **handoffs de cada lane**, não a tabela do brief. Onde handoff e `git log`
divergiram, valeu o `git log`.

**A lane caiu por erro de conexão no meio do trabalho** (na nota do CODPED-1) e foi retomada sem
perda: os sete arquivos estavam modificados e não commitados, e a retomada conferiu o que já
estava escrito antes de continuar. **A BUILD-B4 aterrissou durante a queda**, e o selo foi refeito
em cima do estado novo em vez de congelar o antigo.

## O que foi selado

| Arquivo | O que mudou |
|---|---|
| `00-boards/V1-KANBAN.md` | o card da S032 saiu do Backlog para 🔄 Em execução (tem tarefa entregue **e** revisada, e deixá-lo no backlog era afirmação falsa); os cards da S1228 e da área do cliente reescritos com o estado real; **as três condições da REV-5B entraram no card do dono**, com o redirecionamento da saída para arquivo no comando |
| `00-boards/V1-CHECKLIST.md` | seis linhas novas com prova (`S1228-T4-REV`, `S1228-T2`, `RN-396-RNG`, `RNG-CORE`, `S032-T4`+`T4-REV`, `S1222-REV`, `S1222-INTERRUPTOR`), a B4 marcada entregue, e a linha do segundo selo |
| `00-boards/BOARD-EPICOS.md` | duas entradas `+2026-08-05` na altitude de épico, uma no E00 (a RN-449d saiu do papel e as duas metades que ela não cobre) e uma no E12 |
| `01-produto/DECISOES-ABERTAS.md` | **sete itens novos**, a exposição medida do POSSE-EMAIL-1, a correção da nota do CODPED-1 que envelheceu, e a nota de fechamento do convite previsível |
| `02-rodadas/…/04-fila-codigo.md` | estado por frente com hash, a saída da REV-5B, a saída da REV-AREACLIENTE, **dez itens novos de fila técnica** (RS1-11 a RS1-20 mais um agrupado), a tabela dos quatro índices e dois critérios de pronto que passaram a ser verdade |
| `02-rodadas/…/01-decisoes-dono.md` | a seção da madrugada seguinte com o mapa lane→entrega→prova completo, as três condições do retroativo e a ordem de operação que cresceu |
| `03-canon/epics/LEELA-E12-landing.md` | **a diretriz da RN-474 corrigida** (ver abaixo), a sexta superfície na RN-475, a medição da REV-AREACLIENTE na diretriz da RN-469, e o estado da frente B |
| `03-canon/epics/LEELA-E00-fundacao-tecnica.md` | estado da RN-449d, as três decisões de desenho que sobreviveram ao ataque, e as duas metades que a regra **não** cobre |

## A correção que este selo existia para fazer

O primeiro selo escreveu a **diretriz permanente da RN-474** dizendo que o sorteio criptográfico
valia "nos dois geradores". Era verdade do *default* e falsa do caminho da venda, e o próprio selo
anterior já tinha registrado a ressalva. Agora ela está **fechada em três frentes e datada**:

| Frente | O que sorteava com o PRNG do V8 | Fechada em |
|---|---|---|
| Venda | a cadeia inteira do checkout passava `random` explicitamente — toda compra nova | `61776052` |
| Ingresso | `emitirIngressos.ts:340`, e nenhum chamador de produção passa fonte — todo código que a pessoa dita no balcão | `8d779dce` |
| Núcleo | convite de organizador (**provisiona tenant**, sorteado no navegador), convite de clube e refCodigo de afiliado | `20a9c904` |

O que ficou escrito como doutrina, além do resultado: **o último default a falar vence**, e por
isso quem trocar a fonte de um gerador tem de conferir os chamadores um a um. Foi exatamente essa
conferência que faltou nas duas rodadas em que a diretriz esteve escrita e não cumprida. Varredura
final: **zero `= Math.random` como default de parâmetro no repositório inteiro**; os dois
`Math.random()` restantes são fallback atrás de `crypto.randomUUID()` e nenhum é código de
portador.

## Os sete itens novos do painel

| ID | O que pergunta | Default proposto |
|---|---|---|
| **RN469-PROJECAO-1** | a área mostra 6 de 16 campos da compra, e a regra diz que todos nascem visíveis; o comentário que diz que o detalhe "mora na tela do S1225" é falso | **a linha da compra ganha caminho até o detalhe** — a alternativa é enfraquecer a diretriz para "nasce autorizado", que é regra mais fraca e tem de ser dita em voz alta |
| **CTA-PIX-1** | o CTA "ver meus ingressos" aparece com o PIX ainda pendente, quando a sessão é anônima | **rotular por estado** — no PIX pendente o botão diz o que realmente faz |
| **ADMIN-VE-AREA-1** | conta de administração vê a área do cliente inteira | **manter** — a área mostra o que é da própria conta; fechar só faz sentido junto do ADMINSEP-1 |
| **TROCA-EMAIL-1** | quem troca de e-mail depois da compra perde o histórico em silêncio, vendo a mesma lista vazia de quem nunca comprou | **manter o fail-closed e avisar** — a autorização não muda, a tela ganha uma frase |
| **AREA-MUDA-1** | quem pagou e teve o vínculo recusado vê o mesmo que quem nunca comprou (RN-451) | **a área explica em uma frase** — o motivo já está carimbado no pedido e não chega a superfície nenhuma |
| **ACUMULO-ESTOQUE-1** | a RN-449d fecha o fluxo e não o estoque; ninguém contou quantas contas já acumulam | **rodar a varredura A5 e decidir depois** — nenhuma migração antes do número, e zero é resultado válido |
| **CLUBES-1** | "Meus Clubes" nasce vazio porque não existe caminho para um participante entrar num clube | **manter o vazio honesto e abrir a entrada numa rodada própria** — a tela foi escrita para não prometer botão que não existe |

**POSSE-EMAIL-1 permanece intocada**, como a ordem exigia, e ganhou duas notas: a **exposição
medida** (a cadeia completa, com a severidade real em média porque exige conhecer o id do pedido, e
o agravante de trancar a vítima fora da própria compra — metade já removida pelo fix D1) e a
**correção exata de uma linha**, com o custo declarado e a razão pela qual o outro ramo da regra
não pode receber a mesma condição.

**CONVITE-PREVISIVEL-1 ficou como NOTA, não como decisão** — e a decisão de não abrir item foi
tomada depois de conferir o repositório, como o brief mandou. O convite de organizador é
credencial ao portador que provisiona tenant e era sorteado no cliente; foi corrigido em
`20a9c904`. Códigos emitidos antes continuariam previsíveis, **mas não existe nenhum**: os únicos
convites já escritos são os dois do ambiente de desenvolvimento, com códigos **fixos** e atrás de
uma trava que impede o seed de rodar contra produção; a tela que gera códigos reais vive no painel,
que não está no ar; e a porta de resgate foi provada em 404 em produção com controles positivos. A
nota entrou no **DEPLOY-1**, que já carregava a frase "nenhum convite foi semeado em ambiente
nenhum". Fica registrado com honestidade que os outros dois geradores corrigidos no mesmo commit
(convite de clube e refCodigo de afiliado) **têm** códigos emitidos antes da correção onde quer que
tenham sido emitidos — nenhum dos dois provisiona tenant nem concede papel, então nenhum é escalada
de privilégio.

## O card do backfill, com as três condições

O primeiro selo gravou o comando. A REV-5B impôs três condições, e elas entraram no card porque
nenhuma é formalidade: **rebuild imediatamente antes** (o script importa `functions/lib`, e a
árvore teve lane em voo em `src/checkout`); **conferir a linha `Destino:` do ensaio antes do
`--apply`** (o script agora recusa sozinho, mas a linha é a prova de dois segundos); e **gravar a
saída em arquivo**, com o redirecionamento já escrito no comando — o mapa pedido→código só existe
ali, e ele carrega o uid do comprador, então é documento interno e não print de grupo. Registrado
também que interromper **não corrompe** (medido) e trava o pedido em voo por 60 a 75 segundos.

## A fila técnica nova

Dez itens, no molde RS1-* que a fila já usava: **RS1-11** (o reprocesso do `contaSemFriccao` que
não existe), **RS1-12** (o limite de 200 sem `orderBy`, a única da leva que pode repetir o defeito
desta rodada e a única que precisa de índice composto novo), **RS1-13** (seis suítes gateando pela
variável errada, o que faz a suíte sair *skipped* com exit 0 — verde falso), **RS1-14**
(`packages/core` sem runner próprio, com a razão de a alternativa ter sido recusada),
**RS1-15** (14+ configs de emulator, mais o achado da REV-5B de que colisão de porta é
indistinguível de regressão e de que `hub` e `logging` também precisam ser reservados),
**RS1-16** (o pregamento global de `Math.random` refém do `fileParallelism:false`, agora em cinco
arquivos), **RS1-17** (guarda de `NaN` não uniforme, só alcançável por injeção), **RS1-18** (o teto
de 500 escritas sem prova, porque o emulador não o aplica), **RS1-19** (CONVITE-1 — quem não
recebeu o e-mail do convite só consegue outro pelo organizador) e **RS1-20** (o gate da suíte da
landing dependendo de quantas lanes rodam emulator; a decisão sobre o `testTimeout` é do maestro e
está declarada como tal). Mais uma linha agrupada com a higiene da REV-AREACLIENTE que não coube
acima, para nada se perder.

## O que ficou registrado como EM EXECUÇÃO, e não selado

Por ordem explícita, e ainda que existam commits com o nome delas na árvore:

1. **REV-5C** — review antagonista da tela e do e-mail do comprador. Registrada como em review no
   card, no checklist, na fila e no épico. O que ela fechar é do próximo selo.
2. **REV-B4** — review antagonista de Meus Clubes. Mesma marcação, nos mesmos quatro lugares.

## O que eu NÃO consegui selar, e por quê

1. **A conferência visual continua sendo lacuna, e agora em cinco frentes.** Ninguém abriu
   navegador nem arquivo gerado: o cartão do ingresso sem a linha do id, o e-mail com os dois
   códigos num cliente real, o rótulo da conta clicável no header em 320px, a tela de "receba seu
   link de acesso" e o PDF gerado. Está escrito em cada card; nenhuma lane abriu navegador.
2. **As duas frases envelhecidas do checklist (`LEELA-S1209-T2` e `-T3`) continuam como estão** —
   mesma razão do primeiro selo: existe uma review daquela época, ela não nomeia as duas tasks, e
   mudar o registro sem medir trocaria uma imprecisão por outra.
3. **`leela-specs/KICKOFF-BUILD.md` continua não versionado.** Não é desta lane e não foi tocado,
   como o coordenador pediu.
4. **Nenhum estado "no ar" foi marcado.** Nada desta rodada foi deployado, e isso está escrito em
   todo card em vez de deixar o ✅ sugerir o contrário.
5. **A decisão sobre o `testTimeout` da suíte da landing não foi tomada** — ela é do maestro, e o
   item está na fila dizendo isso.

## Fronteira respeitada

Commit `--only` sobre sete arquivos de `leela-specs/` e este handoff, path a path. Nada em `apps/`,
nada em `functions/`, nada em `packages/`, nada em `firestore.rules`. **`git commit --amend` não
foi usado em nenhum momento.** Sem deploy, sem escrita em produção.
