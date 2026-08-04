# VITRINE-FIX · eventos publicados que a vitrine tratava como encerrados

- **trace:** `leela-build-2d6ee98d` · **lane:** VITRINE-FIX · **repo:** `C:\dev\LEELA` · branch `main`
- **commits:** `8f892f3c` (régua + landing), `10c05ae1` (sinal ao organizador)
- **deploy:** landing em produção · painel **não** subiu
- **mutação em dado de produção: zero**

---

## A premissa do brief estava invertida, e isso muda o que precisa ser feito

O brief dizia que os dois eventos estão publicados e inacessíveis porque a vitrine
discorda do servidor. Fui ler os documentos em produção antes de consertar, e o que
está lá é outra coisa:

| evento | lotes | campo `percursos` | o servidor venderia? |
|---|---|---|---|
| `noturna-beira-mar-2026` | 0 | **ausente no doc** | não |
| `retiro-bem-estar-rio-vermelho-2026` | 0 | **ausente no doc** | não |

Rodei o próprio kernel de cobrança contra essa forma. Com lote e sem percurso, o
`computeSaleState` responde:

```
venda fechada para a modalidade "5k" — sem lotes configurados e sem preço legado (RN-300/RN-301)
```

Ou seja: nesses dois eventos a vitrine e o servidor **concordam**. Os dois recusam a
venda, porque não existe preço nenhum cadastrado. A página não está mentindo — ela
está dizendo a verdade sobre um evento que foi publicado pela metade. O defeito ali
é outro, e é o que o brief chamou de metade mais grave: ninguém avisou o organizador.

**Consequência prática:** consertar código não faz esses dois eventos voltarem a
vender. Falta preço, e preço é dado. Está escalado abaixo.

## A divergência existe — só não é nesses dois

Enquanto apurava, achei a divergência real, e ela é maior do que dois eventos.

O servidor cobra assim (`resolverItem`, `packages/core/src/checkout/saleState.ts`):
lote ativo → se a modalidade **não tem lote nenhum**, o preço-base do percurso →
senão, venda fechada. Três ramos.

A vitrine tinha dois. `deriveEstadoVenda` decidia só pelos lotes e nunca soube que o
preço legado existe.

O que torna isso sistêmico: **`criarEvento` exige `percursos` (mínimo 1) e não cria
nenhum lote.** Todo evento que nasce pela porta do produto entra exatamente no estado
divergente. Publicado antes de alguém lembrar de abrir a aba Lotes, o servidor vende
e a página diz que acabou. Medido:

```
evento publicado sem lote, com percurso de R$ 80 (a saída literal de criarEvento)
  régua ANTERIOR -> estado = encerrado | preço = null
  régua NOVA     -> estado = aberto    | preço = 80
  servidor       -> cobra R$ 80
```

Hoje nenhum evento de produção está nesse estado (todos os que vendem têm lotes), o
que explica por que o defeito nunca apareceu como perda de venda. É uma armadilha
armada para o próximo evento criado.

## Causa-raiz, nomeada

`precoVigente` (`packages/core/src/eventos/lote.ts`) **já tinha** o parâmetro
`precoLegado` desde a evolução de schema da ADR-012. A landing chamava a função sem
passar o argumento. A régua não estava errada; estava sendo consultada pela metade,
num arquivo que era a quarta reimplementação da pergunta "dá para comprar?".

## Desenho escolhido: reconciliar a vitrine com o servidor

Escolhi a **família 1**, e não por ser a mais barata:

1. **A alternativa contradiz o produto.** Proibir publicar sem lote mataria o ramo
   legado que o `resolverItem` mantém de propósito — está escrito no código como
   schema evolution backward-compatible (Kleppmann), com a justificativa registrada.
   Desativar isso é decisão de dono, não conserto de bug.
2. **Quebraria o fluxo de criação.** Como `criarEvento` não cria lotes, exigir lote
   para publicar tornaria todo evento novo impublicável até o organizador descobrir
   uma aba que nada indica que ele precisa visitar.
3. **Exigiria migrar dado de produção**, que o brief excluiu desta lane.
4. E o argumento decisivo: **o core já concordava com o servidor.** Family 1 não
   inventa política nenhuma, só passa o argumento que faltava.

A régua saiu de `apps/landing/lib` e virou `packages/core/src/eventos/vitrine.ts` —
uma régua só, lida pela página pública **e** pelo painel. A junção dos dois modelos de
preço (`modalidadesVitrine`) subiu junto: era uma segunda montagem da mesma coisa, e
foi disso que o defeito nasceu.

### Um buraco que o teste pegou

Ao escrever o caso do evento já realizado, a régua nova respondeu `aberto`. O preço
legado **não tem janela de validade** como o lote tem, então um evento legado passado
ficaria "Inscrições abertas" para sempre. A ordem foi invertida: prova já realizada é
verificada antes de "tem preço?". Nenhum evento de produção estava nessa situação.

