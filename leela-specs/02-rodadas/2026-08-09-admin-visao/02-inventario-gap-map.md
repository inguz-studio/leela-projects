---
tags: [leela, inventario, gap-map, rodada, admin, plataforma, super-admin, tenants]
trace: leela-admin-visao-20260809
lote: SPEC-ADMIN-VISAO
data: 2026-08-09
---

# 02-inventário e gap map · item por item, campo a campo

> **Método.** Fonte da verdade é o **código**: `packages/core` (tipos), `packages/api-client` (leitura),
> `functions/src` (callables e triggers) e `firestore.rules` (fronteira). Nenhuma leitura de produção.
> Cada afirmação carrega o caminho. Onde o dado **não existe**, está escrito que não existe — e a
> proposta de adição vira vetável em [[03-spec]], nunca default.
>
> **A correção de premissa que abre o inventário.** O `apps/painel` **não é Next.js app-router**. Não
> existe `apps/painel/app/`, não existe `page.tsx`. O painel é **Vite + React Router v6 (SPA)**, com a
> subárvore de plataforma em `apps/painel/src/routes/plataforma/` e convenção
> `XxxRoute.tsx` (contêiner) + `XxxView.tsx` (apresentação). Quem for construir a partir desta spec
> precisa disso antes da primeira linha: qualquer tarefa escrita em vocabulário de app-router nasce
> errada.

## Parte 0 · O que o painel master já é hoje

Nove telas vivas, montadas em `apps/painel/src/routes/plataforma/PlataformaRoutes.tsx`, dentro de
`RequireSessao` → `RootShell` → `ContaTravadaGate`.

| Rota | Arquivo de rota | O que a tela já mostra |
|---|---|---|
| `/plataforma` | (índice) | redireciona para `tenants` |
| `/plataforma/tenants` | `tenants/TenantsListRoute.tsx` | tabela: Tenant (nome + slug), Tipo, Status, Saúde, Eventos, GMV; chips Todos/Aguardando/Ativos/Suspensos; contador "Mostrando X de Y" |
| `/plataforma/tenants/:tenantId` | `tenants/TenantDetailRoute.tsx` | perfil + owner (`ownerNome ?? ownerUid`), 4 KPIs (Tipo, Eventos ativos, GMV acumulado, Criado em), ação de lifecycle, card crítico quando suspenso |
| `/plataforma/tenants/:tenantId/termos` | `tenants/termos/TermsEditorRoute.tsx` | taxa, mensalidade SaaS, parcelamento (máx./juros/parcela mínima), exceção de taxa por meio, comunidade, antecipação (desabilitada) |
| `/plataforma/planos` | `planos/PlanosRoute.tsx` | catálogo de planos: Plano, Cartão à vista, PIX, Parcelamento, Mensalidade; ações Editar e **Aplicar** |
| `/plataforma/convites` | `convites/ConvitesRoute.tsx` | códigos de convite: Código, Status, Nota, Quem usou, Quando, Validade |
| `/plataforma/taxa` | `taxa/TaxaGlobalRoute.tsx` | tabela global de taxa por meio (`pix`/`cartao`/`boleto`) |
| `/plataforma/repasses` | `repasses/RepassesAdminRoute.tsx` | **fila cross-tenant** de repasses: Tenant, Valor, Estado, Solicitado em; combobox de tenant; editor de retenção |
| `/plataforma/estornos` | `estornos/EstornosAdminRoute.tsx` | **fila cross-tenant** de estornos + ação direta sobre inscrição |
| `/plataforma/macro` | `macro/MacroDashboardRoute.tsx` | KPIs (GMV total, Receita Leela total, Tenants ativos) + tabela por tenant: Tenant, Status, Saúde, GMV, Receita Leela, Taxa, Eventos |

Navegação em `apps/painel/src/routes/plataforma/_lib/nav.ts` (`PLATFORM_NAV`), renderizada pela seção
**PLATAFORMA** de `apps/painel/src/shell/sidebar.ts`. Nove itens: Tenants, Termos, Planos, Convites,
Taxa, Repasses, Estornos, **Billing** (sem `href`, badge "em breve") e Macro.

O guard é `apps/painel/src/routes/plataforma/_components/PlatformGuard.tsx`, alimentado por
`_data/session.ts` (`usePlatformSession`), que decide por `isPlatformAdmin(claims)` do core
(`packages/core/src/platform/roles.ts:131`) e **nunca** compara `role` na mão — a comparação direta foi
o defeito que trancou o dono para fora e está documentado.

### A regra de arquitetura que este inventário encontrou, e que muda o tamanho da fila

**Não existe um único callable de listagem servindo o painel master.** Tudo que a área lista hoje é
**query do cliente** contra o Firestore, autorizada pela Rule — `listTenants(db, …)`
(`packages/api-client/src/platform/tenants.ts:52`), `getPlatformRollups(db)`, `listPlanosCobranca`,
`listarConvitesOrganizador`. As duas filas cross-tenant que existem (repasses e estornos) são
**fan-out no cliente**: varrem `tenants`, depois eventos, depois a coleção folha.

