# Brief enriquecido — Caça de lacunas LEELA / Be Hero (produto + design)

**Business:** software-forge · **Trace:** leela-gaps · **Modo:** zero_human
**Project dir:** `C:\Users\Vitor Eduardo\Desktop\Vaults\Projetos\LEELA`

## Objetivo
Caçar lacunas de escopo do produto LEELA (app de ticketing para corridas, ex-"Be Hero") contra os Jobs To Be Done já mapeados, e produzir um plano de reconciliação Be Hero(Figma) → Leela(specs). Foco em 4 prioridades. **Não escrever os arquivos finais no vault** (stories/RNs definitivas) — entregar recomendações estruturadas para revisão do usuário.

## Insumos (ler de fato antes de opinar)
- Specs: `leela-specs/` — épicos `epics/LEELA-E00..E16`, `backlog/LEELA-Sxxx.md`, `modelo-de-dados-firestore.md`, `adr/ADR-multitenancy.md`, `adr/ADR-stack.md`, `definition-of-done.md`, `V1-PRODUTOR-web.md`.
- JTBD e personas: `be-hero-documentacao/be-hero-docs/jobs-to-be-done.md`, `personas.md`, `PRD-01-be-hero.md`, `fluxos-de-uso.md`, `integracoes.md`.
- Wireframes painel (desktop): `WEB-APPV2 (1)/` (36 telas HTML — 100% organizador).
- Wireframes mobile atleta (Be Hero, Figma): fileKey `pP90MWzw03NNlRpXicFt6Q`, página WIREFRAMES `39:2`, 61 telas. Jornada de compra desenhada: PÁGINA EVENTO→MODALIDADES→KITS(`39:921`)→PAGAMENTO(`39:952`)→PAGAR-PIX→PAGAMENTO FEITO(`39:2602`). Ingresso: componente `EVENTOS-MEUS INGRESSOS`(`39:605`). QR/check-in: "Meus Qr Codes", ícone QR CODE, estado "Check-in já realizado"(`39:6586`). Coleta no checkout (`39:2633` INFORMAÇÕES): CPF, nome, gênero, nascimento, telefone, "Nome contato de segurança + telefone", "Código de desconto ou assessoria". Kit (`39:921`): "Tamanho camiseta Dry · SELECIONE" por inscrição.

## Estado atual por prioridade (design vs spec)
1. **PÓS-COMPRA** — e-mail de ingresso com template de marca: LACUNA total (só `integracoes.md §6` intenção, fornecedor a definir; sem story; template de marca não especificado). PDF do ingresso: LACUNA (nem Figma nem repo). Check-in por QR: atleta tem QR desenhado no Figma + estado "check-in realizado", MAS painel organizador (E03-S204) valida por nome/dorsal, **sem scanner de QR**. Conflito: RN-205 "retirar kit = check-in" vs check-in por QR.
2. **REEMBOLSO/CANCELAMENTO/TITULARIDADE** — só existe mecânica contábil de estorno (RN-337, E09). LACUNA: política (reembolso total auto em 7 dias; corte de 48h antes do evento; fora disso organizador decide); troca de ingresso; troca de titularidade; notificação ao organizador nos 3 casos. Ausente também no Figma (greenfield).
3. **ESTOQUE** — tamanho por participante é COLETADO no Figma mas NÃO tem campo no modelo `inscritos` (persistência é lacuna). Fluxo "encomenda → estoque" (vender sem estimativa → encomendar pelo vendido → migrar p/ estoque físico) inexiste ("encomenda" = 0 ocorrências). Ajuste manual de estoque está fora de escopo (E03-S205-T4).
4. **SAÚDE + REGULAMENTO** — contato de emergência já desenhado (Figma). Falta dados médicos plenos (atestado/PAR-Q/tipo sanguíneo) com decisão LGPD (dado sensível de saúde tem base legal e minimização próprias). Regulamento tem upload+exibição mas SEM aceite formal no checkout (só checkbox LGPD).

## Coberto (não reabrir, só confirmar): links de promotor (E04-S301/E08/E12-S1204), landing configurável (E04-S300→E12), multi-tenancy fundacional (ADR-009/E16), kits/brindes (E03-S205). Nota: domínio custom por tenant + branding white-label = lacuna que contradiz "Leela é branding, produto único" — decisão de produto pendente.

## Critérios de aceite do deliverable
- Cada uma das 4 prioridades: lacunas validadas contra JTBD/personas (com citação do JTBD específico), severidade, e decisão de produto resolvida com recomendação (não só "depende").
- Backlog proposto no padrão leela-specs: novas stories `LEELA-Sxxx` com título, épico-alvo, MoSCoW, RNs novas numeradas, tela(s) de referência, e impacto no modelo de dados. Formato de proposta (não arquivo final).
- Reconciliação Figma→Leela: lista de telas Be Hero a re-skinnar para padrão Leela + telas novas a desenhar.
- Objeções falsificáveis do antagonista (QA) com evidência (citação de regra/arquivo) e severidade.
