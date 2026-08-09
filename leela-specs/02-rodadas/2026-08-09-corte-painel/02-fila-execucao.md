---
tags: [leela, fila, rodada, corte-painel, execucao]
trace: leela-painel-corte-20260809
lote: PAINEL-CORTE
data: 2026-08-09
fonte: 01-decisoes-maestro
---

# 02-fila de execução · o trabalho que as 37 decisões geraram

> **O que este arquivo é.** As decisões de 09/08 estão em [[01-decisoes-maestro]]; aqui está o que
> cada uma manda fazer, com território e critério de aceite. Vinte e sete dos 37 itens geram
> trabalho e dez não geram nada. Nenhuma tarefa aqui espera resposta do dono: as que esperavam
> ficaram no painel.
>
> **A divisão que importa.** A Parte A muda código, e boa parte dela muda código que já está
> servido em produção — cada item diz se está no ar, porque é isso que separa um ajuste barato de
> um deploy com gente em cima. A Parte B muda só spec, regra de negócio ou board, e não toca uma
> linha de código de aplicação.
>
> **Isto não é um board.** Os cards vivem no [[V1-KANBAN]], no padrão épico → história → tarefa.
> Aqui mora o critério contra o qual cada card é medido.

## O placar

| | Itens |
|---|---|
| Parte A · mudam código | 17 |
| Parte B · mudam spec, regra ou board | 10 |
| Fecharam sem gerar trabalho (Parte 2 do registro) | 10 |
| **Total dos decididos** | **37** |

Quatro itens exigem lane própria e estão marcados no texto: **PONTE-ELEGIVEL-1** (muda contrato de
chamada), **PARSE-1** (varre dezoito campos em duas aplicações), **DEPLOY-1** (escreve duas
functions que nunca existiram) e **ACUMULO-ESTOQUE-1** (roda contra dado de produção). Dois pares
dividem o mesmo arquivo e têm de andar juntos, ou uma lane apaga a outra: **VITRINE-VEU-1** com
**VITRINE-CONTRASTE-1**, e **AREA-MUDA-1** com **TROCA-EMAIL-1**.

---

## Parte A · os dezessete que mudam código

### PONTE-ELEGIVEL-1 · a sexta recusa nomeada na porta

**Território.** `functions/src/.../promoverParaProfissional.ts`, com `resgatarConviteOrganizador.ts`
como espelho de leitura. **No ar hoje:** a porta sim, o resgate não (responde 404 em produção).

**O conserto.** A porta passa a recusar as mesmas classes que o resgate recusa, com frase própria
para a conta inelegível, em vez de deixá-la atravessar e ouvir "código inválido" dias depois.

**Aceite.** As duas guardas recusam a mesma lista, provado por um teste que compara as duas em vez
de repetir a lista à mão; o divulgador e a ex-organizadora rebaixada param na porta com frase
nomeada; nenhuma resposta nova ensina o estado de conta de **terceiro**, só o da conta logada.

**Ordem.** Lane própria, com review antagonista, e **não pega carona em deploy pronto** — é
mudança de contrato de chamada, e foi a própria review que pediu assim.

### VITRINE-VEU-1 · o aviso passa a bloquear de verdade

**Território.** `apps/painel/src/routes/onboarding/OverlayConvite.tsx`. **No ar hoje:** sim, desde
06/08.

**O conserto.** Trocar o véu escrito à mão pelo `Modal` do design system, que vinte e seis telas do
painel já usam.

**Aceite.** Com o aviso aberto, os oito controles do fundo que a medição achou alcançáveis param de
ser alcançáveis, incluindo por clique de tecnologia assistiva; o aviso é portalizado para o `body`,
trava a rolagem, fecha no Esc e devolve o foco de onde ele veio; a moldura do Modal recebe o ajuste
visual na mesma passada, porque ela traz cabeçalho e botão de fechar próprios.

**Ordem.** Mesmo arquivo do VITRINE-CONTRASTE-1. Os dois numa lane só.

### VITRINE-CONTRASTE-1 · a borda do cartão sobe para `--border-strong`

**Território.** a classe da borda do cartão do aviso, no mesmo arquivo acima. **No ar hoje:** sim.

**O conserto.** `--border-subtle` vira `--border-strong`. Uma classe, nenhuma superfície tocada.

**Aceite.** O limite do cartão dá **3,82:1** contra o próprio cartão no tema brasa, medido no CSS
gerado e não no valor de origem do token; `--surface-raised` continua intacta, e nenhum outro modal
do painel muda de aparência.

### CONTA-2 · uma porta só para criar conta

**Território.** `PublicHeader.tsx:74-79` e a rota `/cadastrar` do painel. **No ar hoje:** o header
sim; a porta nova da landing ainda não.

