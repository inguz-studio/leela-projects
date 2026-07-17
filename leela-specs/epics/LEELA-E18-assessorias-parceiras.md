# LEELA-E18 · Assessorias parceiras (tração B2B)

- **Superfície:** Painel (organizador cadastra/gerencia) + Landing/e-mail (convite + cadastro do responsável)
- **Horizonte:** H1→H2 (alavanca de tração B2B)
- **MoSCoW:** Should
- **Estimativa:** L
- **Status:** 📋 novo (planejado 2026-07-12)
- **Depende de:** LEELA-E05 (clubes + convite por e-mail S104 + parcerias S107), LEELA-E04 (cupom S300), LEELA-E16 (`commercialTerms` por tenant), LEELA-E00 (Firebase Auth — provisionamento de conta), LEELA-E12 (checkout aplica cupom/desconto)
- **De-para:** reaproveita a mecânica de **E08** (afiliação — adiado) e **E05-S107** (parcerias de clube). Benchmark: [[benchmark-cheers]] (clube/benefício ancorado ao ingresso) · [[benchmark-ticketing-br]] (isenção de grupos/assessorias da TicketSports).
- **Onda:** **Onda 3** (depende do cupom/termos que fecham na Onda 2)

## Objetivo

Destravar **tração B2B via organizador → parceiros**: dar ao organizador de corrida uma forma de **cadastrar assessorias como clubes parceiros** com **condição especial de desconto**, e de trazer os responsáveis dessas assessorias para dentro da Leela com o mínimo de atrito. A regra de negócio é dura: **só clubes** podem ter condições especiais de desconto — logo, uma assessoria parceira **é modelada como um clube** (reusando E05), com um vínculo de parceria ao organizador que a cadastrou. Quando o responsável pela assessoria ainda não tem conta Leela, o organizador dispara um **convite por e-mail**; o responsável completa o cadastro do convite, e a conta Leela + o club parceiro são criados **automaticamente**, já entrando com o desconto exclusivo.

É a materialização, no vertical esportivo, do padrão que a TicketSports pratica (isenção/bonificação para assessorias e grupos de 10+ atletas) e do moat descrito no benchmark Cheers (benefício ancorado ao ingresso, controlado por quem detém a venda). O organizador ganha volume trazendo assessorias; a assessoria ganha **condição** (desconto para seus atletas) e **presença** (um clube com página, feed e comunicação na plataforma).

Nada aqui é afiliação com split de comissão (E08, cortado da V1): o parceiro não recebe repasse — ele recebe **desconto** para seus atletas. Isso simplifica a máquina financeira (sem split) e reusa cupom + termos comerciais já existentes.

## Personas & JTBD

- **Organizador (persona primária).** JTBD Transacional (`jobs-to-be-done.md` 04.1) *"Vendo com promotor → link rastreável"* — aqui o "promotor" é a assessoria parceira, e o gancho é desconto, não comissão. Ganho: crescer o evento trazendo parceiros que mobilizam seus atletas.
- **Assessoria / Coordenador (persona primária).** JTBD Social/Identitária (04.4) *"Ser visto como profissional / ter dados na mão"* + Marketplace (04.3) *"apoiar evento → aparecer como apoiador"*. Ganho: condição de desconto para seus atletas + presença (clube) na plataforma sem burocracia.
- **Atleta da assessoria (persona secundária).** JTBD Transacional (04.1) *"me inscrever em poucos cliques"* — usa o cupom/condição do clube parceiro no checkout (E12).

> **JTBD proposto (candidato, seguindo o precedente P1-P5 de `next-trail/JTBD-TRACE.md`):**
> `| Quero crescer o evento | Cadastrar assessorias como clubes parceiros com desconto | Ganhar tração trazendo parceiros sem negociar comissão | Organizador |`
> — a inserir em `04.1 · Transacional` após ratificação. Até lá, as US citam a âncora doc mais próxima (04.1 "vendo com promotor" / 04.3 "apoiar evento").

## Critérios de sucesso do épico

