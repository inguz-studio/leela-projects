# LEELA-E04 · Configuração e Vendas do Evento

- **Superfície:** Painel
- **Horizonte:** H1 (Onda 2 · Vendas ponta a ponta)
- **MoSCoW:** Must
- **Estimativa:** XL
- **Status:** 📋 Backlog (especificado; código a fazer)
- **Depende de:** LEELA-E03 (Operação do Evento · entidades Evento/Inscrito/Kit + layout do evento), LEELA-E12 (Landing/checkout consome a página de vendas), **PaymentProvider** (interface ADR-006)
- **De-para:** BH-E04 (Configuração e Vendas · EP-02b)

> **Nota de domínio (obrigatória).** Os mocks de HANDOFF-05 e o protótipo usam `be-hero.com.br` e `beh.ro` (ex.: `be-hero.com.br/meia-maratona-floripa-2026`, `beh.ro/mfl26?c=cps`). O produto é **Leela**. Toda URL pública, link master e slug devem usar o **domínio Leela (a definir)** — representado nos specs pelo placeholder `{DOMINIO_LEELA}`. **Nunca fixar `be-hero.com.br`/`beh.ro` no código**; a substituição do domínio é ponto pendente até a definição do domínio Leela.

## Objetivo

Dar ao Organizador de Evento o controle de configuração e monetização do evento: montar a página pública de vendas (seções web/app, lotes com virada automática, preço por percurso, cupons, SEO), operar o programa de afiliação (definir comissão, convidar clubes e promotores, distribuir link master rastreável), ler o financeiro com repasses e configurar dados gerais, equipe e permissões. É a metade "vender e configurar" do Painel do Profissional: onde o E03 opera o evento ao vivo, o E04 abastece o funil de vendas e o repasse financeiro que sustentam o lock-in financeiro (afiliação clube↔organizador).

O valor entregue é fechar o ciclo "atleta descobre → inscreve → paga → organizador vê receita e repassa ao afiliado" com os mocks canônicos da Meia Maratona Floripa 2026 (453 inscritos, R$ 85.617, comissão 10% para o Corrida Perfeita Sul). A camada de pagamento é programada contra a interface **`PaymentProvider`** (ADR-006), nunca contra um gateway concreto; o split de afiliação usa `PaymentProvider.splitRules` e os webhooks são idempotentes.

## Personas & JTBD

- **Primária — Organizador de Evento (Marina Castelo · Castelo Produções).** JTBD: "Maximizar a conversão de visitante em inscrito", "Vender por lotes com virada automática sem controlar preço na mão", "Rastrear e remunerar quem traz vendas sem controlar em planilha", "Controlar margem e pagamentos com repasse aos afiliados", "Controlar quem acessa e como o evento opera".
- **Secundária — Promotor (Dioney Galharte · independente).** JTBD: "Divulgar o evento com link rastreável e receber comissão pelo que converto".
- **Secundária — Clube afiliado (Corrida Perfeita Sul · Felipe Martins).** JTBD: "Aceitar ou recusar a parceria de divulgação com os termos que o organizador definiu" (comissão é read-only do lado do clube — RN-120).

## Critérios de sucesso do épico

- Organizador monta a página de vendas com lotes (virada por data ou quantidade — RN-300) e preço independente por percurso (RN-301), publica e vê a landing consumir a configuração.
- Cupons de desconto criados e aplicáveis no checkout; "Promovido por" descartado (RN-302).
- Programa de afiliação configurado pelo organizador (comissão, janela, teto, cupom — RN-310/311/312); clube só aceita/recusa (RN-120); promotor individual e clube são tipos de afiliado (RN-312).
- Link master rastreável atribui conversão dentro da janela; split de afiliação executado por `PaymentProvider.splitRules` com webhook idempotente.
- Financeiro legível (bruto/taxa/líquido, breakdown, repasses por afiliado) e exportável — consolidado com LEELA-S207.
- Configurações gerais + equipe com 4 papéis de permissão (RN-320) operando por custom claims.
- Fluxo demonstrável ponta a ponta com os mocks de HANDOFF-05, sem inventar dados e sem fixar o domínio `be-hero.com.br`.

## Regras de negócio aplicáveis

- **RN-300** — Lote vira automaticamente por data **ou** por quantidade vendida (o que ocorrer primeiro).
- **RN-301** — Cada percurso (modalidade) tem preço independente.
- **RN-302** — Seção "Promovido por" descartada (decisão registrada) — não implementar.
- **RN-304** (Vitor 2026-07-17) — **Capacidade de lote editável pelo organizador.** O painel mostra, por lote, `configurado` (capacidade), `vendido` (∑) e `disponível` (= `configurado` − `vendido`). O organizador pode **AUMENTAR** a capacidade (reabre vagas) e salvar; **DIMINUIR abaixo do já vendido é proibido** (fail-closed). O **ratchet automático permanece** — cancelamento não devolve vaga sozinho (par de RN-300 / S300-T2); só o organizador reabre subindo a capacidade. Escrita da capacidade **apenas via Function** (nunca write direto do cliente), com **trilha de auditoria** (quem alterou, quando, de/para).
- **RN-310** — **O organizador define a comissão** de afiliação (espelha, do outro lado, RN-120 do clube).
- **RN-311** — O programa de afiliação define %, janela de atribuição, teto (mensal) e cupom.
- **RN-312** — Clube e promotor individual são os dois tipos de afiliado.
- **RN-320** — Evento tem modelo de permissões com **4 papéis**.
- **RN-120** (contexto/clube) — Comissão é **read-only** para o clube; o clube só aceita ou recusa a parceria.
- **RN-121/RN-122** (contexto/clube) — Termos do programa são espelhados read-only na parceria do clube.
- **RN-125/RN-311** (atribuição) — Link master atribui a conversão dentro da janela de atribuição.
- **RN-200** (herdada de E03) — Após a 1ª venda, edição de preço (evento/kit/lote) é bloqueada.
- **RN-201** (herdada de E03) — Publicar gera URL pública (`{DOMINIO_LEELA}/{slug}`) + QR.
- **RN-216** (herdada de E03) — "kit" nunca "tier" em toda a nomenclatura.
- **RN-338** (S305) — Janela de arrependimento: reembolso integral automático em até 7 dias corridos da compra, desde que faltem mais de 48h para o evento (CDC Art. 49).
- **RN-339** (S305) — Corte de 48h: solicitações a menos de 48h do evento são bloqueadas por padrão, salvo override explícito e registrado do organizador. **➕ ESTORNO-ADMIN (decisão 44 · RN-376, canônica em E09):** o `platform_admin` pode FURAR o corte, sempre com motivo obrigatório gravado no doc do reembolso (`overrideCorte`/`motivoOverride`/`overridePor`) e trilha `plataforma`; organizador que mandar a flag leva permission-denied. A execução vive na porta única `requestRefund` (RN-375).
- **RN-340** (S305) — Fora da janela de arrependimento e antes do corte: reembolso depende de decisão do organizador (em análise → aprovado/recusado), dentro de um SLA configurável. **➕ ESTORNO-ADMIN (decisões 42/43):** dentro da política a rota é AUTOMÁTICA (sem humano) e a taxa repassada VOLTA; em análise a taxa fica RETIDA (RN-373/374, canônicas em E09); a fila cross-tenant do admin decide o que ficou em análise.
- **RN-343** (S305) — Troca de titularidade habilitada por flag do evento; janela default 72h; taxa de transferência configurável (default 0).
- **RN-344** (S305) — Troca de ingresso (mesmo titular): diferença cobrada no upgrade pelo lote vigente (RN-200/301); sem reembolso no downgrade salvo política; janela até 48h.
- **RN-146** (S306) — Dados de saúde plenos (atestado/PAR-Q) são opcionais, ativados por flag do evento; nunca coletados por padrão (minimização LGPD).
- **RN-147** (S306) — Dado de saúde é dado pessoal sensível (LGPD Art. 11): base legal = consentimento específico e destacado ou tutela da saúde/proteção da vida; acesso restrito ao owner do evento + admin (nunca afiliado/patrocinador); retenção limitada ao ciclo do evento + janela legal, com expurgo programado após.
- **RN-156 (nova · DEC-0719, Vitor 2026-07-19, D-7)** — **Termo de saúde BASE da plataforma é sempre presente e obrigatório no checkout** (deixa de ser condicional a flag). Verbatim: *"é um termo base que teremos, mas deixamos também o organizador ter os seus, para personalizar, caso deseje."* **Reconciliação com RN-146/147:** a flag `exigenciasSaude` do organizador deixa de "ligar o termo" e passa a **ADICIONAR** um termo/exigência custom do organizador **por cima** do termo base. Os **dados plenos de saúde** (atestado/PAR-Q — dado sensível LGPD Art. 11) **continuam condicionais** à flag e isolados na subcoleção `saude` (RN-146/147 intactas nessa parte). O aceite do termo base é versionado (RN-149) e carimbado em `pedidos/{id}.aceites.saude` (CHECKOUT-MODELO). A **superfície de coleta** (checkout) e o flip de obrigatoriedade são **lote de código** (fila `saúde-termo-base`, executado em E12); aqui em E04 fica a regra e a semântica nova da flag.
  - **STATUS BACKEND (CHECKOUT2-MODELO · 2026-07-19, `52dcc0d`):** modelo do termo custom aditivo PAGO (sem tela). Termo base já era incondicional (F-4a do CKFORM). O termo CUSTOM do organizador vive em **`eventos/{e}/termoSaude/config`** (core `termoSaude.ts`; texto `''` = inativo, flag ignorada) + trigger **`versionarTermoSaude`** (bump material por hash, monotônico, padrão RN-149) + **fence in-tx** no `createInscricaoCharge` (termo ativo ⇒ `aceites.saudeCustom` obrigatório, prova versão+hash carimbada pelo servidor; `failed-precondition` sem escrita se ausente) + Rules (owner-only, versão/hash congelados, delete nunca) + leitor público `termoSaudeCustom {texto, versao}|null`. Os dados plenos de saúde (RN-146/147) seguem intocados/condicionais. Prova: `ck2Rules` 8/8 + `checkout2Modelo.integration` (fence). A superfície de COLETA na tela é o lote `CHECKOUT2-FORM`.
- **RN-175 (nova · DEC-0719-ret, Vitor 2026-07-19) · Toggle POR EVENTO "aceitar inscrição de estrangeiros" (default OFF).** O organizador liga/desliga, por evento, a aceitação de inscritos estrangeiros sem CPF (mesmo padrão de habilitação prévia que Doity e Sympla usam — não vem ligado por padrão). Com o toggle **OFF** (default), o checkout segue exigindo CPF (RN-173) — nada muda. Com o toggle **ON**, o checkout de estrangeiro (RN-176, E12) fica disponível: nacionalidade → passaporte, CPF oculto, pagamento só por cartão internacional à vista; e o registry de pessoas passa a aceitar documento tipado (RN-177, E19). Verbatim do Vitor: *"pesquisei na sympla, o produtor pode habilitar a compra para estrangeiros, mas somente mediante passaporte, nesse caso a compra pode passar via cartao internacional, Mas o asaas permite isso. acredito que seja no modelo doity"*. **GATED por ação externa:** o toggle só produz efeito de produção depois da **liberação da conta Asaas para pagador estrangeiro** (contato com gerente de contas, ~6 dias úteis — ação do Vitor registrada em DECISOES-ABERTAS §Ações externas). A flag do evento (`aceitaEstrangeiros`, default `false`) e a UI de configuração são **lote de código GATED** (fila `ESTRANGEIRO-CHECKOUT`); aqui em E04 fica a regra e a semântica da flag. Fonte de fatos: `outputs/leela-build-2d6ee98d/ESTRANGEIRO-PAGAMENTO-REPORT.md`.
  - **Nota E04↔E09 (reembolso de cartão internacional):** a cobrança avulsa liberada do Asaas para estrangeiro é **cartão internacional à vista** (sem parcelamento, sem link de pagamento). A execução de reembolso/estorno desse método (E09-S904, `PaymentProvider.refund`) herda as restrições do caminho Asaas liberado e a política de taxa de serviço vigente (item 23, pendente-de-confirmação do BENCHMARK-REEMBOLSO). Nota de rastreabilidade registrada; sem RN nova de reembolso nesta rodada — a spec do estorno internacional é cobrada junto do lote `ESTRANGEIRO-CHECKOUT` quando a liberação Asaas sair.
- **RN-149** (S306) — Versionamento do regulamento: nova versão exige novo aceite dos inscritos futuros; inscritos antigos mantêm o registro da versão que aceitaram.
- **ADR-011** (contexto/pedido em grupo) — Reembolso, cancelamento e titularidade operam **por inscrito** dentro do pedido em grupo; a política incide sobre o inscrito individual, não sobre o pedido inteiro (ver [[ADR-pedido-em-grupo]]).

## Regras de design aplicáveis

- **§2.1** header do evento 96px · **§2.14** sub-nav do evento (underline Brasa 2px + contador pill) — reutiliza o layout de LEELA-S202-T1.
- **§2.5** Table densa (linha 64px, header uppercase) — listas de promotores, cupons, lotes, financeiro/repasses.
- **§2.7** Tabs internas todas no DOM.
- **§2.12** interativo por padrão — estados vazio/erro/carregando (skeleton, nunca spinner solto), feedback via Toast.
- **§2.15** `ConfirmModal` com preview de consequências (perde/mantém) — ações destrutivas: despublicar página, remover cupom, desativar/remover afiliado, remover membro da equipe.
- **§2.16** flat, sem borda decorativa; exceção de card crítico (border-left Vulcão) para alertas.

## Modelo de dados tocado

Ver `modelo-de-dados-firestore.md`. Coleções afetadas (E04 cria as marcadas com ➕; as demais são lidas/estendidas):

- `eventos/{eventoId}` — lido (slug, status, `usaChip`, agregados ∑ `qtdInscritos`, `receitaConfirmada`); estende com bloqueio de preço (RN-200) e URL/QR (RN-201) de E03.
- `eventos/{eventoId}/kits/{kitId}` — lido para a seção "Kit do atleta" da página (E03/S205).
- ➕ `eventos/{eventoId}/paginaVendas/{unico}` — configuração de conteúdo da página: `secoes[]` (id, tipo, `canal` web|app|ambos, `ativo`, `ordem`, conteúdo), `seo` (`titulo`, `metaDescricao`, `urlAmigavel`, `ogImageUrl`), `status` (rascunho/publicada), `atualizadoEm`.
- ➕ `eventos/{eventoId}/lotes/{loteId}` — `nome`, `ordem`, `criterioVirada` (data|quantidade), `dataVirada?`, `qtdLimite?`, `qtdVendida` (∑), `precosPorPercurso` (map `modalidade→preco`), `status` (agendado/ativo/encerrado). Virada mantida por Function (RN-300). `qtdLimite` (capacidade) é **ajustável só-para-cima** via Function (RN-304, S307 — reabre vagas; reduzir abaixo de `qtdVendida` é negado).
- ➕ `eventos/{eventoId}/cupons/{cupomId}` — `codigo` (único no evento), `tipoDesconto` (percentual|valor), `valor`, `usosMax?`, `usosFeitos` (∑), `validadeAte?`, `status` (ativo/inativo).
- ➕ `eventos/{eventoId}/programaAfiliacao/{unico}` — `comissaoPct`, `janelaAtribuicaoDias`, `tetoMensal?`, `cupomPadrao?`, `criterioLiberacao`, `prazoRepasseDiasUteis` (RN-310/311). Termos espelhados read-only para clubes (RN-121/122).
- ➕ `eventos/{eventoId}/afiliados/{afiliadoId}` — `tipo` (clube|promotor — RN-312), `nome` 🔁, `status` (convidado/ativo/inativo), `linkMaster`, `cupom?`, ∑`cliquesUnicos`, ∑`conversoes`, ∑`valorAReceber`, `janelaAtribuicaoDias` 🔁. Espelha `clubes/{id}/parcerias` do lado do organizador.
- ➕ `eventos/{eventoId}/equipe/{membroId}` — `profId→profissionais` 🔁`nome`, `papel` (RN-320), `convidadoEm`, `status`. Papéis também refletidos em custom claims por evento.
- Agregados financeiros do evento — estende `LEELA-S207-T2` (`agregarFinanceiro`) com `valorAReceber` por afiliado e status de repasse.
- ➕ `eventos/{eventoId}/politicaVendas/{unico}` — doc único de política de vendas: `reembolso` (`janelaArrependimentoDias:7`, `corteHoras:48`, `slaAnaliseDias`), `transferencia` (`habilitada`, `janelaHoras:72`, `taxa:0`), `trocaIngresso` (`habilitada`, `janelaHoras:48`, `permiteReembolsoDowngrade:false`), `atualizadoEm`. Escrita **só pelo owner** do evento (RN-338..344). A **execução** (máquina de estados/estorno) fica em E09-S904.
  - ➕ **CKMOD (2026-07-19) — versão vigente ENTREGUE (paralelo RN-149):** a política ganhou `versao` (monotônica), `versaoAtualizadaEm` e `politicaTextoHash` — **escrita exclusiva do trigger `versionarPoliticaVendas`** (bump só em mudança MATERIAL dos 3 blocos; Rules congelam os 3 campos p/ cliente, inclusive delete de campo). Sem doc/doc legado ⇒ **vigente = 1** (defaults legais CDC Art. 49 — a política sempre vige). O checkout carimba a versão aceita em `pedidos/{id}.aceites.termos` (in-tx); o leitor público da landing projeta a política + versão p/ o modal dos termos (E12).
- `eventos/{eventoId}` — estende com `exigenciasSaude` (`atestado:bool`, `parq:bool` — flags, default `false`, minimização LGPD RN-146), `regulamentoVersao`, `regulamentoUrl` (upload já existe em E03-S201) e `regulamentoAtualizadoEm` (RN-149).
- ➕ subcoleção **condicional** `eventos/{eventoId}/inscritos/{inscritoId}/saude/{unico}` (só quando `exigenciasSaude` ativa) — `atestadoUrl?`, `parqRespostas?`, `consentimentoSaudeEm`. **Security Rules restritas:** leitura/escrita só do owner do evento + admin; **afiliado e patrocinador sempre negados**. **Nota LGPD Art. 11** (dado sensível): base legal = consentimento específico e destacado ou tutela da saúde/proteção da vida (nunca "execução de contrato"); minimização (só quando o evento exige); retenção limitada ao ciclo do evento + janela legal, com expurgo programado após. Isolar em subcoleção própria facilita expurgo e regra de acesso.

**Padrão obrigatório:** todo agregado ∑ (`qtdVendida`, `usosFeitos`, `conversoes`, `valorAReceber`, receita) é mantido por Cloud Function; nunca calculado no cliente. Toda coleção nova cria Security Rules na mesma task. Campos financeiros e de split: escrita **apenas via Function** (Admin SDK).

## Fora de escopo (Won't nesta fase)

- Checkout e inscrição pública / renderização da landing → **LEELA-E12** (E04 só produz a configuração que a landing consome).
- Gateway de pagamento concreto (Pagar.me/Asaas/Stripe Connect) → **ADR-006 posterior**; aqui só a interface `PaymentProvider` + provider mock/sandbox.
- Comunicação/marketing do evento (push/email segmentado) → **LEELA-E06** (Marketing Unificado). LEELA-S303 fica como casca de rastreabilidade, redirecionando para E06.
- Painel do Influenciador (visão do promotor logado) → **LEELA-E08** (icebox).
- Seção "Promovido por" na página de vendas → descartada (RN-302).
- Migração da sub-nav 9→8 tabs (Comunicação + Promotores → Marketing) → **LEELA-E06** (RN-002).
- Reembolso pelo organizador — a **política** de reembolso/cancelamento/transferência (janelas, corte de 48h, SLA, flags, taxa) **entra nesta fase** via **LEELA-S305** (config). A **execução** (máquina de estados, fila de análise do organizador, estorno via `PaymentProvider.refund`, notificações) fica em **LEELA-E09-S904**. Só a configuração vive em E04; a operação/fila roda em E09.

---

## User stories

### LEELA-S300 · Página de vendas (seções, lotes, percursos, cupons, SEO) · (de-para BH-300)

**Como** Organizador de Evento, **quero** configurar a página pública de vendas do evento (seções web/app, lotes, percursos, cupons, SEO), **para** maximizar a conversão de visitante em inscrito.

- **MoSCoW:** Must · **Estimativa:** XL · **Superfície:** Painel
- **Tela(s) de referência:** `WEB-APPV2 (1)/PaginaVendas-Conteudo.html`, `Pagina-Vendas-Modal-Lote.html`, `Pagina-Vendas-Modal-Cupom.html`, `Pagina-Vendas-Modal-Percurso.html`
- **RNs:** RN-300, RN-301, RN-302, RN-200 (bloqueio de preço), RN-201, §2.5, §2.12, §2.15, §2.16

**Critérios de aceite (Given/When/Then):**
- **Dado** o editor de conteúdo, **quando** abro, **então** vejo as seções agrupadas por canal — Essenciais (web + app: Capa, Modalidades, Kit do atleta, Retirada de kits, Informações gerais), Só landing pública (Percurso detalhado, Patrocinadores, Depoimentos) e a seção de sistema Checkout (bloqueada, controlada pelo sistema).
- **Dado** uma seção não travada, **quando** alterno o toggle, **então** ela ativa/desativa com feedback e a seção "Checkout" permanece sempre travada.
- **Dado** um lote, **quando** configuro virada por data ou por quantidade, **então** o lote vira automaticamente pelo critério que ocorrer primeiro (RN-300).
- **Dado** um percurso (5k/10k/21k), **quando** defino o preço, **então** cada percurso tem preço independente (RN-301) e o preço fica bloqueado após a 1ª venda (RN-200).
- **Dado** um cupom, **quando** crio com código, tipo e valor, **então** ele fica disponível para o checkout; código duplicado no evento é rejeitado.
- **Dado** o card de SEO, **quando** edito título, meta descrição e og:image, **então** salvo; a URL amigável é read-only e usa `{DOMINIO_LEELA}` (nunca `be-hero.com.br`).
- **Dado** a página, **quando** publico/despublico, **então** vejo estado de publicação e Toast; despublicar passa por `ConfirmModal` (§2.15).

