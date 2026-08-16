# Handoff · COPY-REV-2 — a review antagonista da copy da landing

- **Trace:** `leela-copy-landing-20260812` · lane `COPY-REV-2`
- **Árvore:** `C:\dev\LEELA`, branch `main`, HEAD na medição `5cf5b29d`
- **Delta revisado:** `9a8af79c..f529c53b` (código inteiro em `9a8af79c..eb24170c`, 11 arquivos, todos em `apps/landing/`)
- **Rodada:** `leela-specs/02-rodadas/2026-08-12-copy-landing/05-review-antagonista.md` é o registro completo
- **Estado:** review fechada, veredito emitido, boards atualizados, commit e push. ⛔ **NENHUM deploy** e ⛔ **nenhum conserto** — esta lane não corrige nada.

> **A tentativa anterior.** Uma primeira COPY-REV morreu por quota e deixou notas soltas na árvore
> (`05-review-antagonista.md` sem commit, `.nirvana/handoffs/leela-copy-REV-20260812.md` sem commit).
> Review parcial é nota, nunca veredito. Esta lane rodou **do zero**, refez toda medição na própria
> máquina e não herdou nenhuma conclusão. O `05-review-antagonista.md` foi **reescrito** com a
> medição desta lane; o handoff antigo segue sem commit e está **superado por este arquivo**.

---

## Veredito

# LIBERADA COM RESSALVAS

**Zero bloqueadores.** Doze ressalvas, todas de registro, evidência ou vocabulário, nenhuma
impeditiva de deploy.

Os 13 defeitos objetivos estão mortos no fonte **e no bundle buildado**. A home cumpre a Leva 13 e o
D-0802-1 na leitura exata (corrida só dentro de enumeração, como instância). RN-559, RN-569 e SERV-3
intactos. Os quatro vetáveis do dono intactos, nenhum decidido por tabela. O V6 é real e vetável, mas
vai ao painel com o mapa incompleto.

---

## Os gates, com o que cada número significa

| Gate | Resultado |
|---|---|
| `pnpm --filter @leela/landing type-check` | ✅ **exit 0** |
| `pnpm --filter @leela/landing lint --max-warnings 0` | ✅ **exit 0** |
| `pnpm --filter @leela/landing build` | ✅ **exit 0**, 15 rotas, gate de frescor passou sem reconstrução |
| Sonda de string no bundle (121 arquivos de `.next`) | ✅ 24/30 novas literais + **13/13 fragmentos** das 6 restantes · **35/37** antigas em zero, 2 sobreviventes com veredito |
| `pnpm --filter @leela/landing test:gate` | ⛔ **147 reprovados · 702 verdes (849)**, 22 arquivos de 65, 1478s, exit 1 — **vermelha por conta própria, e não é a copy** |
| Gate visual em navegador | **não se aplica**: nada subiu. Obrigatório na lane de deploy |

### A sonda de bundle, e a armadilha que ela ensinou

A COPY-APPLY tinha deixado a sonda como pendência. Ela rodou aqui, e ensinou **duas** coisas que
qualquer repetição precisa saber, porque as duas produzem falso negativo:

1. **O bundler escapa acento como `\xNN`.** Busca literal por texto humano devolve zero e parece prova
   de ausência quando é só encoding.
2. **O conserto do M2 passou a copy por template** (`Ir para o ${NOME_DO_LUGAR}`), então a frase
   concatenada **não existe** no artefato. Buscar a frase montada devolve seis falsas ausências; a
   prova certa é buscar as pontas mais a constante, e as treze aparecem.

H1 novo conferido por leitura direta do compilado, em `.next/server/app/(public)/page.js`:
`children:"Físico, mental, espiritual. Ache sua próxima experiência e garanta a vaga em minutos."`

Dois sobreviventes esperados: `Compartilhe este evento` (é o **default da prop** do `ShareBlock`, e a
página do evento fica com ele de propósito) e `Corrida de rua` (retorno final de `esporteDoEvento`, o
rótulo da **prática** — instância, nunca a categoria).

---

## ⚔ A adjudicação da suíte vermelha

A COPY-APPLY mediu 43 reprovados em HEAD sem uma linha dela e atribuiu a causa ao **ambiente do
worktree**, pedindo que a REV rodasse num ambiente confiável.

**Veredito: a `main` está vermelha por conta própria, na árvore canônica. Não é o worktree, e não é a
copy.**

| Medição | Resultado |
|---|---|
| suíte inteira, `main` limpa (`5cf5b29d`) | **147 reprovados · 702 verdes (849)**, 22 arquivos de 65, exit 1 |
| `definir-senha-s1223.test.tsx` **sozinho** | **13 de 13 reprovados** |
| `minha-conta-ponte-s1234.test.tsx` **sozinho** | **48 reprovados · 5 verdes (53)** |

