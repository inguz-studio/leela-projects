# Laudo — o que o painel master faz quando a escrita volta negada

trace `leela-fronteira-auth-20260806` · lane `FRONTEIRA-AUTH` · employee `sf-frontend-lead`
Complementa o handoff da lane. Destinatário: maestro (e, pelo que ele decidir, o dono).

---

## O achado em uma frase

Depois do deploy das Rules, **o dono vê um painel master inteiro, populado e
convincente — e sete das oito superfícies de escrita recusam.** Só uma delas diz
a ele, em português, que o motivo é permissão.

Isso é pior do que um painel vazio. Painel vazio se explica sozinho; painel cheio
com botão que falha manda a pessoa procurar defeito no lugar errado.

---

## Por que acontece

A capacidade `platformAdmin` tem duas pernas e nem todo mundo aprendeu as duas:

| Camada | Lê as duas pernas? | Consequência |
|---|---|---|
| Firestore Rules (`firestore.rules:73-77`) | **Sim** (lane PAPEL-DUPLO) | as LEITURAS passam |
| Guarda de tela (`plataforma/_data/session.ts`) | **Sim**, desde esta lane | o painel ABRE |
| Guards das Cloud Functions | **Não** — 16 sítios no papel literal | as ESCRITAS recusam |

`isPlatformAdmin` do `@leela/core` **não é importado por nenhum guard de escrita
em `functions/src/`**. Os guards de Functions são território de outra lane; este
laudo é o mapa para ela.

---

## §1 · Leituras: 12 de 13 passam

Doze caminhos de leitura vão direto ao Firestore e já estão liberados pelas Rules
de duas pernas: tenants, detalhe do tenant, termos, catálogo de planos, convites,
tabela de taxa, fila de repasses, retenção vigente, fila de estornos, roll-ups do
macro. Tudo renderiza.

**A única leitura que morre** é `getBankDetailsForPayout`
(`functions/src/finance/getBankDetailsForPayout.ts:130`), dentro do modal de
registrar pagamento. Não há atalho por Firestore de propósito:
`dadosBancariosSecret` é `read, write: if false` nas Rules (`:319-321`).

⚠️ **Cada abertura desse modal grava uma linha `negado_papel` no log de
auditoria de acesso a dado bancário.** O dono, tentando de novo como a tela
manda, produz um rastro de acessos negados a dado sensível — em nome dele.

---

## §2 · Escritas: o que o dono vê, superfície por superfície

| Superfície | Recusa? | O que aparece na tela | O que a tela deixa ele fazer |
|---|---|---|---|
| Tenants — provisionar | sim | **"Sua conta não tem permissão de administrador da plataforma para esta ação."** — a única mensagem honesta do painel | modal **fica aberto**, botão reabilitado → repete para sempre |
| Tenant — aprovar/suspender/reativar | sim | mesma mensagem honesta, em toast **e** inline | modal fecha, botão reabilitado |
| Termos — salvar | **não** (Firestore) | — | funciona |
| Planos — salvar plano | **não** (Firestore) | — | funciona |
| Planos — aplicar plano | sim | toast com a mensagem crua do servidor; **o inline diz "Tente novamente"** e contradiz o toast | modal fica aberto → repete |
| Convites — gerar/revogar | **não** (Firestore) | — | funciona |
| **Taxa global — salvar** | sim | ⚠️ **"Verifique os valores e tente novamente."** — o `onError` descarta o erro (`TaxaGlobalRoute.tsx:73-79`) e a mensagem aponta para os NÚMEROS | formulário intacto, botão reabilitado → **o pior diagnóstico do painel** |
| Repasses — aprovar/recusar | sim | toast com "Apenas platform_admin executa esta operação (RN-353)" | ⚠️ **ConfirmModal não fecha** e o Confirm reabilita → botão de dinheiro martelável |
| Repasses — registrar pagamento | sim (na leitura) | "Não foi possível carregar os dados bancários. Feche e tente novamente." | botão **desabilitado** → beco sem saída, e cada tentativa audita um `negado_papel` |
| Repasses — salvar retenção | sim | toast honesto; inline genérico "Tente novamente" | botão reabilitado |
| **Estornos — aprovar/recusar** | sim | ⚠️ **"Alvo pertence a outro tenant (RN-400)."** | ConfirmModal não fecha → repete |
| **Estornos — estornar furando a véspera** | sim, **sempre** | ⚠️ "Furar o corte de véspera é ação exclusiva do admin da plataforma (RN-376)" — dito a quem É o admin da plataforma | modal fica aberto → repete |
| **Estornos — cancelar sem devolver** | sim | ⚠️ "Pedido pertence a outro tenant (RN-400)." | idem |
| Macro | n/a | não existe escrita | — |

