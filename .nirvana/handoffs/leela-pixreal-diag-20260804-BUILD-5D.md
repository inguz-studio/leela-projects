# BUILD-5D · as superfícies do operador para o código da compra (S1228-T3)

- **Trace:** `leela-pixreal-diag-20260804` · **Lane:** BUILD-5D
- **Employee:** sf-frontend-engineer (software-forge)
- **Task da fila:** Frente 5, linha **5d** de `04-fila-codigo.md`
- **Spec:** `06-spec-codigo-pedido.md` (superfícies 4 e 5 da tabela) · **RN-474/RN-475**
- **Território:** `apps/painel` — e só ele
- **Commit:** `3d666d40`
- **Estado:** entregue, gates verdes, sem deploy

## O que mudou, e por quê

Três arquivos de produção, três de teste. Nenhum toque em `packages/core`,
`functions/`, `apps/landing`, `firestore.rules` ou `leela-specs/`.

| # | Arquivo | O que passou a valer |
|---|---|---|
| 1 | `apps/painel/src/routes/eventos/inscritos/InscritoSlideIn.tsx` | O campo "Pedido" mostra `PED-XXXXX`; ausência vira travessão; o id interno sai da vista e ganha um "Copiar id interno" |
| 2 | `apps/painel/src/routes/eventos/_lib/inscritosFiltro.ts` | `codigoPedidoCasaBusca` (novo) entra no `OR` da busca, ao lado do nome e do `codigoIngresso` |
| 3 | `apps/painel/src/routes/eventos/inscritos/InscritosView.tsx` | O rótulo da caixa de busca nomeia os três campos que ela casa |

**O prefixo não foi reimplementado em lugar nenhum.** A tela chama
`formatarCodigoPedido` e a busca chama `normalizarCodigoPedido`, ambos do core.
Uma varredura por `'PED-'` e por `PREFIXO_CODIGO_PEDIDO` em `apps/painel/src`
devolve, em código de produção, **só comentário** — nenhum literal executável. Os
literais vivem nos testes, e ali eles são o **aceite**: o teste tem de falhar se
o veto CODPED-1 trocar o prefixo sem que alguém olhe a tela.

## Gates

| Gate | Comando | Resultado |
|---|---|---|
| Tipos | `npx tsc --noEmit` (apps/painel) | **0 erros** |
| Lint | `npx eslint src --max-warnings 0` (apps/painel) | **0** |
| Alvos | `vitest run inscritosFiltro.test.ts InscritoSlideIn.test.tsx InscritosView.test.tsx AtendimentoPanel.test.tsx` | **85/85** |
| Vizinhança | `vitest run src/routes/eventos` (77 arquivos) | **771/771** |

Suíte completa do painel (~1800) **não** rodada, por política de custo. A árvore
`src/routes/eventos` é a que contém todo o alcance da mudança: os dois únicos
consumidores de `filtrarInscritos` (`InscritosView` e `AtendimentoPanel`) e o
único consumidor do campo "Pedido" moram dentro dela. Nada foi rodado em
`--singleFork`. O design-system **não** foi tocado, então nenhum `tsup` novo foi
necessário — a suíte rodou contra o `dist` que já estava lá.

## Como os três comportamentos foram provados

### 1 · O código aparece, com o prefixo

`InscritoSlideIn.test.tsx` — o fixture `pedidoPago()` passou a carregar
`codigoPedido: 'A2B3C'` (os cinco símbolos limpos, como o doc grava), e o caso
`mostra o código COM o prefixo e NÃO imprime o id interno` cobra as duas metades
na mesma asserção: `getByText('PED-A2B3C')` **e**
`queryByText('ped-abc123')` nulo. O caso antigo de pagamento
(`pedido pago + cartão → valores, forma e parcelamento`) foi **ajustado** — ele
cobrava o id na tela e agora cobra o código, o que o torna o canário de regressão
mais barato que existe: quem devolver o id ali derruba dois testes.

### 2 · Ausência é ausência, nunca o id

Dois casos, porque são dois caminhos distintos até a mesma resposta:

- **`compra sem código (pré-backfill) → travessão, nunca o id no lugar`** —
  pedido sem `codigoPedido`. Cobra o travessão **dentro do campo** (escopado por
  `within` no `dt`/`dd`, para não casar com o `—` de outro campo), a alternativa
  textual `Compra sem código` para leitor de tela, e a ausência do id.
- **`código fora do formato é tratado como ausência`** — `codigoPedido: 'A0B3C'`,
  com um zero que o alfabeto não tem. Nada de `A0B3C` na tela e nada do id: dado
  corrompido não vira código e não abre janela para o id voltar pelo ramo de
  exceção. Quem decide é `isCodigoPedidoValido`, dentro do
  `formatarCodigoPedido` — a tela não julga formato.

### 3 · A busca casa o código

`inscritosFiltro.test.ts`, bloco novo `busca por código da compra (RN-475)`, 10
casos. Os que carregam o aceite:

- código exato **sem** prefixo → acha;
- **com** prefixo (`PED-K7MPQ`) → acha;
- **minúsculas** (`ped-a2b3c`) → acha;
- espaço e hífen soltos no meio (` PED - A2 B3 C `) → acha;
- prefixo parcial do próprio código (`K7M`) → acha, molde RN-397 (o operador
  digita enquanto a pessoa fala);
- `A0B3C` (zero no lugar do `2`) → **não** acha nada. Aqui o palpite errado
  devolveria a compra de outra pessoa, e a recusa é do core;
- `PEDXY` como código legítimo → acha, e `PED-PEDXY` acha o mesmo. É este caso
  que prova que quem decide sobre o prefixo é o core, não a tela;
- inscrito sem `codigoPedido` nunca é achado por código, e continua achável por
  nome;
- nome e `codigoIngresso` continuam funcionando na mesma caixa;
- a busca por compra respeita status/kit/modalidade (composição intacta).

Mais o unitário `codigoPedidoCasaBusca`, com o caso que importa: digitar **só**
`PED-` não casa a compra de todo mundo.

E um caso de integração em `InscritosView.test.tsx`
(`busca acha a compra pelo código que a pessoa dita, com prefixo e em
minúsculas`): o operador digita `ped-k7mpq` na caixa real e a linha certa fica,
com o contador coerente e a outra linha fora. É o teste que prova a ponte
inteira — rótulo, estado, filtro e tabela.

## Decisões desta lane

### D1 · O "Copiar id interno" é botão, não texto

A spec pede as duas coisas ao mesmo tempo: o id **sai da vista** (RN-475) e
**continua disponível para copiar** (mesma RN, e a seção do estorno da plataforma
depende disso — quem recebe um `PED-` do comprador acha a compra aqui e precisa
do id interno para o formulário cross-tenant, que segue no id por escolha).

Copiar não é exibir: o valor vai ao clipboard e **não entra no DOM**. É por isso
que o teste do copiar termina com `queryByText('ped-abc123')` nulo — o botão
prova a ponte sem furar a regra.

Sem clipboard disponível (jsdom, http sem contexto seguro, permissão negada) a
tela **diz que não copiou**, em vez de fingir sucesso e deixar o operador colar o
conteúdo anterior da área de transferência. Tem teste.

### D2 · O aviso de cópia é região viva local, não `useToast`

`InscritoSlideIn` é declaradamente presentational e é renderizado **sem
providers** em teste. Puxar `useToast` obrigaria a embrulhar quinze casos
existentes num `ToastProvider` para uma mensagem de duas palavras. A região viva
(`aria-live="polite"`) fica dentro da linha do campo, sempre montada — região
inserida junto com o texto é silenciosa em parte dos leitores — e vazia não gera
caixa nenhuma, então não abre buraco embaixo do valor.

Sem timer para limpar a mensagem: temporizador em teste é a fábrica de flake
desta casa, e o slide-in desmonta ao fechar.

### D3 · O rótulo mudou; o placeholder não

