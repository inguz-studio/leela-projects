---
tags: [leela, rodada, spec, perfil, produtor, feed, clubs]
aliases: ["SPEC-PRODUTOR-PAGE · B10", "D-ACH-15..D-ACH-21"]
trace: leela-build-2d6ee98d
lote: SPEC-ACHADOS-0802
data: 2026-08-02
---

# A página do produtor como mini rede social · decisões da spec

Mini-spec do achado **B10** da DEC-0802B. Verbatim do dono: *"já para a página dos produtores,
reduza o tamanho dos botoes de rede sociais para os icones de rede social, e coloque um menu
secundário para visualização de Feed, Eventos e Clubs, como se fosse uma mini rede social."* Veto
colhido na hora: **o feed nasce mockado para o tester**.

Zero código de aplicação nesta rodada. RNs em `05-rns-achados.md` (RN-443, RN-444, RN-445), fila
de build em `07-fila-achados.md`, lane própria **PRODUTOR-PAGE**.

## O que o inventário mudou no enunciado

**A página não tem pasta própria.** Não existe rota `produtor`, `organizador` nem `promotor`. O
perfil público é servido pela **mesma rota do evento**, desambiguada pelo prefixo `@`:
`app/(public)/[eventSlug]/page.tsx` decodifica o segmento, e um segmento que começa com `@` vira
handle e carrega o perfil em vez do evento. A view inteira é um arquivo só,
`app/(public)/_perfil/PerfilView.tsx`, com todas as seções em funções locais. Isso é bom para esta
frente: o trabalho é concentrado e não espalha território.

**As três abas já são task canônica, e nunca foram executadas.** A `LEELA-S1700-T2` do E17 pede,
com estas palavras, "componentes das 3 abas (Feed leitura · Eventos · Clubs) + navegação por
aba". O que existe hoje achatou as três em seções empilhadas. O pedido do dono não abre frente
nova: ele cobra uma task que o épico já tinha e que a entrega anterior encurtou.

**"Botão de rede social" não existe no modelo.** O que a página renderiza são `linksExternos`, uma
lista de até cinco pares `{label, url}` com rótulo livre digitado pelo organizador, exibidos como
pílulas de texto de largura inteira, empilhadas. Não há campo `rede`, não há enumeração, e o seed
prova o uso: o "Instagram" do perfil de exemplo é uma string de rótulo, não um tipo.

**O design system não tem ícone de marca.** Nenhum. A fonte de ícones da landing é o `lucide`, que
cobre Instagram, Facebook, Twitter, YouTube, LinkedIn, GitHub e Twitch, e **não** cobre WhatsApp,
TikTok, Strava, Threads nem Telegram. Para um produtor de experiências, os dois que mais importam
são Instagram e WhatsApp, e o segundo é justamente um dos que faltam.

**O feed é terreno virgem; os clubs têm dado real e nenhum destino.** Não existe modelo de post,
nem Rules, nem leitor, nem Function: a seção de feed da página é um estado vazio escrito à mão. Os
clubes, ao contrário, têm modelo, visibilidade e leitura pública funcionando — mas o card é um
elemento sem link, porque não existe página de clube na landing para onde levar.

---

## D-ACH-15 · O menu secundário é o `Tabs` do design system, com as seções ainda vindas do servidor ⇒ RN-443

As três seções que hoje se empilham passam a ser três abas: **Feed**, **Eventos**, **Clubs**.

O primitivo é o `Tabs` do design system, que já existe, já mantém os painéis inativos no documento
e já entrega a fiação de acessibilidade de fábrica. Nenhum componente novo de DS entra por esta
feature. O `SubNav`, que é o outro candidato, foi rejeitado: ele é navegação **entre rotas**, e usá-lo
aqui significaria ou uma rota por aba, ou parâmetro de consulta na URL — e parâmetro de consulta
tira a página do regime estático que ela tem hoje, trocando uma troca de aba instantânea por uma
ida ao servidor.

