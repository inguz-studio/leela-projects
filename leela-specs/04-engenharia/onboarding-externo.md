---
tags: [leela, onboarding, validacao-externa, indice]
atualizado: 2026-08-04
---

# Leela · guia para quem vai validar o trabalho

Escrito para um desenvolvedor competente que nunca viu este projeto e cuja função é conferir o que foi construído. Não pressupõe conversa prévia com ninguém da casa. Onde há lacuna, ela está nomeada; onde há defeito conhecido, ele está apontado antes que você o encontre sozinho.

A ordem abaixo é a ordem sugerida de leitura. São seis paradas e uma tarde.

## 1 · O que a Leela é

A Leela é um **hub de experiências de bem-estar**. Vende ingresso para experiência, sustenta clubes e comunidade, cuida da comunicação com quem participa e organiza o controle de vendas de quem produz. Corrida de rua é uma das experiências, e é a que aparece nos dados de exemplo, mas não é a categoria do produto.

Essa distinção é decisão registrada do dono, de 02/08, e vale para toda superfície nova:

> Não quero que a gente remeta 100% a corrida, pois não somos isso, somos um hub de experiências de bem-estar, de wellness, clubs, etc.

O desdobramento prático é de vocabulário, e ele governa código, tela e texto legal. **Experiência** é o termo guarda-chuva; corrida, prova e evento são instâncias dela. **Participante** é quem compra e comparece, no lugar de atleta ou inscrito, sobretudo em texto legal. O registro completo, com as consequências, está em `02-rodadas/2026-08-02-retomada/01-decisoes.md`.

Outras três trocas de vocabulário valem o mesmo peso, porque cada uma nasceu de uma correção: **kit** nunca vira "tier", **credenciamento** substituiu "entrega", e o painel de plataforma é coisa distinta do painel do organizador. Não há glossário consolidado no corpus, e essa é uma lacuna real; o mais próximo é a seção de glossário dentro de [[EXPLICACAO-ONDE-ESTAMOS]], que está desatualizada desde 13/07.

Três públicos usam o produto. Quem **produz** a experiência opera o painel. Quem **participa** compra pela landing pública e recebe o ingresso por e-mail. Quem **administra a plataforma** tem uma área própria, hoje dentro do mesmo endereço do painel, com separação em discussão.

## 2 · Como o sistema está montado

[[arquitetura-do-sistema]] tem o mapa: os três aplicativos, os quatro pacotes compartilhados, a direção das dependências, as 89 functions com as dez agendadas que fazem o produto andar sozinho, e a fronteira do dinheiro, que é a parte que merece mais atenção de quem valida.

Se você só puder ler um arquivo de código antes de tudo, leia `functions/src/index.ts`. Cada export carrega no comentário a regra ou a decisão de arquitetura que o justifica, e ele é a melhor porta de entrada do repositório.

## 3 · As regras de negócio

São 256 regras numeradas. O texto canônico de cada uma vive no épico dono, em `03-canon/epics/`, e [[indice-de-regras-de-negocio]] diz qual épico é dono de qual faixa. Esse índice também lista os três conflitos reais que existem hoje, onde o mesmo número carrega definições diferentes em épicos diferentes. Se você for validar comportamento contra regra, leia os conflitos antes, porque um deles governa 68 citações.

## 4 · Como as decisões foram tomadas

Esta parte confunde quem chega de fora, e a explicação abaixo é a convenção como ela é praticada, não como está escrita nos documentos antigos.

Todo trabalho acontece em **rodadas**. Uma rodada é uma pasta em `02-rodadas/` nomeada `AAAA-MM-DD-assunto`. A data é o dia de trabalho e o sufixo é a frente; várias frentes dividem o mesmo dia, então encontrar seis pastas com a mesma data é normal.

Dentro da pasta, os arquivos são numerados. **O número é ordem de leitura daquela pasta, e não um significado fixo.** Um arquivo de fila de código aparece como `03-fila-codigo.md` numa pasta e como `11-fila-contas-e-area-cliente.md` em outra; os dois são a mesma coisa. Uma pasta chega a ter dois ciclos completos, com duas rodadas de regras e duas de fila.

O que se repete é a espinha, e são três degraus na mesma ordem:

| Degrau | Nome típico | O que guarda |
|---|---|---|
| decisão | `01-decisoes.md` ou `01-decisoes-delta.md` | o que o dono decidiu, com o verbatim dele |
| regra | `02-rns-delta.md` | só o delta de regras daquele dia, apontando para o épico |
| execução | `03-fila-codigo.md` | as tarefas que a decisão gerou |