**O conserto.** O `/cadastrar` passa a apontar para a porta da landing e o rótulo "Criar conta de
organizador" sai do header.

**Aceite.** Existe um único formulário que cria conta na Leela; nenhum caminho cria conta sem a
prova de posse do e-mail que o POSSE-EMAIL-1 exige; quem chegar ao endereço antigo aterrissa na
porta nova em vez de num formulário morto.

### INSCR-1 · o mesmo "inscrito" nas duas telas

**Território.** `apps/landing/lib/leitor.ts:542`; RN-486. **No ar hoje:** sim, com a exibição da
prova social suprimida.

**O conserto.** A página pública passa a contar o que o painel conta.

**Aceite.** As duas telas leem a mesma definição, de uma fonte só; um teste prova que cobrança PIX
gerada e não paga não entra na conta; se a prova social voltar a aparecer, ela já nasce certa.

### CONV-1 · o card de conversão some até existir denominador

**Território.** a faixa de KPIs do painel do organizador; tarefa 4d e `S824-T1`. **No ar hoje:**
sim, mostrando um traço.

**O conserto.** Esconder o card enquanto não houver contagem de visitas.

**Aceite.** O rótulo "visitantes → inscritos" não aparece em tela nenhuma; a faixa de KPIs não fica
com buraco visual no lugar dele; o contrato do card continua escrito para o dia em que a contagem
existir.

### PARSE-1 · as treze mensagens que não tinham para onde aparecer, e as cinco frases

**Território.** os cinco campos de dinheiro alcançáveis e os treze campos numéricos do painel; a
régua já escrita no cabeçalho de `packages/core/src/finance/parseValorPtBr.ts`. **No ar hoje:** sim,
a regra está valendo em produção sem que nenhuma tela a conte a ninguém.

**O conserto.** Duas metades. O defeito: os treze campos numéricos do navegador viram campo de
texto com teclado numérico, que é o que faz a mensagem existir em vez de o campo se apagar sozinho.
A calibragem: as cinco frases entram com o texto proposto, e nos dois casos em que o item oferecia
recusar em vez de avisar, avisa — capacidade de kit em branco e intervalo da automação passam a
dizer o que acontece quando ficam vazios.

**Aceite.** Cada uma das dezoito mensagens do parser tem caminho de exibição provado, campo a
campo; a régua do ponto e da vírgula aparece embaixo dos cinco campos de dinheiro; colar valor
vindo de planilha continua funcionando como funciona hoje; nenhuma das cinco frases é inventada na
tarefa — todas saem do texto proposto, e trocar qualquer uma delas custa uma string.

**Ordem.** Lane própria. Dezoito campos em duas aplicações é varredura, não ajuste.

### SENHA-1 · o conserto da redefinição sobe

**Território.** `functions/src/auth/solicitarRedefinicaoSenha.ts` e `packages/api-client/src/auth.ts`.
**No ar hoje:** o envio pela Brevo sim; o conserto do desfecho novo está em review e **não** está no
ar.

**O conserto.** Subir o que está revisado: o servidor passa a entender o desfecho que a proteção
contra enumeração produz, em vez de tratá-lo como erro interno.

**Aceite.** Endereço sem conta para de viajar como falha de infraestrutura; quem tem conta continua
recebendo o e-mail com a moldura da marca; a proteção contra enumeração continua **ligada** — a
saída fácil de desligá-la segue proibida por escrito; o caminho antigo do Firebase continua vivo
como rede de proteção.

### DEPLOY-1 · a máquina da porta do organizador sobe, com o seed retido

**Território.** as três functions de convite, das quais **só uma existe no código**; deploy de
`functions`, `apps/painel`, `apps/landing` e das Rules. **No ar hoje:** as telas sim, a máquina não.

**O conserto.** Escrever `gerarConviteOrganizador` e `revogarConviteOrganizador`, que nunca foram
escritas, e subir as três.

**Aceite.** As três respondem em produção e param de devolver 404, provado com controle positivo na
mesma passada, como a lane de 04/08 fez; o repositório e a produção param de divergir em número de
functions; **o seed do primeiro código de convite não roda** — ele continua retido pelo LGPD-1, que
segue com o dono, e subir a máquina não pode abrir a jornada por engano.

**Ordem.** Lane própria, porque escreve function nova e faz deploy.

### 66 · o domínio de terceiro sai do código

**Território.** `PUBLIC_BASE` em `apps/painel/src/lib/linkPublico.ts`. **No ar hoje:** sim, e em
produção o botão vai para o lugar certo — o risco é o ambiente novo.

**O conserto.** Tirar `be-hero.com.br` do último recurso. Sem endereço configurado, o botão declara
a falta.

