---
tags: [leela, arquitetura, monorepo, functions, pagamento, deploy, validacao-externa]
atualizado: 2026-08-04
---

# Leela · arquitetura do sistema

Mapa de como o produto está montado: quais aplicações existem, o que cada pacote carrega, quem fala com quem, onde mora a fronteira do dinheiro e como cada superfície vai ao ar. Escrito para quem nunca abriu este repositório e precisa formar julgamento próprio sobre ele.

A organização de pastas e as regras de estilo de código vivem em [[convencoes-codigo]]. As coleções do banco vivem em [[modelo-de-dados-firestore]]. Este documento não repete nenhum dos dois; ele descreve a topologia e os limites que nenhum dos dois cobre.

## O monorepo

Turborepo sobre pnpm workspaces. Node 20 ou maior, pnpm fixado em 11.9.0 pelo campo `packageManager`. Sete pacotes, declarados em `pnpm-workspace.yaml` como `apps/*`, `packages/*` e `functions`.

| Pacote | O que é | Stack |
|---|---|---|
| `@leela/painel` | SPA do organizador e do administrador | Vite 5 + React 18 + React Router 6 + TanStack Query 5 |
| `@leela/landing` | vitrine pública, página de evento e checkout | Next.js 14 App Router, com SSR |
| `@leela/mobile` | app do atleta | Expo 56 + React Native 0.79 |
| `@leela/core` | tipos do domínio e o núcleo puro de derivação | biblioteca tsup, sem framework |
| `@leela/api-client` | cliente tipado do Firebase, callables e leituras | SDK `firebase` 11 |
| `@leela/design-system` | tokens, componentes e temas | Radix e Tailwind |
| `@leela/functions` | backend em Cloud Functions | `firebase-functions` 6, usando a API v1 |

A direção das dependências é a parte que importa, e ela é disciplinada:

```
core ──► functions, api-client, painel, landing, mobile
api-client ──► painel, landing
design-system ──► painel, landing
functions ──► core, e nada mais
```

`core` não depende de ninguém e é a verdade compartilhada entre cliente e servidor. As functions nunca importam o `api-client` nem o design system. O app mobile só conhece o `core`.

Duas armadilhas de instalação estão declaradas no `pnpm-workspace.yaml` e merecem leitura antes do primeiro `pnpm install`. React e React DOM estão travados em 18.3.1 por `overrides`, porque `recharts` puxaria React 19 para o workspace inteiro. E o `apps/mobile` declara React 19 no próprio manifesto, contrariando esse travamento, sem resolução documentada em lugar nenhum.

## O backend

`functions/src/index.ts` exporta 89 símbolos e é, de longe, a melhor leitura isolada de onboarding do repositório: cada export carrega no comentário a RN ou a ADR que o justifica. O código é organizado por domínio, uma pasta por assunto.

Por natureza de gatilho, os 89 se distribuem assim: 56 callables, 19 gatilhos de Firestore, 10 agendadas, 3 HTTP e 1 gatilho de criação de usuário. As três HTTP são as que aceitam tráfego de fora sem passar por autenticação de usuário: `pagamentoWebhook`, `asaasWebhook` e `ingressoPorLink`.

As dez agendadas são o relógio do produto, e vale conhecê-las porque muito comportamento só existe por causa delas.

| Função | Cadência | O que faz |
|---|---|---|
| `recalcularStatusMembros` | 03h00 | envelhece o status de membro de clube |
| `coletaDiaria` | 03h05 | grava o retrato diário dos indicadores |
| `encerrarEventos` | 03h10 | encerra evento no dia seguinte ao da realização |
| `expurgarSaude` | 03h20 | expurgo LGPD dos dados de saúde após a retenção |
| `virarLoteCron` | 5 min | vira lote por data |
| `expirarCarrinhosAbandonados` | 5 min | marca carrinho vencido |
| `dispatchCampanhasAgendadas` | 5 min | dispara campanha agendada |
| `dispatchAutomacoes` | 5 min | dispara automação de kit, véspera e pós-evento |
| `varrerEstornosOrfaos` | 15 min | estorna pagamento confirmado depois do cancelamento |
| `varrerIngressosOrfaos` | 15 min | reemite ingresso de pedido pago que falhou |

Três delas não declaram fuso e caem no padrão UTC: `virarLoteCron`, `dispatchCampanhasAgendadas` e `dispatchAutomacoes`. Para cadência de cinco minutos isso é inofensivo, e está registrado aqui porque as outras sete declaram, o que sugere esquecimento e não escolha.

O emulador iniciado sem pubsub não roda nenhuma agendada. Por isso toda função agendada do projeto é uma casca fina sobre um `*Core(db, …)` testável diretamente, que é a ADR-015 e é seguida sem exceção.

## A fronteira do dinheiro

Existe um único cliente HTTP do gateway em todo o repositório: `functions/src/payments/asaasProvider.ts`. Nenhum outro arquivo fala Asaas.

O ambiente não vem de flag, vem do prefixo da chave. Uma chave `$aact_hmlg_` é sandbox, qualquer outra `$aact_` é produção, e uma configuração que declare o contrário da chave lança erro em vez de obedecer. Produção exige, além disso, uma autorização explícita por variável de ambiente. Sem chave nenhuma, o seletor devolve um provedor de mentira; com chave mal configurada, ele lança. O que não existe é degradar para o mock em silêncio quando alguém esperava cobrança real.