E o fan-out já mostra a fatura desse desenho. A fila de estornos carrega, na própria interface, um
bloco de aviso "Esta fila pode estar incompleta", alimentado por `avisosDaFila(fila)` com
`ramosComFalha`, `tenantsNoTeto` e `tenantsComEventosNoTeto` — tetos declarados em
`apps/painel/src/lib/query/queries.ts` (`TETO_TENANTS_FILA_ADMIN`,
`TETO_EVENTOS_POR_TENANT_FILA_ADMIN`). Ou seja: **o padrão vigente para "ver tudo" tem truncamento
conhecido e assumido**, e ele foi aceito para uma fila de dezenas de itens em análise.

As três listas globais que o dono pede — todos os eventos, todos os clubs, todos os usuários — são de
outra ordem de grandeza e **não cabem nesse padrão**. Isso não é objeção ao pedido: é a razão pela
qual a fila de build tem uma onda de backend antes da onda de tela, e está tratado em [[04-fila-build]].

## Parte 1 · Drill-down por tenant — os oito itens

### 1.1 Eventos do tenant

- **O que `/plataforma` mostra hoje:** só o **número**. `tenants/{id}.eventosAtivos` aparece como
  coluna na lista e como KPI no detalhe. Nenhuma tela do painel master lista os eventos em si.
- **Onde o dado vive:** `packages/core/src/eventos/evento.ts` → `interface Evento`, coleção
  `eventos/{eventoId}` (docId = slug). Campos úteis à visão: `nome`, `data`, `local`, `status`
  (`rascunho`/`publicado`/`ao_vivo`/`encerrado`), `modalidades`, `qtdInscritos`,
  `receitaConfirmada`, `capacidade`, `taxaModo`.
- **Escopo:** carrega **`tenantId`** (obrigatório — `parseEvento` lança se ausente) **e**
  `organizadorId`.
- **Agregado rico por evento:** `eventos/{id}/financeiro/current` → `FinanceiroEvento`
  (`packages/api-client/src/eventos/queries.ts:220`): `receitaBruta`, `taxaPct`, `taxaValor`,
  `receitaLiquida`, `inscritos`, `receitaPorModalidade`.
- **Veredito:** ✅ **o dado existe, completo.** O que falta é **tela** e uma consulta por `tenantId` no
  escopo do admin. Não há campo novo a criar.
- **Reaproveitado × criado:** reaproveita o modelo, o parser e o agregado financeiro. Cria a tela e a
  leitura admin.

### 1.2 Clubs do tenant

- **O que `/plataforma` mostra hoje:** **nada**. Clube não aparece em nenhuma tela do painel master.
- **Onde o dado vive:** `packages/core/src/clubs/clube.ts` → `interface Clube`, coleção
  `clubes/{clubId}` (docId = slug). Campos: `nome`, `descricao`, `categoria`, `modalidade`,
  `localizacao` (`cidade`/`estado`/`online`), `visibilidade` (`publica`/`indexavel`/`privada`),
  `modeloEntrada` (`gratuito` | `pago_em_breve` — RN-104), `qtdMembrosAtivos`,
  `qtdDesafiosAtivos`, `ownerId`.
- **Escopo:** carrega **`tenantId`** (validado em `validarClube`) + `ownerId`.
- **Veredito:** ✅ **o dado existe, completo.** Falta tela e leitura.
- **Nota que a spec carrega:** `modeloEntrada` **não** tem valor "pago" — só `gratuito` e
  `pago_em_breve`. A tela do admin não pode sugerir receita de clube; não existe mensalidade de clube
  no modelo (a recorrência da comunidade é a S1603, pós-V1).

### 1.3 Clientes do tenant

- **O que `/plataforma` mostra hoje:** **nada**.
- **Onde o dado vive:** `packages/core/src/crm/cliente.ts` → `CrmClienteDoc`, subcoleção
  **`tenants/{tenantId}/crmClientes/{clienteKey}`** (constante `SUBCOLECAO_CRM_CLIENTES`).
  Campos: `nome`, `genero`, `nascimento`, `aniversario`, `qtdEventos`, `qtdInscricoes`,
  `valorGasto` (Σ `valorFinal + taxaRepassada`), `ltv` (Σ `valorFinal` confirmadas), `eventos`,
  `inscricoes`, `chaveTipo` (`cpf`|`email`|`atleta`).
- **Escopo:** **`tenantId`** no path **e** no campo.
- **A boa notícia de LGPD, e ela é de desenho, não de sorte.** O doc de CRM **não guarda** CPF,
  e-mail, telefone, cidade/UF, endereço, contato de emergência nem restrição médica — minimização
  deliberada da RN-172, e o `docId` é **hash** da chave, não a chave. Uma visão de clientes por tenant
  no painel master, montada sobre `crmClientes`, expõe **muito menos PII** do que a mesma visão
  montada sobre `inscritos`.
