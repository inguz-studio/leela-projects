---
tags: [leela, rn, rodada, kit, galeria, cupom, afiliado, assessoria]
aliases: ["RNs galeria e cupom por link 2026-07-29", "RN-425..433"]
trace: leela-build-2d6ee98d
lote: SPEC-KITCUPOM
data: 2026-07-29
---

# RNs da galeria do kit e do cupom por link · RN-425 a RN-433

## Faixa e prova de não colisão

A série 4xx é a da plataforma. O E16 introduziu RN-400 a RN-410, a SPEC-ONBOARD consumiu
RN-411 a RN-417 e a SPEC-INGPAGE consumiu RN-418 a RN-424. Varredura em 2026-07-29, na árvore
inteira do repositório, fora de `node_modules`, do `.git`, do `.next` e do `functions/lib`
compilado:

```
grep -rn "RN-42[5-9]\|RN-43[0-9]\|RN-44[0-5]" .
```

Único hit no repositório é a linha 31 do próprio brief desta lane
(`.nirvana/briefs/leela-build-2d6ee98d-SPEC-KITCUPOM-enriched.md`), que pede "≥ RN-425;
conferir, não assumir". Zero hits em `leela-specs/`, `packages/`, `apps/`, `functions/src` e nos
arquivos `.rules`. **Faixa consumida aqui: RN-425 a RN-433.** RN-434 em diante segue livre, e
`RN-383` continua livre como folga da série 3xx (dinheiro), que não é o domínio desta rodada.

Ids de story mintados: **`S212`** no E03 e **`S1215`** no E12. Varredura de `S212` a `S220` e de
`S1215` a `S1229` em `leela-specs/`, `apps/`, `functions/src` e `packages/*/src`: zero hits. O E03
estava usado até `S211`; o E12 até `S1214`, mintado pela SPEC-INGPAGE.

| RN | Tema | Épico dono |
|---|---|---|
| RN-425 | Forma da galeria do kit e a principal única por construção | E03 |
| RN-426 | Onde cada foto aparece e o que o produto garante de enquadramento | E12 |
| RN-427 | Edição da galeria no painel e os slots de Storage | E03 |
| RN-428 | Simulação de galeria é app-side e só em preview | E12 |
| RN-429 | O link de afiliado e de assessoria é gerado, não digitado | E08 |
| RN-430 | O cupom do link atravessa a jornada e é sempre claim do cliente | E12 |
| RN-431 | Banner pós-Hero: conteúdo, estados e o silêncio quando não se aplica | E12 |
| RN-432 | A verificação pública do cupom do link não vira oráculo | E12 |
| RN-433 | Atribuição e comissão com cupom pré-aplicado | E08 |

---

## RN-425 · O kit tem até três fotos e exatamente uma principal, por construção

O kit carrega a foto principal no campo `imagemUrl`, que já existe desde a RN-227, e até duas
fotos adicionais em `fotosSecundarias[]`. A ordem do array é a ordem de exibição.

"Exatamente uma principal" não é validação: é forma. Existe um campo só para a principal, então o
estado de zero ou duas principais não é representável. Nenhuma superfície precisa checar a
invariante, e nenhuma pode violá-la por esquecimento.

Compatibilidade retroativa é total e não exige migração. Documento sem `fotosSecundarias` é um kit
de uma foto, que é o que ele já era. Documento sem `imagemUrl` é um kit sem foto, que também é o
que ele já era. Toda leitura existente de `imagemUrl` permanece correta sem alteração.

Leitura no padrão Postel do campo decorativo, o mesmo do `normalizarItensKit`:

- entrada que não é lista vira lista vazia;
- entrada que não passa em `isUrlImagemKitValida` é descartada, item a item;
- entrada igual à `imagemUrl` é descartada, porque repetir a principal é defeito visível;
- entrada duplicada dentro da própria lista é descartada;
- a lista é cortada em duas entradas depois de filtrar.

Documento envenenado nunca derruba o parse nem o checkout público.

O acessor canônico é `fotosDoKit(kit)`, que devolve a principal primeiro e depois as secundárias,
ou lista vazia quando não há principal. Toda lógica nova lê por aqui; `fotosSecundarias` cru vira
detalhe de persistência.

## RN-426 · A principal manda no site; a galeria mora no detalhe

Listagem de kits, card de seleção e qualquer superfície onde o kit aparece ao lado de outros
exibem **somente** a foto principal.

