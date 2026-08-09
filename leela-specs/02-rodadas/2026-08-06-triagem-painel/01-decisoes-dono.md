---
tags: [leela, decisoes, rodada, triagem, painel, default-permanente, estrangeiro, segredos, pre-compra]
trace: leela-pixreal-diag-20260804
lote: SEAL-DEFAULTS
data: 2026-08-06
---

# 01-decisões · três itens deixam de ser do dono e viram default permanente

> Uma fala do dono, respondendo à proposta que a lane SPEC-TRIAGEM apresentou no fim da vista de
> triagem (`a1cfb9e3`). Ela não decide desenho nenhum: decide **de quem é a decisão** daqui em
> diante, e transforma três defaults que já estavam em vigor em regra que não volta a cobrar
> ninguém.
>
> Zero código. O território desta lane foi `leela-specs/`, e as duas medições contra produção que
> ela cita foram feitas em leitura pura, com o comando registrado.

## O que o dono respondeu

Verbatim, em 2026-08-06:

> "aprovado, pode virar default permanente esses três, e corrija"

O "corrija" é a segunda metade do pedido e está registrado na Parte 3 desta página: a fila do
retroativo do código da compra ainda dizia que a execução era ato dele, e isso deixou de ser
verdade em 05/08.

## O critério, e por que ele é escrito

A proposta que ele aprovou não era "tire três itens". Era um critério, e é o critério que passa a
valer para as próximas levas. Um item vira decisão da esteira, com default permanente, quando as
três coisas valem **ao mesmo tempo**:

1. está aberto há oito dias ou mais;
2. nada quebrou nem foi cobrado nesse tempo;
3. a resposta não muda valor cobrado nem toca dado pessoal.

Falhar em uma das três basta para o item continuar sendo dele. Foi por isso que o **item 12** (o
domínio público, dez dias) e o **item 34** (a compra real, oito dias) ficaram onde estavam,
apesar da idade: o primeiro falha na terceira condição, porque remetente que cai em spam é
reputação e não preferência; o segundo falha na segunda, porque nada quebrou apenas na medida em
que nada foi provado.

**Uma precisão que a conferência de 08/08 obrigou a escrever, e que não muda a régua — só a torna
aplicável duas vezes seguidas.** A terceira condição fala da **resposta**, não do assunto. Isso
importa porque o HIP-R9-01 é um item cujo assunto é dinheiro do começo ao fim, e ainda assim passa:
a resposta dele é a RN-315, que já está em vigor, então converter congela o que já roda e nenhum
centavo muda de lugar. Para que a distinção não vire porta dos fundos, ela vem com trava: **item
cujo assunto é dinheiro cobrado ou dado pessoal só pode ser convertido quando a resposta é o status
quo e o portão de dinheiro sobrevive dentro da condição de reabertura** — no caso do HIP-R9-01, a
rota opus com review antagonista obrigatória, escrita na Parte 3. Sem as duas coisas juntas, o item
continua sendo do dono.

**Default permanente não é esquecimento com outro nome.** Cada um dos três abaixo sai do painel
com a condição de reabertura escrita. Reabrir continua custando uma frase do dono, e a esteira
reabre sozinha quando a condição acontecer — **desde que ela seja observável por alguém**, que é o
ponto onde a Parte 1 precisou de uma ressalva.

---

## Parte 1 · 12b e QUALIF-6 · o pagador estrangeiro

Os dois itens são a mesma pergunta escrita duas vezes. O QUALIF-6 diz, na própria letra, que o que
fica com o dono é *"reabrir o 12b com o gerente de contas do Asaas, ou seguir com o paliativo"* —
é o mesmo gesto, e converter um sem o outro deixaria a pergunta viva pela segunda porta.

**Uma ressalva honesta sobre a primeira condição.** Como item de painel, o QUALIF-6 tem dois dias,
não dezoito. O relógio que conta aqui é o do assunto, adiado pelo dono em 26/07, e o que autoriza
tratá-lo junto é a identidade da pergunta, não a idade da linha. Fica registrado para que ninguém
leia esta conversão como precedente de converter item recém-nascido.

