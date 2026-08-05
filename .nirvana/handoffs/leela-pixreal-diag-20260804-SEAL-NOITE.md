---
tags: [leela, handoff, selo, boards, epicos, fila, painel]
trace: leela-pixreal-diag-20260804
lane: SEAL-NOITE-0805
data: 2026-08-05
papel: sf-cto (software-forge)
territorio: leela-specs/ (+ este handoff)
---

# SEAL-NOITE-0805 · a noite de nove lanes aterrissa nos boards, nos épicos, na fila e no painel

A ordem da noite proibiu que qualquer lane tocasse `leela-specs/`, para não colidir — e as nove
respeitaram. Este selo é a aterrissagem de todas elas. **Nenhuma linha de código foi tocada**, e
os dois arquivos de lane em voo (`apps/landing/app/(public)/minha-conta/AreaDoCliente.tsx` e
`packages/api-client/src/index.ts`) continuam sujos na árvore, intocados: o commit é `--only`
sobre os sete arquivos de spec mais este handoff.

Fonte de verdade usada: os handoffs de cada lane em `.nirvana/handoffs/`, não o resumo do brief.
Onde o handoff e o `git log` divergiam, valeu o `git log`.

**A BUILD-AREACLIENTE-2 aterrissou no meio deste selo** (`cdef2987`, `bdebe384`, `7486599e`), e o
selo foi refeito em cima do estado novo em vez de congelar o antigo: a B3 e a B5 entraram como
entregues, e a B4 (Meus Clubes) ficou como a única da frente B que não foi iniciada.

## O que foi selado

| Arquivo | O que mudou |
|---|---|
| `00-boards/V1-KANBAN.md` | seis cards saíram do Backlog; cinco foram para 🔄 Em execução e a S1225 foi para ✅ Feito; o card do reenvio teve a frase envelhecida corrigida; a S1214 deixou de "aguardar review antagonista" que aconteceu em 29/07 |
| `00-boards/V1-CHECKLIST.md` | as tarefas B1/B2/C1/C2 da fila ADMINSEP marcadas com prova; nasceu a seção da RODADA 2026-08-04 · pós-pagamento com S1225, S1214-T5, S1228 e o RF2-1 |
| `00-boards/BOARD-EPICOS.md` | uma entrada `+2026-08-05` na linha do E12, na altitude de épico |
| `01-produto/DECISOES-ABERTAS.md` | **quatro itens novos**, duas notas em itens existentes e **duas frentes da fila de construção removidas por estarem construídas** |
| `02-rodadas/2026-08-04-pos-pagamento/04-fila-codigo.md` | estado por frente, RF2-1 fechado, a saída da REV-RF2-1 e **sete itens de fila técnica nova**; critério de pronto marcado |
| `02-rodadas/2026-08-04-pos-pagamento/01-decisoes-dono.md` | a seção "O que a noite de 05/08 executou", com o mapa lane→entrega→prova, o bloqueio do reenvio e o que fica com o dono |
| `02-rodadas/2026-08-04-pos-pagamento/06-spec-codigo-pedido.md` | correção de fato: o volume do retroativo é **17**, medido, e não os 12 que a spec estimava |
| `03-canon/epics/LEELA-E12-landing.md` | **duas diretrizes permanentes novas** (RN-382 e RN-474), o estado de S1225/S1214-T5/S1228, a reconciliação das frentes B e C, e o commit que faltava na diretriz da RN-469 |

## Os cards, um a um

**Movidos para 🔄 Em execução** (todos com "código no repositório, fora do ar" escrito no card):
a área do cliente (S1222), o primeiro acesso (S1223), o login como overlay (S1221), o botão do
PDF (S1214-T5) e o código curto da compra (S1228).

**Movido para ✅ Feito:** o feedback do pedido na tela (S1225) — as quatro tarefas entregues, a
story revisada por antagonista, e a dependência dura do CTA paga em vez de contornada. O card diz
que nada está no ar.

**Corrigido em Em execução:** o card do reenvio de e-mail dizia *"espera review antagonista,
deploy e a BREVO-1"*. A review aconteceu (REV-F2F5, `e6c96a1d`), a BREVO-1 foi resolvida em 05/08,
e o RF2-1 que a review abriu foi construído e revisado. O card passou a dizer o que realmente
falta: deploy, e a credencial do super-admin para o reenvio dos dois e-mails do dono.

**Corrigido no Backlog e no checklist:** a S1214-T1..T4 dizia "aguarda a review antagonista" desde
29/07. A INGPAGE-REV rodou naquele mesmo dia e aprovou com ressalvas, com dois defeitos de borda
corrigidos.

## As duas diretrizes permanentes