O detalhe do kit no checkout exibe a galeria: a principal em destaque, as secundárias como
miniaturas, clique na miniatura troca a foto em destaque, e o lightbox que já existe amplia a que
estiver em foco. As miniaturas usam o primitivo `Thumb` do design system. Nenhum componente novo
de DS entra por esta regra.

Sobre proporção, a regra é de enquadramento e não de validação, porque validação de proporção não
existe no produto: o `isUrlImagemKitValida` só examina a URL e as Rules de Storage registram por
escrito que não decodificam imagem. As três fotos são renderizadas dentro de moldura quadrada com
recorte por cobertura. Foto fora de esquadro é cortada e nunca deforma a grade. A dica "quadrada
1:1" continua no painel como orientação ao organizador.

## RN-427 · O painel edita três posições, e promover é trocar

O editor de kit expõe três posições: a primeira é a principal, a segunda e a terceira são as
secundárias. Cada posição tem enviar, trocar e remover, com a semântica de payload que o editor
já usa (campo ausente significa não tocado, nulo significa removido).

Promover uma secundária a principal **troca** o conteúdo das duas posições. Nunca copia, porque
copiar produziria a mesma foto duas vezes. A troca é função pura no core, testada uma vez e
reusada por qualquer superfície futura, já que é a única operação capaz de violar a forma da
RN-425 por descuido.

Remover a principal quando há secundárias promove a primeira secundária à principal. Um kit com
galeria e sem principal não é exibível nas listagens, então esse estado não pode existir.

No Storage, a principal continua no objeto de nome fixo `eventos/{eventoId}/kits/{kitId}` e as
secundárias ocupam dois slots literais em `eventos/{eventoId}/kits/{kitId}/fotos/{slot}`, com
`slot` restrito a `2` e `3` nas Rules, reusando `kitObjetoValido`, `eventoDoMeuTenant` e
`imagemValida`. As propriedades da RN-227 sobrevivem: nome de objeto fixo significa que reenviar
sobrescreve e não deixa órfão, e não existe nome de arquivo livre. E o teto de três fotos passa a
ser garantido também pelo Storage, não apenas combinado no aplicativo.

Upload real depende do bucket, que não existe no ambiente online. A dependência é a mesma que já
bloqueia a primeira foto hoje; a galeria não acrescenta nenhuma.

## RN-428 · Kit com galeria se demonstra app-side, e só em preview

O seed não grava URL de foto de kit. A guarda exige http(s) e rejeita caminho relativo, e a lição
LEELA-R14 está registrada no cabeçalho do seed correspondente. URL absoluta amarraria a
demonstração à porta do ambiente e quebraria no primeiro deploy.

A demonstração entra como mais um degrau da cascata de imagem que já existe:

1. fotos reais do organizador vencem sempre, em preview e em produção;
2. em **preview**, kit sem secundárias recebe duas fotos adicionais determinísticas do acervo
   local que a cascata já usa;
3. em **produção**, kit sem secundárias exibe apenas a principal.

Página de verdade nunca exibe foto que o organizador não subiu. É a mesma honestidade de
superfície que o terceiro degrau da cascata já defende para a foto única.

## RN-429 · O link compartilhável nasce de um gerador, com o cupom dentro

O link de afiliado e o de assessoria têm uma forma só:

```
{base pública do ambiente}/{slug do evento}?ref={refCodigo}&cupom={CÓDIGO}
```

A base é a base única por ambiente da RN-423. O `ref` é o `refCodigo`, que já é o docId do
afiliado. O `cupom` é o `cupomCodigo` vinculado, quando existe; sem vínculo, o link sai só com
`ref` e continua rastreando conversão, como já faz hoje.

O `linkMaster` deixa de ser texto livre digitado e passa a ser derivado pelo mesmo gerador, no
painel de afiliados (E08) e no de parcerias de assessoria (E18). Nenhum domínio de terceiro pode
aparecer em link gerado.

A chave `c` continua **aceita na entrada** como apelido de `cupom` e nunca é produzida na saída.
Link de afiliado circula impresso e em biografia de rede social; desligar a chave em silêncio
custaria venda de quem já divulgou.

## RN-430 · O cupom do link atravessa a jornada, e continua sendo claim

