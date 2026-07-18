# DECISOES-NECESSARIAS-onda3 · O que a Onda 3 aguarda do Vitor

> PROPOSTA revisável. A rodada de decisões de **2026-07-17** já ratificou E17/E18 (numeração, JTBD, link-in-bio público na Onda 3, `@handle` imutável), os blocos RN-160-167/360-365, RN-304/S307 e ADR-013/014/015. Por isso **sobra pouca decisão genuína** — quase tudo abaixo é **ação externa** (destrava go-live, não bloqueia código) ou **premissa** (default em vigor). Só **DN-1** é decisão de produto real.
> Nada abaixo bloqueia o plano: todos rodam com default defensável em vigor.

---

## ✅ DN-1 · RATIFICADA pelo Vitor (2026-07-17): link-in-bio na Onda 3 = ORGANIZADOR-ONLY

**Decisão.** A recomendação abaixo foi ratificada: Onda 3 entrega o link-in-bio do **organizador** com editor de perfil mínimo no painel (`DN-1-T1`); perfil/tema do atleta sobe na Onda 4 com o app E13. Premissa P6 vira decisão. Registrada também em `leela-specs/DECISOES-ABERTAS.md` §Ratificadas.

### (histórico da decisão — contexto e recomendação originais)

**Contexto.** O E17 tem duas fatias: a pública (S1700, `@handle` SSR/ISR na landing) entra na Onda 3; a in-app (tema por-usuário, feed-write) entra na Onda 4 com o app E13. Mas o **editor de perfil** (escolher `@handle`, bio, visibilidade — RN-160/161) só está especificado como **tela in-app** (S1701, Onda 4). Ou seja: `S1700` renderiza o perfil público, mas **quem cria/edita o `perfis/{handle}` na Onda 3?** O organizador vive no **painel** (web); o atleta só ganha superfície de edição com o **app** (Onda 4). Sem um editor na Onda 3, `S1700` não tem `perfis` com dado real para renderizar.

**Recomendação (CTO/UX).** **Onda 3 = link-in-bio do ORGANIZADOR**, com um **editor de perfil mínimo no painel** (`DN-1-T1`: `@handle` imutável RN-160 + bio/visibilidade RN-161, reusando os forms do painel; sem accent/tema, que é RN-162/Onda 4). O **perfil do atleta** (e o editor de tema por-usuário) sobe na **Onda 4**, junto do app E13 — coerente com o E17 já colocar a fatia in-app lá. Razão: o organizador é a persona primária do link-in-bio (o link que vai na bio agrega os eventos que ele organiza); dar ao atleta um handle na Onda 3 exigiria uma superfície de edição web que o produto não tem hoje (o atleta é mobile-first, app). Fowler: entregar a fatia com o menor acoplamento; DHH: não construir a tela web do atleta que a gente não quer que exista (o atleta edita no app).

**Impacto.** Adiciona `DN-1-T1` (editor de perfil no painel) ao Lote 2 e trava o alcance da fatia pública em **organizador-only** na Onda 3. **Se o Vitor preferir** incluir o atleta já, é preciso decidir onde o atleta escolhe o handle na Onda 3 (uma tela web de onboarding de atleta, fora do app) — custo e superfície novos. **Recomendo organizador-only.** Premissa em vigor até decidir: P6 (`ROADMAP-onda3.md §11`).

---

## 🟠 Ações externas suas (destravam código pronto, não bloqueiam o plano)

**A1 · Enrollment das lojas + conta EAS (destrava o app E13-slim).** O `S1300-T2` (EAS Build/Submit) precisa de **Apple Developer Program** (US$99/ano, com lead time de aprovação) + **Google Play Console** (US$25 único) + conta **EAS/Expo**. É lead time de negócio, como o KYC do Asaas — **comece agora, em paralelo**, para não bloquear o Lote 5 (sequenciado por último exatamente por isso). O código do app (S1300-T1, S1302, telas) roda no simulador/dev sem o enrollment; só o **build/submit publicável** depende dele.

**A2 · `{leela-domain}` público (destrava SEO + link-in-bio).** Todo slug/URL usa o placeholder `{leela-domain}` (já em `DECISOES-ABERTAS §12`). O canonical do SEO (S1205) e a URL `{leela-domain}/@{handle}` do perfil (S1700) precisam do domínio real para produção. **Não bloqueia** o código (placeholder em vigor); bloqueia só os links de produção.

**A3 · EmailProvider real (destrava o convite da assessoria).** O `S1801` dispara o convite via `EmailProvider` — sandbox até existir o fornecedor real (Resend/SendGrid + ADR própria, já em `DECISOES-ABERTAS §13`). O fluxo roda em sandbox; o disparo físico entra quando o provider existir.

---

## 🟡 Premissas assumidas (defaults defensáveis em vigor — ratificar = confirmar)

Detalhadas em `ROADMAP-onda3.md §11`. Resumo:

| Premissa | Default em vigor |
|---|---|
| **P1 · Plataforma E13-slim** | Nativo Expo (não web) — conforme `V1-CHECKLIST §Onda 3` já registra. Corta a jornada heroica, não a plataforma. |
| **P2 · Data/cache por superfície** | App = Firestore SDK + TanStack Query RN (ADR-010); link-in-bio = E12 Next SSR/ISR, revalidação por tag `perfil:{handle}`. |
| **P3 · Alvo mobile** | 390×844 primário para app + link-in-bio; gate visual nesse viewport. |
| **P4 · Self-service pós-compra (S1315/S1316)** | Could — sobe ao app só após S904/S305; senão adia para Onda 4. |
| **P5 · RN dentro dos blocos ratificados** | E17=160-167, E18=360-365. **Corrigir o header do épico E18** ("360..375" → "360-365"; só 360-365 usados no corpo). Zero RN novo. |
| **P6 · Alcance do link-in-bio** | Organizador-only na Onda 3 (ver DN-1); atleta = Onda 4. |
| **P7 · Scheduler** | Cloud Scheduler + Function idempotente (ADR-015); automações = S402. |
| **P8 · IDs canônicos** | Reusados (S305/S306/S307/S904/S1205/S402/S1700-05/S1800-04/S1300-16); zero entidade nova. |
| **P9 · S1804 cupom-only** | Encaixa em E04/S300; roda no Lote 1 (é do E04) ou Lote 3 (consumidor). |

---

## Resumo — o que aguarda você

| Nó | Tipo | Recomendação | Bloqueia? |
|---|---|---|---|
| **DN-1 · alcance do link-in-bio** | decisão de produto | organizador-only na Onda 3 (editor no painel); atleta = Onda 4 | não (P6 em vigor) |
| A1 · enrollment das lojas | ação externa (lead time) | começar agora, em paralelo (molde KYC Asaas) | não (dev roda sem) |
| A2 · `{leela-domain}` | ação externa | fixar domínio p/ links de produção | não (placeholder) |
| A3 · EmailProvider | ação externa | escolher fornecedor + ADR | não (sandbox) |
| P1-P9 | premissas | confirmar os defaults | não |
