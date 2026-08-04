---
tags: [leela, testes, gates, emulador, ci, validacao-externa]
atualizado: 2026-08-04
---

# Leela · como rodar e verificar

Como subir o projeto na sua máquina, quais gates existem, o que cada um cobre e, com a mesma clareza, o que eles não provam. Os comandos foram lidos dos scripts e das configurações do repositório em 04/08/2026; nenhuma suíte foi executada para escrever este documento, porque outras frentes estavam trabalhando na mesma árvore.

Onde um comando não existe, está dito que não existe. Preferimos a lacuna declarada ao comando inventado.

## Antes de começar

Node 20 ou maior, pnpm 11.9.0, `firebase-tools` (a CI fixa a versão 15.22.4) e **Java 21**, que os emuladores exigem. O `preview.sh` procura o Java num caminho fixo, `~/.jdks/jdk-21.0.11+10`, e reserva 1 GB de heap porque 512 MB derrubavam o emulador de Functions no meio da carga de dados.

Duas instruções do `README.md` do repositório estão erradas e vão custar tempo a quem seguir:

O `README` manda copiar `.env.example` para `.env`. Não copie. O `.env.example` da raiz tem 21 KB de configuração do framework de orquestração Nirvana, que nada tem a ver com o produto. Os modelos reais são `functions/.env.example` e os três arquivos `.env.leela-hub` versionados. Nenhuma suíte de teste precisa de `.env`.

O `README` também nomeia `VITE_USE_FIREBASE_EMULATOR` e `NEXT_PUBLIC_USE_FIREBASE_EMULATOR`. Essas variáveis não existem em lugar nenhum do código. Os nomes reais são `VITE_USE_EMULATOR` e `NEXT_PUBLIC_USE_EMULATOR`.

## Subir o projeto

O caminho mais curto para ver o painel funcionando com dados é um comando:

```bash
bash preview.sh
```

Ele constrói o que precisa, sobe os emuladores em portas alternativas (Firestore 8180, Auth 9198, Functions 5201, Storage 9299, painel de emulador 4001), abre o Vite a partir da porta 5273 e semeia a base. **Use sempre o endereço que ele imprime**, porque a porta avança quando a primeira está ocupada. O login é `marina@demo-leela.dev` com senha `demo1234`, e há atalhos por papel em `/?preview=castelo`, `/clubes?preview=corrida` e `/plataforma?preview=admin`. Ctrl+C derruba tudo.

O `preview.sh` sobe o painel e não sobe a landing. A receita da landing contra o mesmo emulador está em `.nirvana/HANDOFF.md`, e ela tem uma sutileza que já derrubou o botão de compra uma vez: as variáveis `NEXT_PUBLIC_*` precisam existir **no momento do build**, porque o Next as embute no pacote do navegador. Defini-las depois, no `start`, não adianta.

Para subir peça por peça:

```bash
pnpm --filter @leela/painel dev      # Vite na 5173
pnpm --filter @leela/landing dev     # Next na 3000
npm --prefix functions run serve     # build + emulador de functions
```

### A armadilha do relógio

Os dados de exemplo foram desenhados em torno de uma data fixa, 15/03/2026. Sem `LEELA_CLOCK` apontando para lá, todo evento aparece com "Inscrições encerradas" e nenhum lote fica ativo. A landing lê essa variável sem nenhuma trava de ambiente; nas functions ela só vale sob emulador.

Há uma ponta solta honesta aqui: o `preview.sh` não exporta `LEELA_CLOCK` em lugar nenhum, e o script que reancora as datas do seed é usado apenas pelo seed de produção. Quem subir o preview vai encontrar a base desenhada para março de 2026 com o relógio real das functions. Não sabemos como isso foi conciliado, e a pergunta fica para o time.

## Os gates

```bash
pnpm install --frozen-lockfile
pnpm turbo run lint
pnpm turbo run type-check
pnpm turbo run build
```

As suítes que não precisam de emulador:

```bash
pnpm --filter @leela/painel test           # 194 arquivos
pnpm --filter @leela/design-system test    #  59 arquivos
pnpm --filter @leela/landing test          #  42 arquivos
```

A suíte das functions precisa de emulador, e precisa de mais emulador do que a CI sobe:

```bash
firebase emulators:exec --only firestore,auth,storage --project demo-leela \
  "pnpm --filter @leela/functions test"
```

O fim de linha ponta a ponta:

```bash
pnpm exec playwright install chromium
pnpm test:e2e
```

### O que cada suíte cobre

A suíte das functions tem 204 arquivos e é a mais pesada do projeto, com 92 deles de integração. Ela cobre checkout e o contrato com o gateway, as Rules do Firestore e do Storage como suítes adversariais, agregação de CRM com minimização de dado pessoal, clubes e desafios, cupom e estorno, os e-mails transacionais, provisionamento de tenant e finanças.

