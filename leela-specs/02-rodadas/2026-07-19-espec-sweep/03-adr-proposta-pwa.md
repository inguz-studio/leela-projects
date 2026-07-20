---
tags: [leela, rodada, espec-sweep, adr-proposta, pwa, e13]
aliases: [ADR-proposta PWA, App v1 como PWA]
atualizado: 2026-07-19
status: PROPOSTA — decisão do Vitor, não da lane
---

# 03 · ADR-proposta · onde mora o app do atleta como PWA

> **Isto não é uma decisão.** É a proposta que a lane de spec devolve para o Vitor decidir. Muda arquitetura, então é type-1. Quando for ratificada, vira `03-canon/adr/ADR-018-app-atleta-pwa.md` e o E13 passa a citá-la.

## Contexto

Em 2026-07-18 o Vitor decidiu: *"o app v1 pode ser um PWA, não tem problema."* A spec vigente do E13-slim (lote 5 da trilha `next-trail-onda3`, escrita em 2026-07-17) assume **Expo nativo**: `apps/mobile`, Expo Router, EAS Build/Submit, credenciais de loja, Detox/Maestro, push por FCM nativo. Nada disso sobrevive à decisão sem revisão.

A pergunta que precisa de resposta antes de qualquer linha de código: **o PWA é uma área nova dentro da landing, um app separado no monorepo, ou a landing inteira vira instalável?**

## O que está em jogo

O atleta faz duas coisas em superfícies hoje separadas:

1. **Descobre e compra** — página pública de evento, checkout. Isso vive na `apps/landing`, é SSR/ISR, precisa ser rápido e indexável pelo Google. É onde o dinheiro entra.
2. **Usa o que comprou** — meus ingressos, QR na largada, clube, feed, avisos. Isso não existe ainda e é o que o app v1 entrega.

Um PWA tem **escopo**: o conjunto de URLs que abrem dentro da janela instalada. Sair do escopo abre o navegador. Se o escopo cobrir só a área logada, o atleta que toca "ver eventos" dentro do app é jogado para fora dele no meio da compra — a pior costura possível, e justamente no caminho do dinheiro.

Um service worker também **cacheia**. Cache agressivo na página pública de vendas serve preço velho, lote encerrado e vaga que não existe mais. Isso não é bug de UI, é venda errada.

## As opções

### Opção A · a landing vira instalável, com área logada `/app`

Um só Next.js. Manifest com `scope: "/"`, área do atleta em `/app/*` sob autenticação. Service worker único, com política de cache **conservadora**: network-first para HTML (nunca serve página de vendas velha), cache-first só para assets versionados e para o ingresso/QR do atleta.

- **A favor:** reuso máximo — checkout, páginas de evento, design system, api-client, gate de marca e gate de SEO já existem e continuam valendo. Zero build novo. O atleta nunca sai do escopo: descobrir, comprar e usar acontecem na mesma janela. Menos máquina para operar.
- **Contra:** um service worker mal escrito afeta a superfície pública. O risco é real e é mitigável por política de cache, não por separação de app.
- **Custo de reverter:** baixo. Tirar o manifest e o service worker devolve a landing ao estado atual.

### Opção B · app separado `apps/atleta` em subdomínio próprio

Segundo Next.js no monorepo, domínio próprio, service worker isolado.

- **A favor:** isolamento total do cache; a landing pública não corre risco nenhum.
- **Contra:** **não resolve o problema do escopo — piora.** Comprar continua sendo na landing, que agora está em outro domínio: o atleta sai do app instalado toda vez que vai comprar, e a sessão precisa atravessar domínios. Duplica shell, deploy, monitoramento e gate visual. Mais máquina para o mesmo produto.
- **Custo de reverter:** alto — é um app a mais no monorepo.

### Opção C · manter `apps/mobile` e usar Expo Web

- **Contra:** carrega o peso do React Native sem entregar loja. Pior dos dois mundos. Registrada para não ser reproposta.

## Recomendação da lane

**Opção A**, com três travas explícitas que fazem parte da proposta e não são detalhe de implementação:

1. **HTML sempre network-first.** Nenhuma página de vendas, evento ou checkout é servida do cache. Offline em página pública mostra estado offline honesto, nunca conteúdo velho.
2. **O que pode ser cacheado é nomeado, não inferido:** assets com hash no nome, e o ingresso com o QR do atleta. Só isso.
3. **O gate de SEO da landing roda depois do service worker subir.** Se o Google passar a ver conteúdo diferente do usuário, o gate falha e o service worker sai.

O raciocínio é o de sempre nesta casa: a solução que resolve com menos máquina, desde que a rede de segurança seja executável. Aqui ela é — o gate de SEO e o gate de marca já existem e passam a cobrir também o service worker.

## O que a decisão destrava e o que ela custa

**Destrava:** o bloqueio de enrollment das lojas some (era pré-requisito de `S1300-T2`), e com ele a espera que segurava o lote 5 inteiro. O app v1 passa a poder subir na mesma cadência do resto do produto.

**Custa:** push. Web Push funciona no Android e no desktop; no iOS só depois de o usuário instalar o app na tela de início, e sem as garantias de entrega que o FCM nativo dá. O JTBD que o push serve é central — *"assessoria manda treino, recebo dentro do app, elimino o WhatsApp"*. A proposta é aceitar o custo com um plano de contingência: **inbox in-app como fonte de verdade** (o aviso sempre está lá quando o atleta abre) e **e-mail pelo Brevo** como o canal que não depende de instalação. Push vira reforço, não o mecanismo de entrega.

Isso também é decisão do Vitor: se notificar o atleta com garantia for requisito de v1, a resposta muda e o app nativo volta à mesa.

## Perguntas que voltam para o Vitor

1. **Opção A, B ou C?** A lane recomenda A.
2. **Push sem garantia no iOS é aceitável na v1?** Se sim, seguimos com inbox + e-mail e push como reforço. Se não, o PWA não atende e a decisão de 18/07 precisa ser revista.
3. **O app instalável usa o mesmo domínio da landing?** É consequência de A, mas tem efeito de marca — o atleta instala um ícone que aponta para o domínio do produto.
