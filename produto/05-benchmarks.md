---
tags: [leela, produto, benchmarks, discovery, indice]
fontes:
  - "[[RELATORIO-DISCOVERY]]"
  - "[[benchmark-cheers]]"
  - "[[leela-plus-hipotese-jtbd]]"
  - "leela-specs/discovery/pilares/ (7 arquivos, ~130 fontes datadas 2026-07-02)"
atualizado: 2026-07-05
---

# 05 · Benchmarks — índice executivo do discovery

O discovery mapeou o mercado em 7 pilares com ~130 fontes datadas (acesso 2026-07-02, URL + data em cada arquivo). Esta nota é o índice: um takeaway por pilar e o link para os números. A síntese consolidada está em [[RELATORIO-DISCOVERY]]; a leitura crítica do conselho em [[PARECER-CONSELHO]]; o inventário de ~70 features derivadas em [[NUVEM-FUNCIONALIDADES]].

## Os 7 pilares

| Pilar | Fonte | Takeaway executivo |
|---|---|---|
| 01 Ticketing | [[01-ticketing]] | Lotes crescentes e preço por percurso são padrão universal (Sympla, Ticket Sports, RunSignup, Race Roster). Diferenciais possíveis no BR: flexibilidade de quem paga a taxa, cobrança por carrinho e split multi-parte, que nenhum benchmark tem nativo. |
| 02 Comunidade/clubs | [[02-comunidade-clubs]] | Clube supera solo em retenção (~2x após 90 dias, Strava/NRC). Leaderboard segmentado dá liga alcançável a todos. O coordenador como game master não existe em nenhum concorrente. |
| 03 Comunicação | [[03-comunicacao]] | Deliverability virou compliance (Gmail/Yahoo desde fev/2024: SPF/DKIM/DMARC + one-click unsubscribe). Automação vence broadcast: 2% do volume, 30% da receita. Piso de mercado: 2-3 push promocionais/semana. |
| 04 Gamificação | [[04-gamificacao]] | O streak clássico é armadilha comprovada (Duolingo monetiza a ansiedade). Lally et al. 2010: perder um dia não afeta a formação do hábito. Conexão social foi o motivador nº 1 no Strava 2024. Base científica do anti-streak. |
| 05 Vendas/afiliação | [[05-vendas-afiliacao]] | Split nativo é commodity de gateway; a atribuição (link, cupom, janela) é IP do Leela e não terceirizável. Sympla é o melhor benchmark de UX de afiliados. |
| 06 Concorrentes diretos | [[06-concorrentes-diretos]] | GymRats (mecânica de desafio a copiar), Hevy, Fitfolio ("currículo fitness" brasileiro), MyDose (community challenges creator-led, semente do Creator Studio). Leitura dupla: o que copiar e onde diferenciar. |
| 07 Integrações de treino | [[07-integracoes-treino]] | Não competir com Strava/Garmin: agregar via `TrainingProvider` em 3 camadas (Health nativo grátis → Strava OAuth → agregador pago). Restrição Strava 2026: dado é self-view, ranking usa dado próprio do Leela. |

## Benchmarks fora dos pilares

- **Cheers** ([[benchmark-cheers]]): o concorrente mais próximo em desenho ("praticamente o que estamos fazendo, com posicionamento diferente" segundo o Vitor), vertical universitário. Taxa incorporada 8% vs não incorporada 10% (referência direta das decisões comerciais do Leela), taxa por parcela, revenda segura nativa, Clube Cheers de benefícios por R$ 9,90/mês.
- **Leela+ (Cheers + Floripa Wellness Club)** ([[leela-plus-hipotese-jtbd]]): referências do programa de benefícios. Aprendizados: amarrar benefício ao ingresso, "um resgate paga a assinatura", resgate presencial simples, expansão praça a praça. E o que não copiar: assinatura paga na saída, app de cupom genérico, eixo noturno/estudante.

## O que o mercado deixou vazio (whitespace verificado)

Nenhum player pesquisado cruza ingresso + comunidade + desafio anti-streak + comunicação na voz do coordenador + afiliação ([[RELATORIO-DISCOVERY]]). Lembrete permanente do conselho: whitespace de feature é fato, mas o moat defensável é psicológico + retenção ([[01-tese-de-negocio]]).

## Lacunas conhecidas do discovery

- Taxas das verticais BR (Ticket Sports, Central da Corrida) são opacas, sem tabela pública.
- Métricas de retenção dos SaaS BR de assessoria não foram encontradas em fonte pública.
- Todos os números de gateway são referência, não contrato; validar com cotação por volume.

## Relacionadas

[[00-MOC-produto]] · [[01-tese-de-negocio]] · [[08-linhas-narrativas]]
