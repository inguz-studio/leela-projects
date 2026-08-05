# HANDOFF · SEAL-PAINEL-0805 — o que a review da S1225 levantou vira registro

- Lane: SEAL-PAINEL-0805 · Employee: sf-cto (software-forge) · trace: `leela-pixreal-diag-20260804`
- Fonte: `.nirvana/handoffs/leela-pixreal-diag-20260804-REV-S1225.md` (commits `706d9b02` + `a769cfb9`)
- Território tocado: **somente `leela-specs/`** + este handoff. Nada em `functions/`, `apps/` ou `firestore.rules` — a lane FIX-PROJECAO está em voo em `functions/`.
- Sem código, sem teste, sem deploy, sem navegador.

## O que esta lane fez

A review antagonista da S1225 aprovou a story com fixes e devolveu três decisões de dono, uma
regra durável e uma divergência cross-lane para o maestro reconciliar. Nada disso estava
registrado em lugar nenhum — vivia só no handoff da review. Esta lane transformou os cinco em
registro no formato da casa.

## Painel do dono · três itens novos

Em `leela-specs/01-produto/DECISOES-ABERTAS.md`, no painel canônico, depois do CODPED-1 e antes
de "Ações que só você pode executar". Formato padronizado: contexto com exemplo dos personagens,
o que fica com o dono, por que agora, opções com default e onde aterrissa.

| ID | O que decide | Default proposto |
|---|---|---|
| **PEDLIST-1** | A autorização por campo da RN-469 dá ao comprador a capacidade de **listar** as próprias compras atravessando produtoras. Intencional e útil para a S1222, mas nunca escrita na spec | **manter** — o dado é dele e é exatamente a consulta que Meus Pedidos vai fazer |
| **POSSE-EMAIL-1** | `contaSemFriccao.contaUid` sai de `getUidPorEmail` (`contaSemFriccao.ts:203`): conta preexistente é reusada sem prova de posse do e-mail, e desde a RN-469 esse vínculo é **chave de leitura** da compra inteira. A RN-174 já exige e-mail confirmado do lado da **pessoa**; o carimbo do **pedido** não tem o equivalente | **exigir e-mail confirmado** antes de o vínculo virar chave de leitura, com a compra lida pela sessão do checkout até lá |
| **PROJPED-1** | Ratificar a regra durável: todo campo novo em `pedidos/{id}` nasce visível ao comprador; estado operacional interno mora em extrato ou subcoleção server-only | **ratificada** — já aplicada uma vez na reconciliação abaixo |

O POSSE-EMAIL-1 é o item de segurança. Escrito com o cenário exato e sem alarme: exige conta
preexistente naquele endereço, e o caminho mais provável é engano de digitação, não ataque.

## Reconciliação do RF2-3 · registrada na rodada

Em `leela-specs/02-rodadas/2026-08-04-pos-pagamento/04-fila-codigo.md`, seção nova **"Saída da
review antagonista REV-S1225"**, imediatamente depois da seção equivalente da REV-F2F5 — que é
onde o ponto tinha ficado em aberto ("a escolha é das duas lanes juntas; a review da S1225 fecha
o ponto").

As duas reviews divergiram sobre `reenvioEmails.ultimoReenvioId` e `emailIngressos.comunicacaoId`
no doc do pedido: a REV-F2F5 pediu remover, a REV-S1225 aceitou a exposição. **O maestro decidiu
REMOVER**, pelo argumento que a própria REV-S1225 usou para aceitar: filtrar por campo não existe
nas Rules, logo a única defesa disponível é a disciplina de não gravar — e então a disciplina tem
de ser a regra. É o caminho 1 da recomendação da REV-F2F5, custo zero de função.

**Execução na lane FIX-PROJECAO**, em voo em `functions/` no momento deste registro. O commit dela
entra no arquivo quando aterrissar. **RF2-3 está fechado.**

## Canon · a regra durável ao lado da RN-469

Em `leela-specs/03-canon/epics/LEELA-E12-landing.md`, como **"Diretriz permanente da RN-469 · a
projeção do pedido é do comprador"**, logo abaixo do enunciado da RN-469. Não virou RN nova: ela
não é decisão de dono nova, é a consequência operacional de uma RN que já existe, e o formato de
diretriz permanente já é usado no épico (D-0729-1, D-0802-1). A faixa segue com a 475 como mais
alta em uso.

A nota carrega também as duas fronteiras que a mesma review abriu e que **não** são da diretriz:
a listagem cross-tenant (PEDLIST-1) e o vínculo por e-mail não verificado (POSSE-EMAIL-1).

## Fila técnica · três itens

Na mesma seção nova de `04-fila-codigo.md`, no molde RF2-* da REV-F2F5. Nada existente foi movido.

| # | O quê |
|---|---|
| **RS1-1** | `isTenantMember` com token **sem** claim de tenant faz a comparação erroar, e a negação chega ao cliente como texto interno do motor de rules em vez de `permission-denied` limpo. Pré-existente, vale para o arquivo inteiro |
| **RS1-2** | O PIX expira só no relógio do navegador (timer interno do `PixCobranca`), sem ida ao servidor: a tela de confirmação não sabe que o pedido morreu |
| **RS1-3** | `/*` dentro de string cega a varredura de copy. O furo do `//` não existe (o regex exige início de linha). Zero incidência hoje, canário já no teste |

## Boards

`leela-specs/00-boards/V1-KANBAN.md`: uma linha de selo `S1225-REV` sob a história S1225, no
padrão épico → história → tarefa. A frase da história que dizia "aguardam a review antagonista"
deixou de ser verdade e foi corrigida na mesma passada.

## Ledger da rodada

`01-decisoes-dono.md` §"O que esta rodada fecha e abre no painel" ganhou a linha dos três itens
novos, ao lado das que registram ARENA-1/2/3 e CODPED-1. O painel do dono e o ledger da rodada
voltam a concordar.

## O que esta lane NÃO afirma

Nenhum item foi decidido no lugar do dono — os três nasceram com default em vigor, como o painel
manda. A remoção dos dois campos **não foi executada aqui**: quem executa é a FIX-PROJECAO, e o
commit dela ainda não existia quando este registro foi escrito. Nenhum gate de código foi rodado
por esta lane, porque ela não tocou código.
