# Handoff — ROADMAP-COMPONENTES (lane FECHADA)

- **trace:** `leela-roadmap-componentes-20260810`
- **lane:** ROADMAP-COMPONENTES · empresa software-forge · sf-frontend-lead
- **base medida:** `main` @ `b0f979e5` (redesign inteiro mergeado)
- **fecha em:** `c4f0c5dc`, pushed
- **entregável:** spec e roadmap. **Nenhuma linha de código de tela foi tocada.** Todos os commits
  com `--only` e pathspec explícito, em árvore compartilhada com a lane de deploy.

## O que a lane pagou

| Tarefa do épico | Estado | Documento |
|---|---|---|
| S005-T2 · inventário | ✅ | `leela-specs/02-rodadas/2026-08-11-roadmap-componentes/02-inventario-componentes.md` |
| S005-T3 · cânone | ✅ | `leela-specs/03-canon/canone-de-componentes.md` (canônico) + `…/03-canone-componentes.md` (o raciocínio) |
| S005-T4 · ondas | ✅ | `…/04-ondas-roadmap.md` |
| S005-T5 · trava | 📋 | spec pronta em `…/05-gate-leela-canon.md`; **o código é o primeiro item da Onda 0** |

Mais: `…/01-ordem-do-dono.md` (ata), **RN-558** no `LEELA-E01-design-system.md`, **CANONE-1** em
`01-produto/DECISOES-ABERTAS.md`, DoD de Tela e `governanca-design.md` §8 apontando para o cânone.

## Os números, para quem retomar

- **223 divergências de procedência**: 192 superfícies reescritas à mão, 17 botões/CTAs replicando
  variante, 8 estados vazios artesanais, 5 controles nativos crus, 1 typeahead fora do `Combobox`.
- **106 instâncias de layout sem cânone**, em 23 receitas distintas para 3 famílias reais.
- **237 arquivos** importam componente do DS (208 painel, 29 landing).
- **20 passos de carga** medidos em 6 telas; **16 estão no checkout**.

## Três coisas que a medição derrubou, e que vão contrariar quem leu os handoffs antigos

1. **Os "~40 telas com bg cru" não existem.** Zero ocorrência de fundo cru literal nos dois apps; as
   199 ocorrências de `bg-[var(--…)]` são 100% semânticas. O board e o épico foram corrigidos.
2. **`be-hero.com.br` não está na landing.** As ocorrências estão todas no painel, e são **seis**,
   não duas.
3. **A §8 shadcn-first funcionou.** Zero `<input>`, `<textarea>`, checkbox, radio ou file nativos no
   painel. Sobraram 5 controles crus no repositório, e **2 deles estão dentro do próprio DS**.

## Fila, em ordem

1. **CANONE-1** volta do dono → destrava a Parte B da Onda 0 (primitivos de layout, cartões de
   domínio). A Parte A e as ondas 1 a 5 **não** dependem dela.
2. **Onda 0 Parte A** (livre agora): `ConfirmModal` compõe `Textarea` e `Checkbox`; 10 stories
   faltantes; teste do `Command`; F4 e F5 do rail; gate `leela-canon` nasce `warn`.
3. **Ondas 1 → 5**, na ordem do `04-ondas-roadmap.md`. Cada uma com brief próprio.

## Achados fora desta família, precisam de lane própria

- `packages/design-system/src/components/charts/BarChart.tsx:130` — `tickFormatter={truncarRotulo}`
  recebe `(valor, índice)` do Recharts e o índice vira o limite de caracteres: todo rótulo do eixo
  trunca para **um caractere**. Pré-existente (`a826dc3a`). Defeito de dado exibido, alta prioridade.
- `apps/painel/src/routes/overview/_components/ActiveEvents.tsx` — **não é importado** por
  `OverviewContent.tsx` (o comentário em `:14-16` confirma que saiu da tela). Órfão sustentando
  suíte verde.
- Checkout, RN-470: depois do PIX, saber que o pagamento entrou exige clicar "Atualizar estado do
  pedido". Escolha explícita de custo da v1, registrada — e é o passo mais caro do produto.

## Nota de processo

`leela-specs/00-boards/V1-CHECKLIST.md` segue sem manutenção desde 06/08, enquanto kanban e épicos
avançaram até 11/08. Esta lane **não** o ressuscitou: escrever numa terceira altitude abandonada
produz sinal falso. A decisão de manter ou aposentar a terceira altura continua pendente e está
registrada em `VISAO-DE-PROJETO.md`.