**Tasks:** LEELA-S300-T1, LEELA-S300-T2, LEELA-S300-T3, LEELA-S300-T4, LEELA-S300-T5, LEELA-S300-T6

#### LEELA-S300-T1 · Modelo `paginaVendas` + `lotes` + `cupons` + tipos + Rules + seed

- **Tipo:** data-model · **Depende de:** E03-S200-T1 (Evento), E03-S205-T1 (Kits) · **Bloqueia:** S300-T2..T6 · **Estimativa:** M

**Objetivo**
Modelar em `core` os tipos da configuração da página (seções + SEO), dos lotes e dos cupons; criar as subcoleções com Security Rules e o seed canônico da Meia Floripa.

**Contexto & referências**
- RNs: RN-300, RN-301, RN-302.
- Modelo: `eventos/{id}/paginaVendas/{unico}`, `eventos/{id}/lotes/{loteId}`, `eventos/{id}/cupons/{cupomId}`.
- Mocks: Meia Floripa — modalidades 5k/10k/21k, "a partir de R$ 99"; cupons `CORRIDAPERFEITA10` (−10%) e `AMIGOCPS`; SEO título "Meia Maratona Floripa 2026 · Inscrições abertas", URL `{DOMINIO_LEELA}/meia-maratona-floripa-2026` (mock usa `be-hero.com.br` — trocar), og-image 1200×630.
- Seções canônicas (do protótipo): Essenciais (Capa, Modalidades, Kit do atleta, Retirada de kits, Informações gerais) · Só web (Percurso detalhado, Patrocinadores, Depoimentos) · Sistema (Checkout, travada).

**Arquivos (criar/editar)**
- `packages/core/src/eventos/paginaVendas.ts` — `type SecaoPagina`, `type CanalSecao`, `type SeoPagina`, `type PaginaVendas`.
- `packages/core/src/eventos/lote.ts` — `type Lote`, `type CriterioVirada`.
- `packages/core/src/eventos/cupom.ts` — `type Cupom`, `type TipoDesconto`.
- `packages/api-client/src/eventos/paginaVendas.ts` — leitura/escrita da config, lotes e cupons.
- `functions/firestore.rules` — Rules de `paginaVendas`/`lotes`/`cupons` (owner do evento; agregados só por Function).
- `functions/seed/paginaVendas.seed.ts` — seed com seções, 2 lotes e cupons canônicos.

**Passos de implementação**
1. `type CanalSecao = 'web'|'app'|'ambos'`; `type SecaoPagina = { id; tipo; titulo; canal: CanalSecao; ativo: boolean; ordem: number; conteudo: object }`; a seção `checkout` é `tipo:'sistema'` e `travada:true`.
2. `type CriterioVirada = 'data'|'quantidade'`; `type Lote = { id; nome; ordem; criterioVirada; dataVirada?; qtdLimite?; qtdVendida; precosPorPercurso: Record<string, number>; status }` (RN-300/301).
3. `type TipoDesconto = 'percentual'|'valor'`; `type Cupom = { id; codigo; tipoDesconto; valor; usosMax?; usosFeitos; validadeAte?; status }`.
4. `type SeoPagina = { titulo; metaDescricao; urlAmigavel; ogImageUrl }` — `urlAmigavel` derivada de `{DOMINIO_LEELA}/{slug}` (sem hardcode de domínio).
5. Rules: só o organizador do evento lê/escreve; `qtdVendida`/`usosFeitos` só por Function.
6. Seed com seções canônicas, 2 lotes (early bird até 31 Mar + regular) e cupons `CORRIDAPERFEITA10`/`AMIGOCPS`.

**Modelo de dados / contratos**
- `paginaVendas/{unico}` (doc único por evento), `lotes/{loteId}`, `cupons/{cupomId}`.
- `codigo` de cupom único por evento (validado na escrita).

**Regras de negócio a respeitar**
- RN-300 (dois critérios de virada), RN-301 (preço por percurso), RN-302 (sem "Promovido por"); agregados só por Function.

**Critérios de aceite (testáveis)**
- **Dado** um lote com `precosPorPercurso`, **quando** consulto, **então** cada modalidade tem preço próprio (RN-301).
- **Dado** um cupom com `codigo` já existente no evento, **quando** salvo outro igual, **então** a escrita é rejeitada.
- **Dado** um cliente tentando escrever `qtdVendida`/`usosFeitos`, **quando** persiste, **então** a Rule nega.

**Testes a escrever**
- unit: tipos/derivações (`core`); validação de código único de cupom.
- integração: Rules (emulator) — leitura por owner; escrita de agregado negada ao cliente.

**Definition of Done**
- [ ] Critérios de aceite passam · [ ] Rules cobrindo as 3 coleções · [ ] Domínio via `{DOMINIO_LEELA}` (sem `be-hero.com.br`) · [ ] Testes verdes · [ ] Lint + type-check limpos · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Função de virada de lote (T2); UI (T3..T6).

#### LEELA-S300-T2 · Function de virada de lote (RN-300) + preço vigente por percurso (RN-301)

- **Tipo:** api/function · **Depende de:** S300-T1, E03-S201-T3 (bloqueio de preço) · **Bloqueia:** S300-T3, S300-T4 · **Estimativa:** M

**Objetivo**
Manter o lote vigente e o preço corrente por percurso via Cloud Function: virar o lote automaticamente por data ou por quantidade (o que ocorrer primeiro — RN-300) e expor o preço vigente por modalidade (RN-301), respeitando o bloqueio de preço pós-venda (RN-200).

**Contexto & referências**
- RNs: RN-300, RN-301, RN-200.
- Modelo: `lotes/{loteId}` (`criterioVirada`, `dataVirada`, `qtdLimite`, `qtdVendida`, `status`).

**Arquivos (criar/editar)**
- `functions/src/eventos/virarLote.ts` — cron (data) + onWrite de inscrito confirmado (quantidade).
- `packages/core/src/eventos/precoVigente.ts` — `loteVigente(lotes, agora, vendas)` e `precoDoPercurso(lote, modalidade)` (puros).
- `functions/src/eventos/guardPrecoLote.ts` — nega edição de preço de lote quando há venda (RN-200).

**Passos de implementação**
1. `loteVigente`: primeiro lote `ativo` cujo critério ainda não estourou; puro e testável.
2. Function agenda virada por `dataVirada` (cron) e reavalia por `qtdVendida >= qtdLimite` no onWrite de inscrito confirmado; encerra o lote e ativa o próximo por `ordem`.
3. `precoDoPercurso` retorna o preço do percurso no lote vigente (RN-301).
4. Guard de servidor rejeita mudança de preço de lote quando o evento já tem venda (RN-200).

**Modelo de dados / contratos**
- `virarLote(eventoId)` idempotente; `precoVigente` derivado por `core`.

**Regras de negócio a respeitar**
- RN-300 (data OU quantidade), RN-301 (preço por percurso), RN-200 (bloqueio).

**Critérios de aceite (testáveis)**
- **Dado** um lote com `qtdLimite=100`, **quando** a 100ª venda confirma, **então** o lote encerra e o próximo ativa (RN-300).
- **Dado** um lote com `dataVirada` no passado, **quando** o cron roda, **então** o lote encerra.
- **Dado** um evento com venda, **quando** tento editar o preço do lote, **então** o servidor rejeita (RN-200).

**Testes a escrever**
- unit: `loteVigente`/`precoDoPercurso` (limites de data e quantidade).
- integração: virada por quantidade (emulator); guard de preço.

**Definition of Done**
- [ ] Virada idempotente por data e quantidade · [ ] Preço por percurso (RN-301) · [ ] Guard RN-200 no servidor · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Aplicação do cupom no checkout (E12); UI de lote (T4).

#### LEELA-S300-T3 · Tela editor de conteúdo da página (seções web/app + SEO + publicar) [`PaginaVendas-Conteudo.html`]

- **Tipo:** screen · **Depende de:** S300-T1, E03-S202-T1 (layout/sub-nav do evento), E01-S001-3 (Toggle, Card, Modal) · **Estimativa:** L

**Objetivo**
Renderizar o editor de conteúdo da página de vendas: sub-sub-nav (Conteúdo | Configuração | Preview), lista de seções agrupadas por canal com toggle e "Editar", seção Checkout travada, card de SEO e ações de publicar/despublicar com estado de publicação.

**Contexto & referências**
- Tela: `PaginaVendas-Conteudo.html` (info banner "Uma edição, dois canais"; grupos Essenciais/Só web/Sistema; card SEO; rail de performance da landing).
- RNs: RN-201, RN-302 (sem "Promovido por"), §2.12, §2.15, §2.16.
- Mocks: 8 seções canônicas + Checkout travado; SEO da Meia Floripa; URL `{DOMINIO_LEELA}/meia-maratona-floripa-2026` (trocar `be-hero.com.br`).
- Componentes DS: EventoHeader/EventoSubNav (E03-S202-T1), Toggle 32×18, Card flat, Badge (Publicada/Sistema), Input/Textarea, upload og:image (dashed, exceção §2.16), Button, Toast, ConfirmModal (despublicar).

**Arquivos (criar/editar)**
- `apps/painel/app/eventos/[slug]/pagina-vendas/page.tsx` (aba Conteúdo)
- `apps/painel/app/eventos/[slug]/pagina-vendas/_components/{SecaoCard,GrupoSecoes,SeoCard,PerformanceRail}.tsx`

**Passos de implementação**
1. Reusar layout do evento (header 96px §2.1 + sub-nav §2.14); adicionar a aba "Página de Vendas" e a sub-sub-nav (Conteúdo | Configuração | Preview).
2. Info banner "Uma edição, dois canais"; grupos: Essenciais (web+app), Só landing pública, Sistema (Checkout travado — toggle `locked`).
3. Toggle por seção (ativa/desativa) com opacidade na seção off; seção Checkout nunca desativável.
4. Card SEO: título, meta descrição, URL amigável read-only (`{DOMINIO_LEELA}/{slug}`, botão copiar → Toast "URL copiada"), upload og:image.
5. Estado de publicação (badge Publicada/Rascunho + "última atualização há N"); "Publicar alterações" → Toast; "Despublicar" → `ConfirmModal` (§2.15) → Toast "Página despublicada".
6. Rail direito (performance da landing / origens / ações rápidas) como leitura — "Copiar link público" → Toast "Link copiado".

**Modelo de dados / contratos**
- Lê/escreve `paginaVendas/{unico}` (S300-T1). Publicação reutiliza `publicarEvento` (E03-S201-T2) para URL/QR (RN-201).

**Regras de negócio a respeitar**
- RN-302 (não renderizar "Promovido por"); §2.12 (estados), §2.15 (despublicar), §2.16 (flat; upload dashed é exceção).

**Critérios de aceite (testáveis)**
- **Dado** as seções, **quando** abro, **então** vejo os 3 grupos e o Checkout travado (não desativável).
- **Dado** uma seção, **quando** desativo, **então** ela fica esmaecida e persiste; **quando** salvo SEO, **então** Toast de sucesso.
- **Dado** a URL amigável, **quando** a leio, **então** usa `{DOMINIO_LEELA}` (nunca `be-hero.com.br`).
- **Dado** "Despublicar", **quando** confirmo no ConfirmModal, **então** estado vira rascunho + Toast "Página despublicada".

**Testes a escrever**
- unit: render de `SecaoCard` por canal; Checkout sempre travado.
- e2e: alternar seção + salvar SEO + despublicar (ConfirmModal).

**Definition of Done**
- [ ] 3 grupos + Checkout travado · [ ] SEO com domínio `{DOMINIO_LEELA}` · [ ] Despublicar via §2.15 · [ ] Estados §2.12 · [ ] Flat §2.16 · [ ] a11y AA · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Editor de cada seção individual (conteúdo rico) e renderização da landing (E12); modais de lote/cupom/percurso (T4..T6).

#### LEELA-S300-T4 · Modal de lote (virada por data/quantidade, preços por percurso) [`Pagina-Vendas-Modal-Lote.html`]

- **Tipo:** ui-component · **Depende de:** S300-T1, S300-T2, E01-S001-3-T3 (Modal) · **Estimativa:** M

**Objetivo**
Modal de criar/editar lote: nome, critério de virada (data ou quantidade), valor do critério e preço por percurso (5k/10k/21k), com bloqueio de preço pós-venda (RN-200).

**Contexto & referências**
- Tela: `Pagina-Vendas-Modal-Lote.html`.
- RNs: RN-300, RN-301, RN-200.
- Mocks: 2 lotes da Meia Floripa; percursos 5k/10k/21k.
- Componentes DS: Modal (4 vias de fechamento), Radio (critério), Input (data/quantidade/preço), Button, Toast.

**Arquivos (criar/editar)**
- `apps/painel/app/eventos/[slug]/pagina-vendas/_components/LoteModal.tsx`

**Passos de implementação**
1. Campos: nome, `criterioVirada` (radio data|quantidade), `dataVirada` OU `qtdLimite` conforme critério, uma linha de preço por percurso.
2. Validação inline: data futura, quantidade > 0, preço numérico ≥ 0.
3. Preço bloqueado (campo desabilitado + aviso) quando o evento já tem venda (RN-200).
4. 4 vias de fechamento (cancelar/X/overlay/Esc); salvar → Toast.

**Modelo de dados / contratos**
- Escreve `lotes/{loteId}` (S300-T1); virada regida por S300-T2.

**Regras de negócio a respeitar**
- RN-300, RN-301, RN-200.

**Critérios de aceite (testáveis)**
- **Dado** critério "quantidade", **quando** abro, **então** vejo o campo de limite e não o de data.
- **Dado** um evento com venda, **quando** edito preço, **então** o campo está bloqueado (RN-200).
- **Dado** 3 percursos, **quando** salvo, **então** cada um tem seu preço (RN-301).

**Testes a escrever**
- unit: alternância de campo por critério; bloqueio de preço; fechamento 4 vias.

**Definition of Done**
- [ ] Critério condicional (RN-300) · [ ] Preço por percurso (RN-301) · [ ] Bloqueio RN-200 · [ ] 4 vias de fechamento · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Cron de virada (T2, servidor).

#### LEELA-S300-T5 · Modal de cupom (código, tipo, valor, teto, validade) [`Pagina-Vendas-Modal-Cupom.html`]

- **Tipo:** ui-component · **Depende de:** S300-T1, E01-S001-3-T3 (Modal) · **Estimativa:** M

**Objetivo**
Modal de criar/editar cupom: código, tipo de desconto (percentual ou valor), valor, teto de usos e validade; e remoção de cupom via `ConfirmModal` (§2.15).

**Contexto & referências**
- Tela: `Pagina-Vendas-Modal-Cupom.html`.
- RNs: RN-301 (contexto de preço); §2.15 (remoção).
- Mocks: `CORRIDAPERFEITA10` (−10%), `AMIGOCPS`.
- Componentes DS: Modal, Input, Radio (tipo), Button, Toast, ConfirmModal (remover).

**Arquivos (criar/editar)**
- `apps/painel/app/eventos/[slug]/pagina-vendas/_components/CupomModal.tsx`

**Passos de implementação**
1. Campos: `codigo` (uppercase, único no evento), `tipoDesconto` (radio), `valor`, `usosMax?`, `validadeAte?`.
2. Validação: código único no evento (checagem servidor), valor coerente com o tipo (percentual 0–100).
3. Salvar → Toast; copiar código → Toast "Cupom [código] copiado" (glossário).
4. Remover cupom → `ConfirmModal` com preview (§2.15) → Toast.

**Modelo de dados / contratos**
- Escreve `cupons/{cupomId}` (S300-T1); `usosFeitos` só por Function.

**Regras de negócio a respeitar**
- Código único por evento; §2.15 na remoção.

**Critérios de aceite (testáveis)**
- **Dado** um código já existente, **quando** salvo, **então** vejo erro inline (único por evento).
- **Dado** tipo "percentual", **quando** informo 120, **então** validação bloqueia (0–100).
- **Dado** "Remover", **quando** confirmo, **então** cupom removido + Toast.

**Testes a escrever**
- unit: validação de tipo/valor e unicidade; fechamento 4 vias.
- integração: unicidade de código no servidor (emulator).

**Definition of Done**
- [ ] Código único por evento · [ ] Copy "Cupom [código] copiado" (glossário) · [ ] Remoção §2.15 · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Aplicação/validação do cupom no checkout (E12).

#### LEELA-S300-T6 · Modal de percurso (preço independente por percurso) [`Pagina-Vendas-Modal-Percurso.html`]

- **Tipo:** ui-component · **Depende de:** S300-T1, E01-S001-3-T3 (Modal) · **Estimativa:** S

**Objetivo**
Modal de editar um percurso (modalidade): nome/distância e preço-base independente, alimentando o mapa `precosPorPercurso` dos lotes (RN-301) e respeitando o bloqueio de preço (RN-200).

**Contexto & referências**
- Tela: `Pagina-Vendas-Modal-Percurso.html`.
- RNs: RN-301, RN-200.
- Mocks: 5k/10k/21k; "a partir de R$ 99".
- Componentes DS: Modal, Input, Button, Toast.

**Arquivos (criar/editar)**
- `apps/painel/app/eventos/[slug]/pagina-vendas/_components/PercursoModal.tsx`

**Passos de implementação**
1. Campos: nome/distância do percurso, preço-base independente (RN-301).
2. Bloqueio de preço quando há venda (RN-200).
3. Salvar → Toast; refletir no `precosPorPercurso` do lote vigente.

**Modelo de dados / contratos**
- Atualiza `precosPorPercurso` em `lotes` (S300-T1) e/ou `modalidades` do evento (E03).

**Regras de negócio a respeitar**
- RN-301 (preço independente), RN-200 (bloqueio).

**Critérios de aceite (testáveis)**
- **Dado** dois percursos, **quando** defino preços diferentes, **então** persistem independentes (RN-301).
- **Dado** evento com venda, **quando** edito preço, **então** bloqueado (RN-200).

**Testes a escrever**
- unit: independência de preço por percurso; bloqueio de preço.

**Definition of Done**
- [ ] Preço independente (RN-301) · [ ] Bloqueio RN-200 · [ ] 4 vias de fechamento · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Criação de nova modalidade (E03-S201).

---

### LEELA-S301 · Promotores e programa de afiliação · (de-para BH-301)

**Como** Organizador de Evento, **quero** gerenciar promotores e clubes que divulgam meu evento com comissão rastreável, **para** remunerar quem traz vendas sem controlar em planilha.

- **MoSCoW:** Should (Must para fechar o loop de afiliação clube↔organizador) · **Estimativa:** XL · **Superfície:** Painel
- **Tela(s) de referência:** `WEB-APPV2 (1)/Promotores.html`, `Promotores-Modal-ConfigurarPrograma.html`, `Promotores-Modal-Convidar.html`, `Promotores-Detalhe.html`
- **RNs:** RN-310, RN-311, RN-312, RN-120, RN-121, RN-122, RN-125, §2.5, §2.12, §2.15

**Critérios de aceite (Given/When/Then):**
- **Dado** o programa de afiliação, **quando** o configuro, **então** defino comissão %, janela de atribuição, teto e cupom (RN-310/311); o organizador é quem define a comissão.
- **Dado** um clube afiliado, **quando** ele recebe os termos, **então** a comissão é read-only para ele — só aceita ou recusa (RN-120/121/122).
- **Dado** a lista, **quando** abro, **então** vejo os afiliados (clube e promotor — RN-312) com conversões, cliques e comissão a receber; filtros e EmptyState.
- **Dado** um afiliado ativo, **quando** copio o link master, **então** o link é rastreável e usa `{DOMINIO_LEELA}` (trocar `beh.ro`); Toast "Link master de [evento] copiado".
- **Dado** uma conversão via link master, **quando** ela ocorre dentro da janela de atribuição, **então** é atribuída ao afiliado e o split é executado por `PaymentProvider.splitRules` (webhook idempotente).
- **Dado** o detalhe de um afiliado, **quando** abro, **então** vejo link master, cupom, cliques, conversões, taxa e "a receber".

**Tasks:** LEELA-S301-T1, LEELA-S301-T2, LEELA-S301-T3, LEELA-S301-T4, LEELA-S301-T5, LEELA-S301-T6, LEELA-S301-T7

#### LEELA-S301-T1 · Modelo `programaAfiliacao` + `afiliados` + tipos + Rules + seed

- **Tipo:** data-model · **Depende de:** E03-S200-T1 (Evento) · **Bloqueia:** S301-T3..T7 · **Estimativa:** M

**Objetivo**
Modelar o programa de afiliação (definido pelo organizador) e os afiliados (clube e promotor), com termos espelhados read-only para o lado do clube, Security Rules e seed canônico.

