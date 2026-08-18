# COPY-LANDING-REVIEW · handoff vivo (12/08)

- **Lane:** `COPY-LANDING-REVIEW` · trace `leela-copy-landing-20260812`
- **Persona:** copywriter da casa (`squads/nyx-linkedin/agents/linkedin-copywriter.md`), com a
  régua do voice-guardian (`linkedin-voice-guardian.md`) aplicada a cada proposta
- **Árvore:** main de `C:\dev\LEELA`. **REVIEW É PROPOSTA — zero código de app tocado.**
- **Brief:** `.nirvana/briefs/leela-copy-landing-20260812-enriched.md`
- **Rodada:** `leela-specs/02-rodadas/2026-08-12-copy-landing/`

## Estado

| Passo | Estado |
|---|---|
| Persona + régua de voz carregadas | ✅ |
| Quatro superfícies puxadas do ar (produção, 12/08) | ✅ |
| Fonte ancorado arquivo:linha | ✅ `apps/landing/app/` |
| Varredura de envio (Leva 9 · RN-569) na copy renderizada | ✅ zero promessas |
| Gate de voz Categoria 7 nas quatro superfícies | ✅ 1 achado |
| `01-review.md` · `02-vetaveis.md` · `03-fila-aplicacao.md` | ✅ |
| Commits `--only` em `leela-specs/` + push | ✅ |

## Os números

**18 achados: 3 bloqueadores, 6 graves, 5 médios, 4 baixos.**
**13 defeitos objetivos · 5 vetáveis de voz.**

Um dos 18 não é copy: o **G5** é achado de deploy. O renome do Serviço (SERV-3) está construído no
repositório desde `37e5c0ca` e a produção ainda serve `taxa de serviço` em cinco lugares.

## Os três mais graves

1. **A home diz corrida onde a plataforma diz experiência, e se desmente duas dobras abaixo.**
   No ar: `Ache sua próxima corrida e garanta a inscrição em minutos.` (`page.tsx:86`) contra
   `Inscrições para eventos de bem-estar, sem enrolação.` (`PublicFooter.tsx:49`), na mesma
   resposta HTTP. ⛔ Superfície reservada ao dono por D-0802-1 §2 — nenhuma copy nova foi proposta.
2. **A página do evento fecha perguntando `Pronto para largar?`** (`CheckoutCtaSection.tsx:26`),
   servida também ao retiro de respiração. A varredura S1218-T3 corrigiu as duas telas vizinhas
   citando D-0802-1 e pulou esta.
3. **`Inscrição segura · pagamento processado no ambiente Leela`** (`CheckoutFlow.tsx:2337`), a
   única linha de confiança do checkout público. Quem processa é o Asaas.

## Fato que muda a leitura da revisão

O único evento publicado hoje é um evento de teste **sem seções configuradas**, então a página cai
no `HeroMinimo` e as sete dobras da página completa (Sobre, Modalidades, Lotes, Kits, Regulamento,
Galeria, CTA de fechamento) **não estão no ar**. Os achados delas entram com a mesma severidade:
é código vivo esperando o primeiro evento real.

O brief apontava `apps/landing/src/`. Essa pasta não existe — o App Router mora em
`apps/landing/app/`. Toda âncora da rodada usa o caminho real.

## No dono, e só ele

| # | Decisão | Recomendação do copywriter |
|---|---|---|
| V1 | qual das 4 direções da home (material de 02/08) | Direção 2 no hero, vocabulário da 1 no resto — a mesma recomendação daquela rodada |
| V2 | organizador × profissional × produtora | hierarquia: pessoa = profissional, empresa = produtora, tarefa = organizar |
| V3 | `0 membros ativos` no perfil público | sumir com a linha quando for zero |
| V4 | `Club` em inglês | manter o anglicismo e padronizar a caixa |
| V5 | nomear o Asaas na tela | nomear, com a credencial do Banco Central |

## Fila para a lane de aplicação

Seis histórias propostas em `03-fila-aplicacao.md`, ancoradas em [[LEELA-E12-landing]], padrão
épico → história → tarefa. Números **propostos** contra o topo atual do épico (`LEELA-S1250`) —
conferir o índice antes de cravar.

| Onda | História | Espera |
|---|---|---|
| 0 | S1251 · deploy do renome do Serviço | nada |
| 1 | S1252 · a frase do processamento | V5 |
| 1 | S1253 · o bloco de compartilhar | nada |
| 2 | S1254 · vocabulário de experiência (3 telas) | nada |
| 2 | S1255 · rótulos e nome próprio (6 tarefas) | V3 na T3 |
| 3 | S1256 · a home | ⛔ V1 |

⛔ **Nenhum card consome número de RN.** Toda proposta cabe dentro de D-0802-1, SERV-3, RN-559 e
RN-569. `a partir de R$ 10,00` e o nome `Serviço` aparecem nas propostas exatamente como estão.

## O que a S1256 acrescenta ao material de 02/08

A rodada de 02/08 continua sendo a fonte da copy da home. Duas coisas que ela não tem:

1. **A descrição do root layout** (`app/layout.tsx:36-37`) não está na tabela de lá. É ela que
   alimenta busca e preview de link em toda página sem descrição própria, inclusive a do evento e
   a do produtor.
2. **Os números de linha daquele documento estão sete posições defasados** (`page.tsx:76/79/82/90/104/118`
   contra `83/86/89/98/111/125` hoje). Quem aplicar por número erra o alvo em sete lugares.

## Próxima lane

`COPY-LANDING-APLICACAO`, quando o dono devolver V1 a V5. Ela abre pela S1251, que é deploy e não
depende de veto nenhum.