- **Veredito:** ✅ **o dado existe**, e existe na forma mais segura possível. Falta tela e leitura.
- **A pergunta que a tela precisa responder antes de nascer:** o dono disse "clientes". Se ele quiser
  o **contato** (e-mail/telefone) para falar com a pessoa, o `crmClientes` não serve e a fonte passa a
  ser `inscritos.dadosPessoais` + `pedidos.responsavel` — que é PII cheia. Isso é vetável, e está em
  [[03-spec]].

### 1.4 Vendas do tenant

- **O que `/plataforma` mostra hoje:** **nada de venda individual.** O que existe é o agregado
  (`gmvAcumulado`) e as filas de exceção (estornos, repasses).
- **Onde o dado vive:** dois docs, e os dois carregam `tenantId`.
  - `packages/core/src/pedidos/pedido.ts` → `Pedido`, coleção `pedidos/{pedidoId}`:
    `responsavel` (`{atletaId, nome, email, telefone?}`), `inscritoRefs`, `itens[]`, `valorTotal`,
    `status` (`pendente`/`pago`/`falhou`/`cancelado`), `formaPagamento`, `parcelas`, `codigoPedido`.
  - `packages/core/src/pedidos/pagamento.ts` → `Pagamento`, coleção `pagamentos/{pagamentoId}`:
    `valorBase`, `desconto`, `valorFinal`, `taxaRepassada?`, `taxaCongelada?`
    (`{meio, percentual, fixoCentavos, valor, origem}`), `cartao?`
    (`{bandeira, ultimos4, parcelas, valorParcela, valorTotalComJuros}`), `status`, `forma`
    (`cartao_credito` | `pix` — **sem boleto**), `pagoEm`, `conciliacao?`.
- **A conciliação é a peça de ouro para dinheiro:** `Conciliacao` carrega `taxaPct`, `taxaFixa`,
  `taxaValor` e **`repasseOrganizador`** — todos **congelados no ato da confirmação** (RN-179), nunca
  re-resolvidos.
- **Veredito:** ✅ **o dado existe, com a economia carimbada por venda.** Falta tela e leitura.

### 1.5 Análise de faturamento gerado

Este é o item onde "temos isso no banco" é **meio verdade**, e a metade que falta é a que ele vai usar
para decidir preço.

- **O que `/plataforma` mostra hoje:** `/plataforma/macro` exibe **GMV total**, **Receita Leela
  total**, **Tenants ativos** e, por tenant, **GMV**, **Receita Leela**, **Taxa**, **Eventos**. Fonte:
  `platform/rollups` (`packages/core/src/platform/rollups.ts`, constante
  `PLATFORM_ROLLUPS_DOC_PATH`).
- **Como o número nasce:** `functions/src/platform/rollups.ts` →
  `receitaLeela = computeTaxa(gmv, platformFeePct)`, onde `gmv` vem de
  `tenants/{id}.gmvAcumulado` (espelho, **não** recalculado das vendas) e `platformFeePct` sai de
  `commercialTerms/current`. Tenant sem termo entra com `receitaLeela: 0` e `platformFeePct: null`,
  sem fallback (RN-406 respeitada).
- **⚠️ Achado 1 · o rollup não tem cron.** `recomputePlatformRollups`
  (`functions/src/platform/rollups.ts:130`) é `https.onCall` puro, autorizado por
  `role === 'platform_admin'`. **Nenhum `pubsub.schedule` aponta para ela.** Os nove crons que existem
  (`coletaDiaria`, `encerrarEventos`, `expurgarSaude`, `virarLoteCron`, `varrerEstornosOrfaos`,
  `varrerIngressosOrfaos`, `expirarCarrinhosAbandonados`, `dispatchCampanhasAgendadas`,
  `dispatchAutomacoes`) não incluem rollup. **A tela macro mostra o número da última vez que alguém
  clicou.** Isso já está registrado em `.nirvana/handoffs/leela-rev-limpeza-20260806.md:323`.
- **⚠️ Achado 2 · "faturamento" não é palavra do código.** Zero ocorrências de `faturamento` em
  `packages/core`. O vocabulário vigente é `receitaBruta` / `receitaConfirmada` / `gmvAcumulado` /
  `vendidoBruto` — todos significando **valor de face confirmado**. Se a tela escrever "faturamento",
  ela precisa dizer de qual dos quatro está falando, ou o dono lê um número e entende outro.
- **⚠️ Achado 3 · não existe margem, e não existe custo.** Medido: `custoGateway` tem **zero
  ocorrências** em `packages/core`, `packages/api-client` e `functions/src` — existe **só** em
  markdown de spec. `custoReal` não existe. `receitaPlataforma` não existe. Nenhum cálculo de margem
  existe no backend. `packages/core/src/finance/economiaParcelamento.ts` (o módulo da S1610-T6)
  **não existe**. O `netValue` que o Asaas devolve é **descartado de propósito**
  (`functions/src/payments/asaasProvider.ts:1506`, com teste travando o comportamento em
  `asaasProvider.test.ts:1123`).