**Contexto & referências**
- RNs: RN-310, RN-311, RN-312, RN-120, RN-121, RN-122.
- Modelo: `eventos/{id}/programaAfiliacao/{unico}`, `eventos/{id}/afiliados/{afiliadoId}`; espelha `clubes/{id}/parcerias` (E05).
- Mocks (Meia Floripa): comissão 10%, janela 7 dias, liberação após 28 Abr 2026, prazo 10 dias úteis, teto sem limite; afiliado clube Corrida Perfeita Sul (cupom `CORRIDAPERFEITA10`, link `{DOMINIO_LEELA}/mfl26?c=cps` — trocar `beh.ro`, 234 cliques, 28 conversões, taxa 12%, R$ 528 a receber); promotor individual Dioney Galharte (DG).

**Arquivos (criar/editar)**
- `packages/core/src/eventos/afiliacao.ts` — `type ProgramaAfiliacao`, `type Afiliado`, `type TipoAfiliado`, `type StatusAfiliado`.
- `packages/api-client/src/eventos/afiliados.ts` — CRUD + leitura de termos.
- `functions/src/eventos/espelharTermos.ts` — espelha termos read-only na parceria do clube (RN-121/122).
- `functions/firestore.rules` — Rules de `programaAfiliacao`/`afiliados` (owner escreve; clube lê termos read-only).
- `functions/seed/afiliacao.seed.ts`

**Passos de implementação**
1. `type ProgramaAfiliacao = { comissaoPct; janelaAtribuicaoDias; tetoMensal?; cupomPadrao?; criterioLiberacao; prazoRepasseDiasUteis }` (RN-310/311).
2. `type TipoAfiliado = 'clube'|'promotor'` (RN-312); `type Afiliado = { id; tipo; nome; status; linkMaster; cupom?; cliquesUnicos; conversoes; valorAReceber; janelaAtribuicaoDias }`.
3. Function espelha termos read-only na `parceria` do clube (RN-121/122); comissão nunca editável pelo clube (RN-120).
4. Rules: organizador (owner) escreve; clube lê os termos do próprio convite.
5. Seed com programa + afiliado clube (CPS) + promotor (DG).

**Modelo de dados / contratos**
- `programaAfiliacao/{unico}` (doc único); `afiliados/{afiliadoId}`; agregados ∑ só por Function.

**Regras de negócio a respeitar**
- RN-310 (organizador define), RN-311 (%/janela/teto/cupom), RN-312 (2 tipos), RN-120/121/122 (read-only para o clube).

**Critérios de aceite (testáveis)**
- **Dado** o organizador, **quando** define a comissão, **então** persiste; **dado** o clube, **quando** tenta editar a comissão, **então** a Rule nega (RN-120).
- **Dado** um afiliado tipo promotor e outro tipo clube, **quando** consulto, **então** ambos existem (RN-312).

**Testes a escrever**
- unit: tipos/derivações.
- integração: Rules — clube read-only nos termos; agregado negado ao cliente.

**Definition of Done**
- [ ] Organizador define comissão (RN-310) · [ ] Clube read-only (RN-120/121/122) · [ ] 2 tipos de afiliado (RN-312) · [ ] Rules · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Interface de pagamento (T2); split/conversão (T3); UI (T4..T7).

#### LEELA-S301-T2 · Interface `PaymentProvider` em `core` + provider mock/sandbox (ADR-006)

- **Tipo:** setup · **Depende de:** E00 (Functions), E03-S200-T1 · **Bloqueia:** S301-T3, S302-T2 · **Estimativa:** M

**Objetivo**
Especificar a interface plugável `PaymentProvider` em `packages/core` (ADR-006) e uma implementação mock/sandbox em `functions/`, para construir e testar cobrança, split de afiliação, reembolso, webhook e payout sem escolher o gateway concreto.

**Contexto & referências**
- ADR: ADR-006 (camada plugável; fornecedor concreto adiado). Métodos: `createCharge`, `splitRules`, `refund`, `handleWebhook`, `getPayout`.
- Estratégia de testes: cobertura **máxima** na camada de pagamento (split, webhooks, reembolso).

**Arquivos (criar/editar)**
- `packages/core/src/payments/PaymentProvider.ts` — interface + tipos (`Charge`, `SplitRule`, `Refund`, `WebhookEvent`, `Payout`).
- `functions/src/payments/mockProvider.ts` — implementação sandbox determinística.
- `functions/src/payments/index.ts` — seleção de provider por config (sem acoplar domínio ao gateway).

**Passos de implementação**
1. Definir `interface PaymentProvider { createCharge(input); splitRules(input): SplitRule[]; refund(chargeId); handleWebhook(event): { idempotencyKey; result }; getPayout(afiliadoId) }`.
2. `SplitRule` modela recebedores múltiplos (organizador + afiliado por `comissaoPct`).
3. Provider mock/sandbox determinístico para testes e ambiente de desenvolvimento.
4. Domínio (`core`) programa **só** contra a interface; o gateway concreto entra depois num adapter sem tocar o domínio.

**Modelo de dados / contratos**
- Interface em `core`; implementação em `functions`. Sem coleção nova (usa agregados financeiros de S302/S207).

**Regras de negócio a respeitar**
- ADR-006 (plugável); nenhum segredo de gateway no cliente.

**Critérios de aceite (testáveis)**
- **Dado** o mock provider, **quando** crio uma cobrança com split, **então** `splitRules` retorna organizador + afiliado pela `comissaoPct`.
- **Dado** um webhook repetido, **quando** processo, **então** a `idempotencyKey` evita efeito duplicado.

**Testes a escrever**
- unit: `splitRules` (recebedores múltiplos).
- integração: mock provider — cobrança, split, webhook idempotente, reembolso (sandbox).

**Definition of Done**
- [ ] Interface em `core`, gateway desacoplado · [ ] Split com recebedores múltiplos · [ ] Webhook idempotente · [ ] Sem segredo no cliente · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Gateway concreto (Pagar.me/Asaas/Stripe) — ADR futuro.

#### LEELA-S301-T3 · Function de conversão + atribuição por link master + split idempotente

- **Tipo:** api/function · **Depende de:** S301-T1, S301-T2 · **Bloqueia:** S301-T4, S301-T7 · **Estimativa:** L

**Objetivo**
Registrar a conversão atribuída ao afiliado quando a inscrição vem por link master dentro da janela de atribuição (RN-125/311), executar o split via `PaymentProvider.splitRules` e atualizar os agregados (`conversoes`, `valorAReceber`) por webhook idempotente.

**Contexto & referências**
- RNs: RN-125, RN-311, RN-312.
- Modelo: `afiliados/{id}` (∑`conversoes`, ∑`valorAReceber`, `cliquesUnicos`), `programaAfiliacao` (janela/teto).
- Estratégia de testes E2E: "Aceitar parceria → link master rastreável → conversão registrada na janela".

**Arquivos (criar/editar)**
- `functions/src/eventos/registrarClique.ts` — clique único por link master.
- `functions/src/eventos/atribuirConversao.ts` — atribuição na janela + split.
- `functions/src/payments/webhookSplit.ts` — webhook de pagamento idempotente/assinado.
- `packages/core/src/eventos/atribuicao.ts` — `dentroDaJanela(clique, conversao, janelaDias)` (puro).

**Passos de implementação**
1. `registrarClique`: incrementa `cliquesUnicos` do afiliado por link master (distributed counter).
2. `atribuirConversao`: se a inscrição confirmada tem clique dentro da janela (RN-125/311), atribui ao afiliado e chama `splitRules`.
3. `webhookSplit`: idempotente por `idempotencyKey` (não duplica conversão/valor); assinado/verificado.
4. Respeitar `tetoMensal` quando definido (RN-311).

**Modelo de dados / contratos**
- `atribuirConversao(...)` mantém `conversoes`/`valorAReceber`; idempotente.

**Regras de negócio a respeitar**
- RN-125/311 (janela/teto), split via `PaymentProvider.splitRules`; webhook idempotente/assinado (DoD API).

**Critérios de aceite (testáveis)**
- **Dado** um clique + conversão dentro da janela, **quando** processa, **então** atribui ao afiliado e credita `valorAReceber`.
- **Dado** a mesma conversão reprocessada (webhook repetido), **quando** processa, **então** não duplica (idempotente).
- **Dado** conversão fora da janela, **quando** processa, **então** não atribui.

**Testes a escrever**
- unit: `dentroDaJanela` (limites da janela); cálculo de comissão.
- integração: split via mock provider; webhook idempotente (emulator).
- e2e: link master → conversão na janela → `valorAReceber` atualizado.

**Definition of Done**
- [ ] Atribuição na janela (RN-125/311) · [ ] Split via `PaymentProvider.splitRules` · [ ] Webhook idempotente/assinado · [ ] Teto respeitado · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Payout/repasse efetivo (S302-T2); reembolso na UI.

#### LEELA-S301-T4 · Tela Promotores (lista de afiliados: conversões, cliques, comissão) [`Promotores.html`]

- **Tipo:** screen · **Depende de:** S301-T1, S301-T3, E03-S202-T1, E01-S001-3-T2 (Table densa) · **Estimativa:** L

**Objetivo**
Renderizar a lista de afiliados (clube e promotor) com conversões, cliques, taxa e comissão a receber, em tabela densa (§2.5), com busca/filtros, EmptyState e ações por linha.

**Contexto & referências**
- Tela: `Promotores.html`.
- RNs: RN-312, §2.5, §2.12.
- Mocks: clube Corrida Perfeita Sul (234 cliques, 28 conversões, 12%, R$ 528); promotor Dioney Galharte.
- Componentes DS: EventoSubNav (aba Promotores), Table densa, Badge (tipo/status), Chip de filtro, EmptyState, Popover de linha, Button.

**Arquivos (criar/editar)**
- `apps/painel/app/eventos/[slug]/promotores/page.tsx`
- `apps/painel/app/eventos/[slug]/promotores/_components/AfiliadosTable.tsx`

**Passos de implementação**
1. Tabela densa: afiliado (nome/tipo), cliques únicos, conversões, taxa, a receber, status.
2. Filtros por tipo (clube/promotor) e status; contador "mostrando X de Y".
3. Ações por linha: ver detalhe (S301-T7), copiar link master (Toast "Link master de [evento] copiado"), desativar (§2.15).
4. EmptyState "Nenhum promotor encontrado com os filtros aplicados." (glossário).
5. Botão "Configurar programa" (S301-T5) e "Convidar" (S301-T6).

**Modelo de dados / contratos**
- Lê `afiliados` (S301-T1). Sem escrita direta de agregados.

**Regras de negócio a respeitar**
- RN-312 (2 tipos), §2.5, §2.12; desativar via §2.15.

**Critérios de aceite (testáveis)**
- **Dado** afiliados, **quando** abro, **então** vejo clube e promotor com conversões/cliques/comissão (RN-312).
- **Dado** filtro sem correspondência, **quando** aplico, **então** EmptyState com a copy do glossário.
- **Dado** uma linha, **quando** copio o link master, **então** Toast "Link master de [evento] copiado".

**Testes a escrever**
- unit: filtro/contador; render por tipo/status.
- e2e: filtrar + copiar link master.

**Definition of Done**
- [ ] Table densa §2.5 · [ ] EmptyState (glossário) · [ ] Copy "Link master … copiado" · [ ] Estados §2.12 · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Detalhe do afiliado (T7); configuração do programa (T5).

#### LEELA-S301-T5 · Modal Configurar programa (%, janela, teto, cupom) [`Promotores-Modal-ConfigurarPrograma.html`]

- **Tipo:** ui-component · **Depende de:** S301-T1, E01-S001-3-T3 (Modal) · **Estimativa:** M

**Objetivo**
Modal onde o organizador define os termos do programa de afiliação: comissão %, janela de atribuição, teto mensal e cupom padrão (RN-310/311), com os termos espelhados read-only para o clube.

**Contexto & referências**
- Tela: `Promotores-Modal-ConfigurarPrograma.html`.
- RNs: RN-310, RN-311, RN-120/121/122.
- Mocks: comissão 10%, janela 7 dias, liberação após 28 Abr, prazo 10 dias úteis, teto sem limite, cupom `CORRIDAPERFEITA10`.
- Componentes DS: Modal (4 vias), Input, Toggle (teto on/off), Button, Toast.

**Arquivos (criar/editar)**
- `apps/painel/app/eventos/[slug]/promotores/_components/ConfigurarProgramaModal.tsx`

**Passos de implementação**
1. Campos: `comissaoPct` (0–100), `janelaAtribuicaoDias`, `tetoMensal?` (toggle + valor), `cupomPadrao?`, `criterioLiberacao`, `prazoRepasseDiasUteis`.
2. Validação inline; salvar → Toast; termos espelhados read-only (Function S301-T1).
3. 4 vias de fechamento.

**Modelo de dados / contratos**
- Escreve `programaAfiliacao/{unico}` (S301-T1).

**Regras de negócio a respeitar**
- RN-310 (organizador define), RN-311 (%/janela/teto/cupom).

**Critérios de aceite (testáveis)**
- **Dado** comissão 10% e janela 7 dias, **quando** salvo, **então** persiste e Toast de sucesso.
- **Dado** teto desativado, **quando** salvo, **então** `tetoMensal` fica nulo (sem limite).

**Testes a escrever**
- unit: validação de %/janela/teto; fechamento 4 vias.

**Definition of Done**
- [ ] Organizador define termos (RN-310/311) · [ ] Teto opcional · [ ] 4 vias de fechamento · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Espelhamento no lado do clube (E05); split (T3).

#### LEELA-S301-T6 · Modal Convidar afiliado (clube ou promotor) [`Promotores-Modal-Convidar.html`]

- **Tipo:** ui-component · **Depende de:** S301-T1, E01-S001-3-T3 (Modal) · **Estimativa:** M

**Objetivo**
Modal para convidar um afiliado — clube (por busca/slug) ou promotor individual (por email) — gerando o convite pendente e o link master ao aceitar (RN-312).

**Contexto & referências**
- Tela: `Promotores-Modal-Convidar.html`.
- RNs: RN-312, RN-120 (clube só aceita/recusa).
- Mocks: clube Corrida Perfeita Sul; promotor Dioney Galharte.
- Componentes DS: Modal, Tabs (Clube | Promotor), Input, Button, Toast.

**Arquivos (criar/editar)**
- `apps/painel/app/eventos/[slug]/promotores/_components/ConvidarAfiliadoModal.tsx`

**Passos de implementação**
1. Duas vias: convidar clube (busca por nome/slug) ou promotor (email + nome).
2. Cria afiliado `status=convidado`; ao aceitar (fluxo do clube em E05), gera `linkMaster` com `{DOMINIO_LEELA}` (nunca `beh.ro`).
3. Validação (email válido / clube existente); salvar → Toast.

**Modelo de dados / contratos**
- Escreve `afiliados/{afiliadoId}` `status=convidado` (S301-T1).

**Regras de negócio a respeitar**
- RN-312 (2 tipos), RN-120 (comissão read-only para o clube), domínio `{DOMINIO_LEELA}`.

**Critérios de aceite (testáveis)**
- **Dado** a aba Promotor, **quando** convido por email, **então** cria afiliado convidado.
- **Dado** a aba Clube, **quando** convido um clube, **então** cria convite com termos read-only para o clube (RN-120).

**Testes a escrever**
- unit: validação por tipo; geração de link master com `{DOMINIO_LEELA}`.

**Definition of Done**
- [ ] 2 tipos de convite (RN-312) · [ ] Link master com `{DOMINIO_LEELA}` · [ ] Clube read-only (RN-120) · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Aceite/recusa pelo clube (E05); atribuição de conversão (T3).

#### LEELA-S301-T7 · Tela Detalhe do afiliado (link master, cupom, conversões, a receber) [`Promotores-Detalhe.html`]

- **Tipo:** screen · **Depende de:** S301-T1, S301-T3, S301-T4 · **Estimativa:** M

**Objetivo**
Renderizar o detalhe de um afiliado: link master (copiável + QR), cupom, cliques únicos, conversões, taxa e "a receber", com histórico de conversões na janela.

**Contexto & referências**
- Tela: `Promotores-Detalhe.html`.
- RNs: RN-125/311 (atribuição), §2.5, §2.12.
- Mocks: CPS — 234 cliques, 28 conversões, taxa 12%, R$ 528 a receber, link `{DOMINIO_LEELA}/mfl26?c=cps`.
- Componentes DS: Cards flat, KPIs, Table densa (histórico), Button (copiar/QR), Toast.

**Arquivos (criar/editar)**
- `apps/painel/app/eventos/[slug]/promotores/[afiliadoId]/page.tsx`
- `apps/painel/app/eventos/[slug]/promotores/_components/AfiliadoDetalhe.tsx`

**Passos de implementação**
1. KPIs (cliques, conversões, taxa, a receber) a partir de agregados ∑.
2. Link master copiável (Toast "Link master de [evento] copiado") + baixar QR (Toast "QR Code do link master gerado · baixando…").
3. Tabela densa de conversões atribuídas (com marca de dentro/fora da janela).
4. Estados vazio/erro/carregando (§2.12).

**Modelo de dados / contratos**
- Lê `afiliados/{id}` + conversões (S301-T3). Sem cálculo ad-hoc de agregado no cliente.

**Regras de negócio a respeitar**
- RN-125/311 (janela); agregados por Function; §2.5, §2.12.

**Critérios de aceite (testáveis)**
- **Dado** o afiliado CPS, **quando** abro, **então** vejo 234 cliques / 28 conversões / 12% / R$ 528 a partir dos agregados.
- **Dado** o link master, **quando** copio/baixo QR, **então** Toasts do glossário e domínio `{DOMINIO_LEELA}`.

**Testes a escrever**
- unit: render de KPIs do agregado.
- e2e: abrir detalhe → copiar link master.

**Definition of Done**
- [ ] KPIs de agregado (não ad-hoc) · [ ] Link master com `{DOMINIO_LEELA}` + Toasts do glossário · [ ] Estados §2.12 · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Painel do próprio promotor logado (E08).

---

### LEELA-S302 · Financeiro do evento com repasses de afiliados · (de-para BH-302)

**Como** Organizador de Evento, **quero** ver o financeiro detalhado com repasses de afiliados, **para** controlar margem e pagamentos.

- **MoSCoW:** Must · **Estimativa:** M · **Superfície:** Painel
- **Tela(s) de referência:** `WEB-APPV2 (1)/Financeiro-Evento.html`, `Financeiro do Evento.html`
- **RNs:** — (leitura de agregados ∑; repasse referencia `programaAfiliacao`/`afiliados`); consolida com **LEELA-S207**

> **Consolidação:** LEELA-S302 estende LEELA-S207 (Financeiro do evento, em E03). O que S207 entrega (bruto/taxa/líquido, breakdown, export CSV) não é reimplementado; S302 acrescenta a camada de **repasse aos afiliados** (split via `PaymentProvider`) e o **payout**. Se S207 ainda não estiver pronto, S302-T1 o absorve.

**Critérios de aceite (Given/When/Then):**
- **Dado** o financeiro, **quando** abro, **então** vejo receita bruta, taxa Leela, receita líquida e breakdown por modalidade/lote (herda S207).
- **Dado** repasses, **quando** existem, **então** vejo por afiliado o valor a receber, o status de repasse e a data de liberação (referencia `programaAfiliacao`).
- **Dado** o payout, **quando** consulto, **então** o valor vem de `PaymentProvider.getPayout`, nunca calculado ad-hoc no cliente.
- **Dado** os dados, **quando** exporto, **então** baixo um CSV com receita e repasses.

**Tasks:** LEELA-S302-T1, LEELA-S302-T2

#### LEELA-S302-T1 · Tela Financeiro com repasses de afiliados (estende S207) [`Financeiro-Evento.html`]

- **Tipo:** screen · **Depende de:** E03-S207-T1 (base financeira), S301-T1, S302-T2 · **Estimativa:** M

**Objetivo**
Renderizar o financeiro do evento acrescentando a tabela de repasses por afiliado (valor a receber, status, liberação) sobre a base de S207, com export CSV incluindo repasses.

**Contexto & referências**
- Tela: `Financeiro-Evento.html` (consolida `Financeiro do Evento.html`).
- Mocks: bruto R$ 85.617; repasse ao clube CPS R$ 528 (comissão 10%, liberação após 28 Abr, prazo 10 dias úteis).
- Componentes DS: Cards flat, Table densa (§2.5), Badge de status de repasse, Button de export.

**Arquivos (criar/editar)**
- `apps/painel/app/eventos/[slug]/financeiro/_components/RepassesAfiliados.tsx`
- `apps/painel/app/eventos/[slug]/financeiro/page.tsx` (estende a tela de S207 com a seção de repasses)

**Passos de implementação**
1. Reusar a base de S207 (bruto/taxa/líquido, breakdown por modalidade/lote, forma de pagamento).
2. Seção de repasses: por afiliado, valor a receber, status (a liberar/liberado/pago), data de liberação (referencia `programaAfiliacao`).
3. Export CSV incluindo linhas de repasse.
4. Estados vazio/erro/carregando (§2.12).

**Modelo de dados / contratos**
- Lê `eventos.receitaConfirmada` + agregados financeiros (S302-T2) + `afiliados.valorAReceber` (S301-T1).

**Regras de negócio a respeitar**
- Agregados por Function (nunca ad-hoc); §2.5, §2.12.

**Critérios de aceite (testáveis)**
- **Dado** o evento canônico, **quando** abro, **então** bruto R$ 85.617 e a linha de repasse do CPS (R$ 528, liberação após 28 Abr).
- **Dado** os dados, **quando** exporto, **então** o CSV inclui receita e repasses.

**Testes a escrever**
- unit: derivação de exibição de repasse (em `core`).
- e2e: abrir financeiro → ver repasse → exportar CSV.

**Definition of Done**
- [ ] Repasses por afiliado · [ ] Valores de agregado (não ad-hoc) · [ ] Export CSV com repasses · [ ] Estados §2.12 · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Tela de reembolso; base financeira já coberta por S207.

