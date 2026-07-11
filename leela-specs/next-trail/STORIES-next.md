# STORIES-next · Checklist de user stories da próxima trilha

> PROPOSTA revisável. Formato canônico de `V1-CHECKLIST.md`. **Toda story cita o JTBD servido** (`jobs-to-be-done.md`) — coluna obrigatória (L-004 / G-003). `[ ]` a fazer.
> Dimensões JTBD: **T** Transacional (H1) · **H** Heroica (H2) · **M** Marketplace (H2-H3) · **S** Social/identitária (transversal).
> Dep marcada por story. Stories da Onda 2 já existem em `V1-CHECKLIST.md` — aqui recebem o **anchor de JTBD** que faltava (não são re-planejadas).

---

## F1 · Trilha Fable — backend crítico (A-G) · ROTA FABLE · review antagonista

### `LEELA-FABLE-A` · Modelo de pedido/pagamento no Inscrito (implementa o **ADR-011** — kernel `pedidos`)
**Como** Organizador, **quero** ver o pedido completo de cada inscrição (valor, forma, parcelamento, conciliação), **para** gerenciar o pedido e não só o status — e enxergar quem pagou.
- **JTBD servido:** T · doc: *"Compro inscrição → acompanhar kit, pagamento e resultado no mesmo lugar"* (04.1, Atleta). Lado organizador = dor #1 *"inadimplência invisível"* (**personas.md 03.1**, não é linha do doc de JTBD) → **candidato novo P5** em `JTBD-TRACE.md §2`. Dimensão **Transacional H1**.
- [ ] Dado uma inscrição PAGA, quando abro o slide-in, então vejo id da compra, forma de pagamento, valor + parcelamento, cupom/desconto, conciliação (taxa/repasse/previsão) — **dado REAL, sem fabricar** (S203 crit. expandido).
- [ ] Dado o modelo, quando persisto, então `pedidos/{id}` segue o **ADR-011** (pedido em grupo: `responsavel`, `inscritoRefs[]`, `pagamentoRef`, `valorTotal`; escrita de estado financeiro **só por Function**) e `Inscrito` ganha `pedidoRef`+`ehResponsavel`, denormalizando OU fazendo join — **um só agregado** (Kleppmann: sem duplicar o dado de dinheiro).
- [ ] Dado um **pedido em grupo** (1 responsável, N inscritos — ADR-011), quando abro o slide-in de UM inscrito, então vejo o pedido do grupo com o valor atribuível àquele inscrito (não o total como se fosse dele).
- [ ] Dado Rules, quando um não-organizador lê o pedido, então negado (nesta fase só o organizador do evento lê; leitura pelo responsável/atleta entra com E12/E13).
- **Dep:** S203-T1 ✅, S1600 ✅ (Rules), ADR-011 ✅. **Destrava:** S203-T3, S207 (por forma de pagamento), E12-L4. **Gate:** adr-conformance ADR-011 (L-001). Kleppmann revisa a IMPLEMENTAÇÃO (denorm × join, fronteira transacional) — o modelo já está decidido.

