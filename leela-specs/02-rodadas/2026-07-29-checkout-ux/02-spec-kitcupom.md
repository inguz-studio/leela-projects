---
tags: [leela, rodada, spec, kit, galeria, cupom, afiliado, assessoria, checkout]
aliases: ["SPEC-KITCUPOM · decisões e premissas", "D-KC-1..D-KC-12"]
trace: leela-build-2d6ee98d
lote: SPEC-KITCUPOM
data: 2026-07-29
---

# Galeria do kit e cupom pré-aplicado · decisões da spec

Delta de spec das duas features que o dono decidiu na segunda leva da DEC-0729: a
**D-0729-4** (kit com até três fotos, uma principal) e a **D-0729-5** (link de afiliado ou
assessoria que chega no checkout com o desconto já computado). Zero código de aplicação nesta
rodada. RNs em `03-rns-kitcupom.md`, fila de build em `04-fila-kitcupom.md`.

## O que o inventário mudou no enunciado

Antes das decisões, três fatos lidos no repo que alteram o tamanho de cada metade.

**O auto-apply de cupom por URL já existe.** O `CheckoutFlow` tem o efeito A-2: quando o
checkout recebe `?cupom=`, ele tenta o código na primeira cotação possível, e se o código não
colar levanta um aviso honesto e segue sem cupom. A metade "cupom" do pedido do dono não é uma
máquina nova. É um link que nunca carregou o cupom, mais a comunicação que falta: o banner e a
marca no valor.

**O link master de hoje não entrega nada.** `ATRIBUICAO_KEYS` preserva a chave `c` da página do
evento até o checkout, e nenhum arquivo do repo lê `c`. O seed grava
`parceria.linkMaster = 'beh.ro/mfl26?c=frc'`. Então o link que a assessoria compartilharia hoje
não aplica cupom, não atribui conversão e ainda aponta para `beh.ro`, o domínio dos mocks Be
Hero que a RN-423 acabou de expulsar do e-mail da compra.

**A pergunta da comissão já tem resposta em produção, e ela não é neutra.** No
`createInscricaoCharge`, cupom de afiliado vence `?ref=`, e quando o cupom aplicado pertence a
outro afiliado o instante do clique original é descartado. Um cupom digitado à mão por cima do
link transfere a comissão. Isso é comportamento vigente. A spec ratifica e escreve; não inventa
regra nova nem cria um segundo caminho.

---

## Parte A · Galeria do kit (D-0729-4)

### D-KC-1 · A principal continua sendo `imagemUrl`; nasce só o resto da galeria ⇒ RN-425

O kit passa a ter até três fotos com esta forma:

```
Kit {
  imagemUrl?: string          // A PRINCIPAL — campo que já existe (RN-227)
  fotosSecundarias?: string[] // até 2 URLs, ordem = ordem de exibição
}
```

A alternativa óbvia seria criar um `fotos[]` com um sinalizador `principal` em cada entrada. Ela
foi rejeitada por deixar representável o que o dono proibiu: uma lista de sinalizadores admite
zero principais e admite duas, e aí a invariante "exatamente uma" vira validação repetida em
cada superfície, com deriva garantida no primeiro caminho que esquecer de checar. Aqui a
invariante não é validada, é estrutural: existe um campo só para a principal, então não há como
haver duas.

A segunda alternativa, um `fotos[]` em que a posição zero é a principal e o `imagemUrl` vira
espelho, também caiu. Espelho é dado duplicado, e dado duplicado deriva: bastaria um caminho
gravar `imagemUrl` sem tocar a lista para o site exibir uma foto que não está na galeria.

O ganho de compatibilidade é consequência, não objetivo. Documento antigo continua parseando sem
uma linha de migração, e **toda** superfície que hoje lê `imagemUrl` (a seção de kits da landing,
o card do checkout, o `kitImagem.ts`, o `KitsSection`, o `StepModalidadeKit`) segue funcionando
sem alteração, porque para elas nada mudou.

Leitura no padrão Postel do campo decorativo, igual ao `normalizarItensKit` que já está no
`kit.ts`: entrada que não é lista vira `[]`, URL que não passa em `isUrlImagemKitValida` é
descartada, URL repetida da principal é descartada (mostrar a mesma foto duas vezes é defeito
visível), e o corte é em duas entradas. Documento envenenado nunca derruba o checkout público.

