---
trace: leela-redesign-v2-20260810
lane: HIFI-REC-FIX (contexto fresco · paga a REV reprovada estreita)
alvo: branch redesign-engajamento-v2 · base e64b8c47 → HEAD 11c1e4c7 · C:/dev/leela-wt-redesign-v2
data: 2026-08-10
veredito: F1 e F3 PAGOS · suíte painel INTEIRA 2444/2444 · DS 1748/1748 · pronta para o re-gate
---

# FIX · HIFI-REC — F1 (seletores da moldura) + F3 (CtaV3 → Button canônico)

Contrato: `.nirvana/briefs/leela-redesign-hifi-rec-FIX-enriched.md`. Fonte dos defeitos:
`leela-redesign-hifi-rec-REV.md` (fix_list lida na íntegra antes de tocar em arquivo).
Não vi a conversa da construção nem a da review; julguei pelo disco. Disciplina: pnpm
sempre com `--config.verify-deps-before-run=false`, suítes em série, :4599 intocado,
`git commit --only` com pathspec explícito + push.

## F1 · B1 — re-inventário por nome acessível (2 arquivos, zero asserção afrouxada)

A régua era mudar SELETOR, nunca ASSERÇÃO — e foi só isso que mudou.

**Helper novo** `apps/painel/src/test/nomeAcessivel.ts` (28 linhas): aproximação
pequena da ACCNAME — `aria-label`, senão `textContent` sem as subárvores
`aria-hidden="true"`. Sem dependência nova (`dom-accessibility-api` não é dep
declarada do painel). É a identidade que a AT anuncia, imune à duplicação
sr-only+tooltip do rail fechado (`'ClubsClubs'` → `'Clubs'`).

**`navegacao-spa.test.tsx`** (1 falha paga): o inventário de
`botoesQueNaoSaoDestino` passou de textContent para `nomeAcessivel(b)`, e a entrada
do menu lateral declara os dois botões do rail: `['Abrir menu', '']`. A entrada
vazia é deliberada e documentada no próprio arquivo — o rodapé de perfil FECHADO só
contém o avatar `aria-hidden` e fica SEM nome acessível (dívida anexada na fila,
junto com a F5). As 5 asserções da tabela (contagem exata, preventDefault, href
interno, navegação viva, aria-current único) seguem intactas.

**`aviso-bloqueia.test.tsx`** (4 falhas pagas): `nomes()` e o espião de `focus()`
passaram a identificar por nome acessível; o inventário nominal da moldura foi
re-tirado para a anatomia real do rail — **9 focáveis**, na ordem do documento:

```
BUTTON:Abrir menu                      ← toggle do rail (1º tabbável, novo)
A:Visão Geral … A:Configurações        ← 6 âncoras (rótulo do span sr-only)
BUTTON:Abrir menu de navegação         ← hambúrguer do Drawer (lg:hidden esconde
                                          por CSS; a sonda mede DOM — era o antigo
                                          'BUTTON:' sem texto da lista da review)
BUTTON:Como receber o código Leela     ← CTA da vitrine
```

O rodapé do rail não aparece aí porque a conta em vitrine não tem displayName (sem
`footerName` o rail não desenha rodapé). Os expects continuam os mesmos: lista
nominal com `toEqual`, zero alcançável sob `inert`, foco de volta fora da subárvore
inerte (`A:Clubs` no espião). Zero skip/todo/expect removido — `grep` de
`.skip|.todo|.only` no diff: vazio.

Nota de evidência: o "…(8)" no erro da REV era "1 elemento + 8 restantes" — o
inventário real tem 9, confirmado por execução (a rodada intermediária imprimiu o
array com `+ "BUTTON:Abrir menu de navegação"`, exatamente o item que faltava).

## F3 · L-021 — CtaV3 consome o Button canônico

A forma do protótipo (largura cheia 48/44 com seta) nasceu no PRÓPRIO Button
(`packages/design-system/src/components/Button/variants.ts`):

- **sizes `cta` / `cta-sm`**: `h-[var(--v3-cta-h)]` (48) / `h-[var(--v3-cta-h-sm)]`
  (44), `w-full`, raio `--radius-md`, gap `--spacing-2-5`, tipografia base-plus
  bold / base (o semibold do neutro = `--btn-font-weight` 600, já na base). Sem px
  de propósito: o conteúdo centra na largura cheia, como o protótipo desenha.
- **variant `neutral`**: `--surface-high` + `--text-primary`, hover
  `--action-secondary-hover` (pressed reusa o hover, receita do ghost).
- **3 testes novos** em `Button.test.tsx` pinam as classes por token.
- `LLM.txt` atualizado (estava defasado desde antes: negava `size="icon"`, que
  existe no código desde o QA T3).

