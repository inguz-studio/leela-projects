# Modelo de dados · Firestore · Leela

> Materializa `modelo-de-dados.md` (entidades) na estratégia Firestore decidida no ADR-005. Fonte de verdade para os specs. Toda coleção nova é criada com Security Rules na mesma task.
> Mocks canônicos (seed): ver `HANDOFF-05-mocks-canonicos.md` — reusar exatamente (Corrida Perfeita Sul, código 8A3K9, Meia Floripa 2026, etc.).

---

## Convenções

- IDs: `uuid` salvo quando há slug natural (clube/evento usam `slug` como docId candidato).
- Timestamps: `criadoEm`, `atualizadoEm` (server timestamp).
- **Desnormalização marcada** com 🔁 (cópia mantida por Function).
- **Agregado computado** marcado com ∑ (mantido por Cloud Function, nunca no cliente).
- **N:N** marcado com ⇄ e a estratégia escolhida.

---

## Coleções (top-level) e subcoleções

### `atletas/{atletaId}`
Entidade global cross-domínio (identidade única entre clube, evento, app).
Campos: `nome`, `email`, `avatarInit`, `criadoEm`.
Auth: doc criado no primeiro login (Firebase Auth uid = atletaId).

### `profissionais/{profId}`
Campos: `nome`, `email` (único), `papeis[]` (coordenador/organizador/admin via custom claims).
Relações: 1:N owner de `clubes`; ⇄ N:N parceiro de clube (ver `clubes/{id}/parceiros`).

### `clubes/{clubId}`  (docId = slug)
Campos: `nome`(≤60), `descricao`(≤280), `slug`(único), `categoria`, `modalidade`, `localizacao`, `ownerId→profissionais`, `codigoConvite`(5 chars, exclui 0/O/1/I/L — RN-101), `visibilidade`(publica/indexavel/privada — RN-140), `aprovacaoManual`(bool — RN-141), `modeloEntrada`(gratuito/pago_em_breve — RN-104), `criadoEm`.
∑ KPIs desnormalizados: `qtdMembrosAtivos`, `qtdDesafiosAtivos` (mantidos por Function).

Subcoleções:
- **`membros/{membroId}`** — join Atleta⇄Clube. `atletaId→atletas` 🔁`atletaNome`, `papel`(owner/admin/membro — RN-103), `entrouEm`, `entrouVia`(codigo/convite/link), ∑`status`(ativo/novo<7d/inativo30d+ — RN-102, derivado por Function ou no read via `core`). Atleta↔Clube é o N:N materializado como subcoleção.
- **`permissoesAdmin/{profId}`** — 6 flags bool (RN-142): `criarDesafios`, `enviarComunicados`, `aprovarMembros`, `removerMembros`, `gerarCodigo`, `aceitarParcerias`.
- **`desafios/{desafioId}`** — ver abaixo.
- **`parcerias/{parceriaId}`** — ver abaixo.
- **`comunicados/{comunicadoId}`** — ver abaixo.
- ➕ **`convites/{emailKey}`** — convite por email (E05 · S104-T1) — ver abaixo.

### `clubes/{clubId}/desafios/{desafioId}`
Campos: `nome`, `descricao`, `modelo`(A meta_acao / B meta_pontos / C equilibrio — RN-110/111), `dataInicio`, `dataFim`, `status`(rascunho/ativo/encerrado), `patrocinioId→parcerias?` (RN-112), `eventoVinculadoId?` (RN-113), `metaTotalPontos`(B/C), `minimoPorPilar`(C), `recompensaTipo`(medalha_digital/cupom/medalha_fisica/custom — RN-116), `visibilidade`(membros/convite/publico — RN-117).
⇄ **N:N Desafio↔CatalogoAcao** → subcoleção de junção **`acoes/{acaoId}`**: `{ acaoRef→catalogoAcoes, meta(number, modelo A) }`.
∑ Progresso/pontos: agregado por Function (bônus RN-115: +20% 3 pilares/dia, +10% 5+ dias/semana são regras de cálculo, não dados).

