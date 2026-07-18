# RN-r9 · Regras de negócio novas/atualizadas da revisão UX (2026-07-18)

> Registro das RNs do LOTE R9. Numeração após grep da maior RN vigente por série (E11=800s, E09/E08/E17=300s/160s, E03=200s, E10=100s). **Estas RNs foram promovidas aos épicos correspondentes** (seção "Regras de negócio novas · R9" em cada épico). Aqui é o índice consolidado do pacote.

## Novas

| RN | Regra | Épico | Story |
|---|---|---|---|
| **RN-168** | Inputs de imagem do painel são **upload-only** via Firebase Storage; o campo "cole uma URL" é removido. **Supersede** o fallback de URL da ADR-016 (item 5). Escopo confirmado por decisão (default: morre em todas as superfícies de imagem). | E17 | S-R9-07 |
| **RN-171** | Patrocinador cadastrado fica **salvo no registro reutilizável do tenant** (`profissionais/{profId}/marcas`) e alimenta o cadastro futuro por **autocomplete/seleção** — não se recomeça do zero. Reusa o shape `ParceriaPatrocinador` (nome/modeloComercial/contrapartida). | E10 | S-R9-12 |
| **RN-172** | **CRM individual do organizador (PII).** A visão de clientes cruza identidade **cross-evento** por chave (CPF quando presente, e-mail fallback — a ratificar). Base legal/finalidade declaradas, minimização (só nome, nº eventos, valor/LTV, sexo, idade, aniversário — **sem dado sensível**). Leitura só `isTenantWriter`; nunca afiliado/patrocinador/coordenador; reader server-side com shape fechado; Rules fail-closed; expurgo na exclusão de conta; retenção RN-144. **Categoria DISTINTA do RN-820** (agregado sem PII). | E19 (novo) | S-R9-13 |
| **RN-227** | Kit tem **imagem quadrada 1:1** opcional (`Kit.imagemUrl`), ≤5MB, allowlist ADR-016 (SVG banido); exibida na dobra de kits da landing e na gestão de eventos; ausência = placeholder do DS (nunca imagem falsa). Storage em `eventos/{eventoId}/kits/{kitId}`. | E03 | S-R9-08 |
| **RN-228** | A **capa/banner horizontal do evento** (`Evento.imagemUrl`) é editável e **persistida** na edição da página de vendas. **Especificação RATIFICADA (Vitor 2026-07-18, adendo 6 — fonte: spec da Cheers):** **1600×838 px, proporção 1.9:1, arquivo ≤2MB, formatos JPEG/GIF/PNG.** Validação de upload (≤2MB + formato) nos ACs; compatível com a allowlist R5 (`image/(jpeg\|png\|webp\|gif\|avif)`; o cap de 2MB é app-level, mais estrito que os 5MB das Rules). Sem capa = gradiente (RN-166). | E03/E12 | S-R9-09 |
| **RN-229** | As **sub-navegações terciárias dentro de eventos** seguem o padrão de **Comunicação** (com divisória — `Tabs`/`border-b`). **Supersede** (no escopo das terciárias) a decisão "SubNav plano sem divisor" de 2026-07-11. | E01 | S-R9-10 |
| **RN-313** | Link de afiliado `?ref=<código>` é **capturado na inscrição** e atribuído na venda dentro da **janela de atribuição** (`dentroDaJanelaAtribuicao`), preservando a disciplina de atribuição do CTA (E12), reusando a costura `cupomParceria` do checkout — **sem split**. Atribuição fora da janela não conta. | E08 (antecipado) | S-R9-11 |
| **RN-314** | **Registro de conversões por afiliado** (`eventos/{id}/afiliados/{id}`), ∑ mantido por Function idempotente, escrita exclusiva de Function (Rules negam ao cliente); organizador vê conversões + valor atribuído (informativo, **sem** comissão nesta fase). | E08 (antecipado) | S-R9-11 |
| **RN-315** | **Clube como influenciador:** clube pode ter link de desconto próprio **condicionado a um mínimo de inscrições** (`minimoInscricoes`, definível pelo organizador por parceria/evento). Antes do mínimo (default): link rastreia conversão mas o **desconto só ativa ao cruzar o mínimo, sem retroativo**. | E08 (antecipado) | S-R9-11 |
| **RN-316** | **Influenciador pessoa física convidado por e-mail** a criar conta; dashboard das próprias vendas. **Reusa** `provisionAssessoriaAccount` (E18) + rate-limit R2 + kernel de atribuição. Produção depende do EmailProvider (fail-closed) — eleva a urgência do EmailProvider. | E08 (antecipado) | S-R9-11 |
| **RN-317** | **Config de novo influenciador (clube ou PF) via MODAL** no painel (padrão shadcn), não página dedicada. | E08 (antecipado) | S-R9-11 |
| **RN-318** | **Escopo de leitura do influenciador:** vê SÓ as próprias conversões (projeção fechada — qtd/valor/status); **nunca** dado de outros compradores além do agregado da própria atribuição. Rules fail-closed; PII PF com documento mascarado + trust anchors (padrão E18). | E08 (antecipado) | S-R9-11 |
| **RN-319** | **Acompanhamento de vendas na aba Clubs (dois lados):** o **organizador** vê as vendas/conversões do clube-influenciador e do influenciador PF na sua aba Clubs; o **clube/influenciador** vê as próprias vendas na aba Clubs da própria conta. Escopo de leitura coerente com RN-318 (cada influenciador só as próprias; organizador só as do próprio tenant). | E08 (antecipado) | S-R9-11 |

