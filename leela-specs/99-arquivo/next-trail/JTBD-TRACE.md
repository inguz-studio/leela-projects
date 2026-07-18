# JTBD-TRACE · Matriz de rastreabilidade story → JTBD → dimensão → horizonte

> ~~PROPOSTA revisável~~ → **RATIFICADA (Vitor, D6 — 2026-07-10/11): P1-P5 APLICADAS a `be-hero-documentacao/be-hero-docs/jobs-to-be-done.md §04.1` em 2026-07-10** (ordem de inserção: P5→P1→P2→P3 após "Compro inscrição"; P4 = última linha da tabela). A §2 abaixo permanece como registro da proposta e referência das linhas exatas. Autoridade: **sf-ux-engineer** (Norman/Sierra/Zhuo).
> Dimensões: **T** Transacional H1 · **H** Heroica H2 · **M** Marketplace H2-H3 · **S** Social/identitária transversal.

---

## 1 · Matriz story → JTBD (4 frentes)

> Convenção de origem (r2): **doc** = linha literal de `jobs-to-be-done.md` (§04.x / mapa Clubs) · **persona** = dor/ganho/JTBD de `personas.md` (§03.x) · **P#** = candidato proposto na §2 · **story** = job herdado de uma story de `leela-specs`. A rodada 1 misturava as fontes; agora cada citação declara a sua.

