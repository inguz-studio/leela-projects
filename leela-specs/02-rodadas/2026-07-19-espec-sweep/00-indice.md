---
tags: [leela, rodada, planejamento, espec-sweep]
aliases: [ESPEC-SWEEP, Varredura de épicos 2026-07-19]
atualizado: 2026-07-19
---

# 00-indice · Varredura de épicos e passo a passo de spec · 2026-07-19

> **Ordem do Vitor (2026-07-19):** *"quero que revisite todos os épicos, e escreva o passo a passo de planejamento e specs deles, seguindo a ordem do que iremos implementar."*
>
> Esta rodada não produz código. Ela devolve, para cada épico do roadmap, o inventário do que já existe, as lacunas viradas em histórias com aceite, as tarefas de 1 PR com território de arquivos, a rota de modelo por tarefa e os gates. O detalhe canônico foi escrito **dentro de cada épico** (`03-canon/epics/LEELA-E##-*.md`, seção datada no fim); aqui ficam a ordem geral, o grafo entre épicos e o que volta para o Vitor decidir.

## Onde ler cada coisa

| Quero saber | Vou em |
|---|---|
| a ordem geral e o que bloqueia o quê | este arquivo |
| o que decidir | [[01-decisoes-abertas]] |
| o passo a passo de um épico | a seção `Plano de execução (ESPEC-SWEEP · 2026-07-19)` dentro do épico |
| o sequenciamento macro do produto | [[ROADMAP]] §5 |
| o estado por card | [[V1-KANBAN]] |

## A ordem de implementação

A ordem vem da reordenação ratificada em 18/07 (H3 antes do H2, "finalizar por projeto", E15 por último, E08 antecipado, app v1 = PWA). Ela é a mesma da §5 do roadmap.

| # | Épico | O que é | Por que nesta posição |
|---|---|---|---|
| 0 | espinha | consolidar `ROADMAP.md` §5 | a fonte de verdade estava desatualizada; tudo abaixo referencia ela |
| 1 | E04 · E09 · E12 · E16 | o caminho do dinheiro que já está em voo | terminar o que está aberto antes de abrir frente nova; é onde mora o risco financeiro |
| 2 | E08 | painel do promotor | única lacuna do épico; backend de atribuição e comissão já pagos |
| 3 | E10 | consolidação de ativações (S812) | pequeno, isolado, destrava a contagem que a tela `/marcas` hoje omite |
| 4 | E19 | disparo de comunicação a segmentos | fecha o hub "Clientes & Comunicação"; depende do EmailProvider, que também destrava o convite PF do E08 |
| 5 | E11 | analytics inteiro | maior lacuna de planejamento; o rollup é o gargalo de 3 telas |
| 6 | E13-slim | app do atleta re-especificado como PWA | a spec vigente era para Expo nativo; muda arquitetura |
| 7 | E17 · E14 · E06 avançado | o H2 | profundidade média: histórias-âncora e dependências, sem quebra task a task |
| 8 | E15 | Creator Studio | por último, por decisão explícita |

## Grafo entre épicos

```
                         ┌── EmailProvider (Brevo, RN-137) ─── ação externa do Vitor
                         │        │
E04/E09/E12/E16 ─────────┤        ├─► E19-S1901-T4 (disparo a segmentos)
 (caminho do dinheiro)   │        └─► E08 convite PF (RN-316)
   │                     │
   │ item 23 (fronteira  │
   │ do reembolso)       └─► DECISÃO DO VITOR ──► E08 fase 3 (split automático)
   │
   ├─► E08-S701..S704 (painel do promotor)  ── independente do resto da onda
   │
   ├─► E11-S822 (conversão via link)  ◄── precisa da atribuição gravada no snapshot
   │
E03 (itensKit) + E05 (parcerias/desafios) ──► E10-S812 (ativações)

E11-S821-T1 (rollup) ─┬─► S821-T2 (dashboard)
                      ├─► S823 (comunidade)
                      └─► S822 (conversão, + dep acima)

E12 (landing/checkout ✅) + E01 (DS ✅) ──► E13-slim PWA ──► E17 social in-app ──► E14 ──► E15
```

**Leitura do grafo:** só três arestas são duras. (a) O EmailProvider bloqueia dois épicos ao mesmo tempo — é a dependência de maior alavancagem da onda. (b) O rollup do E11 bloqueia as três telas de analytics; sem ele nada de E11 é despachável. (c) A decisão da fronteira do reembolso (item 23) bloqueia a fase 3 do E08, não o painel do promotor — por isso o E08 entra cedo mesmo com a decisão aberta.

## Rota de modelo — o que isso significa na prática

Toda tarefa especificada nesta rodada carrega o campo **rota de modelo**, com dois valores possíveis (teto = opus, Regra L de 2026-07-19; sonnet proibido no Leela):

- **opus** (effort xhigh) — dinheiro, segurança, permissões, Rules, claims, PII/LGPD, arquitetura, telas e review adversarial. Nunca rebaixa. Gate: teste real com exit code, mais review antagonista em contexto fresco onde está marcado ⚔.
- **haiku** — trabalho mecânico bem especificado que tem gate determinístico (transform, rótulo, wiring repetitivo, doc estruturado). Sem gate executável, sobe para opus.

Quando o opus com effort máximo não resolve, a escalação é para o **humano** — não existe tier acima.

## Convenções desta rodada

- O detalhe canônico mora no épico, não aqui (regra de `CONVENCAO-BOARDS` §"RN nova sempre consolida no épico").
- Nenhuma RN nova foi numerada nesta rodada: planejamento não cria regra de negócio. Onde uma lacuna exige regra, ela está marcada como **RN a numerar** dentro do épico, com o gatilho ("numerar no lote que implementar, após grep de colisão").
- Nada de decisão type-1 tomada aqui. O que muda produto ou arquitetura foi para [[01-decisoes-abertas]].
