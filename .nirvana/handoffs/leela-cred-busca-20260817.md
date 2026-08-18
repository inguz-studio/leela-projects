---
tags: [leela, handoff, credenciamento, balcao, busca, cpf, pii]
aliases: [Handoff CRED-BUSCA-BUILD]
atualizado: 2026-08-17
---

# Handoff · CRED-BUSCA-BUILD (17/08)

- **Trace:** `leela-redesign-v2-20260810` · lane `CRED-BUSCA-BUILD`
- **Worktree:** `C:\dev\leela-wt-credbusca` · branch `cred-busca` · base `07093e6b`
- **Origem:** falha achada pelo dono EM USO REAL, validando o mock do credenciamento
- **Escopo:** o card de conferência do balcão + busca por CPF. ⛔ **Não** executa a reforma
  do credenciamento da leva 22 (duas abas / scanner CRED-1).

## A falha

Ao buscar um participante no balcão, o operador via **só o nome**. A linha de resultado
renderizava `{i.atletaNome}` e nada mais (`AtendimentoPanel.tsx:283`), e a ficha que aparecia
depois da escolha trazia nome + modalidade + selo do kit — sem lote, sem contato de compra, e
com o tamanho do kit escondido atrás de um catálogo que pode estar vazio.

## Inventário — onde cada campo do aceite mora

Feito ANTES de codar. Nenhum modelo novo: tudo já existe na inscrição ou no pedido.

| Aceite | Campo | Doc | Legível pelo operador de balcão? |
|---|---|---|---|
| Nome completo | `Inscrito.atletaNome` | `eventos/{id}/inscritos/{id}` | ✅ |
| Modalidade | `Inscrito.modalidade` (string; é o próprio rótulo) | inscrito | ✅ |
| Lote | `Pagamento.loteNome` (🔁 desnormalizado) | `pagamentos/{id}` | ❌ **achado 1** |
| Kit — o que está incluso | `Kit.itens: string[]` (RN-230, linguagem de produto) | `eventos/{id}/kits/{kitId}` | ✅ |
| Kit — tamanho escolhido | `Inscrito.tamanhos` (`itemId → sufixo de SKU`) | inscrito | ✅ |
| E-mail de compra | `Pedido.responsavel.email` | `pedidos/{id}` | ❌ **achado 1** |
| Telefone de compra | `Pedido.responsavel.telefone?` | `pedidos/{id}` | ❌ **achado 1** |
| Busca por CPF | `Inscrito.dadosPessoais.cpf` (11 dígitos na escrita nova) | inscrito | ✅ |

Fontes: `packages/core/src/eventos/inscrito.ts:154`, `.../dadosPessoais.ts:173`,
`packages/core/src/pedidos/pedido.ts` (`ResponsavelPedido:97`, `ItemPedido:123`),
`packages/core/src/pedidos/pagamento.ts:427`, `packages/core/src/eventos/kit.ts:74`.

## Achados — campos que as Rules não deixam ler

⛔ **Nada de Rules foi aberto por esta lane.** Os três achados abaixo são para adjudicação.

### Achado 1 — o operador de balcão não lê a compra

`firestore.rules` tem duas taxonomias de leitura, e elas divergem exatamente nos campos que o
dono pediu:

| Coleção | Regra de leitura | Linha |
|---|---|---|
| `eventos/{id}/inscritos` | `isTenantWriter` **ou** `papelEventoAtivo(['organizador','administrador','operador'])` | `:931` |
| `eventos/{id}/kits` | `isTenantMember` **ou** `papelEventoAtivo([… ,'operador'])` | `:1039` |
| `eventos/{id}/lotes` | `isTenantMember` **ou** `papelEventoAtivo(['organizador','administrador'])` — **sem operador** | `:1214` |
| `pedidos` | `isTenantWriter` **ou** `isPlatformAdmin` **ou** o próprio comprador — **sem papel de evento** | `:2739` |
| `pagamentos` | `isTenantWriter` **ou** `isPlatformAdmin` — **sem papel de evento** | `:2599` |
| `itensKit` | `isTenantMember` — **sem papel de evento nenhum** | `:2798` |
| `pessoas` (registro global por CPF) | `read, write: if false` — fechado a todos | `:2757` |