- Um organizador cadastra uma assessoria como club parceiro por **CNPJ ou CPF** em uma tela do painel, sem sair do contexto do evento/organização.
- Se o responsável **já tem conta Leela**, o vínculo é criado na hora (parceria `ativa`) e o clube parceiro fica disponível com a condição de desconto.
- Se **não tem conta**, o organizador dispara **convite por e-mail**; o responsável abre o link, completa o cadastro, e **conta Leela + club parceiro** nascem juntos, já como parceiro com desconto — tudo idempotente (reabrir o link não duplica).
- A condição de desconto do club parceiro é **exclusiva de clubes** (RN-360) e aplicada no checkout via cupom/condição, respeitando os termos comerciais do tenant (retenção/repasse — E16/E09).
- Toda ação destrutiva (encerrar parceria) tem confirmação + disclaimer; dados retidos por 90 dias (RN-144).

## Regras de negócio aplicáveis

Reaproveitadas de E05/E04/E16 + bloco novo RN-360..365 (ratificado 2026-07-17):

- **RN-101 / RN-140 / RN-104** (E05) — clube tem `codigoConvite`, `visibilidade`, `modeloEntrada`; a assessoria parceira reusa o modelo `clubes/{clubId}`.
- **RN-106** (E05, S104) — convite por e-mail: 1..50 e-mails por envio, dedupe case-insensitive, reenvio idempotente. A máquina de convite da assessoria **reusa** essa mecânica (`convites/{emailKey}`).
- **RN-123** (E05, S107) — parceria de clube tem `tipo` e `status`(convite_pendente/ativa/inativa). A parceria organizador↔assessoria é um novo `tipo` de parceria.
- **RN-360 (proposta)** — **só clubes** podem ter condição especial de desconto; a condição é um atributo da **parceria** (organizador↔club parceiro), nunca de um atleta avulso.
- **RN-361 (proposta)** — assessoria parceira é cadastrada por **CNPJ ou CPF**; o documento é validado (formato + dígito) e é a chave de dedupe do club parceiro dentro do tenant (não duplica assessoria).
- **RN-362 (proposta)** — se o responsável (identificado por e-mail) **já tem conta Leela**, o cadastro **vincula** (cria a parceria `ativa` + o clube parceiro sob a titularidade dele); se **não tem**, gera `convites/{emailKey}` `status=pendente` e o fluxo espera o aceite.
- **RN-363 (proposta)** — ao aceitar o convite e completar o cadastro, uma Function cria **atomicamente**: conta Firebase Auth (claim de papel), o `clubes/{clubId}` do parceiro e a `parceria` `ativa` — idempotente por `emailKey`/documento (reabrir o convite não duplica conta nem clube).
- **RN-364 (proposta)** — a condição de desconto do club parceiro materializa-se como **cupom** (E04/S300) marcado como exclusivo do clube (`escopo='club_parceiro'`, `clubeRef`), com teto/validade; o checkout resolve o desconto pelo cupom, sem split.
- **RN-365 (proposta)** — o desconto respeita os `commercialTerms` do tenant (retenção % + repasse D+N — RN-338/339); descontos não alteram a máquina de repasse, só o valor bruto da inscrição.
- **RN-144** (E05) — encerrar parceria é irreversível com disclaimer; export/retenção de dados por 90 dias.

## Modelo de dados tocado

Ver `modelo-de-dados-firestore.md`. Reusa `clubes` + `convites` + cupom; acrescenta o vínculo de parceria de assessoria.

