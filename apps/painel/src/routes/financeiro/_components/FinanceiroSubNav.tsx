// =============================================================================
// FinanceiroSubNav — sub-navegação da área Financeiro (padrão SubNav §2.14):
// Análise | Repasses. O item do sidebar "Financeiro" é único; a troca entre a
// análise de vendas (índice) e os repasses acontece por AQUI. A aba ativa deriva
// do pathname (Repasses em `/financeiro/repasses`; Análise em qualquer outro
// caminho de `/financeiro`).
// =============================================================================

import { useLocation, useNavigate } from 'react-router-dom';
import { SubNav } from '@leela/design-system';

export function FinanceiroSubNav(): JSX.Element {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const emRepasses = pathname.startsWith('/financeiro/repasses');

  return (
    <SubNav
      aria-label="Seções de Financeiro"
      divider
      tabs={[
        {
          id: 'analise',
          label: 'Análise',
          active: !emRepasses,
          onClick: () => navigate('/financeiro'),
        },
        {
          id: 'repasses',
          label: 'Repasses',
          active: emRepasses,
          onClick: () => navigate('/financeiro/repasses'),
        },
      ]}
    />
  );
}

FinanceiroSubNav.displayName = 'FinanceiroSubNav';
