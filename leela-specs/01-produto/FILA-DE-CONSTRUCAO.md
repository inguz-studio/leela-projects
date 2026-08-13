---
tags: [leela, fila, produto, construcao]
atualizado: 2026-08-12
fonte: DECISOES-ABERTAS
---

# Fila de construção

> Saiu de [[DECISOES-ABERTAS]] em 12/08, com o conteúdo na íntegra: nada aqui é decisão pendente do dono, e por isso não cabe no painel. As pendências do CTO continuam nesta lista, com o rótulo delas preservado.

> Ordem ratificada por você em 28/07 (DEC-0728). Roda em sequência sem nova consulta, e o detalhe de cada frente vive no card do backlog em [[V1-KANBAN]] e no épico correspondente. As frentes que nasceram da sua leva de 03/08 estão no fim, ainda sem posição.
>
> **A exceção que morava aqui acabou em 09/08.** O **ADMIN-USUARIOS-1** pedia decisão sua e vivia nesta seção porque a pergunta dele é de escopo de fila. Ele subiu para o bloco das decisões, e esta seção voltou a ser só o que ela diz ser: trabalho ordenado, sem pergunta escondida dentro.
>
> **+05/08 · duas frentes desta lista saíram por estarem construídas:** o login no meio da landing e a área do cliente com os próprios ingressos. As duas perguntavam a posição na fila, e a pergunta ficou sem objeto — a noite de 05/08 construiu as duas, com o registro completo em `02-rodadas/2026-08-04-pos-pagamento/01-decisoes-dono.md` §O que a noite de 05/08 executou. **+05/08 (madrugada): a frente fechou** — Meus Clubes entrou (`4b72c556`+`b3e51638`) e a review da área rodou e consertou quatro defeitos. O que a construção da aba devolveu **é** seu, e virou o **CLUBES-1** acima: a tela nasce vazia porque não existe caminho para entrar num clube. **+05/08 (noite): as duas estão no ar.** O deploy tinha uma sequência obrigatória — quatro isenções de campo único antes das functions — e ela foi cumprida sem esforço: a conferência contra o servidor mostrou que os índices já batiam, arquivo e produção, então nada precisou subir ali.

## Construída e revisada · porta de entrada do organizador

A landing ganhou "Entrar" e "Criar conta", o cadastro abre com acesso travado por overlay de código de convite, e os códigos são geridos por você no super-admin. *Hoje um organizador novo não tem onde clicar para entrar, e quando entrar ninguém controla quem usa a plataforma.*

- **O que fica com você:** **nada**. As duas que ficavam fecharam: o **DEPLOY-1** em 09/08 (a máquina sobe no próximo deploy) e o **LGPD-1** na leva 7 de 11/08 (*"o aceite é obrigatório, e registrado no banco"*), que era o que retinha o seed do primeiro convite. As dez premissas vetáveis seguem valendo por default sem veto seu.
- **Por que agora:** a construção terminou em 03/08 com as oito tarefas pagas, e a review antagonista fechou na madrugada de 04/08: dez vetores atacados, três defeitos achados e corrigidos, gate final verde nas seis superfícies. Nenhum dos três defeitos era de tela — um deixava a conta nascer sem registro, um vazava o oráculo de qual código existe, e um deixava o overlay bloqueante transparente.
- **Onde aterrissa:** lanes ONBOARD-BUILD e ONBOARD-REV, rodada `02-rodadas/2026-07-28-onboarding-organizador/`. O seed do primeiro código de convite **destravou em 11/08** com o LGPD-1 decidido, e sai junto do trabalho que o aceite passa a exigir: quando o registro de consentimento falta, o resgate recolhe o aceite dentro do próprio overlay. Sobra uma ponta menor, e ela não é sua: o CTA "Falar com o time Leela" está com o placeholder `contato@leela.app`, que morre junto com o item 12.

## Posição 1 · E10, consolidação das ativações de marcas

A tela de marcas existe e funciona, mas omite de propósito em quantos patrocínios cada marca é usada, porque não existe leitor barato para essa contagem e a casa não exibe número inventado. *A Marina apaga "Café Rota" sem saber que era o patrocinador de um desafio.*