O sufixo `-delta` no arquivo de decisões não é evolução no tempo: ele marca o tipo de rodada. Rodada de dia inteiro com o dono usa `01-decisoes.md`; frente específica usa `01-decisoes-delta.md`. Os dois convivem na mesma data.

Um aviso para não perder tempo: [[HOME]] e [[CONVENCAO-BOARDS]] descrevem um esquema de seis arquivos, de `00-review` a `05-rns-delta`. **Uma única pasta em dezessete segue esse esquema**, justamente aquela de que ele foi extraído. A prática divergiu no dia seguinte e nunca voltou.

Decisão em aberto e decisão fechada moram em lugares diferentes, de propósito. O que ainda depende do dono está em [[DECISOES-ABERTAS]], que é o painel único: quando um item é resolvido, ele **sai** do painel e o registro completo passa a viver no arquivo da rodada. Não há marca de estado, porque estar no painel já significa estar aberto. Decisões fechadas ganham código `D-AAAA-N` e vivem nas rodadas.

As decisões de arquitetura seguem outra trilha e ficam em `03-canon/adr/`, com dez registros. O acompanhamento por épico e por história está em `00-boards/`.

## 5 · Como verificar que funciona

[[como-verificar]] traz os comandos para subir o projeto, rodar cada gate e entender o alcance de cada suíte. Leia até o fim, porque a parte que importa está lá: o que os gates **não** provam, medido e argumentado em [[laudo-testes-2026-08-04]].

O resumo em uma frase: o projeto tem perto de 6.840 casos verdes, a garantia é sólida no núcleo puro e nas regras de acesso ao banco, e é fraca nas três fronteiras onde o dinheiro passa. A compra em produção não funcionou até 03/08, e os defeitos passaram por gate verde.

## 6 · O estado real

[[estado-real]] separa o que está no ar do que está construído e fora do ar, e lista a dívida conhecida com a forma de observar cada item. [[catalogo-de-emails]] faz o mesmo para as oito mensagens que o produto envia, com o gatilho de cada uma.

Duas coisas convém saber antes de abrir qualquer tela. O painel do organizador nunca foi publicado no canal de produção, e o botão "Entrar" da landing pública leva hoje a uma página de erro do Firebase. E a identidade visual dos e-mails, construída na madrugada de 04/08, ainda não foi deployada.

## O que este corpus não tem

Vale saber onde não procurar. Não existe glossário consolidado. Não existe documento de contribuição que descreva como abrir uma rodada, além do que está explicado acima. De runbook há dois, ambos nesta pasta e ambos nascidos de incidente real: [[runbook-email-transacional]] e [[runbook-expurgo-lgpd]]. Guia de troubleshooting geral continua não existindo.

O `README.md` de `leela-specs/` está desatualizado e se contradiz dentro do próprio arquivo sobre a contagem de épicos; a seção de decisões em aberto dele lista questões resolvidas há semanas, entre elas a escolha do gateway de pagamento, que já está em produção. O `KICKOFF-BUILD.md` é um prompt de construção de projeto novo, escrito antes da reorganização de 18/07, e aponta para caminhos que já não existem. Ambos ficam no lugar por enquanto; nenhum dos dois deve ser usado como fonte.

A navegação do corpus é hub e raio, sem caminho de volta: cerca de dois terços dos arquivos não são alcançáveis clicando a partir da [[HOME]]. As pastas de rodada mais recentes e as fichas de história do backlog são as maiores ilhas. Quem for explorar deve contar com busca por texto e com as tags do frontmatter, não só com os links.

## Mapa rápido das pastas

| Pasta | O que guarda |
|---|---|
| `00-boards/` | acompanhamento vivo por épico, história e tarefa |
| `01-produto/` | visão, roadmap e o painel de decisões em aberto |
| `02-rodadas/` | uma pasta por rodada de trabalho, com decisões, deltas de regra e filas |
| `03-canon/` | fonte durável: épicos, ADRs e o índice de regras |
| `04-engenharia/` | qualidade transversal, arquitetura, e estes documentos |
| `05-discovery/` | pesquisa, benchmarks e pareceres |
| `06-backlog/` | uma ficha por história |
| `99-arquivo/` | histórico congelado, que não deve ser lido como vigente |