### `catalogoAcoes/{acaoId}` (global, seed fixo — 16 ações / 3 pilares — RN-114)
Campos: `nome`, `pilar`(fisico/mental/espiritual), `unidade`, `pontosBase`, `icone`(Lucide).
Seed exato em HANDOFF-05 (Correr `footprints` 2pt/km, Meditar `sparkles` 5pt/10min, ...).

### `clubes/{clubId}/parcerias/{parceriaId}`
Campos comuns: `tipo`(evento_afiliado/patrocinador), `status`(convite_pendente/ativa/inativa).
Se **evento_afiliado**: `eventoId→eventos`, `organizadorId`, `programaAfiliacaoRef` (termos read-only espelhados — RN-121/122), 🔁`comissaoPct`,`cupom`,`linkMaster`,`janelaAtribuicaoDias`; ∑`conversoes`, ∑`valorAReceber` (mantidos por Function no evento de conversão/split).
Se **patrocinador**: `nome`, `modeloComercial`(financeiro/permuta — RN-123), `valorAnual?`, `contrapartida`, `contratoUrl?`.

### `clubes/{clubId}/comunicados/{comunicadoId}`
Campos: `titulo`(≥5), `conteudo`(≥10; push ≤160 — RN-134), `capaUrl?`(só email — RN-135), `canal[]`(push/email — RN-131), `origem`(manual/automatizada — RN-132), `status`(rascunho/agendado/enviado — RN-130), `segmento`(embed: `tipo` todos/por_desafio/por_pilar/por_engajamento + `referencia?`), `agendadoPara?`, `enviadoEm?`, ∑`alcance`, ∑`aberturasPct?`.
Regra: ≤4 push/semana/clube (RN-133) — validada por Function.

### ➕ `clubes/{clubId}/convites/{emailKey}` (E05 · S104-T1, docId = email em minúsculas)
Convite por email para entrar no clube — máquina de estados auditável do convite (o disparo físico do email é integração futura).
Campos: `email`(lowercase, = docId — email não contém `/`), `tenantId`, `status`(`pendente`; estados futuros da máquina: aceito/expirado), `convidadoPor`(uid do profissional), `enviadoEm`, `criadoEm`.
Regras: RN-106 — 1 a 50 emails por envio, revalidados server-side pela mesma `validarConvite` pura do modal; dedupe case-insensitive preservando a 1ª ocorrência; reenvio ao mesmo email é idempotente (regrava `enviadoEm`, preserva `criadoEm`).
Escrita **só pela Function `enviarConvites`** — a subcoleção cai no catch-all de `clubes/{clubId}` nas Security Rules (leitura tenant-only; escrita de cliente NEGADA).

### `eventos/{eventoId}` (docId = slug)
Campos: `organizadorId`, `nome`, `data`, `local`, `modalidades[]`, `slug`, `status`(rascunho/publicado/ao_vivo/encerrado), `usaChip`(bool — RN-207).
➕ Saúde/regulamento (S306): `exigenciasSaude{ atestado:bool, parq:bool }` (RN-146), `regulamentoVersao`, `regulamentoAtualizadoEm` (`regulamentoUrl` já existe no upload de E03-S201-T1 — RN-147/149).
∑ KPIs: `qtdInscritos`, `receitaConfirmada`.
Regra: após 1ª venda, preço bloqueado (RN-200); publicar gera URL+QR (RN-201).