| Story | JTBD servido (origem declarada) | Persona | Dim. | Horizonte | Fase |
|---|---|---|---|---|---|
| **F1 · Fable** | | | | | |
| `LEELA-FABLE-A` | doc 04.1 "Compro inscrição → acompanhar kit, pagamento e resultado no mesmo lugar" · persona 03.1 dor #1 "inadimplência invisível" → **P5** | Atleta / Organizador | T | H1 | V1 |
| `LEELA-FABLE-B` | doc 04.1 (mais próximo) "acompanhar... pagamento no mesmo lugar" · persona 03.1 "processo claro de reembolso" + 03.7 "processar reembolso e repasse em lote" → **P1** · ≙ fatia E09-S904 | Organizador / Admin | T | H1 | V1 |
| `LEELA-FABLE-C` | doc 04.1 "acompanhar... no mesmo lugar" (ingresso válido) + doc 04.4 "Passo pela largada → rotina teve sentido" · persona ganho "100% kit certo" → **P2** · ≙ recorte S208 | Atleta / Organizador | T + S | H1 | V1 |
| `LEELA-FABLE-D` | doc 04.1 "acompanhar KIT... no mesmo lugar" · persona 03.1 "coleta automática de tamanho de kit" + dor "kit errado na entrega" → **P3** · ≙ S209+S210 | Organizador | T | H1 | V1 |
| `LEELA-FABLE-E` | enabler de D — mesmas âncoras (doc 04.1 kit · **P3**) | Organizador | T | H1 | V1 |
| `LEELA-FABLE-F` | doc 04.1 (mais próximo) "acompanhar KIT..." (janela de retirada; alimenta seção Retirada E12-L2) · persona 03.1 dor central "logística de kit" → **P4** *(r2: âncora anterior "Processo repasse" era o job de payout — corrigida)* | Organizador | T | H1 | V1 |
| `LEELA-FABLE-G` | doc 04.4 "Ter dados na mão" · persona 03.1 dor "comunicação fragmentada" | Organizador | T + S | H1 | V1 |
| **F2 · RESP-MOBILE** | | | | | |
| `LEELA-RESP-M1` | **P4** "operar o evento pelo celular no dia da prova" · âncora doc 04.4 "Ter dados na mão" (transversal 390px) | Organizador | T | H1 | V1 |
| `LEELA-RESP-M3` | doc 04.4 "Ter dados na mão" (KPIs no celular) | Organizador / Coord. | S | transv. | V1 |
| `LEELA-RESP-M5` | doc 04.1 "acompanhar... pagamento" + doc 04.4 · persona dor #1 → **P5** (tabelas no celular) | Organizador | T | H1 | V1 |
| `LEELA-RESP-M4` | **P4** · âncora doc 04.4 (drill de 5+ abas utilizável no celular) | Organizador | T | H1 | V1 |
| `LEELA-RESP-M2/M6/M7` | doc 04.4 + **P4** · "abrir rápido o evento que gerencio" = job da **story S200** (não é linha do doc) | Organizador | T + S | H1 | V1 |
| **F3 · Onda 2** | | | | | |
| E04-slim S300 | doc 04.1 "Configurar lotes e preços automáticos (eliminar virada manual de lote)" | Organizador | T | H1 | V1 |
| E04-slim S304 | doc 04.1 "operação escalável" (cláusula Para — aproximação; sem linha própria de equipe) · persona ganho 03.1 "dormir tranquilo" | Organizador / Admin | T | H1 | V1 |
| E04-PAY | doc 04.1 (mais próximo) "acompanhar... pagamento" · persona 03.1 "confirmação automática de pagamento" | Organizador | T | H1 | V1 |
| E12 S1200-S1203 | doc 04.1 "Descubro evento → me inscrever em poucos cliques (reduzir fricção)" | Atleta | T | H1 | V1 |
| E12 S1205 (SEO) *(r2)* | doc 04.1 "Descubro evento → me inscrever..." (descoberta orgânica é o "quando" do job) | Atleta | T | H1 | V1 |
| E12 S1207 + S1204-T2 *(r2)* | S1207 = enabler legal do job de inscrição (por inscrito, ADR-011) · S1204-T2 = doc 04.1 "configurar lotes e preços" (cupom é pricing) | Atleta / Organizador | T | H1 | V1 |
| E12 S1206 | doc 04.1 "acompanhar kit, pagamento e resultado no mesmo lugar" (ingresso QR; log de envio reusa FABLE-G) | Atleta | T | H1 | V1 |
| E12 S1202 | doc 04.3 "Apoio evento → aparecer como apoiador" + mapa Clubs "pertencimento a comunidade local" · "vitrine" (04.3) é do Prestador — extensão marcada | Marca / Coord. | M + S | H2 | V1 |
| E09-slim | doc 04.1 "Processo repasse → ver saldo a liberar e disparar em lote (operação escalável)" · persona 03.7 Admin *(r2: removido "repasse automático e transparente" — JTBD do PROMOTOR/afiliação, cortada da V1)* | Admin / Organizador | T | H1 | V1 |
| E07-web | doc 04.4 "Ser visto como profissional" (aproximação) · persona ganho 03.1 "parecer tão profissional quanto um evento de São Paulo" | Organizador | S | transv. | V1 |
| E06 campanhas | doc 04.2 "Receber dentro do app → Eliminar WhatsApp" · persona 03.1 dor "comunicação fragmentada" | Organizador / Atleta | T + H | H1 | V1 |
| Transv. S821 rollup | doc 04.4 "Ter dados na mão" · persona 03.1 dor "sem visibilidade de funil" | Organizador | T + S | H1 | V1 |
| Transv. S1307/S1308 | doc 04.2 "que meditação/sono contem como progresso" + "rotina com propósito" | Atleta | **H** | **H2** | **V1.5** |
| **F4 · Consolidações** | | | | | |
| `LEELA-CONS-1` KpiCard | doc 04.4 "Ter dados na mão" (consistência do stat-tile) | Organizador / Coord. | S | transv. | — |
| `LEELA-CONS-3` mutations plataforma | *enabler* · persona 03.7 "visão consolidada do que roda na plataforma" (sem linha no doc — honesto) | Admin | T + S | H1 | — |
| `LEELA-CONS-4` backend-dep | mapa Clubs "comunidade com rosto e nome" / doc 04.4 "ter dados na mão" | Coord. / Organizador | S | transv. | — |
| `LEELA-CONS-6` UX-DADOS L2 | doc 04.4 "Ter dados na mão" · persona ganho 03.1 "relatório de vendas em tempo real sem exportar planilha" | Organizador | T | H1 | — |
| `LEELA-CONS-2` flaky test | *enabler de qualidade — sem JTBD de usuário direto (honesto)* | — (interno) | — | — | — |
| `LEELA-CONS-5` org defs | *meta-organizacional — sem JTBD de usuário direto (honesto)* | — (interno) | — | — | — |

**Cobertura (r2):** 100% das stories de F1/F2/F3 têm ao menos uma âncora **doc** literal (aproximações marcadas e cobertas por P1-P5). Exceções honestas, todas em F4: `CONS-2`, `CONS-3` e `CONS-5` são enablers sem linha no doc — marcadas em vez de forjar um job (L-004 / "não fabricar").

---

## 2 · Edições a `jobs-to-be-done.md` — **RATIFICADAS E APLICADAS 2026-07-10 (D6)** *(texto original da proposta preservado abaixo)*

O planejamento revelou **5 JTBD ausentes** que as stories desta trilha servem mas que o doc não nomeia explicitamente. Cada proposta traz seção + ponto de inserção fixo + linha exata — ratificável verbatim. A tabela 04.1 hoje tem 5 linhas, na ordem: *Publico evento · Descubro evento · Vendo com promotor · Compro inscrição · Processo repasse*.

### Proposta P5 — Inadimplência visível (a dor #1 do Organizador) *(nova na r2)*
- **Seção:** `04.1 · Dimensão Transacional (H1)` — tabela.
- **Ponto de inserção:** imediatamente **após** a linha `| Compro inscrição | ... |` (agrupa com o job de pagamento).
- **Linha nova (exata):**
  > `| Vendo inscrições chegarem | Ver quem pagou e quem está pendente | Tornar a inadimplência visível sem checagem manual | Organizador |`
