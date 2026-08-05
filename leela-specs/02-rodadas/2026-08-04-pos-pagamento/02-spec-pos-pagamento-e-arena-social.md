---
tags: [leela, spec, rodada, checkout, pos-pagamento, area-do-cliente, arena-social, lgpd]
trace: leela-pixreal-diag-20260804
lote: SPEC-POSPAG
data: 2026-08-04
---

# 02-spec · O pedido responde na tela, e a Arena Social

> Decisões em `01-decisoes-dono.md` (verbatim). RNs em `03-rns-delta.md`, canônicas no
> [[LEELA-E12-landing]]. Fila em `04-fila-codigo.md`. Nada aqui é código; toda afirmação
> sobre o sistema foi medida no repositório ou vem do diagnóstico de 04/08, com o caminho
> citado.

## Parte 1 · O feedback pós-compra (S1225)

### O que existe hoje, medido

- A tela de confirmação já distingue pago de pendente: `StepConfirmacao.tsx:70` lê
  `confirmacao?.statusPedido === 'pago'` e `:100` alterna entre "Inscrição confirmada!" e
  "Pagamento pendente". O problema nunca foi a tela; foi o **dado não chegar**: em produção
  o estado `pago` só nasce do `confirmarPagamentoSandbox` (fail-closed com gateway real), não
  há `onSnapshot` nem polling em `apps/landing`, e as rules negam ao comprador a leitura do
  próprio pedido (`firestore.rules:2541-2543`, TODO em `:2528-2530`).
- A copy do PIX real promete o que nenhum canal em tela cumpre: *"a confirmação chega
  sozinha, em segundos — não é preciso avisar aqui"* (`StepPagamento.tsx:256-260`). Quem
  cumpriria era o e-mail, e no incidente de 04/08 ele quebrou (BREVO-1).
- No cartão, criar a cobrança É pagar (CHECKOUT-FIX-0803): confirmado e recusado voltam na
  própria chamada — o caso do cartão é de **tela**, não de escuta.

### O desenho da v1, por estado e por meio

A v1 é deliberadamente barata: **sem polling nem listener obrigatórios**, mas com a leitura
do próprio pedido aberta nas rules (RN-469), para que a tela possa consultar o pedido no
carregamento e num gesto explícito do comprador ("Atualizar estado" ou o retorno à tela).
Escuta automática (`onSnapshot`/polling) fica registrada como v2 e não bloqueia nada.

| Meio | Situação | O que a tela mostra |
|---|---|---|
| PIX | pagou no banco, webhook ainda não materializou o `pago` | **"Estamos confirmando o seu pedido"** + CTA "ver meus pedidos" (gated, ver Parte 2) + orientação de e-mail: confira a caixa de entrada, o acesso do ingresso vai por lá |
| PIX | webhook materializou `status: "pago"` | "Inscrição confirmada!", com o que a tela de pedido pago já mostra hoje (composição, código por inscrito) |
| PIX | cobrança expirou | o estado de expirado que já existe (cobrança nova), sem regressão |
| Cartão | confirmado na chamada | confirmação direta — sem passar por "Estamos confirmando" quando a resposta já veio |
| Cartão | recusado | recusa honesta com caminho de tentar de novo; nunca "Estamos confirmando" sobre uma recusa já conhecida |
| Cartão | resposta indeterminada (timeout/queda entre criar e responder) | **"Estamos confirmando o seu pedido"** + os mesmos CTA e orientação de e-mail |

Critérios (Given/When/Then) na story S1225 do épico. Os três elementos fixados pelo dono —
mensagem, CTA, orientação de e-mail — aparecem juntos em todo estado não-final.

### A copy para de mentir

Na mesma entrega da tela, a frase de `StepPagamento.tsx:256-260` muda: enquanto não houver
escuta automática, a promessa honesta é "pague dentro do prazo; assim que o pagamento for
confirmado, esta tela e o seu e-mail recebem o acesso" — a redação final é da task, o
contrato é **não prometer canal que não existe**. Falsificação: com a v1 no ar, nenhuma
superfície do checkout afirma confirmação automática em tela sem que a tela tenha como sabê-la.

### A abertura das rules, com fronteira estreita

RN-469 fecha o TODO E12. A propriedade, independente do mecanismo que a implementação
escolher (campo de vínculo ou docId, que já carrega o uid da sessão de compra —
`ped-{uid}-chk-{checkoutId}`):