Subcoleções:
- **`inscritos/{inscritoId}`** — join Atleta↔Evento. `atletaId→atletas` 🔁`atletaNome`, `kit`(kit_ouro/kit_prata/kit_basico/sem_kit — RN-202/216), `chipNumero?`(null até entrega — RN-203), `status`(confirmado/pendente/cancelado — RN-204), `modalidade`. Paginação obrigatória (mock: 453).
  ➕ Pedido em grupo (ADR-011): `pedidoRef→pedidos`, `ehResponsavel`(bool — inscrito que também é o responsável/pagador do pedido; auto-inscrição = pedido de 1 inscrito com `ehResponsavel=true`).
  ➕ Ingresso/check-in: `qrToken`(opaco, assinado server-side — RN-218/221), `ingressoEmitidoEm`, `kitEntregueEm?`, `checkinEm?` (dois carimbos distintos — RN-205/221/222: no balcão padrão ambos são setados juntos; kit antecipado seta só `checkinEm` na largada; escrita só por Function `registrarEntrega`/`registrarCheckin`, nunca pelo cliente).
  ➕ Estoque/saúde/regulamento: `tamanhos: Record<itemId,string>`(ex.: `{"camiseta-dry":"M"}`; obrigatório quando o kit tem item tamanhado — RN-212/223), `contatoEmergencia{ nome, telefone }`(obrigatório — RN-145), `regulamentoAceite{ versao, aceitoEm, ipHash? }`(RN-148/149), `consentimentoLgpd{ aceitoEm }`(distinto do aceite de regulamento).
  ➕ Titularidade: `titularHistorico[]`(append-only — RN-345; `status=cancelado` usado no estorno — RN-204/341).
  Subcoleções: ➕ **`saude/{unico}`** (condicional), ➕ **`notificacoes/{tipo}`** — ver abaixo.
- **`kits/{kitId}`** — `nome`(nunca "tier" — RN-216), `preco`(decimal, aceita negativo=desconto — RN-211), `capacidade`, `modalidades[]` (RN-210).
- **`programaAfiliacao/{unico}`** — criado pelo organizador (RN-310/311): `comissaoPct`, `janelaAtribuicaoDias`, `tetoMensal?`, `cupom?`. 1:N para parcerias de clubes.
- ➕ **`politicaVendas/{unico}`** — política de reembolso/transferência/troca (S305) — ver abaixo.
- ➕ **`aprovisionamento/{sku}`** — encomenda→estoque por SKU (S210) — ver abaixo.
- ➕ **`reembolsos/{reembolsoId}`**, ➕ **`transferencias/{transferenciaId}`** — máquina de estados por inscrito (S904) — ver abaixo.

### `itensKit/{itemId}` (nível do evento ou global do organizador)
Campos: `nome`, `tamanhado`(bool — RN-212), `origem`(organizador/patrocinador — RN-213), `exibirLogo`(bool — RN-214), ➕ `modeloEstoque`(`sob_encomenda`|`estoque_proprio` — RN-225), ➕ `tamanhosDisponiveis[]`(para itens tamanhados — RN-210/212).
⇄ **N:N Kit↔ItemKit** (RN-215) → `kits[]` (array de refs de kit no item) OU subcoleção `kits/{kitId}/itens`. Estratégia recomendada: array de refs no item + índice inverso desnormalizado ("usado em: [kits]").

### ➕ `pedidos/{pedidoId}` (ADR-011 — pedido em grupo) — ✅ implementado (FABLE-A-T1, `packages/core/src/pedidos/`)
A compra: um responsável/pagador e N inscritos. **Pagamento único** do pedido (um `createCharge`, um webhook de confirmação). Reembolso, cancelamento e troca de titularidade operam **por inscrito** dentro do pedido (ver `reembolsos`/`transferencias`), nunca sobre o pedido inteiro — cancelar um inscrito não cancela os demais.
Campos (contrato canônico em `packages/core/src/pedidos/pedido.ts`): `tenantId` (ADR-009), `eventoId→eventos` (denormalizado — pedido pertence a UM evento), `responsavel{ atletaId→atletas, 🔁nome, 🔁email }` (pagador; nome/email desnormalizados p/ o e-mail do pedido), `inscritoRefs[]` (ids em `eventos/{eventoId}/inscritos`; sempre ≥ 1 — auto-inscrição = pedido de 1 inscrito com `ehResponsavel=true` no inscrito), `pagamentoRef→pagamentos` (string|null até a cobrança existir), `valorTotal` (R$), `status`(pendente/pago/falhou/cancelado — SEM estorno aqui: estorno é por inscrito), 🔁`formaPagamento?`/🔁`parcelas?` (espelho do pagamento p/ lista sem join), `criadoEm`, `atualizadoEm`.
`pagamentos/{pagamentoId}` (1:1, `pedidoRef` backlink) carrega os campos do slide-in `[pag]` (S203): `forma`(cartao_credito/pix — sem boleto), `valorBase`+`loteId?`/🔁`loteNome?`, `cupom?{codigo, descontoPct}`, `desconto`, `valorFinal`, `cartao?{bandeira, ultimos4, parcelas, valorParcela, valorTotalComJuros}` (juros Price 3,49% a.m. repassados ao comprador), `pagoEm?` e `conciliacao?{idTransacao, gateway:'asaas' (D2), adquirente?, taxaPct?/taxaFixa? (percentual pura OU percentual+fixo por tenant), taxaValor, repasseOrganizador, repassePrevistoEm?}`.
Escrita de estado financeiro só via Function (Admin SDK) — Rules: `pedidos` e `pagamentos` com write de cliente NEGADO; leitura nesta fase só pelo tenant organizador (responsável/atleta lê o próprio pedido na story do checkout). E-mail ao responsável lista todos os inscritos; cada inscrito recebe seu ingresso/QR individual.

