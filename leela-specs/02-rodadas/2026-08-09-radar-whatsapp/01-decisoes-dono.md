# Rodada 2026-08-09 — radar de WhatsApp: decisões do dono

Contexto: o estudo de arquitetura do radar de comunidades WhatsApp (fork
`agentic-whatsapp` v1.4.0 → Leela) foi entregue em 09/08 pelo trace `c5a4a8bd`
(Orkestra, `outputs/c5a4a8bd-e9e4-4759-869c-a70f874c9c52/businesses/software-forge/outputs/arquitetura-radar-leela.md`)
com 8 vetáveis. O dono respondeu no mesmo dia. Verbatim:

> "Pode definir as melhores práticas, nivel de identidade sem pseudonimo, quero
> o nome real pois isso e importante para o job to be done do organizador, para
> ele identificar quem sao os usuários, clientes e membros mais engajados para
> ter uma visao de piramide de engajamento. Quem paga o numero pode ser o
> organizador, para ter um numero proprio pra isso. Sem textos de aviso no
> grupo, Rollout só para convidados. [...] clubes excluidos retem, só fica fora
> do ar, mas mantemos abase."

## Decididas pelo dono

| # | Decisão | Resolução |
|---|---|---|
| 1 | Nível de identidade nos rankings | **Nome real** (vindo do WhatsApp), sem pseudônimo. Razão do dono: JTBD do organizador — identificar usuários, clientes e membros mais engajados para a visão de pirâmide de engajamento. Consequência assumida: dado pessoal de participante exposto ao organizador ⇒ a frente jurídica do LGPD-1 passa a cobrir o radar obrigatoriamente antes do F1. |
| 6 | Quem paga o chip | **O organizador**, para ter número próprio dedicado ao radar. Compatível com a topologia recomendada (1 número dedicado e mudo por organizador, 1 instância por tenant). |
| 7 | Texto de aviso no grupo | **Sem aviso no grupo.** Nenhuma mensagem publicada ao adicionar o radar. A transparência com o participante fica a cargo do termo do organizador (frente LGPD-1) e do perfil do contato (item M2 abaixo). |
| 8 | Rollout | **Só para convidados** enquanto o risco de banimento não estiver medido. |
| — | `clubesExcluidos` (achado lateral 3 do estudo) | **Retenção intencional: a base fica.** Clube excluído sai do ar mas os dados permanecem. O comentário em `assessorias/encerrarParceria.ts:16` que promete "rotina futura" de expurgo deixa de ser pendência de engenharia; vira política declarada. Condição de reabertura: a revisão jurídica do LGPD-1 pode reabrir se apontar prazo máximo de retenção. |

## Delegadas ao maestro ("pode definir as melhores práticas") — decididas com registro

| # | Item | Default em vigor | Condição de reabertura |
|---|---|---|---|
| M1 (3) | Retenção | 400 dias de agregados na nuvem (permite comparação ano a ano); 90 dias de texto de mensagem no espelho local | LGPD-1 apontar prazo diferente; custo de storage relevante em F2 |
| M2 | Perfil do número radar | Nome de contato "Radar · [nome da experiência]" com descrição dizendo que só conta mensagens e nunca envia. Não é mensagem no grupo (configurar perfil não envia nada), então não conflita com a decisão 7 — é o mínimo de transparência passiva | Dono vetar o formato do nome |
| M3 (4) | Poda do texto local pós-sync | LIGADA: texto além de 90 dias apaga da máquina depois que os agregados sobem; agregados ficam | Organizador precisar de histórico bruto consultável no futuro |

## Seguem abertas (não são deste painel resolver aqui)

- **Base legal + termo do organizador** — advogado antes de F1. Entrou como frente nova do **LGPD-1** no painel (dado pessoal: nome real de participante exposto + medição sem aviso no grupo).
- **Hospedagem e custo F2** — tabela na seção 2 do estudo; vai ao sócio (CTO humano), não a este painel.

## Nota de rodada

O dono também perguntou o risco da topologia "um número da Leela em todos os
grupos" — respondido a partir da seção 1(a) do estudo (raio de explosão total,
perfil de detecção piorado pela mudez, multi-locação frágil). A topologia em
vigor segue a (c): um número por organizador, pago pelo organizador.
