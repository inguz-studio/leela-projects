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

## O que ficou onde

| Camada | Arquivo | Símbolo |
|---|---|---|
| core | `packages/core/src/eventos/faceMinimaVenda.ts` | `FACE_MINIMA_VENDA_PAGA_REAIS` = 10 · `faceMinimaVendaPagaValida` · `validarFaceMinimaVendaPaga` |
| core (export) | `packages/core/src/index.ts` | bloco RN-559 |
| Rule | `firestore.rules`, `match /lotes/{loteId}` | `faceMinimaVendaPagaOk()` + `precoTocadoNoUpdate()`, ligados no `allow create` e no `allow update` |
| Function | `functions/src/eventos/guardPrecoLote.ts` | `assertFaceMinimaVendaPaga` · `CODIGO_RECUSA_FACE_MINIMA` |
| tela | `apps/painel/.../lotes/_lib/loteForm.ts` | ramo novo em `validarFormLote` + causa nova em `mensagemErroServidor` |

**Recusa nomeada:** `invalid-argument` com mensagem `RN-559/face_abaixo_da_minima` e `details`
`{ regra, motivo, loteId }`. O segundo motivo é `face_nao_e_numero_valido` — negativo, infinito e
não-número têm conserto diferente de preço barato demais.

**Nenhuma Function nova:** `guardPrecoLote` não é reexportado em `functions/src/index.ts`, então a
superfície de deploy de Functions não muda.

## Gates

| Gate | Resultado |
|---|---|
| `faceMinimaVenda.test.ts` (core + guard + espelho da Rule) | **23/23** |
| painel — suíte COMPLETA | **235 arquivos · 2591/2591** |
| `loteForm.test.ts` | **55/55** (12 novos) |
| lotes (painel, área tocada) | **97/97** |
| tsc — core · painel · functions | **0 erro** nos três |
| lint — core · painel · functions | **0** nos três (`--max-warnings 0`) |
| functions — 105 arquivos sem emulador | **101 verdes · 1 pulado · 3 vermelhos, todos fora do território desta lane** (2237 casos: 2222 verdes, 10 pulados, 5 vermelhos) |
| functions — suíte COMPLETA (247 arquivos) | **não obtida** — ver abaixo |

**Falsificação executada em cada camada, e revertida:**

- core: `FACE_MINIMA_VENDA_PAGA_REAIS` 10 → 5 ⇒ **6 de 15 vermelhos**;
- Rule: `faceMinimaVendaPagaOk()` removido do `allow create` ⇒ **1 vermelho** (o espelho);
- tela: ramo novo curto-circuitado com `false &&` ⇒ **4 vermelhos**.

## Limite honesto: a suíte de ataque às Rules não pôde rodar aqui

Os casos de ataque (9,99 recusa · 10,00 passa · 0,00 passa · 0,01 recusa · legado renomeável ·
tocar o preço do legado exige o mínimo) estão **escritos** em
`functions/src/__tests__/vendasRules.integration.test.ts` e **não foram executados**:
`firebase-tools` 15 recusa JDK abaixo de 21 e a máquina tem o 17 (`Microsoft/jdk-17.0.19.10`).
Não há segundo JDK instalado.

O que cobre o buraco enquanto isso, e roda em qualquer máquina: o **teste de espelho** que lê
`firestore.rules` por linha (nunca regex com `\n` — o repositório é CRLF) e amarra o número da
Rule ao número do core, mais a presença do predicado nos dois `allow`. O risco real que sobra é
sintaxe/semântica CEL não exercitada; o risco de deriva entre as duas fontes do mesmo número
está fechado.

## A suíte completa de functions travou, e o número está aqui

`vitest run` sem filtro em `functions/` ficou **75 minutos a ~1% de CPU e escreveu zero byte**.
Causa medida: `fileParallelism: false` (um arquivo por vez, por decisão do `vitest.config.ts`) ×
**142 dos 247 arquivos exigindo emulador**, que nesta máquina não sobe — cada um espera o próprio
teto de hook em vez de pular. O processo foi morto por decisão da lane, e o gate foi refeito
sobre os **105 arquivos que não dependem de emulador**: 107 segundos, contra 75 minutos parados.

Os três vermelhos desse recorte, um por um, e por que nenhum é desta lane:

| Arquivo | Causa | Território |
|---|---|---|
| `platformAdminSeed.test.ts` | o próprio seed bloqueia fora do Auth Emulator (guarda deliberada) | ambiente |
| `papelDuploConcessao.integration.test.ts` | `ECONNREFUSED 127.0.0.1:9099` — Auth Emulator | ambiente |
| `emailIdentidade.test.ts` | token do tema derivou: espera `RGBA(30, 11, 16, 0.42)`, lê `#161616` | **lane vizinha** — o arquivo resolve `packages/design-system/themes/brasa.css`, que a ROADMAP-COMPONENTES tocou; esta lane não abriu um arquivo de design-system |

A lane vizinha (`leela-roadmap-componentes-20260810`) intercalou commits em `main` durante a
janela. Os cinco commits desta lane atravessaram intactos — `commit --only` com pathspec por
camada, nenhum `amend`, nenhum `stash` na árvore compartilhada.

⛔ Nenhum deploy. A regra entra no ar no próximo pacote.

## Para quem pegar isto depois

1. **A prova que falta** é a suíte de ataque às Rules. Ela roda sozinha assim que houver JDK 21:
   `firebase emulators:exec --only firestore --project demo-leela "cd functions && vitest run src/__tests__/vendasRules.integration.test.ts"`.
2. **`emailIdentidade.test.ts` está vermelho** e o dono do conserto é quem mexeu no tema.
3. **O gate serial de functions é caro por construção nesta máquina.** Rodar por recorte
   (`grep -L "rules-unit-testing|FIRESTORE_EMULATOR_HOST"`) devolve sinal em 107s; a suíte inteira
   sem emulador não devolve sinal nenhum.