- lê o pedido **somente** (a) a sessão cujo uid criou o pedido no checkout — inclusive a
  sessão anônima da compra — e (b) a conta vinculada pela confirmação
  (`contaSemFriccao.contaUid`), que é quem chega pela área do cliente;
- qualquer outro token, anônimo ou nomeado, continua negado — o caso de ataque tem teste
  obrigatório, no molde da RN-451;
- `write: if false` permanece intocado; organizador e `platform_admin` continuam lendo como hoje;
- nenhuma outra coleção abre — `inscritos` e `pessoas` seguem fechadas ao cliente, e o
  caminho da área do cliente segue sendo callable (RN-451). A abertura de `pedidos` ao
  próprio comprador não contradiz a RN-451: o que ela proíbe é abrir dado de tenant a
  token de participante; o pedido do próprio comprador é dado **dele** (endereço e aceites
  incluídos, que ele mesmo forneceu).

## Parte 2 · Reconciliação com S1222 e S1223

- **S1222 (Meus Ingressos/histórico) ganha o papel de destino do CTA.** O botão "ver meus
  pedidos" da tela de confirmação aterrissa na área do cliente. Dependência dura: enquanto a
  S1222 não sobe, o CTA **não aparece** — a tela v1 vive de mensagem + orientação de e-mail.
  Apontar CTA para rota inexistente repetiria o erro que a ordem C1→C2 da fila ADMINSEP já
  proibiu (trocar tela feia por 404).
- **S1223 (primeiro acesso) fecha o ciclo do e-mail prometido na tela.** A orientação
  "confira a caixa de e-mail" só é honesta de ponta a ponta com o link aterrissando em tela
  da Leela. Reconciliação com o que a DEPLOY-EMAIL já pagou: `actionCodeSettings` existe
  desde `abf4b794` (`functions/src/auth/linkDeAcao.ts`) e o link de conta criada cai hoje em
  `/redefinir-senha` do painel como interim; o que resta da S1223 é a tela `/definir-senha`
  na landing (C1) e a troca de uma linha do destino (C2), terminando em Meus Ingressos.
- **A fila S1222/S1223 vira pré-requisito ou entrega conjunta do CTA** — é a resposta da
  POSPAG-1, registrada em `01-decisoes-dono.md`. A fila da rodada ADMINSEP
  (`2026-08-02-retomada/11-fila-contas-e-area-cliente.md`) continua valendo linha a linha,
  incluindo o bloqueio da B2 pela S1221-T1 (a landing não tem login nenhum).

## Parte 3 · A Arena Social (S1226)

### Onde mora — default vetável

**Default: a Arena Social é uma seção da área do cliente** (E12), atrás da mesma sessão
autenticada, editada pela própria pessoa. O dono a descreveu no mesmo fôlego da área do
cliente, e é lá que "os dados dela" já moram.

**Sinal de outra intenção, registrado como pergunta (ARENA-3):** o E17 (perfil social)
já especifica `perfis/{handle}` com mini bio (`bio?` ≤280), avatar e visibilidade — um
perfil PÚBLICO de link-in-bio. A Arena Social se parece com outra coisa (perfil de conexão
entre participantes, com dado sensível), mas os campos se sobrepõem (bio, foto). Construir
as duas sem decidir a relação produziria duas bios e duas fotos da mesma pessoa. A pergunta
sobe ao painel; o default não constrói nada em `perfis/{handle}` e mapeia a convergência
futura (a bio/foto da Arena podem alimentar o perfil E17 depois, nunca o contrário
automático — dado sensível não vaza para superfície pública).

### Campos e comportamento

| Campo | Tipo | Observações |
|---|---|---|
| Mini bio | texto curto (teto na task; referência: os 280 do E17) | opcional |
| Gênero (da pessoa) | seleção | opcional; vocabulário da lista na task, com "prefiro não informar" |
| Gêneros de pessoas com quem quer se conectar | seleção múltipla | **opcional SEMPRE** — dado sensível por inferência, RN-472 |
| Tipos de experiência de interesse | seleção múltipla | vocabulário de experiências (D-0802-1) |
| Interesses nos pilares de bem-estar | seleção múltipla | a lista dos pilares é ARENA-2 — não existe canônica no repo |
| Foto | **a mesma da conta** | reaproveitada; a Arena não tem upload próprio. Trocar a foto é ato da conta, e a Arena reflete |

