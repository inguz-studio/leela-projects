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

### 1. Busca por CPF — `_lib/inscritosFiltro.ts`

`cpfCasaBusca` entra na mesma caixa que já casava nome, código do ingresso
(RN-397) e código da compra (RN-475). No balcão ninguém escolhe aba antes de
procurar, então a chave nova entra pelo mesmo molde das duas anteriores: prefixo,
sem adivinhar caractere, sem corrigir dígito.

**A máscara não decide nada.** Os dois lados passam por `normalizarCpf`, então
`529.982.247-25` acha `52998224725` e vice-versa. Isso não é cortesia de UI: o
CPF é o único campo do produto que existe nas DUAS formas no banco — a escrita
nova canoniza para 11 dígitos (`createInscricaoCharge.ts:1720`) e o tipo ainda
promete "com ou sem máscara" (`dadosPessoais.ts:174`) porque doc antigo carrega a
pontuação. Comparar cru acharia metade das pessoas, e a metade que falha é
invisível: o operador só veria "não encontrado".

Guarda `pareceCpfDigitado` (só dígitos e pontuação de máscara, o mesmo recorte
que `cpfValido` usa no core): sem ela, `normalizarCpf('Ana 529')` devolveria
`'529'` e um nome com número viraria busca de CPF.

⛔ **O DV não é validado antes de comparar** — validar recusaria a busca parcial,
que é o caso normal do balcão.

**PII:** a busca vive em `useState` local, nunca em rota nem query string, e o
`selecionar()` limpa a caixa na escolha — o CPF digitado não fica pendurado na
tela entre atendimentos (tem teste). **O card não exibe CPF**, de propósito: ele
virou chave de busca e não vira campo, porque a tela do balcão fica virada para
um salão com gente atrás na fila. Buscar por CPF sem nunca mostrar CPF é a
postura inteira desta lane.

O filtro é compartilhado com a tabela densa de Inscritos, que herdou a busca por
CPF no mesmo ato. O rótulo de lá entrou junto (três campos → quatro): herdar a
capacidade e não anunciar é a mesma omissão que a RN-475 corrigiu.

### 2. Card de conferência — `entrega/CardConferencia.tsx`

O cabeçalho de três campos (nome + modalidade + selo do kit) virou um card com
os seis do aceite:

| Campo | Fonte |
|---|---|
| Nome completo | `Inscrito.atletaNome` |
| Modalidade | `Inscrito.modalidade` |
| Lote | `Pagamento.loteNome` |
| Kit inclui | `Kit.itens` (RN-230) |
| Tamanho escolhido | `Inscrito.tamanhos` → `rotuloSufixo` |
| E-mail de compra | `Pedido.responsavel.email` |
| Telefone de compra | `Pedido.responsavel.telefone`, formatado |

**Cada campo sai do doc que o operador tem MAIS chance de conseguir ler.** O
"incluso" vem de `Kit.itens` (`eventos/{id}/kits`, legível por papel de evento) e
não do catálogo `itensKit` (que exige `isTenantMember`) — e é isso que faz o
incluso e o tamanho aparecerem mesmo com o catálogo vazio, que é muito
provavelmente a tela que o dono encontrou: o `ChecklistKit` antigo some inteiro
quando o catálogo não vem, e levava o tamanho junto.

O `ChecklistKit` segue intocado abaixo do card, e a sobreposição é deliberada: o
card responde "o que essa pessoa comprou" (conferência), o checklist responde "o
que eu entrego agora" (operação).

**A ausência tem causa, e a causa aparece.** `DefinitionItem.emptyLabel` carrega
a frase certa por estado: "Sem permissão para ler a compra" ≠ "Inscrição sem
compra registrada". Dizer "sem compra" para quem só não pode ler seria mentira
sobre o dado da pessoa — o operador concluiria que ela comprou sem e-mail.

**Erro não derruba o balcão** (tem teste): negação das Rules degrada os três
campos da compra e o check-in segue funcionando, sem toast. A pessoa está na
frente do operador e a fila não para por um campo de contato.

**Telefone em claro, não mascarado como no slide-in dos Inscritos.** Lá a lista é
densa e o organizador confere cadastro; aqui o dono pediu o contato explicitamente
e o card só existe DEPOIS de o operador escolher uma pessoa — não é despejo de
lista. O CPF, que seria o pior de expor, fica fora do card inteiro. Se o veredito
do dono for outro, `CampoMascarado` do slide-in já existe e a troca é local.

### 3. Linha de resultado — modalidade abaixo do nome

Fila de balcão tem Marina Silva no 5k e Marina Silva no 21k, e o operador só
descobria a troca depois de abrir a ficha. E o placeholder parou de prometer
"dorsal", que a busca nunca casou, e passou a anunciar o CPF, que ela casa —
capacidade que ninguém descobre por tentativa com a fila andando.

### Arquitetura

O join `[pag]` vive no `CardConferenciaConnected` (2 point reads por atendimento,
só depois da escolha — mesmo contrato do slide-in) porque depende de QUEM o
operador escolheu, e essa escolha é estado do `AtendimentoPanel`. Os `kits`, que
dependem só do evento, seguem carregados na `BalcaoPage` como o `itensKit` já
era. Subir o estado para a página mexeria no arranjo de blocos que a onda B da
leva 22 vai reorganizar em abas — trabalho jogado fora e conflito de merge de
graça.

