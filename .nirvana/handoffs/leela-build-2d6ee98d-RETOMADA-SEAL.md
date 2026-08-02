# Handoff vivo · lane RETOMADA-SEAL · trace leela-build-2d6ee98d · 2026-08-02

Executor: sf-frontend-lead (software-forge). Brief: `.nirvana/briefs/leela-build-2d6ee98d-RETOMADA-SEAL-enriched.md`.
Autoridade: `leela-specs/02-rodadas/2026-08-02-retomada/01-decisoes.md` (D-0802-1, verbatim do dono).
Insumos: handoffs `leela-maestro-pausa-20260729.md`, `leela-build-2d6ee98d-CHECKOUT-UX.md`,
`leela-build-2d6ee98d-LANDING-PREVIEW.md` (receita de deploy).

Base: `main` em `09009de`. Sem push — o maestro pusha.

## Estado da fila

- [x] **R1 · C1-LEGAL** — texto legal da jornada de compra em vocabulário de participante/experiência
- [ ] R2 · sugestões de vocabulário para a home (documento)
- [ ] R3 · deploy da landing + provas curl
- [ ] R4 · aterrissagem (boards, V1-CHECKLIST, épico E12, self-score)

---

## R1 · C1-LEGAL — o termo de saúde deixa de ser um termo de atleta

A escalação nº 4 da CHECKOUT-UX ("C1 não toca o texto legal de `AceitesCompra.tsx`") foi
respondida pelo dono em D-0802-1 e esta task a paga. O argumento que segurava a mudança era o
benchmark: o termo era modelado no **"Termo do Atleta" da Sympla Sports**. O dono derrubou o
benchmark com um fato sobre o produto, não sobre o texto — *a Sympla Sports É de corrida e a
Leela não é*. Registrei isso no cabeçalho do arquivo para que ninguém restaure o vocabulário
antigo achando que está honrando o benchmark original.

### O que mudou, linha a linha (`AceitesCompra.tsx`)

| Antes | Depois | Por quê |
|---|---|---|
| `Transferência de inscrição para outro **atleta**` | `...para outro **participante**` | vocabulário de plataforma na política de vendas |
| `Declaro que **treinei** adequadamente para a atividade ... me impeça de **praticar exercícios físicos**` | `Declaro que **me preparei** adequadamente para a atividade ... me impeça de **participar dela**` | "treinar" é preparo de atleta; "preparar-se" cobre retiro, clube e corrida sem perder a função (declaração de preparo + ausência de contraindicação) |
| `atividade que **envolve** esforço físico` | `atividade que **pode envolver** esforço físico` | o termo é exibido em **todo** evento (§5.3b); afirmar esforço físico num retiro de bem-estar seria declaração falsa por construção |
| `Estou ciente do regulamento da **prova**` | `...regulamento da **experiência**` | termo guarda-chuva de D-0802-1 §3 |
| `vale para todos os **atletas** deste pedido` | `...todos os **participantes** deste pedido` | idem |
| comentário `benchmark Sympla Sports "Termo do Atleta"` (3 lugares) | nota de D-0802-1 com a fronteira plataforma × organizador | a procedência do texto era o argumento que segurava a mudança; sem atualizar, volta |

O texto **não perdeu função jurídica**: os cinco atos declaratórios continuam lá na mesma
ordem — aptidão, preparo, responsabilidade por condição omitida, ciência do regulamento,
autorização de atendimento de emergência — e a cláusula de terceiros continua fechando o
parágrafo final. Nenhuma isenção foi ampliada ou reduzida; a de `Assumo a responsabilidade...`
não foi tocada.

### A fronteira dura, e como ela ficou provada

O conteúdo do **evento** não muda: a meia-floripa continua sendo uma corrida. O que mudou é o
que a **plataforma** emite. O teste novo prova a fronteira num único modal — o evento do
fixture chama-se `Corrida Teste` e o modal continua exibindo "apto(a) a participar do evento
Corrida Teste" enquanto nenhuma palavra da plataforma no mesmo `dialog` remete a corrida.

### Gates

- `npx tsc --noEmit` (landing) → **exit 0**
- `npx eslint app lib test --max-warnings 0` → **exit 0**
- `npx vitest run test/checkout-form-aceites.test.tsx` → **9/9** (7 antes + 2 novos)
- Suíte cheia, single-fork (diretriz da CHECKOUT-UX): `npx vitest run --pool=forks
  --poolOptions.forks.singleFork=true` → **209/209 em 20 arquivos, 23,03 s**
  (207 antes + os 2 casos novos). Zero flakiness.

### Aceite do grep

```
grep -rnoE "'[^']*(atleta|prova)[^']*'|`[^`]*(atleta|prova)[^`]*`" \
  "apps/landing/app/(public)/[eventSlug]/inscricao/" \
  | grep -viE "section-atleta|atleta-\$|CardAtleta|AdicionarAtleta"
```

Duas linhas sobrevivem, e as duas são **falso positivo do próprio regex**: `com-prova-nte`
em `AceitesCompra.tsx:58` e `StepConfirmacao.tsx:174`. Zero vocabulário de atleta/prova como
texto de plataforma na jornada de compra.

### Testes novos (2 casos, `checkout-form-aceites.test.tsx`)

- termo de saúde: exige "regulamento da experiência", "todos os participantes deste pedido" e
  "me preparei adequadamente"; e reprova por `textContent` do `dialog` qualquer `atleta`,
  `\bprova\b` ou `treinei` — asserção negativa, que é a que impede a regressão silenciosa;
- termos da compra: exige "transferência de inscrição para outro participante" e reprova
  `atleta` no diálogo inteiro.

### Não tocado (decisão registrada, não esquecimento)

1. **Identificadores e âncoras** — `CardAtleta`, `BotaoAdicionarAtleta`, `euCorro`,
   `id="atleta-{i}"`, `autoComplete="section-atleta{i}..."`. Invisíveis ao comprador; o
   `id` é o alvo do scroll-to-card do B7. Renomear é risco de regressão sem ganho de UX.
2. **`kitDetalheDados.ts`** — "camiseta técnica de corrida". Descreve um item físico de um
   evento que É uma corrida; é conteúdo de produto do organizador, exatamente o lado da
   fronteira que o brief manda preservar.
3. **Página do evento (`/[eventSlug]`), fora da jornada de compra** — `RegulamentoModal`
   ("Regulamento da prova"), `RegulamentoSection` ("regulamento oficial da prova") e os
   `alt` da `GaleriaSection` ("Grupo de corredores na largada de uma corrida de rua",
   "Corredora comemorando a chegada da prova"). **Isto é vocabulário de PLATAFORMA** —
   quem escreve esses rótulos é a Leela, não o organizador — mas vive na landing, que
   D-0802-1 §2 reserva para o dono. Levado para o documento do R2 em vez de mudado aqui.