#### LEELA-S302-T2 · Function de agregado de repasse + payout via `PaymentProvider.getPayout`

- **Tipo:** api/function · **Depende de:** S301-T2 (PaymentProvider), S301-T3 (split), E03-S207-T2 (agregado financeiro) · **Bloqueia:** S302-T1 · **Estimativa:** M

**Objetivo**
Estender o agregado financeiro do evento (S207-T2) com o valor de repasse por afiliado e o status de payout obtido de `PaymentProvider.getPayout`, de forma idempotente e disparada por webhook de pagamento.

**Contexto & referências**
- Modelo: agregados financeiros do evento + `afiliados.valorAReceber`.
- Estratégia de testes: cobertura máxima em pagamento (split, webhooks, reembolso).

**Arquivos (criar/editar)**
- `functions/src/eventos/agregarRepasse.ts` — onWrite de split confirmado / webhook.
- `functions/src/payments/payout.ts` — consulta `PaymentProvider.getPayout`.
- `functions/firestore.rules` — agregados de repasse só escrevíveis por Function.

**Passos de implementação**
1. No webhook de split confirmado, atualizar `afiliados.valorAReceber` e o status de repasse (idempotente por `idempotencyKey`).
2. `getPayout(afiliadoId)` do provider alimenta o status (a liberar/liberado/pago) sem cálculo no cliente.
3. Distributed counter onde a escrita for concorrente.
4. Rules bloqueiam escrita do cliente.

**Modelo de dados / contratos**
- `agregarRepasse(evento)` idempotente; `getPayout` via `PaymentProvider`.

**Regras de negócio a respeitar**
- Agregados só por Function; webhook idempotente/assinado (DoD API).

**Critérios de aceite (testáveis)**
- **Dado** N splits confirmados, **quando** processam, **então** `valorAReceber` bate com a soma (sem duplicar em reprocesso).
- **Dado** um cliente, **quando** tenta escrever o agregado de repasse, **então** a Rule nega.

**Testes a escrever**
- integração: idempotência do repasse (emulator); `getPayout` via mock provider; Rules.

**Definition of Done**
- [ ] Idempotência · [ ] Payout via `PaymentProvider.getPayout` · [ ] Rules bloqueiam cliente · [ ] Webhook idempotente/assinado · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Gateway/split concreto (ADR-006 posterior).

---

### LEELA-S303 · Comunicação do evento · (de-para BH-303)

**Como** Organizador de Evento, **quero** comunicar com inscritos por push/email segmentado, **para** informar sobre kit, percurso e mudanças.

- **MoSCoW:** Should · **Estimativa:** — (casca de rastreabilidade) · **Superfície:** Painel
- **Tela(s) de referência:** `WEB-APPV2 (1)/Comunicacao-Evento.html`, `Comunicacao-Evento-Nova.html`
- **RNs:** RN-130..135, RN-133/134 (limite e truncamento) — **definidas e implementadas em LEELA-E06**

> **Redirecionamento (decisão registrada, JIRA-03/BH-303).** A comunicação do evento será **absorvida por LEELA-E06 (Marketing Unificado)**, junto com a migração da sub-nav 9→8 tabs (RN-002). Esta story existe para preservar a rastreabilidade de-para BH-303; o escopo funcional (comunicados segmentados por inscritos, push ≤160 RN-134, limite semanal RN-133, canais push/email) é entregue em E06, reusando o modelo `comunicados` (hoje no clube) generalizado para o evento. **Não implementar em E04.**

**Critérios de aceite (Given/When/Then):**
- **Dado** o roadmap, **quando** planejo a comunicação do evento, **então** o trabalho é executado em LEELA-E06 (não em E04).

**Tasks:** LEELA-S303-T1

#### LEELA-S303-T1 · Marcar comunicação do evento como escopo de E06 (rastreabilidade)

- **Tipo:** refactor · **Depende de:** — · **Estimativa:** XS

**Objetivo**
Registrar formalmente o redirecionamento de BH-303 para LEELA-E06 e garantir que a aba/rota de comunicação do evento aponte para o módulo unificado quando E06 existir (sem implementar a feature em E04).

**Contexto & referências**
- Telas: `Comunicacao-Evento.html`, `Comunicacao-Evento-Nova.html` (referência; implementação em E06).
- RNs: RN-130..135 (em E06); RN-002 (sub-nav 9→8 em E06).

**Arquivos (criar/editar)**
- `leela-specs/03-canon/epics/LEELA-E06-marketing.md` — anotar a herança de BH-303 (quando E06 for especificado).
- `apps/painel/app/eventos/[slug]/comunicacao/page.tsx` — placeholder/redirect para o módulo Marketing (quando disponível).

**Passos de implementação**
1. Anotar em E06 que a comunicação do evento herda BH-303.
2. Deixar a rota de comunicação do evento como placeholder/redirect (sem feature própria em E04).

**Modelo de dados / contratos**
- Nenhum (rastreabilidade/roteamento).

**Regras de negócio a respeitar**
- Nenhuma nova; RN-130..135 e RN-002 ficam em E06.

**Critérios de aceite (testáveis)**
- **Dado** a aba de comunicação do evento, **quando** E06 não existe, **então** vejo placeholder que aponta para o módulo Marketing (sem função de envio em E04).

**Testes a escrever**
- unit: render do placeholder/redirect.

**Definition of Done**
- [ ] Redirecionamento documentado em E06 · [ ] Sem feature de envio em E04 · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Toda a funcionalidade de comunicados (push/email/segmentação) → E06.

---

### LEELA-S304 · Configurações e equipe do evento (4 papéis) · (de-para BH-304)

**Como** Organizador de Evento, **quero** configurar dados gerais, equipe e permissões do evento, **para** controlar quem acessa e como o evento opera.

- **MoSCoW:** Should · **Estimativa:** L · **Superfície:** Painel
- **Tela(s) de referência:** `WEB-APPV2 (1)/Configuracoes-Evento.html`, `Config-Equipe.html`
- **RNs:** RN-320, §2.12, §2.15

**Critérios de aceite (Given/When/Then):**
- **Dado** as configurações, **quando** abro, **então** vejo dados gerais do evento (identidade, `usaChip`, visibilidade) e salvo com Toast.
- **Dado** a equipe, **quando** abro, **então** vejo os membros com um dos **4 papéis** (RN-320) e suas permissões.
- **Dado** um membro, **quando** atribuo/troco o papel, **então** as permissões (custom claims por evento) refletem o papel.
- **Dado** a remoção de um membro, **quando** confirmo, **então** passa por `ConfirmModal` (§2.15) e o acesso é revogado.
- **Dado** um papel sem permissão para uma área (ex.: Operador de balcão no Financeiro), **quando** tenta acessar, **então** o acesso é negado (UI + Rules).

**Tasks:** LEELA-S304-T1, LEELA-S304-T2, LEELA-S304-T3

#### LEELA-S304-T1 · Modelo `equipe` + 4 papéis (RN-320) + custom claims + Rules

- **Tipo:** data-model · **Depende de:** E03-S200-T1, E00 (Auth/claims) · **Bloqueia:** S304-T2, S304-T3 · **Estimativa:** M

**Objetivo**
Modelar a equipe do evento e os 4 papéis de permissão (RN-320), refletir os papéis em custom claims por evento e escrever as Security Rules que autorizam cada área por papel.

**Contexto & referências**
- RNs: RN-320 (4 papéis; "modelo de 4 papéis da IA v1.5").
- Modelo: `eventos/{id}/equipe/{membroId}` (`profId` 🔁`nome`, `papel`, `status`).
- Auth: Firebase Auth + custom claims por evento (ADR-008).
- **4 papéis (definição canônica):**
  1. **Organizador** — dono do evento; controle total, incluindo excluir evento, transferir ownership, financeiro e equipe.
  2. **Administrador** — gestão completa do evento (inscritos, kits, página de vendas, promotores, configurações); sem excluir evento nem transferir ownership.
  3. **Operador de balcão** — entrega de kit, vínculo de chip e check-in (E03-S204) + leitura de inscritos; sem configurações nem financeiro.
  4. **Financeiro** — leitura do financeiro e repasses + export CSV (S302); sem operação nem edição de conteúdo.

**Arquivos (criar/editar)**
- `packages/core/src/eventos/equipe.ts` — `type PapelEvento`, `type MembroEquipe`, matriz de permissões (`podeAcessar(papel, area)`).
- `packages/api-client/src/eventos/equipe.ts` — CRUD de membros.
- `functions/src/eventos/setClaimsEquipe.ts` — mantém custom claims por evento ao mudar papel.
- `functions/firestore.rules` — autoriza cada coleção por papel (financeiro só Organizador/Financeiro; entrega só Organizador/Admin/Operador; etc.).

**Passos de implementação**
1. `type PapelEvento = 'organizador'|'administrador'|'operador'|'financeiro'` (RN-320).
2. Matriz `podeAcessar(papel, area)` pura e testável (áreas: página_vendas, promotores, financeiro, entrega, inscritos, configuracoes, equipe).
3. Function seta custom claims por evento ao criar/alterar membro; revoga ao remover.
4. Rules leem os claims para autorizar cada operação.

**Modelo de dados / contratos**
- `equipe/{membroId}`; claims `{ eventos: { [eventoId]: papel } }`.

**Regras de negócio a respeitar**
- RN-320 (4 papéis); autorização por claims; agregados/financeiro nunca escritos pelo cliente.

**Critérios de aceite (testáveis)**
- **Dado** um Operador de balcão, **quando** acessa o Financeiro, **então** a Rule nega.
- **Dado** um Financeiro, **quando** lê o financeiro, **então** a Rule permite; **quando** edita a página de vendas, **então** nega.
- **Dado** a remoção de um membro, **quando** confirmo, **então** os claims são revogados.

**Testes a escrever**
- unit: matriz `podeAcessar` (4 papéis × áreas).
- integração: Rules por papel (emulator); set/revogação de claims.

**Definition of Done**
- [ ] 4 papéis (RN-320) · [ ] Autorização por claims + Rules · [ ] Matriz de permissões testada · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
UI de configurações/equipe (T2/T3).

#### LEELA-S304-T2 · Tela Configurações gerais do evento [`Configuracoes-Evento.html`]

- **Tipo:** screen · **Depende de:** S304-T1, E03-S202-T1 · **Estimativa:** M

> **Atualização 2026-07-19 (lote CAPA-EVENTO-UPLOAD · `[LEELA-CEV-*]`):** a capa desta tela deixou de ser "em breve"/URL — é **upload real** (RN-228: jpeg/png/gif ≤2MB, crop 1.9:1/1600×838) via `ImageUploadField` + seam `uploadCapaEvento`; `imagemUrl` persiste no fluxo canônico `atualizarConfiguracoesEvento` (read-only = só prévia). Backend: match `eventos/{eventoId}/capa` nas storage.rules, fail-closed com cross-service `firestore.get` + teto 2MB na Rule.

**Objetivo**
Renderizar as configurações gerais do evento: identidade (nome, descrição, capa), `usaChip`, visibilidade/URL pública, com salvamento e feedback via Toast.

**Contexto & referências**
- Tela: `Configuracoes-Evento.html`.
- RNs: RN-207 (contexto `usaChip`), RN-201 (URL pública), §2.12, §2.15.
- Mocks: Meia Floripa; URL `{DOMINIO_LEELA}/meia-maratona-floripa-2026` (trocar `be-hero.com.br`).
- Componentes DS: Cards flat, Input, Toggle (`usaChip`, visibilidade), upload capa (dashed), Button, Toast, ConfirmModal (ações destrutivas).

**Arquivos (criar/editar)**
- `apps/painel/app/eventos/[slug]/configuracoes/page.tsx`
- `apps/painel/app/eventos/[slug]/configuracoes/_components/ConfigGeraisForm.tsx`

**Passos de implementação**
1. Seções: identidade, operação (`usaChip` — afeta o passo de chip em E03-S204/RN-207), visibilidade/URL (read-only, `{DOMINIO_LEELA}`).
2. Salvar por seção → Toast (padrão glossário "Alterações em [seção] salvas").
3. Ações destrutivas (ex.: encerrar/arquivar evento) via `ConfirmModal` (§2.15), disponíveis só ao Organizador (S304-T1).

**Modelo de dados / contratos**
- Escreve `eventos/{slug}` (campos gerais). Sem escrita de agregado.

**Regras de negócio a respeitar**
- RN-207 (`usaChip`), RN-201 (URL), autorização por papel (S304-T1); §2.12/§2.15.

**Critérios de aceite (testáveis)**
- **Dado** `usaChip=false`, **quando** salvo, **então** o balcão suprime o passo de chip (RN-207, E03).
- **Dado** a URL pública, **quando** a leio, **então** usa `{DOMINIO_LEELA}` (nunca `be-hero.com.br`).
- **Dado** um papel sem permissão, **quando** tenta salvar, **então** bloqueado.

**Testes a escrever**
- unit: render por seção; gate por papel.
- e2e: salvar configuração → Toast.

**Definition of Done**
- [ ] `usaChip` afeta E03 (RN-207) · [ ] URL com `{DOMINIO_LEELA}` · [ ] Gate por papel · [ ] §2.12/§2.15 · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Equipe/permissões (T3).

#### LEELA-S304-T3 · Tela Equipe e permissões (4 papéis) [`Config-Equipe.html`]

- **Tipo:** screen · **Depende de:** S304-T1, S304-T2 · **Estimativa:** M

**Objetivo**
Renderizar a equipe do evento com os 4 papéis (RN-320): lista de membros, atribuição/troca de papel, convite de novo membro e remoção via `ConfirmModal` (§2.15).

**Contexto & referências**
- Tela: `Config-Equipe.html`.
- RNs: RN-320, §2.12, §2.15.
- Mocks: Marina Castelo (Organizador); adicionar 1 Administrador e 1 Operador de balcão para demonstração.
- Componentes DS: Table densa (§2.5) ou lista de cards, Select de papel, Badge de papel, Button, Toast, ConfirmModal (remover), EmptyState.

**Arquivos (criar/editar)**
- `apps/painel/app/eventos/[slug]/configuracoes/equipe/page.tsx`
- `apps/painel/app/eventos/[slug]/configuracoes/equipe/_components/{EquipeLista,ConvidarMembroModal}.tsx`

**Passos de implementação**
1. Lista de membros com papel (badge) e permissões resumidas (deriva de `podeAcessar`, S304-T1).
2. Atribuir/trocar papel via select → Function seta claims (S304-T1) → Toast.
3. Convidar novo membro (email + papel) → membro `convidado`.
4. Remover membro → `ConfirmModal` com preview (perde acesso a…) (§2.15) → revoga claims → Toast.
5. EmptyState quando só há o Organizador.

**Modelo de dados / contratos**
- Escreve `equipe/{membroId}` + dispara `setClaimsEquipe` (S304-T1).

**Regras de negócio a respeitar**
- RN-320 (4 papéis); remoção §2.15; só Organizador/Administrador gerenciam equipe (S304-T1).

**Critérios de aceite (testáveis)**
- **Dado** 4 papéis, **quando** troco o papel de um membro, **então** as permissões refletem (claims atualizados).
- **Dado** "Remover membro", **quando** confirmo no ConfirmModal, **então** o acesso é revogado + Toast.
- **Dado** um membro sem permissão de gestão de equipe, **quando** tenta editar papéis, **então** bloqueado.

**Testes a escrever**
- unit: render de papel/permissões; gate de gestão.
- e2e: trocar papel + remover membro (ConfirmModal).

**Definition of Done**
- [ ] 4 papéis geríveis (RN-320) · [ ] Claims refletem papel · [ ] Remoção §2.15 · [ ] Gate de gestão · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Transferência de ownership (fluxo de 3 passos — fora desta fase).

---

### LEELA-S305 · Configuração de política de reembolso e transferência (organizador) · (greenfield · sem de-para BH)

**Como** Organizador de Evento, **quero** configurar a política de reembolso, cancelamento e transferência do evento, **para** que as solicitações sigam regras claras e legais sem decisão manual caso a caso.

- **MoSCoW:** Must · **Estimativa:** L · **Superfície:** Painel
- **Tela(s) de referência:** greenfield (nova aba "Política de vendas" em Configurações do evento — sem HTML de protótipo; layout reusa `Configuracoes-Evento.html`)
- **RNs:** RN-338, RN-339, RN-340, RN-343, RN-344, RN-200/301 (diferença de upgrade pelo lote vigente), ADR-011 (pedido em grupo), §2.12, §2.15, §2.16

> **Fronteira com E09.** S305 entrega **apenas a política** (parâmetros, janelas, flags). A **máquina de estados**, a **fila de análise** do organizador, a **execução do estorno** (`PaymentProvider.refund`) e as **notificações** são de **LEELA-E09-S904**. A política incide **por inscrito** dentro do pedido em grupo (ADR-011), nunca sobre o pedido inteiro.

**Critérios de aceite (Given/When/Then):**
- **Dado** o evento, **quando** abro a aba "Política de vendas", **então** configuro reembolso (`janelaArrependimentoDias`, `corteHoras`, `slaAnaliseDias`), transferência (`habilitada`, `janelaHoras`, `taxa`) e troca de ingresso (`habilitada`, `janelaHoras`, `permiteReembolsoDowngrade`).
- **Dado** a janela de arrependimento, **quando** salvo, **então** vale reembolso integral automático em até 7 dias corridos da compra desde que faltem mais de 48h para o evento (RN-338, CDC Art. 49).
- **Dado** o corte de 48h, **quando** uma solicitação chega a menos de 48h do evento, **então** é bloqueada por padrão, salvo override explícito e registrado do organizador (RN-339).
- **Dado** uma solicitação fora da janela de arrependimento e antes do corte, **quando** entra, **então** segue para análise do organizador (em análise → aprovado/recusado) dentro do SLA configurável (RN-340).
- **Dado** a flag de transferência de titularidade, **quando** habilitada, **então** a troca abre até a janela default de 72h com taxa configurável (default 0) (RN-343).
- **Dado** a troca de ingresso do mesmo titular, **quando** há upgrade, **então** cobra a diferença pelo lote vigente (RN-200/301); no downgrade não há reembolso salvo política; janela até 48h (RN-344).
- **Dado** que reembolso, cancelamento e titularidade operam por inscrito no pedido em grupo (ADR-011), **quando** a política é aplicada, **então** incide sobre o inscrito individual, não sobre o pedido inteiro.
- **Dado** a escrita do doc de política, **quando** salvo, **então** só o owner do evento grava (Security Rules).

**Tasks:** LEELA-S305-T1, LEELA-S305-T2, LEELA-S305-T3

#### LEELA-S305-T1 · Modelo `politicaVendas` + tipos + Rules (só owner) + seed

- **Tipo:** data-model · **Depende de:** E03-S200-T1 (Evento) · **Bloqueia:** S305-T2, S305-T3 · **Estimativa:** M

**Objetivo**
Modelar em `core` o doc único de política de vendas do evento (reembolso, transferência, troca de ingresso), criar a subcoleção com Security Rules que só permitem escrita pelo owner do evento e o seed com os defaults legais.

**Contexto & referências**
- RNs: RN-338, RN-339, RN-340, RN-343, RN-344; ADR-011 (pedido em grupo — política por inscrito).
- Modelo: `eventos/{id}/politicaVendas/{unico}` (doc único por evento).
- Defaults legais (Brasil, CDC Art. 49): janela de arrependimento 7 dias corridos, corte 48h, transferência 72h, troca de ingresso 48h.
- Greenfield: sem HTML de protótipo.

**Arquivos (criar/editar)**
- `packages/core/src/eventos/politicaVendas.ts` — `type PoliticaReembolso`, `type PoliticaTransferencia`, `type PoliticaTrocaIngresso`, `type PoliticaVendas`.
- `packages/api-client/src/eventos/politicaVendas.ts` — leitura/escrita do doc de política.
- `functions/firestore.rules` — Rules de `politicaVendas` (leitura pela equipe autorizada; escrita só owner do evento).
- `functions/seed/politicaVendas.seed.ts` — seed com defaults legais.

**Passos de implementação**
1. `type PoliticaReembolso = { janelaArrependimentoDias: number; corteHoras: number; slaAnaliseDias: number }` (defaults 7 / 48 / configurável).
2. `type PoliticaTransferencia = { habilitada: boolean; janelaHoras: number; taxa: number }` (default 72h, taxa 0 — RN-343).
3. `type PoliticaTrocaIngresso = { habilitada: boolean; janelaHoras: number; permiteReembolsoDowngrade: boolean }` (default 48h, downgrade sem reembolso — RN-344).
4. `type PoliticaVendas = { reembolso; transferencia; trocaIngresso; atualizadoEm }`.
5. Rules: escrita `if isOwner(eventoId)`; leitura pela equipe autorizada (S304-T1); nunca escrita pelo cliente comum.
6. Seed com defaults da Meia Floripa (7d / 48h / SLA 3 dias úteis; transferência on 72h taxa 0; troca 48h downgrade off).

**Modelo de dados / contratos**
- `politicaVendas/{unico}` (doc único por evento). Escrita só pelo owner (RN-338..344 são configuração, não execução).

**Regras de negócio a respeitar**
- RN-338/339/340 (parametrizam a máquina de estados executada em E09-S904); RN-343/344 (flags e janelas); ADR-011 (política incide por inscrito).

**Critérios de aceite (testáveis)**
- **Dado** um owner, **quando** grava a política, **então** persiste; **dado** um não-owner, **quando** tenta gravar, **então** a Rule nega.
- **Dado** o doc default, **quando** leio, **então** `janelaArrependimentoDias=7`, `corteHoras=48`, `transferencia.janelaHoras=72`, `trocaIngresso.janelaHoras=48`.