`CtaV3` (`apps/painel/src/components/CartaoV3.tsx`) virou consumidor puro: mapeia
`primario/neutro` → `primary+cta` / `neutral+cta-sm` e põe a seta. API pública do
CtaV3 intacta — Countdown e ComunidadeResumo não mudaram.

**escalate_if não disparou**: nenhuma mudança na API do Button além de variant/size
aditivos.

**Paridade de aparência** (o contrato são os 48/44 pinados — seguem pinados no DS):
estado de repouso byte-idêntico (mesmos tokens de cor, altura, raio, gap e fonte;
resolução twMerge base-vs-size verificada fora de suíte, classe a classe). Deltas
declarados, todos de ESTADO INTERATIVO e todos = adoção do cânone do Button:
focus-visible ganha `ring-offset-2` (mesma cor/2px), primário ganha
`active:--action-primary-pressed`, transition-colors ganha o easing
`--motion-easing-default`, `border-none` vira borda transparente de 1px (border-box
+ background sob a borda: pixels idênticos). `inline-flex` + `w-full` blockifica nos
dois consumidores (ambos flex-col) — layout idêntico.

## Gates — números reais

| Gate | Resultado |
|---|---|
| Suíte painel INTEIRA | **2444/2444** (229 arquivos) ✔ — era 2439/2444 na REV |
| Suíte DS completa | **1748/1748** (73 arquivos; 1745 + 3 novos do Button) ✔ |
| type-check | DS exit 0 ✔ · painel exit 0 ✔ |
| lint `--max-warnings 0` | DS exit 0 ✔ · painel exit 0 ✔ (leela-scroll em error) |
| generate-tokens 2× | árvore limpa nas duas rodadas (0 arquivos alterados) ✔ |
| hex/px no diff de componentes | 0 hex · 0 px fora de comentário ✔ |
| aviso-bloqueia isolado | 11/11 ✔ (confirmação de arquivo) |

## Commits (--only com pathspec explícito, pushed e64b8c47..11c1e4c7)

- `1e295a45` — test(painel): re-inventario da moldura do rail por nome acessivel
  [HIFI-REC-FIX-F1] · 3 arquivos (+87/−27)
- `11c1e4c7` — refactor(ds+painel): CtaV3 consome o Button canonico — forma CTA
  vira size/variant do DS [HIFI-REC-FIX-F3] · 4 arquivos (+92/−28)

## Servidor :4601 re-servido (F3 mudou byte servido)

- Rebuild: `vite build --mode leela-hub` → bundle novo `index-D_oCnNiR.js` +
  `index-DOOMP3tm.css` (antes `index-5qFgUt_e.js` / `index-B_tuXEAb.css`; o CSS
  muda porque as utilities novas do variant/size entram na folha — repouso
  idêntico).
- PID 23324 morto; **PID novo 8640**, MESMA porta 4601, mesmo
  `.maestro-logs/serve-4601.js`.
- :4599 (PID 25384, outro worktree) intocado.
- Prova de vida do renderizado: página recarregada no navegador — Visão Geral v3
  inteira no DOM (countdown com o CTA novo "Gerenciar evento", clubs, agenda,
  indicadores, em-breves honestos, ocupação, alertas) e console ZERO erros no load
  fresco. O screenshot de pixel da extensão falhou por bug de bindings do próprio
  Chrome extension (ambiental, não é a página); a conferência visual
  rail-fechado/aberto segue sendo a do maestro, como registrado no contrato da REV.

## F2 — regra de moldura, registrada como lei desta trilha

**Lane que toca moldura/shell (RootShell, AppShell, Sidebar/SidebarRail, qualquer
chrome do DS) valida a suíte COMPLETA do painel no gate — recorte nunca sela.** Foi
exatamente o buraco do B1: 638/638 verdes no recorte com 2439/2444 na branch.

## Fila de código anexada (ressalvas 2-4 da REV — registradas, NÃO consertadas)

1. **F4 · a11y** — tooltip do rail fechado é hover-only (`group-hover/item:`);
   teclado não o vê. Uma classe resolve: `group-focus-visible/item:opacity-100` +
   transform. Não bloqueia (protótipo também é hover-only; nome acessível está no
   `sr-only`).
2. **F5 · dívida de navegação** — o rodapé do rail navega para `/conta` por BUTTON
   (`onFooterClick` → navigate), a exceção que a tabela navegacao-spa existe para
   combater (sem ctrl+clique/copiar endereço). Virar âncora + onClick SPA.
   **Adendo desta lane**: fechado, esse botão também fica SEM nome acessível (o
   avatar é `aria-hidden` e não há mais nada dentro) — a entrada `''` no inventário
   do teste documenta as duas dívidas; ao consertar, dar nome E atualizar a entrada.
3. **F6 · a11y menor** — grade do calendário da Agenda usa `role="grid"` com botões
   diretos, sem `row`/`gridcell` nem navegação por setas (igual ao protótipo).
   Alinhar a ARIA quando a Agenda crescer.
