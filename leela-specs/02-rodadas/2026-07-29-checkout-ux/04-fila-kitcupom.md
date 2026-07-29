---
tags: [leela, fila, rodada, kit, galeria, cupom, afiliado, build]
aliases: ["Fila galeria e cupom por link 2026-07-29"]
trace: leela-build-2d6ee98d
lote: SPEC-KITCUPOM
data: 2026-07-29
---

# Fila de código · galeria do kit e cupom por link

Oito tarefas em duas frentes independentes. Todas `opus` pela Regra L do projeto (teto Opus, nada
de Sonnet no Leela).

## Frente A · Galeria do kit (E03 · `S212`)

| # | Task | O que é | Território | Dep | ⚔ |
|---|---|---|---|---|---|
| A1 | `S212-T1` | `fotosSecundarias[]` no `Kit`, acessor `fotosDoKit`, troca pura `promoverFotoPrincipal`, normalização Postel no `parseKit`, dois slots literais nas Rules de Storage | `packages/core/src/eventos/kit.ts`, `storage.rules` | — | — |
| A2 | `S212-T2` | Três posições no `KitEditor` com enviar, trocar, remover e "tornar principal"; `uploadImagemKit` ganha slot | `apps/painel/src/routes/eventos/kits/`, `packages/api-client/src/storage.ts` | A1 | — |
| A3 | `S212-T3` | `KitPublico` e leitor projetam as secundárias; galeria no `KitDetalhe` com `Thumb` do DS e o lightbox existente; listagens intocadas | `apps/landing/lib/`, `apps/landing/app/(public)/[eventSlug]/inscricao/checkout/` | A1 | — |
| A4 | `S212-T4` | Quarto degrau da cascata do `kitImagem.ts`: duas fotos extras determinísticas em preview, só a principal em produção | `apps/landing/lib/kitImagem.ts` | A3 | — |

## Frente B · Cupom pré-aplicado por link (E12 · `S1215`)

| # | Task | O que é | Território | Dep | ⚔ |
|---|---|---|---|---|---|
| B1 | `S1215-T1` | Gerador único do link (base pública + `ref` + `cupom`); `linkMaster` derivado no painel de afiliados e no de parcerias; `c` aceito como apelido de entrada e nunca gerado | `packages/core/src/affiliation/`, `packages/core/src/clubs/parceria.ts`, `apps/landing/app/(public)/[eventSlug]/ctaStyles.ts`, painéis E08/E18 | — | ⚔ |
| B2 | `S1215-T2` | Captura e guarda do cupom por evento com a disciplina do `RefTracker`; marca "(desconto aplicado)" na linha de desconto do resumo | `apps/landing/app/(public)/[eventSlug]/`, `.../inscricao/checkout/` | — | — |
| B3 | `S1215-T3` | Faixa após a Hero + verificação server-side que a alimenta, com resposta uniforme e cache curto por código | `apps/landing/app/(public)/[eventSlug]/sections/`, `apps/landing/lib/leitor.ts` | B2 | ⚔ |
| B4 | `S1215-T4` | Dois links de demonstração no meia-floripa; `linkMaster` do seed deixa de ser `beh.ro/mfl26?c=frc` | `functions/scripts/preview-seed-clubes.ts` | B1, B3 | — |

## Paralelismo e disputa de território

As duas frentes são independentes e podem correr juntas: a A vive no kit e no Storage, a B vive
na atribuição e na faixa. Dentro de cada frente, A1 e B1 abrem; A2 e A3 correm em paralelo depois
da A1 (painel e landing são territórios distintos); B2 pode começar junto com B1.

**Serializações obrigatórias.** A A2 e a B1 tocam `packages/api-client` e `packages/core` — rodar
`tsup` no core antes de qualquer suíte de painel ou de landing (lição registrada na NAV-FIX). A B4
é a última de tudo, porque demonstra o que as outras três construíram.

**Aviso de convivência.** No momento em que esta spec foi escrita havia outra lane ativa em
`functions/src/checkout/`. Nenhuma tarefa desta fila precisa escrever ali: a frente B lê o kernel
de atribuição e **não o altera** (RN-433). Se o build encontrar necessidade de tocar
`createInscricaoCharge`, isso é sinal de que a spec errou, e a mudança tem de voltar para decisão
antes de ser feita.