**Testes a escrever**
- unit: tipos/derivações e defaults (`core`).
- integração: Rules (emulator) — escrita por owner permitida, por não-owner negada.

**Definition of Done**
- [ ] Doc único com os 3 blocos · [ ] Rules escrita só owner · [ ] Defaults legais no seed · [ ] Testes verdes · [ ] Lint + type-check limpos · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Máquina de estados, fila de análise, execução de estorno e notificações → **LEELA-E09-S904**; UI (T2/T3).

#### LEELA-S305-T2 · Aba "Política de vendas" — reembolso (janela 7d, corte 48h, SLA) [greenfield]

- **Tipo:** screen · **Depende de:** S305-T1, E03-S202-T1 (layout/sub-nav do evento) · **Estimativa:** M

**Objetivo**
Renderizar, dentro de Configurações do evento, a aba "Política de vendas" com o bloco de reembolso: janela de arrependimento (dias), corte pré-evento (horas) e SLA de análise (dias), com salvamento e feedback via Toast.

**Contexto & referências**
- Tela: greenfield (nova aba em `Configuracoes-Evento.html`; sem HTML de protótipo).
- RNs: RN-338, RN-339, RN-340; ADR-011; §2.12, §2.15, §2.16.
- Mocks: defaults Meia Floripa (7 dias, 48h, SLA 3 dias úteis).
- Componentes DS: Cards flat, Input numérico, card crítico border-left Vulcão (§2.16 exceção) para o aviso legal CDC Art. 49, Button, Toast.

**Arquivos (criar/editar)**
- `apps/painel/app/eventos/[slug]/configuracoes/politica-vendas/page.tsx` (aba Política de vendas)
- `apps/painel/app/eventos/[slug]/configuracoes/politica-vendas/_components/ReembolsoForm.tsx`

**Passos de implementação**
1. Adicionar a aba "Política de vendas" na área de Configurações do evento (S304), reusando layout/sub-nav (§2.14).
2. Bloco reembolso: `janelaArrependimentoDias`, `corteHoras`, `slaAnaliseDias` com validação inline (inteiros ≥ 0).
3. Card informativo (border-left Vulcão) explicando o auto-reembolso de 7 dias (CDC Art. 49) e o bloqueio nos 48h (override registrado do organizador) — texto legal, sem alterar a regra.
4. Nota "a política incide por inscrito no pedido em grupo" (ADR-011).
5. Salvar → Toast (glossário "Alterações em [seção] salvas"); estados §2.12.

**Modelo de dados / contratos**
- Lê/escreve `politicaVendas/{unico}.reembolso` (S305-T1).

**Regras de negócio a respeitar**
- RN-338/339/340 (configuração da política; execução em E09-S904); ADR-011; §2.12/§2.15/§2.16.

**Critérios de aceite (testáveis)**
- **Dado** a aba, **quando** abro, **então** vejo janela (7), corte (48h) e SLA carregados do doc.
- **Dado** valores válidos, **quando** salvo, **então** persistem e Toast de sucesso.
- **Dado** um valor inválido (negativo), **quando** salvo, **então** validação inline bloqueia.

**Testes a escrever**
- unit: render + validação dos 3 campos.
- e2e: editar política de reembolso → salvar → Toast.

**Definition of Done**
- [ ] 3 campos de reembolso persistidos · [ ] Aviso legal CDC Art. 49 · [ ] Estados §2.12 · [ ] Flat §2.16 (exceção card crítico) · [ ] a11y AA · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Transferência e troca de ingresso (T3); execução do reembolso e fila de análise (E09-S904).

#### LEELA-S305-T3 · Transferência de titularidade (flag, 72h, taxa) e troca de ingresso (48h, downgrade) [greenfield]

- **Tipo:** screen · **Depende de:** S305-T1, S305-T2 · **Estimativa:** M

**Objetivo**
Acrescentar à aba "Política de vendas" os blocos de transferência de titularidade (flag habilitada, janela em horas, taxa) e de troca de ingresso do mesmo titular (flag, janela em horas, reembolso no downgrade), com salvamento e Toast.

**Contexto & referências**
- Tela: greenfield (mesma aba de T2).
- RNs: RN-343 (transferência), RN-344 (troca de ingresso), RN-200/301 (diferença de upgrade pelo lote vigente); ADR-011.
- Mocks: transferência habilitada, 72h, taxa R$ 0; troca de ingresso 48h, downgrade sem reembolso.
- Componentes DS: Toggle (habilitada), Input (janela/taxa), Toggle (`permiteReembolsoDowngrade`), Button, Toast, ConfirmModal (desabilitar transferência com solicitações abertas — §2.15).

**Arquivos (criar/editar)**
- `apps/painel/app/eventos/[slug]/configuracoes/politica-vendas/_components/TransferenciaForm.tsx`
- `apps/painel/app/eventos/[slug]/configuracoes/politica-vendas/_components/TrocaIngressoForm.tsx`

**Passos de implementação**
1. Bloco transferência: Toggle `habilitada`, Input `janelaHoras` (default 72), Input `taxa` (default 0) — RN-343.
2. Bloco troca de ingresso: Toggle `habilitada`, Input `janelaHoras` (default 48), Toggle `permiteReembolsoDowngrade` (default off); nota "upgrade cobra a diferença pelo lote vigente (RN-200/301)" — RN-344.
3. Desabilitar transferência quando há solicitação aberta → `ConfirmModal` com preview (§2.15).
4. Salvar → Toast; estados §2.12.

**Modelo de dados / contratos**
- Lê/escreve `politicaVendas/{unico}.transferencia` e `.trocaIngresso` (S305-T1).

**Regras de negócio a respeitar**
- RN-343 (flag/72h/taxa), RN-344 (upgrade diferença/downgrade sem reembolso/48h); ADR-011 (por inscrito); §2.15 ao desabilitar.

**Critérios de aceite (testáveis)**
- **Dado** transferência habilitada, **quando** salvo, **então** `transferencia.habilitada=true`, janela 72h e taxa persistem.
- **Dado** troca de ingresso, **quando** deixo `permiteReembolsoDowngrade` off, **então** o downgrade não gera reembolso (persistido).
- **Dado** desabilitar transferência, **quando** confirmo no ConfirmModal, **então** persiste + Toast.

**Testes a escrever**
- unit: render/validação dos dois blocos; toggle de downgrade.
- e2e: habilitar transferência + configurar troca → salvar → Toast.

**Definition of Done**
- [ ] Transferência (RN-343) e troca (RN-344) persistidas · [ ] Downgrade configurável · [ ] Desabilitar via §2.15 · [ ] Estados §2.12 · [ ] a11y AA · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Execução da transferência/troca no app do atleta (E13-S1316); estorno e cobrança da diferença (E09-S904 / E12).

---

### LEELA-S306 · Configuração de exigências de saúde e versionamento de regulamento (organizador) · (greenfield · sem de-para BH)

> **Status 2026-07-17 (O3-L1, backend Fable `800f0d6`):** T1+T3 ATERRISSADOS com review antagonista LGPD (APPROVE-COM-FIXES aplicados: idempotência de redelivery no bump por hash do texto; expurgo com probe — nunca retenção eterna em ciclo reaberto). Notas de implementação: o "upload de regulamento" da spec virou o campo TEXTO `regulamento` já vigente (EVENTO-CAMPOS) — a versão (`regulamentoVersao`) bumpa via trigger `versionarRegulamento` quando o texto muda; retenção do dado de saúde = **90 dias pós-evento** (premissa jurídica ajustável, `RETENCAO_SAUDE_DIAS_POS_EVENTO`); pendência de DEPLOY: índice composto `eventos(status,data)` + collection-group `saude.eventoId`. Resta **T2** (aba no painel, Opus — backend do versionamento pronto).

**Como** Organizador de Evento, **quero** ativar exigências de saúde por evento e versionar o regulamento, **para** cumprir requisitos regulatórios sem coletar dado sensível desnecessário nem invalidar aceites antigos.

- **MoSCoW:** Should · **Estimativa:** L · **Superfície:** Painel
- **Tela(s) de referência:** greenfield (nova aba "Exigências e regulamento" em Configurações; upload de regulamento estende `Configuracoes-Evento.html` / E03-S201-T1)
- **RNs:** RN-146, RN-147, RN-149, RN-144 (contexto retenção/LGPD), LGPD Art. 11, §2.12, §2.15

> **Escopo de saúde: mínimo + flag.** Atestado e PAR-Q são **opcionais, desligados por padrão** (minimização LGPD, RN-146). Nada de tipo sanguíneo/histórico médico. O dado sensível vive isolado na subcoleção `saude`, com base legal, acesso restrito e retenção próprios (LGPD Art. 11, RN-147). O **contato de emergência** (obrigatório) e o **aceite de regulamento** no checkout são de E12-S1207; aqui só a **configuração** e o **versionamento**.

**Critérios de aceite (Given/When/Then):**
- **Dado** o evento, **quando** abro a aba de exigências, **então** ativo/desativo `exigenciasSaude.atestado` e `exigenciasSaude.parq` por flag; ambos ficam desligados por padrão (minimização LGPD, RN-146).
- **Dado** uma exigência de saúde ativa, **quando** um inscrito preenche, **então** o dado vai para a subcoleção condicional `eventos/{id}/inscritos/{id}/saude/{unico}` (`atestadoUrl?`, `parqRespostas?`, `consentimentoSaudeEm`), isolada do doc do inscrito.
- **Dado** a natureza sensível do dado de saúde (LGPD Art. 11), **quando** modelado, **então** a base legal é consentimento específico e destacado ou tutela da saúde/proteção da vida, o acesso é restrito ao owner do evento + admin (nunca afiliado/patrocinador) e a retenção é limitada ao ciclo do evento + janela legal, com expurgo programado após (RN-147).
- **Dado** as Security Rules da subcoleção `saude`, **quando** um afiliado ou patrocinador tenta ler, **então** o acesso é negado.
- **Dado** o regulamento, **quando** publico uma nova versão, **então** inscritos futuros precisam de novo aceite e inscritos antigos mantêm o registro da versão que aceitaram (RN-149).
- **Dado** o upload de regulamento (estende E03-S201-T1), **quando** salvo, **então** grava `regulamentoVersao`, `regulamentoUrl` e `regulamentoAtualizadoEm` no evento.

**Tasks:** LEELA-S306-T1, LEELA-S306-T2, LEELA-S306-T3

#### LEELA-S306-T1 · Flags `exigenciasSaude{atestado,parq}` no evento + campos de regulamento

- **Tipo:** data-model · **Depende de:** E03-S200-T1 (Evento), E03-S201-T1 (upload de regulamento) · **Bloqueia:** S306-T2, S306-T3 · **Estimativa:** S

**Objetivo**
Estender o doc do evento com as flags de exigência de saúde (atestado, PAR-Q — ambas default off, minimização LGPD) e os campos de versionamento de regulamento, expondo-os na aba de configuração.

**Contexto & referências**
- RNs: RN-146 (opt-in por flag), RN-149 (versionamento); LGPD (minimização).
- Modelo: `eventos/{id}` — `exigenciasSaude{ atestado:bool, parq:bool }`, `regulamentoVersao`, `regulamentoUrl` (upload já existe em E03-S201), `regulamentoAtualizadoEm`.
- Greenfield: sem HTML de protótipo (aba nova em Configurações).

**Arquivos (criar/editar)**
- `packages/core/src/eventos/exigenciasSaude.ts` — `type ExigenciasSaude`.
- `packages/core/src/eventos/evento.ts` — estende `Evento` com `exigenciasSaude`, `regulamentoVersao`, `regulamentoAtualizadoEm` (sem remover campos existentes).
- `packages/api-client/src/eventos/evento.ts` — leitura/escrita das flags e campos de regulamento.
- `apps/painel/app/eventos/[slug]/configuracoes/exigencias/page.tsx` (aba Exigências e regulamento)
- `apps/painel/app/eventos/[slug]/configuracoes/exigencias/_components/ExigenciasSaudeForm.tsx`

**Passos de implementação**
1. `type ExigenciasSaude = { atestado: boolean; parq: boolean }` — default `{ atestado:false, parq:false }` (RN-146).
2. Estender `Evento` com `exigenciasSaude`, `regulamentoVersao`, `regulamentoAtualizadoEm` (preservando os campos atuais).
3. Aba com dois Toggles (atestado, PAR-Q) desligados por padrão + nota de minimização LGPD; salvar → Toast.
4. Autorização: só a equipe autorizada (S304-T1) altera as flags; leitura conforme papel.

**Modelo de dados / contratos**
- `eventos/{id}.exigenciasSaude`, `.regulamentoVersao`, `.regulamentoAtualizadoEm`.

**Regras de negócio a respeitar**
- RN-146 (flags default off; minimização); autorização por papel (S304-T1).

**Critérios de aceite (testáveis)**
- **Dado** um evento novo, **quando** leio, **então** `exigenciasSaude.atestado=false` e `.parq=false` (default).
- **Dado** o organizador, **quando** ativa a flag de atestado, **então** persiste + Toast.

**Testes a escrever**
- unit: default off; derivação de tipo (`core`).
- integração: escrita das flags só pela equipe autorizada (emulator).

**Definition of Done**
- [ ] Flags default off (RN-146) · [ ] Campos de regulamento no evento · [ ] Gate por papel · [ ] Estados §2.12 · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Subcoleção sensível `saude` (T2); versionamento/novo aceite (T3); coleta no checkout (E12/E13).

#### LEELA-S306-T2 · Subcoleção sensível `inscritos/{id}/saude/{unico}` + Rules restritas + nota LGPD Art. 11

- **Tipo:** data-model · **Depende de:** S306-T1 · **Bloqueia:** — · **Estimativa:** M

**Objetivo**
Criar a subcoleção condicional de dados de saúde do inscrito, isolada do doc do inscrito, com Security Rules que restringem o acesso ao owner do evento + admin (nunca afiliado/patrocinador) e documentar a base legal, minimização e retenção (LGPD Art. 11).

**Contexto & referências**
- RNs: RN-147 (sensível LGPD Art. 11); RN-146 (só quando exigido); RN-144 (contexto retenção/export 90 dias).
- Modelo: `eventos/{id}/inscritos/{inscritoId}/saude/{unico}` — `atestadoUrl?`, `parqRespostas?`, `consentimentoSaudeEm`.
- Isolamento em subcoleção própria facilita expurgo e regra de acesso.

**Arquivos (criar/editar)**
- `packages/core/src/eventos/saudeInscrito.ts` — `type SaudeInscrito`.
- `functions/firestore.rules` — Rules de `inscritos/{id}/saude` (leitura/escrita só owner do evento + admin; afiliado/patrocinador negados).
- `functions/src/eventos/expurgarSaude.ts` — job programado de expurgo após o ciclo do evento + janela legal (retenção).

**Passos de implementação**
1. `type SaudeInscrito = { atestadoUrl?: string; parqRespostas?: Record<string, unknown>; consentimentoSaudeEm: Timestamp }`.
2. Rules: `read, write` só se `isOwner(eventoId) || isAdmin(eventoId)` (papéis de S304-T1); afiliado/patrocinador sempre negados; sem escrita sem `consentimentoSaudeEm` registrado.
3. Base legal (RN-147): consentimento específico e destacado do titular OU tutela da saúde/proteção da vida (Art. 11, II) — nunca "execução de contrato".
4. Minimização: o doc só existe quando `exigenciasSaude` está ativa (S306-T1); PAR-Q/atestado conforme flag.
5. Retenção: `expurgarSaude` agenda o expurgo após o ciclo do evento + janela legal (alinha RN-144, mas saúde tem retenção própria).

**Modelo de dados / contratos**
- `inscritos/{id}/saude/{unico}` (subcoleção condicional). Escrita mediada por consentimento; acesso restrito por Rules.

**Regras de negócio a respeitar**
- RN-147 (sensível: base legal, acesso restrito, retenção/expurgo); RN-146 (só quando exigido).

**Critérios de aceite (testáveis)**
- **Dado** um afiliado ou patrocinador, **quando** tenta ler `saude`, **então** a Rule nega.
- **Dado** o owner do evento (ou admin), **quando** lê `saude`, **então** a Rule permite.
- **Dado** um evento sem exigência ativa, **quando** consulto, **então** a subcoleção não é criada.

**Testes a escrever**
- unit: tipo/consentimento obrigatório (`core`).
- integração: Rules (emulator) — owner/admin permitido; afiliado/patrocinador negado; expurgo programado.

**Definition of Done**
- [ ] Subcoleção isolada · [ ] Rules owner+admin (afiliado/patrocinador negados) · [ ] Nota LGPD Art. 11 (base legal, minimização, retenção) · [ ] Expurgo programado · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Coleta do dado no checkout/app (E12/E13); consentimento LGPD genérico do checkout (separado — E12-S1207).

#### LEELA-S306-T3 · Versionamento de regulamento (novo aceite em versão nova, registro da versão vigente)

- **Tipo:** api/function · **Depende de:** S306-T1, E03-S201-T1 (upload de regulamento) · **Estimativa:** M

**Objetivo**
Ao publicar uma nova versão do regulamento, incrementar `regulamentoVersao` e `regulamentoAtualizadoEm` no evento e garantir que inscritos futuros exijam novo aceite, preservando o registro da versão que cada inscrito antigo aceitou (RN-149).

**Contexto & referências**
- RNs: RN-149 (versionamento; aceite antigo preservado); RN-148 (aceite de regulamento no inscrito — definido em E12-S1207).
- Modelo: `eventos/{id}.regulamentoVersao`, `.regulamentoAtualizadoEm`; leitura de `inscritos/{id}.regulamentoAceite{ versao, aceitoEm }` (persistido em E12-S1207, não reescrito aqui).

**Arquivos (criar/editar)**
- `functions/src/eventos/publicarRegulamento.ts` — incrementa versão + timestamp ao subir nova versão.
- `packages/core/src/eventos/regulamento.ts` — `precisaNovoAceite(inscritoVersao, eventoVersao)` (puro).

**Passos de implementação**
1. `publicarRegulamento(eventoId, url)`: grava `regulamentoUrl`, incrementa `regulamentoVersao`, seta `regulamentoAtualizadoEm` (estende E03-S201-T1 sem removê-lo).
2. `precisaNovoAceite`: retorna true quando `inscritoVersao < eventoVersao` (RN-149).
3. Inscritos antigos mantêm `regulamentoAceite.versao` (nunca sobrescrito por nova versão).
4. O novo aceite é coletado no checkout/app (E12-S1207/E13); aqui só a versão vigente e a derivação.

**Modelo de dados / contratos**
- `eventos/{id}.regulamentoVersao` (monotônica); derivação `precisaNovoAceite` em `core`.

**Regras de negócio a respeitar**
- RN-149 (nova versão exige novo aceite; aceite antigo preservado); escrita da versão só pela equipe autorizada.

**Critérios de aceite (testáveis)**
- **Dado** a versão 2 publicada, **quando** um inscrito com aceite v1 é avaliado, **então** `precisaNovoAceite` = true.
- **Dado** um inscrito que aceitou v1, **quando** publico v2, **então** o registro `regulamentoAceite.versao=1` do inscrito antigo permanece intacto.
- **Dado** o upload de nova versão, **quando** salvo, **então** `regulamentoVersao` incrementa e `regulamentoAtualizadoEm` atualiza.

**Testes a escrever**
- unit: `precisaNovoAceite` (limites de versão) em `core`.
- integração: `publicarRegulamento` incrementa versão (emulator); aceite antigo preservado.

**Definition of Done**
- [ ] Versão incrementa + timestamp · [ ] `precisaNovoAceite` puro e testado · [ ] Aceite antigo preservado (RN-149) · [ ] (ver `definition-of-done.md`)

**Fora de escopo**
Coleta do aceite no checkout/app (E12-S1207/E13); conteúdo/armazenamento do PDF de regulamento (E03-S201).

---

### LEELA-S307 · Capacidade de lote editável — reabrir vagas pelo organizador · (greenfield · decisão Vitor 2026-07-17)

> **Status 2026-07-17 (O3-L1): T1 IMPLEMENTADA** — `73395ed` + gate devido `b615559` (callable `ajustarCapacidadeLote` owner-only; A1-A4 provados no emulator 10/10; review antagonista em contexto fresco APPROVE-COM-FIXES — ids com `/` rejeitados, ataques NaN/Infinity/string/negativo/papel-de-evento cobertos; riscos residuais registrados no commit). **Resta T2 (tela, Opus).** Decisão original ratificada pelo Vitor em 2026-07-17 (painel `DECISOES-ABERTAS.md`, item 4); reusa o kernel de lotes (S300-T1/T2).

**Como** Organizador de Evento, **quero** ver e ajustar a capacidade de cada lote (quanto foi configurado, vendido e está disponível) e reabrir vagas aumentando a capacidade, **para** voltar um lote à venda pelo painel, sem suporte nem planilha.

- **MoSCoW:** Should · **Estimativa:** M · **Superfície:** Painel
- **Tela(s) de referência:** aba "Lotes" da Página de Vendas (S300-T4) — painel de capacidade por lote (sem mockup dedicado; segue o DS)
- **RNs:** RN-304, RN-300 (ratchet mantido), RN-200 (bloqueia preço, não capacidade), §2.5, §2.12, §2.15

