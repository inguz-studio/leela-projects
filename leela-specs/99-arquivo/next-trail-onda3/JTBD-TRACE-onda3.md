# JTBD-TRACE-onda3 · Matriz story → JTBD → dimensão → horizonte

> PROPOSTA revisável. Cada story da Onda 3 rastreia a uma linha de `jobs-to-be-done.md` (rotulada **doc:**), a uma dor/ganho de `personas.md` (rotulada **persona:**), ou marca a aproximação/enabler honestamente. Dois **candidatos novos** (P6/P7) seguem o precedente P1-P5 da trilha next-trail — propostos, não aplicados.
> Dimensões: **T** Transacional H1 · **H** Heroica H2 · **M** Marketplace H2-H3 · **S** Social/identitária transversal.

---

## 1 · Matriz story → JTBD (5 lotes)

| Story | JTBD servido (origem declarada) | Persona | Dim. | Horizonte | Fase |
|---|---|---|---|---|---|
| **B1 · Robustez financeira/legal** | | | | | |
| `S305` política reembolso/transferência | doc 04.1 *"Preciso cancelar uma inscrição → Estornar com confirmação e histórico claro"* (P1 ratificada) | Organizador / Admin | T | H1 | V1 |
| `S306` saúde + regulamento (RN-149) | doc 04.1 (mais próximo) *"Compro inscrição → acompanhar no mesmo lugar"* — **enabler legal** da inscrição (regulamento/saúde não têm linha própria; aproximação marcada) | Organizador | T | H1 | V1 |
| `S307` capacidade de lote (RN-304) | doc 04.1 *"Publico evento → Configurar lotes e preços automáticos"* (edição manual da capacidade) | Organizador | T | H1 | V1 |
| `S904` máquina completa reembolso/transferência | doc 04.1 *"Estornar com confirmação e histórico"* (P1) + *"Processo repasse → operação escalável"* (Admin) | Organizador / Admin | T | H1 | V1 |
| `S1804` cupom-only (→E04) | doc 04.1 *"Configurar lotes e preços"* (modo de venda) | Organizador | T | H1 | V1 |
| **B2 · Web discovery + link-in-bio** | | | | | |
| `S1205` SEO fino | doc 04.1 *"Descubro evento → Me inscrever em poucos cliques"* (descoberta orgânica é o "quando" do job) | Atleta | T | H1 | V1 |
| `S1702` capas | doc 04.4 *"Falo com patrocinador → Ser visto como profissional"* | Organizador / Coord. | S | transv. | V1 |
| `S1700` perfil público / link-in-bio | doc 04.4 *"Olho meu perfil → identidade"* + 04.3 *"Aparecer na vitrine"* (aproximação: vitrine é do Prestador) → **candidato P6→P7** | Organizador (atleta = Onda 4) | S + M | H2 | V1 |
| `DN-1` editor de perfil no painel | doc 04.4 identidade (enabler de S1700; sem linha própria — honesto) | Organizador | S | transv. | V1 |
| **B3 · Assessorias parceiras** | | | | | |
| `S1800` cadastro + vínculo | doc 04.1 *"Vendo com promotor"* (gancho = desconto) + 04.3 *"Apoio evento → aparecer como apoiador"* → **candidato P6** | Organizador / Assessoria | T + M | H1→H2 | V1 |
| `S1801` convite + provisionamento | doc 04.1 *"Vendo com promotor"* / 04.3 *"Apoio evento"* → **P6** | Organizador → Assessoria | T | H1 | V1 |
| `S1802` desconto via cupom | doc 04.1 *"Configurar lotes e preços"* (gancho = desconto, sem split) | Organizador → Atleta | T | H1 | V1 |
| `S1803` gestão da parceria | doc 04.4 *"Falo com patrocinador → Ter dados na mão"* | Organizador | S | transv. | V1 |
| **B4 · Scheduler de campanhas** | | | | | |
| `S402` automações + scheduler agendada | doc 04.2 *"Assessoria manda treino → Receber dentro do app → Eliminar WhatsApp"* (família de comunicação; lado organizador = disparar sem operar) · persona 03.1 *"comunicação fragmentada"* | Organizador / Atleta | T + H | H1 | V1 |
| **B5 · App do atleta E13-slim** | | | | | |
| `S1300` setup Expo + EAS | *enabler de plataforma do atleta (sem JTBD de usuário direto — honesto)* | — (interno) | — | — | V1 |
| `S1302` tab navigator | *enabler de navegação (honesto)* | — (interno) | — | — | V1 |
| `S1301` provisionamento + login | doc 04.4 *"Olho meu perfil → identidade"* (o login abre a identidade do atleta) | Atleta | S | transv. | V1 |
| `S1304` descoberta de eventos | doc 04.1 *"Descubro evento → Me inscrever em poucos cliques"* | Atleta | T | H1 | V1 |
| `S1305` detalhe + kit | doc 04.1 *"Descubro evento → me inscrever"* (kit sem fricção, RN-216) | Atleta | T | H1 | V1 |
| `S1306` checkout + meus ingressos/QR | doc 04.1 *"Descubro → me inscrever"* + *"Compro inscrição → acompanhar kit, pagamento e resultado no mesmo lugar"* | Atleta | T | H1 | V1 |
| `S1310` entrar no clube + página | mapa Clubs *"pertencimento a comunidade local"* + doc 04.4 identidade | Atleta | S | transv. | V1 |
| `S1311` feed do clube (leitura) | doc 04.2 *"Vejo amigos ativos → sentir que estamos na mesma jornada"* (pertencimento) | Atleta | H | H2 | V1 |
| `S1312` push FCM | doc 04.2 *"Assessoria manda treino → Receber dentro do app → Eliminar WhatsApp"* | Atleta | H | H2 | V1 |

