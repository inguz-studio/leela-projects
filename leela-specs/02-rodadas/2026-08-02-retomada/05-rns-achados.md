---
tags: [leela, rn, rodada, checkout, taxa, parcelamento, aceites, perfil]
aliases: ["RNs dos achados do dono 2026-08-02", "RN-434..445"]
trace: leela-build-2d6ee98d
lote: SPEC-ACHADOS-0802
data: 2026-08-02
---

# RNs dos achados da DEC-0802B · RN-434 a RN-445

## Faixa e prova de não colisão

A série 4xx é a da plataforma. O E16 introduziu RN-400 a RN-410, a SPEC-ONBOARD consumiu
RN-411 a RN-417, a SPEC-INGPAGE consumiu RN-418 a RN-424 e a SPEC-KITCUPOM consumiu RN-425 a
RN-433. Varredura em 2026-08-02, na árvore inteira, com arquivos ocultos e ignorados incluídos,
fora de `node_modules`, `.git`, `.next`, `functions/lib`, `.turbo`, `.emulator-data`, `.firebase`
e do `pnpm-lock.yaml`:

```
rg -n --hidden --no-ignore 'RN-4(3[4-9]|[45][0-9]|60)' .
→ leela-specs/02-rodadas/2026-07-29-checkout-ux/03-rns-kitcupom.md:25:
  "**Faixa consumida aqui: RN-425 a RN-433.** RN-434 em diante segue livre, e"
```

Hit único, e é a própria frase que declarou a faixa livre. **RN-435 a RN-460: zero ocorrências.**
Maior RN definido na sequência corrente hoje: **RN-433** (`LEELA-E08-influenciador.md:728`). A
primeira faixa contígua livre vai de **RN-434 a RN-819** — o próximo número ocupado acima de 433 é
o RN-820, do bloco de analytics do E11, que é namespace separado e antigo.

**Faixa consumida aqui: RN-434 a RN-445.** RN-446 em diante segue livre.

Ids de story mintados: **`S1216`**, **`S1217`** e **`S1218`** no E12, **`S314`** no E04 e
**`S1707`** no E17. Varredura de colisão em `leela-specs/`, `apps/`, `functions/src` e
`packages/*/src`: `S1216`-`S1230` tem dois hits e os dois são prosa de varredura anterior, nenhum
id real; `S314`-`S330` e `S1707`-`S1725` têm zero hits. Duas armadilhas evitadas por conferência,
não por estimativa: a faixa `S307`-`S313` do E04 está ocupada em código de produção, e o `S1706`
do E17 existe fora dos cabeçalhos do épico (no corpo, na ADR-017 e no `server.ts` do design
system), então contar só os títulos mintaria id duplicado.

| RN | Tema | Épico dono |
|---|---|---|
| RN-434 | O total está pronto quando o comprador chega ao pagamento | E12 |
| RN-435 | O resumo declara a composição do total nos dois modos de taxa | E12 |
| RN-436 | Parcelamento com juros: Price, parcela única sem juros, taxa vinda do termo | E04 |
| RN-437 | O juro do parcelamento não é receita do organizador nem base de comissão | E09 |
| RN-438 | Os dois aceites são colhidos na inscrição e carimbados na compra | E12 |
| RN-439 | O aceite carrega a versão exibida; divergência recusa a compra | E12 |
| RN-440 | Nenhuma cobrança nasce sem escolha deliberada de meio de pagamento | E12 |
| RN-441 | O termo de saúde do organizador é coletado na tela antes de ser exigido | E12 |
| RN-442 | A prova de aceite registra a origem da requisição | E12 |
| RN-443 | A página do produtor organiza feed, eventos e clubs em menu secundário | E17 |
| RN-444 | Link externo do perfil vira ícone quando a rede é reconhecível pelo endereço | E17 |
| RN-445 | O feed do perfil nasce mockado em preview e vazio digno em produção | E17 |

## O que esta rodada SUPERSEDE

**A decisão de 2026-07-18 sobre onde os aceites moram.** A spec do lote **CKFORM** (§5.3 da
CHECKOUT-UX, ratificada em 18/07 e construída na T2 `e860b8e` em 19/07) pôs os dois checkboxes
na etapa de pagamento, acima do botão de pagar, e a DEC-0729 os manteve ali ao fundir resumo e
pagamento numa tela só ("resumo → instrumento → aceites → botão").

A **RN-438 substitui essa colocação**. O veto do dono em 02/08 é explícito e vale para os dois
aceites: eles saem do PAGAR e passam a ser colhidos na etapa de inscrição.