- **Motivo:** é a **dor #1** da persona 03.1 ("Inadimplência invisível: não sabe quem pagou sem checar manualmente") e o HANDOFF a chama de "o job número um do Organizador" — mas a tabela 04.1 não tem a linha. FABLE-A, RESP-M5 e o banner de pendências do S203 a servem; a rodada 1 chegou a citá-la como se fosse do doc (defeito corrigido — agora é proposta formal).

### Proposta P1 — Estorno com dignidade/transparência (Frente B)
- **Seção:** `04.1 · Dimensão Transacional (H1)` — tabela.
- **Ponto de inserção:** imediatamente **após** a linha de P5 (bloco de pagamento).
- **Linha nova (exata):**
  > `| Preciso cancelar uma inscrição | Estornar com confirmação e histórico claro | Ter processo de reembolso digno e sem duplicar dinheiro | Organizador / Admin |`
- **Motivo:** persona 03.1 lista "processo claro de reembolso" como JTBD funcional, mas a tabela 04.1 não o carrega. FABLE-B o materializa (por inscrito — ADR-011).

### Proposta P2 — Validar ingresso sem fraude na largada (Frente C)
- **Seção:** `04.1 · Dimensão Transacional (H1)` — tabela.
- **Ponto de inserção:** imediatamente **após** a linha de P1.
- **Linha nova (exata):**
  > `| Faço check-in no balcão | Validar o ingresso server-side | Rejeitar QR adulterado/duplicado (confiança na largada) | Organizador / Atleta |`
- **Motivo:** FABLE-C (validação de assinatura do QR, ≙ S208) serve confiança/segurança do check-in; hoje implícito em "kit certo" mas sem linha própria. Cruza a dimensão Social ("passar pela largada com sentido").

### Proposta P3 — Conferir estoque por tamanho antes da largada (Frente D)
- **Seção:** `04.1 · Dimensão Transacional (H1)` — tabela.
- **Ponto de inserção:** imediatamente **após** a linha de P2.
- **Linha nova (exata):**
  > `| Preparo a entrega de kits | Conferir estoque por tamanho (PP-XG) com movimentações | Não errar o kit por falha de coleta de tamanho | Organizador |`
- **Motivo:** persona 03.1 tem a dor "Kit errado na entrega por falha de coleta manual de tamanho" e o ganho "100% do kit certo", mas a tabela 04.1 não tem linha de estoque por tamanho. FABLE-D (≙ S209+S210) a serve.

### Proposta P4 — Operar o evento pelo celular no dia da prova (Frente F2 · RESP-MOBILE)
- **Seção:** `04.1 · Dimensão Transacional (H1)` — tabela.
- **Ponto de inserção:** **última linha** da tabela 04.1 (após "Processo repasse..." e após P1-P3/P5 se aprovadas).
- **Linha nova (exata):**
  > `| Estou no local do evento | Operar o painel (inscritos/check-in/kits) pelo celular | Gerenciar em campo sem depender do desktop | Organizador |`
- **Motivo:** o balcão/check-in acontecem no local, no celular; RESP-MOBILE (mobile real 390×844) é uma emenda ao PRD do Vitor mas o JTBD que a justifica não está no doc. Ancora o passe mobile a um job, não a "colapso de tela" (L-004). *(r2: removida a alternativa "ou nota transversal" — posição única, ratificável verbatim.)*

### Nota de dimensão (não é edição, é observação)
As stories `S1307/S1308` (backend do desafio) servem a **Dimensão Heroica H2** já documentada (04.2) — sem edição necessária, só confirmação de que entram como **V1.5 (engajar)**, coerente com o princípio de priorização 04 ("Heroica depois, quando a base existe").

---

## 3 · Como ratificar
Se o Vitor aprovar P1-P5, um passo posterior aplica as 5 linhas a `be-hero-documentacao/be-hero-docs/jobs-to-be-done.md §04.1` (na ordem de inserção declarada acima) e re-roda a rastreabilidade. Até lá, as stories citam a âncora **doc mais próxima existente** (rotulada em `STORIES-next.md`), sem depender da edição para não bloquear o plano. Aprovação parcial funciona: cada P# é independente; os pontos de inserção dos aprovados se acomodam na ordem relativa proposta.

**✅ FEITO (2026-07-10, round 3 — promoção):** Vitor aprovou P1-P5 (D6) e as 5 linhas foram aplicadas verbatim ao doc canônico na ordem declarada. As stories da trilha podem agora citar P1-P5 como linhas do doc.
