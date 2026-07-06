---
tags: [leela, produto, narrativa, conteudo, nyx-social]
fontes:
  - "[[01-tese-de-negocio]]"
  - "[[RELATORIO-DISCOVERY]]"
  - "[[PARECER-CONSELHO]]"
  - "[[04-gamificacao]]"
  - "[[02-comunidade-clubs]]"
  - "[[be-hero-documentacao/be-hero-docs/personas|personas (Bíblia Be Hero)]]"
atualizado: 2026-07-05
---

# 08 · Linhas narrativas

Seis linhas editoriais derivadas da tese, insumo direto da nyx-social (handoff em [[produto/09-pautas/README|09-pautas/README]]). Cada linha traz tese, público, ângulos concretos e provas com fonte. Regra transversal: **nenhuma peça usa linguagem de streak, perda ou culpa** (gate anti-streak vale para marketing), e dado de mercado é sempre citado como dado de mercado, nunca como resultado do Leela.

---

## L1 · Constância compassiva (anti-streak, "Volte amanhã")

**Tese.** A indústria fitness inteira monetiza a culpa da sequência quebrada. O Leela aposta o contrário, em código: o sistema só soma, nunca pune ausência. Constância vale mais que perfeição.

**Público.** Atleta comum e iniciante (22-45, o que já quebrou streak e desistiu); coordenadores que cansaram de ver aluno sumir por vergonha.

**Ângulos.**
1. "Por que apagamos o contador de dias seguidos": o manifesto da RN-118, regra de negócio auditável, não copy fofa.
2. A armadilha do streak: quando a atividade vira obstáculo e a quebra vira rage-quit.
3. Streak freeze pago é confissão: o mercado cobra para aliviar a ansiedade que ele mesmo criou.
4. "Perdi um dia, e agora?" — o que a ciência do hábito realmente diz.
5. Selo "Constante" em vez de corrente de fogo: status por retorno, não por perfeição.

**Provas.**
- Lally et al. 2010: perder um dia não afeta materialmente a formação do hábito; o essencial é voltar sem culpa ([[04-gamificacao]]).
- Duolingo monetiza a ansiedade do streak com freeze pago; freeze preserva sem inflar (17 dias de streak médio com vs 11 sem) ([[04-gamificacao]]).
- Conexão social foi o motivador nº 1 do Strava Year in Sport 2024, à frente de saúde e performance ([[04-gamificacao]]).
- RN-118 existe como regra de código com invariante auditável, não como slogan ([[RELATORIO-DISCOVERY]], decisão 2).
- Leitura estratégica: anti-streak é costly signal impossível de copiar "porque parece burro na planilha do concorrente" ([[PARECER-CONSELHO]], Sutherland).

---

## L2 · Clube > solo (comunidade como motor de retenção)

**Tese.** Quem treina em comunidade continua; quem treina sozinho some. O produto inteiro empurra o atleta para o contexto do clube, e o ranking é uma liga alcançável, nunca um placar global que envergonha.

**Público.** Atletas que já estão em grupos de corrida/WhatsApp; coordenadores avaliando profissionalizar a comunidade.

**Ângulos.**
1. O marco dos 90 dias: onde o atleta solo desiste e o de clube fica.
2. Ranking global é deserto motivacional; ranking do seu clube é liga onde você existe.
3. O grupo de WhatsApp já é o clube: o que falta é o resto (inscrição, desafio, comunicação).
4. Feed dentro do clube, com rosto e nome, contra o grafo anônimo.

**Provas.**
- Retenção ~2x maior após 90 dias para quem está em clube (dados Strava/NRC; benchmark de mercado, ainda não medido no Leela — sempre citar assim) ([[02-comunidade-clubs]], [[RELATORIO-DISCOVERY]]).
- Mais da metade dos corredores brasileiros participa de grupos; ~25% usam assessorias ([[RELATORIO-DISCOVERY]]).
- Strava decompõe leaderboards em milhares de rankings locais para que todos tenham liga alcançável ([[02-comunidade-clubs]]).
- Decisão de produto travada: feed e ranking por clube/turma, nunca global ([[RELATORIO-DISCOVERY]], decisão 5).

---

## L3 · O coordenador como game master

**Tese.** O treinador que hoje roda 120 alunos no WhatsApp + planilha ganha o poder que nenhuma plataforma deu a ele: desenhar desafios que fazem parte do planejamento de treino e comunicar na própria voz. Vendemos status e cuidado, não software.

**Público.** Coordenadores de assessoria (50-200 alunos), treinadores que viraram gestores de comunidade.

**Ângulos.**
1. "Você gera as inscrições do evento e não captura nada": a dor do tráfego não remunerado.
2. Desafio como extensão do treino, desenhado pelo coach, não por um algoritmo genérico.
3. Comunicação na voz do coordenador vs push institucional: relação, não spam.
4. Orçamento de push visível: mostrar ao aluno que racionamos as notificações dele é respeito, e é feature.
5. Do WhatsApp para o clube sem abandonar o WhatsApp (migração ao lado, não contra).

**Provas.**
- Papel de game master inexistente em todos os concorrentes pesquisados ([[02-comunidade-clubs]]).
- Dor verbatim do discovery: "gero tráfego qualificado para eventos, mas não capturo valor e engajo meus alunos por WhatsApp e planilha" ([[be-hero-documentacao/be-hero-docs/personas|personas]], Felipe Martins mock).
- Piso de mercado de push promocional (2-3/semana) e opt-out de 46% com mensagens sem relevância: o racionamento tem base ([[03-comunicacao]]).
- Risco mapeado e mitigação: se desenhar desafio der trabalho, o coordenador não usa; templates de 1 clique ([[PARECER-CONSELHO]], round 4).

