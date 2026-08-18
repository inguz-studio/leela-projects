# Handoff · COPY-REV — a review antagonista da aplicação de copy

- **Trace:** `leela-copy-landing-20260812` · lane `COPY-REV`
- **Árvore:** `C:\dev\LEELA`, branch `main`. Contexto fresco: esta lane não viu a conversa que
  produziu o trabalho, por regra da casa.
- **Delta revisado:** `9a8af79c..f529c53b` (registro incluído); código inteiro em
  `9a8af79c..eb24170c`, 11 arquivos, todos em `apps/landing/`.
- **Rodada:** `leela-specs/02-rodadas/2026-08-12-copy-landing/05-review-antagonista.md` é o registro
  completo, com a medição de cada afirmação.
- **Estado:** ⛔ **nenhum deploy**, ⛔ **nenhum conserto**. Esta lane só julga; o conserto é lane de fix.

---

## Veredito

# LIBERADA COM RESSALVAS

Os 13 defeitos objetivos estão mortos no fonte **e no artefato buildado**. A home cumpre a Leva 13 e
a régua de tom sem violar o D-0802-1. RN-559, RN-569 e SERV-3 intactos. Os quatro vetáveis do dono
intactos, e o V6 é mesmo vetável.

**Zero bloqueadores.** Nove ressalvas, todas de registro e de evidência. Duas delas (1 e 2) corrigem
afirmações do handoff da COPY-APPLY que estão erradas e que a próxima lane herdaria como verdade.

---

## A sonda de bundle, que a lane de aplicação deixou pendente

A COPY-APPLY declarou a sonda como pendência da lane de deploy. Ela rodou aqui, porque prova de
fonte não vale para App Router.

O primeiro build morreu no gate de frescor (`dist/` do `@leela/design-system` 49 min atrás da
fonte). A cadeia foi reconstruída com `pnpm turbo run build --filter='@leela/landing...'` e o build
compilou. `dist/` é ignorado pelo git e a fonte do DS estava limpa em HEAD, então nada de árvore
alheia foi mexido.

⚠️ **Armadilha que a sonda ensinou.** O bundler escapa acento como `\xNN` (`experi\xeancias`,
`pr\xf3xima`). Busca literal por texto humano dentro do `.next` devolve zero e **parece prova de
ausência quando é só encoding**. A sonda normaliza os escapes antes de comparar. Quem repetir isso
sem normalizar vai declarar a home limpa e a home cheia com a mesma medida.

| Sonda | Resultado |
|---|---|
| 24 strings **novas** | **24/24 presentes no artefato** |
| 25 strings **antigas** | **25/25 em zero ocorrências** |
| Arquivos varridos (`.next/server` + `.next/static`) | 151 |

O H1 novo, lido direto do compilado em `.next/server/app/(public)/page.js`:
`children:"F\xedsico, mental, espiritual. Ache sua pr\xf3xima experi\xeancia e garanta a vaga em minutos."`

**Dois sobreviventes, os dois esperados:** `Compartilhe este evento` (default da prop do
`ShareBlock`, a página do evento segue com ele de propósito) e `Corrida de rua` (rótulo da prática
do evento em `lib/esporte.ts`, instância e nunca categoria).

## Gates determinísticos

| Gate | Resultado |
|---|---|
| `pnpm --filter @leela/landing type-check` | ✅ verde, exit 0 |
| `pnpm --filter @leela/landing lint --max-warnings 0` | ✅ verde, exit 0 |
| Build da landing | ✅ compila depois de reconstruir a cadeia de `dist/` |
| Gate visual em navegador | **não se aplica**: nada subiu. Obrigatório na lane de deploy |

---

## ⚔ Adjudicação da suíte vermelha

A COPY-APPLY mediu 43 reprovados em HEAD sem uma linha dela e atribuiu a causa ao **ambiente do
worktree**, pedindo que a REV rodasse num ambiente confiável. Rodou, na `main` limpa.

### Veredito: a `main` está vermelha por conta própria, por duas causas independentes, e nenhuma das duas é a copy. A explicação do worktree não se sustenta, porque a `main` reproduz.

| Medição | Onde | Resultado |
|---|---|---|
| `test:gate` (suíte inteira) | `main` limpa, `f529c53b` | **140 reprovados · 709 verdes (849)**, 22 arquivos de 65, 1191s, exit 1 |
| `definir-senha-s1223.test.tsx` **sozinho** | `main` | **13 de 13 reprovados** |
| `minha-conta-ponte-s1234.test.tsx` **sozinho** | `main` | **53 de 53 verdes** |
| o mesmo, com `entrar-pontos-de-entrada` antes | `main` | **50 reprovados de 59** |
| os 7 arquivos das superfícies tocadas | `main` | **59 reprovados de 143** |
| os mesmos 7 **em série** (`--maxWorkers=1 --no-file-parallelism`) | `main` | **os mesmos 59** |

`apps/landing` não mudou entre `f529c53b` e o HEAD das medições dirigidas (`5cf5b29d`). O que entrou
no meio foi `packages/design-system`.

**Causa 1 · arquivo vermelho sozinho.** `definir-senha-s1223.test.tsx` reprova 13 de 13 rodando
sozinho, sem lote e sem worktree. A lane de copy nunca tocou `DefinirSenhaFlow`. As falhas são
"Unable to find" no conteúdo que o efeito deveria produzir.