- **`clubes/{clubId}`** (E05, reuso) — a assessoria parceira **é um clube**. ➕ campos: `ehAssessoriaParceira`(bool), `documento { tipo('cnpj'|'cpf'), valor }` (RN-361), `parceiroDeTenant→tenants` (o organizador que a cadastrou). `categoria` = "Assessoria esportiva" (já é um valor de `CATEGORIAS_CLUBE`).
- ➕ **`tenants/{tenantId}/parceirosAssessoria/{parceriaId}`** (nova subcoleção; o organizador é o tenant) — `clubeRef→clubes`, `documento`, `responsavelEmail`(lowercase), `responsavelUid?`, `status`(convite_pendente/ativa/inativa — RN-123), `condicaoDesconto { cupomRef, tipo, valor, teto?, validade? }` (RN-364), `criadoEm`, `criadoPor`. Escrita só por Function; leitura pelo tenant organizador.
- **`clubes/{clubId}/convites/{emailKey}`** (E05-S104, reuso) — o convite ao responsável reusa esta coleção/máquina (docId = e-mail lowercase, RN-106). ➕ `origem='assessoria_parceira'`, `parceriaRef` para amarrar o aceite ao provisionamento (RN-363).
- **`eventos/{id}/cupons/{cupomId}`** (E04-S300, reuso) — ➕ `escopo`('geral'|'club_parceiro'), `clubeRef?` (RN-364). O cupom exclusivo do parceiro resolve o desconto no checkout (E12-S1204/S300-T5).
- **`tenants/{tenantId}/commercialTerms/current`** (E16, reuso) — `retencaoPct` (RN-339) + `anticipation.repasseDiasUteis` (RN-338) governam o repasse; o desconto do parceiro entra antes, no bruto.
- **Auth (E00, reuso):** provisionamento da conta do responsável no aceite (Function `provisionAssessoriaAccount`, espelha o padrão de `provisionTenant`/`onCreateUser`).

## Reuso (mapa explícito — o que NÃO reconstruir)

| Preciso de… | Já existe em | Como reuso |
|---|---|---|
| Modelo de clube (página, feed, comunicação) | E05 `clubes/{clubId}` ✅ | assessoria parceira é um clube com flag + documento |
| Convite por e-mail idempotente | E05-S104 `enviarConvites` + `convites/{emailKey}` ✅ | mesma máquina; `origem='assessoria_parceira'` |
| Parceria com status (convite_pendente/ativa/inativa) | E05-S107 `parcerias` ✅ | novo `tipo` de parceria (organizador↔assessoria) |
| Cupom de desconto por evento | E04-S300 `cupons` ✅ (S300-T1 pronto) | cupom com `escopo='club_parceiro'` |
| Termos comerciais por tenant (retenção/repasse) | E16-S1602 `commercialTerms` ✅ | lê retenção % + D+N; não altera |
| Provisionamento atômico de conta | E16-S1601 `provisionTenant` / E00 Auth ✅ | espelha o padrão para o responsável |
| Aceitar afiliação num clique (gera artefato) | E08-S702 (spec, adiado) | reusa o desenho de "aceitar → cria vínculo via Function" (sem split) |

Ou seja: **nenhuma entidade de dinheiro nova, nenhum split.** O épico é, em essência, "clube (E05) + convite (E05) + cupom (E04) + provisionamento (E16)" amarrados por uma parceria de assessoria.

## Fora de escopo (Won't nesta fase)

- **Split / comissão / repasse ao parceiro** (isso é afiliação — E08, cortado da V1). O parceiro recebe **desconto**, não dinheiro.
- Marketplace público de assessorias / descoberta algorítmica (Onda 5).
- Gestão de contrato/nota fiscal entre organizador e assessoria (fora do produto por ora).
- Sub-parceria (assessoria cadastra sub-assessoria).
- KYC do responsável (a conta nasce com papel restrito; verificação pesada é pós-V1).

---

## User stories

Stories: **S1800** (cadastro de assessoria por CNPJ/CPF + vínculo se já tem conta) · **S1801** (convite por e-mail + provisionamento automático no aceite) · **S1802** (condição de desconto do club parceiro via cupom) · **S1803** (gestão da parceria: lista, status, encerrar) · **S1804** (cupom-only / evento fechado — regra nova, encaixe E04).

---

### LEELA-S1800 · Cadastrar assessoria como club parceiro (CNPJ/CPF) + vínculo se já tem conta

