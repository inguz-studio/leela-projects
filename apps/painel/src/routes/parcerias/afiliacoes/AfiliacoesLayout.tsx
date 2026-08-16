// =============================================================================
// AfiliacoesLayout — casca da frente Afiliações dentro de Parcerias
// (D-1008-R17). A frente tem DOIS lados que já existiam em clubs (R9-E ·
// S-R9-11-T7/T8) e migraram juntos, por palavra do dono ("o mesmo se aplica
// para minhas afiliações e influenciadores"):
//
//   Influenciadores   (`/parcerias/afiliacoes` — lado do ORGANIZADOR, RN-319:
//                      conversões e comissões dos afiliados do tenant)
//   Minhas afiliações (`/parcerias/afiliacoes/minhas` — lado do INFLUENCIADOR,
//                      RN-318: só as próprias conversões)
//
// O menu da ÁREA mantém as 3 abas canônicas da decisão (Afiliações é UMA
// frente); os dois lados navegam por esta sub-nav TERCIÁRIA — o mesmo
// `AreaSubNav` de todas as barras do painel desde a Leva 14 (o `divider` da
// RN-229 morreu junto com a prop no DS). Nenhum dos lados vira beco: no menu antigo
// de clubs os dois eram entradas, e aqui seguem a um clique.
// =============================================================================

import { Outlet, useLocation } from 'react-router-dom';
import type { SubNavTab } from '@leela/design-system';
import { AreaSubNav } from '../../../components/nav/AreaSubNav';

export function AfiliacoesSubNav(): JSX.Element {
  const { pathname } = useLocation();
  const emMinhas = pathname.startsWith('/parcerias/afiliacoes/minhas');

  const tabs: SubNavTab[] = [
    {
      id: 'influenciadores',
      label: 'Influenciadores',
      href: '/parcerias/afiliacoes',
      active: !emMinhas,
    },
    {
      id: 'minhas',
      label: 'Minhas afiliações',
      href: '/parcerias/afiliacoes/minhas',
      active: emMinhas,
    },
  ];

  return <AreaSubNav aria-label="Seções de afiliações" tabs={tabs} />;
}

AfiliacoesSubNav.displayName = 'AfiliacoesSubNav';

export function AfiliacoesLayout(): JSX.Element {
  return (
    <div className="flex flex-col gap-[var(--spacing-5)]">
      <AfiliacoesSubNav />
      <Outlet />
    </div>
  );
}

AfiliacoesLayout.displayName = 'AfiliacoesLayout';
