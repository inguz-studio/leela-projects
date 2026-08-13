---
tags: [leela, fila, rodada, decisoes-dono, execucao]
trace: leela-dec-0809
lote: DEC-0809-REGISTRO
data: 2026-08-09
fonte: 01-decisoes-dono
---

# 02-fila de execução · o trabalho que a leva de 09/08 gerou

> **O que este arquivo é.** As decisões estão em [[01-decisoes-dono]]; aqui está o que cada uma manda
> fazer, com território, critério de aceite e se a superfície já está servida em produção. Dez
> frentes de trabalho saem de quinze decisões.
>
> **Isto não é um board.** Os cards vivem no [[V1-KANBAN]], no padrão épico → história → tarefa. Aqui
> mora o critério contra o qual cada card é medido.
>
> **A marca ⚔ é review antagonista obrigatória.** Ela cai em tudo que toca dinheiro cobrado ou
> estoque de vaga: ESTOURO-RESERVA, SERV-2-PISO e SEMKIT-REPARO. A ⚔⚔ da
> PURGA-DADOS-TESTE é a régua do expurgo de 06/08: inventário congelado, review fria sobre o plano
> congelado, e só então o apply.
>
> **Atualizado pelo lote 2 de 09/08.** Três mudanças: o **JUROS-ALINHAMENTO saiu de retido** e virou
> executável, porque o dono entregou o custo do gateway; a **PURGA-DADOS-TESTE** nasceu e absorveu a
> CONTAS-DEMO, o VITRINE-2 e o COMPROMETIDO-1; e o **SEMKIT-2** deixou de ser só regra e virou build.
>
> **⛔ Corrigido pelo dono após a pausa de 09/08.** O **JUROS-ALINHAMENTO está CANCELADO**: o "até 3x
> sem juros" era exemplo, não decisão — juros é operação manual do dono pelo painel admin. A seção
> dele abaixo fica como registro histórico da leitura que caiu, e o placar da Parte A perde uma
> frente. Verbatim e consequências: `01-decisoes-dono.md`, correção no bloco 4.

## O placar

| | Frentes |
|---|---|
| Parte A · build direto | 6 |
| Parte B · spec antes de build | 3 |
| Parte C · pesquisa | 1 |
| Parte D · operação sobre produção | 1 |
| Fecharam sem gerar trabalho | 5 linhas do painel |

**Duas perguntas continuam retidas esperando o dono**, e as duas são de dinheiro. Estão no fim, na
seção "O que volta ao dono antes de qualquer build". A terceira, que era o parcelamento acima de 3x,
**foi respondida pelo lote 2**.

---

## Parte A · os quatro que mudam código

### SEMKIT-REPARO · os dois kits negativos param de existir, na fonte e no banco ⚔

**Território.** `functions/src/seed/kits.seed.ts:64` (Meia Floripa, `preco: -15`) e
`functions/scripts/preview-seed-extra.ts:457` (São Silvestre, `preco: -10`) para a fonte;
`packages/core/src/eventos/kit.ts` e `firestore.rules` para o piso; os dois documentos de kit em
`leela-hub` para o reparo. **No ar hoje:** sim, os dois kits estão visíveis em produção, e a
demonstração do produto ensina o contrário da regra.

**O conserto.** A cadeia que a rodada de 05/08 já escreveu, destravada pela autorização de hoje. Ela
tem ordem obrigatória e três degraus: **1a** (`S318-T1`) põe o piso zero onde ele vale, na Rule e no
predicado gravável; **2a** (`S318-T5`) tira o preço negativo dos dois seeds; **2b** (`S318-T6`)
zera o preço dos dois documentos em produção. A ordem não é preferência: o runner de produção já
rodou duas vezes, e reparar o banco antes da fonte deixa uma terceira execução ressuscitar os dois.

**Aceite.** A varredura por `kitEhDesconto` em `leela-hub` devolve **zero**, com contagem antes e
depois no report; nenhum seed do repositório semeia preço negativo; a criação de kit com preço
negativo é recusada pela Rule e pelo predicado gravável, com a recusa aterrissando **no campo de
preço** e não como "falha ao salvar"; `precoKitValido` continua aceitando negativo na **leitura**,
porque é ele que `computeSaleState` chama e apertá-lo quebraria a exibição dos documentos legados; a
travessia da RN-200 é escrita como exceção declarada, com a medição de zero compradores ao lado.

