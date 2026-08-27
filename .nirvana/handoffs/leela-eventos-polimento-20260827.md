# Handoff — Eventos Polimento · 27/08/2026

**Branch:** `eventos/polimento-20260827`
**Tag de commit:** `[leela-eventos-polimento-20260827]`
**Gate visual:** `.nirvana/gate-visual/eventos-polimento/`

---

## V2708-01 · Numeral de countdown cortado

### Causa raiz

O componente `CountdownHero` usa `bg-clip-text text-transparent` para pintar o
numeral grande com um gradiente. O clipping CSS (`bg-clip-text`) pinta apenas
dentro do *box declarado* do elemento — e o texto usava `leading-none`, que
colapsa o box exatamente na altura da em-square. Fontes display italic extrabold
a 4.5 rem têm ascendentes e descedentes que *excedem a em-square*, então os
pixels do gradiente que caíam fora do box declarado ficavam transparentes
(recortados), criando a aparência de numeral cortado.

### Correção aplicada

`apps/painel/src/routes/eventos/evento/overview/CountdownHero.tsx`

Adicionados dois Tailwind classes ao `<span>` do numeral:

- `inline-block` — necessário para que padding vertical expanda o box pintado
  (elementos `inline` ignoram padding vertical no layout, o que impedia o
  `bg-clip-text` de crescer).
- `py-[var(--spacing-1)]` — adiciona espaço vertical acima e abaixo do numeral,
  expandindo a área pintada pelo gradiente de forma a cobrir o ink overflow do
  extrabold italic.

Token usado: `--spacing-1` (já existente no design system; evita a regra ESLint
`leela-tokens/no-hardcoded-tokens` que rejeita valores arbitrários sem `var()`).

### Gate visual

Screenshot: `after-overview-numeral.jpg` — numeral "43" visível por completo,
gradiente laranja íntegro, sem corte.

---

## V2708-09 · Remoção de textos descritivos de apoio

### Regra aplicada

Novo mandato do dono (rodada 27/08): **zero textos descritivos de apoio sempre
visíveis** nas telas de Eventos. Textos que explicam regras de negócio ao lado
de controles foram removidos. Textos de *empty state* (só aparecem quando não
há dados) foram preservados — esses têm função funcional, não decorativa.

### Inventário completo — 9 textos removidos

| # | Arquivo | Texto removido (resumo) |
|---|---------|-------------------------|
| 1 | `LotesView.tsx` — `SectionHeader description` | "Modalidades são as categorias de participação..." |
| 2 | `LotesView.tsx` — `<p>` após SectionHeader | "Este evento já tem inscrição registrada, e a lista de modalidades fica congelada..." |
| 3 | `ModalidadeModal.tsx` — `description` do `<Modal>` | "Modalidades só podem ser editadas enquanto..." |
| 4 | `ModalidadeModal.tsx` — `aria-describedby` hint | "Fica no registro do evento (mínimo N caracteres)" |
| 5 | `ModalidadeModal.tsx` — span hint 2 | Mesma mensagem expandida com contagem de caracteres |
| 6 | `ConfigGeraisForm.tsx` — `<p>` informativo | "A data é definida na criação do evento. As modalidades e os lotes de preço..." |
| 7 | `DistribuicaoView.tsx` — SectionHeader "Retirada por kit" `description` | "Retirados sobre confirmados..." |
| 8 | `DistribuicaoView.tsx` — SectionHeader "Estoque por kit e modalidade" `description` | "Confirmados por célula..." |
| 9 | `DistribuicaoView.tsx` — SectionHeader "Estoque por tamanho" `description` | "Um SKU por..." |

**Total: 9 textos removidos em 4 arquivos.**

### PROPOSTAS DE TOOLTIP (não implementadas — aguardam EVT-CARGA)

Os textos abaixo têm valor informacional real. Quando a rodada EVT-CARGA
definir o padrão de tooltip para o painel, estes são os candidatos:

1. **Modalidades — estado congelado** (era no `SectionHeader` e no `<p>`
   duplicado de `LotesView`): explicar por que "Adicionar modalidade" fica
   desabilitado quando há inscrições (RN-500). Gatilho sugerido: ícone `ⓘ` ao
   lado do botão desabilitado.

2. **ModalidadeModal — regra de edição** (era no `description` do `<Modal>`):
   contexto de quando modalidades podem ser renomeadas. Gatilho: `ⓘ` no label
   do campo "Nome da modalidade".

3. **ModalidadeModal — contagem de caracteres mínima** (era no hint inline):
   informar o mínimo de caracteres exigido. Gatilho: validação inline ao sair
   do campo (já é nativo do DS; o tooltip pode ser dispensável).

4. **ConfigGerais — imutabilidade da data** (era no `<p>` informativo):
   explicar que a data só pode ser alterada antes da primeira inscrição.
   Gatilho: `ⓘ` ao lado do campo de data (que já aparece desabilitado).

5. **DistribuicaoView — fórmulas dos indicadores** (eram nas descriptions das
   3 seções de estoque): "Retirados / Confirmados", "Confirmados por célula
   (kit × modalidade)", "Um SKU por tamanho". Gatilho: `ⓘ` no heading de cada
   seção de tabela.

---

## V2708-06 · Descoberta do cadastro de modalidade