- **Veredito:** ⚠️ **parcial.** Faturamento **bruto** por tenant existe e já está na tela. Faturamento
  **líquido da plataforma** (receita − custo do gateway) **não existe em lugar nenhum** e não pode ser
  exibido sem a S1610 (T3/T4/T5/T6) subir antes. A spec **não inventa** esse número: a coluna nasce
  com "custo não configurado", exatamente como a RN-455 já manda.
- **Reconciliação com o cânone:** `receitaLeela` do rollup é `GMV × platformFeePct` — **receita bruta
  da plataforma**, sem custo e sem `saasMonthlyFee` somado. A RN-182 segue intocada: o líquido do
  produtor é `face − taxa(meio)` no modo `incorporada` e `face` no modo `repassada`
  (`computeLiquidoProdutor`, `packages/core/src/finance/repasse.ts:75`). Ver §Parte 3.

### 1.6 Repasses

- **O que `/plataforma` mostra hoje:** **muito.** `/plataforma/repasses` é uma fila **cross-tenant**
  com chips de estado (Todos/Solicitados/Aprovados), combobox de tenant, colunas Tenant · Valor ·
  Estado · Solicitado em, e ações Aprovar / Recusar / Registrar pagamento. Na mesma página vive o
  `RetencaoEditor` (retenção % por tenant).
- **Onde o dado vive:** `packages/core/src/finance/repasse-types.ts`:
  - `tenants/{tid}/repasses/{repasseId}` → `Repasse` (`valor`, `estado`, `dadosBancariosSnapshot`
    mascarado, `comprovanteNumero?`, `transicoes[]` append-only)
  - `tenants/{tid}/saldo/current` → `SaldoRepasse` (`vendidoBruto`, `retido`, `disponivel`,
    `comprometido`, `dentroJanelaDN`, `eventosSemTermo`)
  - `tenants/{tid}/dadosBancarios/current` (mascarado) e `dadosBancariosSecret/current` (cifrado,
    `read:false` para todo cliente, inclusive admin — leitura só pelo callable auditado
    `getBankDetailsForPayout`, que registra **inclusive a negativa** em `auditoriaAcessos`)
- **Callables admin já existentes:** `approveRepasse`, `rejectRepasse`, `markRepassePago`,
  `setRetencaoRepasse`, `getBankDetailsForPayout` — todos guardados por `assertPlatformAdmin`
  (`functions/src/finance/atores.ts:45`).
- **Veredito:** ✅ **existe e está construído.** O gap é de **navegação**, não de dado: a fila é global
  e o dono pediu a visão **por tenant**. O `SaldoRepasse` do tenant (`vendidoBruto`/`retido`/
  `disponivel`/`comprometido`) **não aparece em nenhuma tela do painel master** — e é exatamente o
  bloco que responde "quanto esse produtor tem a receber".
- **Reaproveitado × criado:** reaproveita 100% do backend e o `RegistrarPagamentoModal`. Cria só o
  recorte por tenant dentro do detalhe.
- **⚠️ O que a tela precisa dizer em voz alta:** RN-356 — "pago" é **registro manual**, sem
  transferência bancária real. O modal já avisa; a visão por tenant tem de repetir, senão um saldo
  "pago" no drill-down parece dinheiro que saiu.

### 1.7 Plano de cobrança

- **O que `/plataforma` mostra hoje:** o **catálogo** (`/plataforma/planos`) e a ação **Aplicar**. O
  que **não** mostra: qual plano está aplicado em qual tenant.
- **Onde o dado vive:** `packages/core/src/platform/planoCobranca.ts` → `PlanoCobranca`, coleção
  **top-level** `planosCobranca` (constante `PLANOS_COBRANCA_COLLECTION`, `PLANO_PADRAO_ID = 'padrao'`).
  Campos: `nome`, `tabelaTaxasParcela`, `taxaPix`, `taxaCartaoAVista`, `saasMonthlyFee`.
- **O rastro no tenant existe:** `commercialTerms/current` carrega **`planoAplicadoId?`** e
  **`planoAplicadoEm?`** (`packages/core/src/platform/commercialTerms.ts`), gravados por
  `aplicarPlano` (`functions/src/platform/aplicarPlano.ts:192`, guardado por
  `role === 'platform_admin'`, RN-404).
- **Veredito:** ✅ **o dado existe** — inclusive o vínculo. Falta **exibir**. Zero campo novo.
- **⚠️ A semântica que a tela não pode falsear, e o próprio produto já diz isso na letra.** O modal
  `AplicarPlanoModal` avisa: aplicar plano *"grava uma nova versão dos termos… não há vínculo vivo"*.
  É **estampa**, não assinatura. Se depois alguém editar o termo à mão, `planoAplicadoId` continua
  apontando para um plano que **não descreve mais** o que está valendo. A tela do drill-down tem de
  mostrar o plano **e** a versão do termo, e sinalizar quando o termo divergiu da estampa — senão o
  dono lê "plano X" e cobra com número Y.
- **O campo morto do vizinho, que quem construir vai encontrar:** `tabelaTaxasParcela` (2x a 12x) tem
  modelo, validação, Rules e interface completa — e **o checkout nunca a consome**
  (S1610-T8). Ela aparece na coluna "Parcelamento" da tela de planos. A visão por tenant **não**
  pendura nada nela.