O acessor canônico é `fotosDoKit(kit)`, que devolve a principal primeiro seguida das
secundárias, ou lista vazia quando não há principal. Toda superfície nova lê por aqui.

### D-KC-2 · A principal manda no site; a galeria mora no detalhe ⇒ RN-426

Listagem, card e qualquer lugar onde o kit aparece ao lado de outros usam **só a principal**.
O detalhe do kit no checkout mostra a galeria inteira: a principal grande, as secundárias como
miniaturas, clique troca a foto grande, e o lightbox que já existe amplia a que estiver em foco.

As miniaturas usam o `Thumb` do design system, que já está exportado. Nenhum componente novo de
DS entra por esta feature.

Sobre a proporção 1:1 da RN-227, uma correção honesta antes da regra: **nada no produto valida
1:1 hoje**. O `isUrlImagemKitValida` só olha a URL, e as Rules de Storage registram a limitação
por escrito ("Rules não decodificam imagem"). O 1:1 é dica no painel e enquadramento no CSS. A
regra, então, é de enquadramento: as três fotos são renderizadas dentro de moldura quadrada com
recorte por cobertura, de modo que uma foto fora de esquadro é cortada e nunca deforma a grade.
Isso vale igual para principal e secundárias, e é o que o produto consegue garantir de verdade.

### D-KC-3 · Três slots no painel, e "tornar principal" é uma troca ⇒ RN-427

O `KitEditor` ganha três posições. A primeira é a principal, as outras duas são as secundárias.
Cada posição tem enviar, trocar e remover, reusando o `FileInput` do DS e a semântica de payload
que o editor já tem (`undefined` significa campo não tocado, `null` significa removido).

"Tornar principal" na posição 2 ou 3 **troca** o conteúdo com a posição 1. Nunca copia. A troca
é uma função pura no core (`promoverFotoPrincipal`), testada uma vez e reusada por qualquer
superfície futura, porque a operação é a única maneira de a invariante da D-KC-1 ser violada por
descuido.

Remover a principal quando existem secundárias promove a primeira secundária. Um kit não pode
ficar com galeria sem principal, pelo mesmo motivo de antes: é um estado que as listagens não
sabem exibir.

No Storage, a principal continua no objeto de nome fixo que já existe hoje
(`eventos/{eventoId}/kits/{kitId}`) e as secundárias ganham dois slots literais em
`eventos/{eventoId}/kits/{kitId}/fotos/{slot}`, com `slot` limitado a `2` e `3` nas Rules. Duas
propriedades da RN-227 sobrevivem intactas: nome de objeto fixo significa que reenviar sobrescreve
e nunca deixa órfão, e não existe nome de arquivo livre. E uma propriedade nova aparece de graça:
o teto de três fotos passa a ser estrutural também no Storage, não só combinado no aplicativo.

### D-KC-4 · A simulação é app-side; o seed não ganha URL de foto ⇒ RN-428

