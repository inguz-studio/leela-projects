# Trilha FABLE — backend crítico (pedido/pagamento, estorno, modelo)

> Trace: leela-build-2d6ee98d · Status: **DOCUMENTADA, aguardando reset da cota Fable** · Autor: maestro Nirvana-OS, 2026-07-07
> Decisão Vitor: firebase-admin mecânico vai em Opus AGORA (lote LEELA-FIREBASE-ADMIN); ESTE bloco (modelo/pagamento/segurança) espera Fable.

## Por que Fable (roteamento calibrado)
Por WIKI §3 e o `ADR-priorizacao-fila.md` do CTO: **Fable** para Functions, rules, core-negócio, **segurança e pagamento**; Opus para telas/mecânico. Este bloco é justamente pagamento + modelo de dados + Function transacional (estorno) + validação server-side (QR) — território de rigor Fable. Fable esgotou; reseta ~03:50 America/Sao_Paulo. Despachar este bloco DEPOIS do reset, em Fable, por sub-lotes com review antagonista.

## Origem: dependências honestas acumuladas no bloco visual
Todas as 6 telas de evento pousaram com EmptyState honesto onde faltava dado. Este bloco é o que fecha essas lacunas. Cada frente abaixo lista o que destrava (a tela que já espera) + os critérios.

---

## FRENTE A — Modelo de pedido/pagamento no Inscrito (o coração)
**Destrava:** slide-in rico dos Inscritos (S203-T3), valores reais, "por forma de pagamento" no Financeiro (S207), coluna de valor.
**Hoje:** `packages/core/src/eventos/inscrito.ts` — `Inscrito` é projeção FINA (`atletaNome`/`kit`/`chipNumero`/`status`/`modalidade` + carimbos). Não carrega dados pessoais nem pagamento.
**Fazer:** enriquecer a projeção `Inscrito` (denormalizar) OU join ao pedido/checkout (E12), surfaçando os campos que o protótipo `WEB-APPV2 (1)/Inscritos do Evento.html` (painel `#slidePanel`) especifica — ver `leela-specs/backlog/LEELA-S203.md` §"Campos do slide-in":
- **`[reg]` dados pessoais** (coletados no checkout S1202): CPF, telefone, nascimento, gênero, cidade/UF, camisa (tamanho), contato de emergência, restrições médicas.
- **`[pag]` pagamento/pedido:** valor da inscrição + lote, cupom + desconto, data do pagamento, valor final; forma de pagamento (bandeira, 4 últimos, parcelamento); conciliação (ID transação, gateway/adquirente, taxa, repasse ao organizador, previsão de repasse).
**Aceite:** o slide-in rico (4 abas) renderiza dado REAL do inscrito/pedido, sem fabricar; Rules garantem que só o organizador do evento lê; tipos no core + api-client.

## FRENTE B — Function de estorno (reembolso)
**Destrava:** ação "Reembolsar inscrição" do slide-in (S203) + cancelamento com histórico.
**Fazer:** Function transacional de estorno (integra o gateway — Stripe/adquirente Be Hero), idempotente, que estorna e marca a inscrição cancelada, registra motivo/histórico. Rules + guard (só organizador; só inscrição paga). **TLA+/teste de idempotência** (dinheiro — rigor Fable, sem duplicar estorno).
**Aceite:** estorno idempotente (reexecução não duplica), audit trail, confirmação server-side; o modal do protótipo ("estornado no cartão •••• em até N faturas") reflete o resultado real.