### O verbatim original, como estava no painel

> ### 12b · liberação da conta Asaas para pagador estrangeiro
>
> Adiado por você em 26/07 e ninguém está cobrando. Fica listado porque o checkout de estrangeiro segue parado enquanto isso, e o lote `ESTRANGEIRO-CHECKOUT` nem contato com o gerente de contas teve.
>
> - **O que fica com você:** contatar o gerente de contas do Asaas e pedir a liberação de cobrança para cartões emitidos no exterior, com prazo de cerca de 6 dias úteis.
> - **Por que agora:** nada empurra. A liberação cobre cobrança avulsa ou assinatura, paga só por cartão internacional, e não cobre parcelamento nem link de pagamento.
> - **Onde aterrissa:** lacunas L1 e L6 do `ESTRANGEIRO-PAGAMENTO-REPORT.md`, a resolver com o gerente. Paliativo de custo zero enquanto não sai: comprador brasileiro paga pelo estrangeiro, que se inscreve com passaporte, sem tocar na RN-173.

> ### QUALIF-6 · o passaporte entra como regra, mas a jornada do estrangeiro trava no pagamento
>
> Você pediu passaporte para quem não tem CPF, e isso já era regra registrada desde 19/07 (RN-175, RN-176 e RN-177). A parte de identidade está especificada e não custa quase nada, porque a chave do registro de pessoas já reservou o espaço do documento tipado. O que não anda é o pagamento: **o Asaas exige CPF ou CNPJ para cobrar**, e a liberação para cartão internacional é o item 12b, que você adiou em 26/07. *O estrangeiro se inscreve com passaporte e não consegue pagar sozinho.*
>
> - **O que fica com você:** reabrir o 12b com o gerente de contas do Asaas, ou seguir com o paliativo.
> - **Por que agora:** nada empurra, e o paliativo funciona. Só não pode ser prometido ao estrangeiro o que trava no checkout.
> - **Opções:** seguir com o paliativo, comprador brasileiro paga pelo estrangeiro inscrito com passaporte (**default em vigor**, custo zero, já registrado no 12b) · pedir a liberação, cerca de seis dias úteis, e mesmo assim só cartão internacional à vista, sem PIX, sem boleto e sem parcelamento.
> - **Onde aterrissa:** delta da RN-176 em [[LEELA-E12-landing]] e delta da RN-177 em [[LEELA-E19-crm]]; a tela segue no lote `ESTRANGEIRO-CHECKOUT`, gated.

### O default que passa a valer

**O paliativo é o comportamento permanente.** O estrangeiro se inscreve com passaporte, pelas
RN-175, RN-176 e RN-177 que já são regra desde 19/07, e **um comprador brasileiro paga por ele**.
A RN-173 continua intocada. Nenhum contato com o gerente de contas do Asaas é agendado, e a
liberação de cartão internacional deixa de ser pendência.

O lote `ESTRANGEIRO-CHECKOUT` continua fechado, e a mudança é o motivo: ele deixa de estar
**gated à espera de uma decisão** e passa a estar **fechado por decisão**. As tarefas
LEELA-S309-T1, LEELA-S1211-T1, LEELA-S1211-T2 e LEELA-S1903-T1 seguem sem despacho.

### De quem é a alçada

Da esteira, como default vigente. O item só volta ao dono se a condição de reabertura acontecer.

### Condição de reabertura

**Um estrangeiro real querendo pagar sozinho.** Concretamente, qualquer uma das três:

- um organizador pede o botão "aceitar estrangeiros" para um evento com público de fora;
- alguém tenta comprar com cartão emitido no exterior e a compra é recusada no gateway;
- o dono decide vender para fora do Brasil como frente de produto.

Quando acontecer, a esteira devolve o item ao painel com o custo atualizado, porque a liberação
tem prazo de cerca de seis dias úteis e continua não cobrindo PIX, boleto nem parcelamento — o que
significa que reabrir tarde é reabrir com a venda já perdida. **Isso é o que a condição está aqui
para evitar.**

