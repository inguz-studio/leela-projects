# Decisões em aberto — painel do Vitor

> Fonte única das decisões que dependem de você. Atualizado pelo maestro a cada mudança.
> Histórico de decisões já tomadas: `discovery/decisoes-escopo-2026-07-04.md`.

## 🔴 Aguardando você agora

*(nenhuma — todas as decisões do fix-loop foram tomadas em 2026-07-05: T14 reabrir=owner-only ✅ · T15 reativação unilateral ✅ · T13 sem limite de pontuação ✅)*

## 🟡 Quando você tiver os dados (não bloqueiam código)

3. **Valores restantes do plano de cobrança** — mensalidades (Leela+ e SaaS do produtor) e ajuste fino das taxas por parcela quando houver custos reais do gateway. *(Juros de parcelamento e modelo de taxa por transação: DECIDIDOS em 2026-07-05, ver Ratificadas.)*

## 🟠 Ações externas suas

4. **Conta no gateway Asaas + KYC** — gateway DECIDIDO: **Asaas** (D2, 2026-07-10). A integração roda em sandbox sem depender disso; o **KYC segue pendente como ação externa** — concluí-lo destrava `E04-PAY-T2` (parked até lá) sem custar código.
5. *(Opcional)* Exceção do Device Guard p/ `turbo.exe` — agentes têm contorno; é conveniência.

## ⏸️ Para o final (decisão 2026-07-05)

- **Strava** — inteiro para evolução (registro OAuth deixou de ser urgente); V1.5 já nasce com a seção no perfil em "em desenvolvimento".
- **Domínio público + e-mails** (transacional e suporte) — pré-go-live.
- ~~**Ação Comunicar do card Próximo evento — aguarda superfície de comunicação**~~ *(anexo Fidelidade A3, 2026-07-06)* — **RESOLVIDA em 2026-07-10 (D3): E06 campanhas confirmado V1**, então o destino vai existir. A impl mantém `Ver inscritos · Check-in · Gerenciar` (divergência consciente, `Countdown.tsx`) **até `E06-L3` aterrissar a aba Comunicação do evento** — aí o middle-action vira "Comunicar" e a ordem alinha ao mockup. Ver Ratificadas abaixo.

## ✅ Ratificadas recentemente (referência rápida)

- **Trilha next-trail RATIFICADA (Vitor, 2026-07-10/11) — D1-D6, promovida aos canônicos em 2026-07-10** (`leela-specs/next-trail/` → `ROADMAP.md §5` + `V1-CHECKLIST.md §Trilha next-trail` + `jobs-to-be-done.md §04.1`):
  - **D1 · Kernel `pedidos` na Frente A (Fable):** `pedidos/{id}` implementado UMA vez em `LEELA-FABLE-A` conforme **ADR-011**, com gate adr-conformance; deps `FABLE-A → E12-L4/S1203-T5` e `FABLE-A → S203-T3` valem.
  - **D2 · Gateway = Asaas:** adapter roda em sandbox; **KYC = ação externa pendente (segue na seção 🟠 acima)** — `E04-PAY-T2` parked até o KYC concluir.
  - **D3 · E06 (comunicação do evento, campanhas) = V1:** o middle-action do card "Próximo evento" vira "Comunicar" quando `E06-L3` aterrissar a aba Comunicação (fecha a divergência consciente do anexo A3, antes em ⏸️).
  - **D4 · `ROADMAP.md §5` corrigido:** Onda 2 = superconjunto reconciliado do `V1-CHECKLIST.md §Onda 2 · Vender` (E04-slim + E12 + E09-slim + E07-web + E06 + transversais; E08 adiado).
  - **D5 · RESP-MOBILE = Must V1**, antes/em paralelo à Onda 2 (mobile real 390×844, 1 sweep, gate Norman).
  - **D6 · P1-P5 APLICADAS a `jobs-to-be-done.md §04.1`** (P5 inadimplência visível · P1 estorno digno · P2 validar ingresso sem fraude · P3 estoque por tamanho · P4 operar pelo celular no dia da prova).
- **Parcelamento COM juros (Vitor, 2026-07-05): 3,49% a.m., tabela Price, repassado ao comprador** ("acrescido ao serviço", padrão ticketeira). Coeficiente 12x = 0,103424/parcela → total ≈ +24,11% sobre o valor financiado. Válido para 2x-12x; à vista sem juros.
- **Modelo de taxa de serviço por transação (Vitor, 2026-07-05): além do percentual puro, opção percentual + fixo (ex.: 8% + R$2,00 por venda), configurável por tenant** no CommercialTerms. Os dois modelos coexistem; admin master escolhe por tenant.
- Taxa por método: **defaults iniciais 10% cartão / 8% PIX, editáveis pelo admin master** por tenant (CommercialTerms).
- Parcelamento: tabela por parcela 2x-12x configurável pelo admin; sem "12x sem juros" fixo. **Sem boleto.**
- Retenção de repasse: 15% liberada pós-evento, editável pelo admin.
- Sem afiliados no início (cupons sim); E08 adiado. Leela+ pago/mensalidade/receita 100% Leela.
- V1 = vender · V1.5 = engajar. GymRats sem medalhas. Calibragem de gate aprovada.