O pedido do dono é ver kits com três fotos no meia-floripa. O caminho literal, seedar as URLs,
esbarra em duas coisas escritas no repo: a guarda exige http(s) e rejeita caminho relativo, e a
lição LEELA-R14 está no cabeçalho do `preview-seed-r14.ts` ("NÃO seedamos `imagemUrl`, a landing
resolve app-side"). Seedar URL absoluta amarraria a demonstração à porta do preview e quebraria
no primeiro deploy.

A simulação entra onde a cascata de imagem já mora, no `kitImagem.ts`, como um quarto degrau da
mesma lógica: em PREVIEW, kit sem secundárias recebe duas fotos extras determinísticas do acervo
local que já existe (`KITS_MOCK`); em PRODUÇÃO, kit sem secundárias mostra apenas a principal.
Página de verdade nunca exibe foto que o organizador não subiu, que é exatamente a honestidade
de superfície que o terceiro degrau da cascata já defende hoje.

### D-KC-5 · O bucket de Storage é dependência herdada, não nova

O ambiente online não tinha bucket (pendência 3 do dono no handoff DEPLOY-PREVIEW), então upload
de imagem de kit já falhava lá, com uma foto. A galeria não cria dependência: herda a mesma.
Modelo, painel, superfícies públicas e a simulação de preview são construíveis e demonstráveis
sem bucket; o que ficava bloqueado era exclusivamente o upload real, para a primeira foto e para
as outras duas, sem diferença.

**Atualização durante esta lane (commit `78810ee`).** Outra lane criou o bucket padrão
(`leela-hub.firebasestorage.app`, `southamerica-east1`, mesma região do Firestore). A pendência
que esta decisão registrava está **resolvida**, e a frente da galeria deixa de nascer com upload
bloqueado. Duas consequências entram na fila em vez de sumirem: o bucket recém-criado ainda não
teve upload real provado ponta a ponta (o próprio commit declara isso), e a `S212-T1` acrescenta
um bloco de Rules a um caminho que faz `firestore.get` cross-service, agora com latência real de
região a favor. O que muda na spec é só o rótulo da dependência, de bloqueio para verificação.

---

## Parte B · Cupom pré-aplicado por link (D-0729-5)

### D-KC-6 · O link é gerado, nunca digitado ⇒ RN-429

O link compartilhável de afiliado e de assessoria passa a nascer de um gerador único, com a forma

```
{base pública}/{slug do evento}?ref={refCodigo}&cupom={CÓDIGO}
```

onde a base é a mesma base única por ambiente que a RN-423 estabeleceu, `ref` é o `refCodigo` que
já é o docId do afiliado, e `cupom` é o `cupomCodigo` vinculado, quando existe. Sem cupom
vinculado, o link sai só com `ref` e continua rastreando conversão, que é o comportamento de hoje.

Duas coisas morrem aqui. O `linkMaster` deixa de ser texto livre digitado por alguém e passa a
ser derivado, no painel do afiliado (E08) e no da parceria de assessoria (E18), pelo mesmo
gerador. E `beh.ro` some de mais um lugar.

A chave `c`, que hoje é preservada e não é lida por ninguém, continua **aceita na entrada** como
apelido de `cupom`, e nunca é gerada na saída. Postel aplicado com um motivo específico: link de
afiliado vive impresso em biografia de rede social e em material que já foi distribuído, e matar
uma chave em silêncio significa perder venda de alguém que já divulgou. Custa três linhas manter,
custa dinheiro não manter.

### D-KC-7 · O cupom do link atravessa a jornada como o `?ref=` já atravessa ⇒ RN-430

Hoje há uma assimetria: o `RefTracker` guarda o `?ref=` por evento com regra de precedência
escrita, e o cupom sobrevive apenas porque o CTA copia a querystring para o checkout. Quem chega
pelo link, navega para a página do regulamento e volta, mantém a atribuição e **perde o desconto**.

O cupom passa a ser capturado e guardado com a mesma disciplina do `ref`, na mesma chave por
evento, reusando o formato e a degradação que o `RefTracker` já implementa. A precedência é a
espelhada da atribuição: mesmo código revisitado preserva a captura mais antiga, código diferente
sobrescreve.

O valor guardado é claim do cliente, e a spec não afrouxa isso em nada. Quem decide se o cupom
existe, se está vigente, se o gate do afiliado está aberto e quanto ele desconta continua sendo o
servidor, na cotação e de novo na criação da cobrança.

### D-KC-8 · Uma porta a mais para o mesmo mecanismo, e nenhum número novo ⇒ RN-430

O auto-apply é a segunda porta do cupom, ao lado do campo manual do step 0 da S1209. Não existe
segundo caminho de desconto. As duas portas terminam no mesmo `cupomCodigo` enviado à mesma
cotação, com a mesma recusa e a mesma mensagem opaca quando o código não se aplica.

O "(desconto aplicado)" que o dono pediu é marca de exibição na linha de desconto do resumo, não
cálculo. O valor exibido continua vindo inteiro da cotação, e a regra inviolável do checkout
permanece: a interface renderiza o número do servidor e não soma um centavo. Quando o cupom veio
do link, a marca diz isso; quando veio do campo manual, o `CupomCampo` já mostra "Cupom X
aplicado" e nada muda ali.

### D-KC-9 · O banner anuncia, e cala quando não tem o que anunciar ⇒ RN-431

Logo após a Hero da página do evento, quando a URL traz um cupom que se aplica, aparece a faixa
com o texto do dono: "Você tem desconto neste evento, CUPOM XXXXXX de Fulano aplicado". Quando o
cupom não se aplica, por não existir, estar expirado, ter esgotado o teto, ou por ser de escopo
que aquele visitante não satisfaz, **o banner simplesmente não aparece**.

O erro honesto continua existindo, no lugar onde a pessoa realmente tenta usar o cupom: o
checkout, onde o `erroCupomUrl` já mostra o aviso hoje. Escancarar na landing um erro que o
visitante não causou pune quem só clicou num link vencido de terceiro, e queima o tráfego do
afiliado sem devolver nada em troca. O dono pediu exatamente isso: jornada segue normal, sem erro
agressivo.

Sobre o "de Fulano": quando a origem é assessoria ou clube, o nome exibido é o da entidade, que já
é público. Quando é pessoa física, o nome exibido é o `nome` que o organizador cadastrou. Isso é
premissa vetável e está registrada abaixo, porque significa expor publicamente o nome de um
afiliado a quem apresentar o código. O argumento a favor é que ser creditado é o propósito do
link do promotor. Sem nome resolvível, o banner degrada para "CUPOM XXXXXX aplicado" e continua
útil.

### D-KC-10 · A verificação do banner roda no servidor e responde igual para todo mundo ⇒ RN-432

A leitura de cupom é fechada por design: as Rules restringem cupom ao organizador, com o motivo
escrito no `cupom.ts` ("enumerar cupons = vazar descontos"). O banner não pode, então, ler cupom
no cliente.

Ele é alimentado por uma verificação server-side na própria landing, pelo caminho que já é
doutrina da casa desde a S1200-T2: Admin SDK no servidor, gate de autorização no código, Rules
intocadas. A página do evento continua estática, e o banner entra como componente de cliente atrás
de Suspense, exatamente como o `RefTracker` e o `CtaInscricao` já fazem com `searchParams`.

A resposta é mínima e uniforme. Ela diz se o cupom se aplica e, quando se aplica, devolve o rótulo
para a faixa. Cupom inexistente, expirado, esgotado, de escopo não satisfeito e evento errado
devolvem a **mesma** resposta, sem distinção, seguindo a lição do S1802 e a mensagem opaca que o
`createInscricaoCharge` já usa ("Cupom indisponível"). Nenhum valor de desconto sai para código
que não se aplica.

Honestidade sobre o que isso é: a `cotarInscricaoCheckout` já responde a chamador anônimo se um
cupom cola, então esta verificação não abre uma classe nova de vazamento. Ela abre um canal mais
barato, porque dispensa montar uma cotação inteira, e acrescenta o nome do promotor. As duas
diferenças estão declaradas como vetor de review.

### D-KC-11 · A atribuição não é tocada, e o desempate fica escrito ⇒ RN-433

O que **não** muda, item por item: a precedência cupom de afiliado sobre `?ref=`; o campo `origem`
que registra qual das duas venceu; o gate da RN-315, em que o link rastreia conversão mas o
desconto só ativa depois do mínimo de inscrições, sem retroativo; o clamp do instante do clique;
a janela de atribuição de sete dias do meia-floripa e a re-checagem autoritativa na confirmação; o
contador de usos escrito só por Function; o percentual de comissão; e a resolução de parceria
ativa dos cupons de escopo `club_parceiro` do E18.

O que passa a estar escrito é o desempate que hoje só existe no código. Quando a pessoa chega pelo
link do afiliado A e digita à mão o cupom do afiliado B, **B leva a comissão**, porque o cupom
aplicado é sinal mais forte que o clique, e o instante do clique de A é descartado. Quando o cupom
digitado não pertence a afiliado nenhum, o `?ref=` de A sobrevive e A leva a comissão, ficando sem
o crédito do desconto. Ratificar é a decisão; qualquer outro arranjo mexeria no kernel de dinheiro
para resolver um caso de borda que o produto ainda não viu acontecer.

### D-KC-12 · Anti-abuso mínimo, sem inventar defesa que o repo não tem

Código de cupom compartilhado em link é público por natureza, e o produto já tem os dois freios
que importam: o teto de usos, que limita o estrago, e o gate do afiliado, que segura o desconto até
o mínimo. O link não concede privilégio nenhum além de preencher um campo que qualquer pessoa
poderia digitar.

O abuso que a feature realmente acrescenta é raspar a verificação do banner para descobrir códigos.
As defesas são as que cabem no repo hoje, e nenhuma a mais: resposta uniforme para toda falha,
cache curto por código na borda, de modo que força bruta bata em cache e não no Firestore, e
resposta que não entrega nada que a cotação anônima já não entregue. Limite por endereço de origem
não existe no ferramental atual e a spec não vai fingir que existe. Fica declarado como vetor de
review e como candidato de fila, não como regra cumprida.

---

## Premissas assumidas, vetáveis (maior peso primeiro)

| # | Premissa | Custo de vetar depois | RN |
|---|---|---|---|
| P1 | A principal continua no campo `imagemUrl` e as outras duas vão num campo separado. Não há `fotos[]` unificado nem sinalizador de principal | Vira migração de documento e reescrita de todas as leituras de `imagemUrl` na landing, no checkout e no painel | RN-425 |
| P2 | A comissão do desempate segue o código: cupom manual de outro afiliado rouba a atribuição do link | Mexer no kernel de dinheiro do `createInscricaoCharge`, com review antagonista própria | RN-433 |
| P3 | O nome da pessoa física afiliada aparece no banner público para quem tiver o código | Banner passa a nomear só clube e assessoria; texto degrada para "CUPOM X aplicado" | RN-431 |
| P4 | O banner some quando o cupom não se aplica, em vez de avisar na landing | Precisa de um estado de erro público e da decisão de quanto contar sem virar oráculo | RN-431 |
| P5 | A verificação do banner roda no servidor da landing com Admin SDK, sem Function nova | Vira Function própria, com custo de invocação e mais uma superfície pública para revisar | RN-432 |
| P6 | A chave `c` continua aceita na entrada como apelido de `cupom` | Link já distribuído com `?c=` para de aplicar desconto silenciosamente | RN-429 |
| P7 | A simulação de galeria é app-side e só em preview; produção sem foto extra mostra só a principal | Volta a discussão de seedar URL, que a lição R14 já resolveu uma vez | RN-428 |
| P8 | Teto de três fotos, dois slots literais no Storage | Teto vira número configurável, com nome de objeto livre e risco de órfão | RN-427 |
| P9 | Sem validação de proporção 1:1; a garantia é enquadramento por recorte | Precisa decodificar imagem em algum lugar, o que nem as Rules nem o core fazem hoje | RN-426 |
| P10 | O cupom do link é guardado por evento com a mesma regra do `?ref=` | Cupom continua morrendo em qualquer navegação fora do CTA | RN-430 |
| P11 | Remover a principal promove a primeira secundária | Kit pode ficar com galeria e sem foto de listagem | RN-427 |
| P12 | O `linkMaster` passa a ser derivado e some como campo digitável | Convive o texto livre com o gerado, e volta o `beh.ro` pela porta dos fundos | RN-429 |

As quatro primeiras mudam desenho se caírem. As outras oito podem ser vetadas sem refazer a spec.

## Dependências e o que fica fora

- **Bucket de Storage no ambiente online:** era decisão do dono e foi RESOLVIDA em 29/07 pelo commit `78810ee` (bucket padrão em `southamerica-east1`). Registrada na D-KC-5. Deixou de bloquear
  upload; nunca bloqueou o build da galeria. Resta provar um envio real no bucket novo.
- **Base pública por ambiente:** já entregue pela RN-423; a geração do link a consome.
- **Fora desta spec:** os treze achados da primeira leva da DEC-0729, que são da lane CHECKOUT-UX;
  o painel `DECISOES-ABERTAS.md`, que é do maestro; e qualquer alteração no cálculo de preço, de
  taxa ou de comissão.