**Ressalva de 08/08 · o segundo gatilho não é observável hoje, e prometer que é seria falso.** O
primeiro e o terceiro chegam por contato humano e valem sozinhos. O segundo pressupõe que alguém
veja a recusa do gateway, e a medição citada na Parte 2 desta mesma página diz o contrário: zero
políticas de alerta, zero métricas de log, zero canais de notificação, e o Sentry em produção como
no-op sem DSN. Uma compra recusada por cartão emitido no exterior hoje não acorda ninguém — ela
morre no log até alguém abrir o log atrás de outra coisa, que foi exatamente como a redefinição de
senha de 05/08 foi descoberta, nove horas depois.

Então o segundo gatilho fica escrito como **dependente da pendência de observabilidade que está
com o CTO humano**, e passa a valer no dia em que ela for paga. Condição que ninguém consegue
observar é default permanente sem volta, que é o item perdido que esta régua existe para impedir.
A conversão não é revertida porque os outros dois gatilhos seguram a condição de pé sozinhos; o
que muda é que ninguém vai ler aqui uma vigilância que a casa não tem.

---

## Parte 2 · 11 · os três segredos do primeiro deploy

Este não vira default permanente, porque nunca houve default a permanecer. Ele estava listado como
ação do dono por herança de uma moldura que envelheceu — a de "antes do primeiro deploy" —, e o
próprio texto do item já dizia que a execução era da esteira. A conversão aqui é uma correção de
endereço, e ela veio com a verificação feita no mesmo gesto.

### O verbatim original, como estava no painel

> ### 11 · os três segredos do primeiro deploy — status a confirmar
>
> São três valores de configuração que o servidor precisa ter, cada um protegendo uma coisa diferente: a chave que cifra os dados bancários (`BANK_DATA_KEY`), o endereço do monitoramento de erros e a semente que embaralha a identificação dos clientes no CRM (`CRM_ID_PEPPER`).
>
> - **O que fica com você:** nada de imediato. A execução é da esteira, não sua.
> - **Por que agora:** o primeiro deploy real já aconteceu e o item nasceu com a moldura "antes do primeiro deploy", que envelheceu.
> - **Falta verificar:** o audit log da DEPLOY-FINAL prova `CRM_ID_PEPPER`, `ASAAS_API_KEY` e `ASAAS_WEBHOOK_AUTH_TOKEN` presentes no `runWith` de `createInscricaoCharge` em `leela-hub`. `BANK_DATA_KEY` e o endereço do Sentry não foram conferidos em produção. Sem `BANK_DATA_KEY`, o cadastro bancário falha fechado e não abre.
> - **Onde aterrissa:** Secret Manager do projeto `leela-hub`; fontes `COMF2-REPORT` e `E19-CRM-REPORT`.

### A verificação, feita em 06/08 e não adiada

A tarefa que a conversão criava é conferir as duas pontas que faltavam. Ela rodou na mesma lane,
contra o projeto real, em leitura pura.

**A chave dos dados bancários existe.** `node functions/scripts/prontidao-de-deploy.mjs`, conferência
C6, contra `leela-hub`: os sete segredos que o código espera existem no Secret Manager com versão
ativa, e `BANK_DATA_KEY` está entre eles — ele entra no `runWith` por constante (`ENV_BANK_DATA_KEY`)
e por isso é resolvido pela lista canônica do `secretsBinding.contract.test.ts`, não por literal.
**O cadastro bancário não falha fechado**, que era o único efeito nomeado no item. A `CRM_ID_PEPPER`
já estava provada e continua presente.

**O endereço do monitoramento de erros não existe, e isso é achado, não pendência.** Não há DSN em
`.env`, em `.env.leela-hub` nem no `.env.leela-hub` da landing; o `.env.example` traz apenas o
molde comentado; e nenhum dos dois bundles servidos carrega DSN. O SDK está instalado nas duas
telas (`@sentry/react` no painel, `@sentry/nextjs` na landing) e desenhado para **virar no-op
silencioso sem DSN** — é o que ele é hoje, em produção. Nas functions o SDK nunca entrou no
workspace, o que já estava escrito em `functions/src/platform/tenantLifecycle.ts:19`.

