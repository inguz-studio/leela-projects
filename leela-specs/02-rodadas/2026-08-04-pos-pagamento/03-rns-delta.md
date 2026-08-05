---
tags: [leela, rns, rodada, checkout, pos-pagamento, arena-social, lgpd]
trace: leela-pixreal-diag-20260804
lote: SPEC-POSPAG
data: 2026-08-04
---

# 03-rns · O pedido responde na tela, e a Arena Social

> **Prova de não colisão (2026-08-04).** A faixa mais alta em uso era a 468 (índice de RNs,
> pós SPEC-JUROS-MARGEM e SPEC-QUALIFICACAO). Varredura por `RN-469`, `RN-470`, `RN-471` e
> `RN-472` em `leela-specs`, `apps`, `packages`, `functions` e `firestore.rules`, fora de
> `node_modules`: zero ocorrências. **Esta lane consome RN-469 a RN-472.** O 460 continua
> marcador de faixa sem enunciado e segue de fora.
>
> Este arquivo é o delta da rodada. **O texto canônico vive no épico dono**,
> [[LEELA-E12-landing]], seção "Delta o pedido responde na tela, e a Arena Social".
> Decisões em `01-decisoes-dono.md`; spec em `02-spec-pos-pagamento-e-arena-social.md`;
> fila em `04-fila-codigo.md`.

## Novas

| RN | Regra (resumo — canônico no épico) | Épico | Lote |
|---|---|---|---|
| **RN-469** | **O comprador lê o próprio pedido, após concluir a compra e na área do cliente.** Fecha o TODO E12 de `firestore.rules:2528-2530` — que era sequenciamento, não intenção de produto (D-0804-1). Leitura aberta só à sessão que criou o pedido e à conta vinculada pela confirmação; terceiros negados com teste de ataque; `write: if false` intocado; nenhuma outra coleção abre. | E12 (dona) · E00 (consome) | SPEC-POSPAG |
| **RN-470** | **Feedback pós-pagamento em tela, para PIX e cartão.** v1 = "Estamos confirmando o seu pedido" + CTA para ver os próprios pedidos + orientação de conferir o e-mail (o acesso do ingresso vai por lá). Estados por meio; v1 sem polling obrigatório mas com a leitura da RN-469 disponível à tela; a copy que promete confirmação automática sem canal que a cumpra é corrigida na mesma entrega. CTA gated: só aparece quando a área do cliente (S1222) existir. | E12 (dona) | SPEC-POSPAG |
| **RN-471** | **Arena Social: escopo e campos.** Seção da área do cliente (default vetável — ARENA-3) com mini bio, gênero da pessoa, gêneros de pessoas com quem quer se conectar, tipos de experiência de interesse, interesses nos pilares de bem-estar (lista = ARENA-2) e a foto **da conta**, reaproveitada. Edição só pela própria pessoa; tudo opcional; vocabulário D-0802-1. | E12 (dona) · E17 (fronteira) | SPEC-POSPAG |
| **RN-472** | **O dado sensível da Arena Social é opt-in, com consentimento específico e visibilidade restrita.** "Gêneros de pessoas com quem quer se conectar" pode inferir orientação sexual (LGPD art. 11): campo sempre opcional, consentimento específico e destacado com finalidade declarada, finalidade única (conexão entre participantes; nunca projeção pública, export ou marketing), visibilidade default = só a própria pessoa, e apagar apaga (revoga o consentimento, sem cópia em projeção). Amarra com a revisão jurídica do LGPD-1 sem duplicá-la. | E12 (dona) | SPEC-POSPAG |

## Ampliadas e reconciliadas, sem número novo

- **RN-451** — inalterada no contrato (área do cliente por callable, Rules tenant-scoped
  fechadas ao `athlete`). Reconciliação: a abertura da RN-469 não a contradiz — o pedido do
  próprio comprador é dado dele, não dado de tenant servido a participante. O Meus
  Ingressos/histórico da área **ganha o papel de destino do CTA** da RN-470.
- **RN-453** — inalterada. Reconciliada com o que a DEPLOY-EMAIL (S1224) já pagou:
  `actionCodeSettings` existe (`linkDeAcao.ts`, `abf4b794`) e o link aterrissa no painel
  como interim; a tela `/definir-senha` da landing (C1) segue sendo o que falta, terminando
  em Meus Ingressos.
- **RN-421 / item 60** — a tela de aviso "a compra ainda precisa ser confirmada" continua
  aviso, nunca garantia de emissão. A RN-470 dá corpo ao aviso ("Estamos confirmando o seu
  pedido") sem prometer emissão.
- **RN-440** — inalterada: entrar na etapa de pagamento continua sem criar pedido, inscrito
  ou cobrança. O feedback é pós-pagamento e não mexe na fronteira cotar/cobrar.
- **RN-418 / RN-422 / RN-452** — inalteradas: o link assinado do ingresso continua público e
  continua sendo a porta de quem não tem conta.