### `LEELA-FABLE-B` · Function de estorno idempotente (por inscrito — ADR-011) — ≙ fatia de `E09-S904`
**Como** Organizador, **quero** reembolsar uma inscrição com confirmação e histórico, **para** ter processo claro de reembolso sem duplicar dinheiro.
- **JTBD servido:** T · doc mais próximo: *"Compro inscrição → acompanhar kit, pagamento e resultado no mesmo lugar"* (04.1 — cancelar/estornar é parte da visão unificada do pagamento). Persona: *"processo claro de reembolso"* (Organizador 03.1) + *"processar reembolso e repasse em lote"* (Admin 03.7) — **personas.md**, não doc → **candidato novo P1** (`JTBD-TRACE.md §2`). Dimensão **Transacional H1**.
- [ ] Dado uma inscrição paga, quando confirmo estorno, então a Function estorna no gateway (sandbox, via `PaymentProvider.refund`), marca a inscrição cancelada (RN-337, sem reversão de split — afiliação cortada na V1), registra motivo/histórico.
- [ ] Dado um **pedido em grupo com N inscritos (ADR-011)**, quando estorno 1 inscrito, então o estorno é **PARCIAL** (só o valor daquele inscrito, sobre a cobrança única do pedido); os demais inscritos permanecem ativos e o pedido reflete o saldo.
- [ ] Dado reexecução do estorno, quando reprocessa, então **não duplica** (idempotente por chave **por inscrito**) — audit trail preservado.
- [ ] Dado o modal do protótipo, quando concluo, então reflete o resultado real ("estornado no cartão •••• em até N faturas") com o valor parcial correto.
- **Dep:** FABLE-A, `PaymentProvider` ✅ (interface com `refund` — ADR-006; fornecedor concreto pendente = D2). **Seam de refund compartilhado com E04-L6.** **Escopo honesto:** esta é a fatia *organizador-inicia* de `E09-S904` (RN-337); a máquina de estados completa do reembolso solicitado pelo atleta (RN-341, fila de análise, política S305) segue na Onda 2/E09.

### `LEELA-FABLE-C` · QR server-side — validação de assinatura (ENCOLHIDA) — ≙ recorte de `LEELA-S208`
**Como** Organizador no balcão, **quero** que o ingresso seja validado server-side, **para** rejeitar QR adulterado/de outro evento/já usado.
- **JTBD servido:** T · doc: *"acompanhar kit, pagamento e resultado no mesmo lugar"* (04.1, Atleta — ingresso válido) + S · *"Passo pela largada → sentir que a rotina teve sentido"* (04.4). Ganho persona: *"100% do kit certo na entrega"* (**personas.md 03.1**). → **candidato novo P2**: *"validar ingresso sem fraude na largada"*. Dimensão **Transacional H1 + Social**.
- [ ] Dado um `qrToken`, quando valido, então a assinatura é conferida server-side (RN-221/222); payload adulterado / de outro evento → rejeitado; nunca confiar no cliente.
- [ ] Dado um QR **já usado**, quando revalido, então rejeitado — exige o carimbo `checkinEm` persistido (recorte de `S208-T1`; sem ele não há como saber "já usado").
- [ ] Dado as escritas já provadas (firebase-admin ✅), quando checo, então seguem funcionando (não regressão).
- **Dep:** firebase-admin ✅. **De-para:** ≙ `S208-T3` (validação de assinatura) + carimbo de `S208-T1`; o caminho de scanner/estados (`S208-T4`) NÃO entra nesta frente. Segurança pura → review antagonista.

### `LEELA-FABLE-E` · Chave estável Kit↔enum (integridade)
**Como** sistema, **quero** que `inscrito.kit` (enum) case com `Kit.id` (seed), **para** o Estoque unir sem a ponte de delimitador.
- **JTBD servido:** T · doc: enabler de *"Compro inscrição → acompanhar KIT... no mesmo lugar"* (04.1). Persona: *"coleta automática de tamanho de kit"* (**personas.md 03.1**, JTBD funcional) → sustenta **P3**. Dimensão **Transacional H1** (integridade que sustenta D).
- [ ] Dado o seed, quando alinho ao enum (chave canônica Kit↔enum), então o join casa; a ponte `kitCasa` é removida depois.
- **Dep:** S205 ✅ (seed). Pequeno mas é integridade de dado.