### 1.8 Responsável

Este é o primeiro dos dois itens em que "temos isso no banco" **não se sustenta como escrito**.

- **O que `/plataforma` mostra hoje:** o detalhe do tenant já exibe `Owner {ownerNome ?? ownerUid}`,
  com o UID no `title`. Vem de `getTenantComOwner` (`tenants/{id}` + `profissionais/{ownerUid}`).
- **O que existe no modelo:** `Tenant` (`packages/core/src/platform/tenant.ts`) tem **`ownerUid`** e
  nada mais de pessoa. O `Profissional` (`packages/core/src/index.ts:61`) tem `nome`, `email`,
  `papeis`.
- **⚠️ A divergência load-bearing:** `packages/api-client/src/platform/profissionais.ts:113` **grava**
  `telefone` (normalizado, só dígitos), `organizacao`, `statusOnboarding` e `consentimentoLgpd` —
  **campos que não estão na interface `Profissional`**. O contrato de entrada existe
  (`CadastroOrganizadorInput` em `packages/core/src/platform/cadastroOrganizador.ts`), mas nunca foi
  refletido no tipo persistido. Ou seja: **telefone e organização do responsável já estão no banco e
  são invisíveis para quem lê só o tipo.**
- **Veredito:** ⚠️ **existe, com ressalva de tipagem — e com uma pergunta de produto que a frase do
  dono não decide.** "Responsável" pode ser (a) o **owner da conta**, que é o que já está lá, ou (b)
  um **contato responsável** distinto — jurídico, financeiro, quem atende o telefone —, que **não
  existe** em campo nenhum. As duas leituras são defensáveis e custam coisas diferentes: (a) é tela e
  tipagem; (b) é campo novo no `Tenant` + escrita + Rule.
- **Proposta mínima, se ele quiser (b):** um único campo opcional
  `Tenant.responsavel?: { nome: string; email: string; telefone?: string }` — sem coleção nova, sem
  índice novo, escrita exclusiva do `platform_admin` (RN-404). **Vetável**, em [[03-spec]].

## Parte 2 · Listas globais — as três

### 2.1 Todos os eventos do sistema

- **O que `/plataforma` mostra hoje:** **nada.** Nenhuma rota do painel master lista eventos.
- **Onde o dado vive:** `eventos/{eventoId}`, coleção **raiz**, cada doc com `tenantId` (ver §1.1).
- **Veredito:** ✅ dado existe; ❌ tela, leitura e (ver Parte 4) possivelmente a Rule.
- **⚠️ O problema é de escala, não de dado.** Não existe `collectionGroup` em lugar nenhum do
  `api-client` (varredura devolveu zero). O padrão vigente para cross-tenant é fan-out no cliente com
  teto e truncamento declarado — aceitável para uma fila de exceções, **inaceitável** para "todos os
  eventos do sistema". Uma listagem global de eventos com paginação, filtro e contagem honesta pede
  leitura no servidor.

### 2.2 Todos os clubs

- **O que `/plataforma` mostra hoje:** **nada.**
- **Onde o dado vive:** `clubes/{clubId}`, coleção **raiz**, cada doc com `tenantId` (ver §1.2).
- **Veredito:** idêntico ao de eventos. Mesma tela, mesma mecânica, mesma decisão de leitura.
- **Nota de volume:** clubes são ordens de grandeza menos numerosos que eventos, e eventos menos que
  inscritos. Se alguma das três listas puder nascer no padrão simples, é esta — mas a spec não trata
  as duas de formas diferentes sem número real na mão, e número real é leitura de produção, que esta
  lane não faz.

### 2.3 Todos os usuários

Este é o item mais caro da ordem, e o único que é **PII por natureza**.

**A primeira coisa a dizer é que "usuário" não é uma entidade neste sistema.** São quatro coisas
diferentes, e a tela precisa escolher qual delas — ou dizer que mostra várias, com o rótulo certo em
cada linha.

| # | Entidade | Arquivo / coleção | PII que carrega | Escopo |
|---|---|---|---|---|
| 1 | `Atleta` | `packages/core/src/index.ts:47` · `atletas/{uid}` | `nome`, `email` | **global** (cross-tenant por decisão do ADR-009) |
| 2 | `Profissional` | `packages/core/src/index.ts:61` · `profissionais/{profId}` | `nome`, `email` + (não tipados) `telefone`, `organizacao`, `statusOnboarding`, `consentimentoLgpd` | `tenantId` — **exceto** quem está em `aguardando_convite`, que não tem tenant |
| 3 | `Pessoa` | `packages/core/src/pedidos/pessoa.ts` · `pessoas/{cpf_hmac}` | **`cpf` em claro (11 dígitos)**, `contaEmail`, e `dadosConhecidos` com `nome`, `genero`, `nascimento`, `telefone`, `endereco` | **global**, sem `tenantId` |
| 4 | Conta Auth | Firebase Auth (fora do Firestore) | e-mail, provedor, último login | — |

