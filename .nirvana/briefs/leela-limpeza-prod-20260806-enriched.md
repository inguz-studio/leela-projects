# LIMPEZA-PROD — enxugar o leela-hub para uma produtora só, sem tocar em ponteiro

trace_id: `leela-limpeza-prod-20260806` · lane: `LIMPEZA-PROD` · employee: `sf-platform-lead`
project_dir: `C:/dev/LEELA` · handoff vivo: `.nirvana/handoffs/leela-limpeza-prod-20260806.md`

⚠️ **Esta lane apaga dado em PRODUÇÃO.** Duas metades separadas por um portão: a primeira não destrói nada e termina num relatório; a segunda só roda depois que o maestro liberar. **Não atravesse o portão sozinho.**

## O pedido do dono, verbatim

> "qual o link do meu painel admin, para ter a visao de todos os usuários? E quanto ao leela-hub, pode limpar o banco, deixando apenas o evento de teste, que rodei os pagamentos de teste, e um evento (qualquer um), de apenas uma empresa, que pode ser a leela, com uma conta minha, em meu nome, para eu testar também. Tanto como organizador profissional, quanto usuário. E já colocamos a área do cliente para funcionar?"

E, ao ouvir que migrar o evento de produtora quebraria o link do ingresso dele:

> "ao invés de migrar, por que voce só nao muda o nome da castelo para leela?"

**Ele está certo, e essa é a estratégia desta lane.** O que muda é o **nome de exibição** do tenant `castelo-producoes` para "Leela". O **identificador não muda**. Consequência: `tenantId` continua idêntico em todos os documentos, tokens e claims — nada para migrar, nada para reemitir, nenhum ponteiro tocado.

**Já verificado pelo maestro:** o identificador do tenant **não aparece em nenhuma URL de usuário**. A landing roteia por `eventSlug` (`/[eventSlug]`, `/ingresso/[token]`, `/minha-conta`) e o painel tira o tenant do claim de autenticação, não do endereço. O slug `castelo-producoes` sobrevive apenas em artefato técnico (payload de token, log, exportação). Isso é aceito de propósito; renomear o identificador é justamente a migração que estamos evitando.

⚠️ **Se você encontrar o identificador exposto a usuário em algum lugar que o maestro não viu, PARE e reporte** — muda a decisão do dono, e não é sua para tomar.

## Estado medido hoje (confirme contra o servidor antes de agir)

**Eventos — 9, todos de `castelo-producoes`:**

| evento | status | inscritos |
|---|---|---|
| `teste-taxa-repassada` | publicado | 2 |
| `corrida-inverno-floripa-2026` | publicado | 91 |
| `desafio-mtb-costa-lagoa-2026` | publicado | 120 |
| `meia-floripa-2026` | encerrado | 462 |
| `noturna-beira-mar-2026` | publicado | 60 |
| `retiro-bem-estar-rio-vermelho-2026` | publicado | 28 |
| `sao-silvestre-floripa-2025` | encerrado | 40 |
| `maratona-floripa-2027` | rascunho | 0 |
| `trilha-pantano-sul-2026` | rascunho | 0 |

**Tenants — 6:** `castelo-producoes` (dona de tudo, vira "Leela"), `corrida-perfeita`, `na-passada-eventos`, `passo-certo`, `ritmo-run-assessoria`, `trilhas-do-sul` — **as cinco últimas sem evento nenhum**.

**Pedidos — 17, 9 pagos.** Oito são semente (`ped-0001`…`ped-0008`). **Um é real:**
`ped-wNXRTvMM3vc7Boyi91vRgx3DBQy2-chk-ed77a161-87e8-41c7-8e09-010f72ccd1dc` — `codigoPedido: 8CDHM`, `status: pago`, `valorTotal: 10`, `eventoId: teste-taxa-repassada`, `tenantId: castelo-producoes`, `pagamentoRef: pag-wNXRTvMM…`, `inscritoRefs: [1]`. Ingresso `T93N7F`.