### `LEELA-FABLE-D` · Estoque por tamanho + movimentações — ≙ `LEELA-S209` + `LEELA-S210`
**Como** Organizador, **quero** matriz de estoque por tamanho (PP-XG) por kit com movimentações, **para** não errar o kit por falha de coleta de tamanho.
- **JTBD servido:** T · doc: *"Compro inscrição → acompanhar KIT, pagamento e resultado no mesmo lugar"* (04.1 — receber o kit certo é o desfecho do job). Persona: JTBD funcional *"coleta automática de tamanho de kit"* + dor *"Kit errado na entrega"* (**personas.md 03.1**) → **candidato novo P3**. Dimensão **Transacional H1**.
- [ ] Dado a inscrição, quando coleto tamanho, então persiste **por inscrito por item** no map `tamanhos: Record<itemId, string>` (**S209 / RN-223** — não um campo solto "camisa"; cruza FABLE-A `[reg]`).
- [ ] Dado movimentações, quando entra/sai, então seguem o modelo canônico de **S210** (`modeloEstoque`/`tamanhosDisponiveis[]` em `itensKit`, subcoleção `aprovisionamento/{sku}`, agregação Σ por Function idempotente `onWrite` de inscrito confirmado — RN-224/225/226); alertas de baixa/esgotado **derivados de dado real** (não fabricado).
- **Dep:** FABLE-A (`[reg]`), FABLE-E (chave). **Destrava:** EstoqueView (S205-T4). **De-para:** os aceites Given/When/Then canônicos vivem em `epics/LEELA-E03` §S209/§S210 — herdar, **não re-modelar** (mesmo princípio do kernel `pedidos`).

### `LEELA-FABLE-F` · Cronograma do evento + faixa de chip
**Como** Organizador no balcão, **quero** janelas de entrega por dia/local/horário e faixa de chip, **para** o banner mostrar o dia real e os alertas de chip serem verdadeiros.
- **JTBD servido:** T · doc mais próximo: *"Compro inscrição → acompanhar KIT... no mesmo lugar"* (04.1 — a janela de retirada é a informação de kit que o atleta acompanha; alimenta a seção Retirada da landing, E12-L2). Persona: dor central 03.1 *"o que me trava é... a logística de kit"* → sustenta **P4** (operar em campo). Dimensão **Transacional H1**. *(Correção r2: a âncora anterior "Processo repasse" era o job de payout do Admin — agregado errado.)*
- [ ] Dado o `Evento`, quando defino cronograma, então o banner "Entrega ativa · Dia N de M" mostra a janela real (hoje honesto "fora da janela").
- [ ] Dado faixa/estoque de chips, quando um chip é órfão/estoque baixo, então alerta com dado real.
- **Dep:** S204 ✅ *(sem dependência de FABLE-C — não há dado compartilhado; correção r2)*.

### `LEELA-FABLE-G` · Logs de comunicação + histórico do registro
**Como** Organizador, **quero** ver as comunicações enviadas e a linha do tempo do registro, **para** ter contexto ao gerenciar o inscrito.
- **JTBD servido:** S+T · doc: *"Falo com patrocinador → Ter dados na mão"* (04.4 — contexto completo do inscrito na mão). Persona: dor *"comunicação fragmentada entre WhatsApp, e-mail e Instagram"* (**personas.md 03.1**). Dimensão **Transacional H1 + Social**.
- [ ] Dado a aba Comunicação, quando abro, então lista e-mail/push com status entrega/abertura (dado real).
- [ ] Dado a aba Histórico, quando abro, então timeline (inscrição, pagamento, cancelamento c/ motivo e reembolso) — dado real.
- **Dep:** FABLE-A. **Overlap E06 + E12:** a aba Comunicação do slide-in, as campanhas (E06-L1) e o log de envio do ingresso (`S1206-T2` `hasSent`/`markSent`) consomem/alimentam o **mesmo agregado de log** — modelar UMA vez aqui. Review antagonista (PII).

---

## F2 · RESP-MOBILE — passe mobile real 390×844 · ROTA OPUS · gate Norman

> Insumo: 7 MAJOR do QA-2, causa-raiz única M1. Desktop 1440 intocado (0 defeito). UI nova já responsiva → varrer só desktop-only. **Não são regressões.**

