# 00-review · Ata da revisão UX do Vitor · 2026-07-18

> Reconstruída do log de auditoria da execução (`~/.harness-logs/2026-07-18/audit.jsonl`, trace `leela-build-2d6ee98d`) e do brief-fonte verbatim (`briefs/leela-r9-ux-review-spec.txt`). Guarda **o que o Vitor pediu, na íntegra**. A tradução em stories/tasks/RN está em [[03-stories]] · [[04-tasks]] · [[02-jtbd]] · [[05-rns-delta]]; a execução e o placar das lanes em [[01-planning]].
>
> São **13 blocos**: o brief principal (bloco 1) + 12 adendos da mesma sessão. Os adendos 2-12 são verbatim; o adendo 13 é o registro do evento de decisão (não veio no brief-fonte de texto).

## Linha do tempo da rodada (eventos-chave do audit)

| Hora (-03) | Evento | Conteúdo |
|---|---|---|
| 09:09:30 | `brief_received` R9 | revisão UX do Vitor → pacote de spec (stories/tasks/JTBD/DoD/ACs/RNs) |
| 09:10:38 | `dispatch_business` R9 | software-forge · sf-cto · Opus |
| 09:14:50 | `brief_amended` | adendo 2 (marcas salvas · Comunicação inexistente · aba CRM) |
| 09:27:36 | `decision_received` | adendo 3 (H3 antes do H2; RNs de influenciador) |
| 09:31:41 | `decision_received` | adendo 4 (app v1 = PWA) |
| 09:36:14 | `decision_received` | adendo 5 (clube-influenciador pré-compra — hipótese) |
| 09:41:02 | `decision_received` | adendo 6 (capa 1600×838, 1.9:1, ≤2MB) |
| 09:41:26 | `gate_passed` R9 | quality-gate PASS 0.94 · 13 itens cobertos |
| 09:44:29 | `delivered` R9 | 13 stories / 38 tasks / 6 lotes, 16 RNs, E19 novo |
| 09:48:02 | `decision_received` | adendo 7 (EmailProvider = Resend) |
| 09:51:38 | `decision_received` | adendo 8 (EmailProvider Resend → **Brevo** por custo) |
| 09:56:37 | `delivered` R9-final | 14 stories / 41 tasks / 6 lotes, 17 RNs + HIP-R9-01 |
| 10:24:31 | `decision_received` | Vitor libera execução (CRM autorizado; rotação Asaas ele faz) |
| 10:39:25 | `brief_received` R12 | adendo 9 (revisão da landing) |
| 10:54:24 | `brief_received` R13 | adendo 10 (revisão do checkout) |
| 10:55:38 | `decision_received` | adendo 11 (patrocinador logo 1:1) |
| 11:02:01 | `decision_received` | adendo 12 (slider tablet/mobile · menu secundário scroll · header sem busca) |
| 11:56:56 | `decision_received` | adendo 13 (LP com imagens mockadas em todos os slots) |

---

## Bloco 1 · Brief principal (verbatim, 09:09)

> em desempenho de vendas, vejo que podemos unificar com a aba analytics para que seja uma coisa só, e haja o filtro de análise por eventos, podendo acontecer a seleção temporal, com componente de calendário (shadcn, SEMPRE). Gráfico cohort, de idade e sexo, onde a faixa de idade vá variando de 5 em 5 anos, já a parte de repasses, deve ser mais clara que é a visão unificada, de todos os eventos. Isso é sobre a rota /financeiro. o Toggle button está com a visibilidade ruim, quando nao selecionado, o botão arredondado de dentro está muito escuro, acho que voce nao passou o gate de validação de contraste para esse componente. e nem para o estilo flat. a caixa de seleção quando abre um filtro está fora do nosso padrao de design e shadcn também. Também sobre a questao de rotas ficarem "carregando" no navegador, ainda está acontecendo, revisar para que a experiencia seja fluida. o input de imagens no perfil nao deve ter a opção "cole uma URL". Já em kits suba uma opção para que os kits tenham imagens, formato 1:1, prévia na landing de vendas do evento e na gestão de eventos. A edição da página de vendas deve ser uma imagem horizontal de thumb, busque referencias dos benchmarks citados (preferencialmente cheers) para definirmos a dimensão. padronize divisórias de menus terciários dentro de eventos (Financeiro sem divisória; seguir o padrão de Comunicação). cupons excelente; links de afiliado para influenciadores — temos isso definido? organize em tasks/user stories, ajuste jobs to be done, definition of done, critérios de aceite, na melhor forma para um dev codar, sem esquecer da documentação das RN, que serão atualizadas também.

## Bloco 2 · Adendo 2 — marcas, Comunicação, CRM (verbatim, 09:14)

> a parte de marcas é para ter salvo patrocinadores que já foram cadastrados previamente em algum evento, para que quando haja a necessidade de cadastrar algum patrocinador, futuramente, já haja a listagem. Em COmunicação não desenvolvemos nada ainda. E quero que tenhamos uma aba "crm" prevista no Menu principal, para que todos os clientes do organizador apareçam lá, com informações gerais, numero de eventos que participou, valor gasto, ele tenha uma visão de LTV dos proprios clientes. sexo, idade, data de aniversário. Podemos ter isso unificado com comunicação.

## Bloco 3 · Adendo 3 — H3 antes do H2, clube-influenciador, PF por convite, modal (verbatim, 09:27)

> adiante o H3 para antes do H2, para finalizarmos por projeto, exceto o creator-studio, que vai entrar depois. Clubes podem ser influenciadores, para ter o proprio link de desconto, mediante um numero mínimo de inscrições, que pode ser definida pelo organizador. Já influenciadores, pessoa física, serão convidados por e-mail, a fazer suas contas, para acompanharem as proprias vendas pelo link com cupom aplicado. a configuração de um novo influenciador ou clube pode acontecer via modal.

