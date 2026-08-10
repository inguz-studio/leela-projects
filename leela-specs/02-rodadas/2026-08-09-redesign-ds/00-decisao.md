---
tags: [leela, decisoes, rodada, dono, design-system, tema, glass, redesign]
trace: leela-redesign-ds-0809
lote: REDESIGN-DS-0809
data: 2026-08-09
---

# Redesign do DS · decisão do dono, a executar

> Registrada às ~14h de 09/08, na saída do dono ("preciso desligar o computador agora para sair").
> O handoff completo vive em `handoff/` nesta pasta — copiado de
> `Downloads/Redesign das telas Leela/design_handoff_engajamento`, que é volátil.

## O verbatim, sem retoque

> "eu fiz um redesign e ajuste de tokens no nosso design system em nossos temas além de revisar a
> tela de inicial de visao geral do painel do organizador. Gostaria que aplicasse ao sistema, esse
> design system no tema brasa, com o glass ligado. Já no painel admin, pode ser com o glass
> desligado, para ele ficar com o fundo preto mesmo e eu consegui diferenciar (se possivel). Liste
> isso como decisao a ser executada."

## O que o handoff entrega (README dele é a fonte)

1. **Tema `dark-wine`** — terceiro tema do DS (tokens prontos em `handoff/tokens/`, entram como estão, com revisão).
2. **Camada glass** — par de tokens por tema, ligável por `[data-glass="on"]` no `<html>`; nenhum componente lê valor cru; fallback `@supports` obrigatório.
3. **Pareamento tipográfico do brasa** — Exo 2 (display) + Rubik (texto), com os quatro tokens de peso.
4. **Tela de Engajamento** + **Visão Geral v3** — protótipos `.dc.html` são referência visual, nunca código a copiar; recriar com componentes do DS.
5. Regras de movimento, dataviz (rampa lime→âmbar), ícones Lucide e acessibilidade (contraste ≥ 4,5 medido sobre fundo composto).

## A decisão do dono por cima do handoff

- **Painel do organizador:** tema **brasa** com **glass ligado**.
- **Painel admin:** **glass desligado**, fundo **preto**, para diferenciar do painel do organizador à primeira vista ("se possível" — se o mecanismo não permitir por superfície, propor alternativa a ele, não decidir outra coisa em silêncio).

## Ponto a reconciliar na execução (não decidido aqui)

O handoff constrói o tema `dark-wine`; a ordem do dono aplica o sistema em **brasa** com glass. As duas coisas convivem — o dark-wine entra no DS como terceiro tema, e o que muda de default é o brasa+glass no painel — mas a leitura é do executor com o README na mão, e qualquer divergência entre handoff e ordem volta ao dono como pergunta, não como escolha.

### Ratificação do dono, 10/08 (pós-incidente)

Perguntado diretamente (veto por AskUserQuestion), o dono confirmou: **o painel segue em brasa com
glass ligado como padrão**. O `dark-wine` fica disponível no DS, sem caminho de seleção por ora. O
**seletor de tema** dos protótipos (que nenhuma lane construiu — o painel fixa `theme="brasa"` em
código e não tem controle de troca na interface) vira **card futuro no backlog**, não escopo desta
rodada. Registro feito no mesmo ato da resposta.

## Ordem de implementação (do README, §9)

Tokens → ThemeProvider → glass → tipografia do brasa → tela de Engajamento. **Duas conversas separadas** (tokens e tela têm critérios de revisão diferentes). Aceites do gate: `pnpm generate-tokens` limpo, testes de contraste passando, temas brasa/wine intocados além do que o README pede, e o guia visual do projeto como régua (L-011: gate de código não prova marca).

## Onde aterrissa

`packages/design-system` (tokens, gerador, ThemeProvider, preset) e `apps/painel` (Visão Geral + Engajamento). Fila da retomada: item REDESIGN-DS no handoff de pausa `leela-maestro-pausa-20260809.md`.
