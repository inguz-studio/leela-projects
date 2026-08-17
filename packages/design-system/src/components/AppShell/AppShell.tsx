/**
 * AppShell — composição de layout: Sidebar + área de conteúdo principal.
 *
 * Uso:
 *   <AppShell sidebar={<Sidebar ... />}>
 *     <PageHeader ... />
 *     <SubNav ... />
 *     {children}
 *   </AppShell>
 *
 * Responsivo (LEELA-RESP-M1-T2): o rail fixo da Sidebar só existe a partir de
 * `lg` (1024px, ponto de colapso declarado no tailwind-preset). Abaixo de `lg`
 * o rail SOME do fluxo (não ocupa mais os 240px) — é o que devolve a largura
 * ao documento em mobile 390×844 e IMPEDE o scroll horizontal (a raiz M1 do
 * QA-LIVE-2). No mobile a MESMA Sidebar vira drawer off-canvas, acionado por um
 * hambúrguer visível na barra superior. Desktop 1440 fica INTOCADO (o rail e o
 * layout de duas colunas são idênticos ao anterior).
 *
 * NAV-MOBILE (leva 20, 17/08) — a moldura passa a ter TRÊS anatomias mobile, e
 * a escolha é do consumidor, não da peça. O dono, na íntegra: *"Já o Menu no
 * formato mobile, pode ser uma barra flutuante, horizontal a ficar na parte
 * inferior da tela. e a parte de logout, configurações, na barra superior no
 * lado direito, com o ícone de perfil."*
 *
 *   - com `bottomNav`: a barra flutuante É a navegação abaixo de `lg`, e o
 *     hambúrguer NÃO é renderizado. Dois gatilhos para a mesma coisa é a
 *     duplicata que a leva 15 apagou do rail, agora numa largura onde espaço é
 *     o recurso escasso;
 *   - sem `bottomNav`: o drawer off-canvas fica, com o hambúrguer, como desde a
 *     D-1008-R5. É o caso da superfície do super-admin — doze destinos não
 *     cabem em quatro slots, e barra que abandona destino é pior que drawer.
 *
 * Nenhum dos dois some sem substituto: a peça não tem um modo "sem navegação
 * mobile", e é isso que impede uma rota de ficar inalcançável abaixo de `lg`.
 *
 * A11y: main landmark para o conteúdo; hambúrguer com nome acessível; drawer
 * com focus-trap/Esc/aria-dialog (via Drawer → Radix Dialog);
 * `prefers-reduced-motion` respeitado pelo Drawer.
 */