---

## L4 · Economia do produtor de eventos

**Tese.** O produtor mid-market sabe organizar evento; o que o trava é tecnologia, inadimplência e logística de kit. O Leela opera a comunidade e o evento dele, com condição comercial transparente, e ele paga quando arrecada.

**Público.** Produtores de 2-10 eventos/ano (R$ 80K-800K por evento), no LinkedIn e em comunidades de produção de eventos.

**Ângulos.**
1. Os 7 vazamentos silenciosos de um evento mid-market (inadimplência invisível, lote virado de madrugada, kit errado, promotor sem rastreio, funil cego, comunicação fragmentada, relatório manual).
2. Taxa publicada vs "fale com nosso comercial": transparência como posicionamento.
3. Anatomia do repasse: disponível, retenção pós-evento e comprovante, sem caixa preta.
4. "Parecer tão profissional quanto um evento de São Paulo": a régua emocional do produtor regional.
5. Parcelamento sem mágica: juros repassados às claras, tabela Price, sem "12x sem juros" fictício.

**Provas.**
- Dor verbatim: "eu sei organizar um evento; o que me trava é a tecnologia, a inadimplência e a logística de kit" ([[be-hero-documentacao/be-hero-docs/personas|personas]], Marina Castelo mock).
- Ticket Sports e Central da Corrida não publicam tabela de taxa; transparência é diferencial de aquisição ([[RELATORIO-DISCOVERY]], riscos; [[01-ticketing]]).
- Modelo comercial real e citável: 10% cartão / 8% PIX default, percentual + fixo por tenant, retenção de repasse 15% pós-evento ([[DECISOES-ABERTAS]]).
- Referência de mercado validada: a Cheers opera 8% incorporada / 10% não incorporada com mínimos por método ([[benchmark-cheers]]).
- Oferta coordinator-first aprovada pelo conselho: "rodo sua comunidade e seu evento; você paga quando arrecada" ([[PARECER-CONSELHO]], round 2).

---

## L5 · A jornada do atleta comum (identidade, não performance)

**Tese.** Os apps de esporte glorificam o rápido e o perfeito. O Leela conta a história de quem chega na largada porque a rotina teve sentido: identidade atlética que cresce, recompensa que dura, pertencimento com rosto e nome.

**Público.** O atleta de meio de pelotão, 22-45, que usa Strava mas não se reconhece no culto à performance.

**Ângulos.**
1. "Kudos dura um dia, medalha junta pó": por que a recompensa social efêmera não segura ninguém.
2. Meditar e dormir bem contam como progresso (3 pilares, não só o treino).
3. O dia da prova como capítulo, não como prova final: a rotina é o produto.
4. Perfil como currículo do atleta: onde sua trajetória mora (referência honesta ao que Fitfolio faz de bom).
5. Ser heroico todos os dias, sem precisar ser extraordinário em nenhum.

**Provas.**
- Dor verbatim: "eu quero ser heroico todos os dias e que isso signifique algo; hoje minha rotina e minhas provas vivem em apps que não conversam" ([[be-hero-documentacao/be-hero-docs/personas|personas]]).
- Motivador nº 1 do Strava 2024 é conexão, não performance ([[04-gamificacao]]).
- Dashboard heroico com estado "Volte amanhã" especificado em S1303 ([[LEELA-E13-app-atleta]]).
- Fitfolio validou o conceito de "currículo fitness" no Brasil ([[06-concorrentes-diretos]]).

---

## L6 · Bastidores de construção (build in public)

**Tese.** O Leela está sendo construído com specs públicos internos, conselho estratégico adversarial e kill-criteria explícitos. Mostrar o processo (decisões, cortes, dúvidas honestas) constrói autoridade e atrai coordenadores-piloto e talento.

**Público.** Ecossistema founder/tech/creator BR no LinkedIn; early adopters curiosos por produto.

**Ângulos.**
1. O dia em que o conselho disse não ao nosso roadmap (go na tese, no-go na sequência).
2. Kill-criteria públicos: os dois números que matam a tese, escritos antes do lançamento.
3. Por que cortamos medalhas da V1 (e o que isso diz sobre foco).
4. O número emprestado: construir sabendo que a métrica central ainda não é nossa.
5. Multi-tenant desde o dia 1: a decisão chata que evita o retrofit proibitivo.

**Provas.**
- Parecer real do conselho com dissent preservado e confiança calibrada por banda (70% / 55% / 75% / 30%) ([[PARECER-CONSELHO]]).
- Kill-criteria documentados antes do go-live ([[01-tese-de-negocio]]).
- Cortes registrados com data e autor: sem medalhas, sem afiliados, sem boleto ([[decisoes-escopo-2026-07-04]]).
- ADR-009 multi-tenant fundacional com racional público ([[ADR-multitenancy]]).

#hipótese A eficácia de build in public para atrair coordenadores-piloto não tem fonte no discovery; é aposta editorial a validar com as primeiras publicações.

---

## Prioridade sugerida para a nyx-social

L1 e L3 primeiro (são o moat psicológico e o lado escasso do marketplace), L4 em paralelo no LinkedIn (aquisição do produtor-sócio vem antes do app do atleta no roadmap), L2 e L5 quando a V1.5 se aproximar, L6 em cadência baixa e constante. #hipótese Ordem derivada da lógica do roadmap, não de teste de audiência.

## Relacionadas

[[00-MOC-produto]] · [[01-tese-de-negocio]] · [[05-benchmarks]] · [[produto/09-pautas/README|09-pautas/README]]
