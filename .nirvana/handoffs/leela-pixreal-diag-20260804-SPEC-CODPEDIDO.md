# Handoff · SPEC-CODPEDIDO

- trace: `leela-pixreal-diag-20260804` · lane SPEC-CODPEDIDO · employee sf-cto
- Modo: SÓ `leela-specs/` — nenhum código, Rule, function ou app tocado. A REV-S1225 aterrissou
  durante a lane (`b9a943cb`, `a769cfb9`); mesmo assim nada meu encostou em `apps/` ou
  `functions/`.
- Insumos lidos: verbatim do dono de 05/08 (duas mensagens); rodada ativa
  `2026-08-04-pos-pagamento` (01, 03, 04, 05); handoffs SPEC-PDF, REV-S1225 e REV-F2F5; E12
  (RN-469..473, S1214, S1222, S1225, S1226); E03 (RN-397, o precedente da busca por código);
  índice de RNs; ADR-011; `modelo-de-dados-firestore`; runbook de e-mail transacional; fila
  ADMINSEP. **Código, só leitura:** `createInscricaoCharge.ts` (`idsDoCheckout`,
  `criarDocsDeCheckout`), `emitirIngressos.ts`, `packages/core/src/pedidos/pedido.ts`,
  `packages/core/src/tickets/codigoIngresso.ts`, `codigo-convite.ts`, `afiliado.ts`, `cupom.ts`,
  `templates.ts`, `StepConfirmacao.tsx`, `InscritoSlideIn.tsx`, `EstornosAdminRoute.tsx`,
  `inscritosFiltro.ts`, `firestore.indexes.json`, `asaasProvider.ts`,
  `backfill-url-eventos.mjs`, `pedidos.seed.ts`.

## Números reservados nesta lane

- Decisão: **D-0804-5** (na rodada aberta, depois da D-0804-4 da SPEC-PDF).
- RNs: **RN-474** e **RN-475** (varredura em 05/08 sobre `leela-specs`, `apps`, `packages`,
  `functions/src`, `firestore.rules` e `firestore.indexes.json`: zero hits para 474-489,
  `codigoPedido` e `PED-`).
- Story: **S1228** (varredura: zero hits; S1227 foi a última tomada, pela BUILD-F2F5). Tasks
  S1228-T1 a T4.
- Item de painel: **CODPED-1**, um só, veto leve com default em vigor.

## Estado por task

- [x] T1 — **D-0804-5** em `01-decisoes-dono.md`, com as duas mensagens verbatim, o que a frase
      decide e o que ela não decide, mais os 73 caracteres medidos e o uid embutido.
- [x] T2 — spec nova `06-spec-codigo-pedido.md`: inventário, cinco decisões de engenharia com
      as rejeitadas nomeadas, o que o código é e não é, a varredura das nove superfícies, as
      duas RNs transcritas, fronteiras e sete premissas de lane.
- [x] T3 — **RN-474** e **RN-475** canônicas no [[LEELA-E12-landing]], mais a story **S1228**
      com seis critérios falsificáveis; índice de RNs com a linha nova e a prosa do próximo
      número passando de 473 para 475.
- [x] T4 — **Frente 5** em `04-fila-codigo.md` (5a..5d), ordem executável e critério de pronto
      atualizados, duas fronteiras novas. Os itens RF2-1..RF2-3 da REV-F2F5 não foram movidos.
- [x] T5 — painel: **CODPED-1** (só o prefixo).
- [x] T6 — kanban: card no padrão épico → história → tarefa, com a pendência do dono do backfill
      marcada na tarefa.
- [x] Janitorial de passagem — a faixa **461-468** (SPEC-QUALIFICACAO) estava na prosa e faltava
      na tabela "onde mora cada faixa" do índice de RNs. Linha acrescentada, com os cinco épicos
      donos conferidos no delta da rodada de qualificação.

## As decisões de engenharia, com as rejeitadas

