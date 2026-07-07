# Enriched brief — FID-EVT sub-lote 3: HUB DE EVENTOS (híbrido, ancorado no JOB)

> Trace: leela-build-2d6ee98d · Banner: LEELA-FID-EVT · Modelo: Opus · Alvo: sf-frontend-engineer

## JOB — alvo primário
- **Persona:** Organizador. **JTBD (S200):** "ver todos os meus eventos num hub com **KPIs globais**, **para abrir RAPIDAMENTE o evento que quero gerenciar**." → o hub é ferramenta de TRIAGEM veloz + acesso.
- **Critérios S200 (spec primário):** (1) card/linha por evento com status + KPIs globais consolidados; (2) clicar → navega ao Overview do evento; (3) zero eventos → EmptyState com CTA "Criar evento"; (4) "+ Novo evento" → criação.

## DECISÃO DO VITOR: HUB HÍBRIDO
Trocar os cards grandes de foto por **linhas densas** com: **thumb pequena da foto** (reconhecimento) + nome + status + **métricas inline** (inscritos / receita / vagas) + "Gerenciar" + menu. Serve a triagem veloz do S200 sem perder o realismo da imagem. (O EventRow do DS já é linha densa com thumb por modalidade — REUSAR/estender p/ aceitar thumb de foto + métricas inline, não criar do zero. Grep antes.)

## CORREÇÕES DO JOB AO MOCKUP (aplicar)
- **MANTER a faixa de KPIs globais.** A auditoria marcou como "existe no vivo, não no mockup" — mas a S200 pede EXPLICITAMENTE "hub com KPIs globais consolidados". A story vence: a faixa FICA (é o "como vai meu negócio" do Organizador). Não remover por fidelidade ao mockup.
- **Filtro de status** (Todos/Ativos/Encerrados/Rascunhos) — faceta única de baixa cardinalidade → chips/segmented em UMA linha (design-principles + L-005: nada de empilhar chrome; a lista de eventos domina).

## DIRETRIZES (permanentes)
- **JOB primeiro; mockup = aparência.** Cada decisão traça a um critério S200. Divergiu? story vence (KPIs globais são o exemplo).
- **L-005 (chrome no agregado):** o hub é lista de informação — filtro compacto (1 linha), a densidade das linhas domina. Não repetir o erro dos 11 chips.
- **Reuso-first:** EventRow (thumb + densidade), o `useQuery` de eventos já migrado (UX-DADOS T4), Select/Chip/Badge do DS, `thumbVariantDoEvento`, as fotos do seed (`imagemUrl`). Componente/padrão novo → documentar no showroom no ato.
- Autoridade de uso: `~/.claude/skills/harness/references/design-principles.md`.

## GATE (provar ao vivo)
Screenshot 1440×900 do hub vivo (`/eventos?preview=castelo`) vs `WEB-APPV2 (1)/Meus Eventos.html`: linhas densas híbridas + KPIs globais + filtro de status compacto + clique navega. Evidência `outputs/leela-build-2d6ee98d/fidelidade-eventos/hub-pass-*` (+ baseline antes). adr-conformance: `useQuery` (não fetch cru). Suíte em blocos + tsc 0 + ESLint no-hardcoded 0 + build limpo. Review antagonista antes de eu fechar. 1 task = 1 commit `[LEELA-FID-EVT-HUB-T*]`, trailers, push. `functions/src` read-only. Relatório em `outputs/leela-build-2d6ee98d/FID-EVT-HUB-REPORT.md`; atualize KANBAN/CHECKLIST.

RETORNO: hashes; reuso vs novo (EventRow estendido?); mapa decisão→critério-S200; contagem de chrome do filtro; gate vivo (evidência); adr-conformance; testes/tsc/ESLint. NÃO faça outras telas (Financeiro/Kits/Entrega).
