---
tags: [leela, decisoes, rodada, produto, formulario, checkout, clubes]
aliases: ["Rodada formbuilder-analise 2026-07-19", "FORMBUILDER", "DEC-FORMBUILDER-0719"]
trace: leela-build-2d6ee98d
lote: FORMBUILDER-SPEC
data: 2026-07-19
fonte: destravamento do Vitor (verbatim abaixo) + corte de v1 via AskUserQuestion 2026-07-19 (só perguntas; anexo = fase 2)
---

# Rodada formbuilder-analise — 2026-07-19 (FORMBUILDER)

Arquivo canônico da rodada. Preserva o **verbatim** do Vitor, registra as decisões com **default proposto em vigor** (o Vitor muda se quiser; nada volta como pergunta bloqueante) e consolida nos épicos donos (E04 config do evento, E05 clube, E12 render na compra) e nas RNs novas. Delta de RNs em `02-rns-delta.md`; fila de código derivada em `03-fila-codigo.md`.

Escopo: **spec-only, ZERO código.** O construtor de formulário sai de 🧊 análise-futura (captura `00-captura.md`) para 📋 executável. Corte de v1: **só perguntas — seleção única, seleção múltipla, sim/não.** Anexo de arquivo = **fase 2 GATED**, registrado como uma linha de backlog na história, sem elaboração nesta rodada.

## Verbatim do Vitor (preservar)

Destravamento (2026-07-19):

> *"o construtor pode ser construido agora, nao tem problema"*

Pedido original (captura `00-captura.md`, 2026-07-19):

> *"ao analisar concorrentes, identifiquei uma funcionaldiade de construir formulários de perguntas personalizadas, para coletar no momento da inscrição, isso deve ser analisado depois, mas acho que precisamos de um construtor de formulário, que o organizador pode inserir no momento da compra ou inscrição em clubes e eventos. Podendo ser seleção multipla, ou unica, perguntas de sim ou nao ou anexo arquivos."*

Corte de v1 (AskUserQuestion 2026-07-19): **v1 = só perguntas (seleção múltipla, seleção única, sim/não); anexo de arquivo = fase 2**, pelo peso LGPD de documento de saúde.

## Decisões — RESOLVIDAS por default proposto (Vitor muda se quiser)

Cada decisão fecha uma lacuna que a captura deixou em aberto. O default está **em vigor**; nenhuma volta como pergunta bloqueante.