- **O que fica com você:** nada. A ordem já está ratificada.
- **Por que agora:** item pequeno e isolado, por isso está cedo na fila. A auditoria achou um bloqueio que entra antes de tudo: nenhum vínculo guarda o id da marca, só o nome, e casar por nome perde o vínculo no primeiro rename.
- **Onde aterrissa:** S812, cinco tarefas em [[LEELA-E10-marcas]].

## Posição 2 · FORMBUILDER, formulários como template

O organizador monta perguntas próprias numa biblioteca com casa no menu principal, e cada evento ou clube só escolhe um template. Publicar versão nova não mexe em quem já usa. *Hoje o Castelo monta formulário fora do sistema e cruza duas planilhas na véspera.*

- **O que fica com você:** nada. Você puxou a frente em 28/07 e as regras estão fechadas.
- **Por que agora:** a v1 tem três tipos de pergunta, a resposta fica com o inscrito e nunca com o pedido, pergunta obrigatória bloqueia o pagar no mesmo ponto do servidor que já barra os aceites, e anexo de arquivo fica para a fase 2.
- **Onde aterrissa:** S313 e S310 em [[LEELA-E04-config-vendas]] · [[LEELA-E05-clubs]] · [[LEELA-E12-landing]].

## Posição 3 · E11, análise em CRM › Visão geral

O histórico diário já é coletado, com um retrato dos indicadores gravado por data todos os dias às 03:05, de forma idempotente. *A Marina troca o seletor de período para comparar 30 dias com os 30 anteriores e os números não mudam.*

- **O que fica com você:** nada.
- **Por que agora:** a consolidação dessa série é o gargalo do épico. Sem ela nenhuma das três telas de análise é despachável, e o seletor de período segue honestamente inerte, lendo sempre o retrato atual.
- **Onde aterrissa:** seis tarefas em [[LEELA-E11-analytics]].

## Posição 4 · E16, catálogo de benefícios da plataforma

Você, como administrador Leela, cadastra cupons de benefício e parceiros presenciais com endereço, descritivo, capa, logo e fotos. O cupom aqui não é o cupom de venda do organizador e não encosta em preço, taxa nem repasse.

- **O que fica com você:** confirmar essa leitura, se ela estiver errada. É barato refazer, porque nada foi construído em cima.
- **Por que agora:** prioridade baixa declarada por você em 28/07, e não bloqueia nada. Ficou no E16 porque quem escreve é o administrador da plataforma e o dado atravessa produtores.
- **Onde aterrissa:** [[LEELA-E16-plataforma-superadmin]] §"Catálogo de benefícios da plataforma".

## Entrou em 03/08 · uma conta só para quem é admin e organizador

Você decidiu que a mesma pessoa pode ser administradora da plataforma e usuária do painel com **uma conta só**, e que a tela de ver e trocar entre os papéis fica deliberadamente para depois. *Você entra com a sua conta e precisa decidir, na hora, se está olhando como Leela ou como produtor.*

- **O que fica com você:** nada agora. Adiado por sua decisão, não por falta de desenho.
- **Por que agora:** nada empurra. O roteamento do item 57 já resolve o caso comum, mandando cada papel para a casa dele.
- **Onde aterrissa:** [[LEELA-E16-plataforma-superadmin]], quando sair do gelo.

## Entrou em 03/08 · antecipação de recebíveis sob demanda

A tabela de juros do admin, que a PB-2 e a JUROS-2 destravam, é o primeiro degrau de uma visão maior que você declarou: juntar custo de parcelamento e custo de antecipação, aplicar markup e enxergar o faturamento da plataforma ao longo do tempo. A antecipação seria **sob demanda**, nunca automática, operada pelo painel admin e antecipando só o necessário para cobrir repasses.

- **O que fica com você:** nada agora. Suas palavras: "cena para os próximos capítulos".
- **Por que agora:** não empurra nada. Fica escrito para que a tabela de juros nasça com a coluna de custo já pensando nela.
- **Onde aterrissa:** [[LEELA-E09-financeiro-profissional]] · [[LEELA-E16-plataforma-superadmin]], depois da S1610.

## Entrou em 03/08 · dois eventos publicados estão inacessíveis em produção agora

A página pública decide se o evento está à venda olhando só para os lotes. Evento publicado que não tem lote serve "Inscrições encerradas", mesmo quando o servidor tem preço válido e cotaria a compra sem reclamar. A vitrine e o motor discordam, e quem perde é quem publicou. *O Castelo publica um evento, divulga o link e a página diz que as inscrições acabaram antes de a primeira começar.*