### As quatro mensagens que mandam o dono para o lugar errado

1. **Taxa global** culpa os *valores*. Ele vai conferir números que estão certos.
2. **Estornos** dizem *"pertence a outro tenant"*. Ele vai caçar o pedido "certo",
   que não existe — a recusa não tem nada a ver com o pedido.
3. **"Furar o corte de véspera é ação exclusiva do admin da plataforma"** é dito
   exatamente a quem administra a plataforma. É a frase mais confusa do conjunto.
4. **Registrar pagamento** diz "Feche e tente novamente" para uma leitura que
   nunca vai funcionar, e cobra um registro de auditoria por tentativa.

### O defeito que não é recusa, e é o mais grave

`functions/src/finance/operador.ts:64` e `functions/src/eventos/criarEvento.ts:290`:
quando o dono age sobre um pedido **do próprio tenant**, a escrita **passa** — mas
é carimbada `trilha: 'organizador'` em vez de `'plataforma'`. **O rastro de
auditoria diz que o organizador fez, não a plataforma.** Um estorno decidido pela
plataforma fica registrado como decisão do produtor.

E o irmão: `assertTenantAtivoSeOrganizador` (`operador.ts:79-86`) passa a bloqueá-lo
com `failed-precondition` num tenant suspenso — exatamente o caso que o back-office
da plataforma existe para resolver.

---

## §3 · O que eu recomendo, e o que eu não fiz

**Não toquei em `functions/src/`.** Os guards são de outra lane e mexer neles sem
o dono da lane é como as árvores compartilhadas se destroem. O mapa está na §1 do
inventário: 16 sítios, dos quais 5 helpers compartilhados (`atores.ts:45`,
`criarEvento.ts:280` e `:248`, `operador.ts:41` e `:64`) cobrem a maioria.

**A ordem que eu recomendo ao maestro:**

1. **Guards das Functions** — trocar o papel literal por `isPlatformAdmin` nos 5
   helpers resolve a maior parte dos 16 sítios de uma vez. Isso apaga o problema
   na raiz e torna a §2 inteira irrelevante.
2. **Só se o passo 1 não couber agora**, então consertar as mensagens. Mas
   consertar mensagem antes do guard é ensinar o dono a conviver com o defeito.
3. **Independente dos dois**: `trilha` carimbada errada (§2, último bloco) é
   corrupção silenciosa de auditoria, não inconveniência de tela. Ela não se
   manifesta como erro e não vai aparecer em teste de interface nenhum.

**Enquanto o passo 1 não acontece**, a resposta honesta ao dono é: *entre, olhe,
não clique* — e o maestro decide se vale abrir o painel nessas condições ou
esperar o guard.

---

## §4 · O que ficou sem prova

- **Nada disto foi executado contra produção nem contra emulador.** É leitura de
  código: caminho da chamada, guarda que recusa, e o que o `catch` da tela faz
  com a recusa. As suítes de integração das Functions exigem os emuladores de
  outra lane.
- **O crachá real do dono** depende do deploy das Rules, que é do maestro.
- **A ordem exata em que ele vai bater nas telas** é dele; o laudo cobre todas.