- **⚠️ `pessoas` é a coleção mais sensível do sistema.** Ela guarda **CPF em claro**, e as Rules hoje
  são `read: false` / `write: false` para **todo** cliente — inclusive o `platform_admin`. Isso é
  proposital. Qualquer visão de usuários que queira CPF **exige abrir essa Rule**, e essa abertura é a
  decisão mais cara desta rodada. A spec **não** a propõe como default.
- **O que o item ADMIN-USUARIOS-1 já resolveu, e o que ele não é.** A decisão de 09/08 (bloco 13)
  mandou o **cadastro** aparecer no painel master, para o dono aprovar por código ou liberar
  diretamente. Isso é a **fila** de quem está em `statusOnboarding: 'aguardando_convite'` — um recorte
  pequeno de `profissionais`, sem CPF, com PII já necessária ao trabalho. **Não é** o diretório de
  todo mundo. As duas coisas se tocam e a spec as trata como **uma tela com dois modos**, não como
  duas telas — o desenho está em [[03-spec]].
- **Veredito:** ⚠️ **o dado existe em quatro lugares diferentes, com níveis de sensibilidade
  radicalmente diferentes.** A visão global de usuários **não** é uma tela: é uma decisão de alcance
  que o dono precisa tomar antes de a tela nascer.

## Parte 3 · Reconciliação com o cânone do dinheiro

Toda cifra que a visão master exibir precisa fechar com o que já está gravado. Aqui está a régua, com
o caminho.

| Conceito | Nome no código | Fórmula / fonte | Onde |
|---|---|---|---|
| Face da venda | `valorFinal` | `valorBase − desconto` | `pedidos/pagamento.ts` |
| Taxa da plataforma | `conciliacao.taxaValor` | `round_half_up(faceCentavos × percentualBp / 10000) + fixoCentavos` (RN-183) | `finance/taxaPlataforma.ts` |
| **Líquido do produtor** | `conciliacao.repasseOrganizador` | `incorporada` ⇒ `face − taxa(meio)`; `repassada` ⇒ `face` (**RN-182, modo-aware**) | `finance/repasse.ts:75` |
| Invariante de guarda | — | `repasseOrganizador ≈ valorFinal − taxaValor + taxaRepassada` (tol. 1 centavo) | `pedidos/pagamento.ts:449` |
| GMV do tenant | `gmvAcumulado` | ∑ por Function, espelhado em `rollups.tenants[tid].gmv` | `platform/tenant.ts` |
| Receita Leela | `receitaLeela` | `computeTaxa(gmv, platformFeePct)` — **bruta**, sem custo | `functions/src/platform/rollups.ts:85` |
| Custo do gateway | — | **NÃO EXISTE EM CÓDIGO** | — |
| Margem | — | **NÃO EXISTE EM CÓDIGO** | — |

**A armadilha que a spec fecha antes de existir.** O brief resumiu a RN-182 como
"líquido do produtor = face − taxa(meio)". A letra canônica é **mode-aware**: no modo `repassada` o
comprador paga a taxa por fora, e o líquido do produtor é o **face cheio** — a taxa vai à Leela e
nunca entra no "a receber" (RN-182 no `LEELA-E09-financeiro-profissional.md:874`). Uma tela de
faturamento por tenant que somasse `face − taxa` para todo mundo **erraria o número de todo evento em
modo repassada**. `Evento.taxaModo` existe e é por evento; `commercialTerms.modoTaxaDefault` existe e
é por tenant. A visão master **lê o carimbo** (`conciliacao`), nunca recalcula.

**Juros.** Não existe automação de decisão de juros, e a decisão de 09/08 já é o comportamento
vigente. O `jurosAoMes` é **campo de dado** no termo do tenant
(`commercialTerms.installmentRules.jurosAoMes`, default 2,89), editado hoje pelo dono em
`/plataforma/tenants/:id/termos`. O código apenas **aplica** a tabela Price sobre o número que ele
gravou (`buildInstallmentOptions`, `packages/core/src/finance/calc.ts:127`). Nenhum cron, trigger ou
heurística mexe nesse número. **Esta spec não propõe nada que mude isso**, e o juro nunca entra em
`valorFinal` — o `repasseOrganizador` é calculado sobre o face
(`functions/src/checkout/webhookPagamento.ts:579`), preservando RN-437 e RN-182.

## Parte 4 · A fronteira de acesso (Security Rules)

Arquivo único de produção: **`C:\dev\LEELA\firestore.rules`** (3.050 linhas). O `storage.rules` **não
tem nenhum conceito de `platform_admin`** (zero ocorrências) — irrelevante para esta spec, mas vale
registrar porque a imagem de evento e de clube é servida por lá.

### O helper que decide tudo

`firestore.rules:73-77` — ponto único de decisão, com **duas pernas**:

```
function isPlatformAdmin() {
  return isSignedIn()
    && (request.auth.token.role == 'platform_admin'
        || request.auth.token.platformAdmin == true);
}
```