### ➕ `eventos/{eventoId}/politicaVendas/{unico}` (S305)
Doc único de política do evento. Escrita **só pelo owner do evento**.
Campos: `reembolso{ janelaArrependimentoDias:7, corteHoras:48, slaAnaliseDias }` (RN-338/339/340), `transferencia{ habilitada, janelaHoras:72, taxa }` (RN-343), `trocaIngresso{ habilitada, janelaHoras:48, permiteReembolsoDowngrade:false }` (RN-344).

### ➕ `eventos/{eventoId}/aprovisionamento/{sku}` (S210, docId = `itemId__tamanho`)
SKU = item + tamanho. Estado e agregados de encomenda por SKU.
Campos: `estado`(`estimativa`/`encomendado`/`em_estoque` — RN-226), ∑`qtdVendida`(inscritos confirmados que exigem o SKU — por Function), `estoqueFisico`, ∑`aEncomendar`(= `qtdVendida` − `estoqueFisico`, derivado — RN-224), `historico[]`(quantidade+data por transição).
Agregados ∑ só por Function, no onWrite de inscrito confirmado (depende de `inscritos.tamanhos` persistido). Ajuste manual de estoque continua fora de escopo (S205-T4).

### ➕ `eventos/{eventoId}/reembolsos/{reembolsoId}` (S904)
Máquina de estados de reembolso/cancelamento, por inscrito. Escrita de estado/financeiro **só por Function**.
Campos: `inscritoId→inscritos`, `motivo`, `estado`(`solicitado`→(`aprovado_auto`|`em_analise`)→`aprovado`|`recusado`→`estornado` | `bloqueado` — RN-341), `origem`(atleta/organizador/admin), `valorSolicitado`, `valorEstornado?`, `decididoPor?`, `transicoes[]`(auditoria append-only), `criadoEm`.
Reuso: o estorno reverte a inscrição para `cancelado` (RN-204) e reverte o split de afiliação (RN-337); `PaymentProvider.refund` (ADR-006). Notificação obrigatória ao organizador na abertura e ao atleta em cada transição (RN-342).

### ➕ `eventos/{eventoId}/transferencias/{transferenciaId}` (S904)
Troca de titularidade ou de ingresso, por inscrito (ADR-011). Escrita de estado/financeiro **só por Function**.
Campos: `tipo`(titularidade/ingresso), `inscritoId→inscritos`, `titularAnteriorRef`, `novoTitularDados`(CPF, dados da prova, tamanho e saúde se exigida), `diffCobrada?`(upgrade cobra a diferença pelo lote vigente — RN-344), `estado`, `criadoEm`.
Chip/kit (RN-345): se o kit não foi entregue, recoleta o tamanho do novo titular; o chip só é vinculado na entrega (RN-203), sem impacto retroativo. Se o kit já foi entregue, transferência bloqueada.

