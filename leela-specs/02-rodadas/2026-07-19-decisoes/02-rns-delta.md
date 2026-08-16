---
tags: [leela, decisoes, rns, rodada]
trace: leela-build-2d6ee98d
lote: DECISOES-0719
data: 2026-07-19
---

# 02-rns-delta · RNs novas/atualizadas da rodada DEC-0719

> Numeração atribuída **após grep de colisão** por série (checagem: 0 hits em `leela-specs/` e no código para RN-154/155/156/157/170/173). Séries: 140s = dados/consentimento do inscrito no checkout; 160s = política de imagem; 170s = identidade/CRM. Colisão RN-229/230 (histórica) evitada — nenhuma RN nova reusa número vigente.
>
> **Retomada DEC-0719-ret (2026-07-19):** RN-174/175/176/177 (cluster claim + estrangeiro) atribuídas na banda **170s = identidade/pessoas/documento** (estende RN-172/173). Prova de não-colisão: `grep -rn 'RN-17[4-7]'` no repo inteiro (`.md`/`.ts`/`.tsx`/`.json`) = **0 hits** antes desta rodada; a lista distinta de RNs salta de 173 direto para 200. RN-175 mora em E04 mas é numerada no cluster de identidade por coerência temática (série é hint, não regra rígida).

## Novas

| RN | Regra | Épico | Lote de código (fila) |
|---|---|---|---|
| **RN-154** | **Gênero no checkout por inscrito** + **pré-preenchimento automático** quando a pessoa já comprou (via CPF único RN-173). Enum `GENEROS_INSCRITO` com opção "não informado" (respeita quem não declara). Alimenta a demografia do organizador (RN-820/822). | E12 | (c) CHECKOUT-FORM-2 |
| **RN-155** | **Conta criada automaticamente sem fricção na 1ª compra** + **envio de link por e-mail** para a pessoa definir senha e visualizar a compra. Depende do **EmailProvider** (RN-137, `BREVO_API_KEY`) — fail-closed sem a chave. | E12 | (d) conta-sem-fricção |
| **RN-156** | **Termo de saúde BASE da plataforma sempre presente e obrigatório no checkout** (deixa de ser condicional a flag). A flag `exigenciasSaude` do organizador passa a **ADICIONAR** um termo custom dele. Reconcilia com **RN-146/147** (dados plenos atestado/PAR-Q seguem condicionais à flag do evento) e com o aceite versionado **RN-149**/CHECKOUT-MODELO (`pedidos/{id}.aceites.saude`). | E04/E12 | (e) saúde-termo-base |
| **RN-157** | **Cobrança PIX expira em 30 minutos** — validade da **charge** no PaymentProvider/Asaas (`expiresIn`), não só relógio de UI. QR + copia-e-cola disponíveis **enquanto o PIX estiver pendente**, na tela de pagamento **E** na tela do pedido pendente. Botão **copia automaticamente** + toast *"a chave para pagamento foi copiada"*. | E12 | (c) CHECKOUT-FORM-2 |
| **RN-170** | **Toda superfície de imagem tem ação TROCAR imagem + ajuste automático de proporção** (fit/crop client-side para a proporção da superfície — capa 1.9:1, logo 1:1, kit 1:1 etc.). Complementa **RN-168** (upload-only): removida a URL colada, entra a troca com reenquadramento automático. Imagem em proporção diferente é ajustada "para caber" sem o usuário recortar na mão. | E17 (política de imagem) · consumidoras E03/E05/E12 | (a) upload-sweep |
| **RN-173** | **CPF é ÚNICO no sistema (unicidade global de pessoa por CPF).** Colisão no checkout = **mesma pessoa: linka, não duplica**. Base da chave de linking do CRM (RN-172, CPF→e-mail) e do pré-preenchimento (RN-154). Implica constraint de unicidade + fluxo de colisão no cadastro/checkout. | E19/E12 | (f) cpf-unico |
| **RN-174** (ret) | **Claim da ficha de pessoa condicionado a pagamento CONFIRMADO + e-mail da conta == e-mail da compra + e-mail CONFIRMADO (Firebase nativo).** Enquanto as três não valem, `dadosConhecidos`/prefill (RN-154) nunca são lidos pela conta ⇒ fecha F1. F2 mitigado pelo mesmo desenho (premissa). E-mail de confirmação dispara no 1º login ou 1ª entrega de ingressos (o que vier primeiro), não na compra (alinha RN-155). Direção B endurecida; Direção A (prova de posse) = reforço pré-go-live. | E19 (regra-mãe) / E12 (efeito) | (h) CLAIM-FIX (executável já) |
| **RN-175** (ret) | **Toggle POR EVENTO "aceitar inscrição de estrangeiros" (default OFF).** OFF = checkout segue exigindo CPF (RN-173, nada muda). ON = habilita o checkout de estrangeiro (RN-176) + documento tipado (RN-177). Flag `aceitaEstrangeiros` default `false`. | E04 | (i) ESTRANGEIRO-CHECKOUT (gated Asaas) |
| **RN-176** (ret) | **Checkout de estrangeiro (toggle ON):** pergunta nacionalidade; estrangeiro → documento = **PASSAPORTE** (formato/validação), **CPF oculto**, pagamento restrito a **CARTÃO internacional À VISTA** (sem PIX/boleto/parcelamento — restrição do caminho Asaas de cobrança avulsa liberada). Modelo Doity/Sympla. Paliativo: BR paga pelo estrangeiro (passaporte) sem tocar RN-173. | E12 | (i) ESTRANGEIRO-CHECKOUT (gated Asaas) |
| **RN-177** (ret) | **Documento tipado no registry de pessoas (cpf \| passaporte+país); RN-173 "CPF único" generaliza para "documento único".** Especificar SEM implementar. Migração `cpf-unico`→`documento-unico` é lote GATED. | E19 | (i) ESTRANGEIRO-CHECKOUT (gated Asaas) |