**Contas — 21.** Relevantes:
- `vitoreldp@gmail.com` → uid `QbqlSxanxlcFeHCy4g47Vp7jlgz1`, claims `{"role":"athlete"}`, **sem senha, `emailVerified: false`**, criada 04/08 18:59:58 pelo fluxo de conta sem fricção do checkout.
- uid `wNXRTvMM3vc7Boyi91vRgx3DBQy2` — **sem e-mail**, sem senha, `athlete`. É a sessão anônima que **fez a compra real** (18:57:44, dois minutos antes da conta acima).
- `admin@demo-leela.dev` → uid `FTqslV98itZUNGwL5ss6201d23Z2`, `platform_admin`, com senha **invalidada pelo maestro** (ninguém sabe o valor), `emailVerified: true`. O domínio `demo-leela.dev` não existe: e-mail para ele não chega em lugar nenhum.
- `marina@demo-leela.dev` (`tenant_owner` de `castelo-producoes`), `felipe@demo-leela.dev` (`tenant_owner` de `corrida-perfeita`), `dugamer597@gmail.com` e `eusouojoaocalixto@gmail.com` (`athlete`, com senha — **pessoas reais, não semente**), e 13 contas `athlete` **sem e-mail** (semente).

**Origem do dado:** quase tudo veio de `functions/scripts/prod-seed-leela-hub.ts` — semente reproduzível. Apagar é barato. O que **não** é reproduzível: o pedido real e as duas contas de e-mail real.

## O alvo, escrito como invariantes

1. **Uma produtora:** o tenant `castelo-producoes` passa a se **chamar** "Leela" em toda superfície de exibição. Identificador intocado.
2. **Dois eventos, dela:** `teste-taxa-repassada` (o do pagamento real) e **um segundo com dado de verdade dentro**, para o dono explorar o painel de organizador — recomendação `corrida-inverno-floripa-2026` (publicado, 91 inscritos, tem lotes/kits/inscritos). Se o mapa de ponteiros mostrar outro mais barato de preservar íntegro, proponha e justifique.
3. **O pedido real intacto:** `8CDHM` pago, pagamento, inscrito e ingresso `T93N7F` preservados. **O link atual dele tem que continuar abrindo** — é o teste que prova que a estratégia de renomear valeu.
4. **O dono entrando pelas duas portas** com a conta do e-mail dele: como organizador da Leela e como participante que comprou.
5. **Nada órfão:** nenhum documento sobrevivente apontando para evento, pedido ou conta apagados. Agregados (contadores de inscritos, financeiro, snapshots) coerentes com o que sobrou.

## O que morre

Os 7 eventos restantes com tudo que pendura neles · os 5 tenants vazios · `corrida-perfeita` depois que nada aponta para ele · os 16 pedidos de semente **que não pertencerem aos dois eventos que ficam** · as contas de demonstração (`marina@`, `felipe@`) · as 13 contas `athlete` sem e-mail que não estiverem ligadas a inscrito sobrevivente.

**Não morre em hipótese alguma:** o tenant `castelo-producoes` (ele é a Leela agora) · `vitoreldp@gmail.com` · o uid `wNXRTvMM3vc7…` (comprador do pedido real) · `dugamer597@gmail.com` e `eusouojoaocalixto@gmail.com` — **pessoas reais**; se estiverem ligadas a algo que vai morrer, **pare e reporte**, não decida sozinho · `admin@demo-leela.dev`, que só some quando o administrador de verdade estiver de pé e provado.

⚠️ Há ~50 coleções no modelo (`pedidos`, `pagamentos`, `inscritos`, `lotes`, `kits`, `itensKit`, `modalidades`, `cupons`, `comunicados`, `repasses`, `ledger`, `financeiro`, `webhookEventos`, `convites`, `clubes`, `membros`, `perfis`, `analyticsSnapshots`, `lifecycleAudit`, `conversoes`, `estornosOrfaos`…). **Mapear quem aponta para quem é tarefa, não suposição.**

## Metade 1 — sem destruir nada. Termina em relatório.

**T1. Backup, antes de qualquer escrita.** `gcloud firestore export` para o bucket do projeto, mais `firebase auth:export` das 21 contas para arquivo fora do repo. Registre no handoff o caminho exato dos dois e o comando de restauração. **Sem isso nada mais roda** — é o que torna a operação reversível.

**T2. Mapa de ponteiros.** Varra código e dado e produza a lista de **toda** coleção/campo que carrega `eventoId`, `pedidoId`, `inscritoId` ou uid, com contagem real de documentos por evento em produção. Medição, não estimativa. Saída: tabela no relatório. (`tenantId` deixa de ser risco de migração, mas continua sendo o filtro que define o que pertence a quem — mapeie mesmo assim.)