Nenhuma RN nova foi criada — a última em uso continua sendo a 475. As duas reviews da noite
produziram **doutrina**, e ela entrou no molde que a casa já tinha ("Diretriz permanente da
RN-469").

**Diretriz permanente da RN-382** (do RF2-1 e da REV-RF2-1): quem autoriza o e-mail é a lista
fechada, calculada no contrato da emissão e nunca re-derivada pelo chamador — os chamadores são
dois e o defeito nasceu de um deles decidindo por conta própria; e a distinção entre "ainda pode
confirmar" e "terminal" sai da matriz canônica do núcleo, com desconhecido contando como
reversível. Segunda metade: espera esgotada não é estado final, porque a cura depende de um humano
lento — o gesto humano do reenvio reabre a pendência e re-arma uma janela contada.

**Diretriz permanente da RN-474** (da REV-COD5A e da FIX-D1): código que humano dita nasce de
entropia do sistema, nos **dois** geradores da casa, com Web Crypto e não `node:crypto` (provado
no consumidor real, não por palpite), sem viés de módulo e sem queda para `Math.random`; e o
espelho do código no inscrito é campo de servidor, com as Rules dizendo isso — quando o valor
precisar ser autoritativo, a fonte é o documento do pedido.

## O painel do dono

Quatro itens novos, todos vindos das reviews da noite, todos no formato da casa com exemplo em
itálico:

| ID | O que pergunta | Default proposto |
|---|---|---|
| **REENVIO-PARCIAL-1** | o reenvio manual no meio da espera entrega meia lista e carimba o pedido como entregue; recusa ou avisa? | **avisar e deixar seguir** — o retorno passa a dizer que é parcial e o pedido não é carimbado; recusar tira da operadora a única ferramenta que ela tem com a compradora no telefone |
| **INSCRITO-APAGADO-1** | inscrito apagado em pedido pago só existe como linha de log; merece extrato? | **abrir pendência com o motivo** — barato, auto-resolve na primeira passagem, e o atendimento passa a ter o que ler |
| **PDF-SPINNER-1** | o botão do PDF não tem indicador próprio de progresso | **manter como está** — é a premissa PDF-5, e reabri-la põe JavaScript de cliente numa rota que hoje não tem nenhum |
| **CODPED-PODA-1** | a coleção de reservas nunca é podada; onde mora o alerta? | **alerta no contador da coleção, sem poda** — podar devolveria o risco de dois códigos iguais na mesma tela da área do cliente |

**Sem item novo**, como a ordem pediu: o sorteio criptográfico entrou como nota `+05/08` no
**CODPED-1**, declarado como decisão técnica do maestro e não juízo de dono. E o **ADMINSEP-3**
ganhou uma nota dizendo o que ele bloqueia hoje: os dois e-mails represados do pedido do dono
esperam credencial, não código.

## A fila técnica nova

Dez itens, no molde RF2-*/RS1-* que a fila já usava — **RF2-4** (varredura sem limite nem cursor
num cron de 15 minutos, com pendência esgotada no result set para sempre), **RF2-5** (o registro
por inscrito e por passagem multiplicando ruído), **RS1-4** (o seed local sem código, que faz a
conferência visual da 5d parecer quebrada), **RS1-5** (o travessão que o normalizador não come, a
corrigir nos dois ou em nenhum), **RS1-6** (a callable que não devolve o código, contrato para a
5c), **RS1-7** (o `"host": "::"` das configs de emulador produzindo falso-vermelho), **RS1-8** (o
sorteio criptográfico que não chegou ao caminho da venda — em execução na BUILD-A4), **RS1-9**
(dois pedidos cancelados apontando para inscrito que não existe, estado que a ADR-011 diz ser
impossível) e **RS1-10** (o `pnpm build` da raiz que falha e muta o `pnpm-workspace.yaml`).

**O RS1-8 obrigou uma correção no que este selo já tinha escrito.** A diretriz permanente da
RN-474 dizia que o sorteio virou criptográfico nos dois geradores. É verdade do **default**, e
falso do caminho da venda: a cadeia do checkout passa `random` explicitamente em três pontos, com
`Math.random` no default de cada um, então toda compra nova continua com o gerador previsível. O
épico e o painel foram corrigidos para dizer isso, em vez de deixar a diretriz parecer cumprida.

**O RS1-9 não subiu ao painel de propósito** — é higiene de dados, e a regra permanente R-0803B-1
diz que limpeza não importuna o dono. Ficou na fila com a nota de que investigação vem **antes** de
qualquer limpeza: o estado impossível é o sintoma, e limpar sem entender apaga a evidência.

## O que eu NÃO consegui selar, e por quê

1. **A 5b foi selada num segundo passe.** Ela aterrissou (`d1d6582a` + `3a566f51`) segundos antes
   do primeiro commit deste selo, e o segundo passe a marcou entregue na fila, no checklist, no
   card e na rodada, com o comando do `--apply` verbatim no card do dono e a correção de fato na
   spec (o volume medido é 17, não 12). **A review antagonista dela não rodou**, e ela escreve em
   produção — está escrito nos quatro lugares.
2. **A B4 (Meus Clubes) não foi iniciada** — o handoff da lane declara isso. É a única tarefa da
   frente B que sobra, e ficou marcada como não iniciada, não como pendente de deploy.
3. **A frente B não foi revisada.** Ela é ⚔ e a review antagonista não rodou; o card e a fila
   dizem isso, com os dois vetores de fronteira nomeados.
4. **Nenhum estado "no ar" foi marcado.** Nada desta noite foi deployado, e o selo escreve isso em
   todo card, em vez de deixar o ✅ sugerir o contrário.
5. **Duas frases envelhecidas ficaram como estão, por falta de prova:** as linhas
   `LEELA-S1209-T2` e `-T3` do checklist ainda dizem "aguarda review antagonista". Existe uma
   CKUX-REV daquela época, mas ela não nomeia as duas tasks, e mudar o registro sem medir seria
   trocar uma imprecisão por outra. Fica para quem tiver o handoff daquela review na mão.
6. **`leela-specs/KICKOFF-BUILD.md` continua não versionado.** Não é desta lane e não foi tocado.

## Fronteira respeitada

Commit `--only` sobre sete arquivos de `leela-specs/` e este handoff. Nada em `apps/`, nada em
`functions/`, nada em `packages/`, nada em `firestore.rules`. Sem deploy, sem escrita em produção.