126 call-sites. A comparação da capacidade é com o **booleano literal** `true` — `'true'` (string),
`false` e `1` não passam, e isso está travado por teste
(`functions/src/__tests__/papelDuploRules.integration.test.ts:226-240`).

**⚠️ Achado de coerência que não é desta lane resolver, mas que ela precisa registrar.** As Rules
aceitam **as duas pernas**; os **callables** não. `assertPlatformAdmin`
(`functions/src/finance/atores.ts:45`) e as guardas de `aplicarPlano`, `setTaxaPlataformaGlobal`,
`transitionTenant`, `provisionTenant`, `recomputePlatformRollups` comparam
`claims.role !== 'platform_admin'` na mão. Só `setPlatformAdminCapability` usa o predicado do core.
Resultado: uma conta com **capacidade** `platformAdmin` **lê** tudo pelas Rules e **é barrada** em
quase toda escrita de plataforma. Quem construir a visão master sobre a capacidade vai ver telas que
carregam e ações que falham. Está em [[04-fila-build]] como item de dívida, não como carona.

### A resposta curta, e ela é boa para o dono

**Para nove dos onze itens, nenhuma Rule precisa mudar.** `eventos`, `clubes`, `atletas`,
`profissionais`, `pagamentos`, `pedidos`, `inscritos`, `tenants` e `commercialTerms` já têm
`isPlatformAdmin()` como disjunto **que não depende de `resource`** — ou seja, um `list()` sem filtro
de tenant passa doc a doc para o administrador. A intuição do dono ("não seria dificuldade") está
**certa na camada de permissão**. O custo está em tela e em leitura, não em fronteira.

| Coleção | Linha da regra de leitura | Admin cruza hoje? |
|---|---|---|
| `tenants/{tenantId}` | `firestore.rules:154` | ✅ sim |
| `tenants/{t}/commercialTerms/{doc}` | `:171` (read member ou admin) | ✅ sim |
| `tenants/{t}/repasses/{id}` | `:332` | ✅ sim |
| `tenants/{t}/saldo/{doc}` | `:342` | ✅ sim |
| `tenants/{t}/dadosBancarios/{doc}` | `:309` (mascarado) | ✅ sim |
| `eventos/{eventoId}` | `:744` | ✅ sim |
| `eventos/{id}/inscritos/{id}` | `:931` | ✅ sim (PII) |
| `eventos/{id}/financeiro/{doc}` | `:1359` | ✅ sim |
| `clubes/{clubeId}` | `:2018` | ✅ sim |
| `clubes/{id}/membros/{id}` | `:2077` | ✅ sim (PII) |
| `pagamentos/{doc}` | `:2530` | ✅ sim |
| `pedidos/{pedidoId}` | `:2671` | ✅ sim |
| `atletas/{atletaId}` | `:2812` | ✅ **lê** (não escreve — `:2813`) |
| `profissionais/{profId}` | `:2922` | ✅ sim |
| `planosCobranca/{planoId}` | `:520` | ✅ sim (só admin) |
| `platform/{doc=**}` | `:414` | ✅ sim (só admin) |

### As quatro portas fechadas, e por que cada uma está fechada

| # | Coleção | Linha | Estado | Por quê |
|---|---|---|---|---|
| 1 | `tenants/{t}/crmClientes/{clienteKey}` | `:382` | `allow read: if isTenantWriter(tenantId);` — **admin omitido de propósito** | Justificativa escrita nas próprias Rules (`:368-372`): é perfil comportamental individual + LTV; o back-office deve usar **Admin SDK**, não client SDK |
| 2 | `pessoas/{pessoaId}` | `:2688` | `allow read, write: if false;` | **CPF em claro**, cross-tenant. Fechada para todo mundo, inclusive admin |
| 3 | `tenants/{t}/dadosBancariosSecret/{doc}` | `:320` | `allow read, write: if false;` | Blob cifrado; a superfície legítima é o callable auditado `getBankDetailsForPayout` |
| 4 | `clubes/{id}/{subcol}/{doc}` (wildcard) | `:2464` | `allow read, write: if false;` | Comentário `:2452` explica: admin no read vazaria e-mail de convite de clube |

**A única que a ordem do dono encosta é a (1)**, e a própria Rule já diz qual é o caminho certo:
Admin SDK. Ou seja — **a visão de clientes por tenant não pede abertura de Rule; pede um callable.**
Isso é a diferença entre uma decisão de segurança e uma tarefa de backend, e esta spec escolhe a
segunda. As portas (2), (3) e (4) **não são tocadas por esta rodada**.

### A restrição de mecanismo que dimensiona a fila inteira

**Não existe uma única regra de `collectionGroup` no arquivo.** Os dois wildcards recursivos são
`match /platform/{doc=**}` (`:413`, ancorado, não é CG) e o catch-all `match /{document=**}`
(`:3045`, deny). Como o Firestore só autoriza consulta de collection group por
`match /{path=**}/<colecao>/{doc}`, **toda `collectionGroup()` vinda do client SDK é negada —
inclusive para `platform_admin`**. Isso é intencional e está documentado no próprio painel
(`apps/painel/src/lib/query/queries.ts:704-710` e `:716`).