### `LEELA-RESP-M1` · Shell/drawer + breakpoints tokenizados (destrava tudo)
**Como** Organizador operando no celular no dia da prova, **quero** o painel refluir em 390×844 sem estouro horizontal, **para** gerenciar o evento no local.
- **JTBD servido:** T · **candidato P4** *"operar o evento pelo celular no dia da prova"* (`JTBD-TRACE.md §2`); âncora existente no doc: *"Falo com patrocinador → Ter dados na mão"* (04.4 — na mão, literalmente) — transversal a todo o painel em 390px. Dimensão **Transacional H1**.
- [ ] Dado 390×844, quando abro qualquer rota, então Sidebar vira drawer e o `main` perde o offset fixo → documento não estoura horizontal (fix M1 destrava M2-M7).
- [ ] Dado breakpoints, quando o DS os define, então `screens` tokenizado no tailwind-preset (decisão explícita).
- **Gate Norman (sf-ux-engineer):** affordance do drawer visível · feedback <100ms · constraint impede scroll-x · `prefers-reduced-motion`. **Dep:** — (primeiro do lote). Primeira task: emenda ao PRD-01 + projeto mobile no Playwright.

### `LEELA-RESP-M3` · KpiRow grid→1col mobile
- **JTBD servido:** S · *"ter dados na mão"* (Organizador/Coordenador) — KPIs legíveis no celular. Dimensão **Social**.
- [ ] Dado 390px, quando renderizo KpiRow (5 rotas), então grid colapsa para 1 coluna sem corte. **Dep:** M1.

### `LEELA-RESP-M5` · Table card/scroll mobile
- **JTBD servido:** T · doc: *"Compro inscrição → acompanhar... pagamento no mesmo lugar"* (04.1, lado organizador da tabela de inscritos) + *"Ter dados na mão"* (04.4). Dor #1 *"inadimplência invisível"* (personas 03.1) → **candidato P5**. Dimensão **Transacional H1**.
- [ ] Dado 390px, quando abro Table (inscritos/membros/tenants/macro), então card-mode ou scroll horizontal contido (sem estourar o shell). **Dep:** M1.

### `LEELA-RESP-M4` · Header + TabNav (truncamento + overflow das abas)
- **JTBD servido:** T · **candidato P4** (operar o drill em campo); âncora existente: *"Ter dados na mão"* (04.4) — as 5 abas da sub-nav (+3 da Onda 2) utilizáveis no celular. Dimensão **Transacional H1**.
- [ ] Dado 390px, quando o header/TabNav não cabe, então truncamento + overflow das abas (scroll/menu), sem quebra. **Dep:** M1.

### `LEELA-RESP-M2` · Toolbar/CTA · `LEELA-RESP-M6` · EventRow · `LEELA-RESP-M7` · prose
- **JTBD servido:** âncora comum: *"Ter dados na mão"* (04.4) + **P4**. **(M2)** Toolbar ⌘K acessível no celular. **(M6)** EventRow legível — *"abrir rápido o evento que gerencio"* é o job da **story S200** (`leela-specs`), não linha do doc de JTBD (atribuição honesta). **(M7)** prose/intro legível.
- [ ] M2/M6/M7 caem por tabela após M1 (dimensionados como XS). **Dep:** M1.

---

## F3 · Onda 2 — stories existentes + anchor de JTBD (não re-planejadas)

> Estas stories JÁ existem em `V1-CHECKLIST.md §Onda 2 · Vender` como `[ ]`. O delta aqui é **o JTBD que faltava** + a dependência do kernel FABLE-A. Tasks nos briefs `onda2-*`.

### E04-slim · Configuração & vendas (brief `onda2-E04-lotes.md`)
- [ ] **S300-T1..T6** (página de vendas + lotes + cupons simples + editor + modais) — **JTBD:** T · *"Publico evento → configurar lotes e preços automáticos (eliminar virada manual de lote)"* (04.1, Organizador). H1.
- [ ] **S304-T1..T3** (equipe + 4 papéis + claims por evento) — **JTBD:** T · aproximação honesta: *"operação escalável"* (04.1, cláusula Para do job de repasse — o doc não tem linha própria de delegação/equipe) + ganho persona 03.1 *"dormir tranquilo... sabendo que a plataforma funciona sozinha"*. Enabler de segurança (claims por evento) dos demais jobs do painel. H1.
- [ ] **E04-PAY-T1** (DI seam + conformance) / **E04-PAY-T2** (adapter sandbox, gated no gateway) — **JTBD:** T · doc mais próximo: *"Compro inscrição → acompanhar... pagamento no mesmo lugar"* (04.1 — a confirmação automática fecha o job); persona: JTBD funcional 03.1 *"confirmação automática de pagamento"*. H1. **Dep:** ADR-006 (interface ✅ com `refund`; fornecedor concreto pendente = D2). Refund seam reusa FABLE-B.

