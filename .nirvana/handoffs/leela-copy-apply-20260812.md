# Handoff · COPY-APPLY — a copy da landing no tom do dono

- **Trace:** `leela-copy-landing-20260812` · lane `COPY-APPLY`
- **Árvore:** worktree `C:\dev\leela-wt-copyapply`, branch `copy-apply`, base `dda0abd0` (main)
- **Rodada:** `leela-specs/02-rodadas/2026-08-12-copy-landing/` — o `04-apply.md` é o registro completo
- **Estado:** aplicado, commitado, merge `--no-ff` na main e push. ⛔ **NENHUM deploy.**
- ⛔ **A review antagonista NÃO rodou.** Ela não é desta lane, por regra da casa. O delta exato para
  a REV está no fim deste arquivo.

---

## A régua de tom, extraída das fontes dele antes de escrever

1. **Frase curta, direto ao ponto, zero enrolação** — o rodapé que ele aprovou (`sem enrolação`) e
   a cobrança de 12/08 (*"nao quero porra nenhuma de ata"*).
2. **Coisa concreta antes de conceito** — ele enumera instâncias (*"wellness, clubs, etc."*,
   *"fisico menatl e espiritual"*), não abstrações.
3. **A categoria é experiência de bem-estar, nunca corrida** — D-0802-1 e a direção de 12/08.
4. **Convite, nunca pressão** — *"basta salvarmos as informações"*, *"convidando o usuário"*.
5. **Nada de promessa sem lastro** — *"ja falei que nao enviaremos nada"* (RN-569).

A régua reprovou duas propostas da própria review antes de virarem código (L2 e M4), e as duas
divergências estão nomeadas em `04-apply.md`.

---

## O que entrou

**13 de 13 defeitos objetivos pagos**, mais a home, que deixou de ser vetável.

| História | O que foi |
|---|---|
| S1252 | a linha de confiança do checkout parou de mentir |
| S1253 | o `ShareBlock` deixou de chamar um perfil de evento |
| S1254 | B2, M4, L1 e L2 — o vocabulário de experiência fechando as lacunas da S1218-T3 |
| S1255 | G2, G3, M2, M3 e L3 — os rótulos dizendo o que acontece depois do clique |
| S1256 | a home inteira, com hero, rótulos, `<title>`, OG e a descrição do root layout |

**S1251 segue aberta** e é a única da fila que esta lane não podia fechar: é o deploy do renome do
Serviço, e não houve deploy.

### A string nova da home, na íntegra

> `Físico, mental, espiritual. Ache sua próxima experiência e garanta a vaga em minutos.`

Eyebrow: `Experiências de bem-estar`. Subline: `Corrida, pedal, retiro, treino de clube. Você
escolhe a experiência, a gente cuida da inscrição, do kit e da retirada. Sem criar conta para
começar.` As demais peças estão na tabela de `04-apply.md`.

---

## O que NÃO foi decidido, e continua com ele

**V2** (organizador × profissional × produtora), **V3** (`0 membros ativos`), **V4** (`Club` em
inglês) e **V5** (nomear o Asaas na tela). Nenhum foi tocado, e o B3 foi pago pela saída que não
decide o V5.

**V6 é novo** e nasceu da própria aplicação: "modalidade" tem dois sentidos vivos no produto (a
prática do evento e as opções de inscrição) e os dois tiles agora ficam lado a lado na seção Sobre.
As três saídas estão medidas em `02-vetaveis.md`.

Nenhum número de RN foi consumido. **A próxima livre continua sendo a 573.** RN-559 e SERV-3 seguem
intocados, e a varredura de promessa de envio (RN-569) não achou nada nas strings novas.

---

## Gates, com o que cada número significa

| Gate | Resultado |
|---|---|
| `pnpm --filter @leela/landing type-check` | ✅ verde, exit 0 |
| `pnpm --filter @leela/landing lint --max-warnings 0` | ✅ verde, exit 0 |
| Testes que importam os componentes tocados (`evento-vocabulario-x1`, `cupom-banner-s1215`, `regulamento-modal-focus-trap`) | ✅ **31/31 verdes** |
| Varredura de `ambiente Leela` no monorepo | ✅ zero ocorrências restantes |
| `pnpm --filter @leela/landing test:gate` (suíte inteira) | ⚠️ **vermelha — e vermelha em HEAD, sem uma linha minha.** 102 vermelhos com o patch × **43 em HEAD**, com só 5 arquivos em comum entre as duas listas. Leia o bloco abaixo |
| Gate visual em navegador | **não se aplica**: sem deploy. Ele é obrigatório na lane que subir |

### ⚠️ A suíte da landing está vermelha neste worktree, e a causa não é esta lane

O número bruto assusta e por isso ele vem com a medição ao lado, não sozinho.

**O que foi medido, em ordem:**