## O sinal ao organizador

Era a metade mais grave e não existia em lugar nenhum. O painel derivava o badge
**só** de `evento.status` — publicado sem vender renderizava idêntico a um evento
saudável. Pior: o único alerta que os dois eventos quebrados produziam era

> Ainda sem inscritos. Divulgue a página pública para começar a vender.

mandando o organizador promover uma tela que responde "Inscrições encerradas".

O Overview do evento passa a ler os lotes e a responder "a página está vendendo?" pela
mesma `diagnosticoVitrine` do core:

- **publicado e não vende → alerta crítico no topo**, nomeando as modalidades sem
  preço. A lista é exatamente o que falta cadastrar.
- **vende só em parte** (uma modalidade sem preço entre outras que vendem) → aviso,
  porque hoje essa modalidade some da página em silêncio.
- **evento que já passou** → nada. Não vender ali é o esperado.
- **lotes ainda carregando** → `null`, e nenhum alerta é inventado.

O conselho de divulgar foi calado quando a página não vende.

Deixei de fora, de propósito: badge no `EventoShell` (a casca é documentada como
sem query, alimentada por prop — meter uma query ali quebra o contrato dela e os
testes que a montam direto) e badge no hub `/eventos` (uma leitura de lotes por evento
da lista, custo desproporcional ao ganho sobre um alerta crítico na tela em que o
organizador aterrissa).

## Provas, com números

**Apuração em produção (`leela-hub`), leitura pura, nenhuma escrita:**

| | |
|---|---|
| eventos publicados | 6 |
| vendendo | 4 |
| publicados que não vendem | **2** |
| motivo dos 2 | `sem_preco` — sem lote **e** sem percursos |
| legado-only hoje (0 lote, ≥1 percurso) | 0 |

**Replay diferencial** — os 6 documentos reais passados pela régua antiga e pela nova
lado a lado:

```
evento                               antes      depois     R$antes  R$depois  motivo
corrida-inverno-floripa-2026         aberto     aberto     63       63        (vende)
desafio-mtb-costa-lagoa-2026         aberto     aberto     113      113       (vende)
meia-floripa-2026                    aberto     aberto     75       75        (vende)
noturna-beira-mar-2026               encerrado  encerrado  -        -         sem_preco: 5k, 10k
retiro-bem-estar-rio-vermelho-2026   encerrado  encerrado  -        -         sem_preco: Yoga, Bem-estar
teste-taxa-repassada                 aberto     aberto     10       10        (vende)

estado mudou: 0
```

`teste-taxa-repassada` é o único evento de produção com os **dois** modelos ao mesmo
tempo (lote de R$ 10 e percurso de R$ 10). Tem teste travando que o lote vence o
legado — se aquela asserção virar, a correção inverteu a precedência da ADR-012.

**Suítes:** landing 466/466 · painel 1828/1828 · core lint e `tsc` verdes.
12 casos novos na régua, 7 no alerta do organizador.

**Deploy da landing** (`leela-landing` — hosting + `ssrleelalanding`):

| marcador | resultado |
|---|---|
| chunk novo `870-0c99d48b449a785b.js` | 200, e presente no build local |
| chunk antigo `870-26a66b8c1bf5c3ae.js` | 404 |
| fumaça nas 6 rotas de evento + home | 200 |
| diff funcional antes × depois | **vazio** |

O diff vazio é o ponto: a correção subiu sem mexer em nada do que está vendendo. Ela
paga na próxima vez que alguém criar um evento.

## Para decisão do dono

1. **Os dois eventos continuam sem vender, e isso é dado.** `noturna-beira-mar-2026`
   e `retiro-bem-estar-rio-vermelho-2026` não têm preço em modelo nenhum. Precisam de
   lote (ou percurso) cadastrado. Não toquei em produção. Enquanto isso, seguem
   publicados servindo "Inscrições encerradas" — se a decisão for demorar, vale
   despublicar.
2. **O alerta ao organizador está em código, não no ar.** O deploy autorizado era o
   da landing. O painel precisa de uma subida própria para o sinal existir de fato.
3. **`publicarEvento` não exige preço para publicar** (valida `nome`, `data`, `local`,
   `modalidades` e mais nada). Foi assim que os dois eventos chegaram onde estão.
   Fechar essa porta é a família 2 e é decisão de dono — o código e o custo estão
   descritos acima.
4. **Achado lateral:** nenhum arquivo de `apps/painel` chama `publicarEvento`. Não
   existe botão de publicar no painel; `criarEvento` nasce sempre em `rascunho`. Os
   dois eventos de produção chegaram a `publicado` por um caminho que não é a UI.
   Vale saber qual antes de endurecer a regra.