### E12 · Landing + checkout público (brief `onda2-E12-lotes.md`)
- [ ] **L0** (serviceFee + installments) / **S1200-S1203** (fundação, páginas, checkout 5 etapas) — **JTBD:** T · *"Descubro evento → me inscrever em poucos cliques (reduzir fricção)"* (04.1, Atleta). H1.
- [ ] **S1205** (SEO: metadata/OG/JSON-LD/sitemap) — **JTBD:** T · mesmo job de descoberta (*"Descubro evento → me inscrever em poucos cliques"*, 04.1) — a descoberta orgânica é o "quando" do job. H1.
- [ ] **S1207 + S1204-T2** (compliance por inscrito + cupom server-side) — **JTBD:** T · S1207 = enabler legal do job de inscrição (aceite/emergência **por inscrito** — ADR-011); S1204-T2 serve *"configurar lotes e preços automáticos"* (04.1 — cupom é pricing). H1.
- [ ] **S1203-T5 createInscricaoCharge + `pedidos/{id}`** — **JTBD:** T · fecha *"descobrir → inscrever → pagar"* (04.1 linhas 2+4). **Dep dura: FABLE-A** (o `pedidos` nasce lá conforme ADR-011; aqui só o produtor de escrita). Review antagonista (checkout/segurança).
- [ ] **S1203-T6 webhook idempotente** / **S1206 ingresso+email** — **JTBD:** T · *"acompanhar kit/pagamento/resultado no mesmo lugar"* (04.1, Atleta) + ingresso QR (cruza FABLE-C; log de envio `S1206-T2` reusa FABLE-G). H1.
- [ ] **S1202** (página de clube) — **JTBD:** M+S · *"Apoio evento → aparecer como apoiador"* (04.3, Marca) + *"pertencimento a comunidade local"* (mapa Clubs, Social). Obs.: *"aparecer na vitrine"* (04.3) é do **Prestador** — aplicá-la ao clube é extensão, marcada como aproximação. Recorte sem afiliação. H1→H2.

### E09-slim · Repasses do organizador (brief `onda2-E09slim-lotes.md`)
- [ ] **E09s-L1..L4** (saldo/dados bancários/solicitação/retenção 15%/comprovante/back-office) — **JTBD:** T · *"Processo repasse → ver saldo a liberar e disparar em lote (operação escalável)"* (04.1, **Admin**) + persona Admin 03.7 *"processar reembolso e repasse em lote"*; beneficiário: **Organizador** (recebe o repasse). H1. *(Correção r2: a citação anterior a "repasse automático e transparente" era o JTBD do **Promotor** — comissão de afiliação, CORTADA da V1; não se aplica a repasses do organizador.)*

### E07-web · Estados de sistema (brief `onda2-E07web-lotes.md`)
- [ ] **E07w-T1..T6** (404/500/403 painel+landing) — **JTBD:** S · doc mais próximo: *"Ser visto como profissional"* (04.4, cláusula Para); persona: ganho 03.1 *"parecer tão profissional quanto um evento de São Paulo"* + JTBD emocional *"sentir-se tão profissional quanto os grandes"*. Transversal. 403 **Dep:** E04-L4 (papéis).

### E06 · Comunicação do evento — só Campanhas (brief `onda2-E06-lotes.md`)
- [ ] **E06-L1..L3 + S401-T1..T4** (campanhas + aba Comunicação na sub-nav) — **JTBD:** T/H · doc: *"Assessoria manda treino → Receber dentro do app → Eliminar WhatsApp"* (04.2, Atleta — família do job de comunicação in-app); persona: dor 03.1 *"comunicação fragmentada entre WhatsApp, e-mail e Instagram"*. **Dep:** FABLE-G (logs de comunicação — mesmo agregado). H1.