**1. Alfabeto: o da casa, não Crockford.** `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (31 símbolos, sem
`0 O 1 I L`), que já existe em quatro códigos do produto — e um deles, o convite de clube
(RN-101), já tem exatamente **cinco** símbolos. **Rejeitado Crockford base32** (o desenho da
conversa): ele mantém `0` e `1` e derruba as letras parecidas, o que criaria um segundo alfabeto
no mesmo produto e obrigaria o operador a saber de qual código se fala antes de decidir se ouviu
letra ou dígito — com os dois códigos saindo lado a lado no mesmo e-mail. O alias de
decodificação, que é o que pagaria por manter `0` e `1`, já está recusado pela casa em
`codigoIngresso.ts:70-73` ("trocar `O` por `0` por conta própria seria adivinhar ingresso
alheio"), e aqui erraria devolvendo a compra de outra pessoa. Custo: 31⁵ = 28.629.151 contra
32⁵ = 33.554.432, 15% de espaço num volume que não chega perto. **Também rejeitados:** alfabeto
`A-Z0-9` do cupom (cupom é escolhido por gente, não sorteado e ditado) e reusar a constante do
`codigoIngresso` (contraria a doutrina escrita no core: a duplicação é deliberada, e a
propriedade comum é provada por teste sobre o conjunto ambíguo).

**2. Unicidade: GLOBAL, por chave primária.** Doc de reserva `pedidoCodigos/{codigo}`, lido e
criado com `create` dentro da transação que já cria o pedido, re-sorteio limitado, motivo de
falha nomeado, coleção sem `match` nas Rules (deny-by-default) — o mecanismo da
`emitirIngressos` copiado linha a linha. **Rejeitada a unicidade por tenant** e a **por evento**:
o custo é o mesmo (é um documento nos dois desenhos, só muda o caminho) e o que se perde é a
propriedade no único lugar onde ela é usada — o código é dito ao telefone e no chat por quem
comprou de um *evento* e não sabe o nome da produtora, e a área do cliente lista compras
atravessando produtoras na mesma tela. **Rejeitado garantir por query dentro da transação**
(Firestore não trava faixa vazia — a armadilha que o comentário da `emitirIngressos` já
documenta) e **rejeitado sorteio sem reserva** (colisão de aniversário é real na casa dos
milhares). Sintoma que pede revisão, registrado: o motivo "sem código livre" aparecendo em log
alguma vez significa acrescentar um símbolo, não aumentar as tentativas.

**3. Backfill, não fallback.** As compras existentes ganham código por backfill. **Rejeitado o
fallback permanente** porque a única coisa que ele teria para exibir no lugar é o id interno —
exatamente o que a spec existe para tirar da tela; seria um ramo permanente para reintroduzir o
problema em condição rara. Ausência passa a ser ausência (travessão), nunca o id. A conta é
barata: produção tem **11 pedidos de seed + 1 real**. Forma pelo precedente
`backfill-url-eventos.mjs`: `--dry-run` por default, `--apply` explícito, `--project`
obrigatório, idempotente por comparação, lotes de 400, contadores antes de escrever. Uma
diferença que exige cuidado: este backfill **também reserva** o código na mesma transação,
senão semeia colisão contra o sorteio de amanhã. **A execução não é da esteira** — regra que a
casa já pratica ("o backfill vem como ferramenta, não como execução"); virou pendência do dono
no kanban. **Rejeitado o backfill preguiçoso** (faz leitura escrever, e não serve ao e-mail, que
sai antes de alguém olhar).

**4. Grava-se o código sem o prefixo.** O prefixo vive numa constante do core e entra só na
exibição. É isso que faz o veto do dono custar uma constante em vez de uma migração de dados
mais o rechaveamento da coleção de reservas — e é o que permitiu classificá-lo como veto leve
com default em vigor. A busca normaliza ignorando prefixo, então e-mail antigo com prefixo velho
continua encontrando a compra.

**5. Espelho do código em cada inscrito, na mesma transação.** É o que torna a busca do painel
gratuita: a busca de inscritos é filtro **em memória** sobre a lista já carregada do evento
(`inscritosFiltro.ts:54-71`), então o código entra sem query, sem índice e sem tela nova — o
caminho exato da RN-397. Desnormalização segura porque o valor é imutável.

**6. Nenhum índice novo.** Nem no painel (memória) nem na área do cliente (callable sobre a
lista da própria pessoa). O único caso que exigiria índice é a busca **cross-tenant** por
código, e ela está fora de propósito: seria uma consulta sem sala que responde "existe" a
qualquer palpite de cinco símbolos. Por isso o **formulário de estorno da plataforma fica no id
interno**, com a ponte pelo painel da produtora e um passo novo no runbook.

**7. `codigoPedido` entra no contrato tipado**, e não como campo de evolução de schema. Os
quatro campos que hoje vivem no doc fora da interface (`contaSemFriccao`, `emailIngressos`,
`reenvioEmails`, `canceladoMotivo`) são estado operacional que ninguém digita; este é lido por
três superfícies e digitado por gente.

## Superfícies inventariadas (o id interno hoje)

| # | Onde | Quem lê |
|---|---|---|
| 1 | `StepConfirmacao.tsx:129` — "Pedido ped-{uid}-chk-…" no ramo pago | **comprador** |
| 2 | `StepConfirmacao.tsx:138` — a mesma linha no ramo não-final | **comprador** |
| 3 | `InscritoSlideIn.tsx:361` — campo "Pedido", id em mono | organizador |
| 4 | `EstornosAdminRoute.tsx:209-214` — "ID do pedido" digitado à mão | administrador |
| 5 | `EstornosAdminRoute.tsx:335` — eco do id no diálogo destrutivo | administrador |
| 6 | E-mails (`templates.ts`) — **o id não aparece, e a compra não tem referência nenhuma** | comprador |
| 7 | URL/rota — **nenhuma**; o id só trafega em corpo de callable | — |
| 8 | Runbook de e-mail transacional — procedimento parte do `pedidoId` | operador |
| 9 | Log e alerta de incidente — `pedidoId`, e fica | máquina |

Trocam pelo código: 1, 2, 3 e 6. Ficam: 4, 5 (cross-tenant, viraria oráculo), 9 (log não é
superfície de produto). Ganha passo de ponte: 8. Nasce certa: a S1222 (Meus Pedidos), que ainda
não existe.

## Posição na fila

**Frente 5**, quatro tasks. **5a (S1228-T1) parte agora** — não espera nenhuma frente desta
rodada, porque não encosta em `apps/`; em `functions/` ela se serializa com os itens RF2 da
REV-F2F5, sem dependência lógica em nenhuma direção. Depois: **5b** (backfill), então **5d**
(painel, árvore livre) em paralelo com **5c** (comprador), esta atrás da Frente 4 pelo
território de `apps/landing`. O backfill roda antes de 5c e 5d irem ao ar, para nenhuma
superfície estrear encontrando compra sem código.

**5a e 5b são ⚔.** A 5a mexe na transação do caminho do dinheiro, cria coleção nova e
acrescenta campo ao doc do pedido — que desde a RN-469 nasce visível ao comprador (a conta foi
feita: o código é do comprador). Três alvos nomeados para a review: replay que não sorteia
segundo código, `create` e não `set` com a corrida provada, e a reserva sem `match` nas Rules.
A 5b é ⚔ porque reescreve produção e semeia a coleção que o checkout consome. 5c e 5d não são
⚔, e pagam um gate executável no lugar: **nenhuma superfície de comprador imprime `pedidoId`**,
como teste — o inverso do que a S1225-T2 fez com a varredura de copy.

## Vetável

**CODPED-1 · o prefixo**, e só ele. Veto leve, `PED-` em vigor sem resposta, porque é a única
parte que o cliente lê e porque o e-mail vai carregar dois códigos (o do ingresso, `T93N7F`, e o
da compra) — o prefixo é o que impede a confusão no instante do olhar. Opções no painel: `PED-`
(default), `LEE-` (assina a plataforma e devolve a confusão) e sem prefixo (duas sequências
parecidas, de cinco e seis símbolos). Trocar depois custa uma constante, e é por isso que o
código é gravado sem o prefixo.

## Divergências e desvios

- **O desenho aprovado na conversa dizia Crockford base32; entrou o alfabeto da casa.** É
  escolha de engenharia, não de dono — a frase dele pede "5 dígitos alfanuméricos", e a forma
  entregue é exatamente essa. O motivo está acima e na spec; se o maestro quiser Crockford
  mesmo assim, o ponto a atacar é a consistência com os quatro códigos existentes.
- **Nada tocado fora de `leela-specs/`.** Nenhum código, nenhuma Rule, nenhum navegador aberto.
- **A spec e as RNs moram no mesmo arquivo** (`06-spec-codigo-pedido.md`), seguindo o precedente
  que a SPEC-PDF abriu na mesma rodada. Canônicas no E12, como sempre. O `03-rns-delta.md`
  continua sendo o delta da SPEC-POSPAG e não foi ampliado — o mapa é o índice de RNs.
- **O runbook de e-mail transacional não foi editado**, embora a RN-475 diga que ele ganha um
  passo. O passo só funciona depois de o código existir; ele é entrega da 5d, e está na tabela
  de superfícies para não se perder.
- **Contagem de regras do índice não foi mexida.** A frase "existem 256 regras realmente
  definidas" já estava desatualizada antes desta lane e recontá-la exige varredura própria;
  fica registrado para quem passar, como a lacuna da faixa 461-468 ficou registrada pela
  SPEC-PDF e foi paga aqui.