## Bloco 4 · Adendo 4 — app v1 = PWA (verbatim, 09:31)

> o app v1 pode ser um PWA, nao tem problema.

## Bloco 5 · Adendo 5 — pré-compra do clube-influenciador (hipótese) (verbatim, 09:36)

> para os clube influenciador, podemos colocar que ficamos em "pré-compra" e a partir do numero x de pré-compra, disparamos a cobrança, no cartão. Mas quero validar isso depois com um organizador de eventos. Mas ambos devem conseguir acompanhar as vendas, tanto influenciador quanto clube, na sua aba clubs.

## Bloco 6 · Adendo 6 — spec da capa/banner (verbatim, 09:41)

> 1600 × 838 pixels é a capa. do banner, tamanho máximo de arquivo 2mb proporção 1.9:1 e jpeg, gif ou png.

## Bloco 7 · Adendo 7 — EmailProvider = Resend (verbatim, 09:48)

> quanto ao e-mail, utilizaremos o resend. https://resend.com/

## Bloco 8 · Adendo 8 — EmailProvider atualizado para Brevo (verbatim, 09:51)

> (após comparação de preços Brevo/Resend/SendPulse e recomendação Brevo) pode atualizar

## Bloco 9 · Adendo 9 — revisão da landing (verbatim, 10:39)

> tipografias, bordas, falta de aplicação de icones de apoio, botoes, tudo isso está diferente. Entendo que a proposta é diferente e sua explicação faz sentido no lado do SEO, porém a identidade da marca precisa ser preservada também. Como podemos ter esses dois mundos? Já o efeito de menu está excelente. e os botões de garantir inscrição também. A parte do "cronometrada por chip" não é necessária. Precisamos colocar a modalidade do evento também, nao apenas o percurso. já a parte de pessoas garantiram presença, é melhor suprimir enquanto a plataforma nao é madura ainda. Pode mockar com imagens de exemplo, nas páginas dos eventos também, para facilitar a visualização. Precisamos colocar também quem é o organizador, já que ele tem a propria página, com todos os eventos dele, e clubs, no formato de calendário. Se nao tiver referencia, utilize a Luma, como exemplo (https://luma.com/foundersrc) para visualizar o calendário e linha do tempo dos próximos eventos.

## Bloco 10 · Adendo 10 — revisão do checkout (verbatim, 10:54)

> no checkout o DS também não está sendo aplicado na consistencia de tipografias. aplicação de logo no footer, ritmo vertical, botao de voltar com excesso de textos e fora do DS, que deve ser no formato ghost. todo o formulário deve ser 100% vertical, para facilitar a leitura por parte do usuário. Habilite o firebase para eu testar no checkout. e no figma que te enviei, existiam ícones em cada etapa de compra do checkout. Gostaria de no front end, deixarmos apenas 3 etapas e nao 5, mesmo que sejam 5 etapas na prática, mas para simplificar e diminuir o viés cognitivo de esforço, por parte do comprador. As hierarquias de H's E TEXTOS NAO estão sendo aplicadas nos kits, precisamos também dar a visão do kit, descrição do kit para o que está incluso, e imagens também para que o comprador possa visualizar. revise também o ritmo vertical quanto a espaçamentos.

## Bloco 11 · Adendo 11 — logo 1:1 do patrocinador (verbatim, 10:55)

> para patrocinadores também precisamos deixar o campo de imagem 1:1 para que o club, ou organizador consiga adicionar a logo, para aparecer na propria página.

## Bloco 12 · Adendo 12 — responsividade da sub-navegação (verbatim, 11:02)

> o slider horizontal na versão de tablet/mobile em eventos está quebrando. o menu secundário precisa ter um slide bar, interno para que o usuário possa scrollar, isso nao foi implementado na responsividade. podemos suprimir por hora o componente de pesquisa, do painel do organizador, que fica no header, junto com o botão "novo evento", que está fixo em todas as telas.

## Bloco 13 · Adendo 13 — imagens mockadas em todos os slots (registro do audit, 11:56)

Registrado como `decision_received` no audit (o brief-fonte de texto vai só até o adendo 12):

> A LP deve renderizar com imagens mockadas em todos os slots (hero, galeria, organizador, patrocinadores, kit) — sem slot vazio/cinza. Roteado para a lane R12-fix em voo.

---

## Decisões ratificadas na sessão (propagadas aos canônicos)

- **Roadmap reordenado:** H3 (produto web inteiro) antes do H2 (app heroico); E15 Creator Studio por último (adendo 3).
- **App v1 = PWA** (adendo 4) — destrava o E13-slim do enrollment das lojas.
- **E08 afiliados/influenciador ANTECIPADO** (adendo 3+5): clube-influenciador com mínimo de inscrições; PF por convite e-mail; config via modal; ambos acompanham na aba Clubs (RN-313..319).
- **Capa/banner:** 1600×838, 1.9:1, ≤2MB, JPEG/GIF/PNG (adendo 6 → RN-228).
- **EmailProvider = Brevo** (adendo 7 superseded por 8): adapter provider-agnóstico, `BrevoProvider`, `BREVO_API_KEY`, fail-closed (RN-137).
- **HIP-R9-01 (pré-compra do clube-influenciador) = HIPÓTESE** pendente validação com organizador (adendo 5); default conservador = RN-315.
- **Execução liberada** (10:24): CRM pode começar (defaults E19 autorizados); rotação da chave prod Asaas o Vitor mesmo faz; seguir tudo que não depende de chave de API.
