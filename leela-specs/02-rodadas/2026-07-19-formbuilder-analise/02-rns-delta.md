---
tags: [leela, decisoes, rns, rodada, formulario]
trace: leela-build-2d6ee98d
lote: FORMBUILDER-SPEC
data: 2026-07-19
---

# 02-rns-delta · RNs novas da rodada FORMBUILDER

> Numeração atribuída **após grep de colisão**. Banda **184–199 livre**: a TAXA-FLEX consumiu 178–183; a próxima RN distinta salta de **RN-183** para **RN-200** (série 200+ é outro cluster já existente). Prova de não-colisão: `grep -rn 'RN-18[4-9]\|RN-19[0-9]' leela-specs/` = **0 hits**; o mesmo padrão em `**/*.{ts,tsx,json}` (fora de `node_modules`) = **0 hits** (2026-07-19). Série **184–189 = construtor de formulário de perguntas** (v1 só perguntas; anexo = fase 2).
>
> **Consolidação nos épicos (regra dos boards):** cada RN consolidou no épico dono na mesma aterrissagem — E04 (config do evento/modelo), E05 (config e render de clube), E12 (render na compra), com o core em E00. A rodada guarda só o delta.

## Novas

| RN | Regra | Épico | Lote de código (fila) |
|---|---|---|---|
| **RN-184** | **Construtor de formulário + tipos de pergunta (v1).** O organizador monta perguntas personalizadas exibidas na compra do evento e na inscrição de clube. Tipos do **v1**: **seleção única** (radio), **seleção múltipla** (checkbox), **sim/não** (booleano). **Anexo de arquivo NÃO entra no v1** (fase 2 GATED — uma linha de backlog, sem elaboração). O **enum de tipos é fonte única no core** (`packages/core/src/forms/`), sem duplicar por superfície. | E04 (dona do modelo) · E05 (clube) · E00/core | (k) FORMBUILDER |
| **RN-185** | **Onde a resposta vive = no inscrito/membro (nunca no pedido).** A resposta é atributo da **pessoa que participa**; grava no **inscrito** (evento) e no **membro** (clube), no ato da inscrição/entrada. Alinha com o registry `pessoas` (RN-173) e a posse por CPF (RN-174) **sem acoplar no claim** — a resposta viaja com o inscrito mesmo sem conta reivindicada. Escrita **server-only** (mesma tx da confirmação/entrada), nunca de cliente. | E12 (grava no inscrito) · E05 (grava no membro) | (k) FORMBUILDER |
| **RN-186** | **Obrigatoriedade por pergunta.** Cada pergunta tem `obrigatoria` configurável. Pergunta obrigatória sem resposta **bloqueia o pagar/inscrever no MESMO fence server-side dos aceites** (termo de compra/saúde — S1207/S306). **Reusa o fence de aceite existente**; não cria gate novo nem confia em validação de cliente. | E12 (compra) · E05 (clube) | (k) FORMBUILDER |
| **RN-187** | **Limites com fonte única no core.** Teto de **perguntas por formulário** e de **opções por pergunta**, como **constante única no core** (sem número hardcoded espalhado), no padrão de fonte única do `PIX_EXPIRACAO_SEGUNDOS` (RN-157). **Default proposto: 20 perguntas / 10 opções** (o Vitor ajusta num lugar só). | E00/core · ref E04/E05 | (k) FORMBUILDER |
| **RN-188** | **Versionamento da pergunta.** Editar uma pergunta com respostas existentes **versiona**: a resposta gravada **carimba a versão** da pergunta no ato e a versão antiga fica intacta; a edição vale só para respostas futuras. **Nunca reescreve resposta antiga.** Mesmo desenho do termo de saúde versionado (RN-149) e do regulamento versionado (S306-T3). | E04/E05 (config) · E12/E05 (render) | (k) FORMBUILDER |
| **RN-189** | **Superfície + leitura/export.** Builder no painel: **config do evento (E04)** e **config do clube (E05)**. Render: **compra (E12)** e **inscrição de clube (E05)**. Leem o **organizador/equipe do tenant** (papéis de E04-S304); a exportação **reusa a lista de inscritos existente** (a resposta é coluna do inscrito no export atual — sem relatório novo). Modelo/core únicos (RN-184); E05/E12 reusam. | E04/E05/E12 | (k) FORMBUILDER |

## Ampliadas / reconciliadas (sem novo número)

- **RN-173 / RN-174** (registry `pessoas` / posse por CPF) — **inalteradas.** RN-185 **liga a resposta ao inscrito** e a captura mencionava "pedido ou inscrito"; a decisão fecha em **inscrito**, sem tocar no claim nem na chave de pessoa. Sem colisão.
- **RN-149** (termo de saúde versionado) e **S306-T3** (regulamento versionado) — servem de **padrão** para RN-188 (carimbo de versão na resposta). Reuso de desenho, não alteração.
- **RN-172** (minimização de PII no CRM) — **inalterada.** P-FB-4: o CRM **não** agrega respostas de formulário por default; incluir exige decisão explícita do Vitor (mesma disciplina do endereço, P-CKMOD-1).

## Fase 2 (NÃO é RN nesta rodada)

- **Anexo de arquivo** — fora do v1. Uma linha de backlog na história dona (E04/S310): *"fase 2: anexo de arquivo — detalhar quando for priorizado."* Sem RN, sem requisito de retenção/acesso/compliance nesta rodada.