- **O que fica com você:** a posição na fila. A decisão embutida é qual das duas fontes manda, e ela é técnica: ou o lote continua sendo a única autoridade de venda, e então publicar sem lote passa a ser recusado ou avisado no painel, ou a página cai no preço legado quando não há lote.
- **Por que agora:** não é hipótese. `noturna-beira-mar-2026` e `retiro-bem-estar-rio-vermelho-2026` estão publicados e inacessíveis em produção **hoje**, achado medido pela lane de dados de teste de 03/08. **Prioridade alta na fila.**
- **Onde aterrissa:** `estadoVenda.ts` na landing e a validação de publicação no painel; ponta registrada em [[LEELA-E12-landing]].

## Entrou em 03/08 · a conta que nasce sem registro fica trancada do lado de fora

O cadastro grava a conta de login e o registro do organizador em dois passos. Se o segundo falhar, a conta existe e o registro não, e o login seguinte barra a pessoa com um aviso. Ela não consegue resgatar convite, porque o resgate vive atrás do login, nem se recadastrar, porque o e-mail já está em uso. *A organizadora se cadastra, a rede oscila no instante da gravação, e ela nunca mais entra na própria conta.*

- **O que fica com você:** a posição na fila. A causa que o formulário produzia sozinho já foi fechada pela review de 03/08; o que sobra é falha de rede, quota ou indisponibilidade.
- **Por que agora:** hoje a única recuperação é intervenção manual no super-admin, e isso não escala nem para o beta. Duas saídas possíveis, ambas de produto: o cadastro tentar de novo e mostrar na tela que faltou algo antes de a pessoa sair, ou a tela de entrar oferecer o campo de código quando barra — o que transforma o aviso em porta.
- **Onde aterrissa:** `CadastrarPage` e `EntrarPage`; RN-411, RN-446 e RN-449 em [[LEELA-E00-fundacao-tecnica]].

## Entrou em 03/08 · a borda que segura força bruta não está ligada (pendência do CTO)

Não é decisão sua, e está aqui só para você saber que existe e quem a carrega. O teto de tentativas do resgate de convite é por conta, e o cadastro é aberto: o teto global é cinco vezes o número de contas que alguém criar. O que torna a adivinhação inviável é o tamanho do espaço de códigos, quase 10¹², não o limitador. O throttle volumétrico de verdade é da borda — App Check e Cloud Armor —, e nenhum dos dois está ligado.

- **O que fica com você:** nada. Vai para o **CTO humano**, junto do item 62 (`minInstances`), porque é julgamento de custo de infraestrutura.
- **Por que agora:** o custo de deixar assim é faturado — cada tentativa é uma invocação de função mais uma transação no banco. Entrava na conta do DEPLOY-1, que foi decidido em 09/08 pela subida no próximo deploy — então o cadastro aberto fica exposto a partir dele, e a borda continua desligada.
- **Onde aterrissa:** seção "Pendência do CTO" em `02-rodadas/2026-08-02-retomada/08-achados-dono-0803.md`; ponta técnica registrada em [[LEELA-E16-plataforma-superadmin]].
- **+05/08 · a borda ganha um consumidor novo, e ele dispara e-mail.** A spec de `02-rodadas/2026-08-05-contas-landing/` cria o pedido de código de seis dígitos: superfície pública, anônima, e que manda uma mensagem a cada chamada. O limitador por **alvo** existe e está especificado (RN-476: três em quinze minutos e dez em vinte e quatro horas por endereço), e não há chave por origem dentro da aplicação, por decisão já escrita no `rateLimit.ts` — derivar IP confiável num callable é premissa de infraestrutura não verificável e um balde por IP pune vizinho de NAT. Sem a borda, o teto global passa a ser o número de endereços distintos que alguém quiser digitar. Não é escalada de privilégio e não bloqueia a fila; é custo faturado e reputação de remetente. Continua sendo do CTO humano, e continua não sendo decisão sua.

## Entrou em 06/08 · o gancho de incidente existe e do outro lado não há ninguém (pendência do CTO)

