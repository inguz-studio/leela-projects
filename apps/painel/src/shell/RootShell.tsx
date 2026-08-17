// =============================================================================
// RootShell — moldura padrão do painel montada UMA vez no layout raiz
// (App.tsx), envolvendo TODAS as rotas (item 18 do DoD do Be Hero: toda tela
// aplica o shell padrão). Sidebar fixa 240px sempre visível; só o conteúdo
// troca e rola. Substitui as montagens locais de AppShell que existiam em
// OverviewShell e PlatformShell (bug do diagnóstico 2026-07-05: /eventos e
// /clubes renderizavam sem menu).
//
// Adendo 13 (ordem do Vitor, 2026-08-05): a BARRA SUPERIOR foi suprimida do
// sistema inteiro. O Adendo 12 já tinha tirado dali a busca e o "Novo evento";
// sobraram só dois icon-buttons stub sem destino (Ajuda e Notificações), e uma
// barra que existe para hospedar dois botões que não levam a lugar nenhum não
// tem utilidade. Não é "esvaziar a barra": o componente sai do shell.
//
// Consequência de layout, medida antes de remover: o wrapper da toolbar era
// IRMÃO de `children`, então o padding horizontal das telas nunca veio dele —
// cada página traz o próprio (PageHeader `px-6`, contêineres `px-6`). O que
// some é vertical, acima do primeiro elemento da página: 32px do `pt` do
// wrapper + a altura da toolbar + seu `pb`/`mb` e a hairline. A moldura NÃO
// ganha um `pt` de substituição, e por um motivo verificável: as rotas de
// `/plataforma` nunca tiveram a toolbar e já entregam o PageHeader rente ao
// topo do contêiner de rolagem — o `min-h` de 96px do PageHeader com conteúdo
// centrado é o respiro. Suprimir a barra deixa o produtor IGUAL a esse padrão
// já em produção, em vez de inventar uma barra invisível só para segurar
// espaço. Telas com respiro próprio (EventoShell, `pt-5` no breadcrumb) seguem
// intactas.
// =============================================================================

import * as React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AppShell,
  BottomNav,
  DropdownMenu,
  IconButton,
  RESPIRO_BOTTOMNAV,
  SCROLL_Y_ONLY,
  SidebarRail,
  cn,
} from '@leela/design-system';
import { shellBottomNavItems, shellRailItems } from './sidebar';
import { useEventosAtivosBadge } from './eventosBadge';
import { useShellSession } from './session';
import { usePaineisDaConta } from './paineis';
import { nomeDoPainelAtual, travessia } from './AlternadorDePainel';
import { useSair } from './sair';
import { CircleUserRound, LogOut, Settings } from 'lucide-react';

export interface RootShellProps {
  children: React.ReactNode;
}