**T3. O nome da produtora.** Levante **todos** os lugares onde o nome de exibição do tenant é lido — documento `tenants/castelo-producoes`, claims, e-mails transacionais, PDF do ingresso, remetente, rodapé, título de página, seed. Renomear em um lugar e deixar "Castelo Produções" saindo no e-mail é o defeito clássico desta tarefa. Entregue a lista antes de trocar, e troque em todos.

**T4. O acesso do dono.** Torne-o `tenant_owner` da Leela **sem perder** o papel de participante — ele precisa testar as duas portas com a mesma pessoa. Sobre credencial a regra é dura: **você não define senha de ninguém e não cria conta.** A conta dele já existe. Gere **links de definição de senha** (Admin SDK) e devolva as URLs no relatório para o maestro repassar:
- um para `vitoreldp@gmail.com`;
- um para a identidade de administração de plataforma.

Sobre a identidade de administração, **traga a decisão, não a execute**: hoje é `admin@demo-leela.dev`, num domínio que não recebe e-mail — recuperação futura impossível sem Admin SDK. A boa prática que o dono pediu é identidade de administração **separada** daquela com que ele testa o produto (senão o painel mente sobre o que um usuário comum vê). Proponha o caminho; trocar o e-mail de uma conta existente é mudança de conta e **só o dono autoriza**.

⚠️ Concluir a definição de senha por link marca `emailVerified: true`, e é isso que destrava a leitura do pedido pelo ramo (b) de `ehCompradorDoPedido` (POSSE-EMAIL-1). Diga isso explicitamente no relatório: **é o passo que faz o ingresso dele aparecer em Meus Ingressos**.

**T5. O plano de exclusão, em código, com `--dry-run` como padrão.** Um script só, que por omissão **não escreve nada** e imprime o que faria, documento a documento, na ordem em que faria. `--apply` existe mas é opt-in explícito e aborta se o backup do T1 não for informado.

**T6. Relatório e PARE.** Rode o dry-run, cole a saída, liste o que é apagado (contagem por coleção), o que sobrevive, os órfãos que o plano previne, e **o que você não conseguiu provar**. Depois **pare** — o maestro dispara a review antagonista antes do `--apply`.

## Metade 2 — só depois da liberação do maestro

`--apply`, e então prove com leitura de produção, não com teste: inventário final (2 eventos, o pedido `8CDHM` pago) · **o link de ingresso que o dono já tem abrindo com `T93N7F`** (o link atual, não um novo — é a prova da estratégia) · o PDF respondendo `%PDF` · a consulta de clubes do tenant sem `FAILED_PRECONDITION` · `functions:log` dos primeiros minutos sem erro novo · zero referência pendurada · o nome "Leela" aparecendo em todas as superfícies do T3. ⚠️ Ao checar `documents:runQuery`, **leia a chave `error` do array** — contar `.document` esconde o 400 (foi o que enganou o maestro nesta rodada).

## Proibido

Qualquer escrita antes do backup do T1 · **renomear o identificador do tenant** (é exatamente a migração que o dono descartou) · definir ou digitar senha de qualquer conta · criar conta nova · apagar as identidades protegidas acima · `git commit --amend` e `git stash` (destruíram trabalho verde duas vezes nesta rodada — `git commit --only <paths>` sempre) · commitar `pnpm-workspace.yaml` (suja sozinho com placeholder inválido que quebra o install; `git checkout --` nele) · atravessar o portão da metade 2 sem liberação.

## Verificação da lane

`tsc --noEmit` no que você tocar · o script tem teste do plano contra dado sintético (lógica de exclusão sem teste é como se chama um incidente) · dry-run rodado contra produção de verdade, com saída colada.

Commit `--only`, conventional em pt-BR, trailer `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`. Push a cada 2–3 commits. Handoff vivo atualizado a cada tarefa.

Audit: `nrv audit emit invocation_start|invocation_end --trace=leela-limpeza-prod-20260806`, lane `LIMPEZA-PROD`.

**Resposta final = DADOS**: caminho dos dois backups e como restaurar · a tabela de ponteiros · a lista de superfícies do nome · as URLs de definição de senha · a proposta de identidade de administração · a saída do dry-run · e o que ficou sem prova.
