---
tags: [leela, decisoes, rodada, produto, formulario, marcas]
aliases: ["Rodada 2026-07-28", "DEC-0728"]
trace: leela-build-2d6ee98d
data: 2026-07-28
fonte: ordem do Vitor no chat (verbatim abaixo)
---

# Rodada DEC-0728 — fila de construção autorizada e dois escopos novos

## Verbatim do Vitor (preservar)

> *"Perfeito, pode ir seguindo a fila de construção, repasse posição 1, 2,3, incluir cadastro de marcas no painel admin geral, onde eu como administrador Leela posso cadsatrar cupons de desconto,parceiros presenciais, com endereço, descritivo de beneficios, capa, logo, e fotos (pode ser prioridade baixa essa parte). QUero o formbuilder também. no formato que já conversamos, para termos os fomrulários no menu principal, como templates, que poderão ser reutilizados em eventos."*

## Decisões

**DEC-0728A · fila autorizada.** As posições 1, 2 e 3 da fila de construção rodam em sequência sem nova consulta: fechar o caminho do dinheiro (em voo na lane ESTORNO-ADMIN, com as reviews CAIXASIMPLES-REV, DEBT e ESTORNO-REV na esteira), depois E08 (repasse parcial da comissão e aviso ao afiliado), depois E10 (consolidação das ativações de marcas). O FormBuilder, que era a posição 4, foi puxado junto pelo pedido explícito.

**DEC-0728B · FormBuilder com biblioteca de templates.** O formato segue a rodada de 2026-07-19 (D-FB-1 a D-FB-6, RN-184 a RN-189) com um delta novo: os formulários passam a viver no menu principal do painel como templates, reutilizáveis em eventos. É um supersede parcial do D-FB-6: o builder ganha casa própria no menu, e a config de evento e de clube passa a referenciar um template em vez de abrigar o builder. A resposta continua vivendo no inscrito/membro (D-FB-1 intacta), o fence de obrigatoriedade continua o mesmo (D-FB-3). O delta de spec roda antes do código, na lane SPECS-0728.

**DEC-0728C · cadastro de marcas no painel admin geral (prioridade baixa).** Como administrador Leela (nível plataforma, não tenant), cadastrar: cupons de desconto e parceiros presenciais com endereço, descritivo de benefícios, capa, logo e fotos. Épicos candidatos: E10 (marcas) e E16 (plataforma-superadmin); a spec decide o dono e a costura entre os dois. Prioridade baixa declarada pelo dono — entra na fila depois do FormBuilder e não bloqueia nada.

## Efeitos no painel

- Fila de construção atualizada: posições 1 a 3 autorizadas (DEC-0728A), FormBuilder puxado com o delta de templates (DEC-0728B), linha nova de prioridade baixa para o cadastro de marcas (DEC-0728C).
- Nenhum item aberto novo que dependa do Vitor: os dois escopos entram como spec e fila, não como decisão pendente.

Fonte: chat do maestro, 2026-07-28.