### ➕ `eventos/{eventoId}/inscritos/{inscritoId}/saude/{unico}` (S306, condicional)
Só existe quando o evento exige (`exigenciasSaude.atestado` ou `.parq`). Dado pessoal **sensível** (LGPD Art. 11).
Campos: `atestadoUrl?`, `parqRespostas?`, `consentimentoSaudeEm` (RN-146/147).
Rules restritas: leitura/escrita **só pelo owner do evento + admin**; **nunca** afiliado/patrocinador. Base legal = consentimento específico e destacado / tutela da saúde (Art. 11, II), não a base genérica de execução de contrato. Retenção limitada ao ciclo do evento + janela legal; expurgo programado após. Isolar em subcoleção própria facilita expurgo e regra de acesso.

### ➕ `eventos/{eventoId}/inscritos/{inscritoId}/notificacoes/{tipo}` (S1206)
Auditoria e idempotência de disparos transacionais (docId = tipo, ex.: `emailConfirmacao`).
Campos: `enviadoEm`, `provider?`, `messageId?`. Garante que o webhook reprocessado não reenvie o e-mail de confirmação (RN-219). Escrita só por Function.

---

## Agregados ∑ — mantidos por Cloud Functions (obrigatório)

| Agregado | Gatilho (Function) |
|---|---|
| `membros.status` | onWrite membro / cron diário (recalcula novo/inativo por data) |
| `clubes.qtdMembrosAtivos`, `qtdDesafiosAtivos` | onCreate/onDelete de membro/desafio |
| Progresso/pontos de desafio | onWrite de registro de ação (com bônus RN-115) |
| `parcerias.conversoes`, `valorAReceber` | onWrite de conversão / webhook de split de pagamento |
| `comunicados.alcance`, `aberturasPct` | no envio + webhooks de entrega/abertura |
| `segmento.tamanhoEstimado` | on-demand na composição do comunicado |
| `eventos.qtdInscritos`, `receitaConfirmada` | onWrite de inscrito / webhook de pagamento |
| `aprovisionamento.qtdVendida`, `aEncomendar` (por SKU) | onWrite de inscrito confirmado (Σ inscritos que exigem item×tamanho − estoque físico — RN-224) |

Padrão: distributed counters onde a escrita for concorrente e alta (inscrições em pico de venda).

---

## Security Rules (princípios)

- Profissional só lê/escreve clubes/eventos que possui (`ownerId == request.auth.uid`) ou onde é admin (via `permissoesAdmin` / custom claims).
- Atleta lê seu próprio doc + dados públicos (clube publico/indexavel, evento publicado).
- Agregados ∑ e campos financeiros: escrita **apenas via Function** (Admin SDK), nunca do cliente.
- `codigoConvite`, `programaAfiliacao`: leitura conforme visibilidade; escrita restrita ao owner/organizador.
- `pedidos`, `reembolsos`, `transferencias`, `aprovisionamento`: estado e campos financeiros **só via Function** (Admin SDK); leitura pelo owner do evento + envolvidos (responsável/inscrito do próprio pedido). `qrToken`, `kitEntregueEm`, `checkinEm`, `ingressoEmitidoEm`: escrita só por Function.
- `inscritos/{id}/saude`: dado **sensível** (LGPD Art. 11) — leitura/escrita só pelo owner do evento + admin; **nunca** afiliado/patrocinador.
- `politicaVendas`: escrita restrita ao owner do evento; leitura pública quando o evento é publicado.
- `tenants/{id}/portal`: leitura pública sob gate de `status`/`visibilidade`; escrita restrita ao tenant owner. `tenants/{id}/newsletterLeads`: escrita pública (submissão do form) só com consentimento; leitura restrita ao tenant.

---

## Nota sobre a decisão Firestore

O modelo relacional (Postgres) seria mais natural para os N:N e agregados. A escolha por Firestore (ADR-005) prioriza velocidade de MVP e integração Firebase; o preço é a disciplina acima (junções explícitas, agregados por Function, desnormalização marcada). Se a camada de relatórios/financeiro crescer, exportar para BigQuery — sem trocar o banco transacional.

---

## Coleções adicionadas pelos épicos (integrar à modelagem)

Estas coleções/campos foram introduzidos pelos specs por épico e devem ser considerados parte canônica do modelo. Todas seguem as mesmas regras: escrita de agregados/financeiro só via Function; Security Rules na task que cria; desnormalização marcada.

