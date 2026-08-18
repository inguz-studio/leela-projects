---
tags: [leela, decisoes-dono, leva26, migracao, deploy, obsidian, e00]
aliases: [Leva 26, Decisões do dono 18/08, Migração de máquina]
atualizado: 2026-08-18
---

# Decisões do dono — 18/08 (leva 26)

Esta leva não é sobre tela. É sobre o produto sobreviver a uma troca de computador
sem que nada do contexto fique para trás na máquina antiga.

---

## A fala, na íntegra

18/08, por volta de 01h:

> quero que voce faça o deploy do que está pendente, deixe tudo guardado no nosso obsidian, que está pendente, que irei migrar agora o porjeto para outro computador. Se necessário, migre o obsidian para outro Github diferente, para mantermos o contexto de produto, e irmos consumindo eles juntos.

Três ordens em quatro linhas: subir o que está construído e parado, guardar o que
está pendente num lugar que ele leia pelo Obsidian, e uma pergunta de arquitetura
sobre onde o contexto de produto deve morar.

---

## 26.1 · O deploy é ordem executada, não pendência

"faça o deploy do que está pendente" é ordem direta, e ela já está em execução na
lane `DEPLOY-J4`, em paralelo a esta. O que estava construído e parado na `main` sem
subir: a série financeira (S825, forma de pagamento virando número na análise e no
engajamento) e a onda C da leva 22 (S316, Modalidades no lugar de Lotes).

O resultado real da subida entra neste doc pela própria lane de deploy, e não aqui
— o registro fiel é o que ela medir contra produção, não o que esta lane supõe.

- **Onde aterrissa:** seção `## Estado do deploy` de `00-boards/MIGRACAO-DE-MAQUINA.md`,
  preenchida pela `DEPLOY-J4`.
- **O que continua com o dono depois da subida:** os gates visuais, que deploy nenhum
  substitui. Estão listados no mesmo doc.

## 26.2 · "Tudo guardado no Obsidian" virou um doc só

O pedido pede um lugar onde ele abra o Obsidian, no computador novo, e encontre o
estado inteiro sem precisar de sessão de agente nenhuma. Esse lugar é
[[MIGRACAO-DE-MAQUINA]] (`leela-specs/00-boards/MIGRACAO-DE-MAQUINA.md`), que reúne
as decisões pendentes dele, a fila de construção, os gates visuais em aberto, o
buraco de registro da leva 21 e o guia de bring-up da máquina nova.

O painel `01-produto/DECISOES-ABERTAS.md` continua sendo a casa canônica das
decisões, e o doc novo aponta para ele por link. Duplicar o conteúdo criaria o
segundo painel que a regra da casa proíbe.

## 26.3 · O Obsidian NÃO migra para outro GitHub

*"Se necessário, migre o obsidian para outro Github diferente"* — a condicional é
dele, e a medição diz que não é necessário.

Todo o contexto de produto já vive dentro deste repositório, em `leela-specs/`, e
já está no GitHub: `inguz-studio/leela-projects`, com `main` idêntica ao `origin`.
O Obsidian não guarda nada por conta própria; ele lê o repo por duas junções locais
(`LEELA-specs` e `LEELA-reports`), que são atalhos de sistema de arquivos e se
recriam com um comando cada.

**Decisão do maestro: as specs continuam no mesmo repositório do código.** Três razões:

1. **Lockstep.** Cada rodada, cada RN e cada handoff é escrito contra um hash de
   commit do código. Separar os dois cria dois relógios, e a spec passa a descrever
   um produto que não é mais o que está na `main`.
2. **O commit é a prova.** As lanes provam trabalho citando o commit que mudou spec
   e código no mesmo ato. Em dois repositórios, essa prova vira "confie em mim".
3. **A junção é barata.** O que quebra na troca de máquina é o atalho, não o
   conteúdo — e recriá-lo custa uma linha de `mklink /J`.

**Condição de reabertura, e ela é concreta:** se ele quiser consumir as specs sem
clonar o código — Obsidian no celular, sincronização por Obsidian Sync, leitura por
alguém que não é da engenharia — nasce um espelho **somente leitura** de
`leela-specs` num repositório próprio, alimentado por push automático a cada merge
na `main`. É um comando de configuração e não muda nada do que já existe. Basta pedir.

O que **não** acontece nessa reabertura: a fonte da verdade continuar sendo este
repo. O espelho é cópia de leitura. Escrever no espelho seria criar o segundo
relógio que a decisão acima recusa.

---

## Regras de negócio desta leva

Nenhuma RN nova. A leva decide arquitetura de repositório e processo de migração,
e nenhuma delas encosta em regra de produto.

## O que fica com o dono, nesta leva

- **Nada novo.** As onze decisões abertas do painel continuam as mesmas, e a leva 26
  não acrescentou nenhuma.
- **O que muda de forma:** todas elas agora têm um índice único e navegável em
  [[MIGRACAO-DE-MAQUINA]], que é o doc para abrir primeiro no computador novo.
- **Se ele quiser o espelho read-only das specs**, é só dizer — a condição de
  reabertura da 26.3 está escrita para isso.