export function RootShell({ children }: RootShellProps): JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  const { nome } = useShellSession();
  const eventosAtivos = useEventosAtivosBadge();
  const paineis = usePaineisDaConta();
  const { sair } = useSair();
  const [menuPerfilMobile, setMenuPerfilMobile] = React.useState(false);

  // DELTA-UX-T4 (D-1008-R6): o perfil do rodapé do rail virou TRIGGER do
  // popover do perfil — DropdownMenu canônico ancorado acima (L-021), com
  // Configurações + alternador de painel. Os itens de menu SÃO o "flat
  // button" do vocabulário do DS dentro de popover (sem preenchimento
  // sólido; hover em accent) — nenhum variant novo precisou nascer.
  // LEVA 15 — o default vetável do maestro ("Configurações CONTINUA também
  // como item do rail — o popover soma um caminho, não rouba o existente") foi
  // VETADO pelo dono, na íntegra: *"configuraç~eos também está redundante no
  // menu pricnipal, já que ao clicar no nome 'ver perfil' aparecem as
  // configurações."* A medição confirmou a redundância como PURA, e é o que
  // autoriza a remoção: os dois caminhos apontavam para a MESMA rota `/conta`
  // (rail em `sidebar.ts` · popover aqui), não para escopos diferentes de
  // organização e conta pessoal. A entrada saiu do rail; o caminho fica aqui.
  //
  // LEVA 16 — o menu do perfil passa a listar Configurações e Sair, cada um com
  // ícone pequeno, na íntegra: *"devo visualizar 'sair' como opção de logou e
  // configurações. Ambos com pequenos icones."* Até aqui o logout era invisível
  // no shell: existia só dentro de `/conta`, ou seja, atrás do próprio item de
  // configurações. Os ícones são decorativos (o rótulo é o nome acessível) e o
  // tamanho vem do token `--popover-icon-size` dentro do DS, não daqui.
  //
  // A ORDEM é deliberada: Sair é o ÚLTIMO. É a ação que encerra tudo, e item
  // destrutivo-adjacente no meio da lista é onde se clica sem querer.
  const { destino, rotulo } = travessia(location.pathname);
  const menuPerfil = {
    menuLabel: 'Menu do perfil',
    actions: [
      {
        id: 'configuracoes',
        label: 'Configurações',
        icon: <Settings />,
        onClick: () => navigate('/conta'),
      },
      // Só oferece a travessia a quem alcança os dois lados (regra 1 do
      // alternador — botão que leva a 403 é pior que botão nenhum).
      ...(paineis.podeAlternar
        ? [{ id: 'alternar-painel', label: rotulo, onClick: () => navigate(destino) }]
        : []),
      { id: 'sair', label: 'Sair', icon: <LogOut />, onClick: () => void sair() },
    ],
  };

  // HIFI-REC · rail flutuante do protótipo Visao Geral v3 (ordem do dono,
  // 10/08): ≥ lg a navegação é o SidebarRail — pílula flutuante fechada em
  // 84px, aberta em 248px. O AlternadorDePainel SAIU do slot aberto
  // (D-1008-R6): a travessia agora vive no popover do perfil, alcançável com
  // o rail FECHADO ou ABERTO.
  //
  // `navigate` vai INTEIRO para o construtor de itens, sem adaptador: um
  // `(href) => navigate(href)` descartaria em silêncio o `{ replace: true }`
  // do A-7 (LEELA-DEBT-T5) e o menu voltaria a empilhar a rota atual.
  //
  // DELTA-UX-T3 (D-1008-R5): as MESMAS props servem as duas anatomias — a
  // pílula desktop e o drawer < lg. A Sidebar clássica saiu da moldura: o
  // menu mobile agora é o próprio rail no chrome v3 (`variant="drawer"`:
  // sempre aberto, altura total, sem margem/raio/toggle — media query < lg
  // do protótipo). A anatomia OFF-CANVAS fica (decisão registrada): portal,
  // scrim condicional (item 5 do REFACTOR) e focus-trap seguem sendo do
  // Drawer do AppShell; aqui só a pele mudou. Consequência aceita: o rodapé
  // mobile mostra as iniciais (receita do rail), não mais a foto da sessão —
  // paridade com o desktop, que já era assim desde a HIFI-REC.
  const propsDoRail = {
    items: shellRailItems(location.pathname, navigate, eventosAtivos),
    brandIcon: <img src="/leela-icon.svg" alt="" className="w-full h-full" />,
    brandLogo: <img src="/leela-logo-brasa.svg" alt="Leela" className="h-full w-auto" />,
    ...(nome ? { footerName: nome } : {}),
    footerSubtitle: 'Ver perfil',
    footerMenu: menuPerfil,
    // Rail aberto NOMEIA o painel (conquista PAPEL-DUPLO — o rótulo não
    // mente no master). No drawer, sempre aberto, o rótulo está sempre lá.
    slotAberto: (
      <p className="text-center text-[length:var(--sidebar-brand-sub-size)] font-[var(--font-weight-medium)] uppercase tracking-[var(--sidebar-brand-sub-spacing)] text-[var(--text-tertiary)]">
        {nomeDoPainelAtual(location.pathname)}
      </p>
    ),
  };

  // ---------------------------------------------------------------------------
  // NAV-MOBILE (leva 20). O dono, na íntegra: *"Já o Menu no formato mobile,
  // pode ser uma barra flutuante, horizontal a ficar na parte inferior da tela.
  // e a parte de logout, configurações, na barra superior no lado direito, com
  // o ícone de perfil."*
  //
  // A D-1008-R5 (10/08) decidiu que o drawer off-canvas ficava abaixo de `lg` e
  // que só a pele mudava. Ela fica **SUPERADA nesta superfície** por esta
  // decisão, e a superação sai ESCRITA porque revogação por silêncio é como a
  // RN-470 quase se perdeu. Nada foi apagado: o `variant="drawer"` do
  // SidebarRail segue no DS e segue montado aqui — a superfície do super-admin
  // continua com ele, porque doze destinos não cabem em quatro slots e barra
  // que abandona destino é pior que drawer. Quem decide qual das duas é
  // `shellBottomNavItems`, devolvendo `null` na plataforma.
  //
  // O POPOVER É O QUE JÁ EXISTE. `menuPerfil` acima é o MESMO objeto que
  // alimenta o rodapé do rail desde a D-1008-R6, com os mesmos itens da leva 16
  // (Configurações e Sair, cada um com ícone, Sair por último). Aqui ele só
  // ganha um segundo gatilho — nenhum popover novo nasceu, nenhuma lista de
  // ações foi copiada. Duas listas com os mesmos dois itens é exatamente a
  // duplicata que a leva 15 apagou do rail.
  //
  // O NOME DO LANDMARK é "Navegação inferior", e não "Navegação principal" como
  // o rail: os dois vivem no mesmo documento (um é `hidden lg:block`, o outro é
  // `lg:hidden`), e dois landmarks de navegação com o mesmo nome não se
  // distinguem na lista de marcos do leitor de tela.
  const itensDaBarra = shellBottomNavItems(location.pathname, navigate, eventosAtivos);
  const gatilhoDoPerfilMobile = (
    <DropdownMenu
      open={menuPerfilMobile}
      onOpenChange={setMenuPerfilMobile}
      actions={menuPerfil.actions}
      menuLabel={menuPerfil.menuLabel}
      align="right"
      trigger={
        <IconButton aria-label={nome ? `${nome} — menu do perfil` : 'Menu do perfil'}>
          <CircleUserRound aria-hidden />
        </IconButton>
      }
    />
  );

  return (
    <AppShell
      sidebar={<SidebarRail {...propsDoRail} />}
      sidebarFlutuante
      drawerSidebar={<SidebarRail variant="drawer" {...propsDoRail} />}
      {...(itensDaBarra
        ? { bottomNav: <BottomNav items={itensDaBarra} ariaLabel="Navegação inferior" /> }
        : {})}
      // A marca só aparece no rail, e abaixo de `lg` o rail não existe. Sem este
      // slot ela sumiria da tela inteira no mobile — e no produtor, onde o
      // hambúrguer também sai, a barra superior ficaria com o lado esquerdo vazio.
      topBarStart={
        <img src="/leela-logo-brasa.svg" alt="Leela" className="h-[var(--rail-brand-logo-h)] w-auto" />
      }
      topBarEnd={gatilhoDoPerfilMobile}
      // GLOW DA PÁGINA na RAIZ da moldura (protótipo: background-image no flex
      // que contém nav+main): o rail é vidro translúcido e precisa do glow POR
      // BAIXO — pintado só no contêiner que rola, a faixa do rail ficava sobre
      // preto chapado. `fixed` mantém a âncora no viewport (regra §2 nº 1).
      className="[background-image:var(--page-glow)] [background-attachment:fixed]"
    >
      {/* Área principal: único contêiner de rolagem da PÁGINA — a sidebar não
          rola junto, e o eixo horizontal é fechado (BUILD-SCROLL-PADRAO).
          O `overflow-y-auto` sozinho não entregava um contêiner de rolagem,
          entregava dois: pela CSS Overflow 3 §3.1 o eixo x, deixado `visible`,
          era promovido a `auto`. Qualquer tela que estourasse a largura desenhava
          uma barra horizontal no painel inteiro, e no Windows/Chrome essa barra é
          clássica: comia ~15px da altura útil e empurrava o conteúdo a estourar
          na vertical também. Era a mesma cascata do menu secundário e do CRM, um
          nível acima — por isso o defeito voltava em tela nova a cada rodada.
          Tela larga agora é DEFEITO DA TELA e se conserta na tela (flex-wrap,
          min-w-0, truncate); widget legitimamente largo (tabela, sub-nav) traz o
          próprio contêiner de rolagem. Regra e constantes no DS: utils/scroll.

          `relative` (REV-SCROLL-RET): quem rola precisa ser o bloco de contenção
          do que está dentro dele. Sem isso, um descendente `position:absolute`
          de ancestrais todos `static` escapa deste contêiner e vai parar no
          `<html>` — não rola junto com o conteúdo E estica o scrollHeight do
          documento, acendendo uma segunda barra vertical ao lado desta. O
          `<main>` do AppShell já é `relative` e barra a fuga; aqui a `relative`
          resolve o outro lado, que é a semântica: o absoluto pertence ao
          conteúdo que rola, não à moldura parada. */}
      {/* GLOW DA PÁGINA (REDESIGN-DS §2, regra nº 1): o brilho é FIXO NO
          VIEWPORT e SUBIU para a raiz da moldura (className do AppShell,
          acima) na lane HIFI-REC. O argumento antigo para pintá-lo AQUI era
          "a Sidebar é opaca, não pintar sob o rail é idêntico a pintar" — o
          SidebarRail derrubou a premissa: ele é vidro translúcido flutuando
          sobre a página, e o glow precisa existir POR BAIXO dele. O token
          continua sendo a única fonte (`none` fora do modo vidro: a
          administração segue preta). GlowDaPagina.test.tsx acompanhou. */}
      {/* RESPIRO_BOTTOMNAV (NAV-MOBILE): a barra FLUTUA sobre o conteúdo, então
          o contêiner que rola reserva o espaço embaixo — senão o último bloco de
          toda página nasce escondido atrás dela, que é a lição S113 (área que
          abandona quem entra é defeito) com outra roupa. O respiro entra SÓ onde
          a barra existe: acima de `lg` o token zera pelo próprio `lg:pb-0`, e na
          plataforma, que não tem barra, ele nem é aplicado — respiro sem barra é
          buraco no fim da página.

          A ordem no `cn` é a de sempre: `SCROLL_Y_ONLY` fica DEPOIS do que pode
          conflitar com ele (regra do cabeçalho de utils/scroll). O respiro é
          padding, não overflow, então não disputa. */}
      <div className={cn('relative flex flex-col flex-1', itensDaBarra && RESPIRO_BOTTOMNAV, SCROLL_Y_ONLY)}>
        {children}
      </div>
    </AppShell>
  );
}

RootShell.displayName = 'RootShell';