| Coleção / campo | Origem | Notas |
|---|---|---|
| `eventos/{id}/paginaVendas`, `lotes`, `cupons` | E04 | lote vira por data/qtd (RN-300); preço por percurso (RN-301) |
| `eventos/{id}/afiliados`, `programaAfiliacao` (write-side) | E04/E06 | termos espelhados read-only no clube (RN-121/122) |
| `eventos/{id}/equipe` | E04 | 4 papéis (RN-320) + custom claims por evento |
| `eventos/{id}/parceiros`, `campanhas`, `automacoes` | E06 | Marketing unificado; agregados ∑ por Function |
| `config/system` (singleton) | E07 | flag de manutenção; ler no boot (web + app) |
| `promotores/{id}` (+ `parcerias`) | E08 | onboarding do promotor fora de escopo (Icebox) |
| `eventos/{id}/pagamentos` (ledger, docId=`providerTxId`) · `profissionais/{id}/saldo` | E09 | dedupe idempotente; saldo consolida eventos+clubes |
| `profissionais/{id}/marcas` | E10 | modelo comercial financeiro/permuta (RN-123) |
| `profissionais/{id}/analytics/{periodo}` | E11 | snapshot por Function; export BigQuery atrás de flag |
| `atletas` escrevem: `registros`, `participantes`, `medalhas`, `inscricoes`, `clubes/{id}/feed`, `pushTokens` | E13 | app do atleta; agregados por Function |
| ➕ `pedidos/{id}` (top-level) | ADR-011 | pedido em grupo: 1 responsável + N inscritos; pagamento único; reembolso/titularidade por inscrito |
| ➕ `eventos/{id}/politicaVendas`, `reembolsos`, `transferencias` | E04/E09 (S305/S904) | política + máquina de estados de reembolso/troca; estado/financeiro só por Function |
| ➕ `eventos/{id}/aprovisionamento/{sku}` | E03 (S210) | encomenda→estoque por SKU; ∑ "a encomendar" por Function; ajuste manual segue fora |
| ➕ `eventos/{id}/inscritos/{id}/saude` (condicional) · `notificacoes` | E04/E12 (S306/S1206) | saúde = dado sensível LGPD Art. 11, Rules restritas; `notificacoes` = idempotência de e-mail |
| ➕ `tenants/{id}/portal`, `newsletterLeads` | E12 (S1208) | portal público sob a plataforma (não domínio próprio); newsletter com consentimento LGPD |
| ➕ `clubes/{id}/convites/{emailKey}` | E05 (S104-T1) | convite por email, docId = email lowercase; RN-106 (1–50, dedupe, reenvio idempotente); escrita só via Function `enviarConvites` |

**Registro de RNs novas:** E09 introduziu regras financeiras renumeradas para **RN-330–337** (taxa da plataforma, liberação de repasse, split, idempotência, saldo consolidado, estados de valor, ticket médio, reembolso) para não colidir com RN-320 (papéis de equipe, E04). E04 propôs a definição canônica dos 4 papéis de RN-320 — validar com product owner. **E09-slim (Onda 2)** canonizou **RN-347/348** e **RN-350–357** — ver seção "Repasse do organizador (E09-slim)" abaixo.

---

## Multi-tenancy (marketplace) — ver ADR-009

O modelo é **multi-tenant**: cada produtor/promotor é um `tenant`. Isolamento por `tenantId` + Security Rules; retrofit proibitivo.

