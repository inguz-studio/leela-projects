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
> estoque de vaga: ESTOURO-RESERVA, SERV-2-PISO, JUROS-ALINHAMENTO e SEMKIT-REPARO.

## O placar

| | Frentes |
|---|---|
| Parte A · build direto | 4 |
| Parte B · spec antes de build | 3 |
| Parte C · pesquisa | 1 |
| Parte D · execução administrativa | 1 |
| Parte E · só regra, sem código | 1 |
| Fecharam sem gerar trabalho | 5 linhas do painel |

**Três frentes estão retidas esperando o dono**, e as três são de dinheiro. Estão reunidas no fim,
na seção "O que volta ao dono antes de qualquer build". Nenhuma delas é adiamento de esteira: são
perguntas que a frase dele abriu e que só ele fecha.

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

**Ordem.** A 2b atravessa a RN-200 sobre dado de produção com 462 e 40 inscritos. Rota opus, review
antagonista dupla, como a fila de 05/08 já marcava. Nada nesta cadeia pega carona em deploy pronto.

### CLUBES-CTA · a aba deixa de só informar que está vazia

**Território.** `apps/landing` (`PainelClubes.tsx`) e `functions/src/cliente/meusClubes.ts`.
**No ar hoje:** sim, a aba subiu no deploy de 05/08 e a tela vazia já é o que a pessoa vê.

**O conserto.** O estado vazio ganha um CTA para se inscrever num clube. A entrada no clube continua
sendo épico próprio (E05) e não entra aqui.

**Aceite.** O CTA tem destino real e verificável, e nenhum botão inerte nasce nesta tarefa; o
destino é o que a spec do card decidir entre as duas leituras registradas no bloco 12 do registro
(descoberta dos clubes existentes, que é o default proposto, ou espera declarada com o caminho de
convite escrito); a tela continua sem prometer um mecanismo de entrada que não existe; nenhuma Rule
é afrouxada e nenhuma porta nova é aberta.

**Ordem.** Tarefa pequena sobre tela servida. Sonnet, sem review antagonista.

### SERV-3-RENOME · "Serviço" para fora, "Serviço da plataforma" para dentro

**Território.** 34 strings em três aplicações; RN-495 em [[LEELA-E12-landing]]; tarefas 4a, 4b e 4c
de `02-rodadas/2026-08-05-metricas-e-servico/04-fila-codigo.md`. **No ar hoje:** sim, o comprador já
lê "Taxa de serviço" no checkout.

**O conserto.** O rótulo encurta para "Serviço" onde o público é externo, comprador e organizador, e
fica "Serviço da plataforma" no super-admin, onde a palavra ainda precisa separar esta cobrança das
outras que a mesma tela mostra.

**Aceite.** Nenhuma tela de comprador ou de organizador diz "Taxa de serviço" nem "taxa Leela"; o
super-admin distingue esta cobrança das demais sem ambiguidade; as 34 ocorrências são varridas de uma
vez, porque trocá-las duas vezes é o desperdício que a pergunta ao dono evitou; nenhum identificador
técnico, campo de documento ou nome de variável muda junto, pela mesma disciplina da QUALIF-3.

**Ordem.** Sai da retenção com esta rodada. Sonnet.

### JUROS-ALINHAMENTO · o checkout para de cobrar juros em 2x e 3x ⚔ · **RETIDO**

**Território.** `packages/core/src/platform/commercialTerms.ts` (a estrutura e o default),
`packages/core/src/finance/calc.ts` (`buildInstallmentOptions`), e o documento
`commercialTerms/current` do tenant em produção. **No ar hoje:** sim, e **contra a decisão de hoje**.

**A conferência está paga, e foi feita nesta lane.** O checkout cobra a tabela Price a 2,89% a.m. de
`n = 2` em diante. Numa compra de R$ 300,00 em 3x, a compradora paga hoje R$ 105,83 por parcela e
R$ 317,49 no total, R$ 17,49 a mais que à vista. Sob a decisão do dono, ela deveria pagar R$ 100,00 e
R$ 300,00. A parcela mínima de R$ 10,00 que ele pediu **já está em vigor** (`parcelaMinima: 10`,
aplicada em `calc.ts:154`) e não gera tarefa.

**Por que está retido.** `InstallmentRules` tem uma taxa única para todas as parcelas. Não existe
"as três primeiras sem juros, o resto com". Só duas configurações são escrevíveis hoje, e nenhuma é
obviamente o que ele quis: `maxParcelas: 3` com `jurosAoMes: 0`, que zera o juro e tira do ar o
parcelamento de 4x a 12x; ou `jurosAoMes: 0` com `maxParcelas: 12`, que dá doze vezes sem juros à
custa da plataforma. A terceira saída, um campo novo `parcelasSemJuros`, atende a leitura mais
natural e custa migração no termo. **A pergunta está na seção final.**

**Aceite, quando destravar.** Dentro da faixa sem juros, o total parcelado é **exatamente** igual ao
à vista, provado por teste sobre os valores da RN-436; nenhum centavo de juro chega ao comprador
nessa faixa; o custo absorvido pela plataforma aparece no lugar onde a RN-458 o declarar, e **não**
desce ao líquido do produtor, que continua sendo `face − taxa(meio)` pela RN-182 intocada; o
documento `commercialTerms/current` do tenant é atualizado pelo caminho canônico do painel, e não por
escrita direta, para o histórico de versões ficar fiel.