O que **não** é superseded, e continua palavra por palavra:

- o flip F-4a, que faz o servidor recusar `createInscricaoCharge` sem os dois booleanos, antes de
  qualquer escrita;
- o carimbo da prova dentro da transação da compra, com a versão vigente e o `materialHash` lidos
  ali (padrão RN-149);
- a regra anti-forja: o cliente confirma booleanos e nunca envia versão, timestamp ou hash;
- o travamento dos checkboxes depois de a cobrança existir;
- a completude da prova no replay (`garantirAceitesNoReplay`), que nunca reescreve prova existente.

**Convergência, não colisão, com a RN-148.** A RN-148/S1207 já manda o aceite de regulamento
**por inscrito** ser um checkbox obrigatório na etapa de dados, e prevê `regulamentoAceite{versao,
aceitoEm, ipHash?}`. É objeto distinto do `pedidos/{id}.aceites` desta rodada (um é por inscrito e
segue não construído; o outro é por pedido e está no ar), mas a colocação que a RN-438 escolhe é a
mesma que o canônico já tinha para o irmão dele. Quando a S1207 for construída, os dois moram na
mesma etapa por regra, não por coincidência.

## RNs ampliadas por esta rodada

| RN | O que muda |
|---|---|
| RN-180 | A condição de exibir o total por opção deixa de ser "os totais diferem" e passa a ser "os dois totais existem" (RN-435) |
| RN-347 | O modo `incorporada` deixa de ser silêncio na tela: ganha enunciado sem valor (RN-435) |
| RN-183 | O arredondamento meio para cima em centavos passa a valer sobre a PARCELA, e o total é a parcela multiplicada (RN-436) |
| RN-149 | Inalterada no carimbo; a RN-439 acrescenta a conferência da versão exibida antes de carimbar |
| RN-310 e P-TAXAFLEX-3 | Reafirmadas: a comissão do afiliado continua sobre o face, agora com juros na conta (RN-437) |
| RN-157, RN-333, RN-315, RN-364 | Inalteradas. Nenhuma decisão desta rodada toca expiração do PIX, idempotência, gate do afiliado ou parceria ativa |

---

## RN-434 · O total do pedido está pronto quando o comprador chega ao pagamento

A cotação é disparada a partir da **etapa de dados**, e não da etapa de pagamento. Assim que a
sessão está pronta e todo participante tem modalidade escolhida, a primeira cotação sai, e o
round-trip acontece enquanto a pessoa preenche nome, documento e endereço.

Ao entrar no pagamento, a assinatura de preço não mudou, então nenhuma chamada nova sai e o total
já está renderizado. Quando a assinatura muda depois disso, por troca de meio, de parcelas, de
cupom ou de seleção, vale o que já está em vigor: o botão de pagar não promete valor em
recálculo e o código PIX não nasce sobre total defasado.

A etapa de escolha de modalidade e kit **não** cota. A assinatura de preço inclui a seleção de
cada participante, e cotar ali transformaria a exploração da oferta numa chamada por clique.

O pré-aquecimento é silencioso. Ele não tem indicador próprio, não mostra erro no meio do
formulário e não bloqueia o avanço. Falha na cotação antecipada é indistinguível de não ter
cotado: o estado de erro e o "Tentar novamente" continuam morando no bloco de totais.

Todo caminho que pede cotação passa pelo mesmo número de sequência, inclusive os dois caminhos
manuais de cupom (o campo e o auto-apply do link). Resposta que chega depois de outra ter sido
pedida é descartada, sem exceção de origem. Isso fecha a assimetria em que o efeito estava
protegido e os vizinhos não.

## RN-435 · O resumo declara a composição do total nos dois modos de taxa

O bloco de totais do checkout exibe, nesta ordem, e cada linha só quando tem conteúdo: subtotal,
desconto, taxa de serviço, juros do parcelamento e total.

**Taxa repassada.** A linha mostra o valor em reais e nomeia o meio de pagamento a que ele
pertence. O comprador lê na própria linha que aquela taxa é a do PIX ou a do cartão.

**Taxa incorporada.** A linha existe e não tem valor: diz que a taxa está inclusa no valor
exibido. Não se escreve "R$ 0,00", porque isso afirma ausência de taxa; e não se escreve o valor
real, porque ele é o termo comercial do organizador e é confidencial em superfície pública.

**Percentual nunca aparece.** Em nenhuma superfície pública, em nenhum dos dois modos. Só valores
em reais.