Consequência real no balcão: **dono/staff do tenant (`isTenantWriter`) veem o card inteiro.**
Um operador que só tem papel de EVENTO (`equipe/{uid}.papel === 'operador'` + claim) lê o
inscrito e o kit, e **não** lê pedido nem pagamento — ou seja, perde **lote, e-mail de compra e
telefone de compra**, os três campos novos do aceite.

Isso não é bug desta lane: a taxonomia é deliberada e está comentada nas próprias Rules
(`:2594-2598`, "promoter é membro do tenant mas NÃO enxerga dinheiro"). O ponto é que o pedido
do dono põe contato de compra na tela de quem, hoje, é o papel mais fraco do balcão. **Decisão
de produto, não de código.** As opções, sem que a lane escolha nenhuma:

1. Deixar como está — o operador puro vê o card degradado; quem credencia com conta de
   staff vê tudo. (É o que está no ar depois desta lane.)
2. Abrir `pedidos`/`pagamentos` para `papelEventoAtivo(['operador'])`. Custo: o operador passa
   a enxergar valor pago, forma de pagamento e cartão mascarado — dinheiro, que a taxonomia
   atual nega de propósito.
3. Desnormalizar SÓ o que o balcão precisa (`loteNome`, `compradorEmail`, `compradorTelefone`)
   no doc do inscrito, escrito pela Function do checkout. Nenhuma Rule muda, o operador lê tudo
   e dinheiro continua fechado. Custo: três campos novos + backfill das inscrições existentes.

**A opção 3 é a que respeita a fronteira que as Rules desenharam.** Fica registrada; não foi
executada porque desnormalizar campo novo é escrita de Function e backfill, fora do escopo
"leitura e apresentação" do brief.

### Achado 2 — negação de autorização se disfarça de vínculo corrompido

`getPedidoEPagamentoDoInscrito` (`packages/api-client/src/eventos/inscritoPedido.ts:112`)
traduz `permission-denied` em `VinculoPedidoCorrompidoError` (`:128`, `:157`). A tradução foi
escrita para o slide-in dos Inscritos, onde o leitor é sempre `isTenantWriter` e portanto
`permission-denied` só pode ser ref pendurada. No balcão a premissa cai: um operador de evento
recebe `permission-denied` legítimo e o erro vai dizer "vínculo ADR-011 corrompido". O card
trata os dois casos como "não foi possível ler a compra" e não ecoa a mensagem, mas a
telemetria de dado sujo vai contar falso positivo se alguém ligar isso a alerta.

### Achado 3 — `pagamento.loteNome` não cobre pedido em grupo com lotes mistos

O rótulo só é gravado quando a venda inteira usou um lote único
(`functions/src/checkout/createInscricaoCharge.ts:1338`). Em pedido de grupo com lotes
diferentes ele é ausente, e o caminho completo seria `pedido.itens[].loteId` (casado por
`inscritoRef`) → `eventos/{id}/lotes/{loteId}.nome`. Não foi feito: `lotes` também exclui o
operador (`:1214`), então o join extra resolveria o rótulo para exatamente o papel que já lê o
pagamento — trabalho novo, zero ganho de cobertura. O card declara a ausência.

## O que foi construído

(preenchido ao fim de cada tarefa)

## Gates

(preenchido no fechamento)

## Conflito com a leva 22

Nenhum arquivo em comum com a onda B da leva 22. Esta lane toca `AtendimentoPanel.tsx`
(conteúdo do painel de ação) e `BalcaoView.tsx`/`BalcaoPage.tsx` (passagem de props); a onda B
move os BLOCOS de `BalcaoView.tsx:63-77` para `TabsPanel` e resolve os três `<Button>` sem
`onClick` de `PainelOperacional.tsx:152-165`. O card nasce dentro do bloco de ação
(`AtendimentoPanel`), que na reforma vai inteiro para a aba 1 · Check-in — ele viaja junto,
sem merge manual. `PainelOperacional.tsx` não foi tocado.

## Tela para o gate visual do maestro

(preenchida no fechamento)
