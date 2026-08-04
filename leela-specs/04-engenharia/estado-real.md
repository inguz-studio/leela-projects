---
tags: [leela, estado, deploy, divida-tecnica, validacao-externa]
atualizado: 2026-08-04
trace: leela-build-2d6ee98d
---

# Leela · estado real do sistema

Retrato do que existe, do que está servindo tráfego e do que está construído sem estar no ar, em 04/08/2026. O documento existe por um motivo específico: um validador externo que descobre sozinho uma lacuna que a casa já conhecia para de confiar em todo o resto que leu.

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

### O painel nunca subiu ao canal de produção

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

Os dois eventos são `noturna-beira-mar-2026` e `retiro-bem-estar-rio-vermelho-2026`. Ambos devolvem HTTP 200 e o texto "Inscrições encerradas" na madrugada de 04/08, enquanto o servidor cotaria a compra sem reclamar. A vitrine decide pelos lotes e o motor decide pelo preço; discordam.

## O que este documento não cobre

Cobertura de teste por pacote não existe medida, porque nenhum pacote tem instrumentação de cobertura instalada. Isso não é omissão do documento, é ausência no projeto, e está registrado em [[laudo-testes-2026-08-04]] §2.5. Qualquer afirmação sobre "o que não está coberto" hoje é inferência, não medida.

Também não há aqui nenhuma medida de performance, custo de infraestrutura ou disponibilidade histórica. Sentry está previsto e o endereço dele em produção nunca foi conferido, o que é o item 11 do painel.

## Vizinhos

[[onboarding-externo]] para a ordem de leitura. [[arquitetura-do-sistema]] para o mapa dos apps e das functions. [[como-verificar]] para rodar os gates e entender o alcance deles.
