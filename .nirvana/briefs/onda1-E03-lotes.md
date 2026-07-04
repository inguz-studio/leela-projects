# Onda 1 · E03 — Operação do Evento · brief de lotes

Recorte V1 = **20T = S200–S207** (Kanban). S208 (QR/check-in), S209 (tamanho), S210 (aprovisionamento) são extensões da spec além dos 20 — ver "Decisões pendentes". Dep: E01 (feito/em fix), E00 (feito).

Regra 1 task = 1 commit atômico. Roteamento: **Fable** = Functions/rules/core-negócio/segurança; **Opus** = telas painel (DS + api-client).

## Lote E03-L1 · Dados & regras do evento — FABLE
- Tasks: S200-T1, S203-T1, S205-T1 (3 data-models; dep só entre si via S200-T1)
- Superfície: `packages/core/src/eventos/*`, `packages/api-client/src/eventos/*`, `firestore.rules`, `functions/src/seed/*`
- Dep: E00. **Bloqueia todo o resto do épico** + E02.
- Aceite: query `eventos where organizadorId==uid` só retorna do owner; cliente não escreve `qtdInscritos`/`receitaConfirmada` (Rule nega); `inscritos` paginado por cursor 18/pág (453 seed); `kit ∈ {kit_ouro,kit_prata,kit_basico,sem_kit}`; item em 2 kits lista "usado em" os 2 (RN-215); "Sem kit" preço negativo persiste (RN-211).
- Rules DEVEM reusar helpers multi-tenant de S1600-T3 (`isTenantMember`, `isPlatformAdmin`, `tenantAtivo`) — já existem (S1600 feito).

## Lote E03-L2 · Functions transacionais — FABLE
- Tasks: S201-T2 (criar/publicar+slug+QR), S201-T3 (guard preço RN-200), S204-T2 (chip/presença), S207-T2 (agregado financeiro)
- Superfície: `functions/src/eventos/*`, `packages/core/src/eventos/{entrega,precoBloqueado}.ts`, `packages/api-client/src/eventos/mutations.ts`, `firestore.rules`
- Dep: E03-L1 (S201-T2←S200-T1; S201-T3←S201-T2+S203-T1; S204-T2←S203-T1; S207-T2←S203-T1)
- Aceite: publicar rascunho completo → `{url:beh.ro/slug, qrUrl}` + status `publicado` (RN-201); `criarEvento` rejeita input inválido (valida no servidor); evento c/ venda → update de preço negado no servidor e UI (RN-200); chip livre grava, chip em outro atleta sem flag → `{conflito}`, com flag reatribui (RN-206); `registrarEntrega` idempotente = presença (RN-205); `usaChip=false` suprime chip (RN-207); agregado financeiro bruto/taxa/líquido idempotente.

## Lote E03-L3 · Navegação, criação e overview — OPUS
- Tasks: S200-T2 (hub `/eventos`), S201-T1 (form Novo Evento), S202-T1 (layout header 96px + sub-nav §2.14), S202-T2 (dashboard Overview)
- Superfície: telas painel `routes/eventos/*` (ver decisão Vite); consome DS + api-client
- Dep: E03-L1 (dados) + E01. S202-T2←S202-T1.
- Aceite: hub mostra card por evento c/ status + navega ao Overview; zero eventos → EmptyState + CTA; form dados válidos → rascunho + Toast, campo vazio → erro inline sem submit; qualquer rota do evento mostra header+sub-nav c/ aba ativa; Overview KPIs batem com agregado (453 / R$ 85.617) + alertas + atividade; skeleton no load.

## Lote E03-L4 · Inscritos & Balcão — OPUS
- Tasks: S203-T2 (tabela densa §2.5 + 4 tabs §2.7 + slide-in), S204-T1 (balcão 60/40 + 3 passos), S204-T3 (galeria de estados §2.9)
- Superfície: `routes/eventos/[slug]/{inscritos,entrega}/*`
- Dep: S202-T1 (L3), S203-T1/S205-T1 (L1), S204-T2 (L2)
- Aceite: 453 inscritos → ~18 linhas + paginação + contador "mostrando X de Y"; busca "Marina" filtra e atualiza contador; filtro sem match → EmptyState; clique linha → slide-in; `sem_kit` → passo 1 concluído; `usaChip=false` → sem passo chip; atendimento fechado → presença + Toast; 5 estados (vazio/sem-kit/completo/conflito/fora-janela) em galeria dedicada, nunca empilhados (RN-208); conflito chip → ConfirmModal §2.15 c/ preview.

## Lote E03-L5 · Kits & Financeiro (telas) — OPUS
- Tasks: S205-T2 (Cadastro kits), S205-T3 (modal item), S205-T4 (Distribuição+Estoque), S206-T1 (editar kit tela cheia), S206-T2 (nomenclatura "kit" i18n), S207-T1 (Financeiro + export CSV)
- Superfície: `routes/eventos/[slug]/{kits,financeiro}/*`; S206-T2 toca glossário/i18n do E01
- Dep: S205-T1 (L1), S202-T1 (L3), S201-T3 (L2, p/ bloqueio de preço em S206-T1), S207-T2 (L2, p/ dados financeiro)
- Aceite: 4 kits (incl. "Sem kit") + catálogo c/ "usado em" + badges tipo/origem; item patrocinado → bloco marca + toggle logo (RN-214), organizador → sem toggle; rodapé 3 cards resumo; edição kit c/ 2 pontos de entrada (RN-217); "kit" nunca "tier" em toda copy (RN-216); financeiro legível + CSV exportável.

## Sequência interna E03
`L1 → (L2 ∥ L3) → L4 → L5`. L2 e L3 paralelizáveis (Functions vs telas de navegação) após L1. L4 exige L2+L3. L5 exige L1+L2+L3.

## Paralelismo entre épicos (E03 vs E05 vs E02 vs E16)
- Telas: E03 (`routes/eventos`), E05 (`routes/clubs`), E16 (`routes/plataforma`), E02 (`routes/(overview)`) — **zero conflito, full paralelo**.
- **Barreira única = `firestore.rules`** (arquivo compartilhado): E03-L1, E05-L1, E16-L1 escrevem regras no mesmo arquivo. Serializar ou modularizar por bloco de coleção. Ver decisão #3.
- `functions/src/seed/*` também compartilhado (arquivos separados por coleção → baixo risco se um seed por task).

## Riscos / entidades compartilhadas
- **Evento** nasce em E03-S200-T1 → consumido por E02 (dashboard), E05 (S105/S107 vínculo de evento), E16 (rollups leem `eventos.tenantId`). **E03-L1 é primeiro-movedor global.**
- **Inscrito** nasce em E03-S203-T1 → consumido por E02 (últimas inscrições) e financeiro.
- Rules das coleções de evento DEVEM carregar `tenantId` coerente com S1600-T3 (feito).

## Decisões pendentes
1. **Vite vs Next.js (bloqueante p/ toda tela).** Spec cita `apps/painel/app/**/page.tsx` (Next App Router); o código real é **Vite + `apps/painel/src/routes/`**. Recomendação: adotar `src/routes/eventos/...` e traduzir os paths da spec; confirmar router (react-router). Decidir antes de L3/L4/L5.
2. **Escopo dos 20T.** Adotar S200–S207 como os 20T da Onda 1; S208/S209/S210 ficam em lote de extensão pós-núcleo. S209-T3 toca checkout E12/E13 (Ondas 2/3) → não fecha na Onda 1 de qualquer modo.
3. **Estrutura de `firestore.rules`.** Definir dono/ordem ou split por include para evitar conflito entre lotes Fable paralelos.