**Aceite.** O domínio não aparece em nenhum arquivo do repositório; num ambiente sem configuração o
botão explica em vez de navegar; o endereço definitivo continua dependendo do item 12, que é do
dono.

### REENVIO-PARCIAL-1 · o reenvio diz quando entrega meia lista

**Território.** `reenviarIngresso` e `lerIngressosVivosDoPedido` em `functions/`; RN-382. **No ar
hoje:** sim.

**O conserto.** O retorno passa a dizer que a lista está parcial e quantos faltam, e o pedido deixa
de ser carimbado como entregue nesse caso.

**Aceite.** Com um inscrito pendente no pedido, a operadora lê "parcial" e o número que falta; o
pedido não recebe carimbo de entregue; nenhuma chave de uso único é queimada; a varredura continua
mandando a lista inteira depois, sem duplicar.

### INSCRITO-APAGADO-1 · a anomalia abre pendência com o motivo

**Território.** `emitirIngressosDoPedido` e `ingressosPendentes` em `functions/`; RN-382. **No ar
hoje:** sim.

**O conserto.** Pedido pago com inscrito apagado passa a abrir pendência com a anomalia nomeada, em
vez de existir só como linha de erro no registro do servidor.

**Aceite.** O atendimento encontra o motivo na própria compra; a pendência se fecha sozinha na
primeira passagem da varredura; **nenhum campo novo nasce em `pedidos/{id}`**, pela PROJPED-1.

### RN469-PROJECAO-1 · a compra ganha tela de detalhe

**Território.** `PainelCompras` e `minhasCompras.ts`; diretriz da RN-469. **No ar hoje:** a área do
cliente sim, com seis dos dezesseis campos.

**O conserto.** A linha da compra ganha caminho até uma tela de detalhe dentro da área, lendo a
mesma projeção que já vem do servidor.

**Aceite.** Os dezesseis campos do documento são alcançáveis pela tela, incluindo a decomposição do
valor, a taxa repassada e o parcelamento; nenhuma porta nova é aberta e nenhuma Rule é afrouxada; o
comentário que afirma que o detalhe "continua na tela do checkout" sai do código, porque é falso.

### CTA-PIX-1 · o botão diz o que faz enquanto o PIX não pagou

**Território.** `ctaMeusPedidos()` em `apps/landing/lib/areaDoCliente.ts` e a tela de confirmação do
checkout; RN-470. **No ar hoje:** não.

**O conserto.** Rotular por estado. No PIX pendente o botão fala de acessar a conta; no confirmado
continua falando de ingressos.

**Aceite.** Nos dois estados o rótulo corresponde ao que a tela seguinte entrega; quem está com PIX
pendente continua tendo saída na tela; o texto exato é uma string, e o dono veta quando quiser.

### AREA-MUDA-1 · a área explica a compra que existe e não aparece

**Território.** `lerPedidosDaConta`, `contaSemFriccao` e a tela da área; RN-451 e RN-449. **No ar
hoje:** a área sim.

**O conserto.** Quando o pedido traz o motivo carimbado pela guarda, a área diz em uma frase que a
compra existe e está ligada a uma conta de administração, e aponta o caminho.

**Aceite.** A lista vazia para de mentir no caso que a guarda cria; o motivo chega do servidor até a
superfície sem que nenhuma tela invente o texto; a autorização não muda em nada.

**Ordem.** Mesmo território do TROCA-EMAIL-1. Os dois numa lane só.

### TROCA-EMAIL-1 · a área distingue "não há compras" de "esta conta deixou de alcançar"

**Território.** `leituraArea.ts` e `PainelCompras`; RN-451. **No ar hoje:** sim.

**O conserto.** A tela ganha a frase quando existir compra sob o e-mail antigo. O fail-closed fica
exatamente como está.

**Aceite.** Quem trocou de e-mail lê a explicação em vez da frase de quem nunca comprou; o sinal
novo vem do servidor e não de inferência na tela; nenhuma compra passa a ser vinculada por
igualdade de endereço, que é o que o POSSE-EMAIL-1 recusa; o link do ingresso continua funcionando
sem conta, pela RN-452.

### ACUMULO-ESTOQUE-1 · a varredura roda e devolve o número

**Território.** task A5 (`S032-T5`); leitura pura contra o banco de produção. **No ar hoje:** a
RN-449 sim, fechando o fluxo e não o estoque.

**O conserto.** Contar quantas contas já carregam os dois lados, que é o estoque que a regra nova
deixou do lado de dentro.

**Aceite.** A varredura é **só leitura** e nenhuma escrita acontece; o número é reportado com a data
e o método; **se ele voltar maior que zero, a decisão de migração volta ao painel do dono**, com o
número na mão — migrar não entra nesta lane em hipótese nenhuma.

