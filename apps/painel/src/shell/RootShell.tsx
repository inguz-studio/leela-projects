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
  Avatar,
  SCROLL_Y_ONLY,
  Sidebar,
  SidebarFooter,
} from '@leela/design-system';
import { shellSidebarSections } from './sidebar';
import { useEventosAtivosBadge } from './eventosBadge';
import { useShellSession } from './session';
import { usePaineisDaConta } from './paineis';
import { AlternadorDePainel, nomeDoPainelAtual } from './AlternadorDePainel';

export interface RootShellProps {
  children: React.ReactNode;
}

export function RootShell({ children }: RootShellProps): JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  const { nome, fotoUrl } = useShellSession();
  const eventosAtivos = useEventosAtivosBadge();
  const paineis = usePaineisDaConta();

  // `navigate` vai INTEIRO, sem adaptador. O `(href) => navigate(href)` que
  // morava aqui descartava em silêncio o segundo argumento, e com ele o
  // `{ replace: true }` do A-7 (LEELA-DEBT-T5): o menu continuaria empilhando
  // a rota atual a cada clique, e nenhum teste do construtor puro veria isso,
  // porque lá o dublê recebe o que o construtor manda — o adaptador ficava
  // entre os dois.
  const sections = shellSidebarSections(location.pathname, navigate, eventosAtivos);

  // Bloco de marca (T2): a ANATOMIA `.brand` (padding, hairline, sub) é do DS —
  // reusamos os MESMOS tokens do SidebarBrand para não haver drift. O mark deixa
  // de ser texto e passa a ser o wordmark oficial da Leela (variante brasa /
  // verde-limão, o MESMO `/leela-logo-brasa.svg` do header da landing), que casa
  // com o fundo escuro `--surface-base` da sidebar. `alt` textual garante a11y;
  // altura = `--sidebar-brand-mark-size` (22px), o mesmo espaço vertical que o
  // texto ocupava. Sub "Painel do Organizador" segue como descritor de contexto.
  const brand = (
    <div className="border-b border-b-[var(--border-subtle)] pt-[var(--sidebar-brand-pt)] px-[var(--sidebar-brand-px)] pb-[var(--sidebar-brand-pb)]">
      <img
        src="/leela-logo-brasa.svg"
        alt="Leela"
        data-slot="brand-logo"
        className="h-[var(--sidebar-brand-mark-size)] w-auto"
      />
      {/* O sub deixou de ser literal (PAPEL-DUPLO): a MESMA moldura serve os
          dois painéis — `/plataforma` sempre rodou dentro deste RootShell — e
          o rótulo fixo "Painel do Organizador" mentia para quem estivesse no
          painel master. Agora ele nomeia onde a conta está, que é o que faz o
          alternador logo abaixo ser legível: um diz onde você está, o outro
          diz para onde vai. */}
      <p className="mt-[var(--sidebar-brand-sub-mt)] text-[length:var(--sidebar-brand-sub-size)] font-[var(--font-weight-medium)] uppercase tracking-[var(--sidebar-brand-sub-spacing)] text-[var(--text-tertiary)]">
        {nomeDoPainelAtual(location.pathname)}
      </p>
      {/* Só desenha para quem alcança os dois lados. Não é autorização — quem
          nega é Rules + guards das Functions; ver o cabeçalho do componente. */}
      {paineis.podeAlternar ? (
        <div className="mt-[var(--spacing-3)]">
          <AlternadorDePainel podeAlternar={paineis.podeAlternar} />
        </div>
      ) : null}
    </div>
  );

  // Rodapé só com sessão nomeada — sem usuário hardcoded (B4). "Ver perfil"
  // agora navega para as configurações da conta (S020-T4); antes era um rótulo
  // morto.
  const footer = nome ? (
    <SidebarFooter
      avatar={<Avatar size="sm" name={nome} {...(fotoUrl ? { src: fotoUrl } : {})} />}
      name={nome}
      subtitle="Ver perfil"
      onClick={() => navigate('/conta')}
    />
  ) : undefined;

  return (
    <AppShell sidebar={<Sidebar brand={brand} sections={sections} footer={footer} />}>
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
      {/* GLOW DA PÁGINA (REDESIGN-DS §2, regra não-negociável nº 1): o brilho
          de fundo é FIXO NO VIEWPORT. Se ele rolasse com o conteúdo, o
          desfoque do vidro perderia o referencial e o efeito morreria — o card
          translúcido revelaria sempre a mesma cor chapada.

          Mora aqui, no contêiner que rola, e não no <body>: o AppShell pinta
          `--surface-base` OPACO na raiz da moldura, então um glow no documento
          ficaria escondido atrás dela. `background-attachment: fixed` faz a
          área de posicionamento ser o viewport (é o que os raios em
          porcentagem do token esperam) enquanto a pintura fica contida nesta
          caixa — e como a Sidebar é opaca, não pintar o glow sob o rail é
          visualmente idêntico a pintar.

          `--page-glow` é `none` fora do modo vidro: na administração da
          plataforma esta mesma linha não desenha nada, e o fundo preto do
          `--surface-base` é o que o dono pediu. Nenhum valor cru aqui — só o
          token que a lane TOKENS publicou. */}
      <div
        className={`relative flex flex-col flex-1 ${SCROLL_Y_ONLY} [background-image:var(--page-glow)] [background-attachment:fixed]`}
      >
        {children}
      </div>
    </AppShell>
  );
}

RootShell.displayName = 'RootShell';