- Edição: só a própria pessoa, autenticada. Nenhum campo é obrigatório para usar a área do
  cliente — a Arena vazia é estado válido e honesto.
- Vocabulário: experiência e participante em toda superfície (D-0802-1); nada de
  "atleta"/"corrida" nos rótulos.
- Visibilidade: **default restrito — só a própria pessoa vê o que preencheu** até o dono
  decidir ARENA-1 (outros participantes? organizador?). O dado sensível da linha 3 tem
  visibilidade própria e mais restrita ainda (RN-472), independente do que ARENA-1 decidir
  para o resto.

### LGPD — o campo que pede tratamento de art. 11

"Gêneros de pessoas com quem tem interesse em se conectar" permite inferir orientação
sexual — dado sensível na LGPD (art. 11). A spec trata isso como contrato, não como nota:

1. **Opcionalidade real.** O campo nunca é exigido, nunca é pré-selecionado e o vazio não
   degrada nenhuma função da área.
2. **Consentimento específico e destacado.** Preencher o campo exige um aceite próprio, no
   ato, com finalidade declarada em linguagem comum ("usamos isto só para sugerir conexões
   em experiências; você pode apagar quando quiser"). Consentimento genérico de conta não
   serve para dado de art. 11, e o carimbo (versão do texto + hora do servidor) segue o
   molde de prova de aceite que o checkout já pratica.
3. **Finalidade única.** O dado serve à conexão entre participantes dentro do produto e a
   nada mais: não entra em projeção pública, não entra em export de organizador, não vira
   segmentação de marketing.
4. **Visibilidade default restrita.** Nasce visível só para a própria pessoa. Qualquer
   exposição a terceiros é opt-in explícito e separado do preenchimento, e mesmo o desenho
   futuro de "match" deve preferir revelar a compatibilidade sem revelar o dado.
5. **Apagar apaga.** Remover o valor remove o dado e o consentimento registrado vira
   revogado; não fica cópia em projeção nenhuma.

**Amarração com LGPD-1, sem duplicar:** LGPD-1 (painel) segue sendo o item do consentimento
do organizador no resgate de convite — outra frente, mesma revisão jurídica. A nota +04/08
no próprio LGPD-1 aponta que a Arena Social criou a segunda frente de LGPD do produto
(art. 11, consentimento específico), especificada aqui e na RN-472, para a mesma conversa
jurídica resolver as duas de uma vez. Nenhum item novo de painel nasce para isso: o que é
decisão de produto está em ARENA-1/2/3, e o que é contrato já está escrito na RN.

### Os pilares de bem-estar não existem em doc nenhum — ARENA-2

Varredura por "pilares de bem-estar" no repositório: zero definições. O que existe de
vocabulário próximo: `MODALIDADES_CLUBE` no core (`clube-opcoes.ts:41-51` — corrida de rua,
trail, ciclismo, MTB, caminhada, triatlo, natação, funcional, bem-estar/yoga) e as pastas
temáticas de discovery (`05-discovery/pilares/` — que são pilares do PRODUTO, não de
bem-estar). Proposta que sobe com o item: derivar uma lista curta de pilares de EXPERIÊNCIA
de bem-estar (movimento, mente/meditação, natureza/outdoor, comunidade, nutrição,
descanso/retiro — ilustrativa, o dono crava) e usar a mesma lista nos dois lugares que vão
precisar dela: os interesses da Arena e a categorização de experiências da home que o dono
disse que vai mexer (D-0802-1 §2). Uma lista só, dois consumidores, zero deriva.

## Premissas assumidas, com default profissional

1. **A tela v1 sem CTA enquanto a área não existe** é preferível a atrasar a tela inteira.
   O dono pediu "de início" a mensagem; o CTA entra quando tem destino.
2. **A leitura do próprio pedido não substitui o callable da área do cliente.** Na área, o
   histórico continua vindo por callable (RN-451); a leitura direta serve à tela de
   confirmação, onde a sessão da compra ainda é a viva. As duas convivem.
3. **A Arena Social não bloqueia S1222/S1223.** Ela é seção da área, entra depois dos vetos
   e nada do miolo (ingressos, histórico, senha) espera por ela.
4. **Nenhum campo da Arena entra no modelo antes dos vetos ARENA-1/2/3.** A spec fixa o
   contrato; o shape final do doc é da task, depois do veto.
