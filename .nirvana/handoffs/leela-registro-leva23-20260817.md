# Handoff — REGISTRO-LEVA23 (17/08, noite)

trace: leela-redesign-v2-20260810
lane: REGISTRO-LEVA23 · squad software-forge
projeto: `C:\dev\LEELA` (árvore principal, `main`, **DOCS-ONLY** — zero código tocado)
escopo: levas 23, 24 e 25 do dono · 6 itens · 1 RN · 1 vetável novo · 1 confissão

---

## 1. A confissão, com a varredura declarada

**Resultado do grep: nenhum registro da fala anterior.** *"Já falei para enriqquecermos a
visao geral, e os insights da leela devem estar lá"* não existe em card, painel, rodada,
handoff ou RN.

| # | Padrão procurado | Corpus | Retorno |
|---|---|---|---|
| A | `enriquec*` | `leela-specs/`, `.nirvana/briefs/`, `.nirvana/handoffs/`, `docs/` | 20 hits, **nenhum sobre a Visão Geral**: enriquecimento da projeção `Inscrito` (S203, FABLE-A-T2), cadastro de evento de 13/07, títulos "Brief enriquecido" do harness |
| B | `visão geral` a ≤120 chars de `insight`, nos dois sentidos | mesmos quatro | 5 hits, **todos de hoje**: o brief desta lane, o da VG-INSIGHTS-BUILD, e a linha da S043 no kanban descrevendo a leva 20 |
| C | falas do dono (`^>`) citando `visão geral` | `02-rodadas/` | 7 hits, **nenhum pede enriquecimento**: repasse por evento (19/07), destino de login (28/07), VG do tenant (06/08), o "não muda" do handoff-v2 (09/08), a frase da leva 17 sobre o mockup original |
| D | `insight` | `handoff/design/Visao Geral v3.dc.html` (o protótipo dele da VG) | **zero ocorrências** |

**A linha D é o achado que muda a leitura, e ela corta para os dois lados.** O bloco de
insights nunca esteve no protótipo da Visão Geral: vive só no `engajamento-referencia.dc.html`
(l.439), que é a fonte que a lane ENG-INSIGHTS leu e obedeceu. **Não houve desobediência de
spec** — quem construiu seguiu o único material escrito que existia, e ele apontava para o
Engajamento. O que morreu foi a **fala que corrigia o material**.

**Classe:** a mesma da leva 17, e é a segunda ocorrência em doze horas. A regra de captura
nasceu vinculante hoje de tarde; esta leva mostra uma fala anterior a ela morrendo do mesmo
jeito, o que não é violação da regra nova — é o passivo que ela existe para parar de acumular.

**A prática nova que sai daqui, e é barata:** a leva 17 cobre a fala que chega em texto; esta
cobre a que chega em **anexo**. Protótipo que o dono manda vira registro do que aquele arquivo
cobre **e do que não cobre**, no ato. Se em 09/08 estivesse escrito que o `Visao Geral v3` não
tinha insights, a pergunta "então onde eles moram?" teria nascido naquele dia, com ele na
conversa, em vez de oito dias depois com ele irritado.

---

## 2. Os seis itens registrados

| # | Item | Classe | Build | Onde |
|---|---|---|---|---|
| 1 | **VG-INSIGHTS** — os Insights da Leela mudam do Engajamento para a Visão Geral | ordem + confissão | 🔄 VG-INSIGHTS-BUILD | rodada §23.1 · E01 · S051 |
| 2 | **CHECKINS-CLUBS** — visão de check-ins dentro dos clubs, separada | direcional | ⛔ sem build | rodada §23.2 · E05 · S115 ganha procedência |
| 3 | **MODALIDADE-CADASTRO** — cobrança direta + repriorização da fila | cobrança | 🔄 MODALIDADE-BUILD | rodada §23.3 · S316 onda C sobe |
| 4 | **CRED-BUSCA** — a busca do credenciamento passa a servir a entrega | falha em uso real | 🔄 CRED-BUSCA-BUILD | rodada §23.4 · E03 · **RN-577** · S052 |
| 5 | **NAVBAR-PILL** — a pílula do selecionado estoura a barra mobile | defeito | 🔄 NAVBAR-FIX | rodada §Leva 24 · E01 · S053 |
| 6 | **SERIE-FINANCEIRA** — por que não há agregado por forma de pagamento | pergunta respondida + repriorização | ⏭ próxima da fila | rodada §Leva 25 · E11 · S825 |