Não é decisão sua, e está aqui pela mesma razão do item acima: para você saber que existe e quem a carrega. A casa tem doutrina de incidente escrita e aplicada — quando um e-mail transacional falha, a linha sai com campo de alerta, severidade e tipo, num formato estável, pronto para ser casado por uma política. A medição de 06/08 contra o projeto de produção diz o resto: **zero políticas de alerta, zero métricas de log e zero canais de notificação.** O gancho está pendurado no vazio. *A redefinição de senha morreu em produção às 11h43 de 05/08, e ninguém soube até alguém abrir o log atrás de outra coisa, nove horas depois.*

- **O que fica com você:** nada. Vai para o **CTO humano**, junto do item da borda volumétrica e do `minInstances`, porque criar política de alerta e canal de notificação é custo de infraestrutura recorrente, e a regra permanente da casa manda rotear custo recorrente ao sócio.
- **Por que agora:** o conserto de 06/08 aplica a doutrina no arquivo que faltava, então a partir dele "aplicamos a doutrina" quer dizer "o log está pronto para ser casado". Não quer dizer "alguém é avisado". Enquanto a política não existir, **toda falha nova continua invisível até alguém abrir o log** — e a única razão de a de 05/08 ter sido descoberta é que outra investigação passou por ali.
- **O que a política precisaria casar:** o campo de alerta que a doutrina já grava, com um canal de notificação atrás. É configuração de projeto, não código; nada no repositório muda.
- **+06/08 · a segunda metade da mesma falta chegou aqui, e agora as duas vivem num lugar só.** A conversão do item 11 (os três segredos) mandou conferir o endereço do monitoramento de erros em produção, e a conferência devolveu que **não há endereço nenhum**: nenhum DSN em `.env`, em `.env.leela-hub` nem no da landing, e nenhum dos dois bundles servidos carrega um. O SDK está instalado nas duas telas — `@sentry/react` no painel, `@sentry/nextjs` na landing — e é desenhado para virar **no-op silencioso quando falta o DSN**, que é o que ele é hoje, em produção. Nas functions o SDK nunca entrou no workspace. Então não é que o Sentry esteja mal configurado: **não existe Sentry ligado**, e a tela que parece instrumentada não reporta uma linha. Junto com a ausência de política de alerta acima, isso quer dizer que a casa não tem nenhum caminho pelo qual uma falha em produção chegue a um humano.
- **Uma consequência concreta, para a conta do CTO não ser abstrata:** a condição que reabre o item do pagador estrangeiro — *alguém tenta comprar com cartão emitido no exterior e a compra é recusada no gateway* — **depende desta pendência**. Enquanto não houver política nem DSN, essa recusa acontece e ninguém fica sabendo. Registrado em `02-rodadas/2026-08-06-triagem-painel/01-decisoes-dono.md` §Parte 1.
- **Onde aterrissa:** o projeto de produção `leela-hub`, no Cloud Logging e no Cloud Monitoring. Medição e comandos em `.nirvana/handoffs/leela-senha-DIAG.md` §4 e §6; a doutrina que produz o campo vive em `functions/src/email/incidenteEmail.ts` e o runbook em [[runbook-email-transacional]].

## Entrou em 06/08 · o retrato contínuo do banco está desligado (PITR — pendência do CTO)

O expurgo pediu um export com hora exata (`snapshotTime`) e a API recusou: **Point-in-Time Recovery está desligado** no Firestore de produção. A corrida seguiu pela rede primária (export normal + importação), que está de pé e provada — mas ficou nomeada a causa do A3: sem PITR, não existe "voltar o banco para as 14h07 de ontem"; existe só o último export tirado à mão. *Um erro operacional grave hoje se desfaz até o export mais recente, não até o minuto anterior ao erro.* Ligar tem custo recorrente de armazenamento e política de retenção — decisão de infraestrutura para o CTO (sócio), não sua. Registro em `.nirvana/handoffs/leela-apply-limpeza-20260806.md`.

## Depois da fila · app v1 como PWA

Sua decisão de 18/07 tirou o cadastro nas lojas do caminho do v1, e a reespecificação reduziu nove histórias para seis, com o ingresso passando a funcionar sem rede. *A Ana chega ao ginásio sem sinal e hoje o ingresso dela precisa de rede.*

- **O que fica com você:** nada agora.
- **Por que agora:** na ordem ratificada no mesmo dia, o horizonte 3 vem antes do 2, com a estratégia de terminar por projeto. O produto web inteiro fecha antes do app, e o Creator Studio permanece por último.
- **Onde aterrissa:** [[LEELA-E13-app-atleta]] · [[ROADMAP]] §5.