import * as React from 'react';
import { Menu } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Drawer } from '../Drawer';
import { IconButton } from '../IconButton';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface AppShellProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Nome acessível do hambúrguer (mobile). Default: 'Abrir menu de navegação'. */
  menuLabel?: string;
  /** Nome acessível do drawer de navegação (mobile). Default: 'Menu de navegação'. */
  drawerLabel?: string;
  /**
   * Rail flutuante (HIFI-REC): o wrapper desktop perde o `overflow-hidden`
   * para o toggle do SidebarRail vazar a borda direita (o rail traz margem e
   * altura próprias). Default false = anatomia clássica intocada.
   */
  sidebarFlutuante?: boolean;
  /**
   * Conteúdo do Drawer < lg quando diferente do rail desktop (ex.: a Sidebar
   * clássica, que é a anatomia certa para off-canvas). Default: `sidebar`.
   */
  drawerSidebar?: React.ReactNode;
  /**
   * Barra de navegação inferior < lg (NAV-MOBILE · leva 20) — o `BottomNav`.
   *
   * Quando presente ela É a navegação abaixo de `lg`: o hambúrguer sai da barra
   * superior e o drawer deixa de ter gatilho nessa superfície. O drawer não é
   * removido do código porque a superfície do super-admin continua com ele.
   *
   * A barra FLUTUA sobre o conteúdo, então o contêiner que rola precisa reservar
   * o espaço com `RESPIRO_BOTTOMNAV` — o `AppShell` não pode fazer isso por
   * você: quem rola é um filho de `children`, e o `<main>` daqui é
   * `overflow-hidden` (padding nele seria recorte, não respiro).
   */
  bottomNav?: React.ReactNode;
  /**
   * Slot à ESQUERDA da barra superior mobile (< lg), ao lado do hambúrguer.
   *
   * Com `bottomNav` o rail some abaixo de `lg` e não há hambúrguer: sem este
   * slot a marca desapareceria da tela inteira no mobile, que é o único lugar
   * onde ela não pode desaparecer.
   */
  topBarStart?: React.ReactNode;
  /**
   * Slot à DIREITA da barra superior mobile (< lg) — a casa do gatilho do
   * perfil decidida na leva 20.
   */
  topBarEnd?: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function AppShell({
  sidebar,
  children,
  className,
  menuLabel = 'Abrir menu de navegação',
  drawerLabel = 'Menu de navegação',
  sidebarFlutuante = false,
  drawerSidebar,
  bottomNav,
  topBarStart,
  topBarEnd,
}: AppShellProps): JSX.Element {
  const [menuOpen, setMenuOpen] = React.useState(false);
  // A barra inferior SUBSTITUI o gatilho do drawer abaixo de `lg` — não convive
  // com ele. Dois caminhos para a mesma navegação na mesma largura é a
  // duplicata que a leva 15 apagou do rail.
  const comBottomNav = Boolean(bottomNav);

  return (
    <div
      className={cn(
        'flex h-screen w-full overflow-hidden',
        'bg-[var(--surface-base)]',
        className,
      )}
    >
      {/* Rail fixo da Sidebar — só a partir de lg (desktop 1440 intocado).
          Abaixo de lg some do fluxo: o <main> recupera a largura total.
          Rail FLUTUANTE (HIFI-REC): sem clip — o toggle do SidebarRail fica
          meio para fora da borda direita, por desenho do protótipo. */}
      <div
        className={cn(
          'hidden lg:block shrink-0 h-full',
          !sidebarFlutuante && 'overflow-hidden',
        )}
      >
        {sidebar}
      </div>

      {/* Drawer mobile (< lg): a MESMA Sidebar off-canvas (ou a variante que
          o consumidor mandar — o rail flutuante não é anatomia de drawer).
          Fecha ao navegar (clique borbulha) e nas vias do Radix.

          Com `bottomNav` ele não é montado: sem gatilho, o portal só somaria
          uma árvore inerte e um focus-trap que ninguém alcança. */}
      {!comBottomNav && (
        <Drawer open={menuOpen} onOpenChange={setMenuOpen} title={drawerLabel}>
          <div className="contents" onClick={() => setMenuOpen(false)}>
            {drawerSidebar ?? sidebar}
          </div>
        </Drawer>
      )}

      {/* Main content — min-w-0 permite encolher abaixo do conteúdo (trava o
          scroll horizontal em mobile: a constraint IMPEDE, não só esconde).

          `relative` é a SEGUNDA metade da trava de rolagem, e ela não passa por
          classe de overflow nenhuma (REV-SCROLL-RET). O `overflow-hidden` daqui
          só recorta descendente cujo bloco de contenção seja este `<main>` ou
          um filho dele. Um descendente `position:absolute` com TODOS os
          ancestrais `static` — é o caso do `.sr-only` da `Pagination`, da
          `Table` e do `Stepper` — pula para o bloco de contenção inicial, o
          `<html>`: não é recortado por ninguém e estica o scrollHeight do
          DOCUMENTO. Numa lista longa (inscritos) o `.sr-only` da paginação cai
          bem abaixo da dobra, e o documento acende uma barra vertical ao lado
          da barra da página — o "scroll duplo" que sobrevive a qualquer
          conserto de `overflow-*`, porque a causa é o bloco de contenção, não o
          eixo. Sendo `relative`, o `<main>` vira o bloco de contenção e o
          `overflow-hidden` volta a alcançar esses descendentes.

          Sem offsets e com `z-index: auto`, `relative` não move nada e NÃO cria
          contexto de empilhamento — overlays portalizados no body (Modal,
          Drawer, DropdownMenu, Popover) seguem intocados. O showroom tratou o
          mesmo defeito travando o `<html>` (showcase.css); aqui isso não serve,
          porque as telas de autenticação vivem FORA do AppShell e rolam no
          documento de propósito (`min-h-screen`). */}
      <main className="relative flex flex-col flex-1 min-w-0 h-full overflow-hidden">
        {/* Barra superior mobile — só abaixo de lg. Hambúrguer e marca à
            esquerda, perfil à direita (NAV-MOBILE · leva 20). */}
        <div
          className={cn(
            'lg:hidden flex items-center justify-between gap-[var(--spacing-3)] shrink-0',
            'px-[var(--spacing-4)] py-[var(--spacing-3)]',
            'border-b border-b-[var(--border-subtle)]',
          )}
        >
          <div className="flex items-center gap-[var(--spacing-3)] min-w-0">
            {/* REDESIGN-V2 · item 5. `aria-expanded` fecha uma pendência que três
                lanes registraram e nenhuma pôde tocar: sem ele, o leitor de tela
                anuncia "Abrir menu de navegação, botão" com o drawer JÁ aberto —
                o nome acessível é imperativo e não carrega estado, então o
                usuário de AT não tem como saber que o menu está aberto sem varrer
                a página.

                Sem `aria-controls` de propósito: o painel do Drawer não expõe id
                estável (o `useId` interno nomeia só o título), e plumbar um id
                para fora mexeria no Drawer — superfície que o incidente de tela
                preta de 10/08 pede para não alargar sem necessidade.
                `aria-expanded` sozinho é válido e entrega o estado.

                NAV-MOBILE: com a barra inferior o gatilho SAI. Ele não é
                escondido por CSS — um botão que abre um drawer que não deve mais
                existir nessa superfície continua alcançável por teclado e por
                leitor de tela, e essa é a pior das duas navegações. */}
            {!comBottomNav && (
              <IconButton
                aria-label={menuLabel}
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen(true)}
              >
                <Menu aria-hidden />
              </IconButton>
            )}
            {topBarStart}
          </div>
          {topBarEnd}
        </div>

        {children}

        {/* A barra é `fixed` e vem por ÚLTIMO no DOM de propósito: navegação de
            rodapé se alcança no fim da ordem de tabulação, depois do conteúdo da
            página — que é onde a pessoa está trabalhando. */}
        {bottomNav}
      </main>
    </div>
  );
}

AppShell.displayName = 'AppShell';

export { AppShell };