Censo das falhas: 96 `Unable to find`, 54 `expected "spy" to be called at least once`, 44
`Test timed out`, 10 `not configured to support act(...)`, 8 `Found multiple elements`.

**A prova que fecha o caso:** `definir-senha-s1223` reprova 13 de 13 **sozinho**, sem lote, sem
paralelismo e sem worktree. Ele exercita `DefinirSenhaFlow`, que não está entre os 11 arquivos da
lane. Defeito de `main`.

**Por que a copy está inocente, em quatro camadas medidas:**

1. **zero** testes da landing prendem qualquer das strings antigas que a lane trocou;
2. **sete dos onze** arquivos alterados não são importados por teste nenhum;
3. o único arquivo que reprova e encosta em componente alterado (`minha-conta-ponte-s1234`) reprova
   com **47 de 48** falhas do tipo `spy` não chamado — efeito que não dispara, não texto que não bate;
4. os matchers que encostam na copy alterada são insensíveis a caixa
   (`/ir para o painel profissional/i`) ou casam fragmento intocado (`/e-mail da sua conta/i`).

### ⚠️ Divergências desta lane contra as notas da tentativa morta

| Notas antigas | Medição desta lane |
|---|---|
| 140 reprovados · 709 verdes | **147 · 702**, mesmos 22 arquivos de 65 |
| `minha-conta-ponte-s1234` **53/53 verde sozinho** | **48 reprovados de 53 sozinho**. Não reproduz |
| segunda causa = vazamento de estado entre arquivos | não sustentado: o arquivo reprova sozinho |
| `apps/landing` intocado entre `f529c53b` e `5cf5b29d` | mudou: `app/_ds/ds.ts`, **+10 linhas** (CONTROLES-C0) |

O que sobrevive às duas medições, por caminhos diferentes, é o essencial: **a `main` está vermelha
sozinha e a copy não é a causa.** A forma do vermelho ainda se mexe entre execuções, e isso é
informação sobre a instabilidade da suíte.

**Card URGENTE aberto: `S1260`** no [[V1-KANBAN]] e no [[V1-CHECKLIST]], ancorado em
[[LEELA-E12-landing]].

---

## As doze ressalvas, em uma linha cada

As três primeiras corrigem afirmação errada que a próxima lane herdaria como verdade.

1. **o diagnóstico da suíte vermelha está errado no handoff** — não é o worktree, a árvore canônica reproduz;
2. **o gate verde mede os arquivos errados** — os 3 nomeados no "31/31 verdes" não importam nenhum dos 11 alterados, e os 23 que importam `CheckoutFlow` ficaram de fora;
3. **`ambiente Leela` não voltou vazia** — sobrou uma, no comentário da própria lane (`CheckoutFlow.tsx:2336`);
4. **o V6 vai ao dono com o mapa incompleto** — são TRÊS sentidos de "modalidade", e o terceiro (`ClubeResumoPublico.modalidade`) entrou em superfície pública por esta lane, pela frase nova do L2;
5. **`Modalidades / 1`** — rótulo plural sobre contagem singular; espera o V6;
6. **deriva de caixa nos três pilares** — o produto renderiza `'Físico'/'Mental'/'Espiritual'`, o H1 escreve `Físico, mental, espiritual`, e o comentário da própria lane escreve a forma maiúscula uma linha acima → **do dono**;
7. **contradição nova no mesmo cartão do perfil** — `Nenhuma experiência marcada` embaixo do `<h2>` `Próximos eventos`, dentro da aba `Eventos`;
8. **o vocabulário se divide entre a home e o resto** — rodapé da MESMA resposta diz `eventos de bem-estar`, `minha-conta` diz `Organizar eventos` → **do dono** (o rodapé é texto aprovado por ele);
9. **comentário envelhecido** em `PublicHeader.tsx:36`, ainda documentando o rótulo "Eventos";
10. **sete dos onze arquivos alterados não têm teste** — o `ShareBlock` é o único com assinatura nova e superfície real de regressão;
11. **dois números do registro não batem** — "10 arquivos de código" são 11; "as sete ocorrências" do M2 são oito usos;
12. **nota de método para a lane de deploy** — a sonda ingênua mente duas vezes (escapes e templates).

---

## O que segue com o dono

V2, V3, V4, V5 e o **V6 com o mapa dos três sentidos**. Mais duas linhas baratas: a caixa dos três
pilares no H1 (ressalva 6) e se o rodapé acompanha a home no vocabulário (ressalva 8).

## Fila depois desta lane

1. **S1260 (URGENTE)** — a suíte da landing volta a ser confiável. Ela apagou o gate de teste de toda
   lane que toca a landing.
2. **S1261** — as sete ressalvas que não dependem do dono.
3. **S1251** — o deploy do renome do Serviço, junto do pacote que sobe esta copy, **com gate visual em
   navegador obrigatório**.

**Nenhum número de RN foi consumido. A próxima livre continua sendo a 573.**
