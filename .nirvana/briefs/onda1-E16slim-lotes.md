# Onda 1 · E16-slim — Plataforma & Super-Admin · brief de lotes

Recorte V1-slim = **10T** (Kanban "dep S1600"). **S1600 já FEITO** (3/3T: `core/platform/{roles,tenant}.ts`, `functions/src/platform/setTenantClaims.ts`, Rules de isolamento). Os 10T = **S1601(T1–T4) + S1602(T1–T3) + S1605(T1–T3)**. Dep: E00, E01. Consumidores futuros: E04 (checkout) e E09 (split) leem `commercialTerms`.

Roteamento: **Fable** = Functions/rules/core/claims/segurança (quase todo o épico); **Opus** = telas back-office. 1 task = 1 commit.

## Lote E16-L1 · Backend da plataforma — FABLE
- Tasks: S1601-T1 (`provisionTenant` atômico), S1601-T2 (lifecycle `activate/suspend/reactivate`), S1602-T1 (`commercialTerms/current` + tipos + Rules), S1602-T3 (contrato de consumo E04/E09 — `termsProvider`), S1605-T1 (`platform/rollups` + Rules), S1605-T2 (agregação macro cross-tenant)
- Superfície: `functions/src/platform/*`, `packages/core/src/platform/{provisioning,commercialTerms,termsProvider}.ts`, `packages/api-client/src/platform/*`, `functions/firestore.rules`, `functions/seed/commercialTerms.seed.ts`
- Dep: S1600 (feito). Ordem interna: S1601-T1←(S1600-T1/T2); S1601-T2←S1601-T1; S1602-T3←S1602-T1; S1605-T2←S1605-T1+S1602-T3.
- Aceite: `provisionTenant` cria `tenants/{id}` ativo + `profissionais/{owner}` + claims `tenant_owner`/`tenantId` **atomicamente**; falha ao setar claim → rollback total (RN-403); só `platform_admin` invoca; `canTransition('pending','ativo')`=true, `('pending','suspenso')`=false (RN-402); suspender preserva dados; `tenant_owner` não escreve `commercialTerms` (Rule nega), lê read-only (RN-404); `saasMonthlyFee=0` aceito (RN-405); E09 `computeTaxa` usa 10,5% do termo do tenant, não constante (RN-406); 2 tenants c/ taxas distintas → cada checkout usa a sua (isolamento econômico); rollups (`gmvTotal`, `receitaLeelaTotal`, `tenantsAtivos`, saúde por tenant) só `platform_admin` lê / só Function escreve (RN-409), idempotentes.
- **Verificar antes de despachar S1601-T2**: `functions/src/platform/tenantLifecycle.ts` (106 linhas) já existe — confirmar se está completo/testado para evitar retrabalho.

## Lote E16-L2 · Telas de tenants (back-office) — OPUS
- Tasks: S1601-T3 (lista de tenants: tabela densa §2.5 + filtros + saúde), S1601-T4 (detalhe + provisionar/aprovar/suspender via ConfirmModal §2.15)
- Superfície: `routes/plataforma/tenants/*`, `routes/plataforma/_components/PlatformShell.tsx` (sidebar própria: Tenants, Termos, Billing, Macro)
- Dep: S1601-T1/T2 (L1) + E01 (Shell, Table densa, ConfirmModal)
- Aceite: usuário sem claim `platform_admin` → 403 (não a lista); filtro por `pending` → só "Passo Certo" + contador atualiza; filtro sem match → EmptyState do glossário; aprovar `pending` → ativo + Toast; "Suspender" → ConfirmModal c/ preview (bloqueado: novas vendas/publicações × preservado: dados/membros/histórico) → status `suspenso`; suspenso → card crítico border-left Vulcão + ação "Reativar"; ações sempre via Function (nunca status direto no cliente).

## Lote E16-L3 · Termos comerciais & Macro (telas) — OPUS
- Tasks: S1602-T2 (editor de termos por tenant), S1605-T3 (dashboard macro: KPIs + saúde por tenant)
- Superfície: `routes/plataforma/tenants/[tenantId]/termos/*`, `routes/plataforma/macro/*`
- Dep: S1602-T1 (L1, dados/Rules), S1605-T1/T2 (L1, rollups)
- Aceite: `platform_admin` salva `platformFeePct=10.5` → persiste + Toast; `tenant_owner` abre a tela → read-only sem botão salvar (RN-404); `saasMonthlyFee=0` → aceito + aviso "Produtor isento de mensalidade SaaS" (RN-405); `anticipation` como campo c/ badge "disponível em breve" (RN-410, mecânica pós-V1); dashboard macro mostra GMV total, receita Leela por tenant, nº tenants ativos e saúde — tudo de `platform/rollups` (nunca varrido no cliente); estados §2.12 + flat §2.16.

## Sequência interna E16-slim
`L1 → (L2 ∥ L3)`. L2 e L3 paralelos após L1 (telas independentes: tenants vs termos/macro).

## Paralelismo entre épicos
- Telas em `routes/plataforma/*` isoladas de E03/E05/E02 → full paralelo.
- **Barreira = `functions/firestore.rules`**: E16-L1 adiciona regras de `tenants`, `commercialTerms`, `rollups` no mesmo arquivo que E03-L1/E05-L1. Coordenar (ver decisão #3 do brief E03).
- E16 **não bloqueia** E03/E05/E02 na Onda 1 (isolamento S1600 já aplicado às coleções de domínio). Pode rodar **em paralelo total** com eles.

## Riscos / entidades compartilhadas
- **Tenant** nasce aqui (S1601-T1) mas o isolamento (`tenantId` nas coleções de E03/E05) **já foi aplicado por S1600-T3** (feito). E03/E05 só precisam manter o predicado `tenantId` nas Rules novas — reusar helpers `isTenantMember`/`isPlatformAdmin`/`tenantAtivo`.
- `commercialTerms.platformFeePct` vira **fonte** de RN-330 (E09) e do split (E04). Como E04/E09 são Ondas 2+, S1602-T3 entrega o contrato (`termsProvider`) sem consumidor ativo ainda — aceite testado via `computeTaxa` unit + emulator, não via checkout real.
- `platform_admin` (o Vitor) precisa de claim setada manualmente no ambiente para exercitar as telas — prever seed/script de bootstrap do admin.

## Decisões pendentes
1. **Vite vs Next.js**: spec cita `apps/painel/app/plataforma/...page.tsx`; código real é Vite `apps/painel/src/routes/`. Traduzir para `src/routes/plataforma/*`. Bloqueia L2/L3.
2. **tenantLifecycle.ts pré-existente**: confirmar estado (stub vs completo) antes de S1601-T2; o Kanban marca só S1600 feito, mas o arquivo já está no repo.
3. **Bootstrap do `platform_admin`**: definir como a 1ª claim `platform_admin` é criada (script/seed manual) — sem ela nenhuma tela/Function de plataforma é exercitável.
4. **Estrutura de `functions/firestore.rules`** compartilhada — mesma decisão dos outros épicos.