## Ampliadas (sem novo número)

- **RN-168** (upload-only) — escopo **confirmado/ampliado**: morre a URL colada em **TODAS** as superfícies de imagem (perfil avatar/capa, capa de clube, capa de evento), não só na foto de perfil. Supersede o fallback de URL da ADR-016 globalmente. (Item 19.)
- **RN-229** (divisórias) — ⛔ **SUPERSEDED em 13/08 pela Leva 14**: a divisória saiu de TODO `SubNav`, a prop `divider` não existe mais no design system e a borda inferior é travada no componente. Regra nova em `2026-08-13-decisoes-dono/01-decisoes-dono.md` §14 e no cânone §9. *(Texto original: ampliada para todo `SubNav`, não só as terciárias dentro de eventos; supersedia "SubNav plano" de 2026-07-11 globalmente. Item 21.)*

## Em vigor / referenciadas

- **RN-315** (clube-influenciador sem retroativo) — **SEGUE EM VIGOR** até a revisão do benchmark Ticketsports pelo Vitor. Direção retroativa decidida mas **PARKED** (dinheiro ⇒ Fable + antagonista quando destravar). (Item 22.)
- **RN-172** (chave de linking do CRM CPF→e-mail) — **confirmada** (item 24c); ganha a garantia de unicidade da RN-173.
- **RN-146/147** (dados de saúde plenos, condicionais a flag) — **reconciliadas** com RN-156 (base obrigatória + custom aditivo).
- **RN-149** (versionamento de aceite) — base do carimbo de versão do termo de saúde base (RN-156).
- **RN-137** (EmailProvider/Brevo, fail-closed) — dependência de RN-155.
- **ADR-016** — status **ACEITA** (ratificada, item 18); fallback de URL supersedido por RN-168/170.

## Pendente-de-confirmação (NÃO é RN)

- **Reembolso não devolve a taxa de serviço** — condicionado ao BENCHMARK-REEMBOLSO (`outputs/leela-build-2d6ee98d/BENCHMARK-REEMBOLSO-REPORT.md`). Vira RN só depois do benchmark.
