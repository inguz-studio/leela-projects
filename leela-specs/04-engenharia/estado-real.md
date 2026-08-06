---
tags: [leela, estado, deploy, divida-tecnica, validacao-externa]
atualizado: 2026-08-06
trace: leela-pixreal-diag-20260804
---

# Leela · estado real do sistema

Retrato do que existe, do que está servindo tráfego e do que está construído sem estar no ar, em 04/08/2026, **com uma emenda de 06/08 que muda a conclusão principal**. O documento existe por um motivo específico: um validador externo que descobre sozinho uma lacuna que a casa já conhecia para de confiar em todo o resto que leu.

> ⚠️ **Emenda de 06/08 · a seção "Construído, revisado e fora do ar" envelheceu, e envelheceu bem.** Na noite de 05/08 tudo o que estava represado subiu, num deploy só, com cada passo confirmado relendo o servidor: painel, landing, regras do Firestore, regras do Storage e vinte e uma das noventa e seis funções. **O painel passou a ter release no canal de produção** — `https://leela-hub.web.app` deixou de devolver a página de erro do Firebase —, e com ele o botão "Entrar" da landing pública deixou de cair no vazio. Onde este documento disser "construído e fora do ar", leia a emenda antes. Prova passo a passo em `.nirvana/handoffs/leela-deploy-tudo-0805.md`; o selo da rodada está em [[V1-CHECKLIST]] §RODADA 2026-08-05/06.
>
> **O que continua fora do ar:** o conserto da redefinição de senha, que é posterior ao deploy e está em review. Ele importa: a proteção contra enumeração de e-mail está ligada no projeto, e desde então **todo pedido de senha para endereço sem conta morre como falha de infraestrutura**. Quem tem conta continua sendo atendido.
>
> **O que a emenda não conserta:** o número de functions deste documento (89 exportadas) está velho — hoje são 96 no código e 97 no projeto, contando a da landing. E a tabela de dívida abaixo ganhou uma linha que não estava lá: o projeto tem **zero políticas de alerta, zero métricas de log e zero canais de notificação**, então falha nova continua invisível até alguém abrir o log.

Isto não substitui o painel do dono. As decisões abertas, com opções e default em vigor, vivem em [[DECISOES-ABERTAS]] e continuam sendo a lista viva de tudo que espera resposta. Aqui fica a camada que o painel não carrega: endereços, artefatos, e a forma de conferir cada afirmação sem pedir acesso a ninguém.

## Como ler as medidas

Toda linha marcada como medida veio de uma requisição HTTP feita da linha de comando na madrugada de 04/08/2026. O comando vai junto para que o leitor refaça a conta em vez de acreditar. Onde a fonte é outra apuração, o laudo está citado pelo nome e pela data, porque medida tem prazo de validade e a deste documento é curto.

## O que está no ar

| Superfície | Endereço | Medida |
|---|---|---|
| Landing pública | `https://leela-landing.web.app` | HTTP 200 |
| Painel do organizador | `https://leela-hub--preview-y4n0cxzj.web.app` | HTTP 200, canal de preview |
| Página de evento à venda | `https://leela-landing.web.app/meia-floripa-2026` | HTTP 200, compra alcançável |
| Logo usada nos e-mails | `https://leela-landing.web.app/brand/leela-wordmark-email.png` | HTTP 200, `image/png` |

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://leela-landing.web.app/
```

As Cloud Functions e as Rules do Firestore e do Storage estão deployadas no projeto `leela-hub`. O `functions/src/index.ts` exporta hoje 89 símbolos, e o número que está no ar é menor: o último deploy foi nominal, com dezesseis functions, em 04/08 às 00h47. A lista de segredos ligados a cada function foi medida pela lane INV-EMAIL-INGRESSO às 00h13 com `firebase functions:list` e `firebase functions:secrets:get`, antes desse deploy. Quem quiser refazer a medida precisa de credencial do projeto.

O deploy das dezesseis consertou uma classe de defeito que já tinha custado compras duas vezes: a function usava um segredo que a declaração `runWith` dela não pedia. `asaasWebhook` passou a declarar a chave de assinatura do QR e `varrerIngressosOrfaos`, que não declarava nenhum segredo, passou a declarar dois. Um teste de contrato agora percorre o grafo de import de cada export e reprova a próxima omissão.

## Construído, revisado e fora do ar

Esta é a seção que costuma faltar em documentação de projeto, e é a que mais importa para quem valida.

### O painel nunca subiu ao canal de produção — ⚠️ superado em 05/08

> **Superado, e o registro fica.** O painel subiu ao canal de produção pela primeira vez em 04/08 às 04h55Z e recebeu a segunda versão em 06/08 às 02h26Z, com os arquivos servidos byte a byte iguais ao build local. `https://leela-hub.web.app` responde com o painel. O parágrafo abaixo descreve o estado da madrugada de 04/08 e está preservado porque ele é o que explica o botão quebrado que a landing serviu por dias.

O site de Hosting `leela-hub` existe na configuração (`firebase.prod.json` declara `site: leela-hub` servindo `apps/painel/dist`), e o canal live dele não tem release. `https://leela-hub.web.app` devolve **HTTP 404 com a página "Site Not Found" do próprio Firebase**, e o mesmo vale para `https://leela-hub.firebaseapp.com`. O painel que o dono usa hoje é um canal de preview, que é temporário por natureza e expira.

