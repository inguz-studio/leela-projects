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
// V2708-23 (varredura fase 3): os dois lados são rotas com dado próprio —
// critério RN-574 emendada: modo ROTA. Migrado de AreaSubNav (barra horizontal)
// para TerciarioLayout (25/75) + AreaTerciarioNav (coluna vertical ≥lg,
// faixa horizontal <lg). Sem redirects: nenhuma URL mudou.
// =============================================================================

import { Outlet, useLocation } from 'react-router-dom';
import {
  AreaTerciarioNav,
  TerciarioLayout,
  type TerciarioItem,
} from '../../../components/nav/TerciarioNav';

export function AfiliacoesLayout(): JSX.Element {
  const { pathname } = useLocation();
  const emMinhas = pathname.startsWith('/parcerias/afiliacoes/minhas');

  const itens: TerciarioItem[] = [
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

  return (
    <TerciarioLayout nav={<AreaTerciarioNav itens={itens} aria-label="Seções de afiliações" />}>
      <Outlet />
    </TerciarioLayout>
  );
}

AfiliacoesLayout.displayName = 'AfiliacoesLayout';