**Ordem.** Lane própria, porque roda contra dado de gente real.

---

## Parte B · os dez que mudam só spec, regra ou board

Nenhum deles toca código de aplicação. O trabalho é escrever a decisão onde ela passa a valer, para
a próxima entrega ser medida contra a frase certa.

### ADMINSEP-2 · o botão leva ao painel do organizador

**Território.** RN-451 em [[LEELA-E12-landing]]; task B5 de
`02-rodadas/2026-08-02-retomada/11-fila-contas-e-area-cliente.md`.

**Aceite.** A RN diz que o botão leva ao painel do organizador e só aparece para quem também é
organizador; a task B5 deixa de estar retida.

### MODAL-1 · a fronteira da edição fica em "sem venda"

**Território.** RN-500 em [[LEELA-E04-config-vendas]]; tarefas 1a e 1d da fila de
`02-rodadas/2026-08-05-modalidade-e-kit/`.

**Aceite.** A RN carimba a fronteira que as Rules já aplicam, com as três medições que a sustentam;
a `S316` sai do estado retido no board.

### MODAL-2 · remover recusa e nomeia quem impede

**Território.** RN-502; tarefa 1c da mesma fila, que vira `S316-T3`.

**Aceite.** A RN diz que a remoção recusa nomeando cada lote e cada kit que apontam; a tarefa nasce
com a lista na mensagem, e cascata não é implementada.

### QUALIF-1 · o número do CNPJ fica no recebimento

**Território.** RN-465 em [[LEELA-E09-financeiro-profissional]].

**Aceite.** A promoção a profissional carrega a pergunta e não o número; o número continua sendo
pedido no cadastro de recebimento; o formulário que o dono pediu breve não cresce.

### QUALIF-2 · o CPF só identifica

**Território.** RN-464 em [[LEELA-E12-landing]]; spec de
`02-rodadas/2026-08-04-qualificacao-profissional/` §Parte 4.

**Aceite.** A RN diz que o CPF é pedido uma vez, no checkout para quem compra e na promoção para
quem nunca comprou, e que ele **não** é credencial de entrada; o desenho da porta sobrevive ao login
social.

### QUALIF-3 · o rebatismo para no rótulo visível

**Território.** RN-468 em [[LEELA-E01-design-system]]; inventário na spec §Parte 9.

**Aceite.** A RN separa o que troca (título, sidebar, telas de entrada, botões da landing) do que
não troca (diretório, pacote, variáveis), com o motivo escrito; nenhum rename técnico entra na fila.

### QUALIF-5 · Apple só com as chaves

**Território.** RN-463 em [[LEELA-E00-fundacao-tecnica]]; cabeçalho de
`packages/api-client/src/auth.ts`, onde a dependência já mora.

**Aceite.** A RN diz que o Google sobe agora e que o botão da Apple só aparece quando as chaves
existirem; a `S033-T3` nasce com essa condição escrita, em vez de descobrir na tela.

### ARENA-3 · a Arena é seção da área do cliente

**Território.** RN-471 em [[LEELA-E12-landing]]; nota de fronteira em [[LEELA-E17-perfil-social]].

**Aceite.** A RN diz que a Arena tem dados próprios e privados, e a nota do E17 registra a
convergência possível numa direção só: bio e foto podem alimentar o perfil público depois, nunca o
contrário automático. As tarefas 3a e 3c continuam retidas pelo **ARENA-1**, que é do dono.

### PEDLIST-1 · a listagem que atravessa produtoras passa a ser declarada

**Território.** RN-469 em [[LEELA-E12-landing]].

**Aceite.** A RN declara a capacidade que as Rules já concedem, com a medição do teste de ataque ao
lado; a capacidade deixa de ser coisa que ninguém escreveu.

### CODPED-PODA-1 · o alerta olha o contador certo

**Território.** RN-474 em [[LEELA-E12-landing]]; `functions/src/checkout/codigoPedidoReserva.ts`
como referência de leitura.

**Aceite.** A RN diz que a coleção de reservas **não** é podada e que o gatilho do alerta é o
tamanho acumulado dela, não o volume de vendas do ano, com os dois números da medição escritos. O
alerta em si fica amarrado à política de alerta, que é pendência do CTO humano.

---

## O que não gerou trabalho

Dez itens fecharam com o default em vigor e não produzem tarefa nenhuma: **SCROLLBAR-1**,
**CONTA-1**, **RESPIRO-1**, **QUALIF-4**, **VITRINE-1**, **CODPED-1**, **PROJPED-1**,
**PDF-SPINNER-1**, **ADMIN-VE-AREA-1** e **PERFIL-1**. Cada um tem a condição que o traz de volta
escrita em [[01-decisoes-maestro]], Parte 2.