**⛔ Gate de medição antes da 2b, aberto pelo lote 2.** Os dois eventos que carregam os kits,
`meia-floripa-2026` e `sao-silvestre-floripa-2025`, **foram apagados pelo expurgo de 06/08** — o
relatório daquela corrida nomeia o primeiro entre os apagados e lista os dois únicos sobreviventes do
tenant, `teste-taxa-repassada` e `corrida-inverno-floripa-2026`
(`.nirvana/handoffs/leela-apply-limpeza-20260806.md:223` e `:230`). A `S318-T6` **provavelmente não
tem objeto**, e ela é justamente a tarefa cara: escrita em campo de preço de produção sob exceção à
RN-200. **Medir antes de despachar**, e fechar como "sem objeto" se confirmar. A autorização do dono
fica registrada e válida caso a medição contrarie a inferência.

Isso **não** alivia a 2a. Ao contrário: com os documentos já apagados, a fonte passa a ser o único
lugar onde o defeito ainda vive, e o runner de produção já rodou duas vezes. Enquanto o seed carregar
`preco: -15` e `preco: -10`, uma terceira execução ressuscita os dois kits em eventos novos. **A 2a é a
tarefa que importa agora.**

**Ordem.** A 1a e a 2a sobem normalmente. A 2b só depois da medição. Rota opus e review antagonista
dupla continuam valendo para ela, se ela sobreviver ao gate. Nada nesta cadeia pega carona em deploy
pronto.

### CLUBES-CTA · a aba deixa de só informar que está vazia — ✅ destravado, fila (11/08)

**Território.** `apps/landing` (`PainelClubes.tsx`) e `functions/src/cliente/meusClubes.ts`.
**No ar hoje:** sim, a aba subiu no deploy de 05/08 e a tela vazia já é o que a pessoa vê.

**O conserto.** O estado vazio ganha um CTA para se inscrever num clube. A entrada no clube continua
sendo épico próprio (E05) e não entra aqui.

**Aceite.** O CTA tem destino real e verificável, e nenhum botão inerte nasce nesta tarefa; o
destino é o que a spec do card decidir entre as duas leituras registradas no bloco 12 do registro
(descoberta dos clubes existentes, que é o default proposto, ou espera declarada com o caminho de
convite escrito); a tela continua sem prometer um mecanismo de entrada que não existe; nenhuma Rule
é afrouxada e nenhuma porta nova é aberta.

**Ordem.** Tarefa pequena sobre tela servida. Sonnet, sem review antagonista. ✅ **Destravado — fila
(11/08):** o merge do redesign saiu (`b51cdcd9`) e a retenção caiu. O território é `apps/landing` e
`functions/`, que o merge não encostou, então nada aqui precisa ser re-endereçado.

### SERV-3-RENOME · "Serviço" para fora, "Serviço" para dentro também — ✅ PAGO em 11-12/08

**Território.** 34 strings em três aplicações; RN-495 em [[LEELA-E12-landing]]; tarefas 4a, 4b e 4c
de `02-rodadas/2026-08-05-metricas-e-servico/04-fila-codigo.md`. **No ar hoje:** sim, o comprador já
lê "Taxa de serviço" no checkout.