**Como** organizador, **quero** cadastrar uma assessoria como club parceiro informando CNPJ ou CPF e o e-mail do responsável, **para** dar a ela condição de desconto e trazê-la para a plataforma.

**JTBD:** 04.1 "vendo com promotor" (gancho = desconto) / 04.3 "apoiar evento". **Persona:** Organizador.
- **MoSCoW:** Should · **Estimativa:** M · **Superfície:** Painel · **Onda:** 3

**Critérios de aceite (Given/When/Then):**
- **Dado** o formulário de nova assessoria, **quando** informo um CNPJ/CPF válido + e-mail + nome, **então** o documento é validado (formato+dígito) e checado contra assessorias já cadastradas no tenant (dedupe — RN-361).
- **Dado** que o e-mail do responsável **já tem conta Leela**, **quando** confirmo, **então** uma Function cria o `clubes/{clubId}` parceiro (titularidade do responsável) + a `parceria` `ativa`, sem convite (RN-362).
- **Dado** um documento já cadastrado no tenant, **quando** tento cadastrar de novo, **então** sou avisado (não duplica).
- **Dado** um CNPJ/CPF inválido, **quando** tento avançar, **então** erro inline e avanço bloqueado.

**Tasks:** S1800-T1 (tela + form de cadastro no painel, validação de documento no core) · S1800-T2 (Function `vincularAssessoriaExistente`: cria clube + parceria quando o responsável já tem conta, idempotente por documento; Rules).

**Contexto:** validação de CNPJ/CPF pura em `packages/core/src/assessoria/documento.ts`; a categoria do clube = "Assessoria esportiva" (valor já em `clube-opcoes.ts`).

---

### LEELA-S1801 · Convite por e-mail + provisionamento automático da conta no aceite

**Como** organizador, **quero** que, se o responsável não tem conta, ele receba um convite e, ao completar o cadastro, a conta + o club parceiro nasçam automaticamente, **para** trazer a assessoria sem atrito.

**JTBD:** 04.1 "vendo com promotor" / 04.3 "apoiar evento". **Persona:** Organizador → Assessoria.
- **MoSCoW:** Should · **Estimativa:** M · **Superfície:** Painel (dispara) + Landing/e-mail (aceite) · **Onda:** 3

**Critérios de aceite (Given/When/Then):**
- **Dado** um responsável **sem** conta Leela, **quando** o organizador confirma o cadastro, **então** é criado `convites/{emailKey}` `status=pendente` (origem `assessoria_parceira`) e o disparo de e-mail é registrado (reusa a máquina de E05-S104; disparo físico via `EmailProvider` quando existir).
- **Dado** o link do convite, **quando** o responsável completa o cadastro (senha/OAuth + confirma dados da assessoria), **então** uma Function cria **atomicamente** a conta Firebase Auth (papel do responsável), o `clubes/{clubId}` parceiro e a `parceria` `ativa` (RN-363).
- **Dado** o mesmo convite reaberto/reenviado, **quando** processo, **então** nada duplica (idempotente por `emailKey`/documento).
- **Dado** um convite expirado, **quando** o responsável abre, **então** vê estado "convite expirado" com caminho para reenvio.

**Tasks:** S1801-T1 (dispara convite reusando `enviarConvites` + `origem`/`parceriaRef`) · S1801-T2 (página pública de aceite do convite na landing) · S1801-T3 (Function `provisionAssessoriaAccount`: cria Auth + clube + parceria atômico/idempotente; espelha `provisionTenant`; Rules + testes de idempotência).

> **Reforço de teste (crítico):** o provisionamento é atômico e idempotente — reexecutar o aceite não cria segunda conta nem segundo clube. Cobertura no emulador (padrão do E16-S1601).

---

### LEELA-S1802 · Condição de desconto do club parceiro (via cupom, sem split)

**Como** organizador, **quero** definir a condição de desconto exclusiva do club parceiro, **para** que os atletas da assessoria tenham vantagem no checkout — sem eu pagar comissão.

