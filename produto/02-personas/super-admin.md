---
tags: [leela, produto, persona, super-admin, plataforma]
fontes:
  - "[[ADR-multitenancy]]"
  - "[[LEELA-E16-plataforma-superadmin]]"
  - "[[decisoes-escopo-2026-07-04]]"
  - "[[be-hero-documentacao/be-hero-docs/personas|personas (Bíblia Be Hero)]]"
atualizado: 2026-07-05
---

# Persona · super-admin da plataforma

O dono do Leela operando o marketplace. Papel `platform_admin` nas claims: único que cruza a fronteira de tenant, com leitura macro e escrita de termos comerciais ([[ADR-multitenancy]]). Hoje é o próprio fundador; a Bíblia Be Hero já previa a versão operacional interna (CS, financeiro, suporte) com a dor "preciso de visão consolidada de tudo que roda na plataforma".

## Jobs

1. **Onboardar o tenant.** Aprovar, provisionar, ativar e suspender produtores ([[LEELA-E16-plataforma-superadmin]], S1601). Na V1 isso é feito na mão para o sócio produtor.
2. **Configurar os termos comerciais.** Aplicar o plano de cobrança nomeado (tabela de taxas por parcela 2x-12x + taxa PIX + cartão à vista + mensalidade SaaS) que estampa os CommercialTerms do tenant; edição fina por tenant continua possível ([[decisoes-escopo-2026-07-04]], decisão 2026-07-05).
3. **Decidir repasses.** Fila de solicitações no PlatformShell, com retenção de 15% liberada pós-evento, percentual editável ([[decisoes-escopo-2026-07-04]], E09-slim).
4. **Ver o macro.** GMV, receita Leela, tenants ativos e saúde da plataforma (S1605, V1-slim parcial).

## Restrições que definem o papel

- Escrita de `commercialTerms` é exclusiva do `platform_admin`; nenhum outro papel cruza tenant.
- Na V1 o "pago" do repasse é registro de workflow, sem transferência bancária real (PaymentProvider mock, UI explícita sobre isso).
- Agregados macro em `platform/…` são escritos só por Function.

## Por que essa persona importa para a tese

Os termos comerciais por tenant (taxa, parcelamento, mensalidade SaaS que pode ser 0) são a alavanca da oferta coordinator-first "você paga quando arrecada": o super-admin consegue calibrar condição comercial por produtor sem tocar código ([[01-tese-de-negocio]]). É também quem transforma decisão comercial do Vitor em configuração viva, sem redeploy.

## Relacionadas

[[00-MOC-produto]] · [[01-tese-de-negocio]] · [[organizador-produtor]] · [[atleta]] · [[06-roadmap-visao]]