### O que cada um deixa dito para a lane de build

**Item 1 (VG-INSIGHTS).** Reusar a peça da ENG-INSIGHTS, nunca clonar a montagem. ⚠️ **RN-568
morde**: `AlertsPanel` + Engajamento + VG são a **terceira** montagem da mesma anatomia de faixa
de aviso — na terceira, promover ao DS deixa de ser escolha. A outra metade da fala ("enriquecer
a visão geral") volta como **lista curta de candidatos com fonte nomeada**, para veto barato:
nada de bloco novo sem dado real.

**Item 3 (MODALIDADE).** ⛔ **O atraso foi meu e está escrito assim no kanban**: a spec ficou
pronta na mesma tarde (RN-575, S316 re-ancorada) e **nada nela esperava resposta dele** — o que
segurou foi a fila em ondas que eu montei, com kits na onda A e Modalidades atrás. Ordenar a
fila é meu trabalho; ordenar contra uma cobrança repetida do dono não é. A onda C dispara em
paralelo com a A, em **worktree por lane** (as duas tocam `eventos/_lib/subnav.ts`).

**Item 4 (CRED-BUSCA).** Três bordas nomeadas: (a) campo sem fonte nasce **ausente e nomeado** —
a projeção `Inscrito` é fina por construção (S203, FABLE-A-T2), e tamanho de kit errado no
balcão é pior que tamanho nenhum; (b) "o que está incluso" deriva do catálogo pela **RN-576**,
nunca de texto livre; (c) CPF/telefone/e-mail param no balcão daquele evento, régua de
minimização da RN-565 e RN-566 — **busca por CPF não vira busca global de pessoa**, e o
resultado não vira exportação.

**Item 5 (NAVBAR-FIX).** ⛔ Duas proibições: a barra **não** perde o indicador deslizante para
calar o defeito (D-1008-R14), e o conserto **não** entra sem gate visual em 375. O registro
afirma o sintoma e não chuta a causa — a lane mede no viewport em que ele viu, antes de mexer.

**Item 6 (SERIE-FINANCEIRA).** Resposta dada com três fatos medidos: o rollup
(`functions/src/overview/aggregateProfessionalDashboard.ts`) é `count()` nas linhas 127/183/189 —
**conta e não soma**, e "forma" não aparece nele; o resumo da inscrição não carrega o campo; e
**tela não varre documento financeiro** (padrão do E11). O "em breve" em
`OverviewContent.tsx:185` é honesto. Decisão do maestro: lane é a próxima da fila, dispara com
a árvore livre, acende só no próximo pacote de deploy (é `functions/`), com gate visual da
rosca. ⚡ **Destrava a segunda opção do CAIXA-1**, marcada no painel como bloqueada por dado.

---

## 3. RN consumida

**Uma só: RN-577** ([[LEELA-E03-operacao-evento]]) — o resultado da busca do credenciamento
carrega o que decide a entrega (nome completo, modalidade, lote, tamanho e composição do kit,
e-mail e telefone da compra), a busca aceita CPF, e campo sem fonte nasce ausente e nomeado.

**Conferência da faixa, feita duas vezes** (início da lane e imediatamente antes do commit), por
grep de `RN-577` a `RN-582` sobre o corpus inteiro **fora do índice**: **zero definições**. Os
cinco retornos são prosa da CARGA-COGNITIVA-SPEC e da SPEC-LEVA22 descrevendo as próprias
varreduras — o molde de sempre. Dupla conferência porque **quatro lanes escreveram em 17/08**
antes desta.

⛔ **PRÓXIMA RN LIVRE = 578.**

**Reparo de carona:** o índice não tinha linhas de tabela para **RN-574, RN-575 e RN-576** (a
SPEC-LEVA22 não as escreveu na aterrissagem dela). Foram acrescentadas aqui, pela mesma
disciplina que a SERV1-BUILD e a REGISTRO-CRM4-LEVA9 aplicaram antes. Conta do índice: 307 → **308**.

**Os outros cinco itens não consomem número, e é deliberado:** insights mudando de casa é
endereço de bloco existente, já governado pela RN-573; check-ins é direcional com o desenho por
fazer (molde da leva 10 e do ARENA-1); modalidade já tem a RN-575 e o que mudou foi a fila;
a pílula é defeito; e o agregado por forma tem card, épico e padrão escritos desde 11/08.

---

## 4. Painel do dono

**Um item novo, e só ele.** Contagem 8 → **9** (7 decisões + 2 ações).

- **VG-INSIGHTS-1** · os Insights vão para a Visão Geral — o bloco do Engajamento fica lá
  também (recortado por club) ou a VG passa a ser a única casa? Default proposto: **a Visão
  Geral vira a única casa**. Três opções, com a divisão por construção como alternativa.

**Edição cirúrgica de carona no CAIXA-1:** a opção "trocar por divisão de receita de verdade"
ganhou a nota de que a agregação que a bloqueia virou a próxima da fila em 17/08. Muda a
decisão dele, então entra — sem virar narrativa, dentro do campo "Opções".

**Padrão do arquivo respeitado:** cabeçalho de 3 linhas, sem ata, sem narrativa de fechamento,
item compacto com caso de uso, job story, o que fica com você, opções com default e onde
aterrissa.

---

## 5. Arquivos tocados (7, todos docs)

| Arquivo | O que mudou |
|---|---|
| `leela-specs/02-rodadas/2026-08-17-decisoes-dono/01-decisoes-dono.md` | levas 23, 24 e 25 na íntegra + a confissão com a tabela de varredura + RN da janela + o que fica com o dono; frontmatter atualizado |
| `leela-specs/01-produto/DECISOES-ABERTAS.md` | VG-INSIGHTS-1 novo · contagem 8→9 · nota do desbloqueio no CAIXA-1 |
| `leela-specs/03-canon/epics/LEELA-E03-operacao-evento.md` | delta + **RN-577** com enunciado, dependência, fronteira de dado pessoal e falsificação |
| `leela-specs/03-canon/epics/LEELA-E01-design-system.md` | delta das levas 23/24 — a casa dos Insights (com a confissão) e a pílula da barra |
| `leela-specs/03-canon/epics/LEELA-E05-clubs.md` | delta — a S115 ganha procedência de dono, direcional e sem RN |
| `leela-specs/03-canon/epics/LEELA-E11-analytics.md` | delta — a S825 vira a próxima da fila, com a resposta medida à pergunta dele |
| `leela-specs/03-canon/indice-de-regras-de-negocio.md` | RN-577 na tabela + reparo das linhas 574-576 + conta 307→308 + "próxima livre = 578" |
| `leela-specs/00-boards/V1-KANBAN.md` | card novo das levas 23-25 com S051/S052/S053 + os dois ponteiros (S115, S825) · S316 onda C marcada 🔄 com o registro do atraso |
| `leela-specs/00-boards/BOARD-EPICOS.md` | S051, S052, S053 na tabela · estados de S115 e S825 atualizados · `atualizado` 12/08→17/08 |

---

## 6. Para quem pegar depois

- ⛔ **Próxima RN livre = 578.** Conferir por grep antes de consumir, sempre — quatro lanes
  escreveram em 17/08 e o índice já envelheceu duas vezes no mesmo dia.
- ⛔ **VG-INSIGHTS-1 é o único vetável novo.** Os outros cinco itens são ordem, defeito ou
  pergunta já respondida. Não inventar pendência para o painel parecer diligente.
- ⛔ **Gates visuais acumulados e pendentes do maestro:** 7 telas da S046 (NAV-MOBILE), 5 telas
  da S043 (ENG-INSIGHTS), e agora o conserto da NAVBAR-FIX em 375. Nenhum deles é opcional, e
  o item 5 desta leva é a prova disso.
- 🔄 **Cinco lanes em voo nesta janela:** VG-INSIGHTS-BUILD, MODALIDADE-BUILD, CRED-BUSCA-BUILD,
  NAVBAR-FIX e esta (registro, já aterrissada). A sexta — a série financeira — espera a árvore.
- **A prática nova:** protótipo que o dono manda vira registro do que cobre **e do que não
  cobre**, no ato. Foi a ausência disso que produziu esta leva.