## Hipóteses (NÃO ratificadas — pendente validação)

| ID | Hipótese | Estado | Story |
|---|---|---|---|
| **HIP-R9-01** | **Modelo "pré-compra" do clube-influenciador (group-buy):** inscrições pelo link do clube entram em estado "pré-compra"; ao atingir o mínimo X do organizador, dispara a cobrança no cartão de todas. **PENDENTE VALIDAÇÃO COM ORGANIZADOR** (verbatim do Vitor: "quero validar isso depois"). 4 questões de dinheiro a responder — ver `DECISOES-ABERTAS` (HIP-R9-01). Default conservador enquanto não valida = RN-315 (gate de desconto, sem cobrança em lote). Quando/se implementar: dinheiro ⇒ Fable + review antagonista. | Hipótese | S-R9-11 |
| **RN-358** | A tela de **Repasses** é a **visão consolidada de todos os eventos** do organizador — declarado explicitamente em título/subtítulo/EmptyState. Os 3 cards de saldo seguem como saldo autoritativo (∑ do servidor). | E09 | S-R9-03 |
| **RN-821** | `/financeiro` é a **superfície única de análise de vendas (desempenho + analytics)** — a entrada "Analytics" do sidebar deixa de ser placeholder divergente. A Análise aceita **filtro por evento** e **seleção temporal** (intervalo de datas), lendo agregados `…/current` por evento (nunca varredura no cliente). | E11 | S-R9-01 |
| **RN-822** | Buckets etários da demografia passam a **bandas de 5 anos** (padrão corrida de rua): default `ate_17, 18_24, 25_29, 30_34, 35_39, 40_44, 45_49, 50_54, 55_59, 60_mais`. Idade na data civil da prova, determinística; mesma disciplina de PII do RN-820 (só contagens no agregado). | E11 | S-R9-02 |

## Atualizadas / referenciadas

- **ADR-016** (item 5, fallback de URL) — **supersedida** por RN-168 (upload-only). Doc da ADR atualizado com a mudança de decisão (histórico preservado).
- **RN-166** (capa `imagemUrl`, gradiente fallback) — referenciada por RN-228 (a capa 16/10 é a já estabelecida).
- **RN-820** (agregado demográfico sem PII) — base de RN-822; contrastada com RN-172 (o CRM individual é categoria oposta).
- **RN-123** (modelo comercial do patrocinador) — base de RN-171.
- **RN-364** (cupom `escopo`/`clubeRef`, E18) — kernel de atribuição-sem-split reusado por RN-313.

## Lição

- **L-006** — "Gate de contraste passado não cobriu o thumb do Switch (OFF ≈1.1:1 sobre o track) nem a borda do campo flat (≈1.0:1 vs página). Pares NÃO-texto de componente precisam entrar na matriz AA (`NON_TEXT_PAIRS`), não só pares de texto." (S-R9-04)
