---
tags: [leela, backlog, jira, moc]
aliases: [Backlog, Jira, Fonte da verdade]
---

# 🗂️ Leela · Backlog (fonte da verdade)

> Visão estilo Jira: **Épico → User Story → Subtarefa**, com progresso ao vivo. Cada user story é uma nota em `backlog/` com frontmatter (`status`, `epic`, `onda`, `v1`) e subtarefas em checkbox. **Atualize o `status` da nota da story** (`backlog` → `doing` → `review` → `done`) **e marque as subtarefas** — todas as visões abaixo recalculam sozinhas.

> **Requer o plugin Dataview** (ative também *Enable JavaScript Queries* nas opções do Dataview, para os blocos de resumo/progresso). Se você abriu o vault na pasta `leela-specs` (e não `LEELA`), troque `"leela-specs/backlog"` por `"backlog"` nas queries.

## 📊 Progresso

```dataviewjs
const all = dv.pages('"leela-specs/backlog"').where(p => p.type == "story");
function rollup(pages){ let tT=0,tD=0; for(const s of pages){ const ts=s.file.tasks; tT+=ts.length; tD+=ts.where(t=>t.completed).length; } return {tT,tD}; }
const total=all.length, done=all.where(s=>s.status=="done").length;
const r=rollup(all);
const v1=all.where(s=>s.v1==true); const v1done=v1.where(s=>s.status=="done").length; const rv=rollup(v1);
dv.paragraph(`**Projeto** — Stories: ${done}/${total} · Subtarefas: ${r.tD}/${r.tT} (${r.tT?Math.round(r.tD/r.tT*100):0}%)`);
dv.paragraph(`**V1 (produtor + app simples)** — Stories: ${v1done}/${v1.length} · Subtarefas: ${rv.tD}/${rv.tT} (${rv.tT?Math.round(rv.tD/rv.tT*100):0}%)`);
```

## 🧱 Épicos

```dataview
TABLE length(rows) AS "Stories", length(filter(rows, (r) => r.status = "done")) AS "Done", sum(rows.tasks_total) AS "Subtarefas", rows.onda[0] AS "Onda"
FROM "leela-specs/backlog"
WHERE type = "story"
GROUP BY epic AS "Épico"
SORT epic ASC
```

## 🏃 V1 · por onda (com progresso de subtarefas)

```dataviewjs
const ss = dv.pages('"leela-specs/backlog"').where(p=>p.type=="story" && p.v1==true);
for (const onda of [0,1,2,3]) {
  const g = ss.where(s=>s.onda==onda).sort(s=>s.id);
  if(!g.length) continue;
  dv.header(3, "Onda "+onda+" · "+g.length+" stories");
  dv.table(["Story","Épico","MoSCoW","Status","Subtarefas"], g.map(s=>{
    const ts=s.file.tasks; const d=ts.where(t=>t.completed).length;
    const pct = ts.length? Math.round(d/ts.length*100)+"%" : "—";
    return [s.file.link, s.epic, s.moscow, s.status, `${d}/${ts.length} · ${pct}`];
  }));
}
```

## 🟰 Quadro por status (só V1)

```dataview
TABLE WITHOUT ID rows.file.link AS "Stories"
FROM "leela-specs/backlog"
WHERE type = "story" AND v1 = true
GROUP BY status AS "Status"
```

## ❄️ Fora da V1 (backlog futuro)

```dataview
TABLE epic AS "Épico", moscow AS "MoSCoW", tasks_total AS "Subtarefas"
FROM "leela-specs/backlog"
WHERE type = "story" AND v1 = false
SORT epic ASC, id ASC
```

---

## Como trabalhar (fonte da verdade)

1. Abra uma nota de story em `backlog/` (ex.: `LEELA-S200.md`).
2. Mude `status:` no frontmatter conforme avança: `backlog` → `doing` → `review` → `done`.
3. Marque as subtarefas (`- [x]`) à medida que os PRs entram.
4. Volte aqui — progresso, épicos e quadro recalculam sozinhos.

**Dica de edição rápida:** o plugin **Projects** (Marcus Olsson) dá uma UI de tabela/board para editar o `status` de várias stories de uma vez (aponte para a pasta `backlog/`). E o [[V1-KANBAN]] segue como quadro de arrastar no nível de épico.

Ver também: [[HOME]] · [[V1-CHECKLIST]] · [[ROADMAP-VISUAL]] · `roadmap.html`