O painel tem 194 arquivos, roda em jsdom sem emulador nenhum e exercita telas contra dados simulados. A landing tem 42 arquivos e é quase toda funil de compra: 24 dos 42 começam com `checkout-`. O design system tem 59 e cobre componente por componente, mais a regra de lint que proíbe cor fora de token.

### Quatro pegadinhas que fazem o verde mentir

`pnpm turbo run test` **pula três pacotes em silêncio**: `packages/core`, `packages/api-client` e `apps/mobile` não têm script `test`. Não há aviso e não há falha. Os dois primeiros também não têm um único arquivo de teste; o núcleo de domínio é exercitado indiretamente, de dentro da suíte das functions.

O script `test:rules` engana pelo nome: ele roda **um** arquivo, com sete casos. A cobertura real de Rules está espalhada por cerca de 34 arquivos, e não existe comando que rode todos. Selecioná-los exige passar um glob direto ao vitest.

Sem o emulador de Storage no ar, a suíte de Rules de Storage **não pula, ela morre**. A guarda de skip olha para a variável do Firestore, e a porta do Storage está fixa em 9199 sem possibilidade de sobrescrever. Rodar com Firestore de pé e Storage de pé é a diferença entre setenta e um casos avaliados e setenta e um casos perdidos por conexão recusada.

Duas suítes só rodam quando alguém pede, e nenhuma das duas está agendada em lugar nenhum: o contrato com o gateway Asaas, atrás de `ASAAS_E2E=1`, e o envio real pela Brevo, atrás de quatro variáveis simultâneas. As duas batem em serviço de terceiro de verdade. Rode-as pelo filtro do pnpm ou direto pelo vitest, nunca por `turbo run test`, porque o modo estrito de ambiente do Turborepo não repassa essas variáveis.

## O que o Playwright cobre

Menos do que o nome sugere. Existe um arquivo de especificação, com dois testes, que verificam se `/health` responde no painel e na landing. Rodam contra servidores locais que o próprio Playwright levanta, nunca contra ambiente publicado. A jornada de compra, a autenticação e todas as telas ficam de fora.

## A CI não é gate

A CI existe, é bem escrita e roda a cada push. Ela não bloqueia nada, por três razões verificáveis.

O projeto quase não usa pull request: são 1307 commits e dois merges na história inteira, ambos feitos à mão. O trabalho entra direto na `main`, então a execução disparada pelo push acontece **depois** de o código já estar lá. A CI sobe apenas o emulador de Firestore, o que deixa de fora quatorze arquivos que precisam de Auth e a suíte de Storage inteira. E o Playwright só roda de madrugada por agendamento, nunca em push nem em pull request.

Os dois arquivos de workflow foram escritos em 02 e 03/07 e não foram tocados desde então, enquanto a suíte cresceu para cerca de 500 arquivos. O workflow de preview aponta para um alvo de hosting que não existe em configuração nenhuma; ele está morto como escrito.

O gate real, hoje, é a máquina de quem escreveu o código.

## O que os gates não provam

Esta é a parte que separa documentação honesta de folheto. O projeto tem perto de 6.840 casos verdes e 109 mil linhas de teste, e ainda assim a compra em produção não funcionou até 03/08. O argumento medido, com o método de cada número, está em [[laudo-testes-2026-08-04]]. Não vale repetir aqui; vale dizer onde olhar.

A §1.5 do laudo enumera sete pontos cegos, e estes são os títulos, para servir de índice:

- **A** · o gate testa o núcleo, e produção quebra no invólucro
- **B** · o ambiente de teste garante justamente o que produção não garante
- **C** · nenhum teste olha o artefato que sobe
- **D** · 81 dos casos reportados não avaliam asserção nenhuma
- **E** · o verde é o da máquina de quem escreveu, e ele já mentiu
- **F** · o teste de contrato do gateway existe, e teria pego o defeito
- **G** · nada verifica que o que subiu está de fato rodando

Duas ausências estruturais completam o quadro e não estão em nenhuma das sete. Não há instrumentação de cobertura instalada em pacote nenhum, então ninguém sabe o que não está coberto. E não há teste por propriedade: as 145 varreduras manuais de valores são listas escritas à mão, não geradores.

A §3.2 do mesmo laudo traz um plano em três ondas com custo estimado por item. A ordem dele foi construída por risco ao dinheiro, e a primeira recomendação paga sozinha o esforço da segunda.

## Vizinhos

[[onboarding-externo]] para a ordem de leitura. [[arquitetura-do-sistema]] para entender o que você está testando. [[estado-real]] para o que está no ar. [[estrategia-testes]] guarda a estratégia planejada na fase de desenho, que é documento de intenção e não retrato do que existe.