### Transversais · coleta E11 + backend do desafio (brief `onda2-transversais-lotes.md`)
- [ ] **S821-T1a/T1b** (rollup diário `AnalyticsSnapshot`) — **JTBD:** T/S · doc: *"Falo com patrocinador → Ter dados na mão"* (04.4); persona: dor 03.1 *"Sem visibilidade de funil — não sabe onde os atletas abandonam"*. H1. **Fase V1.**
- [ ] **S1307-T1** (registros do atleta + pontos) / **S1308-T1/T3** (participação + board consistência) — **JTBD:** H · *"que meditação/sono contem como progresso"* + *"rotina com propósito"* (Atleta). **Dimensão Heroica H2. Fase V1.5 (engajar).**
- [ ] **S105-hig / S1601-hig** (higienes XS) — **JTBD:** enabler (E15/plataforma). Transversal.

---

## F4 · Consolidações · ROTA OPUS

### `LEELA-CONS-1` · KpiCard/StatTile canônico no DS
**Como** dev do DS, **quero** um KpiCard único (flat §2.16), **para** matar as 4 cópias locais e servir "dados de relance" com consistência.
- **JTBD servido:** S · *"ter dados na mão"* (Organizador/Coordenador) — o KPI aparece em todo dashboard; canonizá-lo serve a consistência do job. Dimensão **Social**. Enabler G-004.
- [ ] Dado o DS, quando promovo `KpiCard`, então as 4 cópias (eventos/clubes/plataforma/EstoqueView) migram; showroom documenta; review antagonista. **Dep:** —.

### `LEELA-CONS-2..6` · dívida técnica / infra
- [ ] **CONS-2** teste flaky `EventoLayout.test.tsx` (timeout suíte cheia) — **JTBD:** enabler de qualidade (protege todo o gate; não é feature de usuário — honesto). **Dep:** —.
- [ ] **CONS-3** mutations plataforma → useMutation (parked) — **JTBD:** enabler read-your-writes; persona Admin 03.7 *"visão consolidada do que roda na plataforma"* (**personas.md**; o doc de JTBD não tem linha de plataforma — enabler marcado honestamente). **Dep:** —.
- [ ] **CONS-4** backend-dep pequenos (owner do tenant · nome canônico do evento na parceria · 5º segmento de comunicado) — **JTBD:** S · *"comunidade com rosto e nome"* (mapa Clubs) / *"ter dados na mão"* (04.4). **Dep:** —.
- [ ] **CONS-5** adotar G-001..G-004 nas definições empresa/squad — **JTBD:** meta-organizacional (a empresa herda a correção; não improvisa). Não é JTBD de usuário — honesto. **Dep:** —.
- [ ] **CONS-6** 6 bugs do showroom + UX-DADOS lote 2 (financeiro/balcão onSnapshot, kits, Clubes, Plataforma mutations) — **JTBD:** T/S · doc: *"Ter dados na mão"* (04.4); persona: ganho 03.1 *"relatório de vendas em tempo real sem exportar planilha"* (superfícies vivas). **Dep:** UX-DADOS lote 1 ✅.

---

## Nota de honestidade (L-004 · zero órfã)
Todas as stories de F1/F2/F3 citam **explicitamente uma linha de `jobs-to-be-done.md`** (rotulada "doc:"); citações vindas de `personas.md` (dores/ganhos/JTBD de persona) e de stories (`S200`) estão rotuladas pela origem — nunca apresentadas como linha do doc (correção r2: a rodada 1 misturava as fontes). Onde a âncora do doc é aproximada, está marcada "mais próximo"/"aproximação" e coberta por um candidato P1-P5. Em F4, `CONS-2`, `CONS-3` e `CONS-5` são **enablers** sem linha de JTBD no doc — marcados como tal em vez de forjar um job. Os **5 JTBD candidatos novos** (P1 estorno digno · P2 validar ingresso sem fraude · P3 estoque por tamanho · P4 operar no celular no dia da prova · **P5 inadimplência visível — a dor #1**) estão propostos em `JTBD-TRACE.md §2` para ratificação — **não** aplicados a `jobs-to-be-done.md`.
