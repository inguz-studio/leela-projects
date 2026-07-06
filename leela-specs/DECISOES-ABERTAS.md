# Decisões em aberto — painel do Vitor

> Fonte única das decisões que dependem de você. Atualizado pelo maestro a cada mudança.
> Histórico de decisões já tomadas: `discovery/decisoes-escopo-2026-07-04.md`.

## 🔴 Aguardando você agora

*(nenhuma — todas as decisões do fix-loop foram tomadas em 2026-07-05: T14 reabrir=owner-only ✅ · T15 reativação unilateral ✅ · T13 sem limite de pontuação ✅)*

## 🟡 Quando você tiver os dados (não bloqueiam código)

3. **Valores restantes do plano de cobrança** — mensalidades (Leela+ e SaaS do produtor) e ajuste fino das taxas por parcela quando houver custos reais do gateway. *(Juros de parcelamento e modelo de taxa por transação: DECIDIDOS em 2026-07-05, ver Ratificadas.)*

## 🟠 Ações externas suas

4. **Conta no gateway (rec. Asaas) + KYC** — integração adiada, mas a burocracia corre em paralelo sem custar código.
5. *(Opcional)* Exceção do Device Guard p/ `turbo.exe` — agentes têm contorno; é conveniência.

## ⏸️ Para o final (decisão 2026-07-05)

- **Strava** — inteiro para evolução (registro OAuth deixou de ser urgente); V1.5 já nasce com a seção no perfil em "em desenvolvimento".
- **Domínio público + e-mails** (transacional e suporte) — pré-go-live.
- **Ação Comunicar do card Próximo evento — aguarda superfície de comunicação** *(anexo Fidelidade A3, 2026-07-06)*. O mockup WEB-APPV2 do card "Próximo evento" traz as quick-actions `Ver inscritos · Comunicar · Check-in`. Inventário das ~36 telas: existe comunicação SÓ no escopo de clube (`/clubes/:slug/comunicacao` — editor de comunicados), NÃO no escopo de evento (as rotas `/eventos/:slug/*` cobrem inscritos, entrega/check-in, kits, financeiro — sem comunicar). Como o card é de um EVENTO (não de um clube), não há destino próprio para "Comunicar" e apontá-lo para a comunicação de clube seria semanticamente errado. Decisão: NÃO inventar tela — a implementação mantém `Ver inscritos · Check-in · Gerenciar` (impl atual, `Countdown.tsx`). **Quando você definir se V1/V1.5 terá comunicação por evento**, o middle-action vira "Comunicar" apontando para ela e a ordem alinha ao mockup. Até lá, divergência consciente e registrada.

## ✅ Ratificadas recentemente (referência rápida)

- **Parcelamento COM juros (Vitor, 2026-07-05): 3,49% a.m., tabela Price, repassado ao comprador** ("acrescido ao serviço", padrão ticketeira). Coeficiente 12x = 0,103424/parcela → total ≈ +24,11% sobre o valor financiado. Válido para 2x-12x; à vista sem juros.
- **Modelo de taxa de serviço por transação (Vitor, 2026-07-05): além do percentual puro, opção percentual + fixo (ex.: 8% + R$2,00 por venda), configurável por tenant** no CommercialTerms. Os dois modelos coexistem; admin master escolhe por tenant.
- Taxa por método: **defaults iniciais 10% cartão / 8% PIX, editáveis pelo admin master** por tenant (CommercialTerms).
- Parcelamento: tabela por parcela 2x-12x configurável pelo admin; sem "12x sem juros" fixo. **Sem boleto.**
- Retenção de repasse: 15% liberada pós-evento, editável pelo admin.
- Sem afiliados no início (cupons sim); E08 adiado. Leela+ pago/mensalidade/receita 100% Leela.
- V1 = vender · V1.5 = engajar. GymRats sem medalhas. Calibragem de gate aprovada.