**JTBD:** 04.1 (gancho = desconto). **Persona:** Organizador → Atleta da assessoria.
- **MoSCoW:** Should · **Estimativa:** S · **Superfície:** Painel + checkout (E12) · **Onda:** 3

**Critérios de aceite (Given/When/Then):**
- **Dado** uma parceria `ativa`, **quando** defino a condição de desconto, **então** é criado/vinculado um cupom com `escopo='club_parceiro'` + `clubeRef` (RN-364), com teto/validade opcionais.
- **Dado** um atleta da assessoria no checkout (E12), **quando** aplica o cupom do clube, **então** o desconto entra no valor bruto e é atribuído ao clube parceiro (sem split — RN-360/364).
- **Dado** os `commercialTerms` do tenant, **quando** a inscrição fecha, **então** retenção % + repasse D+N (RN-338/339) operam sobre o valor pós-desconto, sem alteração de máquina.

**Tasks:** S1802-T1 (editor da condição no painel → cupom escopado) · S1802-T2 (checkout resolve cupom de club parceiro — reusa `validateCoupon` de E12-S1204/S300-T5, adiciona `escopo`).

---

### LEELA-S1803 · Gestão da parceria (lista, status, encerrar)

**Como** organizador, **quero** ver e gerenciar minhas assessorias parceiras, **para** acompanhar quem está ativo e encerrar quando preciso.
**JTBD:** 04.4 "ter dados na mão". **Persona:** Organizador. · **MoSCoW:** Should · **Est.:** S · **Superfície:** Painel · **Onda:** 3
- Aceite: lista densa (§2.5) de parceiros com status/documento/condição + busca/filtro/EmptyState; encerrar parceria = ConfirmModal §2.15 + disclaimer + retenção 90d (RN-144). **Task:** S1803-T1.

---

### LEELA-S1804 · Modo de venda cupom-only (evento fechado) — regra nova, encaixe E04

**Como** organizador, **quero** um modo em que as inscrições só acontecem via cupom, **para** rodar eventos fechados/por convênio (padrão TicketSports) — inclusive amarrados a assessorias parceiras.

**JTBD:** 04.1 "configurar lotes e preços" (modo de venda). **Persona:** Organizador.
- **MoSCoW:** Could · **Estimativa:** S · **Superfície:** Painel (E04) + checkout (E12) · **Onda:** 2 (encaixa em E04/S300); consumido por E18

**Critérios de aceite (Given/When/Then):**
- **Dado** um evento com `vendaSomentePorCupom=true` (RN-345), **quando** um atleta abre o checkout público **sem** cupom válido, **então** a inscrição fica bloqueada com mensagem "evento fechado — informe seu cupom".
- **Dado** um cupom válido (inclusive de club parceiro), **quando** aplico, **então** o checkout libera a inscrição.
- **Dado** o modo desligado, **quando** o atleta entra, **então** o checkout funciona normalmente (comportamento atual preservado).

**Tasks:** S1804-T1 (flag `vendaSomentePorCupom` no evento + guard no checkout E12; core puro do gate).

> **Nota de encaixe:** esta US **pertence ao E04/S300** (modo de venda), documentada aqui porque a assessoria parceira é o principal caso de uso. Ver [[MODELO-ROADMAP]] §4 (regras de domínio novas → onde encaixam).

---

## Ordem sugerida e encaixe nas Ondas

**Onda 2 (E04):** `S1804 (cupom-only)` — pequeno, junto do resto de cupons do S300.

**Onda 3 (o épico em si):** `S1800 (cadastro + vínculo)` → `S1801 (convite + provisionamento)` → `S1802 (condição de desconto)` → `S1803 (gestão)`.

Dependências: `E05 ✅ (clube+convite+parceria)`, `E04-S300 (cupom)`, `E16-S1602 ✅ (termos)`, `E00 Auth ✅ (provisionamento)`, `E12 (checkout aplica cupom)`. **Sem split, sem entidade financeira nova** — o risco fica todo em idempotência do provisionamento (S1801-T3), com cobertura no emulador.