O total de cada opção de pagamento aparece no rótulo da opção sempre que os dois totais
existirem, inclusive quando forem iguais. Totais iguais informam que a escolha do meio não muda o
que se paga. Quando a derivação do meio alternativo falhar, aquela opção volta ao rótulo genérico
sem número, e a opção principal nunca é afetada.

A nota da etapa de escolha ganha a contraparte do modo incorporada: uma frase curta dizendo que
não há taxa adicional e que o valor exibido é o final.

## RN-436 · Parcelamento com juros usa tabela Price, e a parcela única não tem juros

A taxa de juros vem de `installmentRules.jurosAoMes` do termo comercial do organizador. Não
existe literal de percentual em código de cálculo. A simulação pedida pelo dono entra como
**2,89% a.m.** no dado semeado, e substitui os 3,49% a.m. documentados na decisão de 2026-07-05,
que passam a ser corrigidos onde estiverem escritos.

O cálculo é a tabela Price:

```
n = 1   →  parcela = PV                       (sem juros)
n ≥ 2   →  parcela = PV × i ÷ (1 − (1+i)^−n)
           total   = parcela × n
```

A parcela única do cartão não carrega juros. Price puro cobraria um mês, porque a fórmula assume
pagamento ao fim do período, e no cartão à vista o pagamento é imediato. Sem essa exceção a opção
"à vista" nasceria mais cara que o PIX com esse rótulo, e o total à vista do resumo passaria a
divergir do primeiro item da lista de parcelamento na mesma tela.

O arredondamento é meio para cima em centavos inteiros, aplicado à **parcela**; o total é a
parcela multiplicada pelo número de parcelas. A ordem é normativa: como o gateway recebe o número
de parcelas mais o total e faz a própria divisão, um total múltiplo exato da parcela garante que a
divisão dele reproduz o número que a tela mostrou.

O cálculo é do servidor, com fonte única no core. A interface renderiza a lista recebida e não
faz nenhuma aritmética de dinheiro. Pedido já criado nunca é reprecificado por mudança posterior
da taxa de juros, pela mesma disciplina de congelamento da RN-179.

O teto de parcelas e a parcela mínima continuam do termo. Com juros ligados o valor da parcela
sobe, então o corte pela parcela mínima passa a acontecer antes; isso é comportamento correto e
não vira exceção.

## RN-437 · O juro do parcelamento não é receita do organizador nem base de comissão

O organizador recebe o mesmo valor quer a compra seja à vista ou parcelada. O líquido do produtor
é calculado sobre o valor final da venda, o razão financeiro registra o valor de face, e a
comissão do afiliado incide sobre o face. Nenhum dos três enxerga o juro.

O juro compõe o valor cobrado do comprador e o valor enviado ao gateway, e aparece como linha
própria no resumo e na confirmação. Não existe caminho em que ele se apresente como parte do
"total" sem nome.

A regra é ratificação do que o código já faz. Ela precisa estar escrita porque, com a taxa de
juros em zero, a propriedade nunca valeu dinheiro; com ela ligada, passa a valer.

## RN-438 · Os dois aceites são colhidos na inscrição e carimbados na compra

Os aceites de termos da compra e de declaração de saúde são apresentados e confirmados na etapa
de **inscrição**, ao fim da coleta de dados dos participantes, e gateiam o avanço para o
pagamento. A etapa de pagamento não os exibe mais.

A prova continua nascendo na compra. O cliente envia apenas booleanos de confirmação; o servidor
lê a versão vigente e o hash do material dentro da transação e carimba com o próprio relógio. Não
há canal para o cliente informar versão, instante ou hash.

Depois de a cobrança existir, o bloco de aceites fica travado onde quer que seja renderizado,
inclusive quando o comprador volta à etapa de inscrição. A prova já foi registrada e a tela não
pode sugerir que ela é reversível.

O servidor continua recusando a criação da cobrança sem os aceites, antes de qualquer escrita.
Mudou a etapa da coleta; não mudou uma linha da regra do dinheiro.

## RN-439 · O aceite carrega a versão exibida, e divergência recusa em vez de carimbar

A tela envia, junto dos booleanos, a versão de cada termo que ela exibiu. O servidor compara com
a vigente lida na transação. Divergência recusa a compra com motivo próprio, e a tela repõe o
aceite com o texto novo, explicando em uma frase o que aconteceu.

Nada é carimbado sob material que a pessoa não leu. A versão exibida é dado de conferência, nunca
de gravação: o que fica no pedido continua sendo a versão vigente lida pelo servidor.

