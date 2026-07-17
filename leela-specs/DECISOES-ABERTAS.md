# Decisões em aberto — painel do Vitor

> Fonte única das decisões que dependem de você. Atualizado pelo maestro a cada mudança (última: **2026-07-17, rodada de decisões do Vitor — itens 1-7 ratificados**).
> Histórico de decisões já tomadas: `discovery/decisoes-escopo-2026-07-04.md` + seção Ratificadas no fim.
> **Nada abaixo bloqueia código**: tudo roda com default defensável em vigor. Ratificar = confirmar o default; mudar = eu ajusto no próximo lote.

## 🟢 Ratificações rápidas — RESOLVIDAS em 2026-07-17

Os 7 itens desta seção foram todos decididos pelo Vitor em 2026-07-17. As respostas estão consolidadas na seção **✅ Ratificadas** abaixo — incluindo o **verbatim** do Vitor sobre reabertura de lote (item 4), agora registrado como **RN-304 + story S307** no épico E04.

## 🟠 Ações externas suas (destravam código pronto)

8. **Chave SANDBOX do Asaas** — destrava o teste ponta a ponta de cobrança real sem risco e a **ativação do adapter** (`AsaasProvider` está pronto e inerte; checklist de ativação em `outputs/leela-build-2d6ee98d/ASAAS-ADAPTER-REPORT.md`, com review Fable obrigatória na virada).
9. **KYC do Asaas** — conclui `E04-PAY-T2` (parked). Lead time de negócio; sem custo de código.
10. **Rotacionar a chave de PRODUÇÃO do Asaas** — ela apareceu em transcript de chat (2026-07-12). Não é urgente (só existe em `functions/.env`, Mock ativo), mas regenere no painel Asaas quando puder.
11. **Pré-deploy real do E09:** `firebase functions:secrets:set BANK_DATA_KEY` (a cifra fail-closed não funciona sem a chave) e DSN do Sentry de staging (o `eventId` do 500 do E07 depende disso).

## 🟡 Go-live / quando tiver os dados

12. **Domínio público** — `{DOMINIO_LEELA}` segue placeholder em todo slug/URL; bloqueia só SEO/links de produção.
13. **E-mail transacional** — fornecedor (Resend/SendGrid…) + ADR própria; o fluxo roda com `EmailProvider` sandbox. E-mail de suporte e `ROTA_LOGIN` reais entram junto.
14. **Valores restantes do plano de cobrança** — mensalidades (Leela+ e SaaS) e ajuste fino das taxas por parcela quando houver custos reais do gateway.

## ⚪ Menores (viram config quando você quiser)

15. Teto sanitário de quantidade por transição de estoque (hoje 1M/SKU hardcoded no callable) e o limiar de "baixa" (item 3b) migrarem p/ config de produto.
16. Fontes embarcadas (Exo 2 + JetBrains Mono self-host woff2) vs fallback de sistema — hoje CDN.
17. **Idade máxima para campanha agendada VENCIDA disparar** (identificado no O3-L4, scheduler de campanhas). **Default em vigor:** campanha `agendado` com `agendadoPara` no passado dispara na **primeira rodada do cron** que a encontrar, não importa há quanto tempo venceu (sem produção hoje, o backlog é zero — mas num deploy/pausa longa, campanhas velhas disparariam de uma vez). Decidir: dispara sempre (default atual) OU expira após N horas/dias vencida (viraria estado "expirada" sem envio). Vale também para os gatilhos de relógio das automações (S402-T1, mesma mecânica de vencimento).

## ✅ Resolvidas desde a última versão deste painel (2026-07-11 → 13)

- Logos: entregues e aplicadas (sidebar, landing). · Homepage/catálogo: no ar (E12). · Checkout sandbox: no ar, marco "vender ponta a ponta" fechado. · D3 middle-action "Comunicar": aplicado (`c555e93`). · Divergências do cupom brief×kernel: reconciliadas no épico E04 (kernel é a autoridade). · S300-T6 PercursoModal: superseded por ADR-012.

## ✅ Ratificadas recentemente (referência rápida)

