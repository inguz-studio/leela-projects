---
tags: [leela, produto, jtbd, personas]
fontes:
  - "[[be-hero-documentacao/be-hero-docs/jobs-to-be-done|jobs-to-be-done (Bíblia Be Hero)]]"
  - "[[PARECER-CONSELHO]]"
  - "[[leela-plus-hipotese-jtbd]]"
atualizado: 2026-07-05
---

# 03 · Jobs to be done

O JTBD canônico vive na Bíblia Be Hero ([[be-hero-documentacao/be-hero-docs/jobs-to-be-done|jobs-to-be-done]], abril 2026), organizado em 4 dimensões. O conselho estratégico depois destilou o job único que ancora a tese ([[PARECER-CONSELHO]]). Esta nota junta as duas camadas e liga cada job ao épico que o serve.

## O job único (camada estratégica)

- **Coordenador/produtor:** "me ajude a manter minha comunidade viva e rendendo entre um evento e outro".
- **Atleta:** "pertencer e progredir sem vergonha depois que a inscrição foi feita".

Toda decisão de roadmap responde primeiro a esses dois; as dimensões abaixo são o detalhamento.

## As 4 dimensões (camada operacional)

| Dimensão | Horizonte | Essência | Épicos que servem |
|---|---|---|---|
| Transacional | H1 | Ticketing: inscrição, kit, pagamento, comissão | [[LEELA-E03-operacao-evento]] · [[LEELA-E04-config-vendas]] · [[LEELA-E12-landing]] |
| Heroica diária | H2 | Rotina com propósito: hábitos, progresso, integração holística | [[LEELA-E05-clubs]] (desafios) · [[LEELA-E13-app-atleta]] |
| Marketplace | H2-H3 | Vitrine de prestadores + mídia de marcas | [[LEELA-E10-marcas]] · visão [[07-visao-de-futuro]] |
| Social e identitária | transversal | Pertencimento, identidade atlética, dignidade profissional | [[LEELA-E05-clubs]] · [[LEELA-E13-app-atleta]] · [[LEELA-E02-visao-geral]] |

## Jobs por persona, ligados a capabilities

### Organizador ([[organizador-produtor]])

| Quando... | Quero... | Serve em |
|---|---|---|
| Publico evento | Lotes e preços automáticos, sem virada manual | [[LEELA-E04-config-vendas]] (S300) |
| Recebo inscrições | Confirmação automática de pagamento e visão de inadimplência | [[LEELA-E03-operacao-evento]] (S203, S207) |
| Entrego kit | Tamanho coletado no checkout, kit certo no balcão | [[LEELA-E03-operacao-evento]] (S209, S204) |
| Falo com patrocinador | Dados na mão, sem Excel | [[LEELA-E02-visao-geral]] |
| Quero meu dinheiro | Ver disponível, solicitar repasse, histórico e comprovante | E09-slim ([[decisoes-escopo-2026-07-04]]) |

### Coordenador de assessoria (variante em [[organizador-produtor]])

| Quando... | Quero... | Serve em |
|---|---|---|
| Gero comunidade | Gerenciar membros, desafios e comunicação num lugar só | [[LEELA-E05-clubs]] |
| Planejo treino | Criar desafio alinhado ao planejamento (game master) | [[LEELA-E05-clubs]] (S105, S106) |
| Comunico | Segmentar por desafio, pilar e engajamento, na minha voz | [[LEELA-E05-clubs]] (S108, S109) · [[LEELA-E06-marketing]] |
| Trago venda | Capturar comissão do tráfego que já gero | adiado com E08 ([[decisoes-escopo-2026-07-04]]) |

### Atleta ([[atleta]])

| Quando... | Quero... | Serve em |
|---|---|---|
| Descubro evento | Inscrever em poucos cliques, kit sem fricção | [[LEELA-E12-landing]] (S1203) · [[LEELA-E13-app-atleta]] (S1306) |
| Compro | Kit, pagamento e ingresso no mesmo lugar (QR) | [[LEELA-E13-app-atleta]] (S1314) |
| Começo o dia | Ver o que fazer para chegar na próxima prova | [[LEELA-E13-app-atleta]] (S1303, dashboard heroico) |
| Medito ou durmo bem | Que conte como progresso, não só o treino | [[LEELA-E05-clubs]] (16 ações, 3 pilares) |
| Vejo amigos ativos | Sentir que estamos na mesma jornada | [[LEELA-E13-app-atleta]] (S1311, feed no clube) |
| Gasto com meu esporte | Vantagens em lugares que já uso (Leela+) | [[leela-plus-hipotese-jtbd]] (5 JTBDs próprios) |

### Super-admin ([[super-admin]])

| Quando... | Quero... | Serve em |
|---|---|---|
| Entra produtor novo | Onboardar tenant e aplicar plano de cobrança | [[LEELA-E16-plataforma-superadmin]] (S1601, S1602) |
| Produtor pede repasse | Decidir na fila com retenção e trilha | E09-slim |
| Olho a plataforma | GMV, receita, tenants ativos | [[LEELA-E16-plataforma-superadmin]] (S1605) |

## Princípio de priorização derivado

Transacional primeiro (dor mais aguda e monetizável), social em paralelo (lock-in emocional desde o início), heroica depois (quando a base existe), marketplace por último (só com massa crítica). É a ordem da Bíblia Be Hero e bate com o corte V1 = vender · V1.5 = engajar ([[06-roadmap-visao]]).

## Relacionadas

[[00-MOC-produto]] · [[01-tese-de-negocio]] · [[04-user-stories]] · [[06-roadmap-visao]]
