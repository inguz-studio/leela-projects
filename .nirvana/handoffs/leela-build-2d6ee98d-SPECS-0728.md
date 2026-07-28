# Handoff · Lane SPECS-0728 · trace leela-build-2d6ee98d

- **Employee:** `sf-cto` (software-forge)
- **Escopo:** planejamento e spec. Zero código de produto.
- **Território:** `leela-specs/**` · `outputs/leela-build-2d6ee98d/SPECS-0728-REPORT.md` · este handoff.
- **Repo:** `C:\dev\LEELA`, branch `main`. Lane ESTORNO-ADMIN em voo no mesmo worktree (arquivos `functions/**` sujos que NÃO são meus).

## Faixa de RN desta lane

Prova de não colisão em 2026-07-28: `RN-370..RN-380` estão consumidas pelo pacote de estorno
(`functions/src`, `apps/painel/src`, handoff da ESTORNO); `RN-400..RN-410` são do E16;
`RN-381..RN-399` = **0 hits** em todo o repo fora de `node_modules`.

**Faixa desta lane: RN-385 a RN-395.** Deixo `RN-381..384` e `RN-396..399` livres como
folga para a ESTORNO crescer.

| RN | Tema | Task |
|---|---|---|
| RN-385 | Repasse parcial da comissão | T1 |
| RN-386 | Aviso ao afiliado (repasse e marco) | T1 |
| RN-387 | Índice inverso de ativações da marca | T2 |
| RN-388 | Contagem de ativações exibida só a partir do índice | T2 |
| RN-389 | Formulário como template com casa própria no menu | T3 |
| RN-390 | Vínculo evento/clube → template por versão publicada | T3 |
| RN-391 | Navegação e permissões da biblioteca de formulários | T3 |
| RN-392 | Ciclo de vida do template em uso | T3 |
| RN-393 | Catálogo de benefícios da plataforma | T4 |
| RN-394 | Mídia do parceiro presencial | T4 |
| RN-395 | Publicação e vitrine do benefício | T4 |

## Estado por task

| Task | Estado | Commit |
|---|---|---|
| T1 · prontidão E08 | ⏳ em curso | — |
| T2 · prontidão E10 | ⏳ | — |
| T3 · delta FormBuilder | ⏳ | — |
| T4 · marcas no admin geral | ⏳ | — |
| T5 · boards | ⏳ | — |

## Disciplina em vigor

- `git add` sempre com caminho explícito. Nunca `-A`: a ESTORNO tem trabalho sujo em `functions/**`.
- `git fetch` + rebase só quando `HEAD..origin/main` > 0 (o `pull --rebase` falha com a árvore suja da outra lane).
- Épicos E04/E09/E12: só ACRESCENTAR seção.