## FRENTE C — Escritas do balcão (entrega/chip/QR)
**Destrava:** os botões do balcão (S204/S208) que ficaram visíveis mas sem efetivar.
**Nota:** `registrarEntrega`/`registrarCheckin`/`vincularChip` já existem em `functions/src/eventos/` — o lote firebase-admin (Opus, em curso) pode já destravá-los se a única causa era a API estática. **Verificar após o firebase-admin:** se efetivam no preview, esta frente vira só a **validação de assinatura do QR server-side** (S208 — rejeitar payload adulterado; nunca confiar no cliente — segurança, rigor Fable). Se ainda quebram por outra causa, incluir aqui.
**Aceite:** retirada de kit seta kitEntregueEm+checkinEm (RN-205); vincular chip com confirmação de sobrescrita (RN-206); QR valida assinatura server-side e rejeita adulterado/duplicado (RN-221/222).

## FRENTE D — Estoque por tamanho + movimentações (kits)
**Destrava:** o Estoque real dos kits (EstoqueView já mostra EmptyState honesto). É a raiz da dor "kit errado por falha de coleta de tamanho".
**Hoje:** `Inscrito` não coleta tamanho; `ItemKit` só tem `tamanhado:boolean`; não há livro-razão de estoque.
**Fazer:** coletar/carregar o tamanho na inscrição (cruza com FRENTE A `[reg]` camisa); modelar estoque por tamanho (PP–XG) por kit; livro-razão de movimentações (entradas/saídas). 
**Aceite:** matriz de estoque por tamanho real; movimentações com histórico; alertas de baixa/esgotado derivados de dado real.

## FRENTE E — Chave estável Kit↔enum (estrutural, pequeno)
**Destrava:** remove a ponte de delimitador (`kitCasa`) que o Estoque usa hoje.
**Hoje:** `inscrito.kit` = enum underscore (`kit_ouro`); `Kit.id` no seed = hífen (`kit-ouro`) → join não casava (bug latente).
**Fazer:** alinhar o seed ao enum (ou chave estável canônica Kit↔enum). Remover o `kitCasa` bridge depois. Pequeno, mas é integridade de dado.

## FRENTE F — Cronograma do Evento + faixa de chip
**Destrava:** banner "Entrega ativa · Dia N de M" do balcão (hoje honesto "fora da janela", sem fabricar dias) + alertas completos do balcão.
**Fazer:** `Evento` ganha cronograma de entrega (janelas por dia/local/horário) e faixa/estoque de chips. 
**Aceite:** banner mostra o dia/horário reais da janela; alertas de chip órfão/estoque com dado real.

## FRENTE G — Logs de comunicação e histórico
**Destrava:** abas Comunicação e Histórico do slide-in (S203).
**Fazer:** modelar/expor o log de comunicações enviadas (e-mail/push com status entrega/abertura) e o histórico de eventos do registro (inscrição, pagamento, cancelamento/reembolso).
**Aceite:** as abas renderizam o log real; cancelamento aparece no histórico com motivo e reembolso.

---

## Sequência sugerida dentro da trilha Fable (pós-reset)
1. **A (modelo pedido/pagamento)** — é o coração; destrava mais telas (slide-in, valores, Financeiro). Consultar mind-clone Kleppmann (consistency do modelo de pagamento) via CTO.
2. **B (estorno)** — depende de A + gateway; rigor de idempotência.
3. **C (QR server-side)** — segurança; verificar antes se o firebase-admin já destravou as demais escritas.
4. **D (estoque por tamanho) + F (cronograma) + G (logs)** — modelo, podem paralelizar por área.
5. **E (chave Kit↔enum)** — pequeno, encaixa quando tocar o seed/estoque.

Overlap de escopo: A/B cruzam **E12 (checkout)** e **E04 (vendas/pagamento da Onda 2)** — decidir com o Vitor se este bloco ABRE parte da Onda 2 ou fica como enriquecimento Onda 1 das telas já feitas. Cada sub-lote: 1 task = 1 commit, review antagonista (é reusável/sensível/segurança), gate do maestro.

## Gatilho
Despachar quando: (a) cota Fable resetada; (b) firebase-admin (Opus) aterrissado e sabido o que ele já destravou (encolhe a FRENTE C); (c) aval do Vitor sobre o overlap com Onda 2.