A consequência é visível para qualquer visitante. A landing em produção serve o botão de entrada com o endereço absoluto do canal live:

```bash
curl -s https://leela-landing.web.app/ | grep -o 'href="[^"]*entrar[^"]*"'
# href="https://leela-hub.web.app/entrar"
```

Quem clica em "Entrar" ou "Criar conta" na landing pública cai na página de erro do Firebase. O default está em `apps/landing/lib/painel.ts` (`PAINEL_URL_PADRAO`) e é sobrescrito por `NEXT_PUBLIC_PAINEL_URL`, que o build em produção não tem. O mesmo endereço é o default de `LEELA_PAINEL_URL` em `functions/src/auth/linkDeAcao.ts`, que é para onde o link de redefinição de senha vai apontar quando a function nova subir.

Nada disso é hipótese de laboratório. É o comportamento servido agora.

### A porta de entrada do organizador

Cadastro aberto, tela de convites no super-admin, resgate atômico e overlay bloqueante estão construídos e passaram por review antagonista em contexto fresco. O deploy não aconteceu. O item DEPLOY-1 do painel de decisões é dono dessa pendência, e o seed do primeiro código de convite está retido por causa do item LGPD-1.

### O fluxo de senha com a marca da casa

A identidade visual dos oito e-mails e a callable `solicitarRedefinicaoSenha` estão commitadas e verdes na suíte. Nenhuma delas foi deployada. O detalhe do que mudou e o que o deploy precisa saber está em [[12-identidade-email]]; o efeito prático para cada mensagem está em [[catalogo-de-emails]].

## Dívida conhecida

A tabela lista o que a casa já sabe que está quebrado ou frágil, com a forma de observar cada item. Nenhuma linha aqui é novidade descoberta neste documento: cada uma tem dono em outro artefato, e a coluna de rastro diz qual.

| Lacuna | Como observar | Rastro |
|---|---|---|
| Segredo usado por uma function sem estar no `runWith` dela | comparar o grafo de import com a declaração de cada export de `functions/src/index.ts` | [[laudo-testes-2026-08-04]] §1.5 A e §2.1 |
| Compra real nunca completada em produção | `createInscricaoCharge` segue sem sucesso no histórico | item 34 em [[DECISOES-ABERTAS]] |
| Dois eventos publicados e inacessíveis | `curl` nas páginas devolve "Inscrições encerradas" | card de 03/08 em [[DECISOES-ABERTAS]] |
| `expirarPixPendente` nunca executou | é `onCall`, não job agendado; exige aba aberta | [[laudo-testes-2026-08-04]] §2.7 |
| Conta de super-admin de produção nasceu do seed de demonstração | senha já rotacionada; o seed ainda a recria | ADMINSEP-3 em [[DECISOES-ABERTAS]] |
| `isPlatformAdmin()` não recebe `tenantId` nas Rules | 129 ocorrências, leitura cross-tenant | ADMINSEP-3 em [[DECISOES-ABERTAS]] |
| CI não é gate real | `.github/workflows/ci.yml` sobe só o emulador de Firestore | [[laudo-testes-2026-08-04]] §1.5 F |
| Endereço público ainda é marcador | `{DOMINIO_LEELA}` nas specs, remetente em Gmail pessoal | itens 12 e 66 em [[DECISOES-ABERTAS]] |
| **Zero políticas de alerta, zero métricas de log e zero canais de notificação** — o gancho de incidente existe no código e do outro lado não há ninguém | consultar as três superfícies de monitoramento do projeto `leela-hub`; as três devolvem vazio | item do CTO em [[DECISOES-ABERTAS]] §Fila de construção; medição em `.nirvana/handoffs/leela-senha-DIAG.md` §4 |
| **Redefinição de senha morre para endereço sem conta** — a proteção de enumeração está ligada e a biblioteca do servidor não sabe traduzir o desfecho | o conserto existe em `cb5922a7` e **não está no ar** | `.nirvana/handoffs/leela-senha-DIAG.md` |
| Nenhum teste olha o servidor; arquivo e produção divergem sem ninguém acusar | `node functions/scripts/prontidao-de-deploy.mjs` | [[o-que-so-a-producao-cobra]] · S039/S040 no [[V1-KANBAN]] |

Os dois eventos são `noturna-beira-mar-2026` e `retiro-bem-estar-rio-vermelho-2026`. Ambos devolvem HTTP 200 e o texto "Inscrições encerradas" na madrugada de 04/08, enquanto o servidor cotaria a compra sem reclamar. A vitrine decide pelos lotes e o motor decide pelo preço; discordam.

## O que este documento não cobre

Cobertura de teste por pacote não existe medida, porque nenhum pacote tem instrumentação de cobertura instalada. Isso não é omissão do documento, é ausência no projeto, e está registrado em [[laudo-testes-2026-08-04]] §2.5. Qualquer afirmação sobre "o que não está coberto" hoje é inferência, não medida.

Também não há aqui nenhuma medida de performance, custo de infraestrutura ou disponibilidade histórica. Sentry está previsto e o endereço dele em produção nunca foi conferido, o que é o item 11 do painel.

## Vizinhos

[[onboarding-externo]] para a ordem de leitura. [[arquitetura-do-sistema]] para o mapa dos apps e das functions. [[como-verificar]] para rodar os gates e entender o alcance deles.