Reaproveitado: `usePedidoEPagamentoDoInscrito`, `useKits`, `kitInscritoBadge`,
`rotuloSufixo`, `formatarTelefone`, `normalizarCpf`, `DefinitionItem`,
`FormGrid`, `Card`, `Badge`. Criado: dois componentes de tela e um módulo de
derivação pura. **Zero primitivo novo de DS.**

## Gates

| Gate | Número real |
|---|---|
| `tsc --noEmit` (painel) | **0 erros** |
| `eslint` (arquivos tocados) | **0 problemas** (exit 0) |
| `gate-canon` | **PASS**, 27 contagens todas em `(baseline)` — **zero bump** |
| Suíte `eventos` (fatia da área) | **85 arquivos · 1012 testes · 0 falhas** |
| Suíte `lib`+`components`+`shell`+`_system` | **34 arquivos · 572 testes · 0 falhas** |
| Suíte demais áreas de rota | **140 arquivos · 1393 testes · 0 falhas** |
| **Painel inteiro** | **259 arquivos · 2977 testes · 0 falhas** |

Testes NOVOS: 13 (busca por CPF) + 23 (derivação do card) + 9 (card) + 7
(integração busca↔card) = **52**. Suítes rodadas em fatias SERIAIS, nenhuma em
background (dono usando a máquina). `dist/` e `dist-mock-campeche/` da árvore
principal intocados.

## Aterrissagem

- **Merge na `main`:** `7318a967` · `main == origin/main` · árvore limpa antes e depois.
- Pré-merge de `main` em `cred-busca` primeiro (mesmo fluxo das lanes vizinhas), **sem
  conflito**: zero sobreposição de arquivo com NAVBAR-FIX e VG-INSIGHTS.
- Gates re-rodados DEPOIS do pré-merge, na árvore que virou a `main`: tsc 0, gate-canon PASS,
  27 arquivos e 364 testes verdes nas três fatias tocadas.
- Merge feito em janela livre (último commit de outra lane havia 190s, árvore limpa) —
  nenhum `amend`, nenhum `stash`, `commit --only` em toda a lane.
- ⛔ **Zero deploy.** `dist/` e `dist-mock-campeche/` da árvore principal intocados.

## Conflito com a leva 22

Nenhum arquivo em comum com a onda B da leva 22. Esta lane toca `AtendimentoPanel.tsx`
(conteúdo do painel de ação) e `BalcaoView.tsx`/`BalcaoPage.tsx` (passagem de props); a onda B
move os BLOCOS de `BalcaoView.tsx:63-77` para `TabsPanel` e resolve os três `<Button>` sem
`onClick` de `PainelOperacional.tsx:152-165`. O card nasce dentro do bloco de ação
(`AtendimentoPanel`), que na reforma vai inteiro para a aba 1 · Check-in — ele viaja junto,
sem merge manual. `PainelOperacional.tsx` não foi tocado.

## Tela para o gate visual do maestro

⛔ **Sem navegador nesta lane** (regra do brief). O card nunca foi visto
renderizado — só provado por teste, e prova estática não substitui a tela.

**Rota:** `/eventos/:slug/credenciamento` (mock: `meia-floripa-2026`).

**Caminho, quatro passos:**
1. Abrir a rota — o balcão carrega com a caixa de busca vazia.
2. Conferir o placeholder: **"Nome, CPF ou código"**.
3. Digitar um nome parcial (ex.: `Marina`) — a linha de resultado tem de mostrar
   **nome em cima, modalidade embaixo**, no máximo 6 linhas.
4. Clicar na linha — o **card de conferência** ocupa o topo da coluna de ação,
   com o nome como título, o selo do kit à direita e seis pares rótulo/valor em
   grade de duas colunas.

**O que olhar no card:**
- Os seis rótulos: Modalidade · Lote · Kit inclui · Tamanho escolhido · E-mail de
  compra · Telefone de compra.
- **Nenhum campo com traço mudo.** Onde faltar dado tem de aparecer frase
  ("Sem permissão para ler a compra", "Inscrição sem kit", "Kit sem item
  tamanhado").
- **CPF em lugar nenhum da tela**, nem depois de buscar por CPF.
- Telefone formatado `(48) 99999-0001`, nunca `48999990001`.
- Grade de duas colunas a partir de `sm`; abaixo disso, uma coluna — o card
  divide a coluna de ação com o Stepper e o botão de fechar, então vale olhar
  **estreito também**, não só em tela cheia.
- Contraste do rótulo (`--text-tertiary`) e do valor ausente nos **três temas**.

**Segunda passada, com CPF:** digitar um CPF com máscara e o mesmo CPF sem
máscara — os dois têm de achar a MESMA pessoa. Depois de escolher, a caixa fica
vazia (o CPF não pode ficar pendurado na tela entre atendimentos).

**Terceira passada, se der para entrar com papel de evento `operador`:** o card
tem de mostrar nome, modalidade, kit incluso e tamanho, e dizer "Sem permissão
para ler a compra" nos outros três — e o botão de fechar o atendimento tem de
continuar funcionando. É o cenário do achado 1, e é o único que teste não prova
de verdade (o teste simula a negação, não a Rule).
