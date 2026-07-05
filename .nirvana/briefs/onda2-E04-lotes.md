# Onda 2 · E04-slim — Configuração & Vendas do Evento · brief de lotes

Recorte da spec original LEELA-E04 (que assume afiliação como coluna vertebral). Onda 2 revisada = **vender ponta a ponta sem afiliados** (decisões-escopo 2026-07-04, item "Sem afiliados neste início. Cupons sim.").

## Corte no topo (o que sai e por quê)

- **S301 inteiro — CORTADO.** Programa de afiliação, link master rastreável, atribuição por janela/teto, split para afiliado, convidar clube/promotor, tela Promotores, detalhe do afiliado. Contradiz decisão "Sem afiliados neste início". Infra de split plugável permanece só como desenho (ADR-006), sem UI e sem consumidor. E08 (promotor self-service) adiado; E12 perde S1204 (atribuição por link).
- **S302 (financeiro com repasses) — SAI de E04-slim → E09-slim.** A base financeira (bruto/taxa/líquido, breakdown, CSV) já existe em E03-S207 (feito: `functions/src/eventos/agregarFinanceiro.ts` + tela). A camada nova de S302 é **repasse/payout ao produtor**, que é exatamente o escopo do brief E09-slim (saque, dados bancários, retenção 15%, comprovante). Não reimplementar aqui.
- **S303 (comunicação do evento) — já era só redirect → E06.** Nada a fazer em E04.
- **S305 (política de reembolso/transferência/troca — config) e S306 (exigências de saúde LGPD + versionamento de regulamento) — NÃO listadas no recorte E04-slim.** São compliance greenfield que a spec anexou além do de-para BH. Deixo **fora de E04-slim** e como decisão em aberto para o consolidador (ver "Decisões pendentes" #4 e #5) — recomendo S305 casar com E09-S904 (dono da execução) e S306 casar com a coleta de checkout (E12). Se não realocados, o E12 herda defaults legais no seed (CDC 7d/48h) para não bloquear o checkout.
- **Cupom simplificado (decisão do Vitor):** desconto simples **sem vínculo com afiliado**. Atributos: tipo `percentual|valor`, **teto de desconto** (`tetoDesconto?` em R$ — cap para cupom percentual, campo novo vs. spec), **validade** (`validadeAte?`), **limite de uso** (`usosMax?`). Nenhum campo `afiliadoId`/`cupom→afiliado`. O cupom de S300 já era "desconto simples"; o corte é só não wireá-lo a afiliado (wiring vivia em S301/S302, cortados).

**FICA em E04-slim:** S300 completo (página de vendas + lotes + cupons simples + SEO), S304 completo (equipe + 4 papéis + custom claims por evento), e **PaymentProvider concreto** (escolha do gateway + adapter sandbox — a interface + mock já existem, ADR-006).

Regra 1 task = 1 commit atômico. Staging seletivo. Roteamento: **Fable** = Functions/rules/core-negócio/segurança/pagamento; **Opus** = telas painel (DS + api-client). **Paths Vite** (decisão da Onda 1): `apps/painel/src/routes/eventos/[slug]/...` — traduzir todo `app/.../page.tsx` da spec (Next) para `src/routes/` (react-router).

---

## Lote E04-L1 · Página de vendas + lotes + cupons (dados & regras) — FABLE
- Tasks: **S300-T1** (data-model `paginaVendas` + `lotes` + `cupons` simples + tipos + Rules + seed) → 1 task
- Superfície: `packages/core/src/eventos/{paginaVendas,lote,cupom}.ts`, `packages/api-client/src/eventos/paginaVendas.ts`, `functions/firestore.rules` (bloco `paginaVendas`/`lotes`/`cupons`), `functions/seed/paginaVendas.seed.ts`
- Dep: E03-S200-T1 (Evento, feito), E03-S205-T1 (Kits, feito). **Bloqueia L2 e L3.** Rules reusam helpers multi-tenant `isTenantMember`/`isPlatformAdmin`/`tenantAtivo` (S1600, feito).
- Aceite: `Lote.precosPorPercurso` dá preço próprio por modalidade (5k/10k/21k) — RN-301; `codigo` de cupom duplicado no mesmo evento → escrita rejeitada; cliente tentando escrever `qtdVendida`/`usosFeitos` → Rule nega (só Function); cupom percentual 10% com `tetoDesconto=50` → derivação pura limita desconto a R$ 50; tipo `Cupom` **não tem** campo `afiliadoId` (grep prova ausência de acoplamento); `SecaoPagina` do tipo `checkout` é `travada:true`; `SeoPagina.urlAmigavel` derivada de `{DOMINIO_LEELA}/{slug}` sem hardcode `be-hero.com.br`/`beh.ro`; seed cria 8 seções canônicas (Checkout travado) + 2 lotes (early bird + regular) + 2 cupons simples (sem vínculo afiliado).

## Lote E04-L2 · Virada de lote + preço vigente + guard de preço — FABLE
- Tasks: **S300-T2** (Function `virarLote` cron+onWrite; `precoVigente` core puro; `guardPrecoLote` RN-200) → 1 task
- Superfície: `functions/src/eventos/{virarLote,guardPrecoLote}.ts`, `packages/core/src/eventos/precoVigente.ts`, `functions/firestore.rules` (guard)
- Dep: E04-L1, E03-S201-T3 (bloqueio de preço, feito). Bloqueia L3 (modais consomem preço vigente/bloqueio).
- Aceite: lote `qtdLimite=100` + 100ª venda confirmada → lote `encerrado` e próximo por `ordem` vira `ativo` (RN-300); lote com `dataVirada` no passado + cron → `encerrado`; evento com ≥1 venda → mutação de preço de lote negada no servidor (RN-200); `loteVigente(lotes, agora, vendas)` e `precoDoPercurso(lote, modalidade)` puros, testados nos limites de data e de quantidade; `virarLote(eventoId)` idempotente (reexecução não pula lote nem duplica encerramento).

## Lote E04-L3 · Editor da página de vendas + modais (lote/cupom/percurso) — OPUS
- Tasks: **S300-T3** (editor conteúdo: seções web/app + SEO + publicar/despublicar), **S300-T4** (LoteModal), **S300-T5** (CupomModal simplificado), **S300-T6** (PercursoModal) → 4 tasks
- Superfície: `apps/painel/src/routes/eventos/[slug]/pagina-vendas/{page.tsx,_components/*}` (SecaoCard, GrupoSecoes, SeoCard, LoteModal, CupomModal, PercursoModal)
- Dep: E04-L1 (dados), E04-L2 (preço vigente/bloqueio p/ modais), E03-S202-T1 (header 96px §2.1 + sub-nav §2.14), E01 (DS: Toggle, Card, Modal, Toast, ConfirmModal).
- Aceite: editor mostra 3 grupos (Essenciais web+app · Só landing pública · Sistema) e a seção Checkout **travada, não desativável**; desativar seção → esmaece + persiste; card SEO salva e a URL amigável read-only usa `{DOMINIO_LEELA}` (nunca `be-hero.com.br`); "Despublicar" → `ConfirmModal` §2.15 → estado vira rascunho + Toast "Página despublicada"; LoteModal com critério `quantidade` mostra campo limite e **oculta** o de data (RN-300); campo de preço **desabilitado + aviso** quando evento já tem venda (RN-200); CupomModal: `codigo` duplicado → erro inline (unicidade por evento), percentual fora de 0–100 → bloqueia, `tetoDesconto`/`validadeAte`/`usosMax` opcionais persistem, remover cupom via §2.15; PercursoModal grava preço independente por percurso (RN-301); todos os modais fecham por 4 vias (cancelar/X/overlay/Esc); estados §2.12 (skeleton, nunca spinner solto).

## Lote E04-L4 · Equipe + 4 papéis + custom claims (backend) — FABLE
- Tasks: **S304-T1** (core `equipe` + matriz `podeAcessar` + Function `setClaimsEquipe` + Rules por papel + seed) → 1 task
- Superfície: `packages/core/src/eventos/equipe.ts`, `packages/api-client/src/eventos/equipe.ts`, `functions/src/eventos/setClaimsEquipe.ts`, `functions/firestore.rules` (bloco `equipe` + autorização por papel nas coleções do evento), seed de equipe
- Dep: E03-S200-T1 (Evento, feito), E00 (Auth/claims, feito). **Independente de L1/L2/L3** — roda em paralelo à trilha de vendas. Bloqueia L5. **Reusa o padrão de merge de `mergeTenantClaims`** (`functions/src/platform/setTenantClaims.ts`) para não sobrescrever claims de tenant nem de outros eventos.
- Aceite: `type PapelEvento = 'organizador'|'administrador'|'operador'|'financeiro'` (RN-320); matriz pura `podeAcessar(papel, area)` **exportada como API pública de `@leela/core`** (E07-web T6 importa dela) cobre 4 papéis × 7 áreas (pagina_vendas, comunicacao, financeiro, entrega, inscritos, configuracoes, equipe — `promotores` da spec sai com a afiliação; `comunicacao` entra porque E06 adiciona a aba nesta onda), testada célula a célula; Operador de balcão lendo Financeiro → Rule nega; Financeiro lê financeiro → permite, edita página de vendas → nega; trocar papel de um membro → claims `{ eventos: { [eventoId]: papel } }` refletem sem apagar claims de outro evento (merge preservador); remover membro → claims do evento revogados; agregado/financeiro nunca escrito pelo cliente.
- **Consumidor a jusante:** E07-web (403 casado com papéis — decisões item 9) e E05 (aceite de parceria) leem esta matriz/claims. Manter `podeAcessar` como fonte única.

## Lote E04-L5 · Telas Configurações gerais + Equipe & permissões — OPUS
- Tasks: **S304-T2** (Configurações gerais), **S304-T3** (Equipe & 4 papéis) → 2 tasks
- Superfície: `apps/painel/src/routes/eventos/[slug]/configuracoes/{page.tsx,equipe/*,_components/*}` (ConfigGeraisForm, EquipeLista, ConvidarMembroModal)
- Dep: E04-L4 (claims/matriz), E03-S202-T1 (layout), E01 (DS).
- Aceite: salvar `usaChip=false` → balcão do E03 suprime o passo de chip (RN-207); URL pública read-only usa `{DOMINIO_LEELA}`; papel sem permissão tentando salvar → bloqueado na UI **e** na Rule; trocar papel via select → `setClaimsEquipe` + Toast; convidar membro (email + papel) → membro `convidado`; remover membro → `ConfirmModal` §2.15 com preview ("perde acesso a…") → claims revogados + Toast; EmptyState quando só há o Organizador; só Organizador/Administrador gerem equipe (gate); estados §2.12; flat §2.16.

## Lote E04-L6 · PaymentProvider concreto: DI seam + adapter sandbox — FABLE
- Tasks: **E04-PAY-T1** (DI seam `payments/index.ts` + suíte de conformance provider-agnóstica), **E04-PAY-T2** (adapter concreto do gateway escolhido, contra sandbox) → 2 tasks
- Superfície: `functions/src/payments/{index.ts,`\``{provider}Adapter.ts`\``}`, config/env de seleção de provider; **não** toca domínio (`packages/core` só tem a interface, já pronta).
- Dep: E00 + interface `PaymentProvider` + `mockProvider` (ambos feitos, ADR-006). **Independente de afiliação** (split-to-afiliado cortado). **E04-PAY-T2 é GATED** na escolha de gateway do Vitor (ver Decisões pendentes #1).
- Aceite T1 (roda hoje, sem gateway escolhido): selecionar `mock` por env → retorna `mockProvider`; suíte de conformance verde contra o mock — `handleWebhook` com assinatura inválida rejeita **antes de qualquer escrita**, mesmo `idempotencyKey` reprocessado → mesmo resultado sem duplicar (RN-333), `refund` total retorna `RefundResult`; nenhum segredo de gateway vaza para o cliente.
- Aceite T2 (após decisão): o `{provider}Adapter` passa a **mesma** suíte de conformance contra o sandbox do gateway; `createCharge` PIX retorna `qrCode`/`paymentUrl`; `refund` funciona; provider selecionável por env sem tocar o domínio.
- **V1 = mock para repasse.** Decisão item 4 dos escopos: repasse/saque é **registro** ("pago" sem transferência bancária real). Logo `getPayout`/`splitRules` do adapter concreto ficam **stub/sandbox** em V1; a cobrança real (`createCharge`/`handleWebhook`/`refund`) é o que o E12 consome. Documentar essa fronteira no adapter.

---

## Sequência interna E04-slim
`L1 → L2 → L3` (trilha vendas) ∥ `L4 → L5` (trilha equipe) ∥ `L6` (trilha pagamento). As três trilhas são paralelas após E04-L1 destravar; L4 e L6 não dependem de L1. L6-T2 fica em espera até a decisão de gateway.

## Paralelismo entre épicos (Onda 2)
- Telas de E04 (`routes/eventos/[slug]/{pagina-vendas,configuracoes}`) não colidem com E12 (`apps/landing`), E06 (`routes/.../marketing`) nem E09-slim (`routes/.../financeiro` já existe de E03) → paralelo.
- **Barreiras compartilhadas:** `functions/firestore.rules` (L1 add `paginaVendas`/`lotes`/`cupons`; L4 add `equipe` + autorização por papel — usar `.rules-mutex`, reler do disco ao adquirir, mesma disciplina da Onda 1); `packages/core/src/index.ts` (barrel — `.index-mutex`); `functions/firestore.indexes.json` (cupom por `codigo`; lote por `ordem`); **`apps/painel/src/routes/eventos/_lib/subnav.ts`** (E04-L3 adiciona a aba "Página de vendas" e E04-L5 a aba "Configurações"; E06-L3 adiciona "Comunicação" no MESMO arquivo — ordem canônica do consolidador: **E04 primeiro, E06 depois**, cada épico só acrescenta sua entrada sem reordenar as existentes).
- **E12 é o consumidor crítico:** lê `paginaVendas` (render), `lotes`+`precoVigente` (preço no checkout), `cupons` (aplicação/validação do cupom no checkout — `usosFeitos` incrementado lá, não aqui) e o adapter de pagamento (L6). E04-L1 e E04-L6 são pré-requisito de E12.

## Riscos / entidades compartilhadas
- **Cupom** nasce em E04-L1 e é **aplicado** em E12 (checkout). E04 só faz CRUD + Rules; incremento de `usosFeitos` e resolução de desconto no carrinho são de E12. Manter a derivação de teto/validade/limite pura em `core` para E12 reusar.
- **Claims por evento** (E04-L4) alteram o token do usuário; coordenar com claims de tenant (S1600) via merge preservador — nunca `set` cru. E07-web depende dessa matriz para o 403.
- **`{DOMINIO_LEELA}`** é placeholder em todo slug/URL/link — código usa a constante, não bloqueia build, mas SEO/URL pública fica "a definir" até o Vitor nomear o domínio (Decisão #2).
- **Gateway concreto (L6-T2)** tem lead time de negócio (KYC/contrato/taxas) — análogo ao registro OAuth da Strava. O adapter roda em sandbox até fechar; o executor **deve validar a API atual do gateway (split, PIX, assinatura de webhook) contra a doc oficial** antes de codar.

## Decisões pendentes (para consolidador / Vitor)
1. **Gateway concreto — qual? (bloqueia E04-PAY-T2, decisão de negócio do Vitor.)** Recomendação: **Asaas** para a V1 — PIX/boleto/cartão parcelado nativos, split de pagamentos, subcontas, e um modelo de saldo/saque que espelha o UX de E09-slim (organizador vê disponível para saque, solicita repasse); onboarding/KYC mais leve para estágio inicial. Alternativa **Pagar.me v5** (recebedores + split + antecipação nativos, Stripe-owned) quando split/payout real entrar pós-V1; **Stripe Connect** só se houver tese internacional (PIX/boleto em BR é mais imaturo). Como V1 mantém repasse como registro (mock), a escolha pode priorizar a **cobrança** (createCharge) e ser fechada em paralelo ao build de L1–L5.
2. **`{DOMINIO_LEELA}`** — nome do domínio público Leela (substitui `be-hero.com.br`/`beh.ro`). Não bloqueia código (constante), bloqueia go-live de SEO/links. Decisão do Vitor.
3. **Estrutura de `firestore.rules` — RESOLVIDO (consolidador, 2026-07-05): arquivo único + `.rules-mutex` (disciplina da Onda 1), sem split por include.** A trilha Fable da Onda 2 é serial (ver `onda2-decisoes.md`), então L1 e L4 nunca concorrem de fato; a ordem canônica de edição do arquivo está no doc de decisões.
4. **S305 — RESOLVIDO (consolidador, 2026-07-05): vai para a Onda 3, junto com S904.** A recomendação original (casar com E09-S904) era circular: o brief E09-slim corta S904 explicitamente para a Onda 3. Config + execução de reembolso ficam juntas lá. Na Onda 2, a landing (E12) exibe a política padrão CDC como **conteúdo estático** na seção Info/FAQ (arrependimento 7d — Art. 49), sem coleção de config nova.
5. **S306 — RESOLVIDO (consolidador, 2026-07-05): vai para a Onda 3.** A coleta de compliance do checkout (E12-S1207: contato de emergência + aceite de regulamento ≠ LGPD) já entra nesta onda e não depende de S306; `regulamentoAceite.versao` usa `evento.regulamentoVersao ?? 1` até o versionamento pleno existir.
6. **Escopo do "PaymentProvider concreto" — RESOLVIDO (consolidador, 2026-07-05): adapter em sandbox AQUI (L6), como este brief planeja.** De-risca E12; go-live gated na decisão de gateway do Vitor (#1).