1. A suíte cheia **com o patch**: **102 vermelhos, 747 verdes**, 14 arquivos reprovados.
2. A suíte cheia **no MESMO worktree, com a árvore em HEAD e zero alteração minha**: **43
   vermelhos, 806 verdes**, 10 arquivos reprovados. As duas listas de arquivos só têm **5 nomes em
   comum**: cinco arquivos reprovam só em HEAD e nove só com o patch. Regressão de copy não muda de
   arquivo entre execuções; ela reprova sempre no mesmo lugar.
3. ⚔ **A medição que fecha o caso.** Os **nove** arquivos que a suíte cheia atribuiu ao patch foram
   rodados de novo **em HEAD, sem uma linha minha**: **81 vermelhos, 77 verdes, nove arquivos
   reprovados**. Todos já eram vermelhos sem mim.
4. `minha-conta-ponte-s1234.test.tsx` sozinho: **53/53 verde na main** (`C:\dev\LEELA`), **48
   vermelhos no worktree**. Com a **minha alteração daquele arquivo revertida**, o worktree
   continuou com os mesmos 48. A causa é o ambiente do worktree, não a copy.
5. Os 7 arquivos que cobrem as superfícies tocadas, no mesmo worktree: **60 vermelhos em HEAD** e
   65 com o patch, com os **mesmos 5 arquivos** reprovando nas duas pontas.
6. Os 3 arquivos que de fato importam os componentes que eu mudei: **31/31 verdes com o patch**.
7. Varredura de asserção: nenhum teste da landing prende uma das strings que esta lane trocou. Os
   únicos casadores que citam `painel profissional` são regex **insensíveis a caixa**
   (`/ir para o painel profissional/i`), então a normalização do M2 passa por construção. E
   `evento-vocabulario-x1.test.tsx`, que prende `2 modalidades`, mira a `ModalidadesSection` — que
   esta lane não tocou.

**O que já foi descartado como causa:** os `dist` de `@leela/core`, `@leela/api-client` e
`@leela/design-system` são **byte a byte idênticos** aos da main (md5 de `index.js`, `index.mjs` e
`index.d.ts`); as versões de `react`, `jsdom` e `@testing-library/react` são as mesmas; o `.env`
local foi copiado da main e não mudou o resultado. O sintoma é sempre o mesmo: o componente
renderiza vazio (`<div />`), o efeito não dispara e o React avisa *"The current testing environment
is not configured to support act(...)"*.

**O que isso NÃO é:** contenção. A hipótese foi testada primeiro, rodando os arquivos sozinhos, e
eles continuaram vermelhos.

**O que a main tem de vermelho por conta própria:** `definir-senha-s1223.test.tsx` roda **12 de 13
vermelhos na main intocada**, sozinho. A suíte da landing não estava verde antes desta lane.

⛔ **A REV precisa rodar num ambiente com a suíte confiável**, e o achado do ambiente do worktree é
item próprio, não desta rodada de copy. Se a REV rodar aqui dentro, ela vai reencontrar os mesmos
vermelhos e eles não são da copy.

### A sonda de string no bundle

O App Router esconde string em flight data, então prova estática de fonte não basta. Esta lane
**não gerou build** (`next build` exige o gate de frescor do workspace e a lane não sobe nada), e
por isso a sonda de bundle fica declarada como **pendência da lane de deploy**, junto do gate
visual. O que ela precisa provar, quando rodar: `próxima corrida`, `Corrida de rua`,
`inscrições para corridas`, `Pronto para largar`, `ambiente Leela`, `Baixar o app` e
`grupo de treino` com **zero** ocorrências no artefato servido, e o H1 novo presente.

---

## ⛔ Delta exato para a review antagonista

- **Branch:** `copy-apply` (preservada), merge `--no-ff` na `main`
- **Delta a revisar:** `DELTA_HASHES`
- **Arquivos de código:** 10, todos em `apps/landing/`
- **Arquivos de registro:** rodada, vetáveis, decisões do dono, épico E12, kanban e checklist

**O que a REV deve atacar primeiro, na ordem em que eu mesmo desconfiaria:**

1. **O H1 e a subline da home.** É a única copy desta lane sem proposta anterior escrita: ela
   nasceu aqui, contra a régua de tom. Se o tom não é dele, é aqui que se vê.
2. **A frase do checkout.** `seus dados de pagamento não ficam com a Leela` é uma afirmação sobre
   custódia de dado. A medição está em `04-apply.md`; refazer a medição vale mais que reler a frase.
3. **As três divergências da proposta da review** (G6, L2 e M4), cada uma com a razão escrita. Se
   alguma não se sustenta, ela volta à proposta original numa linha.
4. **O `ShareBlock` com props novas.** É o único ponto da lane que mexe em assinatura de
   componente, e a regressão possível é um consumidor perder o texto padrão.
5. **A caixa do `Painel Profissional`.** As sete ocorrências passaram a sair de uma constante; vale
   conferir que nenhuma virou frase com artigo errado.