- `tenants/{tenantId}` — perfil do produtor (nome, slug, status: pending/ativo/suspenso), `ownerUid`.
- `tenants/{tenantId}/commercialTerms/current` — `platformFeePct`, `installmentRules`, `anticipation`, `communityMonthlyEnabled`, `saasMonthlyFee` (pode 0) ➕ opcionais E09s (RN-348/350, decisão #4): `retencaoRepassePct` (0–100; ausente ⇒ default 15) e `disponibilizacaoDiasUteis` (int ≥ 0; ausente ⇒ default 2). Escrita só por `platform_admin`.
- ➕ `tenants/{tenantId}/portal` (S1208) — portal público **sob a plataforma** (não domínio próprio / white-label): blocos ativáveis e ordenáveis (`eventos`+`agenda`, `links de fotos`, `blog`, `patrocinadores`, `newsletter` — RN-152), `status`/`visibilidade` (gate de publicação; 404 se não publicado, reusa S1200 — RN-150), tema `theme="leela"`. Leitura pública SSR/ISR; escrita só pelo tenant owner.
- ➕ `tenants/{tenantId}/newsletterLeads/{leadId}` (S1208) — captura de newsletter: `email`, `consentimentoLgpd{ aceitoEm, finalidade }` (RN-151), `criadoEm`. Escopo por tenant.
- **Escopo por tenant** (todo agregado carrega `tenantId`): `eventos`, `clubes`, `inscritos`, `comunicados`, `parcerias`, `programaAfiliacao`, `pagamentos`, `equipe`, `promotores`, `subscriptions`.
- **Global:** `atletas` (identidade cross-tenant), `catalogoAcoes`, `config/system`.
- **Plataforma (super-admin):** agregados macro em `platform/rollups/*` (∑ por Function, cross-tenant: GMV total, receita Leela por tenant, nº tenants ativos).

### Repasse do organizador (E09-slim · E09s-L1, tipos em `packages/core/src/finance/repasse-types.ts`)

Fluxo de saque do produtor SEM afiliação, SEM reembolso (S904 vive em E04-S305) e SEM painel rico. Coleções **tenant-scoped** (decisão #1 do consolidador — isolamento cross-tenant herda `isTenantMember`; diverge do `profissionais/{profId}/saldo` da spec E09 completa, reconciliar antes da Onda 3). Fonte do vendido/líquido = `eventos/{id}/financeiro/current` (E03-S207, shape `FinanceiroEvento` — E09s **lê**, nunca reconstrói).

- ➕ `tenants/{tid}/dadosBancarios/current` — versão **MASCARADA**, a única legível pelo cliente (RN-354): `banco`, `agencia`, `contaMascarada` (`****1234`), `tipo` (corrente|poupanca), `pixMascarado|null`, `titular`, `cpfCnpjMascarado`, `criadoEm`, `atualizadoEm`. Leitura: `tenant_owner` do próprio tenant + `platform_admin`. Escrita: **só Function** `saveDadosBancarios` (RN-357), que mascara server-side e preserva `criadoEm` em reenvio.
- ➕ `tenants/{tid}/dadosBancariosSecret/current` — blob **CIFRADO** do número de conta/PIX em claro (RN-354): `algoritmo: 'aes-256-gcm'`, `ciphertext`, `iv`, `authTag`, `keyVersion`, `atualizadoEm`. **`read: false` e `write: false` para TODO cliente — inclusive `tenant_owner` e `platform_admin` via client SDK; escrita só Admin SDK (Function).** Leitura admin passa pelo callable auditado `getBankDetailsForPayout` (L2-T5, decisão #8 — acesso registrado: quem/quando/qual repasse). Cifra: AES-256-GCM com chave no Secret Manager (decisão #5; ADR curto antes de L2-T2; KMS pós-V1).
- ➕ `tenants/{tid}/repasses/{repasseId}` — solicitação de saque: `valor`, `estado` ∈ {`solicitado`,`aprovado`,`recusado`,`pago`,`cancelado`} (union fechada `EstadoRepasse` — RN-353; `cancelado` = decisão #11, só owner e só enquanto `solicitado`), `dadosBancariosSnapshot` (mascarado, congelado na solicitação), `comprovanteNumero?` (só `pago` — RN-355), `transicoes[]` **append-only** (de→para/quando/quem/papel — auditoria), `criadoEm`, `atualizadoEm`. Escrita **só Function** (RN-357). Máquina: `solicitado→{aprovado,recusado,cancelado}`, `aprovado→pago`, resto rejeita; recusa **e** cancelamento devolvem o valor ao disponível no recompute.
- ➕ `tenants/{tid}/saldo/current` — ∑ **consolidado** do tenant (decisão #2), recomputado integralmente pela Function `updateSaldoRepasse` (L2-T1) via `computeSaldoRepasse` (core): `vendidoBruto`, `retido`, `disponivel` (**nunca negativo** — RN-351), `comprometido` (Σ repasses em {solicitado,aprovado,pago}), `dentroJanelaDN` (RN-348), `eventosSemTermo`, `atualizadoEm`. Cliente lê os 3 cards SÓ daqui; escrita de cliente **NEGADA** (RN-357).

**Regras canonizadas (consolidador 2026-07-05):**
- **RN-347** — modo da taxa no líquido do produtor: `incorporada` (líquido = face − taxa, reusa `computeReceitaLiquida` — RN-406) | `repassada` (líquido = face). Parâmetro **explícito** do core (`computeLiquidoProdutor`); default `incorporada` até o toggle E04 existir.
- **RN-348** — disponibilização **D+N dias úteis** (default **2**) + retenção % (default **15**) **por tenant** em `commercialTerms/current` (campos opcionais `disponibilizacaoDiasUteis`/`retencaoRepassePct`; defaults globais em `platform/config` + constantes do core). Fundos com < N dias úteis desde a transação **não** entram em `disponivel` (`saldo.dentroJanelaDN`). ⚠️ Pendência L2-T1: a fonte agregada por evento não tem granularidade por transação — até integrá-la, a Function grava `dentroJanelaDN: 0` (a derivação pura `computeDentroJanelaDN` já existe; **não fabricar dado**). Dias úteis = seg–sex no fuso do produto (`FUSO_EVENTO`); feriados fora da V1.
- **RN-350** — retenção pós-evento: **15% default** (config por tenant) sobre o **líquido** do produtor (decisão #3), liberada quando `evento.status === 'encerrado'` (cron `encerrarEventos` L2-T6 — encerramento automático por data; o organizador **não** encerra o próprio evento: a retenção é contingência anti-fraude).
- **RN-351** — `disponivel = Σ liberadoPorEvento − Σ comprometido − dentroJanelaDN`, clamp em 0; `liberadoPorEvento = encerrado ? líquido : líquido×(1−pct)`. Evento com `receitaLiquida === null` (tenant sem termo — decisão #7) não contribui e **bloqueia** solicitação de repasse até existir termo.
- **RN-352** — solicitação válida: `0 < valor ≤ disponivel` (cent-exato); o servidor relê `disponivel` e valida transacionalmente (L2-T3).
- **RN-353** — máquina do repasse (acima) com `transicoes[]` append-only.
- **RN-354** — dados bancários LGPD: número cifrado Function-only + `read:false` até para o owner; cliente lê **só** o mascarado; **nunca** cross-tenant.
- **RN-355** — comprovante numerado: sequência **gapless por tenant** (contador transacional L2-T4); formato determinístico `REP-{ano}-{seq:0000}` (`formatarNumeroComprovante`); PDF = V1.1 (decisão #9).
- **RN-356** — "pago" é **registro manual mock** (sem transferência bancária real); UI explícita.
- **RN-357** — escrita de repasse/saldo/dados bancários **exclusiva de Function** — write de cliente NEGADO nas Rules para as 4 coleções.

### Recorrência / assinaturas
- `tenants/{id}/subscriptions/{subId}` — mensalidade da **comunidade** (tenant → membro; destrava clube pago, RN-104). Campos: `atletaId`, `clubeId`, `valor`, `status`(ativa/inadimplente/cancelada), `proximaCobranca`.
- Mensalidade **SaaS** (Leela → tenant) derivada de `commercialTerms.saasMonthlyFee`; cobrança/ledger em `platform/billing/{tenantId}`.
- Ambas via `PaymentProvider` com suporte a **assinatura + split** (impacta ADR-006).

### Auth / papéis (custom claims)
`role` ∈ {`platform_admin`, `tenant_owner`, `tenant_staff`, `promoter`, `athlete`} + `tenantId`. Security Rules: dado tenant-scoped só acessível por membros do tenant (claim `tenantId` bate) ou `platform_admin`; `atletas` lê o próprio doc.

---

*Fim do modelo de dados Firestore.*