### Onde o cadastro vive hoje

`apps/painel/src/routes/eventos/lotes/LotesView.tsx` — aba "Modalidades" do
evento, componente `LotesView`, seção `SectionHeader` com botão de ação.

### Por que não era descobrível

O botão "Adicionar modalidade" era renderizado condicionalmente:

```tsx
// antes — botão só aparecia quando podeEditarModalidades === true
action={podeEditarModalidades ? <Button ...>Adicionar modalidade</Button> : undefined}
```

Quando o evento já tinha inscrições (`podeEditarModalidades === false`, RN-500),
o campo `action` do `SectionHeader` ficava `undefined` e nenhum botão era
renderizado. O usuário não via a ação e não entendia por que não conseguia
adicionar modalidades — a tela simplesmente não oferecia ponto de entrada.

### Correção aplicada

O botão agora é sempre renderizado, usando `disabled={!podeEditarModalidades}`:

```tsx
action={
  <Button
    variant="primary"
    size="sm"
    onClick={onAdicionarModalidade}
    disabled={!podeEditarModalidades}
  >
    <Plus ... />
    Adicionar modalidade
  </Button>
}
```

O DS renderiza botões desabilitados com opacidade reduzida e `cursor: not-allowed`,
sinalizando que a ação existe mas não está disponível no momento — padrão
acessível e informativo sem precisar de texto explicativo extra.

Teste atualizado: `LotesView.test.tsx` — o caso "evento COM venda" agora verifica
`expect(botaoAdicionar).toBeDisabled()` em vez de `not.toBeInTheDocument()`.

### Gate visual

Screenshot: `after-modalidades-botao.jpg` — botão "Adicionar modalidade"
visível (greyed, disabled) junto da listagem de modalidades; nenhum texto
descritivo presente.

---

## V2708-10 · Carga cognitiva — o que a rodada 27/08 já decide e o que aguarda

### O que esta rodada já decide (itens entregues)

| Decisão | Evidência |
|---------|-----------|
| Numeral de countdown não é mais cortado | CountdownHero corrigido; screenshot confirma |
| Zero textos de apoio sempre visíveis em Eventos | 9 textos removidos em 4 arquivos |
| "Adicionar modalidade" é sempre descobrível | Botão sempre renderizado, `disabled` quando RN-500 ativo |
| Onde ficam os tooltips quando chegarem | 5 candidatos listados neste handoff com gatilhos sugeridos |
| Testes de regressão atualizados | `LotesView.test.tsx` reflete novo comportamento |

### O que ainda aguarda EVT-CARGA

As perguntas abaixo **não foram respondidas** nesta rodada porque dependem de
decisões de produto que vão além do polimento visual. Cada uma gera ao menos
um item de trabalho quando respondida.

1. **Padrão de tooltip para o painel** — o DS tem `Tooltip` mas não define
   *quando* usar, em qual contexto, e qual é o delay/trigger padrão para telas
   de backoffice. Sem essa decisão, os 5 candidatos acima ficam sem implementação.

2. **Comunicação do motivo do bloqueio (RN-500)** — o botão desabilitado
   sinaliza "não disponível" mas não diz *por quê*. Uma opção é tooltip no
   botão disabled ("Este evento tem inscrições — modalidades não podem ser
   alteradas"). Outra é um banner contextual. Qual padrão usar?

3. **Acessibilidade de botões disabled sem explicação** — `aria-disabled` +
   tooltip é o padrão WCAG 2.1 para botões desabilitados com razão. Precisa
   de decisão de equipe antes de implementar o `aria-describedby` correto.

4. **Textos de ConfigGerais e DistribuicaoView** — removidos do fluxo principal,
   mas as informações que continham (imutabilidade de data, fórmulas de estoque)
   ainda são úteis para novos organizadores. Onde e como essas informações
   aparecem no produto? Tour de onboarding? Centro de ajuda? Tooltip inline?

5. **Renomeação de modalidade com inscrições** — a modal de edição perdeu o
   hint sobre mínimo de caracteres. O campo de validação do DS (contador inline)
   cobre parcialmente, mas falta comunicar o *porquê* do mínimo. Decisão de
   produto sobre UX de validação.

---

## Arquivos modificados

- `apps/painel/src/routes/eventos/evento/overview/CountdownHero.tsx`
- `apps/painel/src/routes/eventos/lotes/LotesView.tsx`
- `apps/painel/src/routes/eventos/lotes/ModalidadeModal.tsx`
- `apps/painel/src/routes/eventos/configuracoes/_components/ConfigGeraisForm.tsx`
- `apps/painel/src/routes/eventos/kits/DistribuicaoView.tsx`
- `apps/painel/src/routes/eventos/lotes/__tests__/LotesView.test.tsx`

## Gates

- lint: 0 erros · 0 warnings (verificado com `pnpm --filter @leela/painel lint`)
- tsc: 0 erros (verificado com `pnpm --filter @leela/painel tsc --noEmit`)
- build: OK (`pnpm --filter @leela/painel build`)
- testes painel: 383 passam · pré-existente 212 falham por `@leela/core` ausente
  no worktree (causa conhecida — "CI nunca passou", RN-578)
- gate visual: 2 screenshots em `.nirvana/gate-visual/eventos-polimento/`