**Critérios de aceite (Given/When/Then):**
- **Dado** um lote, **quando** abro o painel de capacidade, **então** vejo `configurado`, `vendido` e `disponível` (= `configurado` − `vendido`) por lote.
- **Dado** um lote esgotado (capacidade 100 / 100 vendidos), **quando** aumento a capacidade para 150 e salvo, **então** reabrem 50 vagas e o lote pode voltar a vender (RN-304).
- **Dado** um lote com 100 vendidos, **quando** tento definir capacidade abaixo de 100, **então** a operação é rejeitada (fail-closed) com mensagem honesta e nada é gravado.
- **Dado** um cancelamento sem estorno, **quando** ocorre, **então** a vaga NÃO volta sozinha (ratchet automático de RN-300 permanece); só o organizador reabre subindo a capacidade (RN-304).
- **Dado** qualquer alteração de capacidade, **quando** salvo, **então** a escrita passa por Function (nunca write direto do cliente) e fica registrada na trilha de auditoria (quem, quando, de/para).

**Tasks:** LEELA-S307-T1 (backend guard), LEELA-S307-T2 (tela) — backlog aprovado, implementação pós-LEELA-BEPEND.

#### LEELA-S307-T1 · Function `ajustarCapacidadeLote` (aumentar capacidade, fail-closed ao reduzir, auditoria) · [backlog — não implementar]

- **Tipo:** api/function · **Depende de:** S300-T1 (modelo `lotes`), S300-T2 (kernel de virada/ratchet) · **Bloqueia:** S307-T2 · **Estimativa:** S

**Objetivo**
Guardar a edição de capacidade do lote no servidor: só o organizador (owner do evento) ajusta `qtdLimite`; aumentar reabre vagas; reduzir abaixo de `qtdVendida` é negado (fail-closed); cada alteração grava trilha de auditoria.

**Contexto & referências**
- RNs: RN-304, RN-300 (ratchet), RN-200 (bloqueio de PREÇO — capacidade não é preço, permanece editável com venda).
- Modelo: `lotes/{loteId}` (`qtdLimite`, `qtdVendida`, `status`). O `qtdVendida` (∑) segue mantido só por Function (S300-T2); `ajustarCapacidadeLote` nunca o altera.

**Arquivos (previstos — criar no lote futuro)**
- `functions/src/eventos/ajustarCapacidadeLote.ts` — callable owner-only.
- `packages/core/src/eventos/capacidadeLote.ts` — `podeReduzirCapacidade(lote, novaCapacidade)` puro (novaCapacidade ≥ qtdVendida).
- `functions/firestore.rules` — `qtdLimite` write:false para cliente (já é o padrão de agregado; capacidade escreve só por Function).
- trilha de auditoria: subdoc/coleção de auditoria do evento (quem/quando/de/para) — reusar o padrão de trilha existente (ex.: `auditoriaAcessos` do E09).

**Regras de negócio a respeitar**
- RN-304 (aumentar reabre; reduzir < vendido negado; escrita só por Function; auditoria); ratchet de RN-300 intacto.

**Critérios de aceite (testáveis)**
- **Dado** capacidade 100 e 100 vendidos, **quando** subo para 150, **então** persiste 150 e o disponível vira 50.
- **Dado** 100 vendidos, **quando** tento 80, **então** `failed-precondition` e nada muda.
- **Dado** um cliente tentando escrever `qtdLimite` direto, **quando** persiste, **então** a Rule nega.
- **Dado** um ajuste válido, **quando** confirma, **então** a auditoria registra ator, timestamp e de/para.

**Fora de escopo**
Devolução automática de vaga em cancelamento (proibida por RN-300 — ratchet); UI (T2).

#### LEELA-S307-T2 · Tela de capacidade por lote (configurado / vendido / disponível + editar e salvar) · [backlog — não implementar]

- **Tipo:** screen · **Depende de:** S307-T1, S300-T4 (tela de Lotes) · **Estimativa:** S

**Objetivo**
Na aba Lotes, mostrar por lote `configurado` / `vendido` / `disponível` e permitir editar a capacidade (aumentar) com confirmação, refletindo a reabertura de vagas.

**Contexto & referências**
- Tela: aba Lotes da Página de Vendas (S300-T4), sem mockup dedicado — segue o DS (Table densa §2.5, ConfirmModal §2.15, estados §2.12).
- RNs: RN-304, §2.5, §2.12, §2.15.

**Arquivos (previstos — criar no lote futuro)**
- `apps/painel/app/eventos/[slug]/pagina-vendas/_components/CapacidadeLote.tsx` (ou extensão do `LoteModal`/tabela de lotes existente).

**Regras de negócio a respeitar**
- RN-304 (só aumentar habilitado; reduzir abaixo do vendido bloqueado no cliente com hint, servidor autoritativo); §2.15 na confirmação; §2.12 nos estados.

**Critérios de aceite (testáveis)**
- **Dado** os lotes, **quando** abro, **então** vejo `configurado`/`vendido`/`disponível` por lote.
- **Dado** um lote esgotado, **quando** aumento a capacidade e confirmo, **então** Toast de sucesso e o disponível reflete a reabertura.
- **Dado** uma tentativa de reduzir abaixo do vendido, **quando** informo o valor, **então** o botão bloqueia com hint; se o servidor recusar, Toast honesto.

**Fora de escopo**
Backend guard/auditoria (T1); qualquer devolução automática de vaga.

---

> Histórias novas das rodadas de 2026-07-19 (TAXA-FLEX, DEC-0719-ret). Detalhe/verbatim em `02-rodadas/2026-07-19-taxa-flex/` e `-decisoes/`; regras em §"Regras de negócio novas (TAXA-FLEX...)" abaixo (RN-178) e RN-175. Molde igual ao de S1900 (E19).

### LEELA-S308 · Tabela de taxa da plataforma por meio de pagamento (percentual + valor fixo) · (de-para novo · TAXA-FLEX) · ✅ ENTREGUE

**Como** plataforma, **quero** definir a taxa como percentual + valor fixo por meio de pagamento (global, com exceção por organizador), **para** ter flexibilidade de cobrança (ex.: "6% PIX + R$2,00", "8% cartão + R$1,50").

- **MoSCoW:** Should · **Estimativa:** M · **Superfície:** Painel/config (dona da tabela) · **RNs:** RN-178 (tabela por meio), reconcilia RN-404/406 (E16)
- **Origem:** rodada TAXA-FLEX (Vitor, 2026-07-19). Verbatim: *"6% pix + 2,00 ou 8% de cartão + 1,50"*. A tela do super-admin que edita a tabela vive em E16 (S1606); aqui fica o **modelo da tabela** (a dona). Fila `03-fila-codigo (j)`.

**Critérios de aceite (Given/When/Then):**
- **Dado** o modelo de taxa, **quando** especifico, **então** a taxa é uma **tabela por meio** (`pix | cartao | boleto`) de `{percentual, fixoCentavos}`, com **global** em `platform/config` + **override por organizador** em `commercialTerms/current` (precedência organizador > global), **sem nível por-evento no v1**.
- **Dado** a escrita da tabela, **quando** um ator não-`platform_admin` tenta gravar (global ou override), **então** as Rules negam (fail-closed, RN-404).
- **Dado** o enum de meios, **quando** o checkout não oferece boleto, **então** a linha `boleto` fica **inerte** (especificada, não ativada — P-TAXAFLEX-2).

**Tasks:** `S308-T1` (modelo `platform/config` global + override `commercialTerms/current` + Rules escrita só `platform_admin`, fail-closed — RN-178/404; campos `conciliacao.taxaPct/taxaFixa` já existentes, reuso — `ec9b248`) ✅. **Status:** ✅ ENTREGUE 2026-07-19 (lote TAXA-FLEX, lane TAXAFLEX): tabela global gravada SÓ via callable `setTaxaPlataformaGlobal` (Rules de `platform/` seguem write:false p/ todo client); override PARCIAL por meio em `commercialTerms.taxaTabela` (linha ausente herda a global); precedência override > global > `platformFeePct` legado. Review antagonista Fable APROVADO COM FIXES (F1 da tela global pago). Report `outputs/leela-build-2d6ee98d/TAXA-FLEX-REPORT.md`. Detalhe em `02-rodadas/2026-07-19-taxa-flex/01-decisoes.md`.

### LEELA-S309 · Toggle "aceitar inscrição de estrangeiros" por evento · GATED · (de-para novo · DEC-0719-ret)

**Como** organizador, **quero** ligar por evento a aceitação de estrangeiros, **para** habilitar (só quando eu quiser) o checkout de quem não tem CPF.

- **MoSCoW:** Could · **Estimativa:** S · **Superfície:** Painel/config de evento · **RNs:** RN-175 (toggle), habilita RN-176 (E12) e RN-177 (E19)
- **Origem:** rodada DEC-0719-ret (Vitor, 2026-07-19). **GATED** pela liberação Asaas (o toggle sem o rail de pagamento não vende). Fila `03-fila-codigo (i)`.

**Critérios de aceite (Given/When/Then):**
- **Dado** o cadastro do evento, **quando** vejo a config, **então** há o toggle `aceitaEstrangeiros` com **default OFF**.
- **Dado** o toggle **OFF**, **quando** o checkout roda, **então** nada muda (CPF exigido, RN-173).
- **Dado** o toggle **ON**, **quando** o checkout roda, **então** habilita o fluxo de estrangeiro (RN-176) + documento tipado (RN-177).

**Tasks:** `S309-T1` (flag `aceitaEstrangeiros` no modelo do evento + UI do toggle na config — default OFF; RN-175). Detalhe em `02-rodadas/2026-07-19-decisoes/01-decisoes.md` §DEC-0719-ret. **Não despachar antes da liberação Asaas.**

### LEELA-S310 · Construtor de formulário de perguntas na config do evento · (de-para novo · FORMBUILDER)

**Como** organizador, **quero** montar perguntas personalizadas na config do evento, **para** coletar do inscrito, no momento da compra, os dados extras que o meu evento precisa.

- **MoSCoW:** Should · **Estimativa:** M · **Superfície:** Painel/config de evento (dona do modelo e do core) · **RNs:** RN-184 (tipos v1), RN-187 (limites), RN-188 (versionamento), ref RN-185/186/189
- **JTBD servido:** T · "coletar do participante o que o meu evento precisa, sem planilha paralela". Dimensão **Transacional**.
- **Origem:** rodada FORMBUILDER (Vitor, 2026-07-19). Destravou o construtor; corte de v1 = **só perguntas** (seleção única, múltipla, sim/não). Modelo e core são a **fonte única** — E05 e E12 reusam. Fila `03-fila-codigo (k)`.

**Critérios de aceite (Given/When/Then):**
- **Dado** a config do evento, **quando** abro o construtor, **então** posso criar perguntas dos tipos **seleção única, seleção múltipla e sim/não** (anexo **não** existe no v1 — fase 2), com opções por pergunta.
- **Dado** uma pergunta, **quando** a marco como **obrigatória**, **então** o flag persiste e valerá no render (RN-186, efeito em E12/E05).
- **Dado** o teto do formulário, **quando** passo de **20 perguntas** ou de **10 opções** por pergunta (defaults propostos, fonte única no core), **então** a validação bloqueia (RN-187).
- **Dado** que já há respostas, **quando** edito uma pergunta, **então** ela **versiona** (a versão antiga fica intacta; a edição vale para respostas futuras — RN-188). Nunca reescreve resposta antiga.

**Tasks:** `S310-T1` (modelo/core único em `packages/core/src/forms/` — `Formulario`/`Pergunta`, tipos `unica|multipla|sim_nao`, `obrigatoria`, `opcoes`, `versao`; tetos como constante única RN-187; helper de versionamento RN-188; modelo Firestore da subcoleção de formulário sob o evento + Rules server-only fail-closed), `S310-T2` (tela do construtor na config do evento — criar/editar/ordenar perguntas, marcar obrigatória, editar versiona). **Backlog:** fase 2: anexo de arquivo — detalhar quando for priorizado. Detalhe em `02-rodadas/2026-07-19-formbuilder-analise/01-decisoes.md`.

---

## Rastreabilidade (de-para BH-###)

| Story | De-para | Tela(s) de referência | Observação |
|---|---|---|---|
| LEELA-S300 | BH-300 | PaginaVendas-Conteudo.html, Pagina-Vendas-Modal-Lote/Cupom/Percurso.html | Lotes (RN-300), preço por percurso (RN-301), cupons; "Promovido por" descartado (RN-302) |
| LEELA-S301 | BH-301 | Promotores.html, Promotores-Modal-ConfigurarPrograma/Convidar.html, Promotores-Detalhe.html | Programa de afiliação (RN-310/311/312); clube read-only (RN-120); split via `PaymentProvider` |
| LEELA-S302 | BH-302 | Financeiro-Evento.html | Consolida com LEELA-S207 (E03); acrescenta repasses + payout |
| LEELA-S303 | BH-303 | Comunicacao-Evento.html, Comunicacao-Evento-Nova.html | Redirecionado para LEELA-E06 (não implementar em E04) |
| LEELA-S304 | BH-304 | Configuracoes-Evento.html, Config-Equipe.html | 4 papéis de permissão (RN-320) |
| LEELA-S305 | — (greenfield) | Configuracoes-Evento.html (nova aba "Política de vendas") | Política de reembolso/transferência/troca (RN-338/339/340/343/344); execução em E09-S904; por inscrito (ADR-011) |
| LEELA-S306 | — (greenfield) | Configuracoes-Evento.html (nova aba "Exigências e regulamento") | Exigências de saúde opt-in (RN-146), dado sensível LGPD Art. 11 isolado (RN-147), versionamento de regulamento (RN-149) |
| LEELA-S307 | — (greenfield · Vitor 2026-07-17) | aba Lotes da Página de Vendas (painel de capacidade, sem mockup) | Capacidade de lote editável (RN-304): reabre vagas, ratchet mantido, escrita via Function + auditoria · **backlog aprovado, pós-LEELA-BEPEND** |

## Capacidades transversais tocadas

- **PaymentProvider (ADR-006):** interface em `packages/core` (S301-T2), provider mock/sandbox, split de afiliação (`splitRules`), webhooks idempotentes/assinados, payout (`getPayout`). Gateway concreto fica para ADR futuro.
- **Domínio Leela:** todo slug/URL/link master usa `{DOMINIO_LEELA}` (a definir); os mocks `be-hero.com.br`/`beh.ro` são marcados para troca e nunca fixados.
- **Copy:** Toasts e headers do glossário (`HANDOFF-07`) — "Link master de [evento] copiado", "Cupom [código] copiado", "Termos do programa de afiliação" (read-only clube), "Página despublicada", "Nenhum promotor encontrado com os filtros aplicados.".

## Ordem sugerida

`S300-T1` (modelo página/lotes/cupons) → `S300-T2` (virada de lote + preço vigente) → `S300-T3..T6` (editor + modais) → `S301-T1` (afiliação) + `S301-T2` (PaymentProvider) → `S301-T3` (conversão/split) → `S301-T4..T7` (UI promotores) → `S302-T2` (agregado de repasse) → `S302-T1` (tela financeira, consolida S207) → `S304-T1` (equipe/4 papéis/claims) → `S304-T2..T3` (config + equipe). `S303` é apenas rastreabilidade (implementação em E06). Em paralelo à trilha de vendas, `S305-T1` (modelo `politicaVendas`) → `S305-T2..T3` (aba de política) e `S306-T1` (flags de saúde + campos de regulamento) → `S306-T2` (subcoleção sensível `saude` + Rules) + `S306-T3` (versionamento de regulamento) entregam a **configuração** de política pós-venda e compliance; a **execução** do reembolso/estorno fica em E09-S904 e a coleta (contato de emergência/aceite/saúde) no checkout fica em E12-S1207/E13. Ao fim, o épico fecha o ciclo de vendas e repasse ponta a ponta com os mocks de HANDOFF-05, sobre a interface `PaymentProvider` (sem gateway concreto).

## Regras de negócio novas (Vitor 2026-07-12 — ratificadas em conversa, números propostos)

- **RN-347 (proposta) · Taxa incorporada vs. repassada — config do organizador POR EVENTO.** Em `commercialTerms` do evento (aba "Política de vendas", S305 / config S304), o organizador escolhe o modo da taxa Leela: **incorporada** (comprador paga o preço de face; a taxa é descontada do repasse — é débito no fluxo de caixa do organizador) ou **repassada** (comprador paga face + taxa; a taxa vai à Leela e NUNCA entra no fluxo/"a receber" do organizador). Reconcilia com a taxa por método (10% cartão / 8% PIX, ou %+fixo, decisão 2026-07-05). Impacto: toggle nesta config (E04) · cálculo de repasse (E09, RN-348) · exibição no total do comprador (E12/checkout — `computeSaleState` já calcula a taxa; o modo decide QUEM paga).
- **RN-303 (proposta) · Modo de venda "somente via cupom" (evento fechado).** Benchmark TicketSports: o evento pode ser configurado para aceitar inscrições SÓ com cupom válido (vendas fechadas ao público geral). Config por evento junto de cupons (S300); o checkout público (E12) bloqueia sem cupom válido, com mensagem honesta. Relaciona-se a E18 (assessorias parceiras = clubes com desconto exclusivo via cupom de clube).
- **Kit ← modalidade no checkout:** já coberto neste épico e em E12 (kits filtrados pela modalidade escolhida; vários kits por modalidade) — implementado em 2026-07-12 (`dc57504`).
- **S300-T6 (PercursoModal) SUPERSEDED por ADR-012 (2026-07-13):** com lote-por-modalidade, o preço por percurso é o preço do lote ativo da modalidade (RN-301 atendida pela tela de Lotes). Modal separado de preço por percurso recriaria uma segunda fonte de preço. Reverter apenas se for desejado preço-base fora de lote.
- **Reconciliação cupom ao kernel S300-T1 (2026-07-13, kernel = autoridade):** tipo do cupom é `percentual|fixo` (não `percentual|valor`); NÃO existe `tetoDesconto` persistido — o teto é DERIVADO em `descontoDoCupom` (clamp ao preço-base); validade é janela OBRIGATÓRIA `inicioEm<fimEm` (não `validadeAte?` opcional); não há `status` persistido (derivado da janela/usos). O texto original de S300-T5 e do brief E04-L1 fica superado nesses 4 pontos.

## Regras de negócio novas (TAXA-FLEX · Vitor 2026-07-19)

Rodada `02-rodadas/2026-07-19-taxa-flex/`. A taxa da plataforma passa a ser **percentual + valor fixo por venda, variável por meio de pagamento** (verbatim do Vitor: *"6% pix + 2,00 ou 8% de cartão + 1,50"*). Fecha o par percentual+fixo (decisão 2026-07-05) e a taxa por método, agora com o **fixo também por meio** e uma **tabela** por meio. Delta completo em `02-rns-delta.md`.

- **RN-178 · Tabela de taxa-flex por meio de pagamento (dona = E04).** A taxa da plataforma deixa de ser um `platformFeePct` único e vira uma **tabela por meio** (`pix | cartao | boleto`) de `{percentual, fixoCentavos}`. **Tabela GLOBAL** (default de todos os tenants) em `platform/config` + **exceção/override por organizador** em `commercialTerms/current` do tenant (precedência **organizador > global**). **Sem nível por-evento no v1** (decisão ratificada por AskUserQuestion 2026-07-19). Escrita **exclusiva de `platform_admin`** nos dois níveis (RN-404); um ator "comercial" que edite o override negociado por contrato é **futuro** (registrado, não aberto no v1). Generaliza RN-330 (taxa sobre receita bruta) e RN-406 (fonte da taxa), que passam a ler a linha do meio do pagamento em vez de um percentual único. Impacto: config global (E16/`platform/config`) + override (este épico/`commercialTerms`) · cálculo (E09) · exibição por meio (E12).
  - *Boleto (P-TAXAFLEX-2):* a linha `boleto` existe na tabela por completude do enum, mas fica **inerte** enquanto o checkout público não oferecer boleto (`pagamentos.forma ∈ {cartao_credito, pix}`). Especificada, não ativada.
  - *Componente fixo (P-TAXAFLEX-4):* `fixoCentavos` é inteiro (centavos), nunca reais fracionários — casa com o rateio de maior resto (RN-181) e o half-up (RN-183).

## Regras de negócio novas (FORMBUILDER · Vitor 2026-07-19)

Rodada `02-rodadas/2026-07-19-formbuilder-analise/`. O construtor de formulário de perguntas saiu de análise-futura (captura `00-captura.md`) para executável; corte de v1 = **só perguntas** (seleção única, múltipla, sim/não). Anexo de arquivo = **fase 2 GATED** (uma linha de backlog, sem elaboração). Este épico é **dono do modelo e do core** (fonte única); E05 e E12 reusam. Delta completo em `02-rns-delta.md`.

- **RN-184 · Construtor de formulário + tipos de pergunta v1 (dono do modelo = E04).** O organizador monta perguntas personalizadas exibidas na compra do evento (E12) e na inscrição de clube (E05). Tipos do v1: **seleção única** (radio), **seleção múltipla** (checkbox), **sim/não**. **Anexo NÃO entra no v1** (fase 2). O **enum de tipos é fonte única no core** (`packages/core/src/forms/`), sem duplicar por superfície.
- **RN-187 · Limites com fonte única no core.** Teto de **perguntas por formulário** e de **opções por pergunta** como constante única no core (default proposto: **20 perguntas / 10 opções**), no padrão do `PIX_EXPIRACAO_SEGUNDOS` (RN-157). O Vitor ajusta os números num lugar só.
- **RN-188 · Versionamento da pergunta.** Editar uma pergunta com respostas existentes **versiona**: a resposta carimba a versão no ato, a versão antiga fica intacta, a edição vale para o futuro. **Nunca reescreve resposta antiga.** Mesmo desenho do termo de saúde (RN-149) e do regulamento versionado (S306-T3).
- *Efeito (RN-185/186/189 — donas em E05/E12):* a resposta vive no **inscrito/membro** (nunca no pedido — RN-185); pergunta obrigatória **bloqueia o pagar/inscrever no fence dos aceites** (RN-186); leitura/export pelo organizador/equipe do tenant **reusa a lista de inscritos existente** (RN-189).