**Ordem.** Dinheiro cobrado de gente real que já compra hoje. Rota opus, review antagonista, lane
própria, sem carona em deploy.

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

## Parte D · execução administrativa

### CONTAS-DEMO · matar `marina@` e `felipe@`

**Território.** Firebase Auth do projeto `leela-hub`; `functions/src/seed/platformAdmin.seed.ts:65`;
task A6 de `02-rodadas/2026-08-02-retomada/11-fila-contas-e-area-cliente.md`.

**O estado real, conferido nesta lane.** O expurgo de 06/08 **não tocou em conta de Auth nenhuma** —
está escrito com essas palavras em `.nirvana/handoffs/leela-apply-limpeza-20260806.md` §"O que NÃO
foi feito, de propósito". As 2.873 operações foram todas em Firestore. Logo:

`marina@demo-leela.dev` e `felipe@demo-leela.dev` **seguem vivas em produção**, com senha válida, e a
senha usada no preview está em texto claro no repositório (`preview-autologin.ts:35`).

`admin@demo-leela.dev` **não existe mais como endereço**. Ela foi renomeada, não apagada: o uid
`FTqslV98itZUNGwL5ss6201d23Z2` é hoje `inguzbuilders@gmail.com`, com a claim `platform_admin` e senha
provada. **Tentar apagar `admin@demo-leela.dev` seria apagar o super-admin do dono.**

**O que fazer.** Revogar as duas contas de demonstração, com `revokeRefreshTokens` antes da remoção.
Antes disso, varrer o Firestore por referências aos uids delas: a REV3 registrou que `ownerUid` já
apontou para `uid-marina-castelo`, então a conferência não é formalidade.

**Aceite.** As duas contas não autenticam mais; nenhuma referência viva no Firestore aponta para os
uids removidos, provado por varredura antes e depois; o seed para de semear administrador contra o
projeto real; a conta `inguzbuilders@gmail.com` é conferida intacta ao fim, com login provado; a
credencial de preview em texto claro no repositório deixa de valer para qualquer conta de produção.

**Ordem.** Ato administrativo, com backup de Auth já existente
(`C:\dev\leela-backups\leela-limpeza-prod-20260806\auth-users-20260806.json`). Não é lane de código.

---

## Parte E · só regra, sem código

### SEMKIT-2-REGRA · a saída sem kit é escolha do organizador

**Território.** RN-508 em [[LEELA-E03-operacao-evento]].

**O que muda.** A RN-508 passa de **default proposto** a **regra**. A plataforma não garante ao
participante uma forma de se inscrever sem kit; quem quiser abrir a saída cria um kit de R$ 0,00, e
quem quiser que todo participante leve o brinde do patrocinador simplesmente não cria. Evento sem kit
nenhum continua válido.

**Aceite.** A RN carrega a frase do dono como fonte; nenhuma tarefa nasce na frente 1 de
`02-rodadas/2026-08-05-sem-kit/04-fila-codigo.md`, porque as opções que geravam tarefa foram
recusadas; o rótulo do kit de preço zero continua saindo do conteúdo e não do sinal, pela `S318-T3`,
que já estava na fila e não muda.

---

## O que volta ao dono antes de qualquer build

Três perguntas nasceram das respostas dele, e as três são de dinheiro. Nenhuma é do tipo que a
esteira resolve com default.

**1 · Parcelamento acima de 3x.** "Até 3x sem juros" está decidido. De 4x a 12x, três leituras cabem
na frase e a estrutura de dados não representa a mais natural sem um campo novo. A oferta acima de 3x
sai do ar até o esquema maior existir, continua a 2,89% a.m. como está no ar hoje, ou o termo ganha
`parcelasSemJuros` e as duas coisas convivem. Enquanto isso não voltar, o checkout continua cobrando
R$ 17,49 a mais numa compra de R$ 300,00 em 3x, contra a decisão de hoje.

**2 · O piso de R$ 10,00 vale sobre o total ou sobre o unitário.** Com o piso no total do pedido, um
lote de R$ 6,00 continua existindo e passa a só poder ser comprado aos pares. Com o piso no unitário,
o lote de R$ 6,00 não pode ser criado. As duas são defensáveis, custam telas diferentes, e a leitura
literal da frase é o pedido.

**3 · O gatilho do modal de liberação.** Qualquer gesto, que é o que a RN-510 já faz, ou só uma ação
bloqueada, que muda a regra e derruba parte do que a review de 08/08 mediu. Vai junto com o
mecanismo da liberação direta, que a RN-510 não prevê.

O **JUROS-1** entra nesta lista por tabela: ele pede um save que selaria a v2 dos termos comerciais
com 2,89% em toda parcela. Enquanto a pergunta 1 não voltar respondida, executá-lo carimba o rastro
errado no histórico que ele existe para consertar.

## O que não gerou trabalho

**SERV-1**, o piso de R$ 3,00 ratificado, que já era o default e não muda nenhuma linha até alguém
digitar o valor na tela. **PB-11**, que mantém o comportamento em vigor. E os **cinco que continuam
com o dono**: o item 12 e os quatro do CRM, adiados sem default a construir.

Vale registrar o único deles cujo custo de espera **não** é zero: o **CRM-3**. O checkout pede e-mail
de cada atleta, obrigatório, a pessoa digita, o servidor valida, e a gravação descarta. Cada dia de
espera é um dia de e-mails coletados e jogados fora, e cada participante que não comprou continua
virando cliente novo a cada evento.