Ou seja: **não havia o que conferir do lado do Sentry, porque não existe Sentry ligado.** Isso não
é ponta solta deste item; é a mesma falta que a triagem já roteou ao **CTO humano** como custo de
infraestrutura recorrente, ao lado da ausência de política de alerta, de métrica de log e de canal
de notificação medida em 06/08. As duas metades da falta passam a viver num lugar só.

### De quem é a alçada

Da esteira, e a tarefa está paga. O resíduo — ligar o Sentry — é do CTO humano, junto do resto da
observabilidade, e não volta ao painel do dono por esta porta.

### Condição de reabertura

**Rotação de qualquer um dos segredos, ou projeto novo.** Se `BANK_DATA_KEY` for rotacionada, o
envelope persistido carrega `keyVersion` e a decifra escolhe pela versão (ADR-014), então a
operação é da esteira e não do dono. O que voltaria a ser dele é uma decisão que ainda não existe:
**trocar a `CRM_ID_PEPPER` depois de haver dado real**, porque isso obriga migrar todas as chaves
do CRM e do registry de pessoas. Enquanto ninguém propuser essa troca, não há item.

---

## Parte 3 · HIP-R9-01 · pré-compra do clube-influenciador

### O verbatim original, como estava no painel

> ### HIP-R9-01 · pré-compra do clube-influenciador
>
> Não é decisão a ratificar, é hipótese a testar com um organizador de verdade. Inscrições pelo link do clube entrariam em pré-compra e, ao atingir o mínimo definido pelo organizador, dispararia a cobrança de todas. *O Castelo publica o link com meta de 30 inscrições para liberar 20% de desconto, e a trigésima chega no oitavo dia, quando a reserva do cartão das primeiras já venceu.*
>
> - **O que fica com você:** uma conversa com um organizador real que responda as quatro questões de dinheiro. A janela da reserva no cartão, o que acontece quando o mínimo nunca é atingido, o que fazer com recusas parciais no disparo em lote, e se a pré-compra reserva vaga e estoque enquanto aguarda.
> - **Por que agora:** nada bloqueia. A versão retroativa do desconto é a parte cara, porque reabre reprocessamento de vendas já pagas, e segue parada.
> - **Opções:** validar em campo antes de escrever regra (**default conservador em vigor**: RN-315, o link do clube só ativa o desconto ao cruzar o mínimo, sem cobrança em lote).
> - **Onde aterrissa:** `02-rodadas/2026-07-18-ux-review/03-stories.md §S-R9-11`. Quando entrar, é dinheiro: rota opus com review antagonista obrigatória.

### O default que passa a valer

**A RN-315 é a regra, e não tem prazo de validade.** O link do clube só ativa o desconto ao cruzar
o mínimo de inscrições, sem cobrança em lote, sem estado de pré-compra e sem retroatividade. As
quatro perguntas de dinheiro continuam sem resposta, e é justamente por isso que nada é
construído: **hipótese sem organizador não vira regra**, e regra de dinheiro escrita no escuro é a
única coisa mais cara que a espera.

A hipótese sai do painel e vira card de backlog em [[V1-KANBAN]], gelado, ao lado do desconto
retroativo que já estava parado pela mesma razão.

### De quem é a alçada

Da esteira, como default vigente. Nenhuma tarefa nasce daqui.

### Condição de reabertura

**Um organizador real na mesa.** A conversa que responde as quatro perguntas — janela da reserva
no cartão, o que acontece quando o mínimo nunca é atingido, recusas parciais no disparo em lote, e
se a pré-compra segura vaga e estoque — não precisa ser do dono; qualquer organizador que use a
plataforma serve, e a esteira sabe conduzir a conversa. O que volta ao painel é o **resultado**,
não a pergunta.