O cupom vindo da URL é capturado e guardado por evento, com a mesma disciplina que o `?ref=` já
tem: mesmo código revisitado preserva a captura mais antiga, código diferente sobrescreve,
storage indisponível degrada sem quebrar a jornada. Isso corrige a assimetria de hoje, em que a
atribuição sobrevive à navegação e o desconto não.

O auto-apply no checkout é a **segunda porta do mesmo mecanismo**, ao lado do campo manual do step
0 da S1209. Não existe segundo caminho de desconto: as duas portas terminam no mesmo código
enviado à mesma cotação, com a mesma recusa e a mesma mensagem opaca. O código digitado à mão
prevalece sobre o do link, porque é ação deliberada da pessoa.

O valor guardado é claim do cliente e nunca é fonte de verdade. Existência, vigência, gate do
afiliado e valor do desconto são decididos no servidor, na cotação e novamente na criação da
cobrança.

A marca "(desconto aplicado)" é exibição, não cálculo. O número exibido vem inteiro da cotação, e
a regra inviolável do checkout permanece: a interface renderiza o valor do servidor e não soma um
centavo.

## RN-431 · O banner anuncia o desconto, e cala quando não há o que anunciar

Quando a URL da página do evento traz um cupom que se aplica, aparece uma faixa logo após a Hero
com o código e, quando resolvível, o nome de quem indicou.

Quando o cupom não se aplica, por qualquer razão (inexistente, expirado, esgotado, escopo não
satisfeito, evento errado), **a faixa não aparece**. Não há erro na landing. O aviso honesto
continua no checkout, onde a pessoa efetivamente tenta usar o cupom e onde ele já existe hoje.
Erro público sobre um link vencido de terceiro pune o visitante por algo que ele não causou.

O nome exibido é o da entidade quando a origem é clube ou assessoria, e o nome cadastrado quando é
pessoa física. Sem nome resolvível, o texto degrada para o código sozinho e a faixa continua útil.

## RN-432 · A verificação que alimenta o banner não pode virar oráculo

A leitura de cupom é fechada por design: as Rules restringem cupom ao organizador, com o motivo
escrito no modelo ("enumerar cupons = vazar descontos"). O banner, portanto, não lê cupom no
cliente.

A verificação roda no servidor da landing, pelo padrão que já é doutrina desde a S1200-T2: Admin
SDK no servidor, gate de autorização no código, Rules intocadas. A página do evento continua
estática; o banner entra atrás de Suspense, como o rastreador de atribuição e o CTA já fazem.

A resposta é mínima e uniforme. Ela informa se o cupom se aplica e, quando se aplica, devolve o
rótulo da faixa. Cupom inexistente, expirado, esgotado, de escopo não satisfeito e de outro evento
devolvem resposta idêntica, sem distinção. Nenhum valor de desconto sai para código que não se
aplica, e nenhum dado do afiliado sai além do nome de exibição.

Vazamento equivalente já existe: a cotação pública responde a chamador anônimo se um cupom cola.
O que esta regra acrescenta é um canal mais barato, que dispensa montar cotação, e o nome do
promotor. As mitigações são as que cabem no repositório hoje: resposta uniforme para toda falha e
cache curto por código, de modo que força bruta bata em cache e não no banco. Limite por endereço
de origem não existe no ferramental atual e não é reivindicado aqui.

## RN-433 · Cupom pré-aplicado não muda uma linha da atribuição

Permanecem exatamente como estão: a precedência do cupom de afiliado sobre o `?ref=`; o registro
de qual dos dois venceu; o gate em que o link rastreia conversão mas o desconto só ativa depois do
mínimo de inscrições, sem retroativo; o clamp do instante de clique declarado pelo cliente; a
janela de atribuição em dias e a re-checagem autoritativa na confirmação; o contador de usos
escrito só por Function; o percentual de comissão; e a exigência de parceria ativa nos cupons de
escopo de club parceiro.

Fica escrito o desempate que hoje só existe em código. Quem chega pelo link do afiliado A e digita
à mão o cupom do afiliado B faz **B** levar a comissão, porque o cupom aplicado é sinal mais forte
que o clique, e o instante do clique de A é descartado no processo. Quando o cupom digitado não
pertence a afiliado nenhum, o `?ref=` de A sobrevive: A leva a comissão e não leva o crédito do
desconto.

A regra é ratificação do comportamento vigente. Alterá-la significaria mexer no kernel de dinheiro
para resolver um caso de borda que o produto ainda não observou.
