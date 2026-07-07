# DS-FORMS — primitivos de formulário do DS · relatório

> Trace: leela-build-2d6ee98d · Banner: LEELA-DS-FORMS · Alvo: sf-frontend-engineer (software-forge, Opus 4.8)
> Bloco #1a (primitivos). O wiring dos forms + `useMutation` fica no #1b.

## T1 — primitivos nativos, born-responsive (commit `d05ea2f`)

Caixa de forms do DS completada com 4 primitivos nativos (motor `<input>`/`<textarea>` restilizado — a11y de teclado/foco/leitor de tela de fábrica), tokenizados (zero cor/tamanho cru), tema brasa/leela, nascendo responsivos (L-004, `w-full` mobile-first, sem overflow em 390px):

- **Textarea** — texto longo multi-linha; mesma casca do Input (label + erro + `aria-describedby`), `resize-y` (nunca `resize-x`).
- **Radio / RadioGroup** — seleção única exclusiva; `<fieldset>`+`<legend>`, `name` compartilhado dá navegação por seta nativa; grupo injeta `name`/`checked`/`onChange` por contexto.
- **Switch (Toggle)** — on/off imediato; `<input type="checkbox" role="switch">` (leitor anuncia "ligado/desligado").
- **Field** — wrapper de a11y para controle cru (input/textarea/select): injeta `id`/`aria-describedby`/`aria-invalid`/`required` por `cloneElement`, `<label htmlFor>` amarrado ao id do controle. **É o TEMPLATE do padrão de id** (`htmlFor ?? childProps.id ?? useId`).

## T2 — hardening pós-review antagonista de a11y (commit desta task, banner `[LEELA-DS-FORMS-T2]`)

Review antagonista dos 4 primitivos apontou 6 achados de a11y que propagariam por TODOS os forms do #1b (por isso bloqueavam). Fix cirúrgico replicando o padrão de id do `Field` (o template correto). Cada fix tem teste de regressão dedicado.

| # | Sev | Componente | Achado | Fix | Teste de regressão |
|---|-----|-----------|--------|-----|--------------------|
| 1 | HIGH | `Textarea.tsx` | Sem `id` do consumidor, `<label htmlFor={id}>` fica órfão → textarea **sem nome acessível** | `const reactId = useId(); const controlId = id ?? reactId;` em `htmlFor`/`id`/`errorId` | `<Textarea label="Descrição"/>` sem id → `getByRole('textbox',{name:'Descrição'})` existe **e** clicar no label foca o campo |
| 2 | MED | `Radio.tsx` (RadioGroup) | `descId`/`errorId` só existiam se o consumidor passava `id` → descrição/erro sem wiring | `const baseId = id ?? useId();` deriva `descId`/`errorId`; `<fieldset aria-describedby>` | RadioGroup com `description` sem id → grupo tem `aria-describedby` apontando ao texto da descrição |
| 3 | MED | `Radio.tsx` (item) | `Omit` não removia `checked`/`defaultChecked` → `{...props}` após `checked={checked}` deixava o consumidor **desacoplar** do grupo | `'checked' \| 'defaultChecked'` no `Omit` (guard de tipo) **+** `{...props}` movido para ANTES dos atributos controlados (guard de runtime — o value do grupo sempre manda) | `<Radio checked>` (forçado via `@ts-expect-error`) dentro de grupo `value="organizador"` → patrocinador **não** fica marcado; organizador sim |
| 4 | MED | `Field.tsx` | `cloneElement(children)` quebrava obscuro com 2 filhos/fragmento/nó não-elemento | `const child = React.Children.only(children)` no topo (falha cedo, erro claro); usa `child` no clone e em `childProps` | `<Field>` com 2 `<input>` → `toThrow()` (`@ts-expect-error` cobre o lado de tipo) |
| 5 | LOW | `Field.tsx:76` | `aria-invalid: hasError ? true : undefined` **clobberava** o `aria-invalid` do próprio filho | `hasError ? true : childProps['aria-invalid']` | `<Field>` sem erro com `<input aria-invalid>` → `aria-invalid="true"` preservado |
| 6 | LOW | `Field.tsx:82`, `Textarea.tsx:37` | `gap-1` cru ("zero tamanho cru") | `gap-[var(--spacing-1)]` (alinha com Radio/Switch) | coberto por tsc/ESLint + suíte visual existente |

Nota: `Switch.tsx:93` já usava `gap-[var(--spacing-1)]` — nenhuma mudança necessária.

**Não bloqueante (só documentado, não corrigido):** aria-label vs legend/label — os JSDoc de Radio/Switch/Textarea já orientam "sem label visível, passe `aria-label`" (use um OU outro). Não bloqueia.

## Gate T2 — PASS

- **Suíte DS: 912/912** (era 907; +5 testes de a11y: Textarea +1, RadioGroup/Radio +2, Field +2) em blocos.
- **tsc: 0 erros** (`tsc --noEmit`).
- **ESLint no-hardcoded: 0** (`eslint src --max-warnings 0`).
- **Build: limpo** (`tsup` — CJS/ESM/DTS success).

## Escopo

`functions/src` read-only (não tocado). Sem wiring de forms nem mutations (fica no #1b). Este T2 **desbloqueia o #1b**: os primitivos não propagam mais os defeitos de a11y (nome acessível, wiring de descrição/erro, acoplamento do radio, robustez do Field) para os formulários de criar/editar.