Quando entrar, entra como dinheiro: rota opus com review antagonista obrigatória, e a versão
retroativa do desconto continua fora por decisão própria (PARKED desde a DEC-0719).

---

## Parte 4 · o "corrija" · o retroativo do código da compra já rodou

A fila da rodada de pós-pagamento ainda dizia, no critério de pronto, que a convergência do rerun
*"só pode ser provada depois do `--apply`, que é ato do dono"*. Isso está velho desde 05/08.

**O que aconteceu.** O dono autorizou explicitamente — *"pode redefinir. e roda o backfill"* — e o
maestro executou contra produção, com as três condições que a review antagonista REV-5B impôs
cumpridas: rebuild imediatamente antes, a linha `Destino: PRODUÇÃO — Firestore real` conferida no
ensaio antes de digitar `--apply`, e a saída gravada em arquivo.

**O resultado, verbatim da saída:**

```
Aplicado: 17 pedido(s) carimbado(s) · 17 reserva(s) · 22 espelho(s).
Não tocados: 0 fora do formato · 0 com reserva de outro pedido · 0 com vestígio de código anterior.
```

A conferência posterior devolveu `Já completos: 17 · sem código: 0` — a convergência que a review
exigia e que o critério de pronto não podia marcar antes. **A compra do dono ficou `PED-8CDHM`**,
a do evento `teste-taxa-repassada`, paga. A saída completa está em
`.nirvana/outputs/leela-pixreal-diag-20260804/backfill-apply-20260805.log`, que é o mapa
pedido→código e o que responde um chamado depois. Ele carrega o identificador da conta do
comprador dentro do id do pedido, então serve a chamado interno e não a print de grupo.

**O que isso destrava.** A ordem interna da Frente 5 dizia que o retroativo roda antes de 5c e 5d
irem ao ar, para as telas não estrearem mostrando ausência em toda compra que já existe. A ordem
foi cumprida, e as duas telas estão no ar desde o deploy de 05/08 com dado carimbado atrás delas.
A conferência visual da tela do operador, que a S1228-T3 declarava inconclusiva sem código no
banco, passou a ser conclusiva.

**A observação da triagem confere.** Esse "ato do dono" **nunca teve item no painel canônico**, e
foi por isso que ele não apareceu na vista de triagem dos sessenta. Ele vivia em três lugares —
o card da S1228 em [[V1-KANBAN]], o registro da rodada e o critério de pronto da fila — e em
nenhum painel. **Não sobra nada a fazer ali**: como o item nunca existiu, não há o que remover, e
a correção é toda nos três lugares onde ele existia. O que sobra é a lição de processo, e ela vale
escrever: **ação do dono que nasce fora do painel não é cobrável nem visível**, e a próxima que
nascer entra no painel no mesmo gesto em que entra no card.

---

## O efeito na contagem

O painel tinha **60** itens quando a triagem foi escrita. Saíram quatro linhas — 12b, QUALIF-6, 11
e HIP-R9-01 —, que a proposta contava como três decisões. **Ficam 56.**

| Bloco da triagem | Antes | Depois | Quem saiu |
|---|---|---|---|
| Trava trabalho | 16 | 14 | 12b, QUALIF-6 |
| Mexe em dinheiro ou em risco | 25 | 24 | 11 |
| Preferência | 18 | 17 | HIP-R9-01 |
| Não é seu | 1 | 1 | — |
| **Total** | **60** | **56** | |

A seção "Hipótese a validar em campo" do painel ficou vazia com a saída do HIP-R9-01 e foi
removida. Ela volta a existir no dia em que houver outra hipótese, e não antes.

## Reavaliação já marcada

O **CODPED-PODA-1** e o **PDF-SPINNER-1** são do mesmo tipo — os dois dizem no próprio texto que
nada empurra —, e falharam só na primeira condição, por idade. **A esteira os reavalia pelo mesmo
critério na semana de 10/08, sem nova pergunta ao dono.** Se passarem, saem pelo mesmo caminho
desta página.
