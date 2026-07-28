# Handoff · Lane SPECS-0728 · trace leela-build-2d6ee98d

- **Employee:** `sf-cto` (software-forge)
- **Escopo:** planejamento e spec. Zero código de produto.
- **Território:** `leela-specs/**` · `outputs/leela-build-2d6ee98d/SPECS-0728-REPORT.md` · este handoff.
- **Repo:** `C:\dev\LEELA`, branch `main`. Lane ESTORNO-ADMIN em voo no mesmo worktree
  (arquivos `functions/**` sujos que NÃO são meus).

## Faixa de RN desta lane

Prova de não colisão em 2026-07-28: `RN-370` a `RN-380` estão consumidas pelo pacote de
estorno (`functions/src`, `apps/painel/src`, handoff da ESTORNO); `RN-400` a `RN-410` são
do E16; `RN-381` a `RN-399` deram **zero hits** em todo o repo fora de `node_modules`.

**Faixa consumida: RN-385 a RN-399.** `RN-381` a `RN-384` ficam livres como folga para a
ESTORNO crescer.

| RN | Tema | Épico dono | Task |
|---|---|---|---|
| RN-385 | Repasse parcial da comissão | E08 | T1 |
| RN-386 | Aviso ao afiliado em repasse e em marco | E08 | T1 |
| RN-387 | Chave da ativação é gravada, não adivinhada | E10 | T2 |
| RN-388 | Contagem de ativação vem do índice ou não vem | E10 | T2 |
| RN-389 | Formulário é template com casa própria no menu | E04 | T3 |
| RN-390 | Vínculo por versão publicada | E04 | T3 |
| RN-391 | Navegação e permissão da biblioteca | E04 | T3 |
| RN-392 | Ciclo de vida do template | E04 | T3 |
| RN-393 | Catálogo de benefícios da plataforma | E16 | T4 |
| RN-394 | Mídia do parceiro presencial | E16 | T4 |
| RN-395 | Estado e vigência do benefício | E16 | T4 |
| RN-396 | Código identificador do ingresso | E12 | T6 |
| RN-397 | Código na tabela, QR sob demanda | E03 | T6 |
| RN-398 | Conteúdo e degradação do e-mail de compra | E12 | T6 |
| RN-399 | "Entrega" vira "credenciamento" | E03 | T6 |

## Placar

| Task | Estado | Commit |
|---|---|---|
| T1 · prontidão E08 (posição 2) | ✅ | `2293b0d` |
| T2 · prontidão E10 (posição 3) | ✅ | `bec7165` |
| T3 · delta FormBuilder como template | ✅ | `812d128` (pushed) |
| T6 · ingresso QR e credenciamento | ✅ | `426c647` |
| T4 · catálogo de benefícios da plataforma | ✅ | `7cc38cc` (pushed) |
| T5 · boards | ✅ | ver commit `[LEELA-SPECS0728-T5]` |
| Report final | ✅ | `outputs/leela-build-2d6ee98d/SPECS-0728-REPORT.md` |

## Onde ficou cada coisa

- **E08** — `03-canon/epics/LEELA-E08-influenciador.md`, seção "Prontidão de build · posição 2".
- **E10** — `03-canon/epics/LEELA-E10-marcas.md`, seção "Prontidão de build · posição 3"
  e a nota de fronteira que manda o cadastro do admin geral para o E16.
- **FormBuilder** — rodada `02-rodadas/2026-07-28-formbuilder-templates/` (decisões, RNs,
  fila revisada), com consolidação em E04 (dono), E05, E12 e E01 (menu). A fila de 19/07
  ganhou nota de supersede parcial no topo do arquivo.
- **Ingresso QR e credenciamento** — rodada `02-rodadas/2026-07-28-ingresso-qr/`, com
  consolidação em E12 (emissão e e-mail) e E03 (tabela e virada de vocabulário).
- **Catálogo de benefícios** — `LEELA-E16-plataforma-superadmin.md`, seção própria, com a
  decisão de dono justificada.
- **Boards** — `V1-KANBAN.md` com cards no padrão épico → história → tarefa com checklist,
  e `BOARD-EPICOS.md` com o delta da rodada nas linhas de E08 e E10 e no cabeçalho da Onda 4.

## Avisos para quem pegar daqui

1. **`functions/src/checkout` está disputado** por três pacotes: estorno (em voo), E08
   (`S706-T1`) e ingresso QR (`S1206-T5`), mais o FormBuilder (`S1212-T1`). Serializar por
   lane, nunca por task.
2. **`functions/src/email`** recebe templates de dois pacotes (`S706-T2` e `S1206-T6`).
   Arquivo comum, blocos distintos: rebase e acrescente.
3. **A sétima área do menu** (`S313-T1`) cobra o catálogo do design system, stories,
   `docs.mdx`, `LLM.txt` e a suíte do Sidebar **no mesmo lote**, mais a divergência já
   conhecida da `IconsPage.tsx` do showcase.
4. **Uma leitura pode voltar para o dono:** "cupons de desconto" no admin geral foi
   especificado como **cupom de benefício**, não como cupom de venda. Default em vigor,
   prioridade baixa, nada construído em cima.

## Disciplina em vigor

- `git add` sempre com caminho explícito. Nunca `-A`: a ESTORNO tem trabalho sujo em
  `functions/**`.
- `git fetch` e rebase só quando `HEAD..origin/main` > 0 (o `pull --rebase` falha com a
  árvore suja da outra lane).
- Épicos compartilhados: só ACRESCENTAR seção.