A regra nasce da RN-438: colher o aceite na inscrição afasta o gesto do carimbo em minutos, e
nesse intervalo cabe a publicação de uma versão nova pelo organizador. O `materialHash` prova o
que o servidor leu; não prova o que a pessoa leu.

## RN-440 · Nenhuma cobrança nasce sem escolha deliberada de meio de pagamento

Nenhuma forma de pagamento vem pré-selecionada na etapa de pagamento. A cobrança PIX é gerada
automaticamente quando o comprador **escolhe** PIX, e não pela simples chegada à tela.

A criação da cobrança grava pedido, pagamento e inscritos como pendentes antes de falar com o
gateway, e recomputa os contadores do evento no caminho. Uma tela que cria cobrança só por ser
aberta transforma toda visita ao pagamento em inscrição pendente e em cobrança real.

Sem meio escolhido, a tela continua informando: o bloco de totais mostra a composição da cotação
vigente e cada opção carrega o próprio total no rótulo. O comprador vê os dois preços antes de
decidir.

O ganho de não pedir clique extra para ver o código PIX permanece: a escolha do meio é o único
gesto, e o código aparece em seguida.

## RN-441 · O termo de saúde do organizador é coletado na tela antes de ser exigido

Quando o evento tem termo de saúde próprio ativo, ele aparece como um terceiro aceite na etapa de
inscrição, com o mesmo padrão de leitura em modal e de exibição de versão dos outros dois, e
gateia o avanço junto com eles.

O envio reflete o que a pessoa marcou. Nenhum aceite é afirmado como verdadeiro pelo cliente por
construção.

A regra fecha um defeito vivo: o servidor já exige a confirmação do termo custom e a tela nunca a
coletou nem a enviou, o que reprova a compra em todo evento que tenha o termo ativo.

## RN-442 · A prova de aceite registra a origem da requisição

O bloco de aceites do pedido passa a guardar, além de versão, instante e hash do material, o
identificador da origem da requisição: o endereço de origem em forma de hash, com o mesmo
tratamento de segredo já usado para identificadores de pessoa, e o agente do navegador.

Os dois são lidos pelo servidor a partir da própria requisição. O cliente não participa e não
pode influenciar nenhum dos dois.

É dado pessoal, coletado com base na prova do aceite e na execução do contrato, retido pelo mesmo
ciclo do pedido. O endereço nunca é gravado em claro, o que é a mesma escolha que a RN-148 já
tinha feito para o aceite de regulamento por inscrito.

## RN-443 · A página do produtor organiza feed, eventos e clubs em menu secundário

O perfil público passa a apresentar seu conteúdo em três abas nomeadas **Feed**, **Eventos** e
**Clubs**, num menu secundário logo abaixo da identidade do perfil. A aba inicial é Eventos, que
é o conteúdo com valor transacional e o que a página já entrega hoje.

As três abas permanecem renderizadas no servidor e presentes no documento, para que o conteúdo
continue indexável e alcançável por busca na página. A troca de aba é do cliente e não recarrega
a rota nem tira a página do regime estático.

Card de clube não oferece afordância de clique enquanto não existir página de clube para onde
levar. Aba que promove o conteúdo não pode transformar um card informativo em beco.

## RN-444 · Link externo do perfil vira ícone quando a rede é reconhecível pelo endereço

Os links externos do perfil deixam de ser pílulas de texto de largura inteira e passam a ser uma
fileira de ícones. A rede é inferida do endereço do link, no servidor, sem campo novo no modelo
do perfil e sem alteração no editor do painel.

O rótulo que o organizador digitou continua sendo o nome acessível do ícone. Endereço que não
casa com nenhuma rede conhecida recebe um ícone genérico de link e mantém o rótulo, em vez de
sumir.

Inferir pelo endereço em vez de gravar a rede é decisão de custo: um campo novo atravessaria
modelo, validação, projeção pública, Function de escrita e editor, para produzir a mesma
informação que o endereço já carrega.

## RN-445 · O feed do perfil nasce mockado em preview e vazio digno em produção

O feed do perfil é leitura. Em preview ele exibe conteúdo de exemplo, rotulado como exemplo, pelo
mesmo degrau de cascata que a galeria e os patrocinadores já usam. Em produção, sem publicação
real, ele exibe estado vazio digno e nunca conteúdo inventado.

A composição e a publicação de posts não existem nesta regra. O modelo do feed, suas Rules e sua
escrita são épico futuro, e o estado vazio de produção é o comportamento correto até que ele
exista.