## Plano de execução (ESPEC-SWEEP · 2026-07-19)

Este épico entra na **Onda 4 · item 1** (caminho do dinheiro em curso). O que resta dele, com passo a passo, território e rota de modelo, está em `02-rodadas/2026-07-19-espec-sweep/02-caminho-do-dinheiro.md`:

- **S310-T1/T2** (construtor de formulário) — bloco C. E04 é **dono do modelo e do core**; E05 e E12 reusam. Rota **opus** xhigh; T1 com review antagonista (Rules).
- **S309** (toggle de estrangeiro) — bloco D, **GATED** pela liberação da conta Asaas. Não despachar.
- **S308** (tabela de taxa) — ✅ entregue na TAXA-FLEX.

Nada mais deste épico está na fila da Onda 4.

---

## Nota de fronteira (IA-MENU · 2026-07-19) — a aba de Caixa do evento é do E03

Rodada `02-rodadas/2026-07-19-ia-menu/`. Na reorganização do menu, o evento ganhou uma aba de **Caixa** (o macro do dinheiro daquele evento). O dono é o **E03**, não este épico — a regra canônica é a **RN-235**, especificada lá.

**A linha divisória:** o E04 define **sob quais regras** o dinheiro entra (lotes, preços, cupons, política de vendas, taxa por meio de pagamento — RN-178 a RN-183); o E03 mostra **o que entrou** depois que as regras rodaram. Caixa é resultado de operação, não configuração. A aba já vivia sob `EventoLayout` com a matriz de papéis da operação do evento, o que confirma a fronteira na prática.

O que este épico **continua** possuindo e que alimenta aquela tela: o congelamento da taxa na cotação (RN-179), o modo da taxa por evento (RN-347, fio no E09) e a tabela por meio de pagamento (RN-178). Mudança na aba de Caixa nunca é motivo para tocar essas regras — e mudança nessas regras precisa checar o efeito na Caixa.

---

## Delta FormBuilder · o formulário vira template (SPECS-0728 · 2026-07-28)

Rodada `02-rodadas/2026-07-28-formbuilder-templates/`. A DEC-0728B tirou o construtor da
configuração do evento e deu a ele uma biblioteca própria no menu principal. Este épico
**continua dono** do modelo, do core e agora da biblioteca; o que muda é onde a tela mora.
Delta completo em `01-decisoes-delta.md` e `02-rns-delta.md` da rodada.

### Regras de negócio novas (FORMBUILDER-TEMPLATES)

- **RN-389 · Formulário é template com casa própria no menu principal (dona = E04).** A
  biblioteca vive em `profissionais/{profId}/formularios/{formularioId}` e é alcançada por
  item próprio do menu. O construtor **sai** da config do evento e da config do clube, que
  passam a **escolher** um template pronto. Supersede parcial da RN-184 na superfície e da
  RN-189 na parte de builder; o corte de v1, a fonte única no core e o export pela lista de
  inscritos permanecem. Supersede parcial do inventário da RN-233 (seis áreas viram sete),
  com os dois invariantes dela preservados: item de menu sem rota segue proibido e o
  catálogo do design system segue sendo a fonte, sem filtro no consumidor.
- **RN-390 · Vínculo por versão publicada (dona = E04).** O template tem rascunho e versões
  publicadas. Evento e clube guardam `formularioId` **e** a versão vigente no ato do
  vínculo. Publicar versão nova **não** migra vínculo existente; a config sinaliza que há
  versão mais nova e oferece atualizar por ação explícita. A resposta segue carimbando a
  versão exibida (RN-188, agora a do template).
- **RN-391 · Navegação e permissão da biblioteca (dona = E04).** Criar, editar, publicar e
  arquivar template é de quem administra o tenant; **vincular** é de quem já configura
  aquele evento ou clube, pelos mesmos quatro papéis da RN-320. Sem papel de configuração,
  o seletor aparece em leitura. Nenhum papel novo.
- **RN-392 · Ciclo de vida do template (dona = E04).** Estados `rascunho`, `publicado`,
  `arquivado`. Template vinculado **não** se exclui; arquivar tira do seletor de novos
  vínculos e não toca em vínculo vivo nem em resposta gravada. Exclusão só com zero
  vínculos.

### O que a DEC-0728B **não** mudou

RN-185 (resposta no inscrito e no membro), RN-186 (fence de obrigatoriedade), RN-187
(tetos, agora por versão), RN-188 (carimbo de versão), a parte de leitura e export da
RN-189, e o corte de v1 com anexo em fase 2. O E12 continua consumidor e o desenho do
render não muda; só a origem do que ele lê.

---

### LEELA-S313 · Biblioteca de formulários no menu principal · (de-para novo · FORMBUILDER-TEMPLATES)

**Como** organizador, **quero** montar formulários uma vez e reusar em vários eventos,
**para** parar de recriar as mesmas perguntas a cada prova.

- **MoSCoW:** Should · **Estimativa:** L · **Superfície:** Painel (área nova) · **RNs:** RN-389, RN-390, RN-391, RN-392, RN-184, RN-187, RN-188
- **JTBD servido:** T · "reaproveitar o que já montei em vez de recomeçar". Dimensão **Transacional**.
- **Origem:** DEC-0728B (2026-07-28).

**Critérios de aceite (Given/When/Then):**

- **Dado** o menu principal, **quando** olho a barra lateral, **então** existe um item
  Formulários com rota real, e o catálogo do design system é a fonte dessa lista (RN-389).
- **Dado** a biblioteca vazia, **quando** entro, **então** vejo estado vazio com a ação de
  criar o primeiro template, e não uma tabela em branco.
- **Dado** um template em rascunho, **quando** publico, **então** nasce a versão 1 e ele
  passa a aparecer no seletor de evento e de clube (RN-390).
- **Dado** um template publicado na versão 1 e vinculado a um evento, **quando** edito e
  publico a versão 2, **então** o evento continua na versão 1 e a config dele mostra que
  há versão mais nova, com ação explícita para atualizar (RN-390).
- **Dado** um template vinculado a pelo menos um evento, **quando** tento excluir, **então**
  a exclusão é negada e a caixa oferece arquivar, explicando que vínculos vivos e respostas
  gravadas não são tocados (RN-392).
- **Dado** um template arquivado, **quando** abro o seletor de um evento novo, **então** ele
  não aparece; e o evento que já o usava continua funcionando (RN-392).
- **Dado** um usuário sem papel de administração do tenant, **quando** abro a biblioteca,
  **então** vejo os templates em leitura e as ações de criar, publicar e arquivar não estão
  disponíveis (RN-391).
- **Dado** um template com 20 perguntas, **quando** tento acrescentar a vigésima primeira,
  **então** a validação bloqueia pelo teto do core (RN-187).

**Tasks:** `S313-T1` (item de menu e rota, com catálogo do design system, stories, docs,
`LLM.txt` e suíte do Sidebar reconciliados no mesmo lote), `S313-T2` (biblioteca: lista,
criar, editar, duplicar, publicar versão, arquivar, excluir só sem vínculo).

**Fora de escopo**
Compartilhar template entre tenants, e biblioteca de modelos prontos da Leela. Se for
desejado, volta como card.

---

### LEELA-S310 · reescrita pela DEC-0728B

A história continua existindo, com o mesmo objetivo de produto, e muda de conteúdo:

- **`S310-T1` (modelo e core) permanece**, acrescido de versão publicada e estado de ciclo
  de vida (RN-390, RN-392). O endereço do dado muda: sai a subcoleção de formulário sob o
  evento, entra a biblioteca `profissionais/{profId}/formularios/{id}` com subcoleção de
  versões.
- **`S310-T2` deixa de ser o construtor** e passa a ser o **seletor de template na
  configuração do evento**, mostrando a versão vinculada e o aviso de versão mais nova
  disponível.
- **`S310-T3` (novo)** — a resposta viaja como coluna do inscrito na lista e no export que
  já existem (RN-189, parte preservada).

O construtor propriamente dito virou a `S313`. Os critérios de aceite originais da S310
que falavam de criar e ordenar perguntas passam a valer na S313; os que falavam de
obrigatoriedade, tetos e versionamento continuam válidos e agora são provados lá.

**Nota de migração:** não há. O construtor nunca foi construído, então não existe
formulário gravado sob evento ou clube para mover. É por isso que este delta cabe antes do
código e não depois (P-FBT-3).

---

## Delta fronteira com o cupom pré-aplicado por link (SPEC-KITCUPOM · 2026-07-29)

A **D-0729-5** cria uma segunda porta para o cupom, e é importante escrever o que ela **não** faz
com o modelo deste épico.

**O modelo do cupom não muda.** Nenhum campo novo, nenhum enum novo, nenhum índice novo. Código,
tipo, valor, teto de uso, janela de validade, contador de usos e escopo continuam exatamente como
estão. O auto-apply envia à cotação o mesmo código que o campo manual enviaria.

**Não existe caminho de desconto paralelo.** O link e o campo manual do step 0 da S1209 terminam
no mesmo lugar: o mesmo código, a mesma cotação, a mesma recusa e a mesma mensagem opaca. Quem
decide se o cupom existe, se está vigente, se o gate do afiliado está aberto e quanto ele desconta
continua sendo o servidor, na cotação e de novo na criação da cobrança. O código digitado à mão
prevalece sobre o do link, por ser ação deliberada da pessoa.

**A leitura fechada do cupom continua fechada.** A restrição de leitura ao organizador, com o
motivo escrito no modelo ("enumerar cupons = vazar descontos"), permanece intacta. A faixa da
RN-431 **não lê cupom no cliente**: ela é alimentada por leitura server-side na landing, pelo
padrão de Admin SDK com gate no código que já é doutrina desde a S1200-T2, e nenhuma Security Rule
é afrouxada para isso.

**O que a RN-432 acrescenta em superfície de ataque, dito sem maquiagem.** A cotação pública já
responde a chamador anônimo se um cupom cola, então a verificação da faixa não abre uma classe
nova de vazamento. Ela abre um canal mais barato, porque dispensa montar uma cotação inteira, e
acrescenta o nome de quem indicou. As mitigações declaradas são resposta uniforme para toda causa
de recusa e cache curto por código na borda. Limite por endereço de origem não existe no
ferramental atual e não é reivindicado.

## Delta motor de juros do parcelamento (DEC-0802B · 2026-08-02/03 · RN-436 · história S314)

Rodada `02-rodadas/2026-08-02-retomada/`, spec em `04-spec-achados.md`, RNs em `05-rns-achados.md`.
Construído pela lane `ACHADOS-0802` (frente B) e revisado pela `ACHADOS-REV`, trace
`leela-build-2d6ee98d`. Deste épico é a história **S314** e a regra **RN-436**. A exibição do juro no
resumo é do E12 (RN-435) e a não-contaminação da receita é do E09 (RN-437).

### RN-436 · Parcelamento com juros usa tabela Price, e a parcela única não tem juros

A taxa de juros vem de `installmentRules.jurosAoMes` do **termo comercial do organizador**. Não
existe literal de percentual em código de cálculo. A simulação pedida pelo dono entra como
**2,89% a.m.** no dado semeado e substitui os 3,49% a.m. documentados na decisão de 2026-07-05, que
passam a estar corrigidos onde estavam escritos.

O cálculo é a tabela Price:

```
n = 1   →  parcela = PV                       (sem juros)
n ≥ 2   →  parcela = PV × i ÷ (1 − (1+i)^−n)
           total   = parcela × n
```

**A parcela única do cartão não carrega juros.** Price puro cobraria um mês, porque a fórmula assume
pagamento ao fim do período, e no cartão à vista o pagamento é imediato. Sem essa exceção a opção
"à vista" nasceria mais cara que o PIX com o mesmo rótulo, e o total à vista do resumo divergiria do
primeiro item da lista de parcelamento na mesma tela.

**O arredondamento é meio para cima em centavos inteiros, aplicado à parcela**, e o total é a parcela
multiplicada pelo número de parcelas. A ordem é normativa: como o gateway recebe o número de parcelas
mais o total e faz a própria divisão, um total múltiplo exato da parcela garante que a divisão dele
reproduz o número que a tela mostrou. **Piso do principal (fix DEF-1):** quando `parcela × n` ficaria
abaixo do valor, a parcela sobe um centavo — sem ele, com juros zero, R$ 35,00 em 6x cobrava
R$ 34,98 e o bloco de totais não fechava. Com juros ligados o piso nunca dispara, e os números desta
regra ficam byte a byte.

O cálculo é do servidor, com **fonte única no core**: a interface renderiza a lista recebida e não
faz nenhuma aritmética de dinheiro. Pedido já criado nunca é reprecificado por mudança posterior da
taxa de juros, pela mesma disciplina de congelamento da RN-179. O teto de parcelas e a parcela mínima
continuam do termo; com juros ligados a parcela sobe, então o corte pela parcela mínima passa a
acontecer antes, o que é comportamento correto e não vira exceção.

**RN-183 ampliada:** o arredondamento meio para cima em centavos passa a valer sobre a **parcela**, e
o total é a parcela multiplicada.

**Números de referência, medidos (PB-1, endossada pela review).** R$ 300,00 a 2,89% a.m. em 12x:
parcela R$ 29,94 e total **R$ 359,28**; o modelo antigo (`300 × 1,0289^12`, principal corrigido pelo
juro do prazo inteiro, sem amortização) cobrava **R$ 422,28**, 17,5% a mais contra o comprador. Os
valores fechados que a spec da rodada trazia (422,03 / 359,90) eram erro aritmético e foram
reconciliados; o código implementa a fórmula, e nenhum literal de valor entrou nele.

**PB-3, registrada para não virar surpresa.** O seed de `commercialTerms` é idempotente por design:
ambiente que já tem `current` **não** é regravado, então o termo dele continua com `jurosAoMes: 0`
até alguém versionar. O 2,89 vale para provisionamento novo e para re-seed limpo — e foi exatamente
esse fato que tornou o DEF-1 um defeito vivo em produção.

**Épico futuro nomeado, não especificado:** a **configuração real da tabela de juros por
organizador**. O campo existe no editor da plataforma; o que falta é a negociação por organizador,
com congelamento no ato da compra pela mesma disciplina da taxa. Nasce em E04/E16 quando o dono
decidir o modelo comercial.

### História

| Story | Tarefas | Estado |
|---|---|---|
| **S314 · Motor de juros do parcelamento** | T1 tabela Price real em `buildInstallmentOptions` ⚔ (`e0ef9a5`) · T2 2,89% a.m. no termo semeado e no default, com a cópia da fórmula no seed morta ⚔ (`5568f33`) | ✅ **construída em 2026-08-03**; review antagonista PASS nos vetores 1, 2, 3 e 11, com o DEF-1 corrigido por cima (`4c3b998`) |

## Delta o centavo que nascia do arredondamento (SPEC-JUROS-MARGEM · 2026-08-04)

A régua de parcelas ganhou tabela Price real em 03/08 e, junto, um resíduo que ninguém tinha
medido no ramo sem juros. Rodada em `02-rodadas/2026-08-04-juros-margem/`, arquivos `01-spec`,
`02-rns` e `03-fila`.

### RN-456 (nova, dona) · o total parcelado é dividido em centavos exatos

Com `jurosAoMes = 0`, `totalParcelado(n)` é **exatamente** `totalAVista` para todo `n`
ofertável. Não há o que financiar, então nenhum centavo pode nascer do arredondamento. A
divisão passa a ser exata:

```
base    = floor(totalCentavos ÷ n)
resto   = totalCentavos − base × n          (0 ≤ resto < n)
parcelas 1..n−1 = base
parcela n       = base + resto
```

A soma fecha no total por construção, e a maior parcela é a última. A escolha da última não é
estética: o adapter manda `installmentCount` mais `totalValue` e deixa o Asaas dividir
ajustando a última parcela (`05-discovery/asaas-api-reference.md:119`). Fazer diferente na
tela criaria divergência entre o que a compradora leu e o que a fatura dela vai dizer.

**A RN-436 fica intacta no ramo com juros.** A ordem normativa continua sendo arredondar a
parcela e multiplicar; `R$ 300,00` em 12x a 2,89% continua dando `12 × R$ 29,94 = R$ 359,28`,
byte a byte. O que a RN-456 acrescenta é o ramo de juros zero, que a RN-436 nunca tratou
explicitamente, e é lá que o resíduo nascia.

**O defeito, medido.** Com o termo em juros zero, `R$ 35,00` em 3x dava `round(35 ÷ 3) =
11,67` e `11,67 × 3 = R$ 35,01`. Um centavo apareceu do nada e chegou ao resumo como linha de
juros num termo sem juros. O piso do principal que a ACHADOS-REV instituiu contra o DEF-1
**agrava o resíduo em vez de eliminá-lo**: em 6x, `5,83 × 6 = R$ 34,98` ficava abaixo do
principal, o piso sobe um centavo em cada parcela e `5,84 × 6 = R$ 35,04`. Dois centavos para
baixo viraram quatro para cima. Conferido em `packages/core/src/finance/calc.ts:144-151`.

**O piso do principal não é removido** (premissa P6 da spec). No ramo de juros zero ele passa
a ser inalcançável, porque o total já é o principal por definição; no ramo com juros ele nunca
disparava. Fica como última linha de defesa da invariante, e apagá-lo trocaria uma trava viva
por uma suposição.

Duas consequências de contrato. `InstallmentOption` ganha a parcela final, e os consumidores
que a ignorarem continuam corretos no caso uniforme. E a **parcela mínima do termo passa a ser
conferida contra a menor parcela**, não contra a uniforme (premissa P8): com a divisão exata
as parcelas diferem em um centavo, e conferir a menor é a leitura conservadora.

Invariante server-side: uma opção cujo somatório de parcelas difira do `valorTotal` é defeito
do servidor, não erro do cliente, e a cotação recusa com `internal`.

## Delta a fechadura fica com o total, e o Serviço ganha piso (SPEC-METRICAS-SERVICO · 2026-08-05)

Duas regras que nascem da mesma fala do dono de 05/08, e que este épico possui porque uma governa
o congelamento da configuração de venda e a outra é campo da tabela de taxa. Verbatim em
`02-rodadas/2026-08-05-metricas-e-servico/01-decisoes-dono.md`; contas e inventários em
`02-spec-metricas-e-servico.md`.

### RN-487 (nova, dona) · o contador que congela a configuração é o total, não o de pagantes

`qtdInscritos > 0` é hoje a prova de "este evento já vendeu" em oito guardas:

| Onde | O que congela |
|---|---|
| `firestore.rules:526-533` | a família de guardas de edição do evento |
| `firestore.rules:557-561` (`percursosEditaveis`) | `percursos` e `modalidades` |
| `firestore.rules:675-681` (`taxaModoEditavel`) | `taxaModo` — repassada × incorporada |
| `firestore.rules:1002, 1015, 1025` | criar kit, apagar kit e mexer em preço de kit |
| `functions/src/eventos/guardPreco.ts:41-44` | preço do evento (RN-200) |
| `functions/src/eventos/guardPrecoLote.ts:63-82` | preço do lote |

Essas oito **continuam lendo o total**, deliberadamente, mesmo depois de a RN-486 mudar o que a
tela conta.

O motivo é que a cotação do comprador está congelada (RN-179) mas o **produto** que ele comprou
não. Descongelar com PIX vivo deixaria o organizador trocar percurso, modalidade, kit ou modo da
taxa por baixo de uma compra em andamento: o dinheiro do comprador não mudaria, e ele pagaria por
um percurso que deixou de existir ou por um kit apagado.

O motivo operacional fecha a decisão: **Rules e painel são dois deploys**. Redefinir o campo faria
a janela entre um e outro ser uma janela de configuração destravada em produção.

A alternativa rejeitada é redefinir `qtdInscritos` e trocar as oito guardas por uma nova prova de
venda. Ela é mais limpa no fim e mais cara e mais arriscada no caminho: mexe em Rules com efeito
imediato sobre dinheiro e configuração, para um ganho que o campo novo da RN-486 entrega sem tocar
em nada disso.

**Nenhuma guarda de configuração pode passar a ler o contador de pagantes sem decisão explícita do
dono.** É a regra, e é o critério de aceite: com um evento que só tem inscrito `pendente`, atacar
as seis guardas tem de resultar em negativa nas seis.

### RN-491 (nova, dona) · o Serviço tem piso, o piso é por pedido, e ele mora na tabela

```
Serviço = max( round(faceCentavos × percentualBp ÷ 10000) + fixoCentavos , pisoCentavos )
```

Em centavos inteiros com half-up, dentro da função canônica `computeTaxaPlataforma`
(`packages/core/src/finance/taxaPlataforma.ts:253-272`), que continua sendo a única autoridade.
O `min` com a face vem da RN-494.

**A unidade já é o pedido, e isso não precisou ser inventado.** A taxa é calculada uma vez sobre o
`valorFinal` do pedido inteiro depois do cupom
(`packages/core/src/checkout/saleState.ts:369-371, 392, 413-415`), e o `fixoCentavos` já é
documentado como componente por venda (`taxaPlataforma.ts:70`), somado uma única vez. Um pedido de
dez ingressos paga um fixo, e passa a pagar um piso — não dez. É exatamente a correção que o dono
fez: *"coloquei errado, É POR PEDIDO."*

