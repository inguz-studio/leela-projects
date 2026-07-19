---
trace: leela-build-2d6ee98d
lote: DECISOES-0719
business: software-forge
employee: sf-cto
model: OPUS (docs/spec — nenhuma linha de código nesta lane)
criado: 2026-07-19
---

# Checkpoint — consolidação da rodada de decisões do Vitor (2026-07-19)

Lane SÓ documentação. Gate prova com `git diff` que nenhum arquivo de código foi tocado.

## Territórios respeitados
- NÃO toco código (`packages/`, `functions/`, `apps/`).
- NÃO toco E03 seções kit/estoque nem E08 seção promotor/eventoSlug (lane TAMANHOS-GRADE ativa).
- NÃO commito/reverto `.nirvana/HANDOFF.md` nem `produto/00-MOC-produto.md` (edições do maestro).
- `V1-KANBAN.md` já está modificado por outra lane → edito meus paths e commito com `git commit --only` (sem stash, L-009).

## RNs novas atribuídas (grep de colisão feito ANTES de numerar — 0 hits em specs e código)
| RN | Regra | Épico | Série |
|---|---|---|---|
| RN-154 | Gênero no checkout por inscrito + pré-preenchimento por CPF (RN-173); enum com "não informado"; alimenta demografia RN-820/822 | E12 | 140s (dados do inscrito) |
| RN-155 | Conta automática sem fricção na 1ª compra + link por e-mail p/ definir senha; depende do EmailProvider (RN-137) | E12 | 140s |
| RN-156 | Termo de saúde BASE sempre obrigatório no checkout (deixa de ser condicional a flag); flag do organizador ADICIONA termo custom; reconcilia RN-146/147 + RN-149 | E04/E12 | 140s (consentimento) |
| RN-157 | Cobrança PIX expira em 30 min (charge `expiresIn`, não só UI); QR+copia-e-cola enquanto pendente (pagamento E pedido pendente); auto-copy + toast | E12 | 140s |
| RN-170 | Toda superfície de imagem tem TROCAR + ajuste automático de proporção (fit/crop client-side); complementa RN-168 | E17 (+E03/E05/E12) | 160s (política de imagem) |
| RN-173 | CPF ÚNICO global no sistema; colisão no checkout = mesma pessoa (linka, não duplica); base do linking CRM (RN-172) e do pré-preenchimento (RN-154) | E19/E12 | 170s (identidade) |

RNs AMPLIADAS (sem novo número): RN-168 (upload-only confirmado em TODAS as superfícies), RN-229 (divisórias em TODO SubNav, supersede SubNav-plano globalmente).
RN em vigor mantida: RN-315 (clube-influenciador sem retroativo) SEGUE até revisão Ticketsports; direção retroativa decidida mas PARKED.

## Premissas assumidas (registradas conforme regra)
- P-DEC0719-1 · RN-170 fica alojada na política de imagem (E17, casa da RN-168) + referência nas consumidoras (E12); NÃO edito E03 (kit/capa) para não colidir com TAMANHOS-GRADE — a capa 1.9:1 (RN-228) e o kit 1:1 (RN-227) já existem e apenas ganham a semântica "troca + fit/crop" por referência à RN-170.
- P-DEC0719-2 · D-5 (botões Pix|Cartão sem toggle) e D-2 (cards por atleta) e D-4 (cupom no início) tratados como decisões de UI/fluxo (supersessão de wireframe registrada), sem RN formal — não são regra de negócio, são mecânica de tela; entram nos cards de fila.
- P-DEC0719-3 · D-6 vira RN-157 porque o timer de 30 min é validade da CHARGE (money/lifecycle), não só UI — logo é regra de negócio.
- P-DEC0719-4 · Reembolso (não devolve taxa de serviço) registrado como PENDENTE-DE-CONFIRMAÇÃO (aguarda BENCHMARK-REEMBOLSO), não como RN fechada.
- P-DEC0719-5 · LGPD do CRM (item 24a) rebaixada de bloqueadora a nota "REVISITAR antes do go-live" — não apagada.

## Progresso por tema
- [x] T0 · Checkpoint criado
- [ ] T1 · ADR-016 status RATIFICADA + item 18
- [ ] T2 · DECISOES-ABERTAS (painel curto)
- [ ] T3 · DECISOES-EM-ABERTO (versão longa)
- [ ] T4 · Rodada 2026-07-19-decisoes (verbatim integral + rns-delta + fila)
- [ ] T5 · Épicos E19 / E12 / E04 (RNs registradas)
- [ ] T6 · Cards de fila no V1-KANBAN
- [ ] T7 · Push final

## Commits
(atualizados a cada tema)