A restrição de arquitetura é real e tem solução conhecida na casa: `PerfilView` é componente de
servidor puro e o `Tabs` é componente de cliente. As três seções continuam sendo **renderizadas no
servidor** e entram no `Tabs` como conteúdo, pelo mesmo padrão de fronteira que o repositório já
usa para o diálogo do regulamento e para o bloco de aceites. O que vai para o cliente é a troca de
aba, e só ela.

Consequência que essa escolha preserva: as três abas ficam no documento entregue, então o conteúdo
continua indexável e alcançável pela busca da página. Uma aba que só existe depois de um clique
esconderia os eventos do produtor de quem chega por busca, que é o oposto do que um link na bio
serve para fazer.

## D-ACH-16 · A aba inicial é Eventos ⇒ RN-443

Eventos é o conteúdo com valor transacional e é o que a página entrega hoje, com timeline de
próximos e de já acontecidos. Abrir no Feed levaria todo visitante a um estado vazio em produção,
e o link do produtor circula justamente para vender inscrição.

Quando o feed real existir, a aba inicial volta a ser decisão, não default. Até lá, abrir em
Eventos é o único arranjo que não piora a página.

## D-ACH-17 · Os links viram ícones por inferência do endereço, sem campo novo ⇒ RN-444

A fileira de pílulas de texto vira uma fileira de ícones. A rede é reconhecida pelo **endereço** do
link, no servidor, com um mapa de domínio para ícone.

Gravar a rede num campo novo do perfil foi rejeitado por custo desproporcional: um campo
`rede` atravessaria o modelo, a validação, a projeção pública (que é allowlist, não espalhamento),
a Function de escrita e o editor do painel, para produzir a informação que o endereço já carrega.
A inferência custa uma função pura e é testável isoladamente.

Postel em toda a leitura: endereço que não casa com nenhuma rede conhecida recebe um ícone
genérico de link e **continua aparecendo**. O rótulo que o organizador digitou permanece como nome
acessível do ícone, então a informação não é perdida na redução — ela sai do rótulo visível e vai
para o nome acessível e para a dica.

O editor do painel não muda. O organizador continua cadastrando rótulo e endereço como sempre; o
que muda é como a página pública os apresenta.

## D-ACH-18 · Os três ícones que faltam entram como SVG local ⇒ RN-444

WhatsApp, TikTok e Strava não existem no `lucide` e são exatamente os que um produtor de
experiências de bem-estar usa. Eles entram como um conjunto pequeno de SVGs no próprio aplicativo,
ao lado do mapa de inferência, dimensionados pelos mesmos tokens dos demais.

É a única peça de asset desta frente e está marcada como premissa vetável. O default é incluir,
porque cair num globo genérico bem no ícone do WhatsApp reprova o pedido do dono na única parte
dele que é visual.

## D-ACH-19 · O feed é mock rotulado em preview e vazio digno em produção ⇒ RN-445

Veto do dono já colhido: o feed nasce mockado para o tester. A simulação entra pelo degrau de
preview que a casa já usa em imagem de kit, em patrocinador e em galeria — a mesma função que
responde se a execução é de preview, o mesmo princípio de que dado real sempre vence mock.

Em preview, o feed mostra alguns itens de exemplo, **rotulados como exemplo**, no vocabulário da
D-0802-1: experiência e participante, nunca corrida como categoria. Em produção, sem publicação
real, ele mostra estado vazio digno, com uma frase que diz o que vai aparecer ali e não pede
desculpa.

Página de verdade nunca exibe conteúdo que o produtor não publicou. É a mesma honestidade de
superfície que a cascata de imagem já defende.

## D-ACH-20 · O card de clube não ganha clique enquanto não houver destino ⇒ RN-443

Os clubes têm dado real e o card é hoje um elemento sem link, porque não existe página pública de
clube. Promover a lista a aba deixa esses cards mais visíveis, e visibilidade sem destino vira
frustração.