A porta de entrada do dinheiro é o webhook. `asaasWebhook` autentica por **token compartilhado em cabeçalho**, não por assinatura HMAC, porque o Asaas não assina: ele devolve o token cadastrado. A comparação é feita em tempo constante, sobre o hash dos dois lados, antes de qualquer leitura de campo de negócio. A ordem é invariante e importa para quem for auditar: verificar, depois interpretar, depois deduplicar.

Contra reprocessamento há três camadas duráveis. Um registro por entrega, gravado na mesma transação que os efeitos. Uma guarda de transição única, que só deixa mudar quem está pendente. E uma conferência cruzada de identificador e de valor congelado, que rejeita com 409 um webhook validamente assinado que traga o valor errado.

Uma lacuna vale ser dita em voz alta: `asaasWebhook` não tem teto de instâncias, nem limitador de taxa, nem lista de IPs. O token compartilhado é o único controle daquela porta. A função vizinha `ingressoPorLink` declara teto de dez instâncias; o webhook não declara nenhum.

O reembolso tem uma primitiva só, `estornarInscricao`, e todo o resto delega a ela. A política de reembolso decide, mas nunca chama o gateway por conta própria. Cancelar sem estornar é um caminho separado, que não toca em gateway nem em segredo.

Os segredos de verdade, ligados por `runWith`, são seis famílias: a chave do Asaas, o token do webhook, a semente do identificador de cliente no CRM, a chave da Brevo, o chaveiro de assinatura do QR e a chave que cifra dados bancários. Um teste de contrato mantém essa lista honesta, percorrendo o grafo de import de cada export e reprovando quem usa um segredo que não declarou.

> [!warning] O `functions/.env.example` está incompleto
> Ele documenta seis variáveis e omite o token do webhook, a autorização de produção, a chave da Brevo, o remetente e a chave de dados bancários. Todas são exigidas pelo código. Duas que ele documenta, `ASAAS_PROD_API_KEY` e `ASAAS_SANDBOX_API_KEY`, não são lidas por nenhuma linha do projeto.

## Como cada superfície vai ao ar

Há dois apelidos de projeto e apenas dois, em `.firebaserc`: `default` aponta para `demo-leela`, que é um projeto de demonstração usado só por emulador, e `prod` aponta para `leela-hub`, que é o projeto real. Não existe apelido de preview.

O repositório usa um padrão que vale entender antes de rodar qualquer comando: **uma configuração por propósito**, em vez de um `firebase.json` que faz tudo.

| Arquivo | Para que serve |
|---|---|
| `firebase.json` | suíte de testes e emuladores padrão; não declara hosting |
| `firebase.preview.json` | preview local isolado, em portas alternativas |
| `firebase.prod.json` | deploy real do backend e do painel (site `leela-hub`) |
| `firebase.landing.json` | deploy real só da landing (site `leela-landing`) |
| `firebase.r6.json` | emulador isolado para testes de Rules |

O desenho é deliberado e defensável: a configuração da landing declara um site e mais nada, então por construção aquele deploy não alcança as functions nem as Rules que já estão em produção.

O deploy das functions passa por um diretório gerado, `functions-deploy`, e a razão está documentada no script. O Cloud Build roda `npm install` puro e não entende o protocolo `workspace:*` do pnpm, o que derrubou o primeiro deploy real. O `bundle-deploy.mjs` resolve isso empacotando o `@leela/core` dentro de um arquivo único.

A landing tem script próprio de deploy, que carrega o env do projeto real e aborta se encontrar o modo emulador ligado ou a variável de relógio definida. O painel não tem script equivalente; sobe por comando manual apontando para a configuração de produção. Essa assimetria é uma lacuna real de documentação, e o efeito dela está descrito em [[estado-real]].

Nenhum dos dois deploys passa por CI. Ambos são disparados de uma estação de trabalho.

## Onde este mapa diverge do banco documentado

O [[modelo-de-dados-firestore]] descreve bem o domínio central e está desatualizado nas bordas. Cerca de 73 nomes de coleção são alcançáveis a partir do código, e o `firestore.rules`, com 59 blocos `match`, é hoje o registro mais fiel do que existe. Não há módulo central de constantes: os nomes vivem espalhados por domínio.

Três divergências merecem atenção de quem for validar. O documento se contradiz sobre `pagamentos`, que aparece como coleção de topo numa linha e como subcoleção de evento em outra; o código usa a de topo. Há mais de vinte coleções vivas no código que o documento não menciona, entre elas `carrinhos`, `cobrancasPixAtivas`, `rateLimits` e as subcoleções de webhook e de estorno. E há coleções no documento que não existem em código nenhum, como `config/system` e `platform/billing`.

Nada disso foi corrigido por esta lane. Fica registrado para virar tarefa.

## Vizinhos

[[onboarding-externo]] para a ordem de leitura. [[como-verificar]] para rodar o projeto e os gates. [[estado-real]] para o que está no ar. [[ADR-stack]] e os demais registros em `03-canon/adr/` para as decisões que produziram esta forma.