- **Flat inputs = DEFAULT GLOBAL do design system (Vitor, 2026-07-17).** O experimento do showroom foi aprovado: `Input`/`Select`/`Textarea` nascem flat; opt-out explícito via `bordered`. Aplicado em `5bb08a1` (AA verde, 1006/1006). Pendência registrada: varredura do painel para remover 8 `variant="flat"` redundantes no EventoForm.
- **DN-1 ratificada (Vitor, 2026-07-17): link-in-bio na Onda 3 = ORGANIZADOR-ONLY** (editor de perfil mínimo no painel, `DN-1-T1`; perfil/tema do atleta = Onda 4 junto do app E13). Trilha da decisão em `next-trail-onda3/DECISOES-NECESSARIAS-onda3.md` §DN-1.
- **Rodada de decisões do Vitor (2026-07-17) — os 7 itens do painel ratificados:**
  1. **ADR-013 · Orquestração de pagamento = APROVADA.** Registry + `resolveProvider(contexto)` + `providerId` de roteamento + webhook demux; **failover fica para depois**. Status da ADR: proposta → **aceita** (`leela-specs/adr/ADR-orquestracao-pagamento.md`); implementação é lote próprio (aqui só muda o status).
  2. **ADR-014 · Cifra dos dados bancários = RATIFICADA como está.** AES-256-GCM, chave no Secret Manager (`BANK_DATA_KEY`), rotação por `keyVersion`, AAD por tenant, sem KMS na V1. A implementação do E09 já segue a proposta.
  3. **Estoque — 4 defaults ratificados.** (a) `estoqueFisico` nasce na transição `em_estoque`; (b) limiar de alerta "baixa" = **10 unidades** por SKU; (c) máquina de estados linear estrita (RN-226); (d) **validação de tamanho na origem (checkout) ratificada** → vira código (S209-T2) no lote paralelo **LEELA-BEPEND** (em andamento).
  4. **Vaga de lote em cancelamento sem estorno.** O **ratchet automático é MANTIDO** — a vaga não volta sozinha. **Regra nova do Vitor (verbatim):** "o usuário organizador pode decidir voltar um lote à venda, essa reabertura pode acontecer pelo painel admin, aumentando o numero de vagas naquele lote, por exemplo. E mostraremos quanto foi vendido, quanto está disponivel e quanto foi configurado, de maneira que pode ser editado, e salvo." → registrada como **RN-304 + story S307** no épico E04 (backlog aprovado; escrita só via Function + auditoria; reduzir abaixo do vendido negado).
  5. **Numeração das RNs ratificada.** RN-303 (cupom-only), RN-347 (taxa incorporada/repassada), RN-348 (D+N + retenção) nos épicos E04/E09/E12; blocos RN-160-167/360-365 para E17/E18.
  6. **Colisão de numeração ADR-007 resolvida.** A ADR de **cron/scheduler vira ADR-015**; o **Turborepo mantém ADR-007**. Renumeração aplicada nos docs (arquivo + convenções §12 + boards); referências em código-fonte ficam para um lote de backend.
  7. **E17/E18 (planejamento) — defaults ratificados.** Numeração E17/E18 confirmada · as 2 linhas de JTBD como escritas · link-in-bio público na **Onda 3** (in-app na Onda 4) · política de `@handle`: `@[a-z0-9_]{3,30}`, imutável, com lista de reservados.
- **Trilha next-trail RATIFICADA (Vitor, 2026-07-10/11) — D1-D6, promovida aos canônicos em 2026-07-10** (`leela-specs/next-trail/` → `ROADMAP.md §5` + `V1-CHECKLIST.md §Trilha next-trail` + `jobs-to-be-done.md §04.1`):
  - **D1 · Kernel `pedidos` na Frente A (Fable):** `pedidos/{id}` implementado UMA vez em `LEELA-FABLE-A` conforme **ADR-011**, com gate adr-conformance; deps `FABLE-A → E12-L4/S1203-T5` e `FABLE-A → S203-T3` valem.
  - **D2 · Gateway = Asaas:** adapter roda em sandbox; **KYC = ação externa pendente (seção 🟠)** — `E04-PAY-T2` parked até o KYC concluir.
  - **D3 · E06 (comunicação do evento, campanhas) = V1** — cumprida na Onda 2 (aba + campanhas + flip do envio).
  - **D4 · `ROADMAP.md §5` corrigido:** Onda 2 = superconjunto reconciliado (E04-slim + E12 + E09-slim + E07-web + E06 + transversais; E08 adiado) — **executada em 2026-07-13**.
  - **D5 · RESP-MOBILE = Must V1** — cumprida (Wave B).
  - **D6 · P1-P5 APLICADAS a `jobs-to-be-done.md §04.1`** (P5 inadimplência visível · P1 estorno digno · P2 validar ingresso sem fraude · P3 estoque por tamanho · P4 operar pelo celular).
- **Parcelamento COM juros (Vitor, 2026-07-05): 3,49% a.m., tabela Price, repassado ao comprador** ("acrescido ao serviço", padrão ticketeira). Coeficiente 12x = 0,103424/parcela → total ≈ +24,11% sobre o valor financiado. Válido para 2x-12x; à vista sem juros.
- **Modelo de taxa de serviço por transação (Vitor, 2026-07-05): percentual puro OU percentual + fixo (ex.: 8% + R$2,00), configurável por tenant** no CommercialTerms.
- Taxa por método: **defaults 10% cartão / 8% PIX, editáveis pelo admin master** por tenant. · Parcelamento: tabela 2x-12x configurável; **sem boleto**. · Retenção de repasse: 15% pós-evento, editável. · **Taxa incorporada vs repassada = config do organizador por evento (2026-07-12, RN-347)** · **Repasse D+2 ajustável + retenção % por tenant (RN-348)** · **Cupom-only como modo de venda (RN-303)**.
- Sem afiliados no início (cupons sim); E08 adiado. Leela+ pago/mensalidade/receita 100% Leela. V1 = vender · V1.5 = engajar. GymRats sem medalhas.