**⚠️ Correção de registro (a razão pela qual esta entrada estava desatualizada).** A linha abaixo
("fica 'Serviço da plataforma' no super-admin") era a recomendação de 09/08. O **adendo da noite** de
11/08 (`03-leva6-tarde.md`, verbatim do dono: *"é somente quando falar da taxa Leela, que chamaremos
'serviço' para referenciar o que é essa cobrança"*) e o próprio `LEELA-E12-landing.md` **já haviam
derrubado essa recomendação antes desta lane começar**: "Serviço" vale em toda superfície, inclusive
o super-admin, sem sufixo — a desambiguação contra gateway/juros vem da própria regra (só a taxa
Leela se chama "Serviço"). A lane SERV3-RENOME seguiu a versão corrente (RN-495 com alcance), não
esta nota estale.

~~**O conserto.** O rótulo encurta para "Serviço" onde o público é externo, comprador e organizador, e
fica "Serviço da plataforma" no super-admin, onde a palavra ainda precisa separar esta cobrança das
outras que a mesma tela mostra.~~ *(superado pelo adendo da noite — ver acima)*

**Aceite.** Nenhuma tela de comprador ou de organizador diz "Taxa de serviço" nem "taxa Leela"; o
super-admin distingue esta cobrança das demais sem ambiguidade; as 34 ocorrências são varridas de uma
vez, porque trocá-las duas vezes é o desperdício que a pergunta ao dono evitou; nenhum identificador
técnico, campo de documento ou nome de variável muda junto, pela mesma disciplina da QUALIF-3.

**✅ PAGO em 11-12/08 (lane SERV3-RENOME).** Re-inventário fresco na main mergeada (não os 34 de
09/08, que miravam caminhos que o rename de Parcerias havia mudado — na prática nenhum sobrevivia no
inventário original, mas a régua de código mudou desde 08/05 de qualquer forma): **24 arquivos, 26
strings de usuário**. Commits `37e5c0ca`/`07bb351e`/`4488dbe2`, merge `--no-ff` em `f1f5e95c` na
main, pushed. Gates verdes (painel 2646/2646, landing confirmada limpa por isolamento, tsc/lint 0).
Intocado de propósito: campo "Taxa Be Hero" e fallback "após taxa Leela" (Frente 1/S908, tarefa de
suprimir, card separado ainda aberto). Detalhe completo, tabela arquivo:linha e veredito por string
em `.nirvana/handoffs/leela-serv3-renome-20260811.md`. ⛔ Nenhum deploy.

### JUROS-ALINHAMENTO · **CANCELADO pela correção do dono de 09/08** — era exemplo, não decisão

> ⛔ Verbatim do dono, após a pausa: *"voce decidiu errado sobre os juros, apenas dei um exemplo sobre
> as vezes sem juros, pode desconsiderar. Eu que decido como cobrarei juros pelo painel admin,
> manualmente."* Nada desta frente executa. O checkout permanece como configurado até ele mexer pelo
> painel; o JUROS-1 destrava (save livre — o que ele salvar é a decisão vigente); a tabela do custo do
> gateway (1,89% a.m., virada em N = 6,95) segue válida como **insumo da escolha manual dele**. O
> texto abaixo fica como registro da leitura que caiu.

**Território.** `packages/core/src/platform/commercialTerms.ts` (a estrutura e o default),
`packages/core/src/finance/calc.ts` (`buildInstallmentOptions`), e o documento
`commercialTerms/current` do tenant em produção. **No ar hoje:** sim, e **contra a decisão de hoje**.

**A conferência está paga, e foi feita nesta lane.** O checkout cobra a tabela Price a 2,89% a.m. de
`n = 2` em diante. Numa compra de R$ 300,00 em 3x, a compradora paga hoje R$ 105,83 por parcela e
R$ 317,49 no total, R$ 17,49 a mais que à vista. Sob a decisão do dono, ela deveria pagar R$ 100,00 e
R$ 300,00. A parcela mínima de R$ 10,00 que ele pediu **já está em vigor** (`parcelaMinima: 10`,
aplicada em `calc.ts:154`) e não gera tarefa.

**O que destravou.** O lote 2 trouxe o custo do gateway (1,89% a.m., por parcela) e com ele a conta
que escolhe a configuração. `InstallmentRules` tem taxa única, então "3x sem juros e 4x-12x com
juros" não é escrevível sem campo novo. A saída adotada é `maxParcelas: 3` com `jurosAoMes: 0`, e ela
deixou de ser arbitrária: **a plataforma passa a perder dinheiro a partir de 7x** quando absorve o
custo e não cobra do comprador (ponto de virada em `N = 6,95`, independente do tamanho da venda).
Manter 4x-12x sem juros custaria R$ 14,82 numa venda de R$ 300,00 em 12x. O "não trabalharemos com
isso agora" e a aritmética apontam para o mesmo lugar.

**O conserto.** Três coisas, na mesma lane. O juro vai a zero de 1x a 3x, e o total parcelado passa a
ser exatamente o à vista. O teto cai de 12x para 3x. E `platform/config.custoGateway` nasce com a
tabela de 1,89% a.m. calculada, para a coluna Margem do admin deixar de ficar vazia.

**A quem o custo é debitado, e isto não pode sair errado.** O custo sai do **Serviço que a plataforma
retém**, pelo verbatim do dono (*"abate do que iria para nós"*). Ele **não** desce ao líquido do
produtor, que continua sendo `face − taxa(meio)` pela RN-182 intocada. Debitar do repasse do
organizador é exatamente a alternativa que o JUROS-3 recusou.

**Aceite.** Dentro da faixa, o total parcelado é **exatamente** igual ao à vista, provado por teste
sobre os valores da RN-436, e nenhum centavo de juro chega ao comprador; nenhuma opção acima de 3x é
ofertada em tela nenhuma; `commercialTerms/current` do tenant é atualizado pelo **caminho canônico do
painel**, não por escrita direta, para o histórico de versões ficar fiel; a RN-182 é conferida
intocada por teste, provando que o líquido do produtor não se moveu; a tabela de custo 1x-12x é
entregue ao dono junto com as duas ressalvas do bloco 18 (a espera da primeira parcela e simples
contra composto).

**A consequência visível, que o dono veta se quiser.** O checkout hoje oferece até 12x. Depois desta
lane oferece até 3x. É redução de oferta para o comprador, com efeito possível em conversão, e está
escrita aqui para não ser descoberta na tela.

**Ordem.** Dinheiro cobrado de gente real que já compra hoje. Rota opus, review antagonista, lane
própria, sem carona em deploy. **O JUROS-1 vem depois desta lane**, nunca antes: salvar os termos
agora selaria a v2 com 2,89% em toda parcela, que é o número que esta lane derruba.

### SEMKIT-2-TOGGLE · o organizador liga e desliga a inscrição sem kit

**Território.** RN-508 em [[LEELA-E03-operacao-evento]]; reconciliação com RN-503 e RN-504 em
[[LEELA-E04-config-vendas]]; `S317-T1` e `S317-T2` de
`02-rodadas/2026-08-05-modalidade-e-kit/04-fila-codigo.md`. **No ar hoje:** nem um interruptor nem o
outro; hoje a saída sem kit se constrói criando um kit de R$ 0,00.

**O conserto.** O organizador ganha um interruptor explícito, com aviso, em vez de descobrir sozinho
que a saída se faz com um kit de preço zero.

**A reconciliação obrigatória, antes da primeira linha.** Já existe um interruptor especificado, e
ele tem polaridade oposta. O da **RN-503** (`incluiKitDaModalidade`, no lote) desliga o kit inteiro
naquele lote: ninguém leva kit. O que o dono pediu mantém os kits existindo e deixa a **pessoa**
escolher não levar nenhum. Dois interruptores vizinhos, na mesma tela, com significados opostos, é a
receita de um defeito invisível em review. A primeira meia hora do card responde uma pergunta: é o da
RN-503, que ele pode ter visto, ou é um segundo campo por modalidade do tipo "permitir inscrição sem
kit"? O contexto do SEMKIT-2 e a "letra A" apontam para o segundo.

**Aceite.** Existe **um** conceito de interruptor de kit no produto, com nome que o distingue do
outro sem ambiguidade, ou existem dois com a diferença escrita na RN; o aviso do dono não é
confundido com o aviso da RN-504, que serve outro caso (tirar um kit de desconto do cardápio) e
continua valendo para quem criar um kit de desconto no futuro; nenhum organizador precisa criar kit
de R$ 0,00 como gambiarra para abrir a saída; a `S317-T1` e a `S317-T2` são lidas antes do card
nascer, e o card diz explicitamente se as substitui ou convive com elas.

**Ordem.** Build pequeno, gate de reconciliação na frente. Sonnet, com a reconciliação em opus se a
resposta for "dois campos".

### PATROCINADOR-TOGGLE · apagar marca vira desativar marca — ✅ destravado, fila (11/08)

**Território.** `apps/painel/src/routes/parcerias/marcas/MarcasPage.tsx` (botão Excluir em
`:188-189`, chamada em `:133`) e `MarcaFormModal.tsx`; `packages/api-client` no lugar de
`excluirMarcaDoProfissional`; RN-171 em [[LEELA-E10-marcas]]. **No ar hoje:** sim, a tela de marcas
funciona e o botão Excluir destrói o registro. ⚠️ **O caminho mudou:** o merge de 11/08 (`b51cdcd9`)
moveu a tela de `routes/marcas/` para `routes/parcerias/marcas/` — rename puro, conteúdo intacto, as
duas linhas citadas continuam válidas (conferidas na main mergeada).

**Metade já existe.** `StatusMarca = 'ativa' | 'inativa'` está no modelo
(`packages/core/src/brands/marca.ts:31`), validado no core (`:143`, `:165`) e aceito pela Rule, que já
exige "status no enum" (`firestore.rules:2980`). O que falta é superfície: o `MarcaFormModal` não
expõe `status` em campo nenhum.

**O conserto.** O botão destrutivo dá lugar ao interruptor que o dado já sabe representar. Marca
inativa some do autocomplete de patrocínios futuros e continua no registro.

**Aceite.** Não existe mais caminho de tela que apague uma marca; marca inativa não aparece no
autocomplete de patrocínios novos e continua listada, com o estado visível, para poder voltar; o
aviso ao desligar sai na tela e diz o que muda; nenhuma cópia de patrocínio já cadastrada em evento
ou clube é tocada, o que já é verdade hoje e passa a ser provado por teste; a RN-171 ganha o
enunciado de que marca não se apaga.

**O que não muda.** O contador de ativações continua não existindo e o **E10-S812 segue no gelo**. A
spec decide se o "avisando" é frase genérica, que custa nada, ou o número de patrocínios afetados,
que exige o leitor barato que nunca houve. Proposta: frase genérica agora, número quando o S812 sair.

**Honestidade sobre o tamanho.** O cabeçalho da própria página (`MarcasPage.tsx:11-13`) já diz que
excluir só tira a marca do autocomplete **futuro**, e que patrocínios já cadastrados são cópias
independentes que permanecem intactas. Apagar "Café Rota" hoje não quebra o desafio dela. Isto é
ganho de reversibilidade, não resgate de integridade.

**Ordem.** Build pequeno sobre tela servida. Sonnet.

---

## Parte B · os três que pedem spec antes de build

### ESTOURO-RESERVA · a vaga sai do estoque quando a cobrança nasce ⚔

**Território.** `functions/src/checkout/cotarInscricaoCheckout.ts` e `createInscricaoCharge.ts` para
a reserva; `functions/src/checkout/expirarPixPendente.ts` para a devolução; `webhookPagamento` e
`virarLote` para o contador. RN-498 em [[LEELA-E04-config-vendas]] e delta na RN-158 em
[[LEELA-E12-landing]]. **No ar hoje:** a RN-158 sim, dizendo que carrinho aberto não segura estoque.

**O que a spec tem de resolver antes de existir tarefa de código.** A dependência está medida e é
estrutural: `expirarCarrinhosAbandonados` roda sozinho de 5 em 5 minutos
(`expirarCarrinhosAbandonados.ts:147`), mas ele cobre a janela do **carrinho**, que termina quando a
cobrança nasce. A reserva que a decisão pede vive **depois** disso, e o vencimento do PIX **não tem
varredura**: `expirarPixPendente` é `https.onCall` (`expirarPixPendente.ts:263`), só acontece quando
alguém chama. Sem transformá-la em varredura agendada, um PIX abandonado segura a vaga para sempre.

Então a spec desenha duas peças que sobem juntas ou nenhuma: a reserva na cotação e na criação da
cobrança, e a expiração automática do PIX pendente. E responde três coisas: quanto tempo a reserva
dura, o que o comprador seguinte lê quando a última vaga está reservada por outra pessoa, e o que
acontece com uma reserva cujo pagamento falha no gateway em vez de expirar.

**Aceite da spec.** Nenhum caminho deixa a vaga presa a um pagamento que nunca vai acontecer; a
reserva é liberada por varredura e não por visita de usuário; o contador de vendidos ganha teto, para
que o estouro deixe de ser aritmeticamente possível em vez de apenas improvável; a RN-158 recebe a
exceção escrita, porque hoje ela diz o contrário do que passa a valer.

**A correção mínima não espera.** O estouro silencioso vira registro no servidor e aviso na tela do
organizador, com o excedente nomeado. Isso já estava decidido antes desta rodada, não depende da
reserva e pode subir sozinho.

**Ordem.** Estoque e dinheiro. Rota opus, review antagonista, lane própria.

### ADMIN-USUARIOS-FLUXO · o diretório no painel master e o gatilho do modal

**Território.** Spec nova sob [[LEELA-E16-plataforma-superadmin]], tela em `/plataforma`; delta na
RN-510 no mesmo épico, se o gatilho mudar; `/plataforma/convites`, onde a emissão do código já
existe. **No ar hoje:** a vitrine e o aviso sim, desde 06/08; o diretório não existe.

**O que a spec desenha.** O diretório de contas no painel master, com as duas portas de aprovação
que o dono descreveu: passar um código, que é o caminho de hoje, ou liberar o acesso diretamente,
que é caminho novo.

**As três perguntas que a spec responde, e a primeira é a que pode virar defeito.**

A **tensão com a RN-510**. A regra em vigor sobe o aviso na **primeira interação**, contando
qualquer gesto sobre algo acionável (P11), inclusive por teclado (P12), e **rearma** depois de
fechado (P14). A frase do dono diz "tenta fazer alguma ação". Pode ser a mesma coisa, e nesse caso
ele ratificou a RN-510 sem citar o nome dela. Ou pode ser **uma ação bloqueada**, e aí navegar pelo
menu deixaria de disparar o aviso, o que muda P11 e P14 e derruba parte do que a REV-VITRINE mediu em
08/08. A spec apresenta as duas leituras com o custo de cada uma e o dono escolhe. **Não se resolve
dentro da tarefa.**

O **mecanismo da liberação direta**. A RN-510 não a prevê. Hoje o aviso orienta a pessoa a pedir o
"código Leela" e mantém o campo de resgate ali (RN-414). Se o dono libera sem código, a pessoa sai da
vitrine sem digitar nada, e três coisas precisam ser escritas: o que tira a conta da vitrine quando
não houve resgate, o que o aviso diz para quem espera liberação em vez de código, e como a tela em
vitrine descobre que foi liberada sem a pessoa recarregar.

O **alcance do diretório**. Só contas aguardando convite, ou todas as contas com papel e origem. O
dono disse "esse cadastro", que cobre com certeza quem está esperando. O resto continua aberto.

**Aceite da spec.** As três perguntas acima têm resposta escrita antes de qualquer tarefa de código
nascer; a spec herda o cuidado do **P-IAMENU-1**, porque a tela lista PII; a propriedade que a RN-510
protege continua provada por allowlist fechada sobre o api-client, e a liberação direta não abre
exceção nela.

**Ordem.** Spec primeiro. O build só é dimensionável depois.

### ARENA-2-LISTA · os pilares saem da taxonomia que já existe

**Território.** RN-471 em [[LEELA-E12-landing]]; spec §Parte 3 em
`02-rodadas/2026-08-04-pos-pagamento/02-spec-pos-pagamento-e-arena-social.md`. **No ar hoje:** nada;
a tela de interesses não existe.

**O que a spec faz.** Deriva a lista de interesses das modalidades e dos pilares que os eventos já
usam, em vez de propor vocabulário editorial. A derivação tem uma decisão embutida que ela precisa
expor em vez de resolver sozinha: modalidades são granulares (corrida, trail, yoga) e pilares são
categorias (movimento, mente), então derivar é **agrupar**, e agrupar é escolha de vocabulário.

**Aceite.** A proposta traz o agrupamento com o **número de eventos por termo** ao lado, para o dono
cortar com dado e não com gosto; nasce **uma lista só**, porque a mesma serve os interesses da Arena
e a categorização da home que ele avisou que vai mexer (D-0802-1); nenhuma categoria é inventada sem
lastro em evento existente, e as que forem propostas por cobertura vêm marcadas como tal.

**Ordem.** Spec, sonnet. O build da tela de interesses continua retido pelo **LGPD-1**, que é do dono
e agora tem três frentes.

---

## Parte C · pesquisa

### ICONES-BIBLIOTECA · a fonte dos três ícones desenhados em casa

**Território.** [[LEELA-E01-design-system]]. **No ar hoje:** sim, os três ícones de WhatsApp, TikTok
e Strava desenhados em casa estão servidos na página do produtor.

**O que a pesquisa entrega.** Uma proposta, não uma adoção. Quatro critérios, e o último decide:
licença compatível com uso comercial, **incluindo as marcas de terceiros**, que é onde bibliotecas de
logo costumam ter cláusula própria; tree-shaking de verdade, porque o pacote entra no bundle das duas
aplicações; cobertura das três marcas que faltam com folga para as próximas; e coerência com o traço
do lucide, espessura, grade e cantos.

**Aceite.** A proposta chega ao dono com duas ou três opções comparadas nos quatro critérios, com o
tamanho que cada uma acrescenta ao bundle medido e não estimado, e com a recomendação explícita sobre
**conviver em vez de trocar** (lucide para o sistema, uma segunda fonte só para logos), que é a saída
provável quando ícone de logo tem regra de marca própria. **Nenhuma adoção acontece antes do veto
dele.** Ícone é marca, e marca não muda por decisão de esteira.

**Ordem.** Pesquisa curta, sem código. O resto do item 69 continua no painel, esperando o passeio
visual do dono.

---

## Parte D · operação sobre produção

### PURGA-DADOS-TESTE · o banco fica só com dado real ⚔⚔

**Território.** Dado de produção em `leela-hub`; os três documentos de `repasses` com status vetado;
`functions/src/limpeza/planoLimpeza.ts` como plano; Firebase Auth para as duas contas demo;
`functions/src/seed/platformAdmin.seed.ts:65`. **No ar hoje:** tudo, e é esse o ponto.

**O que ela absorve.** Três linhas do painel que pareciam tarefas separadas e são a mesma operação:
**VITRINE-2** (os dois eventos sem preço), **COMPROMETIDO-1** (os três repasses vetados que seguram
R$ 167,00) e a metade que sobrava do **ADMINSEP-3** (as contas demo). A antiga CONTAS-DEMO desta fila
deixa de existir sozinha.

**O escopo.** Todo dado de teste restante: os três repasses vetados, os eventos de teste, as
inscrições de teste e as contas `marina@demo-leela.dev` e `felipe@demo-leela.dev`.

**O que não pode ser tocado, e cada linha é um jeito de destruir algo que não volta.**

A **compra real do dono**, `PED-8CDHM`, com o ingresso `T93N7F`, e o evento a que ela pertence. É o
único pagamento real que a plataforma já processou e a prova do fluxo ponta a ponta.

A conta **`inguzbuilders@gmail.com`**, uid `FTqslV98itZUNGwL5ss6201d23Z2`. Ela **é** a antiga
`admin@demo-leela.dev`, renomeada e não recriada, e carrega a claim `platform_admin`. Qualquer
varredura que selecione contas pelo padrão de demonstração vai encontrá-la pelo histórico. Apagá-la
tira o dono da própria plataforma.

**⛔ A armadilha de nome.** O evento da compra real do dono chama-se **`teste-taxa-repassada`**. A
palavra "teste" está no identificador. Uma varredura que selecione dado de teste por padrão de nome
apagaria exatamente o que esta operação existe para preservar, junto com o único pagamento real que a
plataforma já processou. **A seleção é por lista explícita conferida contra o inventário congelado,
nunca por padrão de nome, de slug ou de e-mail.** Vale igual para a conta do dono, pelo histórico que
ela carrega.

**Quanto sobrou de verdade.** O expurgo de 06/08 já levou a maior parte: restam **dois** eventos vivos
no tenant `castelo-producoes`, `teste-taxa-repassada` e `corrida-inverno-floripa-2026`, e os dois são
os que sustentam o `vendidoBruto` de hoje. O primeiro é o da compra real e **não sai**. Então a purga é
menor do que o pedido sugere, e o inventário congelado é o que vai dizer o tamanho exato antes de
qualquer escrita.

**A forma, que não é burocracia.** O expurgo de 06/08 mediu que cada delete de inscrito dispara
`agregarFinanceiro`, `agregarEstoque` e `agregarDemografia`, e que os três só desistem se o documento
do evento não existir. Como o evento morre depois dos inscritos, os agregados renascem **órfãos sob um
pai inexistente**, invisíveis no console e para qualquer inventário futuro, porque `documents.list`
não devolve pai que não existe. A ordem do plano é o que impede isso, e ela já está codificada. A
amplificação medida foi de cerca de 7.800 escritas e 1 milhão de leituras para 710 inscritos.

Então: **inventário congelado antes de apagar**, review fria sobre o plano congelado, e só então o
apply, reusando o runner de `C:\dev\leela-apply-20260806\`. Backup de Firestore e de Auth feitos
**juntos** — restaurar um sem o outro devolve `ownerUid` para `uid-marina-castelo` com a claim do dono
no lugar, que é o incidente da manhã de 06/08 outra vez.

**Aceite.** O inventário é congelado e conferido **antes** de qualquer escrita, com o sha do plano
registrado; a compra `PED-8CDHM` e o evento dela sobrevivem, provado por leitura depois do apply; a
conta `inguzbuilders@gmail.com` autentica ao fim, com login provado, e mantém a claim; as duas contas
demo não autenticam mais, com `revokeRefreshTokens` antes da remoção e varredura por referências aos
uids delas antes e depois; nenhum agregado órfão sobra, conferido por inventário pós-apply; o
`comprometido` do caixa volta a bater com o dinheiro que existe; os dois eventos sem preço somem da
vitrine; o seed para de semear administrador contra o projeto real.

**O que a purga não resolve.** A lacuna estrutural que a REV3 registrou, recomputo de saldo sem
caminho de operador, **continua aberta**. Apagar o comprometido de teste não cria o botão que faltava.

**Ordem.** A operação mais perigosa desta rodada. Rota opus, review fria obrigatória sobre o plano
congelado antes do apply, e report com contagem antes e depois. **Nada de código de aplicação nesta
lane.**

**Executada em 10/08, fim de tarde — o resultado, movido do painel em 12/08.** O plano congelado rodou
inteiro em produção: **247 exclusões**, backup duplo tirado antes do primeiro delete, pós-check
integral verde e as duas contas demo fora do Auth (21 → 19). Os quatro intocáveis — a compra real
`PED-8CDHM`, o código `T93N7F`, o evento `teste-taxa-repassada` e a conta `inguzbuilders@gmail.com` —
foram relidos depois de tudo por sonda independente: vivos, com o mesmo carimbo de antes.

Três linhas do painel fecharam com ela. O **COMPROMETIDO-1**: os três repasses vetados morreram com o
resto do seed, o pós-check provou `comprometido = 0`, e o disponível para repasse voltou a bater com o
dinheiro real. O **VITRINE-2**: os dois eventos sem preço já não existem em produção (a leitura de
10/08 devolve 404 para ambos), então não há mais o que precificar nem despublicar. E a tarefa
**S318-T6**, o reparo dos dois kits de preço negativo, fica **sem objeto** — a leitura de 10/08
encontra zero `itensKit` nos dois eventos, o que confirma a inferência registrada no bloco 14 de
[[01-decisoes-dono]].

---

## O que volta ao dono antes de qualquer build

Duas perguntas continuam de pé, e as duas são de dinheiro. A terceira foi respondida.

**1 · O piso de R$ 10,00 vale sobre o total ou sobre o unitário.** Com o piso no total do pedido, um
lote de R$ 6,00 continua existindo e passa a só poder ser comprado aos pares. Com o piso no unitário,
o lote de R$ 6,00 não pode ser criado. As duas são defensáveis, custam telas diferentes, e a leitura
literal da frase é o pedido.

**2 · O gatilho do modal de liberação.** Qualquer gesto, que é o que a RN-510 já faz, ou só uma ação
bloqueada, que muda a regra e derruba parte do que a review de 08/08 mediu. Vai junto com o
mecanismo da liberação direta, que a RN-510 não prevê.

**Respondida pelo lote 2 · parcelamento acima de 3x — e a resposta caiu com a correção do dono.** A
leitura adotada era o teto em 3x, com 4x-12x saindo do ar. O dono vetou depois da pausa: o "até 3x
sem juros" era **exemplo**, e juros é operação manual dele pelo painel admin — teto e taxa não mudam
por código. O número que a leitura tinha atrás (**a plataforma perde dinheiro a partir de 7x**
absorvendo o custo; 12x sem juros custaria R$ 14,82 numa venda de R$ 300,00) continua válido como
informação para a escolha manual dele. A fronteira que fica de pé é a RN-182: custo de juros nunca
desce ao líquido do produtor, até ordem dele em contrário.

O **JUROS-1** sai desta lista livre de ordem — o save é dele, quando quiser, e o que ele salvar é a
decisão vigente.

## O que não gerou trabalho

**SERV-1**, o piso de R$ 3,00 ratificado, que já era o default e não muda nenhuma linha até alguém
digitar o valor na tela. **PB-11**, que mantém o comportamento em vigor. E os **cinco que continuam
com o dono**: o item 12 e os quatro do CRM, adiados sem default a construir.

Vale registrar o único deles cujo custo de espera **não** é zero: o **CRM-3**. O checkout pede e-mail
de cada atleta, obrigatório, a pessoa digita, o servidor valida, e a gravação descarta. Cada dia de
espera é um dia de e-mails coletados e jogados fora, e cada participante que não comprou continua
virando cliente novo a cada evento.