O valor é **campo da linha por meio de pagamento**, com a precedência que a RN-178 já estabelece:
override do organizador, depois global, depois legado (`resolverTaxaMeio`,
`taxaPlataforma.ts:214-238`). **Nenhum número de dinheiro em constante de código** (RN-183,
RN-404), e a semente nasce vazia — sem piso configurado, a conta é a de hoje, byte a byte. Não há
nível por evento, pela mesma decisão de 19/07 que fechou a RN-178.

**Consequência declarada, e ela está aqui porque o dono precisa lê-la escrita.** Com a linha
vigente de 10,5% e fixo zero, o piso morde em **toda compra de até R$ 28,52**; de R$ 28,53 em
diante a fórmula já entrega R$ 3,00 por conta própria e o piso fica inerte.

| Face do pedido | Serviço hoje | Serviço com piso | Efetivo sobre a face |
|---|---|---|---|
| R$ 5,00 | R$ 0,53 | R$ 3,00 | 60,0% |
| **R$ 10,00** | **R$ 1,05** | **R$ 3,00** | **30,0%** |
| R$ 20,00 | R$ 2,10 | R$ 3,00 | 15,0% |
| R$ 28,52 | R$ 2,99 | R$ 3,00 | 10,52% |
| R$ 100,00 | R$ 10,50 | R$ 10,50 | 10,5% |

Quem absorve depende do `taxaModo` (RN-347), e o default é `incorporada`
(`packages/core/src/finance/repasse.ts:50`): numa experiência de R$ 10,00, **em `incorporada` o
organizador recebe R$ 7,00 em vez de R$ 8,95**, e em `repassada` o comprador paga R$ 13,00 em vez
de R$ 11,05. Item **SERV-1** do painel, para ratificação do número — não do mecanismo, que sobe
inerte com a tabela vazia.

Efeito de segunda ordem no parcelamento: em `repassada` a base do cálculo de parcelas é
`face + Serviço`, então uma venda de R$ 10,00 passa a ter base R$ 13,00 e a escada ofertada muda
sob a `parcelaMinima` do termo. O cálculo em si não muda de forma.

## Delta o que congela num lote vendido, e o estouro de vaga (SEAL-LOTES · 2026-08-05)

Duas regras nascidas dos seis achados do dono na tela de lotes e da review antagonista que os
atacou. Este épico as possui porque as duas governam o lote: uma diz o que a primeira venda
congela nele, a outra diz o que acontece quando a venda passa da capacidade. Relato e verbatim em
`02-rodadas/2026-08-05-lotes-ux/01-achados-dono.md`; delta e prova de não colisão em
`02-rns-delta.md`; fila em `03-fila-codigo.md`.

### RN-497 (nova, dona) · o congelamento pós-venda do lote é o preço, mais a ordem e a modalidade

O dono declarou, verbatim: *"Fui editar o lote em vigencia, porém nao consegui ajustar quantidades
disponiveis, e datas de inicio e fim, isso eu posso editar, só nao posso editar os valores."* A
apuração mostrou que **ele estava pedindo a RN-200 como ela está escrita**, e que o divergente é o
código: a Rule `loteComercialImutavelSeVendido` (`firestore.rules:1118-1123`) congela seis campos,
e a extensão para além do preço nunca teve enunciado — vivia em comentário
(`"RN-200/300 (registrado)"`) na Rule, no `api-client` e no `loteForm`.

| Campo | Congela pós-venda? | Por quê |
|---|---|---|
| `preco` | **Sim** | RN-200, inalterada. |
| `quantidadeLimite` | **Sim na Rule, aberto pela Function** | RN-304. A escrita direta do cliente segue fechada; a porta é `ajustarCapacidadeLote`, com motivo obrigatório e auditoria. |
| `inicioEm` / `fimEm` | **Não** | Revogado. O dono pediu, e a RN-200 nunca travou janela. |
| `ordem` | **Sim** | Enunciado próprio: reordenar a sequência de virada de um lote que já vendeu. Ninguém pediu. |
| `modalidade` | **Sim** | Enunciado próprio: órfãna o inscrito que comprou sob a modalidade anterior. Ninguém pediu. |

A janela editável **não afrouxa a RN-300**: a não sobreposição entre lotes irmãos continua sendo
invariante, e a validação passa a rodar no servidor porque ela decide **quando o preço vira** e,
portanto, qual preço o próximo comprador paga. A Rule sozinha não a checa — `shapeLoteValido`
exige apenas `fimEm > inicioEm`, e quem varre a sequência é `validarLotesModalidade`, hoje só no
cliente.

**Falsificação:** um lote com `vendidos > 0` aceita um `fimEm` novo que não pisa em irmão, recusa
um que pisa, e recusa qualquer alteração de `preco`, `ordem` ou `modalidade` no mesmo gesto.

**Estado:** regra selada, código **não** construído. Tarefas 1a e 1b da fila da rodada.

### RN-498 (nova, dona) · vender além da capacidade é possível, e nunca pode ser silencioso

A vaga do lote só é contada na **confirmação** do pagamento. Duas cobranças PIX em voo pela mesma
última vaga passam as duas pela cotação, e a RN-158 já declara que carrinho aberto não segura
estoque. Quando as duas pagam, `webhookPagamento` vira as duas para `confirmado` sem revalidar
lote nem capacidade, e `virarLote` recomputa `vendidos = max(atual, tally)` sem teto
(`functions/src/eventos/virarLote.ts:215`). O painel esconde o resultado, porque
`capacidadeDoLote` corta o disponível em zero (`packages/core/src/eventos/capacidadeLote.ts:43`) e
a tela exibe "20 vendidos · 0 disponíveis · 19 no total" como se estivesse tudo certo.

Três exigências, e elas valem com ou sem reserva de vaga:

1. **O ingresso pago nunca é recusado nem estornado por causa do estouro.** O dinheiro entrou e a
   entrega é devida; bloquear a confirmação seria tomar dinheiro sem entregar.
2. **`virarLote` expõe e loga o excedente.** `ResultadoVirarLote` passa a carregar os lotes com
   `vendidos > quantidadeLimite`, com log `lote_excedido` e `{eventoId, loteId, vendidos,
   quantidadeLimite}`.
3. **Toda superfície de vagas diz "N acima do configurado"** em vez de "0 disponíveis". Zero
   disponível e estouro são estados diferentes, e quem opera precisa saber em qual está.

**O que a regra não decide:** se a vaga passa a ser reservada, fechando a venda dupla na origem.
É mudança de modelo e é do dono — item **ESTOURO-1** de [[DECISOES-ABERTAS]]. Se ele escolher a
reserva, o delta é na RN-158, não aqui.

**Sem interseção com a RN-487.** Aquela governa `qtdInscritos`, o contador que congela a
configuração comercial e conta qualquer status. Este estouro é de `vendidos`, escrito só por
`virarLote` e contando `confirmado` e `estornado` (`STATUS_QUE_CONTAM_VENDA`). Métrica e
capacidade nunca foram o mesmo número.

**Falsificação:** forçar `vendidos = 21` num lote de 20 produz a linha de log e o aviso na tela, e
nenhuma superfície exibe "0 disponíveis" sobre lote estourado.

**Estado:** regra selada, código **não** construído. Tarefas 2a e 2b da fila da rodada.

### História nova · S315 · o editor de lote diz a verdade

Cobre as duas regras acima mais a fila técnica que a review deixou. As frentes A, B, D, E e F já
estão no repositório (`fd6e5e69`, `41ac6bbb`, `d4ce8d12`, `1357163a`, `2a97a592`, `08a09465`,
`c2b19244`); **nada foi deployado**. As tarefas T1 a T9 estão em
`02-rodadas/2026-08-05-lotes-ux/03-fila-codigo.md`.

## Delta a lista de modalidades vira editável, e o lote pode dispensar o kit (SPEC-MODALIDADE-KIT · 2026-08-05)

Seis regras nascidas de duas falas do dono na mesma conversa. Este épico as possui porque as duas
governam a configuração comercial do evento: uma diz como a lista de modalidades pode mudar sem
quebrar o que aponta para ela, a outra acrescenta um campo ao lote. Relato e verbatim em
`02-rodadas/2026-08-05-modalidade-e-kit/01-decisoes-dono.md`; apuração completa em
`02-spec-modalidade-e-kit.md`; delta e prova de não colisão em `03-rns-delta.md`; fila em
`04-fila-codigo.md`.

**O fato que organiza as seis.** A modalidade não tem entidade, não tem id e não tem documento: é
uma string num array do doc do evento, e o nome fica gravado em **onze** lugares, dois deles dentro
do próprio documento (`modalidades[]` e `percursos[].nome`) e um deles dentro da chave primária do
lote (`apps/painel/.../lotes/_lib/loteForm.ts:254-255`, que constrói o docId como
`modalidade-lote-ordem`). O inventário com arquivo e linha está em `02-spec-modalidade-e-kit.md`
§"O mapa do nome".

### RN-500 (nova, dona) · a lista é editável enquanto o evento não vendeu

Verbatim do dono: *"E precisamos editar as modalidades."* Hoje não existe caminho nenhum.
`evento.modalidades[]` é escrito uma única vez, na criação (`functions/src/eventos/criarEvento.ts:389`),
e o contrato de atualização exclui o campo por escrito
(`packages/api-client/src/eventos/configuracoesEvento.ts:13-15`). A trava é de produto:
`firestore.rules:550-561` (`percursosEditaveis`) **já autoriza** o cliente enquanto
`qtdInscritos == 0`.

**A fronteira é "sem venda", e não "sem venda e rascunho".** Três medições a sustentam:

1. `qtdInscritos` conta qualquer status (RN-487), então uma cobrança PIX viva já fecha a lista
   antes de qualquer pagamento. A única pessoa que a edição pode pegar no caminho é a que ainda
   não gerou cobrança.
2. O modo de falha dessa pessoa é **recusa**, nunca preço errado. Sem lote para o nome antigo a
   venda vem fechada (`packages/core/src/checkout/saleState.ts:281`); um kit fora da modalidade
   lança (`:271-273`). Fail-closed já está lá.
3. Exigir rascunho pioraria o produto no caso exato do dono. Ele descobre o erro olhando a página
   pública, e `status` é escrita de Function (ADR-005): consertar um nome passaria a exigir tirar a
   página do ar, por uma porta que o organizador pode nem ter.

**A lista é duas listas.** `modalidades[]` e `percursos[].nome`
(`packages/core/src/eventos/evento.ts:87-90, 127`) são cópias do mesmo fato no mesmo documento,
sincronizadas por um único lugar do produto (`EventoForm.tsx:203-206`), e a segunda é o preço
legado consultado por nome no checkout (`createInscricaoCharge.ts:929`). Toda operação trata as
duas como uma só.

**Requisito de tela:** editar a lista de um evento **publicado** exige confirmação que nomeie a
consequência antes do gesto, não depois.

**Falsificação:** um evento publicado com zero inscritos aceita a edição; o mesmo evento com uma
cobrança PIX pendente e nenhum pagamento a recusa.

**Estado:** regra selada, código **não** construído. Frente 1 da fila da rodada.

### RN-501 (nova, dona) · renomear é migração atômica, nunca edição de campo

Cinco referências do próprio evento mudam juntas: `modalidades[]`, `percursos[].nome`,
`Lote.modalidade`, `Kit.modalidades[]` e `campanha.segmento.referencia`. Uma Function transacional
as migra **num único commit**, com o pai antes dos filhos, porque a Rule do lote consulta o
documento do evento (`firestore.rules:1067-1076`, chamada no create **e no update**, `:1134` e
`:1142`).

**Duas escritas separadas não são uma versão mais barata.** Entre elas, todo lote da modalidade
aponta para um nome fora da lista, e a `modalidadeExisteNoEventoPai` transforma isso em
**documento inutilizado**: nenhuma escrita passa mais, inclusive a que fecharia a janela.

**Proibir a renomeação foi recusado.** "Criar nova e migrar na mão" é a mesma operação, com a
mesma janela, sem transação nenhuma protegendo o meio dela. Proibir não impede: garante que seja
feita pior.

**Renomear para um nome já presente na lista é recusado.** Isso é fusão de modalidades, com dois
conjuntos de lotes disputando a sequência de virada e a invariante da RN-300. Ninguém pediu.

**O docId do lote fica com o nome antigo.** Uma renomeação não reescreve docId; apagar e recriar
moveria uma chave primária que `pedidos/{id}.itens[].loteId` referencia
(`packages/core/src/pedidos/pedido.ts:123-127`) e por onde `virarLote` reconta
(`functions/src/eventos/virarLote.ts:165-201`). Hoje isso é inofensivo, porque a operação só existe
antes da primeira venda; construí-la como "recria o documento" ensinaria ao código um gesto que
fica errado no dia em que alguém relaxar a fronteira. O resíduo é cosmético — nenhuma tela mostra
docId de lote — e que lotes novos parem de embutir o nome é dívida registrada (tarefa 3a).

**Falsificação:** renomear com um lote e um kit apontando para o nome antigo deixa os dois
apontando para o novo no mesmo commit; falhar no meio não deixa nada escrito.

**Estado:** regra selada, código **não** construído. Tarefa 1b, marcada ⚔⚔.

### RN-502 (nova, dona) · remover só quando nada aponta, e a recusa nomeia quem impede

Remover é a única das três operações sem destino. Renomear leva as referências junto; remover as
deixa apontando para o vazio, e o vazio não é benigno pela mesma Rule da RN-501: tirar o nome da
lista **inutiliza** os lotes daquela modalidade, inclusive para a escrita que corrigiria a
modalidade deles. A única saída restante seria apagar o lote, permitido apenas com `vendidos == 0`
(`firestore.rules:1146-1149`).

A remoção é recusada enquanto existir lote, kit ou campanha referenciando o nome, e a recusa lista
**cada um pelo nome**, nunca com frase genérica. O organizador tem caminho reversível: apaga os
lotes, tira a modalidade do kit ou apaga o kit (permitido sem venda no evento,
`firestore.rules:1017-1027`), e então remove. Remover tira o nome das duas listas.

**A alternativa recusada** é remover em cascata num gesto só. Apagar um lote é apagar preço e
janela que alguém configurou, e o botão que faz isso a reboque de outra ação não deixa a pessoa
medir o que perdeu. Item **MODAL-2** de [[DECISOES-ABERTAS]], com este default.

**Falsificação:** remover uma modalidade com um lote apontando devolve recusa nomeando o lote;
remover a mesma depois de o lote ser apagado passa.

**Estado:** regra selada, código **não** construído. Tarefa 1c.

### RN-503 (nova, dona) · o lote declara se inclui o kit da modalidade, e o default é incluir

Verbatim do dono, escolhendo entre três desenhos: *"nao, na verdade é na modalidade mesmo! mas pode
acontecer de determinado lote nao ter o Kit."* Ele escolheu o **interruptor no lote**, e viu e
aceitou a limitação declarada: é tudo ou nada, não permite escolher um kit entre três.

`Lote` ganha `incluiKitDaModalidade?: boolean`, e **ausente equivale a ligado**. Nenhum documento
no banco tem o campo, todo leitor usa `get(campo, true)`, e por isso nenhum lote existente muda de
comportamento e não há migração — escrever `true` onde já se lê `true` é escrita sem efeito e com
risco.

O campo **não** cria vínculo entre kit e lote. `Kit.modalidades[]` continua sendo o único vínculo e
o kit continua valendo em todos os lotes da modalidade; o lote apenas inclui ou não a oferta
inteira.

**A recusa é do servidor.** Esconder a etapa é interface; um payload montado à mão declara um
`kitId` da modalidade e compra o kit num lote que não o inclui. A validação mora onde a irmã dela
já mora: `computeSaleState` já refuta kit fora da modalidade
(`packages/core/src/checkout/saleState.ts:271-274`) e já resolve o lote ativo (`:281`). Detalhe que
a fila carrega: o bloco do kit roda **antes** da resolução do lote, então a checagem nova exige
reordenação dentro da mesma função pura.

**O campo não entra no congelamento da RN-497**, porque o `preco` do lote não se move quando ele
vira e porque o caso pós-venda é banal: o kit acabou no meio do lote. A escolha tem consequência de
dinheiro, declarada na RN-504, e o congelamento sobe como alternativa em **KITLOTE-1**.

**Falsificação:** uma cotação que declare um kit da modalidade sobre um lote com o interruptor
desligado é recusada pelo servidor, e não apenas ausente da tela.

**Estado:** regra selada, código **não** construído. Frente 2 da fila da rodada.

### RN-504 (nova, dona) · desligar não mexe em quem comprou, não libera estoque, e o comprador nunca lê "kit desligado"

Três afirmações, e nenhuma é promessa: as três são o que o código faz hoje, escritas para que
nenhum caminho futuro as contrarie.

**Quem comprou.** A cotação está congelada no pedido (RN-179) e o kit está gravado duas vezes no
inscrito: como enum em `inscrito.kit` (RN-202) e como id real em `inscrito.kitId`
(`packages/core/src/eventos/inscrito.ts:139-147`, escrito em `createInscricaoCharge.ts:1704-1707`).
O balcão e a página do ingresso leem o inscrito, nunca o lote. A entrega é devida.

**Estoque.** Não existe reserva para liberar. O aprovisionamento é movido pela demanda,
`aEncomendar = max(0, qtdVendida − estoqueFisico)` (RN-224,
`packages/core/src/eventos/aprovisionamento.ts:266-269`), com `qtdVendida` recomputado a partir de
inscritos confirmados. Desligar o interruptor só faz esse número **parar de crescer** pelas vendas
daquele lote; nada retrocede e nenhum documento de aprovisionamento é tocado. `Kit.capacidade`
também não se move: os dois consumidores dela somam por documento de kit
(`functions/src/overview/aggregateProfessionalDashboard.ts:86`,
`apps/painel/src/routes/eventos/_lib/distribuicao.ts:199-209`), e o documento continua lá.

**Vocabulário.** O comprador lê **"Esta inscrição não inclui kit."**, a mesma frase para modalidade
sem kit e para lote com o interruptor desligado, porque para quem compra os dois são o mesmo fato.
Proibidas em superfície de comprador: "kit desligado", "kit desativado", "kit indisponível neste
lote", e qualquer frase que exponha a palavra lote a quem está comprando.

**A exceção que vale dinheiro.** "Sem kit" é um kit de verdade, com preço negativo (RN-211,
`kitEhDesconto` em `packages/core/src/eventos/kit.ts:118-120`). Num evento que use esse desenho,
desligar o interruptor tira o desconto do cardápio e o comprador daquele lote passa a pagar
**mais**, sem que o `preco` do lote mude. É o único caminho pelo qual este campo mexe no que alguém
paga, e ele tem de aparecer ao organizador **no gesto**, com o número.

**Falsificação:** desligar o interruptor num lote com vendas não altera nenhum `inscrito.kitId`,
nenhum documento de aprovisionamento e nenhum valor de pedido.

**Estado:** regra selada, código **não** construído. Tarefas 2c e 2d.

### RN-505 (nova, dona) · a edição nunca escreve a partir da projeção degradada, e a recuperação é alcançável

`eventoDegradado` devolve `modalidades: []` e `percursos: []` **incondicionalmente**
(`packages/api-client/src/eventos/queries.ts:186-187`), sem olhar o campo bruto. Um evento que
degradou por `janelasEntrega` ou `faixaChips` — que o próprio arquivo aponta como fontes mais
prováveis do defeito — tem a lista perfeita no banco e vazia na projeção. Um editor que grave "a
lista que eu vi" apaga modalidades boas, e a escrita passa em todas as Rules, porque lista vazia é
lista válida.

Por isso as três operações são da Function, que lê o documento direto, e o acréscimo é `arrayUnion`,
que não apaga o que outra aba escreveu.

**E há um beco a abrir.** A degradação só existe na listagem: a leitura pontual mantém o fail-fast
de propósito (`queries.ts:117-123`), então o organizador vê o evento degradado na lista, clica, e a
tela de detalhe não abre. A porta de conserto está atrás da porta quebrada. A recuperação precisa
de ação própria **na listagem**; afrouxar `getEvento` foi recusado, porque aquele fail-fast protege
toda tela que assume evento válido. A tela do reparo nomeia o campo inválido, porque publicar exige
modalidade não vazia (`functions/src/eventos/publicarEvento.ts:69-71`) e recuperar a lista é
necessário sem ser suficiente.

**Falsificação:** um evento com `modalidades: ['5k','10k']` no banco e um campo inválido em outro
lugar, aberto pelo reparo, mostra as duas modalidades e nunca grava lista vazia sobre elas.

**Estado:** regra selada, código **não** construído. Tarefa 1e.

### História nova · S316 · a lista de modalidades passa a ter dono

Cobre RN-500, RN-501, RN-502 e RN-505 mais a dívida do docId. Seis tarefas, `S316-T1` a `S316-T6`,
em `02-rodadas/2026-08-05-modalidade-e-kit/04-fila-codigo.md`. **Nada construído.**

### História nova · S317 · o lote que não inclui o kit

Cobre RN-503 e RN-504. Quatro tarefas, `S317-T1` a `S317-T4`, no mesmo arquivo. **Nada construído.**

### Ponta solta nomeada · duas listas para o mesmo fato

`modalidades[]` e `percursos[].nome` duplicam a modalidade dentro do mesmo documento, mantidas em
sincronia por um único lugar do produto, e a segunda é preço legado consultado por nome no
checkout. A duplicação é anterior a esta rodada e não tem enunciado próprio. Esta spec passa a
tratá-las como uma só em toda operação, o que contém o risco sem resolver a deriva. Unificar é
rodada própria, com migração de documento vivo.
