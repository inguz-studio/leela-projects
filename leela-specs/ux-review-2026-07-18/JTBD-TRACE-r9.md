# JTBD-TRACE-r9 · Matriz story → JTBD → dimensão · revisão UX 2026-07-18

> PROPOSTA revisável. Cada story do LOTE R9 rastreia a uma linha de `jobs-to-be-done.md` (rotulada **doc:**), a uma dor/ganho de `personas.md` (**persona:**), ou marca a aproximação/enabler honestamente. Um **candidato novo** (P8 · CRM do organizador) segue o precedente P1-P7 — proposto, não aplicado.
> Dimensões: **T** Transacional H1 · **H** Heroica H2 · **M** Marketplace H2-H3 · **S** Social/identitária transversal.

---

## 1 · Matriz story → JTBD

| Story | JTBD servido (origem declarada) | Dim. | Épico | RNs |
|---|---|---|---|---|
| `S-R9-01` /financeiro unificado + filtro + calendário | doc 04.1 *"Publico evento → acompanhar resultado de relance"* + persona 03.1 (desempenho invisível) | T | E11 | RN-821 |
| `S-R9-02` cohort idade×sexo 5-em-5 | doc 04.4 *"Falo com patrocinador → dados na mão"* + 04.1 (acompanhar resultado) | T+S | E11 | RN-822 |
| `S-R9-03` repasses = visão consolidada | doc 04.1 *"Processo repasse → operação escalável"* | T | E09 | RN-358 |
| `S-R9-04` contraste Switch/flat | *enabler de acessibilidade (sem linha direta — honesto)* | — | E01 | — (L-006) |
| `S-R9-05` diretriz shadcn + Combobox | *enabler de consistência (honesto)* | — | E01 | — (diretriz) |
| `S-R9-06` fluidez de navegação | *enabler de UX (honesto)* — referencia L-002/ADR-010 | — | transversal | — |
| `S-R9-07` foto de perfil upload-only | doc 04.4 *"Olho meu perfil → identidade"* | S | E17 | RN-168 |
| `S-R9-08` kits imagem 1:1 | doc 04.1 *"Descubro evento → me inscrever"* (kit sem fricção, RN-216) | T | E03 | RN-227 |
| `S-R9-09` capa horizontal na página de vendas | doc 04.4 *"ser visto como profissional"* + 04.1 (descoberta) | S+T | E03/E12 | RN-228 |
| `S-R9-10` divisórias de menus terciários | *enabler de consistência (honesto)* | — | E01 | RN-229 |
| `S-R9-11` afiliado/influenciador antecipado | doc 04.1 *"Vendo com promotor → link rastreável"* + candidato P6 | T+M | E08 (antecipado) | RN-313, RN-314 |
| `S-R9-12` patrocinadores reutilizáveis | doc 04.4 *"gerenciar num lugar só onde cada marca aparece"* | S | E10 (seed) | RN-171 |
| `S-R9-13` CRM + hub Comunicação | doc 04.4 *"dados na mão"* + candidato **P8** (CRM do organizador) | S+T | **E19** (novo) | RN-172 |
| `S-R9-14` adapter EmailProvider (Resend) | *enabler de infra (honesto)* — destrava convite E18/E08, campanhas E06 | — | E06 | RN-137 |

**Cobertura:** 100% das stories com superfície de usuário citam ao menos uma âncora **doc** (aproximações marcadas). Exceções honestas (enablers de infra/UI sem linha direta): `S-R9-04`, `S-R9-05`, `S-R9-06`, `S-R9-10` — marcadas em vez de forjar job (L-004).

---

## 2 · Candidato novo de JTBD (segue o precedente P1-P7) — proposto, NÃO aplicado

### Candidato P8 — Conhecer e reter a própria base de clientes (CRM do organizador)
- **Seção:** `04.4 · Social e Identitária (transversal)` (ou uma nova subseção de gestão de base) — tabela.
- **Ponto de inserção:** imediatamente **após** a linha `| Falo com patrocinador | ... |` (agrupa com o job de "dados na mão").
- **Linha nova (exata):**
  > `| Quero conhecer meus clientes | Ver todos os atletas que compraram, com LTV e histórico cross-evento | Reter e ativar a própria base sem depender de planilha | Organizador |`
- **Motivo:** E19 (S-R9-13) serve exatamente isso — visão única de clientes com LTV, cross-evento, ligada a comunicação. O doc tem *"Falo com patrocinador → dados na mão"* (dado para o patrocinador), mas nenhum job de **base própria de clientes/CRM**. Origem da dor: `personas.md` (Organizador quer volume e retenção). **Distinção crítica de dado:** é PII individual cross-evento (RN-172), categoria oposta ao agregado-sem-PII do RN-820 (E11) — por isso épico próprio, não extensão do analytics.

---

## 3 · Como ratificar
Se o Vitor aprovar P8, um passo posterior aplica a linha a `jobs-to-be-done.md` (no ponto declarado) e re-roda a rastreabilidade. Até lá, `S-R9-13` cita a âncora **doc mais próxima existente** (04.4 "dados na mão"), sem depender da edição para não bloquear o plano.
