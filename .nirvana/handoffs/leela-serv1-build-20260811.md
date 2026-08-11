---
trace: leela-redesign-v2-20260810
lane: SERV1-BUILD
data: 2026-08-11
agente: sf-backend-lead (software-forge)
estado: em execução
---

# SERV1-BUILD · a venda paga mínima de R$ 10,00 (RN-559)

Decisão do dono em 11/08 de manhã, na íntegra: *"venda minima é de 10 reais"*. Registro em
`leela-specs/02-rodadas/2026-08-11-decisoes-dono/01-decisoes-dono.md` (bloco SERV-2).

## Ponto de partida

`C:\dev\LEELA`, `main`, HEAD `67c3b035`, árvore de arquivos rastreados limpa.

## Faixa de RN

Índice (`03-canon/indice-de-regras-de-negocio.md`) anuncia **559 livre**. Conferido por grep de
`RN-559` a `RN-561` sobre o corpus: as ocorrências de `RN-559` são (a) o registro da decisão de
hoje, (b) prosa da SPEC-ESTOURO-RESERVA descrevendo a própria varredura, (c) o índice. **Zero
definições.** A 559 é livre e esta lane a consome.

## Onde a regra mora (apuração antes de codar)

O preço de uma venda nasce em UM lugar no produto de hoje:

- **lote** (`eventos/{id}/lotes/{loteId}.preco`, em R$) — a origem viva. Escrita DIRETA do
  cliente, autorizada pelas Rules (`firestore.rules`, `match /lotes/{loteId}` →
  `shapeLoteValido()`, onde `preco >= 0` já mora). Não há callable de escrita de preço de lote.
- **`percursos[].preco`** (preço legado, consumido só por modalidade SEM lotes) — **não é
  superfície editável**: `EventoForm.tsx:205-206` cria todo percurso com `preco: 0` e o comentário
  do próprio arquivo diz "preços/lotes ficam na aba Lotes". Nenhuma tela do painel edita esse
  campo. Fronteira declarada, sem tarefa.

Logo: a validação da RN-559 aterrissa no caminho do LOTE, nas três camadas.

## Decisões de desenho desta lane

1. **`parseLote` e `loteShapeValido` NÃO ganham o mínimo.** Ler um doc legado com face de R$ 5,00
   tem de continuar funcionando — o default do dono é "sem migração". A regra vive só nos
   caminhos de ESCRITA.
2. **Na Rule, o mínimo vale quando o `preco` está sendo escrito.** Create: sempre. Update: só
   quando `preco` entra no diff. Razão: um lote vendido com face legada de R$ 5,00 tem o preço
   CONGELADO pela RN-200 — exigir o mínimo em toda escrita o tornaria um documento que ninguém
   consegue mais editar, nem para renomear, que é justamente o que a RN-200 permite. Deadlock
   entre duas regras, evitado de propósito.
3. **Zero é passagem, não exceção.** `preco === 0` é inscrição gratuita e continua permitida
   (default do maestro registrado, vetável pelo dono).
4. **A RN-494 (clamp do Serviço na face) fica.** Defesa em profundidade — a origem resolve, o
   clamp segue como cinto de segurança de camada.

## Camadas

| Camada | Arquivo | Papel |
|---|---|---|
| core | `packages/core/src/eventos/faceMinimaVenda.ts` | constante + validador puro + recusa nomeada |
| servidor (Rule) | `firestore.rules` · `faceMinimaVendaPagaOk()` dentro de `match /lotes` | a fechadura |
| servidor (Function) | `functions/src/eventos/guardPrecoLote.ts` · `assertFaceMinimaVendaPaga` | Admin SDK bypassa Rule — guard com recusa nomeada |
| tela | `apps/painel/.../lotes/_lib/loteForm.ts` | valida antes de enviar, mensagem em português comum |

## Gates

Suítes COMPLETAS dos pacotes tocados (functions, painel) + tsc + lint 0, em FOREGROUND, em série.
Os 18 vermelhos ambientais de functions são conhecidos e não são desta lane.

⛔ Nenhum deploy. A regra entra no ar no próximo pacote.