**Causa 2 · vazamento de estado entre arquivos.** `minha-conta-ponte-s1234` é 53/53 verde sozinho e
vira 48 vermelhos assim que `entrar-pontos-de-entrada` roda antes dele no mesmo worker. **Série não
conserta**, então não é contenção nem paralelismo: é estado que sobra de um arquivo para o seguinte.
O sintoma casa — 51 das 59 falhas são `expected "spy" to be called at least once`, 5 são timeout e 3
são `Found multiple elements`, que é render anterior não desmontado.

⚠️ **Um descarte de causa que não valia.** A lane mediu md5 dos `dist/` de `@leela/core`,
`@leela/api-client` e `@leela/design-system` para excluí-los. **A suíte da landing não lê `dist/`**:
o `vitest.config.ts` aliasa o DS para `packages/design-system/src`, de propósito e com comentário no
arquivo. Aquela medição não podia mudar nada.

**Nada disso é da copy.** Nenhuma das 59 falhas afirma uma string que esta lane trocou. Os únicos
casadores que encostam na copy alterada são insensíveis a caixa (`/ir para o painel profissional/i`)
e o que reprova neles é `Found multiple elements`, não texto que não bate.

**Card URGENTE aberto:** `S1260` no [[V1-KANBAN]] e no [[V1-CHECKLIST]], ancorado em
[[LEELA-E12-landing]]. Não consome RN.

---

## As nove ressalvas

Detalhe e medição de cada uma em `05-review-antagonista.md`.

1. **O gate verde do handoff mede os arquivos errados.** "Os 3 arquivos que de fato importam os
   componentes que eu mudei: 31/31 verdes" nomeia `evento-vocabulario-x1`, `cupom-banner-s1215` e
   `regulamento-modal-focus-trap`, que importam `GaleriaSection`, `ModalidadesSection`,
   `RegulamentoModal`, `RegulamentoSection` e `CupomLinkBanner` — **nenhum tocado por esta lane**.
   E 10 arquivos de teste importam `CheckoutFlow`, que a lane editou, sem entrar na linha verde.
   O número é verdadeiro; o rótulo é que está errado, nos dois documentos.
2. **O diagnóstico da suíte está errado no handoff.** Não é o worktree. Substituir pelo da S1260.
3. **A varredura de `ambiente Leela` não voltou vazia.** Sobrou uma, no comentário que a própria
   lane escreveu em `CheckoutFlow.tsx:2336`. O aceite admitia sobrevivente com veredito escrito; a
   linha do gate é que afirma outra coisa.
4. **O V6 está sub-descrito, e o terceiro sentido nasceu nesta lane.** Além da prática
   (`modalidadeEsporte`) e das opções de inscrição (`modalidades`), existe a **modalidade do club**
   (`ClubeResumoPublico.modalidade`), que a frase nova do L2 pôs em superfície pública. Na página do
   evento a palavra aparece três vezes em dois sentidos, não duas. A classificação como vetável está
   certa; o mapa que vai ao dono é que precisa crescer.
5. **Deriva de caixa nos três pilares.** O produto renderiza `'Físico'`, `'Mental'`, `'Espiritual'`
   como nome próprio; o H1 escreve `Físico, mental, espiritual`. Defensável como sentence case, mas
   é o teste que o M2 aplicou nesta mesma entrega e não foi declarado entre as divergências.
6. **O vocabulário se dividiu entre a home e o resto.** Home diz "Experiências"; o rodapé da mesma
   resposta segue com `Inscrições para eventos de bem-estar` e a `minha-conta` com `Organizar
   eventos`. Não viola D-0802-1 (a palavra proibida é corrida, não evento) e a linha do rodapé é
   texto aprovado por ele, então é decisão dele.
7. **`Modalidades / 1`** num evento de modalidade única: rótulo plural sobre contagem singular.
   Entra junto do V6.
8. **Comentário envelhecido** em `PublicHeader.tsx:36`, ainda documentando o rótulo "Eventos".
9. **Seis dos onze arquivos alterados não têm teste nenhum.** O ponto com regressão real é o
   `ShareBlock`, que ganhou assinatura nova e não tem nada prendendo o default.

---

## Para a lane de fix

Ordem sugerida, e nenhum item exige o dono:

| Onda | O que | Onde |
|---|---|---|
| 0 | ressalvas 1, 2 e 3 — corrigir as três linhas de gate e o diagnóstico | `.nirvana/handoffs/leela-copy-apply-20260812.md` e `04-apply.md` |
| 1 | ressalva 4 — reescrever o V6 com o mapa dos três sentidos | `02-vetaveis.md` |
| 2 | ressalvas 7 e 8 — o plural do tile e o comentário do header | `SobreSection.tsx`, `PublicHeader.tsx` |
| 3 | ressalva 9 — teste do default do `ShareBlock` | `apps/landing/test/` |

As ressalvas 5 e 6 vão ao painel do dono, não à lane de fix.

## Para o dono

V2, V3, V4, V5 e o **V6 com o mapa corrigido**. Mais duas linhas baratas: a caixa dos três pilares
no H1 e se o rodapé acompanha a home no vocabulário.

## O que continua aberto e não é desta lane

- **S1251**, o deploy do renome do Serviço. A produção ainda serve `+ taxa de serviço`.
- **S1260**, a suíte da landing.
- **Gate visual em navegador**, obrigatório na lane que subir. Prova estática nunca basta.
- **Nenhum número de RN foi consumido. A próxima livre continua sendo a 573.**