## Review antagonista em contexto fresco

Obrigatória nas tarefas **B1** e **B3**, porque o cupom por link toca dinheiro e atribuição. A
frente A não tem vetor de dinheiro e segue o gate normal.

### Vetores de dinheiro e atribuição (B1)

1. ⚔ **O kernel não foi tocado.** Provar por diff que `createInscricaoCharge` não mudou uma linha:
   precedência cupom sobre `ref`, campo `origem`, clamp do instante de clique, janela e
   re-checagem na confirmação, contador de usos e percentual de comissão, todos intactos.
2. ⚔ **Os dois desempates.** Chegar pelo link de A e digitar o cupom de B: **B** leva a comissão.
   Chegar pelo link de A e digitar cupom sem afiliado: **A** leva a comissão e não leva o crédito
   do desconto. As duas direções provadas com teste, não com leitura.
3. ⚔ **O gate da RN-315 continua fechando.** Afiliado abaixo do mínimo de inscrições: o link
   rastreia a conversão e o desconto **não** aplica. Falsificar abrindo o gate e ver a asserção
   morder. Confirmar que não há retroativo.
4. ⚔ **Nenhum domínio de terceiro sai do gerador.** Nem `beh.ro`, nem base ausente virando
   `undefined/...`. Sem base configurada, o comportamento tem de ser honesto, no espírito da
   RN-423.
5. ⚔ **O apelido `c` entra e não sai.** Link com `?c=` aplica; nenhum link gerado contém `c`.

### Vetores da superfície pública (B3)

6. ⚔ **Rules intocadas e zero leitura de cupom no cliente.** Provar que nenhuma regra foi
   afrouxada e que o cliente anônimo continua sem ler `cupons`. Falsificar afrouxando e ver a
   asserção morder.
7. ⚔ **Sem oráculo.** Cupom inexistente, expirado, esgotado, de escopo não satisfeito e de outro
   evento devolvem resposta idêntica, byte a byte. Nenhum valor de desconto sai para código que
   não se aplica.
8. ⚔ **Nada além do nome sai do afiliado.** A resposta não pode carregar documento, e-mail,
   telefone, uid, percentual de comissão, mínimo de inscrições, contagem de conversões nem o
   estado do gate.
9. ⚔ **O cupom de escopo de club parceiro respeita a parceria.** Parceria desativada: a faixa não
   aparece e o checkout recusa, com a exigência re-lida no servidor (RN-364 intacta).
10. ⚔ **A página do evento continua estática.** Provar que a faixa não tirou a rota do estático e
    que nenhuma dependência nova entrou no bundle público.
11. ⚔ **O número continua sendo do servidor.** A marca "(desconto aplicado)" é texto: provar que
    nenhuma soma ou subtração de valor acontece no cliente.
12. ⚔ **Custo de raspagem.** Medir quantas leituras de Firestore uma sequência de códigos
    inválidos provoca, com o cache curto ligado. Se o cache não segurar, a mitigação declarada não
    existe e a lacuna volta como decisão, não como silêncio.

## Envelope de custo

**Galeria.** Zero infra nova. Duas URLs a mais por documento de kit, dois objetos a mais por kit
no bucket que ainda não existe, e nenhuma leitura adicional: as fotos vêm no mesmo documento que
já é lido. O acréscimo de banda é do navegador de quem abre o detalhe do kit, com carregamento
tardio nas miniaturas.

**Cupom.** Uma leitura de cupom e, quando resolvível, uma leitura de afiliado por abertura de
página de evento **que traga cupom na URL**. Visita sem cupom não custa nada a mais. Com cache
curto por código, uma campanha de mil cliques no mesmo link fica na casa de dezenas de leituras,
não de milhares. Nenhuma escrita, nenhuma coleção nova, nenhum índice novo, nenhuma Function nova.
Cabe inteiro no free tier.

**Orçamento da lane.** Só spec. Zero custo de execução até o build começar.