Enquanto a página de clube não existir, o card não recebe afordância de clique: sem cursor de
link, sem realce de foco de navegação, sem elevação ao passar o ponteiro. Ele informa nome,
categoria, modalidade e número de participantes, e não promete o que não pode cumprir.

Quando a página de clube nascer, o card vira link numa linha. A regra existe para que ninguém a
transforme em link antes disso.

## D-ACH-21 · O que fica fora, e o nome do que vem depois

**Publicação real de feed é épico futuro, e ele já está especificado.** O E17 descreve a coleção de
posts do perfil com autor, texto, mídia opcional, tipo e visibilidade; a RN-163 já define que o
feed público é leitura e que a composição é do dono do perfil; e o próprio épico registra que o
modelo de feed do clube e o do perfil precisam sair no mesmo lote para não colidirem. Esta spec
**não** especifica nada disso: ela consome o estado vazio e o mock, e aponta o épico.

Também ficam fora: tema por conta, aba de feed no aplicativo, curtida, comentário, seguidor e
qualquer escrita a partir da página pública. Nenhuma delas é pré-requisito do que o dono pediu.

**Uma consequência a verificar, com o registro corrigido.** A investigação do PIX achou um índice
composto faltando em produção, e a página do perfil era uma das vítimas. Esse índice era o de
**parcerias**, que alimenta a faixa de patrocinadores, e ele foi criado por outra lane no meio
desta rodada (`597d499`). O que **não** foi conferido é a outra consulta que a mesma página faz:
eventos por tenant e por status, que hoje não tem índice composto declarado — o único índice de
eventos no arquivo é por tenant, organizador e data.

Isso pode estar funcionando por combinação de índices de campo único, que o Firestore faz para
filtros de igualdade, e pode não estar. A frente do B10 não cria essa dependência, mas é a primeira
a promover a lista de eventos a aba com nome próprio, e uma aba "Eventos" vazia por falta de índice
é pior do que uma seção vazia. A fila trata isso como **verificação com correção condicional**, não
como fato: medir a consulta e só declarar o índice se ela reprovar.

---

## Premissas assumidas, vetáveis

Continuam a numeração da rodada, que começa em `04-spec-achados.md`.

| # | Premissa | Custo de vetar depois |
|---|---|---|
| P15 | O menu secundário é aba na própria página, não rota por aba | Vira uma rota (ou parâmetro) por aba, e a página sai do regime estático |
| P16 | A aba inicial é Eventos | Uma linha, enquanto o feed for vazio em produção |
| P17 | A rede é inferida do endereço do link, sem campo novo no perfil | Campo novo em modelo, validação, projeção pública, Function e editor do painel |
| P18 | WhatsApp, TikTok e Strava ganham SVG próprio no aplicativo | Os três caem no ícone genérico de link |
| P19 | O feed mockado do preview é rotulado como exemplo | Uma linha; sem o rótulo, o tester pode ler mock como conteúdo real |
| P20 | O card de clube continua sem clique até existir página de clube | Vira link para uma rota que não existe |

## Dependências

- **Sequenciamento.** A lane PRODUTOR-PAGE roda **depois** da ACHADOS-0802 e não disputa território
  com ela: o checkout e a página do evento ficam de um lado, o perfil do outro. O único arquivo
  compartilhado com outras lanes vivas é o leitor da landing, e a frente B da KITCUPOM-BUILD já o
  toca — por isso a PRODUTOR-PAGE não entra antes de ela aterrissar.
- **Consulta de eventos por tenant e status**, sem índice composto declarado. Verificação
  condicional na fila, não pré-requisito assumido. O índice de parcerias, que era o defeito real
  apontado pela investigação do PIX, já foi criado por outra lane (`597d499`).
- **Fora desta spec:** publicação de feed, tema por conta, página pública de clube e as abas no
  aplicativo. Todas nomeadas acima, nenhuma especificada aqui.