### D-FB-1 · Onde a resposta vive = no inscrito/membro (nunca no pedido) ⇒ RN-185
A resposta é atributo da **pessoa que participa**, não da compra. Grava no **inscrito** (checkout de evento) e no **membro** (inscrição de clube), no ato. Alinha com o registry `pessoas` (RN-173) e a posse de identidade por CPF (RN-174) **sem acoplar no claim**: a resposta viaja com o inscrito independentemente de a conta ter sido reivindicada. Confere com o mercado: a Sympla expõe as respostas por **Participante**, não por pedido ([Sympla · Central do Produtor](https://ajuda.produtor.sympla.com.br/hc/pt-br/articles/15444538269581), acesso 2026-07-19).

### D-FB-2 · Quem lê e como exporta = organizador/equipe do tenant, junto da lista de inscritos ⇒ RN-189
Leem o **organizador e a equipe do tenant** (papéis já existentes, E04-S304). A exportação **reusa a lista de inscritos que já existe** — a resposta é uma coluna do inscrito no export atual, sem criar um relatório novo. Mesmo padrão da Sympla (respostas no menu Participantes, botão Exportar). **Reuso-primeiro:** nada de export paralelo.

### D-FB-3 · Obrigatoriedade por pergunta = configurável; obrigatória bloqueia o pagar no mesmo fence dos aceites ⇒ RN-186
Cada pergunta tem um flag `obrigatoria`. Pergunta obrigatória sem resposta **bloqueia o pagar/inscrever no MESMO fence server-side dos aceites** (termo de compra/saúde, S1207/S306) — não é validação de cliente. Reusa a barreira de aceite existente; não cria gate novo.

### D-FB-4 · Limite de perguntas e de opções = teto sano, fonte única no core ⇒ RN-187
**Default proposto: 20 perguntas por formulário, 10 opções por pergunta.** Tetos como **constante única no core** (sem número hardcoded espalhado), no padrão de fonte única do `PIX_EXPIRACAO_SEGUNDOS` (RN-157). O Vitor ajusta os números num lugar só se quiser.

### D-FB-5 · Versionamento = a resposta carimba a versão da pergunta; edição nunca reescreve resposta antiga ⇒ RN-188
Editar uma pergunta depois de já haver respostas **versiona** — a resposta gravada **carimba a versão** da pergunta no ato e a versão antiga fica intacta; a edição vale para respostas futuras. Mesmo desenho do **termo de saúde versionado** (RN-149) e do **regulamento versionado** (S306-T3). Nunca há reescrita retroativa de resposta.

### D-FB-6 · Escopo de superfície = builder no painel (evento + clube), render na compra + inscrição de clube ⇒ RN-184/RN-189
Builder vive no painel do organizador: **config do evento (E04)** e **config do clube (E05)**. Render: **na compra (E12, checkout/landing)** e **na inscrição/entrada de clube (E05)**. O **modelo e o core são únicos** (donos em E04/S310-T1); E05 e E12 **reusam** — sem segunda fonte de tipos/limites/versionamento.

## Benchmark leve (referência de mercado, acesso 2026-07-19)

Confirmou os defaults, não os originou. Sem virar pesquisa longa.

- **Sympla — campos customizáveis na inscrição:** tipos oferecidos = Texto, Parágrafo, Lista (dropdown), Múltipla escolha (radio), Vários valores (checkbox); campos predefinidos à parte (CPF, telefone, endereço, termo). Respostas por **Participante**, exportáveis em Excel pelo menu Participantes. Perguntas podem ser por tipo de ingresso. Fonte: [Sympla · Central do Produtor](https://ajuda.produtor.sympla.com.br/hc/pt-br/articles/15444538269581) e [Soluções · Formulário para eventos](https://www.sympla.com.br/solucoes/formulario-para-eventos).
- **Doity — perguntas do participante:** o organizador cria e personaliza perguntas no formulário do participante (padrão de mercado equivalente). Fonte: [Doity · Central de Ajuda](https://ajuda.doity.com.br/pt-br/article/como-criar-e-personalizar-as-perguntas-no-formulario-do-participante-7cgm1x/).
- **Mapeamento para o v1 da Leela:** seleção única = radio; seleção múltipla = checkbox; sim/não = radio de 2 opções. Texto/parágrafo/dropdown ficam **fora do v1** (não pedidos). A resposta-por-participante e o export-por-participante do mercado ratificam D-FB-1 e D-FB-2.

## Fase 2 (anexo de arquivo) — GATED, uma linha de backlog

Anexo de arquivo **não entra no v1** (corte do Vitor). Fica registrado como **uma linha de nota futura simples** na história dona (E04/S310): *"fase 2: anexo de arquivo — detalhar quando for priorizado."* Sem elaboração de riscos, sem requisitos de retenção/acesso, sem gate de compliance nesta rodada.

## Premissas assumidas nesta consolidação

- **P-FB-1** · Modelo e core do formulário são **únicos** (donos em E04/S310-T1, `packages/core/src/forms/`); E05 e E12 reusam. Sem duplicar tipos/limites/versionamento.
- **P-FB-2** · A gravação da resposta no inscrito/membro roda **na mesma transação** da confirmação da inscrição (evento) / entrada no clube, no padrão de escrita server-only já usado nos aceites e nos agregados (nunca escrita de cliente para campo de domínio).
- **P-FB-3** · O gate de obrigatoriedade **reusa o fence de aceite existente** (S1207/S306), não um segundo mecanismo de bloqueio de pagamento.
- **P-FB-4** · A resposta é minimizada: o CRM (RN-172) **não** agrega respostas de formulário por default; incluir qualquer resposta no CRM exige decisão explícita do Vitor (mesma disciplina do endereço, P-CKMOD-1/E19).