`aria-label` passou a ser **"Buscar atleta pelo nome, código do ingresso ou
código da compra"** — é o rótulo do campo, é o que o leitor de tela anuncia e é o
que o critério de pronto do pacote cobra ("o rótulo do campo diz que ela busca
por ele"). O `placeholder` visível continua **"Buscar por nome ou código"**:
ele já é verdadeiro para os dois códigos, e a caixa tem largura de
`--sidebar-width` — um placeholder que enumere os três trunca. **Isto é item de
conferência visual do dono** (abaixo), não decisão fechada.

Os dois testes que consultavam o rótulo antigo foram atualizados, e o texto virou
a constante `LABEL_BUSCA` no arquivo de teste, porque ele é aceite e não detalhe.

## Desvios e efeitos colaterais

- **O balcão herdou a busca por código da compra.**
  `AtendimentoPanel.tsx` (entrega/balcão) usa o mesmo `filtrarInscritos`, então a
  busca dele passou a casar o código da compra também. É aditivo, é o mesmo
  operador, o mesmo tenant e o mesmo filtro em memória — nenhuma porta nova. O
  rótulo de lá (`"Buscar atleta"`, placeholder `"Nome do atleta ou dorsal"`) **não
  foi tocado**: ele já era genérico antes, já casava `codigoIngresso` sem dizer, e
  mexer nele é decisão de produto do balcão, não da 5d. Os 4 testes do
  `AtendimentoPanel` seguem verdes. **Registrado para quem conduz decidir.**
- **Nenhum outro lugar do painel imprimia o id do pedido.** Varredura por
  `pedido.id` / `pedidoId` em `apps/painel/src`: fora do `InscritoSlideIn`, só
  `EstornosAdminRoute` (campo digitado `:211` e eco `:335`, **inalterados por
  escolha da spec**), o container `InscritoSlideInConnected` (passa o id ao
  callable, não à tela) e `queries.ts` (log de erro). Não sobrou superfície humana
  com o id.
- **Nada de índice, nada de query, nada cross-tenant.** A busca continua sendo
  filtro em memória sobre a lista já carregada do evento. `firestore.indexes.json`
  intocado.

## O que precisa de conferência VISUAL do dono

Nenhuma destas é bloqueio de gate; são as três coisas que só olho humano decide.

1. **O seed local não tem código, e a tela vai parecer quebrada.** Confirmado
   nesta lane, e é exatamente a ressalva **R-3 da REV-COD5A**:
   `functions/src/seed/pedidos.seed.ts` grava os onze pedidos **sem**
   `codigoPedido`, e `inscritos.seed.ts` só espelha `codigoIngresso`. Consequência
   prática: no emulator/preview, **todo** campo "Pedido" mostra travessão e a busca
   por código da compra não acha nada. Isso é a RN-475 funcionando, não defeito —
   mas quem abrir a tela para validar vai ver o contrário. **Não consertei o seed
   de propósito**: `functions/` não é território desta lane, e a spec já nomeou o
   caminho certo (rodar o backfill da 5b contra o emulator, ou dar código ao seed
   numa lane que possa tocar `functions/`). **Sem um dos dois, a conferência
   visual da 5d não é conclusiva.**
2. **O placeholder da busca** (D3 acima): fica em "Buscar por nome ou código" ou
   passa a enumerar os três, aceitando truncar na largura atual?
3. **O "Copiar id interno" ao lado do código.** É um botão ghost pequeno na mesma
   linha do valor. Vale ver se ele compete com o código na hierarquia visual, e se
   a mensagem inline ("Id interno copiado.") aparece onde se espera ou se deveria
   ser toast.

## Vetores para uma eventual review antagonista

A 5d não é ⚔ na fila, e o inventário confirma o motivo: nenhuma porta nova,
nenhuma query nova, nenhuma escrita, nenhuma credencial. O que eu atacaria se
fosse a review:

1. **O id volta por algum ramo?** Os caminhos são três: código válido, código
   inválido e código ausente. Os três têm teste e nenhum imprime o id. O quarto
   caminho seria alguém trocar `formatarCodigoPedido` por interpolação direta —
   é o que os dois testes de ausência pegam.
2. **A busca vira oráculo?** Não sai do evento já carregado: o operador só acha o
   que ele já podia listar. Código de outra produtora não casa porque o inscrito
   dela não está na lista dele. Vale conferir se isso continua verdade depois do
   fix D-1 nas Rules (`48fc7116`), que é o que impede o organizador de **plantar**
   um código alheio no próprio inscrito — sem ele, a 5d responderia certo a uma
   pergunta envenenada. **O fix já aterrissou**; a REV-COD5A pedia explicitamente
   que a 5d não fosse a produção antes dele, e essa ordem está cumprida.
3. **Falso positivo de busca curta.** `K7M` casa por prefixo, e um nome com essas
   letras não casa por acidente (a comparação de código é sobre o campo do
   código, não sobre o nome). Mas busca de **um** símbolo casa muita compra — é o
   mesmo comportamento que a RN-397 já tinha para o ingresso, herdado de
   propósito. Se incomodar, o conserto é comprimento mínimo nos dois juntos.
4. **`PED` como palavra.** Um atleta chamado "Pedro" digitado como busca vira
   `PEDRO` na normalização (5 símbolos, não 8), então não perde o prefixo e só
   casaria um código literalmente `PEDRO`. Coincidência possível, consequência
   nula: a linha do Pedro aparece de qualquer jeito pelo nome.
5. **R-4 da REV-COD5A vale aqui na íntegra.** `PED–A2B3C` colado de um WhatsApp
   com autocorreção (en-dash) **não** acha a compra, porque
   `normalizarCodigoPedido` só come `[\s-]+`. Não corrigi: o conserto é no core e
   tem de entrar nos dois normalizadores no mesmo commit, como a review escreveu.

## Para marcar em `leela-specs/` (não editei — selo do maestro)

- **`04-fila-codigo.md`, Frente 5:** a **5d** está **entregue** em `3d666d40`.
  A ordem da seção "Ordem executável" continua valendo para o resto: o backfill
  (5b) tem de rodar antes de a 5d ir ao ar, senão a tela estreia mostrando
  travessão em toda compra existente.
- **Critério de pronto do pacote:** o item *"a busca de inscritos acha a compra
  pelo código, e o rótulo do campo diz que ela busca por ele"* pode ser marcado —
  as duas metades têm teste executável.
- **`06-spec-codigo-pedido.md`, tabela "As superfícies, varridas":** as linhas
  **4** (campo "Pedido" do slide-in) e **5** (busca de inscritos) estão feitas. A
  linha 7 (`EstornosAdminRoute`) segue inalterada, como a spec decidiu.
- **REV-COD5A:** a ordem *"a 5d não deve ir para produção antes disto"* (fix D-1
  das Rules) está **cumprida** — `48fc7116` aterrissou antes desta lane.