**O descompasso que quem construir vai encontrar:** `firestore.indexes.json` **já tem** índices
`COLLECTION_GROUP` para `inscritos`, `campanhas`, `automacoes`, `afiliados`, `parcerias`, `saude`,
`lotes`, `membros` e `convites` — todos servindo consumidores **server-side (Admin SDK)**. Os índices
existem, as Rules não. Um admin que tentar `collectionGroup('inscritos')` no painel recebe
`permission-denied`, **não** `failed-precondition` — e o erro vai parecer bug de índice.

**A consequência para esta ordem, em uma frase.** `eventos` e `clubes` são coleções **raiz**: a
listagem global delas é `list()` comum e passa hoje, sem CG e sem Rule nova. Já qualquer coisa que
viva em subcoleção — inscritos de todos os eventos, membros de todos os clubes — **não** tem caminho
pelo cliente. É por isso que [[04-fila-build]] separa a onda que sobe pelo caminho que já existe da
onda que exige backend.

### Lacunas de teste que a spec registra

A cobertura de "admin cruza a fronteira" é forte — há caso nomeado para tenants, inscritos, clubes
privados, membros, termos, kits, repasses, saldo, eventos e profissionais, e há cobertura **negativa**
(o admin que **não** cruza) para `dadosBancariosSecret`, `perfis`, delete de evento e de clube. Três
buracos, e o primeiro importa para esta ordem:

1. **Nenhum teste exercita `platform_admin` contra `crmClientes`** (`:382`). A negação mais
   consequente do arquivo não tem canário — se alguém acrescentar `|| isPlatformAdmin()` ali por
   engano, nada quebra.
2. Nenhum teste de `collectionGroup` **com crachá de `platform_admin`**. O "admin não lista por CG" é
   verdade por construção, não por trava.
3. `pessoas` (`:2688`) e `profissionais/{id}/marcas` (`:3006`) não têm caso nomeado com admin.

Os três viram tarefa de teste em [[04-fila-build]], porque esta rodada acrescenta telas que passam
exatamente por essas fronteiras.

## Parte 5 · O placar honesto — reaproveitado × criado

| # | Item pedido | Dado existe? | Tela existe? | O que falta |
|---|---|---|---|---|
| 1 | Eventos do tenant | ✅ completo | ❌ (só o contador) | tela + leitura |
| 2 | Clubs do tenant | ✅ completo | ❌ | tela + leitura |
| 3 | Clientes do tenant | ✅ (`crmClientes`, PII minimizada) | ❌ | **callable Admin SDK** (Rule fecha o cliente de propósito) + tela |
| 4 | Vendas do tenant | ✅ completo, com economia carimbada | ❌ | tela + leitura |
| 5 | Faturamento gerado | ⚠️ bruto sim, líquido **não** | ⚠️ parcial (`/macro`) | cron do rollup + S1610 para custo/margem |
| 6 | Repasses | ✅ completo | ✅ fila global | recorte por tenant + saldo no detalhe |
| 7 | Plano de cobrança | ✅ inclusive o vínculo (`planoAplicadoId`) | ⚠️ catálogo sim, aplicado **não** | exibir + sinalizar divergência |
| 8 | Responsável | ⚠️ owner sim; contato próprio **não** | ✅ owner no detalhe | tipagem + **decisão do dono** |
| 9 | Todos os eventos | ✅ (raiz; Rule já permite `list` do admin) | ❌ | tela + paginação honesta |
| 10 | Todos os clubs | ✅ (raiz; Rule já permite `list` do admin) | ❌ | tela + paginação honesta |
| 11 | Todos os usuários | ⚠️ em 4 entidades distintas | ❌ | **decisão de alcance (PII)** antes da tela |

**Onde a intuição do dono estava certa, e vale dizer.** Ele apostou que o dado está no banco e que a
dificuldade seria pequena. Na camada que ele não podia ver — as Security Rules — ele estava certo em
nove dos onze itens: o `platform_admin` **já** atravessa a fronteira em `eventos`, `clubes`,
`atletas`, `profissionais`, `pagamentos`, `pedidos`, `inscritos` e `tenants`. As duas listas globais
de eventos e clubs são coleções raiz e a consulta passa hoje. O trabalho real está em tela, em
paginação que não minta sobre o total, e nos dois itens onde o dado de fato não existe.

**O que se reaproveita, em uma frase:** o modelo de dados inteiro, os nove callables de admin já
guardados por `assertPlatformAdmin`, a fila de repasses, o `PlatformGuard`, o `PLATFORM_NAV`, os
`_lib` puros (`filter`, `health`, `lifecycle`, `format`, `errors`, `sort`) e os componentes do DS.

**O que se cria:** telas de listagem, uma camada de leitura que aguente cross-tenant sem truncar em
silêncio, o agendamento do rollup, e — **só se o dono vetar a favor** — um campo de responsável e o
alcance da visão de usuários.