**Cobertura:** 100% das stories com superfície de usuário citam ao menos uma âncora **doc** literal (aproximações marcadas). Exceções honestas (enablers sem linha no doc): `S306` (aproximação enabler-legal, marcada), `S1300`, `S1302`, `DN-1` e o `Scheduler` — marcados em vez de forjar um job (L-004 / "não fabricar").

---

## 2 · Candidatos novos de JTBD (seguindo o precedente P1-P5) — propostos, NÃO aplicados

A Onda 3 traz duas personas **novas de superfície** (assessoria e atleta em superfície pública/app) e dois jobs que as stories servem mas o doc não nomeia. Cada candidato traz seção + ponto de inserção fixo + linha exata — ratificável verbatim, como P1-P5 foram (D6, 2026-07-10). **Não** editei `jobs-to-be-done.md`.

### Candidato P6 — Crescer o evento trazendo parceiros (assessorias) sem comissão
- **Seção:** `04.1 · Dimensão Transacional (H1)` — tabela.
- **Ponto de inserção:** imediatamente **após** a linha `| Vendo com promotor | ... |` (agrupa com o job de tração via terceiros).
- **Linha nova (exata):**
  > `| Quero crescer o evento | Cadastrar assessorias como clubes parceiros com desconto | Ganhar tração trazendo parceiros sem negociar comissão | Organizador |`
- **Motivo:** E18 (S1800-S1803) serve exatamente isso — tração B2B via **desconto**, não split. O doc tem *"Vendo com promotor → link rastreável → calcular comissão"*, que é o job de **afiliação/comissão** (cortado da V1); o job da assessoria parceira é distinto (condição, não comissão). Origem da dor: `personas.md` (Organizador quer volume; Assessoria quer condição + presença).

### Candidato P7 — Compartilhar quem eu sou num link único (link-in-bio)
- **Seção:** `04.4 · Social e Identitária (transversal)` — tabela.
- **Ponto de inserção:** imediatamente **após** a linha `| Olho meu perfil | ... |` (agrupa com o job de identidade).
- **Linha nova (exata):**
  > `| Compartilho quem eu sou | Um link único com meu feed, eventos e clubs | Ser descoberto e reter público sem depender do algoritmo de terceiros | Organizador / Atleta |`
- **Motivo:** E17-S1700 (perfil público `@handle`) serve descoberta orgânica + identidade num único link compartilhável. Hoje o doc tem *"Olho meu perfil → identidade, não consumo"* (introspecção in-app) e *"Aparecer na vitrine"* (do Prestador) — nenhum é o job de **link-in-bio público da pessoa/marca**. Benchmark Cheers (página de entidade + perfil).

---

## 3 · Como ratificar
Se o Vitor aprovar P6/P7, um passo posterior aplica as 2 linhas a `jobs-to-be-done.md` (nos pontos declarados) e re-roda a rastreabilidade. Até lá, as stories citam a âncora **doc mais próxima existente** (rotulada em `STORIES-onda3.md`), sem depender da edição para não bloquear o plano. Aprovação parcial funciona: P6 e P7 são independentes.
